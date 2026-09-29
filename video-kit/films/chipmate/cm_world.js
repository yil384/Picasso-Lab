// cm_world.js - builds the whole set and cast once (three.js geometry + npr surfaces + baked textures).
import { T, COL, PAL, W, CITY, stationX, TAU, cachedTexture, hsh, cityRoutes } from './cm_core.js';
import * as P from './cm_paint.js';
import { NUMERAL, SKEL } from './cm_glyphs.js';
import { createNPR } from './npr/npr.js';
import { bakeBrushTexture } from './npr/brush.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let THREE = null;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------------------------------
// textures (all through the bake cache)
// ---------------------------------------------------------------------------------------------------
async function bakeAll(ctx) {
  const tx = {};
  const B = (key, w, h, paint, extra = {}, src = '') => cachedTexture(THREE, bakeBrushTexture, { width: w, height: h, seed: extra.seed ?? 11, key, background: '#ffffff', wrap: extra.wrap }, paint, src + (extra.src || ''));
  const faceSrc = P.paintFace.toString() + P.fillP.toString();
  tx.face = {};
  for (const who of ['chip', 'py', 'giant']) {
    tx.face[who] = {};
    for (const e of P.EXPR[who]) {
      tx.face[who][e] = [];
      for (let v = 0; v < 2; v++) {
        const [w, h] = who === 'chip' ? [512, 372] : who === 'py' ? [1024, 512] : [512, 300];
        tx.face[who][e].push(await B(`face-${who}-${e}-${v}`, w, h, (p, brush) => P.paintFace(brush, who, e, w, h, v), { seed: 100 + v * 7 }, faceSrc));
      }
    }
  }
  const wordSrc = P.brushWord.toString() + P.signWord.toString() + JSON.stringify(SKEL);
  tx.sign = await B('sign', 1024, 256, (p, brush, w, h) => P.paintSign(brush, w, h), {}, wordSrc);
  tx.hat = await B('hat', 1024, 512, (p, brush, w, h) => P.paintHat(brush, w, h), {}, wordSrc);
  tx.chest = await B('chest', 512, 320, (p, brush, w, h) => P.paintChest(brush, w, h), {}, wordSrc);
  tx.pennant = await B('pennant', 768, 320, (p, brush, w, h) => P.paintPennant(brush, w, h), {}, wordSrc);
  tx.ticket = await B('ticket', 512, 330, (p, brush, w, h) => P.paintTicket(brush, w, h, false));
  tx.slip = await B('slip', 512, 400, (p, brush, w, h) => P.paintTicket(brush, w, h, true));
  tx.scroll = [];
  for (const n of [0, 3, 6]) tx.scroll.push(await B('scroll' + n, 512, 340, (p, brush, w, h) => P.paintScroll(brush, w, h, n)));
  tx.can = await B('can', 512, 256, (p, brush, w, h) => P.paintCan(brush, w, h));
  tx.dut = await B('dut', 256, 200, (p, brush, w, h) => P.paintDUT(brush, w, h));
  tx.gate = {};
  for (const k of ['and', 'or', 'ff']) tx.gate[k] = await B('gate-' + k, 256, 256, (p, brush, w, h) => P.paintGateBlock(brush, w, h, k));
  tx.tally = [1, 2].map(() => null);
  tx.tally[0] = await B('tally1', 512, 180, (p, brush, w, h) => P.paintTally(brush, w, h, 1));
  tx.tally[1] = await B('tally2', 512, 180, (p, brush, w, h) => P.paintTally(brush, w, h, 2));
  tx.gauge = await B('gauge', 512, 512, (p, brush, w, h) => P.paintGauge(brush, w, h), {}, wordSrc);
  tx.clock = await B('clock', 512, 512, (p, brush, w, h) => P.paintClock(brush, w, h));
  tx.win = await B('win', 256, 256, (p, brush, w, h) => P.paintWindows(brush, w, h, false), { wrap: true });
  tx.winLit = await B('winlit', 256, 256, (p, brush, w, h) => P.paintWindows(brush, w, h, true), { wrap: true });
  tx.dice = [];
  for (let n = 1; n <= 6; n++) tx.dice.push(await B('dice' + n, 128, 128, (p, brush, w, h) => P.paintDice(brush, w, h, n)));
  tx.skin = await B('skin', 1024, 128, (p, brush, w, h) => P.paintSkin(brush, w, h), { wrap: true });
  tx.striker = await B('striker', 256, 2048, (p, brush, w, h) => P.paintStriker(brush, w, h));
  tx.die = await B('die', 4096, 2458, (p, brush, w, h) => P.paintDie(brush, w, h, p), {}, JSON.stringify(CITY) + JSON.stringify(W) + cityRoutes.toString());
  tx.pcb = await B('pcb', 1024, 1024, (p, brush, w, h) => P.paintPCB(brush, w, h), { wrap: true });
  tx.sky = await B('sky', 4096, 1024, (p, brush, w, h) => P.paintSky(brush, w, h));
  return tx;
}

