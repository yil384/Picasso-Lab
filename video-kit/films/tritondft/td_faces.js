// td_faces.js - minimal comic faces painted with p5.brush (P(doom) rule: dot / slit eyes, a mouth only on takes;
// the eye shape carries the emotion). Faces are baked once per expression (2 boil variants) into textures:
//   sphere faces: equirect texture, the face centred at u = 0.25 (three.js SphereGeometry faces +z there)
//   flat faces:   a square texture for dials / lenses / panels (face centred)
// After the style-comic reference film's paintFace (same stroke recipes), re-proportioned for card size.
import { TAU, hsh, PAL, bake } from './td_core.js';

const ell = (x, y, rx, ry, rot = 0, n = 22) => Array.from({ length: n }, (_, i) => {
  const a = i / n * TAU, px = Math.cos(a) * rx, py = Math.sin(a) * ry;
  return [x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)];
});
export function fillP(brush, pts, col, op = 255, bleed = 0.015, tex = 0.12) {
  brush.noStroke(); brush.noHatch(); brush.fill(col, op); brush.fillBleed(bleed); brush.fillTexture(tex, 0.2); brush.polygon(pts); brush.noFill();
}
export const star4 = (x, y, r, rot = 0) => Array.from({ length: 8 }, (_, i) => { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; });

/**
 * cfg: { sphere (bool), s (feature scale), ex (half eye gap), ey (eye y offset), my (mouth y offset), eyeCol, ink,
 *        blush (bool), brow (bool), cheek (px) }
 */
