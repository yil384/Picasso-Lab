---
name: picasso-avatar-fx
description: Build or change a click-to-activate avatar effect on the Picasso Lab Team page (people/<name>.html snippets running on people/fx/kit.js — three.js layers of the real photo + q5/p5 comic layer). Use for a new member's avatar effect, reworking an existing one, fixing placement of a prop on someone's photo, or anything touching people/fx/.
---

# Team page avatar effects (people/fx)

Every avatar on https://yufeiding.ucsd.edu/people/team is its own Google Sites embed. Read the
`picasso-sites-embed` skill too — its rules apply (absolute URLs, re-paste to deploy the snippet).

## Pieces
- `people/<file>.html` — the **pasted snippet** (one per person): the photo, an import map for three.js,
  and a tiny loader. All snippets are identical except the header comment, `data-fx`, `aria-label`, `<img src>`.
  Copy `people/zhuo_gold_medal.html`. Changing a snippet needs a re-paste; changing a scene does not.
  A change to the shared part goes into every kit snippet at once (patch them with one script).
- **Tile sizes.** The Sites tiles shrink with the window (measured on the live Team page: 266 x 284 at
  >= 1280 wide, 244 x 260 at 1180, 209 x 223 at 1024, 163 x 174 at 820, 151 x 161 at 768, 257 x 274 on a
  portrait phone, 168 x 180 on a landscape phone). The snippet sizes the photo to its tile:
  `--d: min(200px, calc(100vw - 16px), calc(100vh - 16px))`, top-left at 8 px on desktop, bottom-centre
  on phones (`margin-left: calc(var(--d) / -2)`). A keyboard focus ring (`.pfx-stage::after`) sits on the
  photo's edge, over the effect canvas too.
- `people/fx/kit.js` — shared runtime (header comment = the contract). Loads on the first hover/touch,
  builds a three.js stage on click (one build at a time; clicks while it loads only flip on/off), releases
  the WebGL context after the effect switches off (15 embeds on one page would exceed a phone's context
  limit), tilts the stage toward the pointer (the tilt fades out with the exit, so both ends are flat),
  phones sway. A stage is built for one tile size: a resize or rotation, a lost context or a failed build
  switches it straight back to the photo (aria-pressed false). The embed runs in quirks mode (no doctype),
  so the viewport size comes from `document.body` there.
- `people/fx/<name>.js` — the scene: `export default { title, exit, still, plate, async build(k) { return { update(t, e, dt), draw2d(q, t, e), dispose() } } }`.
  `t` = seconds since the click, `e` = exit progress 0 -> 1. Pure functions of (t, e).
- `people/static/fx/<name>-cut.webp` / `-plate.webp` — the person cut out / the photo with the person
  inpainted out. Make them with `python3 people/fx/tools/make_layers.py <name> --grid` (BiRefNet portrait
  matte via rembg; the `--grid` image is how you read landmarks — red lines every 128 photo px, labels every 64).
- Real-photo set pieces beat code-painted ones (a painted toon snow peak read as a little house). Prince Modi's
  (`parikshit`) peak is moonlit Chaukhamba from a CC BY 2.0 photo (sky flood-filled away, edge colour
  decontaminated, graded to moonlight: `people/fx/tools/parikshit_peak.py`; the credit is the snippet's `title`)
  on a card whose shader samples a low-res photo-space mask, so it stays behind the photo's own near ridges and
  can climb up from behind them. A whole-scene change of light (his day -> 3 a.m.) is baked offline
  (`parikshit_night.py`: night twins of the photo, plate and cut layers, a night photo lending colour statistics
  only) and crossfaded per layer in an `onBeforeCompile` on the kit's layer materials (as Haotian's cap removal).
  Download from Commons via `Special:FilePath/<file>?width=N` (the API rate-limits the proxy) and check the file
  page's licence first. Painted props (his headlamp) come from Codex on #00FF00, keyed.
- Not on the kit: the alumni Alon, Chenyang and Hezi (`alon_iron_man.html`, `chenyang_captain_america.html`,
  `hezi_scholar.html`): alumni have no avatar on the Team page, so the user asked to leave them as they are.
  Everyone else, Yufei (`yufei_cats.html`), Haotian (`haotian_shen.html`) and Xinwei (`xinwei_masterchef.html`,
  the approved SVG master-chef effect ported to `fx/xinwei.js`) included, is on the kit.
- The user compares every rebuild with the old version (what is live): keep all of its ideas and elements, put
  props exactly where the old one had them on the photo, and make it more exaggerated and richer, not sparser.

