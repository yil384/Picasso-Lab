// kit2d/stage.js - a toy-theatre compositor for flat pieces: z-planes through a perspective camera, depth of field by
// plane (thin-lens blur per depth group), textured horizontal floors (desk, stage boards) projected row by row with
// their own blur bands, a multiply light map of gel pools, screen-blended beams with dust motes that go to bokeh out of
// focus, vignette and grain. Every frame is a pure function of t: build a fresh frame state K = stage.frame(t), add
// pieces, then stage.render(K, g).
//
// The plane camera, light map, beams and the vignette/grain post are adapted from
// ledbetterljoshua/bohemian-tokenry-video, video/styles/papertheater/kit.js (MIT, (c) 2026 Joshua Ledbetter; see
// THIRD_PARTY.md). Changes: thin-lens blur per depth group instead of fixed far/near downsampling, perspective floors,
// clipped beams and pools, bokeh dust, vertical 1080x1920 first, output scale S from the pv runtime.
//
// World units: at depth d = z - cam.z, one unit is F/d design px (F = 1000), so the plane at z = 1000 is 1:1 with the
// camera at z = 0; (0,0) is the frame centre; y grows downward.

import { mk, cl, mix, hs, rgba, TAU, textures, step } from './material.js';

/**
 * makeStage({ W, H, S=1, OX=0, OY=0, F=1000, lmk=.25, bg='#060409' })  W, H: output px; S, OX, OY: design->output.
 * Returns { frame(t) -> K, render(K, g), proj(cam, x, y, z) }.
 */
