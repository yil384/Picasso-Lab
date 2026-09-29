// td_cast.js - the cast, built from primitives (matte, inked, comic-shaded). Each builder returns a rig of groups
// that td_story.js poses every frame. Faces are p5.brush textures (td_faces.js) swapped per expression.
//   Tri   (Planner)  : a sky-blue 30-60-90 drafting set-square on stick legs, a vermilion pencil at its apex
//   Clack (Executor) : a sky-blue typewriter: keycap grin, platen-roller brow, carriage-lever arm
//   Loupe (Analyzer) : a magnifying glass: navy rim, one big eye seen through the lens, a wooden handle on feet
//   Tilt  (Refiner)  : a balance scale: sphere head, crossbeam arms, two brass pans (an accuracy gem; up to six pennies
//                      = cost, four once refined)
//   Hoot  (researcher, the manual baseline): a night-owl egg with huge round glasses and a lab coat
import { PAL, COL, TAU, hsh } from './td_core.js';
import { bakeFaces } from './td_faces.js';
import { buildSilicon } from './td_world.js';

const ink = { color: COL.ink, hatch: 0, rim: 0.2, spec: 0 };

/** face configs per character: [paintFace cfg, expressions, bake opts] (also used by face_test.html) */
export const FACES = {
  tri: [{ sphere: false, s: 2.5, ex: 40, ey: -12, my: 40, blush: false }, ['determined', 'squint', 'happy', 'surprised', 'strain', 'grin', 'look'], { W: 512, H: 512, bg: '#ffffff', version: 3 }],
  clack: [{ sphere: false, s: 1.5, ex: 78, ey: -4, my: 34, cy: -12, blush: false }, ['determined', 'squint', 'happy', 'surprised', 'strain', 'grin', 'look'], { W: 512, H: 144, bg: '#ffffff', version: 4 }],
  tilt: [{ sphere: true, s: 1.5, ex: 58, ey: -12, my: 48 }, ['determined', 'squint', 'happy', 'surprised', 'dizzy', 'grin', 'look', 'worried'], { W: 1024, H: 512, version: 3 }],
  hoot: [{ sphere: false, s: 3.4, ex: 30, ey: -8, my: 38, eyeCol: PAL.ink }, ['tired', 'sleep', 'surprised', 'squint', 'happy', 'annoyed', 'look', 'grin', 'blank', 'awake'], { W: 768, H: 512, bg: '#fff1d6', version: 3 }],
};

async function faceSet(W, who, cfg, exprs, o) { return bakeFaces(W.THREE, who, cfg, exprs, o); }

