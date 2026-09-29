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

## Round 4 — pass r4 (960×540, commit 2429c81)

| lens | r1 | r2 | r3 | **r4** | verdict in one line |
|---|---|---|---|---|---|
| Creative director | 6.0 | 7.0 | 7.5 | **7.5** | Tok is P(doom)-grade, the fail → fix → pass chain is funny, race 2 now has tension; but the hero vanishes on the drive to the gate (f96–130), Oro is still a prop, the starts are dead and the racers merge, whips eat time |
| Tech-art lead | 6.0 | 7.0 | 7.5 | **7.0** | the strongest look so far and no stacked smear copies; but three Kern/Oro statements were pasted inside `//` comments (Kern's matrix went NaN for the whole drive; race-2 wheels skate), the bench hop clips the table, racers still stacked, smear switches on/off in a frame, the photo-finish hold releases one frame early |
| Domain expert | 6.0 | 7.6 | 8.2 | **8.3** | the coral hand, the check over the "R" and "164" are fixed; the profile numbers are exact (36 / 56 / 33 f); but the check now hides the matmul plate (the only thing tying the win to one operator), and Kern is never seen going into the gate |
| Web designer | 6.3 | 7.4 | 7.8 | **8.0** | the poster reads at card size (caps ≈ 33 / 43 CSS px), card 3.50 MB at CRF 32, the seam is one continuous hop, the whip out of the poster no longer pops; but Kern is missing from the compile approach and still sits in the desktop bottom fade in the poster |

Root cause of the worst r4 fault: three statements (`S.yaw …` on the drive, the race-2 wheel angles of Kern and Oro) had been appended after `//` comments while editing, so they never ran. All three are restored, a scan of every source file for code after a line comment now comes back clean, and `updateWorld` throws on any non-finite position or yaw of the cast, so this class of bug stops the render instead of shipping.

### Must-fix list (merged) and what r5 does about each
1. *Kern invisible on the drive; bench hop clips the table* (TA 1/2, CD 1, DE 2, WD 1): the swallowed yaw is restored and guarded; the hop arcs higher (clears the table top), lands clear of the bench end (r 7.55) with a squash, and the trundle to the gate is a steady pace in view from f98; Dash flies in inside the drive shot (f117–131) with speed lines.
2. *Race-2 wheels skate* (TA 3): the swallowed wheel-angle statements are restored for Kern and Oro.
3. *Racers merge; dead starts* (TA 4, CD 3, WD n3): the start two-shots and both races' tracking lenses are now 3/4 front, well ahead of the pack (≈22° down): the lanes sit side by side and both faces point at the lens; both racers crouch for GO; the double-take vertigo moves the lens along its line to Oro; the photo finish is shot high and side-on to the line (≈48° down) so both noses sit on the chequer in separate bands.
4. *Oro is a prop* (CD 2): Oro's face is repainted on the front-outer quarter of the hull (where the lenses see it) at ~1.4× the r4 size; Oro turns ¾ to the lens for the side-eye and the double-take; its "!" is as big as Tok's; in the payoff it faces the lens for the jaw drop and nod.
5. *The check hides the plate* (DE 1): the check sits on the face block's top corner (clear of the plate and below the letters); the plate is 0.8 (was 0.62) and Kern turns 0.8 rad to the lens in the payoff.
6. *Kern in the desktop fade in the poster* (WD 2): Kern rolls ~one car-width further up-stage after the line, the payoff lens aims lower and pushes tighter (fov 40 → 34).
7. *Smear switches on/off; whips eat time* (TA 5, CD 6): the smear now runs only over the 7 fastest frames of each whip (1 light, 2 heavy, 1 light …) and is capped at 60 design px; the whip out of the payoff starts at f640 (was 632).
8. *Photo-finish hold releases a frame early* (TA 6): time stays frozen until the whip to the watch has covered the frame (f563).
9. *Payoff slam still soft* (CD 5, TA 8): a comic title burst pops behind the letters on the slam; squash 78% held 3 frames; focus lines 6 px; bigger cream dust puffs roll out below the letters' feet.
10. *Tok tone strobe* (TA 7): Tok's body tone floor raised again (toneBias 0.5) on top of the eased pose.
11. *The PASS flag reads as a web badge; the dial fills the frame* (CD 7): a printed cloth flag (halftone folds, a wobbly inked edge, a brush tick) that waves; the push stops with the dial at ~70% of the frame, and the stopwatch is framed to the same size for the match cut.

Nice-to-haves taken: the crooked ':' on one face only (DE n1, not a die), the wall's coral stripe → brick (DE n4), the check with a cream keyline (WD n2), the weigh-in framed higher (WD n4), the crash-zoom lines last until the close-up lands and the refine pull-out is longer (TA n1), the race-1 launch plays before the move (TA n6).

## Round 5 — pass r5 (960×540, commit 50794f5)

| lens | r1 | r2 | r3 | r4 | **r5** | verdict in one line |
|---|---|---|---|---|---|---|
| Creative director | 6.0 | 7.0 | 7.5 | 7.5 | **8.2** | reads start to finish without help; B1 and B2 are P(doom)-grade; the race-2 double-take lands; but the payoff belongs to everyone except the winner, Oro has no readable acting outside the double-take, the PASS flag still reads as a ✅ badge |
| Tech-art lead | 6.0 | 7.0 | 7.5 | 7.0 | **8.0** | Kern on the drive, rolling wheels, side-by-side lanes, a continuous short smear, the frozen photo finish and a real slam all fixed; remaining: one-frame pose/position pops at section hand-overs (Tok f37/f128, Kern f144/f179, Oro f421) and the payoff set popping out at the seam |
| Domain expert | 6.0 | 7.6 | 8.2 | 8.3 | **8.7** | **no must-fix left**: pipeline order, outputs-vs-reference verify, 36 / 56 / 33 f, the honest photo-finish gap, colour meanings and the plate all check out |
| Web designer | 6.3 | 7.4 | 7.8 | 8.0 | **8.1** | Kern on the drive and the side-by-side racers fixed, card 3.63 MB at CRF 32; but the payoff set pops out in sharp frames at f653–655 (first second of the rotated card) and Kern is still in the desktop bottom fade in the poster |

### Must-fix list (merged) and what r6 does about each
1. *Payoff set pops out at the seam* (WD 1, TA 2): the letters, burst, Kern and Oro leave on the heaviest smear frame (f650).
2. *One-frame pose / position pops at section hand-overs* (TA 1): every actor's yaw is now eased over ±2 frames (circular, never across a teleport/cut), and the race sprints brake uniformly to stop exactly on the pose the next beat starts from (the old coast stopped short, so Oro jumped 1.4 units at f422 and Kern 0.4 at f364; Oro in race 2 also parked short of where the payoff wanted it). A node scan of every frame now finds no yaw step > 0.2 rad or position step > 0.3 outside whips except the intended flick spin, race speeds and the off-screen reset under the dial → watch match cut.
3. *Kern in the desktop fade in the poster* (WD 2): Kern rolls ~1 unit up-stage after the line, the payoff lens aims lower and ends wider (fov 36); Oro brakes just past the line so the three (Oro | Kern | Tok) sit apart.
4. *The payoff belongs to everyone except the winner* (CD 1): Kern gets the first and biggest action — a wheelie hop (0.62 high, pitched up, big squash) the moment the check pops (f604); Oro's jaw f612, laurel f616 (now sliding forward and tilting down across an eye), nod f622–632; Tok's star-eyed leap starts after Kern lands (f617–635).
5. *Oro has no readable acting* (CD 2): Oro's face is repainted straight ahead above the cone (every front-ish lens sees it), with a bolder smug look (grin, bigger lids); a gentle push onto Oro for the race-1 side-eye; parked after race 1 it turns its face to the lens.
6. *PASS flag reads as a ✅ badge* (CD 3, TA n4): the flag leaves the scale; Torchy, the referee, snaps up a triangular emerald pennant on a stick (with overshoot and a cloth kink) — in B3 and again in lap 2.

Nice-to-haves taken: the bench landing moved further along the track (TA n2), dust puffs shrink away inked instead of fading grey (TA n3), the GPU shroud lifted to a mid ink-violet (TA n5), zoom lines on the push into the token insert (TA n6), Oro's "!" inside the band (WD n1), the plate moved clear of the front wheel (DE n1), the storyboard's photo-finish text now states the honest gap (DE n4).

## Round 6 — pass r6 (960×540, commit 416fad1)

| lens | r1 | r2 | r3 | r4 | r5 | **r6** | verdict in one line |
|---|---|---|---|---|---|---|---|
| Creative director | 6.0 | 7.0 | 7.5 | 7.5 | 8.2 | **8.3** | the flag and the seam are fixed, Kern now acts first and Oro acts in both races; but in the payoff Oro turns nose-on (face hidden, the laurel reads as a sunflower), Kern is still upstaged, and the refine idea has no visible cause |
| Tech-art lead | 6.0 | 7.0 | 7.5 | 7.0 | 8.0 | **8.2** | a lit comic world with a good camera grammar and continuous short smears; but Tok's dot screen switches on/off in one frame (the halftone ignored the tone bias), Dash's speed lines cross Tok's face, Kern's lap-2 launch snaps in the unsmeared frame f423, the token insert is cluttered |
| Domain expert | 6.0 | 7.6 | 8.2 | 8.3 | 8.7 | **8.8** | **no must-fix**: nothing regressed with the pennant, the braking or the payoff staging |
| Web designer | 6.3 | 7.4 | 7.8 | 8.0 | 8.1 | **8.6** | **no must-fix**: the seam pop and Kern-in-the-fade are fixed (face, check and plate above the fade); card 3.70 MB at CRF 32 |

### Must-fix list (merged) and what r7 does about each
1. *Oro's payoff reactions unreadable* (CD 1): Oro turns only ~0.15 rad at the jaw, so it stays ~3/4 to the payoff lens with its face (above the cone) in view; a new jaw-drop face (wide eyes, big open mouth); the laurel slides forward off the key and tips down over one eye as a band (never a ring round the cone); the nod is a 0.4-rad pitch of the whole body; Oro parks a little further into the frame.
2. *The winner is upstaged* (CD 2): Kern's face block keeps a tone floor and takes no cast shadow (stays pale emerald through the hop); the hop is 0.72 high with a 1.6× squash on landing; Kern parks a little nearer the lens; Tok's leap is smaller (0.42) and starts after Kern lands.
3. *The refine idea has no cause* (CD 3): Tok arrives (f360–370), stares blankly at the square wheel (f370–378, dot eyes, flat mouth), then the emerald "!" pops straight above its head against the sky (f378); the fresh tokens fly on a tighter arc from the mouth down to the wheels.
4. *Tok's dot screen strobes* (TA 1): the halftone density now includes the material's tone bias (the round-4 tone floor never reached the dots) and the dots grow in on an eased ramp instead of a hard `step` — a flat face crossing the threshold no longer flips in one frame.
5. *Dash's speed lines across Tok's face* (TA 2): the 2D trail is gone; Dash is smaller (1.2×) and flies in higher, so it reads as a dart.
6. *Kern's lap-2 launch snaps in an unsmeared frame* (TA 3): Kern revs 3 frames longer and launches at f425, inside the whip's smear peak.
7. *The token insert is cluttered and turns Tok grey* (TA 4): tight, from the side and above: the crooked ':' token, the mitt and the press are the subject; Tok is at the edge and brighter (the tone fix).

Nice-to-haves taken (r7): every material without an explicit `spec` is now matte (the default was a paper-white highlight: the pylon's coral ball and a white glint on the weigh-in base, TA n5, n8), CLANG! shrinks away over 5 frames (TA n3), Kern's post-CLANG tumble spins half as fast (TA n4), the race-1 crane to the finish is 24 frames (TA n2), Oro's double-take "!" sits low beside its head inside the card band (WD n1), the lap-2 weigh-in framed left (WD n5), the card encode's CRF search starts at 30 (WD n6).

## Round 7 — pass r7 (960×540, commit e9dceaf)

| lens | r1 | r2 | r3 | r4 | r5 | r6 | **r7** | verdict in one line |
|---|---|---|---|---|---|---|---|---|
| Creative director | 6.0 | 7.0 | 7.5 | 7.5 | 8.2 | 8.3 | **8.5** | **no must-fix**: Oro's payoff reactions read, the winner acts first and biggest, the refine idea now has a visible cause; what is left is payoff polish (dust over Tok, Oro faceless in the hold, key over Tok's mouth in race 1) |
| Tech-art lead | 6.0 | 7.0 | 7.5 | 7.0 | 8.0 | 8.2 | **8.2** | the Tok strobe, Dash's trail and the insert clutter are fixed; but Kern vanishes for three sharp frames at the lap-2 launch (f422–424), 2D marks still land on the cast's faces (slam puffs f590–600, insert zoom lines f146–149), and Oro's key covers Tok's face in the race-1 loss |
| Domain expert | 6.0 | 7.6 | 8.2 | 8.3 | 8.7 | 8.8 | **8.9** | **no must-fix**: the stare before the idea and the new Oro reactions make the claims clearer; timings, colours, verify-by-outputs and the honest photo-finish gap all hold |
| Web designer | 6.3 | 7.4 | 7.8 | 8.0 | 8.1 | 8.6 | **8.4** | the poster (f628) is better and the seam, pill corner and budget hold (card 3.62 MB at CRF 32, master ≈ CRF 21 for 70 MB); but the new refine beat happens above the desktop card band — the blank stare is on screen for about one frame and the "!" pops above the crop |

### Must-fix list (merged) and what r8 does about each
1. *Kern disappears at the lap-2 launch, f422–424* (TA 1): the refine hold reads Kern's position from `kernTh(min(F, lap2[0] − 1))`, so it can never pick up the race-2 curve (which starts at the start line) before the launch at f425. A per-frame scan of all three cast members finds no visibility flip and no position step outside motion, whips and the match cut.
2. *2D marks over the cast's faces* (TA 2, CD n1): the slam's dust puffs skip any puff whose centre falls inside Tok's projected screen box; the insert's zoom lines start one frame into the close-up, after Tok has left the frame; the stopwatch click bursts sit inside the watch face.
3. *Oro's key over Tok's face in the race-1 loss* (TA 3, CD n4): Oro coasts further past the line (rest at finish + 0.72 instead of + 0.42), so it parks clear of Tok. Tok watches from the near side of it (finish + 0.40) and does a small startled hop as Oro whooshes past (f343–355), so the passing key goes under its chin, not across its face.
4. *The refine stare and "!" happen above the desktop card band* (WD 1, CD n3): the pull-out after the crash zoom is a fast ease-out (f366–382 instead of an in-out f368–388), so Tok's blank stare is inside both card bands from f370 to f378 (8 frames). The emerald "!" pops beside Tok's head at eye height, on the open side towards Oro, instead of above it. Checked with `sheet.py --card` on f366–392.

Nice-to-haves taken (r8): Oro's nod moves after the poster frame (f629–639), so f628 shows its wide-eyed jaw drop and it settles on the wide eye after the nod rather than a closed-eye arc (WD n1, CD n2). Oro's race-2 "!" is about 40 master px lower, inside the band (WD n3). Tok turns the short way round, under the seam whip's smear, so it is never edge-on in a sharp frame at f656–659 (TA n3, CD n8). The match-cut pull-back starts on the cut (TA n1). A comment lint (`tools/lint_comments.py`) now catches code accidentally swallowed by a `//` comment, the cause of three earlier bugs.
Deferred, with reasons:
- Seat the payoff letters on the GPU slab (CD n6): a re-stage of the headline composition that three lenses have signed off.
- A painted start line with the noses on it (DE n2): the offset favours the oracle, so it doesn't weaken the claim.
- Tok's underside shadow band (TA n2): it conflicts with the web designer's praise of the clean cream balloon at 400 px, and risks the strobe again.
- Kern's face on the drive (CD n5).
- The push-in on Kern's win (CD n7).

## Round 8 — pass r8 (960×540, commit eabacbe)

| lens | r1 | r2 | r3 | r4 | r5 | r6 | r7 | **r8** | verdict in one line |
|---|---|---|---|---|---|---|---|---|---|
| Creative director | 6.0 | 7.0 | 7.5 | 7.5 | 8.2 | 8.3 | 8.5 | **8.6** | **no must-fix**: the refine stare now reads in the band and Oro's key no longer covers Tok in the race-1 loss |
| Tech-art lead | 6.0 | 7.0 | 7.5 | 7.0 | 8.0 | 8.2 | 8.2 | **8.3** | Kern's lap-2 vanish and the key over Tok are fixed; 2D marks still cross faces, and the payoff letters crawl with ink specks at their stroke joins |
| Domain expert | 6.0 | 7.6 | 8.2 | 8.3 | 8.7 | 8.8 | 8.9 | **8.8** | **no must-fix**: every claim, timing and colour meaning still holds |
| Web designer | 6.3 | 7.4 | 7.8 | 8.0 | 8.1 | 8.6 | 8.4 | **8.6** | **no must-fix**: the stare and the "!" sit inside both card bands, and the poster, seam and budget hold |

The session was interrupted before this round was written up, and the reviewers' notes did not survive. The scores are
from the handoff note. The must-fix list below comes from the r9 fix commits (cdb9b57, 9cf6fee) and the handoff, which
name each fix and the frames it was checked on. Only the tech-art lens had must-fixes.

### Must-fix list (tech-art) and what r9 does about each
1. *Focus/zoom lines cross Tok's face* (the token insert f150, the crash zoom f364, the slam f594): `focusLines` takes up to
   two screen-space holes, one for Tok's projected ellipse and one for Kern's face block, and every line stops at their outlines.
2. *Slam puffs roll over Tok* (f595–599): the puffs are tested against Tok's ellipse every frame where they are drawn (they
   roll outward after spawning, so a spawn-time test missed them).
