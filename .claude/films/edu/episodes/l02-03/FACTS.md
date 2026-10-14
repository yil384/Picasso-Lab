# L02-03 "Where Am I? Positional Encoding" - fact brief

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 2 slides 23-31 (recording 51:13-72:07). Checked 2026-10-11
against primary sources (paper PDFs on arXiv and the ACL Anthology) and by computing every number we show; the
research notes with quotes are kept in the work folder (`~/picasso-work/daily/L02-03/research_facts.md`). Nothing goes
on screen, into the voice or the post unless a row below clears it, in its safe wording.

## Source key
| Key | Citation | Where read |
| --- | --- | --- |
| VASWANI17 | Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin (2017). Attention Is All You Need. NeurIPS 2017; arXiv:1706.03762 v7 | Sec. 3.1, Sec. 3.5, Sec. 6.2, Table 3 row (E) |
| HAVIV22 | Haviv, Ram, Press, Izsak, Levy (2022). Transformer Language Models without Positional Encodings Still Learn Positional Information. Findings of EMNLP 2022, pp. 1382-1390; arXiv:2203.16634 | ACL Anthology PDF: abstract, Sec. 1, Table 4, Fig. 1, conclusion |
| SU21 | Su, Lu, Pan, Murtadha, Wen, Liu (2021). RoFormer: Enhanced Transformer with Rotary Position Embedding. arXiv:2104.09864; Neurocomputing 568:127063 (2024) | Sec. 2.2, Sec. 3.2.2, abstract |
| YAN19 | Yan, Deng, Li, Qiu (2019). TENER: Adapting Transformer Encoder for Named Entity Recognition. arXiv:1911.04474 (preprint) | Sec. 3.2.1, Properties 1-2 |
| L02 | Prof. Ding's slides and recording, CSE 291P Lecture 2 | course files (slides 23-31; recording 51:13-72:07) |
| RUN | computed tonight with numpy (commands and output below) | this file |

