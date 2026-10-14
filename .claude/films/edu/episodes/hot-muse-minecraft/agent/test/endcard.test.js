// test/endcard.test.js - the live page after its game ends (the owner, 2026-10-14: a fresh player started Facebook's
// replay from 0:00 after gd7540a ended, and the game looked alive again): the server says, as an image, whether a game
// has ended (/live/<game>/state.svg, 1 or 2 px wide) and draws its end card (/live/<game>/end.svg); the page asks every
// 15 s and puts the card in the player's place, the watchdog stopped
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { createWeb } from '../src/web.js';
import { liveViewHtml, endCardSvg, isStatusBase } from '../src/live-page.js';

function stubBody() {
  return {
    ready: Promise.resolve(), busy: false, state: () => 'inventory: empty', snapshot: () => null,
    run: async () => ({ ok: true, result: 'done', delta: {}, ms: 0 }), async stop() {}, async close() {}, on() { return () => {}; },
    attribution: () => ({ muse: 12, reflex: 1, care: 0, musePct: 92, rule: 1, body: 1, decidedPct: 93, text: 'Muse decided 93%' }),
  };
}

test('end card: the server says when a game has ended (an image 2 px wide) and draws its card; unknown games are running', async (t) => {
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: '', MODEL_API_KEY: '' });
  const web = createWeb({ config, log: { event() {}, tail: () => [] }, makeBody: () => stubBody(), mcpCallMs: 400 });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  t.after(async () => { await c.close().catch(() => {}); await web.stop(); });
  const s = await c.callTool({ name: 'start_game', arguments: { adult: true, goal: 'nether_and_back' } });
  const game = /game (g[0-9a-f]+)/.exec(s.content.map((x) => x.text).join('\n'))[1];
  const state = async () => { const r = await fetch(`${url}/live/${game}/state.svg`); return { status: r.status, type: r.headers.get('content-type'), store: r.headers.get('cache-control'), corp: r.headers.get('cross-origin-resource-policy'), body: await r.text() }; };
  let st = await state();
  assert.deepEqual(st, { status: 200, type: 'image/svg+xml', store: 'no-store', corp: 'cross-origin', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' });
  assert.equal((await fetch(`${url}/live/${game}/end.svg`)).status, 404, 'no card while it runs');
  await c.callTool({ name: 'end_game', arguments: {} });
  st = await state();
  assert.equal(st.body, '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="1"/>', 'ended: 2 px wide');
  const card = await (await fetch(`${url}/live/${game}/end.svg`)).text();
  assert.match(card, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1080" height="1080"/);
  assert.match(card, /Game ended at \d+:\d\d/);
  assert.match(card, /Nether and back: goal not reached/);
  assert.match(card, /Wooden pickaxe/, 'the splits');
  assert.match(card, /Decided by Muse: 93%/);
  assert.match(card, /12 by its calls · 1 by its rules · 1 by the bot on its own/);
  assert.doesNotMatch(card, /<script|href=|xlink|<image|url\(/, 'text and shapes only');
  assert.equal((await fetch(`${url}/live/g000000/state.svg`)).headers.get('content-type'), 'image/svg+xml');
  assert.match(await (await fetch(`${url}/live/g000000/state.svg`)).text(), /width="1"/, 'an unknown game: running, as far as the page knows');
  assert.equal((await fetch(`${url}/live/../state.svg`)).status, 404);
});

test('end card: a goal reached reads "<goal> in m:ss"; the splits with their times; the test script by its name', () => {
  const card = endCardSvg({ game: 'gabc123', caller: 'TEST SCRIPT', reason: 'ended with end_game', attribution: { muse: 40, rule: 3, body: 2, decidedPct: 96 },
    report: { goal: 'nether_and_back', goalTitle: 'Nether and back', goalReached: true, goalReachedS: 947, elapsedS: 980, milestones: [{ name: 'wooden pickaxe', atS: 40 }, { name: 'stone pickaxe', atS: 110 }, { name: 'back', atS: 947 }] } });
  assert.match(card, />Nether and back in 15:47</);
  assert.match(card, /goal reached · the game ended at 16:20/);
  assert.match(card, />Wooden pickaxe<\/text><text [^>]*>0:40</);
  assert.match(card, /Decided by the test script: 96%/);
  assert.doesNotMatch(card, /Muse/);
  assert.match(endCardSvg({ game: 'g1', report: { goal: 'free', goalReached: false, elapsedS: 61, milestones: [] } }), /Game ended at 1:01/);
  assert.match(endCardSvg({ game: 'g1', report: null }), /Game ended at 0:00/, 'a game without a report still gets a card');
});

test('live page: the poster with the lab\'s pixel logo (STREAM_LOGO on) as a data: image, none with it off', () => {
  const embed = 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F1%2Fvideos%2F2%2F&show_text=false';
  const on = liveViewHtml({ state: 'live', game: 'gabc123', embedUrl: embed, logo: true });
  assert.match(on, /<image href="data:image\/png;base64,[A-Za-z0-9+/=]{1000,}" [^>]*image-rendering:pixelated/);
  assert.ok(Buffer.byteLength(on) < 60_000, `${Buffer.byteLength(on)} bytes`);
  assert.doesNotMatch(liveViewHtml({ state: 'live', game: 'gabc123', embedUrl: embed }), /<image /);
});

test('live page: asks every 15 s whether its game has ended (an image from our server), then the end card in the player\'s place, the watchdog stopped', () => {
  const embed = 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F1%2Fvideos%2F2%2F&show_text=false';
  const page = liveViewHtml({ state: 'live', game: 'gabc123', camera: 'gabc123', embedUrl: embed, fb: true, statusBase: 'https://play.picasso-lab.com' });
  assert.match(page, /data-st="https:\/\/play\.picasso-lab\.com\/live\/gabc123\/"/);
  assert.equal(isStatusBase('https://play.picasso-lab.com'), true);
  for (const bad of ['http://play.picasso-lab.com', 'https://x.example/path', 'javascript:alert(1)', 'https://u:p@x.example']) assert.equal(isStatusBase(bad), false, bad);
  assert.doesNotMatch(liveViewHtml({ state: 'live', game: 'gabc123', embedUrl: embed, statusBase: 'http://evil.example' }), /data-st/);
  const script = page.match(/<script>([\s\S]*)<\/script>/)[1];
  let now = 0; const timers = []; let seq = 0;
  const later = (fn, ms, every = 0) => { const id = ++seq; timers.push({ id, at: now + ms, fn, every }); return id; };
  const tick = (ms) => { const end = now + ms; for (;;) { timers.sort((x, y) => x.at - y.at); const x = timers[0]; if (!x || x.at > end) break; now = x.at; if (x.every) x.at += x.every; else timers.shift(); x.fn(); } now = end; };
  const el = (tag) => ({ tagName: tag, style: {}, remove() { this.gone = true; } });
  const kids = [];
  const asked = [];
  let ended = false;
  class Img { constructor() { this.naturalWidth = 0; } set src(u) { this._src = u; if (/state\.svg/.test(u)) { asked.push(u); this.naturalWidth = ended ? 2 : 1; queueMicrotask(() => this.onload?.()); } } get src() { return this._src; } }
  const status = { textContent: 'Live: game gabc123.' };
  const reload = { remove() { this.gone = true; } };
  const nodes = { v: { dataset: { src: 'x', st: 'https://play.picasso-lab.com/live/gabc123/' }, querySelectorAll: () => kids.filter((k) => k.tagName === 'IFRAME' && !k.gone), appendChild: (f) => kids.push(f) }, r: reload };
  const document = { activeElement: null, getElementById: (id) => nodes[id], createElement: (tag) => el(tag.toUpperCase()), querySelector: () => status };
  const drop = (id) => { const i = timers.findIndex((x) => x.id === id); if (i >= 0) timers.splice(i, 1); };
  vm.runInNewContext(script, { document, Image: Img, Date: { now: () => now }, setTimeout: (fn, ms) => later(fn, ms), clearTimeout: drop, setInterval: (fn, ms) => later(fn, ms, ms), clearInterval: drop, addEventListener() {}, queueMicrotask });
  return (async () => {
    tick(15_000); await null;
    const cur = kids.find((k) => k.tagName === 'IFRAME');
    assert.equal(asked.length, 1);
    assert.match(asked[0], /^https:\/\/play\.picasso-lab\.com\/live\/gabc123\/state\.svg\?\d+$/);
    assert.equal(cur.gone, undefined, 'still running: the player stays');
    ended = true;
    tick(15_000); await null; await null;
    assert.equal(cur.gone, true, 'the player gone');
    const card = kids.find((k) => /end\.svg/.test(k.src ?? ''));
    assert.ok(card && card.className === 'end', 'the end card in its place');
    assert.match(status.textContent, /^The game has ended\./);
    assert.ok(reload.gone, 'no Reload video for an ended game');
    const before = kids.length;
    tick(900_000); await null;
    assert.equal(kids.length, before, 'no fresh player after the end (it would play the replay from 0:00)');
    assert.equal(asked.length, 2, 'and no more asking');
  })();
});
