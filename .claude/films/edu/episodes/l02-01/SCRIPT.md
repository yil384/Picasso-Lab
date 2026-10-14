# L02-01 · "Why Chatbots Kept Only Half the Transformer"

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 2 "Transformer Model Architecture
Variants (1)", slides 7-12, recording 11:41-28:09. Fifth episode of the daily series, the first of Lecture 2 (after
L01-04 "Temperature and Top-p", not re-explained). Runtime 5:46 (timeline.json, 346.4 s), 1080x1920, 30 fps, English only. Built with
`kit-lesson` (`kit-lesson/lesson.html?ep=l02-01`), no kit change. Data written by
`~/picasso-work/daily/L02-01/scripts/build_ep.py` + `panels.py` (episode.json, strings.json) and `plan.py`
(timeline.json from `plan.json`, the TTS takes and the clips).

Sources: `FACTS.md` (every number and claim, in its safe wording), `clips.json` + the two-recognizer check, her
slides 11 (right half only: the 2017 paper's figure with her red shading; the table with the model names is cropped
off) and 12 (whole, then its Training Data row as a strip), rendered at 150 dpi into `slides/` (git-ignored). Slides
8-10 are another author's illustrations (J. Alammar, CC BY-NC-SA): never taped; their example is redrawn as our own
desk with our own made-up sentence, credited on the end card.

Script: synthesis of `drafts/script_A.md` (story first, the winner, 47/60) and `drafts/script_B.md` (worked example
first, 42/60), judged in `drafts/judge.md`. Spine from A: the 2017 Transformer as a translation team at one desk, a
READER (encoder, reads the whole sentence both ways) and a WRITER (decoder, writes one word at a time behind a card,
reading his notes = cross-attention); her C1 turns the viewer into the predictor ("So, what would you cut?"); today's
big chat models fired the reader. Grafts from B: "Delete the encoder. The cross-attention has nothing left to look
at, so it goes too."; "Writing, though, is still one word at a time"; the decoding steps 1-4 under the writer's
words; "So why accept a less exact model? Professor Ding's slide 12 keeps the books." before C4; "the card never
hides it"; "That's paired data."; "Accurate: ... Simple: ..."; "Professor Ding's verdict:" before C6; the "most"
hedge in the bookend. Judge's fixes taken: "one stack instead of two" (not "desk"); cross-attention = reading his
notes everywhere; slide 12's "1T+" and "10-100x" marked by the pen when the slide first appears; a 1 s pause after
"So, what would you cut?"; no "the big one"; n34 says "next-word models" / "two-stack models". Not taken: the judge
flagged "Hence the title." as uncleared: kept, because FACTS F12 now carries the paper's abstract ("based solely on
attention mechanisms, dispensing with recurrence and convolutions entirely").

Look: the L01-01 line look (warm paper, ink drawings drawing themselves, red pen, washes: blue = the reader /
encoder, coral = the writer / decoder, yellow = the one thing to look at; taped slides; the mic tag on her clips).
Every picture is a drawing from the image tool (7 new) or an existing one; code letters words and draws pen marks,
cards, the blank taped sheets of the cut and the taped slides.