// ---------------------------------------------------------------------------------------------------
export async function buildTri(W) {
  const { THREE, scene, add, npr } = W;
  const R = { root: new THREE.Group() }; scene.add(R.root);
  R.body = new THREE.Group(); R.root.add(R.body);            // lean / squash about the feet
  R.tri = new THREE.Group(); R.tri.position.y = 0.13; R.body.add(R.tri);
  const a = 0.36, hgt = 0.62;
  const sh = new THREE.Shape([new THREE.Vector2(-a / 2, 0), new THREE.Vector2(a / 2, 0), new THREE.Vector2(-a / 2, hgt)]);
  const hole = new THREE.Path([new THREE.Vector2(-a / 2 + 0.06, 0.05), new THREE.Vector2(a / 2 - 0.12, 0.05), new THREE.Vector2(-a / 2 + 0.06, 0.2)].reverse());
  sh.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 4 });
  geo.translate(0, 0, -0.025);
  const id = 240;
  R.faceTex = await faceSet(W, 'tri', ...FACES.tri);
  R.mesh = add(geo, [{ color: COL.sky, id, rim: 0.8, hatchDir: [0.4, 1, 0], shadeColor: COL.navy, shadeMix: 0.35, seed: 11 }, { color: COL.cream, rim: 0.3, hatch: 0.4 }], { outline: 1.0 }, [0, 0, 0], [0, 0, 0], R.tri);
  // face decal on the solid band above the hole (same surface id, so no ink ring round it)
  R.face = add(new THREE.PlaneGeometry(0.26, 0.26), { unique: true, color: COL.sky, id, map: R.faceTex.determined[0], rim: 0.8, hatch: 0.6, seed: 11 }, { cast: false }, [-0.095, 0.34, 0.039], [0, 0, 0], R.tri);
  // ruler ticks along the hypotenuse edge (little ink bars)
  for (let k = 1; k < 9; k++) {
    const t = k / 9, x = a / 2 - t * a, y = t * hgt;
    add(new THREE.BoxGeometry(0.004, k % 3 ? 0.022 : 0.04, 0.004), ink, { cast: false }, [x - 0.012, y - 0.004, 0.04], [0, 0, Math.atan2(hgt, a)], R.tri);
  }
  // pencil at the apex
  R.pencil = new THREE.Group(); R.pencil.position.set(-a / 2 + 0.03, hgt - 0.04, 0.0); R.pencil.rotation.z = -0.5; R.tri.add(R.pencil);
  add(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 6), { color: COL.pop, hatchMode: 'u', rim: 0.6 }, { outline: 0.5 }, [0, 0.0, 0], [0, 0, 0], R.pencil);
  add(new THREE.ConeGeometry(0.018, 0.05, 6), { color: 0xf2d3a0 }, { outline: 0.4 }, [0, 0.125, 0], [0, 0, 0], R.pencil);
  // stick legs, boots; stick arms, mittens (pivots at hips / shoulders)
  const stick = new THREE.CylinderGeometry(0.011, 0.011, 1, 6); stick.translate(0, -0.5, 0);
  R.legs = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.07 - 0.04, 0.14, 0); R.body.add(g);
    add(stick, ink, { outline: 0 }, [0, 0, 0], [0, 0, 0], g).scale.y = 0.12;
    const boot = add(new THREE.SphereGeometry(0.035, 12, 8), { color: COL.navy, rim: 0.5 }, { outline: 0.5 }, [0.012, -0.12, 0.01], [0, 0, 0], g); boot.scale.set(1.3, 0.7, 1.2);
    return g;
  });
  R.arms = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s < 0 ? -a / 2 - 0.005 : 0.02, 0.3, 0.02); R.tri.add(g);
    add(stick, ink, { outline: 0 }, [0, 0, 0], [0, 0, 0], g).scale.y = 0.2;
    const hand = add(new THREE.SphereGeometry(0.032, 12, 8), { color: COL.cream, rim: 0.4 }, { outline: 0.5 }, [0, -0.2, 0], [0, 0, 0], g);
    return { g, hand };
  });
  return R;
}

