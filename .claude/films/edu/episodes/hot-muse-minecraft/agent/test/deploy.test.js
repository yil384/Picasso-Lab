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

test('BODY=mineai: both images carry the Mine AI MCP runtime, run under an init and keep its bot data; .env picks the body', () => {
  const prod = services('deploy/compose.yaml');
  const stg = services('deploy/staging.compose.yaml');
  for (const [name, s] of [['production', prod], ['staging', stg]]) {
    assert.match(s.agent.text, /build: \{ context: \.\., dockerfile: deploy\/Dockerfile\.agent, args: \{ MINEAI: "1" \} \}/, `${name}: the runtime fetched and patched at build time`);
    assert.match(s.agent.text, /^ {4}init: true/m, `${name}: an init reaps what a host leaves behind`);
    // which body plays is deploy/.env's business on picasso, never the compose file's (the settings test compares them)
    for (const k of ['BODY', 'MINEAI_DIR', 'MINEAI_DATA_DIR']) assert.ok(!(k in s.agent.env), `${name}: ${k} comes from deploy/.env`);
    assert.match(s.agent.text, /^ {4}env_file: \[ \.env \]$/m);
  }
  // their per-bot SQLite outlives the container, next to each stack's world and logs (production: app/data, app/logs)
  assert.match(prod.agent.text, /volumes: \[ "\.\.\/logs:\/logs", "console:\/console", "\.\.\/mineai-data:\/mineai-data" \]/);
  assert.match(prod.paper.text, /"\.\.\/data:\/data"/);
  assert.match(stg.agent.text, /"\.\.\/\.\.\/mineai-data:\/mineai-data"/);
  // a deploy without a BODY line plays with our body: the default, and the runtime is never checked or started
  assert.equal(loadConfig({ LOG_DIR: '' }).body.kind, 'ours');
  assert.equal(loadConfig({ LOG_DIR: '', BODY: 'mineai', MINEAI_DIR: '/opt/mine-ai-mcp', MINEAI_DATA_DIR: '/mineai-data' }).mineai.dataDir, '/mineai-data');
  // every image copies mineai/ (the pin and our patches), so both deploys must send it; the fetch comes before src/
  const docker = read('deploy/Dockerfile.agent');
  assert.match(docker, /^COPY mineai \.\/mineai$/m);
  assert.ok(docker.indexOf('mineai/fetch-and-patch.sh') < docker.indexOf('COPY src '), 'a change to src/ reuses the runtime layer');
  assert.match(docker, /^ARG MINEAI=0$/m);
  assert.match(docker, /^ENV MINEAI_DIR=\/opt\/mine-ai-mcp MINEAI_RUNTIME=bun MINEAI_EXEC=\/usr\/local\/bin\/bun$/m);
  // the patches the image applies and the start check demands are UPSTREAM.json's, 0007 and 0008 (gate 3), 0009 (a
  // mob in the placement cell, the soak) and 0010 (a build that stalled the event loop) included; the build runs 0009's
  // tests with 0007's (nearby-placement) and 0010's (build-process)
  const up = JSON.parse(read('mineai/UPSTREAM.json'));
  assert.deepEqual(up.patches.map((p) => p.slice(8, 12)), ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010']);
  for (const p of up.patches) assert.ok(fs.existsSync(path.join(ROOT, 'mineai', p)), p);
  const fetch = read('mineai/fetch-and-patch.sh');
  for (const t of ['src/world/block-classification.test.ts', 'src/world/nearby-placement.test.ts', 'src/actions/collect-block', 'src/world/landing.test.ts', 'src/navigation/processes/building/build-process.test.ts']) {
    assert.ok(fetch.includes(t), `the build runs ${t}`);
  }
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

// production's commands as push.sh ran them before staging existed, plus mineai/ (its image copies the folder)
const AGENT = ROOT;
const PROD_CALLS = [
  `[${AGENT}] ssh picasso mkdir -p ~/workspace/muse-minecraft/{app,data,logs} ~/workspace/muse-minecraft/app/mineai-data && chmod 700 ~/workspace/muse-minecraft/app/mineai-data`,
  `[${AGENT}] rsync -az --delete --exclude deploy/.env --exclude deploy/stream.env --exclude deploy/camera.env --relative src scripts deploy mineai package.json package-lock.json README.md .dockerignore picasso:workspace/muse-minecraft/app/`,
  `[${AGENT}/server] rsync -azL paper.jar picasso:workspace/muse-minecraft/app/paper.jar`,
  `[${AGENT}/server] rsync -azL --delete --include *.jar --exclude * plugins/ picasso:workspace/muse-minecraft/app/plugins/`,
  `[${AGENT}] ssh picasso set -eo pipefail; cd ~/workspace/muse-minecraft/app`,
];

test('push.sh: staging by default; production only with --prod and only after the staging checks pass', { skip: !ZSH && 'no zsh' }, () => {
  const stg = push([]);
  assert.equal(stg.code, 0, stg.err);
  const joined = stg.calls.join('\n');
  assert.match(joined, /ssh picasso mkdir -p ~\/workspace\/muse-staging\/\{app,data,logs,mineai-data\} && chmod 700 ~\/workspace\/muse-staging\/mineai-data$/m, 'the bots\' data: this user only');
  assert.match(joined, /rsync -az --delete .*--exclude deploy\/compose\.yaml --exclude deploy\/camera-test\.compose\.yaml .*--relative src scripts deploy mineai .* picasso:workspace\/muse-staging\/app\//);
  assert.match(joined, /docker compose -p muse-staging -f staging\.compose\.yaml up -d --build/);
  // staging prunes our dangling images too; picasso's docker wrapper refuses prune to non-root users, and that must not
  // end the deploy before its checks (the remote script runs with set -eo pipefail): a note instead
  assert.match(joined, /^ {2}docker image prune -f --filter "label=org\.picasso-lab\.app=muse-minecraft" 2>&1 \| tail -1 \|\| echo "note: the prune was refused[^"]*\$\(docker images -q -f dangling=true -f label=org\.picasso-lab\.app=muse-minecraft \| wc -l\)[^"]*"$/m, 'staging prunes our dangling images too, and goes on when it may not');
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
  // after the build: our own dangling images only (ROADMAP M0 item 8), a note instead of a stop when picasso refuses the
  // prune (as on staging), the body deploy/.env picks, and a note while the proxy secret is unset (item 6)
  assert.match(after.join('\n'), /^ {2}docker image prune -f --filter "label=org\.picasso-lab\.app=muse-minecraft" 2>&1 \| tail -1 \|\| echo "note: the prune was refused[^"]*\$\(docker images -q -f dangling=true -f label=org\.picasso-lab\.app=muse-minecraft \| wc -l\)[^"]*"$/m);
  assert.match(after.join('\n'), /^ {2}B=\$\(sed -n "s\/\^BODY=\/\/p" \.env \| tail -1\); echo "production body: \$\{B:-ours\} /m, 'which body production plays, ours without a BODY line');
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
    'Finished since your last call:', 'From your play #1, sent 3 s ago:', 'collect {"block":"oak_log","n":3}: ok: mined 3 oak_log [+3 oak_log]',
    'From your play_sequence #2, sent 2 s ago:', '3 (part 2 of 2). craft_batch {"items":[]} (part 2 of 2: with the added items your list is longer than 12, so it runs in 2 parts): ok: crafted 1 chest', '',
    '1. craft {"item":"oak_planks","n":12}: ok: crafted 12 oak_planks [-3 oak_log, +12 oak_planks]',
    '2. craft {"item":"stick","n":4}: FAILED: not enough oak_planks',
    '3. craft: not run: no time was left in this call to start it; send it again',
    '4. collect {"block":"oak_log","n":3}: still running after 44 s (long walks and mining take a while); call get_state to wait for the result',
    '5 (part 1 of 2). craft_batch {"items":[{"item":"stick","n":4}]} (the check added to your list: 4 stick for ladder; part 1 of 2: with the added items your list is longer than 12, so it runs in 2 parts): queued',
    'Not run: 5. craft {"item":"wooden_pickaxe","n":1}. Deal with the failure above first, then send the steps you still want.',
  ].join('\n');
  assert.deepEqual(stepLines(seq).map((l) => [l.n, l.skill, l.outcome]),
    [[3, 'craft_batch', 'ok'], [1, 'craft', 'ok'], [2, 'craft', 'FAILED'], [3, 'craft', 'not run'], [4, 'collect', 'still running'], [5, 'craft_batch', 'queued']]);
  assert.deepEqual(finishedLines(seq).map((l) => [l.skill, l.outcome]), [['collect', 'ok'], ['craft_batch', 'ok']], 'call headers are not results');
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
  // the smoke check after a production deploy (docs/SWITCH.md) asks for production by name; it gets past that refusal
  // (to the next one here: no time to play in, so nothing is fetched)
  const asked = [];
  assert.equal(await runCheck({ base: 'https://play.picasso-lab.com/', production: true, minutes: 0, print: (l) => asked.push(l) }), 2);
  assert.doesNotMatch(asked.join('\n'), /is production/);
  assert.match(asked.join('\n'), /refused: minutes must be more than 0/);
});
