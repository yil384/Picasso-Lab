// test/fb-live.test.js - the Facebook live channel (src/fb-live.js) against a fake Graph API (test/fake-graph.js; never
// facebook.com): the token file, the Graph client (the token only in the Authorization header, retries, no retried
// create, rate limits, scrubbed errors), the channel (a game goes live by itself and its end ends the live video; one
// camera follows the last live_view request; failures and Facebook's own end replaced with a backoff; a crash's
// leftovers ended at start; games the agent stops reporting leave), the service and its client (focus, /live, never an
// ingest URL), the artifact page (src/live-page.js), MCP live_view with the channel (called before the stream is up it
// waits for Facebook; the "not live yet" answer), FB_* configuration, and end to end with real ffmpeg: a game on the
// channel, the camera stream (a test pattern instead of the X display) published to a local RTMP server, the key on
// no command line, the live video ended with the game.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createGraph, createLiveChannel, readTokenFile, videoUrlOf, explain, MARKER, DESCRIPTION } from '../src/fb-live.js';
import { liveViewHtml, statusLine, isPlayerUrl } from '../src/live-page.js';
import { createStreamService, createRemoteStreamManager, createStreamManager, findFfmpeg } from '../src/stream.js';
import { createCameraStream } from '../src/camera.js';
import { loadConfig, facebookEmbedUrl } from '../src/config.js';
import { startAgent } from '../src/index.js';
import { fakeGraph, PAGE_ID, PAGE_TOKEN, USER_ID } from './fake-graph.js';
import { processTexts, rtmpSink, freePort } from './rtmp-sink.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 10_000) {
  const t0 = Date.now();
  while (!(await fn())) {
    if (Date.now() - t0 > ms) throw new Error('timed out waiting');
    await sleep(15);
  }
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'muse-fb-'));
const SECRET_KEY = 'AbSecretStreamKey';

/** Camera streams that stand in for createCameraStream: they record, and "publish" (Facebook then shows LIVE). */
function stubStreams(fake, { publish = true } = {}) {
  const made = [];
  const create = (o) => {
    const em = new EventEmitter();
    let done;
    const st = {
      o, player: o.player, state: 'idle', calls: [], captions: [],
      finished: new Promise((r) => { done = r; }),
      on: (e, fn) => { em.on(e, fn); return () => em.off(e, fn); },
      async start() {
        st.state = 'live';
        st.calls.push(`start ${st.player}`);
        if (publish) setTimeout(() => { fake.golive(fake.idOf(o.output)); em.emit('stream_publishing', {}); }, 10);
      },
      async stop(why) { if (st.state === 'stopped') return; st.calls.push('stop'); st.state = 'stopped'; done({ ok: true, reason: why }); },
      async follow(p) { st.calls.push(`follow ${p}`); st.player = p; },
      caption(t) { st.captions.push(t); },
      pose() {},
      async stats() { return { state: st.state }; },
      fail(reason) { st.state = 'failed'; done({ ok: false, reason }); },
    };
    made.push(st);
    return st;
  };
  return { create, made };
}

