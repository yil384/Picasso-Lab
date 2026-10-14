// src/hud-b.js - the stream's HUD, concept B "Speedrun broadcast" (the owner's pick, 2026-10-13; its mock-up
// ui-art/hud-b/index.html, ?state= ?t=). The game is a speedrun on air and Muse its runner. Over the video, in
// Minecraft's own grammar: each command a toast (it slides in, holds 5 to 9 s by the length of its why, then its icon
// flies home into the HUD), what the bot gains floats up over it ("+1 obsidian"), Muse's rules firing show in the action
// bar over the hotbar (Muse's rules stand there between times), and a /title banner says a new goal, a split or a death.
// Under the video a broadcast package: the top bar (health, food, time of day, who acted: MUSE | RULE | BOT, calls, the
// game clock), the command bar (where the toast lands), the goal as 12 LiveSplit splits, 3 "who did what" rows (STUCK
// and TIME advice pinned first, red and amber) and 3 RAW lines.
//
// What moves is only ever a pre-rendered canvas moved or faded (drawImage with globalAlpha). The HUD under it (and the
// hotbar) is drawn again only when what it shows changes, its clocks once a second; compose() says when the picture
// changed, so src/ui-panel.js writes a frame only then. Every toast, banner, floater and action-bar line is told to
// o.emit with its times, for the recording's hud.jsonl (the film can be drawn again from it).

let g = null; // the 2D context drawn into
let st = null; // the HUD state (src/ui-panel.js hudState()) being drawn
let MK = null; // (w, h) -> a canvas
let ICON = () => null; // (name, size) -> the icon pre-scaled to size, or null
let HAS = () => false; // (name) -> an icon by that name exists
let WHO_WORD = 'Muse'; // the caller in words, its chip's code, its possessive
let WHO_CODE = 'MUSE';
let WHO_POS = 'Muse’s';
let QA = null; // when set: every text drawn, with its box

/* ---------- tokens ---------- */
const C = {
  hud: '#0a0d12', bar: '#0f131b', plate: '#0b0e14', tile: '#161b26', track: '#262d3b', rim: 'rgba(255,255,255,0.10)',
  hair: 'rgba(255,255,255,0.08)',
  t1: '#f3f5f9', t2: '#c9d1df', soft: '#aeb6c6', raw: '#8d97ab', dim: '#6b7488',
  muse: '#b0a4ff', museType: '#b9adff', rule: '#ffb547', bot: '#a3acbb', ok: '#5fd09c', fail: '#ff8a7a', hint: '#6fd3c8',
  gold: '#ffd164', ink: '#0b0e14',
};
const ACTOR = { RULE: C.rule, RULES: C.rule, BOT: C.bot, SRV: C.ok, HINT: C.hint, NO: C.fail, STUCK: C.fail, TIME: C.rule };
const actor = (code) => ACTOR[code] ?? C.muse; // the caller's own code (MUSE, TEST, a client's name): Muse's violet
const UI = (w, s) => `${w} ${s}px MuseUI`;
const MONO = (w, s) => `${w} ${s}px MuseMono`;
const FPS = 30;

/* ---------- small maths ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const outQuint = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 5);
const inOut = (x) => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const mmss = (s) => { s = Math.max(0, Math.floor((Number(s) || 0) + 1e-6)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const durTxt = (s) => (s == null || !Number.isFinite(s) ? '' : s < 1 ? `${s.toFixed(1)} s` : s < 60 ? `${Math.round(s)} s` : mmss(s));
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lc1 = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);

/* ---------- canvas primitives ---------- */
function mk(w, h) { return MK(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h))); }
function rr(x, y, w, h, r, ctx = g) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fillRR(x, y, w, h, r, c, ctx = g) { rr(x, y, w, h, r, ctx); ctx.fillStyle = c; ctx.fill(); }
function strokeRR(x, y, w, h, r, c, lw = 1, ctx = g) { rr(x + lw / 2, y + lw / 2, w - lw, h - lw, Math.max(0, r - lw / 2), ctx); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.stroke(); }
function rect(x, y, w, h, c, ctx = g) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function plate(x, y, w, h, r = 10, ctx = g, a = 0.88) { ctx.save(); ctx.globalAlpha *= a; fillRR(x, y, w, h, r, C.plate, ctx); ctx.restore(); strokeRR(x, y, w, h, r, C.rim, 1, ctx); }
// widths measured once per font and text (node-canvas measures slowly)
const MEMO = new Map();
function W(s, font, ctx = g) {
  let m = MEMO.get(font);
  if (!m) { m = new Map(); MEMO.set(font, m); }
  let w = m.get(s);
  if (w === undefined) { if (m.size > 20_000) m.clear(); ctx.font = font; w = ctx.measureText(s).width; m.set(s, w); }
  return w;
}
const sizeOf = (font) => parseFloat(String(font).split(' ')[1]) || 16;
function qaRec(s, x, y, w, size, align, ctx) {
  if (!QA || ctx !== g || !s || !String(s).trim()) return;
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const dx = m ? m.e : 0, dy = m ? m.f : 0;
  QA.push({ s: String(s), x0: x0 + dx, x1: x0 + w + dx, y0: y - size * 0.76 + dy, y1: y + size * 0.24 + dy });
}
function T(s, x, y, font, color, align = 'left', ctx = g) {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y);
  const w = W(s, font, ctx);
  qaRec(s, x, y, w, sizeOf(font), align, ctx);
  return w;
}
// text with a dark stroke, for words straight on the video (floaters, the action bar)
function TS(s, x, y, font, color, align = 'left', ctx = g, sw = 3) {
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  ctx.lineWidth = sw * 2; ctx.strokeStyle = 'rgba(6,8,12,0.94)'; ctx.strokeText(s, x, y); ctx.fillStyle = color; ctx.fillText(s, x, y);
  return W(s, font, ctx);
}
// spaced capitals (node-canvas has no letter-spacing): one glyph at a time, +0.1 em
function capsW(s, size, wt = 600, ctx = g) { const f = UI(wt, size); let w = 0; for (const ch of String(s).toUpperCase()) w += W(ch, f, ctx) + size * 0.1; return w - size * 0.1; }
function CAPS(s, x, y, size, color, wt = 600, ctx = g, align = 'left') {
  const w = capsW(s, size, wt, ctx); let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  const f = UI(wt, size);
  ctx.font = f; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (const ch of String(s).toUpperCase()) { ctx.fillText(ch, cx, y); cx += W(ch, f, ctx) + size * 0.1; }
  qaRec(s, align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y, w, size, 'left', ctx);
  return w;
}
// icons pre-scaled once per size, drawn 1:1
function icon(name, x, y, s, a = 1, ctx = g) {
  const im = ICON(name, Math.round(s)) ?? ICON('compass', Math.round(s)); if (!im) return;
  if (a === 1) { ctx.drawImage(im, Math.round(x), Math.round(y)); return; }
  ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(im, Math.round(x), Math.round(y)); ctx.restore();
}
function tick(x, y, s, c, lw = 2.6, ctx = g) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.55); ctx.lineTo(x + s * 0.36, y + s * 0.88); ctx.lineTo(x + s, y + s * 0.12); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
function xmark(x, y, s, c, lw = 2.6, ctx = g) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y); ctx.lineTo(x, y + s); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke(); }
function dot(cx, cy, r, c, hollow = false, ctx = g) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); if (hollow) { ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.stroke(); } else { ctx.fillStyle = c; ctx.fill(); } }
// actor chip: spaced caps on a solid actor colour (the only solid fills in the HUD); a long code gets smaller type
function chip(code, x, y, w, h, color, solid = true, ctx = g, size = 14) {
  while (size > 9 && capsW(code, size, 700, ctx) > w - 8) size -= 1;
  if (solid) fillRR(x, y, w, h, 4, color, ctx); else strokeRR(x, y, w, h, 4, color, 1.5, ctx);
  CAPS(code, x + w / 2, y + h / 2 + size * 0.36, size, solid ? C.ink : color, 700, ctx, 'center');
}
// cut at a word, add an ellipsis; never wider than maxW
function fit(s, maxW, font, ctx = g) {
  if (!s) return '';
  if (W(s, font, ctx) <= maxW) return s;
  const words = s.split(' ');
  while (words.length > 1) { words.pop(); const t = words.join(' ').replace(/[\s,;:.\-]+$/, '') + '…'; if (W(t, font, ctx) <= maxW) return t; }
  let t = s; while (t.length > 1 && W(t + '…', font, ctx) > maxW) t = t.slice(0, -1); return t + '…';
}

