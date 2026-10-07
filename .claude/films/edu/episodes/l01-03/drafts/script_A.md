# L01-03 "The Size of the Dictionary" - script draft A (story / analogy first)

- Source: CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego. Lecture 1, slides 20-24 (recording
  40:55-50:51), plus the course worksheet (Lecture 1 slide 37, answered in Lecture 2, slides 4-6, recording 4:15-11:51).
  Facts: `../FACTS.md` only, in its Safe EN wording. Clips: `../clips.json`, verdicts from `check.json` (all 7 used are
  exact or near).
- Length target: 6:00 (planned 6:00 by the brief's formula). Vertical 1080x1920, line look (warm paper, ink that draws
  itself, red pen, washes, taped slides, mic tag + red-bordered captions for her clips). Narration: synthetic voice.
- Angle A: one everyday picture carries the whole idea, and her slides come in as its proof. **The library card
  catalogue from L01-02 grows up.** The knee-high cabinet becomes a tower (32,000 -> 200,000 drawers). Every drawer
  holds a long strip of numbers (its embedding row). A clerk has to tick every drawer, every token (the output layer).
  The drawer nobody opens gathers dust (rare entries). Then the reader is the customer: the API is a post office that
  charges by weight (tokens), so you weigh the parcel at home first. The worksheet becomes mailing one paper five
  times, leaving a copy at the counter (cache), or cutting out the three strips you need (retrieval).
- Previous episode (L01-02 "How Text Becomes Numbers"): callback in n2 and n8 only. It is not re-explained.
- The hook ("almost 700 million parameters before it has learned a thing") is posed on the cover in lettering by 0:02,
  in the voice by 0:07. It pays off on the slide-23 panel (P6, 2:39): 131 million -> 819 million, +688 million.
- Running thread: "smarter vs heavier" is the balance (P2). The three "heavier" panels say First / Second / Third
  (n14, n20, n23). The voice avoids "weight" for heaviness, because model "weights" means parameters.

