// test/switch.test.js - the tools of docs/SWITCH.md, run against stand-ins (a fake `docker` first on PATH, scratch
// folders; nothing leaves this machine): deploy/caddy-proxy-line.py changes one line of the shared Caddyfile and
// nothing else, and its undo keeps what other projects added meanwhile; deploy/recreate.sh checks that no bot is in
// use, never builds, and recreates a running stream or camera with the agent. The runbook uses only these.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PY = spawnSync('python3', ['-c', 'import sys; print(sys.executable)'], { encoding: 'utf8' }).stdout?.trim();

// The play blocks as they are on picasso (2026-10-08), with neighbours like poker's
const CADDYFILE = `{
\temail ops@example.org
}

play.picasso-lab.com {
\treverse_proxy 172.24.0.1:7850 {
\t\theader_up X-Forwarded-Proto {scheme}
\t\theader_up X-Real-IP {remote_host}
\t}
\tencode gzip
}

play-staging.picasso-lab.com {
\treverse_proxy 172.24.0.1:7851 {
\t\theader_up X-Forwarded-Proto {scheme}
\t\theader_up X-Real-IP {remote_host}
\t}
\theader X-Robots-Tag "noindex, nofollow"
\tencode gzip
}

poker.picasso-lab.com {
\treverse_proxy holdem-dealer:8787 {
\t\tstream_close_delay 5m
\t}
}
`;
const LINE = (name) => `\t\theader_up X-Muse-Proxy {file./etc/caddy/priv/${name}}\n`;
const STG = LINE('muse-staging-proxy-secret');
const PRD = LINE('muse-play-proxy-secret');
const withLine = (text, port, line) => text.replace(`\treverse_proxy 172.24.0.1:${port} {\n`, (h) => h + line);

// One stand-in for both tools: `docker exec <c> caddy validate|reload --config /etc/caddy/<f>` reads the scratch
// folder; `docker exec <c> node ...` says how many bots are in use ($FAKE_BOTS; unset: the exec fails); everything
// else (compose) is only logged, with the COMPOSE_PROFILES it got.
const FAKE_DOCKER = `#!/bin/sh
printf '%s\\n' "COMPOSE_PROFILES=\${COMPOSE_PROFILES-unset} docker $*" >> "$FAKE_LOG"
[ "$1" = exec ] || exit 0
shift; shift
case "$1" in
  node) [ -n "\${FAKE_BOTS:-}" ] || exit 1; echo "$FAKE_BOTS"; exit 0 ;;
  caddy)
    f="$FAKE_CADDY/\${4#/etc/caddy/}"
    if [ "$2" = validate ]; then
      [ -n "\${FAKE_EDIT:-}" ] && printf 'other.example {\\n\\trespond hi\\n}\\n' >> "$FAKE_CADDY/Caddyfile"
      if [ "\${FAKE_VALIDATE:-}" = fail ]; then echo 'Error: adapting config using caddyfile: broken' >&2; exit 1; fi
      echo '{"level":"info","msg":"using config from file"}' >&2; echo 'Valid configuration'; exit 0
    fi
    if [ "\${FAKE_RELOAD:-}" = fail ]; then echo 'Error: sending configuration to instance: refused' >&2; exit 1; fi
    cp "$f" "$FAKE_CADDY/loaded"; exit 0 ;;
esac
exit 0
`;

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-switch-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'docker'), FAKE_DOCKER, { mode: 0o755 });
  return { dir, bin, log: path.join(dir, 'docker.log') };
}
const calls = (log) => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : []);

