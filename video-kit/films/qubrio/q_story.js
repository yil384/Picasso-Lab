// q_story.js - build + per-frame logic for the Qubrio film (see STORYBOARD.md). v0: set, atoms, traps, cast, fixed camera.
import * as THREE from 'three';
import { createNPR } from './npr/npr.js';
import { orbit, handheld, applyRig } from './npr/camera.js';
import { buildSet, COL } from './q_set.js';
import { pedestal, pedestalGeo, dashGeo } from './q_traps.js';
import { makeAdder, buildCompass, poseCompass, buildWatch, poseWatch, buildSnail, poseSnail } from './q_cast.js';
import * as P from './q_phys.js';
import { makeView } from './q_view.js';
import { drawFace, drawEmote } from './q_ink.js';
import { TAU, clamp, lerp } from './q_util.js';

export const NF = 576, FPS = 24, POSTER = 470;
export const PAPER = '#f4ebd6';
export const paperCanvas = (ctx) => ctx.paper({ tone: PAPER, grain: 0.04, fibres: 0.05, blotch: 0.06, seed: 4 });

// The look: the style-comic film's settings (bold ink, Ben-Day dots in the shade, off-register plates, burin
// hatching in shade and cast shadows), plus depth: ink / hatch / halftone thin out and colour fades toward the paper
// with distance, so the lab reads in layers.
export const LOOK = {
  extends: 'comic',
  hatchCut: 0.22, crossT: 0.62, crossW: 1.0, hatchPx: 8, hatchW: 1.5, hatchWobble: 0.08, hatchSwell: 0.35,
  htAmt: 0.5, htPx: 15, htT: 0.3, htRange: 0.5, misreg: [2.6, -2.0],
  lineW: 2.0, lineWShadow: 3.2, hullW: 3.2, hullShadowW: 1.5,
  bleed: 1.4, edgeDark: 0.4, gran: 0.28, flocc: 0.05, dryEdge: 0.18, sat: 1.1,
  rule: 0.0, bgDots: [0.95, 0.6, 0.42, 0.18],
  atmos: 0.22, atmosStart: 11, atmosEnd: 27, atmosCol: [0.96, 0.92, 0.85], inkFar: 0.55, hatchFar: 0.7, htFar: 0.8,
  dofMax: 3.0, dofRange: 3.2,
  grain: 0.016, vignette: 0.14,
};

export const LAYOUT = {
  tableY: -1.0,
  plate: P.PLATE,
  zones: [{ ...P.STORE, color: '#39a6a0' }, { ...P.ZONE, color: '#7c3aed' }],
  sites: [],
  objective: [(P.ZONE.x0 + P.ZONE.x1) / 2, 3.6, (P.ZONE.z0 + P.ZONE.z1) / 2 - 0.2],
  posts: [[-6.2, -3.8, 1.8, 'mirror', 0.6], [6.8, -3.4, 1.5, 'lens', 1.1], [-6.0, 3.8, 1.2, 'box', 0.7], [7.2, 3.0, 1.2, 'mirror', -0.5]],
  laser: [-6.8, -7.0, 0.25],
  cables: [{ color: COL.red, pts: [[4.6, -1.2], [5.8, -3.2], [3.4, -5.4], [0.2, -5.0], [-3.0, -5.6], [-6.4, -5.2]] }],
  wall: { z: -10.5, x0: -24, x1: 24, y1: 15,
    shelves: [[-6.0, 2.4, 5, [[-1.6, 'flask', 0xff8fb0], [0, 'jar', 0x7fd4c8], [1.5, 'bulb', 0xffd23f]]], [6.5, 3.2, 4, [[-1, 'jar', 0xb9a3f0], [0.8, 'flask', 0x7fd4c8]]]],
    window: [0.6, 5.2, 1.9], lamp: [-2.4, 6.2] },
};
for (const a of P.ATOMS) { const [x, z] = P.homeXZ(a); LAYOUT.sites.push([x, z, 0.3]); }
LAYOUT.sites.push([P.BUFFER[0], P.BUFFER[1], 0.3]);
for (const m of P.MOVERS) { const [x, z] = P.dockXZ(m); LAYOUT.sites.push([x, z, 0.26]); }

