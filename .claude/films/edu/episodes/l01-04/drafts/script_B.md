# L01-04 "Temperature and Top-p" - script draft B (the worked example first)

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego. Lecture 1, slides 25-34 (decoding: how a model
picks its next word), recording 50:41-68:13. Fourth episode of the daily series, after L01-03 "The Size of the
Dictionary". Vertical 1080x1920, 30 fps, English, the line look (warm paper, self-drawing ink, red pen, watercolour
washes with cobalt as the course accent, taped slide printouts, her clips with the mic tag "Prof. Ding · lecture 1" and
red-bordered captions, a synthetic narrator, the logo end card). Built with `kit-lesson` (items `draw`, `label`,
`printout`, `clipping`, `tape`, `card`, `ring`, `tick`, `arrow`, `underline`, `wash`, `bars`, `group`).

- Runtime: planned 7:13 (end card at 7:09). Rate model: 0.42 s a word, 0.22 s a number, 0.45 s between lines, 0.6 s
  after a clip, 0.7 s at each panel change, the holds named in the beats.
- Narration: 43 lines (n0-n42), 772 words (whitespace count, the four "=" included), 107 words per minute over the
  whole runtime (cap 160).
- Her clips: 7 (C2, C4, C6, C7, C10, C9, C11), 46.9 s, 10.8 % of the runtime (cap 25 %).
- Panels: 17 (P0 cover ... P16 bookend) + the end card.

**Angle B: the slides' own worked examples are the spine.** The film walks her numbers in her order, one step at a
time, with the red pen doing the arithmetic on her taped slides: the slide-28 tree (greedy 0.5 x 0.4 = 0.2, beam
0.4 x 0.9 = 0.36) -> the slide-30 bars (k = 6 covers 0.68, then 0.99) -> the slide-31 bars (p = 0.92: 9 words, then 3)
-> the slide-32 formula, worked live on our made-up dog chart (T = 1, 2, 0.2) -> the slide-34 rule of thumb. Our own
chart, "My dog loves ...", is the thread that ties them: it answers the hook (the cover's two replies are its two
tallest bars, at temperature 1), it is where top-p is tried by hand (45 + 30 + 12 + 8 = 95 %), and it carries the gag
(the dog only "loves homework" at high temperature, and top-p cuts it). Analogies only where a step needs a picture:
two hikers with lanterns (beam search keeps two paths), a weighted die (sampling), an oven knob (temperature), the
programmer and the storyteller (low vs high), five scratch sheets (self-consistency).

Every number and claim is from `../FACTS.md` in its safe wording (rows per line, section 3). Taped: crops of slides
28 (twice: the greedy tree, the beam tree), 30, 31, 32 (plot under a blank taped sheet) and 34 (first three columns).
Not shown: 25, 26, 27, 29, 33.