## Facts
| # | Claim (as the slide or lecture puts it) | Verified (source, place) | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | "The cat chased the dog" / "The dog chased the cat": without positional encoding the original 2017 Transformer encoder cannot tell them apart (slide 24; L02 52:02-52:34) | math: self-attention without positions is permutation-equivariant, so the same bag of words gives the same set of outputs; HAVIV22 Sec. 1 ("bidirectional models fail to converge when position information is absent") | To attention that sees every word at once, with no positions, these two sentences are the same bag of words: each word gets the same result either way. | ok |
| F2 | The encoder layers are fully bidirectional: each token sees all the others (L02 52:02-52:08) | VASWANI17 Sec. 3.2.3 (encoder self-attention: all positions) | In the encoder every word can look at every other word. | ok |
| F3 | Decoder-only models: the two sentences are no longer the same, since each word only sees the words before it (L02 52:47-53:07) | HAVIV22 abstract (causal mask lets a token count its predecessors) | In a decoder-only model each word sees only the words before it, so the two sentences already look different. | ok |
| F4 | Haviv et al. 2022: models without positional encoding still learn positional information (slide 24 cites "Haviv et al. EMNLP 2022") | HAVIV22 abstract; Fig. 1 (1.3B models: no positions 13.10 perplexity vs sinusoidal 12.93) | A 2022 paper (Haviv et al.) found decoder-only language models with no positional encoding at all still learn word order from the causal mask, and come close to the usual models; encoders that see both ways do not. | soften: "come close", not "as good"; venue is Findings of EMNLP 2022 |
| F5 | In her lecture: removing positional encoding "doesn't really work"; "no clear winners, usually you try it" (L02 53:33-53:52) | HAVIV22 says the opposite for decoder-only models (competitive) | Do not say removing positions fails for decoder-only models. Positional encoding is still the standard. | trap (do not use her 53:33 wording) |
| F6 | The 2017 paper uses sine positional encoding of the same dimension as the token embedding, added to it (slide 25; L02 54:12-54:33) | VASWANI17 Sec. 3.5 ("we add positional encodings to the input embeddings ... same dimension d_model ... so that the two can be summed") | The 2017 Transformer gives every position a vector the same length as a word's vector and adds the two together. | ok |
| F7 | PE(pos, 2i) = sin(pos / 10000^(2i/d_model)), PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model)) (slides 25-26) | VASWANI17 Sec. 3.5 | Even slots get a sine, odd slots a cosine, of the position divided by 10000 to the power 2i over d_model. | ok |
| F8 | PE is fixed by two numbers, the position and the dimension index; not a weight matrix, no training (L02 54:44-55:15) | VASWANI17 Sec. 3.5 (a fixed function) | It is fixed by two numbers, the position and the slot. Nothing to train. | ok |
| F9 | Each pair of dimensions shares one angle: sine in one, cosine in the other (L02 55:29-55:44) | VASWANI17 Sec. 3.5 (same argument for 2i and 2i+1) | Each pair of slots shares one angle, sine in the first, cosine in the second: together they are the tip of a clock hand on a circle of radius one. | ok (the clock hand is our picture) |
| F10 | Strength 1: no extra parameters + healthy values in [-1, 1] (slide 26; L02 57:00-57:50) | math: sine and cosine lie in [-1, 1] | No extra parameters, and every value stays between minus one and one. | ok |
| F11 | Slide 26 table, d_model = 8, positions 0, 1, 2, 3, 4, 10, 50, 100: e.g. pos 1 dim 0 = 0.841471, dim 1 = 0.540302, dim 2 = 0.099833, dim 4 = 0.010000, dim 6 = 0.001000; pos 100 dim 0 = -0.506366 | RUN (all 64 values match the slide to 6 decimals) | Slide 26's table is right: position 1 reads 0.841471 in slot 0 and 0.001000 in slot 6. | ok |
| F12 | Low dimensions are high frequency (local information, dramatic changes); high dimensions low frequency (global, smooth) (slide 26; L02 58:28-59:24) | VASWANI17 Sec. 3.5 ("wavelengths form a geometric progression from 2π to 10000 · 2π"); RUN | The first hand is fast, the last ones slow: fast hands tell neighbours apart, slow hands tell near from far across the whole text. | ok |
| F13 | With d_model = 8 the four hands turn 1, 0.1, 0.01 and 0.001 radians per position | RUN (pos / 10000^(2i/8): 10000^(0, 1/4, 1/2, 3/4) = 1, 10, 100, 1000) | With eight slots, the four hands turn 1, 0.1, 0.01 and 0.001 radians per word: the fast one about 57 degrees a word, the slowest about a twentieth of a degree. | ok |
| F14 | The fastest hand repeats every 2π ≈ 6.28 positions; the slowest wavelength is 10000 · 2π ≈ 62,832 positions (as the paper's formula's limit) | VASWANI17 Sec. 3.5; RUN (d_model = 512: slowest pair has wavelength ≈ 60,611 positions) | The fastest hand comes round every 6.28 words; in the 512-wide model the slowest takes about 60,000 words. | ok (say "about 60,000") |
| F15 | d_model = 512 in the base model | VASWANI17 Sec. 3.1 | The 2017 base model's vectors are 512 numbers long. | ok |
| F16 | Learned position embeddings work about as well (context) | VASWANI17 Sec. 3.5, Table 3 row (E): BLEU 25.7 vs 25.8 | The 2017 authors also tried learned position vectors and got nearly identical results; they kept the sine waves hoping they would stretch to longer texts. | ok ("hoping": the paper says "may allow") |
| F17 | Strength 3: sin/cos coupling encodes partially relative distance: PE(pos + k) = R_k · PE(pos), R_k a rotation (slide 27; L02 61:51-63:48) | VASWANI17 Sec. 3.5 ("for any fixed offset k, PE_pos+k can be represented as a linear function of PE_pos"); math (angle addition, slide 28) | Moving k words later turns every hand by its own fixed angle: a rotation, R_k. It depends on k, not on where you start. | ok |
| F18 | Rotations keep inner products: PE(pos1) · PE(pos2) = PE(pos1 + k) · PE(pos2 + k) (slides 27, 30) | math: R_k^T R_k = I; YAN19 Property 1 ("only depends on k"); RUN | Turn both hands by the same angle and the angle between them stays put, so the dot product of two position vectors depends only on how far apart they are. | ok |
| F19 | The proof (slides 28-30) is self-study; "I feel it's pretty difficult" (L02 64:19-64:34) | L02 | She leaves the proof as self-study. | ok |
| F20 | Rotation angle per pair: β_i = k / 10000^(2i/d_model); the matrix is a 2x2 block per pair (slides 28-29) | math (sin(α+β), cos(α+β)) | Each pair turns by its own angle, k times its speed. | ok |
| F21 | Why it matters: a question asked after a long PDF is shifted by the PDF's length but should mean the same (L02 63:13-63:30) | L02 (her example) | Paste a long document before your question and every word of the question moves later by the document's length; its meaning should not change. | ok |
| F22 | Partially: queries and keys come from the sum of the token embedding and the PE, so the clean property only holds for the PE part: How (pos 1) · You (pos 3) != How (pos 2) · You (pos 4) (slide 31; L02 67:26-68:27) | math: (x + p1)·(y + p3) = x·y + x·p3 + p1·y + p1·p3: the cross terms depend on the absolute positions; YAN19 Sec. 3.2.1 (the property "disappears" after the query and key projections); RUN | The word and its position are added into one vector, so the cross terms, word with position, change when both words move: "How" at 1 with "You" at 3 no longer scores the same as at 2 and 4. | ok |
| F23 | Our toy check of F22 | RUN: d = 512, random word vectors (seed 0, scale 0.3): PE(1)·PE(3) = PE(2)·PE(4) = 231.73; (x+PE(1))·(y+PE(3)) = 223.30 vs (x+PE(2))·(y+PE(4)) = 226.34 | Positions alone: equal. Words added in: no longer equal. | ok (no numbers on screen) |
| F24 | The raw dot product cannot tell before from after | YAN19 Property 2 ("unware of directionality"); RUN: PE(5)·PE(3) = PE(1)·PE(3) | not used (optional) | drop |
| F25 | The fix: multiply instead of add: rotate the query and key themselves (RoPE), next episode (L02 70:54-71:23, 73:29-75:11) | SU21 Sec. 2.2 ("instead of directly adding the position ... by multiplying with the sinusoidal functions") | The fix that became standard, RoPE (Su et al., 2021), multiplies instead of adding: it turns the query and the key themselves. Next episode. | ok |
| F26 | "Whenever you see addition, ask: why addition? multiplication, concatenation" (L02 70:54-71:43) | L02 | Her rule of thumb: when you see an addition, ask whether a multiplication or a concatenation would do better. | ok (paraphrase only: her clips of it failed the check) |
| F27 | Values healthy -> stable training; spikes come from bad values (L02 57:32-57:50) | L02 (her claim, general practice) | Values that stay small keep training stable. | soften (her words in her clip) |

