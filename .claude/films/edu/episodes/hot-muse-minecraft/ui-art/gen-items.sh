#!/bin/bash
# The HUD's item icons (inventory, goals, the depth): two 3x3 sheets with Codex's image tool, in the style of the UI's
# earlier icons (art/skills1.png, art/icons2.png as references); then `ICONS_ONLY=1 node key.mjs` keys them into
# agent/assets/muse-ui/icons/ (names in key.mjs: items1, items2).
cd "$(dirname "$0")"
export NOCHAR=1
COMMON="A 3x3 grid of nine equal square cells (an icon sheet), one simple icon centered in each cell at the same size (about half the cell), in exactly the same polished sticker style as the reference icons (soft cel shading, thin dark plum outline, a small white shine), smooth rounded shapes, nothing blocky or pixelated, no Minecraft look, clearly readable when shown very small (24 px): bold simple silhouettes, strong colour contrast, no tiny details. No faces on the icons."
./gen.sh items1 "$COMMON Row 1: a pickaxe with a wooden handle and a light tan wooden head; a pickaxe with a wooden handle and a grey stone head; a pickaxe with a wooden handle and a bright silver-white iron head. Row 2: a pickaxe with a wooden handle and a cyan diamond head; a single faceted cyan diamond gem; one silver-white iron ingot bar. Row 3: a lump of raw iron ore, beige-pink rough nugget; a black lump of coal; a rounded block of obsidian, very dark purple-black glassy stone with violet highlights." art/skills1.png art/icons2.png &
./gen.sh items2 "$COMMON Row 1: a flint and steel striker (a C-shaped steel ring and a dark grey flint chip with a small spark); a metal bucket filled with blue water; a metal bucket filled with glowing orange lava. Row 2: a cooked steak, brown with grill marks; a loaf of golden bread; a chunk of grey cobblestone. Row 3: a short wooden log with rings on its end; a cross-section of ground layers (grass, dirt, grey stone, dark deepslate) with a small down arrow beside it; a dark green round ender pearl with a teal glow." art/skills1.png art/icons2.png &
wait
