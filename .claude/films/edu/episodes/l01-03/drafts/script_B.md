# L01-03 "The Size of the Dictionary" - script draft B (the worked example first)

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego. Lecture 1, slides 20-24 (vocabulary size, its
trade-off, counting tokens locally), recording 40:55-50:51; plus the course worksheet (L01 slide 37), answered at the
start of Lecture 2 (slides 4-6, recording 4:15-11:51). Third episode of the daily series, after L01-02 "How Text
Becomes Numbers". Vertical 1080x1920, English, the line look (warm paper, self-drawing ink, red pen, watercolour
washes, taped slide printouts, her clips with the mic tag and red-bordered captions). Narration: a synthetic voice.

Length: target 6:00. Planned 5:51 by the brief's formula (691 narration words, 7 clips 37.7 s, gaps, 9 s of holds);
118 words per minute; her clips 10.8 % of the runtime. See section 6 for the number-heavy reality check.

Angle B: the slides' own numbers are the spine, in her order: the slide-20 table of sizes -> the slide-22 promises,
measured -> the slide-23 multiplication (the hook paid off) -> the per-token scoring cost (the same two numbers again)
-> the slide-24 rule-of-thumb table, corrected -> the course worksheet, line by line ($0.0217, $0.1085, $0.0455,
$0.034125) and where caching wins. The drawings illustrate one number each; the arithmetic is lettered by hand and the
red pen corrects it on the taped slides. Analogy (carried from L01-02): the vocabulary is a card catalogue, one drawer
per entry; tonight every drawer holds a paper strip of 4,096 numbers, a clerk must score every drawer at every step, a
rarely opened drawer gathers dust, and the API is a post office that charges by weight.

Every number and claim is from `../FACTS.md` in its safe wording (row ids per line). Taped: slides 20, 22, 23, 24 and a
crop of L02 slide 5's "(b2)" box. Slide 21 is lettered (not taped). L01 slide 37 / L02 slide 4 (vendor screenshot) and
L02 slide 6 are never shown: the setup, the prices and the totals are re-lettered by hand; the worksheet's model name
appears nowhere.