3. *The idea "!" lands against Oro / the dark slab*: it pops on Tok's side away from Oro, with a cream keyline.
4. *Crawling ink specks where the payoff letters' strokes join* (the ">" apex, the "@", P/E/R/F joins, f590–650): each
   stroke was its own extrusion with its own inverted hull, so a hull edge lay in the neighbouring stroke's front cap and
   z-fought. Pushing the hulls back (`uHullPush` 0.15) only shrank them. **r9 merges each glyph's strokes before extruding:**
   they are rasterised with coverage AA as quads (a folded ribbon still fills), traced at 50 % coverage (marching squares),
   simplified and nested into outlines with holes. One outline per glyph means one extrusion and one hull, with no joins
   inside a letter. The hull push goes back to 0.05. The "@" is redrawn as a ring-and-stem "a" with an outer swing, at 0.62
   of the payoff weight, so both counters stay open (it had filled into a disc).

Also in r9: Oro turns further to the payoff lens at the jaw drop, and the open mouth is painted under the eye that lens sees
(f614–628). Oro's double-take "!" sits beside its head at eye height with a cream keyline (f500–508, inside the band).

## Round 9 — pass r9 (960×540, commit b12fe0f)

| lens | r1 | r2 | r3 | r4 | r5 | r6 | r7 | r8 | **r9** | verdict in one line |
|---|---|---|---|---|---|---|---|---|---|---|
| Creative director | 6.0 | 7.0 | 7.5 | 7.5 | 8.2 | 8.3 | 8.5 | 8.6 | **8.7** | **no must-fix**: every beat has a character acting, and no marks cross faces; what is left is payoff polish (pea-sized slam puffs, the grin before the idea "!") |
| Tech-art lead | 6.0 | 7.0 | 7.5 | 7.0 | 8.0 | 8.2 | 8.2 | 8.3 | **8.4** | the marks over Tok, the slam puffs and the join specks are fixed; but the letters still shimmer where their outlines turn inward, and 2D marks land on Kern's strain face in race 1 |
| Domain expert | 6.0 | 7.6 | 8.2 | 8.3 | 8.7 | 8.8 | 8.9 | 8.8 | **8.9** | **no must-fix**: 36 / 56 / 33 f and the watch hands check out; the new "@" keeps PERF@1 > 1 correct |
| Web designer | 6.3 | 7.4 | 7.8 | 8.0 | 8.1 | 8.6 | 8.4 | 8.6 | **8.7** | **no must-fix**: poster, seam, pill corner and budget hold (card 3.61 MB at CRF 32); polish: Kern's hop crosses "F@1" |

