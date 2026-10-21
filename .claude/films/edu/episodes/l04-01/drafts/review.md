# L04-01 review ("584 Years on One GPU")

## Must fix
1. Slowdown math is wrong. MFU 40% means 2.5x slower, not 2x. 13 x 2.5 x 2 = 65 days, not 54. Fix vo_lines.json n19: "About two and a half times slower." Fix n23: rewrite the 54-day tie-in (e.g. "About 13 days, times two and a half, times two. About 65 days. Her slide rounds its factor to four and gets 54."). Same change in strings.json en.m2 ("≈ 40%: about 2.5× slower"), en.tot ("13 days × 2 × 2 ≈ 54 days" -> "× 2.5 × 2 ≈ 65"), en.cap.n19, and the post x_post.md thread 4/ ("13 × 2 × 2: close to 54" -> "13 × 2.5 × 2 ≈ 65, her slide says 54"). Re-check the on-screen slide tie in panel p12 and p13.
2. Her slide crop shows "13.5" on screen: the taped slide 13 in panel p10 (and the frame at 192s) shows "13.5 days" struck and "13.5 * 4 = 54 days". FACTS G bans "13.5". Crop or retouch the taped slide so "13.5" is not legible.
3. Scenario framed as real: vo_lines.json n0, strings.json en.cap.n0, and x_post.md line 1 say "Train a 405-billion-parameter model in four months." FACTS F1 safe wording: "Your manager wants... (a classroom scenario, not a claim about any real request)". Change to "End of 2023. In her scenario, your manager wants a 405-billion-parameter model in four months."
4. Untraced claim: vo_lines.json n1 "This is how Prof. Ding opens the training part of her course" (and cap n1). No FACTS row says this; F1 says only slide 10, her teaching scenario. Change to "This is one scenario Prof. Ding gives in her course, CSE 291P:".
5. Quote not confirmed: clips.json C1 / caption c1 "Usually like getting the resources..." Both recognizers (check.json) drop "like", verdict near. Listen to 740.50-745.65 in L04. If "like" is not said, delete it in clips.json C1, strings.json en.cap.c1 and check.json. The quote must match the audio exactly.
6. Caption rows over the 2-row limit (strings.json en.cap; rows split on "|"): n1 (3), n2 (4), n4 (4), n5 (3), n6 (4), n7 (3), n10 (3), n11 (4), n13 (4), n16 (3), n19 (4), n21 (7), n22 (4), n25 (3), c11 (5). Split each into two-row captions across two beats (new panel or shorter text). For n21 (7 rows, panel p12), cut the sentence into two panels. c11 is her quote: split into two caption panels, text unchanged.
7. Mic tag over a slide: panel p7 (her slide 12, frame at 150s, guides frame 04560) has the "Prof. Ding · lecture 4" tag over the taped slide's "1,979 TFLOPS" line. Move the tag below the slide or off the slide's text.
8. Caption over drawing: panel p3 (n4, frame 52s) and p4 (n5, frame 62s): the caption box sits over the chair and cup of the drawing. Move the box to the clear band, or shift the drawing up.

## Should fix
1. vo_lines.json n16 and strings.json en.d13: add "at full FP8 speed" or "at 100% of peak" so the 13 days is not read as a real-world figure.
2. vo_lines.json n0b and x_post.md line 1: the 584 years is at 100% of FP8 peak on one GPU. Add "at full speed" (the n13 line is the only place that says it).
3. Define terms at first use: "parameter" (first used at n0; say "the numbers a model learns"); "gradient" (n9; "how much each number should change"); "FP8" (n13; "an 8-bit number format"); "sparsity" (n13; "skipping the zeros"). "16-bit" (n22) is fine after n13.
4. strings.json en.cap.n20 "Her list." and n17/n18 "her slide" point at things not on screen. Consider "From her list." and show the list or drop the phrase.
5. Taped slides 11 and 12 (p5, p7): the small print is unreadable at phone size. Keep them as texture, but the claim-carrying text must be the handwritten lines (it is), and say so in the review notes.
6. Partial frames: 22s ("in 4", "months?" not yet drawn), 62s ("Ch"), 166s ("start in t"), 272s ("After Prof. Yu"). These look like draw-in mid-frames, not errors, but confirm the last frame of each beat shows the complete text.
7. The 1440s line (n15): fine if the year is 2024; the post is dated 2026. Say "A GPU that started in the 1440s would just about be finishing" only with the year fixed, or drop it.
8. Chinchilla and Llama 3 are the course's own subjects (paper and model names), not AI assistants. Keep them. No China, politics or assistant names found in vo_lines.json, strings.json or the post.

## Checked and fine
- 3.645e25, 3.8e25 (15.6T), 1.84e10 s, 584 years, 1440s, 13.3 days at 16,000, 37 tokens/parameter, 38-43% MFU, 466 / 419 / 78%: all match FACTS and recompute.
- Quotes c4, c6, c10, c11 match clips.json and check.json (exact, or near-exact with only a dropped comma).
- Hook 584 years is paid off at n14, n16 and n24.
- Cover (frame 0) is finished: title, subtitle, drawing, no emoji.
- No emoji, no country names, no AI assistant or model-company names in the files reviewed.