## 2. Beats (times planned by the brief's formula; the voice decides)
| # | Time | Panel picture (what is drawn, what the pen does) | Voice |
| --- | --- | --- | --- |
| 0 | 0:00-0:12.7 | **P0 cover.** Frame 0: `line_cabinet_tower` complete, title lettering "The size of the dictionary", strip "CSE 291P · Lecture 1 · UC San Diego". 0:01 the pen letters "32,000" on the small cabinet's top, 0:02.5 "200,000" on the tall one; 0:04 a red note card on the tall cabinet's lower drawers: "+ almost 700 million parameters?" with small print "(width 4,096 · input table only)"; coral wash blooms behind the tall cabinet. Hold on the red "?". | n0, n1 |
| 1 | 0:12.7-0:32.4 | P0 continued: the camera eases onto the small cabinet. The pen letters "vocabulary" on its top and, on one label plate, "1 drawer = 1 entry"; a little card "token = drawer number" (L01-02's picture). Pull back to both cabinets as the course strip underlines. | n2, n3 |
| 2 | 0:32.4-0:45.9 | **P1 her slide 20** taped (slight tilt, two tape strips). Pen ticks 32,000, 128,000, ~200,000 as they are read. Margin note at 128,000 (a note, not a strike): "128,256 with special tokens". Next to GPT-4o: "its tokenizer: o200k_base". A red bracket down the Model column, "different models"; a red arrow down the Vocab Size column, "keeps growing". Cobalt wash on the size column. | n4, n5, n6 |
| 3 | 0:45.9-0:56.7 | **P2 the question.** `line_balance` draws itself. Above it, her slide 21 lettered: "Strength: why do larger vocabs make a model 'smarter'?" / "Weakness: why 'heavier'?". The left pan gets "smarter?", the right pan "heavier?". Mic tag "Prof. Ding · lecture 1", red captions. | C4 |
| 4 | 0:56.7-1:10.6 | **P3 smarter: fewer tokens.** `line_glue_tiles`: the pen writes "7 tokens" across the two tiles; at the glue line they become "1 token" (callback lettering "last episode: 7 -> 1"). Then a long red bracket under the hands, lettered "context window: counted in tokens"; the glued tile takes one slot of it, the rest of the bracket fills with "fewer tokens per page: more pages fit". Yellow wash under "1 token". | n7, n8 |
| 5 | [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)] |
| 6 | 1:45.4-1:49.3 | P2 again: the balance. The pen drops a small inked weight lettered "trade-offs?" onto the "heavier?" pan and draws a heavy red down-arrow under it. Mic tag. | C5e |
| 7 | 1:49.3-2:06.3 | **P5 one drawer, one strip.** `line_drawer_ribbon` draws itself top to bottom. The pen numbers positions along the tape: "1 · 2 · 3 · ... · 4,096" (the last number at the coil on the floor), and letters on the drawer plate "1 entry". Then "each number: a parameter, learned" along the coil. Cobalt wash along the tape. | n13, n14 |
| 8 | 2:06.3-2:31.8 | **P6 her slide 23** taped: the hook paid off. Pen underlines "Vocab Size × Hidden Dimension", rings "131M" and "819M". Below the slide, lettered line by line as they are spoken: "32,000 × 4,096 = 131,072,000" / "200,000 × 4,096 = 819,200,000 (same width)" / red box "difference: 688,128,000 - input table alone". Yellow wash under the red box. An arrow up to a re-lettered "almost 700 million?" from the cover; the "?" becomes a tick. Hold 1.5 s. | n15, n16, n17, n18 |
| 9 | 2:31.8-2:57.7 | **P7 the clerk.** `line_clerk_ladder`: as n19 runs, quick red ticks pop across the wall of drawers, row after row (stampGrid of a tick), faster and faster; the clipboard gets "score every entry · every token". Mic tag for C7 while the ticks keep going. Then two lettered lines beside the ladder: "4,096 × 32,000 ≈ 131 million multiply-adds per token" / "4,096 × 200,000 ≈ 819 million", a small red "same numbers as the table" with an arrow back up the sheet. | n19, C7, n20 |
| 10 | 2:57.7-3:23.4 | **P8 the dusty drawer.** `line_dusty_drawer`: the pen labels the open drawers "opened often" and the cobwebbed one "rare: seen less often in training". Mic tag for C9 (the spider swings on its thread). Then the honest-limit card, pencil-grey border: "One honest limit: under-trained entries in every model tested, typically 0.1-1% of the vocabulary. Land & Bartolo, EMNLP 2024." | n21, C9, n22 |
| 11 | 3:23.4-3:43.1 | **P9 the post office.** `line_postal_scale`: the pen letters "your text" on the stack of pages, "tokens" on the blank dial (the needle ringed), "API" on the envelope, and between them "text in, billed in tokens". Then a card: "count first: will it fit? what will it cost?". Sage wash on the table. | n23, n24 |
| 12 | [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)] |
| 13 | 4:10.4-4:32.4 | **P11 the worksheet.** `line_paper` draws itself (the rosette is the paper's). A note card beside it, lettered as spoken: "the course worksheet" / "1 paper ≈ 10,000 tokens (≈ 8,000 words)" / "5 questions (their tokens not counted)" / "300 tokens per answer". A second card: "the prices on the course worksheet, per 1M tokens: input $1.75 · cached $0.175 · output $14.00"; the pen rings $14.00 and $1.75 and writes "8×" between them. | n28, n29, n30 |
| 14 | 4:32.4-4:41.7 | **P12 the bill.** `line_receipt` unrolls; its lines are lettered in ink: "(a) input 10,000 × $1.75 / 1M = $0.0175" / "output 300 × $14 / 1M = $0.0042" / "one question = $0.0217" (underlined), then "(b) naive: 5 × $0.0217 = $0.1085" ringed in red. | n31, n32 |
| 15 | 4:41.7-5:06.1 | **P13 the cache: L02 slide 5, the "(b2)" box** taped as a crop. Mic tag "Prof. Ding · lecture 2" for C13. The pen strikes the doubled "$" in "$ $0.00175 * 4" (no voice), rings "$0.0455". Lettered beside it: "1st question: full price" / "next 4: a tenth". Hold 1.5 s on the fixed line. Then a small pencil note: "a cache lasts minutes to hours (model, settings)". | C13, n33, n34 |
| 16 | 5:06.1-5:18.9 | **P14 retrieval.** `line_scissors_strips` draws left to right. The pen letters "20 chunks × 500 tokens" over the strips, "best 3 = 1,500 tokens" by the hand; under it "$0.002625 + $0.0042 = $0.006825 a question" / "× 5 = $0.034125" ringed. Small print in a corner of the table top: "+ about $0.0002 to embed the paper once (not in the worksheet)". | n35, n36 |
| 17 | 5:18.9-5:29.6 | **P15 the balance again: who wins.** `line_balance` returns, the smarter/heavier labels gone. Above: "naive $0.1085" lettered small. Left pan "cached $0.0455", right pan "retrieval, 3 chunks: $0.034125", a red ">" between the two prices and "cheaper" under the right pan. Then the pen adds three more strips to the right pan, rewrites it "6 chunks: $0.04725", strikes the ">" and writes "<", and "caching wins" goes under the left pan. Mic tag for C14c. | n37, C14c |
| 18 | 5:29.6-5:46.6 | **P16 bookend.** `line_cabinet_tower` again (as on the cover). Three pen labels on the tall cabinet, one per heavier reason: "a strip in every drawer" / "a score for every drawer, every step" / "data for the rare ones". Then the clerk's ticks run over its drawers once more, every drawer gets a tick, and one drawer is ringed in red with a "?". Next-up card: "Next: temperature and top-p - how does the model pick one?". | n38, n39 |
| 19 | 5:46.6-5:50.6 | Logo end card (line), "Compute not included"; the cover drawn again under it so the last frame lands on frame 0. | - |

## 3. Narration (one voice id per line; FACTS rows in brackets)
- n0: "Grow a model's dictionary from 32,000 entries to 200,000: almost 700 million new parameters." [F8; sizes F1, F3; the condition is lettered on screen and voiced in n15-n17]
- n1: "Before it has learned a thing. Where do they come from?" [F8, Traps: "start untrained"]
- n2: "Last time, a tokenizer turned text into drawer numbers. One drawer per entry, in a fixed card catalogue: the model's vocabulary." [callback to L01-02; no new fact]
- n3: "Today: how big should that catalogue be? Worked out with her own numbers, from Lecture 1 of Professor Yufei Ding's CSE 291P at UC San Diego." [F38]
- n4: "Her slide 20. Llama 1 and 2, 2023: 32,000 entries." [F1]
- n5: "Llama 3, 2024: about 128,000. GPT-4o's tokenizer, o200k_base, 2024: about 200,000." [F2, F3]
- n6: "Different models, but one direction: vocabularies keep growing." [F4; never "one model grew six-fold"]
- (C4)
- [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)]
- n8: "And the context window is counted in tokens. Fewer tokens per page: more pages fit." [F15]
- n9: "Her slide 22 says a book would take 3 times the space. Not three times: Meta says up to 15 percent fewer tokens than Llama 2." [F16, slide-22 erratum]
- [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)]
- n11: "And 1000 as one token? Not quite. Llama 2 splits 1000 into four digits." [F17, slide-22 erratum]
- n12: "Llama 3 and GPT-4o's tokenizer cut numbers into pieces of up to three digits: 100, then 0. The rule is set on purpose, not by size alone." [F17]
- (C5e)
- n13: "Heavier. Every entry gets its own row of numbers. At a width of 4,096, that is 4,096 numbers per entry." [F5]
- n14: "A paper strip in every drawer. Each number on it is a parameter, and the model has to learn it." [F5; Traps: parameters are numbers the model will learn]
- n15: "Her slide 23 does the multiplication. 32,000 entries times 4,096: about 131 million numbers." [F6]
- n16: "200,000 entries at the same width: about 819 million." [F7, Traps: never "GPT-4o's table"]
- n17: "The difference: 688 million parameters, in the input table alone. Almost 700 million, before any of them learns anything." [F8]
- n18: "That's where they come from: one long strip for every new drawer." [F5, F8]
- n19: "Heavier, reason two. For every token it writes, the model scores every entry in its vocabulary." [F10]
- (C7)
- n20: "At a width of 4,096: about 131 million multiply-adds per token at 32,000 entries, about 819 million at 200,000. The same two numbers, now as work." [F10; equality with F6/F7 from FACTS "Computed"]
- n21: "Reason three: data. A bigger vocabulary has more rare entries, and a rare entry is seen less often in training." [F11]
- (C9)
- n22: "One honest limit. A 2024 study still found under-trained entries in every model it tested: typically 0.1 to 1 percent of the vocabulary." [F12; credit Land & Bartolo on the card; never "she is wrong"]
- n23: "Now the bill. Chat APIs take text, not token IDs. But the bill is counted in tokens." [F18]
- n24: "Think of a post office that charges by weight. Weigh the parcel at home: count the tokens on your own machine first. Will it fit, and what will it cost?" [F19; analogy from the brief]
- n25: "Her slide 24 has rules of thumb for 1,000 characters. English: about 250 tokens. We measured 216 to 227." [F21]
- n26: "Code: 500 to 750? On today's tokenizers we measured 224 to 340: about the same as English." [F22, slide-24 erratum]
- [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)]
- (C11)
- n28: "So, the course worksheet. One research paper, about 10,000 tokens. Five questions; their own tokens aren't counted. Each answer: 300 tokens." [F25]
- n29: "The prices on the course worksheet: $1.75 per million input tokens, 17.5 cents cached, $14 per million output tokens." [F26; never "today's prices", never the model name]
- n30: "Output costs 8 times as much as input on this list." [F35; never "10 times"]
- n31: "One question. Input $0.0175, output $0.0042: $0.0217 a question." [F27]
- n32: "Five questions, the paper sent every time: $0.1085, about 11 cents." [F28]
- (C13)
- n33: "On this price list, cached input costs a tenth. Cache the paper: the first question pays full price, the next four pay a tenth for it. Total $0.0455." [F30, F29]
- n34: "A cache lasts minutes to hours, depending on the model and settings." [F31; never "only minutes"]
- n35: "Retrieval systems cut documents by tokens. Cut the paper into 20 chunks of 500 tokens, send only the best 3: 1,500 tokens." [F20, F32]
- n36: "$0.034125 for all five, about 3.4 cents." [F32]
- n37: "So retrieval always wins? Fetch 6 chunks instead of 3, and caching wins." [F34; on screen $0.04725 > $0.0455 from FACTS "Computed"]
- (C14c)
- n38: "So a bigger dictionary is paid for three times: a strip in every drawer, a score for every drawer at every step, and data for the rare ones." [F5, F10, F11]
- n39: "Next: every entry has a score. How does the model pick one?" [F37]

