// npr/npr.js - painterly three.js renderer for the pv pipeline (engraving x watercolour x comic).
//
//   const npr = createNPR(renderer, ctx, { look: 'engrave' });
//   const mat = npr.surface({ color: 0xd9a441, hatch: 1, hatchDir: [0, 1, 0] });
//   const mesh = npr.add(new THREE.Mesh(geo, mat), { cast: true, outline: 1 });
//   ...each frame (inside a 'three' layer draw):  npr.frame(ctx); npr.render(scene, camera); return false;
//
// Pipeline per frame (all pure functions of the frame index):
//   1. painted shadow map   - key light depth from an ortho camera (casters on layer 1)
//   2. G-buffer (MRT, MSAA) - surface materials do the cel ramp, painted terminator/shadow shapes,
//                             engraving lines (object-space, constant on-screen density), halftone dots;
//                             outputs colour | view normal + id | hatchA, hatchB, glow, tone
//   3. glass overlay        - glass drawn as ink edges, tint and glints (layer 2), depth-tested manually
//   4. paint pass           - watercolour: wet bleed, pigment pooling at edges, granulation in the paper,
//                             flocculation, dry-brush silhouettes
//   5. final pass           - painterly DoF (Kuwahara), composite onto the underlay (paper + p5.brush),
//                             engraved ruling on the background (weight follows the wash, white gap
//                             around objects), Sobel ink (depth+normal+id) with hand wobble, boil and
//                             line-weight variation, hatch ink, off-register plates, painted glows
//                             (engraved radiance / comic burst) + beams (engraved line bundles),
//                             comic dots, concentration lines, impact frames, vignette, grain.
// The painted backdrop (npr.backdrop, id BACKDROP_ID) is real geometry but counts as background in 5.
// All sizes are design px (1920x1080 reference) scaled by ctx.S. See README-NPR.md.

import * as THREE from 'three';
import { NOISE, SURFACE_VERT } from './glsl.js';
import { DEFAULT_LOOK, resolveLook } from './looks.js';

export const LAYER = { MAIN: 0, CASTER: 1, GLASS: 2 };
export const INK_ID = 255;
export const BACKDROP_ID = 254;
const _px1 = new Uint8Array(4);
const MAX_GLOWS = 24, MAX_BEAMS = 20;

const LOOK_KEYS = Object.keys(DEFAULT_LOOK).filter((k) => typeof DEFAULT_LOOK[k] === 'number' || Array.isArray(DEFAULT_LOOK[k]));
const glslType = (v) => (typeof v === 'number' ? 'float' : ['', 'float', 'vec2', 'vec3', 'vec4'][v.length]);
const LOOK_DECL = LOOK_KEYS.map((k) => `uniform ${glslType(DEFAULT_LOOK[k])} L_${k};`).join('\n');
const toU = (v) => (typeof v === 'number' ? v : v.length === 2 ? new THREE.Vector2(...v) : v.length === 3 ? new THREE.Vector3(...v) : new THREE.Vector4(...v));

/** Colour input -> [r,g,b] in sRGB paint space (hex number, '#rrggbb', [r,g,b] 0..1). No colour management. */
export function rgb(c) {
  if (Array.isArray(c)) return c;
  if (typeof c === 'string') c = parseInt(c.replace('#', ''), 16);
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}
const v3 = (c) => new THREE.Vector3(...rgb(c));

// ------------------------------------------------------------------------------------------------
// Shaders
// ------------------------------------------------------------------------------------------------
const COMMON = /* glsl */ `
precision highp float;
${LOOK_DECL}
uniform vec2 uRes; uniform float uS; uniform float uBoilSeed; uniform float uFrameSeed;
${NOISE}
// Projector footprint (film-comic addition): a light at apex A throws a rectangle (type 0: B = x0,x1,z0,z1) or a
// disc (type 1: B = cx,cz,r) onto the plane y = Ty. Returns 1 inside the light's frustum, with a soft painted edge.
float projMask(vec3 wp, vec3 A, vec4 B, float type, float Ty, float soft, float n) {
  float den = A.y - wp.y;
  if (den <= 1e-3) return 0.;
  vec2 q = A.xz + (wp.xz - A.xz) * ((A.y - Ty) / den);
  float d = type < .5 ? max(max(B.x - q.x, q.x - B.y), max(B.z - q.y, q.y - B.w)) : length(q - B.xy) - B.z;
  return 1. - smoothstep(-soft, soft, d + n * soft * 1.5);
}
`;

