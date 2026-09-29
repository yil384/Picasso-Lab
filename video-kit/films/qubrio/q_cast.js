// q_cast.js - the cast, built from primitives and rendered through npr (matte brass / enamel, engraved hatching,
// thick hull ink; never glossy plastic). Each builder returns a handle with the meshes a pose function drives.
// Faces are NOT baked into textures: they are 2D ink drawn in each head's tangent plane (q_ink.js drawFace).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const cyl = (r0, r1, h, n = 32, open = false) => new THREE.CylinderGeometry(r0, r1, h, n, 1, open);

export function makeAdder(npr, scene) {
  return (geo, mo, ao = {}, pos = [0, 0, 0], rot = [0, 0, 0], parent = scene) => {
    const m = npr.add(new THREE.Mesh(geo, mo.isMaterial ? mo : Array.isArray(mo) ? mo.map((o) => npr.surface(o)) : npr.surface(mo)), ao);   // (pass a material to share its surface id)
    m.position.set(...pos); m.rotation.set(...rot); parent.add(m); return m;
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Pip - the Placement agent: a drafting compass. Round enamel head (its face), brass hinge, a steel needle leg and
// an amber pencil leg. It walks by pivoting on one leg; it measures by swinging the pencil round the needle: the
// arc it draws IS the interaction distance r.
// ---------------------------------------------------------------------------------------------------------------
export function buildCompass(add, scene, o = {}) {
  const C = { group: new THREE.Group() }; scene.add(C.group);
  const brass = { color: 0xe6ad42, hatchMode: 'u', spec: 0.35, rim: 0.8, shadeColor: 0x9a5a2a, shadeMix: 0.3 };
  C.headG = new THREE.Group(); C.group.add(C.headG);
  C.head = add(new THREE.SphereGeometry(o.headR ?? 0.36, 44, 30), { color: o.color ?? 0x8b5cf6, hatchMode: 'v', rim: 1, spec: 0, seed: 2.2, shadeColor: 0x3b1f8a, shadeMix: 0.35 }, { outline: 1.25 }, [0, 0.3, 0], [0, 0, 0], C.headG);
  add(cyl(0.2, 0.2, 0.09, 36), brass, { outline: 0.8 }, [0, -0.04, 0], [0, 0, 0], C.headG);            // collar
  add(cyl(0.07, 0.09, 0.28, 20), brass, { outline: 0.7 }, [0, 0.76, 0], [0, 0, 0], C.headG);            // handle
  add(new THREE.SphereGeometry(0.1, 20, 14), brass, { outline: 0.7 }, [0, 0.93, 0], [0, 0, 0], C.headG);
  C.hinge = add(cyl(0.13, 0.13, 0.12, 28), brass, { outline: 0.8 }, [0, 0, 0], [Math.PI / 2, 0, 0], C.headG);
  const legGeo = cyl(0.065, 0.045, 1, 18); legGeo.translate(0, -0.5, 0);
  C.legN = add(legGeo, { color: 0xb8c0d8, hatchMode: 'u', spec: 0.5, rim: 0.7 }, { outline: 0.9 });
  C.legP = add(legGeo, brass, { outline: 0.9 });
  const tipGeo = new THREE.ConeGeometry(0.055, 0.2, 18); tipGeo.rotateX(Math.PI); tipGeo.translate(0, -0.1, 0);
  C.tipN = add(tipGeo, { color: 0x4a4a62, spec: 0.5 }, { outline: 0.6 });
  C.tipP = add(tipGeo, { color: 0xf2a922, hatchMode: 'u' }, { outline: 0.6 });
  C.lead = add(new THREE.ConeGeometry(0.024, 0.07, 12).rotateX(Math.PI).translate(0, -0.035, 0), { color: 0x2b2447 }, { outline: 0.3 });
  C.legLen = o.legLen ?? 1.2;
  return C;
}
/**
 * Pose the compass. P = { hip:[x,y,z] (hinge), N:[x,z] needle foot, Pn:[x,z] pencil foot, liftN, liftP, lean, yaw, sq }
 * Legs are straight rods from the hinge to the feet (length follows), the head sits on the hinge.
 */
export function poseCompass(C, P) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const hip = V(...P.hip);
  C.headG.position.copy(hip);
  C.headG.rotation.set(P.tilt ?? 0, P.yaw ?? 0, P.lean ?? 0);
  const sq = P.sq ?? 0;
  C.headG.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
  const legTo = (leg, tip, foot, lead) => {
    const dir = foot.clone().sub(hip); const L = dir.length(); dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), dir);
    leg.position.copy(hip); leg.quaternion.copy(q); leg.scale.set(1, Math.max(0.05, L - 0.2), 1);
    tip.position.copy(hip).addScaledVector(dir, L - 0.2); tip.quaternion.copy(q);
    if (lead) { lead.position.copy(foot).addScaledVector(dir, -0.07); lead.quaternion.copy(q); }
  };
  legTo(C.legN, C.tipN, V(P.N[0], P.liftN ?? 0, P.N[1]));
  legTo(C.legP, C.tipP, V(P.Pn[0], P.liftP ?? 0, P.Pn[1]), C.lead);
}

