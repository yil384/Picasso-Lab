// td_world.js - the one three.js set: a night attic lab. Left: the researcher's desk under a lamp and a moon
// window. Right: the four agents' round workbench with its turntable, the Big Iron HPC engine behind it, the
// knowledge-base shelf on the wall and the pneumatic tube that links the two.
// Builders only (geometry + materials); animation lives in td_story.js / tritondft.html.
import { PAL, COL, TAU, hsh, bake, lerp } from './td_core.js';

export const L = {
  floorY: -0.95,
  bench: { x: 1.6, z: -0.25, r: 1.75, th: 0.16 },
  turn: { r0: 0.44, r1: 1.02, rJob: 0.74 },     // the turntable ring round the Library hub; the job rides at rJob
  stR: 1.34,                                   // station radius from the bench centre
  desk: { x: -3.65, z: 0.15, w: 3.5, d: 1.3 },
  wallZ: -3.0,
  engine: { x: 3.78, z: -2.02, w: 1.5, h: 2.5, d: 1.0 },
};
/** station position (world) for angle th (rad; 0 = +x, positive = towards the back, -z) */
export const station = (th, r = L.stR) => [L.bench.x + r * Math.cos(th), 0, L.bench.z - r * Math.sin(th)];
export const ST = { plan: (3 * Math.PI) / 4, exec: Math.PI / 4, anlz: -Math.PI / 4, refn: (-3 * Math.PI) / 4 };

// silicon, diamond cubic: FCC corners + faces + 4 interior tetrahedral sites; 16 bonds (each interior atom to
// 1 corner + 3 face centres)
export function diamondCell() {
  const P = [];
  for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) P.push([x, y, z]);
  P.push([0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5], [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5]);
  const I = [[0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]];
  const bonds = [];
  I.forEach((q, qi) => P.forEach((p, j) => {
    if (Math.abs(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) - Math.sqrt(3) / 4) < 1e-6) bonds.push([P.length + qi, j]);
  }));
  return { atoms: [...P, ...I], bonds, nCorner: 8, nFace: 6 };
}

