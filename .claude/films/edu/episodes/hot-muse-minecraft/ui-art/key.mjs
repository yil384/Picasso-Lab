// Key the green-screen sheets (art/*.png, 2x2 grids from gen.sh) into the stream UI's sprites and icons:
// agent/assets/muse-ui/{sprites,icons}/<name>.png with a transparent background. The mascot's poses are aligned on its
// helmet (the same in every pose) and scaled to the same helmet width, so a cross-fade between two poses never jumps.
// usage: node key.mjs   (from anywhere; paths are relative to this file)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const agent = path.join(here, '..', 'agent');
const require = createRequire(path.join(agent, 'package.json'));
const { createCanvas, loadImage } = require('canvas');

const SHEETS = {
  sheet1: ['idle', 'idle_blink', 'thinking', 'thinking_blink'],
  sheet2: ['working', 'working_blink', 'commanding', 'cheering'],
  sheet3: ['worried', 'hurt', 'nether', 'nether_blink'],
};
const ICONS = { icons1: ['heart', 'food', 'sun', 'moon'], icons2: ['flame', 'shield', 'bulb', 'star'] };
// the skills' icons, a 3x3 sheet
const SKILL_ICONS = {
  skills1: ['pickaxe', 'boot', 'hammer', 'sword', 'house', 'portal', 'bucket', 'compass', 'bed'],
  // the HUD's items (inventory, goals, the depth), 3x3 sheets too
  items1: ['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'diamond', 'iron_ingot', 'raw_iron', 'coal', 'obsidian'],
  items2: ['flint_and_steel', 'water_bucket', 'lava_bucket', 'steak', 'bread', 'cobblestone', 'log', 'depth', 'ender_pearl'],
  // the second batch (gen-items-more.sh): items the HUD showed as a stand-in (a craft step -> hammer, a pick-up -> star)
  items3: ['crafting_table', 'stick', 'oak_planks', 'furnace', 'wooden_sword', 'wooden_axe', 'stone_sword', 'torch', 'chest'],
  items4: ['flint', 'gravel', 'dirt', 'porkchop', 'iron_sword', 'gold_ingot', 'netherrack', 'blaze_rod', 'ender_eye'],
  // (items5's two axes read as adzes at 24 px: null = not keyed; items6 has them again)
  items5: ['cobbled_deepslate', 'sand', 'apple', null, null, 'white_wool', 'string', 'bone', 'beef'],
  items6: ['stone_axe', 'iron_axe', 'chicken', 'mutton', 'feather', 'leather', 'arrow', 'gunpowder', 'iron_chestplate'],
};
const OUT = path.join(agent, 'assets', 'muse-ui');

/** Green to transparent: how much greener than its red and blue a pixel is, with the green spill taken out. */
function key(img) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const over = g - Math.max(r, b);
    if (over <= 18) continue;
    const a = Math.max(0, Math.min(1, 1 - (over - 18) / (100 - 18)));
    d[i + 1] = Math.max(r, b); // no green fringe
    d[i + 3] = Math.round(a * 255);
  }
  return img;
}

/** The cells of an n x n sheet (2 by default), keyed, row by row. */
async function cells(file, n = 2) {
  const im = await loadImage(file);
  const w = Math.floor(im.width / n);
  const h = Math.floor(im.height / n);
  const out = [];
  const at = [];
  for (let cy = 0; cy < n; cy++) for (let cx = 0; cx < n; cx++) at.push([cx, cy]);
  for (const [cx, cy] of at) {
    const c = createCanvas(w, h);
    const g = c.getContext('2d');
    g.drawImage(im, cx * w, cy * h, w, h, 0, 0, w, h);
    g.putImageData(key(g.getImageData(0, 0, w, h)), 0, 0);
    out.push(c);
  }
  return out;
}

/**
 * The helmet (amber-orange pixels): its centre and width, the anchor every pose is aligned on. Columns with many such
 * pixels, the longest run of them: sparkles, stars and a fan are only a few pixels a column.
 */
