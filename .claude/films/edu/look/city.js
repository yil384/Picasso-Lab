// Many towers at once (the 58-layer avenue, the 320-building city): one instanced box per tower, its front face drawn
// as the same white-card facade as hospital.js (16 x 16 rooms, corridor slabs, columns, lobby), and which rooms glow
// read per tower from a data texture (row = tower, column = room), so the lit pattern can come from a real trace.
import { COLS, ROWS, BAY, FH, GF, END, DEPTH, BW, BH } from '/edu/look/hospital.js';

function facadeCanvas() {
  const W = 1024, H = Math.round(W * BH / BW), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), sx = W / BW, sy = H / BH, X = (x) => x * sx, Y = (y) => H - y * sy;
  g.fillStyle = '#ece7dd'; g.fillRect(0, 0, W, H);
  // lobby: a dark glazed band with mullions
  g.fillStyle = '#5d554b'; g.fillRect(X(BW * 0.25), Y(GF - 0.05), X(BW * 0.5), (GF - 0.05) * sy);
  // corridor slabs: a lit edge with a soft shadow under it, one per floor
  for (let r = 0; r <= ROWS; r++) {
    const y = Y(GF + r * FH);
    const gr = g.createLinearGradient(0, y, 0, y + 0.03 * sy); gr.addColorStop(0, 'rgba(70,60,50,0.38)'); gr.addColorStop(1, 'rgba(70,60,50,0)');
    g.fillStyle = gr; g.fillRect(0, y, W, 0.03 * sy);
    g.fillStyle = '#f8f5ef'; g.fillRect(0, y - 0.012 * sy, W, 0.012 * sy);
    if (r < ROWS) { g.fillStyle = 'rgba(248,245,239,0.9)'; g.fillRect(0, Y(GF + r * FH + 0.05), W, 0.004 * sy); }   // the railing
  }
  // door reveals
  g.fillStyle = '#a49b8d';
  for (let r = 0; r < ROWS; r++) for (let cI = 0; cI < COLS; cI++) {
    const x = END + (cI + 0.5) * BAY - 0.012 - 0.029, y = GF + r * FH;
    g.fillRect(X(x), Y(y + 0.09), 0.058 * sx, 0.09 * sy);
  }
  // columns every 4 bays
  g.fillStyle = '#f6f2ea';
  for (let cI = 0; cI <= COLS; cI += 4) g.fillRect(X(END + cI * BAY) - 0.008 * sx, Y(BH - 0.02), 0.016 * sx, (BH - GF) * sy);
  return c;
}

export function cityKit(T, { n, place, lit, scale = 1 }) {
  const { THREE, scene } = T;
  const fac = new THREE.CanvasTexture(facadeCanvas()); fac.colorSpace = THREE.SRGBColorSpace; fac.anisotropy = 16;
  // lit rooms: a float texture, row i = tower i, 256 columns = rooms (0..1)
  const data = new Float32Array(256 * n);
  for (let i = 0; i < n; i++) for (const [room, k] of lit(i)) data[i * 256 + room - 1] = k;
  const litTex = new THREE.DataTexture(data, 256, n, THREE.RedFormat, THREE.FloatType); litTex.needsUpdate = true;
  const card = new THREE.MeshStandardMaterial({ color: 0xf0ece3, roughness: 0.92 });
  const front = new THREE.MeshStandardMaterial({ map: fac, roughness: 0.9 });
  front.onBeforeCompile = (sh) => {
    sh.uniforms.uLit = { value: litTex }; sh.uniforms.uN = { value: n };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nflat varying float vInst;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInst = float(gl_InstanceID);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      flat varying float vInst; uniform sampler2D uLit; uniform float uN;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        // which room is this texel in, and is it inside the doorway?
        vec2 p = vec2(vMapUv.x * ${BW.toFixed(4)}, vMapUv.y * ${BH.toFixed(4)});
        float c = floor((p.x - ${END.toFixed(4)}) / ${BAY.toFixed(4)}), r = floor((p.y - ${GF.toFixed(4)}) / ${FH.toFixed(4)});
        if (c >= 0.0 && c < ${COLS}.0 && r >= 0.0 && r < ${ROWS}.0) {
          float lx = p.x - (${END.toFixed(4)} + (c + 0.5) * ${BAY.toFixed(4)} - 0.012), ly = p.y - (${GF.toFixed(4)} + r * ${FH.toFixed(4)});
          float inDoor = step(abs(lx), 0.025) * step(0.0, ly) * step(ly, 0.084);
          float k = texture2D(uLit, vec2((r * ${COLS}.0 + c + 0.5) / 256.0, (vInst + 0.5) / uN)).r;
          totalEmissiveRadiance += vec3(5.0, 3.1, 1.3) * k * inDoor;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.07, 0.04), k * inDoor);
        }
      }`);
  };
  front.customProgramCacheKey = () => 'edu-city-front';
  const geo = new THREE.BoxGeometry(BW, BH, DEPTH); geo.translate(0, BH / 2, -DEPTH / 2);
  const mesh = new THREE.InstancedMesh(geo, [card, card, card, card, front, card], n);
  mesh.castShadow = mesh.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const [x, y, z, ry, k] = place(i); q.setFromEuler(new THREE.Euler(0, ry ?? 0, 0)); s.setScalar((k ?? 1) * scale);
    m4.compose(v.set(x, y, z), q, s); mesh.setMatrixAt(i, m4);
  }
  mesh.instanceMatrix.needsUpdate = true; scene.add(mesh);
  return { mesh, litTex, data };
}