// ---------------------------------------------------------------------------------------------------------------
// Tick - the Optimize agent: a brass stopwatch. The cream dial is its face; two hands on the dial; a red crown
// button; stubby legs with red shoes; ink-dark arms with cream gloves. Round silhouette.
// ---------------------------------------------------------------------------------------------------------------
export function buildWatch(add, scene, o = {}) {
  const W = { group: new THREE.Group() }; scene.add(W.group);
  const brass = { color: 0xe6ad42, hatchMode: 'u', spec: 0.35, rim: 0.9, shadeColor: 0x9a5a2a, shadeMix: 0.3 };
  const R = o.R ?? 0.62;
  W.R = R;
  W.body = new THREE.Group(); W.body.position.set(0, R + 0.42, 0); W.group.add(W.body);
  add(cyl(R, R, 0.26, 56), brass, { outline: 1.2 }, [0, 0, 0], [Math.PI / 2, 0, 0], W.body);
  add(new THREE.TorusGeometry(R * 0.95, 0.06, 14, 60), brass, { outline: 0.8 }, [0, 0, 0.13], [0, 0, 0], W.body);
  // the dial is the hero readout: keep it a clean cream in any light (flat, no hatching, light dots only)
  W.dial = add(new THREE.CircleGeometry(R * 0.88, 60), { color: 0xfff8e6, flat: 0.7, hatch: 0, halftone: 0.25, toneBias: 0.3, spec: 0, rim: 0.4 }, { outline: 0 }, [0, 0, 0.134], [0, 0, 0], W.body);
  // hour ticks (engraved little bars), one surface
  add(mergeGeometries(Array.from({ length: 12 }, (_, i) => {
    const a = i / 12 * TAU, r0 = R * (i % 3 ? 0.74 : 0.68);
    return new THREE.BoxGeometry(0.03, R * 0.12 * (i % 3 ? 0.7 : 1.1), 0.01).rotateZ(-a).translate(Math.sin(a) * r0, Math.cos(a) * r0, 0);
  })), { color: 0x1a1530, flat: 0.8, hatch: 0, rim: 0 }, { outline: 0, cast: false }, [0, 0, 0.138], [0, 0, 0], W.body);
  const handGeo = new THREE.BoxGeometry(0.05, R * 0.72, 0.02); handGeo.translate(0, R * 0.3, 0);
  W.hand = add(handGeo, { color: 0x7c3aed, flat: 0.35, hatch: 0 }, { outline: 0.5, cast: false }, [0, 0, 0.15], [0, 0, 0], W.body);
  W.ghost = add(handGeo, { color: 0x8d86a3, flat: 0.6, hatch: 0 }, { outline: 0.35, cast: false }, [0, 0, 0.145], [0, 0, 0], W.body);   // PowerMove's hand: pencil grey
  W.ghost.visible = false;
  add(new THREE.SphereGeometry(0.06, 16, 12), { color: 0x7c3aed }, { outline: 0.4, cast: false }, [0, 0, 0.16], [0, 0, 0], W.body);
  add(cyl(0.07, 0.07, 0.12, 20), brass, { outline: 0.6 }, [0, R + 0.08, 0], [0, 0, 0], W.body);
  W.crown = add(cyl(0.13, 0.13, 0.1, 28), { color: 0x7c3aed, rim: 0.7, hatchMode: 'u' }, { outline: 0.8 }, [0, R + 0.18, 0], [0, 0, 0], W.body);
  add(new THREE.TorusGeometry(0.12, 0.035, 12, 36), brass, { outline: 0.6 }, [0, R + 0.34, 0], [0, 0, 0], W.body);
  // arms (groups at the shoulders; rotate z to raise), gloves
  const armGeo = new THREE.CapsuleGeometry(0.055, 0.42, 6, 14); armGeo.translate(0, -0.27, 0);
  W.arms = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * R * 0.98, 0.02, 0.06); W.body.add(g);
    add(armGeo, { color: 0x2b2447, hatchMode: 'v' }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], g);
    const glove = add(new THREE.SphereGeometry(0.11, 22, 14), { color: 0xfffbf2, rim: 1, toneBias: 0.1 }, { outline: 0.9 }, [0, -0.58, 0], [0, 0, 0], g);
    return { g, glove, s };
  });
  // legs + shoes
  const legGeo = new THREE.CapsuleGeometry(0.065, 0.26, 6, 14);
  W.legs = [-1, 1].map((s) => {
    const l = add(legGeo, { color: 0x2b2447, hatchMode: 'v' }, { outline: 0.8 }, [s * 0.2, 0.26, 0], [0, 0, 0], W.group);
    const sh = add(new THREE.SphereGeometry(0.13, 22, 14), { color: 0x7c3aed, rim: 1 }, { outline: 0.9 }, [s * 0.24, 0.05, 0.06], [0, 0, 0], W.group);
    sh.scale.set(1.2, 0.6, 1.5);
    return { l, sh, s };
  });
  return W;
}
/** P = { x, z, y (hop), yaw, sq, rock, armL, armR (rad, 0 = down, + = up/out), hand (turns), ghost (turns|null), crown (0..1 press) } */
export function poseWatch(W, P) {
  W.group.position.set(P.x, P.y ?? 0, P.z);
  W.group.rotation.set(0, P.yaw ?? 0, 0);
  const sq = P.sq ?? 0;
  W.body.position.y = W.R + 0.42 - sq * 0.25;
  W.body.rotation.set(P.bow ?? 0, 0, P.rock ?? 0);
  W.body.scale.set(1 + sq * 0.45, 1 - sq, 1 + sq * 0.45);
  W.arms[0].g.rotation.set(0, 0, -(P.armL ?? 0.3));
  W.arms[1].g.rotation.set(0, 0, P.armR ?? 0.3);
  W.hand.rotation.z = -TAU * (P.hand ?? 0);
  W.ghost.visible = P.ghost != null;
  if (P.ghost != null) W.ghost.rotation.z = -TAU * P.ghost;
  W.crown.position.y = W.R + 0.18 - 0.06 * (P.crown ?? 0);
  for (const L of W.legs) { L.l.scale.y = 1 - sq * 0.6; L.l.position.y = 0.26 - sq * 0.08; }
}

