// scripts/a11y-chrome.mjs - the /play accessibility check without Playwright: it drives a Chrome or Chromium that is
// already installed (headless, JavaScript off, a throwaway profile) over the DevTools protocol, reads the browser's own
// accessibility tree and runs the same check as scripts/a11y_snapshot.py. From the site root it starts a session the
// way an agent would (ticks "I am 18 or older" and presses "Start a ... session", both found in the tree) and presses
// "End my session" afterwards. Nothing is installed or downloaded; session tokens are shortened in the output.
//
//   node scripts/a11y-chrome.mjs http://127.0.0.1:8787/ --check
//   node scripts/a11y-chrome.mjs http://127.0.0.1:8787/play/<token>
//   CHROME_PATH=/path/to/chrome node scripts/a11y-chrome.mjs URL --check --fields health,food,position,inventory
//
// Exit codes: 0 ok, 1 the check failed or the page could not be loaded, 2 bad arguments, 3 no Chrome found or it
// could not start (nothing was checked).

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

export const EXIT = Object.freeze({ OK: 0, FAIL: 1, USAGE: 2, MISSING: 3 });
const DEFAULT_FIELDS = 'health,food,position,inventory';
const CONTROL_ROLES = ['textbox', 'spinbutton', 'combobox', 'checkbox', 'radio', 'slider', 'searchbox', 'button'];
const HEADINGS = ['Status', 'Last result', 'Game state', 'Actions', 'Recent actions (newest first)'];
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
// roles that only wrap their children: left out of the printed tree when they carry no name
const WRAPPERS = new Set(['generic', 'none', 'presentation', 'RootWebArea', 'LineBreak', 'InlineTextBox', 'LabelText', 'paragraph']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** CHROME_PATH, or the first installed Chrome or Chromium in the usual places; null when there is none. */
export function findChrome(env = process.env) {
  const list = env.CHROME_PATH ? [env.CHROME_PATH] : CHROME_PATHS;
  return list.find((p) => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } }) ?? null;
}

/** Shorten every /play/<token> to its first four characters: the token is the session's key. */
export const maskTokens = (text) => String(text).replace(/(\/play\/[A-Za-z0-9_-]{4})[A-Za-z0-9_-]+/g, '$1...');

/**
 * Chrome's accessibility nodes (Accessibility.getFullAXTree) as an indented outline: `- role "name"`, `- text: ...`
 * for text; ignored nodes, unnamed wrappers and text that only repeats its parent's name are folded away.
 */
export function renderTree(nodes) {
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const root = nodes.find((n) => !n.parentId || !byId.has(n.parentId)) ?? nodes[0];
  const lines = [];
  const walk = (node, depth, parentName) => {
    if (!node) return;
    const role = node.role?.value ?? '';
    const name = String(node.name?.value ?? '').replace(/\s+/g, ' ').trim();
    let next = depth;
    let named = parentName;
    if (!node.ignored && role !== 'InlineTextBox') {
      if (role === 'StaticText') { if (name && name !== parentName) lines.push(`${'  '.repeat(depth)}- text: ${name}`); return; }
      if (!(WRAPPERS.has(role) && !name)) {
        lines.push(`${'  '.repeat(depth)}- ${role}${name ? ` "${name}"` : ''}`);
        next = depth + 1;
        named = name;
      }
    }
    for (const id of node.childIds ?? []) walk(byId.get(id), next, named);
  };
  walk(root, 0, '');
  return lines.join('\n');
}

/** The visible text inside the first node of a role (e.g. the status line), or ''. */
export function textUnder(nodes, role) {
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const start = nodes.find((n) => !n.ignored && n.role?.value === role);
  if (!start) return '';
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (n.role?.value === 'StaticText' && n.name?.value) out.push(n.name.value);
    for (const id of n.childIds ?? []) walk(byId.get(id));
  };
  walk(start);
  return out.join(' ');
}

const hasNode = (tree, role, name) => new RegExp(`^\\s*- ${esc(role)} "${esc(name)}"`, 'm').test(tree);

/**
 * What an agent needs, asserted on a rendered tree (the checks of a11y_snapshot.py): every skill as a named form with
 * a "Run <skill>" button, stop and end buttons, "Check again", the section headings, a status line, no unnamed
 * control, and each state field in the text. -> {summary} or {problems: string[]}
 */
