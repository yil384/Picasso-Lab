// src/rtmp.js - an RTMP(S) publisher in Node for the live video. ffmpeg writes FLV to a pipe (its fd 3) and this sends
// it to the ingest (Facebook Live) with the stream key held in memory only: the key is never on a command line, in a
// file or in a child's environment. picasso has no hidepid, so every user there can read every /proc/<pid>/cmdline,
// and neither ffmpeg build we run can take the key from a file (5.1 in the camera image and 9.0 on the Mac both refuse
// `-/rtmp_playpath file`; `-fpre` sets it but it never reaches the protocol).
//
// The protocol part is the plain publisher that OBS-style encoders use: the simple handshake (C0/C1, S0/S1, C2, S2),
// connect, releaseStream, FCPublish, createStream, publish(key, "live"), then @setDataFrame and the FLV audio and video
// tags as RTMP messages (type-0 chunk headers, a 4096-byte chunk size). It answers pings, acknowledges what it
// receives, and gives up (an error, never a hang) when the ingest refuses, stalls or falls behind. Errors and log rows
// never carry the key.

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import net from 'node:net';
import tls from 'node:tls';

const HANDSHAKE = 1536;
export const OUT_CHUNK = 4096;
const CS_CONTROL = 2;
const CS_COMMAND = 3;
const CS_AUDIO = 4;
const CS_VIDEO = 6;
const CS_STREAM = 8;
const T = Object.freeze({ CHUNK_SIZE: 1, ABORT: 2, ACK: 3, USER: 4, WINDOW: 5, PEER_BW: 6, AUDIO: 8, VIDEO: 9, DATA: 18, COMMAND: 20 });

// ----- the URL

/**
 * An ingest URL split into where to connect and what to publish: rtmp(s)://host[:port]/app/<stream key>. The key is
 * everything after the app (a query such as Facebook's "?s_bl=1&..." included); tcUrl is the URL without it.
 */