// ---------------------------------------------------------------------------------------------------------------
// Slo - the PowerMove baseline: a putty snail with a slate shell, ferrying ONE atom at a time (scalar routing).
// Dull colours on purpose (the heroes are saturated). Local +x = forward. After reference/story-picturebook.
// ---------------------------------------------------------------------------------------------------------------
function shellGeometry({ turns = 2.35, b = 0.17, Rout = 0.2, endA = -1.2, cone = 0.09, N = 160, M = 20 } = {}) {
  const thMax = turns * TAU, k = (1 - Math.exp(-TAU * b)) / (1 + Math.exp(-TAU * b));
  const off = endA - thMax;
  const P = (th) => { const R = Rout * Math.exp(b * (th - thMax)); return new THREE.Vector3(R * Math.cos(th + off), R * Math.sin(th + off), cone * (1 - th / thMax)); };
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const th = thMax * i / N;
    const R = Rout * Math.exp(b * (th - thMax)), r = Math.max(0.003, R * k * 1.04);
    const p = P(th), T = P(th + 0.01).sub(p).normalize();
    const Nn = new THREE.Vector3(-T.y, T.x, 0).normalize(), B = new THREE.Vector3().crossVectors(T, Nn);
    for (let j = 0; j <= M; j++) {
      const ph = TAU * j / M;
      const q = p.clone().addScaledVector(Nn, r * Math.cos(ph)).addScaledVector(B, r * Math.sin(ph));
      pos.push(q.x, q.y, q.z); uv.push(i / N * turns * 3, j / M);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b2 = a + M + 1; idx.push(a, a + 1, b2, b2, a + 1, b2 + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
export function buildSnail(add, scene, { scale = 1.4, atomGeo = null, atomMat = null } = {}) {
  const S = { group: new THREE.Group() }; scene.add(S.group);
  S.group.scale.setScalar(scale);
  S.body = new THREE.Group(); S.group.add(S.body);
  const putty = { color: 0xd9d0bf, rim: 1, toneBias: 0.05, hatchMode: 'planar', hatchDir: [0, 1, 0.2], seed: 4.4 };
  const footGeo = new THREE.CapsuleGeometry(0.12, 0.62, 8, 22); footGeo.rotateZ(Math.PI / 2);
  S.foot = add(footGeo, putty, { outline: 1.0 }, [0, 0.1, 0], [0, 0, 0], S.body); S.foot.scale.set(1, 0.72, 0.95);
  add(new THREE.CapsuleGeometry(0.1, 0.16, 6, 18), putty, { outline: 0.9 }, [0.36, 0.2, 0], [0, 0, -0.55], S.body);
  S.head = add(new THREE.SphereGeometry(0.17, 32, 22), { ...putty, seed: 5.1 }, { outline: 1.0 }, [0.45, 0.33, 0], [0, 0, 0], S.body);
  S.stalks = [-1, 1].map((s) => {
    const sg = new THREE.Group(); sg.position.set(0.47, 0.46, s * 0.07); S.body.add(sg);
    const stalkGeo = new THREE.CylinderGeometry(0.018, 0.026, 0.26, 12); stalkGeo.translate(0, 0.13, 0);
    add(stalkGeo, putty, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], sg);
    add(new THREE.SphereGeometry(0.045, 14, 10), { color: 0x8e86a8, rim: 1 }, { outline: 0.6 }, [0, 0.27, 0], [0, 0, 0], sg);
    sg.rotation.set(s * 0.25, 0, -0.3); return { g: sg, s };
  });
  S.shellG = new THREE.Group(); S.shellG.position.set(-0.08, 0.34, 0); S.body.add(S.shellG);
  S.shell = add(shellGeometry(), { color: 0x9a92b0, hatchMode: 'u', hatch: 0.5, rim: 1, spec: 0.3, toneBias: 0.1, seed: 6.2, noiseScale: 1.2 }, { outline: 1.1 }, [0, 0, 0], [0, 0, 0], S.shellG);
  // cargo: two atoms riding on the shell (PowerMove moves ~1.7 qubits per AOD move)
  S.cargo = atomGeo ? [-0.13, 0.13].map((dz, i) => { const m = add(atomGeo, atomMat(i), { cast: true, outline: 0.9 }, [0.02, 0.44, dz], [0, 0, 0], S.shellG); m.scale.setScalar(0.72 / scale); return m; }) : [];
  return S;
}
/** P = { x, y, z, yaw, lean, sq, st (stretch), sway, stalk } */
export function poseSnail(S, P) {
  S.group.position.set(P.x, P.y ?? 0, P.z);
  S.group.rotation.set(0, P.yaw ?? 0, P.lean ?? 0);
  const sq = P.sq ?? 0, st = P.st ?? 0;
  S.body.scale.set(1 + st - sq * 0.3, 1 - st * 0.45 - sq, 1 + sq * 0.4);
  S.shellG.rotation.z = P.sway ?? 0;
  for (const s of S.stalks) s.g.rotation.set(s.s * 0.25, 0, -0.3 + (P.stalk ?? 0));
}

// ---------------------------------------------------------------------------------------------------------------
// Rook - the Routing agent: a toy locomotive (teal boiler, red cab roof, brass bands). It rides the side track and
// tows the AOD: the amber AOD row lines run from its coupling across the plate, so when Rook moves, the whole
// convoy moves as one. Local +x = forward. The cab's round front plate is its face.
// ---------------------------------------------------------------------------------------------------------------
export function buildLoco(add, scene, { scale = 1 } = {}) {
  const L = { group: new THREE.Group() }; scene.add(L.group);
  L.group.scale.setScalar(scale);
  L.body = new THREE.Group(); L.group.add(L.body);
  const B = L.body;
  const teal = { color: 0x7c3aed, hatchMode: 'u', rim: 1, spec: 0.35, shadeColor: 0x3b1f8a, shadeMix: 0.35 };
  const brass = { color: 0xe6ad42, hatchMode: 'u', spec: 0.35 };
  add(cyl(0.34, 0.34, 0.95, 40), teal, { outline: 1.15 }, [0.2, 0.58, 0], [0, 0, Math.PI / 2], B);
  for (const x of [-0.08, 0.42]) add(new THREE.TorusGeometry(0.345, 0.03, 10, 44), brass, { outline: 0.5 }, [x, 0.58, 0], [0, Math.PI / 2, 0], B);
  add(cyl(0.36, 0.36, 0.14, 40), { color: 0x3b1f8a, hatchMode: 'u' }, { outline: 0.9 }, [0.72, 0.58, 0], [0, 0, Math.PI / 2], B);
  L.plate = add(cyl(0.29, 0.29, 0.03, 40), { color: 0xfff0dc, hatch: 0.4, toneBias: 0.25, spec: 0 }, { outline: 0.8 }, [0.8, 0.58, 0], [0, 0, Math.PI / 2], B);
  const chim = new THREE.LatheGeometry([[0.001, 0], [0.1, 0], [0.09, 0.18], [0.11, 0.3], [0.18, 0.38], [0.18, 0.44], [0.001, 0.44]].map(([x, y]) => new THREE.Vector2(x, y)), 32);
  add(chim, { color: 0x3b3552, hatchMode: 'v', spec: 0.4 }, { outline: 1 }, [0.55, 0.86, 0], [0, 0, 0], B);
  add(new THREE.SphereGeometry(0.13, 22, 14), brass, { outline: 0.8 }, [0.18, 0.9, 0], [0, 0, 0], B).scale.set(1, 0.8, 1);
  add(new THREE.BoxGeometry(0.58, 0.64, 0.72), { ...teal, hatchMode: 'planar', hatchDir: [0, 1, 0] }, { outline: 1.1 }, [-0.5, 0.64, 0], [0, 0, 0], B);
  // cab windows (cream insets) + nameplate board on the cab side (lettered in 2D)
  for (const z of [-0.365, 0.365]) add(new THREE.BoxGeometry(0.3, 0.22, 0.01), { color: 0xfff3dc, flat: 0.4, hatch: 0 }, { outline: 0.5, cast: false }, [-0.5, 0.78, z], [0, 0, 0], B);
  L.names = [0.37, -0.37].map((zz) => add(new THREE.BoxGeometry(0.68, 0.27, 0.014), { color: 0xf2c14a, hatch: 0, flat: 0.6, toneBias: 0.3, spec: 0 }, { outline: 0.8, cast: false }, [-0.5, 0.46, zz], [0, 0, 0], B));   // big ochre plates: the film's only title
  add(new THREE.BoxGeometry(0.78, 0.09, 0.88), { color: 0xf2a922, hatchDir: [1, 0, 0] }, { outline: 1 }, [-0.5, 1.0, 0], [0, 0, 0], B);
  add(cyl(0.045, 0.045, 0.16, 14), brass, { outline: 0.6 }, [-0.3, 1.12, 0], [0, 0, 0], B);
  L.whistleTip = new THREE.Object3D(); L.whistleTip.position.set(-0.3, 1.22, 0); B.add(L.whistleTip);
  L.chimTop = new THREE.Object3D(); L.chimTop.position.set(0.55, 1.32, 0); B.add(L.chimTop);
  add(new THREE.BoxGeometry(1.72, 0.13, 0.62), { color: 0x3b3552 }, { outline: 0.9 }, [0.05, 0.27, 0], [0, 0, 0], L.group);
  add(new THREE.BoxGeometry(0.09, 0.15, 0.7), { color: 0xf2a922 }, { outline: 0.8 }, [0.92, 0.27, 0], [0, 0, 0], L.group);
  L.coupler = new THREE.Object3D(); L.coupler.position.set(-0.95, 0.28, 0); L.group.add(L.coupler);
  L.wheels = [];
  for (const [x, rr] of [[-0.42, 0.22], [0.06, 0.22], [0.56, 0.15]]) for (const z of [-0.33, 0.33]) {
    const wg = new THREE.Group(); wg.position.set(x, rr, z); L.group.add(wg);
    add(cyl(rr, rr, 0.08, 28), { color: 0xf2a922, hatchMode: 'u', rim: 1 }, { outline: 0.8 }, [0, 0, 0], [Math.PI / 2, 0, 0], wg);
    add(new THREE.BoxGeometry(rr * 1.8, 0.045, 0.1), { color: 0xfff0dc }, { outline: 0.4 }, [0, 0, 0], [0, 0, 0], wg);
    L.wheels.push({ g: wg, r: rr });
  }
  // steam puffs: a small pool of three-ball clouds
  L.puffs = [];
  // one merged three-ball cloud; all puffs share one matte surface (round, clean, no crack-like hatching)
  const puffGeo = new THREE.SphereGeometry(1, 36, 20);   // one smooth 3-lobe cloud (no sphere seams for the ink to crease on)
  { const pp = puffGeo.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), a = Math.atan2(y, x);
      const r = 1 + 0.16 * Math.cos(3 * a + 0.5) * (1 - Math.abs(z)); pp.setXYZ(i, x * r * 1.35, y * r * 0.85 - 0.08 * (y < 0 ? 1 : 0), z * r * 0.8); }
    puffGeo.computeVertexNormals(); }
  let puffMat = null;
  for (let k = 0; k < 8; k++) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const m = add(puffGeo, puffMat || { color: 0xfffaf0, hatch: 0, halftone: 0, toneBias: 0.5, spec: 0, rim: 0.5, flat: 0.85 }, { cast: false, outline: 0.9 }, [0, 0, 0], [0, 0, 0], g);
    puffMat = m.material;
    L.puffs.push(g);
  }
  return L;
}
/** P = { x, z, yaw, dy, tilt, sq, dist (travelled, for the wheels) } */
export function poseLoco(L, P) {
  L.group.position.set(P.x, P.y ?? 0, P.z);
  L.group.rotation.set(0, P.yaw ?? 0, 0);
  L.body.position.y = P.dy ?? 0;
  L.body.rotation.z = P.tilt ?? 0;
  const sq = P.sq ?? 0;
  L.body.scale.set(1 + sq * 0.4, 1 - sq, 1 + sq * 0.4);
  for (const w of L.wheels) w.g.rotation.z = -(P.dist ?? 0) / w.r;
}