const SURFACE_FRAG = /* glsl */ `
${COMMON}
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gAux;
in vec3 vWorldPos; in vec3 vObjPos; in vec3 vViewN; in vec3 vWorldN; in vec2 vUv; in float vViewZ;

uniform vec3 uKeyDir;
uniform sampler2D uShadowMap; uniform mat4 uShadowMat; uniform float uShadowTexel; uniform float uShadowUV; uniform float uShadowOn;

uniform vec3 uAlbedo; uniform sampler2D uMap; uniform float uHasMap; uniform float uMapMix;
uniform float uId; uniform float uFlat; uniform float uGlow; uniform float uSpec; uniform float uHatchAmt;
uniform float uHatchMode; uniform vec3 uHatchDirA; uniform vec3 uHatchDirB; uniform float uHatchScale;
uniform float uToneBias; uniform float uSeedObj; uniform float uRimAmt; uniform float uShadowRecv;
uniform vec3 uShadeCol; uniform float uShadeMix; uniform float uNoiseScale; uniform float uHtAmt;
uniform vec4 uPL[4]; uniform vec4 uPLC[4]; uniform int uPLN; uniform float uSpill;
uniform vec4 uProjA; uniform vec4 uProjB; uniform vec4 uProjC; uniform vec4 uProjD;

const vec2 PD[12] = vec2[](vec2(-.326,-.406), vec2(-.840,-.074), vec2(-.696,.457), vec2(-.203,.621),
  vec2(.962,-.195), vec2(.473,-.480), vec2(.519,.767), vec2(.185,-.893), vec2(.507,.064), vec2(.896,.412),
  vec2(-.322,-.933), vec2(-.792,-.598));

float shadowPaint(vec3 wp, vec3 N, float nz) {
  if (uShadowOn < .5) return 1.;
  vec4 lc = uShadowMat * vec4(wp + N * 2.0 * uShadowTexel / max(uShadowUV, 1e-4), 1.);
  vec3 sc = lc.xyz / lc.w * .5 + .5;
  if (sc.x < 0. || sc.x > 1. || sc.y < 0. || sc.y > 1. || sc.z > 1.) return 1.;
  // painted shape: the lookup wanders with a world-space noise, so shadow edges are irregular brush shapes
  vec2 wob = (vec2(fbm3(wp * 1.7 + 3.1), fbm3(wp * 1.7 + 17.9)) - .5) * L_shadowNoise * .22 * uShadowUV;
  float ang = nz * 9.0;
  mat2 R = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
  float sum = 0.;
  for (int i = 0; i < 12; i++) {
    float d = textureLod(uShadowMap, sc.xy + wob + R * PD[i] * L_shadowRadius * uShadowTexel, 0.).r;
    sum += (sc.z - L_shadowBias > d) ? 0. : 1.;
  }
  return smoothstep(.5 - L_shadowSoft * 2.5, .5 + L_shadowSoft * 2.5, sum / 12.);
}

// Engraving lines along coordinate c with a constant on-screen period (levels of detail blend by
// thinning the in-between lines, like an engraver dropping every other line as the form recedes).
float lines(float c, float hwPx, float wob) {
  float fw = max(fwidth(c), 1e-6);   // derivative first: never inside non-uniform control flow
  if (hwPx < .02) return 0.;
  float P = L_hatchPx * uS;
  float Lv = log2(P * fw);
  float k = floor(Lv), f = Lv - k;
  float s0 = exp2(-k), s1 = s0 * .5;
  float cc = c + wob * P * fw;
  float px0 = 1. / (fw * s0), px1 = 1. / (fw * s1);
  float d0 = abs(fract(cc * s0 + .5) - .5) * px0;
  float d1 = abs(fract(cc * s1 + .5) - .5) * px1;
  float h1 = min(hwPx, px1 * .45), h0 = min(hwPx, px0 * .45) * (1. - f);
  float a1 = clamp(h1 - d1 + .5, 0., 1.) * min(1., 2. * h1);
  float a0 = clamp(h0 - d0 + .5, 0., 1.) * min(1., 2. * h0);
  return max(a0, a1);
}

float hatchCoord(vec3 dir, bool second) {
  if (uHatchMode < .5) return dot(vObjPos, dir) * uHatchScale;                         // object planar
  if (uHatchMode < 1.5) return (second ? vUv.y : vUv.x) * uHatchScale;                  // uv u (v for B)
  if (uHatchMode < 2.5) return (second ? vUv.x : vUv.y) * uHatchScale;                  // uv v (u for B)
  if (uHatchMode < 3.5) return dot(vWorldPos, dir) * uHatchScale;                       // world planar
  return dot(gl_FragCoord.xy / uS, normalize(dir.xy)) / L_hatchPx;                      // screen
}

void main() {
  vec3 N = normalize(vWorldN); vec3 VN = normalize(vViewN);
  if (!gl_FrontFacing) { N = -N; VN = -VN; }
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uKeyDir);
  vec3 alb = uAlbedo;
  if (uHasMap > .5) { vec4 m = texture(uMap, vUv); alb = mix(alb, alb * m.rgb, uMapMix * m.a); }

  vec3 op = vObjPos * L_noiseFreq * uNoiseScale + uSeedObj;
  float n1 = fbm3(op) - .5;
  float nb = vnoise3(op * 2.3 + uBoilSeed * 7.31) - .5;
  // projector key (film-comic): a spot / light sheet. Outside its footprint everything drops into the shadow
  // bands (and so into the burin hatching); inside, the light comes from the apex like a point light.
  float projIn = 1.;
  if (uProjA.w > 0.) {
    float nw = fbm3(vWorldPos * 1.9 + 7.3) - .5;
    projIn = mix(1., projMask(vWorldPos, uProjA.xyz, uProjB, uProjC.x, uProjC.z, uProjC.y, nw), uProjA.w);
    L = normalize(mix(L, normalize(uProjA.xyz - vWorldPos), uProjA.w * uProjC.w));
  }
  float ndl = dot(N, L);
  float sh = mix(1., shadowPaint(vWorldPos, N, n1), uShadowRecv) * projIn;
  float x = ndl + n1 * L_termNoise + nb * L_termNoise * .3 + uToneBias;
  float s = L_termSoft;
  float wLit = smoothstep(L_t1 - s, L_t1 + s, x) * sh;
  float wMid = smoothstep(L_t2 - s, L_t2 + s, x) * sh;
  float wCore = smoothstep(L_t3 - s, L_t3 + s, x) * sh;

  float up = N.y * .5 + .5;
  vec3 sky = mix(L_groundFill, L_skyFill, up);
  vec3 cShadow = alb * L_shadeGlaze * sky;
  cShadow = mix(cShadow, uShadeCol, uShadeMix);
  vec3 cRefl = mix(cShadow, cShadow * L_reflTint * 1.12, L_reflect);
  vec3 cCore = alb * L_coreGlaze * mix(vec3(1.), sky, .5);
  vec3 cMid = alb * mix(vec3(1.), L_shadeGlaze, .45);
  vec3 cLit = alb * L_keyTint * mix(vec3(1.), uProjD.rgb, uProjD.w);
  vec3 c = cRefl;
  c = mix(c, cCore, wCore);
  c = mix(c, cMid, wMid);
  c = mix(c, cLit, wLit);

  // comic Ben-Day dots on the shade side (screen-aligned, like print)
  float ht = L_htAmt * uHtAmt * (1. - L_htFar * smoothstep(L_atmosStart, L_atmosEnd, vViewZ));
  if (ht > 0.) {
    float cell = L_htPx * uS;
    float ca = cos(L_htAngle), sa = sin(L_htAngle);
    vec2 q = mat2(ca, sa, -sa, ca) * gl_FragCoord.xy / cell;
    float r = length(fract(q) - .5) * cell;
    float dens = clamp((L_htT - (ndl + n1 * .2) * sh) / L_htRange, 0., 1.);
    float dotR = sqrt(dens) * cell * .6;
    float dc = clamp(dotR - r + .5, 0., 1.) * step(.02, dens);
    c = mix(c, c * L_htCol, dc * ht);
  }

  // hard rim light on the shade side (comic / picture-book)
  float fres = 1. - clamp(dot(N, V), 0., 1.);
  float rim = smoothstep(L_rimT - .04, L_rimT + .04, fres + n1 * .12) * (1. - wLit) * L_rim * uRimAmt;
  c = mix(c, alb * L_rimTint + .1, rim);

  // specular -> paper white reserve
  vec3 H = normalize(L + V);
  float sp = pow(max(dot(N, H), 0.), L_shine) * sh;
  float hi = smoothstep(L_hi - .05, L_hi + .05, sp + n1 * .18) * uSpec * L_hiAmt;
  c = mix(c, vec3(1.), hi);

  // painted light spill from glowing things (atoms, beams): banded pools of the light's colour that
  // lift the pigment, with a noisy edge like a second glaze
  float spill = 0.;
  for (int i = 0; i < 4; i++) {
    if (i >= uPLN) break;
    vec3 dl = uPL[i].xyz - vWorldPos;
    float dist = length(dl);
    float fall = 1. - smoothstep(0., uPL[i].w, dist + n1 * uPL[i].w * .25);
    float lam = clamp(dot(N, dl / max(dist, 1e-4)) * .7 + .3, 0., 1.);
    float e = fall * lam * uPLC[i].a * uSpill;
    float band = smoothstep(.18, .24, e) * .55 + smoothstep(.5, .56, e) * .45;
    c = mix(c, mix(c * uPLC[i].rgb * 1.15, vec3(1.) * mix(vec3(1.), uPLC[i].rgb, .5), .45), clamp(band, 0., 1.));
    spill = max(spill, band);
  }

  c = mix(c, alb, uFlat);
  c = mix(c, mix(alb, vec3(1.), .35), uGlow);

  // engraving: width follows the darkness of the painted value, swelling along the line
  float dk = clamp(1. - lum(c) * 1.04, 0., 1.);
  float cont = 1. - clamp(ndl * .5 + .5, 0., 1.) * mix(.45, 1., sh);
  dk = mix(dk, cont, .35) * (1. - hi) * (1. - uFlat) * (1. - uGlow) * (1. - .6 * spill);
  float covA = 0., covB = 0.;
  if (uHatchAmt > 0. && L_hatchW > 0.) {
    float swell = 1. + (vnoise3(vObjPos * 9.0 * uNoiseScale + uSeedObj * 3.) - .5) * 2. * L_hatchSwell;
    float wob = (vnoise3(vObjPos * 3.1 * uNoiseScale + uSeedObj + uBoilSeed * 5.17) - .5) * 2. * L_hatchWobble;
    float hwA = pow(clamp((dk - L_hatchCut) / (1. - L_hatchCut), 0., 1.), L_hatchGamma) * L_hatchW * uS * swell;
    float hwB = smoothstep(L_crossT, 1., dk) * L_crossW * uS * swell;
    covA = lines(hatchCoord(normalize(uHatchDirA), false), hwA, wob) * uHatchAmt;
    covB = lines(hatchCoord(normalize(uHatchDirB), true), hwB, -wob) * uHatchAmt;
  }

  gColor = vec4(c, 1.);
  gNormal = vec4(VN * .5 + .5, uId / 255.);
  gAux = vec4(covA, covB, uGlow, 1. - dk);
}
`;

// Inverted hull: back faces pushed out along smooth normals in clip space (constant design-px width),
// with brush-pressure variation (object-space noise, re-seeded per boil step) and a heavier shadow side.
const HULL_VERT = /* glsl */ `
${COMMON}
attribute vec3 hullNormal;
uniform vec3 uKeyDir; uniform float uHullScale; uniform float uSeedObj;
out vec3 vViewN;
void main() {
  vec3 n = normalize(hullNormal);
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  vec3 vn = normalize(normalMatrix * n);
  vec2 dir = (projectionMatrix * vec4(vn, 0.)).xy;
  dir = dir / max(length(dir), 1e-5);
  vec3 wn = normalize(mat3(modelMatrix) * n);
  float shade = clamp(.5 - .5 * dot(wn, normalize(uKeyDir)), 0., 1.);
  float press = .45 + 1.1 * vnoise3(position * 2.6 + uSeedObj + uBoilSeed * 3.7);
  float w = L_hullW * uHullScale * uS * press * mix(1., L_hullShadowW, shade);
  clip.xy += dir * w * 2. / uRes * clip.w;
  gl_Position = clip;
  vViewN = vn;
}
`;
const HULL_FRAG = /* glsl */ `
${COMMON}
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gAux;
in vec3 vViewN;
void main() {
  gColor = vec4(0.);
  gNormal = vec4(normalize(vViewN) * .5 + .5, 1.);
  gAux = vec4(0., 0., 0., 0.);
}
`;

// Glass: drawn the way an engraver draws glass - edge lines, a faint tint, two diagonal glints;
// back edges show through as thinner broken lines. Occlusion by opaque geometry is tested against
// the G-buffer depth by hand (no shared depth attachment needed).
const GLASS_FRAG = /* glsl */ `
${COMMON}
layout(location = 0) out vec4 oG;
in vec3 vWorldPos; in vec3 vObjPos; in vec3 vViewN; in vec3 vWorldN; in vec2 vUv; in float vViewZ;
uniform sampler2D tDepth; uniform vec3 uTint; uniform float uAlpha; uniform float uEdgeMul; uniform float uGlint;
void main() {
  vec2 fw = max(fwidth(vUv), vec2(1e-6));
  float sd = textureLod(tDepth, gl_FragCoord.xy / uRes, 0.).r;
  if (gl_FragCoord.z > sd + 2e-6) discard;
  vec2 e2 = min(vUv, 1. - vUv);
  float d = min(e2.x / fw.x, e2.y / fw.y);                    // px to the face border
  vec2 dp = gl_FragCoord.xy / uS;
  float wob = (vnoise(dp * .045 + uBoilSeed * 1.7) - .5) * 1.6 * uS;
  float w = L_glassEdge * uEdgeMul * uS;
  float line = clamp(w - d - wob * .5 + .5, 0., 1.);
  vec3 ink = L_ink;
  if (gl_FrontFacing) {
    // glints: two diagonal lifted streaks (px widths), fading towards the face ends
    float g = (vUv.x * .7 + vUv.y) / max(fw.x * .7 + fw.y, 1e-6);          // in px along the diagonal
    float gspan = 1.7 / max(fw.x * .7 + fw.y, 1e-6);
    float w1 = 7. * uS, w2 = 2.5 * uS;
    float n = (vnoise(dp * .03 + uBoilSeed) - .5) * 4. * uS;
    float gl1 = 1. - smoothstep(w1 * .6, w1, abs(g - gspan * .30 + n));
    float gl2 = 1. - smoothstep(w2 * .5, w2, abs(g - gspan * .30 - 16. * uS + n));
    float along = smoothstep(.05, .3, vUv.y) * smoothstep(1., .75, vUv.y);
    float gm = max(gl1, gl2) * along * L_glassGlint * uGlint;
    // thicker-looking glass towards the face border
    float thick = 1. - smoothstep(0., 40. * uS, d);
    float a = L_glassA * uAlpha * (.35 + .9 * thick);
    vec3 col = uTint * L_glassTint;
    vec4 o = vec4(col * a, a);
    o = mix(o, vec4(1., 1., 1., 1.), clamp(gm, 0., 1.) * .85);
    o = mix(o, vec4(ink, 1.), line * L_inkA);
    oG = o;
  } else {
    float dash = step(.45, fract((vUv.x + vUv.y) * 9. + (vnoise(dp * .02) - .5) * .3));
    float l = line * dash * .55;
    oG = vec4(ink * l, l);
  }
}
`;

