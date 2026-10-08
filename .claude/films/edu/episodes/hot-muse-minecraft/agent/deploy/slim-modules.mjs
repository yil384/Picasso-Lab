// deploy/slim-modules.mjs - run in the agent image right after `npm ci`: drops the game data of every Minecraft version
// but one from node_modules (about 650 MB of the 946 MB). minecraft-data keeps the folders its dataPaths.json names for
// that Java version, plus pc/common and bedrock/common (its index loads those at once); every other pc/<version> and all
// of bedrock go. prismarine-viewer keeps public/textures/<version>(.png) and public/blocksStates/<version>.json, the
// files its pages load for a bot of that version. Prints what it removed and the sizes before and after; refuses
// (exit 1) when the version is not in the data, so an image is never built without the data its bots need.
//
//   node deploy/slim-modules.mjs [version=1.21.4] [node_modules folder=./node_modules]

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Bytes under a path (files only, links not followed). */
export function sizeOf(p) {
  const st = fs.lstatSync(p, { throwIfNoEntry: false });
  if (!st) return 0;
  if (!st.isDirectory()) return st.size;
  let n = 0;
  for (const e of fs.readdirSync(p)) n += sizeOf(path.join(p, e));
  return n;
}

/**
 * What to remove for one version: [{path, why}]. Throws when the version's data is not there.
 * @param {string} modules   the node_modules folder
 * @param {string} version   e.g. 1.21.4
 */
export function plan(modules, version) {
  const out = [];
  const data = path.join(modules, 'minecraft-data', 'minecraft-data', 'data');
  const paths = JSON.parse(fs.readFileSync(path.join(data, 'dataPaths.json'), 'utf8'));
  const mine = paths.pc?.[version];
  if (!mine) throw new Error(`minecraft-data has no Java ${version} (dataPaths.json)`);
  const keep = new Set(['pc/common', 'bedrock/common', ...Object.values(mine)]);
  for (const edition of ['pc', 'bedrock']) {
    for (const v of fs.readdirSync(path.join(data, edition))) {
      const rel = `${edition}/${v}`;
      if (!keep.has(rel)) out.push({ path: path.join(data, edition, v), why: `minecraft-data ${rel}` });
    }
  }
  const pub = path.join(modules, 'prismarine-viewer', 'public');
  if (fs.existsSync(pub)) {
    if (!fs.existsSync(path.join(pub, 'textures', version)) || !fs.existsSync(path.join(pub, 'blocksStates', `${version}.json`))) {
      throw new Error(`prismarine-viewer has no textures or block states for ${version}`);
    }
    for (const f of fs.readdirSync(path.join(pub, 'textures'))) {
      if (f !== version && f !== `${version}.png`) out.push({ path: path.join(pub, 'textures', f), why: `prismarine-viewer textures/${f}` });
    }
    for (const f of fs.readdirSync(path.join(pub, 'blocksStates'))) {
      if (f !== `${version}.json`) out.push({ path: path.join(pub, 'blocksStates', f), why: `prismarine-viewer blocksStates/${f}` });
    }
  }
  return out;
}

/** The CLI. Returns an exit code. */
export function main(argv = process.argv.slice(2), { print = console.log, printErr = console.error } = {}) {
  const [version = '1.21.4', modules = 'node_modules'] = argv;
  if (!/^\d+\.\d+(\.\d+)?$/.test(version)) { printErr('usage: node deploy/slim-modules.mjs [version] [node_modules folder]'); return 64; }
  let list;
  try { list = plan(path.resolve(modules), version); } catch (err) { printErr(`slim-modules: ${err.message}`); return 1; }
  const mb = (n) => `${Math.round(n / 1e6)} MB`;
  const before = sizeOf(path.resolve(modules));
  let freed = 0;
  for (const { path: p } of list) { freed += sizeOf(p); fs.rmSync(p, { recursive: true, force: true }); }
  print(`slim-modules: kept the data of ${version}; removed ${list.length} folders and files (${mb(freed)}); node_modules ${mb(before)} -> ${mb(before - freed)}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main();
