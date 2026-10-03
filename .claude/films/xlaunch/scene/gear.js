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
  return { card, H: yTop + 0.012, L, W };
}
