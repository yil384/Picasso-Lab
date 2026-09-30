/* Alon — 钢铁侠 Iron Man
   Click: a HUD scan runs over the photo and the room behind him turns into a Stark
   blueprint bench; an arc reactor powers up on his chest; a Mark III helmet
   assembles beside his head (shell, then the visor drops, then the eyes light).
   Loop (3.2 s): reactor pulse, helmet hover, HUD rings turning.
   Photo landmarks (512 px): face 295,150 · eyes y 125 · chest 300,288 · hand 45,390. */
import { THREE, presence, env, ease, clamp } from './kit.js';

const RED = 0xb5222b, GOLD = 0xe1a92b, STEEL = 0x9aa3ad, CYAN = '#5ce8ff';

export default {
  title: 'Iron Man',
  exit: 0.45,
  still: 2.2,
  async build(k) {
    const { root } = k;

    // ① blueprint bench behind him: grid, rings and callouts on navy, inside the circle
    const bp = k.canvasTexture(512, 512, (g) => {
      g.fillStyle = '#0b2140'; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(92,232,255,.18)'; g.lineWidth = 1;
      for (let i = 0; i <= 512; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
      g.strokeStyle = 'rgba(92,232,255,.42)'; g.lineWidth = 1.5;
      for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
      g.strokeStyle = 'rgba(92,232,255,.55)'; g.lineWidth = 2;
      [[118, 132, 70], [118, 132, 46], [420, 380, 58]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); });
      g.setLineDash([6, 6]);
      g.beginPath(); g.moveTo(118, 202); g.lineTo(118, 300); g.lineTo(60, 300); g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(92,232,255,.7)'; g.font = '600 15px ui-monospace, Menlo, monospace';
      g.fillText('MK III', 90, 60); g.fillText('REPULSOR', 370, 470); g.fillText('3.0 GJ/s', 40, 330);
    });
    const bench = new THREE.Mesh(new THREE.CircleGeometry(k.R, 128), new THREE.MeshBasicMaterial({ map: bp, transparent: true, opacity: 0, depthWrite: false }));
    bench.position.z = k.Z_BACK + 2;
    bench.scale.setScalar(k.depthScale(k.Z_BACK + 2));
    bench.renderOrder = -18;
    root.add(bench);

    // ② arc reactor on his chest
    const reactor = new THREE.Group();
    const housing = new THREE.Mesh(new THREE.TorusGeometry(10.5, 2.4, 14, 48), k.toon(STEEL));
    k.ink(housing, 1.1);
    const rimGold = new THREE.Mesh(new THREE.TorusGeometry(13.2, 0.9, 8, 48), k.toon(GOLD));
    const cells = new THREE.Group();
    const cellMat = new THREE.MeshBasicMaterial({ color: 0x9ff4ff });
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.4, 1.2), cellMat);
      const a = (i / 10) * Math.PI * 2;
      c.position.set(Math.cos(a) * 6.6, Math.sin(a) * 6.6, 0.6);
      c.rotation.z = a + Math.PI / 2;
      cells.add(c);
    }
    const core = new THREE.Mesh(new THREE.CircleGeometry(3.6, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    core.position.z = 1.2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.7, 8, 48), new THREE.MeshBasicMaterial({ color: 0x5ce8ff }));
    ring.position.z = 0.8;
    const glow = k.glowSprite('rgba(92,232,255,0.95)', 58, 0.9);
    glow.position.z = 3;
    const hot = k.glowSprite('rgba(255,255,255,0.95)', 16, 1);
    hot.position.z = 3.2;
    reactor.add(housing, rimGold, ring, cells, core, glow, hot);
    reactor.position.copy(k.at(300, 290, 8));
    root.add(reactor);

    // ③ Mark III helmet: red shell, an inked gold faceplate, big slanted eye slits
    const helmet = new THREE.Group();
    const SH = [0.86, 1.06, 0.95];
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), k.toon(RED));
    shell.scale.set(...SH);
    k.ink(shell, 1.3);
    const visor = new THREE.Group();
    // phi = pi/2 is the +z side of three's sphere: the faceplate is centred there
    const border = new THREE.Mesh(new THREE.SphereGeometry(1.028, 40, 28, Math.PI / 2 - 1.02, 2.04, 0.44, 2.02), new THREE.MeshBasicMaterial({ color: 0x16151a, side: THREE.DoubleSide }));
    const face = new THREE.Mesh(new THREE.SphereGeometry(1.04, 40, 28, Math.PI / 2 - 0.9, 1.8, 0.52, 1.86), k.toon(GOLD, { side: THREE.DoubleSide }));
    border.scale.set(...SH); face.scale.set(...SH);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf2feff, transparent: true, opacity: 0, side: THREE.DoubleSide });
    const eyeShape = new THREE.Shape();
    eyeShape.moveTo(-0.2, 0.03); eyeShape.lineTo(0.2, 0.07); eyeShape.lineTo(0.17, -0.05); eyeShape.lineTo(-0.16, -0.06); eyeShape.closePath();
    const eyes = [-1, 1].map(sx => {
      const e = new THREE.Mesh(new THREE.ShapeGeometry(eyeShape), eyeMat);
      e.scale.set(sx, 1, 1);
      e.position.set(0.25 * sx, 0.13, 1.03);
      e.rotation.y = 0.28 * sx;
      return e;
    });
    const eyeGlows = [-1, 1].map(sx => {
      const g = k.glowSprite('rgba(160,245,255,0.95)', 0.5, 0);
      g.position.set(0.25 * sx, 0.13, 1.1);
      return g;
    });
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.045), new THREE.MeshBasicMaterial({ color: 0x3a2a12, side: THREE.DoubleSide }));
    mouth.position.set(0, -0.5, 0.94);
    mouth.rotation.x = -0.35;
    visor.add(border, face, ...eyes, ...eyeGlows, mouth);
    helmet.add(shell, visor);
    const hs = 25;
    const helmetHome = k.at(410, 122, 30);
    helmet.position.copy(helmetHome);
    root.add(helmet);

    const reactorHome = reactor.position.clone();
    const tint = new THREE.Color();

    return {
      update(t, e) {
        // backdrop: the room darkens into the blueprint bench
        const b = presence(t, e, 0.12, 0.55, ease.out, 0);
        bench.material.opacity = 0.9 * b;
        k.layers.plate.material.color.copy(tint.setRGB(1 - 0.55 * b, 1 - 0.45 * b, 1 - 0.3 * b));

        // reactor: spins up, then breathes
        const r = presence(t, e, 0.22, 0.5, ease.outBack, 0.2);
        k.show(reactor, r);
        reactor.rotation.z = (1 - r) * 2.4;
        cells.rotation.z = -t * 0.9;
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 1.6);
        glow.material.opacity = Math.min(1, r) * (0.7 + 0.3 * pulse);
        glow.scale.setScalar(52 + 16 * pulse + 40 * (1 - env(t, 0.3, 0.8)));
        hot.material.opacity = Math.min(1, r) * (0.8 + 0.2 * pulse);
        reactor.position.copy(reactorHome);

        // helmet: shell pops in, the visor drops and locks, then the eyes light
        const hsI = presence(t, e, 0.45, 0.42, ease.outBack, 0.5);
        const fly = ease.in(clamp(e * 1.6 - 0.3));
        k.show(helmet, hsI, hs);
        helmet.position.set(helmetHome.x + fly * 60, helmetHome.y + Math.sin(t * Math.PI * 2 / 3.2) * 2.2 + fly * 50, helmetHome.z);
        helmet.rotation.set(0.04 + Math.sin(t * 1.3) * 0.04, -0.24 + Math.sin(t * Math.PI * 2 / 3.2) * 0.07, 0.05);
        const v = ease.outBounce(env(t, 0.78, 1.08));
        visor.position.y = (1 - v) * 1.15;
        visor.rotation.x = -(1 - v) * 0.9;
        const lit = env(t, 1.05, 1.2) * (1 - e) * (0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 5.3));
        eyeMat.opacity = lit;
        eyeGlows.forEach(g => { g.material.opacity = 0.6 * lit; });
      },

      // HUD in q5: scan line, reticle on the helmet, gauge round the reactor, readout
      draw2d(q, t, e) {
        const fade = 1 - e;
        const [cx, cy] = k.screenAt(256, 256, 0);
        const R = k.R;
        // scan line sweeping down the photo
        const s = env(t, 0, 0.5);
        if (s > 0 && s < 1) {
          const y = cy - R + s * 2 * R;
          const half = Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)));
          q.noFill(); q.stroke(92, 232, 255, 220 * fade); q.strokeWeight(2);
          q.line(cx - half, y, cx + half, y);
          q.stroke(92, 232, 255, 70 * fade); q.strokeWeight(7);
          q.line(cx - half, y, cx + half, y);
        }
        const hud = presence(t, e, 0.9, 0.4, ease.out, 0.4);
        if (hud <= 0) return;
        // reticle around the helmet
        const [hx, hy] = k.toScreen(helmet.position);
        q.noFill(); q.strokeWeight(1.3); q.stroke(92, 232, 255, 200 * hud);
        const rr = 33;
        for (let i = 0; i < 3; i++) {
          const a0 = t * 0.9 + i * (Math.PI * 2 / 3);
          q.arc(hx, hy, rr * 2, rr * 2, a0, a0 + 1.3);
        }
        q.stroke(255, 205, 80, 170 * hud);
        const a1 = -t * 1.4;
        q.arc(hx, hy, (rr + 6) * 2, (rr + 6) * 2, a1, a1 + 0.7);
        // gauge around the reactor
        const [rx, ry] = k.toScreen(reactor.position);
        q.stroke(92, 232, 255, 150 * hud); q.strokeWeight(1);
        const g = 0.62 + 0.3 * Math.sin(t * Math.PI * 2 / 1.6);
        q.arc(rx, ry, 42, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g);
        // readout
        q.noStroke(); q.fill(92, 232, 255, 230 * hud);
        q.textFont('ui-monospace, Menlo, monospace'); q.textSize(8.5); q.textStyle(q.BOLD ?? 'bold');
        q.text('J.A.R.V.I.S.', cx - R * 0.72, cy + R * 0.58);
        q.fill(255, 205, 80, 220 * hud);
        q.text(`PWR ${Math.round(380 + 20 * g)}%`, cx - R * 0.72, cy + R * 0.58 + 10);
      },
    };
  },
};