## 1. Beats (times planned by the rate model above; the voice decides)
| # | Start | Panel | On screen | Voice |
| --- | --- | --- | --- | --- |
| 0 | 0:00.0 | P0 cover | Frame 0 = the finished cover: `line_same_question`, the two bubbles lettered "My dog loves walks." / "My dog loves treats.", the prompt card, title "Temperature and Top-p", strip "CSE 291P · Lecture 1 · UC San Diego". A red "≠" between the bubbles on "two different answers". | n0, n1, n2 |
| 1 | 0:21.3 | P1 the clerk | `line_clerk_ladder` (callback): his clipboard gets "My dog loves" and its 3 ids, then "about 200,000 scores"; "each score: a logit"; the softmax card; one drawer ringed "which one?". | n3, n4, n5 |
| 2 | 0:47.6 | P2 the knobs | `line_knob_panel`: six knobs lettered as n6 names them; "best effort, not a guarantee" under seed; a red bracket "tonight" over temperature and top_p. | n6, n7, n8 |
| 3 | 1:07.7 | P3 her slide 28, greedy | Crop: the greedy text + the left tree (credit strip taped under it). The pen rings 0.5 and 0.4 on her words; "0.5 × 0.4 = 0.2"; then rings dog 0.4 and has 0.9, arrow "hidden behind a weaker word". | n9, **c2**, n10, n11 |
| 4 | 1:41.8 | P4 two lanterns | `line_two_lanterns`: signpost boards "nice 0.5" / "dog 0.4", hiker tags "The nice ..." / "The dog ...", header "beam search: keep the best 2". | n12 |
| 5 | 1:51.7 | P5 her slide 28, beam | Crop: the beam text + the right tree. "0.4 × 0.9 = 0.36", "0.36 > 0.2" (yellow), "better; still no guarantee"; mic tag for C4; "each extra word: × a number below 1"; the bland-and-loops card. | n13, n14, **c4**, n15, n16 |
| 6 | 2:30.2 | P6 a weighted die | `line_dice_hand` above; the dog chart (`bars`, T = 1, "made-up odds") grows below: 45% 30% 12% 8% 4% 1%. Ticks "roll 1" / "roll 2" on walks and treats; homework's 1% ringed, "1 in 100". | n17, n18, n19, n20 |
| 7 | 3:07.7 | P7 her slide 30, top-k | Crop with both charts and the credit line; "figure: Hugging Face blog, 2020" added; k = 6 ringed; red bracket over six bars + "0.68" (C6), "flat step" / "sharp step", bracket + "0.99" (C7); "too small here" / "too big here". | n21, **c6**, n22, **c7**, n23 |
| 8 | 3:52.5 | P8 her slide 31, top-p | Crop with both charts, braces and credit; credit fix; the definition card; the pen counts 1-9 and 1-3 under the kept bars. | n24, n25 |
| 9 | 4:14.3 | P9 top-p on the dog | The dog chart (T = 1) full width; the pen adds "45 + 30 + 12 + 8 = 95%" bar by bar; the cut at 0.9: baths and homework go to pencil, red bracket "p = 0.9"; mic tag (C10); card "her start: 0.9 · the top-p paper: 0.95 · API default: 1". | n26, **c10**, n27 |
| 10 | 4:36.8 | P10 her slide 32 | Crop: title, bullets, formula; the plot under a blank taped sheet. The pen boxes "x_i / T"; on the blank sheet "÷ T, then softmax"; underlines "Sharper" / "Flatter". | n28, n29 |
| 11 | 4:53.3 | P11 turn it up | `line_temp_knob` with the red needle + the dog chart: T 1 -> 2 during C9 (bars even out); 31% and 5% ringed; `line_dog_homework` draws itself; top-p 0.9 cuts homework (the dog fades, "cut"). Hold 1.2 s. | n30, **c9**, n31, n32 |
| 12 | 5:29.4 | P12 turn it down | Knob + a fresh dog chart: T 1 -> 0.2, walks 88%; `line_dog_leash` draws itself; "toward 0: greedy"; then the honest-limit card (80 in 1,000). | n33, n34 |
| 13 | 5:51.4 | P13 her slide 34 | Crop: the bullet + the first three columns. "Current SOTA Usage Recommendations" struck, "her rule of thumb" written above; code / chat / stories rings; bracket over both column heads "both?"; card "change temperature or top_p, generally not both". | n35, n36 |
| 14 | 6:12.8 | P14 low or high | `line_coder_storyteller`: "code: T 0 to 0.2" / "stories: T 0.8 to 1.2", "the same, careful answer" / "more random, on purpose". | n37 |
| 15 | 6:21.1 | P15 self-consistency | `line_tally_pages`: header "1 + 1 = ?" (her toy example); the boxes fill 2, 3, 2, 2, 3 on her words (C11); the notepad tallies, 2 ringed; card "5 paths ≈ 5 answers' worth of tokens". | n38, n39, **c11**, n40 |
| 16 | 6:54.1 | P16 bookend | The cover again; red tags "walks 45%" / "treats 30%" on the bubbles, "made-up odds"; under the title "temperature 1: not a glitch, the dial". | n41, n42 |
| - | 7:08.9 | end card | Logo, "Compute not included", line "Set the dial before you ask.", small print credits. 4 s, then it lifts back onto the cover (frame 0). | - |

