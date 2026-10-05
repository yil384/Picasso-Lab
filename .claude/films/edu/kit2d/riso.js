// kit2d/riso.js - a risograph press. Draw ink COVERAGE on per-ink plates (only alpha counts), then print: paper with
// fibres and a faint cloud, each ink multiplied in order (yellow, pink, blue, navy) either flat or through its own
// rotated halftone screen, a few pixels out of register, uneven inking (mottle, starved blotches, voids, stray specks)
// and a slight ink spread. One press per print size: a full 1080x1920 frame, or a single poster or card that a theatre
// scene then hangs on its stage (print once, draw the returned canvas like any sprite).
//
// Ported from illodev/drawn-by-code, styles/risograph/riso.js (MIT, (c) 2026 illodev; see THIRD_PARTY.md), with its
// measured constants (inks, paper, 9.5 px screen at a 1080 short side, register offsets, edge and spread). Changes: ES
// module, seeded rng instead of the engine's Motion.rng, any print size (W, H) with a pitch you can set per press,
// print() returns the canvas, optional ink subset (empty plates cost time and print stray specks).
//
//   const press = makePress({ W: 680, H: 850, k: 1.7 })   k: plate pixels per drawing unit
//   press.begin()
//   const navy = press.plate('navy'), pinkS = press.plate('pink', 'screen')
//   navy.fillStyle = tone(1); ... ; pinkS.fillStyle = ramp(pinkS, 0, 0, 0, 400, .2, .7); ...
//   const canvas = press.print({ key: 'poster-en' })      memoised per key
//
// Style rules (drawn-by-code's style-risograph skill): four inks only, every other colour an overprint; think in
// separations; inks only darken, so light-over-dark needs a knockout; whites are paper (press.knockout); detail finer
// than ~3 px must be solid ink, not screen; two screens over each other print mud, put a solid over a screen.

import { rngFrom } from './material.js';

export const INKS = {
  pink: { rgb: [240, 76, 183], angle: .26, pitch: 1 },
  yellow: { rgb: [255, 250, 40], angle: 0, pitch: 1 },
  blue: { rgb: [58, 146, 197], angle: 1.31, pitch: 1 },
  navy: { rgb: [32, 56, 146], angle: .79, pitch: 1 },
};
export const ORDER = ['yellow', 'pink', 'blue', 'navy'];
export const PAPER = [241, 235, 226];
export const tone = (v) => `rgba(0,0,0,${Math.max(0, Math.min(1, v))})`;
export function ramp(g, x0, y0, x1, y1, t0, t1) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, tone(t0)); gr.addColorStop(1, tone(t1)); return gr; }
export function radial(g, x, y, r0, r1, t0, t1) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); gr.addColorStop(0, tone(t0)); gr.addColorStop(1, tone(t1)); return gr; }

/** A hand-inked line on a plate: a polyline whose width varies a little per segment. */
export function inkLine(g, pts, w, seed, o = {}) {
  const r = rngFrom('rl' + seed); g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = o.color ?? '#000';
  for (let i = 1; i < pts.length; i++) { g.lineWidth = w * (.8 + .4 * r()); g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
  g.restore();
}
/** A brush line: one filled ribbon whose width swells and thins along the path, tapered ends (not a stroked line). */
export function brushLine(g, pts, w, seed, o = {}) {
  const r = rngFrom('bl' + seed), n = pts.length, L = [], Rt = [], ph = r() * 6.28, taper = o.taper ?? .25;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const u = i / (n - 1), end = Math.min(1, u / taper, (1 - u) / taper), hw = w / 2 * (.35 + .65 * Math.sqrt(Math.max(0, end))) * (.88 + .12 * Math.sin(u * 9 + ph) + .06 * (r() - .5));
    L.push([pts[i][0] - dy / d * hw, pts[i][1] + dx / d * hw]); Rt.push([pts[i][0] + dy / d * hw, pts[i][1] - dx / d * hw]);
  }
  g.save(); g.fillStyle = o.color ?? '#000'; g.beginPath(); [...L, ...Rt.reverse()].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.restore();
}

/**
 * makePress({ W, H, k=1, pitch=9.5, seed='riso', inks=ORDER, register, edge=1.1, spread=.8 })
 * W, H: print size in px; k: plate px per drawing unit; pitch: halftone cell at a 1080 short side (scaled to W, H).
 */
