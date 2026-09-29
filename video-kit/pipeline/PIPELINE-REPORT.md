# Pipeline agent report

## How to
All commands run from video-kit/pipeline. The scene file can live anywhere; /pv/* serves the pipeline folder and /scene/* serves the scene's own folder.

0. Start a new scene:
   cp scenes/_template.html ../qubrio/qubrio.html

1. While authoring:
   - Look at a few low-res frames (prints the time each layer took):
     python3 snap.py ../qubrio/qubrio.html 0 120 360 --width 960 --height 540 --out ../_snaps/q
   - Scrub interactively in a normal browser (open the printed URL; space plays, arrow keys step):
     python3 serve.py ../qubrio/qubrio.html --width 960 --height 540

2. Render at full resolution (1920x1080, Metal GPU, 3 browser processes) and check that frames are pure and the loop is seamless:
   python3 render.py ../qubrio/qubrio.html --out ../out/qubrio --workers 3 --verify 12 --check-loop
   - If it is interrupted, run the same command again. Frames already rendered (as PNGs or inside lossless segments) are skipped.
   - It refuses to resume if the scene, runtime, size, fps, frame count, seed or GL backend changed, unless you pass --clean (discard the old frames) or --force (keep them).
   - Other options:
     --width 960 --height 540   low-res pass; use a separate --out
     --range A:B                render only part of the video
     --gpu swiftshader --workers 1   CPU WebGL fallback
     --store png                keep PNG files instead of lossless segments
     --profile                  real per-layer GPU timings
     --encode                   run step 3 automatically

3. Encode the deliverables:
   python3 encode.py ../out/qubrio all
   This writes into OUT:
   - qubrio_master.mp4: 1080p30 H.264 High, yuv420p, CRF 18, preset slow, bt709, +faststart
   - qubrio_loop.mp4: card loop, centre crop to 1.82:1, scaled to 960x528, H.264 at the lowest CRF of 22 or more that stays at or under 2.5 MB, +faststart
   - qubrio_poster.webp: 960x528, q80, from meta.poster
   - qubrio_sheet.png: 4x4 contact sheet
   - qubrio_preview.webp: animated, first 3 s at 15 fps, 640 px wide
   Single targets:
   python3 encode.py OUT master|card|poster|sheet|preview
   Options: --max-mb 2.5  --frame K (poster frame)  --range A:B --gif (preview)  --grid 4x4

The demo was produced with:
python3 render.py scenes/demo.html --out ../out/demo --workers 3 --clean --verify 12 --check-loop --encode

Rebuilding the vendored libraries (needs network once):
- sh tools/vendor.sh: npm ci from the lockfile, copy the builds, apply the p5.brush patch, check vendor.sha256
- python3 tools/fetch_fonts.py: only if fonts/ is missing

## Scene contract
A scene is one HTML file. Its head loads, all vendored:
- /pv/fonts/fonts.css
- /pv/vendor/p5/p5.min.js and /pv/vendor/p5.brush/p5.brush.pv.js, as classic scripts
- an importmap for 'three' and 'three/addons/'

A module script then calls defineScene(spec), imported from /pv/runtime/pv.js.

INPUTS come from URL query parameters, which override the defaults in meta:
- ?width&height&fps&frames(=durationFrames)&seed
- render=1 for headless rendering, profile=1 for per-layer GPU timings

WHAT THE PAGE EXPOSES:
- await window.renderFrame(i): draws frame i into the final 2D canvas as a pure function of i, and returns per-layer ms.
- window.__pv: ready, error, canvas, capture(i, url, 'png'|'rgba') (render, lossless readback, POST) and hash().
- window.PV_META: the merged settings.
- ready becomes true only after:
  - fonts load (a family missing from fonts.css is an error)
  - layer.init and spec.setup finish (assets are preloaded there with ctx.load.image/json/text/buffer)
  - a warm-up render of frame 0

SPEC:
- meta: title, width, height, fps, durationFrames, seed, background, fonts[], poster
  - design: [1920,1080]. Author in these units at any output size; the frame is letterboxed if the aspect differs.
  - boil: {every: 3, variants: 3}
  - brushScale: applied once
- brushes(brush): custom brush.add() calls
- async setup(ctx)
- update(ctx): runs once per frame before any layer. It sets ALL animated state from ctx.t or ctx.iw.
- layers: drawn in order, composited bottom to top into one final 2D canvas using layer.blend and layer.opacity
- post(ctx, g): draws on the final composite

LAYER TYPES:
- '2d': draw(ctx, g). Its own canvas, cleared every frame, already transformed to design units.
- 'three': init(ctx, {THREE, renderer}) returns {scene, camera}; draw(ctx, T) runs each frame. The runtime then renders the scene unless draw returns false. The renderer has alpha, MSAA, sRGB output and pixelRatio 1.
- 'brush': draw(ctx, p, brush). All brush layers share one p5 WEBGL instance, with the origin top-left in design units and resolution set by pixelDensity(S).
  - p5.brush writes opaque pixels. So by default a pass paints on white and is multiplied onto the stack, like a watercolour or ink glaze.
  - underlay: true paints on top of the composite so far, with real spectral pigment mixing against the 3D render.
- Any layer can take cache: ctx => key (for example ()=>'static', or ctx=>ctx.boil()). Frames with the same key reuse the rendered layer from a per-process LRU.

CTX FIELDS:
- Frame: i, iw = i mod N (frame N == frame 0), t = iw/N, sec
- Sizes: N, fps, W, H, S, DW, DH, seed
- Randomness:
  - rng(...k): the same on every frame
  - boilRng(...k) and boil(): stable within a boil step, different between steps (the hand-drawn "boil")
  - frameRng(...k): unique per frame
- Timing: seg, pulse, ease.*, lerp, clamp
- Periodic noise: loopNoise, noise3
- project(vec3): three.js world position to design-space x/y, for ink drawn on 3D objects
- field(name, t) and wiggle(a): activate a p5.brush vector field and regenerate it immediately. Use these instead of brush.field/brush.wiggle, which cache the field.
- font(), paper(opts), load.*, layers

PURITY RULES:
- No state carried from one frame to the next. Use closed-form motion, mixer.setTime(ctx.sec), or simulations precomputed in setup.
- Randomness only from the seeded helpers. Math.random, p5 random/noise and p5.brush are all re-seeded per frame, per layer and per boil step.
- Never call brush.scaleBrushes inside a frame. The runtime throws if you do, because it multiplies cumulatively.
- Loops use integer cycles in t.
- Keep (N/every) % variants == 0 so the boil loops cleanly. The runtime warns otherwise.

## Perf
Test: demo scene, 1920x1080, 90 frames, Apple M2. Other heavy jobs (other agents' Chromium processes) were running at the same time, so results depend strongly on load; the load average is given for each run.

Metal (default; headless Chromium using ANGLE on Metal):
- 1 worker: 0.087 s/frame (7.9 s for 90 frames, load about 6) and 0.104 s/frame (9.4 s, load 4-7).
- 3 workers:
  - 0.051 s/frame effective (4.6 s, load about 4): 1.7x faster.
  - 0.060 s/frame (5.4 s, load about 6): 1.45x faster.
  - 0.082 s/frame (7.4 s, load 7-15): 1.1-1.3x faster.
  - 0.26 s/frame at load 16-20: slower than 1 worker.
- Where the time goes (--profile, load about 30):
  - three.js knot with shadows: 4.5 ms
  - ink pass: 17 ms
  - watercolour wash: about 5 ms when cached (40-50 ms on a cache miss; 260 ms with --cpu-2d)
  - text: 0.4 ms
  - PNG readback and encode: 70-120 ms, the largest cost
  - lossless segment compaction: about 1-3 s per 30 frames, in a background thread

SwiftShader (CPU WebGL):
- 1 worker: 0.88 s/frame at load about 6, and 1.23 s/frame at load about 15.
- 3 workers: 1.6-3.2 s/frame effective at load 12-38, slower than 1 worker, because SwiftShader already uses every core. Use --workers 1 with SwiftShader.

Other numbers:
- Card CRF search on a 30 s, 960x528 loop (made by repeating the demo segments): CRF 22 gave 3.42 MB, CRF 24 gave 2.73 MB, CRF 25 gave 2.43 MB (final).
- Storage: 3.7 MB per frame as PNG versus 0.67 MB per frame as a lossless x264rgb qp0 segment (checked bit-exact).
- A 900-frame 1080p render of a scene this heavy should take about 1-2 minutes on Metal.

## Gaps
- Upstream p5.brush 2.2.3 gave slightly different pixels at watercolour edges from one browser process to the next on real GPUs (Metal and OpenGL): about 0.05% of pixels, off by up to 10/255.
  - Cause: its blend shader computes dFdx/dFdy after a per-fragment early return, which is undefined behaviour in GLSL.
  - Fix: tools/patch_p5brush.py writes vendor/p5.brush/p5.brush.pv.js, and scenes must load that file. The patch is local; it has not been reported upstream.
  - After the patch, determinism is verified only for the features the demo uses: fills, pen/HB/marker/rotring strokes, hatch, three.js PCF shadows and Canvas2D text. Spray, image or custom brush tips, mass, flowLine and three.js post-processing have not been tested. Run --verify on every new scene.

- Accelerated Canvas2D is left on because it is about 6x faster for p5.brush fills, and it was deterministic for the demo. If a scene fails --verify, --cpu-2d is the fallback.

- Parallel speedup depends heavily on the other jobs on this machine:
  - Metal with 3 workers is 1.1-1.7x faster at moderate load, and slower when the load average is above about 16.
  - SwiftShader should always use 1 worker.

- The largest per-frame cost is PNG readback and encoding (70-120 ms).
  - --fmt rgba (raw bytes, encoded by the server) exists but is slower.
  - Sending raw RGBA straight into ffmpeg would be the next optimization; it is not built.

- Disk is tight: about 1.4-3 GB free, and it filled up once during this work because of other jobs.
  - The default lossless segment storage fixes this (0.67 MB per frame for the demo).
  - Grainier content will need more space.

- Only a 10-minute no-progress watchdog exists; there is no per-frame timeout, so a hung frame stalls a worker until then.
- There is no audio track.
- Output whose aspect differs from the design aspect is letterboxed.
- The card crop happens only at encode time. Scenes must keep important content inside the central area and use strokes of 3 design px or more (the demo's 2 px pens are thin at the 400x195 card size).

- The CRF search was tested on a synthetic 30 s loop (the demo segments repeated 10 times), not on real Qubrio footage.

- The demo is a pipeline test, not a Qubrio style proposal.
  - The Qubrio scene itself has not been written, and the project site has not been fetched in this step.
  - The Veo prompt was read, and the neutral-atom physics notes are in the task context for the next step.

- Frames from different GL backends are refused rather than reconciled: Metal and SwiftShader output differs in the last bits.

- Killing render.py mid-run prints a harmless leaked-semaphore warning.

- The repo was not modified. Everything is under video-kit/.