// ---------------------------------------------------------------------------------------------------------------
export async function build(ctx, { renderer }, Q) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.W / ctx.H, 0.8, 90);
  const npr = createNPR(renderer, ctx, { look: LOOK, paper: paperCanvas(ctx), samples: 4, shadowSize: 2048 });
  npr.setUnder(window.__pv.canvas);
  npr.setLight({ dir: [-0.5, 0.82, 0.55], target: [0, 0, -1], size: 9, dist: 24 });
  npr.debug = Number(Q.get('debug') || 0);
  const add = makeAdder(npr, scene);
  const W = { THREE, scene, camera, npr, add };
  W.set = buildSet(npr, scene, LAYOUT);

  // atoms + pedestals
  const atomGeo = new THREE.SphereGeometry(P.R, 44, 30);
  W.atomMat = (seed) => ({ color: COL.atom, hatch: 0.7, spec: 0.5, receive: false, toneBias: 0.14, rim: 1, seed, hatchMode: 'planar', hatchDir: [1, -1, 0.3], hatchDir2: [0.2, 1, 1] });
  const pg = pedestalGeo(P.AY, P.R);
  W.atoms = P.ATOMS.map((a) => {
    const m = add(atomGeo, W.atomMat(a.i * 1.7 + 0.3), { cast: true, outline: 0.95 });
    const [x, z] = P.homeXZ(a); m.position.set(x, P.AY, z);
    return m;
  });
  W.slm = P.ATOMS.map((a) => { const c = pedestal(npr, scene, pg, 0x8ff0e4, a.i * 1.3, 0.85); const [x, z] = P.homeXZ(a); c.position.set(x, 0.004, z); return c; });
  W.aodPed = P.MOVERS.map((m) => { const c = pedestal(npr, scene, pg, 0xffb020, m.k * 2.1 + 0.5, 0.0); c.visible = false; return c; });
  // AOD lines: amber dashes laid on the plate (share the plate top's id: light on the plate, no outline)
  const amb = { id: W.set.plateTopId, color: 0xffb020, flat: 0.55, glow: 0.45, hatch: 0, spec: 0, receive: false, rim: 0, halftone: 0 };
  W.aodRows = P.MROW.map(() => { const m = add(dashGeo(6.4, { width: 0.09 }), amb, { cast: false }); m.visible = false; return m; });
  W.aodCols = P.MCOL.map(() => { const m = add(dashGeo(3.0, { width: 0.09, alongZ: true }), amb, { cast: false }); m.visible = false; return m; });

  // cast
  W.pip = buildCompass(add, scene, { color: 0x8b5cf6 });
  W.tick = buildWatch(add, scene, { R: 0.62 });
  W.slo = buildSnail(add, scene, { scale: 1.3, atomGeo, atomMat: npr.surface ? W.atomMat(91.7) : null });

  // occluders for the 2D faces
  const occ = new Set(W.atoms);
  for (const g of [W.pip.group, W.tick.group, W.slo.group]) g.traverse((o) => { if (o.isMesh && !o.name.endsWith(':hull')) occ.add(o); });
  W.occluders = [...occ];
  return W;
}

// ---------------------------------------------------------------------------------------------------------------
export function update(ctx, W, st, Q) {
  const F = ctx.iw;
  const cam = (Q.get('cam') || '0.35,0.42,13,0.3,0.2,-0.8').split(',').map(Number);
  applyRig(W.camera, orbit({ target: [cam[3], cam[4], cam[5]], radius: cam[2], az: cam[0], el: cam[1], fov: 30 }), { hand: handheld(ctx.t, { amp: 0.03, rot: 0.003, speed: 4, seed: 5 }) });
  ctx.camera = W.camera;
  poseCompass(W.pip, { hip: [-3.0, 1.05, 0.9], N: [-3.3, 1.1], Pn: [-2.5, 1.2], lean: 0.1, yaw: 0.3 });
  poseWatch(W.tick, { x: 3.4, z: 0.0, yaw: -0.4, armL: 0.5, armR: 0.4, hand: 0.0 });
  poseSnail(W.slo, { x: -2.0, z: 3.4, y: 0, yaw: 0 });
  W.scene.updateMatrixWorld(true);
  const v = makeView(ctx, W.camera, W.occluders);
  st.faces = [];
  W.atoms.forEach((m, i) => { const f = v.sphereFace(m.position.clone(), P.R, [0, 0], [m]); if (f) st.faces.push({ ...f, layout: 'atom', face: { eyes: 'sleep' } }); });
  const hc = W.pip.head.getWorldPosition(new THREE.Vector3());
  const pf = v.sphereFace(hc, 0.36, [0, 0], [W.pip.head]); if (pf) st.faces.push({ ...pf, layout: 'hero', face: { eyes: 'dot', mouth: 'smile' } });
  const dc = W.tick.dial.getWorldPosition(new THREE.Vector3()), dn = new THREE.Vector3(0, 0, 1).transformDirection(W.tick.body.matrixWorld);
  const tf = v.discFace(dc, dn, W.tick.R * 0.88, []); if (tf) st.faces.push({ ...tf, layout: 'dial', face: { eyes: 'dot', mouth: 'smile' } });
}

export function drawNPR(ctx, W, st, Q) {
  const { npr } = W;
  npr.frame(ctx);
  npr.focusOn(W.camera, new THREE.Vector3(0.3, 0.3, -0.5), 4);
  npr.render(W.scene, W.camera);
}

export function inkLayer(ctx, g, W, st, Q) {
  const r = ctx.boilRng('faces');
  for (const f of st.faces || []) drawFace(g, f, r);
}
export function fxLayer(ctx, g, W, st, Q) {}
