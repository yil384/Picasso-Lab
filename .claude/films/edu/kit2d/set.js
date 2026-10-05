// kit2d/set.js - the lab's toy theatre on the night desk, as baked cardstock and felt pieces for stage.js:
// a vertical proscenium (red card, gold frame and pilasters, a cartouche on the crown), red felt curtains that can be
// half open (gathered at a tieback, folds converging), a scalloped felt valance, an indigo felt backdrop, plank stage
// boards and a walnut desk as perspective floors, a dark wall, and flown cards (a batten on two lines, two pegs).
//
// Built with the material kit (material.js); the proscenium/curtain/valance recipes follow the papertheater kit of
// ledbetterljoshua/bohemian-tokenry-video (MIT, see THIRD_PARTY.md), redrawn for a 9:16 frame.
//
// World layout (units at z = 1000 are design px; y grows down; the desk top is y = DESK_Y):
export const L = {
  PROSC_Z: 940, VALANCE_Z: 943, CURTAIN_Z: 946, FLOOR_Z0: 946, FLOOR_Z1: 1272, BACK_Z: 1275, WALL_Z: 2700,
  FLOOR_Y: 300, DESK_Y: 470, OPEN_X: 330, ARCH_Y: -330, ARCH_RY: 110,
};

import { PI, TAU, cl, mix, rngFrom, mk, step, twos, h2, textures, segP, arcP, rrect, ellipseP, polarP, densify, wobble, toPath, bbox, spline,
  cut, fuzz, nap, stitch, thread, bake, spr, shade, inset } from './material.js';

export const loadImg = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + url)); im.src = url; });

/** The proscenium opening (grow > 0 makes the frame band): straight sides up to ARCH_Y, then an elliptical arch. */
export function openingP(grow = 0, stp = 4) {
  const p = [], w = L.OPEN_X + grow, top = L.ARCH_Y, bot = L.FLOOR_Y + 2;
  segP(p, -w, bot, -w, top, stp); arcP(p, 0, top, w, L.ARCH_RY + grow, PI, TAU, stp); segP(p, w, top, w, bot, stp); segP(p, w, bot, -w, bot, stp); return p;
}

const C = { red: '#7c1624', redDk: '#5a0f1a', gold: '#cf9c45', goldLt: '#efd08a', goldDk: '#9a6a28', cream: '#f2e6c9', wood: '#4a2b1c',
  felt: '#a51d2c', feltDk: '#6e1019', indigo: '#20244c' };

