// src/live-page.js - the page live_view returns for muse.ai's artifact panel. That panel blocks fetch and WebSocket
// (CSP connect-src 'none') but frames Facebook's video player (the owner's test, 2026-10-08) and runs scripts, so the page
// is small and makes no request of its own: Facebook's player in an iframe, one status line, and a few lines of script.
// It shows what was true when live_view answered ("joining", "live", "waiting for the next game"); a later call gives a
// fresh one.
//
// The player starts by itself, muted (autoplay: browsers allow it only without sound), with a hint to tap it for sound
// that goes once the viewer has tapped the player (focus moves into its frame). A fresh player of the same live video
// is loaded in the background every 5 minutes while the viewer has not touched it, and on "Reload video" at once, and
// cross-faded in once loaded: never more than two frames, no black flash.

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
  if (v.state === 'live' && v.ownerOnly) return `Live${g ? `: game ${g}` : ''}, but Facebook shows this video to its owner only.`;
  if (v.state === 'live') return `Live${g ? `: game ${g}` : ''}. One camera films the game that asked for the live view last.`;
  if (v.state === 'retrying') return 'Not live yet: the live video could not start; it is tried again by itself.';
  if (v.state === 'capped') return 'Not live: the limit of live videos for now is reached.';
  if (['connecting', 'starting'].includes(v.state)) return `Joining: the live video${g ? ` of game ${g}` : ''} starts in a few seconds.`;
  if (v.state === 'ending' || v.state === 'waiting') return 'Waiting for the next game.';
  return v.fb === false ? 'Live video is off on this server.' : 'Waiting for the next game.';
}

/** The watchdog and the sound hint (no request of its own: it only makes iframes of the same player URL). */
const SCRIPT = `(()=>{const v=document.getElementById('v');if(!v)return;const src=v.dataset.src;let cur=v.querySelector('iframe'),next=null,touched=0;
const h=document.getElementById('h');
function swap(){if(next)next.remove();const f=document.createElement('iframe');next=f;f.src=src;f.title='Live video';f.allow='autoplay; encrypted-media; picture-in-picture; web-share';f.allowFullscreen=true;f.style.opacity='0';v.insertBefore(f,h);
f.onload=()=>setTimeout(()=>{if(next!==f)return;f.style.opacity='1';const old=cur;cur=f;next=null;setTimeout(()=>old.remove(),900);h.hidden=false;},2500);}
document.getElementById('r').onclick=()=>swap();
setInterval(()=>{if(!touched)swap();},300000);
addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement&&document.activeElement.tagName==='IFRAME'){touched=1;h.hidden=true;}},0));})();`;

/**
 * The page: Facebook's player for embedUrl (when there is one and it is Facebook's) above the status line.
 * @param {{state: string, game?: string, camera?: string, embedUrl?: string|null, fb?: boolean, aspect?: string}} v
 */
export function liveViewHtml(v) {
  // the player at the video's own shape (square in the UI layout), as wide as the panel and no taller than it
  const [aw, ah] = /^\d{1,4}\/\d{1,4}$/.test(String(v.aspect ?? '')) ? String(v.aspect).split('/').map(Number) : [16, 9];
  const ratio = Math.round((aw / ah) * 10_000) / 10_000;
  const live = v.embedUrl && isPlayerUrl(v.embedUrl) && v.state !== 'off' && v.state !== 'waiting';
  const src = live ? `${v.embedUrl}&autoplay=true&mute=true` : '';
  const player = live
    ? `<div id="v" data-src="${esc(src)}"><iframe src="${esc(src)}" title="Live video" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>`
      + '<b id="h">Tap the video for sound</b></div>'
    : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Minecraft live</title><style>html,body{margin:0;background:#0c0e10;color:#e8e4dc;font:13px/1.4 system-ui,sans-serif}'
    + `#v{position:relative;aspect-ratio:${aw}/${ah};width:min(100%,calc((100vh - 28px)*${ratio}));margin:0 auto;background:#000;overflow:hidden}`
    + 'iframe{position:absolute;inset:0;width:100%;height:100%;border:0;transition:opacity .8s}'
    // the hint at the top, under Facebook's own title bar and over the game's sky: never over the panel of actions
    + '#h{position:absolute;left:50%;top:max(52px,9%);transform:translateX(-50%);padding:3px 10px;border-radius:99px;background:rgba(12,14,16,.55);color:#fff;font:600 11px system-ui,sans-serif;pointer-events:none;white-space:nowrap}'
    // "Reload video" in the status line under the player: it covers nothing
    + '#s{display:flex;align-items:center;justify-content:space-between;gap:10px}#r{flex:none;margin-right:10px;padding:1px 9px;border:1px solid #3a3f47;border-radius:99px;background:none;color:#c9c5bd;font:12px system-ui,sans-serif;cursor:pointer}#r:hover{color:#fff}'
    + `p{margin:0;padding:5px 12px}</style></head><body>${player}${live ? `<div id="s"><p>${esc(statusLine(v))}</p><button id="r" type="button">Reload video</button></div>` : `<p>${esc(statusLine(v))}</p>`}`
    + `${live ? `<script>${SCRIPT}</script>` : ''}</body></html>`;
}
