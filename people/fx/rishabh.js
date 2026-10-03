/* Rishabh — auto warp specialization for efficient GPU kernels (and, before that, query engines over
   tabular and tensor data)
   Click: a burst of warp-speed lines blows the white wall away into the dim floorplan of a GPU SM (spreading
   out from behind him); WARP! stamps in; the producer warp (cyan, standing at his left) lights up lane by lane
   and pushes data tiles (a table tile, a tensor tile) up onto a shared-memory track that arcs over his head;
   at the far end a tensor core takes each tile in, crunches it (squash) and pops out a finished gold tile,
   while the consumer warp under it (amber) lights its lanes; his glasses turn into a pipeline readout: loads
   scrolling on the left lens, math on the right.
   Loop (3.2 s): four tiles per beat run the pipeline, about three in flight at once; the core crunches on
   each arrival; the lenses scroll; the warps' lanes ripple as they issue.
   Photo landmarks (512 px): hair top v 68 · lenses 159-239 x 230-283 / 263-352 x 223-274 (bridge 251,240) ·
   ears 150,280 / 367,280 · chin v 390 · blazer from v 395 · shoulders 100,460 / 427,447 · white tee u 200-350
   below v 430. */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const BEAT = 3.2, T0 = 1.3;
const ZI = -34;                               // floorplan depth
const ZT = -18;                               // the track (behind him, in front of the floorplan)
const VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ARC = { cu: 256, cv: 262, r: 196, a0: Math.PI + 0.15, a1: -0.15 };   // the shared-memory track
const PROD = [78, 384];                      // producer warp, standing (photo px)
const CORE = [448, 314];                     // tensor core, under the track's end
const CONS = [434, 389];                     // consumer warp, standing under the core
const LENS = [[161, 233, 237, 281, 0.05], [265, 226, 350, 272, -0.04]];   // the readouts (box + tilt)
const SPAWN = 0.8, TRIP = 2.4;               // a tile every 0.8 s, 2.4 s from load to result