export function checkTree(tree, tools, fields) {
  const problems = [];
  for (const tool of tools) {
    if (!hasNode(tree, 'form', tool)) problems.push(`no form named "${tool}"`);
    if (!hasNode(tree, 'button', `Run ${tool}`)) problems.push(`no button "Run ${tool}"`);
  }
  for (const name of ['Stop the current action', 'End my session']) if (!hasNode(tree, 'button', name)) problems.push(`no button "${name}"`);
  if (!hasNode(tree, 'link', 'Check again')) problems.push('no link "Check again" (the page does not reload while idle)');
  for (const name of HEADINGS) if (!hasNode(tree, 'heading', name)) problems.push(`no heading "${name}"`);
  if (!/^\s*- status\b/m.test(tree)) problems.push('no status line (role=status)');
  const unnamed = tree.match(new RegExp(`^\\s*- (?:${CONTROL_ROLES.join('|')})$`, 'gm')) ?? [];
  if (unnamed.length) problems.push(`${unnamed.length} control(s) without an accessible name: ${unnamed.slice(0, 5).map((u) => u.trim()).join(', ')}`);
  const lower = tree.toLowerCase();
  const missing = fields.filter((f) => !lower.includes(f.toLowerCase()));
  if (missing.length) problems.push(`state text lacks: ${missing.join(', ')}`);
  if (problems.length) return { problems };
  const controls = (tree.match(new RegExp(`^\\s*- (?:${CONTROL_ROLES.join('|')}) "`, 'gm')) ?? []).length;
  return { summary: `check passed: ${tools.length} skills as named forms with Run buttons, ${controls} named controls, stop and end buttons, state fields ${fields.join(', ')}` };
}

/** The skill names from /openapi.json (operations tagged 'tools'). */
export async function fetchTools(root, timeoutMs) {
  const res = await fetch(`${root}/openapi.json`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`could not read ${root}/openapi.json: HTTP ${res.status}`);
  const spec = await res.json();
  const tools = Object.values(spec.paths ?? {}).flatMap((item) => Object.values(item))
    .filter((op) => op && typeof op === 'object' && op.tags?.includes('tools') && op.operationId).map((op) => op.operationId);
  if (!tools.length) throw new Error('openapi.json lists no operations tagged \'tools\'');
  return tools;
}

/** Start headless Chrome on a throwaway profile; resolves once its DevTools endpoint is up. */
async function launch(exe, timeoutMs) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-chrome-'));
  const child = spawn(exe, [
    '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-default-apps', '--use-mock-keychain', '--password-store=basic', '--mute-audio', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const close = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      await Promise.race([new Promise((r) => child.once('exit', r)), sleep(3_000)]);
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  };
  try {
    const port = await new Promise((resolve, reject) => {
      let err = '';
      const timer = setTimeout(() => reject(new Error(`Chrome did not open DevTools within ${timeoutMs / 1000} s`)), timeoutMs);
      child.once('error', (e) => { clearTimeout(timer); reject(e); });
      child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Chrome exited (${code}): ${err.trim().slice(-300)}`)); });
      child.stderr.on('data', (d) => {
        err += d;
        const m = err.match(/DevTools listening on ws:\/\/[^:/]+:(\d+)\//);
        if (m) { clearTimeout(timer); resolve(Number(m[1])); }
      });
    });
    child.stderr.resume();
    return { port, close };
  } catch (e) {
    await close();
    throw e;
  }
}

/** A DevTools-protocol connection to one page target. */
async function connect(port, timeoutMs) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(timeoutMs) })).json();
  const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!page) throw new Error('Chrome has no page to drive');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('could not connect to Chrome DevTools')); });
  let next = 0;
  const pending = new Map();
  const waiters = new Set();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`)); else resolve(msg.result);
    } else if (msg.method) for (const w of waiters) if (w.method === msg.method) w.fire(msg.params);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next;
    const timer = setTimeout(() => { if (pending.delete(id)) reject(new Error(`${method} timed out`)); }, timeoutMs);
    const done = (fn) => (v) => { clearTimeout(timer); fn(v); };
    pending.set(id, { resolve: done(resolve), reject: done(reject) });
    ws.send(JSON.stringify({ id, method, params }));
  });
  /** Resolves on the next event of this name (register before the action that causes it). */
  const once = (method) => {
    let w;
    const p = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { waiters.delete(w); reject(new Error(`no ${method} within ${timeoutMs / 1000} s`)); }, timeoutMs);
      w = { method, fire: (params) => { clearTimeout(timer); waiters.delete(w); resolve(params); } };
      waiters.add(w);
    });
    return p;
  };
  return { send, once, close: () => ws.close() };
}