// ---------------------------------------------------------------------------------------------------------------
// Loupe - the Verifier: a brass magnifying glass that walks on its handle-tripod, with a red referee whistle on a
// cord. The lens rim is its head; its eyes sit on the glass (drawn in 2D). It checks every step and flags the exact
// constraint that failed (red ink circle + a step tag).
// ---------------------------------------------------------------------------------------------------------------
export function buildLoupe(add, npr, scene, { scale = 1 } = {}) {
  const L = { group: new THREE.Group() }; scene.add(L.group);
  L.group.scale.setScalar(scale);
  L.tilt = new THREE.Group(); L.group.add(L.tilt);
  const brass = { color: 0xe6ad42, hatchMode: 'u', spec: 0.35, rim: 0.9, shadeColor: 0x9a5a2a, shadeMix: 0.3 };
  L.rimR = 0.46;
  L.head = new THREE.Group(); L.head.position.set(0, 1.18, 0); L.tilt.add(L.head);
  add(new THREE.TorusGeometry(L.rimR, 0.075, 16, 60), brass, { outline: 1.15 }, [0, 0, 0], [0, 0, 0], L.head);
  L.lensBack = add(new THREE.CircleGeometry(L.rimR - 0.02, 48), { color: 0xd8ecf2, flat: 0.25, hatch: 0.15, toneBias: 0.25, spec: 0, rim: 0, side: THREE.DoubleSide }, { outline: 0, cast: false }, [0, 0, -0.005], [0, 0, 0], L.head);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(L.rimR - 0.02, 48), npr.glass({ tint: 0xe6f6ff, edge: 0.8, alpha: 1.2, glint: 1.4 }));
  glass.position.set(0, 0, 0.01); npr.add(glass, { glass: true }); L.head.add(glass);
  // handle down to the "hips", then two little legs + feet
  add(cyl(0.07, 0.085, 0.62, 20), { color: 0x7a3b2a, hatchMode: 'u', rim: 0.8 }, { outline: 0.9 }, [0, 0.57, 0], [0, 0, 0], L.tilt);
  add(cyl(0.1, 0.1, 0.08, 20), brass, { outline: 0.7 }, [0, 0.9, 0], [0, 0, 0], L.tilt);
  L.legs = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.07, 0.28, 0); L.group.add(g);
    const lg = new THREE.CapsuleGeometry(0.045, 0.16, 5, 12); lg.translate(0, -0.12, 0);
    add(lg, { color: 0x2b2447 }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], g);
    const ft = add(new THREE.SphereGeometry(0.1, 18, 12), { color: 0x2b2447, rim: 1 }, { outline: 0.8 }, [0.02 * s, -0.25, 0.05], [0, 0, 0], g);
    ft.scale.set(1.1, 0.55, 1.5);
    return g;
  });
  // arms from the rim, one holding the red whistle
  const armGeo = new THREE.CapsuleGeometry(0.04, 0.34, 5, 12); armGeo.translate(0, -0.21, 0);
  L.arms = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * (L.rimR + 0.03), -0.18, 0); L.head.add(g);
    add(armGeo, { color: 0x2b2447 }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], g);
    add(new THREE.SphereGeometry(0.075, 16, 12), { color: 0xfffbf2, rim: 1 }, { outline: 0.8 }, [0, -0.44, 0], [0, 0, 0], g);
    return { g, s };
  });
  L.whistle = new THREE.Group(); L.whistle.position.set(0, -0.46, 0.06); L.arms[1].g.add(L.whistle);
  add(cyl(0.06, 0.06, 0.18, 18), { color: 0xf2a922, rim: 0.8 }, { outline: 0.7 }, [0, 0, 0], [0, 0, Math.PI / 2], L.whistle);
  add(new THREE.SphereGeometry(0.075, 16, 12), { color: 0xf2a922 }, { outline: 0.7 }, [0.07, -0.04, 0], [0, 0, 0], L.whistle);
  L.whistleTip = new THREE.Object3D(); L.whistleTip.position.set(-0.12, 0, 0); L.whistle.add(L.whistleTip);
  return L;
}
/** P = { x, z, y, yaw, lean, sq, armL, armR, headTilt } */
export function poseLoupe(L, P) {
  L.group.position.set(P.x, P.y ?? 0, P.z);
  L.group.rotation.set(0, P.yaw ?? 0, 0);
  L.tilt.rotation.set(P.pitch ?? 0, 0, P.lean ?? 0);
  const sq = P.sq ?? 0;
  L.tilt.scale.set(1 + sq * 0.4, 1 - sq, 1 + sq * 0.4);
  L.head.rotation.set(P.headTilt ?? 0, 0, 0);
  L.arms[0].g.rotation.set(0, 0, -(P.armL ?? 0.2));
  L.arms[1].g.rotation.set(0, 0, P.armR ?? 0.2);
}

