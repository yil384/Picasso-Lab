// test/web.test.js - the viewer channel on a random port with stub bodies: the landing page, the zero-JS control page and
// its forms, argument checks before a body is called, HTML escaping, the JSON API and its OpenAPI description, /ask (18+,
// length cap, per-address rate limit, the queue reaching our brain), leases and slots, the size cap, stop, the public
// log and the operator kill switch; plus the accessibility tree through an installed Chrome (DevTools protocol) and
// through Python Playwright when it is installed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { createWeb, escapeHtml, addressKey, askAnswered } from '../src/web.js';
import { TOOL_NAMES, SCHEMAS } from '../src/contracts.js';
import * as a11y from '../scripts/a11y-chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN = 'admin-token-for-tests-0123456789';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A Body that keeps a little inventory, echoes say, can be slow per tool and honours stop(). */
function stubBody(id, { runMs = {}, state } = {}) {
  const subs = new Map();
  const inv = { oak_log: 2 };
  let busy = false;
  let cancel = null;
  const emit = (ev, data) => { for (const fn of subs.get(ev) ?? []) fn(data); };
  const body = {
    id,
    calls: [],
    stops: [],
    closed: false,
    ready: Promise.resolve(),
    state: () => state ?? `health: 20/20  food: 20/20\nposition: 0 64 0\ninventory: ${Object.entries(inv).map(([k, v]) => `${k} x${v}`).join(', ')}\ngoal: none`,
    snapshot: () => ({
      health: 20, food: 20, position: { x: 0, y: 64, z: 0 }, dimension: 'overworld', timeOfDay: 1000, isDay: true,
      inventory: { ...inv }, held: null, mobs: [], goal: null, busy, lastResult: null,
      nearbyBlocks: [{ name: 'birch_log', count: 3, nearest: { x: 2, y: 64, z: 1 }, distance: 2 }],
    }),
    inventory: () => ({ ...inv }),
    setGoal() {},
    get busy() { return busy; },
    async run(tool, args) {
      body.calls.push({ tool, args });
      if (busy) return { ok: false, result: 'busy', delta: {} };
      busy = true;
      try {
        const why = await new Promise((resolve) => {
          const t = setTimeout(resolve, runMs[tool] ?? 0, null);
          cancel = (reason) => { clearTimeout(t); resolve(reason); };
        });
        if (why) return { ok: false, result: `stopped: ${why}`, delta: {} };
        if (tool === 'collect') {
          inv[args.block] = (inv[args.block] ?? 0) + args.n;
          return { ok: true, result: `collected ${args.n} ${args.block}`, delta: { [args.block]: args.n }, ms: 5 };
        }
        if (tool === 'say') return { ok: true, result: `said: ${args.text}`, delta: {} };
        return { ok: true, result: `${tool} done`, delta: {} };
      } finally {
        busy = false;
        cancel = null;
      }
    },
    async stop(reason) { body.stops.push(reason); cancel?.(reason); },
    async close() { await body.stop('close'); body.closed = true; emit('end', { reason: 'closed' }); },
    on(ev, fn) {
      if (!subs.has(ev)) subs.set(ev, new Set());
      subs.get(ev).add(fn);
      return () => subs.get(ev).delete(fn);
    },
    emit,
  };
  return body;
}

async function serve(t, { env = {}, bodyOpts, ...opts } = {}) {
  const config = loadConfig({
    WEB_HOST: '127.0.0.1', WEB_PORT: '0', WEB_MAX_SESSIONS: '2', WEB_ASK_PER_HOUR: '2', WEB_ASK_MAX_CHARS: '40',
    WEB_MAX_BODY: '2048', WEB_ADMIN_TOKEN: ADMIN, ...env,
  });
  const log = createLogger({ dir: null, config });
  const bodies = new Map();
  const web = createWeb({
    config, log, ...opts,
    makeBody: (id) => { const b = stubBody(id, bodyOpts); bodies.set(id, b); return b; },
  });
  const { url } = await web.start();
  t.after(() => web.stop());
  return { url, web, bodies, log, config };
}

const post = (url, fields, headers = {}) => fetch(url, {
  method: 'POST', redirect: 'manual',
  headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
  body: new URLSearchParams(fields).toString(),
});
const call = (url, method, body, headers = {}) => fetch(url, {
  method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body),
});

async function guest(url, headers = {}) {
  const r = await post(`${url}/session`, { adult: 'yes' }, headers);
  assert.equal(r.status, 303, `session start: ${r.status}`);
  const loc = r.headers.get('location');
  assert.match(loc, /^\/play\/[A-Za-z0-9_-]{32}$/);
  const token = loc.split('/').pop();
  for (let i = 0; i < 100; i += 1) {
    const s = await (await fetch(`${url}/api/${token}/state`)).json();
    if (s.session.status === 'ready') break;
    await sleep(5);
  }
  return { token, page: `${url}${loc}` };
}

const text = async (url) => (await fetch(url)).text();

