// q5.js / Canvas2D effect helpers for the Tiga films. All pure functions of time; positions in art space are
// mapped with H.toScreen, sizes in art px are multiplied by view.k.
import { rng, env, prog, EASE, AW, AH } from './engine.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** anime focus lines around a screen point (fx, fy in 0..1 of the frame), q5 triangles. */
export function focusLines(q, H, t, { x = 0.5, y = 0.5, t0, t1, n = 90, color = [255, 255, 255], alpha = 200, inner = 0.28, seed = 'fl', hold = 2 }) {
  const a = env(t, t0, t1, 0.06, 0.15);
  if (a <= 0) return;
  const W = H.W, Hh = H.H, cx = x * W, cy = y * Hh, R = Math.hypot(W, Hh);
  const step = Math.floor(t * 30 / hold);               // lines re-drawn every `hold` frames (anime on twos)
  const r = rng(seed, step);
  q.noStroke();
  for (let i = 0; i < n; i++) {
    const ang = r() * TAU, w = (0.004 + r() * 0.012) * (r() < 0.15 ? 2.5 : 1), rin = R * (inner + r() * 0.22);
    q.fill(color[0], color[1], color[2], alpha * a * (0.5 + r() * 0.5));
    q.triangle(cx + Math.cos(ang) * rin, cy + Math.sin(ang) * rin,
      cx + Math.cos(ang - w) * R, cy + Math.sin(ang - w) * R, cx + Math.cos(ang + w) * R, cy + Math.sin(ang + w) * R);
  }
}

/** parallel speed lines (angle in degrees), q5 lines. */
export function speedLines(q, H, t, { t0, t1, angle = 0, n = 60, color = [255, 255, 255], alpha = 160, seed = 'sl', hold = 1, band = [0, 1] }) {
  const a = env(t, t0, t1, 0.05, 0.12);
  if (a <= 0) return;
  const r = rng(seed, Math.floor(t * 30 / hold)), W = H.W, Hh = H.H, D = Math.hypot(W, Hh);
  q.push(); q.translate(W / 2, Hh / 2); q.rotate(angle * Math.PI / 180);
  for (let i = 0; i < n; i++) {
    const yy = (band[0] + r() * (band[1] - band[0]) - 0.5) * D, len = D * (0.15 + r() * 0.5), xx = (r() - 0.5) * D;
    q.stroke(color[0], color[1], color[2], alpha * a * (0.3 + r() * 0.7)); q.strokeWeight(1 + r() * 3.5);
    q.line(xx, yy, xx + len, yy);
  }
  q.pop();
}

