# L03-03 review (independent)

**Verdict:** the spine works and the math holds. Checked against V2 (eqs. 9-17, sec. 2.1.3, Table 1, App. C, Table 9) and section C: W-UK absorbed into the query side and W-UV into W^O; the loop invariant; RoPE's per-token turn between the query and W-UK; the shared 64-number key with a turned query piece per head; 576 = 512 + 64; 2.25 groups; 14.2x / 28.4x / 56.9x; 3.56x against real GQA; 7 of 8 scores (the one lower score is in the small model).

All seven captions match clips.json; C4 and C6 are "near", the rest "exact". None of the banned topics or names, no mascot, no drawing of a real person. 7:53 is inside 7 ± 1 min.

Not ready: one sentence's numbers contradict each other; "it does not share" is followed by "shared by every head"; the slides and grey footnotes can't be read on a phone; the worksheet's key column sits under the button rail; there is no watercolour after 1:24.

## Must fix

**M1 - n9 (1:25.0), n24 (4:31.8); `p4h`, `pall`.**
- Problem: "512 numbers: four heads' worth, against 32,768 for the keys and values of all 128 heads". 32,768 / 128 = 256 per head, so four heads' worth would be 1,024. The screen repeats this, and n25 then makes a group 256.
- n9: "How flat? In DeepSeek-V2 the pouch holds 512 numbers, as long as four keys of 128, against 32,768 for the keys and values of all 128 heads."
- n24: "576 numbers, as long as four and a half keys."
- `p4h`: "= four keys of 128". `pall`: "keys + values of all 128 heads: 32,768". Update F5 and F14 to match.

**M2 - n5 (0:46.0) against n8 (1:18.3); `sh`; post 1/.**
- Problem: "It does not share", then 30 s later "shared ... by every head". Nothing says that only the stored pouch is common, while each head still gets its own key.
- n5: "It does not make heads share one key. It compresses."
- n8: "One pouch per token per layer, for the key and the value, and every head unpacks its own key and value from it." (F4)
- `sh`: "one pouch: every head unpacks its own key + value".
- Post 1/: "...does not make heads share one key and value. It compresses: each token is squeezed by a learned matrix into one short latent vector, 512 numbers, from which every head rebuilds its own key and value."

**M3 - Text too small for a phone.**
- Problem: body text (cap height at 1080 px) is about 16 px on slide 15, about 15 px on the slide 17 Q1 and slide 19 strips, and about 20 px on the slide 17 derivation (w 560, top right) and L04-3. The grey sans notes `pj`, `wo`, `kib` and `pre2` are 24-26 px at alpha 0.8, and `wo` and `pre2` carry content (W-UV absorption; the 3x figure). L01's slides fill the width.
- Fix: crop each strip to the one sentence the voice uses, at about 2x (text ≥ 30 px): s15 the bullet, s17 Q1, s19 the first sentence, L04-3 at w 1040. Give the slide 17 derivation its own beat at w 900 at n14. Re-letter `wo` and `pre2` as hand labels at px ≥ 40, and `pj` and `kib` at px ≥ 34.

**M4 - P10, 5:16.8 (n27).**
- Problem: the ringed savings column (~14x / ~28x / ~56x) sits at x ~930-1050, y ~660-830, under the button rail. The rings overlap and cut through "(≈93%)" and "(≈96%)". The table text is about 17 px, and a bullet is cut to "copie". This is L03-02's M3 again.
- Fix: crop to the three rows plus the MHA, MLA and savings columns; punch in about 1.6x so the column ends at x ≤ 840; give each ring 10 px clearance; end the bullets at "copies." or drop them.

**M5 - No washes on P3-P14 (1:24-7:49).**
- Problem: only the mic tags carry colour. 12 of 15 panels are bare ink and red, and the takeaway reuses the cover drawing without its washes.
- Fix: one cobalt wash per panel on what is being explained: P3 the slim shelf, P5 the lenses, P6 the row of pouches, P7 the turntables, P8 the pouch (with a yellow tag), P9 two racks plus a quarter, P10 the 8B row, P11 the trimmed half of the hedge, P12 the duplicate shirt, P13 the reading drawing (S5). P14 gets the cover's three washes back.

## Should fix

