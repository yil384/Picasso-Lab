// tg_props.js - the gym's standardised equipment (TritonGym gives every workflow the same tools):
//   compile gate (a portcullis that CLANGs shut on a build error), the verify weigh-in (a balance scale:
//   the kernel's result against the PyTorch reference kettlebell, needle inside the 0.01 window), the
//   profile race (lanes over the GPU die, start blocks, finish tape, the timing clock).
import { faceSet, INK, TAU } from './tg_paint.js';
import { comicWord } from './tg_letter.js';

const IRON = 0x3b3558, BRASS = 0xf2b134, CORAL = 0xef4b5f, CREAMC = 0xfff4dc;

/** Compile gate: two stone-ish posts, a lintel with a grumpy face, an iron portcullis that drops. */
export function buildGate(THREE, add, parent, { w = 1.6, h = 1.9 } = {}) {
  const G = { root: new THREE.Group() }; parent.add(G.root);
  const post = { color: 0x7d86b8, hatchDir: [0, 1, 0] };
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.34, h, 0.44), post, { outline: 1 }, [s * (w / 2 + 0.17), h / 2, 0], [0, 0, 0], G.root);
  G.faces = faceSet(THREE, { grump: { eyes: 'determined', mouth: 'flat' }, angry: { eyes: 'squint', mouth: 'teeth' }, ok: { eyes: 'happy', mouth: 'smile' } },
    { w: 1024, h: 256, base: '#ffffff', cx: 512, cy: 118, s: 0.95, seed: 21, spacing: 1.3, mouthY: 52 });
  const lintelGeo = new THREE.BoxGeometry(w + 0.9, 0.46, 0.5);
  // map the front face only: planar uv from x
  const uv = lintelGeo.attributes.uv, pos = lintelGeo.attributes.position, nor = lintelGeo.attributes.normal;
  for (let i = 0; i < pos.count; i++) if (nor.getZ(i) > 0.5) uv.setXY(i, 0.5 + pos.getX(i) / (w + 0.9), 0.5 + pos.getY(i) / 0.46 * 0.9); else uv.setXY(i, 0.02, 0.98);
  G.lintel = add(lintelGeo, { color: 0x9aa2cf, map: G.faces.grump[0], hatchDir: [0, 1, 0], rim: 0.6 }, { outline: 1.1 }, [0, h + 0.23, 0], [0, 0, 0], G.root);
  G.lamp = add(new THREE.SphereGeometry(0.15, 20, 14), { color: 0x10b981, glow: 0.4, rim: 0.6 }, { outline: 0.7 }, [0, h + 0.62, 0], [0, 0, 0], G.root);
  // portcullis: vertical bars + two cross bars, pointed tips, slides in y
  G.grate = new THREE.Group(); G.root.add(G.grate);
  const bar = new THREE.CylinderGeometry(0.045, 0.045, h, 10);
  const tip = new THREE.ConeGeometry(0.07, 0.18, 10); tip.rotateX(Math.PI);
  for (let k = 0; k < 5; k++) { const x = -w / 2 + 0.16 + k * (w - 0.32) / 4; add(bar, { color: IRON, hatchMode: 'u' }, { outline: 0.6 }, [x, h / 2, 0], [0, 0, 0], G.grate); add(tip, { color: IRON }, { outline: 0.5 }, [x, -0.06, 0], [0, 0, 0], G.grate); }
  for (const y of [0.45, 1.25]) add(new THREE.BoxGeometry(w - 0.1, 0.07, 0.07), { color: IRON }, { outline: 0.6 }, [0, y, 0], [0, 0, 0], G.grate);
  return G;
}

