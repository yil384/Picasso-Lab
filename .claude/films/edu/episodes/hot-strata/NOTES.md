# Hot topic: Strata (a 125B MoE "on one RTX 4090", HN ~2026-10-04) x our ISCA'26 best paper

Angle: Strata works because MoE expert choices are not random. Our released traces (Qwen3-235B-A22B-FP8, "Patterns
behind Chaos", ISCA'26 Best Paper) show it: 150 requests (MMLU anatomy / college CS / HS math / world religions,
LiveCodeBench execution, AIME 2024), popularity learned on 79, measured on 71 (9,082 generated tokens).

GPU holds C of 128 experts per layer (94 layers, 8 chosen per token). Hit rate = chosen experts already on the GPU.
| C | random | popular only | LRU | decay predictor |
| --- | --- | --- | --- | --- |
| 16 (1/8) | 12.5% | 30% | 57% | 59% |
| 32 (1/4) | 25% | 51% | 75% | 77% |
| 64 (1/2) | 50% | 79% | 90% | 93% |
At C = 64 the misses move 0.99 GB/token (decay) vs 1.49 (LRU) vs 7.1 (random): PCIe 4.0 bound ~25 vs 17 vs 3.5 tok/s.

Safe wording: "on our released Qwen3-235B traces, keeping 1/4 of the experts on the GPU hits 3x as often as random";
"simulation of expert caching, not a run of Strata"; the tok/s figures are PCIe transfer bounds for Qwen3-235B FP8
(3 x 4096 x 1536 B per expert, 25 GB/s), not measured speeds. The "forecast" and "decay" policies are simple predictors
written for this post, NOT the paper's method; the paper's own results (e.g. 6.6x, simulated wafer-scale) are separate.
Data is gated on Hugging Face (fetch.py needs HF_TOKEN); traces are not committed.