// ---------------------------------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------------------------------
export async function buildWorld(ctx, three, LOOK, paperCanvas) {
  THREE = three.THREE;
  const renderer = three.renderer;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.W / ctx.H, 0.3, 90);
  const npr = createNPR(renderer, ctx, { look: LOOK, paper: paperCanvas, samples: 4 });
  npr.setUnder(window.__pv.canvas);
  Object.assign(T, { THREE, scene, camera, npr, V });
  // surface ids live in 8 bits (1..253): cycle them; two far-apart objects sharing an id only lose the id-edge
  // between them where they overlap on screen (depth and normal edges still ink them)
  let idN = 0;
  const surf = (o) => npr.surface(o.id != null ? o : { ...o, id: (idN++ % 240) + 1 });
  T.surf = surf;
  const add = (geo, mo, ao = {}, pos = [0, 0, 0], rot = [0, 0, 0], parent = scene) => {
    const m = npr.add(new THREE.Mesh(geo, Array.isArray(mo) ? mo.map((o) => (o.isMaterial ? o : surf(o))) : (mo.isMaterial ? mo : surf(mo))), ao);
    m.position.set(...pos); m.rotation.set(...rot); parent.add(m); return m;
  };
  const grp = (parent = scene, pos = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };
  T.add = add; T.grp = grp;

  const tx = await bakeAll(ctx);
  T.tx = tx;
  if (window.__pv && new URLSearchParams(location.search).get('bake') === '1') window.__bakeDone = true;

  // ---------------- sky cyclorama + PCB + die ----------------
  T.sky = npr.backdrop(tx.sky, { radius: 38, height: 44, y: -14, center: [0, 0, -2], arc: [Math.PI - 2.35, 4.7] });
  scene.add(T.sky);
  tx.pcb.repeat.set(9, 7);
  add(new THREE.PlaneGeometry(110, 80), { color: COL.pcb, map: tx.pcb, hatch: 0.5, hatchDir: [1, 0, 0.3], toneBias: 0.05, spec: 0, rim: 0, seed: 3 },
    { cast: false }, [0, W.pcbY, -8], [-Math.PI / 2, 0, 0]);
  const D = W.die, dw = D.x1 - D.x0, dd = D.z1 - D.z0;
  const dSide = { color: COL.dieSide, hatchDir: [0, 1, 0], shadeColor: 0x6a3a1a, shadeMix: 0.3, spec: 0 };
  T.die = add(new THREE.BoxGeometry(dw, D.h, dd), [dSide, dSide, { color: 0xfff4de, map: tx.die, hatch: 0.55, hatchDir: [1, 0, 0.25], hatchDir2: [0.2, 0, -1], spec: 0, rim: 0, toneBias: 0.12, seed: 5 }, dSide, dSide, dSide],
    { outline: 1.2 }, [(D.x0 + D.x1) / 2, -D.h / 2, (D.z0 + D.z1) / 2]);
  // gold pins along the die edges (one merged mesh)
  const pins = [];
  const pinGeo = (x, z, ax) => { const g = new THREE.BoxGeometry(ax ? 0.62 : 0.26, 0.09, ax ? 0.26 : 0.62); g.translate(x, -0.3, z); return g; };
  for (let x = D.x0 + 0.5; x < D.x1 - 0.3; x += 0.72) { pins.push(pinGeo(x, D.z0 - 0.3, false), pinGeo(x, D.z1 + 0.3, false)); }
  for (let z = D.z0 + 0.5; z < D.z1 - 0.3; z += 0.72) { pins.push(pinGeo(D.x0 - 0.3, z, true), pinGeo(D.x1 + 0.3, z, true)); }
  add(mergeGeometries(pins), { color: COL.gold, hatchMode: 'world', hatchDir: [1, 0, 1], spec: 1, rim: 0.7, shadeColor: 0x8a5a1a, shadeMix: 0.3 }, { outline: 0.7 });

  // ---------------- skyline: other components on the board ----------------
  const cap = (x, z, r, h, col) => {
    add(new THREE.CylinderGeometry(r, r, h, 40), { color: col, hatchMode: 'u', rim: 0.6, shadeColor: 0x22304a, shadeMix: 0.3, seed: x }, { outline: 1.4 }, [x, W.pcbY + h / 2, z]);
    add(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.18, 40), { color: 0xd9dde8, hatchMode: 'u', spec: 1 }, { outline: 1.0 }, [x, W.pcbY + h - 0.1, z]);
    add(new THREE.CylinderGeometry(r * 0.12, r * 0.12, 0.04, 8), { color: 0x9aa0b8 }, { outline: 0.6 }, [x, W.pcbY + h + 0.02, z]);
  };
  cap(-16.5, -13.5, 1.5, 5.2, 0x3d6f9a); cap(-12.2, -17.5, 1.1, 3.6, 0x2f5f86); cap(21.5, -17.5, 1.7, 6.0, 0x3d6f9a); cap(24.5, -9.5, 1.0, 3.0, 0x2f5f86);
  // resistor lying on the board, colour bands
  const res = grp(scene, [6.5, W.pcbY + 0.9, -16.5]);
  add(new THREE.CapsuleGeometry(0.9, 3.4, 8, 24), { color: 0xe9c79a, hatchMode: 'v', rim: 0.5, seed: 44 }, { outline: 1.3 }, [0, 0, 0], [0, 0, Math.PI / 2], res);
  [-1.0, -0.4, 0.2, 1.1].forEach((x, i) => add(new THREE.CylinderGeometry(0.93, 0.93, 0.28, 32), { color: [0x7a3b1a, 0x1a1530, 0xe5463b, 0xe8b04a][i] }, { outline: 0 }, [x, 0, 0], [0, 0, Math.PI / 2], res));
  // another IC far behind
  add(new RoundedBoxGeometry(8, 1.2, 4.5, 2, 0.12), { color: 0x2b2a3e, hatch: 0.7, rim: 0.4, spec: 0.3, seed: 45 }, { outline: 1.4 }, [-5.5, W.pcbY + 0.6, -19]);

  // ---------------- city ----------------
  T.city = CITY.map((b, i) => buildGate(b, i, add, tx));
  // signal pulses: little lit capsules that run along the copper-trace roads (the city's traffic)
  const pm = T.surf({ color: 0xffc23d, glow: 0.55, hatch: 0, rim: 0.4, spec: 0.5, seed: 95 });
  const pg = new THREE.CapsuleGeometry(0.045, 0.16, 4, 10); pg.rotateZ(Math.PI / 2);
  T.pulses = Array.from({ length: 14 }, () => add(pg, pm, { outline: 0.45, cast: false }, [0, -5, 0]));

  // ---------------- clock tower ----------------
  const [tx0, tz0] = W.tower;
  const tw = grp(scene, [tx0, 0, tz0]);
  add(new THREE.BoxGeometry(0.95, 3.1, 0.95), [wallMat(tx, 11), wallMat(tx, 11), { color: COL.amberD }, { color: COL.amberD }, wallMat(tx, 11), wallMat(tx, 11)], { outline: 1.1 }, [0, 1.55, 0], [0, 0, 0], tw);
  add(new THREE.BoxGeometry(1.25, 1.25, 1.25), { color: COL.amber, hatchDir: [0, 1, 0], rim: 0.6, seed: 12 }, { outline: 1.2 }, [0, 3.72, 0], [0, 0, 0], tw);
  add(new THREE.ConeGeometry(0.98, 1.1, 4), { color: COL.amberD, hatchDir: [0, 1, 0], seed: 13 }, { outline: 1.2 }, [0, 4.9, 0], [0, Math.PI / 4, 0], tw);
  T.clockFace = add(new THREE.CircleGeometry(0.5, 48), { color: 0xfff6e2, map: tx.clock, hatch: 0.3, toneBias: 0.25, rim: 0, spec: 0, glow: 0 }, { outline: 0.8, cast: false }, [0, 3.72, 0.63], [0, 0, 0], tw);
  T.clockHand = grp(tw, [0, 3.72, 0.66]);
  add(new THREE.BoxGeometry(0.05, 0.4, 0.03), { color: COL.ink, hatch: 0 }, { outline: 0.4, cast: false }, [0, 0.17, 0], [0, 0, 0], T.clockHand);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), { color: COL.red }, { outline: 0.4, cast: false }, [0, 0, 0.01], [Math.PI / 2, 0, 0], T.clockHand);
  T.tower = tw;

  buildWorkshop(add, grp, tx);
  buildHarness(add, grp, tx);
  buildStreet(add, grp, tx);
  buildChip(add, grp, tx);
  buildPy(add, grp, tx);
  buildProps(add, grp, tx);
  buildFair(add, grp, tx);
  buildGiant(add, grp, tx);
  return { scene, camera };
}

function wallMat(tx, seed, lit = false) { return { color: 0xfff1d6, map: lit ? tx.winLit : tx.win, hatchDir: [0, 1, 0], hatchDir2: [1, 0, 0], rim: 0.35, spec: 0, seed }; }

