/* Yichen — 魔术 Card Master
   Click: the square dims like a stage and red curtains swing in; a black top hat (red band,
   gold stars) spins in and drops onto his head, brim on his hairline; a deck appears in the
   crook of his finger-gun hand (his real index finger and thumb re-layered over it), and he
   DEALS: five cards flick off the deck one by one, spinning and turning over in an arc to the
   Michelin man, and land in a fanned royal flush (10 J Q K A of spades) floating in front of
   his belly; the Michelin man gets a gold monocle to inspect it.
   Loop (3.2 s bars, the two moves take turns):
   - trick bar (藏牌 / 转牌): his hand glows gold (a comic burst behind his real fingers), a card
     pops out of nowhere at his index fingertip, back out, and twirls (spins round its own long
     axis and once round, then settles face out: K♥, Q♦, J♥, A♦ in turn); it is palmed away in a
     puff of smoke and turns up with a second puff gripped in the Michelin man's thumbs-up fist
     (his real thumb and fist re-layered over it), where he inspects it (monocle glint); it stays
     there until the next trick bar, when it vanishes again as his hand lights up;
   - deal bar: one more card is dealt (spin + flip, gold flick at his fingertip) and lands on top
     of the fan as the next ace (the fan ruffles).
   Every bar the hat tips once; the fan floats gently.
   Photo landmarks (512 px): head top 346,67 · head width 314-376 at v 90 · fringe / hairline
   v 88-96 · eyebrows v 100 · index fingertip 322,205 · thumb tip 362,170 · card crook 348,181 ·
   Michelin eye 233,125 · Michelin thumb tip 212,149 · his fist 186-229 x 172-224 ·
   Michelin belly 110-240 x 260-340. */
import { THREE, presence, env, ease, clamp, lerp } from './kit.js';

const TAU = Math.PI * 2;
const INK = '#16151a';
const GOLD = [255, 214, 64], WHITE = [255, 255, 255];

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