/** W = { THREE, scene, npr, add, ctx } */
export async function buildRoom(W) {
  const { THREE, scene, npr, add, ctx } = W;
  // ---- floor: wide cream-ochre planks ----
  const floorTex = await bake(THREE, { width: 1024, height: 1024, seed: 11, key: 'floor-v1', background: '#ffffff' }, (p, brush, w, h) => {
    const r = ctx.rng('floor');
    brush.noStroke();
    for (let k = 0; k < 8; k++) { brush.fill(k % 2 ? '#e9c98f' : '#dfb877', 110); brush.fillBleed(0.02); brush.fillTexture(0.5, 0.4); brush.rect(k * 128 + 3, -10, 122, h + 20); }
    brush.set('bigink', '#4a3423', 1.1);
    for (let k = 0; k <= 8; k++) brush.line(k * 128, 0, k * 128 + r.gauss(0, 1.5), h);
    brush.set('inkpen', '#6b4a2e', 0.9);
    for (let k = 0; k < 8; k++) { const y = r.range(80, 940); brush.line(k * 128, y, k * 128 + 128, y + r.gauss(0, 2)); for (let q = 0; q < 3; q++) { const yy = r.range(0, h), x = k * 128 + r.range(20, 100); brush.spline([[x, yy], [x + 6, yy + 30], [x - 3, yy + 70]], 0.5); } }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(4, 4);
  add(new THREE.PlaneGeometry(26, 26), { color: 0xf2dcae, map: floorTex, hatchDir: [1, 0, 0], toneBias: 0.02, spec: 0 }, { cast: false }, [0, L.floorY, 0], [-Math.PI / 2, 0, 0]);

  // ---- back wall: sky-blue plaster with the round moon window, a door-frame, pipes (baked wash) ----
  const wallTex = await bake(THREE, { width: 2048, height: 768, seed: 12, key: 'wall-v3', background: '#ffffff' }, (p, brush, w, h) => paintWall(ctx, brush, w, h));
  const wallW = 16, wallH = 6;
  const wallMat = { color: 0xffffff, map: wallTex, hatchDir: [0, 1, 0.3], toneBias: 0.0, spec: 0, receive: true, rim: 0 };
  add(new THREE.PlaneGeometry(wallW, wallH), wallMat, { cast: false }, [0, L.floorY + wallH / 2, L.wallZ]);
  // side walls (so orbits and whips always see a room), plain plaster
  const sideTex = await bake(THREE, { width: 1024, height: 512, seed: 13, key: 'side-v3', background: '#ffffff' }, (p, brush, w, h) => paintPlaster(ctx, brush, w, h, 'side'));
  const side = { color: 0xffffff, map: sideTex, hatchDir: [0, 1, 0.3], spec: 0, rim: 0 };
  add(new THREE.PlaneGeometry(12, wallH), side, { cast: false }, [-wallW / 2, L.floorY + wallH / 2, L.wallZ + 6], [0, Math.PI / 2, 0]);
  add(new THREE.PlaneGeometry(12, wallH), side, { cast: false }, [wallW / 2, L.floorY + wallH / 2, L.wallZ + 6], [0, -Math.PI / 2, 0]);
  add(new THREE.PlaneGeometry(wallW, wallH), side, { cast: false }, [0, L.floorY + wallH / 2, L.wallZ + 12], [0, Math.PI, 0]);
  // skirting board + a dado rail in navy (depth lines)
  add(new THREE.BoxGeometry(wallW, 0.22, 0.08), { color: COL.navy, hatchMode: 'u' }, { outline: 0.8, cast: false }, [0, L.floorY + 0.11, L.wallZ + 0.04]);

  // ---- window frame (3D, so the moonlight reads through a real opening): a thick round brass-rimmed porthole ----
  const winC = [-3.2, 2.05, L.wallZ + 0.02];
  add(new THREE.TorusGeometry(1.05, 0.09, 16, 64), { color: COL.navy, hatchMode: 'u', rim: 0.4 }, { outline: 1.0, cast: false }, winC);
  add(new THREE.BoxGeometry(2.1, 0.07, 0.06), { color: COL.navy }, { outline: 0.6, cast: false }, winC);
  add(new THREE.BoxGeometry(0.07, 2.1, 0.06), { color: COL.navy }, { outline: 0.6, cast: false }, winC);

  // ---- knowledge-base shelf over the agents' bench: fat sky-blue books (shared knowledge) ----
  const shelf = new THREE.Group(); shelf.position.set(L.bench.x - 0.3, 1.55, L.wallZ + 0.22); scene.add(shelf);
  add(new THREE.BoxGeometry(2.6, 0.08, 0.42), { color: 0xc98b4a, hatchMode: 'u', shadeColor: 0x6b3f22, shadeMix: 0.4 }, { outline: 0.9 }, [0, 0, 0], [0, 0, 0], shelf);
  for (const sx of [-1.15, 1.15]) add(new THREE.BoxGeometry(0.06, 0.28, 0.36), { color: 0x8a5a33 }, { outline: 0.6 }, [sx, -0.16, 0], [0, 0, 0], shelf);
  const bookCols = [COL.sky, COL.skyL, COL.navy, COL.pop, COL.sky, COL.cream, COL.skyL, COL.navy, COL.sky, COL.gold, COL.skyL, COL.sky];
  let bx = -1.2;
  bookCols.forEach((c, i) => {
    const bw = 0.12 + 0.07 * hsh(i, 2), bh = 0.36 + 0.14 * hsh(i, 3), lean = i === 8 ? -0.35 : i === 3 ? 0.12 : 0;
    add(new THREE.BoxGeometry(bw, bh, 0.3), { color: c, hatchDir: [0, 1, 0], rim: 0.5, seed: 200 + i }, { outline: 0.75 }, [bx + bw / 2, 0.04 + bh / 2, 0], [0, 0, lean], shelf);
    bx += bw + 0.015 + (lean ? 0.08 : 0);
  });
  W.shelf = shelf;
}

function paintPlaster(ctx, brush, w, h, key) {
  const r = ctx.rng('plaster', key);
  brush.noStroke();
  brush.fill('#f2e3c2', 255); brush.fillBleed(0.0); brush.fillTexture(0.3, 0.3); brush.rect(-10, -10, w + 20, h + 20);
  for (let k = 0; k < 10; k++) { brush.fill(k % 2 ? '#e6d0a4' : '#fbf1dc', 70); brush.fillBleed(0.3, 'out'); brush.fillTexture(0.6, 0.5); brush.circle(r.range(0, w), r.range(0, h), r.range(90, 220), 0.6); }
  // sky-blue wainscot along the bottom third (the accent colour), with a navy rail
  brush.fill('#2b8de2', 255); brush.fillBleed(0.01); brush.fillTexture(0.35, 0.3); brush.rect(-10, h * 0.72, w + 20, h * 0.3);
  brush.fill('#1c7bd0', 90); brush.fillBleed(0.2, 'out'); for (let k = 0; k < 6; k++) brush.circle(r.range(0, w), r.range(h * 0.76, h), r.range(40, 90), 0.5);
  brush.set('bigink', '#0b3558', 1.6); brush.line(0, h * 0.72, w, h * 0.72 + r.gauss(0, 1));
  brush.set('inkpen', '#6b4a2e', 0.8);
  for (let k = 0; k < 26; k++) { const x = r.range(0, w), y = r.range(0, h); brush.line(x, y, x + r.range(14, 40), y + r.gauss(0, 2)); }
}

function paintWall(ctx, brush, w, h) {
  // 16 x 6 world units -> 2048 x 768 px (128 px / unit); world x = -8..8, y = floorY..floorY+6 (v = 0 at the top)
  const X = (x) => (x + 8) * 128, Y = (y) => (6 - (y - -0.95)) * 128;
  paintPlaster(ctx, brush, w, h, 'back');
  const r = ctx.rng('wall');
  // the round window: deep night sky, a big cream halftone-ish moon, sparse 4-point stars
  const cx = X(-3.2), cy = Y(2.05), R = 1.02 * 128;
  brush.noStroke(); brush.fill('#0b3558', 255); brush.fillBleed(0.0); brush.fillTexture(0.2, 0.2); brush.circle(cx, cy, R, 0); brush.circle(cx, cy, R, 0);
  brush.fill('#16507e', 120); brush.fillBleed(0.2, 'out'); brush.circle(cx + 30, cy + 40, R * 0.7, 0.5);
  brush.fill('#fff1cf', 255); brush.fillBleed(0.01); brush.fillTexture(0.15, 0.2); brush.circle(cx - R * 0.34, cy - R * 0.28, R * 0.36, 0.1); brush.circle(cx - R * 0.34, cy - R * 0.28, R * 0.36, 0.1);
  brush.fill('#e8d3a4', 150); brush.circle(cx - R * 0.42, cy - R * 0.2, R * 0.08, 0.3); brush.circle(cx - R * 0.26, cy - R * 0.38, R * 0.05, 0.3);
  for (let k = 0; k < 7; k++) {
    const a = r.range(0, TAU), rr = r.range(0.35, 0.85) * R, sx = cx + Math.cos(a) * rr, sy = cy + Math.sin(a) * rr;
    if (Math.hypot(sx - (cx - R * 0.34), sy - (cy - R * 0.28)) < R * 0.5) continue;
    const s = r.range(7, 13);
    brush.fill('#fff6e0', 255); brush.polygon([[sx, sy - s], [sx + s * 0.25, sy - s * 0.25], [sx + s, sy], [sx + s * 0.25, sy + s * 0.25], [sx, sy + s], [sx - s * 0.25, sy + s * 0.25], [sx - s, sy], [sx - s * 0.25, sy - s * 0.25]]);
  }
  // a painted cool window-light pool falling on the wall under the window
  brush.fill('#a8dcf5', 70); brush.fillBleed(0.3, 'out'); brush.fillTexture(0.5, 0.4); brush.circle(cx + 40, Y(0.3), 220, 0.6);
  // pipes along the wall (painted; the pneumatic tube itself is 3D)
  brush.set('bigink', '#1b3552', 1.4);
  for (const yy of [Y(2.95), Y(3.12)]) brush.line(X(-8), yy, X(8), yy + r.gauss(0, 1));
  for (let k = 0; k < 12; k++) { const x = X(-7.5 + k * 1.35); brush.line(x, Y(2.9), x, Y(3.18)); }
  // chalk-ish diagrams of lattices pinned on the wall near the bench (framed, lived-in lab): a honeycomb + a cube
  brush.fill('#fff6e0', 230); brush.fillBleed(0.01); brush.fillTexture(0.2, 0.3);
  const card = (x0, y0, ww, hh, rot) => { const c = Math.cos(rot), s = Math.sin(rot); brush.polygon([[0, 0], [ww, 0], [ww, hh], [0, hh]].map(([a, b]) => [x0 + a * c - b * s, y0 + a * s + b * c])); };
  card(X(-0.9), Y(2.6), 150, 110, -0.05); card(X(5.6), Y(2.3), 130, 150, 0.06); card(X(-6.4), Y(2.2), 140, 120, 0.04);
  brush.set('inkpen', '#1d3f63', 1.0);
  const hexC = (x, y, s) => { const pts = []; for (let k = 0; k <= 6; k++) pts.push([x + s * Math.cos(k * Math.PI / 3), y + s * Math.sin(k * Math.PI / 3)]); brush.spline(pts, 0); };
  for (const [dx, dy] of [[0, 0], [1.5, 0.87], [1.5, -0.87], [3, 0]]) hexC(X(-0.9) + 30 + dx * 18, Y(2.6) + 55 + dy * 18, 18);
  const cube = (x, y, s) => { brush.rect(x, y, s, s); brush.rect(x + s * 0.35, y - s * 0.35, s, s); brush.line(x, y, x + s * 0.35, y - s * 0.35); brush.line(x + s, y, x + s * 1.35, y - s * 0.35); brush.line(x, y + s, x + s * 0.35, y + s * 0.65); brush.line(x + s, y + s, x + s * 1.35, y + s * 0.65); };
  cube(X(5.6) + 30, Y(2.3) + 70, 50);
  for (let k = 0; k < 4; k++) brush.line(X(-6.4) + 20, Y(2.2) + 25 + k * 22, X(-6.4) + 110, Y(2.2) + 25 + k * 22 + r.gauss(0, 1));
}

/** the agents' round workbench: a thick round top on a central post, and the turntable (a group that spins) */
export async function buildBench(W) {
  const { THREE, scene, add } = W;
  const B = L.bench;
  const top = { color: 0xe7f4fb, hatchDir: [1, 0, 0.2], toneBias: 0.06, rim: 0.3 };
  const edge = { color: COL.sky, hatchMode: 'u', shadeColor: COL.navy, shadeMix: 0.4, rim: 0.6 };
  add(new THREE.CylinderGeometry(B.r, B.r, B.th, 72), [edge, top, top], { outline: 1.1 }, [B.x, -B.th / 2, B.z]);
  add(new THREE.TorusGeometry(B.r, 0.045, 10, 96), { color: COL.pop, hatchMode: 'u', rim: 0.5 }, { outline: 0.6, cast: false }, [B.x, 0.0, B.z], [Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(0.28, 0.42, -L.floorY - B.th, 28), { color: COL.navy, hatchMode: 'u' }, { outline: 0.9 }, [B.x, (L.floorY - B.th) / 2, B.z]);
  add(new THREE.CylinderGeometry(0.9, 1.0, 0.1, 40), { color: COL.navy }, { outline: 0.8 }, [B.x, L.floorY + 0.05, B.z]);
  // turntable ring (carries the job past the stations) with vermilion chevrons pointing the loop direction
  const turn = new THREE.Group(); turn.position.set(B.x, 0, B.z); scene.add(turn);
  const T0 = L.turn;
  const ringTex = await bake(THREE, { width: 1024, height: 1024, seed: 15, key: 'ring-v1', background: '#ffffff' }, (p, brush, w, h) => {
    brush.noStroke(); brush.fill('#8fd0f0', 255); brush.fillTexture(0.3, 0.3); brush.rect(-5, -5, w + 10, h + 10);
    const c = w / 2, sc = (w / 2) / T0.r1;
    for (let k = 0; k < 12; k++) {             // chevrons around the ring at r = (r0 + r1) / 2, pointing clockwise (from above)
      const a = k / 12 * TAU, r = (T0.r0 + T0.r1) / 2 * sc, s = 38;
      const px = c + Math.cos(a) * r, py = c + Math.sin(a) * r, tx = -Math.sin(a), ty = Math.cos(a), nx = Math.cos(a), ny = Math.sin(a);
      brush.fill('#ff5a2e', 255); brush.fillBleed(0.01);
      brush.polygon([[px + tx * s, py + ty * s], [px - tx * s * 0.2 + nx * s * 0.9, py - ty * s * 0.2 + ny * s * 0.9], [px - tx * s * 0.6 + nx * s * 0.9, py - ty * s * 0.6 + ny * s * 0.9], [px + tx * s * 0.25, py + ty * s * 0.25], [px - tx * s * 0.6 - nx * s * 0.9, py - ty * s * 0.6 - ny * s * 0.9], [px - tx * s * 0.2 - nx * s * 0.9, py - ty * s * 0.2 - ny * s * 0.9]]);
    }
    brush.set('bigink', '#0b3558', 1.3); brush.circle(c, c, T0.r1 * sc - 18, 0.1); brush.circle(c, c, T0.r0 * sc + 14, 0.1);
  });
  const ringGeo = new THREE.RingGeometry(T0.r0, T0.r1, 72, 1); ringGeo.rotateX(-Math.PI / 2);
  add(ringGeo, { color: 0xffffff, map: ringTex, rim: 0.3, hatchDir: [1, 0, 0], toneBias: 0.04 }, { outline: 0.8 }, [0, 0.06, 0], [0, 0, 0], turn);
  add(new THREE.CylinderGeometry(T0.r1, T0.r1 + 0.02, 0.06, 72, 1, true), { color: COL.navy, side: THREE.DoubleSide, hatchMode: 'u' }, { outline: 0.8 }, [0, 0.03, 0], [0, 0, 0], turn);
  W.turn = turn;
  // the Library: the shared knowledge base, three drums of fat books at the hub
  const hub = new THREE.Group(); hub.position.set(B.x, 0, B.z); scene.add(hub);
  const spineTex = await bake(THREE, { width: 1024, height: 256, seed: 16, key: 'spines-v1', background: '#ffffff', wrap: true }, (p, brush, w, h) => {
    const cols = ['#0284c7', '#6cc4ee', '#0b3558', '#fff6e0', '#0284c7', '#ff5a2e', '#6cc4ee', '#0b3558', '#ffc94a', '#0284c7', '#bfe6f7', '#0b3558'];
    let x = 0, k = 0;
    while (x < w) { const bw = 60 + (k * 37) % 40; brush.noStroke(); brush.fill(cols[k % cols.length], 255); brush.fillTexture(0.3, 0.3); brush.rect(x, -4, bw, h + 8); brush.set('bigink', '#16162c', 1.2); brush.line(x, 0, x, h); brush.set('inkpen', k % 3 ? '#fff6e0' : '#16162c', 1.0); brush.line(x + 10, 40, x + bw - 10, 40); brush.line(x + 10, h - 40, x + bw - 10, h - 40); x += bw; k++; }
  });
  // the Library: a ring of fat standing books (varied heights, a few leaning) round a brass finial
  add(new THREE.CylinderGeometry(0.34, 0.36, 0.06, 40), { color: 0x8a5a33, hatchMode: 'u', shadeColor: 0x4a2c16, shadeMix: 0.4 }, { outline: 0.8 }, [0, 0.09, 0], [0, 0, 0], hub);
  const bcols = [COL.sky, COL.navy, COL.pop, COL.skyL, COL.cream, COL.sky, COL.gold, COL.navy, COL.skyL, COL.pop, COL.sky, COL.cream, COL.navy, COL.skyL, COL.gold, COL.sky, COL.pop, COL.navy];
  W.hubBooks = bcols.map((c, k) => {
    const a = k / bcols.length * TAU, h = 0.2 + 0.13 * hsh(k, 21), lean = [3, 8, 13].includes(k) ? 0.22 : 0;
    const m = add(new THREE.BoxGeometry(0.15, h, 0.085), { color: c, hatchDir: [0, 1, 0], rim: 0.5, seed: 400 + k }, { outline: 0.7 }, [Math.cos(a) * 0.25, 0.12 + h / 2, -Math.sin(a) * 0.25], [0, a, lean], hub);
    return { m, a };
  });
  add(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 12), { color: COL.gold, hatchMode: 'u', rim: 0.7 }, { outline: 0.6 }, [0, 0.27, 0], [0, 0, 0], hub);
  add(new THREE.SphereGeometry(0.06, 16, 10), { color: COL.pop, rim: 0.7 }, { outline: 0.6 }, [0, 0.45, 0], [0, 0, 0], hub);
  W.hub = hub;
}

/** the silicon model: ball-and-stick conventional diamond-cubic cell (matte; never glassy). Returns the group. */
export function buildSilicon(W, A = 0.5, parent = null) {
  const { THREE, scene, add } = W;
  const cell = diamondCell(), c0 = -A / 2;
  const g = new THREE.Group(); (parent || scene).add(g);
  const inner = new THREE.Group(); g.add(inner);
  const atomGeo = new THREE.SphereGeometry(A * 0.1, 24, 16), inGeo = new THREE.SphereGeometry(A * 0.11, 24, 16);
  const atoms = cell.atoms.map((p, i) => add(i >= 14 ? inGeo : atomGeo, { color: COL.cream, rim: 0.7, toneBias: 0.1, seed: 300 + i, hatch: 0.6 }, { outline: 0.55 }, p.map((v) => v * A + c0), [0, 0, 0], inner));
  const bondGeo = new THREE.CylinderGeometry(A * 0.028, A * 0.028, 1, 10);
  const bonds = cell.bonds.map(([a, b]) => {
    const pa = new THREE.Vector3(...cell.atoms[a]).multiplyScalar(A).addScalar(c0), pb = new THREE.Vector3(...cell.atoms[b]).multiplyScalar(A).addScalar(c0);
    const m = add(bondGeo, { color: COL.steel, rim: 0.4, hatch: 0.4 }, { outline: 0.4 }, [0, 0, 0], [0, 0, 0], inner);
    m.position.copy(pa).lerp(pb, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize()); m.scale.y = pa.distanceTo(pb);
    return m;
  });
  const edgeGeo = new THREE.CylinderGeometry(A * 0.012, A * 0.012, A, 6);
  for (const ax of [0, 1, 2]) for (const u of [0, 1]) for (const v of [0, 1]) {
    const m = add(edgeGeo, { color: COL.navy, hatch: 0, rim: 0 }, { outline: 0.3, cast: false }, [0, 0, 0], [0, 0, 0], inner);
    const p = [0, 0, 0]; p[(ax + 1) % 3] = u * A + c0; p[(ax + 2) % 3] = v * A + c0; m.position.set(...p);
    if (ax === 0) m.rotation.z = Math.PI / 2; if (ax === 2) m.rotation.x = Math.PI / 2;
  }
  return { g, inner, atoms, bonds, A };
}

/** Big Iron, the HPC engine: navy cabinet, vent slats, porthole firebox, two brass pistons, a stack, an input
 *  slot-mouth, a tape spout and a tall lever. Returns handles for animation. */
export function buildEngine(W) {
  const { THREE, scene, add } = W;
  const E = L.engine, g = new THREE.Group(); g.position.set(E.x, L.floorY, E.z); scene.add(g);
  const body = new THREE.Group(); g.add(body);
  const navy = { color: COL.navy, hatchMode: 'planar', hatchDir: [0, 1, 0], rim: 0.6, shadeColor: 0x06182b, shadeMix: 0.3 };
  const sky = { color: COL.sky, hatchMode: 'planar', hatchDir: [0, 1, 0], rim: 0.6, shadeColor: COL.navy, shadeMix: 0.35 };
  const brass = { color: COL.gold, hatchMode: 'u', rim: 0.8, shadeColor: 0x9a5a2a, shadeMix: 0.35 };
  add(new THREE.BoxGeometry(E.w, E.h, E.d), sky, { outline: 1.2 }, [0, E.h / 2, 0], [0, 0, 0], body);
  add(new THREE.BoxGeometry(E.w + 0.12, 0.16, E.d + 0.12), navy, { outline: 0.9 }, [0, 0.08, 0], [0, 0, 0], body);
  add(new THREE.BoxGeometry(E.w + 0.1, 0.12, E.d + 0.1), navy, { outline: 0.9 }, [0, E.h - 0.02, 0], [0, 0, 0], body);
  // rack slats on the front (vertical vents)
  for (let k = 0; k < 7; k++) add(new THREE.BoxGeometry(0.05, 0.62, 0.04), { color: COL.navy }, { outline: 0.4, cast: false }, [-0.55 + k * 0.08, E.h - 0.55, E.d / 2 + 0.02], [0, 0, 0], body);
  // indicator lamps (painted glows are added per frame)
  const lamps = [];
  for (let k = 0; k < 4; k++) lamps.push(add(new THREE.SphereGeometry(0.045, 12, 8), { color: k % 2 ? COL.popL : COL.cream, glow: 0.5, rim: 0.2 }, { outline: 0.35, cast: false }, [0.25 + k * 0.13, E.h - 0.35, E.d / 2 + 0.03], [0, 0, 0], body));
  // porthole firebox
  const port = [0.05, 1.05, E.d / 2 + 0.03];
  add(new THREE.TorusGeometry(0.34, 0.07, 14, 48), brass, { outline: 0.9 }, port, [0, 0, 0], body);
  const fire = add(new THREE.CircleGeometry(0.3, 40), { unique: true, color: 0xffb35a, glow: 0.6, hatch: 0.2, rim: 0 }, { cast: false }, [port[0], port[1], port[2] - 0.01], [0, 0, 0], body);
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; add(new THREE.SphereGeometry(0.035, 10, 8), brass, { outline: 0.3, cast: false }, [port[0] + Math.cos(a) * 0.34, port[1] + Math.sin(a) * 0.34, port[2] + 0.06], [0, 0, 0], body); }
  // input slot-mouth on the left face (towards the Executor): a dark recess with two brass lips
  const slot = [-E.w / 2 - 0.01, 1.28, 0.1];
  add(new THREE.BoxGeometry(0.06, 0.12, 0.56), { color: 0x0a1626, hatch: 0, rim: 0 }, { cast: false }, slot, [0, 0, 0], body);
  const lipU = add(new THREE.BoxGeometry(0.12, 0.05, 0.64), brass, { outline: 0.6 }, [slot[0] - 0.02, slot[1] + 0.09, slot[2]], [0, 0, 0], body);
  const lipD = add(new THREE.BoxGeometry(0.12, 0.05, 0.64), brass, { outline: 0.6 }, [slot[0] - 0.02, slot[1] - 0.09, slot[2]], [0, 0, 0], body);
  // tape spout on the front-left corner (towards the Analyzer)
  const spout = add(new THREE.CylinderGeometry(0.11, 0.14, 0.26, 20), brass, { outline: 0.7 }, [-E.w / 2 + 0.2, 1.08, E.d / 2 + 0.1], [Math.PI / 2, 0, 0], body);
  // two pistons + the stack on top
  const pist = [-0.35, 0.05].map((x) => {
    const cyl = add(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 24), navy, { outline: 0.8 }, [x, E.h + 0.17, -0.1], [0, 0, 0], body);
    const rod = add(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 14), brass, { outline: 0.6 }, [x, E.h + 0.45, -0.1], [0, 0, 0], body);
    const cap = add(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 24), brass, { outline: 0.7 }, [x, E.h + 0.7, -0.1], [0, 0, 0], body);
    return { cyl, rod, cap, x };
  });
  const stack = add(new THREE.CylinderGeometry(0.14, 0.18, 0.62, 24), navy, { outline: 0.9 }, [0.48, E.h + 0.31, 0.05], [0, 0, 0], body);
  add(new THREE.TorusGeometry(0.15, 0.04, 10, 28), brass, { outline: 0.5 }, [0.48, E.h + 0.62, 0.05], [Math.PI / 2, 0, 0], body);
  // the big lever on the left side (pivot group)
  const lever = new THREE.Group(); lever.position.set(-E.w / 2 - 0.1, 0.72, 0.32); body.add(lever);
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 20), brass, { outline: 0.6 }, [0, 0, 0], [0, 0, Math.PI / 2], lever);
  const arm = add(new THREE.CylinderGeometry(0.035, 0.04, 1.0, 12), { color: COL.steel, hatchMode: 'u' }, { outline: 0.6 }, [0, 0.5, 0], [0, 0, 0], lever);
  const knob = add(new THREE.SphereGeometry(0.11, 20, 14), { color: COL.pop, rim: 0.7, shadeColor: COL.popD, shadeMix: 0.4 }, { outline: 0.7 }, [0, 1.02, 0], [0, 0, 0], lever);
  // smoke rings (tori) re-used per frame
  const rings = Array.from({ length: 4 }, (_, i) => add(new THREE.TorusGeometry(1, 0.32, 12, 32), { color: 0xe9eef3, hatch: 0.5, toneBias: 0.12, rim: 0.3, seed: 400 + i }, { outline: 0.5, cast: false }, [0.48, E.h + 0.7, 0.05], [Math.PI / 2, 0, 0], g));
  rings.forEach((m) => { m.visible = false; });
  const hand = { g, body, fire, lamps, lipU, lipD, spout, pist, stack, lever, arm, knob, rings, port, slot };
  W.engine = hand;
  return hand;
}

