# L02-04 "RoPE: Position as a Rotation" - fact brief

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 2 slides 32-36 (recording 71:57-77:37) and Lecture 4 slide 2
(recap, 3:19-5:49). Checked 2026-10-11 by the producer at the primary sources below (abstracts and paper text read on
arxiv.org; numbers computed with `~/picasso-work/daily/L02-04/scripts/rope_numbers.py`, output in section C).
Nothing goes on screen, into the voice or into the post unless a row below clears it, in its safe wording.

## A. Sources

| Key | Citation | Where read |
| --- | --- | --- |
| VAS17 | Vaswani et al., "Attention Is All You Need", NeurIPS 2017, arXiv:1706.03762 | sec. 3.5: sinusoids, base 10000, added to the input embeddings |
| GPT2 | Radford et al. 2019, GPT-2; code github.com/openai/gpt-2 `model.py` (`wpe`, a learned position table added to the token embedding) | code |
| T5 | Raffel et al. 2019, arXiv:1910.10683, sec. 2.1 (a learned scalar per relative-distance bucket added to the attention logits) | paper |
| SU21 | Su, Lu, Pan, Murtadha, Wen, Liu, "RoFormer: Enhanced Transformer with Rotary Position Embedding", arXiv:2104.09864, v1 20 April 2021 | abstract: "encodes the absolute position with a rotation matrix and meanwhile incorporates the explicit relative position dependency in self-attention"; sec. 3 (2-D pairs, angle m·θ_i, θ_i = 10000^(-2(i-1)/d)) |
| LLA1 | Touvron et al., "LLaMA", arXiv:2302.13971, sec. 2.2 | "We remove the absolute positional embeddings, and instead, add rotary positional embeddings (RoPE), introduced by Su et al. (2021), at each layer of the network." Table 2: 7B has dim 4096, 32 heads (head size 128) |
| LLA2 | Touvron et al., "Llama 2", arXiv:2307.09288, sec. 2 and Table 1 | "doubled the context length"; Table 1: context length 4k (Llama 1: 2k); RoPE |
| PI | Chen, Wong, Chen, Tian, "Extending Context Window of Large Language Models via Positional Interpolation", arXiv:2306.15595, 27 June 2023 | abstract: LLaMA 7B to 65B, "up to 32768", "minimal fine-tuning (within 1000 steps)", extrapolation "may lead to catastrophically high attention scores"; interpolation bound "at least ~600x smaller" (a theoretical bound) |
| NTK | bloc97, "NTK-Aware Scaled RoPE allows LLaMA models to have extended (8k+) context size without any fine-tuning and minimal perplexity degradation", Reddit r/LocalLLaMA, June 2023 (a community post; cited by the llama.cpp commit "add custom RoPE (#2054)" and by the YaRN paper) | title and method (changes the RoPE base, so high-frequency pairs barely change and low-frequency pairs are slowed most); emozilla's Dynamic NTK followed (July 2023) |
| YARN | Peng, Quesnelle, Fan, Shippole, "YaRN: Efficient Context Window Extension of Large Language Models", arXiv:2309.00071, 31 Aug 2023; repo github.com/jquesnelle/yarn | abstract: "10x less tokens and 2.5x less training steps than previous methods"; README: "variants of Llama 2 fine-tuned with YaRN at 32K, 64K and 128K context window length" (7B and 13B at 64K and 128K); method: non-uniform ("by-parts") interpolation plus a temperature on the attention logits |
| RUL | Hsieh et al., "RULER: What's the Real Context Size of Your Long-Context Language Models?", arXiv:2404.06654, April 2024 | abstract: 17 long-context models, all claim 32K tokens or more, "only half of them can maintain satisfactory performance at the length of 32K" |
| SL | Her slides L02 32-36, L04 2 | course/L02.pdf, course/L04.pdf |

## B. Facts