**S1 - n0, `hA`, post main.** "A few percent" is paid off as "4 to 14 percent", and 14% isn't a few. In Table 9 the large model kept 4.0% and scored higher on all four. Use "to as little as 4 percent"; on `hA`, "memory of past words: down to 4%".

**S2 - n27 against `g8` and post 4/.** The voice says "three and a half", the screen and post say 3.6x. Use one number and show where it comes from (F20):
- n27: "...about 3.6 times smaller: eight groups against two and a quarter."
- `g8`: "vs Llama 3's real 8 groups: 8 ÷ 2.25 ≈ 3.6× smaller".

**S3 - n20 (3:39.3), F11.** "Now every pouch is turned" is a subtle error. In V2 sec. 2.1.3 and her slide 18, RoPE turns the key *after* W-UK unpacks it; a turned pouch would still let the glasses fit. Use: "Now every key is turned by its own angle, after it comes out of its pouch." Update F11.

**S4 - Absolutes that P13 contradicts.** P13 says "unpack for the prompt" (7:20).
- `nv`: "while generating, no key or value is rebuilt" (was "...ever rebuilt").
- `s2`: "read it through glasses instead of unpacking it" (was "never unpack it").
- `ar`: "several times the arithmetic per remembered token" (F26).

**S5 - P13, the sock (6:52-7:33).**
- Problem: the drawing is a packing machine, but the cost is in reading (512 wide). "Nobody vacuum-packs one sock" also suggests prompts go into the cache unpacked; engines cache the pouch either way and only change how they read it (F3, F28).
- Fix: cut that sentence and `sockL`. End n34 with "Either way, the cache itself stays packed." Use `read` instead of `sock`, with a red bracket: "512 wide" against "one head: 128".

**S6 - n27 by ear.** Two six-digit numbers in one breath. Say "about 37 kilobytes per token, instead of about 524" (C: 36.9 and 524.3 kB); keep the exact bytes on `b8`.

**S7 - Density.**
- n7 brings in four names in 16 s: cut "It is called c-KV." from the voice; the label and her derivation still show it.
- n15: "...folds into the output matrix, the last multiplication, which mixes the heads' results." (V2 eq. 19)
- n10: "Where the picture stops: a vacuum bag gives back exactly what went in. This squeeze is learned, and the model trains with it from the start." (F6)

**S8 - One idea per panel.**
- P11 (5:39): the results play over the gardener before dropout comes up. Put `qT`/`q1`/`q2` over `shelf` and bring the hedge in at n29.
- P12 (6:16): two guesses and the verdict share one suitcase, five labels. Fade `g2`/`g2s`/`g3` at c14, then letter `lo`/`lo2` on their own.
- `drop`: "guess 1: like dropout".

**S9 - P9, ~4:55.** The third ring circles a child's leg (x 0.738 of `groups2`; the rack is at ~0.80), so "2.25" never shows. Ring racks 1-2, then wash a quarter of rack 3 and label it "¼".

**S10 - Red rings through the text.** On slide 17 (2:36) the ring crosses both derivation lines: ring only the underlined bracket. On slide 18 (3:44) it cuts "(W^UK)^T" and "Q]": ring only "R(Pos)^T". Leave 10 px clear.

**S11 - Collisions.**
- P3's slim shelf, the answer to "how flat?", sits at x ~830-1050 under the buttons. Set it to w 860 and shift it 70 px left.
- Captions cover the stools (P5), the table legs and feet (P7), and the clerk's shoes (0:15, P14). Lift those drawings to end at y ≤ 1190.

**S12 - L04-3 strip (6:06).** Descenders of the cropped perplexity line show at the top edge (D2). Crop 12 px lower.

**S13 - Caption breaks.**
- n22: "Each head reads it|with a small turned piece of its question." and "Instead, each token gets|a small separate luggage tag, 64 numbers,"
- n17: "So the glasses are made once|per new token and head, not once per pouch."
- n28: "the compressed version kept|4 to 14 percent of the cache,|and scored higher|on seven of eight benchmark scores."
- n2: "a question card, its query;|a name tag, its key; and a parcel, its value."
- n31: "And keeping position apart|may stop it muddling the content."

**S14 - Post.** 3/: "RoPE (rotary position embedding)". 6/: add "(as of Oct 2026)" (F28). Apply the M1, M2, S1 and S2 wording.