## 2. Narration (synthetic voice; one id per line; FACTS rows per line)
| id | Panel | At | Line | FACTS |
| --- | --- | --- | --- | --- |
| n0 | P0 | 0:00.6 | Ask a model the same question twice, and get two different answers. | hook (work order); F2 (every reply a fresh draw) |
| n1 | P0 | 0:06.1 | That is not a glitch. It is a dial. | hook (work order) |
| n2 | P0 | 0:10.9 | This is Lecture 1 of Professor Yufei Ding's CSE 291P at UC San Diego. Tonight we turn that dial by hand. | L01 source key |
| n3 | P1 | 0:21.3 | Last episode's clerk is back. Feed in My dog loves, 3 tokens, and out come about 200,000 scores, one per drawer. | F35, F10 (callback L01-03) |
| n4 | P1 | 0:31.0 | Each score is called a logit. A function called softmax turns the scores into odds that add up to 100 percent. | F9, F11 |
| n5 | P1 | 0:40.5 | So which drawer does he open? Her slides call that rule a decoding strategy. | L01 slide 28 title ("Different Decoding Strategies") |
| n6 | P2 | 0:47.6 | And a request to a model's API has knobs: temperature, top_p, max output tokens, two penalties, a seed. | F1 |
| n7 | P2 | 0:55.6 | A seed asks for a repeatable draw: best effort, not a guarantee. | F7 |
| n8 | P2 | 1:01.1 | Tonight, the first two. Temperature: higher is more random, lower is more focused. | F3 |
| n9 | P3 | 1:07.7 | Her slide 28 starts with the simplest rule. Greedy: at every step, take the single likeliest word. | F12 |
| c2 | P3 | 1:15.5 | her clip C2 (5.18 s) | clips.json |
| n10 | P3 | 1:21.3 | A sentence's odds are its words' odds, multiplied. 0.5 times 0.4: the nice woman scores 0.2. | F12, F16; RUN (tree products) |
| n11 | P3 | 1:30.1 | One branch up, dog is only 0.4, but the word after it, has, is 0.9. The best word can hide behind a weaker one. | F13, F14 |
| n12 | P4 | 1:41.8 | Beam search doesn't commit that early. It keeps the best two paths at every step: two hikers, two lanterns, two branches. | F14 (+ the lantern picture) |
| n13 | P5 | 1:51.7 | One step on, the dog hiker reaches the dog has. 0.4 times 0.9 is 0.36, beating 0.2. | F14; RUN (tree products) |
| n14 | P5 | 2:01.2 | Better, but still no guarantee. And it has a habit. | F15 |
| c4 | P5 | 2:05.9 | her clip C4 (7.82 s) | clips.json |
| n15 | P5 | 2:14.3 | Every extra word multiplies in another number below one, so longer sentences score lower. | F16 |
| n16 | P5 | 2:20.6 | And always the likeliest word sounds safe, but the text comes out bland and loops. People don't write that way. | F17 |
| n17 | P6 | 2:30.2 | So, sampling: for every word, roll a die weighted by the odds. | F18 |
| n18 | P6 | 2:35.6 | Here are made-up odds for one step. My dog loves: walks, 45 percent. Treats, 30. Down to homework, at 1 percent. | F29; RUN (T = 1 row) |
| n19 | P6 | 2:45.6 | Roll twice, and you can get walks, then treats. Leave the knobs alone, and every reply is a fresh draw. There are your two answers. | F2, F29 |
| n20 | P6 | 2:56.5 | But roll from everything, and now and then a silly word gets through. 1 time in 100: my dog loves homework. | F19, F29; RUN ("1 in 100") |
| n21 | P7 | 3:07.7 | The first fix, on her slide 30: top-k. Keep only the k likeliest words, and roll among those. The slide's picture uses k = 6. | F20 |
| c6 | P7 | 3:19.1 | her clip C6 (9.82 s) | clips.json |
| n22 | P7 | 3:29.5 | That was a flat step, after The. Now a sharp one, after The car. | F21, F24 ("flat step" / "sharp step"); slide 30 axis labels |
| c7 | P7 | 3:35.9 | her clip C7 (7.36 s) | clips.json |
| n23 | P7 | 3:43.8 | A fixed k is too small when many words are fine, too big when only a few are. | F22 |
| n24 | P8 | 3:52.5 | Her slide 31 lets the group grow and shrink. Top-p: line the words up, add their odds until you reach p, keep that group, draw from it. | F23 (F24 for "grow and shrink") |
| n25 | P8 | 4:04.5 | With p = 0.92, the group is 9 words in the flat step, only 3 in the sharp one. | F24 |
| n26 | P9 | 4:14.3 | Now our dog, with p = 0.9. Walks, treats, naps, sticks: together, 95 percent. Four words in. Baths and homework, out. | F23, F29; RUN (T = 1: top-p 0.9 keeps four words, up to sticks, 0.950) |
| c10 | P9 | 4:24.8 | her clip C10 (2.61 s) | clips.json |
| n27 | P9 | 4:28.1 | That's her starting point; the top-p paper used 0.95. The API's default is 1: keep every word. | F25, F2 (top_p default 1) |
| n28 | P10 | 4:36.8 | Now the other knob. Her slide 32 has the formula. Read it as: divide every score by T, the temperature, then softmax. | F26 |
| n29 | P10 | 4:46.7 | Below 1, the favourite pulls ahead. Above 1, the odds even out. | F27 |
| n30 | P11 | 4:53.3 | Our dog at T = 1, the API's default. Turn it up to 2: every score is divided by 2. | F2, F26, F29 |
| c9 | P11 | 5:02.8 | her clip C9 (8.86 s) | clips.json |
| n31 | P11 | 5:12.3 | Walks falls to 31 percent. Homework climbs from 1 in 100 to about 1 in 20. | F29; RUN (T = 2 row; "1 in 100 to about 1 in 20") |
| n32 | P11 | 5:21.4 | Now add top-p, at 0.9. Five words reach it, and homework is cut. | F23, F29; RUN (T = 2: five words, homework cut, 0.953) |
| n33 | P12 | 5:29.4 | Turn it down to 0.2, and walks takes 88 percent. Toward 0, you are back to greedy. | F29; RUN (T = 0.2 row); F28 |
| n34 | P12 | 5:38.4 | One honest limit. Even at temperature 0, one 2025 test got 80 different answers in 1,000 runs: the server's load changes how the math is batched. | F8 (the honest limit) |
| n35 | P13 | 5:51.4 | Where to set it? Her slide 34, her rule of thumb. Code: 0 to 0.2. Chat: about 0.7. Stories: 0.8 to 1.2. | F30 |
| n36 | P13 | 6:02.4 | Her table sets both knobs, and so did our dog. The API's own reference says: change temperature or top_p, generally not both. | F4 (the second honest limit) |
| n37 | P14 | 6:12.8 | Low for code: you want the same, careful answer. Higher for a story: more random, on purpose. | F31, F3 |
| n38 | P15 | 6:21.1 | One more use for the dice: let the model work the same problem several times. | F32 |
| n39 | P15 | 6:27.8 | That's self-consistency, from Wang and colleagues, 2022: sample several reasoning paths, then go with the answer most of them reach. | F32 |
| c11 | P15 | 6:36.9 | her clip C11 (5.22 s) | clips.json |
| n40 | P15 | 6:42.7 | Her toy example. 2 shows up more, so 2 wins. The catch: 5 paths cost about 5 answers' worth of tokens. | F32 (toy example), F34 |
| n41 | P16 | 6:54.1 | So, the same question, two answers: walks at 45 percent, treats at 30. | F29, F2 |
| n42 | P16 | 7:00.4 | Not a glitch. The dial, set to 1. Now you know which way to turn it. | F2 (temperature 1), the hook |