40 lines, 691 words.

## 4. Her clips (text exactly as clips.json; all verdicts from check.json)
| Clip | Recording | Text | Verdict | Where | Why there |
| --- | --- | --- | --- | --- | --- |
| C4 (9.96 s) | L01 42:20.0-42:30.0 | "So I hope you can discuss with your classmates and try to think about what is the strength of large vocabulary and what is the weakness of large vocabulary." | exact | beat 3, after n6, over the balance and the lettered slide 21 | Her own discussion prompt is the episode's question; the pen letters slide 21 on the two pans while she asks it. |
| C5e (3.18 s) | L01 47:51.2-47:54.4 | "But is that all? Like do we have trade-offs?" | near | beat 6, after n12, the balance again | Her turn from "smarter" to "heavier", in two short questions; the weight drops on the right pan. |
| C7 (7.40 s) | L01 49:15.8-49:23.2 | "So that generation, the last layer, the computation cost is proportional to the number of the size of the vocabulary." | exact | beat 9, between n19 and n20, over the clerk's ticks | She states the rule; n20 then puts the numbers on it (131 million vs 819 million per token). |
| C9 (6.72 s) | L01 50:08.6-50:15.3 | "But it's fine today because we have a lot of data. So that is no longer a big issue, but it used to be," | exact | beat 10, between n21 and n22, over the dusty drawer | Her own caveat comes first; the honest limit (n22) then adds the 2024 study as "still found", not as a rebuttal. |
| C11 (2.21 s) | L01 50:44.0-50:46.2 | "it's better to do some cost analysis." | exact | beat 12, after n27, the pen's arrow off slide 24 | Her last words of the section are the bridge into the worksheet. |
| C13 (5.10 s) | L02 8:27.3-8:32.4 | "the cache input is only one-tenth of their uncached input price," | near | beat 15, before n33, over the slide 5 (b2) crop (mic tag "lecture 2") | Her number for the cache; n33 bounds it ("on this price list") and does the sum. |
| C14c (3.17 s) | L02 9:47.0-9:50.1 | "but sometimes one is better, sometimes the other one is better." | exact | beat 17, after n37, as the balance flips | The flip (6 chunks: caching wins) is shown; her sentence is the verdict. |