## Scene toolkit (k)
Scenes are written for a 200 px avatar and never see the real size. World units = **logical px** (the CSS
px of a 200 px avatar), origin = avatar centre, y up, z toward the viewer; `k.D = 200`, `k.R = 100` always.
The kit shows the stage scaled by `k.s` = real photo size / 200 (through the camera: its distance is in
logical px, so view-space depth stays logical too) and scales the q5 context by `k.s` around `draw2d`. So `k.W` / `k.H` (canvas size / k.s),
`k.toScreen` / `k.screenAt`, and hand-rolled projections `((V.x + 1) / 2 * k.W)` are all logical px, and
`k.dist` / `k.depthScale(z)` use the logical camera distance. `k.dpr` = canvas px per logical px: multiply
by it for anything the 2D context or a shader measures in canvas px (`shadowBlur`, `gl_FragCoord` cells,
`gl_PointSize`). `k.ink` widths stay in real screen px at every tile size.
`k.at(u, v, z)` photo px -> world (size-compensated for depth); `k.screenAt(u, v)` / `k.toScreen(v3)` -> logical px
for q5. Layers `k.layers.{photo, plate, person, mask}`; set pieces between z = -36 and 0 behind the person,
`k.clip(material)` keeps them inside the circle. `k.patch(polygon, z)` re-layers part of the real photo (a hand)
in front, so a prop between z = 0 and that z sits in the hand. `k.toon`, `k.ink(mesh, px)`, `k.show(obj, a, scale)`
(always use for things that scale in — outlines leave specks otherwise), `k.card`, `k.canvasTexture`,
`k.glowSprite`, `presence(t, e, t0, dur, ease, order)`, `env`, `ease`, `rng`. `k.q` / `draw2d(q, …)` = q5.js
(p5 API) in screen space (logical px; don't reset its transform); system fonts only.

## Gotchas (learned the hard way)
- Versions: three.js 0.160 from jsdelivr through the import map in each snippet; q5.js 4.8.3 for the 2D layer.
  `new Q5('graphics')` draws into an OffscreenCanvas (`createCanvas(W, H, {alpha: true})`, `pixelDensity(dpr)`);
  the kit copies it onto a visible canvas every frame.
- Phones are detected with `Math.min(screen.width, screen.height) < 600` (class `pfx-phone`).
- Photo layers: no mipmaps (they blurred busy photos the moment the effect switched on).
- GLSL: `flat` is a reserved word; don't name a variable that.
- `make_layers.py` runs one process per image: the BiRefNet matte (rembg `birefnet-portrait`) crashes after the
  first image in a process. Plates are OpenCV TELEA inpaints, blurry where the person was: never leave a big
  plate area uncovered while the person layer moves away.

## Rules the user cares about
Default = plain photo; t = 0 identical to the photo; entrance ≤ ~1.3 s, staged; then a calm loop (3–4 s beat,
busy ≤ 25 %); exit ≤ 0.5 s back to the exact photo. Stay inside the circle (≤ ~8 logical px overflow; desktop puts
the photo top-left of the tile, phones bottom-centre). Readable at 200 px and at 135 px (the 768-wide tile): few
bold props placed exactly on the real
photo (hands, head, chest) — "3D comic": toon + ink, no generic glow haze, no emoji, no clutter.

## Test (trust frames, not code)
The harness is in `test/` next to this file (`harness.js`, `pfx_test.js`, `pfx_ana.py`, `sheet.py`; run it from a
scratch directory, frames land in `./shots`):
```bash
export NODE_PATH=/opt/node22/lib/node_modules DSF=2          # wherever playwright is installed
node $SKILL/test/pfx_test.js zhuo_gold_medal zhuo_d 0,0.3,0.9,1.5,3.3 0.3,0.6,1 0 266 284
python3 $SKILL/test/pfx_ana.py zhuo_d 266 284 0 2            # t0 / exit / off vs photo, overflow, tile edge
python3 $SKILL/test/sheet.py sheet.jpg shots hov,t000,t090,t150,tilt,x100,zoff zhuo_d   # then look at it
```
`OVERRIDE=zhuo.js=/path/old.js` serves another copy of a scene (a control run). `pfx_test.js`
document.write()s the snippet into a 266 x 284 (desktop) or 257 x 274 (phone) iframe (or `TW TH`), routes
`https://yil384.github.io/Picasso-Lab/**` to the working tree **with `Access-Control-Allow-Origin: *`** (the
kit is an ES module loaded cross-origin, like on GitHub Pages), hovers, clicks, holds the effect clock at chosen
times through `window.__pfxClock = () => t` (and `window.__pfxExit = () => e` for the exit), screenshots each
time, checks console errors, and checks that switching off removes the canvas and shows the photo again.
Also run it at the small tiles (163 x 174, 151 x 161, and 168 x 180 as a phone): the photo must sit fully
inside the tile, the effect must shrink with it and t = 0 must still match the hovered photo (mean abs
diff < ~2 at a pixel ratio of 2). Rebuild it from this description if it is gone. Chrome's device emulation does not reach cross-origin iframes:
launch with `--disable-site-isolation-trials --disable-features=IsolateOrigins,site-per-process`, and give
the host test page a viewport meta, or phone layouts are wrong in tests (not on real phones).
To try one inside the live Sites page, swap the embed's `data-code` for your snippet (see `picasso-sites-embed`).

## Deploy
Scenes, kit and layer images go live when `main` is pushed (GitHub Pages, ≤ 10 min cache). A new or changed
**snippet** must be re-pasted into its Team page embed (`pbcopy < people/<file>.html`), then Publish.