/** Weigh-in scale: post, beam, two pans on rods, needle + dial with the 0.01 tolerance window. */
export function buildScale(THREE, add, parent, { span = 1.5 } = {}) {
  const S = { root: new THREE.Group() }; parent.add(S.root);
  const brass = { color: BRASS, hatchMode: 'u', rim: 0.7, spec: 0.4 };
  add(new THREE.CylinderGeometry(0.42, 0.52, 0.16, 40), { color: IRON, hatchMode: 'u' }, { outline: 1 }, [0, 0.08, 0], [0, 0, 0], S.root);
  add(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 16), brass, { outline: 0.9 }, [0, 0.9, 0], [0, 0, 0], S.root);
  // dial on the post (faces +z): cream disc with the tolerance window painted
  const dialTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#fff6e0'; g.fillRect(0, 0, 512, 512);
    g.translate(256, 300);
    for (let k = -8; k <= 8; k++) { const a = -Math.PI / 2 + k * 0.12; g.strokeStyle = INK; g.lineWidth = k % 4 ? 5 : 9; g.beginPath(); g.moveTo(Math.cos(a) * 190, Math.sin(a) * 190); g.lineTo(Math.cos(a) * (k % 4 ? 160 : 145), Math.sin(a) * (k % 4 ? 160 : 145)); g.stroke(); }
    g.fillStyle = 'rgba(16,185,129,0.85)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 200, -Math.PI / 2 - 0.07, -Math.PI / 2 + 0.07); g.closePath(); g.fill();
    g.fillStyle = 'rgba(239,75,95,0.35)'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 200, -Math.PI / 2 + sd * 0.55 - 0.4, -Math.PI / 2 + sd * 0.55 + 0.4); g.closePath(); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  })();
  S.dial = add(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 40), [{ color: BRASS, hatchMode: 'u' }, { color: 0xffffff, map: dialTex, hatch: 0.3, rim: 0.3 }, { color: BRASS }], { outline: 0.8 }, [0, 1.0, 0.1], [Math.PI / 2, 0, 0], S.root);
  S.needle = new THREE.Group(); S.needle.position.set(0, 0.93, 0.15); S.root.add(S.needle);
  add(new THREE.BoxGeometry(0.03, 0.34, 0.02), { color: CORAL }, { outline: 0.4 }, [0, 0.17, 0], [0, 0, 0], S.needle);
  S.beam = new THREE.Group(); S.beam.position.set(0, 1.7, 0); S.root.add(S.beam);
  add(new THREE.BoxGeometry(span * 2 + 0.2, 0.09, 0.12), brass, { outline: 0.9 }, [0, 0, 0], [0, 0, 0], S.beam);
  add(new THREE.SphereGeometry(0.12, 16, 12), brass, { outline: 0.8 }, [0, 0.02, 0], [0, 0, 0], S.beam);
  S.pans = [-1, 1].map((s) => {
    const g = new THREE.Group(); S.root.add(g);
    const rodGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 6); rodGeo.translate(0, 0.5, 0);
    const rods = [0, 1, 2].map((k) => add(rodGeo, { color: IRON }, { outline: 0.35, cast: false }, [Math.cos(k / 3 * TAU) * 0.3, 0.04, Math.sin(k / 3 * TAU) * 0.3], [0, 0, 0], g));
    add(new THREE.CylinderGeometry(0.46, 0.36, 0.08, 36), brass, { outline: 0.9 }, [0, 0, 0], [0, 0, 0], g);
    return { g, rods, side: s };
  });
  S.span = span;
  return S;
}

/** PyTorch reference: an orange kettlebell with a little flame on top (a torch). */
export function buildKettlebell(THREE, add, parent) {
  const B = { root: new THREE.Group() }; parent.add(B.root);
  add(new THREE.SphereGeometry(0.3, 28, 20), { color: 0xf07b2c, rim: 0.7, spec: 0.3 }, { outline: 1 }, [0, 0.27, 0], [0, 0, 0], B.root).scale.set(1, 0.9, 1);
  add(new THREE.TorusGeometry(0.17, 0.05, 10, 28, Math.PI), { color: 0xf07b2c }, { outline: 0.8 }, [0, 0.5, 0], [0, 0, 0], B.root);
  const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.bezierCurveTo(0.14, 0.05, 0.1, 0.18, 0.0, 0.34); fl.bezierCurveTo(-0.02, 0.2, -0.13, 0.14, -0.1, 0.05); fl.closePath();
  B.flame = add(new THREE.ExtrudeGeometry(fl, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), { color: 0xffc23d, glow: 0.25, rim: 0.5 }, { outline: 0.7 }, [0, 0.66, -0.03], [0, 0, 0], B.root);
  return B;
}

/** The timing clock: a big stopwatch on a pole at the finish. */
export function buildClock(THREE, add, parent) {
  const C = { root: new THREE.Group() }; parent.add(C.root);
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 12), { color: IRON, hatchMode: 'u' }, { outline: 0.8 }, [0, 1.2, 0], [0, 0, 0], C.root);
  const face = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#fff6e0'; g.fillRect(0, 0, 512, 512); g.translate(256, 256);
    for (let k = 0; k < 60; k++) { const a = k / 60 * TAU; g.strokeStyle = INK; g.lineWidth = k % 5 ? 4 : 10; g.beginPath(); g.moveTo(Math.cos(a) * 230, Math.sin(a) * 230); g.lineTo(Math.cos(a) * (k % 5 ? 205 : 180), Math.sin(a) * (k % 5 ? 205 : 180)); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  })();
  C.head = new THREE.Group(); C.head.position.y = 2.75; C.root.add(C.head);
  add(new THREE.CylinderGeometry(0.62, 0.62, 0.2, 48), [{ color: BRASS, hatchMode: 'u', rim: 0.8 }, { color: 0xffffff, map: face, hatch: 0.3 }, { color: BRASS }], { outline: 1 }, [0, 0, 0], [Math.PI / 2, 0, 0], C.head);
  add(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 14), { color: BRASS }, { outline: 0.7 }, [0, 0.7, 0], [0, 0, 0], C.head);
  C.btn = add(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 18), { color: CORAL }, { outline: 0.7 }, [0, 0.8, 0], [0, 0, 0], C.head);
  C.hands = [0, 1].map((k) => { const g = new THREE.Group(); g.position.z = 0.12; C.head.add(g); add(new THREE.BoxGeometry(k ? 0.05 : 0.035, k ? 0.36 : 0.5, 0.02), { color: k ? INK === '' ? 0 : 0x1a1530 : CORAL }, { outline: 0.3, cast: false }, [0, k ? 0.16 : 0.22, 0], [0, 0, 0], g); return g; });
  return C;
}

