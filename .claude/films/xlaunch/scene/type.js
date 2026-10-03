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
