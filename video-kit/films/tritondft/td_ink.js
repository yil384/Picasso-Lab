// td_ink.js - hand-drawn marks tracked to the 3D world (p5.brush layer, multiplied, boiling on twos) and the
// Canvas2D top layer (baked p5.brush SFX sprites, Loupe's one eye behind the lens, '!' takes, the smoke-ring cover).
import { PAL, TAU, clamp, sm, ob, win } from './td_core.js';
import { bakeWord, drawWord } from './td_letters.js';
import { star4 } from './td_faces.js';
import { K, NF, st, jobPos, TRI_TH } from './td_story.js';
import { L, station, ST } from './td_world.js';

const SPR = {};
export async function bakeLettering(W) {
  SPR.vroom = await bakeWord(W.THREE, 'vroom', 'VROOOM', 150, { fill: PAL.pop, shade: PAL.popD, arc: 0.14, jaunt: 0.22, seed: 4 }, 3);
  SPR.ding = await bakeWord(W.THREE, 'ding', 'DING!', 140, { fill: PAL.gold, shade: PAL.pop, arc: 0.06, jaunt: 0.2, seed: 7 }, 3);
}

const V = (W, x, y, z) => new W.THREE.Vector3(x, y, z);
function prj(W, ctx, p) { const v = p.isVector3 ? p : V(W, ...p); const s = ctx.project(v, W.camera); const vc = v.clone().applyMatrix4(W.camera.matrixWorldInverse); return { x: s.x, y: s.y, front: vc.z < 0, d: -vc.z }; }
function pxu(W, ctx, p) { const q = prj(W, ctx, p); return q.front ? (ctx.DH / 2) / (Math.tan(W.camera.fov * Math.PI / 360) * q.d) : 0; }
const wp = (W, obj, local = [0, 0, 0]) => obj.localToWorld(V(W, ...local));

function puff(brush, x, y, s, col, a) {
  if (a <= 0 || s < 2) return;
  brush.set('inkpen', col, 1.0 * a + 0.3);
  for (let q = 0; q < 3; q++) { const cx = x + (q - 1) * s * 0.8, cy = y - (q === 1 ? s * 0.4 : 0); const pts = []; for (let k = 0; k <= 8; k++) { const an = Math.PI + k / 8 * Math.PI; pts.push([cx + Math.cos(an) * s * 0.6, cy + Math.sin(an) * s * 0.6]); } brush.spline(pts, 0.5); }
}
function ticks(brush, x, y, r0, r1, n, a0, a1, col = PAL.ink, w = 1.3) {
  brush.set('bigink', col, w);
  for (let q = 0; q < n; q++) { const an = a0 + (a1 - a0) * q / Math.max(1, n - 1); brush.line(x + Math.cos(an) * r0, y + Math.sin(an) * r0, x + Math.cos(an) * r1, y + Math.sin(an) * r1); }
}
function zzz(brush, x, y, u, F, r) {
  for (let q = 0; q < 2; q++) {
    const t = ((F / 48 + q * 0.5) % 1); if (t > 0.85) continue;
    const s = u * (0.5 + 0.6 * t), X = x + t * u + 12, Y = y - t * 2.3 * u;
    brush.set('inkpen', PAL.ink, clamp(u / 16, 0.8, 1.8));
    brush.spline([[X - s / 2, Y - s / 2], [X + s / 2, Y - s / 2 + r.gauss(0, 0.5)], [X - s / 2, Y + s / 2], [X + s / 2, Y + s / 2]], 0.0);
  }
}