Spoken forms for the voice file (the captions keep the written form): "top_p" -> "top p"; "k = 6" -> "k equals 6";
"p = 0.92" -> "p equals 0.92"; "T = 1" -> "T equals 1"; "CSE 291P" -> "C S E 2 91 P" (as in L01-03); "My dog loves"
in n3 gets a short pause on both sides (it is the prompt, said as a quote).

Definitions before use: logit and softmax (n4), decoding strategy (n5), temperature (n8 roughly, n28 exactly), greedy
(n9), beam search (n12), sampling (n17), top-k (n21), top-p (n24), self-consistency (n39, with "reasoning paths" set
up by n38). Tokens and the dictionary are not re-explained (L01-02, L01-03).

## 3. Her clips (text exactly as clips.json; captions show this text; mic tag "Prof. Ding · lecture 1")
| clip | At | Panel | Her words | Set up by / paid off by |
| --- | --- | --- | --- | --- |
| c2 (C2) | 1:15.5 | P3 | "For example, this one we will choose nice, and then we will choose woman, like the nice woman." | n9 defines greedy; she walks it on her tree (the pen rings 0.5 on "nice", 0.4 on "woman"); n10 does the multiplication she does not say. Open item: C2's text was normalised ("we will"), listen first. |
| c4 (C4) | 2:05.9 | P5 | "But later on, beam search has an issue. The issue is, usually beam search people find that they are preferring short sentence." | n14 "And it has a habit."; n15 gives the reason (each word multiplies in a number below one), not her claim again. |
| c6 (C6) | 3:19.1 | P7 | "if you use the top six, the overall accumulated probability of the top six tokens only adding up to 0.68." | n21 sets k = 6; the pen brackets six bars and writes 0.68 on her word. |
| c7 (C7) | 3:35.9 | P7 | "But for this one, if you have top six, you already covered 99% of the overall probability." | n22 moves the eye to the sharp chart; n23 draws the conclusion (a fixed k is wrong both ways). |
| c10 (C10) | 4:24.8 | P9 | "You should always try 0.9 at the beginning." | n26 has just used p = 0.9 on the dog; n27 places it (her start, the paper's 0.95, the API's 1). Context in the recording (66:15-66:21): top-p. |
| c9 (C9) | 5:02.8 | P11 | "But after you divide it by the temperature, they are kind of similar. So that's why when you have high temperature, you will see like it's pretty flat." | n30 turns the knob to 2 and says only "every score is divided by 2"; the bars even out while she speaks; n31 reads the new numbers. |
| c11 (C11) | 6:36.9 | P15 | "For example, 1 plus 1, some passes will give you the result 2, some passes will give you the result 3." | n39 defines self-consistency; the boxes fill on her words; n40 calls it her toy example and counts the votes. Open item: C11's text was normalised (digits), listen first. |

