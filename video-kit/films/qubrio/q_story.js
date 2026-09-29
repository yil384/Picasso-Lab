// q_story.js - build + per-frame logic for the Qubrio film (see STORYBOARD.md). Timeline and states: q_time.js.
import * as THREE from 'three';
import { createNPR } from './npr/npr.js';
import { orbit, handheld, applyRig } from './npr/camera.js';
import { buildSet, COL } from './q_set.js';
import { pedestal, pedestalGeo, dashGeo } from './q_traps.js';
import { makeAdder, buildCompass, poseCompass, buildWatch, poseWatch, buildSnail, poseSnail, buildLoco, poseLoco, buildLoupe, poseLoupe,
  buildGauge, poseGauge, buildPennant, posePennant } from './q_cast.js';
import { stripGeo, circlePts, arrowPts, barbs, reveal } from './q_marks.js';
import * as P from './q_phys.js';
import * as T from './q_time.js';
import { makeView } from './q_view.js';
import { drawFace, drawEmote, stroke, fillPoly, trunc, brushWipe, INK } from './q_ink.js';
import { brushWord, scriptWord, sfxState } from './q_letters.js';
import { TAU, clamp, lerp, sm, io, ob, sg } from './q_util.js';

export const NF = T.NF, FPS = T.FPS, POSTER = 612;
export const PAPER = '#f4ebd6';
export const paperCanvas = (ctx) => ctx.paper({ tone: PAPER, grain: 0.04, fibres: 0.05, blotch: 0.06, seed: 4 });
const K = T.K;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const VIOLET = 0x7c3aed, OCHRE = 0xf2a922, FLOOD = 0xb48cff;

// The look: the style-comic film's settings (bold ink, Ben-Day dots in the shade, off-register plates, burin hatching in
// shade and cast shadows), plus depth: ink / hatch / halftone thin out and colour fades toward the paper with distance.
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
  zones: [{ ...P.STORE, color: '#c9bde9' }, { ...P.ZONE, color: '#7c3aed' }],
  sites: [],
  objective: [(P.ZONE.x0 + P.ZONE.x1) / 2, 3.6, (P.ZONE.z0 + P.ZONE.z1) / 2 - 0.2],
  posts: [[-6.4, -3.8, 1.8, 'mirror', 0.6], [7.8, -3.6, 1.5, 'lens', 1.1], [-6.6, 3.4, 1.2, 'box', 0.7]],
  laser: [-6.8, -7.0, 0.25],
  cables: [{ color: 0x4b2a9e, pts: [[4.6, -2.4], [6.0, -3.8], [3.4, -5.6], [0.2, -5.2], [-3.0, -5.8], [-6.4, -5.4]] }],
  wall: { z: -10.5, x0: -24, x1: 24, y1: 15,
    shelves: [[-6.0, 2.4, 5, [[-1.6, 'flask', 0xb9a3f0], [0, 'jar', 0xf2c46a], [1.5, 'bulb', 0xfff3dc]]], [6.5, 3.2, 4, [[-1, 'jar', 0x8b5cf6], [0.8, 'flask', 0xf2c46a]]]],
    window: [0.6, 5.2, 1.9], lamp: [-2.4, 6.2] },
};
for (const a of P.ATOMS) { const [x, z] = P.homeXZ(a); LAYOUT.sites.push([x, z, 0.3]); }
for (const m of P.MOVERS) { const [x, z] = P.dockXZ(m); LAYOUT.sites.push([x, z, 0.26]); }

