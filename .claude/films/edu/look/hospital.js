// A white-card architect's model of an outpatient tower on the desk: 16 floors x 16 consulting rooms = 256 experts
// (DeepSeek-V3's routed experts), open access corridors with railings in front of the doors, a lobby that is always
// lit (the shared expert), a lit sign on the roof. Lit rooms open their door and spill warm light onto the corridor.
// Units: 1 = 15 cm (the launch film's desk scale). Local frame: facade plane z = 0, body behind it, base at y = 0.
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { hsh } from '/scene/lib.js';

export const COLS = 16, ROWS = 16, BAY = 0.1, FH = 0.13, GF = 0.24, CORR = 0.085, END = 0.14, DEPTH = 0.55;
export const BW = COLS * BAY + 2 * END, BH = GF + ROWS * FH + 0.07;

export async function hospitalKit(T, o = {}) {
  const { THREE, scene, loadImg } = T;
  const root = new THREE.Group(); scene.add(root);
  const pn = await loadImg('/scene/tex/Paper001/Paper001_2K-JPG_NormalGL.jpg');
  const ntex = (rep) => { const t = new THREE.Texture(pn); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.needsUpdate = true; return t; };
  const card = new THREE.MeshPhysicalMaterial({ color: 0xf3efe6, roughness: 0.9, normalMap: ntex(3), normalScale: new THREE.Vector2(0.25, 0.25), sheen: 0.3, sheenRoughness: 0.9, sheenColor: 0xffffff });
  const cardIn = card.clone(); cardIn.color.setHex(0xe9e3d7);                      // the facade sits back in a little shade
  const foam = new THREE.MeshPhysicalMaterial({ color: 0xf6f4ef, roughness: 0.95, normalMap: ntex(6), normalScale: new THREE.Vector2(0.15, 0.15) });
  const foamEdge = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 1 });
  const recess = new THREE.MeshStandardMaterial({ color: 0x9a9184, roughness: 1 });  // the reveal around a door
  const doorM = new THREE.MeshPhysicalMaterial({ color: 0xdcd5c7, roughness: 0.85, normalMap: ntex(1), normalScale: new THREE.Vector2(0.2, 0.2) });
  const glowM = (k) => new THREE.MeshStandardMaterial({ color: 0x1a1006, emissive: 0xffb15a, emissiveIntensity: k, roughness: 1 });
  const mk = (geo, mat, x, y, z, cast = true, recv = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; root.add(m); return m; };

  // the base: a foam board with its layered edge showing, and the tower body
  mk(new THREE.BoxGeometry(BW + 0.9, 0.035, DEPTH + 1.15), [foamEdge, foamEdge, foam, foamEdge, foamEdge, foamEdge], 0, -0.0175, -DEPTH / 2 + 0.3, false, true);
  mk(new THREE.BoxGeometry(BW, BH, DEPTH), [card, card, card, card, cardIn, card], 0, BH / 2, -DEPTH / 2);
  // roof parapet and a plant room
  mk(new THREE.BoxGeometry(BW + 0.02, 0.035, 0.02), card, 0, BH + 0.0175, 0.0);
  mk(new THREE.BoxGeometry(BW * 0.34, 0.12, DEPTH * 0.5), card, -BW * 0.18, BH + 0.06, -DEPTH * 0.55);

  const xOf = (c) => -BW / 2 + END + (c + 0.5) * BAY, yOf = (r) => GF + r * FH;   // r = 0 is the first floor above the lobby
  // corridor slabs, railings, posts and the columns that carry them
  const slabG = new THREE.BoxGeometry(BW - 0.02, 0.012, CORR), railG = new THREE.BoxGeometry(BW - 0.02, 0.006, 0.006);
  const postG = new THREE.BoxGeometry(0.004, 0.05, 0.004);
  const nPost = Math.floor((BW - 0.04) / 0.033);
  const posts = new THREE.InstancedMesh(postG, card, nPost * ROWS); posts.castShadow = true; posts.receiveShadow = true;
  const mtx = new THREE.Matrix4(); let pi = 0;
  for (let r = 0; r < ROWS; r++) {
    const y = yOf(r);
    mk(slabG, card, 0, y - 0.006, CORR / 2);
    mk(railG, card, 0, y + 0.05, CORR - 0.004);
    for (let i = 0; i < nPost; i++) { mtx.makeTranslation(-BW / 2 + 0.03 + i * 0.033, y + 0.025, CORR - 0.004); posts.setMatrixAt(pi++, mtx); }
  }
  root.add(posts);
  const colG = new THREE.BoxGeometry(0.016, BH - GF + 0.02, 0.016);
  for (let c = 0; c <= COLS; c += 4) mk(colG, card, -BW / 2 + END + c * BAY, GF + (BH - GF) / 2 - 0.02, CORR - 0.006);
  // the lobby: a canopy, a recessed glazed front, warm light inside (the shared expert, always on duty)
  mk(new THREE.BoxGeometry(BW * 0.6, 0.014, 0.22), card, 0, GF - 0.03, 0.1);
  mk(new THREE.BoxGeometry(BW * 0.5, GF - 0.05, 0.004), glowM(1.1), 0, (GF - 0.05) / 2, -0.04, false, false);
  const mullG = new THREE.BoxGeometry(0.006, GF - 0.05, 0.008);
  for (let i = 0; i <= 10; i++) mk(mullG, card, -BW * 0.25 + i * BW * 0.05, (GF - 0.05) / 2, -0.035);
  const lobbyLight = new THREE.PointLight(0xffb866, 0.0, 1.2, 2); lobbyLight.position.set(0, 0.12, 0.12); root.add(lobbyLight);
  // the triage kiosk under the canopy (the router): a card box with a lit screen and the ticket slot the strip comes out of
  const kiosk = new THREE.Group(); kiosk.position.set(0.02, 0, 0.17); root.add(kiosk);
  { const k = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; kiosk.add(o); return o; };
    k(new THREE.BoxGeometry(0.075, 0.115, 0.045), card, 0, 0.0575, 0);
    k(new THREE.BoxGeometry(0.083, 0.008, 0.053), card, 0, 0.119, 0);
    const sc = document.createElement('canvas'); sc.width = 320; sc.height = 200; const sg = sc.getContext('2d');
    sg.fillStyle = '#120c06'; sg.fillRect(0, 0, 320, 200); sg.fillStyle = '#ffcf8a'; sg.textAlign = 'center';
    sg.font = `600 34px ${o.zh ? '"Noto Sans SC"' : '"JetBrains Mono"'}`; sg.fillText(o.zh ? '分诊 · 取号' : 'TRIAGE', 160, 62);
    sg.font = '700 84px "JetBrains Mono"'; sg.fillText('8/256', 160, 160);
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
    k(new THREE.PlaneGeometry(0.05, 0.031), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 1.1 }), 0, 0.085, 0.0226);
    k(new THREE.BoxGeometry(0.04, 0.004, 0.006), recess, 0, 0.052, 0.0235); }

  // the 256 rooms: a dark reveal, a door, a number plate and a small window per bay
  const revG = new THREE.PlaneGeometry(0.058, 0.09), doorG = new THREE.BoxGeometry(0.05, 0.084, 0.004);
  const winG = new THREE.PlaneGeometry(0.022, 0.03), plateG = new THREE.PlaneGeometry(0.03, 0.011);
  const plates = numberAtlas(THREE);
  const rooms = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const n = (ROWS - 1 - r) * 0 + r * COLS + c + 1;      // 1..256, numbered from the first floor up, left to right
    const x = xOf(c) - 0.012, y = yOf(r);
    const rev = mk(revG, recess, x, y + 0.045, 0.0008, false, true);
    const hinge = new THREE.Group(); hinge.position.set(x - 0.025, y + 0.042, 0.0026); root.add(hinge);
    const door = new THREE.Mesh(doorG, doorM); door.position.set(0.025, 0, 0); door.castShadow = door.receiveShadow = true; hinge.add(door);
    const glow = mk(new THREE.PlaneGeometry(0.05, 0.084), glowM(0), x, y + 0.042, 0.0012, false, false); glow.visible = false;
    const win = { material: null };
    const plate = new THREE.Mesh(plateG, plates.mat(n)); plate.position.set(x, y + 0.1, 0.001); root.add(plate);
    const light = null;
    rooms.push({ n, r, c, x, y, hinge, door, glow, win, plate, light });
  }
  // a few warm lights for lit rooms (pooled: three keeps the light count fixed so shaders are not recompiled)
  const pool = Array.from({ length: 10 }, () => { const l = new THREE.PointLight(0xffb15a, 0, 0.45, 2); root.add(l); return l; });

  // the sign on the roof: a light box with the clinic's name in the film's language
  const signTex = (txt, font) => {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 160; const g = cv.getContext('2d');
    g.fillStyle = '#20160f'; g.fillRect(0, 0, 1024, 160);
    g.fillStyle = '#ffe7c9'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    try { g.letterSpacing = '6px'; } catch (e) { /* */ }
    g.fillText(txt, 512, 86);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const signMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 1 });
  const sign = mk(new THREE.BoxGeometry(BW * 0.62, BW * 0.62 * 160 / 1024, 0.012), [card, card, card, card, signMat, card], BW * 0.12, BH + 0.16, -0.02, true, false);
  mk(new THREE.BoxGeometry(0.008, 0.11, 0.008), card, BW * 0.12 - BW * 0.25, BH + 0.055, -0.02);
  mk(new THREE.BoxGeometry(0.008, 0.11, 0.008), card, BW * 0.12 + BW * 0.25, BH + 0.055, -0.02);

  // light the given rooms (numbers 1..256): door swung open, room glowing, a warm pool on the corridor
  function light(ns, k = 1) {
    let li = 0;
    for (const R of rooms) {
      const on = ns.includes(R.n);
      R.hinge.rotation.y = on ? -1.15 * k : 0;
      R.glow.visible = on; R.glow.material.emissiveIntensity = on ? 5.0 * k : 0;
            if (on && li < pool.length) { const l = pool[li++]; l.position.set(R.x + 0.01, R.y + 0.05, 0.04); l.intensity = 0.09 * k; }
    }
    for (; li < pool.length; li++) pool[li].intensity = 0;
  }
  // a long exposure: every room glows by how often it was picked (0..1); the ten hottest also light their corridor
  function heat(vals) {
    const order = rooms.map((R, i) => [vals[i] || 0, R]).sort((a, b) => b[0] - a[0]);
    let li = 0;
    for (const [k, R] of order) {
      const on = k > 0.015;
      R.hinge.rotation.y = on ? -1.15 * Math.min(1, 0.25 + k) : 0;
      R.glow.visible = on; R.glow.material.emissiveIntensity = on ? 7.0 * k : 0;
      if (on && li < pool.length) { const l = pool[li++]; l.position.set(R.x + 0.01, R.y + 0.05, 0.04); l.intensity = 0.12 * k; }
    }
    for (; li < pool.length; li++) pool[li].intensity = 0;
  }
  const winLit = glowM(1.6);
  return {
    root, rooms, light, heat, kiosk, lobbyLight, pool, xOf, yOf,
    setSign(txt, font) { signMat.emissiveMap = signTex(txt, font); signMat.needsUpdate = true; },
    room: (n) => rooms[n - 1],
  };
}

