# L03-03 "MLA: Zipping the KV Cache"

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 3 "Transformer Model Architecture
Variants (2)", slides 15-20 (recording 26:11-42:47), plus the Lecture 4 recap, slides 3-6 (recording 05:39-10:53).
Daily episode 11, made unattended on 2026-10-15 for the morning of 2026-10-16. Film data: `episode.json`,
`strings.json`, `timeline.json` (kit-lesson); facts: `FACTS.md`.

Two drafts (`drafts/script_A.md`, story first; `drafts/script_B.md`, the worked example first), a judge
(`drafts/judge.md`: A wins 48-40, 10 fixes, all applied) and this synthesis by the producer: A's spine (the clerk
vacuum-packs, the optician grinds the unpacking into the glasses, the turned pouches, the luggage tag) with B's
score definition and its prefill/decode ending. Independent review: `drafts/review.md` (5 must-fix, 14 should-fix;
all must-fix and 13 should-fix applied in v2, the 12:00 round; S11 only partly: drawings end near y 1300, not 1190).
A second independent review of v2 (`drafts/review2.md`: 3 new must-fix, 5 new should-fix) was applied in v3.

Runtime 8:04.4 (995 narration words, 7 clips of her voice, 50.5 s; 15 panels + the logo card). Narration: a synthetic voice.

## Beats

| Panel | Arrives | What is on screen | Voice |
| --- | --- | --- | --- |
| P0 | 0:00.0 | cover: the clerk holds up one flat pouch; memory down to a few %, scored better in their own tests (F23, F22) | n0, n1 |
| P1 | 0:19.8 | callback (L03-01/02): query, key, value; the cloakroom = the KV cache; GQA shares racks (F1) | n2, n3 |
| P2 | 0:45.3 | her slide 15 cut into three readable strips (the paper figure left out), red pen under "does not rely on head sharing", ring on "compresses", under "low-rank latent representation"; the clerk packs one flat pouch: the latent c-KV, made by W-down, shared by K, V and every head (F2-F4) | n5, n6, n7, n8 |
| P3 | 1:26.3 | the slim shelf vs the wall: 512 numbers vs 32,768 (F5); not an exact zip (F6); her clip C4 | n9, n10, c4 |
| P4 | 2:01.8 | her slide 17 equations (keys and values rebuilt by W-UK and W-UV, ringed); the clerk unpacks every pouch for every step (F3, F7) | n11, n12 |
| P5 | 2:21.0 | her slide 17 derivation taped large: S = K^T Q ringed, the regrouped factor ringed; W-UK ground into the glasses, W-UV folded into the output (F8); the same for every pouch, out of the loop, her clip C5 (F9) | n13, n14, n15, n16, c5, n17 |
| P6 | 3:19.1 | the guest in glasses reads the row of sealed pouches; ticks along the row (F8) | n18 |
| P7 | 3:25.1 | her clip C7 (the killer); the turned pouches: RoPE turns each key by its position (F10); her slide 18 derivation taped large, R(Pos) ringed between the query and W-UK; no single pair of glasses fits (F11) | c7, n19, n20 |
| P8 | 4:09.5 | the luggage tag: position out of the pouch; her slide 19 formula k^R = RoPE(W^KR h_t), cached (its d_c / 2 slip corrected to d_h / 2 in red, D1); her slide 19 reason for one shared key (F12, F13) | n21, n22, n23 |
| P9 | 4:43.2 | her slide 20 (the DeepSeek-V2 text only, taped large; the paper table left out): d_c = 4 d_h, d_h^R = d_h/2 ringed; 576 = 4.5 head sizes; / 256 = 2.25 groups (F14-F16) | n24, n25 |
| P10 | 5:13.9 | her worksheet (L04 slide 5, as printed, KB = 1,024 bytes), cut to four columns so the savings column clears the rail: the shapes ringed, the 8B row washed, its MHA / MLA cells boxed, 14x / 28x / 56x ringed (F17-F19); vs real GQA 8 / 2.25 = 3.6x (F20) | n26, n27 |
| P11 | 5:49.2 | DeepSeek tests: 4-14% of the cache, higher on 7 of 8 scores (F22); her guesses: her slide (L04 3) "My Guess" and guess 1 taped as strips, dropout ticked, her clip C11 (F24, F25) | n28, n29, c11, n30 |
| P12 | 6:26.5 | her guesses 2 and 3 taped as strips from her slide (L04 3), her clip C13 (redundancy), the identical shirts; her clip C14 (her caution); the authors own runs, V3: comparable, kept (F22, F24, F30) | c13, n31, c14, n32 |
| P13 | 7:02.9 | the reading row again: inside attention the glasses read every pouch 512 wide, several times the arithmetic (F26); her clip C6 (F27); engines: unpack while reading a prompt, fold while generating; the cache stays packed either way (F28) | n33, c6, n34 |
| P14 | 7:44.2 | takeaway over the cover drawing; next: the residual highway (F31) | n35, n36 |
| end | 8:00.4 | the logo card (kit), credits from strings.json | - |

