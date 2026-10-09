// src/fb-live.js - the live video on a Facebook Page through the Graph API (FB_LIVE=on). muse.ai's preview panel frames
// Facebook's video player and nothing of ours, so each broadcast is a Page live video the panel can show.
//
// createGraph: the few Graph calls this needs (create a live video with status LIVE_NOW, read it, end it, rename it,
// list the Page's live videos), with the Page token read from its file (600, never in the environment, a URL or a
// log row; it goes in the Authorization header), calls spaced and capped per hour, transient errors retried with a
// backoff, rate-limit answers honoured, and every error scrubbed of the token and of stream keys.
//
// createLiveChannel: ONE channel (one camera, one Facebook live video at a time), with the stream manager's interface
// so the service (scripts/stream.mjs --serve) and the agent drive it like any manager. A guest game that starts is put
// on the channel; with no broadcast running, the channel creates one (Facebook shows a stream only if it connects after
// the live video exists), starts the camera stream to its secure_stream_url and reads the video's permalink for the
// embed. The camera follows one game: the one whose live_view request came last (focus), else the game it already
// films, else the newest. When the filmed game ends the camera moves to another game on the channel; when no game is
// left the stream stops and the live video is ended (end_live_video=true). A broadcast that fails or that Facebook ends
// is ended and, while games remain, replaced with a backoff. Live videos left open by a crash (the ids in a small state
// file, and any open live video of the Page whose description carries MARKER) are ended at start.

import fs from 'node:fs';
import path from 'node:path';
import { captionFor, cleanCaption, maskOutput } from './stream.js';
import { facebookEmbedUrl, isFacebookVideoUrl } from './config.js';

export const GRAPH_DEFAULTS = Object.freeze({
  version: 'v23.0',
  base: 'https://graph.facebook.com',
  minGapMs: 300, // between two calls
  perHour: 900, // calls an hour at most (a broadcast takes about 10, plus 2 a minute while it runs)
  retries: 3, // a transient failure is tried again this often (1, 2, 4 s)
  timeoutMs: 15_000,
  rateWaitMs: 60_000, // after a rate-limit answer, no call for this long
});
/** The sentence every live video of ours carries in its description: how a crash's leftovers are recognised. */
export const MARKER = 'Streamed automatically by the Picasso Lab demo server.';
export const DESCRIPTION = 'A live research demo from Picasso Lab at UC San Diego: an AI agent plays Minecraft: Java Edition on the lab\'s '
  + 'game server, and one camera follows the game that asked for the live view most recently. Not an official Minecraft '
  + `product; not approved by or associated with Mojang or Microsoft. ${MARKER}`;
const RATE_CODES = new Set([4, 17, 32, 613, 80001, 80002, 80005, 80006, 80008, 80014]);
const OPEN = new Set(['LIVE', 'LIVE_NOW', 'UNPUBLISHED', 'SCHEDULED_UNPUBLISHED', 'SCHEDULED_LIVE']);
const ENDED = new Set(['LIVE_STOPPED', 'VOD', 'PROCESSING', 'SCHEDULED_EXPIRED', 'SCHEDULED_CANCELED']);
const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

const clip = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export class GraphError extends Error {
  constructor(message, { status = 0, code = null, subcode = null, transient = false, rate = false } = {}) {
    super(message);
    this.name = 'GraphError';
    Object.assign(this, { status, code, subcode, transient, rate });
  }
}

/**
 * The Page token from its file: the token alone on one line, the file readable by its owner only. Throws (without
 * the token) on a missing file, a file others can read, or something that is not a token.
 */
export function readTokenFile(file) {
  if (!file) throw new Error('no FB_TOKEN_FILE');
  const st = fs.statSync(file);
  if (!st.isFile()) throw new Error(`FB_TOKEN_FILE ${file} is not a file`);
  if (st.mode & 0o077) throw new Error(`FB_TOKEN_FILE ${file} must be readable by its owner only (chmod 600; it is ${(st.mode & 0o777).toString(8)})`);
  const token = fs.readFileSync(file, 'utf8').trim();
  if (!/^[A-Za-z0-9_\-.|]{20,4096}$/.test(token)) throw new Error(`FB_TOKEN_FILE ${file} does not hold a token`);
  return token;
}

