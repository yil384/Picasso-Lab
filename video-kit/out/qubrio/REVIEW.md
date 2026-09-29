# Qubrio — self-review log (README §8)

Four strict lenses score every round from real rendered frames (overview every 12th frame, motion strips through every transition and hit, the frames in the real card chrome at 515×195 and 400×195, the loop seam, full-size stills and frame-difference stats). Each round was run as five independent agents: one per lens, plus a consolidator that re-checked every must-fix against the images, merged duplicates and ranked them. Evidence paths below are relative to `video-kit/`; `films/qubrio/work/` is git-ignored, and the per-round overview and card sheets are committed under `out/qubrio/review/`.

## Round 1 — first full version (preview p3, 672 f at 960×540)

Evidence: `films/qubrio/work/ev/r1/` (overview.jpg, strips_*.jpg, card.jpg, seam.jpg, stills/fNNNN.jpg, diff.txt); committed copies `out/qubrio/review/r1_overview.jpg`, `out/qubrio/review/r1_card.jpg`. Seam diff 671→0 = 9.75 (median 9.90).

| lens | score |
|---|---|
| Creative director | **5.5** |
| Tech-art lead | **6.5** |
| Domain expert (neutral-atom compilation) | **6.5** |
| Web designer (Projects page) | **6.4** |

### Creative director — 5.5

The look is on-series and often lovely. Bold boiling ink, halftone atoms, paper grain and the cute atom faces sit with reference/style-comic, and stills like f360 and f440 could not be mistaken for an HTML page. The story skeleton is also right: circles of r, a plan with one foul, a flag on the exact spot, one convoy against the snail's trips, and a dial that holds the ratio. Two stretches are genuinely P(doom)-grade: Tick's wink, arm raise and crown slap into the inverted-halftone impact frames and ZAP! (f438-458), and the six ∞-bonded pairs sitting clearly apart (f476-482). As a film it does not yet tell itself in one viewing. S3 buries its gag: Loupe stands in the middle of the collision, the flag merges with the amber ghosts, and Rook never visibly draws or erases anything. S4 (f276-344) is exactly the "混乱" the user rejected: a greyed dial in the foreground, ~20 balls floating at random heights, and no readable reject or accept. The convoy is not towed by Rook. S7 (f490-580) is almost 4 s of static wide with the snail gag cropped at the left edge. The payoff is a flat pennant plus a UI-like arrow badge pointing at an unreadable glass tube. All five transitions use the same rain-like streak. One of them (f432-436) double-exposes the incoming shot over the outgoing one, which amounts to a dissolve. The loop reset is a 0.5 s flat violet slab (f644-654). The POWERMOVE flag's text overflows its card, and the flag keeps covering the key action. Keep the look and the architecture, and restage S3, S4, S5 (tow), S7 and the payoff for staging, acting and legibility.

Strengths: The NPR look matches reference/style-comic and in places is better: heavy wobbly ink, Ben-Day halftone on the atoms, paper grain and off-register touches. f360 (amber movers with ^^ faces over dashed AOD lines) and f440 (Tick hero) look hand-made, not like a web page or AI art. · Best beat in the film: Tick's wink and arm raise (f438), the crown slap with a burst (f444-449), then single-frame inverted-halftone impact frames (f450-451) into ZAP! (f452). Real anticipation → hit → aftermath with comic grammar (strips_440-460.jpg). · f476-482 is the clearest science picture in the film: six pairs, each with an ochre ∞ bond, clearly separated in the zone while the storage row squints. It is readable at card size. · The atoms' emotes (sleep arcs, ^^, blush, stars, sweat on Slo at f560) give the cast warmth. Loupe's stride into the scene (f180-198) has personality.

### Tech-art lead — 6.5

The foundation is right. This is a real three.js set with depth: an instrument plate on a violet optical table, a back wall with wainscot, a round window and shelves, and posts that cast shadows. It goes through a working NPR stack: cel ramp plus halftone on the atoms, burin hatching in cast shadows, paper grain and boiling hull ink. The camera language is real: the four whips are rig blends with measured smear (not dissolves), there is a crash zoom with focus lines (f202-204), true 1-bit impact frames (f450 dark, f451 inverted), and the loop seam is clean (671->0 diff 9.75 against a median of 9.9). The SFX are built from stroke skeletons (q_letters.js), not a web font. It is not ready to ship next to P(doom), for these reasons. (1) The set leaks: bare paper shows past the end of the back wall for all of S4, and stray uninked halftone triangles float on the wall in S5-S7. (2) The Canvas2D ink/label layer skips the 3D post and the occlusion checks. Outlines, faces and the POWERMOVE flag stay crisp while the fills smear in whips, so atoms read as hollow rings. The flag keeps its colour through the impact frames, and Rook's 'Qubrio' nameplate prints through Pip's head. (3) The POWERMOVE flag reads as an unlit web label whose text runs about 40% past the flag. (4) The hero of S4 (Tick's dial) is a muddy grey halftone field because it faces away from the key light. (5) After the two good impact frames, the pulse turns into an all-over grey dot screen. (6) The ghosts are rendered the same as the real held atoms. (7) Background props (laser box, flasks) are uninked default primitives. (8) The speed lines look like rain. (9) The SFX, though hand-built, have the uniform-weight round-cap bubbly silhouette the brief bans. Fix the set leaks and the overlay/post pipeline first. Those are the tells that make it look assembled rather than drawn.

Strengths: Real lit 3D set with parallax, not a flat backdrop. The camera moves reveal the wall, table edge, legs and posts at different depths (f296-f338 over-the-shoulder, f612 post with a cast shadow, the f658-f0 crane down), and the atoms cast shadow-mapped, hatched shadows onto the plate (still f0110, f0360). · The NPR look matches the chosen style: cel plus Ben-Day halftone crescents on the atoms and on Pip's head (f0110), burin hatching in the cast shadows, paper grain, and hull outlines that boil (outline positions shift between f560, f562, f564 and f566 without looking noisy). · The camera moves are real. The whips are eased rig blends (q_time.js mixRig with q5) with smear measured from screen motion (f146-158, f262-274, f338-350, f428-438). The crash zoom on the collision has radial focus lines (f202-204). Nothing is a cross-dissolve. · The impact frames at the pulse are proper comic/anime devices: f450 is a dark 1-bit threshold and f451 is inverted. There is also a real volume from the objective plus point lights (q_story.js ~l.304-316), not a painted recolour.

### Domain expert (neutral-atom compilation) — 6.5

The hardware half is mostly right, and better than both reference films. The Rydberg pulse is one flood over the whole entanglement zone and storage stays dark. The convoy is a real 3×2 AOD grid: movers sit at the row×column intersections, the back storage row is left behind, and columns stretch 1.0→1.9 and rows 1.0→1.4 with order kept (check_phys: minimum mover-to-mover distance 1.0). Docked pairs are isolated at 2.65–2.69× the pair distance. The race is honest (same speed bound, 2 atoms per trip, 3 loaded + 2 empty legs = 226 f = 4.7 × 48 f). The dial wedge measures about 78° (≈1/4.7) in f612. The optimiser's accept/reject logic matches the paper, and only 4.7× and 1.3× vs PowerMove appear on screen.

The compile-time half, which is the part that is specifically Qubrio, has real geometry errors:
- **The approved plan collides.** Plan 2's front-left route passes 0.111 from the back-left partner's centre (atom radius 0.22). You can see the pencil line run under that atom in f250, and the re-run ghost overlaps it at step 2 (centre distance 0.23 < 0.44). Loupe still beams, so the verifier approves a colliding plan.
- **The "exact spot" violation is a pile-up of three ghosts.** The front-middle ghost sits 0.000 from CROSS_AT and overlaps both wrong ghosts (0.205 / 0.208). The crossing also lies on both middle-column routes.
- **Pip's circle radius is exactly the pair distance** (circle drawn with P.PAIR), so every mover docks on the edge of r, not inside it.
- **The low cameras re-create round 1's 2×2 clumps.** In S5 and S7 (el 0.20–0.24 rad) the rows at 1.4 pitch collapse on screen (f390, f420, f520).

Readability problems:
- The dry-run ghosts use the same solid amber as real AOD-held atoms.
- The reject/accept verdicts last 4 frames each.
- The 1.3× tag covers PowerMove's reference ring on the gauge.
- ZAP! covers 2 of the 6 pairs at the gate.

All of these are fixable geometry and staging, not concept problems.

Strengths: Global pulse is physically right (stills/f0456.jpg, strips_440-460 f450-458): one hard-edged violet light volume from the objective fills the whole entanglement-zone rectangle. The remaining storage row sits outside it, and all six pairs react together. This fixes round 1's 'narrow pillar = single-site addressing' error. · The convoy is a correct single AOD move (stills/f0360.jpg, strips_338-360 f348-358, f390). Two amber row threads × three column dashes light up with the six movers at the intersections, and the back storage row, which lies on the column lines but not on an active row, correctly stays put. q_phys.aodAt stretches columns 1.0→1.9 and rows 1.0→1.4 with order kept. check_phys: minimum mover-to-mover 1.000, and no mover passes through an atom during the real run. · Pair isolation at the gate: each docked mover's nearest atom is its partner (0.52), and the next nearest is 1.38–1.40, i.e. 2.65–2.69× the pair distance (check_phys). That even meets the common 2.5× crosstalk rule of thumb, and f456 shows six clean, separated doublets from the high 3/4. The storage pitch of 1.0 (2.3 atom diameters) addresses round 1's 'storage looks paired' note. · The race is honest and quantitative. Slo carries 2 atoms per trip (≈ the site's 1.7 per move), on a lane as long as the convoy's travel, at the same speed bound. Its 45.2 f legs over 3.25 are within about 2% of the convoy's speed over its 3.3–3.4 path. 5 legs = 226 f = 4.7 × 48 f. Tick's violet wedge stops at 1/4.7 of PowerMove's lap (measured ≈78° in f612), so the headline ratio is shown by an instrument, not only claimed.

