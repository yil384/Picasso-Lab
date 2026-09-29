# Brief — TritonGym (3D comic film)

Read `../README.md` first. This file gives the facts and a direction; the story is yours to make great.

## Series slot
- Accent colour: **emerald `#059669`** (the card's accent on the Projects page). Card copy today: "An ICML 2026 benchmark evaluating
  LLMs on generating optimized Triton GPU kernels via agentic workflows. 164 operators, four agent strategies, and a live leaderboard
  ranking models by correctness and kernel performance."
- Suggested world (you may improve it): a **sports / training-gym comic** — the name is literally a gym. LLM "athletes" train and
  compete on GPU-kernel "events"; the benchmark is the arena, the leaderboard is the scoreboard. Light sci-fi is fine (a futuristic
  GPU arena), but the base is 3D comic.

## Facts (from the project site, `../reference/site-tritongym.txt`; don't invent anything beyond these)
- **TritonGym: A Benchmark for Agentic LLM Workflows in Triton GPU Code Generation** — ICML 2026. Picasso Lab (UCSD) with collaborators.
- It measures how well large language models write **performant Triton GPU kernels** — not just one-shot, but **inside multi-step
  agent loops** with compilation, verification and iterative refinement.
- **164 operators** in three splits: **Standard 139** common GPU kernels (matmul, attention, normalization, activations,
  quantization…, each with a PyTorch reference and a hand-tuned "oracle" Triton kernel), **OOD 13** novel operators unlikely to be
  in pre-training data, **DSL 12** operators in new domain-specific languages (Gluon, TLX). Each operator is tested on several input shapes.
- Two metrics: **Pass@1** = correct (max absolute error ≤ 0.01 vs the PyTorch reference); **Perf@1** = oracle Triton latency ÷
  generated kernel latency (0 for failures). **Perf@1 > 1 means the generated kernel beats the hand-tuned oracle.**
- It **standardises tool access** (compile, verify, profile) so workflow design and raw model ability can be compared separately.
- **Four agent workflows**: **One-shot** (single pass; the lower bound), **Geak** (multi-agent pipeline: generator, compiler,
  verifier, optimizer, reflector), **AlphaEvolve** (iterative refinement with evaluator feedback, up to 5 attempts; currently the
  best workflow), **Leader** (diff-based iterative agent proposing incremental edits).
- A **live leaderboard** ranks models by Pass@1 and Perf@1 across Standard / OOD / DSL.

## Story seeds (pick, combine or replace)
- A kernel "event" per split: a Standard lift, an OOD surprise obstacle, a DSL event in an unfamiliar language.
- The loop as training: write → compile (a gate that clangs shut on errors) → verify (a referee checking error ≤ 0.01 against
  the PyTorch reference) → profile (a stopwatch race against the oracle champion) → refine → try again.
- Workflows as training styles/teams (one-shot sprinter vs an iterating team that improves each attempt).
- Payoff: the scoreboard lights up — "164 operators", the Pass@1 / Perf@1 board, and the moment a kernel beats the oracle (Perf@1 > 1).

## Accuracy pitfalls
- It is a **benchmark and framework**, not a single model; don't show one model "winning TritonGym". Avoid naming or ranking real
  commercial models; if you show numbers, use only the facts above.
- Triton kernels run on **GPUs**; correctness is checked against a **PyTorch reference**; speed is compared with an **oracle Triton kernel**.
- The old Gemini prompt (`projects/tritongym/prompt_tritongym.md`) shows the generic direction we are replacing — don't repeat it.
