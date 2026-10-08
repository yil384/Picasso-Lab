# L01-04 · "Temperature and Top-p"

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 1, slides 25-34 (decoding: greedy, beam
search, sampling, top-k, top-p, temperature, a self-consistency coda), recording 50:41-68:13. Fourth episode of the
daily series, after L01-03 "The Size of the Dictionary" (which ended: "Every drawer now has a score. Next: how does the
model pick one?"). Runtime 7:10 (timeline.json, 429.8 s), 1080x1920, 30 fps, English only. Built with `kit-lesson`
(`kit-lesson/lesson.html?ep=l01-04`); one kit addition: the `bars` item (a hand-drawn bar chart of next-word odds that
computes softmax(logits / T) live, with a top-p cut and a needle on a knob drawing), made on night 1 and checked to
leave L01-01 pixel-identical. Data written by `~/picasso-work/daily/L01-04/scripts/build_ep.py` (episode.json,
strings.json) and `plan.py` (timeline.json from `plan.json`, the TTS takes and the clips).

Sources: `FACTS.md` (every number and claim, in its safe wording), `clips.json` + the two-recognizer check, her slides
28 (two crops: the greedy tree, the beam tree with the credit line), 30, 31, 32 (two crops: the bullets and the
formula; the vendor plot is not shown) and 34 (the first three columns; the "Key Insights" column names a product and
is cropped off), rendered at 300 dpi into `slides/` (git-ignored). Slides 26, 27, 29, 33 are not shown (26: a vendor
screenshot, its knobs are lettered on our own drawing; 27: a vendor diagram; 33: a vendor's plots).

Script: synthesis of `drafts/script_A.md` (story first, the winner, 47/60) and `drafts/script_B.md` (worked example
first, 46/60), judged in `drafts/judge.md`. The spine is A's: one made-up sentence, "My dog loves ...", finished twice
on the cover ("walks." / "treats."); greedy and beam search are ruled out because neither rolls a die; sampling solves
the puzzle at 2:33; the dog's silliest ending, "homework" (1 in 100), runs through as the gag and as the explanation
(top-p cuts it; temperature 2 makes it 1 in 20; top-p still cuts it). Grafts from B: her clips C6 and C7 (her own 0.68
and 0.99) instead of C5 and C8; "A sentence's odds are its words' odds, multiplied"; "And it has a habit." before C4;
the pen on her words during C2 and C11; the dial split into "turn it down" (ending on the honest limit) and "turn it
up"; "45 + 30 + 12 + 8 = 95%" on the top-p panel; "treats." on the cover and 45% / 30% on the bookend; the "My dog
loves" token ids on the clerk panel (F35); "and so did our dog" before the not-both caution. Judge's fixes taken:
temperature introduced as "a dial for how random the draw is" when first named (n19); "On paper, greedy says walks"
(n9); "they don't always agree" (n48); C6/C7 bridged by "That was a flat step. Now a sharp one." (n24); the hook in
4.6 s; "Fan et al. used k = 10" on slide 30; every bars panel says "made-up odds"; percentages only at T = 1, 0.2, 2.
Own changes: the course credit is spoken on the cover (n2) instead of a separate line; the seed and the other knobs
come after the rule of thumb (a natural "can I get the same answer every time?").

Look: the L01-01 line look (warm paper, ink drawings drawing themselves, red pen, washes, taped slides, mic tag). Every
picture is a drawing from the image tool; code letters, rings, underlines, draws the bar charts and the needle.

## Beats
| # | Panel | Picture | Voice |
| --- | --- | --- | --- |
| 0 | cover | `line_same_question`: the student, two bubbles "My dog loves / walks." and "My dog loves / treats.", a red "≠" (ringed on "dial"); "Temperature / and Top-p"; strip "CSE 291P · Lecture 1 · UC San Diego" | n0, n1, n2 |
| 1 | last episode's clerk | `line_clerk_ladder` (blue wash); card "My dog loves" and three red id tiles 5444 · 6446 · 19620; note card "about 200,000 scores / each one: a logit"; one drawer ringed "which one?" | n3, n4 |
| 2 | My dog loves ... | `line_dog_leash`; "softmax: odds that add up to 100%"; the `bars` chart at T = 1 (made-up odds 45 / 30 / 12 / 8 / 4 / 1 %); homework ringed; "decoding: pick one", "greedy: the top one, every time" with an arrow to walks; "walks. walks. walks." in pencil | n5-n9 |
| 3 | her slide 28, greedy | the left tree taped (HF2020 figure); during C2 the pen rings 0.5 on "nice" and 0.4 on "woman"; "0.5 × 0.4 = 0.2"; dog 0.4 ringed, has 0.9 ringed with a yellow wash, an arrow back, "hidden"; camera push to 1.15 | n10, C2, n11, n12 |
| 4 | beam search | `line_two_lanterns`: lantern glows, blue washes ahead on the two lit branches; signpost lettered "keep 2" / "drop"; "keep the best 2 paths" | n13 |
| 5 | her slide 28, beam | the right tree taped with its credit line; "beam size 2"; the pen traces The → dog → has, rings 0.9; "0.4 × 0.9 = 0.36", "> 0.2"; in the blank corner "no guarantee", "drifts short", "bland, loops" | n14, n15, C4, n16, n17 |
| 6 | sampling | `line_dice_hand` (blue / pink washes on the dice); "roll a weighted die"; "walks: 45 in 100", "treats: 30 in 100"; "temperature 1 (the default): a fresh draw every reply"; two reply cards "walks." / "treats." | n18-n20 |
| 7 | the silly word | `line_dog_homework` (pink wash); "about 1 draw in 100: / My dog loves homework."; "a silly word gets through" | n21, n22 |
| 8 | her slide 30, top-k | taped with its credit line; "k = 6" ringed; the camera zooms to the left chart for C6 (bracket over six bars, "0.68", "flat step"), pans to the right chart for C7 (bracket, "0.99", "sharp step"), zooms out; red credit fix "figure: Hugging Face blog, 2020 / Fan et al. used k = 10"; "k too small when many words fit / k too big when only a few do" | n23, C6, n24, C7, n25 |
| 9 | her slide 31, top-p | taped with its credit line; the rule lettered (fades before the zoom); "p=0.92" ringed; zoom left: brace washed, "9 words"; pan right: "3 words"; credit fix | n26, n27 |
| 10 | top-p 0.9 | the `bars` chart at T = 1, cut at 0.9: "45 + 30 + 12 + 8 = 95%" term by term, the red bracket over the four kept bars, baths and homework to pencil, "out"; card "her start: 0.9 · the paper: 0.95 · the API default: 1" | n28, n29, C10, n30 |
| 11 | her slide 32, temperature | two pieces taped: the bullets (logits underlined; Sharper / Flatter underlined) and the formula, big, its two /T ringed; "divide every score by T, then softmax"; "below 1: sharper / above 1: flatter" | n31-n33 |
| 12 | turn it down | `line_temp_knob` with the red needle, ticks lettered 0 · 1 · 2; the `bars` sharpen live to T = 0.2 (walks 88 %); "T = 0.2", "toward 0: greedy"; then a card covers the chart: "one honest limit · temperature 0 · one prompt · 1,000 runs · 80 different answers · the server's load changes how the math is batched · a 2025 test, Thinking Machines Lab" | n34-n37 |
| 13 | turn it up | the knob again; the needle eases from 0.2 to 2 over her clip C9 while the bars even out live; "T = 2", "flatter" | n38, C9 |
| 14 | temperature 2 | `line_dog_homework` (smaller) over the `bars` at T = 2; homework ringed, "1 in 100 → about 1 in 20"; the top-p 0.9 cut (homework to pencil), "+ top-p 0.9: cut" | n39, n40 |
| 15 | her slide 34 | the table taped (three columns); "her rule of thumb"; 0.7-0.8, 0.0-0.2, 0.8-1.2 ringed; "the table cites no source"; the Temperature and Top-p heads underlined, "both?"; "the API reference: change one, not both" | n41-n43 |
| 16 | low or high? | `line_coder_storyteller` (blue under the coder, pink under the storyteller); "code: 0 to 0.2", "stories: 0.8 to 1.2" | n44 |
| 17 | the other knobs | `line_knob_board`, strips lettered temp · top_p · max out · presence · frequency · seed (her slide 26); "max output tokens: a hard stop", "two penalties: avoid repeated words"; seed ringed, "seed: best effort, / not a guarantee" | n45, n46 |
| 18 | different answers, on purpose | `line_tally_pages`: "her toy example: 1 + 1"; during C11 the boxes fill 2 · 2 · 3 · 2 · 2 on her words; a big ringed "2" on the notepad (yellow wash); "self-consistency", "Wang et al., 2022 (ICLR 2023)"; "the catch: 5 paths ≈ 5 answers of tokens" | n47, n48, C11, n49, n50 |
| 19 | bookend | the cover layout again; "a glitch?" struck, "the dial, at 1"; 45% / 30% in the bubbles; "down for code, up for stories"; "made-up odds" | n51, n52 |
| - | end card | the logo; "After Prof. Yufei Ding's CSE 291P, Lecture 1" / "Turn the dial on purpose." / "UC San Diego · Picasso Lab"; small print: the sources, "The dog odds are made up. The narration is a synthetic voice." | - |

## Voice (narration = a disclosed synthetic voice; slots from timeline.json)
| id | at | line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.3 | Ask a model to finish "My dog loves" twice. You can get two different answers. | F2, F29 (the sentence is ours) |
| n1 | 0:06.0 | That is not a glitch. It is a dial. | work-order hook; F3 |
| n2 | 0:09.1 | Tonight, from Professor Yufei Ding's CSE 291P at UC San Diego: how a model picks its next word, and the two knobs that steer it. | L01 source key |
| n3 | 0:19.2 | Last episode's clerk is back. Feed in "My dog loves", 3 tokens, and out come about 200,000 scores, one per dictionary entry. | F35, F10 (callback L01-03) |
| n4 | 0:29.2 | Each score is called a logit. So which drawer does he open? | F9 |
| n5 | 0:34.2 | First, a function called softmax turns the scores into odds that add up to 100 percent. | F11 |
| n6 | 0:41.1 | Here are made-up odds for our dog. Walks, 45 percent. Treats, 30. Naps, 12. Sticks, 8. Baths, 4. | F29 (RUN, T = 1) |
| n7 | 0:50.5 | And homework: 1 percent. | F29 |
| n8 | 0:53.2 | Picking a word from these odds is called decoding. The simplest way: take the top word, every time. That's greedy. | L01 s28 title; F12 |
| n9 | 1:01.4 | On paper, greedy says walks, every time. Our two answers need something else. | F12 (greedy as a rule; F8 later) |
| n10 | 1:08.3 | Her slide 28 runs greedy on a little tree of words, starting from "The". | L01 s28; F12 |
| c2 | 1:14.3 | her clip C2: "For example, this one we will choose nice, and then we will choose woman, like the nice woman." | check.json: exact |
| n11 | 1:20.7 | A sentence's odds are its words' odds, multiplied. 0.5 times 0.4: the nice woman scores 0.2. | F12, F16 (tree products, RUN) |
| n12 | 1:30.0 | But follow dog: next comes has, at 0.9. The best word can hide behind a weaker one. | F13 |
| n13 | 1:37.2 | Beam search keeps the best two paths at every fork: two hikers, two lanterns. | F14 (slide 28 "beam size 2") |
| n14 | 1:44.4 | On her slide, it finds "the dog has": 0.4 times 0.9 is 0.36, beating 0.2. | F14 (RUN 0.36) |
| n15 | 1:53.8 | Better, but still no guarantee. And it has a habit. | F15 |
| c4 | 1:57.9 | her clip C4: "But later on, beam search has an issue. The issue is, usually beam search people find that they are preferring short sentence." | check.json: exact |
| n16 | 2:06.9 | Every extra word multiplies in another number below one, so longer sentences score lower. Left alone, beam search drifts short. | F16 |
| n17 | 2:15.8 | Greedy and beam both chase the likeliest words, and the text comes out bland, and loops. People don't write that way. | F17 |
| n18 | 2:25.1 | So let chance in. Sampling rolls a weighted die: on our odds, walks comes up 45 times in 100, treats 30. | F18, F29 |
| n19 | 2:34.0 | That's our puzzle, solved. Left alone, the temperature setting, a dial for how random the draw is, sits at 1: every reply is a fresh draw. | F2, F3 |
| n20 | 2:43.8 | Walks one time, treats the next. | F18, F29 |
| n21 | 2:47.4 | And about once in 100 draws, the dog loves homework. | F29 (1%) |
| n22 | 2:52.1 | Sample from everything, and now and then a silly word gets through. | F19 |
| n23 | 2:57.8 | One fix is top-k: keep only the k likeliest words, then roll. Her slide's picture uses k equals 6. | F20 |
| c6 | 3:06.3 | her clip C6: "if you use the top six, the overall accumulated probability of the top six tokens only adding up to 0.68." | check.json: exact |
| n24 | 3:17.4 | That was the word after "The": a flat step. Now the word after "The car": a sharp one. | F24 (flat / sharp step), F21 |
| c7 | 3:23.2 | her clip C7: "But for this one, if you have top six, you already covered 99% of the overall probability." | check.json: exact |
| n25 | 3:31.7 | A fixed k is too small when many words are fine, and too big when only a few are. | F22 |
| n26 | 3:38.5 | Top-p lets the group size itself. Line the words up, add their odds until you reach p, keep that group, and draw from it. | F23 |
| n27 | 3:46.9 | With p at 0.92, her slide keeps 9 words in the flat step, and only 3 in the sharp one. | F24 |
| n28 | 3:55.0 | Back to the dog, with p at 0.9. Walks, treats, naps, sticks: together, 95 percent. Baths and homework are out. | F29 (RUN: T = 1, top-p 0.9 keeps four, 95%) |
| n29 | 4:04.9 | So which p should you try? | - |
| c10 | 4:07.4 | her clip C10: "You should always try 0.9 at the beginning." | check.json: exact |
| n30 | 4:11.2 | That's her starting point. The paper behind top-p used 0.95. The API's default is 1, which cuts nothing. | F25, F2 (top_p default 1) |
| n31 | 4:20.6 | The second knob reshapes the odds before anything is cut: temperature. | L01 s32 bullets; F26 |
| n32 | 4:25.8 | Her slide 32 puts it in one line: divide every score by T, then softmax. | F26 |
| n33 | 4:32.5 | Below 1, the favourite pulls ahead. Above 1, the odds even out. | F27 |
| n34 | 4:38.7 | Here's the dial. It goes from 0 to 2, and starts at 1. | F2 |
| n35 | 4:43.4 | Turn it down to 0.2. Walks jumps to 88 percent. | F29 (RUN, T = 0.2) |
| n36 | 4:48.9 | Turn it toward 0, and you are back to greedy. | F28 |
| n37 | 4:53.0 | One honest limit. Even at temperature 0, one 2025 test got 80 different answers in 1,000 runs. A busy server batches many requests together, and the batch size changes the arithmetic. | F8 (the honest limit) |
| n38 | 5:08.3 | Now turn it up, to 2. | F2 |
| c9 | 5:11.0 | her clip C9: "But after you divide it by the temperature, they are kind of similar. So that's why when you have high temperature, you will see like it's pretty flat." | check.json: near |
| n39 | 5:21.8 | Homework goes from 1 in 100 to about 1 in 20. | F29 (RUN, T = 2) |
| n40 | 5:25.8 | That's the high-temperature dog. Add top-p at 0.9, and the cut still stops before homework. | F29 (RUN: T = 2, five words, homework cut) |
| n41 | 5:33.3 | So where should the dial sit? Her slide 34 gives a rule of thumb. | F30 |
| n42 | 5:38.5 | Code: 0 to 0.2. Chat: about 0.7. Stories: 0.8 to 1.2. | F30 (her rule of thumb) |
| n43 | 5:48.0 | Her slides pair the two knobs, and so did our dog. The API's own reference says: change temperature or top_p, generally not both. | F4 (the second limit; erratum 6) |
| n44 | 5:58.5 | Low for code: you want the same, careful answer. In a story, a dog that loves homework might be the point. | F31; F29 (the gag) |
| n45 | 6:06.4 | The API has other knobs too: max output tokens, two penalties, and a seed. | F1 |
| n46 | 6:12.7 | A seed asks for a repeatable draw: best effort, not a guarantee. | F7 |
| n47 | 6:18.6 | Sometimes you want different answers, on purpose. | F32 (lead-in) |
| n48 | 6:22.1 | Sample several reasoning paths, answers worked out step by step, and they don't always agree. Her toy example: | F32 (her toy example) |
| c11 | 6:29.9 | her clip C11: "For example, 1 plus 1, some passes will give you the result 2, some passes will give you the result 3." | check.json: exact |
| n49 | 6:36.3 | So count, and go with the answer most paths reach. That's self-consistency, from Wang and colleagues, 2022. | F32 |
| n50 | 6:45.2 | The catch: 5 paths cost about 5 answers' worth of tokens. | F34 |
| n51 | 6:50.9 | Back to our two answers. Not a glitch: the dial sat at 1, and the model rolled the die twice. | F2, F18 |
| n52 | 6:58.3 | Turn it down for careful code, up for stories. And if the dog ever loves homework, now you know why. | F30, F29 |

822 narration words in 53 lines, 115 words per minute over 7:10 (voice at +4%). Her clips: 7, 46.9 s (11 % of the runtime).

## Her clips (two recognizers, not checked by ear; `~/picasso-work/clips/l01-04/check.json`)
| clip | recording | text | verdict | why there |
| --- | --- | --- | --- | --- |
| C2 | L01 55:22.4-55:27.6 | "For example, this one we will choose nice, and then we will choose woman, like the nice woman." | exact (text set to what both heard; was "we'll") | she walks the greedy path on her own tree; n11 does the multiplication she does not say |
| C4 | L01 56:51.6-56:59.4 | "But later on, beam search has an issue. The issue is, usually beam search people find that they are preferring short sentence." | exact | "And it has a habit." sets it up; n16 gives the reason (numbers below one) |
| C6 | L01 59:40.7-59:50.6 | "if you use the top six, the overall accumulated probability of the top six tokens only adding up to 0.68." | exact | her own 0.68 while the camera sits on the flat chart |
| C7 | L01 59:57.0-60:04.4 | "But for this one, if you have top six, you already covered 99% of the overall probability." | exact | her own 0.99 on the sharp chart; n25 draws the conclusion |
| C10 | L01 66:21.3-66:23.9 | "You should always try 0.9 at the beginning." | exact | n29 asks, she answers; n30 places her 0.9 beside the paper's 0.95 and the API default of 1 |
| C9 | L01 63:20.2-63:29.0 | "But after you divide it by the temperature, they are kind of similar. So that's why when you have high temperature, you will see like it's pretty flat." | near (one recognizer drops "like") | her "pretty flat" lands while the needle turns to 2 and the bars even out |
| C11 | L01 65:07.6-65:12.8 | "For example, 1 plus 1, some passes will give you the result 2, some passes will give you the result 3." | exact (digits for number words, "." for "," as both heard) | introduced as her toy example; the answer boxes fill on her words |

Not used: C1 (penalties: off the spine), C3, C5, C8 (all passed). Listen first: C2 and C11 (text normalised to what
both recognizers heard) and C9 (near).

## Facts on screen beyond the voice
The token ids 5444 · 6446 · 19620 (F35), "beam size 2" (slide 28), "flat step" / "sharp step" (F24), the credit fixes
on slides 30 and 31 ("figure: Hugging Face blog, 2020", "Fan et al. used k = 10": F20, errata 1-2), "45 + 30 + 12 + 8
= 95%" (F29), "her start: 0.9 · the paper: 0.95 · the API default: 1" (F25, F2), the honest-limit card (F8: TML2025),
"the table cites no source" (F30, erratum 7), "max output tokens: a hard stop" (F5), "two penalties: avoid repeated
words" (F6), "Wang et al., 2022 (ICLR 2023)" (F32), "5 paths ≈ 5 answers of tokens" (F34). Every `bars` chart is the
made-up dog odds of FACTS (RUN), labelled "made-up odds", at T = 1, 0.2 or 2 only. The end card's small print credits
von Platen (Hugging Face blog 2020), Fan et al. 2018, Holtzman et al. ICLR 2020, Wu et al. 2016, Hinton et al. 2015,
Wang et al. ICLR 2023, He & Thinking Machines Lab 2025.

## Drawings
New (this episode, `art.json`, image tool, checked at full size): `line_same_question`, `line_knob_board`,
`line_temp_knob`, `line_dice_hand`, `line_two_lanterns`, `line_tally_pages`, `line_coder_storyteller` (night 1),
`line_dog_leash`, `line_dog_homework` (night 2). Reused: `line_clerk_ladder` (L01-03), `line_mic`. The student, the
clerk, the hikers, the hands, the programmer and the storyteller are invented characters; no real person is drawn.

## What was cut from the lecture, and why
- Slide 25 (agenda); slide 26's vendor screenshot (its knobs are lettered on our own panel, P17); slide 27's vendor
  pipeline diagram (the clerk callback carries "one score per entry"); slide 29's sampling tree (the die and the dog
  carry sampling); slide 33 (a vendor's plots; the test-time-scaling claim F33 is left out, self-consistency closes).
- The penalties and C1 ("we investigate" / "we study"): off the spine; the penalties are lettered on P17 only.
- Beam search's length normalisation, the [0.9, 1) range, the nondeterminism paper she mentions (not proven which).
- Slide 34's Key Insights column (it names a product) and its bottom sentence.

## Review (drafts/review.md) and what was done
Independent review of preview r3: 7 must-fix, 12 should-fix. Fixed: M1 (the heading rows of slides 28, 30, 31 fade out
before each push or zoom; the slide paper no longer covers "greedy"), M2 (slide 30's printed credit is struck through by
the red pen and the fix "figure: Hugging Face blog, 2020 · Fan et al. used k = 10" sits in the heading row; slide 31's
fix "figure: Hugging Face blog, 2020 · method: Holtzman et al." likewise), M3 (the bar charts on the dial panels sit at
y 1200; the zooms on slides 30/31 sit higher), M4 (one clean bracket, a red cut stroke between baths and homework, the
label above the bracket's end), M5 ("change one, generally not both"), M6 and M7 (post wording); S1 (tighter rings),
S2 (the beam sum moved into the blank lower left; the trace on the slide's own line, thinner), S3 (a ring on the walks
bar instead of the arrow; the homework ring tightened), S4 (the dial drawn at 540 px, half the frame; the knob panel and
the papers at 950 px), S5 (slide 30 stays zoomed through "too small here / too big here", one label on each chart),
S6 (n24: "the word after 'The': a flat step ... the word after 'The car': a sharp one"; FACTS F24), S7 (n3 "one per
dictionary entry"; n19 "the temperature setting"; n37 and the card: "a busy server batches many requests together,
and the batch size changes the arithmetic", FACTS F8), S8 (the C6 caption in three parts at phrase breaks), S9 (slide
28 cropped below its text block and lowered: the mic tag during C2 sits above the paper), S10 ("made-up odds" next to
the bookend's bubbles), S11 (both slide-32 lines in ink), S12 (post 1/ "in a large dictionary").
