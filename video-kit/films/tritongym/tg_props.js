// tg_props.js - the gym's standardised equipment (TritonGym gives every workflow the same tools):
//   compile gate (a portcullis that CLANGs shut on a build error), the verify weigh-in (a balance scale:
//   the kernel's result against the PyTorch reference kettlebell, needle inside the 0.01 window), the
//   profile race (lanes over the GPU die, start blocks, finish tape, the timing clock).
import { faceSet, INK, TAU } from './tg_paint.js';

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
/** Two-lane compile gate straddling the track: posts, a lintel with a grumpy face, one portcullis per lane, a lamp. */
export function buildGate2(THREE, add, parent, { span = 2.7, h = 2.0, lanes = [-0.55, 0.55] } = {}) {
  const G = { root: new THREE.Group() }; parent.add(G.root);
  const post = { key: 'gatepost', color: 0x7d86b8, hatchDir: [0, 1, 0], rim: 0.5 };
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.38, h, 0.38), post, { outline: 1 }, [0, h / 2, s * (span / 2 + 0.19)], [0, 0, 0], G.root);
    add(new THREE.BoxGeometry(0.5, 0.14, 0.5), { key: 'gatecap', color: 0x5b6396 }, { outline: 0.8 }, [0, h + 0.07, s * (span / 2 + 0.19)], [0, 0, 0], G.root);
  }
  G.faces = faceSet(THREE, { grump: { eyes: 'determined', mouth: 'flat' }, angry: { eyes: 'squint', mouth: 'teeth' }, ok: { eyes: 'happy', mouth: 'smile' }, doze: { eyes: 'sleep', mouth: 'flat' } },
    { w: 1024, h: 256, base: '#ffffff', cx: 512, cy: 110, s: 0.9, seed: 21, spacing: 1.5, mouthY: 56 });
  const LW = span + 0.9, LH = 0.5;
  const lintelGeo = new THREE.BoxGeometry(0.46, LH, LW);
  { const uv = lintelGeo.attributes.uv, pos = lintelGeo.attributes.position, nor = lintelGeo.attributes.normal;
    for (let i = 0; i < pos.count; i++) { const f = Math.abs(nor.getX(i)) > 0.5; if (f) uv.setXY(i, 0.5 + pos.getZ(i) / LW * Math.sign(nor.getX(i)), 0.5 + pos.getY(i) / LH * 0.92); else uv.setXY(i, 0.02, 0.98); } }
  G.lintel = add(lintelGeo, { color: 0x9aa2cf, map: G.faces.grump[0], hatchDir: [0, 1, 0], rim: 0.6 }, { outline: 1.1 }, [0, h + 0.4, 0], [0, 0, 0], G.root);
  G.lamp = add(new THREE.SphereGeometry(0.17, 20, 14), { color: 0xffffff, glow: 0.35, rim: 0.6 }, { outline: 0.7 }, [0, h + 0.82, 0], [0, 0, 0], G.root);
  G.grates = lanes.map((z) => {
    const g = new THREE.Group(); g.position.z = z; G.root.add(g);
    const bar = new THREE.CylinderGeometry(0.045, 0.045, h - 0.05, 10);
    const tip = new THREE.ConeGeometry(0.07, 0.18, 10); tip.rotateX(Math.PI);
    for (let k = 0; k < 4; k++) { const zz = -0.38 + k * 0.253; add(bar, { key: 'iron', color: IRON, hatchMode: 'u' }, { outline: 0.6 }, [0, h / 2, zz], [0, 0, 0], g); add(tip, { key: 'iron', color: IRON }, { outline: 0.5 }, [0, -0.06, zz], [0, 0, 0], g); }
    for (const y of [0.42, 1.2]) add(new THREE.BoxGeometry(0.07, 0.07, 0.9), { key: 'iron', color: IRON }, { outline: 0.6 }, [0, y, 0], [0, 0, 0], g);
    return g;
  });
  G.h = h;
  return G;
}

