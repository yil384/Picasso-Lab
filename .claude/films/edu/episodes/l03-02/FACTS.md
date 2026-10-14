# L03-02 "The KV Cache and Its Diet" - fact brief

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 3 "Transformer Model Architecture Variants (2)", slides 11-14
(recording 19:03-26:21). Checked 2026-10-14 by the producer at the primary sources below (the Llama 3 paper PDF read
with pdftotext; the two attention papers read on arxiv.org; every size computed with
`~/picasso-work/daily/L03-02/scripts/kv_numbers.py`, output in section C).
Nothing goes on screen, into the voice or into the post unless a row below clears it, in its safe wording.
**Units: decimal (SI) everywhere we speak or write**: 1 KB = 1,000 bytes, 1 MB = 10^6, 1 GB = 10^9, 1 TB = 10^12.
"A million tokens" = 1,000,000 tokens (the slide's own convention, see D1).

## A. Sources

| Key | Citation | Where read |
| --- | --- | --- |
| LL3 | Llama Team, AI @ Meta, "The Llama 3 Herd of Models", arXiv:2407.21783 (2024) | arxiv.org/pdf/2407.21783, sec. 3.2 "Model Architecture": "We use grouped query attention (GQA; Ainslie et al. (2023)) with 8 key-value heads to improve inference speed and to reduce the size of key-value caches during decoding."; Table 3 (page 7): Layers 32 / 80 / 126, Model Dimension 4,096 / 8192 / 16,384, Attention Heads 32 / 64 / 128, Key/Value Heads 8 / 8 / 8, Vocabulary 128,000; "Llama 3 405B uses an architecture with 126 layers, a token representation dimension of 16,384, and 128 attention heads"; abstract and sec. 3.4: "a context window of up to 128K tokens" |
| SHA19 | Noam Shazeer, "Fast Transformer Decoding: One Write-Head is All You Need", arXiv:1911.02150 (Nov 2019) | arxiv.org/abs/1911.02150, abstract: incremental inference "is often slow, due to the memory-bandwidth cost of repeatedly loading the large "keys" and "values" tensors"; multi-query attention: "the keys and values are shared across all of the different attention "heads""; "much faster to decode, and incur only minor quality degradation from the baseline" |
| AIN23 | Joshua Ainslie, James Lee-Thorp, Michiel de Jong, Yury Zemlyanskiy, Federico Lebrón, Sumit Sanghai, "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints", EMNLP 2023, arXiv:2305.13245 | arxiv.org/abs/2305.13245, abstract: "Multi-query attention (MQA), which only uses a single key-value head, drastically speeds up decoder inference. However, MQA can lead to quality degradation"; GQA "uses an intermediate (more than one, less than number of query heads) number of key-value heads"; "uptrained GQA achieves quality close to multi-head attention with comparable speed to MQA" |
| SL | Her slides L03 11-14 | course/L03.pdf pages 11-14, course/L03.txt |
| REC | Her lecture recording L03, 19:03-26:21 | course/L03.transcript.md; clips in clips.json (checked by two recognizers, not by ear) |
| C | Computed, section C | `kv_numbers.py` |

## B. Facts

| # | Claim (as the slide or lecture puts it) | Verified | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | A model generates one token at a time; each new token's query attends to the keys and values of all earlier tokens | SL 11; SHA19 ("incremental inference"); L03-01 FACTS | "A model writes one token at a time. Each new token compares its query with the keys of every earlier token and mixes their values." | ok |
| F2 | Without a cache, the projections (keys, values) of earlier tokens are recomputed at every step | SL 11 (top: "Without cache"); REC 19:34-19:44 | "Without a cache, every earlier token's key and value are computed again at every step." | ok |
| F3 | With the KV cache, keys and values of earlier tokens are kept; attention is computed only for the new token | SL 11 bullet ("By caching the previous Keys and Values, we can focus on only calculating the attention for the new token"); REC 19:47-20:07 | "The KV cache keeps the keys and values of earlier tokens, so each step only computes the new token's." | ok |
| F4 | Queries are not cached: a past token's query is never used again in later steps | follows from causal attention (F1): step t needs q_t and k_1..k_t, v_1..v_t only | "Old questions are never asked again, so there is no Q cache." | ok |
| F5 | The cost: every new token reloads the whole cache of earlier tokens from memory | REC 20:33-20:38 (clip); SHA19 abstract (memory-bandwidth cost of repeatedly loading keys and values) | "Every new token reads the whole cache again. Moving it, not the arithmetic, is what makes generating slow." (Shazeer 2019) | ok |
| F6 | Per-token KV size = 2 x layers x KV heads x head dim x 2 bytes (FP16) | SL 12, SL 13; REC 20:58-21:58 | "Per token: 2 (a key and a value) x layers x KV heads x head size x 2 bytes, at 16-bit precision." Layers and head size are fixed by the model's design; the bytes can change with lower precision (she mentions 4- and 8-bit later, REC 22:01-22:08), so we never say the bytes are fixed. | ok |
| F7 | The first 2 = one copy for key, one for value | REC 20:58 (clip) | "two: one key and one value" | ok |
| F8 | Each layer keeps its own cache | REC 21:10-21:26 | "every layer keeps its own" | ok |
| F9 | Llama 3 8B: 32 layers, 32 query heads, head dim 128 (4,096 / 32) | LL3 Table 3 | "Llama 3 8B: 32 layers, 32 heads, each head 128 numbers wide" | ok |
| F10 | Llama 3 70B: 80 layers, 64 query heads, head dim 128 (8,192 / 64) | LL3 Table 3 | "70B: 80 layers, 64 heads" | ok |
| F11 | Llama 3 405B: 126 layers, 128 query heads, head dim 128 (16,384 / 128) | LL3 Table 3 and sec. 3.2 text | "405B: 126 layers, 128 heads" | ok |
| F12 | Hypothetical 8B with plain multi-head attention (32 KV heads): ~512 KB per token | C: 524,288 bytes = 524 KB (= 512 KiB) | "about half a megabyte per token" (524,288 bytes) | ok (slide's 512 KB is binary KiB; we say "half a megabyte") |
| F13 | ... ~2 GB for a 4k prompt | C: x 4,096 = 2.15 GB (2.00 GiB) | "about 2 GB for a 4,096-token prompt" | ok |
| F14 | ... ~488 GB for 1M tokens | C: x 1,000,000 = 524 GB (488 GiB) | "about 524 GB for a million tokens" | soften (slide value is in GiB; D1) |
| F15 | Hypothetical 70B MHA: ~2.5 MB per token, ~10 GB at 4k, ~2.44 TB at 1M | C: 2,621,440 B = 2.6 MB; 10.7 GB at 4,096; 2.6 TB at 1M | "about 2.6 MB per token; about 2.6 TB for a million tokens" | soften (D1) |
| F16 | Hypothetical 405B MHA: ~8 MB per token | C: 8,257,536 B = 8.3 MB | "about 8.3 MB per token" (8 MB as a round number is fine) | ok |
| F17 | ... ~32 GB at 4k | C: 33.8 GB (31.5 GiB) | "about 34 GB for 4,096 tokens" | soften (D1) |
| F18 | ... ~7.69 TB for a 1M-token prompt | C: 8.26 TB (7.51 TiB; the slide's 7.69 is 7,690 GiB / 1,000) | "about 8.3 terabytes for a million tokens" | soften (D1) |
| F19 | The 405B's own weights in 16-bit: 405 billion x 2 bytes | C: 810 GB; 8.26 TB / 810 GB = 10.2 | "about ten times the model's own weights" (both at 16-bit) | ok |
| F20 | The results assume one user (batch size 1) | SL 12 ("Note here the batch size is just set to 1"); REC 22:13 (clip) | "and that is for one user at a time" | ok |
| F21 | Llama 3.1 supports up to 128K tokens, not a million; the 405B was released as Llama 3.1 | LL3 abstract, sec. 3.4 ("a context window of up to 128K tokens"; the 405B model is the Llama 3.1 release) | "That 405B model, released as Llama 3.1, stops at 128K tokens: the million is a thought experiment. So is the plain attention: Llama 3 itself does not use it." | ok (honest limit; the last sentence is LL3 sec. 3.2: GQA with 8 KV heads) |
| F22 | Models do not use plain MHA today because it is too costly (her words) | REC 22:39 (clip) | her clip only; narration: "real models don't" | ok |
| F23 | MQA: all heads share a single key/value head | SHA19; AIN23; SL 13 | "Multi-query attention: every head shares one set of keys and values (Shazeer, 2019)" | ok |
| F24 | MQA: 32-128x reduction for these models | C: KV heads 32 -> 1 = 32x (8B), 64x (70B), 128x (405B) | "32 to 128 times smaller" | ok |
| F25 | MQA often degrades quality | SL 13; AIN23 abstract ("MQA can lead to quality degradation"); SHA19 ("only minor quality degradation") | "Sharing has a price: quality can drop." | ok (keep it mild: Shazeer measured a minor drop) |
| F26 | GQA: groups of query heads share key/value heads; between MHA and MQA | AIN23; SL 13 | "Grouped-query attention: each group of heads shares one set of keys and values (Ainslie and colleagues, 2023)" | ok |
| F27 | GQA, typically 8 KV heads, 4-16x reduction | SL 13; LL3 (8 KV heads in all three sizes); C | "Llama 3 keeps 8 KV heads in every size: 32/8 = 4x, 64/8 = 8x, 128/8 = 16x smaller" | ok |
| F28 | GQA quality close to MHA, speed close to MQA (uptrained models in the paper) | AIN23 abstract | "In the GQA paper, quality stayed close to full multi-head attention, with speed close to MQA." | ok |
| F29 | 405B with GQA (8 KV heads): per token and per million | C: 516,096 B = 516 KB per token; 516 GB per million | "about 516 KB per token; about 516 GB for a million tokens: from 8.3 TB to about half a terabyte" | ok |
| F30 | 8B with GQA: per token, 4k | C: 131,072 B = 131 KB; 0.54 GB at 4,096 | "about 131 KB per token" | ok |
| F31 | GQA hardly changes compute (and training); it is mainly an inference memory saving | SL 13 ("No much different for training, mainly designed for efficient inference"); REC 25:11-25:22 (clip) | "Grouping is mainly an inference saving. For the arithmetic, and for training, it changes little." / "It barely changes the arithmetic. The saving is memory." | ok |
| F32 | GQA is the most common choice in modern LLMs | SL 13 ("Most Common in Modern LLMs"); LL3 | "Most large models today use it, Llama 3 among them." | soften (say "many", or "Llama 3 among them"; no census) |
| F33 | Next: compressing the cache instead of sharing it (multi-head latent attention) | SL 15; REC 26:38-27:03 | "Next: instead of sharing the parcels, zip them." (no company name) | ok |
| F34 | Llama 3 vocabulary 128,000 tokens | LL3 Table 3 | not used | drop |
| F35 | Attention runs several heads side by side; in plain multi-head attention each head has its own keys and values, so KV heads = query heads | L03-01 FACTS (VAS17 sec. 3.2.2: h heads, each with its own Q/K/V projections); SL 12 (the MHA column uses the query-head count); SL 13 figure | "Remember heads from last time: attention runs several copies side by side, and in plain attention each head keeps its own rack of tags and parcels." | ok |
| F36 | A model is a stack of layers, each with its own attention (and its own cache) | LL3 Table 3 (32 / 80 / 126 layers); REC 21:10-21:20 ("for each layer, you'll keep the kvcache there ... for each layer, you will have one attention part and one ffn part") | "A model is a stack of layers, each running attention again, so every layer keeps its own cloakroom." | ok |

## C. Computed (`~/miniforge3/bin/python3 ~/picasso-work/daily/L03-02/scripts/kv_numbers.py`)

```
8B    MHA (hypothetical)  hd=128      524,288 B/token =   524.3 KB =   512.0 KiB | 4,096 tok:   2.15 GB =   2.00 GiB | 1M tok:    524.3 GB =   488.3 GiB = 0.52 TB = 0.48 TiB | 1x
8B    GQA, 8 KV heads     hd=128      131,072 B/token =   131.1 KB =   128.0 KiB | 4,096 tok:   0.54 GB =   0.50 GiB | 1M tok:    131.1 GB =   122.1 GiB = 0.13 TB = 0.12 TiB | 4x
8B    MQA, 1 KV head      hd=128       16,384 B/token =    16.4 KB =    16.0 KiB | 4,096 tok:   0.07 GB =   0.06 GiB | 1M tok:     16.4 GB =    15.3 GiB = 0.02 TB = 0.01 TiB | 32x
70B   MHA (hypothetical)  hd=128    2,621,440 B/token =  2621.4 KB =  2560.0 KiB | 4,096 tok:  10.74 GB =  10.00 GiB | 1M tok:   2621.4 GB =  2441.4 GiB = 2.62 TB = 2.38 TiB | 1x
70B   GQA, 8 KV heads     hd=128      327,680 B/token =   327.7 KB =   320.0 KiB | 4,096 tok:   1.34 GB =   1.25 GiB | 1M tok:    327.7 GB =   305.2 GiB = 0.33 TB = 0.30 TiB | 8x
70B   MQA, 1 KV head      hd=128       40,960 B/token =    41.0 KB =    40.0 KiB | 4,096 tok:   0.17 GB =   0.16 GiB | 1M tok:     41.0 GB =    38.1 GiB = 0.04 TB = 0.04 TiB | 64x
405B  MHA (hypothetical)  hd=128    8,257,536 B/token =  8257.5 KB =  8064.0 KiB | 4,096 tok:  33.82 GB =  31.50 GiB | 1M tok:   8257.5 GB =  7690.4 GiB = 8.26 TB = 7.51 TiB | 1x
405B  GQA, 8 KV heads     hd=128      516,096 B/token =   516.1 KB =   504.0 KiB | 4,096 tok:   2.11 GB =   1.97 GiB | 1M tok:    516.1 GB =   480.7 GiB = 0.52 TB = 0.47 TiB | 16x
405B  MQA, 1 KV head      hd=128       64,512 B/token =    64.5 KB =    63.0 KiB | 4,096 tok:   0.26 GB =   0.25 GiB | 1M tok:     64.5 GB =    60.1 GiB = 0.06 TB = 0.06 TiB | 128x
405B weights FP16: 810 GB; MHA 1M cache / weights = 10.2
slide 1M column read as GiB/1000: 8B 488, 70B 2441, 405B 7690 GiB
```

Rounded values we may say or letter: 524,288 bytes; half a megabyte (0.5 MB); 2 GB at 4,096 tokens; 524 GB; 2.6 MB;
2.6 TB; 8.3 MB (8 MB round); 34 GB; 8.3 TB (8 TB round, "about eight terabytes"); 810 GB; ten times (10x);
131 KB; 516 KB; 516 GB; half a terabyte; 4x, 8x, 16x; 32x, 64x, 128x; one key head (1).
Arithmetic shown on screen: 2 x 32 x 32 x 128 x 2 = 524,288 bytes; 2 x 126 x 128 x 128 x 2 = 8,257,536 bytes;
32 / 8 = 4; 64 / 8 = 8; 128 / 8 = 16.

## D. Slide errata

| # | Slide | What it says | What is right | How we handle it |
| --- | --- | --- | --- | --- |
| D1 | 12, last two columns | ~2 GB / ~10 GB / ~32 GB (4k) and ~488 GB / ~2.44 TB / ~7.69 TB (1M) | 4k column is binary GiB (4,096 tokens); 1M column is GiB divided by 1,000 (a binary/decimal mix). Binary units count in 1,024s (1 KiB = 1,024 bytes), decimal units in 1,000s. In decimal: 2.15 / 10.7 / 33.8 GB and 524 GB / 2.6 TB / 8.3 TB | The red pen re-letters the 1M column in decimal ("524 GB, 2.6 TB, 8.3 TB") with a small note "one unit: decimal"; the narration says decimal numbers only. Not framed as her mistake: "the slide mixes two kinds of units". |
| D2 | 12, "If using MHA" column | ~512 KB, ~2.5 MB, ~8 MB | 524 KB, 2.6 MB, 8.3 MB in decimal (binary KiB/MiB on the slide) | Approximate; we say "about half a megabyte" and "about 8 MB"; no correction mark needed. |
| D3 | 13 | "MQA share's a single KV head"; "No much different for training" | typo / grammar | Cropped to the formula line only (D5), or shown as is without a mark; we never quote the typo. |
| D4 | 14 | Mistral Large 2: 128 query heads; Mixtral 8x22B: 64 query heads, "~141B active" | Mistral Large 2 config: 96 heads (12x); Mixtral 8x22B: 48 heads (6x), 141B total, about 39B active | Crop slide 14 to the header and the three Llama rows only (LL3 confirms those). The other rows are never shown. |
| D5 | 14 | "Llama 3 / 3.1 8B" etc. | Table 3 of LL3 describes Llama 3 (3.1 is the same architecture with the 128K context) | Fine as is. |

## E. Third-party images on the slides

| Slide | Image | Handling |
| --- | --- | --- |
| 11 | The step-by-step matrix figure (from a public KV-cache explainer, not her drawing) | Crop the printout to the title and the bullet (top band); the figure is not shown. The cloakroom drawing carries the idea. |
| 13 | The MHA / GQA / MQA heads figure (Figure 2 of AIN23) | Crop to the title and the formula bullet, or tape a blank sheet over the figure; our drawings (private racks, one rack, group racks) carry the idea. |
| 12, 14 | Tables of text she typed | Shown taped (14: header + Llama rows only, D4). |

## F. Real people

- Prof. Yufei Ding: her voice (clips) and slides only; never drawn.
- Noam Shazeer (SHA19), Joshua Ainslie and co-authors (AIN23): named as text credit only ("Shazeer, 2019",
  "Ainslie and colleagues, 2023"); never drawn.
- All characters in the drawings are invented (the party guest, the clerk, the readers).

## G. Traps

- Never say "a million words": it is a million tokens.
- Never say Llama 3 can read a million tokens (F21): the million is hypothetical, like plain MHA on these models.
- Never call 512 KB / 7.69 TB "wrong" without saying why (binary vs decimal units), and never as a joke about her.
- "Terabytes" in the hook: with plain MHA (hypothetical), batch size 1, 16-bit; the hook says "the textbook kind of
  attention" or "plain multi-head attention".
- MQA's quality drop: "can drop", not "collapses" (Shazeer measured a minor drop; AIN23 says "can lead to").
- GQA "barely changes the arithmetic": true for the attention math and the MLP; the K/V projections shrink a bit.
  Do not say "zero compute saving".
- Do not say the cache is the only memory cost: the weights are separate (810 GB for 405B at 16-bit).
- No company name for the next episode's method (multi-head latent attention).

Not claims (for the number check): the X thread's reply numbers 1/, 2/, 3/, 4/, 5/, 6/, 7/; "Lecture 3"; the runtime "6 minutes".

## H. Open items

- None blocking. D4's Mistral Large 2 / Mixtral 8x22B figures are from the producer's knowledge of the published model
  configs and were not re-fetched tonight; those rows are cropped out of the film, so nothing on screen depends on them.
