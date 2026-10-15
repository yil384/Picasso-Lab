# L03-03 "MLA: Zipping the KV Cache" - draft B (the worked example first)

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 3 "Transformer Model Architecture
Variants (2)", slides 15-20 (recording 26:11-42:47), plus the Lecture 4 recap, slides 3-6 (recording 05:39-10:53).
Daily episode 11, for the morning of 2026-10-16. Facts: `../FACTS.md` (rows as of 2026-10-15, F28-F29 cleared as
soften by r2 before this draft was finished).

Angle: her worksheet (L04 slide 5) is the spine. The film opens on the answer column (14x / 28x / more than 56x), then
earns every symbol of `(d_c + d_h^R) l = 9/2 d_h l` in order: one latent instead of keys and values for every head
(d_c = 4 d_h), why unpacking costs nothing (slide 17, the loop invariant), why RoPE breaks it (slide 18), the shared
position tag (d_h^R = d_h / 2), the sum = GQA with 2.25 groups, back to the worksheet numbers; then quality (their tests,
her guesses, her caution) and the one case where the folded form costs more than it saves (reading a prompt).

Analogy map (said on screen once each, then used): pouch = the latent c_KV (one per token per layer, holds key and value,
opened by every head); the pump = W-down (W^DKV); unpacking = W^UK, W^UV; the glasses = W^UK folded into the query side;
the turned boards = RoPE's position-dependent turn; the small luggage tag = the decoupled, shared RoPE key k^R. Where
the analogy stops is said aloud twice: n11 (the squeeze is learned, not a lossless zip) and n16 (in the model the
"glasses" are just the query multiplied by W^UK first).

Estimated runtime 7:49 (903 narration words, 7 clips of her voice = 43.5 s, 14 panels + the logo card).

## Beats