/** katakana / kanji sound effect lettering with a pop-in. (x, y) in 0..1 of the frame. */
export function sfx(c, H, t, { text, t0, t1, x, y, size = 0.12, rot = -8, fill = ['#fff36b', '#ff8a00'], stroke = '#140a06', outer = '#ffffff', skew = -0.18, seed = 'sfx' }) {
  if (t < t0 || t > t1) return;
  const u = (t - t0), pop = EASE.outBack(clamp(u / 0.14, 0, 1)), fade = 1 - prog(t, t1 - 0.18, t1);
  const r = rng(seed, Math.floor(t * 30 / 2));
  const S = Math.min(H.W, H.H) * size * (0.4 + 0.6 * pop);
  c.save();
  c.globalAlpha = fade;
  c.translate(x * H.W + (r() - 0.5) * S * 0.05, y * H.H + (r() - 0.5) * S * 0.05);
  c.rotate(rot * Math.PI / 180); c.transform(1, 0, skew, 1, 0, 0);
  c.font = `900 ${S}px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "PingFang SC", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const chars = [...text], adv = S * 0.86, w0 = -(chars.length - 1) * adv / 2;
  chars.forEach((ch, i) => {
    const dy = Math.sin(i * 1.7) * S * 0.08, sc = 1 + (i === 0 ? 0.18 : 0) - i * 0.02;
    c.save(); c.translate(w0 + i * adv, dy); c.scale(sc, sc);
    c.lineWidth = S * 0.26; c.strokeStyle = outer; c.strokeText(ch, 0, 0);
    c.lineWidth = S * 0.15; c.strokeStyle = stroke; c.strokeText(ch, 0, 0);
    const gr = c.createLinearGradient(0, -S / 2, 0, S / 2); gr.addColorStop(0, fill[0]); gr.addColorStop(1, fill[1]);
    c.fillStyle = gr; c.fillText(ch, 0, 0);
    c.restore();
  });
  c.restore();
}

/** cel-shaded cloud textures from fractal noise (lit top, mid, shadow tones, ragged soft edge), cached per colour. */
const CLOUDS = new Map();
function cloudTex(color, k) {
  const key = color.join(',') + '|' + k;
  if (CLOUDS.has(key)) return CLOUDS.get(key);
  const S = 192, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), id = g.createImageData(S, S), R = rng('cloud', k);
  const G = 16, grid = Array.from({ length: G * G }, () => R());
  const val = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sm = (u) => u * u * (3 - 2 * u);
    const at = (a, b) => grid[((b % G + G) % G) * G + ((a % G + G) % G)];
    return lerp2(lerp2(at(xi, yi), at(xi + 1, yi), sm(fx)), lerp2(at(xi, yi + 1), at(xi + 1, yi + 1), sm(fx)), sm(fy)); };
  const lerp2 = (a, b, u) => a + (b - a) * u;
  const fbm = (x, y) => { let a = 0, amp = 0.55, f = 1; for (let o = 0; o < 5; o++) { a += amp * val(x * f + o * 5.3, y * f + o * 1.7); amp *= 0.5; f *= 2; } return a; };
  const dens = (x, y) => { const dx = x / S - 0.5, dy = y / S - 0.55, r = Math.hypot(dx * 1.1, dy * 1.35);
    return fbm(x / S * 4, y / S * 4) * 1.25 - r * 2.1 + 0.18; };
  const lit = color.map((c) => Math.min(255, c * 1.28 + 20)), mid = color, sh = color.map((c) => c * 0.58);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = dens(x, y), i = (y * S + x) * 4;
    if (d <= 0) { id.data[i + 3] = 0; continue; }
    const nx = dens(x + 2, y) - dens(x - 2, y), ny = dens(x, y + 2) - dens(x, y - 2);
    const l = -nx * 0.6 - ny * 0.9 + (0.55 - y / S) * 0.35;          // light from the upper left
    const tone = l > 0.05 ? lit : l > -0.06 ? mid : sh;
    id.data[i] = tone[0]; id.data[i + 1] = tone[1]; id.data[i + 2] = tone[2];
    id.data[i + 3] = Math.round(255 * Math.min(1, d / 0.12));
  }
  g.putImageData(id, 0, 0);
  CLOUDS.set(key, cv); return cv;
}

/** cel-shaded dust billows rising from a strip of ground (art space). */
export function dust(c, H, v, t, { t0, t1, x0, x1, y, n = 26, rise = 160, spread = 90, size = [60, 160], color = [184, 154, 120], alpha = 0.85, seed = 'dust' }) {
  if (t < t0 - 0.01 || t > t1 + 1.6) return;
  const R = rng(seed), out = 1 - prog(t, t1 + 0.6, t1 + 1.6);
  for (let i = 0; i < n; i++) {
    const birth = t0 + R() * (t1 - t0) * 0.8, life = 1.1 + R() * 1.1, u = (t - birth) / life;
    const bx = x0 + R() * (x1 - x0), sz = size[0] + R() * (size[1] - size[0]), dir = R.range(-1, 1), tex = cloudTex(color, i % 6), rot = R.range(-0.4, 0.4), flip = R() < 0.5;
    if (u < 0 || u > 1) continue;
    const e = EASE.out(u), ax = bx + dir * spread * e, ay = y - rise * e;
    const [sx, sy] = H.toScreen(ax, ay), D = sz * 2 * (0.4 + 0.9 * e) * v.k;
    const a = alpha * Math.min(1, u * 5) * (1 - prog(u, 0.5, 1)) * out;
    if (a <= 0.01) continue;
    c.save(); c.globalAlpha = a; c.translate(sx, sy); c.rotate(rot + e * 0.2 * (flip ? 1 : -1)); if (flip) c.scale(-1, 1);
    c.drawImage(tex, -D / 2, -D / 2, D, D); c.restore();
  }
}

/** glowing embers / sparks drifting up (q5 circles, additive). */
export function embers(q, c, H, v, t, { t0, t1, box = [0, 0, AW, AH], n = 70, vy = -120, color = [255, 170, 60], size = [2, 5], seed = 'emb', drift = 40 }) {
  const a0 = env(t, t0, t1, 0.2, 0.3);
  if (a0 <= 0) return;
  const R = rng(seed), span = box[3] - box[1];
  c.save(); c.globalCompositeOperation = 'lighter'; q.noStroke();
  for (let i = 0; i < n; i++) {
    const x0 = box[0] + R() * (box[2] - box[0]), ph = R(), sp = 0.5 + R();
    const yy = box[1] + ((ph * span + vy * sp * (t - t0)) % span + span) % span;
    const xx = x0 + Math.sin(t * (1 + R() * 2) + i) * drift;
    const [sx, sy] = H.toScreen(xx, yy), s = (size[0] + R() * (size[1] - size[0])) * Math.max(0.6, v.k);
    const fl = 0.6 + 0.4 * Math.sin(t * 20 + i * 3);
    q.fill(color[0], color[1], color[2], 255 * a0 * fl * 0.35); q.circle(sx, sy, s * 4);
    q.fill(255, 240, 200, 255 * a0 * fl); q.circle(sx, sy, s);
  }
  c.restore();
}

/** additive radial glow at an art point. */
export function glow(c, H, v, x, y, r, rgba, a = 1) {
  if (a <= 0) return;
  const [sx, sy] = H.toScreen(x, y), R = r * v.k;
  const g = c.createRadialGradient(sx, sy, 0, sx, sy, R);
  g.addColorStop(0, `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${a})`);
  g.addColorStop(0.35, `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${a * 0.45})`);
  g.addColorStop(1, `rgba(${rgba[0]},${rgba[1]},${rgba[2]},0)`);
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(sx - R, sy - R, 2 * R, 2 * R); c.restore();
}

/** rotating god rays from an art point (additive wedges). */
export function rays(c, H, v, t, { x, y, n = 14, len = 1400, a = 1, color = [255, 214, 120], spin = 0.25, width = 0.07, seed = 'rays' }) {
  if (a <= 0) return;
  const [sx, sy] = H.toScreen(x, y), L = len * v.k, R = rng(seed);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ang = R() * TAU + t * spin * (R() < 0.5 ? 1 : -1), w = width * (0.4 + R());
    const g = c.createRadialGradient(sx, sy, 0, sx, sy, L * (0.6 + R() * 0.4));
    const al = a * (0.25 + 0.35 * R()) * (0.75 + 0.25 * Math.sin(t * 9 + i));
    g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${al})`); g.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
    c.fillStyle = g; c.beginPath(); c.moveTo(sx, sy);
    c.lineTo(sx + Math.cos(ang - w) * L, sy + Math.sin(ang - w) * L); c.lineTo(sx + Math.cos(ang + w) * L, sy + Math.sin(ang + w) * L);
    c.closePath(); c.fill();
  }
  c.restore();
}

