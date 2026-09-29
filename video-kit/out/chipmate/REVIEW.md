# ChipMATE "Twin Check" - self-review (README section 8)

Four strict lenses, scores 0-10. Evidence = frame numbers (24 fps) and the stills in `review/`.
Scene: `films/chipmate/chipmate.html`. Storyboard: `films/chipmate/STORYBOARD.md`.

---

## Round 1 - v1, first full version (960x540 preview render, 720 f, seam checked)

Evidence: `review/r1_sheet.jpg` (1 frame/s), `review/r1_grid0.jpg` (f0, f24, f96, f264), `review/r1_grid1.jpg`
(f336, f384, f456, f504), `review/r1_grid2.jpg` (f552, f648, f672, f700).
Loop seam (mean abs RGB diff between adjacent frames): f719->f0 = 23.7, neighbours 20.2-25.7 (the home crane is
moving fast there), so there is no pop.

### 1. Creative director (P(doom) bar) - 7.0
- + The loop tells the method in order, and each step is something a character does: two identical tickets, the
  screen and the peek-bonk gag (f84-104), hammer vs quill, the toss over Py's ducking head, BZZT (f257), the blame
  with anger veins (f300-334), the bug in the chip, the high five, the giant's WHAM, and the "80.1%" slam.
- + The camera never stops: crane, trucks, whips with smear, a tilt-up reaction.
- **must-fix** The two street runs (f210-290, f430-490) have no character in shot: 6 s of props only. P(doom) keeps
  a face in every shot. Give the check-lamps faces (a grin when a cycle matches, X-eyes on the mismatch) so each
  comparison is acted.
- **must-fix** The giant's reaction (f666-682) is weak: the visor is shaded dark and the shocked eye barely reads
  (`review/r1_grid2.jpg`, bottom left).
- nice: 0-28 s is only the crane; something should move in the city (traffic).

### 2. Tech-art lead (stylised three.js) - 7.2
- + A real lit set with depth (die, gate buildings, clock tower, PCB skyline, painted dusk cyclorama); cel ramp +
  halftone in the shade, hull + Sobel ink with boil, off-register plates, paper grain; SFX hand-lettered from stroke
  skeletons. Nothing glossy or default.
- **must-fix** The check street is a pale lavender band (f240-280, f456): the amber/teal ribbons and the lamps sit on
  low contrast. Paint it as dark asphalt so the traces and lamps pop.
- **must-fix** The giant's visor is lit like a surface and goes dark when it leans in; a visor is a screen: flat, bright.
- nice: the harness's glass dome is almost invisible; the far-left capacitor reads as a blue block.

### 3. Domain expert (RTL / verification) - 8.0
- + Facts are right: same NL spec + port skeleton to both agents; independent build; random stimuli (a die re-rolled
  every cycle, the same input to both lanes); cycle-by-cycle comparison (one lamp per clock tick); match-rate gauge
  7/8 then 1.0; diagnostics go back to both agents; round tally; 71.2% / 80.1% on a proportional scale; "9B" / "1.6T".
  No testbench or answer key anywhere.
- **must-fix** After the diagnostic only Chip's chip is sent back (f350), before anyone knows which side is wrong, so
  the harness looks like it blamed the Verilog agent. A mismatch is a candidate bug in *either* agent: send both
  artifacts back, let Py's model come out clean and the bug show up in the chip.
- **must-fix** The "round 2 of at most 5" tally is too small to read (f404).

### 4. Web designer (400x195 card) - 7.5
- + At card size the story beats read: the sign, the two characters, BZZT!, the "80.1%" hold with the "71.2%" pennant
  and the "1.6T" giant. The poster (f648) is strong and centred. Palette is on-series (cream, amber, teal, ink).
- **must-fix** The run shots are pastel and low contrast at 400 px (same fix as tech-art).
- to check at 1080p: master <= 70 MB, card <= 4 MB, rotate the card loop to start on the poster frame.

