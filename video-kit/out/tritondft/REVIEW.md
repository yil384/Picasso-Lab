# TritonDFT — "The All-Nighter": self-review log

Four lenses (README §8), each scored 0–10 with evidence: **CD** = creative director who loved P(doom), **TA** = tech-art lead
(stylised three.js), **DFT** = domain expert (DFT / Quantum ESPRESSO practitioner), **WEB** = web designer of the Projects page.
Every round was run as independent reviewer agents that looked at the frames themselves (contact sheets, per-shot sheets every
4th frame, the real-size card emulation, the loop seam strip and full-size key stills, 960×540), against the brief, the
storyboard, the P(doom) sheets, `reference/style-comic` and `round1-notes.json`. Frame numbers are at 24 fps (f240 = 10.0 s).

## Round 0 — storyboard (before building)

Four storyboard agents each developed one angle; three judges scored all four (see `films/tritondft/STORYBOARD.md` §1).

| angle | CD judge | DFT judge | card / tech judge | overall |
|---|---|---|---|---|
| **A. The All-Nighter** (chosen) | 8.5 | 8.3 | 8.0 | **8.3** |
| B. Lap Two | 7.5 | 8.1 | 7.7 | 7.8 |
| D. Hold Still, Silicon! | 7.3 | 7.4 | 7.3 | 7.3 |
| C. Round the Cell | 6.3 | 6.5 | 6.2 | 6.3 |

Must-fixes carried into the build (all addressed in the final storyboard):
- Both clocks must start on the same frame (they were ~40 f apart → the giant would drain ~1.1 loads, not 1) → both start on f70.
- Same stream width in both hourglasses (a 4.08× neck would break the 68:1 time ratio) → one constant 0.007 stream radius.
- No band-structure chart in Loupe's lens ("chart in a porthole" = web-page tell) → band gap as two physical planks over the cell.
- vc-relax / scf must be the focal action for ≥ 1 s → S3 tilts down to a close-up of the cell breathing and density condensing
  onto the 16 bond midpoints.
- Convergence against a tolerance band, not a known target line; lap 1 fails outside it, lap 2 settles inside.
- Refiner needs the Pareto conflict → k-grid 3×3 → 4×4 → 5×5 crashes the cost pan, back off to 4×4 + cutoff nudge, beam levels.
- Knowledge base must be used, not set dressing → Tri pulls a method book from the Library hub.
- 98% must read as a pass rate over many materials (uncountable scorecard with one faint ✗), never stamped on the Si result.
- $0.04 = exactly four pennies in the cost pan; 68× kept off the HPC engine (Executor ≠ HPC).
- The researcher must receive the result → it pops out of the tube into Hoot's wings.
- TRITONDFT plate legible ≥ 1.5 s in the card band; payoff numerals big, one owner per number, uncluttered.

## Round 1 — first full cut (960×540, all 720 frames)

| lens | score | verdict |
|---|---|---|
| CD | **6.4** | Real 3D comic world, good spine, clean loop, VROOOM / spiral-eye fail / DING land; but agents' faces unreadable in their own beats, S5 and S8 static and cluttered, the 68× race never shown in close-up, a blank smoke-cover transition (f275–286), a camera clip in S6. |
| TA | **6.7** | Real lit set, toon ramp, halftone, ink, a real crash zoom and whips; but the lap orbit clips through Big Iron (f486–490), a flat 2D smoke blob + 7 frozen frames, SFX too rounded ("bubbly"), geometry interpenetration at the pillow and payoff, static frontal payoff. |
| DFT | **6.8** | Cell built right, loop order right, Executor ≠ HPC, honest hourglasses and numbers; but S5 trade-off unreadable, 98% has no visible benchmark context, 68× evidence hidden at the arrival, vc-relax masked by a camera push, cream + sky atoms read as a two-species (zincblende) crystal, the lap-1 bead swings through the band (reads as charge sloshing, not "change too big"), the Library hub reads as a cake tin. |
| WEB | **7.0** | Works as a card, legible SFX and payoff row, very clean seam; but the grade drifts off-series (sage wall, petrol-teal accent), the payoff is low and small, the LIVE pill covered the TRITONDFT plate, ✗/'!' marks at the top edge get cropped. |

