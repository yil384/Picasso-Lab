// The v7 studio (approved look): curved fibre-bumped papers, soft area lights + rim, a glossy floor that reflects,
// a curved cyclorama, bokeh + bloom, plus a whip-pan motion blur and a grade/grain pass.
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { hsh, TAU, MotionBlurShader, GradeShader } from '/scene/lib.js';
import { FLOOR, ASP } from '/scene/layouts.js';

const loadImg = (u) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = u; });

function fiberTexture(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const im = g.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) { const v = 128 + (hsh(i, 1) - 0.5) * 34; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); g.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const x = hsh(i, 2) * 512, y = hsh(i, 3) * 512, a = hsh(i, 4) * TAU, L = 3 + hsh(i, 5) * 10, w = hsh(i, 6) > 0.5 ? 255 : 0;
    g.strokeStyle = `rgba(${w},${w},${w},0.10)`; g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 4); t.colorSpace = THREE.NoColorSpace;
  return t;
}
// a sheet that is not a plane: a gentle curl across, a sag along, one corner lifting
export function sheetGeometry(THREE, curl, sag, lift, seed, asp = ASP) {
  const g = new THREE.PlaneGeometry(asp, 1, 24, 30), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (asp / 2), y = p.getY(i) * 2;
    let z = curl * 0.05 * x * x + sag * 0.025 * (1 - y * y);
    z += lift * 0.07 * Math.max(0, x - 0.35) * Math.max(0, y - 0.35);
    z += 0.003 * Math.sin(x * 3 + seed) * Math.cos(y * 2 + seed);
    p.setZ(i, z);
  }
  g.computeVertexNormals();
  return g;
}

export async function buildStudio(ctx, { THREE, renderer }, D, o = {}) {
  RectAreaLightUniformsLib.init();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b0e);
  scene.fog = new THREE.Fog(0x0b0b0e, 7, 22);
  const camera = new THREE.PerspectiveCamera(30, ctx.W / ctx.H, 0.05, 60);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.12;

  const key = new THREE.RectAreaLight(0xfff7ee, 1.3, 5, 3); key.position.set(1.2, 3.2, 3.2); key.lookAt(0, 0.2, 0); scene.add(key);
  const rim = new THREE.RectAreaLight(0x9cc2ff, 2.2, 2.5, 4); rim.position.set(-3.0, 3.0, -3.6); rim.lookAt(0, 0.6, 0); scene.add(rim);
  const kick = new THREE.RectAreaLight(0xffd2a8, 0.8, 1.5, 3); kick.position.set(3.4, 0.8, -1.2); kick.lookAt(0, 0.4, 0); scene.add(kick);
  const sh = new THREE.DirectionalLight(0xffffff, 0.35); sh.position.set(1.0, 6, 2.2); sh.castShadow = true;
  sh.shadow.mapSize.set(2048, 2048); Object.assign(sh.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  sh.shadow.radius = 9; sh.shadow.blurSamples = 24; sh.shadow.bias = -0.0005; scene.add(sh, sh.target);
  // a warm practical (desk lamp / laptop glow / hero light), off unless a shot uses it
  const prac = new THREE.PointLight(0xffc98a, 0, 3.5, 1.8); scene.add(prac);

  const mirror = new Reflector(new THREE.PlaneGeometry(40, 40), { textureWidth: ctx.W, textureHeight: ctx.H, color: 0x8a8a90, clipBias: 0.003 });
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = FLOOR; scene.add(mirror);
  const coat = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0e0e12, roughness: 0.55, metalness: 0.0, transparent: true, opacity: 0.9 }));
  coat.rotation.x = -Math.PI / 2; coat.position.y = FLOOR + 0.001; coat.receiveShadow = true; scene.add(coat);
  const cyc = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 16, 96, 1, true, Math.PI * 0.55, Math.PI * 0.9),
    new THREE.MeshStandardMaterial({ color: 0x131318, roughness: 0.95, side: THREE.BackSide }));
  cyc.position.set(0, FLOOR + 8, 2); scene.add(cyc);

  // papers: a front with the real first page and a plain back, each its own curl
  const bump = fiberTexture(THREE);
  const backMat = new THREE.MeshPhysicalMaterial({ color: 0xebe8e1, roughness: 0.8, bumpMap: bump, bumpScale: 0.6, sheen: 0.4, sheenRoughness: 0.8, side: THREE.BackSide });
  // the back of a printed sheet: warm paper with the front page showing through, mirrored, at a few percent
  const showThrough = (img) => {
    const w = 256, h = Math.round(256 * img.height / img.width), c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.fillStyle = '#ece8e0'; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.09; g.drawImage(img, 0, 0, w, h);   // BackSide already mirrors the UVs
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const papers = {};
  for (const p of D.pubs) {
    const img = await loadImg(`/scene/pages/${String(p.k).padStart(3, '0')}.jpg`);
    const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.needsUpdate = true;
    const k = p.k, geo = sheetGeometry(THREE, 0.6 + hsh(k, 1) * 0.8, hsh(k, 2) - 0.3, hsh(k, 3), k);
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.74, bumpMap: bump, bumpScale: 0.5, sheen: 0.35, sheenRoughness: 0.85, sheenColor: 0xffffff,
      emissive: 0xffd27a, emissiveIntensity: 0 });
    mat.userData.uSat = { value: 1 };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSat = mat.userData.uSat;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSat;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)); diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, uSat); }');
    };
    mat.customProgramCacheKey = () => 'pvpaper';
    const bmat = new THREE.MeshPhysicalMaterial({ map: showThrough(img), roughness: 0.8, bumpMap: bump, bumpScale: 0.6, sheen: 0.4, sheenRoughness: 0.8, side: THREE.BackSide });
    const front = new THREE.Mesh(geo, mat), back = new THREE.Mesh(geo, bmat);
    front.castShadow = back.castShadow = true; front.receiveShadow = true;
    const g = new THREE.Group(); g.add(front, back); scene.add(g); g.visible = false;
    papers[k] = { g, mat, bmat, img };
  }
  // the three glass rings of the logo
  const rings = [0x3f8cff, 0x63d36f, 0xff4d4d].map((c) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 48, 160), new THREE.MeshPhysicalMaterial({
      color: c, emissive: c, emissiveIntensity: 0.18, roughness: 0.1, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 2.2, transparent: true }));
    scene.add(m); m.visible = false; return m;
  });

  const rt = new THREE.WebGLRenderTarget(ctx.W, ctx.H, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 3, aperture: 0.0006, maxblur: 0.006 });
  composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(ctx.W, ctx.H), 0.14, 0.6, 0.96);
  composer.addPass(bloom);
  const blur = new ShaderPass(MotionBlurShader); composer.addPass(blur);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader); composer.addPass(grade);
  return { THREE, scene, camera, composer, bokeh, bloom, blur, grade, key, rim, kick, sh, prac, mirror, coat, cyc, papers, rings, bump, loadImg, backMat };
}

