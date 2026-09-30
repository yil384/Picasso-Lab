# Brief: rebuild Team-page avatar effects on the three.js + q5 kit

You are rebuilding click-to-activate avatar effects for the Picasso Lab Team page
(https://yufeiding.ucsd.edu/people/team, Google Sites). Repo: `/home/user/Picasso-Lab`
(branch `claude/beautiful-einstein-0qnvta`). Scratch dir with test tools:
`/tmp/picasso-tools` (call it `$SP`).

The user's words (Chinese): the old `people/*.html` effects are "outdated early versions, not smooth and
low quality, but the ideas are good — keep the ideas, rebuild them all with three.js + p5.js + whatever,
make them better, model and front-end tech have improved". The quality bar they already approved is
`people/xinwei_masterchef.html` (comic-sticker look, props fitted precisely to the real photo, real hands
re-layered over the handles, calm loop). The site's visual language elsewhere is "3D comic": matte toon
shading, ink outlines, halftone, bold simple silhouettes; never "HTML-ish/AI-ish" generic glow, glossy
default three.js, clutter, or UI panels.

## How the system works (read these files first)
1. `people/fx/kit.js` — the shared runtime (read it fully; the header explains the contract).
2. `people/fx/alon.js` + `people/alon_iron_man.html` — a finished example (Iron Man) to copy the structure from.
3. `people/xinwei_masterchef.html` — the quality bar (SVG/CSS, not on the kit; do NOT modify it).
4. The old file for your person (`people/<file>.html`) — the creative idea, props and where they sat.
   Old CSS positions are in a 200 x 200 stage; multiply by 512/200 = 2.56 to get photo px.
5. `.claude/skills/picasso-sites-embed/SKILL.md` — Google Sites embed rules (absolute URLs etc.).

Key facts:
- The pasted snippet (`people/<file>.html`) shows the photo; on first hover/touch it imports the kit and
  `people/fx/<name>.js`; a click toggles the effect. Copy `people/alon_iron_man.html` EXACTLY and change only:
  the header comment (describe your effect), `data-fx="<name>"`, `aria-label`, the `<img src>` (the person's
  photo `people/static/<name>.webp`). Keep the import map, CSS and loader identical.
- Scene module `people/fx/<name>.js`: `export default { title, exit, still, plate, async build(k) { ...; return { update(t, e, dt), draw2d(q, t, e), dispose() } } }`.
  - `t` = seconds since the click; `e` = exit progress (0 while on, runs 0 -> 1 in `exit` seconds after the
    second click; it can reverse if clicked again). Everything must be a function of (t, e) — no internal clocks.
  - Import only from `./kit.js` (`THREE` is re-exported) and optionally `three/addons/...` (the import map
    in the snippet maps it). No other network assets except `k.STATIC` (people/static/) files that exist.
  - World units = CSS px, origin = avatar centre, y up, z toward viewer. Avatar is a 200 px circle (k.R = 100).
  - `k.at(u, v, z)` maps a photo pixel (0..512) to world at depth z (size-compensated, so things at depth z
    land on that photo pixel on screen). `k.screenAt(u, v)` / `k.toScreen(vec3)` give CSS px for q5.
  - Layers: `k.layers.photo` (original photo, z = -36), `k.layers.plate` (person inpainted out, z = -36),
    `k.layers.person` (cut-out, z = 0), `k.layers.mask` (stencil disc). By default the kit crossfades
    photo -> plate in the first 0.35 s (set `plate: false` to keep the photo). You may tint/fade these
    (e.g. `k.layers.plate.material.color`, `.opacity`) or hide the plate/photo to put a new set behind the
    person (set pieces between z = -36 and 0; use `k.clip(material)` to keep them inside the circle).
  - `k.patch([[u,v],...], z)` re-layers a polygon of the real photo (a hand, fingers) in front at depth z, so a
    prop at a depth between 0 and z sits "in" the hand, like Xinwei's pan. Use this for held props.
  - Helpers: `k.toon(color)` cel material, `k.ink(mesh, px)` outline, `k.show(obj, amount, baseScale)`
    (hides at 0 — always use it for things that scale in, or ink outlines leave black specks),
    `k.card(w, h, draw)` a canvas-drawn plane, `k.canvasTexture`, `k.glowSprite`, `presence(t, e, t0, dur, easeFn, order)`,
    `env`, `ease.*`, `rng`, `clamp`, `lerp`.
  - `draw2d(q, t, e)` draws the screen-space comic layer with q5.js (the p5.js API, instance `q`, CSS px of the
    whole iframe): lettering, sparks, speed lines, brush strokes. Use system fonts only
    (`ui-monospace, Menlo, monospace`; `Georgia, serif`; `'Arial Black', Impact, sans-serif`; Chinese:
    `'Kaiti SC', STKaiti, KaiTi, 'Songti SC', STSong, SimSun, serif` or `'PingFang SC', 'Microsoft YaHei', sans-serif`).
- Landmarks: `$SP/grids/<name>.jpg` is the photo at 768 px with a grid: red lines every 128 photo px, yellow
  every 32, labels every 64 (photo px = image px / 1.5). Read it to find eyes, head top, hands, chest.
  Cut-out / plate previews: `people/static/fx/<name>-cut.webp`, `<name>-plate.webp` (plates are blurry where
  the person was — never show a large plate area around the person without covering it with a new set).

## Hard rules
- Default state is the plain photo; the first rendered frame (t = 0) must look exactly like the photo: every
  prop starts hidden (use `k.show`/presence).
- Everything stays inside the avatar circle, overflowing it by at most ~8 px (the embed tile has almost no
  margin on some sides; desktop puts the photo top-left, phones bottom-centre). Breaking the frame slightly for
  one prop is fine.
- Entrance ≤ ~1.3 s, staged (not everything at once). Then a CALM loop (period 3–4 s, the busy part ≤ ~25 %
  of the beat, like Xinwei's 3.2 s beat). Exit (as e -> 1) ≤ 0.5 s: props leave quickly, backdrop restores,
  and at e = 1 the image must be exactly the photo again.
- Readable at 200 px: few, bold, well-placed elements beat many small ones. Text ≥ 8 px, short.
- No emoji anywhere. No external images. Keep polygon counts modest (< 40k triangles), no per-frame allocations
  in hot loops (reuse vectors/colors), textures ≤ 512 px.
- Do not edit `people/fx/kit.js`, `people/fx/alon.js`, xinwei, `people/haotian_shen.html`, `people/yufei_cats.html`,
  or any file not assigned to you. If you need a helper, write it inside your scene file.
- Do not `git commit` or push — the lead reviews and commits. Just leave your files in the working tree.
- Be tasteful and respectful: these are real lab members; affectionate parody only.

## Test loop (do at least 3 rounds; trust frames, not code)
From `$SP`:
```bash
cd $SP
# desktop tile, 2x pixels. args: <snippet name> <prefix> [times csv] [exit csv] [phone 0/1]
DSF=2 NODE_PATH=/opt/node22/lib/node_modules timeout 300 node pfx_test.js <snippet> <name>_d 0,0.2,0.5,0.9,1.3,2.2,3.4 0.3,0.7,1 0
python3 pgrid.py shots/g_<name>_d.jpg <name>_d        # then Read shots/g_<name>_d.jpg
# phone tile
NODE_PATH=/opt/node22/lib/node_modules timeout 300 node pfx_test.js <snippet> <name>_m 0.5,1.3,2.2 "" 1
python3 pgrid.py shots/g_<name>_m.jpg <name>_m
```
`pfx_test.js` renders the snippet the way Google Sites does (document.write into a tile-sized iframe),
hovers, clicks, holds the effect clock at each time, grabs a tilt frame (pointer at the top-right), runs the
exit and prints any console errors (must be none) and the state after switching off (`[false,"","false"]`
means the WebGL context was released and the photo is back). Individual frames are `shots/<prefix>_t###.jpg`
— open single frames at full size to check placement and detail. Use your own prefixes only.
Always check: t = 0 identical to idle; props sit exactly on the intended landmark; nothing clipped by the tile
edge; phone frames; exit frames end on the plain photo; zero console errors.

## Report back (concise)
For each person: the timeline (what happens when), which old ideas you kept/changed/dropped and why, the
landmark coordinates you used, test results (console clean? off-state OK?), and anything you are unsure about.