async function channelOn(t, { publish = true, gameTtlMs = 0, stateFile, graphOpts = {}, ...more } = {}) {
  const fake = await fakeGraph();
  const rows = [];
  const log = { event: (k, d) => rows.push({ k, ...d }) };
  const graph = createGraph({ pageId: PAGE_ID, token: () => PAGE_TOKEN, base: fake.url, minGapMs: 0, log, ...graphOpts });
  const streams = stubStreams(fake, { publish });
  const dir = tmp();
  const ch = createLiveChannel({
    graph, createStream: streams.create, log, stateFile: stateFile ?? path.join(dir, 'fb-live-state.json'), gameTtlMs,
    pollMs: 25, livePollMs: 60, retryMs: [60, 120], sweepMs: 40, settleMs: 20, ...more,
  });
  t.after(async () => { await ch.stopAll('test over'); await fake.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  return { fake, rows, graph, streams, ch, dir };
}

/** Nothing the channel or the Graph client said or sent leaks the token or a stream key. */
function noSecrets(fake, rows) {
  for (const c of fake.calls) {
    assert.equal(c.url.includes(PAGE_TOKEN) || c.raw.includes(PAGE_TOKEN), false, `the token is not in ${c.method} ${c.path}`);
    if (!/oauth|debug_token/.test(c.path)) assert.equal(c.auth, `Bearer ${PAGE_TOKEN}`);
  }
  const text = JSON.stringify(rows);
  assert.equal(text.includes(PAGE_TOKEN), false, 'no token in a log row');
  assert.equal(text.includes(SECRET_KEY), false, 'no stream key in a log row');
}

test('token file: the token alone, readable by its owner only; errors never show it', () => {
  const dir = tmp();
  const f = path.join(dir, 'page-token');
  fs.writeFileSync(f, `${PAGE_TOKEN}\n`, { mode: 0o644 });
  fs.chmodSync(f, 0o644);
  assert.throws(() => readTokenFile(f), (e) => /must be readable by its owner only \(chmod 600; it is 644\)/.test(e.message) && !e.message.includes(PAGE_TOKEN));
  fs.chmodSync(f, 0o600);
  assert.equal(readTokenFile(f), PAGE_TOKEN);
  fs.writeFileSync(f, 'not a token at all\n');
  assert.throws(() => readTokenFile(f), /does not hold a token/);
  assert.throws(() => readTokenFile(path.join(dir, 'missing')), /ENOENT/);
  assert.throws(() => readTokenFile(''), /no FB_TOKEN_FILE/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('video URL: the permalink (relative or whole), else the video id, else the embed; Facebook only', () => {
  assert.equal(videoUrlOf({ permalink_url: `/${PAGE_ID}/videos/55/` }, PAGE_ID), `https://www.facebook.com/${PAGE_ID}/videos/55/`);
  assert.equal(videoUrlOf({ permalink_url: 'https://www.facebook.com/x/videos/56/' }, PAGE_ID), 'https://www.facebook.com/x/videos/56/');
  assert.equal(videoUrlOf({ video: { id: '57' } }, PAGE_ID), `https://www.facebook.com/${PAGE_ID}/videos/57/`);
  assert.equal(videoUrlOf({ embed_html: '<iframe src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fp%2Fvideos%2F58%2F&width=1280">' }, PAGE_ID), 'https://www.facebook.com/p/videos/58/');
  assert.equal(videoUrlOf({ permalink_url: 'https://evil.example/videos/1/' }, PAGE_ID), null);
  assert.equal(facebookEmbedUrl('https://www.facebook.com/p/videos/58/'), 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fp%2Fvideos%2F58%2F&show_text=false&width=1280');
});

test('graph: the token only in the Authorization header; transient errors tried again, a create never; rate limits pause calls; errors scrubbed', async () => {
  const fake = await fakeGraph();
  const rows = [];
  const dir = tmp();
  const tokenFile = path.join(dir, 'page-token');
  fs.writeFileSync(tokenFile, PAGE_TOKEN, { mode: 0o600 });
  const naps = [];
  const graph = createGraph({ pageId: PAGE_ID, tokenFile, base: fake.url, minGapMs: 0, log: { event: (k, d) => rows.push({ k, ...d }) }, sleep: async (ms) => { naps.push(ms); } });
  try {
    assert.deepEqual(await graph.page(), { id: PAGE_ID, name: 'Picasso Lab Live' });
    const live = await graph.createLive({ title: 't', description: DESCRIPTION });
    assert.match(live.secure_stream_url, /^rtmps:\/\/live-api-s\.facebook\.com:443\/rtmp\/FB-\d+-0-/);
    // a 500 is tried again (after about 1 s), the same 500 on a create is not
    fake.fault((c) => c.method === 'GET', 500, { message: `temporary trouble for token ${PAGE_TOKEN}`, code: 2, is_transient: true });
    assert.equal((await graph.getLive(live.id, 'status')).status, 'UNPUBLISHED');
    assert.equal(naps.filter((n) => n >= 500).length, 1, 'one backoff');
    fake.fault((c) => c.method === 'POST', 500, { message: 'An unexpected error has occurred', code: 2, is_transient: true });
    const before = fake.videos.size;
    await assert.rejects(graph.createLive({ title: 't', description: 'd' }), /Graph API 500 code 2/);
    assert.equal(fake.videos.size, before);
    assert.equal(fake.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/live_videos')).length, 2, 'the failed create was sent once');
    // a wrong token: 190, not tried again, nothing printed of the token
    fs.writeFileSync(tokenFile, 'EAAWrongTokenWrongToken0123456789', { mode: 0o600 });
    fs.utimesSync(tokenFile, new Date(), new Date(Date.now() + 5_000)); // read again when the file changes
    await assert.rejects(graph.page(), (e) => e.code === 190 && !e.transient);
    fs.writeFileSync(tokenFile, PAGE_TOKEN, { mode: 0o600 });
    fs.utimesSync(tokenFile, new Date(), new Date(Date.now() + 10_000));
    // a rate-limit answer: no call goes out for a while
    fake.fault(() => true, 400, { message: 'Application request limit reached', code: 4 });
    await assert.rejects(graph.getLive(live.id, 'status'), (e) => e.rate === true);
    const n = fake.calls.length;
    await assert.rejects(graph.getLive(live.id, 'status'), /slow down; no calls for \d+ s/);
    assert.equal(fake.calls.length, n, 'nothing sent while blocked');
    assert.equal(graph.stats().blockedForS > 0, true);
    // the token is never in a URL or a body, and the echoed token is scrubbed from the log
    for (const c of fake.calls) assert.equal(c.url.includes(PAGE_TOKEN) || c.raw.includes(PAGE_TOKEN), false);
    assert.ok(rows.some((r) => r.k === 'fb_error' && /temporary trouble for token \*\*\*/.test(r.message)));
    assert.equal(JSON.stringify(rows).includes(PAGE_TOKEN), false);
    // a loose token file is refused before any call
    fs.chmodSync(tokenFile, 0o640);
    fs.utimesSync(tokenFile, new Date(), new Date(Date.now() + 15_000));
    const g2 = createGraph({ pageId: PAGE_ID, tokenFile, base: fake.url, minGapMs: 0 });
    const m = fake.calls.length;
    await assert.rejects(g2.page(), /owner only/);
    assert.equal(fake.calls.length, m);
  } finally {
    await fake.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('channel: a game goes live when live_view asks for it (never because it started); the embed is Facebook\'s player for the video; the game\'s end ends the live video', async (t) => {
  const { fake, rows, streams, ch, dir } = await channelOn(t);
  assert.deepEqual(ch.live(), { fb: true, state: 'off', game: null, videoUrl: null, embedUrl: null, liveSince: null, warning: null, games: 0, error: null, retryInS: null });
  assert.deepEqual(ch.start('g1', { player: 'Muse_aaaa' }), { id: 'g1' });
  assert.equal(ch.start('g2', { player: 'not a name' }), null, 'a bad player name');
  await ch.settled();
  assert.equal(ch.live().state, 'off', 'a game that only started never goes live');
  assert.equal(fake.calls.some((c) => c.method === 'POST'), false, 'no live video created');
  ch.focus('g1');
  assert.equal(ch.live().state, 'starting');
  await until(() => ch.live().state === 'live');
  const [id] = [...fake.videos.keys()];
  const v = fake.videos.get(id);
  const live = ch.live();
  assert.equal(live.game, 'g1');
  assert.equal(live.videoUrl, `https://www.facebook.com/${PAGE_ID}/videos/${v.videoId}/`);
  assert.equal(live.embedUrl, facebookEmbedUrl(live.videoUrl));
  assert.match(live.liveSince, /^\d{4}-\d\d-\d\dT/);
  const create = fake.calls.find((c) => c.method === 'POST' && c.path.endsWith('/live_videos'));
  assert.deepEqual([create.body.status, create.body.title], ['LIVE_NOW', 'Picasso Lab demo: an AI plays Minecraft (game g1)']);
  assert.ok(create.body.description.includes(MARKER));
  assert.equal(streams.made.length, 1);
  assert.equal(streams.made[0].o.output, `rtmps://live-api-s.facebook.com:443/rtmp/FB-${id}-0-${SECRET_KEY}${id}?s_bl=1&s_sc=${id}&a=AbZz`, 'the camera streams to the live video\'s own ingest');
  assert.equal(streams.made[0].o.player, 'Muse_aaaa');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'fb-live-state.json'), 'utf8')).open, [id]);
  assert.ok(rows.some((r) => r.k === 'fb_live' && r.broadcast === id && r.game === 'g1'));
  ch.caption('g1', 'Collecting oak log (3)');
  ch.caption('g9', 'not on camera');
  assert.deepEqual(streams.made[0].captions, ['Collecting oak log (3)']);
  assert.equal(ch.has('g1'), true);
  assert.equal(ch.slot('g1'), 0);
  // the game ends: the stream stops, then the live video is ended
  await ch.stop('g1', 'the game ended');
  await until(() => ch.live().state === 'off');
  assert.equal(v.status, 'VOD');
  assert.deepEqual(streams.made[0].calls, ['start Muse_aaaa', 'stop']);
  const end = fake.calls.find((c) => c.method === 'POST' && c.body.end_live_video === 'true');
  assert.equal(end.path, `/v23.0/${id}`);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'fb-live-state.json'), 'utf8')).open, []);
  noSecrets(fake, rows);
});

test('channel: several games, one camera: it films the game whose live_view came last and moves on when that game ends; one live video throughout', async (t) => {
  const { fake, rows, streams, ch } = await channelOn(t);
  ch.start('g1', { player: 'Muse_aaaa' });
  ch.focus('g1');
  await until(() => ch.live().state === 'live');
  ch.start('g2', { player: 'Muse_bbbb' });
  await ch.settled();
  assert.equal(ch.live().game, 'g1', 'a new game does not take the camera by itself');
  ch.focus('g2');
  await until(() => ch.live().game === 'g2');
  await ch.settled();
  const s = streams.made[0];
  assert.equal(s.calls.at(-1), 'follow Muse_bbbb');
  const [id] = [...fake.videos.keys()];
  await until(() => fake.videos.get(id).title === 'Picasso Lab demo: an AI plays Minecraft (game g2)');
  ch.caption('g1', 'off camera');
  ch.caption('g2', 'Crafting stick');
  assert.deepEqual(s.captions, ['Crafting stick']);
  ch.start('g3', { player: 'Muse_cccc' });
  await ch.settled();
  assert.equal(ch.live().game, 'g2');
  await ch.stop('g2');
  await until(() => ch.live().game === 'g1');
  assert.equal(s.calls.at(-1), 'follow Muse_aaaa', 'back to the game that asked before; g3 never asked');
  ch.focus('g3');
  await until(() => s.calls.at(-1) === 'follow Muse_cccc');
  await ch.stop('g3');
  await until(() => s.calls.at(-1) === 'follow Muse_aaaa');
  // live_view asked for a game the channel does not have yet: it gets the camera when it arrives
  ch.focus('g4');
  ch.start('g4', { player: 'Muse_dddd' });
  await until(() => s.calls.at(-1) === 'follow Muse_dddd');
  await ch.stop('g4');
  await until(() => s.calls.at(-1) === 'follow Muse_aaaa');
  await ch.stop('g1');
  await until(() => ch.live().state === 'off');
  assert.equal(fake.videos.size, 1, 'one live video for all of it');
  assert.equal(streams.made.length, 1);
  assert.ok(rows.filter((r) => r.k === 'fb_camera').length >= 5);
  noSecrets(fake, rows);
});

test('channel: a failed create is tried again with a backoff; a failed stream or a live video Facebook ended is replaced while a game remains', async (t) => {
  const { fake, rows, streams, ch } = await channelOn(t);
  fake.fault((c) => c.method === 'POST' && c.path.endsWith('/live_videos'), 500, { message: 'An unexpected error has occurred', code: 2, is_transient: true });
  ch.start('g1', { player: 'Muse_aaaa' });
  ch.focus('g1');
  await until(() => rows.some((r) => r.k === 'fb_live_failed'));
  assert.equal(ch.live().state, 'retrying');
  assert.match(ch.live().error, /Graph API 500/);
  await until(() => ch.live().state === 'live');
  assert.equal(fake.videos.size, 1);
  // the stream gives up (ffmpeg failed too often): that live video is ended, a new one goes live
  const first = [...fake.videos.keys()][0];
  streams.made[0].fail('ffmpeg failed 7 times in 5 min');
  await until(() => fake.videos.get(first).status === 'VOD');
  await until(() => fake.videos.size === 2 && ch.live().state === 'live');
  assert.equal(streams.made.length, 2);
  assert.ok(rows.some((r) => r.k === 'fb_stream_lost' && /ffmpeg failed/.test(r.reason)));
  // Facebook ends the live video itself: noticed on the next check, replaced
  const second = [...fake.videos.keys()][1];
  fake.videos.get(second).status = 'VOD';
  await until(() => fake.videos.size === 3 && ch.live().state === 'live');
  assert.ok(rows.some((r) => r.k === 'fb_stream_lost' && /Facebook ended the live video \(VOD\)/.test(r.reason)));
  assert.equal(streams.made[1].state, 'stopped');
  await ch.stop('g1');
  await until(() => ch.live().state === 'off');
  assert.deepEqual([...fake.videos.values()].map((v) => v.status), ['VOD', 'VOD', 'VOD']);
  noSecrets(fake, rows);
});

test('channel: a refusal only a person can fix (the Page not eligible to go live, a dead token) is said plainly and tried again rarely', async (t) => {
  // what Facebook answered the real Page on 2026-10-08 (a Page created that day)
  const { fake, rows, ch } = await channelOn(t, { permanentRetryMs: 400 });
  fake.fault((c) => c.method === 'POST' && c.path.endsWith('/live_videos'), 400, { message: 'Permissions error', type: 'OAuthException', code: 200, error_subcode: 1363120 }, 2);
  ch.start('g1', { player: 'Muse_aaaa' });
  ch.focus('g1');
  await until(() => rows.some((r) => r.k === 'fb_live_failed'));
  const st = ch.live();
  assert.equal(st.state, 'retrying');
  assert.match(st.error, /not eligible to go live yet: a profile or Page must be at least 60 days old \(code 200\/1363120\)/);
  assert.ok(st.retryInS <= 1);
  assert.equal(rows.find((r) => r.k === 'fb_live_failed').permanent, true);
  await until(() => ch.live().state === 'live', 5_000);
  assert.equal(rows.filter((r) => r.k === 'fb_live_failed').length, 2, 'tried again after the long wait, then it worked');
  assert.match(explain({ code: 190, message: 'x' }).text, /renew it with scripts\/fb-token\.mjs/);
  assert.equal(explain({ code: 2, message: 'busy', transient: true }).permanent, false);
});

test('profile target (FB_TARGET=me): /me/live_videos in public, each live video ended then deleted with its recording, a failed delete tried again, crash leftovers of ours deleted, nothing else on the profile touched', async (t) => {
  const { fake, rows, ch, dir } = await channelOn(t, { deleteAfter: true, graphOpts: { pageId: 'me', privacy: { value: 'EVERYONE' }, sleep: async () => {} } });
  // on the profile before we start: the owner's own live video and an old video, and one of ours a crash left ended
  const own = fake.add({ owner: USER_ID, description: 'the owner streaming by hand' });
  const old = fake.add({ owner: USER_ID, description: 'an old video', status: 'VOD' });
  const ours = fake.add({ owner: USER_ID, description: DESCRIPTION, status: 'VOD' });
  ch.start('g1', { player: 'Muse_aaaa' });
  ch.focus('g1');
  await until(() => ch.live().state === 'live');
  assert.equal(fake.videos.has(ours), false, 'the leftover of ours was deleted at start');
  const id = [...fake.videos.values()].find((v) => v.title?.includes('game g1')).id;
  const v = fake.videos.get(id);
  const create = fake.calls.find((c) => c.method === 'POST' && c.path === '/v23.0/me/live_videos');
  assert.equal(create.body.privacy, '{"value":"EVERYONE"}', 'public: the embed plays only public videos');
  assert.equal(ch.live().videoUrl, `https://www.facebook.com/${USER_ID}/videos/${v.videoId}/`);
  await ch.stop('g1');
  await until(() => ch.live().state === 'off' && fake.deleted.includes(id));
  assert.equal(fake.videos.has(id), false);
  const after = fake.calls.filter((c) => c.path === `/v23.0/${id}` && c.method !== 'GET').map((c) => `${c.method} ${c.body.end_live_video ?? ''}`.trim());
  assert.deepEqual(after.slice(-2), ['POST true', 'DELETE'], 'ended, then deleted (the live video object: its recording goes with it)');
  assert.equal(fake.calls.some((c) => c.method === 'DELETE' && c.path === `/v23.0/${v.videoId}`), false, 'the recording\'s own id is never needed');
  assert.ok(rows.some((r) => r.k === 'fb_live_deleted' && r.broadcast === id && r.deletedId === id));
  // a delete that fails (Facebook busy) is kept in the state file and done later
  ch.start('g2', { player: 'Muse_bbbb' });
  ch.focus('g2');
  await until(() => ch.live().state === 'live');
  const id2 = [...fake.videos.values()].find((x) => x.title?.includes('game g2')).id;
  fake.fault((c) => c.method === 'DELETE' && c.path === `/v23.0/${id2}`, 503, { message: 'Service temporarily unavailable', code: 2, is_transient: true }, 4);
  await ch.stop('g2');
  await until(() => JSON.parse(fs.readFileSync(path.join(dir, 'fb-live-state.json'), 'utf8')).delete.some((e) => e.live === id2));
  await until(() => fake.deleted.includes(id2));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'fb-live-state.json'), 'utf8')), { ...JSON.parse(fs.readFileSync(path.join(dir, 'fb-live-state.json'), 'utf8')), open: [], delete: [] });
  // the owner's own videos: never ended, never deleted
  assert.equal(fake.videos.get(own).status, 'LIVE');
  assert.ok(fake.videos.has(old));
  assert.equal(fake.calls.some((c) => c.method !== 'GET' && (c.path.endsWith(`/${own}`) || c.path.endsWith(`/${old}`))), false);
  noSecrets(fake, rows);
});