Round 8 items confirmed on the r9 frames: focus/zoom lines stop at Tok and Kern's face (f150–155, f360–365, f590–591);
the slam puffs never touch Tok (f590–599); the idea "!" reads on Tok's open side with its keyline (f380–392); Oro's
double-take "!" sits beside its head inside the band (f498–508). The join specks are fixed, but the lenses judged the
letters only *partly* fixed because of the shimmer below.

From this round on, a second agent checks each must-fix on the frames and traces it to the code before it is fixed. Both
tech-art must-fixes were confirmed real. In both cases the check found a different cause from the one the reviewer
proposed.

### Must-fix list (tech-art) and what r10 does about each
1. *The payoff letters shimmer where their outlines turn inward* (f589–648). Three separate causes:
   - *The P counter "breathes" and splits every 21 frames.* This was not the hull. The title burst rocked by ±0.03 rad
     (`sin(0.3 F)`), and at its negative tilt a notch between two spikes slid into the P's counter. The burst now rocks
     only on its tilted side (0.01–0.03 rad).
   - *Ink hooks at the inner corners of E, F and the "1"'s flag* (f624–632). At a sharp skeleton corner the two ribbons'
     quads meet at a point pulled inward and leave a thin V-slit, which the trace kept and the hull flooded with boiling
     ink. `traceUnion` now closes the coverage raster (max, then min, over a disc of 4 cells) before tracing. That fills
     the slits and rounds concave corners a hair, and leaves straight edges and convex corners as they were. The bevel
     is also gone: at 1080p its offset faces z-fought the hull in the same corners (checked in studio snaps after r9).
   - *An emerald hairline crawls on the letters' ink-dark sides, and a cream crescent shows in the "@" gap.* The
     off-register colour plate (misreg [2.6, −2.0] design px) is wider than the thin screen-space ink line on the
     letters' front edge, which has no hull. While the letters are up (ramping in over the drop and out under the whip),
     the plate comes to 30 % of its offset. The rest of the film keeps the full offset.
