// qb_world.js - the painted 3D set and cast for "The Convoy". Built once in the npr layer's init.
// Every surface goes through runtime/npr (cel ramp + engraving + watercolour + ink); textures are
// painted with p5.brush once (bakeBrushTexture); the tweezer light pedestals are a custom glass-layer
// shader (translucent light with engraved ray lines), depth-tested against the G-buffer by hand.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createNPR, LAYER, rgb } from '/pv/runtime/npr/npr.js';
import { bakeBrushTexture } from '/pv/runtime/npr/brush.js';
import { NOISE, SURFACE_VERT } from '/pv/runtime/npr/glsl.js';
import { hex } from '/pv/runtime/npr/looks.js';
import * as A from './qb_anim.js';

const TAU = Math.PI * 2;

export const PAL = {
  paper: '#f3ebdc', ink: '#2b2233',
  bench: 0xd39a64, slabSide: 0x2d466a, rim: 0xe3aa48,
  atom: 0xfff3d6,
  pip: 0xee5a44, pipLeg: 0xa7b7d6, brass: 0xe8b04a, lead: 0x3a3440, wood: 0xf2c885,
  rook: 0x2ea597, rookDark: 0x1f5a55, roof: 0xdc473d, wheel: 0xdc473d, iron: 0x3b3552, plate: 0xfff0dc,
  tick: 0xf3b83f, dial: 0xfff8e8, glove: 0xfffbf2, shoe: 0xe2553f, baton: 0xfff6e6, handRed: 0xd8403a,
  steam: 0xfffaf0, podium: 0xb9603f,
  tw: 0x8ff0e4, aod: 0xffbd3e, ryd: 0xff4f8b, violet: 0x9a6ae0,
  sloBody: 0xd9d0bf, sloShell: 0xb09fca,   // the baseline snail: dull putty + slate (the heroes are saturated)
};

// The fused look: soft picture-book watercolour, P(doom)-weight plum ink on silhouettes, engraved
// burin hatching in the core shadows, light engraved ruling in the dark washes of the backdrop.
export const LOOK = {
  extends: 'book',
  ink: hex(0x2b2233), hatchInk: hex(0x46365f), inkA: 0.93, selfInk: 0.15,
  lineW: 1.45, lineWShadow: 2.5, lineNoise: 0.55, wobA: 1.5, wobF: 0.016, dryInk: 0.28,
  hullW: 3.1, hullShadowW: 1.5,
  depthT: 0.03, normalT: 0.75, crease: 0.7,
  hatchPx: 9.5, hatchW: 1.3, hatchCut: 0.33, hatchGamma: 1.1, crossT: 0.7, crossW: 0.95, hatchA: 0.62,
  hatchWobble: 0.12, hatchSwell: 0.5,
  t1: 0.12, t2: 0.0, t3: -0.32, termSoft: 0.1, termNoise: 0.26,
  keyTint: hex(0xfff2de), shadeGlaze: hex(0xbdaee4), coreGlaze: hex(0x9887cc), reflTint: hex(0xffcfae), reflect: 0.45,
  skyFill: hex(0xe8e6ff), groundFill: hex(0xffe6cc),
  rim: 0.45, rimT: 0.6, rimTint: hex(0xfff2de),
  hi: 0.58, hiAmt: 0.9,
  shadowSoft: 0.14, shadowNoise: 0.45, shadowRadius: 2.2,
  bleed: 4.2, bleedFreq: 0.017, edgeDark: 1.35, edgeR: 6, gran: 0.5, flocc: 0.18, dryEdge: 0.55,
  sat: 1.2, value: 0.97,
  dofRange: 2.4, dofMax: 9, dofLines: 0.9, atmos: 0.14, atmosStart: 13, atmosEnd: 26, atmosCol: hex(0xfaeede),
  rule: 0.6, rulePx: 10, ruleTop: -0.12, ruleBot: -0.5, ruleWash: 0.95, ruleNoise: 0.18, ruleGap: 8, ruleInk: hex(0x3a3160),
  rayW: 1.2, beamLines: 0.7,
  glassA: 0.12, glassEdge: 1.0, glassGlint: 0.9,
  vignette: 0.12, grain: 0.022,
};

