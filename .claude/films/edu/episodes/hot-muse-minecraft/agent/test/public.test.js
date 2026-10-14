// test/public.test.js - the server open to everyone (the owner, 2026-10-14: play.picasso-lab.com/mcp at launch, "Can
// your agent beat 20:19?"): an outside agent's words are cleaned before the stream, the report or the log keep them
// (src/moderation.js, LDNOOBW's list); in-game chat is the owner's; the limits per address, per MCP session and for
// the whole server answer with typed codes; the operator sees who plays, ends a game, bans an address hash and closes
// the server to new games at once (PUBLIC_PLAY, /admin/public), the owner's key still playing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { createWeb } from '../src/web.js';
import { createModerator, moderator, REMOVED } from '../src/moderation.js';

const text = (r) => r.content.map((x) => x.text).join('\n').replace(/^(?:(?:Your user cannot see the game yet: |Viewers see your why and plan under the video: |Next: call live_view now)[^\n]*\n\n)+/, '');
const ADMIN = 'admin-token-for-the-tests-0123456789';
const OWNER = 'owner-key-for-the-tests-0123456789abcd';

function stubBody() {
  const runs = [];
  return {
    runs,
    ready: Promise.resolve(),
    busy: false,
    state: () => 'inventory: empty',
    snapshot: () => ({ inventory: {}, nearbyBlocks: [], mobs: [] }),
    inventory: () => ({}),
    async run(tool, args) { runs.push(`${tool} ${JSON.stringify(args)}`); return { ok: true, result: `${tool} done`, delta: {} }; },
    async stop() {},
    async close() {},
    on() { return () => {}; },
  };
}