7 clips, 37.7 s: 10.8 % of 5:51 (cap 25 %). Not used: C1 (10 s; n7 makes its point with the 7 -> 1 number), C2
(C4 already asks the question), C3 (C5e makes the same turn shorter), C15 (the ending points to the next episode
instead). FACTS open item: C4, C7 and C9 carry the text both recognizers heard; listen before lock.

## 5. Panels (17) and how each drawing is used
| P | One idea | Drawing / elements |
| --- | --- | --- |
| P0 | The puzzle: +almost 700 million for a bigger dictionary (and the catalogue from last time) | `line_cabinet_tower` (cover, frame 0): small cabinet = 32,000 drawers, tall one = 200,000; title, red puzzle card, condition in small print, callback labels on the small cabinet |
| P1 | Vocabularies grew: 32,000 -> about 128,000 -> about 200,000, different families | her slide 20 taped; ticks, the 128,256 margin note, "its tokenizer: o200k_base", bracket and arrow |
| P2 | The question: smarter or heavier? | `line_balance`; slide 21 lettered; returns for C5e with the "trade-offs?" weight |
| P3 | Smarter: same text, fewer tokens, more fits in the window | `line_glue_tiles` with "7 tokens -> 1 token" and the context-window bracket |
| P4 | Smarter, measured: not 3x; 1000 is not one token | her slide 22 taped; two red-pen corrections and the measured numbers |
| P5 | Heavier 1: every entry is a row of 4,096 learned numbers | `line_drawer_ribbon` (the strip numbered 1 ... 4,096) |
| P6 | The multiplication: 131M -> 819M, 688M more (hook paid off) | her slide 23 taped; rings, three lettered lines, yellow box, the cover's "?" ticked |
| P7 | Heavier 2: a score for every entry at every token, 131M vs 819M multiply-adds | `line_clerk_ladder` with a stampGrid of ticks over the wall of drawers |
| P8 | Heavier 3: rare entries need data; the honest limit | `line_dusty_drawer`; honest-limit card |
| P9 | The bill is in tokens: weigh at home | `line_postal_scale` (dial "tokens", envelope "API") |
| P10 | The rule-of-thumb table, corrected | her slide 24 taped; tick, strike, bracket, "count with the real one" |
| P11 | The worksheet: one paper, five questions, the prices | `line_paper`; two note cards (setup; "the prices on the course worksheet") and "8×" |
| P12 | Naive: $0.0217 a question, $0.1085 for five | `line_receipt` with the lines lettered on it |
| P13 | Cached: $0.0455 (and the typo) | crop of L02 slide 5's "(b2)" box taped; strike, ring, two labels, cache-life note |
| P14 | Retrieval: 3 of 20 chunks, $0.034125 | `line_scissors_strips`; chunk labels, the per-question sum, the embedding footnote |
| P15 | Who wins depends: 6 chunks and caching wins | `line_balance` again with the two totals; ">" flips to "<" |
| P16 | Recap and the next question: every entry has a score, which one? | `line_cabinet_tower` again (bookend), three labels, the ticks, one ringed drawer, next card |