export function paintFace(brush, cfg, expr, W, H, v) {
  const sphere = cfg.sphere !== false;
  const cx = sphere ? W * 0.25 : W / 2, cy = sphere ? H * 0.5 + (cfg.cy ?? 0) : H * 0.5 + (cfg.cy ?? 0);
  const s = cfg.s ?? 1, ink = cfg.ink ?? PAL.ink, eyeCol = cfg.eyeCol ?? ink;
  const j = (a) => (hsh(v, a, cfg.seed ?? 1) - 0.5) * 3 * s;
  const ex = (cfg.ex ?? 56) * s, ey = (cfg.ey ?? -22) * s, my = cy + (cfg.my ?? 44) * s;
  const eyes = [[cx - ex, cy + ey], [cx + ex, cy + ey]];
  const W_ = (px) => px / 11;
  // a solid ink ellipse: p5.brush's watercolour fill stays translucent (grey-violet) on big shapes, so a soft fill
  // base is packed with overlapping fat-ink scanlines and ringed with an ink contour
  const solidEll = (x, y, rx, ry, col) => {
    const E = ell(x, y, rx, ry, 0, 30);
    fillP(brush, E, col);
    const w = Math.max(5, Math.min(rx, ry) * 0.6), stp = w * 0.42;
    brush.set('fatink', col, W_(w));
    for (let yy = -ry + w * 0.4; yy <= ry - w * 0.4 + 1e-6; yy += stp) {
      const hx = rx * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)) - w * 0.35;
      if (hx > 1) brush.line(x - hx, y + yy, x + hx, y + yy);
    }
    brush.set('fatink', col, W_(Math.max(3, w * 0.5)));
    brush.beginShape(0.2); E.forEach(([a, b]) => brush.vertex(a, b)); brush.endShape(true);
  };
  const dotEyes = (rx, ry, look = 0) => eyes.forEach(([x, y], i) => {
    solidEll(x + j(i) + look * s, y + j(i + 3), rx * s, ry * s, eyeCol);
    const G = ell(x + look * s - rx * 0.32 * s, y - ry * 0.42 * s, rx * 0.3 * s, ry * 0.2 * s);
    fillP(brush, G, PAL.cream); fillP(brush, G, PAL.cream);
  });
  const arcs = (dir, w = 22, h = 14) => eyes.forEach(([x, y]) => {
    brush.set('fatink', eyeCol, W_(10 * s)); brush.spline([[x - w * s, y + dir * h * 0.3 * s], [x, y - dir * h * s], [x + w * s, y + dir * h * 0.3 * s]], 0.7);
  });
  const slits = (tilt = 0) => eyes.forEach(([x, y], i) => {
    const sg = i ? -1 : 1; brush.set('fatink', eyeCol, W_(10 * s));
    brush.line(x - 19 * s, y - sg * tilt * s, x + 19 * s, y + sg * tilt * s);
  });
  const mouth = (kind) => {
    const m = s;
    if (kind === 'smile') { brush.set('bigink', ink, W_(9 * m) * 1.6); brush.spline([[cx - 22 * m, my - 4 * m], [cx, my + 10 * m], [cx + 22 * m, my - 4 * m]], 0.7); }
    if (kind === 'o') { solidEll(cx, my + 4 * m, 11 * m, 14 * m, ink); const T = ell(cx, my + 8 * m, 6 * m, 6 * m); fillP(brush, T, '#e8546a'); fillP(brush, T, '#e8546a'); }
    if (kind === 'open') {
      const pts = [[cx - 28 * m, my - 8 * m], [cx + 28 * m, my - 8 * m], [cx + 20 * m, my + 14 * m], [cx, my + 22 * m], [cx - 20 * m, my + 14 * m]];
      for (let q = 0; q < 3; q++) fillP(brush, pts, ink);
      brush.set('fatink', ink, W_(9 * m)); for (let yy = -5; yy <= 15; yy += 5) { const hx = (26 - Math.max(0, yy - 4) * 1.1) * m; brush.line(cx - hx, my + yy * m, cx + hx, my + yy * m); }
      brush.beginShape(0.2); pts.forEach(([a, b]) => brush.vertex(a, b)); brush.endShape(true);
      const T = ell(cx, my + 13 * m, 12 * m, 7 * m); fillP(brush, T, '#e8546a'); fillP(brush, T, '#e8546a');
    }
    if (kind === 'flat') { brush.set('bigink', ink, W_(9 * m) * 1.5); brush.line(cx - 18 * m, my, cx + 18 * m, my + 2 * m); }
    if (kind === 'wavy') { brush.set('bigink', ink, W_(9 * m) * 1.4); brush.spline([[cx - 22 * m, my], [cx - 11 * m, my - 6 * m], [cx, my], [cx + 11 * m, my - 6 * m], [cx + 22 * m, my]], 0.5); }
    if (kind === 'teeth') { const pts = [[cx - 32 * m, my - 10 * m], [cx + 32 * m, my - 10 * m], [cx + 32 * m, my + 12 * m], [cx - 32 * m, my + 12 * m]]; fillP(brush, pts, PAL.cream); fillP(brush, pts, PAL.cream); brush.set('bigink', ink, W_(8 * m) * 1.2); brush.beginShape(0); pts.forEach(([a, b]) => brush.vertex(a, b)); brush.endShape(true); brush.line(cx - 32 * m, my + 1 * m, cx + 32 * m, my + 1 * m); for (let q = -1; q <= 1; q++) brush.line(cx + q * 14 * m, my - 10 * m, cx + q * 14 * m, my + 12 * m); }
    if (kind === 'tiny') { brush.set('bigink', ink, W_(8 * m)); brush.spline([[cx - 8 * m, my], [cx, my + 5 * m], [cx + 8 * m, my]], 0.6); }
  };
  const blush = () => { if (cfg.blush === false) return; [[cx - ex * 1.5, cy + 16 * s], [cx + ex * 1.5, cy + 16 * s]].forEach(([x, y]) => fillP(brush, ell(x, y, 20 * s, 10 * s), '#ff8a7a', 150, 0.08, 0.3)); };
  const brows = (dir) => eyes.forEach(([x, y], i) => { const sg = i ? 1 : -1; brush.set('fatink', ink, W_(9 * s)); brush.line(x - 20 * s, y - 36 * s - dir * sg * 8 * s, x + 20 * s, y - 36 * s + dir * sg * 8 * s); });
  const sweat = () => { const x = cx + ex * 1.7, y = cy - 30 * s; fillP(brush, [[x, y - 26 * s], [x + 11 * s, y], [x + 8 * s, y + 10 * s], [x, y + 14 * s], [x - 8 * s, y + 10 * s], [x - 11 * s, y]], '#7fd0f4'); brush.set('bigink', ink, W_(6 * s)); brush.beginShape(0.3); [[x, y - 26 * s], [x + 11 * s, y], [x + 8 * s, y + 10 * s], [x, y + 14 * s], [x - 8 * s, y + 10 * s], [x - 11 * s, y]].forEach(([a, b]) => brush.vertex(a, b)); brush.endShape(true); };
  switch (expr) {
    case 'sleep': arcs(-1, 20, 9); break;
    case 'awake': dotEyes(12, 21); break;
    case 'look': dotEyes(12, 21, 9); break;
    case 'surprised': dotEyes(16, 29); mouth('o'); break;
    case 'whee': eyes.forEach(([x, y], i) => { const sg = i ? -1 : 1; brush.set('fatink', eyeCol, W_(10 * s)); brush.spline([[x - 16 * sg * s, y - 16 * s], [x + 14 * sg * s, y], [x - 16 * sg * s, y + 16 * s]], 0.2); }); mouth('open'); break;
    case 'happy': arcs(1, 20, 14); mouth('smile'); break;
    case 'love': arcs(1, 20, 14); mouth('smile'); blush(); break;
    case 'sparkle': eyes.forEach(([x, y], i) => fillP(brush, star4(x, y, 30 * s, 0.1 * i), eyeCol === ink ? '#1d1a40' : eyeCol)); mouth('open'); blush(); break;
    case 'squint': eyes.forEach(([x, y], i) => { const sg = i ? -1 : 1; brush.set('fatink', eyeCol, W_(10 * s)); brush.line(x - 18 * s, y - sg * 4 * s, x + 18 * s, y + sg * 4 * s); }); break;
    case 'determined': dotEyes(12, 19); brows(1); break;
    case 'strain': eyes.forEach(([x, y], i) => { const sg = i ? -1 : 1; brush.set('fatink', eyeCol, W_(10 * s)); brush.spline([[x - 16 * sg * s, y - 14 * s], [x + 12 * sg * s, y], [x - 16 * sg * s, y + 14 * s]], 0.2); }); mouth('teeth'); break;
    case 'calm': dotEyes(11, 18); mouth('tiny'); break;
    case 'grin': arcs(1, 22, 15); mouth('open'); blush(); break;
    case 'worried': dotEyes(11, 19); brows(-1); mouth('wavy'); sweat(); break;
    case 'tired': slits(0); brows(-0.6); mouth('flat'); break;
    case 'annoyed': eyes.forEach(([x, y]) => fillP(brush, [[x - 14 * s, y - 2 * s], [x + 14 * s, y - 2 * s], [x + 12 * s, y + 12 * s], [x - 12 * s, y + 12 * s]], eyeCol)); brows(-0.6); mouth('flat'); break;
    case 'dizzy': eyes.forEach(([x, y]) => { brush.set('bigink', eyeCol, W_(7 * s)); const pts = []; for (let k = 0; k <= 26; k++) { const a = k / 26 * TAU * 2.2, r = 3 * s + k * 0.8 * s; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } brush.spline(pts, 0.5); }); mouth('wavy'); break;
    case 'blank': break;
    default: dotEyes(12, 21);
  }
}

/** Bake a set of expressions for one character: returns { expr: [tex v0, tex v1] }. */
export async function bakeFaces(THREE, who, cfg, exprs, { W = 1024, H = 512, version = 1, bg = '#ffffff', base = null } = {}) {
  const out = {};
  for (const e of exprs) {
    out[e] = [];
    for (let v = 0; v < 2; v++) {
      out[e].push(await bake(THREE, { width: W, height: H, seed: 100 + v * 7, key: `face-${who}-${e}-${v}-v${version}`, background: bg },
        (p, brush, w, h) => { if (base) base(brush, w, h, v); paintFace(brush, cfg, e, w, h, v); }));
    }
  }
  return out;
}