const QUAD_VERT = /* glsl */ `
out vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }
`;

// Watercolour paint pass.
const PAINT_FRAG = /* glsl */ `
${COMMON}
layout(location = 0) out vec4 oC;
in vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tNormal; uniform sampler2D tGlass; uniform sampler2D tPaper;
uniform float uPaperMean;
void main() {
  vec2 px = 1. / uRes;
  vec2 dp = gl_FragCoord.xy / uS;
  // wet bleed: the pigment field is sampled through a slow noise displacement (boils with the ink)
  vec2 nv = vec2(fbm2(dp * L_bleedFreq + uBoilSeed * 1.31), fbm2(dp * L_bleedFreq + vec2(19.1, 7.7) - uBoilSeed * .71)) - .5;
  vec2 uvD = vUv + nv * L_bleed * 2. * uS * px;
  vec4 C = texture(tColor, uvD);
  vec4 M = vec4(0.);
  float R = L_edgeR * uS;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * .7853982 + .39;
    M += texture(tColor, uvD + vec2(cos(a), sin(a)) * R * px);
  }
  M /= 8.;
  vec3 c = C.a > .001 ? C.rgb / C.a : vec3(1.);
  vec3 Mc = M.a > .001 ? M.rgb / M.a : vec3(1.);
  float edge = clamp(length(c - Mc) * L_edgeK + (1. - M.a) * C.a * .8, 0., 1.);
  float paperH = lum(texture(tPaper, vUv).rgb) - uPaperMean;
  float ph = clamp(paperH * 9., -1., 1.);
  float dens = 1. - lum(c);
  float fl = (fbm2(dp * L_floccFreq * 10. + 3.7) - .5) * 2. * L_flocc;
  float ex = 1. + L_edgeDark * edge * edge - ph * L_gran * (.25 + dens) + fl * (.3 + dens);
  c = pow(max(c, vec3(1e-3)), vec3(max(ex, .25)));
  c = mix(vec3(lum(c)), c, L_sat);
  c = 1. - (1. - c) * L_value;
  float mask = C.a;
  // dry brush: silhouettes break up on the paper's peaks
  float nearBg = clamp((1. - M.a) * 2., 0., 1.) * C.a;
  float tooth = ph * .5 + .5 + (vnoise(dp * .35 + uBoilSeed) - .5) * .5;
  mask *= 1. - smoothstep(.62, .8, tooth * nearBg * L_dryEdge * 1.6);
  // glass overlay (premultiplied) sits on top of the wash
  vec4 g = texture(tGlass, vUv);
  vec4 pc = vec4(c * mask, mask);
  pc = pc * (1. - g.a) + g;
  oC = vec4(pc.a > .001 ? pc.rgb / pc.a : vec3(1.), pc.a);
}
`;

