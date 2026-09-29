// q_set.js - the lab set: a neutral-atom chip plate on an optical table, the objective lens over the entanglement
// zone, optics on posts, cables, and a real back wall (shelves, window, lamp) in depth. Everything goes through
// runtime/npr (cel ramp, burin hatching, halftone, ink); the few textures are painted in Canvas2D once (cheap on
// the CPU renderer; p5.brush pigment mixing turns warm-on-violet muddy anyway).
import * as THREE from 'three';
import { rgb } from './npr/npr.js';

const TAU = Math.PI * 2;

export const COL = {
  paper: '#f4ebd6', ink: '#1a1530',
  violet: 0x7c3aed, violetDeep: 0x4b2a9e, violetPale: 0xb9a3f0, amber: 0xf2a922, amberDeep: 0xd9861a,
  cream: 0xfff3dc, atom: 0xfff1cf, brass: 0xe6ad42, steel: 0xb8c0d8, dark: 0x2b2447, teal: 0x2f9d97,
  table: 0x564a9e, tableSide: 0x33296e, plate: 0xf6ecd4, plateSide: 0x5b3fb0, red: 0xe5463b, pink: 0xff3d7f,
  wall: 0xc4b3f0, wallDark: 0x6b4fc9, trim: 0xf4e6c8, wood: 0xc98a52,
};

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); paint(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; t.needsUpdate = true;
  t.userData.canvas = c;
  return t;
}
function hsh(...n) { let x = Math.sin(n.reduce((s, v, i) => s + v * (12.9898 + i * 78.233), 0.5)) * 43758.5453; return x - Math.floor(x); }

/**
 * buildSet(npr, scene, L): L = layout { plate: {x0,x1,z0,z1,h}, zones: [{x0,x1,z0,z1,color}], sites: [[x,z,r,kind]],
 * objective: [x,y,z], tableY }. Returns handles.
 */
