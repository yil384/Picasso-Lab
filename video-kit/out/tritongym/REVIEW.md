# TritonGym — self-review log

Protocol (README §8): after every full pass, four independent strict reviewers (separate agents with no access to each
other's notes) score the film 0–10 from one lens each, citing frames: **creative director** (P(doom) delight, clarity,
anti-web/anti-AI look), **tech-art lead** (stylised three.js: lit 3D comic world, ink, halftone, camera, lettering),
**domain expert** (GPU kernels / TritonGym facts), **web designer** (the muted ~400×195 card next to three siblings,
poster, loop seam, sizes). Every must-fix is either fixed in the next pass or answered below. Evidence for each round
(contact sheet at 1 f/s, per-beat motion strips at every 2nd frame, the seam strip, card-size crops) was generated from
the rendered pass with `films/tritongym/tools/evidence.sh`; the evidence images are not committed (render
intermediates), the key stills referenced here are in `out/tritongym/stills/`.

Target: every lens ≥ 8.5 with no must-fix left.

## Round 1 — pass r1 (960×540, commit 2c2025e + light/torch fixes 05e21ef)

| lens | score | verdict in one line |
|---|---|---|
| Creative director | **6.0** | on-series look, the square-wheel gag carries the film; but the win doesn't read (Oro looks like the winner), the payoff is blocked, several beats (compile fix, verify, lap 2, race 2) can't be read |
| Tech-art lead | **6.0** | a real lit 3D place with style-comic ink; but a 360° camera strobe (f333–347), a hard cut (f177), smear ghosts, luminance impact frames, glossy characters, screen-locked ruling, Tok not a balloon |
| Domain expert | **6.0** | concept order is right (write → compile → verify → profile → refine); but the oracle gets slower between races, the watch laps, CUDA punctuation on a Triton kernel, the payoff over-claims (no operator), the oracle runs the agent loop |
| Web designer | **6.3** | clean seam, CLANG! and the refine read at card size; but the payoff/poster doesn't read at 400 px (")ERF@1", Tok over "> 1", Kern weakest shape), racers merge, crane and verify illegible, things clip the top crop |

### Must-fix list (merged, with the frames the reviewers cited) and what r2 does about each

**Race 2, photo finish, payoff, poster (CD 1/2/9, TA 5/6/11, DE 2/3/4/5/7, WD 1/2/3)**
1. *The oracle is not a yardstick* (DE 2): Oro runs 26 f in race 1 and 45 f in race 2; the watch laps (1 turn / 36 f). → Oro runs the same 36 f in both races; Kern 56 f in race 1 (Perf ≈ 0.64) and 34 f in race 2 (≈ 1.06); watch 1 turn / 96 f so no hand laps; the coral hand stops at the same angle both times.
2. *The win doesn't read* (CD 1, DE 3, WD 1): Oro parks a car length ahead of Kern; the freeze hides Oro. → Oro brakes at the line, Kern rolls on and parks ahead, front and centre; photo finish staged side-on from a raised lens with both noses on the chequered line, held 12 f (2 impact frames + a duotone hold).
3. *Racers merge into one blob* (TA 11, WD 3, CD 9): → race 2 tracked from a raised lens (both lanes in separate screen bands), Oro leads early, level ≈ f540, Kern stretches its nose at the line; speed lines on both.
4. *The watch never pays off* (CD 1, DE 3, WD 6): → a 12 f face-on insert of the stopwatch after the photo finish: emerald hand stopped just short of the coral one; the race-1 finish framing shows the watch face (tower lowered and turned) with emerald far past coral.
5. *Payoff letters blocked/small/muddy; ">" reads "≥"* (CD 2, TA 6, WD 1, DE 4): → letters ~1.8×, bolder, lifted against the cream wall, ink-dark extrusion (no emerald underside), lighter face shade; clear of the pylon and Tok; real slam (squash, 3D dust ring, shake, heavier focus lines); camera pushes ~12% with a ≥15° orbit.
6. *Tok crosses the letters* (CD 2, WD 1): → Tok waits right of the letters and leaps only after the slam settles, never inside the letters' box.
7. *Banner reads "[RITONGYM" / sparkle on the O* (DE 5, TA n7): → lettering ≈ 80% of the board with even margins; sparkles move to the winner.
8. *Over-claim: no operator in the win* (DE 7): → the operator card (a legible matmul pictogram: two grids and a big ×) is pulled from the cream Standard band in B1 and rides on Kern as its racing number plate all film, so PERF@1 > 1 belongs to that one operator.
9. *Poster* (WD 2): → poster from the settled payoff (letters settled, check on Kern, Tok star-eyed, clear of the LIVE pill); card rotated to start there.