| # | Claim (as the slide or lecture puts it) | Verified | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | Sine embeddings: add sines and cosines to the word (2017) | VAS17 3.5 | "The original 2017 Transformer added a pattern of sines and cosines to each word." | ok |
| F2 | Absolute: add a learned position vector (GPT-1/2/3, OPT, 2018-2020) | GPT2 code; SL 32 | "Then models like GPT-2 and GPT-3 learned one position vector per slot and added it." | ok |
| F3 | Relative: add something inside the attention computation (T5, 2018-2022) | T5 2.1; SL 32 | "Others added a learned nudge inside attention that depends on the distance (T5)." | ok |
| F4 | RoPE, 2021 - now; "most 2024+ models" | SU21 (April 2021); LLA1; LLA2; SL 32 | "Rotary position embedding, RoPE, from a 2021 paper by Su and colleagues. LLaMA and Llama 2 use it." Do not say "every model"; PaLM and GPT-J are on her slide but were not checked tonight, so they are not named. | ok |
| F5 | RoPE turns each pair of numbers in the query and the key by an angle = position x that pair's speed | SU21 sec. 3; SL 34-35 | "RoPE cuts the query and the key into pairs of numbers, treats each pair as an arrow, and turns it by an angle that grows with the word's position." | ok |
| F6 | "we know that" vs "of course we know": same relative rotation; the inner product depends only on the two words and their distance | SU21 abstract and eq. (16); SL 33 | "Turn both arrows by the same extra angle and the angle between them does not change, so the score depends only on the two words and how far apart they are." | ok |
| F7 | Multiplicative, not added: no cross terms | SL 35; SU21 | "Nothing is added to the word, so there is no word-times-position cross term to blur the distance." | ok |
| F8 | Applied to q and k in every layer (L04 slide 2), not once at the input | LLA1 2.2 ("at each layer of the network"); SL L04 2 | "RoPE is applied inside every attention layer, to the queries and the keys; the values are not turned." | ok |
| F9 | Llama 2 was pretrained with a 4k context | LLA2 Table 1 (4k; Llama 1 2k) | "Llama 2 was trained on texts of up to 4,096 tokens (about 4,000)." | ok |
| F10 | Head size 128 = 64 pairs = 64 clocks; fastest 1 radian (about 57 degrees) per token; slowest about one turn per 54,000 tokens | LLA1 Table 2 (4096 / 32 = 128); SU21 θ_i; C below | "In Llama 2's smallest model each head has 128 numbers: 64 pairs, 64 clocks. The fastest turns about 57 degrees per word; the slowest needs about 54,000 words for one turn." ("word" = token, said once) | ok |
| F11 | In 4,096 tokens the slowest clock turns only about 27 degrees; at 131,072 tokens it would turn about 867 degrees (more than two full turns) | C below | "In training, the slowest clock never turned more than about 27 degrees. At 128,000 tokens it would spin more than twice around: angles the model has never seen." | ok (computed; base 10000, head size 128) |
| F12 | PI: scale positions pos' = pos x L_train / L_target; "position one percent, position two percent" (her words) | PI abstract | "Position Interpolation (Chen and colleagues, 2023) squeezes the positions: every clock runs slower by the same factor, so a long text fits inside the angles the model knows. They stretched LLaMA from 2,048 to 32,768 tokens with under 1,000 fine-tuning steps." | ok; 4,096 to 131,072 is a squeeze of 32 (computed) |
| F13 | NTK-aware scaling: change the base so low frequencies are scaled more; slide: θ' = θ x α^(d/(d-2)) | NTK; SL 36 | "NTK-aware scaling, a 2023 community post, leaves the fast clocks almost alone, so neighbours still look like neighbours, and slows the slow clocks the most. It works even without fine-tuning." | ok; slide erratum below |
| F14 | YaRN: finer non-uniform scaling + a temperature on the attention logits; low-cost fine-tune | YARN abstract + README | "YaRN (Peng and colleagues, 2023) refines that split and adds a temperature to the attention scores; it needs about 10 times fewer training tokens than earlier methods, and took Llama 2 to 128,000 tokens." | ok |
| F15 | Slide 36: "4k -> 128k -> 1M+"; column "Max Context Tested in Community" (32k-64k, 128k+, 128k-1M+) | SL 36; PI (32,768); YARN (128K) | "The slide's last column is a rough community range, not a measured limit." Only the paper numbers (32,768; 128,000) are said as facts. | soften |
| F16 | Honest limit: a long window is not the same as using it well | RUL abstract | "A 2024 test of 17 long-context models found only about half still did well at 32,000 tokens, though all claimed 32,000 or more." | ok |
| F18 | Slide 33's example: "we know that" (we at position 0, know at 1) and "of course we know" (we at 2, know at 3); turn by 0, 1, 2, 3 steps | SL 33 | "In 'we know that', 'we' is at position zero and 'know' at one. In 'of course we know', 'we' is at two and 'know' at three." | ok |
| F19 | The dot-product demo: the same score (0.513) at positions (0, 1), (2, 3) and (100, 101) | C below | "Same pair of words, one step apart: the same score at positions 0 and 1, 2 and 3, or 100 and 101." | ok (computed) |
| F20 | Slide 36's "1M+" ("up to a million and more") | SL 36 | Said only as her table's rough range: "her table's last column runs up to a million and more: a rough community range, not a measured limit." | soften |
| F17 | Her clips | clips.json + check.json (two recognizers) | quoted verbatim | ok |