function drawBurst(g, w, h) {
  // a comic gold flare: spiky two-tone burst, inked
  const cx = w / 2, cy = h / 2, n = 14;
  const path = (ro, ri) => {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * TAU - Math.PI / 2;
      const r = i % 2 ? ri : ro * (i % 4 === 0 ? 1 : 0.84);
      (i ? g.lineTo : g.moveTo).call(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
  };
  g.lineJoin = 'round';
  path(w * 0.47, w * 0.31); g.fillStyle = '#ffc62e'; g.fill();
  g.strokeStyle = INK; g.lineWidth = w * 0.028; g.stroke();
  path(w * 0.33, w * 0.23); g.fillStyle = '#ffe680'; g.fill();
  g.fillStyle = '#fff8d6'; g.beginPath(); g.arc(cx, cy, w * 0.14, 0, TAU); g.fill();
}

export default {
  title: 'Card Master',
  exit: 0.45,
  still: 3.9,
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

    /* ① card textures: faces and one back */
    const TW = 128, TH = 180;
    const texOf = new Map();
    const faceTex = ([r, su]) => {
      const key = r + su;
      if (!texOf.has(key)) texOf.set(key, k.canvasTexture(TW, TH, (g, w, h) => drawFace(g, w, h, r, su)));
      return texOf.get(key);
    };
    const backTex = k.canvasTexture(TW, TH, drawBack);
    const cardGeo = new THREE.PlaneGeometry(1, TH / TW);
    const backMat = cToon(0xffffff, { map: backTex, alphaTest: 0.5 });
    const makeCard = (face) => {
      const g = new THREE.Group();
      const front = new THREE.Mesh(cardGeo, cToon(0xffffff, { map: faceTex(face), alphaTest: 0.5 }));
      const back = new THREE.Mesh(cardGeo, backMat);
      back.rotation.y = Math.PI;
      g.add(front, back);
      g.userData.front = front;
      root.add(g);
      return g;
    };
    const setFace = (c, face) => {
      const m = c.userData.front.material, tx = faceTex(face);
      if (m.map !== tx) { m.map = tx; m.needsUpdate = true; }
    };

    /* ② the top hat: one lathe (tall crown, curled brim), a red band, two gold stars, inked.
       Sized to his head (crown = head width, brim 1.6x), brim ring on his hairline, tilted with
       his head (the right side of his fringe sits lower) and seen a little from above. */
    const prof = [
      [0, 21.5], [11.8, 21.5], [12.35, 21.1], [12.5, 20.1], [11.9, 3.4], [11.95, 1.1],
      [16.8, 0.8], [18.5, 1.8], [19.2, 1.55], [18.9, 0.3], [17.5, -0.45], [12, -0.65], [0, -0.65],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const hat = new THREE.Group();
    const felt = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), cToon(0x3b3b4a));
    k.ink(felt, 1.4);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(12.1, 12.05, 3.8, 48, 1, true), cToon(0xd02a3c, { side: THREE.DoubleSide }));
    band.position.y = 3.1;
    const starShape = (r) => {
      const sh = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU + Math.PI / 2, rr2 = i % 2 ? r * 0.42 : r;
        (i ? sh.lineTo : sh.moveTo).call(sh, Math.cos(a) * rr2, Math.sin(a) * rr2);
      }
      return new THREE.ShapeGeometry(sh);
    };
    const starMat = cToon(0xffc93a, { side: THREE.DoubleSide });
    const hatStars = [[-0.25, 12.5, 2.5], [0.42, 17, 1.8]].map(([ang, y, r]) => {
      const m = new THREE.Mesh(starShape(r), starMat);
      const rad = 11.95 + (y - 3.4) / 16.7 * 0.55 + 0.05;
      m.position.set(rad * Math.sin(ang), y, rad * Math.cos(ang) + 0.05);
      m.rotation.y = ang;
      hat.add(m);
      return m;
    });
    hat.add(felt, band);
    const hatHome = k.at(346, 87, 20);
    const HAT_TILT = -0.12;
    root.add(hat);

    /* ③ the deck in the crook of his finger-gun hand, backs up; his index finger and thumb
       re-layered over it */
    const CW = 14;                                // card width (logical px)
    const deckHome = k.at(348, 182, 5);
    const DECK_ROT = -0.24;
    const deck = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const c = makeCard(['A', 'S']);
      root.remove(c);
      c.rotation.y = Math.PI;                      // back to the viewer
      c.position.set(-0.45 * j, -0.45 * j, -0.3 * j);
      c.scale.setScalar(CW);
      deck.add(c);
    }
    deck.position.copy(deckHome);
    deck.rotation.z = DECK_ROT;
    root.add(deck);
    k.patch([
      [319, 206], [322, 203.2], [326, 201.6], [332, 200.2], [340, 199.6], [348, 198.6], [354, 196.6], [358.5, 192.5],
      [360.5, 180], [362.5, 171.5], [366.5, 172.5], [371, 183], [379, 191], [391, 196], [403, 200],
      [405, 229], [372, 232], [352, 223], [344, 213], [330, 212], [321, 210],
    ], 10);

    /* ④ the dealt cards: a fan floating in front of the Michelin man's belly (a royal flush,
       left to right), and one more card per bar in the loop */
    const HAND = [['10', 'S'], ['J', 'S'], ['Q', 'S'], ['K', 'S'], ['A', 'S']];
    const ACES = [['A', 'S'], ['A', 'H'], ['A', 'D'], ['A', 'C']];
    const FW = 17;                                // fan card width
    const fanPivot = k.at(168, 358, 8);
    const FAN_TILT = -0.1;
    const slots = HAND.map((_, i) => {
      const a = (2 - i) * 0.3 + FAN_TILT;
      return { a, pos: new THREE.Vector3(fanPivot.x - Math.sin(a) * 25, fanPivot.y + Math.cos(a) * 25, fanPivot.z + i * 0.4) };
    });
    const fan = HAND.map((f) => makeCard(f));
    const flyer = makeCard(ACES[1]);
    const DEAL0 = 0.5, DGAP = 0.12, DFLY = 0.34;  // entrance deal: start, spacing, flight time
    const BAR = 3.2, T0 = 2.1, LFLY = 0.42;       // loop: one deal per bar
    const deckTop = new THREE.Vector3();
    const s4 = { a: 0, pos: new THREE.Vector3() };
    const tv = new THREE.Vector3();

    // one card in flight from the deck top to a slot: p = 0..1
    const pathAt = (p, slot, out) => {
      const q = ease.out(p);
      deckTop.set(deckHome.x - 0.2, deckHome.y + 0.6, deckHome.z + 0.4);
      out.lerpVectors(deckTop, slot.pos, q);
      out.y += Math.sin(Math.PI * q) * 15;                      // the arc
      out.z += Math.sin(Math.PI * q) * 10;                      // it comes toward us as it flies
      return out;
    };
    const flight = (c, p, slot, spins) => {
      const q = ease.out(p);
      pathAt(p, slot, c.position);
      c.rotation.set(0.25 * Math.sin(Math.PI * q), Math.PI * (1 - ease.inOut(env(p, 0.1, 0.38))), lerp(DECK_ROT, slot.a, q) + TAU * spins * (1 - q));
      c.scale.setScalar(lerp(CW, FW, q));
    };

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

    /* ⑥ the trick (藏牌 / 转牌), every other bar: his hand glows gold, a card appears at his
       index fingertip (its lower corner under his real fingertip), twirls, is palmed away in a
       puff and turns up gripped in the Michelin man's thumbs-up fist */
    const TRICK = [['K', 'H'], ['Q', 'D'], ['J', 'H'], ['A', 'D']];
    const TCW = 19;                               // trick card width
    const TCH = TCW * TH / TW;
    const trick = makeCard(TRICK[0]);
    trick.rotation.order = 'ZYX';                 // flips round its own long axis, then leans
    const tipPin = k.at(325, 204, 7);             // his fingertip, over the card's lower right corner
    const T_ROT = 0.26;
    const palm = k.at(352, 196, 7);               // where it is palmed away to
    const cornerTo = (pin, rot, w, h, lx, ly, out) => out.set(
      pin.x - (lx * w * Math.cos(rot) - ly * h * Math.sin(rot)),
      pin.y - (lx * w * Math.sin(rot) + ly * h * Math.cos(rot)), pin.z);
    const trickHome = cornerTo(tipPin, T_ROT, TCW, TCH, 0.38, -0.4, new THREE.Vector3());
    // the Michelin man's card: bottom tucked into his fist, behind his thumb, leaning out to his side
    const MCW = 17, MCH = MCW * TH / TW;
    const mcard = makeCard(TRICK[0]);
    mcard.rotation.order = 'ZYX';
    const mPin = k.at(203, 181, 6);
    const M_ROT = 0.3;
    const mHome = cornerTo(mPin, M_ROT, MCW, MCH, 0, -0.42, new THREE.Vector3());
    k.patch([
      [200, 175], [201.5, 163], [204, 155], [208.5, 149.5], [213.5, 149], [217.5, 153.5], [220, 162],
      [221.5, 172], [227, 178], [230, 192], [228.5, 210], [221, 223], [204, 225], [190, 216],
      [180, 205], [177, 192], [181, 182], [190, 177],
    ], 10);
    // the gold flare behind his finger-gun hand (his fingers stay in front: the hand patch)
    const burst = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), k.clip(new THREE.MeshBasicMaterial({
      map: k.canvasTexture(256, 256, drawBurst), transparent: true, depthWrite: false })));
    burst.renderOrder = 12;
    const burstHome = k.at(356, 202, 3);
    burst.position.copy(burstHome);
    root.add(burst);
    // the trick bar's clock (seconds into the bar)
    const A0 = 0.14, A1 = 0.36;                   // the card appears
    const W0 = 0.4, W1 = 0.86;                    // twirl
    const V0 = 1.0, V1 = 1.12;                    // palmed away
    const R0 = 1.14, R1 = 1.4;                    // turns up at the Michelin man
    const MO = 0.16;                              // his card leaves at the start of the next trick bar

    const tint = new THREE.Color();
    const v3 = new THREE.Vector3();
    const loopN = (t) => (t < T0 ? -1 : Math.floor((t - T0) / BAR));
    const loopP = (t) => (t < T0 ? -1 : ((t - T0) % BAR) / BAR * BAR);   // seconds into the bar
    const isDeal = (n) => n >= 0 && n % 2 === 1;
    const isTrick = (n) => n >= 0 && n % 2 === 0;
    const exitK = (e, order) => 1 - ease.in(clamp(e * 1.6 - order * 0.6));

    return {
      update(t, e) {
        // stage dims around them
        const b = presence(t, e, 0.0, 0.4, ease.out, 0);
        k.layers.plate.material.color.copy(tint.setRGB(1 - 0.58 * b, 1 - 0.6 * b, 1 - 0.46 * b));

        // curtains: sides swing in, valance drops
        const cu = presence(t, e, 0.05, 0.5, ease.out, 0);
        dL.grp.visible = dR.grp.visible = val.grp.visible = cu > 0.004;
        dL.m.position.set(-100 + 24 - (1 - cu) * 52, -3, 0);
        dR.m.position.set(100 - 24 + (1 - cu) * 52, -3, 0);
        val.m.position.set(0, 100 - 13 + (1 - cu) * 30, 0);

        // hat: spins in just above his head, drops onto it with a bounce, tips once a bar
        const hs = ease.outBack(env(t, 0.1, 0.34)) * exitK(e, 0.3);
        const drop = ease.outBounce(env(t, 0.3, 0.62));
        const fall = env(t, 0.3, 0.62);
        const squash = fall > 0.25 && fall < 0.5 ? Math.sin(Math.PI * (fall - 0.25) / 0.25) * 0.1 : 0;
        const lp = loopP(t);
        const tip = lp > 1.5 && lp < 2.0 ? Math.sin(Math.PI * (lp - 1.5) / 0.5) : 0;
        hat.visible = hs > 0.004;
        hat.scale.set(hs * (1 + squash), hs * (1 - squash), hs * (1 + squash));
        hat.position.set(hatHome.x + tip * 0.8, hatHome.y + (1 - drop) * 8 + tip * 2.2 + (1 - exitK(e, 0.3)) * 6, hatHome.z);
        hat.rotation.set(0.1 + 0.08 * tip, 0.3 + (1 - ease.out(env(t, 0.1, 0.5))) * TAU, HAT_TILT - 0.1 * tip);
        const tw = 0.85 + 0.15 * Math.sin(TAU * t / 0.8);
        starMat.color.setRGB(1, 0.79 * tw + 0.1, 0.23 * tw);

        // deck pops into his hand
        const dk = presence(t, e, 0.3, 0.25, ease.outBack, 0.2);
        k.show(deck, dk);
        const lastN = loopN(t);
        const dealBar = isDeal(lastN), trickBar = isTrick(lastN);
        // a flick of the wrist on every deal
        let kick = 0;
        for (let i = 0; i < 5; i++) kick = Math.max(kick, Math.sin(Math.PI * env(t, DEAL0 + i * DGAP - 0.04, DEAL0 + i * DGAP + 0.1)));
        if (dealBar) kick = Math.max(kick, Math.sin(Math.PI * env(lp, 0, 0.16)));
        deck.position.y = deckHome.y + (1 - clamp(dk)) * 3 + kick * 1.2;
        deck.rotation.z = DECK_ROT + kick * 0.22;

        // the deal: five cards off the deck into the fan, then one more every deal bar onto the top slot
        const fanOut = exitK(e, 0.5);
        const bob = Math.sin(TAU * t / BAR) * 1.2 * env(t, 1.3, 2.0);
        fan.forEach((c, i) => {
          const t0 = DEAL0 + i * DGAP;
          const p = (t - t0) / DFLY;
          if (p <= 0 || fanOut <= 0.004) { c.visible = false; return; }
          c.visible = true;
          if (p < 1) { flight(c, p, slots[i], 1.25); }
          else {
            // ruffle: a small hop from right to left after each loop landing
            let hop = 0;
            if (dealBar && lp > LFLY) hop = Math.sin(Math.PI * clamp((lp - LFLY - (4 - i) * 0.05) / 0.22));
            c.position.copy(slots[i].pos);
            c.position.y += bob + hop * 1.8;
            c.rotation.set(0, 0, slots[i].a + hop * 0.04);
            c.scale.setScalar(FW);
          }
          if (fanOut < 1) c.scale.setScalar(Math.max(0.004, c.scale.x * fanOut));
        });
        // the top card shows the ace dealt last (deal bars are the odd ones)
        const dealsDone = lastN < 0 ? 0 : Math.floor((lastN + 1) / 2) - (dealBar && lp < LFLY ? 1 : 0);
        setFace(fan[4], ACES[dealsDone % 4]);
        // this deal bar's card in flight
        if (dealBar && lp < LFLY && fanOut > 0.004) {
          flyer.visible = true;
          setFace(flyer, ACES[(dealsDone + 1) % 4]);
          s4.a = slots[4].a; s4.pos.copy(slots[4].pos).setY(slots[4].pos.y + bob);
          flight(flyer, lp / LFLY, s4, 1.25);
          flyer.scale.multiplyScalar(fanOut);
        } else flyer.visible = false;

        // the trick: gold flare, the card appears, twirls, is palmed away, turns up in the other fist
        const tOut = exitK(e, 0.4);
        const tricksBegun = lastN < 0 ? 0 : Math.floor(lastN / 2) + 1;      // trick bars started so far
        const tb = trickBar ? lp : -1;
        // flare: blooms, breathes, folds away as the card is shown
        const bl = tb < 0 ? 0 : ease.outBack(env(tb, 0, 0.2)) * (1 - ease.in(env(tb, 0.82, 1.0)));
        k.show(burst, bl * tOut, 38 * (1 + 0.05 * Math.sin(TAU * tb / 0.3)));
        burst.rotation.z = tb * 0.9;
        // the card at his fingertip
        const ap = tb < 0 ? 0 : ease.outBack(env(tb, A0, A1), 2.2);
        const gone = tb >= V1 || tb < 0;
        if (gone || ap <= 0.004 || tOut <= 0.004) trick.visible = false;
        else {
          trick.visible = true;
          setFace(trick, TRICK[(tricksBegun - 1) % 4]);
          const tw = ease.inOut(env(tb, W0, W1));
          const lift = Math.sin(Math.PI * env(tb, W0 - 0.06, W1 + 0.06)) * 5;
          const vp = env(tb, V0, V1);                          // palmed: edge-on, shrinking into his palm
          const vq = ease.in(vp);
          trick.position.lerpVectors(tipPin, trickHome, clamp(ap));          // grows out of his fingertip
          trick.position.x -= lift * 0.35; trick.position.y += lift; trick.position.z += lift * 0.6;
          trick.position.lerp(palm, vq * 0.8);
          // ta-da: a little lean once it is face out
          const tada = Math.sin(Math.PI * env(tb, W1, V0)) * 0.12;
          trick.rotation.set(0, Math.PI + 5 * Math.PI * tw + vq * Math.PI * 0.5, T_ROT + TAU * tw + tada + (1 - ap) * 0.6);
          trick.scale.setScalar(TCW * Math.max(0.004, ap * (1 - 0.8 * vq) * tOut));
        }
        // the Michelin man's card: pops up in his fist (turning to face us), sways, leaves at the next trick
        const mIdx = trickBar && tb < R0 ? tricksBegun - 2 : tricksBegun - 1;   // the trick it came from
        let mp = 0;
        if (mIdx >= 0) {
          const inBar = trickBar && tb >= R0 && lastN === mIdx * 2;
          const since = inBar ? tb - R0 : (lp + (lastN - mIdx * 2) * BAR - R0);
          mp = ease.outBack(clamp(since / (R1 - R0)), 2);
          if (trickBar && lastN > mIdx * 2) mp *= 1 - ease.in(env(tb, 0, MO));  // the next trick takes it back
        }
        if (mp * tOut <= 0.004) mcard.visible = false;
        else {
          mcard.visible = true;
          setFace(mcard, TRICK[mIdx % 4]);
          const sw = Math.sin(TAU * t / 2.6);
          mcard.position.lerpVectors(mPin, mHome, clamp(mp * tOut));          // rises out of his fist
          mcard.position.y += sw * 0.5;
          mcard.rotation.set(0, (1 - clamp(mp)) * Math.PI * 0.5, M_ROT + sw * 0.03);
          mcard.scale.setScalar(MCW * mp * tOut);
        }

        // monocle
        const mv = presence(t, e, 1.0, 0.35, ease.outBack, 0.5);
        k.show(mono, mv);
        mono.rotation.z = 0.1 + (1 - mv) * 1.2;
      },

      // comic layer: a gold flick at his fingertip on each deal, a whoosh arc behind each card,
      // a sparkle puff on each landing, glints on the monocle and the hat
      draw2d(q, t, e) {
        const fade = 1 - clamp(e * 2);
        if (fade <= 0) return;
        const [fx, fy] = k.screenAt(320, 204, 8);
        const lp = loopP(t), lastN = loopN(t);
        const dealBar = isDeal(lastN), tb = isTrick(lastN) ? lp : -1;
        // deal starts: the five of the entrance, then one per deal bar
        const starts = [0, 1, 2, 3, 4].map(i => DEAL0 + i * DGAP);
        if (dealBar) starts.push(T0 + lastN * BAR);
        for (const s0 of starts) {
          const f = env(t, s0, s0 + 0.22);
          if (f > 0 && f < 1) star(q, fx - 3, fy - 1, 7 * Math.sin(Math.PI * f), fade, GOLD);
        }
        // his fingertip keeps a small pulsing gold spark once the deck is out (not while he holds the trick card)
        const sp = env(t, 0.45, 0.7) * (tb < 0 ? 1 : 1 - Math.sin(Math.PI * env(tb, A0 - 0.06, V1 + 0.1)));
        if (sp > 0) star(q, fx - 2, fy, (3.2 + 1.3 * Math.sin(TAU * t / 0.8)) * sp, fade, GOLD);
        // the trick: sparkles orbit his glowing hand, a flash where the card appears, spin lines
        // round the twirl, a puff where it is palmed away and one where it turns up
        if (tb >= 0) {
          const [hx, hy] = k.toScreen(v3.copy(burstHome));
          const orb = Math.sin(Math.PI * env(tb, 0.02, 0.95));
          if (orb > 0.05) {
            for (let i = 0; i < 3; i++) {
              const a = TAU * (tb * 0.9 + i / 3);
              star(q, hx + Math.cos(a) * 19, hy + Math.sin(a) * 12, 5 * orb, fade, [GOLD, [255, 247, 214], [240, 70, 70]][i]);
            }
          }
          const [px, py] = k.toScreen(v3.copy(tipPin));
          const fl = env(tb, A0 - 0.02, A0 + 0.2);
          if (fl > 0 && fl < 1) star(q, px - 2, py - 2, 10 * Math.sin(Math.PI * fl), fade, WHITE);
          const tw = env(tb, W0, W1);
          if (tw > 0.04 && tw < 0.96) {
            const [cx, cy] = k.toScreen(trick.position);
            const a0 = -TAU * ease.inOut(tw) - T_ROT;
            const al = Math.sin(Math.PI * tw);
            for (const [w, c] of [[3.2, [22, 21, 26]], [1.5, [255, 255, 255]]]) {
              q.stroke(c[0], c[1], c[2], 235 * al * fade); q.strokeWeight(w); q.noFill();
              for (const o of [0, Math.PI]) q.arc(cx, cy, 44, 44, a0 + o - 1.1, a0 + o);
            }
          }
          const [cx, cy] = k.toScreen(v3.copy(trickHome));
          smoke(q, cx + 2, cy + 6, env(tb, V0 - 0.02, V0 + 0.42), 13, fade, 2);
          const [mx, my] = k.toScreen(v3.copy(mHome));
          smoke(q, mx, my + 2, env(tb, R0 - 0.06, R0 + 0.4), 13, fade, 5);
          const rp = env(tb, R0 + 0.02, R0 + 0.5);
          if (rp > 0 && rp < 1) puff(q, mx, my, rp, 7, 20, fade, 11);
          // the card it takes back as the next one appears
          if (lastN >= 2) smoke(q, mx, my + 2, env(tb, 0, 0.36), 10, fade, 8);
        }
        // a whoosh arc behind every card in flight (the last stretch of its path)
        const trail = (p, slot) => {
          if (p < 0.06 || p > 0.9) return;
          const pts = [];
          for (let j = 0; j <= 7; j++) {
            const pj = Math.max(0, p - 0.3 + 0.3 * j / 7);
            pts.push(k.toScreen(pathAt(pj, slot, tv)));
          }
          const a = fade * Math.min(1, (0.9 - p) / 0.25);
          // tapered: thin at the tail, full width just behind the card
          for (const [w, c] of [[3.8, [22, 21, 26]], [1.8, [255, 255, 255]]]) {
            q.stroke(c[0], c[1], c[2], 230 * a);
            for (let j = 0; j < pts.length - 3; j++) {
              q.strokeWeight(w * (0.35 + 0.65 * j / (pts.length - 4)));
              q.line(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            }
          }
        };
        fan.forEach((c, i) => trail((t - DEAL0 - i * DGAP) / DFLY, slots[i]));
        if (dealBar && lp < LFLY) trail(lp / LFLY, s4);
        // landing puffs: the last card of the deal, and each loop card
        const [lx, ly] = k.toScreen(v3.copy(slots[4].pos));
        const pp = env(t, DEAL0 + 4 * DGAP + DFLY - 0.02, DEAL0 + 4 * DGAP + DFLY + 0.5);
        if (pp > 0 && pp < 1) puff(q, lx, ly, pp, 9, 24, fade, 3);
        if (dealBar) {
          const q2 = (lp - LFLY + 0.02) / 0.45;
          if (q2 > 0 && q2 < 1) puff(q, lx, ly, q2, 6, 18, fade, lastN + 7);
        }
        // monocle glint once it lands and once a bar (in a trick bar as he inspects the card that
        // turned up in his fist); a star on the hat as it lands
        const [mx, my] = k.toScreen(v3.copy(monoHome));
        const g1 = env(t, 1.15, 1.45);
        const g2 = dealBar ? env(lp, 2.4, 2.75) : tb >= 0 ? env(tb, R1 + 0.1, R1 + 0.45) : 0;
        const gg = Math.max(g1 > 0 && g1 < 1 ? Math.sin(Math.PI * g1) : 0, g2 > 0 && g2 < 1 ? Math.sin(Math.PI * g2) : 0);
        if (gg > 0) star(q, mx - 4, my - 4, 7 * gg, fade, WHITE);
        const hp = env(t, 0.55, 0.85);
        if (hp > 0 && hp < 1) {
          const [tx, ty] = k.screenAt(378, 40, 20);
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
    // a comic smoke puff (poof!): a ring of balls that billow out, rise a little and shrink away;
    // inked as one cloud (ink pass under a white pass), with a grey underside for volume
    function smoke(q, x, y, p, r, a, seed) {
      if (p <= 0 || p >= 1) return;
      const out = ease.out(p), grow = Math.min(1, p / 0.18), life = Math.pow(1 - p, 0.7);
      const balls = [];
      for (let i = 0; i < 7; i++) {
        const ang = i / 7 * TAU + seed * 1.3;
        const j = ((i * 53 + seed * 17) % 10) / 10;
        const d = r * (0.2 + 0.7 * out) * (0.8 + 0.4 * j);
        const rr = r * 0.46 * (0.75 + 0.5 * ((i * 31 + seed * 7) % 10) / 10) * grow * life;
        if (rr > 0.9) balls.push([x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.8 - out * r * 0.35, rr]);
      }
      const core = r * 0.55 * grow * Math.pow(1 - p, 1.4);
      if (core > 0.9) balls.push([x, y - out * r * 0.3, core]);
      q.noStroke();
      q.fill(22, 21, 26, 255 * a);
      for (const [bx, by, rr] of balls) q.circle(bx, by, rr * 2 + 2.6);
      q.fill(214, 214, 224, 255 * a);
      for (const [bx, by, rr] of balls) q.circle(bx, by, rr * 2);
      q.fill(255, 255, 255, 255 * a);
      for (const [bx, by, rr] of balls) q.circle(bx - rr * 0.18, by - rr * 0.22, rr * 1.55);
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