// Final: DoF, ink, glows, composite onto the underlay, film.
const FINAL_FRAG = /* glsl */ `
${COMMON}
layout(location = 0) out vec4 oC;
in vec2 vUv;
uniform sampler2D tPaint; uniform sampler2D tNormal; uniform sampler2D tAux; uniform sampler2D tDepth;
uniform sampler2D tPaper; uniform sampler2D tUnder; uniform float uHasUnder; uniform float uPaperMean;
uniform float uNear; uniform float uFar; uniform float uOrtho;
uniform vec4 uGlowP[${MAX_GLOWS}]; uniform vec4 uGlowC[${MAX_GLOWS}]; uniform int uGlowN;
uniform vec4 uBeamA[${MAX_BEAMS}]; uniform vec4 uBeamB[${MAX_BEAMS}]; uniform vec4 uBeamC[${MAX_BEAMS}]; uniform int uBeamN;
uniform vec2 uSmear; uniform int uDebug; uniform sampler2D tColorG;
uniform vec4 uGlowZ[${MAX_GLOWS}]; uniform vec4 uBeamZ[${MAX_BEAMS}];
uniform vec4 uGlowX[${MAX_GLOWS}]; uniform vec4 uBeamX[${MAX_BEAMS}];
uniform vec4 uFocus; uniform vec4 uFocusX; uniform vec4 uImpact;
uniform mat4 uVP; uniform mat4 uInvVP; uniform vec3 uCamPos;
uniform sampler2D uVShadowMap; uniform mat4 uVShadowMat;
uniform vec4 uVolA[2]; uniform vec4 uVolB[2]; uniform vec4 uVolC[2]; uniform vec4 uVolD[2]; uniform int uVolN;

float linZ(float d) {
  if (uOrtho > .5) return uNear + d * (uFar - uNear);
  return uNear * uFar / (uFar - d * (uFar - uNear));
}
float zAt(vec2 uv) { return linZ(textureLod(tDepth, uv, 0.).r); }
// coverage by a real object (the painted backdrop, id ${BACKDROP_ID}, counts as background)
float objAt(vec2 uv) {
  float a = textureLod(tPaint, uv, 0.).a;
  float id = textureLod(tNormal, uv, 0.).a * 255.;
  return a * (1. - step(abs(id - ${BACKDROP_ID}.), .5));
}

vec4 paintAt(vec2 uv, float r) {
  if (r < 1.25) return textureLod(tPaint, uv, 0.);
  // 4-sector Kuwahara: out-of-focus forms flatten into brush patches instead of a lens blur
  vec2 px = 1. / uRes;
  float st = r / 3.;
  vec4 best = vec4(0.); float bestV = 1e9;
  for (int k = 0; k < 4; k++) {
    vec2 sg = vec2(k == 0 || k == 3 ? 1. : -1., k < 2 ? 1. : -1.);
    vec4 m = vec4(0.); vec3 s2 = vec3(0.);
    for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) {
      vec4 c = textureLod(tPaint, uv + vec2(float(i), float(j)) * st * sg * px, 0.);
      m += c; s2 += c.rgb * c.rgb;
    }
    m /= 16.; s2 = s2 / 16. - m.rgb * m.rgb;
    float v = s2.r + s2.g + s2.b;
    if (v < bestV) { bestV = v; best = m; }
  }
  return best;
}

void main() {
  vec2 px = 1. / uRes;
  vec2 uv = vUv; vec2 fc = gl_FragCoord.xy; vec2 dp = fc / uS;
  float dRaw = texture(tDepth, uv).r;
  float zc = linZ(dRaw);
  float isObj = step(dRaw, .99999);
  float coc = isObj * clamp((abs(zc - L_dofFocus) - L_dofRange) / max(L_dofRange, 1e-3), 0., 1.);
  vec2 uvP = uv + L_misreg * uS * px;
  vec4 P;
  if (dot(uSmear, uSmear) > .25) {
    P = vec4(0.);
    float jit = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453) - .5;   // per-pixel tap jitter: no comb ribbing
    for (int i = 0; i < 25; i++) P += textureLod(tPaint, uvP + uSmear * px * ((float(i) + jit) / 24. - .5), 0.);
    P /= 25.;
  } else {
    P = paintAt(uvP, coc * L_dofMax * uS);
  }
  vec3 paper = texture(tPaper, uv).rgb;
  float bdC = step(abs(textureLod(tNormal, uv, 0.).a * 255. - ${BACKDROP_ID}.), .5);
  float objA = P.a * (1. - bdC);
  vec3 under = uHasUnder > .5 ? texture(tUnder, uv).rgb : paper;
  float ph = clamp((lum(paper) - uPaperMean) * 9., -1., 1.);
  vec3 col = mix(under, paper * P.rgb, P.a);
  col = mix(col, paper * L_atmosCol, P.a * L_atmos * smoothstep(L_atmosStart, L_atmosEnd, zc));

  // ---- engraved ruling on the background: horizontal burin lines whose width follows a tone field made
  //      of the underlay's wash darkness (the p5.brush watercolour tells the engraver where it is dark), a
  //      vertical gradient and slow clouds; lines keep a white gap around objects, as engravers do ----
  if (L_rule > 0.) {
    float wash = max(clamp(1. - lum(under) / max(lum(paper), 1e-3), 0., 1.), bdC * P.a * clamp(1. - lum(P.rgb), 0., 1.));
    float tone = mix(L_ruleBot, L_ruleTop, uv.y) + wash * L_ruleWash + (fbm2(dp * .0035 + 5.3) - .5) * L_ruleNoise;
    float Rg = L_ruleGap * uS; float nearO = 0.;
    for (int k = 0; k < 8; k++) {
      float a = float(k) * .7853982;
      nearO = max(nearO, objAt(uv + vec2(cos(a), sin(a)) * Rg * px));
    }
    nearO = max(nearO, objA);
    float per = L_rulePx * uS;
    float row = floor(fc.y / per);
    float yy = fc.y + (vnoise(vec2(fc.x / uS * .004, row * 1.7)) - .5) * per * .25;
    float d = abs(fract(yy / per) - .5) * per;
    float swell = .8 + .4 * vnoise(vec2(fc.x / uS * .02, row * 3.3));   // ruled by machine: no boil
    float hw = clamp(tone, 0., 1.) * per * .42 * swell;
    float line = clamp(hw - d + .5, 0., 1.) * step(.04, tone) * (1. - nearO);
    col = mix(col, paper * L_ruleInk, line * L_rule);
  }

  // ---- ink: Sobel on depth + normals + id, sampled through a hand wobble that boils ----
  vec2 wob = (vec2(vnoise(dp * L_wobF + uBoilSeed * 5.3), vnoise(dp * L_wobF + 31.7 + uBoilSeed * 2.9)) - .5) * 2. * L_wobA * uS;
  vec2 uvw = uv + wob * px;
  vec4 A0 = texture(tAux, uvw);
  float tone = A0.a;
  float press = mix(1., .45 + 1.1 * vnoise(dp * .011 + 4.1 + uBoilSeed * .37), L_lineNoise);
  float farK = smoothstep(L_atmosStart, L_atmosEnd, zc);   // the engraver thins his line as the form recedes
  float r = L_lineW * uS * mix(1., L_lineWShadow / max(L_lineW, 1e-3), clamp(1. - tone, 0., 1.)) * press * mix(1., L_inkFar, farK);
  float edge = 0.;
  if (r > .3) {
    float zs[9]; vec3 ns[9]; float ids[9];
    for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) {
      vec2 o = vec2(float(i - 1), float(j - 1)) * r * px;
      int k = j * 3 + i;
      zs[k] = zAt(uvw + o);
      vec4 nn = textureLod(tNormal, uvw + o, 0.);
      ns[k] = nn.xyz * 2. - 1.; ids[k] = nn.a * 255.;
    }
    float gx = (zs[2] + 2. * zs[5] + zs[8]) - (zs[0] + 2. * zs[3] + zs[6]);
    float gy = (zs[6] + 2. * zs[7] + zs[8]) - (zs[0] + 2. * zs[1] + zs[2]);
    float zmin = min(min(zs[4], min(zs[1], zs[7])), min(zs[3], zs[5]));
    float gz = length(vec2(gx, gy)) / max(zmin, 1e-3);
    // creases: Laplacian of the normals (zero for smooth curvature, large across a hard edge)
    vec3 l4 = ns[1] + ns[3] + ns[5] + ns[7] - 4. * ns[4];
    vec3 lx = ns[0] + ns[2] + ns[6] + ns[8] - 4. * ns[4];
    float gn = max(length(l4), length(lx) * .7);
    float di = 0.;
    for (int k = 0; k < 9; k++) di = max(di, abs(ids[k] - ids[4]) > .5 ? 1. : 0.);
    float eD = smoothstep(L_depthT, L_depthT * 2.2, gz);
    float eN = smoothstep(L_normalT, L_normalT * 1.8, gn) * L_crease;
    edge = max(max(eD, eN), di);
    if (abs(ids[4] - 255.) < .5) edge = 1.;
  }
  // dry ink: the line skips on paper peaks; lines dissolve out of focus
  float dry = smoothstep(.55, .95, (ph * .5 + .5) * L_dryInk * 2. + (vnoise(dp * .5 + uBoilSeed * 3.) - .5) * L_dryInk);
  float focusK = 1. - smoothstep(.15, .15 + L_dofLines, coc);
  float ink = edge * (1. - dry) * focusK * L_inkA;
  float hatch = max(A0.r, A0.g) * focusK * L_hatchA * (1. - dry * .6) * (1. - L_hatchFar * farK);
  // in a whip the lines smear away with the paint (crisp lines over a smeared fill read as a double exposure)
  float whipK = 1. - clamp((length(uSmear) - 6. * uS) / (22. * uS), 0., 1.);
  ink *= whipK; hatch *= whipK;
  vec3 inkCol = mix(L_ink, P.rgb * P.rgb * .55, L_selfInk * P.a);
  vec3 hatchCol = mix(L_hatchInk, P.rgb * .5, L_selfInk * P.a);
  col = mix(col, paper * hatchCol, clamp(hatch, 0., 1.));
  col = mix(col, paper * inkCol, clamp(ink, 0., 1.));

  // ---- painted glows (analytic, from projected light points) --------------------------------------
  //  watercolour/engraving (glowStyle 0): the pigment is lifted and re-glazed with the light's colour, a
  //    pooled rim, a pale inner ring and a reserved paper-white core; 'rays' adds an engraver's radiance
  //    (alternating long/short tapered burin rays in coloured ink, as old plates draw the sun).
  //  comic (glowStyle 1): Ben-Day dots in the light's colour and an inked burst star.
  //  'behind' glows only paint pixels farther than the light, so a lit object keeps its own shading.
  for (int i = 0; i < ${MAX_GLOWS}; i++) {
    if (i >= uGlowN) break;
    vec4 G = uGlowP[i]; vec4 GC = uGlowC[i]; vec4 GX = uGlowX[i]; vec4 GZ = uGlowZ[i];
    vec2 d2 = fc - G.xy;
    float rpx = length(d2);
    float dl = rpx / G.z;
    float rays = GC.w;
    float reach = 1. + rays * (.45 + 1.35 * GX.z);
    if (dl > max(reach, 1.) + .15) continue;
    float I = G.w;
    if (GZ.x > 0.) { float sdz = textureLod(tDepth, G.xy / uRes, 0.).r; I *= sdz < GZ.x - GZ.y ? GZ.z : 1.; }
    float beh = (GX.x > .5 && GZ.w > 0.) ? step(GZ.w, dRaw) : 1.;
    float ang = atan(d2.y, d2.x);
    float n = vnoise(vec2(ang * 2.5 + GX.w, uBoilSeed * 3.1 + GX.w)) - .5;
    vec3 gc = GC.rgb;
    float halo = 1. - smoothstep(.8, 1., dl + n * .16);
    float rimG = halo * smoothstep(.6, .97, dl + n * .1);
    float inner = 1. - smoothstep(.36, .46, dl + n * .08);
    float core = 1. - smoothstep(.12, .18, dl + n * .04);
    float Ib = I * beh;
    if (L_glowStyle < .5) {
      float sat = clamp(dl, 0., 1.);
      vec3 lightCol = paper * mix(vec3(1.), gc, .3 + .6 * sat);
      col = mix(col, lightCol, halo * Ib * L_glowWash * (.8 - .3 * sat));
      col *= mix(vec3(1.), mix(vec3(1.), gc, .75), rimG * Ib * .5 * L_glowWash);
      col = mix(col, paper * mix(vec3(1.), gc, .2), inner * Ib);
      col = mix(col, paper, core * Ib);
      if (rays > .01) {
        float nR = GX.y > 0. ? GX.y : 28.;
        float a = (ang / 6.2831853 + .5) * nR + GX.w * .37;
        float k = floor(a + .5), fa = a - k;
        float kk = mod(k, nR);
        float lenK = (mod(kk, 2.) < .5 ? 1. : .52) * mix(.62, 1., h21(vec2(kk, GX.w + 3.1)));
        float r0 = .58 + .1 * h21(vec2(kk + 7., GX.w));
        float r1 = r0 + (.45 + 1.35 * GX.z) * lenK * rays * (.94 + .12 * h21(vec2(kk, uBoilSeed)));
        float along = (dl - r0) / max(r1 - r0, 1e-3);
        float taper = clamp(1. - along, 0., 1.);
        float wpx = (.25 + 1.15 * taper) * L_rayW * uS;
        float dpx = abs(fa) * 6.2831853 / nR * rpx;
        float ray = clamp(wpx - dpx + .5, 0., 1.) * step(0., along) * step(along, 1.) * smoothstep(0., .1, along);
        vec3 rayInk = mix(L_ink, gc * gc * .72, L_rayTint);
        col = mix(col, paper * rayInk, ray * rays * Ib * L_inkA);
      }
    } else {
      float cell = L_htPx * .8 * uS;
      vec2 q = fc / cell; float rr = length(fract(q) - .5) * cell;
      float dotc = clamp(sqrt(clamp(1. - dl, 0., 1.)) * cell * .55 - rr + .5, 0., 1.);
      if (rays > .01) {
        // burst star (drawn first so the halo dots and the core sit on top of its fill)
        float nS = GX.y > 0. ? GX.y : 12.;
        float th = (ang / 6.2831853 + .5) * nS + GX.w * .21;
        float k = floor(th), tri = abs(fract(th) - .5) * 2.;
        float kk = mod(k, nS);
        float Rout = (1. + (.35 + 1.1 * GX.z) * rays) * mix(.8, 1.12, h21(vec2(kk, GX.w + floor(uBoilSeed * 2.))));
        float Rin = .82 + .08 * rays;
        float rB = mix(Rout, Rin, tri);
        float slope = (Rout - Rin) * nS / (3.14159 * max(dl, .05));
        float sd = (dl - rB) * G.z / sqrt(1. + slope * slope);
        float bw = L_burstW * uS * .5;
        float inside = 1. - smoothstep(-.6, .6, sd);
        float line = 1. - smoothstep(bw - .6, bw + .6, abs(sd));
        col = mix(col, paper * mix(vec3(1.), L_burstFill, .85), inside * rays * Ib);
        col = mix(col, paper * L_ink, line * rays * Ib * L_inkA);
      }
      col = mix(col, col * gc, halo * Ib * .6);
      col = mix(col, col * gc * gc, dotc * halo * Ib);
      col = mix(col, paper * mix(vec3(1.), gc, .2), inner * Ib);
      col = mix(col, paper, core * Ib);
    }
  }
  // ---- painted beams: coloured wash with a pooled rim and a paper-white core; engraving adds a bundle of
  //      fine lines along the beam (how plates draw a ray of light); comic adds inked edges + dots ----
  for (int i = 0; i < ${MAX_BEAMS}; i++) {
    if (i >= uBeamN) break;
    vec4 A = uBeamA[i]; vec4 B = uBeamB[i]; vec4 BC = uBeamC[i]; vec4 BX = uBeamX[i];
    vec2 pa = fc - A.xy, ba = A.zw - A.xy;
    float bl = max(length(ba), 1e-3);
    float h = clamp(dot(pa, ba) / (bl * bl), 0., 1.);
    float sgn = (pa.x * ba.y - pa.y * ba.x) / bl;           // signed distance across the beam (px)
    float pulse = exp(-pow((h - B.z) / max(BC.w, 1e-3), 2.)) * B.w;
    float w = B.x * mix(1., BX.z > 0. ? BX.z : 1., h) * (1. + pulse * 1.2);   // BX.z: width ratio at B (taper)
    float n = vnoise(vec2(h * bl * .03 / uS + uBoilSeed * 2.3, float(i) * 5.)) - .5;
    float dl = abs(sgn) / w;
    if (dl > 1.3) continue;
    float I = B.y * smoothstep(0., .03, h) * smoothstep(1., .97, h);
    vec4 BZ = uBeamZ[i];
    if (BZ.x > 0.) { float bz = mix(BZ.x, BZ.y, h); I *= dRaw < bz - BZ.z ? BZ.w : 1.; }
    float halo = 1. - smoothstep(.82, 1., dl + n * .2);
    float rimB = halo * smoothstep(.6, .95, dl + n * .15);
    float inner = 1. - smoothstep(.3, .4, dl + n * .1);
    float core = 1. - smoothstep(.08, .14, dl + n * .05);
    vec3 bc = BC.rgb;
    if (L_glowStyle < .5) {
      col = mix(col, paper * mix(vec3(1.), bc, .4 + .45 * clamp(dl, 0., 1.)), halo * I * .78);
      col *= mix(vec3(1.), mix(vec3(1.), bc, .7), rimB * I * .5);
      float nL = BX.x;
      if (nL > .5) {
        float u = (sgn / w * .5 + .5) * nL;
        float dpx = abs(fract(u) - .5) * 2. * w / nL;
        float alongPx = h * bl / uS;
        float lw = L_beamLineW * uS * (.45 + .9 * vnoise(vec2(alongPx * .015, floor(u) * 3.7 + BX.y + uBoilSeed))) * (1. + .8 * pulse);
        float ln = clamp(lw - dpx + .5, 0., 1.) * step(dl, .97) * (1. - inner * .85);
        col = mix(col, paper * mix(L_ink, bc * bc * .7, L_rayTint), ln * I * L_beamLines);
      }
      col = mix(col, paper * mix(vec3(1.), bc, .28), inner * I);
      col = mix(col, paper, core * I * (.55 + .45 * clamp(pulse, 0., 1.)));
    } else {
      float cell = L_htPx * .8 * uS;
      vec2 q = fc / cell; float rr = length(fract(q) - .5) * cell;
      float inside = 1. - smoothstep(.93, 1., dl);
      float dotc = clamp(sqrt(clamp(1. - dl, 0., 1.)) * cell * .5 - rr + .5, 0., 1.);
      col = mix(col, col * bc, inside * I * .75);
      col = mix(col, col * bc * bc, dotc * inside * I * .8);
      float bw = L_burstW * uS * .45;
      float edgeL = 1. - smoothstep(bw - .6, bw + .6, abs(abs(sgn) - w));
      col = mix(col, paper * L_ink, edgeL * I * L_inkA * step(.3, B.y));
      col = mix(col, paper * mix(vec3(1.), bc, .2), inner * I);
      col = mix(col, paper, core * I);
    }
  }

  // ---- volumetric light drawn as an engraving (film-comic addition) ---------------------------------
  //  A projector light (apex -> rect / disc footprint on y = Ty) is ray-marched through the real depth
  //  buffer and the key light's shadow map, so objects inside the light cut dark shafts out of it. The
  //  accumulated light is laid as a pale glaze of the light's colour plus burin rays that converge on the
  //  apex, their width following the density (the way old plates draw a sunbeam).
  for (int v = 0; v < 2; v++) {
    if (v >= uVolN) break;
    vec4 VA = uVolA[v]; vec4 VB = uVolB[v]; vec4 VC = uVolC[v]; vec4 VD = uVolD[v];
    if (VA.w <= 0.) continue;
    float Ty = VC.w;
    vec4 wh = uInvVP * vec4(uv * 2. - 1., dRaw * 2. - 1., 1.);
    vec3 ro = uCamPos, rd = wh.xyz / wh.w - ro;
    float tHit = length(rd); rd /= max(tHit, 1e-5);
    vec3 bmin, bmax;
    if (VD.x < .5) { bmin = vec3(min(VA.x, VB.x), Ty, min(VA.z, VB.z)); bmax = vec3(max(VA.x, VB.y), VA.y, max(VA.z, VB.w)); }
    else { bmin = vec3(min(VA.x, VB.x - VB.z), Ty, min(VA.z, VB.y - VB.z)); bmax = vec3(max(VA.x, VB.x + VB.z), VA.y, max(VA.z, VB.y + VB.z)); }
    vec3 rs = vec3(abs(rd.x) < 1e-5 ? 1e-5 : rd.x, abs(rd.y) < 1e-5 ? 1e-5 : rd.y, abs(rd.z) < 1e-5 ? 1e-5 : rd.z);
    vec3 t0 = (bmin - ro) / rs, t1 = (bmax - ro) / rs;
    vec3 tmn = min(t0, t1), tmx = max(t0, t1);
    float ta = max(max(tmn.x, tmn.y), max(tmn.z, 0.)), tb = min(min(min(tmx.x, tmx.y), tmx.z), tHit);
    if (tb <= ta) continue;
    const int NS = 28;
    float dt = (tb - ta) / float(NS), jit = h21(fc * .731 + float(v) * 17.3);
    float acc = 0.;
    for (int k = 0; k < NS; k++) {
      vec3 X = ro + rd * (ta + (float(k) + jit) * dt);
      float m = projMask(X, VA.xyz, VB, VD.x, Ty, .05, vnoise3(X * 2.2 + VD.y) - .5);
      if (m <= .001) continue;
      float lit = 1.;
      if (VD.z > .5) {
        vec4 lc = uVShadowMat * vec4(X, 1.); vec3 sc = lc.xyz / lc.w * .5 + .5;
        if (sc.x > 0. && sc.x < 1. && sc.y > 0. && sc.y < 1. && sc.z < 1.) lit = sc.z - .003 > textureLod(uVShadowMap, sc.xy, 0.).r ? .08 : 1.;
      }
      float fall = mix(.35, 1., clamp((VA.y - X.y) / max(VA.y - Ty, 1e-3), 0., 1.));
      acc += m * lit * fall * dt * (.7 + .6 * vnoise3(X * .9 + 3.1));
    }
    float dens = (1. - exp(-acc * VD.w)) * VA.w;
    if (dens < .003) continue;
    vec3 lcol = VC.rgb;
    col = mix(col, paper * mix(vec3(1.), lcol, .5), dens * .62);
    // burin rays converging on the apex (constant spacing at the footprint, thinning towards the apex)
    vec4 ac = uVP * vec4(VA.xyz, 1.);
    vec2 apx = ac.w > .05 ? (ac.xy / ac.w * .5 + .5) * uRes : vec2(fc.x, uRes.y * 4.);
    vec3 fcen = VD.x < .5 ? vec3((VB.x + VB.y) * .5, Ty, (VB.z + VB.w) * .5) : vec3(VB.x, Ty, VB.y);
    vec4 fcc = uVP * vec4(fcen, 1.);
    vec2 fpx = fcc.w > .05 ? (fcc.xy / fcc.w * .5 + .5) * uRes : fc;
    float Dref = max(length(fpx - apx), 40. * uS), dist = length(fc - apx);
    float per = L_rulePx * 1.25 * uS;
    float u = atan(fc.x - apx.x, apx.y - fc.y) * Dref / per;
    float dpx = abs(fract(u + .5) - .5) * per * dist / Dref;
    float swell = .6 + .8 * vnoise(vec2(floor(u + .5) * 3.1 + VD.y, dist / uS * .01 + uBoilSeed));
    float hw = clamp(dens * 1.6, 0., 1.) * per * .32 * swell * clamp(dist / Dref, .25, 1.3);
    float ln = clamp(hw - dpx + .5, 0., 1.);
    col = mix(col, paper * mix(L_ink, lcol * lcol * .55, .65), ln * clamp(dens * 2.2, 0., 1.) * .8);
  }

  // comic: Ben-Day dots on the background only
  if (L_bgDots.a > 0.) {
    float cell = L_htPx * 1.1 * uS;
    float ca = cos(.785), sa = sin(.785);
    vec2 q = mat2(ca, sa, -sa, ca) * fc / cell;
    float rr = length(fract(q) - .5) * cell;
    vec2 cq = uv - .5; cq.x *= uRes.x / uRes.y;
    float g = clamp(1. - length(cq) * 1.05, 0., 1.);
    float dotc = clamp(sqrt(g) * cell * .5 - rr + .5, 0., 1.);
    col = mix(col, col * L_bgDots.rgb, dotc * L_bgDots.a * (1. - objA));
  }

  // whip-pan speed streaks
  float sm = length(uSmear);
  if (sm > .5) {
    vec2 dir = uSmear / sm, nrm = vec2(-dir.y, dir.x);
    // bold tapered ink streaks along the pan, broken into dashes, clustered toward the frame edges (centre clear)
    float st = vnoise(vec2(dot(dp, nrm) * .045, dot(dp, dir) * .0012 + uBoilSeed));
    float seg = smoothstep(.35, .65, vnoise(vec2(dot(dp, nrm) * .045 + 7.3, dot(dp, dir) * .0035 + uBoilSeed * 1.7)));
    float edgeK = smoothstep(.18, .5, length((uv - .5) * vec2(1., .75)));
    float ln = smoothstep(.8, .86, st) * seg * edgeK;
    col = mix(col, L_ink, ln * clamp(sm / (40. * uS), 0., 1.) * .78);
  }

  // comic concentration lines (manga 集中線): tapered ink wedges converging on a focal point, a clear
  // centre, random gaps and lengths; redrawn per boil step
  if (uFocus.w > 0.) {
    vec2 d = fc - uFocus.xy; float r = length(d); float ang = atan(d.y, d.x);
    float nF = uFocusX.x;
    float a = (ang / 6.2831853 + .5) * nF; float k = floor(a + .5), fa = a - k;
    float kk = mod(k, nF), bs = floor(uBoilSeed * 2.);
    float hk = h21(vec2(kk, uFocusX.y + bs));
    float on = step(.3, h21(vec2(kk * 1.7, uFocusX.y + 3. + bs)));
    float rs = uFocus.z * (1. + 1.1 * hk);
    float along = clamp((r - rs) / max(uFocus.z * 1.6, 1.), 0., 1.);
    float wpx = along * (.5 + 2.4 * hk) * uS * uFocusX.z;
    float dpx = abs(fa) * 6.2831853 / nF * r;
    float ln = clamp(wpx - dpx + .5, 0., 1.) * step(rs, r) * on;
    col = mix(col, paper * L_ink, ln * uFocus.w);
  }
  // impact frame: 1-2 frames posterised to ink + light (optionally inverted), the comic 'hit'
  if (uImpact.x > 0.) {
    float l = lum(col) / max(lum(paper), 1e-3);
    float dark = 1. - smoothstep(uImpact.y - .03, uImpact.y + .03, l);
    vec3 lite = paper * mix(vec3(1.), L_burstFill, .3);
    vec3 two = uImpact.z > .5 ? mix(L_ink, lite, dark) : mix(lite, paper * L_ink, dark);
    col = mix(col, two, uImpact.x);
  }

  vec2 q = uv - .5;
  col *= 1. - L_vignette * dot(q, q) * 1.5 * vec3(.9, 1., 1.15);
  float gr = (h21(fc + uFrameSeed * 13.37) + h21(fc * 1.31 + uFrameSeed * 7.1) - 1.) * L_grain;
  col += gr * (.6 + .4 * (1. - lum(col)));
  if (uDebug == 1) col = textureLod(tColorG, uv, 0.).rgb;
  if (uDebug == 2) col = textureLod(tNormal, uv, 0.).rgb;
  if (uDebug == 3) col = textureLod(tAux, uv, 0.).rgb;
  if (uDebug == 4) col = textureLod(tPaint, uv, 0.).rgb;
  if (uDebug == 5) col = vec3(ink, hatch, coc);
  oC = vec4(clamp(col, 0., 1.), 1.);
}
`;