// ---------------------------------------------------------------------------------------------------
// gate buildings
// ---------------------------------------------------------------------------------------------------
function gateShape(type) {
  const s = new THREE.Shape();
  if (type === 'and') {
    s.moveTo(-0.6, -0.45); s.lineTo(0, -0.45); s.absarc(0, 0, 0.45, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-0.6, 0.45); s.lineTo(-0.6, -0.45);
  } else if (type === 'or') {
    s.moveTo(-0.6, -0.45); s.quadraticCurveTo(0.1, -0.48, 0.62, 0); s.quadraticCurveTo(0.1, 0.48, -0.6, 0.45); s.quadraticCurveTo(-0.35, 0, -0.6, -0.45);
  } else if (type === 'not') {
    s.moveTo(-0.55, -0.45); s.lineTo(0.38, 0); s.lineTo(-0.55, 0.45); s.lineTo(-0.55, -0.45);
  } else {
    s.moveTo(-0.5, -0.45); s.lineTo(0.5, -0.45); s.lineTo(0.5, 0.45); s.lineTo(-0.5, 0.45);
    s.lineTo(-0.5, 0.2); s.lineTo(-0.34, 0.08); s.lineTo(-0.5, -0.04); s.lineTo(-0.5, -0.45);   // clock-input notch
  }
  return s;
}
function buildGate(b, i, add, tx) {
  const [type, x, z, s, h] = b;
  const geo = new THREE.ExtrudeGeometry(gateShape(type), { depth: h / s, bevelEnabled: false, curveSegments: 18 });
  geo.rotateX(-Math.PI / 2);                 // extrude up (+y); the shape's +y becomes -z
  geo.scale(s, s, s);
  const roofs = [COL.amber, COL.amberL, 0xf6e7c6, COL.ochre];
  const roof = { color: roofs[i % 4], hatchDir: [1, 0, 0.3], rim: 0.5, spec: 0, toneBias: 0.05, seed: 60 + i };
  const walls = wallMat(tx, 80 + i);
  const m = add(geo, [roof, walls], { outline: 1.05 }, [x, 0, z]);
  // windows repeat once per world unit (ExtrudeGeometry side uvs are in shape units along the outline, depth along v)
  m.material[1].uniforms.uMap.value = tx.win;
  m.userData.lit = false;
  if (type === 'not') add(new THREE.CylinderGeometry(0.1 * s, 0.1 * s, h * 0.9, 20), { color: roofs[i % 4], hatchMode: 'u', rim: 0.5 }, { outline: 0.8 }, [x + 0.5 * s, h * 0.45, z]);
  // antenna / roof detail so the silhouettes differ
  if (h > 1.4) add(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), { color: COL.ink }, { outline: 0.5 }, [x - 0.1 * s, h + 0.25, z], [0, 0, 0.1]);
  return { mesh: m, b, i };
}

// ---------------------------------------------------------------------------------------------------
// workshop: shopfront wall, awning, sign, tube, anvil, lectern, folding screen
// ---------------------------------------------------------------------------------------------------
function buildWorkshop(add, grp, tx) {
  const cx = -4.85, bz = -2.25;
  add(new THREE.BoxGeometry(3.6, 1.55, 0.18), [wallMat(tx, 21), wallMat(tx, 21), { color: COL.amberD }, { color: COL.amberD }, wallMat(tx, 21), wallMat(tx, 21)], { outline: 1.1 }, [cx, 0.775, bz]);
  // awning: alternating amber / cream slats, tilted forward
  const aw = grp(T.scene, [cx, 1.72, bz + 0.2]);
  aw.rotation.x = 0.42;
  for (let k = 0; k < 9; k++) add(new THREE.BoxGeometry(0.42, 0.04, 0.95), { color: k % 2 ? 0xfff1d6 : COL.amber, hatchDir: [1, 0, 0], rim: 0.4, seed: 90 + k }, { outline: 0.7 }, [-1.68 + k * 0.42, 0, 0.47], [0, 0, 0], aw);
  // scalloped valance
  for (let k = 0; k < 9; k++) add(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 20, 1, false, 0, Math.PI), { color: k % 2 ? 0xfff1d6 : COL.amber, rim: 0.4 }, { outline: 0.6 }, [-1.68 + k * 0.42, 0, 0.95], [Math.PI / 2, 0, Math.PI], aw);
  // sign board above the awning
  const signM = { color: 0xffffff, map: tx.sign, hatch: 0.3, rim: 0.3, spec: 0, toneBias: 0.15, seed: 23 };
  const edge = { color: COL.amberD, rim: 0.3 };
  T.sign = add(new THREE.BoxGeometry(3.0, 0.73, 0.1), [edge, edge, edge, edge, signM, edge], { outline: 1.2 }, [cx, 2.6, bz + 0.05]);
  for (const sx of [-1.75, 1.75]) add(new THREE.CylinderGeometry(0.045, 0.045, 2.1, 12), { color: COL.amberD, hatchMode: 'u' }, { outline: 0.7 }, [cx + sx, 1.05, bz + 0.95]);
  // delivery pipe: pokes out of the shop wall between the two agents, mouth facing the street
  const tp = new THREE.CatmullRomCurve3([V(W.screenX, 1.5, bz - 0.1), V(W.screenX, 1.48, bz + 0.35), V(W.screenX, 1.4, bz + 0.62)]);
  add(new THREE.TubeGeometry(tp, 16, 0.09, 14), { color: COL.amberL, hatchMode: 'u', rim: 0.6, spec: 1, seed: 31, shadeColor: 0x9a5a1a, shadeMix: 0.3 }, { outline: 0.9 }, [0, 0, 0]);
  T.tubeMouth = add(new THREE.CylinderGeometry(0.17, 0.11, 0.16, 24, 1, true), { color: COL.amberD, hatchMode: 'u', side: THREE.DoubleSide, rim: 0.4 }, { outline: 0.9 }, [W.screenX, 1.39, bz + 0.72], [Math.PI / 2 - 0.2, 0, 0]);
  // Chip's anvil (left-front of Chip)
  const av = grp(T.scene, [-6.15, 0, -0.3]);
  add(new THREE.BoxGeometry(0.22, 0.2, 0.2), { color: 0x4a4a6e, spec: 0.6, rim: 0.6 }, { outline: 0.9 }, [0, 0.1, 0], [0, 0, 0], av);
  add(new THREE.BoxGeometry(0.46, 0.1, 0.26), { color: 0x5d5c8c, spec: 1, rim: 0.7 }, { outline: 1.0 }, [0, 0.25, 0], [0, 0, 0], av);
  add(new THREE.ConeGeometry(0.1, 0.22, 16), { color: 0x5d5c8c, spec: 1 }, { outline: 0.8 }, [0.33, 0.26, 0], [0, 0, -Math.PI / 2], av);
  T.anvil = av;
  // Py's lectern (right-front of Py)
  const lc = grp(T.scene, [-3.55, 0, -0.3]);
  add(new THREE.CylinderGeometry(0.04, 0.06, 0.34, 12), { color: COL.tealD, hatchMode: 'u' }, { outline: 0.7 }, [0, 0.17, 0], [0, 0, 0], lc);
  const top = grp(lc, [0, 0.36, 0]); top.rotation.x = -0.55;
  add(new THREE.BoxGeometry(0.44, 0.03, 0.32), { color: COL.tealD, rim: 0.5 }, { outline: 0.8 }, [0, 0, 0], [0, 0, 0], top);
  T.scrollM = add(new THREE.PlaneGeometry(0.38, 0.26), { color: 0xffffff, map: tx.scroll[0], hatch: 0.3, toneBias: 0.2, rim: 0, spec: 0, side: THREE.DoubleSide, seed: 33 }, { outline: 0.5, cast: false }, [0, 0.018, 0], [-Math.PI / 2, 0, 0], top);
  T.lectern = lc; T.lecternTop = top;
  // folding screen between the two agents: 3 panels hinged in a zig-zag; + a pop-up top panel for the bonk
  const sc = grp(T.scene, [W.screenX, 0, -0.75]);
  T.screen = { root: sc, panels: [] };
  for (let k = 0; k < 3; k++) {
    const pg = grp(sc, [0, 0, -0.42 + k * 0.42]);
    const pm = add(new THREE.BoxGeometry(0.03, 0.9, 0.4), { color: 0xfff1d6, hatchDir: [0, 1, 0], rim: 0.4, spec: 0, seed: 40 + k }, { outline: 0.8 }, [0, 0.45, 0], [0, 0, 0], pg);
    add(new THREE.BoxGeometry(0.05, 0.92, 0.05), { color: COL.amber, rim: 0.5 }, { outline: 0.6 }, [0, 0.45, 0.2], [0, 0, 0], pg);
    pg.rotation.y = (k % 2 ? -1 : 1) * 0.35;
    T.screen.panels.push(pg);
  }
  T.screen.top = grp(sc, [0, 0.9, 0]);
  add(new THREE.BoxGeometry(0.03, 0.5, 0.95), { color: 0xfff1d6, hatchDir: [0, 1, 0], rim: 0.4, seed: 44 }, { outline: 0.8 }, [0, 0.25, 0], [0, 0, 0], T.screen.top);
  add(new THREE.BoxGeometry(0.05, 0.05, 0.99), { color: COL.amber, rim: 0.5 }, { outline: 0.6 }, [0, 0.5, 0], [0, 0, 0], T.screen.top);
}

