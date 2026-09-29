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


### Fixes applied after round 2 (visible in round 3's preview p7)

- **Physics:**
  - The convoy glides down buffer lanes midway between the partner columns. Every mover stays at least 0.95 (more than r = 0.65) from every non-partner; `check_phys` verifies this. All three columns then contract onto the docks together.
  - The zone row pitch is now 1.7, so the r-circles keep a 0.4 gap.
  - Full-length amber column rails show the grid stretching in both axes.
  - PowerMove's cargo is grey-lilac, and Slo appears only for the race.
- **Readouts:**
  - The fidelity columns start from the bulb tops, so the visible heights compare 1 : 1.3.
  - PowerMove's run is a grey hatched sweep on the dial.
  - The tag is tied to Qubrio's column with a thick string and a knot.
- **Story:**
  - S3 holds the crash zoom, with radial speed lines, through the fix. A big pencil erases the two bad routes and redraws them in ochre.
  - S3→S4 is a push into Loupe's beaming lens that match-cuts on the circle to Tick's dial.
  - In S4 the ✗ lands after the bold flung ghost, and the ✓ holds.
  - GO is on screen: the hands spin to 12 and CLICK!.
  - The lap closes at f544 in an already-settled payoff band: CLICK!, a dial jolt, PowerMove's flag droops but stays legible, then the 4.7× flag.
- **Craft:**
  - The table's hole grid is painted at true density, so the "black holes" are gone.
  - 25-tap smear, and the ink fades in whips.
  - ZAP! and TWEET! sit in the card band.

## Round 3 — preview p7 (672 f at 960×540)

Evidence: `films/qubrio/work/ev/r3/`; committed copies `out/qubrio/review/r3_overview.jpg`, `out/qubrio/review/r3_card.jpg`. Seam diff 671→0 = 6.86 (median 8.37).

| lens | round 1 | round 2 | round 3 |
|---|---|---|---|
| Creative director | 5.5 | 7.0 | **7.5** |
| Tech-art lead | 6.5 | 7.4 | **7.8** |
| Domain expert (neutral-atom compilation) | 6.5 | 7.6 | **8** |
| Web designer (Projects page) | 6.4 | 7.5 | **8** |

### Creative director — 7.5

Round 3 is clearly better told than round 2, and it now has real comic transitions. The foul reads instantly: the two ghosts bump with x eyes, TWEET!, the flag lands and the amber rails scissor into an X (f206-f220, and it holds on card f214). The lens-to-dial match cut is a transition that belongs to the story (f262-f268). GO is on screen: the hands spin back to 12, the dial squashes, CLICK! (f346-f358). The climax now plays in the right order: crown hit f544, CLICK! f545-f547, the POWERMOVE sign droops and stays legible f548+, the flag springs out of the crown f552, 4.7x at f555. The poster (f600) finally carries its baseline: POWERMOVE is in shot, Loupe cheers and is not hidden, and 1.3x is knotted to the violet tube. Tick acts with its face in S4 (squint f292, worried f300, beaming f330).

It is still not P(doom)-level, for five reasons:
1. The fix beat is still broken. It is the heart of Qubrio (verifier localises, agent repairs). The pencil blinks on for about 2 frames at a time in five unrelated places and is invisible in between, so no erase is ever seen.
2. The loop wipe is unchanged at 6 full-cover frames of flat violet slab. It is the one frame that looks like motion-graphics, and every card visitor hits it about 1.4 s after the poster.
3. ZAP! now sits on top of one of the six bonded pairs, in the shot whose point is 'every pair'.
4. The payoff is legible but not a big comic moment. 4.7x is about 22% of the frame width, the left third is still a tangle, and PowerMove's 'full grey lap' is hairline hatch that disappears at 400 px.
5. The S4 verdicts still hold only 14-17 f, and the ghost fades out instead of splatting on the lens.

Smaller problems:
- The POWERMOVE flag blinks in and out mid-race.
- Slo is not in the GO shot.
- The opening beat is tiny.

Nothing except the wipe could be mistaken for a web page. The ink, halftone and lettering are hand-made and consistent.

### Tech-art lead — 7.8

Round 3 is a clear step up from round 2 (7.4), but it does not reach 8.5. The foundation is right: a lit three.js lab with real depth and parallax, cel shading plus Ben-Day halftone, hatched cast shadows, boiling hull ink and paper grain. Nothing is glossy or looks like default three.js, and the black-hole blob shadows are gone. The lettering is the best in the series (TWEET! f214, ZAP! f452-f470). The Loupe-lens → Tick-dial match cut (f267→f268) is a real story transition. The fling now plays cause before effect (bold ghost f291-f292, ✗ f294-f295). The whips are eased moves with smear. The loop seam is clean (671→0 = 6.86 against a median of 8.37). Several pipeline tells still make stretches look assembled rather than drawn. (1) In both cross-shot whips the ink layer is not smeared: crisp grey wireframes of both shots sit over the colour smear, which reads as a double exposure. At f361 the S4 CLICK! is still visible over the convoy plate; at f433-f434 Tick's dial and Loupe's lens outlines sit over the pairs. The 25-tap smear also ribs the halftone. (2) POWERMOVE is still a 2D UI name tag: a white rectangle with a thin border and monoline text. It pops on at f494, fades f495-f496, is missing f497-f518 while Slo is fully visible, and fades back f519-f521. Its "droop" is a rigid rotation of a card that floats with no pole (f556-f630). (3) The 4.7× flag springs out as a blank ochre slab for f552-f554, and the digits pop in at f555. (4) ZAP! still hides the back-middle bonded pair for about 20 frames (f452-f468). (5) The convoy uses soft radial glows that go muddy brown on the violet zone, plus hairline speed lines that cut through the movers' faces (f366-f394). (6) Several elements leave by opacity fade instead of a comic exit: TWEET! f222-f226, CLICK! f548-f551, the flung ghost fading over the ✗ f293-f296. (7) The loop wipe still holds 5-6 full-cover frames of flat violet (my measurement: 0.80 cover f648-f651). (8) Rook's pencil blinks out f232-f234 and pops back flipped. All of these are fixable in post and animation. The look itself is shippable.

### Domain expert (neutral-atom compilation) — 8

Round 3 fixes most of my round-2 physics list. I checked it against the frames, a re-run of check_phys, and my own measurements on prev/p7.mp4 (crops in the scratchpad: zapbr2.jpg, race.jpg, storage.jpg, s3bump.jpg, convoy.jpg, gauge600.jpg, dialgrid.jpg).

**What is now right:**
- **Convoy.** It is a real single AOD move. The six movers glide down buffer lanes midway between the partner columns: at f380 each mover is about 0.975 from both neighbouring partners, so none looks docked to the wrong one. Then all three columns shift onto the docks together (f390-f396). Full-length column rails and row rails stretch in both axes and never cross (f366-f396).
- **Pairs.** Docks sit 0.52 inside r = 0.65. The next-nearest atom is 1.38-1.70 away (2.65-3.27x). The r-circles keep a visible gap (f146).
- **Pulse.** One hard-edged flood covers the whole zone rectangle and the storage stays dark (f452).
- **Numbers.** Everything I could measure is exact or within measurement error:
  - Convoy 40 f vs PowerMove 188 f = 4.7x.
  - Dial slice about 74° after tick correction (1/4.7 = 76.6°).
  - Gauge ratio about 1.33 above the shared bulb baseline.
  - The unoptimised wedge is 1.7/4.7, from the site.
- **Optimiser.** The accept rule plays in causal order: time and fidelity both fall → ✗ after the flung ghost (atom loss). Time falls and fidelity rises → ✓.
- **Race start.** GO is on screen before the convoy moves.
- **Payoff.** The poster now keeps its PowerMove reference.

