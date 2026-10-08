// JSON persistence for DATA_DIR (DESIGN.md section 9): accounts.json and tables.json.
//
// Every flush writes the dirty files as one batch with a new generation number:
//   1. each file goes to <name>.json.tmp (mode 600) and is fsynced;
//   2. only then, per file: the current <name>.json is hard-linked to <name>.json.bak (the last good copy) and the
//      temp file is renamed over <name>.json; finally the directory is fsynced.
// Each file is an envelope { v: 1, gen, batch: [names], savedAt, data }. A crash between two renames leaves the
// rest of the batch complete in its temp files (step 1 finished before any rename), so load() rolls the batch
// forward; a crash during step 1 leaves the old files untouched and the incomplete temp files are discarded.
// Either way both files always describe the same moment, which keeps chips moving between a table and a bankroll
// consistent across a crash. load() refuses to start on a corrupt file and never modifies it.
//
// Writes are debounced: the first change schedules a flush 200 ms later (later changes join it), so a crash loses
// at most that window. flush() is synchronous (it also runs on SIGTERM / SIGINT through close()).
//
//   new Store({ dir, names = ['accounts', 'tables'], debounceMs = 200, log })
//   load() -> { [name]: data | null }       throws StoreError (code corrupt | missing) instead of starting fresh
//   register(name, () => data)              serializer called at flush time
//   markDirty(name)                         schedules a flush
//   flush() -> bool                         writes every dirty file now (as one batch)
//   close()                                 final flush; no more timers

import fs from 'node:fs';
import path from 'node:path';

export class StoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StoreError';
    this.code = code;
  }
}

const FILE_MODE = 0o600;

function readEnvelope(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return { status: 'missing' };
    throw e;
  }
  try {
    const env = JSON.parse(text);
    if (!env || typeof env !== 'object' || env.v !== 1 || !Number.isInteger(env.gen) || !Array.isArray(env.batch)) {
      return { status: 'corrupt' };
    }
    return { status: 'ok', env };
  } catch (_) {
    return { status: 'corrupt' };
  }
}

function fsyncDir(dir) {
  let fd;
  try {
    fd = fs.openSync(dir, 'r');
    fs.fsyncSync(fd);
  } catch (_) { /* not supported on every platform */ } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function unlinkQuiet(file) {
  try { fs.unlinkSync(file); } catch (_) { /* absent */ }
}

export class Store {
  constructor({ dir, names = ['accounts', 'tables'], debounceMs = 200, log = () => {} }) {
    this.dir = dir;
    this.names = names;
    this.debounceMs = debounceMs;
    this.log = log;
    this.serializers = new Map();
    this.dirty = new Set();
    this.timer = null;
    this.gen = 0;
    this.closed = false;
    this.loaded = false;
  }

  file(name) {
    return path.join(this.dir, `${name}.json`);
  }

  load() {
    fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    const main = {};
    const tmp = {};
    for (const n of this.names) {
      const f = this.file(n);
      main[n] = readEnvelope(f);
      if (main[n].status === 'corrupt') {
        throw new StoreError('corrupt', `${f} is not a valid data file. It was left untouched; the last good copy is ${f}.bak. Refusing to start.`);
      }
      if (main[n].status === 'missing' && fs.existsSync(`${f}.bak`)) {
        throw new StoreError('missing', `${f} is missing but ${f}.bak exists. Restore it (cp ${n}.json.bak ${n}.json) or remove the .bak to start empty. Refusing to start.`);
      }
      tmp[n] = readEnvelope(`${f}.tmp`);
    }
    // roll forward a batch that was interrupted between its renames
    const mainGen = (n) => (main[n].status === 'ok' ? main[n].env.gen : 0);
    let best = null;
    for (const n of this.names) {
      const t = tmp[n];
      if (t.status === 'ok' && t.env.gen > mainGen(n) && (!best || t.env.gen > best.gen)) best = { gen: t.env.gen, batch: t.env.batch };
    }
    if (best) {
      const complete = best.batch.every((n) => this.names.includes(n)
        && (mainGen(n) === best.gen || (tmp[n].status === 'ok' && tmp[n].env.gen === best.gen)));
      if (complete) {
        for (const n of best.batch) {
          if (tmp[n].status === 'ok' && tmp[n].env.gen === best.gen && mainGen(n) !== best.gen) {
            this._install(n);
            main[n] = tmp[n];
          }
        }
        fsyncDir(this.dir);
        this.log('store: completed an interrupted write', { gen: best.gen, batch: best.batch });
      }
    }
    for (const n of this.names) {
      unlinkQuiet(`${this.file(n)}.tmp`);
      unlinkQuiet(`${this.file(n)}.bak.tmp`);
    }
    const out = {};
    for (const n of this.names) {
      out[n] = main[n].status === 'ok' ? main[n].env.data : null;
      if (main[n].status === 'ok') this.gen = Math.max(this.gen, main[n].env.gen);
    }
    this.loaded = true;
    return out;
  }

  register(name, serialize) {
    this.serializers.set(name, serialize);
  }

  markDirty(name) {
    if (this.closed) return;
    this.dirty.add(name);
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.flush();
      }, this.debounceMs);
    }
  }

  flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (!this.dirty.size) return false;
    const batch = [...this.dirty].filter((n) => this.serializers.has(n)).sort();
    if (!batch.length) return false;
    const gen = this.gen + 1;
    try {
      // serialize everything first (one synchronous moment), then write
      const savedAt = Date.now();
      const texts = batch.map((n) => JSON.stringify({ v: 1, gen, batch, savedAt, data: this.serializers.get(n)() }));
      batch.forEach((n, i) => this._writeTmp(`${this.file(n)}.tmp`, texts[i]));
      for (const n of batch) this._install(n);
      fsyncDir(this.dir);
      this.gen = gen;
      for (const n of batch) this.dirty.delete(n);
      return true;
    } catch (e) {
      this.log('store: write failed, will retry', { error: e.code || e.message });
      if (!this.closed && !this.timer) {
        this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 1000);
      }
      return false;
    }
  }

  close() {
    this.flush();
    this.closed = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  _writeTmp(file, text) {
    const fd = fs.openSync(file, 'w', FILE_MODE);
    try {
      fs.fchmodSync(fd, FILE_MODE);
      fs.writeSync(fd, text);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  }

  // <name>.json.tmp becomes <name>.json; the previous <name>.json is kept as <name>.json.bak
  _install(name) {
    const f = this.file(name);
    if (fs.existsSync(f)) {
      const bakTmp = `${f}.bak.tmp`;
      unlinkQuiet(bakTmp);
      try {
        fs.linkSync(f, bakTmp);
      } catch (_) {
        fs.copyFileSync(f, bakTmp);
        fs.chmodSync(bakTmp, FILE_MODE);
      }
      fs.renameSync(bakTmp, `${f}.bak`);
    }
    fs.renameSync(`${f}.tmp`, f);
  }
}
