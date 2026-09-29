// q_cast.js - the cast, built from primitives and rendered through npr (matte brass / enamel, engraved hatching,
// thick hull ink; never glossy plastic). Each builder returns a handle with the meshes a pose function drives.
// Faces are NOT baked into textures: they are 2D ink drawn in each head's tangent plane (q_ink.js drawFace).
import * as THREE from 'three';

const TAU = Math.PI * 2;
const cyl = (r0, r1, h, n = 32, open = false) => new THREE.CylinderGeometry(r0, r1, h, n, 1, open);

export function makeAdder(npr, scene) {
  return (geo, mo, ao = {}, pos = [0, 0, 0], rot = [0, 0, 0], parent = scene) => {
    const m = npr.add(new THREE.Mesh(geo, Array.isArray(mo) ? mo.map((o) => npr.surface(o)) : npr.surface(mo)), ao);
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
  C.head = add(new THREE.SphereGeometry(o.headR ?? 0.36, 44, 30), { color: o.color ?? 0x8b5cf6, hatchMode: 'v', rim: 1, spec: 0.3, seed: 2.2, shadeColor: 0x3b1f8a, shadeMix: 0.35 }, { outline: 1.25 }, [0, 0.3, 0], [0, 0, 0], C.headG);
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
  W.dial = add(new THREE.CircleGeometry(R * 0.88, 60), { color: 0xfff8e6, hatch: 0.35, toneBias: 0.2, spec: 0, rim: 0.4 }, { outline: 0 }, [0, 0, 0.134], [0, 0, 0], W.body);
  // hour ticks (engraved little bars)
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, r0 = R * (i % 3 ? 0.74 : 0.68);
    const tk = add(new THREE.BoxGeometry(0.03, R * 0.12 * (i % 3 ? 0.7 : 1.1), 0.01), { color: 0x1a1530, flat: 0.8, hatch: 0, rim: 0 }, { outline: 0, cast: false }, [Math.sin(a) * r0, Math.cos(a) * r0, 0.138], [0, 0, -a], W.body);
    void tk;
  }
  const handGeo = new THREE.BoxGeometry(0.05, R * 0.72, 0.02); handGeo.translate(0, R * 0.3, 0);
  W.hand = add(handGeo, { color: 0xe5463b, flat: 0.35, hatch: 0 }, { outline: 0.5, cast: false }, [0, 0, 0.15], [0, 0, 0], W.body);
  W.ghost = add(handGeo, { color: 0xb9a3f0, flat: 0.6, hatch: 0 }, { outline: 0.35, cast: false }, [0, 0, 0.145], [0, 0, 0], W.body);
  W.ghost.visible = false;
  add(new THREE.SphereGeometry(0.06, 16, 12), { color: 0xe5463b }, { outline: 0.4, cast: false }, [0, 0, 0.16], [0, 0, 0], W.body);
  add(cyl(0.07, 0.07, 0.12, 20), brass, { outline: 0.6 }, [0, R + 0.08, 0], [0, 0, 0], W.body);
  W.crown = add(cyl(0.13, 0.13, 0.1, 28), { color: 0xe5463b, rim: 0.7, hatchMode: 'u' }, { outline: 0.8 }, [0, R + 0.18, 0], [0, 0, 0], W.body);
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
    const sh = add(new THREE.SphereGeometry(0.13, 22, 14), { color: 0xe5463b, rim: 1 }, { outline: 0.9 }, [s * 0.24, 0.05, 0.06], [0, 0, 0], W.group);
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
  S.shell = add(shellGeometry(), { color: 0x8e86a8, hatchMode: 'u', hatch: 0.5, rim: 1, spec: 0.3, toneBias: 0.1, seed: 6.2, noiseScale: 1.2 }, { outline: 1.1 }, [0, 0, 0], [0, 0, 0], S.shellG);
  if (atomGeo) { S.cargo = add(atomGeo, atomMat, { cast: true, outline: 0.9 }, [0, 0.46, 0], [0, 0, 0], S.shellG); S.cargo.scale.setScalar(0.8 / scale); }
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