### Fixes for v2
1. Lamp faces in ink (grin / X-eyes + zigzag mouth), boiling with the ink.
2. Dark asphalt street; lamps and ribbons on it.
3. Giant visor: flat + glow, huge round shocked eye, jaw with teeth that drops over a dark mouth.
4. After the diagnostic both artifacts pop back; Py checks its model (clean, smug); the bug is in the chip; after the
   fix both go back into the harness.
5. Bigger tally slate.
6. Signal pulses running along the copper-trace roads (city traffic, loop-periodic).
7. Glass dome edges stronger.

---

## Round 2 - v2 (all round-1 fixes in; 960x540 preview render + four 1080p stills)

Evidence: `review/r2_sheet.jpg` (1 frame/s), `review/r2_card400.jpg` (every 2 s, centre 1.82:1 crop at 400 px),
`review/r2_grid.jpg` (f264 BZZT on the new asphalt, f372 inspection at 1080p, f648 payoff at 1080p, f526 whip),
`review/r2_fixes.jpg` (v3 checks, see below). Seam: f719->f0 = 24.2 vs neighbours 22.2-26.6 (no pop).
Card test encode: 3.70 MB, but only at CRF 32.

### 1. Creative director - 8.1 (was 7.0)
- + The runs are acted now: every check-lamp grins as its cycle matches, and the failing one pulls X-eyes under the
  BZZT! (f257-275). The inspection beat is funny and fair: both candidates come home, Py sniffs its own model and
  ticks it clean (f364-376), then spots the bug in Chip's chip and points. The giant's reaction reads (huge round eye,
  "!", sweat, f666-682).
- **must-fix** At the sheepish moment Chip turns its back to the camera (f372, `r2_grid.jpg` top right): the key
  reaction face is not visible.
- **must-fix** At the payoff Py is hidden behind Chip's raised arm (f648): one of the two heroes is missing from the
  poster.
- nice: the round-2 tally dot fills while the camera is still leaving the anvil (f404), so it is missed.

### 2. Tech-art lead - 8.2 (was 7.2)
- + Dark asphalt gives the trace viewer real contrast; the lamps' comic glow + faces pop; the giant's visor is now a
  flat bright screen. At 1080p line weights are 3-6 px, halftone 14 px, and the lettering holds (f648).
- **must-fix** The red fairground tent sits right behind "80.1%" and fills the gap of the decimal point (f648).
- **must-fix** The whip smear is so strong that colour slides off the ink and leaves outline-only ghosts (f204, f528),
  the "see-through ghosts" round 1 of the Qubrio films was criticised for.
- nice: per-frame film grain costs a lot of bitrate for no visible gain at card size.

### 3. Domain expert - 8.7 (was 8.0)
- + The one inaccuracy is gone: after the diagnostic both the Verilog chip and the Python model are returned and
  checked; the model is clean, the bug is in the chip. Everything else unchanged and right (see round 1).
- small: the tally slate (round 2 of at most 5) is bigger now but the fill should happen on camera.

### 4. Web designer - 8.0 (was 7.5)
- + At 400 px every beat reads (`r2_card400.jpg`): sign, duo, lanes stacked like a trace viewer, BZZT!, "71.2%" vs
  "80.1%", "1.6T". The card loop starts on the poster frame (f648), so the poster and the first video frame match.
- **must-fix** The card needs CRF 32 to fit 4 MB; halftone and hatching break up at that CRF. Remove the per-frame
  grain (static paper grain stays) to buy several CRF steps.

### Fixes for v3 (applied, checked on stills in `review/r2_fixes.jpg`)
1. Chip turns to camera for the sheepish look (f372-380).
2. Py sits a bit left and lifts its head over Chip's arms during the cheer (f634+).
3. Tent moved left out of the payoff background.
4. Whip smear clamp 260 -> 170 px and 0.8 -> 0.55 strength: colour stays with the ink, speed streaks remain.
5. Tally fill moved to f413, when the harness is in shot.
6. Per-frame grain 0.018 -> 0.006.

