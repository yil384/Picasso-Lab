/* ════════════════════════════════════════════════════════════════════════
   Transitions between the official blog and the Real Blogs (three.js)

   Official -> Real ("shatter"): a CLASSIFIED stamp slams onto the page, the page
   cracks into cubist facets (Voronoi cells, inked edges) that flip over in a wave
   from the stamp and land as the tabloid.
   Real -> Official ("crumple"): the tabloid is crumpled into a paper ball and
   tossed off-screen, uncovering the official blog underneath.

   Both run on a snapshot of what is on screen (eggSnapshot paints the live DOM
   into a canvas), so they start and end exactly on the real page at any size.
   three.js loads on intent (the first key press or tap), never for visitors who
   don't look for the egg. No WebGL / no three.js / reduced motion -> a paper wipe
   or an instant switch.
   ════════════════════════════════════════════════════════════════════════ */
const EGG_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
const EGG_FONT_CSS = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Playfair+Display:wght@800;900&display=swap';
let eggThreePromise = null;
let eggFontsPromise = null;

function eggFonts() {
  if (!eggFontsPromise) {
    eggFontsPromise = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = EGG_FONT_CSS;
      link.onload = () => {
        Promise.all(['800 20px "Playfair Display"', '900 40px "Playfair Display"',
          '500 12px "IBM Plex Mono"', '600 12px "IBM Plex Mono"'].map(f => document.fonts.load(f)))
          .then(resolve, resolve);
      };
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  }
  return eggFontsPromise;
}
function eggThree() {
  if (!eggThreePromise) eggThreePromise = import(EGG_THREE_URL).catch(() => null);
  return eggThreePromise;
}
function eggPreload() { eggFonts(); eggThree(); }
function eggWithin(promise, ms) {
  return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(undefined), ms))]);
}
function eggFrame() { return new Promise(resolve => requestAnimationFrame(() => resolve())); }
function eggWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (_) { return false; }
}
function eggViewport() {
  return { W: document.documentElement.clientWidth || innerWidth, H: document.documentElement.clientHeight || innerHeight };
}

