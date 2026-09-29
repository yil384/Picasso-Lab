// tg_world.js - the set: a sports arena built on a giant graphics card (emerald PCB, gold traces, the GPU
// package and die as the stadium field, HBM stacks as grandstands, capacitor bollards, a heat-sink wall with
// big fans behind). All textures are painted with Canvas2D (fast on the CPU renderer); the painterly look comes
// from runtime/npr.
import { rng as mkRng } from '/pv/runtime/pv.js';
import { pen, fillPoly, blobPts, ellipsePts, INK, TAU } from './tg_paint.js';

export function canvasTex(THREE, w, h, paint, { wrap = false, repeat = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (repeat) t.repeat.set(...repeat);
  t.needsUpdate = true; t.userData.canvas = c;
  return t;
}

/** Watercolour-ish mottling: soft blobs of lighter / darker tone (multiplied later by the albedo). */
export function mottle(g, w, h, r, n = 60, a = 0.08) {
  for (let k = 0; k < n; k++) {
    const x = r() * w, y = r() * h, rr = r.range(0.04, 0.16) * w;
    const grd = g.createRadialGradient(x, y, 0, x, y, rr);
    const dark = r() < 0.5;
    grd.addColorStop(0, dark ? `rgba(40,30,60,${a})` : `rgba(255,255,255,${a * 1.2})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
}

/** PCB: white base (albedo gives the emerald), gold traces with dark edges, vias, pad rows, silkscreen outlines. */
export function paintPCB(g, w, h, seed = 1) {
  const r = mkRng('pcb', seed);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  mottle(g, w, h, r, 70, 0.07);
  const gold = '#f7d27a', edge = 'rgba(20,40,30,0.55)';
  // traces: 45-degree routed buses
  for (let b = 0; b < 16; b++) {
    const n = r.int(3, 6), x0 = r() * w, y0 = r() * h, dir = r.int(0, 3), L1 = r.range(0.1, 0.35) * w, L2 = r.range(0.05, 0.2) * w;
    const d = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir], d2 = [[1, 1], [1, -1], [-1, 1], [-1, -1]][r.int(0, 3)];
    for (let k = 0; k < n; k++) {
      const o = k * 14;
      const P = [[x0 + d[1] * o, y0 + d[0] * o]];
      P.push([P[0][0] + d[0] * L1, P[0][1] + d[1] * L1]);
      P.push([P[1][0] + d2[0] * L2 * 0.7, P[1][1] + d2[1] * L2 * 0.7]);
      P.push([P[2][0] + d[0] * L1 * 0.6, P[2][1] + d[1] * L1 * 0.6]);
      for (const [col, wd] of [[edge, 9], [gold, 5.5]]) {
        g.strokeStyle = col; g.lineWidth = wd; g.lineJoin = 'round'; g.lineCap = 'round';
        g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      }
      for (const p of [P[0], P[3]]) { g.fillStyle = edge; g.beginPath(); g.arc(p[0], p[1], 8, 0, TAU); g.fill(); g.fillStyle = gold; g.beginPath(); g.arc(p[0], p[1], 6, 0, TAU); g.fill(); g.fillStyle = 'rgba(20,40,30,0.8)'; g.beginPath(); g.arc(p[0], p[1], 2.4, 0, TAU); g.fill(); }
    }
  }
  // silkscreen component outlines (cream, hand drawn)
  for (let k = 0; k < 14; k++) {
    const x = r() * w, y = r() * h, sw = r.range(30, 90), sh = r.range(20, 50);
    g.strokeStyle = 'rgba(255,250,235,0.8)'; g.lineWidth = 2.2;
    g.strokeRect(x, y, sw, sh);
    g.beginPath(); g.arc(x + 6, y + 6, 2.5, 0, TAU); g.stroke();
  }
}

/** The GPU die: a grid of streaming-multiprocessor tiles, engraved. */
export function paintDie(g, w, h, seed = 2, { cols = 8, rows = 8 } = {}) {
  const r = mkRng('die', seed);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  mottle(g, w, h, r, 30, 0.06);
  const m = w * 0.04, cw = (w - 2 * m) / cols, ch = (h - 2 * m) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = m + i * cw + 5, y = m + j * ch + 5, ww = cw - 10, hh = ch - 10;
    g.fillStyle = (i + j) % 2 ? 'rgba(120,110,170,0.18)' : 'rgba(255,255,255,0.25)';
    g.fillRect(x, y, ww, hh);
    g.strokeStyle = 'rgba(40,30,70,0.55)'; g.lineWidth = 3; g.strokeRect(x, y, ww, hh);
    // inner cores: little squares
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { g.fillStyle = 'rgba(40,30,70,0.18)'; g.fillRect(x + 8 + a * (ww - 16) / 3, y + 8 + b * (hh - 16) / 3, (ww - 16) / 3 - 6, (hh - 16) / 3 - 6); }
  }
}