// ---------------------------------------------------------------------------------------------------------------
// Props for the payoff: the fidelity gauge (a thermometer: glass tube, violet column, brass bulb cap; a dashed
// PowerMove mark at height hPM, the column at fid * hPM) and a pennant that pops out of Tick's crown ("4.7x" is
// hand-lettered onto it in 2D, in the flag's own plane).
// ---------------------------------------------------------------------------------------------------------------
export function buildGauge(add, npr, scene, { hPM = 1.0, x = 0, z = 0, yaw = 0 } = {}) {
  // the fidelity readout: two fat tubes side by side on one brass plinth - PowerMove's column (Slo's grey-lilac) and
  // Qubrio's (violet) - with a bold ink bar at PowerMove's level, so 1.3x reads as a plain height comparison at card size.
  // Each tube is drawn as its pale inner back wall (open cylinder, back faces) with an ink hull: reads as a glass tube
  // without default transparency, and the column in front of that wall stays fully visible.
  const G = { group: new THREE.Group(), hPM, base: 0.6, dx: 0.3 }; scene.add(G.group);   // columns start at the bulb tops: the visible heights compare 1 : 1.3
  G.group.position.set(x, 0, z); G.group.rotation.y = yaw;
  const brass = { color: 0xe6ad42, hatchMode: 'u', spec: 0.2, rim: 0.8 };
  add(new THREE.BoxGeometry(1.2, 0.16, 0.62), brass, { outline: 1.0 }, [0, 0.08, 0], [0, 0, 0], G.group);
  const colGeo = cyl(0.15, 0.15, 1, 24); colGeo.translate(0, 0.5, 0);
  const wallGeo = cyl(0.23, 0.23, 1.75, 32, true); wallGeo.translate(0, 0.775 - 0.2, 0);   // the glass reaches down into the bulb
  let wallMat = null;
  const tube = (dx, col, shade) => {
    add(new THREE.SphereGeometry(0.24, 28, 18), { color: col, rim: 1, spec: 0, shadeColor: shade, shadeMix: 0.3 }, { outline: 1.0 }, [dx, 0.36, 0], [0, 0, 0], G.group);
    const c = add(colGeo, { color: col, rim: 0.8, spec: 0, flat: 0.25, shadeColor: shade, shadeMix: 0.35, halftone: 1 }, { outline: 0.8, cast: false }, [dx, G.base, 0], [0, 0, 0], G.group);
    const w = add(wallGeo, wallMat || { color: 0xeee8fb, flat: 0.55, hatch: 0, halftone: 0.2, spec: 0, rim: 0, side: THREE.BackSide }, { outline: 1.2, cast: false }, [dx, G.base, 0], [0, 0, 0], G.group);
    wallMat = w.material;
    add(cyl(0.26, 0.26, 0.08, 28), brass, { outline: 0.8 }, [dx, G.base + 1.58, 0], [0, 0, 0], G.group);
    return c;
  };
  G.colPM = tube(-G.dx, 0xa39bb8, 0x5d5575);
  G.col = tube(G.dx, 0x8b5cf6, 0x4b2a9e);
  // PowerMove's level: one bold ink bar across both tubes, with a grey-lilac cap (the only mark on the gauge)
  G.pm = add(new THREE.BoxGeometry(1.0, 0.07, 0.07), { color: 0x1a1530, flat: 0.8, hatch: 0 }, { outline: 0.4, cast: false }, [0, G.base + hPM, 0.26], [0, 0, 0], G.group);
  add(new THREE.BoxGeometry(0.16, 0.12, 0.08), { color: 0xa39bb8, flat: 0.6 }, { outline: 0.6, cast: false }, [-0.56, 0, 0], [0, 0, 0], G.pm);
  G.top = new THREE.Object3D(); G.group.add(G.top);
  G.pmTop = new THREE.Object3D(); G.group.add(G.pmTop);
  return G;
}
export function poseGauge(G, fid, pm = 1) {
  G.col.scale.set(1, Math.max(0.01, fid * G.hPM), 1);
  G.colPM.scale.set(1, Math.max(0.01, pm * G.hPM), 1);
  G.pm.visible = pm > 0.5;
  G.top.position.set(G.dx, G.base + fid * G.hPM, 0);
  G.pmTop.position.set(-G.dx, G.base + pm * G.hPM, 0);
}
export function buildPennant(add, W) {
  const F = { group: new THREE.Group() }; W.body.add(F.group); F.size = 1.2;
  // the pole springs out of the crown leaning left, so the flag flies level beside the dial's upper-left (one horizontal
  // band: flag | dial | gauge - it fits the wide card)
  F.group.position.set(0, W.R + 0.22, 0); F.group.rotation.z = 0.95;
  const poleGeo = cyl(0.03, 0.03, 0.62, 10); poleGeo.translate(0, 0.31, 0);
  F.pole = add(poleGeo, { color: 0xe6ad42, hatchMode: 'u' }, { outline: 0.6 }, [0, 0, 0], [0, 0, 0], F.group);
  F.tip = new THREE.Group(); F.tip.position.set(0, 0.62, 0); F.tip.rotation.z = -0.95; F.group.add(F.tip);
  // the flag: a cloth plane deformed per frame (wave), hanging from the pole tip and flying left
  const geo = new THREE.PlaneGeometry(1.25, 0.62, 16, 4); geo.translate(-0.625, -0.31, 0);
  F.base = geo.attributes.position.array.slice();
  F.flag = add(geo, { color: 0xffd23f, side: THREE.DoubleSide, rim: 0.5, hatchDir: [0, 1, 0.2], shadeColor: 0xc9861a, shadeMix: 0.4 }, { outline: 1.1, cast: false }, [0, 0.12, 0.0], [0, 0, 0], F.tip);
  F.flag.frustumCulled = false;
  return F;
}
/** k: 0 (inside the crown) .. 1 (fully up), unfurl 0..1, wave phase */
export function posePennant(F, k, unfurl, wave) {
  F.group.visible = k > 0.01;
  F.group.scale.setScalar(Math.max(0.01, k) * F.size);
  const pos = F.flag.geometry.attributes.position, b = F.base;
  for (let i = 0; i < pos.count; i++) {
    const x = b[i * 3], y = b[i * 3 + 1];
    const u = -x / 1.25;
    const w = Math.sin(u * 5 - wave) * 0.09 * u + Math.sin(y * 7 + wave * 0.7) * 0.02 * u;
    pos.setXYZ(i, x * (0.15 + 0.85 * unfurl), y * (0.3 + 0.7 * unfurl) - (1 - unfurl) * 0.2 * u, w * unfurl + (1 - unfurl) * 0.1 * u);
  }
  pos.needsUpdate = true; F.flag.geometry.computeVertexNormals();
}