/** Bake every set piece once. Returns SP (sprites) and the floor canvases. opts: { wood: Image|null, crown: 'text' } */
export function bakeSet(opts = {}) {
  const SP = {};
  // ---- proscenium (z 940): red card, gold frame, pilasters, base with footlight hoods, crown cartouche ----
  SP.prosc = bake({ x: -480, y: -700, w: 960, h: 1180 }, { K: 1.3, pad: 24, blur: 9, seed: 'prosc' }, (x) => {
    const r = rngFrom('prosc-w');
    const outer = densify([[-470, -520], [470, -520], [470, 472], [-470, 472]], 6);
    cut(x, [wobble(outer, 1.6, r), openingP(0)], C.red, { sh: 0, rule: 'evenodd', hi: .08, lo: .3, ts: 1.6 });
    // printed damask on the red card: faint gold diamonds
    x.save(); x.clip(toPath([outer, openingP(0)]), 'evenodd'); x.fillStyle = 'rgba(230,180,90,.07)';
    for (let yy = -500; yy < 300; yy += 46) for (let xx = -470 + ((yy / 46) & 1) * 23; xx < 470; xx += 46) { x.beginPath(); x.moveTo(xx, yy - 9); x.lineTo(xx + 6, yy); x.lineTo(xx, yy + 9); x.lineTo(xx - 6, yy); x.fill(); }
    x.restore();
    // the gold frame band round the opening, a dark inner lip, studs
    cut(x, [wobble(openingP(36), 1.1, r), openingP(0)], C.gold, { sh: .55, sb: 8, sx: 3, sy: 5, rule: 'evenodd', hi: .3, lo: .2 });
    cut(x, [openingP(10), openingP(0)], C.goldDk, { sh: .3, sb: 3, rule: 'evenodd', edge: false, hi: .1, lo: .3 });
    const st = openingP(23, 34); for (const p of st) if (p[1] < L.FLOOR_Y - 12) cut(x, ellipseP(p[0], p[1], 4.5, 4.5, 1.5), C.goldLt, { sh: .4, sb: 2, sx: 1, sy: 1.5, edge: false, hi: .4 });
    // pilasters
    for (const s of [-1, 1]) { const cx = s * 412;
      cut(x, wobble(rrect(cx - 34, -470, 68, 760, 4, 4), 1, r), '#b9853a', { sh: .55, sb: 9, sx: 4, sy: 6, hi: .25, lo: .3 });
      for (let i = -1; i <= 1; i++) cut(x, rrect(cx + i * 16 - 3.5, -440, 7, 700, 3.5, 4), '#94672a', { sh: .3, sb: 2, sx: 1, sy: 1, edge: false, hi: 0, lo: .2 });
      cut(x, wobble(rrect(cx - 48, -512, 96, 46, 8, 3), .8, r), C.goldLt, { sh: .55, sb: 7, hi: .35 });
      cut(x, wobble(polarP(cx, -490, 22, 14, (a) => 1 + .25 * Math.abs(Math.sin(a * 2)), 2), .5, r), '#c69447', { sh: .3, sb: 2, edge: false });
      cut(x, wobble(rrect(cx - 44, 284, 88, 22, 5, 3), .8, r), C.goldLt, { sh: .5, sb: 6 }); }
    // the crown: a gold cartouche with scroll ends and a cream panel, lettered
    cut(x, wobble(polarP(0, -600, 250, 84, (a) => 1 + .07 * Math.abs(Math.sin(a * 5)), 3), 1.4, r), C.gold, { sh: .6, sb: 12, sx: 4, sy: 7, hi: .3, lo: .25 });
    for (const s of [-1, 1]) cut(x, wobble(polarP(s * 236, -584, 34, 34, (a) => .8 + .2 * Math.abs(Math.sin(a * 1.5)), 2), .8, r), C.goldLt, { sh: .5, sb: 6, hi: .35 });
    cut(x, wobble(polarP(0, -600, 200, 56, () => 1, 3), 1, r), C.cream, { sh: .45, sb: 5, hi: .15, lo: .2 });
    stitch(x, inset(polarP(0, -600, 200, 56, () => 1, 3), 7), { color: 'rgba(160,110,50,.75)', w: 1.2, shadow: 'rgba(80,40,10,.2)' });
    const txt = opts.crown ?? 'PICASSO LAB';
    x.save(); x.font = '700 50px Fraunces'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const ws = [...txt].map((ch) => x.measureText(ch).width + 3), tot = ws.reduce((a, b) => a + b, 0); let cx = -tot / 2;
    for (let i = 0; i < txt.length; i++) { const w = ws[i]; x.save(); x.translate(cx + w / 2, -598 + (r() - .5) * 3); x.rotate((r() - .5) * .07);
      x.shadowColor = 'rgba(40,10,0,.4)'; x.shadowBlur = 2.5 * 1.3; x.shadowOffsetX = 1.5 * 1.3; x.shadowOffsetY = 2 * 1.3; x.fillStyle = '#7c1624'; x.fillText(txt[i], 0, 0); x.restore(); cx += w; }
    x.restore();
    // the base under the stage lip: dark wood card with a gold rail and two recessed panels
    cut(x, wobble(rrect(-470, 300, 940, 172, 0, 5), 1.2, r), C.wood, { sh: .55, sb: 9, sy: -3, hi: .1, lo: .4 });
    cut(x, wobble(rrect(-472, 296, 944, 15, 3, 4), .7, r), C.gold, { sh: .5, sb: 5, hi: .35 });
    for (const s of [-1, 1]) { cut(x, wobble(rrect(s * 220 - 190, 336, 380, 108, 6, 4), 1, r), '#3a2016', { sh: .5, sb: 4, sx: -1.5, sy: -2, hi: .05, lo: .25 });
      stitch(x, inset(rrect(s * 220 - 190, 336, 380, 108, 6, 4), 8), { color: 'rgba(214,170,90,.7)', w: 1.3, shadow: 'rgba(0,0,0,.35)' }); }
    // footlight hoods along the lip (tin shells, painted cream)
    for (let i = -3; i <= 3; i++) { const hx = i * 92, p = []; arcP(p, hx, 300, 28, 22, PI, TAU, 2); p.push([hx + 28, 300]);
      cut(x, wobble(densify(p, 2), .5, r), '#e9dcbc', { sh: .5, sb: 4, sx: 1, sy: 2, hi: .3, lo: .3 });
      x.save(); x.strokeStyle = 'rgba(120,90,50,.7)'; x.lineWidth = 1.2; for (let k2 = -2; k2 <= 2; k2++) { x.beginPath(); x.moveTo(hx, 299); x.lineTo(hx + k2 * 9, 282 + Math.abs(k2) * 3); x.stroke(); } x.restore(); }
  });

  // ---- valance (z 943): scalloped red felt with a gold braid and tassels ----
  SP.valance = bake({ x: -360, y: -480, w: 720, h: 150 }, { K: 1.4, pad: 16, blur: 7, seed: 'valance' }, (x) => {
    const r = rngFrom('val-w'), n = 7, p = []; segP(p, -356, -480, 356, -480, 6);
    for (let i = n - 1; i >= 0; i--) arcP(p, -356 + (i + .5) * 712 / n, -378, 712 / n / 2, 40, 0, PI, 4);
    const P = wobble(densify(p, 3), 1.4, r);
    cut(x, P, C.felt, { felt: true, sh: 0, fuzz: 2.4, hi: .14, lo: .35, edge: false, tex: .9 });
    // pleats: soft vertical shading per scallop
    x.save(); x.clip(toPath(P)); for (let i = 0; i < n; i++) { const cx = -356 + (i + .5) * 712 / n, g = x.createLinearGradient(cx - 51, 0, cx + 51, 0);
      g.addColorStop(0, 'rgba(40,0,8,.35)'); g.addColorStop(.45, 'rgba(255,190,190,.07)'); g.addColorStop(1, 'rgba(40,0,8,.3)'); x.fillStyle = g; x.fillRect(cx - 51, -480, 102, 150); } x.restore();
    cut(x, wobble(rrect(-358, -416, 716, 13, 4, 4), .7, r), C.gold, { sh: .5, sb: 4, hi: .4 });
    stitch(x, densify([[-350, -409.5], [350, -409.5]], 6, false), { closed: false, color: 'rgba(120,70,20,.8)', w: 1.1, len: 4, gap: 3, shadow: false });
    for (let i = 0; i <= n; i++) { const tx = -356 + i * 712 / n; cut(x, wobble(polarP(tx, -372, 9, 20, (a) => (Math.sin(a) > 0 ? 1 : .7), 1.5), .5, r), C.goldLt, { sh: .55, sb: 4, sx: 1.5, sy: 3, hi: .35 });
      x.save(); x.strokeStyle = 'rgba(140,90,30,.8)'; x.lineWidth = 1; for (let k2 = -2; k2 <= 2; k2++) { x.beginPath(); x.moveTo(tx + k2 * 2.5, -366); x.lineTo(tx + k2 * 3.2, -352); x.stroke(); } x.restore(); }
  });

  // ---- curtains (z 946): half open, gathered at a tieback ----
  const curtain = (side) => {
    // inner edge (left panel; the right one is mirrored): top, down past the tieback, flaring to the floor
    const inner = spline([[-148, -480], [-152, -330], [-176, -150], [-222, 30], [-256, 128], [-246, 210], [-214, 306]], 6, false);
    const outerX = -372, top = -480, bot = 306;
    return bake({ x: -385, y: -490, w: 260, h: 810 }, { K: 1.4, pad: 18, blur: 9, seed: 'curtain' + side }, (x) => {
      const r = rngFrom('cur' + side), nf = 7.5, M = 90;
      const xin = (y) => { for (let i = 1; i < inner.length; i++) if (inner[i][1] >= y) { const a = inner[i - 1], b = inner[i], f = (y - a[1]) / ((b[1] - a[1]) || 1); return mix(a[0], b[0], f); } return inner[inner.length - 1][0]; };
      const hem = (u) => bot + 5 * Math.sin(u * nf * TAU + 1) + 3;  // the hem's soft waves
      const at = (u, y) => [mix(outerX, xin(y), u), y];
      const outline = []; for (let y = top; y <= bot; y += 6) outline.push(at(1, y)); for (let u = 1; u >= 0; u -= .02) outline.push(at(u, hem(u))); for (let y = bot; y >= top; y -= 6) outline.push(at(0, y));
      const P = wobble(outline, 1, r);
      cut(x, P, C.felt, { felt: true, sh: 0, edge: false, shade: false, tex: 0 });
      // folds: slices in u, each shaded by a fold profile (ridges catch light, valleys go deep)
      x.save(); x.clip(toPath(P));
      for (let i = 0; i < M; i++) { const u0 = i / M, u1 = (i + 1.05) / M, um = (u0 + u1) / 2, f = Math.sin(um * nf * TAU + .4 * Math.sin(um * 9));
        const ridge = Math.pow(Math.max(0, f), 1.6), valley = Math.pow(Math.max(0, -f), 1.2);
        const poly = []; for (let y = top - 4; y <= bot + 12; y += 10) poly.push(at(u0, y)); for (let y = bot + 12; y >= top - 4; y -= 10) poly.push(at(u1, y));
        x.fillStyle = valley > 0 ? `rgba(35,0,8,${.55 * valley})` : `rgba(255,170,160,${.18 * ridge})`; x.fill(toPath(poly)); }
      const T = textures(), pat = x.createPattern(T.FELT, 'repeat'); pat.setTransform(new DOMMatrix().translate(r() * 400, r() * 400).scale(1.3 / 1.4));
      x.fillStyle = pat; x.globalAlpha = .9; x.fillRect(-400, -500, 300, 840); x.globalAlpha = 1;
      const g = x.createLinearGradient(0, top, 0, bot); g.addColorStop(0, 'rgba(20,0,5,.35)'); g.addColorStop(.3, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,0,6,.25)'); x.fillStyle = g; x.fillRect(-400, top, 300, bot - top + 20);
      x.restore();
      // fuzz on the free edge and the hem; a gold fringe on the hem
      const edgePts = []; for (let y = top + 40; y <= bot; y += 3) edgePts.push(at(1, y));
      fuzz(x, [edgePts], '#c43a48', 2.6, 2);
      for (let u = 0; u <= 1; u += 1 / 70) { const [hx, hy] = at(u, hem(u)); x.save(); x.strokeStyle = r() < .5 ? '#d9aa55' : '#b98835'; x.lineWidth = 1.6; x.lineCap = 'round';
        x.beginPath(); x.moveTo(hx, hy - 6); x.lineTo(hx + (r() - .5) * 2, hy + 7 + r() * 3); x.stroke(); x.restore(); }
      const hemPts = []; for (let u = 0; u <= 1; u += .02) { const [hx, hy] = at(u, hem(u) - 8); hemPts.push([hx, hy]); }
      stitch(x, hemPts, { closed: false, color: 'rgba(225,175,90,.9)', w: 1.5, len: 5, gap: 4 });
      // the tieback: a gold cord round the gathered drape, a tassel at the free edge
      const ty = 128, cord = []; for (let u = 0; u <= 1.04; u += .04) { const [cx2, cy2] = at(Math.min(u, 1), ty + 10 * Math.sin(u * PI)); cord.push([cx2, cy2]); }
      x.save(); x.lineCap = 'round'; x.strokeStyle = 'rgba(30,8,0,.45)'; x.lineWidth = 9; x.translate(1.5, 3); x.stroke(toPath(cord, false)); x.restore();
      x.save(); x.lineCap = 'round'; x.strokeStyle = C.gold; x.lineWidth = 7.5; x.stroke(toPath(cord, false)); x.strokeStyle = 'rgba(255,235,170,.7)'; x.lineWidth = 2; x.setLineDash([5, 4]); x.stroke(toPath(cord, false)); x.restore();
      const [tx, tyy] = at(1, ty + 6);
      cut(x, wobble(polarP(tx + 4, tyy + 26, 11, 30, (a) => (Math.sin(a) > 0 ? 1 + .25 * Math.sin(a) : .6), 1.5), .6, r), C.goldLt, { sh: .55, sb: 5, sx: 2, sy: 4, hi: .35, lo: .3 });
      x.save(); x.strokeStyle = 'rgba(150,100,30,.9)'; x.lineWidth = 1; for (let k2 = -3; k2 <= 3; k2++) { x.beginPath(); x.moveTo(tx + 4 + k2 * 2.6, tyy + 34); x.lineTo(tx + 4 + k2 * 3.4, tyy + 58); x.stroke(); } x.restore();
      cut(x, ellipseP(tx + 4, tyy + 2, 9, 8, 1.5), C.gold, { sh: .5, sb: 3, hi: .4 });
    });
  };
  SP.curtainL = curtain('L'); SP.curtainR = curtain('R');

  // ---- backdrop (z 1275): an indigo felt drop with soft folds ----
  SP.back = bake({ x: -560, y: -720, w: 1120, h: 1040 }, { K: .8, pad: 6, blur: 6, seed: 'back' }, (x) => {
    const r = rngFrom('back-w'), P = wobble(rrect(-560, -720, 1120, 1040, 0, 8), 1.5, r);
    cut(x, P, C.indigo, { felt: true, sh: 0, edge: false, hi: .06, lo: .28, tex: .8, ts: 1.8 });
    x.save(); x.clip(toPath(P)); for (let i = 0; i < 26; i++) { const cx = -560 + i * 1120 / 26, g = x.createLinearGradient(cx, 0, cx + 1120 / 26, 0);
      g.addColorStop(0, 'rgba(0,0,10,.28)'); g.addColorStop(.55, 'rgba(160,170,255,.05)'); g.addColorStop(1, 'rgba(0,0,10,.22)'); x.fillStyle = g; x.fillRect(cx, -720, 1120 / 26 + 1, 1040); } x.restore();
  });

  // ---- stage boards (floor texture: x -440..440 across, z FLOOR_Z0..FLOOR_Z1, far edge at the top row) ----
  SP.boards = (() => { const c = mk(900, 520), x = c.getContext('2d'), r = rngFrom('boards'), T = textures();
    x.fillStyle = '#6b4329'; x.fillRect(0, 0, 900, 520);
    const pw = 900 / 13; for (let i = 0; i < 13; i++) { const v = (r() - .5) * 18; x.fillStyle = `rgb(${107 + v},${67 + v * .7},${41 + v * .5})`; x.fillRect(i * pw, 0, pw, 520);
      let y0 = -r() * 300; while (y0 < 520) { const L2 = 180 + r() * 260; x.fillStyle = 'rgba(30,14,6,.55)'; x.fillRect(i * pw, y0 + L2, pw, 2.2); y0 += L2; } }
    x.fillStyle = 'rgba(25,10,4,.8)'; for (let i = 0; i <= 13; i++) x.fillRect(i * pw - 1.4, 0, 2.8, 520);
    const P = x.createPattern(T.PAPER, 'repeat'); x.globalAlpha = .9; x.fillStyle = P; x.fillRect(0, 0, 900, 520); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(40,18,6,.25)'; x.lineWidth = 1; for (let i = 0; i < 140; i++) { const gx = r() * 900, gy = r() * 520; x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + (r() - .5) * 3, gy + 20 + r() * 50); x.stroke(); }
    return c; })();

  // ---- desk top (floor texture from the walnut photo, darkened; grain runs left-right) ----
  SP.desk = (() => { const c = mk(1400, 1100), x = c.getContext('2d');
    if (opts.wood) { x.save(); x.translate(1400, 0); x.rotate(PI / 2); x.drawImage(opts.wood, 0, 0, 1100, 1400); x.restore(); }
    else { x.fillStyle = '#5a3a26'; x.fillRect(0, 0, 1400, 1100); }
    x.globalCompositeOperation = 'multiply'; x.fillStyle = '#8a6a58'; x.fillRect(0, 0, 1400, 1100); x.globalCompositeOperation = 'source-over';
    return c; })();
  return SP;
}

