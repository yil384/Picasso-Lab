/* Xinwei — 厨神 = 美国厨神 MasterChef USA
   The approved SVG effect, now on the kit (3D comic: toon + ink props on the real photo, parallax tilt).
   Click: a steel pan swings into his real right hand (viewer left; his fingers are re-layered over the
   handle) and flambés at once; the fire front spreads out of the pan and burns the Golden Gate backdrop
   into a black-and-gold TV studio kitchen (subway-tile wall, a gold rail with two tomatoes, a lemon and
   a cucumber, a pot rail with a copper pan, ladle and whisk, a pantry shelf with a bottle); two gold
   pendant lamps drop in with halftone light cones; a steel station rises in front of him (gold stripe,
   knobs, a cutting board with carrot coins) and a red 厨神 seal stamps onto it; a white apron unrolls
   from his collar (red neckerchief, black-gold toque badge); a chef's knife swings into his other real
   fist, tip on the board; a pleated toque drops onto his head; a gold trophy pops onto the shelf in the
   lamp light; "YES, CHEF!" pops once from his mouth.
   Loop (3.2 s, the wok toss ~28 % of it): the pan pulls back and flicks — the stir-fry (broccoli,
   shrimp, red pepper, mushroom, snow pea, tofu) tumbles up out of it, the flame flares with embers and a
   whoosh, the knife glints; the pan dips to catch the food, a puff of steam; then a small flame, the
   turner stirs twice, two wisps of steam, the trophy glints.
   Coordinates: "stage px" = the 200 px avatar of the approved SVG (x right, y down); photo px = x 2.56.
   Photo landmarks (512 px): head top 259,118 · glasses v 155..166 (u 235..285) · mouth 259,182 ·
   collar V 256,227 · pan hand u 154..183, v 407..459 (grip 164,428) · knife fist u 304..324,
   v 401..440 · the station's top edge v 444. */
import { THREE, env, ease, clamp, lerp } from './kit.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const BEAT = 3.2, T0 = 0.3;                 // one "service" beat; the first flambé starts it
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const SP = 512 / 200;                       // stage px -> photo px
const GOLD = 0xe3a822, WHITE = 0xfbfaf6;

/* CSS timing functions (the approved snippet's curves) */
function bez(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, s = x;
    for (let i = 0; i < 24; i++) { s = (lo + hi) / 2; if (X(s) < x) lo = s; else hi = s; }
    return ((ay * s + by) * s + cy) * s;
  };
}
const EASE = bez(0.25, 0.1, 0.25, 1), E_OUT = bez(0, 0, 0.58, 1), E_IN = bez(0.42, 0, 1, 1), E_IO = bez(0.42, 0, 0.58, 1);
/** CSS-like keyframes: [[percent, [values], timing of the segment that starts here], ...] */
function track(keys, def = EASE) {
  return (pc) => {
    if (pc <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [p0, v0, f] = keys[i], [p1, v1] = keys[i + 1];
      if (pc <= p1) { const s = (f || def)((pc - p0) / (p1 - p0)); return v0.map((a, j) => a + (v1[j] - a) * s); }
    }
    return keys[keys.length - 1][1];
  };
}

// the beat, keyframe for keyframe as the approved CSS had it (values: CSS px, y down, deg clockwise)
const FLICK = track([[0, [0, 0, 0], bez(0.4, 0, 0.6, 1)], [4, [2.6, 1.4, -6], bez(0.3, 0.9, 0.4, 1)], [8, [-2.4, -1.6, 9], bez(0.4, 0, 0.5, 1)],
  [13, [-0.4, 0, 1], E_IO], [19, [0, 0, 0], bez(0.3, 0.8, 0.4, 1)], [21.5, [0.5, 1.4, -3.2], E_IO], [25.5, [0, 0, 0.9], E_IO], [29, [0, 0, 0]], [100, [0, 0, 0]]]);
const FIRE = track([[0, [0.4, 0.4]], [4, [0.34, 0.3], bez(0.2, 0.8, 0.3, 1)], [8.5, [1.1, 1.18]], [12, [0.98, 1.03]], [17, [0.72, 0.72]], [23, [0.44, 0.44]], [100, [0.4, 0.4]]], E_OUT);
const STIR = track([[0, [0, 0, 0]], [4, [0, 0, 0]], [8, [0, -1.4, 7]], [15, [0, 0, 0]], [36, [0, 0, 0]], [44, [-2.6, -1.4, -8]], [52, [2.2, 1.2, 6]], [60, [-1.8, -1, -5]], [68, [0, 0, 0]], [100, [0, 0, 0]]], E_IO);
const WHOOSH = track([[0, [0, 3, 3]], [5, [0, 3, 3]], [8, [1, 0, 0]], [13, [0, -2, -3]], [100, [0, -2, -3]]], E_OUT);
const PUFF = track([[0, [0, 4, 0.3]], [20, [0, 4, 0.3]], [23, [1, 0, 1]], [31, [0, -7, 1.25]], [100, [0, -7, 1.25]]], E_OUT);
const EMBER = track([[0, [0, 14, 0.4, 0]], [6, [0, 14, 0.4, 0]], [10, [1, 0, 1, 0]], [22, [0, -16, 0.6, 90]], [100, [0, -16, 0.6, 90]]], E_OUT);
const WISP_A = track([[0, [0]], [32, [0]], [48, [0.8]], [78, [0]], [100, [0]]], E_IO);
const WISP_T = track([[0, [6, 0.7]], [32, [6, 0.7]], [78, [-8, 1.05]], [100, [-8, 1.05]]], E_IO);
const KGLINT = track([[0, [0, 0.2, 0]], [4, [0, 0.2, 0]], [8, [1, 1.15, 45]], [16, [0, 0.3, 90]], [100, [0, 0.3, 90]]], E_OUT);
const TGLINT = track([[0, [0, 0.2, 0]], [50, [0, 0.2, 0]], [55, [1, 1.2, 45]], [62, [0, 0.3, 90]], [100, [0, 0.3, 90]]], E_OUT);
const YES = track([[0, [0, 0.15, 10], E_OUT], [11, [1, 1.04, -1], E_IO], [17, [1, 1, 0]], [84, [1, 1, 0], E_IN], [100, [0, 0.2, 0]]]);
const HAT = track([[0, [-10, 1, 1, -6], bez(0.5, 0, 0.9, 0.6)], [52, [1.2, 1.04, 0.95, 0], E_OUT], [76, [-1.4, 0.99, 1.02, 0]], [100, [0, 1, 1, 0]]]);

// the stir-fry: [kind, stage x, y (resting in the pan), keyframe start %, turn, up, peak, down, landing, bounce y, stir 44 %, stir 52 %]
const FOOD = [
  ['broccoli', 27.2, 145.2, 6.5, -1, [-1.6, -31.68], [-4, -44], [-0.34, -30.8], [2.65, 1.41], 0.11, [0.4, 0.21], [1.41, 0.75]],
  ['shrimp', 31.4, 146.8, 7, 1, [0.4, -33.12], [1, -46], [1.42, -32.2], [1.77, 0.94], -0.36, [-0.09, -0.05], [1.24, 0.66]],
  ['pepper', 35.4, 148.8, 7.5, -1, [2, -33.84], [5, -47], [1.28, -32.9], [-1.77, -0.94], -2.24, [-2.03, -1.08], [0.53, 0.28]],
  ['mushroom', 39.2, 150.6, 7, 1, [3.2, -28.8], [8, -40], [2.14, -28], [-2.65, -1.41], -2.71, [-2.52, -1.34], [0.35, 0.19]],
  ['pea', 42.4, 152.8, 7.5, -1, [4, -24.48], [10, -34], [2.8, -23.8], [-3.09, -1.64], -2.94, [-2.76, -1.47], [0.26, 0.14]],
  ['tofu', 33, 146.2, 6.5, 1, [-2.8, -35.28], [-7, -49], [-1.21, -34.3], [3.53, 1.88], 0.58, [0.88, 0.47], [1.59, 0.84]],
].map(([kind, x, y, p0, sg, up, pk, dn, ld, bo, s44, s52]) => ({
  kind, x, y, tr: track([
    [0, [0, 0, 0]], [p0, [0, 0, 0], bez(0.3, 0.6, 0.6, 1)],
    [p0 + 3, [...up, 108 * sg], bez(0.2, 0.6, 0.5, 1)], [p0 + 6.5, [...pk, 180 * sg], bez(0.5, 0, 0.8, 0.4)],
    [p0 + 10, [...dn, 270 * sg], bez(0.4, 0, 0.9, 0.5)], [p0 + 13, [...ld, 360 * sg], E_OUT],
    [p0 + 15, [ld[0], bo, 360 * sg], E_IN], [p0 + 17, [...ld, 360 * sg]], [38, [...ld, 360 * sg]],
    [44, [...s44, 352 * sg]], [52, [...s52, 366 * sg]], [60, [0, 0, 360 * sg]], [100, [0, 0, 360 * sg]],
  ]),
}));

