# Brief — ChipMATE (3D comic film)

Read `../README.md` first. This file gives the facts and a direction; the story is yours to make great.

## Series slot
- Accent colour: **amber `#d97706`** (the card's accent on the Projects page). The site spells it **ChipMATE**; the card says ChipMate.
- Card copy today (older numbers — see the discrepancy note below): "A self-trained multi-agent framework for RTL (Verilog) code
  generation. Two agents cross-verify outputs via waveform comparison — outperforming DeepSeek V3 despite being 20–180× smaller."
- Suggested world (you may improve it): a **chip-city comic with a light cyberpunk flavour** — streets of logic gates, traces as
  roads, a clock ticking the whole city. The base is 3D comic.

## Facts (from the project site, `../reference/site-chipmate.txt`; the site is newer than the card — use the site's numbers)
- **ChipMATE** is a **self-trained multi-agent framework** for **Verilog (RTL)** generation — "Verilog in seconds. No testbench needed."
- **Two agents cross-verify each other on random stimuli — no golden oracle / no golden testbench**, at training or inference:
  1. **Verilog agent** — proposes a synthesizable `top_module` from the natural-language spec + port skeleton only; trained with RL
     whose reward is shaped on **cross-agreement**, not test pass rate.
  2. **Python reference-model agent** — independently writes a Python function emulating the same spec (cycle-accurate for
     sequential logic). It is the oracle proxy: any mismatch is a candidate bug in either agent.
  3. **Cross-verify harness** — compiles the Verilog with **iverilog**, drives **random input stimuli**, compares outputs
     **cycle by cycle** against the Python model, reports a **match rate ∈ [0, 1]** and a structured diagnostic on disagreement.
  4. **Refine loop** — disagreement traces go back as natural-language diagnostics; after **≤ 5 rounds** it reaches
     **match_rate = 1.0** or surfaces the best candidate.
- Numbers (VerilogEval V2 pass@1): **ChipMATE-Agents-9B 80.1%**, ChipMATE-Agents-4B 75.0%, DeepSeek V4 (1.6T-parameter MoE) 71.2%,
  Claude 3.5 Sonnet 59.7%, GPT-4o 53.4%. Headline: **the 9B model beats a 1.6T model — about 200× smaller**. Zero golden testbenches;
  two cooperating agents.
- **Discrepancy:** the website card says "outperforming DeepSeek V3 … 20–180× smaller". The project site is the current source;
  use "beats DeepSeek V4 · ~200× smaller" and mention the mismatch in your final report (the lab will update the card text).

## Story seeds (pick, combine or replace)
- A buddy-cop duo: the Verilog builder and the Python "twin" detective each build the same circuit their own way, then fire random
  signals at both and compare the traces tick by tick; a mismatch rings an alarm, a diagnostic note flies back, round 2… until every
  tick matches (match rate 1.0) and the chip city lights up.
- David vs Goliath payoff: a small 9B character outscoring a giant 1.6T one — 80.1% vs 71.2%, "~200× smaller".
- Waveforms are great comic visuals: square-wave ribbons racing side by side, matching or diverging.

## Accuracy pitfalls
- There is **no golden testbench** — the two agents check each other with random stimuli; don't show a teacher/answer key.
- Comparison is **cycle-by-cycle on random inputs**, reported as a match rate; refinement stops at match rate 1.0 or after ≤ 5 rounds.
- Use only the numbers above; don't mix the old card's DeepSeek V3 / 20–180× claim with the site's DeepSeek V4 / ~200× claim.
- The old Gemini prompt (`projects/chipmate/prompt_chipmate.md`) is what we are replacing — don't repeat it.