/** Add the whole theatre to a stage frame K. o: { open (curtain sway 0..1 unused yet), t } */
export function theatre(K, SP, o = {}) {
  const t = K.t, s = step(t);
  // the wall and the desk
  K.add(L.WALL_Z, (x) => { const T = textures(); x.fillStyle = '#1b1922'; x.fillRect(-2600, -3000, 5200, 3500);
    const P = x.createPattern(T.PAPER, 'repeat'); P.setTransform(new DOMMatrix().scale(2.5)); x.globalAlpha = .8; x.fillStyle = P; x.fillRect(-2600, -3000, 5200, 3500); x.globalAlpha = 1; });
  K.floor({ y: L.DESK_Y, z0: 330, z1: L.WALL_Z, x0: -1500, x1: 1500, src: SP.desk });
  // inside the theatre
  K.add(L.BACK_Z, (x) => spr(x, SP.back, 0, 0, { shadow: false }));
  K.floor({ y: L.FLOOR_Y, z0: L.FLOOR_Z0, z1: L.FLOOR_Z1, x0: -450, x1: 450, src: SP.boards });
  // the front: curtains (a slow breath on twos), valance, proscenium
  const sway = (id) => (h2(id, s) - .5) * .8;
  K.add(L.CURTAIN_Z, (x) => { spr(x, SP.curtainL, sway(1), 0, { so: [6, 10], sa: .55 }); x.save(); x.scale(-1, 1); spr(x, SP.curtainR, sway(2), 0, { so: [-6, 10], sa: .55 }); x.restore(); });
  K.add(L.VALANCE_Z, (x) => spr(x, SP.valance, 0, 0, { so: [0, 12], sa: .6 }));
  K.add(L.PROSC_Z, (x) => spr(x, SP.prosc, 0, 0, { so: [0, 0], sa: 0, shadow: false }));
}