Fixes made for round 2:
- Smoke cover → a real whip pan across the room (f274–288) with smear and speed lines; no blank or blended frames.
- Lap orbit rebuilt as a trailing circle (radius 1.65 round the bench, above the agents) that can't enter Big Iron.
- S5 re-blocked: console moved beside Tilt, pegboard tilted to camera with vermilion pegs (3×3 → 4×4 → 5×5 → 4×4), medium-close
  camera whose roll follows the beam, hand-lettered **CLANK!** on the cost-pan crash.
- S8 split: S8a is a medium on Hoot with both hourglasses in frame as the answer lands and the tiny one runs dry; S8b pulls back
  for the slams. The payoff framing is tighter and higher (numerals ~2× larger on the card), and the result is held in front of the chest.
- Scorecard enlarged and propped up toward camera on an easel (many material doodles, one faint ✗) so 98% reads as a pass rate.
- vc-relax: camera locked while the cell relaxes (0.92 → 1.0 with overshoot) against a dashed vermilion ghost of the starting
  cell; scf density condenses afterwards (f256–274).
- All 18 Si atoms one colour (elemental silicon); lap-1 bead wobbles then settles *outside* the tolerance band (✗), lap 2 inside (✓).
- Library hub rebuilt as a ring of standing books; Tri's book leaves a visible gap. Tri faces camera while chopping; bigger tickets.
- Room re-graded: warm cream plaster with a sky-blue wainscot and a navy rail, saturation up; TRITONDFT plate moved above Hoot,
  clear of the LIVE pill; verdict marks kept inside the card band.
- SFX re-lettered condensed and slanted (big first letter, jostling capitals); Loupe's eye drawn from either side of the lens;
  Hoot's pillow moved beside its head so the sleeping face reads at f0.

## Round 2 — full 960×540 pass after the round-1 fixes (`snaps/full2`, all 720 frames)

Independent reviewer agents per lens, each looking at the pack (1 fps sheet, every-4th-frame shot sheets, real-size card
emulation, seam strip, key stills) and stepping through individual frames. The DFT and WEB lenses were lost in a container
restart and re-run on the same frames (scores added below when they came back).

| lens | score | verdict |
|---|---|---|
| CD | **7.2** | Clearly better than round 1: a cohesive 3D comic world, Hoot acts well at both ends, the fail → adjust → lap → DING loop reads without words. Not yet delightful in the middle: agents hide their faces in their own beats (Tri f116–141, Clack f204–240, Loupe S4), the Pareto gag happens behind the cell, the 68× hourglass race is too small to see, the payoff is a static row nobody visibly earns, a 3-frame camera snap at f507–510, an iris "match cut" that plays as a hard cut (f383→384), DING! reads "DWG!". |
| TA | **7.6** | Strong NPR base (toon ramp, halftone, boiling ink on twos, real smeared whips, a crash pull-back on impact frames, clean seam). Defects: the giant hourglass cap slices through Hoot's face at f0 and f704–719; the f504–510 brake is an unsmeared jump; Loupe's 2D eye draws over the lampshade (f612–615); SFX alpha-fade into the next shot; two airbrushed glows (Big Iron's porthole halo, the DING sunburst hiding the bead); DING! illegible; scorecard doodles cross-fade away at the seam (f711–714). |

| DFT | **7.2** | Concepts and numbers exact, loop order right, Executor ≠ HPC, tickets correct, hourglasses honest (both start f69–71; tiny empty at f590 with the giant's one-load pile). But the vc-relax is never visibly performed (the cell grows during the camera push f244–251, then sits still while locked f252–274; the ghost is a hairline); the scf density reads as glassy grey marbles, a second atom species, and turns the delivered result into a jar of beads; 98% has no benchmark context (the "scorecard" lies on Hoot's desk already ticked before the run). |
| WEB | **7.3** | Plate legible and clear of the LIVE pill for ~4 s; numerals 45–55 px on the card; clean seam (Δ 3.8 vs median 11.5). But the dominant blue renders cyan-teal (hue ~185, 166 in the payoff) instead of #0284c7 (hue 200) and the film is much darker than its siblings (11–25% of pixels under luma 0.15 vs 2–11%); the tiny hourglass (the 68× proof) sits below the card band in every shot that matters; DING! reads "DWG!". Should: top-edge beats cropped on the 515 card, a low crowded payoff, poster ≠ first loop frame, UI tells (↻ ticket, ✓ between bars, negative/greyscale impact frames). |

Must-fix (merged, with evidence frames): faces in their own beats (CD-M1; Tri f108–150, Clack f200–240, Loupe f328–364);
the S5 Pareto gag (CD-M2, f396–454); the 68× race and Hoot's manual work (CD-M3; f63–70, f290–312, f584–600, f622–683);
the lap→gauge brake (CD-M4/TA-2, f504–510); the payoff staging (CD-M5, f622–683); DING! lettering (CD-M6/TA-6, f530–555);
the lens→knob iris (CD-M7/TA-10, f376–384); hourglass through Hoot's head (TA-1, f0–20, f62–64, f704–719); Loupe's eye over
nearer geometry (TA-3, f612–615); SFX alpha fades (TA-4); soft glows (TA-5, f222–245, f530–540); the scorecard cross-fade
(TA-7, f711–714); plus the director's own list: the lens-eye wedge at f246–249 (not a clip: Loupe's 2D eye blew up when the lens
sat just off screen; a ray-cast near-plane check over all 720 frames found no real geometry clips), Loupe seen from behind in S4,
Tri's card over its face (f114–128), dead wall frames at the funnel (f566–576), grey translucent dot eyes on the whole cast.
DFT: visible vc-relax against a bold ghost while the camera is locked (M1); scf as flat halftone lozenges on the bonds, only in
S3, never in the delivered result (M2); 98% as a pass rate the viewer sees earned: a blank doodle scorecard that Loupe stamps
full of ticks in the payoff, kept visible beside the numeral (M3). WEB: rotate the blues to #0284c7 and lift the navy fills
(M1); the tiny hourglass inside the card band (M2); DING! (M3, as above).