export function makeStage(o) {
  const W = o.W, H = o.H, S = o.S ?? 1, OX = o.OX ?? 0, OY = o.OY ?? 0, F = o.F ?? 1000, lmk = o.lmk ?? .25;
  const DW = o.DW ?? W / S, DH = o.DH ?? H / S, CX = OX + DW * S / 2, CY = OY + DH * S / 2;
  const FR = mk(W, H), fx = FR.getContext('2d');
  const SC = mk(W, H), scx = SC.getContext('2d');
  const FL = mk(W, H), flx = FL.getContext('2d');
  const LMF = mk(W, H), lfx = LMF.getContext('2d');   // the frame's assembled light map (full res)
  const MK = mk(W, H), mkx = MK.getContext('2d');
  const OCC = mk(W, H), ocx = OCC.getContext('2d');   // what stands in front of the beams
  const BM = mk(W, H), bmx = BM.getContext('2d');     // one beam with its dust
  let VIG = null, vigKey = '';

  const proj = (cam, x, y, z) => { const d = z - cam.z; if (d < 1) return null; const s = F / d * S, c = Math.cos(cam.roll || 0), sn = Math.sin(cam.roll || 0), dx = (x - cam.x) * s, dy = (y - cam.y) * s; return { x: CX + c * dx - sn * dy, y: CY + sn * dx + c * dy, s, d }; };
  const setWorld = (x, cam, z, k = 1) => { const d = z - cam.z; if (d < 1) return 0; const s = F / d * S * k, c = Math.cos(cam.roll || 0) * s, sn = Math.sin(cam.roll || 0) * s;
    x.setTransform(c, sn, -sn, c, CX * k - (c * cam.x - sn * cam.y), CY * k - (sn * cam.x + c * cam.y)); return s; };

  function frame(t, opt = {}) {
    const st = { t, items: [], lights: [], beams: [], cam: { x: 0, y: 0, z: 0, roll: 0 }, ambient: [20, 18, 30], bg: o.bg ?? '#060409',
      focus: { z: 1000, A: 0, max: 24 }, vignette: .55, grain: .09, haze: 0, n: 0 };
    const K = {
      S: st, t, cam: st.cam, F,
      /** Thin-lens focus: blur px = A * |1/df - 1/d| * F * S, capped at max. A = 0 switches depth of field off. */
      focus(z, A = 20, max = 24) { st.focus = { z, A, max }; },
      ambient(r, g, b) { st.ambient = Array.isArray(r) ? r : [r, g, b]; },
      /** Add a flat piece: fn(x) draws in world units at depth z. o.sharp: never blurred; o.blur: extra blur px. */
      add(z, fn, oo = {}) { st.items.push({ z, fn, sharp: !!oo.sharp, extra: oo.blur || 0, n: st.n++ }); },
      /** A horizontal textured plane at height y between depths z0 (near) and z1 (far), x0..x1 wide. src: canvas
       *  (top row = far edge). Lit and blurred like the rest. o.tint: CSS colour multiplied over it. */
      floor(f) { st.items.push({ z: f.z1, floor: f, n: st.n++ }); },
      /** A pool of light on the light map. c: [r,g,b]; a: strength; soft: 0..1 (1 = all falloff); clip: {z, path(x)};
       *  zmin, zmax: the planes it lights (default all). */
      light(l) { st.lights.push(Object.assign({ ry: l.rx, c: [255, 214, 160], a: 1, soft: .55 }, l)); },
      /** A spotlight shaft from src {x,y,z} to the target ellipse (x,y,z, rx). dust: number of motes. occ: pieces
       *  nearer than this z hide the shaft (a valance, the curtains, the proscenium). */
      beam(b) { st.beams.push(Object.assign({ c: [255, 214, 160], a: .14, dust: 30, w0: 14 }, b)); },
      vignette(a) { st.vignette = a; }, grain(a) { st.grain = a; }, haze(a) { st.haze = a; },
      proj: (x, y, z) => proj(st.cam, x, y, z),
      /** Inside a piece's draw fn at depth z: clip to a path drawn at another plane clip.z (e.g. the proscenium
       *  opening, so a flown piece only shows through it). Call between x.save() and x.restore(). */
      clipTo(x, z, clip) { const c = st.cam, k = (z - c.z) / (clip.z - c.z);
        x.translate(c.x, c.y); x.scale(k, k); x.translate(-c.x, -c.y); x.beginPath(); clip.path(x); x.clip(); x.translate(c.x, c.y); x.scale(1 / k, 1 / k); x.translate(-c.x, -c.y); },
      blurAt: (z) => blurPx(st, z - st.cam.z),
    };
    return K;
  }

  function blurPx(st, d) {
    const f = st.focus; if (!f.A) return 0;
    const df = f.z - st.cam.z; return Math.min(f.max, f.A * Math.abs(1 / df - 1 / d) * F * S);
  }
  const q = (r) => (r < .45 ? 0 : Math.round(r * 2) / 2);

  function drawFloor(st, it) {
    const f = it.floor, cam = st.cam, src = f.src, sw = src.width, sh = src.height;
    const yRel = (f.y - cam.y) * F * S;
    if (yRel <= 0) return; // camera below the plane: nothing to see from above
    const yFar = CY + yRel / (f.z1 - cam.z), yNear = f.z0 - cam.z > 1 ? CY + yRel / (f.z0 - cam.z) : H;
    const r0 = Math.max(0, Math.floor(yFar)), r1 = Math.min(H, Math.ceil(yNear));
    flx.setTransform(1, 0, 0, 1, 0, 0); flx.clearRect(0, 0, W, H); flx.imageSmoothingQuality = 'high';
    const rows = [];
    for (let Y = r0; Y < r1; Y++) {
      const d = yRel / (Y + .5 - CY), z = d + cam.z; if (z < f.z0 || z > f.z1) continue;
      const v = (f.z1 - z) / (f.z1 - f.z0) * sh, s = F / d * S;
      const xa = CX + (f.x0 - cam.x) * s, xb = CX + (f.x1 - cam.x) * s;
      const dv = Math.max(1, sh / (f.z1 - f.z0) * (yRel / ((Y + .5 - CY) ** 2)));
      flx.drawImage(src, 0, Math.min(sh - 1, v), sw, Math.min(dv, sh - v), xa, Y, xb - xa, 1);
      rows.push([Y, q(f.sharp ? 0 : blurPx(st, d))]);
    }
    if (f.tint) { flx.globalCompositeOperation = 'source-atop'; flx.fillStyle = f.tint; flx.fillRect(0, 0, W, H); flx.globalCompositeOperation = 'source-over'; }
    if (f.over) { flx.save(); f.over(flx, (x, y, z) => proj(cam, x, y, z)); flx.restore(); }
    // composite in bands of equal blur, each drawn from a source window wider than the band so its edges stay solid
    let i = 0;
    while (i < rows.length) {
      let j = i; while (j + 1 < rows.length && rows[j + 1][1] === rows[i][1]) j++;
      const r = rows[i][1], ya = rows[i][0], yb = rows[j][0] + 1, m = Math.ceil(r * 3) + 2;
      fx.save(); fx.setTransform(1, 0, 0, 1, 0, 0); fx.beginPath(); fx.rect(0, ya, W, yb - ya); fx.clip();
      if (r > 0) fx.filter = `blur(${r}px)`;
      const sa = Math.max(0, ya - m), sb = Math.min(H, yb + m);
      fx.drawImage(FL, 0, sa, W, sb - sa, 0, sa, W, sb - sa);
      fx.restore();
      i = j + 1;
    }
  }

  // light maps: one per set of lights (a light can be limited to planes zmin..zmax), cached per frame
  const LMS = [], lmPool = (i) => LMS[i] || (LMS[i] = mk(W * lmk, H * lmk));
  function lightMap(st, idx, cache) {
    const key = idx.join(','); if (cache.has(key)) return cache.get(key);
    const C = lmPool(cache.size), x = C.getContext('2d'), k = lmk, cam = st.cam;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.filter = 'none';
    x.fillStyle = rgba(st.ambient.map((v) => v * st.flick), 1); x.fillRect(0, 0, C.width, C.height);
    x.globalCompositeOperation = 'lighter';
    for (const i of idx) {
      const L = st.lights[i]; if (L.a <= 0) continue; const p = proj(cam, L.x, L.y, L.z); if (!p) continue;
      x.save();
      if (L.clip) { setWorld(x, cam, L.clip.z, k); x.beginPath(); L.clip.path(x); x.clip(); }
      x.setTransform(1, 0, 0, 1, 0, 0);
      const rx = L.rx * p.s * k, ry = L.ry * p.s * k;
      x.translate(p.x * k, p.y * k); x.rotate((cam.roll || 0) + (L.rot || 0)); x.scale(1, ry / rx);
      const gr = x.createRadialGradient(0, 0, 0, 0, 0, rx), a = L.a * st.flick, hard = 1 - cl(L.soft);
      gr.addColorStop(0, rgba(L.c, a)); gr.addColorStop(hard * .9, rgba(L.c, a * .92)); gr.addColorStop(1, rgba(L.c, 0));
      x.fillStyle = gr; x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill(); x.restore();
    }
    cache.set(key, C); return C;
  }
  const lightsAt = (st, z0, z1 = z0) => st.lights.map((L, i) => ((L.zmin ?? -Infinity) <= z1 && (L.zmax ?? Infinity) >= z0 ? i : -1)).filter((i) => i >= 0);
  // paint a group's light map into the frame's assembled light map, through the group's own silhouette
  function addLight(lm, src, r) {
    mkx.setTransform(1, 0, 0, 1, 0, 0); mkx.filter = 'none'; mkx.globalCompositeOperation = 'copy'; mkx.drawImage(lm, 0, 0, W, H);
    mkx.globalCompositeOperation = 'destination-in'; if (r > 0) mkx.filter = `blur(${r}px)`; mkx.drawImage(src, 0, 0); mkx.filter = 'none'; mkx.globalCompositeOperation = 'source-over';
    lfx.drawImage(MK, 0, 0);
  }

  function render(K, g) {
    const st = K.S, cam = st.cam, cache = new Map();
    st.flick = 1 + (hs(step(st.t) * 1.7) - .5) * .03; // a lamp's faint flicker, on twos
    fx.setTransform(1, 0, 0, 1, 0, 0); fx.globalCompositeOperation = 'source-over'; fx.globalAlpha = 1; fx.filter = 'none';
    fx.fillStyle = st.bg; fx.fillRect(0, 0, W, H);
    lfx.setTransform(1, 0, 0, 1, 0, 0); lfx.globalCompositeOperation = 'source-over'; lfx.drawImage(lightMap(st, [], cache), 0, 0, W, H);
    const items = st.items.slice().sort((a, b) => b.z - a.z || a.n - b.n);
    // depth groups: consecutive pieces with the same (quantised) blur and the same lights share one offscreen pass;
    // each group is lit by its own light map (multiply), so a backdrop wash never tints a puppet in front of it
    let gR = 0, gL = null, gKey = '', gOcc = false, pending = false;
    const occZ = st.beams.reduce((m, B) => Math.max(m, B.occ ?? -Infinity), -Infinity);
    ocx.setTransform(1, 0, 0, 1, 0, 0); ocx.clearRect(0, 0, W, H);
    const flush = () => { if (!pending) return; fx.setTransform(1, 0, 0, 1, 0, 0); if (gR > 0) fx.filter = `blur(${gR}px)`; fx.drawImage(SC, 0, 0); fx.filter = 'none';
      if (gOcc) { if (gR > 0) ocx.filter = `blur(${gR}px)`; ocx.drawImage(SC, 0, 0); ocx.filter = 'none'; }
      addLight(lightMap(st, gL, cache), SC, gR); pending = false; };
    for (const it of items) {
      const d = it.z - cam.z; if (d < 1) continue;
      if (it.floor) { flush(); drawFloor(st, it); addLight(lightMap(st, lightsAt(st, it.floor.z0, it.floor.z1), cache), FL, 0); continue; }
      const r = it.sharp ? 0 : q(blurPx(st, d) + it.extra), li = lightsAt(st, it.z), oc = it.z < occZ, key = r + '|' + li.join(',') + (oc ? '|o' : '');
      if (!pending || key !== gKey) { flush(); scx.setTransform(1, 0, 0, 1, 0, 0); scx.clearRect(0, 0, W, H); gR = r; gL = li; gKey = key; gOcc = oc; }
      scx.save(); setWorld(scx, cam, it.z); it.fn(scx, { z: it.z, blur: r }); scx.restore(); pending = true;
    }
    flush();
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.globalCompositeOperation = 'multiply'; fx.drawImage(LMF, 0, 0);
    if (st.haze > 0) { fx.globalCompositeOperation = 'screen'; fx.globalAlpha = st.haze; fx.filter = `blur(${12 * S}px)`; fx.drawImage(LMF, 0, 0, W, H); fx.filter = 'none'; fx.globalAlpha = 1; }

    // beams (screen) with dust, each drawn on its own layer and hidden behind the pieces in front of it
    for (const B of st.beams) {
      const p = proj(cam, B.x, B.y, B.z), s0 = proj(cam, B.src.x, B.src.y, B.src.z); if (!p || !s0) continue;
      bmx.setTransform(1, 0, 0, 1, 0, 0); bmx.globalCompositeOperation = 'source-over'; bmx.clearRect(0, 0, W, H); bmx.save();
      if (B.clip) { setWorld(bmx, cam, B.clip.z); bmx.beginPath(); B.clip.path(bmx); bmx.clip(); bmx.setTransform(1, 0, 0, 1, 0, 0); }
      const bw = B.rx * p.s, tw = B.w0 * s0.s, ang = Math.atan2(p.y - s0.y, p.x - s0.x), nx = -Math.sin(ang), ny = Math.cos(ang);
      // a soft cross-profile: nested shafts, the core brightest; light falls off along the shaft
      bmx.filter = `blur(${(B.soft ?? 10) * S}px)`;
      for (const [kw, ka] of [[1, .35], [.72, .3], [.45, .35]]) {
        const gr = bmx.createLinearGradient(s0.x, s0.y, p.x, p.y);
        gr.addColorStop(0, rgba(B.c, B.a * ka * 1.4)); gr.addColorStop(.5, rgba(B.c, B.a * ka * .8)); gr.addColorStop(B.fade ?? .85, rgba(B.c, B.a * ka * .25)); gr.addColorStop(1, rgba(B.c, 0));
        bmx.fillStyle = gr; bmx.beginPath(); bmx.moveTo(s0.x + nx * tw * kw, s0.y + ny * tw * kw); bmx.lineTo(s0.x - nx * tw * kw, s0.y - ny * tw * kw);
        bmx.lineTo(p.x - nx * bw * kw, p.y - ny * bw * kw); bmx.lineTo(p.x + nx * bw * kw, p.y + ny * bw * kw); bmx.closePath(); bmx.fill();
      }
      bmx.filter = 'none';
      // dust: motes drifting slowly in the shaft, each at its own depth (sharp in the focal plane, bokeh elsewhere)
      for (let i = 0; i < B.dust; i++) {
        const u = (B.u0 ?? 0) + ((hs(i * 7.31 + B.x) + st.t * (.012 + .02 * hs(i * 1.9))) % 1) * (1 - (B.u0 ?? 0)), v = (hs(i * 3.17 + 1.3) - .5) * 1.6;
        const dz = (hs(i * 5.03 + 2.1) - .5) * (B.depth ?? 260);
        const wx = mix(B.src.x, B.x, u) + v * mix(B.w0, B.rx, u) + Math.sin(st.t * .7 + i) * 4, wy = mix(B.src.y, B.y, u) + Math.cos(st.t * .5 + i * 1.3) * 5;
        const m = proj(cam, wx, wy, mix(B.src.z, B.z, u) + dz); if (!m) continue;
        const core = (B.dustSize ?? 1) * (0.9 + hs(i * 9.1) * 1.8) * m.s, r = Math.max(core, blurPx(st, m.d) * .9), tw2 = .55 + .45 * Math.sin(st.t * 2 + i * 2.3);
        const al = (B.dustA ?? .8) * tw2 * Math.min(1, (core * core) / (r * r) * 1.6) * (1 - Math.abs(v) * .45);
        const dg = bmx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
        dg.addColorStop(0, rgba(B.c, al)); dg.addColorStop(r > core * 1.5 ? .78 : .35, rgba(B.c, al * .8)); dg.addColorStop(1, rgba(B.c, 0));
        bmx.fillStyle = dg; bmx.beginPath(); bmx.arc(m.x, m.y, r, 0, TAU); bmx.fill();
      }
      bmx.restore();
      if (B.occ != null) { bmx.globalCompositeOperation = 'destination-out'; bmx.drawImage(OCC, 0, 0); bmx.globalCompositeOperation = 'source-over'; }
      fx.globalCompositeOperation = 'screen'; fx.drawImage(BM, 0, 0);
    }
    fx.globalCompositeOperation = 'source-over';

    // vignette (multiply) and grain (overlay, re-seeded on ones)
    if (st.vignette > 0) {
      const key = st.vignette.toFixed(3);
      if (key !== vigKey) { vigKey = key; VIG = mk(W / 4, H / 4); const x = VIG.getContext('2d'), R0 = Math.hypot(W, H) / 8;
        const gr = x.createRadialGradient(W / 8, H / 8 * .96, R0 * .35, W / 8, H / 8, R0 * 1.05); const v = Math.round(255 * (1 - st.vignette));
        gr.addColorStop(0, '#fff'); gr.addColorStop(.55, '#f4eeea'); gr.addColorStop(1, `rgb(${v},${Math.round(v * .93)},${Math.round(v * .9)})`); x.fillStyle = gr; x.fillRect(0, 0, W / 4, H / 4); }
      fx.globalCompositeOperation = 'multiply'; fx.drawImage(VIG, 0, 0, W, H);
    }
    if (st.grain > 0) {
      const T = textures(), gs = Math.floor(st.t * 24 + 1e-6);
      fx.globalCompositeOperation = 'overlay'; fx.globalAlpha = st.grain;
      const gp = fx.createPattern(T.GRAIN, 'repeat'); gp.setTransform(new DOMMatrix().translate(hs(gs) * 256, hs(gs + 1) * 256).scale(1.4 * S)); fx.fillStyle = gp; fx.fillRect(0, 0, W, H);
      fx.globalAlpha = 1;
    }
    fx.globalCompositeOperation = 'source-over';
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.drawImage(FR, 0, 0); g.restore();
    return FR;
  }

  return { frame, render, proj, setWorld, W, H, S, F, CX, CY, canvas: FR };
}