## C. Computed (`~/miniforge3/bin/python3 ~/picasso-work/daily/L02-04/scripts/rope_numbers.py`)
```
pairs 64
fastest_rad 1.0
fastest_deg 57.29577951308232
slowest_rad 0.00011547819846894582
slowest_period_tokens 54410.14313077675
fastest_period_tokens 6.283185307179586
slowest_deg_per_4096 27.10082927839101
slowest_deg_per_131072 867.2265369085123
dots {(0, 1): 0.513077, (2, 3): 0.513077, (100, 101): 0.513077}
dot_unrotated 0.8
pi_scale_2048_32768 0.0625
pi_scale_4096_131072 0.03125
```
(d = 128, θ_i = 10000^(-2i/d), i = 0..63; the dot product of q = (1, 0.5) and k = (0.3, 1) turned by m·0.3 and n·0.3
is 0.513077 for (m, n) = (0, 1), (2, 3) and (100, 101): only the distance counts.)

## D. Slide errata
- Slide 36, NTK row: "θ' = θ × α^(d/(d-2))" scales the **base** (10000), not each pair's angle; we do not show the
  formula, only "slow the slow clocks most".
- Slide 36, last column: approximate community figures (work order); said as "a rough range".
- Slide 32: "Rope embeddings (next slides..)" fine. Slide 33's arrows: "know by '1 positions'" (typo, not shown large).
- In the lecture she says "positional interpretation" for Position Interpolation; we write "Position Interpolation".

## E. Third-party images on the slides
- Slide 33: the vector figure (from another course's slides) is covered with a blank taped sheet; our own red-pen arrows
  are drawn on the sheet. Slide 34 (RoFormer's figure, Su et al.) is not shown; its idea is redrawn as our clocks, credit
  "Su et al. 2021" in text. Slide 35 not taped (the 2x2 rotation is lettered by hand). L04 slide 2 (the 2017 Transformer
  figure and another paper's attention diagram) is not shown; it lists company names we do not use.
- Slides 32 and 36: text and tables only; taped.

## F. People
- Prof. Yufei Ding: her voice (7 clips) and her slides; never drawn. Authors named in text only (Su; Chen; Peng;
  bloc97 as a handle). No one else real appears.

## G. Traps
- Do not say RoPE "adds" anything; it multiplies (turns).
- Do not say "every model uses RoPE"; say "most new open models we name" only via F4's list.
- Do not say the model "understands a million tokens"; 1M+ is the slide's rough community range (F15).
- PI's ~600x is a theoretical bound, not a measurement (not used).
- Values (v) are not rotated.
- Never name any model from a company we do not name in F4.

## H. Open items
- None blocking. The clip check is by two recognizers, not by ear.