Then the logo end card. Drawings used: all six new ones (`line_cabinet_tower` twice, `line_drawer_ribbon`,
`line_clerk_ladder`, `line_dusty_drawer`, `line_postal_scale`, `line_scissors_strips`) and `line_balance` (twice),
`line_glue_tiles`, `line_paper`, `line_receipt`, `line_mic` (the kit's mic tag). Not used: `line_card_catalog` (the
small cabinet of the cover carries the callback), `line_long_ribbon` (the context window is a bracket on P3). Nothing
is drawn with code primitives except the pen marks, cards, ticks and lettering; the balance never tilts (no cut of its
beam exists): the pen's weight, arrows and ">" / "<" carry the comparison.

What the drawings really show, and how the plan respects it: the tall cabinet is about 9 x 20 drawers and the small one
4 x 3, so the pen letters the sizes, never counts drawers; the clerk stands on a rolling stepladder with a clipboard
and pencil (ticks go on the wall around him, the clipboard gets the lettering); the dusty drawer's spider hangs inside
the middle drawer (left alone), two drawers stand open with cards; the student weighs a stack of pages on a dial scale,
an envelope and a pencil on the table (the dial is blank, so "tokens" goes on it); the scissors drawing shows 12 strips
plus 3 in the hand, so the pen says "20 chunks" in words and does not number strips; `line_paper` has a rosette and two
columns (nothing is lettered on the paper itself; the two cards sit beside it).