## Beats
| # | Panel | Picture | Voice |
| --- | --- | --- | --- |
| 0 | cover | `line_reader_writer` (blue / coral washes), reader's strip "mib tavoo krenn", writer's strip "I am a student."; red dashed cut line down the desk, "which half?"; title "Why Chatbots Kept / Only Half the Transformer" (underline on the voice); strip "CSE 291P · Lecture 2 · UC San Diego" | n0, n1 |
| 1 | the 2017 paper | "Attention Is All You Need" + "Vaswani et al., 2017 · arXiv:1706.03762"; `line_paper`, ribbon "2017"; "built to translate"; "a sentence in, its translation out"; "encoder: reads" (blue) → "decoder: writes" (coral) | n2, n3 |
| 2 | picture a team | `line_reader_writer` draws itself; "the reader = encoder", "the writer = decoder"; the made-up sentence (pencil "a made-up language"), "I am a student." word by word | n4, n5 |
| 3 | before 2017 | "before 2017: recurrent networks"; `line_whisper_line`; red hops 1-2-3-4 from ear to ear; "one step per word" | n6, n7 |
| 4 | attention | "attention (hence the title)"; `line_round_table`, the cards lettered mib / tavoo / krenn; krenn's two lines (thick, thin) "like me? → gather → update"; then all lines, a ring, "all the words, one step" | n8-n10 |
| 5 | the desk again | camera on the reader: arcs both ways under the strip, "the reader (encoder)", "tokens: words or pieces of words"; C2: the pen draws her two links, "both ways"; camera to the writer: I · am · a · student. with the decoding steps 1-4, an index card stepping right over the strip; dashed glance to his notes (ringed), "cross-attention"; ease out: "the 2017 team"; C1: an arrow off the strip to a red "?" | n11, n12, C2, n13-n15, C1 |
| 6 | her slide 11 | right half taped, "figure: Vaswani et al., 2017"; "Removed from Decoder-only LLMs" ringed; "the reader" on the shaded encoder; a blank sheet taped over it, "encoder: cut"; a strip taped over the cross-attention band, "cross-attention: cut"; tick on "Masked Multi-Head Attention"; "decoder-only" | n16, n16b, n17, n18 |
| 7 | the writer, alone | `line_writer_cover`, yellow on her card, "the mask"; "each word: itself + the words before it", "never ahead", "masked = causal"; then a card: "Translate to English: / mib tavoo krenn →" in pencil, "came first: always in view", "I am a student." on the voice | n19-n21 |
| 8 | what she loses | "The bank was full of fish." with a card over "was full of fish."; `line_two_banks`, "money?" / "river?"; the card lifts, "fish" underlined, arrow to the leaping fish (yellow); C3: the sentence underlined; "one way only: can hurt on some tasks" | n22-n24, C3, n25 |
| 9 | her slide 12 | taped whole, "Imperfect Simulation" underlined, "a less exact model"; camera in; C4: the context row underlined, "−"; a bracket and "+" on Parameters and Training Data; then "1T+" struck → "Llama 3: ~15T", "10–100×" ringed → "the slide's rough guess" | n26, C4 |
| 10 | one stack, not two | `line_block_towers` (coral on the single tower, blue on the twin towers); "~1×", "~1.5–2×" + "the slide's estimate", the planks "cross-attention"; card "our count, the 2017 base model: about 63M → about 38M · about 40% fewer · (the paper itself says 65M)" | n27-n29 |
| 11 | practice | `line_paired_cards` "paired data", front pair "mib tavoo krenn" / "I am a student.", "about 4.5 million pairs (2017, one of its two tasks)"; `line_heap` "any text", "hide the next word, guess it, check"; slide 12's Training Data row taped, "300B" ringed, "GPT-3 (2020): about 300 billion read", "Llama 3 (2024): about 15 trillion", "10–100×" ringed, "rough guess" | n30-n33 |
| 12 | one honest limit | `line_reader_writer` again; card "one honest limit · a 2022 study (Wang et al.) · right after plain text: next-word models best · after many extra tasks: two stacks ahead · translation: two stacks still show up"; ticks on the writer, then the team | n34, n35 |
| 13 | accurate or simple? | "\"Accurate modeling / vs. Simple modeling?\"" (her slide 12); `line_balance`, "accurate: the team / reads both ways" (blue), "simple: the lone writer / any text" (coral), "won, for now"; "episode one: scale changes what models can do"; "nobody has proven it is the best design"; C6: a red arrow swings both ways between the pans | n36, C5, n37-n39, C6 |
| 14 | bookend | the cover layout; the reader's half fades under paper, "cut"; a ring round the writer, "kept", "most of today's big chat models"; "guess what comes next" | n40, n41 |
| - | end card | the logo; "After Prof. Yufei Ding's CSE 291P, Lecture 2" / "Guess what comes next." / "UC San Diego · Picasso Lab"; small print: the sources, "63M / 38M is our count", "\"mib tavoo krenn\" is made up", "The narration is a synthetic voice." | - |

