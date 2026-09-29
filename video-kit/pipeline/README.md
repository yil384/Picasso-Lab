# pv: deterministic frame-by-frame video pipeline

This pipeline turns scenes written in p5.js, p5.brush, three.js and Canvas2D into frames. It renders them in
headless Chromium and encodes them with ffmpeg. It is the "Claude writes the code, the browser draws every
frame" workflow. Every frame is a pure function of its index, so frames can render in any order and in parallel,
an interrupted render can resume, and a loop is seamless by construction (frame N == frame 0).

```
pipeline/
  runtime/pv.js            scene runtime: defineScene(), layers, compositing, seeded RNG, boil, paper, loaders
  render.py                parallel resumable renderer (Playwright, <=3 Chromium processes) -> lossless frames
  encode.py                master / card loop / poster / contact sheet / animated preview
  snap.py                  render a few frames to PNG while authoring (prints per-layer ms)
  serve.py                 interactive preview in a normal browser (play, scrub, arrow keys)
  pvlib.py                 static + upload HTTP server, frame/segment storage, manifest
  scenes/_template.html    starting point for a new scene
  scenes/demo.html         demo: lit three.js object + p5.brush watercolour + boiling ink + text
  scenes/tests/            coords.html (brush coordinate/letterbox check), underlay.html (glaze vs pigment mix)
  vendor/                  p5 2.3.4, p5.brush 2.2.3 (+ determinism patch), three 0.186.1 (+ addons), pinned
  fonts/                   local woff2 + fonts.css: Fraunces, Instrument Serif, Inter, Caveat,
                           Permanent Marker, JetBrains Mono (latin, latin-ext, greek where available)
  tools/                   fetch_fonts.py, patch_p5brush.py, vendor.sh (re-vendor from npm lockfile)
  vendor.sha256            checksums of the vendored builds
```

Nothing is fetched at render time. `/pv/*` serves this folder and `/scene/*` serves the scene file's folder.

## Commands

All commands run from this folder. `OUT` can be anywhere.

```sh
P=video-kit
cd $P/pipeline

# 0. new scene
cp scenes/_template.html ../qubrio/qubrio.html          # scene + its assets can live anywhere

# 1. author: look at a few frames (fast, low-res), or scrub interactively
python3 snap.py ../qubrio/qubrio.html 0 120 360 --width 960 --height 540 --out ../_snaps/q
python3 serve.py ../qubrio/qubrio.html --width 960 --height 540     # open the printed URL

# 2. render full-res frames (Metal GPU, 3 browsers), then prove purity + seamless loop
python3 render.py ../qubrio/qubrio.html --out ../out/qubrio --workers 3 --verify 12 --check-loop
#    interrupted? run the same command again: existing frames/segments are skipped.
#    quick low-res pass of the whole thing into a separate OUT:
python3 render.py ../qubrio/qubrio.html --out ../out/qubrio_540 --width 960 --height 540

# 3. encode deliverables (or add --encode to step 2)
python3 encode.py ../out/qubrio all
python3 encode.py ../out/qubrio poster --frame 240          # other poster frame
python3 encode.py ../out/qubrio preview --range 0:90 --gif  # GIF instead of animated WebP
```

Outputs are written to `OUT/`. `<name>` is the scene file name, or `--name`.

| file | spec |
|---|---|
| `<name>_master.mp4` | 1920x1080 (the render size) at the render fps, H.264 High, yuv420p, CRF 18, preset slow, bt709 tagged, `+faststart`, no audio |
| `<name>_loop.mp4` | card loop: centre crop to 1.82:1, lanczos to 960x528, H.264 High yuv420p, `+faststart`. It uses the lowest CRF of 22 or more that fits `--max-mb 2.5`; the search predicts the next CRF from the observed size, so it needs about 2-3 tries |
| `<name>_poster.webp` | the scene's `meta.poster` frame (or `--frame`), same crop, 960x528, WebP q80 |
| `<name>_sheet.png` | 4x4 contact sheet of evenly spaced frames, labelled with frame number and time |
| `<name>_preview.webp` / `.gif` | animated preview of a short range (default: first 3 s at 15 fps, 640 px wide) |
| `render.json` / `encode.json` | effective params, scene hash, GL backend, timings per run, purity checks, encoder results |

Frames loop as 0..N-1. Frame N is never encoded, and `--check-loop` proves that it equals frame 0.

