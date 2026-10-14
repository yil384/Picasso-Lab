# CSE 291P Quantum Computing Systems explainers: the episode queue

Planned 2026-10-14 from every machine transcript and slide contact sheet in `course-qc/` (17 recordings of Prof. Yufei Ding's own lectures: 2025 L1-L11 and 2024 L4, L5, L8, L9, L11, L13; the slide-only 2024 decks L1-L3; her typed notes for 2024 L3, L4, L5, L8, L13 and 2025 L5). The machine-readable queue is `syllabus-qc.json` (same order, same content, same entry shape as `syllabus.json` plus `sources`, `clip_candidates`, `merge_2024`, `avoid`, `unit`). Same channel, look and pipeline as the LLM-systems series (`SYLLABUS.md`); this file does not change that queue.

Conventions. Lecture ids: `Q25-NN` = 2025 lecture NN, `Q24-NN` = 2024 lecture NN (`course-qc/<id>.*`, git-ignored, never committed). Times are mm:ss of `course-qc/<id>.mp4`. Slide labels: `p8` = page 8 of the lecture's PDF deck (`<id>.pdf`), `s12` = cut frame `<id>.slides/s012.png`, `Q24-03.notes p2` = page 2 of a typed-notes PDF. Most Q25-10 frames are pages of `Q24-09.pdf` (s2=p1, s5/s6=p2, s7=p3 ... s29=p21): tape the clean deck page. Status: all `queued` (Prof. Ding's own lectures, cleared for her voice and slides). `planned_date` is empty: dates are set when the queue is scheduled (open question 1). Every number below is a planning note: nothing goes on screen until the episode's `FACTS.md` clears it. Clip windows come from the machine transcript and are approximate: re-cut with `daily/clips.py words`, check by ear, use her voice only (the Zoom and classroom recordings contain student questions and names: never in a clip).

## Totals

- Parts: 45 in 9 units, 292 min of film (average 6.5 min, range 5-8).
- Primary source: 2025 for 42 parts; 2024 for 3 (where 2024 is the only or the clearer source: phase kickback, mixed states and phase, the closing outlook). 2024 material (recordings, typed notes or deck pages) is used in 39 parts; the `2024 merge` line of each part says what it adds.
- Every part has a hook puzzle, sources with time windows, slides to tape, 2-5 clip candidates, facts to check and an avoid list.

## The queue

| # | ID | Title | Min | Primary | Slides | 2024 merged |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | QC01-01 | From Two Qubits to a Thousand | 5 | Q25-01 | 8 | yes |
| 2 | QC01-02 | The Perfect Computer: What Would It Be Good For? | 5 | Q25-01 | 9 | yes |
| 3 | QC01-03 | Noise Killed Analog Computers. Why Not Quantum Ones? | 7 | Q25-01 | 9-10 | yes |
| 4 | QC01-04 | Billions of Dollars, Twenty Years, No Guarantee | 7 | Q25-01 | 11-12 | yes |
| 5 | QC01-05 | The 53,000x Lesson: Software Doubles a Quantum Computer | 5 | Q25-01 | 13-14 | yes |
| 6 | QC01-06 | A Memory Hierarchy for Qubits | 7 | Q25-01 | 15-17 | yes |
| 7 | QC02-01 | Inside a Superconducting Qubit | 7 | Q25-02 | 4-12 | yes |
| 8 | QC02-02 | Not All Qubits Are Equal | 5 | Q25-02 | 13-15 | yes |
| 9 | QC02-03 | Why a Chip Speaks Only a Few Gates | 7 | Q25-02 | 16-18 | yes |
| 10 | QC02-04 | Qubit Mapping Is Register Allocation | 6 | Q25-02 | 19-22 | yes |
| 11 | QC02-05 | SABRE: Plan the Start by Running Backwards | 6 | Q25-02 | 23-25 | - |
| 12 | QC03-01 | A Quantum Compiler, Pass by Pass | 5 | Q25-03 | 2-8 | yes |
| 13 | QC03-02 | Same Gate, Two Recipes | 7 | Q25-03 | 9-13 | - |
| 14 | QC03-03 | Why IBM Made Its Chips Sparser | 8 | Q25-03 | 15-20 | yes |
| 15 | QC03-04 | Twenty-Five Qubits to Make One | 6 | Q25-03 | 21-24 | - |
| 16 | QC03-05 | Stitching a Surface Code onto a Sparse Chip | 6 | Q25-03 | 25-28 | - |
| 17 | QC04-01 | The Instruction Set of a Quantum Computer | 5 | Q25-04 | 2-6 | yes |
| 18 | QC04-02 | A Qubit Is a Complex Arrow | 8 | Q25-04 | s3-s20 | yes |
| 19 | QC04-03 | Two Qubits, Four Numbers: Product vs Entangled | 7 | Q25-04 | s21-s42 | yes |
| 20 | QC04-04 | Spooky, But Not a Telephone | 7 | Q25-04 | s38-s39 | yes |
| 21 | QC05-01 | Why AND Is Not a Quantum Gate | 5 | Q25-05 | s1-s10 | yes |
| 22 | QC05-02 | X, Z and the Hadamard Bridge | 7 | Q25-05 | s11-s16 | yes |
| 23 | QC05-03 | Rotations, and Why the T Gate Is Expensive | 7 | Q25-05 | s17-s27 | yes |
| 24 | QC05-04 | CNOT, Entanglement, and the Copy Machine That Can't Exist | 8 | Q25-05 | s28-s34 | yes |
| 25 | QC05-05 | Rewriting Gates: Flipped CNOTs and Free SWAPs | 7 | Q25-06 | s10-s28 | yes |
| 26 | QC05-06 | Building Bigger Gates: Parity Rotations and Toffoli | 7 | Q25-06 | s29-s48 | yes |
| 27 | QC06-01 | The Same Matrix, as a Gate and as a Measurement | 6 | Q25-07 | s2-s17 | yes |
| 28 | QC06-02 | Asking Two Qubits If They Agree | 7 | Q25-07 | s18-s37 | yes |
| 29 | QC06-03 | Teleportation, and Computing by Measuring | 8 | Q25-07 | s39-s54 | yes |
| 30 | QC06-04 | Mixed States and the Two Kinds of Phase | 6 | Q24-08 | s70-s85 | yes |
| 31 | QC07-01 | Can a Quantum Computer Do Everything Your Laptop Does? | 7 | Q25-08 | s1-s38 | yes |
| 32 | QC07-02 | Quantum Garbage Collection: Uncomputation | 6 | Q25-08 | s40-s66 | yes |
| 33 | QC07-03 | Oracles and Phase Kickback | 6 | Q24-13 | s39-s77 | yes |
| 34 | QC07-04 | Superposition Is Not Enough: Interference | 6 | Q25-08 | s75-s82 | yes |
| 35 | QC07-05 | One Question Instead of Half the Book | 7 | Q25-09 | s21-s37 | - |
| 36 | QC07-06 | Simon's Algorithm: Catching a Hidden Pattern | 7 | Q25-09 | s38-s51 | - |
| 37 | QC08-01 | Three Copies and a Vote | 6 | Q25-10 | s3-s9 | yes |
| 38 | QC08-02 | Measure the Error, Not the Data | 8 | Q25-10 | s10-s21 | yes |
| 39 | QC08-03 | Phase Flips and Shor's Nine-Qubit Code | 7 | Q25-10 | s22-s30 | yes |
| 40 | QC08-04 | How Quantum Errors Go Digital | 6 | Q25-11 | s4-s5 | yes |
| 41 | QC08-05 | Which Errors a Code Can Catch | 8 | Q25-11 | s12-s21 | yes |
| 42 | QC08-06 | Five Qubits Is the Minimum | 6 | Q25-11 | s6 | yes |
| 43 | QC08-07 | Borrowing Classical Codes: CSS and the Steane Code | 6 | Q25-11 | s25 | yes |
| 44 | QC08-08 | Fault Tolerance: When the Fixer Is Broken Too | 6 | Q25-11 | s26-s29 | yes |
| 45 | QC09-01 | What Could Still Go Wrong, and What to Work On | 6 | Q24-13 | s82-s83 | yes |

## QC01 - Why now, and what is next (her top-down introduction, part 1)

### QC01-01 - From Two Qubits to a Thousand

5 min, math none, primary Q25-01 slides 8, status queued. Needs: nothing.

**Core idea.** For about seventeen years a quantum computer meant a handful of qubits in one physics lab; in the last nine or so years chips grew past a thousand qubits, real machines became reachable over the cloud, and the field split into competing technologies (superconducting circuits, trapped ions, neutral atoms, photons, silicon spins), which is why it now needs computer scientists.

- Her chart (p8): 1998-2015 a few qubits with lab-only access; then fast growth to more than a thousand qubits with cloud access; company roadmaps aim at about a million qubits (plans, label them as plans).
- Is a two-qubit machine even a computer? You can only test gates on it, and only its own lab can use it.
- Who builds with what: superconducting circuits (Google, IBM, Rigetti), silicon quantum dots (Intel, which can reuse chip-fab know-how), trapped ions (IonQ, Quantinuum), neutral atoms (QuEra, Pasqal), photons (PsiQuantum, Xanadu).
- Does every qubit need deep cold? Strictly only superconducting ones; the others use cooling and vacuum to cut noise (her answer to a question, 17:05-18:58).

**Hook.** For seventeen years a quantum computer meant a handful of qubits, often two, in a physics lab you had to work in. Nine years later chips passed a thousand qubits and anyone could run programs on real ones over the cloud. Is a two-qubit machine even a computer, and what changed?

**Sources.** Q25-01 11:32-19:10 (p8: hardware growth chart, cloud access, technologies, cold).

**Extra slides.** Q24-01 p7 (the 2024 version of the same chart (its top count is 433 qubits; the 2025 deck says 1,127): use the 2025 chart, note the update).

**2024 merge.** Q24-01 p7 is the same chart a year earlier (no recording of 2024 L1): only to show the count moved.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-01 11:37-12:05: "quantum hardware is really developing very fast, faster than expected"
- Q25-01 12:25-12:55: whether a machine with only two qubits can be called a quantum computer
- Q25-01 13:04-13:29: computers up to about a thousand qubits, all reachable through the cloud

**Tape.** Q25-01 p8 (cover the company-logo legend or redraw the chart as a plain rising band).

**Avoid.** p8 legend: company logos (third-party marks) - cover. Never name a lab or machine by country.

**Check first.**

- Top qubit counts by year: IBM Condor 1,121 qubits (2023) vs the slide's "1,127"; IBM Osprey 433 (2022).
- Million-qubit roadmaps: whose, and by when (plans, not results).
- Technology per company as of the check date (Intel silicon spin qubits; QuEra and Pasqal neutral atoms; IonQ and Quantinuum trapped ions; PsiQuantum and Xanadu photonic).
- Largest cloud-reachable machines (100-160-qubit chips) vs the 1,121-qubit research chip: she says ~1,000 qubits are all reachable via the cloud; soften to "real machines".

**Notes.** Opens the series. Visual: a desk-miniature timeline, a few lone qubits in a lab for 17 years, then a crowd. She also mentions a free-access offer from a cloud provider to her students: do not use.

### QC01-02 - The Perfect Computer: What Would It Be Good For?

5 min, math light, primary Q25-01 slides 9, status queued. Needs: QC01-01.

**Core idea.** The first wave of quantum computing (early 1980s) imagined a perfect, noise-free, huge quantum computer and asked what it would beat: simulating nature, because n interacting two-state particles need 2^n numbers on a classical machine, and classical problems with hidden structure such as factoring.

- Wave 1 assumption: unlimited qubits, perfect gates; is the machine even worth building? (19:28-20:45)
- Quantum data: n two-state particles need a state vector of 2^n numbers and 2^n x 2^n matrices to evolve classically (22:35-24:26).
- Classical data with hidden structure: factoring (21 = 3 x 7), the basis of much of today's encryption (21:44-22:35).
- Why classical simulation stops around 50 qubits even on supercomputers (56:38-57:05).
- Not every problem speeds up: a theme the series comes back to (QC07-01).

**Hook.** Describing 50 interacting electrons exactly on a classical computer takes about a quadrillion complex numbers. Add one electron and the count doubles. Nature does it effortlessly. Could a computer made of the same stuff?

**Sources.** Q25-01 19:28-24:54 (p9: wave 1, quantum data, factoring); Q25-01 56:06-57:33 (p12: her answer: classical simulation limit ~50 qubits).

**Extra slides.** Q24-01 p8 (same wave-1 slide (2024)).

**2024 merge.** None needed (2024 L1 has the same slide, no recording).

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-01 20:20-20:45: even if you can build that perfect machine, what applications benefit?
- Q25-01 23:31-24:26: her explanation of quantum data: a state vector of two to the n
- Q25-01 56:38-57:05: classical machines can only simulate about 50 qubits

**Tape.** Q25-01 p9.

**Avoid.** Encryption: keep it to "much of today's encryption"; no security or state framing.

**Check first.**

- 2^50 = 1.13e15; memory of a 50-qubit state vector (2^50 x 16 bytes ~ 18 PB).
- Origins: Feynman 1982 ("Simulating physics with computers"), Deutsch 1985; the slide marks 1983: say "the early 1980s".
- Shor 1994 for factoring; largest full state-vector simulations to date (~45-50 qubits).

**Notes.** Visual: a ledger whose pages double with each added particle.

### QC01-03 - Noise Killed Analog Computers. Why Not Quantum Ones?

7 min, math light, primary Q25-01 slides 9-10, status queued. Needs: QC01-02.

**Core idea.** Qubits fail roughly once every 100 to 1,000 operations, against something like once in 10^15 for classical logic; analog computers once looked more powerful than digital ones and died of exactly this kind of drift, but quantum computing survives because, although it computes like an analog machine, it can be error-corrected like a digital one: the second wave (mid-1990s) proved that below an error threshold, protection costs only polylogarithmic overhead.

- Gate errors 1%-0.1% vs classical hardware that almost never errs; classical machines correct errors too (24:54-27:19).
- The analog-computing story: a wire holding 0.4 drifts to 0.5 and nothing can tell (27:46-30:01).
- Her one-liner: computes like analog, corrects like digital (31:03-31:32).
- Threshold: below a noise level of roughly 1%-0.1% correction works, and today's devices are there (31:32-32:33).
- Repetition-code intuition: send 000 for 0, vote; full treatment in QC08-01 (33:00-33:54).
- Overhead is polynomial (polylog), the speed-up exponential, so it is worth paying (33:54-34:22).
- Why a value like 0.5 cannot just be sent and corrected (her answer, 35:42-36:42).

**Hook.** An analog computer can hold 0.37 on one wire; a digital one only 0 or 1. Analog lost anyway. A qubit holds a continuum of values too. Why is it not doomed the same way?

**Sources.** Q25-01 24:54-37:11 (p9-p10: noise, analog computing, threshold, overhead).

**Extra slides.** Q24-01 p9 (same slide (2024)).

**2024 merge.** Sets up QC08-04, which pays it off with Q25-11 15:12-16:37 and Q24-09 75:53-76:44.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-01 27:46-28:40: the analog-computing story: once seen as a replacement for digital
- Q25-01 31:03-31:32: "computes very like analog computing but the error correction ... is very similar to digital computing"
- Q25-01 33:54-34:22: polynomial overhead, exponential speed-up

**Tape.** Q25-01 p10.

**Check first.**

- Classical hardware error rates (~1e-15 per operation is her order of magnitude; find a source or say "almost never").
- Threshold theorem: Aharonov & Ben-Or 1997; Knill, Laflamme & Zurek 1998; Kitaev 1997; overhead O(n polylog(nT)) as on the slide.
- Threshold values depend on the code and noise model (surface code ~1%).

**Notes.** Visual: two dials drifting, one analog, one with click-stops.

### QC01-04 - Billions of Dollars, Twenty Years, No Guarantee

7 min, math light, primary Q25-01 slides 11-12, status queued. Needs: QC01-03.

**Core idea.** Factoring-scale machines need millions of qubits at 0.1-0.01% gate error, a bet nobody funds without milestones; so the third wave (from ~2015) showed small noisy chips beating classical machines on contrived random-circuit tasks, real but not yet useful, and today's fourth wave has three tasks: use noisy machines without error correction, build error-corrected ones, and scale up.