// ---------------------------------------------------------------------------------------------------
export async function buildClack(W) {
  const { THREE, scene, add } = W;
  const R = { root: new THREE.Group() }; scene.add(R.root);
  R.body = new THREE.Group(); R.root.add(R.body);
  const blue = { color: COL.sky, rim: 0.8, hatchDir: [0, 1, 0.2], shadeColor: COL.navy, shadeMix: 0.35, seed: 21 };
  const id = 241;
  add(new THREE.BoxGeometry(0.52, 0.3, 0.38), { ...blue, id }, { outline: 1.0 }, [0, 0.24, -0.02], [0, 0, 0], R.body);
  // sloped key deck in front: a wedge
  const wedge = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.2, 0.02), new THREE.Vector2(0, 0.15)]);
  const wg = new THREE.ExtrudeGeometry(wedge, { depth: 0.52, bevelEnabled: false }); wg.rotateY(-Math.PI / 2); wg.translate(0.26, 0.11, 0.17);
  add(wg, { color: COL.navy, rim: 0.5, hatchDir: [1, 0, 0] }, { outline: 0.9 }, [0, 0, 0], [0, 0, 0], R.body);
  // keycaps (a toothy grin): 2 rows x 6, each can be pressed
  R.keys = [];
  for (let row = 0; row < 2; row++) for (let k = 0; k < 6; k++) {
    const x = -0.2 + k * 0.08, z = 0.2 + row * 0.08, y = 0.25 - row * 0.055;
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = 0.62; R.body.add(g);
    add(new THREE.CylinderGeometry(0.03, 0.032, 0.035, 14), { color: COL.cream, rim: 0.5, toneBias: 0.1, hatch: 0.5, seed: 30 + k }, { outline: 0.45 }, [0, 0.02, 0], [0, 0, 0], g);
    R.keys.push(g);
  }
  // front plate with the face (between keys and roller)
  R.faceTex = await faceSet(W, 'clack', ...FACES.clack);
  R.face = add(new THREE.PlaneGeometry(0.46, 0.13), { ...blue, unique: true, id, map: R.faceTex.determined[0], hatch: 0.5 }, { cast: false }, [0, 0.322, 0.172], [0, 0, 0], R.body);
  // platen roller (brow) with end knobs; the paper behind it
  R.roller = new THREE.Group(); R.roller.position.set(0, 0.445, -0.05); R.body.add(R.roller);
  add(new THREE.CylinderGeometry(0.065, 0.065, 0.58, 24), { color: 0x22223a, rim: 0.7, hatchMode: 'u' }, { outline: 0.8 }, [0, 0, 0], [0, 0, Math.PI / 2], R.roller);
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), { color: COL.pop, rim: 0.6 }, { outline: 0.6 }, [s * 0.31, 0, 0], [0, 0, Math.PI / 2], R.roller);
  R.paper = add(new THREE.PlaneGeometry(0.36, 1, 1, 1).translate(0, 0.5, 0), { color: COL.cream, side: THREE.DoubleSide, toneBias: 0.15, hatch: 0.4, rim: 0.2 }, { outline: 0.5 }, [0, 0.43, -0.12], [-0.25, 0, 0], R.body);
  R.paper.scale.y = 0.18;
  // carriage-return lever = left arm (pivot at the roller's left end); stubby right arm
  R.armL = new THREE.Group(); R.armL.position.set(-0.3, 0.44, 0.02); R.body.add(R.armL);
  add(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8).translate(0, -0.11, 0), { color: COL.steel, hatchMode: 'u' }, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], R.armL);
  add(new THREE.SphereGeometry(0.038, 12, 8), { color: COL.cream }, { outline: 0.5 }, [0, -0.23, 0], [0, 0, 0], R.armL);
  R.armR = new THREE.Group(); R.armR.position.set(0.28, 0.28, 0.02); R.body.add(R.armR);
  add(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 8).translate(0, -0.07, 0), { color: COL.navy }, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], R.armR);
  add(new THREE.SphereGeometry(0.04, 12, 8), { color: COL.cream }, { outline: 0.5 }, [0, -0.15, 0], [0, 0, 0], R.armR);
  R.legs = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.15, 0.11, 0); R.body.add(g);
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 8).translate(0, -0.045, 0), { color: COL.navy }, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], g);
    const f = add(new THREE.SphereGeometry(0.045, 12, 8), { color: COL.pop, rim: 0.5 }, { outline: 0.5 }, [0, -0.1, 0.02], [0, 0, 0], g); f.scale.set(1.2, 0.6, 1.4);
    return g;
  });
  return R;
}

