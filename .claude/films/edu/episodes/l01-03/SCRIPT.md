# L01-03 · "The Size of the Dictionary"

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 1, slides 20-24 (vocabulary size, its
trade-off, counting tokens locally), recording 40:55-50:51; plus the course worksheet (Lecture 1 slide 37, answered at
the start of Lecture 2: slide 5, recording 4:15-11:51). Third episode of the daily series, after L01-02 "How Text
Becomes Numbers". Runtime 6:54 (timeline.json, 413.5 s), 1080x1920, 30 fps, English only. Built with `kit-lesson` (no
new JavaScript; one kit line from the earlier attempt: `mic_<voice id>` overrides the mic tag for her lecture-2 clips):
`kit-lesson/lesson.html?ep=l01-03`. Data written by `~/picasso-work/daily/L01-03/build_ep.py` (episode.json,
strings.json) and `plan.py` (timeline.json from `plan.json`, the TTS takes and the clips).

Sources: `FACTS.md` (every number and claim, in its safe wording), `clips.json` + the two-recognizer check, her slides
20 (cropped: the Strategy column is not in FACTS), 22, 23, 24 and the (b2) box of lecture-2 slide 5 (300-dpi crop)
taped (slide 24 cropped above its third table row: the user's rule, 2026-10-07, no example in any language other
than English). All in `slides/`, git-ignored. The vendor price
screenshot (L01 s37, L02 s4) is never shown: the prices are re-lettered as "the prices on the course worksheet".
Script: synthesis of `drafts/script_A.md` (story first, the winner, 44/60) and `drafts/script_B.md` (worked example
first, 39/60), judged in `drafts/judge.md`. Grafts from B: the hook loop ("Where do they all come from?" ... "That's
where they come from"), C11 as the bridge into the worksheet (C3 dropped), "retrieval" said aloud, the bookend on the
cover cabinets, the worksheet split into two full panels, the "cheaper" tag instead of a tilting balance. Judge's
accuracy fixes taken: no "not quite dust-free" after C9, "on this price list", "hardly ever opened", the slide-22 claim
stated before it is corrected, "thinking" underlined (not struck), width / hidden size and the output layer defined
before use, no re-explaining of the context window.

Look: the L01-01 line look (warm paper, ink drawings drawing themselves, red pen, washes, taped slides, mic tag).
The analogy, carried from L01-02: the vocabulary is a library card catalogue, one drawer per entry. Tonight every
drawer holds a long strip of numbers (its embedding row), a clerk must tick every drawer for every token (the output
layer), a drawer that is hardly ever opened gathers dust (rare entries), and the API is a post office that charges by
weight (tokens): weigh it at home.

## Beats
| # | Panel | Picture | Voice |
| --- | --- | --- | --- |
| 0 | cover | `line_cabinet_tower` (ink ends above the caption band): a knee-high catalogue beside a tower of drawers; "The size of / the dictionary"; tags 32,000 / 200,000 entries; red "+ almost 700 million parameters?" (width 4,096 · input table only); during n2 the small cabinet is ringed, "one drawer per entry" (no camera push) | n0, n1, n2 |
| 1 | her slide 20 | taped, cropped to Model / Vocab Size / Era; the three sizes ringed; "128,256 with special tokens"; "its tokenizer: o200k_base"; "keeps growing" lettered down the Era column with an arrow | n3, n4, n5 |
| 2 | the question | `line_balance`: "smarter, or heavier?"; strength: smarter? / weakness: heavier? (her slide 21 lettered) | C4, n6 |
| 3 | more meaning per token | `line_glue_tiles`; the word "vocabulary" as 4 lettered tiles voc / ab / ul / ary ("Llama 2: 4 tokens"), then one red tile "vocabulary" ("Llama 3: 1 token", "inside a sentence"); "more pages fit in the context window" | n7, n8, C1, n9 |
| 4 | her slide 22 | taped; "thinking" underlined "= more meaning per step"; "3x" struck: card "not 3×; same text, Llama 2 vs Llama 3, counted by us: English novels ~12% fewer tokens, Python code ~21% fewer"; "1000 as one token" struck: card with tiles 1 0 0 0 (Llama 2) and 100 0 (Llama 3, GPT-4o's tokenizer), "a design choice, not size" | n10-n13 |
| 5 | a strip in every drawer | `line_drawer_ribbon`; 1, 2, 3 ... 4,096 along the tape; one drawer = one entry and a row of 4,096 numbers (both leave when the matrix arrives); its length: the width (hidden size); all the rows: the embedding matrix; each number: a parameter to learn | n14-n16 |
| 6 | her slide 23: the payoff | taped, cropped to the title and the first bullet; yellow wash on "Vocab Size × Hidden Dimension"; the two lines "32k Vocab ~ 131M parameters / 200k Vocab ~ 819M parameters" cut out (300-dpi render) and taped on at 1.7x, 131M and 819M highlighted one by one; "+ 688 million", "in the input table alone" | n17-n20 |
| 7 | the clerk | `line_clerk_ladder`; "the output layer" lettered on his clipboard; red ticks cascade over the wall (none under the mic tag); card: per token at width 4,096: 32,000 entries about 131 million multiply-adds, 200,000 about 819 million | n21, n22, C7, n23 |
| 8 | the dusty drawer | `line_dusty_drawer` (smaller, lower: clear of the mic tag); "seen often" on the used drawers, "rare" on the cobwebbed one, ringed; card "one honest limit" in three rows: a 2024 study, every model it tested, 0.1-1% (Land & Bartolo, EMNLP 2024) | n24, n25, C9, n26 |
| 9 | the post office | `line_postal_scale`; "priced by ~~weight~~ tokens"; "your text" on the pages, "tokens" on the dial, "API" on the envelope; "count first: will it fit? what will it cost?" | n27, n28 |
| 10 | her slide 24 | taped, cropped from the title to the "Source Code" row (lower, clear of the mic tag); "chat" written above the line with a caret between "OpenAI" and "APIs"; the first bullet underlined; ~250 ticked, 500-750 struck; card: tokens per 1,000 characters counted by us: English 216-227, code 224-340 not 500-750, 1,000 digits: 334 (GPT-4o's), ~1,000 (Llama 2); then "→ cost analysis" | n29-n31, C11 |
| 11 | the course worksheet | `line_paper`; card: 1 paper ~10,000 tokens, 5 questions, answers 300 tokens each; card: the prices on the course worksheet, per million tokens: input $1.75, cached $0.175, output $14.00 (ringed) | n32, n33 |
| 12 | the naive way | `line_receipt`; paper $0.0175 + answer $0.0042 = $0.0217 a question; × 5 questions; $0.1085 ringed; about 11 cents | n34 |
| 13 | the cache | her lecture-2 slide 5, box (b2), taped; "keep a copy: a cache"; 0.175 ringed during C13; the doubled "$" struck; $0.0455 ringed; 1st question: full price / next 4: a tenth for the paper; "a cache lasts minutes to hours, depending on the model and settings" (two rows) | n35, C13, n36 |
| 14 | retrieval | `line_scissors_strips` (out of the right rail); "20 chunks × 500 tokens"; the three strips in the hand ringed; "the 3 most relevant = 1,500 tokens" | n37 |
| 15 | which is cheaper? | `line_balance`; cached $0.0455, retrieval, 3 chunks $0.034125 "cheaper", a red ">" under the base; then 6 chunks: $0.04725, the sign flips to "<", "caching wins" | n39, C14c |
| 16 | bookend | `line_cabinet_tower` again (cover layout); + more meaning per token / - a strip in every drawer / - a score at every step / - data for the rare ones / billed in tokens: count first; every drawer of the tower ticked; one ringed: "which one?" | n40-n42 |
| - | end card | the logo; "Count before you send." | - |

## Voice (narration = a disclosed synthetic voice; slots from timeline.json)
| id | at | line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.2 | Grow a model's dictionary, and it gains almost 700 million parameters. | F8 |
| n1 | 0:05.1 | Before it has learned a thing. From 32,000 entries to 200,000. Where do they all come from? | F1, F3, F8 |
| n2 | 0:12.0 | That dictionary is the vocabulary: every token the model knows, a word or a piece of a word. Last episode's card catalogue, one drawer per entry. | F39, callback (L01-02) |
| n3 | 0:22.5 | This is Lecture 1 of Professor Yufei Ding's CSE 291P at UC San Diego. | F38 |
| n4 | 0:29.6 | Her slide 20. Llama 1 and 2, 2023: 32,000 entries. Llama 3, 2024: about 128,000. | F1, F2 |
| n5 | 0:41.0 | GPT-4o's tokenizer, 2024: about 200,000. Different families, one direction: vocabularies keep growing. | F3, F4 |
| c4 | 0:52.3 | her clip C4: "So I hope you can discuss with your classmates and try to think about what is the strength of large vocabulary and what is the weakness of large vocabulary." | check.json: exact |
| n6 | 1:03.5 | Strength first. Why would a bigger vocabulary make a model smarter? | L01 s21 |
| n7 | 1:08.8 | A bigger catalogue has room for bigger pieces: more meaning per token. | F14 |
| n8 | 1:14.2 | Take the word vocabulary. Llama 2 cuts it into 4 pieces. Llama 3 keeps it as 1 token. | F14 (RUN: " vocabulary" 4 pieces -> 1) |
| c1 | 1:21.9 | her clip C1: "And usually like the larger vocabulary means that you can encode the same meaning using less number of tokens. And less number of tokens also means like it's cheaper." | check.json: near |
| n9 | 1:33.1 | Fewer tokens per page: more pages fit in the context window, the text a model can take in at once. | F15 |
| n10 | 1:40.8 | Her slide 22 says a book would take three times the space with 32,000 entries. Not three times. | F16 (s22 erratum) |
| n11 | 1:48.5 | Same texts, both tokenizers: we measured about 12 percent fewer tokens on English novels, and about 21 percent fewer on Python code. | F16 (RUN: novels 10.6-12.6 %, Python 21.4 %) |
| n12 | 1:57.8 | Her slide also says a big vocabulary makes 1000 one token. Not quite: Llama 2 splits it into four digits. | F17 |
| n13 | 2:06.5 | Llama 3 and GPT-4o's tokenizer cut it into 100, then 0. That cut is a design choice, not a matter of size. | F17 |
| n14 | 2:17.0 | Now, heavier. Reason one: open any drawer, and inside is a long strip of numbers. | F5 (analogy) |
| n15 | 2:23.9 | Every entry gets its own row of numbers. The row's length is the model's width, its hidden size. At a width of 4,096, that is 4,096 numbers per entry. | F5 |
| n16 | 2:35.9 | Together the rows make the embedding matrix, the table at the model's input. Each number in it is a parameter the model must learn. | F5 |
| n17 | 2:45.3 | Her slide 23 multiplies it out. 32,000 entries times 4,096: about 131 million. | F6 |
| n18 | 2:55.2 | 200,000 entries at the same width: about 819 million. | F7 (same width) |
| n19 | 3:00.7 | 688 million more, in the input table alone. Almost 700 million, and every one starts untrained. | F8 |
| n20 | 3:09.5 | That's where they come from: one long strip for every new drawer. | F5, F8 |
| n21 | 3:14.4 | Reason two: the output layer, the model's last step. For every token it writes, the model scores every entry in its vocabulary. | F10 |
| n22 | 3:24.0 | Picture a clerk who must tick every drawer in the wall, for every single token. | F10 (analogy) |
| c7 | 3:29.5 | her clip C7: "So that generation, the last layer, the computation cost is proportional to the number of the size of the vocabulary." | check.json: exact |
| n23 | 3:38.1 | Same two numbers, now as work: about 131 million multiply-adds per token at 32,000 entries, about 819 million at 200,000. | F10 |
| n24 | 3:50.3 | Reason three: data. A bigger vocabulary has more rare entries, and a rare entry is seen less often in training. | F11 |
| n25 | 3:58.8 | A drawer that's hardly ever opened gathers dust. | F11 (analogy) |
| c9 | 4:02.6 | her clip C9: "But it's fine today because we have a lot of data. So that is no longer a big issue, but it used to be," | check.json: exact |
| n26 | 4:10.6 | One honest limit. A 2024 study still found under-trained entries in every model it tested: typically 0.1 to 1 percent of the vocabulary. | F12 (the honest limit) |
| n27 | 4:21.9 | Now the bill. As she said, fewer tokens is cheaper: chat APIs take text, not token IDs, but the bill is counted in tokens. | F18 (+ her C1) |
| n28 | 4:31.7 | It's a post office that charges by weight. So weigh the parcel at home: count the tokens on your own machine first. | F19 (analogy) |
| n29 | 4:39.2 | Her slide 24 has rules of thumb for 1,000 characters. English: about 250 tokens. | F21, F24 |
| n30 | 4:47.0 | Code: not 500 to 750. On today's tokenizers we measured 224 to 340, about the same as English. | F22 |
| n31 | 4:57.2 | And 1,000 digits: 334 tokens on GPT-4o's tokenizer, about 1,000 on Llama 2's. Rules of thumb vary by tokenizer: count with the real one. | F23, F24 (RUN: 1,000 digits 334 / 1,001) |
| c11 | 5:10.4 | her clip C11: "it's better to do some cost analysis." | check.json: exact |
| n32 | 5:14.4 | So the course worksheet does one. A research paper of about 10,000 tokens, five questions, answers of 300 tokens. | F25 |
| n33 | 5:23.6 | The prices on the course worksheet: $1.75 per million tokens in, $14 per million out. | F26 |
| n34 | 5:32.2 | The naive way sends the whole paper with every question: about 2 cents a question. Five questions: about 11 cents. | F27, F28 |
| n35 | 5:41.0 | Or let the post office keep a copy of the paper. That's a cache. | F29 (analogy) |
| c13 | 5:45.5 | her clip C13: "the cache input is only one-tenth of their uncached input price," | check.json: near |
| n36 | 5:51.8 | On this price list, the first question pays full price for the paper, and the next four pay a tenth. Total: about 4.6 cents. | F29, F30 |
| n37 | 6:00.9 | Or send less: retrieval. Cut the paper into 20 chunks of 500 tokens, and send only the 3 most relevant: 1,500 tokens a question. | F20, F32 |
| n39 | 6:13.0 | Retrieval, at 3.4 cents, beats the cache. Always? Fetch 6 chunks instead of 3, and caching wins. | F32, F34 |
| c14c | 6:21.7 | her clip C14c: "but sometimes one is better, sometimes the other one is better." | check.json: exact |
| n40 | 6:26.7 | So a bigger dictionary packs more meaning into each token. But it is paid for three times: a strip in every drawer, a score for every drawer at every step, and data for the rare ones. | F14, F5, F10, F11 |
| n41 | 6:39.7 | And every call is billed in tokens. Count them first. | F18, F19 |
| n42 | 6:44.1 | Every drawer now has a score. Next: how does the model pick one? | F37 |

758 narration words in 42 lines, 110 words per minute over 6:54 (voice at +8%). Her clips: 7, 44.6 s (11 % of the runtime).

## Her clips (two recognizers, not checked by ear; `~/picasso-work/clips/l01-03/check.json`)
| clip | recording | text | verdict | why there |
| --- | --- | --- | --- | --- |
| C4 | L01 42:20.0-42:29.9 | "So I hope you can discuss with your classmates and try to think about what is the strength of large vocabulary and what is the weakness of large vocabulary." | exact (text set to what both heard; was "...weakness of a large vocabulary") | she sets the episode's question |
| C1 | L01 41:31.3-41:41.4 | "And usually like the larger vocabulary means that you can encode the same meaning using less number of tokens. And less number of tokens also means like it's cheaper." | near (both drop the "like" fillers) | her own statement of the strength, on the glued tile |
| C7 | L01 49:15.8-49:23.2 | "So that generation, the last layer, the computation cost is proportional to the number of the size of the vocabulary." | exact (was "...the number, the size of...") | confirms the clerk; n23 adds the numbers |
| C9 | L01 50:08.6-50:15.3 | "But it's fine today because we have a lot of data. So that is no longer a big issue, but it used to be," | exact (was "...data. Okay, so that is...") | her view first; n26 adds the 2024 study as "still found" |
| C11 | L01 50:44.0-50:46.2 | "it's better to do some cost analysis." | exact | the bridge into the worksheet |
| C13 | L02 8:27.3-8:32.4 | "the cache input is only one-tenth of their uncached input price," | near | after the cache is defined; n36 bounds it ("on this price list") |
| C14c | L02 9:47.0-9:50.1 | "but sometimes one is better, sometimes the other one is better." | exact | her verdict on caching vs retrieval, after the flip |

Not used: C2, C3, C5e, C15 (all passed the check). C13, C14c play with the mic tag "Prof. Ding · lecture 2".

## Facts on screen beyond the voice
Slide-20 notes (F2, F3), the slide-22 cards (F16, F17), "the width (hidden size)" and "the embedding matrix" (F5), the
clerk's card (F10), the honest-limit card with its citation (F12), the slide-24 card (F21-F23), the worksheet cards and
the receipt sums (F25-F28), "a cache lasts minutes to hours, depending on the model and settings" (F31), the (b2) sums and the struck "$" (F29), the
retrieval sums (F32), $0.04725 for 6 chunks (F34). The end card's small print credits Touvron et al. 2023, Llama Team
2024, tiktoken (o200k_base), Tao et al. NeurIPS 2024, Land & Bartolo EMNLP 2024, and says the counts are ours and the
narration is synthetic. The end card credits Lectures 1 and 2.

## Drawings
New (this episode, `art.json`, image tool, checked at full size): `line_cabinet_tower`, `line_drawer_ribbon`,
`line_clerk_ladder`, `line_dusty_drawer`, `line_postal_scale`, `line_scissors_strips`. Reused: `line_balance` (twice),
`line_glue_tiles`, `line_paper`, `line_receipt`, `line_mic`. The clerk and the student are invented characters; no real
person is drawn.

## Review (drafts/review.md) and what was done
Independent review before the render: 10 must-fix, 12 should-fix. Fixed: M1 (post conditions), M2 (the false "not today's"
line deleted), M3 (every qualifier at 30 px or more), M4 (slide 23 cropped, its two number lines cut out and enlarged,
one ring each, no zoom), M5 (p3, p8 and p10 moved clear of the mic tag; p7 kept: its drawer wall fills the drawing, as
the lab drawing under the tag in L01-01), M6 (cover and bookend relaid out, no push), M7 ("chat" above the line), M8
("keeps growing" earlier, in the Era column), M9 (ring on $14.00 only), M10 (token defined in n2, F39); S1 (bridge in
n27), S3 (n23), S4 (n12, n13), S5 (">" / "<" on the balance, "beats the cache" in n39), S6 (n37), S7 (n9), S8 (two
ribbon labels leave), S10 (Lectures 1 and 2), S11 (card spacing; the unvoiced underline dropped), the c4 caption break.
Not done: S2 (the promise is kept by n42 instead: a clause in n3 cost 5 s and the film was over 7 min), S9 for p7 (the
ladder is under the caption, as legs were in L01-01), S12 (C1 is "near" by the check; listen first), the "($L$)" artefact.
To fit the 5-7 min target after the added lines, n38 was dropped (n39 says "3.4 cents"), breaths were tightened and the
narration re-voiced at +8%.

## Review 2 (drafts/review2.md)
A second reviewer checked the fixes on new frames: all must-fix items of review 1 fixed except two partly (the slide-23
rings, the post's main line). Five new must-fix items, all fixed before the final render: N1 (the 3.4-cents line left
half-written after n38 was dropped: removed), N2 (rings on lecture-2 slide 5 widened off the digits), N3 (the slide-22
underline moved off the next line), N4 (the credits reply split in two), N5 (the main post says "its input table alone
gains"); M4(b) the 131M / 819M rings replaced by yellow highlights. Should-fix S-1 to S-8 done (clipboard label in ink and
no ticks under the mic tag, ribbon above the caption band, signs under the balance's base, "chat" at 36 px, strips out of
the rail, wider slide-22 cards, wider price card, the hook's second line pulled in to 5.1 s).
