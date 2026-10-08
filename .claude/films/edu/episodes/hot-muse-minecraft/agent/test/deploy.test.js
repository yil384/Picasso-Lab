// test/deploy.test.js - staging (ROADMAP M0 item 9): deploy/staging.compose.yaml keeps production's settings but shares
// nothing with it; deploy/push.sh goes to staging by default and to production only with --prod after the staging
// checks passed, with production's commands unchanged (run with stand-ins for ssh, rsync and node: nothing leaves
// this machine); scripts/staging-check.mjs reads replies right and plays its route through a real /mcp endpoint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { createWeb } from '../src/web.js';
import {
  runCheck, pickaxeSteps, inventoryOf, woodNear, stepLines, finishedLines, STAGING_URL,
} from '../scripts/staging-check.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/** The services of a compose file as {name: {text, env, ports, volumes, profiles}} (this repo's layout only). */
function services(file) {
  const lines = read(file).split('\n');
  const start = lines.indexOf('services:');
  assert.ok(start >= 0, `${file} has a services: section`);
  const out = {};
  let cur = null;
  for (let i = start + 1; i < lines.length && !/^\S/.test(lines[i]); i++) {
    const head = /^ {2}([\w-]+):\s*$/.exec(lines[i]);
    if (head) { cur = out[head[1]] = { lines: [] }; continue; }
    if (cur) cur.lines.push(lines[i]);
  }
  for (const s of Object.values(out)) {
    s.text = s.lines.join('\n');
    s.env = {};
    const at = s.lines.findIndex((l) => /^ {4}environment:/.test(l));
    if (at >= 0) {
      const inline = /^ {4}environment:\s*\{(.*)\}\s*$/.exec(s.lines[at]);
      const pairs = inline ? inline[1].split(',') : s.lines.slice(at + 1).filter((l, k, a) => a.slice(0, k + 1).every((x) => /^ {6}\S/.test(x)));
      for (const p of pairs) {
        const m = /^\s*([A-Z_]+):\s*"?([^"]*?)"?\s*$/.exec(p);
        if (m) s.env[m[1]] = m[2];
      }
    }
    s.profiles = /^ {4}profiles:/m.test(s.text);
  }
  return out;
}

