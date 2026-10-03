// v9 props for the paper studio: newsprint clippings (the three quotes), the thermal-paper bill (a ribbon that follows
// a path, printed row by row), ink decals (rubber stamps, a gold seal, red ballpoint marks, all real ink photographed on
// white, tools/ink.py), the dust ring of a slam, and the slit of light in the floor. Real paper scans (ambientCG CC0,
// tex/) give every sheet its fibre and creases; the type is set in the browser.
import { clamp, hsh, lerp, sm } from '/scene/lib.js';

const loadImg = (u) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = u; });

export async function propKit(T) {
  const { THREE, scene } = T;
  await Promise.all(['700 80px "Fraunces"', '500 italic 60px "Fraunces"', '800 80px "Fraunces"', '500 40px "JetBrains Mono"', '700 40px "JetBrains Mono"']
    .map((f) => document.fonts.load(f).catch(() => null)));
  const [pCol, pNrm, cNrm] = await Promise.all([loadImg('/scene/tex/Paper001/Paper001_2K-JPG_Color.jpg'),
    loadImg('/scene/tex/Paper001/Paper001_2K-JPG_NormalGL.jpg'), loadImg('/scene/tex/Paper003/Paper003_2K-JPG_NormalGL.jpg')]);
  const texOf = (img, srgb, rep = 1) => { const t = new THREE.Texture(img); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const fineNormal = texOf(pNrm, false), creaseNormal = texOf(cNrm, false);

  // ---------------------------------------------------------------------------------------------------------------
  // newsprint: cream stock from the real paper scan, a halftone screen, ink that drops out a little, torn deckle edges
  function newsprintCanvas(w, h, draw, o = {}) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.drawImage(pCol, 0, 0, w, h);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = o.stock || '#efe4cc'; g.fillRect(0, 0, w, h);
    // age: warmer towards the edges
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, o.age || 'rgba(214,188,140,0.55)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    // halftone screen: a faint regular dot grid, the newsprint tell
    g.fillStyle = 'rgba(60,50,40,0.05)';
    for (let y = 2; y < h; y += 6) for (let x = (y / 6) % 2 ? 5 : 2; x < w; x += 6) { g.beginPath(); g.arc(x, y, 1.1, 0, 6.283); g.fill(); }
    // the type, then ink dropout: tiny paper-coloured specks knocked out of the ink
    const t = document.createElement('canvas'); t.width = w; t.height = h; const tg = t.getContext('2d');
    draw(tg, w, h);
    tg.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < w * h / 380; i++) { tg.fillStyle = `rgba(0,0,0,${0.25 + hsh(i, 3) * 0.6})`; tg.fillRect(hsh(i, 1) * w, hsh(i, 2) * h, 1 + hsh(i, 4) * 1.6, 1 + hsh(i, 5) * 1.6); }
    g.globalAlpha = 0.93; g.drawImage(t, 0, 0); g.globalAlpha = 1;
    return c;
  }
  // a scissor cut: four straight-ish edges between slightly uneven corners, a hair of chatter where the blades re-bit
  function cutAlpha(w, h, seed) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const m = Math.min(w, h) * 0.03, J = (k) => (hsh(seed, k) - 0.5) * m * 0.9;
    const C = [[m + J(1), m + J(2)], [w - m + J(3), m + J(4)], [w - m + J(5), h - m + J(6)], [m + J(7), h - m + J(8)]];
    const pts = [];
    for (let e = 0; e < 4; e++) {
      const [x0, y0] = C[e], [x1, y1] = C[(e + 1) % 4], n = 80, bow = (hsh(seed, 20 + e) - 0.5) * m * 0.5;
      const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny);
      for (let i = 0; i < n; i++) {
        const t = i / n, bite = Math.floor(t * 7 + hsh(seed, 30 + e) * 3), ch = (hsh(bite, seed, e) - 0.5) * 0.9 + (hsh(i, seed, e + 40) - 0.5) * 0.3;
        const d = bow * Math.sin(Math.PI * t) + ch;
        pts.push([x0 + (x1 - x0) * t + nx / nl * d, y0 + (y1 - y0) * t + ny / nl * d]);
      }
    }
    g.filter = 'blur(0.5px)'; g.fillStyle = '#fff'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.filter = 'none';
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.userData = { pts, w, h }; return t;
  }

  // a clipping cut out of the morning paper: the opinion page's pull quote, set in a news serif between rules; the
  // next story's headline sliced off by the bottom cut; the back page's type faintly showing through
  const NEWS = '"Newsreader"';
  function clipping(q, o = {}) {
    const W = o.cw ?? 1600, x0 = Math.round(W * 0.09), wMax = W - 2 * x0, mg = document.createElement('canvas').getContext('2d');
    const wrapW = (s, font) => { if (!s) return []; mg.font = font; const out = []; let line = '';
      for (const wd of s.split(' ')) { const tt = line ? line + ' ' + wd : wd; if (mg.measureText(tt).width > wMax && line) { out.push(line); line = wd; } else line = tt; }
      if (line) out.push(line); return out; };
    const fsz = q.size || 128, lsz = q.leadSize || 66;
    const fL = `italic 400 ${lsz}px ${NEWS}`, fM = `italic 500 ${fsz}px ${NEWS}`;
    const LL = wrapW(q.lead, fL), ML = wrapW(q.main, fM);
    const head = q.who ? 340 : 120;
    const need = head + 90 + LL.length * lsz * 1.28 + (LL.length ? 18 : 0) + ML.length * fsz * 1.06 + 110 + (q.who ? 150 : 60);
    const asp = o.asp ?? need / W, H = Math.round(W * asp);
    const cv_meta = {};
    const alpha = cutAlpha(512, Math.round(512 * asp), o.seed ?? 3);
    const cv = newsprintCanvas(W, H, (g) => {
      const track = (px) => { try { g.letterSpacing = px + 'px'; } catch (e) { /* */ } };
      g.fillStyle = '#1d1a16';
      let y = 96;
      if (q.who) {                                      // the newspaper furniture: rules, kicker, speaker, source
        g.fillRect(0, y, W, 7); g.fillRect(0, y + 14, W, 2);
        g.font = `600 40px ${NEWS}`; track(9); g.fillText(q.section || 'THE FUTURE', x0, y + 84);
        g.font = `italic 400 40px ${NEWS}`; track(1); g.textAlign = 'right'; g.fillText(q.page || 'Opinion', W - x0, y + 84); g.textAlign = 'left';
        g.font = `700 92px ${NEWS}`; track(2); g.fillText(q.who, x0, y + 196); track(0);
        g.font = `italic 400 52px ${NEWS}`; g.fillStyle = '#4a4239'; g.fillText(q.src, x0, y + 262);
        g.fillStyle = '#1d1a16'; g.fillRect(x0, y + 300, wMax, 2);
        y += head;
      }
      y += 50;
      if (LL.length) { g.font = fL; g.fillStyle = '#2b2620'; for (const l of LL) { g.fillText(l, x0, y + lsz * 0.8); y += lsz * 1.28; } y += 18; }
      g.font = fM; g.fillStyle = '#16130f';
      const boxes = [];
      for (const l of ML) { g.fillText(l, x0, y + fsz * 0.8); boxes.push([x0, y, g.measureText(l).width, fsz]); y += fsz * 1.06; }
      cv_meta.lines = boxes; cv_meta.H = H; cv_meta.W = W;
      y += 50; g.fillRect(x0, y, wMax, 2);
      if (q.who) {                                      // the next story, cut through by the scissors
        g.font = `700 150px ${NEWS}`; g.fillStyle = '#1d1a16'; g.fillText(q.next || 'Local bakery wins prize for', x0 - 10, H - 18 + 150 * 0.42);
      }
    });
    // the back page shows through the thin stock: mirrored, soft, faint
    {
      const g = cv.getContext('2d'), b = document.createElement('canvas'); b.width = W; b.height = H; const bg = b.getContext('2d');
      bg.fillStyle = '#000'; bg.font = `400 44px ${NEWS}`;
      const words = 'the of and city council said on that it was for budget new plan year market rain week school more than will team'.split(' ');
      for (let r = 0; r < H / 58; r++) { let x = 60 + (r % 3) * 6; for (let i = 0; x < W - 60; i++) { const wd = words[Math.floor(hsh(r, i, 7) * words.length)]; bg.fillText(wd, x, 70 + r * 58); x += bg.measureText(wd + ' ').width; } }
      bg.fillStyle = 'rgba(0,0,0,0.9)'; for (let yy = 0; yy < H * 0.45; yy += 9) for (let xx = W * 0.52; xx < W - 80; xx += 9) { const rr = 3.4 * (0.5 + 0.5 * Math.sin(xx * 0.011 + yy * 0.017) * Math.cos(yy * 0.006)); bg.beginPath(); bg.arc(xx, yy + 40, Math.max(0.2, rr), 0, 6.283); bg.fill(); }
      g.save(); g.globalAlpha = 0.055; g.filter = 'blur(1.6px)'; g.translate(W, 0); g.scale(-1, 1); g.drawImage(b, 0, 0); g.restore();
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
    const w = o.w ?? 1.0, h = w * asp;
    const geo = new THREE.PlaneGeometry(w, h, 40, Math.round(40 * asp)); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / w, y = p.getY(i) / h; p.setZ(i, 0.0018 * (1 + Math.sin(x * 3.1 + (o.seed ?? 3)) * Math.cos(y * 2.3)) + 0.012 * (x * x) + 0.003 * (y + 0.5) * (y + 0.5)); }
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, alphaMap: alpha, transparent: false, alphaTest: 0.5, roughness: 0.86, sheen: 0.3, sheenRoughness: 0.9,
      normalMap: creaseNormal, normalScale: new THREE.Vector2(0.22, 0.22), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    const g = new THREE.Group(); g.add(mesh); g.visible = false; scene.add(g);
    // a page point (u across, v down, 0..1) in world space
    const at = (u, v) => { g.updateMatrixWorld(true); return new THREE.Vector3((u - 0.5) * w, (0.5 - v) * h, 0.01).applyMatrix4(mesh.matrixWorld); };
    return { g, mesh, mat, w, h, meta: cv_meta, at };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // the bill: thermal paper (cool white, a faint sheen), fixed 30-character rows in mono, a toothed tear edge at the
  // top. The strip is a ribbon that follows path(s) -> { p, side, up } for s from 0 (the torn top) to len.
  const RW0 = 0.2, RPX = 480, ROW0 = 0.085;          // strip width (world), texture px across, row pitch (world), at scale 1
  function receipt(rows, o = {}) {
    const sc = o.scale ?? 1, RW = RW0 * sc, ROW = ROW0 * sc, PPU = RPX / RW;    // texture px per world unit
    const len = o.len ?? 9 * sc, Hpx = Math.min(8192, Math.round(len * PPU));     // past the end: blank paper (clamped)
    const c = document.createElement('canvas'); c.width = RPX; c.height = Hpx; const g = c.getContext('2d');
    for (let y = 0; y < Hpx; y += RPX * 1.6) g.drawImage(pCol, 0, (y / 7) % 400, 600, 900, 0, y, RPX, RPX * 1.6);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#f1f3f4'; g.fillRect(0, 0, RPX, Hpx); g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, RPX, Hpx);
    const rowY = [];
    let y = 70;                                      // texture px: 30 mono characters fill the width
    const ink = 'rgba(28,28,32,0.88)';
    rows.forEach((r, i) => {
      if (r.gap) { rowY.push(y); y += r.gap; return; }               // blank paper between rows (the backdrop)
      g.fillStyle = ink;
      if (r.head) { g.font = '700 36px "JetBrains Mono"'; g.textAlign = 'center'; g.fillText(r.text, RPX / 2, y); g.textAlign = 'left';
        g.fillRect(RPX * 0.08, y + 14, RPX * 0.84, 2); rowY.push(y); y += 66; return; }
      g.font = '500 23.5px "JetBrains Mono"';
      const s = r.label + ' ' + '.'.repeat(Math.max(2, 30 - r.label.length - r.price.length - 2)) + ' ' + r.price;
      g.fillText(s, RPX * 0.07, y); rowY.push(y); y += 42;
    });
    // flip: the printed block turned end for end, so the text reads upright to someone facing the printer (the strip
    // hangs down its front and runs off along the desk); the tear stays at the free end
    if (o.flip) {
      const yEnd = y + 20, t = document.createElement('canvas'); t.width = RPX; t.height = yEnd; t.getContext('2d').drawImage(c, 0, 0);
      g.save(); g.translate(0, yEnd); g.scale(1, -1); g.drawImage(t, 0, 0); g.restore();
      for (let i = 0; i < rowY.length; i++) rowY[i] = yEnd - rowY[i] + 10;
    }
    // the tear edge at the top: teeth in the alpha
    const a = document.createElement('canvas'); a.width = 64; a.height = Math.round(64 * Hpx / RPX); const ag = a.getContext('2d');
    ag.fillStyle = '#fff'; ag.fillRect(0, 0, a.width, a.height); ag.fillStyle = '#000';
    for (let x = 0; x < 64; x += 4) { ag.beginPath(); ag.moveTo(x, 0); ag.lineTo(x + 2, 3.2); ag.lineTo(x + 4, 0); ag.fill(); }
    // widen: blank paper on both sides of the printed column (the backdrop must cover all three rings); the text keeps
    // its size and its place in the middle
    const k = o.widen ?? 1; let tc = c;
    if (k > 1) {
      tc = document.createElement('canvas'); tc.width = Math.round(RPX * k); tc.height = Hpx; const g2 = tc.getContext('2d');
      for (let y = 0; y < Hpx; y += RPX * 1.6) for (let x = 0; x < tc.width; x += RPX) g2.drawImage(pCol, 0, (y / 7 + x) % 400, 600, 900, x, y, RPX, RPX * 1.6);
      g2.globalCompositeOperation = 'multiply'; g2.fillStyle = '#f1f3f4'; g2.fillRect(0, 0, tc.width, Hpx); g2.globalCompositeOperation = 'source-over';
      g2.fillStyle = 'rgba(255,255,255,0.35)'; g2.fillRect(0, 0, tc.width, Hpx);
      g2.drawImage(c, (tc.width - RPX) / 2, 0);
    }
    const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
    const atex = new THREE.CanvasTexture(a);
    const N = o.segs ?? 360, pos = new Float32Array((N + 1) * 2 * 3), uv = new Float32Array((N + 1) * 2 * 2), idx = [];
    for (let i = 0; i <= N; i++) { if (i < N) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, alphaMap: atex, alphaTest: 0.5, roughness: 0.5, sheen: 0.5, sheenRoughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.4,
      normalMap: fineNormal, normalScale: new THREE.Vector2(0.15, 0.15), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.visible = false; scene.add(mesh);
    const v3 = new THREE.Vector3();
    // shape the strip: s0..s1 of the paper (world length from the torn top) along path(s)
    function shape(path, s0, s1) {
      mesh.visible = s1 > s0 + 0.001;
      for (let i = 0; i <= N; i++) {
        const s = lerp(s0, s1, i / N), q = path(s);
        const hw = RW * k / 2, sx = q.side[0] * hw, sy = q.side[1] * hw, sz = q.side[2] * hw;
        pos.set([q.p[0] - sx, q.p[1] - sy, q.p[2] - sz, q.p[0] + sx, q.p[1] + sy, q.p[2] + sz], i * 6);
        const v = 1 - s / (Hpx / PPU);
        uv.set([0, v, 1, v], i * 4);
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.uv.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
    }
    // world point of a row (its centre line on the strip) for leaders and stamps
    const rowS = (i) => rowY[i] / PPU;
    return { mesh, mat, shape, rowS, len: Hpx / PPU, RW, RWfull: RW * k, PPU, v3, tex };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // ink decals: a stamp, the seal, a ballpoint mark; reveal 0..1 either fades/slams (stamps) or draws around the
  // ellipse from a start angle (the pen circle), or wipes left to right (strike-through, handwriting)
  const inkCache = {};
  async function decal(name, w, o = {}) {
    const img = inkCache[name] || (inkCache[name] = await loadImg(`/scene/cut/ink_${name}.png`));
    const t = new THREE.Texture(img); t.needsUpdate = true; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const h = w * img.height / img.width;
    const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: o.metal ? 0.3 : 0.8, metalness: o.metal ? 0.85 : 0, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide });
    mat.userData.u = { uRev: { value: 1 }, uMode: { value: o.mode ?? 0 }, uA0: { value: o.a0 ?? 0 }, uRecol: { value: new THREE.Vector4(0, 0, 0, 0) } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, mat.userData.u);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRev, uMode, uA0; uniform vec4 uRecol;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          if (uMode > 0.5 && uMode < 1.5) { vec2 d = vMapUv - 0.5; float a = mod(atan(d.y, d.x) - uA0 + 6.2831853, 6.2831853) / 6.2831853; if (a > uRev) discard; }
          if (uMode > 1.5) { if (vMapUv.x > uRev) discard; }
          diffuseColor.rgb = mix(diffuseColor.rgb, uRecol.rgb, uRecol.a);`);
    };
    mat.customProgramCacheKey = () => 'pvink';
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.visible = false; mesh.renderOrder = 3;
    return { mesh, mat, w, h, set: (rev, alpha = 1) => { mat.userData.u.uRev.value = rev; mat.opacity = alpha; mesh.visible = alpha > 0.004 && rev > 0.001; } };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // the dust a slam kicks out: soft motes that fly outward from the edges and settle
  const dustTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,248,235,0.9)'); gr.addColorStop(1, 'rgba(255,248,235,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const ND = 70, dGeo = new THREE.BufferGeometry(), dPos = new Float32Array(ND * 3);
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ map: dustTex, size: 0.034, transparent: true, depthWrite: false, opacity: 0.8, blending: THREE.AdditiveBlending }));
  dust.visible = false; dust.frustumCulled = false; scene.add(dust);
  // u frames after the impact of a sheet of size (w, h) at centre c lying on the floor at y
  function dustRing(c, w, h, y, u) {
    if (u < 0 || u > 26) { dust.visible = false; return; }
    dust.visible = true;
    for (let i = 0; i < ND; i++) {
      const side = i % 4, t = hsh(i, 1) - 0.5;
      let x = side < 2 ? t * w : (side === 2 ? -1 : 1) * w / 2, z = side >= 2 ? t * h : (side === 0 ? -1 : 1) * h / 2;
      const nx = side >= 2 ? (side === 2 ? -1 : 1) : 0, nz = side < 2 ? (side === 0 ? -1 : 1) : 0;
      const sp = 0.25 + hsh(i, 2) * 0.6, d = sp * (1 - Math.exp(-u / 6)) * 0.55;
      dPos.set([c[0] + x + nx * d + (hsh(i, 4) - 0.5) * 0.04, y + 0.004 + (1 - Math.exp(-u / 4)) * 0.05 * hsh(i, 3) * Math.exp(-u / 18), c[2] + z + nz * d + (hsh(i, 5) - 0.5) * 0.04], i * 3);
    }
    dGeo.attributes.position.needsUpdate = true;
    dust.material.opacity = 0.22 * Math.exp(-u / 8);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // a slit of white light in the floor, with its own light shining up
  const slit = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  slit.rotation.x = -Math.PI / 2; slit.visible = false; scene.add(slit);
  const slitLight = new THREE.RectAreaLight(0xfff4e6, 0, 1, 0.06); slitLight.rotation.x = Math.PI / 2; scene.add(slitLight);
  function setSlit(x, y, z, w, open) {
    slit.visible = open > 0.01; slit.position.set(x, y + 0.002, z); slit.scale.set(w, Math.max(0.001, 0.05 * open), 1);
    slitLight.position.set(x, y + 0.01, z); slitLight.width = w; slitLight.height = 0.05 * open; slitLight.intensity = 6 * open;
    slitLight.lookAt(x, y + 5, z);
  }

  // the lab desk: a walnut top (ambientCG Wood026, CC0), varnished
  const [wc, wn, wr] = await Promise.all(['Color', 'NormalGL', 'Roughness'].map((m) => loadImg(`/scene/tex/Wood026/Wood026_2K-JPG_${m}.jpg`)));
  const wt = (img, srgb) => { const t = texOf(img, srgb, 1.2); return t; };
  const desk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 3.6), new THREE.MeshPhysicalMaterial({ map: wt(wc, true), normalMap: wt(wn, false), roughnessMap: wt(wr, false),
    roughness: 0.62, clearcoat: 0.35, clearcoatRoughness: 0.35, normalScale: new THREE.Vector2(0.6, 0.6) }));
  desk.receiveShadow = true; desk.castShadow = true; desk.visible = false; scene.add(desk);
  // a small thermal receipt printer: warm grey plastic, a dark paper slot, one green light
  const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
  const printer = new THREE.Group();
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.2, 0.36, 5, 0.05), new THREE.MeshPhysicalMaterial({ color: 0xd8d3c8, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.5 }));
  shell.position.y = 0.1; shell.castShadow = shell.receiveShadow = true;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.03), new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.8 }));
  slot.position.set(0, 0.2, -0.04);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), new THREE.MeshBasicMaterial({ color: 0x5dff8a, toneMapped: false }));
  led.position.set(0.17, 0.155, 0.181);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.03, 0.2, 3, 0.012), new THREE.MeshPhysicalMaterial({ color: 0x2a2a2e, roughness: 0.35, clearcoat: 0.6 }));
  lid.position.set(0, 0.205, 0.07);
  printer.add(shell, slot, led, lid); printer.visible = false; scene.add(printer);
  // a sticky note (the paper scan, tinted yellow, a darker glue band), written on in pen; set(k) writes it on line by
  // line. Its lower half lifts off the page a little, the way a used note does.
  function note(lines, o = {}) {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
    const size = o.size ?? 74, ink = o.ink ?? '#a8231c', col = o.color ?? '#f7dc6a';
    let last = -1;
    function draw(k) {
      g.globalCompositeOperation = 'source-over'; g.drawImage(pCol, (o.seed ?? 0) * 37 % 300, 40, 700, 700, 0, 0, S, S);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, S, S);
      const band = g.createLinearGradient(0, 0, 0, S * 0.2); band.addColorStop(0, 'rgba(196,160,60,0.35)'); band.addColorStop(1, 'rgba(196,160,60,0)');
      g.fillStyle = band; g.fillRect(0, 0, S, S * 0.2);
      const sh = g.createLinearGradient(0, S * 0.5, 0, S); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(210,170,70,0.25)');
      g.fillStyle = sh; g.fillRect(0, S * 0.5, S, S * 0.5);
      g.globalCompositeOperation = 'source-over';
      g.font = `600 ${size}px "Caveat"`; g.fillStyle = ink; g.textBaseline = 'alphabetic';
      const lh = size * 1.02, y0 = S / 2 - (lines.length - 1) * lh / 2 + size * 0.3 + (o.dy ?? 0);
      const widths = lines.map((l) => g.measureText(l).width), total = widths.reduce((x, y) => x + y, 0);
      let budget = k * total;
      lines.forEach((l, i) => {
        const w = widths[i], x = (o.align === 'left' ? 54 : (S - w) / 2) + (i % 2 ? 8 : -4), y = y0 + i * lh, show = Math.max(0, Math.min(w, budget)); budget -= w;
        if (show <= 0) return;
        g.save(); g.translate(x, y); g.rotate(-0.035 + (i % 2) * 0.02); g.beginPath(); g.rect(-10, -size, show + 20, size * 1.5); g.clip();
        g.fillText(l, 0, 0); g.globalAlpha = 0.25; g.fillText(l, 0.8, 0.5); g.restore();
      });
      tex.needsUpdate = true;
    }
    const w = o.w ?? 0.3, geo = new THREE.PlaneGeometry(w, w, 16, 16), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / w, x = p.getX(i) / w; p.setZ(i, 0.06 * w * Math.max(0, 0.1 - y) ** 2 * 4 + 0.01 * w * x * x); }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, normalMap: fineNormal, normalScale: new THREE.Vector2(0.12, 0.12), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    const grp = new THREE.Group(); grp.add(mesh); grp.visible = false; scene.add(grp);
    draw(0);
    return { g: grp, mesh, w, set(k) { const q = Math.round(Math.max(0, Math.min(1, k)) * 60) / 60; if (q !== last) { last = q; draw(q); } } };
  }

  // Paper #137: a printed title page (bright stock from the paper scan, laser-black type), the byline already set
  function titlePage(o = {}) {
    const W = 1275, H = 1650, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.drawImage(pCol, 0, 0, W, H); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#fbf9f4'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    const ink = '#17161a', soft = '#4a4850', mx = 120, cw = W - 2 * mx;
    const track = (px) => { try { g.letterSpacing = px + 'px'; } catch (e) { /* */ } };
    const center = (t, y, font, col = ink) => { g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.fillText(t, W / 2, y); g.textAlign = 'left'; };
    g.font = `500 22px "JetBrains Mono"`; g.fillStyle = soft; track(3); g.fillText('PICASSO LAB  ·  PAPER #137', mx, 96); g.textAlign = 'right'; g.fillText('2026', W - mx, 96); g.textAlign = 'left'; track(0);
    g.fillStyle = ink; g.fillRect(mx, 116, cw, 2);
    center('Fast, Cheap, and Possible:', 236, `600 66px ${NEWS}`);
    center('The Next Few Thousand Days', 318, `600 66px ${NEWS}`);
    // the byline: "You" is measured so the red pen can find it
    g.font = `400 44px ${NEWS}`; const A = 'You', B = 'Yufei Ding', sup = '1', gap = 90;
    const wa = g.measureText(A).width, wb = g.measureText(B).width; g.font = `400 26px ${NEWS}`; const ws = g.measureText(sup).width;
    const tot = wa + ws + gap + wb + ws, x0 = (W - tot) / 2, yb = 420;
    g.fillStyle = ink; g.font = `400 44px ${NEWS}`; g.fillText(A, x0, yb); g.fillText(B, x0 + wa + ws + gap, yb);
    g.font = `400 26px ${NEWS}`; g.fillText(sup, x0 + wa + 2, yb - 20); g.fillText(sup, x0 + wa + ws + gap + wb + 2, yb - 20);
    const you = [x0, yb - 40, wa, 52];
    center('¹ Picasso Lab, UC San Diego', 474, `italic 400 30px ${NEWS}`, soft);
    // abstract, justified
    const para = (txt, x, y, w, size, lh, font) => { g.font = font; g.fillStyle = ink; const words = txt.split(' '); let line = [];
      const flush = (last) => { const t = line.join(' '); if (last || line.length < 2) { g.fillText(t, x, y); } else { const sw = line.reduce((q, wd) => q + g.measureText(wd).width, 0), sp = (w - sw) / (line.length - 1); let xx = x; for (const wd of line) { g.fillText(wd, xx, y); xx += g.measureText(wd).width + sp; } } y += lh; line = []; };
      for (const wd of words) { const t = [...line, wd].join(' '); if (g.measureText(t).width > w && line.length) flush(false); line.push(wd); }
      if (line.length) flush(true); return y; };
    center('Abstract', 560, `600 32px ${NEWS}`);
    let y = para('Everyone is predicting what AI will do next. Somebody has to make it fast, cheap and possible. Over some 4,700 days and 136 papers, our lab has worked on the compilers, systems and chips underneath it all, with one cat consulted throughout. This paper has not been written yet. Its first author is still deciding. We propose that it is you.',
      mx + 70, 610, cw - 140, 28, 40, `italic 400 28px ${NEWS}`);
    // two columns of body text
    const colW = (cw - 50) / 2; y += 40;
    g.font = `600 28px ${NEWS}`; g.fillText('1   Introduction', mx, y); g.fillText('2   What you would work on', mx + colW + 50, y); y += 46;
    const body = 'The bill always arrives. Every prediction in this field assumes a machine that can run it, and somebody has to build that machine: the compiler that maps a model onto a chip, the runtime that keeps a thousand GPUs busy, the hardware that has not been designed yet, and the data that has to move between all of them, which often costs more than the arithmetic. We have spent a decade on these questions and found that they never get smaller, only more interesting. ';
    para(body + body.slice(0, 260), mx, y, colW, 22, 33, `400 22px ${NEWS}`);
    para('Quantum compilers and architectures. Systems for large language model serving and training. GPU kernels and the people who time them. Accelerators for workloads that do not exist yet. Milk tea, in moderation. Our group meeting is Friday; the snacks are real and so are the deadlines. ' + body.slice(0, 380), mx + colW + 50, y, colW, 22, 33, `400 22px ${NEWS}`);
    g.font = `400 20px ${NEWS}`; g.fillStyle = soft; g.textAlign = 'center'; g.fillText('1', W / 2, H - 70); g.textAlign = 'left';
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
    const w = o.w ?? 1.3, h = w * H / W, geo = new THREE.PlaneGeometry(w, h, 32, 40), pp = geo.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) / w, yy = pp.getY(i) / h; pp.setZ(i, 0.004 + 0.016 * x * x + 0.01 * Math.max(0, yy - 0.3) ** 2); }
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.8, sheen: 0.25, sheenRoughness: 0.9, normalMap: fineNormal, normalScale: new THREE.Vector2(0.1, 0.1), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    const grp = new THREE.Group(); grp.add(mesh); grp.visible = false; scene.add(grp);
    const at = (u, v) => { grp.updateMatrixWorld(true); return new THREE.Vector3((u - 0.5) * w, (0.5 - v) * h, 0.01).applyMatrix4(mesh.matrixWorld); };
    return { g: grp, mesh, w, h, at, meta: { you, W, H } };
  }

  // the lab's logo in 3D: the three glass rings (physics, computer science, maths) with their own artwork inside,
  // embossed, the two grey links, the PICASSO wordmark. Positions are measured from home/static/PicassoLab-Logo.png
  // (1168 x 815 px); s = world units per logo pixel.
  async function logo3D(o = {}) {
    const s = o.s ?? 1.9 / 1168, C0 = [584, 407], P = (x, y) => [(x - C0[0]) * s, (C0[1] - y) * s];
    const tex = async (n, srgb = true) => { const im = await loadImg(`/scene/cut/${n}.png`); const t = new THREE.Texture(im); t.needsUpdate = true; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const grp = new THREE.Group(); grp.visible = false; scene.add(grp);
    const parts = { rings: [], discs: [], links: [] };
    const RINGS = [{ n: 'logo_phys', c: [203, 433], col: 0x2f8ee6 }, { n: 'logo_cs', c: [573.5, 208], col: 0x8bd04e }, { n: 'logo_math', c: [962, 422], col: 0xe8262c }];
    for (const r of RINGS) {
      const [x, y] = P(...r.c), R = 186 * s;
      const m = new THREE.Mesh(new THREE.TorusGeometry(R, 13.5 * s, 48, 180), new THREE.MeshPhysicalMaterial({ color: r.col, emissive: r.col, emissiveIntensity: 0.22, roughness: 0.12, metalness: 0.05,
        clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.4 }));
      m.castShadow = true; m.position.set(x, y, 0); grp.add(m); parts.rings.push({ m, home: [x, y, 0] });
      const map = await tex(r.n), bump = await tex(r.n + '_h', false);
      const d = new THREE.Mesh(new THREE.PlaneGeometry(340 * s, 340 * s), new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 2.2, roughness: 0.55, metalness: 0.1, transparent: true, alphaTest: 0.02 }));
      d.position.set(x, y, -0.004); grp.add(d); parts.discs.push({ m: d, home: [x, y, -0.004] });
    }
    const linkMat = new THREE.MeshPhysicalMaterial({ color: 0x8d8f96, roughness: 0.3, metalness: 0.75, clearcoat: 0.6 });
    for (const [a, b] of [[0, 1], [1, 2]]) {
      const A = RINGS[a].c, B = RINGS[b].c, [ax, ay] = P(...A), [bx, by] = P(...B), ang = Math.atan2(by - ay, bx - ax), dist = Math.hypot(bx - ax, by - ay);
      const len = dist - 2 * 186 * s + 0.03, mx = (ax + bx) / 2, my = (ay + by) / 2;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(9 * s, 9 * s, len, 24), linkMat); m.rotation.z = ang - Math.PI / 2; m.position.set(mx, my, -0.006);
      m.castShadow = true; grp.add(m); parts.links.push({ m, len });
    }
    const wm = await tex('logo_word_iv'), wb = await tex('logo_word_h', false), [wx, wy] = P(600, 656);
    const word = new THREE.Mesh(new THREE.PlaneGeometry(540 * s, 112 * s), new THREE.MeshStandardMaterial({ map: wm, bumpMap: wb, bumpScale: 3, roughness: 0.4, metalness: 0.2, transparent: true, alphaTest: 0.02 }));
    word.position.set(wx, wy, 0); grp.add(word); parts.word = { m: word, home: [wx, wy, 0] };
    return { g: grp, parts, s };
  }

  return { note, titlePage, logo3D, clipping, receipt, decal, dustRing, setSlit, desk, printer, RW: RW0, ROW: ROW0, fineNormal, creaseNormal };
}
