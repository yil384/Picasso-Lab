# L01-04 "Temperature and Top-p" - script draft A (story / analogy first)

- Source: CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 1, slides 25-34 (recording
  50:41-68:13). Facts: `../FACTS.md` only, in its Safe EN wording; F-numbers per line. Clips: `../clips.json`, text verbatim.
- Runtime: planned **7:15** (7:10 to the end card) at a cautious 2.5 spoken words/s with 0.55 s gaps inside a panel and
  1.0 s at panel changes. With the +8% voice used for L01-03 it should land near 7:00. Cut order at the bottom.
  1080x1920, 30 fps, English only, the line look (warm paper, ink that draws itself, red pen, washes, taped slides, mic
  tag "Prof. Ding · lecture 1" and red-bordered captions for her clips, a synthetic narrator, logo end card).
- Words: **804 narration words in 55 lines (n0-n54), 111 words per minute** over the whole runtime (the limit is 160).
  Her clips: **7, 38.4 s (8.8 % of the runtime)**. Panels: **17 (P0-P16)** plus the end card.
- **Angle A: one sentence, asked twice.** The spine is the made-up sentence "My dog loves ...", which the student on the
  cover asked twice and got "walks." and "naps.". Every method tonight is a way of finishing that one sentence. Her
  slides come in as proof when the sentence is too small to show something (the trees, the k and p figures, the
  formula, the table). The story is told like a small detective case: greedy and beam search can't have made two
  answers, because neither of them rolls a die. Sampling can, and at the API's default temperature of 1 it does. Then the
  dog's silliest ending, "homework" (1 in 100), runs through as the gag *and* as the explanation. A plain die lets it
  through, top-k doesn't reliably stop it, and top-p cuts it. Turning the dial up makes it 1 in 20, and top-p still cuts
  it. In a story it might be the whole point. The bookend says the two answers were the dial at 1.
- Callback to L01-03 in n4-n6 only (the clerk now has his 200,000 scores; which drawer does he open?). Tokens and the
  dictionary are not re-explained.
- Terms are defined before use: logit (n5), softmax (n7), decoding (n10), greedy (n10), beam search (n15), sampling (n20),
  top-k (n25), top-p (n28), temperature (n33-n34), reasoning paths and self-consistency (n50-n51).
- Honest limits: both are in. F4 (change temperature or top_p, generally not both) comes right after the only moment the
  two knobs are shown together (n42). F8 (80 different answers in 1,000 runs at temperature 0) is n48, with F7 (seed)
  just before it.