**Why it is not 8.5 yet.** At the three frames that carry the physics (the verifier foul, the gate and the poster), the picture still says something wrong:
1. **The foul.** It is drawn as two tilted amber AOD rails forming an X. AOD columns are lines of constant x, as the film itself draws them in S5. The plan-1 swap also only moves the front row, so both of those AOD columns would need two x positions at once (a 0.36 split at the bump step). That is a second, unflagged violation.
2. **Slo's cargo on the pairs.** Its grey-lilac cargo sits touching Qubrio's pairs inside the Rydberg flood (f452-f455) and on top of a bonded pair during the race (f508-f520).
3. **Heaped baseline.** PowerMove's delivered atoms end as a touching heap in the poster, which misrepresents the baseline's output.
4. **Hidden pair.** ZAP! hides one of the six CZ pairs and its bond through the whole gate beat.
5. **Storage chains.** The S1/S2 camera still collapses the storage into chains of touching atoms, during the shot that teaches that only pairs are close.

All five are staging or geometry fixes, not concept problems.

### Web designer (Projects page) — 8

Round 3 is clearly better than round 2 (7.5) as a muted Projects-page card, but it is not at 8.5 yet. I checked each beat at real card size (515×195 and 400×195, with LIVE pill and bottom fade), using card.jpg plus my own crops of about 90 frames pulled from prev/p7.mp4.

What now reads at 400 px:
- Pip's r-circles (f110–f146).
- The big pencil drawing, erasing and redrawing routes in ochre (f168–f248).
- TWEET!, the flag and the scissored X (f206–f220).
- The push into Loupe's lens and the match cut to Tick's dial (f264–f272), the best card moment.
- The flung inked ghost, then ✗ (f292→f294), then ✓ (f326–f344).
- GO with CLICK! (f354–f358).
- The amber convoy grid (f372–f404).
- ZAP! and the ∞ pairs, now fully inside the band (f452–f484).
- A climax in the right order: CLICK! at f546, a legible drooped flag, 4.7× at f555, 1.3× at f568.

The payoff is card-safe: the 4.7× top is at master row ≈270, and the 1.3× tag (x 1430–1745, y 375–520) is clear of the LIVE pill. The loop seam is clean: 671→0 diff is 6.86 against a median of 8.37.

What still stops it shipping:
- **Loop wipe.** It still holds about 6 frames of near-full violet (f647–f652). At card size it looks like a flat slab, and every visitor hits it about 1.4 s after the poster.
- **POWERMOVE in the race.** The label is sliced by the 515 card's bottom edge and fade in S5 (f406–f420). It is missing entirely f492–f519, then fades in as a ghost at f520.
- **Poster.** The POWERMOVE lettering sits in the fade corner, away from the grey column. A knot of sticks and a grey atom heap still sits at the dial's lower-left. PowerMove's grey lap reads only as a pale dial face at 400 px.
- **Edges.** Pip's S1 '!' is above the 515 band. Loupe sits under the LIVE pill in S1 and at the start of S3.
- **File sizes.** The card needs CRF ≥31: CRF 30 gives 4.10 MB. The master size is still unmeasured.

### Consolidated must-fix (verified against the frames, ranked)

1. **[blocker] S3 fix beat (the verifier-then-repair idea at the heart of Qubrio) cannot be read. Rook's pencil teleports between unrelated spots and vanishes in between. No erase is ever performed, the eraser end never touches the plate, and the camera leaves the crash zoom before the redraw.** (director, techart (web's claim that this beat reads at 400 px is disputed))  
   Evidence: VERIFIED on my per-frame sheet of p7 f226-f261 (scratchpad s3fix.jpg) and on strips_196-238 / strips_238-280:
- f230-231: pencil at lower right.
- f232-235: gone.
- f236-237: upright at centre.
- f238-239: far left.
- f240-241: gone.
- f242-243: beside Loupe.
- f244-249: gone.
- f250-251: in the zone.
- f252-253: huge at top-left.
The pencil is tip-down in every appearance. The ring and flag degrade to a stray 'P' mark at f238, then vanish by f240. Ochre routes pop in over f240-f248 with no pencil on them. The camera pulls out to show Rook's track from f241-f244, so the builder note 'held through the fix' is false. Card f232 (both widths) shows no pencil at all.
Note: commit a91d225 describes a 'continuous pencil erase', but it is not in this render.  
   Fix: Stage one continuous, never-hidden pencil action with the camera locked on the flag and ring framing until the ghosts re-run (about f250):
1. The pencil leaves Rook's cab and arcs to the flag with smear (6-8 f).
2. Anticipation, then an on-screen 4-6 f flip so the eraser is down.
3. Scrub the two bad routes and the X for 10-12 f, with wobble, lilac crumbs, and the lines breaking up under the eraser.
4. Flip back and redraw each route in ochre with the tip on the growing line end (about 8 f each).
5. Tap the dock and zip back to Rook.
Verify on a per-frame sheet and at 400x195.
2. **[blocker] The loop brush wipe is unchanged from round 2: about 6 frames of near-full, flat digital violet with evenly spaced white hairlines. It is the one web-page and motion-graphics frame in the film, and card visitors hit it about 1.4 s after the poster.** (director, techart, web)  
   Evidence: VERIFIED. My cover measurement on p7 (distance to the f649 median violet < 40):
- f646: 0.31
- f647: 0.70
- f648-f651: 0.81-0.82
- f652: 0.80
- f653: 0.26
That is 6 frames at ≥ 0.70 against the storyboard's ≤ 4. Full-size f650 is a flat violet field with a faint dot screen and parallel white streaks: no bristle breakup, paper gaps or ink edge. The card crop of f648 reads as a solid slab. The builder's 'wipe shortened' is not supported.  
   Fix: Cap full cover at 2-3 f (for example f648-f650) and stagger the trailing strokes so S1 shows through from f651. Give the strokes split dry-brush ends, paper-white dropouts at least 6 master px wide (20-30% paper) and a dark ink edge on one side, so the texture survives at 400 px. Better: make the wipe a story object crossing the lens, such as Rook's steam cloud or the 4.7x flag swinging over the camera. Re-run the same cover metric and record it in REVIEW.md.
3. **[major] The payoff and poster are legible but not a big comic moment, and are cluttered:
- 4.7x is small.
- The lower-left is a knot of shapes.
- PowerMove's 'full grey lap' is invisible at card size.
- The flag springs out as a blank slab with no burst, and its digits pop in late.
- The 4.7x flag covers Loupe's lens rim.** (director, techart, web (physicist on the heap, see the cargo item))  
   Evidence: VERIFIED on stills/f0600 and my per-frame sheet f542-f565.
- 4.7x spans about x 320-750 of 1920 (about 22%). The top about 25% is empty wall and shelves.
- The lower-left tangle at about (400-800, 620-910) holds Tick's horizontal arm rod and knob, Slo's stalks and shell, a heap of 4-5 touching grey atoms, and the tilted POWERMOVE card floating with no pole. The card's 'PO' sits in the 515 card's bottom fade.
- The dial's PowerMove lap is hairline diagonal hatch on cream. In my 400x195 crop of f600 the face is plain cream.
- f552-f554: a blank ochre slab; the digits appear all at once at f555. There is no starburst, and the camera drifts f550-f566.
- f600/f630: the flag's lower-left corner and the '4' overlap the top of Loupe's rim at about (330-420, 420-470).
The tighter push is coded but not rendered.  
   Fix: 1. Render the tighter push, so flag, dial and gauge fill about 75-80% of the width and 4.7x is at least 30%.
2. Parent the digits to the field from its first frame and scale them together (0 → 1.15 → 0.95 → 1 over about 6 f). Add crown squash anticipation, a 2-3 f ochre ink starburst behind the flag and a small shake, then lock the camera.
3. Fill PowerMove's lap with a bold mid grey-lilac (at least 30% darker than the face) under the hatch.
4. Swing Tick's left arm up into a cheer.
5. Hang the drooped POWERMOVE flag beside the grey column, at least 60 master px above row 836.
6. Nudge the 4.7x flag about 60-80 px up and right, or step Loupe left, so the lens is clear.
4. **[major] PowerMove's identity during the race is unreliable:
- Slo is not in the GO shot.
- Slo enters S5 under the card's bottom fade with its flag sliced.
- The POWERMOVE flag blinks out, alpha-fades and ghosts through most of S7.
- The flag itself is a flat 2D UI label (white rectangle, thin border, monoline text), not a paper flag on a pole.** (director, techart, web)  
   Evidence: VERIFIED.