/** an hourglass (same shape at any scale): two bulbs (lathe) in a pale glass shell, wooden caps and posts; the sand
 *  is built per frame from a cone (top) and a heap (bottom). h = total height. */
export function buildHourglass(W, h, pos, key) {
  const { THREE, scene, add, npr } = W;
  const g = new THREE.Group(); g.position.set(...pos); scene.add(g);
  const pivot = new THREE.Group(); g.add(pivot);
  const s = h / 1.2;
  const cap = { color: 0xb8773f, hatchMode: 'u', rim: 0.6, shadeColor: 0x5e3419, shadeMix: 0.4 };
  add(new THREE.CylinderGeometry(0.34 * s, 0.34 * s, 0.07 * s, 32), cap, { outline: 0.8 }, [0, 0.035 * s, 0], [0, 0, 0], pivot);
  add(new THREE.CylinderGeometry(0.34 * s, 0.34 * s, 0.07 * s, 32), cap, { outline: 0.8 }, [0, 1.165 * s, 0], [0, 0, 0], pivot);
  for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + Math.PI / 2; add(new THREE.CylinderGeometry(0.022 * s, 0.022 * s, 1.1 * s, 8), cap, { outline: 0.5 }, [Math.cos(a) * 0.29 * s, 0.6 * s, Math.sin(a) * 0.29 * s], [0, 0, 0], pivot); }
  // glass profile (lathe): r(y) with a narrow neck at y = 0.6
  const prof = [];
  for (let i = 0; i <= 32; i++) {
    const y = 0.07 + 1.06 * i / 32, a = Math.abs((y - 0.6) / 0.53);
    const r = a < 0.75 ? 0.03 + 0.22 * Math.pow(Math.sin(Math.PI / 2 * a / 0.75), 1.2) : 0.25 - 0.08 * ((a - 0.75) / 0.25) ** 2;
    prof.push(new THREE.Vector2(r * s, y * s));
  }
  const glassGeo = new THREE.LatheGeometry(prof, 40);
  const glass = new THREE.Mesh(glassGeo, npr.glass({ tint: 0xb8e2f8, alpha: 3.2, edge: 2.6, glint: 1.0, silhouette: true }));
  npr.add(glass, { glass: true }); pivot.add(glass);
  // sand: top cone (points down into the neck) and bottom heap; plus the stream
  const sandM = { color: 0xe9b04f, hatchDir: [0, 1, 0.3], rim: 0.5, shadeColor: 0xa9651f, shadeMix: 0.35, toneBias: 0.05 };
  const sandGeo = new THREE.ConeGeometry(0.22 * s, 0.3 * s, 32, 1);
  const topSand = add(sandGeo, sandM, { outline: 0.4, cast: false }, [0, 0, 0], [0, 0, 0], pivot);   // sand of the local-top bulb
  const botSand = add(sandGeo, sandM, { outline: 0.4, cast: false }, [0, 0, 0], [0, 0, 0], pivot);   // sand of the local-bottom bulb
  const stream = add(new THREE.CylinderGeometry(0.007, 0.007, 1, 6), sandM, { cast: false }, [0, 0.4 * s, 0], [0, 0, 0], pivot);  // same width at any scale: same flow
  return { g, pivot, glass, topSand, botSand, stream, s, h, key };
}