export function buildSet(npr, scene, L) {
  const add = (geo, mo, ao = {}, pos = [0, 0, 0], rot = [0, 0, 0], parent = scene) => {
    const m = npr.add(new THREE.Mesh(geo, Array.isArray(mo) ? mo.map((o) => npr.surface(o)) : npr.surface(mo)), ao);
    m.position.set(...pos); m.rotation.set(...rot); parent.add(m); return m;
  };
  const cyl = (r0, r1, h, n = 40, open = false) => new THREE.CylinderGeometry(r0, r1, h, n, 1, open);
  const S = {};
  const P = L.plate, TY = L.tableY;

  // ---------------- optical table: dark indigo top with a painted hole grid ----------------
  const tableTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(160,150,230,${0.10 + 0.08 * hsh(k, 1)})`; g.beginPath(); g.ellipse(hsh(k, 2) * w, hsh(k, 3) * h, 60 + 120 * hsh(k, 4), 40 + 80 * hsh(k, 5), hsh(k, 6) * 3, 0, TAU); g.fill(); }
    g.fillStyle = '#1c1838';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.beginPath(); g.ellipse(64 + i * 128, 64 + j * 128, 13, 13, 0, 0, TAU); g.fill(); }
  });
  tableTex.wrapS = tableTex.wrapT = THREE.RepeatWrapping; tableTex.repeat.set(14, 9);
  const tSide = { color: COL.tableSide, hatchDir: [0, 1, 0] };
  S.table = add(new THREE.BoxGeometry(44, 0.5, 26), [tSide, tSide, { color: COL.table, map: tableTex, hatchDir: [1, 0, 0.3], noiseScale: 0.5, spec: 0.15, halftone: 0.6 }, tSide, tSide, tSide],
    { outline: 1.0, cast: false }, [0, TY - 0.25, -2]);

  // ---------------- the chip plate (processor): cream top with painted zones and trap sites ----------------
  const pw = P.x1 - P.x0, pd = P.z1 - P.z0;
  const plateTex = canvasTex(3072, Math.round(3072 * pd / pw), (g, w, h) => {
    const X = (x) => (x - P.x0) / pw * w, Z = (z) => (z - P.z0) / pd * h, U = w / pw;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    // zone washes: two glazes each, ragged watercolour edges (a notebook, not a UI)
    for (const zn of L.zones) {
      for (let pass = 0; pass < 2; pass++) {
        g.fillStyle = zn.color; g.globalAlpha = pass ? 0.35 : 0.5;
        g.beginPath();
        const n = 64, cx = (X(zn.x0) + X(zn.x1)) / 2, cz = (Z(zn.z0) + Z(zn.z1)) / 2, rx = (X(zn.x1) - X(zn.x0)) / 2, rz = (Z(zn.z1) - Z(zn.z0)) / 2;
        for (let k = 0; k <= n; k++) {
          const a = k / n * TAU, c = Math.cos(a), s = Math.sin(a);
          const sq = 1 / Math.pow(Math.pow(Math.abs(c), 6) + Math.pow(Math.abs(s), 6), 1 / 6);   // squircle
          const j = 1 + 0.018 * Math.sin(a * 7 + pass * 2 + zn.x0) + 0.012 * Math.sin(a * 19 + pass);
          const px = cx + c * sq * rx * j * (1 - pass * 0.03), pz = cz + s * sq * rz * j * (1 - pass * 0.05);
          k ? g.lineTo(px, pz) : g.moveTo(px, pz);
        }
        g.fill();
      }
      g.globalAlpha = 1;
    }
    // trap sites: dashed ink rings (SLM), a small cross in the middle
    g.strokeStyle = '#2a2448'; g.lineCap = 'round';
    for (const [x, z, r] of L.sites) {
      g.lineWidth = U * 0.022;
      const n = 12;
      for (let i = 0; i < n; i++) { const a0 = i / n * TAU + 0.2, a1 = a0 + TAU / n * 0.55; g.beginPath(); g.arc(X(x), Z(z), r * U, a0, a1); g.stroke(); }
    }
    // engraved border + ruler ticks along the front edge (a hand-ruled instrument plate)
    g.lineWidth = U * 0.02; g.strokeStyle = '#3a2f66';
    g.strokeRect(U * 0.14, U * 0.14, w - U * 0.28, h - U * 0.28);
    for (let k = 0; k < 120; k++) { const x = U * 0.3 + (w - U * 0.6) * k / 119, l = (k % 5 ? 0.09 : 0.18) * U; g.beginPath(); g.moveTo(x, h - U * 0.14); g.lineTo(x, h - U * 0.14 - l); g.stroke(); }
  });
  const pSide = { color: COL.plateSide, hatchDir: [0, 1, 0], shadeColor: 0x2a1860, shadeMix: 0.35 };
  S.plate = add(new THREE.BoxGeometry(pw, P.h, pd), [pSide, pSide, { color: COL.plate, map: plateTex, hatchDir: [1, 0, 0.2], hatchDir2: [0.2, 0, -1], noiseScale: 0.5, spec: 0.2, toneBias: 0.06, halftone: 0.5 }, pSide, pSide, pSide],
    { outline: 1.15, cast: false }, [(P.x0 + P.x1) / 2, -P.h / 2, (P.z0 + P.z1) / 2]);
  S.plateTopId = S.plate.material[2].userData.nprId;
  // brass rim + corner screws
  const rim = { color: COL.brass, hatchMode: 'u', spec: 1, rim: 0.6 };
  const rw = 0.08;
  add(new THREE.BoxGeometry(pw + rw * 2, 0.07, rw), rim, { outline: 0.6, cast: false }, [(P.x0 + P.x1) / 2, 0.02, P.z1 + rw / 2]);
  add(new THREE.BoxGeometry(pw + rw * 2, 0.07, rw), rim, { outline: 0.6, cast: false }, [(P.x0 + P.x1) / 2, 0.02, P.z0 - rw / 2]);
  add(new THREE.BoxGeometry(rw, 0.07, pd), rim, { outline: 0.6, cast: false }, [P.x0 - rw / 2, 0.02, (P.z0 + P.z1) / 2]);
  add(new THREE.BoxGeometry(rw, 0.07, pd), rim, { outline: 0.6, cast: false }, [P.x1 + rw / 2, 0.02, (P.z0 + P.z1) / 2]);
  for (const [x, z] of [[P.x0 + 0.3, P.z0 + 0.3], [P.x1 - 0.3, P.z0 + 0.3], [P.x0 + 0.3, P.z1 - 0.3], [P.x1 - 0.3, P.z1 - 0.3]]) add(cyl(0.1, 0.1, 0.04, 24), { color: COL.brass, hatchMode: 'u' }, { outline: 0.5, cast: false }, [x, 0.02, z]);
  // pedestal legs under the plate (it stands on the table)
  for (const [x, z] of [[P.x0 + 0.6, P.z0 + 0.5], [P.x1 - 0.6, P.z0 + 0.5], [P.x0 + 0.6, P.z1 - 0.5], [P.x1 - 0.6, P.z1 - 0.5]]) add(cyl(0.16, 0.2, -P.h - TY, 24), { color: COL.steel, hatchMode: 'u' }, { outline: 0.7, cast: false }, [x, (TY - P.h) / 2, z]);

  // ---------------- the objective lens over the entanglement zone (the Rydberg + tweezer optics) ----------------
  if (L.objective) {
    const [ox, oy, oz] = L.objective;
    const dk = { color: 0x2f2a55, hatchMode: 'u', spec: 1, rim: 0.7 };
    S.obj = new THREE.Group(); S.obj.position.set(ox, oy, oz); scene.add(S.obj);
    add(cyl(0.72, 0.56, 1.1, 48), dk, { outline: 1 }, [0, 0.55, 0], [0, 0, 0], S.obj);
    add(cyl(0.8, 0.8, 0.14, 48), { color: COL.brass, hatchMode: 'u', spec: 1 }, { outline: 0.8 }, [0, 0.12, 0], [0, 0, 0], S.obj);
    add(cyl(0.5, 0.34, 0.36, 48), dk, { outline: 0.8 }, [0, -0.16, 0], [0, 0, 0], S.obj);
    S.lensTip = add(cyl(0.26, 0.26, 0.04, 32), { color: 0xffd6e6, glow: 0.35, hatch: 0 }, { outline: 0.5, cast: false }, [0, -0.35, 0], [0, 0, 0], S.obj);
    add(cyl(0.12, 0.12, 6, 16), { color: 0x6e6a8a, hatchMode: 'u' }, { outline: 0.7, cast: false }, [0, 4.1, 0], [0, 0, 0], S.obj);
    add(new THREE.TorusGeometry(0.76, 0.05, 12, 48), { color: COL.brass, hatchMode: 'u' }, { outline: 0.5 }, [0, 0.9, 0], [Math.PI / 2, 0, 0], S.obj);
    S.OBJ_TIP = [ox, oy - 0.37, oz];
  }

  // ---------------- optics on posts around the plate (depth + "this is a lab") ----------------
  const post = (x, z, h, top) => {
    add(cyl(0.07, 0.07, h, 20), { color: COL.steel, hatchMode: 'u' }, { outline: 0.8 }, [x, TY + h / 2, z]);
    add(cyl(0.2, 0.2, 0.06, 28), { color: 0x4a4a6e }, { outline: 0.6 }, [x, TY + 0.03, z]);
    top(TY + h);
  };
  for (const p of L.posts || []) {
    const [x, z, h, kind, ry] = p;
    post(x, z, h, (y) => {
      if (kind === 'mirror') { const g = new THREE.Group(); g.position.set(x, y + 0.25, z); g.rotation.y = ry; scene.add(g);
        add(cyl(0.3, 0.3, 0.1, 36), { color: 0x2f2a55, hatchMode: 'u' }, { outline: 0.8 }, [0, 0, 0], [Math.PI / 2, 0, 0], g);
        add(new THREE.CircleGeometry(0.24, 32), { color: 0xcfe0ff, spec: 1, hatch: 0.3, toneBias: 0.2 }, { outline: 0.4 }, [0, 0, 0.052], [0, 0, 0], g); }
      else if (kind === 'lens') add(new THREE.TorusGeometry(0.3, 0.07, 14, 40), { color: COL.dark, hatchMode: 'u' }, { outline: 0.8 }, [x, y + 0.3, z], [0, ry, 0]);
      else if (kind === 'box') add(new THREE.BoxGeometry(0.5, 0.42, 0.42), { color: COL.amber }, { outline: 0.9 }, [x, y + 0.2, z], [0, ry, 0]);
    });
  }
  // laser head (a boxy source with a red-knob) on the table, back left
  if (L.laser) {
    const [x, z, ry] = L.laser;
    const g = new THREE.Group(); g.position.set(x, TY, z); g.rotation.y = ry; scene.add(g);
    add(new THREE.BoxGeometry(2.2, 0.8, 0.9), { color: COL.cream, hatchDir: [0, 1, 0] }, { outline: 1 }, [0, 0.4, 0], [0, 0, 0], g);
    add(new THREE.BoxGeometry(2.24, 0.12, 0.94), { color: COL.violet }, { outline: 0.7 }, [0, 0.7, 0], [0, 0, 0], g);
    add(cyl(0.12, 0.12, 0.2, 20), { color: COL.red }, { outline: 0.6 }, [0.7, 0.55, 0.48], [Math.PI / 2, 0, 0], g);
    add(cyl(0.1, 0.1, 0.2, 20), { color: COL.amber }, { outline: 0.6 }, [0.35, 0.55, 0.48], [Math.PI / 2, 0, 0], g);
    add(cyl(0.16, 0.16, 0.3, 24), { color: COL.dark, hatchMode: 'u' }, { outline: 0.7 }, [1.2, 0.4, 0], [0, 0, Math.PI / 2], g);
  }
  // cables snaking over the table
  for (const c of L.cables || []) {
    const curve = new THREE.CatmullRomCurve3(c.pts.map((q) => new THREE.Vector3(q[0], TY + 0.06, q[1])));
    add(new THREE.TubeGeometry(curve, 140, 0.07, 10), { color: c.color, hatchMode: 'u', hatchScale: 30 }, { outline: 0.8, cast: false }, [0, 0, 0]);
  }

  // ---------------- back wall in depth: wainscot, shelves with glassware, a round window, a lamp ----------------
  if (L.wall) {
    const W = L.wall;   // { z, x0, x1, y1 }
    const wallTex = canvasTex(2048, 1024, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      // soft painted light pools (the lamp) and plaster blotches
      for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(90,60,170,${0.05 + 0.05 * hsh(k, 7)})`; g.beginPath(); g.ellipse(hsh(k, 8) * w, hsh(k, 9) * h, 80 + 200 * hsh(k, 10), 50 + 120 * hsh(k, 11), 0, 0, TAU); g.fill(); }
    });
    wallTex.wrapS = THREE.RepeatWrapping;
    const ww = W.x1 - W.x0, wh = W.y1 - TY;
    add(new THREE.BoxGeometry(ww, wh, 0.4), { color: COL.wall, map: wallTex, hatchDir: [1, 0.1, 0], hatch: 0.7, noiseScale: 0.3, spec: 0, halftone: 0.9 }, { outline: 1.0, cast: false }, [(W.x0 + W.x1) / 2, TY + wh / 2, W.z - 0.2]);
    // wainscot panel + chair rail (cream trim)
    add(new THREE.BoxGeometry(ww, 1.6, 0.2), { color: COL.wallDark, hatchDir: [0, 1, 0] }, { outline: 0.9, cast: false }, [(W.x0 + W.x1) / 2, TY + 0.8, W.z + 0.1]);
    add(new THREE.BoxGeometry(ww, 0.14, 0.3), { color: COL.trim, hatchDir: [0, 1, 0] }, { outline: 0.8, cast: false }, [(W.x0 + W.x1) / 2, TY + 1.62, W.z + 0.14]);
    // shelves with a few fat flasks (few, big, readable)
    for (const sh of W.shelves || []) {
      const [x, y, len] = sh;
      add(new THREE.BoxGeometry(len, 0.12, 0.7), { color: COL.wood, hatchDir: [0, 1, 0] }, { outline: 0.9 }, [x, y, W.z + 0.35]);
      for (const [bx, lathe, col] of sh[3] || []) {
        const prof = { flask: [[0.001, 0], [0.34, 0], [0.36, 0.08], [0.3, 0.3], [0.1, 0.5], [0.09, 0.78], [0.12, 0.82], [0.001, 0.82]],
          jar: [[0.001, 0], [0.26, 0], [0.28, 0.06], [0.28, 0.6], [0.2, 0.66], [0.2, 0.74], [0.001, 0.74]],
          bulb: [[0.001, 0], [0.12, 0], [0.12, 0.1], [0.3, 0.3], [0.3, 0.45], [0.1, 0.66], [0.07, 0.8], [0.001, 0.8]] }[lathe];
        add(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 32), { color: col, spec: 1, rim: 0.8, hatchMode: 'v' }, { outline: 0.8 }, [x + bx, y + 0.06, W.z + 0.35]);
      }
    }
    // round window (porthole) with a night-violet sky and a moon, a brass frame
    if (W.window) {
      const [x, y, r] = W.window;
      const skyTex = canvasTex(512, 512, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2c1f6e'); gr.addColorStop(1, '#8b67d8');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff3cf'; g.beginPath(); g.arc(w * 0.66, h * 0.34, w * 0.1, 0, TAU); g.fill();
        g.fillStyle = '#8b67d8'; g.beginPath(); g.arc(w * 0.62, h * 0.31, w * 0.085, 0, TAU); g.fill();
        g.fillStyle = '#fff3cf';
        for (let k = 0; k < 16; k++) { const sx = hsh(k, 21) * w, sy = hsh(k, 22) * h * 0.7, s = 3 + 4 * hsh(k, 23); g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr = i % 2 ? s * 0.35 : s; i ? g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr) : g.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } g.fill(); }
        g.fillStyle = '#5a3fb0'; g.beginPath(); g.moveTo(0, h * 0.85); for (let k = 0; k <= 16; k++) g.lineTo(k / 16 * w, h * (0.78 + 0.06 * Math.sin(k * 1.7))); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      });
      add(new THREE.CircleGeometry(r, 48), { color: 0xffffff, map: skyTex, flat: 0.9, hatch: 0, spec: 0, rim: 0, receive: false, halftone: 0 }, { outline: 0.0, cast: false }, [x, y, W.z + 0.02]);
      add(new THREE.TorusGeometry(r, 0.14, 16, 64), { color: COL.brass, hatchMode: 'u', spec: 1 }, { outline: 1 }, [x, y, W.z + 0.1]);
      add(new THREE.BoxGeometry(0.08, r * 2, 0.08), { color: COL.brass }, { outline: 0.6 }, [x, y, W.z + 0.1]);
      add(new THREE.BoxGeometry(r * 2, 0.08, 0.08), { color: COL.brass }, { outline: 0.6 }, [x, y, W.z + 0.1]);
    }
    // a hanging lamp (warm cone shade)
    if (W.lamp) {
      const [x, y] = W.lamp;
      add(cyl(0.02, 0.02, 3, 8), { color: COL.dark }, { outline: 0.4, cast: false }, [x, y + 1.9, W.z + 1.4]);
      S.lamp = add(cyl(0.18, 0.7, 0.6, 36, true), { color: COL.amber, hatchMode: 'v', side: THREE.DoubleSide, rim: 0.6 }, { outline: 0.9, cast: false }, [x, y + 0.3, W.z + 1.4]);
      S.LAMP = [x, y, W.z + 1.4];
    }
  }
  return S;
}

export { rgb };
