// Three design options for the stream's command area (the owner's call, 2026-10-12), as stills at 1080x1080 with the
// real commands, results, advice and milestones of production game g0793f1. Muse's own words (the new `why`), the
// body's live sub-step and the state numbers did not exist in that game: they are sample text, marked as such.
//   node mockups.mjs <game frame 1080x608 png> <out dir>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const agent = path.join(here, '..', 'agent');
const require = createRequire(path.join(agent, 'package.json'));
const { createCanvas, loadImage, registerFont } = require('canvas');
const A = path.join(agent, 'assets', 'muse-ui');
for (const [f, w] of [['Inter-Medium.ttf', '500'], ['Inter-SemiBold.ttf', '600'], ['Inter-Bold.ttf', '700']]) registerFont(path.join(A, 'fonts', f), { family: 'Inter', weight: w });
const [frameFile, outDir] = process.argv.slice(2);
const frame = await loadImage(frameFile);
const icon = {};
for (const n of ['heart', 'food', 'moon', 'star', 'pickaxe', 'boot', 'hammer', 'bucket', 'flame', 'shield', 'compass', 'portal', 'sword', 'house']) icon[n] = await loadImage(path.join(A, 'icons', `${n}.png`));

// ----- the game g0793f1 (production, 2026-10-12, 21:08-21:09 UTC), from its log; sample text marked
const G = {
  hp: 20, food: 14, clock: '21:30', night: true, muse: 93, // hp, food, clock: sample (the log has no state); Muse's share: 26 actions, 2 reflexes
  command: 'Walk to 360 35 -78, then mine 14 obsidian', step: 2, steps: 2, elapsed: '1:22',
  why: 'Lava pool at 360 34 -78. Water on lava makes obsidian; I need 14 for a portal.', // SAMPLE
  sub: { icon: 'bucket', text: 'Pouring water on lava', count: 'obsidian 3 of 14', done: 3, of: 14 }, // SAMPLE progress
  checked: 'HP 20 · food 14 · 1 water bucket · 0 obsidian · dawn in 6 min', // SAMPLE numbers
  advice: 'No lava pool within 16 blocks; the nearest is at 360 34 -78, 69 blocks away',
  followed: 'Muse followed it',
  adviceShort: 'Nearest lava pool: 360 34 -78, 69 blocks away',
  advice2: 'The iron pickaxe is about to break: 55 of 250 uses left',
  history: [
    { icon: 'boot', text: 'Walk to 360 35 -78', state: 'done', time: '68 s', note: 'Reflex on the way: fought a creeper' },
    { icon: 'pickaxe', text: 'Mine 14 obsidian', state: 'failed', why: 'No lava pool within 16 blocks', short: 'No lava near' },
    { icon: 'hammer', text: 'Craft flint and steel', state: 'done', time: '0.3 s' },
    { icon: 'bucket', text: 'Fill a bucket with water', state: 'done', time: '3 s' },
    { icon: 'boot', text: 'Walk to 378 71 -23', state: 'done', time: '95 s' },
    { icon: 'bucket', text: 'Fill a bucket with water', state: 'failed', why: 'Timed out after 120 s', short: 'Timed out' },
  ],
  milestones: ['Got a bucket', 'Got a diamond pickaxe'],
};

const C = {
  bg: '#0f131a', card: '#171d27', line: 'rgba(255,255,255,0.08)', text: '#f3f1ec', soft: '#aab2c4', muted: '#6c7589',
  muse: '#a99bff', ok: '#5fd09c', fail: '#ff8a7a', gold: '#ffd164', body: '#7cc4ff',
};
const BIG = 32;
const SMALL = 22;
const F = (w, px) => `${w} ${px}px Inter`;

