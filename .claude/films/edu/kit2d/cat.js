// kit2d/cat.js - the lab cat as a felt puppet for the paper theatre: a white fluffy cat in a red felt beret. One piece
// of felt per body part (tail, body, haunches, chest ruff, paws, ears, head, beret), cut with a slightly wobbly hand,
// fuzz on every edge, thread stitches inset along the seams, glossy safety-bead eyes under white felt lids (so the
// lids carry the expression: the brand cat's sleepy half-lid, wide when curious), an embroidered mouth, dry-brushed
// blush, thread whiskers. The pieces are baked once; per frame only the rig moves: head tilt about the neck, lids,
// look, blink, breathing, and stop-motion replacement jitter on twos (12 drawings a second).
//
// The rig pattern (pose parameters, blinkAt, per-step jitter from a hash of (id, step), baked parts + drop shadows)
// follows the Clawd felt puppet in ledbetterljoshua/bohemian-tokenry-video, video/styles/papertheater/kit.js (MIT, see
// THIRD_PARTY.md). The cat itself is new.
//
//   const CAT = bakeCat()
//   felCat(K, z, CAT, { x, y, s, tilt, look: [lx, ly], lid, brows, blink, id, mouth })
// Body-local units: origin between the feet on the floor, up is negative; the cat is ~330 units tall with the beret.

import { PI, TAU, cl, mix, h2, hs, rngFrom, step, twos, textures, ellipseP, polarP, rrect, densify, wobble, toPath, bbox, spline, cspline, taper,
  inset, runWhere, cut, fuzz, nap, stitch, thread, bake, spr, shade, imageSprite } from './material.js';

const WHITE = '#f7f4ef', WHITE2 = '#fcf9f4', SHADE = '#efebe5', PINK = '#f3aab4', NOSE = '#ee8796', BERET = '#c3222f', THREAD = '#d9d3ca';
export const CAT_PIVOT = [0, -170];   // the neck: the head turns about it
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
const sym = (half) => [...half, ...mirror(half).reverse()];

// outlines (body-local)
const BODY = spline([[0, -178], [34, -174], [56, -146], [70, -96], [82, -44], [80, -10], [50, 2], [0, 4], [-50, 2], [-80, -10], [-82, -44], [-70, -96], [-56, -146], [-34, -174]], 8);
const HAUNCH = (s) => spline([[s * 30, -70], [s * 62, -78], [s * 88, -50], [s * 90, -14], [s * 70, 2], [s * 36, 0], [s * 24, -30]], 8);
const RUFF = (() => { const p = [[-44, -178], [44, -178], [54, -152], [52, -128]]; const lobes = [[40, 12], [16, 13], [-8, 13], [-32, 12]];
  for (const [cx, r] of lobes) { const by = -112 - Math.abs(cx + 4) * .22; for (let i = 0; i <= 8; i++) { const a = (i / 8) * PI; p.push([cx + 12 - (1 - Math.cos(a)) * 12 * (r / 12), by + Math.sin(a) * r * .95]); } }
  p.push([-52, -128], [-54, -152]); return cspline(p, 3); })();
const PAW = (s) => wobbleFree(rrect(s > 0 ? 6 : -48, -30, 42, 33, 15, 2));
const TAIL = taper([[50, -16], [104, -10], [146, -36], [164, -92], [154, -148], [126, -184], [100, -192]], [30, 38, 44, 46, 44, 36, 24], 8);
const HEAD = cspline(sym([[0, -334], [42, -330], [78, -313], [100, -286], [108, -258], [113, -236], [106, -227], [109, -212], [97, -203], [84, -187], [48, -173], [0, -169]]).slice(0, -1), 6);
const EAR = (s) => spline([[s * 102, -270], [s * 104, -316], [s * 96, -362], [s * 86, -372], [s * 72, -352], [s * 46, -326]], 6, false).concat([[s * 70, -290]]);
const EAR_IN = (s) => spline([[s * 92, -288], [s * 94, -326], [s * 88, -354], [s * 78, -346], [s * 60, -324]], 6, false).concat([[s * 74, -300]]);
const BERET_SHAPE = polarP(0, 0, 114, 60, (a) => (Math.sin(a) < 0 ? .94 + .1 * Math.sin(a * 2) ** 2 - .08 * Math.cos(a) : .38 + .06 * Math.cos(a)), 2);
const EYE = (cx, cy, w = 38, h = 33) => spline([[cx - w / 2, cy + 2], [cx - w / 4, cy - h / 2], [cx + w / 4, cy - h / 2 - 1], [cx + w / 2, cy - 1], [cx + w / 4, cy + h / 2], [cx - w / 4, cy + h / 2]], 8);
function wobbleFree(p) { return p; }

