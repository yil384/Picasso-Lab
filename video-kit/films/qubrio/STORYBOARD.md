# Qubrio — "The Convoy" (3D comic) — storyboard

26 s seamless loop, 624 frames at 24 fps (frame 624 = frame 0). One real three.js lab set rendered through `npr/`
(comic look from `reference/style-comic`: cel ramp, burin hatching in shade and cast shadows, Ben-Day halftone,
off-register plates, boiling hull + Sobel ink). Faces, emotes, bonds and all lettering are hand-built 2D ink tracked
to the 3D world; marks that lie on the chip (compass circles, route arrows, the verifier's red circle, AOD dashes) are
3D decals on the plate, so atoms and characters occlude them correctly.

## Angles considered

_(filled from the story panel: see the bottom of this file)_

## Chosen story in one line

A sleepy neutral-atom chip has one CZ stage to run. **Pip** the compass places each pair by drawing a circle of the
interaction radius r; **Rook** the loco's first route plan crosses two AOD columns and **Loupe** the verifier whistles
the exact crossing; Rook fixes exactly that route and tows the whole block in **one convoy**; **Tick** the stopwatch fires
one **global** pulse over the zone, then tunes the schedule (a try that hurts fidelity is rejected) until its run takes
1/4.7 of PowerMove's lap: **4.7×** on a pennant, **1.3×** on the fidelity gauge — while **Slo**, the PowerMove snail
that started with the convoy, only now crawls in with its one atom.

## World (one set, depth in layers)
| layer | contents |
|---|---|
| foreground | Rook's brass side track (left), Slo's pencil-ruled lane (right edge of the plate) |
| chip | cream instrument plate on a violet optical table: teal **storage** zone (back), violet **entanglement** zone (front), dashed trap rings, brass rim, ruler ticks; the brass **objective** hangs over the zone (Rydberg + tweezer optics) |
| table | optics on posts, a laser head, a red cable |
| back wall | lavender plaster, violet wainscot, a round window (night sky + moon), shelves with fat flasks, a hanging lamp |

Palette: violet (#7c3aed family) dominant, amber/ochre pop (AOD, pencil, brass, flag), teal (SLM traps, storage),
pink only for the Rydberg light and the bonds, ink #1a1530, cream paper #f4ebd6.

## Physics layout (checked by `tools/check_phys.mjs`)
| item | value |
|---|---|
| atoms | radius 0.22, hovering on light pedestals (teal = static SLM trap, amber = AOD grip) |
| storage | 3 × 3 at pitch 1.0 (2.3 diameters: "close" can only mean "interacting"); the back row stays |
| movers | the front two storage rows: 3 × 2 = 6 atoms, picked at the AOD row × column intersections |
| partners | 6 atoms in the zone at pitch 1.9 (x) × 1.4 (z) |
| pair | a mover docks 0.52 left of its partner (surface gap 0.08) = inside r |
| isolation | nearest non-partner of any paired atom ≥ 1.38 = 2.65 × the pair distance |
| convoy | ONE min-jerk AOD move (60 frames): out of storage, columns stretch 1.0 → 1.9, rows 1.0 → 1.4 (order kept, never crossing), glide into the zone; no mover passes through another atom |
| pulse | global: one light volume over the whole zone rectangle from the objective; storage stays dark |
| race | Slo starts with the convoy; its lane is ticked every 1/4.7; it needs 4.7 × the convoy's time (282 f) and arrives at f556 |
| numbers | Tick's dial: PowerMove = the dashed full lap; Qubrio's run before tuning = 1.7/4.7 lap (the site: no optimisation = 1.7× longer), after = 1/4.7 lap; gauge: PowerMove mark at h, Qubrio column at 1.3 h |

## Cast (original)
- **Atoms** — cream pearls, minimal faces (sleep arcs, dots, squeeze, stars, hearts); centres only move by the AOD.
- **Pip** (Placement) — drafting compass, violet head, steel needle leg + amber pencil leg. Measures by swinging the pencil
  round the needle: the circle IS the interaction radius r.
- **Rook** (Routing) — toy locomotive on the side track; the amber AOD row lines run from it across the plate: when Rook
  moves, the whole block moves. Brass nameplate "Qubrio" (the film's only title).
- **Loupe** (Verifier) — a brass magnifying glass on legs with a red referee whistle; checks the plan, flags the exact spot.
- **Tick** (Optimize) — brass stopwatch, the dial is its face; fires the pulse with its crown; tunes the schedule.
- **Slo** (PowerMove) — putty snail with a slate shell and a paper "POWERMOVE" flag, carrying one atom (scalar routing).

## Shots
| # | frames | beat → reaction (concept) | camera | out |
|---|---|---|---|---|
| S1 | 0–60 (+596–624) | The lab asleep; zzz. Pip wakes, stretches, "!" at the zone. | slow crane down from high wide | continuous |
| S2 | 60–156 | **Placement**: Pip hops partner to partner; needle on the partner, pencil swings a full circle of radius r; the dock mark lies on it; each partner wakes and looks toward where its mover will land; neighbouring circles never touch (no crosstalk). | low follow, then rise to show all six circles | **whip pan** |
| S3 | 156–256 | **Routing plan + verifier**: Rook toots and pencils its route plan; two front routes cross (AOD columns would cross). Loupe hops over, peers at the crossing, **TWEET!**, red circle + ✗ exactly there; Rook sweats. Rook rubs out exactly those two routes and redraws them in order; Loupe beams. | high 3/4 over the plan, **crash zoom** on the flag | continuous |
| S4 | 256–348 | **Convoy**: amber AOD rows × columns light, pedestals turn amber, the six wake and crouch; Rook chugs and the whole block glides as one, stretching, never crossing; speed lines; docking squash, cheek bump, blush. Slo sets off at the same moment with ONE atom. | low tracking dolly from the left, Rook towing in the foreground | **whip pan** |
| S5 | 348–408 | **Global pulse**: Tick slaps its crown; the objective charges; ONE pink flood covers the whole zone (impact frames, **ZAP!**); every pair gets an ink ∞ bond, storage squints. | Tick low hero → flash cut to a high 3/4 of the zone, push | continuous |
| S6 | 408–480 | **Optimize**: Tick turns its crown to try schedule changes against its dial (time) and the gauge (fidelity): try 1 shortens time but drops fidelity → ✗ rejected, undone; tries 2, 3 improve time without hurting fidelity → ✓ accepted; the wedge shrinks to 1/4.7 of PowerMove's dashed lap. | front, slightly low, slow push | continuous |
| S7 | 480–596 | **Payoff**: a pennant pops out of Tick's crown: **4.7×**; the gauge's tag: **1.3×** (column 1.3 × the PowerMove mark); the pairs cheer out of phase; at f556 Slo finally crawls in, dizzy. | hero orbit, Tick + props + pairs behind | **brush wipe** (cut under cover) |

Text on screen: "Qubrio" (Rook's plate), "POWERMOVE" (Slo's flag), 4.7×, 1.3×, and 2 SFX (TWEET!, ZAP!), all hand-built
stroke lettering (no web font). Poster: the payoff (f540), both numbers up.