// ---------------------------------------------------------------------------------------------------
export function buildLoupe(W) {
  const { THREE, scene, add, npr } = W;
  const R = { root: new THREE.Group() }; scene.add(R.root);
  R.body = new THREE.Group(); R.root.add(R.body);
  R.head = new THREE.Group(); R.head.position.y = 0.44; R.body.add(R.head);
  const rimR = 0.2;
  add(new THREE.TorusGeometry(rimR, 0.038, 16, 56), { color: COL.navy, rim: 0.8, hatchMode: 'u', shadeColor: 0x06182b, shadeMix: 0.3 }, { outline: 1.0 }, [0, 0, 0], [0, 0, 0], R.head);
  // lens: pale sky-cream disc (flat-ish, lit); the eye and the insets are 2D ink clipped to it (letters layer)
  R.lens = add(new THREE.CircleGeometry(rimR - 0.012, 48), { color: 0xe8f6fc, rim: 0.2, hatch: 0.25, toneBias: 0.18, spec: 0.5, seed: 41 }, { cast: false }, [0, 0, 0.004], [0, 0, 0], R.head);
  R.lensBack = add(new THREE.CircleGeometry(rimR - 0.012, 48), { color: 0xd6ecf6, hatch: 0.3 }, { cast: false }, [0, 0, -0.004], [0, Math.PI, 0], R.head);
  R.rimR = rimR;
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12), { color: COL.gold, hatchMode: 'u' }, { outline: 0.5 }, [0, -rimR - 0.05, 0], [0, 0, 0], R.head);
  // handle (turned wood) and feet
  add(new THREE.CylinderGeometry(0.034, 0.042, 0.24, 14), { color: 0xc08a4c, hatchMode: 'u', rim: 0.6, shadeColor: 0x6b3f22, shadeMix: 0.4 }, { outline: 0.8 }, [0, 0.14, 0], [0, 0, 0], R.body);
  R.feet = [-1, 1].map((s) => {
    const f = add(new THREE.SphereGeometry(0.04, 12, 8), { color: COL.pop, rim: 0.5 }, { outline: 0.5 }, [s * 0.045, 0.02, 0.02], [0, 0, 0], R.body); f.scale.set(1.2, 0.6, 1.5); return f;
  });
  R.arms = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.036, 0.2, 0.0); R.body.add(g);
    add(new THREE.CylinderGeometry(0.01, 0.01, 0.13, 6).translate(0, -0.065, 0), ink, {}, [0, 0, 0], [0, 0, 0], g);
    add(new THREE.SphereGeometry(0.026, 10, 8), { color: COL.cream }, { outline: 0.45 }, [0, -0.13, 0], [0, 0, 0], g);
    return g;
  });
  return R;
}

// ---------------------------------------------------------------------------------------------------
export async function buildTilt(W) {
  const { THREE, scene, add } = W;
  const R = { root: new THREE.Group() }; scene.add(R.root);
  R.body = new THREE.Group(); R.root.add(R.body);
  const blue = { color: COL.skyL, rim: 0.8, hatchMode: 'u', shadeColor: COL.sky, shadeMix: 0.35, seed: 51 };
  add(new THREE.CylinderGeometry(0.12, 0.15, 0.05, 28), { ...blue, color: COL.navy }, { outline: 0.7 }, [0, 0.03, 0], [0, 0, 0], R.body);
  add(new THREE.CylinderGeometry(0.03, 0.04, 0.42, 14), blue, { outline: 0.7 }, [0, 0.26, 0], [0, 0, 0], R.body);
  R.feet = [-1, 1].map((s) => { const f = add(new THREE.SphereGeometry(0.04, 12, 8), { color: COL.pop, rim: 0.5 }, { outline: 0.5 }, [s * 0.09, 0.02, 0.08], [0, 0, 0], R.body); f.scale.set(1.1, 0.6, 1.5); return f; });
  R.head = new THREE.Group(); R.head.position.y = 0.52; R.body.add(R.head);
  R.faceTex = await faceSet(W, 'tilt', ...FACES.tilt);
  R.headM = add(new THREE.SphereGeometry(0.12, 32, 20), { ...blue, unique: true, hatchMode: 'screen', map: R.faceTex.determined[0], toneBias: 0.08 }, { outline: 0.9 }, [0, 0, 0], [0, 0, 0], R.head);
  // crossbeam = arms (rotates about the head); hands at the ends; pans hang from the hands (kept vertical)
  R.beam = new THREE.Group(); R.head.add(R.beam);
  add(new THREE.BoxGeometry(0.64, 0.03, 0.04), { color: COL.gold, hatchMode: 'u', rim: 0.7, shadeColor: 0x9a5a2a, shadeMix: 0.35 }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], R.beam);
  R.hands = [-1, 1].map((s) => add(new THREE.SphereGeometry(0.035, 12, 8), { color: COL.cream, rim: 0.4 }, { outline: 0.5 }, [s * 0.33, 0, 0.0], [0, 0, 0], R.beam));
  R.pans = [-1, 1].map((s) => {
    const g = new THREE.Group(); scene.add(g);                    // world-placed each frame under the hand
    const prof = []; for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(0.01 + 0.12 * Math.sin(t * Math.PI / 2), -0.05 + 0.05 * (1 - Math.cos(t * Math.PI / 2)))); }
    const bowl = add(new THREE.LatheGeometry(prof, 28), { color: COL.gold, side: THREE.DoubleSide, rim: 0.7, hatchMode: 'u', shadeColor: 0x9a5a2a, shadeMix: 0.35 }, { outline: 0.6 }, [0, -0.28, 0], [0, 0, 0], g);
    const strings = [0, 1, 2].map((k) => { const a = k / 3 * TAU + 0.3; const m = add(new THREE.CylinderGeometry(0.004, 0.004, 1, 4), ink, {}, [0, 0, 0], [0, 0, 0], g); m.userData.a = a; return m; });
    strings.forEach((m) => { const a = m.userData.a, x = Math.cos(a) * 0.11, z = Math.sin(a) * 0.11; const d = new THREE.Vector3(x, -0.26, z), len = d.length(); m.position.copy(d.clone().multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.scale.y = len; });
    return { g, bowl };
  });
  // left pan: a tiny silicon cell (hidden; the accuracy gem is added in td_story.js); right pan: up to six pennies (cost)
  const si = buildSilicon(W, 0.1, R.pans[0].g); si.g.position.set(0, -0.2, 0); R.panSi = si;
  // laid apart so 2 / 4 / 6 pennies can be counted: the first four in one row across the pan (as seen from the front), the
  // two extra ones (too fine a k-grid) in front of and behind the row
  const PEN = [[-0.03, 0], [0.03, 0], [-0.09, 0], [0.09, 0], [0, 0.066], [0, -0.066]];
  R.pennies = PEN.map(([x, z], k) => add(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 20), { color: 0xd6813f, rim: 0.7, hatchMode: 'u', shadeColor: 0x7a3a18, shadeMix: 0.4, seed: 60 + k }, { outline: 0.45 }, [x, -0.264 + (Math.abs(x) > 0.05 ? 0.006 : 0), z], [0.25, 0, 0.06 * (k % 2 - 0.5)], R.pans[1].g));
  return R;
}

