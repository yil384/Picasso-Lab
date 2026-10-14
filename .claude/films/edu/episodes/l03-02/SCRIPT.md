# L03-02 "The KV Cache and Its Diet"

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 3 "Transformer Model Architecture
Variants (2)", slides 11-14 (recording 19:03-26:21). Daily episode 10, made unattended on 2026-10-14 for the morning
of 2026-10-15. Film data: `episode.json`, `strings.json`, `timeline.json` (kit-lesson); facts: `FACTS.md`.

One script by the producer (no A/B drafts or judge tonight: the usage quota was hit at the start of the run), built
on the pre-drawn cloakroom picture (`art.pre.json`) with the slide-12 calculation as its spine, then an independent
review (`drafts/review.md`: 6 must-fix, all fixed; 16 should-fix: 13 fixed, 3 in part). Every line traces to a FACTS
row; all sizes in decimal units.

Runtime 6:18.9 (757 narration words, 7 clips of her voice, 14 panels + the logo card). Narration: a synthetic voice.

## Beats

| Panel | Arrives | What is on screen | Voice |
| --- | --- | --- | --- |
| P0 | 0:00.0 | cover: a million-token prompt (the note card) -> about 8 TB to remember (the lorries), textbook attention on 405B (F18, hypothetical MHA) | n0, n1 |
| P1 | 0:25.9 | callback to L03-01: query = question card, key = name tag, value = parcel (F1) | n2, n3 |
| P2 | 0:47.7 | without a cache every earlier token remakes its key and value at every step (F2); her clip C1 | n4, c1, n5 |
| P3 | 1:12.2 | her slide 11, title + bullet only (the figure is not hers: cropped out), below the mic tag, fading at n7; the cloakroom drawn from the start: K and V kept, the newcomer brings only Q (F3, F4); her clip C2 | n6, c2, n7, n8, n9 |
| P4 | 1:53.0 | the cache grows by one tag + parcel per token and is read again for every new token; the moving is the slow part (F5) | n10, n11 |
| P5 | 2:11.8 | the per-token formula letter by letter (F6): 2 = key + value (C4, F7), layers = floors of a stack (F8, F36), KV heads = a rack per head (F35), head size, 2 bytes | n12, c4, n13 |
| P6 | 2:52.5 | her slide 12 below the mic tag: 8B row worked (F12, F13), batch 1 (C6, F20), 405B row (F16, F18), the 1M column struck (zoomed) and re-lettered in decimal (D1) | n14, n15, c6, n16, n17 |
| P7 | 3:55.6 | the cloakroom flooded; the 405B (Llama 3.1) stops at 128K, the million is hypothetical (F21); so is plain MHA: her clip C7 (F22) | n18, c7 |
| P8 | 4:14.6 | the formula again, KV heads underlined; plain multi-head attention: a private rack per head (F9) | n19 |
| P9 | 4:30.5 | multi-query: every head shares one rack (F23); 32-128x smaller (F24); her clip C12; the price: quality can drop (F25) | n20, c12, n21 |
| P10 | 4:55.6 | grouped-query: groups of heads share a rack (F26); quality near MHA, speed near MQA (F28) | n22, n23 |
| P11 | 5:13.7 | her slide 14 cropped to the Llama rows (D4), zoomed while 4x / 8x / 16x are ringed (F27); the 405B million-token cache from 8.3 TB to 516 GB (F29) | n24, n25 |
| P12 | 5:36.7 | her slide 13, text only (the figure is from the GQA paper: cropped out): mainly an inference saving (F31); her clip C13; the trolley again | n26, c13, n27 |
| P13 | 5:57.3 | takeaways (F3, F6, F27) over the shared racks; next: compress instead of share (F33) | n28, n29 |
| end | 6:14.9 | the logo card (kit), credits from strings.json | - |

## Narration and clips (in order, fitted start times)

