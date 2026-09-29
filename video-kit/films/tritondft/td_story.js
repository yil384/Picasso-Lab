// td_story.js - "The All-Nighter": timeline, acting, props, camera and lighting. Everything is a pure function of the
// frame F = ctx.iw (0..NF-1); frame NF == frame 0. See STORYBOARD.md for the beat sheet.
import { COL, TAU, Q, lerp, clamp, mj, sm, io, ob, oc, ic, twos, ringv, bumpv, kf, win, arc, takeSq, ease } from './td_core.js';
import { L, station, ST, buildRoom, buildBench, buildSilicon, buildEngine, buildHourglass, buildDesk, buildTube } from './td_world.js';
import { buildTri, buildClack, buildLoupe, buildTilt, buildConsole, buildHoot } from './td_cast.js';
import { buildWord3D } from './td_glyph3d.js';
import { paintWord } from './td_letters.js';
import { mixRig, applyCamera } from './td_cam.js';

export const NF = 720;               // 30 s @ 24 fps
export const POSTER = 664;

export const LOOK = {
  extends: 'comic',
  hatchCut: 0.22, crossT: 0.62, crossW: 1.0, hatchPx: 7.5, hatchW: 1.5, hatchWobble: 0.08, hatchSwell: 0.35,
  htAmt: 0.55, htPx: 14, htT: 0.3, htRange: 0.5, misreg: [2.6, -2.0], htCol: [0.06, 0.18, 0.34],
  lineW: 1.8, lineWShadow: 2.9, hullW: 2.65, hullShadowW: 1.45,   // a step lighter than style-comic: the card was the darkest of the four
  bleed: 1.6, edgeDark: 0.45, gran: 0.3, flocc: 0.06, dryEdge: 0.2, sat: 1.22,
  shadeGlaze: [0.62, 0.72, 0.9], coreGlaze: [0.62, 0.72, 0.9], keyTint: [1.0, 0.985, 0.97],   // near-neutral key: the warm paper already multiplies
  rule: 0.0, bgDots: [0.2, 0.52, 0.75, 0.22], dofMax: 3.0, dofRange: 3.5, grain: 0.018, vignette: 0.16,
  glassGlint: 0.5,
  atmosStart: 3.2, atmosEnd: 8.5, inkFar: 0.55, hatchFar: 0.35, htFar: 0.3,   // no haze (atmos 0): the set's ink, hatch and dots recede with depth
  ...(Q.get('lk') ? JSON.parse(Q.get('lk')) : {}),
};

// ---------------------------------------------------------------------------------------------------
// key frames (see STORYBOARD.md)
// ---------------------------------------------------------------------------------------------------
export const K = {
  S1: 0, S2: 96, S3: 176, S3b: 280, S4: 320, S5: 384, S6: 460, S7: 508, S8a: 576, S8b: 624, S9: 684,
  bubble: [16, 36], wake: 23, write: [36, 46], toss: [46, 54], gulp: 53, bulge: [53, 98],
  heave: [56, 70], clock: 70, smirk: [72, 90],
  pop: [98, 110], catch: 110, read: [114, 124], book: [124, 142], chop: 150, deal: [156, 162, 168],
  type: [178, 196], rip: 198, feed: [200, 208], jump: [208, 214], lever: 214, roar: 220, tape: [228, 262],
  relax: [246, 264], scf: [262, 278], cover: [280, 292],
  gust: [288, 296], page: [294, 306], glance: [306, 316],
  hop4: [322, 330], read4: [330, 364], bead1: 334, fail: 362, rush: [372, 384],
  click: [398, 410, 430], crash: 410, cutoff: 438, level: 446, go: 452,
  lap: [460, 504], salute: 470, huff: 484,
  read7: 510, ding: 530, planks: [534, 546], toFunnel: [548, 561], suck: [561, 568],
  land: 590, take: 590, outs: [598, 604, 610], clack68: [622, 636],
  slam: [628, 636, 644],
  puffs: 686, handBack: [686, 692], dive: [692, 697, 702, 707], yawn: [686, 700], lay: [698, 712], flop: [710, 718],
};

// the job on the turntable ring: world theta (plan 135, exec 45, anlz -45 deg; the Refiner's stop is at -100, short of
// Tilt at -135, so the cart stands clear of its cost pan); two full turns per loop
const D = Math.PI / 180;
function jobTheta(F) {
  return kf(F, [[0, 135 * D], [168, 135 * D], [184, 45 * D], [282, 45 * D], [300, -45 * D], [372, -45 * D], [388, -100 * D],
    [K.lap[0], -100 * D], [K.lap[1], -405 * D], [K.toFunnel[0], -405 * D], [K.toFunnel[1], -585 * D], [NF, -585 * D]], (x) => mj(x));
}
const turnAngle = (F) => jobTheta(F) - 135 * D;
export const jobPos = (F, r = L.turn.rJob) => station(jobTheta(F), r);
export const TRI_TH = ST.plan + 0.44;           // Tri stands beside the job's stop (not behind it)

export const st = {};
let W = null;
const V3 = (x, y, z) => new W.THREE.Vector3(x, y, z);
const deskP = (x, y, z) => [L.desk.x + x, y, L.desk.z + z];
const HOOT = deskP(-0.3, 0.02, -0.95);
const GIANT = deskP(0.48, 0, -0.28);           // upright spot of the giant hourglass
const GIANT_LAY = deskP(1.08, 0, -0.92);        // where it lies (Hoot's pillow): its bottom cap at the upright spot's x, against
                                                // Hoot's cheek; it stands up by pivoting about that cap
const TINY = deskP(0.98, 0.33, 0.12);         // the tiny hourglass (Hoot's dare), same shape, 1/68 the volume, on a stack of
                                              // books so it sits inside the card band (and its top bulb clears the 68x)
const SCORE = deskP(-0.56, 0.004, 0.12);       // the DFTBench scorecard (98%): on its easel between 98% and 68x, behind the row
const faceYaw = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]);

// ---------------------------------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------------------------------
export async function buildAll(w) {
  W = w;
  const { THREE, add } = W;
  await buildRoom(W);
  await buildBench(W);
  buildEngine(W);
  await buildDesk(W);
  await buildTube(W, paintWord);
  // the job: a little vermilion cart on the ring carrying the silicon cell (the result travels home in it)
  W.cart = new THREE.Group(); W.turn.add(W.cart);
  add(new THREE.CylinderGeometry(0.2, 0.24, 0.1, 32), { color: COL.pop, hatchMode: 'u', rim: 0.8, shadeColor: COL.popD, shadeMix: 0.45 }, { outline: 0.8 }, [0, 0.05, 0], [0, 0, 0], W.cart);
  W.si = buildSilicon(W, 0.4, W.cart); W.si.g.position.set(0, 0.33, 0);
  // vc-relax: a dashed vermilion ghost of the unrelaxed cell (0.88), 3D so nearer atoms cover it where they overlap
  W.ghost = new THREE.Group(); W.si.g.add(W.ghost); W.ghost.visible = false;
  { const A = W.si.A, h = A * 0.88 / 2, dashGeo = new THREE.CylinderGeometry(A * 0.016, A * 0.016, A * 0.88 / 9, 6);
    const corners = [[-h, -h, -h], [h, -h, -h], [-h, h, -h], [h, h, -h], [-h, -h, h], [h, -h, h], [-h, h, h], [h, h, h]];
    const E = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
    for (const [i, j] of E) for (let q = 0; q < 5; q++) {
      const pa = new THREE.Vector3(...corners[i]), pb = new THREE.Vector3(...corners[j]), t = (q * 2 + 0.5) / 9;
      const m = add(dashGeo, { color: COL.pop, hatch: 0, rim: 0.3, toneBias: 0.1 }, { outline: 0.3, cast: false }, [0, 0, 0], [0, 0, 0], W.ghost);
      m.position.copy(pa.clone().lerp(pb, t + 0.5 / 9)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize());
    }
    for (const c of corners) add(new THREE.SphereGeometry(A * 0.035, 10, 8), { color: COL.pop, hatch: 0, rim: 0.3 }, { outline: 0.3, cast: false }, c, [0, 0, 0], W.ghost);
  }
  // scf: electron density on the 16 bonds as flat, rimless sky-blue lozenges round each bond stick (depth-correct, no ink
  // rim or highlight, so they never read as a second species); grown in S3 only
  W.dens = W.si.bonds.map((b) => {
    const m = add(new THREE.SphereGeometry(1, 16, 10), { color: 0x9ed8f3, hatch: 0.1, rim: 0, spec: 0, toneBias: 0.3, shadeColor: COL.skyL, shadeMix: 0.15 }, { outline: 0, cast: false }, [0, 0, 0], [0, 0, 0], W.si.inner);
    m.position.copy(b.position); m.quaternion.copy(b.quaternion); m.userData.len = b.scale.y; m.visible = false;
    return m;
  });
  W.tiny = buildHourglass(W, 1.2 / Math.cbrt(68), [...TINY], 'tiny');
  W.tiny.g.rotation.y = Math.PI / 3;                   // posts flank the glass: the neck and the stream stay visible
  [[0.12, COL.navy, 0.05], [0.11, COL.cream, -0.08], [0.1, COL.sky, 0.12]].reduce((y, [h, c, ry]) => {
    add(new THREE.BoxGeometry(0.34, h, 0.26), { color: c, hatchMode: 'u', rim: 0.5 }, { outline: 0.6 }, [TINY[0], y + h / 2, TINY[2]], [0, ry, 0]);
    return y + h;
  }, 0);
  W.giant = buildHourglass(W, 1.2, [...GIANT], 'giant');
  W.tri = await buildTri(W); W.clack = await buildClack(W); W.loupe = buildLoupe(W); W.tilt = await buildTilt(W);
  W.con = await buildConsole(W); W.hoot = await buildHoot(W);
  await buildProps(W);
}