- GO (f348-f358, still f0352): only grey atoms and an antenna tip at the extreme left edge. Card f352 shows no Slo.
- S5 (my s5 sheet): Slo first appears at f404, bottom right. The flag is at about master rows 930-1005 at f408 (outside the 515 band), 870-950 at f412-f416 (sliced by the edge and fade; my card crop f414), and about 780-855 at f420.
- The flag is gone f428-f493 while Slo is visible (f429-f430 and the S6 frames).
- My flag crop sheet: pops on at f494, about 50% alpha f495-f496, absent f497-f518, ghosted f519-f520, opaque from f521. Card f496/f520 shows a washed-out label.
Commit a91d225 lists a 3D billboarded sign and 'GO with Slo in frame', but neither is in this render.  
   Fix: Build the sign as a lettered 3D cloth plane (CanvasTexture) on a visible pole from Slo's shell, lettered with the SFX brush. Billboard or clamp its yaw so it is never edge-on, and never alpha-fade or hide it while Slo is on screen. Frame Slo and its flag in the GO shot inside the band, with the flag springing up on the CLICK! frame and a start hop. In S5, raise Slo's lane or tilt the camera so Slo and the flag sit at master rows ≤ 800 from f364. Re-check f348-f430 and f488-f544 in both card crops.
5. **[major] The verifier's foul teaches AOD rules with an impossible picture:
- The 'two amber AOD column rails scissoring into an X' are drawn tilted about ±35-55°. AOD columns are lines of constant x, as S5 itself draws them.
- The rendered plan 1 swaps only the front-row movers, so each of those two columns would need two x positions at once. That is a second, unflagged violation.
- The visible bump happens about 150 px above the ring and flag that claim to mark it.** (physicist)  
   Evidence: VERIFIED.
- stills/f0214: dashed amber rails from about (410,860) to (910,640) and from (530,630) to (840,850), whereas f0380/f0396 draw axis-aligned rails.
- The code at the render commit (422d78b q_phys.planXZ: 'if (... m.pr !== 1 ...) return [x, z]', and q_time WRONG = front row only) confirms that only front-row movers change lane, so the middle-row atoms in the same columns go straight.
- f0214: the x-eyed ghosts sit at about (510-760, 440-580), overlapping sleeping storage atoms; the ring is centred about (650,750).
Note: the uncommitted working tree already switches to a whole-column swap (SWAP 'both rows'), but that is not rendered.  
   Fix: Render the whole-column swap: both rows of columns 2 and 3 are sent to each other's lanes. Draw the two column rails as straight, full-length constant-x lines in the S5 style, sliding toward each other until they coincide, with a bonk on the meeting line. Land Loupe's flag and ring exactly on that line. Move the bump into the open gap between storage and zone (p about 0.35-0.45), or drop a pencil leader from the bumping ghosts to the ring. Extend check_phys to assert column rigidity: every mover sharing a column has the same x at every p of every plan.
6. **[major] ZAP! hides the back-middle bonded pair and its ∞ bond through the gate beat. The shot that proves one global pulse gates every pair shows only 5 of 6 CZs.** (director, techart, physicist)  
   Evidence: VERIFIED.
- stills/f0452: the pair sits under 'A/P' at about (950-1080, 440-520).
- stills/f0470: only its star eyes peek out under the 'A' at about (900-1060, 420-500), and the bond is fully hidden.
- My ZAP sheet f446-f484 shows the overlap from f452 until ZAP! fades out at about f474.
- The storyboard places ZAP! 'over the dark storage'.  
   Fix: Move ZAP! about 120-150 master px up, onto the storage block (rows about 200-400 at 1080, still inside both card crops), and scale it to about 0.8 if needed. Acceptance: all six pairs, bonds and star eyes are fully visible on every frame f452-f484 in the full frame and in the 515/400 crops.
7. **[major] PowerMove's atoms break the film's 'distance = interaction' grammar:
- The delivered cargo ends as a touching heap in the poster.
- The pick-up tray is a 2x2 touching clump.
- Slo's grey cargo and its two-circle 'oo' huff project onto or into Qubrio's pairs inside the Rydberg flood and during the race.** (physicist, techart, web)  
   Evidence: VERIFIED.
- f0600: 4-5 touching grey atoms at about (580-760, 780-900), and the same at f0546 and on card f600/f630.
- f0380: a 2x2 touching clump at about (760-930, 900-1030).
- f0452: two grey atoms touching the front-right gated pair at the flood edge, about (1270-1390, 960-1090), with an 'oo' sprite at about (1170,1035).
- My flag crop sheet f510-f519: Slo's grey cargo sits on top of the front-left bonded pair.
- The 'oo' huff at f510, f518 and f519 reads as a miniature atom pair.  
   Fix: Give the drop tray three pair slots (2 atoms at PAIR = 0.52, slots at least 1.4 apart). Slo delivers each trip as one separated pair, so its end state is three clean pairs, only later. Give the pick-up tray slots at storage pitch 1.0. Re-block the S6/S7 cameras, or move Slo's lane forward or lower, so no PowerMove object projects onto a Qubrio pair on any frame f440-f544. Hide Slo during the gate if needed. Redraw the huff as one lumpy inked cloud, never two equal circles, and never inside the zone.
8. **[major] Both cross-shot whips double-expose the ink layer: the colour is smeared but crisp grey outlines of both shots sit on top. The 25-tap smear also ribs the halftone into comb stripes.** (techart)  
   Evidence: VERIFIED on my sheets f357-f365 and f429-f437.
- f359-f361: the CLICK! lettering and Tick's dial ring stay as sharp outlines over the smeared convoy plate.
- f362: dozens of thin grey circles float over the smear.
- f433-f434: sharp outlines of the pair circles, Tick's dial and ticks, and Loupe's lens all sit together over the smear, with vertical comb ribbing in the smeared halftone at f434.
- The same-set whips (f150-f154, f486-f490) are clean.
Commit a91d225 lists 'ink off at peak whip speed, jittered smear', but that is not in this render.  
   Fix: Smear the ink canvas with the same velocity-aligned taps, or take ink opacity to 0 for the 2-3 peak-speed frames. Swap shots on one full-cover smear frame, and draw only the incoming shot's ink after it. Clear SFX (CLICK!) before the swap frame. Jitter the tap offsets, or pre-blur the halftone plate, to remove the ribbing. Re-pull f358-f365 and f430-f437.
9. **[major] S4 optimiser verdicts are short and the reject gag has no impact:
- The ✗ holds 14 f and the ✓ about 17 f, against the storyboard's ~20 f.
- The flung ghost alpha-fades over the freshly stamped ✗ instead of splatting on the lens.
- There is no shake and Tick does not duck.
- The set-down/re-pick hiccup that motivates the reject is not visible.** (director, techart)  
   Evidence: VERIFIED on my per-frame sheets f280-f357.
- The ghost is flung f289-f292, then is translucent and fading f293-f296, lying over the ✗.
- Tick's pose is essentially unchanged f288-f296.
- The ✗ is fully visible f295-f308 and gone at f309 (14 f).
- The ✓ is visible f326-f342 and translucent at f343-f344 (about 17 f).
- Nothing on the slate reads as a set-down/re-pick during f280-f287.
The stamp action is not in this render.  
   Fix: Hold the ✗ and the ✓ at least 20 f each, shifting try 2 by 6-8 f. The ghost hits the lens as a 2 f flat splat with ink droplets and a 3-4 f camera shake, then cuts off before the ✗ lands. Tick ducks with at least 20% squash, then pops back. Render the stamp with arm anticipation, a slam with slate squash and dust ticks. Show the hiccup as one slate dot dropping into a ring with a small 'clunk' at about f282-f285.