test('profile target: a live video Facebook stored with a narrower privacy than asked is reported, in live() and in live_view', async (t) => {
  const fake = await fakeGraph({ privacyCap: 'SELF' });
  const rows = [];
  const log = { event: (k, d) => rows.push({ k, ...d }) };
  const graph = createGraph({ pageId: 'me', privacy: { value: 'EVERYONE' }, token: () => PAGE_TOKEN, base: fake.url, minGapMs: 0, log });
  const dir = tmp();
  const ch = createLiveChannel({ graph, createStream: stubStreams(fake).create, log, stateFile: path.join(dir, 's.json'), privacy: 'EVERYONE', deleteAfter: true, pollMs: 25, settleMs: 20, sweepMs: 40 });
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null, streams: ch, loopStatsMs: 0 });
  const c = new Client({ name: 'fb-test', version: '1' });
  t.after(async () => { await c.close().catch(() => {}); await agent.stop('test over'); await ch.stopAll(); await fake.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  const game = /game (g\w+)/.exec((await c.callTool({ name: 'start_game', arguments: { adult: true } })).content[0].text)[1];
  ch.start(game, { player: 'Muse_test4' });
  const r = await c.callTool({ name: 'live_view', arguments: {} });
  assert.equal(r.structuredContent.state, 'live');
  assert.match(r.content[0].text, /\nWarning: Facebook stored this live video as "Only me" \(SELF\), not EVERYONE: the player shows "Video unavailable" to anyone but its owner\./);
  assert.match(r.structuredContent.warning, /Only me/);
  assert.match(r.structuredContent.html, /<p>Live: game g\w+, but Facebook shows this video to its owner only\.<\/p>/);
  assert.ok(rows.some((x) => x.k === 'fb_privacy' && x.asked === 'EVERYONE' && x.got === 'SELF'));
  await ch.stop(game);
});

