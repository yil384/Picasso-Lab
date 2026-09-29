# P(doom), made concrete: what makes it delightful, and recipes for a 15 s Qubrio loop

All paths below are relative to `video-kit/reference/pdoom/` (the original folder also held jobs/ and compare/, not included). Every image was rendered from the
original source (`research/PDoomVideo`, `research/ClaudeAnimationBase`) on the M2 Metal GPU, at 0.1–1.2 s per frame.

| folder | contents |
|---|---|
| `sheets/s01…s12_*.jpg` | 12 chapter contact sheets (9 frames each, labelled with song time and shot), covering curtain-up and all nine chapters |
| `sheets/m01…m09_*.jpg` | 9 motion strips (every frame, or every 2nd to 4th) through the key hits and transitions |
| `sheets/b01, b02_*.jpg` | ClaudeAnimationBase demo ("The fallen star"): full contact sheet, plus a strip of the take-and-turn |
| `sheets/c01_card_size_test.jpg` | 12 hero stills cropped to the central 2.1:1 band and shrunk to 400×190 (our card size) |
| `stills/h01…h14_*.jpg` | 14 full-res 1920×1080 hero stills |
| `compare/r1_*.jpg` | our round-1 films as sheets (frames 0, 40, …, 320), plus the same card-size test |
| `tools/snap.mjs`, `tools/make_jobs.mjs`, `jobs/*.json` | resumable, time-budgeted renderer. Re-run: `node tools/snap.mjs --repo=<studio repo> --jobs=jobs/<x>.json --budget=55` |

---

## 0. The gap in one look

Compare `compare/r1_1-plate-final-1080p.jpg`, `compare/r1_3-notebook-1080p.jpg` and `compare/r1_4-luminous-1080p.jpg`
with any P(doom) sheet, for example `sheets/s04_chorus1_b.jpg`.

- **Round 1 is a diagram of a result; P(doom) is a performance of an event.** Our frames are pages:
  - a double-rule border with margins and a centred, letter-spaced "QUBRIO"
  - "Fig. 1/2/3" headings, checkboxes, a legend and a bar chart
  - labels on every region ("storage", "entanglement zone", "Rydberg")
  - the same locked-off camera for 15 s
  - atoms that are identical beads, evenly spaced

  Nothing *wants* anything, nothing is surprised and nothing reacts. That is the "HTML味/AI味".
- **In P(doom), nothing sits inside a margin.** Every region of the frame is a *place* (a stage, a lab, a hallway, space),
  and the frame edge crops the world: curtains, legs and teeth run off-screen (`stills/h03_22_46s_chomp_lunge.jpg`,
  `stills/h06_33_70s_shinigami_speedlines.jpg`). The camera is *inside* the world, not looking at a sheet of paper.
- **Round 1 barely survives card size** (`compare/r1_card_size_test.jpg`): hairline labels, 15 px atoms, a grey page.
  P(doom) frames still read at 400 px (`sheets/c01_card_size_test.jpg`). The reason is big flat silhouettes, 6–9 px ink,
  saturated fields and one huge SFX word.

---

## 1. What exactly makes P(doom) delightful

### 1.1 Every shot is an event, and someone reacts to it
- Its storyboard rule is "something *happens* on screen": a character does something, and something breaks,
  transforms, chases or falls. Every sheet shows this:
  - a sled ride down the loss curve that drops off a cliff (`sheets/s02_lab_b.jpg`, 9.5 s → 10.9 s)
  - a villain chair-spin that reveals a crown (13.4 s)
  - a Scooby-Doo door chase (18.4 s → 20.6 s)
  - a vault shut on a monster, then the camera orbits to show the vault has no back wall
    (`sheets/s07_chorus2.jpg`, 71.0 s → 72.6 s)
- **Cause, then reaction.** A cause is always followed by a take:
  - star eyes and fireworks (`stills/h01_4_90s_star_eyes_burst.jpg`)
  - sweat drops (`sheets/s01…`, 6.4 s)
  - dizzy swirl eyes with orbiting stars (`sheets/m05…`, 51.4 s)

  The Researcher is the audience's stand-in. Their face tells you how to feel about what Clawd just did.
