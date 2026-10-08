// deploy/camera/install-client.mjs - installs the vanilla Minecraft Java client for the camera container (build time):
// the version JSON from Mojang's manifest, the client jar, the Linux libraries (natives unpacked into one folder), the
// asset index and every asset except the sounds (the camera plays none). Every file is checked against its SHA-1.
// Writes <dir>/launch.json: main class, class path, asset index, the folders, for src/camera.js. No account is needed.
// With a pin file (deploy/camera/mods.json) it also installs the Fabric loader and the pinned client mods (Sodium and
// friends) into <dir>/mods, every jar checked against its pinned SHA-512; launch.json then has a `fabric` part that
// src/camera.js uses when CAMERA_MODS names any mod.
//
//   node deploy/camera/install-client.mjs /opt/mc 1.21.4 [deploy/camera/mods.json]

import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const RESOURCES = 'https://resources.download.minecraft.net';

const [dir = '/opt/mc', version = '1.21.4', pinFile] = process.argv.slice(2);
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
const sha512 = (buf) => crypto.createHash('sha512').update(buf).digest('hex');

async function get(url, want, hash = sha1) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (want && hash(buf) !== want) throw new Error(`${hash === sha1 ? 'SHA-1' : 'SHA-512'} mismatch (want ${want})`);
      return buf;
    } catch (err) {
      if (attempt >= 4) throw new Error(`${url}: ${err.message}`);
      await new Promise((res) => { setTimeout(res, 1_000 * attempt); });
    }
  }
}

async function save(url, file, want, hash = sha1) {
  try { if (want && hash(fs.readFileSync(file)) === want) return file; } catch { /* not there yet */ }
  const buf = await get(url, want, hash);
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

// Fabric and the pinned mods (SHA-512 each); the loader's classes go before the game's on the class path
if (pinFile) {
  const pins = JSON.parse(fs.readFileSync(pinFile, 'utf8'));
  if (pins.minecraft !== version) throw new Error(`${pinFile} pins Minecraft ${pins.minecraft}, not ${version}`);
  const fabricCp = [];
  for (const lib of pins.fabric.libraries) {
    const [g, a, ver] = lib.name.split(':');
    fabricCp.push(await save(lib.url, path.join(libDir, ...g.split('.'), a, ver, `${a}-${ver}.jar`), lib.sha512, sha512));
  }
  const mods = {};
  for (const [name, m] of Object.entries(pins.mods)) {
    mods[name] = { version: m.version, jar: await save(m.url, path.join(dir, 'mods', `${name}-${m.version.replace(/[^A-Za-z0-9.+_-]/g, '_')}.jar`), m.sha512, sha512) };
  }
  // a library both lists carry (ASM: the game 9.6, Fabric 9.10.1) is loaded once, in Fabric's version, as the
  // launchers do: two copies on the class path stop the loader ("duplicate ASM classes")
  const artifact = (p) => path.dirname(path.dirname(p));
  const theirs = new Set(fabricCp.map(artifact));
  const replaces = classpath.filter((p) => theirs.has(artifact(p)));
  launch.fabric = { loader: pins.fabric.loader, mainClass: pins.fabric.mainClass, jvmArgs: pins.fabric.jvmArgs ?? [], classpath: fabricCp, replaces, mods };
}
fs.writeFileSync(path.join(dir, 'launch.json'), `${JSON.stringify(launch, null, 2)}\n`);
console.log(`Minecraft ${version}: ${classpath.length} jars, ${fs.readdirSync(nativesDir).length} natives, ${objects.length} assets (${Math.round(bytes / 1e6)} MB, sounds left out) in ${dir}`
  + (launch.fabric ? `; Fabric ${launch.fabric.loader} with ${Object.entries(launch.fabric.mods).map(([k, m]) => `${k} ${m.version}`).join(', ')}` : ''));