Not used: C1 (penalties: not on the worked-example spine; the penalties stay a lettered knob), C3 (a rhetorical
question; n11's hidden 0.9 asks it with numbers), C5 (a classroom question; C6 + C7 answer it directly), C8 (good, but
n24-n26 already show top-p working; 7 clips is the cap).

## 4. Panels (17) - drawings, lettering (exact words), pen, washes, motion
Safe zones (kit guides): nothing that matters above y 260 or below y 1480; the right rail x 880-1080, y 700-1480 is
kept clear; the caption sits at y 1300-1440; the mic tag sits top right (about x 890-1040, y 340-560) while a clip
plays, so panels with a clip keep that corner empty. Every dog chart carries the pencil tag "made-up odds".

The dog chart (`bars`), the same data everywhere: words `walks, treats, naps, sticks, baths, homework`; logits
`[-0.7985, -1.204, -2.1203, -2.5257, -3.2189, -4.6052]` (FACTS, RUN); cobalt wash; percentages shown when T is settled
(the kit rounds as `odds.py` does). Needle (P11, P12): `lo 0, hi 2`, `a0` on the lower-left end tick, `a1` on the
lower-right end tick, so T = 1 points straight up.

**P0 - cover (idea: one prompt, two replies).**
- Drawing: `line_same_question` at about 680 px wide (63 %), right of centre, from y 470 to the bottom of the safe
  area (the student's shoes may sit under the caption band later, as the ladder did in L01-03).
- Lettering on frame 0 (it is the thumbnail): title "Temperature and Top-p" (red pen title hand, one line, y about
  300); strip "CSE 291P · Lecture 1 · UC San Diego" under it; in the left bubble "My dog loves / walks."; in the right
  bubble "My dog loves / treats."; a small taped card on the desk front, "prompt: My dog loves ...".
- Pen: on "two different answers" (n0) a red "≠" between the bubbles' tails. Nothing else moves: no push.
- Wash: cobalt behind both bubbles, set on frame 0.

**P1 - the clerk (idea: 200,000 scores, which one?).**
- Drawing: `line_clerk_ladder` at about 640 px wide on the right (as in L01-03 P7), the ladder's feet above the caption.
- Lettering: header "last episode" (red). On his clipboard, on n3: "My dog loves" / "5444 · 6446 · 19620" (F35), then
  "about 200,000 scores". On n4 ("logit"): "each score: a logit" with an arrow to one drawer. Card lower left on
  "softmax": "softmax: scores → odds that add up to 100%". On n5: one drawer ringed, "which one?" (the last frame of
  L01-03), then "= a decoding strategy" under the ring.
- Pen: the ring and the arrow; red ticks pop across a few rows of drawers during n3 (the L01-03 cascade, short).
- Wash: yellow on the ringed drawer.

**P2 - the knobs (idea: the API has knobs; tonight two of them).**
- Drawing: `line_knob_panel` at 1040 px wide, centred at y 700.
- Lettering, one label per knob as n6 names it, under the strips in two staggered rows (two lines each, 32 px):
  "temperature", "top_p", "max output / tokens", "presence / penalty", "frequency / penalty", "seed"; strips 7 and 8
  get a pencil "..."; the toggle stays unlabelled. Unvoiced pencil note by knob 3: "hard stop" (F5). On n7 under
  "seed": "best effort, not a guarantee". On n8 a red bracket over knobs 1-2 lettered "tonight", and under
  "temperature": "higher: more random / lower: more focused".
- Wash: cobalt behind knobs 1 and 2 on "Tonight".

**P3 - her slide 28, greedy (idea: take the top word each time; multiply).**
- Slide: crop of slide 28 (300-dpi render): "Greedy Search: ..." and the left tree, taped at about 1.7x (about 720 px
  wide), left of the mic tag; a thin strip with the credit line "https://huggingface.co/blog/how-to-generate?" cut
  from the slide's foot and taped under it. Kit label "her slide 28".
- Pen during C2: ring "0.5" on her word "nice", ring "0.4" (woman) on "woman" (the red path is the slide's own; the
  pen does not retrace it).
- n10: lettered under the crop, "0.5 × 0.4 = 0.2" and, smaller, "the nice woman". Yellow wash under "0.2". Hold 1 s.
- n11: ring "0.4" at dog, ring "0.9" at has; a curved red arrow from 0.9 back to dog with "hidden behind a weaker
  word".

**P4 - two lanterns (idea: beam search keeps the best two paths).**
- Drawing: `line_two_lanterns` at 1040 px wide, y about 480-1170, sweeping in from the left.
- Lettering: header "beam search: keep the best 2". The signpost's boards: "nice 0.5" and "dog 0.4" (each on the board
  that points at its branch). Small tags by the hikers on n12's "two hikers": "The nice ..." and "The dog ...".