- **Metaphors become physical props, not overlays.** P(doom) turns its "data" into things characters handle:
  - the P(doom) number is a thermometer on stage that Clawd *pumps* with a bicycle pump (`stills/h04_25_70s_foom.jpg`)
  - the training loss is a hill to sled down
  - NVDA is a line to ride to the moon
  - 1e30 FLOPs is an odometer whose zeros overflow like gumballs (`sheets/s07_chorus2.jpg`, 68.8 s)

  **This is the single most transferable idea:** our "4.7×" must be something a character does to an object, never a bar chart.

### 1.2 Character acting
- **Mood changes are acted, never swapped.** `mood()` in `src/clawd.js` works like this:
  - the eyes squint shut over the 0.08 s before the change
  - the body stretches (−0.14 squash, a sine over 0.16 s), then rebounds (+0.1 over 0.24 s)
  - the emote (`!`, sparkle, sweat) pops in over 0.05–0.3 s and fades out at 1.4–1.7 s

  Frame by frame in `sheets/m06_mood_take_sparks_3.jpg`:
  - 3.54 s: cut in from the wide shot
  - 3.63–3.88 s: sleepy eyes
  - 3.96 s: eyes squeezed shut, body stretched tall, mouth "O"
  - 4.04 s: star eyes pop with a sparkle
  - 4.4–4.7 s: firework rings burst from the frame corners (secondary action)
- **Show the thought.** `sheets/b02_animationbase_take_and_turn.jpg` runs:
  - 1.3–1.8 s: a star falls while Clawd dozes; the cause gets about 0.5 s on screen
  - 2.0 s: eyes wide and "!"
  - 2.5–2.9 s: squint, then a light-bulb idea
  - 3.0 s: a drawn turn through key views (front → 3/4 → side)
  - 3.3 s: trots off

  The order is notice → think → decide → act, with each step held long enough to read.
- **Squash and stretch, anticipation, overshoot:**
  - the `move()` dances squash 0.05–0.20 on every beat hit (hop 0.18, stomp 0.20)
  - the chomp lunge stretches toward the lens (`sheets/m02…`, 22.29–22.46 s)
  - the hard-hat crew leans 0.3–0.35 rad into the shove, then jumps for the high-five
- **Asymmetry, no twinning.** Arms are offset, dancers have their own seeds, and the crowd is out of phase
  (`sheets/s04…`, 35.9 s and 37.2 s). The guide lists "both arms / several characters in sync" as the top sign of generated motion.
- **Pose readability.** Every key pose reads as a silhouette:
  - the mask yanked off mid-air (`stills/h05_31_60s_mask_slip.jpg`)
  - the Researcher flapping like a flag in the doorway (`sheets/s05…`, 44.3 s)
  - Gato holding the Researcher over the chasm by one arm (`sheets/s08…`, 91.0 s)
- **Minimal faces act best.** The faces are two dots or slits, plus sometimes a mouth, and nothing else. Swapping the
  eye shape (stars, hearts, swirls, X, red slits, shades) carries almost all the emotion. It reads even at card size.

### 1.3 Shot design and pacing
- **Shot length and cuts.** Shots run 1.4–4 s and cut on beats (88 BPM, beat 0.682 s). The pattern is a fast action,
  then a held meaning:
  - the CHOMP! black holds about 0.25 s
  - the BOOM white-out holds 4 frames
  - the SLAM! lettering holds about 1 s while the scene dims (`sheets/m08_slam_134.jpg`)
- **One focal action, big silhouette.** In chorus shots the lead fills about 40% of the frame height
  (`sheets/s07…`, 59.3 s, where Clawd fills the stage).
- **Diegetic frames, never page borders.** Frames come from inside the world: the CRT monitor (`s01`, 3.95 s), doorways
  (`s02`, 18.4 s), the proscenium and curtains, the heart cage.
- **Sets, not cards.** The same stage returns four times and escalates each time: party → pyro and basilisk →
  paperclip flood → red alarm (`s03` 23.6 s, `s07` 59.3 s, `s09` 98.0 s, `s11` 124.2 s). The film opens and closes on
  the same curtain (`s01` 0.3 s, `s12` 154.0 s).