/** The public URL of a live video from what the Graph API returns (permalink_url, else its video id, else the embed). */
export function videoUrlOf(info, pageId) {
  const p = String(info?.permalink_url ?? '');
  const candidates = [];
  if (p.startsWith('/')) candidates.push(`https://www.facebook.com${p}`);
  else if (p) candidates.push(p);
  if (info?.video?.id && /^\d+$/.test(String(info.video.id)) && /^\d+$/.test(String(pageId ?? ''))) candidates.push(`https://www.facebook.com/${pageId}/videos/${info.video.id}/`);
  const m = String(info?.embed_html ?? '').match(/[?&]href=([^&"'\s]+)/);
  if (m) { try { candidates.push(decodeURIComponent(m[1])); } catch { /* not encoded */ } }
  return candidates.find(isFacebookVideoUrl) ?? null;
}

/**
 * The Graph API for one owner of live videos: a Page (its id and the Page token) or the person the token belongs to
 * ('me' and a long-lived user token: FB_TARGET=me).
 * @param {object} o
 * @param {string} o.pageId              the Page's id, or 'me'
 * @param {{value: string}|null} [o.privacy]  the live video's privacy (a person's videos; the embed plays only EVERYONE)
 * @param {string} [o.tokenFile]        the Page token's file (readTokenFile), read again when it changes
 * @param {() => string} [o.token]      (tests) the token
 * @param {string} [o.version]  @param {string} [o.base]  @param {typeof fetch} [o.fetchFn]
 * @param {{event: Function}} [o.log]   fb_error rows (never the token)
 */
export function createGraph(o) {
  const c = { ...GRAPH_DEFAULTS, ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) };
  const fetchFn = c.fetchFn ?? globalThis.fetch;
  // a call waiting for its turn keeps the process alive (a script with nothing else to do would otherwise exit mid-call)
  const sleep = c.sleep ?? ((ms) => new Promise((r) => { setTimeout(r, ms); }));
  const now = c.now ?? Date.now;
  const base = String(c.base).replace(/\/+$/, '');
  let cached = null; // {token, mtimeMs}
  const token = () => {
    if (c.token) return c.token();
    const st = fs.statSync(c.tokenFile);
    if (!cached || cached.mtimeMs !== st.mtimeMs) cached = { token: readTokenFile(c.tokenFile), mtimeMs: st.mtimeMs };
    return cached.token;
  };
  const secrets = new Set();
  /** Text with the token and every stream key replaced. */
  const scrub = (text) => {
    let t = String(text ?? '');
    for (const s of secrets) if (s) t = t.split(s).join('***');
    try { const tk = token(); if (tk) t = t.split(tk).join('***'); } catch { /* no token: nothing to hide */ }
    return t.replace(/rtmps?:\/\/[^\s'"]+/gi, (u) => maskOutput(u)).replace(/access_token=[^&\s'"]+/gi, 'access_token=***');
  };
  const sent = []; // times of the calls of the last hour
  let last = 0;
  let blockedUntil = 0;
  let calls = 0;
  let errors = 0;

  async function slot() {
    const t = now();
    while (sent.length && sent[0] < t - 3_600_000) sent.shift();
    if (sent.length >= c.perHour) throw new GraphError(`more than ${c.perHour} Graph calls in an hour; waiting`, { rate: true });
    if (blockedUntil > t) throw new GraphError(`Facebook asked us to slow down; no calls for ${Math.ceil((blockedUntil - t) / 1000)} s`, { rate: true });
    const wait = last + c.minGapMs - t;
    last = Math.max(t, last + c.minGapMs);
    if (wait > 0) await sleep(wait);
    sent.push(now());
  }

  async function once(method, pathname, params) {
    await slot();
    calls += 1;
    const url = new URL(`${base}/${c.version}/${pathname}`);
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null) (method === 'GET' || method === 'DELETE' ? url.searchParams : body).set(k, String(v));
    const auth = token(); // a missing or loose token file is an error of its own, never retried as a network one
    let res;
    let text;
    try {
      res = await fetchFn(url, {
        method,
        headers: { authorization: `Bearer ${auth}`, accept: 'application/json', ...(method === 'GET' || method === 'DELETE' ? {} : { 'content-type': 'application/x-www-form-urlencoded' }) },
        body: method === 'GET' || method === 'DELETE' ? undefined : body.toString(),
        signal: AbortSignal.timeout(c.timeoutMs),
      });
      text = await res.text();
    } catch (err) {
      if (err instanceof GraphError) throw err;
      throw new GraphError(`no answer from the Graph API: ${scrub(err?.cause?.code ?? err?.name ?? '')} ${scrub(err?.message ?? err)}`.trim(), { transient: true });
    }
    let json = null;
    try { json = text ? JSON.parse(text) : {}; } catch { /* not JSON */ }
    if (res.ok && json && !json.error) return json;
    const e = json?.error ?? {};
    const code = Number.isFinite(Number(e.code)) ? Number(e.code) : null;
    const rate = RATE_CODES.has(code) || res.status === 429;
    if (rate) blockedUntil = now() + c.rateWaitMs;
    throw new GraphError(scrub(`Graph API ${res.status}${code !== null ? ` code ${code}${e.error_subcode ? `/${e.error_subcode}` : ''}` : ''}: ${clip(e.message ?? text, 240)}`), {
      status: res.status, code, subcode: e.error_subcode ?? null, rate, transient: !rate && (res.status >= 500 || e.is_transient === true || code === 1 || code === 2),
    });
  }

  /** One call; transient failures again after 1, 2, 4 s (never for a create, which is not idempotent). */
  async function call(method, pathname, params, { retry = true, what = `${method} ${pathname}` } = {}) {
    for (let i = 0; ; i += 1) {
      try {
        return await once(method, pathname, params);
      } catch (err) {
        errors += 1;
        const again = retry && err.transient && i < c.retries;
        try { c.log?.event('fb_error', { what, status: err.status ?? null, code: err.code ?? null, message: scrub(err.message).slice(0, 300), retry: again }); } catch { /* best effort */ }
        if (!again) throw err;
        await sleep(1_000 * 2 ** i * (0.8 + Math.random() * 0.4));
      }
    }
  }

  let ownerId = /^\d+$/.test(String(c.pageId)) ? String(c.pageId) : null;
  return {
    pageId: c.pageId,
    /** The owner's numeric id (for 'me', read once from the Graph API). */
    async ownerId() {
      ownerId ??= String((await call('GET', 'me', { fields: 'id' }, { what: 'read the profile' }))?.id ?? '') || null;
      return ownerId;
    },
    scrub,
    /** Keep this text (a stream key) out of every message from now on. */
    hide(s) { if (s) secrets.add(String(s)); },
    page: () => call('GET', c.pageId, { fields: 'id,name' }, { what: c.pageId === 'me' ? 'read the profile' : 'read the Page' }),
    /**
     * POST /{page or me}/live_videos status=LIVE_NOW (with the privacy for a person's video): {id, secure_stream_url,
     * ...}. Never retried (it is not idempotent).
     */
    createLive: ({ title, description }) => call('POST', `${c.pageId}/live_videos`, {
      status: 'LIVE_NOW', title, description, ...(c.privacy ? { privacy: JSON.stringify(c.privacy) } : {}),
    }, { retry: false, what: 'create the live video' }),
    getLive: (id, fields) => call('GET', id, { fields }, { what: 'read the live video' }),
    endLive: (id) => call('POST', id, { end_live_video: 'true' }, { what: 'end the live video' }),
    updateLive: (id, fields) => call('POST', id, fields, { what: 'rename the live video', retry: false }),
    listLive: () => call('GET', `${c.pageId}/live_videos`, { fields: 'id,status,description,creation_time,video', limit: 25 }, { what: 'list the live videos' }),
    /** DELETE a video (the live video's recording, or the live video object). */
    deleteVideo: (id) => call('DELETE', id, {}, { what: 'delete the video' }),
    stats: () => ({ calls, errors, lastHour: sent.length, blockedForS: Math.max(0, Math.ceil((blockedUntil - now()) / 1000)) }),
  };
}

/**
 * A Graph error in plain words where Facebook's own is cryptic (Live Video API reference, error table), with whether
 * trying again soon can help.
 */
export function explain(err) {
  const sub = Number(err?.subcode);
  if (err?.code === 200 && sub === 1363120) return { text: 'Facebook says the Page is not eligible to go live yet: a profile or Page must be at least 60 days old (code 200/1363120)', permanent: true };
  if (err?.code === 200 && sub === 1363144) return { text: 'Facebook says the Page needs at least 100 followers to go live (code 200/1363144)', permanent: true };
  if (err?.code === 190) return { text: 'the Page token is not valid any more: renew it with scripts/fb-token.mjs (code 190)', permanent: true };
  if (err?.code === 200 || err?.code === 10) return { text: `the Page token lacks a permission (publish_video, pages_manage_posts) or the user a task on the Page: ${clip(err.message, 160)}`, permanent: true };
  return { text: clip(err?.message ?? err, 200), permanent: false };
}

/** The live video's title for a game: the lab demo and the game. */
export const titleFor = (base, game) => `${base} (game ${game})`.slice(0, 250);

/**
 * One live channel on a Facebook Page, with the stream manager's interface (start, stop, caption, has, slot, list,
 * stats, stopAll) plus focus(id) and live().
 * @param {object} o
 * @param {ReturnType<typeof createGraph>} o.graph
 * @param {(opts: {output: string, player: string, event: Function}) => object} o.createStream   a camera stream
 *   (createCameraStream's interface, with follow(player))
 * @param {{event: Function}} [o.log]
 * @param {string} [o.title]          the live video's title before " (game <id>)"
 * @param {string} [o.stateFile]      where the ids of open live videos are kept, to end them after a crash
 * @param {number} [o.gameTtlMs]      a game the agent has not reported for this long leaves the channel (0: never)
 * @param {object} [o.streamOptions]  passed to every stream (fps, bitrate, ...)
 * @param {boolean} [o.allowPlainRtmp] (tests) accept an rtmp:// ingest
 * @param {string} [o.privacy]       the privacy asked for (a profile's videos): read back after each create, and a video
 *   Facebook stored with another one (it caps a post at the audience the owner allowed the app) is reported as a warning
 * @param {boolean} [o.deleteAfter]   after a live video is ended, delete it (FB_DELETE_AFTER; the profile target keeps
 *   the owner's timeline clean), and try again later when that fails
 */
export function createLiveChannel(o) {
  const graph = o.graph;
  const now = o.now ?? Date.now;
  const title = o.title ?? 'Picasso Lab demo: an AI plays Minecraft';
  const pollMs = o.pollMs ?? 3_000; // while the stream is starting
  // Facebook reports LIVE as soon as a LIVE_NOW video exists, before any stream: "live" here also needs our stream
  // accepted by the ingest (NetStream.Publish.Start) for this long, so the player has something to play
  const settleMs = o.settleMs ?? 3_000;
  const livePollMs = o.livePollMs ?? 30_000; // while it is live: did Facebook end it?
  const retryMs = o.retryMs ?? [5_000, 15_000, 30_000, 60_000, 120_000];
  const event = (kind, data = {}) => { try { o.log?.event(kind, data); } catch { /* best effort */ } };

  const games = new Map(); // id -> {id, player, startedAt, seenAt, requestedAt, offs}
  const asked = new Map(); // id -> when live_view asked for a game the channel does not have yet
  let focus = null; // the game the camera films
  let b = null; // the broadcast: {id, game, state, videoUrl, embedUrl, createdAt, liveAt, publishing, stream, timer, status}
  let failures = [];
  let restingUntil = 0;
  let lastError = null;
  let closing = false;
  const pendingEnds = new Set(); // live videos whose end call failed: tried again later
  const pendingDeletes = new Map(); // live video id -> {live, video, tries}: deletes that failed, tried again later
  const deleteAfter = Boolean(o.deleteAfter);
  let swept = null;
  let running = null;
  let dirty = false;

  // ----- the state file (ids only; no URL, no key)
  const saveState = () => {
    if (!o.stateFile) return;
    try {
      const ids = [...new Set([...(b?.id ? [b.id] : []), ...pendingEnds])];
      const del = [...pendingDeletes.values()].map(({ live, video }) => ({ live, video: video ?? null }));
      fs.mkdirSync(path.dirname(o.stateFile), { recursive: true });
      fs.writeFileSync(`${o.stateFile}.tmp`, `${JSON.stringify({ open: ids, delete: del, at: new Date(now()).toISOString() })}\n`, { mode: 0o600 });
      fs.renameSync(`${o.stateFile}.tmp`, o.stateFile);
    } catch (err) { event('fb_error', { what: 'write the state file', message: clip(err?.message ?? err, 200) }); }
  };
  const isId = (x) => /^\d{1,30}$/.test(String(x ?? ''));
  const loadState = () => {
    try {
      const j = JSON.parse(fs.readFileSync(o.stateFile, 'utf8'));
      return {
        open: (j.open ?? []).filter(isId).map(String),
        del: (j.delete ?? []).filter((e) => isId(e?.live)).map((e) => ({ live: String(e.live), video: isId(e.video) ? String(e.video) : null })),
      };
    } catch { return { open: [], del: [] }; }
  };

  /**
   * Delete an ended live video of ours (FB_DELETE_AFTER): the live video object, which takes its recording with it
   * (measured 2026-10-08 on a profile; deleting the recording's own id is refused there: "publish_actions ...
   * deprecated"), else the recording's id.
   * An id Facebook no longer knows counts as deleted; any other failure is kept and tried again (every 30 s and at
   * the next start), giving up after 20 tries.
   */
  async function removeVideo(entry, why) {
    const e = { live: String(entry.live), video: entry.video ? String(entry.video) : null, tries: (pendingDeletes.get(String(entry.live))?.tries ?? 0) + 1 };
    let deleted = null;
    let keep = false;
    for (const id of [e.live, e.video].filter(isId)) {
      try { await graph.deleteVideo(id); deleted = id; break; } catch (err) {
        const unknown = err.code === 100 && (Number(err.subcode) === 33 || /does not exist|cannot be loaded/i.test(err.message));
        if (!unknown) keep = true; // anything else (busy, still processing, a rate limit): try again later
      }
    }
    if (!deleted && keep && e.tries < 20) {
      pendingDeletes.set(e.live, e);
      saveState();
      return false;
    }
    pendingDeletes.delete(e.live);
    event(deleted ? 'fb_live_deleted' : 'fb_delete_gave_up', { broadcast: e.live, video: e.video, deletedId: deleted, why: clip(why, 120), tries: e.tries });
    saveState();
    return Boolean(deleted);
  }

  /** End a live video; on failure it is kept and tried again later (every minute, and at the next start). */
  async function endVideo(id, why) {
    try {
      await graph.endLive(id);
      pendingEnds.delete(id);
      event('fb_live_ended', { broadcast: id, why: clip(why, 120) });
      return true;
    } catch (err) {
      // a live video Facebook has ended or removed already answers with an error that will never change
      if (!err.transient && !err.rate && err.status >= 400 && err.status < 500) { pendingEnds.delete(id); event('fb_live_ended', { broadcast: id, why: `already over (${clip(err.message, 120)})` }); return true; }
      pendingEnds.add(id);
      return false;
    } finally { saveState(); }
  }

  /** At start, and after a failed create: end what a crash or an unclear answer left open. */
  async function sweep() {
    const st = loadState();
    for (const id of st.open) {
      if (id === b?.id) continue;
      await endVideo(id, 'left open by an earlier run');
      if (deleteAfter) await removeVideo({ live: id }, 'left by an earlier run');
    }
    for (const e of st.del) if (e.live !== b?.id) await removeVideo(e, 'its delete failed in an earlier run');
    try {
      const list = await graph.listLive();
      for (const v of list?.data ?? []) {
        // ours only: the marker sentence in the description (a live video the owner made by hand is never touched)
        if (!v?.id || String(v.id) === b?.id || !String(v.description ?? '').includes(MARKER)) continue;
        if (OPEN.has(String(v.status))) {
          event('fb_orphan', { broadcast: v.id, status: v.status });
          await endVideo(String(v.id), 'an open live video of ours that no game uses');
        }
        if (deleteAfter) await removeVideo({ live: String(v.id), video: v.video?.id ?? null }, 'a live video of ours left after its game');
      }
    } catch { /* logged by the Graph client; tried again before the next create */ }
  }

  const retryTimer = setInterval(() => {
    for (const id of [...pendingEnds]) if (id !== b?.id) endVideo(id, 'trying again').catch(() => {});
    for (const e of [...pendingDeletes.values()]) if (e.live !== b?.id) removeVideo(e, 'trying again').catch(() => {});
    if (o.gameTtlMs > 0) {
      for (const g of [...games.values()]) if (now() - g.seenAt > o.gameTtlMs) api.stop(g.id, 'the agent stopped reporting the game');
    }
  }, o.sweepMs ?? 30_000);
  retryTimer.unref?.();

  /**
   * Live only on demand: a game is filmed only after live_view asked for it (a game that merely started, a staging
   * check or a bench never goes live). The games that asked, newest request first.
   */
  const wanted = () => [...games.values()].filter((g) => g.requestedAt > 0).sort((x, y) => y.requestedAt - x.requestedAt);
  /** The game the camera should film: the one whose live_view request came last. */
  const pick = () => wanted()[0]?.id ?? null;

  // ----- the broadcast's life, one step at a time
  function kick() {
    dirty = true;
    running ??= (async () => {
      try {
        while (dirty) {
          dirty = false;
          await reconcile();
        }
      } catch (err) {
        event('fb_error', { what: 'the channel', message: clip(err?.message ?? err) });
      } finally { running = null; }
    })();
    return running;
  }

  async function reconcile() {
    swept ??= sweep();
    await swept;
    focus = pick();
    if (b && (closing || !focus)) { await finish(closing ? 'the service stopped' : 'no game that asked for it is left'); return; }
    if (closing || !focus) return;
    if (!b) {
      if (restingUntil > now()) return;
      await begin();
      return;
    }
    if (b.stream && focus && b.game !== focus && b.state !== 'ending') {
      const g = games.get(focus);
      const from = b.game;
      b.game = focus;
      event('fb_camera', { broadcast: b.id, from, to: focus });
      try { await b.stream.follow(g.player); } catch (err) { event('fb_error', { what: 'move the camera', message: clip(err?.message ?? err) }); }
      graph.updateLive(b.id, { title: titleFor(title, focus) }).catch(() => {});
    }
  }

  async function begin() {
    const game = games.get(focus);
    const me = { id: null, videoId: null, game: focus, state: 'starting', createdAt: now(), liveAt: 0, publishing: false, stream: null, timer: null, status: null, videoUrl: null, embedUrl: null };
    b = me;
    try {
      const r = await graph.createLive({ title: titleFor(title, game.id), description: DESCRIPTION });
      if (!r?.id) throw new Error('the Graph API created no live video');
      me.id = String(r.id);
      saveState();
      let ingest = r.secure_stream_url ?? null;
      if (!ingest) ingest = (await graph.getLive(me.id, 'secure_stream_url'))?.secure_stream_url ?? null;
      graph.hide(ingest);
      if (!ingest || !(/^rtmps:\/\//i.test(ingest) || (o.allowPlainRtmp && /^rtmp:\/\//i.test(ingest)))) throw new Error('the live video has no rtmps ingest URL');
      const info = await graph.getLive(me.id, 'status,permalink_url,embed_html,video');
      me.status = info?.status ?? null;
      me.videoId = isId(info?.video?.id) ? String(info.video.id) : null;
      me.videoUrl = videoUrlOf(info, await graph.ownerId().catch(() => null));
      me.embedUrl = me.videoUrl ? facebookEmbedUrl(me.videoUrl) : null;
      if (o.privacy && me.videoId) {
        // measured 2026-10-08: asked for EVERYONE, Facebook stored "Only me", and the player shows "Video Unavailable"
        const p = await graph.getLive(me.videoId, 'privacy').catch(() => null);
        const got = p?.privacy?.value ?? null;
        if (got && got !== o.privacy) {
          me.warning = `Facebook stored this live video as "${clip(p.privacy.description || got, 40)}" (${got}), not ${o.privacy}: the player shows "Video unavailable" to anyone but its owner. Facebook caps a video at the audience the owner allowed the app (Facebook settings, Apps and websites).`;
          event('fb_privacy', { broadcast: me.id, asked: o.privacy, got });
        }
      }
      event('fb_live_created', { broadcast: me.id, game: game.id, video: me.videoUrl, status: me.status });
      if (b !== me) return;
      if (closing || !pick()) { await finish(closing ? 'the service stopped' : 'no game that asked for it is left'); return; }
      const now0 = games.get(me.game) && games.get(me.game).requestedAt > 0 ? me.game : pick();
      me.game = now0;
      me.state = 'connecting';
      const stream = o.createStream({ ...(o.streamOptions ?? {}), output: ingest, player: games.get(now0).player, event: (k, d) => event(k, { session: now0, broadcast: me.id, ...d }) });
      me.stream = stream;
      stream.on?.('stream_publishing', () => { me.publishing = true; me.publishingAt = now(); poll(me, Math.min(settleMs + 100, pollMs)); });
      stream.finished.then((res) => { if (b === me && me.state !== 'ending') streamLost(me, res?.reason ?? 'the stream ended'); });
      Promise.resolve().then(() => stream.start()).catch((err) => { if (b === me && me.state !== 'ending') streamLost(me, `could not start: ${clip(err?.message ?? err)}`); });
      poll(me, pollMs);
      lastError = null;
    } catch (err) {
      const why = explain(err);
      lastError = graph.scrub(why.text);
      event('fb_live_failed', { broadcast: me.id, game: game?.id ?? null, reason: lastError, permanent: why.permanent });
      if (b === me) b = null;
      if (me.id) {
        await endVideo(me.id, 'its start failed');
        if (deleteAfter) await removeVideo({ live: me.id, video: me.videoId }, 'its start failed');
      }
      swept = sweep(); // an unclear create may have left a live video behind
      rest(why.permanent ? o.permanentRetryMs ?? 600_000 : null);
    }
  }

  /**
   * After a failure: wait before the next try (5 s, 15 s, 30 s, 1 min, 2 min), or `ms` for a refusal that only a person
   * can fix (eligibility, the token), which is still tried now and then so a fix needs no restart.
   */
  function rest(ms = null) {
    const t = now();
    failures = failures.filter((x) => x > t - 600_000);
    failures.push(t);
    const wait = ms ?? retryMs[Math.min(retryMs.length - 1, failures.length - 1)];
    restingUntil = t + wait;
    setTimeout(() => kick(), wait + 10).unref?.();
  }

  function streamLost(me, why) {
    if (me.lost) return; // the stream's end and Facebook's can come together: one failure
    me.lost = true;
    lastError = graph.scrub(clip(why, 200));
    event('fb_stream_lost', { broadcast: me.id, reason: lastError });
    rest();
    finish(`the stream failed: ${why}`, me).finally(() => kick());
  }

  /** Is it live? Read the live video's status until Facebook shows it, then now and then (has Facebook ended it?). */
  function poll(me, ms) {
    clearTimeout(me.timer);
    me.timer = setTimeout(async () => {
      if (b !== me || me.state === 'ending') return;
      try {
        const info = await graph.getLive(me.id, me.videoUrl ? 'status' : 'status,permalink_url,embed_html,video');
        if (b !== me || me.state === 'ending') return;
        if (!me.videoUrl) {
          me.videoId ??= isId(info?.video?.id) ? String(info.video.id) : null;
          me.videoUrl = videoUrlOf(info, await graph.ownerId().catch(() => null));
          me.embedUrl = me.videoUrl ? facebookEmbedUrl(me.videoUrl) : null;
        }
        if (info?.status !== me.status) event('fb_status', { broadcast: me.id, status: info?.status ?? null, publishing: me.publishing });
        me.status = info?.status ?? null;
        if (ENDED.has(String(me.status))) { streamLost(me, `Facebook ended the live video (${me.status})`); return; }
        if (me.status === 'LIVE' && me.publishing && now() - me.publishingAt >= settleMs && me.state !== 'live') {
          me.state = 'live';
          me.liveAt = now();
          event('fb_live', { broadcast: me.id, game: me.game, afterMs: me.liveAt - me.createdAt, video: me.videoUrl });
        }
      } catch (err) {
        if (!err.transient && !err.rate && err.status >= 400 && err.status < 500 && err.code === 100) { streamLost(me, 'the live video is gone'); return; }
      }
      poll(me, me.state === 'live' ? livePollMs : pollMs);
    }, ms);
    me.timer.unref?.();
  }

  async function finish(why, which = b) {
    const me = which;
    if (!me || me.state === 'ending') return;
    me.state = 'ending';
    clearTimeout(me.timer);
    if (me.stream) await Promise.resolve(me.stream.stop(why)).catch(() => {});
    if (me.id) {
      await endVideo(me.id, why);
      if (deleteAfter) await removeVideo({ live: me.id, video: me.videoId }, why);
    }
    event('fb_live_stop', { broadcast: me.id, why: clip(why, 160), seconds: Math.round((now() - me.createdAt) / 1000), wasLive: Boolean(me.liveAt) });
    if (b === me) b = null;
    saveState();
  }

  const api = {
    enabled: true,
    channel: true,
    /** Put a game on the channel (its bot's name is what the camera follows). Returns {id} or null for a bad name. */
    start(id, { player, body } = {}) {
      if (closing || !ID_RE.test(String(id)) || !NAME_RE.test(String(player ?? ''))) return null;
      const known = games.get(id);
      if (known) { known.seenAt = now(); return { id }; }
      const g = { id, player, startedAt: now(), seenAt: now(), requestedAt: asked.get(id) ?? 0, offs: [] };
      asked.delete(id);
      games.set(id, g);
      if (typeof body?.on === 'function') {
        try {
          g.offs.push(body.on('skill', (evt) => api.caption(id, captionFor(evt))));
          g.offs.push(body.on('end', () => api.stop(id, 'the game ended')));
        } catch { /* no captions */ }
      }
      event('fb_game', { session: id, games: games.size });
      kick();
      return { id };
    },
    /** A game left (it ended, its lease or idle time ran out): the camera moves on, or the broadcast ends. */
    stop(id, why = 'the game ended') {
      const g = games.get(id);
      asked.delete(id);
      if (!g) return running ?? Promise.resolve();
      games.delete(id);
      for (const off of g.offs) { try { off?.(); } catch { /* ignore */ } }
      event('fb_game_end', { session: id, why: clip(why, 120), games: games.size });
      return kick();
    },
    /** live_view asked for this game: the camera films it from now on (until another game asks). Returns live(). */
    focus(id) {
      if (!ID_RE.test(String(id))) return api.live();
      const g = games.get(id);
      if (g) { g.requestedAt = now(); g.seenAt = now(); } else {
        asked.set(id, now());
        for (const [k, t] of asked) if (now() - t > 120_000) asked.delete(k);
      }
      kick();
      return api.live();
    },
    /** What the channel shows now: state off | starting | connecting | live | ending, the game on camera, the video. */
    live() {
      const asked = pick();
      const resting = !b && asked && restingUntil > now();
      return {
        fb: true,
        state: b ? (b.state === 'ending' ? 'ending' : b.state) : asked ? (resting ? 'retrying' : 'starting') : 'off',
        game: b?.game ?? asked,
        videoUrl: b?.videoUrl ?? null,
        embedUrl: b?.embedUrl ?? null,
        liveSince: b?.liveAt ? new Date(b.liveAt).toISOString() : null,
        warning: b?.warning ?? null,
        games: games.size,
        error: lastError,
        retryInS: resting ? Math.ceil((restingUntil - now()) / 1000) : null,
      };
    },
    caption(id, text, pose) {
      if (id !== b?.game || !b?.stream) return;
      if (pose) b.stream.pose?.(pose);
      b.stream.caption?.(cleanCaption(text));
    },
    has: (id) => games.has(id),
    slot: (id) => (b && b.game === id ? 0 : null),
    get size() { return games.size; },
    list: () => [...games.values()].map((g) => ({ id: g.id, state: g.id === b?.game ? b.state : 'waiting', focused: g.id === b?.game })),
    stats: (id) => (b?.stream && b.game === id ? b.stream.stats({ resources: true }) : null),
    graphStats: () => graph.stats(),
    /** Every game off the channel, the stream stopped and the live video ended. */
    async stopAll(why = 'shutdown') {
      closing = true;
      for (const id of [...games.keys()]) api.stop(id, why);
      await kick();
      if (b) await finish(why);
      clearInterval(retryTimer);
    },
    /** (tests) the work in progress has settled. */
    settled: async () => { while (running) await running; },
  };
  kick(); // the sweep of what an earlier run left open
  return api;
}