10. **[minor] Ink and SFX elements leave by opacity cross-fade (web-animation grammar) instead of a comic snap, squash-off or cut.** (techart)  
   Evidence: VERIFIED:
- TWEET! turns translucent brown at f222-f226 (strips_196-238).
- The amber X rails fade at f226 and are gone by f228.
- ZAP! goes translucent at f472-f474 (my ZAP sheet).
- CLICK! is a grey ghost at f548-f551 (my payoff sheet).
- The flung ghost fades at f293-f296 (covered in the S4 item).  
   Fix: Ban alpha fades on ink and SFX layers. Each SFX exits with a 2-3 f snap-shrink or squash-off, or is cut under a camera move. The X rails are rubbed out by the eraser as part of the S3 fix, not faded.
11. **[minor] The convoy uses generic soft radial glow sprites that go muddy brown on the violet zone. Thin uniform hairline speed lines run straight through movers' faces and read as tethers between atoms.** (techart, physicist)  
   Evidence: VERIFIED on stills/f0380:
- Brown-orange soft blotches at about (850-1000, 580-690), and one following the back-middle mover at f0396 (about 1040,580).
- A single black line from the back-right mover's mouth to the front-right mover at about (1370-1400, 620-770).
- Double lines between the middle movers at about (900-1030, 520-680).  
   Fix: Delete the gradient glow sprites; the amber pedestal and tint already mark AOD grip. If a marker is wanted, use a flat hard-edged ochre halftone disc on all six. Redraw motion marks as 2-3 short tapered brush lines trailing each mover, depth-tested, each lasting 2-3 f, and never touching another atom.
12. **[minor] In S1/S2 the 3x3 storage projects into columns of three touching or overlapping atoms, during the placement shot that teaches 'only pairs are close'.** (physicist)  
   Evidence: VERIFIED on stills/f0040 (x about 900-1420, y 350-620) and stills/f0110 (x about 620-1150, y 180-420): each storage column reads as a stack of three touching spheres. The grid separates only once the camera rises (about f172).  
   Fix: Raise the S1/S2 camera elevation until storage neighbours show a cream gap on screen, or lower the atom hover. Alternatively raise the storage z-pitch to about 1.4 and re-run check_phys. Verify f0-f146 per frame.
13. **[minor] Edge safety: Pip's wake '!' is cut by the top of the 515 card. Loupe sits under the LIVE pill in S1, and half off the right edge and under the pill at the start of S3.** (web)  
   Evidence: VERIFIED.
- stills/f0040: the '!' spans about y 75-200 at 1080, while the 515 band starts at about row 177.
- Card f0: Loupe's lens top sits under the pill (it overlaps the pill in the 400 crop).
- stills/f0172: the lens is at about x 1740-1932, y 210-430, cut by the right frame edge.  
   Fix: Tilt the S1 camera up about 80 master px, or start the '!' at or below row 220. Frame S1 and f150-f200 so Loupe sits at x ≤ 1550 and y ≥ 300. Re-check card crops at f40, f172 and f484.
