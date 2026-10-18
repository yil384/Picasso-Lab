# L03-04 "The Residual Highway" - fact brief

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 3 "Transformer Model Architecture Variants (2)", slides 22-31
(recording 47:47-71:31). Checked 2026-10-17 by the producer and one research sweep at the primary sources below (papers
read as PDFs; the Grok-1 code read at its source; notes in `~/picasso-work/daily/L03-04/research/r1.md`). Computed
numbers: `~/picasso-work/daily/L03-04/scripts/ds_check.py` (section C). Nothing goes on screen, into the voice or into
the post unless a row below clears it, in its safe wording.

## A. Sources

| Key | Citation | Where read |
| --- | --- | --- |
| VAS | Vaswani et al., "Attention Is All You Need", NeurIPS 2017, arXiv:1706.03762 | sec. 3.1: "the output of each sub-layer is LayerNorm(x + Sublayer(x))" |
| BA | Ba, Kiros, Hinton, "Layer Normalization", arXiv:1607.06450 (2016) | abstract: statistics "from all of the summed inputs to the neurons in a layer on a single training case"; BN "dependent on the mini-batch size"; sec. 3: works "with batch size 1" |
| BN | Ioffe, Szegedy, "Batch Normalization", ICML 2015, arXiv:1502.03167 | sec. 3, Algorithm 1 (mini-batch mean and variance, per feature) |
| RMS | Zhang, Sennrich, "Root Mean Square Layer Normalization", NeurIPS 2019, arXiv:1910.07467 | abstract: "comparable performance against LayerNorm but reduces the running time by 7%~64% on different models"; sec. 4: "totally removing the mean statistic"; eq. 4: a gain, no bias |
| LLAMA | Touvron et al., "LLaMA", arXiv:2302.13971 | sec. 2.2: "we normalize the input of each transformer sub-layer ... We use the RMSNorm normalizing function" |
| GOPH | Rae et al., "Scaling Language Models: Methods, Analysis & Insights from Training Gopher", arXiv:2112.11446 | sec. 3: "we use RMSNorm ... instead of LayerNorm" |
| XIO | Xiong et al., "On Layer Normalization in the Transformer Architecture", ICML 2020, arXiv:2002.04745 | abstract: Post-LN "expected gradients of the parameters near the output layer are large"; "the warm-up stage is practically helpful"; Pre-LN "gradients are well-behaved at initialization"; "without the warm-up stage can reach comparable results" |
| BERT | Devlin et al., arXiv:1810.04805 | sec. 3: "almost identical to the original" Transformer; XIO intro lists BERT among Post-LN models |
| GPT2 | Radford et al. 2019, GPT-2 report | sec. 2.3: "Layer normalization ... was moved to the input of each sub-block" |
| PERI | Kim et al., "Peri-LN: Revisiting Normalization Layer in the Transformer Architecture", ICML 2025, arXiv:2502.02732 | sec. 1: "applying LN around the sub-layer, i.e., on both its input and output"; eq. 7; related work: Gemma 2, Gemma 3, OLMo 2 "already employ a Peri-LN-like structure"; never names Grok |
| GEM2 | Gemma Team, arXiv:2408.00118 | sec. 2: "RMSNorm ... to normalize the input and output of each transformer sub-layer" |
| GEM3 | Gemma Team, arXiv:2503.19786 | sec. 2: "post-norm and pre-norm with RMSNorm" |
| OLMO2 | Team OLMo, "2 OLMo 2 Furious", arXiv:2501.00656 | sec. 3.3.2 "Reordered norm": normalizes the outputs only |
| RES | He et al., "Deep Residual Learning for Image Recognition", CVPR 2016, arXiv:1512.03385; He et al., "Identity Mappings in Deep Residual Networks", ECCV 2016, arXiv:1603.05027 | "recast into F(x)+x"; "signals can be directly propagated from one block to any other block"; cites earlier shortcut connections |
| HC | Zhu et al., "Hyper-Connections", ICLR 2025, arXiv:2409.19606 | sec. 1: "expand the network's input into n copies, each having its own depth connection"; fig. 1: OLMoE-1B-7B vs OLMoE-1B-7B-DHCx4, "converges 1.8 times faster" |
| MHC | Xie et al., "mHC: Manifold-Constrained Hyper-Connections", arXiv:2512.24880 (v1 31 Dec 2025; v2 Jan 2026) | sec. 1: Sinkhorn-Knopp projection "onto the Birkhoff polytope"; sec. 4.1: spectral norm bounded by 1, "closed under matrix multiplication"; sec. 3.1: HC gain "peaks of 3000"; sec. 5.4: mHC about 1.6; 6.7% extra time at n = 4; sec. 5.1: 3B, 9B, 27B models |
| SL | Her slides, L03 22-31 | course/L03.pdf (git-ignored) |
| REC | Her recording, L03 47:47-71:31 | course/L03.transcript.md; clips in clips.json (checked by two recognizers, not by ear) |
| C | Computed, section C | `ds_check.py` |

