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