test('staging compose: production settings, its own project, port, hostname, network, world and logs', () => {
  const prod = services('deploy/compose.yaml');
  const stg = services('deploy/staging.compose.yaml');
  assert.match(read('deploy/compose.yaml'), /^name: muse-minecraft$/m);
  assert.match(read('deploy/staging.compose.yaml'), /^name: muse-staging$/m);
  // every service production always runs (not the stream / camera profiles) runs on staging too
  assert.deepEqual(Object.keys(stg).sort(), Object.keys(prod).filter((k) => !prod[k].profiles).sort());

  assert.deepEqual(stg.paper.env, prod.paper.env, 'Paper: the same difficulty, daylight, seed and memory');
  assert.equal(stg.paper.env.SEED, '71811045');
  const { MC_HOST: ph, WEB_PUBLIC_URL: pu, ...prodAgent } = prod.agent.env;
  const { MC_HOST: sh, WEB_PUBLIC_URL: su, ...stgAgent } = stg.agent.env;
  assert.deepEqual(stgAgent, prodAgent, 'the agent: the same settings apart from its Paper and its public URL');
  assert.equal(pu, 'https://play.picasso-lab.com');
  assert.equal(su, STAGING_URL);
  assert.notEqual(sh, ph);
  assert.match(stg.paper.text, new RegExp(`ipv4_address: ${sh.replace(/\./g, '\\.')} `), 'MC_HOST is staging\'s own Paper');

  assert.match(prod.agent.text, /"172\.24\.0\.1:7850:8787"/);
  assert.match(stg.agent.text, /ports: \[ "172\.24\.0\.1:7851:8787" \]/);
  const subnet = (f) => /subnet: (10\.\d+\.\d+\.0\/28)/.exec(read(f))[1];
  assert.equal(subnet('deploy/staging.compose.yaml'), '10.77.79.0/28');
  assert.ok(sh.startsWith('10.77.79.'));
  for (const other of ['deploy/compose.yaml', 'deploy/camera-test.compose.yaml']) assert.notEqual(subnet(other), '10.77.79.0/28');
  // world and logs in ~/workspace/muse-staging/{data,logs}, never production's app/{data,logs}
  assert.match(stg.paper.text, /"\.\.\/\.\.\/data:\/data"/);
  assert.match(stg.agent.text, /"\.\.\/\.\.\/logs:\/logs"/);
  assert.doesNotMatch(read('deploy/staging.compose.yaml'), /"\.\.\/(data|logs):/);
});

// push.sh with stand-ins: ssh, rsync and node only write down how they were called. The run uses `zsh -f` (no startup
// files that could put the real tools first) and checks that the stand-ins are what the script will find.
const ZSH = ['/bin/zsh', '/usr/bin/zsh'].find((p) => fs.existsSync(p));

function push(args, { nodeExit = 0 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'push-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const calls = path.join(dir, 'calls.txt');
  for (const tool of ['ssh', 'rsync', 'node']) {
    fs.writeFileSync(path.join(bin, tool), `#!/bin/sh\nprintf '%s\\n' "[$PWD] ${tool} $*" >> '${calls}'\n${tool === 'node' ? `exit ${nodeExit}` : 'exit 0'}\n`, { mode: 0o755 });
  }
  const env = { PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: dir, ZDOTDIR: dir, LANG: 'C' };
  const found = spawnSync(ZSH, ['-f', '-c', 'whence -p ssh rsync node'], { env, encoding: 'utf8' }).stdout.trim().split('\n');
  assert.deepEqual(found, ['ssh', 'rsync', 'node'].map((t) => path.join(bin, t)), 'the stand-ins come first');
  const r = spawnSync(ZSH, ['-f', path.join(ROOT, 'deploy/push.sh'), ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 30_000 });
  const lines = fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8').trim().split('\n') : [];
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: r.stdout, err: r.stderr, calls: lines };
}

// production's commands exactly as push.sh ran them before staging existed
const AGENT = ROOT;
const PROD_CALLS = [
  `[${AGENT}] ssh picasso mkdir -p ~/workspace/muse-minecraft/{app,data,logs}`,
  `[${AGENT}] rsync -az --delete --exclude deploy/.env --exclude deploy/stream.env --exclude deploy/camera.env --relative src scripts deploy package.json package-lock.json README.md .dockerignore picasso:workspace/muse-minecraft/app/`,
  `[${AGENT}/server] rsync -azL paper.jar picasso:workspace/muse-minecraft/app/paper.jar`,
  `[${AGENT}/server] rsync -azL --delete --include *.jar --exclude * plugins/ picasso:workspace/muse-minecraft/app/plugins/`,
  `[${AGENT}] ssh picasso set -e; cd ~/workspace/muse-minecraft/app`,
];

test('push.sh: staging by default; production only with --prod and only after the staging checks pass', { skip: !ZSH && 'no zsh' }, () => {
  const stg = push([]);
  assert.equal(stg.code, 0, stg.err);
  const joined = stg.calls.join('\n');
  assert.match(joined, /ssh picasso mkdir -p ~\/workspace\/muse-staging\/\{app,data,logs\}/);
  assert.match(joined, /rsync -az --delete .*--exclude deploy\/compose\.yaml --exclude deploy\/camera-test\.compose\.yaml .* picasso:workspace\/muse-staging\/app\//);
  assert.match(joined, /docker compose -p muse-staging -f staging\.compose\.yaml up -d --build/);
  assert.match(joined, /^ {2}docker image prune -f --filter "label=org\.picasso-lab\.app=muse-minecraft" \| tail -1$/m, 'staging prunes our dangling images too');
  assert.doesNotMatch(joined, /docker (image|system) prune(?![^\n]*label=org\.picasso-lab\.app=muse-minecraft)/, 'never a prune without our label');
  assert.match(stg.calls.at(-1), /node \S+\/scripts\/staging-check\.mjs https:\/\/play-staging\.picasso-lab\.com$/, 'the checks run last');
  assert.doesNotMatch(joined, /workspace\/muse-minecraft/, 'a plain push never reaches production');

  const prod = push(['--prod']);
  assert.equal(prod.code, 0, prod.err);
  const check = prod.calls.findIndex((l) => /staging-check\.mjs/.test(l));
  assert.ok(check > 0);
  assert.ok(prod.calls.slice(0, check).every((l) => !/workspace\/muse-minecraft/.test(l)), 'staging comes first');
  // the production ssh command is multi-line: the recorded lines after the check are its calls plus its script lines
  const after = prod.calls.slice(check + 1);
  assert.deepEqual(after.slice(0, PROD_CALLS.length), PROD_CALLS);
  assert.match(after.join('\n'), /cd deploy && docker compose up -d --build 2>&1 \| tail -4 && docker compose ps --format "\{\{\.Service\}\}: \{\{\.Status\}\}"$/m);
  // after the build: our own dangling images only (ROADMAP M0 item 8), and a note while the trusted proxy is unset (item 6)
  assert.match(after.join('\n'), /^ {2}docker image prune -f --filter "label=org\.picasso-lab\.app=muse-minecraft" \| tail -1$/m);
  assert.match(after.at(-1), /grep -q "\^WEB_PROXY_SECRET=" \.env \|\| echo "note: deploy\/\.env has no WEB_PROXY_SECRET/);
  assert.match(after.join('\n'), /if \[ -f deploy\/stream\.env \]; then chmod 600 deploy\/stream\.env; P=stream; fi/);

  const failed = push(['--prod'], { nodeExit: 1 });
  assert.equal(failed.code, 1);
  assert.match(failed.err, /staging checks failed; production was not touched/);
  assert.ok(failed.calls.length > 0 && failed.calls.every((l) => !/workspace\/muse-minecraft/.test(l)), 'a failed check stops before production');

  const only = push(['--check']);
  assert.equal(only.code, 0, only.err);
  assert.equal(only.calls.length, 1);
  assert.match(only.calls[0], /node \S+\/scripts\/staging-check\.mjs https:\/\/play-staging\.picasso-lab\.com$/);

  const dry = push(['--prod', '--dry-run']);
  assert.equal(dry.code, 0, dry.err);
  assert.deepEqual(dry.calls, [], '--dry-run runs nothing');
  assert.match(dry.out, /staging-check\.mjs[\s\S]*workspace\/muse-minecraft/);

  for (const bad of [['--nope'], ['--prod', '--check']]) {
    const r = push(bad);
    assert.equal(r.code, 2);
    assert.deepEqual(r.calls, []);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// scripts/staging-check.mjs

const STATE = (inv, nearby = 'birch_log 12 (nearest 4.1 away at 3 70 1); oak_log 2 (nearest 2 away at 1 70 0); spruce_log 30+ (nearest 9 away at 8 71 2)') => [
  'health 20/20, food 20/20',
  'position 10 70 -4 in the overworld, facing north',
  `inventory: ${inv}`,
  `nearby blocks (within 32): ${nearby}`,
  'nearby mobs: none',
].join('\n');

test('staging-check: reads the state and the step lines of a reply', () => {
  assert.deepEqual(inventoryOf(STATE('empty')), {});
  assert.deepEqual(inventoryOf(`old\n${STATE('oak_log 3')}\n\nnewer:\n${STATE('stick 4, wooden_pickaxe 1')}`), { stick: 4, wooden_pickaxe: 1 }, 'the last state wins');
  assert.equal(woodNear(STATE('empty')), 'birch', 'the nearest kind with at least 3 logs');
  assert.equal(woodNear(STATE('empty', 'stone 40 (nearest 1 away at 0 69 0); oak_log 2 (nearest 2 away at 1 70 0)')), null);
  assert.equal(woodNear(STATE('empty', 'pale_oak_log 9 (nearest 2 away at 1 70 0)')), null, 'only logs collect accepts');
  assert.deepEqual(pickaxeSteps('birch').map((s) => `${s.skill} ${Object.values(s.args).join(' ')}`),
    ['collect birch_log 3', 'craft birch_planks 12', 'craft stick 4', 'craft crafting_table 1', 'craft wooden_pickaxe 1']);

  const seq = [
    'Finished since your last call:', 'collect {"block":"oak_log","n":3}: ok: mined 3 oak_log [+3 oak_log]', '',
    '1. craft {"item":"oak_planks","n":12}: ok: crafted 12 oak_planks [-3 oak_log, +12 oak_planks]',
    '2. craft {"item":"stick","n":4}: FAILED: not enough oak_planks',
    '3. craft: not run: no time was left in this call to start it; send it again',
    '4. collect {"block":"oak_log","n":3}: still running after 44 s (long walks and mining take a while); call get_state to wait for the result',
    'Not run: 5. craft {"item":"wooden_pickaxe","n":1}. Deal with the failure above first, then send the steps you still want.',
  ].join('\n');
  assert.deepEqual(stepLines(seq).map((l) => [l.n, l.skill, l.outcome]),
    [[1, 'craft', 'ok'], [2, 'craft', 'FAILED'], [3, 'craft', 'not run'], [4, 'collect', 'still running']]);
  assert.deepEqual(finishedLines(seq).map((l) => [l.skill, l.outcome]), [['collect', 'ok']]);
  assert.deepEqual(finishedLines('State (game g1):\nfoo'), []);
});

/** A body for createWeb: collect takes `collectMs`, crafts are instant and follow the recipes of the route. */
function routeBody({ collectMs = 0, failCraft = null } = {}) {
  const inv = {};
  const add = (k, n) => { inv[k] = (inv[k] ?? 0) + n; if (!inv[k]) delete inv[k]; };
  const recipes = {
    oak_planks: [4, { oak_log: 1 }], stick: [4, { oak_planks: 2 }], crafting_table: [1, { oak_planks: 4 }],
    wooden_pickaxe: [1, { oak_planks: 3, stick: 2 }],
  };
  let busy = false;
  return {
    ready: Promise.resolve(),
    get busy() { return busy; },
    state: () => STATE(Object.keys(inv).length ? Object.entries(inv).map(([k, v]) => `${k} ${v}`).join(', ') : 'empty', 'oak_log 20 (nearest 3 away at 1 70 2)'),
    snapshot: () => null,
    async run(tool, args) {
      busy = true;
      try {
        if (tool === 'collect') {
          await new Promise((r) => setTimeout(r, collectMs));
          add(args.block, args.n);
          return { ok: true, result: `mined ${args.n} ${args.block}`, delta: { [args.block]: args.n } };
        }
        if (tool === 'craft') {
          if (args.item === failCraft) return { ok: false, result: 'a zombie is attacking you', delta: {} };
          const [out, need] = recipes[args.item];
          const batches = Math.ceil(args.n / out);
          for (const [k, v] of Object.entries(need)) if ((inv[k] ?? 0) < v * batches) return { ok: false, result: `not enough ${k}`, delta: {} };
          for (const [k, v] of Object.entries(need)) add(k, -v * batches);
          add(args.item, out * batches);
          return { ok: true, result: `crafted ${out * batches} ${args.item}`, delta: { [args.item]: out * batches } };
        }
        return { ok: true, result: 'ok', delta: {} };
      } finally { busy = false; }
    },
    async stop() {},
    async close() {},
    on() { return () => {}; },
  };
}

async function serveRoute(t, body) {
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: '', MODEL_API_KEY: '' });
  const events = [];
  const log = { event: (type, d) => events.push({ type, ...d }), tail: () => [] };
  const web = createWeb({ config, log, makeBody: () => routeBody(body), mcpCallMs: 400 });
  const { url } = await web.start();
  t.after(() => web.stop());
  return { url, events };
}

test('staging-check: plays the route through /mcp, waits for a skill that outlives its call, ends the game', async (t) => {
  const { url, events } = await serveRoute(t, { collectMs: 900 });
  const out = [];
  const code = await runCheck({ base: url, minutes: 1, print: (l) => out.push(l) });
  assert.equal(code, 0, out.join('\n'));
  const text = out.join('\n');
  assert.match(text, /GET \/openapi\.json -> server http:\/\/127\.0\.0\.1:\d+/);
  assert.match(text, /1\. collect \{"block":"oak_log","n":3\}: still running/);
  assert.match(text, /1\. collect \{"block":"oak_log","n":3\}: ok: mined 3 oak_log/, 'its result came with a later reply');
  assert.match(text, /5\. craft \{"item":"wooden_pickaxe","n":1\}: ok/);
  assert.match(text, /PASS: wooden pickaxe in [\d.]+ s/);
  assert.match(text, /end_game -> game g\w+ ended/);
  assert.ok(events.some((e) => e.type === 'session_end'), 'the game was ended, so its bot left');
});

test('staging-check: strict; a failed step fails the check and the game still ends; production is refused', async (t) => {
  const { url, events } = await serveRoute(t, { failCraft: 'stick' });
  const out = [];
  assert.equal(await runCheck({ base: url, minutes: 1, print: (l) => out.push(l) }), 1);
  assert.match(out.join('\n'), /3\. craft \{"item":"stick","n":4\}: FAILED: a zombie is attacking you[\s\S]*FAIL: step 3 failed \(strict: no retries\)/);
  assert.ok(events.some((e) => e.type === 'session_end'));

  const refused = [];
  assert.equal(await runCheck({ base: 'https://play.picasso-lab.com/', print: (l) => refused.push(l) }), 2);
  assert.match(refused.join('\n'), /refused: play\.picasso-lab\.com is production/);
});