/** Words wrapped to maxW, at most `lines` lines; never cut mid-word (the phrases are written to fit). */
function wrap(g, text, maxW, lines = 2) {
  const out = [];
  let cur = '';
  for (const w of String(text).split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (g.measureText(next).width <= maxW || !cur) cur = next;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > lines) throw new Error(`"${text}" needs ${out.length} lines at this width: shorten the phrase`);
  return out;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function bar(g, x, y, w, h, frac, color) {
  rr(g, x, y, w, h, h / 2); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill();
  rr(g, x, y, Math.max(h, w * frac), h, h / 2); g.fillStyle = color; g.fill();
}
function text(g, t, x, y, { size = SMALL, weight = 500, color = C.text, align = 'left' } = {}) {
  g.font = F(weight, size); g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(t, x, y); g.textAlign = 'left';
  return g.measureText(t).width;
}
function sampleTag(g, x, y) { text(g, 'sample', x, y, { size: SMALL - 6, weight: 600, color: C.muted }); }
function header(g, y, x0 = 34, x1 = 1046, dark = false) {
  let x = x0;
  const item = (ic, t, color = C.text) => { g.drawImage(icon[ic], x, y - 22, 28, 28); x += 36; x += text(g, t, x, y, { weight: 600, color }) + 26; };
  item('heart', `${G.hp}/20`); item('food', `${G.food}/20`); item(G.night ? 'moon' : 'sun', G.clock);
  const w = text(g, `Muse ${G.muse}%`, x1, y, { weight: 600, color: C.muse, align: 'right' });
  bar(g, x1 - w - 14 - 130, y - 10, 130, 6, G.muse / 100, C.muse);
  void dark;
}
function frameTop(g) { g.drawImage(frame, 0, 0, 1080, 608); }
function label(g, t, x, y, color) { return text(g, t, x, y, { size: SMALL, weight: 700, color }); }

// ----- A: the "Now" card
function optionA() {
  const c = createCanvas(1080, 1080); const g = c.getContext('2d');
  frameTop(g);
  g.fillStyle = C.bg; g.fillRect(0, 608, 1080, 472);
  // a milestone over the game
  rr(g, 760, 548, 290, 44, 22); g.fillStyle = 'rgba(15,19,26,0.82)'; g.fill();
  g.drawImage(icon.star, 774, 556, 28, 28); text(g, G.milestones[0], 812, 578, { weight: 700, color: C.gold });
  header(g, 648);
  g.fillStyle = C.line; g.fillRect(34, 664, 1012, 2);
  // the Now card, left
  const x = 34;
  rr(g, x - 6, 680, 640, 378, 18); g.fillStyle = C.card; g.fill();
  label(g, `Muse's command \u00b7 step ${G.step} of ${G.steps} \u00b7 ${G.elapsed}`, x + 18, 712, C.muse);
  g.font = F(700, BIG);
  wrap(g, G.command, 590).forEach((l, i) => text(g, l, x + 18, 754 + i * 40, { size: BIG, weight: 700 }));
  g.fillStyle = C.muse; g.fillRect(x + 18, 812, 4, 60);
  g.font = F(500, SMALL);
  const why = wrap(g, `\u201c${G.why}\u201d`, 560, 2);
  why.forEach((l, i) => text(g, l, x + 34, 834 + i * 30, { color: '#d9d3ff' }));
  sampleTag(g, x + 34 + g.measureText(why.at(-1)).width + 10, 834 + (why.length - 1) * 30);
  const bw = label(g, 'The body is carrying it out', x + 18, 912, C.body); sampleTag(g, x + 18 + bw + 10, 912);
  g.drawImage(icon[G.sub.icon], x + 18, 920, 34, 34);
  text(g, G.sub.text, x + 62, 948, { size: BIG, weight: 600 });
  text(g, G.sub.count, x + 610, 946, { weight: 600, color: C.body, align: 'right' });
  bar(g, x + 62, 960, 548, 10, G.sub.done / G.sub.of, C.body);
  g.drawImage(icon.boot, x + 18, 984, 30, 30);
  text(g, 'Step 1: walked to 360 35 -77', x + 62, 1008, { weight: 600, color: C.soft });
  text(g, 'done 68 s', x + 610, 1008, { weight: 600, color: C.ok, align: 'right' });
  text(g, 'Reflex on the way: fought a creeper', x + 62, 1040, { color: C.muted });
  // right: what Muse saw and was told, then the last commands
  const rx = 700; let ry = 704;
  const lw = label(g, 'Muse checked', rx, ry, C.soft); sampleTag(g, rx + lw + 10, ry);
  ry += 30; g.font = F(500, SMALL);
  for (const l of wrap(g, G.checked, 346)) { text(g, l, rx, ry); ry += 28; }
  ry += 14; label(g, 'Body advice', rx, ry, C.gold);
  ry += 30; g.font = F(500, SMALL);
  for (const l of wrap(g, G.adviceShort, 346)) { text(g, l, rx, ry); ry += 28; }
  text(g, `\u2192 ${G.followed}`, rx, ry, { weight: 600, color: C.ok }); ry += 44;
  label(g, 'Before', rx, ry, C.soft); ry += 36;
  for (const h of G.history.slice(1, 3)) {
    g.drawImage(icon[h.icon], rx, ry - 24, 30, 30);
    text(g, h.text, rx + 40, ry, { weight: 600 });
    if (h.state === 'done') text(g, h.time, 1046, ry, { weight: 600, color: C.ok, align: 'right' });
    if (h.state === 'failed') { ry += 28; text(g, `Failed: ${h.short.toLowerCase()}`, rx + 40, ry, { color: C.fail }); }
    ry += 36;
  }
  return c;
}

// ----- B: a timeline of skill chips
function optionB() {
  const c = createCanvas(1080, 1080); const g = c.getContext('2d');
  frameTop(g);
  g.fillStyle = C.bg; g.fillRect(0, 608, 1080, 472);
  header(g, 648);
  g.fillStyle = C.line; g.fillRect(34, 664, 1012, 2);
  // Muse's words, as a quote across the top
  g.fillStyle = C.muse; g.fillRect(34, 684, 4, 64);
  sampleTag(g, 50 + label(g, 'Muse', 50, 700, C.muse) + 10, 700);
  g.font = F(500, SMALL);
  wrap(g, `“${G.why}”`, 980, 2).forEach((l, i) => text(g, l, 50, 728 + i * 28, { color: '#d9d3ff' }));
  // the timeline: oldest left, the command now on the right, larger
  const chips = [...G.history.slice(0, 4)].reverse();
  const cw = 158; const ch = 170; let x = 34; const y = 772;
  g.fillStyle = C.line; g.fillRect(34, y + ch / 2, 1012, 2);
  for (const h of chips) {
    rr(g, x, y, cw, ch, 16); g.fillStyle = C.card; g.fill();
    g.strokeStyle = h.state === 'failed' ? 'rgba(255,138,122,0.7)' : 'rgba(255,255,255,0.08)'; g.lineWidth = 2; g.stroke();
    g.drawImage(icon[h.icon], x + 14, y + 14, 40, 40);
    text(g, h.state === 'done' ? h.time : 'failed', x + cw - 14, y + 40, { weight: 600, color: h.state === 'done' ? C.ok : C.fail, align: 'right' });
    g.font = F(600, SMALL);
    wrap(g, h.text, cw - 28, 2).forEach((l, i) => text(g, l, x + 14, y + 86 + i * 26, { weight: 600 }));
    if (h.state === 'failed') text(g, h.short, x + 14, y + 150, { color: C.fail });
    else if (h.note) text(g, 'creeper fight', x + 14, y + 150, { color: C.muted });
    x += cw + 10;
  }
  // now
  const nw = 1046 - x; rr(g, x, y - 8, nw, ch + 16, 18); g.fillStyle = '#211d3a'; g.fill(); g.strokeStyle = C.muse; g.lineWidth = 2; g.stroke();
  g.drawImage(icon.pickaxe, x + 16, y + 8, 44, 44);
  label(g, `Now · ${G.elapsed}`, x + 70, y + 38, C.muse);
  g.font = F(700, SMALL);
  wrap(g, 'Mine 14 obsidian at the lava pool', nw - 32, 2).forEach((l, i) => text(g, l, x + 16, y + 86 + i * 28, { weight: 700 }));
  text(g, G.sub.count, x + 16, y + 146, { color: C.body });
  bar(g, x + 16, y + 156, nw - 32, 8, G.sub.done / G.sub.of, C.body);
  // what Muse saw and was told
  let ly = 990;
  g.drawImage(icon.compass, 34, ly - 24, 30, 30);
  text(g, `Muse checked: ${G.checked}`, 74, ly, { color: C.soft }); sampleTag(g, 74 + g.measureText(`Muse checked: ${G.checked}`).width + 10, ly);
  ly += 36; g.drawImage(icon.star, 34, ly - 24, 30, 30);
  text(g, `Advice: nearest lava pool 69 blocks away → `, 74, ly, { color: C.gold });
  text(g, 'followed', 74 + g.measureText('Advice: nearest lava pool 69 blocks away → ').width, ly, { weight: 600, color: C.ok });
  // milestones, apart
  rr(g, 34, 560, 470, 40, 20); g.fillStyle = 'rgba(15,19,26,0.82)'; g.fill();
  g.drawImage(icon.star, 46, 566, 28, 28); text(g, `${G.milestones[0]}  ·  ${G.milestones[1]}`, 84, 588, { weight: 700, color: C.gold });
  return c;
}

// ----- C: a broadcast lower-third over the game, which fills the frame
function optionC() {
  const c = createCanvas(1080, 1080); const g = c.getContext('2d');
  // the middle of the 16:9 picture, to the square (on air the camera's 960x540 is cut the same way)
  g.drawImage(frame, (1080 - 608) / 2, 0, 608, 608, 0, 0, 1080, 1080);
  const grad = g.createLinearGradient(0, 520, 0, 1080);
  grad.addColorStop(0, 'rgba(8,10,16,0)'); grad.addColorStop(0.35, 'rgba(8,10,16,0.78)'); grad.addColorStop(1, 'rgba(8,10,16,0.92)');
  g.fillStyle = grad; g.fillRect(0, 520, 1080, 560);
  // the top bugs: live, the status, Muse's share
  rr(g, 30, 28, 96, 38, 8); g.fillStyle = '#e5484d'; g.fill(); text(g, 'MUSE', 44, 55, { weight: 700, color: '#fff' });
  rr(g, 134, 28, 430, 38, 8); g.fillStyle = 'rgba(8,10,16,0.7)'; g.fill();
  rr(g, 776, 28, 274, 38, 8); g.fillStyle = 'rgba(8,10,16,0.7)'; g.fill();
  header(g, 56, 146, 1036);
  // a milestone banner
  rr(g, 310, 96, 460, 46, 23); g.fillStyle = 'rgba(26,22,8,0.86)'; g.fill(); g.strokeStyle = C.gold; g.lineWidth = 2; g.stroke();
  g.drawImage(icon.star, 330, 104, 30, 30); text(g, `Milestone: ${G.milestones[0]}`, 370, 128, { weight: 700, color: C.gold });
  // the lower third
  let y = 700;
  rr(g, 34, y - 30, 176, 40, 6); g.fillStyle = C.muse; g.fill(); text(g, `Step ${G.step} of ${G.steps}`, 50, y - 2, { weight: 700, color: '#141026' });
  text(g, G.elapsed, 224, y - 2, { weight: 600, color: C.soft });
  y += 48; g.font = F(700, BIG);
  for (const l of wrap(g, G.command, 1000)) { text(g, l, 34, y, { size: BIG, weight: 700 }); y += 42; }
  g.font = F(500, SMALL);
  const why = wrap(g, `Muse: “${G.why}”`, 1000, 2);
  why.forEach((l, i) => text(g, l, 34, y + 6 + i * 30, { color: '#d9d3ff' }));
  sampleTag(g, 34 + g.measureText(why.at(-1)).width + 10, y + 6 + (why.length - 1) * 30);
  y += 76;
  g.drawImage(icon[G.sub.icon], 34, y - 26, 34, 34);
  text(g, `The body: ${G.sub.text.toLowerCase()}`, 78, y, { weight: 600, color: C.body });
  text(g, G.sub.count, 1046, y, { weight: 600, color: C.body, align: 'right' });
  bar(g, 78, y + 14, 968, 10, G.sub.done / G.sub.of, C.body);
  y += 58;
  text(g, `Checked: ${G.checked}`, 34, y, { color: C.soft });
  y += 32;
  text(g, 'Advice: nearest lava pool 69 blocks away → ', 34, y, { color: C.gold });
  text(g, 'followed', 34 + g.measureText('Advice: nearest lava pool 69 blocks away → ').width, y, { weight: 600, color: C.ok });
  // the ticker of results along the bottom
  g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, 1030, 1080, 50);
  let tx = 34;
  for (const h of G.history.slice(0, 4)) {
    const s = h.state === 'done' ? `${h.text} · ${h.time}` : `${h.text} · failed: ${h.why.toLowerCase()}`;
    g.font = F(600, SMALL);
    if (tx + g.measureText(s).width > 1046) break; // whole items only
    tx += text(g, s, tx, 1063, { weight: 600, color: h.state === 'done' ? C.ok : C.fail }) + 30;

  }
  return c;
}

fs.mkdirSync(outDir, { recursive: true });
for (const [name, make] of [['A', optionA], ['B', optionB], ['C', optionC]]) {
  const c = make();
  // the source line, small, on every still
  const g = c.getContext('2d');
  text(g, `Option ${name} · commands, results, advice, milestones: game g0793f1 · "sample": Muse's words, live progress, state`, 540, 1076 - (name === 'C' ? 56 : 0), { size: 13, color: '#8a93a6', align: 'center' });
  fs.writeFileSync(path.join(outDir, `muse-panel-${name}.png`), c.toBuffer('image/png'));
  const p = createCanvas(390, 390); p.getContext('2d').drawImage(c, 0, 0, 390, 390);
  fs.writeFileSync(path.join(outDir, `muse-panel-${name}-phone.png`), p.toBuffer('image/png'));
  console.log(`wrote muse-panel-${name}.png and -phone.png`);
}