## Beats (times planned at 2.6 words/s + clips + 0.8 s gaps + holds; the voice decides)
| # | Time | Panel picture (drawing; what the pen does) | Voice |
| --- | --- | --- | --- |
| 0 | 0:00-0:30 | **Cover = the puzzle.** Frame 0: `line_cabinet_tower` complete. Title "The size of the dictionary" lettered in the empty paper top-left, strip "CSE 291P · Lecture 1 · UC San Diego" under it. By 0:02 the pen letters "32,000 entries" on a tag hung from the small cabinet and "200,000 entries" on a tag halfway up the tower. A red bracket joins them: "+ almost 700 million parameters?" Under it, grey: "(width 4,096 · input table only)". 2 s hold. For n2, the pen letters one small-cabinet plate "a token = a drawer number" and writes "vocabulary" above the small cabinet. For n3, the course strip gets a blue wash. | n0, n1, n2, n3 |
| 1 | 0:30-0:43 | **Her slide 20, taped.** Crop: Model / Vocab Size / Era columns. The Strategy column is folded under a blank paper flap, because its taglines are not in FACTS. Red rings: 32,000, 128,000, ~200,000. By 128,000: a red tick and the small note "128,000 + 256 special = 128,256" (F2: no correction needed). "o200k_base" is written beside GPT-4o. An arrow runs up the margin, "keeps growing", with a bracket "different families". | n4, n5 |
| 2 | 0:43-0:59 | **The question.** `line_balance` draws itself. Lettered head "Trade-off discussion". Cards sit under the pans, not on the chains: left "Strength: why smarter?", right "Weakness: why heavier?". Mic tag "Prof. Ding · lecture 1", C4 captions. On n6 the pen rings "smarter?". | **C4**, n6 |
| 3 | [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)] |
| 4 | [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)] |
| 5 | 2:03-2:29 | **A strip of numbers in every drawer.** `line_drawer_ribbon` draws itself (y sweep) while C3 plays (mic tag, captions). The pen underlines "heavier" in her caption. The tape unrolls down the page. The pen adds evenly spaced tick marks along it, "1" at the drawer and "4,096" at the floor coils. No digits are invented for the values. The drawer's label plate reads "one entry". Under it, lettered: "embedding matrix = entries x width" and "every number: a parameter to learn". Blue wash on the tape. | **C3**, n14, n15, n16 |
| 6 | 2:29-2:49 | **Her slide 23, taped: the hook pays off.** Whole for 1.5 s, then a crop of the Embedding Layer bullet. The pen underlines "Vocab Size × Hidden Dimension" and writes "width" above "Hidden Dimension". It rings "131M" (n17) and "819M" (n18). Then, big in red: "+ 688 million", and under it "almost 700 million · input table alone · all untrained at the start". The cover's red "?" tag slides in small beside it and gets a red tick. Yellow wash. 2 s hold. On the way out, the sheet scrolls past the Output Layer bullet and the pen underlines her italic "every". | n17, n18, n19 |
| 7 | 2:49-3:19 | **The clerk.** `line_clerk_ladder` draws itself. Red ticks land on drawers one by one, in time with his pencil, then sweep across the whole wall in a cascade. A note card taped on the wall's lower left (inside the frame, at least 34 px): "every entry, every token". Mic tag for C7. For n22 a second card: "per token, width 4,096: 32,000 entries -> about 131 million multiply-adds · 200,000 -> about 819 million". | n20, n21, **C7**, n22 |
| 8 | 3:19-3:50 | **The dusty drawer.** `line_dusty_drawer` draws itself (centre sweep). The eight used drawers get a soft yellow wash, and the cards in the two open drawers are lettered "seen often". The cobwebbed middle plate gets "rare" in red. 1.5 s hold on the spider. Mic tag for C9. For n25, a note card taped under the cabinet: "under-trained entries in every model tested: typically 0.1-1% of the vocabulary · Land & Bartolo, EMNLP 2024". Small red label "honest limit". | n23, n24, **C9**, n25 |
| 9 | 3:50-4:09 | **The post office.** `line_postal_scale` draws itself (x sweep). A sign is lettered in the empty wall space over the student: "POST OFFICE · priced by weight". The pen strikes "weight" and writes "tokens". The envelope reads "API: you send text"; the stack on the scale reads "your text". The pen writes "tokens" on the dial face, by the needle. A note card: "count on your own machine first: will it fit? what will it cost?" | n26, n27 |
| 10 | [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)] |
| 11 | 4:30-4:52 | **The worksheet: one paper, mailed five times.** `line_paper` (with its rosette) on the left, lettered "one research paper · about 10,000 tokens". Five small question cards are lettered "Q1"-"Q5" with "(not counted)", and the note "answers: 300 tokens each". A hand-lettered price card (never the vendor screenshot): "the prices on the course worksheet, per million tokens: input $1.75 · cached input $0.175 · output $14.00". For n33, `line_receipt` unrolls on the right with five lines "paper $0.0175 + answer $0.0042 = $0.0217". The total "$0.1085 · about 11 cents" is ringed. The pen writes "the paper sent 5 times". | n31, n32, n33 |
| 12 | 4:52-5:10 | **Leave a copy at the counter: her Lecture 2 slide 5, (b2) box only, taped.** The pen strikes the doubled "$" in "$ $0.00175 * 4" (the total is right) and rings "$0.0455". Lettered beside it: "copy kept at the counter: questions 2-5 pay a tenth for the paper". Grey note: "a cache lasts minutes to hours, depending on the model and settings". Mic tag "Prof. Ding · lecture 2" for C13. | n34, **C13**, n35 |
| 13 | 5:10-5:22 | **Send only the strips you need.** `line_scissors_strips` draws itself (x sweep). Over the strip column the pen writes "20 chunks x 500 tokens" as one label, without numbering single strips. It rings the three strips the hand lifts: "best 3 = 1,500 tokens a question". Total card: "5 questions: $0.034125 · about 3.4 cents". Small grey note: "retrieval systems cut documents by tokens". | n36, n37 |
| 14 | 5:22-5:32 | **Which wins? The balance again.** `line_balance` returns. The left pan reads "cache: $0.0455"; the right pan reads "retrieval, 3 chunks: $0.034125". The costlier pan sinks: cache goes down. Mic tag "lecture 2" for C14c. On n38 the pen changes "3" to "6" and "$0.034125" to "$0.04725", and the scale tips the other way. 2 s hold. Small grey "5 questions". | **C14c**, n38 |
| 15 | 5:32-5:55 | **Recap, then the lead-in.** `line_clerk_ladder` returns, the wall full of red ticks. A recap card is taped on the wall: "bigger vocabulary: + more meaning per token / - a strip of numbers per entry / - a score for every entry, every token / - data to learn rare entries · every call billed in tokens: count first". On n41 the pen rings one drawer with a big red circle, "which one?", and letters "Next: Temperature and Top-p". 1.5 s hold. | n39, n40, n41 |
| - | 5:55-6:00 | Logo end card (line), "Compute Not Included". | - |

