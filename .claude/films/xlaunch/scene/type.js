// Editorial type for the launch film: one family (Inter) + a mono for data labels (JetBrains Mono), a strict scale,
// a 72 px margin. Reveals rise out of a mask with a short focus pull; data labels hang on thin leader lines that are
// anchored to 3D points (ctx.project), so the annotation sticks to the object while the camera moves.
import { clamp, eout, eout5, sm } from '/scene/lib.js';

export const M = 72, W = 1080, H = 1350;
export const GRAD = ['#ffffff', '#a1a1aa'];
export const MUTE = '#8e8e93', SOFT = '#c7c7cc', INK = '#f5f5f7';

export function txt(g, s, x, y, size, weight, color, o = {}) {
  const k = o.k ?? 1; if (k <= 0.004) return;
  const fam = o.mono ? 'JetBrains Mono' : 'Inter';
  g.save();
  g.font = `${o.italic ? 'italic ' : ''}${weight} ${size}px "${fam}"`; g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
  const e = eout5(k);
  try { g.letterSpacing = `${(o.track ?? -0.02) * size + (1 - e) * size * (o.spread ?? 0.06)}px`; } catch (err) { /* */ }
  g.globalAlpha = clamp(k * 1.5) * (o.alpha ?? 1);
  const blur = (1 - e) * size * 0.06; if (blur > 0.25 && !o.noblur) g.filter = `blur(${blur.toFixed(1)}px)`;
  if (o.grad) { const gr = g.createLinearGradient(0, y - size, 0, y); gr.addColorStop(0, o.grad[0]); gr.addColorStop(1, o.grad[1]); g.fillStyle = gr; }
  else g.fillStyle = color;
  // the rise: a mask at the baseline, the glyphs slide up out of it
  const rise = (1 - e) * size * (o.rise ?? 0.42);
  if (o.mask !== false) { g.beginPath(); g.rect(-50, y - size * 1.25, W + 100, size * 1.25 + size * 0.32); g.clip(); }
  g.fillText(s, x, y + rise);
  g.restore();
}
export function measure(g, s, size, weight, mono, track = 0) {
  g.save(); g.font = `${weight} ${size}px "${mono ? 'JetBrains Mono' : 'Inter'}"`;
  try { g.letterSpacing = `${track * size}px`; } catch (err) { /* */ }
  const w = g.measureText(s).width; g.restore(); return w;
}
// a soft dark halo behind a block of type (instead of full-width scrims that would fog the characters' feet)
export function halo(g, x0, y0, x1, y1, a = 0.7) {
  if (a <= 0.005) return;
  g.save(); g.filter = 'blur(40px)'; g.fillStyle = `rgba(11,11,14,${a})`; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
}

export function scrim(g, y0, y1, a) {
  if (a <= 0.005) return;
  const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(11,11,14,0)'); gr.addColorStop(1, `rgba(11,11,14,${a})`);
  g.fillStyle = gr; g.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
}

// the running header: PICASSO LAB on the left, the chapter on the right ("01  ORIGIN"), a hairline between
export function header(g, chapter, k = 1, kc = 1) {
  // a permanent soft band so the header never sits on a lit sheet, then the type with a dark shadow
  const gr = g.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, `rgba(11,11,14,${0.8 * k})`); gr.addColorStop(1, 'rgba(11,11,14,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, 180);
  g.save(); g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = 10;
  txt(g, 'PICASSO LAB', M, 96, 20, 600, '#a1a1a6', { track: 0.32, k, noblur: true, mask: false });
  if (chapter && kc > 0.01) {
    const ww = measure(g, chapter[1], 22, 500, true, 0.12);
    txt(g, chapter[0], W - M - ww - 14, 96, 22, 700, INK, { mono: true, track: 0.05, k: kc, align: 'right', noblur: true, mask: false });
    txt(g, chapter[1], W - M, 96, 22, 500, '#a1a1a6', { mono: true, track: 0.12, k: kc, align: 'right', noblur: true, mask: false });
  }
  g.restore();
}