Washes: coral on the puzzle (P0), cobalt on sizes and the strip (P1, P5), yellow on the payoffs (P3 "1 token", P6's
688 million), sage on the worksheet sheets (P9, P11-P15).

## 6. Length
- Narration: 40 lines, 691 words -> 265.8 s at 2.6 words/s.
- Clips: 7, 37.7 s. Gaps: 47 items x 0.8 s = 37.6 s. Holds: 9.0 s (after n1 1.0, after n17 1.5, the typo fix
  1.5, the flip 1.0, end card 4.0) + 0.5 s lead-in.
- Total: 5:51 (planned clock in the beats table). 691 words over 5.85 min = 118 words per minute (cap 150). Clips
  10.8 % (cap 25 %).
- Reality check: this script is number-heavy. On L01-02's TTS takes, lines full of numerals ran at about 1.8-2.0
  words/s, not 2.6. A fit on those takes (0.30 s a word, 0.62 s a number, 0.30 s a pause, about 1.2 s more for each
  long decimal like $0.034125) puts this narration at about 313 s and the film at about 6:38: still under 7:00. If the
  takes come in long, cut in this order (all of them stay on screen in pen): n6 (-4 s), n30 (-5 s), the second
  sentence of n14 (-4 s), "Will it fit, and what will it cost?" in n24 (-3 s).

## Producer notes
- The hook: the voice says "almost 700 million" at about 0:05; the red card with the full puzzle and its condition
  ("width 4,096 · input table only") is on screen by 0:04.5. The payoff picture (the multiplication, the red box) is
  held back to P6 at 2:06.
- Dollar figures are written as FACTS writes them. Check how the TTS reads "$0.0175", "$0.0217", "$0.034125": if a
  figure comes out garbled, keep it lettered and voice only the FACTS round form where one exists ("about 11
  cents", "about 3.4 cents"); $0.0217 and $0.0455 have no round form in FACTS.
- F9 (Llama 3 8B: input and output together about 1.05 billion of its 8 billion parameters; her "about 1G") is not
  voiced. If there is time, it fits after n18 as one line, or as a small pen footnote under P6.
- [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)]
  reusing that crop is wanted.
- Slide 20 needs no correction (FACTS errata): the pen only adds the 128,256 note. The caret "chat" on slide 24 keeps
  F18's wording ("chat APIs take text") and avoids "never accepted token IDs".
