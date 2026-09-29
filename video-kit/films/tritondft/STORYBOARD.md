# TritonDFT — "The All-Nighter" (3D comic, 30 s seamless loop, 720 f @ 24 fps)

Logline: at midnight a night-owl researcher posts a question — *silicon's band gap?* — into the TritonDFT tube,
heaves a giant hourglass upright for the all-nighter ahead and, as a dare, flips a tiny one for the machine. At the
other end of the tube four agents Plan, Execute, Analyze and Refine around a turntable, go round the loop again until
the result converges, and send it back. It pops out of the tube the instant the tiny hourglass runs dry; the giant
one has drained exactly one tiny load: **68×**. **98%** · **$0.04**. The owl finally gets to sleep.

## 1. Story angles considered
Four storyboard agents each developed one angle independently; three judges (a P(doom)-loving creative director, a
DFT/Quantum ESPRESSO practitioner, and the Projects-page web designer + stylised-three.js lead) scored them.

| angle | idea | director / DFT / card judge (overall) | kept from it |
|---|---|---|---|
| **A. The All-Nighter** | the researcher's manual all-nighter vs four agents on a turntable; question and answer travel by pneumatic tube; two same-shape hourglasses with volumes 68:1 | **8.5 / 8.3 / 8.0 — winner of all three** | the spine: Hoot, the tube, the honest hourglass race, the cast, 98% as a pass rate, four pennies |
| B. Lap Two | the loop as a literal ring with a cart, a Library hub (knowledge base), lap 1 fails, lap 2 converges | 7.5 / 8.1 / 7.7 | the Library hub (Tri pulls a method book), the Refiner overshoot (k-grid too fine → cost pan crashes → back off), the bead-on-spring gauge, band-gap planks, extruded numerals slammed by the agent who earned each |
| C. Round the Cell | tiny tool-agents inside a giant silicon cell | 6.3 / 6.5 / 6.2 | vc-relax = the cell breathes and settles; SCF = halftone density condensing onto the 16 bond midpoints |
| D. Hold Still, Silicon! | a photo studio re-taking silicon's portrait until two prints agree | 7.3 / 7.4 / 7.3 | Clack as the late "photobomber" in the payoff; convergence judged against a tolerance, not a known answer |

Rejected: D (a photo metaphor says DFT *images* materials; pixel size ≠ k-grid), C (60–100 ghost atoms and
real-space "band floors" fail at card size; numbers misattributed). B's ring set would duplicate what A already has.

## 2. World (one three.js set: a night attic lab; cream + pale sky, night only in the moon window)
- **Left — Hoot's desk** under a gooseneck lamp: paper towers (manual work), a big book of lattice doodles, a mug, a pillow,
  the **giant hourglass** and, beside it on a stack of three books (so it sits inside the card band), the **tiny
  hourglass** (same shape; the giant is 68^(1/3) ≈ 4.08× taller, so it holds exactly 68 tiny loads). Above the desk, the brass mouth of the **pneumatic tube** with an enamel plate hand-lettered
  **TRITONDFT** (the name's only appearance: the service Hoot is asking), placed above Hoot so it stays inside the card band.
- **Right — the agents' round workbench**: at its hub the **Library** (a ring of fat standing books = the shared knowledge
  base); round it a **turntable ring** with vermilion chevrons carrying the job (a matte ball-and-stick **silicon
  diamond-cubic cell**, 18 atoms, 16 bonds) past four stations in loop order **Planner → Executor → Analyzer →
  Refiner**. The tube ends in a brass funnel over the Planner.
- **Big Iron**, the HPC engine (a separate machine the Executor launches jobs on), behind the Executor.

## 3. Cast
| who | concept | design |
|---|---|---|
| **Hoot** | the researcher = the manual baseline (survey of 19 PhD researchers: every manual step takes minutes–hours); asks in plain language, receives publication-ready results | tan owl egg, cat-ear tufts, huge round glasses, cream lab coat |
| **Tri** — Planner | decomposes the request into steps (vc-relax → scf → band gap), picks methods from the knowledge base, maps them to the executable | sky-blue 30-60-90 set-square on stick legs, vermilion pencil |
| **Clack** — Executor | writes the Quantum ESPRESSO input, launches the HPC job, streams the output back | sky-blue typewriter: keycap grin, roller brow, carriage-lever arm |
| **Loupe** — Analyzer | parses output, validates convergence (change within tolerance), reads the band gap | magnifying glass with ONE eye behind the lens + a bead-on-spring convergence gauge |
| **Tilt** — Refiner | Pareto accuracy vs cost: k-grid (and cutoff) | balance scale: accuracy gem pan vs cost-pennies pan, a knob console with a k-grid pegboard |

