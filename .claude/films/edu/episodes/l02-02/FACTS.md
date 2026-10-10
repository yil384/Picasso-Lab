# L02-02 "The Gate: From ReLU to SwiGLU" - fact brief

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 2 slides 13-21 (recording 27:59-43:55 and 45:22-51:18) and
Lecture 3 slides 2-4 (worksheet 2, recording 04:14-09:26). Checked 2026-10-09 against primary sources (paper PDFs on
arXiv and publishers' copies, official code and configs); the full research table with quotes is kept in the work
folder (`~/picasso-work/daily/L02-02/research_facts.md`). Nothing goes on screen, into the voice or the post unless a
row below clears it, in its safe wording.

## Source key
| Key | Citation | Where read |
| --- | --- | --- |
| HORNIK91 | Hornik, K. (1991). Approximation capabilities of multilayer feedforward networks. Neural Networks 4(2):251-257 | journal PDF copy; abstract, Theorem 2 |
| LESHNO93 | Leshno, Lin, Pinkus, Schocken (1993). Multilayer feedforward networks with a nonpolynomial activation function can approximate any function. Neural Networks 6(6):861-867 | author's PDF; abstract, Theorem 1 |
| VASWANI17 | Vaswani et al. (2017). Attention Is All You Need. arXiv:1706.03762 | Sec. 3.3, Eq. 2, Table 3 |
| MAAS13 | Maas, Hannun, Ng (2013). Rectifier Nonlinearities Improve Neural Network Acoustic Models | Sec. 2 |
| LU19 | Lu, Shin, Su, Karniadakis (2019). Dying ReLU and Initialization. arXiv:1903.06733 | abstract, Sec. 1 |
| HG16 | Hendrycks & Gimpel (2016). Gaussian Error Linear Units (GELUs). arXiv:1606.08415 | Sec. 2 |
| BERT18 | Devlin et al. (2018). BERT. arXiv:1810.04805 | App. A.2 |
| GPT1 | Radford et al. (2018). Improving Language Understanding by Generative Pre-Training | Sec. 4.1 |
| GPT2CODE | the gpt-2 code repository, src/model.py; Hugging Face config "gelu_new" | code lines 25-26, 118 |
| ELFWING18 | Elfwing, Uchibe, Doya (2018). Sigmoid-weighted linear units... Neural Networks 107:3-11; arXiv:1702.03118 | abstract, Sec. 2.2 |
| SWISH17 | Ramachandran, Zoph, Le (2017). Searching for Activation Functions. arXiv:1710.05941 v2 | abstract, Sec. 2, Sec. 4 |
| DAUPHIN17 | Dauphin, Fan, Auli, Grangier (2017). Language Modeling with Gated Convolutional Networks. ICML; arXiv:1612.08083 | Sec. 2, Eq. 1 |
| SHAZEER20 | Shazeer (2020). GLU Variants Improve Transformer. arXiv:2002.05202 | Sec. 2, 3.1, Table 1, Sec. 4 |
| LLAMA1 | Touvron et al. (2023). LLaMA. arXiv:2302.13971 | Sec. 2.2 |
| LLAMACODE | meta-llama/llama llama/model.py (multiple_of = 256; FeedForward) | code |
| LLAMA3 | Llama Team (2024). The Llama 3 Herd of Models. arXiv:2407.21783 | Table 3 |
| MISTRAL23 | Jiang et al. (2023). Mistral 7B. arXiv:2310.06825 + official config.json | Table 1; config |
| OLMO24 | Groeneveld et al. (2024). OLMo. arXiv:2402.00838 | Sec. 2.1 |
| GEMMA | Gemma Team (2024, 2024, 2025). Gemma 1/2/3 reports, arXiv:2403.08295, 2408.00118, 2503.19786 | Sec. 2; Table 1 |
| PALM22 | Chowdhery et al. (2022). PaLM. arXiv:2204.02311 | Sec. 2 |
| KAPLAN20 | Kaplan et al. (2020). Scaling Laws for Neural Language Models. arXiv:2001.08361 | Sec. 2.1, Eq. 2.2 |
| L02 / L03 | Prof. Ding's slides and recording, CSE 291P Lecture 2 and Lecture 3 | course files |
| RUN | computed tonight (arithmetic below) | this file |

## Facts
| # | Claim (as the slide or lecture puts it) | Verified (source, place) | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | Only matrix multiplications (linear layers) cannot capture different relations; stacking more of them does not help (L02 slide 14; her demo: 2, 3, 5 or 6 linear layers never converge) | math: a product of matrices is one matrix; L02 28:14-29:15 | Stack as many matrix multiplies as you like: together they are still one matrix multiply, one straight-line map. | ok |
| F2 | Universal approximation theorem: one non-linear layer with enough neurons approximates any continuous function (slide 14, Hornik 1991) | HORNIK91 abstract, Thm 2 | In 1991 Kurt Hornik proved that one hidden layer with a bounded non-linear activation and enough units can get as close as you like to any continuous function on a bounded region. | soften (say "one hidden layer", "enough units") |
| F3 | ...and that covers ReLU | LESHNO93 Thm 1 | In 1993 a follow-up showed the same holds for any activation that is not a polynomial, ReLU included. | ok |
| F4 | Honest limit of the theorem | HORNIK91, LESHNO93 | The theorem says such a network exists; it says nothing about how big it must be or whether training will find it. | ok |
| F5 | Activation sits only in the feed-forward layer: two matrix multiplications with the activation between (slide 15) | VASWANI17 Sec. 3.3 Eq. 2; L02 31:02-31:21 | The feed-forward layer is two matrix multiplies with an activation in between: FFN(x) = act(x W1) W2. | ok |
| F6 | Original Transformer: ReLU, d_model 512, d_ff 2048 (hidden width 4x) | VASWANI17 Sec. 3.3, Table 3 | The 2017 Transformer widened each 512-number vector to 2048, four times wider, applied ReLU, and squeezed it back to 512. | ok |
| F7 | Hidden width usually 4h (L03 slide 3) | VASWANI17 (2048/512 = 4); L03 05:18-05:31 | The usual hidden width is four times the model width: 4h. | ok |
| F8 | Bias terms are often dropped nowadays (L02 31:24-31:36) | LLAMACODE (bias=False in the FFN) | Many newer models drop the bias terms; we leave them out too. | ok |
| F9 | ReLU(x) = max(0, x), used in the original Transformer (slide 16) | VASWANI17 Eq. 2 | ReLU keeps a positive number as it is and turns a negative number into zero. | ok |
| F10 | ReLU is easy to compute and its gradient is easy: 1 for x > 0, 0 otherwise (slide 16; L02 32:42) | math; MAAS13 | Its slope, the gradient, is one for positive inputs and zero for negative ones: cheap both ways. | ok |
| F11 | Keeps the input on the same numerical order (slide 16) | math (output = input for x > 0) | For positive inputs the output is the input, so numbers keep their size. | ok |
| F12 | Sigmoid's slope "maximal is only 0.75" (L02 33:33) | math: sigma'(0) = 0.25 is the maximum | The sigmoid's slope is never more than one quarter. | erratum: 0.25 (do not use 0.75) |
| F13 | Dead ReLU for x < 0: zero gradient, weights never change (slide 16; L02 34:00-34:12) | MAAS13 Sec. 2; LU19 abstract | If a ReLU unit outputs zero for every input, its gradient is zero everywhere and it stops learning: a "dead" ReLU. | ok |
| F14 | GELU(x) = x * Phi(x), Phi the CDF of the (standard) normal distribution (slide 17) | HG16 Sec. 2 | GELU multiplies the input by Phi of x, the chance that a standard bell-curve sample falls below x: near 1 for large x, near 0 for very negative x. | ok |
| F15 | GELU lets some gradient through for x < 0 | HG16 (smooth, non-zero slope for negative x) | Small negative inputs are let through a little, so they still get a gradient. | ok |
| F16 | BERT, GPT-1, GPT-2 used GELU (before 2020) (slide 17) | BERT18 App. A.2; GPT1 Sec. 4.1; GPT2CODE | BERT and the first GPT used GELU; GPT-2's released code does too. | ok |
| F17 | GELU is harder to compute and differentiate, but still much cheaper than the matrix multiplies (slide 17; L02 36:06-36:18) | HG16 (erf or tanh approximation) | GELU costs more than ReLU, but next to the matrix multiplies it is still small change. | soften ("small change", no number) |
| F18 | SiLU(x) = x * sigmoid(x), "Sigmoid Linear Unit"; easier to compute than GELU (slide 18) | HG16 Sec. 2 (named SiLU there, 2016); ELFWING18 | SiLU, x times sigmoid of x, the Sigmoid Linear Unit: the same S-shaped gate, cheaper to compute than the bell-curve one. | ok |
| F19 | SiLU was proposed in the same paper as GELU (L02 37:30-37:43) | HG16 Sec. 2 | The 2016 GELU paper already wrote down x times sigmoid of x and named it SiLU. | ok |
| F20 | "SwishLU" = x * sigmoid(beta x); beta = 1 is SiLU (slide 19) | SWISH17 abstract, Sec. 4 | Swish is x times sigmoid of beta times x; with beta equal to one it is exactly SiLU, as the Swish paper says. | erratum: the paper calls it "Swish" |
| F21 | 2017, Google Brain searched for activation functions and found Swish (slide 19) | SWISH17 abstract, Sec. 2 | In 2017 a Google Brain team let a computer search through combinations of simple functions, by brute force and with a learned search, and Swish came out on top. | ok |
| F22 | Self-gated: SiLU's gate and value both come from x (slide 20 table) | math | In SiLU the input opens its own gate: the same x is both the water and the hand on the tap. | ok |
| F23 | GLU: gated linear unit (slide 19: Dauphin et al. 2016/2017) | DAUPHIN17 Sec. 2 Eq. 1 | A gated linear unit makes two separate projections of the input; a sigmoid of one decides, number by number, how much of the other gets through. | ok |
| F24 | SwiGLU = x1 * SiLU(x2) from two different linear transformations; three matrices W, V, W2 (slide 20; L03 slide 4) | SHAZEER20 Sec. 2 Eq. 6 | SwiGLU: FFN(x) = (SiLU(x W) times x V) W2. Three matrices: one makes the gate, one makes the content, one brings the result back down. | erratum: slide 20's table writes sigmoid(x2); the gate uses SiLU (Swish) |
| F25 | Key is to decouple the gate and the content (value) (slide 20) | SHAZEER20; DAUPHIN17 | The trick is to separate the gate from the content. | ok |
| F26 | SwiGLU is used by almost all top LLMs (slide 20 list) | LLAMA1 Sec. 2.2; LLAMA3 Table 3; MISTRAL23 config; OLMO24 Sec. 2.1; PALM22 Sec. 2 | Llama, Mistral and OLMo, open models with published designs, all use SwiGLU, and so did PaLM. | soften: name only these; no closed models |
| F27 | (slide 20 lists Gemma 3) | GEMMA reports | Gemma uses a GELU-gated cousin, GeGLU. | erratum: Gemma is GeGLU, not SwiGLU |
| F28 | Gated beats non-gated at the same compute (L02 41:12-41:33) | SHAZEER20 Table 1: log-perplexity 1.677 (ReLU) vs 1.636 (SwiGLU), 1.633 (GEGLU) | At the same size and compute, the gated layers did better than ReLU, GELU or Swish, but only a little: about 1.68 against 1.64 on the paper's score, lower is better. | ok |
| F29 | The SwiGLU paper offers no explanation | SHAZEER20 Sec. 4 | The paper ends: "We offer no explanation as to why these architectures seem to work; we attribute their success, as all else, to divine benevolence." | ok (quote exactly) |
| F30 | Standard FFN parameters: (h x 4h) + (4h x h) = 8h^2 (L03 slide 3) | RUN; KAPLAN20 Table 1 | Two matrices of h by 4h: 8 h-squared weights. | ok |
| F31 | Gated FFN: 3 x (h x d_ff) = 3 h d_ff = 8h^2 -> d_ff = 2/3 x 4h, about 2.67h (L03 slide 4) | RUN; SHAZEER20 ("reduce d_ff by a factor of 2/3") | Three matrices of h by d_ff hold the same 8 h-squared weights when d_ff is 8/3 of h: two-thirds of 4h, about 2.67h. | ok |
| F32 | Same parameters means same compute (L03 06:02-06:28: two operations per parameter per token) | KAPLAN20 Eq. 2.2 | Each weight costs about two operations per token, a multiply and an add, so equal weights means equal compute. | ok |
| F33 | "Without increasing latency" (slide 20 note; L03 slide 4) | SHAZEER20 ("keep the number of parameters and the amount of computation constant") | The shrink keeps the weights and the compute the same. | soften: say "compute", not "latency" |
| F34 | Shazeer's own numbers | SHAZEER20 Sec. 3.1 | In the SwiGLU paper the hidden width went from 3072 to 2048, for a model width of 768. | ok |
| F35 | Llama 7B: model width 4096, hidden 11,008 | LLAMA1 Sec. 2.2 ("2/3 4d instead of 4d"); LLAMACODE; config | In Llama's 7B model, 4 x 4096 would be 16,384; two-thirds of that is about 10,923, which the code rounds up to 11,008. | ok |
| F36 | Swish search / Swish credit vs earlier SiLU | SWISH17 v2 Sec. 4; HG16 | (context only) The search re-found a function already written down a year earlier. | ok (optional) |
| F37 | "Experimental research": results first, explanations after (L02 41:33-41:42) | her clip C7 | (her words only) | ok |
| F38 | (worked value, ours) x = -1 through each function | RUN (below) | ReLU: minus one becomes zero. GELU: minus one comes out as minus 0.16. SiLU: minus one comes out as minus 0.27. | ok |
| F39 | (ours) Llama 7B feed-forward weights per layer | RUN: 3 x 4096 x 11,008 = 135,266,304; 2 x 4096 x 16,384 = 134,217,728 | About 135 million weights with three matrices against 134 million with two: nearly the same bill. | ok |
| F40 | OLMo also shrinks: about 8/3 d, 11,008 at 7B | OLMO24 Sec. 2.1 | AI2's OLMo uses SwiGLU with a hidden width of about 8/3 of the model width, 11,008 at 7B. | ok |
| F41 | Hook: big open models run the three-matrix trick; Llama and OLMo shrink to about two-thirds | F26, F35, F40 | Llama, Mistral and OLMo all run the three-matrix trick; Llama and OLMo pay for it by shrinking the layer to about two-thirds. (Not "every model": Mistral 7B and Llama 3 8B use 14,336 = 3.5 times 4096.) | ok |

## Computed (RUN)
```
standard FFN : h*4h + 4h*h            = 8 h^2
gated FFN    : 3 * h * d_ff = 8 h^2  -> d_ff = 8h/3 = 2.667 h, about 2.67 h  (= 2/3 * 4h)
h = 4096     : 4h = 16,384; 2/3 * 16,384 = 10,922.67; next multiple of 256 = 43 * 256 = 11,008 (11,008 / 4096 = 2.6875)
h = 768      : 4h = 3072; 8h/3 = 2048 exactly (SHAZEER20)
weights ratio before the shrink: 3 * h * 4h = 12 h^2 vs 8 h^2 (1.5 times)
sigmoid slope: s(x)(1 - s(x)), max at x = 0: 0.5 * 0.5 = 0.25
x = -1        : ReLU 0; GELU -1 * Phi(-1) = -0.1587 (-0.16); SiLU -1 * sigmoid(-1) = -0.2689 (-0.27)
Llama 7B FFN : 3 * 4096 * 11,008 = 135,266,304 vs 2 * 4096 * 16,384 = 134,217,728 weights per layer
plot values (drawn as ink curves): ReLU(-2) = 0, GELU(-0.75) = -0.17 (its dip, min about -0.17), SiLU(-1.28) = -0.28 (min about -0.28)
```
(python: `import math; g=lambda x: x*0.5*(1+math.erf(x/2**.5)); s=lambda x: x/(1+math.exp(-x)); min(g(i/100) for i in range(-400,0)), min(s(i/100) for i in range(-400,0))` -> -0.170, -0.278.)

## Slide errata
- Slides 14, 16, 17: the footer "Hornik, K. (1991)" belongs to slide 14's theorem only; on 16 and 17 it is a leftover. Not shown.
- Slide 14: Hornik's theorem needs a bounded activation and speaks of one hidden layer; ReLU is covered by Leshno et al. 1993 (F2, F3).
- Lecture 33:33: the sigmoid's slope peaks at 0.25, not 0.75 (F12). Not used on screen.
- Slide 19: "SwishLU" -> the paper's name is Swish (F20); "Dauphin et al. 2016/2017" is arXiv Dec 2016, ICML 2017.
- Slide 20 table: SwiGLU's gate is SiLU(x2) (as in the slide's own figure caption), not sigmoid(x2) (F24). The pen corrects it.
- Slide 20 model list: names closed models (not shown); "Gemma 3" uses GeGLU (F27). The list is covered by a blank taped sheet.
- Slide 20 / L03 slide 4 "without increasing latency": the paper says parameters and computation (F33).