// ---------------------------------------------------------------------------------------------------
// the cross-verify harness
// ---------------------------------------------------------------------------------------------------
function buildHarness(add, grp, tx) {
  const H = W.harness;
  const hg = grp(T.scene, [H.x, 0, H.z]);
  T.harness = hg;
  const body = { color: 0xfff1d6, hatchDir: [0, 1, 0], hatchDir2: [1, 0, 0], rim: 0.45, spec: 0, seed: 51 };
  const trim = { color: COL.amber, hatchDir: [1, 0, 0], rim: 0.5, seed: 52 };
  const hd = 1.3;
  add(new RoundedBoxGeometry(H.w, H.h, hd, 2, 0.05), body, { outline: 1.15 }, [0, H.h / 2, 0], [0, 0, 0], hg);
  add(new RoundedBoxGeometry(H.w + 0.06, 0.12, hd + 0.06, 2, 0.04), trim, { outline: 1.0 }, [0, H.h + 0.02, 0], [0, 0, 0], hg);
  add(new RoundedBoxGeometry(H.w + 0.08, 0.1, hd + 0.08, 2, 0.04), { color: COL.amberD, rim: 0.4 }, { outline: 1.0 }, [0, 0.05, 0], [0, 0, 0], hg);
  // glass dome with dice (right half of the top)
  const domeC = [0.18, H.h + 0.08, -0.05];
  add(new THREE.CylinderGeometry(0.3, 0.33, 0.08, 32), { color: COL.amberD, hatchMode: 'u', rim: 0.5 }, { outline: 0.8 }, domeC, [0, 0, 0], hg);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.29, 32, 16, 0, TAU, 0, Math.PI / 2), T.npr.glass({ tint: 0xd8f2ff, alpha: 1.6, edge: 2.2, glint: 1.2 }));
  T.npr.add(dome, { glass: true }); dome.position.set(domeC[0], domeC[1] + 0.04, domeC[2]); hg.add(dome);
  const diceMats = tx.dice.map((t, i) => T.surf({ color: 0xffffff, map: t, hatch: 0.3, rim: 0.3, spec: 0.4, toneBias: 0.1, seed: 150 + i }));
  const dmOrder = (o) => [diceMats[(o) % 6], diceMats[(o + 5) % 6], diceMats[(o + 1) % 6], diceMats[(o + 4) % 6], diceMats[(o + 2) % 6], diceMats[(o + 3) % 6]];
  T.domeDice = [0, 1, 2].map((k) => add(new RoundedBoxGeometry(0.12, 0.12, 0.12, 2, 0.02), dmOrder(k * 2), { outline: 0.5 }, [domeC[0], domeC[1] + 0.1, domeC[2]], [0, 0, 0], hg));
  T.domeC = domeC;
  // the hopping stimulus die (world space)
  T.die6 = add(new RoundedBoxGeometry(0.2, 0.2, 0.2, 2, 0.03), [diceMats[2], diceMats[3], diceMats[0], diceMats[5], diceMats[1], diceMats[4]], { outline: 0.8 }, [0, -5, 0]);
  T.diceMats = diceMats;
  // two hoppers on the left half of the top: back = amber (the chip), front = teal (the model)
  T.hoppers = [[-0.25, -0.33, COL.amber], [-0.25, 0.3, COL.teal]].map(([x, z, c]) => {
    const g = grp(hg, [x, H.h + 0.08, z]);
    add(new THREE.CylinderGeometry(0.2, 0.1, 0.22, 24, 1, true), { color: c, hatchMode: 'u', rim: 0.6, side: THREE.DoubleSide }, { outline: 0.9 }, [0, 0.11, 0], [0, 0, 0], g);
    add(new THREE.TorusGeometry(0.2, 0.025, 8, 28), { color: c, rim: 0.5 }, { outline: 0.5 }, [0, 0.22, 0], [Math.PI / 2, 0, 0], g);
    return g;
  });
  // front face: gauge (match rate), needle, printer slot, tally slate
  const fz = hd / 2 + 0.005;
  add(new THREE.CircleGeometry(0.25, 40), { color: 0xffffff, map: tx.gauge, hatch: 0.2, toneBias: 0.2, rim: 0, spec: 0, seed: 55 }, { outline: 0.7, cast: false }, [0.18, 0.6, fz], [0, 0, 0], hg);
  T.needle = grp(hg, [0.18, 0.6 - 0.25 * 0.24, fz + 0.012]);
  add(new THREE.BoxGeometry(0.018, 0.22, 0.01), { color: COL.red, hatch: 0 }, { outline: 0.35, cast: false }, [0, 0.1, 0], [0, 0, 0], T.needle);
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), { color: COL.ink }, { outline: 0.3, cast: false }, [0, 0, 0.005], [Math.PI / 2, 0, 0], T.needle);
  add(new THREE.BoxGeometry(0.36, 0.05, 0.04), { color: COL.ink }, { outline: 0.4 }, [0.18, 0.26, fz], [0, 0, 0], hg);
  T.tallyM = add(new THREE.PlaneGeometry(0.5, 0.176), { color: 0xffffff, map: tx.tally[0], hatch: 0, rim: 0, spec: 0, toneBias: 0.1, seed: 57 }, { outline: 0.5, cast: false }, [-0.245, 0.31, fz], [0, 0, 0], hg);
  // lever on the left face (Py pulls it with its tail)
  T.lever = grp(hg, [-H.w / 2 - 0.02, 0.55, 0.3]);
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 10), { color: 0x4a4a6e, hatchMode: 'u' }, { outline: 0.5 }, [0, 0.18, 0], [0, 0, 0], T.lever);
  add(new THREE.SphereGeometry(0.06, 16, 12), { color: COL.red, rim: 0.6 }, { outline: 0.6 }, [0, 0.38, 0], [0, 0, 0], T.lever);
  // output ports on the right face -> the two lanes
  for (const [z, c] of [[W.laneA, COL.amber], [W.laneB, COL.teal]]) {
    add(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 20), { color: c, hatchMode: 'u', rim: 0.5 }, { outline: 0.7 }, [H.x + H.w / 2 + 0.05, 0.25, z], [0, 0, Math.PI / 2]);
  }
  // bell on top (DING at match 1.0)
  T.bell = grp(hg, [-0.25, H.h + 0.1, 0.0]);
  add(new THREE.SphereGeometry(0.075, 20, 12, 0, TAU, 0, Math.PI / 2), { color: COL.gold, spec: 1, rim: 0.7 }, { outline: 0.6 }, [0, 0.0, 0], [0, 0, 0], T.bell);
  // the printed diagnostic slip (animated out of the slot)
  T.slip = add(new THREE.PlaneGeometry(0.3, 0.4), { color: 0xffffff, map: tx.slip, hatch: 0.25, toneBias: 0.2, rim: 0, spec: 0, side: THREE.DoubleSide, seed: 58 }, { outline: 0.5 }, [0, -5, 0]);
  T.slip.userData.base = T.slip.geometry.attributes.position.array.slice();
}