/** Rook's pencil: built along +y with the graphite tip at the local origin and the eraser at +L */
export function buildPencil(add, scene, { L = 2.2, r = 0.13 } = {}) {
  const Pn = { group: new THREE.Group(), L }; scene.add(Pn.group);
  const body = cyl(r, r, L * 0.62, 6); body.translate(0, L * 0.18 + L * 0.31, 0);
  add(body, { color: 0xf2a922, hatchMode: 'u', rim: 0.7, shadeColor: 0xb8741a, shadeMix: 0.35 }, { outline: 0.9 }, [0, 0, 0], [0, 0, 0], Pn.group);
  const wood = new THREE.ConeGeometry(r, L * 0.18, 6); wood.rotateX(Math.PI); wood.translate(0, L * 0.09, 0);
  add(wood, { color: 0xf3dcb0, hatch: 0.4 }, { outline: 0.8 }, [0, 0, 0], [0, 0, 0], Pn.group);
  const lead = new THREE.ConeGeometry(r * 0.36, L * 0.065, 12); lead.rotateX(Math.PI); lead.translate(0, L * 0.032, 0);
  add(lead, { color: 0x2b2447, flat: 0.5 }, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], Pn.group);
  add(cyl(r * 1.06, r * 1.06, L * 0.08, 16), { color: 0xe6ad42, hatchMode: 'u', spec: 0.2 }, { outline: 0.7 }, [0, L * 0.84, 0], [0, 0, 0], Pn.group);
  add(cyl(r, r, L * 0.12, 16), { color: 0xb48cff, rim: 0.6 }, { outline: 0.8 }, [0, L * 0.94, 0], [0, 0, 0], Pn.group);
  Pn.group.visible = false;
  return Pn;
}
/** place the pencil so its working end touches `tip`, leaning back along `axis`. s.flip 0..1 turns it end-over-end
 *  (through horizontal, about its middle): 0 = graphite tip down, 1 = eraser down. */
