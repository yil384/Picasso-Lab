# L03-03 "MLA: Zipping the KV Cache" - draft A (story / analogy first)

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 3 "Transformer Model Architecture
Variants (2)", slides 15-20 (recording 26:11-42:47), plus the Lecture 4 recap, slides 3-6 (recording 05:39-10:53).
Daily episode 11, for the morning of 2026-10-16. Facts: `../FACTS.md` (every line below names its rows; F28-F29 as
cleared, "soften", at the final re-read).

Angle: one picture carries the whole idea. Yesterday's cloakroom clerk starts vacuum-packing each guest's tag and
parcel into one flat pouch (the latent c_KV); unpacking every pouch for every new guest would undo the saving
(W^UK, W^UV); an optician grinds the unpacking into the reader's glasses once (absorption, a loop invariant); the
killer is that each pouch is turned by its own position (RoPE), so no single pair of glasses fits; the fix is a small
luggage tag tied to each pouch for the position (the decoupled, shared RoPE key). Then the size (2.25 groups, her
worksheet), the quality result in DeepSeek's own tests with her guesses and her caution, and the one place the trick
does not pay (short prompts: the one-sock drawing).

The map, kept on screen as a small red-pen legend in a corner that grows panel by panel (P2-P8):
pouch = c_KV (one per token per layer, shared by key, value and every head); unpacking = W^UK, W^UV; glasses = W^UK
folded into the query side (W^UV into the output matrix); the turning boards = RoPE's position-dependent rotation; the
luggage tag = the decoupled, shared RoPE key k^R. Where the picture stops is said plainly in n10 (the squeeze is
learned, not an exact zip).

Runtime estimate 7:39.7 at 150 words a minute (about 7:55 at 144): 933 narration words, 7 clips of her voice
(45.5 s, about 10%), 14 panels + the logo card.

## Beats