test('caps: at most maxPerHour live videos in any hour and maxPerDay in 24 hours, kept across restarts; live_view says so plainly', async (t) => {
  let jump = 0; // a running clock that the test can move an hour ahead
  const clock = () => Date.now() + jump;
  const { fake, rows, ch, dir, graph } = await channelOn(t, { now: clock, maxPerHour: 2, maxPerDay: 3 });
  const once = async (g) => {
    ch.start(g, { player: 'Muse_aaaa' });
    ch.focus(g);
    await until(() => ch.live().state === 'live');
    await ch.stop(g);
    await until(() => ch.live().state === 'off');
  };
  await once('g1');
  await once('g2');
  ch.start('g3', { player: 'Muse_aaaa' });
  ch.focus('g3');
  await until(() => ch.live().state === 'capped');
  assert.equal(fake.videos.size, 2, 'no third live video in the hour');
  assert.match(ch.live().error, /the limit of 2 live videos in the last hour is reached/);
  assert.ok(ch.live().retryInS > 3_500 && ch.live().retryInS <= 3_600);
  assert.ok(rows.some((r) => r.k === 'fb_capped'));
  const state = JSON.parse(fs.readFileSync(path.join(dir, 'fb-live-state.json'), 'utf8'));
  assert.equal(state.created.length, 2, 'the creates are kept in the state file');
  // a restart keeps counting
  const again = createLiveChannel({ graph, createStream: stubStreams(fake).create, stateFile: path.join(dir, 'fb-live-state.json'), now: clock, maxPerHour: 2, maxPerDay: 3, pollMs: 25, settleMs: 20 });
  t.after(() => again.stopAll());
  again.start('g4', { player: 'Muse_bbbb' });
  again.focus('g4');
  await until(() => again.live().state === 'capped');
  await again.stop('g4');
  // an hour later the hourly cap is free again; the day's cap of 3 then holds
  jump += 3_601_000;
  ch.focus('g3');
  await until(() => ch.live().state === 'live');
  assert.equal(fake.videos.size, 3);
  await ch.stop('g3');
  await until(() => ch.live().state === 'off');
  ch.start('g5', { player: 'Muse_aaaa' });
  ch.focus('g5');
  await until(() => ch.live().state === 'capped');
  assert.match(ch.live().error, /3 live videos in the last 24 hours/);
  await ch.stop('g5');
});

