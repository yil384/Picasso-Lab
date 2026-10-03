# npr: painterly three.js for the pv pipeline

`runtime/npr/` renders real 3D (lighting, cast shadows, depth, camera moves) so that it looks hand-made:
engraved plate × watercolour lab notebook × a little comic, never the default glossy three.js look. Every
frame is a pure function of the frame index, it composes with p5.brush layers through `defineScene`, and it
costs about 25 ms per 1080p frame on the M2.

```
runtime/npr/
  npr.js      createNPR(): G-buffer materials, painted shadows, hull + Sobel ink, engraving, watercolour
              pass, painterly DoF, glows/beams, ruling, backdrop, comic FX
  looks.js    look presets (engrave | comic | book) and every tunable parameter with its default
  camera.js   deterministic rigs: orbit / dolly / crane / vertigo, handheld drift, whip pan, hit shake
  brush.js    p5.brush bridge: bake painted textures for 3D objects, track 3D points, figure-label layout,
              comic lettering / sfx / leaders / burst balloons (idea after ClaudeAnimationBase, MIT)
  glsl.js     shared GLSL (hash-without-sine noise, surface vertex shader)
scenes/npr_demo.html   demo: neutral-atom optical-table diorama, 3 looks, orbiting camera
```

## What each frame does

| pass | what it paints |
|---|---|
| 1. painted shadow map | Key-light depth from an ortho camera (casters on `LAYER.CASTER`). Lookups wander with world-space noise and use a rotated 12-tap kernel, so shadow edges are irregular brush shapes. |
| 2. G-buffer (MRT, 4× MSAA) | Surface materials. The cel ramp is hand-authored in 3 steps (lit, half-tone, core; the band below the core is reflected light), with a soft, noisy terminator. Warm key and cool fill are multiplied glazes, and reflected light is warm. Specular is reserved as paper white. Engraving: burin lines follow the form in object/uv/world/screen space. Their period stays constant on screen through level-of-detail (engraver-style line dropping), their width follows the painted darkness, and a cross-hatch appears in the core. Comic mode adds Ben-Day dots and a hard rim. Painted light spill comes from glowing things. |
| 3. glass overlay | Glass is drawn the way an engraver draws it: edge lines, a faint tint, two diagonal glints, and dashed back edges. Depth is tested against the G-buffer by hand. |
| 4. watercolour | Wet bleed (noise displacement), pigment pooling at wash edges, granulation in the paper's peaks, flocculation, and dry-brush silhouettes. |
| 5. final | Painterly DoF: 4-sector Kuwahara, so defocused forms flatten into brush patches instead of a lens blur. Composites onto the underlay (paper + p5.brush). Engraved ruling on the background. Sobel ink on depth + normals + id, with hand wobble, boil, pressure and a heavier shadow-side weight, plus the inverted-hull contour. Off-register colour plate, painted glows and beams, comic dots, concentration lines, impact frames, vignette, grain. |

## Wiring it into a scene

