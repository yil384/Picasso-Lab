// tg_film.js - "TritonGym: The Loop" (see STORYBOARD.md): builds the set and cast, poses everything per frame from the
// pure timeline in tg_anim.js / tg_cam.js, drives the npr extras (lights, impact frames, focus lines, smear) and draws
// the hand-made 2D marks (lettering, speed lines, puffs, emotes).
import { createNPR } from './npr/npr.js';
import { bakeBrushTexture } from './npr/brush.js';
import { applyRig, handheld, yawSmear } from './npr/camera.js';
import { cachedBake, INK, TAU, pen, fillPoly, ellipsePts, starPts } from './tg_paint.js';
import { ARENA, canvasTex, paintFloor, paintPlanks, buildCard, buildStands } from './tg_world.js';
import { buildLLM, buildKern, buildOro, KERN_SLOTS } from './tg_cast.js';
import { buildGate2, buildFinish, buildTower, buildBench, buildWeighIn, buildBlock, buildTorch, buildDash, buildSlip, buildCheck, buildOpCard, buildMitt } from './tg_props.js';
import { comicWord, bang, word3D, layoutWord } from './tg_letter.js';
import { lerp, clamp, sg, sm, ob, ringv, hsh, ease, io } from './tg_time.js';
import { NF, K, A, R, L2, B1, polar, headingAt, faceOut, kernState, oroState, tokState, dashState, gateState, scaleState, watchState, tokenFlight } from './tg_anim.js';
import { camWorld, WATCH, WHIPS, toRing } from './tg_cam.js';

export { NF };
const Q = new URLSearchParams(location.search);
export const PAPER = { tone: '#f4ebd6', grain: 0.04, fibres: 0.05, blotch: 0.06, seed: 4 };
const PAL = { ink: '#1a1530', coral: '#ef4b5f', coralDk: '#b8283f', emerald: '#10b981', emeraldDk: '#047857', cream: '#fff6e0', ochre: '#f2b134' };

export const LOOK = {
  extends: 'comic',
  hatchCut: 0.22, crossT: 0.62, crossW: 1.0, hatchPx: 7.5, hatchW: 1.5, hatchWobble: 0.08, hatchSwell: 0.35,
  htAmt: 0.55, htPx: 14, htT: 0.3, htRange: 0.5, misreg: [2.6, -2.0],
  lineW: 2.0, lineWShadow: 3.2, hullW: 3.1, hullShadowW: 1.5,
  bleed: 1.6, edgeDark: 0.45, gran: 0.3, flocc: 0.06, dryEdge: 0.2, sat: 1.12,
  rule: 0, rulePx: 10, ruleTop: 0.3, ruleBot: 0.04, bgDots: [0.95, 0.6, 0.42, 0],     // no screen-locked ruling or dots (round 1)
  dofMax: 1.6, dofRange: 3.5, grain: 0.018, vignette: 0.16, shadowNoise: 0.05, shadowSoft: 0.02,
  atmos: 0.12, atmosStart: 20, atmosEnd: 44, atmosCol: [0.96, 0.92, 0.84], inkFar: 0.85, hatchFar: 0.4, htFar: 0.4,
  ...(Q.get('lk') ? JSON.parse(Q.get('lk')) : {}),
};

let T = null;
const st = {};
const V = (x, y, z) => new T.THREE.Vector3(x, y, z);

