// tg_cast.js - the cast, built from primitives (spheres, capsules, extrusions) + painted face textures.
// Each builder returns a rig object: { root, parts..., faces } that the per-frame pose functions drive.
import { faceSet, INK, TAU } from './tg_paint.js';

/** Speech-balloon silhouette as a 2D shape (an ellipse with a tail at bottom-left). */
function balloonShape(THREE, rx = 0.62, ry = 0.5, tail = [-0.2, -0.78]) {
  const s = new THREE.Shape();
  const n = 48, a0 = -Math.PI / 2 - 0.55, a1 = -Math.PI / 2 - 0.08;
  // start after the tail's right root, go round, end at its left root, then the tail
  for (let i = 0; i <= n; i++) {
    const a = a1 + (i / n) * (TAU - (a1 - a0));
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.quadraticCurveTo(tail[0] - 0.02, tail[1] + 0.2, tail[0], tail[1]);
  s.quadraticCurveTo(tail[0] + 0.14, tail[1] + 0.26, Math.cos(a1) * rx, Math.sin(a1) * ry);
  return s;
}

/**
 * The LLM (the athlete being benchmarked): a talking speech balloon with arms, legs and sneakers.
 * col: body colour, accent: sweatband / shoes.
 */
export function buildLLM(THREE, add, parent, { col = 0xfff4dc, accent = 0x059669, seed = 1 } = {}) {
  const R = { root: new THREE.Group() }; parent.add(R.root);
  R.hips = new THREE.Group(); R.root.add(R.hips);
  R.body = new THREE.Group(); R.body.position.y = 0.98; R.hips.add(R.body);
  // a flat-ish speech balloon (thin extrusion, soft bevel) so it reads as a balloon from 3/4 views too
  const geo = new THREE.ExtrudeGeometry(balloonShape(THREE), { depth: 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.11, bevelSegments: 5, curveSegments: 24, steps: 1 });
  geo.translate(0, 0.05, -0.1); geo.computeVertexNormals();
  R.faces = faceSet(THREE, {
    calm: { eyes: 'dot', mouth: 'smile' }, happy: { eyes: 'happy', mouth: 'open', blush: true }, think: { eyes: 'up', mouth: 'flat' },
    determined: { eyes: 'determined', mouth: 'flat' }, wide: { eyes: 'wide', mouth: 'o' }, squint: { eyes: 'squint', mouth: 'wobble' },
    worried: { eyes: 'worried', mouth: 'wobble', sweat: true }, star: { eyes: 'star', mouth: 'open', blush: true }, shut: { eyes: 'shut', mouth: 'grin' },
    gulp: { eyes: 'up', mouth: 'wobble', sweat: true }, speak: { eyes: 'dot', mouth: 'open' }, speak2: { eyes: 'dot', mouth: 'o' }, idea: { eyes: 'wide', mouth: 'open' },
  }, { w: 512, h: 512, base: '#ffffff', cx: 256, cy: 250, s: 1.25, seed });
  // planar UV on the front face: map x,y in [-0.75,0.75] to the face canvas
  const uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / 1.5, 0.5 + (pos.getY(i) - 0.02) / 1.5);
  R.bodyM = add(geo, { color: col, map: R.faces.calm[0], rim: 0.8, spec: 0, toneBias: 0.18, seed }, { outline: 1.1 }, [0, 0, 0], [0, 0, 0], R.body);
  // emerald sweatband round the top of the balloon (a tube hugging its outline, visible from every side)
  { const yb = 0.4, hw = 0.62 * Math.sqrt(1 - Math.pow((yb - 0.05) / 0.5, 2)) + 0.115, hd = 0.2;
    const pts = []; for (let k = 0; k < 48; k++) { const a = k / 48 * TAU; pts.push(new THREE.Vector3(Math.cos(a) * hw, yb, Math.sin(a) * hd)); }
    R.band = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, 0.055, 8, true), { color: accent, hatchMode: 'u', rim: 0.5, spec: 0 }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], R.body); }
  // arms (capsules on shoulder pivots) with round mitts
  const armGeo = new THREE.CapsuleGeometry(0.06, 0.34, 4, 10); armGeo.translate(0, -0.2, 0);
  R.arms = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(0.6 * s, 0.02, 0.02); R.body.add(g);
    add(armGeo, { key: 'tok-skin', color: col, rim: 0.6, spec: 0 }, { outline: 0.8 }, [0, 0, 0], [0, 0, 0], g);
    const hand = add(new THREE.SphereGeometry(0.1, 16, 12), { key: 'tok-skin', color: col, rim: 0.6, spec: 0 }, { outline: 0.8 }, [0, -0.42, 0], [0, 0, 0], g);
    return { g, hand };
  });
  // legs + sneakers
  const legGeo = new THREE.CapsuleGeometry(0.065, 0.26, 4, 10); legGeo.translate(0, -0.17, 0);
  R.legs = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(0.19 * s, 0.44, 0); R.hips.add(g);
    add(legGeo, { key: 'tok-skin', color: col, rim: 0.6, spec: 0 }, { outline: 0.8 }, [0, 0, 0], [0, 0, 0], g);
    const shoe = add(new THREE.SphereGeometry(0.13, 18, 12), { key: 'tok-shoe', color: accent, rim: 0.7, spec: 0 }, { outline: 0.8 }, [0, -0.37, 0.06], [0, 0, 0], g);
    shoe.scale.set(1.0, 0.62, 1.55);
    return { g, shoe };
  });
  return R;
}