## Round 3 — full 960×540 pass after the round-2 fixes (`snaps/full3`)

Four independent reviewer agents (one per lens) on the new pack and individual frames.

| lens | score | verdict |
|---|---|---|
| CD | **7.8** | Clear step up: the fail → adjust → lap → DING loop reads without words; Tri, Loupe and Tilt act face-on in their beats; the Pareto gag and the 68× race are in front of the camera; Hoot's takes are funny. Blockers: in the payoff Hoot's face is crossed by the band-gap plank and hidden behind the 68, the right third is a tangle; the S5→S6 kick and the lap brake smear read as ghosted multi-exposures. |
| TA | **8.0** | All seven round-2 TA must-fixes fixed on screen. New defects: the result passes through the funnel (f565–568) and the agents pass through the tube wall at the seam (f694–716); Tilt's cost pan hangs through the cell in the lap (f466–472); the payoff's right third is an ink knot. |
| DFT | **8.2** | Every shot maps to a real concept in the right order; scf density and 98% resolved (blank scorecard stamped full of ticks, one ✗; never on the Si result). Blocker: the vc-relax is a 5-frame pop under Clack's drop, with a thin ghost. Should: density specular, band gap too brief, pennies not countable, QE input unlabelled. |
| WEB | **8.2** | Hue resolved (median 198–203°), tiny hourglass inside the band, DING reads. Blocker: the iris goes to 3–4 perfectly flat navy frames (reads as a video dropout). Should: plank across Hoot's eyes in the poster, ink ~1.6–3× the siblings', grey back face of the turned page, UI-ish marks. Poster pick: f664. |

Fixes made for round 4 (all spot-checked on single frames at 960×540):
- vc-relax: Clack lets go and is home before the camera locks (f242); the ghost shows alone, then an 18-frame damped
  relax; thicker ghost; the density lozenges are matte and held longer.
- Iris: shuts to a pinhole with paper grain printed into the ink (no flat frame), reopens from a pinhole on the knob.
- Whips: smear capped per window (a continuous streak instead of ghost copies), the S3b→S4 whip horizontal only, a
  14-frame overshoot brake onto the gauge.
- Payoff: Hoot hugs the result below its beak, higher camera, Tri on the paper tower, Clack photobombs at the far left
  (68× drops on its own), Loupe's eye a happy arc; the band gap stays open on the ride to the funnel; Tri and Tilt cheer.
- Value: navy lifted a step and ink a step lighter than style-comic (dark share 13–17% → 11–15%); the turned page's back
  is cream paper.
- Hoot's question is an opaque cream thought bubble below the plate; CLANK! clear of the pan; a hand-lettered PW.X header
  on the QE input; THUNK! on the giant's landing; bigger plan tickets; the tape ends in front of Loupe.

## Round 4 — full 960×540 pass after the round-3 fixes (`snaps/full4`)

