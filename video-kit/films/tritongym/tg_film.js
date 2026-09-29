// tg_film.js - "TritonGym: The Loop" (see STORYBOARD.md). World build + per-frame update + npr extras + marks.
import { createNPR } from './npr/npr.js';
import { bakeBrushTexture } from './npr/brush.js';
import { orbit, handheld, applyRig } from './npr/camera.js';
import { cachedBake, INK, TAU } from './tg_paint.js';
import { ARENA, canvasTex, paintFloor, paintPlanks, buildCard, buildStands } from './tg_world.js';
import { lerp, clamp } from './tg_time.js';
import { buildLLM, buildKern, buildOro } from './tg_cast.js';
import { buildGate2, buildScale, buildTorchy, buildFinish, buildBench, buildDash } from './tg_props.js';
import { comicWord } from './tg_letter.js';

export const NF = 600;
const Q = new URLSearchParams(location.search);
export const PAPER = { tone: '#f4ebd6', grain: 0.04, fibres: 0.05, blotch: 0.06, seed: 4 };

export const LOOK = {
  extends: 'comic',
  hatchCut: 0.22, crossT: 0.62, crossW: 1.0, hatchPx: 7.5, hatchW: 1.5, hatchWobble: 0.08, hatchSwell: 0.35,
  htAmt: 0.55, htPx: 14, htT: 0.3, htRange: 0.5, misreg: [2.6, -2.0],
  lineW: 2.0, lineWShadow: 3.2, hullW: 3.1, hullShadowW: 1.5,
  bleed: 1.6, edgeDark: 0.45, gran: 0.3, flocc: 0.06, dryEdge: 0.2, sat: 1.12,
  rule: 0.17, rulePx: 10, ruleTop: 0.3, ruleBot: 0.04, bgDots: [0.95, 0.6, 0.42, 0.28],
  dofMax: 3.5, dofRange: 3.0, grain: 0.018, vignette: 0.16,
  atmos: 0.22, atmosStart: 14, atmosEnd: 34, atmosCol: [0.95, 0.92, 0.84], inkFar: 0.7, hatchFar: 0.5, htFar: 0.5,
  ...(Q.get('lk') ? JSON.parse(Q.get('lk')) : {}),
};

// station angles on the ring (radians, measured from +x towards +z)
export const A = { bench: 0.0, gate: 1.3, scale: 2.55, start: 3.7, finish: 5.3 };

let T = null;
const V = (x, y, z) => new T.THREE.Vector3(x, y, z);
export const polar = (a, r, y = 0) => [Math.cos(a) * r, y, Math.sin(a) * r];

