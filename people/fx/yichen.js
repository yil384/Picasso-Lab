/* Yichen — 魔术 Card Master
   Click: the square dims like a stage; a black felt top hat (red band) drops onto his
   head and bounces; a deck fans out of his pointing hand, then the cards peel off one by
   one and spiral round him in 3D (in front of him and behind him) and back into his
   hand; the last one flips into his pointing fingers (his real index finger re-layered
   over it) with a puff of sparkles; the Michelin man beside him gets a gold monocle.
   Loop (3.2 s beat): the card in his fingers flips to a new card once per beat, the hat
   tips a little, a glint runs over the monocle.
   Photo landmarks (512 px): head 346,108 (hair top 66, brim line ~88) · index finger
   322-358 x 197-211, thumb tip 362,173 · Michelin eye 233,125. */
import { THREE, presence, env, ease, clamp, lerp } from './kit.js';

const BEAT = 3.2;
const TAU = Math.PI * 2;
const INK = '#16151a';
const GOLD = [255, 214, 64], WHITE = [255, 255, 255];
const FACES = [['A', 'S'], ['K', 'H'], ['Q', 'D'], ['J', 'C'], ['A', 'H'], ['7', 'S'], ['10', 'D'], ['K', 'S']];

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function pip(g, suit, x, y, s) {
  g.beginPath();
  if (suit === 'H') {
    g.moveTo(x, y + s * 0.48);
    g.bezierCurveTo(x - s * 0.95, y - s * 0.12, x - s * 0.42, y - s * 0.78, x, y - s * 0.28);
    g.bezierCurveTo(x + s * 0.42, y - s * 0.78, x + s * 0.95, y - s * 0.12, x, y + s * 0.48);
  } else if (suit === 'D') {
    g.moveTo(x, y - s * 0.56); g.lineTo(x + s * 0.4, y); g.lineTo(x, y + s * 0.56); g.lineTo(x - s * 0.4, y);
  } else if (suit === 'S') {
    g.moveTo(x, y - s * 0.55);
    g.bezierCurveTo(x + s * 0.95, y + s * 0.02, x + s * 0.42, y + s * 0.62, x, y + s * 0.16);
    g.bezierCurveTo(x - s * 0.42, y + s * 0.62, x - s * 0.95, y + s * 0.02, x, y - s * 0.55);
    g.moveTo(x, y + s * 0.1); g.lineTo(x + s * 0.2, y + s * 0.58); g.lineTo(x - s * 0.2, y + s * 0.58);
  } else {
    for (const [dx, dy] of [[0, -0.27], [-0.27, 0.09], [0.27, 0.09]]) { g.moveTo(x + dx * s + s * 0.25, y + dy * s); g.arc(x + dx * s, y + dy * s, s * 0.25, 0, TAU); }
    g.moveTo(x, y + s * 0.02); g.lineTo(x + s * 0.18, y + s * 0.58); g.lineTo(x - s * 0.18, y + s * 0.58);
  }
  g.closePath();
  g.fill();
}
function drawFace(g, w, h, rank, suit) {
  const col = suit === 'H' || suit === 'D' ? '#d6203c' : INK;
  g.fillStyle = INK; rr(g, 0, 0, w, h, w * 0.11); g.fill();
  g.fillStyle = '#fffaf0'; rr(g, 5, 5, w - 10, h - 10, w * 0.08); g.fill();
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
  const corner = () => {
    g.font = `bold ${Math.round(w * (rank.length > 1 ? 0.2 : 0.25))}px Georgia, serif`;
    g.fillText(rank, w * 0.19, h * 0.13);
    pip(g, suit, w * 0.19, h * 0.25, w * 0.13);
  };
  corner();
  g.save(); g.translate(w, h); g.rotate(Math.PI); corner(); g.restore();
  if (rank === 'A' || !'KQJ'.includes(rank)) {
    pip(g, suit, w / 2, h / 2, w * (rank === 'A' ? 0.56 : 0.44));
    if (rank !== 'A') { g.font = `bold ${Math.round(w * 0.2)}px Georgia, serif`; g.fillText(rank, w / 2, h * 0.76); }
  } else {
    // court card: a framed panel with a big letter and a little crown
    g.strokeStyle = col; g.lineWidth = 3; rr(g, w * 0.26, h * 0.22, w * 0.48, h * 0.56, 6); g.stroke();
    g.font = `bold ${Math.round(w * 0.36)}px Georgia, serif`;
    g.fillText(rank, w / 2, h * 0.55);
    g.beginPath();
    const cy = h * 0.34, cw = w * 0.2;
    g.moveTo(w / 2 - cw / 2, cy + 6); g.lineTo(w / 2 - cw / 2, cy - 5); g.lineTo(w / 2 - cw / 4, cy + 1);
    g.lineTo(w / 2, cy - 8); g.lineTo(w / 2 + cw / 4, cy + 1); g.lineTo(w / 2 + cw / 2, cy - 5); g.lineTo(w / 2 + cw / 2, cy + 6);
    g.closePath(); g.fillStyle = '#e8a91c'; g.fill();
  }
}
function drawBack(g, w, h) {
  g.fillStyle = INK; rr(g, 0, 0, w, h, w * 0.11); g.fill();
  g.fillStyle = '#fffaf0'; rr(g, 5, 5, w - 10, h - 10, w * 0.08); g.fill();
  g.fillStyle = '#c8283e'; rr(g, 11, 11, w - 22, h - 22, w * 0.05); g.fill();
  g.save(); rr(g, 11, 11, w - 22, h - 22, w * 0.05); g.clip();
  g.strokeStyle = 'rgba(255,240,230,0.6)'; g.lineWidth = 2.2;
  for (let i = -h; i < w + h; i += 13) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
    g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
  }
  g.restore();
  g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.17, 0, TAU); g.fill();
  g.fillStyle = '#c8283e'; pip(g, 'S', w / 2, h / 2, w * 0.2);
}