// ---------------------------------------------------------------------------------------------------
export function inkOverlay(W, ctx, brush) {
  const F = ctx.iw, r = ctx.boilRng('ink'), ink = PAL.ink;
  brush.noHatch();
  const hoot = W.hoot;
  const headW = wp(W, hoot.head, [0, 0.35, 0.1]), hu = pxu(W, ctx, headW), hp = prj(W, ctx, headW);
  // zzz over the sleeping owl (start and end of the loop)
  if ((F < K.bubble[0] + 2 || F >= K.flop[0] + 4) && hp.front) zzz(brush, hp.x + 0.2 * hu, hp.y - 0.05 * hu, hu * 0.16, F, r);
  // the idea bubble: a lattice doodle + '?'
  if (win(F, K.bubble[0], K.bubble[1])) {
    const k = ob((F - K.bubble[0]) / 6) * (1 - sm((F - K.bubble[1] + 4) / 4));
    const c = prj(W, ctx, wp(W, hoot.head, [0.5, 0.62, 0])), s = 0.3 * hu * k;
    if (s > 3) {
      brush.noStroke(); brush.fill(PAL.cream, 255); brush.fillBleed(0.01); brush.fillTexture(0.1, 0.1);
      const pts = []; for (let q = 0; q < 14; q++) { const a = q / 14 * TAU, rr = s * (1 + 0.12 * Math.sin(q * 3.7)); pts.push([c.x + Math.cos(a) * rr * 1.3, c.y + Math.sin(a) * rr]); }
      brush.polygon(pts); brush.polygon(pts); brush.noFill();
      brush.set('bigink', ink, 1.2); brush.beginShape(0.5); pts.forEach(([a, b]) => brush.vertex(a, b)); brush.endShape(true);
      for (const [dx, dy, rr] of [[-0.9, 1.25, 0.18], [-1.25, 1.7, 0.1]]) { brush.noStroke(); brush.fill(PAL.cream, 255); brush.circle(c.x + dx * s, c.y + dy * s, rr * s, 0.1); brush.noFill(); brush.set('inkpen', ink, 1.1); brush.circle(c.x + dx * s, c.y + dy * s, rr * s, 0.1); }
      const q = s * 0.35, x0 = c.x - s * 0.75, y0 = c.y - s * 0.1;
      brush.set('inkpen', ink, 1.2); brush.rect(x0, y0 - q * 0.2, q, q); brush.rect(x0 + q * 0.4, y0 - q * 0.6, q, q);
      brush.set('bigink', PAL.pop, 1.6); brush.spline([[c.x + s * 0.35, c.y - s * 0.35], [c.x + s * 0.6, c.y - s * 0.55], [c.x + s * 0.8, c.y - s * 0.3], [c.x + s * 0.58, c.y - s * 0.02], [c.x + s * 0.57, c.y + s * 0.2]], 0.4); brush.line(c.x + s * 0.57, c.y + s * 0.38, c.x + s * 0.58, c.y + s * 0.45);
    }
  }
  // scribbling the card
  if (win(F, K.write[0], K.write[1]) && F % 4 < 2) { const c = prj(W, ctx, [L.desk.x + 0.05, 0.03, L.desk.z - 0.2]); brush.set('inkpen', ink, 1.0); brush.line(c.x - 10, c.y - 30 - (F % 8), c.x + 14, c.y - 34 - (F % 6)); }
  // the tube: gulp puff at the mouth; motion lines on the travelling bulge (both ways)
  if (win(F, K.gulp, K.gulp + 8)) { const m0 = W.tube.curve.getPointAt(0), m = prj(W, ctx, m0), u = pxu(W, ctx, m0); puff(brush, m.x, m.y + 0.1 * u, 0.12 * u * (1 + (F - K.gulp) * 0.1), ink, 1 - (F - K.gulp) / 8); }
  if (st.bulgeU >= 0 && st.bulgeU <= 1) {
    const back = F >= K.suck[1] && F < K.land, u = st.bulgeU, p = W.tube.curve.getPointAt(u), p2 = W.tube.curve.getPointAt(clamp(u + (back ? 0.04 : -0.04)));
    const a = prj(W, ctx, p), b = prj(W, ctx, p2), s = pxu(W, ctx, p);
    if (a.front) { const dx = a.x - b.x, dy = a.y - b.y, l = Math.hypot(dx, dy) || 1; brush.set('bigink', ink, 1.1); for (let q = -1; q <= 1; q++) brush.line(a.x - dx / l * s * 0.25 + (-dy / l) * q * s * 0.06, a.y - dy / l * s * 0.25 + (dx / l) * q * s * 0.06, a.x - dx / l * s * (0.55 + 0.15 * Math.abs(q)) + (-dy / l) * q * s * 0.06, a.y - dy / l * s * (0.55 + 0.15 * Math.abs(q)) + (dx / l) * q * s * 0.06); }
  }
  // the clocks start: THUNK dust at the giant hourglass, a tink at the tiny one
  if (win(F, K.clock, K.clock + 10)) {
    const g = W.giant.g.position, a = F - K.clock;
    for (const sd of [-1, 1]) { const c = prj(W, ctx, [g.x + sd * 0.3, 0.03, g.z + 0.1]), u = pxu(W, ctx, [g.x, 0, g.z]); if (c.front) puff(brush, c.x + sd * a * 3, c.y - a, 0.1 * u * (1 + a * 0.1), ink, 1 - a / 10); }
    const t = W.tiny.g.position, c = prj(W, ctx, [t.x, 0.3, t.z]), u = pxu(W, ctx, t);
    if (c.front && a < 6) ticks(brush, c.x, c.y, 0.06 * u, 0.14 * u, 5, -2.8, -0.3, ink, 1.1);
  }
  // Planner: chop streaks
  if (win(F, K.chop, K.chop + 6)) { const tp = station(TRI_TH), t = prj(W, ctx, [tp[0] + 0.2, 0.5, tp[2] + 0.2]), u = pxu(W, ctx, [tp[0], 0.5, tp[2]]); ticks(brush, t.x, t.y, 0.15 * u, 0.3 * u, 6, -2.6, -0.5, ink, 1.4); }
  // Executor typing clicks
  if (win(F, K.type[0], K.rip) && F % 3 === 0) { const c = prj(W, ctx, wp(W, W.clack.body, [0.1 * Math.sin(F), 0.35, 0.3])), u = pxu(W, ctx, wp(W, W.clack.body, [0, 0.3, 0.3])); ticks(brush, c.x, c.y, 0.06 * u, 0.13 * u, 3, -2.2, -0.9, ink, 1.1); }
  // S3b: the engine's gust reaches the desk (wind strokes)
  if (win(F, K.gust[0], K.gust[1] + 4)) {
    const a = (F - K.gust[0]) / 12;
    for (let q = 0; q < 4; q++) { const y = hp.y + (q - 1.5) * 0.35 * hu, x0 = hp.x + 2.4 * hu - a * 3.4 * hu; brush.set('inkpen', '#6d7a90', 1.3); brush.spline([[x0, y], [x0 - 0.5 * hu, y - 0.08 * hu], [x0 - 1.0 * hu, y + 0.02 * hu]], 0.6); }
  }
  // Refiner: click ticks; two pennies fly off when it backs off
  for (const f0 of [...K.click, K.cutoff]) if (win(F, f0, f0 + 6)) { const kn = W.con.knobs[f0 === K.cutoff ? 1 : 0], c = prj(W, ctx, wp(W, kn, [0, 0.06, 0])), u = pxu(W, ctx, wp(W, kn)); ticks(brush, c.x, c.y, 0.08 * u * (1 + (F - f0) * 0.1), 0.17 * u, 5, -2.8, -0.3, ink, 1.2); }
  if (win(F, K.click[2], K.click[2] + 14)) for (const sd of [0, 1]) {
    const pan = W.tilt.pans[1].g.position, a = (F - K.click[2] - sd * 3) / 11;
    if (a < 0 || a > 1) continue;
    const c = prj(W, ctx, [pan.x + (0.35 + 0.1 * sd) * a, pan.y - 0.2 + 0.45 * Math.sin(Math.PI * a), pan.z + 0.25 * a]), u = pxu(W, ctx, pan);
    brush.noStroke(); brush.fill('#d6813f', 255); brush.fillBleed(0.01); brush.circle(c.x, c.y, 0.035 * u, 0.1); brush.noFill(); brush.set('inkpen', ink, 1.0); brush.circle(c.x, c.y, 0.035 * u, 0.1);
  }
  // the tiny hourglass's last grain drops as the answer lands (tink)
  if (win(F, K.land, K.land + 7)) { const t = W.tiny.g.position, c = prj(W, ctx, [t.x, 0.34, t.z]), u = pxu(W, ctx, t); if (c.front) ticks(brush, c.x, c.y, 0.06 * u, 0.15 * u, 6, 0, TAU * 5 / 6, ink, 1.2); }
  // the agents land on the desk (puffs)
  [K.outs[0], K.outs[1], K.outs[2]].forEach((f0, j) => { const a = F - f0 - 12; if (a < 0 || a >= 8) return; const s = [W.tri, W.loupe, W.tilt][j].root.position, c = prj(W, ctx, [s.x, 0.02, s.z]), u = pxu(W, ctx, s); puff(brush, c.x, c.y, 0.1 * u * (1 + a * 0.12), ink, 1 - a / 8); });
  if (win(F, K.slam[1] + 10, K.slam[1] + 18)) { const s = W.clack.root.position, a = F - K.slam[1] - 10, c = prj(W, ctx, [s.x, 0.02, s.z]), u = pxu(W, ctx, s); puff(brush, c.x, c.y, 0.1 * u * (1 + a * 0.12), ink, 1 - a / 8); }
  // payoff: the stamp's ink star on the scorecard; plink ticks at the pan; the owl's feather burst
  if (win(F, K.slam[0], K.slam[0] + 8)) { const n = W.score.position, c = prj(W, ctx, n), u = pxu(W, ctx, n); ticks(brush, c.x, c.y, 0.14 * u, 0.3 * u, 9, 0, TAU * 8 / 9, PAL.sky, 2.0); }
  if (win(F, K.slam[2] - 4, K.slam[2] + 6)) { const pan = W.tilt.pans[1].g.position, c = prj(W, ctx, pan), u = pxu(W, ctx, pan); ticks(brush, c.x, c.y - 0.25 * u, 0.1 * u, 0.2 * u, 5, -2.6, -0.5, ink, 1.2); }
  if (win(F, K.take, K.take + 16)) {
    const a = (F - K.take) / 16;
    for (let q = 0; q < 6; q++) { const an = -Math.PI * (0.1 + 0.8 * q / 5), d = hu * (0.3 + 0.5 * a); const x = hp.x + Math.cos(an) * d, y = hp.y + Math.sin(an) * d + a * a * 40; brush.set('inkpen', '#8a5a36', 1.3); brush.spline([[x - 10, y], [x, y - 8], [x + 12, y - 2]], 0.6); }
  }
  // numerals pop into puffs
  if (win(F, K.puffs, K.puffs + 10)) for (const key of ['n98', 'n68', 'n04']) { const n = W.num[key].group.position, c = prj(W, ctx, [n.x, 0.15, n.z]), u = pxu(W, ctx, n); puff(brush, c.x, c.y, 0.18 * u * (1 + (F - K.puffs) * 0.1), ink, 1 - (F - K.puffs) / 10); }
  // steam from Hoot's mug (loop-periodic wisps)
  const mug = W.mug.getWorldPosition(V(W, 0, 0, 0)), mc = prj(W, ctx, [mug.x, 0.25, mug.z]), mu = pxu(W, ctx, mug);
  if (mc.front && mu > 20) for (let q = 0; q < 2; q++) { const t = ((F / 36 + q * 0.5) % 1); const x = mc.x + (q - 0.5) * 0.06 * mu, y = mc.y - t * 0.25 * mu; brush.set('inkpen', '#9fb9cc', 1.0 * (1 - t) + 0.2); brush.spline([[x, y], [x + 0.03 * mu * Math.sin(t * 6 + q), y - 0.06 * mu], [x, y - 0.12 * mu]], 0.6); }
}