### Web designer (Projects page) — 6.4

As a muted card, this round beats both round-1 Qubrio films. The loop seam is clean: f671→f0 differs by 9.75, below the median frame difference of 9.90, and seam.jpg shows a continuous crane. The 4.7× reads big and bold at 515×195 once it settles (f600–f640), atoms are about 20–30 CSS px with faces that mostly read, the SFX are hand-lettered, and nothing important sits under the LIVE pill. It is not ready to ship. Four problems break the card:
(1) The brush wipe covers the frame for 12 frames (f644–f655), and 8 of them are identical (inter-frame diff ≤ 0.06). Because the card file starts at the poster frame f612, visitors hit this blank violet card 1.3 s after playback starts.
(2) The one on-screen word for the baseline, POWERMOVE, is cropped to "OWERMOV", "ERMOV" or "WERMOVE" in most shots. Its lettering overflows the flag. The flag covers Pip (f96–132) and the convoy (f372–420), and at the payoff it touches the 1.3× tag, so the card can read "POWERMOVE 1.3×".
(3) In the 515 crop, TWEET! (f204–216) and the rising 4.7× pop (f583–595) are clipped at the top. Tick's dial is cut at the bottom in S4 (f272–344) and in the poster (f612), so the proof wedge and Tick's smile fall into the fade.
(4) The budget will not hold as set up. From the preview, the card needs CRF about 31–33 to fit 4 MB, but the encoder's search stops at CRF 29. The master projects to about 65–75 MB at CRF 18.
S4 (optimise) and the 4 s before the pop in S7 are the weakest stretches at card size. Together they are about 7.5 s where the card shows a cut-off clock and a scatter of pebbles.

Strengths: The loop seam is clean. diff.txt gives seam 671→0 = 9.75 against a median of 9.90, and seam.jpg (f664–f7) shows one continuous crane with no pop. The storyboard also plans to rotate the card file to start on the poster frame f612, which fixes the round-1 poster-to-video jump. · The settled payoff is card-safe and legible. At f612 the 4.7× numerals sit at about master y 290–500 and x 590–1130, violet on ochre with a heavy ink outline. The cap height is about 30 CSS px in the 515 card, and it reads first (card.jpg f612, both widths). · Big, simple silhouettes. Atoms are about 90–110 px in the master (about 24–29 CSS px at 515) with smiling or sleeping faces that read at 1× (card.jpg f390, stills/f0360). Pip, Rook, Loupe, Tick and Slo each have a distinct shape. · The convoy beat reads at card size. Three 2×2 amber blocks with amber AOD dashes are visible (card.jpg f390, stills/f0360), and the whip in strips_338-360 is a real camera move, not a dissolve.

### Consolidated must-fix (verified against the frames, ranked)

1. **[blocker] S4 'optimise on the simulator' is illegible. About 25 cream and amber balls hang over the live plate, the hero dial is a grey halftone field cut off at the bottom, and the reject/accept verdicts are on screen for only 4 frames each.** (director, techart, physicist, web)  
   Evidence: My pulls f286-f336 and stills/f0296.jpg, f0324.jpg: ghosts and real atoms mix on the plate with no try/reject/accept shape. The dial face is dense grey halftone. Its pivot is at y≈890-950 of 1092, and card.jpg f296 shows only the top half of the dial. The verdict window in q_time.js:347 is F∈[a+18,b), which gives f300-303 and f326-329. The ✗ is a small dark-ink mark by the gauge (f300-302) and the ✓ is a tiny ochre tick (f328). No flung ghost or gauge drop registers. The gauge's tick rings look alike, so it does not read as a meter. Tick's face does read (f300 '>~', f326 '^^'), so the face is not the problem.  
   Fix: Move the simulator off the live plate onto a slate or into Tick's watch glass, with ghosts drawn in pencil, and throw the real plate out of focus. Push in to a medium on Tick with the whole dial inside master rows 250-800, and add a per-shot key or fill so the dial is cream, not grey. Give each try at least 36 f and hold each verdict at least 20 f. Draw the ✗ in the pop colour at twice the size, with a squash-pop. For try 1, fling one ghost on a clean arc toward the lens with speed lines while the gauge column dives and Tick grimaces. For try 2, the wedge shrinks, the column climbs past a thick lilac PowerMove notch, and a ✓ stamps. This reframe also removes the set-edge leak.
2. **[blocker] The compile-time physics is wrong. The verifier approves plan 2 even though it collides, plan 1's 'exact spot' foul is a pile-up of three ghosts, and the approved plan is not the move that is actually executed.** (physicist)  
   Evidence: I recomputed from q_phys.js and q_time.js ROUTE1/ROUTE2. The front-left mover's plan-2 straight route passes 0.111 from the back-left partner's centre (2R = 0.44). At re-run step 2 (f252-255) that ghost is 0.230 from the partner. It shows in my pull at f254 (an amber ghost overlapping a cream partner) and in stills/f0250.jpg, where the pencil line runs under the back-left partner. At plan-1 step 2 the front-middle ghost is 0.016 from CROSS_AT and overlaps both wrong ghosts (0.205 and 0.208), which is the three-ball clump in f0200 and f0212. Plan 1's swapped front-left route also passes 0.111 from the back-middle partner, a second conflict that is never flagged. The real convoy follows aodAt (a dog-leg), not the straight ROUTE2 lines.  
   Fix: Draw plan 2's pencil routes, its re-run ghosts and the K.tries replays from P.moverXZ(m,p) sampled at p = 0.25/0.5/0.75/1, so the approved plan is exactly the executed convoy. Make plan 1 swap two adjacent front columns (pc0↔pc1), or hold the middle ghost back one step, so that exactly two ghosts meet at CROSS_AT. Add check_phys assertions: at the bonk exactly two ghosts are within 2R of CROSS_AT, no third route passes within 0.3 of it, and no plan-2 ghost comes within 2R of any atom at any step.