// ------------------------------------------------------------------------------------------------
// ring-arena stations (local frame: +x along the track direction, +z = outward from the ring centre)
// ------------------------------------------------------------------------------------------------
/** Two-lane compile gate straddling the track: posts, a lintel with a grumpy face, one portcullis per lane (each can
 *  drop, and swing on its top hinge like a bat), a lamp. Frame: +x along the track, +z outward. */
export function buildGate2(THREE, add, parent, { span = 2.8, h = 2.05, lanes = [0.55, -0.55] } = {}) {
  const G = { root: new THREE.Group() }; parent.add(G.root);
  const post = { key: 'gatepost', color: 0x7d86b8, hatchDir: [0, 1, 0], rim: 0.5 };
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.4, h, 0.4), post, { outline: 1 }, [0, h / 2, s * (span / 2 + 0.2)], [0, 0, 0], G.root);
    add(new THREE.BoxGeometry(0.52, 0.14, 0.52), { key: 'gatecap', color: 0x5b6396 }, { outline: 0.8 }, [0, h + 0.07, s * (span / 2 + 0.2)], [0, 0, 0], G.root);
    for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.035, 8, 6), { key: 'rivet', color: 0x3b3558 }, { outline: 0.2, cast: false }, [-0.2, 0.4 + k * 0.6, s * (span / 2 + 0.2)], [0, 0, 0], G.root);
  }
  G.faces = faceSet(THREE, { grump: { eyes: 'determined', mouth: 'flat' }, angry: { eyes: 'squint', mouth: 'teeth' }, ok: { eyes: 'happy', mouth: 'smile' }, doze: { eyes: 'sleep', mouth: 'flat' } },
    { w: 1024, h: 256, base: '#ffffff', cx: 512, cy: 110, s: 0.95, seed: 21, spacing: 1.45, mouthY: 56 });
  const LW = span + 0.95, LH = 0.55;
  const lintelGeo = new THREE.BoxGeometry(0.5, LH, LW);
  { const uv = lintelGeo.attributes.uv, pos = lintelGeo.attributes.position, nor = lintelGeo.attributes.normal;
    for (let i = 0; i < pos.count; i++) { if (nor.getX(i) < -0.5) uv.setXY(i, 0.5 + pos.getZ(i) / LW, 0.5 + pos.getY(i) / LH * 0.92); else if (nor.getX(i) > 0.5) uv.setXY(i, 0.5 - pos.getZ(i) / LW, 0.5 + pos.getY(i) / LH * 0.92); else uv.setXY(i, 0.02, 0.98); } }
  G.lintel = add(lintelGeo, { color: 0x9aa2cf, map: G.faces.grump[0], hatchDir: [0, 1, 0], rim: 0.6 }, { outline: 1.1 }, [0, h + 0.42, 0], [0, 0, 0], G.root);
  G.lamp = add(new THREE.SphereGeometry(0.28, 20, 14), { color: 0xffffff, glow: 0.4, rim: 0.6, spec: 0 }, { outline: 0.8 }, [0, h + 0.98, 0], [0, 0, 0], G.root);
  G.grates = lanes.map((z) => {
    const pivot = new THREE.Group(); pivot.position.set(0, h, z); G.root.add(pivot);
    const slide = new THREE.Group(); pivot.add(slide);
    const bar = new THREE.CylinderGeometry(0.05, 0.05, h - 0.05, 10);
    const tip = new THREE.ConeGeometry(0.075, 0.2, 10); tip.rotateX(Math.PI);
    for (let k = 0; k < 4; k++) { const zz = -0.4 + k * 0.267; add(bar, { key: 'iron', color: 0x3b3558, hatchMode: 'u' }, { outline: 0.6 }, [0, -h / 2, zz], [0, 0, 0], slide); add(tip, { key: 'iron', color: 0x3b3558 }, { outline: 0.5 }, [0, -h - 0.07, zz], [0, 0, 0], slide); }
    for (const y of [-h + 0.42, -h + 1.2]) add(new THREE.BoxGeometry(0.08, 0.08, 0.95), { key: 'iron', color: 0x3b3558 }, { outline: 0.6 }, [0, y, 0], [0, 0, 0], slide);
    return { pivot, slide };
  });
  G.h = h;
  return G;
}

/** The finish gantry: a cantilever. One striped pylon on the infield kerb, an arm over the track, and a name board on
 *  the arm that faces outward (towards the grandstand and the cameras), so nothing stands between them and the line.
 *  Frame: +x along the track, +z outward. */
