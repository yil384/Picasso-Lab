# L01-02 "How Text Becomes Numbers" - script draft B (the worked example first)

> Note (2026-10-07): written for the first cut. Its hook used slide 19's second example, which the user's rule
> (`daily/PROMPT.md`, first of the "Rules for the night") forbids; that example is replaced below by a pointer, and the film now uses our
> own example "eucalyptus" (see `../SCRIPT.md` and `../FACTS.md` T20).

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 1, slides 12-19 (tokenization),
recording 24:19-41:05. Vertical 1080x1920, English, the line look (warm paper, self-drawing ink, red pen, watercolour
washes, taped slide printouts, her clips with the mic tag). Target 6:00 (planned 5:58 with the five passed clips).

Angle B: the slide's own examples are the spine, in the order she gives them: the sample sentence (13 tokens / 55
characters) -> the BPE trace on {low:5, lower:2, newest:6, widest:3}, round by round, ties shown -> the slide's second
example, 7 -> 1. Analogies (card catalogue, librarian, ribbon, glue) appear only as one-line support for a step of
the example, never as their own sequence. Every fact is from FACTS.md in its safe wording; the row ids are given per
line. Taped: slides 15, 17, 19 only. Not shown: 13, 14, 18 (told with lettering). Slide 16 is told with lettering.

## 2. Beats
| # | Time | Panel picture (what is drawn, what the pen does) | Voice |
| --- | --- | --- | --- |
| 0 | 0:00-0:11 | Hook. Seven paper clippings, one per piece of the slide's second example, cut from slide 19, laid in a row; a tally "7" in pen under them. Then they slide together into one clipping, a red "1" under it. A red "?" between the two numbers. | n0, n1 |
| 1 | 0:11-0:19 | Cover: line_token_mill drawing itself, a paper ribbon going in, blank tiles dropping in the tray. Title lettering "How Text Becomes Numbers", strip "CSE 291P - Lecture 1 - UC San Diego". | n2 |
| 2 | 0:19-0:41 | Mic tag. Then the tray of tiles; the pen letters three labels on a strip: "price per token", "context in tokens", "work per token". Blue wash. Small callback lettering "L01-01: big and expensive" with an arrow to "counted in tokens". | C1, n3, n4, C2b, n5 |
| 3 | 0:41-1:20 | Slide 19 taped in, its bottom (the second example) covered by a folded paper flap. Pen underlines the sample sentence; lettering "55 characters". The sentence is then re-lettered as 13 small tiles: Hello / students / ! / Token / ization / is / the / foundation / of / L / LM / s / . ; pen rings "ization", "L", "LM", "s" ("not words"). Under "Hello" the pen writes 9906, under "." 13; the slide's printed id list is boxed. | n6, n7, n8, n9, n10 |
| 4 | 1:20-1:36 | line_card_catalog draws itself; the open drawer gets the label "9906", a card inside reads "Hello". Lettering: "text <-> list of numbers", "fixed vocabulary". | n11, n12 |
| 5 | 1:36-2:22 | Slide 15 taped in. Pen brackets the three columns. Left: line_lost_word (the librarian with the blank slip; the pen writes "new word? typo?" on the slip). Middle: line_long_ribbon (the coil; the pen writes "55" on the ribbon, "13" on a short strip beside it). Mic tag for C3; line_balance tips: "fewer tokens" vs "learns something". Back to the slide: pen boxes "BPE ... bottom-up [Sennrich+ 2015]" and "Unigram ... Top-Down [Kudo+2018]", arrows up and down. Then the red pen strikes through "used by Google Gemini series" and writes "SentencePiece, yes; Unigram: not stated". | n13, (C5b if it passes), n14, n15, C3, n16, n17, n18, n19 |
| 6 | 2:22-2:42 | Recipe card (note card lettering, slide 16 not taped): "1 split into letters / 2 count neighbouring pairs / 3 glue the most frequent / 4 repeat to target size". Small margin note "1994: compression". | n20, n21 |
| 7 | 2:42-4:08 | The centrepiece. Slide 17 taped in at the top, small; below it four rows of letter tiles: l o w x5, l o w e r x2, n e w e s t x6, w i d e s t x3, and a vocabulary strip of 10 tiles "d e i l n o r s t w" with "target 13" in pen. Round 1: the pen rings e-s in newest and widest, writes "6 + 3 = 9"; then rings s-t, writes "9" and "TIE" in red; on the taped slide it adds "(s,t) = 9 too". A small card: "tie-break rule: slide takes e-s". line_glue_tiles: e+s glued; in all rows at once e s -> es; vocabulary strip gains "es" (11). A thin side panel: "s-t first? st, then e+st = est" (same result). Round 2: es-t ringed "9", glued -> est (12). Round 3: l-o ringed "5 + 2 = 7", o-w ringed "7, TIE", slide note "(o,w) = 7 too"; glued -> lo (13). Pen ticks "13 = 10 + 3, stop". The final rows are read aloud: lo w / lo w e r / n e w est / w i d est; yellow wash under "est". | n22-n34, (C8b if it passes) |
| 8 | 4:08-4:38 | Scale-up: the vocabulary strip zooms out into line_card_catalog again; the pen letters over the drawers "o200k_base: about 200,000" and, smaller, "cl100k_base: about 100,000". Back on slide 19: pen boxes the two library rows; next to "3-6x faster than legacy" it writes "README: vs one older library". | n35, n36, n37 |
| 9 | 4:38-5:25 | Payoff. The flap on slide 19 lifts: the second example. The seven clippings return under the "cl100k_base" label, 7 drawer numbers; then they glue (line_glue_tiles again) into one clipping under "o200k_base", 1 drawer number (155245). Pen: "a seventh of the tokens" (never a price). Pen draws an arrow "about 100,000 -> about 200,000: more merges". Mic tag for her clips over the single clipping; pink wash. | n38, n39, n40, n41, n42, C9, (C12b if it passes), C11 |
| 10 | 5:25-5:50 | Honest limit: the same sentence drawn as two strips, one short, one long, pen "up to 15x (Petrov et al., NeurIPS 2023)". Then the tray of tiles from the cover and the line "the bill is counted in tokens". | n43, n44 |
| 11 | 5:50-5:58 | Next-up card "Next: how the model picks the next token", then the logo end card (line), "Compute not included". | n45 |