/* ---------- Muse's words: item names get their painted icon and gold ---------- */
const ITEM_WORDS = [
  ['diamond pickaxe', 'diamond_pickaxe'], ['iron pickaxe', 'iron_pickaxe'], ['stone pickaxe', 'stone_pickaxe'], ['wooden pickaxe', 'wooden_pickaxe'],
  ['water bucket', 'water_bucket'], ['lava bucket', 'lava_bucket'], ['flint and steel', 'flint_and_steel'], ['ender pearl', 'ender_pearl'], ['obsidian', 'obsidian'],
  ['diamonds', 'diamond'], ['diamond', 'diamond'], ['cobblestone', 'cobblestone'], ['bread', 'bread'], ['coal', 'coal'], ['logs', 'log'],
  ['raw iron', 'raw_iron'], ['iron', 'iron_ingot'], ['pickaxe', 'pickaxe'], ['shield', 'shield'], ['bucket', 'bucket'],
];
function richTokens(s) {
  const out = []; const low = s.toLowerCase(); let i = 0, buf = '';
  const flush = () => { if (buf) { for (const w of buf.match(/\S+\s*|\s+/g)) out.push({ t: w }); buf = ''; } };
  while (i < s.length) {
    let hit = null;
    if (i === 0 || /[\s("'“]/.test(s[i - 1])) for (const [w, ic] of ITEM_WORDS) if (low.startsWith(w, i) && !/[a-z]/.test(low[i + w.length] || '')) { hit = [w, ic]; break; }
    if (hit) { flush(); let j = i + hit[0].length; let tail = ''; while (j < s.length && /[,.;:!?\s”"]/.test(s[j])) { tail += s[j]; j++; if (s[j - 1] === ' ') break; } out.push({ t: s.slice(i, i + hit[0].length), icon: hit[1], tail }); i = j; }
    else { buf += s[i]; i++; }
  }
  flush(); return out;
}
// an item's icon by its name in words ("oak logs", "an iron ingot"): the painted one, else a star
function itemIcon(name) {
  const low = String(name).toLowerCase();
  for (const [w, ic] of ITEM_WORDS) if (low.includes(w) || low.includes(w.replace(/s$/, ''))) return ic;
  return 'star';
}
// wrap rich tokens into at most maxLines lines of width maxW; returns {lines, cut}
function richWrap(s, maxW, size, wt, maxLines, ctx = g, iconSize = null) {
  const font = UI(wt, size), isz = iconSize || Math.max(24, Math.round(size)), igap = iconSize ? 5 : 4;
  const tokW = (k) => (k.icon ? isz + igap + W(k.t + (k.tail || ''), font, ctx) : W(k.t, font, ctx));
  const toks = richTokens(s); const lines = [[]]; let lw = 0, cut = false;
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i], w = tokW(k);
    if (lw + w > maxW && lines[lines.length - 1].length) {
      if (lines.length === maxLines) { cut = true; break; }
      lines.push([]); lw = 0; if (!k.icon && !k.t.trim()) continue;
    }
    lines[lines.length - 1].push(k); lw += w;
  }
  const Lz = lines[lines.length - 1];
  const lineW = () => Lz.reduce((a, k) => a + tokW(k), 0) + (cut ? W('…', font, ctx) : 0);
  if (cut || lineW() > maxW) { // ellipsis on the last line, cutting whole words until it fits
    cut = true;
    while (Lz.length > 1 && lineW() > maxW) Lz.pop();
    const last = Lz[Lz.length - 1];
    if (last) {
      if (last.icon) last.tail = (last.tail || '').replace(/[\s,;:.]+$/, '') + '…';
      else { last.t = last.t.replace(/[\s,;:.\-]+$/, '') + '…'; while (last.t.length > 2 && lineW() > maxW) last.t = last.t.slice(0, -2) + '…'; }
    }
  }
  return { lines, cut, font, isz, igap, tokW };
}
function drawRich(R, x, y, lh, color, ctx = g, gold = C.gold) {
  R.lines.forEach((Ln, li) => {
    let cx = x; const by = y + li * lh;
    for (const k of Ln) {
      if (k.icon) {
        icon(k.icon, cx, by - R.isz * 0.8, R.isz, 1, ctx); cx += R.isz + R.igap;
        cx += T(k.t, cx, by, R.font, gold, 'left', ctx);
        if (k.tail) cx += T(k.tail, cx, by, R.font, color, 'left', ctx);
      } else cx += T(k.t, cx, by, R.font, color, 'left', ctx);
    }
  });
}

/* ---------- plain words for steps (Muse's args, said for viewers) ---------- */
const PRETTY = { oak_log: ['oak log', 'oak logs'], birch_log: ['birch log', 'birch logs'], spruce_log: ['spruce log', 'spruce logs'], oak_planks: ['oak plank', 'oak planks'], crafting_table: ['crafting table', 'crafting tables'],
  deepslate_diamond_ore: ['diamond ore', 'diamond ore'], cobbled_deepslate: ['cobbled deepslate', 'cobbled deepslate'], water_bucket: ['water bucket', 'water buckets'],
  raw_iron: ['raw iron', 'raw iron'], iron_ingot: ['iron ingot', 'iron ingots'], clay_ball: ['clay ball', 'clay balls'], iron_ore: ['iron ore', 'iron ore'], coal_ore: ['coal ore', 'coal ore'] };
const pretty = (id, n) => { const p = PRETTY[id]; if (p) return n === 1 ? p[0] : p[1]; return String(id ?? '').replace(/^minecraft:/, '').replace(/_/g, ' '); };
const isOn = (v) => v === 'on' || v === true || (typeof v === 'number' && v > 0);
function policyRules(a) {
  const r = []; if (isOn(a.defend)) r.push('defend'); if (isOn(a.escape)) r.push('escape'); if (isOn(a.flee)) r.push('flee');
  if (a.eat_below != null && Number(a.eat_below) > 0) r.push(`eat at food ${a.eat_below}`); return r;
}
function stepSay(sk) {
  const a = (sk && sk.args) || {};
  const n = Number(a.n);
  switch (sk && sk.skill) {
    case 'collect': if (a.block && Number.isFinite(n)) return `Mine ${n} ${pretty(a.block, n)}`; break;
    case 'craft': if (a.item) return !Number.isFinite(n) || n === 1 ? `Craft a ${pretty(a.item, 1)}` : `Craft ${n} ${pretty(a.item, n)}`; break;
    case 'hunt': if (a.mob) { const k = Number.isFinite(n) ? n : 1; return `Hunt ${k} ${pretty(a.mob, k)}${k === 1 || /s$/.test(a.mob) ? '' : 's'}`; } break;
    case 'policy': { const r = policyRules(a); return r.length ? `Set ${r.length} rule${r.length === 1 ? '' : 's'}` : 'Turn the rules off'; }
    case 'smelt': if (a.item && Number.isFinite(n)) return `Smelt ${n} ${pretty(a.item, n)}`; break;
    default: break;
  }
  return (sk && sk.say) || cap1(String((sk && sk.skill) || 'step').replace(/_/g, ' '));
}
const BLOCK_ICON = { oak_log: 'log', birch_log: 'log', spruce_log: 'log', dark_oak_log: 'log', jungle_log: 'log', acacia_log: 'log', obsidian: 'obsidian', stone: 'cobblestone', cobblestone: 'cobblestone',
  deepslate_diamond_ore: 'diamond', diamond_ore: 'diamond', coal_ore: 'coal', deepslate_coal_ore: 'coal', iron_ore: 'raw_iron', deepslate_iron_ore: 'raw_iron' };
function stepIcon(sk) {
  const a = (sk && sk.args) || {};
  switch (sk && sk.skill) {
    case 'collect': return BLOCK_ICON[a.block] || 'pickaxe';
    case 'craft': return HAS(a.item) ? a.item : 'hammer';
    case 'go_to': case 'explore': return 'boot';
    case 'bucket': return a.liquid === 'lava' ? 'lava_bucket' : 'water_bucket';
    case 'eat': return 'bread';
    case 'hunt': case 'attack': return 'sword';
    case 'policy': case 'shield': return 'shield';
    case 'smelt': return 'flame';
    case 'shelter': case 'build': return a.blueprint === 'nether_portal' ? 'portal' : 'house';
    case 'portal': return 'portal';
    case 'sleep': return 'bed';
    default: return (sk && sk.icon && HAS(sk.icon)) ? sk.icon : 'compass';
  }
}
// one action for the whole command: identical steps add up ("Hunt 10 pigs"), different steps show the first + "then N more"
function cmdAction(steps, long = true) {
  if (!steps.length) return '';
  if (steps.length === 1) return stepSay(steps[0]);
  const key = (s) => s.skill + JSON.stringify({ ...(s.args || {}), n: 0 });
  if (steps.every((s) => key(s) === key(steps[0])) && steps[0].args && Number.isFinite(Number(steps[0].args.n))) {
    return stepSay({ skill: steps[0].skill, args: { ...steps[0].args, n: steps.reduce((a, s) => a + (Number(s.args.n) || 0), 0) }, say: steps[0].say });
  }
  if (!long) return stepSay(steps[0]);
  if (steps.length === 2) return `${stepSay(steps[0])}, then ${lc1(stepSay(steps[1]))}`;
  return `${stepSay(steps[0])}, then ${steps.length - 1} more`;
}
const COMMAND_TOOLS = new Set(['play', 'play_sequence', 'set_goal', 'start_game']);
const CALLOUT_TOOLS = new Set(['play', 'play_sequence', 'set_goal']);
function deltas(text) { // "+33 cobbled_deepslate, +10 tuff" from the server's bracket
  const m = String(text || '').match(/\[([^\]]*)\]\s*$/); if (!m) return null;
  const d = [...m[1].matchAll(/([+-]\d+) ([a-z_]+)/g)].map((x) => `${x[1]} ${pretty(x[2], Math.abs(+x[1]))}`);
  return d.length ? d.join(', ') : null;
}
// the server's answer, said short (the feed's result); the full answer stays in RAW
function resultOf(e, steps) {
  const tx = (e.answer && e.answer.text) || '';
  if (e.tool === 'set_goal') { const m = tx.match(/it was: ([^;)]+)/); return m ? `was ${m[1]}` : 'goal set'; }
  if (e.tool === 'start_game') { const g2 = (tx.match(/Goal: ([^.]+)\./) || [])[1]; return g2 ? `${g2}, empty inventory` : 'new bot, empty inventory'; }
  if (e.state === 'fail') { const f = steps.find((s) => s.state === 'fail'); return f && f.why ? `failed: ${f.why}` : 'failed'; }
  if (steps.length === 1 && steps[0].skill === 'policy') { const r = policyRules(steps[0].args || {}); return r.length ? r.join(', ') : 'all rules off'; }
  const res = steps.map((s) => s.result && String(s.result).replace(/_/g, ' ')).filter(Boolean);
  if (res.length) return res.slice(0, 2).join(', ') + (res.length > 2 ? `, +${res.length - 2} more` : '');
  const d = deltas(tx); if (d) return d;
  const ok = tx.match(/ok: ([^[]+)/); if (ok) return ok[1].replace(/\s+$/, '').replace(/ and picked up.*$/, '');
  return '';
}
function planNext(plan, action) {
  if (!plan || /^Then the next part of the plan/.test(plan)) return null;
  const sentences = plan.split(/(?<=\.)\s+/);
  const parts = [];
  for (const sn of sentences) for (const p of sn.split(/;\s*/)) if (p.trim() && !/^(if|fallback|otherwise)\b/i.test(p.trim())) parts.push(p.trim());
  if (!parts.length) return null;
  let s = parts.join('; ').replace(/^(next|then)\s*:\s*/i, '').replace(/\.$/, '');
  const verb = (action || '').split(' ')[0].toLowerCase();
  if (verb && s.toLowerCase().startsWith(verb + ' ')) { const k = s.search(/[,;]\s/); if (k > 0) s = s.slice(k + 2); }
  s = s.replace(/^then\s+/i, '');
  return s ? { label: 'then', text: s } : null;
}
function collapse(args) { return String(args).replace(/"why":"(?:[^"\\]|\\.)*"/, '"why":"…"').replace(/"plan":"(?:[^"\\]|\\.)*"/, '"plan":"…"'); }
function rawLines(entries, nowS) {
  const runs = [];
  for (const e of entries) {
    const last = runs[runs.length - 1];
    if (last && last.tool === e.tool && last.args === e.args && e.tool === 'get_state') { last.count++; continue; }
    runs.push({ tool: e.tool, args: e.args, count: 1, sentS: e.sentS, e });
  }
  return runs.map((r) => {
    const a = r.e.answer || {};
    let ans;
    if (a.state === 'running') ans = `running ${mmss(nowS - r.sentS)}`;
    else if (a.state === 'waiting') ans = `waiting ${mmss(nowS - r.sentS)}`;
    else ans = a.text || '';
    if (a.code && !String(ans).includes(a.code)) ans = `${a.code}: ${ans}`;
    return { time: mmss(r.sentS), tool: r.tool + (r.count > 1 ? ` ×${r.count}` : ''), rest: `${collapse(r.args)} ← ${ans}` };
  });
}

/* ---------- the model: one pass over the state, all times from the game clock ---------- */
const refused = (e) => Boolean(e.answer && e.answer.code) || /^Already received/.test((e.answer && e.answer.text) || '');
const isCmd = (e) => CALLOUT_TOOLS.has(e.tool) && !refused(e);
const stepsOf = (e) => (Array.isArray(e.steps) ? e.steps : []);
function cmdModel(e) {
  const steps = stepsOf(e);
  const setGoal = e.tool === 'set_goal';
  const action = setGoal ? `Set goal: ${e.goal || 'a new goal'}` : cmdAction(steps);
  return { id: e.id, no: e.callNo ?? e.playCallNo ?? e.n, tool: e.tool, sentS: e.sentS, steps, running: !setGoal && e.state === 'run',
    ansAt: e.answer && e.answer.atS != null ? e.answer.atS : null,
    action, toastAction: setGoal ? cap1(e.goal || 'A new goal') : cmdAction(steps, false),
    icon: setGoal ? 'sword' : (steps[0] ? stepIcon(steps[0]) : 'compass'), why: e.why || null, plan: e.plan || null };
}
/** The model of the HUD at game second nowS, from the panel's state. */
export function buildModel(state, nowS) {
  st = state;
  const caller = String(state.caller || 'MUSE');
  WHO_CODE = caller === 'MUSE' ? 'MUSE' : caller === 'TEST SCRIPT' ? 'TEST' : caller.slice(0, 6);
  WHO_WORD = caller === 'MUSE' ? 'Muse' : caller === 'TEST SCRIPT' ? 'the test script' : caller;
  WHO_POS = caller === 'MUSE' ? 'Muse’s' : `${WHO_WORD}’s`;
  const entries = (st.raw && st.raw.entries) || [];
  const cmds = entries.filter(isCmd);
  // the command on the bar: a play still running, else the newest command
  const playing = cmds.find((e) => e.state === 'run' && e.tool !== 'set_goal');
  const newest = playing || cmds[0] || null;
  const t = newest ? nowS - (newest.sentS ?? nowS) : nowS;
  const M = { t, nowS, clock: mmss(nowS), calls: st.raw && st.raw.total != null ? st.raw.total : entries.length, code: WHO_CODE };
  const s = st.stats || {};
  M.hp = s.hp; M.food = s.food;
  if (s.dimension === 'nether') M.phase = { icon: 'flame', words: 'in the Nether', warn: false };
  else if (s.dimension === 'end') M.phase = { icon: 'portal', words: 'in the End', warn: false };
  else if (!Number.isFinite(s.ticks)) M.phase = { icon: 'sun', words: s.phase === 'night' ? 'night' : 'day', warn: false };
  else {
    // the server calls night from about tick 12300 (its own "night in N s" advice) to dawn at 23000
    const ticks = ((s.ticks % 24000) + 24000) % 24000;
    const words = (what, sec) => (sec < 60 ? `${what} in ${Math.round(sec)} s` : `${what} in ${Math.floor(sec / 60)} min`);
    if (ticks < 12300 || ticks >= 23000) { const sec = ((12300 - ticks + 24000) % 24000) / 20; M.phase = { icon: 'sun', words: words('dusk', sec), warn: sec < 60 }; }
    else { const sec = (23000 - ticks) / 20; M.phase = { icon: 'moon', words: words('dawn', sec), warn: false }; }
  }
  // who did what: the caller's own steps, its rules firing, the bot on its own
  const share = s.museShare || {};
  M.tally = { muse: share.muse || 0, rule: share.rule != null ? share.rule : (share.reflex || 0), bot: share.body || 0 };
  M.inv = st.inventory || [];
  M.rules = st.rules || null;

  /* the command on the bar and whose turn it is */
  const th = st.thinking || {};
  const why = th.hasWhy ? th.why : null;
  M.plan = th.plan || null;
  M.why = null; M.whyIcon = null; M.polls = null;
  if (st.over) {
    M.cmd = newest ? cmdModel(newest) : null;
    M.status = { kind: 'think', actor: WHO_CODE, words: st.over, ctx: '', timer: mmss(nowS), icon: 'star' };
  } else if (!newest) {
    M.cmd = null;
    M.status = { kind: 'think', actor: WHO_CODE, words: `Waiting for ${WHO_WORD}’s first command`, ctx: 'the bot does nothing until then', timer: mmss(nowS), icon: 'bulb' };
  } else {
    const cc = st.currentCall && st.currentCall.id === newest.id ? st.currentCall : null;
    M.cmd = cmdModel(newest);
    const running = M.cmd.running;
    const whyOwner = why ? cmds.find((e) => e.why === why) : null;
    M.why = why;
    M.whyIcon = whyOwner ? cmdModel(whyOwner).icon : null;
    if (running) {
      const sts = cc && cc.steps && cc.steps.length ? cc.steps : M.cmd.steps.map((x, i) => ({ ...x, n: i + 1, state: i ? 'queued' : 'run' }));
      const cur = sts.find((x) => x.state === 'run') || sts.find((x) => x.state !== 'ok') || sts[0];
      M.status = { kind: 'run', actor: WHO_CODE, words: M.cmd.action, ctx: sts.length > 1 ? `${WHO_POS} command · step ${cur.n} of ${sts.length}` : `${WHO_POS} command`,
        timer: mmss(t), icon: M.cmd.icon, steps: sts, cur };
    } else {
      const since = M.cmd.ansAt != null ? nowS - M.cmd.ansAt : t;
      const shelter = st.sheltered ? `the bot waits sealed in its shelter since ${st.sheltered.since}` : 'the bot waits for its next command';
      M.status = { kind: 'think', actor: WHO_CODE, words: `${cap1(WHO_WORD)} is thinking`, ctx: shelter, timer: mmss(Math.max(0, since)), icon: 'bulb' };
    }
    const polls = entries.filter((e) => e.tool === 'get_state' && e.sentS > newest.sentS);
    M.polls = polls.length ? { n: polls.length, lastAgo: nowS - polls[0].sentS } : null;
  }
  // what comes next: the plan minus its contingencies; without a plan, the goal's next split
  M.next = planNext(M.plan, M.cmd ? M.cmd.action : '');
  if (!M.next && st.goal && st.goal.kind === 'milestones') {
    const i = st.goal.list.findIndex((m) => m.state !== 'done');
    const after = i >= 0 ? st.goal.list.slice(i + 1).find((m) => m.state !== 'done') : null;
    if (after) M.next = { label: 'next split', text: after.label };
  }

  /* who did what: STUCK and TIME pinned first; then commands (not the one on the bar while it runs), hints, rules and
     the bot on its own, refusals */
  const feed = [];
  const pinned = [];
  for (const e of entries) {
    if (CALLOUT_TOOLS.has(e.tool) && e.answer && e.answer.code) { feed.push({ s: e.sentS, code: 'NO', icon: 'compass', action: `${e.tool} refused`, result: e.answer.code, glyph: 'x', dur: '', id: e.id }); continue; }
    if (!COMMAND_TOOLS.has(e.tool) || refused(e)) continue;
    if (M.cmd && e.id === M.cmd.id && M.cmd.running) continue;
    const sp = stepsOf(e);
    const at = e.answer && e.answer.atS != null ? e.answer.atS : null;
    let doneIn = e.ms ? e.ms / 1000 : at != null && e.state !== 'run' ? at - e.sentS : null;
    if (!(doneIn >= 0.05)) doneIn = null;
    const goalCmd = e.tool === 'set_goal' || e.tool === 'start_game';
    feed.push({ s: e.sentS, code: WHO_CODE, icon: e.tool === 'set_goal' ? 'sword' : e.tool === 'start_game' ? 'house' : sp[0] ? stepIcon(sp[0]) : 'compass',
      action: e.tool === 'set_goal' ? `Set goal: ${e.goal || 'a new goal'}` : e.tool === 'start_game' ? 'Start a new game' : cmdAction(sp), result: resultOf(e, sp),
      glyph: e.state === 'fail' ? 'x' : e.state === 'run' ? null : 'ok', dur: goalCmd || e.state === 'run' ? '' : durTxt(doneIn), id: e.id });
  }
  for (const a of (st.advice && st.advice.items) || []) {
    const gist = a.gist || '';
    const rest = gist ? a.text.slice(gist.length).replace(/^[:;,.]\s*/, '').replace(/\s*\([^)]*\)/g, '') : '';
    const head = (txt) => txt.split(/[;.]\s/)[0];
    const tail = (txt) => txt.split(/[;.]\s/).slice(1).join('; ').replace(/\s*\([^)]*\)/g, '');
    if (a.kind === 'stuck') { pinned.push({ s: a.givenAtS, code: 'STUCK', icon: 'compass', action: gist || head(a.text), result: gist ? rest : tail(a.text), glyph: null, dur: '', pin: 'stuck' }); continue; }
    if (a.kind === 'time') { pinned.push({ s: a.givenAtS, code: 'TIME', icon: 'moon', action: gist || head(a.text), result: gist ? rest : tail(a.text), glyph: null, dur: '', pin: 'time' }); continue; }
    feed.push({ s: a.givenAtS, code: 'HINT', icon: 'bulb', action: gist || a.text.split(/[:;]\s/)[0], result: rest, glyph: null, dur: '' });
  }
  for (const ev of st.events || []) {
    if (ev.atS == null) continue;
    if (ev.kind === 'death') { feed.push({ s: ev.atS, code: 'BOT', icon: 'heart', action: cap1(ev.text), result: '', glyph: 'x', dur: '' }); continue; }
    if (ev.who === 'rule') feed.push({ s: ev.atS, code: 'RULE', icon: 'shield', action: `${ev.rule || 'rule'}: ${ev.text}`, result: ev.ruleSet ? `set ${ev.ruleSet}${ev.ruleCall ? ` · call ${ev.ruleCall}` : ''}` : '', glyph: null, dur: '' });
    else if (ev.who === 'body' && (ev.kind === 'reflex' || ev.kind === 'body')) feed.push({ s: ev.atS, code: 'BOT', icon: 'shield', action: cap1(ev.text), result: 'on its own', glyph: null, dur: '' });
  }
  feed.sort((a, b) => (b.s ?? 0) - (a.s ?? 0));
  // the same row again and again (a burst of one command, a rule firing on and on): one row, xN
  const folded = [];
  for (const r of feed) {
    const last = folded[folded.length - 1];
    if (last && last.code === r.code && last.action === r.action && last.result === r.result && last.glyph === r.glyph) { last.n = (last.n || 1) + 1; continue; }
    folded.push({ ...r });
  }
  for (const r of folded) if (r.n > 1) r.action = `${r.action} ×${r.n}`;
  M.feed = [...pinned.slice(0, 2), ...folded].slice(0, 3);
  M.goal = st.goal || null;
  /* RAW: one line per call, polls folded, why and plan collapsed (they are on screen) */
  M.raw = rawLines(entries, nowS);
  M.cmds = cmds;
  M.entries = entries;
  return M;
}

/* =====================================================================================================================
   LAYOUT (fixed homes; nothing below depends on the data). The frame is 1080 x 1080: the video 0..608, the HUD under it
   ===================================================================================================================== */
export const L = {
  video: { h: 608 },
  toast: { x: 520, y: 136, w: 536, tile: 72, pad: 16, bar: 6 },
  nowchip: { y: 136, h: 64, right: 1056 },
  banner: { y: 150, h: 112 },
  actionbar: { x: 16, y: 492, w: 356, h: 40 },
  hotbar: { x: 16, y: 544, w: 356, h: 56 },
  floater: { x: 480, y: 330 },
  top: { y: 608, h: 48 },
  lt: { y: 668, h: 144, bar: 24, tileX: 41, tileY: 670, tile: 72, x: 129, rowA: 703, rowB: 716, why1: 776, lh: 30 },
  goal: { y: 832, h: 80 },
  feed: { y: 922, row: 28, n: 3 },
  raw: { y: 1016, lh: 21, n: 3 },
};
const FEED_ICON_X = 195;

/* =====================================================================================================================
   THE HUD LAYER (drawn on change): the hotbar over the video, the top bar, the command bar, the goal, the feed, RAW
   ===================================================================================================================== */
function drawHotbar(M) {
  const H = L.hotbar; plate(H.x, H.y, H.w, H.h, 10);
  M.inv.slice(0, 8).forEach((it, i) => {
    const x = H.x + 8 + i * 43, y = H.y + 8;
    fillRR(x, y, 40, 40, 6, 'rgba(255,255,255,0.06)');
    // an item not carried is an empty slot: a faint outline of what goes there, no number
    icon(it.icon, x + 5, y + 4, 30, it.count ? 1 : 0.12);
    if (it.count) T(String(it.count), x + 38, y + 38, MONO(500, 14), C.t1, 'right');
  });
}
function drawTop(M) {
  const y = L.top.y; rect(0, y, 1080, L.top.h, C.bar);
  // possession bar along the seam: the caller / its rules / the bot on its own
  const tot = M.tally.muse + M.tally.rule + M.tally.bot; let x = 0;
  if (tot > 0) for (const [k, c] of [['muse', C.muse], ['rule', C.rule], ['bot', C.bot]]) { const w = 1080 * M.tally[k] / tot; rect(x, y, w, 3, c); x += w; }
  else rect(0, y, 1080, 3, C.track);
  const by = y + 37;
  icon('heart', 24, y + 11, 28); T(String(M.hp ?? '–'), 58, by, MONO(500, 30), M.hp <= 6 ? C.fail : C.t1);
  icon('food', 112, y + 11, 28); T(String(M.food ?? '–'), 146, by, MONO(500, 30), M.food <= 6 ? C.rule : C.t1);
  icon(M.phase.icon, 200, y + 11, 28); T(fit(M.phase.words, 180, UI(500, 24)), 236, by - 1, UI(500, 24), M.phase.warn ? C.rule : C.t2);
  // F1-style actor blocks: stripe + code + count
  let bx = 424 + CAPS('actions', 424, by - 3, 14, C.raw, 600) + 14;
  for (const [code, n, col] of [[WHO_CODE, M.tally.muse, C.muse], ['RULE', M.tally.rule, C.rule], ['BOT', M.tally.bot, C.bot]]) {
    rect(bx, y + 13, 4, 26, col);
    const cw = T(code, bx + 12, by - 2, UI(600, 18), C.t2);
    const nw = T(String(n), bx + 12 + cw + 8, by - 1, MONO(500, 24), C.t1);
    bx += 12 + cw + 8 + nw + 26;
  }
  const cw = T(M.clock, 1056, by, MONO(500, 30), C.t1, 'right');
  const calls = `${M.calls} call${M.calls === 1 ? '' : 's'}`;
  if (1056 - cw - 14 - W(calls, MONO(400, 16)) > bx) T(calls, 1056 - cw - 14, by - 2, MONO(400, 16), C.raw, 'right');
}
function drawLowerThird(M, pend) {
  const LT = L.lt, s = M.status, col = actor(s.actor);
  fillRR(16, LT.y - 4, 1048, LT.h + 8, 8, '#10141d');
  // actor bar + icon tile (the toast's tile lands here)
  g.save(); g.globalAlpha = s.kind === 'think' ? 0.45 : 1; rr(16, LT.y - 4, 1048, LT.h + 8, 8); g.clip(); rect(16, LT.y - 4, 6, LT.h + 8, col); g.restore();
  fillRR(LT.tileX, LT.tileY, LT.tile, LT.tile, 10, C.tile);
  if (pend.ltIcon) { icon(s.icon, LT.tileX + 10, LT.tileY + 10, 52, 0.25); g.save(); g.setLineDash([5, 5]); strokeRR(LT.tileX, LT.tileY, LT.tile, LT.tile, 10, 'rgba(176,164,255,0.55)', 2); g.restore(); }
  else { strokeRR(LT.tileX, LT.tileY, LT.tile, LT.tile, 10, s.kind === 'think' ? 'rgba(176,164,255,0.45)' : col, 2); icon(s.icon, LT.tileX + 10, LT.tileY + 10, 52, s.kind === 'think' ? 0.85 : 1); }
  // row A: whose turn (dot, words, context) + ticking timer
  const x = LT.x, yA = LT.rowA;
  dot(x + 7, yA - 11, 7, col, s.kind === 'think');
  const timerW = W(s.timer, MONO(500, 30));
  T(s.timer, 1056, yA, MONO(500, 30), C.t1, 'right');
  const maxHero = 1056 - timerW - 24 - (x + 24);
  const ctxW = s.ctx ? Math.min(W(s.ctx, UI(600, 18)) + 18, 300) : 0;
  const hero = fit(s.words, maxHero - ctxW, UI(700, 30));
  const hw = T(hero, x + 24, yA, UI(700, 30), C.t1);
  if (s.ctx) { const c2 = fit(s.ctx, maxHero - hw - 18, UI(600, 18)); if (c2.length > 3) T(c2, x + 24 + hw + 16, yA - 2, UI(600, 18), C.soft); }
  // row B: steps (running) or what comes next (thinking)
  const yB = LT.rowB;
  let bx = x;
  if (s.kind === 'run' && s.steps && s.steps.length > 1) {
    let shown = 0;
    for (const sp of s.steps) {
      const label = stepSay(sp);
      const run = sp.state === 'run', done = sp.state === 'ok', failed = sp.state === 'fail';
      const sub = run && sp.sub ? (sp.sub.of ? `${sp.sub.done}/${sp.sub.of}` : sp.sub.text || '') : '';
      const subMono = run && sp.sub && sp.sub.of;
      const subW = sub ? 10 + W(sub, subMono ? MONO(500, 16) : UI(500, 18)) : 0;
      const w = 32 + W(label, UI(600, 18)) + subW + 12;
      const left = s.steps.length - shown;
      if (bx + w > 1056 - (left > 1 ? 60 : 0)) { if (left > 0) T(`+${left}`, bx + 4, yB + 20, MONO(500, 16), C.raw); bx += 50; break; }
      fillRR(bx, yB, w, 28, 6, run ? 'rgba(176,164,255,0.16)' : 'rgba(255,255,255,0.04)');
      strokeRR(bx, yB, w, 28, 6, run ? 'rgba(176,164,255,0.65)' : failed ? 'rgba(255,138,122,0.6)' : 'rgba(255,255,255,0.12)', 1);
      if (done) tick(bx + 10, yB + 8, 13, C.ok, 2.2); else if (failed) xmark(bx + 11, yB + 9, 11, C.fail, 2.2); else dot(bx + 17, yB + 14, 5, run ? C.muse : C.dim, !run);
      const lw = T(label, bx + 32, yB + 20, UI(600, 18), run || done ? C.t1 : C.soft);
      if (sub) T(sub, bx + 32 + lw + 10, yB + 20, subMono ? MONO(500, 16) : UI(500, 18), C.soft);
      bx += w + 8; shown += 1;
    }
    bx += 10;
  } else if (s.kind === 'run' && s.cur && s.cur.sub) {
    // one step: what the body is at now
    const sb = s.cur.sub, txt = sb.of ? `${sb.text ? `${sb.text} ` : ''}${sb.done}/${sb.of}` : sb.text || '';
    if (txt) { const lw = CAPS('now', bx, yB + 19, 14, C.raw, 600); bx += lw + 10; bx += T(fit(txt, 420, UI(600, 18)), bx, yB + 20, UI(600, 18), C.t2) + 24; }
  }
  const lab = M.next ? (M.next.label === 'then' ? (s.kind === 'run' ? 'then' : 'next') : M.next.label) : '';
  if (M.next && 1056 - (bx + capsW(lab, 14) + 10) >= 180) {
    const lw = CAPS(lab, bx, yB + 19, 14, C.raw, 600);
    const nx = bx + lw + 10;
    const RN = richWrap(M.next.text, 1056 - nx, 18, 600, 1, g, 24);
    drawRich(RN, nx, yB + 20, 0, s.kind === 'run' ? C.t2 : C.t1);
  }
  // row C: the caller's why, whole and still (2 lines), item names gold with their icon
  if (M.why) {
    g.save(); g.globalAlpha = pend.why ? 0.35 : 1;
    let wx = x;
    // between commands the why belongs to the last one: its icon (as in its feed row) leads the quote
    if (s.kind !== 'run' && M.whyIcon) { icon(M.whyIcon, x, LT.why1 - 20, 24); wx = x + 34; }
    const R = richWrap(`“${M.why}”`, 1056 - wx, 24, 500, 2);
    drawRich(R, wx === x ? wx - W('“', R.font) : wx, LT.why1, LT.lh, '#e6e9f1');
    g.restore();
  } else if (!M.cmd) {
    T(`Each command ${WHO_WORD} sends pops up over the video, then lands here.`, x, LT.why1, UI(500, 18), C.raw);
    T('Below: the goal’s splits, who did what, and the raw calls.', x, LT.why1 + 26, UI(500, 18), C.raw);
  } else {
    T('No why was sent with this command.', x, LT.why1, UI(500, 18), C.raw);
    if (M.polls) T(`Since then ${WHO_WORD} has checked the game ${M.polls.n} time${M.polls.n === 1 ? '' : 's'}, the last ${Math.round(M.polls.lastAgo)} s ago.`, x, LT.why1 + 26, UI(500, 18), C.raw);
  }
}
function drawGoal(M) {
  const G = L.goal, gl = M.goal, y = G.y;
  if (!gl) return;
  if (gl.kind === 'text' || !(gl.list || gl.parts)) {
    icon('compass', 57, y + 6, 40);
    T(fit(cap1(gl.title || gl.text || 'Free play'), 920, UI(700, 24)), 129, y + 31, UI(700, 24), C.t1);
    if (gl.text && gl.title && gl.text !== gl.title) T(fit(gl.text, 920, UI(500, 18)), 129, y + 60, UI(500, 18), C.soft);
    return;
  }
  if (gl.kind === 'counted') {
    const p = gl.parts[0];
    icon(p.icon, 57, y + 2, 40);
    const tw0 = T(fit(cap1(gl.title), 360, UI(700, 24)), 129, y + 31, UI(700, 24), C.t1);
    const of = Math.max(1, p.of), done = Math.min(p.done, of);
    const bx0 = Math.max(330, 129 + tw0 + 32), bx1 = 900, n = Math.min(of, 40), gap = n > 20 ? 0 : 6, sw = (bx1 - bx0 - gap * (n - 1)) / n;
    const lit = Math.round((done / of) * n);
    for (let i = 0; i < n; i++) fillRR(bx0 + i * (sw + gap), y + 16, sw, 12, n > 20 ? 0 : 3, i < lit ? C.t2 : C.track);
    T(`${done}`, 1056 - W(`/${of}`, MONO(500, 30)), y + 33, MONO(500, 30), C.t1, 'right');
    T(`/${of}`, 1056, y + 33, MONO(500, 30), C.raw, 'right');
    // the goal it replaced, paused: its splits as small icons
    const pv = gl.previous;
    if (pv && pv.list) {
      pv.list.slice(0, 12).forEach((m, i) => icon(m.icon, 129 + i * 30, y + 52, 24, m.state === 'done' ? 0.9 : 0.28));
      const dn = pv.list.filter((m) => m.state === 'done').length;
      const tx = 129 + Math.min(12, pv.list.length) * 30 + 10;
      const w1 = T(fit(pv.title, 300, UI(600, 18)), tx, y + 71, UI(600, 18), C.soft);
      T(` ${dn} / ${pv.list.length} · paused`, tx + w1, y + 71, MONO(400, 16), C.raw);
    }
    return;
  }
  // milestones as LiveSplit splits: done = full + tick + time, current = ringed + its count, the rest at 30 %
  const list = gl.list.slice(0, 12); const curI = list.findIndex((m) => m.state !== 'done');
  icon(gl.key === 'free' ? 'compass' : 'portal', 57, y + 6, 40);
  const CW = 50, CG = 4, X0 = 129;
  const lastSplit = Math.max(0, ...list.filter((q) => q.doneS != null).map((q) => q.doneS));
  list.forEach((m, i) => {
    const cx = X0 + i * (CW + CG), done = m.state === 'done', cur = i === curI;
    if (cur) { fillRR(cx, y - 2, CW, 80, 8, 'rgba(176,164,255,0.10)'); strokeRR(cx, y - 2, CW, 80, 8, C.muse, 2); }
    icon(m.icon, cx + 5, y + 6, 40, done || cur ? 1 : 0.3);
    if (done) { fillRR(cx + 33, y + 34, 16, 16, 8, C.hud); tick(cx + 36, y + 38, 10, C.ok, 2.2); if (m.done) T(m.done, cx + CW / 2, y + 70, MONO(400, 16), C.soft, 'center'); }
    if (cur) T(m.progress || mmss(M.nowS - lastSplit), cx + CW / 2, y + 70, MONO(500, 16), C.t1, 'center');
  });
  const done = list.filter((m) => m.state === 'done').length, rx = X0 + 12 * (CW + CG) + 16, rw = 1056 - rx;
  const nw = T(`${done}`, rx, y + 26, MONO(500, 30), C.t1);
  const sw = T(`/${list.length}`, rx + nw, y + 26, MONO(500, 30), C.raw);
  const tt = fit(gl.title, rw - nw - sw - 12, UI(600, 18)); if (tt.length > 3) T(tt, 1056, y + 24, UI(600, 18), C.soft, 'right');
  const cur = list[curI], nxt = curI >= 0 ? list.slice(curI + 1).find((m) => m.state !== 'done') : null;
  if (cur) T(fit(cur.label, rw, UI(700, 24)), rx, y + 55, UI(700, 24), C.t1);
  else T('All splits done', rx, y + 55, UI(700, 24), C.ok);
  if (nxt) { const lw = T('then ', rx, y + 78, UI(500, 18), C.raw); T(fit(nxt.label, rw - lw, UI(500, 18)), rx + lw, y + 78, UI(500, 18), C.soft); }
}
function drawFeed(M, pend) {
  const F = L.feed;
  M.feed.forEach((r, i) => {
    const y = F.y + i * F.row, by = y + 20;
    // STUCK and TIME: the row tinted in its colour
    if (r.pin) { g.save(); g.globalAlpha = r.pin === 'stuck' ? 0.16 : 0.12; fillRR(16, y, 1048, F.row - 2, 4, actor(r.code)); g.restore(); }
    T(mmss(r.s), 113, by, MONO(400, 16), r.pin ? C.t2 : C.raw, 'right');
    chip(r.code, 129, y + 4, 56, 20, actor(r.code));
    if (r.id != null && pend.feedIcons && pend.feedIcons.has(r.id)) { icon(r.icon, FEED_ICON_X, y + 2, 24, 0.3); g.save(); g.setLineDash([3, 3]); strokeRR(FEED_ICON_X - 2, y, 28, 28, 6, 'rgba(176,164,255,0.6)', 1.5); g.restore(); }
    else icon(r.icon, FEED_ICON_X, y + 2, 24);
    const right = 960;
    const ax = FEED_ICON_X + 34;
    const aw = T(fit(r.action, r.result ? 430 : right - ax, UI(600, 18)), ax, by, UI(600, 18), r.pin === 'stuck' ? '#ffd0c9' : C.t1);
    if (r.result) { const rs = fit(`→ ${r.result}`, right - (ax + aw + 12), UI(500, 18)); if (rs.length > 3) T(rs, ax + aw + 12, by, UI(500, 18), C.soft); }
    if (r.glyph === 'ok') tick(974, y + 8, 13, C.ok, 2.2);
    else if (r.glyph === 'x') xmark(976, y + 9, 11, C.fail, 2.2);
    if (r.dur) T(r.dur, 1056, by, MONO(400, 16), C.raw, 'right');
  });
}
function drawRaw(M) {
  const R = L.raw; rect(0, R.y - 6, 1080, 1080 - (R.y - 6), '#07090c'); rect(0, R.y - 6, 1080, 1, C.hair);
  const font = MONO(400, 16), cw = W('0', font), RX = 129, maxC = Math.floor((1056 - RX) / cw);
  let line = 0;
  for (const r of M.raw) {
    if (line >= R.n) break;
    const y = R.y + 15 + line * R.lh;
    T(r.time, 113, y, font, C.raw, 'right');
    const tw = T(r.tool, RX, y, font, C.t2);
    let rest = ' ' + r.rest; const first = Math.max(0, maxC - r.tool.length);
    // the newest call may take two lines
    if (line === 0 && rest.length > first && R.n > 2) {
      let cut = first; const head = rest.slice(0, first); const k = Math.max(head.lastIndexOf(','), head.lastIndexOf('} '), head.lastIndexOf(' ')); if (k > first * 0.6) cut = k + 1;
      T(rest.slice(0, cut), RX + tw, y, font, C.raw);
      let r2 = rest.slice(cut).replace(/^\s+/, ''); if (r2.length > maxC - 2) r2 = r2.slice(0, maxC - 3) + '…';
      T(r2, RX + cw * 2, y + R.lh, font, C.raw); line += 2;
    } else {
      if (rest.length > first) rest = rest.slice(0, Math.max(0, first - 1)) + '…';
      T(rest, RX + tw, y, font, C.raw); line += 1;
    }
  }
}
// the lab's logo at the top right of the video (2026-10-14, STREAM_LOGO, off by default): 'card', a light logo (the
// official one, home/static/PicassoLab-Logo.png put on white at full size and scaled to 152 px with lanczos:
// assets/muse-ui/lab-logo-152.png) on a white card (radius 10, 7 px around, a 1 px dark edge, no blur) at 92 %; or
// 'plain', a transparent light logo drawn as it is, at most 160 x 100, with a hard dark shadow 2 px down (no blur).
// 16 px in from the corner, above the toasts' band (from y 136) and away from Facebook's LIVE badge (top left)
export const LOGO = { right: 1064, y: 14, pad: 7, alpha: 0.92, maxW: 160, maxH: 100 };
// a large image down to w x h in halves (a single big step aliases the fine lines)
function shrink(img, w, h) {
  let src = img, sw = img.width, sh = img.height;
  while (sw / 2 >= w && sh / 2 >= h) { const c = mk(Math.round(sw / 2), Math.round(sh / 2)); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height); src = c; sw = c.width; sh = c.height; }
  const out = mk(w, h), ox = out.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(src, 0, 0, w, h);
  return out;
}
function buildLogo(img, style = 'card') {
  const k = Math.min(1, LOGO.maxW / img.width, LOGO.maxH / img.height);
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  const im = k < 1 ? shrink(img, w, h) : img;
  if (style === 'plain') {
    const c = mk(w + 2, h + 3), x = c.getContext('2d');
    const sil = mk(w, h), sx = sil.getContext('2d');
    sx.drawImage(im, 0, 0, w, h); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(6,8,12,0.75)'; sx.fillRect(0, 0, w, h);
    x.drawImage(sil, 1, 2); x.drawImage(im, 0, 0, w, h);
    return c;
  }
  const p = LOGO.pad, c = mk(w + p * 2, h + p * 2), x = c.getContext('2d');
  fillRR(0, 0, c.width, c.height, 10, '#ffffff', x);
  strokeRR(0, 0, c.width, c.height, 10, 'rgba(0,0,0,0.28)', 1, x);
  x.drawImage(im, p, p, w, h);
  return c;
}
/** The HUD layer: everything that stands still (pend: the homes still waiting for a toast's tile). */
export function drawStatic(ctx, M, pend, logo = null) {
  g = ctx;
  if (logo) { g.save(); g.globalAlpha = LOGO.alpha; g.drawImage(logo, LOGO.right - logo.width, LOGO.y); g.restore(); }
  rect(0, L.video.h, 1080, 1080 - L.video.h, C.hud);
  drawHotbar(M);
  drawTop(M);
  drawLowerThird(M, pend);
  drawGoal(M);
  drawFeed(M, pend);
  drawRaw(M);
}

