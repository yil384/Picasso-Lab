// Backups of DATA_DIR that are consistent and keep no IP memory (README "Backup and restore"; run inside the image,
// see ops/backup.sh):
//   node src/backup.js save <dataDir> <out.json.gz>     both files as they were at one moment: read, then checked
//                                                       unchanged (a flush in between means another try); the IP
//                                                       memory and the per-inbox email counts are left out;
//                                                       written 0600 and, with OWNER=uid:gid,
//                                                       handed to that user
//   node src/backup.js restore <in.json.gz> <dataDir>   puts both files back from the same backup (never one file
//                                                       alone: that would mix two moments), mode 600, owned by the
//                                                       service user when run as root; old .bak / .tmp copies go
// A restored table that had a hand in progress calls it off at the next start (every chip back on its seat).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const NAMES = ['accounts', 'tables'];
const SERVICE_UID = 1000; // the image's `node` user
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// a file the service has not written yet (no table ever opened) is "none" and stays absent in the backup
function fileState(dir) {
  return NAMES.map((n) => {
    try {
      const st = fs.statSync(path.join(dir, `${n}.json`));
      return `${st.ino}:${st.size}:${st.mtimeMs}`;
    } catch (e) {
      if (e.code === 'ENOENT') return 'none';
      throw e;
    }
  }).join('|');
}

function readMaybe(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

function envelope(text, name) {
  const env = JSON.parse(text);
  if (!env || env.v !== 1 || !Number.isInteger(env.gen) || !Array.isArray(env.batch)) throw new Error(`${name}.json is not a data file`);
  return env;
}

export async function save(dir, out, { tries = 50, owner = process.env.OWNER || '', afterRead = null } = {}) {
  for (let k = 0; k < tries; k++) {
    const before = fileState(dir);
    const texts = NAMES.map((n) => readMaybe(path.join(dir, `${n}.json`)));
    afterRead?.(k); // tests: a flush landing between the reads
    if (fileState(dir) !== before) { await sleep(40); continue; } // a flush landed while reading: again
    const [accounts, tables] = texts.map((t, i) => (t === null ? null : envelope(t, NAMES[i])));
    // the IP memory (salted network hashes and the names used there) is never kept in a backup, nor which inbox
    // hashes asked for sign-in emails in the last day (the per-address email limit; the daily and monthly counts stay)
    if (accounts?.data) accounts.data.ip = {};
    if (accounts?.data?.mail) accounts.data.mail = { sent: accounts.data.mail.sent || [], addr: {}, days: accounts.data.mail.days || {} };
    const body = zlib.gzipSync(JSON.stringify({ v: 1, kind: 'holdem-backup', savedAt: new Date().toISOString(), files: { accounts, tables } }));
    const tmp = `${out}.tmp`;
    fs.writeFileSync(tmp, body, { mode: 0o600 });
    fs.chmodSync(tmp, 0o600);
    if (owner) {
      const [uid, gid] = owner.split(':').map(Number);
      if (Number.isInteger(uid)) fs.chownSync(tmp, uid, Number.isInteger(gid) ? gid : uid);
    }
    fs.renameSync(tmp, out);
    return { tries: k + 1, gens: [accounts?.gen ?? null, tables?.gen ?? null] };
  }
  throw new Error('the data files kept changing while being read');
}

export function restore(file, dir) {
  const b = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
  if (b.kind !== 'holdem-backup' || !b.files) throw new Error(`${file} is not a backup`);
  for (const n of NAMES) if (b.files[n]) envelope(JSON.stringify(b.files[n]), n);
  const root = typeof process.getuid === 'function' && process.getuid() === 0;
  const gen = Math.max(0, ...NAMES.map((n) => (b.files[n] ? b.files[n].gen : 0))) + 1;
  for (const f of fs.readdirSync(dir)) if (/\.json\.(bak|tmp|bak\.tmp)$/.test(f)) fs.unlinkSync(path.join(dir, f));
  for (const n of NAMES) {
    const target = path.join(dir, `${n}.json`);
    if (!b.files[n]) { fs.rmSync(target, { force: true }); continue; } // absent then: absent now
    const tmp = `${target}.tmp`;
    // one batch: both files carry the same generation, so the service reads them as one moment
    fs.writeFileSync(tmp, JSON.stringify({ ...b.files[n], gen, batch: NAMES, savedAt: Date.now() }), { mode: 0o600 });
    if (root) fs.chownSync(tmp, SERVICE_UID, SERVICE_UID);
    fs.renameSync(tmp, target);
  }
  return { gen };
}

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  try {
    if (cmd === 'save' && a && b) console.log(JSON.stringify({ saved: b, ...(await save(a, b)) }));
    else if (cmd === 'restore' && a && b) console.log(JSON.stringify({ restored: a, ...restore(a, b) }));
    else {
      console.error('usage: node src/backup.js save <dataDir> <out.json.gz> | restore <in.json.gz> <dataDir>');
      process.exit(2);
    }
  } catch (e) {
    console.error(`backup failed: ${e.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('backup.js')) main();
