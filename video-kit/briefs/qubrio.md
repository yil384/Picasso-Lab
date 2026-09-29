# Brief — Qubrio (3D comic film)

Read `../README.md` first. Qubrio is the series' flagship: two earlier Qubrio films are your direct starting material.

## Series slot
- Accent colour: **violet `#7c3aed`** (the card's accent on the Projects page). Card copy today: "A multi-agent LLM compiler for
  neutral atom quantum computers. Specialized agents handle qubit placement, atom routing, and schedule optimization — achieving
  4.7× hardware runtime reduction over state-of-the-art baselines."
- World: a neutral-atom quantum processor as a 3D comic set (trap arrays, laser tweezers, zones) — light sci-fi, base 3D comic.

## Where you start (this is a continuation, not a blank page)
- `../reference/style-comic/` is **a Qubrio film in the look the user chose** — but the user said its content was chaotic and
  unrelated to the project ("这个展示的内容太混乱了，和这个project有关系吗？").
- `../reference/story-picturebook/` is **a Qubrio film whose story the user praised** as more informative and accurate ("不如水彩绘本展示
  的有信息量和准确"): compass = placement agent, toy train on tracks = routing agent moving whole rows without crossing (a convoy!),
  pocket watch = scheduler/optimizer, snail = the slow baseline, payoff 4.7×.
- `../reference/round1-notes.json` has reviewers' must-fix notes on **both** films (physics and style). Fix all of them.
- Goal: **the comic look + a story at least as informative and accurate as the picture book, and better told** (up to 30 s allowed).
  Reuse code from both scenes freely (the picture book's `qb_world.js` / `qb_anim.js` cast and timeline; the comic scene's NPR look,
  ink and SFX).

## Facts (from the project site, `../reference/site-qubrio.txt`)
- **Qubrio: High-Performance Quantum Compilation via Multi-Agent LLM Collaboration.** An agentic compiler for **neutral-atom** quantum
  computers built on a **three-level decomposition**: (1) **input** — the program is split into sequential **CZ stages**; (2) **task**
  — specialised agents: **Placement**, **Routing**, **Optimize**; (3) **feedback** — deterministic **verifiers** localise exactly which
  constraint failed at which step (collisions, adjacency, crosstalk, AOD crossings, trajectory conflicts), so agents fix precisely.
- **Placement agent**: maps qubits to traps per stage so **CZ pairs sit within interaction distance r** and **non-interacting pairs stay
  farther than r** (no crosstalk).
- **Routing agent**: plans discrete **AOD** moves that shuttle atoms while respecting hardware rules: **AOD rows and columns can stretch
  or contract but never cross**, speed is bounded (to avoid losing atoms), and each **SLM↔AOD transfer** costs fidelity.
- **Optimize agent**: iteratively improves the schedule against a hardware simulator; accepts a change only if it improves runtime or
  fidelity without hurting the other.
- **Convoy-style shuttling** (the discovery): instead of moving qubits one by one along shortest paths, the agent **groups qubits with
  compatible trajectories into a convoy that moves in lockstep** (sometimes using buffer positions to line them up) — up to **30.3 qubits
  per AOD move vs 1.7** for prior compilers (GHZ-78).
- Results: **4.7× lower hardware runtime** and **1.3× higher fidelity** than **PowerMove**, the state-of-the-art neutral-atom compiler;
  adapts to new hardware (parallel AODs, zoned architectures) via prompt updates.
- Hardware picture: atoms sit in a static **SLM** trap array; **AOD** mobile traps pick them up and shuttle them into interaction distance;
  a **Rydberg** pulse over the entanglement zone performs the CZ gates on atoms that are close; zoned architecture (storage / entanglement).

## Accuracy pitfalls (from the reviewers)
- The Rydberg pulse is **global over the entanglement zone** — not a narrow pillar that looks like addressing one pair.
- Distance encodes interaction: paired atoms close, everyone else clearly apart; show pair geometry correctly.
- Rows/columns move together and never cross; a convoy is many atoms in one synchronized AOD move.
- Numbers: 4.7× runtime and 1.3× fidelity vs PowerMove; 30.3 vs 1.7 qubits per AOD move — use only these.