// ------------------------------------------------------------------------------------------------
// build
// ------------------------------------------------------------------------------------------------
export async function buildWorld(ctx, { THREE, renderer }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, ctx.W / ctx.H, 0.3, 90);
  const npr = createNPR(renderer, ctx, { look: LOOK, paper: ctx.paper(PAPER), samples: 4 });
  npr.setUnder(window.__pv.canvas);
  npr.setLight({ dir: [-0.35, 0.85, 0.55], target: [0, 0, 0], size: 13, dist: 30 });
  npr.debug = Number(Q.get('debug') || 0);
  T = { THREE, scene, camera, npr };
  const mats = new Map();
  const surf = (o) => {
    if (o && o.isMaterial) return o;
    if (o && o.key) { if (!mats.has(o.key)) { const { key, ...rest } = o; mats.set(o.key, npr.surface(rest)); } return mats.get(o.key); }
    return npr.surface(o);
  };
  const add = (geo, mo, ao = {}, pos = [0, 0, 0], rot = [0, 0, 0], parent = scene) => {
    const m = npr.add(new THREE.Mesh(geo, Array.isArray(mo) ? mo.map(surf) : surf(mo)), ao);
    m.position.set(...pos); m.rotation.set(...rot); parent.add(m); return m;
  };
  T.add = add; T.surf = surf;
  const station = (th, r, y = 0) => { const g = new THREE.Group(); g.position.set(...polar(th, r, y)); g.rotation.y = headingAt(th); scene.add(g); return g; };

  // ---- the arena: a raised emerald circuit board (PCB + ring track, one painted top view) on a wooden gym floor
  const F = ARENA.floor, BR = 8.6;
  const floorTex = canvasTex(THREE, 4096, 4096, (g, w, h) => paintFloor(g, w, h, { startA: -A.start, finishA: -A.finish }));
  const boardTop = new THREE.CircleGeometry(BR, 128);
  { const uv = boardTop.attributes.uv, pos = boardTop.attributes.position; for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + F) / (2 * F), (pos.getY(i) + F) / (2 * F)); }
  const mTop = add(boardTop, { color: 0x0a9a6c, map: floorTex, hatchDir: [1, 0, 0.3], noiseScale: 0.4, spec: 0.1 }, { cast: false }, [0, 0.0, 0], [-Math.PI / 2, 0, 0]);
  const mEdge = add(new THREE.CylinderGeometry(BR, BR + 0.05, 0.32, 128, 1, true), { color: 0x04684a, hatchDir: [0, 1, 0], side: THREE.DoubleSide }, { outline: 1, cast: false }, [0, -0.16, 0]);
  const plankTex = canvasTex(THREE, 2048, 2048, (g, w, h) => paintPlanks(g, w, h), { wrap: true, repeat: [3, 3] });
  const mPlank = add(new THREE.PlaneGeometry(80, 80), { color: 0xe0a15a, map: plankTex, hatchDir: [1, 0, 0.3], spec: 0.2 }, { cast: false }, [0, -0.32, 0], [-Math.PI / 2, 0, 0]);
  T.setIds = [mTop, mEdge, mPlank].map((m) => m.material.uniforms.uId.value);   // the set, for impact frames
  T.stands = buildStands(THREE, add, scene);
  T.card = buildCard(THREE, add, scene);

  // ---- stations
  T.bench = buildBench(THREE, add, station(A.bench, R.bench));
  T.gate = buildGate2(THREE, add, station(A.gate, R.track), { lanes: [0.55, -0.55] });     // +z = outward: lane 0 = ours (outer)
  const scaleSt = station(A.scale, R.scale); T.weigh = buildWeighIn(THREE, add, scaleSt);
  T.weigh.pans.forEach((P) => { P.g.position.set(P.side * T.weigh.span, 1.08, 0); P.rods.forEach((m) => { m.scale.y = T.weigh.h - 1.12; }); });
  T.refBlock = buildBlock(THREE, add, T.weigh.pans[1].g, { ref: true }); T.refBlock.root.position.y = 0.04;
  T.outBlock = buildBlock(THREE, add, scene, {});
  T.torch = buildTorch(THREE, add, station(A.scale + 0.155, R.scale + 0.1)); T.torch.root.rotation.y = -0.35;
  const bannerTex = canvasTex(THREE, 2048, 470, (g, w, h) => {
    g.fillStyle = '#fff4dc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#059669'; g.fillRect(0, 0, w, 36); g.fillRect(0, h - 36, w, 36);
    const fit = 0.8 * w / layoutWord('TRITONGYM', 100, { track: 0.14 }).width * 100;      // ~80% of the board, even margins
    comicWord(g, 'TRITONGYM', w / 2, h / 2 + 10, Math.min(fit, 270), { fill: '#10b981', shade: '#047857', rot: -0.02, track: 0.14, fan: 0.03 });
  });
  T.finish = buildFinish(THREE, add, station(A.finish, R.track), { bannerTex });
  const twr = station(WATCH.th, WATCH.r); T.tower = buildTower(THREE, add, twr, { y: WATCH.y }); twr.rotation.y = WATCH.yaw;
  T.startSt = station(A.start, R.track);

  // ---- cast
  T.tok = buildLLM(THREE, add, scene, {});
  T.kern = buildKern(THREE, add, scene, {});
  T.oro = buildOro(THREE, add, scene, {});
  T.dash = buildDash(THREE, add, scene);
  T.slip = buildSlip(THREE, add, scene);
  T.check = buildCheck(THREE, add, scene, {});
  T.opCard = buildOpCard(THREE, add, scene);
  T.mitt = buildMitt(THREE, add, scene);
  // fresh tokens for the refine (B5): 4 round wheels + the nose cone fly from Tok's mouth
  T.fresh = [0, 1, 2, 3, 4].map((i) => { const g = new THREE.Group(); scene.add(g); add(i < 4 ? new THREE.CylinderGeometry(0.16, 0.16, 0.1, 20).rotateX(Math.PI / 2) : new THREE.ConeGeometry(0.12, 0.32, 4, 1).rotateZ(-Math.PI / 2), { key: i < 4 ? 'freshwheel' : 'freshcone', color: 0xfff4dc, rim: 0.6, spec: 0 }, { outline: 0.6 }, [0, 0, 0], [0, 0, 0], g); g.scale.setScalar(T.kern.scale); return g; });
  // the square wheel that flops away
  T.flop = (() => { const g = new THREE.Group(); scene.add(g); add(new THREE.BoxGeometry(0.3, 0.3, 0.11), { key: 'wheel-sq', color: 0x0b5e46, rim: 0.6, spec: 0 }, { outline: 0.6 }, [0, 0, 0], [0, 0, 0], g); g.scale.setScalar(T.kern.scale); return g; })();
  // the payoff: PERF@1 > 1, one line, bold emerald faces (ours; coral is the oracle's / an error), light shade, no
  // halftone, ink-dark extrusion (no coloured underside)
  const face = { key: 'lt-face', color: 0x10b981, rim: 0.9, hatchDir: [0.3, 1, 0], shadeColor: 0x047857, shadeMix: 0.15, spec: 0, halftone: 0, hatch: 0.25, toneBias: 0.2 };
  const side = { key: 'lt-side', color: 0x2b2447, rim: 0.3, hatchDir: [0, 1, 0], spec: 0 };
  T.letters = new THREE.Group(); scene.add(T.letters);
  T.lettersIn = new THREE.Group(); T.letters.add(T.lettersIn);
  T.w1 = word3D(THREE, add, T.lettersIn, 'PERF@1', 0.82, { face, side, depth: 0.38, weight: 0.28 });
  T.w2 = word3D(THREE, add, T.lettersIn, '>1', 1.24, { face, side, depth: 0.46, weight: 0.29, track: 0.26 });
  T.w1.root.position.x = -T.w1.width - 0.35; T.w2.root.position.x = 0.15;
  T.lettersIn.position.x = (T.w1.width + 0.35 - T.w2.width - 0.15) / 2;
  // the slam's dust ring (a flat torus that spreads and fades under the letters)
  T.dust = add(new THREE.TorusGeometry(1, 0.08, 8, 48), { key: 'dust', color: 0xfff4dc, rim: 0.2, spec: 0 }, { outline: 0.7, cast: false }, [0, 0, 0], [Math.PI / 2, 0, 0]);
  T.dust.visible = false;
  T.letters.visible = false;
  // a comic title burst behind the letters (pops on the slam)
  { const sh = new THREE.Shape(), n = 18; for (let k = 0; k <= 2 * n; k++) { const a = k / (2 * n) * TAU, rr = k % 2 ? 0.7 + 0.08 * Math.sin(k * 2.3) : 1; (k ? sh.lineTo : sh.moveTo).call(sh, Math.cos(a) * rr, Math.sin(a) * rr); }
    T.burst = add(new THREE.ShapeGeometry(sh), { color: 0xf7d27a, flat: 0.55, rim: 0.2, spec: 0, halftone: 0.6, receive: false }, { outline: 1.1, cast: false }, [0, 0.62, -0.55], [0, 0, 0], T.letters); }

  // ---- painted cyclorama (warm)
  const bdTex = await cachedBake(THREE, bakeBrushTexture, { width: 4096, height: 1024, seed: 21, key: 'tgbackdrop2', background: '#ffffff' }, (p, brush, w, h) => {
    const cx = w * 0.5, cy = h * 0.66;
    brush.noStroke();
    const n = 48;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = a0 + Math.PI * 2 / n * 0.5;
      brush.fill('#c9c3b8', 120); brush.fillBleed(0.03); brush.fillTexture(0.25, 0.2);   // softer rays: warm cream wall, no khaki blotches
      brush.polygon([[cx, cy], [cx + Math.cos(a0) * 3200, cy + Math.sin(a0) * 1500], [cx + Math.cos(a1) * 3200, cy + Math.sin(a1) * 1500]]);
    }
  });
  T.backdrop = npr.backdrop(bdTex, { radius: 30, height: 30, y: -6, arc: [0, TAU], color: 0xf8e2b6 });
  scene.add(T.backdrop);
  return { scene, camera };
}

// ------------------------------------------------------------------------------------------------
// per frame
// ------------------------------------------------------------------------------------------------
function setMap(m, tex) { (Array.isArray(m.material) ? m.material[0] : m.material).uniforms.uMap.value = tex; }
const vb = (F) => Math.floor(F / 2) % 2;                            // face-drawing variant (boils on twos)

export function updateWorld(ctx) {
  const F = ctx.iw;
  updateCamera(ctx, F);
  updateTok(F); updateKern(F); updateOro(F); updateDash(F);
  updateStations(F); updateLetters(F); updateOpCard(F);
  window.__tg = { st, T };                                           // (debug handle for the studio)
  for (const [n, S] of [['kern', st.kern], ['oro', st.oro], ['tok', st.tok]]) if (S && S.vis !== false && S.pos && (!S.pos.every(Number.isFinite) || !Number.isFinite(S.yaw))) throw new Error(`frame ${F}: ${n} has a non-finite pos/yaw`);
  const racing = (F >= K.go1 && F < K.lap2[0]) || (F >= K.go2 && F < K.freeze[1]);
  T.card.fans.forEach((f, i) => { f.rotation.y = (F / NF) * TAU * 22 * (i % 2 ? -1 : 1) + (racing ? 0 : 0); });
}