/** the Refiner's console: two big knobs (k-grid: a dot-grid face; cutoff: a notched face) and a vermilion GO button */
export async function buildConsole(W) {
  const { THREE, scene, add } = W;
  const R = { root: new THREE.Group() }; scene.add(R.root);
  add(new THREE.BoxGeometry(0.5, 0.2, 0.3), { color: COL.navy, rim: 0.6, hatchDir: [0, 1, 0] }, { outline: 0.9 }, [0, 0.1, 0], [0, 0, 0], R.root);
  const dial = (key, paint) => W.bake(THREE, { width: 256, height: 256, seed: 7, key: `dial-${key}-v1`, background: '#ffffff' }, paint);
  const kTex = await dial('k', (p, brush, w, h) => {
    brush.noStroke(); brush.fill('#16162c', 255); brush.fillBleed(0.01);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) brush.circle(72 + i * 38, 72 + j * 38, 9, 0.1);
    brush.set('bigink', '#ff5a2e', 2.2); brush.line(128, 20, 128, 58);
  });
  const cTex = await dial('c', (p, brush, w, h) => {
    brush.set('bigink', '#16162c', 1.8);
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; brush.line(128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70, 128 + Math.cos(a) * (k % 3 ? 92 : 104), 128 + Math.sin(a) * (k % 3 ? 92 : 104)); }
    brush.set('bigink', '#ff5a2e', 2.4); brush.line(128, 128, 128, 36);
  });
  R.knobs = [[-0.12, kTex], [0.1, cTex]].map(([x, tex]) => {
    const g = new THREE.Group(); g.position.set(x, 0.24, 0.02); R.root.add(g);
    add(new THREE.CylinderGeometry(0.085, 0.095, 0.08, 28), { color: COL.cream, rim: 0.6, hatchMode: 'u' }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], g);
    add(new THREE.CircleGeometry(0.08, 28), { color: COL.cream, map: tex, hatch: 0.3, toneBias: 0.1 }, { cast: false }, [0, 0.041, 0], [-Math.PI / 2, 0, 0], g);
    return g;
  });
  R.go = add(new THREE.CylinderGeometry(0.05, 0.055, 0.05, 20), { color: COL.pop, rim: 0.7, shadeColor: COL.popD, shadeMix: 0.4 }, { outline: 0.7 }, [0.0, 0.14, 0.17], [Math.PI / 2, 0, 0], R.root);
  return R;
}