/* ── snapshot: paint what is on screen into a canvas ─────────────────────── */
function eggSplitTop(str) {
  const out = []; let depth = 0; let cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function eggColorStops(parts, gradient) {
  parts.forEach((part, i) => {
    const m = part.match(/^(rgba?\([^)]*\)|#[0-9a-f]+|transparent)\s*(-?[\d.]+%)?/i);
    if (!m) return;
    const color = m[1] === 'transparent' ? 'rgba(0,0,0,0)' : m[1];
    const pos = m[2] ? parseFloat(m[2]) / 100 : (parts.length > 1 ? i / (parts.length - 1) : 0);
    try { gradient.addColorStop(Math.min(1, Math.max(0, pos)), color); } catch (_) {}
  });
}
function eggGradient(g, spec, x, y, w, h) {
  let m = spec.match(/^linear-gradient\((.*)\)$/);
  if (m) {
    const parts = eggSplitTop(m[1]);
    let angle = 180;
    if (/deg$/.test(parts[0])) angle = parseFloat(parts.shift());
    else if (/^to /.test(parts[0])) angle = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 }[parts.shift()] ?? 180;
    const a = angle * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
    const len = Math.abs(w * dx) + Math.abs(h * dy);
    const cx = x + w / 2, cy = y + h / 2;
    const gr = g.createLinearGradient(cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2);
    eggColorStops(parts, gr);
    return gr;
  }
  m = spec.match(/^radial-gradient\((.*)\)$/);
  if (m) {
    const parts = eggSplitTop(m[1]);
    if (!/^(rgb|#|transparent)/i.test(parts[0])) parts.shift();
    const cx = x + w / 2, cy = y + h / 2;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) / 2);
    eggColorStops(parts, gr);
    return gr;
  }
  return null;
}
function eggRoundRect(g, x, y, w, h, r) {
  g.beginPath();
  r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}
function eggVisible(color) {
  return color && color !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(color);
}

async function eggSnapshot() {
  const { W, H } = eggViewport();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const g = canvas.getContext('2d');
  const ops = [];
  const loads = [];
  const range = document.createRange();

  function loadImage(src) {
    const img = new Image();
    loads.push(new Promise(resolve => { img.onload = img.onerror = resolve; }));
    img.src = src;
    return img;
  }

  function paintBackground(cs, x, y, w, h, radius) {
    if (eggVisible(cs.backgroundColor)) {
      const color = cs.backgroundColor;
      ops.push(() => { g.fillStyle = color; eggRoundRect(g, x, y, w, h, radius); g.fill(); });
    }
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      eggSplitTop(cs.backgroundImage).reverse().forEach(layer => {
        const url = layer.match(/^url\("?(.*?)"?\)$/);
        if (url) {
          const img = loadImage(url[1]);
          ops.push(() => {
            if (!img.naturalWidth) return;
            const pattern = g.createPattern(img, 'repeat');
            if (!pattern) return;
            g.save(); eggRoundRect(g, x, y, w, h, radius); g.clip();
            g.translate(x, y); g.fillStyle = pattern; g.fillRect(0, 0, w, h);
            g.restore();
          });
        } else {
          ops.push(() => {
            const fill = eggGradient(g, layer, x, y, w, h);
            if (!fill) return;
            g.fillStyle = fill; eggRoundRect(g, x, y, w, h, radius); g.fill();
          });
        }
      });
    }
  }

  function paintBox(cs, r) {
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const shadow = cs.boxShadow;
    if (shadow && shadow !== 'none') {
      const first = eggSplitTop(shadow)[0];
      if (!/inset/.test(first)) {
        const color = (first.match(/rgba?\([^)]*\)/) || ['rgba(0,0,0,.2)'])[0];
        const [ox = 0, oy = 0, blur = 0, spread = 0] = (first.replace(/rgba?\([^)]*\)/, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
        ops.push(() => {
          g.save();
          if (blur < 0.5) {
            g.fillStyle = color;
            eggRoundRect(g, r.left + ox - spread, r.top + oy - spread, r.width + spread * 2, r.height + spread * 2, radius);
            g.fill();
          } else {
            g.shadowColor = color; g.shadowBlur = blur * dpr; g.shadowOffsetX = ox * dpr; g.shadowOffsetY = oy * dpr;
            g.fillStyle = eggVisible(cs.backgroundColor) ? cs.backgroundColor : '#fff';
            eggRoundRect(g, r.left - spread, r.top - spread, r.width + spread * 2, r.height + spread * 2, radius);
            g.fill();
          }
          g.restore();
        });
      }
    }
    paintBackground(cs, r.left, r.top, r.width, r.height, radius);
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map(s => [parseFloat(cs[`border${s}Width`]) || 0, cs[`border${s}Color`], cs[`border${s}Style`]]);
    if (!sides.some(([w, c, st]) => w > 0 && eggVisible(c) && st !== 'none')) return;
    const uniform = sides.every(([w, c, st]) => w === sides[0][0] && c === sides[0][1] && st === sides[0][2]);
    if (uniform) {
      const [w, c] = sides[0];
      ops.push(() => {
        g.strokeStyle = c; g.lineWidth = w;
        eggRoundRect(g, r.left + w / 2, r.top + w / 2, r.width - w, r.height - w, Math.max(0, radius - w / 2));
        g.stroke();
      });
    } else {
      ops.push(() => {
        const [[t, tc, ts], [rt, rc, rs], [b, bc, bs], [l, lc, ls]] = sides;
        if (t && ts !== 'none' && eggVisible(tc)) { g.fillStyle = tc; g.fillRect(r.left, r.top, r.width, t); }
        if (b && bs !== 'none' && eggVisible(bc)) { g.fillStyle = bc; g.fillRect(r.left, r.bottom - b, r.width, b); }
        if (l && ls !== 'none' && eggVisible(lc)) { g.fillStyle = lc; g.fillRect(r.left, r.top, l, r.height); }
        if (rt && rs !== 'none' && eggVisible(rc)) { g.fillStyle = rc; g.fillRect(r.right - rt, r.top, rt, r.height); }
      });
    }
  }

  function paintPseudo(el, which, r, cs) {
    const ps = getComputedStyle(el, which);
    if (!ps || ps.content === 'none' || ps.display === 'none' || ps.position !== 'absolute') return;
    const w = parseFloat(ps.width), h = parseFloat(ps.height);
    if (!(w > 0 && h > 0)) return;
    const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
    const x = ps.left !== 'auto' ? r.left + bl + parseFloat(ps.left) : r.right - (parseFloat(cs.borderRightWidth) || 0) - parseFloat(ps.right) - w;
    const y = ps.top !== 'auto' ? r.top + bt + parseFloat(ps.top) : r.bottom - (parseFloat(cs.borderBottomWidth) || 0) - parseFloat(ps.bottom) - h;
    paintBackground(ps, x, y, w, h, parseFloat(ps.borderTopLeftRadius) || 0);
  }

  function paintText(node, cs) {
    const text = node.nodeValue;
    if (!text || !/\S/.test(text)) return;
    const words = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) {
      range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      if (rects.length === 1) { words.push([m[0], rects[0]]); continue; }
      for (let i = 0; i < m[0].length; i++) {   // a word broken across lines
        range.setStart(node, m.index + i); range.setEnd(node, m.index + i + 1);
        const cr = range.getClientRects()[0];
        if (cr) words.push([m[0][i], cr]);
      }
    }
    if (!words.length) return;
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const color = cs.color;
    const transform = cs.textTransform;
    const spacing = cs.letterSpacing;
    ops.push(() => {
      g.font = font; g.fillStyle = color; g.textBaseline = 'alphabetic';
      if ('letterSpacing' in g) g.letterSpacing = spacing === 'normal' ? '0px' : spacing;
      const metrics = g.measureText('Hg');
      const ascent = metrics.fontBoundingBoxAscent;
      for (const [word, rc] of words) {
        if (rc.bottom < 0 || rc.top > H) continue;
        const s = transform === 'uppercase' ? word.toUpperCase() : transform === 'lowercase' ? word.toLowerCase() : word;
        g.fillText(s, rc.left, rc.top + (ascent || rc.height * 0.8));
      }
    });
  }

  function paintSvg(el, r) {
    const clone = el.cloneNode(true);
    const src = el.querySelectorAll('*');
    const dst = clone.querySelectorAll('*');
    // icons are styled from the page CSS (stroke: currentColor ...): carry the computed values over
    for (let i = 0; i < src.length; i++) {
      const s = getComputedStyle(src[i]);
      ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'].forEach(p => {
        const v = s.getPropertyValue(p);
        if (v) dst[i].setAttribute(p, v);
      });
    }
    const top = getComputedStyle(el);
    ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'].forEach(p => {
      const v = top.getPropertyValue(p);
      if (v && !clone.hasAttribute(p)) clone.setAttribute(p, v);
    });
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', r.width);
    clone.setAttribute('height', r.height);
    const img = loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone)));
    ops.push(() => { if (img.naturalWidth) g.drawImage(img, r.left, r.top, r.width, r.height); });
  }

  function walk(el) {
    if (el.nodeType !== 1) return;
    if (el.hasAttribute('data-nopaint') || /^(SCRIPT|STYLE|LINK|IFRAME|TEMPLATE|NOSCRIPT)$/.test(el.tagName)) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (cs.position === 'fixed') return;                 // overlays, hints, the article viewer
    const opacity = parseFloat(cs.opacity);
    if (opacity < 0.02) return;
    const r = el.getBoundingClientRect();
    const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
    if ((r.bottom < -60 || r.top > H + 60) && clips) return;
    ops.push(() => { g.save(); g.globalAlpha *= opacity; });
    paintBox(cs, r);
    if (clips) {
      const radius = parseFloat(cs.borderTopLeftRadius) || 0;
      ops.push(() => { eggRoundRect(g, r.left, r.top, r.width, r.height, radius); g.clip(); });
    }
    paintPseudo(el, '::before', r, cs);
    if (el instanceof SVGSVGElement) paintSvg(el, r);
    else if (el.tagName === 'IMG') {
      ops.push(() => { try { if (el.complete && el.naturalWidth) g.drawImage(el, r.left, r.top, r.width, r.height); } catch (_) {} });
    } else {
      for (const child of el.childNodes) {
        if (child.nodeType === 3) paintText(child, cs);
        else walk(child);
      }
    }
    paintPseudo(el, '::after', r, cs);
    ops.push(() => g.restore());
  }

  const bodyStyle = getComputedStyle(document.body);
  const htmlStyle = getComputedStyle(document.documentElement);
  ops.push(() => { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); });
  paintBackground(htmlStyle, 0, 0, W, H, 0);
  paintBackground(bodyStyle, 0, 0, W, H, 0);
  for (const child of document.body.childNodes) {
    if (child.nodeType === 3) paintText(child, bodyStyle);
    else walk(child);
  }
  await Promise.all(loads);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const op of ops) { try { op(); } catch (_) {} }
  return canvas;
}