export function makePress(o) {
  const W = Math.round(o.W), H = Math.round(o.H), k = o.k ?? 1, seed = o.seed ?? 'riso', inks = o.inks ?? ORDER;
  const S1 = o.unit ?? Math.min(W, H) / 1080, pitch = (o.pitch ?? 9.5) * S1;
  const mkc = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const ctxs = {};
  for (const ink of inks) for (const kind of ['solid', 'screen']) { const g = mkc().getContext('2d', { willReadFrequently: true }); g.setTransform(k, 0, 0, k, 0, 0); ctxs[ink + kind] = g; }
  const out = mkc(), og = out.getContext('2d');
  // fixed textures: paper grain, starved blotches, paper cloud and fibres, per-ink mottle and specks
  const r = rngFrom(seed + 'tex' + W + 'x' + H);
  const N = W * H, grain = new Float32Array(N), starve = new Float32Array(N);
  for (let i = 0; i < N; i++) grain[i] = r();
  const bs = 24 * Math.max(.5, S1), bw = Math.ceil(W / bs) + 2, bh = Math.ceil(H / bs) + 2, blot = new Float32Array(bw * bh);
  for (let i = 0; i < blot.length; i++) blot[i] = r();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = x / bs, fy = y / bs, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
    const a = blot[iy * bw + ix], b = blot[iy * bw + ix + 1], c = blot[(iy + 1) * bw + ix], d = blot[(iy + 1) * bw + ix + 1], su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    starve[y * W + x] = a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
  }
  const fine = (sd, scale) => {
    const rr = rngFrom(sd), gw = Math.ceil(W / scale) + 2, gh = Math.ceil(H / scale) + 2, v = new Float32Array(gw * gh), f = new Float32Array(N);
    for (let i = 0; i < v.length; i++) v[i] = rr();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, w2 = fy - iy;
      const a = v[iy * gw + ix], b = v[iy * gw + ix + 1], c = v[(iy + 1) * gw + ix], d = v[(iy + 1) * gw + ix + 1]; f[y * W + x] = a + (b - a) * u + (c - a) * w2 + (a - b - c + d) * u * w2; }
    return f;
  };
  const sc = Math.max(.5, S1), cloud = fine(seed + 'cloud' + W, 48 * sc), fiber = new Float32Array(N);
  { const fc = mkc(), fg = fc.getContext('2d'), fr = rngFrom(seed + 'fibres' + W), n = Math.round(300 * N / (1080 * 1080)); fg.lineCap = 'round';
    for (let q = 0; q < n; q++) { let x = fr() * W, y = fr() * H, a = fr() * 6.28; const len = (8 + fr() * 32) * sc, bend = (fr() - .5) * .25;
      fg.strokeStyle = `rgba(0,0,0,${.25 + fr() * .35})`; fg.lineWidth = (.6 + fr() * .5) * sc; fg.beginPath(); fg.moveTo(x, y);
      for (let s2 = 0; s2 < len; s2 += 2 * sc) { a += bend; x += Math.cos(a) * 2 * sc; y += Math.sin(a) * 2 * sc; fg.lineTo(x, y); } fg.stroke(); }
    const fd = fg.getImageData(0, 0, W, H).data; for (let i = 0; i < N; i++) fiber[i] = fd[i * 4 + 3] / 255; }
  const mottle = {}, speck = {};
  for (const ink of inks) { mottle[ink] = fine(seed + 'mottle' + ink + W, 3.2 * sc); speck[ink] = fine(seed + 'speck' + ink + W, 1.6 * sc); }
  const EDGE = o.edge ?? 1.1, SPREAD = o.spread ?? .8;
  let memoKey = null;

  const press = {
    W, H, k, canvas: out,
    begin() { for (const g of Object.values(ctxs)) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.restore(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; } memoKey = null; },
    plate(ink, kind = 'solid') { const g = ctxs[ink + kind]; if (!g) throw new Error('riso: no plate ' + ink + ' ' + kind + ' (inks: ' + inks.join(',') + ')'); return g; },
    /** fn(g, ink, kind) on every plate: shared transforms, clips. */
    each(fn) { for (const ink of inks) for (const kind of ['solid', 'screen']) fn(ctxs[ink + kind], ink, kind); },
    save() { press.each((g) => g.save()); }, restore() { press.each((g) => g.restore()); },
    clip(fn) { press.each((g) => { g.beginPath(); fn(g); g.clip(); }); },
    /** Knock a shape out of every plate (paper white). Make rngs INSIDE fn: it runs once per plate. */
    knockout(fn) { for (const g of Object.values(ctxs)) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.strokeStyle = '#000'; fn(g); g.restore(); } },
    /** Print (memoised on key). po: key, register {ink:[dx,dy]} (px at a 1080 short side), inks {plate: inkName}, spread. */
    print(po = {}) {
      const key = po.key;
      if (key != null && key === memoKey) return out;
      const img = og.createImageData(W, H), D = img.data;
      for (let i = 0; i < N; i++) { const p = (.982 + .018 * grain[i] + .012 * (cloud[i] - .5)) * (1 - .2 * fiber[i]); D[i * 4] = PAPER[0] * p; D[i * 4 + 1] = PAPER[1] * p; D[i * 4 + 2] = PAPER[2] * p; D[i * 4 + 3] = 255; }
      const reg = po.register ?? { yellow: [2, -1], pink: [-1, 1], blue: [1, 2], navy: [0, 0] };
      const inkOf = (plate) => (po.inks ?? {})[plate] ?? plate;
      for (const ink of ORDER) {
        if (!inks.includes(ink)) continue;
        const Sd = ctxs[ink + 'solid'].getImageData(0, 0, W, H).data, Td = ctxs[ink + 'screen'].getImageData(0, 0, W, H).data;
        const I = INKS[inkOf(ink)], [ir, ig, ib] = I.rgb, ca = Math.cos(INKS[ink].angle), sa = Math.sin(INKS[ink].angle);
        const [ox, oy] = (reg[ink] ?? [0, 0]).map((v) => Math.round(v * Math.max(1, S1)));
        const ip = I.pitch * pitch, io = ORDER.indexOf(ink) * 7919, edge = EDGE / ip, il = ink.length * 17.3;
        for (let y = 0; y < H; y++) {
          const sy = y - oy; if (sy < 0 || sy >= H) continue;
          for (let x = 0; x < W; x++) {
            const sx = x - ox; if (sx < 0 || sx >= W) continue;
            const j = (sy * W + sx) * 4; let cov = Sd[j + 3] / 255; const tv = Td[j + 3] / 255;
            if (tv > .003) {
              const u = (x * ca + y * sa) / ip, v = (-x * sa + y * ca) / ip, cu = Math.floor(u), cv = Math.floor(v);
              const hh = Math.sin(cu * 127.1 + cv * 311.7 + il) * 43758.5453, hj = hh - Math.floor(hh);
              const du = u - cu - .5 + (hj - .5) * .14, dv = v - cv - .5 + ((hj * 7.13) % 1 - .5) * .14;
              const dd = Math.sqrt(du * du + dv * dv), rad = Math.sqrt(tv / Math.PI) * (.9 + .22 * hj);
              cov = Math.max(cov, Math.min(1, Math.max(0, (rad - dd) / edge + .5)));
            }
            const i = y * W + x, sp = speck[ink][i];
            if (sp > .985) cov = Math.max(cov, (sp - .985) * 40);
            if (cov <= .003) continue;
            const gv = grain[(i + io) % N];
            cov *= (.97 + .06 * mottle[ink][i]) * (.985 + .03 * starve[i]) - (gv > .93 ? .3 : 0) - (gv > .985 ? .5 : 0) - (sp < .04 ? .5 : 0);
            if (cov <= 0) continue;
            const qq = i * 4; D[qq] *= 1 - cov + (cov * ir) / 255; D[qq + 1] *= 1 - cov + (cov * ig) / 255; D[qq + 2] *= 1 - cov + (cov * ib) / 255;
          }
        }
      }
      og.putImageData(img, 0, 0);
      const spr = (po.spread ?? SPREAD) * Math.max(.6, S1);
      if (spr > 0) { const tmp = mkc(), tg = tmp.getContext('2d'); tg.filter = `blur(${spr}px)`; tg.drawImage(out, 0, 0); og.clearRect(0, 0, W, H); og.drawImage(tmp, 0, 0); }
      memoKey = key;
      return out;
    },
  };
  return press;
}