export function buildFinish(THREE, add, parent, { span = 3.1, h = 1.72, bannerTex = null, bw = 2.7, bh = 0.66, back = 1.9, reach = 0.26 } = {}) {
  // the pylon stands on the infield kerb `back` units BEFORE the line and a diagonal arm carries the board over the line,
  // so from the payoff lens (past the line) the pylon stays left of the letters and from the photo-finish lens it stays
  // behind the racers
  const Fn = { root: new THREE.Group() }; parent.add(Fn.root);
  const zi = -span / 2, px = -back;
  add(new THREE.CylinderGeometry(0.16, 0.21, h + 0.2, 16), { key: 'pylon', color: 0xfff0d0, hatchMode: 'u', rim: 0.6, spec: 0 }, { outline: 1 }, [px, (h + 0.2) / 2, zi], [0, 0, 0], Fn.root);
  for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.205, 0.205, 0.12, 16), { key: 'pylonband', color: 0x059669 }, { outline: 0.5, cast: false }, [px, 0.3 + k * 0.55, zi], [0, 0, 0], Fn.root);
  add(new THREE.SphereGeometry(0.2, 14, 10), { key: 'pylontop', color: 0xef4b5f, rim: 0.6 }, { outline: 0.7 }, [px, h + 0.3, zi], [0, 0, 0], Fn.root);
  // the diagonal arm from the pylon to the board over the line (with a brace)
  const bz = zi + span * reach, ax = 0 - px, az = bz - zi, al = Math.hypot(ax, az), ay = Math.atan2(ax, az);
  add(new THREE.BoxGeometry(0.14, 0.14, al + 0.3), { key: 'beam', color: 0x3b3558, hatchDir: [0, 1, 0] }, { outline: 0.8 }, [px + ax / 2, h, zi + az / 2], [0, ay, 0], Fn.root);
  add(new THREE.BoxGeometry(0.08, 0.08, 1.2), { key: 'beam', color: 0x3b3558 }, { outline: 0.6 }, [px + ax * 0.16, h - 0.4, zi + az * 0.16], [0.62, ay, 0, 'YXZ'], Fn.root);
  // the board, standing on the arm end over the inner lane at the line, facing +z (outward)
  Fn.board = new THREE.Group(); Fn.board.position.set(0, h + 0.07, bz); Fn.root.add(Fn.board);
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 8), { key: 'iron', color: 0x3b3558 }, { outline: 0.4 }, [s * bw * 0.32, 0.1, 0], [0, 0, 0], Fn.board);
  const bg = new THREE.BoxGeometry(bw, bh, 0.08);
  Fn.banner = add(bg, [{ key: 'boardedge', color: 0x059669 }, { key: 'boardedge', color: 0x059669 }, { key: 'boardedge', color: 0x059669 }, { key: 'boardedge', color: 0x059669 }, { color: 0xffffff, map: bannerTex, rim: 0.4, hatch: 0.4, spec: 0 }, { key: 'boardedge', color: 0x059669 }],
    { outline: 1.0 }, [0, 0.22 + bh / 2, 0], [0, 0, 0], Fn.board);
  return Fn;
}

/** The timing stopwatch on a tall post (faces +z). Hands: coral = the oracle, emerald = ours. */
export function buildTower(THREE, add, parent, { y = 3.3 } = {}) {
  const C = { root: new THREE.Group() }; parent.add(C.root);
  add(new THREE.CylinderGeometry(0.09, 0.12, y - 0.6, 12), { key: 'iron', color: 0x3b3558, hatchMode: 'u' }, { outline: 0.9 }, [0, (y - 0.6) / 2, 0], [0, 0, 0], C.root);
  add(new THREE.CylinderGeometry(0.45, 0.55, 0.16, 24), { key: 'towerbase', color: 0x3b3558 }, { outline: 0.8, cast: false }, [0, 0.08, 0], [0, 0, 0], C.root);
  const face = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#fff6e0'; g.fillRect(0, 0, 512, 512); g.translate(256, 256);
    for (let k = 0; k < 60; k++) { const a = k / 60 * TAU; g.strokeStyle = '#1a1530'; g.lineWidth = k % 5 ? 5 : 13; g.beginPath(); g.moveTo(Math.cos(a) * 238, Math.sin(a) * 238); g.lineTo(Math.cos(a) * (k % 5 ? 210 : 176), Math.sin(a) * (k % 5 ? 210 : 176)); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  })();
  C.head = new THREE.Group(); C.head.position.y = y; C.root.add(C.head);
  const fg = new THREE.CylinderGeometry(0.8, 0.8, 0.24, 48); fg.rotateX(Math.PI / 2);
  add(fg, [{ key: 'brass', color: 0xf2b134, hatchMode: 'u', rim: 0.8 }, { color: 0xffffff, map: face, hatch: 0.3, rim: 0.3 }, { color: 0xffffff, map: face, hatch: 0.3 }], { outline: 1.1 }, [0, 0, 0], [0, 0, 0], C.head);
  add(new THREE.TorusGeometry(0.8, 0.07, 10, 48), { key: 'brass', color: 0xf2b134, hatchMode: 'u' }, { outline: 0.7 }, [0, 0, 0.12], [0, 0, 0], C.head);
  add(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 14), { key: 'brass', color: 0xf2b134 }, { outline: 0.7 }, [0, 0.9, 0], [0, 0, 0], C.head);
  C.btn = add(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 18), { key: 'coralbtn', color: 0xef4b5f }, { outline: 0.7 }, [0, 1.04, 0], [0, 0, 0], C.head);
  add(new THREE.TorusGeometry(0.14, 0.04, 8, 20), { key: 'brass', color: 0xf2b134 }, { outline: 0.5 }, [0.62, 0.62, 0], [0, 0, -0.7], C.head);
  C.hands = [0xef4b5f, 0x10b981].map((col, k) => {
    const g = new THREE.Group(); g.position.z = 0.15 + k * 0.03; C.head.add(g);
    // coral (the oracle): long and thin; emerald (ours): short and broad, so both read when they overlap at 12
    add(new THREE.BoxGeometry(k ? 0.075 : 0.045, k ? 0.52 : 0.72, 0.03), { color: col, rim: 0.4 }, { outline: 0.45, cast: false }, [0, k ? 0.2 : 0.3, 0], [0, 0, 0], g);
    return g;
  });
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 14).rotateX(Math.PI / 2), { key: 'brass', color: 0xf2b134 }, { outline: 0.4 }, [0, 0, 0.22], [0, 0, 0], C.head);
  return C;
}

