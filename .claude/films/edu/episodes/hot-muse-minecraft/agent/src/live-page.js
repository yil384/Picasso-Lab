// src/live-page.js - the page live_view returns for muse.ai's artifact panel. That panel blocks fetch and WebSocket
// (CSP connect-src 'none') but frames Facebook's video player (the owner's test, 2026-10-08), so the page is static:
// Facebook's player in an iframe and one status line, no script, no request of its own, under 1 KB. It shows what was
// true when live_view answered ("joining", "live", "waiting for the next game"); a later call gives a fresh one.

const PLAYER = 'https://www.facebook.com/plugins/video.php?';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const gameId = (g) => (/^[A-Za-z0-9_-]{1,40}$/.test(String(g ?? '')) ? String(g) : null);

/** Only Facebook's own video player may go into the page. */
export const isPlayerUrl = (u) => {
  try { const x = new URL(u); return x.href.startsWith(PLAYER) && !x.username && !x.hash; } catch { return false; }
};

/**
 * The status line of the page.
 * @param {{state: string, game?: string, camera?: string, fb?: boolean}} v   state: live | connecting | starting |
 *   retrying | ending | off | waiting; game: the caller's game; camera: the game the camera films
 */
export function statusLine(v) {
  const g = gameId(v.game);
  const cam = gameId(v.camera);
  if (v.state === 'live' && cam && g && cam !== g) return `Live: the camera is on game ${cam} now (it films the game that asked for the live view last).`;
  if (v.state === 'live') return `Live${g ? `: game ${g}` : ''}. One camera films the game that asked for the live view last.`;
  if (v.state === 'retrying') return 'Not live yet: the live video could not start; it is tried again by itself.';
  if (['connecting', 'starting'].includes(v.state)) return `Joining: the live video${g ? ` of game ${g}` : ''} starts in a few seconds.`;
  if (v.state === 'ending' || v.state === 'waiting') return 'Waiting for the next game.';
  return v.fb === false ? 'Live video is off on this server.' : 'Waiting for the next game.';
}

/**
 * The page: Facebook's player for embedUrl (when there is one and it is Facebook's) above the status line.
 * @param {{state: string, game?: string, camera?: string, embedUrl?: string|null, fb?: boolean}} v
 */
export function liveViewHtml(v) {
  const player = v.embedUrl && isPlayerUrl(v.embedUrl) && v.state !== 'off' && v.state !== 'waiting'
    ? `<div><iframe src="${esc(v.embedUrl)}" title="Live video" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div>`
    : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Minecraft live</title><style>html,body{margin:0;background:#0c0e10;color:#e8e4dc;font:14px/1.4 system-ui,sans-serif}'
    + 'div{position:relative;aspect-ratio:16/9;background:#000}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}'
    + `p{margin:0;padding:8px 12px}</style></head><body>${player}<p>${esc(statusLine(v))}</p></body></html>`;
}
