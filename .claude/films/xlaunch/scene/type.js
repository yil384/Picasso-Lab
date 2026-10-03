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
export function measure(g, s, size, weight, mono) { g.save(); g.font = `${weight} ${size}px "${mono ? 'JetBrains Mono' : 'Inter'}"`; const w = g.measureText(s).width; g.restore(); return w; }

export function scrim(g, y0, y1, a) {
  if (a <= 0.005) return;
  const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(11,11,14,0)'); gr.addColorStop(1, `rgba(11,11,14,${a})`);
  g.fillStyle = gr; g.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
}

// the running header: PICASSO LAB on the left, the chapter on the right ("01  ORIGIN"), a hairline between
export function header(g, chapter, k = 1, kc = 1) {
  txt(g, 'PICASSO LAB', M, 96, 20, 600, MUTE, { track: 0.32, k, noblur: true });
  if (chapter && kc > 0.01) {
    txt(g, chapter[0], W - M - measure(g, chapter[1], 18, 500, true) - 22, 96, 18, 700, INK, { mono: true, track: 0.05, k: kc, align: 'right', noblur: true });
    txt(g, chapter[1], W - M, 96, 18, 500, MUTE, { mono: true, track: 0.12, k: kc, align: 'right', noblur: true });
  }
}

// a leader line from a 3D anchor (projected) to a label; the line draws itself, then the label rises
export function leader(g, from, to, k, label, o = {}) {
  if (k <= 0.01 || !from) return;
  const e = eout(clamp(k * 1.6));
  g.save(); g.strokeStyle = o.color || 'rgba(245,245,247,0.55)'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(from.x, from.y, 4, 0, Math.PI * 2); g.fillStyle = o.dot || '#f5f5f7'; g.globalAlpha = clamp(k * 3); g.fill();
  g.beginPath(); g.moveTo(from.x, from.y);
  const mx = from.x + (to.x - from.x) * e, my = from.y + (to.y - from.y) * e; g.lineTo(mx, my);
  if (o.tail) g.lineTo(mx + o.tail * e, my);
  g.stroke(); g.restore();
  if (label) {
    const kk = clamp((k - 0.35) / 0.65);
    const right = o.align !== 'right', x = to.x + (o.tail || 0) + (right ? 10 : -10);
    txt(g, label[0], x, to.y - 8, o.size || 26, 700, o.labelColor || INK, { k: kk, align: right ? 'left' : 'right', mono: o.mono });
    if (label[1]) txt(g, label[1], x, to.y + 22, (o.size || 26) * 0.66, 500, MUTE, { k: kk, align: right ? 'left' : 'right', mono: true, track: 0.04 });
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
