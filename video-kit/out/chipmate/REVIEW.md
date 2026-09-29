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