## Narration and clips (in order, fitted start times)

| Id | Start | Line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.4 | DeepSeek shrank a model's memory of past words to 4 percent. And it scored better. | F23, F22 (soften: the large model, 4%) |
| n1 | 0:07.0 | Not worse: better, in their own tests at least. How? With a vacuum pump, a pair of glasses and a luggage tag. From Prof. Yufei Ding's CSE 291P, lectures 3 and 4. | F22 ("in their own tests"); credit |
| n2 | 0:20.4 | Quick callback. At the attention party, every token, a word or a piece of one, carries a question card, its query; a name tag, its key; and a parcel, its value. | F1 (L03-01/02 analogy) |
| n3 | 0:32.2 | The KV cache is the cloakroom: a wall of tags and parcels for every earlier guest. Last time, grouped-query attention let groups of heads, the parallel copies of attention, share one rack. | F1 |
| n5 | 0:46.2 | This time the clerk packs. This is multi-head latent attention, from DeepSeek's V2 paper. Instead of making heads share, it compresses. | F2, SL 15 |
| n6 | 0:56.2 | The clerk puts a guest's tag and parcel into one clear bag, and pumps the air out. One flat pouch. | F2, F4 (picture) |
| n7 | 1:03.5 | In the model, the pouch is a latent vector: a short hidden summary, learned in training. A learned matrix, W-down, squeezes the token into it. Multiplying by a learned matrix is called a projection. | F2, F3 |
| n8 | 1:17.5 | One pouch per token per layer, holding both the key and the value. Every head can get its own key and value back out of it. | F4 (every head its own key and value) |
| n9 | 1:26.9 | How flat? In DeepSeek-V2 the pouch holds 512 numbers, as long as four keys of 128, against 32,768 for the keys and values of all 128 heads. | F5 (four keys of 128) |
| n10 | 1:42.9 | Where the picture stops: a vacuum bag gives back exactly what went in. This squeeze is learned, and the model trains with it from the start. | F6 (where the picture stops) |
| c4 | 1:52.7 | **her clip** "It seems that pretty straightforward. Like, what are the tricks here? Why others cannot really think about it?" | REC |
| n11 | 2:02.7 | Here is the first catch. To read a pouch, the clerk would unpack it: two more learned matrices, W-UK and W-UV, rebuild the name tag and the parcel. | F3, F7 |
| n12 | 2:14.1 | And that for every earlier guest, at every new step: the very work the cache was meant to save. | F7 |
| n13 | 2:21.6 | The way out is an optician. How well the new question matches an old name tag is a score: the key times the query. And the key is W-UK times the pouch. | F8, SL 17 |
| n14 | 2:33.0 | Matrix products can be regrouped: the brackets move, the order stays. Her slide calls it the associative property. So W-UK can be multiplied into the query side first. | F8, SL 17, D5 |
| n15 | 2:45.9 | The optician grinds the unpacking into the guest's glasses. And the parcel's unpacking, W-UV, folds into the output matrix, the last multiplication, which mixes the heads' results. | F8 (W^O mixes the heads) |
| n16 | 2:59.5 | The glasses are the same for every pouch on the table. | F9 |
| c5 | 3:03.7 | **her clip** "this is a loop invariant component. You can abstract it outside of the loop." | REC |
| n17 | 3:10.6 | The loop runs over every earlier token. So the glasses are made once per new token and head, not once per pouch. | F9 |
| n18 | 3:19.7 | And the guest reads the whole row of sealed pouches through them. Nothing is unpacked. | F8 |
| c7 | 3:26.1 | **her clip** "Does that solve all the problems? No. Actually, there's a killer. The killer is the positional encoding." | REC |
| n19 | 3:35.8 | A model has to know word order. RoPE, rotary position embedding, is the usual way to mark it: it turns each query and key by an angle set by its position, like a clock hand. | F10 |
| n20 | 3:48.8 | Now every key is turned by its own angle, after it comes out of the pouch. In her derivation, that turn lands between the question and W-UK, and it is different for every earlier token. Factors may regroup, but never swap places. So no single pair of glasses fits them all. Every key would have to be rebuilt again. | F11 (the key is turned after unpacking), SL 18 |
| n21 | 4:10.4 | The fix: keep position out of the pouch. The keys that come out of it are never turned, so the glasses still fit. | F12 |
| n22 | 4:18.1 | Instead, each token gets a small separate luggage tag, 64 numbers, made from the token itself, turned by its position, and cached beside the pouch. Each head reads it with a small turned piece of its question. | F12 (made from the token) |
| n23 | 4:32.9 | Her slide: separate what from where. And one tag per token, shared by every head. Her slide's reason: where a word sits is the same for every head. | F12, F13 (her slide), SL 19 |
| n24 | 4:43.8 | Now the size. Per token per layer: the 512-number pouch plus the 64-number tag. 576 numbers, as long as four and a half keys. | F14 (two pieces; 4.5 keys of 128) |
| n25 | 4:55.8 | A group keeps one key and one value, 128 numbers each: 256. And 576 over 256 is two and a quarter. So this is the cache of grouped-query attention with just two and a quarter groups, whatever the number of heads. | F14, F15, C |
| n26 | 5:14.8 | Her worksheet tries it on Llama 3's three shapes, as if every head kept its own keys and values: 32 layers and 32 heads, 80 and 64, 126 and 128. | F17, L04 SL 5 (what-if) |
| n27 | 5:29.3 | For the smallest, at two bytes a number: 36 kilobytes per token in her table, instead of 512. Fourteen times smaller. Then 28 times, and more than 56. Even against Llama 3's real eight-group cache, about 3.6 times smaller: eight groups against two and a quarter. | F18 (her KB), F19, F20 (8 / 2.25), C |
| n28 | 5:49.8 | And the quality? In DeepSeek's own tests, at two model sizes, the compressed version kept 4 to 14 percent of the cache, and scored higher on seven of eight benchmark scores. | F22 (soften) |
| n29 | 6:02.8 | Why would a squeeze help? She offers guesses, and calls them guesses. | F24 |
| c11 | 6:07.8 | **her clip** "But if you really want to think about why this is working, I think it's kind of like why sometimes you do dropout." | REC |
| n30 | 6:16.7 | Dropout: switch off random parts of a network while it trains, and it often does better. A squeeze can be a trim that keeps the hedge healthy. | F25, F24 |
| c13 | 6:27.1 | **her clip** "If it's working, it means that there is some redundancy in it. So you can do compression." | REC |
| n31 | 6:33.0 | Plain attention may pack the same shirt many times over. And keeping position apart may stop it muddling the content. | F24 |
| c14 | 6:41.4 | **her clip** "But to me, I feel like a lot of this explanation is still like we want to explain how it works. No matter what kind of results we can get, we always can find a reason for it." | REC |
| n32 | 6:52.4 | These are the authors' own runs, and their next report calls the quality comparable to plain attention. Their next model, V3, kept the design. | F22, F30 |
| n33 | 7:03.5 | One last catch. Inside attention, the glasses read every pouch whole: 512 numbers wide, where one head would read 128. Several times more arithmetic for every remembered token. | F26 (inside attention) |
| c6 | 7:18.1 | **her clip** "But the good news is for the serving process, the memory overhead is a huge part." | REC |
| n34 | 7:25.2 | Generating word by word, memory is the bottleneck: a good trade. But reading a whole prompt, the folded form takes about three times the arithmetic. So engines like vLLM switch: unpack for the prompt, fold for generating. Either way, the cache itself stays packed. | F27, F28 (soften; the cache stays latent), F29 |
| n35 | 7:44.8 | So: pack each token into one learned pouch, and read it through glasses instead of unpacking it. Keep position on its own small tag: a cache the size of just two and a quarter groups. | F3, F8, F12, F15 |
| n36 | 7:57.2 | Next time: the residual highway. | F31 |