/** A Triton kernel: a capsule sprinter with a trident crest. Ours is emerald, the oracle is gold. */
export function buildKernel(THREE, add, parent, { col = 0x10b981, crest = 0xfff4dc, seed = 5, oracle = false } = {}) {
  const K = { root: new THREE.Group() }; parent.add(K.root);
  K.hips = new THREE.Group(); K.root.add(K.hips);
  K.body = new THREE.Group(); K.body.position.y = 0.52; K.hips.add(K.body);
  K.faces = faceSet(THREE, oracle ? {
    smug: { eyes: 'smug', mouth: 'smile' }, wide: { eyes: 'wide', mouth: 'o' }, determined: { eyes: 'determined', mouth: 'flat' }, sad: { eyes: 'worried', mouth: 'wobble', sweat: true }, happy: { eyes: 'happy', mouth: 'grin' },
  } : {
    calm: { eyes: 'dot', mouth: 'smile' }, determined: { eyes: 'determined', mouth: 'teeth' }, wide: { eyes: 'wide', mouth: 'o' }, dizzy: { eyes: 'spiral', mouth: 'wobble' },
    happy: { eyes: 'happy', mouth: 'open', blush: true }, star: { eyes: 'star', mouth: 'open', blush: true }, nervous: { eyes: 'worried', mouth: 'wobble', sweat: true }, squint: { eyes: 'squint', mouth: 'teeth' },
  }, { w: 1024, h: 512, base: '#ffffff', s: 1.35, seed, spacing: 0.9 });
  const bodyGeo = new THREE.CapsuleGeometry(0.3, 0.34, 8, 24);
  K.bodyM = add(bodyGeo, { color: col, map: K.faces[oracle ? 'smug' : 'calm'][0], rim: 0.8, spec: 0.35, seed }, { outline: 1.05 }, [0, 0, 0], [0, 0, 0], K.body);
  // trident crest: three prongs on a little collar
  K.crest = new THREE.Group(); K.crest.position.y = 0.5; K.body.add(K.crest);
  const prong = new THREE.ConeGeometry(0.055, 0.26, 10); prong.translate(0, 0.13, 0);
  const shaft = new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8); shaft.translate(0, -0.02, 0);
  add(new THREE.TorusGeometry(0.13, 0.03, 8, 24, Math.PI), { color: crest, rim: 0.6 }, { outline: 0.6 }, [0, 0.06, 0], [0, 0, Math.PI], K.crest);
  for (const s of [-1, 0, 1]) add(prong, { color: crest, rim: 0.6 }, { outline: 0.6 }, [s * 0.13, s ? 0.06 : 0.1, 0], [0, 0, -s * 0.25], K.crest);
  add(shaft, { color: crest }, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], K.crest);
  const limb = new THREE.CapsuleGeometry(0.05, 0.22, 4, 8); limb.translate(0, -0.15, 0);
  K.arms = [-1, 1].map((s) => { const g = new THREE.Group(); g.position.set(0.31 * s, 0.05, 0); K.body.add(g); add(limb, { color: col, rim: 0.6 }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], g); add(new THREE.SphereGeometry(0.075, 12, 10), { color: crest }, { outline: 0.6 }, [0, -0.3, 0], [0, 0, 0], g); return g; });
  K.legs = [-1, 1].map((s) => { const g = new THREE.Group(); g.position.set(0.14 * s, 0.26, 0); K.hips.add(g); add(limb, { color: col, rim: 0.6 }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], g); const f = add(new THREE.SphereGeometry(0.09, 14, 10), { color: oracle ? 0x7a3b1f : INK === '' ? 0 : 0x2b2447 }, { outline: 0.6 }, [0, -0.26, 0.05], [0, 0, 0], g); f.scale.set(1, 0.6, 1.5); return g; });
  if (oracle) {   // champion's laurel + sash
    const laurel = new THREE.Group(); laurel.position.set(0, 0.36, 0); K.body.add(laurel);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; const leaf = add(new THREE.SphereGeometry(0.07, 10, 8), { color: 0x6bbf59, rim: 0.5 }, { outline: 0.5 }, [Math.cos(a) * 0.29, 0, Math.sin(a) * 0.29], [0, -a, 0.6], laurel); leaf.scale.set(1.6, 0.5, 0.8); }
    K.sash = add(new THREE.TorusGeometry(0.33, 0.045, 8, 32), { color: 0xef4b5f, rim: 0.5 }, { outline: 0.6 }, [0, -0.05, 0], [0.4, 0, 0.7], K.body);
  }
  return K;
}