async function buildProps(W) {
  const { THREE, scene, add, bake } = W;
  // the request card: a pictogram question (a diamond cell + two bars with a gap + '?'), no words
  const cardTex = await bake(THREE, { width: 384, height: 256, seed: 51, key: 'card-v1', background: '#ffffff' }, (p, brush, w, h) => {
    brush.noStroke(); brush.fill('#fff6e0', 255); brush.rect(-4, -4, w + 8, h + 8);
    brush.set('bigink', '#16162c', 1.1);
    const x = 40, y = 70, s = 90; brush.rect(x, y, s, s); brush.rect(x + 35, y - 35, s, s);
    [[0, 0], [s, 0], [0, s], [s, s]].forEach(([a, b]) => brush.line(x + a, y + b, x + a + 35, y + b - 35));
    brush.set('bigink', '#0284c7', 1.6); brush.line(200, 90, 290, 90); brush.line(200, 170, 290, 170);
    brush.set('bigink', '#ff5a2e', 1.8); brush.spline([[300, 80], [330, 60], [355, 85], [330, 120], [328, 150]], 0.4); brush.line(327, 178, 329, 186);
  });
  W.card = add(new THREE.PlaneGeometry(0.34, 0.23), { color: COL.cream, map: cardTex, side: THREE.DoubleSide, rim: 0.3, toneBias: 0.12, hatch: 0.4 }, { outline: 0.5 }, [0, 0, 0]);
  W.capsule = new THREE.Group(); scene.add(W.capsule);
  add(new THREE.CapsuleGeometry(0.07, 0.16, 6, 16), { color: COL.skyP, rim: 0.8, toneBias: 0.1, hatch: 0.4 }, { outline: 0.7 }, [0, 0, 0], [0, 0, Math.PI / 2], W.capsule);
  add(new THREE.TorusGeometry(0.072, 0.018, 8, 20), { color: COL.gold, hatchMode: 'u', rim: 0.6 }, { outline: 0.4 }, [0, 0, 0], [0, Math.PI / 2, 0], W.capsule);
  // the plan: three tickets (vc-relax: a cube squeezed by arrows; scf: a circular arrow; band gap: two bars and a gap)
  const tick = async (k, paint) => bake(THREE, { width: 256, height: 176, seed: 60 + k, key: `ticket-${k}-v2`, background: '#ffffff' }, (p, brush, w, h) => {
    brush.noStroke(); brush.fill(k === 1 ? '#bfe6f7' : '#fff6e0', 255); brush.rect(-4, -4, w + 8, h + 8);
    brush.set('inkpen', '#16162c', 1.2); for (let x = 8; x < w; x += 16) brush.line(x, 6, x + 6, 6);
    paint(brush, w, h);
  });
  const texs = [
    await tick(0, (brush, w, h) => { brush.set('bigink', '#16162c', 1.3); brush.rect(w / 2 - 34, h / 2 - 30, 68, 68); brush.set('bigink', '#ff5a2e', 1.4); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const x0 = w / 2 + dx * 80, y0 = h / 2 + 4 + dy * 62, x1 = w / 2 + dx * 48, y1 = h / 2 + 4 + dy * 42; brush.line(x0, y0, x1, y1); brush.line(x1, y1, x1 - dx * 10 + dy * 9, y1 - dy * 10 + dx * 9); brush.line(x1, y1, x1 - dx * 10 - dy * 9, y1 - dy * 10 - dx * 9); } }),
    await tick(1, (brush, w, h) => {                // scf: two dashed arcs chasing each other round (iterate to self-consistency)
      const cx = w / 2, cy = h / 2 + 6, R = 48;
      for (const [a0, col] of [[0.25, '#16162c'], [0.25 + Math.PI, '#ff5a2e']]) {
        brush.set('bigink', col, 1.5);
        for (let q = 0; q < 4; q++) { const t0 = a0 + q * 0.62, t1 = t0 + 0.4; brush.line(cx + Math.cos(t0) * R, cy + Math.sin(t0) * R, cx + Math.cos(t1) * R, cy + Math.sin(t1) * R); }
        const te = a0 + 2.5, ex = cx + Math.cos(te) * R, ey = cy + Math.sin(te) * R, tx = -Math.sin(te), ty = Math.cos(te);
        brush.line(ex, ey, ex - tx * 16 + Math.cos(te) * 10, ey - ty * 16 + Math.sin(te) * 10); brush.line(ex, ey, ex - tx * 16 - Math.cos(te) * 10, ey - ty * 16 - Math.sin(te) * 10);
      }
    }),
    await tick(2, (brush, w, h) => { brush.set('bigink', '#0284c7', 2.2); brush.line(w / 2 - 70, h / 2 + 40, w / 2 + 70, h / 2 + 40); brush.set('bigink', '#ff5a2e', 2.2); brush.line(w / 2 - 70, h / 2 - 30, w / 2 + 70, h / 2 - 30); brush.set('inkpen', '#16162c', 1.2); brush.line(w / 2, h / 2 - 16, w / 2, h / 2 + 26); }),
  ];
  // the method book Tri pulls from the Library (navy, a vermilion band)
  W.mbook = new THREE.Group(); scene.add(W.mbook);
  add(new THREE.BoxGeometry(0.05, 0.19, 0.14), { color: COL.navy, hatchMode: 'u', rim: 0.5 }, { outline: 0.6 }, [0, 0, 0], [0, 0, 0], W.mbook);
  add(new THREE.BoxGeometry(0.056, 0.035, 0.146), { color: COL.pop, rim: 0.5 }, { outline: 0.4 }, [0, 0.04, 0], [0, 0, 0], W.mbook);
  add(new THREE.BoxGeometry(0.04, 0.18, 0.02), { color: COL.cream, hatch: 0.3 }, { outline: 0.3 }, [0, 0, 0.065], [0, 0, 0], W.mbook);
  // the tickets are big enough to read their icons
  W.tickets = texs.map((tx) => add(new THREE.PlaneGeometry(0.4, 0.28), { color: COL.cream, map: tx, side: THREE.DoubleSide, rim: 0.3, toneBias: 0.12, hatch: 0.4 }, { outline: 0.45 }, [0, 0, 0]));
  // the Quantum ESPRESSO input sheet (a namelist-like scribble texture) torn from Clack and fed to Big Iron
  const sheetTex = await bake(THREE, { width: 256, height: 320, seed: 71, key: 'sheet-v2', background: '#ffffff' }, (p, brush, w, h) => {
    brush.noStroke(); brush.fill('#fff6e0', 255); brush.rect(-4, -4, w + 8, h + 8);
    paintWord(brush, 'PW.X', 150, 34, 30, { fill: '#0284c7', shade: '#0b3558', extrude: [0.03, 0.04], jaunt: 0.1, bounce: 0.05, skew: -0.1, gap: 0.12 });   // Quantum ESPRESSO's pw.x
    brush.set('inkpen', '#1d2a44', 1.0);
    for (let k = 0; k < 10; k++) { const y = 70 + k * 24; let x = 20 + (k % 4 === 0 ? 0 : 22); while (x < w - 30) { const L2 = 12 + ((k * 7 + x) % 26); brush.line(x, y, x + L2, y); x += L2 + 8; } }
    brush.set('inkpen', '#ff5a2e', 1.1); brush.line(16, 20, 16, h - 20);
  });
  W.sheet = add(new THREE.PlaneGeometry(0.3, 0.38), { color: COL.cream, map: sheetTex, side: THREE.DoubleSide, rim: 0.3, toneBias: 0.12, hatch: 0.4 }, { outline: 0.45 }, [0, 0, 0]);
  W.clack.paper.material = W.sheet.material;
  // the output tape (ticker): from Big Iron's spout across the bench to the Analyzer
  const tapeTex = await bake(THREE, { width: 1024, height: 64, seed: 72, key: 'tape-v1', background: '#ffffff', wrap: true }, (p, brush, w, h) => {
    brush.noStroke(); brush.fill('#fff6e0', 255); brush.rect(-4, -4, w + 8, h + 8);
    brush.set('inkpen', '#1d2a44', 0.9);
    let x = 10; let k = 0; while (x < w - 10) { const L2 = 10 + (k * 13) % 28; brush.line(x, h * 0.35 + (k % 3) * 8, x + L2, h * 0.35 + (k % 3) * 8); x += L2 + 7; k++; }
  });
  const tapeGeo = new THREE.PlaneGeometry(1, 0.1, 64, 1);
  W.tape = add(tapeGeo, { color: COL.cream, map: tapeTex, side: THREE.DoubleSide, rim: 0.2, toneBias: 0.1, hatch: 0.3, unique: true }, { outline: 0.4, cast: false }, [0, 0, 0]);
  W.tape.userData.base = tapeGeo.attributes.position.array.slice();
  W.tape.frustumCulled = false;
  // the Analyzer's convergence gauge: a board with a narrow tolerance band and a vermilion bead on a spring wire
  // the gauge measures the CHANGE between iterations (a hand-lettered delta-E and a 0 tick at the centre of the tolerance band)
  const gTex = await bake(THREE, { width: 256, height: 320, seed: 73, key: 'gauge-v2', background: '#ffffff' }, (p, brush, w, h) => {
    brush.noStroke(); brush.fill('#fff6e0', 255); brush.rect(-4, -4, w + 8, h + 8);
    brush.fill('#bfe6f7', 255); brush.rect(12, h / 2 - 22, w - 24, 44);
    brush.set('bigink', '#0284c7', 1.2);
    for (const y of [h / 2 - 22, h / 2 + 22]) for (let x = 14; x < w - 14; x += 24) brush.line(x, y, x + 13, y);
    brush.set('inkpen', '#16162c', 1.0); for (let y = 30; y < h - 20; y += 30) brush.line(w - 30, y, w - 16, y);
    brush.set('bigink', '#16162c', 1.1); brush.line(w - 50, h / 2, w - 12, h / 2); brush.line(20, h / 2, 44, h / 2);
    brush.set('bigink', '#16162c', 1.2); brush.line(26, 60, 42, 26); brush.line(42, 26, 58, 60); brush.line(58, 60, 26, 60);
    brush.line(72, 26, 72, 60); brush.line(72, 26, 92, 26); brush.line(72, 43, 88, 43); brush.line(72, 60, 93, 60);
  });
  const gauge = new THREE.Group(); scene.add(gauge);
  add(new THREE.BoxGeometry(0.3, 0.38, 0.03), [{ color: COL.navy }, { color: COL.navy }, { color: COL.navy }, { color: COL.navy }, { color: COL.cream, map: gTex, rim: 0.2, toneBias: 0.1, hatch: 0.4 }, { color: COL.navy }], { outline: 0.7 }, [0, 0.33, 0], [0, 0, 0], gauge);
  for (const sx of [-0.1, 0.1]) add(new THREE.CylinderGeometry(0.015, 0.02, 0.14, 8), { color: COL.navy }, { outline: 0.4 }, [sx, 0.07, 0], [0, 0, 0], gauge);
  add(new THREE.CylinderGeometry(0.005, 0.005, 0.36, 6), { color: COL.ink, hatch: 0 }, {}, [0.0, 0.33, 0.035], [0, 0, 0], gauge);
  W.bead = add(new THREE.SphereGeometry(0.03, 16, 12), { color: COL.pop, rim: 0.8, shadeColor: COL.popD, shadeMix: 0.4 }, { outline: 0.5 }, [0, 0.2, 0.035], [0, 0, 0], gauge);
  W.gauge = gauge;
  // the Refiner's k-grid pegboard on the console (at most 5x5 = 25 pegs) and the accuracy gem
  const pb = new THREE.Group(); pb.position.set(0, 0.26, 0.02); pb.rotation.x = 0.95; W.con.root.add(pb);
  add(new THREE.BoxGeometry(0.28, 0.02, 0.2), { color: COL.cream, rim: 0.3, hatch: 0.4 }, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], pb);
  W.pegs = [];
  const pegGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.05, 8);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) W.pegs.push({ i, j, m: add(pegGeo, { color: COL.pop, rim: 0.5, hatch: 0 }, { outline: 0.5, cast: false }, [0, 0.02, 0], [0, 0, 0], pb) });
  W.con.knobs[0].position.set(-0.19, 0.24, 0.1); W.con.knobs[1].position.set(0.19, 0.24, 0.1);
  W.con.knobs.forEach((k) => k.scale.setScalar(0.8));
  W.gem = add(new THREE.OctahedronGeometry(0.06, 0), { color: COL.skyL, rim: 0.8, hatch: 0.5, shadeColor: COL.sky, shadeMix: 0.4 }, { outline: 0.5 }, [0, -0.2, 0], [0, 0, 0], W.tilt.pans[0].g);
  W.tilt.panSi.g.visible = false;
  // band-gap planks over the cell: valence (sky) below, conduction (vermilion) above, an empty gap between
  W.planks = new THREE.Group(); W.cart.add(W.planks);
  W.plankV = add(new THREE.BoxGeometry(0.46, 0.05, 0.14), { color: COL.sky, rim: 0.7, hatchDir: [1, 0, 0], shadeColor: COL.navy, shadeMix: 0.4 }, { outline: 0.7 }, [0, 0.66, 0], [0, 0, 0], W.planks);
  W.plankC = add(new THREE.BoxGeometry(0.46, 0.05, 0.14), { color: COL.pop, rim: 0.7, hatchDir: [1, 0, 0], shadeColor: COL.popD, shadeMix: 0.4 }, { outline: 0.7 }, [0, 0.86, 0], [0, 0, 0], W.planks);
  W.stalk = add(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6), { color: COL.navy }, { outline: 0.3 }, [-0.25, 0.66, 0], [0, 0, 0], W.planks);
  // the DFTBench scorecard (many small material doodles, uncountable, one faint X) and Loupe's stamp
  const scoreTex = async (upto, key) => bake(THREE, { width: 512, height: 368, seed: 74, key, background: '#ffffff' }, (p, brush, w, h) => {
    brush.noStroke(); brush.fill('#fff6e0', 255); brush.rect(-4, -4, w + 8, h + 8);
    const doodle = (x, y, k) => {
      brush.set('inkpen', '#16162c', 0.8);
      if (k % 4 === 0) { brush.rect(x, y, 16, 16); brush.line(x, y, x + 6, y - 6); brush.line(x + 16, y, x + 22, y - 6); brush.line(x + 6, y - 6, x + 22, y - 6); }
      if (k % 4 === 1) { const pts = []; for (let q = 0; q <= 6; q++) pts.push([x + 10 + 10 * Math.cos(q * Math.PI / 3), y + 6 + 10 * Math.sin(q * Math.PI / 3)]); brush.spline(pts, 0); }
      if (k % 4 === 2) { brush.rect(x, y - 2, 18, 18); for (const [dx, dy] of [[0, 0], [18, 0], [0, 18], [18, 18], [9, 9]]) brush.circle(x + dx, y - 2 + dy, 2.2, 0); }   // bcc (iron)
      if (k % 4 === 3) { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) brush.circle(x + a * 9, y - 2 + b * 9, (a + b) % 2 ? 1.6 : 3.2, 0); }   // rock-salt
    };
    let k = 0;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) {
      const x = 22 + c * 80, y = 30 + r * 46; doodle(x, y, k * 7 + r);
      if (Math.hypot(r - 3, c - 2.5) / 4.3 <= upto) {             // the ticks ripple out from the stamp in the middle
        if (r === 4 && c === 3) { brush.set('inkpen', '#c8361c', 0.9); brush.line(x + 36, y - 4, x + 52, y + 12); brush.line(x + 52, y - 4, x + 36, y + 12); }
        else { brush.set('inkpen', '#0284c7', 1.0); brush.line(x + 36, y + 6, x + 42, y + 12); brush.line(x + 42, y + 12, x + 56, y - 4); }
      }
      k++;
    }
  });
  // DFTBench: a sheet of many material doodles, blank when Loupe brings it; the stamp ripples ticks across it (one faint X)
  W.scoreTex = [await scoreTex(-1, 'score-blank-v2'), await scoreTex(0.5, 'score-half-v2'), await scoreTex(1.01, 'score-v2')];
  const scTex = W.scoreTex[0];
  // Loupe brings the scorecard out of the tube for the payoff and takes it back in S9 (it is not on the desk before the run)
  W.scoreG = new THREE.Group(); W.scoreG.position.set(SCORE[0], 0, SCORE[2]); scene.add(W.scoreG);
  W.score = add(new THREE.PlaneGeometry(0.52, 0.37), { unique: true, color: COL.cream, map: scTex, rim: 0.2, toneBias: 0.1, hatch: 0.4, side: THREE.DoubleSide }, { outline: 0.6 }, [0, 0.4, 0], [-0.3, 0.1, 0], W.scoreG);   // on an easel, above the numeral row
  for (const sx of [-0.16, 0.16]) add(new THREE.CylinderGeometry(0.014, 0.018, 0.5, 6), { color: 0x8a5a33, hatchMode: 'u' }, { outline: 0.5 }, [sx, 0.24, 0.05], [0.25, 0, sx * 0.4], W.scoreG);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 6), { color: 0x8a5a33, hatchMode: 'u' }, { outline: 0.4 }, [0, 0.22, -0.12], [-0.45, 0, 0], W.scoreG);
  W.stamp = new THREE.Group(); scene.add(W.stamp);
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), { color: 0xc08a4c, hatchMode: 'u' }, { outline: 0.5 }, [0, 0.12, 0], [0, 0, 0], W.stamp);
  add(new THREE.SphereGeometry(0.04, 12, 8), { color: COL.pop }, { outline: 0.5 }, [0, 0.21, 0], [0, 0, 0], W.stamp);
  add(new THREE.BoxGeometry(0.12, 0.05, 0.08), { color: COL.navy, rim: 0.4 }, { outline: 0.6 }, [0, 0.025, 0], [0, 0, 0], W.stamp);
  // the numerals: one row along the desk's front edge
  const face = { color: COL.pop, hatchDir: [0.3, 1, 0], rim: 0.9, shadeColor: COL.popD, shadeMix: 0.35, seed: 50 };
  const side = { color: COL.gold, hatchDir: [0, 1, 0], rim: 0.5, shadeColor: 0xb0521e, shadeMix: 0.4, seed: 60 };
  const faceB = { color: COL.sky, hatchDir: [0.3, 1, 0], rim: 0.9, shadeColor: COL.navy, shadeMix: 0.35, seed: 52 };
  const sideB = { color: COL.skyP, hatchDir: [0, 1, 0], rim: 0.5, shadeColor: COL.sky, shadeMix: 0.4, seed: 62 };
  const faceG = { color: COL.gold, hatchDir: [0.3, 1, 0], rim: 0.9, shadeColor: 0xb0521e, shadeMix: 0.35, seed: 54 };
  W.num = {
    n98: buildWord3D(W, '98%', { h: 0.34, depth: 0.12, face: faceB, side: sideB, outline: 1.1, layout: [{ rz: 0.05 }, { rz: -0.04, dy: 0.01 }, { rz: 0.06, s: 0.9 }] }),
    n68: buildWord3D(W, '68x', { h: 0.46, depth: 0.15, face, side, outline: 1.25, layout: [{ rz: -0.06 }, { rz: 0.04, dy: 0.015 }, { rz: -0.1, s: 0.85 }] }),
    n04: buildWord3D(W, '$0.04', { h: 0.27, depth: 0.1, face: faceG, side: { ...side, color: COL.pop, shadeColor: COL.popD }, outline: 1.0, layout: [{ rz: 0.05 }, { rz: -0.03 }, {}, { rz: 0.04 }, { rz: -0.05 }] }),
  };
  Object.values(W.num).forEach((q) => scene.add(q.group));
  if (Q.get('dbg')) console.log('numW', JSON.stringify(Object.fromEntries(Object.entries(W.num).map(([k, q]) => [k, q.width]))));
}