/** The LLM's workbench and the stack of 164 operator cards (bands in true proportions 139 / 13 / 12, "164" painted on
 *  its outward face), plus the current event card (a matmul pictogram) on the bench. Frame: +x along the track, +z out. */
export function buildBench(THREE, add, parent) {
  const B = { root: new THREE.Group() }; parent.add(B.root);
  const wood = { key: 'benchwood', color: 0xd99a55, hatchDir: [0, 1, 0], rim: 0.5 };
  // layout (+x along the track): the 164 stack | Tok stands here, nothing in front of it | the bench where Kern is built
  B.benchX = 1.0; B.tokX = -0.55;
  add(new THREE.BoxGeometry(1.5, 0.12, 0.85), wood, { outline: 1 }, [B.benchX, 0.74, 0], [0, 0, 0], B.root);
  for (const [x, z] of [[-0.62, -0.33], [0.62, -0.33], [-0.62, 0.33], [0.62, 0.33]]) add(new THREE.BoxGeometry(0.1, 0.74, 0.1), wood, { outline: 0.7 }, [B.benchX + x, 0.37, z], [0, 0, 0], B.root);
  const edge = (col, lines, crinkle, label) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = col; g.fillRect(0, 0, 512, 1024);
    for (let k = 0; k < lines; k++) { const y = (k + 0.5) / lines * 1024; g.strokeStyle = 'rgba(40,30,50,0.33)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + (crinkle ? Math.sin(x * 0.3 + k) * 4 : 0)); g.stroke(); }
    if (label) comicWord(g, '164', 256, 470, 250, { fill: '#ef4b5f', shade: '#b8283f', rot: -0.06, track: 0.1, fan: 0.05 });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  };
  B.stack = new THREE.Group(); B.stack.position.set(-1.75, 0, 0.05); B.root.add(B.stack);
  // bundles of operator cards, bottom to top: 12 DSL (violet), 13 OOD (coral, crinkled), 139 Standard (cream) on top, 0.01
  // per card; Tok takes its card off the (Standard) top
  const bundles = [[12, '#a996d8', false], [13, '#f58a93', true]];
  let left = 139; while (left > 0) { const n = Math.min(left, 24); bundles.push([n, '#fff4dc', false]); left -= n; }
  let y = 0;
  B.bands = bundles.map(([n, col, cr], i) => {
    const hh = n * 0.01;
    const tex = edge(col, n, cr, false);
    const m = add(new THREE.BoxGeometry(0.78, hh, 0.6), { color: 0xffffff, map: tex, hatchDir: [0, 1, 0], rim: 0.5, seed: 70 + i }, { outline: 0.7 }, [0.03 * Math.sin(i * 2.3), y + hh / 2, 0.025 * Math.cos(i * 1.7)], [0, 0.06 * Math.sin(i * 1.9), 0], B.stack);
    y += hh; return m;
  });
  B.stackH = y;
  // the tag: a hanging card with "164"
  const tagTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#fff8ea'; g.fillRect(0, 0, 512, 300); comicWord(g, '164', 256, 158, 190, { fill: '#ef4b5f', shade: '#b8283f', rot: -0.05, track: 0.12, fan: 0.04 }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; })();
  B.tag = add(new THREE.BoxGeometry(0.62, 0.36, 0.02), [{ key: 'cardedge', color: 0xfff8ea }, { key: 'cardedge', color: 0xfff8ea }, { key: 'cardedge', color: 0xfff8ea }, { key: 'cardedge', color: 0xfff8ea }, { color: 0xffffff, map: tagTex, rim: 0.3, hatch: 0.4 }, { key: 'cardedge', color: 0xfff8ea }],
    { outline: 0.6 }, [0.0, 0.95, 0.33], [-0.05, 0, 0.06], B.stack);
  return B;
}

/** The weigh-in: a brass balance with a round dial (hairline emerald notch) on its post, pans that each hold an output
 *  block, and a flag that springs up from the top. Frame: faces +z. */