// ------------------------------------------------------------------------------------------------
// racers (kernels): forward = +x in the racer's local frame
// ------------------------------------------------------------------------------------------------
/** A token tile texture: one real Triton / Python punctuation glyph, fat, in ink on cream (no braces, no semicolons:
 *  Triton is a Python DSL; '@' is the @triton.jit decorator). The last one (':') is the crooked cowlick. */
export const TOKEN_GLYPHS = ['@', '(', ')', '[', ']', '*', '+', '=', ':'];
export function tokenTexture(THREE, k, { base = '#fff4dc', ink = '#1a1530' } = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 26;
  const ch = TOKEN_GLYPHS[k % TOKEN_GLYPHS.length];
  g.beginPath();
  if (ch === '@') { g.beginPath(); g.arc(128, 132, 34, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(162, 100); g.lineTo(162, 150); g.quadraticCurveTo(164, 178, 188, 176); g.quadraticCurveTo(214, 170, 212, 128); g.arc(128, 128, 84, 0, -Math.PI * 1.72, true); g.stroke(); }
  if (ch === '[' || ch === ']') { g.save(); if (ch === ']') { g.translate(256, 0); g.scale(-1, 1); } g.moveTo(156, 50); g.lineTo(104, 50); g.lineTo(104, 206); g.lineTo(156, 206); g.stroke(); g.restore(); }
  if (ch === '{' || ch === '}') { g.save(); if (ch === '}') { g.translate(256, 0); g.scale(-1, 1); } g.moveTo(158, 48); g.quadraticCurveTo(104, 52, 112, 98); g.quadraticCurveTo(118, 124, 86, 128); g.quadraticCurveTo(118, 132, 112, 158); g.quadraticCurveTo(104, 204, 158, 208); g.stroke(); g.restore(); }
  if (ch === '(' || ch === ')') { g.save(); if (ch === ')') { g.translate(256, 0); g.scale(-1, 1); } g.moveTo(150, 44); g.quadraticCurveTo(80, 128, 150, 212); g.stroke(); g.restore(); }
  if (ch === '=') { g.moveTo(70, 100); g.lineTo(186, 100); g.moveTo(70, 156); g.lineTo(186, 156); g.stroke(); }
  if (ch === '+') { g.moveTo(128, 64); g.lineTo(128, 192); g.moveTo(64, 128); g.lineTo(192, 128); g.stroke(); }
  if (ch === '*') { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3 + Math.PI / 2; g.moveTo(128 - Math.cos(a) * 62, 128 - Math.sin(a) * 62); g.lineTo(128 + Math.cos(a) * 62, 128 + Math.sin(a) * 62); } g.stroke(); }
  if (ch === ';' || ch === ':') { g.beginPath(); g.arc(128, 84, 20, 0, Math.PI * 2); g.fill(); g.beginPath(); if (ch === ';') { g.arc(128, 160, 20, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(138, 166); g.quadraticCurveTo(134, 200, 108, 214); g.stroke(); } else { g.arc(128, 172, 20, 0, Math.PI * 2); g.fill(); } }
  g.lineWidth = 10; g.strokeStyle = 'rgba(26,21,48,0.45)'; g.strokeRect(8, 8, 240, 240);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
}

/** rounded token tile geometry of side s */
export function tokenGeo(THREE, s) {
  const tile = new THREE.BoxGeometry(s, s, s, 3, 3, 3);
  const p = tile.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); const sp = v.clone().normalize().multiplyScalar(s * 0.72); v.lerp(sp, 0.3); p.setXYZ(i, v.x, v.y, v.z); }
  tile.computeVertexNormals();
  return tile;
}