// door number plates: one atlas, one material per number (cached)
function numberAtlas(THREE) {
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 2048; const g = cv.getContext('2d');
  g.fillStyle = '#efe9dd'; g.fillRect(0, 0, 2048, 2048);
  g.fillStyle = '#3a342c'; g.font = '600 46px "JetBrains Mono"'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let n = 1; n <= 256; n++) { const i = n - 1, cx = (i % 16) * 128 + 64, cy = Math.floor(i / 16) * 128 + 64; g.fillText(String(n).padStart(3, '0'), cx, cy + 2); }
  const base = new THREE.CanvasTexture(cv); base.colorSpace = THREE.SRGBColorSpace; base.anisotropy = 8;
  const cache = {};
  return {
    mat(n) {
      if (cache[n]) return cache[n];
      const t = base.clone(); t.needsUpdate = true; const i = n - 1;
      t.repeat.set(1 / 16, (1 / 16) * 0.42); t.offset.set((i % 16) / 16, 1 - (Math.floor(i / 16) + 1) / 16 + (1 / 16) * 0.29);
      return (cache[n] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    },
  };
}

// a token as a small ivory tile standing on its edge, the word engraved on its face (a mahjong tile / a scale figure)
export function tileKit(THREE, scene) {
  const geo = new RoundedBoxGeometry(1, 1, 1, 3, 0.12);
  const cache = {};
  const face = (word, o) => {
    const key = word + (o.font || '');
    if (cache[key]) return cache[key];
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 384; const g = cv.getContext('2d');
    g.fillStyle = '#f4ecd9'; g.fillRect(0, 0, 256, 384);
    const gr = g.createRadialGradient(128, 160, 20, 128, 192, 260); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(1, 'rgba(120,96,60,0.18)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 384);
    g.fillStyle = o.ink || '#1f5f4a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = o.size || 120; g.font = `${o.weight || 600} ${size}px ${o.font || '"Instrument Serif"'}`;
    while (g.measureText(word).width > 220 && size > 30) { size -= 6; g.font = `${o.weight || 600} ${size}px ${o.font || '"Instrument Serif"'}`; }
    g.fillText(word, 128, 200);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return (cache[key] = t);
  };
  const side = new THREE.MeshPhysicalMaterial({ color: 0xf1e8d4, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const back = new THREE.MeshPhysicalMaterial({ color: 0x2f6b55, roughness: 0.4, clearcoat: 0.5 });
  return function tile(word, o = {}) {
    const fm = new THREE.MeshPhysicalMaterial({ map: face(word, o), roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    const m = new THREE.Mesh(geo, [side, side, side, side, fm, back]);
    m.scale.set(o.w ?? 0.034, o.h ?? 0.05, o.d ?? 0.022); m.castShadow = m.receiveShadow = true; scene.add(m);
    return m;
  };
}