export default {
  title: 'warp specialization',
  exit: 0.45,
  still: 2.6,
  async build(k) {
    const { root } = k;
    const V = new THREE.Vector3();
    const atInto = (o, u, v, z) => { const s = k.depthScale(z); return o.set((u / 512 - 0.5) * k.D * s, (0.5 - v / 512) * k.D * s, z); };
    const toScr = (v3, out) => { V.copy(v3).applyMatrix4(root.matrixWorld).project(k.camera); out[0] = (V.x + 1) / 2 * k.W; out[1] = (1 - V.y) / 2 * k.H; return out; };
    const exitF = (e, order) => 1 - ease.in(clamp(e * 1.6 - order * 0.6));
    const arcAt = (f, out) => { const a = lerp(ARC.a0, ARC.a1, f); out[0] = ARC.cu + Math.cos(a) * ARC.r; out[1] = ARC.cv - Math.sin(a) * ARC.r; out[2] = a; return out; };
    const backdropDisc = () => {
      const pad = 2, geo = new THREE.CircleGeometry(k.R + pad, 128), uv = geo.attributes.uv, f = (k.R + pad) / k.R;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.5) * f + 0.5, (uv.getY(i) - 0.5) * f + 0.5);
      return geo;
    };
    k.clip(k.layers.plate.material);
    k.clip(k.layers.photo.material);
    const clipAll = (obj) => obj.traverse(o => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => k.clip(m)));

    // ── ① the SM floorplan: four sub-partitions round an L1 / shared-memory band, tensor cores in each ──
    const smTex = k.canvasTexture(512, 512, (g) => {
      const R = rng(7);
      const gr = g.createRadialGradient(256, 250, 30, 256, 256, 330);
      gr.addColorStop(0, '#18203a'); gr.addColorStop(1, '#090c16');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(150,180,255,0.045)'; g.lineWidth = 1;
      for (let i = 8; i < 512; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
      // the L1 / shared memory band across the middle
      g.fillStyle = 'rgba(40,190,200,0.12)'; g.fillRect(24, 236, 464, 40);
      g.strokeStyle = 'rgba(90,230,240,0.3)'; g.lineWidth = 2; g.strokeRect(24, 236, 464, 40);
      for (let x = 32; x < 480; x += 12) { g.fillStyle = 'rgba(120,240,250,0.1)'; g.fillRect(x, 242, 8, 28); }
      // four sub-partitions: register file, warp scheduler strip, tensor cores, CUDA core grid
      const quad = (x0, y0) => {
        g.strokeStyle = 'rgba(160,190,255,0.22)'; g.lineWidth = 2; g.strokeRect(x0, y0, 220, 196);
        g.fillStyle = 'rgba(70,100,200,0.18)'; g.fillRect(x0 + 10, y0 + 10, 200, 34);            // register file
        for (let x = x0 + 14; x < x0 + 206; x += 8) { g.fillStyle = 'rgba(140,170,255,0.14)'; g.fillRect(x, y0 + 14, 5, 26); }
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x0 + 10, y0 + 52, 200, 12);             // scheduler
        for (let i = 0; i < 4; i++) {                                                               // tensor cores
          const x = x0 + 14 + i * 50, y = y0 + 76;
          g.fillStyle = 'rgba(200,150,80,0.13)'; g.fillRect(x, y, 42, 42);
          g.strokeStyle = 'rgba(230,180,110,0.26)'; g.lineWidth = 1.5; g.strokeRect(x, y, 42, 42);
          for (let j = 1; j < 4; j++) { g.beginPath(); g.moveTo(x + j * 10.5, y); g.lineTo(x + j * 10.5, y + 42); g.moveTo(x, y + j * 10.5); g.lineTo(x + 42, y + j * 10.5); g.stroke(); }
        }
        for (let yy = y0 + 130; yy < y0 + 186; yy += 9) for (let xx = x0 + 14; xx < x0 + 206; xx += 9) {   // CUDA cores
          g.fillStyle = `rgba(130,160,240,${0.07 + R() * 0.08})`; g.fillRect(xx, yy, 6, 6);
        }
      };
      quad(28, 30); quad(264, 30); quad(28, 286); quad(264, 286);
      g.filter = 'blur(1.4px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none';                 // out of focus behind him
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 12; g.beginPath(); g.arc(256, 256, 252, 0, Math.PI * 2); g.stroke();
    });
    const smMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { uT: { value: smTex }, uP: { value: 0 }, uOp: { value: 0 } },
      vertexShader: VS,
      fragmentShader: `
        uniform sampler2D uT; uniform float uP, uOp; varying vec2 vUv;
        void main() {
          float d = distance(vUv, vec2(0.5, 0.52));
          float a = smoothstep(uP, uP - 0.08, d);
          vec3 col = texture2D(uT, vUv).rgb;
          float edge = smoothstep(0.06, 0.0, abs(d - uP)) * (1.0 - smoothstep(0.85, 1.0, uP));
          col += edge * vec3(0.45, 0.85, 1.0);
          gl_FragColor = vec4(col, a * uOp);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    }));
    const floor = new THREE.Mesh(backdropDisc(), smMat);
    floor.position.z = ZI; floor.scale.setScalar(k.depthScale(ZI)); floor.renderOrder = -18;
    root.add(floor);

    // ── ② the shared-memory track over his head: a cyan rail with ring-buffer slots ───────────────────
    const pts = [];
    for (let i = 0; i <= 64; i++) { const p = arcAt(i / 64, [0, 0, 0]); pts.push(k.at(p[0], p[1], ZT)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 1.3, 8, false), k.toon(0x3fd8f0, { emissive: 0x0b5a66 }));
    k.ink(rail, 1.1);
    const railGlow = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 3.2, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x5ff0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    const railGroup = new THREE.Group(); railGroup.add(railGlow, rail);
    clipAll(railGroup);
    root.add(railGroup);
    // slot ticks along the rail (the ring buffer's stages)
    const ticks = [];
    for (let i = 1; i < 8; i++) {
      const p = arcAt(i / 8, [0, 0, 0]);
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6, 2.4), k.toon(0xbff8ff));
      m.position.copy(k.at(p[0], p[1], ZT + 0.5)); m.rotation.z = -p[2] + Math.PI / 2; k.ink(m, 0.9); k.clip(m.material);
      root.add(m); ticks.push(m);
    }

    // ── ③ warps: a slate capsule standing up, five lanes (threads) that light bottom to top; producer cyan,
    //    consumer amber ──
    const mkWarp = (u, v, col, z) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(4.6, 19, 4, 14), k.toon(0x39425a, { emissive: 0x0c1020 }));
      k.ink(body, 1.2);
      g.add(body);
      const lanes = [];
      for (let i = 0; i < 5; i++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 8), new THREE.MeshBasicMaterial({ color: col }));
        d.position.set(0, -8.4 + i * 4.2, 4.2); g.add(d); lanes.push(d);
      }
      g.position.copy(k.at(u, v, z)); g.rotation.y = u < 256 ? 0.35 : -0.35;
      clipAll(g);
      root.add(g);
      return { g, lanes, col: new THREE.Color(col), dim: new THREE.Color(col).multiplyScalar(0.25) };
    };
    const prod = mkWarp(PROD[0], PROD[1], 0x5ff0ff, -6);
    const cons = mkWarp(CONS[0], CONS[1], 0xffb44a, -7);

    // ── ④ the tensor core: an amber cube with a 4 x 4 MMA grid on its face ────────────────────────────
    const core = new THREE.Group(), coreFit = new THREE.Group();
    core.add(coreFit);
    coreFit.rotation.set(0.42, -0.62, 0);
    const faceTex = k.canvasTexture(128, 128, (g) => {
      g.fillStyle = '#e39a2e'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#5a3208'; g.lineWidth = 5; g.strokeRect(6, 6, 116, 116);
      for (let i = 1; i < 4; i++) { g.lineWidth = 3; g.beginPath(); g.moveTo(6 + i * 29, 6); g.lineTo(6 + i * 29, 122); g.moveTo(6, 6 + i * 29); g.lineTo(122, 6 + i * 29); g.stroke(); }
      g.fillStyle = '#fff1cf'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = "800 30px ui-monospace, Menlo, Consolas, monospace";
      g.fillText('MMA', 64, 66);
    });
    const faceMat = k.toon(0xffffff, { map: faceTex });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 18), [faceMat, k.toon(0xc9821f), faceMat, k.toon(0xc9821f), faceMat, k.toon(0xc9821f)]);
    k.ink(cube, 1.3);
    coreFit.add(cube);
    clipAll(core);
    const coreHome = k.at(CORE[0], CORE[1], -8);
    root.add(core);
    const coreGlow = k.glowSprite('rgba(255,190,90,1)', 44, 0);
    k.clip(coreGlow.material);
    coreGlow.position.copy(k.at(CORE[0], CORE[1], -10));
    root.add(coreGlow);

    // ── ⑤ tiles: a table (header row + cells) and a tensor (stacked slices); the result is gold ─────────
    const tableTile = (g, w, h) => {
      g.fillStyle = '#f4f7ff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2d6fe0'; g.fillRect(0, 0, w, h * 0.26);
      g.strokeStyle = '#16151a'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.lineWidth = 1.6; g.strokeStyle = '#7a8aa8';
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, h * 0.26); g.lineTo(i * w / 4, h); g.stroke(); }
      for (let j = 1; j < 3; j++) { g.beginPath(); g.moveTo(0, h * 0.26 + j * h * 0.74 / 3); g.lineTo(w, h * 0.26 + j * h * 0.74 / 3); g.stroke(); }
    };
    const tensorTile = (g, w, h) => {
      for (let s = 2; s >= 0; s--) {
        const o = s * 5;
        g.fillStyle = ['#3fd8f0', '#2bb0d8', '#1b7fb0'][s]; g.fillRect(o, 0 + (2 - s) * 0, w - 12, h - 10);
        g.strokeStyle = '#16151a'; g.lineWidth = 2.5; g.strokeRect(o + 1.2, 1.2, w - 14.4, h - 12.4);
      }
      g.strokeStyle = 'rgba(10,30,50,0.55)'; g.lineWidth = 1.4;
      for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(i * (w - 12) / 3, 0); g.lineTo(i * (w - 12) / 3, h - 10); g.stroke(); g.beginPath(); g.moveTo(0, i * (h - 10) / 3); g.lineTo(w - 12, i * (h - 10) / 3); g.stroke(); }
    };
    const goldTile = (g, w, h) => {
      g.fillStyle = '#ffd36a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#16151a'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.strokeStyle = '#a8701a'; g.lineWidth = 1.6;
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); }
      for (let j = 1; j < 3; j++) { g.beginPath(); g.moveTo(0, j * h / 3); g.lineTo(w, j * h / 3); g.stroke(); }
    };
    const NT = 4;
    const tiles = [];
    for (let i = 0; i < NT; i++) {
      const g = new THREE.Group();
      const a = k.card(25, 17, i % 2 ? tensorTile : tableTile, { res: 2 });
      const r = k.card(25, 17, goldTile, { res: 2 });
      clipAll(a); clipAll(r);
      g.add(a, r); root.add(g);
      tiles.push({ g, a, r });
    }

    const R = rng(11);
    const sparks = Array.from({ length: 10 }, () => ({ a: R() * Math.PI * 2, r: 8 + R() * 10, s: 0.6 + R() * 0.8 }));
    const A = [0, 0], B = [0, 0], P = [0, 0, 0];

    // a tile's trip: 0-0.18 rises out of the producer warp, 0.18-0.72 rides the track, 0.72-0.8 drops into the
    // core, 0.8-0.88 is crunched inside it, 0.88-1 hops out as a gold result into the consumer warp
    const IN = 0.8, OUT = 0.88;
    const trip = (f, out) => {
      out.rot = 0; out.hide = false;
      if (f < 0.18) { const s = ease.out(f / 0.18), p0 = arcAt(0, P); out.u = lerp(PROD[0], p0[0], s); out.v = lerp(PROD[1] - 30, p0[1], s); out.z = lerp(-4, ZT + 3, s); out.res = 0; out.scale = lerp(0.3, 1, s); return; }
      if (f < 0.72) { const s = ease.inOut((f - 0.18) / 0.54), p = arcAt(s, P); out.u = p[0]; out.v = p[1]; out.z = ZT + 3; out.res = 0; out.scale = 1; out.rot = -p[2] + Math.PI / 2; return; }
      if (f < IN) { const s = ease.in((f - 0.72) / (IN - 0.72)), p1 = arcAt(1, P); out.u = lerp(p1[0], CORE[0], s); out.v = lerp(p1[1], CORE[1], s); out.z = lerp(ZT + 3, -4, s); out.res = 0; out.scale = lerp(1, 0.3, s); return; }
      if (f < OUT) { out.hide = true; return; }
      const s = (f - OUT) / (1 - OUT), h = Math.sin(Math.min(1, s * 1.15) * Math.PI);
      out.u = lerp(CORE[0] + 4, CONS[0], s); out.v = lerp(CORE[1], CONS[1] - 34, ease.in(s)) - h * 26; out.z = -2; out.res = 1;
      out.scale = lerp(0.45, 0.8, Math.min(1, s * 4)) * (1 - ease.in(clamp((s - 0.7) / 0.3))); out.rot = -0.4 * s;
    };
    const tp = {};
    // the last time before t that a tile reached trip fraction fr (the core's crunch, the consumer's catch)
    const lastAt = (t, fr) => {
      const t1 = 0.95;                                  // first tile spawns at t1
      const n = Math.floor((t - t1 - TRIP * fr) / SPAWN);
      return n < 0 ? -1 : t1 + n * SPAWN + TRIP * fr;
    };

    return {
      update(t, e) {
        // the floorplan spreads out from behind him, the plate darkens with it
        smMat.uniforms.uP.value = 1.1 * ease.out(env(t, 0.12, 0.6));
        smMat.uniforms.uOp.value = exitF(e, 1);
        const dim = 0.85 * ease.out(env(t, 0.12, 0.6)) * exitF(e, 1);
        k.layers.plate.material.color.setRGB(1 - dim, 1 - dim * 0.97, 1 - dim * 0.9);

        // the track draws on from the left, the slots pop on
        const tr = presence(t, e, 0.45, 0.4, ease.out, 0.5);
        railGroup.visible = tr > 0.004;
        rail.scale.setScalar(1); railGroup.scale.setScalar(Math.max(0.004, 0.9 + 0.1 * tr));
        rail.material.opacity = 1; rail.visible = tr > 0.02;
        rail.geometry.setDrawRange(0, Math.floor(rail.geometry.index.count * clamp(env(t, 0.45, 0.85)) / 3) * 3 * (e > 0 ? 1 : 1));
        railGlow.material.opacity = 0.32 * tr * (0.75 + 0.25 * Math.sin(t * 3));
        ticks.forEach((m, i) => k.show(m, presence(t, e, 0.6 + i * 0.04, 0.22, ease.outBack, 0.4)));

        // warps pop in; their lanes light in a wave when they issue
        const lit = (W, w0, order, issueAt) => {
          const p = presence(t, e, w0, 0.3, ease.outBack, order);
          k.show(W.g, p);
          W.lanes.forEach((d, j) => {
            const wave = issueAt >= 0 ? clamp(1 - Math.abs((t - issueAt) * 18 - j) / 2.5) : 0;
            d.material.color.copy(W.dim).lerp(W.col, Math.max(env(t, w0 + 0.1 + j * 0.03, w0 + 0.2 + j * 0.03) * 0.55, wave));
          });
        };
        const issued = t < 0.95 ? -1 : 0.95 + Math.floor((t - 0.95) / SPAWN) * SPAWN;
        lit(prod, 0.35, 0.2, issued);
        const la = lastAt(t, IN);
        lit(cons, 0.5, 0.2, lastAt(t, 1));

        // the tensor core: drops in, crunches on each arrival
        const cp = presence(t, e, 0.55, 0.35, ease.outBack, 0.1);
        k.show(core, cp);
        const cr = la >= 0 ? env(t, la, la + 0.35) : 1;
        const sq = cr < 1 ? Math.sin(cr * Math.PI) * (1 - cr) : 0;
        core.position.set(coreHome.x, coreHome.y + (1 - ease.out(env(t, 0.55, 0.85))) * 40, coreHome.z);
        coreFit.scale.set(1 + 0.22 * sq, 1 - 0.28 * sq, 1 + 0.22 * sq);
        coreFit.rotation.y = -0.62 + Math.sin(t * 0.9) * 0.12;
        coreGlow.material.opacity = (0.15 + 0.85 * sq) * cp;

        // tiles: up to NT in flight, each a pure function of t
        tiles.forEach((T, i) => {
          T.g.visible = false;
          if (t < 0.95) return;
          const n = Math.floor((t - 0.95) / SPAWN);
          const m = n - (((n - i) % NT) + NT) % NT;      // the most recent spawn assigned to this tile slot
          if (m < 0) return;
          const f = (t - (0.95 + m * SPAWN)) / TRIP;
          if (f < 0 || f > 1) return;
          trip(f, tp);
          const out = exitF(e, 0.2 + i * 0.05);
          if (out < 0.01 || tp.hide) return;
          T.g.visible = true;
          atInto(T.g.position, tp.u, tp.v, tp.z);
          T.g.scale.setScalar(Math.max(0.004, tp.scale * out));
          T.g.rotation.set(0.15, -0.25, tp.rot || 0);
          T.a.visible = !tp.res; T.r.visible = !!tp.res;
          T.a.material.map = (m % 2) ? tiles[1].a.material.map : tiles[0].a.material.map;
        });
      },

      draw2d(q, t, e) {
        // ① warp-speed lines: a radial burst from behind him as the wall blows away
        const wl = env(t, 0.0, 0.55);
        if (wl > 0 && wl < 1) {
          const c = k.screenAt(256, 240, 0), a = Math.sin(wl * Math.PI), o = k.screenAt(256, 256, 0), g = q.ctx || q.drawingContext;
          g.save(); g.beginPath(); g.arc(o[0], o[1], k.R + 0.5, 0, Math.PI * 2); g.clip();
          const Rr = rng(5);
          q.strokeCap(q.ROUND);
          for (let i = 0; i < 46; i++) {
            const ang = Rr() * Math.PI * 2, r0 = 18 + wl * 70 + Rr() * 30, len = (14 + Rr() * 34) * (0.4 + wl);
            q.strokeWeight(0.8 + Rr() * 1.6);
            q.stroke(Rr() < 0.3 ? q.color(120, 230, 255, 230 * a) : q.color(255, 255, 255, 220 * a));
            q.line(c[0] + Math.cos(ang) * r0, c[1] + Math.sin(ang) * r0, c[0] + Math.cos(ang) * (r0 + len), c[1] + Math.sin(ang) * (r0 + len));
          }
          g.restore();
        }
        // ② WARP! stamp, top left
        const ws = env(t, 0.22, 0.42), wo = env(t, 0.95, 1.15);
        if (ws > 0 && wo < 1 && e < 0.5) {
          const p = k.screenAt(118, 118, 8), s = (ws < 1 ? ease.outBack(ws) : 1) * (1 - ease.in(wo));
          q.push(); q.translate(p[0], p[1]); q.rotate(-0.18); q.scale(Math.max(0.01, s));
          q.textAlign(q.CENTER, q.CENTER); q.textStyle(q.BOLDITALIC); q.textSize(19);
          q.stroke(22, 21, 26); q.strokeWeight(5); q.fill(95, 240, 255); q.text('WARP!', 0, 0);
          q.noStroke(); q.fill(230, 252, 255); q.text('WARP!', -0.6, -0.8);
          q.pop();
        }
        // ③ his lenses become the pipeline readout: loads scroll on the left lens (cyan), math on the right
        //    (amber), two rows each, half a step apart (double buffering)
        LENS.forEach(([u0, v0, u1, v1, tilt], li) => {
          const hk = presence(t, e, 0.75 + li * 0.1, 0.25, ease.out, 0);
          if (hk < 0.01) return;
          const a = k.screenAt(u0, v0, 4), b = k.screenAt(u1, v1, 4);
          const w = b[0] - a[0], h = b[1] - a[1], col = li ? [255, 180, 74] : [95, 240, 255];
          q.push();
          q.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); q.rotate(tilt);
          q.noStroke(); q.fill(col[0], col[1], col[2], 52 * hk); q.rect(-w / 2, -h / 2, w, h, h * 0.28);
          const step = w / 3.2, sc = ((t * 0.9 + li * 0.5) % 1) * step;
          q.strokeCap(q.ROUND); q.strokeWeight(Math.max(1.6, h * 0.16));
          [-0.2, 0.2].forEach((ry, ri) => {
            for (let x = -w / 2 - step + sc + ri * step / 2; x < w / 2; x += step) {
              const xa = Math.max(x, -w / 2 + h * 0.22), xb = Math.min(x + step * 0.55, w / 2 - h * 0.22);
              if (xb > xa) { q.stroke(col[0], col[1], col[2], 235 * hk); q.line(xa, ry * h, xb, ry * h); }
            }
          });
          q.pop();
        });
        // ④ sparks when a gold result leaves the core
        const la = lastAt(t, OUT);
        if (la >= 0 && e < 0.5) {
          const s = env(t, la - 0.05, la + 0.3);
          if (s > 0 && s < 1) {
            toScr(core.position, A);
            q.strokeWeight(1.5);
            for (const sp of sparks) {
              const r0 = sp.r + s * 18 * sp.s, r1 = r0 + 4 * (1 - s);
              q.stroke(255, 214, 120, 230 * (1 - s));
              q.line(A[0] + Math.cos(sp.a) * r0, A[1] + Math.sin(sp.a) * r0, A[0] + Math.cos(sp.a) * r1, A[1] + Math.sin(sp.a) * r1);
            }
          }
        }
      },

      dispose() { smTex.dispose(); faceTex.dispose(); },
    };
  },
};