// ---- custom glass-layer shader: tweezer light pedestals -------------------------------------------------
const CONE_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uS; uniform float uBoilSeed;
${NOISE}
layout(location = 0) out vec4 oG;
in vec3 vWorldPos; in vec3 vObjPos; in vec3 vViewN; in vec3 vWorldN; in vec2 vUv; in float vViewZ;
uniform sampler2D tDepth; uniform vec3 uCol; uniform float uAmt; uniform float uSeed;
void main() {
  float u = vUv.x * 12. + uSeed;
  float fw = fwidth(u);                       // derivatives before any discard
  float sd = textureLod(tDepth, gl_FragCoord.xy / uRes, 0.).r;
  if (gl_FragCoord.z > sd + 2e-6) discard;
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vWorldN);
  float fac = abs(dot(N, V));
  float h = vUv.y;                            // 0 at the slab, 1 under the atom
  float n = vnoise(vec2(vUv.x * 9. + uSeed, h * 3. + uBoilSeed * 1.7));
  float fade = smoothstep(0., .5, h + (n - .5) * .25) * (.5 + .5 * h);
  float a = uAmt * fade * (.16 + .34 * fac);
  vec4 o = vec4(uCol * a, a);
  // engraved light rays along the pedestal (a plate draws light as a bundle of burin lines)
  float d = abs(fract(u) - .5);
  float ray = 1. - smoothstep(fw * .9, fw * 2.2 + .03, d);
  float la = clamp(uAmt * fade * ray * .55 * (.4 + .6 * fac), 0., 1.);
  vec3 lc = uCol * uCol * .62;
  o = vec4(lc * la + o.rgb * (1. - la), la + o.a * (1. - la));
  oG = o;
}`;

function coneMat(npr, color, amt, seed) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: SURFACE_VERT, fragmentShader: CONE_FRAG,
    uniforms: {
      uRes: npr.shared.uRes, uS: npr.shared.uS, uBoilSeed: npr.shared.uBoilSeed,
      tDepth: { value: npr.targets.gRT.depthTexture }, uCol: { value: new THREE.Vector3(...rgb(color)) },
      uAmt: { value: amt }, uSeed: { value: seed },
    },
    side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
}

// ---- p5.brush helpers -------------------------------------------------------------------------------------
function blob(brush, r, cx, cy, rx, ry, n = 22, j = 0.1) {
  brush.beginShape(0.4);
  for (let k = 0; k < n; k++) { const a = (k / n) * TAU, q = 1 + r.gauss(0, j); brush.vertex(cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q); }
  brush.endShape(true);
}
let brushesAdded = false;
export function addBrushes() {
  if (brushesAdded) return; brushesAdded = true;
  brush.add('inkpen', { type: 'default', weight: 3.2, scatter: 0.12, sharpness: 0.85, grain: 30, opacity: 235, spacing: 0.2, pressure: [1.15, 0.75], rotate: 'natural', noise: 0.1 });
  brush.add('bigink', { type: 'default', weight: 6, scatter: 0.2, sharpness: 0.8, grain: 30, opacity: 235, spacing: 0.2, pressure: [1.2, 0.7], rotate: 'natural', noise: 0.15 });
  brush.add('pencilo', { type: 'default', weight: 4.5, scatter: 0.5, sharpness: 0.4, grain: 12, opacity: 190, spacing: 0.3, pressure: [1.1, 0.85], rotate: 'natural', noise: 0.35 });
}

// ---- textures ------------------------------------------------------------------------------------------------
async function paintTextures(ctx) {
  const tex = {};
  // painted cyclorama: a warm lab at golden hour - apricot wall, two tall windows of pale sky with
  // clouds, a shelf of flasks between them, violet dusk pooling at the sides.
  {
    // painted cyclorama, two passes: (1) exact structural colour in Canvas2D, (2) p5.brush hand-painting
    // (clouds, glazes, splatter, ink on the mullions) baked on a transparent sheet and laid over it.
    const w = 4096, h = 1024, SILL = -2.3;
    const U = (u) => u * w, Y = (y) => ((11 - y) / 20) * h;   // backdrop spans world y -9..11
    const r = ctx.rng('backdrop');
    const base = document.createElement('canvas'); base.width = w; base.height = h;
    const g = base.getContext('2d');
    const grd = g.createLinearGradient(0, Y(11), 0, Y(SILL));
    const stops = [[11, '#5f55a8'], [5.4, '#8a70c4'], [3.6, '#c486c2'], [2.2, '#f096a2'], [0.9, '#f9b384'], [-0.6, '#ffd592'], [SILL, '#ffeec2']];
    for (const [y, c] of stops) grd.addColorStop((Y(y) - Y(11)) / (Y(SILL) - Y(11)), c);
    g.fillStyle = grd; g.fillRect(0, 0, w, Y(SILL) + 2);
    // sun + halo
    for (const [rr, a] of [[300, 0.18], [210, 0.3], [130, 1]]) { g.fillStyle = `rgba(255,246,206,${a})`; g.beginPath(); g.arc(U(0.43), Y(-0.5), rr, 0, TAU); g.fill(); }
    // two hill ranges (far pale, near deeper)
    const range = (b, amp, col, ph) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(-10, Y(SILL - 0.3));
      for (let k = 0; k <= 64; k++) { const x = (k / 64) * w; g.lineTo(x, Y(b + amp * (0.6 * Math.sin(k * 0.55 + ph) + 0.4 * Math.sin(k * 1.37 + ph * 2)) + r.gauss(0, 0.03))); }
      g.lineTo(w + 10, Y(SILL - 0.3)); g.closePath(); g.fill();
    };
    range(-1.35, 0.32, '#cda6cf', 0.4); range(-1.85, 0.24, '#9a7fc2', 2.3);
    // wall below the sill, sill, mullions, transom
    g.fillStyle = '#e48a66'; g.fillRect(0, Y(SILL), w, h - Y(SILL));
    g.fillStyle = '#c86f55'; g.fillRect(0, Y(SILL - 1.2), w, h - Y(SILL - 1.2));
    g.fillStyle = '#5a3748';
    g.fillRect(0, Y(SILL + 0.16), w, Y(SILL - 0.12) - Y(SILL + 0.16));
    for (let k = 0; k <= 16; k++) { const x = (k / 16) * w, ww = 22 + 4 * r(); g.fillRect(x - ww / 2, 0, ww, Y(SILL)); }
    g.fillRect(0, Y(4.0), w, Y(3.82) - Y(4.0));
    // potted fern + flask on the sill
    for (const [u, col] of [[0.21, '#4f9a78'], [0.66, '#58b3aa']]) {
      const cx = U(u), cy = Y(SILL + 0.16);
      g.fillStyle = col;
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.35; g.beginPath(); g.moveTo(cx, cy - 30); g.lineTo(cx + Math.cos(a) * 90 - 8, cy - 30 + Math.sin(a) * 90); g.lineTo(cx + Math.cos(a) * 90 + 8, cy - 30 + Math.sin(a) * 90); g.fill(); }
      g.fillStyle = '#c9674a'; g.beginPath(); g.moveTo(cx - 34, cy - 40); g.lineTo(cx + 34, cy - 40); g.lineTo(cx + 26, cy); g.lineTo(cx - 26, cy); g.fill();
    }
    const paint = await bakeBrushTexture(THREE, { width: w, height: h, seed: 21, key: 'backdrop-paint', background: '#ffffff' }, (p, brush) => {
      const gfx = p.createGraphics(w, h); gfx.pixelDensity(1); gfx.drawingContext.drawImage(base, 0, 0);
      p.push(); p.imageMode(p.CORNER); p.image(gfx, 0, 0, w, h); p.pop(); gfx.remove();
      brush.noStroke();
      // glazes in neighbouring hues only (no mud)
      for (const [y, col, op] of [[4.8, '#8f73c8', 90], [2.9, '#ea8fb2', 80], [1.5, '#f7a98a', 80]]) {
        brush.fill(col, op); brush.fillBleed(0.35, 'out'); brush.fillTexture(0.55, 0.45);
        for (let k = 0; k < 8; k++) blob(brush, r, U(k / 7 + r.gauss(0, 0.03)), Y(y + r.gauss(0, 0.2)), r.range(260, 420), r.range(40, 70), 20, 0.15);
      }
      // cumulus: cream tops over rose bellies
      const cloud = (cx, cy, sc) => {
        brush.fill('#f6a9bc', 210); brush.fillBleed(0.2, 'out'); brush.fillTexture(0.5, 0.4);
        for (let k = 0; k < 5; k++) blob(brush, r, cx + (k - 2) * 70 * sc, cy + 16 * sc, 80 * sc, 34 * sc, 16, 0.12);
        brush.fill('#fff8ec', 240); brush.fillBleed(0.15, 'out'); brush.fillTexture(0.45, 0.35);
        for (let k = 0; k < 5; k++) blob(brush, r, cx + (k - 2) * 62 * sc + r.gauss(0, 8), cy - (k % 2 ? 36 : 16) * sc, (70 + 20 * (k % 2)) * sc, 44 * sc, 16, 0.12);
      };
      for (const [u, y, sc] of [[0.1, 2.4, 1.2], [0.27, 1.0, 1.0], [0.56, 2.0, 1.3], [0.71, 0.5, 0.9], [0.86, 3.0, 1.1], [0.43, 4.6, 0.85], [0.35, 3.3, 0.7]]) cloud(U(u), Y(y), sc);
      // ink edges on the window frames (one side of each mullion, boiling line)
      brush.set('bigink', '#3a2230', 1.4);
      for (let k = 0; k <= 16; k++) { const x = (k / 16) * w + 12; brush.line(x, 4, x + r.gauss(0, 2), Y(SILL) - 4); }
      brush.line(4, Y(SILL + 0.16), w - 4, Y(SILL + 0.16) + r.gauss(0, 2));
      // splatter on the wall
      for (let k = 0; k < 50; k++) {
        brush.noStroke(); brush.fill(r.chance(0.5) ? '#a9553f' : '#7a4a70', r.range(70, 150)); brush.fillBleed(0.05); brush.fillTexture(0.3, 0.3);
        brush.circle(r.range(0, w), r.range(Y(SILL - 0.3), h - 10), r.range(2, 7), 0.5);
      }
    });
    tex.backdrop = paint;
  }

  // chip plate top: navy glass-ceramic, teal storage field with dotted trap sites, violet entanglement
  // zone (pooled edges), a fine engraved grid. Canvas top = back edge (z0), left = x0.
  const SW = 2048, SH = Math.round(2048 * (A.SLAB.z1 - A.SLAB.z0) / (A.SLAB.x1 - A.SLAB.x0));
  const sx = (x) => ((x - A.SLAB.x0) / (A.SLAB.x1 - A.SLAB.x0)) * SW, sz = (z) => ((z - A.SLAB.z0) / (A.SLAB.z1 - A.SLAB.z0)) * SH;
  const ppu = SW / (A.SLAB.x1 - A.SLAB.x0);
  tex.slab = await bakeBrushTexture(THREE, { width: SW, height: SH, seed: 5, key: 'slab', background: '#4b6e98' }, (p, brush, w, h) => {
    const r = ctx.rng('slabtex');
    brush.noStroke();
    for (let k = 0; k < 10; k++) { brush.fill(k % 2 ? '#2f4a74' : '#5a82ad', 150); brush.fillBleed(0.3); brush.fillTexture(0.7, 0.5); blob(brush, r, r.range(0, w), r.range(0, h), r.range(140, 320), r.range(60, 150), 18, 0.15); }
    // storage field: teal wash + glaze
    brush.wash('#3f7f93', 255);
    brush.polygon([[sx(-5.3), sz(-1.62)], [sx(0.42), sz(-1.64)], [sx(0.44), sz(1.62)], [sx(-5.3), sz(1.64)]]); brush.noWash();
    brush.fill('#56a3ad', 140); brush.fillBleed(0.2); brush.fillTexture(0.7, 0.6);
    for (let k = 0; k < 6; k++) blob(brush, r, sx(r.range(-5, 0)), sz(r.range(-1.4, 1.4)), ppu * r.range(0.6, 1.2), ppu * r.range(0.3, 0.6), 16, 0.15);
    // entanglement zone: violet wash, pooled darker rim, pale bloom in the middle
    brush.wash('#7c55c2', 255);
    brush.polygon([[sx(A.ZONE.x0), sz(A.ZONE.z0)], [sx(A.ZONE.x1), sz(A.ZONE.z0 + 0.03)], [sx(A.ZONE.x1 + 0.02), sz(A.ZONE.z1)], [sx(A.ZONE.x0 - 0.03), sz(A.ZONE.z1 - 0.02)]]); brush.noWash();
    brush.fill('#5b3a9e', 170); brush.fillBleed(0.08); brush.fillTexture(0.9, 0.95);
    brush.polygon([[sx(A.ZONE.x0), sz(A.ZONE.z0)], [sx(A.ZONE.x1), sz(A.ZONE.z0 + 0.03)], [sx(A.ZONE.x1 + 0.02), sz(A.ZONE.z1)], [sx(A.ZONE.x0 - 0.03), sz(A.ZONE.z1 - 0.02)]]);
    brush.fill('#b98ae6', 170); brush.fillBleed(0.3); brush.fillTexture(0.5, 0.3);
    blob(brush, r, sx((A.ZONE.x0 + A.ZONE.x1) / 2), sz(0.4), ppu * 1.3, ppu * 0.8, 20, 0.12);
    // fine engraved grid
    brush.set('inkpen', '#a9c8df', 0.45);
    for (let x = -6.5; x < 6.4; x += 0.45) brush.line(sx(x), 6, sx(x), h - 6);
    for (let z = -1.8; z < 2.0; z += 0.45) brush.line(6, sz(z), w - 6, sz(z));
    // dotted trap sites (storage)
    brush.set('inkpen', '#e6fbf5', 1.3);
    for (let rr = 0; rr < A.NROW; rr++) for (let c = 0; c < A.NCOL; c++) {
      const cx = sx(A.COLX(c)), cz = sz(A.ROWZ[rr]);
      for (let k = 0; k < 12; k++) { const a0 = (k / 12) * TAU, a1 = a0 + TAU / 26; brush.line(cx + Math.cos(a0) * 0.36 * ppu, cz + Math.sin(a0) * 0.36 * ppu, cx + Math.cos(a1) * 0.36 * ppu, cz + Math.sin(a1) * 0.36 * ppu); }
    }
    // dashed zone border
    brush.set('inkpen', '#f4e2ff', 1.5);
    const zb = [[A.ZONE.x0, A.ZONE.z0], [A.ZONE.x1, A.ZONE.z0], [A.ZONE.x1, A.ZONE.z1], [A.ZONE.x0, A.ZONE.z1], [A.ZONE.x0, A.ZONE.z0]];
    for (let s = 0; s < zb.length - 1; s++) {
      const [x0, z0] = zb[s], [x1, z1] = zb[s + 1], L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 0.22);
      for (let k = 0; k < n; k += 1) { const a = k / n, b = (k + 0.55) / n; brush.line(sx(lerp(x0, x1, a)), sz(lerp(z0, z1, a)), sx(lerp(x0, x1, b)), sz(lerp(z0, z1, b))); }
    }
  });
  tex.slabPpu = ppu;

  // bench: warm planks with grain
  tex.bench = await bakeBrushTexture(THREE, { width: 1024, height: 1024, seed: 9, key: 'bench', background: '#fbf1e2', wrap: true }, (p, brush, w, h) => {
    const r = ctx.rng('benchtex');
    brush.noStroke();
    for (let k = 0; k < 4; k++) {
      brush.fill(k % 2 ? '#f0d9b8' : '#f7e6cc', 140); brush.fillBleed(0.05); brush.fillTexture(0.5, 0.35);
      brush.polygon([[0, k * 256 + 4], [w, k * 256 + 2], [w, k * 256 + 252], [0, k * 256 + 254]]);
    }
    brush.set('inkpen', '#c49c76', 0.45);
    for (let k = 0; k < 36; k++) {
      const y = r.range(0, h), x0 = r.range(-100, w * 0.6), L = r.range(200, 700);
      brush.spline([[x0, y], [x0 + L * 0.5, y + r.gauss(0, 4)], [x0 + L, y + r.gauss(0, 3)]], 0.5);
    }
    brush.set('inkpen', '#9a6d4c', 0.8);
    for (let k = 1; k < 4; k++) brush.line(0, k * 256, w, k * 256);
  });
  tex.bench.repeat.set(8, 2.4);

  // loco cab side: window + brass nameplate engraved "Qubrio" (the one appearance of the name)
  tex.cab = await bakeBrushTexture(THREE, { width: 512, height: 512, seed: 3, key: 'cab', background: '#ffffff' }, (p, brush, w, h) => {
    brush.noStroke();
    brush.fill('#fff4dc', 230); brush.fillBleed(0.04); brush.fillTexture(0.3, 0.3);
    brush.polygon([[110, 60], [400, 60], [410, 250], [100, 250]]);
    brush.set('bigink', '#2b2233', 1.3); brush.noFill();
    brush.polygon([[110, 60], [400, 60], [410, 250], [100, 250]]);
    brush.noStroke(); brush.fill('#e8b04a', 240); brush.fillBleed(0.03); brush.fillTexture(0.4, 0.5);
    brush.polygon([[40, 318], [472, 318], [472, 452], [40, 452]]);
    brush.set('bigink', '#6a4020', 1.2); brush.noFill();
    brush.polygon([[40, 318], [472, 318], [472, 452], [40, 452]]);
  });
  {
    const c = tex.cab.userData.canvas, g = c.getContext('2d');
    g.save(); g.font = 'italic 400 118px "Instrument Serif"'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(90,50,20,0.9)'; g.fillText('Qubrio', 258, 392);
    g.fillStyle = 'rgba(255,236,190,0.55)'; g.fillText('Qubrio', 255, 388);
    g.restore(); tex.cab.needsUpdate = true;
  }

  // stopwatch dial: cream, 60 ticks (12 bold), a small red sector at the stop point
  tex.dial = await bakeBrushTexture(THREE, { width: 1024, height: 1024, seed: 8, key: 'dial', background: '#ffffff' }, (p, brush, w, h) => {
    const cx = 512, cy = 512;
    brush.noStroke(); brush.fill('#fff6e2', 220); brush.fillBleed(0.03); brush.fillTexture(0.35, 0.3);
    brush.circle(cx, cy, 500, 0.1);
    brush.fill('#ffd9a0', 90); brush.fillBleed(0.2); brush.fillTexture(0.5, 0.4);
    brush.circle(cx - 90, cy - 110, 260, 0.3);
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * TAU, big = k % 5 === 0;
      brush.set(big ? 'bigink' : 'inkpen', '#2b2233', big ? 1.5 : 1.0);
      const r0 = big ? 380 : 420, r1 = 470;
      brush.line(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0, cx + Math.sin(a) * r1, cy - Math.cos(a) * r1);
    }
  });
  // comic sunburst flat (pops up behind Tick on the slam): alternating warm wedges, watercolour
  tex.sun = await bakeBrushTexture(THREE, { width: 1024, height: 1024, seed: 12, key: 'sun', background: '#ffffff' }, (p, brush, w, h) => {
    const cx = 512, cy = 512, n = 22;
    brush.noStroke();
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU;
      brush.wash(k % 2 ? '#ffb13b' : '#ff6a4d', 255);
      brush.polygon([[cx, cy], [cx + Math.cos(a0) * 720, cy + Math.sin(a0) * 720], [cx + Math.cos(a1) * 720, cy + Math.sin(a1) * 720]]);
      brush.noWash();
    }
    brush.fill('#ffe27a', 200); brush.fillBleed(0.15); brush.fillTexture(0.5, 0.4); brush.circle(cx, cy, 190, 0.2);
    brush.fill('#fff4c4', 200); brush.fillBleed(0.1); brush.fillTexture(0.4, 0.3); brush.circle(cx, cy, 110, 0.2);
  });
  return tex;
}
const lerp = (a, b, t) => a + (b - a) * t;

/** A snail shell: a tube swept along a logarithmic spiral whose radius grows with the whorl, sized so that
 *  neighbouring whorls just touch (k = (1-e^-2πb)/(1+e^-2πb)). The aperture ends at angle `endA` (local xy),
 *  the inner whorls rise slightly towards +z like a low cone. uv.x runs along the coil (growth lines). */
function shellGeometry({ turns = 2.35, b = 0.17, Rout = 0.2, endA = -1.2, cone = 0.09, N = 180, M = 22 } = {}) {
  const thMax = turns * TAU, k = (1 - Math.exp(-TAU * b)) / (1 + Math.exp(-TAU * b));
  const off = endA - thMax;
  const P = (th) => { const R = Rout * Math.exp(b * (th - thMax)); return new THREE.Vector3(R * Math.cos(th + off), R * Math.sin(th + off), cone * (1 - th / thMax)); };
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const th = thMax * i / N;
    const R = Rout * Math.exp(b * (th - thMax)), r = Math.max(0.003, R * k * 1.04);
    const p = P(th), T = P(th + 0.01).sub(p).normalize();
    const Nn = new THREE.Vector3(-T.y, T.x, 0).normalize(), B = new THREE.Vector3().crossVectors(T, Nn);
    for (let j = 0; j <= M; j++) {
      const ph = TAU * j / M;
      const q = p.clone().addScaledVector(Nn, r * Math.cos(ph)).addScaledVector(B, r * Math.sin(ph));
      pos.push(q.x, q.y, q.z); uv.push(i / N * turns * 3, j / M);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = i * (M + 1) + j, b2 = a + M + 1;
    idx.push(a, a + 1, b2, b2, a + 1, b2 + 1);   // outward-facing winding
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---- build -------------------------------------------------------------------------------------------------------
export async function buildWorld(ctx, { renderer }, paperCanvas) {
  addBrushes();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.W / ctx.H, 1.2, 60);
  const npr = createNPR(renderer, ctx, { look: LOOK, paper: paperCanvas, samples: 4, shadowSize: 2048 });
  npr.setUnder(window.__pv.canvas);
  npr.setLight({ dir: [-0.5, 0.86, 0.62], target: [0.2, 0.4, 0], size: 8.5, dist: 22 });
  const tex = await paintTextures(ctx);

  const add = (geo, mo, ao = {}, pos = [0, 0, 0], rot = [0, 0, 0], parent = scene) => {
    const m = npr.add(new THREE.Mesh(geo, Array.isArray(mo) ? mo.map((o) => npr.surface(o)) : npr.surface(mo)), ao);
    m.position.set(...pos); m.rotation.set(...rot); parent.add(m); return m;
  };
  const cyl = (r0, r1, h, n = 40, open = false) => new THREE.CylinderGeometry(r0, r1, h, n, 1, open);

  // backdrop
  {
    const bd = npr.backdrop(tex.backdrop, { radius: 18, height: 20, y: -9, center: [0.6, 0, 0.5], arc: [Math.PI - 1.7, 3.4] });
    bd.geometry.dispose();
    bd.geometry = new THREE.CylinderGeometry(18, 18, 20, 240, 24, true, Math.PI - 1.7, 3.4);   // small triangles: no long-diagonal UV artefacts
    if (new URLSearchParams(location.search).get('bdflat')) bd.material.uniforms.uHasMap.value = 0;
    scene.add(bd);
  }

  // bench (planks) and chip plate with brass rim
  const bTop = { color: 0xe7ad72, map: tex.bench, hatchDir: [0, 0, 1], hatchDir2: [1, 0, 0.2], noiseScale: 0.5, spec: 0.2 };
  const bSide = { color: 0xb77a4c, hatchDir: [0, 1, 0] };
  const benchM = add(new THREE.BoxGeometry(40, 1, 9.5), [bSide, bSide, bTop, bSide, bSide, bSide], { outline: 1.2, cast: false }, [0, -A.SLAB.h - 0.5, 0.6]);
  const benchTopId = benchM.material[2].userData.nprId;
  const SWd = A.SLAB.x1 - A.SLAB.x0, SDp = A.SLAB.z1 - A.SLAB.z0, SCx = (A.SLAB.x0 + A.SLAB.x1) / 2;
  const sSide = { color: PAL.slabSide, hatchDir: [0, 1, 0], hatchDir2: [1, 0, 0], shadeColor: 0x1d2a48, shadeMix: 0.3 };
  const sTop = { color: 0xffffff, map: tex.slab, hatch: 0.8, hatchDir: [1, 0, 0.3], hatchDir2: [0.3, 0, -1], noiseScale: 0.4, spec: 0.35, toneBias: 0.05 };
  add(new THREE.BoxGeometry(SWd, A.SLAB.h, SDp), [sSide, sSide, sTop, sSide, sSide, sSide], { outline: 1.0, cast: false }, [SCx, -A.SLAB.h / 2, 0]);
  const rim = { color: PAL.rim, hatchMode: 'u', spec: 1, hatch: 0.8 };
  const rw = 0.07;
  add(new THREE.BoxGeometry(SWd + rw * 2, 0.06, rw), rim, { outline: 0.6, cast: false }, [SCx, 0.02, A.SLAB.z1 + rw / 2]);
  add(new THREE.BoxGeometry(SWd + rw * 2, 0.06, rw), rim, { outline: 0.6, cast: false }, [SCx, 0.02, A.SLAB.z0 - rw / 2]);
  add(new THREE.BoxGeometry(rw, 0.06, SDp), rim, { outline: 0.6, cast: false }, [A.SLAB.x0 - rw / 2, 0.02, 0]);
  add(new THREE.BoxGeometry(rw, 0.06, SDp), rim, { outline: 0.6, cast: false }, [A.SLAB.x1 + rw / 2, 0.02, 0]);
  // corner screws (brass)
  for (const [x, z] of [[A.SLAB.x0 + 0.25, A.SLAB.z0 + 0.25], [A.SLAB.x1 - 0.25, A.SLAB.z0 + 0.25], [A.SLAB.x0 + 0.25, A.SLAB.z1 - 0.25], [A.SLAB.x1 - 0.25, A.SLAB.z1 - 0.25]]) {
    add(cyl(0.1, 0.1, 0.04, 24), { color: PAL.brass, hatchMode: 'u' }, { outline: 0.5, cast: false }, [x, 0.02, z]);
  }

  // ---- atoms + their light pedestals ----
  const atomGeo = new THREE.SphereGeometry(A.AR, 44, 30);
  const coneH = A.HOVER - A.AR * 0.55;
  const coneGeo = new THREE.CylinderGeometry(0.1, 0.36, coneH, 40, 1, true); coneGeo.translate(0, coneH / 2, 0);
  const atoms = [], slmCones = [], aodCones = [];
  for (let r = 0; r < A.NROW; r++) for (let c = 0; c < A.NCOL; c++) {
    const k = r * A.NCOL + c;
    const m = add(atomGeo, { color: PAL.atom, glow: 0.12, hatch: 0.8, spec: 0.8, receive: false, toneBias: 0.12, rim: 1, seed: k * 1.7,
      hatchMode: 'planar', hatchDir: [1, -1, 0.3], hatchDir2: [0.2, 1, 1] }, { cast: true, outline: 0.9 });
    m.userData.k = k;
    atoms.push(m);
    const sc = new THREE.Mesh(coneGeo, coneMat(npr, PAL.tw, 0.9, k * 3.1)); npr.add(sc, { glass: true });
    sc.position.set(A.COLX(c), 0.004, A.ROWZ[r]); scene.add(sc); slmCones.push(sc);
    if (A.CONVOY(r, c)) {
      const ac = new THREE.Mesh(coneGeo, coneMat(npr, PAL.aod, 1.0, k * 2.3 + 0.5)); npr.add(ac, { glass: true });
      ac.position.set(A.COLX(c), 0.006, A.ROWZ[r]); scene.add(ac); aodCones.push({ mesh: ac, r, c, k });
    }
  }

  // ---- AOD: ochre dashed rails (rows, fixed) and column bars (moving) ----
  const railMat = { color: PAL.aod, flat: 0.45, glow: 0.35, hatch: 0, spec: 0, receive: false, rim: 0 };
  const dashes = (x0, x1, step, len, alongZ = false) => {
    const gs = [];
    for (let x = x0; x <= x1 + 1e-6; x += step) {
      const g = alongZ ? new THREE.BoxGeometry(0.06, 0.018, len) : new THREE.BoxGeometry(len, 0.018, 0.06);
      g.translate(alongZ ? 0 : x, 0, alongZ ? x : 0); gs.push(g);
    }
    const mg = mergeGeometries(gs); mg.userData.n = gs.length; return mg;
  };
  const rails = A.ROWZ.slice(0, 2).map((z) => add(dashes(-3.35, 5.3, 0.3, 0.19), railMat, { outline: 0.5, cast: false }, [0, 0.012, z]));
  const colBars = [2, 3, 4, 5].map((c) => add(dashes(A.ROWZ[1] - 0.5, A.ROWZ[0] + 0.5, 0.3, 0.19, true), railMat, { outline: 0.5, cast: false }, [A.COLX(c), 0.014, 0]));

  // ---- Pip: placement compass ----
  const pip = { group: new THREE.Group() }; scene.add(pip.group);
  pip.headG = new THREE.Group(); pip.group.add(pip.headG);
  pip.head = add(new THREE.SphereGeometry(0.36, 48, 32), { color: PAL.pip, hatchMode: 'v', rim: 1, seed: 2.2, spec: 0.6 }, { outline: 1.2 }, [0, 0.26, 0], [0, 0, 0], pip.headG);
  add(cyl(0.2, 0.2, 0.08, 40), { color: PAL.brass, hatchMode: 'u' }, { outline: 0.7 }, [0, -0.05, 0], [0, 0, 0], pip.headG);   // collar
  add(cyl(0.08, 0.1, 0.3, 24), { color: PAL.brass, hatchMode: 'u', hatchScale: 2 }, { outline: 0.7 }, [0, 0.72, 0], [0, 0, 0], pip.headG); // handle
  add(new THREE.SphereGeometry(0.11, 24, 16), { color: PAL.brass }, { outline: 0.7 }, [0, 0.9, 0], [0, 0, 0], pip.headG);
  const legGeo = cyl(0.06, 0.045, 1, 20); legGeo.translate(0, -0.5, 0);
  pip.legN = add(legGeo, { color: PAL.pipLeg, hatchMode: 'u', spec: 1 }, { outline: 0.8 });
  pip.legP = add(legGeo, { color: PAL.pipLeg, hatchMode: 'u', spec: 1 }, { outline: 0.8 });
  const tipGeo = new THREE.ConeGeometry(0.06, 0.22, 20); tipGeo.rotateX(Math.PI); tipGeo.translate(0, -0.11, 0);
  pip.tipN = add(tipGeo, { color: 0x4a4a62, spec: 1 }, { outline: 0.6 });
  pip.tipP = add(tipGeo, { color: PAL.wood, hatchMode: 'u' }, { outline: 0.6 });
  pip.lead = add(new THREE.ConeGeometry(0.025, 0.08, 12).rotateX(Math.PI).translate(0, -0.04, 0), { color: PAL.lead }, { outline: 0.3 });

  // ---- Rook: routing loco (local +x = forward) ----
  const rook = { group: new THREE.Group() }; scene.add(rook.group);
  rook.body = new THREE.Group(); rook.group.add(rook.body);
  const RB = rook.body;
  add(cyl(0.34, 0.34, 0.95, 44), { color: PAL.rook, hatchMode: 'u', rim: 1, spec: 0.8 }, { outline: 1.1 }, [0.2, 0.58, 0], [0, 0, Math.PI / 2], RB);
  for (const x of [-0.08, 0.42]) add(new THREE.TorusGeometry(0.345, 0.03, 12, 48), { color: PAL.brass, hatchMode: 'u' }, { outline: 0.5 }, [x, 0.58, 0], [0, Math.PI / 2, 0], RB);
  add(cyl(0.36, 0.36, 0.14, 44), { color: PAL.rookDark, hatchMode: 'u' }, { outline: 0.9 }, [0.72, 0.58, 0], [0, 0, Math.PI / 2], RB);
  rook.plate = add(cyl(0.29, 0.29, 0.03, 44), { color: PAL.plate, hatch: 0.4, toneBias: 0.25, spec: 0 }, { outline: 0.8 }, [0.8, 0.58, 0], [0, 0, Math.PI / 2], RB);
  const chim = new THREE.LatheGeometry([[0.001, 0], [0.1, 0], [0.09, 0.18], [0.11, 0.3], [0.18, 0.38], [0.18, 0.44], [0.001, 0.44]].map(([x, y]) => new THREE.Vector2(x, y)), 36);
  add(chim, { color: PAL.iron, hatchMode: 'v', spec: 1 }, { outline: 1 }, [0.55, 0.86, 0], [0, 0, 0], RB);
  add(new THREE.SphereGeometry(0.13, 24, 16), { color: PAL.brass, spec: 1 }, { outline: 0.8 }, [0.18, 0.9, 0], [0, 0, 0], RB).scale.set(1, 0.8, 1);
  const cabMats = [{ color: PAL.rook }, { color: PAL.rook }, { color: PAL.rook }, { color: PAL.rook },
    { color: 0xffffff, map: tex.cab, hatch: 0.6 }, { color: 0xffffff, map: tex.cab, hatch: 0.6 }];
  cabMats.forEach((m) => { m.hatchDir = [0, 1, 0]; m.rim = 1; });
  add(new THREE.BoxGeometry(0.58, 0.64, 0.72), cabMats, { outline: 1.1 }, [-0.5, 0.64, 0], [0, 0, 0], RB);
  add(new THREE.BoxGeometry(0.76, 0.09, 0.86), { color: PAL.roof, hatchDir: [1, 0, 0] }, { outline: 1 }, [-0.5, 1.0, 0], [0, 0, 0], RB);
  add(cyl(0.045, 0.045, 0.16, 16), { color: PAL.brass, spec: 1 }, { outline: 0.6 }, [-0.3, 1.12, 0], [0, 0, 0], RB);
  rook.whistleTip = new THREE.Object3D(); rook.whistleTip.position.set(-0.3, 1.22, 0); RB.add(rook.whistleTip);
  rook.chimTop = new THREE.Object3D(); rook.chimTop.position.set(0.55, 1.32, 0); RB.add(rook.chimTop);
  add(new THREE.BoxGeometry(1.72, 0.13, 0.62), { color: PAL.iron }, { outline: 0.9 }, [0.05, 0.27, 0], [0, 0, 0], rook.group);
  add(new THREE.BoxGeometry(0.09, 0.15, 0.7), { color: PAL.roof }, { outline: 0.8 }, [0.92, 0.27, 0], [0, 0, 0], rook.group);
  rook.wheels = [];
  for (const [x, rr] of [[-0.42, 0.22], [0.06, 0.22], [0.56, 0.15]]) for (const z of [-0.33, 0.33]) {
    const wg = new THREE.Group(); wg.position.set(x, rr, z); rook.group.add(wg);
    add(cyl(rr, rr, 0.08, 32), { color: PAL.wheel, hatchMode: 'u', rim: 1 }, { outline: 0.8 }, [0, 0, 0], [Math.PI / 2, 0, 0], wg);
    add(new THREE.BoxGeometry(rr * 1.8, 0.045, 0.1), { color: PAL.plate }, { outline: 0.4 }, [0, 0, 0], [0, 0, 0], wg);
    add(cyl(0.05, 0.05, 0.11, 16), { color: PAL.brass }, { outline: 0.4 }, [0, 0, 0], [Math.PI / 2, 0, 0], wg);
    rook.wheels.push({ g: wg, r: rr });
  }
  // steam puffs (pool of little clouds: three overlapping balls each)
  rook.puffs = [];
  const puffGeo = new THREE.SphereGeometry(1, 24, 16);
  for (let k = 0; k < 10; k++) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    for (const [dx, dy, s0] of [[0, 0, 1], [0.75, -0.2, 0.7], [-0.7, -0.25, 0.62]]) {
      const m = add(puffGeo, { color: PAL.steam, hatch: 0.25, toneBias: 0.35, spec: 0, rim: 0.4, seed: k * 3.3 + dx, noiseScale: 2, flat: 0.25 }, { cast: false, outline: 0.7 }, [dx, dy, 0], [0, 0, 0], g);
      m.scale.setScalar(s0);
    }
    rook.puffs.push(g);
  }

  // ---- Tick: the optimize stopwatch ----
  const tick = { group: new THREE.Group() }; scene.add(tick.group);
  tick.group.position.set(A.TICK.x, 0, A.TICK.z);
  add(cyl(0.62, 0.66, 0.3, 40), { color: PAL.podium, hatchMode: 'u', rim: 1 }, { outline: 1 }, [0, -A.SLAB.h + 0.15, 0], [0, 0, 0], tick.group);
  add(new THREE.TorusGeometry(0.63, 0.035, 12, 48), { color: PAL.brass }, { outline: 0.5 }, [0, -A.SLAB.h + 0.29, 0], [Math.PI / 2, 0, 0], tick.group);
  tick.legs = [];
  const legG = new THREE.CapsuleGeometry(0.07, 0.3, 6, 16);
  for (const s of [-1, 1]) {
    const l = add(legG, { color: PAL.iron, hatchMode: 'v' }, { outline: 0.8 }, [s * 0.18, 0.2, 0], [0, 0, 0], tick.group);
    const sh = add(new THREE.SphereGeometry(0.14, 24, 16), { color: PAL.shoe, rim: 1 }, { outline: 0.9 }, [s * 0.22, 0.03, 0.06], [0, 0, 0], tick.group);
    sh.scale.set(1.2, 0.6, 1.5); tick.legs.push({ l, sh, s });
  }
  tick.body = new THREE.Group(); tick.body.position.set(0, 1.02, 0); tick.group.add(tick.body);
  const TB = tick.body;
  add(cyl(0.66, 0.66, 0.28, 56), { color: PAL.tick, hatchMode: 'u', rim: 1, spec: 1 }, { outline: 1.2 }, [0, 0, 0], [Math.PI / 2, 0, 0], TB);
  add(new THREE.TorusGeometry(0.6, 0.07, 16, 64), { color: PAL.tick, hatchMode: 'u', spec: 1 }, { outline: 0.8 }, [0, 0, 0.14], [0, 0, 0], TB);
  tick.dial = add(new THREE.CircleGeometry(0.56, 64), { color: 0xffffff, map: tex.dial, hatch: 0.35, toneBias: 0.18, spec: 0 }, { outline: 0 }, [0, 0, 0.142], [0, 0, 0], TB);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.56, 48), npr.glass({ tint: 0xe6f6ff, edge: 0.01, alpha: 1.2, glint: 1.2 }));
  glass.position.set(0, 0, 0.17); npr.add(glass, { glass: true }); TB.add(glass);
  const handGeo = new THREE.BoxGeometry(0.045, 0.5, 0.025); handGeo.translate(0, 0.18, 0);
  tick.hand = add(handGeo, { color: PAL.handRed, flat: 0.3 }, { outline: 0.5, cast: false }, [0, 0, 0.158], [0, 0, 0], TB);
  add(new THREE.SphereGeometry(0.055, 16, 12), { color: PAL.handRed }, { outline: 0.4, cast: false }, [0, 0, 0.16], [0, 0, 0], TB);
  add(cyl(0.065, 0.065, 0.12, 20), { color: PAL.tick, hatchMode: 'u' }, { outline: 0.6 }, [0, 0.72, 0], [0, 0, 0], TB);
  tick.crown = add(cyl(0.12, 0.12, 0.1, 28), { color: PAL.tick, hatchMode: 'u', hatchScale: 3 }, { outline: 0.7 }, [0, 0.82, 0], [0, 0, 0], TB);
  add(new THREE.TorusGeometry(0.12, 0.035, 12, 36), { color: PAL.tick }, { outline: 0.6 }, [0, 0.99, 0], [0, 0, 0], TB);
  tick.pusher = add(cyl(0.055, 0.055, 0.14, 16), { color: PAL.tick, hatchMode: 'u' }, { outline: 0.6 }, [-0.4, 0.58, 0], [0, 0, 0.6], TB);
  const armGeo = new THREE.CapsuleGeometry(0.06, 0.46, 6, 16); armGeo.translate(0, -0.29, 0);
  tick.armR = new THREE.Group(); tick.armR.position.set(0.62, 0.02, 0.12); TB.add(tick.armR);
  tick.armL = new THREE.Group(); tick.armL.position.set(-0.62, 0.02, 0.12); TB.add(tick.armL);
  for (const g of [tick.armR, tick.armL]) {
    add(armGeo, { color: PAL.iron, hatchMode: 'v' }, { outline: 0.7 }, [0, 0, 0], [0, 0, 0], g);
    add(new THREE.SphereGeometry(0.11, 24, 16), { color: PAL.glove, rim: 1, toneBias: 0.1 }, { outline: 0.9 }, [0, -0.62, 0], [0, 0, 0], g);
  }
  const batonGeo = cyl(0.02, 0.014, 0.8, 12); batonGeo.translate(0, -0.4, 0);
  tick.baton = add(batonGeo, { color: PAL.baton, hatch: 0.3, toneBias: 0.2 }, { outline: 0.6 }, [0, -0.62, 0.02], [0.35, 0, 0], tick.armR);
  tick.batonTip = new THREE.Object3D(); tick.batonTip.position.set(0, -0.8, 0); tick.baton.add(tick.batonTip);

  // ---- Slo: the baseline snail (local +x = forward), on the bench's front lane ----
  const slo = { group: new THREE.Group() }; scene.add(slo.group);
  slo.group.position.set(A.SLO.x0, -A.SLAB.h, A.SLO.z);
  slo.group.scale.setScalar(A.SLO.scale);
  slo.body = new THREE.Group(); slo.group.add(slo.body);
  const footGeo = new THREE.CapsuleGeometry(0.12, 0.62, 8, 24); footGeo.rotateZ(Math.PI / 2);
  slo.foot = add(footGeo, { color: PAL.sloBody, rim: 1, toneBias: 0.05, hatchMode: 'planar', hatchDir: [0, 1, 0.2], seed: 4.4 }, { outline: 1.0 }, [0, 0.1, 0], [0, 0, 0], slo.body);
  slo.foot.scale.set(1, 0.72, 0.95);
  slo.neck = add(new THREE.CapsuleGeometry(0.1, 0.16, 6, 20), { color: PAL.sloBody, rim: 1, toneBias: 0.05 }, { outline: 0.9 }, [0.36, 0.2, 0], [0, 0, -0.55], slo.body);
  slo.head = add(new THREE.SphereGeometry(0.17, 36, 24), { color: PAL.sloBody, rim: 1, toneBias: 0.08, seed: 5.1 }, { outline: 1.0 }, [0.45, 0.33, 0], [0, 0, 0], slo.body);
  slo.stalks = [];
  for (const s of [-1, 1]) {
    const sg = new THREE.Group(); sg.position.set(0.47, 0.46, s * 0.07); slo.body.add(sg);
    const stalkGeo = new THREE.CylinderGeometry(0.018, 0.026, 0.26, 12); stalkGeo.translate(0, 0.13, 0);
    add(stalkGeo, { color: PAL.sloBody, toneBias: 0.05 }, { outline: 0.5 }, [0, 0, 0], [0, 0, 0], sg);
    add(new THREE.SphereGeometry(0.045, 16, 12), { color: PAL.sloShell, rim: 1 }, { outline: 0.6 }, [0, 0.27, 0], [0, 0, 0], sg);
    sg.rotation.set(s * 0.25, 0, -0.3); slo.stalks.push({ g: sg, s });
  }
  slo.shellG = new THREE.Group(); slo.shellG.position.set(-0.08, 0.34, 0); slo.body.add(slo.shellG);
  slo.shell = add(shellGeometry(), { color: PAL.sloShell, hatchMode: 'u', hatch: 0.45, rim: 1, spec: 0.7, toneBias: 0.2, seed: 6.2, noiseScale: 1.2 }, { outline: 1.1 }, [0, 0, 0], [0, 0, 0], slo.shellG);
  // the one atom it hauls, asleep on top of the shell
  slo.cargo = add(atomGeo, { color: PAL.atom, glow: 0.12, hatch: 0.8, spec: 0.8, receive: false, toneBias: 0.12, rim: 1, seed: 31.7,
    hatchMode: 'planar', hatchDir: [1, -1, 0.3], hatchDir2: [0.2, 1, 1] }, { cast: true, outline: 0.9 }, [0.0, 0.48, 0], [0, 0, 0], slo.shellG);
  slo.cargo.scale.setScalar(0.86);
  // its glistening slime trail: a wavy ribbon laid on the bench, revealed up to the snail's tail (drawRange)
  {
    const xa = A.SLO.x0 - 3.6, xb = A.SLO.x1 + 0.2, n = 160, pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const x = lerp(xa, xb, i / n), zc = 0.035 * Math.sin(x * 4.1) + 0.02 * Math.sin(x * 9.7), hw = 0.045 + 0.012 * Math.sin(x * 6.3);
      pos.push(x, 0, zc - hw, x, 0, zc + hw);
    }
    for (let i = 0; i < n; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.userData = { xa, xb, n };
    // same surface id as the bench top: no inked outline, it reads as a wet glossy streak on the wood
    slo.slime = add(g, { id: benchTopId, seed: 9.9, color: 0xfff6ea, flat: 0.25, glow: 0.18, spec: 1, hatch: 0, rim: 0, toneBias: 0.25 }, { cast: false, outline: 0 }, [0, -A.SLAB.h + 0.004, A.SLO.z]);
  }

  // flash (comic hit) behind Tick: a spiky pink burst with a cream core - many thin, uneven spikes so it reads as
  // light going off, not as an empty speech balloon. Two thin extruded cut-outs, inked by their hulls.
  {
    const spiky = (n, rin, rout, jag, sy) => {
      const sh = new THREE.Shape();
      for (let i = 0; i <= n * 2; i++) {
        const a = (i / (n * 2)) * TAU, h = A.hash(i * 3.7 + n);
        const rr = i % 2 ? rin * (0.9 + 0.2 * h) : rout * (1 - jag + 2 * jag * h);
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr * sy; i ? sh.lineTo(x, y) : sh.moveTo(x, y);
      }
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }); g.translate(0, 0, -0.015); return g;
    };
    tick.flash = new THREE.Group(); tick.flash.position.set((A.ZONE.x0 + A.ZONE.x1) / 2 - 0.2, 0.55, -4.0); scene.add(tick.flash);
    add(spiky(26, 0.36, 1.0, 0.3, 0.74), { color: 0xff6fa6, flat: 0.85, glow: 0.25, hatch: 0, spec: 0, rim: 0, receive: false }, { cast: false, outline: 1.3 }, [0, 0, 0], [0, 0, 0], tick.flash);
    add(spiky(18, 0.22, 0.52, 0.25, 0.74), { color: 0xfff4d6, flat: 0.9, glow: 0.4, hatch: 0, spec: 0, rim: 0, receive: false }, { cast: false, outline: 0.9 }, [0, 0, 0.05], [0, 0, 0.3], tick.flash);
    tick.flash.visible = false;
  }
  // sunburst flat on a stick behind Tick (hidden until the slam)
  tick.sun = add(new THREE.CircleGeometry(5.2, 72), { color: 0xffffff, map: tex.sun, flat: 0.75, hatch: 0, spec: 0, rim: 0, receive: false }, { cast: false, outline: 1.3 },
    [A.TICK.x, 1.3, A.TICK.z - 1.3], [0, 0, 0]);
  tick.sun.visible = false;

  // confetti for the 4.7x: small paper chips (7 shared painted materials, double-sided) that tumble in real 3D, so
  // the cel ramp flickers them light/dark as they turn; inked by the Sobel pass (no hulls on flat cards)
  const confetti = [];
  {
    const cols = [0xff6fa6, 0xffd23f, 0x2ea597, 0x9a6ae0, 0xe8423f, 0xfff4d6, 0x5fb6e8];
    const mats = cols.map((c, i) => npr.surface({ color: c, flat: 0.3, hatch: 0.2, spec: 0.5, rim: 0.3, side: THREE.DoubleSide, receive: false, toneBias: 0.08, seed: 40 + i }));
    const geos = [new THREE.PlaneGeometry(0.12, 0.075), new THREE.PlaneGeometry(0.09, 0.09), new THREE.CircleGeometry(0.05, 12)];
    for (let i = 0; i < 80; i++) {
      const m = npr.add(new THREE.Mesh(geos[i % 3], mats[i % cols.length]), { cast: false });
      m.visible = false; scene.add(m); confetti.push(m);
    }
  }

  // occluders for the 2D faces (ray tests): atoms and the characters' own meshes (no hulls)
  const occ = new Set(atoms);
  for (const g of [pip.group, rook.group, tick.group, slo.group]) g.traverse((o) => { if (o.isMesh && !o.name.endsWith(':hull')) occ.add(o); });
  for (const m of [pip.legN, pip.legP, pip.tipN, pip.tipP, tick.sun]) occ.add(m);
  tick.flash.traverse((o) => { if (o.isMesh && !o.name.endsWith(':hull')) occ.add(o); });
  for (const g of rook.puffs) g.traverse((o) => { if (o.isMesh && !o.name.endsWith(':hull')) occ.add(o); });
  const occluders = [...occ];
  return { THREE, scene, camera, npr, tex, atoms, slmCones, aodCones, rails, colBars, pip, rook, tick, slo, confetti, occluders };
}