// a leader line from a 3D anchor (projected) to a label; the line draws itself, then the label rises
export function leader(g, from, to, k, label, o = {}) {
  if (k <= 0.01 || !from) return;
  const e = eout(clamp(k * 1.6));
  const pts = [from, ...(o.via || []), to];
  const path = () => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); let n = (pts.length - 1) * e;
    for (let i = 1; i < pts.length && n > 0; i++, n--) { const a = pts[i - 1], b = pts[i], t = Math.min(1, n); g.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t); }
    if (o.tail && e >= 1) g.lineTo(to.x + o.tail, to.y); };
  g.save(); g.globalAlpha = clamp(k * 3); g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = 'rgba(11,11,14,0.5)'; g.lineWidth = 6; path(); g.stroke();
  g.strokeStyle = o.color || 'rgba(245,245,247,0.9)'; g.lineWidth = 3; path(); g.stroke();
  if (!o.noDot) { g.beginPath(); g.arc(from.x, from.y, 6, 0, Math.PI * 2); g.fillStyle = o.dot || '#f5f5f7'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(11,11,14,0.6)'; g.stroke(); }
  g.restore();
  if (label) {
    const kk = clamp((k - 0.35) / 0.65), size = o.size || 34, sub = Math.max(28, size * 0.8);
    const right = o.align !== 'right', x = to.x + (o.tail || 0) + (right ? 12 : -12);
    if (o.plate && kk > 0.01) {
      const w0 = Math.max(measure(g, label[0], size, 700), label[1] ? measure(g, label[1], sub, 500) : 0) + 36;
      g.save(); g.globalAlpha = clamp(kk * 1.5); g.fillStyle = 'rgba(11,11,14,0.82)'; g.beginPath();
      g.roundRect(right ? x - 18 : x - w0 + 18, to.y - size * 0.75, w0, size * 1.2 + (label[1] ? sub * 1.35 : 0), 12); g.fill(); g.restore();
    }
    txt(g, label[0], x, to.y + size * 0.35, size, 700, o.labelColor || INK, { k: kk, align: right ? 'left' : 'right', mono: o.mono });
    if (label[1]) txt(g, label[1], x, to.y + size * 0.35 + sub * 1.3, sub, 500, SOFT, { k: kk, align: right ? 'left' : 'right' });
  }
}

// an odometer: digits roll like a counter (each digit column slides), for years and paper counts
export function odometer(g, value, x, y, size, weight, o = {}) {
  const k = o.k ?? 1; if (k <= 0.01) return;
  const s = String(Math.floor(value)), frac = value - Math.floor(value);
  g.save(); g.font = `${weight} ${size}px "Inter"`; g.textBaseline = 'alphabetic'; g.globalAlpha = clamp(k * 1.5);
  try { g.letterSpacing = `${(o.track ?? -0.03) * size}px`; } catch (err) { /* */ }
  const dw = g.measureText('0').width * 0.94;
  let cx = o.align === 'right' ? x - dw * s.length : o.align === 'center' ? x - dw * s.length / 2 : x;
  g.beginPath(); g.rect(cx - 10, y - size * 0.95, dw * s.length + 20, size * 1.15); g.clip();
  if (o.grad) { const gr = g.createLinearGradient(0, y - size, 0, y); gr.addColorStop(0, o.grad[0]); gr.addColorStop(1, o.grad[1]); g.fillStyle = gr; } else g.fillStyle = o.color || INK;
  const next = String(Math.floor(value) + 1).padStart(s.length, '0');
  g.textAlign = 'center';
  for (let i = 0; i < s.length; i++) {
    // each digit centred in a fixed cell (tabular), rolling only if it changes on the way to the next value
    const roll = s[i] !== next[i] ? sm(frac) : 0;
    g.fillText(s[i], cx + dw / 2, y - roll * size * 1.05);
    if (roll > 0) g.fillText(next[i], cx + dw / 2, y + (1 - roll) * size * 1.05);
    cx += dw;
  }
  g.restore();
}