| lens | score | verdict |
|---|---|---|
| CD | **8.2** | Both round-3 blockers fixed (payoff faces clear, no ghosted multi-exposures); the lens→knob iris is the best transition; the whole story reads without words. New blocker: the S3b→S4 whip lost its smear and strobed as sharp jumps (f318–325). Should: VROOOM has no visible reaction, crowded left third in the payoff hiding the result, hourglasses move without Hoot's hand, a quiet lap. |
| TA | **7.9** | (reported late, on the round-4 frames) Round-3 TA3-1 and TA3-3/TA3-4 resolved; TA3-2 only in a new form. New clips: the launch lever sank through Clack (f209–214), the tipping giant hourglass swept through Clack's dive (f701–704), the returned result flew into the tube full-size inside Tri (f688–698); whip artefacts (no smear S3b→S4, vertical 'rain' at f98, crisp ink doubled over the smear at f460/f510). |
| DFT | **8.6** | No must-fix: the vc-relax now plays ~18 f on a locked camera against a bold ghost; density matte; PW.X on the input; honest hourglasses (TINK at f590), 42-cell scorecard with one ✗ never on the Si result. Should: the scorecard hid the result in Hoot's wings; the 68 numeral covers the giant's one-load pile; band-gap framing in S7; pennies read as two stacks. |
| WEB | **8.2** | Poster f664 confirmed (settled, all five faces, plate in frame). Blockers: the iris still read as a dark dropout (f382–385); the film ~3× darker/heavier-inked than the siblings (poster 21% of pixels under luma 0.15 vs ~7%). Should: CLANK! under the LIVE pill, THUNK! in the bottom fade, S7 framed low, dark back of the turned page, brake speed-line flicker. |

Fixes made for round 5:
- Whip smear now also measures the on-screen slide of the focus point, so trucks and cranes smear (S3b→S4 streaks
  horizontally again); the brake stops smearing at its first landing.
- Iris: a true iris match inside a cream halftone paper panel (closes onto the lens, the knob replaces it inside the
  same circle, opens again) — no dark frame at all.
- Value: ink ~35% thinner than style-comic, lighter halftone/hatch, self-coloured offset-print lines (selfInk 0.42),
  lighter numeral/desk outlines, more paper grain: the poster's dark share 24% → ~13% (card band).
- Payoff: scorecard moved left behind 98%, the result (cell + band-gap planks) visible at Hoot's chest; pennies laid
  out countably (a row of four, two extra at 5×5).
- CLANK! low beside the pan (clear of the LIVE pill), THUNK! above the tiny hourglass (out of the fade), the turned page
  flat-lit cream, S7 framed higher at band-gap height.

## Round 5 — full 960×540 pass after the round-4 fixes (`snaps/full5`)