test('channel: at start, live videos a crash left open are ended (the state file, and open ones of the Page with the marker); others are left alone', async (t) => {
  const fake = await fakeGraph();
  const rows = [];
  const dir = tmp();
  const stateFile = path.join(dir, 'state.json');
  const fromFile = fake.add({ description: DESCRIPTION });
  const tagged = fake.add({ description: `old text. ${MARKER}`, status: 'UNPUBLISHED' });
  const foreign = fake.add({ description: 'the owner going live by hand' });
  const done = fake.add({ description: DESCRIPTION, status: 'VOD' });
  fs.writeFileSync(stateFile, JSON.stringify({ open: [fromFile, 'not-an-id'] }));
  const graph = createGraph({ pageId: PAGE_ID, token: () => PAGE_TOKEN, base: fake.url, minGapMs: 0, log: { event: (k, d) => rows.push({ k, ...d }) } });
  const ch = createLiveChannel({ graph, createStream: stubStreams(fake).create, log: { event: (k, d) => rows.push({ k, ...d }) }, stateFile, sweepMs: 40 });
  try {
    await ch.settled();
    assert.equal(fake.videos.get(fromFile).status, 'VOD');
    assert.equal(fake.videos.get(tagged).status, 'VOD');
    assert.equal(fake.videos.get(foreign).status, 'LIVE', 'not ours: untouched');
    assert.equal(fake.calls.some((c) => c.path.endsWith(`/${done}`) || c.path.endsWith(`/${foreign}`)), false);
    assert.ok(rows.some((r) => r.k === 'fb_orphan' && r.broadcast === tagged));
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')).open, []);
    // an end that fails is kept and tried again until it works
    const stuck = fake.add({ description: DESCRIPTION });
    fake.fault((c) => c.path.endsWith(`/${stuck}`) && c.body.end_live_video === 'true', 503, { message: 'Service temporarily unavailable', code: 2, is_transient: true }, 8);
    fs.writeFileSync(stateFile, JSON.stringify({ open: [stuck] }));
    const quick = createGraph({ pageId: PAGE_ID, token: () => PAGE_TOKEN, base: fake.url, minGapMs: 0, sleep: async () => {} });
    const again = createLiveChannel({ graph: quick, createStream: stubStreams(fake).create, stateFile, sweepMs: 400 });
    await again.settled();
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')).open, [stuck], 'kept after eight failures (the state file\'s id, then the same video in the Page\'s list: four tries each)');
    await until(() => fake.videos.get(stuck).status === 'VOD');
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')).open, []);
    await again.stopAll();
  } finally {
    await ch.stopAll();
    await fake.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('channel: a game the agent stops reporting leaves after gameTtlMs; one it reports stays', async (t) => {
  const { fake, ch } = await channelOn(t, { gameTtlMs: 200 });
  ch.start('g1', { player: 'Muse_aaaa' });
  ch.start('g2', { player: 'Muse_bbbb' });
  ch.focus('g1');
  ch.focus('g2');
  await until(() => ch.live().state === 'live');
  for (let i = 0; i < 8; i++) { ch.start('g2', { player: 'Muse_bbbb' }); await sleep(50); }
  assert.equal(ch.has('g1'), false, 'not reported: gone');
  assert.equal(ch.has('g2'), true);
  await until(() => ch.live().game === 'g2');
  await sleep(300);
  await until(() => ch.live().state === 'off');
  assert.equal([...fake.videos.values()][0].status, 'VOD');
});

test('service and client: focus and /live over loopback; focus puts a game the channel lacks on it; the refresh keeps games; no answer carries the ingest', async (t) => {
  const { fake, ch, streams } = await channelOn(t, { gameTtlMs: 300 });
  const server = createStreamService({ manager: ch });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const remote = createRemoteStreamManager({ url, refreshMs: 60 });
  t.after(async () => { await remote.stopAll(); server.close(); });
  remote.start('g1', { source: 'http://127.0.0.1:3201/eyes/AAAAAAAAAAAAAAAAAAAAAA/', player: 'Muse_aaaa' });
  await until(() => ch.has('g1'));
  const st = await remote.focus('g1');
  assert.equal(st.fb, true);
  assert.equal(st.game, 'g1');
  await until(async () => (await remote.live())?.state === 'live');
  const raw = await (await fetch(`${url}/live`)).text();
  assert.equal(raw.includes(SECRET_KEY) || /rtmps?:/.test(raw), false, 'no ingest URL in /live');
  assert.equal(JSON.parse(raw).videoUrl.startsWith('https://www.facebook.com/'), true);
  // the agent restarted the service's view of things: focus with the game's details puts it on the channel
  const f = await fetch(`${url}/streams/g7/focus`, { method: 'POST', body: JSON.stringify({ source: 'http://127.0.0.1:3207/eyes/BBBBBBBBBBBBBBBBBBBBBB/', view: 'BBBBBBBBBBBBBBBBBBBBBB', player: 'Muse_gggg' }) });
  assert.equal(f.status, 200);
  await until(() => streams.made[0].calls.at(-1) === 'follow Muse_gggg');
  const bad = await fetch(`${url}/streams/g8/focus`, { method: 'POST', body: JSON.stringify({ source: 'http://evil.example/', player: 'Muse_hhhh' }) });
  assert.equal(bad.status, 400);
  // g1 is refreshed by the client and stays; g7 is not and leaves
  await sleep(500);
  assert.equal(ch.has('g1'), true);
  assert.equal(ch.has('g7'), false);
  await remote.stop('g1');
  await until(() => ch.live().state === 'off');
  assert.equal([...fake.videos.values()][0].status, 'VOD');

  // a service without the channel: /live says so, focus is 404, the client's focus is null
  const plain = createStreamService({ manager: createStreamManager({ config: { enabled: true, outDir: '/tmp/x', max: 1 }, create: () => ({}) }) });
  await new Promise((r) => plain.listen(0, '127.0.0.1', r));
  try {
    const purl = `http://127.0.0.1:${plain.address().port}`;
    assert.deepEqual(await (await fetch(`${purl}/live`)).json(), { fb: false });
    assert.equal((await fetch(`${purl}/streams/g1/focus`, { method: 'POST', body: '{}' })).status, 404);
    assert.equal(await createRemoteStreamManager({ url: purl, refreshMs: 0 }).focus('g1'), null);
  } finally { plain.close(); }
});

test('live page: under 1 KB, no script or request of its own, only Facebook\'s player; joining, live, waiting, off', () => {
  const embed = facebookEmbedUrl(`https://www.facebook.com/${PAGE_ID}/videos/7100000000001/`);
  const live = liveViewHtml({ state: 'live', game: 'g1a2b3c', camera: 'g1a2b3c', embedUrl: embed, fb: true });
  assert.ok(Buffer.byteLength(live) < 1024, `${Buffer.byteLength(live)} bytes`);
  assert.match(live, /^<!doctype html>/);
  for (const banned of ['<script', 'fetch', 'WebSocket', 'XMLHttpRequest', 'http-equiv', 'javascript:']) assert.equal(live.toLowerCase().includes(banned.toLowerCase()), false, banned);
  assert.doesNotMatch(live, /\son\w+=/i, 'no event handler attributes');
  const urls = live.match(/https?:\/\/[^"\s<]+/g);
  assert.deepEqual(urls.map((u) => u.replace(/&amp;/g, '&')), [embed], 'one URL: the player');
  assert.ok(live.includes(`<iframe src="${embed.replace(/&/g, '&amp;')}"`));
  assert.match(live, /<p>Live: game g1a2b3c\. One camera films the game that asked for the live view last\.<\/p>/);
  const joining = liveViewHtml({ state: 'connecting', game: 'g1a2b3c', embedUrl: embed, fb: true });
  assert.match(joining, /<iframe/);
  assert.match(joining, /Joining: the live video of game g1a2b3c starts in a few seconds\./);
  assert.equal(liveViewHtml({ state: 'starting', game: 'g1', embedUrl: null, fb: true }).includes('<iframe'), false);
  const waiting = liveViewHtml({ state: 'off', game: 'g1', embedUrl: embed, fb: true });
  assert.equal(waiting.includes('<iframe'), false);
  assert.match(waiting, /Waiting for the next game\./);
  assert.match(liveViewHtml({ state: 'off', fb: false }), /Live video is off on this server\./);
  assert.equal(statusLine({ state: 'live', game: 'g1', camera: 'g2' }), 'Live: the camera is on game g2 now (it films the game that asked for the live view last).');
  assert.equal(statusLine({ state: 'retrying', game: 'g1' }), 'Not live yet: the live video could not start; it is tried again by itself.');
  // anything but Facebook's player, or a strange game id, stays out
  assert.equal(liveViewHtml({ state: 'live', game: 'g1', embedUrl: 'https://evil.example/plugins/video.php?href=x' }).includes('<iframe'), false);
  assert.equal(isPlayerUrl('https://www.facebook.com/plugins/video.php?href=x#y'), false);
  assert.equal(liveViewHtml({ state: 'live', game: '<b>x</b>', embedUrl: embed }).includes('<b>'), false);
});

test('MCP live_view with the channel: called before the stream is up it waits for Facebook, then answers with the page and a plain link; the one camera is said plainly', async (t) => {
  const { fake, ch } = await channelOn(t);
  const dir = tmp();
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null, streams: ch, loopStatsMs: 0 });
  const c = new Client({ name: 'fb-test', version: '1' });
  t.after(async () => { await c.close().catch(() => {}); await agent.stop('test over'); fs.rmSync(dir, { recursive: true, force: true }); });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  const game = /game (g\w+)/.exec((await c.callTool({ name: 'start_game', arguments: { adult: true } })).content[0].text)[1];
  // the bot's first-person view comes up a moment after the call: that is when the game joins the channel
  setTimeout(() => ch.start(game, { player: 'Muse_test1' }), 400);
  const t0 = Date.now();
  const r = await c.callTool({ name: 'live_view', arguments: {} });
  const txt = r.content[0].text;
  assert.ok(Date.now() - t0 < 15_000);
  const v = [...fake.videos.values()][0];
  const video = `https://www.facebook.com/${PAGE_ID}/videos/${v.videoId}/`;
  assert.match(txt, new RegExp(`^Live view of game ${game}: live on Facebook since \\d\\d:\\d\\d:\\d\\d UTC\\.\\nVideo \\(plain link\\): ${video.replace(/[./]/g, '\\$&')}\\nOne camera serves every game on this server: it films the game whose live_view call came last`));
  assert.ok(txt.includes('\nHTML page (Facebook\'s video player and a status line; no script):\n<!doctype html>'));
  assert.deepEqual({ ...r.structuredContent, html: undefined }, { format: 'html', game, state: 'live', live: true, camera_game: game, video_url: video, embed_url: facebookEmbedUrl(video), html: undefined });
  assert.ok(r.structuredContent.html.includes(`<iframe src="${facebookEmbedUrl(video).replace(/&/g, '&amp;')}"`));
  const embed = JSON.parse((await c.callTool({ name: 'live_view', arguments: { format: 'embed' } })).content[0].text);
  assert.deepEqual(embed, { format: 'embed', game, live: true, state: 'live', camera_game: game, player: 'facebook', embed_url: facebookEmbedUrl(video), video_url: video });
  // the game ends: its body's end takes it off the channel (the agent hands the channel the body), and the live video ends
  await c.callTool({ name: 'end_game', arguments: {} });
  await ch.stop(game, 'the game ended');
  await until(() => ch.live().state === 'off');
  assert.equal(v.status, 'VOD');
});

test('MCP live_view: not live within the wait, it says so and when to ask again; the page shows "joining"', async (t) => {
  const { ch } = await channelOn(t, { publish: false }); // the ingest never gets a stream
  const dir = tmp();
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null, streams: ch, loopStatsMs: 0, mcpCallMs: 6_000 });
  const c = new Client({ name: 'fb-test', version: '1' });
  t.after(async () => { await c.close().catch(() => {}); await agent.stop('test over'); fs.rmSync(dir, { recursive: true, force: true }); });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  const game = /game (g\w+)/.exec((await c.callTool({ name: 'start_game', arguments: { adult: true } })).content[0].text)[1];
  ch.start(game, { player: 'Muse_test2' });
  const r = await c.callTool({ name: 'live_view', arguments: { format: 'html' } });
  const txt = r.content[0].text;
  assert.match(txt, new RegExp(`^Live view of game ${game}: the live video is starting but was not live after \\d s\\. Call live_view again in about 20 s for a page that shows it live\\.\\nVideo \\(plain link\\): https://www\\.facebook\\.com/`));
  assert.equal(r.structuredContent.live, false);
  assert.match(r.structuredContent.html, /<iframe src="https:\/\/www\.facebook\.com\/plugins\/video\.php\?href=/);
  assert.match(r.structuredContent.html, /Joining: the live video of game g\w+ starts in a few seconds\./);
});

test('MCP live_view: a refusal the channel waits out is said at once, with the reason and when it tries again', async (t) => {
  const { fake, ch } = await channelOn(t, { permanentRetryMs: 600_000 });
  fake.fault((c) => c.method === 'POST' && c.path.endsWith('/live_videos'), 400, { message: 'Permissions error', code: 200, error_subcode: 1363120 }, 1);
  const dir = tmp();
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null, streams: ch, loopStatsMs: 0 });
  const c = new Client({ name: 'fb-test', version: '1' });
  t.after(async () => { await c.close().catch(() => {}); await agent.stop('test over'); fs.rmSync(dir, { recursive: true, force: true }); });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  const game = /game (g\w+)/.exec((await c.callTool({ name: 'start_game', arguments: { adult: true } })).content[0].text)[1];
  ch.start(game, { player: 'Muse_test3' });
  ch.focus(game);
  await until(() => ch.live().state === 'retrying');
  const t0 = Date.now();
  const r = await c.callTool({ name: 'live_view', arguments: {} });
  assert.ok(Date.now() - t0 < 5_000, 'no 40 s wait for a try ten minutes away');
  assert.match(r.content[0].text, new RegExp(`^Live view of game ${game}: not live: the live video could not start \\(Facebook says the Page is not eligible to go live yet: a profile or Page must be at least 60 days old \\(code 200/1363120\\)\\)\\. It is tried again by itself in \\d+ s; call live_view again after that\\.\n3D view in a web page \\(plain link\\): `));
  assert.match(r.structuredContent.html, /<p>Not live yet: the live video could not start; it is tried again by itself\.<\/p>/);
  assert.equal(r.structuredContent.html.includes('<iframe'), false);
});