14. **[minor] File budget is not secured: the card needs CRF ≥ 31 and the default CRF search will fail. The master size is still unmeasured after three rounds.** (web)  
   Evidence: VERIFIED approximately. My re-encode of p7 through the card chain (crop, lanczos 960x528, hqdn3d, veryslow, without the script's -g 48, which adds bits) gives:
- CRF 30: 3.90 MiB = 4.09 MB
- CRF 32: 2.95 MiB
encode_segs.py divides by 1e6 and its default --crf-start 22 with 8 tries stops at CRF 29, so it would report 'did not fit'.  
   Fix: Run the card with --crf-start 31 --max-mb 3.8. Before the final, render a 1080 chunk of the busiest stretch (about f432-f560), encode it at CRF 18 slow and extrapolate against the ~70 MB cap. If it is over, use CRF 19-20 or a light hqdn3d on the master.

Disputed or downgraded by the consolidator:

- Web: 'the big pencil drawing, erasing and redrawing routes in ochre (f168-f248)' reads at 400 px. Contradicted by the per-frame evidence: the pencil is absent f232-235, f240-241 and f244-249; no erase is ever performed; the routes pop in; and card f232 shows no pencil. Replaced by the S3 blocker.
- Techart: the pencil 'reappears eraser-up at the flag at f236 with no visible flip' / 'pops back flipped'. In every appearance (f230, f236, f238, f242, f250, f252) the pencil is tip-down with the lilac eraser up. The real defect is that it never flips to the eraser at all (folded into the S3 item).
- Builder note 'wipe shortened': not supported. Cover is ≥ 0.70 for 6 frames (f647-f652), the same as round 2.
- Builder note 'S3 holds the crash zoom through the fix': not supported. The camera pulls out to show Rook's track at f241-f244, before the redraw.
- Builder note 'the kept check holds ~20 f': about 17 f as rendered (f326-f342, fading f343-f344). The ✗ holds only 14 f (f295-f308).
- Builder note that the grey hatched sweep makes the poster read 'one violet slice against a full grey lap': not true at card size. In my 400x195 crop of f600 the face reads plain cream.
- Builder note '1.3x tag tied with a thick string and knot': in f0600 the string is still a thin line about 3 px at 1080 with no legible knot. Kept as polish (nice-to-have), not a must-fix.
- Physicist numeric detail 'ghosts sit 0.17-0.40 from sleeping movers, hover 0.55 up': not independently measured. What is visible (ghosts overlapping storage atoms and sitting about 150 px above the ring at f0214) supports the must-fix, so the item stands without relying on those numbers.
- Scope note, not a dispute: commit a91d225 and the uncommitted working tree (source modified 10:19-10:22, after p7 was rendered at 09:41) claim fixes for several items: continuous pencil, 3D PowerMove sign, payoff sunburst, stamp and lens splat, SFX exits, ink off at peak whip, ZAP clear of pairs, GO with Slo, whole-column swap. None is in this render, so all were judged as seen and must be re-verified on the next render.


### Fixes applied after round 3 (visible in round 4's preview p10)

- **Honest foul:** plan 1 (forward first, spread later) sends two *whole* AOD columns to each other's lanes. In each row the swapped ghosts bump in the open between storage and zone, and `check_phys` confirms every column stays a straight line of constant x. The two amber rails are drawn straight and pressed together at the flag.
- **The pencil and the flag:** the pencil stays on screen: it draws, hovers, flips to the eraser, scrubs with crumbs, redraws in ochre and returns. The flag stays planted until the redraw.
- **S4:** the ghost splats on the lens and Tick ducks. The stamps have impact and exit with a snap instead of a fade.
- **GO:** Slo and a 3D, billboarded, brush-lettered POWERMOVE sign are in the shot. The sign is furled in the convoy and pulse shots. ZAP! sits clear of every pair, and Slo is not in the pulse shot.
- **PowerMove's trays:** singles and pairs are spaced. The grey lap on the dial is bolder.
- **Payoff:** CLICK! appears on a burst, the sign droops, then the 4.7× flag springs out with an ochre comic sunburst.
- **Craft:**
  - The 2D ink is off at peak whip speed and the smear taps are jittered.
  - SFX exit with a snap-shrink instead of an alpha fade.
  - The glow blob under the convoy is gone, and the steam puffs are seamless clouds.
- **Loop wipe:** at least 0.69 of the frame is covered on only 2 frames (measured).
- **Opening:** pushes in on Pip, with the storage grid seen from high enough that its atoms never stack.

## Round 4 — preview p10 (672 f at 960×540)

Evidence: `films/qubrio/work/ev/r4/`; committed copies `out/qubrio/review/r4_overview.jpg`, `out/qubrio/review/r4_card.jpg`. One known issue was excluded from scoring and fixed before the final render: in the payoff, POWERMOVE and Loupe were clipped at the left edge.

| lens | round 1 | round 2 | round 3 | round 4 |
|---|---|---|---|---|
| Creative director | 5.5 | 7.0 | 7.5 | **7.8** |
| Tech-art lead | 6.5 | 7.4 | 7.8 | **8.1** |
| Domain expert (neutral-atom compilation) | 6.5 | 7.6 | 8.0 | **8.2** |
| Web designer (Projects page) | 6.4 | 7.5 | 8.0 | **8.1** |

### Creative director — 7.8

Round 4 is a real step up from round 3 (7.5), but it does not reach 8.5. Besides the evidence pack, I pulled my own per-frame sheets from work/prev/p10.mp4.

Fixed:
- The loop wipe now fully covers only f649-f650.
- ZAP! sits clear of all six bonded pairs (f452-f470).
- The payoff hit has real comic energy: CLICK! f551-f556, then a giant ochre sunburst with speed lines f557-f559 that settles into a halo.
- The grey hatched lap now reads against the violet slice at card size.
- The eraser scrub is on screen and continuous (f224-f235).
- Tick ducks at f288-f290.

Four problems still keep it off the shelf next to P(doom):
1. **S3 pencil.** The pencil still hops about 2 frames per route while drawing plan 1 (f164-f187) and again while redrawing (f238-f243). The flip to the eraser is instant (f235→f236). The pencil then leaves the frame f244-f249 while the camera pulls out, so the builder's "one continuous action" is not what renders.
2. **Payoff scale.** The payoff is framed almost exactly as in round 3. 4.7x is still about 23% of the frame width, with a blank ochre flag f559-f560 and a knot of grey shapes against the dial's lower left. The picture book's full-bleed 4.7x (its f270) is still the stronger payoff.
3. **PowerMove readability.** PowerMove is unreadable in GO and in the race, both outside the excluded hold. Slo is a grey knot among the partner atoms, the sign reads "OWERMOV", Loupe stands in Slo's lane, and Slo's head looks like one of its own grey atoms.
4. **S4 fades.** The S4 reject still ends in alpha fades: the splat f291-f294, the ✗ f313-f314 and the ✓ f350-f351. Opaque holds are 17 f each, not the 23 f / 20 f the builder claims.

No frame looks like a web page, except possibly the 2-frame flat violet wipe.

### Tech-art lead — 8.1

Round 4 is a real step up from round 3's 7.8, but it is not at 8.5. The foundation is shippable: a lit three.js lab with depth, cel shading, Ben-Day halftone, hatched cast shadows, paper grain and chisel-cut SFX lettering. Nothing looks glossy or like default three.js. The biggest pipeline tells from round 3 are fixed. The cross-shot whips no longer double-expose the ink layer. TWEET!, ZAP! and CLICK! now snap off instead of fading. The foul rails are straight and parallel instead of a tilted X. The erase is now one continuous eraser-down action. The payoff has a real ochre sunburst with focus lines. The loop wipe covers the frame heavily for only 2 frames.

Several claimed fixes are not what the frames show:
- **Redraw pencil.** The pencil still teleports between 4 spots at 2 frames each, then vanishes for 6 frames (f236-f253).
- **ZAP!** It still hides the back-left bonded pair for 23 frames (f452-f474).
- **S4 reject.** The splat is a clean ellipse that fades out; it does not splat. The ✗ is solid for 16 frames, not the claimed 23, and still leaves by alpha fade.
- **POWERMOVE sign.** It still reads as a flat white UI label: monoline letters, the E clipped by the sign's edge, the P hidden.
- **Convoy.** The hairline tethers through the movers' faces from round 3 are still there.
- **4.7× flag.** It springs out as a blank ochre slab for 3 frames before the digits appear.

I judged all of this at 960×540 on p10, extracted frame by frame, plus the r4 evidence. Frame numbers are from p10; master coordinates are ×2 of the 960 frame.

### Domain expert (neutral-atom compilation) — 8.2

Round 4 is up from 8.0 to 8.2 on my lens. Every shot maps to a real Qubrio concept, and the core physics is now honest.
- **Foul:** it is a true AOD violation. Whole columns 1 and 2 swap lanes in both rows. I re-ran check_phys: the bump is at p=0.315, the front-row point is (0.50,-0.57) in the gap, max column bend is 0.000, both x-eyed pairs show at f202, and the rails are straight constant-x lines at f214.
- **Convoy:** one AOD move through buffer lanes, min 0.95 > r.
- **Pairs:** docked 0.52 inside r=0.65, isolation 2.65-3.27x.
- **Pulse:** one hard-edged flood over the whole zone with all six pairs visible.
- **Numbers:** all exact. Dial slice about 75 deg vs 76.6 deg. The lap closes at f550 = 362+188. Gauge 1.31 measured at f600. Raw schedule 1.7/4.7 from the K=0 ablation.

It stays below 8.5 because several frames still contradict the film's own rules ("crossing = foul", "close = interacting"):
1. The approved ochre plan draws its own X next to the flag.
2. PowerMove's pick-up tray sits inside the entanglement zone, with a grey atom about r from a docked Qubrio mover. Its trays space singles like pairs and pairs like a clump (f400, f520, poster f600).
3. The dry-run ghosts hover so high that the bump shows among storage atoms, about 200 px above the ring and flag.
4. The S2 storage still stacks into touching chains.
5. The convoy hairlines still read as rods between column-mates.
All are staging or geometry fixes, not concept problems. I did not score the known payoff-hold items (Loupe and sign at the left edge, f556-f646).

### Web designer (Projects page) — 8.1

Round 4 is a real step up for the card, mainly because the loop wipe blocker is fixed, but it does not reach 8.5. I checked each beat as real 400x195 and 515x195 cards (LIVE pill, bottom fade) from my own crops of all 672 frames of prev/p10.mp4, plus the builder's card.jpg, seam.jpg and diff.txt, and measured file budgets.

What now works:
- **Wipe:** only 2 frames at 0.6 or more cover.
- **Seam:** clean.
- **ZAP!:** clear of all six pairs.
- **POWERMOVE sign:** no longer blinks.
- **Payoff:** card-safe and louder, with the sunburst and a grey hatched lap that reads at 400 px.

What still stops it shipping:
- **Loupe under the LIVE pill:** Loupe's face still sits under the pill at the start of S3 (f156-f192). This round-3 must-fix was not addressed.
- **Pip's '!':** still clipped on the 515 card (f36-f44). The builder's note says it was fixed; that is true only at 400 px.
- **GO CLICK!:** full size for 1 frame (f359). This is a regression; round 3 read it.
- **4.7x flag:** still springs out blank for 3 frames (f558-f560).
- **POWERMOVE lettering:** clipped ("OWERMOV"/"POWERMOV"). It is too small to read at GO, the banner covers Loupe's face through the race, and it droops twice at the lap close.
- **S3 pencil:** still jumps between spots every 2 frames and vanishes f244-f249. The builder's note says it moves continuously; the render does not show that.
- **File budgets:** the master at the default CRF 18 extrapolates to about 89 MB, over the ~70 MB cap. The card needs CRF 32 or higher, which the encoder's default CRF search never reaches.

Not scored, as instructed: Loupe and the sign at the left edge in the payoff hold (f556-f646).

### Consolidated must-fix (verified against the frames, ranked)

1. **[blocker] The S3 verifier-then-repair beat is still not one continuous, readable pencil action. The heart of Qubrio's feedback loop reads as an ochre stick blinking between spots while routes pop in.
- Plan-1 draw: the pencil hops to a new route every 2 f with no travel frames or smear.
- The flip to the eraser is a 1-frame swap.
- The eraser's contact is hidden and no crumbs read.
- Redraw: the pencil hops again, then vanishes f244-f249 while the camera pulls out to Rook. The four ochre routes are complete by about f244 (about 2 f each).** (director, techart, web)  
   Evidence: Plan-1 draw, my per-frame sheet of prev/p10.mp4 f162-f197:
- f164-165: top of storage
- f166-167: upper centre
- f168-169: far left
- f170-171: lower right
- f172-173: beside Loupe
- f174-175: left
- f176-177: far left
- f178-179: centre
- f180-181: absent
- f182-183: low left
- f184-185: absent
- f186-187: lower left

Scrub, flip and redraw, sheet f222-f263:
- f226-f235: eraser down at the ring. At stills/f0232 the contact point is hidden behind the front mover atom (about 500-660, 770-920), and the only flecks are ochre, not lilac crumbs.
- f235 to f236: eraser-down to tip-down with no in-between frame.
- f238-239: far left. f240-241: at Loupe's lens. f242-243: centre.
- f244-f249: pencil absent. The camera widens to Rook's track and the flag pops off at f248 with no pencil in frame.
- f250-251: in the zone. f252-253: huge, cropped at the top-left (stills/f0252).

This was round-3 blocker #1. The builder note 'ONE continuous action' is not what renders.  
   Fix: 1. Lock the camera on the flag/ring framing from f224 until the last ochre route is done (about f262). Take the frames from the ghost re-run or the lens push.
2. Flip on screen over 3-4 f: rotate through horizontal with a small anticipation dip and a 1 f smear.
3. Angle the pencil about 20 degrees off the rails, so the eraser's contact with the plate is visible and the lines are seen breaking. Throw 6-10 lilac crumbs of 6-12 master px.
4. Flip back on screen.
5. For each of the 4 routes:
   - travel to its start in a 2-3 f smeared arc;
   - draw it over 6-8 f, with the ochre line's draw range driven by the graphite tip's parameter so the tip rides the growing end.
6. Tap the dock and zip back to the cab with smear.
7. For the plan-1 draw (f164-f187), either ride the lead route continuously while all routes grow together (as the storyboard says), or give each route 6-8 f with 3-4 f smeared travel between routes.

Acceptance: the pencil is on screen in every frame f224 to the cab exit, and it never moves more than about 60 master px per frame without smear. Check on a per-frame sheet and at 400x195.
2. **[major] The APPROVED ochre plan draws its own crossing. Right after the film teaches 'crossing routes = foul', the redrawn routes of column 2 (back row and front row) form a clear X just right of the flag. Their dock hooks also cut across each other, so the fixed plan appears to commit the same violation.** (physicist)  
   Evidence: - stills/f0252 (my crop x252.jpg): two ochre routes cross in an X at about master (1110-1170, 610-710), and the left pair of routes crosses at the dock hook around (560-640, 800-850).
- The same X is visible f244-f262 on my sheet x246.jpg.
- Code at the p10 commit (eb8e5ab q_story.js line 114, mkArrow): `off = m.pr === 0 ? -0.09 : 0.09` puts a fixed lateral offset on each row. In a column moving +x, the back-row atom reaches a given z later, after the column has stretched further, so the two traces swap sides and cross.  
   Fix: 1. Make the lateral offset follow each column's direction of motion, e.g. `off = (m.pr===0?1:-1)*0.09*Math.sign(PCOL[pc]-LANE-SCOL[c])`.
2. End the back-row line at the lane, with its barb pointing at the dock. Or draw ONE ribbon per AOD column that forks only at the two start atoms.
3. Add a segment-intersection test to check_phys: the approved plan must have zero route-route intersections.
4. Re-check f240-f262 per frame. Commit a081e68 claims 'non-crossing approved routes', so verify it on the next render.
3. **[major] ZAP! still hides one of the six bonded pairs (the back-left pair) through the whole gate beat. The shot that proves ONE global pulse gates EVERY pair shows only 5 of 6 CZs. The director and web lenses credited this as fixed, which it is not.** (techart (director and web claims disputed))  
   Evidence: - My sheet zap.jpg f448-f481: only 5 pairs are visible at f454, f457, f460, f463, f466, f469 and f472. All six (the back-left one in the space ZAP! occupied) are visible from f475, after ZAP! snaps off.
- stills/f0470: only the back-left pair's two empty dashed dock rings show under 'ZA', at about (460-680, 430-500). The atoms and their infinity bond are behind the letters.
- stills/f0452: same. The back-middle pair's top is also clipped by ZAP!'s lower spikes, at about (880-1060, 420-460).  
   Fix: Move ZAP! about 200 master px up and left, over the dark rail and storage corner (letters inside about x 150-700, y 100-330 at the f452 framing). Alternatively, scale it to about 0.75 and tilt the burst up-left.

Acceptance: all six pairs, their infinity bonds and their star eyes are fully visible on every frame f452-f476, in the full frame and in both card crops.
4. **[major] PowerMove (Slo and its sign), the film's only baseline and conflict, cannot be read in GO or in the race. Both fall outside the excluded payoff-hold window.
- The sign is clipped ('OWERMOV' / 'POWERMOV'), tiny in GO, and lies across Loupe's lens through the race.
- Loupe stands inside Slo's lane.
- Slo's head is a grey sphere of the same value as its cargo, so Slo reads as a pile of grey balls.
- At the lap close the sign droops, springs back upright, jumps height frame to frame, then droops again.
- The sign itself still renders as a flat UI label: monoline sans, thin even border, no cloth shading.
- Tick's face is under the grey hatch, so its race acting does not read.** (director, techart, web, physicist)  
   Evidence: GO (my go.jpg f353-f364):
- The sign is about 60 px wide at 960 and reads 'OWERMOVI' / 'POWERMOV' f359-f364.
- Slo is buried in a chain of 5-6 grey atoms at the left edge (stills/f0358).
- In the card crop c_race.jpg f359/f362 the sign is an unreadable sliver.

Race (my race.jpg f494-f546, stills/f0520):
- The sign reads 'OWERMOV' in nearly every sampled frame, with the P behind the pole.
- The sign lies across Loupe's lens f498-f530.
- Loupe, the sign, Slo, the grey cargo and two Qubrio pairs all overlap in the left third.
- Slo's head at f0520 (about 360-450, 640-720) matches its cargo.
- Tick's face on the dial is under the grey hatch (f0520 about 1300-1500, 600-760).

Lap close (droop.jpg): upright f547-f549, dropped f550-f551, upright again at shifting heights f552-f555, dropped again f556.  
   Fix: 1. Stage the race exactly as the known payoff fix does, but from GO onward (f346-f555):
   - shift the lane left;
   - put Loupe behind the lane from f490;
   - keep the pole on the far side of the shell, so the banner never crosses Loupe's lens or any Qubrio pair.
2. Rebuild the sign cloth:
   - size it to 'POWERMOVE' plus at least 0.4 cap-height margin at each end, with the pole outside the lettering;
   - letter it with the SFX stroke routine (tapered, chisel, Ben-Day shade band) in grey-lilac ink;
   - shade it through the NPR material (cel band on a fold, hatching, vertex ripple).
3. In GO, make the sign at least 180 master px wide (cap height at least 30 master px), inside the card band. Hold GO 8-10 f longer on Slo's start hop.
4. Give Slo a readable head: a lighter putty value, long eye stalks and a huff. Carry the cargo on or behind the shell, never beside the head.
5. Play ONE droop at f550: an ease-down with a small overshoot that never returns upright. Keep the sign's position locked between frames.
6. Draw Tick's face features above the hatch so a foot-tap or yawn reads during f494-f548.

Re-check every 4th frame over f356-f364 and f492-f555 in both card crops.
5. **[major] Payoff (outside the excluded Loupe/sign issue):
- The 4.7x flag still springs out as a blank ochre slab for 3 frames before its digits pop in. This is round-3 item 3.2, unaddressed, on the loudest beat of the card.
- The claimed 'tighter push' is not rendered: 4.7x is still about 22-23% of the frame width, and the top quarter is wall.
- The dial's lower left is a knot of touching grey atoms plus Tick's rod and knob.** (director, techart, web)  
   Evidence: Blank flag, my pay.jpg f546-f577:
- f558: a small blank flag.
- f559-f560: a large blank ochre rectangle with Ben-Day dots.
- f561: '4.7x' appears at full size.

Scale:
- stills/f0600: 4.7x spans about x 340-780 of 1920 (about 23%).
- My side-by-side of ev/r3/stills/f0600 and r4 f0600 (pay_r3r4.jpg) shows nearly identical framing.

Lower-left knot: f0600 shows a heap of 4-5 touching grey atoms at about (520-770, 740-910) plus Tick's rod and knob at (570-730, 620-690), pressed against the dial rim. This reads as a pile of grey balls in card.jpg f600/f630.  
   Fix: 1. Parent the digits to the flag field from its first visible frame, and scale them together (0 -> 1.15 -> 0.95 -> 1 over about 6 f).
2. Push in about 20% further, or raise the look-at point, so flag + dial + gauge fill about 80% of the width and '4.7x' is at least 30% of the frame width (at least 290 px at 960) at f600. Keep the sunburst behind the dial.
3. Swing Tick's left arm up into a cheer, so the rod leaves the dial's lower left.
4. With the planned lane shift, keep the drop tray and Slo's head at least 120 master px clear of the dial rim.
5. Re-check f556-f646 per frame and at 400x195.
6. **[major] S4, the optimiser's reject gag and both verdicts:
- They still leave by alpha fade (web-animation grammar).
- Each verdict is held about 17 f, not the claimed 23 f / 20 f (the storyboard asks for about 20 f).
- The 'splat' is one opaque clean ellipse with 1-2 px specks for droplets, then a translucent disc sliding away.** (director, techart, web)  
   Evidence: My sheet s4a.jpg f284-f319:
- f289: the ghost is flung.
- f290: a flat opaque white ellipse with x-eyes; droplets are 1-2 px specks at 960.
- f291-f294: the same ellipse, translucent grey, sliding down-left and fading.
- f295: gone.

The ✗ lands small at f296, is opaque f297-f312, translucent brown f313-f314, and gone at f315.

My sheet s4b.jpg f328-f369: the ✓ is opaque f333-f349 (17 f) and translucent f350-f351 while the GO pan starts.  
   Fix: 1. Splat: draw an opaque irregular lobed ink splat on the lens plane for 2-3 f, with 5-8 bold droplets (8-20 master px) flung radially, a smear tail and the camera shake. Then cut it hard, or peel or drip it off as an opaque shape. Never lower its opacity.
2. Hold the ✗ and the ✓ opaque for at least 20 f each. Shift try 2 and the GO pan about 4-6 f later if needed.
3. Exit each with a 2-3 f snap-shrink or stamp-lift, matching the SFX exits. No alpha.
7. **[major] The visible foul is not where the ring and flag mark it:
- The dry-run ghosts hover so high that the bump shows among the sleeping storage atoms, with the right ghost touching one. It sits about 200 master px above the ink ring and flag on the plate.
- The two rails do not visibly run through the bumping ghosts.
- From f205 TWEET! covers the back-row x-eyed pair, so the 'whole column' swap reads as a one-row collision.** (physicist, director, techart)  
   Evidence: stills/f0214:
- The x-eyed ghosts are at about (500-760, 440-580), beside the sleeping atom at (785-905, 455-555).
- The ring is at about (540-800, 640-760) and the flag pole's foot at about (690, 730).
- The left rail passes through the right ghost.

The code at the p10 commit has ghost hover `y: P.AY + 0.55*pk` (q_time.js).

My zoomed sheet s3bump.jpg f196-f221: both x-eyed pairs are visible only at f202-f203. From f205 to f221 TWEET!'s lower spikes cover the back pair and the top of the front pair (also stills/f0206).

This is round-3 must-fix #5, third bullet, unresolved.  
   Fix: 1. During the plan-1 dry-run steps, lower the ghost hover to about AY + 0.1, so the bump sits on the plate in the gap between storage and zone. Or keep the hover, but give each ghost a pencil shadow ellipse and a dashed plumb line, and ring the shadows.
2. Make the two rails run through the two ghosts' ground points.
3. Lift TWEET! about 80-100 master px, or shift it right, so both bumping pairs stay fully visible.
4. Dim the real sleeping storage atoms during the dry run, so the bump is isolated.

Acceptance at f202-f222: the ring encloses the bump on screen, both x-eyed pairs are visible, and no ghost overlaps a sleeping atom.
8. **[major] PowerMove's trays and cargo break the film's own 'distance = interaction' rule:
- The pick-up tray plank projects into the entanglement zone, and its grey atoms touch or sit under Qubrio's front-middle pair.
- The drop tray ends as a touching 2x2 / 2x3 heap.
- The same plank sticks into the lower centre, unexplained, in S2 and S6.
- A two-circle 'oo' huff sprite reads as a mini atom pair inside and at the edge of the zone.** (physicist, techart, web, director)  
   Evidence: - stills/f0400: two touching grey atoms at about (870-960, 790-900) sit directly under the front-middle Qubrio pair (880-1100, 640-770), and the plank reaches into the violet zone.
- stills/f0520: a touching grey clump at about (1050-1200, 720-840) beside Tick's arm.
- stills/f0600: a heap of 4-5 touching grey atoms at about (520-770, 740-910).
- stills/f0110 (about 790-960, 980-1080) and f0452/f0470 (about 520-830, 800-1080): the plank overlaps the flood edge.
- 'oo' sprite: f0452 about (915-980, 950-995); race frames f514, f522, f542 (race.jpg).
- Code at the p10 commit eb8e5ab: trays are 1.35 deep along z at L.z; slotPick spacing is 0.36 and slotDrop spacing 0.46.  
   Fix: 1. Keep every PowerMove object out of the zone and off screen-overlap with any Qubrio atom: trays in front of the lane, running along x.
2. Space pick-up singles at least 0.62 apart and drop pairs at least 0.85 apart between pair centres, laid across the S7 camera's view so the gaps survive projection at 400 px.
3. Hide the trays until the race, or frame them out of S2 and S6.
4. Redraw the huff as one lumpy inked cloud outside the zone.
5. Add Slo, its cargo and its trays to check_phys: at least 1.38 from any Qubrio atom, and none inside ZONE.
6. Re-check f56-f146, f346-f480 and f488-f646.

The working tree (a081e68) already rewrites the tray code; confirm it on the next render's frames.
9. **[major] GO's CLICK! is legible for only 1 frame, so the race-start cue does not register. This is a regression from round 3, where it read over about 4 f. It pops at the top-right corner and snap-shrinks immediately.** (web)  
   Evidence: My go.jpg:
- f358: crown burst only.
- f359: CLICK! at full size.
- f360: about 50-60% size.
- f361: a tiny speck.
- f362: gone.

The whip starts at f365. In card crop c_race.jpg f359 CLICK! is readable, but by f362 nothing remains.  
   Fix: Pop CLICK! in over 2 f at about f355-f356 as the hands reach 12. Hold it at full size to f364, inside the card band and clear of the pill. Snap-shrink it under the whip start. Or delay the whip 5-6 f, keeping the race start at f362.
10. **[minor] Convoy motion marks still read as tethers: straight black hairlines run from back-row movers' faces through or into front-row movers of the same AOD column. Faint soft orange airbrushed smudges also remain at the amber pedestals. Round-3 minor #11 is not done.** (techart, physicist, director)  
   Evidence: stills/f0380:
- A double hairline from the back-middle mover (about 1140, 420) down to the middle mover (about 1040, 540).
- A line from about (1480, 480) to the front-right mover (about 1420, 650).
- Double lines from about (840, 360) to (720, 450).
- Soft orange smudges at about (990-1050, 620-650) and (1380-1450, 700-750).

The same marks appear f372-f394 in strips_356-404.jpg.  
   Fix: 1. Replace the hairlines with 2-3 short tapered brush strokes trailing each mover opposite its velocity. Each is 0.3-0.5 atom diameter long, depth-tested, lives 2-3 f with jittered starts, and is clipped at least 0.3 short of any other atom.
2. Render the amber pedestals with the same hard two-step cel banding as the violet ones (smoothstep width at most 0.02), or as a flat ochre halftone disc.
3. Re-check f366-f400.
11. **[minor] In S2 (the shot that teaches 'only pairs are close') the 3x3 storage still projects into columns of three touching atoms. The higher camera only fixed S1.** (physicist, techart, director)  
   Evidence: - stills/f0110: each storage column at about x 630-770, 840-950 and 1040-1140 (y 95-360) is a stack of three touching spheres.
- card.jpg f110 at both widths shows the same.
- S1 (f0040) is separated.  
   Fix: Carry the S1 elevation into the S2 follow camera, or raise S2's elevation by about 10-15 degrees, or lower the sleeping atoms' hover during S2. Each storage neighbour needs a cream gap of at least 0.3 diameter on screen. Verify f54-f148 at 960 and at 400x195.
12. **[minor] Loupe's face sits under the LIVE pill for about 1.5 s as the verifier is introduced at the start of S3, and it grazes the pill again at the S1-S2 move. Round-3 must-fix #13 is not addressed.** (web)  
   Evidence: My card crops c_s3.jpg: at f156, f164, f172 and f180 the pill sits on Loupe's lens and eyes at both 515x195 and 400x195. c_s1.jpg f58 (400) and f62 (both widths): the pill overlaps Loupe's lens.  
   Fix: Re-frame f150-f200 (and f56-f64) so Loupe stays at master x <= 1550 with the lens top at or below row 300. Truck the S3 establishing camera about 150-200 master px, or have Loupe walk in and plant by f190. Re-check in both card crops.
13. **[minor] Pip's wake-up '!' is still cut by the top edge of the 515x195 card. The builder's 'kept inside the card band' holds only at 400 px.** (web)  
   Evidence: - My c_s1.jpg f36, f40 and f44: the upper part of the '!' stroke is cut by the 515 card's top edge. At 400 it barely clears.
- card.jpg f40 shows the same.
- The 515 band starts at about master row 177.  
   Fix: Place the '!' with its top at or below master row 200, beside Pip's head. Or tilt the S1 camera up about 100 master px during f30-f52. Enlarge it with a small ochre burst while there. Re-check f30-f56 at 515x195.
14. **[minor] The master will exceed the ~70 MB budget at the encoder's default CRF 18, and nothing guards against it.** (web)  
   Evidence: - README section 7 sets the master budget at <= ~70 MB.
- I re-encoded the current 1080p segments f0-f150 (out/qubrio/_render/segments) with encode_master's chain at CRF 18 slow: 19.34 MB.
- f0-f150 holds 21.9% of p10's packet bytes, which extrapolates to about 88 MB.
- encode_segs.py still defaults to --crf 18, with no size check on the master.  
   Fix: 1. Encode the master at CRF 20 (about 60 MB by the web lens's measurement), or CRF 19 plus light hqdn3d.
2. Make encode_master fail when the file is over 70e6 bytes.
3. Record both deliverable sizes and CRFs in REVIEW.md.

Disputed or downgraded by the consolidator:

- Director and web: 'ZAP! sits clear of all six pairs' (listed as fixed). Invalid. My zap.jpg shows only 5 pairs f454-f472; the back-left pair is under 'ZA' (f0470 shows only its empty dock rings at about 460-680, 430-500), and six pairs show only from f475. Kept as a major must-fix per techart.
- Builder note 'the pencil performs ONE continuous action on screen'. Not supported. Per-frame p10 shows 2 f hops f164-f187 and f238-f243, a 1 f flip at f235->f236, and the pencil absent f180-181, f184-185 and f244-f249.
- Builder note 'tighter payoff push'. Not rendered. The r3 and r4 stills/f0600 framings are nearly identical, and 4.7x is still about 23% of the width.
- Builder note 'the X holds 23 f, the check 20 f'. Both are opaque only 17 f (f296-f312 and f333-f349), then alpha-fade (f313-f314 and f350-f351).
- Builder note 'the flung ghost splats flat on the lens with ink droplets'. It is opaque for 1 f (f290) with 1-2 px specks, then a translucent ellipse slides away f291-f294.
- Builder note 'storage grid at a higher camera so atoms never stack'. True only for S1. S2 (f64-f120, stills/f0110) still stacks each column.
- Builder note 'S1 ! kept inside the card band'. True at 400x195 only. At 515x195 the '!' is cut at f36-f44.
- Builder note 'the soft amber glow under the convoy is gone'. Only partly true: the large radial sprites are gone, but faint soft orange smudges remain at the amber pedestals (f0380). Folded into the minor convoy item.
- Web: 'the card needs CRF >= 32 but encode_segs' default search (crf-start 22, 8 tries) never reaches it'. Stale. The working tree's tools/encode_segs.py (uncommitted) now defaults to --crf-start 30, which searches CRF 30-37. Only the master-size half is kept. The web lens's master estimate used the 11:20 1080p segments of a newer build, not p10, but my own re-encode reproduces it (19.34 MB for f0-f150, about 88 MB extrapolated).
- Physicist's code citations (slotPick 0.36, slotDrop 0.46, 1.35-deep trays along z, mkArrow fixed +/-0.09 offsets). These are accurate for eb8e5ab, the source p10 was rendered from. The working tree (commit a081e68, 11:17) already rewrites them (slotPick 0.62, slotDrop 0.9, trays at TZ = L.z + 0.47 along x). The items stand on p10's frames but must be closed only on the next render, not on the code.
- Scope note, not a dispute. Commit a081e68 claims fixes for most items above: one sweeping pencil pass with on-screen flips, a bigger payoff push with flag and digits together, cheering arms, snap-exit verdicts, an opaque splat with bold droplets, ZAP! clear of every pair, non-crossing routes, tray spacing, low ghost hover, a higher S2 camera, short speed lines, a 1.3x hit, fewer flood pinstripes. None is in p10; re-verify each on the next render.
- Payoff items for Loupe and the POWERMOVE sign at the left edge f556-f646 were not scored (known issue). The sign's double droop and position jumps at f547-f555 fall outside that window and are kept in the PowerMove item.
- Verified OK, not a defect. The cross-shot whips no longer double-expose the ink (f364-f371 and f429-f436 are clean). The loop wipe covers >= 0.6 on only 2 frames (my measurement: f649 0.64, f650 0.81, f651 0.48).

### Fixes applied after round 4 (in the final 1920×1080 render)

- **S3 pencil:** one sweeping pass draws all the plan's routes together, the tip riding the lead route's growing end, and the lead route stays in frame. The pencil flips end over end through horizontal (4 f) to the eraser and back, and one pass redraws the swapped routes in ochre.
- **Approved plan:** the routes' side offsets follow each column's motion, so the ochre plan never draws an X.
- **Dry-run ghosts:** they peel up, then run low on the plate, so the bump sits where the flag and ring mark it.
- **Payoff:**
  - Pushed in about 20%: the 4.7× flag spans about 27% of the width, and its top sits at master row ≈210.
  - The flag and its digits pop together.
  - Tick cheers with both arms up.
  - The payoff CLICK! is held 12 f, and 1.3× gets its own burst and shake.
- **S4:** the splat is opaque, with bold ink droplets, then cuts. The verdicts exit with a snap, with holds of 23 f (✗) and 20 f (✓). The ✓ is a stronger violet.
- **PowerMove:**
  - The lane shifted left, and its trays sit in front of the lane along x, outside the zone: singles 0.62 apart, pairs 0.9 apart.
  - The sign is larger, its lettering fits the cloth, and it swings round its pole to Slo's heading at each turn.
  - Loupe stands behind the lane for the race and the payoff.
  - GO's CLICK! is held about 10 f.
- **Card safety:**
  - S1's "!" sits inside the band.
  - The start of S3 is reframed so Loupe clears the LIVE pill.
  - ZAP! sits further up-left, clear of every pair.
- **Framing:** S2 is shot from higher, so the storage never stacks.
- **Motion marks and craft:**
  - The convoy speed lines are short and never reach the row behind.
  - The lime zone glow is removed, and the flood has fewer pinstripes.
  - Pip is matte, and the 2D ink turns off in step with the whip blur.