/** The finish arch: two pylons, a banner, and the timing stopwatch on top (two hands: coral = oracle, emerald = ours). */
export function buildFinish(THREE, add, parent, { span = 2.9, h = 2.3, bannerTex = null } = {}) {
  const Fn = { root: new THREE.Group() }; parent.add(Fn.root);
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.16, 0.2, h, 16), { key: 'pylon', color: 0xfff0d0, hatchMode: 'u', rim: 0.6 }, { outline: 1 }, [0, h / 2, s * span / 2], [0, 0, 0], Fn.root);
    for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.205, 0.205, 0.12, 16), { key: 'pylonband', color: 0x059669 }, { outline: 0.5, cast: false }, [0, 0.3 + k * 0.55, s * span / 2], [0, 0, 0], Fn.root);
  }
  // banner: a cloth strip between the pylons (texture carries the hand-lettered name)
  const bw = span + 0.1, bh = 0.62;
  const bgeo = new THREE.PlaneGeometry(bw, bh, 24, 4); bgeo.rotateY(Math.PI / 2);
  Fn.bannerBase = bgeo.attributes.position.array.slice();
  Fn.banner = add(bgeo, { color: 0xffffff, map: bannerTex, side: THREE.DoubleSide, rim: 0.4, hatch: 0.6 }, { outline: 0.9 }, [0, h - 0.42, 0], [0, 0, 0], Fn.root);
  add(new THREE.CylinderGeometry(0.035, 0.035, bw + 0.3, 8).rotateX(Math.PI / 2), { key: 'iron', color: IRON }, { outline: 0.5 }, [0, h - 0.08, 0], [0, 0, 0], Fn.root);
  // stopwatch on top, facing outward (+x of this frame is along the track; dial faces +z... set by caller)
  const face = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#fff6e0'; g.fillRect(0, 0, 512, 512); g.translate(256, 256);
    for (let k = 0; k < 60; k++) { const a = k / 60 * TAU; g.strokeStyle = '#1a1530'; g.lineWidth = k % 5 ? 5 : 12; g.beginPath(); g.moveTo(Math.cos(a) * 236, Math.sin(a) * 236); g.lineTo(Math.cos(a) * (k % 5 ? 208 : 178), Math.sin(a) * (k % 5 ? 208 : 178)); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  })();
  Fn.watch = new THREE.Group(); Fn.watch.position.set(0, h + 0.78, 0); Fn.root.add(Fn.watch);
  const faceGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.22, 48); faceGeo.rotateZ(Math.PI / 2);   // axis along x -> dial faces +x
  add(faceGeo, [{ key: 'brass', color: BRASS, hatchMode: 'u', rim: 0.8 }, { color: 0xffffff, map: face, hatch: 0.3 }, { color: 0xffffff, map: face, hatch: 0.3 }], { outline: 1 }, [0, 0, 0], [0, 0, 0], Fn.watch);
  add(new THREE.TorusGeometry(0.72, 0.06, 10, 48).rotateY(Math.PI / 2), { key: 'brass', color: BRASS, hatchMode: 'u' }, { outline: 0.7 }, [0.11, 0, 0], [0, 0, 0], Fn.watch);
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 14), { key: 'brass', color: BRASS }, { outline: 0.7 }, [0, 0.8, 0], [0, 0, 0], Fn.watch);
  Fn.btn = add(new THREE.CylinderGeometry(0.15, 0.15, 0.09, 18), { key: 'coralbtn', color: CORAL }, { outline: 0.7 }, [0, 0.93, 0], [0, 0, 0], Fn.watch);
  Fn.hands = [CORAL, 0x10b981].map((col, k) => {
    const g = new THREE.Group(); g.position.x = 0.13 + k * 0.03; Fn.watch.add(g);
    add(new THREE.BoxGeometry(0.03, k ? 0.6 : 0.52, 0.07), { color: col, rim: 0.4 }, { outline: 0.4, cast: false }, [0, k ? 0.26 : 0.22, 0], [0, 0, 0], g);
    return g;
  });
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12).rotateZ(Math.PI / 2), { key: 'brass', color: BRASS }, { outline: 0.4 }, [0.18, 0, 0], [0, 0, 0], Fn.watch);
  // struts from the banner bar to the watch
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), { key: 'iron', color: IRON }, { outline: 0.4 }, [0, h + 0.25, s * 0.35], [s * 0.5, 0, 0], Fn.root);
  return Fn;
}

