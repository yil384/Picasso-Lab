# L01-02 · "How Text Becomes Numbers"

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 1, slides 12-19 (tokenization), recording
24:19-41:05. Second episode of the daily series, after L01-01 "More Is Different (and Expensive)" (`../l01-5min`).
Runtime 6:00 (timeline.json: 359.8 s), 1080x1920, 30 fps, English only. Built with `kit-lesson` (no new JavaScript):
`kit-lesson/lesson.html?ep=l01-02`. Data written by `~/picasso-work/daily/L01-02/build_ep.py` (episode.json, strings.json)
and `plan.py` (timeline.json from `plan.json`, the TTS takes and the clips).

**Revised 2026-10-07** (the user's rule, the first of the "Rules for the night" in `daily/PROMPT.md`): the hook and its payoff now use our own
neutral example, the word "eucalyptus" (5 tokens in GPT-4's tokenizer, 1 in GPT-4o's; the test sentence "Koalas eat
eucalyptus." 11 vs 5; FACTS T20, T22, T26, T27). Changed: the cover's red line, panels 1, 12, 13 and 14, the lines n0 and
n29-n32 (new takes), clip C12b dropped, C9 moved after n32; slide 19 is taped with its last two lines painted out.
Everything else is as delivered on 2026-10-07. The drafts in `drafts/` were written for the first cut; their hook
example is replaced there by a pointer to this note.

Sources: `FACTS.md` (every number and claim, in its safe wording), `clips.json` + the two-recognizer check, her slides
15, 17, 19 taped (`slides/`, git-ignored; slide 19 with its last two lines painted out).
Script: synthesis of `drafts/script_A.md` (story first, the winner) and `drafts/script_B.md` (worked example first),
judged in `drafts/judge.md`; the grafts from B: the payoff line (n32), "what's frequent gets glued"
(n27), "a scrap of one" (n7), "the target is 13" (n19), "word list" for corpus, the honest limit on its own panel.

Look: the L01-01 line look (warm paper, ink drawings drawing themselves, red pen, washes, taped slides, mic tag).
The analogy: the vocabulary is a library card catalogue; a token is a drawer number; BPE decides which drawers the
cabinet gets by gluing the most frequent neighbouring tiles.

## Beats
| # | Panel | Picture | Voice |
| --- | --- | --- | --- |
| 0 | cover | the tokenizer as a hand-crank mill: paper ribbon in, tiles out; "How text / becomes numbers"; red "eucalyptus: 5 tokens or 1?" | n0 (the hook) |
| 1 | the question | five lettered tiles e / uc / aly / pt / us (GPT-4's tokenizer: 5 tokens), the whole word as one red tile (GPT-4o's: 1 token), a red "?" | n2, C1 |
| 2 | the cabinet | `line_card_catalog`; the pen writes real cl100k_base ids on drawer plates; card "Hello -> 9906 -> Hello" | n3-n5 |
| 3 | 13 tiles | her sample sentence as 13 lettered tiles; "55 characters / 13 tokens"; rings on ization, L, LM, s | n6, n7 |
| 4 | counted in tokens | `line_receipt`; price per token, context window in tokens, work for every token | n8, C2b |
| 5 | the balance | `line_balance`: fewer tokens vs learns something; "which drawers?" | n9, C3, n10 |
| 6 | whole words | `line_lost_word`: the librarian, a huge list, a typo not in it | n11, C5b, n12 |
| 7 | characters | `line_long_ribbon`: 55 characters instead of 13 tokens | n13 |
| 8 | her slide 15 | taped; rings on bottom-up / Top-Down, the citations underlined, the Gemini line struck: "SentencePiece, yes; Unigram: not stated" | n14-n16 |
| 9 | the recipe | `line_glue_tiles` with "e" "s" on the tiles; the four steps; "BPE began in 1994..." | n17, n18 |
| 10 | her slide 17 | taped; the word list underlined, 13 ringed, both ties added in pen | n19 |
| 11 | the trace | letter tiles x5 x2 x6 x3; round 1 (e-s 6 + 3 = 9, s-t ties), round 2 (es-t 9), round 3 (l-o 5 + 2 = 7, o-w ties); merged tiles in red; vocabulary strip 10 -> 13 | n20-n27 |
| 12 | her slide 19 | taped, its last two lines painted out; libraries boxed, "README: vs one older library", cl100k_base, 13; the pen writes "our test: Koalas eat eucalyptus." in the blank space | n28, n29 |
| 13 | the payoff | "Koalas eat eucalyptus."; five tiles numbered 1-5 ("5 tokens, all scraps"), then one red tile: "1 token", "a fifth of the tokens", "whole sentence: from 11 tokens to 5" | n30, n31 |
| 14 | what changed | two cabinets, about 100,000 (cl100k_base) and about 200,000 (o200k_base); the eucalyptus tile goes into one drawer; "the trend" | n32, C9, C11 |
| 15 | honest limit | one tile vs fifteen: up to 15x the tokens (Petrov et al., NeurIPS 2023) | n33 |
| 16 | recap | the mill again; "next: how the model picks the next token" | n34, n35 |
| - | end card | the logo; "Text becomes numbers." | - |

## Voice (narration = a disclosed synthetic voice; slots from timeline.json)
| id | at | line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.5 | One word: eucalyptus. Five tokens in GPT-4's tokenizer, one in GPT-4o's. What changed? | T20 |
| n2 | 0:11.4 | Last time, models got big and expensive. Today, the unit they are counted in. This is Professor Yufei Ding's CSE 291P at UC San Diego, Lecture 1. | L01 |
| c1 | 0:24.1 | her clip C1: "So first, why do we want to understand tokenization?" | check.json: exact |
| n3 | 0:29.5 | Because a model never reads letters. It never reads words either. It reads numbers. | T2 |
| n4 | 0:36.1 | Picture a library card catalogue: a cabinet of numbered drawers. It is built once, and then it is fixed. | T2 (analogy) |
| n5 | 0:44.1 | That is a tokenizer. It turns text into a list of whole numbers, and back. Each number is a token, and points to one entry in a fixed vocabulary. | T2 |
| n6 | 0:55.0 | Her sample sentence: Hello students! Tokenization is the foundation of LLMs. 55 characters. 13 tokens. | T19 |
| n7 | 1:04.8 | Look at the pieces. Token is one. ization is another. Then L, then LM, then s. Sometimes a token is a whole word, sometimes a scrap of one. | T19 pieces, Traps |
| n8 | 1:17.4 | Why count them? Prices are per token. The context window, how much text the model can take in at once, is counted in tokens. And the model does work for every token. | T1 |
| c2b | 1:29.1 | her clip C2b: "And all these kind of model complexities are also calculated based on the number of tokens." | check.json: exact |
| n9 | 1:37.8 | So fewer tokens is cheaper. | T23 |
| c3 | 1:40.8 | her clip C3: "So less is better. But is less always better? No." | check.json: exact |
| n10 | 1:46.3 | If every sentence were one token, the model would learn nothing. So the real question is: which drawers does the cabinet get? | T23 |
| n11 | 1:55.6 | Her slide gives three answers. One: a drawer for every whole word. | T3 |
| c5b | 2:01.4 | her clip C5b: "So you may have some new words," | check.json: exact |
| n12 | 2:04.6 | Easy to read, but the list is huge, and a new word or a typo isn't in it. | T3 |
| n13 | 2:11.1 | Two: a drawer for every single character. Nothing is ever missing, but the sequences get long. | T4 |
| n14 | 2:19.2 | Three: subwords, in between. Byte-pair encoding builds them bottom-up. That is Sennrich and colleagues, 2015. | T5 |
| n15 | 2:28.3 | Unigram goes top-down: start with a huge list and prune what helps least. That is Kudo, 2018. | T7 |
| n16 | 2:37.0 | And one red-pen note on the Gemini line. SentencePiece, yes. Unigram: not stated. | T8 |
| n17 | 2:44.8 | Now, how byte-pair encoding chooses its drawers. BPE started in 1994 as a data-compression trick. The recipe has four steps. | T6, T9 |
| n18 | 2:55.0 | Split into letters. Count every neighbouring pair. Glue the most frequent pair into a new piece. Repeat until the list is big enough. | T9 |
| n19 | 3:05.3 | Her practice word list. Low, five times. Lower, twice. Newest, six times. Widest, three times. The target is 13. | T11 |
| n20 | 3:16.4 | Start with letters only. That is ten drawers. | T15 |
| n21 | 3:20.5 | Round one. Count the pairs. e-s appears 6 plus 3: 9 times. | T12 |
| n22 | 3:27.7 | So does s-t. A tie. The slide takes e-s; a fixed tie-break rule decides. | T12, T16 |
| n23 | 3:35.1 | Glue: that is a merge. Every e-s, in every word, becomes one tile. The cabinet gets a new drawer: es. | T9, T12 |
| n24 | 3:45.2 | Round two. es-t, 9 times: est. | T13 |
| n25 | 3:50.2 | Round three. l-o, 5 plus 2: 7 times. o-w ties at 7. The slide takes l-o: lo. | T14, T16 |
| n26 | 4:00.0 | Stop. 10 letters plus 3 merges: 13 entries. | T15 |
| n27 | 4:06.4 | est got its own tile because it kept showing up. That's the whole idea: what's frequent gets glued. | T9 |
| n28 | 4:13.7 | You don't do this by hand. Her slide shows tiktoken, OpenAI's tokenizer library, and Hugging Face's tokenizers library, written in Rust. | T17, T18 |
| n29 | 4:24.5 | The code loads GPT-4's tokenizer, cl100k_base. Our sentence: 13 tokens. Now our own test sentence: Koalas eat eucalyptus. | T19, T20, T10 mapping |
| n30 | 4:37.8 | In GPT-4's tokenizer, eucalyptus is 5 tokens. All scraps, not one whole word. | T20, T26 |
| n31 | 4:46.3 | In GPT-4o's, 1 token. Same word, a fifth of the tokens. The whole sentence goes from 11 tokens to 5. | T20, T22 |
| n32 | 4:56.1 | So what changed? Both are byte-pair encoding tokenizers. The vocabulary went from about 100,000 entries to about 200,000. The bigger vocabulary has room for the whole word as one entry. | T27, T28, T21 |
| c9 | 5:09.7 | her clip C9: "Generally speaking, if you are using multi-language instead of just using English, then it's better for you to use a larger vocabulary." | check.json: near |
| c11 | 5:20.7 | her clip C11: "So that's why sometimes you want to have a larger vocabulary. And that's also the trend." | check.json: exact |
| n33 | 5:27.6 | One honest limit. Tokenizers do not treat every language the same. The same text, translated, can need up to 15 times more tokens in some languages. That is Petrov and colleagues, NeurIPS 2023. | T24 |
| n34 | 5:44.1 | So: a model sees numbers from a fixed vocabulary. And context, compute and price are all counted in them. | T1, T2 |
| n35 | 5:52.1 | Next: how the model picks the next token. | T25 |
622 narration words in 6:00 (104 words per minute); 6 clips, 30.3 s (8 % of the runtime).

## Her clips (cut on word times; checked by two recognizers, not by ear)
| id | recording | text | verdict |
| --- | --- | --- | --- |
| C1 | 24:44.6-24:48.0 | So first, why do we want to understand tokenization? | exact |
| C2b | 30:35.3-30:42.2 | And all these kind of model complexities are also calculated based on the number of tokens. | exact |
| C3 | 32:23.4-32:27.5 | So less is better. But is less always better? No. | exact |
| C5b | 33:52.6-33:54.5 | So you may have some new words, | exact |
| C9 | 40:12.5-40:22.1 | Generally speaking, if you are using multi-language instead of just using English, then it's better for you to use a larger vocabulary. | near (larger/large, vocabulary/library) |
| C11 | 40:54.7-40:59.2 | So that's why sometimes you want to have a larger vocabulary. And that's also the trend. | exact |
Dropped after the check: C2, C4, C5, C6, C7, C8, C8b, C10, C12 (differ). C12b passed (exact) but was dropped on
2026-10-07 under the user's rule (it glossed the slide's removed example).

## Drawings
New (art/src, packed to art/cut): `line_token_mill`, `line_card_catalog`, `line_lost_word`, `line_long_ribbon`,
`line_glue_tiles` (prompts in `art.json`). Reused: `line_balance`, `line_receipt`, `line_mic`. Everything else on
screen is code lettering, pen, cards and the taped slides.