function updateCamera(ctx, F) {
  const cam = T.camera;
  let w = camWorld(F);
  if (Q.get('cam')) { const c = Q.get('cam').split(',').map(Number); w = { pos: polar(c[0], c[1], c[2]), target: polar(c[3], c[4], c[5]), fov: c[6] || 32, roll: 0 }; }
  const hand = handheld(ctx.t, { amp: 0.02, rot: 0.003, speed: 5, seed: 7 });
  const hit = (f0, amp, dec = 4) => { const a = F - f0; if (a < 0 || a > 24) return [0, 0, 0]; const k = amp * Math.exp(-a / dec); return [(hsh(F, 1.3, f0) * 2 - 1) * k, (hsh(F, 2.7, f0) * 2 - 1) * k, (hsh(F, 5.1, f0) * 2 - 1) * k * 0.5]; };
  const sh = [hit(K.clang, 0.02), hit(K.slam, 0.04, 4), hit(K.cross, 0.008)].reduce((a, b) => a.map((v, i) => v + b[i]), [0, 0, 0]);
  hand.rot = hand.rot.map((v, i) => v + sh[i]);
  applyRig(cam, { pos: w.pos, target: w.target, fov: w.fov, roll: w.roll }, { hand });
  st.camTarget = w.target;
  const yawAt = (f) => { const q = camWorld(f); return Math.atan2(q.target[0] - q.pos[0], q.target[2] - q.pos[2]); };
  let dy = yawAt(F + 0.5) - yawAt(F - 0.5);
  if (dy > Math.PI) dy -= TAU; if (dy < -Math.PI) dy += TAU;
  const inWhip = WHIPS.some(([a, b]) => F > a && F < b);
  // smear only over the 7 fastest frames of a whip (a bell round the window's middle: 1 light, 2 heavy, 1 light ...),
  // capped at 60 design px: the 2D streaks and the move itself carry the speed
  const wh = WHIPS.find(([a, b]) => F > a && F < b);
  const mid = wh ? (wh[0] + wh[1]) / 2 : 0, u = (F - mid + 3.5) / 7;
  const bell = wh && u > 0 && u < 1 ? Math.pow(Math.sin(Math.PI * u), 2) : 0;
  const ys = yawSmear(cam, dy * 24, 24);
  st.smear = inWhip && Math.abs(dy * 24) > 0.6 ? Math.sign(ys) * Math.min(Math.abs(ys), 60) * bell : 0;
  ctx.camera = cam;
}

// ---- Tok
function updateTok(F) {
  const S = tokState(F), R_ = T.tok;
  st.tok = S;
  R_.root.visible = S.vis !== false;
  R_.root.position.set(...S.pos);
  R_.root.rotation.set(0, S.yaw, 0);
  R_.hips.rotation.set(S.lean || 0, 0, S.tilt || 0);
  R_.body.scale.set(1 + S.sq * 0.5, 1 - S.sq, 1 + S.sq * 0.5);
  R_.body.rotation.x = -0.4 * (S.lookUp || 0);
  R_.arms[0].g.rotation.set(S.armLz || 0, 0, -(S.armL ?? 0.35));
  R_.arms[1].g.rotation.set(S.armRz ? -S.armRz : 0, 0, -(S.armR ?? -0.35));
  setMap(R_.bodyM, (R_.faces[S.face] || R_.faces.calm)[vb(F)]);
  const air = S.pos[1] > 0.02;
  R_.legs.forEach((L, i) => { L.g.rotation.x = air ? -0.4 + 0.2 * i : 0; });
}

// ---- Kern
function updateKern(F) {
  const S = kernState(F), K_ = T.kern;
  st.kern = S;
  K_.root.visible = S.vis;
  if (!S.vis) return;
  K_.root.position.set(...S.pos);
  K_.root.rotation.set(0, S.yaw, 0);
  K_.body.rotation.set(S.roll || 0, 0, S.pitch || 0);
  const sq = S.sq || 0, str = S.stretch || 0;
  K_.body.scale.set(K_.scale * (1 + str - sq * 0.3), K_.scale * (1 - sq), K_.scale * (1 + sq * 0.5));
  K_.root.updateMatrixWorld(true);
  // B1 assembly: tokens fly from Tok's mouth to their slots; wheels plonk; the cowlick lands crooked
  const building = F < K.hopOff[0];
  const mouth = tokMouth();
  K_.tiles.forEach((t, n) => {
    const u = building ? tokenFlight(F, n, 1) : 1;
    t.g.visible = u > 0;
    if (u >= 1) { t.g.position.set(...t.home); t.g.rotation.set(0, 0, 0); t.g.scale.setScalar(1); }
    else if (u > 0) placeFlying(t.g, mouth, t.home, u, n);
  });
  K_.chassis.visible = !building || tokenFlight(F, 0, 1) >= 1;
  const un = building ? tokenFlight(F, 7, 1) : 1;
  K_.noseG.visible = un > 0;
  if (un >= 1) { K_.noseG.position.set(KERN_SLOTS[7][0] + 0.04, KERN_SLOTS[7][1] + 0.03, 0); K_.noseG.rotation.set(0, 0, 0); K_.noseG.scale.setScalar(K_.noseS); } else if (un > 0) placeFlying(K_.noseG, mouth, KERN_SLOTS[7], un, 7);
  setMap(K_.nose, (K_.faces[S.face] || K_.faces.calm)[vb(F)]);
  (Array.isArray(K_.nose.material) ? K_.nose.material[0] : K_.nose.material).uniforms.uAlbedo.value.set(...(S.compiled > 0.3 ? [0.74, 0.94, 0.84] : [1, 0.957, 0.863]));   // the head turns pale emerald once compiled
  const uc = sg(F, K.cow, K.cow + 7);
  K_.cowlick.visible = uc > 0 && F < K.lift[1];
  if (uc > 0 && uc < 1) placeFlying(K_.cowlick, mouth, [0.1, 0.25, 0.02], uc, 9);
  else if (uc >= 1) { K_.cowlick.position.set(0.1, 0.25 - 0.1 * S.cow, 0.02); K_.cowlick.rotation.set(0.25 * (1 - S.cow), 0.3 * (1 - S.cow), 0.62 * (1 - S.cow)); K_.cowlick.scale.set(1, 1 - 0.6 * S.cow, 1); }
  // wheels
  const wIn = building ? sg(F, K.wheels[0], K.wheels[1]) : 1;
  K_.wheelsSq.forEach((w, i) => {
    w.visible = !S.round && wIn > i * 0.25;
    const drop = building ? clamp(1 - (wIn * 4 - i)) : 0;
    w.position.y = -0.14 + 0.5 * drop * drop;
    w.rotation.z = -S.wheelAng;
  });
  K_.wheelsRd.forEach((w) => { w.visible = S.round; w.rotation.z = -S.wheelAng; });
  K_.cone.visible = S.nose;
  // compile ripple: tiles flood from cream to emerald front to back; fresh parts stay cream until the lap-2 gate
  K_.tiles.forEach((t, n) => {
    const k = S.compiled * 1.5 - (0.3 - t.home[0]) * 0.8;
    setMap(t.m, k > 0.5 ? K_.texCmp[n] : K_.tex[n]);
  });
  const fresh = S.freshParts, srcSq = S.compiled < 0.5;
  const mSrc = T.surf({ key: 'freshwheel', color: 0xfff4dc, rim: 0.6, spec: 0 }), mCmp = T.surf({ key: 'wheel-rd', color: 0x0b5e46, rim: 0.6, spec: 0 });
  K_.wheelsSq.forEach((w) => { w.userData.cube.material = srcSq ? mSrc : T.surf({ key: 'wheel-sq', color: 0x0b5e46, rim: 0.6, spec: 0 }); });
  K_.wheelsRd.forEach((w) => { w.userData.disc.material = fresh ? mSrc : mCmp; });
  K_.coneM.material = T.surf(fresh ? { key: 'freshcone', color: 0xfff4dc, rim: 0.6 } : { key: 'cone-cmp', color: 0x10b981, rim: 0.6 });
  K_.keyBow.rotation.x = (S.keySpin || 0) + (F >= K.go1 && F < K.lap2[0] ? F * 0.4 : F >= K.go2 && F < K.cross ? F * 0.9 : 0);
}
/** Tok's painted mouth in world space (a little out in front of the balloon, towards the lens) */
function tokMouth() {
  const S = st.tok, yaw = S.yaw;
  return [S.pos[0] + Math.sin(yaw) * 0.42, S.pos[1] + 0.86 * (1 - (S.sq || 0)), S.pos[2] + Math.cos(yaw) * 0.42];
}
/** place a group on an arc from a world point (Tok's mouth) to a local slot of Kern's body */
function placeFlying(g, fromW, slot, u, n) {
  const K_ = T.kern;
  const toW = K_.body.localToWorld(V(...slot));
  // out of the mouth sideways first (ease-out across), then a small hop onto the slot: a token in flight never crosses
  // Tok's face, and reads against the wall
  const eh = 1 - (1 - u) * (1 - u), ev = sm(u);
  const mid = [(fromW[0] + toW.x) / 2, 0, (fromW[2] + toW.z) / 2], ml = Math.hypot(mid[0], mid[2]) || 1, bulge = 0.18 * Math.sin(Math.PI * u);
  const hump = 0.5 * Math.sin(Math.PI * u) * sm(u / 0.35);
  const p = [lerp(fromW[0], toW.x, eh) + mid[0] / ml * bulge, lerp(fromW[1], toW.y, ev) + hump, lerp(fromW[2], toW.z, eh) + mid[2] / ml * bulge];
  const loc = K_.body.worldToLocal(V(...p));
  g.position.copy(loc);
  g.rotation.set(0, 0, (1 - u) * (2 + n) * 1.3);
  const pop = u < 0.2 ? 0.4 + 3 * u : 1 + 0.25 * Math.sin(Math.PI * clamp((u - 0.85) / 0.15));
  g.scale.setScalar(pop);
}