// ---------------------------------------------------------------------------------------------------
// per-frame update
// ---------------------------------------------------------------------------------------------------
export function updateAll(w, ctx) {
  W = w;
  const F = ctx.iw;
  st.F = F;
  W.scene.updateMatrixWorld(true);
  updateTurn(F);
  updateHoot(F);
  updateHourglasses(F);
  updateTube(F);
  updateTri(F);
  updateClack(F);
  updateEngine(F);
  updateLoupe(F);
  updateTilt(F);
  W.scene.updateMatrixWorld(true);
  updateCart(F);
  updateProps(F);
  updateNumbers(F);
  W.scene.updateMatrixWorld(true);
  updateCamera(ctx, F);
}

// ---- turntable + the silicon cell (vc-relax breathing) ----
function updateTurn(F) {
  W.turn.rotation.y = turnAngle(F);
  let s = 0.88;                                                          // unrelaxed guess (the dashed ghost in td_ink.js)
  if (F >= K.relax[0]) { const a = F - K.relax[0]; s = 1 - 0.12 * Math.exp(-a / 7) * Math.cos(a * 0.32); }   // ~18 f: out, one overshoot, damped settle
  if (win(F, K.huff - 2, K.S7)) { const a = F - K.huff + 2; s = 1 + 0.015 * Math.exp(-a / 6) * Math.sin(a * 0.7); }   // lap 2 re-settles
  if (F >= 700) s = lerp(1, 0.88, sm((F - 700) / 12));                  // reset off screen for the loop
  W.si.inner.scale.setScalar(s);
  st.siScale = s;
  W.ghost.visible = win(F, K.relax[0] - 5, K.relax[1] + 6);
  const d = win(F, K.scf[0], K.cover[1] + 2) ? ob((F - K.scf[0]) / 10) * (1 - sm((F - K.cover[1] + 4) / 6)) : 0;
  W.dens.forEach((m) => { m.visible = d > 0.02; m.scale.set(0.021 * d + 0.001, m.userData.len * 0.3 * Math.max(0.2, d), 0.021 * d + 0.001); });
  st.jobV = Math.abs(jobTheta(F + 0.5) - jobTheta(F - 0.5));
}

// ---- the cart: on the ring; sucked up the funnel; out of the desk mouth into Hoot's wings; back via Tri ----
function updateCart(F) {
  const C = W.cart, a0 = 135 * D;
  const ringPos = [Math.cos(a0) * L.turn.rJob, 0.06, -Math.sin(a0) * L.turn.rJob];
  const inTube = (F >= K.suck[1] && F < K.land) || (F >= K.dive[0] + 4 && F < NF - 2);
  const onDesk = F >= K.land && F < K.dive[0] + 4;
  C.visible = !inTube;
  if (!onDesk && !(F >= K.suck[0] && F < K.suck[1])) {
    if (C.parent !== W.turn) W.turn.add(C);
    C.position.set(...ringPos); C.rotation.set(0, 0, 0);
    const v = Math.min(st.jobV, F >= K.planks[0] ? 0.04 : 1);   // with the band-gap planks up, only a hint of squash (the gap must stay open)
    C.scale.set(1 + v * 0.8, 1 - v * 1.2, 1 + v * 0.8);
    return;
  }
  if (C.parent !== W.scene) W.scene.add(C);
  C.scale.setScalar(1);
  if (F < K.suck[1]) {                                    // up into the funnel: squeezed thin below the mouth, then sucked inside it
    const k = (F - K.suck[0]) / (K.suck[1] - K.suck[0]), p0 = station(135 * D, L.turn.rJob), f = W.tube.curve.getPointAt(1);
    const k1 = sm(k / 0.5), k2 = ic(clamp((k - 0.5) / 0.5)), mouthY = f.y - 0.34;
    C.position.set(lerp(p0[0], f.x, k1), lerp(0.06, mouthY - 0.62, k1) + k2 * 0.75, lerp(p0[2], f.z, k1)); C.rotation.set(0, k * 2, 0);
    C.scale.set(lerp(1, 0.26, k1), lerp(1, 1.25, k1), lerp(1, 0.26, k1));
    return;
  }
  // pops out of the desk mouth and lands in Hoot's wings; handed to Tri at the end
  const m = W.tube.curve.getPointAt(0);
  const hold = W.hoot.head.localToWorld(V3(-0.1, -0.78, 0.74));    // hugged at the belly: the planks stay under its beak
  let p = [hold.x, hold.y, hold.z];
  const k = clamp((F - K.land) / 8);
  if (F < K.land + 8) p = [lerp(m.x, hold.x, oc(k)), lerp(m.y - 0.15, hold.y, k) + 0.35 * Math.sin(Math.PI * k), lerp(m.z, hold.z, k)];
  if (F >= K.handBack[0]) { const tp = W.tri.arms[1].hand.getWorldPosition(V3(0, 0, 0)), b = sm((F - K.handBack[0]) / (K.handBack[1] - K.handBack[0])); p = [lerp(p[0], tp.x, b), lerp(p[1], tp.y - 0.1, b), lerp(p[2], tp.z, b)]; }
  C.position.set(...p); C.rotation.set(0, 0.3 + (F < K.land + 8 ? (1 - k) * 4 : 0), 0);
  C.scale.setScalar(F < K.land + 8 ? lerp(0.35, 0.56, k) : lerp(0.56, 1, sm((F - K.handBack[0]) / 8)));
}

// ---- Hoot (the researcher) ----
function updateHoot(F) {
  const R = W.hoot, Fc = twos(F);
  let bodyLean = 0, headTilt = 0, headYaw = 0, sq = 0, expr = 'sleep', wingL = 0.15, wingR = -0.15, wingRx = 0, wingLx = 0, glassesOff = 0, tufts = 0;
  const breath = 0.03 * Math.sin(TAU * F / 48);
  if (F < K.bubble[0] + 4 || F >= K.flop[0]) {
    // asleep, cheek on the sideways giant hourglass (leaning right)
    const k = F >= K.flop[0] ? sm((F - K.flop[0]) / 8) : 1;
    bodyLean = -0.4 * k; headTilt = -0.25 * k; sq = breath * k; expr = 'sleep';
    wingR = lerp(-0.4, 0.45, k); wingL = 0.12;
  } else if (F < K.S2) {
    const w0 = K.bubble[0] + 4;
    bodyLean = -0.4 * (1 - sm((F - w0) / 6)); headTilt = -0.25 * (1 - sm((F - w0) / 6));
    expr = 'tired';
    if (win(F, K.wake - 3, K.wake + 12)) { expr = F < K.wake ? 'squint' : 'surprised'; sq = takeSq(Fc - K.wake); tufts = F >= K.wake ? Math.exp(-(F - K.wake) / 8) : 0; }
    if (win(F, K.write[0], K.write[1])) { expr = 'squint'; wingR = -0.55 + 0.15 * Math.sin(Fc * 1.3); wingRx = 0.8; headTilt = 0.18; }
    if (win(F, K.toss[0], K.toss[1] + 2)) { const k = arc(F, K.toss[0], K.toss[1] + 2); wingR = lerp(-0.5, -2.7, k); wingRx = 0.2; sq = -0.08 * k; expr = 'determined'; headYaw = 0.5 * k; headTilt = -0.15 * k; }
    if (win(F, K.heave[0], K.clock + 4)) {
      const k = sm((F - K.heave[0]) / 5), up = arc(F, K.heave[0] + 4, K.clock);
      wingR = lerp(-0.3, -1.3, k); wingL = lerp(0.15, 1.1, sm((F - K.heave[1] + 8) / 5)); bodyLean = -0.22 * k + 0.1 * up; sq = F < K.heave[0] + 4 ? 0.1 * k : -0.06 * up; expr = 'determined';
      if (F >= K.clock) { sq = ringv(F - K.clock, 0.1, 1.0, 0.25); expr = 'squint'; wingL = 0.6; }
    }
    if (F >= K.clock + 4) {                        // the dare: a smirk at the tiny hourglass, then a look up the tube
      const late = F >= K.smirk[1] - 6;
      expr = late ? 'look' : 'grin'; headYaw = late ? 0.5 * sm((F - K.smirk[1] + 6) / 6) : -0.4 * sm((F - K.clock - 4) / 4);
      headTilt = late ? -0.25 * sm((F - K.smirk[1] + 6) / 6) : 0.1; wingL = lerp(0.6, 0.15, sm((F - K.clock - 4) / 8));
    }
  } else if (F < K.S8a) {
    // working by hand: nods; the S3b page turn and the glance
    expr = 'tired'; headTilt = 0.12 + 0.05 * Math.sin(TAU * F / 64); bodyLean = 0.04;
    if (win(F, K.gust[0], K.gust[1] + 6)) { const k = arc(F, K.gust[0], K.gust[1] + 6); bodyLean -= 0.12 * k; tufts = -0.6 * k; expr = 'squint'; }
    if (win(F, K.page[0] - 4, K.page[1] + 2)) { const k = arc(F, K.page[0] - 4, K.page[1] + 2); wingR = lerp(-0.15, -0.9, k); wingRx = 0.6 * k; headTilt = 0.22; }
    if (win(F, K.glance[0], K.S4)) { headYaw = -0.32 * sm((F - K.glance[0]) / 4); expr = F < K.glance[0] + 8 ? 'look' : 'worried'; headTilt = 0.05; }
    if (win(F, K.glance[0] + 8, K.S4)) headYaw = 0.34 * sm((F - K.glance[0] - 8) / 4);
  } else {
    // the answer arrives: the big take, the hug, relief; S9: yawn, lay the hourglass down
    const a = F - K.take;
    expr = a < -6 ? 'tired' : a < 0 ? 'look' : a < 22 ? 'surprised' : 'happy';
    headYaw = a < 0 ? 0.35 * sm((a + 12) / 6) : lerp(0.35, 0.0, sm(a / 5));
    sq = a >= -3 ? takeSq(twos(a)) * 1.3 : 0; tufts = a >= 0 ? Math.max(0, 1 - a / 30) * 1.2 : 0;
    glassesOff = a >= 0 && a < 26 ? Math.sin(Math.PI * clamp(a / 26)) : 0;
    wingL = a >= 0 ? 0.55 : 0.15; wingR = a >= 0 ? -0.55 : -0.15; wingLx = a >= 0 ? -0.9 : 0; wingRx = a >= 0 ? -0.9 : 0;
    if (a >= 26) { headTilt = 0.1 * Math.sin(TAU * F / 24); bodyLean = 0.05 * Math.sin(TAU * F / 24); }
    if (F >= K.handBack[0]) { const b = sm((F - K.handBack[0]) / 8); wingLx = lerp(-0.9, 0, b); wingRx = lerp(-0.9, 0, b); }
    if (F >= K.yawn[0]) {
      const y = F - K.yawn[0]; expr = y < 12 ? 'surprised' : 'sleep';
      sq = -0.1 * arc(y, 0, 12); headTilt = -0.2 * arc(y, 0, 12);
      if (F >= K.lay[0]) { const l = sm((F - K.lay[0]) / 10); wingR = lerp(-0.15, -1.0, arc(F, K.lay[0], K.lay[1])); bodyLean = -0.4 * l; headTilt = -0.25 * l; }
    }
  }
  const [x, y, z] = HOOT;
  R.root.position.set(x, y, z);
  R.root.rotation.set(0, 0.12, bodyLean);
  R.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
  R.head.rotation.set(headTilt * 0.4, headYaw, headTilt);
  R.wings[0].rotation.set(wingLx, 0, wingL); R.wings[1].rotation.set(wingRx, 0, wingR);
  R.tufts[0].rotation.z = 0.35 - tufts * 0.5; R.tufts[1].rotation.z = -0.35 + tufts * 0.5;
  R.tufts.forEach((t) => t.scale.setScalar(1 + Math.max(0, tufts) * 0.4));
  R.glasses.position.set(0, 0.03 + glassesOff * 0.5, 0.43 + glassesOff * 0.1);
  R.glasses.rotation.set(glassesOff * 1.5, 0, glassesOff * 3.2);
  R.disc.material.uniforms.uMap.value = R.faceTex[expr in R.faceTex ? expr : 'tired'][Math.floor(F / 2) % 2];
  st.hoot = { expr };
}

