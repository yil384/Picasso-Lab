// Hard-surface props for the v10 opening, modelled in three.js and lit by the scene (the lamp, the room environment):
// a datacenter GPU card (graphite shroud, aluminium fin stack behind a champagne bezel, copper heat pipes, a steel
// bracket, the board's gold edge fingers). No logos. 1 unit ~ 15 cm; a card is ~13.5 x 5 x 1.4 cm, lying flat.
import { hsh } from '/scene/lib.js';

export async function gearKit(T) {
  const { THREE, scene } = T;
  const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  const cnv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  // brushed metal: fine streaks along the card, used as a roughness map
  const brushed = tex(cnv(512, 128, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { const y = hsh(i, 1) * h, v = 100 + hsh(i, 2) * 70; g.fillStyle = `rgba(${v},${v},${v},0.35)`; g.fillRect(hsh(i, 3) * w - 60, y, 40 + hsh(i, 4) * 200, 0.6 + hsh(i, 5)); }
  }), false);
  // the board: black solder mask, faint traces, gold PCIe fingers along one long edge with the key notch
  const pcbMap = tex(cnv(1024, 400, (g, w, h) => {
    g.fillStyle = '#0d1512'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(70,110,90,0.25)'; g.lineWidth = 2;
    for (let i = 0; i < 60; i++) { const y = 30 + hsh(i, 7) * (h - 90), x = hsh(i, 8) * w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 80 + hsh(i, 9) * 200, y); g.lineTo(x + 120 + hsh(i, 9) * 200, y + 30); g.stroke(); }
    const x0 = w * 0.18, x1 = w * 0.62;
    for (let x = x0; x < x1; x += 9) { if (Math.abs(x - (x0 + (x1 - x0) * 0.17)) < 10) continue; g.fillStyle = '#d9b25a'; g.fillRect(x, h - 46, 6, 40); }
  }), true);
  const M = {
    shroud: new THREE.MeshPhysicalMaterial({ color: 0x5d6168, metalness: 0.85, roughness: 0.52, roughnessMap: brushed, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 7 }),
    fin: new THREE.MeshPhysicalMaterial({ color: 0xd6d9de, metalness: 1, roughness: 0.3, envMapIntensity: 8 }),
    well: new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.7 }),
    bezel: new THREE.MeshPhysicalMaterial({ color: 0xcdb78c, metalness: 1, roughness: 0.28, clearcoat: 0.5, envMapIntensity: 8 }),
    copper: new THREE.MeshPhysicalMaterial({ color: 0xd08a5a, metalness: 1, roughness: 0.26, envMapIntensity: 8 }),
    steel: new THREE.MeshPhysicalMaterial({ color: 0xc4c8ce, metalness: 1, roughness: 0.34, roughnessMap: brushed, envMapIntensity: 7 }),
    pcb: new THREE.MeshPhysicalMaterial({ map: pcbMap, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    plug: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.55 }),
  };
  const L = 0.9, W = 0.34, PT = 0.012, SH = 0.075;             // length (x), width (z), board, shroud height
  const box = (x, y, z, w, h, d) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); return b; };
  // the fin stack seen through the window: 46 thin plates across the card
  const finGeo = mergeGeometries(Array.from({ length: 46 }, (_, i) => box(-0.3 + i * 0.0133, 0, 0, 0.0034, 0.012, 0.21)));
  const yTop = PT + SH;
  function card() {
    const g = new THREE.Group();
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(L - 0.01, PT, W + 0.02), [M.plug, M.plug, M.pcb, M.plug, M.plug, M.plug]);
    pcb.position.y = PT / 2;
    const sh = new THREE.Mesh(new RoundedBoxGeometry(L - 0.03, SH, W - 0.01, 4, 0.014), M.shroud); sh.position.set(0.005, PT + SH / 2, -0.01);
    const well = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.002, 0.23), M.well); well.position.set(0.0, yTop + 0.0005, -0.01);
    const fins = new THREE.Mesh(finGeo, M.fin); fins.position.set(0.0, yTop + 0.004, -0.01);
    const bz = new THREE.Group();                                   // the champagne bezel round the window
    for (const [x, z, w, d] of [[0, -0.128, 0.66, 0.018], [0, 0.108, 0.66, 0.018], [-0.33, -0.01, 0.018, 0.254], [0.33, -0.01, 0.018, 0.254]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d), M.bezel); m.position.set(x, yTop + 0.005, z); bz.add(m);
    }
    const trim = new THREE.Mesh(new THREE.BoxGeometry(L - 0.06, 0.006, 0.004), M.bezel); trim.position.set(0.005, PT + SH * 0.55, W / 2 - 0.014);
    const pipes = new THREE.Group();                                // heat-pipe ends at the tail
    for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 16), M.copper); p.rotation.z = Math.PI / 2; p.position.set(L / 2 - 0.005, PT + 0.02 + (i % 2) * 0.03, -0.09 + i * 0.05); pipes.add(p); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.1, W + 0.03), M.steel); br.position.set(-L / 2 - 0.003, 0.05, 0);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, W + 0.03), M.steel); tab.position.set(-L / 2 - 0.018, 0.1, 0);
    const plug = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.07), M.plug); plug.position.set(L / 2 - 0.08, yTop + 0.01, 0.1);
    g.add(pcb, sh, well, fins, bz, trim, pipes, br, tab, plug);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.visible = false; scene.add(g);
    return g;
  }
  // ---------------------------------------------------------------------------------------------------------------
  // the datacenter hall behind the mini rack's door (the opening's fly-through), built far from the desk at X0:
  // two rows of racks along an aisle (instanced; LED fronts that blink per instance), a glossy floor that reflects
  // them, light strips, fibre trays with data packets racing along them, sheets of haze. hall.set(f) animates.
  const { Reflector } = await import('three/addons/objects/Reflector.js');
  function hall(X0 = 200, ctxW = 1080, ctxH = 1350) {
    const g = new THREE.Group(); g.position.set(X0, 0, 0); g.visible = false; scene.add(g);
    const N = 220, PITCH = 0.64, RX = 1.55, uTime = { value: 0 };
    // the rack front: a perforated black door, 42 units, LED clusters (emissive map = the LEDs alone)
    const front = cnv(256, 1024, (q, w, h) => { q.fillStyle = '#121418'; q.fillRect(0, 0, w, h); q.fillStyle = '#1c1f25';
      for (let y = 6; y < h; y += 6) for (let x = (y / 6) % 2 ? 4 : 1; x < w; x += 6) q.fillRect(x, y, 2.4, 2.4);
      q.fillStyle = '#2a2e36'; for (let u = 0; u < 42; u++) q.fillRect(10, 20 + u * 23.5, w - 20, 1.5); q.fillRect(0, 0, 12, h); q.fillRect(w - 12, 0, 12, h); });
    const leds = cnv(256, 1024, (q, w, h) => { q.fillStyle = '#000'; q.fillRect(0, 0, w, h);
      for (let u = 0; u < 42; u++) { if (hsh(u, 3) < 0.25) continue; const y = 31 + u * 23.5, n = 2 + Math.floor(hsh(u, 4) * 5);
        for (let i = 0; i < n; i++) { const c = hsh(u, i, 5); q.fillStyle = c < 0.55 ? '#3aa0ff' : c < 0.85 ? '#43f08a' : '#ffb347'; q.fillRect(30 + i * 16 + hsh(u, 6) * 40, y - 3, 7, 5); } } });
    const frontMat = new THREE.MeshStandardMaterial({ map: tex(front, true), emissiveMap: tex(leds, true), emissive: 0xffffff, emissiveIntensity: 3.2, roughness: 0.5, metalness: 0.4 });
    frontMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aPhase;\nvarying float vPhase;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPhase = aPhase;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vPhase;')
        .replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
          vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
          vec2 cell = floor( vEmissiveMapUv * vec2( 16.0, 42.0 ) );
          float h = fract( sin( dot( cell, vec2( 12.9898, 78.233 ) ) + vPhase * 17.0 ) * 43758.5453 );
          float blink = step( 0.3, fract( h * 7.0 + uTime * ( 0.6 + h * 3.0 ) ) );
          totalEmissiveRadiance *= emissiveColor.rgb * ( 0.2 + 0.8 * blink );
        #endif`);
    };
    frontMat.customProgramCacheKey = () => 'rackfront';
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.6, metalness: 0.5 });
    const rows = [];
    for (const side of [-1, 1]) {                       // left row faces +x, right row faces -x
      const geo = new THREE.BoxGeometry(1.0, 2.2, 0.62), ph = new Float32Array(N);
      for (let i = 0; i < N; i++) ph[i] = hsh(i, side + 9);
      geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1));
      const mats = [sideMat, sideMat, sideMat, sideMat, sideMat, sideMat]; mats[side < 0 ? 0 : 1] = frontMat;
      const m = new THREE.InstancedMesh(geo, mats, N), M4 = new THREE.Matrix4();
      for (let i = 0; i < N; i++) { M4.makeTranslation(side * (RX + 0.5), 1.1, 2 - i * PITCH); m.setMatrixAt(i, M4); }
      m.frustumCulled = false; g.add(m); rows.push(m);
    }
    // floor: a reflector under semi-gloss perforated tiles
    const refl = new Reflector(new THREE.PlaneGeometry(2 * RX + 0.2, N * PITCH + 20), { textureWidth: ctxW / 2, textureHeight: ctxH / 2, color: 0x6a7480, clipBias: 0.003 });
    refl.rotation.x = -Math.PI / 2; refl.position.set(0, 0.0, 2 - N * PITCH / 2); g.add(refl);
    const tile = cnv(256, 256, (q, w, h) => { q.fillStyle = '#20252c'; q.fillRect(0, 0, w, h); q.fillStyle = '#2b313a'; for (let y = 16; y < h; y += 16) for (let x = 16; x < w; x += 16) q.fillRect(x - 3, y - 3, 6, 6);
      q.fillStyle = '#0b0d10'; q.fillRect(0, 0, w, 4); q.fillRect(0, 0, 4, h); });
    const tt = tex(tile, true); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(5, N * PITCH / 0.62);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * RX + 0.2, N * PITCH + 20), new THREE.MeshStandardMaterial({ map: tt, transparent: true, opacity: 0.72, roughness: 0.4, metalness: 0.3 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.004, 2 - N * PITCH / 2); g.add(floor);
    // light strips and fibre trays overhead
    const glow = (col) => new THREE.MeshBasicMaterial({ color: col, toneMapped: false });
    for (const [x, y, w] of [[0, 4.0, 0.16], [-RX - 0.5, 3.4, 0.1], [RX + 0.5, 3.4, 0.1]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, N * PITCH), glow(new THREE.Color(2.2, 2.4, 2.6))); m.position.set(x, y, 2 - N * PITCH / 2); g.add(m); }
    const trayMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.5, metalness: 0.2 });
    for (const x of [-RX - 0.2, RX + 0.2]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, N * PITCH), trayMat); m.position.set(x, 2.55, 2 - N * PITCH / 2); g.add(m); }
    const NP = 90, pk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.035, 0.7), glow(new THREE.Color(0.6, 2.2, 3.0)), NP); pk.frustumCulled = false; g.add(pk);
    // sheets of haze across the aisle (additive, a soft vertical falloff)
    const hz = cnv(64, 256, (q, w, h) => { const gr = q.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(160,200,255,0.55)'); gr.addColorStop(1, 'rgba(160,200,255,0)'); q.fillStyle = gr; q.fillRect(0, 0, w, h); });
    const hzMat = new THREE.MeshBasicMaterial({ map: tex(hz, true), transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * RX, 4.0), hzMat); m.position.set(0, 2.0, -2 - i * 7); g.add(m); }
    const hemi = new THREE.HemisphereLight(0x9fc4ff, 0x080a0e, 0); const dir = new THREE.DirectionalLight(0xcfe2ff, 0); dir.position.set(X0, 8, 4); dir.target.position.set(X0, 0, -20);
    scene.add(hemi, dir, dir.target);
    const M4 = new THREE.Matrix4();
    function set(f, on) {
      g.visible = on; hemi.intensity = on ? 0.9 : 0; dir.intensity = on ? 0.6 : 0; if (!on) return;
      uTime.value = f / 30;
      for (let i = 0; i < NP; i++) { const lane = i % 3, x = lane === 0 ? 0.0 : (lane === 1 ? -RX - 0.2 : RX + 0.2), y = lane === 0 ? 3.75 : 2.62, sp = 0.5 + 0.5 * hsh(i, 31);
        const z = 4 - ((hsh(i, 32) * 140 + f * sp) % 140); M4.makeTranslation(x, y, z); pk.setMatrixAt(i, M4); }
      pk.instanceMatrix.needsUpdate = true;
    }
    return { g, set, X0 };
  }
  return { card, hall, H: yTop + 0.012, L, W };
}
