// src/recorder.js - the recordings of the games the camera films (RECORD=on, the camera service), for films made
// later: per game a folder under RECORD_DIR with
//   clean-<n>.mp4   the game alone with its sound, no HUD, at the size the client draws (a second ffmpeg on the same
//                   display, niced, fragmented MP4 so a cut-off file still plays)
//   stream-<n>.mp4  the composited stream as it went out (the live's own bytes, written alongside, remuxed at the end;
//                   with no live video it is the stream's own output)
//   hud.jsonl       every update the HUD got ({t: wall ms, gs: game seconds, u}), so the HUD can be drawn again from
//                   them, and every 30 s its whole state ({t, gs, snap})
//   meta.json       the game, the parts with their start and end, the sizes and the settings
// <n> counts the parts (a restart of the stream, the camera coming back to the game). Before each new folder the old
// ones go: older than RECORD_KEEP_DAYS, then the oldest until the total is under RECORD_MAX_GB.
import fs from 'node:fs';
import path from 'node:path';

const GAME_RE = /^g[0-9a-f]{6,16}$/;

/** The size of a folder's files, in bytes (one level: a recording's folder has no subfolders). */
function folderBytes(dir) {
  let n = 0;
  try { for (const f of fs.readdirSync(dir)) { try { const s = fs.statSync(path.join(dir, f)); if (s.isFile()) n += s.size; } catch { /* gone */ } } } catch { /* gone */ }
  return n;
}

/**
 * Old recordings out: folders older than keepDays (by their last change), then the oldest until the rest fit maxBytes.
 * keep: a folder never removed (the one being written). Returns the names removed.
 */
export function cleanupRecordings(root, { maxBytes = 150 * 2 ** 30, keepDays = 30, keep = null, now = Date.now } = {}) {
  let dirs = [];
  try {
    dirs = fs.readdirSync(root).filter((d) => GAME_RE.test(d) && d !== keep).map((d) => {
      const p = path.join(root, d);
      let at = 0;
      try { at = fs.statSync(p).mtimeMs; } catch { /* gone */ }
      return { d, p, at, bytes: folderBytes(p) };
    }).sort((a, z) => a.at - z.at);
  } catch { return []; }
  const removed = [];
  const drop = (x) => { try { fs.rmSync(x.p, { recursive: true, force: true }); removed.push(x.d); } catch { /* left for next time */ } };
  const old = now() - keepDays * 86_400_000;
  for (const x of dirs.filter((x) => x.at < old)) drop(x);
  let rest = dirs.filter((x) => !removed.includes(x.d));
  let total = rest.reduce((a, x) => a + x.bytes, 0) + (keep ? folderBytes(path.join(root, keep)) : 0);
  while (total > maxBytes && rest.length) { const x = rest.shift(); drop(x); total -= x.bytes; }
  return removed;
}

/**
 * The ffmpeg arguments of the clean recording: the X display (the client's own size) and the game's sound from
 * PulseAudio, H.264 at a high quality (CRF), AAC, fragmented MP4.
 */
export function cleanArgs({ display, width, height, fps = 30, pulse = null, crf = 18, preset = 'veryfast', threads = 2, out }) {
  return [
    '-hide_banner', '-loglevel', 'error', '-nostdin',
    '-thread_queue_size', '512', '-f', 'x11grab', '-draw_mouse', '0', '-framerate', String(fps), '-video_size', `${width}x${height}`, '-i', display,
    ...(pulse ? ['-thread_queue_size', '512', '-f', 'pulse', '-i', pulse] : []),
    '-map', '0:v', ...(pulse ? ['-map', '1:a'] : []),
    '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p', '-threads', String(threads), '-g', String(fps * 2),
    ...(pulse ? ['-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2'] : []),
    '-movflags', '+frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', '-y', out,
  ];
}

/**
 * One game's recording folder: the next part's file names, the HUD's timeline, meta.json. game: the game's id.
 * @param {{root: string, game: string, now?: () => number, gameS?: () => number|null}} o
 */
export function createRecording(o) {
  if (!GAME_RE.test(String(o.game))) throw new Error(`not a game id: ${o.game}`);
  const now = o.now ?? Date.now;
  const dir = path.join(o.root, o.game);
  fs.mkdirSync(dir, { recursive: true });
  const metaFile = path.join(dir, 'meta.json');
  let meta = { game: o.game, parts: [], settings: o.settings ?? {} };
  try { meta = { ...meta, ...JSON.parse(fs.readFileSync(metaFile, 'utf8')) }; } catch { /* a new folder */ }
  const save = () => { try { fs.writeFileSync(`${metaFile}.tmp`, JSON.stringify(meta, null, 1)); fs.renameSync(`${metaFile}.tmp`, metaFile); } catch { /* the disk */ } };
  const hudFile = path.join(dir, 'hud.jsonl');
  let hud = null;
  const line = (x) => { try { hud ??= fs.createWriteStream(hudFile, { flags: 'a' }); hud.write(`${JSON.stringify(x)}\n`); } catch { /* the disk */ } };
  return {
    dir,
    /** A new part: its file names, written down in meta.json. */
    part(kind = 'live') {
      const n = meta.parts.length + 1;
      const p = { n, kind, startedAt: new Date(now()).toISOString(), clean: `clean-${n}.mp4`, stream: `stream-${n}.mp4` };
      meta.parts.push(p);
      save();
      return { n, clean: path.join(dir, p.clean), stream: path.join(dir, p.stream), flv: path.join(dir, `stream-${n}.flv`) };
    },
    /** The part ended: its end and the files' sizes. */
    endPart(n, extra = {}) {
      const p = meta.parts.find((x) => x.n === n);
      if (!p) return;
      p.endedAt = new Date(now()).toISOString();
      for (const k of ['clean', 'stream']) { try { p[`${k}Bytes`] = fs.statSync(path.join(dir, p[k])).size; } catch { p[`${k}Bytes`] = 0; } }
      Object.assign(p, extra);
      save();
    },
    /** An update the HUD got. */
    hud(u, gs = null) { line({ t: now(), gs, u }); },
    /** The HUD's whole state. */
    snap(state, gs = null) { line({ t: now(), gs, snap: state }); },
    /** A piece the HUD put over the video (concept B: a toast, a banner, a floater, the action bar) with its times. */
    event(ev, gs = null) { line({ t: now(), gs, ev }); },
    close() { try { hud?.end(); } catch { /* gone */ } hud = null; },
  };
}