export function posePencil(Pn, s, axis) {
  Pn.group.visible = !!s;
  if (!s) return;
  const a = new THREE.Vector3(...axis).normalize(), up = new THREE.Vector3(0, 1, 0);
  const f = s.flip ?? (s.erase ? 1 : 0);
  const side = new THREE.Vector3().crossVectors(a, up); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(up, a).premultiply(new THREE.Quaternion().setFromAxisAngle(side, Math.PI * f));
  Pn.group.quaternion.copy(q);
  // the working end (tip at f=0, eraser at f=1) sits on `tip`: the middle is half a length back along the lean
  const mid = new THREE.Vector3(...s.tip).addScaledVector(a, Pn.L / 2);
  const localMid = new THREE.Vector3(0, Pn.L / 2, 0).applyQuaternion(q);
  Pn.group.position.copy(mid).sub(localMid);
}

/** Tick's slate: the simulator. A small framed drawing board Tick holds up beside itself while optimising; the plan
 *  replays on it as a pencil diagram (drawn in its plane by the ink layer), so the real chip stays untouched. */
export function buildSlate(add, W, { BW = 1.3, BH = 0.95 } = {}) {
  const S = { group: new THREE.Group(), BW, BH }; W.group.add(S.group);
  S.group.position.set(-1.5, 1.05, 0.25); S.group.rotation.set(-0.1, 0.3, 0.04);
  add(new THREE.BoxGeometry(BW + 0.14, BH + 0.14, 0.07), { color: 0x6b4fc9, hatchMode: 'u', rim: 0.6, shadeColor: 0x3b1f8a, shadeMix: 0.3 }, { outline: 1.1 }, [0, 0, -0.02], [0, 0, 0], S.group);
  S.paper = add(new THREE.PlaneGeometry(BW, BH), { color: 0xfff6e0, flat: 0.85, hatch: 0, halftone: 0, toneBias: 0.3, spec: 0, rim: 0 }, { outline: 0, cast: false }, [0, 0, 0.02], [0, 0, 0], S.group);
  add(new THREE.BoxGeometry(0.34, 0.12, 0.06), { color: 0xe6ad42, hatchMode: 'u', rim: 0.7 }, { outline: 0.8, cast: false }, [0, BH / 2 + 0.03, 0.04], [0, 0, 0], S.group);
  S.group.visible = false;
  return S;
}