test('landing: what it is, 18+, not affiliated, start and ask forms, strict headers', async (t) => {
  const { url } = await serve(t, { makeBrain: () => ({}) });
  const r = await fetch(`${url}/`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /default-src 'none'/);
  assert.ok(!csp.includes('unsafe-inline'));
  const page = await r.text();
  const css = page.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.ok(csp.includes(`'sha256-${crypto.createHash('sha256').update(css).digest('base64')}'`), 'the CSP hash allows our stylesheet');
  assert.match(page, /Not affiliated with or endorsed by Meta, Mojang or\s+Microsoft/);
  assert.match(page, /18\+/);
  assert.match(page, /<form [^>]*method="post" action="\/session"/);
  assert.match(page, /<form [^>]*method="post" action="\/ask"/);
  assert.equal((page.match(/type="checkbox"[^>]*name="adult"[^>]*required/g) ?? []).length, 2);
  assert.match(page, /maxlength="40"/);
  assert.ok(!/<script/i.test(page), 'zero JavaScript');
  assert.equal((await fetch(`${url}/nowhere`)).status, 404);
  assert.equal((await fetch(`${url}/session`)).status, 405);
});

test('play page: state as text, no refresh while idle, one labelled form per skill, stop, recent actions', async (t) => {
  const { url } = await serve(t);
  assert.equal((await post(`${url}/session`, {})).status, 400, '18+ must be confirmed');
  const { token, page } = await guest(url);
  const r = await fetch(page);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
  const html = await r.text();
  assert.ok(!/<script/i.test(html), 'zero JavaScript');
  assert.doesNotMatch(html, /http-equiv="refresh"/, 'an idle page never reloads under an agent filling a form');
  assert.match(html, new RegExp(`<a href="/play/${token}">Check again</a>`));
  assert.equal((html.match(/<form\b[^>]*novalidate/g) ?? []).length, TOOL_NAMES.length + 2, 'the server, not a validation bubble, reports bad values');
  assert.match(html, /<pre>health: 20\/20 {2}food: 20\/20\nposition: 0 64 0/);
  for (const tool of TOOL_NAMES) {
    assert.match(html, new RegExp(`<form class="tool" method="post" action="/play/${token}/${tool}" aria-labelledby="h-${tool}"`), `${tool} form`);
    assert.match(html, new RegExp(`<button type="submit">Run ${tool}</button>`));
  }
  assert.equal((html.match(/<form\b/g) ?? []).length, TOOL_NAMES.length + 2, '10 skills + stop + end');
  assert.match(html, new RegExp(`action="/play/${token}/stop"[^>]*><button class="stop" type="submit">Stop the current action`));
  assert.match(html, new RegExp(`action="/play/${token}/end"`));
  assert.match(html, /Recent actions \(newest first\)/);
  assert.match(html, /the bot is in the world/);

  const controls = [...html.matchAll(/<(input|select|textarea)\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(controls.length >= 12);
  for (const c of controls) {
    const id = c.match(/\bid="([^"]+)"/)?.[1];
    assert.ok(id, `control has an id: ${c}`);
    assert.ok(html.includes(`<label for="${id}">`), `control ${id} has a label`);
  }
  assert.match(html, /<option value="birch_log" selected>/, 'collect defaults to a block nearby');
  assert.match(html, /name="pos.x" type="number" step="1" min="-30000000" max="30000000" value="1"/, 'place defaults next to the bot');
  assert.match(html, /refresh=0">Turn auto-refresh off/);
  assert.match(await text(`${page}?refresh=0`), /Auto-refresh is off/);
  assert.match(await text(page), /Auto-refresh is off/, 'the choice sticks to the session');
});

test('play actions: valid form args reach the body as typed values, bad ones never do', async (t) => {
  const { url, bodies } = await serve(t);
  const { token, page } = await guest(url);
  const body = [...bodies.values()][0];

  let r = await post(`${page}/collect`, { block: 'oak_log', n: '3', submit: 'Run collect' });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), `/play/${token}`);
  assert.deepEqual(body.calls.at(-1), { tool: 'collect', args: { block: 'oak_log', n: 3 } });
  let html = await text(page);
  assert.match(html, /collect block=oak_log n=3 -&gt; ok: collected 3 oak_log Inventory change: \+3 oak_log\./);

  await post(`${page}/place`, { block: 'oak_planks', 'pos.x': '1', 'pos.y': '64', 'pos.z': '-2' });
  assert.deepEqual(body.calls.at(-1), { tool: 'place', args: { block: 'oak_planks', pos: { x: 1, y: 64, z: -2 } } });

  const before = body.calls.length;
  for (const [tool, fields, why] of [
    ['collect', { block: 'oak_log', n: '999' }, /from 1 to 64/],
    ['collect', { block: 'bedrock', n: '1' }, /not allowed/],
    ['collect', { block: 'oak_log', n: '2.5' }, /integer/],
    ['say', { text: '/op Muse' }, /not allowed/],
    ['go_to', { x: '1', y: '64' }, /required/],
  ]) {
    r = await post(`${page}/${tool}`, fields);
    assert.equal(r.status, 303);
    html = await text(page);
    assert.match(html, /<p class="notice" role="alert">Not run: /, `${tool} ${JSON.stringify(fields)}`);
    assert.match(html, why);
  }
  assert.equal(body.calls.length, before, 'no bad call reached the body');

  assert.equal((await post(`${page}/get_state`, {})).status, 303);
  assert.equal(body.calls.length, before, 'get_state reads the state without running a skill');
  assert.equal((await post(`${page}/exec`, { code: 'process.exit()' })).status, 404);
  assert.equal((await post(`${page}/STOP`, {})).status, 404);
  assert.equal((await fetch(`${url}/play/${'A'.repeat(32)}`)).status, 404);
  assert.equal((await fetch(`${url}/play/..%2F..%2Fetc`)).status, 404);
  assert.equal((await post(`${page}/collect`, { block: 'oak_log', n: '1' }, { 'content-type': 'text/plain' })).status, 415);
});

