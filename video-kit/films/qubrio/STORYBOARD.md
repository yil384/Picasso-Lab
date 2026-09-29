# Qubrio — "The Convoy" (3D comic) — storyboard

28 s seamless loop, 672 frames at 24 fps (frame 672 = frame 0). One real three.js lab set rendered through `npr/`
(the comic look of `reference/style-comic`: cel ramp, burin hatching in shade and cast shadows, Ben-Day halftone,
off-register plates, boiling hull + Sobel ink). Faces, emotes, bonds and all lettering are hand-built 2D ink tracked
to the 3D world; marks that lie on the chip (compass circles, route arrows, the verifier's ring, AOD dashes) are 3D
decals on the plate, so atoms and characters occlude them correctly.

## Angles considered (a story panel: 3 designers + my own draft, judged by 4 lenses)

| angle | idea | judged total (director + physicist + web + tech-art, /40) | verdict |
|---|---|---|---|
| **crew** | the picture-book cast (compass, loco, stopwatch, snail) in the comic look, plus a new verifier; ghost dry run; optimise with a reject; lid + fob payoff | 8 + 8.1 + 7.6 + 7.5 = **31.2** | **chosen base**: the user praised this cast's clarity; cheapest to build well |
| race | two identical lanes: PowerMove's courier vs Qubrio's crew; tape and balloon props | 7.5 + 8.4 + 6.5 + 6.3 = 28.7 | grafted: the honest race clock (same speed limit, more trips), the penalty flag on the exact point, the accept rule shown on the simulator |
| stage | theatre metaphor: choreographer, dance captain, stage manager, conductor | 6.5 + 6.5 + 7.8 + 7.8 = 28.6 | grafted: the clock race (hands start together, PowerMove's ghost closes the lap 4.7× later) and the payoff layout; rejected as a world (off-series, not a chip) |
| my first draft | whistle + crossing routes + stopwatch dial + snail | 4 + 5.5 + 4 + 4 = 17.5 | its crossing-routes violation kept (judged the most legible violation at 400 px); everything else rebuilt from the judges' must-fixes |

The judges' consensus must-fixes, all adopted: compile before run (the verifier and the optimiser act on a plan and a
simulator, not on live atoms); the baseline loses by making more moves at the same speed limit, not by being slower;
the ratio is proven on one prop at the payoff; violet + ochre + ink + cream only; no checklist/UI marks; payoff one read
at a time, card-safe.

The panel's synthesis (the crew base with the same grafts, a railway-signal verifier and a wind-up porter baseline)
agreed with this build on every structural choice; from it I took the dramatic irony before the foul (the two real
movers whose ghosts will collide wake and look at each other just before the bonk), light as acting (the lab lamp dips
while the objective fires), and its ledger discipline (one speed limit for both sides, compile strictly before GO). I
kept the loupe and the snail (already built, same meaning) rather than rebuild two characters.

## Chosen story in one line

A sleepy neutral-atom chip has one CZ stage to run. **Pip** the compass places each pair by drawing a circle of the
interaction radius r (the dock mark sits inside it). **Rook** the loco's pencil draws a routing plan along the AOD's
path; pencil-sketch ghosts dry-run it, and at step 2 exactly two of them bump — plan 1 sent two front-row columns to
each other's docks, so those AOD columns would have to cross — **Loupe** the verifier whistles and throws its penalty
flag onto exactly that spot; the pencil's eraser rubs out exactly those two routes, redraws them in order, and the
dry run passes. **Tick** the stopwatch replays the plan on its slate (the simulator; dial = time, twin gauge =
fidelity): a rushed try flings a ghost off the slate at the lens and fidelity drops → ✗ thrown away; a try without the
set-down/re-pick hiccup glides in one go, time shrinks and fidelity rises → ✓ kept. **GO**: Rook tows the whole block
in ONE convoy; Tick fires ONE global pulse over the zone. Tick's own hand stopped when the convoy docked; PowerMove's
pencil-grey hand keeps running while **Slo** the PowerMove snail ferries two atoms per trip at the same speed — and
closes the lap exactly as Slo drops its last pair, 4.7× later: PowerMove's flag wilts, **4.7×** springs out of Tick's
crown on a flag beside the dial, then **1.3×** is tied to the top of Qubrio's fidelity column.

## World (one set, depth in layers)
| layer | contents |
|---|---|
| foreground | Slo's lane along the plate's front edge beside Tick (pick-up tray left, drop tray right), Rook's brass track (left edge), Tick's stool and the twin-column fidelity gauge on its plinth (front right) |
| chip | cream instrument plate on a violet optical table: lilac **storage** zone (back), violet enamel **entanglement** zone (front), dashed trap rings, brass rim, ruler ticks; the brass **objective** hangs over the zone |
| table | optics on posts, a laser head, a violet cable |
| back wall | lavender plaster, violet wainscot, a round window (night sky + moon), shelves with fat flasks, a hanging lamp; return walls left and right so no camera sees past the set |

Palette: violet (#7c3aed family) dominant, ochre/amber pop (AOD, pencil, brass, bonds, numbers), ink #1a1530, cream
paper #f4ebd6. The Rydberg light is a pale violet flood; PowerMove's things are a greyed lilac.

## Physics layout (checked by `tools/check_phys.mjs`)
| item | value |
|---|---|
| atoms | radius 0.22, hovering on light pedestals (cream = static SLM trap, amber = AOD grip; held atoms tint amber) |
| storage | 3 × 3 at pitch 1.0 (2.3 diameters: "close" can only mean "interacting"); the back row stays |
| movers | the front two storage rows: 3 × 2 = 6 atoms, picked at the AOD row × column intersections |
| partners | 6 atoms in the zone at pitch 1.9 (x) × 1.4 (z) |
| pair | a mover docks 0.52 left of its partner (surface gap 0.08), well inside r = 0.65 (Pip's circle); circles on the 1.4 row pitch never touch |
| isolation | nearest non-partner of any paired atom ≥ 1.38 = 2.65 × the pair distance (circles never touch) |
| convoy | ONE min-jerk AOD move (44 f): out of storage, columns stretch 1.0 → 1.9, rows 1.0 → 1.4 (order kept, never crossing), glide into the zone; no mover passes through another atom (min 0.52) |
| plans | a plan's routes are the AOD path itself (the pencil samples it), so the approved plan IS the executed move |
| verifier | plan 1 sends the front row's two left movers to each other's docks: their columns would cross; the dry-run ghosts meet at p = 0.195, exactly two of them (all others ≥ 1.22 away, no other route within 0.55) — flagged at that point; plan 2 keeps the order |
| pulse | global: one hard-edged light volume over the whole zone rectangle from the objective; storage stays dark |
| race | both start at GO (f356). Qubrio: one convoy move, TQ = 44 f. PowerMove (Slo): 2 atoms per trip (≈ the site's 1.7 per move) on a lane as long as the convoy's travel, legs at the same speed bound (41.4 f each), 3 loaded + 2 empty legs = 207 f = 4.7 × TQ; the lap closes at f563 |
| numbers | Tick's dial: a full lap = PowerMove's run; its own violet hand stops at 44/207 = 1/4.7 of the lap (76.6°), PowerMove's pencil-grey hand closes it. During optimisation the unoptimised schedule sits at 1.7/4.7 (site: "without optimization schedules are 1.7× longer"). Gauge: two columns side by side, PowerMove's (grey-lilac) at h with an ink bar, Qubrio's (violet) at 1.3 h |

## Cast (original)
- **Atoms** — cream pearls, minimal faces (sleep arcs, dots, squeeze, stars, hearts); centres only move by the AOD.
- **Pip** (Placement) — drafting compass, violet head, steel needle leg + amber pencil leg; its circle IS r.
- **Rook** (Routing) — violet toy locomotive on the side track; the amber AOD row lines run from it across the plate:
  when Rook moves, the whole block moves. Its pencil (ochre, lilac eraser) pops out of the cab to draw and fix plans.
  Brass nameplate "Qubrio" (the film's only title).
- **Loupe** (Verifier) — brass magnifying glass on legs with an ochre whistle and a penalty flag.
- **Tick** (Optimize) — brass stopwatch on a violet stool; the dial is the time readout (its face sits below the hands'
  hub), the slate it holds up is the simulator, the twin gauge beside it the fidelity readout.
- **Slo** (PowerMove) — putty snail with a greyed-lilac shell and a paper "POWERMOVE" flag, two atoms per trip.

## Shots
| # | frames | beat → reaction (concept) | camera | out |
|---|---|---|---|---|
| S1 | 0–54 | The lab asleep, zzz; Pip wakes, yawns, a big ochre "!" at the zone (a CZ stage to do). | slow crane down from a high wide | continuous |
| S2 | 54–148 | **Placement**: Pip hops partner to partner; needle on the partner, pencil swings a full circle of radius r; the dock mark lies on it; each partner wakes and looks where its mover will land; neighbouring circles never touch. | low follow, rise to show all six circles | **whip pan** |
| S3 | 148–262 | **Plan + verifier**: Rook toots; its pencil pops out of the cab and draws each route along the AOD path, one after another; pencil-sketch ghosts peel off the sleeping movers and dry-run it in stop-motion steps; the two real atoms whose ghosts will bump glance at each other and sweat; step 2: exactly two ghosts bump (x eyes) — Loupe (standing beside the block) **TWEET!**, throws its flag onto the exact point, an ink ring round it; the pencil flips to its eraser and rubs out exactly those two routes (crumbs), redraws them in order; the ghosts re-run cleanly into their docks; Loupe beams, sparkles. | high 3/4, **crash zoom** framing the bump and Loupe side by side | **whip pan** |
| S4 | 262–340 | **Optimise on the simulator**: Tick wakes and holds up its slate (a pencil diagram of the chip; the real chip stays asleep behind); dial = the plan's time against PowerMove's lap, twin gauge = fidelity. Try 1 (rushed, with the old set-down/re-pick hiccup): one ghost is flung off the slate at the lens, Tick ducks, the violet column drops below PowerMove's bar → a big stamped ✗, held ~20 f. Try 2 (one smooth glide, no hiccup): the wedge shrinks to 1/4.7, the column rises past the bar → ✓, held ~20 f. | slate · Tick · gauge side by side in the card band, slow push | **whip pan** |
| S5 | 340–434 | **GO — the real run**: Tick clicks; both hands start; amber AOD rows × columns light, the six tint amber, crouch; Rook toots and tows the whole block in ONE convoy (44 f), stretching, never crossing; speed lines; docking squash, blush. Slo sets off at the same moment with two atoms, its PowerMove flag springing up. | high 3/4 from the front-right: Rook whole on the left, the pairs separate | **whip pan** |
| S6 | 434–484 | **Global pulse**: the room light dips (anticipation); Tick slaps its crown; ONE violet flood fills the whole zone — the brightest thing on screen, the room in shadow (2 impact frames, **ZAP!** over the dark storage); every pair gets an ochre ∞ bond and star eyes; storage squints. | Tick low hero → flash cut to a high 3/4 of the zone | **whip pan** |
| S7 | 484–650 | **The race result**: Tick's violet hand has stopped at 1/4.7; PowerMove's pencil-grey hand runs on while Slo huffs back and forth with its pairs (Tick taps its foot, follows it with its eyes, yawns; Loupe watches it like tennis); as Slo drops the last pair the hand closes the lap (f563) — CLICK — PowerMove's flag wilts, **4.7×** springs out of the crown on a flag beside the dial; then **1.3×** on a paper tag tied to Qubrio's column; star eyes; the pairs cheer out of phase; ~3 s hold. | Slo's lane across the front with the dial right; then the payoff band flag · dial · gauge | **brush wipe** (≤4 frames cover, cut under it) |

Text on screen: "Qubrio" (Rook's plate), "POWERMOVE" (Slo's flag), 4.7×, 1.3×, and two SFX (TWEET!, ZAP!), all hand-built
stroke lettering (tapered, chisel-cut, leaning, with a Ben-Day shade band; the SFX on jagged burst balloons; no web
font). Poster: the payoff hold. The card loop file is rotated to start on the poster frame (the loop is seamless, so
this costs nothing).
