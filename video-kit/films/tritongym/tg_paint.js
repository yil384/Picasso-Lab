// tg_paint.js - hand-made marks for "TritonGym": tapered ink strokes, face textures, comic lettering, emotes.
// Canvas2D only (fast on the CPU renderer); every jitter comes from a seeded rng passed in, so the marks boil
// between drawings and never between two renders of the same frame.
import { rng as mkRng } from '/pv/runtime/pv.js';

export const TAU = Math.PI * 2;
export const INK = '#1a1530';
export const CREAM = '#fff6e0';

// ------------------------------------------------------------------------------------------------
// strokes
// ------------------------------------------------------------------------------------------------
/** Catmull-Rom resample of a polyline (n points per segment). */
export function smooth(P, n = 6) {
  if (P.length < 3) return P.slice();
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(P[P.length - 1]);
  return out;
}

/** Ribbon polygon along P. width(u) with u in 0..1 along the stroke; `rough` adds edge noise from rng r. */
export function ribbon(P, width, r = null, rough = 0) {
  const L = [], R = [], n = P.length;
  let len = 0; const acc = [0];
  for (let i = 1; i < n; i++) { len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); acc.push(len); }
  // smooth edge wobble (low-frequency, like a brush pen's edge), phases from the boil rng
  const p1 = r ? r() * TAU : 0, p2 = r ? r() * TAU : 0, p3 = r ? r() * TAU : 0, p4 = r ? r() * TAU : 0;
  const f1 = 0.09 + (r ? r() * 0.05 : 0), f2 = 0.23 + (r ? r() * 0.1 : 0);
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const u = len > 0 ? acc[i] / len : 0;
    const w = (typeof width === 'function' ? width(u) : width) * 0.5;
    const jl = r ? rough * (Math.sin(acc[i] * f1 + p1) + 0.5 * Math.sin(acc[i] * f2 + p2)) : 0;
    const jr = r ? rough * (Math.sin(acc[i] * f1 + p3) + 0.5 * Math.sin(acc[i] * f2 + p4)) : 0;
    L.push([P[i][0] - dy * (w + jl), P[i][1] + dx * (w + jl)]);
    R.push([P[i][0] + dy * (w + jr), P[i][1] - dx * (w + jr)]);
  }
  return L.concat(R.reverse());
}

export function fillPoly(g, pts, col) {
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
  g.fillStyle = col; g.fill();
}

/** Brush-pen stroke: pressure taper at both ends, slight swell, rough edges. */
export function pen(g, P, w, col = INK, { r = null, taper = [0.25, 0.3], rough = 0.06, smoothN = 5, swell = 0.15 } = {}) {
  const S = P.length > 2 ? smooth(P, smoothN) : P;
  const wf = (u) => {
    const a = taper[0] > 0 ? Math.min(1, u / taper[0]) : 1, b = taper[1] > 0 ? Math.min(1, (1 - u) / taper[1]) : 1;
    return w * (0.25 + 0.75 * Math.sqrt(Math.max(0, Math.min(a, b)))) * (1 + swell * Math.sin(u * Math.PI));
  };
  fillPoly(g, ribbon(S, wf, r, w * rough), col);
}

export function ellipsePts(x, y, rx, ry, rot = 0, n = 28) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, px = Math.cos(a) * rx, py = Math.sin(a) * ry; out.push([x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)]); }
  return out;
}
export function blobPts(x, y, rx, ry, r, jit = 0.06, n = 22) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, k = 1 + (r ? r.gauss(0, jit) : 0); out.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
  return out;
}
export function starPts(x, y, R, inner = 0.42, n = 4, rot = -Math.PI / 2) {
  const out = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * TAU, rr = i % 2 ? R * inner : R; out.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  return out;
}

// ------------------------------------------------------------------------------------------------
// faces: painted into canvases that become textures on 3D heads (so they turn, shade and occlude)
// ------------------------------------------------------------------------------------------------
/**
 * Paint one face. c: canvas; the face is centred at (cx, cy) with scale s (1 = ~100 px eye spacing).
 * e: { eyes: 'dot'|'wide'|'sleep'|'happy'|'squint'|'star'|'spiral'|'x'|'shut'|'side'|'up'|'determined'|'worried',
 *      mouth: null|'smile'|'o'|'grin'|'flat'|'wobble'|'open'|'teeth'|'tiny', blush, sweat, brows: -1..1, look: [dx,dy] }
 */