/** Page actions an agent takes, by role and accessible name from the tree. */
function pageOps(cdp) {
  const tree = async () => (await cdp.send('Accessibility.getFullAXTree')).nodes;
  const url = async () => { const h = await cdp.send('Page.getNavigationHistory'); return h.entries[h.currentIndex]?.url ?? ''; };
  const load = async (action) => { const loaded = cdp.once('Page.loadEventFired'); await action(); await loaded; };
  const goto = (u) => load(async () => {
    const r = await cdp.send('Page.navigate', { url: u });
    if (r.errorText) throw new Error(`could not load ${maskTokens(u)}: ${r.errorText}`);
  });
  const find = async (role, name) => {
    const node = (await tree()).find((n) => !n.ignored && n.role?.value === role && (name instanceof RegExp ? name.test(n.name?.value ?? '') : n.name?.value === name));
    if (!node?.backendDOMNodeId) throw new Error(`no ${role} "${name}" in the tree`);
    return node.backendDOMNodeId;
  };
  const click = async (role, name) => {
    const backendNodeId = await find(role, name);
    await cdp.send('DOM.scrollIntoViewIfNeeded', { backendNodeId });
    const { quads } = await cdp.send('DOM.getContentQuads', { backendNodeId });
    if (!quads?.length) throw new Error(`${role} "${name}" is not on screen`);
    const q = quads[0];
    const x = (q[0] + q[2] + q[4] + q[6]) / 4;
    const y = (q[1] + q[3] + q[5] + q[7]) / 4;
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  return { tree, url, load, goto, find, click, reload: () => load(() => cdp.send('Page.reload')) };
}

/** Load the page; from the site root, start a session like an agent would. -> {playUrl, started, nodes} */
async function openPlayPage(ops, startUrl, timeoutMs) {
  await ops.goto(startUrl);
  let started = false;
  if (!new URL(await ops.url()).pathname.includes('/play/')) {
    started = true;
    await ops.click('checkbox', 'I am 18 or older');
    const box = (await ops.tree()).find((n) => n.role?.value === 'checkbox' && n.name?.value === 'I am 18 or older');
    if (!box?.properties?.some((p) => p.name === 'checked' && String(p.value?.value) === 'true')) throw new Error('the 18+ box did not tick');
    await ops.load(() => ops.click('button', /^Start a /));
    if (!/\/play\/[A-Za-z0-9_-]+$/.test(new URL(await ops.url()).pathname)) throw new Error(`"Start" led to ${maskTokens(await ops.url())}, not a /play page`);
  }
  // the bot joins in the background; reload ("Check again") until the status line says it is in the world
  let nodes = await ops.tree();
  for (let t0 = Date.now(); /joining the world/.test(textUnder(nodes, 'status')) && Date.now() - t0 < timeoutMs;) {
    await sleep(250);
    await ops.reload();
    nodes = await ops.tree();
  }
  return { playUrl: await ops.url(), started, nodes };
}

/**
 * The CLI. Returns an exit code.
 * @param {string[]} argv
 * @param {{print?: Function, printErr?: Function, env?: object}} [io]
 */
export async function main(argv = process.argv.slice(2), io = {}) {
  const print = io.print ?? console.log;
  const printErr = io.printErr ?? console.error;
  let values;
  let url;
  try {
    const parsed = parseArgs({
      args: argv, allowPositionals: true, strict: true,
      options: { check: { type: 'boolean' }, fields: { type: 'string' }, timeout: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
    });
    values = parsed.values;
    if (values.help) { print('usage: node scripts/a11y-chrome.mjs URL [--check] [--fields a,b,c] [--timeout seconds]   (CHROME_PATH picks the browser)'); return EXIT.OK; }
    if (parsed.positionals.length !== 1) throw new Error('give exactly one URL');
    url = new URL(parsed.positionals[0]);
    if (!/^https?:$/.test(url.protocol)) throw new Error(`not an http(s) URL: ${url}`);
  } catch (err) {
    printErr(`a11y-chrome: ${err.message}`);
    return EXIT.USAGE;
  }
  const timeoutMs = Math.max(1, Number(values.timeout ?? 20)) * 1000;
  const fields = String(values.fields ?? DEFAULT_FIELDS).split(',').map((f) => f.trim()).filter(Boolean);
  const exe = findChrome(io.env ?? process.env);
  if (!exe) { printErr('a11y-chrome: no Chrome or Chromium found (set CHROME_PATH). Nothing was checked.'); return EXIT.MISSING; }

  let tools = [];
  if (values.check) {
    try { tools = await fetchTools(url.origin, timeoutMs); } catch (err) { printErr(`a11y-chrome: ${err.message}`); return EXIT.FAIL; }
  }
  let chrome;
  try { chrome = await launch(exe, timeoutMs); } catch (err) {
    printErr(`a11y-chrome: Chrome could not start: ${err.message}. Nothing was checked.`);
    return EXIT.MISSING;
  }
  let cdp = null;
  try {
    cdp = await connect(chrome.port, timeoutMs);
    for (const m of ['Page.enable', 'DOM.enable', 'Accessibility.enable']) await cdp.send(m);
    await cdp.send('Emulation.setScriptExecutionDisabled', { value: true }); // like the agent's browser
    const ops = pageOps(cdp);
    const { playUrl, started, nodes } = await openPlayPage(ops, url.href, timeoutMs);
    const tree = renderTree(nodes);
    if (started) {
      try { await ops.load(() => ops.click('button', 'End my session')); } catch (err) { printErr(`a11y-chrome: could not end the session: ${err.message}`); }
    }
    print(`# accessibility tree of ${maskTokens(playUrl)} (Chrome, JavaScript off)`);
    print(maskTokens(tree));
    if (!values.check) return EXIT.OK;
    const { summary, problems } = checkTree(tree, tools, fields);
    if (problems) { print(`# check FAILED:\n${problems.map((p) => `- ${p}`).join('\n')}`); return EXIT.FAIL; }
    print(`# ${summary}`);
    return EXIT.OK;
  } catch (err) {
    printErr(`a11y-chrome: ${maskTokens(err.message)}`);
    return EXIT.FAIL;
  } finally {
    cdp?.close();
    await chrome.close();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) process.exitCode = await main();