// ---------------------------------------------------------------------------------------------------
function bang(g, x, y, s, rot, r) {
  if (s < 3) return;
  const j = () => (r ? r.gauss(0, s * 0.012) : 0);
  const bar = [[-0.21, -1.0], [0.21, -1.03], [0.075, -0.3], [-0.075, -0.29]].map(([u, v]) => [u * s + j(), v * s + j()]);
  const shape = (dx, dy) => { g.beginPath(); bar.forEach(([u, v], q) => (q ? g.lineTo(u + dx, v + dy) : g.moveTo(u + dx, v + dy))); g.closePath(); g.moveTo(0.14 * s + dx, dy); g.arc(dx, dy, 0.14 * s, 0, TAU); };
  g.save(); g.translate(x, y); g.rotate(rot); g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = PAL.ink; g.strokeStyle = PAL.ink; g.lineWidth = s * 0.13;
  shape(s * 0.06, s * 0.07); g.fill(); g.stroke();
  shape(0, 0); g.stroke();
  g.fillStyle = PAL.pop; shape(0, 0); g.fill();
  g.restore();
}
function sweat(g, x, y, s) {
  g.save(); g.translate(x, y); g.lineJoin = 'round';
  g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * 0.55, -s * 0.1, s * 0.4, s * 0.35); g.arc(0, s * 0.35, s * 0.4, 0, Math.PI); g.quadraticCurveTo(-s * 0.55, -s * 0.1, 0, -s); g.closePath();
  g.fillStyle = '#9fdcf6'; g.fill(); g.lineWidth = s * 0.16; g.strokeStyle = PAL.ink; g.stroke(); g.restore();
}