**B1 write (CD 5, TA 3/9, DE 6)**
10. *Tok doesn't read as a speech balloon; no emerald on the hero* (TA 9, CD 5): → thinner extrusion, bigger tail turned to the lens, the sweatband rebuilt round the perimeter; Tok stands beside the bench (tail visible), not behind it.
11. *Speaking isn't acted; tokens scribble over the face* (CD 5, TA 3): → inhale-swell → O-mouth → tokens shoot from the painted mouth outward in arcs, a white flash with coral keyline in flight; Kern builds on the bench in front, its key off Tok's silhouette.
12. *CUDA punctuation* (DE 6): → glyphs are Triton/Python: `@ ( ) [ ] * + = :`.

**B2 compile (CD 6, TA 2/5, WD 6)**
13. *Hard cut f177→178; 110° swing f200–208* (TA 2): → blends given real length; fast swings registered as whips (smear).
14. *Compile failure → fix unreadable* (CD 6): → Kern bounces to the ground in front of Tok; the error slip slaps Tok's face and is peeled off; the crooked token is pressed flat in a tighter framing; the gate goes scowl → nod with a big coral → emerald lamp change; Dash zips in visibly and quivers (and is re-coloured grey: violet belongs to the DSL band, DE n1).
15. *Impact frames by luminance hide the subject; one frame nearly all cream* (TA 5, WD n1): → impact posterised by object: characters stay cream with ink, the set goes ink; a coral plate for the CLANG, an emerald one for the photo finish; no inverted frame.
16. *CLANG! cut at the top of the card crop* (WD 6): → lettered lower (top ≥ master y 200).

**B3 verify (CD 7, DE 1, TA 10, WD 5)**
17. *The dial reads as FAIL/clock* (DE 1, TA 10): the notch was at 3 o'clock (fixed in source after r1: canvas rotated) → verify on frames; the needle becomes the hero (swing, overshoot, settle), the parked hand goes, the pass floods an emerald wedge and a big flag pops above the beam; Tok on the open side; Kern's face above the card fade; a slow push.

**B4–B6 (TA 1, CD 3/8, DE 8/9, WD 4)**
18. *360° camera strobe f333–347* (TA 1, CD 3): wrap bug fixed in source (fe7b737) → verify on frames.
19. *Crash zoom f361 is a hard cut* (CD 3): → zoom lines on its last frames.
20. *Oro runs lap 2 through the gate and scale* (DE 8, CD 8): → Oro backs up the home straight to the start line and waits there; only Kern laps.
21. *Recompiled wheels turn coral* (DE 9): → wheels are cream source, then dark emerald once compiled; coral stays the oracle's colour.
22. *Crane illegible at card size* (WD 4, TA n3): → lower (≈35°) and tighter crane, clear line to Kern at the gate, stations above the fade.

**Look (TA 4/7/8)**
23. *Whip smear turns characters into outline ghosts* (TA 4): → ink fades with smear length (the 2D streaks carry the motion).
24. *Glossy plastic* (TA 7): → spec 0 on characters and tokens.
25. *Screen-locked ruling / dots on the wall* (TA 8): → ruling off, dots off; the wall painted warmer.
26. *Defocused Tok loses its ink and reads as a ghost* (CD 4, f306–334, f536–546): the DoF sharp zone was 4 units → 10 (fixed in source after r1).

Nice-to-haves taken into r2: no blush dots/tongue (CD n1), Tok lands beside the stack at the seam (CD n7), fresh tokens launched down and out (WD n2), start blocks inked (TA n5), idea bang and gate face inside the crop (TA n6), CLANG! stagger after the impact (TA n8), card encode at `--max-mb 3.8` (WD n5). Deferred: world-fixed key light per beat (TA n1), PyTorch-like flame on Torchy (DE n5), the "done pile" at the seam (DE n4).