/** Bake the cat's felt pieces once. Returns the sprite table. */
export function bakeCat(o = {}) {
  const K = o.K ?? 2.4, sp = {};
  const b = (name, polys, fn, pad = 14) => { const bb = bbox(polys); sp[name] = bake({ x: bb.x0 - 6, y: bb.y0 - 6, w: bb.x1 - bb.x0 + 12, h: bb.y1 - bb.y0 + 12 }, { K, pad, blur: 6, seed: 'cat-' + name }, fn); };
  const r = rngFrom('cat');
  const white = { white: true, tex: .5, ts: 1.1, sh: 0, fuzz: 1.5, fuzzColor: '#ffffff', fuzzDensity: 7, fuzzAlpha: .4, halo: 'rgba(255,255,255,.55)', hi: .14, lo: .2, edge: 'rgba(255,255,255,.7)' };
  const seam = { color: 'rgba(214,207,198,.95)', w: 1.05, len: 3.6, gap: 3.2, shadow: 'rgba(90,80,80,.14)' };
  b('tail', [TAIL], (x) => { const P = wobble(TAIL, .8, r); cut(x, P, WHITE, { ...white, fuzz: 2, fuzzDensity: 9, lo: .26, haloW: 5 });
    nap(x, P, '#ffffff', 3, 5); stitch(x, inset(P, 6).slice(4, -4), { ...seam, closed: false }); });
  b('body', [BODY], (x) => { const P = wobble(BODY, .9, r); cut(x, P, WHITE, white); nap(x, P, '#ffffff', 3, 5);
    stitch(x, inset(P, 6), seam); });
  for (const s of [-1, 1]) b('haunch' + (s < 0 ? 'L' : 'R'), [HAUNCH(s)], (x) => { const P = wobble(HAUNCH(s), .7, r); cut(x, P, SHADE, { ...white, sh: .3, sb: 4, sx: s * -1.5, sy: 2.5, lo: .24 });
    stitch(x, inset(P, 5).slice(2, -2), { ...seam, closed: false }); });
  b('ruff', [RUFF], (x) => { const P = wobble(RUFF, .6, r); cut(x, P, WHITE2, { ...white, sh: .3, sb: 5, sx: 0, sy: 3.5, fuzz: 1.8, fuzzDensity: 8, hi: .2, lo: .1 }); nap(x, P, '#ffffff', 5, 6); });
  for (const s of [-1, 1]) b('paw' + (s < 0 ? 'L' : 'R'), [PAW(s)], (x) => { const P = wobble(PAW(s), .5, r); cut(x, P, WHITE2, { ...white, sh: .4, sb: 4, sx: 0, sy: 3, hi: .18, lo: .22 });
    const cx = s > 0 ? 27 : -27; for (const dx of [-7, 7]) thread(x, [[cx + dx, -9], [cx + dx * 1.05, 2]], { color: '#d4b8bc', w: 1.4, shadow: 'rgba(80,60,60,.2)', hi: false }); });
  for (const s of [-1, 1]) b('ear' + (s < 0 ? 'L' : 'R'), [EAR(s)], (x) => { const P = wobble(EAR(s), .6, r); cut(x, P, WHITE, { ...white });
    const I = wobble(EAR_IN(s), .5, r); cut(x, I, PINK, { felt: true, tex: .55, sh: .25, sb: 3, sx: 0, sy: 1.5, fuzz: 1.2, fuzzColor: '#ffd6dc', hi: .15, lo: .2, edge: false });
    fuzz(x, [I.slice(4, -6)], '#ffffff', 4, 2, .6); });
  b('head', [HEAD], (x) => { const P = wobble(HEAD, .8, r); cut(x, P, WHITE, { ...white, fuzz: 1.7, fuzzDensity: 8, hi: .16, lo: .14, haloW: 5 }); nap(x, P, '#ffffff', 3, 5);
    stitch(x, runWhere(inset(P, 6), (p) => p[1] < -196), { ...seam, closed: false }); });
  // a soft muzzle: a second, slightly creamier piece under the nose (its own sprite: it moves with the face)
  const MUZ = spline([[0, -238], [22, -236], [34, -220], [26, -204], [0, -200], [-26, -204], [-34, -220], [-22, -236]], 6);
  b('muzzle', [MUZ], (x) => { const M = wobble(MUZ, .5, r); cut(x, M, '#fffaf4', { white: true, tex: .45, ts: 1.1, sh: .2, sb: 4, sx: 0, sy: 2.2, fuzz: 1.4, fuzzColor: '#ffffff', fuzzAlpha: .5, hi: .1, lo: .12, edge: false }); });
  b('beret', [BERET_SHAPE, [[-30, -80], [30, 40]]], (x) => {
    const P = wobble(BERET_SHAPE, .9, r);
    cut(x, P, BERET, { felt: true, tex: .85, ts: 1.1, sh: 0, fuzz: 2.4, fuzzColor: '#e2434f', fuzzDensity: 4, hi: .22, lo: .38, edge: false });
    // the crown's shading: a lit dome, a darker underside band; a seam and the stalk
    x.save(); x.clip(toPath(P)); const g = x.createRadialGradient(-34, -34, 4, -14, -14, 130); g.addColorStop(0, 'rgba(255,165,155,.32)'); g.addColorStop(.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,0,6,.4)');
    x.fillStyle = g; x.fillRect(-130, -70, 260, 110);
    const lb = x.createLinearGradient(0, -6, 0, 24); lb.addColorStop(0, 'rgba(50,0,8,0)'); lb.addColorStop(1, 'rgba(50,0,8,.45)'); x.fillStyle = lb; x.fillRect(-130, -6, 260, 34); x.restore();
    const brim = runWhere(inset(P, 5), ([px, py]) => py > 2); stitch(x, brim.slice(2, -2), { closed: false, color: 'rgba(255,190,190,.85)', w: 1.25, len: 4, gap: 3.4, shadow: 'rgba(60,0,8,.35)' });
    thread(x, spline([[-78, -30], [-28, -48], [30, -46], [80, -24]], 8, false), { color: 'rgba(120,10,20,.55)', w: 1.2, shadow: false, hi: 'rgba(255,170,170,.25)' });
    const S = wobble(rrect(-6, -74, 11, 18, 4, 1.5), .4, r); cut(x, S, '#a51826', { felt: true, tex: .8, sh: .45, sb: 3, sx: 1, sy: 2, fuzz: 1.6, fuzzColor: '#d63845', hi: .2, lo: .3, edge: false });
  });
  // painted parts (Codex felt-cat sheet, keyed): o.art = { body|tail|beret|head|<face name>: { img, box: {x,y,w,h} } }.
  // A painted head carries its own face; extra heads are replacement faces picked with feltCat's `face` option.
  if (o.art) { sp.art = {}; for (const [k, v] of Object.entries(o.art)) sp.art[k] = imageSprite(v.img, v.box, { pad: 12, blur: 6 }); }
  // the white felt lid (drawn live over the eye bead) uses the white-felt tile
  sp.lidPattern = (x) => { const T = textures(); const P = x.createPattern(T.FELTW, 'repeat'); P.setTransform(new DOMMatrix().scale(1.1 / K)); return P; };
  return sp;
}