```js
import { defineScene } from '/pv/runtime/pv.js';
import { createNPR } from '/pv/runtime/npr/npr.js';
import { bakeBrushTexture, track, callout, leader, letter, sfx } from '/pv/runtime/npr/brush.js';
import { orbit, dolly, handheld, applyRig, whip, yawSmear } from '/pv/runtime/npr/camera.js';

let T;
defineScene({
  meta: { fps: 24, durationFrames: 360, boil: { every: 2, variants: 3 }, fonts: ['Instrument Serif', 'Caveat', 'Permanent Marker'], ... },
  update(ctx) {                       // ALL animated state from ctx.t / ctx.sec
    applyRig(T.camera, orbit({ target: [0, 1, 0], radius: 7.7, az: 0.6 * Math.sin(2 * Math.PI * ctx.t), el: 0.2, fov: 28 }),
             { hand: handheld(ctx.t, { amp: 0.03, rot: 0.003 }) });
    ctx.camera = T.camera;            // ctx.project / track() use it
  },
  layers: [
    { name: 'paper', type: '2d', cache: () => 'static', draw(ctx, g) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ctx.paper({ tone: '#f2e9d8' }), 0, 0); } },
    // (optional) screen-space p5.brush washes here, blend 'multiply': they become the npr underlay
    { name: 'npr', type: 'three', underlay: true, antialias: false,
      async init(ctx, { THREE, renderer }) {
        const npr = createNPR(renderer, ctx, { look: 'engrave', paper: ctx.paper({ tone: '#f2e9d8' }) });
        npr.setUnder(window.__pv.canvas);                 // composite-so-far = paper (+ washes)
        npr.setLight({ dir: [-0.6, 0.8, 0.55], target: [0, 0.6, 0], size: 5, dist: 16 });
        const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, ctx.W / ctx.H, 1.5, 40);
        const tex = await bakeBrushTexture(THREE, { width: 4096, height: 1024, key: 'sky' }, (p, brush, w, h) => { /* paint */ });
        scene.add(npr.backdrop(tex, { radius: 14, height: 12, y: -5 }));
        scene.add(npr.add(new THREE.Mesh(geo, npr.surface({ color: 0xc8743f, hatchMode: 'u' })), { outline: 1 }));
        T = { npr, scene, camera };
        return { scene, camera };
      },
      draw(ctx) {
        const { npr, scene, camera } = T;
        npr.frame(ctx);                                   // boil seed + grain seed, clears per-frame lists
        npr.focusOn(camera, atomPos, 1.1);
        npr.glowAt(ctx, camera, atomPos, { radius: 0.13, color: 0xffd680, behind: true });
        npr.render(scene, camera);
        return false;                                     // npr drew the layer itself
      } },
    { name: 'ink', type: 'brush', blend: 'multiply', draw(ctx, p, brush) { /* leader(), burst() tracking 3D points */ } },
    { name: 'letters', type: '2d', draw(ctx, g) { /* letter(), sfx(), figure labels via callout() */ } },
  ],
});
```

`underlay: true` makes the runtime replace the composite with the npr output. The final pass has already
laid the 3D over the underlay (paper + whatever was below). Set `antialias: false`: npr renders its own MSAA targets.
There must be at least one `'brush'` layer in the scene for `bakeBrushTexture`, which needs the p5 instance.

## API

### `createNPR(renderer, ctx, opts) -> npr`
`opts`: `{ look = 'engrave' | {extends, ...params}, paper: canvas, under: canvas, samples = 4, shadowSize = 2048, light: {...} }`.

| method | purpose |
|---|---|
| `setLook(look)` | Switch preset or apply overrides: `npr.setLook({ extends: 'engrave', hatchW: 2.2 })`. |
| `setLight({ dir, target, size, dist, near, far, shadows })` | Sets the key direction (towards the light) and the ortho shadow volume around `target`. |
| `setPaper(canvas)` | Paper texture, used for granulation and the multiply. Use the same `ctx.paper()` canvas as the paper layer. |
| `setUnder(canvas)` | Composite-so-far (`window.__pv.canvas`), re-uploaded every frame. |
| `surface(o)` | G-buffer material. See the options table below. |
| `glass({ tint, alpha, edge, glint })` | Engraved-glass overlay. Add the mesh with `npr.add(mesh, { glass: true })`. |
| `backdrop(map, { radius=14, height=10, y=-2, center, arc=[start,len], color })` | **Painted cyclorama**: an open cylinder seen from inside, carrying a baked p5.brush wash. Washes get true parallax, DoF and haze, and still receive ruling and comic dots as "background". `arc` theta 0 = +z, π = −z. |
| `add(mesh, { cast=true, outline=0\|width, glass=false })` | Registers a mesh (layers) and optionally adds an inverted-hull outline. |
| `outline(mesh, width)` | Inverted hull with brush pressure. It boils, and is heavier on the shadow side. |
| `frame(ctx, { boilEvery, boilVariants })` | **Call first every frame.** Sets the boil seed (default `meta.boil`, 12 drawings/s at 24 fps on twos) and the grain seed, and clears glows, beams and FX. |
| `pointLight(pos, { color, radius, i })` | Painted light spill: banded pools of the light's colour on nearby surfaces. Max 4. |
| `glowAt(ctx, camera, pos, o)` / `glow(g)` | Painted glow at a world or design point. See **Glows** below. Max 24. |
| `beamAt(ctx, camera, a, b, o)` / `beam(b)` | Painted beam: `{ width (world), i, color, pulse (0..1 pos), pulseAmp, pulseW, lines=5, seed, occluded }`. Max 4. |
| `focusOn(camera, point, range)` | Puts the painterly DoF focus plane on a world point. `range` = sharp half-depth (world units). |
| `setSmear(dx, dy)` | Directional smear + speed streaks in design px (whip pans; see `yawSmear`). |
| `focusLines({ x, y, r0, amount, count=90, width=1, seed })` | Comic concentration lines (集中線) converging on a design point, with a clear centre of radius `r0`. |
| `impact(k, { threshold=.55, invert })` | Impact frame: posterise to ink + light. Use it for 1–2 frames on a hit. |
| `render(scene, camera)` | Runs passes 1–5 into the layer canvas. Return `false` from the layer `draw`. |
| `sync()` | Profiling only: blocks until the GPU finishes, so layer timings include GPU time. |
| `debug = 1..5` | Colour G-buffer, normals+id, aux (hatch/glow/tone), paint pass, ink/hatch/CoC. |
| `pxPerUnit(camera, p)`, `toPx(x, y)` | Helpers (design px per world unit at `p`; design → gl_FragCoord). |