async function serve(t, { env = {}, ...opts } = {}) {
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: '', MODEL_API_KEY: '', WEB_ADMIN_TOKEN: ADMIN, MCP_OWNER_KEY: OWNER, ...env });
  const events = [];
  const updates = [];
  const log = { event: (type, d) => events.push({ kind: type, ...d }), tail: () => [] };
  const web = createWeb({ config, log, makeBody: () => stubBody(), mcpCallMs: 400, bansFile: null, term: (id, u) => updates.push({ id, u }), ...opts });
  const { url } = await web.start();
  const clients = [];
  t.after(async () => { for (const c of clients) await c.close().catch(() => {}); await web.stop(); });
  const client = async ({ name = 'player', key = null, viaQuery = false } = {}) => {
    const c = new Client({ name, version: '1' });
    const u = new URL(`${url}/mcp${key && viaQuery ? `?key=${key}` : ''}`);
    await c.connect(new StreamableHTTPClientTransport(u, key && !viaQuery ? { requestInit: { headers: { authorization: `Bearer ${key}` } } } : {}));
    clients.push(c);
    return c;
  };
  const admin = async (path, body = null) => {
    const r = await fetch(`${url}${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${ADMIN}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json() };
  };
  return { url, client, admin, events, updates };
}

test('moderation: whole words through the usual disguises; ordinary words, Minecraft names and coordinates pass', () => {
  const m = moderator();
  const out = (s) => m.clean(s).text;
  for (const s of ['go to 455 64 -12 and assess the glass', 'Scunthorpe, a cocoon, the bass passes', 'collect 14 obsidian at the lava pool', 'shiitake', 'assassin', 'analysis', 'I a m here', 'kill 100 pigs']) assert.equal(out(s), s, s);
  assert.equal(out('this is shit'), `this is ${REMOVED}`);
  assert.equal(out('sh1t and a$$ here'), `${REMOVED} and ${REMOVED} here`, 'digits and symbols for letters');
  assert.equal(out('f u c k this'), `${REMOVED} this`, 'spaced apart');
  assert.equal(out('f.u.c.k'), REMOVED, 'dotted apart');
  assert.equal(out('fuuuuck'), REMOVED, 'drawn out');
  assert.equal(out('f*ck it'), `${REMOVED} it`, 'a mask');
  assert.equal(out('fuckyou'), REMOVED, 'the strongest word inside a longer one');
  assert.equal(out('what the FÜCK'), `what the ${REMOVED}`, 'accents and case');
  assert.equal(out('2 girls 1 cup'), REMOVED, 'a phrase of the list');
  // nested values: every string, the fields named
  const r = m.cleanValue({ why: 'kill the shit', steps: [{ skill: 'say', args: { text: 'f*ck' } }], n: 3 });
  assert.equal(r.removed, 2);
  assert.deepEqual(r.fields, ['why', 'steps[0].args.text']);
  assert.equal(r.value.why, `kill the ${REMOVED}`);
  assert.equal(r.value.n, 3);
  // a list of its own (the moderator is the list's, not a fixed one)
  assert.equal(createModerator({ list: [['creeper']] }).clean('a creeper!').text, `a ${REMOVED}!`);
});

test('public: why, plan, goal and the client\'s name are cleaned before the stream, the report and the log keep them', async (t) => {
  const { client, events, updates } = await serve(t);
  const c = await client({ name: 'sh1t-bot' });
  await c.callTool({ name: 'start_game', arguments: { live: false, goal: 'kill 10 fucking pigs' } });
  const r = await c.callTool({ name: 'play', arguments: { skill: 'get_state', args: {}, why: 'Because this shit is easy.', plan: 'Then f u c k around and find out.' } });
  assert.equal(r.isError, undefined);
  const seen = JSON.stringify(updates);
  assert.doesNotMatch(seen, /shit|f u c k|fucking|sh1t/i, 'nothing of it on the stream');
  assert.match(seen, /Because this \[removed\] is easy\./);
  assert.match(seen, /"caller":"AGENT"|AGENT/, 'the client\'s name became "agent"');
  const report = text(await c.callTool({ name: 'game_report', arguments: {} }));
  assert.doesNotMatch(report, /shit|fucking/i);
  const rows = events.filter((e) => e.kind === 'moderation');
  assert.ok(rows.length >= 3, JSON.stringify(rows));
  assert.ok(rows.some((e) => e.tool === 'initialize' && e.fields[0] === 'clientInfo.name'));
  assert.ok(rows.some((e) => e.tool === 'start_game' && e.fields.includes('goal')));
  assert.ok(rows.some((e) => e.tool === 'play' && e.fields.includes('why') && e.fields.includes('plan')));
  assert.doesNotMatch(JSON.stringify(rows), /shit|fuck|sh1t/i, 'the log names fields, never the words');
  // links and handles never reach the stream
  await c.callTool({ name: 'play', arguments: { skill: 'get_state', args: {}, why: 'Follow @someone_cool and visit www.example.com or spam.gg/join.', plan: 'Then see https://x.example/a' } });
  const later = JSON.stringify(updates);
  assert.doesNotMatch(later, /@someone_cool|example\.com|spam\.gg|https:/);
  assert.match(later, /Follow \[handle\] and visit \[link\] or \[link\]/);
  // set_goal too
  const g = text(await c.callTool({ name: 'set_goal', arguments: { goal: 'build a dick' } }));
  assert.doesNotMatch(g, /dick/i);
});

test('public: say (in-game chat) is the owner\'s; an outside agent gets NOT_ALLOWED and nothing runs', async (t) => {
  const { client } = await serve(t, { env: { WEB_MCP_GAMES_PER_ADDRESS: '2' } });
  const c = await client();
  await c.callTool({ name: 'start_game', arguments: { live: false } });
  const r = await c.callTool({ name: 'play', arguments: { skill: 'say', args: { text: 'hello' } } });
  assert.equal(r.structuredContent.code, 'NOT_ALLOWED');
  assert.match(text(r), /say \(in-game chat\) is off for games on this public server: nothing was run/);
  const owner = await client({ key: OWNER });
  await owner.callTool({ name: 'start_game', arguments: { live: false } });
  assert.equal((await owner.callTool({ name: 'play', arguments: { skill: 'say', args: { text: 'hello' } } })).structuredContent.code, null);
  const byQuery = await client({ key: OWNER, viaQuery: true });
  await byQuery.callTool({ name: 'start_game', arguments: { live: false } });
  assert.equal((await byQuery.callTool({ name: 'play', arguments: { skill: 'say', args: { text: 'hi' } } })).structuredContent.code, null, '?key= on /mcp works too');
  // the owner's games do not count toward its address's 2: a second outside agent still starts
  const wrong = await client({ key: 'not-the-owner-key-0000000000000000' });
  await wrong.callTool({ name: 'start_game', arguments: { live: false } });
  assert.equal((await wrong.callTool({ name: 'play', arguments: { skill: 'say', args: { text: 'hi' } } })).structuredContent.code, 'NOT_ALLOWED');
});

test('public limits: 3 games an address, 10 starts an hour, requests a minute per session, SERVER_FULL; the owner goes first', async (t) => {
  {
    const { client } = await serve(t, { env: { WEB_MAX_SESSIONS: '8' } });
    const cs = [];
    for (let i = 0; i < 4; i++) cs.push(await client());
    for (let i = 0; i < 3; i++) assert.match(text(await cs[i].callTool({ name: 'start_game', arguments: { live: false } })), /^New game/);
    const fourth = await cs[3].callTool({ name: 'start_game', arguments: { live: false } });
    assert.equal(fourth.structuredContent.code, 'RATE_LIMITED', '3 games an address');
    // the owner is not held to it
    const owner = await client({ key: OWNER });
    assert.match(text(await owner.callTool({ name: 'start_game', arguments: { live: false } })), /^New game/);
  }
  {
    // starts an hour: 10, then RATE_LIMITED with when to try
    const { client } = await serve(t, { env: { WEB_MAX_SESSIONS: '8', WEB_MCP_GAMES_PER_ADDRESS: '8' } });
    let last = null;
    for (let i = 0; i < 11; i++) {
      const c = await client();
      last = await c.callTool({ name: 'start_game', arguments: { live: false } });
      if (i < 10) { assert.match(text(last), /^New game/, `start ${i + 1}`); await c.callTool({ name: 'end_game', arguments: {} }); }
    }
    assert.equal(last.structuredContent.code, 'RATE_LIMITED');
    assert.match(text(last), /^RATE_LIMITED: too many sessions from your connector's address; try again in/);
    assert.ok(last.structuredContent.retryAfterS > 3000);
  }
  {
    // requests a minute per MCP session (WEB_MCP_REQUESTS_PER_MINUTE): HTTP 429 with retry-after, the session goes on after
    const { client, events } = await serve(t, { env: { WEB_MCP_REQUESTS_PER_MINUTE: '10' } });
    const c = await client();
    let refused = null;
    for (let i = 0; i < 12 && !refused; i++) {
      try { await c.callTool({ name: 'get_state', arguments: {} }); } catch (e) { refused = e; }
    }
    assert.ok(refused, 'refused within the minute');
    assert.match(String(refused.message), /too many requests on this MCP session \(at most 10 a minute\)/);
    assert.ok(events.some((e) => e.kind === 'mcp_http' && e.status === 429 && e.why === 'requests per minute'));
  }
  {
    // the whole server full: SERVER_FULL with the queue; the owner goes ahead of the queue
    const { client } = await serve(t, { env: { WEB_MAX_SESSIONS: '2', WEB_MCP_GAMES_PER_ADDRESS: '8' } });
    const [a, b, c, d] = [await client(), await client(), await client(), await client()];
    await a.callTool({ name: 'start_game', arguments: { live: false } });
    await b.callTool({ name: 'start_game', arguments: { live: false } });
    const full = await c.callTool({ name: 'start_game', arguments: { live: false } });
    assert.equal(full.structuredContent.code, 'SERVER_FULL');
    assert.match(text(full), /^SERVER_FULL: all 2 bots are in use; you are number 1 in the queue/);
    const owner = await client({ key: OWNER });
    const ownerFull = await owner.callTool({ name: 'start_game', arguments: { live: false } });
    assert.match(text(ownerFull), /you are number 1 in the queue \(2 waiting\)/, 'the owner first');
    assert.match(text(await d.callTool({ name: 'start_game', arguments: { live: false } })), /you are number 3 in the queue/);
    await a.callTool({ name: 'end_game', arguments: {} });
    assert.match(text(await c.callTool({ name: 'start_game', arguments: { live: false } })), /SERVER_FULL/, 'the freed bot is the owner\'s');
    assert.match(text(await owner.callTool({ name: 'start_game', arguments: { live: false } })), /^New game/);
  }
});

test('operator: who plays (address hashes), end a game, ban a hash, close the server at once; the owner still plays', async (t) => {
  const { client, admin, url, events } = await serve(t);
  const a = await client();
  const started = text(await a.callTool({ name: 'start_game', arguments: { live: false, goal: 'iron_pickaxe' } }));
  const id = /game (g\w+)/.exec(started)[1];
  assert.equal((await fetch(`${url}/admin/games`)).status, 401, 'the admin token is needed');
  const games = await admin('/admin/games');
  assert.equal(games.status, 200);
  assert.equal(games.json.publicPlay, true);
  const row = games.json.games.find((g) => g.game === id);
  assert.match(row.ip, /^[0-9a-f]{12}$/, 'a hash, never the address');
  assert.equal(row.mcp, true);
  assert.equal(row.goal, 'Iron pickaxe');
  assert.doesNotMatch(JSON.stringify(games.json), /127\.0\.0\.1/);
  // end one game
  assert.deepEqual((await admin('/admin/end', { game: id })).json, { ended: id });
  assert.match(text(await a.callTool({ name: 'get_state', arguments: {} })), /ended by the operator/);
  // close the server to new games at once: CLOSED, the owner still plays
  assert.deepEqual((await admin('/admin/public', { on: false })).json, { publicPlay: false });
  const b = await client();
  const closed = await b.callTool({ name: 'start_game', arguments: { live: false } });
  assert.equal(closed.structuredContent.code, 'CLOSED');
  assert.match(text(closed), /^CLOSED: this server is closed for new games right now; try again later/);
  const owner = await client({ key: OWNER });
  assert.match(text(await owner.callTool({ name: 'start_game', arguments: { live: false } })), /^New game/);
  await admin('/admin/public', { on: true });
  assert.match(text(await b.callTool({ name: 'start_game', arguments: { live: false } })), /^New game/);
  // ban the hash: its games end, new MCP sessions from it are refused, unban lets it back
  const ban = await admin('/admin/ban', { ip: row.ip, hours: 24 });
  assert.equal(ban.json.banned, row.ip);
  assert.equal(ban.json.ended, 1, 'its game ended; the owner\'s (same address here) stays');
  await assert.rejects(client(), /may not play on this server|403/);
  const ownerAgain = await client({ key: OWNER });
  assert.ok(ownerAgain, 'the owner\'s key is not banned with the address');
  assert.ok(events.some((e) => e.kind === 'admin_ban' && e.ip === row.ip));
  assert.equal((await admin('/admin/ban', { ip: 'not-a-hash' })).status, 400);
  await admin('/admin/unban', { ip: row.ip });
  const back = await client();
  assert.match(text(await back.callTool({ name: 'start_game', arguments: { live: false } })), /^New game/);
});

test('PUBLIC_PLAY=off closes the server from the start; the config reads the limits and refuses a short owner key', async (t) => {
  const { client } = await serve(t, { env: { PUBLIC_PLAY: 'off' } });
  const c = await client();
  assert.equal((await c.callTool({ name: 'start_game', arguments: { live: false } })).structuredContent.code, 'CLOSED');
  const owner = await client({ key: OWNER });
  assert.match(text(await owner.callTool({ name: 'start_game', arguments: { live: false } })), /^New game/);
  const cfg = loadConfig({}).web;
  assert.deepEqual([cfg.mcpGamesPerAddress, cfg.mcpStartsPerHour, cfg.mcpRequestsPerMinute, cfg.idleMs, cfg.publicPlay, cfg.publicChat], [3, 10, 120, 300_000, true, false]);
  assert.throws(() => loadConfig({ MCP_OWNER_KEY: 'short' }), /MCP_OWNER_KEY must be at least 16/);
  assert.deepEqual(loadConfig({ WEB_BANNED_IPS: 'ABCDEF012345, 0123456789ab' }).web.bannedIps, ['abcdef012345', '0123456789ab']);
});

test('a browser at /mcp gets a page for people (what it is, the one sentence, how to add it, the source, the logo); MCP clients are unaffected', async (t) => {
  const { url, client } = await serve(t, { env: { WEB_PUBLIC_URL: 'https://play.picasso-lab.com' } });
  const browser = { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };
  const r = await fetch(`${url}/mcp`, { headers: browser });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /^text\/html/);
  const page = await r.text();
  assert.match(page, /This is the address for your AI agent/);
  assert.match(page, /MCP server \(streamable HTTP, no sign-in\)/);
  assert.ok(page.includes('<pre class="oneline">Play Minecraft on https://play.picasso-lab.com/mcp and get to the Nether and back.</pre>'));
  assert.match(page, /<strong>muse\.ai:<\/strong>/);
  assert.match(page, /<strong>Claude:<\/strong>.*claude mcp add --transport http minecraft https:\/\/play\.picasso-lab\.com\/mcp/s);
  assert.match(page, /<strong>Other MCP clients:<\/strong>/);
  assert.match(page, /<a href="https:\/\/github\.com\/yil384\/minecraft-agent-mcp">github\.com\/yil384\/minecraft-agent-mcp<\/a>/);
  assert.match(page, /NOT AN OFFICIAL MINECRAFT SERVICE\. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT\.<\/strong> Not affiliated with or endorsed by Meta, Mojang or Microsoft\./);
  assert.match(page, /<img class="brand" src="\/brand\/picasso-lab-pixel\.png" alt="Picasso Lab, UC San Diego" width="280" height="69">/);
  assert.doesNotMatch(page, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'no emoji');
  const logo = await fetch(`${url}/brand/picasso-lab-pixel.png`);
  assert.equal(logo.status, 200);
  assert.equal(logo.headers.get('content-type'), 'image/png');
  assert.deepEqual([...new Uint8Array(await logo.arrayBuffer()).slice(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  // MCP clients: the SDK's client plays as before
  const c = await client();
  const { tools } = await c.listTools();
  assert.ok(tools.some((x) => x.name === 'start_game'));
  assert.match(text(await c.callTool({ name: 'start_game', arguments: { live: false } })), /^New game/);
  // an MCP GET (the event stream), and a GET with a session: never the page
  const sse = await fetch(`${url}/mcp`, { headers: { accept: 'text/event-stream' } });
  assert.doesNotMatch(String(sse.headers.get('content-type')), /text\/html/);
  await sse.body?.cancel();
  const withSession = await fetch(`${url}/mcp`, { headers: { ...browser, 'mcp-session-id': 'not-a-session' } });
  assert.doesNotMatch(String(withSession.headers.get('content-type')), /text\/html/);
  await withSession.body?.cancel();
  // a POST from a browser form is not a page either
  const post = await fetch(`${url}/mcp`, { method: 'POST', headers: { ...browser, 'content-type': 'application/json' }, body: '{}' });
  assert.doesNotMatch(String(post.headers.get('content-type')), /text\/html/);
  await post.body?.cancel();
  // no link when OPEN_SOURCE_URL is empty; a bad one is refused
  assert.throws(() => loadConfig({ OPEN_SOURCE_URL: 'javascript:alert(1)' }), /OPEN_SOURCE_URL must be an https URL/);
});