- Millions to billions of qubits needed for the wave-1 applications (37:11-38:10).
- The funding pitch nobody signs (37:43-38:40).
- NISQ: dozens to hundreds of noisy qubits, too few for even one well-protected qubit (38:54-40:40).
- Quantum-advantage experiments, e.g. a 53-qubit chip in 2019 on random circuits; why she crosses out "practical" (40:52-41:47).
- Wave 4 tasks: NISQ algorithms (variational, quantum ML), error-corrected machines with cheaper codes, scaling (fridge wiring, chiplets, distributed machines) (42:22-46:17).
- What error correction costs: about 500 physical qubits per logical one at distance 15 for ~1e-9 errors (her answer, 54:14-55:40).
- Honest limit (2024 deck p40): error correction assumes errors do not grow with qubit count, and bigger chips may lose quality.

**Hook.** The pitch: "Give me billions of dollars and twenty years. I can't guarantee it will work." Nobody signs. So what do you show them first?

**Sources.** Q25-01 37:11-46:17 (p10-p12: cost of wave 2, NISQ, advantage, wave 4); Q25-01 51:54-55:40 (p12: her answers: what we can solve today; QEC overhead).

**Extra slides.** Q24-02 p40 (what could make quantum computing fail (slide only, no recording)).

**2024 merge.** Q24-02 p40 adds the honest limit (no 2025 equivalent).

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-01 37:43-38:40: the billionaire pitch and why no one gives the money
- Q25-01 41:11-41:47: why "practical" is crossed out: "just some random circuits"
- Q25-01 54:40-55:40: distance-15 surface code ~500 qubits for ~1e-9

**Tape.** Q25-01 p12.

**Avoid.** Q25-01 p11 (photos of three advantage machines, one from a national lab): never tape or name; redraw as one generic chip. Q25-01 57:54-58:48 and Q24-02 p23/p41: the "race to the Moon" framing (a national race): never use. p12 cartoon of a person ("Our role?"): cover.

**Check first.**

- Google 2019 (Arute et al., Nature 574), 53 qubits, random circuit sampling (she says 2017: correct to 2019).
- Resource estimates for factoring (e.g. Gidney & Ekeraa 2021: ~20 million noisy qubits; newer estimates lower): give one sourced figure.
- NISQ term: Preskill 2018.
- Distance-15 surface code qubit count (rotated 2d^2-1 = 449) and its logical error rate depend on the physical rate: phrase as "hundreds of qubits".

**Notes.** Keep the wave timeline from QC01-02/03 as the visual spine.

### QC01-05 - The 53,000x Lesson: Software Doubles a Quantum Computer

5 min, math none, primary Q25-01 slides 13-14, status queued. Needs: QC01-04.

**Core idea.** Nobody programs a CPU in binary: the same matrix multiply runs 53,292 times faster going from plain Python loops to tuned, compiled code; on a real IBM quantum chip, software optimization lets programs about twice as large run usefully, and by her collaborators' account about half of the past decade's gain in runnable circuit size came from software.

- The matmul ladder: Python, Java, C, optimization flags, parallel loops, vectorization (59:52-61:17).
- "You cannot imagine a human programming in binary" (61:17-61:40).
- How a quantum program looks: wires are qubits, layers of two-qubit gates (61:41-62:38).
- Noise caps program size; with software optimization about 2x larger programs still give usable answers (63:31-64:26).
- Half from hardware, half from software (64:26-64:51); as hardware grows more complex, software matters more.

**Hook.** Same chip, same program, two compilers: one output is the answer, the other is noise. How much can software alone buy?

**Sources.** Q25-01 57:54-64:58 (p13-p14: role 1: software stack).

**Extra slides.** Q24-01 p12-13 (same slides (2024)).

**2024 merge.** None needed.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-01 59:16-59:52: the software stack is key to supporting existing and future machines
- Q25-01 61:17-61:40: "you cannot imagine a human being directly programming in binary code"
- Q25-01 64:26-64:51: half of the improvement from hardware, half from software

**Tape.** Q25-01 p13 (keep the "Charles Leiserson, MIT 6.172" credit); Q25-01 p14 (cover the chip photo).

**Avoid.** Q25-01 57:54-59:16: starts with the "race to the Moon" remark: start clips after it. p14 chip photo is IBM's: cover.

**Check first.**

- 53,292x: MIT 6.172 (Fall 2018) lecture 1, 4096x4096 matmul on an Intel Xeon E5-2666 v3; Leiserson et al., Science 2020 has 62,806x for a newer setup: say which.
- "2x larger" and "half from software" are her report of IBM collaborators' internal data: attribute, do not present as published.

**Notes.** Visual: a staircase of bars on a log scale, then the same idea for a quantum chip.

### QC01-06 - A Memory Hierarchy for Qubits

7 min, math none, primary Q25-01 slides 15-17, status queued. Needs: QC01-05.

**Core idea.** Classical computers mix fast, small, costly memory with slow, big, cheap memory; today's quantum chips are "all registers", one technology in one layer, and scaling may need a heterogeneous design (fast superconducting qubits as registers, slower but scalable atoms or ions as storage, photons as interconnect), with software gluing together technologies, encodings and models of computation; the classical playbook gives the direction, the details are rebuilt for quantum.

- A huge design space and no clear winner among technologies (65:00-66:18).
- The memory-hierarchy analogy: registers, cache, RAM, disk working together (66:18-67:35).
- Horizontal scaling = more of the same qubits, all registers (68:24-69:18).
- Vertical scaling: superconducting ~ registers (10-100 ns gates), ions and atoms ~ disk (slow, scalable), photons ~ interconnect (69:18-70:28).
- Moving a qubit between technologies (transducers) moves it, it does not copy it (her answer, 72:16-73:59).
- Three axes a compiler must face: encoding (qubits, qudits, continuous variables), technology, model of computation (gates, measurement-based, analog) (Q25-03 30:56-34:24).
- Per-technology trade-offs: photons fly but hardly interact; manufactured qubits are tunable but unequal; atoms are identical (Q24-05 42:21-44:56).
- Her research map and philosophy: classical system ideas give the direction, abstractions and solutions evolve (70:29-71:47, 74:54-75:20).

**Hook.** Your laptop never keeps all its data in registers. Every quantum computer today does. Is that why they are so hard to scale?

**Sources.** Q25-01 65:00-75:42 (p15-p17: role 2: design space, hierarchy, research map); Q25-03 30:56-34:24 (p14: three axes: encoding, technology, model); Q25-02 13:54-15:43 (p9: qutrits, qudits, oscillator modes); Q24-05 42:21-44:56 (s58: technology trade-offs (2024)).

**Extra slides.** Q25-03 p14 (the three axes); Q24-01 p14-16 (same role-2 slides (2024)).

**2024 merge.** Q24-05 42:21-44:56 explains the technology trade-offs better than 2025.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-01 66:45-67:35: classical computing integrates memories instead of relying on one
- Q25-01 69:18-70:09: ion trap and neutral atom like a disk, superconducting like a register
- Q25-01 74:54-75:20: high-level classical philosophy drives quantum; details differ
- Q24-05 43:57-44:56: each technology a different trade-off; no clear winner

**Tape.** Q25-01 p15; Q25-01 p16; Q25-01 p17; Q25-03 p14.

**Avoid.** Q25-01 73:59-74:26: a government funding call: skip. Q24-05 45:24-45:50: a remark about a named startup: never use.

**Check first.**

- Gate times on p16 (ions 1-100 us, superconducting 10-100 ns, photonic ~1 ns): check.
- Quantum transducers (microwave-optical) as an active research area.

**Notes.** This part absorbs the "many ways to build a quantum computer" material of Q25-03 p14 so QC03 can stay on compilers and chips.

## QC02 - Real hardware and its three constraints (top-down, part 2)

### QC02-01 - Inside a Superconducting Qubit

7 min, math light, primary Q25-02 slides 4-12, status queued. Needs: QC01-06.

**Core idea.** A superconducting qubit is a manufactured circuit, a Josephson junction plus a capacitor, whose unevenly spaced energy levels let a microwave pulse address only 0 and 1; single-qubit gates are shaped microwave pulses, a two-qubit gate needs a coupling resonator between the pair, and measurement reads a neighbouring resonator, so the chip's wiring fixes which pairs can ever interact.

- Reading a quantum program: wires are qubits, boxes gates, meters measurements, double lines classical bits (05:29-07:15).
- The transmon: without the junction the levels are evenly spaced and a pulse meant for 0->1 also drives 1->2 (10:31-12:52).
- Why only two levels: qutrits and qudits exist, but the cost outweighs the benefit (14:44-15:43).
- Manufactured qubits vs natural atoms and ions (17:51-18:38).
- Single-qubit gate = microwave pulse through a resonator; lasers for ions and atoms (18:38-21:29).
- Two-qubit gate needs a resonator between the pair; no resonator, no gate (22:02-25:24).
- Measurement: probabilities |alpha|^2, |beta|^2, read through a resonator; interference picture (25:27-27:36).
- This much physics is enough for system design (27:36-28:12).

**Hook.** An ordinary oscillator, a mass on a spring in circuit form, has evenly spaced energy levels, and that makes it useless as a qubit. Why, and what one strange part fixes it?

**Sources.** Q25-02 05:26-28:12 (p4-p12: circuit basics, transmon, gates, measurement).

**Extra slides.** Q24-01 p18-26 (same slides (2024, no recording)).

**2024 merge.** None needed.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-02 11:54-12:25: why equal energy gaps are a problem for control
- Q25-02 17:51-18:21: a manufactured, artificial qubit vs natural atoms
- Q25-02 27:36-28:12: abstraction of gates and connections is good enough for system design

**Tape.** Q25-02 p4; Q25-02 p9 (cover the chip micrograph); Q25-02 p11 (cover the chip micrograph).

**Avoid.** IBM 5-qubit chip micrographs on p8-p12 are third-party: cover; redraw the circuit sketches if needed. Student questions in the Q&A (08:15, 12:25, 15:43, 16:34, 20:38, 24:10): never in clips.

**Check first.**

- Transmon (Koch et al. 2007); anharmonicity; leakage to |2>.
- Single-qubit drive and two-qubit coupling schemes on IBM chips (cross-resonance via bus resonators in older chips; tunable couplers in newer ones): keep generic.
- Ions: lasers or microwaves depending on species: say "often lasers".

**Notes.** One coherent "how the chip works" part; the math of states and gates comes in QC04-QC05.

### QC02-02 - Not All Qubits Are Equal

5 min, math light, primary Q25-02 slides 13-15, status queued. Needs: QC02-01.

**Core idea.** Every operation on today's chips is noisy (single-qubit gates fail around 1 in 1,000, two-qubit gates around 1 in 100 in her 2019 data), and because superconducting qubits are manufactured, quality varies from qubit to qubit, so a compiler should place the busiest program qubits on the best physical ones.

- Three constraints: noise, few native gates, sparse connections (28:13-28:56).
- The calibration table of a 5-qubit chip: two-qubit errors ~10x single-qubit ones (29:01-32:26); better today (32:00-32:54).
- "Not all qubits are equal": fabrication variation; ions and atoms are identical by nature (32:54-33:47).
- Noise-aware mapping: put heavily used qubits on good hardware (34:40-35:58).
- Why two-qubit gates are noisier: a qubit coupled to two neighbours leaks to the one it is not talking to, like a common friend (Q24-05 04:30-05:21).

**Hook.** On one five-qubit chip, some qubits' gates fail several times as often as others'. You have a one-qubit program. Where do you put it, and what if the program needs all five?

**Sources.** Q25-02 28:12-36:12 (p13-p15: noise table, variation, noise-aware mapping); Q24-05 04:03-05:43 (s4: why two-qubit gates are noisier (2024)).

**Extra slides.** Q24-01 p27-29 (same slides (2024)).

**2024 merge.** Q24-05 04:30-05:21 adds the crosstalk intuition 2025 lacks.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-02 32:54-33:47: "not all qubits are equal": manufacturing variation
- Q25-02 34:40-35:07: a compiler should prioritize the high-quality qubits
- Q24-05 04:30-05:21: A is a common friend between B and C and leaks the information

**Tape.** Q25-02 p13.

**Avoid.** p14-p15 table and coupling graph are from Murali et al. 2019: redraw as lettering with credit. Student question at 33:47-34:40: her answer only.

**Check first.**

- Error figures from the table (Murali et al., ASPLOS 2019, "Noise-adaptive compiler mappings"); typical two-qubit errors today (best ~0.1-0.5%).

**Notes.** Visual: five figurines, two of them wobbly.

### QC02-03 - Why a Chip Speaks Only a Few Gates

7 min, math light, primary Q25-02 slides 16-18, status queued. Needs: QC02-02.

**Core idea.** Each native gate needs its pulse calibrated and recalibrated as the chip drifts (machines go offline for hours), so hardware supports only a few gates and different technologies pick different ones; the compiler rewrites everything else into them (gate synthesis, e.g. SWAP = 3 CNOTs, or an ion-trap gate into CNOTs), and choosing the native set trades calibration cost against longer programs.

- Infinitely many gates in principle, few natively (36:15-37:11).
- Calibration: online for hours to a day, then offline for hours to re-tune pulses (37:26-38:50).
- Native sets differ: Molmer-Sorensen / XX on ions, cross-resonance on IBM, others on Rigetti; software-visible gates are a bigger set (39:38-41:36).
- Gate synthesis: CNOT <-> MS gate (41:52-43:15).
- n-qubit gates are 2^n x 2^n matrices; SWAP = three CNOTs as a matrix product (43:39-45:05).
- Universality: single-qubit gates plus one entangling gate run any program (45:31-46:22; Q&A 52:00-52:59, her answer).
- The trade-off: a bigger native set means shorter programs but more calibration (57:26-58:59).
- What is a good gate set? Calibrating continuous rotations, Z as four T gates vs a native Z, the matrix-unit idea in ML accelerators (Q24-04 58:08-61:19); co-design loop like RISC and CISC (Q24-05 33:43-35:34).

**Hook.** A program written for an ion trap lands on a superconducting chip that cannot run its two-qubit gate. Can it run at all, and what does the translation cost?

**Sources.** Q25-02 36:12-46:38 (p16-p18: native gates, calibration, synthesis, universality); Q25-02 52:00-58:59 (p18, p17: her answers on universality; native-set trade-off); Q24-04 58:08-61:19 (s37: research problem: what makes a good universal gate set); Q24-04 65:35-67:25 (s37: theory vs system metrics); Q24-05 33:43-36:13 (s47: hardware-software co-design loop).

**Extra slides.** Q24-01 p30-31 (same slides (2024)).

**2024 merge.** Q24-04 and Q24-05 add the "good gate set" research question and the co-design loop.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-02 37:26-37:54: machines go offline for hours: calibration
- Q25-02 45:56-46:22: universal: any program can potentially run on the hardware
- Q25-02 58:25-58:59: enlarging the native set also comes with overhead
- Q24-04 66:33-67:25: "system optimization will kill ... a system is a little bit dirty, messy"
- Q24-05 34:36-35:34: reduced vs complex instruction sets: the same co-design story

**Tape.** Q25-02 p17; Q25-02 p18.

**Avoid.** p16 native-gate table (Murali et al.; university and company columns): redraw as lettering. Q24-04 / Q24-05 are in-person recordings with student questions: her lines only.

**Check first.**

- Calibration and downtime figures are her examples: phrase as typical, not exact.
- MS gate: one MS + single-qubit gates per CNOT; the gate counts drawn on p17 (1 vs 7).
- SWAP = 3 CNOTs.
- Universal sets: {H, T, CNOT} (Nielsen & Chuang 4.5).

**Notes.** Visual: a phrasebook with three entries and a translator.

### QC02-04 - Qubit Mapping Is Register Allocation

6 min, math light, primary Q25-02 slides 19-22, status queued. Needs: QC02-03.

