// cm_paint.js - every painted texture of the film (p5.brush, baked once; see cachedTexture in cm_core.js).
import { PAL, W, CITY, stationX, hsh, TAU } from './cm_core.js';
import { SKEL, ell, smoothPts } from './cm_glyphs.js';

// ---------------------------------------------------------------------------------------------------
// brush helpers
// ---------------------------------------------------------------------------------------------------
export function fillP(brush, pts, col, op = 255, bleed = 0.015, tex = 0.12) {
  brush.noStroke(); brush.noHatch(); brush.fill(col, op); brush.fillBleed(bleed); brush.fillTexture(tex, 0.2); brush.polygon(pts); brush.noFill();
}
export const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export function star4(x, y, r, rot = 0) { const pts = []; for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.3 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return pts; }
function inkPoly(brush, pts, col, w, close = true, curv = 0.2) { brush.set('bigink', col, w); brush.beginShape(curv); pts.forEach(([x, y]) => brush.vertex(x, y)); brush.endShape(close); }

export function addBrushes(brush) {
  brush.add('inkpen', { type: 'default', weight: 3.2, scatter: 0.12, sharpness: 0.85, grain: 30, opacity: 235, spacing: 0.2, pressure: [1.15, 0.75], rotate: 'natural', noise: 0.1 });
  brush.add('bigink', { type: 'default', weight: 6, scatter: 0.2, sharpness: 0.8, grain: 30, opacity: 235, spacing: 0.2, pressure: [1.2, 0.7], rotate: 'natural', noise: 0.15 });
  brush.add('fatink', { type: 'default', weight: 11, scatter: 0.18, sharpness: 0.75, grain: 24, opacity: 240, spacing: 0.18, pressure: [1.25, 0.6], rotate: 'natural', noise: 0.12 });
  brush.add('chalk', { type: 'default', weight: 9, scatter: 0.6, sharpness: 0.3, grain: 8, opacity: 170, spacing: 0.4, pressure: [1, 0.8], rotate: 'natural', noise: 0.4 });
}

/** brush lettering from SKEL skeletons: word centred at (cx, cy), cap height size, stroke weight mult w */
export function brushWord(brush, word, cx, cy, size, col, w = 1, gap = 0.2, slant = 0) {
  const L = [...word].map((ch) => SKEL[ch]);
  const widths = L.map((G) => G.w + 0.12);
  const total = widths.reduce((s, v) => s + v, 0) + gap * (L.length - 1);
  let x = cx - total * size / 2;
  L.forEach((G, i) => {
    const x0 = x + (widths[i] / 2 - G.w / 2) * size;
    const P = ([u, v]) => [x0 + u * size + (0.5 - v) * slant * size, cy + (v - 0.5) * size];
    brush.set('fatink', col, size / 150 * w);
    for (const s of G.s) {
      const pts = (G.smooth ? smoothPts(s, 4) : s).map(P);
      if (pts.length === 2) brush.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
      else if (G.smooth) brush.spline(pts, 0.4);
      else { for (let k = 0; k < pts.length - 1; k++) brush.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]); }
    }
    for (const d of G.dots || []) { const [px, py] = P(d); fillP(brush, ell(px, py, size * 0.075 * Math.sqrt(w), size * 0.075 * Math.sqrt(w)), col, 255, 0.01, 0.05); fillP(brush, ell(px, py, size * 0.075 * Math.sqrt(w), size * 0.075 * Math.sqrt(w)), col, 255, 0.01, 0.05); }
    x += (widths[i] + gap) * size;
  });
}
/** sign-painter lettering: ink under-stroke (offset shadow), ink keyline, colour on top */
export function signWord(brush, word, cx, cy, size, fill, ink = PAL.ink, gap = 0.2, slant = 0.1) {
  brushWord(brush, word, cx + size * 0.05, cy + size * 0.06, size, ink, 2.9, gap, slant);
  brushWord(brush, word, cx, cy, size, ink, 2.9, gap, slant);
  brushWord(brush, word, cx, cy, size, fill, 1.35, gap, slant);
  brushWord(brush, word, cx, cy, size, fill, 1.35, gap, slant);
}

