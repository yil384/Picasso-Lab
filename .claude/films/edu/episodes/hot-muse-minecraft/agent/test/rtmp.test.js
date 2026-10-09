// test/rtmp.test.js - the RTMP(S) publisher (src/rtmp.js): the ingest URL split into where to connect and the key,
// AMF0, chunks (every header form, extended timestamps, the peer's chunk size), FLV tags across reads, a publish to a
// scripted server (the commands in order, the key only inside the RTMP session, a refusal scrubbed of the key), and end
// to end: real ffmpeg -> fd 3 -> the publisher -> ffmpeg's own RTMP server as the sink, which receives playable H.264 +
// AAC under the exact key while no process on this machine has the key on its command line (ps, or /proc/*/cmdline
// and our own /proc/*/environ on Linux).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {
  splitRtmpUrl, scrubKey, amfEncode, amfDecode, AmfObject, ecmaArray, encodeMessage, createChunkReader, createFlvReader, createRtmpPublisher,
} from '../src/rtmp.js';
import { ffmpegArgs, findFfmpeg, spawnEncoder } from '../src/stream.js';
import { processTexts, rtmpSink, freePort, tlsFront } from './rtmp-sink.js';

const KEY = 'FB-1093847561-0-AbzYxWvUtSrQp?s_bl=1&s_psm=1&s_sc=1093847562&s_sw=0&s_vt=api-s&a=AbwXyZ123';
const FB = `rtmps://live-api-s.facebook.com:443/rtmp/${KEY}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 10_000) {
  const t0 = Date.now();
  while (!(await fn())) {
    if (Date.now() - t0 > ms) throw new Error('timed out waiting');
    await sleep(25);
  }
}

test('ingest URL: host, port, app and the key (its query too); a URL without a key is refused; the key scrubbed from text', () => {
  assert.deepEqual(splitRtmpUrl(FB), { protocol: 'rtmps', host: 'live-api-s.facebook.com', port: 443, app: 'rtmp', key: KEY, tcUrl: 'rtmps://live-api-s.facebook.com:443/rtmp' });
  assert.equal(splitRtmpUrl('rtmp://127.0.0.1/live/abc').port, 1935);
  assert.equal(splitRtmpUrl('rtmps://x.example/app/k').port, 443);
  assert.equal(splitRtmpUrl('rtmp://[::1]:1940/app/k/x').host, '::1');
  assert.equal(splitRtmpUrl('rtmp://[::1]:1940/app/k/x').key, 'k/x');
  for (const bad of ['rtmp://host/app', 'rtmp://host/', 'http://host/app/key', 'rtmps://host:99999/app/key']) assert.throws(() => splitRtmpUrl(bad), /ingest URL/, bad);
  assert.equal(scrubKey(`could not publish ${KEY} (${encodeURIComponent(KEY)})`, KEY), 'could not publish *** (***)');
});

test('AMF0: numbers, strings, booleans, null, objects, ECMA and strict arrays both ways', () => {
  const buf = amfEncode('connect', 1, new AmfObject({ app: 'rtmp', tcUrl: 'rtmps://h:443/rtmp', n: 2.5, ok: true }), null, ecmaArray({ width: 1280, encoder: 'x' }), [1, 'a']);
  const v = amfDecode(buf);
  assert.deepEqual(v.slice(0, 2), ['connect', 1]);
  assert.deepEqual({ ...v[2] }, { app: 'rtmp', tcUrl: 'rtmps://h:443/rtmp', n: 2.5, ok: true });
  assert.equal(v[3], null);
  assert.deepEqual({ ...v[4] }, { width: 1280, encoder: 'x' });
  assert.deepEqual(v[5], [1, 'a']);
  assert.equal(buf[buf.indexOf(Buffer.from('width')) - 2 - 4 - 1], 0x08, 'onMetaData style ECMA array');
  assert.deepEqual(amfDecode(Buffer.concat([amfEncode('x'), Buffer.from([0x02, 0x00])])), ['x'], 'a cut value ends the list');
});

test('chunks: a large message split at the chunk size, extended timestamps in every chunk, and fmt 1-3 headers read back', () => {
  const payload = Buffer.alloc(10_000, 7);
  const got = [];
  const reader = createChunkReader((m) => got.push(m));
  const ext = encodeMessage({ csid: 6, type: 9, streamId: 1, timestamp: 0x1234567, payload }, 4096);
  assert.equal(ext.length, 12 + 4 + 10_000 + 2 * (1 + 4), 'type-0 header, extended timestamp, two continuation chunks that repeat it');
  // the peer announces 4096 first; fed one byte at a time
  const all = Buffer.concat([encodeMessage({ csid: 2, type: 1, payload: Buffer.from([0, 0, 16, 0]) }), ext]);
  for (const b of all) reader.push(Buffer.from([b]));
  assert.equal(reader.chunkSize, 4096);
  assert.equal(got.length, 2);
  assert.deepEqual([got[1].csid, got[1].type, got[1].streamId, got[1].timestamp, got[1].payload.length], [6, 9, 1, 0x1234567, 10_000]);
  // hand-made compressed headers: fmt 0 at 1000, fmt 1 +40 with a new length, fmt 2 +40, fmt 3 (+40 again)
  const r2 = [];
  const reader2 = createChunkReader((m) => r2.push(m));
  const h0 = Buffer.from([0x04, 0x00, 0x03, 0xe8, 0x00, 0x00, 0x02, 0x08, 0x01, 0x00, 0x00, 0x00, 0xaa, 0xbb]);
  const h1 = Buffer.from([0x44, 0x00, 0x00, 0x28, 0x00, 0x00, 0x01, 0x08, 0xcc]);
  const h2 = Buffer.from([0x84, 0x00, 0x00, 0x28, 0xdd]);
  const h3 = Buffer.from([0xc4, 0xee]);
  reader2.push(Buffer.concat([h0, h1, h2, h3]));
  assert.deepEqual(r2.map((m) => [m.timestamp, m.payload.toString('hex'), m.streamId]), [[1000, 'aabb', 1], [1040, 'cc', 1], [1080, 'dd', 1], [1120, 'ee', 1]]);
  assert.throws(() => createChunkReader(() => {}).push(Buffer.from([0x45, 0, 0, 0, 0, 0, 1, 8])), /without a full header/);
});

test('FLV: tags read across arbitrary reads, with 32-bit timestamps', () => {
  const tag = (type, ts, data) => {
    const h = Buffer.alloc(11);
    h[0] = type; h.writeUIntBE(data.length, 1, 3); h.writeUIntBE(ts & 0xffffff, 4, 3); h[7] = (ts >>> 24) & 0xff;
    const prev = Buffer.alloc(4); prev.writeUInt32BE(11 + data.length);
    return Buffer.concat([h, data, prev]);
  };
  const file = Buffer.concat([Buffer.from('FLV\x01\x05\x00\x00\x00\x09\x00\x00\x00\x00', 'latin1'), tag(18, 0, Buffer.from('meta')), tag(9, 33, Buffer.alloc(300, 1)), tag(8, 0x01000020, Buffer.from('au'))]);
  const tags = [];
  const r = createFlvReader((t) => tags.push({ ...t, data: t.data.toString('latin1').slice(0, 4) }));
  for (let i = 0; i < file.length; i += 7) r.push(file.subarray(i, i + 7));
  assert.deepEqual(tags.map((t) => [t.type, t.timestamp]), [[18, 0], [9, 33], [8, 0x01000020]]);
  assert.equal(tags[0].data, 'meta');
  assert.throws(() => createFlvReader(() => {}).push(Buffer.from('NOTFLV-at-all')), /not an FLV/);
});

/** A scripted RTMP server: the handshake, then answers per command; records every message it gets. */
function scriptedServer({ refusePublish = false } = {}) {
  const got = [];
  const server = net.createServer((sock) => {
    let hs = Buffer.alloc(0);
    let shook = false;
    const reader = createChunkReader((m) => {
      got.push(m);
      if (m.type !== 20) return;
      const [name, id] = amfDecode(m.payload);
      const reply = (...v) => sock.write(encodeMessage({ csid: 3, type: 20, streamId: m.streamId, payload: amfEncode(...v) }, 128));
      if (name === 'connect') {
        sock.write(encodeMessage({ csid: 2, type: 5, payload: Buffer.from([0, 0, 0x10, 0]) }, 128)); // window ack 4096
        sock.write(encodeMessage({ csid: 2, type: 4, payload: Buffer.from([0, 6, 0, 0, 1, 2]) }, 128)); // ping
        reply('_result', id, new AmfObject({ fmsVer: 'test' }), new AmfObject({ code: 'NetConnection.Connect.Success', level: 'status' }));
      }
      if (name === 'releaseStream') reply('_error', id, null, new AmfObject({ code: 'NetConnection.Call.Failed', level: 'error' }));
      if (name === 'createStream') reply('_result', id, null, 7);
      if (name === 'publish') {
        reply('onStatus', 0, null, refusePublish
          ? new AmfObject({ level: 'error', code: 'NetStream.Publish.BadName', description: `${amfDecode(m.payload)[3]} is already publishing` })
          : new AmfObject({ level: 'status', code: 'NetStream.Publish.Start', description: 'go' }));
      }
    });
    sock.on('data', (d) => {
      if (!shook) {
        hs = Buffer.concat([hs, d]);
        if (hs.length >= 1537 && !sock.s1) {
          sock.s1 = Buffer.alloc(1536, 3);
          sock.write(Buffer.concat([Buffer.from([3]), sock.s1, hs.subarray(1, 1537)]));
        }
        if (hs.length >= 1537 + 1536) {
          assert.deepEqual(hs.subarray(1537, 1537 + 1536), sock.s1, 'C2 echoes S1');
          shook = true;
          const rest = hs.subarray(1537 + 1536);
          if (rest.length) reader.push(rest);
        }
        return;
      }
      reader.push(d);
    });
    sock.on('error', () => {});
  });
  return { server, got };
}

const flvHeader = () => Buffer.from('FLV\x01\x05\x00\x00\x00\x09\x00\x00\x00\x00', 'latin1');
const flvTag = (type, ts, data) => {
  const h = Buffer.alloc(11);
  h[0] = type; h.writeUIntBE(data.length, 1, 3); h.writeUIntBE(ts, 4, 3);
  const p = Buffer.alloc(4); p.writeUInt32BE(11 + data.length);
  return Buffer.concat([h, data, p]);
};

test('publisher: handshake, connect, createStream, publish(key, live), then @setDataFrame and the tags; pings answered; a refusal is an error without the key', async () => {
  const { server, got } = scriptedServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `rtmp://127.0.0.1:${server.address().port}/rtmp/${KEY}`;
  const rows = [];
  try {
    const { PassThrough } = await import('node:stream');
    const input = new PassThrough();
    const pub = createRtmpPublisher({ url, event: (k, d) => rows.push({ k, ...d }) }).input(input);
    // tags that come before the publish starts wait for it
    input.write(Buffer.concat([flvHeader(), flvTag(18, 0, amfEncode('onMetaData', ecmaArray({ width: 1280 }))), flvTag(9, 0, Buffer.alloc(9000, 1))]));
    await new Promise((resolve, reject) => { pub.once('publishing', resolve); pub.once('error', reject); });
    input.write(flvTag(8, 21, Buffer.from([0xaf, 1, 2])));
    await until(() => got.some((m) => m.type === 8));
    input.end();
    await new Promise((r) => pub.once('close', r));
    const commands = got.filter((m) => m.type === 20).map((m) => amfDecode(m.payload));
    assert.deepEqual(commands.map((c) => c[0]), ['connect', 'releaseStream', 'FCPublish', 'createStream', 'publish', 'FCUnpublish', 'deleteStream']);
    assert.deepEqual({ ...commands[0][2] }, { app: 'rtmp', type: 'nonprivate', flashVer: 'FMLE/3.0 (compatible; FMSc/1.0)', swfUrl: `rtmp://127.0.0.1:${server.address().port}/rtmp`, tcUrl: `rtmp://127.0.0.1:${server.address().port}/rtmp` });
    assert.equal(JSON.stringify(commands[0]).includes(KEY), false, 'the key is not in connect');
    assert.deepEqual(commands[4].slice(2), [null, KEY, 'live']);
    assert.equal(got.find((m) => m.type === 20 && amfDecode(m.payload)[0] === 'publish').streamId, 7);
    const data = got.find((m) => m.type === 18);
    assert.deepEqual(amfDecode(data.payload).slice(0, 2), ['@setDataFrame', 'onMetaData']);
    assert.equal(got.find((m) => m.type === 9).payload.length, 9000, 'the video tag whole, across chunks');
    assert.equal(got.find((m) => m.type === 8).timestamp, 21);
    assert.ok(got.some((m) => m.type === 4 && m.payload.readUInt16BE(0) === 7 && m.payload.readUInt32BE(2) === 0x102), 'the ping answered');
    assert.ok(got.some((m) => m.type === 1 && m.payload.readUInt32BE(0) === 4096), 'our chunk size announced');
    assert.equal(JSON.stringify(rows).includes(KEY), false);
  } finally { server.close(); }

  const refusing = scriptedServer({ refusePublish: true });
  await new Promise((r) => refusing.server.listen(0, '127.0.0.1', r));
  try {
    const pub = createRtmpPublisher({ url: `rtmp://127.0.0.1:${refusing.server.address().port}/rtmp/${KEY}`, event: (k, d) => rows.push({ k, ...d }) });
    const err = await new Promise((r) => pub.once('error', r));
    assert.match(err.message, /NetStream\.Publish\.BadName: \*\*\* is already publishing/);
    assert.equal(err.message.includes(KEY), false);
    assert.equal(JSON.stringify(rows).includes(KEY), false);
  } finally { refusing.server.close(); }

  // nobody listening: an error, quickly; a server that never answers: an error after the timeout
  const dead = await new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  const e1 = await new Promise((r) => createRtmpPublisher({ url: `rtmp://127.0.0.1:${dead}/rtmp/${KEY}` }).once('error', r));
  assert.match(e1.message, /ECONNREFUSED/);
  const mute = net.createServer(() => {});
  await new Promise((r) => mute.listen(0, '127.0.0.1', r));
  try {
    const e2 = await new Promise((r) => createRtmpPublisher({ url: `rtmp://127.0.0.1:${mute.address().port}/rtmp/${KEY}`, timeoutMs: 300 }).once('error', r));
    assert.match(e2.message, /did not start the stream within 0 s \(handshake\)/);
  } finally { mute.close(); }
});