- Wash: two small yellow halos at the lanterns on "two lanterns".

**P5 - her slide 28, beam (idea: 0.36 beats 0.2; but beam has its own habit).**
- Slide: crop of slide 28: "Beam Search: ... (beam size 2)" and the right tree, at about 1.5x, left of the mic tag;
  the same credit strip under it. Label "her slide 28, again".
- n13: rings on "0.4" (dog) and "0.9" (has); lettered under the crop "0.4 × 0.9 = 0.36", then "0.36 > 0.2" with a
  yellow wash on 0.36. Hold 1 s.
- n14: a pencil-grey note "better; still no guarantee".
- C4: mic tag; the pen rests.
- n15: lettered "each extra word: × a number below 1" -> "longer sentences score lower".
- n16: a card "always the likeliest: bland, and it loops", a red loop-arrow drawn round "loops".

**P6 - a weighted die (idea: sampling; it explains the cover).**
- Drawings + chart: `line_dice_hand` at about 600 px, centred, y 360-960; the dog chart below (x 90-870, baseline
  y 1200, 100 % = 600 px), T = 1, no cut.
- Lettering: header "sampling: a weighted die"; over the chart on n18 "My dog loves ..." and the pencil tag
  "made-up odds". Percentages 45% 30% 12% 8% 4% 1% as the bars settle.
- Pen on n19: a red tick over walks lettered "roll 1", over treats "roll 2". On n20: ring homework's "1%", lettered
  "1 in 100: my dog loves homework". Coral wash at the homework bar.

**P7 - her slide 30, top-k (idea: a fixed k is wrong both ways).**
- Slide: crop from "Top-k sampling: k = 6 for this example." down to the credit "Fan et al., arXiv:1805.04833 (2018)",
  both charts, about 1000 px wide, its top at y 600 (below the mic tag). Label "her slide 30".
- On n21: ring "k = 6"; under the credit, unvoiced, "figure: Hugging Face blog, 2020" (erratum 1).
- C6: a red bracket over the left chart's first six bars; "0.68" written above it on her "0.68".
- n22: pencil tags under the charts, "flat step" (left), "sharp step" (right).
- C7: a bracket over the right chart's first six bars; "0.99" on her "99%".
- n23: under the left chart "too small here", under the right "too big here". Cobalt wash under the left bracket,
  yellow under the right. No number is read off any bar.

**P8 - her slide 31, top-p (idea: keep words until their odds reach p).**
- Slide: crop from "Top-p (Nucleus): p=0.92 ..." down to the credit "Holtzman et al. ICLR 2020", both charts with
  their braces, about 1000 px wide. Label "her slide 31". Unvoiced under the credit: "figure: Hugging Face blog, 2020"
  (erratum 2).
- n24: underline "the smallest possible set of words"; a card below the crop: "top-p: line them up, add their odds
  until you reach p, keep that group".
- n25: ring "p=0.92"; small red counts "1 2 3 ... 9" under the left chart's nine kept bars and "1 2 3" under the
  right's; light rings on the printed "0.94" and "0.97"; lettered "flat step: 9 words · sharp step: 3".

**P9 - top-p on the dog (idea: do the addition yourself).**
- Chart: the dog chart full width (x 90-870, baseline y 1200, 100 % = 700 px), T = 1; `cuts: [{at: "n26@four", p:
  0.9}]`.
- Lettering: header "top-p on our dog, p = 0.9"; "made-up odds". On n26 the pen writes, one term per word as the bar is
  ticked: "45 + 30 + 12 + 8 = 95%", then "≥ 90%" and a tick. At the cut, baths and homework go to pencil; the red
  bracket over the four kept bars, lettered "p = 0.9".
- C10: mic tag (the lettering stays left of x 700 in the top band).
- n27: a card in the empty space right of the short bars (left of the rail): "her start: 0.9 / the top-p paper: 0.95 /
  API default: 1 (keeps every word)".
- Wash: yellow under "95%".

**P10 - her slide 32 (idea: divide every score by T, then softmax).**
- Slide: crop with the title, "Temperature + Top-p (most common nowadays)", the bullets and the formula; the plot is
  covered by a blank taped sheet (paper, two tape strips); the crop ends above the plot's own credit line (bottom
  left), which leaves with the plot. Label "her slide 32".
- n28: red boxes round "x_i / T" (numerator) and "x_j / T" (denominator); on the blank sheet, big: "÷ T, then
  softmax".