/** Loupe's one eye behind the lens: an affine map of the unit disc onto the projected lens. */
function lensEye(W, ctx, g, F) {
  const Lp = st.loupe; if (!Lp || !W.loupe.root.visible) return;
  const hd = W.loupe.head, rr = Lp.rimR - 0.012;
  const c = prj(W, ctx, wp(W, hd, [0, 0, 0.01])), ux = prj(W, ctx, wp(W, hd, [rr, 0, 0.01])), uy = prj(W, ctx, wp(W, hd, [0, rr, 0.01]));
  if (!c.front) return;
  const camToLens = W.camera.position.clone().sub(wp(W, hd, [0, 0, 0])), nrm = wp(W, hd, [0, 0, 1]).sub(wp(W, hd, [0, 0, 0]));
  if (camToLens.dot(nrm) <= 0) return;                 // seen from behind: no eye
  g.save();
  g.transform(ux.x - c.x, ux.y - c.y, -(uy.x - c.x), -(uy.y - c.y), c.x, c.y);   // unit disc -> lens ellipse (y up)
  g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.clip();
  const e = Lp.eye, look = e === 'big' ? 0.12 * Math.sin(F * 0.3) : 0, ex = 0.0 + look, ey = 0.08;
  g.fillStyle = PAL.ink; g.strokeStyle = PAL.ink; g.lineCap = 'round';
  if (e === 'dot') { g.beginPath(); g.ellipse(ex, ey, 0.17, 0.25, 0, 0, TAU); g.fill(); g.fillStyle = PAL.cream; g.beginPath(); g.ellipse(ex - 0.05, ey + 0.08, 0.05, 0.04, 0, 0, TAU); g.fill(); }
  if (e === 'big') { const s = 0.55; g.beginPath(); g.ellipse(ex, ey - 0.05, s, s * 1.1, 0, 0, TAU); g.fill(); g.fillStyle = PAL.cream; g.beginPath(); g.ellipse(ex - s * 0.3, ey + s * 0.35, s * 0.24, s * 0.18, 0, 0, TAU); g.fill(); }
  if (e === 'spiral') { g.lineWidth = 0.08; g.beginPath(); for (let k = 0; k <= 40; k++) { const an = k / 40 * TAU * 2.4 + F * 0.4, rad = 0.03 + k * 0.011; const x = ex + Math.cos(an) * rad, y = ey + Math.sin(an) * rad; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  if (e === 'star') { g.beginPath(); star4(ex, ey, 0.5, 0.2).forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = '#1d1a40'; g.fill(); }
  g.restore();
}

function smokeCover(g, F) {
  // Big Iron's smoke ring rolls into the lens and covers the frame for 4 frames; the cut to the desk hides under it
  const a = F - K.cover[0], b = F - K.S3b;
  let k = 0;
  if (a >= 0 && F < K.S3b) k = sm(a / 4);
  if (b >= 0 && b < 8) k = 1 - sm((b - 2) / 6);
  if (k <= 0) return;
  const cx = 960 + 80 * Math.sin(F * 0.3), cy = 520, R = 1400 * k;
  g.save();
  g.beginPath(); for (let q = 0; q <= 40; q++) { const an = q / 40 * TAU, rr = R * (1 + 0.06 * Math.sin(q * 5.3 + F)); q ? g.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.8) : g.moveTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.8); }
  g.closePath();
  g.globalAlpha = Math.min(1, 1.2 * k);
  g.fillStyle = '#e2ecf2'; g.fill();
  g.lineWidth = 9; g.strokeStyle = PAL.ink; g.stroke();
  g.clip();
  g.fillStyle = 'rgba(11,53,88,0.28)';
  for (let y = 0; y < 1080; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < 1920; x += 22) { const dd = Math.hypot(x - cx, y - cy) / (R + 1); const rad = 5.5 * clamp(1.2 - dd) * k; if (rad > 0.6) { g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); } }
  g.restore();
}