// a first page in the same proceedings layout as the typeset pages (612 x 792 pt at 2x), drawn in the browser:
// used for "Paper #137": a title, an author line, and a body that has not been written yet
export function blankPage(THREE, title, authors, o = {}) {
  const S = 2, w = 612 * S, h = 792 * S, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `700 ${30 * S}px "Fraunces"`; g.fillText(title, w / 2, 96 * S);
  g.font = `400 ${17 * S}px "Fraunces"`; g.fillStyle = '#1d1d1f'; g.fillText(authors, w / 2, 140 * S);
  if (o.affil) { g.font = `400 ${12 * S}px "Fraunces"`; g.fillStyle = '#333'; g.fillText(o.affil, w / 2, 160 * S); }
  g.textAlign = 'left';
  const y0 = 196 * S, rnd = (i) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };
  for (let col = 0; col < 2; col++) {
    const x0 = (54 + col * 262) * S;
    g.font = `700 ${12 * S}px "Fraunces"`; g.fillStyle = '#000'; g.fillText(col === 0 ? 'Abstract' : '1  Introduction', x0, y0 + 10 * S);
    // a template body in light grey: the words are not written yet
    g.fillStyle = 'rgba(40,40,46,0.16)';
    let i = col * 1000;
    for (let yy = y0 + 30 * S; yy < h - 70 * S; yy += 9 * S) {
      const last = rnd(i++) < 0.12, L = last ? 60 + rnd(i++) * 140 : 236;
      for (let x = x0; x < x0 + L * S - 6 * S;) { const wl = Math.min((3 + rnd(i++) * 12) * 1.6 * S, x0 + L * S - x); g.fillRect(x, yy + 1 * S, wl, 2.6 * S); x += wl + 2.6 * S; }
      if (last) yy += 5 * S;
    }
  }
  g.font = `400 ${10 * S}px "Fraunces"`; g.fillStyle = '#5a5a5a'; g.fillText(o.tag || '', 54 * S, h - 34 * S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  // where the cursor goes (page coordinates): after the Abstract heading
  t.userData = { cursor: [ (54 + 64) / 612, (196 + 4) / 792 ] };
  return t;
}

// place one paper from a layout state (or hide it)
export function setPaper(T, k, s, glow = 0) {
  const P = T.papers[k];
  if (!s || s.s < 0.002) { P.g.visible = false; return; }
  P.g.visible = true;
  P.g.position.set(s.p[0], s.p[1], s.p[2]); P.g.rotation.set(s.r[0], s.r[1], s.r[2], 'YXZ'); P.g.scale.setScalar(s.s);
  P.mat.color.setScalar(1 - 0.8 * s.dim); P.bmat.color.setScalar((1 - 0.8 * s.dim) * 0.92); P.mat.emissiveIntensity = glow;
  P.mat.userData.uSat.value = s.sat ?? 1;
}

export function look(T, pos, tgt, fov, aperture, focusDist) {
  const { camera, bokeh, THREE } = T;
  camera.position.set(pos[0], pos[1], pos[2]); camera.fov = fov; camera.lookAt(tgt[0], tgt[1], tgt[2]);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  bokeh.uniforms.focus.value = focusDist ?? camera.position.distanceTo(new THREE.Vector3(tgt[0], tgt[1], tgt[2]));
  bokeh.uniforms.aperture.value = aperture;
}