// ---------------------------------------------------------------------------------------------------------------
export async function build(ctx, { renderer }, Q) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.W / ctx.H, 0.8, 90);
  const npr = createNPR(renderer, ctx, { look: LOOK, paper: paperCanvas(ctx), samples: 4, shadowSize: 2048 });
  npr.setUnder(window.__pv.canvas);
  npr.setLight({ dir: [-0.5, 0.82, 0.55], target: [0.5, 0, -0.5], size: 9.5, dist: 24 });
  npr.debug = Number(Q.get('debug') || 0);
  const add = makeAdder(npr, scene);
  const W = { THREE, scene, camera, cam2: camera.clone(), npr, add };
  W.set = buildSet(npr, scene, LAYOUT);
  const plateId = W.set.plateTopId;
  const decal = (color, extra = {}) => ({ id: plateId, color, flat: 0.8, hatch: 0, spec: 0, rim: 0, halftone: 0, ...extra });

  // Tick's stool (off the plate's front-right corner; top level with the plate)
  add(new THREE.CylinderGeometry(0.62, 0.7, 1.0, 36), { color: VIOLET, hatchMode: 'u', rim: 0.8, shadeColor: 0x3b1f8a, shadeMix: 0.35 }, { outline: 1.0, cast: false }, [T.TICK.x, -0.5, T.TICK.z]);
  add(new THREE.CylinderGeometry(0.66, 0.66, 0.07, 36), { color: COL.brass, hatchMode: 'u' }, { outline: 0.6, cast: false }, [T.TICK.x, 0.0, T.TICK.z]);
  // Rook's side track (two brass rails + sleepers)
  const railG = new THREE.BoxGeometry(0.05, 0.05, 7.4);
  for (const dx of [-0.3, 0.3]) add(railG, { color: COL.brass, hatchMode: 'u' }, { outline: 0.5, cast: false }, [P.TRACK_X + dx, 0.025, -0.95]);
  for (let k = 0; k < 16; k++) add(new THREE.BoxGeometry(0.8, 0.03, 0.12), { color: 0x7a4a2e }, { outline: 0.4, cast: false }, [P.TRACK_X, 0.012, -4.4 + k * 0.47]);
  // Slo's lane along the plate's front: pencil-ruled edges, a pick-up tray (left) and a drop tray (right)
  const L = T.SLO;
  for (const dz of [-0.32, 0.32]) add(stripGeo([[L.xA - 0.75, L.z + dz], [L.xB + 0.75, L.z + dz]], 0.014), decal(0x3a2f66), { cast: false });
  const tray = (x) => { add(new THREE.BoxGeometry(0.7, 0.08, 0.9), { color: 0xc98a52, hatchDir: [0, 1, 0] }, { outline: 0.7, cast: false }, [x, 0.04, L.z]); };
  tray(L.xA - 0.66); tray(L.xB + 0.66);
  // its small atoms: the pile waiting at the pick-up end, and the ones delivered at the drop end (two per trip)
  const smallGeo = new THREE.SphereGeometry(P.R * 0.62, 28, 18);
  W.atomMat = (seed) => ({ color: COL.atom, hatch: 0.7, spec: 0.5, receive: false, toneBias: 0.14, rim: 1, seed, hatchMode: 'planar', hatchDir: [1, -1, 0.3], hatchDir2: [0.2, 1, 1] });
  const slot = (i) => [(i < 3 ? -0.13 : 0.13), 0.2, (i % 3 - 1) * 0.26];
  W.pile = [0, 1, 2, 3].map((i) => { const m = add(smallGeo, W.atomMat(60 + i), { outline: 0.7 }); const s = slot(i); m.position.set(L.xA - 0.66 + s[0], s[1], L.z + s[2]); return m; });
  W.tray = [0, 1, 2, 3, 4, 5].map((i) => { const m = add(smallGeo, W.atomMat(70 + i), { outline: 0.7 }); const s = slot(i); m.position.set(L.xB + 0.66 + s[0], s[1], L.z + s[2]); return m; });

  // atoms + pedestals
  const atomGeo = new THREE.SphereGeometry(P.R, 44, 30);
  const pg = pedestalGeo(P.AY, P.R);
  W.atoms = P.ATOMS.map((a) => add(atomGeo, W.atomMat(a.i * 1.7 + 0.3), { cast: true, outline: 0.95 }));
  W.slm = P.ATOMS.map((a) => { const c = pedestal(npr, scene, pg, 0xfff0c8, a.i * 1.3, 0.85); const [x, z] = P.homeXZ(a); c.position.set(x, 0.004, z); return c; });
  W.slmDock = P.MOVERS.map((m) => { const c = pedestal(npr, scene, pg, 0xfff0c8, m.k * 3.7 + 0.2, 0.0); const [x, z] = P.dockXZ(m); c.position.set(x, 0.004, z); return c; });
  W.aodPed = P.MOVERS.map((m) => { const c = pedestal(npr, scene, pg, 0xffb020, m.k * 2.1 + 0.5, 0.0); c.visible = false; return c; });
  // AOD lines: amber dashes laid on the plate (light on the plate, no outline)
  const amb = decal(0xffb020, { flat: 0.6, glow: 0.5, receive: false });
  W.aodRows = P.MROW.map(() => add(dashGeo(6.4, { width: 0.1, step: 0.3, dash: 0.19 }), amb, { cast: false }));
  W.aodCols = P.MCOL.map(() => add(dashGeo(3.0, { width: 0.1, alongZ: true, step: 0.3, dash: 0.19 }), amb, { cast: false }));

  // plate marks: placement circles (ochre pencil), dock dots, plan arrows (graphite), the verifier's ink ring
  const pencil = decal(OCHRE, { flat: 0.75, glow: 0.2, receive: true });
  const graphite = decal(0x3a2f66);
  W.circles = P.PARTNERS.map((p, k) => add(stripGeo(circlePts(P.PCOL[p.c], P.PROW[p.r], P.PAIR, Math.PI, 1, 80, 0.012, k), (t) => 0.036 + 0.01 * Math.sin(t * 9)), pencil, { cast: false }));
  W.dockDots = P.MOVERS.map((m) => { const [x, z] = P.dockXZ(m); return add(stripGeo(circlePts(x, z, 0.1, 0, 1, 24), 0.1), pencil, { cast: false }); });
  const mkArrow = (route, i) => {
    const pts = arrowPts(route[0], route[1], 0.1 * (i % 2 ? 1 : -1), 30);
    return { body: add(stripGeo(pts, (t) => 0.05 * (0.65 + 0.35 * Math.sin(Math.PI * t))), graphite, { cast: false }), barbs: barbs(pts, 0.34, 0.55).map((b) => add(stripGeo(b, 0.045), graphite, { cast: false })) };
  };
  W.plan1 = T.ROUTE1.map(mkArrow);
  W.plan2 = T.ROUTE2.map((r, i) => (T.WRONG[i] ? mkArrow(r, i) : null));
  W.inkRing = add(stripGeo(circlePts(T.CROSS_AT[0], T.CROSS_AT[1], 0.46, -0.6, 1.12, 60, 0.05, 3), (t) => 0.05 * (0.5 + 0.5 * Math.sin(Math.PI * t))), decal(0x1a1530), { cast: false });

  // ghosts: pencil stand-ins for the dry run and the simulator (engraved glass: outline, faint tint, glints)
  const gGeo = new THREE.SphereGeometry(P.R, 36, 24);
  W.ghosts = P.MOVERS.map((m, i) => { const g = add(gGeo, { color: 0xffc862, hatch: 1.0, toneBias: -0.05, rim: 0.4, spec: 0, flat: 0.25, receive: false, halftone: 1.0, seed: 300 + i, hatchMode: 'screen', hatchDir: [1, 1, 0] }, { outline: 0.7, cast: false }); g.visible = false; return g; });
  // the verifier's penalty flag (ochre cloth on a short pole)
  W.pflag = new THREE.Group(); scene.add(W.pflag);
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 10).translate(0, 0.35, 0), { color: COL.brass }, { outline: 0.5, cast: false }, [0, 0, 0], [0, 0, 0], W.pflag);
  add(new THREE.PlaneGeometry(0.42, 0.28).translate(0.21, 0.54, 0), { color: OCHRE, side: THREE.DoubleSide, hatchDir: [0, 1, 0], rim: 0.6 }, { outline: 0.7, cast: false }, [0, 0, 0], [0, 0, 0], W.pflag);

  // cast
  W.pip = buildCompass(add, scene, { color: 0x8b5cf6 });
  W.tick = buildWatch(add, scene, { R: 0.66 });
  W.pennant = buildPennant(add, W.tick);
  W.gauge = buildGauge(add, npr, scene, { hPM: 1.05, x: T.GAUGE.x, z: T.GAUGE.z });
  W.rook = buildLoco(add, scene, { scale: 0.9 });
  W.loupe = buildLoupe(add, npr, scene, { scale: 1.0 });
  W.slo = buildSnail(add, scene, { scale: 1.35, atomGeo, atomMat: (i) => W.atomMat(91.7 + i) });

  const occ = new Set(W.atoms);
  for (const g of [W.pip.group, W.pip.legN, W.pip.legP, W.tick.group, W.slo.group, W.rook.group, W.loupe.group, W.gauge.group]) g.traverse((o) => { if (o.isMesh && !o.name.endsWith(':hull')) occ.add(o); });
  W.occluders = [...occ];
  return W;
}