// ---- hourglasses ----------------------------------------------------------------------------------
// Sand lives in the local-top (A) or local-bottom (B) bulb. The physically upper bulb holds its sand as a cone
// resting on the neck; the lower bulb holds a heap on its cap. Both glasses have the same shape and the same neck
// (stream width), so they flow at the same rate: when the tiny one (one load) runs dry, the giant (68 loads) has
// drained exactly one load.
function sandPose(H, amt, isTop, upperIsTop) {
  const m = isTop ? H.topSand : H.botSand, s = H.s, c = Math.cbrt(clamp(amt)), hh = 0.3 * s * c;
  m.visible = amt > 0.002;
  m.scale.setScalar(Math.max(0.01, c));
  const upper = isTop === upperIsTop;
  if (upper) { if (isTop) { m.position.set(0, 0.6 * s + hh / 2 + 0.004 * s, 0); m.rotation.set(Math.PI, 0, 0); } else { m.position.set(0, 0.6 * s - hh / 2 - 0.004 * s, 0); m.rotation.set(0, 0, 0); } }
  else { if (isTop) { m.position.set(0, 1.13 * s - hh / 2, 0); m.rotation.set(Math.PI, 0, 0); } else { m.position.set(0, 0.07 * s + hh / 2, 0); m.rotation.set(0, 0, 0); } }
}
function setSand(H, A, B, th, flowing) {
  const upperIsTop = Math.cos(th) > 1e-3;
  sandPose(H, A, true, upperIsTop); sandPose(H, B, false, upperIsTop);
  const lower = upperIsTop ? B : A;
  H.stream.visible = flowing;
  const s = H.s, heap = 0.3 * s * Math.cbrt(clamp(lower));
  const a = 0.6 * s, b = upperIsTop ? 0.07 * s + heap : 1.13 * s - heap;
  H.stream.position.set(0, (a + b) / 2, 0); H.stream.scale.set(1, Math.max(0.001, Math.abs(a - b)), 1);
}
/** rotate an hourglass about its centre by th (z) and rest it on its lowest point */
function pose(H, th) {
  const h = H.h, s = H.s, c = Math.abs(Math.cos(th)), sn = Math.abs(Math.sin(th));
  const ch = (h / 2) * c + 0.34 * s * sn;
  H.pivot.rotation.set(0, 0, th);
  H.pivot.position.set(Math.sin(th) * h / 2, ch - Math.cos(th) * h / 2, 0);
}
const RUN = K.land - K.clock;                  // the TritonDFT run, request to answer (frames)
function updateHourglasses(F) {
  const G = W.giant;
  let up = 0, lift = 0;
  if (F >= K.heave[0] && F < K.lay[0]) up = sm((F - K.heave[0] - 3) / (K.clock - K.heave[0] - 3));
  if (F >= K.lay[0]) up = 1 - sm((F - K.lay[0]) / (K.lay[1] - K.lay[0] - 4));
  if (F >= K.heave[0] && F < K.clock) lift = 0.12 * arc(F, K.heave[0] + 2, K.clock);
  const over = F >= K.lay[0] && F < K.flop[1] ? 0.32 * arc(F, K.lay[0] + 6, K.flop[1]) : 0;   // past horizontal: the pinch pours back
  const thG = -(Math.PI / 2) * (1 - up) - over;
  G.g.position.set(GIANT[0] - Math.sin(thG) * G.h / 2, lift, lerp(GIANT_LAY[2], GIANT[2], up));   // bottom cap stays put
  G.g.rotation.set(0, 0.08 * (1 - up), 0);
  pose(G, thG);
  let drained = F < K.clock ? 0 : (F - K.clock) / (RUN * 68);           // in loads: exactly 1/68 at K.land
  if (F >= K.lay[0]) drained = ((K.lay[0] - K.clock) / (RUN * 68)) * (1 - sm((F - K.lay[0] - 8) / 12));
  setSand(G, 1 - drained, drained, thG, up > 0.98 && F >= K.clock && F < K.lay[0]);
  if (F >= K.clock && F < K.clock + 10) G.g.position.y += bumpv(F - K.clock, 0.02, 1.2, 0.3);
  // tiny: spent (all in the local-bottom bulb) until Hoot flicks it over at the clock; runs dry exactly at K.land;
  // it stays flipped (the same shape upside down, so it matches frame 0)
  const T0 = W.tiny;
  const flip = F >= K.clock - 6 ? sm((F - K.clock + 6) / 6) : 0;
  const thT = Math.PI * flip;
  T0.g.position.set(TINY[0], TINY[1] + 0.12 * Math.sin(Math.PI * flip), TINY[2]);
  pose(T0, thT);
  const out = F < K.clock ? 0 : clamp((F - K.clock) / RUN);            // the full local-bottom bulb drains into local-top
  setSand(T0, out, 1 - out, thT, F >= K.clock && F < K.land);
  st.tinyEmpty = F >= K.land;
}

// ---- the tube: bulge + capsule ----
function updateTube(F) {
  const T0 = W.tube, b = T0.bulge;
  const gulp = win(F, K.suck[0] + 1, K.suck[1] + 4) ? arc(F, K.suck[0] + 1, K.suck[1] + 4) : 0;
  T0.fun.scale.set(1 + 0.16 * gulp, 1 - 0.1 * gulp, 1 + 0.16 * gulp);                       // the funnel gulps the result
  let spit = 0;
  for (const f0 of [K.land - 2, ...K.outs, K.slam[1] + 2, ...K.dive.map((d) => d + 6)]) if (win(F, f0 - 2, f0 + 4)) spit = Math.max(spit, arc(F, f0 - 2, f0 + 4));
  T0.mouth.scale.setScalar(1 + 0.18 * spit);                                                // the desk mouth bulges as things pass
  let u = -1;
  if (F >= K.bulge[0] && F < K.bulge[1]) u = ease.inOutSine(clamp((F - K.bulge[0]) / (K.bulge[1] - K.bulge[0])));
  if (F >= K.suck[1] && F < K.land) u = 1 - ease.inOutSine(clamp((F - K.suck[1]) / (K.land - K.suck[1])));
  if (F >= K.dive[0] && F < NF - 4) u = clamp((F - K.dive[0]) / 20);
  b.visible = u >= 0 && u <= 1;
  if (b.visible) { b.position.copy(T0.curve.getPointAt(clamp(u))); const s = 0.62 + 0.08 * Math.sin(F * 1.7); b.scale.setScalar(s * 1.08); }
  st.bulgeU = u;
  const C = W.capsule;
  C.visible = F >= K.pop[0] && F < K.catch + 8;
  if (C.visible) {
    const f0 = T0.curve.getPointAt(1), tri = station(TRI_TH);
    const k = clamp((F - K.pop[0]) / (K.catch - K.pop[0]));
    const trip = [lerp(f0.x, tri[0] + 0.12, k), lerp(f0.y - 0.3, 0.62, k) + 0.3 * Math.sin(Math.PI * k), lerp(f0.z, tri[2] + 0.12, k)];
    if (F >= K.catch) { const tp = W.tri.arms[1].hand.getWorldPosition(V3(0, 0, 0)); trip[0] = tp.x; trip[1] = tp.y + 0.05; trip[2] = tp.z; }
    C.position.set(...trip); C.rotation.set(0, 0, F * 0.5 * (1 - clamp((F - K.catch) / 4)));
  }
}

// ---- the agents in S8/S9: out of the desk mouth onto the desk; S9 dive back in ----------------------
// k: 0 Tri, 1 Clack (late: rides the 68x down), 2 Loupe, 3 Tilt
// one owner per number, faces clear: Tri stands on the paper tower, Clack photobombs at the far left of the desk (after
// 68x has landed on its own), Loupe peeks over its scorecard (clear of the lamp), Tilt behind the $0.04 it tips its pennies into
const OUT_SPOT = [deskP(1.25, 0.5, -0.4), deskP(-1.72, 0.0, -0.3), deskP(-1.05, 0, -0.1), deskP(1.5, 0, 0.1)];
const OUT_T = [K.outs[0], K.slam[1] + 2, K.outs[1], K.outs[2]];
function outState(k, F) {
  const t0 = OUT_T[k];
  if (F < K.S8a - 10) return null;
  const hidden = { hidden: true, pos: [0, -9, 0], yaw: 0, sq: 0, expr: 'happy', arm: 0 };
  if (F < t0) return hidden;
  if (F >= K.dive[k] + 9) return F < NF - 3 ? hidden : null;
  const mouth = W.tube.curve.getPointAt(0), spot = OUT_SPOT[k];
  const a = F - t0, k1 = clamp(a / 12);
  let pos = [lerp(mouth.x, spot[0], k1), lerp(mouth.y - 0.1, spot[1], k1) + 0.4 * Math.sin(Math.PI * k1), lerp(mouth.z, spot[2], k1)];
  let sq = a < 12 ? -0.12 * Math.sin(Math.PI * k1) : ringv(a - 12, 0.16, 1.0, 0.25), expr = a < 12 ? 'surprised' : 'happy', arm = -0.5;
  const yaw = faceYaw(pos, [spot[0] * 0.8 + L.desk.x * 0.2, 0, spot[2] + 3]);
  if (F >= K.slam[2] + 6) { const ph = ((F + k * 5) % 14) / 14; pos[1] += 0.08 * Math.sin(Math.PI * ph); arm = -1.2 - 1.2 * Math.sin(Math.PI * ph); expr = 'grin'; }
  if (win(F, K.dive[k] - 4, K.dive[k])) { sq = 0.16 * sm((F - K.dive[k] + 4) / 3); expr = 'grin'; }   // crouch before the spring
  // at the brass mouth an agent is squeezed thin and small (it must fit the 0.1-radius pipe): popping out it grows from
  // that, diving back it springs up under the mouth, stretches and is sucked in from below (never through the pipe wall)
  let shrink = a < 4 ? lerp(0.22, 1, oc(a / 4)) : 1;
  if (F >= K.dive[k]) {
    const b = clamp((F - K.dive[k]) / 9), under = [mouth.x, mouth.y - 0.55, mouth.z];
    pos = b < 0.6 ? [lerp(pos[0], under[0], sm(b / 0.6)), lerp(pos[1], under[1], sm(b / 0.6)) + 0.25 * Math.sin(Math.PI * b / 0.6), lerp(pos[2], under[2], sm(b / 0.6))]
      : [mouth.x, lerp(under[1], mouth.y - 0.05, ic((b - 0.6) / 0.4)), mouth.z];
    shrink = b < 0.5 ? 1 : lerp(1, 0.18, sm((b - 0.5) / 0.5)); sq = -0.2 - 0.25 * sm((b - 0.4) / 0.6); expr = 'grin';
  }
  return { pos, yaw, sq, expr, arm, a, shrink };
}