| Id | Start | Line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.4 | A million-token prompt: about eight terabytes of memory, just to remember it. | F18, F12 (hypothetical MHA) |
| n1 | 0:06.4 | That is with the textbook kind of attention, on Llama 3's biggest size, 405 billion parameters: about ten times the model's own weights. So where does that memory go, and how do real models put it on a diet? From Prof. Yufei Ding's CSE 291P, lecture 3. | F11, F19, G |
| n2 | 0:26.5 | Quick callback to the last episode. Every token at the attention party carries three things: a question card, its query; a name tag, its key; and a parcel, its value. | F1 (L03-01 analogy) |
| n3 | 0:38.7 | To pick the next word, the newest token holds up its question, checks it against every name tag, and takes a share of every parcel. | F1 |
| n4 | 0:48.3 | And a model writes one token at a time. Done the naive way, every time a new token arrives, every earlier token cuts its name tag and wraps its parcel all over again. | F1, F2 |
| c1 | 1:00.7 | **her clip** "So we have to do it again and again." | REC |
| n5 | 1:03.7 | But an old token's tag and parcel never change. Same words, same layer, same numbers. Making them again is pure waste. | F2 |
| n6 | 1:13.1 | Her slide says the fix in one line: keep the old keys and values, and only compute attention for the new token. | F3, SL 11 |
| c2 | 1:21.4 | **her clip** "so that you do not need to do the computation again, because they have computed already." | REC |
| n7 | 1:26.9 | That is the KV cache. K for keys, V for values. Picture a cloakroom: every guest who came before left a name tag and a parcel on the wall. | F3 |
| n8 | 1:37.6 | The newcomer brings only a question card, reads the wall, and leaves its own tag and parcel for whoever comes next. | F3 |
| n9 | 1:46.2 | Why is there no Q cache? Old questions are never asked again. Only the newest token asks. | F4 |
| n10 | 1:53.6 | The catch: the wall only grows. One more tag and parcel per token, and for every new token, the whole wall is hauled out of memory and read again. | F5 |
| n11 | 2:04.1 | Noam Shazeer wrote in 2019 that this hauling, more than the arithmetic, is what makes generating slow. | F5 (SHA19) |
| n12 | 2:12.4 | So how big does the wall get? Her slide gives the size for one token, as a product. It starts with a two. | F6 |
| c4 | 2:20.3 | **her clip** "we want to have one copy for key and one copy for value. So that's why we have the first two." | REC |
| n13 | 2:27.0 | Then the number of layers. A model is a stack of layers, each running attention again, so every layer, every floor of the building, keeps its own cloakroom. Then the KV heads. Remember heads from last time: attention runs several copies side by side, and in plain attention each head keeps its own rack of tags and parcels. Then the head size: how many numbers sit on each tag. And 2 bytes per number, at 16-bit precision. | F6, F8, F35, F36 |
| n14 | 2:53.4 | Try Llama 3's 8-billion model, as if it used plain multi-head attention: 2, times 32 layers, times 32 heads, times 128, times 2 bytes. | F9, F12, F6 |
| n15 | 3:06.2 | That is 524,288 bytes. About half a megabyte, for every single token. A 4,096-token prompt: about 2 gigabytes. | F12, F13, C |
| c6 | 3:18.8 | **her clip** "And the result we want to show here is just thinking like you are serving just one user at one time." | REC |
| n16 | 3:25.8 | Now the 405-billion model: 126 layers and 128 heads. About 8.3 megabytes per token. A million tokens: about 8.3 terabytes. | F11, F16, F18, C |
| n17 | 3:39.8 | One note on the slide: its last column mixes units counted in 1,024s with units counted in 1,000s. In plain decimal units it reads 524 gigabytes, 2.6 terabytes and 8.3 terabytes. | D1, F14, F15, F18 |
| n18 | 3:56.2 | That 405B model, released as Llama 3.1, stops at 128K tokens: the million is a thought experiment. So is the plain attention: Llama 3 itself does not use it. | F21, F22 |
| c7 | 4:10.9 | **her clip** "They are not using it today because it's too costly." | REC |
| n19 | 4:15.2 | So the fix starts from the formula. Layers and head size come with the model's design. The KV heads are the factor to change. In plain multi-head attention, every head gets a private rack: 32 heads, 32 racks. | F6, F9, F35 |
| n20 | 4:31.1 | Shazeer's idea was multi-query attention. Every head keeps its own question, but they all share one rack: one KV head. The cache shrinks 32 times on the 8-billion model, and 128 times on the 405-billion. | F23, F24 |
| c12 | 4:48.2 | **her clip** "But the result shows it's not very good" | REC |
| n21 | 4:52.1 | Sharing has a price: quality can drop. | F25 |
| n22 | 4:56.2 | In 2023, Joshua Ainslie and colleagues split the difference with grouped-query attention. Heads form groups, and each group shares one rack. | F26 |
| n23 | 5:06.8 | In their paper, quality stayed close to full multi-head attention, with speed close to multi-query. | F28 |
| n24 | 5:14.6 | Llama 3 keeps 8 KV heads in every size. 32 heads over 8 racks: 4 times smaller. 64 over 8: 8 times. 128 over 8: 16 times. | F27, C |
| n25 | 5:28.6 | Back to our giant and its million tokens: from 8.3 terabytes down to about 516 gigabytes. | F29, F18 |
| n26 | 5:37.6 | And one thing her slide stresses: grouping is mainly an inference saving. For the arithmetic, and for training, it changes little. | F31 |
| c13 | 5:46.7 | **her clip** "Not a huge saving. But on the memory side, it's a huge saving" | REC |
| n27 | 5:52.7 | And memory is the hauling that every new token waits for. | F5, F31 |
| n28 | 5:57.9 | So: keep the keys and values, never the questions. Size per token: two, times layers, times KV heads, times head size, times bytes. To shrink it, let heads share. | F3, F4, F6, F26 |
| n29 | 6:10.2 | Next time: instead of sharing the parcels, what if we zip them? | F33 |