## B. Facts

| # | Claim (as the slide or lecture puts it) | Verified | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | A residual block computes x + F(x); the plain x path is a shortcut | RES (2015/2016) | "Each block adds its change onto the input: x plus F of x." | ok |
| F2 | Layer 100 can still give its gradient to layer 1 through the shortcut (her example) | RES "directly propagated from one block to any other block"; REC 52:36 | "Through the shortcut, layer 100's gradient reaches layer 1 directly." (her example number) | ok |
| F3 | Skip connections have been in use for more than 10 years (she: "more than 10 years") | RES arXiv Dec 2015 -> Oct 2026 = more than 10 years | "about ten years"; "since ResNet in 2015" | ok |
| F4 | ResNet introduced skip connections | RES cites earlier shortcuts and highway networks | "ResNet made the identity shortcut the standard" (never "invented") | soften |
| F5 | Original 2017 Transformer: norm after the addition (Post-LN) | VAS sec. 3.1 | "The 2017 Transformer adds first, then normalizes." | ok |
| F6 | BatchNorm: per feature across the batch; LayerNorm: across the features of one sample | BN; BA | "BatchNorm averages each feature across the batch; LayerNorm averages across one token's own numbers." | ok |
| F7 | Sequences vary in length, so batch statistics become unreliable; LN works per token | BA ("not obvious how to apply it to recurrent neural networks"; works with batch size 1); slide 23; REC 48:44 | "Sentences come short and long, so batch averages wobble; LayerNorm needs no batch at all." | ok |
| F8 | She: "experimental computer science"; LN chosen because experiments show it works better | slide 23 "Because experiments show it works better!"; REC 49:11 | her own words only | ok |
| F9 | RMSNorm drops the mean (and the bias) | RMS sec. 4, eq. 4 | "RMSNorm skips subtracting the average and has no bias: it only rescales." | ok |
| F10 | RMSNorm is cheaper, same quality | RMS abstract | "about the same quality, 7 to 64 percent less running time in its 2019 paper, depending on the model" | ok |
| F11 | LLaMA family uses RMSNorm; also PaLM, Chinchilla, T5 (slide) | LLAMA; GOPH (Chinchilla inherits); PaLM never says RMSNorm; T5 "scale-only" | "the Llama family uses it" (PaLM never named; T5 not named) | soften |
| F12 | GPT-2/3, OPT, BLOOM use LayerNorm (slide) | GPT2; BLOOM sec 3.2 | "GPT-2 and GPT-3 use LayerNorm" (only these two if named) | ok |
| F13 | Pre-LN: x + F(LN(x)); keeps the identity path clean | XIO; slide 25 | "Pre-LN normalizes only the copy that goes into the block; the shortcut stays untouched." | ok |
| F14 | Post-LN is less stable early in training | XIO abstract (large gradients near the output at initialization; warm-up helps) | "Post-LN starts training with large gradients near the output, so it needs a slow warm-up (Xiong et al., 2020)." | ok |
| F15 | Pre-LN can train without warm-up | XIO | "Pre-LN can train without warm-up and reach comparable results." (never "never needs") | ok |
| F16 | Only earlier models such as BERT used Post-LN | BERT; XIO intro; GPT2 moved to Pre-LN | "BERT kept the original Post-LN; GPT-2 moved the norm to the input." | ok |
| F17 | Peri-LN: norm before and after the sub-layer, outside the residual path | PERI eq. 7 | "Peri-LN normalizes what goes into the block and what comes out, before it joins the shortcut." | ok |
| F18 | Gemma 2 / Gemma 3, OLMo 2, Grok adopted Peri-LN (slide) | GEM2, GEM3 true Peri-LN; OLMO2 outputs only (PERI: "Peri-LN-like"); Grok not in PERI, only Grok-1 open code | "Gemma 2 and Gemma 3 do exactly this; OLMo 2 uses a close cousin." Grok: drop | soften |
| F19 | Industry adopted it around 2024; the first paper on it is 2025 (her words) | GEM2 (Jul 2024); PERI (Feb 2025) | "models shipped it in 2024; a paper studied it in 2025" | ok |
| F20 | Hyper-connections: n parallel adjustable skip streams instead of 1 fixed identity | HC sec. 1; slide 28 | "Hyper-connections copy the stream into n lanes, here four, mixed with learned weights." | ok |
| F21 | Toy gradient: y = x1 + x2 -> dx1 = dy, dx2 = dy; y = 0.2 x1 + 0.8 x2 -> dx1 = 0.2 dy, dx2 = 0.8 dy | calculus; slides 28-29 | as written: "the weight 0.2 scales the gradient by 0.2" | ok |
| F22 | HC trained at large scale: converges about 2x faster (she: "about two times") | HC fig. 1: 1.8 times faster, dynamic HC, 4 lanes, OLMoE-1B-7B, 500B tokens | "reached the baseline's loss 1.8 times faster (in tokens, not clock time)" | soften |
| F23 | Multiplying weights over many layers can blow up or die | C: 1.1^100 = 13,781; 0.9^100 = 0.000027 | "A weight of 1.1, a hundred times over, is about 13,800. A weight of 0.9, a hundred times over, is about 3 in 100,000." | ok |
| F24 | In plain HC the signal gain through the stack peaked near 3000; mHC about 1.6 | MHC sec. 3.1, 5.4 | "the signal gain hit about 3,000; with mHC it stays near 1.6" | ok |
| F25 | mHC: mixing matrix is doubly stochastic (Birkhoff): rows and columns sum to 1, entries 0-1 | MHC sec. 1, 4.1; slide 30 | "every row sums to 1, every column sums to 1, nothing negative" | ok |
| F26 | Doubly stochastic matrices are closed under multiplication | C (section C proof and her slide-30 numbers); MHC sec. 4.1 | "multiply two of them and you get another one, however many layers" | ok |
| F27 | Its spectral norm is 1: it never stretches a vector | MHC sec. 4.1; C | "it can never stretch the signal" (never "preserves the norm") | ok |
| F28 | mHC by DeepSeek, 2026 (slide); "28B model" plot | MHC v1 31 Dec 2025; models 3B, 9B, 27B | "Xie et al., arXiv 2025 (DeepSeek)"; "a 27B model" | soften |
| F29 | mHC extra cost | MHC: 6.7% extra training time at n = 4 | "about 6.7 percent more training time, with four lanes" | ok |
| F30 | mHC's projection uses Sinkhorn-Knopp | MHC sec. 4.2 (20 iterations) | "a few rounds of rescaling rows and columns (Sinkhorn-Knopp)" | ok |
| F31 | Attention = inter-token mixing (a person listens to others in the meeting); HC/mHC = intra-token self-mixing (the person has 4 clones that talk among themselves) | slide 31 (her analogy) | her analogy, credited to her slide | ok |
| F32 | When n = 1 the doubly stochastic condition is just the number 1: the old identity shortcut | MHC sec. 4.1 | "with one lane, the rule leaves just the number 1: the plain shortcut" | ok |
| F33 | Her product of two 4x4 doubly stochastic matrices (slide 30) | C: rows and columns of both and of the product sum to 1.0000 (+/-0.0001), product matches the slide to 0.00005 | "her slide: two of them multiplied, rows and columns still sum to 1" | ok |