// ---- Tri (Planner) ----
function updateTri(F) {
  const R = W.tri, Fc = twos(F);
  const home = station(TRI_TH);
  let pos = [...home], yaw = faceYaw(home, [home[0] + 0.3, 0, home[2] + 1.0]), lean = 0, sq = 0, hop = 0, expr = 'determined', armL = 0.4, armR = -0.4, armLx = 0, armRx = 0;
  armL += 0.05 * Math.sin(TAU * Fc / 36); armR -= 0.05 * Math.sin(TAU * Fc / 36 + 1.2);
  if (win(F, K.pop[0], K.catch + 6)) {
    const k = arc(F, K.catch - 8, K.catch + 2); hop = 0.22 * k; sq = F < K.catch - 8 ? 0.12 * sm((F - K.pop[0]) / 4) : -0.1 * k;
    armR = lerp(-0.4, -2.6, sm((F - K.catch + 8) / 6)); expr = F < K.catch ? 'look' : 'surprised';
    if (F >= K.catch) sq = ringv(F - K.catch, 0.14, 1.0, 0.25);
  }
  if (win(F, K.read[0] - 4, K.book[0])) { expr = 'squint'; armR = 1.3; armL = 0.5; armRx = -0.3; lean = 0.08 * Math.sin((F - K.read[0]) * 0.5); }   // card held out to the side
  if (win(F, K.book[0], K.book[1])) {                // a method book from the Library hub: tug, riffle, snap shut
    const toHub = faceYaw(home, [L.bench.x, 0, L.bench.z]);
    yaw = lerp(yaw, lerp(yaw, toHub, 0.42), sm((F - K.book[0]) / 4));   // 3/4 to the hub, never edge-on to camera armR = lerp(-0.4, -2.2, sm((F - K.book[0]) / 5)); lean = 0.15 * arc(F, K.book[0], K.book[0] + 10);
    expr = F < K.book[0] + 10 ? 'look' : F < K.book[1] - 5 ? 'squint' : 'happy';
  }
  if (win(F, K.book[1], K.deal[2] + 6)) {
    const a = F - K.chop;
    yaw = faceYaw(home, [home[0] + 0.7, 0, home[2] + 1.0]);
    if (a < 0) { lean = -0.35 * sm((F - K.book[1]) / (K.chop - K.book[1])); expr = 'squint'; }
    else { lean = lerp(0.55, 0, sm(a / 5)); sq = ringv(a, 0.12, 1.0, 0.25); expr = a < 8 ? 'grin' : 'determined'; }
    if (F >= K.deal[0]) { const d = K.deal.findIndex((f, i) => F >= f && (i === 2 || F < K.deal[i + 1])); armR = -0.6 - 1.2 * (d % 2); expr = 'determined'; }
  }
  if (F >= K.deal[2] + 6 && F < K.S3 + 20) { expr = 'happy'; armR = -0.6; }
  if (win(F, K.ding + 4, K.suck[0])) { const c = arc(F, K.ding + 4, K.ding + 16); expr = 'grin'; armR = -2.6 * Math.max(c, 0.6); hop = 0.1 * c; }   // the team cheers the DING
  if (win(F, K.salute - 8, K.salute + 10)) { armR = -2.8 * arc(F, K.salute - 8, K.salute + 10); expr = 'grin'; yaw = faceYaw(home, jobPos(F)); }
  const out = outState(0, F);
  if (out) { pos = out.pos; yaw = out.yaw; sq = out.sq; expr = out.expr; armR = out.arm; armL = -out.arm * 0.8; if (F >= K.handBack[0] && F < K.dive[0] + 10) armR = -1.4; }
  R.root.visible = !out || !out.hidden;
  R.root.scale.set(out && out.shrink ? out.shrink : 1, out && out.shrink ? out.shrink : 1, out && out.shrink ? out.shrink : 1);
  R.root.position.set(pos[0], pos[1] + hop, pos[2]);
  R.root.rotation.set(0, yaw, 0);
  R.body.rotation.set(lean * 0.3, 0, -lean);
  R.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
  R.arms[0].g.rotation.set(armLx, 0, armL); R.arms[1].g.rotation.set(armRx, 0, armR);
  R.face.material.uniforms.uMap.value = R.faceTex[expr in R.faceTex ? expr : 'determined'][Math.floor(F / 2) % 2];
}

// ---- Clack (Executor) ----
function updateClack(F) {
  const R = W.clack, Fc = twos(F);
  const home = station(ST.exec);
  let pos = [...home], yaw = faceYaw(home, [home[0] + 0.2, 0, home[2] + 1.0]), lean = 0, sq = 0, expr = 'determined', armL = 0.3, armR = -0.3, paperH = 0.18, keyHit = -1, rollerSpin = 0;   // faces the S3 camera
  armL += 0.06 * Math.sin(TAU * Fc / 30);
  const eng = W.engine;
  if (win(F, K.deal[0], K.type[0])) { expr = F < K.deal[0] + 8 ? 'surprised' : 'determined'; sq = F < K.deal[0] + 10 ? takeSq(Fc - K.deal[0] - 2) : 0; }
  if (win(F, K.type[0], K.rip)) {
    const a = F - K.type[0]; keyHit = Math.floor(a / 1.5) % 12; paperH = 0.18 + 0.28 * (a / (K.rip - K.type[0])); expr = 'squint'; rollerSpin = a * 0.12;
    sq = 0.03 * Math.sin(a * 1.6); armR = -0.9 + 0.3 * Math.sin(a * 1.9); armL = 0.9 + 0.3 * Math.sin(a * 2.3);
  }
  const slotW = eng.lipU.getWorldPosition(V3(0, 0, 0));
  const nearSlot = [slotW.x - 0.42, 0, slotW.z + 0.1];
  if (win(F, K.rip, K.feed[1])) {
    const k = sm((F - K.rip) / 6);
    pos = [lerp(home[0], nearSlot[0], k), 0, lerp(home[2], nearSlot[2], k)]; yaw = faceYaw(pos, [slotW.x, 0, slotW.z]); lean = 0.2 * arc(F, K.feed[0], K.feed[1]); armR = -1.6; armL = 1.2; expr = 'determined';
    sq = F < K.rip + 6 ? -0.06 * Math.sin(Math.PI * k) : 0;
  }
  const knob = eng.knob.getWorldPosition(V3(0, 0, 0));
  if (win(F, K.feed[1], K.roar + 10)) {
    const k = sm((F - K.jump[0]) / (K.jump[1] - K.jump[0]));
    yaw = faceYaw(nearSlot, [knob.x, 0, knob.z]);
    const hang = [knob.x - 0.02, knob.y - 0.52, knob.z + 0.1];
    if (F < K.jump[0]) { pos = nearSlot; sq = 0.16 * sm((F - K.feed[1]) / 3); expr = 'squint'; }
    else {
      pos = [lerp(nearSlot[0], hang[0], k), lerp(0, hang[1], k) + 0.3 * Math.sin(Math.PI * k), lerp(nearSlot[2], hang[2], k)];
      sq = -0.18 * Math.sin(Math.PI * k); armL = -2.6 * k; armR = 2.6 * k; expr = F < K.lever ? 'determined' : 'strain';
      if (F >= K.lever) { pos = [knob.x - 0.02, knob.y - 0.52, knob.z + 0.1]; sq = -0.12 + 0.05 * Math.sin(F * 1.4) - 0.1 * arc(F, K.lever, K.roar + 2); rollerSpin = F * 0.9; yaw = lerp(faceYaw(nearSlot, [knob.x, 0, knob.z]), -0.2, sm((F - K.lever) / 4)); }   // hangs facing camera, stretched by the yank
    }
  }
  if (win(F, K.roar + 10, K.roar + 22)) {                      // lets go and hops home before the camera locks on the cell
    const k = sm((F - K.roar - 10) / 12), from = [knob.x - 0.02, knob.y - 0.52, knob.z + 0.1];
    pos = [lerp(from[0], home[0], k), lerp(from[1], 0, k) + 0.25 * Math.sin(Math.PI * k), lerp(from[2], home[2], k)];
    sq = F > K.roar + 19 ? ringv(F - K.roar - 19, 0.14, 1.0, 0.25) : 0; expr = 'grin';
  }
  if (win(F, K.roar + 22, K.S3b)) expr = 'grin';
  if (win(F, K.huff - 8, K.huff + 10)) { expr = 'strain'; sq = 0.08 * arc(F, K.huff - 8, K.huff + 10); }
  const out = outState(1, F);
  if (out) { pos = out.pos; yaw = out.yaw; sq = out.sq; expr = out.expr; armR = out.arm; armL = -out.arm; }
  R.root.visible = !out || !out.hidden;
  R.root.scale.set(out && out.shrink ? out.shrink : 1, out && out.shrink ? out.shrink : 1, out && out.shrink ? out.shrink : 1);
  R.root.position.set(pos[0], pos[1], pos[2]);
  R.root.rotation.set(0, yaw, 0);
  R.body.rotation.set(lean, 0, 0);
  R.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
  R.armL.rotation.set(0, 0, armL); R.armR.rotation.set(0, 0, armR);
  R.keys.forEach((kg, i) => { kg.position.y = (i < 6 ? 0.25 : 0.195) - (i === keyHit || i === (keyHit + 7) % 12 ? 0.018 : 0); });
  R.roller.rotation.x = rollerSpin;
  R.paper.scale.y = paperH;
  R.paper.visible = !(F >= K.rip && F < K.rip + 40);
  R.face.material.uniforms.uMap.value = R.faceTex[expr in R.faceTex ? expr : 'determined'][Math.floor(F / 2) % 2];
}

// ---- Big Iron ----
function updateEngine(F) {
  const E = W.engine;
  const roar = F >= K.roar && F < K.roar + 34 ? 1 - sm((F - K.roar - 20) / 14) : 0;
  const huff = win(F, K.huff - 4, K.huff + 10) ? arc(F, K.huff - 4, K.huff + 10) : 0;
  const hum = 0.008 * Math.sin(TAU * F / 12);
  E.body.position.set(roar * 0.02 * Math.sin(F * 2.9), 0, 0);
  E.body.scale.set(1 - hum - roar * 0.03 * Math.sin(F * 1.7), 1 + hum + roar * 0.05 * Math.sin(F * 1.7) + 0.04 * huff, 1 - hum);
  E.pist.forEach((p, i) => { const y = 0.12 * (roar + huff * 0.6) * Math.abs(Math.sin(F * 0.9 + i * 1.6)) + 0.02 * Math.sin(TAU * F / 24 + i); p.rod.position.y = L.engine.h + 0.45 + y; p.cap.position.y = L.engine.h + 0.7 + y; });
  const down = F >= K.lever && F < K.roar + 12 ? sm((F - K.lever) / (K.roar - K.lever - 1)) : F >= K.roar + 12 && F < K.roar + 20 ? 1 - ob((F - K.roar - 12) / 8) : 0;
  E.lever.rotation.set(-1.0 * down, 0, 0.1);
  const chomp = win(F, K.feed[1] - 3, K.feed[1] + 5) ? arc(F, K.feed[1] - 3, K.feed[1] + 5) : 0;
  E.lipU.position.y = E.slot[1] + 0.09 + 0.05 * chomp; E.lipD.position.y = E.slot[1] - 0.09 - 0.04 * chomp;
  E.rings.forEach((m, i) => {
    const a = F - (K.roar + i * 7), b = F - (K.huff + 1);
    let age = -1; if (a >= 0 && a < 30 && i < 3) age = a; else if (b >= 0 && b < 22 && i === 3) age = b;
    m.visible = age >= 0;
    if (m.visible) { const s = 0.12 + age * 0.018; m.scale.set(s, s, s * 0.8); m.position.set(0.48 + age * 0.012, L.engine.h + 0.75 + age * 0.05, 0.05 + age * 0.01); }
  });
  E.fire.material.uniforms.uGlow.value = 0.5 + 0.5 * roar + 0.3 * huff;
  st.roar = roar; st.huff = huff;
}

// ---- Loupe (Analyzer) + gauge ----
function beadY(F) {                     // bead offset from the band centre (board units); band half-height 0.028
  if (F < K.bead1) return -0.13;
  if (F < K.S6) { const a = F - K.bead1; return 0.095 + 0.07 * Math.exp(-a / 7) * Math.cos(a * 0.5) - 0.2 * Math.exp(-a / 2); }   // lap 1: settles outside (above) the band
  if (F < K.read7) return -0.13 * sm((F - K.S6) / 10);
  if (F < 700) { const a = F - K.read7; return 0.11 * Math.exp(-a / 6.5) * Math.cos(a * 0.55); }                          // lap 2: settles inside
  return -0.13 * sm((F - 700) / 10);
}
function updateLoupe(F) {
  const R = W.loupe;
  const home = station(ST.anlz);
  let pos = [...home], yaw = faceYaw(home, [home[0] - 0.5, 0, home[2] + 1.0]), lean = 0, sq = 0, hop = 0, headTilt = 0, shakeNo = 0, eye = 'dot', armL = 0.3, armR = -0.3;
  const gp = station(ST.anlz - 0.36, 1.5);
  if (win(F, K.hop4[0], K.hop4[1])) { const k = arc(F, K.hop4[0], K.hop4[1]); hop = 0.18 * k; sq = -0.1 * k; }
  if (win(F, K.read4[0], K.rush[0])) {
    lean = 0.4 * sm((F - K.read4[0]) / 6); headTilt = -0.45 * sm((F - K.read4[0]) / 6); eye = 'big';
    yaw = faceYaw(home, [home[0] + 0.6, 0, home[2] + 0.35]);        // reads the output tape at its front-right
    if (F >= K.read4[0] + 12) { yaw = faceYaw(home, gp); headTilt = -0.1; lean = 0.2; }
    if (F >= K.fail) { eye = 'spiral'; shakeNo = Math.sin((F - K.fail) * 1.3) * 0.35 * Math.exp(-(F - K.fail) / 10); lean *= 0.5; }
  }
  if (win(F, K.rush[0], K.S5)) { eye = 'spiral'; yaw = faceYaw(home, [home[0] + 0.6, 0, home[2] + 1.5]); lean = 0.25 * sm((F - K.rush[0]) / 6); }
  if (win(F, K.lap[1] - 8, K.S7 + 4)) headTilt = -0.2;
  if (win(F, K.S7, K.planks[1])) {
    lean = 0.3 * sm((F - K.S7) / 6); eye = 'big'; yaw = faceYaw(home, gp); headTilt = -0.1;
    if (F >= K.ding) { eye = 'star'; lean = lerp(lean, 0, sm((F - K.ding) / 4)); hop = 0.25 * arc(F, K.ding, K.ding + 10); sq = F < K.ding + 10 ? -0.12 * arc(F, K.ding, K.ding + 10) : ringv(F - K.ding - 10, 0.14, 1.0, 0.25); yaw = faceYaw(home, [home[0] - 0.3, 0, home[2] + 1]); }
  }
  if (win(F, K.planks[1], K.S8a)) { eye = F < K.planks[1] + 8 ? 'star' : 'happy'; yaw = faceYaw(home, jobPos(F)); }
  const out = outState(2, F);
  let stampOn = false;
  if (out) {
    pos = out.pos; yaw = out.yaw; sq = out.sq; eye = out.expr === 'surprised' ? 'big' : 'happy'; armR = out.arm;
    stampOn = F >= K.outs[1] + 12 && F < K.dive[2];
    if (F >= K.outs[1] + 12) yaw = faceYaw(pos, [SCORE[0] + 0.3, 0, SCORE[2] + 1.2]);
    if (F >= K.slam[0] - 8 && F < K.slam[0] + 10) { const a = F - K.slam[0]; armR = a < 0 ? lerp(-0.5, -2.8, sm((a + 8) / 6)) : lerp(-0.2, -0.6, sm(a / 8)); sq = a >= 0 ? ringv(a, 0.14, 1.0, 0.25) : 0.08; }
  }
  R.root.visible = !out || !out.hidden;
  R.root.scale.set(out && out.shrink ? out.shrink : 1, out && out.shrink ? out.shrink : 1, out && out.shrink ? out.shrink : 1);
  R.root.position.set(pos[0], pos[1] + hop, pos[2]);
  R.root.rotation.set(0, yaw + shakeNo, 0);
  R.body.rotation.set(lean, 0, 0);
  R.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
  R.head.rotation.set(headTilt, 0, 0);
  R.arms[0].rotation.set(0, 0, armL); R.arms[1].rotation.set(0, 0, armR);
  W.stamp.visible = stampOn;
  if (stampOn) {
    W.scene.updateMatrixWorld(true);
    const hp = R.arms[1].children[1].getWorldPosition(V3(0, 0, 0));
    let sp = [hp.x, hp.y - 0.14, hp.z];
    if (F >= K.slam[0] - 3 && F < K.slam[0] + 8) { const k = F < K.slam[0] ? sm((F - K.slam[0] + 3) / 3) : 1 - sm((F - K.slam[0] - 3) / 5); sp = [lerp(sp[0], SCORE[0], k), lerp(sp[1], 0.36, k), lerp(sp[2], SCORE[2] + 0.08, k)]; }
    W.stamp.position.set(...sp); W.stamp.rotation.set(0, yaw, 0);
  }
  W.gauge.position.set(gp[0], 0, gp[2]); W.gauge.rotation.y = faceYaw(gp, [gp[0] + 0.25, 0, gp[2] + 1]);
  W.bead.position.y = 0.33 + beadY(F);
  st.loupe = { eye, rimR: R.rimR };
  st.bead = beadY(F);
}