## 3. Narration (one voice id per line; FACTS rows in brackets)
- n0: [replaced on 2026-10-07: see ../SCRIPT.md] [T20]
- n1: "Same text, a seventh of the tokens. What changed?" [T20, T22]
- n2: "To find out, we'll follow one sentence and one tiny word list from her slides, all the way through." [L01 s17, s19]
- (C1)
- n3: "Because a model never gets your letters. A tokenizer turns text into a list of whole numbers first." [T2]
- n4: "Prices are per token, the context window is counted in tokens, and the model does work for every token." [T1]
- (C2b)
- n5: "Last time, models got big and expensive. This is the unit that bill is counted in." [callback to L01-01; T1]
- n6: "Here's the sentence from her slide: Hello students! Tokenization is the foundation of LLMs." [T19]
- n7: "55 characters. Run it through GPT-4's tokenizer, cl100k_base, and you get 13 tokens." [T19, T20]
- n8: "Look at the pieces. Hello. students. An exclamation mark. Then Token, and ization." [RUN pieces; Traps]
- n9: "Then L, LM, s, and the full stop. So a token is not a word. Sometimes it's a whole word, sometimes a scrap of one." [RUN pieces; Traps]
- n10: "Each piece is a number. Hello is 9906. The full stop is 13." [RUN ids, = slide 19]
- n11: "Picture a card catalogue with a fixed set of drawers. A token is a drawer number." [T2]
- n12: "A tokenizer turns text into a list of whole numbers, and back. Each number points to one entry in a fixed vocabulary." [T2]
- n13: "So who decides where the cuts go? Her slide lists three ways." [L01 s15]
- (C5b if it passes)
- n14: "Whole words: easy to read, but the list is huge, and a new word or a typo isn't in it." [T3]
- n15: "Single characters: nothing is ever missing, but the sequences get long. Our sentence: 55 characters, against 13 tokens." [T4]
- (C3)
- n16: "Fewer tokens is cheaper. But if every sentence were one token, the model would learn nothing." [T23]
- n17: "Subwords sit in between. Byte-pair encoding builds them bottom-up: Sennrich and colleagues, 2015." [T5]
- n18: "Unigram goes top-down: start with a huge list and prune what helps least. Kudo, 2018." [T7]
- n19: "One red-pen note here: the toolkit, SentencePiece, checks out. Unigram for the named models is not stated." [T8]
- n20: "Byte-pair encoding started in 1994 as a data-compression trick. The recipe has four steps." [T6, T9]
- n21: "Split into letters. Count every neighbouring pair. Glue the most frequent pair into a new piece. Repeat until the list is big enough." [T9]
- n22: "Here's her example. A tiny corpus: low, five times. lower, twice. newest, six times. widest, three times." [T11]
- n23: "Split into letters, and the vocabulary is ten: d, e, i, l, n, o, r, s, t, w. The target is 13." [RUN initial symbols; T11]
- n24: "Round one. Count the pairs. e-s appears in newest and widest: 6 plus 3, 9 times." [T12]
- n25: "But s-t also appears 9 times. It's a tie." [T12]
- n26: "When two pairs tie, the code needs a rule. The slide's trace takes e-s first." [T16]
- n27: "Glue. e and s become one tile, es, in every word at once." [T12, T9]
- n28: "Round two. es-t, 9 times. Glue again: est." [T13]
- n29: "And if you'd taken s-t first? You'd get st, then e plus st. The same est after two rounds." [RUN note]
- n30: "Round three. l-o: 5 plus 2, 7 times. o-w ties at 7. The slide takes l-o." [T14, T16]
- n31: "Glue: lo." [T14]
- n32: "10 letters plus 3 merges: 13 entries. Target reached. Stop." [T15]
- n33: "Read the words now. lo, w. lo, w, e, r. n, e, w, est. w, i, d, est." [RUN final words]
- n34: "est got its own tile because it kept showing up. That's the whole idea: what's frequent gets glued." [T9]
- (C8b if it passes)
- n35: "Real tokenizers run the same loop far longer. GPT-4o's tokenizer, o200k_base, has about 200,000 entries." [T10, T21]
- n36: "GPT-4's, cl100k_base, has about 100,000." [T21]
- n37: "In practice you'd use a library: tiktoken, OpenAI's tokenizer library, or Hugging Face's tokenizers, written in Rust." [T17, T18]
- n38: "Now, back to the seven characters on the same slide." [T20; L01 s19]
- n39: [replaced on 2026-10-07: see ../SCRIPT.md] [T20]
- n40: "In GPT-4's tokenizer: 7 tokens." [T20]
- n41: "In GPT-4o's: 1 token. A seventh of the tokens." [T20, T22]
- n42: "What changed? The vocabulary went from about 100,000 entries to about 200,000. More merges, and this whole name got glued into one tile." [T21, T9, T20]
- (C9, C12b if it passes, C11)
- n43: "Fair warning: the gap cuts both ways. The same text translated can need up to 15 times more tokens in some languages. Petrov and colleagues, NeurIPS 2023." [T24]
- n44: "So the bill is counted in tokens, and tokens are whatever the merges made." [T1, T9]
- n45: "Next: how the model picks the next token." [T25]