export function splitRtmpUrl(url) {
  const m = String(url ?? '').match(/^(rtmps?):\/\/([^/\s?#]+)\/([^/\s?#]+)\/(\S+)$/i);
  if (!m) throw new Error('the ingest URL must be rtmp(s)://host[:port]/app/<stream key>');
  const protocol = m[1].toLowerCase();
  const hp = m[2].match(/^(\[[^\]]+\]|[^:]+)(?::(\d{1,5}))?$/);
  if (!hp) throw new Error('the ingest URL has a bad host');
  const host = hp[1].replace(/^\[|\]$/g, '');
  const port = hp[2] ? Number(hp[2]) : protocol === 'rtmps' ? 443 : 1935;
  if (!(port > 0 && port < 65_536)) throw new Error('the ingest URL has a bad port');
  return { protocol, host, port, app: m[3], key: m[4], tcUrl: `${protocol}://${m[2]}/${m[3]}` };
}

/** A text with the key (and its URL-encoded form) replaced by ***. */
export function scrubKey(text, key) {
  let t = String(text ?? '');
  for (const k of [key, key && encodeURIComponent(key)]) if (k && k.length >= 4) t = t.split(k).join('***');
  return t;
}

// ----- AMF0 (the command encoding)

export class AmfObject { constructor(props) { Object.assign(this, props); } }
const ECMA = Symbol('ecma');
/** An ECMA array (AMF0 type 8): what onMetaData carries. */
export const ecmaArray = (props) => Object.assign(Object.create(null), props, { [ECMA]: true });

function amfValue(v) {
  if (v === null || v === undefined) return Buffer.from([0x05]);
  if (typeof v === 'number') { const b = Buffer.alloc(9); b[0] = 0x00; b.writeDoubleBE(v, 1); return b; }
  if (typeof v === 'boolean') return Buffer.from([0x01, v ? 1 : 0]);
  if (typeof v === 'string') {
    const s = Buffer.from(v, 'utf8');
    if (s.length > 0xffff) { const h = Buffer.alloc(5); h[0] = 0x0c; h.writeUInt32BE(s.length, 1); return Buffer.concat([h, s]); }
    const h = Buffer.alloc(3); h[0] = 0x02; h.writeUInt16BE(s.length, 1); return Buffer.concat([h, s]);
  }
  if (Array.isArray(v)) {
    const h = Buffer.alloc(5); h[0] = 0x0a; h.writeUInt32BE(v.length, 1);
    return Buffer.concat([h, ...v.map(amfValue)]);
  }
  if (typeof v === 'object') {
    const ecma = Boolean(v[ECMA]);
    const parts = [];
    if (ecma) { const h = Buffer.alloc(5); h[0] = 0x08; h.writeUInt32BE(Object.keys(v).length, 1); parts.push(h); } else parts.push(Buffer.from([0x03]));
    for (const [k, x] of Object.entries(v)) {
      const kb = Buffer.from(k, 'utf8');
      const kl = Buffer.alloc(2); kl.writeUInt16BE(kb.length, 0);
      parts.push(kl, kb, amfValue(x));
    }
    parts.push(Buffer.from([0x00, 0x00, 0x09]));
    return Buffer.concat(parts);
  }
  throw new TypeError(`AMF0 cannot encode ${typeof v}`);
}

/** AMF0 values one after another, as a command message's body. */
export const amfEncode = (...values) => Buffer.concat(values.map(amfValue));

/** Every AMF0 value in buf. Objects come back as plain objects; unknown types end the list. */
export function amfDecode(buf) {
  let at = 0;
  const need = (n) => { if (at + n > buf.length) throw new Error('AMF0 value cut short'); };
  const str = (long) => {
    need(long ? 4 : 2);
    const n = long ? buf.readUInt32BE(at) : buf.readUInt16BE(at);
    at += long ? 4 : 2;
    need(n);
    const s = buf.toString('utf8', at, at + n);
    at += n;
    return s;
  };
  const props = (o) => {
    for (;;) {
      need(3);
      if (buf.readUInt16BE(at) === 0 && buf[at + 2] === 0x09) { at += 3; return o; }
      const k = str(false);
      o[k] = value();
    }
  };
  function value() {
    need(1);
    const type = buf[at++];
    switch (type) {
      case 0x00: { need(8); const v = buf.readDoubleBE(at); at += 8; return v; }
      case 0x01: need(1); return buf[at++] !== 0;
      case 0x02: return str(false);
      case 0x03: return props({});
      case 0x05: case 0x06: return null;
      case 0x08: need(4); at += 4; return props({});
      case 0x0a: { need(4); const n = buf.readUInt32BE(at); at += 4; return Array.from({ length: n }, value); }
      case 0x0b: { need(10); const v = buf.readDoubleBE(at); at += 10; return new Date(v); }
      case 0x0c: return str(true);
      default: throw new Error(`AMF0 type ${type} not supported`);
    }
  }
  const out = [];
  while (at < buf.length) {
    try { out.push(value()); } catch { break; }
  }
  return out;
}

// ----- chunks

/**
 * One message as chunks: a type-0 header, then type-3 continuation chunks of at most chunkSize bytes. A timestamp of
 * 0xFFFFFF or more goes in the extended field, repeated in every continuation chunk.
 */
export function encodeMessage({ csid, type, streamId = 0, timestamp = 0, payload }, chunkSize = OUT_CHUNK) {
  if (!(csid >= 2 && csid <= 63)) throw new RangeError('chunk stream id must be 2-63');
  const ts = Math.max(0, Math.floor(timestamp)) >>> 0;
  const ext = ts >= 0xffffff;
  const head = Buffer.alloc(12 + (ext ? 4 : 0));
  head[0] = csid; // fmt 0
  head.writeUIntBE(ext ? 0xffffff : ts, 1, 3);
  head.writeUIntBE(payload.length, 4, 3);
  head[7] = type;
  head.writeUInt32LE(streamId >>> 0, 8);
  if (ext) head.writeUInt32BE(ts, 12);
  const parts = [head];
  for (let at = 0; at < payload.length; at += chunkSize) {
    if (at) {
      const cont = Buffer.alloc(1 + (ext ? 4 : 0));
      cont[0] = 0xc0 | csid; // fmt 3
      if (ext) cont.writeUInt32BE(ts, 1);
      parts.push(cont);
    }
    parts.push(payload.subarray(at, Math.min(payload.length, at + chunkSize)));
  }
  return Buffer.concat(parts);
}

/**
 * Reads the chunk stream: push(bytes) as they arrive, onMessage({csid, type, streamId, timestamp, payload}) for each
 * whole message. Understands every header form (fmt 0-3, 1- to 3-byte chunk stream ids, extended timestamps) and
 * follows the peer's Set Chunk Size itself.
 */
export function createChunkReader(onMessage, { maxMessage = 4 * 1024 * 1024 } = {}) {
  let buf = Buffer.alloc(0);
  let chunkSize = 128;
  const streams = new Map(); // csid -> {timestamp, delta, length, type, streamId, ext, parts, got}
  function step() {
    if (buf.length < 1) return false;
    const fmt = buf[0] >> 6;
    let csid = buf[0] & 0x3f;
    let at = 1;
    if (csid === 0) { if (buf.length < 2) return false; csid = buf[1] + 64; at = 2; } else if (csid === 1) { if (buf.length < 3) return false; csid = buf[1] + 64 + buf[2] * 256; at = 3; }
    const hlen = [11, 7, 3, 0][fmt];
    if (buf.length < at + hlen) return false;
    const prev = streams.get(csid);
    if (fmt !== 0 && !prev) throw new Error(`chunk stream ${csid} starts without a full header`);
    const s = prev ? { ...prev } : { timestamp: 0, delta: 0, length: 0, type: 0, streamId: 0, ext: false, parts: [], got: 0 };
    let field = null;
    if (fmt <= 2) field = buf.readUIntBE(at, 3);
    if (fmt <= 1) { s.length = buf.readUIntBE(at + 3, 3); s.type = buf[at + 6]; }
    if (fmt === 0) s.streamId = buf.readUInt32LE(at + 7);
    at += hlen;
    const ext = fmt <= 2 ? field === 0xffffff : s.ext;
    if (ext) { if (buf.length < at + 4) return false; if (fmt <= 2) field = buf.readUInt32BE(at); at += 4; }
    if (s.length > maxMessage) throw new Error(`message of ${s.length} bytes is too large`);
    const starting = s.got === 0;
    const take = Math.min(chunkSize, s.length - s.got);
    if (buf.length < at + take) return false;
    // the whole chunk is here: apply the header
    if (fmt <= 2) s.ext = ext;
    if (starting) {
      if (fmt === 0) { s.timestamp = field; s.delta = 0; } else if (fmt <= 2) { s.delta = field; s.timestamp = (s.timestamp + field) >>> 0; } else s.timestamp = (s.timestamp + s.delta) >>> 0;
      s.parts = [];
    }
    s.parts.push(buf.subarray(at, at + take));
    s.got += take;
    buf = buf.subarray(at + take);
    if (s.got >= s.length) {
      const payload = Buffer.concat(s.parts);
      s.parts = [];
      s.got = 0;
      streams.set(csid, s);
      if (s.type === T.CHUNK_SIZE && payload.length >= 4) chunkSize = Math.max(1, payload.readUInt32BE(0) & 0x7fffffff);
      onMessage({ csid, type: s.type, streamId: s.streamId, timestamp: s.timestamp, payload });
    } else streams.set(csid, s);
    return true;
  }
  return {
    push(bytes) {
      buf = buf.length ? Buffer.concat([buf, bytes]) : bytes;
      while (step());
    },
    get chunkSize() { return chunkSize; },
  };
}

// ----- FLV (what ffmpeg writes)

/** Reads an FLV byte stream: push(bytes); onTag({type, timestamp, data}) for each tag (8 audio, 9 video, 18 data). */
export function createFlvReader(onTag) {
  let buf = Buffer.alloc(0);
  let header = false;
  return {
    push(bytes) {
      buf = buf.length ? Buffer.concat([buf, bytes]) : bytes;
      if (!header) {
        if (buf.length < 13) return;
        if (buf.toString('latin1', 0, 3) !== 'FLV') throw new Error('not an FLV stream');
        const size = buf.readUInt32BE(5);
        if (buf.length < size + 4) return;
        buf = buf.subarray(size + 4);
        header = true;
      }
      while (buf.length >= 11) {
        const size = buf.readUIntBE(1, 3);
        if (buf.length < 11 + size + 4) return;
        const timestamp = (buf.readUIntBE(4, 3) | (buf[7] << 24)) >>> 0;
        onTag({ type: buf[0] & 0x1f, timestamp, data: buf.subarray(11, 11 + size) });
        buf = buf.subarray(11 + size + 4);
      }
    },
  };
}

// ----- the publisher

/**
 * Publish an FLV stream to an RTMP(S) ingest. The key never leaves this object: it is not logged, and errors are
 * scrubbed of it.
 * @param {object} o
 * @param {string} o.url   rtmp(s)://host[:port]/app/<stream key>
 * @param {(kind: string, data: object) => void} [o.event]   log rows (rtmp_*)
 * @param {(opts: {protocol, host, port}) => import('node:net').Socket} [o.connect]   (tests) the socket
 * @param {string|Buffer} [o.ca]      (tests) a certificate authority to trust for rtmps (the system's are trusted)
 * @param {number} [o.timeoutMs]      connect, handshake and publish must finish within this (default 20 s)
 * @param {number} [o.maxBufferBytes] bytes waiting to go out (before publishing, or on a slow link) before it gives up
 * @returns {EventEmitter & {input(stream), end(), close(), state, stats()}}  events: 'publishing', 'error', 'close'
 */
export function createRtmpPublisher(o) {
  const { protocol, host, port, app, key, tcUrl } = splitRtmpUrl(o.url);
  const timeoutMs = o.timeoutMs ?? 20_000;
  const maxBufferBytes = o.maxBufferBytes ?? 8 * 1024 * 1024;
  const me = new EventEmitter();
  const log = (kind, data = {}) => { try { o.event?.(kind, data); } catch { /* best effort */ } };
  let state = 'connecting'; // connecting -> handshake -> connecting-app -> publishing -> closing -> closed; failed
  let streamId = 0;
  let received = 0;
  let acked = 0;
  let ackWindow = 0;
  let sent = 0;
  let tags = 0;
  let pending = []; // FLV tags that came before the publish started
  let pendingBytes = 0;
  let inputDone = false;
  let txn = 1;
  const calls = new Map(); // transaction id -> name
  const fail = (err) => {
    if (state === 'failed' || state === 'closed') return;
    state = 'failed';
    clearTimeout(timer);
    const e = new Error(scrubKey(err?.message ?? err, key));
    log('rtmp_error', { host, message: e.message.slice(0, 300) });
    try { sock.destroy(); } catch { /* gone */ }
    me.emit('error', e);
    me.emit('close');
  };
  const timer = setTimeout(() => fail(new Error(`the ingest did not start the stream within ${Math.round(timeoutMs / 1000)} s (${state})`)), timeoutMs);
  timer.unref?.();

  const sock = o.connect ? o.connect({ protocol, host, port })
    : protocol === 'rtmps' ? tls.connect({ host, port, servername: net.isIP(host) ? undefined : host, ...(o.ca ? { ca: o.ca } : {}) })
      : net.connect({ host, port });
  sock.setNoDelay?.(true);
  sock.on('error', (err) => fail(new Error(`${host}:${port}: ${err?.code ?? ''} ${err?.message ?? err}`.trim())));
  sock.on('close', () => {
    if (state === 'closing') { state = 'closed'; clearTimeout(timer); me.emit('close'); return; }
    fail(new Error(`the ingest closed the connection (${state})`));
  });

  const write = (bytes) => {
    if (sock.destroyed) return;
    sent += bytes.length;
    sock.write(bytes);
    if (sock.writableLength > maxBufferBytes) fail(new Error(`the ingest is not keeping up (${Math.round(sock.writableLength / 1024)} KB waiting)`));
  };
  const send = (msg) => write(encodeMessage(msg));
  const command = (name, args, { csid = CS_COMMAND, sid = 0 } = {}) => {
    const id = txn++;
    calls.set(id, name);
    send({ csid, type: T.COMMAND, streamId: sid, payload: amfEncode(name, id, ...args) });
    return id;
  };

  // the handshake: C0+C1 -> S0+S1 -> C2 (= S1) -> S2
  let hs = Buffer.alloc(0);
  const c1 = Buffer.alloc(HANDSHAKE);
  c1.writeUInt32BE(0, 0);
  crypto.randomFillSync(c1, 8);
  let gotS1 = false;
  const reader = createChunkReader(onMessage);

  sock.once(protocol === 'rtmps' ? 'secureConnect' : 'connect', () => {
    state = 'handshake';
    write(Buffer.concat([Buffer.from([0x03]), c1]));
  });
  sock.on('data', (d) => {
    received += d.length;
    try {
      if (state === 'handshake') {
        hs = Buffer.concat([hs, d]);
        if (!gotS1 && hs.length >= 1 + HANDSHAKE) {
          if (hs[0] !== 0x03) throw new Error(`the ingest answered with RTMP version ${hs[0]}`);
          gotS1 = true;
          write(hs.subarray(1, 1 + HANDSHAKE)); // C2: S1 back
        }
        if (gotS1 && hs.length >= 1 + 2 * HANDSHAKE) {
          const rest = hs.subarray(1 + 2 * HANDSHAKE);
          hs = null;
          state = 'connecting-app';
          send({ csid: CS_CONTROL, type: T.CHUNK_SIZE, payload: u32(OUT_CHUNK) });
          command('connect', [new AmfObject({ app, type: 'nonprivate', flashVer: 'FMLE/3.0 (compatible; FMSc/1.0)', swfUrl: tcUrl, tcUrl })]);
          if (rest.length) reader.push(rest);
        }
        return;
      }
      reader.push(d);
      if (ackWindow && received - acked >= ackWindow) { acked = received; send({ csid: CS_CONTROL, type: T.ACK, payload: u32(received >>> 0) }); }
    } catch (err) { fail(err); }
  });

  function onMessage(m) {
    if (m.type === T.USER && m.payload.length >= 6 && m.payload.readUInt16BE(0) === 6) {
      const pong = Buffer.alloc(6);
      pong.writeUInt16BE(7, 0);
      m.payload.copy(pong, 2, 2, 6);
      send({ csid: CS_CONTROL, type: T.USER, payload: pong });
      return;
    }
    if (m.type === T.WINDOW && m.payload.length >= 4) { ackWindow = m.payload.readUInt32BE(0); return; }
    if (m.type !== T.COMMAND) return;
    const [name, id, , info, extra] = amfDecode(m.payload);
    const what = calls.get(id);
    if (name === '_error') {
      calls.delete(id);
      // releaseStream and FCPublish are courtesy calls some servers answer with an error; only these three matter
      if (['connect', 'createStream', 'publish'].includes(what)) fail(new Error(`the ingest refused ${what}: ${describe(info ?? extra)}`));
      return;
    }
    if (name === '_result' && what === 'connect') {
      calls.delete(id);
      command('releaseStream', [null, key]);
      command('FCPublish', [null, key]);
      command('createStream', [null]);
      return;
    }
    if (name === '_result' && what === 'createStream') {
      calls.delete(id);
      streamId = Number(info ?? extra) || 1;
      command('publish', [null, key, 'live'], { csid: CS_STREAM, sid: streamId });
      return;
    }
    if (name === 'onStatus') {
      const s = typeof info === 'object' && info ? info : typeof extra === 'object' && extra ? extra : {};
      const code = String(s.code ?? '');
      if (/error/i.test(String(s.level ?? '')) || /BadName|Failed|Rejected/i.test(code)) { fail(new Error(`the ingest said ${describe(s)}`)); return; }
      if (code === 'NetStream.Publish.Start' && state === 'connecting-app') {
        state = 'publishing';
        clearTimeout(timer);
        log('rtmp_publishing', { host, afterTags: pending.length });
        me.emit('publishing');
        for (const t of pending.splice(0)) sendTag(t);
        pendingBytes = 0;
        if (inputDone) finish();
      }
    }
  }

  function sendTag(t) {
    tags += 1;
    if (t.type === T.AUDIO) send({ csid: CS_AUDIO, type: T.AUDIO, streamId, timestamp: t.timestamp, payload: t.data });
    else if (t.type === T.VIDEO) send({ csid: CS_VIDEO, type: T.VIDEO, streamId, timestamp: t.timestamp, payload: t.data });
    else if (t.type === T.DATA) send({ csid: CS_STREAM, type: T.DATA, streamId, timestamp: t.timestamp, payload: Buffer.concat([amfEncode('@setDataFrame'), t.data]) });
  }

  const flv = createFlvReader((t) => {
    if (state === 'publishing') { sendTag(t); return; }
    if (state === 'failed' || state === 'closing' || state === 'closed') return;
    const copy = { ...t, data: Buffer.from(t.data) };
    pending.push(copy);
    pendingBytes += copy.data.length;
    if (pendingBytes > maxBufferBytes) fail(new Error(`the ingest had not started the stream after ${Math.round(pendingBytes / 1024)} KB of video`));
  });

  function finish() {
    if (state !== 'publishing') return;
    state = 'closing';
    try {
      command('FCUnpublish', [null, key]);
      command('deleteStream', [null, streamId], { csid: CS_STREAM, sid: 0 });
      sock.end();
    } catch { /* closing anyway */ }
    setTimeout(() => { if (!sock.destroyed) sock.destroy(); }, 3_000).unref?.();
  }

  me.input = (stream) => {
    stream.on('data', (d) => { try { flv.push(d); } catch (err) { fail(err); } });
    stream.on('end', () => { inputDone = true; finish(); });
    stream.on('error', () => { inputDone = true; finish(); });
    return me;
  };
  /** The encoder has finished: unpublish and close once everything is sent. */
  me.end = () => { inputDone = true; if (state === 'publishing') finish(); else me.close(); };
  /** Close at once. */
  me.close = () => {
    if (state === 'closed' || state === 'failed') return;
    state = 'closing';
    clearTimeout(timer);
    try { sock.destroy(); } catch { /* gone */ }
  };
  Object.defineProperty(me, 'state', { get: () => state });
  me.stats = () => ({ state, sentKB: Math.round(sent / 1024), tags, waitingKB: Math.round((sock.writableLength ?? 0) / 1024) });
  me.on('error', () => {}); // the owner listens; an unheard error never crashes the process
  return me;
}

const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0, 0); return b; };
const describe = (info) => {
  if (!info || typeof info !== 'object') return String(info ?? 'no reason given');
  return [info.code, info.description, info.level].filter(Boolean).join(': ').slice(0, 300) || 'no reason given';
};