// ---------------------------------------------------------------------------------------------------
// the researcher's desk: wooden desk, gooseneck lamp, paper towers, a big open book of lattices, mug, pencil cup
// ---------------------------------------------------------------------------------------------------
export async function buildDesk(W) {
  const { THREE, scene, add, ctx } = W;
  const D = L.desk, g = new THREE.Group(); g.position.set(D.x, 0, D.z); scene.add(g);
  const wood = { color: 0xc98b4a, hatchDir: [1, 0, 0.1], rim: 0.5, shadeColor: 0x6b3f22, shadeMix: 0.4, seed: 81 };
  add(new THREE.BoxGeometry(D.w, 0.12, D.d), wood, { outline: 1.1 }, [0, -0.06, 0], [0, 0, 0], g);
  add(new THREE.BoxGeometry(D.w - 0.2, 0.22, D.d - 0.1), { ...wood, color: 0xb57a3f }, { outline: 0.9 }, [0, -0.23, -0.02], [0, 0, 0], g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.1, -L.floorY - 0.12, 0.1), wood, { outline: 0.8 }, [sx * (D.w / 2 - 0.12), (L.floorY - 0.12) / 2, sz * (D.d / 2 - 0.1)], [0, 0, 0], g);
  // gooseneck lamp (back-left of the desk), shade aimed at the book
  const lamp = new THREE.Group(); lamp.position.set(-1.3, 0, 0.28); lamp.rotation.y = 0.55; g.add(lamp);
  const skyM = { color: COL.sky, rim: 0.8, hatchMode: 'u', shadeColor: COL.navy, shadeMix: 0.35 };
  add(new THREE.CylinderGeometry(0.16, 0.19, 0.06, 28), skyM, { outline: 0.8 }, [0, 0.03, 0], [0, 0, 0], lamp);
  const neck = new THREE.CatmullRomCurve3([[0, 0.05, 0], [0.02, 0.5, -0.02], [0.18, 0.86, 0.02], [0.45, 0.92, 0.12]].map((q) => new THREE.Vector3(...q)));
  add(new THREE.TubeGeometry(neck, 40, 0.028, 10), { color: COL.steel, hatchMode: 'u' }, { outline: 0.6 }, [0, 0, 0], [0, 0, 0], lamp);
  const shade = new THREE.Group(); shade.position.set(0.5, 0.9, 0.14); shade.rotation.set(0.5, 0, -0.75); lamp.add(shade);
  add(new THREE.CylinderGeometry(0.07, 0.2, 0.22, 28, 1, true), { ...skyM, side: THREE.DoubleSide }, { outline: 0.9 }, [0, 0, 0], [0, 0, 0], shade);
  const bulb = add(new THREE.SphereGeometry(0.06, 16, 10), { color: 0xfff1c4, glow: 0.8, hatch: 0, rim: 0 }, { outline: 0.3, cast: false }, [0, -0.08, 0], [0, 0, 0], shade);
  // paper towers (manual work): three leaning stacks with baked sheet-edge lines
  const stackTex = await bake(THREE, { width: 256, height: 512, seed: 21, key: 'stack-v1', background: '#ffffff' }, (p, brush, w, h) => {
    brush.noStroke(); brush.fill('#fff6e0', 255); brush.rect(-5, -5, w + 10, h + 10);
    brush.set('inkpen', '#6d6a78', 0.8); for (let y = 6; y < h; y += 11) brush.line(0, y, w, y + (y % 3) - 1);
  });
  const paperM = { color: COL.cream, map: stackTex, rim: 0.4, hatchDir: [0, 1, 0], toneBias: 0.05 };
  W.stacks = [[-1.25, -0.42, 0.95, 0.04], [-0.95, -0.5, 0.62, -0.05], [1.25, -0.4, 0.5, 0.07]].map(([x, z, h, lean], i) => {
    const m = add(new THREE.BoxGeometry(0.34, h, 0.26), paperM, { outline: 0.8 }, [x, h / 2, z], [0.02 * i, 0.15 * i - 0.1, lean], g);
    return m;
  });
  // the big open book (lattice doodles): two page slabs + a flippable page
  W.bookTex = [];
  for (const [k, kind] of [[0, 'blank'], [1, 'cube'], [2, 'honey'], [3, 'si']]) {
    W.bookTex.push(await bake(THREE, { width: 512, height: 384, seed: 30 + k, key: `page-${kind}-v1`, background: '#ffffff' }, (p, brush, w, h) => paintPage(ctx, brush, w, h, kind)));
  }
  const book = new THREE.Group(); book.position.set(-0.3, 0.0, 0.02); book.rotation.y = 0.08; g.add(book);
  const pageM = (tex) => ({ color: COL.cream, map: tex, rim: 0.3, toneBias: 0.1, hatch: 0.5 });
  const cover = { color: COL.navy, rim: 0.5 };
  add(new THREE.BoxGeometry(1.02, 0.03, 0.66), cover, { outline: 0.8 }, [0, 0.015, 0], [0, 0, 0], book);
  W.pageL = add(new THREE.BoxGeometry(0.48, 0.05, 0.6), [cover, cover, pageM(W.bookTex[0]), cover, cover, cover], { outline: 0.6 }, [-0.25, 0.055, 0], [0, 0, 0.04], book);
  W.pageR = add(new THREE.BoxGeometry(0.48, 0.05, 0.6), [cover, cover, pageM(W.bookTex[2]), cover, cover, cover], { outline: 0.6 }, [0.25, 0.055, 0], [0, 0, -0.04], book);
  W.flip = new THREE.Group(); W.flip.position.set(0, 0.085, 0); book.add(W.flip);
  W.flipPage = add(new THREE.PlaneGeometry(0.48, 0.6).rotateX(-Math.PI / 2).translate(0.24, 0, 0), { color: COL.cream, map: W.bookTex[1], side: THREE.DoubleSide, rim: 0.3, toneBias: 0.1, hatch: 0.5 }, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], W.flip);
  W.book = book;
  // mug + steam anchor, pencil cup
  const mug = new THREE.Group(); mug.position.set(-0.98, 0, 0.16); g.add(mug);
  add(new THREE.CylinderGeometry(0.09, 0.085, 0.2, 24, 1, false), { color: COL.pop, rim: 0.7, hatchMode: 'u', shadeColor: COL.popD, shadeMix: 0.45 }, { outline: 0.8 }, [0, 0.1, 0], [0, 0, 0], mug);
  add(new THREE.TorusGeometry(0.055, 0.017, 10, 24), { color: COL.pop, rim: 0.5 }, { outline: 0.5 }, [0.1, 0.11, 0], [0, 0, 0], mug);
  add(new THREE.CircleGeometry(0.08, 20), { color: 0x4a2a18, hatch: 0 }, { cast: false }, [0, 0.19, 0], [-Math.PI / 2, 0, 0], mug);
  W.mug = mug;
  const cup = new THREE.Group(); cup.position.set(-1.35, 0, -0.1); g.add(cup);
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 20, 1, true), { color: COL.navy, side: THREE.DoubleSide }, { outline: 0.7 }, [0, 0.08, 0], [0, 0, 0], cup);
  [[0.02, 0.12, COL.pop], [-0.02, 0.2, COL.gold], [0.0, -0.18, COL.skyL]].forEach(([x, rz, c]) => add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), { color: c }, { outline: 0.4 }, [x, 0.2, 0], [0, 0, rz], cup));
  W.desk = { g, lamp, bulb, shade };
}

