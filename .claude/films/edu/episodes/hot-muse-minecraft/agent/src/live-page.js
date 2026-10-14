// src/live-page.js - the page live_view returns for muse.ai's artifact panel. That panel blocks fetch and WebSocket
// (CSP connect-src 'none') but frames Facebook's video player (the owner's test, 2026-10-08) and runs scripts, so the page
// is small and makes no request of its own: Facebook's player in an iframe, one status line, and a few lines of script.
// It shows what was true when live_view answered ("joining", "live", "waiting for the next game"); a later call gives a
// fresh one.
//
// The player starts by itself, muted (autoplay: browsers allow it only without sound), with nothing of ours over it (the owner,
// 2026-10-14: the "Tap the video for sound" hint is gone). A fresh player of the same live video
// is loaded in the background every 5 minutes while the viewer has not touched it, and on "Reload video" at once, and
// cross-faded in once loaded: never more than two frames, no black flash.
//
// The game's end (the owner, 2026-10-14: after gd7540a ended, a fresh player started Facebook's replay from 0:00 and
// the game looked alive again): the page asks our server every 15 s whether its game has ended, with an image (the
// panel allows no fetch): /live/<game>/state.svg is 1 px wide while the game runs, 2 px once it has ended. Then the
// player goes and the game's end card takes its place (/live/<game>/end.svg: when it ended or reached its goal, the
// splits with their times, who decided). If the panel blocks images from our server, the page stays as it was.

const PLAYER = 'https://www.facebook.com/plugins/video.php?';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const gameId = (g) => (/^[A-Za-z0-9_-]{1,40}$/.test(String(g ?? '')) ? String(g) : null);

/** Our server's public address, where the page asks after its game: https, or http on this machine (tests). */
export const isStatusBase = (u) => {
  try { const x = new URL(u); return (x.protocol === 'https:' || (x.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(x.hostname))) && !x.username && !x.search && !x.hash && x.pathname === '/'; } catch { return false; }
};

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
  if (v.state === 'capped') return v.until ? `Not live: the live view is at its ${v.daily ? 'daily' : 'hourly'} limit until ${v.until} UTC. The game goes on.` : 'Not live: the limit of live videos for now is reached.';
  if (v.state === 'test') return `Test caller: no Facebook live${g ? ` for game ${g}` : ''} (tests never use the live videos a day). The game goes on.`;
  if (['connecting', 'starting'].includes(v.state)) return `Joining: the live video${g ? ` of game ${g}` : ''} starts in a few seconds.`;
  if (v.state === 'ending' || v.state === 'waiting') return 'Waiting for the next game.';
  return v.fb === false ? 'Live video is off on this server.' : 'Waiting for the next game.';
}

/** The watchdog, and the game's end from our server's images (no fetch: the panel allows none). */
const SCRIPT = `(()=>{const v=document.getElementById('v');if(!v)return;const src=v.dataset.src,st=v.dataset.st;let cur=v.querySelector('iframe'),next=null,touched=0;
function swap(){if(next)next.remove();const f=document.createElement('iframe');next=f;f.src=src;f.title='Live video';f.allow='autoplay; encrypted-media; picture-in-picture; web-share';f.allowFullscreen=true;f.style.opacity='0';v.appendChild(f);
f.onload=()=>setTimeout(()=>{if(next!==f)return;f.style.opacity='1';const old=cur;cur=f;next=null;setTimeout(()=>old.remove(),900);},2500);}
document.getElementById('r').onclick=()=>swap();
const wd=setInterval(()=>{if(!touched)swap();},300000);
function end(){clearInterval(wd);clearInterval(pl);next=null;for(const f of v.querySelectorAll('iframe'))f.remove();const c=new Image();c.className='end';c.alt='The game has ended';c.src=st+'end.svg?'+Date.now();v.appendChild(c);
const p=document.querySelector('#s p');if(p)p.textContent='The game has ended. A new game gets a new live video.';const r=document.getElementById('r');if(r)r.remove();}
const pl=st?setInterval(()=>{const i=new Image();i.onload=()=>{if(i.naturalWidth===2)end();};i.src=st+'state.svg?'+Date.now();},15000):0;
addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement&&document.activeElement.tagName==='IFRAME')touched=1;},0));})();`;

/**
 * The page: Facebook's player for embedUrl (when there is one and it is Facebook's) above the status line.
 * @param {{state: string, game?: string, camera?: string, embedUrl?: string|null, fb?: boolean, aspect?: string}} v
 */
