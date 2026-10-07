# L01-02 "How Text Becomes Numbers" - script draft A (story / analogy first)

> Note (2026-10-07): written for the first cut. Its hook used slide 19's second example, which the user's rule
> (`daily/PROMPT.md`, first of the "Rules for the night") forbids; that example is replaced below by a pointer, and the film now uses our
> own example "eucalyptus" (see `../SCRIPT.md` and `../FACTS.md` T20).

- Source: CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 1, slides 12-19 (tokenization),
  recording 24:19-41:05. Facts: `../FACTS.md` only, in its Safe EN wording. Clips: `../clips.json`.
- Length target: 6:00 (planned 6:01 without the optional clips, 6:11 with all three). Vertical 1080x1920, line look.
- Angle A: one everyday picture carries the whole idea, and her slides then confirm it. **The library card catalogue**:
  a fixed cabinet of numbered drawers. Text goes in, drawer numbers come out; that list is all the model sees. The
  three granularities are three ways to decide which drawers the cabinet gets; BPE decides by gluing the most common
  neighbouring tiles, and each glue makes a new drawer. The hook's payoff: the bigger cabinet learned more merges, so
  the paper clippings of the slide's second example end up glued into one drawer.
- Previous episode (L01-01 "More Is Different (and Expensive)"): one callback line only (n2).
- The cabinet stays on the sheet as a recurring element: every time a new drawer is made (es, est, lo), the pen letters
  a label plate on `line_card_catalog`; the open drawer is "the current token".