- n29: underline "Sharper", then "Flatter"; on the blank sheet under the first line: "below 1: the favourite pulls
  ahead" / "above 1: the odds even out".
- Wash: cobalt under the formula.

**P11 - turn it up (idea: high temperature flattens; top-p trims the tail).**
- Drawings + chart: `line_temp_knob` at 420 px, top left (x 70-490, y 380-800), the red needle on its centre; the dog
  chart below (x 90-870, baseline y 1200, 100 % = 520 px). `temps: [{T: 1}, {at: "c9", T: 2, dur: 3.0}]`, `cuts:
  [{at: "n32@cut", p: 0.9}]`.
- Lettering: header "turn it up"; "made-up odds"; beside the knob "T = 1", struck and rewritten "T = 2" as the needle
  lands.
- Motion: during C9 the needle swings from top to the lower right and the bars even out (her words narrate it); the
  percentages come back at 31% 26% 16% 13% 9% 5%. Mic tag top right; the dog is not there yet.
- n31: ring "31%"; ring "5%" with "1 in 100 → about 1 in 20"; then `line_dog_homework` (about 460 px, top right, after
  the mic tag has gone) draws itself over a coral wash, lettered "my dog loves homework".
- n32: the cut lands: homework goes to pencil, the red bracket spans the five kept bars, lettered "top-p 0.9"; the
  homework dog fades out (group fadeOut), and the pen writes "cut" where it was. Hold 1.2 s on the gag.

**P12 - turn it down (idea: low temperature sharpens; toward 0 it is greedy; the honest limit).**
- Drawings + chart: the knob at 380 px top left (x 80-460, y 380-760); a fresh dog chart (x 90-870, baseline y 1220,
  100 % = 480 px, so 88 % stays clear of the knob); `temps: [{T: 1}, {at: "n33@down", T: 0.2, dur: 2.5}]`, no cut.
- Lettering: header "turn it down"; "made-up odds"; "T = 1" struck to "T = 0.2".
- n33: the needle swings left, walks grows to 88%, treats 12%, the rest "<1%"; ring "88%"; `line_dog_leash` (about
  360 px, top right) draws itself; by the needle's low end: "toward 0: greedy". Yellow wash under walks.
- n34: the knob and the dog fade (group), and a card with a pencil-grey border takes their place: "one honest limit" /
  "temperature 0, one prompt, 1,000 runs:" / "80 different answers" / "why: the server's load changes how the math is
  batched" / small "He & Thinking Machines Lab, 2025".

**P13 - her slide 34 (idea: her rule of thumb; and one knob at a time).**
- Slide: crop with the "Current SOTA Usage Recommendations." bullet and the table's first three columns (row names,
  Temperature, Top-p); the Key Insights column and the sentence under the table are cut off. Label "her slide 34".
- n35: strike "Current SOTA Usage Recommendations" and write above it "her rule of thumb"; ring "0.0 – 0.2" (Code
  Generation) on "Code", "0.7–0.8" (Chat) on "Chat", "0.8 –1.2" (Creative Writing) on "Stories".
- n36: a red bracket over the "Temperature" and "Top-p" heads lettered "both?"; then a card below the crop: "the
  API's own reference: change temperature or top_p, generally not both".
- Wash: cobalt down the Temperature column.

**P14 - low or high (idea: careful vs free).**
- Drawing: `line_coder_storyteller` at 1040 px wide, y about 480-1175.
- Lettering above each half on n37: "code: T 0 to 0.2" (left), "stories: T 0.8 to 1.2" (right); under them "the same,
  careful answer" and "more random, on purpose".
- Wash: cobalt behind the programmer, coral behind the storyteller (under the dragon).

**P15 - self-consistency (idea: roll several times on purpose, take the majority).**
- Drawing: `line_tally_pages` at 1040 px wide, y about 580-1270 (below the mic tag).
- Lettering: header "self-consistency"; under it on n39 "Wang et al., 2022: sample several reasoning paths, keep the
  most common answer"; on n38 a line top left "1 + 1 = ?" with a pencil "(her toy example)".
- Motion during C11: the boxes fill in ink: sheets 1, 3, 4 get "2" on her first "result 2", sheets 2 and 5 get "3" on
  "result 3".
- n40: on the notepad "2: |||" and "3: ||", a red ring round the "2"; then a card "5 paths ≈ 5 answers' worth of
  tokens".
- Wash: sage under the sheets.

**P16 - bookend (idea: the two answers were the dial).**
- Drawing: `line_same_question`, exactly the cover's layout, title and bubbles.
- Lettering on n41: red tags on the bubbles, "walks 45%" and "treats 30%", and the pencil "made-up odds". On n42
  under the title: "temperature 1: not a glitch, the dial".