## Scene contract

A scene is **one HTML file**. It loads the vendored libraries, then calls `defineScene(spec)` from
`/pv/runtime/pv.js`. Copy `scenes/_template.html` for the boilerplate: fonts.css, p5, patched p5.brush, and the
three importmap.

**Inputs** come as URL query parameters. The renderer sets them from the CLI, and `meta` holds the defaults:
`?width&height&fps&frames(=durationFrames)&seed`, plus `render=1` for headless mode and `profile=1` to sync
the GPU after each layer.

**Exposed to the renderer:**

- `await window.renderFrame(i)` draws frame `i` into the final 2D canvas and resolves with
  `{layerName: ms, ..., total}`.
- `window.__pv` has `ready`, `error`, `canvas` (the final `<canvas>`), `capture(i, url, 'png'|'rgba')`
  (render, read back losslessly, POST) and `hash()`.
- `window.PV_META` holds the merged `meta`, plus `W H fps N seed S DW DH`.

`ready` becomes true only after all of these finish: fonts load (a family missing from fonts.css is an error,
not a silent fallback), `layer.init`, `spec.setup` (await your assets here with `ctx.load.image/json/text/buffer`)
and a warm-up render of frame 0.

```js
defineScene({
  meta: { title, width: 1920, height: 1080, fps: 30, durationFrames: 720, seed: 1,
          design: [1920, 1080],              // author in these units at any output size (letterboxed if aspect differs)
          background: '#f3ecdf', fonts: ['Fraunces', 'Inter', 'Caveat'],
          boil: { every: 3, variants: 3 },   // hand-drawn redraw cadence
          brushScale: 2.6,                   // p5.brush built-in brush size, applied ONCE
          poster: 240 },
  brushes(brush, {S, W, H}) {},              // optional: brush.add(...) custom brushes
  async setup(ctx) {},                       // optional: once per page
  update(ctx) {},                            // once per frame, before layers: set ALL animated state from ctx.t
  layers: [ /* bottom -> top */ ],
  post(ctx, g) {},                           // optional: draw on the final composite (design units)
});
```

**Layers.** The runtime draws each layer into its own surface, then composites it into one final 2D canvas with
`globalCompositeOperation = layer.blend` and `globalAlpha = layer.opacity`.

| type | `draw` signature | surface / notes |
|---|---|---|
| `'2d'` | `draw(ctx, g)` | own W x H canvas, cleared each frame, `g` pre-transformed to design units. Use it for text, paper and diagrams |
| `'three'` | `init(ctx, {THREE, renderer}) -> {scene, camera, ...}` once; `draw(ctx, T)` per frame | own WebGLRenderer (alpha, MSAA, sRGB out, pixelRatio 1). The runtime calls `renderer.render(scene, camera)` after `draw` unless `draw` returns `false`, so you can drive an EffectComposer yourself |
| `'brush'` | `draw(ctx, p, brush)` | one shared p5 WEBGL instance. Each brush layer is a separate pass on it, with origin top-left in design units. Output resolution comes from `pixelDensity(S)` |

Brush-pass semantics:

- p5.brush mixes pigment with the pixels under it and writes opaque pixels, treating transparent as white.
  So by default a pass paints on white (`clear`) and is **multiplied** onto the stack. That behaves like a
  transparent watercolour or ink glaze.
- `underlay: true` paints on top of the composite-so-far instead. You get real Kubelka-Munk pigment mixing with
  the 3D render (blue sphere + yellow wash = green; see `scenes/tests/underlay.html`), and the pass replaces
  what was below it.

**`ctx` (per frame)**