3. **[blocker] The payoff does not land. 4.7× sits on a flat rectangle with no hit, the proof on the dial is invisible, 1.3× reads as a web badge on a tube nobody can read as a gauge, and the settled hold is under 2 s.** (director, web, physicist, techart)  
   Evidence: stills/f0612.jpg, f0590.jpg; strips_575-600.jpg; card.jpg f590/f612. The pennant is a plain amber rectangle with no burst, where the reference has an extruded 4.7× (qubrio_comic_sheet f292/f315) and a starburst (picturebook f270). The pop rises through the top edge at f585-589 and is clipped in the 515 card at f590. The '4' overhangs the pennant's left edge. Both dial hands are solid violet, so 'the ghost closes the lap' can't be seen. Tick's star eyes straddle the hands. 1.3× is in a white hexagonal arrow tag that covers the mid-tube, and the adjacent flag makes it read 'WERMOVE 1.3×'. The pairs' faces peek out under the tag, and nobody else reacts. 4.7× settles around f593 and the wipe starts at f641, and in the 400 crop the dial falls into the fade.  
   Fix: Stage it as anticipation then hit: a lettered CLICK! as the dashed lilac PowerMove hand meets the solid violet Qubrio hand, 3-4 f of held silence, then the pennant snaps up with overshoot over an ink starburst while the camera pushes. Keep everything inside master rows 220-800 and recompose so the full dial fits. Move Tick's face below the hub. Rebuild the gauge as a chunky thermometer with a lilac PowerMove notch and a violet column rising past it. Hand-letter 1.3× on a paper tag hung by string above or right of the column top, with a small fidelity glyph. Keep Slo's flag at least 150 px away, or put Slo behind Tick. Add cast reactions: pairs bounce out of phase, Pip twirls, Rook toots. Trim S7 by about 1 s so both numbers hold at least 72 f, then pick the poster again.
4. **[major] The S3 foul-and-fix gag is buried. Loupe crowds the collision, TWEET! covers its face, the flag disappears into the amber ghosts, Rook never draws or erases, and Loupe has no face for the 'beams' beat.** (director, web, techart)  
   Evidence: strips_186-216.jpg; my pulls f214-f262; stills/f0200.jpg, f0212.jpg, f0250.jpg. Loupe walks into the storage block (f190-198) and stands right beside the clump (f200-214). The 'EET' of TWEET! lies over the lens (f206-222), and the letters touch the top of the 515 card at f212. The ochre flag lands inside the amber ghost cluster (f214-226). Rook is on screen (frown at f200, worried 'o' at f250), but the routes change by themselves between f234 and f238. The lens shows only the whistle, no eyes, from f200 to f262, so the 'Loupe beams' beat never reads. f228-264 is nearly static at card size.  
   Fix: Keep Loupe at the plate's right edge and have it hop in only after the bonk. Frame the crash zoom (f202-204) so the two ghosts and the X sit dead centre with nothing in front. Letter TWEET! in a jagged balloon above-left, with a tail to the whistle, inside rows 240-520. Make the flag red-ochre with an ink ring. Put a pencil and eraser on Rook's arm: it scrubs out exactly those two routes with an eraser-crumb puff and a sweat drop, then redraws them. Give Loupe a stern squint at the foul and a big grin plus thumbs-up at about f250, held for at least 12 f.
5. **[major] The dry-run and simulator ghosts are solid, inked, shadow-casting amber spheres, the same look the film uses for atoms actually held by the AOD. 'Compile before run' therefore looks like real atoms crashing on the device.** (director, techart, physicist)  
   Evidence: stills/f0200.jpg, f0212.jpg, f0296.jpg (ghosts) vs f0360.jpg (real movers tinted amber at GO). At card size (card.jpg f200/f296) they cannot be told apart.  
   Fix: Give the ghosts their own pencil or graphite material: a dashed or sketchy outline with no inverted hull, paper showing through (about 45% fill, or hatch only), no shadow casting, and stepped positions. Keep amber only for 'gripped by the AOD' from f352.
6. **[major] Rook does not tow the convoy, so the film's central discovery loses its image. The block slides on its own, the steam reads as cracked eggs, and Slo's flag covers the docking pairs.** (director)  
   Evidence: My pulls f344-f428 and stills/f0360.jpg, f0390.jpg. Rook is parked and cropped at the left frame edge. The white steam puffs have crack hatching (f0360 top-left, f364-372). There are no speed lines, no SFX and no docking squash. Slo crosses the centre from f380 to f428, and its flag sits over the right-column pairs.  
   Fix: Frame Rook whole in the central band with the amber AOD lines visibly coupled to it. Give 4-6 f of anticipation (it rocks back, wheels spin), then have it chuff forward in lockstep with the stretching block. Add tapered ink speed lines and a hand-lettered CHUFF!/WHOOSH, and a 3-frame squash plus overshoot on all six movers at the dock. Draw the steam as round puffs without crack lines. Hold Slo's departure until after the dock, or keep its lane off the convoy's screen band.
7. **[major] The low cameras at the dock and in the race bring back round 1's '2×2 clump' pair-geometry error: the two zone rows overlap on screen.** (physicist, web)  
   Evidence: stills/f0390.jpg, f0420.jpg: each column reads as 2 amber + 2 cream atoms touching. stills/f0520.jpg, f0560.jpg: the ∞ pairs stack front-on-back. Also card.jpg f390/f520, and f0360, where the storage columns read as touching stacks.  
   Fix: From f396 to f434 raise R_D's elevation to at least 0.55 rad and set azimuth to about 0.35-0.45. From f484 to f580 raise R_G's elevation to at least 0.45. Acceptance test: on the 400×195 card, a cream gap of at least half an atom separates every pair from the pair behind it.
8. **[major] The S7 race (f490-584) is almost 4 s of static wide. The snail gag that proves the ratio is cropped at the left edge, and nobody reacts to it.** (director, web, techart)  
   Evidence: The overview tiles f492-f576 are nearly identical. In my pulls f500-f572, Slo is half out of frame at the left and its flag reads 'OWERMOV' or 'WERMOVE'. Rook is out of frame. Loupe stands behind Tick facing the camera. The yawn is a tiny 'o' on the dial (f528), and the hands split Tick's face (stills/f0560.jpg, card.jpg f520).  
   Fix: Re-block so Slo's lane and both trays sit at master x 250-900 inside rows 300-800, with Slo at least a third of frame height. Show effort on the loaded legs (sweat, huff puffs). Cut in 1-s reaction inserts: Tick taps its foot, Loupe's lens tracks Slo left and right, Rook dozes then does a full-face yawn. Keep the dial in frame, add a slow arc with foreground parallax, and give about 1 s of this shot to the payoff.
9. **[major] The whip transitions are generic and one is a disguised dissolve. All the speed lines read as rain, the incoming shot is double-exposed over the outgoing one, outlines stay crisp while fills smear, and the S6→S7 move snaps with no smear.** (director, techart)  
   Evidence: strips_146-160 (f152-154), strips_262-276 (f266-270), f344 and f432-436 all use thin, even white streaks. At f433-435 Tick's line art is superimposed on the convoy wide, which is a dissolve and breaks the series rule. Atoms become hollow rings (crisp outline, smeared fill) at f152 and f432-435. From f485 to f490 the camera orbits with a diff of 48-53 per frame (diff.txt) and no smear.  
   Fix: Swap shots under one full-cover smear frame with no overlap. Draw tapered speed lines in ink colour, clustered at the frame edges, each living 2-3 f. Composite the ink canvas before the smear pass, or run the same smear on it. Motivate at least two transitions with story objects (Pip's last circle → Rook's wheel; an iris through Loupe's lens onto Tick's dial). Make f485-490 a declared whip or an eased move of about 14 f.