---

## Round 3 - v3 at 1920x1080 (the full-resolution render, before the last polish)

Evidence: the left column of `review/r3_fixes.jpg` (f262 BZZT! and the "1.6T" chest-plate texture as they were in v3),
`review/r2_fixes.jpg` (the v3 checks), and `render.py --verify 8` (it re-renders 8 random frames in a fresh browser and
compares them with the stored segments).
Seam: f719->f0 = 25.1 vs neighbours 23.0-26.1 (no pop). A master encode at CRF 18 was 82.5 MB, over the ~70 MB budget.

### 1. Creative director - 8.4 (was 8.1)
- + Both round-2 must-fixes landed: Chip faces the camera for the sheepish look (f372-380), and Py lifts its head over
  Chip's arms in the cheer, so both heroes are in the poster (f648).
- **must-fix** The BZZT! lettering has a glossy highlight stripe and a cream keyline (`r3_fixes.jpg` top left). It reads
  like a vector sticker or web badge, not ink on paper, and that is the "could this be mistaken for a web page" test.
  The "!" take marks have the same highlight line.
- nice: the first 2 s are a crane over the city with only small signal pulses moving.

### 2. Tech-art lead - 8.1 (was 8.2)
- + At 1080p everything else holds: ink 3-6 px, halftone 14 px, and the smear now keeps the colour with the ink (f204, f528).
- **must-fix** Determinism: `--verify` found f377 was not identical in a fresh browser. Two pieces of state leaked from
  earlier frames: the bug's leg rotations and the scale of hidden tickets and planes. A frame must be a pure function of
  its index, or a resumed chunked render will not match.
- **must-fix** The texture cache key hashed only the painter's closure text, not the bodies of the helper painters it
  calls. An edit to a shared painter could silently keep a stale baked texture.
- **must-fix** Same lettering issue as the creative director: sheen and keyline make it glossy.

### 3. Domain expert - 8.6 (was 8.7)
- **must-fix** At card size the "1.6T" chest plate reads as "1.67": the T had a short slanted bar (`r3_fixes.jpg`
  bottom left). The giant's size is a number the film must get right.
- + Everything else is unchanged and right (see rounds 1-2).

### 4. Web designer - 8.2 (was 8.0)
- + Card test (grain lowered): 3.8 MB at CRF 32. At 400 px it is clean: the hatching softens, but every beat reads.
- **must-fix** "1.6T" -> "1.67" at 400 px (same as domain).
- **must-fix** Master at CRF 18 is 82.5 MB, over budget: use the lowest CRF that fits.

### Fixes for v4 (applied; only the affected 1080p segments were re-rendered)
1. Purity: every hidden ticket, plane and can has its scale reset each frame, and the bug's legs are reset before
   posing. Proof: a fresh-browser render and an adversarial-order render (frames out of sequence) are bit-identical to
   the stored frames, and `--verify 8` gives 8/8 identical.
2. The texture cache key now includes the source of the painter and the shared helpers it uses (`fillP`, `paintVisor`).
   All 77 cached textures were re-baked and compared: all are RGB-identical except the intentionally changed chest plate.
3. "1.6T" plate: a wide, upright T (`r3_fixes.jpg` bottom right); segments f510-720 were re-rendered.
4. Lettering: BZZT! is drawn with tapered hand-inked strokes (they swell in the middle and taper at the ends), with no
   sheen and no keyline. The highlight line was removed from the "!" marks. Segments f60-120, f240-300, f360-390 and
   f660-690 were re-rendered, and the frames without lettering in those segments were checked identical to the old ones.
5. Master at CRF 20 (62.3 MB); card at CRF 32 (3.80 MB).

---

## Round 4 - v4, the delivered files (final)

