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
interaction radius r. **Rook** the loco pencils a routing plan; amber ghost stand-ins dry-run it, and at step 2 two of
them collide where the routes cross (the AOD columns would cross) — **Loupe** the verifier whistles and throws its
penalty flag onto exactly that spot; Rook re-draws exactly those two routes in order and the dry run passes. **Tick**
the stopwatch tunes the schedule on its simulator (dial = time, gauge = fidelity): a faster try flings a ghost and drops
fidelity → thrown away; a better try shortens the time and lifts fidelity → kept. **GO**: Rook tows the whole block in
ONE convoy; Tick fires ONE global pulse over the zone. Tick's own hand stopped when the convoy docked; PowerMove's ghost
hand keeps running while **Slo** the PowerMove snail ferries two atoms per trip at the same speed — and closes the lap
exactly as Slo drops its last pair, 4.7× later: **4.7×** pops on a pennant, then **1.3×** on the fidelity gauge.

## World (one set, depth in layers)
| layer | contents |
|---|---|
| foreground | Slo's lane along the plate's front edge (pick-up tray left, drop tray right), Rook's brass track (left edge), Tick's stool + the fidelity gauge (front right) |
| chip | cream instrument plate on a violet optical table: lilac **storage** zone (back), violet enamel **entanglement** zone (front), dashed trap rings, brass rim, ruler ticks; the brass **objective** hangs over the zone |
| table | optics on posts, a laser head, a violet cable |
| back wall | lavender plaster, violet wainscot, a round window (night sky + moon), shelves with fat flasks, a hanging lamp |

Palette: violet (#7c3aed family) dominant, ochre/amber pop (AOD, pencil, brass, bonds, numbers), ink #1a1530, cream
paper #f4ebd6. The Rydberg light is a pale violet flood; PowerMove's things are a greyed lilac.

## Physics layout (checked by `tools/check_phys.mjs`)
| item | value |
|---|---|
| atoms | radius 0.22, hovering on light pedestals (cream = static SLM trap, amber = AOD grip; held atoms tint amber) |
| storage | 3 × 3 at pitch 1.0 (2.3 diameters: "close" can only mean "interacting"); the back row stays |
| movers | the front two storage rows: 3 × 2 = 6 atoms, picked at the AOD row × column intersections |
| partners | 6 atoms in the zone at pitch 1.9 (x) × 1.4 (z) |
| pair | a mover docks 0.52 left of its partner (surface gap 0.08) = inside r (Pip's circle) |
| isolation | nearest non-partner of any paired atom ≥ 1.38 = 2.65 × the pair distance (circles never touch) |
| convoy | ONE min-jerk AOD move (48 f): out of storage, columns stretch 1.0 → 1.9, rows 1.0 → 1.4 (order kept, never crossing), glide into the zone; no mover passes through another atom |
| verifier | plan 1 swaps the front row's outer columns: their routes cross, the dry-run ghosts collide at step 2 (the AOD columns would cross) — flagged at that exact point; plan 2 keeps the order |
| pulse | global: one hard-edged light volume over the whole zone rectangle from the objective; storage stays dark |
| race | both start at GO. Qubrio: one convoy move, TQ = 48 f. PowerMove (Slo): 2 atoms per trip (≈ the site's 1.7 per move) on a lane as long as the convoy's travel, legs at the same speed bound (45 f each), 3 loaded + 2 empty legs = 226 f = 4.7 × TQ |
| numbers | Tick's dial: a full lap = PowerMove's run; its own hand stops at 48/226 = 1/4.7 of the lap. During optimisation the unoptimised schedule sits at 1.7/4.7 (site: "without optimization schedules are 1.7× longer"). Gauge: PowerMove's mark at h, Qubrio's column at 1.3 h |

## Cast (original)
- **Atoms** — cream pearls, minimal faces (sleep arcs, dots, squeeze, stars, hearts); centres only move by the AOD.
- **Pip** (Placement) — drafting compass, violet head, steel needle leg + amber pencil leg; its circle IS r.
- **Rook** (Routing) — violet toy locomotive on the side track; the amber AOD row lines run from it across the plate:
  when Rook moves, the whole block moves. Brass nameplate "Qubrio" (the film's only title).
- **Loupe** (Verifier) — brass magnifying glass on legs with an ochre whistle and a penalty flag.
- **Tick** (Optimize) — brass stopwatch on a violet stool; the dial is its face and the simulator's time readout.
- **Slo** (PowerMove) — putty snail with a greyed-lilac shell and a paper "POWERMOVE" flag, two atoms per trip.

## Shots
| # | frames | beat → reaction (concept) | camera | out |
|---|---|---|---|---|
| S1 | 0–54 | The lab asleep, zzz; Pip wakes, stretches, "!" at the zone (a CZ stage to do). | slow crane down from a high wide | continuous |
| S2 | 54–148 | **Placement**: Pip hops partner to partner; needle on the partner, pencil swings a full circle of radius r; the dock mark lies on it; each partner wakes and looks where its mover will land; neighbouring circles never touch. | low follow, rise to show all six circles | **whip pan** |
| S3 | 148–262 | **Plan + verifier**: Rook toots, pencils the plan; amber ghosts peel off the sleeping movers and dry-run it in stop-motion steps; step 2: two ghosts bonk where their routes cross → Loupe **TWEET!**, throws its flag onto the exact point, inks a ring round it; Rook sweats, rubs out exactly those two routes, re-draws them in order; the ghosts re-run cleanly; Loupe beams. | high 3/4, **crash zoom** on the collision + flag | **whip pan** |
| S4 | 262–344 | **Optimise on the simulator**: Tick wakes; its dial shows the plan's time against PowerMove's dashed lap, the gauge its fidelity. Try 1 (faster): the ghosts rush, one is flung off (speed bound), fidelity drops → ✗ thrown away. Try 2: shorter time, fidelity up → ✓ kept. | over Tick on its stool, the plate behind | **whip pan** |
| S5 | 344–434 | **GO — the real run**: Tick clicks; both dial hands start; amber AOD rows × columns light, the six tint amber, crouch; Rook toots and tows the whole block in ONE convoy toward us, stretching, never crossing; speed lines; docking squash, blush. Slo sets off at the same moment with two atoms. | head-on, dollying back with the convoy; Rook left, Slo front | **whip pan** |
| S6 | 434–484 | **Global pulse**: Tick slaps its crown; ONE violet flood fills the whole zone (impact frames, **ZAP!**); every pair gets an ochre ∞ bond; storage squints. | Tick low hero → flash cut to a high 3/4 of the zone | continuous |
| S7 | 484–640 | **The race result**: Tick's hand has stopped at 1/4.7; PowerMove's ghost hand runs on while Slo ferries its pairs (Tick, Loupe and Rook watch it go back and forth, a yawn); as Slo drops the last pair the ghost closes the lap — CLICK — **4.7×** pops on a pennant; then **1.3×** on the gauge's tag; the pairs cheer out of phase. | wide on Tick + gauge + Slo's lane, hero push at the pop | **brush wipe** (cut under cover) |

Text on screen: "Qubrio" (Rook's plate), "POWERMOVE" (Slo's flag), 4.7×, 1.3×, and two SFX (TWEET!, ZAP!), all hand-built
stroke lettering (no web font). Poster: the payoff hold (f612). The card loop file is rotated to start on the poster
frame (the loop is seamless, so this costs nothing).
