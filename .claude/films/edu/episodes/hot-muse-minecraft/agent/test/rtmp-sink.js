// test/rtmp-sink.js - helpers for the end-to-end stream tests (test/rtmp.test.js, test/fb-live.test.js): a local RTMP
// server (ffmpeg -listen) as the sink, and a scan of every process's command line on this machine for a stream key.

import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import tls from 'node:tls';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Every process's command line on this machine (ps, or /proc on Linux), and on Linux our own processes' environments. */
export function processTexts() {
  if (process.platform === 'linux') {
    const out = [];
    for (const pid of fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
      try { out.push(fs.readFileSync(`/proc/${pid}/cmdline`, 'latin1').replace(/\0/g, ' ')); } catch { /* gone, or not readable */ }
      try { out.push(fs.readFileSync(`/proc/${pid}/environ`, 'latin1').replace(/\0/g, ' ')); } catch { /* another user's */ }
    }
    return out;
  }
  return execFileSync('ps', ['-axww', '-o', 'pid=,command='], { encoding: 'latin1', maxBuffer: 64 * 1024 * 1024 }).split('\n');
}

/** ffmpeg's own RTMP server, listening under another stream name: it logs the name it receives ("Unexpected stream"). */
export async function rtmpSink(ffmpeg, dir, port) {
  const out = path.join(dir, 'sink.flv');
  const log = path.join(dir, 'sink.log');
  const fd = fs.openSync(log, 'w');
  const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'info', '-listen', '1', '-timeout', '30', '-i', `rtmp://127.0.0.1:${port}/rtmp/sink`, '-c', 'copy', '-y', out], { stdio: ['ignore', 'ignore', fd] });
  fs.closeSync(fd);
  await sleep(700);
  return { child, out, log: () => fs.readFileSync(log, 'utf8') };
}

export const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

/**
 * A TLS front for a plain RTMP server (rtmps://localhost:<port> -> 127.0.0.1:<plainPort>), with a self-signed
 * certificate for localhost made by openssl. Returns {port, ca, close}, or null when openssl is missing.
 */
export async function tlsFront(dir, plainPort) {
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost', '-days', '1',
      '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem')], { stdio: 'ignore' });
  } catch { return null; }
  const ca = fs.readFileSync(path.join(dir, 'c.pem'));
  const server = tls.createServer({ key: fs.readFileSync(path.join(dir, 'k.pem')), cert: ca }, (s) => {
    const up = net.connect(plainPort, '127.0.0.1');
    s.pipe(up).pipe(s);
    s.on('error', () => up.destroy());
    up.on('error', () => s.destroy());
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, ca, close: () => server.close() };
}