test('escaping: state, results, chat and notices are shown as text, never as markup', async (t) => {
  const evil = '<script>alert(1)</script> & "q" \'a\'';
  const { url, bodies } = await serve(t, { bodyOpts: { state: evil } });
  const { page } = await guest(url);
  const body = [...bodies.values()][0];
  await post(`${page}/say`, { text: '<img src=x onerror=alert(1)>' });
  assert.equal(body.calls.at(-1).args.text, '<img src=x onerror=alert(1)>', 'the text reaches the game as typed');
  body.emit('chat', { username: '<b>evil</b>', message: '"><svg onload=alert(1)>' });
  await post(`${page}/collect`, { block: '<script>x</script>', n: '1' });
  const html = await text(page);
  for (const bad of ['<script', '<img src=x', '<svg', '<b>evil', '"><svg']) assert.ok(!html.includes(bad), `no raw ${bad}`);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot; &#39;a&#39;'));
  assert.ok(html.includes('said: &lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('&lt;&lt;b&gt;evil&lt;/b&gt;&gt; &quot;&gt;&lt;svg onload=alert(1)&gt;'));
  assert.ok(html.includes('&quot;&lt;script&gt;x&lt;/script&gt;&quot; is not allowed'));
  assert.equal(escapeHtml('<a href="x">\'&'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');

  const state = await (await fetch(`${url}/api/${page.split('/').pop()}/state`)).text();
  assert.ok(!state.includes('<script'), 'JSON escapes < too');
  assert.equal(JSON.parse(state).state, evil);
});

test('openapi + JSON api: operationIds are the tool names, args validated, busy, 202, stop, end', async (t) => {
  const { url, bodies } = await serve(t, { bodyOpts: { runMs: { go_to: 400 } }, apiWaitMs: 100 });
  const spec = await (await fetch(`${url}/openapi.json`)).json();
  assert.equal(spec.openapi, '3.1.0');
  assert.equal(spec.servers[0].url, url);
  assert.match(spec.info.description, /Not affiliated with or endorsed by Meta, Mojang or Microsoft/);
  const ops = Object.entries(spec.paths).flatMap(([p, item]) => Object.entries(item).map(([m, op]) => ({ p, m, op })));
  const ids = ops.map((o) => o.op.operationId);
  assert.equal(new Set(ids).size, ids.length, 'operationIds are unique');
  for (const id of ['start_session', 'read_state', 'stop', 'end_session']) assert.ok(ids.includes(id), id);
  for (const tool of TOOL_NAMES) {
    const op = spec.paths[`/api/{token}/${tool}`]?.post;
    assert.equal(op?.operationId, tool);
    assert.deepEqual(op.tags, ['tools']);
    assert.deepEqual(op.requestBody.content['application/json'].schema, SCHEMAS[tool]);
    assert.ok(op.responses[200] && op.responses[202] && op.responses[400] && op.responses[409]);
  }

  assert.equal((await call(`${url}/api/session`, 'POST', {})).status, 400);
  const created = await call(`${url}/api/session`, 'POST', { adult: true });
  assert.equal(created.status, 201);
  const s = await created.json();
  assert.match(s.token, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(s.playUrl, `${url}/play/${s.token}`);
  assert.equal(s.leaseSeconds, 600);
  const api = `${url}/api/${s.token}`;
  for (let i = 0; i < 100 && (await (await fetch(`${api}/state`)).json()).session.status !== 'ready'; i += 1) await sleep(5);

  let r = await call(`${api}/collect`, 'POST', { block: 'oak_log', n: 2 });
  assert.equal(r.status, 200);
  let j = await r.json();
  assert.equal(j.ok, true);
  assert.deepEqual(j.delta, { oak_log: 2 });
  assert.match(j.state, /oak_log x4/);
  for (const bad of [{ block: 'oak_log', n: 2, extra: 1 }, { block: 'oak_log', n: '2' }, { block: 'tnt', n: 1 }]) {
    r = await call(`${api}/collect`, 'POST', bad);
    assert.equal(r.status, 400, JSON.stringify(bad));
    assert.ok((await r.json()).error);
  }
  r = await fetch(`${api}/collect`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"__proto__":{"n":1},"block":"oak_log","n":1}' });
  assert.equal(r.status, 400);
  r = await fetch(`${api}/collect`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"block":' });
  assert.equal(r.status, 400);
  assert.equal((await call(`${api}/nope`, 'POST', {})).status, 404);
  r = await fetch(`${api}/get_state`, { method: 'POST' });
  assert.equal(r.status, 200);
  assert.match((await r.json()).state, /health/);

  const st = await (await fetch(`${api}/state`)).json();
  assert.equal(st.last.tool, 'collect');
  assert.equal(st.snapshot.health, 20);
  assert.ok(st.session.secondsLeft > 590);
  assert.ok(st.log.some((l) => l.includes('collect block=oak_log n=2')));

  r = await call(`${api}/go_to`, 'POST', { x: 5, y: 64, z: 5 });
  assert.equal(r.status, 202, 'a long action answers 202 after the wait');
  assert.equal((await r.json()).running, true);
  r = await call(`${api}/collect`, 'POST', { block: 'oak_log', n: 1 });
  assert.equal(r.status, 409);
  assert.match((await r.json()).error, /busy: go_to/);
  r = await call(`${api}/stop`, 'POST');
  assert.deepEqual(await r.json(), { stopped: true });
  j = await (await fetch(`${api}/state`)).json();
  assert.equal(j.running, null);
  assert.match(j.last.result, /^stopped: stopped through the API/);

  assert.deepEqual(await (await call(api, 'DELETE')).json(), { ended: true });
  r = await fetch(`${api}/state`);
  assert.equal(r.status, 410);
  assert.match((await r.json()).error, /ended by the guest/);
  await sleep(5);
  assert.equal([...bodies.values()][0].closed, true);
});

test('/ask: 18+, length cap, per-address limits, the queue reaches our brain', async (t) => {
  let clock = 1_000_000;
  const goals = [];
  let hold = null; // set to a promise to keep a request running
  const makeBrain = () => ({
    async runUntil(goal, cond, opts) {
      assert.ok(opts.signal instanceof AbortSignal);
      goals.push(goal);
      const r = { step: 1, goal, tool: null, args: null, ok: true, result: '', delta: {}, usd: 0.001, text: 'done' };
      assert.equal(await cond({ ...r, tool: 'collect', args: { block: 'oak_log', n: 1 } }, null), false, 'a skill step goes on');
      assert.equal(await cond({ ...r, result: 'model call failed: HTTP 503', error: 'model' }, null), false, 'a model error goes on (backoff)');
      assert.equal(await cond({ ...r, result: 'invalid call, nothing ran: unknown tool', error: 'invalid' }, null), false, 'an invalid call goes on');
      assert.equal(await cond({ ...r, tool: 'say', args: { text: 'Done: the hut stands' } }, null), true, 'a Done report ends the request');
      assert.equal(await cond({ ...r, result: 'no tool call' }, null), true, 'a reply in words ends the request');
      await hold;
      return { reason: 'goal', steps: 1, usd: 0.001, ms: 3, last: r };
    },
    stop() {},
    stats: () => ({ steps: 0, usd: 0, errors: 0 }),
  });
  const { url, bodies } = await serve(t, { makeBrain, now: () => clock, trustProxy: 1 });
  const ip = (a) => ({ 'x-forwarded-for': `203.0.113.9, ${a}` });

  assert.equal((await post(`${url}/ask`, { text: 'build a hut' }, ip('1.1.1.1'))).status, 400, 'needs 18+');
  assert.equal((await post(`${url}/ask`, { text: 'x'.repeat(41), adult: 'yes' }, ip('1.1.1.1'))).status, 413);
  assert.equal((await post(`${url}/ask`, { text: '   ', adult: 'yes' }, ip('1.1.1.1'))).status, 400);

  let release;
  hold = new Promise((r) => { release = r; });
  let r = await post(`${url}/ask`, { text: '<b>hut</b>', adult: 'yes' }, ip('1.1.1.1'));
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), '/ask?queued=1');
  r = await post(`${url}/ask`, { text: 'a second one', adult: 'yes' }, ip('1.1.1.1'));
  assert.equal(r.status, 429, 'one request at a time per address');
  assert.match(await r.text(), /still waiting or running/);
  release();
  hold = null;
  for (let i = 0; i < 100 && !(await text(`${url}/ask`)).includes('#1 &lt;b&gt;hut&lt;/b&gt; - done'); i += 1) await sleep(5);
  assert.equal((await post(`${url}/ask`, { text: 'build\u0000 a\n\nhut', adult: 'yes' }, ip('1.1.1.1'))).status, 303);
  for (let i = 0; i < 100 && goals.length < 2; i += 1) await sleep(5);
  for (let i = 0; i < 100 && (await text(`${url}/ask`)).includes('Running now</h2><ol>'); i += 1) await sleep(5);
  r = await post(`${url}/ask`, { text: 'one more', adult: 'yes' }, ip('1.1.1.1'));
  assert.equal(r.status, 429, 'third request in the hour from one address');
  assert.ok(Number(r.headers.get('retry-after')) > 0);
  r = await call(`${url}/ask`, 'POST', { text: 'dig down', adult: true }, ip('2.2.2.2'));
  assert.equal(r.status, 202, 'another address is fine');
  assert.equal((await r.json()).id, 3);

  for (let i = 0; i < 100 && goals.length < 3; i += 1) await sleep(5);
  assert.deepEqual(goals, ['A viewer asks: <b>hut</b>', 'A viewer asks: build a hut', 'A viewer asks: dig down']);
  assert.ok(bodies.has('house'), 'the queue drives the house bot');
  const page = await text(`${url}/ask`);
  assert.ok(page.includes('#1 &lt;b&gt;hut&lt;/b&gt; - done: goal, 1 steps') && !page.includes('<b>hut'));

  clock += 3_600_001;
  assert.equal((await post(`${url}/ask`, { text: 'again', adult: 'yes' }, ip('1.1.1.1'))).status, 303, 'the hour rolls over');
});

test('/ask: closed without a brain or when the hourly budget is spent', async (t) => {
  const { url } = await serve(t);
  assert.match(await text(`${url}/`), /The Ask queue is closed right now|Ask queue is closed/);
  assert.equal((await post(`${url}/ask`, { text: 'hi', adult: 'yes' })).status, 503);
  const spent = await serve(t, { makeBrain: () => ({}), meter: { exceeded: () => true } });
  const r = await call(`${spent.url}/ask`, 'POST', { text: 'hi', adult: true });
  assert.equal(r.status, 503);
  assert.match((await r.json()).error, /budget/);
});

test('leases and slots: the lease ends on time, the slot frees, old links explain themselves', async (t) => {
  let clock = 5_000_000;
  const { url, bodies, web } = await serve(t, { now: () => clock, sessionsPerHour: 3, sessionsPerAddress: 5, sessionCooldownMs: 0 });
  const a = await guest(url);
  const b = await guest(url);
  let r = await post(`${url}/session`, { adult: 'yes' });
  assert.equal(r.status, 503, 'both bots are in use');
  assert.match(await r.text(), /All 2 bots are in use; the next one frees up in about 10 min\./);
  assert.equal(r.headers.get('retry-after'), '600');

  clock += 600_000;
  web.sweep();
  r = await fetch(a.page);
  assert.equal(r.status, 410);
  const gone = await r.text();
  assert.match(gone, /This session has ended/);
  assert.match(gone, /<p role="alert">Reason: the lease ended\.<\/p>/);
  assert.match(gone, /href="\/">Start a new session/);
  await sleep(5);
  const [bodyA, bodyB] = [...bodies.values()];
  assert.equal(bodyA.closed, true, 'the expired bot is closed');
  assert.equal(bodyB.closed, true, 'b was created at the same time, so it expired too');

  const c = await guest(url);
  assert.equal((await post(`${c.page}/end`, {})).status, 303);
  assert.match(await text(c.page), /Reason: ended by the guest\./);
  assert.equal((await post(`${url}/session`, { adult: 'yes' })).status, 429, 'three starts per hour from one address');
  assert.equal((await post(`${b.page}/collect`, { block: 'oak_log', n: '1' })).status, 410);
});

test('one bot per address: a second session waits for the first, then for a short cooldown', async (t) => {
  let clock = 7_000_000;
  const { url, web } = await serve(t, { now: () => clock, trustProxy: 1, sessionCooldownMs: 60_000, env: { WEB_MAX_SESSIONS: '4' } });
  const from = (a) => ({ 'x-forwarded-for': a });
  const a = await guest(url, from('192.0.2.10'));
  let r = await post(`${url}/session`, { adult: 'yes' }, from('192.0.2.10'));
  assert.equal(r.status, 429);
  assert.match(await r.text(), /already has a bot/);
  // an IPv6 visitor cannot rotate through its /64 to take every slot
  assert.equal((await post(`${url}/session`, { adult: 'yes' }, from('2001:db8:1:2::1'))).status, 303);
  assert.equal((await post(`${url}/session`, { adult: 'yes' }, from('2001:db8:1:2:ffff::9'))).status, 429);
  assert.equal((await post(`${url}/session`, { adult: 'yes' }, from('::ffff:192.0.2.10'))).status, 429, 'IPv4-mapped is the same address');

  assert.equal((await post(`${a.page}/end`, {}, from('192.0.2.10'))).status, 303);
  r = await post(`${url}/session`, { adult: 'yes' }, from('192.0.2.10'));
  assert.equal(r.status, 429, 'ending early and starting again does not reset the lease at once');
  assert.match(await r.text(), /try again in about 1 min/);
  clock += 60_001;
  web.sweep();
  assert.equal((await post(`${url}/session`, { adult: 'yes' }, from('192.0.2.10'))).status, 303);
});

test('client address: proxy headers count only when trusted; IPv6 by /64', async (t) => {
  assert.equal(addressKey('203.0.113.7'), '203.0.113.7');
  assert.equal(addressKey('::ffff:203.0.113.7'), '203.0.113.7');
  assert.equal(addressKey('2001:db8:1:2::1'), '2001:db8:1:2::/64');
  assert.equal(addressKey('2001:0db8:0001:0002:aaaa:bbbb:cccc:dddd'), '2001:db8:1:2::/64');
  assert.equal(addressKey('2001:db8::5'), '2001:db8:0:0::/64');
  assert.equal(addressKey('[fe80::1%en0]'), 'fe80:0:0:0::/64');

  // default: X-Forwarded-For is ignored, every request counts under the socket address
  const plain = await serve(t, { makeBrain: () => ({ runUntil: () => new Promise(() => {}), stop() {} }) });
  assert.equal((await call(`${plain.url}/ask`, 'POST', { text: 'a', adult: true }, { 'x-forwarded-for': '1.1.1.1' })).status, 202);
  assert.equal((await call(`${plain.url}/ask`, 'POST', { text: 'b', adult: true }, { 'x-forwarded-for': '2.2.2.2' })).status, 429, 'a made-up header changes nothing');

  // cloudflare: CF-Connecting-IP, never X-Forwarded-For
  const cf = await serve(t, { trustProxy: 'cloudflare' });
  assert.equal((await post(`${cf.url}/session`, { adult: 'yes' }, { 'cf-connecting-ip': '198.51.100.1', 'x-forwarded-for': '9.9.9.9' })).status, 303);
  assert.equal((await post(`${cf.url}/session`, { adult: 'yes' }, { 'cf-connecting-ip': '198.51.100.1', 'x-forwarded-for': '8.8.8.8' })).status, 429);
});

test('cross-site requests are refused; links follow the public host behind a trusted proxy', async (t) => {
  const { url } = await serve(t, { makeBrain: () => ({ runUntil: () => new Promise(() => {}), stop() {} }) });
  for (const headers of [{ 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }, { origin: 'https://evil.example' }]) {
    assert.equal((await post(`${url}/session`, { adult: 'yes' }, headers)).status, 403, JSON.stringify(headers));
    assert.equal((await post(`${url}/ask`, { text: 'obey me', adult: 'yes' }, headers)).status, 403, JSON.stringify(headers));
    assert.equal((await call(`${url}/api/session`, 'POST', { adult: true }, headers)).status, 403);
  }
  // our own forms: same-origin, and Origin "null" because the pages send Referrer-Policy: no-referrer
  assert.equal((await post(`${url}/session`, { adult: 'yes' }, { 'sec-fetch-site': 'same-origin', origin: 'null' })).status, 303);
  // a server-side agent sends neither header
  const s = await call(`${url}/api/session`, 'POST', { adult: true }, { 'x-forwarded-for': '192.0.2.99' });
  assert.equal(s.status, 429, 'same socket address as the form above (proxy headers are not trusted here)');

  const behind = await serve(t, { trustProxy: 1, makeBrain: () => ({ runUntil: () => new Promise(() => {}), stop() {} }) });
  const fwd = { 'x-forwarded-host': 'play.example.org', 'x-forwarded-proto': 'https', 'x-forwarded-for': '192.0.2.1' };
  const spec = await (await fetch(`${behind.url}/openapi.json`, { headers: fwd })).json();
  assert.equal(spec.servers[0].url, 'https://play.example.org');
  assert.match(await (await fetch(`${behind.url}/`, { headers: fwd })).text(), /Open https:\/\/play\.example\.org\/ \./);
  const made = await (await call(`${behind.url}/api/session`, 'POST', { adult: true }, { ...fwd, origin: 'https://play.example.org', 'sec-fetch-site': 'same-origin' })).json();
  assert.match(made.playUrl, /^https:\/\/play\.example\.org\/play\//);
  const odd = await (await fetch(`${behind.url}/openapi.json`, { headers: { 'x-forwarded-host': 'evil"><x' } })).json();
  assert.equal(odd.servers[0].url, behind.url, 'a malformed host falls back to the listen address');
});

test('limits and oversight: size cap, stop button, public log without secrets, operator kill switch', async (t) => {
  const { url, bodies, log } = await serve(t, { bodyOpts: { runMs: { smelt: 5_000 } }, formWaitMs: 30 });
  assert.equal((await post(`${url}/session`, { adult: 'yes', pad: 'x'.repeat(3000) })).status, 413);
  assert.equal((await call(`${url}/ask`, 'POST', { text: 'x'.repeat(3000), adult: true })).status, 413);

  const { token, page } = await guest(url);
  const body = [...bodies.values()][0];
  const t0 = Date.now();
  assert.equal((await post(`${page}/smelt`, { item: 'raw_iron', n: '2' })).status, 303);
  assert.ok(Date.now() - t0 < 1_000, 'a form post does not wait for a long skill');
  let html = await text(page);
  assert.match(html, /Running: smelt item=raw_iron n=2/);
  assert.match(html, /http-equiv="refresh" content="15"/, 'refreshes only while busy, slowly enough to press Stop');
  assert.equal((await post(`${page}/stop`, {})).status, 303);
  html = await text(page);
  assert.match(html, /<p class="notice" role="alert">Stopped\.<\/p>/);
  assert.match(html, /smelt item=raw_iron n=2 -&gt; not done: stopped: the guest pressed stop/);
  assert.deepEqual(body.stops, ['the guest pressed stop']);

  assert.equal((await call(`${url}/admin/stop`, 'POST', {})).status, 401);
  assert.equal((await call(`${url}/admin/stop`, 'POST', {}, { authorization: 'Bearer nope' })).status, 401);
  const k = await call(`${url}/admin/stop`, 'POST', { end: true }, { authorization: `Bearer ${ADMIN}` });
  assert.equal(k.status, 200);
  assert.deepEqual(await k.json(), { stopped: 0, cleared: 0, ended: 1 });
  assert.equal((await fetch(page)).status, 410);

  log.event('note', { echo: `token ${token} and ${ADMIN}` });
  const r = await fetch(`${url}/log?n=200`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /application\/x-ndjson/);
  const raw = await r.text();
  assert.ok(!raw.includes(ADMIN), 'no admin token');
  const rows = raw.trim().split('\n').map((l) => JSON.parse(l));
  const kinds = rows.map((x) => x.kind);
  for (const kind of ['web_start', 'session_start', 'viewer_action', 'viewer_stop', 'admin_stop', 'session_end']) assert.ok(kinds.includes(kind), kind);
  assert.ok(!rows.slice(0, -1).some((x) => JSON.stringify(x).includes(token)), 'tokens never reach the log');
  assert.equal((await fetch(`${url}/log?n=1`)).headers.get('content-type'), 'application/x-ndjson; charset=utf-8');
});

test('accessibility check logic: a complete tree passes, gaps are named', () => {
  const tools = ['collect', 'say'];
  const full = [
    '- heading "Status"', '- status', '  - text: Ready for the next action.', '- link "Check again"', '- heading "Last result"',
    '- heading "Game state"', '- text: health: 20/20 food: 20/20 position: 0 64 0 inventory: empty', '- heading "Actions"',
    '- form "collect"', '  - combobox "block: block to mine"', '  - spinbutton "n: how many"', '  - button "Run collect"',
    '- form "say"', '  - textbox "text: the message"', '  - button "Run say"', '- button "Stop the current action"',
    '- heading "Recent actions (newest first)"', '- button "End my session"',
  ].join('\n');
  assert.match(a11y.checkTree(full, tools, ['health', 'inventory']).summary, /check passed: 2 skills/);
  const broken = full.replace('- button "Run say"', '- button').replace('- status', '- generic');
  const { problems } = a11y.checkTree(broken, tools, ['health', 'oxygen']);
  assert.deepEqual(problems, ['no button "Run say"', 'no status line (role=status)', '1 control(s) without an accessible name: - button', 'state text lacks: oxygen']);
  const nodes = [
    { nodeId: '1', role: { value: 'RootWebArea' }, name: { value: 'Page' }, childIds: ['2', '4'] },
    { nodeId: '2', parentId: '1', role: { value: 'button' }, name: { value: 'Run say' }, childIds: ['3'] },
    { nodeId: '3', parentId: '2', role: { value: 'StaticText' }, name: { value: 'Run say' } },
    { nodeId: '4', parentId: '1', role: { value: 'generic' }, name: { value: '' }, childIds: ['5'] },
    { nodeId: '5', parentId: '4', role: { value: 'StaticText' }, name: { value: 'see /play/abcdefghijkl' } },
  ];
  assert.equal(a11y.renderTree(nodes), '- RootWebArea "Page"\n  - button "Run say"\n  - text: see /play/abcdefghijkl');
  assert.equal(a11y.maskTokens('/play/abcdefghijkl'), '/play/abcd...');
});

test('accessibility tree through an installed Chrome, JavaScript off (skipped when there is no Chrome)', async (t) => {
  if (!a11y.findChrome(process.env)) { t.skip('no Chrome or Chromium found (set CHROME_PATH)'); return; }
  const { url, log } = await serve(t);
  const out = [];
  const err = [];
  const code = await a11y.main([`${url}/`, '--check'], { print: (l) => out.push(l), printErr: (l) => err.push(l), env: process.env });
  if (code === a11y.EXIT.MISSING) { t.skip(`Chrome could not run: ${err.join(' ')}`); return; }
  const text = out.join('\n');
  assert.equal(code, 0, `a11y check failed:\n${text}\n${err.join('\n')}`);
  for (const tool of TOOL_NAMES) assert.ok(text.includes(`button "Run ${tool}"`), `button for ${tool}`);
  assert.match(text, /button "Stop the current action"/);
  assert.match(text, /check passed: 10 skills/);
  assert.ok(!/\/play\/[A-Za-z0-9_-]{5,}/.test(text), 'session tokens are shortened');
  assert.ok(log.tail(200).some((r) => r.kind === 'session_end' && r.reason === 'ended by the guest'), 'it pressed "End my session" on the session it started');
});

/** The first python3 that imports Playwright: A11Y_PYTHON, then python3 on PATH, then the system one. */
function playwrightPython() {
  const tried = [];
  for (const py of [process.env.A11Y_PYTHON, 'python3', '/usr/bin/python3'].filter(Boolean)) {
    const r = spawnSync(py, ['-c', 'import playwright, sys; print(sys.version.split()[0])'], { encoding: 'utf8' });
    if (r.status === 0) return { py };
    const v = spawnSync(py, ['-c', 'import sys; print(sys.version.split()[0])'], { encoding: 'utf8' });
    tried.push(`${py} (${v.status === 0 ? `Python ${v.stdout.trim()}` : 'not found'})`);
  }
  return { tried };
}

test('accessibility tree through Python Playwright (skipped when it is not installed)', async (t) => {
  const { py, tried } = playwrightPython();
  if (!py) { t.skip(`no python3 with playwright: tried ${tried.join(', ')}; set A11Y_PYTHON`); return; }
  const { url } = await serve(t);
  const child = spawn(py, [path.join(ROOT, 'scripts', 'a11y_snapshot.py'), `${url}/`, '--check'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { err += d; });
  const timer = setTimeout(() => child.kill('SIGKILL'), 90_000);
  const code = await new Promise((resolve) => child.on('close', resolve));
  clearTimeout(timer);
  if (code === 3) { t.skip(`Playwright could not run: ${err.trim()}`); return; }
  assert.equal(code, 0, `a11y check failed:\n${out}\n${err}`);
  for (const tool of TOOL_NAMES) assert.ok(out.includes(`button "Run ${tool}"`), `button for ${tool}`);
  assert.match(out, /button "Stop the current action"/);
  assert.match(out, /check passed/i);
});

test('admin: five wrong tokens from one address lock it out for the hour', async (t) => {
  const { url } = await serve(t);
  for (let i = 0; i < 5; i += 1) assert.equal((await call(`${url}/admin/stop`, 'POST', {}, { authorization: `Bearer guess-${i}` })).status, 401);
  assert.equal((await call(`${url}/admin/stop`, 'POST', {}, { authorization: `Bearer ${ADMIN}` })).status, 429, 'even the right token, until the hour passes');
});

test('askAnswered: words or a Done report end a request; errors do not', () => {
  assert.equal(askAnswered({ tool: null, result: 'no tool call', text: 'I have 3 logs.' }), true);
  assert.equal(askAnswered({ tool: 'say', ok: true, args: { text: 'Done: built' } }), true);
  assert.equal(askAnswered({ tool: null, result: 'model call failed: HTTP 503', error: 'model' }), false);
  assert.equal(askAnswered({ tool: null, result: 'invalid call, nothing ran: unknown tool "x"', error: 'invalid' }), false);
  assert.equal(askAnswered({ tool: 'collect', ok: true, args: { block: 'oak_log', n: 1 } }), false);
  assert.equal(askAnswered(null), false);
});

test('live views through the proxy: open WebSockets and new views per address are capped; a reader that never reads is dropped', async (t) => {
  // a stand-in viewer: socket.io polling answers 'ok'; a WebSocket upgrade is accepted (and floods when asked to)
  const upstream = http.createServer((req, res) => res.end('ok'));
  upstream.on('upgrade', (req, sock) => {
    sock.on('error', () => {});
    sock.write('HTTP/1.1 101 Switching Protocols\r\nupgrade: websocket\r\nconnection: Upgrade\r\n\r\n');
    if (!req.url.includes('flood')) return;
    const chunk = Buffer.alloc(1 << 20, 1);
    let sent = 0;
    const pump = () => {
      while (!sock.destroyed && sent < 64 && (sent += 1, sock.write(chunk)));
      if (!sock.destroyed && sent < 64) sock.once('drain', pump);
    };
    pump();
  });
  await new Promise((r) => upstream.listen(0, '127.0.0.1', r));
  t.after(() => { upstream.closeAllConnections?.(); upstream.close(); });
  const { url, bodies } = await serve(t, { viewsPerHour: 8 });
  const { token } = await guest(url);
  const id = (await (await fetch(`${url}/api/${token}/state`)).json()).session.id;
  assert.equal((await fetch(`${url}/watch/${id}/`)).status, 404, 'no view until it listens');
  bodies.get(id).viewerPort = upstream.address().port;

  const { port } = new URL(url);
  const sockets = [];
  t.after(() => { for (const s of sockets) s.destroy(); });
  /** A WebSocket upgrade through the proxy: 101 (the socket) or the refusal's status. */
  const upgrade = (query) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: `/watch/${id}/socket.io/?EIO=4&transport=websocket${query}`, headers: { connection: 'Upgrade', upgrade: 'websocket' } });
    req.on('upgrade', (res, socket) => { sockets.push(socket); resolve({ status: 101, socket }); });
    req.on('response', (res) => { res.resume(); resolve({ status: res.statusCode }); });
    req.on('error', reject);
    req.end();
  });

  // a watcher that never reads while the view pushes MBs: dropped, its place freed
  const flood = await upgrade('&flood=1');
  assert.equal(flood.status, 101);
  flood.socket.pause();
  await sleep(500);
  const closed = new Promise((resolve) => flood.socket.on('close', resolve));
  flood.socket.on('error', () => {});
  flood.socket.resume(); // (a paused socket never learns that it was closed)
  await closed;
  assert.ok(flood.socket.bytesRead < 32 * (1 << 20), `dropped long before the 64 MB were through (${flood.socket.bytesRead})`);

  const open = [];
  for (let i = 0; i < 4; i++) open.push((await upgrade('')).status);
  assert.deepEqual(open, [101, 101, 101, 101]);
  const fifth = await upgrade('');
  assert.equal(fifth.status, 429, 'at most 4 open live views per address');
  sockets.at(-1).destroy();
  await sleep(50);
  assert.equal((await upgrade('')).status, 101, 'a closed one frees its place');

  // 6 new views so far; socket.io polling: a handshake (no sid) is a new view, a poll with its sid is not
  const poll = (q) => fetch(`${url}/watch/${id}/socket.io/?EIO=4&transport=polling${q}`).then((r) => r.status);
  assert.deepEqual([await poll(''), await poll(''), await poll(''), await poll('&sid=abc')], [200, 200, 429, 200]);
  for (const s of sockets) s.destroy();
});