Exports: `createNPR, rgb, addHullNormals, LAYER {MAIN, CASTER, GLASS}, INK_ID (255), BACKDROP_ID (254)`.

**`surface(o)` options.** All are optional.

| option | meaning |
|---|---|
| `color` | Albedo in paint space (hex, `'#rrggbb'` or `[r,g,b]`). No colour management. |
| `map`, `mapMix` | Multiplied texture (e.g. `bakeBrushTexture`). Alpha = strength. |
| `hatch` (0..1) | Engraving strength. |
| `hatchMode` | `'planar'` (object space, default) \| `'u'` \| `'v'` (follow uv lines: windings, turned parts) \| `'world'` \| `'screen'`. |
| `hatchDir`, `hatchDir2` | First and cross-hatch plane normals. |
| `hatchScale` | Line-density scale. |
| `toneBias` | Brighter (+) or darker (−) on the ramp. |
| `shadeColor` + `shadeMix` | Custom shadow colour. |
| `spec` | Highlight reserved as paper white. |
| `rim` | Hard rim on the shadow side (comic / picture-book). |
| `flat` | Unlit. |
| `glow` | Emissive lift. |
| `halftone` | Per-object Ben-Day amount. |
| `spill` | Receives painted point-light spill. |
| `receive` | Receives cast shadows. |
| `noiseScale` | Painted-terminator noise frequency. |
| `side` | Face side. |
| `id` | Surface id. Auto ids run 1–253 (254 = backdrop, 255 = hull ink). |
| `seed` | Per-object variation seed. |

**Glows.** In the watercolour and engraving looks (`glowStyle 0`), a glow lifts the pigment and re-glazes it with the light's
colour, with a pooled rim, a pale inner ring and a paper-white core. It is never bloom haze.

Options:

