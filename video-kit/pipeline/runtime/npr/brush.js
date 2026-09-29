// npr/brush.js - bridges between p5.brush and the 3D layer.
//   bakeBrushTexture(): paint a texture ONCE with p5.brush (seeded, fixed pixel size) -> THREE.CanvasTexture
//   track():            3D point -> design-space screen point (for ink / lettering that follows 3D objects)
//   callout():          figure-label layout (label box clamped to the safe area + leader start), shared by
//                       the ink layer and the letters layer
//   letter(), sfx():    comic lettering on a Canvas2D layer (Permanent Marker + ink drop shadow, pop-in)
//   leader(), burst():  boiling ink leader lines and comic burst balloons for a 'brush' layer
// letter/sfx/burst follow ClaudeAnimationBase src/core.js (MIT, (c) JohnHeibel): same pop/overshoot and
// ink-drop-shadow lettering idea, re-written for the pv runtime.
import { hashSeed } from '/pv/runtime/pv.js';

/**
 * Paint a texture with p5.brush into an offscreen p5.Framebuffer of a FIXED size (so 540p previews and
 * 1080p masters get the same texture), then hand it to three.js. Call from a layer init or setup, after
 * the p5 instance exists (the scene needs at least one 'brush' layer).
 *   draw(p, brush, w, h) paints with origin top-left in texture pixels.
 *   opts: { width=1024, height=1024, seed=1, key='tex', background=null|'#rrggbb', wrap=false }
 */
export async function bakeBrushTexture(THREE, opts, draw) {
  const { width = 1024, height = 1024, seed = 1, key = 'tex', background = null, wrap = false } = opts;
  const st = window.__pv, p = st && st.p5;
  if (!p) throw new Error('bakeBrushTexture needs the p5 instance: add a brush layer to the scene');
  let canvas = null, err = null, ran = false;
  // p5.brush maps y through the MAIN canvas aspect even inside a framebuffer (a 4096x1024 bake came out
  // squashed to 0.44x in y). So paint into a framebuffer with the main canvas's aspect that contains the
  // requested size, and crop the top-left width x height.
  const asp = p.width / p.height;
  let FW = width, FH = Math.round(width / asp);
  if (FH < height) { FH = height; FW = Math.round(height * asp); }
  const job = async () => {
    ran = true;
    let fb = null;
    try {
      fb = p.createFramebuffer({ width: FW, height: FH, density: 1, depth: false, antialias: false });
      fb.begin();
      p.clear();
      if (background) p.background(background);
      p.randomSeed(hashSeed(seed, 'bake', key));
      p.noiseSeed(hashSeed(seed, 'bakenoise', key));
      brush.load(fb);
      p.push();
      p.translate(-FW / 2, -FH / 2);
      await draw(p, brush, width, height);
      // p5.brush defers fills into a mask: a tiny off-canvas fill forces the composite into fb now
      brush.noStroke(); brush.noHatch(); brush.fill('#000000', 1); brush.fillBleed(0); brush.fillTexture(0, 0);
      brush.polygon([[-60, -60], [-50, -60], [-50, -50]]); brush.noFill();
      p.pop();
      fb.end();
      brush.load();
      const img = fb.get();
      canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const src = img.canvas || img.elt || img;
      canvas.getContext('2d').drawImage(src, 0, 0, width, height, 0, 0, width, height);
    } catch (e) { err = e; try { brush.load(); } catch (_) { /* ignore */ } }
    finally { if (fb && fb.remove) fb.remove(); }
  };
  // p5 ignores redraw() while it is still finishing a previous draw (e.g. right after boot), so retry
  // until the queued job has really run.
  for (let k = 0; k < 200 && !ran; k++) {
    st.brushQueue = job;
    await p.redraw();
    if (!ran) await new Promise((r) => setTimeout(r, 10));
  }
  if (st.brushQueue === job) st.brushQueue = null;
  if (!ran) throw new Error('bakeBrushTexture: p5 never ran the bake job');
  if (err) throw err;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  if (wrap) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
  tex.needsUpdate = true;
  tex.userData.canvas = canvas;
  return tex;
}

/** World point (THREE.Vector3) -> {x, y (design px), z (ndc), front (in front of camera), on (inside frame)}. */
export function track(ctx, v3, camera) {
  const cam = camera || ctx.camera;
  const s = ctx.project(v3, cam);
  const vc = v3.clone().applyMatrix4(cam.matrixWorldInverse);
  return { x: s.x, y: s.y, z: s.z, front: vc.z < 0, on: vc.z < 0 && s.x > -50 && s.x < ctx.DW + 50 && s.y > -50 && s.y < ctx.DH + 50 };
}

let _mc = null;
/**
 * Figure-label layout for a tracked 3D point (pure; call it from both the ink layer and the letters
 * layer so the leader and the label agree). The label box is clamped into the frame's safe area.
 *   anchor: {x, y} design px (from track())     o: { text, font (Canvas font string), dx, dy, margin=70 }
 * Returns { x, y, align, w, from: [x, y] } where `from` is the leader's start next to the label.
 */