/* =====================================================================================================================
   THE PIECES THAT MOVE: each drawn once into its own canvas
   ===================================================================================================================== */
// the toast: base (plate, bar), its words, the why (second beat), the icon tile that flies home, the icon at 24
function buildToast(cmd, n) {
  const TL = L.toast, textX = TL.bar + TL.pad + TL.tile + 16, textW = TL.w - textX - 18;
  const whyFull = cmd.why || '';
  let whyShown = '';
  if (whyFull) {
    const R0 = richWrap(`“${whyFull}”`, textW, 24, 500, 2);
    if (!R0.cut) whyShown = whyFull;
    else { const m = whyFull.match(/^(.{12,}?)(?::\s|;\s|,\s(?=so\b|then\b|and then\b)|\.\s|\s-\s)/); whyShown = m ? m[1] : whyFull; }
  }
  const R = whyShown ? richWrap(`“${whyShown}”`, textW, 24, 500, 2) : null;
  const nWhy = R ? R.lines.length : 0;
  const h = 96 + nWhy * 30 + (nWhy ? 10 : 0);
  const base = mk(TL.w, h), bx = base.getContext('2d');
  plate(0, 0, TL.w, h, 10, bx);
  bx.save(); rr(0, 0, TL.w, h, 10, bx); bx.clip(); rect(0, 0, TL.bar, h, C.muse, bx); bx.restore();
  const tile = mk(TL.tile, TL.tile), tc = tile.getContext('2d');
  fillRR(0, 0, TL.tile, TL.tile, 10, C.tile, tc); strokeRR(0, 0, TL.tile, TL.tile, 10, C.muse, 2, tc);
  icon(cmd.icon, 10, 10, 52, 1, tc);
  const small = mk(24, 24); icon(cmd.icon, 0, 0, 24, 1, small.getContext('2d'));
  const words = mk(TL.w, h), wc = words.getContext('2d');
  // the type line, Minecraft's coloured first line; a burst of the same command folded: xN
  const typeW = CAPS(`${WHO_WORD} · command ${cmd.no ?? ''}`.trim(), textX, 34, 18, C.museType, 600, wc);
  if (n > 1) { const fw = W(`×${n}`, MONO(500, 18), wc) + 14; fillRR(textX + typeW + 10, 17, fw, 24, 5, C.muse, wc); T(`×${n}`, textX + typeW + 17, 35, MONO(500, 18), C.ink, 'left', wc); }
  T(fit(cmd.toastAction || cmd.action, textW, UI(700, 40), wc), textX, 80, UI(700, 40), C.t1, 'left', wc);
  // step bar (the tutorial toast's): a segment a step; done green, running violet, queued dark
  const sb = { x: textX, y: h - 9, w: textW, h: 4 };
  const segs = Math.max(1, cmd.steps.length), gap = 4, sw = (sb.w - gap * (segs - 1)) / segs;
  for (let i = 0; i < segs; i++) {
    const sp = cmd.steps[i] || {};
    const c = !cmd.running ? (sp.state === 'fail' ? C.fail : C.ok) : sp.state === 'ok' ? C.ok : sp.state === 'fail' ? C.fail : (sp.state === 'run' || (i === 0 && !sp.state)) ? C.muse : C.track;
    fillRR(sb.x + i * (sw + gap), sb.y, sw, sb.h, 2, c, wc);
  }
  let why = null;
  if (R) { why = mk(TL.w, h); const wx = why.getContext('2d'); drawRich(R, textX - W('“', R.font, wx), 116, 30, '#e6e9f1', wx); }
  return { base, words, why, tile, small, tileOff: { x: TL.bar + TL.pad, y: 16 }, h, chars: (cmd.toastAction || '').length + whyShown.length };
}
function buildBanner(b) {
  const B = L.banner, c = mk(1080, B.h), x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 1080, 0);
  gr.addColorStop(0, 'rgba(11,14,20,0)'); gr.addColorStop(0.22, 'rgba(11,14,20,0.86)'); gr.addColorStop(0.78, 'rgba(11,14,20,0.86)'); gr.addColorStop(1, 'rgba(11,14,20,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 1080, B.h);
  const lg = x.createLinearGradient(0, 0, 1080, 0);
  lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.3, b.color); lg.addColorStop(0.7, b.color); lg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = lg; x.fillRect(0, 0, 1080, 2); x.fillRect(0, B.h - 2, 1080, 2);
  const title = fit(b.title, 760, UI(700, 40), x), sub = fit(b.sub || '', 760, UI(500, 24), x);
  const tW = Math.max(W(title, UI(700, 40), x), W(sub, UI(500, 24), x), capsW(b.type, 18, 600, x));
  const x0 = Math.max(24, 540 - (64 + 20 + tW) / 2);
  icon(b.icon, x0, 24, 64, 1, x);
  CAPS(b.type, x0 + 84, 30, 18, b.typeColor, 600, x);
  T(title, x0 + 84, 72, UI(700, 40), C.t1, 'left', x);
  if (sub) T(sub, x0 + 84, 100, UI(500, 24), C.soft, 'left', x);
  return c;
}
function buildFloater(f) {
  const font = UI(700, 30), w = 40 + W(f.text, font) + 12, c = mk(w + 8, 48), x = c.getContext('2d');
  icon(f.icon, 2, 8, 32, 1, x);
  TS(f.text, 42, 36, font, f.color || C.t1, 'left', x);
  return c;
}
function buildBar(ab) {
  const A = L.actionbar, c = mk(A.w, A.h), x = c.getContext('2d');
  chip(ab.code, 0, 9, 56, 22, actor(ab.code), true, x);
  TS(fit(String(ab.text).replace(/\s*\([^)]*\)/g, ''), A.w - 66, UI(700, 20), x), 66, 27, UI(700, 20), C.t1, 'left', x, 2.5);
  return c;
}
// Muse's rules, standing in the action bar's place between times: the bot's "effects"
function buildRules(rules) {
  const A = L.actionbar, c = mk(A.w, A.h), x = c.getContext('2d');
  const on = (rules.on || []).map((r) => (r.n === 'eat_below' ? `eat at ${r.v ?? '?'}` : r.n));
  chip('rules', 0, 9, 56, 22, C.rule, false, x);
  TS(fit(on.length ? on.join(' · ') : 'none', A.w - 66, UI(600, 20), x), 66, 27, UI(600, 20), on.length ? C.t1 : C.soft, 'left', x, 2.5);
  return c;
}
function buildChip(nc) {
  const N = L.nowchip, font = UI(700, 30), cnt = MONO(500, 30);
  const text = fit(nc.text, 380, font);
  const w = 6 + 14 + 40 + 14 + W(text, font) + (nc.count ? 16 + W(nc.count, cnt) : 0) + 20;
  const c = mk(w, N.h), x = c.getContext('2d');
  plate(0, 0, w, N.h, 10, x);
  x.save(); rr(0, 0, w, N.h, 10, x); x.clip(); rect(0, 0, 6, N.h, actor(nc.actor), x); x.restore();
  icon(nc.icon, 20, 12, 40, 1, x);
  let cx = 74; cx += T(text, cx, 43, font, C.t1, 'left', x);
  if (nc.count) T(nc.count, cx + 16, 43, cnt, C.soft, 'left', x);
  if (nc.p != null) { fillRR(74, N.h - 9, w - 94, 4, 2, C.track, x); fillRR(74, N.h - 9, (w - 94) * clamp(nc.p, 0, 1), 4, 2, actor(nc.actor), x); }
  return c;
}
function solid(w, h, color) { const c = mk(w, h), x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, w, h); return c; }