/** a monster ray: a hot core with a coloured halo between two art points, growing from the source. */
export function ray2d(c, H, v, t, { t0, t1, x0, y0, x1, y1, width = 40, color = [255, 140, 40], grow = 0.08 }) {
  const a = env(t, t0, t1, 0.02, 0.12);
  if (a <= 0) return;
  const g = prog(t, t0, t0 + grow);
  const [ax, ay] = H.toScreen(x0, y0), [bx0, by0] = H.toScreen(x1, y1);
  const bx = ax + (bx0 - ax) * g, by = ay + (by0 - ay) * g, W = width * v.k * (0.85 + 0.15 * Math.sin(t * 60));
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (const [w, al, col] of [[3.2, 0.18, color], [1.8, 0.35, color], [1, 0.8, [255, 220, 150]], [0.4, 1, [255, 255, 240]]]) {
    c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${al * a})`; c.lineWidth = W * w;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
  }
  c.restore();
  if (g >= 1) glow(c, H, v, x1, y1, width * 4, [255, 230, 170], a);
}

/** branching crack systems, precomputed; returns a drawer(c, H, v, p, style). Angular, sparse, tapering. */
export function makeCracks(seed, starts, { seg = [16, 34], len = 12, branch = 0.1, jitter = 17, walks = [1, 2] } = {}) {
  const R = rng('cracks', seed), paths = [];
  const walk = (x, y, ang, n, depth, w0) => {
    const pts = [[x, y]];
    for (let i = 0; i < n; i++) {
      ang += R.gauss() * jitter * Math.PI / 180;
      const s = seg[0] + R() * (seg[1] - seg[0]);
      x += Math.cos(ang) * s; y += Math.sin(ang) * s; pts.push([x, y]);
      if (depth < 2 && i > 1 && R() < branch) walk(x, y, ang + (R() < 0.5 ? 1 : -1) * (0.45 + R() * 0.6), Math.max(2, Math.floor((n - i) * (0.35 + R() * 0.35))), depth + 1, w0 * 0.6);
    }
    paths.push({ pts, depth, w0, start: depth * 0.18 + R() * 0.12 });
  };
  for (const [x, y, n] of starts) {
    const k = walks[0] + Math.floor(R() * (walks[1] - walks[0] + 1));
    for (let j = 0; j < k; j++) walk(x, y, R() * TAU, n || len, 0, 1);
  }
  return function draw(c, H, v, p, { core = 'rgba(18,10,6,0.95)', edge = 'rgba(255,176,96,0.6)', width = 4, glowCol = null } = {}) {
    if (p <= 0) return;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'miter';
    for (const P of paths) {
      const u = clamp((p - P.start) / (1 - P.start), 0, 1);
      if (u <= 0) continue;
      const pts = P.pts.map(([x, y]) => H.toScreen(x, y)), m = (pts.length - 1) * u;
      for (let j = 0; j < Math.ceil(m); j++) {
        const f = Math.min(1, m - j), [ax, ay] = pts[j], [bx0, by0] = pts[j + 1];
        const bx = ax + (bx0 - ax) * f, by = ay + (by0 - ay) * f;
        const w = width * P.w0 * v.k * Math.max(0.25, 1 - j / (pts.length - 1) * 0.8);
        if (glowCol) {
          c.globalCompositeOperation = 'lighter'; c.shadowColor = glowCol; c.shadowBlur = 16 * v.k;
          c.strokeStyle = glowCol; c.lineWidth = w * 2.4; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
          c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,236,0.95)'; c.lineWidth = w * 0.9; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
          c.globalCompositeOperation = 'source-over';
        } else {
          c.strokeStyle = edge; c.lineWidth = w * 1.7; c.beginPath(); c.moveTo(ax + w * 0.35, ay + w * 0.35); c.lineTo(bx + w * 0.35, by + w * 0.35); c.stroke();
          c.strokeStyle = core; c.lineWidth = w; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
        }
      }
    }
    c.restore();
  };
}

/** explosion at an art point: the painted cel fireball sprite (IMG.boom, black background, added) grows and
 *  burns off, with a shockwave ring and a white core flash. */
export function explosion(c, H, v, t, { t0, x, y, r = 380, seed = 'ex' }) {
  const u = t - t0;
  if (u < 0 || u > 1.5) return;
  const R = rng(seed), [sx, sy] = H.toScreen(x, y), K = v.k, im = H.IMG.boom;
  const ru = prog(u, 0, 0.45, EASE.out), ringR = r * 2.8 * ru * K;
  if (u < 0.45) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,240,210,${0.85 * (1 - ru)})`; c.lineWidth = 30 * K * (1 - ru) + 2; c.beginPath(); c.ellipse(sx, sy, ringR, ringR * 0.78, -0.2, 0, TAU); c.stroke(); c.restore(); }
  if (im) {
    const grow = EASE.outQ(clamp(u / 0.4, 0, 1)), a = 1 - prog(u, 0.4, 1.0), D = r * 2.4 * (0.35 + 0.85 * grow) * K;
    c.save(); c.globalAlpha = a; c.translate(sx, sy); c.rotate(-0.15 + u * 0.25);
    c.drawImage(im, -D / 2, -D / 2, D, D);
    c.globalAlpha = a * 0.6; c.rotate(1.9); c.drawImage(im, -D * 0.4, -D * 0.4, D * 0.8, D * 0.8);   // second, turned copy breaks the symmetry
    c.restore();
  }
  glow(c, H, v, x, y, r * 1.4, [255, 244, 214], 0.95 * (1 - prog(u, 0.03, 0.5)));
}