export function buildWeighIn(THREE, add, parent, { span = 0.95, h = 1.75 } = {}) {
  const S = { root: new THREE.Group() }; parent.add(S.root);
  const brass = { key: 'brass', color: 0xf2b134, hatchMode: 'u', rim: 0.7, spec: 0 };
  add(new THREE.CylinderGeometry(0.44, 0.56, 0.16, 40), { key: 'iron', color: 0x3b3558, hatchMode: 'u' }, { outline: 1 }, [0, 0.08, 0], [0, 0, 0], S.root);
  add(new THREE.CylinderGeometry(0.075, 0.095, h - 0.1, 16), brass, { outline: 0.9 }, [0, h / 2, 0], [0, 0, 0], S.root);
  // the dial: a flat face (its own UVs, canvas top = 12 o'clock). A wide emerald PASS notch at 12, coral error sectors
  // either side, ticks; the needle is the hero (pegged in the coral before the output block lands, then it swings,
  // overshoots and settles in the notch)
  const dialTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#fff6e0'; g.fillRect(0, 0, 512, 512); g.translate(256, 256);
    const up = -Math.PI / 2, N = 0.21;                     // notch half-angle
    g.fillStyle = '#f58a93'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 236, up + sd * N, up + sd * 1.15, sd < 0); g.closePath(); g.fill(); }
    g.fillStyle = '#10b981'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 236, up - N, up + N); g.closePath(); g.fill();
    g.fillStyle = '#fff6e0'; g.beginPath(); g.arc(0, 0, 120, 0, Math.PI * 2); g.fill();
    for (let k = -9; k <= 9; k++) { const a = up + k * 0.13; g.strokeStyle = INK; g.lineWidth = k % 3 ? 6 : 12; g.beginPath(); g.moveTo(Math.cos(a) * 238, Math.sin(a) * 238); g.lineTo(Math.cos(a) * (k % 3 ? 206 : 184), Math.sin(a) * (k % 3 ? 206 : 184)); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 244, 0, Math.PI * 2); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  })();
  const dg = new THREE.CylinderGeometry(0.44, 0.44, 0.07, 40); dg.rotateX(Math.PI / 2);
  add(dg, { key: 'brass', color: 0xf2b134, hatchMode: 'u', rim: 0.7, spec: 0 }, { outline: 0.85 }, [0, 1.02, 0.1], [0, 0, 0], S.root);
  S.dial = add(new THREE.CircleGeometry(0.4, 48), { color: 0xffffff, map: dialTex, hatch: 0.2, rim: 0.3, spec: 0 }, { outline: 0.3, cast: false }, [0, 1.02, 0.14], [0, 0, 0], S.root);
  // the PASS flood: an emerald fan that opens over the dial when the needle settles
  S.flood = add(new THREE.CircleGeometry(0.4, 40, Math.PI / 2 - 1.15, 2.3), { color: 0x10b981, rim: 0.2, spec: 0, glow: 0.2 }, { outline: 0.4, cast: false }, [0, 1.02, 0.145], [0, 0, 0], S.root);
  S.flood.visible = false;
  S.needle = new THREE.Group(); S.needle.position.set(0, 1.02, 0.17); S.root.add(S.needle);
  add(new THREE.BoxGeometry(0.05, 0.4, 0.02), { key: 'needle', color: 0x1a1530, spec: 0 }, { outline: 0.4, cast: false }, [0, 0.17, 0], [0, 0, 0], S.needle);
  add(new THREE.ConeGeometry(0.045, 0.1, 4), { key: 'needle', color: 0x1a1530, spec: 0 }, { outline: 0.3, cast: false }, [0, 0.41, 0], [0, 0, 0], S.needle);
  add(new THREE.SphereGeometry(0.055, 10, 8), { key: 'brass', color: 0xf2b134 }, { outline: 0.3 }, [0, 0, 0.02], [0, 0, 0], S.needle);
  S.beam = new THREE.Group(); S.beam.position.set(0, h, 0); S.root.add(S.beam);
  add(new THREE.BoxGeometry(span * 2 + 0.22, 0.1, 0.13), brass, { outline: 0.9 }, [0, 0, 0], [0, 0, 0], S.beam);
  add(new THREE.SphereGeometry(0.13, 16, 12), brass, { outline: 0.8 }, [0, 0.03, 0], [0, 0, 0], S.beam);
  S.pans = [-1, 1].map((s) => {
    const g = new THREE.Group(); S.root.add(g);
    const rodGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 6); rodGeo.translate(0, 0.5, 0);
    const rods = [0, 1, 2].map((k) => add(rodGeo, { key: 'rod', color: 0x3b3558 }, { outline: 0.35, cast: false }, [Math.cos(k / 3 * TAU) * 0.3, 0.04, Math.sin(k / 3 * TAU) * 0.3], [0, 0, 0], g));
    add(new THREE.CylinderGeometry(0.46, 0.36, 0.08, 36), brass, { outline: 0.9 }, [0, 0, 0], [0, 0, 0], g);
    return { g, rods, side: s };
  });
  // the flag on a spring from the top
  S.flag = new THREE.Group(); S.flag.position.set(0, h + 0.12, -0.02); S.root.add(S.flag);
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 6), { key: 'rod', color: 0x3b3558 }, { outline: 0.4 }, [0, 0.37, 0], [0, 0, 0], S.flag);
  const fg = new THREE.PlaneGeometry(0.62, 0.42, 6, 2); fg.translate(0.32, 0.53, 0);
  S.flagCloth = add(fg, { key: 'flagcloth', color: 0x10b981, side: THREE.DoubleSide, rim: 0.4 }, { outline: 0.5, cast: false }, [0, 0, 0], [0, 0, 0], S.flag);
  S.span = span; S.h = h;
  return S;
}