const blinkAt = (t, id) => { const per = 2.9 + hs(id * 3.1) * 1.6; return ((t + hs(id) * per) % per) < .14 ? 1 : 0; };

function eye(x, sp, cx, cy, o) {
  const lid = cl(o.lid), lk = o.look, E = EYE(cx, cy), hw = 19, hh = 16.5, P = toPath(E);
  // white felt backing (so the gaze reads), sunk a little into the face
  x.save(); x.shadowColor = 'rgba(60,40,30,.4)'; x.shadowBlur = 2.5; x.shadowOffsetY = 1.4; x.fillStyle = '#fdfaf3'; x.fill(P); x.restore();
  x.save(); x.clip(P);
  const sg = x.createRadialGradient(cx, cy + 3, 4, cx, cy, 22); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(120,100,90,.35)'); x.fillStyle = sg; x.fillRect(cx - 22, cy - 20, 44, 40);
  // the glass bead: amber iris, pupil, glints (on the bead, so they travel with it)
  const pr = o.pupil ?? 1, ix = cx + lk[0] * 7, iy = cy + 1 + lk[1] * 6.5;
  x.save(); x.shadowColor = 'rgba(40,20,10,.45)'; x.shadowBlur = 2; x.shadowOffsetY = 1.5;
  const g = x.createRadialGradient(ix - 3, iy - 4, 1, ix, iy, 13); g.addColorStop(0, '#e0a656'); g.addColorStop(.55, '#a8682c'); g.addColorStop(1, '#4e2a10');
  x.fillStyle = g; x.beginPath(); x.arc(ix, iy, 12.5, 0, TAU); x.fill(); x.restore();
  x.fillStyle = '#140c08'; x.beginPath(); x.ellipse(ix, iy + .5, 6.8 * pr, 7.6 * pr, 0, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,.96)'; x.beginPath(); x.ellipse(ix - 4.4, iy - 4.6, 3.4, 2.8, -.5, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(ix + 4.2, iy + 4.4, 1.5, 0, TAU); x.fill();
  // the white felt upper lid: its lower edge comes down with `lid` (0 = wide open, 1 = shut)
  const edgeY = mix(cy - hh - 1.5, cy + hh, lid), sag = mix(-2, 6, lid);
  const edge = Array.from({ length: 13 }, (_, i) => { const u = i / 12; return [cx + hw + 1 - (2 * hw + 2) * u, edgeY + sag * Math.sin(u * PI)]; });
  const lidP = [[cx - hw - 4, cy - hh - 8], [cx + hw + 4, cy - hh - 8], ...edge];
  x.save(); x.shadowColor = 'rgba(60,40,30,.35)'; x.shadowBlur = 2; x.shadowOffsetY = 1.2; x.fillStyle = WHITE; x.fill(toPath(lidP)); x.restore();
  x.fillStyle = sp.lidPattern(x); x.globalAlpha = .5; x.fill(toPath(lidP)); x.globalAlpha = 1;
  x.restore();
  // embroidered outline: the lower rim in fine brown thread, the lash line along the lid edge with an outer flick
  const s = cx < 0 ? -1 : 1;
  thread(x, runWhere(E, (p) => p[1] > cy - 2), { color: 'rgba(90,60,50,.75)', w: 1.1, shadow: false, hi: false });
  const lash = edge.slice(); const outer = s > 0 ? lash[0] : lash[lash.length - 1];
  if (s > 0) lash.unshift([outer[0] + 5, outer[1] - 5]); else lash.push([outer[0] - 5, outer[1] - 5]);
  thread(x, lash, { color: '#2b1b16', w: lid > .9 ? 2.4 : 2.1, shadow: 'rgba(30,10,5,.2)' });
}

