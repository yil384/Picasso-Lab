// The pilot's machine as a white-card hospital campus on the desk: 8 towers = 8 nodes (DeepSeek-V3's routed experts of
// a layer are spread over 8 nodes); every floor of every tower = one MoE layer; each tower floor has 32 consulting rooms
// around a square core (8 a side) = that node's experts, so one floor across the 8 towers is a layer's 256 experts.
// The bottom 3 floors are open lobbies (DeepSeek-V3's first 3 layers are dense). A pavilion in the middle holds the
// shared expert (always lit). Units: 1 = 15 cm. Expert e of a layer lives in tower floor(e / 32), room e % 32.
export const PER = 8, BAY = 0.07, END = 0.05, CORR = 0.055, FH = 0.105, LOBBY = 3;
export const CORE = PER * BAY + 2 * END;                  // side of a tower's core

export async function campusKit(T, o = {}) {
  const { THREE, scene, loadImg } = T;
  const NT = o.towers ?? 8, NF = o.floors ?? 12;           // floors drawn (the rest of the 58 are implied: "x58")
  const root = new THREE.Group(); scene.add(root);
  const pn = await loadImg('/scene/tex/Paper001/Paper001_2K-JPG_NormalGL.jpg');
  const ntex = (rep) => { const t = new THREE.Texture(pn); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.needsUpdate = true; return t; };
  const card = new THREE.MeshPhysicalMaterial({ color: 0xf3efe6, roughness: 0.9, normalMap: ntex(3), normalScale: new THREE.Vector2(0.25, 0.25), sheen: 0.3, sheenRoughness: 0.9 });
  const coreM = card.clone(); coreM.color.setHex(0xe8e2d6);
  const doorM = new THREE.MeshPhysicalMaterial({ color: 0xd8d1c3, roughness: 0.85 });
  const recess = new THREE.MeshStandardMaterial({ color: 0x9a9184, roughness: 1 });
  const foam = new THREE.MeshPhysicalMaterial({ color: 0xf6f4ef, roughness: 0.95, normalMap: ntex(6), normalScale: new THREE.Vector2(0.15, 0.15) });
  const foamEdge = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 1 });

  const layout = o.layout ?? Array.from({ length: NT }, (_, i) => [((i % 4) - 1.5) * 1.02, Math.floor(i / 4) * -1.02]);   // 2 rows of 4
  const H = (LOBBY + NF) * FH;
  // the foam board under the campus
  const xs = layout.map((p) => p[0]), zs = layout.map((p) => p[1]);
  const bx = Math.max(...xs) - Math.min(...xs) + CORE + 1.0, bz = Math.max(...zs) - Math.min(...zs) + CORE + 1.4;
  const base = new THREE.Mesh(new THREE.BoxGeometry(bx, 0.035, bz), [foamEdge, foamEdge, foam, foamEdge, foamEdge, foamEdge]);
  base.position.set((Math.max(...xs) + Math.min(...xs)) / 2, 0.0175, (Math.max(...zs) + Math.min(...zs)) / 2 + 0.2); base.receiveShadow = true; root.add(base);
  const Y0 = 0.035;

  // per-face door slots of a tower: face f (0 +z, 1 +x, 2 -z, 3 -x), slot s: local position and outward normal
  const slot = (f, s) => {
    const u = -CORE / 2 + END + (s + 0.5) * BAY - 0.008, n = [[0, 1], [1, 0], [0, -1], [-1, 0]][f];
    const t = [[1, 0], [0, -1], [-1, 0], [0, 1]][f];      // along the face, left to right seen from outside
    return { x: n[0] * CORE / 2 + t[0] * u, z: n[1] * CORE / 2 + t[1] * u, ry: [0, Math.PI / 2, Math.PI, -Math.PI / 2][f] };
  };
  const towers = [];
  const doorG = new THREE.BoxGeometry(0.04, 0.07, 0.003), revG = new THREE.PlaneGeometry(0.048, 0.077), plateG = new THREE.PlaneGeometry(0.026, 0.01);
  const glowG = new THREE.PlaneGeometry(0.04, 0.07);
  const nDoors = NT * NF * 4 * PER;
  const doors = new THREE.InstancedMesh(doorG, doorM, nDoors), revs = new THREE.InstancedMesh(revG, recess, nDoors);
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 3.1, 1.3) });   // HDR: blooms where it is bright
  const glows = new THREE.InstancedMesh(glowG, glowMat, nDoors); glows.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nDoors * 3), 3);
  doors.castShadow = doors.receiveShadow = true; revs.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const slabG = new THREE.BoxGeometry(CORE + 2 * CORR, 0.01, CORE + 2 * CORR), railG = new THREE.BoxGeometry(CORE + 2 * CORR, 0.005, 0.005);
  const postG = new THREE.BoxGeometry(0.004, 0.04, 0.004), colG = new THREE.BoxGeometry(0.014, H, 0.014);
  const nPostSide = Math.floor((CORE + 2 * CORR) / 0.03);
  const posts = new THREE.InstancedMesh(postG, card, NT * NF * 4 * nPostSide); posts.castShadow = true;
  let di = 0, pi = 0;
  const rooms = [];                                       // rooms[tower][floor][room] = instance index
  layout.forEach(([tx, tz], ti) => {
    const g = new THREE.Group(); g.position.set(tx, Y0, tz); root.add(g); towers.push(g);
    const coreMesh = new THREE.Mesh(new THREE.BoxGeometry(CORE, H, CORE), coreM); coreMesh.position.y = H / 2; coreMesh.castShadow = coreMesh.receiveShadow = true; g.add(coreMesh);
    for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const c = new THREE.Mesh(colG, card); c.position.set(cx * (CORE / 2 + CORR - 0.007), H / 2, cz * (CORE / 2 + CORR - 0.007)); c.castShadow = true; g.add(c); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(CORE + 2 * CORR + 0.01, 0.02, CORE + 2 * CORR + 0.01), card); roof.position.y = H + 0.01; roof.castShadow = true; g.add(roof);
    rooms[ti] = [];
    for (let fl = 0; fl < LOBBY + NF; fl++) {
      const y = fl * FH;
      const slab = new THREE.Mesh(slabG, card); slab.position.y = y + 0.005; slab.castShadow = slab.receiveShadow = true; g.add(slab);
      if (fl < LOBBY) continue;                           // the dense layers: open lobby floors, no rooms
      const F = fl - LOBBY; rooms[ti][F] = [];
      for (let f = 0; f < 4; f++) {
        const rail = new THREE.Mesh(railG, card); const n = [[0, 1], [1, 0], [0, -1], [-1, 0]][f];
        rail.position.set(n[0] * (CORE / 2 + CORR - 0.003), y + 0.042, n[1] * (CORE / 2 + CORR - 0.003)); rail.rotation.y = f % 2 ? Math.PI / 2 : 0; g.add(rail);
        for (let i = 0; i < nPostSide; i++) {
          const u = -(CORE / 2 + CORR) + 0.015 + i * 0.03, t = [[1, 0], [0, -1], [-1, 0], [0, 1]][f];
          m4.makeTranslation(tx + n[0] * (CORE / 2 + CORR - 0.003) + t[0] * u, Y0 + y + 0.02, tz + n[1] * (CORE / 2 + CORR - 0.003) + t[1] * u); posts.setMatrixAt(pi++, m4);
        }
        for (let s = 0; s < PER; s++) {
          const S = slot(f, s); e3.set(0, S.ry, 0); q.setFromEuler(e3);
          const nx = Math.sin(S.ry), nz = Math.cos(S.ry);
          v.set(tx + S.x + nx * 0.0008, Y0 + y + 0.01 + 0.0385, tz + S.z + nz * 0.0008); m4.compose(v, q, sc); revs.setMatrixAt(di, m4);
          v.set(tx + S.x + nx * 0.0022, Y0 + y + 0.01 + 0.035, tz + S.z + nz * 0.0022); m4.compose(v, q, sc); doors.setMatrixAt(di, m4);
          v.set(tx + S.x + nx * 0.0012, Y0 + y + 0.01 + 0.035, tz + S.z + nz * 0.0012); m4.compose(v, q, new THREE.Vector3(0, 0, 0)); glows.setMatrixAt(di, m4);
          rooms[ti][F][f * PER + s] = { i: di, x: tx + S.x, y: Y0 + y + 0.045, z: tz + S.z, nx, nz, ry: S.ry };
          di++;
        }
      }
    }
  });
  for (const im of [doors, revs, glows, posts]) { im.instanceMatrix.needsUpdate = true; root.add(im); }
  // the shared expert: a small pavilion in the middle of the campus, always lit
  const mid = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...zs) + Math.min(...zs)) / 2];
  const pav = new THREE.Group(); pav.position.set(mid[0], Y0, mid[1]); root.add(pav);
  { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.2), card); b.position.y = 0.08; b.castShadow = b.receiveShadow = true; pav.add(b);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.015, 0.3), card); r.position.y = 0.165; r.castShadow = true; pav.add(r);
    for (let f = 0; f < 4; f++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.1), glowMat); const n = [[0, 1], [1, 0], [0, -1], [-1, 0]][f]; w.position.set(n[0] * 0.1015, 0.065, n[1] * 0.1015); w.rotation.y = [0, Math.PI / 2, Math.PI, -Math.PI / 2][f]; pav.add(w); } }
  const pavLight = new THREE.PointLight(0xffb866, 0.08, 0.6, 2); pavLight.position.set(mid[0], Y0 + 0.08, mid[1]); root.add(pavLight);
  const pool = Array.from({ length: 12 }, () => { const l = new THREE.PointLight(0xffb15a, 0, 0.35, 2); root.add(l); return l; });

  const lit = new Map();                                  // instance index -> 0..1
  // light rooms: a list of [layer, expert, k]; everything else dark. Doors of lit rooms vanish (they stand open: the
  // glow fills the doorway), the brightest few spill light onto their corridor
  function set(list) {
    for (const [i] of lit) { doors.getMatrixAt(i, m4); m4.decompose(v, q, sc); m4.compose(v, q, new THREE.Vector3(1, 1, 1)); doors.setMatrixAt(i, m4); glows.setColorAt(i, new THREE.Color(0, 0, 0)); glows.getMatrixAt(i, m4); m4.decompose(v, q, sc); m4.compose(v, q, new THREE.Vector3(0, 0, 0)); glows.setMatrixAt(i, m4); }
    lit.clear();
    const order = [...list].sort((a, b) => (b[2] ?? 1) - (a[2] ?? 1));
    let li = 0;
    for (const [L, ex, k0] of order) {
      const k = k0 ?? 1, R = rooms[Math.floor(ex / 32)]?.[L]?.[ex % 32]; if (!R) continue;
      lit.set(R.i, k);
      doors.getMatrixAt(R.i, m4); m4.decompose(v, q, sc); m4.compose(v, q, new THREE.Vector3(1, 1, 1).multiplyScalar(k > 0.3 ? 0 : 1)); doors.setMatrixAt(R.i, m4);
      glows.getMatrixAt(R.i, m4); m4.decompose(v, q, sc); m4.compose(v, q, new THREE.Vector3(1, 1, 1)); glows.setMatrixAt(R.i, m4); glows.setColorAt(R.i, new THREE.Color(k, k, k));
      if (li < pool.length && k > 0.3) { const l = pool[li++]; l.position.set(R.x + R.nx * 0.035, R.y + 0.01, R.z + R.nz * 0.035); l.intensity = 0.06 * k; }
    }
    for (; li < pool.length; li++) pool[li].intensity = 0;
    doors.instanceMatrix.needsUpdate = glows.instanceMatrix.needsUpdate = true; glows.instanceColor.needsUpdate = true;
  }
  return { root, towers, rooms, set, pav, pavLight, layout, H, Y0, NF, room: (L, ex) => rooms[Math.floor(ex / 32)][L][ex % 32] };
}