export async function buildWorld(ctx, { THREE, renderer }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, ctx.W / ctx.H, 0.4, 90);
  const npr = createNPR(renderer, ctx, { look: LOOK, paper: ctx.paper(PAPER), samples: 4 });
  npr.setUnder(window.__pv.canvas);
  npr.setLight({ dir: [-0.45, 0.85, 0.5], target: [0, 0, 0], size: 13, dist: 30 });
  npr.debug = Number(Q.get('debug') || 0);
  T = { THREE, scene, camera, npr };
  // surfaces: options with a `key` share one material (and one surface id: npr has 253 of them)
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
  T.add = add;

  // ---- the arena: a raised emerald circuit board (painted top view: PCB + ring track) on a wooden gym floor
  const floorTex = canvasTex(THREE, 4096, 4096, (g, w, h) => paintFloor(g, w, h, { startA: A.start, finishA: A.finish }));
  const F = ARENA.floor, BR = 8.6;   // board radius (a rounded-square board would read as a card; a disc reads as an arena)
  const boardTop = new THREE.CircleGeometry(BR, 128);
  { const uv = boardTop.attributes.uv, pos = boardTop.attributes.position; for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + F) / (2 * F), (pos.getY(i) + F) / (2 * F)); }
  add(boardTop, { color: 0x0a9a6c, map: floorTex, hatchDir: [1, 0, 0.3], noiseScale: 0.4, spec: 0.1 }, { cast: false }, [0, 0.0, 0], [-Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(BR, BR + 0.05, 0.32, 128, 1, true), { color: 0x04684a, hatchDir: [0, 1, 0], side: THREE.DoubleSide }, { outline: 1, cast: false }, [0, -0.16, 0]);
  const plankTex = canvasTex(THREE, 2048, 2048, (g, w, h) => paintPlanks(g, w, h), { wrap: true, repeat: [3, 3] });
  add(new THREE.PlaneGeometry(80, 80), { color: 0xe0a15a, map: plankTex, hatchDir: [1, 0, 0.3], spec: 0.2 }, { cast: false }, [0, -0.32, 0], [-Math.PI / 2, 0, 0]);
  T.stands = buildStands(THREE, add, scene);

  // ---- the graphics card in the infield
  T.card = buildCard(THREE, add, scene);

  // ---- stations (station frame: +x = travel direction, +z = inward, -z = outward towards the camera)
  const station = (a, r) => { const g = new THREE.Group(); g.position.set(...polar(a, r)); g.rotation.y = -a - Math.PI / 2; scene.add(g); return g; };
  T.stGate = station(A.gate, ARENA.R); T.gate = buildGate2(THREE, add, T.stGate, { lanes: [-0.55, 0.55] });
  T.stScale = station(A.scale, 8.35); T.scale = buildScale(THREE, add, T.stScale, { span: 0.9 });
  T.scale.root.rotation.y = 0; T.scale.pans.forEach((P) => { P.g.position.set(P.side * T.scale.span, 1.05, 0); P.rods.forEach((m) => { m.scale.y = 0.62; }); });
  T.torchy = buildTorchy(THREE, add, T.scale.pans[1].g); T.torchy.root.position.y = 0.04; T.torchy.root.scale.setScalar(0.85);
  const bannerTex = canvasTex(THREE, 2048, 440, (g, w, h) => {
    g.fillStyle = '#fff4dc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#059669'; g.fillRect(0, 0, w, 34); g.fillRect(0, h - 34, w, 34);
    comicWord(g, 'TRITONGYM', w / 2, h / 2 + 8, 230, { fill: '#10b981', shade: '#047857', rot: -0.03, track: 0.16, fan: 0.06 });
  });
  T.stFinish = station(A.finish, ARENA.R); T.finish = buildFinish(THREE, add, T.stFinish, { span: 2.9, bannerTex });
  T.finish.watch.rotation.y = Math.PI / 2;
  T.stBench = station(A.bench, 8.4); T.bench = buildBench(THREE, add, T.stBench); T.bench.root.rotation.y = Math.PI;
  T.stStart = station(A.start, ARENA.R);
  // ---- cast
  T.tok = buildLLM(THREE, add, scene, {});
  T.kern = buildKern(THREE, add, scene, {});
  T.oro = buildOro(THREE, add, scene, {});
  T.dash = buildDash(THREE, add, scene);
  const put = (o, a, r, yaw = 0) => { o.root.position.set(...polar(a, r)); o.root.rotation.y = -a - Math.PI / 2 + yaw; };
  put(T.tok, A.bench + 0.06, 7.7, Math.PI);
  put(T.kern, A.start, ARENA.lanes[0]);
  put(T.oro, A.start, ARENA.lanes[1]);
  put(T.dash, A.gate - 0.12, ARENA.lanes[1]);

  // ---- painted cyclorama
  const bdTex = await cachedBake(THREE, bakeBrushTexture, { width: 4096, height: 1024, seed: 21, key: 'tgbackdrop', background: '#ffffff' }, (p, brush, w, h) => {
    const cx = w * 0.5, cy = h * 0.66;
    brush.noStroke();
    const n = 48;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = a0 + Math.PI * 2 / n * 0.5;
      brush.fill('#b9b9b9', 200); brush.fillBleed(0.03); brush.fillTexture(0.35, 0.3);
      brush.polygon([[cx, cy], [cx + Math.cos(a0) * 3200, cy + Math.sin(a0) * 1500], [cx + Math.cos(a1) * 3200, cy + Math.sin(a1) * 1500]]);
    }
  });
  T.backdrop = npr.backdrop(bdTex, { radius: 30, height: 30, y: -6, arc: [0, TAU], color: 0xf6d9a4 });
  scene.add(T.backdrop);
  return { scene, camera };
}

// ------------------------------------------------------------------------------------------------
// per frame
// ------------------------------------------------------------------------------------------------
function camRig(F) {
  if (Q.get('cam')) { const c = Q.get('cam').split(',').map(Number); return { tg: [c[3] || 0, c[4] || 0, c[5] || 0], az: c[0], el: c[1], r: c[2], fov: c[6] || 32, roll: 0 }; }
  const t = F / NF;
  return { tg: [0, 0.6, 0], az: t * TAU, el: 0.35, r: 14, fov: 32, roll: 0 };
}

export function updateWorld(ctx) {
  const F = ctx.iw;
  const rg = camRig(F);
  applyRig(T.camera, orbit({ target: rg.tg, radius: rg.r, az: rg.az, el: rg.el, fov: rg.fov, roll: rg.roll }));
  ctx.camera = T.camera;
  T.card.fans.forEach((f, i) => { f.rotation.y = (F / NF) * TAU * 30 * (i % 2 ? -1 : 1); });
}

export function drawNPR(ctx) {
  const { npr, camera } = T;
  npr.frame(ctx);
  npr.focusOn(camera, V(0, 0.5, 0), 6);
  npr.render(T.scene, camera);
}

export function drawInk(ctx, brush) { }

export function drawMarks(ctx, g) {
  if (Q.get('dbg')) { g.fillStyle = '#000'; g.fillRect(0, 0, 150, 40); g.fillStyle = '#fff'; g.font = '28px monospace'; g.fillText('f' + ctx.iw, 10, 30); }
}