## Her clips (L03 recording; audio cut from git-ignored course/L03.mp4 into ~/picasso-work/clips/l03-02)

| Id | Recording | Length | Check | Text |
| --- | --- | --- | --- | --- |
| C1 | 19:44.3-19:46.2 | 1.8 s | exact | "So we have to do it again and again." (was: "So you have to do it again and again.") |
| C2 | 19:54.7-19:58.6 | 3.9 s | exact | "so that you do not need to do the computation again, because they have computed already." (was: "so that you do not need to do the computation again, because you have computed already.") |
| C4 | 20:60.0-21:05.4 | 5.5 s | exact | "we want to have one copy for key and one copy for value. So that's why we have the first two." |
| C6 | 22:13.6-22:19.3 | 5.7 s | exact | "And the result we want to show here is just thinking like you are serving just one user at one time." |
| C7 | 22:39.7-22:42.3 | 2.6 s | exact | "They are not using it today because it's too costly." |
| C12 | 24:23.3-24:26.0 | 2.7 s | exact | "But the result shows it's not very good" |
| C13 | 25:21.2-25:26.0 | 4.8 s | exact | "Not a huge saving. But on the memory side, it's a huge saving" |

## Facts
Every number and claim: `FACTS.md` (36 rows; sizes computed in its section C, decimal units).
The million-token cases are hypothetical (plain multi-head attention on Llama 3 shapes, batch size 1, 16-bit).

## Drawings
- Pre-drawn (library, made 2026-10-14 from `art.pre.json`): `line_kv_lorry_convoy` (cover), `line_kv_remake_tags`,
  `line_kv_cloakroom_wall`, `line_kv_trolley_reload`, `line_kv_cloakroom_tower`, `line_kv_parcel_flood`,
  `line_kv_private_racks`, `line_kv_one_rack_crowd`, `line_kv_group_racks`.
- Reused: `line_word_three_things` (query / key / value from L03-01), `line_mic`.
- Her slides taped: 11 (title + bullet only; the step figure is not hers and is cropped out), 12 (formula + table;
  the red pen strikes the 1M column and re-letters it in decimal units, D1), 14 (header + the three Llama rows only, D4),
  13 (the MQA/GQA text only; the heads figure is from the GQA paper and is cropped out).

## Sound
CC0 paper and tape sounds by rule (`timeline.json`), music "Investigations" by Kevin MacLeod (incompetech.com,
CC BY 4.0) looped and ducked under the voice, -14 LUFS.