function caddyDir() {
  const s = scratch();
  const d = path.join(s.dir, 'caddy-config');
  fs.mkdirSync(path.join(d, 'priv'), { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(d, 'Caddyfile'), CADDYFILE, { mode: 0o664 });
  fs.chmodSync(path.join(d, 'Caddyfile'), 0o664);
  for (const n of ['muse-staging-proxy-secret', 'muse-play-proxy-secret']) fs.writeFileSync(path.join(d, 'priv', n), 'f00d', { mode: 0o600 });
  const run = (args, env = {}) => {
    const r = spawnSync(PY, [path.join(ROOT, 'deploy/caddy-proxy-line.py'), ...args, '--dir', d], {
      encoding: 'utf8', timeout: 30_000,
      env: { PATH: `${s.bin}:/usr/bin:/bin`, HOME: s.dir, FAKE_LOG: s.log, FAKE_CADDY: d, ...env },
    });
    return { code: r.status, out: r.stdout, err: r.stderr };
  };
  const live = () => fs.readFileSync(path.join(d, 'Caddyfile'), 'utf8');
  const loaded = () => fs.readFileSync(path.join(d, 'loaded'), 'utf8');
  const files = () => fs.readdirSync(d).sort();
  return { ...s, d, run, live, loaded, files, done: () => fs.rmSync(s.dir, { recursive: true, force: true }) };
}

test('caddy-proxy-line: adds the one header line, validated, then reloaded; the old file is a record only', { skip: !PY && 'no python3' }, () => {
  const c = caddyDir();
  try {
    const r = c.run(['add', 'staging']);
    assert.equal(r.code, 0, r.err);
    assert.equal(c.live(), withLine(CADDYFILE, 7851, STG), 'exactly one line, right after the reverse_proxy line');
    assert.equal(c.loaded(), c.live(), 'the reload read the new file');
    assert.equal(fs.statSync(path.join(c.d, 'Caddyfile')).mode & 0o777, 0o664, 'the mode stays');
    assert.match(r.out, /^--- Caddyfile\n\+\+\+ Caddyfile\.new\n@@ -14,2 \+14,3 @@\n \treverse_proxy 172\.24\.0\.1:7851 \{\n\+\t\theader_up X-Muse-Proxy \{file\.\/etc\/caddy\/priv\/muse-staging-proxy-secret\}\n \t\theader_up X-Forwarded-Proto/);
    assert.match(r.out, /^Valid configuration$/m, 'the verdict line, not caddy\'s log lines');
    assert.match(r.out, /caddy: play-staging\.picasso-lab\.com sends X-Muse-Proxy; reloaded \(the file before: Caddyfile\.bak-\d{8}-\d{6}-add-staging, a record only/);
    const record = c.files().find((f) => f.startsWith('Caddyfile.bak-'));
    assert.equal(fs.readFileSync(path.join(c.d, record), 'utf8'), CADDYFILE);
    assert.ok(!c.files().includes('Caddyfile.new'));
    assert.deepEqual(calls(c.log).map((l) => l.replace(/^\S+ docker /, '')), [
      'exec fras-caddy-1 caddy validate --config /etc/caddy/Caddyfile.new --adapter caddyfile',
      'exec fras-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile',
    ]);

    const again = c.run(['add', 'staging']);
    assert.equal(again.code, 1);
    assert.match(again.err, /caddy: STOPPED, nothing changed: the play-staging\.picasso-lab\.com block already has an X-Muse-Proxy line/);
    assert.equal(c.live(), withLine(CADDYFILE, 7851, STG));
  } finally { c.done(); }
});

test('caddy-proxy-line: the undo removes only its own line; a block another project added meanwhile stays', { skip: !PY && 'no python3' }, () => {
  const c = caddyDir();
  try {
    assert.equal(c.run(['add', 'staging']).code, 0);
    assert.equal(c.run(['add', 'production']).code, 0);
    // another project's edit after step 3 (as poker.picasso-lab.com was added on 2026-10-08)
    const other = 'lab-new.picasso-lab.com {\n\treverse_proxy 172.24.0.1:9999\n}\n';
    fs.appendFileSync(path.join(c.d, 'Caddyfile'), other);
    const both = withLine(withLine(CADDYFILE, 7851, STG), 7850, PRD) + other;
    assert.equal(c.live(), both);

    const r = c.run(['remove', 'staging']);
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /^-\t\theader_up X-Muse-Proxy \{file\.\/etc\/caddy\/priv\/muse-staging-proxy-secret\}$/m);
    assert.match(r.out, /no longer sends X-Muse-Proxy; reloaded/);
    assert.equal(c.live(), withLine(CADDYFILE, 7850, PRD) + other, 'production keeps its line, the new block stays');
    assert.equal(c.run(['remove', 'production']).code, 0);
    assert.equal(c.live(), CADDYFILE + other);
    assert.equal(c.loaded(), CADDYFILE + other);

    const none = c.run(['remove', 'production']);
    assert.equal(none.code, 1);
    assert.match(none.err, /STOPPED, nothing changed: the play\.picasso-lab\.com block does not have exactly one `header_up X-Muse-Proxy/);
    assert.equal(c.live(), CADDYFILE + other);
  } finally { c.done(); }
});

test('caddy-proxy-line: stops with the live Caddyfile untouched: validate refused, a save meanwhile, no secret, an odd block', { skip: !PY && 'no python3' }, () => {
  const c = caddyDir();
  try {
    const bad = c.run(['add', 'staging'], { FAKE_VALIDATE: 'fail' });
    assert.equal(bad.code, 1);
    assert.match(bad.err, /broken[\s\S]*caddy: STOPPED, nothing changed: caddy validate refused Caddyfile\.new/);
    assert.equal(c.live(), CADDYFILE);
    assert.ok(!c.files().includes('Caddyfile.new'));
    assert.ok(!calls(c.log).some((l) => / reload /.test(l)), 'no reload');

    // another session saves the Caddyfile while ours is being validated: its edit stays, ours is not moved in
    const raced = c.run(['add', 'staging'], { FAKE_EDIT: '1' });
    assert.equal(raced.code, 1);
    assert.match(raced.err, /STOPPED, nothing changed: the Caddyfile changed while this ran/);
    assert.equal(c.live(), `${CADDYFILE}other.example {\n\trespond hi\n}\n`);
    assert.ok(!c.files().includes('Caddyfile.new'));
    assert.ok(!calls(c.log).some((l) => / reload /.test(l)));

    fs.writeFileSync(path.join(c.d, 'Caddyfile'), CADDYFILE);
    fs.writeFileSync(path.join(c.d, 'priv', 'muse-play-proxy-secret'), '');
    const empty = c.run(['add', 'production']);
    assert.equal(empty.code, 1);
    assert.match(empty.err, /muse-play-proxy-secret is missing or empty/);

    fs.writeFileSync(path.join(c.d, 'Caddyfile'), CADDYFILE.replace('172.24.0.1:7851 {', '172.24.0.1:7851 {\n\t\tflush_interval -1'));
    const odd = c.run(['add', 'staging']);
    assert.equal(odd.code, 0, 'a line inside the block after the head is fine');
    fs.writeFileSync(path.join(c.d, 'Caddyfile'), CADDYFILE.replace('play-staging.picasso-lab.com {\n\treverse_proxy', 'play-staging.picasso-lab.com {\n\tencode gzip\n\treverse_proxy'));
    const moved = c.run(['add', 'staging']);
    assert.equal(moved.code, 1);
    assert.match(moved.err, /does not start with `reverse_proxy 172\.24\.0\.1:7851 \{` exactly once/);

    for (const args of [[], ['add'], ['add', 'prod'], ['drop', 'staging']]) {
      const u = c.run(args);
      assert.equal(u.code, 1);
      assert.match(u.err, /^usage: caddy-proxy-line\.py add\|remove staging\|production/);
    }
  } finally { c.done(); }
});

test('caddy-proxy-line: a failed reload says so (exit 2): the validated file is in place, Caddy runs the old config', { skip: !PY && 'no python3' }, () => {
  const c = caddyDir();
  try {
    const r = c.run(['add', 'production'], { FAKE_RELOAD: 'fail' });
    assert.equal(r.code, 2);
    assert.equal(c.live(), withLine(CADDYFILE, 7850, PRD));
    assert.match(r.err, /the reload failed and Caddy still runs the old config; run `docker exec fras-caddy-1 caddy reload --config \/etc\/caddy\/Caddyfile --adapter caddyfile` again, or `caddy-proxy-line\.py remove production` to go back/);
  } finally { c.done(); }
});

function recreate(args, { envFiles = [], bots, now } = {}) {
  const s = scratch();
  const deploy = path.join(s.dir, 'deploy');
  fs.mkdirSync(deploy);
  fs.copyFileSync(path.join(ROOT, 'deploy/recreate.sh'), path.join(deploy, 'recreate.sh'));
  for (const f of ['compose.yaml', 'staging.compose.yaml', ...envFiles]) fs.writeFileSync(path.join(deploy, f), '');
  const env = { PATH: `${s.bin}:/usr/bin:/bin`, HOME: s.dir, FAKE_LOG: s.log };
  if (bots !== undefined) env.FAKE_BOTS = String(bots);
  if (now) env.MUSE_NOW = '1';
  const r = spawnSync('/bin/sh', [path.join(deploy, 'recreate.sh'), ...args], { cwd: s.dir, env, encoding: 'utf8', timeout: 30_000 });
  const out = { code: r.status, out: r.stdout, err: r.stderr, calls: calls(s.log) };
  fs.rmSync(s.dir, { recursive: true, force: true });
  return out;
}

test('recreate.sh: the agent with whatever lives in its namespace, never a build; staging by its own project', () => {
  const UP = 'docker compose up -d --no-build --no-deps --force-recreate';
  const cases = [
    [['production'], [], `COMPOSE_PROFILES= ${UP} agent`],
    [['production'], ['stream.env'], `COMPOSE_PROFILES=stream ${UP} agent stream`],
    [['production'], ['camera.env'], `COMPOSE_PROFILES=camera ${UP} agent camera`],
    [['production', 'all'], ['stream.env', 'camera.env'], `COMPOSE_PROFILES=stream,camera ${UP} paper agent stream camera`],
    [['staging'], ['stream.env'], `COMPOSE_PROFILES= docker compose -p muse-staging -f staging.compose.yaml up -d --no-build --no-deps --force-recreate agent`],
    [['staging'], ['camera.env'], `COMPOSE_PROFILES=camera docker compose -p muse-staging -f staging.compose.yaml up -d --no-build --no-deps --force-recreate agent camera`],
    [['staging', 'all'], ['camera.env'], `COMPOSE_PROFILES=camera docker compose -p muse-staging -f staging.compose.yaml up -d --no-build --no-deps --force-recreate paper agent camera`],
  ];
  for (const [args, envFiles, want] of cases) {
    const r = recreate(args, { envFiles, bots: 0 });
    assert.equal(r.code, 0, r.err);
    const container = args[0] === 'staging' ? 'muse-staging-agent-1' : 'muse-minecraft-agent-1';
    assert.match(r.calls[0], new RegExp(`docker exec ${container} node -e .*Bots in use`), 'the idle check asks the agent itself');
    assert.equal(r.calls[1], want);
    assert.match(r.calls[2], /docker compose .*ps --format/);
    assert.match(r.out, new RegExp(`recreate: ${args[0]} is idle \\(Bots in use: 0\\)`));
  }
});

test('recreate.sh: stops while a bot is in use (MUSE_NOW=1 goes on); an agent that does not answer does not stop it', () => {
  const busy = recreate(['production'], { bots: 2 });
  assert.equal(busy.code, 3);
  assert.match(busy.err, /recreate: STOPPED, nothing changed: 2 bot\(s\) in use on production/);
  assert.ok(!busy.calls.some((l) => /compose/.test(l)), 'nothing recreated');

  const now = recreate(['production'], { bots: 2, now: true });
  assert.equal(now.code, 0, now.err);
  assert.match(now.out, /2 bot\(s\) in use, going on \(MUSE_NOW=1\)/);
  assert.ok(now.calls.some((l) => /up -d --no-build --no-deps --force-recreate agent$/.test(l)));

  const down = recreate(['production'], {});
  assert.equal(down.code, 0, down.err);
  assert.match(down.out, /did not say how many bots are in use/);

  for (const bad of [[], ['prod'], ['production', 'paper']]) {
    const r = recreate(bad, { bots: 0 });
    assert.equal(r.code, 2);
    assert.deepEqual(r.calls, []);
  }
});

test('recreate.sh knows every service that lives in the agent\'s network namespace', () => {
  const text = fs.readFileSync(path.join(ROOT, 'deploy/compose.yaml'), 'utf8');
  const blocks = text.split(/^ {2}(?=[\w-]+:\s*$)/m).slice(1);
  const shared = blocks.filter((b) => /^ {4}network_mode: "service:agent"/m.test(b)).map((b) => b.split(':')[0]).sort();
  assert.deepEqual(shared, ['camera', 'stream']);
  const script = fs.readFileSync(path.join(ROOT, 'deploy/recreate.sh'), 'utf8');
  for (const name of shared) assert.match(script, new RegExp(`if \\[ -f "\\$here/${name}\\.env" \\]`));
  // staging's: its camera (2026-10-09: a bare agent recreate on staging left the camera in the old namespace)
  const staging = fs.readFileSync(path.join(ROOT, 'deploy/staging.compose.yaml'), 'utf8').split(/^ {2}(?=[\w-]+:\s*$)/m).slice(1)
    .filter((b) => /^ {4}network_mode: "service:agent"/m.test(b)).map((b) => b.split(':')[0]);
  assert.deepEqual(staging, ['camera']);
  assert.match(script.slice(script.indexOf('staging)')), /if \[ -f "\$here\/camera\.env" \]; then profiles=camera/);
});

test('docs/SWITCH.md: the agent only through recreate.sh, Caddy only through caddy-proxy-line.py, no restores of shared files', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'docs/SWITCH.md'), 'utf8');
  const commands = [...doc.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
  assert.doesNotMatch(commands, /docker compose[^\n]*up\b/, 'no bare compose up in a command block');
  assert.doesNotMatch(commands, /Caddyfile\.bak/, 'never a copy of an older Caddyfile');
  assert.doesNotMatch(commands, /caddy (validate|reload)/, 'Caddy only through the script');
  assert.doesNotMatch(commands, /data\/[^\s]*\.bak|> *data\//, 'nothing written into Paper\'s root-owned data folder');
  assert.doesNotMatch(doc, /<T>/, 'no backup named by a placeholder the reader has to guess');
  assert.match(commands, /caddy-proxy-line\.py add staging[\s\S]*caddy-proxy-line\.py remove staging[\s\S]*caddy-proxy-line\.py add production[\s\S]*caddy-proxy-line\.py remove production/);
  assert.equal((commands.match(/recreate\.sh (production|staging)/g) ?? []).length, 10, '3a, its undo, 3b, its undo, the switch, the undo of step 2, the rollback, the undo of the 0011 update (section 7), the M4 world and its undo (section 8)');
});