## Voice (narration = a disclosed synthetic voice; slots from timeline.json)
| id | at | line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.5 | The paper that started it all was about translation. Today's big chatbots threw away half of its design. | work-order hook; F1, F2, F15 (the hook wording) |
| n1 | 0:07.5 | From Lecture 2 of Professor Yufei Ding's CSE 291P at UC San Diego. | L02 source key |
| n2 | 0:15.3 | The paper: Attention Is All You Need, 2017. Its model, the Transformer, was built to translate: a sentence in, its translation out. | F1, F2 |
| n3 | 0:26.8 | The encoder reads the sentence; the decoder writes the translation. | F3 |
| n4 | 0:32.9 | Picture a team at one desk: a reader and a writer. | F3 (analogy) |
| n5 | 0:37.1 | He reads a sentence in a made-up language. She writes the translation: I am a student. | RUN (made-up sentence), F2 |
| n6 | 0:43.8 | Before 2017, the best translators were mostly recurrent networks. | F13 |
| n7 | 0:49.1 | A recurrent network reads one word after another, like a whisper passed down a line: one step per word. | F9 |
| n8 | 0:57.4 | The 2017 paper dropped recurrence and kept only attention. Hence the title. | F12 (VAS abstract) |
| n9 | 1:03.1 | Attention is a round table. Each word asks: which of the others are like me? It gathers from them, weighted by that, and updates itself. | F11 |
| n10 | 1:12.8 | Unlike the whisper line, all the words do this in the same step, so a GPU can work on them at the same time. | F9, F10 |
| n11 | 1:20.8 | The reader uses attention: every word can look at every other word, before and after it. | F5 |
| n12 | 1:27.0 | Models read text in tokens: words or pieces of words. Professor Ding: | tokens (L01-03); lead-in |
| c2 | 1:33.4 | her clip C2: "So even the first token can look at the third token. And the second token can also look at the third token. So it's bidirectional for the encoding part." | check.json: near |
| n13 | 1:43.4 | Writing, though, is still one word at a time, and each new word joins the input for the next. | F8, F10 |
| n14 | 1:49.6 | Before each word, she reads his notes on the whole input. That is cross-attention. | F7 |
| n15 | 1:55.3 | That's the 2017 team. Professor Ding's advice for reading an older paper: | F33 (lead-in) |
| c1 | 2:01.6 | her clip C1: "you can always ask yourself, can you predict what is the trend afterwards? And can you improve that paper?" | check.json: near |
| n16 | 2:10.5 | So, what would you cut? | F33 |
| n16b | 2:13.8 | Most of today's large chat models that publish their design keep only the decoder. They fired the reader. | F15 (soften, verbatim) |
| n17 | 2:20.6 | Slide 11 of the lecture shades the cut in red. Delete the encoder. The cross-attention has nothing left to look at, so it goes too. | L02 slide 11; F16 |
| n18 | 2:29.8 | What stays: the decoder alone. It's called decoder-only. | F16 |
| n19 | 2:35.5 | Alone, the writer keeps the rule she always had: a card hides the rest of her strip. | F6 (analogy) |
| n20 | 2:41.4 | Each word may look at itself and the words before it, never ahead. That's called masked, or causal, attention. | F6 (Trap 7) |
| n21 | 2:49.8 | So how does she translate now? Write the request at the start of her page. It came first, so the card never hides it, and she simply continues the text. | F28, F6 |
| n22 | 3:01.7 | What does she lose? Try this: The bank was full of fish. | RUN (bank sentence) |
| n23 | 3:06.3 | When she reaches “bank”, the card hides the fish. Money, or river? The reader saw the whole sentence at once. | F5, F6 |
| n24 | 3:14.0 | Why read both ways at all? Professor Ding: | lead-in |
| c3 | 3:17.4 | her clip C3: "Because if you look at the translation example, at least we believe for the translation, we should look at the whole sentence." | check.json: exact |
| n25 | 3:24.7 | Looking only backward can hurt on some understanding tasks. | F22 (soften, verbatim) |
| n26 | 3:30.4 | So why accept a less exact model? Professor Ding's slide 12 keeps the books. | L02 slide 12; core idea |
| c4 | 3:36.6 | her clip C4: "So we are losing something. But we are gaining something." | check.json: exact |
| n27 | 3:42.8 | First gain: one stack instead of two. | F23 |
| n28 | 3:45.8 | The numbers a model learns are called parameters, or weights. Each half is a stack of layers; two stacks carry more: about 1.5 to 2 times, the slide estimates. | F23 (the slide estimates), F4 |
| n29 | 3:57.4 | By our count, that cut takes the 2017 base model from about 63 million parameters to about 38 million: about 40% fewer. | F23, RUN (our count) |
| n30 | 4:08.5 | Second gain: practice. | F27 |
| n31 | 4:10.9 | To learn translation directly you need pairs: a sentence and its translation. That's paired data. The 2017 model learned from about 4.5 million sentence pairs. | F25 (verbatim), F26 |
| n32 | 4:22.9 | A next-word model, like our writer, can learn from any text: hide the next word, guess it, check. | F25, F27 |
| n33 | 4:29.8 | GPT-3 read about 300 billion tokens; Llama 3, about 15 trillion. | F18, F19, F24 |
| n34 | 4:38.0 | One honest limit. A 2022 study found next-word models best right after training on plain text, but two-stack models ahead after extra training on many tasks. | F30 (the honest limit) |
| n35 | 4:49.1 | And two-stack models still show up in translation. | F21 |
| n36 | 4:53.9 | So which is better? Professor Ding asks the question students ask: | F29 (lead-in) |
| c5 | 4:59.1 | her clip C5: "when you should do accurate modeling and when you should do simple modeling?" | check.json: exact |
| n37 | 5:03.9 | Accurate: the team, reading both ways. Simple: the lone writer, any text. | F29, F5, F27 |
| n38 | 5:10.5 | Remember episode one: scale changes what models can do. The simple design that scales won, for now. Nobody has proven it is the best design. | F35, F29, F31 |
| n39 | 5:20.3 | Professor Ding's verdict: | F32 (lead-in) |
| c6 | 5:22.8 | her clip C6: "Because it's always alternating between each other. No clean winner." | check.json: exact |
| n40 | 5:28.9 | Most of today's big chat models kept only the writer: she never peeks ahead, but any text is practice. | F15, F6, F27 |
| n41 | 5:36.3 | Next time you read an older paper, try Professor Ding's test: guess what comes after it. | F33 (echo of C1) |