## Narration (675 words, 42 lines; one voice id per line)
| id | at | Line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.3 | Grow a model's dictionary from 32,000 entries to 200,000, and you add almost 700 million parameters. | F8 (condition on screen: width 4,096, input table) |
| n1 | 0:07.3 | Before it has learned a thing. So why grow it at all? | F8; Traps ("parameters" start untrained) |
| n2 | 0:14.7 | That dictionary is the vocabulary. Last episode it was a library card catalogue: one drawer per entry, and a token is a drawer number. | callback the brief allows (L01-02: token = drawer number) |
| n3 | 0:24.7 | This is Lecture 1 of Professor Yufei Ding's CSE 291P at UC San Diego. | F38 |
| n4 | 0:30.9 | Her slide 20. Llama 1 and 2, 2023: 32,000 entries. Llama 3, 2024: about 128,000. | F1, F2 |
| n5 | 0:37.5 | GPT-4o's tokenizer, o200k_base, 2024: about 200,000. Different families, same direction: vocabularies keep growing. | F3, F4 |
| c4 | 0:43.3 | her clip C4 (see below) | check.json: exact |
| n6 | 0:54.0 | Strength first. Why would a bigger vocabulary make a model smarter? | L01 s21 (the discussion prompt) |
| n7 | 0:59.0 | A bigger catalogue has room for bigger pieces: more meaning per token. | F14 |
| n8 | [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)] |
| c1 | 1:09.5 | her clip C1 | check.json: near |
| n9 | 1:20.3 | And the context window, what a model reads at once, is counted in tokens. Fewer tokens per page: more pages fit. | F15 |
| n10 | 1:29.2 | Now the red pen checks her slide 22. | L01 s22 (the pen is ours) |
| n11 | [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)] |
| n12 | 1:45.0 | And 1000 as one token? Not quite. Llama 2 splits it into 1, 0, 0, 0. | F17 |
| n13 | 1:52.0 | Llama 3 and GPT-4o's tokenizer cut it into 100, then 0: pieces of up to three digits. The rule is set on purpose, not by size alone. | F17 |
| c3 | 2:03.2 | her clip C3 | check.json: near |
| n14 | 2:08.6 | Now, heavier. First, open any drawer: inside is a long strip of numbers. | F5 (analogy) |
| n15 | 2:14.4 | Every entry gets its own row. At a width of 4,096, that is 4,096 numbers per entry. | F5 |
| n16 | 2:21.7 | That table is the embedding matrix. Each number in it is a parameter the model must learn. | F5 (slide 23's term); Traps (parameters) |
| n17 | 2:29.1 | Her slide 23 multiplies it out. 32,000 entries times 4,096: about 131 million. | F6 |
| n18 | 2:34.9 | 200,000 entries at the same width: about 819 million. | F7 (never "GPT-4o's table") |
| n19 | 2:39.1 | That's the hook. 688 million more, in the input table alone. Almost 700 million, and every one starts untrained. | F8 |
| n20 | 2:49.2 | Second, the output end. For every token it writes, the model scores every entry in its vocabulary. | F10 |
| n21 | 2:56.6 | Picture a clerk who must tick every drawer in the wall, for every single token. | F10 (analogy) |
| c7 | 3:03.2 | her clip C7 | check.json: exact |
| n22 | 3:11.4 | Same width, same two numbers: about 131 million multiply-adds per token at 32,000 entries, about 819 million at 200,000. | F10 |
| n23 | 3:19.5 | Third, data. A bigger vocabulary has more rare entries, and a rare entry is seen less often in training. | F11 |
| n24 | 3:27.6 | A drawer nobody opens gathers dust. | F11 (analogy) |
| c9 | 3:32.2 | her clip C9 | check.json: exact |
| n25 | 3:39.7 | One honest limit: not quite dust-free. A 2024 study still found under-trained entries in every model it tested: typically 0.1 to 1 percent of the vocabulary. | F12 (the honest limit; "still found", never "she is wrong") |
| n26 | 3:50.5 | Now the bill. Chat APIs take text, not token IDs. But the bill is counted in tokens. | F18 |
| n27 | 3:57.8 | It's a post office that charges by weight. So weigh the parcel at home: count the tokens on your own machine first. Will it fit? What will it cost? | F19 (+ analogy) |
| n28 | 4:09.8 | Her slide 24 has rules of thumb for 1,000 characters. English: about 250 tokens. We measured 216 to 227. | F21, F24 |
| n29 | 4:17.9 | Code: not 500 to 750. On today's tokenizers we measured 224 to 340, about the same as English. | F22 |
| n30 | 4:25.6 | Rules of thumb vary by tokenizer. Count with the real one. | F24 |
| n31 | 4:30.6 | The course worksheet puts a price on it. One paper of about 10,000 tokens, five questions, answers of 300 tokens. | F25 |
| n32 | 4:39.1 | The prices on the course worksheet: $1.75 per million tokens in, $14 per million out. | F26 (no model name; not "today's prices") |
| n33 | 4:45.7 | The naive way mails the whole paper with every question. Five questions: about 11 cents. | F27 (on the receipt), F28 |
| n34 | 4:52.3 | Or let the post office keep a copy. That's a cache. | F29 (analogy) |
| c13 | 4:57.3 | her clip C13 (lecture 2) | check.json: near |
| n35 | 5:03.2 | The first question pays full price for the paper. The next four pay a tenth. Total $0.0455. | F29, F30 |
| n36 | 5:10.5 | Or send less. Cut the paper into 20 chunks of 500 tokens, and send only the best 3: 1,500 tokens. | F32 |
| n37 | 5:19.0 | About 3.4 cents for all five. | F32 ($0.034125 on screen) |
| c14c | 5:22.1 | her clip C14c (lecture 2) | check.json: exact |
| n38 | 5:26.1 | Fetch 6 chunks instead of 3, and caching wins. | F34 (RUN: k=6 $0.04725 > $0.0455) |
| n39 | 5:32.4 | So: bigger packs more meaning into each token. But every entry costs a strip of numbers, a score at every step, and data to learn it. | F14, F5, F10, F11 |
| n40 | 5:43.2 | And every call is billed in tokens. Count them first. | F18, F19 |
| n41 | 5:47.8 | Every drawer now has a score. Next: how does the model pick one? | F37 |

Checks against the Traps:
- 819 million is always "at the same width" (n18). It is never GPT-4o's table.
- The voice never says a bigger vocabulary makes numbers one token. n13 says the rule is set on purpose.
- "3x" is struck in pen and answered by n11 with the measured figures. "500-750" is never said without its correction (n29).
- No "today's prices", no worksheet model name anywhere, no "output costs 10x".
- The cache length appears only as F31's "minutes to hours".
- The data point is "still found" (n25), never "she is wrong".
- The hook's condition (width 4,096, input table only) is on the cover from 0:02 and in the voice at n19.
- "Different families" (n5) heads off "one model grew six-fold".
- Model names used are only the ones FACTS clears: Llama 1/2/3, and GPT-4o's tokenizer, o200k_base.

Spare lines, if the cut runs short (all cleared):
- F9: "In Llama 3 8B, the vocabulary appears twice, at the input and at the output: about 1.05 billion of its 8 billion parameters." Goes after n19.
- F13: "A 2024 study estimates Llama 2 70B would have been best with at least 216,000 entries." Goes on P15 before n39.
- F35: "Output costs 8 times as much as input on this list." Goes after n32.
- F33: "Embedding the paper once adds about $0.0002." Goes on P13 as a grey note.

## Her clips (text exactly as clips.json; 7 clips, 47.0 s, 13 % of the runtime)
| Clip | Recording | Text | Where | Why there |
| --- | --- | --- | --- | --- |
| C4 (9.96 s, exact) | L01 42:20.0-42:29.9 | "So I hope you can discuss with your classmates and try to think about what is the strength of large vocabulary and what is the weakness of large vocabulary." | P2, after n5, before n6 | She sets the episode's question herself (slide 21 is not taped; its two questions are lettered on the balance). |
| C1 (10.02 s, near) | L01 41:31.3-41:41.3 | "And usually like the larger vocabulary means that you can encode the same meaning using less number of tokens. And less number of tokens also means like it's cheaper." | P3, after n8 (7 tokens -> 1) | Her own statement of the strength, right on the glued tile. "Cheaper" also plants the bill for P9. (In the lecture it comes before C4; it is a general statement, so the order change does not alter its meaning.) |
| C3 (4.64 s, near) | L01 41:59.9-42:04.5 | "But they also like could make a model heavier in some perspective." | P5, opening, before n14 | The turn from smarter to heavier, in her words, as the drawer slides out. |
| C7 (7.4 s, exact) | L01 49:15.8-49:23.2 | "So that generation, the last layer, the computation cost is proportional to the number of the size of the vocabulary." | P7, after n21 (the clerk) | Her words confirm the clerk: the last layer's cost grows with the vocabulary. n22 then gives the numbers. |
| C9 (6.72 s, exact) | L01 50:08.6-50:15.3 | "But it's fine today because we have a lot of data. So that is no longer a big issue, but it used to be," | P8, after n24 (dust) | Her view first. n25 adds the 2024 study as "still found", not as a rebuttal. |
| C13 (5.1 s, near) | L02 8:27.2-8:32.4 | "the cache input is only one-tenth of their uncached input price," | P12, after n34 (keep a copy) | She gives the one-tenth price herself; n35 does the sum. Mic tag "Prof. Ding · lecture 2". |
| C14c (3.17 s, exact) | L02 9:47.0-9:50.1 | "but sometimes one is better, sometimes the other one is better." | P14, after n37 (3.4 cents) | Her "but" turns the apparent winner. n38 shows when caching wins. Mic tag "lecture 2". |

- Not used: C2, C5e, C11, C15. C11 ("it's better to do some cost analysis.", 2.21 s, exact) is the swap if C3 or C13 fails by ear. It would go after n27, before n28.
- The near clips C1 and C3: both recognizers dropped the "like" fillers. Listen once by ear before the captions lock (FACTS open item).

## Panels (16 + end card, one idea each)
| Panel | Idea | Drawing and how it is used |
| --- | --- | --- |
| P0 | The puzzle: a bigger catalogue, +700M before learning | `line_cabinet_tower` as drawn: the knee-high cabinet (4 x 3 drawers) and the tower (about 9 x 20 drawers) with the rolling ladder. The drawer counts are symbolic, so no plate is numbered to match 32,000 / 200,000; the tags carry the numbers. |
| P1 | Vocabularies keep growing (slide 20) | Taped slide 20, cropped; Strategy column under a paper flap; pen rings and notes. |
| P2 | The question: smarter vs heavier | `line_balance`; the slide-21 questions re-lettered under the pans. |
| P3 | Smarter: more meaning per token; the window fits more | `line_glue_tiles`: the hands glue seven lettered tiles into one. The tiles and the window frame are code. |
| P4 | Her strengths, checked (slide 22) | Taped slide 22, crops; pen strikes and tile rows. |
| P5 | Heavier, first: every entry is a row of 4,096 numbers | `line_drawer_ribbon`: the pulled-out drawer and the tape to the floor. Ticks along the tape, never invented values. |
| P6 | The payoff: 131M -> 819M, +688M (slide 23) | Taped slide 23, crop of the first bullet; the cover's "?" tag returns ticked. |
| P7 | Heavier, second: a score for every entry, every token | `line_clerk_ladder`. In the drawing he writes on a clipboard, cheerful with a sweat drop, on a rolling step-ladder before a 9 x 14 wall. The ticks on the drawers are code, timed to his pencil. |
| P8 | Heavier, third: rare entries go unlearned + the honest limit | `line_dusty_drawer`: the cobwebbed middle drawer with the spider and dust puffs. Two neighbours stand open with cards; the other six are closed and clean. |
| P9 | You pay by the token: weigh it at home | `line_postal_scale`: the hoodie student, the stack on the dial scale, the envelope and pencil on the table, bookshelf and window behind. The sign goes in the empty wall space between the plant and the window. |
| P10 | Her rules of thumb, checked (slide 24) | Taped slide 24, cropped to bullets + table. |
| P11 | The worksheet: one paper mailed five times | `line_paper` (rosette) + `line_receipt`; the price card is hand-lettered. The slide 37 / L02 slide 4 screenshot is never shown. |
| P12 | Cache: a copy at the counter, a tenth of the price | Taped crop of L02 slide 5, the (b2) box only; the pen fixes the doubled "$". |
| P13 | Retrieval: send only 3 strips | `line_scissors_strips`. The drawing shows 12 strips on the table plus 3 in the hand, not 20, so "20 chunks" is one label over the column and no strip is numbered. |
| P14 | Neither always wins | `line_balance` again (the recurring trade-off scale): 3 chunks vs 6 chunks tips it. |
| P15 | Recap; every drawer has a score: which one? | `line_clerk_ladder` again, with the recap card and the ringed drawer. |
| End | Logo end card | logo |

- `line_mic` is the mic tag on all seven clips.
- Not used: `line_card_catalog` (the tower's small cabinet carries the callback) and `line_long_ribbon` (P3's window frame carries the long-sequence point).
- Not taped: slide 21 (it has a smiley glyph; its questions are lettered), slide 37 and L02 slide 4 (the vendor screenshot), L02 slide 6 (its three totals reappear on P11-P14).

## Word count and runtime
- Narration: 675 words in 42 lines -> 259.6 s at 2.6 words/s.
- Clips: 7, 47.0 s (C4 9.96, C1 10.02, C3 4.64, C7 7.4, C9 6.72, C13 5.1, C14c 3.17).
- Gaps: 49 items x 0.8 s = 39.2 s.
- Holds: cover 2 s, slide-23 payoff 2 s, the spider 1.5 s, the balance tip 2 s, the final ring 1.5 s = 9 s. End card 5 s.
- Total: about 6:00 (5:55 to the end card).
- Pace: 675 words / 6.0 min = 112 words per minute overall (limit 150). Clip share 13 % (limit 25 %).
- Risk: the script is number-heavy. Read in full, the numbers make about 780 spoken words, which comes to about 6:40, still under 7:00.
- If the TTS runs long, cut in this order:
  1. Drop C3 and its gap (-5.4 s).
  2. n9: drop the gloss "what a model reads at once" (-2.3 s).
  3. n22: say only "Same width, same two numbers, now for every token." and leave the figures to the card (-4 s).
  4. n11: drop "Llama 3's tokenizer against Llama 2's" (the note card says it) (-2.5 s).