function paintPage(ctx, brush, w, h, kind) {
  const r = ctx.rng('page', kind);
  brush.noStroke(); brush.fill('#fff6e0', 255); brush.rect(-5, -5, w + 10, h + 10);
  brush.set('inkpen', '#a9c6da', 0.6); for (let y = 30; y < h; y += 26) brush.line(20, y, w - 20, y);
  brush.set('inkpen', '#1d2a44', 1.3);
  const cx = w / 2, cy = h / 2;
  if (kind === 'cube') { const s = 110, x = cx - 80, y = cy - 30; brush.rect(x, y, s, s); brush.rect(x + 45, y - 45, s, s); brush.line(x, y, x + 45, y - 45); brush.line(x + s, y, x + s + 45, y - 45); brush.line(x, y + s, x + 45, y + s - 45); brush.line(x + s, y + s, x + s + 45, y + s - 45); }
  if (kind === 'honey') { for (const [dx, dy] of [[0, 0], [1.5, 0.866], [1.5, -0.866], [3, 0], [0, 1.732], [3, 1.732], [0, -1.732]]) { const pts = []; for (let k = 0; k <= 6; k++) pts.push([cx - 110 + dx * 42 + 42 * Math.cos(k * Math.PI / 3), cy + dy * 42 + 42 * Math.sin(k * Math.PI / 3)]); brush.spline(pts, 0); } }
  if (kind === 'si') { const s = 130, x = cx - 80, y = cy - 40; brush.rect(x, y, s, s); brush.rect(x + 50, y - 50, s, s); brush.line(x, y, x + 50, y - 50); brush.line(x + s, y, x + s + 50, y - 50); brush.line(x, y + s, x + 50, y + s - 50); brush.line(x + s, y + s, x + s + 50, y + s - 50); brush.line(x + 40, y + 60, x + 80, y + 20); brush.line(x + 80, y + 20, x + 120, y + 60); }
  // scribbled notes (asemic ink lines, no letters)
  brush.set('inkpen', '#3b4a66', 0.7);
  for (let k = 0; k < 4; k++) { const y = 40 + k * 26; let x = 24; while (x < w * 0.45) { const L2 = r.range(14, 40); brush.line(x, y + r.gauss(0, 1), x + L2, y + r.gauss(0, 1)); x += L2 + r.range(6, 12); } }
}