| field | meaning |
|---|---|
| `i`, `iw` | requested index; `iw = i mod N`. Use **`iw` or `t`** for anything visual so frame N == frame 0 |
| `t` | loop phase `iw/N` in [0,1) |
| `sec` | `iw/fps` |
| `N`, `fps` | frame count and frame rate |
| `W`, `H` | output pixels |
| `S` | pixels per design unit |
| `DW`, `DH` | design size |
| `seed` | render seed |
| `rng(...keys)` | seeded PRNG (`r()`, `r.range`, `r.int`, `r.pick`, `r.gauss`, `r.sign`, `r.chance`) that is the same on every frame (static layout) |
| `boilRng(...keys)`, `boil()` | same within a boil step, different between steps: the hand-drawn "boil". Keep `(N/every) % variants == 0`; the runtime warns otherwise |
| `frameRng(...keys)` | unique per frame (grain) |
| `seg(t,a,b,ease)`, `pulse(t,a,b,r)`, `ease.*`, `lerp`, `clamp` | timeline helpers |
| `loopNoise(t, x, {seed, radius})`, `noise3(seed)` | periodic gradient noise (loop-safe) |
| `project(vec3[, camera])` | three.js world position to design-space `{x, y, z}`, used to draw ink on 3D objects. Set `ctx.camera` in `update` |
| `field(name, t)`, `wiggle(a)` | activate a p5.brush vector field **and regenerate it now**. Use these instead of `brush.field` / `brush.wiggle` |
| `font(family, size, weight, style)` | Canvas font string |
| `paper({tone, grain, fibres, blotch, seed})` | cached procedural paper canvas (W x H) |
| `load.image/json/text/buffer(url)` | asset preloaders; await them in `setup` / `init` |
| `layers[name]` | layer records |

**Caching.** Give a layer `cache: ctx => key` and a rendered layer is reused for every frame that returns the
same key. It is kept in an LRU of `cacheSize` entries per browser. Examples:

- `() => 'static'` for paper.
- `ctx => ctx.boil()` for washes that only change per boil step: 3 renders instead of 90.

Purity still holds because the output depends only on the key. Underlay passes are never cached.

**Purity rules.** The runtime enforces or helps with each of these, and `render.py --verify` catches the rest.

1. **Derive everything from `ctx.t` / `ctx.iw`.** No accumulated state: no `x += v`, no physics stepping across
   frames, no three.js `AnimationMixer.update(dt)` (use `mixer.setTime(ctx.sec)`). If you need a simulation,
   precompute it in `setup` (deterministically) and index it by frame.
2. **Randomness.** Use `ctx.rng / boilRng / frameRng`. `Math.random` is re-seeded per frame and per layer
   anyway, and p5 `random()`/`noise()` plus p5.brush are seeded per pass from `(seed, layer, boil step)`.
   Never use `Date` or `performance.now()` for visuals.
3. **p5.brush specifics.**
   - Set the brush size with `meta.brushScale`, and register custom brushes in `spec.brushes`. The runtime makes
     `brush.scaleBrushes()` inside a frame throw, because it multiplies cumulatively.
   - Use `ctx.field` / `ctx.wiggle`, because p5.brush caches a field the first time it is used.
   - Brush state (`set`, `fill`, `hatch`, ...) is wrapped in `push`/`pop` per pass, so it never leaks between
     frames.
4. **Loops.** Use integer cycles over the loop: `Math.sin(2*PI*k*t)`, `loopNoise`, orbits with an integer
   `turns`. `--check-loop` renders frame N and requires it to be pixel-identical to frame 0.

## How the renderer works

- `render.py` starts a local HTTP server and up to 3 Chromium processes (Playwright, `spawn`). Each process
  boots the scene once, then pulls frame indices from a shared queue, so load balances dynamically and frames
  finish out of order.
- For each frame the page runs `renderFrame(i)`, reads the final canvas losslessly (`canvas.toBlob('image/png')`,
  or `--fmt rgba` raw bytes that the server PNG-encodes) and POSTs it. The server writes
  `OUT/frames/f_00000.png` atomically (tmp + rename).
- **Storage (`--store segments`, default).** When an aligned run of `--seg-frames` (30) frames is complete, a
  background thread streams those PNGs into ffmpeg as a lossless `libx264rgb -qp 0` segment
  (`OUT/segments/seg_00000_00030.mkv`). It checks the first, middle and last frame bit-for-bit, then deletes the
  PNGs.
  - The demo needed 3.7 MB/frame as PNG and 0.67 MB/frame as a lossless segment. Temporal prediction handles
    the static paper grain.
  - This matters on this machine: the disk had only 1-3 GB free, and a 900-frame 1080p render would need about
    3.3 GB as PNG.
  - `--store png` keeps PNGs instead.
- **Resume.** Frames that exist as a complete PNG or inside a segment are skipped. `render.json` stores a hash of
  the scene and the runtime, plus size, fps, frames, seed and GL backend. A mismatch is refused unless you pass
  `--clean` or `--force`, so stale frames never get mixed in.
- **Checks.**
  - `--verify K` re-renders K random frames in a fresh browser, in shuffled order.
  - `--check-loop` renders frame N.
  - Both compare pixel-exact against the stored frames and write the results into `render.json`.