/** a chunky hand-drawn verdict mark (X = fail, V = check) with an offset ink shadow, like the '!' takes */
function mark(g, x, y, s, kind, rot) {
  if (s < 3) return;
  const pts = kind === 'x' ? [[[-0.5, -0.55], [0.5, 0.5]], [[0.5, -0.55], [-0.48, 0.52]]] : [[[-0.55, 0.0], [-0.12, 0.45], [0.62, -0.62]]];
  const path = () => { g.beginPath(); for (const p of pts) p.forEach(([u, v], k) => (k ? g.lineTo(u * s, v * s) : g.moveTo(u * s, v * s))); };
  g.save(); g.translate(x, y); g.rotate(rot); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = PAL.ink; g.lineWidth = s * 0.34; g.save(); g.translate(s * 0.06, s * 0.07); path(); g.stroke(); g.restore();
  path(); g.stroke();
  g.strokeStyle = kind === 'x' ? PAL.pop : PAL.sky; g.lineWidth = s * 0.2; path(); g.stroke();
  g.restore();
}

export function lettering(W, ctx, g) {
  const F = ctx.iw, jr = ctx.boilRng('letters');
  lensEye(W, ctx, g, F);
  const hoot = W.hoot, headW = wp(W, hoot.head, [0, 0.35, 0.1]), hu = pxu(W, ctx, headW), hp = prj(W, ctx, headW);
  const takes = [[K.wake, hp, hu * 0.5, 0.15], [K.deal[0] + 2, prj(W, ctx, wp(W, W.clack.body, [0.2, 0.5, 0])), pxu(W, ctx, wp(W, W.clack.body)) * 0.22, 0.1],
    [K.crash, prj(W, ctx, wp(W, W.tilt.head, [0.12, 0.12, 0])), pxu(W, ctx, wp(W, W.tilt.head)) * 0.22, -0.1], [K.take, hp, hu * 0.55, -0.12]];
  for (const [f0, p, s, rot] of takes) { const a = F - f0; if (a < 0 || a > 16 || !p.front) continue; bang(g, p.x + s * 0.45, p.y - s * 0.1, s * ob(a / 4) * (1 - sm((a - 12) / 4)), rot, jr); }
  const sw = [[K.glance[0] + 8, K.S4, hp, hu * 0.12], [K.crash + 4, K.click[2] + 6, prj(W, ctx, wp(W, W.tilt.head, [0.14, 0.05, 0])), pxu(W, ctx, wp(W, W.tilt.head)) * 0.06], [K.fail + 2, K.rush[0], prj(W, ctx, wp(W, W.loupe.head, [0.25, 0.15, 0])), pxu(W, ctx, wp(W, W.loupe.head)) * 0.06]];
  for (const [a0, a1, p, s] of sw) if (win(F, a0, a1) && p.front) sweat(g, p.x + s * 2, p.y - s * 0.8 + (F - a0) * 0.6, s);
  // the Analyzer's verdicts on the job: X when the check fails (carried round until the refined lap), a check after the DING
  if (W.cart.visible && (win(F, K.fail + 2, K.lap[0]) || win(F, K.ding + 4, K.suck[0]))) {
    const fail = F < K.lap[0], f0 = fail ? K.fail + 2 : K.ding + 4, sp = W.si.g.getWorldPosition(V(W, 0, 0, 0));
    const c = prj(W, ctx, [sp.x, sp.y + 0.36, sp.z]), u = pxu(W, ctx, sp);
    if (c.front) mark(g, c.x, c.y, clamp(0.16 * u, 18, 90) * ob((F - f0) / 5), fail ? 'x' : 'v', fail ? 0.08 : -0.06);
  }
  const vr = F - K.roar;
  if (vr >= 0 && vr < 30) { const E = prj(W, ctx, [L.engine.x - 0.6, 1.9, L.engine.z + 0.4]); drawWord(g, SPR.vroom, F, clamp(E.x - 120, 380, 1240), clamp(E.y + 40, 260, 520), vr, { life: 30, rot: -0.1, scale: 1.05, popF: 4 }); }
  const dg = F - K.ding;
  if (dg >= 0 && dg < 24) { const bp = prj(W, ctx, W.bead.getWorldPosition(V(W, 0, 0, 0))); drawWord(g, SPR.ding, F, clamp(bp.x - 300, 380, 1200), clamp(bp.y - 160, 260, 480), dg, { life: 24, rot: -0.12, scale: 1.0, popF: 4 }); }
  smokeCover(g, F);
}