## Her clips (audio cut from git-ignored course/L03.mp4 and L04.mp4 into ~/picasso-work/clips/l03-03)

| Id | Recording | Length | Check | Text |
| --- | --- | --- | --- | --- |
| C4 | L03 31:14.2-31:22.5 | 8.3 s | near | "It seems that pretty straightforward. Like, what are the tricks here? Why others cannot really think about it?" |
| C5 | L03 33:40.4-33:46.1 | 5.7 s | exact | "this is a loop invariant component. You can abstract it outside of the loop." |
| C7 | L03 35:30.8-35:39.1 | 8.4 s | exact | "Does that solve all the problems? No. Actually, there's a killer. The killer is the positional encoding." (was: "Does that solve all the problems? No. Actually, like there's a killer, okay? The killer is the positional encoding.") |
| C11 | L04 6:19.0-6:26.7 | 7.7 s | exact | "But if you really want to think about why this is working, I think it's kind of like why sometimes you do dropout." |
| C13 | L04 7:00.2-7:04.9 | 4.7 s | exact | "If it's working, it means that there is some redundancy in it. So you can do compression." (was: "If it's working, it means that there's some redundancy in it. So you can do compression.") |
| C14 | L04 7:29.1-7:38.9 | 9.8 s | exact | "But to me, I feel like a lot of this explanation is still like we want to explain how it works. No matter what kind of results we can get, we always can find a reason for it." |
| C6 | L03 34:31.9-34:37.8 | 5.8 s | near | "But the good news is for the serving process, the memory overhead is a huge part." |