// ---------------------------------------------------------------------------------------------------
// the pneumatic tube: from a brass mouth over the desk, up the wall, along it, down to a brass intake funnel
// over the Planner's station. The funnel carries the enamel plate hand-lettered "TritonDFT".
// ---------------------------------------------------------------------------------------------------
export async function buildTube(W, paintWordFn) {
  const { THREE, scene, add } = W;
  const tri = station(ST.plan);
  const pts = [
    [L.desk.x + 1.02, 1.12, L.desk.z - 0.5], [L.desk.x + 1.06, 1.62, L.desk.z - 0.88], [L.desk.x + 1.3, 2.45, L.wallZ + 0.35],
    [L.desk.x + 2.1, 2.72, L.wallZ + 0.32], [tri[0] - 0.9, 2.72, L.wallZ + 0.32], [tri[0] - 0.25, 2.62, tri[2] - 0.55], [tri[0], 2.1, tri[2] - 0.05],
  ].map((q) => new THREE.Vector3(...q));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const tubeM = { color: COL.skyL, rim: 0.8, hatchMode: 'u', shadeColor: COL.sky, shadeMix: 0.4, seed: 91 };
  add(new THREE.TubeGeometry(curve, 160, 0.09, 14), tubeM, { outline: 0.9, cast: false }, [0, 0, 0], [0, 0, 0]);
  // brass collars every so often
  const brass = { color: COL.gold, hatchMode: 'u', rim: 0.7, shadeColor: 0x9a5a2a, shadeMix: 0.35 };
  for (const u of [0.12, 0.3, 0.5, 0.7, 0.88]) {
    const p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const m = add(new THREE.TorusGeometry(0.1, 0.03, 8, 24), brass, { outline: 0.5, cast: false }, [p.x, p.y, p.z]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t);
  }
  // the desk-end mouth (a flared brass ring pointing down at the desk)
  const m0 = curve.getPointAt(0), t0 = curve.getTangentAt(0);
  const mouth = add(new THREE.CylinderGeometry(0.1, 0.16, 0.14, 24, 1, true), { ...brass, side: THREE.DoubleSide }, { outline: 0.8 }, [m0.x, m0.y, m0.z]);
  mouth.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), t0.clone().negate());
  // the intake funnel over the Planner (opening downwards) + the enamel name plate
  const m1 = curve.getPointAt(1);
  const fun = new THREE.Group(); fun.position.copy(m1); scene.add(fun);
  add(new THREE.CylinderGeometry(0.09, 0.3, 0.34, 32, 1, true), { ...brass, side: THREE.DoubleSide }, { outline: 1.0 }, [0, -0.17, 0], [0, 0, 0], fun);
  add(new THREE.TorusGeometry(0.3, 0.025, 8, 40), brass, { outline: 0.6 }, [0, -0.34, 0], [Math.PI / 2, 0, 0], fun);
  const plateTex = await bake(THREE, { width: 1024, height: 300, seed: 41, key: 'plate-v2', background: '#ffffff' }, (p, brush, w, h) => {
    brush.noStroke(); brush.fill('#0284c7', 255); brush.fillBleed(0.004); brush.fillTexture(0.15, 0.2);
    const rr = 50; const pts = []; for (let k = 0; k < 40; k++) { const a = k / 40 * TAU, cx = a < Math.PI / 2 || a > 1.5 * Math.PI ? w - rr - 14 : rr + 14, cy = a < Math.PI ? h - rr - 14 : rr + 14; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    brush.polygon(pts); brush.polygon(pts);
    brush.set('bigink', '#fff6e0', 1.2); brush.beginShape(0.3); pts.forEach(([a, b]) => brush.vertex(a + (w / 2 - a) * 0.04, b + (h / 2 - b) * 0.1)); brush.endShape(true);
    paintWordFn(brush, 'TRITONDFT', w / 2, h / 2 + 4, 100, { fill: '#fff6e0', shade: '#bfe6f7', ink: '#0b3558', extrude: [0.04, 0.05], jaunt: 0.08, bounce: 0.05, skew: -0.08, gap: 0.12 });
    for (const x of [34, w - 34]) { brush.noStroke(); brush.fill('#e9b04f', 255); brush.circle(x, h / 2, 12, 0.1); }
  });
  const plate = add(new THREE.PlaneGeometry(0.75, 0.22), { color: 0xffffff, map: plateTex, rim: 0.3, hatch: 0.4, toneBias: 0.08, side: THREE.DoubleSide }, { outline: 0.6 }, [m0.x - 0.95, m0.y + 0.2, m0.z - 0.05], [-0.05, 0.08, -0.02]);
  add(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 8), brass, { outline: 0.4, cast: false }, [m0.x - 0.3, m0.y + 0.22, m0.z - 0.07], [0, 0, Math.PI / 2]);
  W.tube = { curve, mouth, fun, plate, len: curve.getLength() };
  // the travelling bulge (a slightly fatter sleeve that slides along the tube)
  W.tube.bulge = add(new THREE.SphereGeometry(0.15, 20, 14), tubeM, { outline: 0.8, cast: false }, [0, 0, 0]);
  W.tube.bulge.visible = false;
}

/** add(geo, matOpts | [matOpts...], {outline, cast, glass}, pos, rot, parent): registers a mesh with npr.
 *  Identical material options share ONE material (npr allows 253 surface ids); pass `unique: true` in the options
 *  for a material whose uniforms are animated per frame (faces, colour changes). */
export function makeAdder(THREE, npr, scene) {
  const cache = new Map();
  const keyOf = (o) => JSON.stringify(o, (k, v) => (v && v.isTexture ? 'tex:' + v.uuid : v));
  const mat = (o) => {
    if (o.unique) { const { unique, ...rest } = o; return npr.surface(rest); }
    const k = keyOf(o);
    if (!cache.has(k)) cache.set(k, npr.surface(o));
    return cache.get(k);
  };
  return (geo, mo, ao = {}, pos = [0, 0, 0], rot = [0, 0, 0], parent = scene) => {
    const m = npr.add(new THREE.Mesh(geo, Array.isArray(mo) ? mo.map(mat) : mat(mo)), ao);
    m.position.set(...pos); m.rotation.set(...rot); parent.add(m); return m;
  };
}