// ---- the operator card: off the stack, shown to the lens, laid on the bench, then Kern's racing number plate
const PLATE = { pos: [-0.14, 0.08, 0.305], s: 0.8 };   // rearward and up: clear of the front wheel
function updateOpCard(F) {
  const C = T.opCard.root, kb = T.kern.body, Sk = st.kern;
  const onKern = F >= K.plate[1] && Sk.vis;
  if (onKern) {
    if (C.parent !== kb) kb.add(C);
    C.visible = true; C.position.set(...PLATE.pos); C.rotation.set(0, 0, 0); C.scale.setScalar(PLATE.s / T.kern.scale);
    return;
  }
  if (C.parent !== T.scene) T.scene.add(C);
  C.visible = F < K.plate[1];
  if (!C.visible) return;
  C.scale.setScalar(1);
  const tk = st.tok, fwd = [Math.sin(tk.yaw), 0, Math.cos(tk.yaw)];
  const flat = new T.THREE.Quaternion().setFromEuler(new T.THREE.Euler(-Math.PI / 2, faceOut(B1.thTok) + 0.2, 0, 'YXZ'));
  const side = [Math.cos(tk.yaw), 0, -Math.sin(tk.yaw)];      // Tok's local +x (screen right when it faces the lens)
  const held = [tk.pos[0] + fwd[0] * 0.5 - side[0] * 0.72, tk.pos[1] + 1.28, tk.pos[2] + fwd[2] * 0.5 - side[2] * 0.72];   // up beside its face
  const heldQ = new T.THREE.Quaternion().setFromEuler(new T.THREE.Euler(-0.08 + 0.05 * Math.sin(F * 0.7), tk.yaw, 0.04 * Math.sin(F * 0.5), 'YXZ'));
  const restQ = new T.THREE.Quaternion().setFromEuler(new T.THREE.Euler(-Math.PI / 2, faceOut(B1.thTok) - 0.3, 0, 'YXZ'));
  const set = (p, q) => { C.position.set(...p); C.quaternion.copy(q); };
  const arc = (a, b, u, h) => a.map((v, i) => lerp(v, b[i], sm(u)) + (i === 1 ? h * Math.sin(Math.PI * u) : 0));
  const top = [B1.stackTop[0], B1.stackTop[1] + 0.01, B1.stackTop[2]];
  if (F < K.pull[0] + 2) return set(top, flat);
  if (F < K.show[0]) { const u = sg(F, K.pull[0] + 2, K.show[0]); return set(arc(top, held, u, 0.35), flat.clone().slerp(heldQ, sm(u))); }
  if (F < K.cardDown[0]) { set(held, heldQ); C.scale.setScalar(1 + 0.3 * ob(sg(F, K.show[0], K.show[0] + 5))); return; }
  if (F < K.plate[0]) { const u = sg(F, K.cardDown[0], K.cardDown[1]); set(arc(held, B1.cardRest, u, 0.25), heldQ.clone().slerp(restQ, sm(u))); C.scale.setScalar(1.3 - 0.3 * sm(u)); return; }
  // flips up and slaps onto Kern's side
  const u = sg(F, K.plate[0], K.plate[1]);
  kb.updateMatrixWorld(true);
  const toP = kb.localToWorld(V(...PLATE.pos)), toQ = kb.getWorldQuaternion(new T.THREE.Quaternion());
  set(arc(B1.cardRest, toP.toArray(), u, 0.4), restQ.clone().slerp(toQ, sm(u)));
  C.scale.setScalar(lerp(1, PLATE.s, sm(u)));
}

// ---- Oro
function updateOro(F) {
  const S = oroState(F), O = T.oro;
  st.oro = S;
  O.root.visible = S.vis;
  if (!S.vis) return;
  O.root.position.set(...S.pos);
  O.root.rotation.set(0, S.yaw, 0);
  const sq = S.sq || 0, str = S.stretch || 0;
  O.body.scale.set(1.35 * (1 + str), 1.35 * (1 - sq - str * 0.2), 1.35 * (1 + sq * 0.4));
  O.body.rotation.z = (S.nod || 0) * 0.4 + (S.buff ? 0.03 * Math.sin(F * 0.8) : 0);
  setMap(O.bodyM, (O.faces[S.face] || O.faces.smug)[vb(F)]);
  O.wheels.forEach((w) => { w.rotation.z = -S.wheelAng; });
  O.key.rotation.y = S.keySpin || 0;
  const ls = S.laurelSlip || 0;                                    // the laurel slides forward and tilts down across one eye
  O.laurel.position.set(-0.2 + 0.46 * ls, 0.2 + 0.02 * ls, 0.1 * ls);   // slides forward off the key and tips down over one eye (a band, never a ring round the cone)
  O.laurel.rotation.set(0.55 * ls, 0, -1.15 * ls);
}