// ---------------------------------------------------------------------------------------------------
export async function buildHoot(W) {
  const { THREE, scene, add } = W;
  const R = { root: new THREE.Group() }; scene.add(R.root);
  R.body = new THREE.Group(); R.root.add(R.body);
  const tan = { color: 0xd8b98c, rim: 0.8, hatchDir: [0.3, 1, 0], shadeColor: 0x8a5a36, shadeMix: 0.35, seed: 71 };
  const bodyM = add(new THREE.SphereGeometry(0.42, 40, 28), tan, { outline: 1.1 }, [0, 0.44, 0], [0, 0, 0], R.body);
  bodyM.scale.set(1.0, 1.15, 0.9);
  // lab coat: a cream skirt round the lower body, lapels
  add(new THREE.CylinderGeometry(0.36, 0.44, 0.34, 32, 1, true), { color: COL.cream, side: THREE.DoubleSide, rim: 0.5, hatchDir: [0, 1, 0], toneBias: 0.05 }, { outline: 0.8 }, [0, 0.2, 0], [0, 0, 0], R.body);
  R.head = new THREE.Group(); R.head.position.set(0, 0.62, 0); R.body.add(R.head);
  // facial disc (cream) with the face; tufts; beak; glasses
  R.faceTex = await faceSet(W, 'hoot', ...FACES.hoot);
  R.disc = add(new THREE.SphereGeometry(0.3, 36, 24, Math.PI / 2 - Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.2, Math.PI * 0.62), { unique: true, color: 0xfff1d6, map: R.faceTex.tired[0], rim: 0.4, toneBias: 0.12, hatch: 0.5, seed: 72 }, { outline: 0.6 }, [0, 0.0, 0.16], [0, 0, 0], R.head);
  R.disc.scale.set(1.12, 1.0, 0.85);
  R.tufts = [-1, 1].map((s) => { const g = new THREE.Group(); g.position.set(s * 0.25, 0.3, -0.02); g.rotation.z = -s * 0.35; R.head.add(g); add(new THREE.ConeGeometry(0.07, 0.2, 14), tan, { outline: 0.8 }, [0, 0.09, 0], [0, 0, 0], g); return g; });
  add(new THREE.ConeGeometry(0.045, 0.12, 12), { color: COL.pop, rim: 0.6, shadeColor: COL.popD, shadeMix: 0.4 }, { outline: 0.6 }, [0, -0.07, 0.44], [Math.PI / 2 + 0.35, 0, 0], R.head);
  R.glasses = new THREE.Group(); R.glasses.position.set(0, 0.03, 0.43); R.head.add(R.glasses);
  for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.105, 0.016, 10, 40), { color: COL.ink, rim: 0.3, hatch: 0 }, { outline: 0.4 }, [s * 0.12, 0, 0], [0, 0, 0], R.glasses);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), { color: COL.ink }, {}, [0, 0.02, 0], [0, 0, Math.PI / 2], R.glasses);
  // wings (hands): flattened ellipsoids on shoulder pivots
  R.wings = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.36, 0.52, 0.02); R.body.add(g);
    const m = add(new THREE.SphereGeometry(0.16, 24, 16), { ...tan, color: 0xc9a172 }, { outline: 0.8 }, [s * 0.04, -0.16, 0.02], [0, 0, 0], g); m.scale.set(0.45, 1.0, 0.8);
    return g;
  });
  // pencil in the coat pocket
  add(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 6), { color: COL.pop, rim: 0.5 }, { outline: 0.4 }, [0.2, 0.33, 0.33], [0.2, 0, -0.15], R.body);
  R.feet = [-1, 1].map((s) => { const f = add(new THREE.SphereGeometry(0.06, 12, 8), { color: COL.pop, rim: 0.5 }, { outline: 0.5 }, [s * 0.14, 0.03, 0.26], [0, 0, 0], R.body); f.scale.set(1.2, 0.55, 1.3); return f; });
  return R;
}