## Beats (planned times; the voice decides)
| # | Time | Panel: what is on screen | Voice |
| --- | --- | --- | --- |
| 0 | 0:00-0:28 | **Cover = the puzzle.** Frame 0 is finished: `line_same_question`, the two bubbles lettered "My dog loves / walks." and "My dog loves / naps.", a red "≠" between them, the title "Temperature / and Top-p", the strip "CSE 291P · Lecture 1 · UC San Diego". | n0, n1, n2, n3 |
| 1 | 0:28-0:44 | **The clerk (callback).** `line_clerk_ladder`; red ticks cascade over the drawer wall; card "about 200,000 scores, every step · each one: a logit"; one drawer ringed "which one?". | n4, n5, n6 |
| 2 | 0:44-1:16 | **The dog's odds.** `line_dog_leash` above the `bars` chart at T = 1: walks 45 %, treats 30, naps 12, sticks 8, baths 4, homework 1 ("made-up odds"). "softmax" lettered; homework ringed; "greedy" arrow to walks; "walks. walks. walks." | n7-n11 |
| 3 | 1:16-1:43 | **Her slide 28, greedy tree** (left crop + credit strip). The pen traces The-nice-woman, "0.5 × 0.4 = 0.2", then rings "has 0.9" behind "dog 0.4": "hidden". | n12, **c2**, n13, n14 |
| 4 | 1:43-1:54 | **Two hikers.** `line_two_lanterns`; signpost lettered "keep 2" / "drop the rest"; blue wash along the two lit branches; head "beam search". | n15 |
| 5 | 1:54-2:24 | **Her slide 28, beam tree** (right crop + credit strip). The pen traces The-dog-has, "0.4 × 0.9 = 0.36 > 0.2", "no guarantee"; after C4: "each word: × a number below 1 → longer scores lower". | n16, n17, **c4**, n18 |
| 6 | 2:24-2:55 | **The die.** `line_dice_hand`; the two dice tagged "draw 1" / "draw 2"; the result cards "walks." and "naps." (the cover's bubbles) drop below; "temperature 1 (default): a fresh draw every time". | n19-n22 |
| 7 | 2:55-3:07 | **The silly word.** `line_dog_homework`, pink wash; "about 1 draw in 100:" / "My dog loves homework."; "a silly word gets through". 1.2 s hold. | n23, n24 |
| 8 | 3:07-3:40 | **Her slide 30, top-k** (crop + credit). "k = 6" ringed; red brackets over the six kept bars on both halves; "figure: Hugging Face blog, 2020 · Fan et al. used k = 10"; then "0.68" / "0.99", "k too small here" / "k too big here". | n25, **c5**, n26, n27 |
| 9 | 3:40-4:03 | **Her slide 31, top-p** (crop + credit). Definition underlined; "p=0.92" ringed; "9 words" / "3 words" over the braces; credit fix. | n28, n29, **c8** |
| 10 | 4:03-4:28 | **The dog again, p = 0.9.** `line_dog_leash` + `bars` at T = 1; the red bracket spans walks-sticks "kept: 0.95"; baths and homework fade to pencil; card "0.9: her starting point · the paper: 0.95 · the API's default: 1 (cuts nothing)". | n30, n31, **c10**, n32 |
| 11 | 4:28-4:46 | **Her slide 32, the formula** (bullets + formula; the plot under a blank taped sheet carrying the pen notes "x = a score (logit)", "T = temperature, the dial"). "/T" ringed twice; "Sharper" and "Flatter" underlined. | n33, n34, n35 |
| 12 | 4:46-5:34 | **The dial.** `line_temp_knob` (red needle, ticks lettered 0 · 1 · 2) over the `bars`. Needle 1 → 0.2 (walks 88 %), arrow "→ 0: greedy"; then 1 → 2 during C9 (bars even out). The knob slides out and `line_dog_homework` slides in: "1 in 100 → about 1 in 20". Top-p 0.9 bracket: homework cut, the dog fades to pencil. Card: "the API's reference: change temperature or top_p, generally not both". | n36-n39, **c9**, n40, n41, n42 |
| 13 | 5:34-5:58 | **Who turns it where.** `line_coder_storyteller` on top: "code: 0 to 0.2" over the coder, "stories: 0.8 to 1.2" over the storyteller, "chat: about 0.7" between; one flying page lettered "my dog loves homework". Below it, her slide 34 (first three columns) taped, the title struck, "her rule of thumb". | n43, n44, n45 |
| 14 | 5:58-6:21 | **The other knobs, and the limit.** `line_knob_panel` lettered; "temp" and "top_p" ringed; under "seed": "best effort, not a guarantee"; card: "temperature 0, one prompt, 1,000 runs: 80 different answers (a 2025 test)". | n46, n47, n48 |
| 15 | 6:21-6:52 | **Ask on purpose.** `line_tally_pages`; the pencil fills the five answer boxes 2 · 2 · 3 · 2 · 2; card "2 2 3 2 2 → most paths: 2" with 2 ringed; "self-consistency (Wang et al., 2022)"; "5 paths ≈ 5 answers' worth of tokens". | n49, n50, **c11**, n51, n52 |
| 16 | 6:52-7:10 | **Bookend.** The cover layout again; "draw 1" / "draw 2" under the bubbles; "a glitch?" struck, "the dial, at 1". | n53, n54 |
| - | 7:10-7:15 | Logo end card (line), "Turn the dial on purpose."; small-print credits. | - |

## Narration (synthetic voice; one id per line)
| id | at | Line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.5 | Ask a model to finish one sentence, twice: "My dog loves..." You can get two different answers. | F2 (default temperature 1: every reply a fresh draw), F29 (the sentence and its odds are ours, made up) |
| n1 | 0:07.9 | That is not a glitch. It is a dial. | work-order hook; F3 (temperature controls randomness) |
| n2 | 0:12.6 | Tonight: how a model picks its next word, and the two knobs that steer it, temperature and top-p. | F1 |
| n3 | 0:20.4 | This is Lecture 1 of Professor Yufei Ding's CSE 291P at UC San Diego. | source key L01 |
| n4 | 0:28.0 | Last episode, a clerk on a ladder scored every drawer in the model's dictionary. | callback (L01-03); F9 |
| n5 | 0:34.1 | About 200,000 scores, every single step. Each score is called a logit. | F10, F9 |
| n6 | 0:40.2 | So which drawer does he open? | callback (the brief's line) |
| n7 | 0:43.6 | First, a function called softmax turns the scores into odds that add up to 100 percent. | F11 |
| n8 | 0:51.0 | Here are made-up odds for our dog. Walks, 45 percent. Treats, 30. Naps, 12. Sticks, 8. Baths, 4. | F29 (RUN, T = 1) |
| n9 | 0:58.8 | And homework: 1 percent. | F29 (RUN, T = 1) |
| n10 | 1:01.7 | Picking a word from these odds is called decoding. The simplest way: take the top word, every time. That's greedy. | L01 s27-34 titles ("Different Decoding Strategies"); F12 |
| n11 | 1:10.2 | The dog loves walks, every time. So greedy can't explain our two answers. | F12, F29 (greedy as a rule; F8 comes back to real servers in n48) |
| n12 | 1:16.4 | Her slide 28 runs greedy on a tree of words, starting from The. | L01 s28; F12 |
| c2 | 1:22.2 | her clip C2 (below) | clips.json |
| n13 | 1:27.9 | Nice at 0.5, then woman at 0.4. Together: 0.2. | F12 |
| n14 | 1:34.5 | But follow dog: next comes has, at 0.9. The best word can hide behind a weaker one. | F13 |
| n15 | 1:43.1 | So send two hikers instead of one. At every fork, keep the best two paths so far: beam search, with a beam of two. | F14 (analogy; slide 28 "beam size 2") |
| n16 | 1:53.7 | On her slide it finds the dog has: 0.4 times 0.9 is 0.36, beating 0.2. | F14 |
| n17 | 2:03.8 | Better, but still no guarantee. | F15 |
| c4 | 2:06.4 | her clip C4 | clips.json |
| n18 | 2:14.7 | Every extra word multiplies in another number below one, so longer sentences score lower. Left alone, beam search drifts short. | F16 |
| n19 | 2:23.7 | Greedy and beam both chase the likeliest words. That sounds safe, but the text comes out bland and loops. People don't write that way. | F17 |
| n20 | 2:33.9 | So let chance in. Sampling rolls a weighted die: on our odds, walks comes up 45 times in 100, treats 30. | F18 (its wording, on our odds), F29 |
| n21 | 2:43.2 | That's our puzzle, solved. Left alone, the API's temperature dial sits at 1: every reply is a fresh draw. | F2 |
| n22 | 2:51.4 | Walks one time, naps the next. | F18, F29 |
| n23 | 2:54.8 | And about once in 100 draws, the dog loves homework. | F29 (1 %) |
| n24 | 3:01.0 | Sample from everything, and now and then a silly word gets through. | F19 |
| n25 | 3:06.8 | One fix is top-k: keep only the k likeliest words, then roll. Her slide uses k equals 6. | F20 |
| c5 | 3:14.5 | her clip C5 | clips.json |
| n26 | 3:21.5 | The right k depends on the step. Here, six words cover only 0.68 of the odds. Here, 0.99. | F21, F22 |
| n27 | 3:31.7 | A fixed k is too small when many words are fine, and too big when only a few are. | F22 |
| n28 | 3:40.3 | Top-p lets the group size itself. Line the words up, add their odds until you reach p, keep that group, and draw from it. | F23 |
| n29 | 3:50.4 | With p at 0.92, her slide keeps 9 words in the flat step, and only 3 in the sharp one. | F24 |
| c8 | 4:00.2 | her clip C8 | clips.json; F25 |
| n30 | 4:03.4 | Back to the dog, with p at 0.9. Walks, treats, naps, sticks: together, 95 percent. Baths and homework are out. | F29 (RUN: T = 1, top-p 0.9 keeps four words, 0.950) |
| n31 | 4:12.8 | So which p should you try? | - (sets up C10) |
| c10 | 4:15.7 | her clip C10 | clips.json; F25 |
| n32 | 4:18.9 | That's her starting point. The paper behind top-p used 0.95. The API's default is 1, which cuts nothing. | F25, F2 (top_p default 1); Trap (never "0.9 is the default") |
| n33 | 4:28.3 | The second knob reshapes the odds before anything is cut: temperature. | L01 s32 bullets (temperature: logits to probabilities; top-p: probabilities to selection); F26 |
| n34 | 4:33.2 | Her slide 32 puts it in one line: divide every score by T, then softmax. | F26 |
| n35 | 4:39.8 | Below 1, the favourite pulls ahead. Above 1, the odds even out. | F27 |
| n36 | 4:45.6 | Here's the dial. It goes from 0 to 2, and starts at 1. | F2 |
| n37 | 4:51.3 | Turn it down to 0.2. Walks jumps to 88 percent. | F29 (RUN, T = 0.2) |
| n38 | 4:56.7 | Turn it toward 0, and you are back to greedy. | F28 (0 is a limit: the needle never settles below 0.2) |
| n39 | 5:01.2 | Now turn it up, to 2. | F2 |
| c9 | 5:04.2 | her clip C9 | clips.json; F27 |
| n40 | 5:14.2 | Homework goes from 1 in 100 to about 1 in 20. | F29 (RUN: T = 2, homework 5 %) |
| n41 | 5:19.5 | Add top-p at 0.9, and the cut still stops before homework. | F29 (RUN: T = 2, five words kept, homework cut, 0.953) |
| n42 | 5:25.9 | Her slides pair the two knobs. The API's own reference says: change temperature or top_p, generally not both. | F4 (the honest limit; slides 32 and 34 set both, erratum 6) |
| n43 | 5:34.1 | So where should the dial sit? Her slide 34 gives a rule of thumb. | F30 |
| n44 | 5:40.2 | Code: 0 to 0.2. Chat: about 0.7. Stories: 0.8 to 1.2. | F30 (her rule of thumb, never "recommended") |
| n45 | 5:48.4 | Low for code: you want the same, careful answer. In a story, a dog that loves homework might be the point. | F31; F29 (the gag) |
| n46 | 5:57.8 | The API has other knobs too: max output tokens, two penalties, a seed. | F1 |
| n47 | 6:03.5 | A seed asks for a repeatable draw: best effort, not a guarantee. | F7 |
| n48 | 6:08.9 | And even at temperature 0, one 2025 test got 80 different answers in 1,000 runs. The server's load changes how the math is batched. | F8 (the honest limit) |
| n49 | 6:21.1 | Sometimes you want different answers, on purpose. | F32 (lead-in) |
| n50 | 6:24.4 | Sample several reasoning paths, answers worked out step by step, and they won't all agree. Her toy example: | F32 (her 1 + 1 is a toy, said so) |
| c11 | 6:32.2 | her clip C11 | clips.json |
| n51 | 6:37.9 | So count, and go with the answer most paths reach. That's self-consistency, from Wang and colleagues, 2022. | F32 |
| n52 | 6:46.1 | The catch: 5 paths cost about 5 answers' worth of tokens. | F34 |
| n53 | 6:51.5 | Back to our two answers. Not a glitch: the dial sat at 1, and the model rolled the die twice. | F2, F18 (analogy) |
| n54 | 7:00.0 | Turn it down for careful code, up for stories. And if the dog ever loves homework, now you know why. | F30, F29 |

## Her clips (text exactly as clips.json; 7 clips, 38.4 s)
| Clip | Recording | Text (captions show exactly this) | Where | Set up / paid off |
| --- | --- | --- | --- | --- |
| c2 = C2 (5.18 s) | L01 55:22.4-55:27.6 | "For example, this one we will choose nice, and then we will choose woman, like the nice woman." | P3, after n12 | n12 sets the tree; she walks the greedy path; n13 adds the numbers (0.2), n14 shows what greedy missed. Open item: listen to C2 first (normalised "we will"). |
| c4 = C4 (7.82 s) | L01 56:51.6-56:59.4 | "But later on, beam search has an issue. The issue is, usually beam search people find that they are preferring short sentence." | P5, after n17 | n17 "Better, but still no guarantee." leads into her "But later on"; n18 explains why (numbers below one). |
| c5 = C5 (6.46 s) | L01 59:03.0-59:09.5 | "And we use that K to limit our search space. Can you guess what's the problem with it?" | P8, after n25 | Her question to the class becomes a question to the viewer; n26-n27 answer it on her own figure. Open item: listen first ("okay" dropped). |
| c8 = C8 (2.24 s) | L01 61:45.6-61:47.8 | "It works, and it's very simple." | P9, after n29 | Her verdict on top-p, right after the 9-word / 3-word demonstration; n30 then tries it on the dog. |
| c10 = C10 (2.61 s) | L01 66:21.3-66:23.9 | "You should always try 0.9 at the beginning." | P10, after n31 | n31 asks; she answers; n32 places her 0.9 next to the paper's 0.95 and the API's default of 1 (Trap). |
| c9 = C9 (8.86 s) | L01 63:20.2-63:29.0 | "But after you divide it by the temperature, they are kind of similar. So that's why when you have high temperature, you will see like it's pretty flat." | P12, after n39, while the needle turns 1 → 2 and the bars even out | Her "pretty flat" lands on the flattening bars; n40 gives the one number that matters (homework, 1 in 20). |
| c11 = C11 (5.22 s) | L01 65:07.6-65:12.8 | "For example, 1 plus 1, some passes will give you the result 2, some passes will give you the result 3." | P15, after n50 ("Her toy example:") | Introduced as her toy example (Trap); n51 turns the disagreement into the majority vote. Open item: listen first (digits normalised). |

- Not used: C1 (penalties: off the spine; the penalties are only named in n46), C3 (C2 + n14 already show greedy's flaw),
  C6 and C7 (her 0.68 / 0.99 are said in n26 over her own figure; C5's question is the better beat, and C6 + C7 would
  cost 17 s). Swap if a clip fails by ear: C3 for C2 (then n12 must also say the path), C6 for C5 (n26 then only says
  "and in the next step, 0.99"), C8 can simply drop.

## Panels (17 + end card; one idea each; all motion eased, no jitter)
Layout rule for every panel: the head lettering sits top-left (30-36 px qualifiers, 60-80 px heads). The subject fills
60-90 % of the width. The narrator's caption band is at the lower third. On clip panels the mic tag sits top right and
nothing the pen does goes under it. "made-up odds" is lettered beside the `bars` chart every time it is on screen.

**P0 - Cover (0:00-0:28).** `line_same_question` at about 86 % width, lower part of the frame (the bubbles at about
y 520-760). Title top-left: "Temperature" (ink) / "and Top-p" (red), strip "CSE 291P · Lecture 1 · UC San Diego".
Left bubble: "My dog loves" (small ink) over "walks." (large ink). Right bubble: "My dog loves" over "naps.". A red
"≠" sits in the gap between the bubbles. All of this is on frame 0 (the thumbnail). Wash: course blue, soft, behind the
two bubbles; nothing moves until n2, when the course strip gets its blue wash stroke. No hold beyond the voice.

**P1 - The clerk (0:28-0:44).** `line_clerk_ladder` (at about 84 % width) draws itself, top to bottom. Head: "last
episode: the clerk". Clipboard lettered "scores" in ink. For n5 the red ticks cascade over the wall, left to right, in
time with his pencil. A note card is taped low on the wall: "about 200,000 scores, every step" / "each one: a logit".
For n6 the pen rings one drawer at his eye level, "which one?". Wash: blue over the wall as the ticks land.

**P2 - The dog's odds (0:44-1:16).** `line_dog_leash` (square, about 62 % width) in the upper half. The dog acts: tail
wag lines draw last. Head: "My dog loves ..." Below the dog, the `bars` chart (about 88 % width), T = 1, fixed. The
bars grow from zero in order as n8 names them, and each percentage appears as its bar settles: walks 45 %, treats
30 %, naps 12 %, sticks 8 %, baths 4 %, homework 1 %. For n7, the head line "softmax: scores → odds, adding up to 100 %"
writes in above the chart before the bars grow. For n9, the pen rings "homework 1 %" (tiny pink wash in the ring) and
a 0.8 s hold. For n10: "decoding = picking one word" (ink), then "greedy: the top word, every time" with a red arrow to
the walks bar. For n11: under the chart, in pencil, "walks. walks. walks." writes itself, then in red "two answers?
not from greedy". Wash: blue under the bars.

**P3 - Her slide 28, greedy (1:16-1:43).** Slide 28 taped, cropped to the title, the "Greedy Search" text and the left
tree (about 92 % width, top edge below the mic tag). The slide's credit line ("huggingface.co/blog/how-to-generate")
sits centred under both trees, so it is cut out and taped as a strip under the crop. During C2 (mic tag), the pen
traces The → nice → woman over the slide's own red line, in step with her words (no lettering under the tag). For n13
it rings "0.5" and "0.4" and writes "0.5 × 0.4 = 0.2". For n14 it rings "0.9" by "has" (yellow wash), draws an arrow
back to "dog 0.4", and writes "hidden".

**P4 - Two hikers (1:43-1:54).** `line_two_lanterns` (landscape, about 96 % width), upper-middle. Head: "beam search".
The blank signpost arms are lettered "keep 2" (top arm) and "drop the rest" (lower arm). As n15 says "two hikers", the
lanterns get a small yellow glow wash. On "keep the best two paths", a blue wash runs ahead along the two branches the
hikers walk, to the next forks. At three other branch mouths, small red "×" marks appear. Both hikers act (walking with
lanterns). Nothing else moves.

**P5 - Her slide 28, beam (1:54-2:24).** The same slide, cropped to the "Beam Search" text and the right tree, with the
same credit strip. For n16 the pen traces The → dog → has and rings "0.4" and "0.9", then writes "0.4 × 0.9 = 0.36" and
"> 0.2 (greedy)". Yellow wash on 0.36. For n17: small red "no guarantee" under the tree. During C4 (mic tag): nothing.
For n18, along the traced path: "each word: × a number below 1", then a down-arrow and "longer scores lower → drifts
short".

**P6 - The die (2:24-2:55).** `line_dice_hand` (about 80 % width) draws itself during n19, while a pencil line along the
top reads "the likeliest word, always: bland, loops", and then fades. Head (n20): "sampling: a weighted die". Small tags
on the dice: "draw 1" (upper die), "draw 2" (lower die). A note card by the palm: "made-up odds: walks 45 in 100 ·
treats 30 in 100 · ...". For n21, two small bubble-shaped cards drop from the dice to the bottom of the drawing:
"walks." under draw 1, "naps." under draw 2, the same lettering as the cover's bubbles. A red line under them:
"temperature 1 (the default): a fresh draw every time". Wash: blue under the dice.

**P7 - The silly word (2:55-3:07).** `line_dog_homework` (landscape, about 94 % width), centre. Pink wash behind the dog
and the scraps. Head (n23): "about 1 draw in 100:" then, large: "My dog loves homework." The red pen underlines
"homework". 1.2 s hold on the dog (the laugh). For n24, a small line under the drawing: "a silly word gets through".
The dog acts: the drawing's wag lines draw last.

**P8 - Her slide 30, top-k (3:07-3:40).** Slide 30 taped, cropped from "Top-k sampling: k = 6 for this example." down to
its credit line "Fan et al., arXiv:1805.04833 (2018)" (kept visible). For n25 the pen rings "k = 6" and draws a red
bracket over the six blue-outlined bars on each half. Credit fix in red beside the slide's credit: "figure: Hugging
Face blog, 2020 · Fan et al. used k = 10". During C5 (mic tag): nothing. For n26: "0.68" in red over the left bracket,
then "0.99" over the right bracket. These are the sums she quotes, never per-bar readings. For n27: "k too small
here" under the left half (many words are fine) and "k too big here" under the right half.

**P9 - Her slide 31, top-p (3:40-4:03).** Slide 31 taped, cropped from "Top-p (Nucleus): p=0.92 ..." down to "Holtzman et
al. ICLR 2020" (kept). For n28 the pen underlines "smallest possible set of words whose cumulative probability exceeds
the probability p". For n29 it rings "p=0.92", writes "9 words" over the left brace and "3 words" over the right one.
It never touches the printed sums. Credit fix: "figure: Hugging Face blog, 2020". Yellow wash under the two braces.
C8 plays (mic tag) on the finished state.

**P10 - The dog again, p = 0.9 (4:03-4:28).** P2's layout: `line_dog_leash` (smaller, about 50 % width, clear of the
mic tag) over the `bars` at T = 1. Head: "top-p = 0.9". For n30, the red bracket grows bar by bar over walks, treats,
naps, sticks, with a running total that stops at "0.95"; then "kept" is lettered on the bracket. Baths and homework fade
to pencil, and the pink wash on homework fades with them. C10 (mic tag). For n32 a note card: "0.9: her starting point
· the paper: 0.95 · the API's default: 1 (cuts nothing)".

**P11 - Her slide 32, the formula (4:28-4:46).** Slide 32 taped, cropped to the title, the two bullets and their
sub-bullets, and the formula. The plot and its credit URL are under a blank taped sheet. For n33 the pen underlines
"from logits to probability distributions". For n34 it rings the two "/T" in the formula (blue wash), and the blank
sheet takes the pen notes "x = a score (logit)" and "T = temperature, the dial". For n35 it underlines "Sharper" and
"Flatter". Below the crop, in red: "÷ T, then softmax".

**P12 - The dial (4:46-5:34).** `line_temp_knob` (about 64 % width, centre-left, clear of the mic tag) in the upper
half, with its red needle drawn by code. The ticks are lettered "0" (left end), "1" (top), "2" (right end). Below it,
the `bars` (about 88 % width), live. Head: "temperature".
- n36: the needle sits at 1; the bars show the T = 1 odds.
- n37: the needle eases to 0.2 (about 1.5 s); the bars sharpen live; at rest "walks 88 %" and the rest show (12 / <1 /
  ...). The wash under the knob is blue.
- n38: a red arrow from the needle toward the 0 tick, "→ 0: greedy". The needle stays at 0.2: percentages only show at
  the RUN temperatures.
- n39 + C9: the needle eases from 0.2 through 1 to 2 over the length of C9. The bars even out live, and the knob's wash
  cross-fades from blue to pink. At rest: 31 / 26 / 16 / 13 / 9 / 5 %.
- n40: the knob eases up and out of the frame, and `line_dog_homework` (about 90 % width) eases into its place. The
  pen writes "1 in 100 → about 1 in 20" by the homework bar (5 %).
- n41: "top-p 0.9" is lettered and the red bracket spans walks to baths. The homework bar fades to pencil, the dog
  drawing fades to about 30 % (pencil grey), and "cut" is written in red across it.
- n42: a note card is taped over the faded dog: "the API's reference: change temperature or top_p, generally not both".

**P13 - Who turns it where (5:34-5:58).** `line_coder_storyteller` (landscape, about 94 % width) in the upper half.
Blue wash under the careful programmer, pink under the storyteller. Slide 34 taped below it, cropped to the title and
the first three columns (the row names, Temperature, Top-p), without the Key Insights column (it names a product) or the
bottom sentence. For n43 the pen strikes "Current SOTA Usage Recommendations." and writes "her rule of thumb". For n44,
in step with the voice, it rings "0.0 - 0.2" (Code), "0.7-0.8" (Chat) and "0.8 -1.2" (Creative). Matching lettering
appears on the drawing: "code: 0 to 0.2" over the coder, "chat: about 0.7" between them, "stories: 0.8 to 1.2" over
the storyteller. For n45, one of the storyteller's flying pages gets "my dog loves homework" in ink with a pink dab.

**P14 - The other knobs, and the limit (5:58-6:21).** `line_knob_panel` (about 94 % width) at about y 520-790. Head:
"one request, many knobs". The label strips are lettered "temp", "top_p", "max out", "penalty", "penalty", "seed"; the
last two strips and the toggle get a grey "...". A legend card under the panel: "max out = max output tokens ·
penalties: presence, frequency". For n46 the pen rings "temp" and "top_p" (yellow wash). For n47, a small red note
under "seed": "best effort, not a guarantee". For n48 a card below: "temperature 0 · one prompt · 1,000 runs: 80
different answers" / "a 2025 test (Thinking Machines Lab): the server's load changes how the math is batched".

**P15 - Ask on purpose (6:21-6:52).** `line_tally_pages` at full frame width, centre. Head (n49): "different answers,
on purpose". For n50 the pencil hand writes "2", "2", "3", "2", "2" into the five answer boxes, one after another.
The digits are about 40 px, written over the box lines the way a hand would, not typed. Grey under the pages: "her
toy example: 1 + 1". C11 (mic tag) plays on that state. For n51, a card above the pages: "2 2 3 2 2 → most paths: 2",
with the 2 ringed in red. The notepad gets a large ringed "2". Under the head: "self-consistency (Wang et al.,
2022)". For n52, a small red note: "5 paths ≈ 5 answers' worth of tokens". Yellow wash on the four "2" boxes. (The
2-2-3-2-2 split is only an illustration of F32's "2 appears more"; no count is spoken.)

**P16 - Bookend (6:52-7:10).** The cover layout again (`line_same_question`, same bubbles, same title). For n53, the
pen writes "draw 1" under "walks." and "draw 2" under "naps.", then letters "a glitch?" under the title, strikes it,
and writes "the dial, at 1". For n54: "down for code · up for stories" in ink under it. Nothing else moves; 1.5 s
hold on the finished page.

**End card (7:10-7:15).** The line logo; "Turn the dial on purpose."; "After Prof. Yufei Ding's CSE 291P, Lecture 1 ·
UC San Diego · Picasso Lab". Small print: "Figures on slides 28, 30, 31: Hugging Face blog (von Platen, 2020). Top-k:
Fan et al., ACL 2018. Top-p: Holtzman et al., ICLR 2020. Temperature: Hinton et al., 2015. Self-consistency: Wang et
al., 2022. Temperature 0 test: Thinking Machines Lab, 2025. The dog's odds are made up. The narration is synthetic."

## Drawings
- New for this episode, used: `line_same_question` (P0, P16), `line_two_lanterns` (P4), `line_dice_hand` (P6),
  `line_temp_knob` (P12), `line_coder_storyteller` (P13), `line_knob_panel` (P14), `line_tally_pages` (P15),
  `line_dog_leash` (P2, P10), `line_dog_homework` (P7, P12).
- Reused: `line_clerk_ladder` (P1), `line_mic` (the mic tag on all seven clips).
- No new drawing is needed. Not used: `line_cabinet_tower`, `line_card_catalog`, `line_dusty_drawer`, `line_receipt`,
  `line_scissors_strips`, `line_chat_first`, `line_balance`, `line_postal_scale`, `line_paper`, `line_brain`,
  `line_gpu`, `line_servers`.
- Code-drawn: all lettering, the red-pen marks, the needle, the `bars` chart (T = 1, 0.2, 2; the top-p 0.9 cuts at
  T = 1 and T = 2), cards, tape, washes, the taped slide crops.
- Characters who appear only when they act: the student (puzzled), the clerk (scoring), the dog (waiting with the
  leash; chewing the homework), the two hikers (walking), the hand (tossing; writing), the programmer and the
  storyteller (working). Prof. Ding is never drawn.

## Slides on screen
28 (two crops: greedy left, beam right; credit strip), 30 (credit kept + red fix), 31 (credit kept + red fix), 32 (plot
under a blank sheet that carries the pen notes), 34 (first three columns; title struck to "her rule of thumb"). Not
26, 27, 29, 33.

## What was cut from the lecture, and why
- Slide 25 (agenda) and slide 26's API screenshot. The screenshot names a product and mixes two endpoints (erratum 5).
  Its knobs are lettered on our own panel (P14), and only the two knobs of the title get explained.
- The penalties and C1 ("we investigate" → "we study"): a nice example, but off the spine (choosing among the odds).
  Named only in n46. Max output tokens (F5): named only.
- Slide 27's pipeline: the clerk callback (P1) carries "one score per entry", and tokens are not re-explained.
- Slide 29's sampling tree and its "samples the whole path" slip (erratum 3): the die and the dog do the job.
- Slide 33 (a vendor's plots, a hidden table, "Bag of N"): not shown. The test-time-scaling claim (F33) is left out,
  because it is a soft vendor claim with no numbers, and self-consistency already closes the story. Spare line below.
- Beam search's length normalization, the paper she mentions on nondeterminism (NIPS2025, not proven), and the
  [0.9, 1) range from HOL2020: not needed for a first-year viewer.
- Slide 34's Key Insights column and its other rows (factual/QA, brainstorming, "avoid > 1.5"). The three rows in n44
  are what F30's safe wording clears.

## Checks against the Traps
- Temperature 0 is never called deterministic. n38 says only "back to greedy" (F28), and the needle never settles
  below 0.2. n11's "every time" is greedy as a rule, and n48 then says what real servers do (F8).
- The seed is "best effort, not a guarantee" (n47). Beam search gets "still no guarantee" (n17).
- k = 6 is "her slide's" picture. The red pen says the figure is the Hugging Face blog's and that Fan et al. used k = 10.
- 0.9 is "her starting point", next to the paper's 0.95 and the API's default of 1 (n32).
- Slide 34 is "her rule of thumb", and its title is struck. Both knobs together appear only as a demonstration (n41),
  followed at once by F4 (n42). The script never advises setting both.
- The dog chart is labelled "made-up odds" wherever it appears, and only the RUN numbers are shown (T = 1, 0.2, 2;
  top-p 0.9 at T = 1 and T = 2).
- No number is read off the bars of slides 30/31. 0.68 / 0.99 (F21) and 9 / 3 words (F24) are the lecture's own figures.
- Slide 33 is not shown and no benchmark number is used. Her 1 + 1 is introduced as "her toy example".
- Nothing on the house list of forbidden topics; no language examples; no emoji; no names of models or assistants
  in narration, lettering or captions (products only as "the API").

## Cut order if the takes run long (each cleared; about 7 s each)
1. n31 + C10 (n32 becomes "0.9 is her starting point; the paper used 0.95; the API's default is 1, which cuts nothing.").
2. n19's middle sentence ("That sounds safe, ...") becomes the P6 pencil line only.
3. n46 is cut; P14 opens on n47 with the panel already lettered.
4. C8 is dropped (P9 ends on n29).

## Spare lines if the cut runs short (cleared)
- F5: "Max output tokens is a hard stop: the reply is cut off there, thinking included." (after n46)
- F33: "A 2024 industry report: answers get better the longer the model thinks at answer time." (after n52, with no
  numbers and no plot)