- **Encoding.** `encode.py` feeds ffmpeg from the lossless segments (concat demuxer) or streams PNGs through
  image2pipe. Any frames still stored as PNG are first streamed into temporary lossless segments, so every
  encode starts from bit-exact frames.
- **GL backends (`--gpu`).**
  - `metal` (default): new-headless Chromium, ANGLE on Metal, Apple M2. About 10x faster than SwiftShader.
  - `swiftshader`: CPU WebGL. Use `--workers 1`, because it already uses every core.
  - `gl`: ANGLE on OpenGL.
  - The backends are each deterministic but differ from each other in the last bits, so one render must stay
    on one backend. The manifest enforces this.

## Measured performance

Demo scene, 1920x1080, 90 frames, Apple M2 (8 cores). Other heavy jobs were running at the same time; the load
average is shown for each run.

| backend | workers | wall for 90 frames | s/frame (effective) | load avg during run |
|---|---|---|---|---|
| Metal | 1 | 7.9 s | 0.087 | ~6 |
| Metal | 1 | 9.4 s | 0.104 | ~4-7 |
| Metal | 3 | 5.4 s | 0.060 (1.45x) | ~6 |
| Metal | 3 | 7.4 s | 0.082 (1.1-1.3x) | ~7-15 |
| Metal | 3 | 23.5 s | 0.261 (slower than 1 worker) | 16-20 |
| SwiftShader | 1 | 79 s | 0.88 | ~6 |
| SwiftShader | 1 | 111 s | 1.23 | ~15 |
| SwiftShader | 3 | 146-286 s | 1.6-3.2 (slower than 1 worker) | 12-38 |

With `--profile` on Metal (GPU synced per layer, load around 30):

| step | cost per frame |
|---|---|
| three.js lit knot with PCF shadows | 4.5 ms |
| ink pass (splines + hatch) | 17 ms |
| cached wash | ~5 ms average (40-50 ms on a cache miss; 260 ms with `--cpu-2d`) |
| text | 0.4 ms |
| **PNG readback + encode** | **70-120 ms**, the dominant cost |
| upload | 5-50 ms |
| lossless segment compaction | ~1-3 s per 30 frames, in a background thread |

A 30 s, 900-frame render of a demo-weight scene therefore takes about 1-2 minutes on Metal. The card CRF search
on a 30 s 960x528 loop settled at CRF 25 = 2.43 MB.

## Determinism: what broke and how it was fixed

The fixes below were verified with the purity checks. A fresh browser rendered 12 shuffled frames plus frame N:
identical on Metal (1 and 3 workers) and on SwiftShader, and identical after an interrupted-then-resumed render.

1. **p5.brush blend shader (upstream bug).** It computes `dFdx/dFdy` after a per-fragment early `return`.
   Derivatives in non-uniform control flow are undefined in GLSL, so on Metal and OpenGL the watercolour edge
   pixels differed in each browser process (about 0.05% of pixels, up to 10/255). `tools/patch_p5brush.py`
   hoists the derivative loop above the return, and scenes load `vendor/p5.brush/p5.brush.pv.js`. The unpatched
   original stays next to it.
2. `brush.scaleBrushes` is cumulative, and p5.brush vector fields are cached on first use. Both are handled by the
   runtime (see the purity rules).
3. p5.brush ignores `p.scale()` in its bounds tests: fills disappeared at 960x540. Brush canvases therefore stay in
   design units and get their resolution from `pixelDensity(S)`, so 540p previews match the 1080p composition.
4. three r186 removed `PCFSoftShadowMap`. Use `PCFShadowMap` with `shadow.radius`.

## Authoring notes for the project cards

The card shows the loop at about 400x195 CSS px with `object-fit: cover`: a 1.82:1 centre crop of the 16:9
master, so about 13 design px are lost top and bottom.

- Keep ink strokes at 3 design px or more.
- Keep essential text at 40 design px or more, or leave text for the master only.
- Keep important content inside the central 1920x1000.
- Check `<name>_poster.webp`, because that is what shows before the video plays.

## Reproducing the vendor folder

```sh
sh tools/vendor.sh          # npm ci from package-lock.json, copy builds, patch p5.brush, verify vendor.sha256
python3 tools/fetch_fonts.py   # (only if fonts/ is missing) re-download the woff2 files
```
