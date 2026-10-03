// Timeline, easing and camera helpers for the launch film. Everything is a pure function of the frame index.
export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const eio = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const eio5 = (x) => { x = clamp(x); return x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2; };
export const eout = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
export const eout5 = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 5); };
export const ein = (x) => { x = clamp(x); return x * x * x; };
export const eback = (x, s = 1.7) => { x = clamp(x); const c = s + 1; return 1 + c * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
// a spring that settles: overshoot then rest (for landings, pops)
export const spring = (x, k = 4.5, d = 5) => { x = Math.max(0, x); return 1 - Math.exp(-d * x) * Math.cos(k * TAU * x * 0.25); };
export const hsh = (...n) => { let x = Math.sin(n.reduce((s, v, i) => s + v * (12.9898 + i * 78.233), 0.5)) * 43758.5453; return x - Math.floor(x); };
// a window: rises over fa frames from a, falls over fb frames ending at b
export const win = (f, a, b, fa = 12, fb = fa) => sm((f - a) / fa) * (1 - sm((f - b + fb) / fb));
export const seg = (f, a, b) => clamp((f - a) / (b - a));

// Camera keys: [frame, pos[3], target[3], fov, ease?]. Catmull-Rom through the positions (no corners), eased time
// between keys; a key may name its own ease for the segment that ends at it.
export function camRig(keys) {
  const P = keys.map((k) => k[1]), Tg = keys.map((k) => k[2]);
  const cr = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    return p1.map((_, j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3));
  };
  return (f) => {
    if (f <= keys[0][0]) return { p: P[0], t: Tg[0], fov: keys[0][3], seg: 0, u: 0 };
    for (let i = 1; i < keys.length; i++) if (f < keys[i][0]) {
      const e = keys[i][4] || eio, u = e((f - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
      const i0 = Math.max(0, i - 2), i3 = Math.min(keys.length - 1, i + 1);
      const hold = keys[i][5] === 'linear';
      const p = hold ? mix3(P[i - 1], P[i], u) : cr(P[i0], P[i - 1], P[i], P[i3], u);
      const t = hold ? mix3(Tg[i - 1], Tg[i], u) : cr(Tg[i0], Tg[i - 1], Tg[i], Tg[i3], u);
      return { p, t, fov: lerp(keys[i - 1][3], keys[i][3], u), seg: i, u };
    }
    const k = keys[keys.length - 1]; return { p: k[1], t: k[2], fov: k[3], seg: keys.length, u: 1 };
  };
}

// Directional motion blur in screen space: a whip pan smears along its direction. Strength 0 = pass-through.
export const MotionBlurShader = {
  uniforms: { tDiffuse: { value: null }, uDir: { value: [0, 0] }, uK: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uDir; uniform float uK; varying vec2 vUv;
    void main(){
      if (uK < 0.0005) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec4 acc = vec4(0.0); float wsum = 0.0;
      for (int i = 0; i < 15; i++) {
        float s = (float(i) / 14.0 - 0.5);
        float w = 1.0 - abs(s) * 1.2;
        acc += texture2D(tDiffuse, vUv + uDir * s * uK) * w; wsum += w;
      }
      gl_FragColor = acc / wsum;
    }`,
};

// Grade + vignette + fine film grain (grain from the frame index: deterministic)
export const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.28 }, uGrain: { value: 0.022 }, uFrame: { value: 0 }, uFlash: { value: 0 }, uFlashCol: { value: [1, 1, 1] }, uFade: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig, uGrain, uFrame, uFlash, uFade; uniform vec3 uFlashCol; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uFrame * 0.6180339) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - 0.5; q.x *= 0.8;
      c.rgb *= 1.0 - uVig * smoothstep(0.18, 0.75, length(q));
      c.rgb += (h(vUv * 1000.0) - 0.5) * uGrain;
      c.rgb = mix(c.rgb, uFlashCol, uFlash);
      c.rgb = mix(c.rgb, vec3(0.0431, 0.0431, 0.0549), uFade);
      gl_FragColor = c;
    }`,
};