/**
 * Kern, the generated Triton kernel: a low soapbox racer assembled from the LLM's tokens (8 fat code-punctuation tiles:
 * 6 on the floor, 1 hump, 1 nose with the face) + the crooked cowlick token (the compile bug). Tiles are cream source
 * until compiled, then emerald (the glyph stays). Square wheels (first draft) or round ones (refined), visible axles,
 * a wind-up key.
 */
export const KERN_SLOTS = [
  [0.28, 0, -0.15], [0.28, 0, 0.15], [0.0, 0, -0.15], [0.0, 0, 0.15], [-0.28, 0, -0.15], [-0.28, 0, 0.15],   // floor
  [-0.2, 0.27, 0],                                                                                          // hump
  [0.54, 0.06, 0],                                                                                          // nose (face)
];
export function buildKern(THREE, add, parent, { seed = 7, scale = 1.0 } = {}) {
  const K = { root: new THREE.Group() }; parent.add(K.root);
  K.body = new THREE.Group(); K.body.position.y = 0.3 * scale; K.body.scale.setScalar(scale); K.root.add(K.body);
  K.tex = TOKEN_GLYPHS.map((_, i) => tokenTexture(THREE, i));
  K.texCmp = TOKEN_GLYPHS.map((_, i) => tokenTexture(THREE, i, { base: '#34d399' }));
  const tile = tokenGeo(THREE, 0.28);
  K.tiles = [];
  KERN_SLOTS.slice(0, 7).forEach((p, n) => {
    const g = new THREE.Group(); g.position.set(...p); K.body.add(g);
    const m = add(tile, { color: 0xffffff, map: K.tex[n], rim: 0.6, spec: 0, toneBias: 0.12, seed: seed + n }, { outline: 0.6 }, [0, 0, 0], [0, 0, 0], g);
    K.tiles.push({ g, m, home: p, n });
  });
  // nose block with the face (headlight eyes)
  K.faces = faceSet(THREE, {
    calm: { eyes: 'dot', mouth: 'smile' }, wide: { eyes: 'wide', mouth: 'o' }, dizzy: { eyes: 'spiral', mouth: 'wobble' }, determined: { eyes: 'determined', mouth: 'teeth' },
    happy: { eyes: 'happy', mouth: 'open', blush: true }, nervous: { eyes: 'worried', mouth: 'wobble', sweat: true }, star: { eyes: 'star', mouth: 'grin', blush: true }, squint: { eyes: 'squint', mouth: 'teeth' }, shut: { eyes: 'shut', mouth: 'flat' },
  }, { w: 512, h: 512, base: '#ffffff', cx: 256, cy: 232, s: 1.35, seed, spacing: 1.05, mouthY: 72 });
  const noseGeo = new THREE.BoxGeometry(0.22, 0.4, 0.46, 2, 3, 3);
  { const p = noseGeo.attributes.position, uv = noseGeo.attributes.uv, nr = noseGeo.attributes.normal; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); if (nr.getX(i) > 0.5) uv.setXY(i, 0.5 - p.getZ(i) / 0.46, 0.5 + p.getY(i) / 0.4); else uv.setXY(i, 0.03, 0.97); const sp = v.clone().normalize().multiplyScalar(0.26); v.lerp(sp, 0.18); p.setXYZ(i, v.x, v.y, v.z); } noseGeo.computeVertexNormals(); }
  K.noseG = new THREE.Group(); K.noseG.position.set(...KERN_SLOTS[7]); K.body.add(K.noseG);
  K.nose = add(noseGeo, { color: 0xfff4dc, map: K.faces.calm[0], rim: 0.6, spec: 0, toneBias: 0.2, seed: seed + 20 }, { outline: 0.75 }, [0, 0, 0], [0, 0, 0], K.noseG);
  // the crooked cowlick token (compile bug)
  K.cowlick = new THREE.Group(); K.cowlick.position.set(0.1, 0.25, 0.02); K.body.add(K.cowlick);
  K.cowM = add(tokenGeo(THREE, 0.2), { color: 0xffffff, map: tokenTexture(THREE, 8, { base: '#ffe3d6' }), rim: 0.6 }, { outline: 0.6 }, [0, 0.09, 0], [0, 0, 0], K.cowlick);
  // pointed nose cone token (added by the refinement)
  K.cone = new THREE.Group(); K.cone.position.set(0.74, -0.08, 0); K.body.add(K.cone);     // under the eyes, like a snout
  K.coneM = add(new THREE.ConeGeometry(0.15, 0.32, 4, 1), { color: 0xfff4dc, rim: 0.6, spec: 0 }, { outline: 0.65 }, [0, 0, 0], [Math.PI / 4, 0, -Math.PI / 2], K.cone);
  // wind-up key on the back
  K.key = new THREE.Group(); K.key.position.set(-0.44, 0.27, 0); K.body.add(K.key);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), { key: 'keyshaft', color: 0xf2b134 }, { outline: 0.4 }, [-0.08, 0, 0], [0, 0, Math.PI / 2], K.key);
  K.keyBow = new THREE.Group(); K.keyBow.position.x = -0.24; K.key.add(K.keyBow);
  const bow = add(new THREE.TorusGeometry(0.11, 0.038, 8, 20), { key: 'keybow', color: 0xf2b134, hatchMode: 'u', rim: 0.6 }, { outline: 0.5 }, [0, 0, 0], [0, Math.PI / 2, 0], K.keyBow);
  bow.scale.set(1, 1.35, 1);
  // axles + wheels (square cubes, round discs), outboard
  K.wheelsSq = []; K.wheelsRd = [];
  const cube = new THREE.BoxGeometry(0.3, 0.3, 0.11);
  const disc = new THREE.CylinderGeometry(0.16, 0.16, 0.1, 24); disc.rotateX(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12); hub.rotateX(Math.PI / 2);
  for (const x of [-0.28, 0.3]) add(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8).rotateX(Math.PI / 2), { key: 'axle', color: 0x3b3558 }, { outline: 0.3, cast: false }, [x, -0.14, 0], [0, 0, 0], K.body);
  for (const [x, z] of [[-0.28, -0.34], [0.3, -0.34], [-0.28, 0.34], [0.3, 0.34]]) {
    const gs = new THREE.Group(); gs.position.set(x, -0.14, z); K.body.add(gs);
    gs.userData.cube = add(cube, { key: 'wheel-sq', color: 0x0b5e46, rim: 0.6, spec: 0 }, { outline: 0.6 }, [0, 0, 0], [0, 0, 0], gs);
    add(hub, { key: 'hub', color: 0xfff4dc }, { outline: 0.35 }, [0, 0, 0], [0, 0, 0], gs);
    K.wheelsSq.push(gs);
    const gr = new THREE.Group(); gr.position.set(x, -0.14, z); K.body.add(gr);
    gr.userData.disc = add(disc, { key: 'wheel-rd', color: 0x0b5e46, rim: 0.6, spec: 0 }, { outline: 0.6 }, [0, 0, 0], [0, 0, 0], gr);
    add(hub, { key: 'hub', color: 0xfff4dc }, { outline: 0.35 }, [0, 0, 0], [0, 0, 0], gr);
    // a spoke mark so the rotation reads
    add(new THREE.BoxGeometry(0.26, 0.035, 0.11), { key: 'spoke-rd', color: 0xfff4dc }, { outline: 0.2, cast: false }, [0, 0, 0], [0, 0, 0], gr);
    gr.visible = false;
    K.wheelsRd.push(gr);
  }
  K.scale = scale;
  return K;
}