| option | effect |
|---|---|
| `rays` (0..1) | Adds an **engraved radiance**: alternating long and short tapered burin rays in coloured ink, the way old plates draw the sun. |
| `rayLen`, `rayCount` | How far the rays reach and how many there are. |
| `behind: true` | The glow only paints pixels farther than the light, so a glowing object keeps its own shading and outline. |
| `occluded`, `probe` | Dim a glow whose centre is hidden (the depth probe sits at the object's front). |

In the comic look (`glowStyle 1`) the same call gives halftone dots in the light's colour, and `rays` draws an inked **burst star**
(`rayCount` = spikes, filled with `burstFill`). Beams get a bundle of engraved lines along the axis (`lines`) in
the engraved look, and inked edges plus dots in comic. Rule of thumb: rays on 1–2 hero lights per frame, not on every atom.

### Looks (`looks.js`)
Three presets over `DEFAULT_LOOK`; every key can be overridden. Lengths are **design px** (1920×1080), scaled by `ctx.S`.

- **engrave**: a hand-coloured engraving. Burin hatching carries the value, with a cross-hatch in the core. The background is ruled, with a white gap around objects. Light watercolour glazes sit 1.6 px off the line, and lights get radiance rays.
- **comic**: two-step cel, bold wobbly ink, Ben-Day dots in the shade and on the background, off-register plates (3.2, −2.4 px), a hard rim, burst stars and inked beam edges. No DoF or atmosphere.
- **book**: soft picture-book. Very soft terminator, pastel glazes, coloured-pencil hatching in the local colour, thin self-coloured lines, heavy bleeds and granulation, deeper focus falloff.

Parameter groups (full list with comments in `looks.js`):

| group | parameters |
|---|---|
| ramp | `t1 t2 t3 termSoft termNoise keyTint shadeGlaze coreGlaze reflTint reflect skyFill groundFill rim* hi hiAmt shine` |
| shadows | `shadowSoft shadowNoise shadowRadius shadowBias` |
| engraving | `hatchPx hatchW hatchCut hatchGamma crossT crossW hatchWobble hatchSwell` |
| halftone | `htAmt htPx htAngle htT htRange htCol` |
| watercolour | `bleed bleedFreq edgeDark edgeR edgeK gran flocc floccFreq dryEdge sat value` |
| ink | `ink hatchInk inkA hatchA selfInk lineW lineWShadow lineNoise depthT normalT crease wobA wobF dryInk hullW hullShadowW misreg` |
| depth | `dofFocus dofRange dofMax dofLines atmos atmosStart atmosEnd atmosCol` |
| lights | `glowStyle glowWash rayW rayTint burstW burstFill beamLines beamLineW` |
| ruling | `rule rulePx ruleTop ruleBot ruleWash ruleNoise ruleGap ruleInk` |
| film | `bgDots grain vignette` |
| glass | `glassTint glassA glassEdge glassGlint` |

### Camera (`camera.js`): pure functions of t or seconds
A rig is `{ pos, target, roll, fov }`.

| function | purpose |
|---|---|
| `orbit({ target, radius, az, el, roll, fov })` | Spherical placement around a target. |
| `dolly(rig, d)` | Move along the view direction. |
| `crane(rig, dy, tilt)` | Raise or lower the camera; `tilt` is how much the target follows. |
| `vertigo(rig, fov1, k)` | Dolly-zoom that keeps the subject size. |
| `handheld(t, { amp, rot, speed, seed })` | Loop-safe periodic drift. |
| `whip(sec, t0, dur, angle)` → `{ yaw, speed }` | Whip pan with a slight overshoot and settle. Feed `yawSmear(camera, speed, fps)` into `npr.setSmear`. |
| `shake(sec, t0, amount, { decay, fps, seed })` | Hit shake at `fps` drawings per second. |
| `applyRig(camera, rig, { hand, yaw })` | Apply a rig (plus handheld and pan) to a camera. |
| `kf(t, keys, ease)` | Keyframes. |

Loops: use integer cycles in `t` (`sin(2πkt)`) so frame N == frame 0.

### p5.brush bridge (`brush.js`)
| function | purpose |
|---|---|
| `bakeBrushTexture(THREE, { width, height, seed, key, background, wrap }, draw(p, brush, w, h))` | Paint once with p5.brush, get a seeded `CanvasTexture` (call it in a layer `init`). Paint inside the `w × h` you are given. It works around a p5.brush quirk (see below). |
| `track(ctx, v3, camera)` → `{ x, y, z, front, on }` | World point → design px, for ink and lettering that follow 3D objects. |
| `callout(ctx, anchor, { text, font, dx, dy, margin })` → `{ x, y, align, from }` | Figure-label layout: the label box is clamped into the safe area, and `from` is the leader's start. Call it from both the ink layer and the letters layer so they agree. |
| `leader(brush, ctx, from, to, { color, weight, brush, bend, arrow, key })` | Boiling ink leader with an arrow tick (brush layer). |
| `burst(brush, ctx, cx, cy, rx, ry, o)` | Spiky comic balloon (brush layer). |
| `letter(g, ctx, txt, x, y, size, color, { pop, rot, stroke, ink, jitter })` | Comic lettering with an ink drop shadow and an overshooting pop. |
| `sfx(g, ctx, txt, x, y, size, color, age, { life })` | Comic sound effect: pops in, wobbles, fades. |

## Determinism
- All randomness is hashed from the frame index, `ctx.seed` and the boil step (`uBoilSeed` changes every `boil.every`
  frames), or it is per-frame (`uFrameSeed`, grain). No accumulated state. The camera and animation come from `ctx.t`.
- Verified on the demo at 1080p:
  - repeated frames in shuffled order give identical hashes;
  - two fresh browser processes give identical hashes for f20, f68, f71 and f110;
  - frame 144 == frame 0 (seamless loop).

## Performance (Apple M2, Metal, shared GPU, load avg ≈ 5.6)
| | npr layer (GPU-synced) | whole frame |
|---|---|---|
| 1920×1080 engrave / comic / book | 25.1 / 22.4 / 23.9 ms | 26–28 ms |
| 960×540 engrave | 12.1 ms | 15.1 ms |

- Boot takes 4–7 s, including baking a 4096×1024 backdrop and three smaller textures (table, face, label).
- Clip capture (PNG readback + ffmpeg) costs about 0.32 s per frame of wall time at 1080p, which is dominated by readback, not by npr.
- Screen-space p5.brush wash layers cost 1–2 s per cache miss (one per boil variant). A baked backdrop avoids that entirely.

## Demo: `scenes/npr_demo.html`
`?look=engrave|comic|book`, `?whip=1` (whip pans at 1.8 s and 4.6 s), `?debug=1..5`, `?sync=1` (honest GPU timing),
`?showtex=1` (shows the baked backdrop and table textures).

The scene is a 6 s loop (144 frames at 24 fps) of an optical table with an octagonal vacuum chamber, a glass cell between
copper coils, an objective lens, a laser head on posts, a lens mount, a cable and out-of-focus foreground optics. The atoms are a
3×6 array of shaded pearls in tweezers. The AOD row moves down to pair with the next row, a Rydberg pulse travels
along the beam and the paired atoms flash (engraved radiance / comic burst + ZAP + concentration lines + impact frames).

The character is an original coral "lens-bug" with a lens-ring antenna and eyes that track the atoms. It blinks, faces between
the camera and the cell, and does a surprise take on the pulse.

The camera is a low hero orbit (az −0.94…+0.30 rad) with a crane, a breathing dolly, handheld drift and auto-focus on the cell.

Deliverables (in `video-kit/pipeline (npr work folder, not included)/out/`):
- `stills/npr_demo_{engrave,comic,book}_{0020,0071,0110}.jpg` (1920×1080)
- `npr_demo_{engrave,comic,book}_3s_960.mp4`: 3 s (f44–f115) around the pulse, rendered at 1080p and downscaled to 960×540
- `npr_demo_{engrave,comic,book}_sheet.jpg`: 4×4 contact sheets over the whole loop

## Gotchas found while building this
1. **p5.brush in a framebuffer maps y through the MAIN canvas aspect.** A 4096×1024 bake came out squashed to
   0.44× in y, and the old 1024² table texture was stretched 1.78×. `bakeBrushTexture` now paints into a framebuffer
   with the main canvas's aspect and crops. Paint only inside the `w × h` it hands you.
2. **Low-res previews drop p5.brush strokes.** The runtime scales brush layers with `p.scale(S)`, but p5.brush's
   bounds test ignores the scale. At 960×540 a leader at design x ≈ 1700 vanished. Preview scenes with brush overlays at 1920×1080
   and downscale (`nshoot.py --scale 0.5`, or `--vf scale=960:540` for clips). This lives in the shared `pv.js` and was not changed here.
3. `README.md` mentions `?profile=1`, but `pv.js` does not implement it. Use `npr.sync()` (`?sync=1` in the demo).
4. **Screen-locked washes flatten 3D.** A p5.brush wash layer stays put while the camera orbits, and a whip pan makes that
   obvious. Put anything behind the set on `npr.backdrop()`.
5. **Card size.** Ruling at `rulePx` 6.5 is about 3.3 px on the 960×528 card and about 1.4 px on a 400-CSS-px card at 1×, which risks moiré.
   Use `rulePx` ≥ 9–10 (or a lower `rule`) for card-bound films. Grain and boil raise bitrate: a 3 s clip at CRF 18 is 2.0–2.8 MB,
   so the 15 s card loop will need a higher CRF or less grain to fit 2.5 MB.
6. Limits: 24 glows, 4 beams, 4 point lights per frame. 253 automatic surface ids.
7. Avoid a blink on a poster or still frame (the demo blinks at t = 0.2, 0.705, 0.9).
