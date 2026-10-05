# kit2d: the channel's 2D engine (paper theatre, risograph press, felt puppets)

A 2D-first engine for the explainer channel, running on the pv runtime (`defineScene`, a `'2d'` layer). It combines
three kits:

- **Stage** (`stage.js`): a toy-theatre compositor. Flat pieces sit on z-planes and are seen through a perspective
  camera. Depth of field is a thin-lens blur per depth group. Horizontal floors (the desk, the stage boards) are projected
  row by row with their own blur bands. Each plane is lit by its own multiply light map of gel pools, so a backdrop wash
  never tints the puppet in front of it. Screen-blended beams carry dust that turns to bokeh out of focus, and pieces in
  front hide them. Vignette and grain finish the frame.
- **Riso press** (`riso.js`): you draw ink coverage on per-ink plates, then print. The press multiplies inks over paper
  through rotated halftone screens, slightly out of register, with uneven inking and paper grain. A press can print a
  full frame, or a poster or card that the stage then hangs.
- **Materials, set and cast** (`material.js`, `set.js`, `cat.js`): procedural paper and felt textures, hand-cut
  wobbly edges, fuzz, thread stitches, torn edges, splines and tapered strips, and baked sprites with soft drop shadows.
  On top of these sit the lab's toy theatre on the night desk and the felt cat puppet.