// ---------------------------------------------------------------------------------------------------------------
function rigToCam(cam, F, t) {
  const rg = T.camRig(F), sh = T.camShake(F);
  const hand = handheld(t, { amp: 0.03, rot: 0.003, speed: 4, seed: 5 });
  hand.rot = [hand.rot[0] + sh[0], hand.rot[1] + sh[1], hand.rot[2] + sh[2]];
  applyRig(cam, orbit({ target: rg.tg, radius: rg.r, az: rg.az, el: rg.el, fov: rg.fov, roll: rg.roll }), { hand });
  return rg;
}
const CREAM3 = [1, 0.945, 0.81], AMBER3 = [1, 0.8, 0.42];
export function update(ctx, W, st, Q) {
  const F = ctx.iw;
  // ---- camera (on ones) + whip smear measured from the real screen motion of the look-at point ----
  if (Q.get('cam')) {
    const c = Q.get('cam').split(',').map(Number);
    applyRig(W.camera, orbit({ target: [c[3], c[4], c[5]], radius: c[2], az: c[0], el: c[1], fov: c[6] || 30 }));
    st.rig = { tg: [c[3], c[4], c[5]] };
  } else st.rig = rigToCam(W.camera, F, ctx.t);
  ctx.camera = W.camera;
  st.smear = [0, 0];
  if (!Q.get('cam') && T.WHIPS.some(([a, b]) => F > a - 1 && F <= b + 1)) {
    rigToCam(W.cam2, F - 1, ((F - 1 + NF) % NF) / NF);
    const p0 = V3(...st.rig.tg), a = ctx.project(p0, W.camera), b = ctx.project(p0, W.cam2);
    const dx = a.x - b.x, dy = a.y - b.y;
    if (Math.hypot(dx, dy) > 14) st.smear = [dx * 0.9, dy * 0.9];
  }

  // ---- atoms: centres from the AOD, acting on top; amber while the AOD holds them ----
  st.atomS = P.ATOMS.map((a, i) => {
    const s = T.atomState(a, F), [x, z] = T.atomXZ(a, F), m = W.atoms[i];
    const sy = 1 - s.sq, sxz = 1 + s.sq * 0.5;
    m.position.set(x, P.AY + s.dy - s.sq * P.R * 0.5, z);
    m.scale.set(sxz, sy * (1 - s.st * 0.4), sxz * (1 + s.st));
    const k = s.amber * 0.8;
    m.material.uniforms.uAlbedo.value.set(lerp(CREAM3[0], AMBER3[0], k), lerp(CREAM3[1], AMBER3[1], k), lerp(CREAM3[2], AMBER3[2], k));
    return { ...s, x, z };
  });
  const occAt = (x, z) => st.atomS.some((s) => Math.hypot(s.x - x, s.z - z) < 0.2);
  P.ATOMS.forEach((a, i) => { const [x, z] = P.homeXZ(a); W.slm[i].material.uniforms.uAmt.value = occAt(x, z) ? 0.85 : 0.22; });
  P.MOVERS.forEach((m, k) => { const [x, z] = P.dockXZ(m); W.slmDock[k].material.uniforms.uAmt.value = occAt(x, z) && T.aodK(F) < 0.5 ? 0.85 : 0.18 * sg(F, K.arcs[0][0], K.arcs[5][1]) * (F < T.CUT ? 1 : 0); });
  const ak = T.aodK(F), A = P.aodAt(T.convoyP(F));
  P.MOVERS.forEach((m, k) => {
    const c = W.aodPed[k], s = st.atomS[m.i];
    c.visible = ak > 0.01; c.position.set(s.x, 0.006, s.z); c.material.uniforms.uAmt.value = ak;
    c.scale.set(0.7 + 0.3 * ob(ak), 1, 0.7 + 0.3 * ob(ak));
  });
  const rowX0 = P.TRACK_X + 0.32, rowX1 = A.colX[2] + 0.55;
  W.aodRows.forEach((m, r) => {
    const n = m.geometry.userData.n, len = rowX1 - rowX0;
    m.scale.set(len / 6.4, 1, 1); m.position.set((rowX0 + rowX1) / 2, 0.012, A.rowZ[r]);
    m.geometry.setDrawRange(0, 36 * Math.round(n * clamp(ak * 1.2 - r * 0.1))); m.visible = ak > 0.01;
  });
  W.aodCols.forEach((m, c) => {
    const n = m.geometry.userData.n, z0 = A.rowZ[0] - 0.5, z1 = A.rowZ[1] + 0.5, len = z1 - z0;
    m.scale.set(1, 1, len / 3.0); m.position.set(A.colX[c], 0.014, (z0 + z1) / 2);
    m.geometry.setDrawRange(0, 36 * Math.round(n * clamp(ak * 1.3 - 0.15 - c * 0.08))); m.visible = ak > 0.01;
  });

  // ---- plate marks ----
  const markOn = F < T.CUT;
  const circKeep = markOn ? 1 - sg(F, K.aodOn[0], K.aodOn[1] + 6) : 0;
  W.circles.forEach((m, k) => { const [a0, a1] = K.arcs[k]; reveal(m, markOn ? sg(F, a0, a1, io) * (circKeep > 0.02 ? 1 : 0) : 0); });
  W.dockDots.forEach((m, k) => { const d = P.MOVERS[k], pk = P.PARTNERS.indexOf(P.partnerOf(d)); reveal(m, markOn && F >= K.arcs[pk][1] - 2 ? circKeep : 0); });
  const pl = T.planState(F);
  W.plan1.forEach((ar, i) => {
    let k = pl ? pl.d1 : 0;
    if (pl && T.WRONG[i]) k *= 1 - pl.erase;
    if (pl && pl.fade < 0.02) k = 0;
    reveal(ar.body, k); ar.barbs.forEach((b) => reveal(b, k >= 0.98 ? 1 : 0));
  });
  W.plan2.forEach((ar) => { if (!ar) return; const k = pl ? pl.d2 * (pl.fade > 0.02 ? 1 : 0) : 0; reveal(ar.body, k); ar.barbs.forEach((b) => reveal(b, k >= 0.98 ? 1 : 0)); });
  reveal(W.inkRing, pl && pl.flag >= 6 ? sg(pl.flag, 6, 12) * (1 - sg(F, K.erase[1], K.erase[1] + 4)) : 0);
  // ghosts
  const gs = T.ghostState(F);
  W.ghosts.forEach((m, i) => { const g = gs[i]; m.visible = g.vis > 0.05; m.position.set(g.x, g.y, g.z); m.scale.setScalar(Math.max(0.01, g.vis)); m.rotation.set(g.spin, g.spin * 0.7, 0); });
  st.ghosts = gs;

  // ---- cast ----
  const ps = T.pipState(F);
  poseCompass(W.pip, { hip: ps.hip, N: ps.N, Pn: ps.Pn, liftN: ps.liftN, liftP: ps.liftP, lean: ps.lean, yaw: ps.yaw, sq: ps.sq });
  const rs = T.rookState(F);
  poseLoco(W.rook, rs);
  const puffEv = [];
  for (const e of [K.toot, K.toot + 1, K.toot + 3, K.toot2, K.toot2 + 1, K.toot2 + 3]) puffEv.push({ e, src: 'w', life: 22, s: 0.2 });
  for (let e = K.glide[0]; e < K.glide[1]; e += 7) puffEv.push({ e, src: 'c', life: 16, s: 0.14 });
  W.rook.puffs.forEach((m) => { m.visible = false; });
  puffEv.forEach((ev, i) => {
    const age = F - ev.e; if (age < 0 || age >= ev.life || F >= T.CUT) return;
    const m = W.rook.puffs[i % W.rook.puffs.length];
    const src = (ev.src === 'w' ? W.rook.whistleTip : W.rook.chimTop).getWorldPosition(V3(0, 0, 0));
    const u = age / ev.life, sc = ev.s * (0.35 + ob(clamp(u * 2.2))) * (1 - 0.7 * clamp((u - 0.6) / 0.4));
    m.visible = true; m.position.set(src.x + 0.02 * age, src.y + 0.035 * age, src.z - 0.03 * age); m.scale.set(sc * 1.1, sc * 0.9, sc);
  });
  const ls = T.loupeState(F);
  poseLoupe(W.loupe, ls);
  W.scene.updateMatrixWorld(true);
  const hand = W.loupe.arms[0].g.localToWorld(V3(0, -0.45, 0));
  const fs = T.flagState(F, [hand.x, hand.y, hand.z]);
  W.pflag.visible = !!fs && fs.k > 0.02;
  if (fs) { W.pflag.position.set(fs.x, fs.y, fs.z); W.pflag.rotation.set(0, fs.rot + 0.6, fs.planted ? 0.08 * Math.sin(fs.age * 0.9) * Math.exp(-fs.age / 8) : fs.rot); W.pflag.scale.setScalar(Math.max(0.01, fs.k)); }
  const ts = T.tickState(F);
  poseWatch(W.tick, { x: T.TICK.x, z: T.TICK.z, y: ts.y, yaw: ts.yaw, sq: ts.sq, rock: ts.rock, armL: ts.armL, armR: ts.armR, hand: ts.hand, ghost: ts.ghost, crown: ts.crown, bow: ts.bow });
  const pk = F >= K.lap && F < T.CUT ? ob((F - K.lap) / 6) : 0;
  posePennant(W.pennant, pk, sm((F - K.lap - 3) / 8), F * 0.35);
  poseGauge(W.gauge, ts.fid);
  { const gk = F >= K.tickWake + 4 && F < T.CUT ? ob((F - K.tickWake - 4) / 8) : 0; W.gauge.group.visible = gk > 0.01; W.gauge.group.scale.setScalar(Math.max(0.01, gk)); }
  const ss = T.sloState(F);
  poseSnail(W.slo, { x: ss.x, z: ss.z, yaw: ss.yaw, lean: ss.lean, st: ss.st, sq: ss.sq, sway: ss.sway, stalk: ss.stalk });
  W.slo.cargo.forEach((m) => { m.visible = ss.loaded; });
  const pileLeft = ss.leg < 0 ? 4 : Math.max(0, 4 - 2 * Math.floor((ss.leg + 1) / 2));
  W.pile.forEach((m, i) => { m.visible = i < pileLeft; });
  W.tray.forEach((m, i) => { m.visible = i < ss.delivered; });
  W.scene.updateMatrixWorld(true);
  st.ts = ts; st.ps = ps; st.rs = rs; st.ls = ls; st.ss = ss; st.fs = fs;

  // ---- faces + emotes (2D ink in each head's tangent plane) ----
  const v = makeView(ctx, W.camera, W.occluders);
  st.v = v;
  const faces = [], emotes = [];
  const push = (f, layout, face, emote, zzz) => {
    if (!f) return; faces.push({ ...f, layout, face });
    if (f.vis > 0.5 && f.rs < 420) { if (emote) emotes.push({ ...emote, x: f.cen.x, y: f.cen.y, rs: f.rs, f: F }); if (zzz) emotes.push({ type: 'zzz', x: f.cen.x, y: f.cen.y, rs: f.rs, f: F + Math.round(f.cen.x / 40) }); }
  };
  W.atoms.forEach((m, i) => {
    const s = st.atomS[i];
    push(v.sphereFace(m.position.clone(), P.R * Math.max(m.scale.x, m.scale.y), s.look, [m], [m.scale.x, m.scale.y]), 'atom', { eyes: s.eyes, mouth: s.mouth, blush: s.blush, look: s.look }, s.emote, s.zzz && i % 3 === 1);
  });
  const hc = W.pip.head.getWorldPosition(V3(0, 0, 0));
  push(v.sphereFace(hc, 0.36, ps.face.look, [W.pip.head], [W.pip.headG.scale.x, W.pip.headG.scale.y]), 'hero', ps.face, ps.emote, ps.face.eyes === 'sleep');
  {
    const c = W.rook.plate.getWorldPosition(V3(0, 0, 0)), n = V3(1, 0, 0).transformDirection(W.rook.body.matrixWorld);
    const own = []; W.rook.group.traverse((o) => { if (o.isMesh) own.push(o); });
    push(v.discFace(c.clone().addScaledVector(n, 0.02), n, 0.26, own), 'flat', rs.face, rs.emote, rs.face.eyes === 'sleep');
  }
  {
    const c = W.loupe.head.getWorldPosition(V3(0, 0, 0)), n = V3(0, 0, 1).transformDirection(W.loupe.head.matrixWorld);
    const own = []; W.loupe.group.traverse((o) => { if (o.isMesh) own.push(o); });
    push(v.discFace(c.clone().addScaledVector(n, 0.02), n, W.loupe.rimR * 0.85, own), 'flat', ls.face, ls.emote, ls.face.eyes === 'sleep');
  }
  {
    const c = W.tick.dial.getWorldPosition(V3(0, 0, 0)), n = V3(0, 0, 1).transformDirection(W.tick.body.matrixWorld);
    const own = []; W.tick.body.traverse((o) => { if (o.isMesh) own.push(o); });
    const f = v.discFace(c.clone().addScaledVector(n, 0.03), n, W.tick.R * 0.8, own);
    push(f, 'dial', ts.face, ts.emote, ts.face.eyes === 'sleep');
    st.dial = f;
  }
  {
    const hc2 = W.slo.head.getWorldPosition(V3(0, 0, 0));
    push(v.sphereFace(hc2, 0.17 * 1.35, [0.6, 0], [W.slo.head]), 'hero', ss.face, ss.emote, ss.face.eyes === 'sleep');
    if (ss.loaded) for (const cm of W.slo.cargo) { const cc = cm.getWorldPosition(V3(0, 0, 0)); push(v.sphereFace(cc, P.R * 0.72, [0, 0], [cm]), 'atom', { eyes: 'sleep' }, null, false); }
  }
  st.faces = faces; st.emotes = emotes;
}