- Then the end card.

**End card.** The logo (kit), "Compute not included", the line "Set the dial before you ask." Small print: "After
Prof. Yufei Ding's CSE 291P, Lecture 1, UC San Diego. Tree and bar figures on her slides: P. von Platen, Hugging Face
blog, 2020. Top-k: Fan et al., 2018. Top-p: Holtzman et al., ICLR 2020. Self-consistency: Wang et al., 2022.
Temperature 0 test: He & Thinking Machines Lab, 2025. The dog odds are made up. The narration is a synthetic voice."

## 5. Drawings
Existing, made for this episode (all checked at full size, `art/src/`): `line_same_question` (P0, P16),
`line_knob_panel` (P2), `line_two_lanterns` (P4), `line_dice_hand` (P6), `line_temp_knob` (P11, P12),
`line_dog_homework` (P11), `line_dog_leash` (P12), `line_coder_storyteller` (P14), `line_tally_pages` (P15).
Reused: `line_clerk_ladder` (P1). Plus the kit's mic, tape and wash swatches and the logo.
New drawings needed: none. Code draws only lettering, pen marks, cards, the needle, the brackets and the `bars` chart.
Characters (the student, the clerk, the two hikers, the programmer, the storyteller, the hands, the dogs) are invented;
she is never drawn.

## 6. What was cut from the lecture, and why
- Slide 25 (the agenda) and slide 27 (the text -> tokenizer -> logits pipeline, a third-party diagram): the pipeline is
  the L01-03 clerk, said once in n3-n4 with our own prompt's 3 ids (F35).
- Slide 26 (an API request screenshot with a model name): not shown; its knobs are lettered on our panel. The
  penalties (F6, her C1) and max output tokens (F5) stay as lettered knobs only: they do not touch the next-word odds
  the episode is about. The seed is voiced (F7) because the hook invites "can I make it repeat?".
- Slide 29 (the sampling tree): its "samples the whole path" note is an erratum; the dog chart and the die do its job.
- Slide 33 (a vendor's plots, a hidden table): not shown. Self-consistency is kept (the tally sheets, C11); the
  test-time-scaling line (F33) is cut: without its numbers it is a vague claim, and the episode ends better on the dial.
- Her slips ("the parameters and the top P", "gradient method", "positive search", "dark") are not quoted; none is in
  a clip.
- The slide-30/31 bar figures are used only for what FACTS clears: k = 6, 0.68, 0.99, p = 0.92, 9 words, 3 words,
  0.94, 0.97. No per-word number is read off a bar.
- "Nucleus sampling", the T = 0.5 / 0.7 / 1.5 rows of our table, the brainstorming and factual rows of slide 34 (on
  screen in the crop, not voiced): cut for pace; every voiced number is one the viewer watches the pen produce.

## 7. Length, and what to cut if the voice runs long
Planned 7:13 by the rate model (772 words, 7 clips 46.9 s, 16 panel changes, 7.6 s of holds, the 4 s end card). This
draft is number-dense; on L01-03's takes such lines ran slower than prose. If the takes come in over 7:30, cut in this
order (each stays on screen in pen): n29 (-6 s: the slide's own bullets are underlined), the second sentence of n2
(-2 s), n7 (-5 s: "best effort, not a guarantee" stays lettered under seed), the second sentence of n16 (-2 s), n22
(-6 s: the "flat step" / "sharp step" tags carry it). If it runs short of 6:30, add back F33 as one line after n40
("A 2024 industry report: answers get better the longer the model thinks at answer time."), with no numbers.

## Producer notes
- The hook: frame 0 already shows both replies; the "≠" lands on n0 at about 0:03; the answer to the puzzle is voiced
  at n19 (2:46, "There are your two answers") and closed on the cover at n41-n42.
- Honest limits voiced: F7 (seed, n7), F15 (beam, n14), F8 (temperature 0, n34), F4 (both knobs, n36). The chart sets
  both knobs in P11 on purpose (it is how slide 32 frames it), and n36 says so ("and so did our dog").
- Traps checked: no "temperature 0 is deterministic" (n33 says "toward 0", n34 the limit); no seed guarantee; no "best
  sentence" for beam; k = 6 is "the slide's picture", with the red-pen credit fix; 0.9 is "her starting point", the
  API default 1 is said (n27); slide 34 is "her rule of thumb", its title struck; the dog chart is "made-up odds" on
  every panel it appears on; no number from slide 33; "1 + 1 ... 3" is "her toy example".
- Listen first to C2 and C11 (their texts were normalised by the check).
- The mic tag corner is kept clear in P3, P5, P7, P9, P11, P15; P11's homework dog and P15's header wait for it to go.