Every frame is a pure function of `t`. Randomness is hashed, never `Math.random`, and every sprite is baked once from
a seed. Stop-motion pieces move on twos (`DRAW_FPS = 15` at the series' 30 fps), while the camera, dust and grain move
on ones. Checked: the same frame rendered in two separate runs, in different orders, is pixel-identical. Vertical
1080x1920 first.

## Try it
```sh
python3 .claude/films/edu/tools/snap.py kit2d/test.html 0 --out DIR                 # the test frame (EN)
python3 .claude/films/edu/tools/snap.py kit2d/test.html 0 --out DIR --q lang=zh     # Chinese strings on the poster
python3 .claude/films/edu/tools/snap.py kit2d/test.html 0 --out DIR --q guides=1    # X + Douyin safe zones
python3 .claude/films/edu/tools/snap.py kit2d/test.html 0 6 9 12 18 36 --out DIR --q fly=1   # the poster flies in
python3 .claude/films/edu/kit2d/fonts.py kit2d/test.html     # after adding Chinese strings (subsets -> kit2d/fonts/)
```
On the M2, booting the page takes 1-2.5 s (bakes the set and the cat, prints the poster). After that, a 1080x1920 frame
takes 0.3-0.9 s. The page shows a toy theatre on a dark desk with red felt curtains half open, one bastard-amber gel
spot with dust, the felt cat looking up, and a riso poster ("MORE IS DIFFERENT" / 《多者异也》 over a rising curve)
flown in from the fly loft. The curve is **illustrative, not data**. "P. W. Anderson, Science, 1972" and the Chinese
title 《多者异也》 are both correct (checked 2026-10-04), but the episode's `FACTS.md` must still clear them before
they are used on screen.

## A scene in 25 lines
```js
import { defineScene } from '/pv/runtime/pv.js';
import { makeStage, bakeSet, theatre, makePress, tone, bakeCard, flyCard, bakeCat, feltCat, openingP, loadImg, L } from '/edu/kit2d/index.js';
let ST, SP, CAT, CARD;
defineScene({
  meta: { durationFrames: 90, fps: 30, width: 1080, height: 1920, design: [1080, 1920], fonts: ['Fraunces'] },
  async setup(ctx) {
    ST = makeStage({ W: ctx.W, H: ctx.H, S: ctx.S, OX: ctx.cfg.OX, OY: ctx.cfg.OY, DW: ctx.DW, DH: ctx.DH });
    SP = bakeSet({ wood: await loadImg('/scene/tex/Wood026/Wood026_2K-JPG_Color.jpg') }); CAT = bakeCat();
    const press = makePress({ W: 640, H: 800, k: 2, unit: 1, inks: ['yellow', 'pink', 'navy'] }); press.begin();
    press.plate('yellow').fillRect(0, 0, 320, 400); /* ... draw plates ... */ CARD = bakeCard(press.print({ key: 'p' }), 320, 400);
  },
  layers: [{ name: 'stage', type: '2d', draw(ctx, g) {
    const K = ST.frame(ctx.sec), open = { z: L.PROSC_Z, path: (x) => openingP(0).forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))) };
    K.focus(1110, 14); K.ambient(40, 38, 64);
    K.light({ x: 40, y: -60, z: 1110, rx: 330, ry: 560, c: [255, 198, 155], zmin: 1000, zmax: 1300 });
    K.beam({ src: { x: -230, y: -1300, z: 1110 }, x: 120, y: L.FLOOR_Y, z: 1080, rx: 200, a: .35, clip: open, occ: 1000 });
    theatre(K, SP); flyCard(K, CARD, 1150, -36, -405, { clip: open, top: -560 });
    feltCat(K, 1080, CAT, { x: 128, y: L.FLOOR_Y, s: .9, look: [-.6, -.9], brows: 1, mouth: .45 });
    ST.render(K, g);
  } }],
});
```

## API

### Stage (`stage.js`)
`makeStage({ W, H, S, OX, OY, DW, DH, F = 1000, lmk = .25, bg })` takes the output size and the pv design-to-output
transform, and returns `{ frame(t) -> K, render(K, g), proj(cam, x, y, z) }`. World units: at depth `d = z - cam.z`,
one unit is `F / d` design px. The plane `z = 1000` is 1:1 with the camera at `z = 0`, `(0,0)` is the frame centre,
and y points down.

Members of `K` (a fresh one each frame):
- `K.cam = { x, y, z, roll }`.
- `K.focus(z, A = 20, max = 24)`: thin-lens depth of field, blur px = `A * |1/df - 1/d| * F * S`. `A = 0` turns it off.
- `K.add(z, fn, { sharp, blur })`: `fn(x)` draws in world units at depth `z`. Pieces with the same quantised blur and
  the same lights share one offscreen pass.
- `K.floor({ y, z0, z1, x0, x1, src, tint, over })`: a horizontal textured plane, with `src` top row = far edge.
- `K.light({ x, y, z, rx, ry, c, a, soft, rot, clip, zmin, zmax })`: a pool on the light map. `zmin`/`zmax` limit the
  planes it lights, and `clip: { z, path(x) }` limits it to, say, the opening.
- `K.ambient(r, g, b)`: the light-map floor.
- `K.beam({ src, x, y, z, rx, c, a, w0, soft, fade, dust, dustA, dustSize, depth, u0, clip, occ })`: a shaft with dust.
  `occ: z` means pieces nearer than z hide it, and `u0` starts the dust part-way down the shaft.
- `K.clipTo(x, z, clip)`: inside a draw fn, clip to a path drawn on another plane. A flown piece uses this to show only
  through the opening.
- `K.vignette(a)`, `K.grain(a)`, `K.haze(a)`; `K.proj(x, y, z)`, `K.blurAt(z)`.

### Materials (`material.js`)
- **Shapes**:
  - `rrect`, `ellipseP`, `polarP(cx, cy, rx, ry, fn)`, `densify`, `starP`, `segP`, `arcP`
  - `spline` and `cspline` (centripetal: no overshoot at corners), `taper(ctrl, widths)` (tails, stems), `inset(pts, d)`
  - `runWhere(outline, pred)` (an open run of an outline: a seam that stops short)
  - `wobble(pts, amp, rng)` (hand-cut edge; it **requires** an rng, so randomness can never depend on call order)
  - `torn(poly, seed, { offset, offVar, jag })` (a torn paper edge)
- **Cutting**: `cut(x, polys, color, o)` makes one piece of paper or felt. Options: `felt`/`white` texture, `tex`,
  `ts`, `hi`/`lo` shading, `edge`, `fuzz` with `fuzzColor`/`fuzzDensity`/`fuzzAlpha`, `halo` (a soft wool outline),
  `sh` (inner shadow), `rule`, and `inner(x, bbox)`.
- **Surface detail**: `fuzz`, `nap` (surface fibres), `stitch(x, pts, o)` (running stitch drawn stitch by stitch with a
  shadow and a highlight), `thread(x, pts, o)` (embroidery: mouths, lashes, whiskers).
- **Sprites**: `bake(box, { K, pad, blur, seed }, fn)` returns `{ c, s, box, ... }`. `fn` draws in the box's own
  coordinates, and `s` is a soft dark silhouette for the drop shadow. `spr(x, S, px, py, { sc, sx, sy, rot, alpha, so,
  sa, shadow, ax, ay })` works in origin mode (the sprite's own origin lands at `px, py`) or, given `ax`/`ay`, in anchor
  mode. `imageSprite(img, box)` turns a keyed painted image into the same kind of sprite.
- **Time and randomness**: `step(t)`, `twos(t)`, `drawRate(fps)`, `rngFrom(seed)`, `hs`, `h2`, `strHash`, `spring`,
  `eio`/`eo`/`ei`, `shade(hex, dl)`.

### Riso press (`riso.js`)
`makePress({ W, H, k, pitch = 9.5, unit, seed, inks, register, edge, spread })` returns a press:
- `press.begin()`; `press.plate(ink, 'solid' | 'screen')` gives a 2D context in drawing units. Only the alpha counts:
  use `tone(v)`, `ramp(...)`, `radial(...)`.
- `press.knockout(fn)`, `press.each/save/restore/clip`.
- `press.print({ key, register, inks, spread })` returns the canvas, memoised per key.
- Helpers: `brushLine(g, pts, w, seed, { taper })` (one swelling ribbon with tapered ends, not a stroked line) and
  `inkLine`.
- Pitch: by default the halftone cell is 9.5 px at a 1080 short side, scaled with the print. For a card, pass `unit: 1`
  to keep 9.5 px on the card.

Rules, from drawn-by-code's riso skill:
- Four inks only; every other colour is an overprint.
- Inks only darken, so put light over dark with a knockout.
- Detail finer than about 3 px must be solid ink, not screen.
- Two screens over each other print mud: put a solid over a screen.
- Drop plates you don't use (they cost time and print stray specks).

### Set (`set.js`)
- `L` holds the layout constants (`PROSC_Z 940`, the opening `x ±330` with an arch from `y -330` to `-440`,
  `FLOOR_Y 300`, `DESK_Y 470`, `BACK_Z 1275`, `WALL_Z 2700`).
- `bakeSet({ wood, crown })` bakes the pieces: proscenium, valance, two half-open curtains, backdrop, boards, desk.
- `theatre(K, SP)` adds wall, desk, backdrop, boards, curtains, valance and proscenium.
- `bakeCard(canvas, w, h)` and `flyCard(K, CARD, z, x, y, { drop, sway, top, clip })` handle a print hung from a batten
  on two lines with two pegs.
- `lyingProp(K, img, { x, y, z, w, rot })` lays a painted prop flat on a floor, foreshortened by the viewing angle.
- `openingP(grow)` is the proscenium opening path; `loadImg(url)`.

### Cat (`cat.js`)
`bakeCat({ K, art })` bakes the felt parts once. `feltCat(K, z, CAT, o)` adds the puppet. Options in `o`:
- `x, y` (feet on the floor), `s`, `tilt` (head roll about the neck)
- `look: [lx, ly]` (the beads move, and the face slides with `faceShift`)
- `lid` (0 wide open, 1 shut; the brand's sleepy look is about .45), `blink` (otherwise automatic, hashed per `id`)
- `brows` (0 rest, 1 raised), `mouth` (0 stitched smile, up to 1 a small "oh"), `pupil`, `tail` (sway), `jit`
  (replacement jitter), `id`

`art` is the hook for painted parts: `{ body, tail, beret, head, <face name>, blink }`, each `{ img, box }` in the
rig's units. Body-local units: the origin is between the feet, up is negative, and the cat is about 330 units tall with
the beret.

## Candid review of the test frame (after six rounds of render, look, fix)

What works:
- **The set reads as a real toy theatre on a desk.** The felt curtains have folds converging at the tiebacks, and the
  valance, gold frame and footlight hoods are all there. The proscenium front falls slightly out of focus, which gives
  the macro feel.
- **The riso poster is the best element.** It has the double-hit title, yellow flat with pink screen (orange dots), navy
  brush curve with knocked-out ring markers, and paper grain. It stays legible at phone size in both languages.
- **The lighting holds together.** Per-plane lighting fixed the round-1 problem of a lavender, washed-out cat. Beams
  are hidden behind the valance.
- **Determinism**: frames are pixel-identical across runs.

What does not work yet:
- **The cat is cute at stage distance but not at the bar of the painted cast.** It reads as a craft-kit felt cat: flat
  pieces, a simple blob head, white-blob paws, and fuzz that is still a little "hairy" on dark grounds. Up close (a host
  reaction shot) it would look generic next to `cat_sit.png`. The gaze works (white felt eye backing, beads that move,
  the face sliding), but the brows can read as skeptical when the head rolls.
- **The beam is subtle.** It's there as haze over the poster and dust specks, but it isn't a dramatic shaft. Pushing it
  further washes out the poster.
- **The frame is dark below the stage.** The desk is mostly a brown blur. That's acceptable in Douyin's bottom UI zone,
  but there's little desk story.
- **The out-of-focus red pen** reads as a red streak more than as a pen.
- **The proscenium pilaster capitals and the crown** are generic shapes; they pass only because they're out of focus.

**Recommendation for the cat:** by the house rule (art that code can't make well is not drawn with primitives), keep the
code cat for blocking and wide shots, and commission painted felt parts with Codex. Drop them in through
`bakeCat({ art })` as replacement heads, the stop-motion way. Generate them with `.claude/films/edu/art/gen.sh` and
key them with `art/key.py` (white fur needs its despill).

### Codex prompts (attach `xlaunch/kit/assets/cut/cat_sit.png` as the character reference)
Use `gen.sh`-style calls: one square 1024 image each.

1. `felt_cat_sit`: Generate ONE square image (1024x1024) with your image generation tool. A handmade felt puppet for
   a toy paper theatre: the white fluffy cat from the attached image (the same character: white long fur, pink inner
   ears, amber-brown eyes, pink nose, a red beret tilted over its left ear), remade as a stop-motion puppet sewn from
   thick wool felt.
   - Construction: every body part is one piece of white wool felt (tail, body, two haunches, a scalloped chest ruff,
     two front paws, head, two ears with pink felt inside), joined with small visible running stitches in pale cream
     thread. Soft fuzzy wool fibres on every edge, slightly needle-felted cheeks.
   - Face: glass safety-bead eyes, amber with a black pupil and a bright highlight, under white felt eyelids. A pink
     felt nose, an embroidered mouth, three white thread whiskers per side, dry-brushed pink blush on the cheeks.
   - Beret: red felt with a small stalk on top and a stitched brim.
   - Pose: sitting, front view, looking up and to the left with curious eyes, the mouth a small "oh".
   - Look: soft even studio light from the upper left, shading on the puppet only. Stop-motion photography (real felt
     fibre texture, like the felt puppets of a handmade stop-motion film), not a 3D render, not a drawing.
   - Framing: the full figure from the beret to the paws, nothing cropped, centred with a margin, the figure about 85%
     of the image height.
   - Background: one perfectly flat pure green #00FF00 background, with no floor, no shadow and no gradient. No text,
     letters, numbers, logos or watermark.
2. `felt_cat_head_<face>` (replacement heads, the same puppet and scale; attach image 1 as well): the same felt puppet's
   HEAD ONLY, cut cleanly at the neck, front view, the beret on. Make one image per face:
   - (a) `lookup`: eyes looking up-left, mouth a small "oh"
   - (b) `blink`: eyes closed, the felt lids down
   - (c) `smug`: the character's sleepy half-lidded look with a small closed smile, as in the reference
   - (d) `wide`: eyes wide, surprised

   Same light, same flat #00FF00 background, no text.

If Codex has no quota, send these prompts as they are to ChatGPT on the web, and push the images to
`.claude/films/edu/art/src/` (one file per prompt, named as above).

## Lessons (each cost a render)
- A screen-space light map tints everything inside a pool: the blue backdrop wash turned the white cat lavender.
  Lights now carry `zmin`/`zmax`, and each depth group is multiplied by its own map.
- Bead eyes with no white show no gaze. A white felt backing plus beads that move plus a face that slides makes "looking
  up" read.
- A lid edge drawn through the top of the iris reads as sleepy or annoyed, never curious. For curiosity, open the lid
  above the bead.
- Long, sparse, opaque fuzz reads as stubble. Short, dense, low-alpha fibres over a soft blurred halo read as wool.
- A zig-zag ruff reads as torn paper teeth; rounded lobes read as fluff.
- Flown pieces must be clipped to the opening (`clipTo`), or they hang in the air above the theatre while flying in.
  Their lines must also stop where the theatre's box hides them (`top`).
- A beam drawn as a post pass shines over the valance in front of its source. Beams take `occ` so nearer pieces hide
  them.
- A flat prop needs foreshortening by `sin(atan2(dy, dz))`; without it, the pen stood on end.