| Panel | Arrives | What is on screen | Voice |
| --- | --- | --- | --- |
| P0 | 0:00.0 | Frame 0 = the finished cover, `line_cover_l03_03`. Lettering: over the bulky heap at left "memory of past words"; over the crate at right "a few %" (F23); under the raised pouch "in their own tests: scored better, not worse" (F23, F22). Red pen: a question mark beside the raised pouch on "How?". On n1 three small red rings: on the pump, then two lettered teasers at the bottom, "glasses?" and "luggage tag?"; credit line "Prof. Yufei Ding - CSE 291P - L03 + L04". | n0, n1 |
| P1 | 0:21.0 | `line_kv_cloakroom_wall` (the clerk, the wall, a guest with a question card). Lettering as in L03-02: "question card = query", "name tag = key", "parcel = value", "the wall = KV cache" (F1). On "groups of heads" a cut to `line_kv_group_racks`, lettered "GQA: groups of heads share one rack" (F1). On n4 the red pen strikes "share" and writes "pack". | n2, n3, n4 |
| P2 | 0:49.6 | `line_mla_vacuum_pack`. Her slide 15 taped top-left, cropped to the title + the bullet ("Unlike MQA/GQA ... low-rank latent representation"); the paper's figure is cropped out (E). Lettering beside the finished pouch: "pouch = latent vector c_KV"; under the pump "W^DKV (W-down): a projection = multiply by a learned matrix" (F3); the red pen boxes "one per token, per layer" and draws two arrows out of the pouch, "key" and "value", plus a fan of small arrows, "every head" (F4). Legend starts: "pouch = c_KV". | n5, n6, n7, n8 |
| P3 | 1:25.7 | `line_mla_slim_shelf`. Lettering on the huge wall "keys + values of all 128 heads: 32,768 numbers"; on the slim shelf "one pouch: 512 numbers = 4 heads' worth" (F5). On n10 a red-pen margin note: "not an exact zip: a learned squeeze" (F6). On c4 the mic tag (her name, "L03 31:14") under the shelf; nothing else moves. | n9, n10, c4 |
| P4 | 1:55.8 | `line_mla_unpack_mess` (the clerk tearing pouches open, the guest with a question card tapping a foot). Her slide 17 taped at the top, cropped to the first question only ("1. Are we really saving ... on compressed KV?"; the "Answer" line and the figure hidden). Lettering on the springing tags "W^UK: rebuilds the name tag (key)", on the parcels "W^UV: rebuilds the parcel (value)" (F3); red pen under the guest: "x every earlier token, x every new step" (F7). Legend: "unpacking = W^UK, W^UV". | n11, n12 |
| P5 | 2:15.6 | `line_mla_optician_glasses` (the optician fits big round glasses on the guest; a tray of lenses). Her slide 17 slides down: the "Answer" line and the red associativity derivation at its right are now shown (the figure and the blog footer cropped out, E). Lettering: the chain "pouch x W^UK x question" in three boxes; on n14 red-pen brackets jump from "(pouch x W^UK) x question" to "pouch x (W^UK x question)", with "brackets move, order stays" (F8). On n15 an arrow carries the W^UK box into the lenses: "W^UK ground into the glasses"; small note "W^UV: folded into the output matrix" (F8; D5: we say "the question side"). On c5 the mic tag ("L03 33:40"); on n17 the red pen: "made once per new token and head, not once per pouch" (F9). Legend: "glasses = W^UK on the query side". | n13, n14, n15, n16, c5, n17 |
| P6 | 3:11.0 | `line_mla_reading_pouches` (the guest, in glasses, reading a row of sealed pouches). Lettering: "sealed: keys and values never computed out" (F8); a red tick lands on each pouch as the camera pans along the row. | n18 |
| P7 | 3:21.3 | `line_mla_turned_pouches` (five round boards, each pouch turned further, the guest puzzled). c7 opens over the drawing with the mic tag ("L03 35:30"). Lettering under the boards "position 1 ... 5"; title "RoPE: turns each key by an angle set by its position" (F10). Her slide 18 taped at the right, cropped to "Why not compatible?" and its four-line derivation (the figure and the footer cropped out); the red pen rings R(Pos)^T sitting between (W^UK)^T and Q and writes "different for every earlier token" (F11); then a red cross over the glasses: "one pair can't fit all". Legend: "turning boards = RoPE". | c7, n19, n20 |
| P8 | 4:00.9 | `line_mla_luggage_tag` (two hands tie a small tag to a flat pouch). Lettering on the pouch "c_KV: 512, never turned = what"; on the tag "k^R: 64, turned by position = where; made from the token; cached" (F12); a small red fan of arrows from the tag: "one per token, shared by every head" (F12). Her slide 19 taped above, cropped to the top sentence ("MLA solution: Decoupled RoPE ... Separate 'what' ... from 'where' ...") only; its right column (with the d_c / 2 slip, D1) is not shown. On n23 a lettered note: "her slide's reason: position is not head-specific" (F13, credited to her slide). Legend complete: "luggage tag = shared RoPE key". | n21, n22, n23 |
| P9 | 4:35.0 | `line_kv_group_racks` (groups of readers sharing racks), with 2 full racks + a quarter rack ringed in red: "2.25 groups" (F15). Our own table, re-lettered from V2 Table 1 (no Capability column, E): "MHA 2 n_h d_h l / GQA 2 n_g d_h l / MQA 2 d_h l / MLA (d_c + d_h^R) l = 9/2 d_h l"; under it "512 + 64 = 576 = 4.5 heads' worth" (F14). Her slide 20 taped, cropped to the "In DeepSeek-V2: d_c = 4 d_h, d_h^R = d_h / 2 ... 2.25 groups" text only (the paper's table cropped out, E). On n25 the red pen strikes "n_h" in the MHA row and rings its absence in the MLA row: "no heads in the formula" (F16). On n26 her L04 slide 5 (worksheet with answers) is taped over the racks as printed (KB = 1,024 bytes, D3); the red pen underlines the three shape rows (F17), rings "~14x", "~28x", "~56x" (F19), and letters a decimal side note: "8B shape, 16-bit: 36,864 bytes/token vs 524,288 (plain attention, a what-if)" (F18) and "vs Llama 3's real 8-group cache: ~3.5x smaller" (F20). | n24, n25, n26, n27 |
| P10 | 5:21.9 | `line_mla_hedge_trim` (a gardener clipping a wild hedge). Lettering at the top: "DeepSeek's own tests, 2 model sizes: cache kept 4-14%, higher on 7 of 8 scores" (F22). On n29 her L04 slide 3 taped, cropped to "My Guess:" and its three bullets (the paper's table above and the "Experimentally ... PPL" line cropped out, D2, E); during c11 (mic tag "L04 06:19") the red pen ticks bullet 1 "Structural Regularization (like Dropout)". On n30 lettering by the trimmed half: "dropout: switch off random parts while training" (F25). | n28, n29, c11, n30 |
| P11 | 5:59.8 | `line_mla_same_shirts` (a suitcase of identical shirts, one lifted out). Her slide 3 list stays taped at the side; during c13 (mic tag "L04 07:00") the red pen ticks bullet 2 "Information Redundancy"; on n31 it ticks bullet 3 "Interference between positional and content encoding" (F24). During c14 (mic tag "L04 07:29") the three ticks turn into question marks. On n32 lettering: "her guesses / the authors' own runs / V3 report: same design, 'comparable'" (F22, F24, F30). | c13, n31, c14, n32 |
| P12 | 6:35.2 | `line_mla_one_sock` (a traveller vacuum-packing one sock with an enormous machine, next to a tiny open bag). Lettering on the machine "inside attention: reads 512 wide, not 128" (F26); on c6 the mic tag ("L03 34:32"). On n34 a red-pen split card: "generating word by word: folded (memory-bound, worth it)" / "reading a whole prompt: folded = about 3x the arithmetic" (F27, F28). On n34b the card resolves to "reading a prompt: unpack / generating: folded - engines like vLLM" (F28); on "short prompts" the red pen rings the sock ("short prompt") and the open bag (F29). Nothing from L04 slide 6 is shown (D4). | n33, c6, n34, n34b |
| P13 | 7:19.4 | The cover again (`line_cover_l03_03`), quieter. The two-line takeaway lettered over it (F3, F8, F12, F15): "Pack each token into one learned pouch; read it through glasses, never unpack it." / "Keep position on its own small tag: the cache of 2.25 groups." Then "Next time: the residual highway." (F31). | n35, n36 |
| end | 7:35.7 | the logo card (kit), credits from strings.json | - |

## Narration and clips (in order, planned start times at 150 words a minute)

| Id | Start | Line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.0 | DeepSeek cut the memory a model keeps of past words to a few percent. And in their own tests, it scored better, not worse. How? | F23 (soften: "in their own tests"), F22 |
| n1 | 0:10.3 | With a vacuum pump, a pair of glasses and a luggage tag. From Prof. Yufei Ding's CSE 291P, lectures 3 and 4. | (framing: the three props of the picture) |
| n2 | 0:21.0 | Quick callback. At the attention party, every token carries a question card, its query; a name tag, its key; and a parcel, its value. | F1 (the L03-01 / L03-02 analogy) |
| n3 | 0:30.9 | The KV cache is the cloakroom: a wall of tags and parcels for every earlier guest. Last time, groups of heads, the parallel copies of attention, learned to share one rack. | F1 |
| n4 | 0:43.7 | This time the clerk does not share. The clerk packs. | F2 |
| n5 | 0:49.6 | This is multi-head latent attention, from DeepSeek's V2 paper. | F2, SL 15 |
| n6 | 0:53.5 | The clerk puts a guest's tag and parcel into one clear bag, and pumps the air out. One flat pouch. | F2, F4 (the picture) |
| n7 | 1:01.9 | In the model, the pouch is a latent vector: a short hidden summary, learned in training. A learned matrix, W-down, squeezes the token into it: c-KV. Multiplying by a learned matrix like that is called a projection. | F2, F3 |
| n8 | 1:17.0 | One pouch per token per layer, shared by the key and the value, and by every head. | F4 |
| n9 | 1:25.7 | How flat? In DeepSeek-V2 the pouch holds 512 numbers: four heads' worth, against 32,768 for the keys and values of all 128 heads. | F5 |
| n10 | 1:35.2 | Where the picture stops: a real pouch gives back exactly what went in. This squeeze is learned, and the model trains with it from the start. | F6 (where the analogy stops; G "zip") |
| c4 | 1:46.0 | **her clip** "It seems that pretty straightforward. Like, what are the tricks here? Why others cannot really think about it?" | REC L03 31:14 |
| n11 | 1:55.8 | First catch: to read a pouch, the clerk would unpack it. Two more learned matrices, W-UK and W-UV, rebuild the name tag and the parcel. | F3, F7 |
| n12 | 2:06.1 | And that for every earlier guest, at every new step: the very work the cache was meant to save. | F7 |
| n13 | 2:15.6 | The way out is an optician. Checking one tag is a chain of three factors: the pouch, the unpacking matrix W-UK, and the question. | F8, SL 17 |
| n14 | 2:25.5 | Matrix products can be regrouped: A times B, then times C, equals A times B-times-C. The brackets move; the order stays. Her slide calls it the associative property. | F8, SL 17 |
| n15 | 2:37.1 | So W-UK can be multiplied into the question side first: the optician grinds the unpacking into the guest's glasses. The parcel's unpacking, W-UV, folds into the layer's output matrix the same way. | F8 (D5: "the question side") |
| n16 | 2:50.2 | The glasses are the same for every pouch on the table. | F9 |
| c5 | 2:55.0 | **her clip** "this is a loop invariant component. You can abstract it outside of the loop." | REC L03 33:40 |
| n17 | 3:00.8 | The loop runs over the earlier tokens: the glasses are made once per new token and head, not once per pouch. | F9 |
| n18 | 3:11.0 | The guest reads the whole row of sealed pouches through them. Nothing is unpacked; keys and values are never computed out. | F8 |
| c7 | 3:21.3 | **her clip** "Does that solve all the problems? No. Actually, there's a killer. The killer is the positional encoding." | REC L03 35:30 |
| n19 | 3:29.5 | A model has to know word order. RoPE, rotary position embedding, is the usual way to mark it: it turns each key by an angle set by its position, like a clock hand. | F10 (G: "turns each key by an angle set by its position") |
| n20 | 3:43.0 | Now every pouch is turned by its own angle, and the turn sits between the glasses and the pouch. Factors may regroup, never swap places. So no single pair of glasses fits them all: every key would be rebuilt again. | F11 (V2: "does not obey a commutative law") |
| n21 | 4:00.9 | The fix: keep position out of the pouch. The pouch is never turned, so the glasses still fit. | F12 |
| n22 | 4:08.4 | Instead, each token gets a small luggage tag, 64 numbers, made from the token itself, turned by its position, and cached beside the pouch. Each head reads it with a small turned piece of its question. | F12 (G: made from the token itself, not the latent) |
| n23 | 4:23.2 | Her slide: separate what from where. And one tag serves every head; her slide's reason: where a word sits is the same for every head. | F12, F13 (soften: credited to her slide), SL 19 |
| n24 | 4:35.0 | Now the size. Per token per layer: the 512-number pouch plus the 64-number tag. 576 numbers, four and a half heads' worth. | F14 (G: two pieces, not one vector) |
| n25 | 4:44.2 | A group keeps a key and a value, two heads' worth. So this equals grouped-query attention with just two and a quarter groups, whatever the number of heads. | F14, F15 |
| n26 | 4:55.7 | Her worksheet tries it on Llama 3's three shapes: 32 layers and 32 heads, 80 and 64, 126 and 128. | F17, L04 SL 5 |
| n27 | 5:04.1 | For the smallest, at two bytes a number, 36,864 bytes per token instead of 524,288. Against plain attention: 14, 28 and more than 56 times smaller. Even against Llama 3's real eight-group cache, about three and a half times smaller. | F18, F19 (never "57"), F20 (G: plain attention is the what-if baseline; real Llama 3 shares 8 KV heads) |
| n28 | 5:21.9 | And the quality? In DeepSeek's own tests, at two model sizes, the compressed version kept 4 to 14 percent of the cache, and scored higher on seven of eight benchmark scores. | F22 (soften: "in their own tests", never "perplexity") |
| n29 | 5:34.7 | Why would a squeeze help? She offers guesses, and calls them guesses. | F24 (as her guesses), L04 SL 3 |
| c11 | 5:39.8 | **her clip** "But if you really want to think about why this is working, I think it's kind of like why sometimes you do dropout." | REC L04 06:19 |
| n30 | 5:47.1 | Dropout: switch off random parts of a network while it trains, and it often does better. A squeeze can be a trim that keeps the hedge healthy. | F25, F24 |
| c13 | 5:59.8 | **her clip** "If it's working, it means that there is some redundancy in it. So you can do compression." | REC L04 07:00 |
| n31 | 6:04.2 | Plain attention may pack the same shirt many times over. And keeping position apart may stop it muddling the content. | F24 (her guesses 2 and 3) |
| c14 | 6:12.5 | **her clip** "But to me, I feel like a lot of this explanation is still like we want to explain how it works. No matter what kind of results we can get, we always can find a reason for it." | REC L04 07:29 |
| n32 | 6:22.5 | So hold it loosely: these are the authors' own runs, and their next report, on V3, keeps the design but calls the quality comparable to plain attention. | F22 (verified: the authors' single runs; V3 sec. 2.1.1 "comparable"), F30, G |
| n33 | 6:35.2 | One last catch. Inside attention, the glasses read each pouch whole, 512 numbers wide where one head reads 128: several times the arithmetic per remembered token. | F26 (G: "inside attention") |
| c6 | 6:45.9 | **her clip** "But the good news is for the serving process, the memory overhead is a huge part." | REC L03 34:32 |
| n34 | 6:51.6 | When memory is the bottleneck, that is a good trade. But when reading a whole prompt at once, the folded form takes about three times the arithmetic. | F27, F28 (soften: "about three times the arithmetic") |
| n34b | 7:02.8 | So engines like vLLM switch: reading a prompt, they unpack the keys and values; generating word by word, they read the pouches folded. For short prompts, engine builders found the folded form costs more than it saves. | F28 (soften: "engines like vLLM", never "all"; prompt reading vs generating, per G), F29 (soften: prefill only; nothing shown) |
| n35 | 7:19.4 | So: pack each token into one learned pouch, and read it through glasses instead of unpacking it. Keep position on its own small tag, and the cache shrinks to two and a quarter groups. | F3, F8, F12, F15 |
| n36 | 7:33.3 | Next time: the residual highway. | F31 |

## Her clips (texts and lengths as checked in the brief; audio cut from git-ignored course/L03.mp4, L04.mp4)

| Id | Recording | Length | Text | Where |
| --- | --- | --- | --- | --- |
| C4 | L03 31:14 | 7.7 s | "It seems that pretty straightforward. Like, what are the tricks here? Why others cannot really think about it?" | P3: after the simple idea, before the first catch |
| C5 | L03 33:40 | 5.2 s | "this is a loop invariant component. You can abstract it outside of the loop." | P5: the glasses (C24 not used) |
| C7 | L03 35:30 | 7.6 s | "Does that solve all the problems? No. Actually, there's a killer. The killer is the positional encoding." | P7 opens on it |
| C11 | L04 06:19 | 6.7 s | "But if you really want to think about why this is working, I think it's kind of like why sometimes you do dropout." | P10: her guess 1 |
| C13 | L04 07:00 | 3.8 s | "If it's working, it means that there is some redundancy in it. So you can do compression." | P11: her guess 2 |
| C14 | L04 07:29 | 9.4 s | "But to me, I feel like a lot of this explanation is still like we want to explain how it works. No matter what kind of results we can get, we always can find a reason for it." | P11: her own caution (the honest limit, with n32) |
| C6 | L03 34:32 | 5.1 s | "But the good news is for the serving process, the memory overhead is a huge part." | P12: the trade |

7 clips, 45.5 s, about 10% of the runtime (cap 25%). Not used: C17, C22, C24, C19. C19 was offered late with the text
"Now it's directly proportional ..."; the checked cut in clips_r3.json starts at "it's directly proportional ...", so
the two texts disagree. If it is wanted, it fits P9 after n25 (it says what the n25 lettering "no heads in the
formula" shows), and one other clip would have to go to stay at 7.

## Drawings

- Made for this episode (library + tonight): `line_cover_l03_03` (P0, P13), `line_mla_vacuum_pack` (P2),
  `line_mla_slim_shelf` (P3), `line_mla_unpack_mess` (P4), `line_mla_optician_glasses` (P5),
  `line_mla_reading_pouches` (P6), `line_mla_turned_pouches` (P7), `line_mla_luggage_tag` (P8),
  `line_mla_hedge_trim` (P10), `line_mla_same_shirts` (P11), `line_mla_one_sock` (P12).
- Reused: `line_kv_cloakroom_wall` (P1), `line_kv_group_racks` (P1, P9).
- Code adds only lettering, red-pen marks (rings, ticks, strikes, brackets, arrows, the split card in P12), the
  growing corner legend, the size table re-lettered from V2 Table 1, and the mic tag.
- Her slides taped: L03 15 (title + bullet), 17 (top text: the question line in P4, then the answer line + red
  derivation in P5), 18 ("Why not compatible?" derivation only), 19 (top sentence only, D1), 20 (the "In
  DeepSeek-V2" text only); L04 5 (worksheet as printed, D3), L04 3 ("My Guess" + three bullets only, D2). Never L04 6
  or any figure or table from the paper (D4, E).

## Counts

- Narration: 933 words in 38 lines (n0-n36 and n34b); her clips: 7, 45.5 s.
- Runtime estimate: narration at 150 wpm + 0.35 s between lines, clips + 0.6 s each, 13 panel changes x 1.5 s, logo
  card 4 s = 7:39.7 (about 7:55 if the voice runs at 144 wpm). Inside 6-8 min; if the voice is slower, cut first the
  second sentence of n34b and the "A squeeze can be a trim ..." sentence of n30.
- F28-F29 were re-read at the end: both now "soften". n34-n34b use their safe wordings ("engines like vLLM",
  prompt reading vs generating, "for short prompts, engine builders found the folded form costs more than it
  saves"), not the earlier fallback line, which FACTS G now lists as a trap.