// ---- Dash
function updateDash(F) {
  const S = dashState(F), D = T.dash;
  D.root.visible = S.vis;
  if (!S.vis) return;
  D.root.position.set(...S.pos);
  D.root.rotation.set(0, S.yaw, 0);
  D.body.rotation.set(S.roll || 0, S.quiver || 0, -0.25 * (S.droop || 0));
  // pupils: forward while flying, then rolling (dizzy) once stuck
  const a = F - K.clang;
  D.eyes.forEach(({ pu }, i) => {
    if (a < 0) pu.position.set(0.05, 0.02, (i ? 1 : -1) * 0.02);
    else { const w = a * 0.35 + i * 1.3; pu.position.set(0.05 * Math.cos(w), 0.05 * Math.sin(w), (i ? 1 : -1) * 0.02 + 0.04 * Math.sin(w * 0.7)); }
  });
}

// ---- stations
function updateStations(F) {
  const G = gateState(F), g = T.gate;
  st.gate = G;
  const drop = (d) => (1 - d) * (g.h - 0.25);
  g.grates[0].slide.position.y = drop(G.ours);
  g.grates[1].slide.position.y = drop(G.theirs);
  g.grates[0].pivot.rotation.z = 0.95 * G.bat;
  setMap(g.lintel, g.faces[G.face][vb(F)]);
  g.lamp.material.uniforms.uAlbedo.value.set(...(G.lamp === 'coral' ? [0.94, 0.29, 0.37] : G.lamp === 'emerald' ? [0.06, 0.73, 0.5] : [0.98, 0.93, 0.8]));
  g.root.position.y = G.shake * 0.03 * Math.sin(F * 3.1);
  g.lintel.rotation.z = 0.16 * G.nod;
  // the close-up press: a mitt comes down on the crooked token and squashes it flat
  const mt = T.mitt.root;
  mt.visible = F >= K.closeup[0] + 2 && F < K.closeup[1];
  if (mt.visible) {
    const cw = T.kern.body.localToWorld(V(0.1, 0.34, 0.02));
    const down = sg(F, K.closeup[0] + 2, K.press[0], ease.inCubic) * (1 - sg(F, K.press[1], K.closeup[1], sm));
    mt.position.set(cw.x, cw.y + 0.12 + 0.9 * (1 - down), cw.z); mt.rotation.set(0.15, 0, -0.25);
    const sq = F >= K.press[0] && F < K.press[1] ? 0.25 * Math.sin(Math.PI * sg(F, K.press[0], K.press[1])) : 0;
    T.mitt.hand.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
  }
  // weigh-in
  const W = scaleState(F), w = T.weigh;
  st.weigh = W;
  w.beam.rotation.z = W.tilt;
  w.pans.forEach((P) => { const bx = P.side * w.span; P.g.position.set(bx * Math.cos(W.tilt), 1.08 + bx * Math.sin(W.tilt), 0); });
  w.needle.rotation.z = W.needle;
  w.flag.visible = false;                                          // (the PASS pennant is Torchy's now)
  const pn = T.torch.pennant; pn.visible = W.flag > 0.01; pn.rotation.z = 2.3 * (1 - W.flag); pn.children[1].rotation.y = 0.35 + 0.15 * Math.sin(F * 0.8);
  w.flag.scale.set(Math.max(0.01, W.flag), Math.max(0.01, W.flag), 1);
  w.flood.visible = W.flood > 0.02; w.flood.scale.setScalar(Math.max(0.02, W.flood));
  w.flagCloth.rotation.y = 0.12 * Math.sin(F * 0.5);
  { const pos = w.flagCloth.geometry.attributes.position; if (!w.flagBase) w.flagBase = pos.array.slice();   // a cloth wave
    for (let i = 0; i < pos.count; i++) { const x = w.flagBase[3 * i]; pos.setZ(i, w.flagBase[3 * i + 2] + 0.045 * x * 2.5 * Math.sin(x * 9 - F * 0.7)); } pos.needsUpdate = true; }
  // the output block: ejected from Kern's tail onto the left pan (B3), again in lap 2
  const ob_ = T.outBlock, leftPan = w.pans[0].g; leftPan.updateMatrixWorld(true);
  const panW = leftPan.localToWorld(V(0, 0.04, 0));
  let u = -1;
  if (F >= K.eject[0] && F < K.cut + 30) u = sg(F, K.eject[0], K.eject[1]);
  if (F >= K.scale2 - 6 && F < K.side2[0]) u = sg(F, K.scale2 - 6, K.scale2);
  ob_.root.visible = u >= 0 && st.kern.vis;
  if (ob_.root.visible) {
    const from = T.kern.body.localToWorld(V(-0.4, 0.3, 0));
    const e = sm(u);
    ob_.root.position.set(lerp(from.x, panW.x, e), lerp(from.y, panW.y, e) + 0.8 * Math.sin(Math.PI * u), lerp(from.z, panW.z, e));
    ob_.root.rotation.set(0, (1 - u) * 3 + 0.2, (1 - u) * 2);
  }
  // Torchy
  const tf = F >= K.flag && F < K.cut + 12 ? 'happy' : F >= K.eject[1] && F < K.flag ? 'squint' : 'calm';
  setMap(T.torch.cup, T.torch.faces[tf][vb(F)]);
  const flare = F >= K.flag && F < K.flag + 16 ? ob(sg(F, K.flag, K.flag + 6)) * 0.35 * (1 - sg(F, K.flag + 8, K.flag + 16)) : 0;
  T.torch.flame.scale.set(1 + 0.08 * Math.sin(F * 0.9), 1 + flare + 0.1 * Math.sin(F * 0.7 + 1), 1);
  // stopwatch
  const Wt = watchState(F);
  T.tower.hands[0].rotation.z = -Wt.coral; T.tower.hands[1].rotation.z = -Wt.emerald;
  T.tower.btn.position.y = 1.04 - 0.06 * Wt.press;
  // the error slip: spat from the lintel, flutters onto Tok's balloon, peeled off, dropped
  const sl = T.slip.root, tk = st.tok;
  sl.visible = F >= K.slip[0] && F < K.peel[1] + 10;
  if (sl.visible) {
    const lintel = polar(A.gate, R.ours, 2.45);
    const faceP = [tk.pos[0] + Math.sin(tk.yaw) * 0.52, tk.pos[1] + 1.05, tk.pos[2] + Math.cos(tk.yaw) * 0.52];
    const u2 = sg(F, K.slip[0], K.slip[1], sm);
    let p = lintel.map((v, i) => lerp(v, faceP[i], u2)); p[1] += 0.6 * Math.sin(Math.PI * u2);
    if (F >= K.peel[0]) { const u3 = sg(F, K.peel[0], K.peel[1] + 10); p = [faceP[0] + Math.sin(tk.yaw + 1.2) * 0.5 * u3, faceP[1] + 0.4 * u3 - 1.4 * u3 * u3, faceP[2] + Math.cos(tk.yaw + 1.2) * 0.5 * u3]; }
    sl.position.set(...p);
    sl.rotation.set(0.3 * Math.sin(F * 0.7), tk.yaw + (F < K.slip[1] ? (K.slip[1] - F) * 0.6 : 0), 0.2 * Math.sin(F * 0.5));
  }
  // the green check on Kern at the payoff
  const ck = T.check.root;
  ck.visible = !!st.kern.showCheck && st.kern.vis;
  if (ck.visible) {
    const p = T.kern.body.localToWorld(V(0.66, 0.5, 0.26));    // on the face block's top corner: clear of the plate and below the letters
    ck.position.copy(p); ck.rotation.set(0, faceOut(toRing([p.x, p.y, p.z])[0]), 0);
    ck.scale.setScalar(ob(sg(F, K.check, K.check + 6)) * 0.5);
  }
  // fresh tokens (B5): 4 round wheels + the cone fly from Tok's mouth to Kern; a square wheel flops away
  const mouth = tokMouth();
  T.fresh.forEach((gq, i) => {
    const uu = sg(F, K.speak2[0] + i * 3, K.speak2[0] + i * 3 + 8);
    gq.visible = uu > 0 && uu < 1 && st.kern.vis;
    if (!gq.visible) return;
    const slot = i < 4 ? T.kern.wheelsRd[i].position.toArray() : [0.8, -0.14, 0];
    const toW = T.kern.body.localToWorld(V(...slot));
    const e = sm(uu);
    // out of the mouth, down and out towards the lens (never across Tok's eyes), onto the axle
    const ml = Math.hypot(mouth[0], mouth[2]) || 1, bo = 0.25 * Math.sin(Math.PI * uu);
    gq.position.set(lerp(mouth[0], toW.x, e) + mouth[0] / ml * bo, lerp(mouth[1], toW.y, e) + 0.12 * Math.sin(Math.PI * uu), lerp(mouth[2], toW.z, e) + mouth[2] / ml * bo);
    gq.rotation.set(0, st.kern.yaw, (1 - uu) * 4);
  });
  const fl = T.flop, uf = sg(F, K.popOff, K.popOff + 30);
  fl.visible = uf > 0 && uf < 1;
  if (fl.visible) {
    const d = uf * 1.6;
    fl.position.set(...polar(A.finish + 0.05 - d / 7, R.ours + 0.5 + d * 0.5, 0.2 + Math.abs(Math.sin(uf * Math.PI * 4)) * 0.35 * (1 - uf)));
    fl.rotation.set(0, headingAt(A.finish), -uf * Math.PI * 4);
  }
}