- **Weak spots to avoid:**
  - tiny characters in wide shots (`s02` 12.4 s, `s09` 95.7 s)
  - an empty pink field (`s05` 49.2 s)
  - a particle swarm that turns into confetti at card size (`stills/h08_50_40s_atoms_rearranging.jpg` in `c01`)

### 1.4 Camera: never dead
- Push-ins: into the monitor (`s01`, 2.6 → 3.95 s).
- Tilt-up following the rocket (`s03`, 24.8 → 25.7 s).
- Whip pan with a horizontal colour smear as the cut (`m05`, 48.58 s).
- A real orbit around the vault (`stills/h10_72_60s_vault_orbit.jpg`).
- A fly-through down a one-point-perspective aisle (`stills/h13_119_90s_datacenter_aisle.jpg`).
- A pull-back reveal: the apocalypse was a stage play (`sheets/m09_reveal_pullback_137.jpg`, 137.2–139.5 s).
- A deterministic shake on every impact: 18 px decaying as exp(−6·age) on CLANK, and the same on BOOM.

### 1.5 Transitions, dissected frame by frame
| transition | where | how it works (24 fps) |
|---|---|---|
| **Brush wipe** | `sheets/m01_brushwipe_38.jpg` | Five fat strokes tilted −0.1 rad come in from the left with staggered starts (0/.14/.06/.18/.1): 4 frames to cover. Full cover holds 6 frames (38.38–38.58 s) and the cut happens under it. The strokes drag off right with ragged ends in 4 frames. Each stroke has a watercolour body plus cream charcoal "bristle" streaks. It uses a two-colour pair that changes at every chapter break (clay, indigo/violet, teal/sap, violet/rose), so no two breaks look the same. |
| **Chomp → mouth iris (match cut)** | `sheets/m02_chomp_to_mouth_iris_22.jpg` | The lid-mouth lunges to fill the lens (5 frames), then teeth close from the frame's top and bottom edges (2 frames). CHOMP! holds on plum-black for about 6 frames and fades. The mouth then re-opens *from the inside* as a tooth-edged iris onto a new place (23.04–23.21 s). Same shape across the cut. |
| **Flash cut** | `sheets/m04_bomb_flash_105.jpg` | A spark reaches the bomb at the end of a long fuse (the last 0.3 s, glowing), then: 1 frame of ochre starburst, 1 frame of full yellow, a 4-frame paper-white hold with BOOM, and a 6-frame fade-up of the next scene through smoke (105.25–105.71 s). |
| **Pop / tear iris** | `sheets/m07_heart_bubble_pop_58.jpg` | A heart bubble grows from the character's mouth to fill the frame (5 frames). The frame tints inside the bubble with a highlight arc for about 6 frames, then pops at one point, and a ragged watercolour hole tears open onto the next scene in 4 frames. |
| **Slam to darkness** | `sheets/m08_slam_134.jpg` | Chains snap on and padlocks swing and settle. SLAM! holds about 1 s, then the whole frame dims to near-black over 6 frames. |
| **Pull-back reveal** | `sheets/m09_reveal_pullback_137.jpg` | Spotlight in the dark with eyes glowing, then the lights come up and the camera pulls back to the proscenium. Props roll off, the giant costume splits and three small Clawds tumble out. Each read is held about 0.4–0.5 s. |
| **Iris in/out** | `sheets/b01_animationbase_demo.jpg` | The film opens on an iris around the character (0.25 s) and closes on one, holding the small circle before it shuts (10.2–10.85 s). |

Rule: **every seam gets a transition that belongs to the story**, and no two in a row are the same kind.

### 1.6 Comic lettering and SFX
- **Sparse.** The source has about 14 in 156 s, roughly **one per 11 s**: VWOOMP, ZOOM!, POP!, FOOM, BOOM, CLANK,
  SKRRT!, HONK!, THUNK!, CRASH!, SLAM!, PLOP, BOOM and CHOMP!. Only 3–4 are big hits. The storyboard says:
  "a text-heavy frame looks worse".
- **Recipe** (`letter()`/`sfx()` in `src/core.js`):
  - font: Permanent Marker, 120–300 px at 1080p (FOOM 250, SLAM! 210, the bomb BOOM 300, HONK! 140)
  - an ink drop-shadow offset by (0.045, 0.055)·size
  - pop in with backOut over 0.2 s (overshoot s = 1.9), rotated −0.08 rad
  - a decaying wobble of sin(age·20)·0.03·(1 − age/life)
  - life 0.7–1.2 s, fading over the last 0.25 s