// ---------------------------------------------------------------------------------------------------
// check street: 8 station lamps, two square-wave ribbons
// ---------------------------------------------------------------------------------------------------
function buildStreet(add, grp, tx) {
  T.lamps = [];
  for (let k = 0; k < 8; k++) {
    const g = grp(T.scene, [stationX(k), 0, W.lampZ]);
    add(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 24), { color: 0x2b2447, rim: 0.4 }, { outline: 0.6 }, [0, 0.025, 0], [0, 0, 0], g);
    const bulb = add(new THREE.SphereGeometry(0.17, 28, 14, 0, TAU, 0, Math.PI / 2), { color: 0xcfc6b8, hatch: 0.4, rim: 0.6, spec: 1, seed: 170 + k }, { outline: 0.7 }, [0, 0.05, 0], [0, 0, 0], g);
    T.lamps.push({ g, bulb });
  }
  const bar = new THREE.BoxGeometry(1, 1, 1);
  T.ribbon = [0, 1].map((lane) => {
    const mat = T.surf({ color: lane ? COL.teal : COL.amber, hatch: 0.2, rim: 0.7, spec: 0.8, toneBias: 0.12, seed: 190 + lane * 20 });
    const segs = [];
    for (let k = 0; k < 9; k++) segs.push({ h: add(bar, mat, { outline: 0.55, cast: true }, [0, -5, 0]), v: add(bar, mat, { outline: 0.55, cast: true }, [0, -5, 0]) });
    return segs;
  });
}

// ---------------------------------------------------------------------------------------------------
// Chip (the Verilog agent)
// ---------------------------------------------------------------------------------------------------
function buildChip(add, grp, tx) {
  const C = {};
  C.root = grp(T.scene, [W.chip[0], 0, W.chip[1]]);
  C.body = grp(C.root);
  const amber = { color: COL.amber, hatchDir: [0, 1, 0.2], rim: 0.8, spec: 0.5, shadeColor: 0x8a3a10, shadeMix: 0.3, seed: 301 };
  C.legs = [-1, 1].map((s) => {
    const g = grp(C.root, [0.12 * s, 0.17, 0]);
    const lg = new THREE.CapsuleGeometry(0.045, 0.1, 4, 10); lg.translate(0, -0.085, 0);
    add(lg, { color: COL.dark }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], g);
    const ft = add(new THREE.SphereGeometry(0.07, 16, 10), { color: 0xfff1d6, rim: 0.5 }, { outline: 0.7 }, [0, -0.15, 0.03], [0, 0, 0], g);
    ft.scale.set(1.15, 0.6, 1.4);
    return g;
  });
  const torsoMat = T.surf(amber);
  C.torso = add(new RoundedBoxGeometry(0.62, 0.46, 0.4, 3, 0.07), torsoMat, { outline: 1.1 }, [0, 0.4, 0], [0, 0, 0], C.body);
  C.face = add(new THREE.PlaneGeometry(0.5, 0.363), { ...amber, id: torsoMat.userData.nprId, map: tx.face.chip.calm[0], rim: 0.5 }, { outline: 0, cast: false }, [0, 0.4, 0.2015], [0, 0, 0], C.body);
  // IC pins: three silver legs on each side
  const pg = [];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const a = new THREE.BoxGeometry(0.09, 0.035, 0.05); a.translate(s * 0.345, 0.26, -0.12 + k * 0.12);
    const b = new THREE.BoxGeometry(0.035, 0.1, 0.05); b.translate(s * 0.39, 0.22, -0.12 + k * 0.12);
    pg.push(a, b);
  }
  add(mergeGeometries(pg), { color: COL.silver, spec: 1, rim: 0.6 }, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], C.body);
  // arms (shoulder pivots)
  const armGeo = new THREE.CapsuleGeometry(0.04, 0.2, 4, 10); armGeo.translate(0, -0.13, 0);
  C.arms = [-1, 1].map((s) => {
    const g = grp(C.body, [0.33 * s, 0.52, 0.02]);
    add(armGeo, { color: COL.dark }, { outline: 0.65 }, [0, 0, 0], [0, 0, 0], g);
    const hand = grp(g, [0, -0.28, 0]);
    add(new THREE.SphereGeometry(0.065, 16, 12), { color: 0xfff1d6, rim: 0.5 }, { outline: 0.65 }, [0, 0, 0], [0, 0, 0], hand);
    return { g, hand };
  });
  // hard hat
  C.hat = grp(C.body, [0, 0.61, 0]);
  const hm = add(new THREE.SphereGeometry(0.25, 36, 18, 0, TAU, 0, Math.PI / 2), { color: 0xfff6e0, map: tx.hat, hatchMode: 'v', rim: 0.7, spec: 0.8, seed: 305 }, { outline: 1.0 }, [0, 0, 0], [0, 0, 0], C.hat);
  hm.scale.set(1.08, 0.78, 0.98);
  add(new THREE.CylinderGeometry(0.31, 0.31, 0.025, 36), { color: 0xfff6e0, rim: 0.5 }, { outline: 0.8 }, [0, 0.005, 0.03], [0, 0, 0], C.hat);
  T.chip = C;
}

