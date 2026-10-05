// Bake-off look "toon" (opening of SCRIPT_v2.md, 17.5 s): original rubber-hose cartoon characters (Codex paintings,
// art/cut/toon_*) over painted watercolour sets (art/src/toon_bg_*). Three sets joined by camera moves, never cuts:
// the data centre (the model, a big blob, squeezes into one gaming card) -> pull out: that picture is a post on a
// forum, a programmer goes wild -> push into his screen: a kitchen where 128 chefs pop up; an order ticket for one
// word arrives and exactly 8 step forward and cook while the rest wait. Every frame is a pure function of t; all
// motion is springs and eases (no jitter, no stepped timing); every word is drawn live and crisp.
import { defineScene } from '/pv/runtime/pv.js';
import { loadImg, mk, cl, mix, hs, TAU } from '/edu/kit2d/index.js';
import { STR } from './strings.js';

const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'zh' ? 'zh' : 'en', ZH = LANG === 'zh', T = STR[LANG];
const CAPS = Q.get('cap') !== '0', GUIDES = Q.get('guides') === '1';
const W = 1080, H = 1920, FPS = 30, DUR = 17.5;
const TITLE = ZH ? '"ZCOOL KuaiLe", Fraunces' : 'Fraunces', HAND = ZH ? '"Long Cang", "Permanent Marker"' : '"Permanent Marker"';
const SANS = ZH ? '"Noto Sans SC", Inter' : 'Inter';
const INK = '#2b1a12', CREAM = '#fff3d6', SUN = '#ffcf45', RED = '#c9341f';
let TL, C, VO, BASE, BEAT;
const A = {};