## Round 2 — pass r2 (960×540, commit 457e32e)

| lens | r1 | **r2** | verdict in one line |
|---|---|---|---|
| Creative director | 6.0 | **7.0** | the story now reads in order (write → CLANG → fix → PASS → lose → refine → lap → win); but Kern, the hero, has almost no face or acting, the B1 tokens still seem to leave from the top of Tok's head, the payoff reactions can't be read |
| Tech-art lead | 6.0 | **7.0** | strobe, hard cut, luminance impact frames, gloss, screen-locked ruling and the ghosted Tok are fixed; the camera-relative key light now pops shadows, some fast moves have no smear, the insert and watch cuts break the "no hard cuts" rule, the slam is weak |
| Domain expert | 6.0 | **7.6** | fixed oracle time, photo finish, watch insert, Triton glyphs, outputs-vs-reference verify, oracle not in the loop all correct; but the headline is painted in the oracle's coral, the operator plate is lost in the payoff, Dash still reads violet in shade, the race-1 watch can't be read |
| Web designer | 6.3 | **7.4** | B1, verify, CLANG! and the seam read at 400 px, card fits at CRF 32 (3.54 MB); but the master won't fit 70 MB at CRF 18, the poster is too wide (letters ~30 px caps, Kern the smallest shape), the watch lands in the bottom fade, the racers still overlap, marks and the lamp fall outside the desktop crop |