/** An output block: a little 3x3 tile block (a tensor). ours = emerald / cream, ref = orange / cream. */
export function buildBlock(THREE, add, parent, { ref = false, s = 0.34 } = {}) {
  const B = { root: new THREE.Group() }; parent.add(B.root);
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? (ref ? '#f59e4b' : '#10b981') : '#fff4dc'; g.fillRect(i * 85, j * 85, 86, 86); }
    g.strokeStyle = '#1a1530'; g.lineWidth = 6; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(k * 85, 0); g.lineTo(k * 85, 256); g.moveTo(0, k * 85); g.lineTo(256, k * 85); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  })();
  B.m = add(new THREE.BoxGeometry(s, s, s), { color: 0xffffff, map: tex, rim: 0.5, spec: 0.1 }, { outline: 0.6 }, [0, s / 2, 0], [0, 0, 0], B.root);
  return B;
}

/** Torchy: the PyTorch reference as a stout torch: a turned wooden handle, a brass cup with a face, a big two-tone flame
 *  (a pun, not the PyTorch logo). Faces +z. */
export function buildTorch(THREE, add, parent) {
  const B = { root: new THREE.Group() }; parent.add(B.root);
  B.faces = faceSet(THREE, { calm: { eyes: 'dot', mouth: 'smile' }, squint: { eyes: 'squint', mouth: 'flat' }, happy: { eyes: 'happy', mouth: 'open' }, wide: { eyes: 'wide', mouth: 'o' } },
    { w: 1024, h: 512, base: '#ffffff', cx: 256, cy: 250, s: 0.95, seed: 44, spacing: 0.8, mouthY: 52 });
  const wood = { key: 'torchwood', color: 0xc07a3a, hatchMode: 'u', rim: 0.5 };
  add(new THREE.CylinderGeometry(0.075, 0.1, 0.8, 16), wood, { outline: 0.8 }, [0, 0.4, 0], [0, 0, 0], B.root);
  for (const y of [0.18, 0.62]) add(new THREE.TorusGeometry(0.095, 0.03, 8, 20), { key: 'brassring', color: 0xf2b134, rim: 0.6 }, { outline: 0.5 }, [0, y, 0], [Math.PI / 2, 0, 0], B.root);
  const cupG = new THREE.CylinderGeometry(0.34, 0.2, 0.42, 36, 1, false);
  // face on the front of the cup: planar map from the front
  { const p = cupG.attributes.position, uv = cupG.attributes.uv, nr = cupG.attributes.normal; for (let i = 0; i < p.count; i++) { if (nr.getZ(i) > 0.05 && Math.abs(nr.getY(i)) < 0.9) uv.setXY(i, 0.25 + p.getX(i) / 1.4, 0.5 + p.getY(i) / 0.9); else uv.setXY(i, 0.75, 0.9); } }
  B.cup = add(cupG, [{ color: 0xffd36b, map: B.faces.calm[0], rim: 0.7, hatchMode: 'u' }, { key: 'cuptop', color: 0x3b3558 }, { key: 'cuptop', color: 0x3b3558 }], { outline: 1.05 }, [0, 1.0, 0], [0, 0, 0], B.root);
  const fl = new THREE.Shape(); fl.moveTo(-0.26, 0); fl.bezierCurveTo(-0.32, 0.26, -0.06, 0.34, 0.02, 0.8); fl.bezierCurveTo(0.12, 0.44, 0.36, 0.32, 0.26, 0.0); fl.closePath();
  const flg = new THREE.ExtrudeGeometry(fl, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 }); flg.translate(0, 0, -0.07);
  B.flame = new THREE.Group(); B.flame.position.set(0, 1.2, 0); B.root.add(B.flame);
  add(flg, { key: 'flame', color: 0xff7a2e, glow: 0.2, rim: 0.5 }, { outline: 0.85 }, [0, 0, 0], [0, 0, 0], B.flame);
  const fl2 = new THREE.Shape(); fl2.moveTo(-0.12, 0); fl2.bezierCurveTo(-0.14, 0.16, 0.0, 0.2, 0.03, 0.44); fl2.bezierCurveTo(0.08, 0.24, 0.18, 0.14, 0.12, 0.0); fl2.closePath();
  add(new THREE.ExtrudeGeometry(fl2, { depth: 0.2, bevelEnabled: false }).translate(0, 0, -0.1), { key: 'flamecore', color: 0xffd84a, glow: 0.3 }, { outline: 0.4 }, [0.01, 0.03, 0.02], [0, 0, 0], B.flame);
  return B;
}