// ---------------------------------------------------------------------------------------------------
// faces. chip: planar front decal (w x h); py: sphere equirect, face at u = 0.25; giant: visor strip.
// ---------------------------------------------------------------------------------------------------
export const EXPR = {
  chip: ['calm', 'determined', 'happy', 'surprised', 'squint', 'angry', 'sheepish', 'grin', 'shock', 'strain'],
  py: ['calm', 'determined', 'happy', 'surprised', 'squint', 'angry', 'swirl', 'smug', 'grin', 'shock'],
  giant: ['smug', 'fierce', 'shock'],
};
export function paintFace(brush, who, expr, Wd, Hh, v) {
  const ink = PAL.ink;
  const sphere = who === 'py';
  if (who === 'giant') return paintVisor(brush, expr, Wd, Hh, v);
  const cx = sphere ? Wd * 0.25 : Wd / 2, cy = sphere ? Hh * 0.47 : Hh * 0.5;
  const s = sphere ? (Wd / 1024) * 1.5 : (Wd / 512) * 1.12;
  const j = (a) => (hsh(v, a, 3.1) - 0.5) * 3 * s;
  const ex = (sphere ? 62 : 92) * s, ey = (sphere ? -16 : -30) * s;
  const my = cy + (sphere ? 58 : 62) * s;
  const eyes = [[cx - ex, cy + ey], [cx + ex, cy + ey]];
  if (sphere) {   // Py's round glasses (the scholar twin)
    for (const [x, y] of eyes) { brush.set('bigink', ink, 1.25 * s); brush.circle(x, y, 44 * s, 0.12); }
    brush.set('bigink', ink, 1.1 * s); brush.spline([[cx - ex + 42 * s, cy + ey - 6 * s], [cx, cy + ey - 16 * s], [cx + ex - 42 * s, cy + ey - 6 * s]], 0.6);
    brush.line(cx - ex - 44 * s, cy + ey - 4 * s, cx - ex - 130 * s, cy + ey - 16 * s);
    brush.line(cx + ex + 44 * s, cy + ey - 4 * s, cx + ex + 130 * s, cy + ey - 16 * s);
  } else {        // Chip: the pin-1 dot of the IC package
    fillP(brush, ell(Wd * 0.1, Hh * 0.14, 16 * s, 16 * s), '#8a4a10', 200, 0.02, 0.1);
  }
  const dotEyes = (rx, ry, look = 0) => eyes.forEach(([x, y], i) => {
    const X = x + j(i) + look * 8 * s, Y = y + j(i + 3);
    const E = ell(X, Y, rx * s, ry * s);
    fillP(brush, E, ink); fillP(brush, E, ink); fillP(brush, E, ink, 200);
    fillP(brush, ell(X - rx * 0.32 * s, Y - ry * 0.42 * s, rx * 0.34 * s, ry * 0.24 * s), '#fffaf0');
  });
  const arcs = (dir, w = 22, h = 14) => eyes.forEach(([x, y]) => { brush.set('fatink', ink, 0.95 * s); brush.spline([[x - w * s, y + dir * h * 0.3 * s], [x, y - dir * h * s], [x + w * s, y + dir * h * 0.3 * s]], 0.7); });
  const brows = (dir, lift = 0) => eyes.forEach(([x, y], i) => { const sg = i ? 1 : -1; brush.set('fatink', ink, 0.95 * s); brush.line(x - 24 * s, y - (sphere ? 56 : 44) * s - lift * s - dir * sg * 9 * s, x + 24 * s, y - (sphere ? 56 : 44) * s - lift * s + dir * sg * 9 * s); });
  const mouth = (kind) => {
    const m = s;
    if (kind === 'smile') { brush.set('bigink', ink, 1.2 * m); brush.spline([[cx - 26 * m, my - 6 * m], [cx, my + 12 * m], [cx + 26 * m, my - 6 * m]], 0.7); }
    if (kind === 'o') { for (let q = 0; q < 3; q++) fillP(brush, ell(cx, my + 4 * m, 13 * m, 17 * m), ink); fillP(brush, ell(cx, my + 9 * m, 7 * m, 7 * m), '#e8546a'); }
    if (kind === 'open') { const pts = [[cx - 32 * m, my - 8 * m], [cx + 32 * m, my - 8 * m], [cx + 24 * m, my + 14 * m], [cx, my + 26 * m], [cx - 24 * m, my + 14 * m]]; for (let q = 0; q < 3; q++) fillP(brush, pts, ink); fillP(brush, ell(cx, my + 14 * m, 15 * m, 8 * m), '#e8546a'); fillP(brush, ell(cx, my + 14 * m, 15 * m, 8 * m), '#e8546a'); }
    if (kind === 'grin') { const pts = [[cx - 42 * m, my - 10 * m], [cx + 42 * m, my - 10 * m], [cx + 28 * m, my + 17 * m], [cx - 28 * m, my + 17 * m]]; for (let q = 0; q < 3; q++) fillP(brush, pts, ink); fillP(brush, [[cx - 34 * m, my - 7 * m], [cx + 34 * m, my - 7 * m], [cx + 30 * m, my + 1 * m], [cx - 30 * m, my + 1 * m]], '#fffaf0'); }
    if (kind === 'flat') { brush.set('bigink', ink, 1.2 * m); brush.line(cx - 22 * m, my, cx + 22 * m, my + 2 * m); }
    if (kind === 'wavy') { brush.set('bigink', ink, 1.1 * m); brush.spline([[cx - 28 * m, my], [cx - 14 * m, my - 7 * m], [cx, my], [cx + 14 * m, my - 7 * m], [cx + 28 * m, my]], 0.6); }
    if (kind === 'teeth') { const pts = rect(cx - 34 * m, my - 10 * m, cx + 34 * m, my + 12 * m); fillP(brush, pts, '#fffaf0'); brush.set('bigink', ink, 1.0 * m); brush.polygon(pts); brush.line(cx - 34 * m, my + 1 * m, cx + 34 * m, my + 1 * m); for (let q = -2; q <= 2; q++) brush.line(cx + q * 12 * m, my - 10 * m, cx + q * 12 * m, my + 12 * m); }
    if (kind === 'smirk') { brush.set('bigink', ink, 1.2 * m); brush.spline([[cx - 22 * m, my + 2 * m], [cx + 4 * m, my + 6 * m], [cx + 26 * m, my - 10 * m]], 0.6); }
    if (kind === 'tongue') { mouth('smile'); brush.set('bigink', PAL.red, 0.9 * m); brush.line(cx, my + 6 * m, cx, my + 30 * m); brush.line(cx, my + 30 * m, cx - 8 * m, my + 40 * m); brush.line(cx, my + 30 * m, cx + 8 * m, my + 40 * m); }
  };
  const blush = () => [[cx - ex * 1.45, cy + 26 * s], [cx + ex * 1.45, cy + 26 * s]].forEach(([x, y]) => fillP(brush, ell(x, y, 24 * s, 12 * s), PAL.blush, 150, 0.08, 0.3));
  const sweat = () => { const x = cx + ex * 1.7, y = cy - 40 * s; fillP(brush, [[x, y - 26 * s], [x + 12 * s, y], [x + 8 * s, y + 12 * s], [x - 8 * s, y + 12 * s], [x - 12 * s, y]], '#8fd3f0', 255, 0.01, 0.05); brush.set('bigink', ink, 0.7 * s); brush.beginShape(0.3); [[x, y - 26 * s], [x + 12 * s, y], [x + 8 * s, y + 12 * s], [x - 8 * s, y + 12 * s], [x - 12 * s, y]].forEach(([a, b]) => brush.vertex(a, b)); brush.endShape(true); };
  switch (expr) {
    case 'calm': dotEyes(13, 21); mouth('smile'); break;
    case 'determined': dotEyes(13, 20); brows(1); mouth('flat'); break;
    case 'happy': arcs(1, 22, 15); mouth('open'); blush(); break;
    case 'surprised': dotEyes(17, 29); mouth('o'); break;
    case 'squint': eyes.forEach(([x, y], i) => { const sg = i ? -1 : 1; brush.set('fatink', ink, 0.95 * s); brush.line(x - 19 * s, y - sg * 4 * s, x + 19 * s, y + sg * 4 * s); }); mouth('teeth'); break;
    case 'angry': dotEyes(12, 15); brows(1.35); mouth(sphere ? 'teeth' : 'teeth'); break;
    case 'sheepish': arcs(1, 18, 10); brows(-0.8, -4); mouth('wavy'); sweat(); blush(); break;
    case 'grin': arcs(1, 22, 15); mouth('grin'); blush(); break;
    case 'shock': dotEyes(20, 32); brows(-1, 8); mouth('o'); break;
    case 'strain': eyes.forEach(([x, y], i) => { const sg = i ? -1 : 1; brush.set('fatink', ink, 0.95 * s); brush.spline([[x - 16 * sg * s, y - 14 * s], [x + 12 * sg * s, y], [x - 16 * sg * s, y + 14 * s]], 0.2); }); mouth('teeth'); break;
    case 'swirl': eyes.forEach(([x, y]) => { const pts = []; for (let k = 0; k <= 22; k++) { const a = k / 22 * TAU * 2.2, r = (3 + 22 * k / 22) * s; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } brush.set('bigink', ink, 0.8 * s); brush.spline(pts, 0.5); }); mouth('wavy'); break;
    case 'smug': eyes.forEach(([x, y]) => { fillP(brush, [[x - 16 * s, y - 2 * s], [x + 16 * s, y - 2 * s], [x + 14 * s, y + 12 * s], [x - 14 * s, y + 12 * s]], ink); }); brows(-0.6); mouth('smirk'); break;
    default: dotEyes(13, 21);
  }
}
function paintVisor(brush, expr, Wd, Hh, v) {
  // a dark visor band (the giant's head front) with one wide cold eye
  const ink = PAL.ink, cx = Wd / 2, cy = Hh * 0.5;
  fillP(brush, rect(-10, -10, Wd + 10, Hh + 10), '#2a2944', 255, 0.005, 0.2);
  fillP(brush, rect(-10, -10, Wd + 10, Hh + 10), '#2a2944', 200, 0.005, 0.3);
  const eye = (hw, top, bot, col) => { const pts = [[cx - hw, cy], [cx - hw * 0.7, cy - top], [cx + hw * 0.7, cy - top], [cx + hw, cy], [cx + hw * 0.7, cy + bot], [cx - hw * 0.7, cy + bot]]; fillP(brush, pts, col); fillP(brush, pts, col); fillP(brush, pts, col, 220); brush.set('bigink', '#0e0c1c', 1.2); brush.beginShape(0.2); pts.forEach(([a, b]) => brush.vertex(a, b)); brush.endShape(true); };
  if (expr === 'smug') { eye(Wd * 0.36, Hh * 0.08, Hh * 0.16, '#8ee3f5'); brush.set('fatink', '#cfd4ea', 1.4); brush.line(cx - Wd * 0.34, cy - Hh * 0.2, cx + Wd * 0.3, cy - Hh * 0.08); }
  if (expr === 'fierce') { eye(Wd * 0.36, Hh * 0.12, Hh * 0.12, '#8ee3f5'); brush.set('fatink', '#cfd4ea', 1.4); brush.line(cx - Wd * 0.36, cy - Hh * 0.32, cx + Wd * 0.36, cy - Hh * 0.12); }
  if (expr === 'shock') { eye(Wd * 0.3, Hh * 0.34, Hh * 0.34, '#e8fbff'); fillP(brush, ell(cx + (v - 0.5) * 6, cy, Wd * 0.05, Hh * 0.16), '#1b5f70'); }
}