Round-1 items the reviewers confirmed fixed on frames: the camera strobe (#18), the hard cut at f177 (#13), impact frames by object (#15), the gloss (#24), the ruling (#25), the ghosted Tok (#26), the ")ERF" clipping and Tok over the letters (#5/#6), the banner (#7), the fixed oracle time and the photo finish (#1/#2), the watch insert (#4), CUDA glyphs (#12), the dial (#17), Oro out of the loop (#20), coral wheels (#21), the CLANG clipping (#16). Correction to the round-1 plan: race 2 is 33 f for Kern (Perf@1 ≈ 1.09, not 34 f), and the stopwatch turns once per 60 f in r3 (72 f in r2; neither laps).

### Must-fix list (merged) and what r3 does about each
1. *Headline in the oracle's colour* (DE 1): PERF@1 > 1 faces go **emerald** (ours) with ink extrusion, no halftone on the faces; coral stays Oro / errors only.
2. *Kern has no face or acting* (CD 1, TA 6): the face is repainted bigger (eyes ~2×) and high on the nose block, the refined nose cone moves under the eyes (it covered them); Kern turns ¾ to the lens when dizzy after the CLANG and in the payoff (−0.5 rad, so the matmul plate stays in view, DE 2); a "strain" face (gritted teeth, sweat) at the line; the head goes pale emerald once compiled (DE n1).
3. *Operator plate lost in the payoff* (DE 2): the smaller turn keeps the plate side ¾ on; the check moves above the hump, off the plate.
4. *B1 tokens seem to leave from the head; build hidden* (CD 2/3): tokens now leave the mouth sideways first (ease-out across, a low hop after), Kern is built at the bench's lens-side edge, clear of Tok's arm.
5. *Key light turns with the camera, shadow pops* (TA 1): the key is now low-passed over ±1.25 s of the camera path and the shadow box is larger (12) and follows the smoothed target; Tok is lighter (tone floor).
6. *Hard cuts into/out of the insert and to the watch* (TA 5, README "transitions always"): push down onto the token, whip back out; whip from the photo-finish panel to the watch.
7. *Fast moves without smear* (TA 4): the watch → start pull is 22 f and a whip; start → race-1 tracking 12 f with smear; the wheel close-up → two-shot is a 14 f pull-out; the gate tilt no longer jerks after the insert; the B6 → B7 bump at f488 (vertigo distance) is fixed.
8. *Tok passes through the portcullis / Dash's beak* (TA 2, CD 7): Tok leaves the gate only after the arch shot; Dash sits higher on the bars.
9. *CLANG! ghosts over the insert* (TA 3): it pops off (scale-out) before the push-in, no alpha fade.
10. *Payoff slam weak / dust ring reads as an underline* (CD 5, TA 6): inked 2D dust puffs roll out from the letters' feet, focus lines heavier; the orbit starts clear of the pylon; Oro turns its face to us for the jaw drop and nod; Tok's star eyes are 1.7× bigger and Tok is lighter.
11. *Poster too wide, Kern smallest* (WD 2): tightened as far as the board/letters/Tok spread allows (see r3 notes); Kern parks further on, front and centre.
12. *Race-1 watch unreadable* (DE 4, CD 4, WD 3): the face is flat-lit cream, hands thicker and flat-coloured, the race-1 finish framing is widened to show it; the watch now turns once per 60 f so the coral hand stops at ~7 o'clock (not along the tower pole) and race 1's emerald far past it (~11).
13. *Watch insert in the bottom fade; the hands merge* (WD 3, CD n5): (see r3 notes) insert re-framed higher; the "time saved" wedge is inked and halftoned (TA n1), click bursts bigger.
14. *Racers still overlap* (TA 7, WD 4, CD 9): race 1 and race 2 tracking are raised (≈ 2.6–3.0) so the far lane sits above Kern with a gap.
15. *Lap-2 recompile hidden behind the post* (CD 6, TA 8, WD 4): lap 2 becomes three quick panels linked by whips that rhyme with B2/B3: through the arch (the emerald flash lit), the weigh-in (block, flag, flood), the start line.
16. *Dash reads violet in shade* (DE 3): recoloured warm grey (verify on lit and shaded frames).
17. *Race-1 finish emotion wrong* (CD 4): Tok winces (eyes shut, wobble, sweat) behind its hands instead of grinning; Tok stands clear of Oro's key.
18. *Master over 70 MB at CRF 18* (WD 1): the master encode searches the lowest CRF from 18 that fits 70 MB and the result is checked with ffprobe.
19. *Marks/lamp outside the desktop crop* (WD 5, DE n3, CD n2): the gate shot is framed higher so the coral lamp is in frame before the slam and the nod.

Nice-to-haves taken: the PASS flag carries an inked check (CD n6), the flood stays full through the match cut (CD n1), the slip's caret is separated so it can't read as ♀ (CD n3, DE n2, TA n6), a mitten for the press (TA n5), a thicker sweatband (TA n3), the OOD band recoloured tan (DE n6), a warmer, calmer cyclorama (TA n2), the pink tongue gone from every mouth. Declined: screen-space halftone swim (TA n7, a look-wide change for the whole series), a PyTorch-like flame (DE n5, avoids a brand mark).

## Round 3 — pass r3 (960×540, commit eba4279)

| lens | r1 | r2 | **r3** | verdict in one line |
|---|---|---|---|---|
| Creative director | 6.0 | 7.0 | **7.5** | the story now reads in order with no gaps and Tok is a P(doom)-grade performer; but Kern still reads as a heap of dice in the wides, the payoff lands softly (check over the "R", Oro's reactions invisible), whip-smear is overused and ghosty, the photo finish has no tension |
| Tech-art lead | 6.0 | 7.0 | **7.5** | lit 3D world, object impact frames, hand lettering, transitions everywhere, no hard cuts; but the 9-tap smear prints stacked ghost copies, the compile-pass beat flashes by between two whips (f173–174), Tok's lean snaps it across the cel line, racers still overlap, the slam has no visible contact |
| Domain expert | 6.0 | 7.6 | **8.2** | emerald headline, plate, grey Dash, recompile/re-verify, fixed oracle time and a 3-frame (1.09) win all correct; but the coral (oracle) hand never reads as coral, the check covers the "R" of the metric, "164" is painted in the error colour |
| Web designer | 6.3 | 7.4 | **7.8** | B1, CLANG!, the dial, the refine, the letters and the seam read at card size; card 3.65 MB at CRF 32; but Kern (the winner) sits in the desktop bottom fade in the poster, the whip out of the poster pops (letters vanish at f642), the flag's check and the coral lamp fall above the desktop band |

Confirmed fixed on r3 frames (by the lens that raised them): the headline colour, Kern's compiled head and plate (DE), grey Dash (DE), the lap-2 recompile and re-verify (DE, CD, WD), the watch insert framing (WD, CD), the race-1 emotion (CD), the hard cuts (TA), CLANG! pop-off (TA), the inked wedge (TA), tokens leaving the mouth and the visible build (CD), the lamp change in frame (CD).

### Must-fix list (merged) and what r4 does about each
1. *Coral hand reads as ink* (DE 1, WD, CD): both hands are now flat bars of equal width (0.1) with a thin outline and no hatch/halftone/received shadow; the time-saved wedge is a light see-through tint with a rim line only, so the two solid hands bound it.
2. *Check covers the "R"* (DE 2, CD 2): the check pops at f606 (after the letters settle) low on Kern's flank by its face, below the letters' band.
3. *"164" in the error colour* (DE 3): painted ink with an emerald keyline.
4. *Whip smear ghosts / overuse* (TA 1, CD 3): the smear is now 28 dithered taps with tent weights (a continuous streak, no copies), its amount follows a bell over each whip and is capped at 120 design px, so each whip has ~2 heavy frames; the watch→start pull is 16 f.
5. *Compile-pass beat squeezed between two whips* (TA 2): B2 retimed — insert f149–161, whip out f160–165, the gate held sharp f165–180 (lamp emerald, nod, lift inside it), whip ahead f180–186; B3 starts at f198.
6. *Tok flips cream↔grey on lean snaps; grey across shots* (TA 3): Tok's pose fields are eased (tent over ±2 f); Tok's body and limbs no longer receive cast shadows and have a higher tone floor.
7. *Racers overlap* (TA 4, CD, WD n1): the start two-shot and both race tracking lenses are raised to ≈40° down-look (y 3.5–4.0) so Oro's wheel line sits above Kern's roof.
8. *Kern reads as dice; no face in the wides* (CD 1): a dark-emerald chassis tray unifies the tokens; the face block is 1.3× with bigger eyes (face scale 2.5); Kern faces ¾ to the lens on the bench, hops off the bench's right end onto the board in view (no longer sinking behind the table), turns to us sweating after the race-1 loss and grins while revving in the refine; star eyes 1.35×.
9. *Payoff lands softly; Kern in the bottom fade; Oro/Tok at the edges* (CD 2, TA 5, WD 1): the squash holds 3 frames, camera shake doubled, heavier focus lines, cream-filled inked dust puffs; the lens is higher (card top visible) and aimed lower; Kern rolls one car-width up-stage after the line; Oro coasts further into the frame and turns ¾; Tok moved inward; staggered reactions check f606 → jaw f614 → laurel f618 → nod f622–630, Tok's leap f610–628.
10. *Whip out of the poster pops* (WD 2): the letters, Kern and Oro stay until f648 (inside the smear peak) instead of vanishing at f642.
11. *Photo finish has no tension / Oro cut* (CD 4): Kern's race-2 curve is steeper (pw 1.8) so Oro leads on screen until ≈f544; the photo-finish panel is re-framed (higher, wider) so both noses sit in the central band.
12. *Tok cluttered behind the portcullis and Dash in the "compiled!" shot* (CD 6): Tok hops out to the apron during the lift and waits there until the arch shot is over.
13. *Oro's personality invisible* (CD 5): Oro's face painted larger (eyes ≈1.4×).
14. *PASS flag check and lamp outside the desktop band* (WD 3, DE n4): the flag pole is shorter; the gate shot is framed wider and higher so the lamp sits inside the band before the slam and after the nod.

Nice-to-haves taken: Tok's idea "!" in emerald (DE n1), click bursts as radial spikes (CD n6, TA n7), the crooked token on a cream tile (CD n5), start blocks removed (TA n8), the double-take vertigo eased (TA n1), the B5 board no longer cropped (TA n6), the weigh-in framed away from the LIVE pill (WD n2), impact-frame set plate deep emerald instead of near-black (WD n3), `--master-max-mb 70` and `--nframes 660` as encode defaults (WD n6). Deferred: marks depth test (TA 6 — the one case, Kern behind the bench leg, is removed by the new bench exit), Torchy's face, a painted start line with aligned noses.