test('config: FB_LIVE off by default; on, it needs the Page id, the token file and the camera; FB_* checked', () => {
  const off = loadConfig({});
  assert.equal(off.fb.live, false);
  assert.equal(off.fb.graphVersion, 'v23.0');
  assert.equal(off.fb.graphUrl, 'https://graph.facebook.com');
  assert.match(off.fb.stateFile, /fb-live-state\.json$/);
  const on = loadConfig({ FB_LIVE: 'on', FB_PAGE_ID: PAGE_ID, FB_TOKEN_FILE: '/fb/page-token', STREAM_ENABLED: '1', STREAM_SOURCE: 'client', MC_CONSOLE: '/console/in', CAMERA_AUTH: 'offline' });
  assert.deepEqual([on.fb.live, on.fb.pageId, on.fb.tokenFile], [true, PAGE_ID, '/fb/page-token']);
  assert.equal(loadConfig({ FB_LIVE: 'on', FB_PAGE_ID: PAGE_ID, FB_TOKEN_FILE: '/x', STREAM_SERVICE_URL: 'http://127.0.0.1:7862' }).fb.live, true, 'the agent of a camera service may say it too');
  const problems = (env) => { try { loadConfig(env); return []; } catch (e) { return e.problems; } };
  assert.deepEqual(problems({ FB_LIVE: 'on' }).length, 3);
  assert.match(problems({ FB_LIVE: 'on' }).join('\n'), /FB_PAGE_ID[\s\S]*FB_TOKEN_FILE[\s\S]*STREAM_SOURCE=client/);
  assert.match(problems({ FB_PAGE_ID: 'mypage' })[0], /numeric id/);
  assert.match(problems({ FB_GRAPH_URL: 'http://graph.example.com' })[0], /https/);
  assert.match(problems({ FB_GRAPH_VERSION: '23' })[0], /v23\.0/);
  assert.match(problems({ FB_LIVE: 'maybe' })[0], /FB_LIVE must be true or false/);
  assert.equal(JSON.stringify(on).includes('token'), true, 'the path is not a secret; the token never enters the config');
  assert.deepEqual([on.fb.target, on.fb.deleteAfter, on.fb.privacy], ['page', false, 'EVERYONE'], 'the Page by default, videos kept');
  const me = loadConfig({ FB_LIVE: 'on', FB_TARGET: 'me', FB_TOKEN_FILE: '/fb/user-token', STREAM_SERVICE_URL: 'http://127.0.0.1:7862' });
  assert.deepEqual([me.fb.target, me.fb.deleteAfter, me.fb.privacy, me.fb.pageId], ['me', true, 'EVERYONE', ''], 'the profile: no Page id, each video deleted after its game');
  assert.equal(loadConfig({ FB_TARGET: 'me', FB_DELETE_AFTER: 'false' }).fb.deleteAfter, false);
  assert.match(problems({ FB_TARGET: 'profile' })[0], /FB_TARGET must be one of page, me/);
  assert.match(problems({ FB_LIVE: 'on', FB_TARGET: 'me', STREAM_SERVICE_URL: 'http://127.0.0.1:7862' }).join('\n'), /long-lived user token/);
});

