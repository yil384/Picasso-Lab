// q_traps.js - atoms, their optical traps and the AOD grid.
//  * SLM traps: static teal light pedestals under each site (a glass-layer shader with engraved light rays,
//    depth-tested against the npr G-buffer by hand) - after reference/story-picturebook/qb_world.js.
//  * AOD: amber dashed row / column lines laid on the plate (decals sharing the plate's surface id, so they read as
//    light on the plate, never as rods through the atoms), plus an amber pedestal under every atom it holds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rgb } from './npr/npr.js';
import { NOISE, SURFACE_VERT } from './npr/glsl.js';

const CONE_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uS; uniform float uBoilSeed;
${NOISE}
layout(location = 0) out vec4 oG;
in vec3 vWorldPos; in vec3 vObjPos; in vec3 vViewN; in vec3 vWorldN; in vec2 vUv; in float vViewZ;
uniform sampler2D tDepth; uniform vec3 uCol; uniform float uAmt; uniform float uSeed;
void main() {
  float u = vUv.x * 10. + uSeed;
  float fw = fwidth(u);
  float sd = textureLod(tDepth, gl_FragCoord.xy / uRes, 0.).r;
  if (gl_FragCoord.z > sd + 2e-6) discard;
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vWorldN);
  float fac = abs(dot(N, V));
  float h = vUv.y;
  float n = vnoise(vec2(vUv.x * 9. + uSeed, h * 3. + uBoilSeed * 1.7));
  float fade = smoothstep(0., .5, h + (n - .5) * .25) * (.5 + .5 * h);
  float a = uAmt * fade * (.18 + .36 * fac);
  vec4 o = vec4(uCol * a, a);
  float d = abs(fract(u) - .5);
  float ray = 1. - smoothstep(fw * .9, fw * 2.2 + .03, d);
  float la = clamp(uAmt * fade * ray * .6 * (.4 + .6 * fac), 0., 1.);
  vec3 lc = uCol * uCol * .6;
  o = vec4(lc * la + o.rgb * (1. - la), la + o.a * (1. - la));
  oG = o;
}`;

export function coneMat(npr, color, amt, seed) {
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

/** A light pedestal (cone from the plate up to under the atom). Returns the mesh (added to scene). */
export function pedestal(npr, scene, geo, color, seed, amt = 0.9) {
  const m = new THREE.Mesh(geo, coneMat(npr, color, amt, seed));
  npr.add(m, { glass: true }); scene.add(m);
  return m;
}
export function pedestalGeo(hover, R) {
  const h = hover - R * 0.6;
  const g = new THREE.CylinderGeometry(R * 0.45, R * 1.7, h, 40, 1, true); g.translate(0, h / 2, 0);
  return g;
}

/** Dashed line decal along x (alongZ=false) or z, centred on 0, length len. Returns geometry with userData.n dashes. */
export function dashGeo(len, { dash = 0.2, step = 0.32, width = 0.07, alongZ = false } = {}) {
  const gs = [];
  const n = Math.max(1, Math.floor(len / step));
  const x0 = -((n - 1) * step) / 2;
  for (let k = 0; k < n; k++) {
    const x = x0 + k * step;
    const g = alongZ ? new THREE.BoxGeometry(width, 0.016, dash) : new THREE.BoxGeometry(dash, 0.016, width);
    g.translate(alongZ ? 0 : x, 0, alongZ ? x : 0); gs.push(g);
  }
  const mg = mergeGeometries(gs); mg.userData.n = n; return mg;
}