// ---------------------------------------------------------------------------------------------------
// props
// ---------------------------------------------------------------------------------------------------
export function paintSign(brush, w, h) {   // "ChipMATE" shop sign: amber board, cream sign-painter letters
  fillP(brush, rect(-12, -12, w + 12, h + 12), PAL.amber, 255, 0.004, 0.25);
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#c86a05', 150, 0.01, 0.35);
  brush.set('inkpen', '#7a3e04', 1.2);
  for (let x = 30; x < w; x += 46) brush.line(x, h * 0.08, x + 20, h * 0.08);
  for (let x = 12; x < w; x += 46) brush.line(x, h * 0.92, x + 20, h * 0.92);
  signWord(brush, 'ChipMATE', w / 2, h * 0.52, h * 0.58, PAL.cream, PAL.ink, 0.12, 0.12);
}
export function paintBadge(brush, w, h, txt, board, fill, ink = PAL.ink) {   // small labels: "9B", "1.6T"
  fillP(brush, rect(-12, -12, w + 12, h + 12), board, 255, 0.004, 0.2);
  fillP(brush, rect(-12, -12, w + 12, h + 12), board, 170, 0.01, 0.3);
  signWord(brush, txt, w / 2, h * 0.52, h * 0.62, fill, ink, 0.16, 0.08);
}
export function paintHat(brush, w, h) {    // hard hat (hemisphere equirect): cream, amber stripe, "9B" badge at the front
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#fff3d8', 255, 0.004, 0.2);
  fillP(brush, rect(w * 0.235, -12, w * 0.265, h + 12), PAL.amber, 230, 0.01, 0.2);      // front ridge stripe
  fillP(brush, rect(w * 0.735, -12, w * 0.765, h + 12), PAL.amber, 230, 0.01, 0.2);
  fillP(brush, rect(w * 0.14, h * 0.5, w * 0.36, h * 0.96), PAL.ink, 255, 0.004, 0.1);
  fillP(brush, rect(w * 0.15, h * 0.52, w * 0.35, h * 0.94), PAL.amber, 255, 0.004, 0.1);
  brushWord(brush, '9B', w * 0.25 + 4, h * 0.73 + 5, h * 0.34, PAL.ink, 2.6, 0.16, 0.06);
  brushWord(brush, '9B', w * 0.25, h * 0.73, h * 0.34, PAL.cream, 1.5, 0.16, 0.06);
}
export function paintChest(brush, w, h) {  // giant chest plate "1.6T"
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#6b6a9c', 255, 0.004, 0.25);
  fillP(brush, rect(w * 0.08, h * 0.12, w * 0.92, h * 0.88), '#e8e1cc', 255, 0.004, 0.15);
  brush.set('bigink', PAL.ink, 1.2); brush.polygon(rect(w * 0.08, h * 0.12, w * 0.92, h * 0.88));
  for (const [x, y] of [[0.04, 0.06], [0.96, 0.06], [0.04, 0.94], [0.96, 0.94]]) fillP(brush, ell(x * w, y * h, 9, 9), '#2a2944');
  brushWord(brush, '1.6T', w / 2 + 6, h * 0.52 + 7, h * 0.52, PAL.ink, 2.6, 0.16, 0.06);
  brushWord(brush, '1.6T', w / 2, h * 0.52, h * 0.52, '#3a3960', 1.8, 0.16, 0.06);
}
export function paintPennant(brush, w, h) { // "71.2%" pennant (triangle flag, teal-slate), text on the left 70%
  fillP(brush, [[0, 0], [w, h * 0.5], [0, h]], '#6b6a9c', 255, 0.004, 0.2);
  fillP(brush, [[0, 0], [w, h * 0.5], [0, h]], '#5d5c8c', 150, 0.01, 0.3);
  signWord(brush, '71.2%', w * 0.36, h * 0.5, h * 0.36, PAL.cream, PAL.ink, 0.1, 0.06);
}
export function paintTicket(brush, w, h, slip) {   // order ticket (spec + port skeleton) or diagnostic slip
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#fffaf0', 255, 0.004, 0.25);
  const ink = PAL.ink, r = (a) => hsh(slip ? 7 : 3, a);
  if (!slip) {
    // port skeleton: a box with two inputs and one output
    const bx0 = w * 0.58, by0 = h * 0.2, bx1 = w * 0.84, by1 = h * 0.72;
    brush.set('bigink', ink, 1.3); brush.polygon(rect(bx0, by0, bx1, by1));
    fillP(brush, rect(bx0, by0, bx1, by1), '#f7d9a8', 180, 0.01, 0.2);
    brush.set('bigink', ink, 1.1);
    for (const y of [by0 + (by1 - by0) * 0.3, by0 + (by1 - by0) * 0.7]) { brush.line(bx0 - 50, y, bx0, y); brush.line(bx0 - 12, y - 9, bx0, y); brush.line(bx0 - 12, y + 9, bx0, y); }
    const yo = (by0 + by1) / 2; brush.line(bx1, yo, bx1 + 50, yo); brush.line(bx1 + 38, yo - 9, bx1 + 50, yo); brush.line(bx1 + 38, yo + 9, bx1 + 50, yo);
    // spec: scribbled handwriting lines
    brush.set('inkpen', ink, 1.3);
    for (let k = 0; k < 5; k++) { const y = h * (0.2 + k * 0.15), x1 = w * (0.44 - (k === 4 ? 0.14 : r(k) * 0.08)); const pts = []; for (let x = w * 0.07; x < x1; x += 9) pts.push([x, y + Math.sin(x * 0.35 + k) * 4 + (r(x) - 0.5) * 3]); brush.spline(pts, 0.5); }
    brush.set('inkpen', ink, 1.0);
    for (let k = 0; k < 2; k++) { const y = h * (0.84 + k * 0.08); const pts = []; for (let x = w * 0.07; x < w * (0.9 - k * 0.3); x += 9) pts.push([x, y + Math.sin(x * 0.4 + k * 2) * 3]); brush.spline(pts, 0.5); }
  } else {
    // two traces (amber = Verilog, teal = Python), cycle 5 circled in red; scribbled diagnostic below
    const x0 = w * 0.08, x1 = w * 0.92, cwp = (x1 - x0) / 8;
    const tr = (bits, yb, col) => { const pts = []; bits.forEach((b, k) => { const y = yb - b * h * 0.12; pts.push([x0 + k * cwp, y], [x0 + (k + 1) * cwp, y]); }); brush.set('bigink', col, 1.5); for (let k = 0; k < pts.length - 1; k++) brush.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]); };
    tr([0, 1, 1, 0, 1, 1, 0, 1], h * 0.3, PAL.amber);
    tr([0, 1, 1, 0, 0, 1, 0, 1], h * 0.54, PAL.teal);
    brush.set('bigink', PAL.red, 1.4); brush.circle(x0 + 4.5 * cwp, h * 0.36, cwp * 0.75, 0.25);
    brush.set('inkpen', ink, 1.2);
    for (let k = 0; k < 3; k++) { const y = h * (0.72 + k * 0.1); const pts = []; for (let x = w * 0.08; x < w * (0.88 - k * 0.2); x += 9) pts.push([x, y + Math.sin(x * 0.33 + k) * 4]); brush.spline(pts, 0.5); }
  }
}
export function paintScroll(brush, w, h, lines) {  // Py's reference model being written (lines = 0..6)
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#fffaf0', 255, 0.004, 0.25);
  brush.set('inkpen', PAL.tealD, 1.6);
  for (let k = 0; k < lines; k++) { const y = h * (0.16 + k * 0.13), ind = [0, 1, 2, 2, 1, 2][k] * w * 0.07; const pts = []; for (let x = w * 0.08 + ind; x < w * (0.5 + hsh(k, 2) * 0.4); x += 10) pts.push([x, y + Math.sin(x * 0.3 + k) * 4]); brush.spline(pts, 0.5); }
}
export function paintCan(brush, w, h) {   // the rolled-up reference model: teal can with a cream band + coil emblem
  fillP(brush, rect(-12, -12, w + 12, h + 12), PAL.teal, 255, 0.004, 0.2);
  fillP(brush, rect(-12, h * 0.3, w + 12, h * 0.7), '#fff3d8', 255, 0.004, 0.15);
  for (let q = 0; q < 2; q++) {
    const cx = w * (0.25 + q * 0.5), cy = h * 0.5, pts = [];
    for (let k = 0; k <= 30; k++) { const a = k / 30 * TAU * 1.6, r = 6 + 30 * k / 30; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8]); }
    brush.set('bigink', PAL.tealD, 1.4); brush.spline(pts, 0.5);
  }
}
export function paintDUT(brush, w, h) {   // the built chip's top: amber, pin-1 dot, an engraved gate mark
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#fff3e0', 255, 0.004, 0.2);
  fillP(brush, ell(w * 0.16, h * 0.18, 12, 12), '#7a3e04');
  brush.set('bigink', '#7a3e04', 1.3);
  const cx = w * 0.52, cy = h * 0.55, s = w * 0.2;
  brush.line(cx - s, cy - s * 0.7, cx - s * 0.1, cy - s * 0.7); brush.line(cx - s, cy + s * 0.7, cx - s * 0.1, cy + s * 0.7); brush.line(cx - s, cy - s * 0.7, cx - s, cy + s * 0.7);
  brush.spline([[cx - s * 0.1, cy - s * 0.7], [cx + s * 0.55, cy - s * 0.45], [cx + s * 0.7, cy], [cx + s * 0.55, cy + s * 0.45], [cx - s * 0.1, cy + s * 0.7]], 0.6);
}
export function paintGateBlock(brush, w, h, kind) {   // the three gate-blocks Chip hammers together
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#fff3e0', 255, 0.004, 0.2);
  const cx = w * 0.5, cy = h * 0.5, s = w * 0.26; brush.set('bigink', PAL.ink, 1.6);
  if (kind === 'and') { brush.line(cx - s, cy - s, cx, cy - s); brush.line(cx - s, cy + s, cx, cy + s); brush.line(cx - s, cy - s, cx - s, cy + s); brush.spline([[cx, cy - s], [cx + s * 0.8, cy - s * 0.6], [cx + s, cy], [cx + s * 0.8, cy + s * 0.6], [cx, cy + s]], 0.6); }
  if (kind === 'or') { brush.spline([[cx - s, cy - s], [cx - s * 0.6, cy], [cx - s, cy + s]], 0.6); brush.spline([[cx - s, cy - s], [cx + s * 0.3, cy - s * 0.8], [cx + s * 1.1, cy]], 0.6); brush.spline([[cx - s, cy + s], [cx + s * 0.3, cy + s * 0.8], [cx + s * 1.1, cy]], 0.6); }
  if (kind === 'ff') { brush.polygon(rect(cx - s, cy - s, cx + s, cy + s)); brush.line(cx - s, cy + s * 0.3, cx - s * 0.55, cy + s * 0.55); brush.line(cx - s * 0.55, cy + s * 0.55, cx - s, cy + s * 0.8); }
}
export function paintTally(brush, w, h, filled) {   // round tally: 5 chalk circles on a small slate
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#2e3b3a', 255, 0.004, 0.3);
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#344544', 160, 0.02, 0.5);
  for (let k = 0; k < 5; k++) {
    const x = w * (0.13 + k * 0.185), y = h * 0.52;
    brush.set('chalk', '#f4efe2', 1.0); brush.circle(x, y, h * 0.27, 0.2);
    if (k < filled) { fillP(brush, ell(x, y, h * 0.2, h * 0.2), '#f4efe2', 230, 0.06, 0.5); fillP(brush, ell(x, y, h * 0.2, h * 0.2), '#f2a33a', 160, 0.06, 0.5); }
  }
}
export function paintGauge(brush, w, h) {   // match-rate dial: 0 (left) .. 1 (right), amber end zone, 8 ticks
  fillP(brush, ell(w / 2, h / 2, w * 0.49, h * 0.49, 0, 40), '#fff6e2', 255, 0.004, 0.15);
  const cx = w / 2, cy = h * 0.62, R = w * 0.38;
  const ang = (f) => Math.PI + f * Math.PI;   // 0 -> left, 1 -> right (upper half)
  const band = []; for (let k = 0; k <= 16; k++) { const a = ang(0.8 + 0.2 * k / 16); band.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  for (let k = 16; k >= 0; k--) { const a = ang(0.8 + 0.2 * k / 16); band.push([cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78]); }
  fillP(brush, band, PAL.amber, 255, 0.01, 0.15);
  brush.set('bigink', PAL.ink, 1.1);
  for (let k = 0; k <= 8; k++) { const a = ang(k / 8), r0 = R * (k % 4 ? 0.84 : 0.72); brush.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
  const arcPts = []; for (let k = 0; k <= 24; k++) { const a = ang(k / 24); arcPts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  brush.spline(arcPts, 0.5);
  brushWord(brush, '0', cx - R * 0.72, cy + h * 0.1, h * 0.12, PAL.ink, 1.4);
  brushWord(brush, '1', cx + R * 0.72, cy + h * 0.1, h * 0.12, PAL.ink, 1.4);
}
export function paintClock(brush, w, h) {   // clock tower face: 8 cycle marks
  fillP(brush, ell(w / 2, h / 2, w * 0.49, h * 0.49, 0, 40), '#fff6e2', 255, 0.004, 0.15);
  brush.set('bigink', PAL.ink, 1.3); brush.circle(w / 2, h / 2, w * 0.45, 0.05);
  for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + k / 8 * TAU; fillP(brush, ell(w / 2 + Math.cos(a) * w * 0.36, h / 2 + Math.sin(a) * h * 0.36, 16, 16), k === 0 ? PAL.red : PAL.amber); }
}
export function paintWindows(brush, w, h, lit) {   // building walls, repeating 1 unit: 2 x 2 windows
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#fff1d6', 255, 0.004, 0.25);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const x0 = w * (0.14 + i * 0.5), y0 = h * (0.14 + j * 0.5), x1 = x0 + w * 0.22, y1 = y0 + h * 0.26;
    fillP(brush, rect(x0, y0, x1, y1), lit ? '#ffd257' : '#3f3b62', 255, 0.01, 0.15);
    if (lit) fillP(brush, rect(x0, y0, x1, y1), '#ffe9a0', 160, 0.02, 0.3);
    else fillP(brush, rect(x0 + 4, y0 + 4, x0 + (x1 - x0) * 0.4, y1 - 4), '#5a5886', 150, 0.01, 0.2);
    brush.set('inkpen', PAL.ink, 1.1); brush.polygon(rect(x0, y0, x1, y1));
  }
}
export function paintDice(brush, w, h, n) {   // a die face with n pips
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#fff8ec', 255, 0.004, 0.15);
  const P = { 1: [[0.5, 0.5]], 2: [[0.27, 0.27], [0.73, 0.73]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.27, 0.22], [0.73, 0.22], [0.27, 0.5], [0.73, 0.5], [0.27, 0.78], [0.73, 0.78]] }[n];
  for (const [u, v] of P) { const E = ell(u * w, v * h, w * 0.1, h * 0.1); fillP(brush, E, n === 1 ? PAL.red : PAL.ink); fillP(brush, E, n === 1 ? PAL.red : PAL.ink); }
}
export function paintSkin(brush, w, h) {   // Py's skin, repeating along the body: teal, darker diamonds, speckles
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#ffffff', 255, 0.004, 0.2);
  for (let k = 0; k < 8; k++) {
    const x = (k + 0.5) * w / 8, y = h * 0.5, s = h * 0.3;
    fillP(brush, [[x - s, y], [x, y - s * 0.9], [x + s, y], [x, y + s * 0.9]], '#6f8fa8', 170, 0.03, 0.3);
  }
  fillP(brush, rect(-12, h * 0.9, w + 12, h + 12), '#ffffff', 255, 0.01, 0.2);
}
export function paintStriker(brush, w, h) {   // high-striker board: 0..100 with ticks every 10, cream + amber
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#fff3d8', 255, 0.004, 0.2);
  fillP(brush, rect(w * 0.3, -12, w * 0.7, h + 12), '#f7d9a8', 200, 0.01, 0.2);
  brush.set('bigink', PAL.ink, 1.2);
  for (let k = 0; k <= 10; k++) { const y = h * (1 - k / 10); const long = k % 5 === 0; brush.line(w * (long ? 0.05 : 0.18), y, w * (long ? 0.95 : 0.82), y); }
}
export function paintDie(brush, w, h) {   // the die top: cream silicon, amber copper traces, vias, the check street
  const X = (x) => (x - W.die.x0) / (W.die.x1 - W.die.x0) * w, Z = (z) => (z - W.die.z0) / (W.die.z1 - W.die.z0) * h;
  const u = w / (W.die.x1 - W.die.x0);
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#fff7e4', 255, 0.004, 0.25);
  // faint silicon cell grid
  brush.set('inkpen', '#e7d3a8', 0.8);
  for (let x = W.die.x0 + 0.5; x < W.die.x1; x += 1.0) brush.line(X(x), 0, X(x), h);
  for (let z = W.die.z0 + 0.5; z < W.die.z1; z += 1.0) brush.line(0, Z(z), w, Z(z));
  // plaza wash under the workshop and the fairground
  fillP(brush, rect(X(-7.4), Z(-2.4), X(-2.1), Z(0.6)), '#f3c98a', 150, 0.08, 0.4);
  fillP(brush, rect(X(6.0), Z(-2.6), X(8.3), Z(0.4)), '#f3c98a', 150, 0.08, 0.4);
  // copper traces between the gate buildings (Manhattan routes), then vias
  const R = (a) => hsh(a, 5.5);
  const tr = (pts, wt = 2.6) => { brush.set('bigink', '#c56a0a', wt); for (let k = 0; k < pts.length - 1; k++) brush.line(X(pts[k][0]), Z(pts[k][1]), X(pts[k + 1][0]), Z(pts[k + 1][1])); };
  const outs = CITY.map((b) => [b[1] + b[3] * 0.62, b[2]]), ins = CITY.map((b) => [b[1] - b[3] * 0.6, b[2]]);
  CITY.forEach((b, i) => {
    const o = outs[i];
    let best = -1, bd = 1e9;
    CITY.forEach((c, j) => { if (j === i) return; const dx = ins[j][0] - o[0], dz = Math.abs(ins[j][1] - o[1]); if (dx > 0.4 && dx + dz * 0.8 < bd) { bd = dx + dz * 0.8; best = j; } });
    if (best < 0 || bd > 5.5) { tr([o, [o[0] + 0.7, o[1]], [o[0] + 0.7, o[1] + 0.9 * (R(i) > 0.5 ? 1 : -1)]]); return; }
    const t = ins[best], mx = (o[0] + t[0]) / 2 + (R(i + 1) - 0.5) * 0.4;
    tr([o, [mx, o[1]], [mx, t[1] + (R(i + 2) - 0.5) * 0.2], [t[0], t[1] + (R(i + 2) - 0.5) * 0.2]]);
  });
  // city power rails along the die edges
  tr([[W.die.x0 + 0.35, W.die.z0 + 0.35], [W.die.x1 - 0.35, W.die.z0 + 0.35], [W.die.x1 - 0.35, W.die.z1 - 0.35], [W.die.x0 + 0.35, W.die.z1 - 0.35], [W.die.x0 + 0.35, W.die.z0 + 0.35]], 3.2);
  for (let k = 0; k < 40; k++) { const x = W.die.x0 + 0.6 + R(k * 3) * 16, z = W.die.z0 + 0.6 + R(k * 3 + 1) * 9; if (x > -7.6 && x < 8.4 && z > -2.2 && z < 0.6) continue; brush.set('inkpen', '#9a5206', 1.1); brush.circle(X(x), Z(z), 0.07 * u, 0.1); fillP(brush, ell(X(x), Z(z), 0.045 * u, 0.045 * u), '#e8b04a'); }
  // the check street: dark asphalt band, two lane traces (amber = Verilog lane, teal = Python lane), median
  fillP(brush, rect(X(W.x0 - 0.2), Z(-2.15), X(stationX(7) + 0.9), Z(0.05)), '#6b5a7a', 190, 0.02, 0.35);
  fillP(brush, rect(X(W.x0 - 0.2), Z(-2.15), X(stationX(7) + 0.9), Z(0.05)), '#5b4d6c', 120, 0.03, 0.4);
  brush.set('bigink', '#f5e7c8', 1.4);
  for (const z of [-2.1, 0.0]) brush.line(X(W.x0 - 0.2), Z(z), X(stationX(7) + 0.9), Z(z));
  for (let x = W.x0; x < stationX(7) + 0.8; x += 0.4) { brush.set('bigink', '#f5e7c8', 1.1); brush.line(X(x), Z(-1.05), X(x + 0.18), Z(-1.05)); }
  brush.set('fatink', '#e0891c', 1.3); brush.line(X(W.x0), Z(W.laneA), X(stationX(7) + 0.6), Z(W.laneA));
  brush.set('fatink', '#3aa6c8', 1.3); brush.line(X(W.x0), Z(W.laneB), X(stationX(7) + 0.6), Z(W.laneB));
  // station pads in the median
  for (let k = 0; k < 8; k++) { fillP(brush, ell(X(stationX(k)), Z(W.lampZ), 0.2 * u, 0.2 * u), '#3a3050', 230, 0.01, 0.2); }
  // coffee-ring of a giant mug (the lab is outside the chip) - a wink, top-left corner
  brush.set('inkpen', '#9a6b43', 1.0); brush.circle(X(-7.7), Z(3.0), 0.5 * u, 0.4);
}
export function paintPCB(brush, w, h) {   // the board around the die: dark teal-green, pale traces and pads (tiles)
  fillP(brush, rect(-12, -12, w + 12, h + 12), '#ffffff', 255, 0.004, 0.25);
  const R = (a) => hsh(a, 9.1);
  for (let k = 0; k < 14; k++) {
    brush.set('bigink', '#9cc7bf', 1.6);
    const y = (k + 0.5) * h / 14, x0 = R(k) * w * 0.3, x1 = x0 + w * (0.3 + R(k + 50) * 0.5);
    const yj = y + (R(k + 9) - 0.5) * h * 0.1;
    brush.line(x0, y, x1, y); brush.line(x1, y, x1 + 40, yj); brush.line(x1 + 40, yj, Math.min(w, x1 + 40 + w * 0.2), yj);
    fillP(brush, ell(x0, y, 10, 10), '#b9dcd4'); fillP(brush, ell(Math.min(w, x1 + 40 + w * 0.2), yj, 10, 10), '#b9dcd4');
  }
}
export function paintSky(brush, w, h) {   // dusk cyclorama: warm near the horizon, amber clouds, a low sun
  const r = (a) => hsh(a, 2.2);
  fillP(brush, rect(-20, -20, w + 20, h + 20), '#ffffff', 255, 0.004, 0.2);
  // high band: a soft violet-grey (the dusk overhead), horizon band: amber
  fillP(brush, rect(-20, -20, w + 20, h * 0.42), '#b8b0d6', 170, 0.05, 0.4);
  fillP(brush, rect(-20, h * 0.28, w + 20, h * 0.62), '#f7c98a', 170, 0.08, 0.45);
  fillP(brush, rect(-20, h * 0.5, w + 20, h + 20), '#f4a64a', 150, 0.08, 0.45);
  // low sun
  fillP(brush, ell(w * 0.62, h * 0.6, h * 0.2, h * 0.2, 0, 40), '#ffe6a8', 240, 0.02, 0.2);
  fillP(brush, ell(w * 0.62, h * 0.6, h * 0.2, h * 0.2, 0, 40), '#ffd27a', 150, 0.03, 0.3);
  // long flat clouds (painted, amber-lit bellies)
  for (let k = 0; k < 9; k++) {
    const cx = r(k) * w, cy = h * (0.18 + r(k + 30) * 0.32), rx = h * (0.35 + r(k + 60) * 0.35), ry = h * (0.035 + r(k + 90) * 0.03);
    fillP(brush, ell(cx, cy, rx, ry, 0, 24), '#8e86b8', 150, 0.12, 0.5);
    fillP(brush, ell(cx + rx * 0.1, cy + ry * 0.6, rx * 0.8, ry * 0.5, 0, 20), '#f2a33a', 150, 0.1, 0.5);
  }
}