function drawDrape(g, w, h) {
  // a tied-back stage curtain, outer edge on the left of the canvas
  const inner = (y) => {
    const u = y / h;
    return u < 0.6 ? lerp(w * 0.96, w * 0.34, Math.sin(u / 0.6 * Math.PI / 2)) : lerp(w * 0.34, w * 0.8, Math.pow((u - 0.6) / 0.4, 0.8));
  };
  g.beginPath(); g.moveTo(0, 0);
  for (let y = 0; y <= h; y += 8) g.lineTo(inner(y), y);
  g.lineTo(0, h); g.closePath();
  g.save(); g.clip();
  g.fillStyle = '#b3182f'; g.fillRect(0, 0, w, h);
  for (const [f, col, lw] of [[0.12, '#7a0c20', 9], [0.36, '#7a0c20', 8], [0.6, '#7a0c20', 7], [0.2, '#dc3c52', 3], [0.45, '#dc3c52', 3], [0.7, '#dc3c52', 2.5], [0.84, '#7a0c20', 5]]) {
    g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
    for (let y = 0; y <= h; y += 8) (y ? g.lineTo : g.moveTo).call(g, inner(y) * f, y);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = INK; g.lineWidth = 4; g.beginPath();
  for (let y = 0; y <= h; y += 8) (y ? g.lineTo : g.moveTo).call(g, inner(y), y);
  g.stroke();
  // gold tie-back at the pinch
  const py = h * 0.6, px = inner(py);
  g.fillStyle = '#e3a92a'; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.ellipse(px * 0.55, py, px * 0.62, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.arc(px + 2, py + 3, 7, 0, Math.PI * 2); g.fill(); g.stroke();
}
function drawValance(g, w, h) {
  const n = 7, sw = w / n, top = h * 0.42;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, top);
  for (let i = n - 1; i >= 0; i--) g.quadraticCurveTo(i * sw + sw / 2, h * 1.12, i * sw, top);
  g.closePath();
  g.save(); g.clip();
  g.fillStyle = '#b3182f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = '#7a0c20'; g.fillRect(i * sw, 0, 6, h);
    g.fillStyle = '#dc3c52'; g.fillRect(i * sw + sw * 0.35, 0, 4, h);
  }
  g.restore();
  g.strokeStyle = '#e3a92a'; g.lineWidth = 7; g.beginPath(); g.moveTo(w, top - 4);
  for (let i = n - 1; i >= 0; i--) g.quadraticCurveTo(i * sw + sw / 2, h * 1.04, i * sw, top - 4);
  g.stroke();
  g.strokeStyle = INK; g.lineWidth = 3.5; g.beginPath(); g.moveTo(w, top);
  for (let i = n - 1; i >= 0; i--) g.quadraticCurveTo(i * sw + sw / 2, h * 1.12, i * sw, top);
  g.stroke();
}