- **Placement.** The letters overlap the action and cross it on a diagonal (`stills/h04_25_70s_foom.jpg`,
  `stills/h09_61_80s_boom_basilisk.jpg`, `stills/h11_86_20s_cloud_guards_honk.jpg`). Their colour contrasts the scene:
  red on cream, ochre on violet.
- **Other comic devices:**
  - radial speed lines, alternating in two reds and ink (`stills/h06…`)
  - vertical action streaks as the camera "arrives" (the vault shot)
  - emotes as painted marks: `!`, `?`, sweat, sparkle, swirl, zzz, hearts
- Note that P(doom)'s karaoke bar and prop labels ("P(DOOM)") are there because of the lyrics. **Do not copy the text load.**

### 1.7 Colour and texture
- **Paper.** Paper colour `#F3EBDC` with 70 soft tan blotches and 1400 short fibre strokes (`makePaper`). A *static*
  grain is multiplied over every frame (−0..34/255 on 55% of pixels), plus a warm vignette rgba(120,95,70,.35) that
  starts at 0.45·H. Static grain keeps the H.264 bitrate sane.
- **Two paint modes:**
  - characters and props: flat `wash` plus tapered ink outlines about 6–9 px at 1080p, boiling at 12 fps
    (the random seed changes 12×/s)
  - backgrounds and light: bleeding watercolour `fill`, such as the sunburst stage (`s03`), the lab glow (`s01`, 2.6 s)
    and the monitor's teal bleed (`s01`, 4.9 s)
- **Palette.** Each chapter owns one palette, and the palette arc follows the story:
  - warm lab: indigo, ochre, teal
  - rose/ochre stage
  - sky blue
  - space violet and gold
  - teal data centre
  - alarm red
  - crimson and gold again at the end

  Never pure black or pure white: ink is `#2B2233` and "white" is `#FFF5E2`.
- **Depth without 3D look.** Things farther away are mixed toward a fog colour (the aisle racks are
  `mixCol(rack, fog, fd·.85)`). The ink drops out at distance (`ink: fd < .5 ? PAL.ink : null`).

