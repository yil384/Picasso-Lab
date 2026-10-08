#!/usr/bin/env node
// scripts/mineai-fetch.mjs - fetch the Mine AI MCP runtime for BODY=mineai into a folder outside this repo: clone the
// pinned upstream commit (mineai/UPSTREAM.json), apply our patches (mineai/patches, in order), install its
// dependencies with Bun (its lockfile; tsx comes with them for running it under Node), and write a stamp so a later run
// (or --check) can tell the folder is exactly that commit plus those patches. Their code never enters this repo.
//
//   node scripts/mineai-fetch.mjs <dir>                 clone or update <dir>, patch, install
//   node scripts/mineai-fetch.mjs <dir> --check         exit 0 only if <dir> is the pinned commit with our patches
//   options: --repo <url or path> (default: the pinned repo), --bun <path> (default: $BUN or bun), --no-install, --dry-run

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const UPSTREAM_FILE = path.join(ROOT, 'mineai', 'UPSTREAM.json');
const STAMP = '.muse-mineai.json';

/** The pin: {repo, commit, patches: [absolute paths]}. */
export function readUpstream(file = UPSTREAM_FILE) {
  const u = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!/^[0-9a-f]{40}$/.test(u.commit)) throw new Error(`${file}: commit must be a full 40-character sha`);
  return { ...u, patches: u.patches.map((p) => path.resolve(path.dirname(file), p)) };
}

/** What the stamp says for this pin and these patch files (their sha-256, so an edited patch is noticed). */
export function stampFor(up) {
  return {
    commit: up.commit,
    patches: up.patches.map((p) => ({ file: path.basename(p), sha256: crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') })),
  };
}

function run(cmd, args, { cwd, dry, print }) {
  print(`$ ${[cmd, ...args].join(' ')}${cwd ? `   (in ${cwd})` : ''}`);
  if (dry) return '';
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status}): ${(r.stderr || r.stdout).trim().slice(-600)}`);
  return r.stdout.trim();
}

/** Is <dir> the pinned commit with exactly our patches? {ok, why}. */
export function check(dir, up = readUpstream()) {
  const stampFile = path.join(dir, STAMP);
  if (!fs.existsSync(stampFile)) return { ok: false, why: `${dir} has no ${STAMP} (not fetched by this script)` };
  const stamp = JSON.parse(fs.readFileSync(stampFile, 'utf8'));
  const want = stampFor(up);
  if (stamp.commit !== want.commit) return { ok: false, why: `${dir} is commit ${stamp.commit}, the pin is ${want.commit}` };
  if (JSON.stringify(stamp.patches) !== JSON.stringify(want.patches)) return { ok: false, why: `${dir} was patched with other patch files than mineai/patches has now` };
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).stdout?.trim();
  if (head !== up.commit) return { ok: false, why: `${dir} has HEAD ${head || '(none)'}, the pin is ${up.commit}` };
  if (!fs.existsSync(path.join(dir, 'node_modules', 'tsx'))) return { ok: false, why: `${dir} has no installed dependencies` };
  return { ok: true, why: `${dir}: ${up.commit.slice(0, 7)} with ${want.patches.length} patches, dependencies installed` };
}

export async function main(argv = process.argv.slice(2), { print = console.log, printErr = console.error } = {}) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: {
      repo: { type: 'string' }, bun: { type: 'string' }, 'no-install': { type: 'boolean' }, 'dry-run': { type: 'boolean' },
      check: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
    } });
  } catch (err) { printErr(err.message); return 2; }
  const { values, positionals } = parsed;
  if (values.help || positionals.length !== 1) { print('usage: node scripts/mineai-fetch.mjs <dir> [--check] [--repo <url|path>] [--bun <path>] [--no-install] [--dry-run]'); return values.help ? 0 : 2; }
  const dir = path.resolve(positionals[0]);
  if (dir === ROOT || dir.startsWith(`${ROOT}${path.sep}`)) { printErr('the runtime goes into a folder outside this agent (their code stays out of our repo)'); return 2; }
  const up = readUpstream();
  if (values.check) {
    const r = check(dir, up);
    (r.ok ? print : printErr)(r.why);
    return r.ok ? 0 : 1;
  }
  const dry = Boolean(values['dry-run']);
  const opt = { dry, print };
  try {
    if (!fs.existsSync(path.join(dir, '.git'))) run('git', ['clone', '--quiet', '--no-checkout', values.repo ?? up.repo, dir], opt);
    const has = dry ? false : spawnSync('git', ['cat-file', '-e', `${up.commit}^{commit}`], { cwd: dir }).status === 0;
    if (!has) run('git', ['fetch', '--quiet', 'origin', up.commit], { ...opt, cwd: dir });
    // back to the pristine commit (our earlier patches undone; node_modules kept), then our patches in order
    run('git', ['checkout', '--quiet', '--force', '--detach', up.commit], { ...opt, cwd: dir });
    run('git', ['clean', '--quiet', '-fd', '-e', 'node_modules', '-e', STAMP], { ...opt, cwd: dir });
    for (const p of up.patches) {
      run('git', ['apply', '--check', p], { ...opt, cwd: dir });
      run('git', ['apply', p], { ...opt, cwd: dir });
    }
    if (!values['no-install']) run(values.bun ?? process.env.BUN ?? 'bun', ['install', '--frozen-lockfile'], { ...opt, cwd: dir });
    if (!dry) fs.writeFileSync(path.join(dir, STAMP), `${JSON.stringify({ ...stampFor(up), at: new Date().toISOString() }, null, 2)}\n`);
    print(dry ? 'dry run: nothing was changed' : `ready: ${dir} (${up.commit.slice(0, 7)} + ${up.patches.length} patches); set MINEAI_DIR=${dir}`);
    return 0;
  } catch (err) {
    printErr(`could not fetch the runtime: ${err.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = await main();