// ---- Tilt (Refiner) + console ----
function kgrid(F) { if (F < K.click[0]) return 3; if (F < K.click[1]) return 4; if (F < K.click[2]) return 5; return 4; }
// pennies plink in one at a time after each finer grid (2 -> 4 -> 6); backing off to 4x4 flicks two off (four = $0.04)
function pennies(F) { if (F < K.click[0]) return 2; if (F < K.click[1]) return 2 + Math.min(2, 1 + Math.floor((F - K.click[0]) / 3)); if (F < K.click[2]) return 4 + Math.min(2, 1 + Math.floor((F - K.click[1]) / 3)); return 4; }
function updateTilt(F) {
  const R = W.tilt;
  const home = station(ST.refn);
  let pos = [...home], yaw = faceYaw(home, [home[0] + 0.4, 0, home[2] + 1.0]), sq = 0, expr = 'determined', lean = 0;
  // beam (positive = accuracy pan up): not accurate enough -> finer grid -> too costly (crash) -> back off -> level
  let beam = 0.2 + 0.03 * Math.sin(TAU * F / 48);
  if (F >= K.click[0]) beam = 0.1 + bumpv(F - K.click[0], 0.1, 0.8, 0.2);
  if (F >= K.click[1]) beam = -0.5 + ringv(F - K.click[1], 0.12, 0.9, 0.15);
  if (F >= K.click[2]) beam = lerp(-0.5, -0.06, sm((F - K.click[2]) / 6)) + bumpv(F - K.click[2], 0.08, 0.8, 0.2);
  if (F >= K.cutoff) beam = -0.06 * Math.exp(-(F - K.cutoff) / 6) + ringv(F - K.cutoff, 0.05, 0.9, 0.18);
  if (F >= K.level + 8) beam = 0.01 * Math.sin(TAU * F / 40);
  if (F < K.S5) beam = 0.2 + 0.03 * Math.sin(TAU * F / 48);
  if (F >= K.S6 + 40) beam = 0.01 * Math.sin(TAU * F / 40);
  // S5: face to camera, eyes on the console at its right hand (screen left); a glance at the crashing pan
  if (win(F, K.S5, K.click[0])) { expr = 'squint'; yaw = -0.5; }
  if (win(F, K.click[0], K.go + 6)) { yaw = lerp(-0.5, -0.22, sm((F - K.click[0]) / 5)); expr = 'determined'; }
  if (win(F, K.crash, K.click[2])) yaw = lerp(-0.22, 0.3, sm((F - K.crash) / 3));
  if (win(F, K.click[2], K.go + 6)) yaw = lerp(0.3, -0.3, sm((F - K.click[2]) / 5));
  if (win(F, K.level, K.go + 6)) yaw = lerp(-0.3, 0.0, sm((F - K.level) / 5));
  if (win(F, K.click[1], K.click[2] + 2)) { expr = F < K.crash + 3 ? 'surprised' : 'worried'; sq = takeSq(F - K.crash); lean = -beam * 0.25 + 0.1 * Math.sin((F - K.crash) * 0.9) * Math.exp(-(F - K.crash) / 12); }
  if (win(F, K.cutoff, K.go)) expr = F < K.level ? 'squint' : 'happy';
  for (const f0 of [...K.click, K.cutoff]) if (win(F, f0 - 5, f0 + 3)) { const k = arc(F, f0 - 5, f0 + 3); lean += 0.14 * k; sq += 0.06 * k; }   // a nod into the console on each click
  if (win(F, K.go - 3, K.go + 8)) { expr = 'grin'; sq = F < K.go ? 0.12 : ringv(F - K.go, 0.14, 1.0, 0.25); }
  if (win(F, K.S6, K.lap[1])) expr = 'happy';
  if (win(F, K.ding + 4, K.suck[0])) { expr = 'grin'; sq = ringv(F - K.ding - 6, 0.12, 1.0, 0.25); }
  if (win(F, K.go + 2, K.S8a)) { const k = sm((F - K.go - 2) / 8); pos = station(ST.refn, lerp(L.stR, 1.66, k)); pos[1] = 0.12 * arc(F, K.go + 2, K.go + 10); }   // hops back off the ring edge for the lap
  let panTip = 0;
  const out = outState(3, F);
  if (out) {
    pos = out.pos; yaw = out.yaw; sq = out.sq; expr = out.expr; beam = 0.02 * Math.sin(F * 0.3);
    if (F >= K.slam[2] - 8 && F < K.slam[2] + 16) { panTip = arc(F, K.slam[2] - 8, K.slam[2] + 16); beam = -0.3 * panTip; }
  }
  R.root.visible = !out || !out.hidden;
  R.root.scale.set(out && out.shrink ? out.shrink : 1, out && out.shrink ? out.shrink : 1, out && out.shrink ? out.shrink : 1);
  R.root.position.set(pos[0], pos[1], pos[2]);
  R.root.rotation.set(0, yaw, 0);
  R.body.rotation.set(0, 0, lean);
  R.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
  R.beam.rotation.set(0, 0, beam);
  R.headM.material.uniforms.uMap.value = R.faceTex[expr in R.faceTex ? expr : 'determined'][Math.floor(F / 2) % 2];
  W.scene.updateMatrixWorld(true);
  R.pans.forEach((p, i) => { const w = R.hands[i].getWorldPosition(V3(0, 0, 0)); p.g.position.copy(w); p.g.scale.setScalar(R.root.scale.x); p.g.rotation.set(i === 1 ? 0.9 * panTip : 0, yaw, 0.12 * Math.sin(F * 0.5 + i) * Math.abs(beam)); p.g.visible = R.root.visible; });
  const n = out ? 4 : pennies(F);
  R.pennies.forEach((m, k) => { m.visible = k < n; });
  const kg = kgrid(F);
  W.gem.scale.setScalar(kg === 3 ? 0.7 : kg === 4 ? 1.0 : 1.3);
  const cpos = [home[0] - 0.66, 0, home[2] + 0.16];            // left-front of Tilt, clear of the accuracy pan
  W.con.root.position.set(cpos[0], 0, cpos[2]);
  W.con.root.rotation.y = faceYaw(cpos, [cpos[0] + 0.15, 0, cpos[2] + 1.0]);
  const since = F - (kg === 4 && F < K.click[1] ? K.click[0] : kg === 5 ? K.click[1] : kg === 4 ? K.click[2] : -99);
  W.pegs.forEach(({ i, j, m }) => {
    const on = i < kg && j < kg, sp = 0.2 / (kg - 1);
    m.visible = on;
    m.position.set(-0.1 + i * sp, 0.03, -0.07 + j * sp * 0.7);
    m.scale.y = on ? (since >= 0 && since < 6 ? Math.max(0.05, ob(since / 4)) : 1) : 0.01;
  });
  W.con.knobs[0].rotation.y = -(kg - 3) * 0.7;
  W.con.knobs[1].rotation.y = F >= K.cutoff ? -0.5 : 0;
  W.con.go.position.z = 0.17 - (win(F, K.go - 1, K.go + 4) ? 0.03 : 0);
  st.tilt = { beam, kg };
}

// ---- props ----
function updateProps(F) {
  { // Tri's method book: slides out of the Library drum into its hand, riffles, flies back
    const Bk = W.mbook, b0 = K.book[0], b1 = K.book[1];
    Bk.visible = win(F, b0, b1 + 8);
    const tth = TRI_TH, slot = W.hubBooks.reduce((best, b) => (Math.abs(Math.atan2(Math.sin(b.a - tth), Math.cos(b.a - tth))) < Math.abs(Math.atan2(Math.sin(best.a - tth), Math.cos(best.a - tth))) ? b : best));
    W.hubBooks.forEach((b) => { b.m.visible = b !== slot || !Bk.visible; });
    if (Bk.visible) {
      const tri = station(TRI_TH), dx = tri[0] - L.bench.x, dz = tri[2] - L.bench.z, dl = Math.hypot(dx, dz);
      const edge = [L.bench.x + dx / dl * 0.32, 0.19, L.bench.z + dz / dl * 0.32];
      const hp = W.tri.arms[1].hand.getWorldPosition(V3(0, 0, 0)), hand = [hp.x, hp.y + 0.02, hp.z];
      const k = sm((F - b0) / 6) * (1 - sm((F - b1 + 2) / 8));
      Bk.position.set(lerp(edge[0], hand[0], k), lerp(edge[1], hand[1], k) + 0.12 * Math.sin(Math.PI * k), lerp(edge[2], hand[2], k));
      Bk.rotation.set(0, Math.atan2(dx, dz), (F > b0 + 6 && F < b1 - 2 ? 0.25 * Math.sin((F - b0) * 1.3) : 0) + 0.3 * k);
    }
  }
  const C = W.card;
  C.visible = false;
  if (win(F, K.write[0] - 4, K.toss[1])) {           // scribbled on the desk, then tossed up into the tube mouth
    C.visible = true;
    const p0 = deskP(0.05, 0.02, -0.2), mouth = W.tube.curve.getPointAt(0);
    const k = ic(clamp((F - K.toss[0]) / (K.toss[1] - K.toss[0])));
    C.position.set(lerp(p0[0], mouth.x, k), lerp(p0[1], mouth.y - 0.05, k) + 0.35 * Math.sin(Math.PI * k), lerp(p0[2], mouth.z, k));
    C.rotation.set(-Math.PI / 2 * (1 - k), 0.1 + k * 3, 0.2 * k); C.scale.set(1 - 0.7 * k, 1 - 0.5 * k, 1);
  }
  if (win(F, K.catch + 4, K.book[0] + 4)) {          // Tri reads it, held out to its side so its squint stays in view
    C.visible = true; const cp = W.tri.root.localToWorld(V3(0.36, 0.5 + 0.015 * Math.sin(F * 0.7), 0.12));
    C.position.copy(cp); C.rotation.set(-0.08, W.tri.root.rotation.y - 0.45, 0.06); C.scale.setScalar(ob((F - K.catch - 4) / 5));
  }
  const tri = station(TRI_TH), cl = station(ST.exec);
  W.tickets.forEach((m, k) => {
    m.visible = win(F, K.chop, K.type[0] + 2);
    if (!m.visible) return;
    const t0 = K.deal[k] - 4, a = clamp((F - t0) / 8);
    const start = [tri[0] + 0.25 + (k - 1) * 0.16, 0.55 + 0.05 * Math.sin(Math.PI * clamp((F - K.chop) / 6)), tri[2] + 0.2];
    const end = [cl[0] - 0.05 + (k - 1) * 0.03, 0.5 + k * 0.012, cl[2] - 0.12];
    m.position.set(lerp(start[0], end[0], a), lerp(start[1], end[1], a) + 0.35 * Math.sin(Math.PI * a), lerp(start[2], end[2], a));
    m.rotation.set(-0.3 - a * 0.9, 0.3 * (k - 1) + a * 2.2, 0.1 * (k - 1));
    m.scale.setScalar(ob((F - K.chop) / 4));
  });
  const S = W.sheet;
  S.visible = win(F, K.rip, K.feed[1] + 1);
  if (S.visible) {
    const rp = W.clack.roller.getWorldPosition(V3(0, 0, 0)), slot = W.engine.lipU.getWorldPosition(V3(0, 0, 0));
    const k = sm((F - K.rip) / (K.feed[1] - K.rip));
    S.position.set(lerp(rp.x, slot.x - 0.02, k), lerp(rp.y + 0.22, slot.y - 0.09, k) + 0.2 * Math.sin(Math.PI * k), lerp(rp.z, slot.z, k));
    S.rotation.set(0, lerp(W.clack.root.rotation.y, -Math.PI / 2, k), 0.3 * Math.sin(Math.PI * k)); S.scale.set(1, 1 - 0.8 * sm((F - K.feed[1] + 4) / 4), 1);
  }
  updateTape(F);
  { // Hoot turns ONE page of the lattice book in S3b (cube -> the honeycomb underneath: still not silicon); reset at f330,
    // while the desk is off camera, so S1 / S8 / S9 see the unturned book
    const t = win(F, K.page[0], 330) ? sm((F - K.page[0]) / (K.page[1] - K.page[0])) : 0;
    W.flip.rotation.set(0, 0, Math.PI * t); W.flip.position.y = 0.085 + 0.06 * Math.sin(Math.PI * t);
  }
  { // the scorecard: pops up on the desk as Loupe lands, folds away as Loupe dives back into the tube
    const on = F >= K.outs[1] + 10 && F < K.dive[2] + 8;
    let k = on ? ob((F - K.outs[1] - 10) / 6) : 0;
    W.scoreG.position.set(SCORE[0], 0, SCORE[2]);
    if (F >= K.dive[2] - 5) {                        // Loupe grabs it and carries it into the tube (it shrinks with Loupe)
      const lp = W.loupe.root.position, g = sm((F - K.dive[2] + 5) / 4);
      W.scoreG.position.set(lerp(SCORE[0], lp.x + 0.1, g), lerp(0, lp.y + 0.05, g), lerp(SCORE[2], lp.z + 0.05, g));
      k = lerp(1, 0.45, g) * W.loupe.root.scale.x;
    }
    W.scoreG.visible = on && W.loupe.root.visible && k > 0.02; W.scoreG.scale.setScalar(Math.max(0.02, k));
    W.score.material.uniforms.uMap.value = W.scoreTex[F < K.slam[0] ? 0 : F < K.slam[0] + 3 ? 1 : 2];
  }
  let pk = F >= K.planks[0] && F < NF - 8 ? ob((F - K.planks[0]) / 10) : 0;
  if (win(F, K.suck[0], K.suck[1])) pk *= 1 - sm((F - K.suck[0]) / 3);   // the planks fold down before the gulp
  W.planks.visible = pk > 0.01;
  W.planks.scale.set(1, Math.max(0.01, pk), 1);
}

