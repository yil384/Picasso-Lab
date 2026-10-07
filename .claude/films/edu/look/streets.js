// The serving city of the pilot: 320 small towers (DeepSeek-V3's decode deployment: 320 GPUs, one expert each) in a
// street grid on a foam board, card shuttle buses on the streets (all-to-all traffic), light trails for the lamp-off
// long exposure (traffic that looks random), and red threads for the pattern (pairs of buildings that keep calling
// each other). Positions are world units on the desk; the grid is centred on (cx, cz).
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hsh } from '/scene/lib.js';

export function gridOf({ n = 320, cols = 16, pitch = 0.34, cx = 0, cz = -1.6, block = null, gap = 0.16 }) {
  // block = [bx, bz]: buildings come in blocks (one block = one 8-GPU server: 40 x 8 = 320), wider avenues between
  const rows = Math.ceil(n / cols), pts = [];
  const bx = block ? block[0] : cols, bz = block ? block[1] : rows;
  const W = (cols - 1) * pitch + Math.floor((cols - 1) / bx) * gap, D = (rows - 1) * pitch + Math.floor((rows - 1) / bz) * gap;
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    pts.push([cx - W / 2 + c * pitch + Math.floor(c / bx) * gap, cz + D / 2 - r * pitch - Math.floor(r / bz) * gap]);
  }
  return { pts, cols, rows, pitch, cx, cz };
}

// a Manhattan route between two buildings along the street centre lines (half a pitch off the building rows)
function route(G, a, b, lane) {
  const [ax, az] = G.pts[a], [bx, bz] = G.pts[b], h = G.pitch / 2, o = (lane - 0.5) * 0.03;
  const sx = ax + h + o, sz = az + h + o, ex = bx + h + o, ez = bz + h + o;
  return [[ax, az + 0.06], [ax, sz], [ex, sz], [ex, ez], [bx, ez], [bx, bz + 0.06]].map(([x, z]) => [x, z]);
}

export function streetsKit(T, G, o = {}) {
  const { THREE, scene } = T;
  const Y = o.y ?? 0.04;
  const out = { group: new THREE.Group() }; scene.add(out.group);

  // light trails: thin glowing tubes along many routes (seeded); structured = most traffic between a few pairs
  out.trails = (count, seed, structured = false) => {
    const geos = [];
    const hot = Array.from({ length: 14 }, (_, i) => [Math.floor(hsh(i, seed, 1) * G.pts.length), Math.floor(hsh(i, seed, 2) * G.pts.length)]);
    for (let i = 0; i < count; i++) {
      let a, b;
      if (structured && hsh(i, seed, 3) < 0.75) [a, b] = hot[Math.floor(hsh(i, seed, 4) * hot.length)];
      else { a = Math.floor(hsh(i, seed, 5) * G.pts.length); b = Math.floor(hsh(i, seed, 6) * G.pts.length); }
      if (a === b) continue;
      const pts = route(G, a, b, hsh(i, seed, 7)).map(([x, z]) => new THREE.Vector3(x, Y + 0.004 + hsh(i, 8) * 0.004, z));
      const path = new THREE.CurvePath(); for (let j = 0; j < pts.length - 1; j++) path.add(new THREE.LineCurve3(pts[j], pts[j + 1]));
      geos.push(new THREE.TubeGeometry(path, 48, 0.002, 4, false));
    }
    const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.35, 0.7), transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    out.group.add(m); return m;
  };

  // red threads: a sagging string from the top of one building to another (pairs that are called together)
  out.threads = (pairs, top) => {
    const geos = [];
    for (const [a, b] of pairs) {
      const [ax, az] = G.pts[a], [bx, bz] = G.pts[b], d = Math.hypot(bx - ax, bz - az);
      const pts = []; for (let k = 0; k <= 24; k++) { const u = k / 24; pts.push(new THREE.Vector3(ax + (bx - ax) * u, top - Math.sin(Math.PI * u) * d * 0.12, az + (bz - az) * u)); }
      geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.006, 6, false));
    }
    const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.7 }));
    m.castShadow = true; out.group.add(m); return m;
  };

  // card shuttle buses: little folded-card boxes with a window band, parked along streets (queues at the junctions)
  out.buses = (count, seed) => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const g = cv.getContext('2d');
    g.fillStyle = '#f2ede3'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#3b4a5c'; for (let i = 0; i < 7; i++) g.fillRect(14 + i * 34, 20, 26, 26);
    g.fillStyle = '#c8322b'; g.fillRect(0, 58, 256, 8);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const side = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }), plain = new THREE.MeshStandardMaterial({ color: 0xf2ede3, roughness: 0.9 });
    const geo = new THREE.BoxGeometry(0.11, 0.045, 0.042); geo.translate(0, 0.0225, 0);
    const im = new THREE.InstancedMesh(geo, [plain, plain, plain, plain, side, side], count); im.castShadow = im.receiveShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < count; i++) {
      // pile up towards a few junctions: a jam, not a scatter
      const j = Math.floor(hsh(i, seed, 1) * 6), jx = Math.floor(hsh(j, seed, 2) * (G.cols - 1)), jz = Math.floor(hsh(j, seed, 3) * (G.rows - 1));
      const along = hsh(i, seed, 4) < 0.5, dist = Math.floor(hsh(i, seed, 5) * 6) * 0.085 + 0.05, sign = hsh(i, seed, 6) < 0.5 ? -1 : 1;
      const [x0, z0] = G.pts[jz * G.cols + jx], h = G.pitch / 2;
      const x = along ? x0 + h + sign * dist : x0 + h + (hsh(i, 7) - 0.5) * 0.02, z = along ? z0 + h + (hsh(i, 8) - 0.5) * 0.02 : z0 + h + sign * dist;
      q.setFromEuler(new THREE.Euler(0, along ? 0 : Math.PI / 2, 0)); m4.compose(v.set(x, Y, z), q, s); im.setMatrixAt(i, m4);
    }
    out.group.add(im); return im;
  };
  return out;
}