/** the yellow jet sprite in art space, with contrail and afterburner. path(t) -> [x, y, angleDeg]. */
export function jet(g, t, IMG, { t0, t1, path, width = 190, trail = true, trailLen = 0.35 }) {
  if (t < t0 || t > t1 + trailLen) return;
  const im = IMG.jet, h = width * im.height / im.width;
  if (trail) {
    g.save(); g.lineCap = 'round';
    const pts = [];
    for (let k = 0; k <= 24; k++) { const tt = Math.min(t, t1) - (k / 24) * trailLen; if (tt < t0) break; pts.push(path(tt)); }
    for (let k = 1; k < pts.length; k++) {
      const a = (1 - k / pts.length) * 0.75, w = width * (0.03 + 0.05 * k / pts.length);
      const [x0, y0, a0] = pts[k - 1], [x1, y1] = pts[k];
      const off = [-Math.cos(a0 * Math.PI / 180) * width * 0.48, -Math.sin(a0 * Math.PI / 180) * width * 0.48];
      g.strokeStyle = `rgba(255,250,245,${a})`; g.lineWidth = w;
      g.beginPath(); g.moveTo(x0 + off[0], y0 + off[1] + width * 0.04); g.lineTo(x1 + off[0], y1 + off[1] + width * 0.04); g.stroke();
    }
    g.restore();
  }
  if (t > t1) return;
  const [x, y, ang] = path(t);
  g.save(); g.translate(x, y); g.rotate(ang * Math.PI / 180);
  const fl = 0.8 + 0.2 * Math.sin(t * 90);
  const gr = g.createRadialGradient(-width * 0.5, h * 0.08, 0, -width * 0.5, h * 0.08, width * 0.25 * fl);
  gr.addColorStop(0, 'rgba(255,255,230,0.95)'); gr.addColorStop(0.4, 'rgba(255,180,80,0.6)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(-width * 0.8, -width * 0.3, width * 0.6, width * 0.6);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(im, -width / 2, -h / 2, width, h);
  g.restore();
}