function updateTape(F) {
  const T = W.tape, E = W.engine;
  const sp = E.spout.getWorldPosition(V3(0, 0, 0));
  const anlz = station(ST.anlz);
  const end = [anlz[0] + 0.25, 0.012, anlz[2] + 0.1];           // the tape ends at Loupe's front-right, where it reads it
  let grow = 0;
  if (F >= K.tape[0] && F < K.S6 + 6) grow = clamp((F - K.tape[0]) / (K.tape[1] - K.tape[0]));
  if (F >= K.huff && F < K.S8a) grow = clamp((F - K.huff) / 18);      // lap 2: a fresh tape
  T.visible = grow > 0.01;
  if (!T.visible) return;
  const pos = T.geometry.attributes.position, base = T.userData.base;
  const P = (u) => {
    const a = [sp.x, sp.y, sp.z + 0.1], m = [lerp(sp.x, end[0], 0.35), 0.05, lerp(sp.z, end[2], 0.35) + 0.15];
    const q = u < 0.35 ? u / 0.35 : (u - 0.35) / 0.65;
    return u < 0.35 ? [lerp(a[0], m[0], q), lerp(a[1], m[1], q * q), lerp(a[2], m[2], q)] : [lerp(m[0], end[0], q), 0.012, lerp(m[2], end[2], q)];
  };
  for (let i = 0; i < pos.count; i++) {
    const bx = base[i * 3], by = base[i * 3 + 1];
    const u = (bx + 0.5) * grow;
    const c = P(u), c2 = P(Math.min(1, u + 0.01));
    const tx = c2[0] - c[0], tz = c2[2] - c[2], tl = Math.hypot(tx, tz) || 1;
    pos.setXYZ(i, c[0] - tz / tl * by, c[1] + 0.002, c[2] + tx / tl * by);
  }
  pos.needsUpdate = true; T.geometry.computeVertexNormals();
}

// ---- the numerals: one row along the desk's front edge; 98% rises from the stamped scorecard, 68x drops out of the
// tube mouth with Clack riding it, $0.04 springs from Tilt's cost pan
const NUM_SPOT = { n98: deskP(-1.06, 0.0, 0.62), n68: deskP(0.08, 0.0, 0.6), n04: deskP(1.26, 0.0, 0.62) };   // a tight row with clear gaps (never '68x$0.04')
/** 68x's group position at F: drops out of the desk mouth from clack68[0], lands on its spot at slam[1] */
function n68Pos(F) {
  const s = NUM_SPOT.n68, mouth = W.tube.curve.getPointAt(0);
  if (F >= K.slam[1]) return [...s];
  const k = clamp((F - K.clack68[0]) / (K.slam[1] - K.clack68[0]));
  return [lerp(mouth.x, s[0], k), lerp(mouth.y - 0.2, s[1], ic(k)) + 0.4 * Math.sin(Math.PI * k), lerp(mouth.z, s[2], k)];
}
function updateNumbers(F) {
  const t = { n98: K.slam[0], n68: K.slam[1], n04: K.slam[2] };
  const mouth = W.tube.curve.getPointAt(0);
  for (const key of Object.keys(W.num)) {
    const q = W.num[key], a = F - t[key], s = NUM_SPOT[key];
    const vis = (key === 'n68' ? F >= K.clack68[0] : a >= -2) && F < K.puffs + 4;
    q.group.visible = vis;
    if (!vis) continue;
    q.group.position.set(s[0], s[1], s[2]);
    if (key === 'n68') q.group.position.set(...n68Pos(F));
    q.group.rotation.set(0, key === 'n68' ? 0.04 : key === 'n98' ? 0.16 : -0.18, key === 'n68' && a < 0 ? 0.25 * Math.sin(F * 0.4) : 0);
    q.glyphs.forEach((gl, i) => {
      const ai = a - i * 1.5;
      let y = 0, sy = 1, sxz = 1, rz = gl.rz;
      if (key === 'n68') { if (ai >= 0) { sy = 1 - ringv(ai, 0.3, 0.8, 0.18); sxz = 1 + ringv(ai, 0.14, 0.8, 0.18); rz += bumpv(ai, 0.06, 0.7, 0.15); } }
      else { const p = ob(ai / 6); sy = Math.max(0.01, p); sxz = Math.max(0.01, p); y = ai < 0 ? -0.15 : 0; }
      const puff = F >= K.puffs ? 1 - sm((F - K.puffs - i) / 3) : 1;
      gl.g.position.set(gl.home.x, gl.home.y + y, gl.home.z);
      gl.g.scale.set(sxz * puff, sy * puff, sxz * puff);
      gl.g.rotation.set(0, gl.ry, rz);
      gl.g.visible = puff > 0.02 && sy > 0.02;
    });
  }
}