export default {
  title: 'Card Master',
  exit: 0.45,
  still: 2.2,
  async build(k) {
    const { root } = k;
    const cToon = (c, o) => k.clip(k.toon(c, o));

    /* ⓪ a magic-show frame: red curtains swing in behind them, a valance drops at the top */
    const curtain = (w, h, draw, flip) => {
      const tex = k.canvasTexture(Math.round(w * 2.56), Math.round(h * 2.56), (g, cw, ch) => {
        if (flip) { g.translate(cw, 0); g.scale(-1, 1); }
        draw(g, cw, ch);
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), k.clip(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })));
      m.renderOrder = -15;
      const grp = new THREE.Group();
      grp.add(m);
      grp.position.z = -20;
      grp.scale.setScalar(k.depthScale(-20));
      root.add(grp);
      return { grp, m };
    };
    const dL = curtain(48, 206, drawDrape, false);
    const dR = curtain(48, 206, drawDrape, true);
    const val = curtain(206, 34, drawValance, false);

    /* ① textures: 8 faces and one back */
    const TW = 128, TH = 180;
    const faceTex = FACES.map(([r, s]) => k.canvasTexture(TW, TH, (g, w, h) => drawFace(g, w, h, r, s)));
    const backTex = k.canvasTexture(TW, TH, drawBack);
    const cardGeo = new THREE.PlaneGeometry(1, TH / TW);
    const backMat = cToon(0xffffff, { map: backTex, alphaTest: 0.5 });
    const makeCard = (fi) => {
      const g = new THREE.Group();
      const front = new THREE.Mesh(cardGeo, cToon(0xffffff, { map: faceTex[fi], alphaTest: 0.5 }));
      const back = new THREE.Mesh(cardGeo, backMat);
      back.rotation.y = Math.PI;
      g.add(front, back);
      g.userData.front = front;
      return g;
    };

    /* ② the top hat: one lathe (crown + curled brim), a red band, inked */
    const prof = [
      [0, 17], [9.0, 17], [9.5, 16.7], [9.6, 15.9], [8.8, 2.9], [8.9, 0.9],
      [12.8, 0.6], [14.3, 1.35], [14.9, 1.15], [14.6, 0.15], [13.6, -0.45], [8.9, -0.6], [0, -0.6],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const hat = new THREE.Group();
    const felt = new THREE.Mesh(new THREE.LatheGeometry(prof, 44), cToon(0x3a3a4a));
    k.ink(felt, 1.3);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(9.05, 9.0, 3.4, 44, 1, true), cToon(0xd02a3c, { side: THREE.DoubleSide }));
    band.position.y = 2.7;
    const shine = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 7.5), k.clip(new THREE.MeshBasicMaterial({ color: 0x6c6c84 })));
    shine.position.set(-5.9, 10.6, 7.15);
    shine.rotation.set(0, -0.7, 0.04);
    hat.add(felt, band, shine);
    const hatHome = k.at(347, 93, 10);
    root.add(hat);

    /* ③ the deck: 12 cards that fan out of his hand, spiral round him, return */
    const N = 10;
    const deck = [];
    for (let i = 0; i < N; i++) { const c = makeCard(i % FACES.length); root.add(c); deck.push(c); }
    const handW = k.at(372, 206, 6);            // the fist, where the deck lives
    const hatTop = k.at(346, 44, 8);             // where the whirl ends: into the hat

    /* ④ the card in his fingers + his index finger (and thumb) re-layered over it */
    const held = makeCard(0);
    const heldHome = k.at(341, 178, 5);
    held.position.copy(heldHome);
    root.add(held);
    k.patch([
      [319, 206], [322, 203.2], [326, 201.6], [332, 200.2], [340, 199.6], [348, 198.6], [354, 196.6], [358.5, 192.5],
      [360.5, 180], [362.5, 171.5], [366.5, 172.5], [371, 183], [379, 191], [391, 196], [403, 200],
      [405, 229], [372, 232], [352, 223], [344, 213], [330, 212], [321, 210],
    ], 10);

    /* ⑤ the Michelin man's monocle: gold ring, a pale lens, a little chain */
    const mono = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6.6, 1.05, 10, 36), k.toon(0xe3a92a));
    k.ink(ring, 1.1);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(6.2, 32), new THREE.MeshBasicMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.28, depthWrite: false }));
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 7), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
    glint.rotation.z = -0.7; glint.position.set(-1.6, 1.6, 0.2);
    const chainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(5.6, -3.6, 0), new THREE.Vector3(8.5, -10, 0.5), new THREE.Vector3(9.5, -17, 1), new THREE.Vector3(7.5, -22, 1.2),
    ]);
    const chain = new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 30, 0.45, 5, false), k.toon(0xe3a92a));
    mono.add(ring, lens, glint, chain);
    const monoHome = k.at(233, 125, 7);
    mono.position.copy(monoHome);
    mono.rotation.set(0, 0.25, 0.1);
    root.add(mono);

    const tint = new THREE.Color();
    const v3 = new THREE.Vector3();
    const flipAt = (t) => t - 2.3;              // loop clock: first flip ~1 s after the card lands

    return {
      update(t, e) {
        // stage dims around them
        const b = presence(t, e, 0.0, 0.4, ease.out, 0);
        k.layers.plate.material.color.copy(tint.setRGB(1 - 0.58 * b, 1 - 0.6 * b, 1 - 0.46 * b));

        // curtains: sides swing in, valance drops
        const cu = presence(t, e, 0.05, 0.5, ease.out, 0);
        const on = cu > 0.004;
        dL.grp.visible = dR.grp.visible = val.grp.visible = on;
        dL.m.position.set(-100 + 24 - (1 - cu) * 52, -3, 0);
        dR.m.position.set(100 - 24 + (1 - cu) * 52, -3, 0);
        val.m.position.set(0, 100 - 13 + (1 - cu) * 30, 0);

        // hat: drops in through the top of the frame, bounces, then breathes and tips once a beat
        const hs = presence(t, e, 0.08, 0.02, ease.out, 0.3);
        const fall = env(t, 0.08, 0.55);
        const land = ease.outBounce(fall);
        const fly = ease.in(clamp(e * 1.6 - 0.2));
        k.show(hat, hs);
        const beatP = flipAt(t) > 0 ? (flipAt(t) % BEAT) / BEAT : 0;
        const tip = beatP < 0.22 ? Math.sin(Math.PI * beatP / 0.22) : 0;
        hat.position.set(hatHome.x + fly * 24, hatHome.y + (1 - land) * 62 + fly * 60 + tip * 1.6, hatHome.z);
        const squash = fall > 0.3 ? Math.max(0, 1 - Math.abs(fall - 0.37) / 0.08) * 0.12 : 0;
        hat.scale.set(hs * (1 + squash), hs * (1 - squash), hs * (1 + squash));
        hat.rotation.set(0.2, 0.25 + 0.06 * Math.sin(TAU * t / BEAT), -0.11 + (1 - land) * 0.5 + 0.05 * tip + fly * 0.8);

        // the deck: fans out in his fist, then the cards peel off one by one and whirl up round
        // him (a widening then narrowing helix, in front of him and behind him) into the hat
        const fan = presence(t, e, 0.3, 0.2, ease.out, 0.4);
        for (let i = 0; i < N; i++) {
          const c = deck[i];
          const t0 = 0.5 + i * 0.03, D = 0.52;
          const p = (t - t0) / D;
          if (p >= 1 || fan <= 0.004) { c.visible = false; continue; }
          c.visible = true;
          if (p <= 0) {
            // fanned in his hand: pivot at the bottom corner
            const a = lerp(0.95, -0.95, i / (N - 1)) * fan;
            c.position.set(handW.x - Math.sin(a) * 7, handW.y + Math.cos(a) * 7 * fan + 2, handW.z + 4 + i * 0.05);
            c.rotation.set(0, 0, a);
            c.scale.setScalar(11 * fan);
            continue;
          }
          const s = ease.inOut(p);
          const th = TAU * 1.35 * s;
          const r = 36 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08)), 0.7);
          const y = lerp(handW.y + 2, hatTop.y, s);
          const cx = lerp(handW.x, hatTop.x, s);
          c.position.set(cx + r * Math.sin(th), y, lerp(handW.z + 4, hatTop.z, s) + r * Math.cos(th));
          c.rotation.set(0.12 * Math.sin(th * 2), th, 0.3 * Math.sin(th + i) * (1 - s));
          const sc = Math.min(1, p / 0.06) * Math.min(1, (1 - p) / 0.22) * (1 - clamp(e * 3));
          c.scale.setScalar(11 * Math.max(sc, 0.004));
          c.visible = sc > 0.004;
        }

        // the card in his fingers: flips in as the last card lands, then one flip per beat
        const hv = presence(t, e, 1.05, 0.2, ease.out, 0.1);
        k.show(held, hv, 15.5);
        const arrive = env(t, 1.05, 1.38);
        const lt = flipAt(t);
        let spin = 0, fi = 0;
        if (lt > 0) {
          const n = Math.floor(lt / BEAT), q = (lt % BEAT) / BEAT;
          const f = ease.inOut(clamp(q / 0.2));
          spin = TAU * f;
          fi = (n + (f > 0.5 ? 1 : 0)) % FACES.length;
        }
        const fm = held.userData.front.material;
        if (fm.map !== faceTex[fi]) { fm.map = faceTex[fi]; fm.needsUpdate = true; }
        const ar = ease.out(arrive);
        held.position.set(lerp(hatTop.x, heldHome.x, ar) + Math.sin(Math.PI * ar) * 14, lerp(hatTop.y, heldHome.y, ar), lerp(hatTop.z + 6, heldHome.z, ar));
        held.rotation.set(0, TAU * 2 * (1 - ar) + spin, 0.12 + (1 - ar) * 0.5);

        // monocle
        const mv = presence(t, e, 0.95, 0.35, ease.outBack, 0.5);
        k.show(mono, mv);
        mono.rotation.z = 0.1 + (1 - mv) * 1.2;
      },

      // comic layer: sparkle puffs (card landing, each flip), glints on the monocle and hat
      draw2d(q, t, e) {
        const fade = 1 - clamp(e * 2);
        if (fade <= 0) return;
        const [hx, hy] = k.toScreen(v3.copy(heldHome));
        // landing puff
        const pp = env(t, 1.3, 1.85);
        if (pp > 0 && pp < 1) puff(q, hx, hy, pp, 9, 26, fade, 3);
        // each flip: a smaller puff
        const lt = flipAt(t);
        if (lt > 0) {
          const q2 = ((lt % BEAT) / BEAT - 0.12) / 0.2;
          if (q2 > 0 && q2 < 1) puff(q, hx, hy, q2, 5, 17, fade, Math.floor(lt / BEAT) + 7);
        }
        // monocle glint once a beat, hat star
        const [mx, my] = k.toScreen(v3.copy(monoHome));
        const g1 = env(t, 1.15, 1.45);
        const gl = lt > 0 ? env((lt + BEAT * 0.5) % BEAT, 0, 0.35) : 0;
        const gg = Math.max(g1 < 1 ? Math.sin(Math.PI * g1) : 0, gl > 0 && gl < 1 ? Math.sin(Math.PI * gl) : 0);
        if (gg > 0) star(q, mx - 4, my - 4, 7 * gg, fade, WHITE);
        const hp = env(t, 0.5, 0.8);
        if (hp > 0 && hp < 1) {
          const [tx, ty] = k.screenAt(372, 60, 10);
          star(q, tx, ty, 8 * Math.sin(Math.PI * hp), fade, GOLD);
        }
      },
    };

    function star(q, x, y, s, a, c) {
      if (s <= 2.2) return;
      q.push(); q.translate(x, y);
      q.stroke(22, 21, 26, 255 * a); q.strokeWeight(Math.min(1.4, s * 0.2)); q.fill(c[0], c[1], c[2], 255 * a);
      q.beginShape();
      for (let i = 0; i < 8; i++) {
        const ang = i / 8 * TAU - Math.PI / 2, r = i % 2 ? s * 0.28 : s;
        q.vertex(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      q.endShape(q.CLOSE);
      q.pop();
    }
    function puff(q, x, y, p, n, dist, a, seed) {
      const out = ease.out(p);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU + seed * 0.7 + 0.3 * Math.sin(i * 2.3 + seed);
        const d = dist * out * (0.7 + 0.3 * ((i * 37 + seed * 11) % 10) / 10);
        const s = (i % 3 === 0 ? 7 : 4.5) * Math.sin(Math.PI * Math.min(1, p * 1.15));
        star(q, x + Math.cos(ang) * d, y + Math.sin(ang) * d, s, a, i % 2 ? GOLD : WHITE);
      }
    }
  },
};