// ------------------------------------------------------------------ easing and springs
const seg = (t, a, b) => cl((t - a) / (b - a));
const sst = (k) => { k = cl(k); return k * k * (3 - 2 * k); };
const eo = (k) => 1 - Math.pow(1 - cl(k), 3), ei = (k) => Math.pow(cl(k), 3);
const eio = (k) => { k = cl(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const spring = (x, w = 9, d = 5) => (x <= 0 ? 0 : 1 - Math.exp(-d * x) * Math.cos(w * x));   // 0 -> 1, overshoots, settles
const ring = (x, w = 14, d = 6) => (x <= 0 ? 0 : Math.exp(-d * x) * Math.sin(w * x));          // a hit that rings out
const hump = (k) => Math.sin(Math.PI * cl(k));

// a camera path through keys [t, x, y, zoom]: cubic Hermite, velocity continuous through the inner keys, zoom in log space
function track(keys, t) {
  const n = keys.length; if (t <= keys[0][0]) return keys[0].slice(1); if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0; while (t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], h = b[0] - a[0], s = (t - a[0]) / h;
  const v = (k, j) => (j === 3 ? Math.log(k[j]) : k[j]);
  const tan = (m, j) => (m === 0 || m === n - 1 || keys[m][4] === 0 ? 0 : (v(keys[m + 1], j) - v(keys[m - 1], j)) / (keys[m + 1][0] - keys[m - 1][0]));
  const h00 = 2 * s ** 3 - 3 * s * s + 1, h10 = s ** 3 - 2 * s * s + s, h01 = -2 * s ** 3 + 3 * s * s, h11 = s ** 3 - s * s;
  return [1, 2, 3].map((j) => { const r = h00 * v(a, j) + h10 * h * tan(i, j) + h01 * v(b, j) + h11 * h * tan(i + 1, j); return j === 3 ? Math.exp(r) : r; });
}
const camera = (g, [x, y, z]) => { g.translate(540, 960); g.scale(z, z); g.translate(-x, -y); };

// ------------------------------------------------------------------ painted sprites (mip chain: crisp outlines at any size)
function mips(im) {
  const lv = [im]; let c = im;
  while (c.width > 40 && c.height > 40) { const n = mk(Math.round(c.width / 2), Math.round(c.height / 2)), g = n.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, n.width, n.height); lv.push(n); c = n; }
  return lv;
}
const sprite = (im, ax, ay) => ({ lv: mips(im), w: im.width, h: im.height, ax, ay });
function variant(S, fn) { const c = mk(S.w, S.h), g = c.getContext('2d'); fn(g, S.lv[0]); return sprite(c, S.ax, S.ay); }
// draw S with its anchor at (x, y), sc = design px per sprite px, squash sx/sy and rotation about the anchor
function put(g, S, x, y, sc, o = {}) {
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(sc * (o.sx ?? 1) * (o.flip ? -1 : 1), sc * (o.sy ?? 1));
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  const m = g.getTransform(), px = Math.hypot(m.a, m.b) * S.w; let L = S.lv[0];
  for (const c of S.lv) { if (c.width >= px * .98) L = c; else break; }
  g.drawImage(L, -S.ax, -S.ay, S.w, S.h); g.restore();
}
function backdrop(g, im, cx, cy, sc) { const w = im.width * sc, h = im.height * sc; g.save(); g.imageSmoothingQuality = 'high'; g.drawImage(im, cx - w / 2, cy - h / 2, w, h); g.restore(); }
function shadow(g, x, y, rx, a = .32) { g.save(); g.globalAlpha = a; g.drawImage(A.shadow, x - rx, y - rx * .26, rx * 2, rx * .52); g.restore(); }
function glow(g, x, y, r, rgb, a) { if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore(); }

// ------------------------------------------------------------------ type (always live vector text: crisp)
function font(g, w, px, fam) { g.font = `${w} ${px}px ${fam}`; }
function fitPx(g, s, w, px, fam, maxW) { font(g, w, px, fam); const m = g.measureText(s).width; return m > maxW ? px * maxW / m : px; }
function text(g, s, X, Y, w, px, fam, o = {}) { g.save(); font(g, w, px, fam); g.textAlign = o.align ?? 'center'; g.textBaseline = o.base ?? 'alphabetic'; g.fillStyle = o.fill ?? INK; g.fillText(s, X, Y); g.restore(); }
// cartoon title lettering: a drop shadow, a fat ink outline, a cream (or yellow) face
function toon(g, s, X, Y, w, px, fam, fill = CREAM, o = {}) {
  g.save(); font(g, w, px, fam); g.textAlign = o.align ?? 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.miterLimit = 2;
  g.lineWidth = px * .2; g.strokeStyle = INK; g.fillStyle = INK; g.strokeText(s, X + px * .05, Y + px * .07); g.fillText(s, X + px * .05, Y + px * .07);
  g.strokeText(s, X, Y); g.fillStyle = fill; g.fillText(s, X, Y); g.restore();
}

// ------------------------------------------------------------------ setup
async function setup(ctx) {
  TL = await (await fetch('../timeline.json')).json(); C = TL.cue;
  try { VO = await (await fetch(`../vo_${LANG}.json`)).json(); } catch (e) { VO = null; }
  // the model's beats land on the spoken words, in either language: 'AI' (hop), 'lives' / '只' (at-home wiggle), 'data' / '数据' (servers flare)
  const word = (w, d) => { const x = VO?.b1?.words.find((v) => v[2] === w); return x ? x[0] : d; };
  BEAT = { ai: word('AI', 1.97), home: ZH ? word('只', 2.31) : word('lives', 3.54), dc: word(ZH ? '数据' : 'data', 4.27) };
  const cut = (n) => loadImg('/edu/art/cut/' + n + '.png'), src = (n) => loadImg('/edu/art/src/' + n + '.png');
  const [dc, room, kit, servers, blob, card, mon, prog, ticket, idle, wait, cook] = await Promise.all([
    src('toon_bg_dc'), src('toon_bg_room'), src('toon_bg_kitchen'), cut('toon_servers'), cut('toon_blob'), cut('toon_card'),
    cut('toon_monitor_frame'), cut('toon_programmer'), cut('toon_ticket'), cut('toon_chef_idle'), cut('toon_chef_wait'), cut('toon_chef_cook')]);
  Object.assign(A, { dc, room, kit });
  A.servers = sprite(servers, 702, 912); A.blob = sprite(blob, 616, 1100); A.card = sprite(card, 690, 900);
  A.mon = sprite(mon, 567, 0); A.prog = sprite(prog, 479, 1430); A.ticket = sprite(ticket, 391, 21);
  A.idle = sprite(idle, 316, 1473); A.wait = sprite(wait, 278, 1478); A.cook = sprite(cook, 534, 1422);
  // the crowd's neckerchiefs in four colours (the same painting, scarf recoloured: art/cut/toon_chef_*_blue|gold|green)
  const alt = await Promise.all(['blue', 'gold', 'green'].flatMap((c) => [cut('toon_chef_idle_' + c), cut('toon_chef_wait_' + c)]));
  A.idles = [A.idle, ...[0, 2, 4].map((i) => sprite(alt[i], 316, 1473))]; A.waits = [A.wait, ...[1, 3, 5].map((i) => sprite(alt[i], 278, 1478))];
  // the card glowing with the model inside it; the servers with their lights out; the crowd faded back behind the eight
  A.cardGlow = variant(A.card, (g, im) => { g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(120,70,230)'; g.fillRect(0, 0, im.width, im.height); });
  A.serversOff = variant(A.servers, (g, im) => { g.filter = 'brightness(.42) saturate(.6)'; g.drawImage(im, 0, 0); });
  const dimmed = (S) => variant(S, (g, im) => { g.filter = 'brightness(.64) saturate(.85)'; g.drawImage(im, 0, 0); });
  A.idlesD = A.idles.map(dimmed); A.waitsD = A.waits.map(dimmed);
  A.shadow = mk(256, 66); { const g = A.shadow.getContext('2d'), gr = g.createRadialGradient(128, 33, 0, 128, 33, 128); gr.addColorStop(0, 'rgba(40,20,10,.85)'); gr.addColorStop(1, 'rgba(40,20,10,0)'); g.setTransform(1, 0, 0, .26, 0, 24.4); g.fillStyle = gr; g.fillRect(0, -200, 256, 400); }
  A.off = mk(W, H);
  if (ZH) { const all = JSON.stringify(T); await Promise.all(['400 80px "ZCOOL KuaiLe"', '400 80px "Long Cang"', '700 40px "Noto Sans SC"'].map((f) => document.fonts.load(f, all))); }
  await document.fonts.load('400 80px "Permanent Marker"');
  layoutChefs();
}

// ================================================================== 1. the data centre (0 - 6.85 s, then inside the post)
const SV = { x: 540, y: 1235, sc: .81 }, BL = { x: 540, y: 1270, sc: .51 }, CD = { x: 585, y: 1440, sc: .396, rot: -.1 };
const DCAM = [[0, 540, 1137, 1.07], [1.6, 540, 1142, 1.1], [4.2, 540, 1160, 1.17], [5.3, 556, 1185, 1.2], [6.0, 566, 1230, 1.32], [6.6, 572, 1270, 1.62], [7.4, 572, 1276, 1.66], [9.5, 572, 1280, 1.68]];
const T_HOP = 5.3, T_SQ = 5.62, T_JUMP = 5.8, T_DIVE = 5.95, T_IN = 6.3, T_MINI = 6.42;
function cardXf(g, t) {   // the card's transform (anchor: bottom centre): hops at 'one gaming card', squashes when the model lands in it
  const hop = -46 * hump(seg(t, T_HOP, T_SQ)), sq = .1 * ring(t - T_SQ, 16, 7) + .16 * ring(t - T_IN, 15, 5.5);
  g.translate(CD.x, CD.y + hop); g.rotate(CD.rot + .03 * ring(t - T_IN, 11, 4)); g.scale(CD.sc * (1 + sq * .8), CD.sc * (1 - sq));
}
// the model's pose: breathes, hops on 'AI model', winds up, jumps and dives into the card (narrowing as it goes in)
function blobPose(t) {
  const br = Math.sin(TAU * 1.05 * t), a = BEAT.ai, hopK = seg(t, a - .02, a + .45);
  let x = BL.x, y = BL.y - 64 * hump(hopK), sc = BL.sc, sy = 1 + .022 * br + .09 * hump(hopK) - .1 * hump(seg(t, a - .19, a)) - .12 * ring(t - (a + .45), 15, 6.5);
  sy -= .17 * Math.sin(Math.PI / 2 * seg(t, T_SQ, T_JUMP)) * (1 - eo(seg(t, T_JUMP, T_JUMP + .09)));   // wind-up squash, released on the jump
  const jk = eo(seg(t, T_JUMP, T_DIVE)), dk = seg(t, T_DIVE, T_IN);
  y -= 130 * Math.sin(Math.PI / 2 * jk); sy += .14 * jk;
  let sx = 1 / Math.pow(Math.max(.5, sy), .8);
  if (dk > 0) { y = mix(BL.y - 130, 1720, dk * dk); x = mix(BL.x, CD.x + 4, eo(dk)); sc = BL.sc * mix(1, .62, eo(dk)); sy += .3 * eo(dk); sx *= mix(1, .55, eo(dk)); }
  const h0 = BEAT.home - .09, home = hump(seg(t, h0, h0 + 1.05));   // 'normally lives in a data center': a happy at-home wiggle
  return { x, y, sc, sx, sy, rot: (.03 * Math.sin(TAU * .5 * t) + .07 * home * Math.sin(TAU * 2.1 * (t - h0))) * (1 - jk), clip: dk > 0 };
}
function drawDC(g, t) {
  g.save(); camera(g, track(DCAM, t));
  backdrop(g, A.dc, 540, 1060, 1.42);
  const off = sst(seg(t, T_IN, T_IN + .5));                      // the servers go dark once the model has left them
  glow(g, 540, 900, 800, '120,170,255', (.16 + .2 * hump(seg(t, BEAT.dc - .1, BEAT.dc + .8))) * (1 - off));   // the servers flare on 'data center'
  put(g, A.servers, SV.x, SV.y, SV.sc); if (off > 0) put(g, A.serversOff, SV.x, SV.y, SV.sc, { alpha: off });
  shadow(g, BL.x, BL.y - 4, 300, .4 * (1 - sst(seg(t, T_JUMP, T_DIVE + .1))));
  if (t < T_IN + .05) {
    const b = blobPose(t);
    g.save();
    if (b.clip) {   // below the card's top edge the model is inside the card: clip it there (line measured on the card art)
      g.save(); cardXf(g, t); const yl = (X) => 13 + .256 * (X + 390) - 900;
      g.beginPath(); g.moveTo(-6000, -9000); g.lineTo(6000, -9000); g.lineTo(6000, yl(6000)); g.lineTo(-6000, yl(-6000)); g.closePath(); g.restore(); g.clip();
    }
    put(g, A.blob, b.x, b.y, b.sc, { sx: b.sx, sy: b.sy, rot: b.rot });
    g.restore();
  }
  // the card, the model glowing inside it, and the model again - small enough now - popping out on top and waving
  const inK = t - T_IN, gl = t >= T_IN ? .85 * Math.exp(-3 * inK) + .14 * sst(seg(inK, 0, .4)) : 0;
  glow(g, CD.x, CD.y - 170, 640, '160,110,255', gl * .55);
  shadow(g, CD.x - 10, CD.y - 4, 330, .62);
  g.save(); cardXf(g, t); put(g, A.card, 0, 0, 1); if (gl > 0) { g.globalCompositeOperation = 'lighter'; put(g, A.cardGlow, 0, 0, 1, { alpha: Math.min(1, gl) * .75 }); g.globalCompositeOperation = 'source-over'; }
  if (t >= T_MINI) {
    const k = spring(t - T_MINI, 10, 4.6), u = t - T_MINI, br = Math.sin(TAU * 1.7 * u), hop = 110 * (hump(seg(t, 7.0, 7.38)) + hump(seg(t, 8.0, 8.38)));
    put(g, A.blob, -40, -780 - hop, .42 * k, { sx: 1 - .03 * br, sy: 1 + .045 * br, rot: .1 + .07 * Math.sin(TAU * .9 * u) });
  }
  g.restore();
  g.restore();
  // the cover's hook (frame 0), gone before the story needs the room
  if (t < 1.8) {
    const k = 1 - ei(seg(t, 1.4, 1.75)), pre = 1 + .05 * hump(seg(t, 1.2, 1.45));
    if (k > 0) { g.save(); g.translate(540, 404); g.scale(k * pre, k * pre); g.rotate(-.025);
      const f1 = Math.min(fitPx(g, T.hook[0], 900, ZH ? 100 : 92, TITLE, 940), 110), f2 = Math.min(fitPx(g, T.hook[1], 900, ZH ? 100 : 92, TITLE, 960), 110);
      toon(g, T.hook[0], 0, -30, 900, f1, TITLE, CREAM); toon(g, T.hook[1], 0, -30 + f2 * 1.18, 900, f2, TITLE, SUN); g.restore(); }
  }
}

// ================================================================== 2. the forum (pull out of the picture at 6.85, push into the screen at 8.6)
const MON = { x: 540, y: 262, sc: .86 }; // top centre of the monitor sprite
const SR = { x: MON.x - 567 * MON.sc + 135 * MON.sc, y: MON.y + 138 * MON.sc, w: 863 * MON.sc, h: 621 * MON.sc };
const SLOT = { x: SR.x + 22, y: SR.y + 66 }; SLOT.h = SR.h - 66 - 24; SLOT.w = SLOT.h * 9 / 16;
const T_OUT = 6.8, T_OUT1 = 7.7, T_PUSH = 8.6, T_PUSH1 = 9.55;
function roomCam(t) {
  const C0x = 540, C0y = 960;
  if (t < T_OUT1) {   // the slot starts as the whole frame and settles into the post
    const k = eio(seg(t, T_OUT, T_OUT1)), z0 = W / SLOT.w, z = Math.exp(mix(Math.log(z0), 0, k));
    const scx = SLOT.x + SLOT.w / 2, scy = SLOT.y + SLOT.h / 2, px = mix(C0x, scx, k), py = mix(C0y, scy, k);
    return [scx - (px - C0x) / z, scy - (py - C0y) / z, z];
  }
  const d = sst(seg(t, T_OUT1, T_PUSH + .3)), z1 = mix(1, 1.05, d), cy1 = mix(960, 940, d);
  if (t < T_PUSH) return [540, cy1, z1];
  const k = Math.pow(seg(t, T_PUSH, T_PUSH1), 2.1), sx = SR.x + SR.w / 2, sy = SR.y + SR.h / 2;   // into the screen, speeding up
  const z = Math.exp(mix(Math.log(z1), Math.log(4.9), k)), p0x = (sx - 540) * z1 + C0x, p0y = (sy - cy1) * z1 + C0y;
  const px = mix(p0x, C0x, k), py = mix(p0y, C0y, k);
  return [sx - (px - C0x) / z, sy - (py - C0y) / z, z];
}
function screenPath(g, grow = 0) { g.beginPath(); g.roundRect(SR.x - grow, SR.y - grow, SR.w + 2 * grow, SR.h + 2 * grow, 46); }
function drawRoom(g, t) {
  const cam = roomCam(t);
  g.save(); camera(g, cam);
  backdrop(g, A.room, 540, 960, 1.38);
  // the screen: the kitchen behind (seen once the post fades), the post on top
  const fade = 1 - sst(seg(t, T_PUSH - .05, T_PUSH + .3));
  g.save(); screenPath(g, 6); g.clip();
  if (fade < 1) { g.save(); g.setTransform(BASE); drawKitchenFixed(g, t); g.restore(); }
  if (fade > 0) { g.save(); g.globalAlpha = fade; forum(g, t, cam[2]); g.restore(); }
  g.restore();
  put(g, A.mon, MON.x, MON.y, MON.sc);
  // the programmer: springs up into frame, bounces with joy, ducks out as we push into the screen
  if (t > 7.05 && t < T_PUSH + .5) {
    const up = (1 - spring(t - 7.12, 8.5, 4.2)) * 950 + 1100 * ei(seg(t, T_PUSH - .15, T_PUSH + .35));
    const ph = Math.max(0, t - 7.55) / .56, b = Math.abs(Math.sin(Math.PI * ph)), land = Math.pow(1 - b, 8) * cl((t - 7.55) * 4);
    const yb = -58 * b * cl((t - 7.5) * 3), sy = 1 + .05 * b * cl((t - 7.5) * 3) - .07 * land;
    shadow(g, 400, 1796, 230, .3);
    put(g, A.prog, 400, 1792 + up + yb, .63, { sy, sx: 1 / Math.sqrt(sy), rot: .05 * Math.sin(Math.PI * ph) * cl((t - 7.5) * 3) - .04 * ring(t - 7.12, 9, 4) });
  }
  // the comments, popping out like speech balloons
  const out = ei(seg(t, T_PUSH - .2, T_PUSH + .1));
  [[7.42, 812, 1030, 470, 1080, -.05], [7.78, 846, 330, 690, 450, .06], [8.12, 760, 1205, 560, 1120, -.03]].forEach(([t0, x, y, tx, ty, r], i) => {
    if (t < t0) return; const k = spring(t - t0, 11, 5.2) * (1 - out); if (k <= .01) return;
    bubble(g, T.bubbles[i], x, y, tx, ty, k, r + .07 * ring(t - t0, 9, 4));
  });
  g.restore();
}
function bubble(g, s, x, y, tx, ty, k, rot) {
  const px = ZH ? 50 : 44, fam = ZH ? TITLE : 'Fraunces'; font(g, 800, px, fam); const w = Math.min(470, g.measureText(s).width + 70), h = px * 1.85;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(k, k);
  const dx = tx - x, dy = ty - y, a = Math.atan2(dy, dx), r0 = Math.min(w, h) * .32;
  g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = INK; g.fillStyle = CREAM;
  g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h / 2);
  g.moveTo(Math.cos(a + .5) * r0, Math.sin(a + .5) * r0); g.lineTo(Math.cos(a) * (Math.hypot(w / 2, h / 2) * .78 + 36), Math.sin(a) * (Math.hypot(w / 2, h / 2) * .62 + 36)); g.lineTo(Math.cos(a - .5) * r0, Math.sin(a - .5) * r0);
  g.stroke(); g.fill();
  g.beginPath(); g.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, h / 2); g.fill();
  const f = fitPx(g, s, 800, px, fam, w - 50); text(g, s, 0, f * .36, 800, f, fam, { fill: INK });
  g.restore();
}
function forum(g, t, z) {
  g.fillStyle = '#fbf2df'; g.fillRect(SR.x - 8, SR.y - 8, SR.w + 16, SR.h + 16);
  g.fillStyle = '#e4703a'; g.fillRect(SR.x - 8, SR.y - 8, SR.w + 16, 54);
  text(g, T.forum.site, SR.x + 64, SR.y + 35, 800, 30, SANS, { fill: '#fff8ea', align: 'left' });
  text(g, T.forum.tab, SR.x + SR.w - 60, SR.y + 35, 700, 27, SANS, { fill: '#fff8ea', align: 'right' });
  // the picture: the data-centre scene, live, rendered at the slot's on-screen size
  const m = g.getTransform(), s = Math.min(1, Math.hypot(m.a, m.b) * SLOT.w / W), o = A.off, og = o.getContext('2d');
  og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, W, H); og.setTransform(s, 0, 0, s, 0, 0); drawDC(og, t);
  g.save(); g.imageSmoothingQuality = 'high'; g.drawImage(o, 0, 0, Math.ceil(W * s), Math.ceil(H * s), SLOT.x, SLOT.y, SLOT.w, SLOT.h); g.restore();
  g.save(); g.globalAlpha *= seg(t, T_OUT + .1, T_OUT + .4); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(SLOT.x, SLOT.y, SLOT.w, SLOT.h); g.restore();
  const cx = SLOT.x + SLOT.w + 22, cw = SR.x + SR.w - 26 - cx;
  text(g, T.forum.by, cx, SLOT.y + 26, 600, 25, SANS, { fill: '#8a7663', align: 'left' });
  T.forum.title.forEach((l, i) => text(g, l, cx, SLOT.y + 76 + i * 46, 800, fitPx(g, l, 800, 38, SANS, cw), SANS, { fill: INK, align: 'left' }));
  const n = Math.round(12 + 4800 * eo(seg(t, 7.25, 8.5))), num = ZH ? String(n) : n.toLocaleString('en-US');
  const vy = SLOT.y + 76 + 2 * 46 + 104, pop = 1 + .12 * ring(t - 8.5, 12, 5);
  g.fillStyle = '#e4703a'; g.beginPath(); g.moveTo(cx, vy - 10); g.lineTo(cx + 22, vy - 44); g.lineTo(cx + 44, vy - 10); g.closePath(); g.fill();
  g.save(); g.translate(cx + 58, vy); g.scale(pop, pop); text(g, num, 0, 0, 900, 62, 'Fraunces', { fill: '#d4582a', align: 'left' }); g.restore();
  text(g, T.forum.votes, cx + 4, vy + 38, 600, 27, SANS, { fill: '#8a7663', align: 'left' });
  text(g, T.forum.comments, cx, vy + 84, 700, 29, SANS, { fill: INK, align: 'left' });
}

