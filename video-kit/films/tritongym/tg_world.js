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
export function mottle(g, w, h, r, n = 60, a = 0.08, darkShare = 0.5) {
  for (let k = 0; k < n; k++) {
    const x = r() * w, y = r() * h, rr = r.range(0.04, 0.16) * w;
    const grd = g.createRadialGradient(x, y, 0, x, y, rr);
    const dark = r() < darkShare;
    grd.addColorStop(0, dark ? `rgba(40,30,60,${a})` : `rgba(255,255,255,${a * 1.2})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
}

/** PCB: white base (albedo gives the emerald), gold traces with dark edges, vias, pad rows, silkscreen outlines. */
export function paintPCB(g, w, h, seed = 1) {
  const r = mkRng('pcb', seed);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  mottle(g, w, h, r, 50, 0.05, 0.3);
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


// ------------------------------------------------------------------------------------------------
// the ring arena
// ------------------------------------------------------------------------------------------------
export const ARENA = {
  R: 6.0, RI: 4.95, RO: 7.05,     // track centre-line radius, inner / outer edge
  lanes: [5.45, 6.55],            // lane centre radii (inner: ours, outer: the oracle)
  floor: 12,                      // half size of the painted floor texture (world units)
  stands: 14.6,                   // bleacher radius
};

/** Top view of the floor (PCB + the ring track + lane traces + start / finish lines), one canvas. */
export function paintFloor(g, w, h, { startA, finishA, seed = 3 } = {}) {
  const r = mkRng('floor', seed);
  const F = ARENA.floor, px = w / (2 * F);
  const X = (x) => (x + F) * px, Y = (z) => (z + F) * px;     // world (x, z) -> canvas
  paintPCB(g, w, h, seed);                                      // board everywhere (white-based; albedo tints it)
  // the track: a darker ring with soft wet edges
  g.save();
  g.beginPath(); g.arc(X(0), Y(0), ARENA.RO * px, 0, TAU); g.arc(X(0), Y(0), ARENA.RI * px, 0, TAU, true);
  g.fillStyle = 'rgba(8,40,30,0.42)'; g.fill('evenodd');
  g.clip('evenodd');
  mottle(g, w, h, r, 24, 0.05, 0.3);
  g.restore();
  // edge traces (gold with ink edge) and the dashed lane divider
  const ring = (rad, wid, col, dash = null) => { g.save(); g.strokeStyle = col; g.lineWidth = wid * px; if (dash) g.setLineDash(dash.map((d) => d * px)); g.beginPath(); g.arc(X(0), Y(0), rad * px, 0, TAU); g.stroke(); g.restore(); };
  for (const rad of [ARENA.RI + 0.08, ARENA.RO - 0.08]) { ring(rad, 0.11, 'rgba(20,30,25,0.6)'); ring(rad, 0.065, '#f7d27a'); }
  ring(ARENA.R, 0.07, 'rgba(255,246,224,0.9)', [0.5, 0.35]);
  // solder-pad dots along the outer edge
  for (let k = 0; k < 160; k++) { const a = k / 160 * TAU, x = X(Math.cos(a) * (ARENA.RO + 0.28)), y = Y(Math.sin(a) * (ARENA.RO + 0.28)); g.fillStyle = 'rgba(20,30,25,0.6)'; g.beginPath(); g.arc(x, y, 0.07 * px, 0, TAU); g.fill(); g.fillStyle = '#f7d27a'; g.beginPath(); g.arc(x, y, 0.05 * px, 0, TAU); g.fill(); }
  // start line (cream) and finish line (checkers) across the track
  const across = (a, fn) => { g.save(); g.translate(X(0), Y(0)); g.rotate(a); fn(); g.restore(); };
  if (startA != null) across(startA, () => { g.fillStyle = '#fff6e0'; g.fillRect(ARENA.RI * px, -0.07 * px, (ARENA.RO - ARENA.RI) * px, 0.14 * px); });
  if (finishA != null) across(finishA, () => {
    const n = 12, cw = (ARENA.RO - ARENA.RI) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#1a1530' : '#fff6e0'; g.fillRect((ARENA.RI + i * cw) * px, (-0.2 + j * 0.2) * px, cw * px + 1, 0.2 * px + 1); }
  });
}

/** Graphics card lying in the infield: PCB, shroud with fins, three fans on top, gold PCIe fingers. */
export function buildCard(THREE, add, parent) {
  const C = { root: new THREE.Group() }; parent.add(C.root);
  const L = 7.2, D = 3.0;
  // board
  add(new THREE.BoxGeometry(L + 0.4, 0.14, D + 0.5), { color: 0x057a57, hatchDir: [1, 0, 0.2] }, { outline: 1 }, [0, 0.07, 0], [0, 0, 0], C.root);
  // gold fingers along the front edge
  for (let k = 0; k < 22; k++) add(new THREE.BoxGeometry(0.11, 0.03, 0.34), { key: 'goldfinger', color: 0xf7c24a, spec: 0.6 }, { outline: 0.4, cast: false }, [-2.4 + k * 0.2, 0.15, D / 2 + 0.1], [0, 0, 0], C.root);
  // shroud
  const sh = { color: 0x2b2447, hatchDir: [0, 1, 0.2], rim: 0.6 };
  C.shroud = add(new THREE.BoxGeometry(L, 0.9, D), [sh, sh, { color: 0x3a3160, hatchDir: [1, 0, 0.3], rim: 0.5 }, sh, sh, sh], { outline: 1.2 }, [0, 0.62, 0], [0, 0, 0], C.root);
  // emerald racing stripe on the long sides
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(L - 0.6, 0.16, 0.04), { key: 'cardstripe', color: 0x10b981, rim: 0.5 }, { outline: 0.5, cast: false }, [0, 0.72, s * (D / 2 + 0.02)], [0, 0, 0], C.root);
  // fin slats visible along the long sides (below the stripe)
  for (let k = 0; k < 26; k++) for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.05, 0.36, 0.06), { key: 'fin', color: 0xb7bfd9 }, { outline: 0.35, cast: false }, [-L / 2 + 0.35 + k * (L - 0.7) / 25, 0.42, s * (D / 2 + 0.03)], [0, 0, 0], C.root);
  // three fans on top
  C.fans = [-2.3, 0, 2.3].map((x) => {
    const g = new THREE.Group(); g.position.set(x, 1.08, 0); C.root.add(g);
    add(new THREE.TorusGeometry(1.0, 0.09, 12, 56), { key: 'fanring', color: 0x1f1a38, hatchMode: 'u' }, { outline: 0.8, cast: false }, [0, 0, 0], [Math.PI / 2, 0, 0], g);
    const rot = new THREE.Group(); g.add(rot);
    for (let b = 0; b < 9; b++) {
      const shp = new THREE.Shape(); shp.moveTo(0.18, -0.06); shp.quadraticCurveTo(0.6, -0.28, 0.94, 0.02); shp.quadraticCurveTo(0.55, 0.26, 0.18, 0.1); shp.closePath();
      const bg = new THREE.ExtrudeGeometry(shp, { depth: 0.03, bevelEnabled: false });
      const blade = add(bg, { key: 'blade', color: 0x4a4270, hatchDir: [0, 1, 0] }, { outline: 0.45, cast: false }, [0, 0, 0], [Math.PI / 2, 0, 0], rot);
      blade.rotation.set(-Math.PI / 2, 0, b / 9 * TAU); blade.rotation.order = 'YXZ';
      blade.rotation.y = 0;
    }
    add(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 28), { key: 'fanhub', color: 0x10b981, hatchMode: 'u', rim: 0.5 }, { outline: 0.6, cast: false }, [0, 0.03, 0], [0, 0, 0], rot);
    return rot;
  });
  // HBM stacks and the die peeking out at both ends
  for (const s of [-1, 1]) for (const z of [-0.8, 0.8]) {
    for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.5, 0.07, 0.7), { key: 'hbm' + (k % 2), color: k % 2 ? 0x9aa1c9 : 0xc2c7e6 }, { outline: 0.5, cast: false }, [s * (L / 2 + 0.05) + s * 0.0, 0.18 + k * 0.075, z], [0, 0, 0], C.root);
  }
  return C;
}

/** Gym floor planks (white-based: the albedo gives the warm wood), with court lines. */
export function paintPlanks(g, w, h, seed = 5) {
  const r = mkRng('planks', seed);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  const pw = w / 16;
  for (let i = 0; i < 16; i++) {
    let y = -r() * h;
    while (y < h) {
      const L = r.range(0.25, 0.6) * h, tone = r.range(-0.06, 0.08);
      g.fillStyle = tone > 0 ? `rgba(255,255,255,${tone * 3})` : `rgba(90,50,20,${-tone * 2})`;
      g.fillRect(i * pw, y, pw, L);
      g.strokeStyle = 'rgba(70,40,20,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * pw, y + L); g.lineTo(i * pw + pw, y + L); g.stroke();
      for (let k = 0; k < 3; k++) { g.strokeStyle = 'rgba(110,60,25,0.12)'; g.lineWidth = 1.5; const yy = y + r() * L; g.beginPath(); g.moveTo(i * pw + 4, yy); g.bezierCurveTo(i * pw + pw * 0.3, yy + 6, i * pw + pw * 0.7, yy - 6, i * pw + pw - 4, yy + 2); g.stroke(); }
      y += L;
    }
    g.strokeStyle = 'rgba(60,35,15,0.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(i * pw, 0); g.lineTo(i * pw, h); g.stroke();
  }
}

/** Bleachers, padded wall, pennant bunting and hanging lamps round the arena (radius ARENA.stands). */
export function buildStands(THREE, add, parent, { gapA = null } = {}) {
  const S = { root: new THREE.Group() }; parent.add(S.root);
  const R0 = ARENA.stands;
  // padded wall ring (coral) and three bleacher tiers (cream / ochre)
  const seg = 40;
  for (let k = 0; k < seg; k++) {
    const a = (k + 0.5) / seg * TAU;
    const pad = new THREE.Group(); pad.position.set(Math.cos(a) * R0, 0, Math.sin(a) * R0); pad.rotation.y = -a + Math.PI / 2; S.root.add(pad);
    const wseg = TAU * R0 / seg + 0.02;
    add(new THREE.BoxGeometry(wseg, 0.7, 0.3), { key: 'pad' + (k % 2), color: k % 2 ? 0xa8434b : 0x96363f, hatchDir: [0, 1, 0] }, { outline: 0.7, cast: false }, [0, 0.35, 0], [0, 0, 0], pad);
    for (let t = 0; t < 3; t++) add(new THREE.BoxGeometry(wseg + 0.05 + t * 0.12, 0.5, 0.9), { key: 'tier' + t, color: t % 2 ? 0xf2d8a8 : 0xfff0d0, hatchDir: [0, 1, 0] }, { outline: 0.6, cast: false }, [0, 0.95 + t * 0.5, 0.65 + t * 0.9], [0, 0, 0], pad);
  }
  // lamp posts with cone shades and pennant strings between them
  S.lamps = [];
  const nl = 8;
  const tip = (k) => { const a = k / nl * TAU; return [Math.cos(a) * (R0 - 0.6), 5.2, Math.sin(a) * (R0 - 0.6)]; };
  for (let k = 0; k < nl; k++) {
    const [x, y, z] = tip(k);
    add(new THREE.CylinderGeometry(0.07, 0.09, y, 10), { key: 'lamppost', color: 0x3b3558, hatchMode: 'u' }, { outline: 0.6, cast: false }, [x, y / 2, z], [0, 0, 0], S.root);
    const shade = add(new THREE.ConeGeometry(0.45, 0.5, 20, 1, true), { key: 'lampshade', color: 0x059669, hatchMode: 'u', side: THREE.DoubleSide, rim: 0.5 }, { outline: 0.7, cast: false }, [x * 0.97, y + 0.2, z * 0.97], [0, 0, 0], S.root);
    S.lamps.push(shade);
  }
  // pennants: triangles along catenaries between neighbouring lamp tips
  const cols = [0xef4b5f, 0xfff0d0, 0x10b981, 0xf2b134];
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.42, 0], 3)); tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
  for (let k = 0; k < nl; k++) {
    const a = tip(k), b = tip((k + 1) % nl);
    const n = 9;
    for (let j = 1; j < n; j++) {
      const u = j / n, x = lerp(a[0], b[0], u), z = lerp(a[2], b[2], u), y = lerp(a[1], b[1], u) - 0.9 * Math.sin(Math.PI * u);
      const m = add(tri, { key: 'pennant' + ((j + k) % 4), color: cols[(j + k) % 4], side: THREE.DoubleSide, rim: 0.3 }, { outline: 0.4, cast: false }, [x, y, z], [0, -Math.atan2(b[2] - a[2], b[0] - a[0]), 0], S.root);
    }
  }
  return S;
}
function lerp(a, b, t) { return a + (b - a) * t; }
