# Brief — TritonDFT (3D comic film)

Read `../README.md` first. This file gives the facts and a direction; the story is yours to make great.

## Series slot
- Accent colour: **sky blue `#0284c7`** (the card's accent on the Projects page). Card copy today: "A multi-agent AI system that
  automates Density Functional Theory (DFT) calculations in materials science. Four specialized agents — Planner, Executor, Analyzer,
  Refiner — reduce per-step time from hours to seconds."
- Suggested world (you may improve it): a **sci-fi materials-lab comic** — crystal lattices you can walk through, an HPC machine as
  a roaring engine, electron clouds as soft halftone glows. Sci-fi flavour is welcome here, but the base is 3D comic.

## Facts (from the project site, `../reference/site-tritondft.txt`; don't invent anything beyond these)
- **TritonDFT** is a **multi-agent LLM framework that automates Density Functional Theory end-to-end**: describe what you want in
  plain language, get publication-ready results. UC San Diego × UC Merced × Los Alamos National Laboratory.
- **Four-agent Plan–Execute–Refine loop** sharing a knowledge base and task-specific tools, iterating until the result converges:
  - **Planner** — decomposes the natural-language query into computational steps, selects DFT methods, maps tasks to executables.
  - **Executor** — generates **Quantum ESPRESSO** input files, launches **HPC jobs**, streams output back to the loop.
  - **Analyzer** — parses results, **validates convergence**, computes properties (**band gap, lattice constants, forces**).
  - **Refiner** — **Pareto-optimizes accuracy vs. cost**: adjusts cutoffs, k-grids and functionals iteratively.
- The problem: a survey of **19 PhD-level DFT researchers** — every manual step (searching structures, picking parameters, writing
  scripts, launching jobs, parsing output) takes minutes to hours. TritonDFT takes each step from minutes-to-hours to seconds-to-minutes.
- Numbers (DFTBench, the team's benchmark): **98% pass rate**, **68× faster than manual**, **$0.04 average cost per material**.
- Example run on the site: **Silicon vc-relax → scf → band gap**. Other demo materials: graphene, iron (magnetic), TiO₂.

## Story seeds (pick, combine or replace)
- A researcher's all-nighter (hours per step, piles of input files) vs the four agents doing the same run in seconds.
- One material's journey: "silicon band gap?" → the Planner draws the plan → the Executor writes the input deck and fires the HPC
  engine → the Analyzer checks convergence and reads the band gap → the Refiner tunes the k-grid/cutoff dial for accuracy vs cost → converged.
- Visual metaphors that stay faithful: silicon's diamond-cubic lattice, graphene's honeycomb, a band-gap "jump" between two bands,
  convergence as a wobbling value settling to a line.
- Payoff: 98% · 68× · $0.04 per material (one big comic moment; don't clutter it).

## Accuracy pitfalls
- DFT computes **electronic structure of materials** (energies, band structure, forces) — not chemical reactions or molecules bonding.
- Keep the four agent roles distinct and in the right order (Plan → Execute → Analyze → Refine, looping until converged).
- Use crystal structures that match the named materials; don't invent new numbers or claims.
- The old Gemini prompt (`projects/tritondft/prompt_tritondft.md`, morphing glassy crystals) is what we are replacing — don't repeat it.