| lens | score | verdict |
|---|---|---|
| CD | **8.5** | No must-fix. Every whip streaks and lands; the lens→knob iris is a real shape match on paper; the whole story reads without words and the lighter self-coloured ink still reads as bold comic at card size (now close to ChipMate). Should: nobody reacts to VROOOM, the hourglasses move without Hoot's wing, Loupe half-hidden in the payoff, crisp ink over peak whip frames, the knowledge-base book never opened. |
| TA | **7.8** | Best NPR base so far; the iris is a true match with no dark frame; round-3 TA3-1/3/4 resolved, TA3-2 largely. Blockers: the projected-slide smear brought back stepped ghost copies and see-through line-drawing characters, and speed lines fired as full-frame 'rain' on slow tilts/cranes/pull-backs; in S8a/S9 Loupe flew through the lampshade, the returned result through the giant's bulbs and Tri, Clack through the tipping giant, and heads poked through the funnel cone for a frame. Should: small props' ink too thin, cell grazing Clack's carriage in the lap, flat cloud stickers, CLANK!/DING! covering the job and the gauge label. |
| DFT | **8.8** | No must-fix. Every shot maps to a real concept in order; vc-relax, scf, ΔE convergence, the Pareto back-off and all numbers honest (both clocks start f70, TINK at f590, 41/42 ticks ≈ 98% on the benchmark card only, four countable pennies). Should: the giant's front post hid the one-load pile, method book shut, band gap brief in S7, some scorecard doodles QR-like. |
| WEB | **8.7** | No must-fix. Iris resolved (no frame > 3% dark); darkness resolved (film-wide 20.0% → 10.8% under luma 0.15, within the siblings' range); hue on target (198–199° on the poster); CLANK!/THUNK!/S7/page back resolved; poster **f664** confirmed. Should: numerals touching the 515 fade, a 58%-ink impact frame, warm desk vs ChipMate's amber, the scf ticket read as a refresh icon. |

Fixes made after round 5 (spot-checked frame by frame at 960×540, then rendered in the final):
- Round-4 TA must-fixes: Clack hangs from the knob beside the lever shaft; all four agents are squeezed into the tube
  mouth before the giant hourglass tips (dives f686–704); the returned result rides small beside Tri's hand and goes in
  with it; the arrival arc passes in front of the giant; ink and hatching fade with the whip smear (no crisp or doubled
  lines over a streak); the S1→S2 whip smears horizontally (no rain).
- Round-5 should-fixes: cream-dominant VROOOM impact frame; the locked cell close-up framed higher; payoff row higher;
  Loupe in front of the lamp; hourglass posts turned off the neck (stream and one-load pile visible); band-gap planks
  float without a bracket and sit in frame in S7; mid-blue wall rail; the scf ticket shows a bond pair with density
  lozenges; a larger iris pinhole.
- Purity and loop verified after every batch (`shoot.py purity … --loop`: repeats match, f720 == f0).
- Round-5 TA must-fixes (then rendered in the final): a continuous 17-tap tent-weighted smear with every whip capped
  (characters keep their colour; ink and hatching fade with the streak), speed lines only on real whips and only toward
  the frame edges; flights arc toward camera clear of the lampshade and the giant; funnel entries end inside the bell;
  the returned result goes over the giant's cap and is held out beside Tri; Loupe rides its own 98% up (face-on, clear
  of the lamp); Clack steps back from the ring for the lap; bolder cell atoms; cloud puffs with grain and halftone;
  CLANK!/DING! clear of the job and the gauge label.

## Round 6 — the 1080p final cut (rendered in the cloud, reviewed at 960×540 from its lossless segments)

This cut was rendered at 1920×1080 (all 720 frames; fresh-browser determinism f10/f305/f426 and the loop f720 == f0
pixel-identical) and encoded (master CRF 23 = 61.1 MB; card CRF 32 = 3.74 MB; poster f664). It is NOT the shipping cut:
the fixes below came after it, so the final must be re-rendered from the branch (see Handoff status).