## 4. Beat sheet (720 f)
| # | frames | concept | event → reaction | camera | out |
|---|---|---|---|---|---|
| S1 | 0–95 | manual DFT = an all-nighter; "describe what you want" | Hoot asleep, cheek on the sideways giant hourglass (zzz) → a lattice-doodle "?" bubble → take ('!' left of its head) → scribbles the question card and tosses it into the TRITONDFT tube (gulp, bulge shoots up) → stands the giant up (it pivots on its bottom cap) and flicks the tiny one on its book stack as a dare: **both clocks start on frame 70** | medium 3/4 on Hoot with the plate in frame, slow push; tilt up the tube | whip right chasing the bulge |
| S2 | 96–175 | **Planner** | the capsule pops out of the funnel; Tri catches it ('!'), reads the card held out beside its face, pulls a method book from the Library hub (turning only 3/4, never edge-on), chops the card into 3 tickets (▢→ vc-relax / two chasing dashed arcs = scf / ═ ═ band gap) and deals them to Clack | low on the funnel, crane down to Tri, truck right with the tickets | carry |
| S3 | 176–279 | **Executor** + HPC; what DFT computes | Clack types the QE input face-on, rips the sheet, feeds Big Iron, leaps onto the lever and hangs facing camera as it yanks down → **VROOOM** (one ink/cream impact frame); the output tape streams out; tilt down to the cell, camera locked (f248): it **relaxes** out from a bold dashed ghost of the unrelaxed cell and settles (vc-relax, f250–264), then flat sky-blue density lozenges **condense onto the 16 bonds** (scf, f264–280) | medium on Clack from just right of Loupe → crash pull-back to a low dutch wide on the roar → tilt down to a locked close-up of the cell | whip pan left across the room (f280–292, smear + speed lines) |
| S3b | 280–319 | the race: manual steps take hours | the whip lands low at the desk edge: Hoot, the giant and the tiny hourglass side by side; the gust ruffles Hoot, it turns ONE page (cube → the honeycomb underneath: still not silicon); the tiny is visibly draining, the giant has a pinch | low, close, the tiny hourglass sharp in the foreground; slow push | Hoot glances right; fast whip across the room to Loupe |
| S4 | 320–383 | **Analyzer**: convergence check fails | Loupe reads the tape at its feet (its eye balloons in the lens), turns to the ΔE gauge beside it: the bead boings and settles outside the tolerance band → spiral eye, sweat, ✗ beside the job | Loupe and the gauge side by side, lens 3/4 to camera; slow push | the lens rushes at the camera, an inked iris closes on it and opens on Tilt's k-grid knob |
| S5 | 384–459 | **Refiner**: Pareto accuracy vs cost | Tilt, face to camera, nods into the console at each click: the vermilion-peg pegboard goes 3×3 → 4×4 → 5×5, the accuracy gem grows, pennies plink into the cost pan one by one (2 → 4 → 6); at 5×5 the cost pan crashes (**CLANK!** in cream) → wobble → back off to 4×4 (two pennies flicked off: four left) and nudge the cutoff → the beam levels → GO | console, Tilt, both pans and the waiting job left to right; slow push, the roll follows the beam | GO kicks the orbit |
| S6 | 460–507 | the loop iterates, round a shared knowledge base | the ring carries the job a full lap round the Library (Tri's book slot visible): Tri salutes, the engine huffs and the cell re-settles, back to Loupe | the camera trails the job on a high circle round the bench (clear of Big Iron) | a 20-frame smeared brake onto the gauge (f494–514) |
| S7 | 508–575 | **Analyzer**: converged + band gap; results go back | Loupe reads again: the bead settles inside the band, beside a dashed ghost ring of lap 1's resting spot → **DING!** (an inked burst beside the gauge, never over the bead) and a ✓ beside the job; band-gap planks spring up over the cell (valence below, conduction above, empty gap); the ring brings the result to the funnel and the tube sucks it up | over the gauge → level with the planks → ride with the job → look up as the funnel gulps it | whip left chasing the return bulge |
| S8a | 576–623 | end-to-end: publication-ready result delivered | at the desk the result pops out of the tube into Hoot's wings **the instant the tiny hourglass runs dry** (TINK!); Hoot's big take (glasses fly, '!' left of its head, tufts up); the agents pop out in loop order, Loupe bringing its blank DFTBench scorecard | medium on Hoot and both hourglasses; a push in on the hourglasses as the last grain falls | pull back for the slams |
| S8b | 624–683 | **DFTBench: 98% · 68× · $0.04** | three slams 8 f apart, one tight row of extruded numerals: Loupe stamps its scorecard on an easel and ticks ripple across the many material doodles (one faint ✗) → **98%**; **68×** drops out of the tube with Clack riding it (Clack hops onto the paper tower to photobomb), the giant hourglass visible behind it; Tilt tips its pan → **$0.04**. Hoot holds the result at its chest, eyes melting into relief | tight desk-top frame (desk edge low, faces above the numerals), a shake per slam, slow arc | continuous |
| S9 | 684–719 | the researcher gets its night back | the numerals pop into cream clouds; the agents crouch and dive back into the tube one by one, 5 f apart (Loupe takes the scorecard); Hoot yawns, lays the giant down (the over-tilt pours the pinch back) and flops onto it, zzz | settles onto frame 0's pose | seamless |

## 5. Honesty notes
- **68×** = faster than manual. Same-shape hourglasses, volume ratio exactly 68; both start on the same frame with the
  same neck (same stream width); when the tiny one is empty (the answer arrives) the giant has drained exactly one
  tiny load. No clock times written.
- **98%** = DFTBench pass rate: a scorecard of many small material doodles that arrives blank with Loupe and is stamped
  full of ticks in the payoff (uncountable, one faint ✗), never on the Si result. **$0.04** = exactly four pennies, the
  ones the Refiner settled on (six at the too-fine 5×5 grid).
- DFT = electronic structure: uniform breathe-and-settle of the cubic cell against a ghost of the starting cell (lattice
  relaxation, exaggerated to ~12% so it reads), symmetric bond-centred density drawn as flat lozenges on the 16 bonds (scf,
  shown only in S3), band gap as two levels with an empty gap (no value). The gauge is labelled ΔE: it measures the change
  between iterations against a tolerance band, not a target value. Convergence = change within a
  tolerance band. Nothing reacts or glows glassy. The failed first lap illustrates "iterate until converged".