// ---------------------------------------------------------------------------------------------------------------
export function drawNPR(ctx, W, st, Q) {
  const { npr, camera } = W, F = ctx.iw;
  npr.frame(ctx);
  const c1 = F >= K.zap && F < K.zap + 16 ? Math.exp(-(F - K.zap) / 5) : 0;
  const c2 = F >= K.lap && F < K.lap + 14 ? Math.exp(-(F - K.lap) / 5) : 0;
  const ck = Math.max(c1, c2);
  npr.setLook(ck > 0.01 ? { ...LOOK, htAmt: 0.5 + 0.5 * ck, misreg: [2.6 + 2 * ck, -2 - 1.5 * ck] } : LOOK);
  npr.setSmear(st.smear[0], st.smear[1]);
  npr.focusOn(camera, V3(...st.rig.tg), 3.4);
  const ahead = (p) => st.v.ahead(p, 1.0);
  const ak = T.aodK(F);
  if (ak > 0.02) { const s = st.atomS[P.MOVERS[1].i]; npr.pointLight(V3(s.x, 0.6, s.z), { color: 0xffb020, radius: 2.6, i: 0.45 * ak }); }
  const zc = V3((P.ZONE.x0 + P.ZONE.x1) / 2, 0.45, (P.ZONE.z0 + P.ZONE.z1) / 2);
  npr.pointLight(zc, { color: 0x9a6ae0, radius: 3.4, i: 0.14 });
  // the global Rydberg pulse: ONE hard-edged flood of the whole zone rectangle from the objective; storage stays dark
  const tip = W.set.OBJ_TIP, za = F - K.zap;
  if (za >= 0 && za < 30) {
    const k = za < 6 ? 1 : Math.exp(-(za - 6) / 8);
    const rect = [P.ZONE.x0, P.ZONE.x1, P.ZONE.z0, P.ZONE.z1];
    npr.volume({ apex: [tip[0], tip[1] - 0.05, tip[2]], rect, Ty: 0, color: FLOOD, i: k, density: 1.3, shadowed: true, seed: 2 });
    npr.setProjector({ apex: [tip[0], tip[1], tip[2]], rect, Ty: 0, soft: 0.05, amount: 0.85 * k, point: 0.75, tint: [0.86, 0.78, 1.0], tintAmt: 0.5 * k });
    npr.pointLight(zc, { color: FLOOD, radius: 3.6, i: 0.9 * k });
    if (za < 22) { const c = ctx.project(zc, camera); npr.focusLines({ x: c.x, y: c.y, r0: 420, amount: 0.9 * (1 - za / 22), count: 120, width: 1.3, seed: 3 }); }
    if (za === 0) npr.impact(1, { threshold: 0.55 });
    if (za === 1) npr.impact(1, { threshold: 0.55, invert: true });
  }
  if (za >= 4 && F < T.CUT) st.atomS.forEach((s, i) => { if (P.ATOMS[i].kind === 'store' || i % 2) return; const p = V3(s.x, P.AY, s.z); if (ahead(p)) npr.glowAt(ctx, camera, p, { radius: 0.36, i: 0.3 * Math.exp(-(za - 4) / 40) + 0.1, color: FLOOD, behind: true, seed: i }); });
  const wa = F - K.whistle;
  if (wa >= 0 && wa < 14) { const c = ctx.project(V3(T.CROSS_AT[0], 0, T.CROSS_AT[1]), camera); npr.focusLines({ x: c.x, y: c.y, r0: 300, amount: 0.8 * (1 - wa / 14), count: 100, width: 1.2, seed: 9 }); }
  for (const c0 of [K.click, K.pulseClick, K.lap]) if (F >= c0 && F < c0 + 3) { const w = W.tick.crown.getWorldPosition(V3(0, 0, 0)); if (ahead(w)) npr.glowAt(ctx, camera, w, { radius: 0.16, i: 1, color: 0xffe066, rays: 1, rayLen: 0.42, rayCount: 10, seed: 8 }); }
  if (F >= K.lap && F < T.CUT) {
    npr.pointLight(V3(T.TICK.x - 0.4, 2.4, T.TICK.z + 1.2), { color: 0xffc23d, radius: 2.8, i: 0.5 * sm((F - K.lap) / 8) });
    const fa = F - K.lap;
    if (fa >= 0 && fa < 14) { const c = ctx.project(W.pennant.flag.getWorldPosition(V3(0, 0, 0)), camera); npr.focusLines({ x: c.x, y: c.y, r0: 380, amount: 0.8 * (1 - fa / 14), count: 110, width: 1.2, seed: 5 }); }
  }
  npr.render(W.scene, camera);
}