function updateLetters(F) {
  const on = F >= K.slam - 12 && F < K.away[0] + 10;   // the payoff set leaves on the heaviest smear frame
  T.letters.visible = on;
  const a = F - K.slam;
  const th = A.words;
  const base = polar(L2 + th, 1.05, 1.08);          // on top of the graphics card, behind the finish
  const du = sg(F, K.slam, K.slam + 14);
  T.dust.visible = false;   // (the 3D ring read as an underline edge-on: 2D inked dust puffs instead, see drawMarks)
  if (T.dust.visible) { const r = 2.2 + 3.2 * ease.outCubic(du); T.dust.position.set(base[0], 1.1, base[2]); T.dust.scale.set(r, r, 1 - 0.8 * du); }
  if (!on) return;
  let y = 0, sy = 1, sxz = 1;
  if (a < 0) { const p = (a + 12) / 12; y = 7 * (1 - p * p); sy = 1.12; sxz = 0.93; }
  else if (a < 3) { sy = 0.78; sxz = 1.1; }                              // the squash holds 3 frames
  else { sy = 1 - ringv(a - 3, 0.2, 0.8, 0.2); sxz = 1 + ringv(a - 3, 0.1, 0.8, 0.2); }
  T.letters.position.set(base[0], base[1] + y + 0.02, base[2]);
  T.letters.rotation.set(0, faceOut(th) + 0.08, 0);
  T.letters.scale.set(sxz, sy, sxz);
  const bk = a < 0 ? 0 : ob(a / 5);
  T.burst.visible = bk > 0.01; T.burst.scale.set(4.6 * bk, 1.55 * bk, 1); T.burst.rotation.z = 0.03 * Math.sin(F * 0.3);
}

// ------------------------------------------------------------------------------------------------
// npr extras
// ------------------------------------------------------------------------------------------------
const WRAP = (f) => ((f % NF) + NF) % NF;
function keyLight(F) {
  const back = V(0, 0, 0), tg = V(0, 0, 0);
  const offs = [-30, -20, -10, 0, 10, 20, 30];
  for (const o of offs) {
    const w = camWorld(WRAP(F + o)), wt = 1 - Math.abs(o) / 40;
    back.addScaledVector(V(w.pos[0] - w.target[0], 0, w.pos[2] - w.target[2]).normalize(), wt);
    tg.addScaledVector(V(...w.target), wt);
  }
  if (back.length() < 0.2) { const w = camWorld(F); back.set(w.pos[0] - w.target[0], 0, w.pos[2] - w.target[2]); }
  back.normalize(); tg.multiplyScalar(1 / offs.reduce((a, o) => a + 1 - Math.abs(o) / 40, 0));
  const right = V(back.z, 0, -back.x);
  const d = V(0, 0, 0).addScaledVector(right, -0.62).addScaledVector(V(0, 1, 0), 0.9).addScaledVector(back, 0.42);
  return { dir: [d.x, d.y, d.z], target: [tg.x, 0.5, tg.z] };
}