// ================================================================== 3. the kitchen (seen through the screen from 8.6, alone from 9.55)
// camera: the room, the crowd popping up, then down to the front of the crowd where the eight land (a still key, no drift back)
const KCAM = [[8.5, 540, 620, 1.34], [9.55, 540, 790, 1.14], [10.45, 540, 905, 1.03], [12.5, 540, 985, .975], [13.7, 540, 1010, .99],
  [14.75, 540, 1220, .99], [15.75, 540, 1498, 1, 0], [17.5, 540, 1516, 1.05]];
const KIT = { x: 540, y: 1180, sc: 1.7 };   // the painted kitchen, big enough to cover the floor in front of the crowd
const CHEFS = [], EIGHT = [];
const PICK = [[3, 3], [3, 12], [4, 7], [4, 14], [5, 1], [5, 9], [6, 5], [6, 11]];   // [row, column] of the eight
const LEAP = .56, LEAP_H = 150, LEAP_ORDER = [4, 1, 6, 2, 7, 0, 5, 3];
function layoutChefs() {
  let y = 1740; const rows = [];
  for (let r = 7; r >= 0; r--) { const k = .56 + .44 * r / 7; rows[r] = { y, k }; y -= .45 * 270 * k; }
  for (let r = 0; r < 8; r++) {
    const { y, k } = rows[r], sp = 67 * (.62 + .38 * r / 7);
    for (let c = 0; c < 16; c++) {
      const i = r * 16 + c, pj = PICK.findIndex(([a, b]) => a === r && b === c);
      CHEFS.push({ i, r, c, k, x: 540 + (c - 7.5 + (r % 2 ? .25 : -.25)) * sp + (hs(i * 1.7) - .5) * 8, y: y + (hs(i * 2.3) - .5) * 10,
        pop: 10.45 + r * .24 + c / 15 * .16 + (hs(i * 3.9) - .5) * .07, f: .85 + .5 * hs(i * 3.1), ph: hs(i * 7.3), flip: hs(i * 5.7) < .5, pick: pj,
        wait: 14.85 + hs(i * 9.1) * .55, col: pj >= 0 ? 0 : Math.floor(hs(i * 17.1) * 4) % 4,
        vx: pj >= 0 ? 1 : .93 + .15 * hs(i * 11.3), vy: pj >= 0 ? 1 : .95 + .1 * hs(i * 13.7) });   // scarf colour, build
    }
  }
  // the eight leap out over the rows in front and land in a staggered line ahead of everyone, left to right as they stood
  EIGHT.push(...CHEFS.filter((ch) => ch.pick >= 0).sort((a, b) => a.x - b.x));
  EIGHT.forEach((ch, j) => Object.assign(ch, { j, tx: 540 + (j - 3.5) * 118, ty: j % 2 ? 1800 : 1868, tk: j % 2 ? 1.14 : 1.28, t0: C.eight + LEAP_ORDER[j] * .075 }));
}
const CHEF_SC = 270 / 1456;
// one chef at t (null before it pops up): pops up tall-and-thin then settles; the rest fold their arms and wait; the eight
// crouch, leap (ballistic: straight ground track, parabolic height), land with a squash and cook
function chefPose(t, ch) {
  const x0 = t - ch.pop; if (x0 <= 0) return null;
  const b = Math.sin(TAU * (ch.f * t + ch.ph));
  let x = ch.x, y = ch.y, gy = ch.y, k = ch.k, S = A.idles[ch.col], SD = A.idlesD[ch.col], glowA = 0, flip = ch.flip, front = false, air = 0;
  let sy = ch.vy * spring(x0, 12.5, 6.2) * (1 + .016 * b), sx = ch.vx * spring(x0, 9.5, 5.2) * (1 - .01 * b), rot = .024 * Math.sin(TAU * (.5 * ch.f * t + 2 * ch.ph));
  y -= 36 * k * hump(seg(x0, 0, .3));
  if (ch.pick >= 0 && t >= ch.t0 - .16) {
    const pre = Math.sin(Math.PI / 2 * seg(t, ch.t0 - .16, ch.t0)), p = seg(t, ch.t0, ch.t0 + LEAP), land = t - (ch.t0 + LEAP);
    const crouch = pre * (1 - eo(seg(p, 0, .16)));
    front = p >= .2; air = hump(p);
    x = mix(ch.x, ch.tx, p); gy = mix(ch.y, ch.ty, p); k = mix(ch.k, ch.tk, p); y = gy - LEAP_H * 4 * p * (1 - p);
    sy *= 1 - .16 * crouch + .12 * air - .2 * ring(land, 15, 6); sx *= 1 + .1 * crouch - .06 * air + .16 * ring(land, 15, 6);
    rot += .14 * cl((ch.tx - ch.x) / 300, -1, 1) * air;
    if (land >= 0) { S = A.cook; flip = ch.j >= 4; const u = land; y -= 9 * k * Math.abs(Math.sin(Math.PI * 2.3 * u)); rot = .045 * Math.sin(TAU * 1.15 * u + ch.j); }
    glowA = eo(seg(land, -.1, .35)); SD = null;
  } else if (t >= ch.wait) { S = A.waits[ch.col]; SD = A.waitsD[ch.col]; const u = t - ch.wait; sy *= 1 - .09 * ring(u, 14, 6); sx *= 1 + .06 * ring(u, 14, 6); }
  return { x, y, gy, k, S, SD, sx, sy, rot, flip, glowA, front, air };
}
const chefGlow = (g, c) => { if (c.glowA > 0) glow(g, c.x, c.gy - 150 * c.k, 210 * c.k, '255,196,96', .34 * c.glowA); };
function drawChef(g, c, dim) {
  shadow(g, c.x, c.gy, 62 * c.k * (1 - .45 * c.air), .3 * (1 - .5 * c.air));
  const o = { sx: c.sx, sy: c.sy, rot: c.rot, flip: c.flip };
  put(g, c.S, c.x, c.y, CHEF_SC * c.k, o);
  if (dim > 0 && c.SD) put(g, c.SD, c.x, c.y, CHEF_SC * c.k, { ...o, alpha: dim });   // the crowd fades back while the eight stay lit
}
function drawKitchenWorld(g, t) {
  backdrop(g, A.kit, KIT.x, KIT.y, KIT.sc);
  const dim = t < C.eight ? 0 : sst(seg(t, C.eight + .05, C.eight + .8));
  if (dim > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(80,55,62,${.5 * dim})`; g.fillRect(-600, -400, 2300, 3200); g.restore(); }
  const front = [];
  for (const ch of CHEFS) { const c = chefPose(t, ch); if (!c) continue; if (c.front) front.push(c); else drawChef(g, c, dim); }
  front.sort((a, b) => a.gy - b.gy).forEach((c) => chefGlow(g, c));   // all the light first, so no chef is washed out by a neighbour's
  front.forEach((c) => drawChef(g, c, 0));
  // the count while they pop up, off when the ticket comes
  const n = CHEFS.filter((ch) => t >= ch.pop + .05).length;
  if (n > 0 && t < C.ticket + .3) {
    const k = spring(t - (C.chefs + .05), 10, 5) * (1 - ei(seg(t, C.ticket - .1, C.ticket + .2))), bump = 1 + .14 * ring(t - 12.5, 12, 5);
    if (k > 0) { g.save(); g.translate(540, 600); g.scale(k * bump, k * bump); g.rotate(-.03);
      const s = `${n} ${T.count}`, f = fitPx(g, s, 900, ZH ? 128 : 120, TITLE, 900); toon(g, s, 0, 0, 900, f, TITLE, CREAM); g.restore(); }
  }
}
// runs of [text, weight, px, family] on one baseline, centred, shrunk together to fit maxW
function runs(g, parts, X, Y, maxW, fill) {
  let w = 0; for (const [s, wt, px, fam] of parts) { font(g, wt, px, fam); w += g.measureText(s).width; }
  const f = Math.min(1, maxW / w); let x = X - w * f / 2;
  g.save(); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = fill;
  for (const [s, wt, px, fam] of parts) { font(g, wt, px * f, fam); g.fillText(s, x, Y); x += g.measureText(s).width; }
  g.restore();
}
const TK = { y: 120, sc: .58 };   // the ticket hangs from just under the top edge: its words start below the top UI band
function ticket(g, t) {
  if (t < C.ticket - .02) return;
  const k = seg(t, C.ticket, C.ticket + .5), x = mix(1600, 540, eo(k)), tStop = C.ticket + .5;
  const rot = -.32 * Math.pow(1 - k, 2) * (k < 1 ? 1 : 0) + .2 * ring(t - tStop, 7.5, 2.6) + .012 * Math.sin(TAU * .4 * (t - tStop)) * cl(t - tStop);
  g.save(); g.translate(x, TK.y); g.rotate(rot); g.scale(TK.sc, TK.sc);
  put(g, A.ticket, 0, 0, 1); g.translate(-391, -21);   // ticket pixels from here
  const cx = 402, W2 = T.ticket.word;
  text(g, T.ticket.head, cx, 440, 800, 66, SANS, { fill: '#7a5a3c' });
  if (W2.length > 1) W2.forEach((l, i) => text(g, l, cx, 650 + i * 170, 400, fitPx(g, l, 400, 190, HAND, 560), HAND, { fill: INK }));
  else text(g, W2[0], cx, 748, 400, fitPx(g, W2[0], 400, 200, HAND, 580), HAND, { fill: INK });
  const wk = seg(t, C.eight, C.eight + .45);
  if (wk > 0) { g.save(); g.beginPath(); g.rect(0, 860, 120 + 640 * eo(wk), 320); g.clip();
    const [a, n, b] = T.ticket.need;
    runs(g, [[a, 400, 104, HAND], [n, 900, 150, 'Fraunces'], [b, 400, 104, HAND]], cx, W2.length > 1 ? 1050 : 1010, 600, RED); g.restore(); }
  g.restore();
}
function drawKitchenFixed(g, t) { g.save(); camera(g, track(KCAM, t)); drawKitchenWorld(g, t); g.restore(); ticket(g, t); }

// ------------------------------------------------------------------ captions (as in ../../film/film.js)
function captionAt(t) {
  if (!VO) return null;
  for (const v of TL.vo) { const r = VO[v.id]; if (!r || t < r.t - .05 || t > r.t + r.dur + .25) continue;
    const parts = (T.cap[v.id] || '').split('|'), lens = parts.map((p) => p.replace(/\//g, '').length), tot = lens.reduce((a, b) => a + b, 0);
    let acc = r.t; for (let i = 0; i < parts.length; i++) { const d = r.dur * lens[i] / tot; if (t < acc + d + (i === parts.length - 1 ? .25 : 0)) return parts[i]; acc += d; } }
  return null;
}
function captions(g, t) {
  const s = captionAt(t); if (!s) return;
  const rows = s.split('/'), px = ZH ? 56 : 52, fam = ZH ? '"Noto Sans SC", Inter' : 'Inter', wt = ZH ? 700 : 700, lh = px * 1.24;
  g.save(); font(g, wt, px, fam); g.textAlign = 'center'; g.textBaseline = 'middle';
  const wmax = Math.min(800, Math.max(...rows.map((r) => g.measureText(r).width))), cy = 1376 - (rows.length - 1) * lh / 2;
  g.fillStyle = 'rgba(34,20,12,.66)'; g.beginPath(); g.roundRect(540 - wmax / 2 - 28, cy - lh / 2 - 12, wmax + 56, rows.length * lh + 24, 22); g.fill();
  rows.forEach((r, i) => { const f = Math.min(px, fitPx(g, r, wt, px, fam, 800)); font(g, wt, f, fam); g.fillStyle = '#fff6e2'; g.fillText(r, 540, cy + i * lh + 2); });
  g.restore();
}
function guides(g) { g.save(); g.lineWidth = 3; const b = (x, y, w, h, c) => { g.strokeStyle = c; g.setLineDash([12, 8]); g.strokeRect(x, y, w, h); }; b(0, 0, W, 260, '#ff4d6d'); b(0, 1480, W, 440, '#ff4d6d'); b(880, 700, 200, 780, '#ff4d6d'); b(120, 1200, 760, 240, '#ffd24d'); g.restore(); }
function vignette(g) { const gr = g.createRadialGradient(540, 900, 380, 540, 960, 1250); gr.addColorStop(0, 'rgba(40,20,8,0)'); gr.addColorStop(1, 'rgba(40,20,8,.42)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }

defineScene({
  meta: { title: 'Strata opening, toon look', durationFrames: Math.round(DUR * FPS), fps: FPS, width: W, height: H, design: [W, H], seed: 7, background: '#1a120c', fonts: ['Fraunces', 'Inter'], poster: 0 },
  setup,
  layers: [{ name: 'film', type: '2d', draw(ctx, g) {
    const t = ctx.sec; BASE = g.getTransform(); g.imageSmoothingQuality = 'high';
    if (t < T_OUT) drawDC(g, t);
    else if (t < T_PUSH1) drawRoom(g, t);
    else drawKitchenFixed(g, t);
    vignette(g);
  } }],
  post(ctx, g) { if (CAPS) captions(g, ctx.sec); if (GUIDES) guides(g); },
});
