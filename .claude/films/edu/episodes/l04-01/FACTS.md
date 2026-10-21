# L04-01 "584 Years on One GPU" - fact brief

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 4 "Distributed LLM Training: Foundations", slides 7-14 (recording
10:43-20:09), plus Lecture 5 slide 3 (recording 06:48-08:46, why backward = 2x forward). Checked 2026-10-20 by the
producer at the primary sources below (the Llama 3 paper read as a PDF with pdftotext; the NVIDIA H100 product page).
Computed numbers: section C. Nothing goes on screen, into the voice or into the post unless a row below clears it, in
its safe wording.

## A. Sources

| Key | Citation | Where read |
| --- | --- | --- |
| L3 | Llama Team, AI @ Meta, "The Llama 3 Herd of Models", arXiv:2407.21783 (2024) | sec. 1: "pre-trained using 3.8 x 10^25 FLOPs"; "405B trainable parameters on 15.6T text tokens"; sec. 3.3.1: "trained on up to 16K H100 GPUs"; sec. 3.3.2 / Table 4: "BF16 Model FLOPs Utilization (MFU) of 38-43%"; sec. 3.3.4 / Table 5: "During a 54-day snapshot period of pre-training, we experienced a total of 466 job interruptions ... The remaining 419 were unexpected"; "Approximately 78% of the unexpected interruptions are attributed to confirmed hardware issues ... or suspected hardware-related issues"; "GPU issues are the largest category, accounting for 58.7%" |
| NV | NVIDIA H100 product page, specifications table (read 2026-10-20) | H100 SXM: FP8 Tensor Core 3,958 teraFLOPS*, BFLOAT16 Tensor Core 1,979 teraFLOPS*, FP16 1,979*; "* With sparsity". So without sparsity (dense): FP8 1,979, BF16 989.5 |
| KAP | Kaplan et al., "Scaling Laws for Neural Language Models", arXiv:2001.08361 (2020) | loss falls as a power law in model size and data; the plot on her slide 9 is from this paper |
| CHIN | Hoffmann et al., "Training Compute-Optimal Large Language Models" (Chinchilla), arXiv:2203.15556 (2022) | compute-optimal training uses roughly 20 tokens per parameter (Chinchilla: 70B on 1.4T) |
| SL | Her slides, L04 7-14; L05 3 | course/L04.pdf, course/L05.pdf (git-ignored) |
| REC | Her recordings, L04 10:43-20:09; L05 06:48-08:46 | course/L04.transcript.md, L05.transcript.md; clips in clips.json (checked by two recognizers, not by ear) |
| C | Computed, section C | python, below |

## B. Facts