function helmet(c) {
  const { data, width, height } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  const isHelmet = (i) => data[i + 3] > 200 && data[i] > 200 && data[i + 1] > 110 && data[i + 1] < 185 && data[i + 2] < 90;
  const cols = new Array(width).fill(0);
  for (let y = 0; y < height * 0.4; y++) for (let x = 0; x < width; x++) if (isHelmet((y * width + x) * 4)) cols[x] += 1;
  let best = [0, -1];
  for (let x = 0, run = -1; x <= width; x++) {
    if (x < width && cols[x] >= 14) { if (run < 0) run = x; continue; }
    if (run >= 0 && x - run > best[1] - best[0]) best = [run, x];
    run = -1;
  }
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < height * 0.4; y++) for (let x = best[0]; x < best[1]; x++) if (isHelmet((y * width + x) * 4)) { n += 1; sx += x; sy += y; }
  return { x: sx / n, y: sy / n, w: best[1] - best[0], n };
}

/** The box of the opaque pixels. */
function box(c) {
  const { data, width, height } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  return { x0, y0, x1, y1 };
}

fs.mkdirSync(path.join(OUT, 'sprites'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// the poses: one canvas size, the helmet at the same spot and the same width in all (ICONS_ONLY=1: the icons only)
const poses = [];
for (const [sheet, names] of process.env.ICONS_ONLY ? [] : Object.entries(SHEETS)) {
  const cs = await cells(path.join(here, 'art', `${sheet}.png`));
  // a blink is the cell beside its pose and drawn at the same spot: it takes its pose's anchor, so a blink never moves
  const hs = cs.map((c) => helmet(c));
  cs.forEach((c, i) => poses.push({ name: names[i], c, h: names[i].endsWith('_blink') ? hs[i - 1] : hs[i] }));
}
const widths = poses.map((p) => p.h.w).sort((a, b) => a - b); // (none with ICONS_ONLY)
const refW = widths[Math.floor(widths.length / 2)];
const SIZE = 560;
const AX = 0.47 * SIZE; // where the helmet's centre goes
const AY = 0.27 * SIZE;
for (const p of poses) {
  const k = 1; // the sheets draw it at one size; the helmet is the anchor for the position only
  const c = createCanvas(SIZE, SIZE);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(p.c, AX - p.h.x * k, AY - p.h.y * k, p.c.width * k, p.c.height * k);
  const b = box(c);
  fs.writeFileSync(path.join(OUT, 'sprites', `${p.name}.png`), c.toBuffer('image/png'));
  console.log(`${p.name.padEnd(15)} helmet at ${Math.round(p.h.x)},${Math.round(p.h.y)}, box ${b.x0},${b.y0} - ${b.x1},${b.y1}`);
}

// the icons: trimmed to their box, square, 256 px
for (const [sheet, names] of [...Object.entries(ICONS), ...Object.entries(SKILL_ICONS)]) {
  if (!fs.existsSync(path.join(here, 'art', `${sheet}.png`))) continue;
  const cs = await cells(path.join(here, 'art', `${sheet}.png`), sheet in SKILL_ICONS ? 3 : 2);
  cs.forEach((c, i) => {
    if (!names[i]) return; // a cell left out (redrawn on a later sheet)
    const b = box(c);
    const side = Math.max(b.x1 - b.x0, b.y1 - b.y0) + 8;
    const out = createCanvas(256, 256);
    const g = out.getContext('2d');
    g.imageSmoothingQuality = 'high';
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    g.drawImage(c, cx - side / 2, cy - side / 2, side, side, 0, 0, 256, 256);
    fs.writeFileSync(path.join(OUT, 'icons', `${names[i]}.png`), out.toBuffer('image/png'));
  });
  console.log(`${sheet}: ${names.filter(Boolean).join(', ')}`);
}
