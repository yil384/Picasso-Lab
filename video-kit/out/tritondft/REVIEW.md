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


## Handoff status
- Done: storyboard (4 angles judged), full 720-frame scene in `films/tritondft/`, review round 0 (storyboard) and round 1 (first cut: CD 6.4 / TA 6.7 / DFT 6.8 / WEB 7.0).
- Round-1 fixes are committed and were spot-checked on single frames at 960×540 (whip instead of the smoke cover, S5 re-block + CLANK!, S8a/S8b payoff framing on the card, cream/sky grade, plate clear of the LIVE pill, SFX lettering, pillow pose, held result).
- Not yet verified: the full round-2 pass (render stopped at ~f460 of 720 on request). The new lap orbit (S6), the Library book ring + Tri's slot gap, the ghost-cell vc-relax, the lap-1 gauge and the loop seam still need checking frame by frame.
- Known open items: Hoot's "surprised" eyes paint grey (td_faces dotEyes); STORYBOARD.md not yet updated for the S3→S3b whip and the S8a/S8b split; no deliverables in out/tritondft/ yet.
- Next: `cd films/tritondft && python3 -u tools/shoot.py tritondft.html stills --every 1 --width 960 --height 540 --out snaps/full2 --prefix f`, then `python3 tools/review_pack.py snaps/full2 f snaps/review_r2` and re-run the four-lens review (round 2, then ≥1 more), fix until every lens ≥ 8.5.
- Then: render 1920×1080 in chunks, encode master/loop/poster/sheet per README §7, run the purity/loop check (f720 == f0), push, and write the §9 report.
