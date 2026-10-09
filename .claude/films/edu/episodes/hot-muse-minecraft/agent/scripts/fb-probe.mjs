#!/usr/bin/env node
// scripts/fb-probe.mjs - one real test of the Facebook live path from this machine, outside the game: a test live video
// on the Page (status LIVE_NOW), a test pattern with a large clock streamed to it over RTMPS for --seconds (the stream
// key only in memory: src/rtmp.js), the live video's status read until Facebook shows it LIVE, the video plugin's embed
// URL fetched without a login (HTTP status and whether the page names the video), then the live video ended and the
// test video deleted. Prints only the Page's name and id, video ids, statuses and timings: never the token or the key.
//
//   node scripts/fb-probe.mjs --page-id <id> --token-file <file 600> [--seconds 60] [--keep]
//   node scripts/fb-probe.mjs --env ~/.config/picasso/fb-page.env [--token-key FB_PAGE_TOKEN_FILE]   (reads the ids and
//                                                                   the token file's path from that file)

import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { createGraph, readTokenFile, videoUrlOf } from '../src/fb-live.js';
import { facebookEmbedUrl } from '../src/config.js';
import { ffmpegArgs, findFfmpeg, findFont, spawnEncoder } from '../src/stream.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { values: v } = parseArgs({ options: {
  'page-id': { type: 'string' }, 'token-file': { type: 'string' }, env: { type: 'string' }, 'token-key': { type: 'string' },
  seconds: { type: 'string' }, keep: { type: 'boolean' }, version: { type: 'string' },
} });
const fromEnv = {};
if (v.env) for (const line of fs.readFileSync(v.env, 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z_]+)=(.*)$/); if (m) fromEnv[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); }
const pageId = v['page-id'] ?? fromEnv.FB_PAGE_ID;
const tokenFile = v['token-file'] ?? fromEnv[v['token-key'] ?? 'FB_PAGE_TOKEN_FILE'] ?? fromEnv.FB_TOKEN_FILE;
const seconds = Number(v.seconds ?? 60);
if (!/^\d{5,25}$/.test(String(pageId ?? '')) || !tokenFile) { console.error('need --page-id and --token-file (or --env)'); process.exit(2); }
readTokenFile(tokenFile); // checks it is there, private and a token; prints nothing of it
const ffmpeg = findFfmpeg();
if (!ffmpeg) { console.error('no ffmpeg'); process.exit(3); }

const rows = [];
const log = { event: (kind, data) => { rows.push({ kind, ...data }); if (kind === 'fb_error') console.log(`  graph error (${data.what}): ${data.message}`); } };
const graph = createGraph({ pageId, tokenFile, version: v.version, log });
const t0 = Date.now();
const at = () => `${((Date.now() - t0) / 1000).toFixed(1)} s`;
const out = { page: null, liveVideo: null, video: null, statuses: [], liveAfterS: null, plugin: null, ended: false, deleted: false };
let child = null;
let id = null;
try {
  const page = await graph.page();
  out.page = { id: page.id, name: page.name };
  console.log(`Page: ${page.name} (${page.id})`);
  const r = await graph.createLive({ title: 'TEST: Picasso Lab live probe (deleted after the test)', description: 'An automatic test of the live video path. It is ended and deleted within two minutes.' });
  id = String(r.id);
  graph.hide(r.secure_stream_url);
  out.liveVideo = id;
  console.log(`${at()} live video ${id} created; ingest ${r.secure_stream_url ? r.secure_stream_url.replace(/^(rtmps?:\/\/[^/]+\/[^/]+\/).*$/, '$1***') : '(none)'}`);
  const info = await graph.getLive(id, 'status,permalink_url,embed_html,video');
  const videoUrl = videoUrlOf(info, pageId);
  out.video = { id: info?.video?.id ?? null, url: videoUrl, permalink: info?.permalink_url ?? null };
  out.statuses.push({ at: at(), status: info?.status ?? null });
  console.log(`${at()} status ${info?.status}; video ${videoUrl}`);
  const font = findFont();
  const args = ffmpegArgs({ output: r.secure_stream_url, testSource: '1280x720', width: 1280, height: 720, fps: 30, bitrateK: 2500, font, clock: Boolean(font), progress: false });
  const enc = spawnEncoder({ ffmpeg, args, output: r.secure_stream_url, stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, TZ: 'America/Los_Angeles' }, event: (k, d) => log.event(k, d) });
  child = enc.child;
  let err = '';
  child.stderr.on('data', (d) => { err = (err + d).slice(-2000); });
  enc.publisher.once('publishing', () => console.log(`${at()} the ingest accepted the stream (NetStream.Publish.Start)`));
  enc.publisher.once('error', (e) => console.log(`${at()} publisher error: ${e.message}`));
  const until = Date.now() + seconds * 1000;
  let last = info?.status;
  while (Date.now() < until && child.exitCode === null) {
    await sleep(3_000);
    const s = await graph.getLive(id, 'status').catch(() => null);
    if (s?.status && s.status !== last) { last = s.status; out.statuses.push({ at: at(), status: last }); console.log(`${at()} status ${last}`); }
    if (last === 'LIVE' && out.liveAfterS === null) out.liveAfterS = Number(((Date.now() - t0) / 1000).toFixed(1));
    if (last === 'LIVE' && !out.plugin && videoUrl) {
      await sleep(5_000);
      const embed = facebookEmbedUrl(videoUrl);
      const res = await fetch(embed, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36', 'accept-language': 'en-US' } });
      const html = await res.text();
      const markers = ['is_live', 'playable_url', 'dash_manifest', 'hd_src', 'sd_src', 'videoID', 'video_id', String(out.video.id), "isn't available", 'not available', 'login'].filter((m) => m && html.includes(m));
      out.plugin = { url: embed, status: res.status, bytes: html.length, markers };
      console.log(`${at()} plugin ${res.status}, ${html.length} bytes, markers: ${markers.join(', ') || 'none'}`);
    }
  }
  if (child.exitCode !== null) console.log(`${at()} ffmpeg exited early (${child.exitCode}): ${err.split('\n').filter(Boolean).slice(-2).join(' | ')}`);
} catch (e) {
  console.log(`${at()} failed: ${graph.scrub(e.message)}`);
} finally {
  if (child && child.exitCode === null) { child.kill('SIGINT'); await Promise.race([new Promise((r) => child.once('exit', r)), sleep(8_000)]); }
  if (id) {
    try { await graph.endLive(id); out.ended = true; console.log(`${at()} live video ended`); } catch (e) { console.log(`${at()} end failed: ${graph.scrub(e.message)}`); }
    const after = await graph.getLive(id, 'status,video').catch(() => null);
    if (after?.status) out.statuses.push({ at: at(), status: after.status });
    const vid = out.video?.id ?? after?.video?.id;
    if (!v.keep && vid) {
      await sleep(3_000);
      try { await graph.deleteVideo(vid); out.deleted = true; console.log(`${at()} test video ${vid} deleted`); } catch (e) {
        console.log(`${at()} delete of video ${vid} failed: ${graph.scrub(e.message)}; trying the live video object`);
        try { await graph.deleteVideo(id); out.deleted = true; console.log(`${at()} live video object ${id} deleted`); } catch (e2) { console.log(`${at()} delete failed too: ${graph.scrub(e2.message)}`); }
      }
    }
  }
  console.log(JSON.stringify(out));
}
