// Two layouts of the dense stream HUD (an agent trace: Muse's raw call and its steps, Muse's own words, the state),
// as HTML pages rendered to 1080x1080 PNGs by headless Chrome, with the ga13a88 moment of hud-data.mjs.
// usage: node hud-mockups.mjs <game-frame-1080x608.png> <out-dir>   -> muse-hud-1.png, -2.png and their -phone.png
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MOMENT as M } from './hud-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const agent = path.join(here, '..', 'agent');
const require = createRequire(path.join(agent, 'package.json'));
const { createCanvas, loadImage } = require('canvas');
const ASSETS = path.join(agent, 'assets', 'muse-ui');
const [gameFrame, outDir] = process.argv.slice(2);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = (p) => pathToFileURL(p).href;
const icon = (n) => url(path.join(ASSETS, 'icons', `${n}.png`));
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const secs = (ms) => (ms >= 60_000 ? `${Math.floor(ms / 60_000)}:${String(Math.round((ms % 60_000) / 1000)).padStart(2, '0')}` : ms >= 10_000 ? `${Math.round(ms / 1000)} s` : `${Math.round(ms / 100) / 10} s`);

const CSS = `
@font-face { font-family: Inter; font-weight: 500; src: url(${url(path.join(ASSETS, 'fonts', 'Inter-Medium.ttf'))}); }
@font-face { font-family: Inter; font-weight: 600; src: url(${url(path.join(ASSETS, 'fonts', 'Inter-SemiBold.ttf'))}); }
@font-face { font-family: Inter; font-weight: 700; src: url(${url(path.join(ASSETS, 'fonts', 'Inter-Bold.ttf'))}); }
@font-face { font-family: Mono; font-weight: 400; src: url(${url(path.join(ASSETS, 'fonts', 'JetBrainsMono-Regular.ttf'))}); }
@font-face { font-family: Mono; font-weight: 500; src: url(${url(path.join(ASSETS, 'fonts', 'JetBrainsMono-Medium.ttf'))}); }
:root { --bg:#0a0d12; --band:#0e1219; --rule:rgba(255,255,255,.075); --text:#eef0f4; --soft:#aeb6c6; --muted:#6b7488;
  --muse:#a99bff; --quote:#ebe7ff; --body:#7cc4ff; --ok:#5fd09c; --fail:#ff8a7a; --gold:#ffd164; --look:#6fd3c8; }
* { box-sizing: border-box; margin: 0; padding: 0; min-width: 0; }
html, body { width: 1080px; height: 1080px; background: #000; overflow: hidden; }
body { font: 500 17px/1.3 Inter; color: var(--text); -webkit-font-smoothing: antialiased; }
.game { position: absolute; left: 0; top: 0; width: 1080px; height: 608px; background: url(GAME) center/cover; }
.hud { position: absolute; left: 0; top: 608px; width: 1080px; height: 472px; background: var(--bg); padding: 0 20px; }
.hdr { height: 38px; display: flex; align-items: center; gap: 22px; border-bottom: 1px solid var(--rule); font-weight: 600; }
.hdr .it { display: flex; align-items: center; gap: 7px; } .hdr img { width: 20px; height: 20px; }
.hdr .sp { flex: 1; } .hdr .dim { color: var(--muted); font-weight: 500; }
.mono { font-family: Mono; font-size: 14px; letter-spacing: 0; }
.lab { font: 700 13px/1 Inter; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); display: flex; align-items: center; gap: 8px; height: 16px; }
.lab i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
.lab .r { margin-left: auto; letter-spacing: .06em; }
.raw { margin-top: 9px; background: #121722; border: 1px solid var(--rule); border-radius: 6px; padding: 7px 10px; line-height: 1.45; color: #cfd5e2; }
.raw b { color: var(--muse); font-weight: 500; } .raw .sep { color: var(--muted); } .raw .st { white-space: nowrap; }
.steps { list-style: none; margin-top: 8px; }
.steps li { display: grid; grid-template-columns: 20px 22px 1fr auto; align-items: center; height: 27px; padding: 0 8px 0 6px; border-radius: 5px; }
.steps .n { font-family: Mono; font-size: 13px; color: var(--muted); }
.steps .t { font-family: Mono; font-size: 13.5px; color: var(--muted); text-align: right; }
.steps .ok .t { color: var(--ok); } .steps .ok .w { color: var(--soft); }
.steps .q .w { color: var(--muted); }
.steps .run { background: rgba(124,196,255,.09); box-shadow: inset 2px 0 var(--body); height: auto; padding-top: 4px; padding-bottom: 6px; grid-template-rows: 22px auto; }
.steps .run .w { font-weight: 600; } .steps .run .t { color: var(--body); }
.sub { grid-column: 3 / 5; display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; font-size: 15px; color: var(--body); margin-top: 2px; }
.bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.1); overflow: hidden; } .bar i { display: block; height: 100%; background: var(--body); border-radius: 3px; }
.mk { width: 15px; height: 15px; }
.steps.table li { grid-template-columns: 20px 22px 1fr 190px 62px; }
.steps.table .rw { font-size: 13px; color: #8d97ab; } .steps.table .run .rw { color: #b9c6dc; }
.steps.table .sub { grid-column: 3 / 6; }
.raw.tbl { background: none; border: 0; padding: 0; margin-top: 8px; }
.rows { margin-top: 7px; }
.row { display: grid; grid-template-columns: 38px 108px 1fr auto; align-items: baseline; gap: 6px; height: 23px; font-size: 16px; }
.row .at { font-family: Mono; font-size: 13px; color: var(--muted); } .row .tool { font-family: Mono; font-size: 13px; }
.row .w { color: var(--soft); white-space: nowrap; overflow: hidden; } .row .res { font-size: 14px; font-weight: 600; text-align: right; }
.row.fail .res { color: var(--fail); } .row.ok .res { color: var(--ok); }
.why { padding-left: 158px; color: var(--fail); font-size: 15px; height: 21px; margin-top: -3px; }
.quote { margin-top: 10px; border-left: 3px solid var(--muse); padding-left: 12px; font-size: 19px; line-height: 1.36; color: var(--quote); font-weight: 500; }
.qmeta { margin: 6px 0 0 15px; font-family: Mono; font-size: 13px; color: var(--muted); }
.prev { margin-top: 12px; padding-left: 15px; font-size: 16px; line-height: 1.34; color: var(--soft); position: relative; }
.prev .at { font-family: Mono; font-size: 12.5px; color: var(--muted); margin-right: 6px; }
.goal li { list-style: none; display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center; height: 23px; padding: 0 6px; border-radius: 5px; font-size: 16px; }
.goal img { width: 20px; height: 20px; } .goal .t { font-family: Mono; font-size: 13px; text-align: right; }
.goal .done { color: var(--soft); } .goal .done .t { color: var(--ok); }
.goal .next { background: rgba(255,209,100,.12); box-shadow: inset 2px 0 var(--gold); color: var(--text); font-weight: 600; } .goal .next .t { color: var(--gold); }
.goal .todo { color: var(--muted); } .goal .todo img { opacity: .4; filter: grayscale(.6); }
.inv { display: grid; gap: 4px 6px; margin-top: 8px; }
.inv div { display: flex; align-items: center; gap: 6px; height: 30px; font-weight: 600; font-size: 17px; }
.inv img { width: 26px; height: 26px; } .inv .z { color: var(--muted); font-weight: 500; } .inv .z img { opacity: .5; filter: grayscale(.5); }
.where { display: flex; align-items: center; gap: 8px; font-size: 16px; color: var(--soft); white-space: nowrap; } .where img { width: 20px; height: 20px; } .where b { color: var(--text); font-weight: 600; }
.adv { font-size: 16px; color: var(--text); margin-top: 6px; line-height: 1.3; } .fol { font-size: 15px; font-weight: 600; margin-top: 3px; }
.share { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; font-size: 15px; }
.share .bar i { background: var(--muse); }
.vr { border-left: 1px solid var(--rule); }
.src { position: absolute; left: 0; right: 0; top: 584px; text-align: center; font: 500 12px Inter; color: rgba(255,255,255,.75); text-shadow: 0 1px 2px #000; }
`;