/** Add the felt cat to a stage frame at depth z. See the header for options. */
export function feltCat(K, z, sp, o = {}) {
  const t = K.t, s = step(t), tc = twos(t), id = o.id ?? 7, S = o.s ?? 1, jit = o.jit ?? 1;
  const jx = (h2(id, s) - .5) * 2 * jit, jy = (h2(id + 9, s) - .5) * 1.6 * jit, jr = (h2(id + 3, s) - .5) * .012 * jit;
  const breathe = 1 + .012 * Math.sin(tc * TAU * .32 + id);
  const tilt = (o.tilt ?? 0) + (h2(id + 21, s) - .5) * .01 * jit, look = o.look ?? [0, 0];
  const lid = Math.max(o.lid ?? .45, o.blink ?? (o.noBlink ? 0 : blinkAt(tc, id)));
  const tailSw = (o.tail ?? 1) * .05 * Math.sin(tc * TAU * .45 + 1);
  K.add(z, (x) => {
    x.save(); x.translate(o.x ?? 0, o.y ?? 0); x.scale(S, S);
    // contact shadow on the boards
    const cs = x.createRadialGradient(0, 0, 4, 0, 0, 120); cs.addColorStop(0, 'rgba(10,4,2,.55)'); cs.addColorStop(1, 'rgba(10,4,2,0)');
    x.save(); x.scale(1, .13); x.fillStyle = cs; x.beginPath(); x.arc(4, 8, 120, 0, TAU); x.fill(); x.restore();
    x.translate(jx, jy); x.rotate(jr);
    const so = [7, 10], sa = .45;
    const A = sp.art || {};
    x.save(); x.translate(56, -16); x.rotate(tailSw); x.translate(-56, 16); spr(x, A.tail || sp.tail, 0, 0, { so, sa }); x.restore();
    if (A.body) { // painted body (paws and ruff included) and painted replacement heads
      x.save(); x.translate(0, 2); x.scale(1 / Math.sqrt(breathe), breathe); x.translate(0, -2); spr(x, A.body, 0, 0, { so, sa }); x.restore();
      const [px, py] = CAT_PIVOT; x.save(); x.translate(px, py - (breathe - 1) * 60); x.rotate(tilt); x.translate(-px, -py);
      const head = (lid > .9 && A.blink) || A[o.face] || A.head; if (head) spr(x, head, 0, 0, { so: [5, 9], sa: .45 });
      if (A.beret) spr(x, A.beret, 0, 0, { so: [5, 9], sa: .5 });
      x.restore(); x.restore(); return;
    }
    x.save(); x.translate(0, 2); x.scale(1 / Math.sqrt(breathe), breathe); x.translate(0, -2);
    spr(x, sp.body, 0, 0, { so, sa });
    spr(x, sp.haunchL, 0, 0, { so: [3, 5], sa: .35 }); spr(x, sp.haunchR, 0, 0, { so: [3, 5], sa: .35 });
    spr(x, sp.ruff, 0, 0, { so: [2, 6], sa: .3 });
    x.restore();
    spr(x, sp.pawL, 0, 0, { so: [2, 5], sa: .35 }); spr(x, sp.pawR, 0, 0, { so: [2, 5], sa: .35 });
    // the head, turned about the neck (and lifted a little with the breath)
    const [px, py] = CAT_PIVOT; x.save(); x.translate(px, py - (breathe - 1) * 60); x.rotate(tilt); x.translate(-px, -py);
    spr(x, sp.earL, 0, 0, { so: [4, 6], sa: .35 }); spr(x, sp.earR, 0, 0, { so: [4, 6], sa: .35 });
    spr(x, sp.head, 0, 0, { so: [5, 9], sa: .45 });
    // the face slides a little towards where the cat looks (a flat puppet's way of lifting its chin)
    const fx0 = look[0] * (o.faceShift ?? 4), fy0 = look[1] * (o.faceShift ?? 4) * 1.3; x.save(); x.translate(fx0, fy0);
    spr(x, sp.muzzle, 0, 0, { shadow: false });
    // dry-brushed blush
    for (const sx of [-1, 1]) { const bg = x.createRadialGradient(sx * 66, -220, 2, sx * 66, -220, 22); bg.addColorStop(0, 'rgba(244,140,150,.42)'); bg.addColorStop(1, 'rgba(244,140,150,0)'); x.fillStyle = bg; x.fillRect(sx * 66 - 24, -244, 48, 48); }
    // brows: two short thread strokes (raised = curious)
    const br = o.brows ?? 0;   // 0 rest, 1 raised (curious: the inner ends lift most)
    for (const sx of [-1, 1]) thread(x, spline([[sx * 25, -286 - br * 11], [sx * 38, -291 - br * 9], [sx * 51, -289 - br * 5]], 4, false), { color: '#cbb09e', w: 1.9, shadow: false, hi: false });
    eye(x, sp, -38, -252, { lid, look, pupil: o.pupil }); eye(x, sp, 38, -252, { lid, look, pupil: o.pupil });
    // nose (pink felt), mouth (embroidered), whiskers (thread)
    const N = spline([[0, -219], [9, -228], [6, -233], [0, -232], [-6, -233], [-9, -228]], 5);
    x.save(); x.shadowColor = 'rgba(80,20,30,.35)'; x.shadowBlur = 2; x.shadowOffsetY = 1.4; x.fillStyle = NOSE; x.fill(toPath(N)); x.restore();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(-3, -229.5, 2.6, 1.4, -.3, 0, TAU); x.fill();
    const m = o.mouth ?? 0;   // 0 the stitched smile, up to 1 a small round 'oh'
    thread(x, [[0, -219], [0, -213]], { color: '#9a6068', w: 1.6, shadow: false, hi: false });
    thread(x, spline([[-13, -212], [-6, -207], [0, -212]], 4, false), { color: '#9a6068', w: 1.6, shadow: false, hi: false });
    thread(x, spline([[0, -212], [6, -207], [13, -212]], 4, false), { color: '#9a6068', w: 1.6, shadow: false, hi: false });
    if (m > .05) { x.save(); x.shadowColor = 'rgba(60,10,20,.3)'; x.shadowBlur = 1.5; x.shadowOffsetY = 1; x.fillStyle = '#7d3442'; x.beginPath(); x.ellipse(0, -203 + m * 1.5, 3.6 + m * 2.4, 2.6 + m * 4, 0, 0, TAU); x.fill(); x.restore();
      x.fillStyle = '#e07c8c'; x.beginPath(); x.ellipse(0, -201 + m * 3, 2.4 + m * 1.2, 1.2 + m * 1.6, 0, 0, TAU); x.fill(); }
    for (const sx of [-1, 1]) for (const [ex, ey, cy] of [[150, -236, -232], [156, -219, -222], [148, -201, -210]]) thread(x, [[sx * 54, -221], [sx * (54 + ex) / 2, cy], [sx * ex, ey]], { color: THREAD, w: 1.1, shadow: 'rgba(0,0,0,.18)', hi: false });
    x.restore();
    // the beret, tilted over the left ear
    x.save(); x.translate(-16, -318); x.rotate(-.22); spr(x, sp.beret, 0, 0, { so: [5, 9], sa: .55 }); x.restore();
    x.restore();
    x.restore();
  });
}