### 1.8 How P(doom) does "3D", and why it never looks like CG
The vault orbit, the aisle fly-through and the planet-sized GPU are real perspective. In `c04_chorus2.js`, `shotVault`
works like this:
- It hand-writes `P(X,Y,Z)`: rotate by φ, divide by (F + z), and add a tilt.
- It sorts faces back-to-front (painter's algorithm).
- It paints each face as **one flat wash plus an ink outline**. "Shading" is one of two colours: `facing ? '#8E9DB3' : '#4F5870'`.
- Characters are placed at projected points and scaled by the perspective factor f.

Result (`stills/h10_72_60s_vault_orbit.jpg`): real camera motion, but every pixel looks painted. **This is the key to
the "use three.js with craft" request.** Use three.js for everything 3D is good at:
- camera, parallax and occlusion
- moving light across forms
- cast shadows

Then force every pixel back through ink, hatching and wash, so the default glossy three.js look never appears
(section 3.4).

---

## 2. What we should *not* take from P(doom)
- The karaoke bar, the labels and the text load. The ClaudeAnimationBase guide makes the rule absolute: "No text…
  models overuse text."
- Clawd, or any existing character or IP. Design original characters.
- Physics liberties. For us the core action must stay honest (section 3.1). The comedy lives in faces, squash and the camera.
- Particle swarms of small dots (`h08`). About 30–80 atoms read as atoms at card size; hundreds read as texture.

---

## 3. Recipes for a 15 s Qubrio loop (360 frames at 24 fps, frame 360 ≡ frame 0)

### 3.1 Cast and honesty rules (original designs)
- **The qubits: an atom troupe.**
  - Look: cream-pearl spheres, 70–90 px across in the 1080p master, pitch 110–130 px. Each hangs in its own tweezer
    beam, drawn as an engraved light cone from above, like a spotlight or a marionette string.
  - Face: two dot eyes, a mouth only when emoting, like P(doom)'s minimal faces but a new shape. The eye shape carries
    everything: sleepy slits, "!" take, stretch-eyes on the ride, sideways glance at a partner, sparkle after entangling,
    swirl if dizzy.
  - Model sheet first: 6 emotions × 3 sizes (like `research/ClaudeAnimationBase/docs/emotions.jpg`).
- **The three agents as brass scientific instruments come to life** (engraved-plate objects with cartoon faces):
  - **Placement**: a drafting-compass (divider) that "walks" on its two legs and taps atoms.
  - **Routing**: a tuning-fork / baton conductor that plucks the ochre AOD threads.
  - **Optimize**: a pocket stopwatch with scissor arms.

  They need three distinct silhouettes (tall and thin, forked, round). If sheets show that 15 s cannot hold three
  agent reads, keep one agent (the Router) and show the other two as props.
- **Honesty rules** (from `research/REPORT.md` §5 and qubrio.picasso-lab.com):
  - Atom *centres* move only by rigid AOD translations: whole rows and columns, minimum-jerk
    `s = 10τ³ − 15τ⁴ + 6τ⁵`, no crossing, order preserved. Squash, stretch and faces are acting layered *on top*
    of a rigid centre.
  - The Rydberg pulse is global over the entanglement zone. Only atoms at interaction distance become pairs.
    Never draw arcs between distant atoms.
  - Atoms are identical, so the loop may close on a permutation of the start layout.
  - Headline claim: 4.7× hardware-runtime reduction versus PowerMove on average (also 1.3× fidelity).
  - "Convoy" routing is the discovery: up to 30.3 qubits per AOD move on GHZ-78, versus 1.7 for prior compilers.
    **A convoy is a gift for comedy: one move carries everyone, like a train.**

### 3.2 Beat sheet (proposal: 96 BPM, 1 beat = 15 frames, 1 bar = 60 frames, 6 bars)
| frames | read (one at a time) | action and acting | camera (three.js) | seam / transition |
|---|---|---|---|---|
| 0–47 | a sleepy lattice of atoms in light | 4×6 storage lattice in tweezer cones, breathing (3% squash on each beat), zzz marks drift up. The hero atom (front row) opens one eye at f36. | slow crane down toward the chip, fov ≈ 30°, looking down about 35° | continuous from f359 |
| 48–119 | an agent picks partners | The compass strides in (divider walk, on twos) and taps 4 atoms on beats f60/75/90/105. Each tapped atom does a take: 2-frame squint → 3-frame stretch → eyes pop with a painted "!". Ochre pencil target circles boil into the violet entangling band. Untapped atoms *glance* at the compass (the eyes lead). | lateral track that follows the compass with lag | none needed (camera carries) |
| 120–191 | **one move carries them all (convoy)** | Anticipation: the Router plucks and the ochre AOD threads snap taut with a 3-frame overshoot. The block squashes 10% and shuts its eyes. Then the whole block glides rigidly into the band: a 36-frame minimum-jerk move. Faces stretch (sy ≈ 1.12) and speed lines trail. Land at f168 with a 12% squash and a `ring()` settle; hold 12 frames. The watching atoms turn their heads. | dolly alongside at convoy speed, so the block stays centred and the lattice streams past with parallax; fov 30° → 42° → 30° | cut-free |
| 192–251 | flash: pairs entangled | Partners turn to each other (4 frames) and blush. At f210 a Rydberg light sheet sweeps the band in 6 frames. It is a real moving three.js light, so hatching clears across the spheres as it passes. Then: 1 paper-white frame, **"ZAP!"** (Permanent Marker ~220 px, violet with ink shadow), radial speed lines and a 14 px decaying shake. An ink ligature draws itself between each pair over 4 frames, and the eyes become sparkles. Storage atoms squeeze their eyes shut (secondary action). | 8% push-in on the hit | hit |
| 252–311 | **4.7× less runtime** | The schedule is a diegetic engraved paper tape unspooling across the top of the frame. The stopwatch snips it: "SNIP" is a sound mark, not a word. The cut-off 3.7/4.7 curls and flutters away. **"4.7×"** is rubber-stamped on the remainder: the only number, ≥ 90 px in the master. The atoms cheer with hops at offset phases (no twinning). | slow pull-back so the tape and the band share the frame | — |
| 312–359 | back to rest | The convoy glides back into storage (a permutation). The atoms yawn and fall asleep one by one, 4–6 frames apart. The hero closes its eye at f352. The agents exit off-frame. | a periodic path returns exactly to the f0 pose | the seam is the rhyme of the sleeping lattice. Fallback: a brush wipe whose full cover straddles f352–f359 / f0–f5 |

Timing sanity check against the base guide (rule 4):
- 6 reads in 15 s, each ≥ 2 s. The first and last are calm bookends, and the 4 middle ones carry the story.
  If sheets feel crowded, cut the placement read first.
- Every hit has anticipation and a hold of at least 12 frames after it.
- The "ZAP!" and the "4.7×" are the only lettering. That is about P(doom)'s density of big-hit SFX, plus the number.

### 3.3 The fused look: engraved plate × watercolour notebook × a dash of comic
Layer stack in our pipeline (`pipeline/runtime/pv.js` layers, bottom → top):
1. **Paper underlay** (`2d`, static):
   - `#F3EBDC` with fibres, blotches and faint foxing
   - full-bleed: **no border, no margins, no title**
2. **Watercolour washes** (`brush`, or the three.js wash pass in 3.4):
   - violet for the entangling band, teal for tweezer light, ochre for AOD threads and brass, rose for blush and the flash
   - laid loosely: offset 6–12 px from the forms, darkened wet edges, paper left showing (the notebook feel)
3. **Engraved form** (`three`): hatching that follows each surface. See 3.4.
4. **Ink** (`brush`, projected from 3D anchors):
   - 6–9 px tapered silhouettes, boiling at 12 fps
   - hand annotations as *marks*, not words: target circles, a tick on each tap, the pair ligatures, arrows only if needed
5. **Comic layer** (`2d`):
   - one SFX, radial speed lines, emotes
   - Ben-Day/halftone *only* inside the ZAP burst (three's `HalftonePass`, or our own), with dots ≥ 14 px so they survive H.264
6. **Grain and vignette** (`2d`, static multiply, vignette ≤ 0.3).

Typography: Permanent Marker (local) for "ZAP!" and "4.7×".
- A serif italic appears only if *diegetic and optional*, for example a tiny copperplate maker's mark engraved on the tape.
- Nothing needs to be legible at card size except the number.

### 3.4 three.js with craft (it must be the backbone, not a garnish)
The current pipeline demo (`pipeline/scenes/demo.html`) uses MeshPhysicalMaterial, ACES tone mapping and soft shadows.
That is exactly the glossy default look to leave behind. Instead:

- **Scene:** the real 3D set.
  - A thick chip slab tilted in space, with storage, entangling and readout zones. The atoms are spheres.
  - Tweezer beams are cones from an objective lens above. AOD threads are thin ochre tubes spanning the array.
  - The agents are low-poly brass instruments, or 2D brush billboards placed with `project()`.
- **Custom ShaderMaterials only.** No PBR, no specular, no env maps, no bloom.
  - **Engraving shader** for spheres and the slab:
    - tone = 1 − quantised(Lambert from a warm key light upper-left + a cool fill) × shadow-map term
    - lines run in *object space along the form*: sphere latitude lines via `fract(vUv.y·N)`, slab lines along its length
    - line width grows with tone (the classic engraving swell)
    - a second set crosses at 60–90° when tone > 0.55; stipple where tone > 0.8
    - spacing 14–18 px at 1080p, anti-aliased with `fwidth`
    - ink `#2B2233` at about 85% alpha, multiplied over the paper
  - **Cast shadows** from the atoms onto the slab, rendered as denser cross-hatch. Engraved plates love cast shadows,
    and flat 2D cannot fake them well.
- **Ink edges:**
  - Render normal+depth (override material or MRT). A `ShaderPass` edge detector (Sobel/Roberts; the vendored
    `SobelOperatorShader` works as a start) draws 5–8 px silhouettes and 2–3 px creases.
  - Thicker near the camera, thinner far away.
  - To boil, offset the sampling UVs with a noise texture keyed to `boilIdx = floor(t·12) mod (12·15)`.
    It is loop-safe because 12·15 is an integer.
  - Alternative: inverted-hull outlines with per-vertex noise displacement.
- **Watercolour pass:**
  - render object-colour IDs with 2–3 quantised light bands, then warp the edges with noise
  - edge darkening: mask minus blurred mask, darkening rims by 15–25%
  - paper granulation: multiply by the paper height map
  - 6–10 px bleed across wet borders
- **Light as acting.** The Rydberg sweep is a real light (a thin SpotLight or RectAreaLight sheet) moving across the
  band, so the engraving tone changes *on the spheres* as it passes. Add one additive violet glow layer (screen blend,
  low alpha): the only emissive thing in the film. Tweezer cones get additive light along the axis plus engraved "ray" lines.
- **Atmosphere:** distance fog pulls colour toward the paper and thins the hatching, the way P(doom)'s aisle mixes racks
  toward fog. Long lens (fov 28–35°) for the plate-like views; widen only for the convoy dolly's parallax.
- **Spider-Verse split.**
  - Bodies are 3D-shaded; faces, emotes and ligatures are 2D brush marks drawn at the projected sphere centres.
  - Characters are animated **on twos** (`onTwos(t)`, 12 fps holds); the camera moves on ones.
  - Nothing looks more hand-made than a smooth camera over characters stepping on twos.
- **Camera paths** are closed-form and periodic (keys that return, or `sin(2πk·t/15)` with integer k), so f360 = f0
  by construction. Impacts get deterministic hash-per-frame shake, decaying as exp(−6·age).
- **Fallback.** For any shot where the shaders fight you, do what P(doom) did: `v.project(camera)` for points, sort by
  depth, and paint faces as flat washes (facing/non-facing colours) with ink outlines. It gives real camera motion with
  zero CG look (`stills/h10…`, `stills/h13…`).
- **Ban list:**
  - MeshStandard/Physical materials, ACES, HDRI
  - UnrealBloom, SSAO, SSR, DOF blur
  - smooth gradients, specular dots, 1 px CG outlines
  - pure black backgrounds, default grey lighting, uniform plastic spheres

### 3.5 Acting recipes (code-level, closed-form in t)
- **Take** (reuse `mood()`'s numbers): squint over 0.08 s before the change → stretch −0.14 over 0.16 s → rebound
  +0.10 over 0.24 s → emote pop over 0.05–0.3 s, gone by about 1.7 s.
- **Rigid ride, elastic body.** The centre follows minimum-jerk exactly. The body stretches along the velocity
  (sy = 1 + 0.12·|v|/vmax) and squashes on arrival (0.12, then `ring()`: a damped wobble of about 3 cycles over 0.4 s).
  The eyes lead the move by 3–4 frames.
- **Anticipation before every AOD move.** The threads twang taut (3-frame overshoot) and the atoms crouch (sq 0.10)
  for 6–8 frames before they move.
- **Offsets.** Give each atom a `seed` for breathing and blinking phases, stagger reactions 2–5 frames apart, and
  offset the cheer hops.
- **Secondary action** never competes with the main read: storage atoms squinting during ZAP, the cut tape fluttering.

### 3.6 Card rules (the film must also work as a 400×195 muted card)
- Keep all key action in the central 2.1:1 band (y ≈ 83–997 in the master). The encoder's card crop is 1.82:1, so check both.
- Hero atoms ≥ 70 px in the master, ink ≥ 6 px, hatch spacing ≥ 14 px, "4.7×" ≥ 90 px, SFX ≥ 180 px.
- Before any full render, test key frames the way `sheets/c01_card_size_test.jpg` does: crop, shrink to 400 px,
  and check that each still reads.
- Poster frame: the ZAP hit or the 4.7× stamp, not the calm frame 0.

### 3.7 Review loop (what to render while building)
- **Storyboard with reads** (the frame table above), then a **model sheet** for the atom emotions and the agents,
  then **key poses as stills**, then motion.
- **For every shot:**
  - a 9-frame sheet
  - a strip of every frame across each move and hit, like `m01`–`m09`
  - a **seam strip** of f348–f359 plus f0–f11
- **Checks (anti-HTML/AI):**
  - no border, no title, no labels, no chart
  - every shot has an event and a reaction
  - the camera never stops
  - no twinning
  - one SFX
  - the number lives on a prop
  - it reads at 400 px