| Panel | Arrives | What is on screen | Voice |
| --- | --- | --- | --- |
| P0 | 0:00.0 | **Frame 0 = the finished cover** `line_cover_l03_03` (heap of tags and parcels, clerk holding up one pouch, crate of pouches). Lettering: "a few percent of the memory" over the crate, then "scored better, not worse?" with a red-pen question mark (F23). Title card strip at n1: "MLA: Zipping the KV Cache", "CSE 291P, Prof. Yufei Ding, UC San Diego, Lecture 3" | n0, n1 |
| P1 | 0:24.4 | Her **L04 slide 5** taped (the whole worksheet table, as printed: KB = 1,024 bytes, D3). Above it we letter last episode's formula: `per token = 2 x layers x KV heads x head size x 2 bytes` (F1). At n3 the red pen rings row 1 (32 / 32 / 128) and "~512 KB"; the three MLA columns are covered by paper strips. At n4 the strips are pulled off: red rings on "36 KB" and on "~14x", "~28x", "~56x" (F18, F19). A red "?" next to the MLA column header: "where from?" | n2, n3, n4 |
| P2 | 0:59.4 | Her **slide 15** taped, title + bullet only (the figure is the paper's: cropped out), fading at n6. Then `line_mla_vacuum_pack`. Lettering: "hidden vector h (one token, one layer)" on the bag, "W-down" on the pump, "c-KV = the latent" on the finished pouch (F2, F3). At n8 two dashed arrows out of the flat pouch lettered "W-UK -> keys", "W-UV -> values" | n5, n6, n7, n8 |
| P3 | 1:41.6 | `line_cover_l03_03` cropped to the clerk's raised pouch and the crate. The formula from P1 lettered across the top; the red pen strikes "2 x" (arrow: "key + value in one pouch") and "KV heads" (arrow: "every head opens the same pouch") (F4, F16). At n10 a small two-row table: "pouch: 512 numbers = 4 heads' worth" / "all 128 heads' K + V: 32,768" (F5). At n11 a pencil note under the pouch: "learned squeeze, not a zip file" (F6) | n9, n10, n11, c4 |
| P4 | 2:28.5 | `line_mla_unpack_mess`. Lettering on the waiting guest's card: "the new token's query"; on the flying tags and parcels: "rebuilt keys, values". Red-pen counter in the corner: "every earlier token x every new step" (F7). At n13 her **slide 17** top text taped (the "Two Questions: 1. ..." sentence only, no Answer line yet) | n12, n13 |
| P5 | 2:46.1 | Her **slide 17** right column taped: the red associativity derivation (`S = K^T Q = (W^UK C^KV)^T (W^UQ C^Q) = (C^KV)^T (W^UK)^T W^UQ C^Q`, her underline and "Absorbed to Query Computation!!!"; the figure and footer cropped out). We letter above it: "key x query = score". At n14 a pencil line: "A(BC) = (AB)C, but AB is not BA". At n15 the red pen draws brackets regrouping `(W^UK)^T W^UQ C^Q` and an arrow "query side". At n16 cut to `line_mla_optician_glasses`: the lenses lettered "W-UK" (F8) | n14, n15, n16 |
| P6 | 3:19.8 | `line_mla_reading_pouches`. Lettering on the glasses: "W-UK, folded in"; on the row of sealed pouches: "c-KV, c-KV, c-KV ..."; red pen: "same glasses for every pouch" (F9). During c5 a small lettered loop: `for each past token: ...` with the glasses term lifted out above the loop. At n18: "W-UV -> folded into the output W^O" (F8) | n17, c5, n18 |
| P7 | 3:45.6 | During c7: `line_mla_turned_pouches` (the five boards, pouch upright -> flat). At n19 lettering "RoPE: turn by position" with board labels "pos 1, pos 2, pos 3, pos 4, pos 5" (F10). At n20 her **slide 18** right column taped ("Why not compatible?" derivation and its two bullets; figure and footer cropped out); the red pen rings `R(Pos)^T` sitting between `(W^UK)^T` and `Q` (F11). At n21 back to the boards: the guest's glasses lettered "W-UK" with a red cross: "one pair can't fit every angle" | c7, n19, n20, n21, c22 |
| P8 | 4:27.8 | `line_mla_luggage_tag`. Lettering on the pouch: "what: c-KV, 512, never turned"; on the tag: "where: k^R, 64, turned by position, shared by every head" (F12). At n23 her **slide 19** top sentence taped ("Decoupled RoPE ... Separate 'what' ... from 'where'"; only that line: its right column says d_c / 2, D1, and is not shown); lettered beneath: "score = content (through the glasses) + position (tags x small turned query pieces)". At n24 a margin note: "her slide: position is global, not head-specific" (F13) | n22, n23, n24 |
| P9 | 5:04.5 | `line_mla_slim_shelf` (the huge wall vs the slim shelf). The sum lettered over the slim shelf, term by term: `d_c = 4 d_h` + `d_h^R = d_h / 2` = `4.5 d_h = 576 numbers` per token per layer (F14). At n26 the line `2 x groups x d_h = 4.5 d_h` -> `groups = 2.25` (F15), then her **slide 20** "In DeepSeek-V2: d_c = 4 d_h ... 2.25 groups" text taped (the paper's table above it cropped out); over the huge wall: `MHA: 2 x heads x d_h`. At n27 her **L04 slide 5** comes back, row 1 ringed: `32 x 576 x 2 bytes = 36,864 bytes` lettered beside it (F18), then "~14x", "~28x", "~56x" ringed in turn (F19). At n28 a pencil line: "vs Llama 3's real 8 groups: about 3.5x" (F20) | n25, n26, n27, n28 |
| P10 | 5:44.1 | Our own small lettered table on a taped card (not the paper's figure): "DeepSeek's tests, two model sizes / cache kept: 14% and 4% / higher on 7 of 8 benchmark scores" (F22); a pencil note at n30: "their own runs; V3 report: 'comparable'" (F22, F30). At n31 cut to `line_mla_hedge_trim`: lettered "squeeze = trim?" with a red "guess" stamp; at n32 "dropout: switch off random parts while training" (F24, F25) | n29, n30, n31, c11, n32 |
| P11 | 6:30.0 | Her **L04 slide 3** taped, cropped to "My Guess:" and its three bullets (the paper's table and the "Experimentally ... Perplexity" line cropped out, D2). Beside it `line_mla_same_shirts`, lettered "redundancy: the same thing stored many times"; a red tick by each guess as it is named (F24). During c14 the slide is ringed with a red "her caution" bracket | n33, c14 |
| P12 | 6:51.9 | `line_mla_one_sock`. Lettering on the machine's dials: "inside attention: x3 scores, x4 values" (F26). During c6: "memory = the bottleneck while generating" (F27). At n35 a two-column card in pencil: "reading a whole prompt: about 3x the arithmetic -> unpack" / "generating word by word: memory-bound -> fold" (F28, F29); a red ring on the tiny bag: "short prompt" | n34, c6, n35 |
| P13 | 7:30.8 | `line_cover_l03_03` again, full frame. The two-line takeaway lettered over it: "One learned pouch + one small position tag per token = the cache of 2.25 groups." / "Unpack in the glasses, never on the shelf." Then "Next time: the residual highway." (F31) | n36, n37 |
| end | 7:45.2 | the logo card (kit), credits from strings.json | - |

## Narration and clips (in order, estimated start times)

Times estimated at 2.4 words/s (144 words per minute), 0.4 s between lines, 1.5 s per panel change.

| Id | Start | Line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.4 | DeepSeek cut the memory a model keeps of past words to a few percent, and in their tests it scored better, not worse. How do you throw most of a memory away and lose nothing? | F23 (soften), F22 |
| n1 | 0:15.7 | From Prof. Yufei Ding's CSE 291P, lecture 3: let's do it her way, on a worksheet. | SL, REC |
| n2 | 0:24.4 | Last time: per token, the cache holds a key and a value, so two, times layers, times KV heads, times head size, times two bytes. | F1, PREV |
| n3 | 0:35.4 | Her worksheet takes Llama 3's three sizes and gives every head its own keys and values. The smallest, 32 layers and 32 heads: 524,288 bytes per token. | F17, F18, C (what-if: plain MHA on Llama 3 shapes, G) |
| n4 | 0:47.3 | Now DeepSeek's design: 36,864 bytes. Fourteen times smaller. Then 28 times, and more than 56. Where do those numbers come from? Let's earn them. | F18, F19, C |
| n5 | 0:59.4 | Grouped-query attention saved memory by sharing. DeepSeek's V2 paper does not share. It compresses: multi-head latent attention. | F1, F2, SL 15 |
| n6 | 1:07.0 | Take one token in one layer: a long list of numbers. Multiply it by a learned matrix, W-down, a step called a projection, and it is squeezed into a short vector, c-KV: the latent, which just means hidden. | F3 |
| n7 | 1:23.6 | In the picture: a tag and a parcel in one bag, and the pump, W-down, sucks it flat into a pouch, the latent. | F3 (analogy) |
| n8 | 1:33.7 | Two more learned matrices, W-UK and W-UV, would unpack it into keys and values. | F3 |
| n9 | 1:41.6 | Count what one pouch replaces. It holds key and value together: the two is gone. And every head opens the same pouch, with its own slice of the unpacking matrices: the KV heads are gone too. | F4, F16 |
| n10 | 1:57.3 | In DeepSeek-V2, a pouch is 512 numbers: four heads' worth, so every head can find its key and value in it. All 128 heads' keys and values would take 32,768. | F5 (incl. REC 30:33-30:44 for the why) |
| n11 | 2:10.4 | Where the picture stops: not a zip that unzips exactly. The squeeze is learned, trained in from the start. | F6, G ("zip") |
| c4 | 2:18.9 | **her clip** "It seems that pretty straightforward. Like, what are the tricks here? Why others cannot really think about it?" | REC |
| n12 | 2:28.5 | Trick one. To use a pouch you would unpack it, for every earlier token, at every step: the very work the cache was meant to save. | F7 |
| n13 | 2:39.9 | Her slide asks it plainly: are we really saving anything? | F7, SL 17 |
| n14 | 2:46.1 | Her answer: in a chain of matrix products you may not swap the order, but you may pick which neighbours to multiply first. Associativity. | F8, F11 (no commutative law) |
| n15 | 2:56.7 | The score, how well the new question matches an old name tag, is key times query. The key is W-UK times the pouch. Regroup, and W-UK moves to the query side. | F8, SL 17, D5 ("the query side") |
| n16 | 3:10.3 | The optician grinds W-UK into the guest's glasses. In the model, the query is multiplied by W-UK first. | F8 |
| n17 | 3:19.8 | And the glasses are the same for every past token: made once per new token and per head, then used on every pouch. | F9 |
| c5 | 3:30.0 | **her clip** "this is a loop invariant component. You can abstract it outside of the loop." | REC (F9) |
| n18 | 3:35.6 | Values likewise: W-UV folds into the output matrix. Keys and values are never rebuilt; the pouches are read sealed. | F8 |
| c7 | 3:45.6 | **her clip** "Does that solve all the problems? No. Actually, there's a killer. The killer is the positional encoding." | REC (F11) |
| n19 | 3:53.6 | A model also needs word order. The usual way, RoPE, rotary position embedding, turns each query and key by an angle set by its position. | F10, G (RoPE wording) |
| n20 | 4:04.6 | In her next derivation, the old token's turn lands in the middle, between W-UK and the query, and it differs for every past token. | F11, SL 18 |
| n21 | 4:15.2 | Every pouch turned its own way: no single pair of glasses fits them all. Every key must be rebuilt again. | F11 |
| c22 | 4:24.1 | **her clip** "This algorithm doesn't really work anymore." | REC (F11) |
| n22 | 4:27.8 | The fix: keep position out of the pouch. Each token gets a small separate tag, 64 numbers, made from the token itself, turned by its position, cached beside the pouch. | F12, G (made from the token, not the latent) |
| n23 | 4:40.9 | The pouch holds the what, the tag the where. The score is two parts added: content, through the glasses, and position, from the tags and small turned pieces of each head's query. | F12, SL 19 |
| n24 | 4:54.9 | One tag serves every head. Her slide's reason: where a word sits is the same for every head. | F12, F13 (soften: her reason, said as hers) |
| n25 | 5:04.5 | Add it up, per token, per layer: the pouch, four head sizes; the tag, half of one. Four and a half: 576 numbers. | F14, F5, F12, G ("not one vector") |
| n26 | 5:14.7 | Grouped-query attention keeps two, times the groups, times a head size. Set that to four and a half: two and a quarter groups, however many heads. | F14, F15, F16 |
| n27 | 5:26.1 | Her worksheet: 32 layers, times 576, times two bytes: 36,864. Fourteen times smaller. More heads, bigger win: 28 times, then more than 56. | F18, F19, C, G ("more than 56") |
| n28 | 5:36.3 | Even against Llama 3's real eight-group cache: about three and a half times smaller. | F20 |
| n29 | 5:44.1 | Did quality survive? In DeepSeek's own tests, at two model sizes, the compressed version kept 4 to 14 percent of the plain cache and scored higher on seven of eight benchmark scores. | F22 (soften), G (no perplexity) |
| n30 | 5:58.1 | Their own runs, at two sizes; their next report calls the quality comparable, and their next model, V3, kept the design. | F22, F30, G ("not proven") |
| n31 | 6:07.5 | Why not worse? Her slide offers guesses, and calls them guesses. | F24 |
| c11 | 6:12.5 | **her clip** "But if you really want to think about why this is working, I think it's kind of like why sometimes you do dropout." | REC (F24) |
| n32 | 6:19.6 | Dropout: switch off random parts of a network while it trains, and it often does better. Like trimming a hedge. | F25 |
| n33 | 6:30.0 | Her other guesses: plain attention stores a lot twice, like a suitcase of identical shirts. And keeping position apart stops it muddling the content. | F24 |
| c14 | 6:40.6 | **her clip** "But to me, I feel like a lot of this explanation is still like we want to explain how it works. No matter what kind of results we can get, we always can find a reason for it." | REC (the honest limit) |
| n34 | 6:51.9 | Last question: is it always worth it? Inside attention, reading pouches whole costs more arithmetic for every remembered token: three times for the scores, four for the values. | F26, G ("inside attention") |
| c6 | 7:04.2 | **her clip** "But the good news is for the serving process, the memory overhead is a huge part." | REC (F27) |
| n35 | 7:09.8 | While generating word by word, memory is the bottleneck: a good trade. But reading a whole prompt at once, the folded form takes about three times the arithmetic, so engines like vLLM switch: unpack while reading the prompt, fold while generating. Nobody vacuum-packs one sock. | F27, F28 (soften: "engines like vLLM", engine behaviour as of Oct 2026), F29 (soften), G (prompt vs generating, not "short contexts") |
| n36 | 7:30.8 | So: one learned pouch per token plus a small position tag, the cache of two and a quarter groups. Unpacked in the glasses, never on the shelf. | F4, F8, F12, F15 |
| n37 | 7:42.6 | Next time: the residual highway. | F31 |

Notes on the narration:
- "W-down" is how the voice says W^DKV; the screen letters W^DKV once in P2. "c-KV", "W-UK", "W-UV" are said as written.
- n3 / n27 bytes are 16-bit numbers (FACTS units); her slide's "36 KB" is 1,024-byte KB (D3) and is shown as printed,
  never read aloud. The 524,288 baseline is a what-if (plain multi-head attention on Llama 3's shapes); n28 gives the
  comparison with the Llama 3 that exists (F20, G).
- n35 replaces the provisional "switch the trick off for short inputs" wording: FACTS G now marks that as a trap
  (the switch is prompt reading vs generating), so the line uses F28's cleared wording. No "needs F28" mark remains.
- n0's "a few percent" is F23's soften wording and is pinned to F22 in n29 (4 to 14 percent, their tests).

## Her clips

Lengths and texts as in the drafts brief (checked by two recognizers, `clips_r1/r2.json`; not yet by ear). 7 clips,
43.5 s = about 9% of the runtime (cap: a quarter).

| Id | Recording | Length | Text | Where |
| --- | --- | --- | --- | --- |
| C4 | L03 31:14 | 7.7 s | "It seems that pretty straightforward. Like, what are the tricks here? Why others cannot really think about it?" | end of P3, turns from the idea to its two problems |
| C5 | L03 33:40 | 5.2 s | "this is a loop invariant component. You can abstract it outside of the loop." | P6 (C24 not used) |
| C7 | L03 35:30 | 7.6 s | "Does that solve all the problems? No. Actually, there's a killer. The killer is the positional encoding." | opens P7 (text was edited in r2: listen first) |
| C22 | L03 36:52 | 1.8 s | "This algorithm doesn't really work anymore." | closes P7 |
| C11 | L04 06:19 | 6.7 s | "But if you really want to think about why this is working, I think it's kind of like why sometimes you do dropout." | P10, her first guess in her voice |
| C14 | L04 07:29 | 9.4 s | "But to me, I feel like a lot of this explanation is still like we want to explain how it works. No matter what kind of results we can get, we always can find a reason for it." | P11, the honest limit |
| C6 | L03 34:32 | 5.1 s | "But the good news is for the serving process, the memory overhead is a huge part." | P12 |

Swap if the judge wants it: C19 (L04 08:22, 8.4 s; "it's directly proportional to the number of layers instead of
the number of heads. So the number of heads is removed." per `clips_r3.json`; the coordinator's copy starts "Now
it's ...": listen and use the text the audio has) can replace C22 at the end of P9 n26 ("however many heads"), which
then shortens n26 to end at "two and a quarter groups."

## Her slides taped (crops)
- L04 slide 5 (P1, P9): whole worksheet table as printed (KB = 1,024 bytes, D3); MLA columns covered by paper strips in
  P1 until n4.
- L03 slide 15 (P2): title + bullet only; the paper's figure cropped out (E).
- L03 slide 17 (P4 top sentence; P5 right column): the "Two Questions: 1." text, and the red associativity derivation
  with her underline; the figure and the blog footer cropped out (E). It writes W^UQ C^Q (D5): narration says "the
  query side".
- L03 slide 18 (P7): the right column "Why not compatible?" derivation and its two bullets; figure and footer cropped out.
- L03 slide 19 (P8): the top sentence only (its right column has the d_c / 2 slip, D1).
- L03 slide 20 (P9): only the "In DeepSeek-V2: d_c = 4 d_h, d_h^R = d_h / 2, ... 2.25 groups" text; the table is the
  paper's (cropped out; we letter the formulas ourselves).
- L04 slide 3 (P11): "My Guess:" and its three bullets only (table and the perplexity line cropped out, D2).
- Never shown: L04 slide 6 (a web page) and any figure from the paper.

## Drawings
- Made for this episode: `line_cover_l03_03` (frame 0, P3 crop, P13), `line_mla_vacuum_pack` (P2),
  `line_mla_unpack_mess` (P4), `line_mla_optician_glasses` (P5), `line_mla_reading_pouches` (P6),
  `line_mla_turned_pouches` (P7), `line_mla_luggage_tag` (P8), `line_mla_slim_shelf` (P9), `line_mla_hedge_trim` (P10),
  `line_mla_same_shirts` (P11), `line_mla_one_sock` (P12).
- Reused: none needed (the P10 results card and the P9 sums are lettering on a taped card, not drawings).
- Code adds only lettering, red-pen rings, strikes and brackets, arrows, the small results card and the taped slides.

## Count
- Narration: 903 words (n0-n37, whitespace count), 38 lines; at 144 words per minute about 6:16 of voice.
- Her clips: 43.5 s (7 clips). Panel changes: 13 x 1.5 s.
- Estimated runtime: 7:45 to the last word, about 7:49 with the logo card (inside 6-8 min).