| lens | score | verdict |
|---|---|---|
| CD | **8.2** | Loupe fully visible in the payoff and the ink fading on peak whips fixed. Two regressions from the round-5 tweaks: the iris reopened ~165 px off-centre (f383→384), and the delivered result sank into Hoot's notebook and hid behind the 68 (f598–683). |
| TA | *(see below)* | |
| DFT | **8.7** | No must-fix; physics, order and all numbers honest (both clocks f70, TINK f589/590, the giant's one-load pile visible, 39/40 ticks on the benchmark card only, four pennies). Should: the result hidden behind 68× in the poster; the new scf ticket read as a bent triatomic; a PW.X sheet back in Clack's carriage after it was fed to Big Iron. |
| WEB | **8.8** | No must-fix; every beat in the band; value on series (6.5% of pixels under luma 0.15 at 400×195 vs ChipMate 6.6%); hue 197–198°; master and card within spec (faststart, bt709, 720 f, 30.000 s; poster = loop frame 0 = f664); clean seam. Should: Clack hidden behind Loupe in the poster, Tri landing under the LIVE pill (f609–621), the CRF-32 card smudging the halftone on HiDPI, the warm desk vs ChipMate's amber poster. |

Fixes made after the round-6 cut (spot-checked frame by frame at 960×540; all committed):
- CD regressions: the iris reopens on the k-grid knob at the exact centre it closed on; the result is held in Hoot's left
  wing at the chest (above the notebook, planks below the beak), visible beside 68× in the payoff and the poster f664.
- Clack photobombs from the top of the tall paper tower (its grin back in the poster, above Loupe on its 98%).
- A painted pale-blue desk with a cream blotter: the poster's warm share 50% → 31% (sky + cream + the two numeral pops).
- scf ticket = one straight Si–Si bond with a density lozenge; Clack's carriage stays empty after the PW.X input is fed.
- Card encode: `encode_segs.py card2` (2-pass ABR to 3.9 MB, tune animation, spatial-only denoise): 3.85 MB, SSIM-Y
  0.887 vs 0.878 for CRF 32; `posterloop` makes the poster from the loop's decoded frame 0 (poster == first frame).

## Handoff status

**State (branch `video/tritondft`):** scene final; review rounds 0–6 done. Last complete four-lens scores: CD 8.5 /
TA 7.8 / DFT 8.8 / WEB 8.7 (round 5), then round 6 on the 1080p cut CD 8.2 / DFT 8.7 / WEB 8.8 (+ TA below), whose
must-fixes are fixed in the code on the branch. No deliverables are committed yet: the 1080p final must be re-rendered
from this branch (the desk colour, the payoff staging and the iris changed after the cloud render).

**Render the final (from the repo root; every step resumes if interrupted):**
```bash
cd video-kit/films/tritondft
# 1. paint every p5.brush texture once into work/bake (gitignored; without it every worker paints them live at boot)
python3 -u tools/shoot.py tritondft.html bake --out work/bake --width 960 --height 540
# 2. optional sanity: purity + the loop seam at 960 (must print PURITY OK)
python3 -u tools/shoot.py tritondft.html purity 0 431 17 431 664 0 --loop --width 960 --height 540
# 3. the 1080p final: 720 frames into bit-exact lossless segments (~62 min with 3 SwiftShader workers on the cloud VM;
#    GPU/Metal is picked automatically on macOS), then the fresh-browser determinism + loop check (f720 == f0)
cd ../../pipeline
python3 -u render.py ../films/tritondft/tritondft.html --out ../out/tritondft/_final --width 1920 --height 1080 --workers 3
python3 -u render.py ../films/tritondft/tritondft.html --out ../out/tritondft/_final --width 1920 --height 1080 --workers 3 --check-loop --verify 3
```

**Encode the README §7 deliverables (poster frame = card start frame = f664):**
```bash
cd ../films/tritondft
E="python3 -u tools/encode_segs.py ../../out/tritondft/_final"
$E master  tritondft --crf 23 --preset slow        # 1920x1080 H.264 High yuv420p bt709 +faststart; ~61 MB (CRF 18 = 132.6 MB, over the ~70 MB budget)
$E cardsrc tritondft                               # once: 960x528 lossless centre-crop intermediate (1.82:1)
$E card2   tritondft --max-mb 3.9 --start 664      # card loop: 2-pass ABR ~3.85 MB, rotated to start on the poster frame
$E posterloop tritondft                            # tritondft_poster.webp = the card loop's decoded frame 0 (= f664)
$E sheet   tritondft --every 24 --cols 6 --thumb 320   # 1 fps contact sheet (30 thumbs)
cd ../../out/tritondft && mv _final/tritondft_master.mp4 _final/tritondft_loop.mp4 _final/tritondft_poster.webp _final/tritondft_sheet.jpg .
ffprobe -v error -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_frames -of compact tritondft_master.mp4 tritondft_loop.mp4
```
(`card2` and `card` both need `cardsrc` first; the old CRF search `card --max-mb 3.9 --crf-start 30 --start 664` also works.)

**Then:** commit only `out/tritondft/{tritondft_master.mp4, tritondft_loop.mp4, tritondft_poster.webp, tritondft_sheet.jpg}`
(`_final/`, frames, segments and logs are gitignored intermediates), push `video/tritondft`, and optionally run a round-7
review on stills from the new segments (from `video-kit/`):
`ffmpeg -f concat -safe 0 -i out/tritondft/_final/segments/list.txt -vf scale=960:540:flags=lanczos -q:v 3 -start_number 0 films/tritondft/snaps/final/f_%04d.jpg`
then `python3 tools/review_pack.py snaps/final f snaps/review_r7` (from `films/tritondft`).

**Site integration (not done; outside this branch's scope):** copy the poster to `projects/tritondft/tritondft.webp` and
the loop to `projects/tritondft/tritondft_loop.mp4`, and set the TritonDFT `thumbBg` in `projects/projects.html` to the
film's cream paper (e.g. `#efe4cc`) so no dark navy block flashes before the poster decodes.

**Known open (should-fix, not blocking):** nobody visibly reacts to VROOOM; Hoot's wing never touches the hourglasses
(they flip on their own); the knowledge-base book is never opened; Tri lands under the LIVE pill for ~0.5 s (f609–621);
a few DFTBench doodles still read as QR-like glyphs.