/* ── shared three.js bits ─────────────────────────────────────────────────── */
function eggLayer(front) {
  const layer = document.createElement('div');
  layer.className = 'egg-fx';
  layer.setAttribute('data-nopaint', '');
  layer.setAttribute('aria-hidden', 'true');
  front.classList.add('egg-cover');
  layer.appendChild(front);                  // the snapshot covers the page while the DOM changes under it
  document.body.appendChild(layer);
  return layer;
}
function eggStage(THREE, layer, W, H, transparent) {
  const canvas = document.createElement('canvas');
  const fx = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  fx.width = Math.round(W * dpr); fx.height = Math.round(H * dpr);
  layer.insertBefore(canvas, layer.firstChild);
  layer.appendChild(fx);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  renderer.setClearColor(transparent ? 0x000000 : 0x17151c, transparent ? 0 : 1);
  const fov = 30;
  const dist = (H / 2) / Math.tan(fov * Math.PI / 360);
  const camera = new THREE.PerspectiveCamera(fov, W / H, 10, dist * 6);
  camera.position.set(0, 0, dist);
  const scene = new THREE.Scene();
  const g = fx.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { renderer, camera, scene, dist, canvas, fx, g, dpr };
}
function eggTexture(THREE, canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}
function eggStampCanvas(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 300;
  const g = c.getContext('2d');
  const red = '#d7263d';
  g.strokeStyle = red; g.fillStyle = red;
  g.lineWidth = 18; eggRoundRect(g, 20, 20, 984, 260, 28); g.stroke();
  g.lineWidth = 6; eggRoundRect(g, 48, 48, 928, 204, 14); g.stroke();
  g.font = '600 132px "IBM Plex Mono", "Courier New", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = '14px';
  g.fillText(text, 519, 156);
  // worn rubber: knock out specks and a few dry streaks
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1400; i++) {
    g.globalAlpha = Math.random() * 0.9;
    g.beginPath();
    g.arc(Math.random() * 1024, Math.random() * 300, Math.random() * Math.random() * 5 + 0.4, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 0.5; g.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const y = 40 + Math.random() * 220;
    g.beginPath(); g.moveTo(Math.random() * 300, y); g.lineTo(600 + Math.random() * 424, y + (Math.random() - 0.5) * 30); g.stroke();
  }
  return c;
}
function eggEase(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function eggClamp01(t) { return Math.max(0, Math.min(1, t)); }
function eggRun(duration, live, frame) {
  return new Promise(resolve => {
    const t0 = performance.now();
    function tick(now) {
      if (!live()) return resolve(false);
      const t = Math.min(duration, (now - t0) / 1000);
      frame(t);
      if (t >= duration) return resolve(true);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
function eggDispose(stage, layer, extras = []) {
  try {
    extras.forEach(x => x && x.dispose && x.dispose());
    stage && stage.scene.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose && o.material.dispose(); });
    stage && stage.renderer.dispose();
    stage && stage.renderer.forceContextLoss();
  } catch (_) {}
  layer && layer.remove();
}
/* comic focus lines around a point (redrawn "on twos") */
function eggFocusLines(g, W, H, cx, cy, strength, frameNo) {
  if (strength <= 0) return;
  const seed = Math.floor(frameNo / 2);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const n = W < 600 ? 44 : 64;
  const inner = Math.min(W, H) * (0.2 + 0.05 * (1 - strength));
  const outer = Math.hypot(W, H);
  g.fillStyle = `rgba(27,26,31,${0.85 * strength})`;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.08;
    const w = (0.004 + rnd() * 0.012) * Math.PI;
    const r0 = inner * (0.9 + rnd() * 0.5);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    g.lineTo(cx + Math.cos(a - w) * outer, cy + Math.sin(a - w) * outer);
    g.lineTo(cx + Math.cos(a + w) * outer, cy + Math.sin(a + w) * outer);
    g.closePath();
    g.fill();
  }
}

/* ── official -> Real Blogs: stamp, crack, cubist flip ────────────────────── */
const EGG_SHARD_VERT = `
  attribute vec3 aCenter;
  attribute float aEdge;
  attribute vec4 aParam;          // delay, flip axis angle, lift, spin
  uniform float uTime;
  uniform float uDur;
  varying vec2 vUv;
  varying float vEdge;
  varying float vFacing;
  vec3 rotAxis(vec3 v, vec3 a, float ang) {
    float c = cos(ang), s = sin(ang);
    return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c);
  }
  void main() {
    float p = clamp((uTime - aParam.x) / uDur, 0.0, 1.0);
    float e = p < 0.5 ? 4.0 * p * p * p : 1.0 - pow(-2.0 * p + 2.0, 3.0) / 2.0;
    vec3 ax = vec3(cos(aParam.y), sin(aParam.y), 0.0);
    vec3 o = position;
    // after a half turn about an in-plane axis a shard is its own mirror image; morph to the mirror
    // while it is edge-on, so it lands exactly on its own cell
    vec3 m = 2.0 * dot(o, ax) * ax - o;
    vec3 lp = mix(o, m, smoothstep(0.42, 0.58, e));
    float ang = 3.14159265 * e;
    vec3 wp = rotAxis(lp, ax, ang);
    vec3 n = rotAxis(vec3(0.0, 0.0, 1.0), ax, ang);
    float sp = aParam.w * sin(3.14159265 * e);
    float cs = cos(sp), sn = sin(sp);
    wp.xy = mat2(cs, sn, -sn, cs) * wp.xy;
    n.xy = mat2(cs, sn, -sn, cs) * n.xy;
    wp += aCenter + vec3(0.0, 0.0, aParam.z * sin(3.14159265 * e));
    vUv = uv;
    vEdge = aEdge;
    vFacing = abs(n.z);
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }`;
const EGG_SHARD_FRAG = `
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform float uInk;
  uniform float uImpact;
  uniform float uDpr;
  varying vec2 vUv;
  varying float vEdge;
  varying float vFacing;
  void main() {
    vec4 c = gl_FrontFacing ? texture2D(uFront, vUv) : texture2D(uBack, vUv);
    vec3 ink = vec3(0.106, 0.102, 0.122);
    // turned away from the light: toon step + halftone dots
    float dark = 1.0 - smoothstep(0.25, 0.97, vFacing);
    vec2 gp = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / (5.0 * uDpr);
    float d = length(fract(gp) - 0.5);
    float dots = 1.0 - smoothstep(dark * 0.62 - 0.06, dark * 0.62, d);
    vec3 col = c.rgb * (1.0 - 0.18 * step(0.35, dark));
    col = mix(col, ink, dots * 0.7 * step(0.02, dark));
    // inked cell edges
    float w = fwidth(vEdge);
    float edge = 1.0 - smoothstep(w * 1.2, w * 2.6, vEdge);
    col = mix(col, ink, edge * uInk);
    // impact frame: posterised and inverted for a couple of frames
    if (uImpact > 0.5) {
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(0.97, 0.94, 0.86), ink, step(0.6, l));
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

async function eggShatter(THREE, front, back, layer, live) {
  const { W, H } = eggViewport();
  const stage = eggStage(THREE, layer, W, H, false);
  const { renderer, camera, scene, dist, g } = stage;
  const small = Math.min(W, H);

  // impact: on the masthead, where the stamp lands
  const hero = document.querySelector('.blog-hero h1');
  const hr = hero ? hero.getBoundingClientRect() : null;
  const ix = W / 2;
  const iy = Math.min(H * 0.42, Math.max(90, hr ? hr.top + hr.height / 2 : H * 0.25));

  // front + a copy with the stamp already inked on it (swapped in at the hit)
  const stamp = eggStampCanvas('CLASSIFIED');
  const stampW = Math.min(W * 0.8, 560);
  const stampH = stampW * stamp.height / stamp.width;
  const inked = document.createElement('canvas');
  inked.width = front.width; inked.height = front.height;
  const ig = inked.getContext('2d');
  ig.drawImage(front, 0, 0);
  ig.save();
  ig.scale(front.width / W, front.height / H);
  ig.translate(ix, iy); ig.rotate(-8 * Math.PI / 180);
  ig.globalAlpha = 0.92; ig.globalCompositeOperation = 'multiply';
  ig.drawImage(stamp, -stampW / 2, -stampH / 2, stampW, stampH);
  ig.restore();

  const texFront = eggTexture(THREE, front);
  const texInked = eggTexture(THREE, inked);
  const texBack = eggTexture(THREE, back);
  const texStamp = eggTexture(THREE, stamp);

  // cubist cells: denser around the hit
  const count = Math.max(38, Math.min(110, Math.round(W * H / 7200)));
  const sites = [];
  for (let i = 0; i < count; i++) {
    if (i < count * 0.42) {
      const a = Math.random() * Math.PI * 2, r = Math.abs((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * small * 0.55;
      sites.push([Math.min(W - 1, Math.max(1, ix + Math.cos(a) * r)), Math.min(H - 1, Math.max(1, iy + Math.sin(a) * r * 0.8))]);
    } else sites.push([Math.random() * W, Math.random() * H]);
  }
  const clip = (poly, mx, my, nx, ny) => {
    const out = [];
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const da = (a[0] - mx) * nx + (a[1] - my) * ny, db = (b[0] - mx) * nx + (b[1] - my) * ny;
      if (da <= 0) out.push(a);
      if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  };
  const pos = [], cen = [], uvs = [], edge = [], par = [];
  const maxD = Math.hypot(Math.max(ix, W - ix), Math.max(iy, H - iy));
  const T_HIT = 0.22;
  sites.forEach((s, i) => {
    let poly = [[0, 0], [W, 0], [W, H], [0, H]];
    for (let j = 0; j < sites.length && poly.length >= 3; j++) {
      if (j === i) continue;
      const o = sites[j];
      poly = clip(poly, (s[0] + o[0]) / 2, (s[1] + o[1]) / 2, o[0] - s[0], o[1] - s[1]);
    }
    if (poly.length < 3) return;
    let A = 0, cx = 0, cy = 0;
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length], cr = a[0] * b[1] - b[0] * a[1];
      A += cr; cx += (a[0] + b[0]) * cr; cy += (a[1] + b[1]) * cr;
    }
    if (Math.abs(A) < 1) return;
    cx /= 3 * A; cy /= 3 * A;
    const d = Math.hypot(cx - ix, cy - iy) / maxD;
    const dir = Math.atan2(-(cy - iy), cx - ix);                     // world space (y up)
    const axis = dir + Math.PI / 2 + (Math.random() - 0.5) * 0.7;    // flip away from the hit
    const delay = T_HIT + 0.05 + d * 0.42 + Math.random() * 0.07;
    const lift = (70 + Math.random() * 120) * (small / 800 + 0.35);
    const spin = (Math.random() - 0.5) * 0.7;
    const wc = [cx - W / 2, H / 2 - cy, 0];
    for (let k = 0; k < poly.length; k++) {
      const tri = [[cx, cy, 1], [poly[k][0], poly[k][1], 0], [poly[(k + 1) % poly.length][0], poly[(k + 1) % poly.length][1], 0]];
      // keep the triangle counter-clockwise in world space so its front faces the camera
      if (A > 0) tri.reverse();
      for (const [px, py, e] of tri) {
        pos.push(px - cx, -(py - cy), 0);
        cen.push(...wc);
        uvs.push(px / W, 1 - py / H);
        edge.push(e);
        par.push(delay, axis, lift, spin);
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aCenter', new THREE.Float32BufferAttribute(cen, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  geo.setAttribute('aParam', new THREE.Float32BufferAttribute(par, 4));
  const DUR = 0.62;
  const mat = new THREE.ShaderMaterial({
    vertexShader: EGG_SHARD_VERT,
    fragmentShader: EGG_SHARD_FRAG,
    side: THREE.DoubleSide,
    extensions: { derivatives: true },
    uniforms: {
      uTime: { value: 0 }, uDur: { value: DUR },
      uFront: { value: texFront }, uBack: { value: texBack },
      uInk: { value: 0 }, uImpact: { value: 0 }, uDpr: { value: stage.dpr }
    }
  });
  const shards = new THREE.Mesh(geo, mat);
  shards.frustumCulled = false;
  scene.add(shards);

  const stampMesh = new THREE.Mesh(new THREE.PlaneGeometry(stampW, stampH),
    new THREE.MeshBasicMaterial({ map: texStamp, transparent: true, depthTest: false, opacity: 0 }));
  stampMesh.position.set(ix - W / 2, H / 2 - iy, dist * 0.8);
  stampMesh.rotation.z = -8 * Math.PI / 180;
  stampMesh.renderOrder = 2;
  scene.add(stampMesh);

  const lastLand = Math.max(...par.filter((_, i) => i % 4 === 0)) + DUR;
  const END = lastLand + 0.06;
  [texFront, texInked, texBack, texStamp].forEach(t => renderer.initTexture(t));
  renderer.render(scene, camera);
  layer.querySelector('.egg-cover')?.remove();

  let frameNo = 0;
  const ok = await eggRun(END, live, (t) => {
    frameNo++;
    mat.uniforms.uTime.value = t;
    // the stamp drops in from above the page and hits at T_HIT
    const s = eggClamp01(t / T_HIT);
    stampMesh.material.opacity = t < T_HIT ? Math.min(1, s * 3) : 0;
    stampMesh.position.z = 1 + (1 - s * s) * dist * 0.8;
    stampMesh.visible = t < T_HIT;
    mat.uniforms.uFront.value = t < T_HIT ? texFront : texInked;
    mat.uniforms.uImpact.value = t >= T_HIT && t < T_HIT + 0.05 ? 1 : 0;
    mat.uniforms.uInk.value = eggClamp01((t - T_HIT) / 0.1) * (1 - eggClamp01((t - (END - 0.3)) / 0.26));
    // camera: shake at the hit, a slow push and a dutch tilt through the flip, back to rest at the end
    const k = Math.sin(Math.PI * eggClamp01((t - T_HIT) / (END - T_HIT)));
    const shake = t > T_HIT ? Math.exp(-(t - T_HIT) * 14) * small * 0.012 : 0;
    camera.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, dist * (1 - 0.05 * k));
    camera.rotation.z = -0.035 * k;
    renderer.render(scene, camera);
    g.clearRect(0, 0, W, H);
    eggFocusLines(g, W, H, ix, iy, t >= T_HIT ? 1 - eggClamp01((t - T_HIT) / 0.32) : 0, frameNo);
  });
  if (ok) {
    stage.canvas.classList.add('egg-fade');
    stage.canvas.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  eggDispose(stage, layer, [texFront, texInked, texBack, texStamp]);
}

/* ── Real Blogs -> official: crumple into a ball, toss it away ───────────── */
const EGG_PAPER_VERT = `
  uniform float uC;
  uniform vec3 uG;
  uniform vec3 uBall;
  uniform float uR;
  uniform float uRmax;
  uniform float uSpin;
  uniform float uLift;
  varying vec2 vUv;
  varying vec3 vW;
  varying float vC;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    vec3 p0 = position;
    vec2 d = p0.xy - uG.xy;
    float rn = clamp(length(d) / uRmax, 0.0, 1.0);
    float c = clamp(uC * 1.4 - rn * 0.4, 0.0, 1.0);       // the middle goes first, the edges follow
    c = c * c * (3.0 - 2.0 * c);
    float n1 = vnoise(p0.xy * 0.02) - 0.5;
    float n2 = vnoise(p0.xy * 0.047 + 7.0) - 0.5;
    float th = 3.14159 * rn * 0.97 + n1 * 0.7 * c;
    float ph = atan(d.y, d.x) + n2 * 0.9 * c;
    vec3 s = vec3(sin(th) * cos(ph), sin(th) * sin(ph), cos(th));
    float cs = cos(uSpin), sn = sin(uSpin);
    s = vec3(cs * s.x - sn * s.z, s.y, sn * s.x + cs * s.z);
    float c2 = cos(uSpin * 0.6), s2 = sin(uSpin * 0.6);
    s.xy = mat2(c2, s2, -s2, c2) * s.xy;
    vec3 ball = uBall + s * uR * (1.0 + 0.3 * n1 + 0.16 * n2);
    vec3 flat = p0 + vec3(0.0, 0.0, uLift * (1.0 - rn));
    vec3 wp = mix(flat, ball, c);
    wp.z += sin(3.14159 * c) * (n1 * 110.0 + n2 * 60.0) * (1.0 - rn * 0.4);
    vUv = uv;
    vW = wp;
    vC = c;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }`;
const EGG_PAPER_FRAG = `
  uniform sampler2D uTex;
  uniform float uDpr;
  varying vec2 vUv;
  varying vec3 vW;
  varying float vC;
  void main() {
    vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
    if (n.z < 0.0) n = -n;
    vec3 L = normalize(vec3(-0.45, 0.55, 0.72));
    float lit = dot(n, L) / 0.72;                          // 1 on the flat sheet
    vec3 ink = vec3(0.106, 0.102, 0.122);
    vec3 paper = gl_FrontFacing ? texture2D(uTex, vUv).rgb : vec3(0.95, 0.92, 0.85);
    float band = lit > 0.92 ? 1.0 : lit > 0.62 ? 0.87 : 0.72;
    vec3 col = paper * mix(1.0, band, smoothstep(0.0, 0.08, vC));
    float dark = (1.0 - smoothstep(0.45, 0.95, lit)) * smoothstep(0.0, 0.1, vC);
    vec2 gp = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / (4.5 * uDpr);
    float dots = 1.0 - smoothstep(dark * 0.6 - 0.05, dark * 0.6, length(fract(gp) - 0.5));
    col = mix(col, ink, dots * 0.6 * step(0.02, dark));
    float crease = length(fwidth(n));
    col = mix(col, ink, smoothstep(0.5, 1.1, crease) * 0.85 * smoothstep(0.05, 0.25, vC));
    gl_FragColor = vec4(col, 1.0);
  }`;

async function eggCrumple(THREE, front, layer, live) {
  const { W, H } = eggViewport();
  const stage = eggStage(THREE, layer, W, H, true);
  const { renderer, camera, scene, g } = stage;
  const small = Math.min(W, H);
  const tex = eggTexture(THREE, front);
  const sx = Math.max(24, Math.min(72, Math.round(W / 14)));
  const sy = Math.max(24, Math.min(110, Math.round(H / 14)));
  const geo = new THREE.PlaneGeometry(W, H, sx, sy);
  const G = new THREE.Vector3(W * 0.08, -H * 0.04, 0);   // grab point, a little right of centre
  const R = Math.max(40, Math.min(100, small * 0.12));
  const exit = new THREE.Vector3(-W / 2 - R * 3, H / 2 + R * 2.2, 60);
  const mat = new THREE.ShaderMaterial({
    vertexShader: EGG_PAPER_VERT,
    fragmentShader: EGG_PAPER_FRAG,
    side: THREE.DoubleSide,
    extensions: { derivatives: true },
    uniforms: {
      uC: { value: 0 }, uG: { value: G }, uBall: { value: G.clone() }, uR: { value: R },
      uRmax: { value: Math.hypot(W / 2 + Math.abs(G.x), H / 2 + Math.abs(G.y)) },
      uSpin: { value: 0 }, uLift: { value: 0 }, uTex: { value: tex }, uDpr: { value: stage.dpr }
    }
  });
  const paper = new THREE.Mesh(geo, mat);
  paper.frustumCulled = false;
  scene.add(paper);
  renderer.initTexture(tex);
  renderer.render(scene, camera);
  layer.querySelector('.egg-cover')?.remove();

  const END = 1.12;
  const toScreen = (v) => [v.x + W / 2, H / 2 - v.y];
  let frameNo = 0;
  await eggRun(END, live, (t) => {
    frameNo++;
    const lift = eggClamp01(t / 0.14);
    mat.uniforms.uLift.value = 36 * Math.sin(lift * Math.PI / 2);
    const c = eggEase(eggClamp01((t - 0.08) / 0.56));
    mat.uniforms.uC.value = c;
    const toss = eggClamp01((t - 0.56) / 0.52);
    const k = toss * toss * (3 - 2 * toss);
    const ball = new THREE.Vector3().lerpVectors(G, exit, k);
    ball.y += Math.sin(Math.PI * k) * H * 0.16;
    ball.z = 40 + Math.sin(Math.PI * Math.min(1, k * 1.2)) * 140;
    mat.uniforms.uBall.value.copy(ball);
    mat.uniforms.uSpin.value = c * 1.2 + toss * toss * 9;
    renderer.render(scene, camera);
    // soft shadow of the ball on the page, and a whoosh behind it
    g.clearRect(0, 0, W, H);
    if (c > 0.2) {
      const [bx, by] = toScreen(ball);
      const hgt = eggClamp01((ball.z - 30) / 160);
      g.save();
      g.globalAlpha = 0.28 * (1 - hgt * 0.6) * eggClamp01((c - 0.2) / 0.3);
      g.fillStyle = '#0b1b2a';
      g.beginPath();
      g.ellipse(bx + R * (0.25 + hgt * 0.8), by + R * (0.9 + hgt * 1.4), R * (1.05 + hgt * 0.3), R * 0.34, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    if (toss > 0.05 && toss < 0.95) {
      const trail = [];
      for (let i = 0; i < 8; i++) {
        const kk = Math.max(0, k - i * 0.035);
        const p = new THREE.Vector3().lerpVectors(G, exit, kk);
        p.y += Math.sin(Math.PI * kk) * H * 0.16;
        trail.push(toScreen(p));
      }
      g.save();
      g.strokeStyle = '#1b1a1f'; g.lineCap = 'round';
      [-0.55, 0, 0.55].forEach((off, j) => {
        g.globalAlpha = 0.55 - j * 0.1;
        g.lineWidth = 2.4;
        g.beginPath();
        trail.forEach(([x, y], i) => {
          const o = off * R * (1 - i / trail.length);
          if (i === 0) g.moveTo(x + o, y + o); else g.lineTo(x + o, y + o);
        });
        g.stroke();
      });
      g.restore();
    }
  });
  eggDispose(stage, layer, [tex]);
}

/* no WebGL: a paper-coloured iris wipe */
async function eggWipe(toTrue, live) {
  const wipe = document.createElement('div');
  wipe.className = 'egg-wipe' + (toTrue ? '' : ' official');
  wipe.setAttribute('data-nopaint', '');
  document.body.appendChild(wipe);
  await eggFrame(); await eggFrame();
  wipe.classList.add('cover');
  await new Promise(resolve => setTimeout(resolve, 440));
  if (live()) {
    if (toTrue) renderTrueBlogs(); else renderOfficialBlogs();
    window.scrollTo(0, 0);
  }
  wipe.style.transition = 'opacity .3s ease';
  wipe.style.opacity = '0';
  await new Promise(resolve => setTimeout(resolve, 320));
  wipe.remove();
}