## Numbers that may appear (each cleared above)
2017 (F1, F6), 2021 (F25), slides 23-31, 24, 26, 27, 31 (L02 slide numbers), 57 (F13), position 1 slot 0, slot 6 (F11), How at 1, 3, 2, 4 (F22),, 2022 (F4), 8 / eight slots (F11, F13), 4 / four hands (F13), 1, 0.1, 0.01, 0.001 (F13),
57 degrees (F13), 6.28 (F14), 60,000 (F14), 512 (F15), 10000 (F7), 0.841471, 0.540302, 0.001000, 0.099833, 0.010000
(F11), -1 and 1 / minus one and one (F10), positions 0-4, 10, 50, 100 (F11), pos 1, 2, 3, 4 (F22), k (F17), two / pair
(F9), one (F9 radius one), 291 (course number).

## RUN (2026-10-11, ~/miniforge3/bin/python3, numpy)
```
d=8: PE(pos)[j] = sin(pos/10000**(2*(j//2)/8)) if j even else cos(...)
0   0.000000 1.000000 0.000000 1.000000 0.000000 1.000000 0.000000 1.000000
1   0.841471 0.540302 0.099833 0.995004 0.010000 0.999950 0.001000 1.000000
2   0.909297 -0.416147 0.198669 0.980067 0.019999 0.999800 0.002000 0.999998
3   0.141120 -0.989992 0.295520 0.955336 0.029996 0.999550 0.003000 0.999996
4   -0.756802 -0.653644 0.389418 0.921061 0.039989 0.999200 0.004000 0.999992
10  -0.544021 -0.839072 0.841471 0.540302 0.099833 0.995004 0.010000 0.999950
50  -0.262375 0.964966 -0.958924 0.283662 0.479426 0.877583 0.049979 0.998750
100 -0.506366 0.862319 -0.544021 -0.839072 0.841471 0.540302 0.099833 0.995004
(identical to slide 26, all 64 values; the slide prints positions as columns and dims as rows)
wavelengths 2*pi*10000**(2i/d): d=8 -> 6.28, 62.83, 628.3, 6283.19; d=512 -> first 6.28, last 60611.48
d=512 raw dot: PE(1)·PE(3) = PE(2)·PE(4) = PE(101)·PE(103) = 231.734; PE(5)·PE(3) = 231.734 (symmetric)
x, y = 0.3*N(0,1)^512 (seed 0): (x+PE(1))·(y+PE(3)) = 223.295, (x+PE(2))·(y+PE(4)) = 226.335
```

## Slide errata
- Slide 24 cites "Haviv et al. EMNLP 2022": the paper is in Findings of EMNLP 2022 (credits say "Findings of EMNLP 2022").
- Slide 27: she says on the recording the labels have a typo (one should read pos2) and a missing parenthesis (L02 63:54); we do not letter those labels, we mark only the conclusion line and the red box.
- Slide 28/29 "Qustions1" typo: not shown.
- Slide 28: the matrix [[cos β, sin β], [-sin β, cos β]] with the slide's ordering is correct (angle addition); not shown on screen.
- Slide 26 "d model" (the underscore is hidden by the table line): fine as is.

## Third-party images on the slides
- Slides 25 and 31: the "How / Are / You + PE" figure (a third-party diagram). Slide 25 is not shown; on slide 31 the figure is covered with a blank taped sheet and our own lettering, the right-hand text and the bottom remark stay.
- Slides 24, 26, 27: her own text, table and arrows only.

## Real people
- Prof. Yufei Ding: voice clips and slides only, mic tag, never drawn.
- Paper authors: text credit only (Vaswani et al., Haviv et al., Su et al.).

## Traps
- Do not say positional encoding is needed for decoder-only models to work at all (F5).
- Do not say the attention score itself is shift-invariant with sinusoidal PE: only the PE·PE part is (F22).
- Do not say the 2017 paper proved relative attention or extrapolation: it "hypothesized" / "may allow" (F16, F17).
- The clock hand is our picture; the paper says sinusoids.
- No company or country examples; RoPE is credited as "Su et al., 2021" only.

## Open items
- None blocking. Clips checked by two recognizers, not by ear.
