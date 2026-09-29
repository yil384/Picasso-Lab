# Research report (restored from the 2026-09-28 research agent; supporting files under research/refs were lost in the reboot)

# Code-rendered project videos (p5.js + p5.brush + three.js): research report (snapshot 2026-09-28)

## 0. TL;DR
1. **The pipeline is settled.** Every frame is a pure function of t. A page paints the frame with p5.js + p5.brush (plus an optional three.js layer), Playwright or Puppeteer drives headless Chromium frame by frame, and ffmpeg encodes. Build in this order: storyboard, then contact sheets, then the full render. The model must LOOK at the rendered sheets.
2. **Pin p5 2.3.4, p5.brush 2.2.3 and three 0.186.1.**
   - Load p5 and p5.brush as classic UMD `<script>` tags. p5.brush registers its p5 hooks (push/pop, randomSeed/noiseSeed, postdraw flush) only if a global `p5` exists when it loads. p5.esm.js does not set `window.p5`.
   - three.js ships as ESM only (three.module.js imports ./three.core.js, so vendor both). Load it via an import map, and serve over http://127.0.0.1 or launch with `--allow-file-access-from-files`. Without either, `file://` fails with a CORS "origin null" error (verified).
3. **The real GPU works headless on this Mac.**
   - `--use-angle=metal --enable-gpu --ignore-gpu-blocklist` gives "ANGLE Metal Renderer: Apple M2" in both headless shell and `channel='chromium'`. With no flags you get SwiftShader.
   - Measured at 1920x1080:
     - 60 pencil strokes: 8 ms
     - 40 washes: 4 ms
     - 12 watercolour fills (r≈110 px): about 52 ms, i.e. 4–5 ms each
     - 8 hatched rects: 8 ms
     - PNG capture round trip to Python: about 45 ms
   - SwiftShader is about 1–1.5x slower.
   - p5.brush is not the bottleneck unless a frame has hundreds of watercolour fills.
4. **Determinism holds with per-frame, per-element seeding** (`randomSeed(hash(key+'|'+boilIdx))` before each element, every frame).
   - Strokes and hatches are bit-identical across repeated and out-of-order renders.
   - Watercolour fill (and wash, under Metal) differs on at most 0.1% of pixels by at most 7/255. That is GPU raster noise, not RNG, and invisible.
   - So pop and seam checks must use thresholded diffs, not hashes.
5. **What went viral looks handmade**: one idea per shot, time to read each moment, a limited palette on paper, boiling ink. The cheap AI look is glow, bloom, particles, crossfades, neon on black, everything moving at once at one speed, and text that repeats the picture. The current Veo Qubrio loop (blurry glowing blobs, hundreds of atoms, decorative purple arcs between distant atoms, which is also physically wrong) has almost all of these faults.
6. **The card is small and wide.**
   - Desktop: `.card-thumb` is 195 CSS px tall and about 365–515 px wide (2 columns, max wrapper 1100 px), aspect 1.9–2.6.
   - Phone (below 640 px): 165 px tall and about 340–590 px wide, aspect 2.1–3.6.
   - `object-fit: cover` plus a 1.04x hover zoom.
   - Overlays: corner brackets inset about 3%, a dashed inner rect, a "LIVE" pill at the top-right (12 px in, about 70x24), an 18 px fade to white at the bottom, and a hover scanline.
   - A 16:9 frame shows only its central ~67% of height at 515x195, and ~49% at aspect 3.6.
7. **Encode H.264 with full BT.709 tags via `setparams`.** Verified in system Chrome: a matrix-only bt709 tag turns #7c3aed into #7827e6 (G 58→39). In ffmpeg 8.1 the `-color_primaries`/`-color_trc` CLI flags are ignored when filters set frame properties. The fully tagged recipe (section 2.6) reproduces the exact colour in both H.264 and VP9.

## 1. The trend

