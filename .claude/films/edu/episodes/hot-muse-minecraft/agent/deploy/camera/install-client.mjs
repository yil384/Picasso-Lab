// deploy/camera/install-client.mjs - installs the vanilla Minecraft Java client for the camera container (build time):
// the version JSON from Mojang's manifest, the client jar, the Linux libraries (natives unpacked into one folder), the
// asset index and every asset except the sounds (the camera plays none). Every file is checked against its SHA-1.
// Writes <dir>/launch.json: main class, class path, asset index, the folders, for src/camera.js. No account is needed.
//
//   node deploy/camera/install-client.mjs /opt/mc 1.21.4

import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const RESOURCES = 'https://resources.download.minecraft.net';

const [dir = '/opt/mc', version = '1.21.4'] = process.argv.slice(2);
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

async function get(url, want) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (want && sha1(buf) !== want) throw new Error(`SHA-1 mismatch (want ${want})`);
      return buf;
    } catch (err) {
      if (attempt >= 4) throw new Error(`${url}: ${err.message}`);
      await new Promise((res) => { setTimeout(res, 1_000 * attempt); });
    }
  }
}

async function save(url, file, want) {
  try { if (want && sha1(fs.readFileSync(file)) === want) return file; } catch { /* not there yet */ }
  const buf = await get(url, want);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return file;
}

/** Run fn over items, at most n at once. */
async function pool(items, n, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next; next += 1; await fn(items[i]); }
  }));
}

/** A library rule list allows Linux x86-64. */
function allowed(rules) {
  if (!rules?.length) return true;
  let ok = false;
  for (const r of rules) {
    const os = r.os ?? {};
    const match = (!os.name || os.name === 'linux') && (!os.arch || os.arch === 'x86_64' || os.arch === 'x64');
    if (match) ok = r.action === 'allow';
  }
  return ok;
}

const manifest = JSON.parse(await get(MANIFEST));
const entry = manifest.versions.find((v) => v.id === version);
if (!entry) throw new Error(`no version ${version} in the manifest`);
const vjson = await get(entry.url, entry.sha1);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${version}.json`), vjson);
const v = JSON.parse(vjson);

const libDir = path.join(dir, 'libraries');
const nativesDir = path.join(dir, 'natives');
fs.mkdirSync(nativesDir, { recursive: true });
const classpath = [];
const natives = [];
for (const lib of v.libraries) {
  const a = lib.downloads?.artifact;
  if (!a || !allowed(lib.rules)) continue;
  const file = path.join(libDir, a.path);
  await save(a.url, file, a.sha1);
  if (/:natives-linux$/.test(lib.name)) natives.push(file);
  else classpath.push(file);
}
// LWJGL loads its .so files from org.lwjgl.librarypath: unpack every Linux x64 native into one folder
for (const jar of natives) {
  try {
    execFileSync('unzip', ['-o', '-j', '-q', jar, '*.so', '-x', '*arm64*', '*arm32*', '-d', nativesDir], { stdio: ['ignore', 'inherit', 'inherit'] });
  } catch (err) {
    if (err.status !== 11) throw err; // 11: no .so in this jar
  }
}
const clientJar = await save(v.downloads.client.url, path.join(dir, 'versions', version, `${version}.jar`), v.downloads.client.sha1);
classpath.push(clientJar);

const assetsDir = path.join(dir, 'assets');
const indexBuf = await get(v.assetIndex.url, v.assetIndex.sha1);
fs.mkdirSync(path.join(assetsDir, 'indexes'), { recursive: true });
fs.writeFileSync(path.join(assetsDir, 'indexes', `${v.assetIndex.id}.json`), indexBuf);
const objects = Object.entries(JSON.parse(indexBuf).objects).filter(([name]) => !name.endsWith('.ogg'));
let bytes = 0;
await pool(objects, 16, async ([, o]) => {
  const sub = o.hash.slice(0, 2);
  await save(`${RESOURCES}/${sub}/${o.hash}`, path.join(assetsDir, 'objects', sub, o.hash), o.hash);
  bytes += o.size;
});

const launch = {
  version, mainClass: v.mainClass, classpath, assetsDir, assetIndex: v.assetIndex.id, nativesDir,
  javaMajor: v.javaVersion?.majorVersion ?? 21, installedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(dir, 'launch.json'), `${JSON.stringify(launch, null, 2)}\n`);
console.log(`Minecraft ${version}: ${classpath.length} jars, ${fs.readdirSync(nativesDir).length} natives, ${objects.length} assets (${Math.round(bytes / 1e6)} MB, sounds left out) in ${dir}`);