export function paintFace(g, cx, cy, s, e, seed = 1, o = {}) {
  const r = mkRng('face', seed);
  const ink = o.ink || INK, sp = (o.spacing ?? 1) * 52 * s;
  const L = [cx - sp, cy], R = [cx + sp, cy];
  const lk = e.look || [0, 0];
  const eye = (p, side) => {
    const [x, y] = [p[0] + lk[0] * 10 * s, p[1] + lk[1] * 10 * s];
    const j = () => r.gauss(0, 1.2 * s);
    switch (e.eyes) {
      case 'up': fillPoly(g, ellipsePts(x + j(), y - 12 * s + j(), 12 * s, 17 * s), ink); fillPoly(g, ellipsePts(x - 4 * s, y - 18 * s, 3.5 * s, 4.5 * s), CREAM); break;
      case 'wide': fillPoly(g, ellipsePts(x + j(), y + j(), 17 * s, 25 * s), ink); fillPoly(g, ellipsePts(x - 5 * s, y - 9 * s, 5 * s, 6 * s), CREAM); break;
      case 'sleep': pen(g, [[x - 18 * s, y - 2 * s], [x, y + 8 * s], [x + 18 * s, y - 2 * s]], 8 * s, ink, { r }); break;
      case 'happy': pen(g, [[x - 18 * s, y + 6 * s], [x, y - 10 * s], [x + 18 * s, y + 6 * s]], 9 * s, ink, { r }); break;
      case 'squint': pen(g, [[x - 19 * s, y + side * -4 * s], [x + 19 * s, y + side * 4 * s]], 9 * s, ink, { r, taper: [0.15, 0.15] }); break;
      case 'shut': pen(g, [[x - 18 * s, y - 8 * s * side], [x + 14 * s * -side, y], [x - 18 * s, y + 8 * s * side]].map((q) => [q[0], q[1]]), 8 * s, ink, { r }); break;
      case 'star': fillPoly(g, starPts(x, y, 26 * s, 0.38, 4, -Math.PI / 2 + side * 0.15), o.starCol || '#f2b134'); { const pts = starPts(x, y, 26 * s, 0.38, 4, -Math.PI / 2 + side * 0.15); pen(g, [...pts, pts[0]], 4 * s, ink, { taper: [0, 0], smoothN: 1 }); } break;
      case 'spiral': { const P = []; for (let k = 0; k <= 26; k++) { const a = k * 0.55 * side, rr = 3 * s + k * 0.8 * s; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } pen(g, P, 5 * s, ink, { r, smoothN: 2 }); } break;
      case 'x': pen(g, [[x - 14 * s, y - 14 * s], [x + 14 * s, y + 14 * s]], 8 * s, ink, { r }); pen(g, [[x + 14 * s, y - 14 * s], [x - 14 * s, y + 14 * s]], 8 * s, ink, { r }); break;
      case 'determined': fillPoly(g, ellipsePts(x + j(), y + 3 * s + j(), 12 * s, 16 * s), ink); pen(g, [[x - 20 * s, y - 24 * s - side * 7 * s], [x + 20 * s, y - 24 * s + side * 7 * s]], 9 * s, ink, { r, taper: [0.1, 0.3] }); break;
      case 'worried': fillPoly(g, ellipsePts(x + j(), y + j(), 12 * s, 18 * s), ink); pen(g, [[x - 18 * s, y - 20 * s + side * 7 * s], [x + 18 * s, y - 24 * s - side * 7 * s]], 7 * s, ink, { r }); break;
      case 'smug': pen(g, [[x - 18 * s, y - 3 * s], [x + 18 * s, y - 3 * s]], 8 * s, ink, { r, taper: [0.1, 0.1] }); fillPoly(g, [[x - 16 * s, y - 2 * s], [x + 16 * s, y - 2 * s], [x + 10 * s, y + 10 * s], [x - 10 * s, y + 10 * s]], ink); break;
      default: fillPoly(g, ellipsePts(x + j(), y + j(), 12 * s, 17 * s), ink); fillPoly(g, ellipsePts(x - 4 * s, y - 6 * s, 3.5 * s, 4.5 * s), CREAM);
    }
  };
  eye(L, 1); eye(R, -1);
  const my = cy + (o.mouthY ?? 44) * s;
  switch (e.mouth) {
    case 'smile': pen(g, [[cx - 20 * s, my - 4 * s], [cx, my + 9 * s], [cx + 20 * s, my - 4 * s]], 8 * s, ink, { r }); break;
    case 'tiny': pen(g, [[cx - 8 * s, my], [cx, my + 5 * s], [cx + 8 * s, my]], 6 * s, ink, { r }); break;
    case 'flat': pen(g, [[cx - 16 * s, my + 2 * s], [cx + 16 * s, my]], 7 * s, ink, { r, taper: [0.1, 0.1] }); break;
    case 'wobble': pen(g, [[cx - 22 * s, my + 2 * s], [cx - 11 * s, my - 4 * s], [cx, my + 3 * s], [cx + 11 * s, my - 4 * s], [cx + 22 * s, my + 2 * s]], 6 * s, ink, { r }); break;
    case 'o': fillPoly(g, ellipsePts(cx, my + 4 * s, 11 * s, 14 * s), ink); fillPoly(g, ellipsePts(cx, my + 9 * s, 6 * s, 5 * s), '#e8546a'); break;
    case 'open': { const P = [[cx - 26 * s, my - 6 * s], [cx + 26 * s, my - 6 * s], [cx + 16 * s, my + 16 * s], [cx, my + 22 * s], [cx - 16 * s, my + 16 * s]]; fillPoly(g, P, ink); fillPoly(g, ellipsePts(cx, my + 13 * s, 12 * s, 6 * s), '#e8546a'); } break;
    case 'grin': { const P = [[cx - 32 * s, my - 8 * s], [cx + 32 * s, my - 8 * s], [cx + 20 * s, my + 14 * s], [cx - 20 * s, my + 14 * s]]; fillPoly(g, P, ink); fillPoly(g, [[cx - 25 * s, my - 5 * s], [cx + 25 * s, my - 5 * s], [cx + 22 * s, my + 1 * s], [cx - 22 * s, my + 1 * s]], CREAM); } break;
    case 'teeth': { const P = [[cx - 28 * s, my - 9 * s], [cx + 28 * s, my - 9 * s], [cx + 28 * s, my + 11 * s], [cx - 28 * s, my + 11 * s]]; fillPoly(g, P, CREAM); pen(g, [...P, P[0]], 5 * s, ink, { taper: [0, 0], smoothN: 1 }); pen(g, [[cx - 28 * s, my + 1 * s], [cx + 28 * s, my + 1 * s]], 4 * s, ink, { taper: [0, 0] }); for (let q = -1; q <= 1; q++) pen(g, [[cx + q * 12 * s, my - 9 * s], [cx + q * 12 * s, my + 11 * s]], 4 * s, ink, { taper: [0, 0] }); } break;
    default: break;
  }
  if (e.blush) for (const sd of [-1, 1]) fillPoly(g, blobPts(cx + sd * sp * 1.45, cy + 22 * s, 19 * s, 9 * s, r, 0.08), 'rgba(255,110,120,0.55)');
  if (e.sweat) { const x = cx + sp * 1.7, y = cy - 30 * s; fillPoly(g, [[x, y - 18 * s], [x + 9 * s, y + 2 * s], [x, y + 9 * s], [x - 9 * s, y + 2 * s]], '#7fd3ff'); pen(g, [[x, y - 18 * s], [x + 9 * s, y + 2 * s], [x, y + 9 * s], [x - 9 * s, y + 2 * s], [x, y - 18 * s]], 3.5 * s, ink, { taper: [0, 0], smoothN: 3 }); }
}