// ------------------------------------------------------------------------------------------------
// Geometry helpers
// ------------------------------------------------------------------------------------------------
/** Adds a 'hullNormal' attribute: normals averaged over coincident positions (so hard-edged meshes
 *  such as boxes give a closed, crack-free inverted hull). */
export function addHullNormals(geo) {
  if (geo.getAttribute('hullNormal')) return geo;
  const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal');
  const key = (i) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const acc = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = key(i), a = acc.get(k) || [0, 0, 0];
    a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i); acc.set(k, a);
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
    out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l;
  }
  geo.setAttribute('hullNormal', new THREE.BufferAttribute(out, 3));
  return geo;
}

// ------------------------------------------------------------------------------------------------
// createNPR
// ------------------------------------------------------------------------------------------------
/**
 * createNPR(renderer, ctx, opts) -> npr
 *   renderer : the 'three' layer's WebGLRenderer          ctx : the layer init ctx (W, H, S, DW, DH, seed)
 *   opts     : { look='engrave', shadowSize=2048, samples=4, paper: canvas, under: canvas|null }
 */
export function createNPR(renderer, ctx, opts = {}) {
  const W = ctx.W, H = ctx.H, S = ctx.S;
  const OX = (W - ctx.DW * S) / 2, OY = (H - ctx.DH * S) / 2;
  const samples = opts.samples ?? 4;

  // ---- shared uniforms (same objects in every material) ----
  const shared = {
    uRes: { value: new THREE.Vector2(W, H) }, uS: { value: S },
    uBoilSeed: { value: 0 }, uFrameSeed: { value: 0 },
  };
  for (const k of LOOK_KEYS) shared['L_' + k] = { value: toU(DEFAULT_LOOK[k]) };
  const light = {
    uKeyDir: { value: new THREE.Vector3(-0.5, 0.8, 0.45).normalize() },
    uShadowMap: { value: null }, uShadowMat: { value: new THREE.Matrix4() },
    uShadowTexel: { value: 1 / 2048 }, uShadowUV: { value: 0.1 }, uShadowOn: { value: 1 },
    uPL: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
    uPLC: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) }, uPLN: { value: 0 },
    // projector key (film-comic): A = apex xyz + amount, B = footprint, C = type, soft, Ty, point-likeness, D = lit tint rgb + amount
    uProjA: { value: new THREE.Vector4() }, uProjB: { value: new THREE.Vector4() },
    uProjC: { value: new THREE.Vector4() }, uProjD: { value: new THREE.Vector4() },
  };

  // ---- render targets ----
  const depthTex = new THREE.DepthTexture(W, H, THREE.FloatType);
  const gRT = new THREE.WebGLRenderTarget(W, H, {
    count: 3, samples, type: THREE.UnsignedByteType, format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, depthTexture: depthTex,
  });
  gRT.textures.forEach((t) => { t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; });
  const glassRT = new THREE.WebGLRenderTarget(W, H, { samples, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const paintRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const shadowSize = opts.shadowSize ?? 2048;
  const shadowRT = new THREE.WebGLRenderTarget(shadowSize, shadowSize, {
    depthBuffer: true, depthTexture: new THREE.DepthTexture(shadowSize, shadowSize, THREE.FloatType),
  });
  light.uShadowMap.value = shadowRT.depthTexture;
  light.uShadowTexel.value = 1 / shadowSize;
  const lightCam = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 40);
  lightCam.layers.set(LAYER.CASTER);
  const depthMat = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });

  // ---- textures ----
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true;
  let paperTex = white, paperMean = 0.9, underTex = null;

  // ---- quad passes ----
  const quadGeo = new THREE.BufferGeometry();
  quadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(quadGeo, null); quad.frustumCulled = false; quadScene.add(quad);
  const passMat = (frag, extra) => new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: QUAD_VERT, fragmentShader: frag,
    uniforms: { ...shared, ...extra }, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
  });
  const paintMat = passMat(PAINT_FRAG, {
    tColor: { value: gRT.textures[0] }, tNormal: { value: gRT.textures[1] }, tGlass: { value: glassRT.texture },
    tPaper: { value: white }, uPaperMean: { value: 0.9 },
  });
  const glowP = Array.from({ length: MAX_GLOWS }, () => new THREE.Vector4());
  const glowC = Array.from({ length: MAX_GLOWS }, () => new THREE.Vector4());
  const beamA = Array.from({ length: MAX_BEAMS }, () => new THREE.Vector4());
  const beamB = Array.from({ length: MAX_BEAMS }, () => new THREE.Vector4());
  const beamC = Array.from({ length: MAX_BEAMS }, () => new THREE.Vector4());
  const finalMat = passMat(FINAL_FRAG, {
    tPaint: { value: paintRT.texture }, tNormal: { value: gRT.textures[1] }, tAux: { value: gRT.textures[2] },
    tDepth: { value: depthTex }, tPaper: { value: white }, tUnder: { value: white }, uHasUnder: { value: 0 },
    uPaperMean: { value: 0.9 }, uNear: { value: 0.1 }, uFar: { value: 100 }, uOrtho: { value: 0 },
    uGlowP: { value: glowP }, uGlowC: { value: glowC }, uGlowN: { value: 0 },
    uBeamA: { value: beamA }, uBeamB: { value: beamB }, uBeamC: { value: beamC }, uBeamN: { value: 0 },
    uSmear: { value: new THREE.Vector2() }, uDebug: { value: 0 }, tColorG: { value: gRT.textures[0] },
    uGlowZ: { value: Array.from({ length: MAX_GLOWS }, () => new THREE.Vector4()) },
    uBeamZ: { value: Array.from({ length: MAX_BEAMS }, () => new THREE.Vector4()) },
    uGlowX: { value: Array.from({ length: MAX_GLOWS }, () => new THREE.Vector4()) },
    uBeamX: { value: Array.from({ length: MAX_BEAMS }, () => new THREE.Vector4()) },
    uFocus: { value: new THREE.Vector4() }, uFocusX: { value: new THREE.Vector4(90, 0, 1, 0) },
    uImpact: { value: new THREE.Vector4(0, 0.55, 0, 0) },
    uVP: { value: new THREE.Matrix4() }, uInvVP: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
    uVShadowMap: light.uShadowMap, uVShadowMat: light.uShadowMat,
    uVolA: { value: [new THREE.Vector4(), new THREE.Vector4()] }, uVolB: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    uVolC: { value: [new THREE.Vector4(), new THREE.Vector4()] }, uVolD: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    uVolN: { value: 0 },
  });

  let nextId = 1;
  const npr = {
    THREE, LAYER, W, H, S, shared, light, lightCam, targets: { gRT, glassRT, paintRT, shadowRT },
    look: null, glowList: [], beamList: [], smear: [0, 0],

    /** Switch look: preset name or {extends:'engrave', ...overrides}. */
    setLook(look) {
      const L = resolveLook(look);
      for (const k of LOOK_KEYS) {
        const u = shared['L_' + k], v = L[k];
        if (typeof v === 'number') u.value = v; else u.value.set(...v);
      }
      npr.look = L;
      return L;
    },

    /** Key light: direction TOWARDS the light (world), plus the ortho shadow volume around `target`. */
    setLight({ dir = [-0.5, 0.8, 0.45], target = [0, 0, 0], size = 6, near = 0.1, far = 40, dist = 18, shadows = true } = {}) {
      const d = new THREE.Vector3(...dir).normalize();
      light.uKeyDir.value.copy(d);
      light.uShadowOn.value = shadows ? 1 : 0;
      const tg = new THREE.Vector3(...target);
      lightCam.position.copy(tg).addScaledVector(d, dist);
      lightCam.up.set(0, 1, 0); if (Math.abs(d.y) > 0.99) lightCam.up.set(0, 0, 1);
      lightCam.lookAt(tg);
      Object.assign(lightCam, { left: -size, right: size, top: size, bottom: -size, near, far });
      lightCam.updateProjectionMatrix(); lightCam.updateMatrixWorld(true);
      light.uShadowMat.value.multiplyMatrices(lightCam.projectionMatrix, lightCam.matrixWorldInverse);
      light.uShadowUV.value = 1 / (2 * size);
    },

    /** Paper canvas (use the same ctx.paper(...) canvas as the paper layer so granulation matches it). */
    setPaper(canvas) {
      const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
      paperTex = t;
      // mean luminance (for granulation around the mean)
      const g = canvas.getContext('2d'), n = 64, d = g.getImageData(0, 0, canvas.width, canvas.height).data;
      let s = 0, c = 0; const step = Math.max(4, Math.floor(d.length / 4 / (n * n))) * 4;
      for (let k = 0; k < d.length; k += step) { s += (0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]) / 255; c++; }
      paperMean = s / c;
      paintMat.uniforms.tPaper.value = t; finalMat.uniforms.tPaper.value = t;
      paintMat.uniforms.uPaperMean.value = paperMean; finalMat.uniforms.uPaperMean.value = paperMean;
    },

    /** Underlay: the composite-so-far canvas (paper + washes). Re-uploaded every frame in render(). */
    setUnder(canvas) {
      if (!canvas) { underTex = null; finalMat.uniforms.uHasUnder.value = 0; return; }
      underTex = new THREE.CanvasTexture(canvas); underTex.colorSpace = THREE.NoColorSpace;
      underTex.generateMipmaps = false; underTex.minFilter = THREE.LinearFilter;
      finalMat.uniforms.tUnder.value = underTex; finalMat.uniforms.uHasUnder.value = 1;
    },

    /**
     * Surface material (G-buffer). opts:
     *   color, map (texture; multiplied, alpha = strength), mapMix, flat (0..1 unlit), glow (0..1 emissive),
     *   spec (highlight reserve 0..1), hatch (0..1 engraving strength), hatchMode ('planar'|'u'|'v'|'world'|'screen'),
     *   hatchDir [x,y,z], hatchDir2, hatchScale, toneBias (+ lighter), rim (0..1), receive (bool),
     *   shadeColor + shadeMix (custom shadow colour), noiseScale, halftone (0..1), side, id, seed
     */
    surface(o = {}) {
      const id = o.id ?? nextId++;
      if (id >= INK_ID || (o.id == null && id >= BACKDROP_ID)) throw new Error('npr: too many surface ids');
      const modes = { planar: 0, u: 1, v: 2, world: 3, screen: 4 };
      const uniforms = {
        ...shared, ...light,
        uAlbedo: { value: v3(o.color ?? 0xdddddd) },
        uMap: { value: o.map || white }, uHasMap: { value: o.map ? 1 : 0 }, uMapMix: { value: o.mapMix ?? 1 },
        uId: { value: id }, uFlat: { value: o.flat ?? 0 }, uGlow: { value: o.glow ?? 0 }, uSpec: { value: o.spec ?? 1 },
        uHatchAmt: { value: o.hatch ?? 1 }, uHatchMode: { value: modes[o.hatchMode ?? 'planar'] ?? 0 },
        uHatchDirA: { value: new THREE.Vector3(...(o.hatchDir ?? [0, 1, 0.2])) },
        uHatchDirB: { value: new THREE.Vector3(...(o.hatchDir2 ?? [1, 0.25, 0.4])) },
        uHatchScale: { value: o.hatchScale ?? 1 }, uToneBias: { value: o.toneBias ?? 0 },
        uSeedObj: { value: o.seed ?? id * 1.618 }, uRimAmt: { value: o.rim ?? 1 },
        uShadowRecv: { value: o.receive === false ? 0 : 1 },
        uShadeCol: { value: v3(o.shadeColor ?? 0) }, uShadeMix: { value: o.shadeColor != null ? (o.shadeMix ?? 0.6) : 0 },
        uNoiseScale: { value: o.noiseScale ?? 1 }, uHtAmt: { value: o.halftone ?? 1 }, uSpill: { value: o.spill ?? 1 },
      };
      const m = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3, uniforms, vertexShader: SURFACE_VERT, fragmentShader: SURFACE_FRAG,
        side: o.side ?? THREE.FrontSide, blending: THREE.NoBlending,
      });
      m.userData.nprId = id;
      return m;
    },

    /** Glass overlay material (put the mesh on LAYER.GLASS; npr.add does it with {glass:true}). */
    glass(o = {}) {
      return new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3, vertexShader: SURFACE_VERT, fragmentShader: GLASS_FRAG,
        uniforms: {
          ...shared, tDepth: { value: depthTex }, uTint: { value: v3(o.tint ?? 0xffffff) },
          uAlpha: { value: o.alpha ?? 1 }, uEdgeMul: { value: o.edge ?? 1 }, uGlint: { value: o.glint ?? 1 },
        },
        side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      });
    },

    /**
     * Painted cyclorama: a big open cylinder (seen from inside) carrying a p5.brush-baked wash, unlit, no
     * outline, no shadows. The final pass treats it as background (engraved ruling, comic dots), so washes
     * get true parallax, painterly DoF and aerial perspective instead of sticking to the screen.
     *   map: texture (bakeBrushTexture; white = paper)   o: { radius=14, height=10, y=-2, center=[0,0,0],
     *   arc=[start, length] (rad; theta 0 = +z, PI = -z, i.e. behind a camera looking down -z), color }
     * Returns the mesh (add it to your scene).
     */
    backdrop(map, { radius = 14, height = 10, y = -2, center = [0, 0, 0], arc = [Math.PI - 1.9, 3.8], color = 0xffffff, segments = 128 } = {}) {
      const geo = new THREE.CylinderGeometry(radius, radius, height, segments, 1, true, arc[0], arc[1]);
      const mat = npr.surface({ id: BACKDROP_ID, color, map, flat: 1, hatch: 0, spec: 0, receive: false, rim: 0,
        spill: 0, halftone: 0, side: THREE.BackSide });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(center[0], y + height / 2, center[2]);
      m.name = 'backdrop';
      npr.add(m, { cast: false });
      return m;
    },

    /** Inverted-hull outline for a mesh (child mesh, follows its transforms). width multiplies look.hullW. */
    outline(mesh, width = 1) {
      addHullNormals(mesh.geometry);
      const mat = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3, vertexShader: HULL_VERT, fragmentShader: HULL_FRAG,
        uniforms: { ...shared, uKeyDir: light.uKeyDir, uHullScale: { value: width }, uSeedObj: { value: (mesh.material?.userData?.nprId ?? 1) * 2.7 } },
        side: THREE.BackSide, blending: THREE.NoBlending,
      });
      const hull = new THREE.Mesh(mesh.geometry, mat);
      hull.layers.set(LAYER.MAIN);
      hull.name = (mesh.name || 'mesh') + ':hull';
      mesh.add(hull);
      return hull;
    },

    /** Register a mesh: {cast=true, receive, outline=0|width, glass=false}. Returns the mesh. */
    add(mesh, o = {}) {
      if (o.glass) { mesh.layers.set(LAYER.GLASS); return mesh; }
      mesh.layers.set(LAYER.MAIN);
      if (o.cast !== false) mesh.layers.enable(LAYER.CASTER);
      if (o.outline) npr.outline(mesh, o.outline === true ? 1 : o.outline);
      return mesh;
    },

    /** Per-frame state: boil seed (hand-drawn redraw cadence) and film-grain seed. */
    frame(ctx, { boilEvery, boilVariants } = {}) {
      const ev = boilEvery ?? ctx.meta.boil.every, va = boilVariants ?? ctx.meta.boil.variants;
      shared.uBoilSeed.value = (Math.floor(ctx.iw / ev) % va) * 1.618 + 0.37;
      shared.uFrameSeed.value = (ctx.iw % 1009) * 0.731 + 0.11;
      npr.glowList.length = 0; npr.beamList.length = 0; npr.smear = [0, 0];
      light.uPLN.value = 0;
      finalMat.uniforms.uFocus.value.set(0, 0, 0, 0);
      finalMat.uniforms.uImpact.value.x = 0;
      finalMat.uniforms.uVolN.value = 0;
      light.uProjA.value.set(0, 0, 0, 0); light.uProjD.value.set(1, 1, 1, 0);
    },

    /** Projector key light (film-comic): the key becomes a spot / light sheet from `apex`. Outside its footprint
     *  every surface drops into the shadow bands. footprint: { rect: [x0, x1, z0, z1] } or { disc: [cx, cz, r] } on
     *  the plane y = Ty. amount 0..1, soft = edge half-width (world), point = how much the shading direction comes
     *  from the apex (0 = keep the key direction), tint = [r, g, b] multiplied into the lit band (tintAmt 0..1). */
    setProjector({ apex, amount = 1, rect = null, disc = null, Ty = 0, soft = 0.12, point = 0.6, tint = [1, 1, 1], tintAmt = 0 } = {}) {
      if (!apex || amount <= 0.001) { light.uProjA.value.set(0, 0, 0, 0); return; }
      light.uProjA.value.set(apex[0], apex[1], apex[2], amount);
      if (rect) light.uProjB.value.set(...rect); else light.uProjB.value.set(disc[0], disc[1], disc[2], 0);
      light.uProjC.value.set(rect ? 0 : 1, soft, Ty, point);
      light.uProjD.value.set(tint[0], tint[1], tint[2], tintAmt);
    },

    /** Volumetric engraved light (film-comic): up to 2 per frame. Same footprint description as setProjector,
     *  plus color, i (0..1), density (per world unit), shadowed (march the key light's shadow map), seed. */
    volume({ apex, rect = null, disc = null, Ty = 0, color = 0xffffff, i = 1, density = 1.2, shadowed = true, seed = 0 } = {}) {
      const fu = finalMat.uniforms, k = fu.uVolN.value;
      if (k >= 2 || i <= 0.002) return;
      const c = rgb(color);
      fu.uVolA.value[k].set(apex[0], apex[1], apex[2], i);
      if (rect) fu.uVolB.value[k].set(...rect); else fu.uVolB.value[k].set(disc[0], disc[1], disc[2], 0);
      fu.uVolC.value[k].set(c[0], c[1], c[2], Ty);
      fu.uVolD.value[k].set(rect ? 0 : 1, seed * 1.7 + 0.3, shadowed ? 1 : 0, density);
      fu.uVolN.value = k + 1;
    },

    /** Comic concentration lines converging on a design-space point.
     *  { x, y, r0 (clear radius, design px), amount (0..1), count=90, width=1, seed=0 } */
    focusLines({ x, y, r0 = 300, amount = 1, count = 90, width = 1, seed = 0 } = {}) {
      if (amount <= 0.002) return;
      const [px, py] = npr.toPx(x, y);
      finalMat.uniforms.uFocus.value.set(px, py, r0 * S, amount);
      finalMat.uniforms.uFocusX.value.set(count, seed * 1.31 + 0.2, width, 0);
    },

    /** Impact frame: posterise the frame to ink + light by `k` (0..1); threshold on luminance relative
     *  to the paper; invert = light lines on ink. Use for 1-2 frames on a hit. */
    impact(k, { threshold = 0.55, invert = false } = {}) {
      finalMat.uniforms.uImpact.value.set(k, threshold, invert ? 1 : 0, 0);
    },

    /** Painted point light (world): lifts nearby surfaces towards its colour in soft bands. Max 4. */
    pointLight(pos, { color = 0xff6a9a, radius = 1, i = 1 } = {}) {
      const k = light.uPLN.value; if (k >= 4 || i <= 0.002) return;
      const c = rgb(color);
      light.uPL.value[k].set(pos.x, pos.y, pos.z, radius); light.uPLC.value[k].set(c[0], c[1], c[2], i);
      light.uPLN.value = k + 1;
    },

    /** Glow at a WORLD point: radius in world units (perspective-correct), occlusion probed at the
     *  front of the glowing object (pulled `radius` towards the camera) so it never hides itself.
     *  o: { radius, i, color, rays (0..1), rayLen (0..1), rayCount, behind, seed, occluded, probe } */
    glowAt(ctx, camera, pos, { radius = 0.1, probe = 1, ...o } = {}) {
      const s = ctx.project(pos, camera);
      const front = pos.clone().add(camera.position.clone().sub(pos).normalize().multiplyScalar(radius * probe));
      const f = ctx.project(front, camera);
      npr.glow({ x: s.x, y: s.y, z: f.z, zc: s.z, r: npr.pxPerUnit(camera, pos) * radius, ...o });
    },

    /** Beam between WORLD points with perspective width (world units) and depth occlusion. */
    beamAt(ctx, camera, a, b, { width = 0.05, ...o } = {}) {
      const p0 = ctx.project(a, camera), p1 = ctx.project(b, camera);
      npr.beam({ x0: p0.x, y0: p0.y, z0: p0.z, x1: p1.x, y1: p1.y, z1: p1.z,
        w: npr.pxPerUnit(camera, a.clone().lerp(b, 0.5)) * width, ...o });
    },

    /** Design-space point -> gl_FragCoord px (bottom-left origin). */
    toPx(x, y) { return [x * S + OX, H - (y * S + OY)]; },

    /**
     * Painted glow at a design-space point.
     *   { x, y, r (design px), i (0..1), color,
     *     rays (0..1)     engraved radiance (glowStyle 0) or burst star (glowStyle 1); `star` is an alias
     *     rayLen (0..1)   how far rays / burst spikes reach beyond the halo
     *     rayCount        number of rays (default 28) or burst spikes (default 12)
     *     behind (bool)   paint only on pixels farther than the light (needs zc = NDC z of the centre)
     *     seed            per-glow variation; z / occluded / zEps: occlusion probe (see glowAt) }
     */
    glow(g) { if (npr.glowList.length < MAX_GLOWS && g.i > 0.002) npr.glowList.push(g); },
    /** Painted beam between design-space points: {x0,y0,x1,y1, w, i, color, pulse (0..1 pos), pulseAmp,
     *  pulseW, lines (engraved line count across the beam, default 5; 0 = none), seed}. */
    beam(b) { if (npr.beamList.length < MAX_BEAMS && b.i > 0.002) npr.beamList.push(b); },

    /** Put the painterly depth of field's focus plane on a WORLD point (range = sharp half-depth in
     *  world units; default keeps the look's dofRange). */
    focusOn(camera, point, range) {
      const d = camera.position.distanceTo(point);
      shared.L_dofFocus.value = d;
      if (range != null) shared.L_dofRange.value = range;
      return d;
    },
    /** Directional smear in design px (whip pans). */
    setSmear(dx, dy) { npr.smear = [dx, dy]; },
    /** surface ids handed out so far (max BACKDROP_ID - 1) */
    idsUsed() { return nextId; },

    /** Run the whole pipeline and draw the frame into the layer canvas. Return false from the layer draw. */
    render(scene, camera) {
      const r = renderer;
      const prevAuto = r.autoClear; r.autoClear = true;
      scene.background = null;
      // 1. shadow map
      if (light.uShadowOn.value > 0.5) {
        scene.overrideMaterial = depthMat;
        r.setRenderTarget(shadowRT); r.setClearColor(0xffffff, 1);
        r.render(scene, lightCam);
        scene.overrideMaterial = null;
      }
      // 2. G-buffer
      const mask = camera.layers.mask;
      camera.layers.set(LAYER.MAIN);
      r.setRenderTarget(gRT); r.setClearColor(0x000000, 0);
      r.render(scene, camera);
      // 3. glass overlay
      camera.layers.set(LAYER.GLASS);
      r.setRenderTarget(glassRT); r.setClearColor(0x000000, 0);
      r.render(scene, camera);
      camera.layers.mask = mask;
      // 4. paint
      quad.material = paintMat; r.setRenderTarget(paintRT); r.render(quadScene, quadCam);
      // 5. final
      const fu = finalMat.uniforms;
      fu.uNear.value = camera.near; fu.uFar.value = camera.far; fu.uOrtho.value = camera.isOrthographicCamera ? 1 : 0;
      if (underTex) underTex.needsUpdate = true;
      fu.uGlowN.value = npr.glowList.length;
      npr.glowList.forEach((g, k) => {
        const [px, py] = npr.toPx(g.x, g.y), c = rgb(g.color ?? 0xffd27a);
        glowP[k].set(px, py, Math.max(1, g.r * S), g.i); glowC[k].set(c[0], c[1], c[2], g.rays ?? g.star ?? 0);
        // occlusion: g.z = NDC z of the light point (from ctx.project); dimmed to g.occluded (default 0.15)
        // w: depth of the light's centre, used by 'behind' glows
        fu.uGlowZ.value[k].set(g.z != null ? g.z * 0.5 + 0.5 : -1, g.zEps ?? 0.0004, g.occluded ?? 0.15,
          g.zc != null ? g.zc * 0.5 + 0.5 : -1);
        fu.uGlowX.value[k].set(g.behind ? 1 : 0, g.rayCount ?? 0, g.rayLen ?? 0.5, (g.seed ?? k) * 1.37 + 0.5);
      });
      fu.uBeamN.value = npr.beamList.length;
      npr.beamList.forEach((b, k) => {
        const [x0, y0] = npr.toPx(b.x0, b.y0), [x1, y1] = npr.toPx(b.x1, b.y1), c = rgb(b.color ?? 0xff6a5a);
        beamA[k].set(x0, y0, x1, y1); beamB[k].set(Math.max(1, b.w * S), b.i, b.pulse ?? -1, b.pulseAmp ?? 0);
        beamC[k].set(c[0], c[1], c[2], b.pulseW ?? 0.06);
        fu.uBeamZ.value[k].set(b.z0 != null ? b.z0 * 0.5 + 0.5 : -1, b.z1 != null ? b.z1 * 0.5 + 0.5 : -1, b.zEps ?? 0.0004, b.occluded ?? 0.0);
        fu.uBeamX.value[k].set(b.lines ?? 5, (b.seed ?? k) * 2.3 + 0.7, b.taper ?? 0, 0);
      });
      camera.updateMatrixWorld(true);
      fu.uVP.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      fu.uInvVP.value.copy(fu.uVP.value).invert();
      fu.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
      fu.uDebug.value = npr.debug | 0;
      fu.uSmear.value.set(npr.smear[0] * S, -npr.smear[1] * S);
      quad.material = finalMat; r.setRenderTarget(null); r.render(quadScene, quadCam);
      r.autoClear = prevAuto;
    },

    /** Block until the GPU has finished (1-pixel readback). Only for profiling: makes layer timings
     *  include GPU time. */
    sync() {
      const gl = renderer.getContext();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, _px1);
    },

    /** Design px per world unit at a world point (for sizing glows with perspective). */
    pxPerUnit(camera, p) {
      const d = camera.position.distanceTo(p);
      return (ctx.DH / 2) / (Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * d);
    },
  };
  npr.setLook(opts.look ?? 'engrave');
  npr.setLight(opts.light || {});
  if (opts.paper) npr.setPaper(opts.paper);
  if (opts.under) npr.setUnder(opts.under);
  return npr;
}