// the approved drawing's paths (stage px)
const SVG = {
  apron: 'M90 93.4H112C112 103 113.6 112 117.4 119L116.8 182H83.2L82.6 119C86.4 112 90 103 90 93.4Z',
  apronShade: 'M111.9 93.8C112 103 113.4 111.6 116.9 118.8L116.4 181H112.2L112.6 120C110.6 112 109.8 103 110 93.8Z',
  pocket: 'M89.6 141H111L110.6 150.4C110.5 151.6 109.8 152.2 108.6 152.2H92C90.8 152.2 90.1 151.6 90 150.4Z',
  strapL: 'M89.6 93.6L93 83.6L95.8 84.4L92.5 93.6Z',
  strapR: 'M112.4 93.6L109 83.6L106.2 84.4L109.5 93.6Z',
  kerBand: 'M93 80.8Q100.9 86.4 108.8 80.8L109.6 84.4Q100.9 90.8 92.2 84.4Z',
  kerTri: 'M96.6 88.2H105.2L101 98.4Z',
  kerKnot: 'M98.2 85.4Q100.9 84.4 103.6 85.4L103.4 89.2Q100.9 90.2 98.4 89.2Z',
  badgeToque: 'M97.6 109.3C95.8 108.6 95.8 105.4 97.8 105C98.2 103.2 100.2 102.6 100.8 103.9C101.4 102.6 103.4 103.2 103.8 105C105.8 105.4 105.8 108.6 104 109.3Z M97.8 109.9H103.8V111.2H97.8Z',
  fireOut: 'M44.6 156A12.4 4.2 28 0 1 22.6 144.4C18.2 136.6 20 128.4 25.4 122C25 128.4 27.4 132 30.2 133.2C27.4 121.6 31.6 109.4 40.4 101C38.8 110.6 42 118.4 45.2 122.2C47.4 117.6 47.4 113 46.2 108.8C53.6 117 55.6 131.4 51.6 142.4C49.8 148 47.6 152.6 44.6 156Z',
  fireMid: 'M42.4 154.9A10 3.2 28 0 1 24.8 145.5C22.6 140.2 24.2 134.2 28.2 129.8C28.4 134.4 30.6 137.4 33.4 137.8C31.6 129 34.6 120.8 40 115C39.2 122.4 42 128 44.2 131.2C45.8 128.4 46.2 125.6 46 122.8C49.8 129.6 50.4 138.6 47.4 144.6C46 148.6 44.2 151.8 42.4 154.9Z',
  fireIn: 'M39.8 153.5A7 2.4 28 0 1 27.4 146.9C27.6 143.6 29.4 140.8 32.2 138C33.2 140.8 34.8 142 36.4 142.2C35.6 136.6 37.4 131.8 40.2 128.8C40.2 133.4 42.6 137.2 43 141C43.4 145.4 42 149.8 39.8 153.5Z',
  blade: 'M0 -4.4H22C25.5 -4.4 28.4 -3 29.6 -1.4C25 2.6 18.6 4.4 12 4.4H0Z',
  bladeBevel: 'M1.4 2.4H12C17.6 2.4 22.6 1.2 26.6 -.8L29.6 -1.4C25 2.6 18.6 4.4 12 4.4H0V2.4Z',
  cone: 'M54 33L66 33L88 108L32 108Z',
};