672 narration words in 43 lines, 116 words per minute over 5:46 (voice at +4%). Her clips: 6, 32.4 s (9 % of the runtime).

## Her clips (checked by two recognizers, not by ear; captions show `text` exactly; mic tag "Prof. Ding · lecture 2")
| Clip | Recording | Text | check.json | Where |
| --- | --- | --- | --- | --- |
| C1 | 12:33-12:40 (slide 7) | "you can always ask yourself, can you predict what is the trend afterwards? And can you improve that paper?" | near (one recognizer: "input" for "improve") | P5, after n15 ("Professor Ding's advice for reading an older paper:") |
| C2 | 19:32-19:41 (slide 8) | "So even the first token can look at the third token. And the second token can also look at the third token. So it's bidirectional for the encoding part." | near (text was "bi-directional"; one recognizer writes "bidirectional", the other "bi-directional") | P5, after n12 |
| C3 | 25:02-25:09 (slide 11) | "Because if you look at the translation example, at least we believe for the translation, we should look at the whole sentence." | exact | P8, after n24 ("Why read both ways at all? Professor Ding:") |
| C4 | 25:50-25:53 (slide 12) | "So we are losing something. But we are gaining something." | exact | P9, after n26 |
| C5 | 27:24-27:27 (slide 12, after "But students may ask,") | "when you should do accurate modeling and when you should do simple modeling?" | exact | P13, after n36 ("Professor Ding asks the question students ask:") |
| C6 | 27:51-27:55 (slide 12) | "Because it's always alternating between each other. No clean winner." | exact | P13, after n39 ("Professor Ding's verdict:") |

29 cuts were checked in four rounds (`~/picasso-work/daily/L02-01/check_round*.json`); dropped for "differ": her
framing of the 2017 paper ("transformal"), "it's parallel" ("its"), the attention aside ("their information"),
"abandoning" ("abandon"), "strictly simpler" (an extra "like"), "abstraction power" ("obstruction"), "anything online"
("can't"), "methodology ... during the research" ("doing").

## Drawings
- New (image tool, viewed full size, no text, invented people only): `line_reader_writer` (P0, P2, P5, P12, P14),
  `line_whisper_line` (P3), `line_round_table` (P4), `line_writer_cover` (P7), `line_two_banks` (P8),
  `line_paired_cards` (P11), `line_block_towers` (P10; the first try read as a diagram and was redrawn with two
  children).
- Reused: `line_paper` (P1), `line_heap` (P11), `line_balance` (P13), `line_mic` (the tag).

## Notes
- The made-up sentence "mib tavoo krenn" is only lettered, never spoken. No language other than English is named.
- Prof. Ding is always "Professor Ding" in the narration ("she" is the writer).
- The hook: n0 ends at 6.3 s (lint warning kept): the cover's title and "which half?" pose the puzzle from frame 0.
