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
  // a torn edge: the outline wanders (two octaves), with a short fibrous fringe that lets the light through
  function deckleAlpha(w, h, seed, inset = 0.035) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const m = Math.min(w, h) * inset, pts = [], N = 260;
    const edge = (i, n, a, b) => a + (b - a) * (i / n);
    const jit = (i, side) => (Math.sin(i * 0.11 + seed + side) * 0.55 + Math.sin(i * 0.43 + seed * 2 + side) * 0.3 + (hsh(i, seed, side) - 0.5) * 0.35) * m * 0.5;
    for (let i = 0; i < N; i++) pts.push([edge(i, N, m, w - m), m + jit(i, 1)]);
    for (let i = 0; i < N; i++) pts.push([w - m + jit(i, 2), edge(i, N, m, h - m)]);
    for (let i = 0; i < N; i++) pts.push([edge(i, N, w - m, m), h - m + jit(i, 3)]);
    for (let i = 0; i < N; i++) pts.push([m + jit(i, 4), edge(i, N, h - m, m)]);
    const path = (dx) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y) : g.moveTo(x + dx, y))); g.closePath(); };
    g.filter = 'blur(0.8px)'; g.fillStyle = '#fff'; path(0); g.fill(); g.filter = 'none';
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.userData = { pts, w, h }; return t;
  }

  // a clipping lying on the floor: quote set in Fraunces between red-ink quote marks
  function clipping(q, o = {}) {
    const W = 1600, mg = document.createElement('canvas').getContext('2d');
    const nLines = (s, font) => { if (!s) return 0; mg.font = font; let n = 1, line = ''; for (const wd of s.split(' ')) { const tt = line ? line + ' ' + wd : wd; if (mg.measureText(tt).width > W - 300 && line) { n++; line = wd; } else line = tt; } return n; };
    const fsz = q.size || 138, lsz = q.leadSize || 74;
    const need = 350 + nLines(q.lead, `italic 500 ${lsz}px "Fraunces"`) * lsz * 1.3 + (q.lead ? 20 : 0) + nLines(q.main, `800 ${fsz}px "Fraunces"`) * fsz * 1.08 + 170;
    const asp = o.asp ?? need / W, H = Math.round(W * asp);
    const cv_meta = {};
    const alpha = deckleAlpha(512, Math.round(512 * asp), o.seed ?? 3);
    const cv = newsprintCanvas(W, H, (g) => {
      const x0 = 150, wMax = W - 300;
      let y = 230;
      const wrap = (s, font, size) => { g.font = font; const words = s.split(' '), lines = []; let line = '';
        for (const wd of words) { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > wMax && line) { lines.push(line); line = wd; } else line = tt; }
        if (line) lines.push(line); return lines; };
      // opening quote mark in red ink
      g.fillStyle = '#b3261e'; g.font = '800 300px "Fraunces"'; g.fillText('“', x0 - 40, y + 120);
      y += 120;
      g.fillStyle = '#1d1a16';
      if (q.lead) { const f = `italic 500 ${q.leadSize || 74}px "Fraunces"`; for (const l of wrap(q.lead, f, q.leadSize || 74)) { g.font = f; g.fillText(l, x0, y); y += (q.leadSize || 74) * 1.3; } y += 20; }
      const fs = q.size || 138, f2 = `800 ${fs}px "Fraunces"`; const lines = wrap(q.main, f2, fs);
      const boxes = [];
      for (const l of lines) { g.font = f2; g.fillText(l, x0, y + fs * 0.78); boxes.push([x0, y, g.measureText(l).width, fs]); y += fs * 1.08; }
      // closing quote mark
      // closing mark: its top level with the cap height of the last line, just after its last word
      g.fillStyle = '#b3261e'; g.font = '800 300px "Fraunces"'; const last = boxes[boxes.length - 1];
      g.fillText('”', Math.min(W - 200, last[0] + last[2] + 22), last[1] + fs * 0.06 + 300 * 0.74);
      cv_meta.lines = boxes; cv_meta.H = H; cv_meta.W = W;
      // the torn edge shows the paper's white core: a thin fibrous rim just inside the outline
      const { pts, w: aw, h: ah } = alpha.userData, sx = W / aw, sy = H / ah;
      g.save(); g.strokeStyle = 'rgba(255,252,245,0.85)'; g.lineWidth = 7; g.filter = 'blur(1.5px)';
      g.beginPath(); pts.forEach(([x, yy], i) => (i ? g.lineTo(x * sx, yy * sy) : g.moveTo(x * sx, yy * sy))); g.closePath(); g.stroke(); g.restore();
    });
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
    const w = o.w ?? 1.0, h = w * asp;
    const geo = new THREE.PlaneGeometry(w, h, 40, Math.round(40 * asp)); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / w, y = p.getY(i) / h; p.setZ(i, 0.006 * (1 + Math.sin(x * 3.1 + (o.seed ?? 3)) * Math.cos(y * 2.3)) + 0.022 * (x * x) + 0.008 * (y + 0.5) * (y + 0.5)); }
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
      g.fillStyle = ink;
      if (r.head) { g.font = '700 36px "JetBrains Mono"'; g.textAlign = 'center'; g.fillText(r.text, RPX / 2, y); g.textAlign = 'left';
        g.fillRect(RPX * 0.08, y + 14, RPX * 0.84, 2); rowY.push(y); y += 66; return; }
      g.font = '500 23.5px "JetBrains Mono"';
      const s = r.label + ' ' + '.'.repeat(Math.max(2, 30 - r.label.length - r.price.length - 2)) + ' ' + r.price;
      g.fillText(s, RPX * 0.07, y); rowY.push(y); y += 42;
    });
    // the tear edge at the top: teeth in the alpha
    const a = document.createElement('canvas'); a.width = 64; a.height = Math.round(64 * Hpx / RPX); const ag = a.getContext('2d');
    ag.fillStyle = '#fff'; ag.fillRect(0, 0, a.width, a.height); ag.fillStyle = '#000';
    for (let x = 0; x < 64; x += 4) { ag.beginPath(); ag.moveTo(x, 0); ag.lineTo(x + 2, 3.2); ag.lineTo(x + 4, 0); ag.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
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
        const hw = RW / 2, sx = q.side[0] * hw, sy = q.side[1] * hw, sz = q.side[2] * hw;
        pos.set([q.p[0] - sx, q.p[1] - sy, q.p[2] - sz, q.p[0] + sx, q.p[1] + sy, q.p[2] + sz], i * 6);
        const v = 1 - s / (Hpx / PPU);
        uv.set([0, v, 1, v], i * 4);
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.uv.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
    }
    // world point of a row (its centre line on the strip) for leaders and stamps
    const rowS = (i) => rowY[i] / PPU;
    return { mesh, mat, shape, rowS, len: Hpx / PPU, RW, PPU, v3, tex };
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

  return { clipping, receipt, decal, dustRing, setSlit, RW: RW0, ROW: ROW0, fineNormal, creaseNormal };
}