10. **[major] The closing brush wipe holds a frozen, flat violet slab for half a second, and card visitors hit it 1.3 s after playback starts.** (web, director, techart)  
   Evidence: Measured on work/prev/p3.mp4: full cover runs f644-f655 (12 f, frame std ≈22, constant mean [107,62,195]), and the frame-to-frame difference is ≤1 from f647 to f653, so the streaks do not move. See strips_636-664.jpg. The card file is rotated to start at f612.  
   Fix: Cap full cover at 4 f or less, with every stroke moving each frame and given bristle, dry-brush breakup and an ink edge. Let the trailing strokes reveal S1 by about f652. Better: make the reset an in-story beat (Tick's hands spin back to 12, the lamp dims, the cast yawns, the atoms drift home), then whip or iris into f0. Re-check that no two full-cover frames differ by less than about 3.
11. **[major] The POWERMOVE flag's text overflows the paper and is cut by the frame edge, the flag looks like an unlit web label, and it covers key action again and again.** (director, techart, web)  
   Evidence: The text spans x 370-670 on paper at 415-630 in f0030, and 1210-1600 on paper at 1265-1545 in f0390; the overflow is also visible in f0456. The frame edge crops it to 'OWERMOV' (f0-132) and 'WERMOVE' (f520-640). It stays lilac and white in the 1-bit impact frames f450-451. It covers Pip's pencil leg and a partner (f60, f96-132), the right-column convoy pairs (f396-428) and the front-left pair after the pulse (f462), and it abuts 1.3× at f612.  
   Fix: Fit the glyphs inside the flag with about 10% margin, and hand-letter them in the SFX style. Build the flag as a 3D plane with a CanvasTexture so it gets depth, cel, halftone, smear and the impact passes. When Slo is on screen, keep the whole flag in frame, or take Slo fully off-camera. Route Slo's lane below the zone's screen band in every framing.
12. **[major] The set leaks and has stray geometry. Bare paper shows past the end of the back wall for all of S4, and uninked halftone triangles float on the wall in S5-S7.** (techart, director, web)  
   Evidence: f270-f343: the top-left of the frame is raw cream halftone paper beyond the wall (stills/f0296.jpg x 0-620, y 0-210). Triangles with no caster appear in f0360 at (660-700,150-230) and (1590-1700,20-100), in f0390, in f0560 at (920,215-270) and (1690-1790,125-210), and in f0612 at (1440-1540,295-380).  
   Fix: Extend the back wall into a return wall or corner that reaches past every rig's frustum. Verify each rig with a magenta clear colour at 16:9 and at the 2.1:1 card crop. Find the triangles' caster (lamp shade, shelf brackets or shadow-camera bounds), then either ink it as a visible object or set castShadow=false and adjust the bias.
13. **[major] After two good impact frames the global pulse turns into grey mush that hides the pairs it is entangling, and ZAP! covers two of the six pairs.** (techart, physicist, director, web)  
   Evidence: f452-f460 (stills/f0456.jpg): a full-frame grey dot screen, and dense vertical flood lines veil the pairs. The 'Z' covers the back-left pair and the 'A' the back-middle pair (only its stars peek out). In card.jpg f456 the top of ZAP! touches the 515 edge. f450 and f451 themselves are good.  
   Fix: End the halftone impact treatment after f451. Show the flood as light: the zone rectangle is the brightest area, with a pale-violet top light and hard contact shadows, while the surroundings dim (build on the room-light dip already added for f440-484). Cut the flood's line density by about 50%. Move ZAP! over the objective or the empty storage area, about 15-25% smaller with its top at master y ≥ 230, inside a jagged balloon, so all six pairs stay visible from f450 to f468.
14. **[major] The 4 MB card budget cannot be met as the tooling is set up.** (web)  
   Evidence: tools/encode_segs.py encode_card tries 8 CRFs starting at --crf-start (default 22, so 22-29) and then fails. My test re-encode of p3.mp4 (960×528 crop, hqdn3d 1.2:1.2:4:4, x264 slow, CRF 29) came to 6.25 MB, well over 4 MB. The boiling ink and moving halftone eat the bits.  
   Fix: Run the card encode with --crf-start 30 and widen the loop to about 36. The web reviewer measured CRF 31 ≈ 4.3 MB and CRF 33 ≈ 3.2 MB; check quality side by side at 515 px. Before the final, encode a 96-frame 1080p chunk of f440-f536 at CRF 18 to project the master against the ~70 MB cap, and fall back to CRF 19-20 if it is over. Record both sizes in REVIEW.md.
15. **[minor] The 2D ink and label layer skips 3D occlusion and the impact pass: Rook's 'Qubrio' nameplate prints through Pip's head, and labels and SFX stay in colour inside the 1-bit impact frames.** (techart)  
   Evidence: stills/f0110.jpg: 'Qubrio' script is visible on Pip's violet head at about (200,380). In f450-451 the POWERMOVE label stays lilac and white, and at f451 ZAP! is full colour. The whip hollow-ring issue is covered in the transitions item.  
   Fix: Run the impact threshold/invert on the ink canvas too, or composite the ink before npr's impact pass. Occlusion-test the nameplate against every mesh, not only Rook's own. q_story.js:429 now calls v.clear(c, ownR), but that edit came after this render, so confirm the f110 bleed is gone in the next render. Better still, make the labels CanvasTexture planes in 3D.
16. **[minor] Pip's placement circle is drawn at exactly the pair distance, so every mover docks on the boundary of r instead of inside it.** (physicist)  
   Evidence: q_story.js:102 draws W.circles with radius P.PAIR (0.52), and dockXZ puts the mover exactly 0.52 from its partner. In stills/f0110.jpg the ochre dock dots sit on the ochre rings at about (820,670) and (1320,680).  
   Fix: Draw the circle at 1.2-1.3 × PAIR (0.62-0.68) and leave PAIR at 0.52. The circles still don't touch at the 1.4 row pitch (2×0.68 = 1.36).
17. **[minor] The SFX lettering keeps the bubbly silhouette the series bans: upright, uniform-weight, round-capped letters with a hard two-tone split fill and no balloon.** (techart, director)  
   Evidence: TWEET! (stills/f0212.jpg) and ZAP! (stills/f0456.jpg), compared with the angled ZAP! in its jagged burst in qubrio_comic_sheet f202.  
   Fix: In brushWord, add thick-thin pressure (about 0.16-0.34), cut terminals, an 8-12° forward lean and a first letter about 25% larger. Put a jagged ink burst balloon behind each SFX, and replace the split fill with one fill plus a halftone shade band.
18. **[minor] Background props are uninked default primitives that read as stock three.js.** (techart, director)  
   Evidence: The laser head in stills/f0030.jpg (x 385-650, y 190-300) and f0200 is a cream box with no hull outline and unshaded orange and off-palette red knobs. The shelf flasks are soft, uninked blobs (f0360, f0390).  
   Fix: Give background props a hull outline at about 60% weight, the cel ramp plus halftone, an ochre knob instead of red, and a vent, nozzle and cable on the laser head so it reads as an object.

Disputed or downgraded by the consolidator:

- Director S3: 'Loupe stands in front of the two bonking ghosts; the collision is behind its handle (f200)'. In stills/f0200.jpg the three-ghost clump sits left of the lens and is visible. The real problem is crowding, not occlusion, and it is kept under the S3 staging item in that form.
- Director S3: 'Rook stays tiny at the left edge'. In f0200 and f0250 Rook is medium-sized with a readable frown and a worried 'o'. The only valid part is that Rook never draws or erases anything.
- Director S4: 'Tick's face barely visible (a faint ~ at f328)'. Even at half resolution, f300 reads as a '>~' grimace and f326-328 as a '^^' smile. The S4 problem is the grey, cropped dial and the ball clutter, not the face.
- Techart: 'the POWERMOVE flag is visible from S1 although the code says it springs up at GO'. This is not a visible defect: Slo is on stage from S1 by design, and a code comment is not evidence. The flag's overflow, cropping and occlusion problems are kept.
- Techart: 'the nameplate loop has no v.clear() test (~l.408)'. The current q_story.js:429 does call v.clear(c, ownR), and the source files were edited after the p3 render. The bleed through Pip at f110 is real, but the claimed code cause is unconfirmed.
- Techart: Sobel ink crawl on Loupe's lens (f200-202). The specks are real but 1 px at 960 and invisible at card size, so this is a nice-to-have, not a must-fix.
- Web: 'the master projects to ~65-75 MB at CRF 18'. This is an extrapolation, not a measurement. It is kept only as a pre-final check inside the card-budget item.
- Web: 'TWEET! is clipped at the top in the 515 card'. In card.jpg f212 the letter tops touch the edge but are not visibly cut. It is a margin problem, folded into the S3 lettering-placement fix.
- Physicist: 'the glow halo goes only on even-indexed atoms (q_story.js:319)'. It is not visible in f456-f482 (the physicist says so too), so it stays a nice-to-have.
- Physicist: 'plan 1's swapped front-left route passes 0.15 from the back-middle partner'. I recomputed it at 0.111. That is a correction to the number, not a dispute; the conflict is real and kept in the physics blocker.

### Fixes applied after round 1 (visible in round 2's preview p4)

- **Compile-time physics:**
  - Plans are now sampled from the AOD path itself, so plan 2 *is* the executed convoy move.
  - The foul sends two front-row movers to each other's docks. Exactly two ghosts bump; `tools/check_phys.mjs` now verifies this at the bump step, along with the other-route clearance and ghost-to-atom clearance.
  - Pip's circle is r = 0.65 = 1.25 × the pair distance, so the dock mark sits inside it.
- **Ghosts:** 2D pencil sketches (paper fill, graphite hatch, dashed double outline), never amber. Amber now means only "held by the AOD".
- **S3:**
  - Rook's pencil pops out of the cab and draws each route in turn.
  - Its eraser rubs out exactly the two bad routes (with crumbs) and redraws them.
  - Loupe stands beside the block, never in front of the crossing. TWEET! sits clear of its lens.
  - The two real atoms whose ghosts will bump glance at each other and sweat (dramatic irony).
- **S4:** moved off the chip onto a slate Tick holds (the simulator).
  - Try 1 is rushed and has the set-down/re-pick hiccup. A ghost is flung, fidelity drops, and a big stamped ✗ appears.
  - Try 2 is one smooth glide, stamped ✓.
  - The camera frames slate | Tick | gauge in the card band.
- **Readouts:**
  - A twin-column fidelity gauge: PowerMove's grey-lilac column at h with an ink bar, Qubrio's violet column at 1.3 h.
  - 1.3× is on a paper luggage tag, and the arrow badge is gone.
  - 4.7× is on a flag that springs out of the crown to the dial's left, so the payoff is one horizontal band.
- **Time and cameras:**
  - The convoy is 44 f, PowerMove 207 f (4.7×), and the lap closes at f563.
  - The S5 and race cameras are raised so the pairs separate.
  - A declared whip replaces the unsmeared race snap.
- **Pulse:** the room dims in anticipation and the zone is the brightest thing. The print punch appears only on the two impact frames. ZAP! is placed over the dark storage.
- **Lettering:**
  - Pressure swell, chisel-cut ends, a lean and a first-letter scale ramp.
  - A Ben-Day shade band replaces the two-tone split.
  - The SFX sit on jagged burst balloons.
- **Post:**
  - Whip streaks are drawn in ink.
  - The 3D lines fade in whips, and the 2D ink layer smears or goes 1-bit with the 3D post.
  - The nameplate is occlusion-tested.
- **Set:** return walls (no set edge in any shot). The stray wall-shadow wedges are removed (the wall no longer receives shadows). The laser head is inked with an ochre knob, and the steam puffs are clean single meshes.
- **Wipe:** the full cover is shortened.

## Round 2 — after the first fix pass (preview p4, 672 f at 960×540)

Evidence: `films/qubrio/work/ev/r2/` (same set as round 1); committed copies `out/qubrio/review/r2_overview.jpg`, `out/qubrio/review/r2_card.jpg`. Seam diff 671→0 = 9.60 (median 8.71). Two issues were already fixed after this render and were excluded from scoring: Loupe's tipped-forward lens (f190–262) and the opening crane distance.

| lens | round 1 | round 2 |
|---|---|---|
| Creative director | 5.5 | **7** |
| Tech-art lead | 6.5 | **7.4** |
| Domain expert (neutral-atom compilation) | 6.5 | **7.6** |
| Web designer (Projects page) | 6.4 | **7.5** |

### Creative director — 7

Round 2 is a real step up from round 1's 5.5. The look is firmly 3D comic: boiling ink, Ben-Day halftone, hatched shadows and chunky hand-built lettering. No frame reads as a web page or as generic AI art. Five of the seven beats now read in one viewing at card size:
- Pip's r-circles (f110-f144).
- The two ghosts bumping, then TWEET! and the flag on the spot (f200-f234).
- Tick's ✗ then ✓ (card f300/f330).
- The six amber movers gliding as ONE convoy and docking with blushes (f356-f404).
- The ZAP! into ∞ bonds and star eyes (f450-f470), still the best beat in the film.

The 4.7× payoff is big and legible in the 400×195 card (card f600-f640).

It is not at the 8.5 bar, because the film still fumbles its three most important causal moments.
1. **Optimiser (S4).** The ✗ lands at f288, before the ghost is flung (f290-f296). The effect comes before its cause, the set-down/re-pick hiccup is invisible, and the fidelity drop can't be seen.
2. **Race climax (S7).** The lap closes at f563 inside a knot of Slo, the POWERMOVE flag, Tick's arm and the dial. The only cue is a tiny crown star (f563-565). The 'wilt' renders as a blank white slab (f567-f571), and 4.7× springs out during a camera move.
3. **Race setup (S5).** GO is never shown. Tick and Slo are off-frame when the convoy starts (f350-f400), so the dial race has no setup.

The payoff hold (f576-f644) loses the baseline: PowerMove's flag is gone, so the poster says '4.7×' with no 'vs'. Loupe is hidden behind the flag pole, and a tangle of sticks sits left of the dial. The 1.3× tag seems to hang on an optics post, and the ~3 s hold is almost motionless.

S3's correction beat (a tiny pencil erasing routes, f228-f250) is invisible even at full resolution. The loop wipe is a flat violet slab for about 6-7 frames (f647-f653).

Everything here can be fixed in staging and timing; the concept, cast and look are right. Fix the order of the three causal beats, the climax and the payoff frame, and this could reach 8.5.

### Tech-art lead — 7.4

Round 2 is a real lit three.js comic world, and it is clearly better than the style-comic reference in ink control and lettering. The set has parallax (plate, brass rim, table legs, wainscot wall, shelves, window, return walls), atoms and props get a cel ramp plus halftone terminator, cast shadows are hatched, the ink hull boils (hold frames still differ by 1.4 to 5.5 mean), and TWEET!, ZAP!, 4.7× and 1.3× are proper hand-built lettering, not a web font. The two negative-print impact frames (f450/f451) are the best comic beat in the film. It is not at the 8.5 bar yet, and the failures are concrete craft defects I can see in frames. (1) The whip smear is under-sampled, so every whip shows stacked stroboscopic copies (f268-270, f346, f432, f487-490), and the S3 crash zoom has no smear at all (f200 to f203, per-frame diffs 42 and 44), so it plays as a jump cut. (2) Pure-black hard ellipse blob shadows with no visible caster read as holes in the table and floor (f40, f172, f292-340, f600-640). This clashes with the hatched shadow language everywhere else. (3) Slo's huff puffs are two overlapping translucent atom-sized circles, and they drift across the zone from f356 to f560. They look exactly like a ghost atom pair. (4) In the payoff, Loupe's 2D "^ ^" eyes draw through the 4.7× flag (f600/f620/f640 at about (635,465) in the 1920 stills) while Loupe itself is completely hidden behind it. The 1.3× tag also reads as a sign bolted onto a background optic post. (5) The one gag that hits the lens (a ghost flung at the camera, f292-300) is a roughly 15%-opacity disc with no ink, so it is nearly invisible. (6) The brush wipe holds 6 flat digital violet frames (f647-652) where the storyboard says at most 4, and it has no bristle, grain or halftone. (7) The payoff wall is flat, evenly lit lilac with soft grey AO-like blotches, and the gauge tubes look like default transparent material. Fix these and the look is shippable.

### Domain expert (neutral-atom compilation) — 7.6

Every shot now maps to a real Qubrio concept, and the arithmetic checks out wherever I could measure it. Pip's circle is r, and the dock sits inside it. The plan is the AOD path. Loupe flags the exact conflict point, and only the two bad routes are erased. The accept rule works: an unoptimised wedge of about 130° (1.7/4.7, and the site confirms that K=0 schedules are 1.7x longer) falls to 90° on try 1, but fidelity drops below the current schedule's level, so it is rejected (✗). Both readouts then reset (f306), and try 2 reaches about 76° with the fidelity column rising, so it is accepted (✓). The convoy is one synchronised move of 6 atoms. The pulse is a hard-edged flood over the whole zone. On the dial, the violet hand stops at about 74-76° (1/4.7 = 76.6°), and PowerMove's hand is at about 146° at f440 (84/207 of the lap). The lap closes at f563. It still misses the 8.5 bar, because several visible frames break the film's own rule that distance encodes interaction. (1) The leading convoy row passes exactly through the back-row docks and touches the back-row partners mid-flight (f378-384). (2) Slo's cream cargo atoms project into the zone during the placement shot, including one inside the front-middle r-circle (f40, f110, f146). (3) Unexplained translucent pairs of overlapping atoms sit in or at the edge of the entanglement zone, including during the global pulse (f360-f560). (4) Neighbouring r-circles touch, although S2 claims they never do. (5) The rule that AOD columns never cross is only implied: columns are drawn as short stubs, and the foul reads as a generic collision. (6) The 1.3x column reads as about 1.45x above the bulbs. (7) The payoff/poster frame loses its PowerMove reference.

### Web designer (Projects page) — 7.5

As a muted Projects-page card this round is clearly better than round 1 (6.4), but it is not ready to ship at 8.5. What works: the loop seam is clean. The poster/payoff band (4.7× flag | dial | gauge with the 1.3× tag) is card-safe and reads at 400 px. Most beats read at card size: placement circles, X/✓ on the slate, the amber convoy, ZAP with ∞ pairs, and the snail race with a legible POWERMOVE flag. The 4 MB card budget can be met with no visible loss. Four problems still break the card. (1) ZAP! is cut off at the top of the 515 crop (f452–f484). (2) The POWERMOVE flag is sliced in half by the card's bottom edge in S6, so garbled half-letters show at the bottom. (3) I measured 6 full-cover frames in the brush wipe plus 2 partial ones, against the claimed 2–4. It is a flat violet slab with hairline streaks, and every card visitor hits it 1.4 s after the poster. (4) After TWEET!, the second half of S3 (erase and redraw, f222–f262) can't be read at card size: the pencil is about 19 CSS px, and the old and fixed routes are the same thin violet lines. Smaller issues: the ✓ verdict holds 14 f, not ~20. The card-encode default (CRF 22 plus 8 steps) would fail the budget, and the master size is still unmeasured. Measured by me: the preview re-encoded as a 960×528 card is 4.64 MB at CRF 30, 3.48 MB at CRF 32 and 2.62 MB at CRF 34. At 515 px, CRF 32 and 34 look the same as the source. The frame-to-frame difference at the card file's wrap point (f611→f612) is 6.5. The wipe's violet cover fraction is 0.67 at f646, 0.82–0.83 for f647–f652 and 0.75 at f653.

### Consolidated must-fix (verified against the frames, ranked)

1. **[blocker] S7 climax: the cause of 4.7x (PowerMove's hand closing the lap) is buried, and the flag 'wilt' renders as a glitch** (director, techart, physicist (web nice))  
   Evidence: strips_556-600.jpg, plus my crop sheet of f556-f584 from prev/p4.mp4 (scratchpad/s_climax.jpg).
- f556-f562: Slo, its POWERMOVE flag, Tick's left arm and Slo's antenna all pile onto the dial's lower-left edge.
- PowerMove's hand is a thin dark line, the same ink as the dial ticks, with no swept fill (my 2x dial crops f492-f562). The only cue that the lap has closed is a small yellow daisy on the crown at f563-f565. There is no CLICK and no shake.
- f567: the POWERMOVE flag turns into a blank white rectangle, which shrinks through f571 and vanishes.
- f566-f569: the 4.7x digits pop up floating with no ochre field; the field only completes around f572. The camera is already moving (f566-f576), and at f568-f570 the digits overlap Loupe's lens.  
   Fix: Lock the camera from f556 to about f580.
- Move Slo's drop point clear of the dial (beside it, not across it).
- Fill PowerMove's swept area in pencil-grey hatch as its hand runs, so the lap reads at 400 px.
- Slow in the last ~30 degrees. Slo drops the last pair with a thunk, then the hand hits 12 with a lettered CLICK and a 2-frame dial shake. Hold 4-6 f.
- Then wilt the flag for real: the pole bends and the cloth droops and greys, with the text staying legible.
- Only after that, move the camera and spring the 4.7x flag: crown squash as anticipation, field and digits together, overshoot, 2-3 f of cloth flutter. Never draw it over Loupe.
2. **[blocker] Payoff/poster hold (f576-f644) has no in-shot baseline and is cluttered: occlusion bugs, a mis-attached tag, thin gauge, static hold** (director, techart, physicist, web)  
   Evidence: stills f0575, f0600, f0620, f0640; card.jpg f600/f620; my crops scratchpad/s_loupe.jpg and s_gauge600.jpg.
- No POWERMOVE lettering remains anywhere after f571, and the grey column is unlabelled, so '4.7x' and '1.3x' have no 'vs'.
- Loupe is hidden behind the 4.7x flag; only its handle shows, at about x600-720, y430-660 in f0600.
- Loupe's 2D '^ ^' eyes are drawn on top of the flag between the '7' and the 'x' (f600 and f640 crops).
- A tangle of sticks sits at the dial's lower-left: Tick's arm, Slo's pole and antenna, Loupe's handle.
- The 1.3x tag sits directly on a background ring-optic post (about x1460 in f0600), tied to the violet tube by a hairline string.
- The tubes are thin, faint glass.
- The top ~30% of the frame is empty wall, and 4.7x spans only about 22% of the width.
- The frames f576-f644 are near-identical. 1.3x holds only about 61 f (f584 to the wipe at f645), against the 72 f agreed in round 1.  
   Fix: Re-block the poster band:
- Keep the wilted but legible grey POWERMOVE flag hanging beside PowerMove's grey column, and keep PowerMove's grey-hatched full lap on the dial, so the frame alone reads '4.7x vs POWERMOVE'.
- Walk Loupe clear, to the right of the gauge, with a cheer pose. Depth-test the 2D face layer against the scene depth, or cull a face whose anchor is occluded.
- Clear the stick tangle: Slo slumps at the tray edge, and Tick's arm stays free.
- Remove the ring-post from under the tag. Use a 3-4 px ink string knotted to the violet tube's lid.
- Make the tubes about 2x wider, lightly tinted and opaque, with an ink outline and a bold PowerMove bar.
- Push in so flag | dial | gauge fills about 80% of the width.
- Hold both numbers for at least 72 f.
- Add out-of-phase life: Tick bounces, the pairs cheer, and Pip and Rook react.
3. **[major] S4 try 1 plays the verdict before its cause, the fling/hiccup gag is unreadable, and both verdict holds are short** (director, techart, web, physicist (nice))  
   Evidence: strips_276-340.jpg; my slate crop sheet scratchpad/s_s4a.jpg (f278-f302) and s_s4b.jpg; gauge crop s_gauge.jpg.
- f280-f287: the set-down/re-pick hiccup is only a tiny shift of one slate dot plus a faint disc.
- f286: the violet column drops below the ink bar.
- f288: the ✗ pops on with no stamping action.
- f292-f298: the flung ghost is only then a pale, ~translucent hatched disc with faint x eyes. It reads as a lens smudge. There is no splat, no camera shake, and Tick does not visibly duck.
- The ✗ is fully visible f288-f304 and fading at f305 (~17 f).
- The ✓ is growing at f325, full f326-f339 (14 f) and gone at f340, with the whip at f343. The storyboard says ~20 f for each.  
   Fix: Re-time try 1 as cause, then effect:
1. f278-f284: a slate dot visibly sets down into an SLM ring with a small lilac flash and stutter, and the column dips at that frame.
2. f284-f292: the ghost is flung at full opacity, with ink outline, x eyes, spin lines and smear, and splats on the lens for 2 f. Add a 3-4 f camera shake, and Tick ducks with at least 20% squash.
3. f292-f296: the violet column glugs down below the bar.
4. f298: Tick stamps the ✗ with arm anticipation and contact squash, and it holds for at least 20 f.
Stamp the ✓ by about f318 with the same action and hold it at least 20 f before the whip. Push the whip about 6 f if needed.
4. **[major] No GO beat: the race that proves 4.7x has no visible start** (director)  
   Evidence: strips_338-360.jpg and strips_356-404.jpg.
- After the whip (f344-f348), S5 opens at f350 with the rows already amber.
- Tick and its dial are never in frame from f350 to f434.
- Slo is off-frame until its antennae peek in at the bottom-right at f402 (still f0404), and its flag only shows around f420 (overview.jpg).
- The storyboard beat 'Tick clicks; both hands start; Slo sets off at the same moment' is absent. The first view of both hands is f492, mid-race.  
   Fix: Add a 12-16 f GO beat in the card band before the convoy moves. Tick clicks its crown with a lettered CLICK, and both hands sit together at 12. Rook toots, and Slo's POWERMOVE flag springs up as it sets off. Alternatively, keep Tick's dial and Slo's start visible in a corner of the S5 wide while the convoy departs. Take the frames from S1's slow opening.
5. **[major] S3: the verifier-driven correction (the heart of Qubrio) is invisible, and the crash zoom hard-snaps back to the wide** (director, web, techart, physicist)  
   Evidence: strips_186-216.jpg and strips_222-262.jpg; stills f0172, f0214, f0234.
- The zoom snaps out in one frame, f227 to f228 (diff 39.3, then 40.4), which is a hard cut.
- The eraser pencil is about 25 px wide at 1080 (f0234 around x460, y660). It floats detached from Rook: near Loupe at f0172 (~1470,460) and upright near Pip at f0214.
- The erased and redrawn routes are the same thin violet lines, so f228-f250 barely changes.
- The routes are drawn as merged Y-shaped trees (f0200, f0214), so no crossing is ever visible.
- The bumping ghosts are pale translucent discs sitting on top of the real storage atoms (f0214, x450-720, y420-540).
- The objective barrel fills the top ~25-30% of every S3 frame (f0172, f0234).  
   Fix: Stay in the crash zoom through the fix. Frame the flag, Loupe and the two bad routes, and ease out over 6-8 f only when the ghosts re-run.
- Before the bump, draw the two wrong routes as a clear X of two AOD column lines, not merged branches.
- Bring the pencil in 2-3x larger on an arm from Rook's cab. It flips to the eraser, scrubs the X with crumbs, and redraws the routes in amber, so the fix reads as a change of colour.
- Give the ghosts a graphite outline of at least 4 px at 1080, and offset their hover so they clear the real atoms.
- Tilt the camera or raise the objective so its barrel leaves the top of the frame.
6. **[major] Unexplained translucent double-disc sprites drift over the entanglement zone from S5 to S7, including inside the global pulse** (physicist, techart, web, director)  
   Evidence: My convoy crop (scratchpad/s_convoy.jpg) shows them inside the zone at f374-f384.
- f0380: at about x1250-1440, y820-1030.
- f0452, the pulse impact frame: at x700-805, y755-830, under the flood with no bond.
- f0470: at x1450-1585, y935-1030.
- strips_480-496 f480 and f0560: at about x680-770, y575-635.
They read as extra unbonded atom pairs, or two qubits in one trap. They track Slo. They are NOT Slo's breath cloud: the small inked 3-ball breath puff is drawn separately, and both are visible side by side at f480. Slo's cargo meshes are opaque, so the source is unverified.  
   Fix: Find the sprite with a per-object visibility toggle over f356-f560 and delete it. If it was meant as PowerMove signalling, redraw it as opaque grey-lilac on Slo's lane and keep it out of the zone's screen footprint, above all during f434-f484.
7. **[major] Slo and its cargo intrude on shots that are not about it, and blur the 'distance = interaction' grammar** (physicist, director, techart, web)  
   Evidence: - f0040: cream tray atoms stack in front of the front-middle zone partner (~1045-1100, 900-1070).
- f0110: a clump of three overlapping atoms sits on the front-middle r-circle (x900-1110, y670-890). Slo's shell and tray fill the bottom ~30% of the placement shot (f96-f134), so the teaching shot shows a third atom inside a pair's circle.
- f0452 and strips_440-460: the POWERMOVE flag sits bottom-centre of the ZAP! hero frames at 1080 y≈840-930. The 515-wide card ends at ≈903 with its fade from ≈835, so the flag is sliced into half-letters (card.jpg f460).
- f0600: PowerMove's end state is a heap of touching atoms (~530-760, 820-920), which reads as all-to-all crosstalk.  
   Fix: - Tint PowerMove's tray and cargo atoms grey-lilac everywhere, not only on the shell.
- Keep the tray and Slo out of the S1/S2 zone footprint: hide them until GO, or move the tray to a front corner. Raise the S2 elevation to at least 0.40 so no two zone atoms overlap on screen.
- Keep Slo and its flag fully out of the S6 framing (f434-f484).
- Give the drop tray three pair slots spaced more than r apart, so PowerMove ends with the same three separated pairs, only later.
8. **[major] The loop brush wipe holds full cover too long and reads as a flat digital slab (repeat of round 1)** (web, techart, director)  
   Evidence: I measured the violet-cover fraction on prev/p4.mp4: 0.26 at f645, 0.66 at f646, 0.81-0.82 from f647 to f652 (6 full frames), 0.74 at f653 and 0.20 at f654. The storyboard and builder notes allow at most 4 frames. strips_636-664 f648-f652 shows a flat violet field with evenly spaced parallel white hairlines and no bristle, grain or halftone. The card file is rotated to start at f612, so every visitor sees this about 1.4 s in.  
   Fix: Cut full cover to 2-3 f and stagger the strokes so S1 shows through by f652. Give the strokes dry-brush split ends, paper gaps, paper grain, halftone and a misregistered edge plate. Better still, make the wipe a story object: Rook's steam cloud or the 4.7x flag swinging across the lens. Re-run the same measurement and record it.
9. **[minor] ZAP! is clipped at the top of the 515x195 card for the whole pulse beat** (web, director)  
   Evidence: In f0452 the burst tip is at y≈105 and the letter tops at y≈140-160 (1080 scale). In f0470 the letters reach y≈110-150. The 515 crop keeps rows ≈177-903, so the top 20-70 px of Z/A/P are cut; you can see this in card.jpg f460 (515 crop). In the 400 crop, Loupe's lens rim sits under the LIVE pill (card.jpg f460).  
   Fix: Move ZAP! down by about 110 px at 1080, or scale it to about 0.85, so its burst stays within rows 200-835 at both card widths. Shift Loupe about 120 px left in the S6 framing. Re-check crops at f452, f460 and f476.
10. **[minor] Convoy mid-flight: the leading movers pass exactly through the back-row dock positions and look docked with the wrong partner** (physicist)  
   Evidence: My convoy crop (scratchpad/s_convoy.jpg, f374-f400) and still f0380: from f378 to f384 each leading amber mover sits about 0.52 left of a back-row cream partner, e.g. ~(700,525) next to (825,520) and ~(1060,610) next to (1190,600). The gap is identical to a docked pair. Physically this is harmless, since there is no Rydberg pulse during transport. It is a ~6 f misread of the film's own grammar.  
   Fix: Route through a buffer lane, as the paper's convoy uses buffer positions. During the glide, hold the columns at partner_x - 0.95; once the rows reach pitch, contract all columns together to the docks. Add 'min mover-to-non-partner distance > r during glide' to check_phys.
11. **[minor] The 1.3x fidelity columns visually overstate the ratio** (physicist)  
   Evidence: f600, 4x crop (scratchpad/s_gauge600.jpg). Measured above the bulb necks, which is the part the eye compares, the grey column is ≈101 px and the violet ≈140 px at 960 (≈1.38; the physicist measured ≈1.48 on the 1080 still). Only measured from the bulb bottoms is it ≈1.3. The same geometry appears at f330, f620 and f640.  
   Fix: Size the columns so violet = 1.3x grey measured from the visible column base (the top of the bulb), or use flat-bottom columns on a shared baseline. Keep the ink bar exactly at the grey top.
12. **[minor] Whip smears are stroboscopic, and the S3 crash zoom is a stepped push with no blur** (techart)  
   Evidence: My whip sheet (scratchpad/s_whip.jpg) shows discrete stacked copies of the rings and atoms at f268-f269, f346-f347, f432-f433 and f488-f489. In my crash sheet, f200-f203 are four sharp frames at progressively tighter framing with diffs of 42-44 each, and ink speed lines only appear at f204.  
   Fix: Raise the accumulation subframes to 24-32 on whip frames, or add a velocity-aligned directional blur built from the previous and next camera matrices. For the crash zoom, add 2-3 f of radial blur and radial speed lines from f200, with a 1-2 f overshoot.
13. **[minor] Hard pure-black ellipse shadows with no visible caster read as holes in the table and floor** (techart, director)  
   Evidence: - f0040: at (1000,240), (80,470) and (1560,280).
- f0172: at (110,180) and (1790,85).
- S4 floor (strips_276-340): a black oval under the table.
- f0600: at (1510,930), with nothing above it.
The rest of the film uses hatched and halftone cast shadows.  
   Fix: Remove the shadow decals whose casters are off-screen. Render the rest through the hatched ink-violet shadow material, attached to visible legs or posts, never solid black.
14. **[minor] Neighbouring r-circles touch on screen, although S2 claims they never do** (physicist)  
   Evidence: strips_146-160 f146, and f0172 near (560,835) and (900,990): the back-row and front-row circles meet. The world gap is 1.4 - 2x0.65 = 0.10, which is thinner than the ink stroke. This is not physical crosstalk, since the atoms are about 2r apart, but it contradicts the rule the shot teaches.  
   Fix: Raise the zone row pitch to at least 1.6-1.7, so a gap wider than an atom radius shows at 400 px. Update the convoy row stretch to match and re-run check_phys.
15. **[minor] AOD columns are drawn only as short stubs in S5, so the two-axis stretch that never crosses doesn't read** (physicist)  
   Evidence: In strips_356-404 (f358-f404) and f0380, the rows are full-length amber dashes, but the columns are only small '+' marks under each mover. The grid never visibly widens from 1.0 to 1.9 while keeping its order.  
   Fix: Draw the three amber column lines full-length across both mover rows, at the same weight as the rows, so the whole grid visibly stretches in x and z without crossing.

Disputed or downgraded by the consolidator:

- Web: 'card encoder default CRF 22 cannot fit 4 MB; master unmeasured' - not a frame defect, so it is not a must-fix this round. I checked tools/encode_segs.py: --crf-start defaults to 22 with 8 tries, and on failure it exits with 'card did not fit the size budget' rather than shipping an oversized file. The web sizes (4.64 MB at CRF 30) came from re-encoding the lossy preview, not the tool's lossless card source with hqdn3d and veryslow, so they don't predict the real card. Keep it as a process note: pass --crf-start 30 and measure a 1080 chunk of the master before the final.
- Director: 'the violet column's drop is invisible at card size (card f300 vs f330, tubes look identical)'. Web: 'the gauge drop is only about 3 CSS px'. Both are wrong. The violet column falls clearly below the ink bar from f286 to f302 (about 25 px at 960, roughly 10 CSS px at 400) and rises above it f324-f338 (scratchpad/s_gauge.jpg; card.jpg f300 vs f330 differ). The drop also comes before the ✗ (f286 vs f288). The real ordering fault is that the fling (f292) comes after the verdict. That fault is kept in the S4 item.
- Techart: 'the translucent pairs are Slo's huff puffs; redraw the huff as a 3-lobe cloud'. The defect is real (kept) but the diagnosis is wrong. Slo's breath is already a small inked 3-ball cloud, visible separately right next to a double-disc at f480. Slo's cargo meshes are opaque. Redrawing the huff would not remove the sprites, so the source must be found.
- Techart: 'the S3 crash zoom plays as a jump cut'. Overstated: f200-f203 is a 4-frame stepped push, not a single cut. The missing blur is kept as a minor item. The actual hard cut in S3 is the snap out at f227 to f228, which is kept in the S3 item.
- Physicist: the mid-flight wrong-pair contact (f378-f384) 'contradicts the physics'. Downgraded to minor: the Rydberg interaction happens only during the pulse, so passing within r in transit is not a CZ or crosstalk. It is a ~6 f readability issue against the film's own grammar.
- Physicist: touching r-circles 'will read as crosstalk'. Downgraded to minor: touching circles mean the atoms are 2r apart, so no atom is inside another's radius. It only contradicts the storyboard's stated rule and is kept as minor.
- Techart: 'the payoff set is lit flat, with AO-like blotches' as a must-fix. Downgraded to polish: the wall smudges near the window in f600 are faint and don't hurt legibility. The real payoff problems are the missing baseline, occlusion and framing, covered by the payoff item.
- Physicist: '1.3x column reads as ~1.45-1.5x'. The direction is right, but my measurement at 960 (4x crop of f600, above the bulb necks) gives about 1.38. Kept as minor with the corrected magnitude.
- Director: '✓ is up only f326-f338 (~13 f)'. It is 14 full frames (f326-f339, gone at f340). A small numeric slip, folded into the S4 item.
- Not scored, known and fixed after this render: Loupe's lens orientation and TWEET! placement in f190-f262, including the LIVE pill on TWEET!'s '!' (card f214) and TWEET!'s top being cut in the 515 crop, and the opening crane starting too far out (S1 f0-f40 'dead opening').