// ---------------------------------------------------------------------------------------------------
// Py (the Python reference-model agent): a tube body rebuilt per frame along a spine
// ---------------------------------------------------------------------------------------------------
export const PY_SEG = 72, PY_RAD = 12;
function buildPy(add, grp, tx) {
  const Pq = {};
  Pq.root = grp(T.scene, [W.py[0], 0, W.py[1]]);
  const n = (PY_SEG + 1) * (PY_RAD + 1);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
  for (let i = 0; i <= PY_SEG; i++) for (let j = 0; j <= PY_RAD; j++) {
    const k = i * (PY_RAD + 1) + j; uv[k * 2] = i / PY_SEG * 6; uv[k * 2 + 1] = j / PY_RAD;
    if (i < PY_SEG && j < PY_RAD) { const a = k, b = k + PY_RAD + 1, c = b + 1, d = a + 1; idx.push(a, d, b, b, d, c); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('hullNormal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  tx.skin.repeat.set(1, 1);
  Pq.body = add(geo, { color: COL.teal, map: tx.skin, hatchMode: 'v', rim: 0.8, spec: 0.25, shadeColor: 0x0f4a66, shadeMix: 0.3, seed: 401 }, { outline: 1.0 }, [0, 0, 0], [0, 0, 0], Pq.root);
  Pq.body.frustumCulled = false;
  Pq.head = grp(Pq.root);
  Pq.headM = add(new THREE.SphereGeometry(0.2, 40, 24), { color: COL.teal, map: tx.face.py.calm[0], hatchMode: 'v', rim: 0.8, spec: 0.3, shadeColor: 0x0f4a66, shadeMix: 0.3, seed: 402 }, { outline: 1.05 }, [0, 0, 0], [0, 0, 0], Pq.head);
  Pq.headM.scale.set(1.12, 0.96, 1.0);
  // cream belly-snout
  add(new THREE.SphereGeometry(0.11, 20, 12), { color: 0xfff1d6, rim: 0.4 }, { outline: 0 }, [0, -0.1, 0.1], [0, 0, 0], Pq.head).scale.set(1.4, 0.5, 1.0);
  // the quill in the tail tip
  Pq.quill = grp(Pq.root);
  const qf = new THREE.ConeGeometry(0.04, 0.3, 8); qf.translate(0, 0.15, 0); qf.scale(1, 1, 0.35);
  add(qf, { color: 0xfff6e0, rim: 0.4 }, { outline: 0.5 }, [0, 0.02, 0], [0, 0, 0], Pq.quill);
  add(new THREE.ConeGeometry(0.012, 0.05, 6), { color: COL.ink }, { outline: 0.3 }, [0, -0.02, 0], [Math.PI, 0, 0], Pq.quill);
  T.py = Pq;
}

// ---------------------------------------------------------------------------------------------------
// props: tickets, gate blocks, the built chip (DUT), the model can, mallet, wrench, paper planes, bug
// ---------------------------------------------------------------------------------------------------
function buildProps(add, grp, tx) {
  const pm = (map, seed) => ({ color: 0xffffff, map, hatch: 0.25, toneBias: 0.2, rim: 0, spec: 0, side: THREE.DoubleSide, seed });
  T.tickets = [0, 1, 2].map((k) => add(new THREE.PlaneGeometry(0.34, 0.22), pm(tx.ticket, 500 + k), { outline: 0.5, cast: true }, [0, -5, 0]));
  T.blocks = ['and', 'or', 'ff'].map((k, i) => {
    const face = { color: 0xffffff, map: tx.gate[k], rim: 0.4, spec: 0, seed: 510 + i }, side = { color: COL.amberL, rim: 0.4, seed: 515 + i };
    return add(new RoundedBoxGeometry(0.13, 0.13, 0.13, 2, 0.02), [side, side, side, side, face, side], { outline: 0.6 }, [0, -5, 0]);
  });
  // the DUT: amber package with pins; top face painted
  const D = grp(T.scene, [0, -5, 0]);
  const top = { color: COL.amberL, map: tx.dut, rim: 0.6, spec: 0.5, seed: 520 }, side = { color: COL.amber, rim: 0.6, seed: 521 };
  add(new THREE.BoxGeometry(0.3, 0.08, 0.22), [side, side, top, side, side, side], { outline: 0.8 }, [0, 0, 0], [0, 0, 0], D);
  const pg = [];
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const a = new THREE.BoxGeometry(0.03, 0.03, 0.06); a.translate(-0.105 + k * 0.07, -0.03, s * 0.13); const b = new THREE.BoxGeometry(0.03, 0.06, 0.02); b.translate(-0.105 + k * 0.07, -0.06, s * 0.155); pg.push(a, b); }
  add(mergeGeometries(pg), { color: COL.silver, spec: 1 }, { outline: 0.4 }, [0, 0, 0], [0, 0, 0], D);
  T.dut = D;
  // the model can
  T.can = add(new THREE.CylinderGeometry(0.075, 0.075, 0.24, 28), [{ color: 0xffffff, map: tx.can, hatchMode: 'u', rim: 0.6, spec: 0.4, seed: 530 }, { color: COL.tealD }, { color: COL.tealD }], { outline: 0.7 }, [0, -5, 0]);
  // mallet (Chip's tool; also the tiny striker mallet)
  const ml = grp(T.scene, [0, -5, 0]);
  add(new THREE.CylinderGeometry(0.018, 0.02, 0.36, 10), { color: 0xb07a45, hatchMode: 'u' }, { outline: 0.5 }, [0, 0.18, 0], [0, 0, 0], ml);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 18), [{ color: COL.amberD, hatchMode: 'u', rim: 0.5 }, { color: 0xfff1d6 }, { color: 0xfff1d6 }], { outline: 0.7 }, [0, 0.38, 0], [0, 0, Math.PI / 2], ml);
  T.mallet = ml;
  // wrench
  const wr = grp(T.scene, [0, -5, 0]);
  add(new THREE.BoxGeometry(0.04, 0.3, 0.02), { color: 0xc7cde0, spec: 1, rim: 0.6 }, { outline: 0.5 }, [0, 0.15, 0], [0, 0, 0], wr);
  add(new THREE.TorusGeometry(0.05, 0.02, 8, 18, Math.PI * 1.6), { color: 0xc7cde0, spec: 1, rim: 0.6 }, { outline: 0.5 }, [0, 0.33, 0], [0, 0, 1.1], wr);
  T.wrench = wr;
  // paper planes (dart: two wings + keel)
  const pl = new THREE.BufferGeometry();
  pl.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0.2, -0.13, 0, -0.14, 0, 0.01, -0.12,   0, 0, 0.2, 0, 0.01, -0.12, 0.13, 0, -0.14,
    0, 0, 0.2, 0, 0.01, -0.12, 0, -0.06, -0.1]), 3));
  pl.computeVertexNormals();
  T.planes = [0, 1].map((k) => add(pl, { color: 0xfffaf0, hatch: 0.3, rim: 0.4, spec: 0, side: THREE.DoubleSide, seed: 540 + k }, { outline: 0.5 }, [0, -5, 0]));
  // the bug
  const bg = grp(T.scene, [0, -5, 0]);
  const bm = { color: 0x2b2447, spec: 1, rim: 0.7, seed: 550 };
  add(new THREE.SphereGeometry(0.055, 18, 12), bm, { outline: 0.5 }, [0, 0.05, -0.02], [0, 0, 0], bg).scale.set(1, 0.75, 1.25);
  add(new THREE.SphereGeometry(0.034, 14, 10), bm, { outline: 0.45 }, [0, 0.055, 0.06], [0, 0, 0], bg);
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(0.014, 10, 8), { color: 0xffffff, hatch: 0, rim: 0 }, { outline: 0.25 }, [s * 0.016, 0.07, 0.088], [0, 0, 0], bg);
    add(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 5), { color: COL.ink }, { outline: 0.2 }, [s * 0.02, 0.11, 0.08], [0.6, 0, s * 0.4], bg);
  }
  T.bugLegs = [];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const lg = grp(bg, [s * 0.04, 0.04, -0.05 + k * 0.035]);
    add(new THREE.CylinderGeometry(0.005, 0.005, 0.06, 5), { color: COL.ink }, { outline: 0.2 }, [s * 0.025, -0.015, 0], [0, 0, s * 1.1], lg);
    T.bugLegs.push({ g: lg, s, k });
  }
  T.bug = bg;
}