2. *2D marks on Kern's strain face in race 1* (f300–333). The reviewer blamed Oro's speed lines. The check found two
   sources:
   - *The square-wheel THUNK ticks* (f300, 302, 305, 310, 311). The tick fan is anchored under Kern's centre, which sits
     behind its face block in the 3/4-front lens. Ticks that would land on the face are skipped whenever the face is
     turned to the lens, so the back-view ticks in B2 are unchanged. They draw from their own boil stream.
   - *Oro's wake* (f309–333). It crossed Kern's key, head cube and face. Every stroke of Oro's trail now stops where it
     meets Tok, Kern's face or Kern's body (Kern's lane is in front of Oro's). Kern's own trails take no holes.
   Checked in studio snaps f300–336: the face is clean, the two left ticks stay by the wheels, and the wake reads to the
   right of Kern.

Nice-to-haves taken (r10):
- The idea "!" leads and Tok's grin follows three frames later (CD n5).
- The slam puffs are about 1.5× bigger and skip Oro as well as Tok (CD n1).
- Kern's winner hop is 0.5 high instead of 0.72, so its key and check no longer rise across "F@1" (TA n1, WD n2, CD).

Deferred, with reasons:
- Oro's laurel reading as a crest and its jaw drop at card size (CD n2): a re-model of Oro's payoff pose, and the lenses
  that own it score ≥ 8.7.