Wording notes: no "seven times cheaper" anywhere (T22); no "Gemini uses Unigram" (n19 and the pen note only, T8); e-s
and l-o are never called the unique maximum (n25, n26, n30; T12, T14, T16); no speed figure is spoken (T17); "about"
on both vocabulary sizes (Traps). Do not caption her "11" or "24 alphabets" (no chosen clip contains them).

## 4. Her clips (text exactly as clips.json)
| Clip | Text | Where | Why there |
| --- | --- | --- | --- |
| C1 (3.42 s) | "So first, why do we want to understand tokenization?" | beat 2, opens the lesson after the cover | Her own question sets up n3-n4; it is literally where the lecture section starts. |
| C2b (6.87 s) | "And all these kind of model complexities are also calculated based on the number of tokens." | beat 2, after n4 | Her confirmation that cost is counted per token; leads into the L01-01 callback n5. |
| C5b (1.88 s), if it passes | "So you may have some new words," | beat 5, after n13, before n14 | Lead-in to the word-level weakness; n14 states it fully, so cutting C5b loses nothing. |
| C3 (4.10 s) | "So less is better. But is less always better? No." | beat 5, after n15 (55 vs 13) | The 55-vs-13 numbers make "less is better" concrete; her "No." turns to the balance (n16). |
| C8b (3.08 s), if it passes | "That is how BPE is working. Any questions?" | end of beat 7, after n34 | Closes the trace in her voice; the next beat starts without it if it fails. |
| C9 (9.57 s) | "Generally speaking, if you are using multi-language instead of just using English, then it's better for you to use a larger vocabulary." | beat 9, after n42 | Her general rule, right after the 7 -> 1 picture proves it. |
| C12b (2.84 s), if it passes | [replaced on 2026-10-07: see ../SCRIPT.md] | beat 9, between C9 and C11 | dropped on 2026-10-07 (the user's rule) |
| C11 (4.50 s) | "So that's why sometimes you want to have a larger vocabulary. And that's also the trend." | beat 9, last clip | Her conclusion answers the hook ("what changed?") in her words. |

Clip budget: 5 passed clips 28.5 s (8% of 5:58); with all three optional 36.3 s (10%), under the quarter cap. The
cap is 7 clips: if all three optional clips pass, drop C5b (the weakest; n14 stands alone) and keep C8b and C12b.

## 5. Panels (12) and drawing use
| P | One idea | Drawing / elements |
| --- | --- | --- |
| P0 | Hook: 7 clippings -> 1 clipping, "?" | slide 19 clippings (cut per character), pen numerals |
| P1 | Cover: text goes in, tiles come out | line_token_mill + title lettering |
| P2 | Everything is counted in tokens | mill's tray of tiles, three pen labels, callback lettering; line_mic for C1, C2b |
| P3 | One sentence = 13 tokens, 55 characters; tokens are not words; each is a number | slide 19 taped (its second example under a flap), 13 lettered tiles, pen rings and ids |
| P4 | Fixed vocabulary; a token is a drawer number | line_card_catalog (drawer "9906" -> "Hello") |
| P5 | Three granularities; the correction | slide 15 taped; line_lost_word (word level), line_long_ribbon (character level), pen boxes and the T8 correction |
| P6 | Fewer is not always better | line_balance; line_mic for C3 |
| P7 | BPE recipe in four steps | note card lettering (slide 16 told, not taped) |
| P8 | The trace, round 1 with the tie and the glue | slide 17 taped small, tile rows, line_glue_tiles, tie card |
| P9 | Rounds 2 and 3, the second tie, 13 = 10 + 3, the final words | same tile rows, vocabulary strip, side panel "s-t first", yellow wash on est |
| P10 | Real sizes and libraries | line_card_catalog zoomed out with sizes; slide 19 library rows with the README note |
| P11 | Payoff: 7 -> 1, a bigger vocabulary learned more merges | slide 19 flap lifted, clippings glued (line_glue_tiles), line_mic for C9, C12b, C11 |
| P12 | Honest limit and close | two strips of tiles (short vs long), the tray, next-up card, logo end card |

line_receipt is not used (n4's price line is carried by the tile tray; add a short receipt for "price per token" in P2
if the producer wants more picture there). Every drawing in the list except line_receipt is used; none is invented.

## 6. Length
- Narration: 46 lines, 691 words -> 265.8 s at 2.6 words/s.
- Clips (passed five): 28.5 s. Gaps: 51 items x 0.8 s = 40.8 s. Sum 5:35.
- Picture-only holds planned: cover 3 s, three glue moments in the trace 2 s each, the flap lift 2 s, the 7 -> 1 glue
  2 s, end card 5 s = about 18 s. Total about 5:53; with the optional clips (two of them, per the 7-clip cap) about 6:00.
- Rate: 691 words over about 5.9 min = about 117 words per minute (cap 150).

## Producer notes
- The seven-clipping picture (one clipping per character) is honest: decoding the cl100k_base tokens of the slide's second example
  gives one character per token (each token is that character's three UTF-8 bytes). This is not yet a FACTS row, so
  the voice says only "7 tokens"; add it to FACTS.md if the pen should write "one per character".
- n10 uses the ids from FACTS "Computed" (9906 for Hello, 13 for the full stop); both are on slide 19's printed list.