export function drawNPR(ctx) {
  const { npr, camera } = T, F = ctx.iw;
  npr.frame(ctx);
  npr.setSmear(st.smear || 0, 0);
  // key light: from the upper left of the lens, a little from the front, but low-passed over +-1.25 s of the camera path
  // (a light that turned with every camera move popped shadows on the heroes); the shadow box follows the smoothed target
  {
    const L = keyLight(F);
    npr.setLight({ dir: L.dir, target: L.target, size: 12, dist: 30, shadows: !Q.get('noshadow') });
  }
  const fp = st.kern.vis && st.kern.pos ? st.kern.pos : st.tok.pos;
  npr.focusOn(camera, V(...fp), 10);     // wide sharp zone: the whole cast keeps its ink (a defocused character loses its lines and reads as a ghost)
  // impact frames: the CLANG and the photo finish (2 frames each, posterised; never a white frame)
  // impact frames by object: the subject stays a light plate with its ink, the set goes ink (never a cream flash)
  const cut = (p) => camera.position.distanceTo(V(...p)) + 2.2;
  if (F >= K.clang && F < K.clang + 2) npr.impact(1, { threshold: 0.36, depthCut: cut(polar(A.gate, R.ours, 0.5)), setIds: T.setIds, plate: F === K.clang ? [1, 0.84, 0.8] : [1, 1, 0.96] });
  if (F >= K.freeze[0] && F < K.freeze[1]) npr.impact(1, { threshold: 0.36, depthCut: cut(polar(L2 + A.finish, R.track, 0.4)), setIds: T.setIds, plate: F === K.freeze[0] ? [0.84, 1, 0.9] : [1, 1, 0.96] });
  const fl = (f0, len, pt, r0, amt, seed) => { const a = F - f0; if (a < 0 || a >= len) return; const c = ctx.project(V(...pt), camera); npr.focusLines({ x: c.x, y: c.y, r0, amount: amt * (1 - a / len), count: 70, width: 6, seed }); };
  fl(K.clang, 14, polar(A.gate, R.ours, 1.0), 300, 0.9, 3);
  if (st.kern.pos) fl(K.closeup[0] - 3, 7, [st.kern.pos[0], 0.45, st.kern.pos[2]], 220, 0.9, 11);   // the push onto the token lands with zoom lines
  if (st.kern.pos) fl(K.crash[0] + 2, 12, [st.kern.pos[0], 0.2, st.kern.pos[2]], 260, 1.0, 7);     // the crash zoom lands with zoom lines
  fl(K.slam, 18, polar(L2 + A.words, 1.2, 1.9), 420, 1.0, 9);
  fl(K.hold[0] + 2, K.hold[1] - K.hold[0] - 2, polar(L2 + A.finish, R.track, 0.45), 380, 0.7, 5);
  if (F >= K.slam - 4 && F < K.away[0]) npr.pointLight(V(...polar(A.words, 3.6, 2.4)), { color: 0xffc23d, radius: 3.6, i: 0.5 * sm((F - K.slam + 4) / 8) });
  if (F >= K.gate2 - 1 && F < K.gate2 + 12) npr.pointLight(V(...polar(A.gate + 0.12, R.ours, 0.6)), { color: 0x34d399, radius: 2.0, i: 0.8 * (1 - sg(F, K.gate2 + 2, K.gate2 + 12)) });   // lap-2 recompile flash
  if (F >= K.ripple[0] && F < K.ripple[1] + 10) npr.pointLight(V(...polar(A.gate + 0.1, R.ours, 0.6)), { color: 0x34d399, radius: 1.6, i: 0.6 * (1 - sg(F, K.ripple[1], K.ripple[1] + 10)) });
  if (st.gate.lamp !== 'off') npr.glowAt(ctx, camera, T.gate.lamp.getWorldPosition(V(0, 0, 0)), { radius: 0.55, i: 1.0, color: st.gate.lamp === 'coral' ? 0xef4b5f : 0x10b981, behind: true, seed: 2 });
  npr.render(T.scene, camera);
}

export function drawInk(ctx, brush) { }

// ------------------------------------------------------------------------------------------------
// 2D marks: SFX lettering, speed lines, puffs, emotes (all tracked to 3D points)
// ------------------------------------------------------------------------------------------------
function prj(ctx, p) { const v = V(...p); const s = ctx.project(v, T.camera); const vc = v.clone().applyMatrix4(T.camera.matrixWorldInverse); return { x: s.x, y: s.y, front: vc.z < 0, d: -vc.z }; }
function pxu(ctx, p) { const q = prj(ctx, p); return q.front ? (ctx.DH / 2) / (Math.tan(T.camera.fov * Math.PI / 360) * q.d) : 0; }
function puff(g, x, y, s, a, r, fill = null) {
  if (a <= 0 || s < 2) return;
  if (fill) {   // a filled cloud: cream lobes with an ink keyline (reads on dark ground)
    g.save(); g.globalAlpha = Math.min(1, a * 1.5);
    for (let q = 0; q < 3; q++) { const cx = x + (q - 1) * s * 0.8, cy = y - (q === 1 ? s * 0.4 : 0); const E = ellipsePts(cx, cy, s * 0.62, s * 0.52); fillPoly(g, E, INK); fillPoly(g, ellipsePts(cx, cy, s * 0.62 - 3, s * 0.52 - 3), fill); }
    g.restore(); return;
  }
  g.save(); g.globalAlpha = Math.min(1, a * 1.3);
  for (let q = 0; q < 3; q++) { const cx = x + (q - 1) * s * 0.8, cy = y - (q === 1 ? s * 0.4 : 0); const P = []; for (let k = 0; k <= 8; k++) { const an = Math.PI + k / 8 * Math.PI; P.push([cx + Math.cos(an) * s * 0.6, cy + Math.sin(an) * s * 0.6]); } pen(g, P, Math.max(2, s * 0.14), INK, { r, taper: [0.2, 0.2] }); }
  g.restore();
}
function speedLines(g, ctx, p, dir, len, n, r, col = INK) {
  const a = prj(ctx, p), b = prj(ctx, [p[0] - dir[0], p[1] - dir[1], p[2] - dir[2]]);
  if (!a.front || !b.front) return;
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const u = pxu(ctx, p);
  for (let k = 0; k < n; k++) {
    const off = (k - (n - 1) / 2) * u * 0.12 + r.gauss(0, u * 0.02), s0 = u * (0.25 + 0.1 * (k % 2)), l = len * u * (0.6 + 0.5 * hsh(k, 3.1) + r.gauss(0, 0.05));
    const x0 = a.x + ux * s0 - uy * off, y0 = a.y + uy * s0 + ux * off;
    pen(g, [[x0, y0], [x0 + ux * l, y0 + uy * l]], Math.max(2, u * 0.03), col, { r, taper: [0.1, 0.8] });
  }
}