**Core idea.** A two-qubit gate runs only on physically connected qubits, so the compiler maps program qubits onto the chip's coupling graph much as it allocates registers; when no mapping makes every gate local it inserts SWAPs (three CNOTs each), and since every extra gate adds noise, finding the fewest SWAPs, an NP-complete problem, can decide whether a program runs at all.

- Coupling graph from the chip's resonators (59:24-59:54).
- Like register allocation: limited connections instead of limited registers (61:22-62:16).
- A fully connected 4-qubit program on a 4-edge chip: no perfect initial mapping (62:26-64:14).
- SWAPs change the mapping as the program runs (64:35-65:51).
- Budget example: the chip gives usable answers up to ~200 gates; a 150-gate program plus 20 SWAPs (60 CNOTs) breaks it (66:18-67:45).
- Worked example from the 2024 deck: gates 6 -> 9, depth 5 -> 8 after one SWAP (Q24-01 p38).

**Hook.** Four program qubits all need to talk to each other. The chip has four qubits wired in a ring. Find a seating plan, or prove there is none.

**Sources.** Q25-02 58:58-67:52 (p19-p22: connectivity, mapping, routing, SWAP cost).

**Extra slides.** Q24-01 p34-38 (the mapping walk-through with gate count and depth (2024)).

**2024 merge.** Q24-01 p38 supplies a clean worked number (6 -> 9 gates).

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-02 61:22-62:16: very similar to the classical register allocation problem
- Q25-02 63:49-64:14: there will never be a perfect initial mapping
- Q25-02 66:18-67:16: the 200-gate budget example

**Tape.** Q25-02 p20; Q25-02 p21; Q25-02 p22; Q24-01 p38.

**Avoid.** p19 chip micrograph: cover.

**Check first.**

- NP-completeness of SWAP minimization (e.g. Siraichi et al. 2018).
- The 200-gate budget is illustrative: say so.

**Notes.** Visual: a dinner table seating plan with a waiter who swaps two guests.

### QC02-05 - SABRE: Plan the Start by Running Backwards

6 min, math light, primary Q25-02 slides 23-25, status queued. Needs: QC02-04.

**Core idea.** Her group's SABRE compiler (ASPLOS 2019) searches for SWAPs in a controlled look-ahead window, only among SWAPs that touch the blocked gates, and finds a good starting layout by compiling the circuit forward and then in reverse, so each run's final mapping seeds the next start; it cut gates by about 10% and compile time by about 1000x against the exhaustive method of the time and became the default mapper in IBM's Qiskit.

- Local vs global vs a controllable search region (68:43-70:25).
- Only "related" SWAPs; pick the one that shortens hop distances (70:25-71:27).
- Initial mapping matters most for shallow circuits (71:51-72:22).
- Reverse-circuit trick: a good final mapping is a good initial mapping (72:53-74:21).
- Random restarts to escape local optima (74:21-74:47).
- Results vs an exhaustive method (Zulehner et al.) (75:32-76:03).
- Learning-based mappers retrain per circuit and lag heuristics so far; search plus language-model agents is a direction (76:03-77:22, her answer).
- Adopted in industry tools (67:52-68:43, 77:22-77:55).

**Hook.** The best seating plan to start a program with is the one it ends with, if you run the program backwards. Why?

**Sources.** Q25-02 67:52-78:24 (p23-p25: SABRE).

**2024 merge.** None.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-02 67:52-68:43: SABRE became a default compiler in IBM's Qiskit
- Q25-02 73:21-73:53: a good final mapping is definitely a good initial mapping
- Q25-02 77:22-77:55: research can directly have industry impact

**Tape.** Q25-02 p23; Q25-02 p24; Q25-02 p25 (cover the logos).

**Avoid.** p25 IBM and QCOR logos: cover. The student question at 76:03 is read by her: fine to paraphrase, no student voice.

**Check first.**

