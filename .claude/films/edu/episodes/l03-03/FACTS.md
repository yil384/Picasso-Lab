# L03-03 "MLA: Zipping the KV Cache" - fact brief

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 3 "Transformer Model Architecture Variants (2)", slides 15-20
(recording 26:11-42:47), plus the Lecture 4 recap, slides 3-6 (recording 05:39-10:53). Checked 2026-10-15 by the
producer and two research sweeps at the primary sources below (the papers read as PDFs with pdftotext; serving-engine
code read at its source; every size computed with `~/picasso-work/daily/L03-03/scripts/mla_numbers.py`, output in
section C). Nothing goes on screen, into the voice or into the post unless a row below clears it, in its safe wording.
**Units**: the paper counts cache sizes in *numbers* (elements), regardless of precision; when we give bytes we assume
16-bit numbers (2 bytes) and decimal units (1 kB = 1,000 bytes), as in L03-02. Her worksheet (L04 slide 5) writes KB for
1,024 bytes, consistently within the table (D3); ratios are the same in either unit.

## A. Sources

| Key | Citation | Where read |
| --- | --- | --- |
| V2 | DeepSeek-AI, "DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model", arXiv:2405.04434 (v1 7 May 2024; v5 19 Jun 2024 read) | arxiv.org/pdf/2405.04434v5 with pdftotext: sec. 2.1.2 eqs. 9-11 and "During inference, MLA only needs to cache c_t^KV"; "during inference, since W^UK can be absorbed into W^Q, and W^UV can be absorbed into W^O, we even do not need to compute keys and values out for attention"; sec. 2.1.3 "RoPE is incompatible with low-rank KV compression ... a RoPE matrix related to the currently generating token will lie between W^Q and W^UK and matrix multiplication does not obey a commutative law. As a result, we must recompute the keys for all the prefix tokens"; decoupled RoPE "additional multi-head queries q^R and a shared key k^R"; "the decoupled key should also be cached"; Table 1 (p. 9) and "its KV cache is equal to GQA with only 2.25 groups"; sec. 3.1.2 (60 layers, n_h 128, d_h 128, d_c 512, d_c' 1536, d_h^R 64); App. C ("due to the associative law of matrix multiplication, we can absorb W^UK into W^UQ, and W^UV into W^O"); App. D.2 + Table 9 (MLA vs MHA) |
| V3 | DeepSeek-AI, "DeepSeek-V3 Technical Report", arXiv:2412.19437 (v1 27 Dec 2024; v2 read) | arxiv.org/pdf/2412.19437: abstract ("adopts Multi-head Latent Attention (MLA) ... thoroughly validated in DeepSeek-V2"); sec. 2.1.1 ("maintaining performance comparable to standard Multi-Head Attention (MHA)"); sec. 4.2 (61 layers; n_h 128, d_h 128, d_c 512, d_h^R 64) |
| LLM67 | DeepSeek-AI, "DeepSeek LLM", arXiv:2401.02954 (2024) | only for the 67B baseline's attention (GQA, 8 KV heads); not used on screen |
| ROF | Jianlin Su, Yu Lu, Shengfeng Pan, Ahmed Murtadha, Bo Wen, Yunfeng Liu, "RoFormer: Enhanced Transformer with Rotary Position Embedding", arXiv:2104.09864 (2021) | arxiv.org abstract: "RoPE encodes the absolute position with a rotation matrix and meanwhile incorporates the explicit relative position dependency in self-attention"; sec. 3.2 "rotate the affine-transformed word embedding vector by amount of angle multiples of its position index"; LL3 Table 3 lists RoPE for Llama 3 |
| LL3 | Llama Team, AI @ Meta, "The Llama 3 Herd of Models", arXiv:2407.21783 (2024), Table 3 | read 2026-10-14 for L03-02 (its FACTS F9-F11) and re-read tonight (research/r2.md) |
| ENG | vLLM `vllm/model_executor/layers/attention/mla_attention.py` docstring (main 7f730b4c, read 2026-10-15; formerly v1/attention/backends/mla/common.py); vLLM issue #31473 (opened 2025-12-29); SGLang `deepseek_common/attention_backend_handler.py` (main 3a835cf4); FlashInfer PR #551 "support MLA decode" (merged 2024-11-02) | github.com, read 2026-10-15 (research/r2.md, files in research/r2dl) |
| DO14 | Nitish Srivastava, Geoffrey Hinton, Alex Krizhevsky, Ilya Sutskever, Ruslan Salakhutdinov, "Dropout: A Simple Way to Prevent Neural Networks from Overfitting", JMLR 15 (2014) | the definition only: units are randomly dropped during training to reduce overfitting |
| SL | Her slides: L03 15-20, L04 3-6 | course/L03.pdf, course/L04.pdf (git-ignored) |
| REC | Her recordings: L03 26:11-42:47, L04 05:39-10:53 | course/L03.transcript.md, L04.transcript.md; clips in clips.json (checked by two recognizers, not by ear) |
| C | Computed, section C | `mla_numbers.py` |
| PREV | L03-02 FACTS.md (yesterday's episode, same course) | episodes/l03-02/FACTS.md |

## B. Facts

| # | Claim (as the slide or lecture puts it) | Verified | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | Recap: the KV cache keeps every earlier token's key and value; per token 2 x layers x KV heads x head size x bytes; GQA lets groups of heads share keys and values | PREV F3, F6, F26 | "Last time: the cache keeps a key and a value for every earlier token, and grouped-query attention lets groups of heads share them." | ok |
| F2 | "Unlike MQA/GQA, MLA does not rely on head sharing; instead, it compresses KV states into a learnable low-rank latent representation" | SL 15-16; V2 sec. 2.1.2 ("low-rank joint compression for keys and values") | "Multi-head latent attention, from DeepSeek's V2 paper, does not share. It compresses: each token's keys and values are squeezed into one short learned summary, a latent vector." | ok |
| F3 | One latent per token (per layer): c^KV = W^DKV h (a down-projection of the token's hidden vector); keys and values are rebuilt from it by up-projections W^UK, W^UV | V2 eqs. 9-11; SL 16 | "A learned matrix, W-down, squeezes the token into the latent; two more, W-UK and W-UV, would unpack it into keys and values." ("projection" = multiplying by a learned matrix) | ok |
| F4 | The same latent serves keys and values (no factor 2) and all heads (each head has its own up-projection slice) | V2 eqs. 9-11 (W^UK, W^UV map d_c to d_h n_h); REC 29:05-29:57, 30:11-30:19; L04 SL 5 ("Both K and V are sharing the same compressed KV cache ... so no more 2 copies"; "shared with all heads") | "One pouch per token per layer, holding both the key and the value. Every head gets its own key and value back out of it." (v2: "shared by every head" after "it does not share" read as a contradiction, review M2; each head has its own slice of W^UK and W^UV) | ok |
| F5 | d_c = 512 in DeepSeek-V2 = 4 x d_h (128): wider than one head, far narrower than all heads' keys and values (2 x 128 x 128 = 32,768 per layer) | V2 sec. 3.1.2; SL 20; REC 30:21-31:07 ("usually it's four times larger than the head dimension") | "In DeepSeek-V2 the pouch holds 512 numbers, as long as four keys of 128, against 32,768 for the keys and values of all 128 heads." (never "four heads' worth": one head keeps a key and a value, 256, so four heads' worth would be 1,024; review M1) | ok |
| F6 | The latent is learned in training, not a file compressor: the model is trained with it and never needs the full keys back exactly | V2 sec. 2.1.2 (trained jointly; W^UK, W^UV are learned) | "Not a zip file you unzip exactly: the squeeze is learned, and the model trains with it from the start." | ok (where the analogy stops) |
| F7 | Question 1: are we really saving, if the up-projection must run on the compressed cache? | SL 17; REC 31:31-32:00 | "But to use a pouch you would unpack it, for every earlier token, at every new step: that is the work the cache was supposed to save." | ok |
| F8 | W^UK is absorbed into the query side and W^UV into W^O, by the associative property of matrix multiplication; keys and values are never computed out | V2 sec. 2.1.2, App. C; SL 17 | "Matrix products can be regrouped. So the key's unpacking matrix is multiplied into the query side once, and the value's into the output. The new token reads the pouches as they are." | ok |
| F9 | The folded factor is the same for every past token: a loop invariant, computed once per new token and head, not once per past token | REC 33:03-33:46 (clip C5); SL 17 | "It is the same for every past token, so it moves out of the loop." | ok |
| F10 | RoPE rotates each query and key by an angle set by its position; the score then depends on the relative position | ROF abstract (research/r2.md) | "RoPE, the usual way to mark word order, turns each key by an angle set by its position." | ok |
| F11 | RoPE is incompatible with low-rank KV compression: a position-dependent rotation sits between the query side and W^UK, different for every past token, so W^UK cannot be folded; keys would be recomputed for all prefix tokens | V2 sec. 2.1.3; SL 18; REC 35:30-36:54 (clips C7, C22) | "Now every key is turned by its own angle, after it comes out of the pouch. ... So no single pair of glasses fits them all. Every key would have to be rebuilt again." (the rotation acts on the key after W^UK, V2 eq. 15 / sec. 2.1.3; never "the pouch is turned", review S3) | ok |
| F12 | Decoupled RoPE: a separate small rotated key per token, shared by all heads (d_h^R = 64 = d_h / 2), made from the token itself and cached beside the latent; small rotated query pieces per head; the latent stays unrotated | V2 sec. 2.1.3, eqs. 14-17, sec. 3.1.4 ("the decoupled shared key"); SL 19 ("Separate 'what' ... from 'where'"; "It will also be cached") | "The fix: keep position out of the pouch. Each token gets a small separate tag, 64 numbers, shared by every head and turned by its position. The pouch holds the what, the tag the where." | ok |
| F13 | Why one shared position key: "Position information is global / relative, not head-specific" | SL 19 (her slide's reason); REC 39:03-39:15 | "Her slide's reason: where a word sits is the same for every head." | soften (her reasoning, say so) |
| F14 | Cache per token per layer: (d_c + d_h^R) = 576 numbers = 9/2 d_h; MHA 2 n_h d_h, GQA 2 n_g d_h, MQA 2 d_h | V2 Table 1; SL 20; C | "Per token per layer: the 512-number pouch plus the 64-number tag. 576 numbers, as long as four and a half keys." (576 = 4.5 x 128; never "heads' worth", review M1) | ok |
| F15 | Equal to GQA with only 2.25 groups, however many heads | V2 sec. 2.1.4 / Table 1 text; SL 20; REC 42:20-42:33; C (576 / 256 = 2.25) | "That is the cache of grouped-query attention with just two and a quarter groups, whatever the number of heads." | ok |
| F16 | The head count drops out of the size | L04 SL 5; REC L04 08:17-08:38 | "The number of heads is gone from the formula." | ok |
| F17 | Llama 3 shapes: 8B 32 layers x 32 heads; 70B 80 x 64; 405B 126 x 128; head size 128 | LL3 Table 3 (PREV F9-F11; r2 re-check) | "Llama 3's three sizes: 32 layers and 32 heads, 80 and 64, 126 and 128." | ok |
| F18 | Worksheet: MLA-style cache (d_c = 4 d_h, d_h^R = d_h / 2) on those shapes: 36 KB, 90 KB, ~142 KB per token | C: 36,864 / 92,160 / 145,152 bytes (16-bit) = 36 / 90 / 141.75 KiB = 36.9 / 92.2 / 145.2 kB; L04 SL 5 | on her table as printed (KiB, D3); in our voice: "36 kilobytes per token in her table, instead of 512" (her KB = 1,024 bytes, said on screen; 36 KiB = 36,864 bytes, 512 KiB = 524,288 bytes) | ok |
| F19 | Savings over plain MHA: ~14x (~93%), ~28x (~96%), ~56x (~98%) | C: 14.2x, 28.4x, 56.9x; 93.0%, 96.5%, 98.2%; L04 SL 5 | "14, 28 and more than 56 times smaller" (her ~56x truncates 56.9; never "57" next to her slide) | ok |
| F20 | Against Llama 3's actual GQA (8 KV heads), the MLA-style cache is 8 / 2.25 = 3.6x smaller | C (GQA-8 / MLA = 3.56 for every size) | "Even against Llama 3's real eight-group cache, about 3.6 times smaller: eight groups against two and a quarter." (8 / 2.25 = 3.56; screen: "8 ÷ 2.25 ≈ 3.6×") | ok |
| F21 | DeepSeek-V2's own shape: 576 vs 32,768 per layer = 1.76% of a same-shape MHA cache | C; V2 sec. 3.1.2 | only as "under 2 percent of what plain attention of the same shape would keep" (hypothetical: no such MHA model was trained) | soften |
| F22 | In DeepSeek's tests (MoE models of about 16B and 250B), MLA kept 14% and 4% of the MHA models' cache and scored higher on 7 of 8 benchmark scores (BBH and MMLU at both sizes higher; one score 0.7 points lower) | V2 App. D.2, Table 9; the authors' own single runs; V3 calls it "comparable" | "In DeepSeek's own tests, at two model sizes, the compressed version kept 4 to 14 percent of the cache, and scored higher on seven of eight benchmark scores." | soften (always "in their own tests"; never "proven", never "perplexity") |
| F23 | Hook: memory of past words shrunk "to a few percent" and the model "got better, not worse" | F22 | "DeepSeek shrank a model's memory of past words to 4 percent. And it scored better." then "Not worse: better, in their own tests at least." Cover: "memory of past words: down to 4%" / "and it scored better, not worse" / "in DeepSeek's own tests (2024)". The 4% is the large pair of Table 9 (34.6K vs 860.2K elements = 4.0%), which scored higher on all four of its benchmark scores (BBH 46.6 -> 50.7, MMLU 57.5 -> 59.0 and two more; the one lower score is in the small pair) | soften (= F22; v2 replaces "a few percent", review S1) |
| F24 | Her guesses why quality held up (L04 slide 3 "My Guess"): structural regularization (like dropout); redundancy in plain MHA; less interference between position and content encoding | L04 SL 3; REC L04 06:19-07:29 (clips C11, C13, C14) | "Her guesses, and she calls them guesses: squeezing works like dropout; plain attention stores a lot twice; and keeping position apart stops it muddling the content." | ok (as her guesses) |
| F25 | Dropout: switching off random parts of a network during training, which reduces overfitting | DO14 | "Dropout: switch off random parts of a network while it trains, and it often does better." | ok |
| F26 | Absorbed MLA does more arithmetic per remembered token: scores over 576 numbers instead of 192 (3x), values mixed 512 wide instead of 128 (4x) | C (V2 dims); L04 SL 6 ("d_c is still larger than d_h thus introducing computation overhead"); REC L03 33:56-34:42, L04 09:30-10:03; ENG (r2) | "The folded form does several times more arithmetic for every remembered token: it reads the pouches whole." | ok |
| F27 | In serving, moving memory is the bigger cost, so the extra arithmetic usually pays | REC 34:32-34:42 (clip C6); PREV F5 | her clip C6; narration: "When memory is the bottleneck, that is a good trade." | ok |
| F28 | Serving engines pick per job: the "compute friendly" unpacked form (keys and values rebuilt, plain multi-head attention) for prefill, reading a whole prompt at once, and the "data-movement friendly" folded form for decode, generating one token at a time | ENG: vLLM `mla_attention.py` docstring ("We generally want to use the compute friendly approach for \"prefill\" ... and the data-movement friendly approach for \"decode\""; "this is less compute-friendly since Lkv > P but is more data-movement friendly"); SGLang `attention_backend_handler.py` (MHA paths for prefill/extend, MLA otherwise); FlashInfer PR #551 (prefill: folded / unpacked arithmetic about 3.36x; decode: about 0.011x) | "So engines switch: while reading a whole prompt, they unpack the keys and values; while generating word by word, they read the pouches folded." "Reading a prompt with the folded form takes about three times the arithmetic." "Either way, the cache itself stays packed." (vLLM `mla_attention.py` docstring: "Use a single latent vector to represent the per-token entry of the KV cache"; both paths read `cache_kv_c` and `cache_k_pe`; v2 drops "nobody vacuum-packs one sock", which suggested prompts are cached unpacked, review S5) | soften (engine behaviour as of Oct 2026; say "engines like vLLM", never "all") |
| F29 | Her slide's example: a vLLM performance-tracking issue: "Short context length: non absorption" | ENG: issue #31473 "[Performance]: DeepSeek-V3.2 Performance Optimization Tracking" (opened 29 Dec 2025): section "Short-Context Prefill Perf": "We currently use the absorbed approach (data-movement friendly MQA) for prefill instead of the un-absorbed approach (compute-friendly MHA), which is suboptimal for short-context prefill. The absorbed pathway requires ~3.36x more FLOPs"; the rule (dense unpacked prefill for short requests) is now in vLLM's sparse-MLA code. About a later model (V3.2), and about prefill only | not shown (a web page); in voice at most: "for short prompts, engine builders found the folded form costs more than it saves" | soften (prefill only) |
| F30 | DeepSeek-V3 keeps MLA with the same sizes (512 + 64) | V3 sec. 2.1.1, 4.2 | "DeepSeek's next model, V3, kept the same design." | ok |
| F32 | W^O, the output matrix, is the layer's last multiplication: it takes the outputs of all heads, side by side, and mixes them into the token's new hidden vector | V2 eqs. 8 and 19, u_t = W^O [o_t,1; o_t,2; ...; o_t,n_h], "W^O ... denotes the output projection matrix" | "the output matrix, the last multiplication, which mixes the heads' results" | ok |
| F31 | Next part of the course: the residual highway (L03-04) | daily/SYLLABUS.md | "Next time: the residual highway." | ok |

## C. Computed (`~/miniforge3/bin/python3 ~/picasso-work/daily/L03-03/scripts/mla_numbers.py`)
```
d_h=128 d_c=4*d_h=512 d_h^R=d_h/2=64  per layer per token: d_c+d_h^R=576 elements = 4.50 d_h
GQA groups with the same cache: (d_c+d_h^R)/(2 d_h) = 2.2500
Llama 3 8B    L= 32 H= 32  MHA 524288 B (524.3 kB, 512.00 KiB)  MLA 36864 B (36.9 kB, 36.00 KiB)  ratio 14.22  saved 92.97%  GQA-8 131072 B ratio GQA/MLA 3.56   4096 tok: MHA 2.15 GB (2.00 GiB) MLA 151.0 MB (144.0 MiB)
Llama 3 70B   L= 80 H= 64  MHA 2621440 B (2621.4 kB, 2560.00 KiB)  MLA 92160 B (92.2 kB, 90.00 KiB)  ratio 28.44  saved 96.48%  GQA-8 327680 B ratio GQA/MLA 3.56   4096 tok: MHA 10.74 GB (10.00 GiB) MLA 377.5 MB (360.0 MiB)
Llama 3 405B  L=126 H=128  MHA 8257536 B (8257.5 kB, 8064.00 KiB)  MLA 145152 B (145.2 kB, 141.75 KiB)  ratio 56.89  saved 98.24%  GQA-8 516096 B ratio GQA/MLA 3.56   4096 tok: MHA 33.82 GB (31.50 GiB) MLA 594.5 MB (567.0 MiB)
DeepSeek-V2 shape per layer: MHA 32768 elements, MLA 576 elements, MLA/MHA = 1.76%, ratio 56.9; per token all layers, 16-bit: MHA 3932160 B, MLA 69120 B
score dot product per cached token per head: plain 192, absorbed 576 (x3.0); value width plain 128, absorbed 512 (x4.0)
```
Table 9 check (research/r1.md): (512 + 64) x 60 = 34,560 = "34.6K"; x 27 (the small model) = 15,552 = "15.6K";
15.6 / 110.6 = 14.1 %, 34.6 / 860.2 = 4.0 %.

## D. Slide errata (fixed on screen with the red pen or avoided; never captioned as hers)
- D1 L03 slide 19: "k^R_t dimension is d_h^R, usually d_c / 2". The paper sets d_h^R = d_h / 2 = 64 (d_c / 2 would be
  256); her slide 20 and L04 slide 4 say d_h / 2. v2 tapes that line: the red pen strikes "d_c" and letters "paper:
  half of 128 = 64" beside it (never captioned as hers).
- D2 L04 slide 3: "Experimentally: ... better model Perplexity, PPL". The paper reports benchmark accuracy only (App.
  D.2, Table 9); no perplexity for the attention comparison. We say "scored higher on seven of eight benchmark
  scores" and do not show that line (crop it out or strike it).
- D3 L04 slide 5: KB = 1,024 bytes, MB = 1,024^2 (consistent in the table); "~568 MB" is 142 x 4 (141.75 KiB x 4,096 =
  567 MiB): within her own "10% is fine" (clip C17). Shown as printed; our voice uses bytes or ratios.
- D3b L04 slide 5, as taped in v2: cut to four of its eight columns (layers, per-token MHA, per-token MLA, savings) so the
  savings column clears the phone's button rail and the text reads at phone size; the head size and the two 4k-prompt
  total columns are left out and the screen says so ("two of her columns ... left out here"). Nothing in the kept
  columns is changed. The heads are lettered by us under the table ("layers × heads: 32 × 32 · 80 × 64 · 126 × 128", F17).
- D4 L04 slide 6: the web page (an issue tracker) is never shown; the paper's figure on slides 15-19 and L04 6 is
  cropped out (third-party).
- D5 L03 slide 17 writes W^UQ C^Q for the query (the appendix form with query compression); the main text writes W^Q.
  Both are the paper's; we say "the query side".

## C2. Review fixes (2026-10-15, round 2)
The independent review (`drafts/review.md`) found one wrong ratio wording (M1: "four heads' worth") and one subtle
mis-statement (S3: "every pouch is turned"); both are fixed in F5, F11, F14 and in the voice, the screen and the post.
The hook now uses the measured 4% (F23) and the 3.6x figure is said and shown the same way (F20).

## E. Third-party images on the slides
- Slides 15-19 and L04 6: the MLA/MHA figures are from the DeepSeek-V2 paper (Figures 2-3). Cropped out; only her text
  and her red derivations are taped.
- Slide 20 and L04 slide 3: the table is the paper's Table 1 (typeset image). Cropped out; we letter the formulas
  ourselves from V2 Table 1 (F14).
- L04 slide 6: a web page. Never shown.
- Slide 17 and 18 footers cite two blog posts (liorsinai.github.io, mccormickml.com): cropped out with the figure; not
  cited by us (we cite the paper).

## F. Real people
- Prof. Yufei Ding: her voice (clips) and her slides; never drawn. Text credit only.
- The paper's authors are credited as "DeepSeek-AI" (the paper's own author line); no person is named or drawn.
- The guest, clerk, optician, gardener and traveller in the drawings are invented characters.

## G. Traps (wordings that would be wrong)
- "Better perplexity" / "lower loss": not reported (D2). Say "scored higher on seven of eight benchmark scores, in their tests".
- "Proven better than attention": single runs by the authors; V3 itself says "comparable".
- "MLA cut the cache by 93.3%": that is the deployed system against DeepSeek 67B (a GQA model), with a 6-bit cache. Not used.
- "5.76x faster" / "42.5% cheaper to train": whole-system claims, not MLA. Not used.
- "Only one vector per token": two pieces per layer, the latent (512) and the shared position key (64).
- "MLA drops position" / "cannot use RoPE": it uses RoPE on the separate small parts.
- "The position key is made from the latent": it is made from the token itself.
- "512 bytes": 512 numbers (elements), whatever their precision.
- "57x smaller" next to her "~56x": say "more than 56 times".
- "zip": a metaphor for a learned squeeze, not a lossless file compressor (F6).
- Never tie the company or the benchmarks to any place; never list the paper's region-specific benchmarks.
- "The score depends only on relative position" (RoPE): it still depends on both tokens' content; position enters only
  as their distance. Say "turns each key by an angle set by its position".
- "Llama 3 would save 93%" / "Llama 3 uses MLA": the worksheet is a what-if on Llama 3's shapes with plain multi-head
  attention as the baseline; real Llama 3 shares 8 KV heads, so against it the MLA-style cache is 3.6x smaller (F20).
- "Engines switch the trick off for short contexts": only for prompt reading (prefill), and the explicit short-prompt
  rule is for a later sparse model; SGLang sends short cached prefixes to the folded form. Say "while reading a prompt"
  vs "while generating" (F28).
- "The folded form is always more arithmetic": only inside the attention step. Unpacking every past token at every new
  token would cost far more (FlashInfer PR #551: the folded decode needs about 1% of that). Say "inside attention".