/** Build a set of face textures for a head: returns { key: [variant0, variant1] } CanvasTextures. */
export function faceSet(THREE, exprs, { w = 1024, h = 512, base = '#fff1cf', cx = null, cy = null, s = 1.5, seed = 1, spacing = 1, mouthY = 44, ink = INK, decorate = null } = {}) {
  const out = {};
  for (const [k, e] of Object.entries(exprs)) {
    out[k] = [0, 1].map((v) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      if (decorate) decorate(g, w, h, v);
      paintFace(g, cx ?? w * 0.25, cy ?? h * 0.5, s, e, seed * 31 + v * 7 + k.length, { spacing, mouthY, ink });
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true;
      t.userData.canvas = c;
      return t;
    });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// bake cache for slow p5.brush textures: GET work/bake/<key>.png, else bake + POST it (studio server)
// ------------------------------------------------------------------------------------------------
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); }
export async function cachedBake(THREE, bake, opts, draw, version = '1') {
  const key = `${opts.key}-${opts.width}x${opts.height}-${hashStr(draw.toString() + JSON.stringify(opts) + version)}`;
  try {
    const r = await fetch(`/scene/work/bake/${key}.png`, { cache: 'no-store' });
    if (r.ok) {
      const bmp = await createImageBitmap(await r.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      const c = document.createElement('canvas'); c.width = opts.width; c.height = opts.height;
      c.getContext('2d').drawImage(bmp, 0, 0);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
      if (opts.wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true; t.userData.canvas = c; t.userData.cached = true;
      return t;
    }
  } catch (_) { /* no cache */ }
  const t = await bake(THREE, opts, draw);
  try {
    const blob = await new Promise((res) => t.userData.canvas.toBlob(res, 'image/png'));
    await fetch(`/__bake/${key}`, { method: 'POST', body: blob });
  } catch (_) { /* render.py has no bake endpoint: fine */ }
  return t;
}