## C. Computed (`~/miniforge3/bin/python3 ~/picasso-work/daily/L03-04/scripts/ds_check.py`)
```
A rows [1.0, 1.0, 1.0, 1.0]   A cols [1.0, 1.0, 1.0, 1.0]
B rows [1.0, 1.0, 1.0, 1.0]   B cols [1.0, 1.0, 1.0001, 0.9999]
AB rows [1.0, 1.0, 1.0, 1.0]  AB cols [1.0, 1.0, 1.0001, 0.9999]
max |AB - printed| 4.5e-05    norm2 A 1.0   norm2 AB 1.0000000025
1.1^100 = 13780.6             0.9^100 = 2.66e-05
```
Closure proof: A, B >= 0 so AB >= 0; (AB)1 = A(B1) = A1 = 1 and 1ᵀ(AB) = (1ᵀA)B = 1ᵀB = 1ᵀ.
Spectral norm: ||A||_2 <= sqrt(||A||_1 ||A||_inf) = 1 and A1 = 1, so ||A||_2 = 1.

## D. Slide errata (fix silently, never caption the error)
- Slide 30 footer "mHC ... 2026": arXiv v1 is 31 Dec 2025. The plot label "28B Model": the paper's model is 27B.
- Slide 24 lists PaLM and T5 as RMSNorm models: PaLM says only "no biases ... in layer norms"; T5 a scale-only layer norm.
- Slide 26 lists Grok: not in the Peri-LN paper; OLMo 2 normalizes outputs only.
- Slide 30 bullet "Birkhoff matrix": the usual names are doubly stochastic matrix / Birkhoff polytope.

