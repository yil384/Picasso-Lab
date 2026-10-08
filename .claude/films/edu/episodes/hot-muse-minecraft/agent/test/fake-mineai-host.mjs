// test/fake-mineai-host.mjs - stands in for their src/server/host.ts as a process (test/mineai.test.js, host
// manager): the same command-line flags, the token from MINEAI_HOST_TOKEN and the player name from MINEAI_USERNAME (our
// patches 0004 and 0005), and FAKE_MODE to misbehave: ok | crash (exits 1.5 s after it listens) | hang (stops
// answering /health 1.5 s after) | never (never ready) | disconnect (reports the bot disconnected 1.5 s after) | open
// (no token check: a runtime without patch 0004) | natural (ends on SIGTERM as theirs does: closes its server and never
// calls process.exit) | orphan (has a child of its own that ignores SIGTERM, as a runtime whose event loop is stuck,
// and exits at once on SIGTERM, leaving it behind). FAKE_STATE (a file) counts starts, so a restart can behave;
// FAKE_CHILD (a file) gets the orphan's pid.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { startFakeMineAi } from './fake-mineai.js';

const { values } = parseArgs({ strict: false, options: { 'listen-port': { type: 'string' }, 'listen-host': { type: 'string' }, username: { type: 'string' } } });
const stateFile = process.env.FAKE_STATE;
const starts = stateFile ? Number(fs.existsSync(stateFile) ? fs.readFileSync(stateFile, 'utf8') : 0) + 1 : 1;
if (stateFile) fs.writeFileSync(stateFile, String(starts));
// FAKE_MODE applies to the first FAKE_BAD_STARTS starts (default all); later starts behave
const bad = starts <= Number(process.env.FAKE_BAD_STARTS ?? 99);
const mode = bad ? process.env.FAKE_MODE ?? 'ok' : 'ok';

if (values['listen-host'] !== '127.0.0.1') { console.error('refusing: not loopback'); process.exit(3); }
if (mode === 'never') setInterval(() => {}, 1_000);
else {
  const username = process.env.MINEAI_USERNAME || values.username || 'MineAI';
  const fake = await startFakeMineAi({
    port: Number(values['listen-port']), token: mode === 'open' ? null : process.env.MINEAI_HOST_TOKEN || null, username,
    envKeys: Object.keys(process.env),
  });
  console.log(`[fake] listening on ${fake.port} (start ${starts}, ${mode})`);
  const after = Number(process.env.FAKE_AFTER_MS ?? 1_500); // long enough to be seen ready on a loaded machine
  if (mode === 'crash') setTimeout(() => process.exit(7), after);
  if (mode === 'disconnect') setTimeout(() => { fake.world.connected = false; }, after);
  if (mode === 'hang') setTimeout(() => { fake.close(); setInterval(() => {}, 1_000); }, after);
  if (mode === 'natural') process.once('SIGTERM', () => { fake.close(); });
  else if (mode === 'orphan') {
    const c = spawn(process.execPath, ['-e', "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"], { stdio: 'ignore' });
    if (process.env.FAKE_CHILD) fs.writeFileSync(process.env.FAKE_CHILD, String(c.pid));
    process.on('SIGTERM', () => process.exit(0));
  } else process.on('SIGTERM', () => { fake.close().then(() => process.exit(0)); });
}