export function callout(ctx, anchor, { text, font, dx = -290, dy = -178, margin = 70 } = {}) {
  _mc = _mc || document.createElement('canvas').getContext('2d');
  _mc.font = font;
  const w = _mc.measureText(text).width;
  const align = dx < 0 ? 'right' : 'left';
  let x = anchor.x + dx, y = anchor.y + dy;
  const x0 = align === 'right' ? x - w : x, x1 = align === 'right' ? x : x + w;
  if (x0 < margin) x += margin - x0;
  if (x1 > ctx.DW - margin) x -= x1 - (ctx.DW - margin);
  y = Math.max(margin + 40, Math.min(ctx.DH - margin, y));
  const from = align === 'right' ? [x + 12, y + 6] : [x + Math.min(40, w * 0.2), y + 14];
  return { x, y, align, w, from };
}

const backOut = (x) => { x = Math.max(0, Math.min(1, x)); const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };

/**
 * Comic lettering on a Canvas2D layer (design units): ink drop shadow + optional outline stroke.
 *   o: { pop (0..1 appear progress, overshoots), rot, alpha, font, stroke, ink (colour or false), align, jitter (boil rng) }
 */
export function letter(g, ctx, txt, x, y, size, color, o = {}) {
  const k = o.pop != null ? backOut(o.pop) : 1;
  if (k <= 0.01) return;
  const r = o.jitter || null;
  g.save();
  g.translate(x + (r ? r.gauss(0, 0.8) : 0), y + (r ? r.gauss(0, 0.8) : 0));
  g.rotate((o.rot || 0) + (r ? r.gauss(0, 0.008) : 0));
  g.scale(k, k);
  g.globalAlpha = o.alpha ?? 1;
  g.font = o.font || ctx.font('Permanent Marker', size, 400);
  g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = size * 0.16; g.strokeStyle = o.stroke; g.strokeText(txt, 0, 0); }
  if (o.ink !== false) { g.fillStyle = o.ink || '#231c33'; g.fillText(txt, size * 0.05, size * 0.06); }
  g.fillStyle = color; g.fillText(txt, 0, 0);
  g.restore();
}

/** Comic sound effect: pops in at age 0, wobbles, fades out by `life` seconds. */
export function sfx(g, ctx, txt, x, y, size, color, age, o = {}) {
  const life = o.life ?? 1.2;
  if (age < 0 || age > life) return;
  const fade = 1 - Math.max(0, Math.min(1, (age - (life - 0.25)) / 0.25));
  letter(g, ctx, txt, x, y, size, color, { pop: age * 5, rot: (o.rot ?? -0.08) + Math.sin(age * 20) * 0.03 * (1 - age / life), alpha: fade, ...o });
}

/**
 * Boiling ink leader from a label anchor to a tracked point, with a small tick/arrow head (brush layer).
 * from/to: [x, y] design px. o: { color, weight, brush='pen', bend=0.18, arrow=true, gap=10 }
 */
export function leader(brush, ctx, from, to, o = {}) {
  const r = ctx.boilRng('leader', o.key || 0);
  const [x0, y0] = from, dx = to[0] - x0, dy = to[1] - y0, L = Math.hypot(dx, dy) || 1;
  const gap = o.gap ?? 10, ux = dx / L, uy = dy / L;
  const x1 = to[0] - ux * gap, y1 = to[1] - uy * gap;
  const bend = (o.bend ?? 0.18) * L;
  const mx = (x0 + x1) / 2 - uy * bend + r.gauss(0, 1.2), my = (y0 + y1) / 2 + ux * bend + r.gauss(0, 1.2);
  brush.noFill(); brush.noHatch();
  brush.set(o.brush || 'pen', o.color || '#231c33', o.weight ?? 1.4);
  brush.spline([[x0 + r.gauss(0, 0.8), y0 + r.gauss(0, 0.8), 0.7], [mx, my, 1.1], [x1, y1, 0.8]], 0.55);
  if (o.arrow !== false) {
    const a = Math.atan2(y1 - my, x1 - mx), s = o.head ?? 16;
    for (const sg of [-1, 1]) brush.line(x1, y1, x1 - s * Math.cos(a + sg * 0.5) + r.gauss(0, 0.6), y1 - s * Math.sin(a + sg * 0.5) + r.gauss(0, 0.6));
  }
}

/** Comic burst balloon (spiky), painted with a flat wash + ink outline, boiling. */
export function burst(brush, ctx, cx, cy, rx, ry, o = {}) {
  const r = ctx.boilRng('burst', o.key || 0);
  const n = o.spikes ?? 14, pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + (o.rot || 0);
    const k = i % 2 ? (o.inner ?? 0.72) + r.gauss(0, 0.03) : 1 + r.gauss(0, 0.07);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  brush.noStroke(); brush.noHatch();
  brush.fill(o.fill || '#ffd84a', o.fillOp ?? 230); brush.fillBleed(0.04); brush.fillTexture(0.25, 0.3);
  brush.polygon(pts);
  brush.noFill();
  brush.set(o.brush || 'pen', o.ink || '#231c33', o.weight ?? 2.2);
  brush.beginShape(0); for (const p of pts) brush.vertex(p[0], p[1]); brush.endShape(true);
}