### 1.1 Reference projects (all 2026-09, Claude Opus 5.5 writing the code)
- **ClaudeAnimationBase and PDoomVideo** (JohnHeibel). The canonical painted pipeline: p5 2.3 + p5.brush 2.2.3, Puppeteer, ffmpeg, 1920x1080 at 24 fps. PDoomVideo is a 156 s watercolour music video. ANIMATION_GUIDE.md is the best taste and rules document in the wild. https://github.com/JohnHeibel/ClaudeAnimationBase , https://github.com/JohnHeibel/PDoomVideo
- **opus-video-skills** (tuzhechen2005). Two Claude Code skills:
  - `painted-animation`: the kit above.
  - `kinetic-reel`: a Canvas 2D type canvas + three.js layers (particle terrain, liquid marble, chrome knot, particle cloud) + a WebGL post pass + a score synthesized from the same cue list. Its style-guide.md covers editorial/tech reels: a palette of black/cream plus one accent; Anton / Archivo Black / Instrument Serif / JetBrains Mono; transitions of 0.45–0.6 s, never 3 of one kind in a row; "no noise whooshes"; facts are sacred, and anything illustrative is labelled SCHEMATIC.
  - https://github.com/tuzhechen2005/opus-video-skills
- **opus-5.5-musical-cartoon** (az9713). p5.brush paints about 23 sprites ONCE (seeded), Canvas 2D composes each frame, a Node synth makes the score, and a local http server serves the page (Chrome blocks JSON and fonts from file://). https://github.com/az9713/opus-5.5-musical-cartoon
- **@addyosmani "how browsers work"** (40 s, JS per frame). The best tech-explainer reference: cream paper with diagonal stripes, a small mascot, lowercase micro-labels, a chapter dial at the top-right, and blueprint-navy scenes for abstract parts. https://x.com/addyosmani/status/2103009037164110327
- **@kimmonismus AI history** (3 min; Remotion + SVG/Canvas, TTS, Python score). One recurring token "the" is the protagonist; warm-on-black, serif-italic captions. https://x.com/kimmonismus/status/2102844654169575547
- **@kevin_t_ngo** (635k views). Crayon and torn-paper texture, a limited palette, big simple shapes. https://x.com/kevin_t_ngo/status/2102437977435893771
- **@ring_hyacinth** (p5.js + p5.brush collage). https://x.com/ring_hyacinth/status/2102986085328716066
- **@Voxyz_ai "Small Print"**. Riso halftone, two spot colours plus cream, mono type. https://x.com/Voxyz_ai/status/2102531681450119426
- **@twoclipping UI-morph** (956k views). Published a prompt template:
  - one HTML file with `seek(t)`, no CSS transitions, timers or state
  - closed-form springs
  - Playwright with 4 subframes per frame, ffmpeg tmix, 60 fps
  - BANS: crossfades, blur-in, "developing" brightness, 3D flips, particles, glow, holds over 1 s
  - last frame = first frame
  - render one still per beat first, then scan for single-frame pops (frame-diff spike over 3x its neighbours)
  - https://x.com/twoclipping/status/2103273003555402193
- **@Ror_Fly cocktail explainer**. A step card with a progress rail and big numerals; one object transforms. https://x.com/Ror_Fly/status/2102853258582880547
- **Remotion Agent Skills wave** (January 2026, a 6M-view demo). Looks templated; Remotion isn't needed here.
- **Catalogues:**
  - https://github.com/jacobbubu/claude-opus-5-5-js-animation-research (30 verified cases with MP4s and prompts)
  - https://github.com/athemeroy/awesome-opus-5-5-videos
  - https://github.com/ismoshushi/awesome-opus-video-skills

### 1.2 What the good ones do visually
- **They commit to one medium.** Everything is painted (watercolour fills, ink outlines, paper grain multiplied on top); they don't mix vector UI, 3D renders and paint. Depth comes from overlap, scale and value. ClaudeAnimationBase bans 3D projection and plain p5 shapes.
- **Small palette, no pure black or white:** 1 accent, 1 complement, 2–3 neutrals. Red only for failure. Rotate grounds between shots so every cut reads.
- **Every shot shows a mechanism, not decoration.** The motion proves the claim, and facts come only from the source.
- **A recurring motif or protagonist.** The ending rhymes with the opening; for loops, the last frame equals the first.
- **Type is minimal and deliberate:** lowercase micro-labels, mono labels, one serif-italic voice line, big condensed numerals. The painted school uses no text at all ("show it, don't write it").
- **Timing is modelled on the viewer.** Each shot has a list of reads; only one read happens at a time. Actions are fast and meanings are held. Lead the eye before each read. Anticipation, then overshoot, then settle; parts move at offset times.
- **Transitions belong to the story:** an iris from the thing that just lit up, a zoom through the watched element, a brush wipe, a match cut, a push. They last 0.45–0.6 s. No crossfades.
- **Always alive:** linework boils at about 12 drawings per second, the camera drifts, idles breathe. A frozen frame reads as a bug.
- **Sound (only for a future 16:9 master; the cards are muted):** synthesized from the same cues, hits on beats, no whooshes, -14 LUFS.

### 1.3 What they do technically
- **Pure function of time.** `renderAt(t)` has no state, no `Math.random`, no timers and no integrated physics. Frames render out of order and in parallel.
- **Seeding per element.** `boilSeed(key)` = `randomSeed(hash(key+'|'+floor(t*12)))`. Otherwise one moving element shifts the RNG stream and everything after it jitters.
- **Capture.** `await redraw()` (async in p5 2.x), then composite into a 2D output canvas (WebGL layer + text + multiply grain), then `toDataURL`. Workers write numbered frames atomically (tmp file, then rename), which makes renders resumable. ffmpeg encodes.
- **Review tooling:**
  - contact sheets at chosen times
  - strips of every frame over 0.5 s
  - full-res crops
  - a ms/frame log
  - frame-diff pop scans
  - first/last-frame seam checks
- **Motion blur via subframes + tmix is optional.** Don't use it with boiling linework.
- **Heavy paint:** paint expensive assets once at setup (seeded) into sprites or framebuffers, then compose. Keep 2–3 seeded variants and cycle them at 8–12 fps to keep the boil.

### 1.4 Tasteful vs AI-looking: a checklist for prompts
- **Ban:**
  - glow, bloom, lens flares, particle dust, "holographic" UI
  - neon purple or cyan on pure black
  - morphing blobs or crystals
  - crossfades and blur transitions
  - everything moving at once at a constant speed
  - symmetric grids with no focal point
  - hundreds of identical elements used as texture
  - decorative arcs or lines with no meaning
  - text that repeats the picture, unreadably small labels
  - dead frames, or five simultaneous events
- **Require:**
  - one idea per shot, a visible cause and effect
  - holds after each event
  - a limited palette on paper, static grain
  - lines with pressure and taper
  - drawn imperfection (boil, irregular vertices)
  - physically correct motion
  - one focal point per shot
  - deliberate transitions
  - an invisible loop seam

## 2. Pipeline spec

### 2.1 Vendoring
Put the libraries in `pv/pipeline/vendor/` and record versions and sha256 hashes:
- p5@2.3.4: lib/p5.min.js
- p5.brush@2.2.3: dist/p5.brush.js (UMD)
- three@0.186.1: build/three.module.js AND build/three.core.js
- fonts as woff2 from @fontsource

npm dist-tags today: p5 latest 2.3.4; p5.brush latest 2.2.3 (peer p5 ^2.2); three latest 0.186.1.

### 2.2 Page
- **Scripts:** p5.min.js, then p5.brush.js (global `brush`), then `<script type="importmap">{"imports":{"three":"./vendor/three.module.js"}}</script>`, then a module that sets `window.THREE` and a ready flag.
- **Capture only `<canvas id=out>`, the 2D compositor.** Each frame, composite into it:
  1. a static paper canvas, generated once with a seeded LCG
  2. the p5 WEBGL canvas (p5 2.x default `preserveDrawingBuffer: true`; antialias is off on Chrome, so render at 1920 and downscale with lanczos)
  3. an optional three canvas: `new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true})`, `drawImage` right after `render()`
  4. type via 2D `fillText` after `await document.fonts.load(...)` (p5 WEBGL `text()` needs `loadFont`, so avoid it)
  5. static grain and vignette with `globalCompositeOperation='multiply'`
- **Expose:** `window.ready`, `renderAt(t)`, `renderSheet(times, cols, w, crop)`, `gpuInfo()`.
- Call `noLoop()` and hide `.p5Canvas`.
- **Never name globals after p5 functions** (`line`, `text`, `color`, `scale`); global mode throws "Cannot redefine property". Keep scene code in IIFEs.
- Guard against NaN points: they throw "Failed to construct 'OffscreenCanvas'".

### 2.3 three.js: math first, pixels second
- **Best use:** build the atom array and camera in three, use `v.project(camera)` to get screen points, and paint the marks with p5.brush, sized by depth. This gives real perspective and camera moves with a painted look.
- **Pixel layer:** only for additive light (Rydberg beam, fluorescence), composited with 'screen' or 'lighter' at low alpha. No PBR, bloom or chrome.
- **Verified:** r186 renders on Metal headless, and `Vector3.project` is exact.

### 2.4 Time, seeds, loop
```js
const FPS=24, L=16, N=FPS*L, BOIL=12; // BOIL*L integer
const boilIdx = t => Math.floor(t*BOIL+1e-6) % (BOIL*L);
// seed(key, still): FNV hash of key (+'|'+BOILN unless still) -> randomSeed(h>>>0)  (also seeds p5.brush)
// frame i: t=i/FPS, i in 0..N-1 (frame N == frame 0; do not render it)
// renderAt(t): BOILN = boilIdx(t); noiseSeed(77); paper; seed('bg'); bg(); seed('atoms'); atoms(); ...
```
- For still elements use `still=true`, or `hash(i)`.
- Boil at 8–12 fps.
- Periodic motion: `sin(2π·k·t/L)` with integer k.
- Loopable noise: sample on a circle, `noise(R cos 2πt/L, R sin 2πt/L)`.
- If you use `brush.field`, call `refreshField(f(t))` with a periodic f.

### 2.5 Capture (Python Playwright, at most 3 processes)
- Launch args: `['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--allow-file-access-from-files','--disable-background-timer-throttling','--disable-renderer-backgrounding']`.
- Fallback: `['--use-angle=swiftshader','--enable-unsafe-swiftshader']`.
- One page per worker, pulling from a shared frame queue. Write `frames/f%05d.png` atomically and skip frames that already exist.
- A 16 s loop is 384 frames, so a single worker takes only minutes.
- Log page errors. Some scenes make p5.brush log five `WebGL: INVALID_OPERATION ... not from the associated program` warnings once per page; ClaudeAnimationBase reports them as harmless (per its guide; I did not reproduce them). Any other page error is real.

### 2.6 Encode (muted card loop)
```bash
ffmpeg -y -framerate 24 -i frames/f%05d.png \
  -vf "scale=1280:-2:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv" \
  -c:v libx264 -preset veryslow -tune animation -crf 22 -profile:v high -g 48 -an -movflags +faststart qubrio_loop.mp4
ffmpeg -y -i frames/f00000.png -vf "scale=1280:-2:flags=lanczos" -q:v 82 qubrio.webp   # poster = exact frame 0
```
- Width ≥1280 px for retina: a 515 CSS px box is 1030 device px.
- Target ≤2 MB (the current loop is 1.6 MB at 800x442). If over, raise CRF to 24–26 first.
- Keep grain static: animated grain explodes the bitrate and turns into mosquito noise.
- Render exactly N frames. No duplicated last frame, no fades at the ends.
- AV1/VP9 is optional. The page currently takes a single MP4 URL (`video:` in `PROJECTS`), so H.264 is the deliverable.

### 2.7 Verification (a required step)
- **Stills:** one frame per beat, viewed with Read, before any full render.
- **Sheets:** a 12-frame sheet of the whole loop, a strip of every frame across each move, and a strip across the seam (last 0.5 s + first 0.5 s).
- **Card previews:** center-crop and downscale every sheet to 515x195 and 342x165, and look at those.
- **Automatic checks:**
  - frame-diff spikes over 3x the median
  - the seam diff frame(N-1)→frame(0) should be close to a typical neighbouring pair
  - no console errors
  - ms/frame logged

## 4. Crafting for the small looping card
- **Compose at about 2.4:1** (e.g. render 1920x800 and deliver 1280x534) instead of relying on a 16:9 crop.
  - Keep the story inside the central 80% of width x 70% of height.
  - Keep the top-right 15%x20% (LIVE pill) and the bottom 10% (white fade) free.
  - For a 16:9 master too, render the same timeline with a second camera framing. It's code, so framings are cheap.
- **Scale floor.** Master→card factor is about 0.27 on desktop and 0.18 on phones (1920-wide master):
  - lines ≥1 CSS px → ≥4–6 px in the master. HB and 2H vanish; use pen, 2B, charcoal, or a custom ink.
  - atoms ≥5–6 px diameter → 25–35 px in the master
  - hatch spacing ≥3 px → ≥14 px in the master (finer hatching becomes grey tone or moiré and is smeared by H.264 4:2:0)
  - text ≥11–12 px → ≥60 px in the master
- **Density:** at most 1 number or word on the card, since the card already has a title and description. About 30–80 atoms read as atoms; hundreds read as texture (the Veo failure).
- **Motion curves:**
  - atoms on AODs: minimum-jerk `s=10τ³−15τ⁴+6τ⁵` with no overshoot; rows move rigidly, so no stagger within an AOD move
  - graphic marks: expo-out entrances, backOut for small pops
  - settles: closed-form damped springs
  - 60–120 ms stagger only between independent items
  - holds ≥0.5–1 s after every event
- **Pacing (16–20 s):** 4–5 reads of about 2–4 s each, one at a time, with 0.45–0.6 s transitions. The seam should land on a calm state. Atoms are indistinguishable, so closing on a permutation of the start layout is valid.
- **Colour and grain:** paper plus static multiply grain, vignette ≤0.3, and 4–6 colours from the card accent. For Qubrio:
  - violet #7c3aed (key)
  - ink #2B2233
  - paper #F3EBDC
  - ochre #E8AA38 (matches the orange dashed AOD lines in the paper figures)
  - teal #3A9C98 (traps)
  - red only for a rejected move
- **Page fit:** a light paper video blends with the white card body and the bottom white fade. A dark ground (indigo, not black) keeps continuity with the other three cards' dark `thumbBg`. One shared style across the four cards reads as a system; four different styles risk looking like a sampler.

## 5. Qubrio: facts and physics
**Facts** (from qubrio.picasso-lab.com; use only these):
- Title: "Qubrio: High-Performance Quantum Compilation via Multi-Agent LLM Collaboration".
- Headline results against PowerMove (the prior state-of-the-art compiler): 4.7x hardware-runtime reduction on average, 1.3x fidelity.
- Other speedups: 5.9x at ~60 qubits, 3.8x at ~20, and 30.3x against the Enola baseline on GHZ-78.
- Agents:
  - Placement: qubits to traps, enforcing interaction distance
  - Routing: AOD shuttling, non-crossing and velocity-bounded
  - Optimize: diagnostic feedback that splits runtime and fidelity (transfer vs decoherence)
- Deterministic verifiers (collision, crossing, adjacency, crosstalk) localize violations to a timestep.
- Convoy routing: buffer positions plus continuous motion that keeps atoms in the AOD across rounds.
  - 30.3 qubits per AOD move on GHZ-78, vs 1.7 for previous scalar routing
  - distilled into classical compilers, it recovers 38% of the gain
- Zoned architectures: 2263x fidelity on QFT-63.
- Benchmarks: QFT, QAOA, GHZ, Ising.

**Physics:**
- Static SLM traps form a regular grid (dotted circles in the paper's figures).
- AOD moves select rows x columns (orange dashed crosshair lines). Atoms at those intersections move rigidly.
- Rows and columns may stretch or contract but never cross; order is preserved.
- Speed is bounded: fidelity drops above about 0.55 m/s average.
- SLM↔AOD transfers cost fidelity, which is why convoy routing keeps atoms in the AOD.
- A global Rydberg pulse applies CZ to pairs brought within interaction distance. Non-partners must stay far away (crosstalk).
- Never draw arcs between distant atoms.
- Zoned layout: storage / entanglement / readout.

**Suggested 16 s loop:**

| Time | What the viewer should read |
|---|---|
| 0–2.5 s | A calm atom grid in traps, with the entanglement band as a pale violet wash |
| 2.5–7 s | Convoy: ochre dashed AOD rows and columns grab a group, which glides rigidly (min-jerk) into the band. An optional ghost of the old one-at-a-time route shows first and is struck off. |
| 7–9 s | Pairs side by side; one Rydberg sweep (additive light) crosses the band; an ink ligature joins each pair |
| 9–12.5 s | A schedule bar shrinks to 1/4.7 of its length while atoms return, and a painted "4.7x" appears (the only text, ≥60 px in the master) |
| 12.5–16 s | Atoms settle into the start layout (a permutation), the bar resets under a wipe or iris, and the last frame equals the first |

**Three style options for the user:**
- **A. Lab-notebook watercolour:** cream paper, boiling ink outlines, watercolour zone washes, ochre and violet accents. Closest to the viral p5.brush look.
- **B. Night-lab pastel:** indigo paper #1F2550, chalk, pastel and crayon marks, additive light only for lasers. Continuous with the dark cards.
- **C. Editorial riso:** two spot inks plus cream, halftone shading, one bold numeral, and a three.js-projected tilted array drawn as flat marks. Closest to the kinetic-reel and "Small Print" looks.

## 6. Sources
- **Pipelines and guides:**
  - github.com/JohnHeibel/ClaudeAnimationBase (ANIMATION_GUIDE.md, src/core.js, render.mjs)
  - github.com/JohnHeibel/PDoomVideo
  - github.com/tuzhechen2005/opus-video-skills (skills/kinetic-reel/references/style-guide.md, sound.md; skills/painted-animation/SKILL.md)
  - github.com/az9713/opus-5.5-musical-cartoon
  - github.com/jacobbubu/claude-opus-5-5-js-animation-research
  - github.com/athemeroy/awesome-opus-5-5-videos
  - github.com/ismoshushi/awesome-opus-video-skills
- **p5.brush:**
  - github.com/acamposuribe/p5.brush (README, llms.txt, src/, issues #14, #20, #49)
  - p5-brush.cargo.site
  - tylerxhobbs.com/essays/2017/a-generative-approach-to-simulating-watercolor-paints
- **Viral posts:** the x.com links in 1.1, plus x.com/leo_xiaolei/status/2102724347446305104.
- **Remotion wave:**
  - startuphub.ai/ai-news/artificial-intelligence/2026/remotion-ai-video-makes-production-code-from-plain-prompts
  - quickleap.io/blog/remotion-claude-code-skill-review
- **Qubrio:** https://qubrio.picasso-lab.com/ (figures downloaded to research/qubrio_site/)

# p5.brush 2.x cheatsheet

# 3. p5.brush 2.2.3 cheatsheet (p5 build; verified against source at commit 0e85177 and in headless tests)

## Setup
```js
// <script src="vendor/p5.min.js"></script><script src="vendor/p5.brush.js"></script>  (UMD, in this order)
function setup(){ createCanvas(W,H,WEBGL); pixelDensity(1); noLoop();  // WEBGL is mandatory
  angleMode(RADIANS);          // brush angles follow p5 angleMode (default radians)
  brush.scaleBrushes(W/400);   // built-ins are tiny without it: ~3 for 600px, ~4.8 for 1920 (tune by eye)
  defineBrushes();             // brush.add(...) AFTER scaleBrushes, or call scaleBrushes again
}
// per frame: background(PAPER) or image(paper); push(); translate(-W/2,-H/2);  // WEBGL origin = centre
```
- **Rendering a frame:** use noLoop and `await redraw()` (p5 2.x redraw is async). p5.brush composites at postdraw automatically, so capture after `redraw` resolves. The 1.x `reDraw`/`reBlend` no longer exist.
- **Instance mode:** call `brush.instance(p)` inside the sketch function before `p.setup`.
- **ESM caveat:** the addon registers only if a global `p5` exists when p5.brush evaluates. With ESM imports (hoisted), the hooks silently don't register. Prefer UMD.
- **Offscreen targets:**
  - `pg = createGraphics(w,h,WEBGL); brush.load(pg); ...; brush.load(); image(pg,x,y)`
  - or `fb = createFramebuffer(); fb.draw(()=>{ brush.load(fb); ... }); brush.load()`
  - `pg.createFramebuffer()` is not supported.
- **Standalone build** (`p5.brush/standalone`, dist/brush.js): uses `brush.createCanvas`, `brush.clear`, `brush.push/pop/translate`, `brush.seed/noiseSeed`, and needs `brush.render()` at the end of every frame. Never mix it with the p5 build.

## Built-in brushes
These are defined in src/stroke/stroke.js. The README's `marker2` and `hatch_brush` no longer exist. `brush.box()` lists them.

| Brush | Look |
|---|---|
| pen | fine, even ink |
| rotring | crisp technical pen |
| 2B | soft dark pencil |
| HB | light pencil (vanishes at card scale) |
| 2H | lighter pencil (vanishes at card scale) |
| cpencil | coloured pencil, opacity 75 |
| pastel | very broad and soft; use with `mass()` |
| crayon | waxy, broken |
| charcoal | grainy, wide |
| spray | scattered dots |
| marker | flat solid with a soft tip build-up |

## Stroke state
- `brush.set(name, color, weightMult)` enables stroke.
- `brush.pick(name)` changes the brush only.
- `brush.stroke(c)` / `brush.stroke(r,g,b)`.
- `brush.strokeWeight(k)`.
- `brush.noStroke()`.

## Custom brushes: `brush.add(name, params)`
- **Params:** type, weight, scatter, sharpness, grain, opacity (0–255), spacing, pressure, tip, image, rotate, markerTip, noise.
- **type:** 'default' | 'spray' | 'marker' | 'custom' | 'image'.
  - 'custom': the `tip(_m)` function draws in a 100x100 space centred on the origin; dark = opaque.
  - 'image': returns a Promise, so use `await` inside an `async setup()`.
- **pressure:** `[a,b]` | `[a,b,c]` | `t=>v` | `{mode:'gaussian',curve:[..],min_max:[..]}`.
- **rotate:** 'none' | 'natural' | 'random'.
- **noise** 0–1: per-stroke opacity jitter (default 0.3).
- **ClaudeAnimationBase's tuned inks:**
  ```js
  brush.add('ink',{type:'default',weight:5,scatter:.25,sharpness:.8,grain:40,opacity:235,spacing:.2,pressure:[1.15,.75],rotate:'natural',noise:.15});
  brush.add('inkfine',{type:'default',weight:2.6,scatter:.15,sharpness:.85,grain:40,opacity:230,spacing:.2,pressure:[1.1,.8],rotate:'natural',noise:.1});
  brush.add('dry',{type:'default',weight:14,scatter:3,sharpness:.3,grain:6,opacity:90,spacing:.6,pressure:[1,.6],rotate:'natural',noise:.4});
  ```
  (scaleBrushes(5) at 1920x1080.)
- **Tools:** Brush Maker https://acamposuribe.github.io/p5.brush/tools/brush-maker.html and a Flow Field maker.

## Primitives
Layering follows call order in 2.2.3. I verified this: fill → wash → fill → stroke → native p5 rect → wash all stacked correctly.
- **Lines:**
  - `brush.line(x1,y1,x2,y2)`
  - `brush.flowLine(x,y,len,dir)` follows the active field
  - `brush.spline([[x,y,pressure?],...], curvature0to1)` returns a Plot
- **Manual strokes:** `brush.beginStroke('curve'|'segments',x,y)`, `brush.move(angle,len,pressure)`, `brush.endStroke(angle,pressure)`.
- **Shapes** (stroke + fill + hatch):
  - `brush.rect(x,y,w,h,'corner'|'center')` (mode is a string, not a p5 constant)
  - `brush.circle(x,y,radius,irregularity0to1)`
  - `brush.arc(x,y,r,a0,a1)` (stroke only)
  - `brush.polygon([[x,y],...])` returns a Polygon (not affected by fields)
  - `brush.beginShape(curvature)` / `brush.vertex(x,y,pressure)` / `brush.endShape(true)` to close; returns a Plot
- **Classes:**
  - `brush.Polygon`: .draw/.fill/.wash/.hatch/.mass/.intersect
  - `brush.Plot`: .addSegment/.endPlot/.draw/.fill/.hatch/.rotate/.genPol
  - `brush.Position`
- **Not in 2.x:** point, ellipse, text.

## Fills
- **Watercolour:** `brush.fill(color, opacity0to255)` + `brush.fillBleed(strength0to1, 'out'|'in', angle?)` + `brush.fillTexture(texture0to1, border0to1, scatter=true)`.
  - About 4–5 ms per r≈110 px fill at 1080p on the M2.
  - Opacity 120 is very pale. Use 160–230, or layer 2–3 passes.
  - `scatter=false` gives a cleaner edge.
  - Group fills by colour so the library can reuse caches.
- **Flat colour:** `brush.wash(color, opacity)` / `brush.noWash()`.
  - Nearly free (~0.1 ms), exact colour at 255.
  - It looks like a flat vector disc. For a painted look, add circle irregularity 0.3–0.5, jittered vertices, and an ink outline.
- `brush.noFill()`.

## Hatch and mass
- `brush.hatch(dist, angle, {rand, continuous, gradient})` + `brush.hatchStyle(brushName, color, weight)`, then draw any shape. `brush.noHatch()`.
- `brush.hatchArray(polygons)`.
- `brush.mass(brushName, color, {precision, strength, gradient, outline})` gives hand-filled dry media; best with pastel or crayon. `brush.noMass()`.
- `brush.massArray([outer, hole...])` uses even-odd holes.

## Vector fields
- Built-ins: hand, curved, zigzag, waves, seabed, spiral, columns.
- `brush.field(name)` / `brush.noField()` / `brush.wiggle(k)` (the 'hand' field) / `brush.listFields()`.
- `brush.refreshField(t)`: pass a periodic function of t for loops.
- `brush.addField(name, (t,field)=>{ field[col][row]=angleDeg; return field }, {angleMode:'radians'?})`.
- Fields bend lines, flowLines and shape outlines; polygons are exempt.

## Clip
`brush.clip([x1,y1,x2,y2])` / `brush.noClip()` applies to strokes and hatches only, not fills. The transform is captured when you call it.

## Seeding and determinism
- The p5 build wraps `randomSeed(n)` and `noiseSeed(n)`, so they also seed p5.brush.
  - The RNG is Mulberry32; seed() resets its Gaussian caches.
  - `brush.seed` is exported too, but use randomSeed in the p5 build.
  - Unseeded, the library seeds from `Math.random()` at load, so ALWAYS seed.
- **Per-frame protocol:**
  ```js
  BOILN = Math.floor(t*BOIL) % (BOIL*L);
  noiseSeed(77);
  // before EACH element:
  randomSeed(fnv(key+'|'+BOILN));   // for things that never boil: fnv(key)
  ```
  Reseeding per element stops a moving element from shifting the stream and re-boiling everything drawn after it.
- **Controlled line boil:** BOIL = 8–12 drawings per second (each drawing held for 2–3 frames at 24 fps). Or wrap t in `onTwos = t => Math.floor(t*12)/12` for a snappier feel.
- **Measured** (render t, render other times, render t again):
  - strokes and hatches: bit-identical
  - wash: identical under SwiftShader; about 0.05% of pixels differ by ≤7 under Metal
  - fill: ≤0.1% of pixels differ by ≤7/255
  - This is invisible. Use thresholded diffs, not hashes, for pop and seam checks.

## Performance
Measured on the M2 with Metal at 1920x1080. SwiftShader: fills about 1.5x slower, strokes about the same.
- Strokes: ~0.13 ms each. Washes: ~0.1 ms. Watercolour fills: ~4–5 ms. Hatch: cheap.
- Budget for ≤1 s/frame: ≤ ~150 fills and ≤ ~1,000 strokes.
- Cost scales with fill count and pixel count.
- **Cache heavy static watercolour:** paint it once (seeded) into `createGraphics(W,H,WEBGL)` via `brush.load(pg)`, or keep 2–3 seeded variants and cycle them at 8–12 fps for boil, then `image()` it each frame. The az9713 cartoon painted about 23 sprites once and composed frames in Canvas 2D.
- The ClaudeAnimationBase README notes that without a dedicated GPU, watercolour fills can take seconds per frame in dense scenes.

## Known bugs and gotchas
- **Strokes lost under zoom** (reported for 2.2.3 by ClaudeAnimationBase): at camera scale ≳2, outlines or lines far from the origin collapse to a dot at the first vertex. Draw each shape around its own centre: `push(); translate(cx,cy)` with local points.
- **Outline weight is in world units** and grows with zoom; reduce it in close-ups.
- **Colour mixing is pigment-like** (spectral.js): yellow over blue turns green, and light over dark goes muddy.
  - For exact colour, use a wash at 255.
  - For light (lasers, glow), use an additive image or gradient with `blendMode(ADD)` or a 2D 'lighter'/'screen' composite. ClaudeAnimationBase first forces a flush with a tiny off-screen fill polygon (`brush.fill('#000',1); brush.polygon([[-50,-50],[-40,-50],[-40,-40]])`).
- **Text and overlays:** draw native p5 text and overlays after the brush geometry. Better, draw type on the 2D compositor canvas (p5 WEBGL text needs loadFont).
- **Guard degenerate or NaN geometry.** NaN throws "Failed to construct 'OffscreenCanvas'". The old zero-area centroid crash ("v is not defined", issue #49) is fixed in 2.2.3.
- **Harmless warnings:** some scenes log five `WebGL: INVALID_OPERATION ... not from the associated program` warnings once per page. Other errors are real.
- **Unit conventions:** angles follow angleMode (default radians). Fill opacity is 0–255, not 0–100. The rect mode is a string.
- **Global-mode clashes:** a top-level function named like a p5 global (line, text, color, scale) makes the page never ready.
- **Card scale:** HB and 2H pencils and hatch spacing under ~14 px vanish or alias at card scale (0.18–0.27x). Use pen, 2B or charcoal, or a custom ink, with weight ≥1.5 after scaling.