## E. Third-party images on the slides
- Slide 23: the two batch-norm / layer-norm pictures (dark blackboard style, from a blog): never shown. Tape only the
  title and bullet text (crop top), or redraw the idea with the tailor drawing.
- Slides 25, 26: figure from Xiong et al. / Kim et al. (paper figures): taped slide 25 cropped to its formulas and bullets
  (right half); slide 26 not taped (we draw the gate pictures instead).
- Slides 28, 29: paper figure (Zhu et al.) and its loss plot: slide 28/29 taped cropped to the toy gradient box only.
- Slide 30: the 28B plot (paper figure, wrong label): cropped out; the matrices are kept.

## F. Real people named
Prof. Yufei Ding (voice clips, slides; never drawn). Authors only as "Xiong et al.", "Kim et al.", "Zhu et al.",
"Xie et al." in text. No likeness of anyone; the drawn people are invented.

## G. Traps
1. "28B" -> 27B. 2. "mHC 2026" -> arXiv 2025. 3. "PaLM uses RMSNorm" -> never. 4. "Grok uses Peri-LN" -> drop.
5. "OLMo 2 uses Peri-LN" -> "a close cousin". 6. "ResNet invented skip connections" -> "made it the standard".
7. "Pre-LN never needs warm-up" -> "can train without". 8. "doubly stochastic preserves the norm" -> "never stretches".
9. "1.8x faster" bare -> "reached the same loss 1.8 times faster". 10. "RMSNorm is 64% faster" -> "7 to 64 percent,
depending on the model". 11. "6.7%" bare -> "with four lanes". 12. Her "two times speed up" clip not used.
13. Company names: DeepSeek may be named as the authors' lab, by what it built; nothing else about it.

## H. Open items
- 0.027 loss gap on the HC plot is not defined in the paper's text: not used.