| # | Claim (as the slide or lecture puts it) | Verified | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | Scenario: end of 2023, the PM asks you to train a Llama 3 405B model in 4 months (slide 10) | SL 10 (her teaching scenario) | "End of 2023. Your manager wants a 405-billion-parameter model, trained in four months." (a classroom scenario, not a claim about any real request) | ok |
| F2 | Scaling laws: larger models and more data give lower loss (slide 9) | KAP | "Bigger models and more data give lower loss: the scaling laws (Kaplan et al., 2020)." | ok |
| F3 | Llama 3 405B: 405B parameters, 15T tokens (slide 11) | L3 sec. 1: 405B on 15.6T tokens | "405 billion parameters, about 15 trillion tokens" (the paper: 15.6 trillion) | ok |
| F4 | Chinchilla: tokens about 20 x parameters; "we get a little bit larger" (REC 13:13-13:23; she says about 35) | CHIN ~20; C: 15T / 405B = 37 | "A 2022 rule of thumb, Chinchilla, says about 20 tokens per parameter. Llama 3 used about 37." | ok |
| F5 | Training FLOPs ~ 6 x tokens x parameters (slide 11) | standard approximation; L5 slide 3; REC | "Training costs about six operations per parameter per token." | ok |
| F6 | 6 x 405B x 15T = 3.645 x 10^25 FLOPs (slide 11) | C1 | "6 x 405 billion x 15 trillion = 3.645 x 10^25 operations" | ok |
| F7 | The paper's own figure: 3.8 x 10^25 FLOPs | L3 sec. 1; C2: 6 x 405B x 15.6T = 3.79 x 10^25 | "The paper reports 3.8 x 10^25: the same rule, with its 15.6 trillion tokens." | ok |
| F8 | Forward = 2 (one multiply, one add per weight per token) (REC 14:02) | matrix multiply: N x D x H multiply-adds = 2NDH FLOPs (L5 slide 3) | "Forward: two operations per weight per token, a multiply and an add." | ok |
| F9 | Backward = 2 x forward: gradients for the input and for the weights (L05 slide 3) | L5 slide 3 table: G_x = G_y W^T and G_w = X^T G_y, each 2NDH | "Backward does it twice: once for the gradient of the input, once for the gradient of the weights. 2 + 4 = 6." | ok |
| F10 | H100 FP8 peak 1,979 TFLOPS (slide 12) | NV: FP8 3,958 with sparsity -> 1,979 dense | "one H100 at its FP8 peak: 1,979 trillion operations a second (without sparsity)" | ok |
| F11 | One GPU: 1.842 x 10^10 s ~ 584.1 years (slide 12) | C3: 1.842 x 10^10 s; / 365-day years = 584.0 | "about 1.84 x 10^10 seconds: about 584 years" | ok |
| F12 | 584 years ago = the 1440s | C4: 2024 - 584 = 1440 | "A GPU that started in the 1440s would just about be finishing." | ok |
| F13 | 16K GPUs at 100%: 584.1 / 16K = 13.5 days (slide 13) | C5: / 16,000 = 13.3 days; / 16,384 = 13.0 days. Slide's 13.5 is off; its own answer A is "~ 13 days" | "about 13 days" (never 13.5) | soften |
| F14 | Meta used a cluster of 16K H100 GPUs (slide 13) | L3 sec. 3.3.1 "up to 16K H100 GPUs" | "up to 16,000 H100s" | ok |
| F15 | MFU ~40%, so ~2x slower (slide 13) | L3 Table 4: BF16 MFU 38-43% | "Llama 3 kept 38 to 43 percent of the peak busy: call it 40, so about 2x slower." | ok |
| F16 | Reasons: parallel strategy, memory loading, unexpected interruptions (REC 17:28; slide 13) | L3 sec. 3.3.4 | her words in clip C8 | ok |
| F17 | Interruptions | L3 Table 5 | "In a 54-day stretch of pre-training, the paper counts 466 interruptions; 419 were unexpected, and about 78% of those were hardware: GPUs most of all." | ok |
| F18 | FP16 not FP8 -> ~2x (slide 13) | L3: BF16 MFU, BF16 training; NV: BF16 dense 989.5 = half of FP8 dense 1,979 | "Llama 3 trained in 16-bit (BF16), where the H100 peaks at half its FP8 speed: about 2x more." Slide erratum: it was BF16, not FP16 (both 16-bit; say "16-bit") | soften |
| F19 | 13.5 x 4 ~ 54 days (slide 13) | C6: 13.3 x 4 = 53; her slide rounds to 54 | "about 13 days, times about 4: close to 54 days, her slide's answer" | soften |
| F20 | "real time ... 54 days" (her C6) | L3 gives no single total length; it reports a 54-day snapshot of pre-training | Her clip may play; the narration then says: "The paper itself reports a 54-day stretch of pre-training." Never "Llama 3 trained in exactly 54 days". | soften |
| F21 | GPU design is FLOPs-centric (REC 19:03) | her view | her words in clip C10 only | ok |
| F22 | Hence distributed training; next lectures: hardware, then parallelism (slide 7) | SL 7 | "So training has to be spread over thousands of GPUs. Next: what is inside such a cluster." | ok |
| F24 | MFU 40% -> "~2X" (slide 13) | C8: 1 / 0.40 = 2.5; at 38-43%: 2.3-2.6x | "At 40 percent, it runs two and a half times slower." Her slide rounds it to 2x: say "her slide rounds both factors to two". | soften |
| F25 | With 2.5x: 13.3 x 2.5 x 2 = 67 days | C9 | "nearer two months"; "weeks, not centuries" | ok |
| F26 | FP8 = 8-bit floating point; sparsity = the H100's structured-sparsity mode (skips zeros) | NV | "8-bit numbers called FP8"; "sparsity, a trick for skipping zeros" | ok |
| F23 | Honest limit: 6 x N x T is an estimate (ignores attention's own math, recomputation) | L5 slide 3 table counts matrix multiplies only | "It is an estimate: it counts the big matrix multiplies and little else." | ok |

## C. Computed (2026-10-20, `~/miniforge3/bin/python3`)

```
F = 6*405e9*15e12                    -> 3.645e25                       (C1)
6*405e9*15.6e12                      -> 3.7908e25 (paper: 3.8e25)      (C2)
F/1.979e15                           -> 1.8418e10 s; /(365*86400) = 584.04 years; /31557600 = 583.6  (C3)
2024 - 584                           -> 1440                            (C4)
1.8418e10/16000/86400                -> 13.32 days; /16384 -> 13.01 days  (C5)
13.32*4                              -> 53.3 days; 13.5*4 = 54 (slide)  (C6)
1/0.40                               -> 2.5                             (C8)
13.32*2.5*2                          -> 66.6 days (about two months)    (C9)
15e12/405e9                          -> 37.0 tokens per parameter        (C7)
```

## D. Slide errata
- Slide 13: "584.1 years / 16K ≈ 13.5 days" -> 13.3 days at 16,000 (13.0 at 16,384); its answer A "~13 days" is right.
- Slide 13: "FP16 not FP8" -> Llama 3 trained in BF16 (the paper reports BF16 MFU). Say "16-bit".
- Slide 10/13: "16K" -> the paper says "up to 16K".
- Slide 12 "peak 1,979 TFLOPS when using FP8": true for dense FP8 (NVIDIA lists 3,958 with sparsity).

## E. Third-party images on the slides
- Slide 9: the scaling-law plot (from Kaplan et al. 2020): not taped; the idea is drawn with `line_grow`.
- Slide 14: the elephant cartoon (clip art): never shown.
- Slides 11, 12, 13: text only; taped. Slide 12's reference lines at the bottom are cropped out.

## F. Real people
- Prof. Yufei Ding: her voice clips and slides only (approved); never drawn.
- No other real person appears. Authors only as text credits (Kaplan et al.; Hoffmann et al.; Llama Team).

## G. Traps
- Never "Llama 3 took 54 days to train" (F20).
- Never "13.5 days" (F13). Never "FP16" for Llama 3 (F18).
- 1,979 TFLOPS is FP8 dense, which equals BF16 *with sparsity*: never call it the BF16 speed.
- The manager scenario is her classroom story: no real person, no company claim beyond "Meta's Llama 3 paper".
- "584 years" is at 100% of peak on one GPU, in FP8: say so where it lands.

## H. Open items
- Clips are checked by two recognizers, not by ear.