// ---------------------------------------------------------------------------------------------------------------
// ink layer (Canvas2D over the 3D): speed lines, tick marks, bonds, faces, the dial race, verdicts, emotes, lettered props
export function inkLayer(ctx, g, W, st, Q) {
  const F = ctx.iw, r = ctx.boilRng('ink'), v = st.v;
  const P2 = (p) => ctx.project(p, W.camera);
  const cv = T.convoyV(F);
  if (cv > 0.12) {   // speed lines trailing the front row (toward the storage behind it)
    for (const m of P.MOVERS) {
      if (m.pr !== 1) continue;
      const s = st.atomS[m.i];
      if (!v.ahead(V3(s.x, P.AY, s.z))) continue;
      for (let k = 0; k < 3; k++) {
        const oy = (k - 1) * 0.12, Lk = (0.6 + 0.5 * ((k * 7 + m.pc) % 3) / 2) * cv;
        const a = P2(V3(s.x + oy * 0.3, P.AY + oy, s.z - P.R - 0.08)), b = P2(V3(s.x + oy * 0.3, P.AY + oy, s.z - P.R - 0.08 - Lk * 1.6));
        stroke(g, [[a.x + r.gauss(0, 1), a.y], [(a.x + b.x) / 2, (a.y + b.y) / 2 + r.gauss(0, 1)], [b.x, b.y]], 5.5, INK, 1.5);
      }
    }
  }
  const burstMarks = (p, age, n, a0, a1, r0, len, col = INK) => {
    const k = ob(age / 4), fade = 1 - clamp((age - 8) / 6);
    if (fade <= 0) return;
    for (let i = 0; i < n; i++) {
      const an = a0 + (i / (n - 1)) * (a1 - a0), c = Math.cos(an), sn = Math.sin(an);
      const q0 = [p.x + c * r0 * k, p.y + sn * r0 * k], q1 = [p.x + c * (r0 + len * fade) * k, p.y + sn * (r0 + len * fade) * k];
      stroke(g, [q0, [(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2], q1], 7 * fade + 2, col, 2);
    }
  };
  const vis = (p) => v.ahead(p);
  for (const t0 of [K.toot, K.toot2]) if (F >= t0 && F < t0 + 14) { const p = W.rook.whistleTip.getWorldPosition(V3(0, 0, 0)); if (vis(p)) burstMarks(P2(p), F - t0, 4, -2.6, -0.8, 22, 36); }
  for (const c0 of [K.click, K.pulseClick, K.lap]) if (F >= c0 && F < c0 + 14) { const p = W.tick.crown.getWorldPosition(V3(0, 0, 0)); if (vis(p)) burstMarks(P2(p), F - c0, 5, -2.9, -0.25, 30, 46); }
  if (F >= K.whistle && F < K.whistle + 14) { const p = W.loupe.whistleTip.getWorldPosition(V3(0, 0, 0)); if (vis(p)) burstMarks(P2(p), F - K.whistle, 4, 2.2, 3.9, 20, 40); }
  // the ghosts' collision at step 2: a little ink bonk star between them
  const bk = F - K.steps1[1];
  if (bk >= 0 && bk < 10) { const p = V3(T.CROSS_AT[0], P.AY + 0.35, T.CROSS_AT[1]); if (vis(p)) burstMarks(P2(p), bk, 7, -Math.PI, 0.6, 24, 40); }
  // entanglement bonds: an ochre infinity sign tied over each pair, from the pulse on
  const za = F - K.zap;
  if (za >= 3 && F < T.CUT) {
    P.MOVERS.forEach((m, j) => {
      const a = st.atomS[m.i], b = st.atomS[P.partnerOf(m).i];
      const c = V3((a.x + b.x) / 2, P.AY + Math.max(a.dy, b.dy) + P.R * 1.25, (a.z + b.z) / 2);
      if (!v.ahead(c) || !v.clear(c, [W.atoms[m.i], W.atoms[P.partnerOf(m).i]])) return;
      const k = sm((za - 3 - j * 1.5) / 7);
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const u = (i / 40) * TAU, d = 1 + Math.sin(u) * Math.sin(u);
        const px = 0.27 * Math.cos(u) / d, py = 0.12 * Math.sin(u) * Math.cos(u) / d * 2.2;
        const q = P2(c.clone().addScaledVector(v.camRight, px).addScaledVector(v.camUp, py)); pts.push([q.x, q.y]);
      }
      const shown = trunc(pts, k), w = Math.max(3.5, v.pxu(c) * 0.035);
      if (shown.length > 2) { stroke(g, shown.map(([x, y]) => [x + w * 0.35, y + w * 0.45]), w * 1.5, INK); stroke(g, shown, w, '#f2a922'); }
    });
  }
  const fr = ctx.boilRng('faces');
  for (const f of st.faces) drawFace(g, f, fr);
  // Tick's dial: PowerMove's lap (dashed lilac ring, drawn as far as its hand has run) and Qubrio's (violet wedge)
  if (st.dial && st.dial.vis > 0.1 && st.ts.ghost != null) {
    const { a, b, c } = st.dial;
    g.save(); g.globalAlpha = st.dial.vis;
    g.transform(b.x - a.x, b.y - a.y, -(c.x - a.x), -(c.y - a.y), a.x, a.y);
    const lap = clamp(st.ts.hand);
    if (lap > 0.002) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 0.98, -Math.PI / 2, -Math.PI / 2 + TAU * lap); g.closePath(); g.fillStyle = 'rgba(124,58,237,0.55)'; g.fill(); }
    g.lineWidth = 0.06; g.strokeStyle = '#9a86c8'; g.setLineDash([0.12, 0.09]);
    g.beginPath(); g.arc(0, 0, 1.08, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(st.ts.ghost)); g.stroke(); g.setLineDash([]);
    g.restore();
  }
  // verdicts by the gauge while optimising: a check (kept) or a cross (thrown away)
  const vd = st.ts.verdict;
  if (vd && vd.age < 14 && W.gauge.group.visible) {
    const t = P2(W.gauge.top.getWorldPosition(V3(0, 0, 0))), s = 64 * ob(vd.age / 4), fade = 1 - clamp((vd.age - 10) / 4);
    g.save(); g.globalAlpha = fade; g.translate(t.x - 80, t.y - 30); g.rotate(-0.1);
    const col = vd.ok ? '#f2a922' : '#1a1530';
    if (vd.ok) { const L = [[-0.5 * s, 0], [-0.1 * s, 0.4 * s], [0.6 * s, -0.5 * s]]; stroke(g, L.map(([x, y]) => [x + 5, y + 6]), 0.26 * s, INK); stroke(g, L, 0.2 * s, col); }
    else for (const [p0, p1] of [[[-0.45, -0.45], [0.45, 0.45]], [[0.45, -0.45], [-0.45, 0.45]]]) { const L = [[p0[0] * s, p0[1] * s], [0, 0], [p1[0] * s, p1[1] * s]]; stroke(g, L, 0.22 * s, col); }
    g.restore();
  }
  for (const e of st.emotes) drawEmote(g, e, fr);
  // "Qubrio" on Rook's cab nameplate (the side facing the camera)
  for (const plate of W.rook.names) {
    const c = plate.getWorldPosition(V3(0, 0, 0)), n = V3(0, 0, plate.position.z > 0 ? 1 : -1).transformDirection(W.rook.body.matrixWorld);
    const facing = v.camPos.clone().sub(c).normalize().dot(n);
    if (facing < 0.25 || !v.ahead(c)) continue;
    const ex = V3(1, 0, 0).transformDirection(W.rook.body.matrixWorld), ey = V3(0, 1, 0).transformDirection(W.rook.body.matrixWorld);
    const base = c.clone().addScaledVector(n, 0.01);
    const o = P2(base), px = P2(base.clone().addScaledVector(ex, 0.2 * (plate.position.z > 0 ? 1 : -1))), py = P2(base.clone().addScaledVector(ey, 0.2));
    g.save(); g.globalAlpha = clamp((facing - 0.25) / 0.2);
    g.transform((px.x - o.x) / 100, (px.y - o.y) / 100, -(py.x - o.x) / 100, -(py.y - o.y) / 100, o.x, o.y);
    scriptWord(g, 'Qubrio', 0, 6, 62, '#2a1450', { weight: 0.2 });
    g.restore();
  }
  // "POWERMOVE" on a paper flag stuck in Slo's shell
  {
    const sh = W.slo.shellG.getWorldPosition(V3(0, 0, 0)), top = sh.clone().add(V3(0, 0.8, 0));
    const ownS = []; W.slo.group.traverse((o) => { if (o.isMesh) ownS.push(o); });
    if (v.ahead(sh) && v.clear(top, ownS) && v.clear(sh.clone().add(V3(0, 0.45, 0)), ownS)) {
      const a = P2(sh.clone().add(V3(0, 0.1, 0))), b = P2(top), u = v.pxu(top);
      stroke(g, [[a.x, a.y], [b.x, b.y]], Math.max(2.5, u * 0.02), INK);
      const w = u * 0.9, h = u * 0.26, wave = Math.sin(F * 0.3) * h * 0.08;
      const fl = [[b.x, b.y], [b.x + w * 0.5, b.y + wave], [b.x + w, b.y - wave], [b.x + w, b.y + h - wave], [b.x + w * 0.5, b.y + h + wave], [b.x, b.y + h]];
      fillPoly(g, fl, '#e8e0ee'); g.lineWidth = Math.max(2, u * 0.012); g.strokeStyle = INK; g.lineJoin = 'round';
      g.beginPath(); fl.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.stroke();
      if (u > 55) brushWord(g, 'POWERMOVE', b.x + w / 2, b.y + h / 2, h * 0.52, { fill: '#6b5a8e', key: 0.05, shadow: [0, 0], weight: 0.2, gap: 0.12, fan: 0, jiggle: 0.08, bounce: 0.04, rot: 0 });
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// fx layer: SFX lettering, the payoff numbers on their props, the brush wipe
export function fxLayer(ctx, g, W, st, Q) {
  const F = ctx.iw, r = ctx.boilRng('fx'), v = st.v;
  const P2 = (p) => ctx.project(p, W.camera);
  const safe = (p, x0, x1, y0, y1) => ({ x: clamp(p.x, x0, x1), y: clamp(p.y, y0, y1) });
  const tw = sfxState(F - K.whistle, 22);
  if (tw) {
    const p = safe(P2(W.loupe.head.getWorldPosition(V3(0, 0, 0))), 520, 1380, 250, 520);
    brushWord(g, 'TWEET!', p.x - 80, p.y - 20, 150 * tw.pop, { fill: '#f2a922', inner: '#e0851a', rot: -0.1 + tw.wob, alpha: tw.alpha, arc: 16, jitter: r });
  }
  const zp = sfxState(F - K.zap, 26);
  if (zp) {
    const c = safe(P2(V3((P.ZONE.x0 + P.ZONE.x1) / 2, 1.6, (P.ZONE.z0 + P.ZONE.z1) / 2)), 420, 1400, 230, 520);
    brushWord(g, 'ZAP!', c.x, c.y, 210 * zp.pop, { fill: '#b48cff', inner: '#f2a922', rot: -0.08 + zp.wob, alpha: zp.alpha, arc: 14, jitter: r, weight: 0.27 });
  }
  // 4.7x lettered on the pennant (in the flag's plane) and 1.3x on the gauge's tag
  if (F >= K.lap + 3 && F < T.CUT) {
    const fl = W.pennant.flag;
    const c = fl.localToWorld(V3(-0.64, -0.31, 0.02)), ex = fl.localToWorld(V3(-0.34, -0.31, 0.02)), ey = fl.localToWorld(V3(-0.64, -0.01, 0.02));
    const o = P2(c), px = P2(ex), py = P2(ey);
    g.save(); g.globalAlpha = sm((F - K.lap - 3) / 6);
    g.transform((px.x - o.x) / 100, (px.y - o.y) / 100, -(py.x - o.x) / 100, -(py.y - o.y) / 100, o.x, o.y);
    brushWord(g, '4.7×', 0, 0, 120, { fill: '#7c3aed', inner: '#5b21b6', rot: -0.04, jitter: r, weight: 0.26, fan: 0.04, jiggle: 0.08, shadow: [0.05, 0.06] });
    g.restore();
  }
  if (F >= K.tagUp && F < T.CUT) {
    const tp = W.gauge.top.getWorldPosition(V3(0, 0, 0)), t = P2(tp), u = v.pxu(tp);
    const k = ob((F - K.tagUp) / 6), x = t.x - u * 0.3, y = t.y + u * 0.35;
    stroke(g, [[t.x - u * 0.1, t.y + u * 0.05], [x, y]], Math.max(3, u * 0.02), INK);
    g.save(); g.translate(x - u * 0.42, y); g.rotate(-0.06 * Math.sin(F * 0.2)); g.scale(k, k);
    const tw2 = u * 1.15, th = u * 0.6;
    const tag = [[-tw2 / 2, -th / 2], [tw2 / 2, -th / 2], [tw2 / 2 + th * 0.35, 0], [tw2 / 2, th / 2], [-tw2 / 2, th / 2]];
    fillPoly(g, tag.map(([a, b]) => [a + 6, b + 7]), INK); fillPoly(g, tag, '#fff6e0');
    g.lineWidth = Math.max(3, u * 0.025); g.strokeStyle = INK; g.lineJoin = 'round'; g.beginPath(); tag.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.stroke();
    brushWord(g, '1.3×', 0, 2, th * 0.62, { fill: '#f2a922', inner: '#e0851a', rot: -0.03, jitter: r, weight: 0.26, fan: 0.03, jiggle: 0.06, key: 0.1 });
    g.restore();
  }
  const wp = sg(F, K.wipe[0], K.wipe[1], (x) => x);
  if (wp > 0 && wp < 1) brushWipe(g, wp, { c1: '#4b2a9e', c2: '#7c3aed', bristle: '#f4e6c8', seed: 3, cover: 0.3 });
}