- Li, Ding, Xie, "Tackling the qubit mapping problem for NISQ-era quantum devices", ASPLOS 2019; ~10% fewer gates, large speed-up vs Zulehner et al. 2018: take the numbers from the paper.
- Qiskit: SabreSwap / SabreLayout as defaults (which versions and optimization levels).
- Other compilers that use SABRE (she names a national-lab framework and a cloud vendor's compiler): verify or keep generic ("other compilers").

**Notes.** Her own paper: the episode can say "her group's compiler".

## QC03 - Compilers and chips, designed together; a first look at error correction (top-down, part 3)

### QC03-01 - A Quantum Compiler, Pass by Pass

5 min, math light, primary Q25-03 slides 2-8, status queued. Needs: QC02-05.

**Core idea.** Like classical compilers, quantum compilers split the work into passes, each answering one hardware limitation: unroll to one- and two-qubit gates, place qubits on good or well-connected hardware, add spare ancillas, insert SWAPs, translate to native gates; the open questions are better passes, their order, and co-design across them.

- Research problems come from hardware limitations, in classical and quantum computing alike (02:07-02:58).
- Two goals: write once, run on many chips; optimize for fidelity (04:39-05:46).
- Qiskit's passes: unroll (a matrix decomposition), initial layout on good qubits or dense links, extend with ancillas, SWAPs, unroll to the native basis (06:23-11:46).
- Every pass is driven by a hardware limit (11:46-12:12).
- How to improve a compiler: a better pass, co-design across passes, the order of passes (Q24-02 p8).

**Hook.** Write a five-qubit program once and run it on a dozen chips with different wiring and different native gates. What has to happen in between, and in what order?

**Sources.** Q25-03 01:34-12:12 (p2-p8: compiler goals and Qiskit passes).

**Extra slides.** Q24-02 p8 (how to improve the current compiler (slide only)); Q24-01 p39-42 (same Qiskit slides (2024)).

**2024 merge.** Q24-02 p8 adds the three directions for compiler research.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-03 02:07-02:32: research problems come from hardware limitations
- Q25-03 06:23-06:48: compilers are modular: a set of passes
- Q25-03 11:46-12:12: all passes are driven by the limitations of the hardware

**Tape.** Q25-03 p4; Q25-03 p5.

**Avoid.** p6-p8 show Qiskit source-code screenshots: redraw the pass list as lettering.

**Check first.**

- Current Qiskit preset pass-manager stage names (init, layout, routing, translation, optimization, scheduling) vs the older level3.py the slide links.

**Notes.** Short bridge part.

### QC03-02 - Same Gate, Two Recipes

7 min, math medium, primary Q25-03 slides 9-13, status queued. Needs: QC03-01.

**Core idea.** One multi-qubit gate (a rotation driven by the parity of several qubits) can be decomposed into equivalent CNOT patterns, a chain or a tree, with the same gate count but different depth and, more importantly, different SWAP needs on a given chip; choosing the decomposition with the mapping in view (her Paulihedral compiler, ASPLOS 2022) saves many gates in chemistry and physics simulation programs, at some cost in compile time.

- Two circuits, the same 16x16 matrix (12:37-14:22).
- Analogy: y = x*2 + 3 + t as two different three-address codes (14:22-15:50).
- Insight: CNOTs gather parity, R rotates by it, the mirror CNOTs undo it (16:46-18:07).
- Same seven gates; depth 7 vs 5 (18:39-19:34); gates vs depth more generally: N gates/depth N vs 2N-1 gates/depth 2logN+1 (Q25-04 p5, 08:12-10:12).
- On a real coupling graph: 3 SWAPs vs 1 for the same starting mapping (20:33-25:58).
- Modular passes vs co-design (23:09-23:34).
- Paulihedral results vs TKET; higher compile time (28:55-30:04); keep high-level structure through the compiler (30:36-30:56).

**Hook.** Two circuits compute exactly the same 16-by-16 matrix with the same seven gates. On a real chip one needs three SWAPs and the other needs one. A compiler that decides the circuit before it looks at the chip will often pick wrong. Which one?

**Sources.** Q25-03 12:12-30:56 (p9-p13: decomposition + mapping co-design, Paulihedral); Q25-04 07:10-10:12 (p4-p5: gate synthesis goal; gates vs depth trade-off); Q25-06 72:50-74:58 (s44: Pauli-string gates: exponential form vs circuit form).

**Extra slides.** Q25-04 p4-5 (synthesis goals); Q25-06 s44 (general exponential Pauli kernel).

**2024 merge.** None.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-03 14:22-15:22: the three-address-code analogy
- Q25-03 23:09-23:34: modular passes vs co-design
- Q25-03 25:32-25:58: both circuits are equivalent; choose the one the mapping favours

**Tape.** Q25-03 p9; Q25-03 p11; Q25-03 p12; Q25-04 p5.

**Avoid.** Student questions at 16:15, 24:03, 26:12, 27:05: her answers only.

**Check first.**

- Li, ..., Ding, "Paulihedral", ASPLOS 2022; gate and depth savings vs TKET from the paper.
- Her "adopted by IBM Qiskit" claim: verify the integration path or soften.
- Depth 7 vs 5 and 3 SWAPs vs 1 from the slides.

**Notes.** Light preview of parity gates; QC05-06 does them properly.

### QC03-03 - Why IBM Made Its Chips Sparser

8 min, math light, primary Q25-03 slides 15-20, status queued. Needs: QC03-02.

**Core idea.** Denser qubit connections mean fewer SWAPs, yet IBM's chips went sparse, dense, then sparse again, because each extra link raises the chance that two coupled qubits' manufactured frequencies collide (frequencies must differ to avoid crosstalk yet be close for fast gates), killing fabrication yield; one way out is application-specific chips that add dense links only where the target program needs them (her ASPLOS 2020 design flow).

- Which layout is better? The denser one, obviously (40:43-42:29).
- IBM's trend: denser, then sparser (heavy-hex); Google keeps a 2D grid with four neighbours (42:42-44:55).
- Frequencies: too similar = crosstalk; too different = slow two-qubit gates (46:14-49:45).
- Fabrication spread turns a planned 12 into a 15: collisions make dead chips (50:10-51:04).
- How a dense link saves SWAPs; a 10-CNOT program can triple (55:31-57:07).
- General-purpose vs application-specific; "one good chip in 500" is her illustration (57:48-59:07).
- The design flow: profile the program, add links only as needed (59:20-60:39).
- Research advice: find the physical limitation, or improve a known solution (51:29-52:22).

**Hook.** Every extra wire on a quantum chip saves SWAP gates. So why did IBM's newer chips give each qubit fewer neighbours, not more?

**Sources.** Q25-03 39:22-60:44 (p15-p20: topology, yield, application-specific design).

**Extra slides.** Q24-02 p15-18 (same story with the frequency-collision slide (2024, no recording)).

**2024 merge.** Q24-02 p17 (fabrication difficulty) is the clearer slide; redraw it (third-party plots).

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-03 45:47-46:14: the final thing is fabrication yield
- Q25-03 53:45-54:13: frequency is like the fingerprint of each qubit
- Q25-03 51:29-52:22: two ways to do quantum research
- Q25-03 58:13-58:40: go for application-specific devices

**Tape.** Q25-03 p16; Q25-03 p19; Q25-03 p20.

**Avoid.** p15 smiley faces (clip art): cover. p17-p18 yield plots (Brink et al. 2018; Hertzberg et al. 2021): redraw. Student guesses at 45:27-45:47: her answer only.

**Check first.**

- IBM topology history (5-qubit bowtie, Tokyo, Falcon/Eagle heavy-hex, degree <= 3).
- Frequency-collision and yield papers: Brink et al. IEDM 2018; Hertzberg et al. npj QI 2021.
- Li, Ding, Xie ASPLOS 2020 (application-specific superconducting architecture).
- "One good chip in 500" is illustrative: do not caption as data.

**Notes.** Absorbs the application-specific part (planned separately at first) so one part holds the whole connectivity trade-off.

### QC03-04 - Twenty-Five Qubits to Make One

6 min, math light, primary Q25-03 slides 21-24, status queued. Needs: QC03-03.

**Core idea.** With 1% errors per CNOT a 70-CNOT program succeeds only about half the time, so error correction spends many physical qubits on one reliable logical qubit; the surface code, popular because its checks need only nearest neighbours on a 2D grid, uses 25 physical qubits at distance 3 (13 data, 12 parity-check) and 81 at distance 5, and in 2023 Google showed the bigger code making fewer errors.

- 0.99^70 ~ 50%: past a few dozen two-qubit gates, results look random (61:42-62:59).
- Error correction = redundancy, composed the quantum way (62:59-63:24).
- Surface code d=3: 25 qubits, 13 data + 12 checks, one degree of freedom left (63:54-66:30).
- Distance 3: an undetectable error needs three flips in a line (64:19-65:11).
- Each parity check is CNOTs, each CNOT needs a physical link: a 2D grid fits (66:30-69:36).
- d=5: 81 qubits; Google 2023 d=3 vs d=5 experiment (70:04-71:08).
- Scale: a distance-15 code is about 500 physical qubits (Q25-01 54:14-55:40).

**Hook.** At 1% error per CNOT, a 70-gate program is a coin flip. Spend 25 qubits to protect one, or 81 to protect it better. Where does the extra protection come from?

**Sources.** Q25-03 60:44-71:08 (p21-p24: why QEC, surface code, Google 2023); Q25-01 54:14-55:40 (p12: surface-code overhead at distance 15).

**2024 merge.** None (2025 L12 on surface codes is a student lecture: excluded).

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-03 62:33-62:59: 60-70 CNOTs: the result is already random
- Q25-03 69:11-69:36: parity check, CNOT, hardware coupling graph
- Q25-03 70:44-71:08: more qubits in the code, lower logical error: experimentally shown

**Tape.** Q25-03 p22; Q25-03 p23.

**Avoid.** p24 plot is Google's: redraw as two dots and a falling line. Student question at 67:26-68:45: her answer only.

**Check first.**

- 0.99^70 = 0.495 (she says 60 aloud; the slide says 70).
- Unrotated surface code: d=3 13+12 = 25; d=5 41+40 = 81; rotated: 17 and 49 (say which).
- Google Quantum AI, Nature 614 (2023), d=3 vs d=5; the later below-threshold result (Nature 2025, d=7) as an update.

**Notes.** The only surface-code part in the series (her later QEC lectures cover stabilizer codes); QC08 builds the theory under it.

### QC03-05 - Stitching a Surface Code onto a Sparse Chip

6 min, math light, primary Q25-03 slides 25-28, status queued. Needs: QC03-04.

**Core idea.** The surface code wants each check qubit wired to four data qubits, but heavy-hex chips offer at most three; instead of hand-inventing a new code for each layout, her group's Surf-Stitch compiler (ISCA 2022) automatically splits each four-way check across helper qubits while keeping the extra qubits (which can spread errors) few, matching hand designs on one layout and beating them on the hardest.

- The mismatch: a grid code on a sparse chip (71:08-71:36).
- Hand-designed codes for each architecture vs a compiler that bridges the gap (72:06-72:31).
- Error correction is redundant and approximate, so a check can be decomposed: one 4-degree node -> two 3-degree nodes (73:07-74:24).
- Fewer helper qubits: helpers can propagate errors into data (74:24-74:51).
- Thresholds on heavy-square and heavy-hex layouts vs expert designs (75:03-76:20).
- Humans set the abstraction, computers explore it (76:20-76:50).
- A logical grid on top of a physical graph (her answer, 76:50-77:16); the classical mindset helps (77:16-77:45); future: code design and mapping as compiler problems (p28).

**Hook.** The world's favourite quantum code needs four wires per check qubit. Your chip offers three. Throw the code away, or compile around the gap?

**Sources.** Q25-03 71:08-78:10 (p25-p28: Surf-Stitch).

**2024 merge.** None.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-03 73:07-73:33: QEC is like an approximate algorithm plus redundancy
- Q25-03 76:20-76:50: humans abstract; let the computer do the exploration automatically
- Q25-03 77:16-77:45: classical computing helps derive the high-level solution structure

**Tape.** Q25-03 p26; Q25-03 p27.

**Avoid.** Q25-03 71:36-72:06: a private conversation with a named researcher: never use. p25 company logos: cover.

**Check first.**

- Wu, ..., Ding, "Surf-Stitch", ISCA 2022: thresholds and qubit counts from the paper.
- IBM's hand-designed heavy-hex code: Chamberland et al., PRX 10, 011022 (2020).

## QC04 - Quantum states: the math (bottom-up starts)

### QC04-01 - The Instruction Set of a Quantum Computer

5 min, math light, primary Q25-04 slides 2-6, status queued. Needs: QC01-01.

**Core idea.** To program a machine you need its interface: data types, operations, and what you can read out; for quantum hardware the interface is three postulates (states are unit vectors in a complex vector space, gates are unitary matrices, measurements are Hermitian matrices), assumptions confirmed by a century of experiments that let computer scientists harness quantum mechanics without first mastering its physics.

- The ISA analogy: data types (even low-precision ML formats), arithmetic, control flow, memory; for quantum: valid states, valid gates, a universal set (00:40-05:39).
- That morning's Nobel Prize in Physics went to superconducting-circuit pioneers (01:06-01:35).
- Course goals: read the teleportation circuit; understand gate synthesis (05:46-10:12).
- Why a Hilbert space? "There's no why, it's our assumption", like Newton's laws (19:59-21:22); physics postulates vs mathematical proof (39:29-40:55).
- Understanding vs harnessing: quantum mechanics explains nature, quantum computing uses it; the farming and flight analogies; good abstractions, plus where physics gives shortcuts (Q24-02 p24-p31, slides only).
- The three postulates in one sentence (Q25-07 49:36-51:00).

**Hook.** To program a GPU you don't need semiconductor physics, you need its instruction set. What is the instruction set of a quantum computer, and who decided it?

**Sources.** Q25-04 00:38-10:42 (p2-p6: ISA analogy, Nobel, goals); Q25-04 19:02-21:52 (s7: Hilbert space as a postulate); Q25-04 39:29-40:55 (s21: physics vs mathematics); Q25-07 49:35-51:21 (s38: the three postulates summarized).

**Extra slides.** Q24-02 p24-31 (quantum mechanics vs quantum computing, analogies, "my perspective" (2024 L2, no recording)); Q24-03 p2 (same ISA slide (2024)).

**2024 merge.** Q24-02 p24-p31 is unique 2024 material (understanding vs harnessing); slides and narration only.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-04 00:40-01:06: the ISA as the key abstraction between hardware and software
- Q25-04 01:06-01:35: the Nobel Prize awarded that morning to quantum computing researchers
- Q25-04 20:04-20:57: "it's not why, it's our assumption", like the laws of motion
- Q25-07 50:02-50:54: not only can we predict the world, we can harness it

**Tape.** Q25-04 p2; Q24-02 p26; Q24-02 p31.

**Avoid.** Q24-02 p25 (group photo), p27 (farm photos), p28 (photos of a bird, early aircraft, an engine): third-party photos, never tape; redraw the idea. Q25-04 06:13-06:39: she asks a named student to mute: never in a clip. Q25-04 46:42-47:39: Einstein and "God" wording: skip.

**Check first.**

- 2025 Nobel Prize in Physics: John Clarke, Michel H. Devoret, John M. Martinis, "for the discovery of macroscopic quantum mechanical tunnelling and energy quantisation in an electric circuit" (announced 7 Oct 2025); her "two from UC Santa Barbara": check affiliations.
- Postulates of quantum mechanics as in Nielsen & Chuang 2.2.

**Notes.** Opens the bottom-up half of the course (she says the next lectures are the math).

### QC04-02 - A Qubit Is a Complex Arrow

8 min, math medium, primary Q25-04 slides s3-s20, status queued. Needs: QC04-01.

**Core idea.** A qubit's state is a unit-length complex vector alpha|0> + beta|1>; "superposition" only means something relative to a chosen basis (|+> is a superposition in the Z basis but a plain basis state in the X basis); the inner product measures overlap, so orthogonal states can be told apart in one shot while overlapping ones like |0> and |+> cannot; and measurement probabilities are squared amplitudes that add to 1 in any basis.

- Complex numbers matter because they allow interference (12:23-13:17, 17:09-18:07).
- Ket, bra, dagger: column vector, conjugate row vector, conjugate transpose (13:42-16:39).
- Z basis |0>, |1>; X basis |+>, |-> (22:19-24:57).
- Superposition is relative to a basis (24:57-25:48).
- Inner product; orthogonal = perfectly distinguishable; |0> vs |+> (26:55-31:33).
- Length 1 because probabilities add to 1 (33:42-34:52); measuring in the X basis still adds to 1 (35:20-38:21).
- Practice until it is mental arithmetic, like 8 + 3 (25:48-26:42).
- Distinguishing in one shot vs with many copies (Q24-08 70:00-72:49).

**Hook.** I hand you a qubit that is either |0> or |1>: one look tells you which. Now it is either |0> or |+>. You may look once. Why can't you always tell?

**Sources.** Q25-04 11:43-38:57 (s3-s20: complex numbers, bases, inner product, Born rule); Q24-08 69:54-72:49 (s84-s85: distinguishable states (2024)).

**Extra slides.** Q24-03.notes p1-4 (her typed notes for the same material: cleaner to tape than the handwriting).

**2024 merge.** Q24-03 typed notes replace handwriting on screen; Q24-08 adds the one-shot vs many-copies point.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-04 17:09-17:42: interference is driven by complex numbers
- Q25-04 24:57-25:48: superposition is always relative to some basis states
- Q25-04 29:56-30:55: measuring |0> vs |+> in the Z basis: you cannot distinguish
- Q25-04 25:48-26:16: like doing 8 + 3 in your head

**Tape.** Q24-03.notes p2; Q24-03.notes p3; Q25-04 s11; Q25-04 s14.

**Avoid.** Student questions at 18:07-18:37, 28:43-29:04: her answers only.

**Check first.**

- X-basis probabilities (alpha+beta)^2/2, (alpha-beta)^2/2 for real amplitudes (general: |alpha+beta|^2/2).
- Optimal one-shot discrimination of |0> vs |+> (Helstrom, ~85%) only if mentioned.
- Scott Aaronson's blog post on why amplitudes are complex: title and year.

**Notes.** Merges what was planned as two parts (bases; inner products) into one 8-minute part.

### QC04-03 - Two Qubits, Four Numbers: Product vs Entangled

7 min, math medium, primary Q25-04 slides s21-s42, status queued. Needs: QC04-02.

**Core idea.** n qubits live in a 2^n-dimensional space whose basis is the tensor products of single-qubit bases; a two-qubit state has four free amplitudes while two independent qubits only cover a constrained family, so most states are entangled, like the Bell state (|00>+|11>)/sqrt2, which cannot be written as one state per qubit.

- Tensor product; basis |00>, |01>, |10>, |11>; probabilities of each outcome (40:55-46:42).
- Measuring only qubit A: add the matching probabilities (48:09-49:27).
- Counting the basis: 2^n (52:09-54:27).
- Product state example: (|00>+|10>)/sqrt2 = |+>|0> (54:27-58:56).
- "Most states are entangled" (59:06-60:57).
- Bell state / EPR pair (63:04-64:45); the general n-qubit state (69:30-71:21).
- Exercise from her 2024 notes: write a program that tests product vs entangled.

**Hook.** Describing 300 qubits takes about 2 x 10^90 complex numbers, more than the atoms in the observable universe. Three hundred separate qubits take 600. Everything in between is entanglement.

**Sources.** Q25-04 38:57-71:21 (s21-s42: n-qubit states, product vs entangled, Bell state).

**Extra slides.** Q24-03.notes p4-6 (typed notes: tensor products, product vs entangled, exercise).

**2024 merge.** Q24-03 typed notes for clean pages and the programming exercise.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-04 54:35-55:01: entanglement, one of the most famous concepts in quantum computing
- Q25-04 59:06-59:37: interesting quantum phenomena come from entangled states
- Q25-04 60:57-61:23: a much larger space than the tensor product

**Tape.** Q24-03.notes p5; Q25-04 s32; Q25-04 s38.

**Avoid.** Student dialogue 49:27-52:38 and 63:36-64:29: her answers only.

**Check first.**

- 2^300 = 2.04e90; ~1e80 atoms (estimate); a product state of n qubits: 2n complex numbers (or 2n real parameters up to phase: say "a few hundred numbers").

### QC04-04 - Spooky, But Not a Telephone

7 min, math light, primary Q25-04 slides s38-s39, status queued. Needs: QC04-03.

**Core idea.** Measure one half of a Bell pair and the other half's result is fixed however far away it is, which troubled Einstein; yet no message travels, because each side alone sees fair coin flips; what entanglement does buy is real: in the CHSH game, players who win at most 75% classically win about 85% with a shared pair (the kind of Bell test behind the 2022 Nobel Prize), and one entangled qubit can carry two classical bits (superdense coding).

- Alice in California, Bob in New York, a shared Bell pair (64:53-65:44).
- Einstein's objection: faster than light? (65:18-65:44, 74:07-74:33).
- Why no signal: Bob alone sees 50/50 either way (65:44-67:54; her answers 72:20-75:28).
- Bell inequalities, real experiments, a Nobel prize (75:54-76:50).
- The CHSH game: rules, 3/4 classical, ~85% quantum (Q24-02 p37, slide only).
- Superdense coding: one qubit, two bits, with a shared pair (Q24-02 p35, slide only); teleportation is its mirror image (QC06-03).

**Hook.** Two players can't talk. Each gets a random bit and must answer with a bit. The best classical strategy wins 75% of rounds. Share one entangled pair beforehand and they win about 85%, yet they still can't send each other a single bit. How?

**Sources.** Q25-04 63:04-77:08 (s38-s39: Bell pair, EPR, no signalling, Bell inequality).

**Extra slides.** Q24-02 p33-35, 37 (entanglement, superdense coding, CHSH game (2024 L2, no recording)).

**2024 merge.** Q24-02 p35 and p37 are unique 2024 material (slides only); 2025 only mentions Bell inequalities.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-04 65:44-66:37: it does not give instant information transfer
- Q25-04 74:07-74:33: Einstein's pitfall
- Q25-04 75:54-76:50: Bell inequality, real experiments, a Nobel prize (she calls the game "gambling": keep or trim)

**Tape.** Q24-02 p37; Q25-04 s39.

**Avoid.** Q24-02 p35 superdense figure is from Wikipedia: redraw. Q25-04 71:25-75:28 is a dialogue with a student: her lines only.

**Check first.**

- CHSH: classical 3/4; quantum cos^2(pi/8) = 0.854 (Tsirelson).
- 2022 Nobel Prize in Physics: Aspect, Clauser, Zeilinger.
- Superdense coding: Bennett & Wiesner 1992; no-communication theorem.

**Notes.** Avoid "spooky action" captions as physics claims; it is Einstein's phrase, quote it as his.

## QC05 - Quantum gates

### QC05-01 - Why AND Is Not a Quantum Gate

5 min, math medium, primary Q25-05 slides s1-s10, status queued. Needs: QC04-02.

**Core idea.** A valid quantum gate is any unitary matrix: it keeps a state's length 1, so probabilities still add to 1, and it can always be undone (U^-1 = U-dagger), so no information is destroyed; that rules out ordinary AND, whose output 0 hides which of three inputs produced it; the fix is to keep enough of the input to run backwards.

- Gates are unitary: a postulate, confirmed by experiment (01:22-03:18).
- Norm preserving: valid state in, valid state out (03:43-05:06).
- Reversible: nothing lost (05:26-06:54); lost information is just unknown information (Q24-04 05:08-06:09).
- AND is not reversible, so not a quantum gate (06:01-06:54).
- 2 + 4 = 6: keep one addend and addition becomes reversible (Q24-04 07:34-08:30).
- Tool for later: normal matrices and spectral decomposition, f(A) via eigenvalues (07:27-12:27).

**Hook.** 6 could have come from 2+4, 3+3 or 1+5, so a machine that adds can't run backwards. Every quantum gate must. So how does a quantum computer add?

**Sources.** Q25-05 00:20-12:27 (s1-s10: unitary gates, reversibility, normal matrices); Q24-04 03:05-09:37 (s5: unitary, reversibility, the addition example (2024)).

**Extra slides.** Q24-04.notes p1 (typed notes: unitary matrices).

**2024 merge.** Q24-04 gives the cleaner addition example.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-05 05:34-06:01: quantum operations are reversible; you keep all the information
- Q25-05 06:01-06:54: the AND gate is not reversible, so it is not a quantum gate
- Q24-04 07:34-08:30: 2 plus 4 is 6: keep one of the addends

**Tape.** Q24-04.notes p1; Q25-05 s4.

**Avoid.** Q24-04 08:30-09:37 is a student question (copying): her answer only.

**Check first.**

- Unitary definition; reversible computing (Landauer 1961, Bennett 1973) if named.

### QC05-02 - X, Z and the Hadamard Bridge

7 min, math medium, primary Q25-05 slides s11-s16, status queued. Needs: QC05-01.

**Core idea.** X is the quantum NOT (it flips |0> and |1> and leaves |+>, |-> as they are up to sign), Z is its mirror (it leaves |0>, |1> alone and swaps |+> and |->), and the Hadamard gate H = (X+Z)/sqrt2 turns one basis into the other, so Z = HXH and X = HZH; a sign on one branch (relative phase) is observable, a sign on the whole state (global phase) is not.

- X: matrix, action on both bases, eigenvectors |+>, |-> (13:29-18:34).
- Z: matrix, eigenvectors |0>, |1>, a NOT on |+>, |-> (19:25-24:53).
- X and Z as two lenses on the same qubit (24:12-24:37).
- H = (X+Z)/sqrt2: 0 -> +, 1 -> -, + -> 0, - -> 1 (24:57-28:11).
- Z = HXH: change basis, apply X, change back (Q24-04 24:56-32:36).
- Is "sum of X and Z swaps their bases" a coincidence? The grand unification of quantum algorithms (28:39-31:06; Q24-04 33:17-34:43).
- Global vs relative phase (Q24-04 13:25-15:21, 19:18-22:00).

**Hook.** X flips 0 and 1 but can't touch |+>. Z leaves 0 and 1 alone but flips + and -. Which single gate turns one into the other?

**Sources.** Q25-05 12:27-31:15 (s11-s16: X, Z, H); Q24-04 09:37-34:51 (s6-s19: X, Z, H, quiz Z = HXH, global vs relative phase (2024)).

**Extra slides.** Q24-04.notes p1-2 (typed notes: X, Z, H).

**2024 merge.** Q24-04 explains Z = HXH and global vs relative phase better.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-05 17:42-18:09: X is a NOT on 0 and 1 but keeps the plus state
- Q25-05 26:47-27:12: the Hadamard gate connects the two state bases
- Q24-04 30:50-31:45: Hadamard as a basis transformation
- Q24-04 14:24-15:21: a global phase cannot be measured; a partial (relative) phase can

**Tape.** Q24-04.notes p2; Q25-05 s16.

**Avoid.** Student question about the name X (18:41-19:14) and the 2024 phase questions: her answers only.

**Check first.**

- Martyn, Rossi, Tan, Chuang, "Grand unification of quantum algorithms", PRX Quantum 2, 040203 (2021).

### QC05-03 - Rotations, and Why the T Gate Is Expensive

7 min, math heavy, primary Q25-05 slides s17-s27, status queued. Needs: QC05-02.

**Core idea.** Exponentials of X, Y and Z give continuous rotations (e^{-i theta Z} = cos theta I - i sin theta Z) and any single-qubit gate is a rotation up to a global phase; the discrete S and T gates are special Z rotations, and the line between them matters: circuits of Clifford gates (H, S, CNOT) can be simulated efficiently on a classical computer, adding T makes the set universal, and T is the gate error-corrected machines find hardest.

- Taylor expansion with Z^2 = I gives the rotation formula (34:18-36:58; Q24-04 37:41-41:35).
- Rotation about any axis; any one-qubit gate = phase x rotation (37:27-39:37; Q24-04 47:30-49:25).
- Y and the circle XY = iZ; X, Y, Z pairwise anticommute (37:57-42:21).
- Where does the i come from? Physicists had pulses first; matrices describe them (her answers, 43:39-50:38, 71:15-74:50).
- S and T as pi/4 and pi/8 phase gates (54:34-55:00); Z = S^2 = T^4.
- T is the bottleneck of error-corrected computing (55:00-55:41).
- Clifford-only circuits are classically simulable; T breaks it (56:07-56:54; Q24-05 15:56-16:52).
- Smallest universal single-qubit set {H, T}; H + T + CNOT for everything (Q24-04 54:16-58:07).
- Why discrete sets at all: error-corrected logical gates can't be continuous natively (Q24-05 00:29-00:54).

**Hook.** Build circuits from H, S and CNOT, as large as you like, and a laptop can simulate them. Add one small rotation, the T gate, and nobody knows an efficient way. What is special about T?

**Sources.** Q25-05 31:15-56:54 (s17-s27: rotations, Y, S, T, Clifford); Q25-05 71:01-74:50 (s35: her answer: matrices describe pulses); Q24-04 34:51-58:07 (s20-s36: Y, rotations, commuting, universal set quiz (2024)); Q24-05 00:00-01:02 (s1: why discrete gate sets (2024)); Q24-05 15:03-16:59 (s20: complex numbers and Clifford circuits (2024)).

**Extra slides.** Q24-04.notes p2-5 (typed notes: Y, rotations, S, T, commutation, universal set).

**2024 merge.** Q24-04 adds the universal-set quiz and commutation for compilers; Q24-05 adds why sets are discrete.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-05 55:00-55:41: "T gate is difficult, but T gate is very necessary"
- Q25-05 56:07-56:54: Clifford-only programs are easy to simulate classically
- Q25-05 72:18-73:41: you first have pulses; the matrices describe them
- Q24-05 15:56-16:52: Clifford circuits vs T gates

**Tape.** Q24-04.notes p3; Q24-04.notes p4; Q25-05 s26; Q25-05 s27.

**Avoid.** Q25-05 43:05-50:38 and 71:01-74:50 are dialogues with a student: her lines only.

**Check first.**

- Gottesman-Knill theorem; Clifford+T universality and Solovay-Kitaev.
- T = diag(1, e^{i pi/4}) is called the pi/8 gate (phase convention).
- Magic-state distillation as the cost of T in error correction; classical simulation cost grows exponentially with the T count for known methods.

**Notes.** Heavier math: show the derivation once, fast; keep the takeaway on screen.

### QC05-04 - CNOT, Entanglement, and the Copy Machine That Can't Exist

8 min, math medium, primary Q25-05 slides s28-s34, status queued. Needs: QC05-03.

**Core idea.** Single-qubit gates keep separate qubits separate; a two-qubit gate like CNOT (flip the target if the control is 1: (z1, z1 xor z2)) is what creates entanglement, H then CNOT making a Bell pair; and although CNOT can fan a qubit out into alpha|00> + beta|11>, no gate can ever make an independent copy of an unknown state: copying two states would force their overlap to equal its own square, so they would have to be identical or orthogonal.

- Why two-qubit gates matter: entanglement, decomposition, and they are the hard, noisy ones (Q24-05 01:25-05:43; Q25-05 57:02-58:28).
- CNOT as a controlled XOR (Q25-06 01:44-05:52; Q24-05 06:15-12:40).
- H + CNOT = Bell pair (Q25-05 61:47-66:34; Q25-06 06:05-08:22).
- The "if and else at once" intuition, with the honest caption that measurement returns one branch (Q25-05 63:07-64:37; Q24-02 p32 caveat).
- Two CNOTs undo the entanglement (Q24-05 20:47-21:38).
- Fan-out is not a copy (Q25-05 67:02-70:55; Q25-06 14:44-17:34); used in distributed quantum computing.
- The no-cloning proof in three lines (Q25-06 08:29-14:44; Q24-05 24:26-27:10).

**Hook.** Copy and paste is the most basic operation in computing. Here is a three-line proof that no quantum gate can ever do it.

**Sources.** Q25-05 56:54-70:55 (s28-s34: two-qubit gates, CNOT, Bell, fan-out); Q25-06 01:44-17:34 (s3-s9: CNOT as XOR, Bell, no-cloning proof, fan-out); Q24-05 01:23-27:10 (s4-s33: why two-qubit gates, CNOT, Bell, fan-out, no-cloning (2024)).

**Extra slides.** Q24-05.notes p1-3 (typed notes: CNOT, Bell, fan-out, no-cloning); Q24-02 p32 (superposition caveat (slide text)).

**2024 merge.** Q24-05 typed notes for clean pages; Q24-02 p32 supplies the honest caveat in her own words.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-06 13:36-14:32: "you cannot really have a general copying machine in quantum computing"
- Q25-06 07:26-08:22: entanglement is a critical computational resource
- Q25-05 63:07-63:56: like an if-else where both branches happen (needs the caveat caption)

**Tape.** Q24-05.notes p2; Q24-05.notes p3; Q25-06 s8.

**Avoid.** Q24-05 20:47-21:15 contains a student question: her answer only.

**Check first.**

- No-cloning: Wootters & Zurek 1982; Dieks 1982; the Nielsen & Chuang page she cites.
- Do not caption the if-else intuition as "computes all answers at once" without the measurement caveat.

**Notes.** Merges the separate no-cloning part into the CNOT part (fan-out leads straight to it).

### QC05-05 - Rewriting Gates: Flipped CNOTs and Free SWAPs

7 min, math medium, primary Q25-06 slides s10-s28, status queued. Needs: QC05-04.

**Core idea.** Compilers rewrite gates with identities: CZ is symmetric and equals a CNOT wrapped in Hadamards; four Hadamards reverse a CNOT's direction, useful because on some chips one direction is easier; a SWAP is three CNOTs, exactly the classical three-XOR swap; and when the compiler knows an input is still |0>, a SWAP needs only two (partial equivalence), while SWAPs plus single-qubit gates can never create entanglement.

- CZ: matrix, symmetric (17:40-21:20); recipe: action on basis states -> matrix -> check unitary (20:33-21:02).
- CZ = H CNOT H; why, via the basis change (21:20-29:13; Q24-05 29:20-30:56).
- Reversing a CNOT with four Hadamards (29:13-32:18); why: one direction is easier on the hardware (32:44-34:00; Q24-05 31:24-33:40).
- SWAP = three CNOTs = the in-place XOR swap (34:12-45:16; Q24-05 36:38-41:44).
- Linearity: prove it on basis states, it holds for superpositions (44:13-45:07).
- Partial equivalence: with a |0> input, SWAP = two CNOTs; compilers track untouched |0> qubits (45:16-51:13).
- SWAP is "classical": with single-qubit gates it can't entangle (51:13-52:53; Q24-05 49:14-51:36).

**Hook.** Your chip's CNOT only runs one way: control on A, target on B. The program needs it the other way round. No new hardware. What do you do?

**Sources.** Q25-06 17:34-52:53 (s10-s28: CZ, reversed CNOT, SWAP, partial equivalence); Q24-05 27:16-51:36 (s34-s60: CZ, CNOT direction, SWAP, XOR swap (2024)).

**Extra slides.** Q24-05.notes p3-5 (typed notes: CZ, identities, SWAP, XOR swap, partial equivalence).

**2024 merge.** Q24-05 typed notes for clean pages.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-06 32:44-33:35: one CNOT direction is easier on the hardware
- Q25-06 38:41-39:08: very like the classical in-place swap
- Q25-06 47:39-48:32: partial equivalence under special inputs: a common optimization

**Tape.** Q24-05.notes p4; Q24-05.notes p5.

**Avoid.** Q24-05 41:44-42:11: her remark that two iSWAPs make a SWAP is wrong (iSWAP^2 = Z x Z): never caption. Student questions at Q25-06 24:24, 30:42-32:44, 43:09, 48:32-50:47: her answers only.

**Check first.**

- CNOT direction preference on fixed-frequency transmons (cross-resonance: drive the control at the target's frequency): phrase generally.
- XOR swap algorithm.

### QC05-06 - Building Bigger Gates: Parity Rotations and Toffoli

7 min, math medium, primary Q25-06 slides s29-s48, status queued. Needs: QC05-05, QC03-02.

**Core idea.** Hardware runs only one- and two-qubit gates, so bigger gates are built from them: a rotation on Z x Z x Z just gathers the three qubits' parity into one qubit with CNOTs, rotates it, and undoes the CNOTs; the Toffoli gate (controlled-controlled-NOT), the building block of arithmetic, costs six CNOTs plus single-qubit gates; and decomposing a general 2^n x 2^n matrix is hard, which makes gate synthesis a research field.

- Z1Z2Z3 is diagonal: +1 for even parity, -1 for odd (52:53-57:53).
- exp(-i theta Z1Z2Z3) = CNOT ladder, Rz, mirror ladder (57:55-64:20).
- Pauli strings in exponential vs circuit form; synthesis is hard in general, easy for these (72:50-74:58).
- Controlled-U, Toffoli, Fredkin (68:45-72:50); Toffoli links quantum to classical computing (69:58-70:52).
- Controlled-controlled-U from V with V^2 = U (Q24-05 51:46-56:30).
- Many controls with work qubits and uncomputation (Q24-05 57:20-62:24).
- Her synthesis task: does a two-qubit gate need any CNOT? controlled-U with two CNOTs, any two-qubit gate with three; learning-based synthesis (Q24-05 62:45-66:32).

**Hook.** Hardware only does one- and two-qubit gates. Your chemistry program needs a rotation that acts on three qubits at once. It turns out all you need is whether an odd number of them are 1.

**Sources.** Q25-06 52:53-77:51 (s29-s48: parity gates, Toffoli, Pauli kernels, exercises); Q24-05 51:46-66:32 (s62-s82: controlled-U constructions, synthesis task (2024)).

**Extra slides.** Q24-05.notes p5-6 (typed notes: C^2(U), Toffoli, C^n(U)).

**2024 merge.** Q24-05 adds the controlled-U constructions and her programming task.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-06 56:05-56:30: "it's doing a parity check"
- Q25-06 74:07-74:58: decomposition is very challenging in general
- Q24-05 62:45-63:27: a common interview question for students joining her lab

**Tape.** Q25-06 s34; Q25-06 s41; Q25-06 s44; Q24-05.notes p6.

**Avoid.** Q25-06 s37 is the title slide of an earlier course (another institution, old title): never tape. Student question at 64:20-65:12: her answer only.

**Check first.**

- Toffoli: 6 CNOTs + 2 H + 7 T/T-dagger (Nielsen & Chuang fig. 4.9).
- Any two-qubit gate <= 3 CNOTs (Vatan & Williams 2004; Vidal & Dawson 2004); controlled-U <= 2 CNOTs (Barenco et al. 1995).

**Notes.** Pays off the preview in QC03-02.

## QC06 - Measurement, teleportation and mixed states

### QC06-01 - The Same Matrix, as a Gate and as a Measurement

6 min, math medium, primary Q25-07 slides s2-s17, status queued. Needs: QC05-06.

**Core idea.** Measurements are Hermitian matrices because everything we observe is a real number and Hermitian matrices have real eigenvalues; measuring projects the state onto an eigenvector with probability |overlap|^2, so Z used as a gate leaves |+> as |+> while Z used as a measurement turns it into a fair coin; and because H maps X-basis states to Z-basis states, hardware need calibrate only one kind of measurement.

- Measurement is the only way information leaves the quantum world (02:59-03:25).
- Hermitian = real eigenvalues, with the short proof (03:49-09:29; Q24-08 01:30-06:49).
- Projectors: P^2 = P, like a shadow on the floor (Q24-08 15:38-16:36).
- Born rule and the expectation value <Z> (12:37-15:31).
- Z gate vs Z measurement on |+> (15:31-16:51).
- X measurement = H, then Z measurement (16:51-23:36; Q24-08 28:51-31:31).
- Calibrate one measurement, build the rest (18:16-19:36; Q24-08 20:42-22:28); the general recipe (Q24-08 34:10-35:04).

**Hook.** The matrix Z, used as a gate, leaves |+> untouched. Used as a measurement, it turns |+> into a coin flip. Same matrix. What changed?

**Sources.** Q25-07 01:12-23:36 (s2-s17: Hermitian, projectors, Z and X measurement); Q24-08 01:30-35:04 (s2-s40: formal measurement, hardware Z only (2024)).

**Extra slides.** Q24-08.notes p1-3 (typed notes: Hermitian, projective measurement, Z and X measurement).

**2024 merge.** Q24-08 is more formal (projectors, the floor-shadow picture, the general recipe).

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-07 02:59-03:25: the only way to get information from the quantum world is measurement
- Q25-07 15:31-16:28: Z measurement and Z gate are totally different
- Q25-07 18:16-18:42: calibrate only the Z measurement
- Q24-08 02:24-02:52: we will not get a complex number from nature

**Tape.** Q24-08.notes p3; Q25-07 s14; Q25-07 s16.

**Avoid.** Q24-08 32:39-33:05: quiz logistics.

**Check first.**

- Projective measurement postulate (Nielsen & Chuang 2.2.5).

### QC06-02 - Asking Two Qubits If They Agree

7 min, math medium, primary Q25-07 slides s18-s37, status queued. Needs: QC06-01.

**Core idea.** Multi-qubit measurements are built from single-qubit Z measurements plus gates: ZZ is two Z measurements, XX adds Hadamards, and a Bell measurement first undoes the Bell circuit; with one helper qubit (H, controlled-U, H, measure) you can measure any +-1 operator U, such as "do these two qubits have the same parity?", without learning either qubit's value, the move error correction is built on.

- ZZ: four outcomes, two separate Z measurements (23:39-28:26); only interesting for entangled inputs (Q24-08 36:36-37:17).
- XX via Hadamards (27:23-28:22).
- The four Bell states form a basis (28:28-33:17).
- Bell measurement = the Bell circuit in reverse (33:17-38:56; Q24-08 40:30-46:22).
- Measuring any +-1 operator with an ancilla; walk-through of the state (38:56-49:35).
- Partial measurement of an entangled pair (Q24-08 46:40-52:27).

**Hook.** Can you find out whether two qubits are equal without finding out what either of them is?

**Sources.** Q25-07 23:36-49:35 (s18-s37: composite measurements, Bell measurement, ancilla measurement of U); Q24-08 35:10-52:27 (s41-s64: ZZ, XX, Bell measurement, partial measurement (2024)).

**Extra slides.** Q24-08.notes p3-4 (typed notes: composite and partial measurement).

**2024 merge.** Q24-08 adds partial measurement.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-07 34:03-34:29: so basic, like a hello world program
- Q25-07 42:03-42:32: we measure a helper qubit, not the input state
- Q25-07 49:05-49:33: you do not measure U directly: a Z measurement on the helper

**Tape.** Q25-07 s22; Q25-07 s34; Q24-08.notes p4.

**Avoid.** Q24-08 43:04 is a student's answer: never in a clip.

**Check first.**

- The ancilla circuit (Hadamard test) measures U's +-1 eigenvalue when U is Hermitian and unitary.

**Notes.** Plant for QC08-02: the same circuit becomes the syndrome measurement.

### QC06-03 - Teleportation, and Computing by Measuring

8 min, math medium, primary Q25-07 slides s39-s54, status queued. Needs: QC06-02, QC04-04.

**Core idea.** With one shared Bell pair, a qubit's unknown state can move from one lab to another using only two classical bits: a Bell measurement at the sender, then an X and/or Z fix at the receiver, with no copy made (the original is destroyed) and nothing faster than light; shrunk to a single qubit, the same trick underlies measurement-based computing, where you build a large entangled state first and then compute only by measuring, attractive for photons, which are cheap to make but hard to make interact.

- The San Diego / San Francisco story (53:00-56:42); only classical bits travel (55:47-56:42).
- The algebra: four outcomes, four fixes (58:19-62:55; Q24-08 typed notes).
- Her friend analogy (57:36-58:02).
- No cloning violated: the original is destroyed (Q24-08 notes).
- The first concrete use of entanglement (63:15-64:09).
- Measurement-based computing: entangle first, measure to compute (64:15-65:10).
- Z-swap and X-swap: one-qubit teleportation circuits (65:28-70:29).
- Why photonics likes it (67:19-68:37); compiling for photonic one-way machines (Q24-02 p11-p12).

**Hook.** You can't copy a qubit, can't look at it without wrecking it, and can't send it down a phone line. Yet with one shared entangled pair and two ordinary bits, it arrives intact in another city. How?

**Sources.** Q25-07 51:21-70:29 (s39-s54: teleportation, measurement-based computing); Q24-08 72:55-75:04 (s86-s93: teleportation as an exercise (2024)).

**Extra slides.** Q24-08.notes p7-8 (typed teleportation derivation); Q24-02 p11-12 (photonic one-way computation and its compilation (2024 L2, no recording)).

**2024 merge.** Q24-08 typed derivation for clean pages; Q24-02 p11-p12 adds the photonic compiler view.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-07 55:47-56:13: you are only sending classical information
- Q25-07 57:36-58:02: B is a friend of A, finds a new friend C
- Q25-07 67:45-68:10: photons: easy to measure, cheap to generate

**Tape.** Q24-08.notes p8; Q25-07 s49; Q25-07 s54; Q24-02 p11.

**Avoid.** Q24-02 p12 contains a third-party device image: check before taping, else redraw. Q25-07 68:10-68:37 names two photonic companies: neutral, but keep company names off screen unless FACTS clears them.

**Check first.**

- Teleportation: Bennett et al. 1993; first experiments 1997.
- One-way quantum computer: Raussendorf & Briegel 2001; fusion-based photonic approaches.
- OneQ compiler (ISCA 2023): authors and claims.

**Notes.** Merges the separate measurement-based part; superdense coding sits in QC04-04.

### QC06-04 - Mixed States and the Two Kinds of Phase

6 min, math medium, primary Q24-08 slides s70-s85, status queued. Needs: QC06-01.

**Core idea.** When a measurement happens but nobody knows its result, which is exactly how noise works (the environment "measuring" the computer unannounced), the state is a probability mix described by a density matrix; and phases come in two kinds: a global phase changes no measurement statistics at all, while a relative phase (|+> vs |->) is invisible in one basis and plain in another.

- Density matrix: measured, result unknown (53:49-58:22).
- Noise = the environment measuring your qubits without telling you (58:48-59:41).
- Like static analysis of a loop that may run any number of times (60:04-60:55).
- Gates act as U rho U-dagger (60:59-62:55).
- Global phase: identical statistics for every measurement (62:59-65:59).
- Relative phase: same in the Z basis, opposite in the X basis (66:21-69:44).
- 2025 touches global phase only in passing (Q25-05 43:05-43:31).

**Hook.** Two states differ only by a minus sign. In one case no experiment in the universe can tell them apart; in the other, a single measurement can. Where does the sign sit?

**Sources.** Q24-08 53:32-72:49 (s69-s85: density matrix, global and relative phase (2024)).

**Extra slides.** Q24-08.notes p5-6 (typed notes: density matrix, global phase, relative phase).

**2024 merge.** A 2024-only part: 2025 has no density matrices and only a passing remark on phase.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q24-08 58:48-59:41: noise: the outside environment acts like a measurement
- Q24-08 60:04-60:55: like analysing a loop that may run any number of times
- Q24-08 65:03-65:30: no measurement can tell states that differ by a global phase

**Tape.** Q24-08.notes p5; Q24-08.notes p6.

**Avoid.** In-person 2024 recording: check each clip for student voices and room noise.

**Check first.**

- Density matrix basics (Nielsen & Chuang 2.4).

**Notes.** Primary source is 2024 (Q24-08).

## QC07 - From circuits to the first quantum algorithms

### QC07-01 - Can a Quantum Computer Do Everything Your Laptop Does?

7 min, math medium, primary Q25-08 slides s1-s38, status queued. Needs: QC05-06.

**Core idea.** Yes: any classical circuit can be made reversible by swapping each NAND for a Toffoli gate plus a spare qubit, and counting shows reversibility costs little (reversible functions on n bits are far fewer than all functions, but with one extra bit they outnumber them); in practice the overheads are real, so quantum computers are best seen as special accelerators, like GPUs, worth it only where the speed-up is large.

- Three questions: expressiveness, efficiency, and the insight behind algorithms (02:50-05:16).
- NAND is universal but not reversible (07:06-09:53).
- Toffoli with the target set to 1 computes NAND (10:06-12:34); universal for classical circuits, not for quantum ones (12:34-13:39).
- Toffoli = 2 H + 7 T + 6 CNOT; Clifford + T is universal (13:53-14:19).
- Qubits: one spare in theory, up to one per NAND in practice (15:12-18:48).
- The counting argument (18:55-30:09; Q24-13 notes).
- "Reversibility will hurt the expressiveness, but not a lot" (30:12-30:43).
- A special accelerator, like GPUs (32:11-33:28).
- Quadratic speed-ups can vanish under error-correction overhead (Q24-13 14:39-15:59); quantum ML on classical data is unproven (Q24-13 15:59-17:52).

**Hook.** Reversible circuits on three bits can express only 40,320 of the 16,777,216 possible 3-bit functions. Give them a single spare bit and the reversible count jumps to about 21 trillion. Why does one bit buy so much?

**Sources.** Q25-08 02:39-35:14 (s1-s38: classical vs quantum circuits, counting, accelerator); Q24-13 03:31-18:21 (s3-s19: same argument; quadratic speed-ups and quantum ML (2024)).

**Extra slides.** Q24-13.notes p1-3 (typed notes: NAND, Toffoli, counting).

**2024 merge.** Q24-13 adds two honest limits (quadratic speed-ups, quantum ML) and clean notes.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-08 30:12-30:43: "reversibility will hurt the expressiveness, but not a lot"
- Q25-08 32:38-33:20: a special accelerator, like GPUs (stop before the stock-market remark)
- Q24-13 15:06-15:59: quadratic speed-up does not survive the overhead unless the problem is huge
- Q24-13 16:56-17:22: more doubts about quantum computers for classical machine learning

**Tape.** Q24-13.notes p1; Q24-13.notes p2.

**Avoid.** Q25-08 33:05-33:32 mentions a company's stock: cut before it. Q25-08 frames: the iPad app bars (non-English UI) were cropped; check every frame before taping.

**Check first.**

- 8^8 = 16,777,216; 8! = 40,320; 16! = 20,922,789,888,000.
- The counting argument shows room, not a construction; Bennett 1973 gives the construction with more ancillas.
- Toffoli gate count (Nielsen & Chuang fig. 4.9).
- Quadratic speed-up overhead: Babbush et al., PRX Quantum 2021 ("Focus beyond quadratic speedups").

### QC07-02 - Quantum Garbage Collection: Uncomputation

6 min, math medium, primary Q25-08 slides s40-s66, status queued. Needs: QC07-01.

**Core idea.** Reversible circuits leave scratch ("garbage") qubits behind; unlike a classical temporary, a garbage qubit can't simply be measured and reused, because it is entangled with the answer and measuring it collapses the superposition; the fix is uncomputation, running the scratch work backwards, which trades extra gates for reusable qubits and is a job for compilers, as garbage collection is for runtimes.

- AND of three bits with two Toffolis and a scratch qubit (35:36-38:30).
- Garbage collection and three-address temporaries (38:30-39:14; Q24-13 19:55-20:31).
- Why not measure it: the |000> + |110> example (39:14-46:30; Q24-13 20:45-23:28).
- Uncompute: repeat the Toffoli (46:30-51:42).
- General pattern: compute, copy out the result, run the computation backwards (51:44-54:22; Q24-13 30:04-31:07).
- Gates vs qubits (49:45-50:12; Q24-13 25:45-26:11); compilers should do it (Q24-13 31:16-31:40).
- Better strategies are a research problem (54:30-55:32).

**Hook.** In Java you drop a temporary variable and the garbage collector frees it. Do the same with a scratch qubit, just measure it and reuse it, and you can destroy the answer you meant to keep. Why?

**Sources.** Q25-08 35:36-55:52 (s40-s66: garbage qubits, uncomputation); Q24-13 18:28-31:40 (s20-s38: same, with the compiler angle (2024)); Q24-05 61:04-62:38 (s76: uncomputation in multi-controlled gates (2024)).

**Extra slides.** Q24-13.notes p3-4 (typed notes: garbage qubits and uncomputation).

**2024 merge.** Q24-13 adds "the compiler should do it"; Q24-05 shows uncomputation inside C^n(U).

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-08 45:19-46:06: measuring the garbage qubit breaks the remaining information
- Q25-08 47:58-48:25: measurement is not the right thing; uncomputation is
- Q24-13 31:16-31:40: programmers won't do uncomputation themselves: compilers, like garbage collection
- Q24-05 61:31-62:24: garbage collection vs uncomputation

**Tape.** Q24-13.notes p4; Q25-08 s56.

**Avoid.** Q24-13 24:33-26:21 contains a student question: her answer only.

**Check first.**

- Bennett 1973 compute-copy-uncompute.
- Toffoli is its own inverse.

### QC07-03 - Oracles and Phase Kickback

6 min, math medium, primary Q24-13 slides s39-s77, status queued. Needs: QC07-02.

**Core idea.** Quantum algorithms treat classical functions as oracles: a bit oracle XORs f(x) into a spare qubit, a phase oracle writes it into a sign (-1)^f(x); the two are linked by phase kickback, put the spare qubit in |-> and the flip comes back as a minus sign on the input, the same effect that makes a CNOT's "control" and "target" trade places in the X basis.

- Bit oracle |x>|b> -> |x>|b xor f(x)> (Q25-08 55:52-59:11; Q24-13 31:40-35:52).
- Feeding it a superposition (Q25-08 59:26-61:14; with the measurement caveat).
- Phase oracle; CZ is the phase oracle for AND (Q25-08 61:14-63:56; Q24-13 36:09-40:47).
- From bit oracle to phase oracle with a |-> target (Q24-13 41:26-46:55).
- Phase kickback: CNOT seen in mixed bases (Q24-13 47:04-51:29).
- "Push someone and you feel a force": the control changes too (Q24-05 17:06-18:59).

**Hook.** In a CNOT the control qubit is never supposed to change. Feed the target a |-> and the control picks up a minus sign. Who is controlling whom?

**Sources.** Q25-08 55:52-64:46 (s67-s74: bit and phase oracles); Q24-13 31:40-51:29 (s39-s77: oracles, bit-to-phase, phase kickback (2024)); Q24-05 17:05-18:59 (s21-s22: CNOT in the X basis (2024)).

**Extra slides.** Q24-13.notes p5-8 (typed notes: XOR oracle, phase oracle, |-> trick, phase kickback).

**2024 merge.** 2025 names phase kickback (Q25-08 64:12-64:39) then moves on; 2024 explains it, so 2024 is the primary source here.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q24-13 50:22-51:16: you want to control me, I will secretly give you a phase
- Q24-05 17:06-17:58: if you push someone, you definitely get a force
- Q24-13 44:55-45:23: set b to the minus state and you directly get a phase oracle

**Tape.** Q24-13.notes p7; Q24-13.notes p8.

**Avoid.** Q24-13 35:25 and 52:28-62:23: questions and an in-class quiz: skip.

**Check first.**

- Phase kickback (Cleve, Ekert, Macchiavello, Mosca 1998) if named.

### QC07-04 - Superposition Is Not Enough: Interference

6 min, math medium, primary Q25-08 slides s75-s82, status queued. Needs: QC07-03.

**Core idea.** Hadamards on n qubits make an equal superposition of all 2^n inputs, and one oracle call touches them all, but measuring returns one random input; the speed-up comes from interference: with phases set by the oracle, a second round of Hadamards makes wrong answers cancel and right ones add up, the template (H, oracle, H, measure) behind the first quantum algorithms.

- H on every qubit gives all 2^n inputs at once (Q25-08 64:46-67:39).
- Measure and you get one (67:41-68:21); her 2024 caveat: superposition does not immediately give speed-up (Q24-02 p32).
- H then H as two paths, one adding, one cancelling (68:45-70:52).
- The template: H, phase oracle, H, measure (71:17-72:12; Q25-09 18:27-19:04).
- The Hadamard transform formula and "x.y" parity (Q25-09 06:12-17:28); "like a Fourier transform" (09:52-10:42).
- Design idea: cancel the uninteresting results (Q24-13 28:17-28:42).

**Hook.** Running a function on all 2^n inputs at once sounds like unlimited parallelism. Then you measure and get one random answer. So where does a quantum speed-up actually come from?

**Sources.** Q25-08 64:46-72:21 (s75-s82: superposition, interference, template); Q25-09 02:03-19:04 (s2-s20: Hadamard transform, interference proof); Q24-13 26:21-29:43 (s33: interference as the design idea (2024)).

**Extra slides.** Q24-02 p32 (superposition caveat (slide text)).

**2024 merge.** Q24-02 p32 and Q24-13 add the honest caveat and the design idea.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-08 67:52-68:21: even with parallelism you only get one output when you measure
- Q25-08 70:26-70:52: positive interference and negative interference
- Q24-13 28:17-28:42: quantum algorithm design: interfere and cancel out

**Tape.** Q24-02 p32; Q25-09 s15.

**Avoid.** Q24-13 26:26-27:51 starts from a student question: her answer only.

**Check first.**

- Hadamard transform H^n|x> = 2^(-n/2) sum_y (-1)^(x.y) |y>.

### QC07-05 - One Question Instead of Half the Book

7 min, math medium, primary Q25-09 slides s21-s37, status queued. Needs: QC07-04.

**Core idea.** Promised a function that is either constant or balanced, a deterministic classical machine may have to check half the inputs plus one; the Deutsch-Jozsa circuit answers with a single query, because the all-zeros outcome has amplitude +-1 for a constant function and exactly 0 for a balanced one; the same circuit reads a hidden n-bit string v from f(x) = x.v in one query (Bernstein-Vazirani); clean wins on made-up problems that pointed the way to useful ones.

- The Deutsch-Jozsa problem (19:07-21:06).
- Classical: lucky 1 query, worst 2^(n-1)+1 (21:06-23:49).
- The circuit and the amplitude of |0...0> (23:57-31:20).
- Why it works: interference favours or cancels |0...0> (31:44-33:16).
- Generalize: f(x) = x.v reuses the Hadamard identity (33:16-41:59).
- Bernstein-Vazirani: v in one query; classically n queries (42:02-46:39).
- Honest limit: "examples we are making up"; and a randomized classical guesser solves Deutsch-Jozsa with high confidence in a few queries (47:08-48:54).

**Hook.** A black box is either all zeros or exactly half ones. For 50-bit inputs, a classical check that must be certain may need over 560 trillion questions. A quantum computer asks once.

**Sources.** Q25-09 19:04-51:24 (s21-s37: Deutsch-Jozsa, Bernstein-Vazirani, summary).

**2024 merge.** None (2024 L13 previews the same circuits; 2025 is complete).

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-09 31:20-31:44: not that complicated once you understand the pattern
- Q25-09 32:28-33:16: two different interference patterns for the two types of function
- Q25-09 48:02-48:54: it seems these are examples made up so the quantum algorithm wins

**Tape.** Q25-09 s28; Q25-09 s37.

**Check first.**

- 2^49 + 1 = 562,949,953,421,313.
- Deutsch & Jozsa 1992; Bernstein & Vazirani 1993/1997.
- Classical BV needs n queries (she implies more: correct it).
- Bounded-error classical algorithms solve Deutsch-Jozsa with O(1) queries: state it as the honest limit.

**Notes.** Merges Deutsch-Jozsa and Bernstein-Vazirani (same template, one idea).

### QC07-06 - Simon's Algorithm: Catching a Hidden Pattern

7 min, math heavy, primary Q25-09 slides s38-s51, status queued. Needs: QC07-05.

**Core idea.** Simon's problem hides a bit string s such that f(x1) = f(x2) exactly when x2 = x1 xor s; a classical search must wait for a collision, which by the birthday paradox takes about 2^(n/2) queries, while each quantum run returns a random y with y.s = 0, so about n runs and some linear algebra reveal s: an exponential gap, and the step that led to the quantum Fourier transform and Shor's factoring algorithm.

- From exact values to periodicity, the Fourier transform, and Shor (48:54-51:07).
- The problem (51:43-53:34).
- Classical: a birthday hunt; 23 people (53:34-56:36).
- The circuit: H, oracle, measure the output, H, measure (56:49-59:25).
- Step by step to "y.s = 0" (59:37-70:44).
- Collect n-1 independent y's, solve the linear system; about n runs (70:45-75:11).

**Hook.** With 23 people in a room it is more likely than not that two share a birthday. Simon's problem is a birthday hunt over 2^n days: a classical search needs about 2^(n/2) tries, a quantum computer about n.

**Sources.** Q25-09 48:54-75:37 (s37-s51: road to periodicity; Simon's algorithm).

**2024 merge.** None.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-09 49:21-50:12: periodicity, then the Fourier transform, then Shor
- Q25-09 70:21-70:44: you immediately know that y times s equals zero
- Q25-09 75:11-75:36: much better results

**Tape.** Q25-09 s42; Q25-09 s50.

**Check first.**

- Simon 1994; classical lower bound Omega(2^(n/2)); expected O(n) quantum queries.
- Birthday: 23 people, 50.7%.
- Her "4(n-1)" bound and the birthday derivation are loose: use a standard statement.

## QC08 - Quantum error correction

### QC08-01 - Three Copies and a Vote

6 min, math light, primary Q25-10 slides s3-s9, status queued. Needs: QC05-04, QC01-03.

**Core idea.** The classical repetition code sends each bit three times and takes a majority vote, which helps only if the per-bit error p is below one half, the simplest error threshold; the quantum version can't copy a qubit, but it can fan alpha|0> + beta|1> out into alpha|000> + beta|111> with two CNOTs, repeating only the basis states.

- Error correction deserves a course of its own; three weeks of essentials here (00:07-01:10).
- Hardware at ~1e-5 vs a need for 1e-15 or better (02:00-02:29).
- Repetition and majority vote (02:57-04:28).
- Physical vs logical error; P(correct) = (1-p)^3 + 3p(1-p)^2 (04:28-06:43).
- It helps only when p < 1/2: a threshold (06:43-07:59; Q24-09 28:06-29:56).
- Bit flips on qubits; no copying; fan-out encoding with two CNOTs (07:59-14:07; Q24-09 06:57-11:04).

**Hook.** Send each bit three times and take a vote: at a 1% error rate, failures drop to about 0.03%. At 60%, voting makes things worse. Where is the crossover, and does the trick survive the jump to qubits?

**Sources.** Q25-10 00:06-14:14 (s2-s9: classical repetition, threshold, quantum encoding); Q24-09 00:30-11:06 (p1-p5: same, with the deck (2024)).

**Extra slides.** Q24-09 p2-5 (clean deck pages matching Q25-10 s5-s9).

**2024 merge.** Q24-09 deck pages replace the screen-captured frames.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-10 07:34-07:59: more qubits protect only when the physical error is below a threshold
- Q25-10 12:48-13:13: the encoding is the Bell circuit plus one more CNOT
- Q24-09 28:06-28:32: above 50%, repetition enlarges the error

**Tape.** Q24-09 p2; Q24-09 p4; Q24-09 p5.

**Avoid.** Q24-09 00:05-00:33: quiz logistics.

**Check first.**

- 3p^2 - 2p^3: p = 0.01 -> 0.000298; p = 0.6 -> 0.648.
- Classical error-rate figures (1e-5 hardware, 1e-15 need) are her illustration.

**Notes.** Opens the error-correction block; callback to QC01-03.

### QC08-02 - Measure the Error, Not the Data

8 min, math medium, primary Q25-10 slides s10-s21, status queued. Needs: QC08-01, QC06-02.

**Core idea.** Measuring an encoded qubit to check it would collapse it, so the code asks two parity questions with helper qubits (do qubits 1 and 2 agree? do 2 and 3?) whose answers, the syndrome, say which qubit flipped without revealing alpha or beta; in stabilizer terms the good state is a +1 eigenstate of Z1Z2 and Z2Z3 and an error flips one or both to -1, read out with the same helper-qubit circuit as before; two flips fool it into a logical error.

- Why the qubits can't simply be measured (14:14-17:10; Q24-09 11:06-13:04).
- Two helper qubits, four syndromes, the walk-through (17:10-24:53).
- A lookup-table decoder (25:26-26:22).
- It assumes perfect checks; what if a helper fails? (26:22-26:56; Q24-09 23:29-24:30) -> QC08-08.
- Two flips swap alpha and beta: a logical error (27:26-28:47).
- Shortcut: push X errors through the CNOTs to read the syndrome (29:05-35:01).
- Why it works: only parities are measured (35:08-36:01).
- Stabilizers Z1Z2, Z2Z3; minimal generators; k = n - m (36:27-42:17).
- Collapse happens only if the state is not an eigenstate (Q24-09 38:15-38:42).
- The stabilizer measurement is the H, controlled-U, H circuit of QC06-02 (42:17-49:31).

**Hook.** To fix a qubit you need to know what went wrong, but looking at it destroys it. What can you ask that reveals the error and nothing else?

**Sources.** Q25-10 14:14-49:31 (s10-s21: syndrome, decoder, stabilizers, stabilizer measurement); Q24-09 11:06-48:12 (p6-p14: same with the deck (2024)).

**Extra slides.** Q24-09 p6-14 (clean deck pages matching Q25-10 s10-s21).

**2024 merge.** Q24-09 deck pages and its clearer "collapse only if not an eigenstate" line.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-10 16:30-17:10: you just measure the error, not the data
- Q25-10 35:08-36:01: we never measure anything associated with alpha and beta
- Q24-09 38:15-38:42: collapse only happens when the state is not an eigenstate

**Tape.** Q24-09 p7; Q24-09 p8; Q24-09 p12; Q24-09 p14.

**Avoid.** Q24-09 16:10-18:28 and 39:09-41:08 contain student questions: her answers only.

**Check first.**

- Syndrome table; stabilizer count n - k.

### QC08-03 - Phase Flips and Shor's Nine-Qubit Code

7 min, math medium, primary Q25-10 slides s22-s30, status queued. Needs: QC08-02.

**Core idea.** Qubits suffer an error classical bits never do, a phase flip (Z), but in the |+>, |-> basis a phase flip is just a bit flip, so a three-qubit code over |+++>, |---> with X-type checks catches it; Shor's nine-qubit code nests the two (phase code outside, bit-flip code inside), uses 8 checks, corrects any single-qubit X, Z or both, and is "degenerate": different errors can share a syndrome and still be fixed the same way.

- Roadmap: X, then Z, then both, then everything (50:32-51:24).
- Z is a bit flip in the +/- basis (51:50-52:44).
- The |+++>/|---> code: Hadamards after the encoder; X stabilizers (52:44-56:55).
- Syndromes and fixes (56:55-59:49).
- Shor's code by concatenation (59:51-62:03); 8 stabilizers (62:03-64:00).
- Counting: 27 single-qubit errors vs 256 syndromes; some two-qubit errors fixable (64:36-67:15).
- Quiz: an XZ error on qubit 4 (67:28-69:41).
- Degeneracy is harmless here (Q25-11 06:23-10:02; Q24-09 65:00-68:32).

**Hook.** Classical bits can only flip. Qubits can also flip a sign that no classical code had ever heard of. Peter Shor's 1995 fix: nine qubits, two layers.

**Sources.** Q25-10 49:31-69:41 (s22-s30: phase code, Shor code); Q25-11 06:23-10:02 (s3: Shor code is degenerate); Q24-09 48:12-68:32 (p15-p23: same with the deck (2024)).

**Extra slides.** Q24-09 p15-23 (clean deck pages).

**2024 merge.** Q24-09 deck pages.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-10 52:15-52:44: Z error in the plus/minus basis works exactly like a bit flip
- Q25-10 59:51-60:16: Shor's nine-qubit code
- Q25-11 07:43-08:10: degenerate, but not a big issue

**Tape.** Q24-09 p15; Q24-09 p19; Q24-09 p21.

**Check first.**

- Shor, PRA 52, R2493 (1995).
- C(9,2) x 9 = 324 > 256 = 2^8.

### QC08-04 - How Quantum Errors Go Digital

6 min, math medium, primary Q25-11 slides s4-s5, status queued. Needs: QC08-03, QC01-03.

**Core idea.** Real errors are continuous, a slight over-rotation rather than a clean flip, yet a code that fixes X and Z fixes them all: measuring the syndrome forces an error like m I + n X to "choose" between no error and a full X error, each of which is then fixed; since any single-qubit error is a combination of I, X, Y, Z, correcting those corrects everything, which is why quantum computing escapes the fate of analog computing.

- R = m I + n X on the repetition code: the syndrome measurement splits it (Q25-11 10:02-14:45; Q24-09 68:32-72:58).
- The analog-computing callback (Q25-11 15:12-16:37; Q24-09 75:53-76:44).
- Correct A and B, correct any combination; I, X, Y, Z span all 2x2 matrices; Y ~ XZ (Q25-11 16:47-19:23; Q24-09 73:28-75:27).
- Small errors on many qubits: two-qubit terms are second order (Q24-11 04:47-06:45).

**Hook.** Episode one said noise killed analog computers. A qubit is analog too: its errors are tiny over-rotations, not clean flips. So why can a code that only knows "flip" and "sign" fix all of them?

**Sources.** Q25-11 10:02-19:23 (s4-s5: continuous errors, linearity); Q24-09 68:32-77:34 (p24-p26: same with the deck (2024)); Q24-11 04:40-06:53 (s4: small errors on every qubit (2024)).

**Extra slides.** Q24-09 p24-26 (clean deck pages); Q24-11 s4 (small error on every qubit).

**2024 merge.** Q24-09 deck pages; Q24-11 adds the small-error expansion.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-11 15:12-16:37: measurement-induced collapse is a saver for quantum computing
- Q24-09 75:53-76:44: unlike analog computing, you can correct it because you do a collapse

**Tape.** Q24-09 p24; Q24-09 p26; Q24-11 s4.

**Check first.**

- Discretization of errors (Nielsen & Chuang 10.2).

**Notes.** Pays off QC01-03.

### QC08-05 - Which Errors a Code Can Catch

8 min, math heavy, primary Q25-11 slides s12-s21, status queued. Needs: QC08-04.

**Core idea.** In a stabilizer code both the checks and the errors are strings of I, X, Y, Z, and any two such strings either commute or anticommute, decided by counting the positions where they clash; an error is caught exactly when it anticommutes with some check, which is why Z-checks catch X errors and vice versa; errors that commute with every check without being checks slip through as silent logical errors, and the weight of the smallest one is the distance d, which corrects (d-1)/2 errors.

- Why Pauli operators: Hermitian and unitary, eigenvalues +-1, errors discretize (30:40-33:50).
- The Pauli group: 4^n strings, always commute or anticommute; weight (33:53-38:58; Q24-11 08:04-14:12).
- Counting clashes, worked on the five-qubit code's checks (22:18-25:59).
- Stabilizers form an abelian group; k = n - number of generators (38:58-42:16; Q24-11 15:58-22:03).
- Detection = anticommutation flips +1 to -1 (42:16-47:16; Q24-11 22:06-27:27).
- Silent logical errors N(S)\S; X1X2X3 on the repetition code; distance (47:16-52:12; Q24-11 27:31-33:23).
- Detect vs correct: d = 2t + 1; Shor is [[9,1,3]] (52:12-61:18).
- The correction condition E-dagger F not in N(S)\S, proved in class (Q24-11 33:29-56:14; advanced).
- Code design as an optimization over n, k, d (61:18-62:46).

**Hook.** Checks and errors are both just strings like XZZXI. Whether an error is caught comes down to one count: in how many positions do the two strings clash? Odd means caught.

**Sources.** Q25-11 19:23-62:46 (s6-s21: Pauli group, stabilizer formalism, distance); Q24-11 06:53-58:27 (s5-s15: same, with the correction condition (2024)).

**Extra slides.** Q24-11 s7-s15 (stabilizer slides with UC San Diego footers).

**2024 merge.** Q24-11 frames are the same slides with current footers; it also proves the correction condition.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-11 46:01-46:52: X errors need Z stabilizers; X always commutes with X
- Q25-11 50:10-50:37: X on all three qubits: a logical error we cannot detect
- Q24-11 06:54-07:40: the design space is huge: where computer science comes in

**Tape.** Q24-11 s7; Q24-11 s10; Q24-11 s11; Q24-11 s13.

**Avoid.** Q25-11 frames show an old institution's footer: prefer the Q24-11 frames or crop the footer. Q24-11 46:37-52:38: in-class quiz time: skip.

**Check first.**

- Stabilizer formalism (Gottesman 1997); Knill-Laflamme conditions.
- [[n,k,d]] notation; d = 2t+1.

**Notes.** The heaviest QEC part: keep one worked count on screen at a time.

### QC08-06 - Five Qubits Is the Minimum

6 min, math medium, primary Q25-11 slides s6, status queued. Needs: QC08-05.

**Core idea.** Shor's code spends nine qubits; by mixing X and Z in the same checks, the [[5,1,3]] code protects one qubit against any single error with five, and four is impossible: a four-qubit code that corrects one error could also survive losing any two known qubits, so each half would rebuild the state, a copy machine; and knowing more about the noise (where errors strike, which kind dominates, when bursts hit) lets codes do better still.

- The five-qubit code's four checks (XZZXI and shifts) (Q25-11 19:23-22:18; Q24-11 62:41-63:39).
- Check a code by program: enumerate errors, compare syndromes (Q24-11 63:39-64:07).
- Why not four: one general error = two erasures; the halves would clone (Q24-11 64:25-66:15).
- Erasures: knowing where (not what) doubles what a code can fix (Q24-11 59:01-59:54).
- Biased noise: hardware where one error type dominates (Q24-11 59:54-60:46).
- Bursts: cosmic-ray events on large superconducting chips (Q24-11 61:14-62:08).

**Hook.** Shor needed nine qubits to protect one. Five turn out to be enough, and four can never work, because a four-qubit code would be a copy machine.

**Sources.** Q25-11 19:23-29:40 (s6-s10: five-qubit code); Q24-11 58:34-66:37 (s16-s18: erasures, biased noise, smallest code (2024)).

**Extra slides.** Q24-11 s16-s18 (better if more is known; five-qubit code; the smallest QECC).

**2024 merge.** Q24-11 is the primary source for the impossibility argument and the research angle (2025 lacks both).

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-11 19:32-19:57: the five-qubit code is the smallest for any single-qubit error
- Q24-11 65:22-66:15: this is physically equivalent to cloning: it cannot
- Q24-11 62:08-62:41: in real applications you can do much more: the beauty of research

**Tape.** Q24-11 s17; Q24-11 s18.

**Avoid.** Q24-11 59:54-60:46 names a cloud company's hardware programme: keep the company off screen. Q24-11 62:41-63:08 starts with a student question: her answer only.

**Check first.**

- [[5,1,3]]: Laflamme, Miquel, Paz, Zurek 1996; Bennett, DiVincenzo, Smolin, Wootters 1996.
- Quantum Singleton / no-cloning bound: n >= 4t + 1.
- Erasure codes correct 2t erasures; biased-noise qubits (cat qubits) as a research line; cosmic-ray bursts (McEwen et al., Nature Physics 2022).

### QC08-07 - Borrowing Classical Codes: CSS and the Steane Code

6 min, math medium, primary Q25-11 slides s25, status queued. Needs: QC08-05.

**Core idea.** Classical linear codes come with a parity-check matrix H (Hx = 0 for valid words; He points at the error); CSS codes reuse two classical codes, one as Z-checks for bit flips and one as X-checks for phase flips, and two copies of the 7-bit Hamming code give the 7-qubit Steane code, provided the two sets of checks commute; such codes can need long-range wiring, which pushed the field toward hardware-friendly codes like the surface code and low-density parity-check codes.

- Generator matrix G and parity-check matrix H; the error syndrome He (Q24-11 66:37-73:22).
- The Hamming [7,4,3] code (Q24-11 73:22-73:45).
- CSS: classical parity checks become Z-checks, a second code becomes X-checks (Q25-11 63:05-65:59; Q24-11 73:58-74:52).
- They must commute: it is not automatic (65:59-67:42; Q24-11 76:36-77:29).
- Steane [[7,1,3]] beats Shor [[9,1,3]] at the same distance (67:17-67:42).
- Not always the best; wiring needs -> LDPC and surface codes; codes with k > 1 (Q24-11 74:52-76:36; Q25-11 41:49-42:16).

**Hook.** A 1950 code from Bell Labs fixes any single flipped bit among seven. Use it twice, once for flips and once for signs, and you get a seven-qubit quantum code, but only if the two copies get along.

**Sources.** Q25-11 63:05-68:01 (s25: CSS construction, Steane code); Q24-11 66:37-77:37 (s19-s26: classical linear codes, Hamming, CSS (2024)).

**Extra slides.** Q24-11 s19-s26 (classical linear codes and CSS (UC San Diego footers)).

**2024 merge.** Q24-11 supplies the classical-code background 2025 skips.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q25-11 64:30-65:00: a one-to-one mapping between a classical code and Z stabilizers
- Q24-11 74:52-75:17: it turns out the strategy is not always the best
- Q24-11 75:43-76:36: hardware-aware codes: LDPC, the surface code

**Tape.** Q24-11 s22; Q24-11 s24; Q25-11 s25 (crop the footer).

**Check first.**

- Hamming 1950; Steane 1996; Calderbank & Shor 1996.
- High-rate qLDPC example if named (e.g. a [[144,12,12]] bivariate bicycle code, 2024).

### QC08-08 - Fault Tolerance: When the Fixer Is Broken Too

6 min, math medium, primary Q25-11 slides s26-s29, status queued. Needs: QC08-07, QC05-03.

**Core idea.** Codes so far assumed perfect checking circuits, but every check is built from CNOTs, and a CNOT copies a bit flip forward from control to target (and a phase flip backward), turning one error into two, exactly what a one-error code cannot fix; fault-tolerant designs keep data encoded all the time and use transversal operations, gate i of one block touching only qubit i of another, so errors can't spread within a block; not every gate can be done this way (the T gate), so fault tolerance remains a research problem.

- The question a student asked: what if the helper qubit fails? (Q24-09 23:29-24:30, her answer).
- Compute on encoded data; fault tolerance as bootstrapping (Q25-11 68:11-69:01; Q24-13 00:13-02:50).
- CNOT spreads X forward and Z backward (69:08-71:24).
- Transversal CNOT between two 7-qubit blocks (71:31-72:52).
- Logical X and Z: commute with every check, are not checks, anticommute with each other (72:54-75:34).
- Callbacks: T is the hard gate (QC05-03); the threshold theorem (QC01-03).

**Hook.** Every error check is built from CNOT gates, and a CNOT can turn one error into two. A code that fixes one error per block now faces two. How can correction work when the corrector is noisy too?

**Sources.** Q25-11 68:01-75:34 (s26-s29: fault tolerance, transversal gates, logical operators); Q24-13 00:10-03:31 (s2: fault tolerance as bootstrapping (2024)); Q24-09 23:29-24:40 (p7: her answer: errors on the helper qubits (2024)).

**2024 merge.** Q24-13 adds the bootstrapping view; Q24-09 the motivating question.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q24-13 01:58-02:25: the whole process is more like a bootstrapping process
- Q25-11 70:56-71:24: error propagation will kill you
- Q25-11 71:31-72:26: transversal: a single error spreads to only one qubit per block

**Tape.** Q25-11 s27 (crop the footer); Q25-11 s28 (crop the footer).

**Avoid.** Q24-09 23:29: the question is a student's voice: paraphrase it, clip only her answer.

**Check first.**

- Eastin-Knill theorem (2009): no code has a universal transversal gate set.
- Magic-state injection for T.

**Notes.** Closes the error-correction block.

## QC09 - Closing: open problems and where to work

### QC09-01 - What Could Still Go Wrong, and What to Work On

6 min, math none, primary Q24-13 slides s82-s83, status queued. Needs: QC08-08.

**Core idea.** Her honest map of what is open: quantum computing could still stall if errors grow as chips grow (error correction assumes they don't) or if bigger chips lose quality; modest quadratic speed-ups can vanish under error-correction overhead, and quantum machine learning on classical data is unproven; the system work ahead (compilers, architectures, decoders, machine learning for quantum systems, software for neutral-atom and photonic machines) is where computer scientists can lead, with classical computing's big ideas as the guide and the details rebuilt for quantum.

- What could make it fail (Q24-02 p40, slide only).
- Quadratic speed-ups vs overhead (Q24-13 14:39-15:59); quantum ML doubts (15:59-17:52).
- NISQ applications are still being looked for (Q25-01 52:20-53:45, her answer).
- Directions: machine learning for decoders, mapping and code design; software stacks for neutral atoms and photonic measurement-based machines (Q24-13 73:51-77:19).
- Two kinds of research: improve a known solution, or open a new area (Q24-13 77:19-77:46; Q25-03 51:29-52:22).
- Classical philosophy, quantum details (Q25-01 74:54-75:20); research that reaches industry (Q25-02 77:22-77:55).

**Hook.** Forty years in, nobody has found a law of physics that forbids a useful quantum computer. So what could still stop it, and what should a computer scientist build next?

**Sources.** Q24-13 14:39-17:52 (s19: speed-up and quantum ML caveats (2024)); Q24-13 73:51-77:46 (s82-s83: research directions (2024)); Q25-01 51:54-53:45 (p12: her answer: what we can solve today); Q25-01 74:54-75:20 (p17: classical philosophy, quantum details).

**Extra slides.** Q24-02 p40 (possible reasons for quantum computing to fail (slide only)).

**2024 merge.** Mostly 2024 material: 2025 ends on error correction, the 2024 course closed with this outlook.

**Clip candidates** (machine transcript: check by ear, her voice only):

- Q24-13 15:06-15:59: quadratic speed-ups vs error-correction overhead
- Q24-13 77:19-77:46: two types of research: improve the previous one, or explore new topics
- Q25-01 74:54-75:20: the high-level philosophy of classical computing drives quantum
- Q25-02 77:22-77:55: research can directly have industry impact

**Tape.** Q24-02 p40.

**Avoid.** Q24-13 65:58-73:51: project logistics, grading and remarks on chatbot-written reports: never use. Q24-13 76:24-76:49 names companies as project ideas: keep names off screen.

**Check first.**

- Babbush et al., PRX Quantum 2, 010103 (2021) on quadratic speed-ups.
- Current status of neutral-atom and photonic platforms at the check date (keep generic).

**Notes.** Series finale. Lighter on math, heavier on her voice.

## Course outline (what the two years teach, in her order)

The 2025 course is the spine. She teaches top-down first (three lectures on why quantum computing needs system research,
with real compiler and architecture work), then bottom-up (the math of states, gates, measurement, circuits,
algorithms, error correction). The series keeps that order.

| 2025 lecture | Content | Parts | 2024 counterpart |
| --- | --- | --- | --- |
| Q25-01 Introduction 1 | hardware growth, four waves, roles of computer scientists | QC01-01..06 | Q24-01 deck (no recording), Q24-02 p23-p41 deck |
| Q25-02 Introduction 2 | qubit/gate/measurement preview, superconducting hardware, noise, native gates, mapping, SABRE | QC02-01..05 | Q24-01 p18-p38 deck |
| Q25-03 Introduction 3 | compiler passes, Paulihedral, topology and yield, surface code, Surf-Stitch | QC03-01..05 (+ QC01-06) | Q24-02 p4-p18 deck |
| Q25-04 Math 1 | ISA view, complex vectors, bases, inner products, tensor products, entanglement, Bell | QC04-01..04 | Q24-03 deck + typed notes |
| Q25-05 Math 2 | unitary gates, X, Z, H, rotations, S, T, Clifford, CNOT, Bell, fan-out | QC05-01..04 | Q24-04 recording + notes |
| Q25-06 Math 3 | CNOT/XOR, no-cloning, CZ, CNOT direction, SWAP, partial equivalence, parity gates, Toffoli | QC05-04..06 | Q24-05 recording + notes |
| Q25-07 Math 4 | measurement, composite and Bell measurement, ancilla measurement, teleportation, MBQC | QC06-01..03 | Q24-08 recording + notes |
| (none) | density matrices, global vs relative phase | QC06-04 | Q24-08 53:49-69:50 |
| Q25-08 Circuits | classical vs quantum circuits, counting, uncomputation, oracles, interference | QC07-01..04 | Q24-13 recording + notes |
| Q25-09 Algorithms | Hadamard transform, Deutsch-Jozsa, Bernstein-Vazirani, Simon | QC07-04..06 | Q24-13 (oracles, kickback) |
| Q25-10 QEC 1 | repetition code, syndromes, stabilizers, phase code, Shor code | QC08-01..03 | Q24-09 recording + deck |
| Q25-11 QEC 2 | continuous errors, Pauli group, stabilizer formalism, five-qubit code, CSS, fault tolerance | QC08-04..08 | Q24-09, Q24-11 recordings |
| (none) | open problems, research directions | QC09-01 | Q24-13 73:51-77:46, Q24-02 p40 |

## Merge decisions

1. **2025 first.** Every part's primary lecture, slide numbers and first clip come from 2025 where 2025 covers the
   idea; 2024 is merged only where it adds something or explains it better. Three parts are 2024-primary because
   2025 lacks the material: QC06-04 (density matrices, global vs relative phase: Q24-08), QC07-03 (phase kickback:
   Q24-13; 2025 names it at Q25-08 64:12 and moves on), QC09-01 (the closing outlook: Q24-13).
2. **2024 L1-L3 have no recordings** (decks only). Their unique pages are used as taped slides with narration, never
   as clips: Q24-02 p24-p31 (understanding vs harnessing quantum mechanics) -> QC04-01; p32 (superposition caveat) ->
   QC05-04, QC07-04; p33-p35, p37 (entanglement, superdense coding, CHSH) -> QC04-04; p11-p12 (photonic one-way
   computing) -> QC06-03; p8 (how to improve a compiler) -> QC03-01; p15-p18 (fabrication difficulty) -> QC03-03; p40
   (reasons quantum computing could fail) -> QC01-04, QC09-01. Q24-01 p38 gives the clean "6 -> 9 gates, depth 5 ->
   8" number for QC02-04. The rest of Q24-01/02/03 repeats the 2025 decks.
3. **2024 gate lectures (Q24-04, Q24-05)** are merged into QC05: the addition example for reversibility (QC05-01),
   Z = HXH and global vs relative phase (QC05-02), the universal-set quiz and "what makes a good gate set"
   (QC05-03, QC02-03), the crosstalk "common friend" (QC02-02), CNOT seen in the X basis (QC07-03), the RISC/CISC
   co-design loop (QC02-03), controlled-U constructions and her synthesis task (QC05-06), technology trade-offs
   (QC01-06). Her typed notes (Q24-04.notes, Q24-05.notes) replace 2025 handwriting on screen where they match.
4. **Q24-08 (measurement)** is more formal than Q25-07: projectors, partial measurement and the general recipe are
   merged into QC06-01/02; its density-matrix and phase sections become QC06-04.
5. **Q24-09 (QEC)** repeats Q25-10 and the start of Q25-11 almost slide for slide, with a clean deck that matches
   22 of the Q25-10 cut frames: QC08-01..04 tape the Q24-09 pages and take a few clearer lines from its recording.
6. **Q24-11 (stabilizer codes)** adds what 2025 skips: the small-error expansion (QC08-04), the correction condition
   (QC08-05), why four qubits can never suffice and the erasure / biased-noise / burst-error research angle (QC08-06),
   classical linear codes behind CSS (QC08-07). Its frames carry current footers; the Q25-11 frames carry an older
   institution's footer, so tape Q24-11 frames or crop the footer.
7. **Q24-13 (circuits)** adds two honest limits (quadratic speed-ups vanish under error-correction overhead; quantum
   ML on classical data is unproven) to QC07-01, the compiler-should-uncompute point to QC07-02, the |-> trick and
   phase kickback to QC07-03, fault tolerance as bootstrapping to QC08-08, and research directions to QC09-01.
8. **Merged to stay within 45 parts** (from a first cut of 52): the "many ways to build a quantum computer" axes
   (Q25-03 p14) into QC01-06; application-specific chips into QC03-03; bases and inner products into one part
   (QC04-02); no-cloning into the CNOT part (QC05-04); measurement-based computing into teleportation (QC06-03);
   Deutsch-Jozsa with Bernstein-Vazirani (QC07-05); stabilizers into "measure the error" (QC08-02); superdense coding
   moved next to CHSH (QC04-04).
9. **Order.** Her top-down lectures (QC01-QC03, compilers and chips) come before the math (QC04-QC08), as in her
   course; each early part carries just the math it needs (QC02-01 opens with how to read a circuit). Later parts
   call back (QC03-02 -> QC05-06 parity gates; QC01-03 -> QC08-04 errors go digital; QC06-02 -> QC08-02 the
   syndrome circuit).
10. **Surface code.** Only Q25-03 covers it in her own words (QC03-04, QC03-05); the 2025 surface-code lecture (L12)
    was given by a PhD student and is excluded.

## Left out

- Logistics, grading, exams, quizzes, project rules and timing in every lecture (e.g. Q25-01 00:00-10:36, Q24-13
  52:30-73:51), including remarks on chatbot-written reports.
- Student presentations (other people, no consent), and every student question or name inside the recordings: clips
  are cut from her answers only.
- Guest lectures: 2024 L6 (outside company), L7 (outside company), L10 (cloud provider), L12 (outside professor),
  and 2025 L12 (her PhD student). No transcripts kept.
- Private anecdotes about named people (Q25-03 71:36-72:06), a remark about a named startup (Q24-05 45:24-45:50), a
  company's stock (Q25-08 33:05-33:32), a government funding call (Q25-01 73:59-74:26).
- The channel rule (no China, Chinese, flags, maps or political words): the "race to the Moon" framing (Q25-01
  57:54-58:48, Q24-02 p23 and p41, Q24-05 45:50-46:45), the "national war" remark about factoring (Q24-05
  48:31-48:56), and the 2020 quantum-advantage photo from a national lab (Q25-01 p11, Q24-01 p10): never used, never
  named. Quantum-advantage experiments are referred to only by the neutral 2019 example. Q25-08 frames were cut from an
  iPad whose app bars were not in English; the bars were cropped, but check every frame before taping.
- Third-party art on slides: chip micrographs (Q25-02 p8-p12), company logos (Q25-01 p8, Q25-02 p25, Q25-03 p25),
  other papers' plots and tables (Q25-02 p14-p16, Q25-03 p17-p18 and p24), photos (Q24-02 p25, p27, p28, p39), the
  Wikipedia superdense-coding figure (Q24-02 p35), the phase-kickback figure (Q24-02 p38), clip art (Q25-01 p12,
  Q25-03 p15): covered or redrawn. The title slide of her earlier course (Q25-06 s37) is never taped.
- Errata found while planning (fix, don't caption): Q25-01 says Google's 53-qubit experiment was in 2017 (it was 2019);
  Q25-03 says 60 CNOTs where the slide says 70 (0.99^70 ~ 0.5); Q24-05 41:44 says two iSWAPs make a SWAP (iSWAP^2 =
  Z x Z); Q25-09 implies Bernstein-Vazirani needs more than n classical queries (it needs n) and gives loose
  birthday-paradox and "4(n-1)" figures for Simon.

## Open questions for the user

1. When does this queue run: after the LLM-systems queue, interleaved with it, or as its own daily slot? `planned_date`
   is empty until then. `next.py` reads only `syllabus.json` and `course/`; running this queue needs a switch to
   `syllabus-qc.json` and `course-qc/` (not made here, by instruction).
2. Order: keep her top-down order (compilers and chips before the math), or move QC02-QC03 after QC06 for viewers who
   meet qubits for the first time?
3. Names: the series name for X ("Compute Not Included" season 2?) and whether her own papers (SABRE, Paulihedral,
   Surf-Stitch, the application-specific chip flow) may be named as "her group's" on screen.
4. Company names (IBM, Google, IonQ, Quantinuum, QuEra, Pasqal, PsiQuantum, Xanadu, Intel, Rigetti) in QC01-01 and
   QC01-06: name them in narration, or keep "one company" phrasing?