/** A camera rig that is always in the world (no Minecraft, no X server). */
function readyRig() {
  const em = new EventEmitter();
  const calls = [];
  return {
    calls, state: 'ready', name: 'MuseCam', options: { display: 4243, width: 320, height: 180, followMs: 60_000 },
    start() { calls.push('start'); }, waitReady: async () => true, follow: async (p) => { calls.push(`follow ${p}`); return true; },
    keepFollowing: async () => true, park: async () => { calls.push('park'); }, stats: async () => ({ state: 'ready' }),
    on: (e, fn) => { em.on(e, fn); return () => em.off(e, fn); },
  };
}

test('end to end: a game on the channel -> the fake Graph API -> the camera stream (a test pattern) -> the publisher -> a local RTMP server; the key on no command line; the game\'s end ends it', { timeout: 90_000 }, async (t) => {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) { t.skip('no ffmpeg'); return; }
  const dir = tmp();
  const port = await freePort();
  const sink = await rtmpSink(ffmpeg, dir, port);
  const KEY = `FB-%s-0-${SECRET_KEY}E2E?s_bl=1&a=Zz`;
  const fake = await fakeGraph({ ingest: (id) => `rtmp://127.0.0.1:${port}/rtmp/${KEY.replace('%s', id)}` });
  const rows = [];
  const log = { event: (k, d) => rows.push({ k, ...d }) };
  const graph = createGraph({ pageId: PAGE_ID, token: () => PAGE_TOKEN, base: fake.url, minGapMs: 0, log });
  const rig = readyRig();
  const ch = createLiveChannel({
    graph, log, stateFile: path.join(dir, 'state.json'), pollMs: 100, settleMs: 1_000, allowPlainRtmp: true,
    createStream: (o) => createCameraStream({ ...o, rig, ffmpeg, font: null, settleMs: 10, testSource: '320x180', width: 640, height: 360, fps: 15, bitrateK: 600 }),
  });
  try {
    ch.start('g1', { player: 'Muse_e2e1' });
    ch.focus('g1');
    await until(() => rows.some((r) => r.k === 'stream_publishing'), 20_000);
    const [id] = [...fake.videos.keys()];
    fake.golive(id); // the fake has no ingest of its own: Facebook would show LIVE once the stream arrives
    await until(() => ch.live().state === 'live', 10_000);
    await sleep(2_000);
    const key = KEY.replace('%s', id);
    const seen = processTexts();
    assert.ok(seen.some((l) => l.includes('pipe:3') && l.includes('testsrc2')), 'the scan sees the camera\'s ffmpeg');
    assert.deepEqual(seen.filter((l) => l.includes(key) || l.includes(`${SECRET_KEY}E2E`) || l.includes(PAGE_TOKEN)), [], 'no command line carries the key or the token');
    await ch.stop('g1', 'the game ended');
    await until(() => ch.live().state === 'off', 20_000);
    assert.equal(fake.videos.get(id).status, 'VOD');
    await until(() => sink.child.exitCode !== null, 15_000);
    assert.match(sink.log(), new RegExp(`Unexpected stream ${key.replace(/[?.]/g, '\\$&')}, expecting sink`), 'the RTMP server got the live video\'s key');
    const probe = JSON.parse(execFileSync(ffmpeg.replace(/ffmpeg$/, 'ffprobe'), ['-v', 'error', '-show_entries', 'stream=codec_name:format=duration', '-of', 'json', sink.out], { encoding: 'utf8' }));
    assert.deepEqual(probe.streams.map((s) => s.codec_name).sort(), ['aac', 'h264']);
    assert.ok(Number(probe.format.duration) > 2, `${probe.format.duration} s arrived`);
    assert.deepEqual(rig.calls.slice(0, 2), ['start', 'follow Muse_e2e1']);
    assert.equal(rig.calls.at(-1), 'park');
    noSecrets(fake, rows);
  } finally {
    await ch.stopAll();
    await fake.close();
    if (sink.child.exitCode === null) sink.child.kill('SIGKILL');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