Evidence (all taken from the delivered encodes):
- `chipmate_sheet.jpg` and `review/r4_sheet.jpg`: 1 frame/s.
- `review/r4_card400.jpg`: the centre 1.82:1 crop at 400 px, every 2 s.
- `review/r4_stills.jpg`: f262, f372, f552, f648, f672, f80 at 1080p.
- `review/r4_poster400.png`: the poster at card size.
- `review/r4_seam.jpg`: f714-719 then f0-5.
- The right column of `review/r3_fixes.jpg`.

Loop: frame 720 == frame 0 by construction, and verified. Seam diff f719->f0 = 25.14 vs neighbours 23.03-26.07.
Determinism: `--verify 8` gives 8/8 identical.

### 1. Creative director - 8.6
- + A clear, alive story in which every beat is an action:
  - the order splits (f46);
  - the peek gets bonked (f97);
  - hammer vs quill;
  - the toss over a ducking Py;
  - grinning lamps, then BZZT! (f257);
  - blame, then the paper planes;
  - Py's clean model and the bug in the chip (f372);
  - WHACK;
  - all lamps grin and the city lights up (f504);
  - THOOM;
  - 71.2%, then 80.1%;
  - the giant's jaw drops (f672).
- + The lettering now looks inked on paper, like the rest of the frame (`r4_stills.jpg` top left).
- + Nothing reads as a web page or as generic AI art.
- remaining (minor): the opening 2 s are a crane with small city pulses; the gag starts at f28.

### 2. Tech-art lead - 8.7
- + A real lit set with comic shading throughout:
  - cel ramp with halftone in the shade;
  - boiling hull and Sobel ink;
  - off-register plates;
  - painted p5.brush textures;
  - hand-built stroke lettering;
  - extruded "80.1%" numerals;
  - real camera moves (crane, trucks, whips with a clamped smear, tilts).
- + Frames are pure functions of their index, which is proven.
- remaining (minor): during the f522-534 whip the sketchy ink stays sharp over the smeared colour; the distant PCB
  skyline blocks are plain.

### 3. Domain expert - 8.9
- + Every shot maps to ChipMATE:
  - the same spec goes to both agents;
  - they build independently;
  - one random stimulus drives both each cycle;
  - outputs are compared cycle by cycle;
  - the match rate is shown;
  - a structured diagnostic goes to both agents, because a mismatch is a candidate bug in either;
  - the refine rounds are capped at 5;
  - the run stops at 1.0;
  - there is no golden testbench.
- + The numbers are right and legible: 80.1% vs 71.2% on a proportional striker, "9B" and "1.6T".
- remaining (minor): the round-2 tally dot (f413) is legible only in the master, not on the card.

### 4. Web designer - 8.6
- + The poster (f648, `r4_poster400.png`) is strong at 400 px: "80.1%" centred, the "71.2%" pennant, both heroes and
  the "1.6T" giant.
- + The card loop starts on the poster frame, and the seam is clean.
- + The palette is on-series.
- + Sizes:
  - master 62.29 MB (1920x1080, H.264 High, yuv420p, CRF 20, bt709, +faststart);
  - card 3.80 MB (960x528, CRF 32, +faststart);
  - poster 66 KB.
- remaining (minor): the card only fits 4 MB at CRF 32, because the boiling ink and the constant camera motion cost
  bits. The halftone softens at 960 px, but it is fine at the 400 px card size.

### Scores across rounds
| lens | R1 | R2 | R3 | R4 (final) |
|---|---|---|---|---|
| Creative director | 7.0 | 8.1 | 8.4 | **8.6** |
| Tech-art lead | 7.2 | 8.2 | 8.1 | **8.7** |
| Domain expert | 8.0 | 8.7 | 8.6 | **8.9** |
| Web designer | 7.5 | 8.0 | 8.2 | **8.6** |

Every lens is at 8.5 or above and no must-fix is left. Stopping here.