// ---------------------------------------------------------------------------------------------------
// camera: shot rigs (orbit params {tg, az, el, r, fov, roll}) blended with whips; rig(NF) == rig(0)
// ---------------------------------------------------------------------------------------------------
const B = L.bench;
const HT = [HOOT[0], 0.62, HOOT[2]];
const rigS1 = (F) => {        // medium 3/4 on Hoot with the tube plate in frame; slow push; tilt up the tube at the end
  const k = sm(F / 80), up = sm((F - 78) / 18);
  return { tg: [lerp(HT[0] + 0.62, HT[0] + 0.58, k) + 0.4 * up, 0.8 + 0.7 * up, HT[2] + 0.45], az: lerp(0.3, 0.22, k), el: lerp(0.1, 0.14, k), r: lerp(3.8, 3.4, k), fov: 32, roll: lerp(0.02, -0.02, k) };
};
const rigHome = (F) => rigS1(F);
const rigFunnel = (F) => {    // low on the funnel, crane down to Tri
  const k = sm((F - 96) / 14), tri = station(TRI_TH);
  return { tg: [tri[0] + 0.32, lerp(1.45, 0.5, k), tri[2] + 0.12], az: lerp(0.1, 0.25, k), el: lerp(-0.08, 0.38, k), r: lerp(3.0, 2.2, k), fov: 34, roll: 0.03 };
};
const rigTri = (F) => {
  const tri = station(TRI_TH), k = sm((F - K.book[1]) / 26);
  return { tg: [lerp(tri[0] + 0.32, tri[0] + 0.8, k), lerp(0.5, 0.4, k), lerp(tri[2] + 0.12, tri[2] + 0.1, k)], az: lerp(0.25, 0.3, k), el: lerp(0.38, 0.2, k), r: lerp(2.2, 2.9, k), fov: 34, roll: lerp(0.04, 0.0, k) };
};
const rigClack = (F) => {     // medium on Clack; crash pull-back to a low dutch wide of Big Iron at the lever
  const cl = station(ST.exec), E = L.engine;
  const k = ic(clamp((F - K.roar + 3) / 6));
  const cp = W.clack.root.position, f = sm((F - K.rip) / 10);
  const med = { tg: [lerp(cl[0] + 0.25, cp.x + 0.2, f), lerp(0.34, cp.y + 0.36, f), lerp(cl[2] - 0.1, cp.z, f)], az: lerp(0.3, 0.36, f), el: lerp(0.14, 0.22, f), r: lerp(2.2, 2.4, f), fov: 34, roll: 0.02 };   // just right of Loupe: Clack face-on
  const wide = { tg: [lerp(cl[0], E.x, 0.45), 0.55, lerp(cl[2], E.z, 0.4)], az: 0.3, el: 0.02, r: 4.6, fov: 36, roll: -0.12 };
  return mixRig(med, wide, k);
};
const rigCell = (F) => {      // tilt down to the silicon cell: it breathes and settles, density condenses on the bonds
  const jp = jobPos(F), k = sm((F - 230) / 12);
  return { tg: [jp[0], 0.42, jp[2]], az: lerp(0.62, 0.5, k), el: lerp(0.22, 0.26, k), r: lerp(1.6, 1.45, k), fov: 32, roll: 0.0 };   // locked while the cell relaxes
};
const rigS3b = (F) => {       // low at the desk edge: the tiny hourglass sharp in the foreground, Hoot and the giant behind it
  const k = sm((F - K.S3b) / 40), m = [lerp(HT[0], TINY[0], 0.55), 0.46, lerp(HT[2], TINY[2], 0.5)];
  return { tg: m, az: lerp(0.36, 0.28, k), el: lerp(0.1, 0.07, k), r: lerp(2.35, 2.05, k), fov: 32, roll: 0.02 };
};
const rigLoupe = (F) => {     // Loupe and its gauge side by side, the lens three-quarters to camera (its eye reads); slow push
  const an = station(ST.anlz), gp = station(ST.anlz - 0.36, 1.5), k = sm((F - K.S4) / 30);
  return { tg: [lerp(an[0], gp[0], 0.45), 0.4, lerp(an[2], gp[2], 0.45)], az: lerp(0.4, 0.28, k), el: lerp(0.24, 0.18, k), r: lerp(2.1, 1.75, k), fov: 34, roll: 0.03 };
};
const rigLens = (F) => {      // the lens rushes at the camera (iris match cut to the knob)
  const hp = W.loupe.head.getWorldPosition(V3(0, 0, 0)), k = ic(clamp((F - K.rush[0]) / (K.rush[1] - K.rush[0])));
  return { tg: [hp.x, hp.y, hp.z], az: W.loupe.root.rotation.y, el: 0.05, r: lerp(1.3, 0.34, k), fov: 34, roll: 0 };
};
const rigKnob = (F) => {      // from a knob close-up, pull out to Tilt; the roll follows the beam
  const rf = station(ST.refn), kn = W.con.knobs[0].getWorldPosition(V3(0, 0, 0)), k = oc(clamp((F - K.S5 - 5) / 14));   // hold on the knob while the iris opens
  const knob = { tg: [kn.x, kn.y + 0.04, kn.z], az: W.con.root.rotation.y, el: 0.9, r: 0.42, fov: 34, roll: 0 };
  const med = { tg: [rf[0] - 0.04, 0.34, rf[2] - 0.02], az: 0.0, el: 0.2, r: lerp(1.95, 1.72, sm((F - K.S5 - 10) / 60)), fov: 36, roll: 0.18 * (st.tilt ? st.tilt.beam : 0) };
  return mixRig(knob, med, k);
};
const rigLap = (F) => {       // ride round with the job (close orbit synced to the ring)
  const th = jobTheta(F), k = ease.inOutCubic(clamp((F - K.lap[0]) / (K.lap[1] - K.lap[0])));
  // camera trails the job round the bench on a circle (radius 1.65 from the bench centre, above the agents' heads)
  // that stays clear of Big Iron; it looks across at the job and the next station
  const cp = station(th + 0.75, 1.65), tg = station(th - 0.35, 0.55);
  const dx = cp[0] - tg[0], dz = cp[2] - tg[2], h = Math.hypot(dx, dz), dy = 1.42 - 0.36;   // well above the agents' heads
  return { tg: [tg[0], 0.36, tg[2]], az: Math.atan2(dx, dz), el: Math.atan2(dy, h), r: Math.hypot(h, dy), fov: 40, roll: 0.03 * Math.sin(Math.PI * k) };
};
const rigS7 = (F) => {        // gauge -> tilt up with the planks -> ride with the result to the funnel -> look up as it's gulped
  const gp = station(ST.anlz - 0.36, 1.5), an = station(ST.anlz), jp = jobPos(F), fp = W.tube.curve.getPointAt(1);
  const gauge = { tg: [lerp(an[0], gp[0], 0.5), 0.38, lerp(an[2], gp[2], 0.5)], az: 0.32, el: 0.2, r: 1.85, fov: 34, roll: 0 };
  const cell = { tg: [jp[0], 0.78, jp[2]], az: 0.55, el: 0.03, r: 2.3, fov: 34, roll: 0.02 };   // level with the planks: the gap stays open
  const ride = { tg: [jp[0], 0.8, jp[2]], az: 0.45, el: 0.02, r: 2.6, fov: 34, roll: 0.02 };   // stays level: the band gap never closes
  const up = { tg: [fp.x + 0.1, fp.y - 0.4, fp.z + 0.1], az: 0.35, el: -0.1, r: 2.6, fov: 36, roll: -0.04 };
  if (F < K.planks[0]) return gauge;
  if (F < K.toFunnel[0] + 2) return mixRig(gauge, cell, io((F - K.planks[0] - 4) / 10));
  if (F < K.suck[0] - 2) return mixRig(cell, ride, io((F - K.toFunnel[0] - 2) / 8));
  return mixRig(ride, up, io((F - K.suck[0] + 2) / 8));
};
const rigS8a = (F) => {       // medium on Hoot and both hourglasses; a push in on the hourglasses as the tiny one runs dry
  const k = sm((F - K.S8a - 8) / 30), p = arc(F, K.land - 12, K.land + 8);
  const q = { tg: [L.desk.x + lerp(0.05, 0.1, k), 0.5, L.desk.z - 0.25], az: lerp(0.1, 0.02, k), el: 0.12, r: lerp(2.7, 2.35, k), fov: 38, roll: lerp(0.03, 0, k) };
  const mid = [lerp(TINY[0], GIANT[0], 0.4), 0.36, lerp(TINY[2], GIANT[2], 0.4)];
  q.tg = q.tg.map((v, i) => lerp(v, mid[i], 0.55 * p)); q.r -= 0.7 * p; q.el -= 0.04 * p;
  return q;
};
const rigS8 = (F) => {        // the desk-top payoff framing (desk edge near the bottom, faces above the numerals); slow arc
  const a = sm((F - K.S8b) / 60);
  return { tg: [L.desk.x + 0.1, 0.46, L.desk.z + 0.15], az: lerp(0.06, -0.04, a), el: 0.15, r: lerp(3.2, 3.02, a), fov: 41, roll: 0 };   // a touch higher: Hoot's face clears the 68
};
// [a, b, cap px, 'h' = horizontal smear only: vertical tilts would streak like rain]
const WHIPS = [[80, 100], [101, 108, 40, 'h'], [230, 243, 40, 'h'], [280, 294], [312, 330, 0, 'h'], [452, 466, 60], [500, 512, 60], [538, 548, 40, 'h'], [561, 588, 0, 'h'], [618, 630, 40]];
export function camRig(F) {
  F = ((F % NF) + NF) % NF;
  if (F < 84) return rigS1(F);
  if (F < 100) return mixRig(rigS1(F), rigFunnel(F), ease.inOutQuint(clamp((F - 84) / 16)));
  if (F < K.catch + 2) return rigFunnel(F);
  if (F < K.catch + 12) return mixRig(rigFunnel(F), rigTri(F), io((F - K.catch - 2) / 10));
  if (F < K.deal[1]) return rigTri(F);
  if (F < K.type[0] + 4) { const k = io((F - K.deal[1]) / (K.type[0] + 4 - K.deal[1])), q = mixRig(rigTri(F), rigClack(F), k); q.r += 0.6 * Math.sin(Math.PI * k); q.el += 0.12 * Math.sin(Math.PI * k); return q; }   // truck wide of Loupe
  if (F < 230) return rigClack(F);
  if (F < 242) return mixRig(rigClack(F), rigCell(F), io((F - 230) / 12));   // locked on the cell before it relaxes
  if (F < K.cover[0]) return rigCell(F);
  if (F < K.cover[1]) return mixRig(rigCell(F), rigS3b(F), ease.inOutQuint(clamp((F - K.cover[0]) / (K.cover[1] - K.cover[0]))));   // whip left across the room to the desk
  if (F < 312) return rigS3b(F);
  if (F < 330) return mixRig(rigS3b(F), rigLoupe(F), ease.inOutCubic(clamp((F - 312) / 18)));
  if (F < K.rush[0]) return rigLoupe(F);
  if (F < K.S5) return mixRig(rigLoupe(F), rigLens(F), ic(clamp((F - K.rush[0]) / 6)));
  if (F < K.go) return rigKnob(F);                                     // iris match cut: lens -> knob
  if (F < K.lap[0] + 6) return mixRig(rigKnob(F), rigLap(F), io((F - K.go) / (K.lap[0] + 6 - K.go)));
  if (F < K.lap[1] - 4) return rigLap(F);
  if (F < K.S7 + 6) { const t = clamp((F - K.lap[1] + 4) / 14); return mixRig(rigLap(F), rigS7(F), ob(t)); }   // brake onto the gauge: 14 f, overshoot and settle
  if (F < 566) return rigS7(F);
  if (F < K.S8a + 10) return mixRig(rigS7(F), rigS8a(F), ease.inOutQuint(clamp((F - 566) / 20)));   // whip left with the return bulge
  if (F < K.S8b - 6) return rigS8a(F);
  if (F < K.S8b + 6) return mixRig(rigS8a(F), rigS8(F), ease.inOutCubic(clamp((F - K.S8b + 6) / 12)));   // pull back for the slams
  if (F < K.S9 + 4) return rigS8(F);
  return mixRig(rigS8(F), rigHome(F - NF), io((F - K.S9 - 4) / (NF - K.S9 - 4)));
}
const HITS = [[K.clock, 0.012, 3], [K.catch, 0.004, 3], [K.roar, 0.028, 6], [K.crash, 0.01, 4], [K.go, 0.012, 3], [K.ding, 0.01, 4], [K.land, 0.01, 4], [K.slam[0], 0.012, 4], [K.slam[1], 0.022, 5], [K.slam[2], 0.012, 4]];
function updateCamera(ctx, F) {
  st.smear = applyCamera(W.camera, ctx, F, camRig, { whips: WHIPS, hits: HITS, hand: { amp: 0.02, rot: 0.003, speed: 4, seed: 5 } });
  if (Q.get('cam')) { const c = Q.get('cam').split(',').map(Number); W.camera.position.set(c[0], c[1], c[2]); W.camera.up.set(0, 1, 0); W.camera.lookAt(c[3], c[4], c[5]); if (c[6]) { W.camera.fov = c[6]; W.camera.updateProjectionMatrix(); } W.camera.updateMatrixWorld(true); st.smear = [0, 0]; }
  ctx.camera = W.camera;
  if (Q.get('nearchk')) nearCheck(F);
  if (Q.get('dbg')) { const f = (v) => v.toArray().map((x) => x.toFixed(2)).join(','); console.log(`F${F} cam ${f(W.camera.position)} tri ${f(W.tri.root.position)} clack ${f(W.clack.root.position)} loupe ${f(W.loupe.root.position)} tilt ${f(W.tilt.root.position)} con ${f(W.con.root.position)} cart ${f(W.cart.getWorldPosition(V3(0, 0, 0)))}`); }
}

/** authoring aid (?nearchk=1): cast a grid of rays from the camera and log geometry closer than the near plane
 *  (+ a margin), i.e. anything the camera is about to cut open */
function nearCheck(F) {
  const cam = W.camera, T = W.THREE, rc = new T.Raycaster(), seen = new Map();
  rc.near = 0; rc.far = cam.near + 0.1; rc.layers.enableAll();
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 6; j++) {
    rc.setFromCamera(new T.Vector2(-1 + i / 6, -1 + j / 3), cam);
    for (const h of rc.intersectObjects(W.scene.children, true)) {
      if (!h.object.visible || seen.has(h.object)) continue;
      let vis = true; for (let o = h.object; o; o = o.parent) if (!o.visible) vis = false;
      if (vis) seen.set(h.object, h.distance);
    }
  }
  if (!seen.size) return;
  const p = new T.Vector3();
  console.log(`NEAR F${F} ` + [...seen].slice(0, 5).map(([m, d]) => { m.getWorldPosition(p); return `${m.geometry.type}@${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} d=${d.toFixed(2)}`; }).join(' | '));
}

// ---------------------------------------------------------------------------------------------------
// lighting / npr per frame
// ---------------------------------------------------------------------------------------------------
export function drawNPR(w, ctx) {
  W = w;
  const { npr, camera } = W, F = ctx.iw;
  npr.frame(ctx);
  npr.setLook(LOOK);
  npr.setSmear(st.smear[0], st.smear[1]);
  npr.setLight({ dir: [-0.35, 0.85, 0.62], target: [-0.8, 0, -0.6], size: 7.5, dist: 22, shadows: !Q.get('nosh') });
  npr.pointLight(V3(L.desk.x - 0.6, 1.0, L.desk.z + 0.15), { color: 0xffd08a, radius: 2.0, i: 0.6 });
  const E = W.engine.fire.getWorldPosition(V3(0, 0, 0));
  npr.pointLight(V3(E.x - 0.3, E.y, E.z + 0.6), { color: 0xff7a3a, radius: 0.8 + 0.5 * (st.roar || 0), i: 0.2 + 0.3 * (st.roar || 0) + 0.15 * (st.huff || 0) });   // small: no airbrushed halo on the cabinet
  npr.focusOn(camera, V3(...focusPoint(F)), 3.2);
  const bulb = W.desk.bulb.getWorldPosition(V3(0, 0, 0));
  npr.glowAt(ctx, camera, bulb, { radius: 0.08, i: 0.8, color: 0xffe2a0, behind: true, seed: 1 });
  W.engine.lamps.forEach((m, i) => { const p = m.getWorldPosition(V3(0, 0, 0)); npr.glowAt(ctx, camera, p, { radius: 0.05, i: 0.35 + 0.35 * ((Math.floor(F / 6) + i) % 2) + 0.3 * (st.roar || 0), color: i % 2 ? 0xff9a6a : 0xfff0c0, behind: true, seed: 10 + i }); });
  // scf: halftone electron density condensing, one blob at a time, onto the 16 bond midpoints (symmetric)
  if (F >= K.roar && F < K.roar + 16) {
    const c = ctx.project(V3(L.engine.x - 0.3, 1.0, L.engine.z), camera);
    npr.focusLines({ x: c.x, y: c.y, r0: 360, amount: 1 - (F - K.roar) / 16, count: 110, width: 1.3, seed: 3 });
    if (F < K.roar + 1) npr.impact(1, { threshold: 0.58 });                       // one ink/cream impact frame (no photo negative)
  }
  if (F >= K.land && F < K.land + 12) {
    const c = ctx.project(W.cart.getWorldPosition(V3(0, 0, 0)), camera);
    npr.focusLines({ x: c.x, y: c.y - 60, r0: 320, amount: 0.8 * (1 - (F - K.land) / 12), count: 90, width: 1.2, seed: 5 });
  }
  const s68 = F - K.slam[1];
  if (s68 >= 0 && s68 < 14) {
    const p = W.num.n68.group.getWorldPosition(V3(0, 0, 0));
    const c = ctx.project(V3(p.x, p.y + 0.2, p.z), camera);
    npr.focusLines({ x: c.x, y: c.y, r0: 420, amount: 0.9 * (1 - s68 / 14), count: 100, width: 1.2, seed: 9 });
  }
  if (F >= K.slam[0] && F < K.S9 + 4) npr.pointLight(V3(L.desk.x + 0.1, 0.8, L.desk.z + 1.0), { color: 0xfff2dc, radius: 2.2, i: 0.3 * sm((F - K.slam[0]) / 8) });   // near-white: a gold key turned the wall green
  npr.render(W.scene, camera);
}
function focusPoint(F) {
  const tri = station(TRI_TH), ex = station(ST.exec), an = station(ST.anlz), rf = station(ST.refn);
  const keys = [[0, [HT[0], 0.6, HT[2]]], [96, [tri[0], 1.2, tri[2]]], [K.catch, [tri[0], 0.4, tri[2]]], [K.type[0], [ex[0], 0.35, ex[2]]],
    [240, [jobPos(250)[0], 0.46, jobPos(250)[2]]], [K.S3b, [HT[0], 0.6, HT[2]]], [K.S4, [an[0], 0.35, an[2]]], [K.S5, [rf[0], 0.35, rf[2]]],
    [K.S6, [B.x, 0.45, B.z]], [K.S7, [an[0], 0.35, an[2]]], [K.S8a, [HT[0] + 0.3, 0.5, HT[2] + 0.6]]];
  let fp = keys[0][1]; for (const [f, p] of keys) if (F >= f) fp = p;
  return fp;
}