## Beats (times planned; the voice decides)
| # | Time | Panel picture (drawing, what the pen does) | Voice |
| --- | --- | --- | --- |
| 0 | 0:00-0:16 | **Hook.** Slide 19 (taped) is shown only as its bottom line; scissors-cut: the slide's second example lifts off as seven paper clippings in a row. Left of them the pen letters "GPT-4's tokenizer: 7"; seven small tiles drop under the clippings. Right: "GPT-4o's: 1" and one tile, with a red "?" box around the gap between. 3 s hold on the puzzle. | n0, n1 |
| 1 | 0:16-0:32 | **Cover.** `line_token_mill` draws itself: paper ribbon in, blank tiles out into the tray. Title lettering "How Text Becomes Numbers", strip "CSE 291P · Lecture 1 · UC San Diego". Mic tag for C1. | n2, **C1** |
| 2 | 0:32-1:05 | **The cabinet.** `line_card_catalog` draws itself (y sweep); the pen numbers the label plates (#0, #1 ... a few legible, the rest ticks). A paper ribbon lettered "Hello students! ..." feeds into the mill on the left of the cabinet; out the right comes a strip of drawer numbers. Pen boxes the strip: "this is all the model sees". Note card: "tokenizer: text -> list of whole numbers -> text". | n3, n4, n5, n6 |
| 3 | 1:05-1:21 | **Her sample sentence as tiles.** The sentence lettered across the page, then cut by red ticks into 13 letter tiles: Hello / students / ! / Token / ization / is / the / foundation / of / L / LM / s / . Counters: "55 characters" (grey), "13 tokens" (red). Pen rings "Token" + "ization" and "L" + "LM" + "s": "not a word". | n7, n8 |
| 4 | 1:21-1:55 | **Why count drawers.** `line_receipt` unrolls: three lines lettered on it, "price: per token", "context window: in tokens", "work: per token". Mic tag C2b. Then `line_balance`: left pan "fewer tokens = cheaper" sinks; C3 plays; the pen writes "learn something" on the right pan and the scale levels. | n9, **C2b**, n10, **C3**, n11 |
| 5 | 1:55-2:39 | **Slide 15 taped** (three granularities). Pen numbers the three columns 1, 2, 3. (1) `line_lost_word`: the librarian's blank slip gets a misspelt word in red, the dictionary has no drawer for it (C5b here, if it passes). (2) `line_long_ribbon`: the sentence as one-letter squares coiling on the floor, "55" vs "13". (3) back on the slide: pen underlines "bottom-up" and "Top-Down", credits "Sennrich et al., 2015" and "Kudo, 2018"; on "used by Google Gemini series" the pen strikes and writes "SentencePiece, yes; Unigram: not stated". | n12, (C5b), n13, n14, n15, n16, n17 |
| 6 | 2:39-3:01 | **The recipe.** `line_glue_tiles` draws itself. Beside it four numbered note cards: "split into letters / count neighbouring pairs / glue the most frequent / repeat until big enough". Small strip: "1994: a data-compression trick". | n18, n19, n20 |
| 7 | 3:01-3:29 | **Slide 17 taped**, then the trace grows under it on the paper: four rows of letter tiles, with multipliers lettered at left: l o w x5, l o w e r x2, n e w e s t x6, w i d e s t x3. The cabinet (small, top corner) shows 10 lettered drawers d e i l n o r s t w. Round 1: pen rings every e-s, writes "6 + 3 = 9"; then rings every s-t, "also 9"; a small red bracket "tie"; a note card "rule: the slide takes e-s". 3 s hold while the pen adds "tie" in the margin of the taped slide too. | n21, n22, n23, n24 |
| 8 | 3:29-4:12 | **Glue rounds.** Round 1 glue: every e-s pair pressed into one wider tile across both words (hands from `line_glue_tiles` stamp once), drawer 11 labelled "es". Round 2: es-t rings, "9", glue: "est", drawer 12. A small grey side-note: "s-t first: st, then e+st = est, same". Round 3: l-o rings "5 + 2 = 7", o-w rings "also 7", "tie", glue: "lo", drawer 13; the pen adds the second tie on the taped slide. Final rows: lo w / lo w e r / n e w est / w i d est. Pen: "10 + 3 = 13" boxed. (C8b here, if it passes.) | n25, n26, n27, n28, n29, (C8b), n30 |
| 9 | 4:12-4:44 | **Scale up.** The 48-drawer cabinet pulls back into a wall of cabinets; lettering "about 200,000 entries: o200k_base (GPT-4o)". **Slide 19 taped** whole: pen boxes the two library names, writes "README: vs one older library" by the speed claim; underlines cl100k_base, rings "Number of tokens: 13". A smaller wall labelled "about 100,000: cl100k_base (GPT-4)". | n31, n32, n33 |
| 10 | 4:44-5:12 | **The payoff.** The seven clippings from the hook return. Under the 100,000 wall: seven tiles, "7". Mic tag C9 over it. Then the clippings slide together and the glue hands press them into one clipping; one tile drops into one drawer of the 200,000 wall, the pen letters "1" and "a seventh of the tokens". 3 s hold on the joined clipping (blue wash blooms behind it). | n34, n35, **C9**, n36, n37 |
| 11 | 5:12-5:31 | **Her trend line.** Mic tag; caption C12b (if it passes) over the joined clipping, then C11 while the pen draws an arrow from the small wall to the big one, "trend: bigger vocabularies". Then a pen bracket under seven tiles of different widths for a short honest note: "same text translated: up to 15x more tokens in some languages (Petrov et al., NeurIPS 2023)". | (C12b), **C11**, n38 |
| 12 | 5:31-5:56 | **Recap.** `line_balance` returns small (fewer tokens / learn something). Then the full chain drawn left to right in one pen line: ribbon -> mill -> cabinet -> drawer numbers -> receipt. Last card: "Next: how the model picks the next token." | n39, n40, n41 |
| 13 | 5:56-6:01 | Logo end card (line), "Compute Not Included". | - |

## Narration (720 words; one voice id per line)
| id | Line | FACTS |
| --- | --- | --- |
| n0 | [replaced on 2026-10-07: see ../SCRIPT.md] | T20 |
| n1 | Same text. What changed? By the end of this video, you can answer that yourself. | T20 (hook, no claim) |
| n2 | Last time, models got big and expensive. Today: the unit they are counted in. This is Professor Yufei Ding's course at UC San Diego, CSE 291P, Lecture 1. | L01 (source key); T1 |
| n3 | Because a model never reads letters. It never reads words either. It reads numbers. | T2 |
| n4 | Picture a library card catalogue. A cabinet of numbered drawers. The cabinet is built once, and then it is fixed. | T2 (analogy for "fixed vocabulary") |
| n5 | Text goes in. Out comes a list of drawer numbers. That list is all the model ever sees. | T2 |
| n6 | That is a tokenizer. It turns text into a list of whole numbers, and back. Each number points to one entry in a fixed vocabulary. | T2 |
| n7 | Her sample sentence: "Hello students! Tokenization is the foundation of LLMs." 55 characters. 13 tokens. | T19 |
| n8 | Look at the drawers it opens. "Token" is one. "ization" is another. Then "L", then "LM", then "s". A token is not a word. | T19 (RUN pieces); Traps |
| n9 | Why count drawers? Prices are per token, the context window is counted in tokens, and the model does work for every token. | T1 |
| n10 | So fewer tokens is cheaper. | T23 |
| n11 | If every sentence were one token, the model would learn nothing. So the real question is: which drawers does the cabinet get? | T23 |
| n12 | Her slide gives three answers. | L01 s15 |
| n13 | One: a drawer for every whole word. Easy to read, but the cabinet is huge, and a new word or a typo isn't in it. | T3 |
| n14 | Two: a drawer for every single character. Nothing is ever missing, but the sequences get long. Our sample sentence is 55 characters, and 13 tokens. | T4 |
| n15 | Three: subwords, in between. Byte-pair encoding builds them bottom-up. That is Sennrich and colleagues, 2015. | T5 |
| n16 | Unigram goes top-down: start with a huge list and prune what helps least. That is Kudo, 2018. | T7 |
| n17 | One red-pen note, on the Gemini line. Google's reports say SentencePiece. They do not say Unigram. | T8 |
| n18 | Now the main event. How byte-pair encoding decides which drawers the cabinet gets. | T5, T9 |
| n19 | BPE started in 1994 as a data-compression trick. The recipe has four steps. | T6, T9 |
| n20 | Split into letters. Count every neighbouring pair. Glue the most frequent pair into a new piece. Repeat until the list is big enough. | T9 |
| n21 | Her practice corpus. Low, five times. Lower, twice. Newest, six times. Widest, three times. | T11 |
| n22 | Start with letters only. That is ten drawers: d, e, i, l, n, o, r, s, t, w. | T15; RUN (initial symbols 10) |
| n23 | Round one. Count the pairs. e-s appears 6 plus 3: 9 times. | T12 |
| n24 | So does s-t. A tie. The slide takes e-s; a fixed tie-break rule decides. | T12, T16 |
| n25 | Glue. Every e-s, in every word, becomes one tile. The cabinet gets a new drawer: es. | T9, T12 |
| n26 | Round two. es-t, 9 times: est. | T13 |
| n27 | Had the rule picked s-t first, we would get st, then e plus st. The same est, after two rounds. | RUN ("taking (s,t) first ..."); T16 |
| n28 | Round three. l-o, 5 plus 2: 7 times. o-w ties at 7. The slide takes l-o: lo. | T14, T16 |
| n29 | Stop. 10 letters plus 3 merges: 13 entries. That was the target. | T15, T11 |
| n30 | That is the whole trick. The cabinet grows drawers for the pieces that show up together most often. | T9 |
| n31 | A real one just keeps going. GPT-4o's tokenizer, o200k_base, has about 200,000 entries. | T10, T21 |
| n32 | You don't build one by hand. Her slide shows tiktoken, OpenAI's tokenizer library, and Hugging Face's tokenizers library, written in Rust. | T17, T18 |
| n33 | The code loads GPT-4's tokenizer, cl100k_base: about 100,000 entries. Our sentence comes out as 13 tokens. | T21, T19, T20 (mapping) |
| n34 | [replaced on 2026-10-07: see ../SCRIPT.md] | T20 |
| n35 | In GPT-4's tokenizer: 7 tokens. | T20 |
| n36 | Now back to the cabinet. The bigger cabinet learned more merges. Somewhere along the way, these seven characters ended up glued into one drawer. | T20, T21, T9 (brief: "a bigger vocabulary learned more merges") |
| n37 | 1 token in GPT-4o's. Same text, a seventh of the tokens. | T20, T22 |
| n38 | One honest limit. Tokenizers do not treat every language the same. The same text, translated, can need up to 15 times more tokens in some languages. That is Petrov and colleagues, NeurIPS 2023. | T24 |
| n39 | And the balance still holds. Fewer tokens is cheaper, but the model still has to learn something. | T23 |
| n40 | So. A model never sees letters or words. It sees drawer numbers from a fixed cabinet, built bottom-up by gluing common pairs. And context, compute and price are all counted in those numbers. | T1, T2, T5, T9 |
| n41 | Next: how the model picks the next token. | T25 |

Checks: never "seven times cheaper" (T22); never "Gemini uses Unigram" (n17 says the reports do not say it, T8); both
ties stated (n24, n28); "about" on both vocabulary sizes; no speed figure in the voice (T17); "24 alphabets" and
"11" not used. n35 deliberately does not say "one token per character" (not in FACTS).

## Her clips (text exactly as clips.json)
| Clip | Text | Where | Why there |
| --- | --- | --- | --- |
| C1 (3.42 s) | "So first, why do we want to understand tokenization?" | Beat 1, after n2, before n3 | She asks the episode's question; n3 answers with "Because...". |
| C2b (6.87 s) | "And all these kind of model complexities are also calculated based on the number of tokens." | Beat 4, after n9 | Her own words confirm the receipt: everything is counted in tokens. |
| C3 (4.1 s) | "So less is better. But is less always better? No." | Beat 4, after n10 | Turns the balance; n11 gives the reason (T23). |
| C9 (9.57 s) | "Generally speaking, if you are using multi-language instead of just using English, then it's better for you to use a larger vocabulary." | Beat 10, after n35 (the 7 tiles) | Her reason for the bigger cabinet, right before the clippings glue. |
| C11 (4.5 s) | "So that's why sometimes you want to have a larger vocabulary. And that's also the trend." | Beat 11, after n37 | Closes the payoff in her voice; the pen draws the trend arrow. |
| C5b (1.88 s), if it passes | "So you may have some new words," | Beat 5, after n12, before n13 | Leads into the lost-word librarian. Without it n12 -> n13 reads straight on. |
| C8b (3.08 s), if it passes | "That is how BPE is working. Any questions?" | Beat 8, after n29 | Her sign-off on the trace; without it n29 -> n30 reads straight on. |
| C12b (2.84 s), if it passes | [replaced on 2026-10-07: see ../SCRIPT.md] | Beat 11, after n37, before C11 | dropped on 2026-10-07 (the user's rule) |

Clip time: 28.5 s required (8% of the runtime), 36.3 s with all three optional (10%); 5 to 8 clips; all well under a
quarter. Each plays with the `line_mic` tag "Prof. Ding, lecture 1" and red-bordered captions.

## Panels (13 + end card, one idea each)
| Panel | Idea | Drawing use |
| --- | --- | --- |
| P0 | The puzzle: 7 vs 1 | slide 19 bottom line cut into seven paper clippings; lettered tiles |
| P1 | Cover: the tokenizer is a machine | `line_token_mill` (cover and tokenizer) |
| P2 | Fixed vocabulary = a cabinet of numbered drawers; text in, numbers out | `line_card_catalog` + `line_token_mill` small at its left |
| P3 | A token is a piece, not a word (13 pieces, 55 characters) | lettered tiles only |
| P4 | Everything is counted in tokens | `line_receipt` with lettered lines |
| P5 | Fewer is cheaper, but must still learn | `line_balance` |
| P6 | Three ways to fill the cabinet (slide 15 taped, the Gemini correction) | taped slide 15; pen marks |
| P7 | Word-level misses new words | `line_lost_word` |
| P8 | Character-level gets long | `line_long_ribbon` |
| P9 | The BPE recipe | `line_glue_tiles` + four note cards |
| P10 | The trace with both ties (slide 17 taped) | taped slide 17; tile rows; the cabinet small in the corner getting drawers 11-13; `line_glue_tiles` hands as the glue stamp |
| P11 | Real tokenizers (slide 19 taped), 100k vs 200k | taped slide 19; `line_card_catalog` repeated as two walls of cabinets |
| P12 | The payoff: seven clippings glued into one | the clippings; `line_glue_tiles` hands; cabinet wall |
| P13 | Honest limit + recap chain + next | tiles; `line_balance` small; mill, cabinet, receipt in one line |
| End | Logo end card | logo |

Not shown: slides 13, 14, 18 (their content is lettered: the pricing idea on the receipt, encode/decode on P2, 13 tokens /
55 characters on P3).

## Word count and runtime
- Narration: 720 words, 42 lines -> 277 s at 2.6 words/s.
- Clips: 28.5 s (required five); +7.8 s if C5b, C8b, C12b all pass.
- Gaps: 47 items x 0.8 s = 37.6 s (+2.4 s with the optional clips).
- Silent holds: 3 s hook, 3 s round-1 tie, 2 s + 2 s glue rounds, 3 s payoff = 13 s; end card 5 s.
- Total: about 6:01 (6:11 with all optional clips). Pace 720 words / 6.0 min = 120 words per minute (limit 150).