/** The bench (the LLM's desk) and the stack of 164 operator sheets in true proportions (139 / 13 / 12). */
export function buildBench(THREE, add, parent) {
  const B = { root: new THREE.Group() }; parent.add(B.root);
  const wood = { key: 'benchwood', color: 0xd99a55, hatchDir: [0, 1, 0], rim: 0.5 };
  add(new THREE.BoxGeometry(1.5, 0.12, 0.8), wood, { outline: 1 }, [0, 0.72, 0], [0, 0, 0], B.root);
  for (const [x, z] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) add(new THREE.BoxGeometry(0.1, 0.72, 0.1), wood, { outline: 0.7 }, [x, 0.36, z], [0, 0, 0], B.root);
  // paper stack beside the bench: bands of thin sheets
  const edge = (col, lines, crinkle) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = col; g.fillRect(0, 0, 256, 512);
    for (let k = 0; k < lines; k++) { const y = (k + 0.5) / lines * 512; g.strokeStyle = 'rgba(40,30,50,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + (crinkle ? Math.sin(x * 0.3 + k) * 3 : 0)); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  };
  B.stack = new THREE.Group(); B.stack.position.set(-1.25, 0, 0.1); B.root.add(B.stack);
  const bands = [[1.39, 0xfff4dc, 46, false], [0.13, 0xef4b5f, 6, true], [0.12, 0x8e7cc3, 6, false]];
  let y = 0;
  B.bands = bands.map(([hh, col, lines, cr], i) => {
    const m = add(new THREE.BoxGeometry(0.72, hh, 0.56), { color: 0xffffff, map: edge('#' + col.toString(16).padStart(6, '0'), lines, cr), hatchDir: [0, 1, 0], rim: 0.5, seed: 70 + i }, { outline: 0.8 }, [0, y + hh / 2, 0], [0, (i - 1) * 0.04, 0], B.stack);
    y += hh; return m;
  });
  B.stackH = y;
  B.sheet = add(new THREE.BoxGeometry(0.62, 0.012, 0.46), { key: 'sheet', color: 0xfff8ea, rim: 0.3 }, { outline: 0.5 }, [0.1, 0.79, 0], [0, 0.1, 0], B.root);
  return B;
}

/** Torchy: the PyTorch reference, an orange kettlebell with a little flame and a small face. */
export function buildTorchy(THREE, add, parent) {
  const B = { root: new THREE.Group() }; parent.add(B.root);
  B.faces = faceSet(THREE, { calm: { eyes: 'dot', mouth: null }, squint: { eyes: 'squint', mouth: null }, happy: { eyes: 'happy', mouth: 'smile' }, wide: { eyes: 'wide', mouth: 'o' } },
    { w: 1024, h: 512, base: '#ffffff', s: 1.0, seed: 44, spacing: 0.8, mouthY: 40 });
  B.bell = add(new THREE.SphereGeometry(0.3, 32, 22), { color: 0xf07b2c, map: B.faces.calm[0], rim: 0.7, spec: 0.3 }, { outline: 1 }, [0, 0.27, 0], [0, 0, 0], B.root);
  B.bell.scale.set(1, 0.9, 1);
  add(new THREE.TorusGeometry(0.17, 0.05, 10, 28, Math.PI), { key: 'bellhandle', color: 0xf07b2c }, { outline: 0.8 }, [0, 0.5, 0], [0, 0, 0], B.root);
  const fl = new THREE.Shape(); fl.moveTo(-0.08, 0); fl.bezierCurveTo(0.14, 0.02, 0.12, 0.2, 0.0, 0.36); fl.bezierCurveTo(0.0, 0.2, -0.16, 0.16, -0.08, 0.0);
  const flg = new THREE.ExtrudeGeometry(fl, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }); flg.translate(0, 0, -0.03);
  B.flame = new THREE.Group(); B.flame.position.set(0, 0.64, 0); B.root.add(B.flame);
  add(flg, { key: 'flame', color: 0xffc23d, glow: 0.3, rim: 0.5 }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], B.flame);
  return B;
}

/** Dash: the one-shot workflow's kernel, a violet paper dart that gets one throw. */
export function buildDash(THREE, add, parent) {
  const D = { root: new THREE.Group() }; parent.add(D.root);
  const g = new THREE.BufferGeometry();
  const P = [[0.5, 0, 0], [-0.4, 0.02, 0.28], [-0.32, -0.03, 0], [0.5, 0, 0], [-0.32, -0.03, 0], [-0.4, 0.02, -0.28], [0.5, 0, 0], [-0.32, -0.03, 0], [-0.36, -0.2, 0]];
  g.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3)); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(P.length * 2).fill(0.5), 2));
  D.dart = add(g, { color: 0xb9a8ec, side: THREE.DoubleSide, rim: 0.5 }, { outline: 0.7 }, [0, 0.35, 0], [0, 0, 0], D.root);
  return D;
}
