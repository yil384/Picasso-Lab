// Painted characters as billboards in the three.js world: a keyed cut-out (RGBA png) on a plane that turns about its
// vertical axis to face the camera, graded into the scene light, a cool rim on the edge that faces the rim light,
// a real cast shadow (alpha-tested depth) and a soft contact shadow; the glossy floor reflects it like everything else.
// Relief: where a depth map <name>_d.png sits next to the cut-out (tools/depth.py), the plane is a dense grid pushed
// towards the camera by it, so the figure has volume when the camera moves and its cast shadow is rounded; the
// billboard then turns only part of the way to the camera (face < 1) so that volume shows.
export function spriteKit(THREE, scene) {
  const loader = (u) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = u; });
  const cache = {};
  async function tex(url) {
    if (cache[url]) return cache[url];
    const img = await loader(url);
    const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    // where the feet are: the lowest opaque row, as a fraction of the height (sprites keep a margin under the shoes)
    const c = document.createElement('canvas'), w = 64, h = Math.round(64 * img.height / img.width);
    c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data; let foot = h - 1;
    outer: for (let y = h - 1; y >= 0; y--) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 128) { foot = y; break outer; }
    let dt = null;
    try {
      const di = await loader(url.replace(/\.png$/, '_d.png'));
      dt = new THREE.Texture(di); dt.needsUpdate = true; dt.generateMipmaps = true; dt.minFilter = THREE.LinearMipmapLinearFilter;
    } catch (e) { dt = null; }
    cache[url] = { t, dt, aspect: img.width / img.height, foot: 1 - (foot + 1) / h };
    return cache[url];
  }
  const contactTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); return t;
  })();

  function material(map) {
    const m = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.01, side: THREE.DoubleSide, depthWrite: true });
    m.userData.u = { uLight: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uRim: { value: new THREE.Color(0.55, 0.72, 1.0) },
      uRimK: { value: 0.0 }, uRimDir: { value: new THREE.Vector2(-1, 0.4) }, uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
      uSat: { value: 0.92 }, uLift: { value: 0.0 }, uFade: { value: 1 }, uSide: { value: 0.12 }, uFoot: { value: 0.72 },
      uDepth: { value: null }, uRelief: { value: 0 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, m.userData.u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uDepth; uniform float uRelief;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          if (uRelief > 0.0) transformed.z += (texture2D(uDepth, uv).r - 0.5) * uRelief;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uLight, uRimK, uSat, uLift, uFade, uSide, uFoot; uniform vec3 uTint, uRim; uniform vec2 uRimDir, uTexel;`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          {
            vec3 c = diffuseColor.rgb;
            float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
            c = mix(vec3(l), c, uSat);                    // painted art is brighter and more saturated than the studio
            // studio light on a painted figure: the key side brighter, the feet darker (ground occlusion)
            float side = 1.0 + uSide * (vMapUv.x - 0.5) * 2.0;
            float foot = mix(uFoot, 1.0, smoothstep(0.0, 0.45, vMapUv.y));
            c = c * uTint * uLight * side * foot + uLift;
            // rim: opaque here, transparent a couple of texels towards the rim light; strongest on the upper body
            float a0 = diffuseColor.a;
            float a1 = texture2D(map, vMapUv + uRimDir * uTexel * 2.5).a;
            float a2 = texture2D(map, vMapUv + uRimDir * uTexel * 5.0).a;
            float edge = clamp(a0 - 0.55 * a1 - 0.45 * a2, 0.0, 1.0);
            c += uRim * edge * uRimK * smoothstep(0.15, 0.7, vMapUv.y) * l * 1.6;
            diffuseColor.rgb = c;
            diffuseColor.a *= uFade;
          }`);
    };
    m.customProgramCacheKey = () => 'pvsprite2';
    return m;
  }

  // one character: several poses share one plane; set(pose) swaps the texture
  async function make(poses, { height = 1.0, shadow = true, relief = 0.2 } = {}) {
    const P = {};
    for (const [k, url] of Object.entries(poses)) P[k] = await tex(url);
    const first = Object.values(P)[0];
    const geo = new THREE.PlaneGeometry(1, 1, 48, 112); geo.translate(0, 0.5, 0);   // origin at the bottom edge
    const mat = material(first.t);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = shadow;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: first.t, alphaTest: 0.5 });
    const dmat = mesh.customDepthMaterial;
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, opacity: 0.8 }));
    contact.rotation.x = -Math.PI / 2; contact.renderOrder = 2;
    const root = new THREE.Group(); root.add(mesh); scene.add(root); scene.add(contact);
    const ch = { root, mesh, contact, P, pose: null, height, visible: true };
    ch.set = (pose, o = {}) => {
      const p = P[pose]; if (!p) throw new Error('no pose ' + pose);
      ch.pose = pose;
      mat.map = p.t; mat.userData.u.uTexel.value.set(1 / p.t.image.width, 1 / p.t.image.height);
      mesh.customDepthMaterial.map = p.t;
      const h = (o.height ?? height), w = h * p.aspect;
      // relief depth in world units, as a fraction of the figure's height (the mesh's z scale stays 1)
      const r = p.dt ? (o.relief ?? relief) * h * (o.sy ?? 1) : 0;
      mat.userData.u.uDepth.value = p.dt; mat.userData.u.uRelief.value = r;
      if (!dmat.displacementMap !== !(r > 0)) dmat.needsUpdate = true;          // recompile only when relief turns on/off
      dmat.displacementMap = r > 0 ? p.dt : null; dmat.displacementScale = r; dmat.displacementBias = -0.5 * r;
      // feet on the ground: shift down by the margin under the shoes
      mesh.scale.set(w * (o.flip ? -1 : 1) * (o.sx ?? 1), h * (o.sy ?? 1), 1);
      mesh.position.y = -p.foot * h * (o.sy ?? 1);
      return ch;
    };
    // place: feet at (x, y, z); face the camera about the vertical axis (cylindrical billboard), optional extra yaw
    ch.place = (x, y, z, camera, o = {}) => {
      root.visible = ch.visible = o.visible ?? true; contact.visible = root.visible && (o.contact ?? true) && y < (o.floorY ?? -100) + 0.05;
      root.position.set(x, y + (o.lift ?? 0), z);
      const dx = camera.position.x - x, dz = camera.position.z - z;
      root.rotation.set(0, Math.atan2(dx, dz) * (o.face ?? (mat.userData.u.uRelief.value > 0 ? 0.8 : 1)) + (o.yaw ?? 0), o.roll ?? 0);
      const u = mat.userData.u;
      u.uLight.value = o.light ?? 1; u.uRimK.value = o.rim ?? 0.0; u.uFade.value = o.fade ?? 1;
      if (o.tint) u.uTint.value.setRGB(...o.tint);
      if (o.rimDir) u.uRimDir.value.set(...o.rimDir);
      u.uRim.value.setRGB(...(o.rimCol || [0.55, 0.72, 1.0]));
      if (o.side != null) u.uSide.value = o.side;
      if (o.foot != null) u.uFoot.value = o.foot;
      const w = Math.abs(mesh.scale.x);
      contact.position.set(x, (o.floorY ?? y) + 0.004, z); contact.scale.set(w * 0.9, w * 0.32, 1);
      contact.material.opacity = (o.contactK ?? 0.7) * (o.fade ?? 1) * Math.max(0, 1 - (o.lift ?? 0) * 2.5);
      return ch;
    };
    ch.hide = () => { root.visible = ch.visible = false; contact.visible = false; return ch; };
    return ch;
  }
  return { make, tex };
}
