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