## Facts
Every number and claim: `FACTS.md` (32 rows; sizes computed in its section C). The worksheet is a what-if on
Llama 3's shapes against plain multi-head attention; against real Llama 3 (8 KV heads) the saving is 3.6x (F20).
Quality: DeepSeek's own single runs (F22); no perplexity is claimed (D2).

## Drawings
- Pre-drawn (library, 2026-10-14): `line_mla_vacuum_pack`, `line_mla_slim_shelf`, `line_mla_unpack_mess`,
  `line_mla_optician_glasses`, `line_mla_reading_pouches`, `line_mla_turned_pouches`, `line_mla_luggage_tag`,
  `line_mla_hedge_trim`, `line_mla_same_shirts` (`line_mla_one_sock` dropped in v2: review S5).
- Made tonight: `line_cover_l03_03` (cover, takeaway).
- Reused: `line_kv_cloakroom_wall`, `line_kv_group_racks` (L03-02), `line_mic`.
- Her slides, taped as strips cut to the sentence the voice uses (each strip its own padded PNG in the git-ignored
  `slides/`, made by build_ep.py): L03 15 (the bullet, three strips; the paper figure left out), 17 (her equations
  for c-KV, k and v; then her red associativity derivation), 18 (her "Why not compatible?" derivation), 19 (k^R =
  RoPE(W^KR h_t) with the d_c / 2 slip struck in red, D1; then "Why shared k^R?"), 20 (the "In DeepSeek-V2" text;
  the paper table left out); L04 5 (her worksheet as printed, KB = 1,024 bytes, D3, cut to four columns: layers,
  per-token MHA, per-token MLA, savings; said on screen); L04 3 ("My Guess" and its three guesses, one strip each;
  the paper table and the perplexity line left out, D2). Never L04 6.

## Sound
CC0 paper and tape sounds by rule (`timeline.json`), music "Investigations" by Kevin MacLeod (incompetech.com,
CC BY 4.0) looped and ducked under the voice, -14 LUFS.