/**
 * Bake a flown card (a print hung from a batten): card canvas -> sprite with paper thickness and a torn-free trimmed
 * edge, pegs at the top. w, h in world units.
 */
export function bakeCard(card, w, h, seed = 'card') {
  return bake({ x: -w / 2 - 6, y: -16, w: w + 12, h: h + 22 }, { K: card.width / w, pad: 14, blur: 8, seed }, (x) => {
    const r = rngFrom(seed);
    // card stock edge (a hair of thickness on the right/bottom)
    x.fillStyle = '#cfc6b6'; x.fillRect(-w / 2 + 1.2, 1.6, w, h);
    x.drawImage(card, -w / 2, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = .8; x.strokeRect(-w / 2 + .4, .4, w - .8, h - .8);
    // two wooden pegs
    for (const s of [-1, 1]) { const px = s * w * .32; cut(x, wobble(rrect(px - 6, -14, 12, 30, 3, 2), .4, r), '#c9a26c', { sh: .5, sb: 3, sx: 1, sy: 2, hi: .3, lo: .3 });
      x.fillStyle = 'rgba(60,40,20,.6)'; x.fillRect(px - .6, -12, 1.2, 26); x.fillStyle = '#8b8f96'; x.fillRect(px - 6.5, 2, 13, 2.4); }
  });
}
/** Hang a baked card at depth z from a batten: top centre (x, y); drop 0..1 flies it in from above; sway on twos.
 *  o: drop, sway, rot, top (where the lines end, world y), clip ({z, path}: only show through the opening). */
export function flyCard(K, CARD, z, x0, y0, o = {}) {
  const t = K.t, s = step(t), drop = o.drop ?? 1, w = CARD.box.w - 12;
  const y = mix(-1500, y0, drop), rot = (o.sway ?? .008) * Math.sin(twos(t) * 1.9 + .6) + (o.rot ?? 0);
  K.add(z + .5, (x) => { // lines and batten (behind the card)
    x.save(); if (o.clip) K.clipTo(x, z + .5, o.clip); x.translate(x0, y); x.rotate(rot);
    x.strokeStyle = 'rgba(225,215,195,.75)'; x.lineWidth = 1.3; const top = Math.min(-22, (o.top ?? -1600) - y); for (const sx of [-.42, .42]) { x.beginPath(); x.moveTo(sx * w, -22); x.lineTo(sx * w * .96, top); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(-w * .55 + 3, -27 + 4, w * 1.1, 9);
    x.fillStyle = '#3b2618'; x.fillRect(-w * .55, -27, w * 1.1, 9); x.fillStyle = 'rgba(255,220,170,.18)'; x.fillRect(-w * .55, -27, w * 1.1, 2);
    x.strokeStyle = 'rgba(225,215,195,.75)'; x.lineWidth = 1; for (const sx of [-.32, .32]) { x.beginPath(); x.moveTo(sx * w, -18); x.lineTo(sx * w, -2); x.stroke(); }
    x.restore(); });
  K.add(z, (x) => { x.save(); if (o.clip) K.clipTo(x, z, o.clip); x.translate(x0, y); x.rotate(rot); spr(x, CARD, 0, 0, { so: [14, 20], sa: .55 }); x.restore(); });
}

/**
 * A real prop (a painted cut-out image) lying on a floor plane: squashed by the viewing angle so it reads as lying flat,
 * with a soft contact shadow. o: { x, y (floor height), z, w (world width), rot, flat (vertical squash, default from
 * the camera angle), shadow }.
 */
export function lyingProp(K, img, o) {
  K.add(o.z, (x) => {
    const flat = o.flat ?? Math.max(.12, Math.sin(Math.atan2(o.y - K.cam.y, o.z - K.cam.z)));   // foreshortening of a flat thing seen from above
    const w = o.w, h = w * img.height / img.width;
    x.save(); x.translate(o.x, o.y); x.scale(1, flat); x.rotate(o.rot ?? 0);
    if (o.shadow !== false) { const g = x.createRadialGradient(0, 0, 4, 0, 0, w * .55); g.addColorStop(0, 'rgba(8,4,2,.55)'); g.addColorStop(1, 'rgba(8,4,2,0)'); x.fillStyle = g; x.save(); x.scale(1, h / w * .8); x.beginPath(); x.arc(w * .03, w * .05, w * .55, 0, Math.PI * 2); x.fill(); x.restore(); }
    x.drawImage(img, -w / 2, -h / 2, w, h); x.restore();
  });
}
