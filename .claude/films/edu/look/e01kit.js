// Pieces for the pilot's style frames (E01, SCRIPT.md section 5): sticky notes, a thermal ticket, the serving city of
// 320 thin towers (one expert each; a tower's floors are the layers), brass pins and red threads between rooftops,
// a pennant, and the foam-board pop-up book that turns the 58-tower street into the city.
import { hsh } from '/scene/lib.js';

// a yellow sticky note with a handwritten line; curls off its glue edge
export function stickyNote(THREE, text, font, o = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
  g.fillStyle = '#f6d556'; g.fillRect(0, 0, 512, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(120,80,0,0.16)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,90,20,${0.03 + hsh(i, 1) * 0.04})`; g.fillRect(hsh(i, 2) * 512, hsh(i, 3) * 512, 1.5, 1.5); }   // paper tooth
  g.fillStyle = '#23303e'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const L = text.split('\n'), size = o.size ?? (L.length > 2 ? 96 : 112);
  g.font = `400 ${size}px ${font}`;
  L.forEach((s, i) => { g.save(); g.translate(256 + (i % 2 ? 8 : -6), 256 + (i - (L.length - 1) / 2) * size * 1.08); g.rotate(-0.04 + i * 0.03); g.fillText(s, 0, 0); g.restore(); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  const s = o.w ?? 0.5, geo = new THREE.PlaneGeometry(s, s, 10, 10), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / s; if (y < -0.1) p.setZ(i, (y + 0.1) ** 2 * s * (o.curl ?? 0.5)); }   // the free (bottom) edge lifts
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide }));
  m.castShadow = m.receiveShadow = true; return m;
}

// the serving city: 320 thin towers (one room wide; floors = layers) in 40 blocks of 8 (one block = one 8-GPU server);
// 64 of them plain (the shared expert and stand-ins). Returns the grid points and the rooftop height.
export function needleCity(T, { cx = 0, cz = -2.0, pitch = 0.16, gap = 0.12, w = 0.07, h = 0.62, floors = 58, plain = 64, seed = 1 }) {
  const { THREE, scene } = T;
  const cols = 16, rows = 20, bx = 4, bz = 2, n = 320;
  const W = (cols - 1) * pitch + Math.floor((cols - 1) / bx) * gap, D = (rows - 1) * pitch + Math.floor((rows - 1) / bz) * gap;
  const pts = [];
  for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); pts.push([cx - W / 2 + c * pitch + Math.floor(c / bx) * gap, cz + D / 2 - r * pitch - Math.floor(r / bz) * gap]); }
  // facade: one room wide, a floor line per layer, a door per floor; plain towers get no doors
  const fac = (doors) => {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 1024; const g = cv.getContext('2d');
    g.fillStyle = '#ede8de'; g.fillRect(0, 0, 64, 1024);
    for (let f = 0; f < floors; f++) {
      const y = 1024 - (f + 1) * 1024 / floors;
      g.fillStyle = 'rgba(80,70,58,0.35)'; g.fillRect(0, y + 1024 / floors - 3, 64, 3);
      if (doors) { g.fillStyle = '#a79e90'; g.fillRect(22, y + 4, 20, 1024 / floors - 9); }
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const roof = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.9 });
  const mats = [fac(true), fac(false)].map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.9 }));
  const geo = new THREE.BoxGeometry(w, h, w); geo.translate(0, h / 2, 0);
  const plainSet = new Set(Array.from({ length: plain }, (_, i) => Math.floor(hsh(i, seed, 7) * n)));
  const meshes = [0, 1].map((k) => {
    const list = pts.map((p, i) => [p, i]).filter(([, i]) => (k === 1) === plainSet.has(i));
    const im = new THREE.InstancedMesh(geo, [mats[k], mats[k], roof, roof, mats[k], mats[k]], list.length);
    const m4 = new THREE.Matrix4();
    list.forEach(([[x, z]], j) => { m4.makeTranslation(x - cx, 0, z - cz); im.setMatrixAt(j, m4); });
    im.castShadow = im.receiveShadow = true; im.userData.list = list; return im;
  });
  const group = new THREE.Group(); meshes.forEach((m) => group.add(m)); scene.add(group); group.position.set(cx, 0.03, cz);   // instances are relative to the board centre
  // the foam board the city stands on
  const board = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.03, D + 0.5), new THREE.MeshPhysicalMaterial({ color: 0xf3ead9, roughness: 0.95 }));
  board.position.set(0, -0.015, 0); board.receiveShadow = true; group.add(board);
  return { group, pts, top: h, w, pitch, gap, cx, cz, W, D, plainSet };
}

// light trails along the streets between towers (the lamp-off long exposure); a seeded, illustrative traffic sample
export function trails(T, C, { count = 600, seed = 1, y = 0.004 }) {
  const { THREE } = T;
  const half = C.pitch / 2, geos = [];
  const lane = (x, z, k) => [x + half * (k ? 1 : -1), z + half * (k ? 1 : -1)];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(hsh(i, seed, 1) * 320), b = Math.floor(hsh(i, seed, 2) * 320);
    if (a === b) continue;
    const k = hsh(i, seed, 3) > 0.5, [ax, az] = lane(...C.pts[a], k), [bx, bz] = lane(...C.pts[b], k);
    const pts = [[ax, az], [ax, bz], [bx, bz]].map(([px, pz]) => new THREE.Vector3(px + (hsh(i, 4) - 0.5) * 0.05, y + hsh(i, 5) * 0.004, pz + (hsh(i, 6) - 0.5) * 0.05));
    const path = new THREE.CurvePath(); for (let j = 0; j < 2; j++) path.add(new THREE.LineCurve3(pts[j], pts[j + 1]));
    geos.push(new THREE.TubeGeometry(path, 40, 0.0011 + 0.0016 * hsh(i, seed, 9) ** 3, 3, false));
  }
  return geos;
}

// a cotton thread: a sagging tube between two rooftop pins; a fibre normal map so it reads as string, not wire
export function threadMaterial(THREE, color = 0xb02a22) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32; const g = cv.getContext('2d');
  g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, 256, 32);
  for (let x = -32; x < 256; x += 6) { g.strokeStyle = 'rgba(200,128,255,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 32, 32); g.stroke(); }
  const n = new THREE.CanvasTexture(cv); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(40, 1);
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, normalMap: n, normalScale: new THREE.Vector2(0.8, 0.8) });
}
export function threadGeo(THREE, a, b, r, sag = 0.1) {
  const d = a.distanceTo(b), pts = [];
  for (let k = 0; k <= 30; k++) { const u = k / 30, p = a.clone().lerp(b, u); p.y -= Math.sin(Math.PI * u) * d * sag; pts.push(p); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 6, false);
}

// the foam-board pop-up book: a page turning about a hinge line (x axis at z = hz), with things glued to it
export function bookPage(THREE, { w, d, t = 0.02, color = 0xf6f4ef }) {
  const pivot = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshPhysicalMaterial({ color: i === 2 || i === 3 ? color : 0xd8d2c6, roughness: 0.95 })));
  board.position.set(0, t / 2, -d / 2); board.castShadow = board.receiveShadow = true; pivot.add(board);
  const content = new THREE.Group(); content.position.set(0, t, -d / 2); pivot.add(content);
  return { pivot, board, content };
}