export function liveViewHtml(v) {
  // the player at the video's own shape (square in the UI layout), as wide as the panel and no taller than it
  const [aw, ah] = /^\d{1,4}\/\d{1,4}$/.test(String(v.aspect ?? '')) ? String(v.aspect).split('/').map(Number) : [16, 9];
  const ratio = Math.round((aw / ah) * 10_000) / 10_000;
  const live = v.embedUrl && isPlayerUrl(v.embedUrl) && v.state !== 'off' && v.state !== 'waiting' && v.state !== 'test';
  const src = live ? `${v.embedUrl}&autoplay=true&mute=true` : '';
  // where the page asks whether its game has ended: our own server, https (http on this machine for tests)
  const g = gameId(v.game);
  const st = live && g && isStatusBase(v.statusBase) ? `${String(v.statusBase).replace(/\/+$/, '')}/live/${g}/` : '';
  const player = live
    ? `<div id="v" data-src="${esc(src)}"${st ? ` data-st="${esc(st)}"` : ''}><iframe src="${esc(src)}" title="Live video" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div>`
    : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Minecraft live</title><style>html,body{margin:0;background:#0c0e10;color:#e8e4dc;font:13px/1.4 system-ui,sans-serif}'
    + `#v{position:relative;aspect-ratio:${aw}/${ah};width:min(100%,calc((100vh - 28px)*${ratio}));margin:0 auto;background:#000;overflow:hidden}`
    + 'iframe,img.end{position:absolute;inset:0;width:100%;height:100%;border:0;transition:opacity .8s}'
    // "Reload video" in the status line under the player: it covers nothing
    + '#s{display:flex;align-items:center;justify-content:space-between;gap:10px}#r{flex:none;margin-right:10px;padding:1px 9px;border:1px solid #3a3f47;border-radius:99px;background:none;color:#c9c5bd;font:12px system-ui,sans-serif;cursor:pointer}#r:hover{color:#fff}'
    + `p{margin:0;padding:5px 12px}</style></head><body>${player}${live ? `<div id="s"><p>${esc(statusLine(v))}</p><button id="r" type="button">Reload video</button></div>` : `<p>${esc(statusLine(v))}</p>`}`
    + `${live ? `<script>${SCRIPT}</script>` : ''}</body></html>`;
}

const mmss = (sec) => { const n = Math.max(0, Math.round(Number(sec) || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
const xml = (t) => String(t ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/**
 * The game's end card (1080x1080, the stream's shape), an SVG served as an image: when the game ended or reached its
 * goal, the splits with their times (the ones not reached dim), who decided. Text only, system fonts, no request.
 * @param {{game: string, caller?: string|null, reason?: string, report?: object|null, attribution?: object|null}} e
 */
export function endCardSvg(e) {
  const r = e.report ?? {};
  const goal = r.goal === 'free' && !r.goalText ? 'Free play' : cap(r.goalTitle || 'the goal');
  const elapsed = mmss(r.elapsedS);
  const who = !e.caller || e.caller === 'MUSE' ? 'Muse' : e.caller === 'TEST SCRIPT' ? 'the test script' : e.caller;
  const head = r.goalReached && Number.isFinite(r.goalReachedS) ? `${goal} in ${mmss(r.goalReachedS)}` : `Game ended at ${elapsed}`;
  const sub = r.goalReached ? `goal reached · the game ended at ${elapsed}` : r.goal === 'free' ? 'free play' : `${goal}: goal not reached`;
  const out = ['<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif">',
    '<rect width="1080" height="1080" fill="#0b0e14"/><rect x="0" y="0" width="1080" height="8" fill="#9d8cff"/>',
    `<text x="72" y="130" fill="#b9adff" font-size="28" font-weight="600" letter-spacing="4">GAME ENDED · ${xml(e.game)}</text>`,
    `<text x="72" y="218" fill="#f3f5f9" font-size="68" font-weight="700">${xml(head)}</text>`,
    `<text x="72" y="276" fill="#aeb6c6" font-size="32">${xml(sub)}</text>`];
  // the splits: the goal's milestones (or the ones reached along the way), two columns
  const ms = (r.milestones ?? []).slice(0, 12);
  const parts = ms.length ? ms.map((m) => ({ name: m.name, atS: m.atS })) : (r.parts ?? []).map((p) => ({ name: `${cap(p.label)} ${p.done}/${p.of}`, atS: p.atS }));
  const shown = parts.slice(0, 12);
  if (shown.length) out.push('<text x="72" y="356" fill="#8d97ab" font-size="24" font-weight="600" letter-spacing="3">SPLITS</text>');
  shown.forEach((m, i) => {
    const x = 72 + (i >= 6 ? 480 : 0), y = 410 + (i % 6) * 64, done = m.atS != null;
    out.push(`<circle cx="${x + 14}" cy="${y - 10}" r="12" fill="${done ? '#5fd09c' : 'none'}" stroke="${done ? '#5fd09c' : '#4e5667'}" stroke-width="3"/>`);
    if (done) out.push(`<path d="M${x + 8} ${y - 10} l4 5 l8 -10" stroke="#0b0e14" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push(`<text x="${x + 42}" y="${y}" fill="${done ? '#f3f5f9' : '#6b7488'}" font-size="30" font-weight="${done ? 600 : 500}">${xml(cap(m.name))}</text>`);
    if (done) out.push(`<text x="${x + 420}" y="${y}" fill="#c9d1df" font-size="30" font-family="ui-monospace,Menlo,Consolas,monospace" text-anchor="end">${mmss(m.atS)}</text>`);
  });
  // who decided: the caller directly or by its rules, the bot on its own
  const a = e.attribution;
  if (a) {
    const pct = Number.isFinite(a.decidedPct) ? a.decidedPct : Number.isFinite(a.musePct) ? a.musePct : null;
    const line = pct !== null ? `Decided by ${who}: ${pct}%` : `Played by ${who}`;
    const detail = [Number.isFinite(a.muse) ? `${a.muse} by its calls` : '', Number.isFinite(a.rule) ? `${a.rule} by its rules` : '', Number.isFinite(a.body) ? `${a.body} by the bot on its own` : Number.isFinite(a.reflex) ? `${a.reflex} by the bot's reflexes` : ''].filter(Boolean).join(' · ');
    out.push('<rect x="72" y="822" width="936" height="1" fill="#262d3b"/>');
    out.push(`<text x="72" y="890" fill="#f3f5f9" font-size="40" font-weight="700">${xml(line)}</text>`);
    if (detail) out.push(`<text x="72" y="940" fill="#aeb6c6" font-size="28">${xml(`actions: ${detail}`)}</text>`);
  }
  out.push(`<text x="72" y="1030" fill="#6b7488" font-size="24">${xml(cap(String(e.reason || 'ended')))} · Picasso Lab</text>`);
  out.push('</svg>');
  return out.join('');
}