## Third-party images on the slides
| Slide | Image | Handling |
| --- | --- | --- |
| 14 | TensorFlow Playground screenshot | slide not shown; idea redrawn as the ruler drawing |
| 15 | Transformer figure from Vaswani et al. 2017 | slide not shown |
| 17 | two plots (ReLU/GELU curves; normal CDF) | covered by a blank taped sheet; our own ink curves drawn on it |
| 18 | normal CDF and sigmoid plots | slide not shown |
| 20 | FFN diagrams (her own drawings, from the course) | shown |
| 21 | table (her own) | shown |
| L03-4 | worksheet diagrams and box (her own) | shown |

## Real people named and how they appear
- Prof. Yufei Ding: voice clips (checked) and slides; credit in text; never drawn.
- Authors named only as text citations (Hornik; Shazeer; "a Google Brain team"); never drawn.

## Traps
- Never "Hornik proved any activation works" or "Hornik covers ReLU" (F2, F3). Never "one layer is enough in practice" (F4).
- Never "Google invented SiLU/Swish": x times sigmoid(x) was in the 2016 GELU paper (F19, F20).
- Never "SwiGLU = x1 times sigmoid(x2)" (that is the plain GLU); SwiGLU's gate is SiLU (F24).
- Never "SwiGLU is much better": the gain is small (F28). Never "Shazeer explained why" (F29).
- Never "Llama's width is exactly 8/3 h" (it is 11,008 = 2.6875 h after rounding) (F35). Never "PaLM shrank to 2/3".
- Never "Gemma uses SwiGLU" (F27). Never "without increasing latency" (F33). Never "the sigmoid's slope peaks at 0.75".
- Never name closed models from slide 20. Keep to the architecture: no origin of any company or model.

## Open items / decisions
- Open models named: Llama, Mistral, OLMo (and PaLM as a published design). Slide 20 also lists two other open
  families; they are left out tonight under the channel's house rules; Llama, Mistral and OLMo
  carry the point.
- Clips are checked by two recognizers, not by ear.