// ---- v10: the "warm nerds" voice ------------------------------------------------------------------------------
// big lines in Instrument Serif (roman for statements, italic for the aside), data in JetBrains Mono, the lab's own
// remarks handwritten (Caveat) in red pen with real ink marks, short notes on sticky notes made from a paper scan
export const PEN = '#c8352b', PENCIL = '#e8e2d6', NOTE = '#f6dc6e';
let PAPER_IMG = null;
export function setPaper(img) { PAPER_IMG = img; }
export function serif(g, s, x, y, size, o = {}) {
  const k = o.k ?? 1; if (k <= 0.004) return;
  g.save(); g.font = `${o.italic ? 'italic ' : ''}400 ${size}px "Instrument Serif"`; g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
  try { g.letterSpacing = `${(o.track ?? -0.01) * size}px`; } catch (e) { /* */ }
  const ee = eout5(k); g.globalAlpha = clamp(k * 1.6) * (o.alpha ?? 1);
  if (o.shadow !== false) { g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = size * 0.18; g.shadowOffsetY = size * 0.03; }
  if (o.grad) { const gr = g.createLinearGradient(0, y - size, 0, y); gr.addColorStop(0, o.grad[0]); gr.addColorStop(1, o.grad[1]); g.fillStyle = gr; } else g.fillStyle = o.color || INK;
  if (o.mask !== false) { g.beginPath(); g.rect(-50, y - size * 1.2, W + 100, size * 1.48); g.clip(); }
  g.fillText(s, x, y + (1 - ee) * size * 0.5);
  g.restore();
}
// handwriting that writes itself on, left to right, slightly rotated, a little wobble per line
export function hand(g, s, x, y, size, o = {}) {
  const k = o.k ?? 1; if (k <= 0.004) return;
  g.save(); g.translate(x, y); g.rotate(o.rot ?? -0.03);
  g.font = `${o.weight ?? 600} ${size}px "Caveat"`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const w = g.measureText(s).width, x0 = o.align === 'right' ? -w : o.align === 'center' ? -w / 2 : 0;
  g.beginPath(); g.rect(x0 - 10, -size * 1.3, (w + 20) * clamp(k * 1.15), size * 1.8); g.clip();
  if (o.halo !== false) { g.shadowColor = o.haloCol || 'rgba(0,0,0,0.6)'; g.shadowBlur = size * 0.22; }
  g.fillStyle = o.color || PEN; g.fillText(s, x0, 0);
  g.restore();
  return w;
}
// a real ink mark (an Image of ink on transparent), revealed left to right (or around, for a circle), at (x, y) centre
export function ink(g, img, x, y, w, o = {}) {
  const k = o.k ?? 1; if (!img || k <= 0.004) return;
  const h = w * img.height / img.width;
  g.save(); g.translate(x, y); g.rotate(o.rot ?? 0); if (o.flip) g.scale(-1, 1);
  if (o.alpha != null) g.globalAlpha = o.alpha;
  g.beginPath(); g.rect(-w / 2 - 4, -h / 2 - 4, (w + 8) * clamp(k * 1.1), h + 8); g.clip();
  if (o.tint) { g.filter = o.tint; }
  g.drawImage(img, -w / 2, -h / 2, w, h); g.restore();
}
// a sticky note slapped on the frame: paper-scan yellow, a soft curl shadow, handwriting
export function sticky(g, lines, x, y, w, o = {}) {
  const k = o.k ?? 1; if (k <= 0.004) return;
  const size = o.size ?? 44, h = o.h ?? (size * 1.15 * lines.length + size * 1.1);
  const s = 1 + (1 - eout5(clamp(k * 1.4))) * 0.35;
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(o.rot ?? -0.04); g.scale(s, s); g.globalAlpha = clamp(k * 2);
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 22; g.shadowOffsetY = 10;
  g.fillStyle = o.color || NOTE; g.fillRect(-w / 2, -h / 2, w, h);
  g.shadowColor = 'transparent';
  if (PAPER_IMG) { g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.5 * clamp(k * 2); g.drawImage(PAPER_IMG, 0, 0, 500, 500, -w / 2, -h / 2, w, h); g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(k * 2); }
  const cg = g.createLinearGradient(0, -h / 2, 0, h / 2); cg.addColorStop(0, 'rgba(0,0,0,0.10)'); cg.addColorStop(0.18, 'rgba(0,0,0,0)'); cg.addColorStop(0.85, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = cg; g.fillRect(-w / 2, -h / 2, w, h);
  g.font = `600 ${size}px "Caveat"`; g.fillStyle = o.ink || '#2a2622'; g.textBaseline = 'alphabetic';
  lines.forEach((l, i) => g.fillText(l, -w / 2 + size * 0.45, -h / 2 + size * 1.1 + i * size * 1.12));
  g.restore();
}