export default {
  title: 'MasterChef',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const P = (x, y, z = 0) => k.at(x * SP, y * SP, z);                      // stage px -> world
    const exitF = (e, order = 0) => 1 - ease.in(clamp(e * 1.6 - order * 0.6));
    const pct = (t, delay = T0) => (t < delay ? 0 : (((t - delay) % BEAT) / BEAT) * 100);
    const clipAll = (obj) => obj.traverse(o => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => k.clip(m)));
    const inked = (geo, mat, px = 1.2) => { const m = new THREE.Mesh(geo, mat); k.ink(m, px); return m; };
    const loader = new SVGLoader();
    /** SVG path (stage px, y down) -> THREE.Shapes in a local frame (origin at stage ox, oy; y up) */
    const shapesOf = (d, ox, oy, div = 14) => {
      const { paths } = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="${d}"/></svg>`);
      const to = (p) => new THREE.Vector2(p.x - ox, oy - p.y);
      return paths.flatMap(p => SVGLoader.createShapes(p)).map((s) => {
        const { shape, holes } = s.extractPoints(div);
        const S = new THREE.Shape(shape.map(to));
        holes.forEach(h => S.holes.push(new THREE.Path(h.map(to))));
        return S;
      });
    };
    const outlineOf = (d, ox, oy, width, div = 14) => {
      const { paths } = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="${d}"/></svg>`);
      const pts = paths[0].subPaths[0].getPoints(div).map(p => new THREE.Vector2(p.x - ox, oy - p.y));
      return SVGLoader.pointsToStroke(pts, SVGLoader.getStrokeStyle(width, '#000', 'round', 'round'));
    };
    const extrude = (shapes, depth = 0.8) => new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 1 });
    const remapUV = (geo, x0, y0, w, h) => {
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x0) / w, (p.getY(i) - y0) / h);
      uv.needsUpdate = true;
      return geo;
    };
    const cylGeo = (r, h, seg = 20) => { const g = new THREE.CylinderGeometry(r, r, h, seg); g.rotateX(Math.PI / 2); return g; };   // a disc facing the viewer
    const tmp = new THREE.Vector3();
    // the kit's lights make a face turned to the key light ~1.27 x its colour, which blows whites out:
    // light materials get their colour scaled so the lit tone is the drawing's colour and the toon
    // steps (right side, folds) still show
    const lit = (hex, opts = {}) => { const m = k.toon(0xffffff, opts); m.color.setHex(hex).multiplyScalar(0.79); return m; };

    // the photo and plate sit deeper than the stencil disc: clip them, or a sliver of the old backdrop
    // shows at the rim next to the new set
    k.clip(k.layers.plate.material);
    k.clip(k.layers.photo.material);

    /* ── ② the studio kitchen: a wall disc behind him, revealed by a fire front spreading from the pan ── */
    const WC = [34, 138];                                   // wipe centre = the pan (stage px)
    const WIPE = bez(0.3, 0, 0.3, 1);
    const wipeR = (t) => 232 * WIPE(env(t, 0.3, 1.0));
    const wallTex = k.canvasTexture(1024, 1024, (g) => {
      g.scale(1024 / 200, 1024 / 200);
      g.fillStyle = '#26232a'; g.fillRect(0, 0, 200, 200);
      // halftone light pools where the lamps shine on the wall
      for (const lx of [60, 140]) {
        for (let y = 36; y < 108; y += 2.4) for (let x = lx - 30; x < lx + 30; x += 2.4) {
          const half = 6 + (y - 33) * 0.37, dx = Math.abs(x + ((y / 2.4) % 2) * 1.2 - lx);
          if (dx > half) continue;
          const s = (1 - dx / half) * (1 - (y - 36) / 90);
          if (s < 0.08) continue;
          g.fillStyle = 'rgba(255,231,163,0.16)';
          g.beginPath(); g.arc(x + ((y / 2.4) % 2) * 1.2, y, 0.25 + 0.75 * s, 0, TAU); g.fill();
        }
      }
      g.strokeStyle = '#302d35'; g.lineWidth = 2;
      g.stroke(new Path2D('M34 0V108M70 0V108M130 0V108M166 0V108'));
      // black subway tiles under the gold rail (running bond)
      g.fillStyle = '#2e2c33'; g.fillRect(0, 111, 200, 89);
      g.strokeStyle = '#18171c'; g.lineWidth = 1;
      for (let y0 = 111; y0 < 200; y0 += 16) for (let x0 = 0; x0 < 200; x0 += 16) {
        g.beginPath();
        g.moveTo(x0, y0 + 0.5); g.lineTo(x0 + 16, y0 + 0.5); g.moveTo(x0, y0 + 8.5); g.lineTo(x0 + 16, y0 + 8.5);
        g.moveTo(x0 + 0.5, y0); g.lineTo(x0 + 0.5, y0 + 8); g.moveTo(x0 + 8.5, y0 + 8); g.lineTo(x0 + 8.5, y0 + 16);
        g.stroke();
      }
      g.fillStyle = '#e3a822'; g.fillRect(-2, 108, 204, 3.4);      // the gold rail (a 3D ledge sits on it)
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(-2, 111.4, 204, 2.2);   // its shadow on the tiles
      g.fillRect(134.5, 80, 70, 2);                                 // the pantry shelf's shadow
      g.fillRect(13.5, 61.4, 44, 1.4);                              // the pot rail's shadow
    });
    const col = (hex) => new THREE.Color(hex);
    const setU = { uR: { value: 0 }, uT: { value: 0 }, uOp: { value: 0 }, uC: { value: new THREE.Vector2(WC[0] - 100, 100 - WC[1]) }, uAA: { value: 0.8 / k.dpr } };
    const VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const wallMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { ...setU, uMap: { value: wallTex }, uInk: { value: col(0x15151a) }, uOr: { value: col(0xff5a1f) }, uYe: { value: col(0xffd43b) } },
      vertexShader: VS,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uR, uT, uOp, uAA; uniform vec2 uC; uniform vec3 uInk, uOr, uYe; varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * 200.0, d = p - uC;
          float r = length(d), th = atan(d.y, d.x);
          float w = step(0.5, uR) * (1.0 - smoothstep(170.0, 215.0, uR));          // the fire front, while it is in view
          float R = uR + w * (2.4 * sin(th * 9.0 + uT * 9.0) + 1.4 * sin(th * 17.0 - uT * 13.0));
          float inside = 1.0 - smoothstep(R - uAA, R + uAA, r);
          if (inside <= 0.0) discard;
          vec3 c = texture2D(uMap, vUv).rgb;
          float band = R - r;
          c = mix(c, uOr, w * (1.0 - smoothstep(4.6 - uAA, 4.6 + uAA, band)));
          c = mix(c, uYe, w * (1.0 - smoothstep(2.5 - uAA, 2.5 + uAA, band)));
          c = mix(c, uInk, w * (1.0 - smoothstep(1.1 - uAA, 1.1 + uAA, band)));
          gl_FragColor = vec4(c, inside * uOp);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    }));
    const discGeo = (pad) => {
      const geo = new THREE.CircleGeometry(k.R + pad, 128), uv = geo.attributes.uv, f = (k.R + pad) / k.R;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.5) * f + 0.5, (uv.getY(i) - 0.5) * f + 0.5);
      return geo;
    };
    const wall = new THREE.Mesh(discGeo(2), wallMat);
    wall.position.z = k.Z_BACK + 1;
    wall.scale.setScalar(k.depthScale(k.Z_BACK + 1));
    wall.renderOrder = -18;
    root.add(wall);

    // a thin ink line round his silhouette (the sticker cut), wherever the kitchen has replaced the backdrop
    const cutTex = k.layers.person.material.map;
    const silMat = new THREE.ShaderMaterial({
      uniforms: { ...setU, uCut: { value: cutTex }, uW: { value: 1.5 / k.s / 200 }, uInk: { value: col(0x15151a) } },
      vertexShader: VS,
      fragmentShader: `
        uniform sampler2D uCut; uniform float uR, uOp, uW; uniform vec2 uC; uniform vec3 uInk; varying vec2 vUv;
        void main() {
          float a = 0.0;
          for (int i = 0; i < 16; i++) { float an = float(i) * 0.392699; a = max(a, texture2D(uCut, vUv + vec2(cos(an), sin(an)) * uW).a); }
          vec2 p = (vUv - 0.5) * 200.0;
          float inside = 1.0 - smoothstep(uR - 6.0, uR - 2.0, length(p - uC));
          float o = smoothstep(0.25, 0.6, a) * inside * uOp;
          if (o <= 0.002) discard;
          gl_FragColor = vec4(uInk, o);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    });
    k.clip(silMat);
    const sil = new THREE.Mesh(new THREE.CircleGeometry(k.R, 128), silMat);
    sil.position.z = -0.4;
    sil.scale.setScalar(k.depthScale(-0.4));
    sil.renderOrder = 9;
    root.add(sil);

    // set pieces (3D, in front of the wall): the fire front burns them in too — their materials discard
    // what lies outside the wipe circle (measured in the stage's own frame, depth-compensated like k.at)
    const wipeU = { uR: setU.uR, uC: setU.uC, uRootInv: { value: new THREE.Matrix4() }, uDist: { value: k.dist } };
    const wipePatch = (sh) => {
      Object.assign(sh.uniforms, wipeU);
      sh.vertexShader = 'uniform mat4 uRootInv;\nvarying vec3 vWp;\n' + sh.vertexShader.replace('void main() {', 'void main() {\n  vWp = (uRootInv * modelMatrix * vec4(position, 1.0)).xyz;');
      sh.fragmentShader = 'uniform float uR, uDist;\nuniform vec2 uC;\nvarying vec3 vWp;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (length(vWp.xy * uDist / (uDist - vWp.z) - uC) > uR) discard;');
    };
    const wipeAll = (obj) => obj.traverse(o => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => {
      if (m.userData.wiped) return;
      m.userData.wiped = true;
      m.onBeforeCompile = wipePatch;
      m.customProgramCacheKey = () => 'xinwei-wipe';
    }));
    const setPieces = [];
    const setPiece = (obj) => { setPieces.push(obj); clipAll(obj); wipeAll(obj); root.add(obj); return obj; };
    const gold = k.toon(GOLD), steel = k.toon(0xb9c0c8);
    const setGold = k.toon(GOLD);

    // the gold rail as a ledge across the wall, produce on it (viewer right)
    const ledge = new THREE.Group();
    ledge.position.copy(P(100, 109.7, -31));
    ledge.add(inked(new THREE.BoxGeometry(206, 3.4, 5), setGold, 1));
    const tomato = k.toon(0xe5412c), leaf = k.toon(0x3f8a2e);
    const produce = [];
    const addProduce = (mesh, x, y, z = 1.5) => { mesh.position.set(x - 100, 109.7 - y, z); ledge.add(mesh); produce.push(mesh); return mesh; };
    [147, 167.5].forEach((x) => {
      const g = new THREE.Group();
      const m = inked(new THREE.SphereGeometry(4.3, 18, 12), tomato, 1); m.scale.set(1, 0.9, 0.9);
      const st = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.2, 5), leaf); st.position.y = 3.9; st.rotation.x = Math.PI;
      g.add(m, st);
      addProduce(g, x, 103.9);
    });
    { const m = inked(new THREE.SphereGeometry(1, 18, 12), k.toon(0xffd43b), 1); m.scale.set(4.8, 3.7, 3.4); addProduce(m, 157.5, 104.4); }
    { const m = inked(new THREE.CapsuleGeometry(1.5, 9, 4, 10), k.toon(0x4f9a3a), 1); m.rotation.z = -0.12; addProduce(m, 179, 101.4); }
    setPiece(ledge);

    // pot rail (viewer left): steel bar, copper pan, ladle, whisk
    const potRail = new THREE.Group();
    potRail.position.copy(P(34, 60, -27));
    { const bar = inked(new THREE.CylinderGeometry(1.1, 1.1, 46, 10), steel, 1); bar.rotation.z = Math.PI / 2; potRail.add(bar); }
    const hang = [];
    {
      const g = new THREE.Group(); g.position.set(22 - 34, 0, 0);            // copper pan, handle up
      const h = inked(new THREE.BoxGeometry(2.2, 12, 1.4), k.toon(0x6b4a2c), 0.9); h.position.y = -6;
      const pan = inked(cylGeo(8.4, 2.4, 32), k.toon(0xc9773f), 1.2); pan.position.y = -19.5;
      const inner = new THREE.Mesh(new THREE.CircleGeometry(5.8, 32), k.toon(0xa95f2e)); inner.position.set(0, -19.5, 1.25);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12), new THREE.MeshBasicMaterial({ color: 0x15151a })); hole.position.set(0, -1.8, 0.75);
      g.add(h, pan, inner, hole); potRail.add(g); hang.push(g);
    }
    {
      const g = new THREE.Group(); g.position.set(37 - 34, 0, 0);            // ladle
      const s = inked(new THREE.CylinderGeometry(0.75, 0.75, 17, 8), steel, 0.9); s.position.y = -8.5;
      const b = inked(new THREE.SphereGeometry(3.8, 16, 8, 0, TAU, Math.PI / 2, Math.PI / 2), k.toon(0xb9c0c8, { side: THREE.DoubleSide }), 1); b.position.y = -17.5;
      g.add(s, b); potRail.add(g); hang.push(g);
    }
    {
      const g = new THREE.Group(); g.position.set(49 - 34, 0, 0);            // whisk
      const s = inked(new THREE.CylinderGeometry(0.75, 0.75, 7.5, 8), steel, 0.9); s.position.y = -3.75;
      const wire = k.toon(0xd3d9df);
      [0, 1, 2].forEach((i) => {
        const w = inked(new THREE.TorusGeometry(1, 0.16, 5, 28), wire, 0.6);
        w.scale.set(3.4, 7.2, 3.4); w.position.y = -14.6; w.rotation.y = (i * Math.PI) / 3;
        g.add(w);
      });
      g.add(s); potRail.add(g); hang.push(g);
    }
    setPiece(potRail);

    // pantry shelf (viewer right) with a bottle; the trophy stands on it (⑧)
    const shelf = new THREE.Group();
    shelf.position.copy(P(168, 78.5, -25));
    shelf.add(inked(new THREE.BoxGeometry(72, 3, 9), setGold, 1));
    {
      const prof = [[0.01, 0], [3.5, 0], [3.5, 9.6], [3.1, 11.2], [1.9, 13.6], [1.5, 14.6], [1.5, 19], [0.01, 19]].map(([r, y]) => new THREE.Vector2(r, y));
      const b = inked(new THREE.LatheGeometry(prof, 20), k.toon(0x4f8f45), 1);
      const capM = inked(new THREE.CylinderGeometry(2.3, 2.3, 2.4, 14), setGold, 0.8); capM.position.y = 20;
      const bottle = new THREE.Group(); bottle.add(b, capM); bottle.position.set(180.5 - 168, 1.5, 0);
      shelf.add(bottle);
    }
    setPiece(shelf);

    // two gold pendant lamps with halftone light cones: they drop in once the fire front has passed
    const coneTex = k.canvasTexture(224, 300, (g, w, h) => {
      g.scale(w / 56, h / 75); g.translate(-32, -33);
      g.save(); g.clip(new Path2D(SVG.cone));
      g.fillStyle = 'rgba(255,231,163,0.16)'; g.fillRect(32, 33, 56, 75);
      for (let y = 34; y < 108; y += 2.2) for (let x = 32; x < 88; x += 2.2) {
        const ox = ((y / 2.2) % 2) * 1.1, half = 6 + (y - 33) * 0.373, dx = Math.abs(x + ox - 60);
        const s = (1 - dx / half) * (1 - (y - 33) / 95);
        if (s <= 0.05) continue;
        g.fillStyle = 'rgba(255,240,196,0.55)';
        g.beginPath(); g.arc(x + ox, y, 0.2 + 0.7 * s, 0, TAU); g.fill();
      }
      g.restore();
    });
    const lampMat = k.toon(GOLD, { side: THREE.DoubleSide });
    const lamps = [60, 140].map((x) => {
      const g = new THREE.Group();                    // pivot = the cord's top (stage y 0)
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 22, 6), new THREE.MeshBasicMaterial({ color: 0x0c0c0f }));
      cord.position.y = -11;
      const shade = inked(new THREE.CylinderGeometry(5, 9, 11, 28, 1, true), lampMat, 1.2); shade.position.y = -26.5;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.6, 20), lampMat); top.position.y = -21.2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8, 0, TAU, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff3bf }));
      bulb.position.y = -31.6; bulb.scale.set(1, 0.8, 0.6);
      const cone = new THREE.Mesh(new THREE.PlaneGeometry(56, 75), new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, depthWrite: false }));
      cone.position.set(0, -70.5, -5); cone.renderOrder = -17;
      g.add(cord, shade, top, bulb, cone);
      g.userData.home = P(x, 0, -24);
      g.position.copy(g.userData.home);
      setPiece(g);
      return g;
    });

    /* ── ⑧ gold trophy on the pantry shelf. Origin = the bottom of its plinth (stage 157, 77) ── */
    const trophy = new THREE.Group(), tSpin = new THREE.Group();
    trophy.add(tSpin);
    {
      const GT = k.toon(0xf2b632), GD = k.toon(0xc98f1a), GH = k.toon(0xffd76a);
      const plinth = inked(new THREE.CylinderGeometry(6.4, 8.4, 6.8, 4, 1), k.toon(0x1c1a1f), 1.1);
      plinth.rotation.y = Math.PI / 4; plinth.scale.set(1.05, 1, 0.55); plinth.position.y = 3.4;
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 3), new THREE.MeshBasicMaterial({ color: GOLD }));
      plaque.position.set(0, 3.5, 3.45);
      const stem = inked(new THREE.CylinderGeometry(1.5, 1.8, 6.8, 12), GD, 0.9); stem.position.y = 10.2;
      const knot = inked(new THREE.SphereGeometry(2.3, 12, 8), GT, 0.8); knot.position.y = 12.8;
      const cupProf = [[0.01, 0], [3, 0.5], [6, 2.4], [8.3, 5.6], [9.3, 9.6], [9.6, 16.2]].map(([r, y]) => new THREE.Vector2(r, y));
      const cup = inked(new THREE.LatheGeometry(cupProf, 32), GT, 1.3); cup.position.y = 11.2;
      const rimM = inked(new THREE.TorusGeometry(9.6, 0.85, 8, 36), GH, 0.8); rimM.rotation.x = Math.PI / 2; rimM.position.y = 27.4;
      const inside = new THREE.Mesh(new THREE.CircleGeometry(9.4, 32), GD); inside.rotation.x = -Math.PI / 2; inside.position.y = 27.2;
      const handles = [-1, 1].map((sx) => {
        const h = inked(new THREE.TorusGeometry(4.6, 1.05, 8, 20, Math.PI), GT, 1);
        h.rotation.z = sx < 0 ? Math.PI / 2 : -Math.PI / 2; h.position.set(sx * 9.4, 20, 0); h.scale.set(1, 1, 1);
        return h;
      });
      const starShape = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.1 : 4.5, a = Math.PI / 2 + (i * Math.PI) / 5; if (i) starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape), new THREE.MeshBasicMaterial({ color: 0x15151a }));
      star.position.set(0, 19.2, 9.0);
      tSpin.add(plinth, plaque, stem, knot, cup, rimM, inside, ...handles, star);
    }
    const trophyHome = P(157, 77, -22);
    trophy.position.copy(trophyHome);
    clipAll(trophy);
    root.add(trophy);

    /* ── ③ the station: a steel counter rising in front of him, tilted so its top shows ── */
    const counter = new THREE.Group();
    const counterHome = P(100, 181, 16);                  // origin = the top's front edge
    counter.position.copy(counterHome);
    const ctop = new THREE.Group();
    ctop.rotation.x = 0.5;
    counter.add(ctop);
    {
      // brushed steel on top, halftone shading down the front
      const topTex = k.canvasTexture(512, 32, (g, w, h) => {
        g.fillStyle = '#e8ebee'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#d3d8dd'; g.fillRect(0, 0, w, h * 0.3);
        g.fillStyle = '#ffffff'; g.fillRect(0, h - 5, w, 2);
        g.strokeStyle = 'rgba(160,168,178,0.45)'; g.lineWidth = 1;
        for (let i = 0; i < 26; i++) { const y = 3 + ((i * 7.3) % (h - 9)), x = (i * 97) % w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 + (i % 5) * 18, y); g.stroke(); }
      });
      const frontTex = k.canvasTexture(512, 74, (g, w, h) => {
        g.fillStyle = '#aab1b9'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#8e969f';
        for (let y = 4; y < h; y += 5) for (let x = (y / 5) % 2 ? 2.5 : 0; x < w; x += 5) {
          const r = 0.2 + 1.5 * clamp((y - 20) / 50);
          if (r > 0.25) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
        }
      });
      const sTop = lit(0xffffff, { map: topTex }), sFront = lit(0xffffff, { map: frontTex });
      const body = new THREE.Mesh(new THREE.BoxGeometry(236, 34, 16), [sFront, sFront, sTop, sFront, sFront, sFront]);
      body.position.set(0, -17, -8);
      k.ink(body, 1.4);
      const lip = inked(new THREE.CylinderGeometry(1.2, 1.2, 236, 10), lit(0xf6f8fa), 0.9); lip.rotation.z = Math.PI / 2; lip.position.set(0, -0.4, 0.2);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(236, 2.3, 0.6), gold); stripe.position.set(0, -3.9, 0.3);
      const inkM = new THREE.MeshBasicMaterial({ color: 0x15151a });
      const backEdge = new THREE.Mesh(new THREE.BoxGeometry(236, 1.3, 1.3), inkM); backEdge.position.set(0, 0, -15.6);   // the top's far edge, inked
      const stripeInk = new THREE.Mesh(new THREE.BoxGeometry(236, 3.4, 0.4), inkM); stripeInk.position.set(0, -3.9, 0.05);
      const knobs = [-24, 24].map((x) => {
        const g = new THREE.Group(); g.position.set(x, -12.4, 0); g.rotation.x = -0.5;    // facing the camera
        const kb = inked(cylGeo(3.4, 2.6, 24), k.toon(0x1c1a1f), 0.9); kb.position.z = 1.3;
        const dot = new THREE.Mesh(new THREE.CircleGeometry(1.3, 16), new THREE.MeshBasicMaterial({ color: GOLD })); dot.position.z = 2.65;
        g.add(kb, dot); return g;
      });
      const board = inked(new THREE.BoxGeometry(42, 2.6, 11), lit(0xc98a4b), 1); board.position.set(46.3, 1.3, -6.5);
      const carrot = k.toon(0xff8a2a);
      const coins = [[61, -4.5], [65.4, -2.6]].map(([x, z]) => { const c = inked(new THREE.CylinderGeometry(2, 2, 1, 16), carrot, 0.7); c.position.set(x, 3.1, z); return c; });
      ctop.add(body, lip, stripe, backEdge, stripeInk, ...knobs, board, ...coins);
    }
    // the 厨神 seal on the station front (the only calligraphy — a small accent)
    const seal = k.card(21.2, 11, (g, w, h) => {
      g.scale(w / 21.2, h / 11);
      g.fillStyle = '#c8302a'; g.strokeStyle = '#15151a'; g.lineWidth = 1;
      g.beginPath(); g.roundRect(0.5, 0.5, 20.2, 10, 1.6); g.fill(); g.stroke();
      g.strokeStyle = '#fff4e6'; g.lineWidth = 0.6;
      g.beginPath(); g.roundRect(2, 2, 17.2, 7, 0.8); g.stroke();
      g.fillStyle = '#fff4e6'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = "700 6.8px 'Kaiti SC', STKaiti, KaiTi, 'Songti SC', STSong, SimSun, 'Noto Serif CJK SC', 'Noto Sans CJK SC', serif";
      g.fillText('厨神', 10.6, 5.8);
    }, { res: 4 });
    seal.position.set(0, -12.2, 0.4);
    ctop.add(seal);
    clipAll(counter);
    root.add(counter);

    /* ── ⑤ apron + neckerchief, unrolling from the collar (pivot stage 101, 84) ── */
    const apron = new THREE.Group();
    apron.position.copy(P(101, 84, 3));
    root.add(apron);
    {
      const apronTex = k.canvasTexture(280, 712, (g, w, h) => {
        g.scale(w / 34.8, h / 88.6); g.translate(-82.6, -93.4);
        g.fillStyle = '#fbfaf6'; g.fillRect(80, 90, 40, 95);
        g.fillStyle = '#e9e4d8'; g.fill(new Path2D(SVG.apronShade));
        g.lineJoin = 'round';
        g.strokeStyle = '#d6d0c3'; g.lineWidth = 1.1;
        g.stroke(new Path2D('M93 158C93.8 164 93.4 170 93 176M107.5 158C106.8 164 107.2 170 107.6 176'));
        const pk = new Path2D(SVG.pocket);
        g.fillStyle = '#fbfaf6'; g.fill(pk);
        g.strokeStyle = '#15151a'; g.lineWidth = 1.4; g.stroke(pk);
        g.strokeStyle = '#e3a822'; g.lineWidth = 1.4; g.stroke(new Path2D('M89.8 141H110.8'));
      });
      const geo = remapUV(extrude(shapesOf(SVG.apron, 101, 84), 0.8), 82.6 - 101, 84 - 182, 34.8, 88.6);
      apron.add(inked(geo, lit(0xffffff, { map: apronTex }), 1.5));
      const strapMat = lit(WHITE);
      [SVG.strapL, SVG.strapR].forEach((d) => { const m = inked(extrude(shapesOf(d, 101, 84), 0.6), strapMat, 1.2); m.position.z = 0.2; apron.add(m); });
      // badge: gold rim, black field, gold toque
      const badge = new THREE.Group();
      badge.position.set(100.8 - 101, 84 - 107, 1.4);
      const rimB = inked(cylGeo(7.4, 1.4, 32), gold, 1); rimB.position.z = 0.3;
      const faceTex = k.canvasTexture(128, 128, (g, w) => {
        g.scale(w / 14.8, w / 14.8); g.translate(-(100.8 - 7.4), -(107 - 7.4));
        g.fillStyle = '#15151a'; g.beginPath(); g.arc(100.8, 107, 6.3, 0, TAU); g.fill();
        g.fillStyle = '#e3a822'; g.fill(new Path2D(SVG.badgeToque));
      });
      const face = new THREE.Mesh(new THREE.CircleGeometry(6.6, 32), new THREE.MeshBasicMaterial({ map: faceTex }));
      face.position.z = 1.05;
      badge.add(rimB, face);
      apron.add(badge);
      const red = k.toon(0xd8352a);
      const band = inked(extrude(shapesOf(SVG.kerBand, 101, 84), 0.8), red, 1.1); band.position.z = 0.9;
      const tri = inked(extrude(shapesOf(SVG.kerTri, 101, 84), 0.8), red, 1.1); tri.position.z = 1.3;
      const knotK = inked(extrude(shapesOf(SVG.kerKnot, 101, 84), 1.4), k.toon(0xe0453a), 1); knotK.position.z = 1.9;
      apron.add(band, tri, knotK);
      // its drop shadow on his jacket
      const shade = new THREE.Mesh(new THREE.ShapeGeometry(shapesOf(SVG.apron, 101, 84)), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
      shade.position.set(0.6, -2, -2.6); shade.renderOrder = 11;
      apron.add(shade);
    }

    /* ── ④ pleated toque (pivot = the band's bottom centre, stage 101, 55) ── */
    const hat = new THREE.Group(), hatFit = new THREE.Group(), hatBody = new THREE.Group();
    hat.position.copy(P(101, 55, 3));
    hat.add(hatFit); hatFit.add(hatBody);
    hatBody.scale.set(1, 1, 0.55);
    hatBody.rotation.x = 0.18;               // seen a touch from above, like the drawing (the band sags in front)
    root.add(hat);
    {
      const hw = lit(WHITE);
      const bandH = inked(new THREE.CylinderGeometry(14.6, 14.3, 8.8, 48), hw, 1.3); bandH.position.y = 4.4;
      const stripeH = new THREE.Mesh(new THREE.TorusGeometry(14.62, 0.55, 6, 48), gold); stripeH.rotation.x = Math.PI / 2; stripeH.position.y = 4.6;
      // the crown: widening, with the three pleat lines of the drawing down its front
      const pleatTex = k.canvasTexture(512, 64, (g, w, h) => {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#cbc3b3'; g.lineWidth = 7;
        [0, 0.085, -0.085].forEach((u) => { const x = ((u + 1) % 1) * w; g.beginPath(); g.moveTo(x, h); g.lineTo(x, h * 0.1); g.stroke(); if (x < 8) { g.beginPath(); g.moveTo(x + w, h); g.lineTo(x + w, h * 0.1); g.stroke(); } });
      });
      const prof = [[12.6, 0], [13.3, 4], [14.9, 10], [16.9, 16], [18.6, 21], [19.3, 24], [17.8, 26], [12, 27], [0.01, 27.4]].map(([r, y]) => new THREE.Vector2(r, y));
      const crown = inked(new THREE.LatheGeometry(prof, 64), lit(WHITE, { map: pleatTex }), 1.3); crown.position.y = 7.8;
      // three puffs on top (the drawing's bumpy crown), inked where they overlap
      const puffs = [[-10.8, 32.4, 7.9, -1], [10.8, 32.4, 7.9, -1], [0, 34.2, 8.7, 0.6]].map(([x, y, r, z]) => {
        const m = inked(new THREE.SphereGeometry(r, 24, 16), hw, 1.2); m.position.set(x, y, z); return m;
      });
      hatBody.add(crown, bandH, stripeH, ...puffs);
      // the band's shadow on his hair
      const hs = new THREE.Mesh(new THREE.PlaneGeometry(27, 3.2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
      hs.position.set(0.4, -1.3, -2.8); hs.renderOrder = 11;
      hatFit.add(hs);
    }

    /* ── ① the pan, held by the handle in his real right hand (viewer left) ── */
    const GRIP = [64, 167], PAN_Z = 18;
    const pan = new THREE.Group();                 // swings in (pivot = the grip)
    pan.position.copy(P(GRIP[0], GRIP[1], PAN_Z));
    const flick = new THREE.Group();               // the toss
    pan.add(flick);
    root.add(pan);
    const at = (x, y, z = 0) => new THREE.Vector3(x - GRIP[0], GRIP[1] - y, z);   // stage px -> the pan's frame
    const panBody = new THREE.Group();
    panBody.rotation.z = -30 * DEG;
    flick.add(panBody);
    const PR = 14.6, PH = 5.4, ALPHA = 0.56;       // rim radius, depth, the opening's tilt toward us
    const bowlG = new THREE.Group();
    bowlG.position.set(-34.7, 0, 0);
    bowlG.rotation.x = ALPHA;
    panBody.add(bowlG);
    {
      const prof = [[0.01, 0], [10.4, 0], [11.7, 0.4], [13.2, 2.3], [14.1, 4.4], [PR, PH]].map(([r, y]) => new THREE.Vector2(r, y));
      const outer = inked(new THREE.LatheGeometry(prof, 48), lit(0x9aa2ab), 1.4);
      const inner = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), k.toon(0x5d646c, { side: THREE.BackSide }));
      const floor = new THREE.Mesh(new THREE.CircleGeometry(10.4, 40), k.toon(0x5d646c)); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05;
      const rimP = inked(new THREE.TorusGeometry(PR, 0.85, 8, 56), lit(0xdfe4e9), 0.8); rimP.rotation.x = Math.PI / 2; rimP.position.y = PH;
      bowlG.add(outer, inner, floor, rimP);
      // stainless handle, from the pan's side into his fist
      const hand = inked(new THREE.BoxGeometry(29, 4.3, 1.6), lit(0xc3c9d0), 1.2);
      hand.position.set(-8.2, 0.6, 0.5); hand.rotation.z = -0.1;
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.9), new THREE.MeshBasicMaterial({ color: 0xeef1f4 }));
      hl.position.set(-8.4, 1.3, 1.35); hl.rotation.z = -0.1;
      const rivet = new THREE.Mesh(new THREE.CircleGeometry(0.8, 10), new THREE.MeshBasicMaterial({ color: 0x5d646c }));
      rivet.position.set(-20.4, 1.9, 1.4);
      panBody.add(hand, hl, rivet);
    }
    // the fire (the approved flame, three layers + ink), rising out of the pan (pivot stage 33.6, 151)
    const FIRE_O = [33.6, 151];
    const fireG = new THREE.Group();
    fireG.position.copy(at(FIRE_O[0], FIRE_O[1], 4.2));
    flick.add(fireG);
    const flames = [];
    [[SVG.fireOut, 0xff5a1f, 12], [SVG.fireMid, 0xffa21f, 14], [SVG.fireIn, 0xffe14d, 15]].forEach(([d, c, ro], i) => {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shapesOf(d, FIRE_O[0], FIRE_O[1], 16)), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
      m.position.z = i * 0.12; m.renderOrder = ro;
      fireG.add(m); flames.push(m);
    });
    {
      const m = new THREE.Mesh(outlineOf(SVG.fireOut, FIRE_O[0], FIRE_O[1], 2, 16), new THREE.MeshBasicMaterial({ color: 0x15151a, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
      m.position.z = 0.06; m.renderOrder = 13;
      fireG.add(m);
    }
    // the wooden turner left in the pan (pivot stage 37.4, 148.6)
    const turner = new THREE.Group();
    turner.position.copy(at(37.4, 148.6, 5.2));
    flick.add(turner);
    {
      const wood = k.toon(0xc98a4b);
      const a = new THREE.Vector2(38.4 - 37.4, 148.6 - 146.4), b = new THREE.Vector2(51.4 - 37.4, 148.6 - 127.4);
      const len = a.distanceTo(b);
      const stick = inked(new THREE.CylinderGeometry(0.95, 0.95, len, 8), wood, 1);
      stick.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0.4);
      stick.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
      const blade = inked(new THREE.BoxGeometry(7.4, 3.3, 0.8), wood, 1);
      blade.position.set(37.4 - 37.4, 148.6 - 148.8, 0); blade.rotation.z = 29 * DEG;
      turner.add(stick, blade);
    }
    // the stir-fry pieces: sit in the pan, tumble up on the flick, land back
    const foodG = new THREE.Group();
    flick.add(foodG);
    const foods = FOOD.map((f, i) => {
      const holder = new THREE.Group();
      const piece = new THREE.Group();
      holder.add(piece);
      holder.position.copy(at(f.x, f.y, 6.2 + (i % 3) * 0.7));
      const S = 1.25;
      if (f.kind === 'broccoli') {
        const fl = k.toon(0x4fa83d);
        [[-1.4, 0.6, 1.5], [1.3, 0.8, 1.6], [0, 1.9, 1.7]].forEach(([x, y, r]) => { const s = inked(new THREE.SphereGeometry(r, 10, 8), fl, 0.8); s.position.set(x, y, 0); piece.add(s); });
        const st = inked(new THREE.CylinderGeometry(0.7, 0.9, 2.6, 8), k.toon(0x9ccf6e), 0.7); st.position.y = -1.3; piece.add(st);
      } else if (f.kind === 'shrimp') {
        const body = inked(new THREE.TorusGeometry(2.1, 0.95, 8, 16, 4.3), k.toon(0xffc9b0), 0.8); body.rotation.z = 0.6;
        const tail = inked(new THREE.ConeGeometry(1.1, 1.8, 6), k.toon(0xff6a3d), 0.7); tail.position.set(2.3, -0.4, 0); tail.rotation.z = -2.2;
        piece.add(body, tail);
      } else if (f.kind === 'pepper') {
        const m = inked(new THREE.TorusGeometry(4.2, 0.85, 6, 14, 1.35), k.toon(0xd22a20), 0.8); m.rotation.z = Math.PI / 2 - 0.68; m.position.y = -3.6; m.scale.set(1, 1, 0.7);
        piece.add(m);
      } else if (f.kind === 'mushroom') {
        const cap = inked(new THREE.SphereGeometry(2.7, 14, 8, 0, TAU, 0, Math.PI / 2), k.toon(0x7a4a2a), 0.8); cap.position.y = 0.2;
        const st = inked(new THREE.CylinderGeometry(0.8, 0.9, 2.2, 8), k.toon(0xead7bf), 0.7); st.position.y = -0.9;
        piece.add(cap, st);
      } else if (f.kind === 'pea') {
        const m = inked(new THREE.SphereGeometry(1, 14, 8), k.toon(0x9ed36a), 0.8); m.scale.set(3.3, 1.15, 1.4); m.rotation.z = 0.15;
        piece.add(m);
      } else {
        const m = inked(new THREE.BoxGeometry(3.8, 3.8, 3.8), lit(0xfff1d6), 0.8); m.rotation.set(0.3, 0.5, 0.1);
        piece.add(m);
      }
      piece.scale.setScalar(S);
      piece.rotation.y = 0.4 * (i % 2 ? 1 : -1);
      foodG.add(holder);
      return { ...f, holder, piece, i };
    });
    // his real fingers over the handle (only above the station top)
    const panHand = k.patch([[182, 408], [172, 408.6], [165, 410], [155.3, 412.4], [153.6, 419.7], [154.3, 431], [156.4, 439.7], [158.2, 444.5], [180.3, 444.5], [181.2, 441], [182.6, 431], [183.1, 419.7]], 24);

    /* ── ⑥ the chef's knife in his real left fist (viewer right), tip on the board ── */
    const KP = [124, 165];
    const knife = new THREE.Group();
    knife.position.copy(P(KP[0], KP[1], 19));
    const kFit = new THREE.Group();
    kFit.position.set(128.6 - KP[0], KP[1] - 166.6, 0);
    kFit.rotation.z = -22 * DEG;
    knife.add(kFit);
    root.add(knife);
    {
      const bladeTex = k.canvasTexture(256, 80, (g, w, h) => {
        g.scale(w / 29.6, h / 8.8); g.translate(0, 4.4);
        g.fillStyle = '#e6ebef'; g.fillRect(-1, -5, 32, 10);
        g.fillStyle = '#cdd4db'; g.fill(new Path2D(SVG.bladeBevel));
        g.strokeStyle = '#a3adb8'; g.lineWidth = 1.1; g.stroke(new Path2D('M1.4 2.4H12C17.6 2.4 22.6 1.2 26.6 -.8'));
        g.strokeStyle = '#ffffff'; g.lineWidth = 0.8; g.stroke(new Path2D('M1 -3.3H21'));
      });
      const geo = remapUV(extrude(shapesOf(SVG.blade, 0, 0), 0.7), 0, -4.4, 29.6, 8.8);
      const blade = inked(geo, lit(0xffffff, { map: bladeTex }), 1.2);
      const bolster = inked(new THREE.BoxGeometry(4.2, 10, 2.2), k.toon(0x8f99a4), 1); bolster.position.set(-1.5, 0, 0.3);
      const handleK = inked(new THREE.BoxGeometry(6, 6.8, 2.8), k.toon(0x2c2420), 1); handleK.position.set(-6.6, 0, 0.3);
      kFit.add(blade, bolster, handleK);
    }
    const fist = k.patch([[309.7, 401.6], [315.4, 400.6], [323.4, 405], [324.4, 412.6], [323.6, 424], [322.2, 431], [320, 435.6], [315.6, 440], [311, 440.8], [306.8, 439.4], [305.1, 434], [303.7, 426.9], [305.1, 419.7], [307.3, 408.3]], 25);

    // anchors for the 2D layer
    const head = new THREE.Group(); head.position.copy(P(93, 70, 0)); root.add(head);        // the balloon's tail tip (his cheek)

    const LAMP = bez(0.2, 1.5, 0.4, 1);

    return {
      update(t, e) {
        const ph = pct(t);

        // ② the set: fire front out of the pan, the kitchen behind it
        // on the exit the kitchen collapses back into the pan (the fire front runs home)
        const R = wipeR(t) * (1 - ease.inOut(clamp(e * 1.15)));
        setU.uR.value = R; setU.uT.value = t;
        setU.uOp.value = clamp(t / 0.15) * (1 - ease.in(e));
        wipeU.uRootInv.value.copy(root.matrixWorld).invert();
        const setOn = R > 0.5 && e < 1;
        wall.visible = sil.visible = setOn;
        setPieces.forEach((o) => { o.visible = setOn; });
        hang.forEach((h, i) => { h.rotation.z = 0.05 * Math.sin(((t - 0.6) * TAU) / BEAT + i * 1.3) * env(t, 0.6, 1.2); });
        lamps.forEach((g, i) => {
          const drop = LAMP(env(t, 0.7, 1.3));
          g.position.set(g.userData.home.x, g.userData.home.y + 16 * (1 - drop), g.userData.home.z);
          g.rotation.z = 0.025 * Math.sin(((t - 1.3) * TAU) / (BEAT * 1.5) + i * 2) * env(t, 1.3, 2);
        });

        // ⑧ trophy pops onto the shelf with a half turn, then sways a little in the light
        const tp = bez(0.2, 1.6, 0.4, 1)(env(t, 0.95, 1.4));
        k.show(trophy, tp * exitF(e, 0.3));
        tSpin.rotation.y = (1 - ease.out(env(t, 0.95, 1.4))) * -Math.PI + 0.28 * Math.sin(((t - 1.4) * TAU) / (BEAT * 2)) * env(t, 1.4, 2.2);

        // ③ station rises (clipped by the circle, so it comes up from below the rim)
        const cp = bez(0.2, 1.2, 0.4, 1)(env(t, 0.08, 0.53));
        counter.visible = t > 0.08 && e < 1;
        counter.position.set(counterHome.x, counterHome.y - 30 * (1 - cp) - 34 * ease.in(clamp(e * 1.4)), counterHome.z);
        const sp = bez(0.3, 1.5, 0.5, 1)(env(t, 1.15, 1.4));
        k.show(seal, t > 1.15 ? (2 - sp) * exitF(e, 0.2) : 0);

        // ⑤ apron unrolls from the collar
        const ap = bez(0.2, 1.3, 0.4, 1)(env(t, 0.5, 1.0));
        k.show(apron, Math.min(1, env(t, 0.5, 0.62)) * exitF(e, 0));
        apron.scale.y *= lerp(0.25, 1, ap);

        // ④ toque drops onto his head, a small squash on landing
        const [hy, hsx, hsy, hr] = HAT(env(t, 0.6, 1.3) * 100);
        k.show(hat, Math.min(1, env(t, 0.6, 0.72)) * exitF(e, 0.05));
        hatFit.position.y = -hy; hatFit.scale.set(hsx, hsy, 1); hatFit.rotation.z = -hr * DEG;

        // ① pan swings into his hand; the toss (flick, fire, food, turner) once per beat
        const pp = bez(0.2, 1.4, 0.4, 1)(env(t, 0, 0.4));
        k.show(pan, Math.min(1, env(t, 0, 0.12)) * (0.4 + 0.6 * pp) * exitF(e, 0.75));
        pan.rotation.z = 38 * DEG * (1 - pp);
        panHand.visible = pan.visible;
        const [fx, fy, fr] = FLICK(ph);
        flick.position.set(fx, -fy, 0); flick.rotation.z = -fr * DEG;
        bowlG.rotation.x = ALPHA + 0.1 * Math.max(0, fr) / 9;
        const [sx, sy] = FIRE(ph);
        const flick8 = 1 + 0.05 * Math.sin(t * 23) * (0.4 + 0.6 * sx);     // a small flicker
        fireG.scale.set(sx * (2 - flick8), sy * flick8, 1);
        flames[1].scale.set(1 + 0.04 * Math.sin(t * 31 + 1), 1 - 0.04 * Math.sin(t * 27), 1);
        flames[2].scale.set(1 - 0.05 * Math.sin(t * 29 + 2), 1 + 0.06 * Math.sin(t * 25 + 1), 1);
        const [stx, sty, str] = STIR(ph);
        turner.position.copy(at(37.4 + stx, 148.6 + sty, 5.2)); turner.rotation.z = -str * DEG;
        foods.forEach((f) => {
          const [dx, dy, rot] = f.tr(ph);
          const base = at(f.x + dx * 1.15, f.y + dy * 1.15, 6.2 + (f.i % 3) * 0.7);
          f.holder.position.copy(base);
          f.holder.rotation.z = -rot * DEG;
          f.holder.rotation.x = Math.sin((Math.abs(rot) / 360) * Math.PI) * 1.3 * (f.i % 2 ? 1 : -1);
        });

        // ⑥ knife swings into his other fist
        const kp = bez(0.2, 1.4, 0.4, 1)(env(t, 0.55, 1.05));
        k.show(knife, Math.min(1, env(t, 0.55, 0.7)) * (0.4 + 0.6 * kp) * exitF(e, 0.2));
        knife.rotation.z = -28 * DEG * (1 - kp);
        fist.visible = knife.visible;
      },

      draw2d(q, t, e) {
        const c = q.drawingContext || q.ctx;
        const fade = 1 - e;
        if (fade <= 0.001) return;
        const ph = pct(t);
        const proj = (obj, x, y, z) => { tmp.set(x, y, z); obj.localToWorld(tmp); root.worldToLocal(tmp); return k.toScreen(tmp); };
        // canvas transform mapping stage px of a group's frame (its origin = stage px, py) to logical screen px
        const frame = (obj, px, py, z = 0) => {
          const o = proj(obj, 0, 0, z), ax = proj(obj, 10, 0, z), ay = proj(obj, 0, -10, z);
          const a = (ax[0] - o[0]) / 10, b = (ax[1] - o[1]) / 10, cc = (ay[0] - o[0]) / 10, d = (ay[1] - o[1]) / 10;
          return [a, b, cc, d, o[0] - a * px - cc * py, o[1] - b * px - d * py];
        };
        c.save();
        c.lineJoin = 'round'; c.lineCap = 'round';
        const INK = '#15151a';

        if (pan.visible) {
          // embers, scaled with the flame (they are inside it)
          const fr = frame(fireG, FIRE_O[0], FIRE_O[1], 0.5);
          const EMB = [[SVG_E1, 26, 122, 0], [SVG_E2, 44, 107, 0.06], [SVG_E3, 52, 124.5, 0.03], [null, 34, 112, 0.09]];
          EMB.forEach(([p2d, ex, ey, dl]) => {
            const [op, ty, s, rot] = EMBER(pct(t, T0 + dl));
            if (op * fade < 0.01) return;
            c.save(); c.transform(...fr);
            c.translate(ex, ey + ty); c.rotate(rot * DEG); c.scale(s, s); c.translate(-ex, -ey);
            c.globalAlpha = op * fade;
            c.fillStyle = '#ffd43b'; c.strokeStyle = INK; c.lineWidth = 0.9;
            if (p2d) { c.fill(p2d); c.stroke(p2d); } else { c.beginPath(); c.arc(ex, ey, 1.4, 0, TAU); c.fill(); c.stroke(); }
            c.restore();
          });
          // whoosh, puff, wisps: in the pan's frame (not the flick)
          const pf = frame(pan, GRIP[0], GRIP[1], 0);
          const [wo, wx, wy] = WHOOSH(ph);
          if (wo * fade > 0.01) {
            c.save(); c.transform(...pf); c.translate(wx, wy);
            c.globalAlpha = wo * fade;
            c.strokeStyle = INK; c.lineWidth = 3.1; c.stroke(SVG_WH);
            c.strokeStyle = '#f4f1ea'; c.lineWidth = 1.5; c.stroke(SVG_WH);
            c.restore();
          }
          const [po, pty, ps] = PUFF(ph);
          if (po * fade > 0.01) {
            c.save(); c.transform(...pf);
            c.translate(34.1, 139.4 + pty); c.scale(ps, ps); c.translate(-34.1, -139.4);
            c.globalAlpha = po * fade;
            c.fillStyle = '#f4f1ea'; c.strokeStyle = INK; c.lineWidth = 0.9; c.fill(SVG_PUFF); c.stroke(SVG_PUFF);
            c.restore();
          }
          [[SVG_W1, 30, 140, 0], [SVG_W2, 40, 138, 0.25]].forEach(([p2d, ox, oy, dl]) => {
            const [wa] = WISP_A(pct(t, T0 + dl)), [wty, wsy] = WISP_T(pct(t, T0 + dl));
            if (wa * fade < 0.01) return;
            c.save(); c.transform(...pf);
            c.translate(ox, oy + wty); c.scale(1, wsy); c.translate(-ox, -oy);
            c.globalAlpha = wa * fade;
            c.strokeStyle = 'rgba(21,21,26,0.35)'; c.lineWidth = 3; c.stroke(p2d);
            c.strokeStyle = '#f4f1ea'; c.lineWidth = 1.8; c.stroke(p2d);
            c.restore();
          });
        }

        // glints: the knife's blade on the flick, the trophy mid-beat
        const glint = (m, x, y, [op, s, rot]) => {
          if (op * fade < 0.01) return;
          c.save(); c.transform(...m);
          c.translate(x, y); c.rotate(rot * DEG); c.scale(s, s);
          c.globalAlpha = op * fade;
          c.fillStyle = '#ffffff'; c.strokeStyle = INK; c.lineWidth = 0.9; c.fill(SVG_STAR); c.stroke(SVG_STAR);
          c.restore();
        };
        if (knife.visible) glint(frame(knife, KP[0], KP[1], 1.5), 148.8, 169.6, KGLINT(pct(t, T0 + 0.1)));
        if (trophy.visible && t > 1.4) glint(frame(trophy, 157, 77, 10), 150.4, 51, TGLINT(ph));

        // ⑨ YES, CHEF! — pops once from his mouth, then leaves
        const yp = (t - 0.95) / 2.6 * 100;
        if (yp > 0 && yp < 100) {
          const [yo, ys, yr] = YES(yp);
          if (yo * fade > 0.01) {
            c.save(); c.transform(...frame(head, 93, 70, 0));
            c.translate(93, 70); c.rotate(yr * DEG); c.scale(ys * (0.5 + 0.5 * fade), ys * (0.5 + 0.5 * fade)); c.translate(-93, -70);
            c.globalAlpha = yo * fade;
            c.translate(55, 40); c.rotate(-6 * DEG); c.translate(-55, -40);
            c.fillStyle = '#fffdf7'; c.strokeStyle = INK; c.lineWidth = 2;
            c.fill(SVG_TAIL); c.stroke(SVG_TAIL);
            c.beginPath(); c.ellipse(55, 40, 24.6, 12.2, 0, 0, TAU); c.fill(); c.stroke();
            c.fill(SVG_TAIL_IN);
            c.font = "italic 800 11.4px 'Avenir Next Condensed', Futura, 'Arial Narrow', Impact, 'Arial Black', sans-serif";
            c.textAlign = 'center'; c.textBaseline = 'alphabetic';
            const w = c.measureText('YES, CHEF!').width || 40;
            c.translate(55, 44); c.scale(40 / w, 1);
            c.fillStyle = INK; c.fillText('YES, CHEF!', 0, 0);
            c.restore();
          }
        }
        c.restore();
      },

      dispose() {},
    };
  },
};

const SVG_E1 = typeof Path2D !== 'undefined' ? new Path2D('M26 118L27.1 120.9L30 122L27.1 123.1L26 126L24.9 123.1L22 122L24.9 120.9Z') : null;
const SVG_E2 = typeof Path2D !== 'undefined' ? new Path2D('M44 104L44.9 106.1L47 107L44.9 107.9L44 110L43.1 107.9L41 107L43.1 106.1Z') : null;
const SVG_E3 = typeof Path2D !== 'undefined' ? new Path2D('M52 122L52.8 123.7L54.5 124.5L52.8 125.3L52 127L51.2 125.3L49.5 124.5L51.2 123.7Z') : null;
const SVG_WH = typeof Path2D !== 'undefined' ? new Path2D('M20.4 128.6Q15.2 136.4 17.6 145.4M25.4 124.4Q19.6 131.6 21.2 139.6') : null;
const SVG_PUFF = typeof Path2D !== 'undefined' ? new Path2D('M28.6 139.4A2.6 2.6 0 0 1 30.4 135A3.2 3.2 0 0 1 36.4 134A2.6 2.6 0 0 1 39.6 138.8Z') : null;
const SVG_W1 = typeof Path2D !== 'undefined' ? new Path2D('M30 140C27 135 33 131 30 126C27 121 32 118 30 114') : null;
const SVG_W2 = typeof Path2D !== 'undefined' ? new Path2D('M40 138C37 133 43 129 40 124C37 119 42 116 40 112') : null;
const SVG_STAR = typeof Path2D !== 'undefined' ? new Path2D('M0 -4.6L1.2 -1.2L4.6 0L1.2 1.2L0 4.6L-1.2 1.2L-4.6 0L-1.2 -1.2Z') : null;
const SVG_TAIL = typeof Path2D !== 'undefined' ? new Path2D('M66.4 48.2L89.6 73.8L72.8 45.6') : null;
const SVG_TAIL_IN = typeof Path2D !== 'undefined' ? new Path2D('M67.6 47.2L85.6 68.4L71.6 46Z') : null;