const CHECK = (c) => `<svg class="mk" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.2" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M4.6 8.3l2.2 2.2 4.6-4.8" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const RUN = (c) => `<svg class="mk" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.2" fill="${c}" opacity=".18"/><path d="M6 4.6l5 3.4-5 3.4z" fill="${c}"/></svg>`;
const RING = (c) => `<svg class="mk" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.6" fill="none" stroke="${c}" stroke-width="1.4" stroke-dasharray="2.2 2.2"/></svg>`;
const CROSS = (c) => `<svg class="mk" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.2" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const C = { muse: '#a99bff', body: '#7cc4ff', ok: '#5fd09c', fail: '#ff8a7a', gold: '#ffd164', look: '#6fd3c8', muted: '#6b7488' };
const TOOLC = { get_state: C.look, play_sequence: C.muse, play: C.muse, live_view: C.muted, start_game: C.muted };

function header({ share }) {
  return `<div class="hdr">
    <span class="it"><img src="${icon('heart')}">${M.st.hp}<span class="dim">/20</span></span>
    <span class="it"><img src="${icon('food')}">${M.st.food}<span class="dim">/20</span></span>
    <span class="it"><img src="${icon('moon')}">${M.st.clock.replace(/^NIGHT /, '')} <span class="dim">night, ${M.st.dawn}</span></span>
    <span class="sp"></span>
    ${share ? `<span class="it" style="gap:9px"><span class="lab" style="color:var(--muse)">Muse</span>${M.share.pct}%<span class="bar" style="width:70px;display:inline-block"><i style="width:${M.share.pct}%;background:var(--muse)"></i></span></span>` : ''}
    <span class="it"><span class="lab">Game</span><span class="mono" style="color:var(--soft)">${M.game}</span><span class="mono">${M.elapsed}</span></span>
  </div>`;
}

function trace({ rows = 8, label = 'Muse · Trace', table = false }) {
  const c = M.call;
  const raw = `<b>${c.tool}:</b> ${c.raw.map((x, i) => `<span class="st">${esc(x)}${i < c.raw.length - 1 ? ' <span class="sep">·</span>' : ''}</span>`).join(' ')}`;
  const steps = c.steps.map((s, i) => {
    const rw = table ? `<span class="rw mono">${esc(c.raw[i])}</span>` : '';
    if (s.state === 'ok') return `<li class="ok"><span class="n">${i + 1}</span>${CHECK(C.ok)}<span class="w">${esc(s.say)}</span>${rw}<span class="t">${secs(s.ms)}</span></li>`;
    if (s.state === 'run') {
      const p = Math.round((100 * s.sub.done) / s.sub.of);
      return `<li class="run"><span class="n">${i + 1}</span>${RUN(C.body)}<span class="w">${esc(s.say)}</span>${rw}<span class="t">${s.sub.done} of ${s.sub.of}</span>
        <div class="sub"><span>${esc(s.sub.text)}</span><div class="bar"><i style="width:${p}%"></i></div><span class="mono" style="font-size:13px">${secs(s.ms)}</span></div></li>`;
    }
    return `<li class="q"><span class="n">${i + 1}</span>${RING(C.muted)}<span class="w">${esc(s.say)}</span>${rw}<span class="t">queued</span></li>`;
  }).join('');
  let n = 0;
  const earlier = [];
  for (const e of M.earlier) {
    if (n >= rows || (e.state === 'fail' && n + 2 > rows)) break;
    const res = e.state === 'ok' ? (e.ms ? (e.of > 1 ? `done ${secs(e.ms)}` : secs(e.ms)) : 'done') : e.state === 'fail' ? 'failed' : '';
    earlier.push(`<div class="row ${e.state}"><span class="at">${e.at}</span><span class="tool" style="color:${TOOLC[e.tool]}">${e.tool}</span><span class="w fit">${esc(e.short ?? e.say)}</span><span class="res">${res}</span></div>`);
    n += 1;
    if (e.state === 'fail') { earlier.push(`<div class="why">${esc(e.why)}</div>`); n += 1; }
  }
  return `<div class="lab"><i style="background:var(--muse)"></i>${label}<span class="r">call ${c.n} · ${c.at} · running ${c.ago}</span></div>
    ${table ? `<div class="raw mono tbl"><b>${c.tool}</b> <span class="sep">· ${c.raw.length} steps</span></div>` : `<div class="raw mono" style="font-size:13px">${raw}</div>`}
    <ol class="steps${table ? ' table' : ''}">${steps}</ol>
    <div class="lab" style="margin-top:9px"><i style="background:var(--muted)"></i>Earlier calls<span class="r">${M.earlier.length} before this</span></div>
    <div class="rows">${earlier.join('')}</div>`;
}

function goals({ cols = 1 }) {
  const g = M.goal;
  const nextAt = g.items.findIndex((x) => !x.at);
  const li = g.items.map((x, i) => {
    const cls = x.at ? 'done' : i === nextAt ? 'next' : 'todo';
    const ic = { nether: 'portal', back: 'house' }[x.id] ?? x.id;
    const right = x.at ? x.at : i === nextAt ? 'next' : x.of ? `${x.have}/${x.of}` : '';
    return `<li class="${cls}"><img src="${icon(ic)}"><span>${esc(x.say)}</span><span class="t">${right}</span></li>`;
  }).join('');
  return `<div class="lab"><i style="background:var(--gold)"></i>Goal · ${esc(g.name)}<span class="r">${g.items.filter((x) => x.at).length}/${g.items.length}</span></div>
    <ul class="goal" style="margin-top:7px;display:grid;grid-template-columns:repeat(${cols},1fr);column-gap:10px">${li}</ul>`;
}

function inventory({ cols = 4 }) {
  const ic = { food: 'steak', bucket: 'bucket' };
  const cells = M.inventory.map((x) => `<div class="${x.n ? '' : 'z'}"><img src="${icon(ic[x.id] ?? x.id)}">${x.n}</div>`).join('');
  return `<div class="lab"><i style="background:var(--look)"></i>Inventory</div>
    <div class="inv" style="grid-template-columns:repeat(${cols},1fr)">${cells}</div>`;
}
const where = () => `<div class="where"><img src="${icon('depth')}"><b>y ${M.st.y}</b> ${esc(M.st.place)}</div>`;
const advice = () => `<div class="lab"><i style="background:var(--gold)"></i>Body advice</div>
  <div class="adv">${esc(M.advice.text)}</div><div class="fol" style="color:${M.advice.ok ? C.ok : C.fail}">→ ${esc(M.advice.follow)}</div>`;
const share = () => `<div class="share"><span class="lab" style="color:var(--muse)"><i style="background:var(--muse)"></i>Muse ${M.share.pct}%</span><div class="bar"><i style="width:${M.share.pct}%"></i></div><span style="color:var(--muted);font-size:14px">${M.share.muse} actions · body ${M.share.reflex}</span></div>`;

function thinking({ prev = 3, wide = false, note = true }) {
  const [now, ...rest] = M.thoughts;
  const fade = [0.62, 0.42, 0.26];
  return `<div class="lab"><i style="background:var(--muse)"></i>Thinking${note ? '<span class="r">Muse\'s own words</span>' : ''}</div>
    <div class="quote" ${wide ? 'style="font-size:20px"' : ''}>${esc(now.text)}</div>
    <div class="qmeta">${now.at} · with call ${now.n}</div>
    ${rest.slice(0, prev).map((t, i) => `<div class="prev" style="opacity:${fade[i]}"><span class="at">${t.at}</span>${esc(t.text)}</div>`).join('')}`;
}

// 1: three columns, trace | thinking | state
const v1 = () => `<div class="hud">${header({ share: true })}
  <div style="display:grid;grid-template-columns:452px 1px 228px 1px 1fr;column-gap:16px;height:422px;padding-top:12px">
    <div>${trace({ rows: 7 })}</div><div class="vr"></div>
    <div style="overflow:hidden;-webkit-mask-image:linear-gradient(#000 70%,transparent 99%)">${thinking({ prev: 3, note: false })}</div><div class="vr"></div>
    <div>${goals({ cols: 1 })}<div style="height:10px"></div>${inventory({ cols: 4 })}<div style="height:8px"></div>${where()}<div style="height:10px"></div>${advice()}</div>
  </div></div>`;

// 2: Muse's words across the top, then the trace | the state
const v2 = () => `<div class="hud">${header({ share: true })}
  <div style="display:grid;grid-template-columns:118px 1fr;column-gap:14px;padding:11px 0 10px;border-bottom:1px solid var(--rule)">
    <div><div class="lab"><i style="background:var(--muse)"></i>Thinking</div><div class="qmeta" style="margin:8px 0 0">${M.thoughts[0].at} · call ${M.thoughts[0].n}</div></div>
    <div>
      <div class="quote" style="margin-top:0;font-size:20px;font-weight:600">${esc(M.thoughts[0].text)}</div>
      ${M.thoughts.slice(1, 3).map((t, i) => `<div class="prev fit" style="margin-top:5px;opacity:${[0.6, 0.38][i]};white-space:nowrap;overflow:hidden"><span class="at">${t.at}</span>${esc(t.text)}</div>`).join('')}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:560px 1px 1fr;column-gap:16px;padding-top:10px;height:300px">
    <div>${trace({ rows: 3, table: true })}</div><div class="vr"></div>
    <div>${goals({ cols: 2 })}<div style="height:9px"></div>${inventory({ cols: 8 })}<div style="height:7px"></div>${where()}<div style="height:9px"></div>${advice()}</div>
  </div></div>`;

fs.mkdirSync(outDir, { recursive: true });
const work = fs.mkdtempSync(path.join(outDir, '.hud-'));
for (const [name, body] of [['1', v1], ['2', v2]]) {
  const html = `<!doctype html><meta charset="utf-8"><style>${CSS.replace('GAME', url(path.resolve(gameFrame)))}</style>
    <script>addEventListener('load', () => { for (const el of document.querySelectorAll('.fit')) { const t = el.lastChild; const words = t.textContent.split(' '); while (el.scrollWidth > el.clientWidth + 0.5 && words.length > 1) { words.pop(); t.textContent = words.join(' ').replace(/[,:;]$/, '') + '...'; } } });</script>
    <div class="game"></div><div class="src">HUD layout ${name} · game ga13a88 (production log): calls, Muse's words, steps, times, advice · health, food, y, items worked out from the results · game picture: a stand-in</div>${body()}`;
  const file = path.join(work, `hud-${name}.html`);
  fs.writeFileSync(file, html);
  const png = path.join(outDir, `muse-hud-${name}.png`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files',
    `--user-data-dir=${path.join(work, 'chrome')}`, '--window-size=1080,1240', '--virtual-time-budget=3000', `--screenshot=${png}`, url(file)], { stdio: 'ignore' });
  // headless Chrome's page is shorter than its window: a taller window, then the top 1080 rows
  const shot = await loadImage(png);
  const full = createCanvas(1080, 1080);
  full.getContext('2d').drawImage(shot, 0, 0);
  fs.writeFileSync(png, full.toBuffer('image/png'));
  const im = full;
  const p = createCanvas(390, 390);
  const g = p.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(im, 0, 0, 390, 390);
  fs.writeFileSync(path.join(outDir, `muse-hud-${name}-phone.png`), p.toBuffer('image/png'));
  fs.copyFileSync(file, path.join(outDir, `muse-hud-${name}.html`));
  console.log(`wrote muse-hud-${name}.png and -phone.png`);
}
fs.rmSync(work, { recursive: true, force: true });