/** Oro, the hand-tuned oracle kernel: a long coral dart racer, cone nose, tail fin, spoked wheels, gold laurel, tuning knobs. */
export function buildOro(THREE, add, parent, { seed = 11 } = {}) {
  const O = { root: new THREE.Group() }; parent.add(O.root);
  O.body = new THREE.Group(); O.body.position.y = 0.3; O.root.add(O.body);
  O.faces = faceSet(THREE, {
    smug: { eyes: 'smug', mouth: 'smile' }, wide: { eyes: 'wide', mouth: 'o' }, determined: { eyes: 'determined', mouth: 'teeth' },
    sweat: { eyes: 'worried', mouth: 'wobble', sweat: true }, shut: { eyes: 'shut', mouth: 'teeth' }, nod: { eyes: 'happy', mouth: 'smile' },
  }, { w: 1024, h: 512, base: '#ef4b5f', s: 1.25, seed, spacing: 0.95, mouthY: 60 });
  const bodyGeo = new THREE.CapsuleGeometry(0.22, 0.9, 8, 24); bodyGeo.rotateZ(-Math.PI / 2);
  // face texture on the front hemisphere: sphere-like uv around +x
  { const p = bodyGeo.attributes.position, uv = bodyGeo.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (x > 0.25) { const lon = Math.atan2(-z, x - 0.25), lat = Math.atan2(y, Math.hypot(x - 0.25, z)); uv.setXY(i, 0.25 + lon / (2 * Math.PI), 0.5 + lat / Math.PI); } else uv.setXY(i, 0.75, 0.5); } }
  O.bodyM = add(bodyGeo, { color: 0xffffff, map: O.faces.smug[0], rim: 0.8, spec: 0, toneBias: 0.1, seed }, { outline: 1.0 }, [0, 0.02, 0], [0, 0, 0], O.body);
  O.body.scale.set(1, 0.9, 1);
  O.nose = add(new THREE.ConeGeometry(0.12, 0.3, 16), { key: 'oro-nose', color: 0xfff4dc, rim: 0.6 }, { outline: 0.6 }, [0.82, 0.0, 0], [0, 0, -Math.PI / 2], O.body);
  add(new THREE.BoxGeometry(0.24, 0.26, 0.04), { key: 'oro-fin', color: 0xef4b5f, rim: 0.6 }, { outline: 0.6 }, [-0.62, 0.28, 0], [0, 0, 0.35], O.body);
  // tuning knobs along the flank (hand-tuned)
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8).rotateX(Math.PI / 2), { key: 'knob', color: 0xf2b134 }, { outline: 0.3 }, [-0.3 + k * 0.17, 0.06, s * 0.23], [0, 0, 0], O.body);
  // wind-up key + gold laurel ring around it
  O.key = new THREE.Group(); O.key.position.set(-0.2, 0.25, 0); O.body.add(O.key);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), { key: 'keyshaft', color: 0xf2b134 }, { outline: 0.4 }, [0, 0.08, 0], [0, 0, 0], O.key);
  const bow = add(new THREE.TorusGeometry(0.09, 0.03, 8, 20), { key: 'keybow', color: 0xf2b134, hatchMode: 'u', rim: 0.6 }, { outline: 0.5 }, [0, 0.24, 0], [0, 0, 0], O.key); bow.scale.set(1.35, 1, 1);
  O.laurel = new THREE.Group(); O.laurel.position.set(-0.2, 0.2, 0); O.body.add(O.laurel);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; const leaf = add(new THREE.SphereGeometry(0.05, 10, 8), { key: 'leaf', color: 0xf2c14b, rim: 0.5 }, { outline: 0.4 }, [Math.cos(a) * 0.19, 0, Math.sin(a) * 0.19], [0, -a, 0.6], O.laurel); leaf.scale.set(1.7, 0.55, 0.8); }
  // spoked wheels
  O.wheels = [];
  for (const [x, z] of [[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]]) {
    const g = new THREE.Group(); g.position.set(x, -0.16, z); O.body.add(g);
    add(new THREE.TorusGeometry(0.1, 0.035, 10, 24), { key: 'tyre', color: 0x2b2447 }, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], g);
    for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.2, 0.018, 0.018), { key: 'spoke', color: 0xf2b134 }, { outline: 0.25, cast: false }, [0, 0, 0], [0, 0, k * Math.PI / 3], g);
    O.wheels.push(g);
  }
  return O;
}