- Kern's face on the drive (CD n3): a re-stage of B2's opening that five rounds have signed off.
- The watch insert hold (CD n4), the whip variety (CD n6), the plate size at card scale (DE n1), rays across the watch
  face at the crash zoom (DE n2), the lap-2 recompile ramp (DE n3), the pennant under the pill at f252–256 (WD n3), the
  race-1 watch above the desktop crop (WD n4), the gate face under the pill in B1 (WD n5), Kern's nose token reading as a
  tongue (WD n6), and the "@" being darker than its neighbours (TA n2).

## Round 10 — pass r10 (960×540, commit 283e357)

| lens | r1 | r2 | r3 | r4 | r5 | r6 | r7 | r8 | r9 | **r10** | verdict in one line |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Creative director | 6.0 | 7.0 | 7.5 | 7.5 | 8.2 | 8.3 | 8.5 | 8.6 | 8.7 | **8.7** | **no must-fix**: alive and clearly told, Tok is a P(doom)-grade performer; the idea now visibly causes the grin; left: a whip-only transition grammar, a hero born with its back to us, Oro's payoff take |
| Tech-art lead | 6.0 | 7.0 | 7.5 | 7.0 | 8.0 | 8.2 | 8.2 | 8.3 | 8.4 | **8.6** | **no must-fix**: both r9 must-fixes fixed on the frames (the P counter holds, clean E/F/"1" corners, no hairline, Kern's face clean f296–340); polish left |
| Domain expert | 6.0 | 7.6 | 8.2 | 8.3 | 8.7 | 8.8 | 8.9 | 8.8 | 8.9 | **9.0** | **no must-fix**: no claim changed; the headline reads more cleanly than in r9; timings and watch angles exact |
| Web designer | 6.3 | 7.4 | 7.8 | 8.0 | 8.1 | 8.6 | 8.4 | 8.6 | 8.7 | **8.8** | **no must-fix**: poster, seam (f659→f0 step 9.6 against a median of 13.7), pill corner and budget hold (card 3.59 MB at CRF 32); the hop no longer crosses "F@1" |

**Every lens is ≥ 8.5 with no must-fix left: the target is reached.** The final 1920×1080 pass renders this commit
unchanged.

Round 9 items confirmed on the r10 frames:
- *Letter shimmer* (TA): the P counter holds one shape across f596–647. The E/F inner corners (f622–630) and the "1"
  flag (f610–635) are clean. The sides of the "1" and ">" are plain ink (f600–635). The "@" gap reads as see-through
  burst, not a plate artifact (the tech-art lens calls this partly fixed: its tips thin on a few frames).
- *Marks on Kern's face in race 1* (TA, CD, WD): the face is clean on every frame f296–340. The ticks stay by the rear
  wheels, and Oro's wake stops at Kern's outline. Race 2 is clean too (f526–546).
- *The "!" before the grin* (CD): the "!" pops at f380 on a blank mouth, and the grin lands at f383.
- *The winner hop* (WD, CD, DE): the key and check stay under "F@1" (f604–612).
- *Bigger puffs* (CD): bigger and clear of Tok and Oro, but they still read as a row of ovals on the slab edge (partly).

### Polish left open (nice-to-haves, none blocking)
- **Tech-art:**
  - A sharp lead-in to the watch → start whip (f269–272, a 140 px step before the smear starts).
  - A one-frame speck in the P counter (f604).
  - 1–3 px nubs at the R and P counter corners that boil every frame in the hold.
  - The "@" is the darkest glyph.
  - The lap-2 arch pulses dark (f434–449).
  - The crash-zoom peak is one frame (f366).
  - The slam puffs sit on the slab edge, not at the letters' feet.
  - CLANG! touches the top of Tok (f140–144).
- **Creative director:**
  - About 11 whips: swap two or three for panel moves or tilts.
  - Kern's face on the drive (f64–124).
  - Oro's laurel and jaw drop.
  - Kern hidden at the lap-2 weigh-in (f458–478).
  - The watch insert has no character.
  - Puffs that billow.
  - Tok edge-on at f424.
  - The nose token reads as a tongue.
- **Domain expert:**
  - The plate at card scale.
  - The rays over the race-1 watch (f358–360).
  - The lap-2 recompile flip (f447–449).
- **Web designer:**
  - Re-run the card CRF search from the 1080p frames.
  - Raise the payoff framing ~40 master px (Kern's lower face nears the desktop fade).
  - The TRITONGYM board cut by the desktop top edge in the refine (f374–418).
  - The gate face under the pill in B1.
  - Torchy's flame under the pill (f246–258).
  - The nose token.
  - The race-1 watch rim above the desktop crop (f340–346).