// ---------------------------------------------------------------------------------------------------
// fairground: high-striker (0..100 %, proportional), pennant, bunting, tent
// ---------------------------------------------------------------------------------------------------
function buildFair(add, grp, tx) {
  const S = W.striker, G = W.stage, sh = G.h;
  // the fairground stage (amber boards, cream trim, scalloped skirt)
  const stg = grp(T.scene, [(G.x0 + G.x1) / 2, 0, (G.z0 + G.z1) / 2]);
  const sw = G.x1 - G.x0, sd = G.z1 - G.z0;
  add(new THREE.BoxGeometry(sw, sh, sd), [{ color: COL.amberD, rim: 0.4 }, { color: COL.amberD, rim: 0.4 }, { color: COL.amberL, hatchDir: [1, 0, 0], rim: 0.3, spec: 0, seed: 598 }, { color: COL.amberD }, { color: COL.amber, hatchDir: [0, 1, 0], rim: 0.4, seed: 599 }, { color: COL.amberD }], { outline: 1.1 }, [0, sh / 2, 0], [0, 0, 0], stg);
  add(new THREE.BoxGeometry(sw + 0.08, 0.06, sd + 0.08), { color: 0xfff1d6, rim: 0.4 }, { outline: 0.8 }, [0, sh + 0.03, 0], [0, 0, 0], stg);
  for (let k = 0; k < 12; k++) add(new THREE.CylinderGeometry(sw / 24, sw / 24, 0.03, 16, 1, false, 0, Math.PI), { color: k % 2 ? 0xfff1d6 : COL.red, rim: 0.3 }, { outline: 0.5 }, [-sw / 2 + sw / 24 + k * sw / 12, sh - 0.02, sd / 2 + 0.03], [Math.PI / 2, 0, Math.PI], stg);
  T.stage = stg;
  const pd = W.podium;
  add(new THREE.BoxGeometry(pd.x1 - pd.x0, pd.h, pd.z1 - pd.z0), [{ color: COL.tealD, rim: 0.4 }, { color: COL.tealD, rim: 0.4 }, { color: COL.teal, hatchDir: [1, 0, 0], rim: 0.4, seed: 596 }, { color: COL.tealD }, { color: COL.teal, hatchDir: [0, 1, 0], rim: 0.5, seed: 597 }, { color: COL.tealD }], { outline: 1.1 }, [(pd.x0 + pd.x1) / 2, sh + 0.06 + pd.h / 2, (pd.z0 + pd.z1) / 2]);
  add(new THREE.BoxGeometry(pd.x1 - pd.x0 + 0.06, 0.05, pd.z1 - pd.z0 + 0.06), { color: 0xfff1d6, rim: 0.4 }, { outline: 0.7 }, [(pd.x0 + pd.x1) / 2, sh + 0.06 + pd.h + 0.025, (pd.z0 + pd.z1) / 2]);
  // high-striker on the stage: pad, board 0..100 % (proportional), puck, bell
  const f = grp(T.scene, [S.x, sh, S.z]);
  T.fair = f;
  T.pad = add(new THREE.BoxGeometry(0.42, 0.07, 0.36), { color: COL.red, rim: 0.6, seed: 601 }, { outline: 0.8 }, [W.pad[0] - S.x, 0.035, W.pad[1] - S.z], [0, 0, 0], f);
  const bh = S.y1 - S.y0 + 0.3;
  const board = { color: 0xffffff, map: tx.striker, rim: 0.3, spec: 0, seed: 602, hatch: 0.25, toneBias: 0.1 }, post = { color: COL.amber, rim: 0.6, seed: 603 };
  add(new THREE.BoxGeometry(0.4, bh, 0.12), [post, post, post, post, board, post], { outline: 1.0 }, [0, S.y0 - sh + (S.y1 - S.y0) / 2, 0], [0, 0, 0], f);
  add(new THREE.CylinderGeometry(0.025, 0.025, bh, 10), { color: COL.silver, spec: 1 }, { outline: 0.5 }, [0, S.y0 - sh + (S.y1 - S.y0) / 2, 0.09], [0, 0, 0], f);
  T.puck = add(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 28), [{ color: COL.red, rim: 0.6, hatchMode: 'u', seed: 604 }, { color: 0xfff1d6 }, { color: 0xfff1d6 }], { outline: 0.8 }, [0, S.y0 - sh, 0.12], [Math.PI / 2, 0, 0], f);
  T.fairBell = add(new THREE.SphereGeometry(0.24, 28, 14, 0, TAU, 0, Math.PI / 2), { color: COL.gold, spec: 1, rim: 0.8, seed: 605 }, { outline: 1.0 }, [0, S.y1 - sh + 0.42, 0], [Math.PI, 0, 0], f);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), { color: COL.ink }, { outline: 0.4 }, [0, S.y1 - sh + 0.32, 0], [0, 0, 0], f);
  // pennant flag on a stub arm at 71.2 % (flips out when the giant's puck stops there)
  T.pennant = grp(f, [0.2, S.y0 - sh + 0.712 * (S.y1 - S.y0), 0.0]);
  add(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), { color: COL.ink }, { outline: 0.4 }, [0.08, 0, 0], [0, 0, Math.PI / 2], T.pennant);
  const pgeo = new THREE.PlaneGeometry(1.4, 0.58); pgeo.translate(0.7, 0, 0);
  T.pennantFlag = add(pgeo, { color: 0xffffff, map: tx.pennant, hatch: 0.2, toneBias: 0.15, rim: 0, spec: 0, side: THREE.DoubleSide, seed: 606 }, { outline: 0.7 }, [0.15, 0, 0], [0, 0, 0], T.pennant);
  // striped tent and bunting behind the stage
  const tent = grp(T.scene, [7.4, 0, -2.75]);
  add(new THREE.CylinderGeometry(0.8, 0.8, 1.0, 16, 1, true), { color: 0xfff1d6, hatchMode: 'u', rim: 0.4, side: THREE.DoubleSide, seed: 610 }, { outline: 1.0 }, [0, 0.5, 0], [0, 0, 0], tent);
  add(new THREE.ConeGeometry(0.92, 0.85, 16), { color: COL.red, hatchMode: 'u', rim: 0.5, seed: 611 }, { outline: 1.0 }, [0, 1.42, 0], [0, 0, 0], tent);
  for (let k = 0; k < 8; k++) add(new THREE.BoxGeometry(0.06, 1.0, 0.02), { color: COL.red }, { outline: 0 }, [Math.cos(k / 8 * TAU) * 0.81, 0.5, Math.sin(k / 8 * TAU) * 0.81], [0, -k / 8 * TAU, 0], tent);
  add(new THREE.SphereGeometry(0.07, 12, 8), { color: COL.amberL }, { outline: 0.5 }, [0, 1.9, 0], [0, 0, 0], tent);
  const bun = new THREE.BufferGeometry(), bp = [];
  for (let k = 0; k < 10; k++) { const t0 = k / 10, t1 = (k + 0.7) / 10; const X = (t) => lerp3(7.4, 10.5, t), Y = (t) => 2.1 - Math.sin(Math.PI * t) * 0.4, Z = (t) => lerp3(-2.75, -2.1, t); bp.push(X(t0), Y(t0), Z(t0), X((t0 + t1) / 2), Y((t0 + t1) / 2) - 0.2, Z((t0 + t1) / 2), X(t1), Y(t1), Z(t1)); }
  bun.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bp), 3)); bun.computeVertexNormals();
  add(bun, { color: COL.amberL, side: THREE.DoubleSide, rim: 0.3, seed: 612 }, { outline: 0 }, [0, 0, 0]);
  add(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 8), { color: COL.ink }, { outline: 0.4 }, [10.5, 1.05, -2.1]);
  // the payoff numerals "80.1%" (extruded, hidden until the slam)
  T.num = buildNumerals(add, grp);
}
const lerp3 = (a, b, t) => a + (b - a) * t;