/** Dash: the one-shot workflow's kernel, a violet paper dart (points +x). */
export function buildDash(THREE, add, parent) {
  const D = { root: new THREE.Group() }; parent.add(D.root);
  D.body = new THREE.Group(); D.root.add(D.body);
  const g = new THREE.BufferGeometry();
  const P = [[0.62, 0, 0], [-0.5, 0.03, 0.36], [-0.4, -0.04, 0], [0.62, 0, 0], [-0.4, -0.04, 0], [-0.5, 0.03, -0.36], [0.62, 0, 0], [-0.4, -0.04, 0], [-0.46, -0.26, 0]];
  g.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3)); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(P.length * 2).fill(0.5), 2));
  D.dart = add(g, { color: 0xb9a8ec, side: THREE.DoubleSide, rim: 0.5 }, { outline: 0.8 }, [0, 0, 0], [0, 0, 0], D.body);
  // two googly eyes on the back (it stays stuck, eyes rolling)
  D.eyes = [-1, 1].map((s) => {
    const e = new THREE.Group(); e.position.set(-0.3, 0.1, s * 0.1); D.body.add(e);
    add(new THREE.SphereGeometry(0.085, 14, 10), { key: 'eyewhite', color: 0xfff8ea, rim: 0.4 }, { outline: 0.5, cast: false }, [0, 0, 0], [0, 0, 0], e);
    const pu = add(new THREE.SphereGeometry(0.04, 10, 8), { key: 'pupil', color: 0x1a1530 }, { outline: 0.2, cast: false }, [0.05, 0.03, s * 0.05], [0, 0, 0], e);
    return { e, pu };
  });
  D.body.scale.setScalar(1.45);
  return D;
}

/** The operator card Tok takes off the stack: a matmul pictogram (grid x grid) in ink on cream. Faces +z; it becomes
 *  Kern's racing number plate, so the win belongs to this one operator. */
export function buildOpCard(THREE, add, parent) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384; const g = c.getContext('2d');
  g.fillStyle = '#fff8ea'; g.fillRect(0, 0, 512, 384);
  g.strokeStyle = '#1a1530'; g.lineWidth = 12; g.strokeRect(10, 10, 492, 364);
  const grid = (x0, y0, n, s) => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? '#1a1530' : '#10b981'; g.fillRect(x0 + i * s, y0 + j * s, s - 6, s - 6); } g.strokeStyle = '#1a1530'; g.lineWidth = 8; g.strokeRect(x0 - 4, y0 - 4, n * s + 2, n * s + 2); };
  grid(44, 104, 3, 56); grid(300, 104, 3, 56);
  g.strokeStyle = '#1a1530'; g.lineWidth = 22; g.lineCap = 'round'; g.beginPath(); g.moveTo(232, 168); g.lineTo(280, 216); g.moveTo(280, 168); g.lineTo(232, 216); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  const C = { root: new THREE.Group() }; parent.add(C.root);
  const e = { key: 'cardedge', color: 0xfff8ea };
  C.m = add(new THREE.BoxGeometry(0.52, 0.4, 0.016), [e, e, e, e, { color: 0xffffff, map: t, rim: 0.3, hatch: 0.3, spec: 0 }, e], { outline: 0.6, cast: false }, [0, 0, 0], [0, 0, 0], C.root);
  return C;
}

/** The compile error slip: points at the bad token (the crooked ':' circled in coral, a coral caret under it). */
export function buildSlip(THREE, add, parent) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d');
  g.fillStyle = '#fff8ea'; g.fillRect(0, 0, 256, 192);
  g.fillStyle = '#1a1530'; g.save(); g.translate(128, 84); g.rotate(0.5); g.beginPath(); g.arc(0, -26, 15, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(0, 26, 15, 0, Math.PI * 2); g.fill(); g.restore();
  g.strokeStyle = '#ef4b5f'; g.lineWidth = 12; g.beginPath(); g.ellipse(128, 84, 58, 62, 0.2, 0, Math.PI * 2); g.stroke();
  g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 16; g.beginPath(); g.moveTo(92, 176); g.lineTo(128, 150); g.lineTo(164, 176); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  const S = { root: new THREE.Group() }; parent.add(S.root);
  S.m = add(new THREE.PlaneGeometry(0.46, 0.35), { color: 0xffffff, map: t, side: THREE.DoubleSide, rim: 0.3, hatch: 0.4, spec: 0 }, { outline: 0.6, cast: false }, [0, 0, 0], [0, 0, 0], S.root);
  return S;
}

/** Tok's mitt for the close-up press (a stand-in: the real arm can't reach that far into the insert). */
export function buildMitt(THREE, add, parent, { col = 0xfff4dc } = {}) {
  const M = { root: new THREE.Group() }; parent.add(M.root);
  M.hand = add(new THREE.SphereGeometry(0.11, 18, 14), { key: 'tok-skin', color: col, rim: 0.6, spec: 0 }, { outline: 0.9 }, [0, 0, 0], [0, 0, 0], M.root);
  add(new THREE.CapsuleGeometry(0.065, 0.9, 4, 10), { key: 'tok-skin', color: col, rim: 0.6, spec: 0 }, { outline: 0.9 }, [0, 0.55, 0], [0, 0, 0], M.root);
  return M;
}

/** An extruded check mark (the per-verify / final pass mark), faces +z. */
export function buildCheck(THREE, add, parent, { col = 0x10b981 } = {}) {
  const s = new THREE.Shape(); s.moveTo(-0.3, 0.02); s.lineTo(-0.17, 0.14); s.lineTo(-0.06, 0.02); s.lineTo(0.24, 0.36); s.lineTo(0.36, 0.24); s.lineTo(-0.06, -0.22); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  const C = { root: new THREE.Group() }; parent.add(C.root);
  C.m = add(geo, { color: col, rim: 0.6 }, { outline: 0.7, cast: false }, [0, 0, 0], [0, 0, 0], C.root);
  return C;
}