test('end to end: ffmpeg -> fd 3 -> the publisher -> rtmps (TLS) -> an RTMP server; the key arrives in the session and is on no command line', { timeout: 60_000 }, async (t) => {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) { t.skip('no ffmpeg'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-rtmp-e2e-'));
  const port = await freePort();
  const sink = await rtmpSink(ffmpeg, dir, port);
  const front = await tlsFront(dir, port); // rtmps like Facebook's ingest; plain rtmp where openssl is missing
  const url = front ? `rtmps://localhost:${front.port}/rtmp/${KEY}` : `rtmp://127.0.0.1:${port}/rtmp/${KEY}`;
  const rows = [];
  try {
    const args = ffmpegArgs({ output: url, testSource: '320x180', width: 640, height: 360, fps: 15, bitrateK: 600, progress: false });
    assert.equal(args.join(' ').includes(KEY), false);
    const { child, publisher } = spawnEncoder({ ffmpeg, args, output: url, ca: front?.ca, stdio: ['ignore', 'ignore', 'pipe'], event: (k, d) => rows.push({ k, ...d }) });
    await new Promise((resolve, reject) => { publisher.once('publishing', resolve); publisher.once('error', reject); });
    await sleep(2_500);
    const seen = processTexts();
    assert.ok(seen.some((l) => l.includes('pipe:3')), 'the scan sees our ffmpeg');
    assert.deepEqual(seen.filter((l) => l.includes(KEY) || l.includes('AbzYxWvUtSrQp')), [], 'no command line (or environment of ours) carries the key');
    child.kill('SIGINT');
    await new Promise((r) => child.once('exit', r));
    await new Promise((r) => (sink.child.exitCode !== null ? r() : sink.child.once('exit', r)));
    assert.match(sink.log(), new RegExp(`Unexpected stream ${KEY.replace(/[?.]/g, '\\$&')}, expecting sink`), 'the RTMP server got the exact key');
    const probe = JSON.parse(execFileSync(ffmpeg.replace(/ffmpeg$/, 'ffprobe'), ['-v', 'error', '-show_entries', 'stream=codec_name,width,height:format=duration', '-of', 'json', sink.out], { encoding: 'utf8' }));
    assert.deepEqual(probe.streams.map((s) => s.codec_name).sort(), ['aac', 'h264']);
    assert.equal(probe.streams.find((s) => s.codec_name === 'h264').width, 640);
    assert.ok(Number(probe.format.duration) > 2, `about 3 s of video arrived (${probe.format.duration})`);
    assert.ok(rows.some((r) => r.k === 'stream_publishing'));
    assert.equal(JSON.stringify(rows).includes(KEY), false);
    if (front) assert.ok(rows.some((r) => r.k === 'rtmp_publishing' && r.host === 'localhost'), 'published over TLS');
  } finally {
    front?.close();
    if (sink.child.exitCode === null) sink.child.kill('SIGKILL');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