/* =====================================================================================================================
   THE DIRECTOR: what the video shows when (wall-clock ms), from what changed in the state
   ===================================================================================================================== */
const ENTER = 400; // a toast slides in
const MIN_UP = 1900; // a toast cut short by the next command: in, then 1.5 s still
const FADE = 5000 / FPS; // its card fades in 5 frames when it docks
const DOCK = 14000 / FPS; // its tile flies home in 14 frames
const FLASH = 600; // the home lights up once the tile is in
const BANNER = 5000; // in 0.5 s, still to 4 s, out in 1 s
const FLOAT = 1200; // a floater rises 36 px and fades
const BAR = 4200; // the action bar: in 0.2 s, 3 s still, out in 1 s
const NEWS_S = 8; // a thing older than this (game seconds) when first seen is not news

/**
 * The B HUD for one panel. o: {createCanvas, icon(name, size), has(name), emit(event)}.
 * update(state, t): the state at wall time t (ms); true when the HUD layer was drawn again.
 * compose(ctx, t): the frame into ctx (1080 x 1080, the video's place see-through); true when it changed.
 * epoch(t): changes when the HUD layer must be drawn again for the pieces that move (a toast's home).
 */
export function createHudB(o) {
  const inst = { MK: (w, h) => o.createCanvas(w, h), ICON: o.icon ?? (() => null), HAS: o.has ?? (() => false) };
  const use = (ctx) => { MK = inst.MK; ICON = inst.ICON; HAS = inst.HAS; if (ctx) g = ctx; };
  const emit = (ev) => { try { o.emit?.(ev); } catch { /* the recording is best effort */ } };
  const layer = o.createCanvas(1080, 1080);
  const lx = layer.getContext('2d');
  let M = null;
  let stNow = null;
  let seeded = false;
  let drawnSig = '';
  let layerNew = true;
  let drawnOver = '';
  let seq = 0;
  let toasts = []; // oldest first: {id, callId, key, n, arrive, start, dockStart, dockEnd, cmd, built, dock}
  let banners = []; // {id, kind, start, end, out, img, spec}
  let floats = []; // {start, img, x, y}
  let bar = null; // {start, img, spec}
  let rulesImg = null; let rulesSig = '';
  let nowChip = null; // {sig, img}
  let chipSince = null;
  const seen = { calls: new Set(), events: new Set(), splits: new Set(), goal: null, rules: null };
  let lastQa = [];
  let logoImg = null; // the logo, drawn once
  const flashLT = () => (inst.flashLT ??= solid(1080 - L.lt.bar - 24, L.lt.h, C.muse));
  const flashRow = () => (inst.flashRow ??= solid(1032, L.feed.row, C.muse));

  const cmdKey = (e) => `${e.tool}|${JSON.stringify(stepsOf(e).map((x) => [x.skill, x.args]))}`;
  function schedule(e, t) {
    const key = cmdKey(e);
    let live = toasts.filter((k) => k.dockEnd > t);
    let last = live[live.length - 1] ?? null;
    // the same command again while its toast is up: one toast, xN
    if (last && last.key === key && t < last.dockStart) {
      last.n += 1; last.callId = e.id; last.cmd = cmdModel(e); last.built = null;
      last.dockStart = Math.min(last.start + 9000, Math.max(last.dockStart, t + 2000)); last.dockEnd = last.dockStart + DOCK;
      emit({ ev: 'toast_fold', id: last.id, call: e.id, n: last.n, dockStart: last.dockStart, dockEnd: last.dockEnd });
      return;
    }
    // one still waiting to come in: it gives way (its command goes straight to the feed)
    if (last && last.start > t) {
      toasts = toasts.filter((k) => k !== last);
      emit({ ev: 'toast_skip', id: last.id, call: last.callId });
      live = live.filter((k) => k !== last);
      last = live[live.length - 1] ?? null;
    }
    // the one up is cut short: in, a short hold, then home
    if (last && t < last.dockStart) {
      last.dockStart = Math.max(t, last.start + MIN_UP); last.dockEnd = last.dockStart + DOCK;
      emit({ ev: 'toast_cut', id: last.id, dockStart: last.dockStart, dockEnd: last.dockEnd });
    }
    let start = Math.max(t, last ? last.dockStart + FADE : t);
    // a banner up gives way to a command
    for (const b of banners) if (b.start <= start && start < b.end) { b.out = Math.min(b.out, 300); b.end = Math.max(start, b.start + 300) + 0; start = Math.max(start, b.end); }
    const k = { id: ++seq, callId: e.id, key, n: 1, arrive: t, start, cmd: cmdModel(e), built: null, dock: null };
    use(); k.built = buildToast(k.cmd, 1);
    const hold = clamp(1.5 + k.built.chars / 18, 5, 9) * 1000;
    k.dockStart = start + hold; k.dockEnd = k.dockStart + DOCK;
    toasts.push(k);
    emit({ ev: 'toast', id: k.id, call: e.id, no: k.cmd.no ?? null, tool: e.tool, action: k.cmd.toastAction, why: k.cmd.why, icon: k.cmd.icon, arrive: t, start, dockStart: k.dockStart, dockEnd: k.dockEnd });
  }
  function addBanner(spec, t) {
    const busy = toasts.filter((k) => k.dockEnd > t).reduce((a, k) => Math.max(a, k.dockEnd), t);
    const prev = banners.filter((b) => b.end > t).reduce((a, b) => Math.max(a, b.end), t);
    const start = Math.max(busy, prev);
    if (start - t > 15_000) return; // too late to be news
    use();
    const b = { id: ++seq, start, end: start + BANNER, out: 1000, img: buildBanner(spec), spec };
    banners.push(b);
    emit({ ev: 'banner', id: b.id, kind: spec.kind, type: spec.type, title: spec.title, sub: spec.sub, icon: spec.icon, start, end: b.end });
  }
  function addFloat(spec, t) {
    const lastStart = floats.reduce((a, f) => Math.max(a, f.start), -Infinity);
    const start = Math.max(t, lastStart + 350);
    if (start - t > 2500) return;
    use();
    const img = buildFloater(spec);
    const i = floats.filter((f) => f.start + FLOAT > start).length % 2;
    floats.push({ start, img, x: L.floater.x - img.width / 2 + i * 40, y: L.floater.y - 36 });
    emit({ ev: 'floater', text: spec.text, icon: spec.icon, start });
  }
  function setBar(spec, t) {
    use();
    bar = { start: t, img: buildBar(spec), spec };
    emit({ ev: 'actionbar', code: spec.code, text: spec.text, start: t });
  }
  const evKey = (e) => `${e.atS}|${e.kind}|${e.text}`;
  const fresh = (s, nowS) => Number.isFinite(s) && nowS - s < NEWS_S;
  const goalSig = (gl) => (gl ? `${gl.key}|${gl.title}|${gl.text ?? ''}` : '');
  const rulesOn = (r) => (r ? JSON.stringify((r.on || []).map((x) => [x.n, x.v ?? null])) : '');
  // what is new in the state since the last look: toasts, banners, floaters, the action bar
  function detect(state, t, nowS) {
    const entries = (state.raw && state.raw.entries) || [];
    const evs = state.events || [];
    const gl = state.goal;
    const splits = gl && gl.kind === 'milestones' ? gl.list.filter((m) => m.state === 'done').map((m) => m.key) : [];
    if (!seeded) {
      // what is there already (a camera that came in mid-game) is not news
      for (const e of entries) seen.calls.add(e.id);
      for (const e of evs) seen.events.add(evKey(e));
      for (const k of splits) seen.splits.add(k);
      seen.goal = goalSig(gl); seen.rules = rulesOn(state.rules);
      seeded = true;
      return;
    }
    // commands: a toast each (set_goal: its banner), oldest first
    for (const e of [...entries].reverse()) {
      if (seen.calls.has(e.id)) continue;
      seen.calls.add(e.id);
      if (!CALLOUT_TOOLS.has(e.tool) || e.tool === 'set_goal' || refused(e) || !fresh(e.sentS, nowS)) continue;
      schedule(e, t);
    }
    // a toast whose command was refused meanwhile goes home at once
    for (const k of toasts) {
      if (k.dockEnd <= t || k.refused) continue;
      const e = entries.find((x) => x.id === k.callId);
      if (e && refused(e)) { k.refused = true; k.dockStart = Math.max(t, k.start + ENTER); k.dockEnd = k.dockStart + DOCK; k.dock = { kind: 'fade' }; }
      else if (e) {
        // its number known now, or its steps moved on: the card drawn again
        if ((e.callNo ?? e.playCallNo ?? null) !== (k.cmd.no ?? null) || (k.lastState !== undefined && e.state !== k.lastState)) { k.cmd = cmdModel(e); k.built = null; }
        k.lastState = e.state;
      }
    }
    // the goal changed (set_goal): its banner
    const gs = goalSig(gl);
    if (gl && gs !== seen.goal) {
      if (seen.goal !== null) {
        const p = gl.parts && gl.parts[0];
        const prev = gl.previous ? `${gl.previous.title} paused` : '';
        addBanner({ kind: 'goal', icon: p ? p.icon : gl.kind === 'milestones' ? 'portal' : 'star', type: 'New goal', typeColor: C.museType, color: 'rgba(176,164,255,0.9)', title: cap1(gl.title || gl.text || 'A new goal'),
          sub: [p ? `${p.done} of ${p.of} so far` : '', `set at ${mmss(nowS)}`, prev].filter(Boolean).join(' · ') }, t);
      }
      seen.goal = gs;
      for (const k of splits) seen.splits.add(k);
    }
    // a split done
    if (gl && gl.kind === 'milestones') {
      const n = gl.list.length;
      gl.list.forEach((m, i) => {
        if (m.state !== 'done' || seen.splits.has(m.key)) return;
        seen.splits.add(m.key);
        if (m.doneS != null && nowS - m.doneS > 30) return;
        addBanner({ kind: 'split', icon: m.icon, type: `Split ${i + 1} of ${n}`, typeColor: C.gold, color: 'rgba(255,209,100,0.85)', title: m.label, sub: `at ${m.done || mmss(nowS)}` }, t);
      });
    }
    // the rules changed: a floater over the bot
    const rs = rulesOn(state.rules);
    if (state.rules && rs !== seen.rules) {
      if (seen.rules) { const n = (state.rules.on || []).length; addFloat({ icon: 'shield', text: n ? `${n} rule${n === 1 ? '' : 's'} on` : 'rules off', color: C.rule }, t); }
      seen.rules = rs;
    }
    // the events: a death's banner, the rules and the bot on their own in the action bar, what it got and lost over it
    let newestBar = null;
    for (const e of [...evs].reverse()) {
      const k = evKey(e);
      if (seen.events.has(k)) continue;
      seen.events.add(k);
      if (!fresh(e.atS, nowS)) continue;
      if (e.kind === 'death') { addBanner({ kind: 'death', icon: 'heart', type: 'The bot died', typeColor: C.fail, color: 'rgba(255,138,122,0.9)', title: cap1(String(e.text).replace(/^died\s*\(?|\)$/g, '') || 'died'), sub: `at ${mmss(e.atS)}` }, t); continue; }
      if (e.who === 'rule') newestBar = { code: 'RULE', text: `${e.rule || 'rule'}: ${e.text}` };
      else if (e.who === 'body' && (e.kind === 'reflex' || e.kind === 'body')) newestBar = { code: 'BOT', text: cap1(e.text) };
      else if (e.kind === 'world') {
        const got = /^got (.+)$/.exec(e.text);
        if (got) for (const part of got[1].replace(/ and more$/, '').split(/,\s*| and /).slice(0, 2)) {
          const m = /^(?:(\d+)|an?) (.+)$/.exec(part.trim()); if (!m) continue;
          addFloat({ icon: itemIcon(m[2]), text: `+${m[1] || 1} ${m[2]}` }, t);
        }
        const hurt = /^took (\d+) damage/.exec(e.text);
        if (hurt) addFloat({ icon: 'heart', text: `-${hurt[1]}`, color: C.fail }, t);
      }
    }
    if (newestBar) setBar(newestBar, t);
    // a seen set never grows past a game's worth
    if (seen.events.size > 2000) seen.events = new Set([...seen.events].slice(-500));
    if (seen.calls.size > 2000) seen.calls = new Set([...seen.calls].slice(-500));
  }
  // the homes still waiting for a toast's tile
  function pending(t) {
    const p = { ltIcon: false, why: false, feedIcons: new Set() };
    for (const k of toasts) {
      if (t >= k.dockEnd || k.refused) continue;
      const lt = k.dock ? k.dock.kind === 'lt' : M && M.cmd && M.cmd.id === k.callId && M.cmd.running;
      if (lt) { p.ltIcon = true; p.why = true; } else p.feedIcons.add(k.callId);
    }
    return p;
  }
  function staticSig(Mx, p) {
    return JSON.stringify([Mx.hp, Mx.food, Mx.phase, Mx.tally, Mx.calls, Mx.clock, Mx.code, Mx.status && { ...Mx.status, steps: Mx.status.steps && Mx.status.steps.map((x) => [x.state, x.sub, x.skill, x.args, x.say]) },
      Mx.next, Mx.why, Mx.whyIcon, Mx.polls && Mx.polls.n, Mx.cmd && Mx.cmd.id, Mx.goal, Mx.feed, Mx.raw.slice(0, 3), Mx.inv, p.ltIcon, p.why, [...p.feedIcons]]);
  }
  const api = {
    update(state, t, opt = {}) {
      use();
      stNow = state;
      const nowS = Number(state.now && state.now.gameS) || 0;
      M = buildModel(state, nowS);
      detect(state, t, nowS);
      const p = pending(t);
      const sig = staticSig(M, p);
      if (sig === drawnSig && !opt.force) return false;
      lx.setTransform(1, 0, 0, 1, 0, 0);
      lx.clearRect(0, 0, 1080, 1080);
      if (opt.qa) QA = [];
      if (!logoImg && o.logo && o.logo.img && o.logo.img.width) { try { use(); logoImg = buildLogo(o.logo.img, o.logo.style); } catch { logoImg = null; } }
      try { drawStatic(lx, M, p, logoImg); } finally { lastQa = QA ?? []; QA = null; }
      drawnSig = sig;
      layerNew = true;
      return true;
    },
    epoch(t) {
      return toasts.filter((k) => t < k.dockEnd + FLASH).map((k) => `${k.id}${t < k.start ? 'w' : t < k.dockStart ? 'u' : t < k.dockEnd ? 'd' : 'h'}${k.n}`).join(',');
    },
    compose(ctx, t) {
      use();
      const list = []; const sig = [];
      const put = (img, x, y, a, id) => { if (!img || a <= 0.004) return; list.push([img, Math.round(x), Math.round(y), Math.min(1, a)]); sig.push(`${id}:${Math.round(x)},${Math.round(y)},${Math.round(a * 100)}`); };
      // the rules in the action bar's place, under a rule firing
      let barA = 0;
      if (bar) {
        const age = t - bar.start;
        barA = age < 0 ? 0 : age < 200 ? age / 200 : age < BAR - 1000 ? 1 : age < BAR ? 1 - (age - (BAR - 1000)) / 1000 : 0;
        if (age >= BAR) bar = null;
      }
      if (stNow && stNow.rules) {
        const rsig = rulesOn(stNow.rules) + WHO_CODE;
        if (rsig !== rulesSig) { rulesImg = buildRules(stNow.rules); rulesSig = rsig; }
        put(rulesImg, L.actionbar.x, L.actionbar.y, 1 - barA, 'rules');
      }
      if (bar) put(bar.img, L.actionbar.x, L.actionbar.y, barA, `bar${bar.start}`);
      // floaters: rise 36 px and fade
      floats = floats.filter((f) => t < f.start + FLOAT);
      for (const f of floats) { if (t < f.start) continue; const p = (t - f.start) / FLOAT; put(f.img, f.x, f.y - 36 * p, 1 - p * p, `f${f.start}`); }
      // the banner
      banners = banners.filter((b) => t < b.end);
      let bannerUp = false;
      for (const b of banners) {
        if (t < b.start) continue;
        const age = t - b.start, a = Math.min(age < 500 ? age / 500 : 1, (b.end - t) / b.out);
        put(b.img, 0, L.banner.y, a, `b${b.id}`); bannerUp = true;
      }
      // the toasts: the one docking (card fading, tile flying home), the one up; then the homes lighting up
      toasts = toasts.filter((k) => t < k.dockEnd + FLASH);
      let toastUp = false;
      const late = [];
      for (const k of toasts) {
        if (t < k.start) continue;
        if (!k.built) k.built = buildToast(k.cmd, k.n);
        const B = k.built, TL = L.toast;
        const u = (t - k.start) / 1000;
        if (t >= k.dockEnd) {
          const age = t - k.dockEnd;
          if (k.dock && k.dock.kind === 'lt') put(flashLT(), L.lt.bar + 8, L.lt.y, 0.18 * (1 - age / FLASH), `fl${k.id}`);
          else if (k.dock && k.dock.kind === 'feed') put(flashRow(), 24, L.feed.y + k.dock.row * L.feed.row, 0.2 * (1 - age / FLASH), `fr${k.id}`);
          continue;
        }
        toastUp = true;
        let x = TL.x; const y = TL.y;
        if (u < ENTER / 1000) x = 1080 + (TL.x - 1080) * outQuint(u / (ENTER / 1000));
        const wa = clamp((u * FPS - 9) / 9, 0, 1);
        const docking = t >= k.dockStart;
        if (docking && !k.dock) {
          // home: the command bar's tile while it runs, else its feed row, else nowhere (it fades)
          const ri = M ? M.feed.findIndex((r) => r.id === k.callId) : -1;
          if (M && M.cmd && M.cmd.id === k.callId && M.cmd.running) k.dock = { kind: 'lt', x: L.lt.tileX, y: L.lt.tileY };
          else if (ri >= 0) k.dock = { kind: 'feed', row: ri, cx: FEED_ICON_X + 12, cy: L.feed.y + ri * L.feed.row + 14 };
          else k.dock = { kind: 'fade' };
          emit({ ev: 'toast_dock', id: k.id, call: k.callId, to: k.dock.kind, at: t });
        }
        const f = (t - k.dockStart) * FPS / 1000;
        const cardA = docking ? 1 - clamp(f / 5, 0, 1) : 1;
        put(B.base, x, y, cardA, `tb${k.id}`); put(B.words, x, y, cardA, `tw${k.id}`);
        if (B.why) put(B.why, x, y, cardA * wa, `ty${k.id}`);
        const tx0 = x + B.tileOff.x, ty0 = y + B.tileOff.y;
        if (!docking) put(B.tile, tx0, ty0, 1, `tt${k.id}`);
        else {
          const p = inOut((t - k.dockStart) / (k.dockEnd - k.dockStart));
          const d = k.dock;
          if (d.kind === 'lt') late.push([B.tile, tx0 + (d.x - tx0) * p, ty0 + (d.y - ty0) * p, 1, `tt${k.id}`]);
          else if (d.kind === 'feed') {
            const cx = tx0 + 36 + (d.cx - tx0 - 36) * p, cy = ty0 + 36 + (d.cy - ty0 - 36) * p, s = clamp((p - 0.35) / 0.45, 0, 1);
            late.push([B.tile, cx - 36, cy - 36, 1 - s, `tt${k.id}`]); late.push([B.small, cx - 12, cy - 12, s, `ts${k.id}`]);
          } else put(B.tile, tx0, ty0, cardA, `tt${k.id}`);
        }
      }
      // the now chip: what the bot does for the caller, when no toast or banner holds the top right
      const running = M && M.status && M.status.kind === 'run';
      if (running && !toastUp && !bannerUp) {
        const cur = M.status.cur || {};
        let text, count = '', p = null;
        if (cur.sub && cur.sub.of) { text = cap1(cur.sub.text || stepSay(cur)); count = `${cur.sub.done}/${cur.sub.of}`; p = cur.sub.done / cur.sub.of; }
        else text = stepSay(cur) || M.status.words;
        const ic = cur.skill ? stepIcon(cur) : M.status.icon;
        const nsig = `${text}|${count}|${ic}|${p === null ? '' : Math.round(p * 100)}|${WHO_CODE}`;
        if (!nowChip || nowChip.sig !== nsig) nowChip = { sig: nsig, img: buildChip({ actor: WHO_CODE, icon: ic, text, count, p }) };
        if (chipSince === null) chipSince = t;
        put(nowChip.img, L.nowchip.right - nowChip.img.width, L.nowchip.y, clamp((t - chipSince) / 300, 0, 1), `n${nsig}`);
      } else chipSince = null;
      for (const x of late) put(...x);
      const key = sig.join(';');
      if (!layerNew && key === drawnOver) return false;
      ctx.clearRect(0, 0, 1080, 1080);
      ctx.drawImage(layer, 0, 0);
      for (const [img, x, y, a] of list) { ctx.globalAlpha = a; ctx.drawImage(img, x, y); }
      ctx.globalAlpha = 1;
      layerNew = false;
      drawnOver = key;
      return true;
    },
    /** Another game: nothing is news until the next look. */
    reset() { toasts = []; banners = []; floats = []; bar = null; nowChip = null; chipSince = null; seeded = false; drawnSig = ''; layerNew = true; for (const k of ['calls', 'events', 'splits']) seen[k] = new Set(); seen.goal = null; seen.rules = null; },
    get model() { return M; },
    get qa() { return lastQa; },
    /** The pieces scheduled (for tests): toasts, banners, floaters, the action bar. */
    get plan() { return { toasts: toasts.map(({ built, cmd, ...k }) => ({ ...k, action: cmd.toastAction })), banners: banners.map(({ img, ...b }) => b), floats: floats.map(({ img, ...f }) => f), bar: bar ? { start: bar.start, ...bar.spec } : null }; },
  };
  return api;
}
