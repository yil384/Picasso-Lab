// test/fake-graph.js - a stand-in for Facebook's Graph API on loopback (tests never reach facebook.com): live videos
// of one Page (create with LIVE_NOW, read fields, end, rename, list), the token exchange, /me/accounts and debug_token
// that scripts/fb-token.mjs uses, a 190 for a wrong token, and injected faults. Every request is recorded, so tests can
// check where the token went.

import http from 'node:http';

export const PAGE_ID = '104729385761234';
export const PAGE_TOKEN = 'EAAPageTokenForTestsOnly0123456789abcdefXYZ';

/**
 * @param {object} [o]
 * @param {string} [o.token]     the Page token the API accepts (Bearer)
 * @param {string} [o.ingest]    (id) => the ingest URL a new live video gets (default: Facebook's form with a secret key)
 */
export async function fakeGraph(o = {}) {
  const token = o.token ?? PAGE_TOKEN;
  const version = o.version ?? 'v23.0';
  const ingest = o.ingest ?? ((id) => `rtmps://live-api-s.facebook.com:443/rtmp/FB-${id}-0-AbSecretStreamKey${id}?s_bl=1&s_sc=${id}&a=AbZz`);
  const videos = new Map(); // id -> {id, videoId, status, title, description, creation_time}
  const calls = [];
  const faults = []; // {when: (call) => boolean, status, error, times}
  let next = 7_100_000_000_000;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => {
      const u = new URL(req.url, 'http://x');
      const body = Object.fromEntries(new URLSearchParams(raw));
      const call = { method: req.method, path: u.pathname, url: req.url, query: Object.fromEntries(u.searchParams), body, raw, auth: req.headers.authorization ?? null };
      calls.push(call);
      const send = (status, json) => { const t = JSON.stringify(json); res.writeHead(status, { 'content-type': 'application/json' }); res.end(t); };
      const fault = faults.find((f) => f.times > 0 && f.when(call));
      if (fault) { fault.times -= 1; return send(fault.status, { error: fault.error }); }
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] !== version) return send(400, { error: { message: 'Unknown version', code: 2635 } });
      const [, a, b] = parts;
      // the helper's calls (scripts/fb-token.mjs): the token exchange carries the app secret, so no Bearer there
      if (a === 'oauth' && b === 'access_token') {
        if (call.query.client_secret !== o.appSecret || call.query.fb_exchange_token !== o.shortToken) return send(400, { error: { message: 'Error validating client secret or token', code: 1, type: 'OAuthException' } });
        return send(200, { access_token: o.longToken, token_type: 'bearer', expires_in: 5_183_944 });
      }
      if (a === 'me' && b === 'accounts') {
        if (call.auth !== `Bearer ${o.longToken}`) return send(400, { error: { message: 'Invalid OAuth access token', code: 190 } });
        return send(200, { data: (o.pages ?? [{ id: PAGE_ID, name: 'Picasso Lab Live' }]).map((p) => ({ ...p, access_token: p.access_token ?? token, category: 'Science', tasks: ['CREATE_CONTENT', 'MANAGE'] })) });
      }
      if (a === 'debug_token') {
        return send(200, { data: { app_id: o.appId, type: 'PAGE', is_valid: true, expires_at: 0, data_access_expires_at: 1_790_000_000, profile_id: PAGE_ID, scopes: o.scopes ?? ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'publish_video'] } });
      }
      if (call.auth !== `Bearer ${token}`) return send(400, { error: { message: 'Invalid OAuth access token - Cannot parse access token', type: 'OAuthException', code: 190 } });
      if (a === PAGE_ID && b === 'live_videos' && req.method === 'POST') {
        if (body.status !== 'LIVE_NOW') return send(400, { error: { message: 'status must be LIVE_NOW here', code: 100 } });
        const id = String(next++);
        const v = { id, videoId: String(next++), status: 'UNPUBLISHED', title: body.title, description: body.description, creation_time: new Date().toISOString() };
        videos.set(id, v);
        return send(200, { id, stream_url: ingest(id).replace(/^rtmps:\/\/([^/:]+):443/, 'rtmp://$1:80'), secure_stream_url: ingest(id) });
      }
      if (a === PAGE_ID && b === 'live_videos' && req.method === 'GET') {
        return send(200, { data: [...videos.values()].reverse().map((v) => ({ id: v.id, status: v.status, description: v.description, creation_time: v.creation_time })) });
      }
      if (a === PAGE_ID && !b && req.method === 'GET') return send(200, { id: PAGE_ID, name: 'Picasso Lab Live' });
      const v = videos.get(a);
      if (!v || b) return send(400, { error: { message: `Unsupported request: object '${a}' does not exist`, code: 100, error_subcode: 33 } });
      if (req.method === 'GET') {
        const all = {
          id: v.id, status: v.status, title: v.title, description: v.description, secure_stream_url: ingest(v.id),
          permalink_url: `/${PAGE_ID}/videos/${v.videoId}/`, video: { id: v.videoId },
          embed_html: `<iframe src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F${PAGE_ID}%2Fvideos%2F${v.videoId}%2F&width=1280" width="1280" height="720"></iframe>`,
        };
        const want = String(call.query.fields ?? 'id').split(',');
        return send(200, Object.fromEntries(Object.entries(all).filter(([k]) => k === 'id' || want.includes(k))));
      }
      if (body.end_live_video === 'true') {
        if (!['LIVE', 'UNPUBLISHED'].includes(v.status)) return send(400, { error: { message: 'This live video has already ended', code: 100, error_subcode: 1363144 } });
        v.status = 'VOD';
        return send(200, { id: v.id });
      }
      if (body.title !== undefined) { v.title = body.title; return send(200, { success: true }); }
      return send(400, { error: { message: 'nothing to do', code: 100 } });
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url, version, videos, calls, token,
    /** Fail the next `times` calls that match with this status and Graph error. */
    fault(when, status, error, times = 1) { faults.push({ when, status, error, times }); },
    /** A live video of the Page made by someone else, or by an earlier run. */
    add(v) { const id = String(next++); videos.set(id, { id, videoId: String(next++), status: 'LIVE', creation_time: new Date().toISOString(), ...v }); return id; },
    /** Facebook got the stream: the live video shows as LIVE. */
    golive(id) { const v = videos.get(id); if (v && v.status === 'UNPUBLISHED') v.status = 'LIVE'; },
    /** The live video id in one of our ingest URLs. */
    idOf: (u) => /FB-(\d+)-/.exec(String(u))?.[1] ?? null,
    close: () => new Promise((r) => server.close(r)),
  };
}