function buildNumerals(add, grp) {
  const word = ['8', '0', '.', '1', '%'];
  const g = grp(T.scene, [0, -9, 0]);
  const H = 0.72;
  let x = 0;
  const letters = [];
  const front = { color: COL.amber, hatchDir: [0.3, 1, 0], rim: 0.9, shadeColor: 0x8a3a10, shadeMix: 0.35, seed: 700 };
  const side = { color: COL.ochre, hatchDir: [0, 1, 0], rim: 0.5, shadeColor: 0x9a5206, shadeMix: 0.4, seed: 701 };
  for (const ch of word) {
    const N = NUMERAL[ch];
    const toShape = (polys) => {
      const [outer, ...holes] = polys;
      const s = new THREE.Shape(outer.map(([a, b]) => new THREE.Vector2(a, b)));
      for (const h of holes) s.holes.push(new THREE.Path(h.map(([a, b]) => new THREE.Vector2(a, b))));
      return s;
    };
    const shapes = [toShape(N.polys()), ...(N.extra ? N.extra().map(toShape) : [])];
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2, curveSegments: 6 });
    geo.scale(H, H, 1); geo.translate(0, 0, -0.14);
    const lg = grp(g, [x, 0, 0]);
    const m = add(geo, [front, side], { outline: 1.25 }, [0, 0, 0], [0, 0, 0], lg);
    letters.push({ g: lg, m, w: N.w * H, x0: x });
    x += N.w * H + 0.1;
  }
  return { g, letters, width: x - 0.1 };
}

// ---------------------------------------------------------------------------------------------------
// the giant "1.6T"
// ---------------------------------------------------------------------------------------------------
function buildGiant(add, grp, tx) {
  const G = {};
  G.root = grp(T.scene, [W.giant[0], W.pcbY, W.giant[1]]);
  const sl = { color: COL.slate, hatchDir: [0, 1, 0.2], rim: 0.7, spec: 0.5, shadeColor: 0x2a2944, shadeMix: 0.35, seed: 800 };
  const sd = { color: COL.slateD, rim: 0.5, spec: 0.4, seed: 801 };
  G.hips = grp(G.root, [0, 2.7, 0]);
  G.legs = [-1, 1].map((s) => {
    const g = grp(G.root, [0, 2.7, 0.6 * s]);
    add(new RoundedBoxGeometry(0.8, 2.2, 0.8, 2, 0.1), sl, { outline: 1.3 }, [0, -1.2, 0], [0, 0, 0], g);
    const foot = add(new RoundedBoxGeometry(1.6, 0.5, 1.1, 2, 0.12), sd, { outline: 1.3 }, [-0.25, -2.45, 0], [0, 0, 0], g);
    return { g, foot };
  });
  add(new RoundedBoxGeometry(1.1, 0.7, 2.0, 2, 0.1), sd, { outline: 1.3 }, [0, 0.1, 0], [0, 0, 0], G.hips);
  G.torso = grp(G.hips, [0, 0.4, 0]);
  add(new RoundedBoxGeometry(1.5, 2.1, 2.5, 3, 0.18), sl, { outline: 1.4 }, [0, 1.05, 0], [0, 0, 0], G.torso);
  const chestM = { color: 0xffffff, map: tx.chest, hatch: 0.3, toneBias: 0.12, rim: 0.3, spec: 0, seed: 802 };
  add(new THREE.PlaneGeometry(1.3, 0.81), chestM, { outline: 0.9, cast: false }, [-0.755, 1.25, 0], [0, -Math.PI / 2, 0], G.torso);
  G.head = grp(G.torso, [0, 2.1, 0]);
  add(new RoundedBoxGeometry(1.0, 0.8, 1.1, 2, 0.12), sl, { outline: 1.3 }, [0, 0.45, 0], [0, 0, 0], G.head);
  G.visor = add(new THREE.PlaneGeometry(0.92, 0.54), { color: 0xffffff, map: tx.face.giant.smug[0], hatch: 0, rim: 0, spec: 0, flat: 1, glow: 0.15, halftone: 0, seed: 803 }, { outline: 0.8, cast: false }, [-0.505, 0.5, 0], [0, -Math.PI / 2, 0], G.head);
  add(new THREE.BoxGeometry(0.82, 0.3, 0.82), { color: 0x1a1530, hatch: 0, rim: 0 }, { outline: 0 }, [0, 0.1, 0], [0, 0, 0], G.head);   // mouth cavity (shows when the jaw drops)
  G.jaw = grp(G.head, [0, 0.12, 0]);
  add(new RoundedBoxGeometry(0.9, 0.22, 0.9, 2, 0.06), sd, { outline: 1.1 }, [-0.02, -0.08, 0], [0, 0, 0], G.jaw);
  for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(0.03, 0.12, 0.1), { color: 0xe8e1cc, rim: 0.3 }, { outline: 0.4 }, [-0.475, 0.02, -0.3 + k * 0.15], [0, 0, 0], G.jaw);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), { color: COL.ink }, { outline: 0.5 }, [0.1, 1.05, 0.2], [0, 0, 0.2], G.head);
  add(new THREE.SphereGeometry(0.08, 12, 8), { color: COL.red }, { outline: 0.6 }, [0.15, 1.32, 0.25], [0, 0, 0], G.head);
  G.arms = [-1, 1].map((s) => {
    const sh = grp(G.torso, [0, 1.75, 1.45 * s]);
    add(new THREE.SphereGeometry(0.42, 20, 14), sd, { outline: 1.2 }, [0, 0, 0], [0, 0, 0], sh);
    add(new RoundedBoxGeometry(0.55, 1.3, 0.55, 2, 0.1), sl, { outline: 1.2 }, [0, -0.75, 0], [0, 0, 0], sh);
    const el = grp(sh, [0, -1.45, 0]);
    add(new RoundedBoxGeometry(0.5, 1.2, 0.5, 2, 0.1), sl, { outline: 1.2 }, [0, -0.6, 0], [0, 0, 0], el);
    const hand = grp(el, [0, -1.3, 0]);
    add(new RoundedBoxGeometry(0.55, 0.45, 0.5, 2, 0.1), sd, { outline: 1.1 }, [0, 0, 0], [0, 0, 0], hand);
    return { sh, el, hand };
  });
  // sledgehammer in the +z hand: the handle continues the arm line (-y), the head's striking faces point +-x
  G.hammer = grp(G.arms[1].hand, [0, -0.05, 0]);
  add(new THREE.CylinderGeometry(0.07, 0.08, 1.7, 12), { color: 0x7a5a3a, hatchMode: 'u', seed: 805 }, { outline: 0.9 }, [0, -0.8, 0], [0, 0, 0], G.hammer);
  add(new RoundedBoxGeometry(0.95, 0.62, 0.62, 2, 0.06), { color: 0x3b3a58, spec: 0.8, rim: 0.6, seed: 806 }, { outline: 1.1 }, [0, -1.72, 0], [0, 0, 0], G.hammer);
  T.giant = G;
}