export function drawMarks(ctx, g) {
  const F = ctx.iw, r = ctx.boilRng('marks');
  // CLANG! on a diagonal beside the gate
  const ca = F - K.clang;
  if (ca >= 0 && ca < K.closeup[0] - 4 - K.clang) {    // gone before the push onto the token
    const p = prj(ctx, polar(A.gate - 0.08, R.ours + 0.2, 2.3));
    const x = clamp(p.x - 260, 330, 1250), y = clamp(p.y + 20, 330, 560), c2 = ca - 2;   // top of the lettering below the card crop
    comicWord(g, 'CLANG!', x, y, 150, { fill: PAL.coral, shade: PAL.coralDk, rot: -0.12, r, pop: Math.min(c2 / 4, (K.closeup[0] - 4 - K.clang - ca) / 3), perLetter: (i) => (c2 - i * 0.8) / 3 });   // pops on, pops off before the push-in
  }
  const pf = (f0, p, s0) => { const a = F - f0; if (a < 0 || a >= 9) return; const q = prj(ctx, p); if (!q.front) return; const u = pxu(ctx, p); for (const sd of [-1, 1]) puff(g, q.x + sd * (u * 0.3 + a * 3), q.y - a, u * s0 * (1 + a * 0.08), 1 - a / 9, r); };
  pf(K.hopOff[1], polar(A.bench + 0.2, R.ours, 0.02), 0.12);
  pf(K.skid, [B1.tok[0], 0.02, B1.tok[2]], 0.14);
  pf(K.lap2[1] - 4, polar(L2 + A.start, R.ours, 0.02), 0.12);
  // the slam: chunky inked dust puffs rolling out from the letters' feet
  { const a = F - K.slam;
    if (a >= 0 && a < 11 && T.letters.visible) {
      const x0 = -(T.w1.width + 0.35), x1 = T.w2.width + 0.15;
      for (let q = 0; q < 7; q++) {
        const lx = lerp(x0, x1, q / 6), wp = T.lettersIn.localToWorld(V(lx, -0.02, 0.45));
        const c = prj(ctx, [wp.x, wp.y, wp.z]); if (!c.front) continue;
        const u = pxu(ctx, [wp.x, wp.y, wp.z]), sd = q < 3 ? -1 : q > 3 ? 1 : 0;
        puff(g, c.x + sd * (0.25 + a * 0.14) * u, c.y + u * 0.3, u * (0.17 + 0.015 * a) * (0.8 + 0.4 * hsh(q, 7)) * (1 - sm((a - 6) / 5)), 1, r, PAL.cream);   // they shrink away, inked (no grey fade)   // below the letters' feet, rolling outward over the card's edge
      }
    } }
  // square-wheel THUNK ticks under the wheels on each flat landing
  if (st.kern.vis && st.kern.lurch && !st.kern.round && F >= K.drive1[0] && F < K.kernRun1[1]) {
    const q = prj(ctx, [st.kern.pos[0], 0.02, st.kern.pos[2]]); const u = pxu(ctx, st.kern.pos);
    if (q.front) for (let k = 0; k < 5; k++) { const an = Math.PI + 0.3 + k * 0.6; pen(g, [[q.x + Math.cos(an) * u * 0.45, q.y + Math.sin(an) * u * 0.14], [q.x + Math.cos(an) * u * 0.7, q.y + Math.sin(an) * u * 0.24]], Math.max(2, u * 0.035), INK, { r }); }
  }
  // speed lines behind the racers
  const trail = (S, f0, f1, len, n) => {
    if (!S.vis || !S.pos || F < f0 || F >= f1) return;
    const th = toRing(S.pos)[0], dir = [-Math.sin(th), 0, -Math.cos(th)];   // track tangent (travel)
    const back = [S.pos[0] - dir[0] * 0.8, 0.4, S.pos[2] - dir[2] * 0.8];
    speedLines(g, ctx, back, dir, len, n, r);
  };
  trail(st.oro, K.go1 + 2, K.oroRun1[1] - 2, 1.6, 5);
  const ds = dashState(F); if (ds.vis && F < K.clang) { const back = [ds.pos[0], ds.pos[1], ds.pos[2]]; const th = toRing(ds.pos)[0]; speedLines(g, ctx, back, [-Math.sin(th), 0, -Math.cos(th)], 1.4, 4, r); }
  trail(st.oro, K.go2 + 2, K.cross, 1.2, 4);
  trail(st.kern, K.go2 + 2, K.cross, 1.2, 4);
  trail(st.kern, K.lap2[0] + 4, K.lap2[1] - 6, 1.0, 3);
  if (st.kern.steam) for (let k = 0; k < 2; k++) {
    const ph = ((F - K.kernRun1[1] + 10) / 14 + k * 0.5) % 1;
    const kp = T.kern.body.localToWorld(V(-0.6, 0.5, 0));
    const q = prj(ctx, [kp.x, kp.y + ph * 0.5, kp.z]); const u = pxu(ctx, [kp.x, kp.y, kp.z]);
    if (q.front) puff(g, q.x, q.y, u * 0.12 * (0.6 + ph), 1 - ph, r);
  }
  const tk = st.tok;
  const bangAt = (f0, p, s, rot, col = PAL.coral) => { const a = F - f0; if (a < 0 || a > 16) return; const q = prj(ctx, p); if (!q.front) return; const u = pxu(ctx, p); bang(g, q.x, q.y, u * s * ob(a / 4) * (1 - sm((a - 12) / 4)), rot, col, r); };
  bangAt(K.idea, [tk.pos[0], tk.pos[1] + 1.78, tk.pos[2]], 0.46, 0.06, PAL.emerald);   // straight above the head, against the sky
  if (st.oro.pos) bangAt(K.dtake, [st.oro.pos[0], 0.85, st.oro.pos[2]], 0.62, 0.12);   // as big as Tok's, inside the card band
  if (F >= K.check && F < K.away[0]) for (let q = 0; q < 6; q++) {
    const ph = ((F - K.check) / 18 + q * 0.23) % 1; if (ph > 0.75) continue;
    const kp = st.kern.pos || [0, 0, 0], an = q / 6 * TAU + 0.4;
    const p = [kp[0] + Math.cos(an) * 0.75, 0.75 + 0.45 * hsh(q, 4) + 0.2 * Math.sin(an), kp[2] + Math.sin(an) * 0.75];   // round the winner
    const s = prj(ctx, p); if (!s.front) continue;
    fillPoly(g, starPts(s.x, s.y, 18 * Math.sin(Math.PI * ph / 0.75), 0.36, 4, 0.2 * q), q % 2 ? PAL.ochre : PAL.cream);
  }
  // the stopwatch insert: an emerald wedge between the stopped emerald hand and the coral one (the time saved), and a
  // click burst on each hand tip as it stops
  const W = watchState(F);
  if (W.inIns) {
    const hp = (a, rho) => { const v = T.tower.head.localToWorld(V(rho * Math.sin(a), rho * Math.cos(a), 0.2)); return prj(ctx, [v.x, v.y, v.z]); };
    if (W.stopE) {
      const P = [hp(0, 0).x, hp(0, 0).y], pts = [[P[0], P[1]]];
      for (let k = 0; k <= 12; k++) { const q = hp(lerp(W.emerald, W.coral, k / 12), 0.66); pts.push([q.x, q.y]); }
      g.save(); g.globalAlpha = 0.5; fillPoly(g, pts, '#a7f3d0'); g.restore();   // a light tint: both solid hands read through it
      g.save(); g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.clip();   // printed: halftone dots in the wedge
      g.globalAlpha = 0.45; const dstep = 9; g.fillStyle = PAL.emerald; for (let yy = 0; yy < ctx.DH; yy += dstep) for (let xx = (yy / dstep) % 2 ? dstep / 2 : 0; xx < ctx.DW; xx += dstep) { if (Math.hypot(xx - P[0], yy - P[1]) > 400) continue; g.beginPath(); g.arc(xx, yy, 2.2, 0, TAU); g.fill(); }
      g.restore();
      pen(g, pts.slice(1), 5, INK, { r, taper: [0, 0], smoothN: 1 });   // the rim arc only
    }
    const click = (on, fStop, a, col) => { if (!on) return; const q = hp(a, 0.7); const u = pxu(ctx, T.tower.head.getWorldPosition(V(0, 0, 0)).toArray());
      const age = F - fStop; if (age < 0 || age > 6) return; const k = ob(age / 3) * (1 - sm((age - 4) / 2)), R0 = u * 0.1, R1 = u * (0.1 + 0.2 * k);
      for (let n = 0; n < 8; n++) { const an = n / 8 * TAU + 0.2; pen(g, [[q.x + Math.cos(an) * R0, q.y + Math.sin(an) * R0], [q.x + Math.cos(an) * R1, q.y + Math.sin(an) * R1]], Math.max(3, u * 0.03), n % 2 ? INK : col, { r, taper: [0.1, 0.6] }); } };
    const fE = K.watch[0] + 1 + Math.ceil(3 / 7 * (K.watch[1] - 6 - K.watch[0])), fC = K.watch[0] + 1 + Math.ceil(6 / 7 * (K.watch[1] - 6 - K.watch[0]));
    click(W.stopE, fE, W.emerald, PAL.emerald); click(W.stopC, fC, W.coral, PAL.coral);
  }
  if (Q.get('dbg')) { g.fillStyle = '#000'; g.fillRect(0, 0, 170, 40); g.fillStyle = '#fff'; g.font = '28px monospace'; g.fillText('f' + F, 10, 30); }
}
