// test/slim.test.js - deploy/slim-modules.mjs on a stand-in node_modules: only the data of one Minecraft version stays
// (the folders minecraft-data's dataPaths.json names for it, both common folders, the viewer's textures and block
// states of that version), a version without data is refused and nothing is removed; plus the real tree's data for
// 1.21.4 is where the script expects it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { plan, main } from '../deploy/slim-modules.mjs';

function standIn() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slim-'));
  const put = (rel, text = 'x') => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  const data = 'minecraft-data/minecraft-data/data';
  put(`${data}/dataPaths.json`, JSON.stringify({ pc: { '1.21.4': { blocks: 'pc/1.21.4', windows: 'pc/1.16.1', proto: 'pc/1.21.4' }, '1.8': { blocks: 'pc/1.8' } }, bedrock: { '1.20.0': { blocks: 'bedrock/1.20.0' } } }));
  for (const d of ['pc/1.21.4', 'pc/1.16.1', 'pc/1.8', 'pc/common', 'bedrock/common', 'bedrock/1.20.0']) put(`${data}/${d}/blocks.json`);
  for (const f of ['textures/1.21.4/blocks/stone.png', 'textures/1.21.4.png', 'textures/1.8.8/blocks/stone.png', 'textures/1.8.8.png', 'blocksStates/1.21.4.json', 'blocksStates/1.8.8.json', 'worker.js']) put(`prismarine-viewer/public/${f}`);
  return root;
}

test('slim-modules: one version\'s data stays, everything else goes; an unknown version removes nothing', (t) => {
  const root = standIn();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const out = [];
  assert.equal(main(['1.99.1', root], { print: (l) => out.push(l), printErr: (l) => out.push(l) }), 1);
  assert.match(out.at(-1), /no Java 1\.99\.1/);
  assert.equal(fs.existsSync(path.join(root, 'minecraft-data/minecraft-data/data/pc/1.8')), true, 'nothing removed');

  assert.equal(main(['1.21.4', root], { print: (l) => out.push(l), printErr: (l) => out.push(l) }), 0);
  assert.match(out.at(-1), /^slim-modules: kept the data of 1\.21\.4; removed 5 folders and files/);
  const ls = (rel) => fs.readdirSync(path.join(root, rel)).sort();
  assert.deepEqual(ls('minecraft-data/minecraft-data/data/pc'), ['1.16.1', '1.21.4', 'common'], 'what 1.21.4 points at, and common');
  assert.deepEqual(ls('minecraft-data/minecraft-data/data/bedrock'), ['common']);
  assert.deepEqual(ls('prismarine-viewer/public/textures'), ['1.21.4', '1.21.4.png']);
  assert.deepEqual(ls('prismarine-viewer/public/blocksStates'), ['1.21.4.json']);
  assert.equal(fs.existsSync(path.join(root, 'prismarine-viewer/public/worker.js')), true);
  assert.equal(main(['1.21.4', root], { print: (l) => out.push(l), printErr: () => {} }), 0, 'a second run is a no-op');
  assert.match(out.at(-1), /removed 0 folders/);
});

test('slim-modules: the installed packages have 1.21.4 where the script looks for it', () => {
  const require = createRequire(import.meta.url);
  const modules = path.resolve(path.dirname(require.resolve('minecraft-data/package.json')), '..');
  const list = plan(modules, '1.21.4'); // a full install: about 170 entries; an already slim one: none
  assert.ok(!list.some((x) => /pc\/(1\.21\.4|common)$|bedrock\/common$|textures\/1\.21\.4(\.png)?$|blocksStates\/1\.21\.4\.json$/.test(x.path)), 'never what 1.21.4 needs');
});
