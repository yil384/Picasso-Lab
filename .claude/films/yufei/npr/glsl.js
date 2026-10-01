// npr/glsl.js - shared GLSL snippets for the painterly three.js toolkit.
// Everything here is a pure function of its inputs: hashes are "hash without sine" (Dave Hoskins, MIT),
// so results are stable across frames and browser processes on the same GL backend.

export const NOISE = /* glsl */ `
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2  h22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float h31(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float vnoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  float a = h31(i), b = h31(i + vec3(1, 0, 0)), c = h31(i + vec3(0, 1, 0)), d = h31(i + vec3(1, 1, 0));
  float e = h31(i + vec3(0, 0, 1)), g = h31(i + vec3(1, 0, 1)), h = h31(i + vec3(0, 1, 1)), k = h31(i + vec3(1, 1, 1));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}
float fbm2(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.13; a *= .5; } return s / .9375; }
float fbm3(vec3 p) { float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * vnoise3(p); p = p * 2.07 + 11.7; a *= .5; } return s / .875; }
float lum(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
`;

// Vertex shader shared by surface materials: world/view/object positions + normals + uv.
export const SURFACE_VERT = /* glsl */ `
out vec3 vWorldPos; out vec3 vObjPos; out vec3 vViewN; out vec3 vWorldN; out vec2 vUv; out float vViewZ;
void main() {
  vUv = uv;
  vObjPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.);
  vWorldPos = wp.xyz;
  vViewN = normalize(normalMatrix * normal);
  vWorldN = normalize(transpose(mat3(viewMatrix)) * vViewN);
  vec4 mv = viewMatrix * wp;
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
