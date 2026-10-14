# L02-01 "Why Chatbots Kept Only Half the Transformer" - script draft B (the worked example first)

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego. Lecture 2 "Transformer Model Architecture Variants
(1)", slides 7-12, recording 11:41-28:09. Fifth episode of the daily series, after L01-04 "Temperature and Top-p" (not
re-explained; no callback needed). Vertical 1080x1920, 30 fps, English, the line look (warm paper, self-drawing ink, red
pen, watercolour washes with blue as the course accent, taped slide printouts, her clips with the mic tag "Prof. Ding ·
lecture 2" and red-bordered captions, a disclosed synthetic narrator, the logo end card). Built with `kit-lesson`.

- Runtime: planned 5:47 + the 4 s end card, by the L01-04 rate model (0.41 s a word, 0.45 s between lines, 0.6 s
  after a clip, 0.7 s at each panel change, the holds named below; that model gave L01-04 7:10 for 822 words). By the
  brief's estimate (600-700 words for 5:00) about 5:10. Section 7 has the cut list to 5:15 on the strict model.
- Narration: 47 lines (n0-n46), 672 words, 116 words per minute over the runtime (cap 160).
- Her clips: all 6 (C1-C6), 32.4 s, 9 % of the runtime (cap 25 %).
- Panels: 16 (P0 cover ... P15 bookend), each 11-27 s, + the end card.

**Angle B: the worked example first.** The spine is the slides' own example, traced step by step with one sentence
in a made-up language, "mib tavoo krenn" -> "I am a student.", through the 2017 machine, redrawn as one desk: the
READER (encoder) and the WRITER (decoder) passing a note card (cross-attention). The encoder's three words all look at
each other at once (pen arrows, all-to-all); a whisper line vs a round table says why that beat recurrent networks;
the writer writes "I", "am", "a", "student." in decoding time steps 1-4, an arrow back to the reader's note at every
step, a card over what is ahead (the mask). Then the surgery on her slide 11: the red-shaded encoder is cut out of the
printout, then the cross-attention. The writer alone now translates by continuing one strip, "Translate to English:
mib tavoo krenn ->", one word at a time; the request came before, so the card never hides it. Then her slide 12 as a
ledger the red pen keeps: the loss (bank / fish, the card motif again), the gains (one tower vs two bridged towers:
63M -> 38M by our count; pairs vs any text: 4.5 million pairs, 300 billion tokens, about 15 trillion), the pen's
corrections, the honest limit in the other column, her question, the balance, "no clean winner".

Every number and claim is from `../FACTS.md` in its safe wording (rows per line in section 2). Taped: slide 11 (right
half only, credit lettered) and slide 12 (whole, twice). Slides 8-10 are never taped; their example is redrawn.

## 1. Beats (planned times; the voice decides)
Hook: n0 starts at 0.6 s and "threw away half" lands at about 5 s; frame 0 already shows the cut half (red wash).
| # | Start | Panel | Picture: drawing + what the code letters / the pen does | Voice |
| --- | --- | --- | --- | --- |
| 0 | 0:00.0 | P0 cover | Frame 0 = the finished cover: `line_reader_writer`, the reader's strip "mib tavoo krenn", the writer's "I am a student."; tags "encoder" / "decoder"; a red wash (her slide-11 shading) over the reader and the note card behind a dashed red cut line; "kept" + tick by the writer; title "Why Chatbots Kept / Only Half the Transformer"; strip "CSE 291P · Lecture 2 · UC San Diego". On "half" the pen underlines "Half". | n0, n1 |
| 1 | 0:16.1 | P1 the 2017 paper | `line_paper`: "Attention Is All You Need" / "Vaswani et al., 2017 · arXiv:1706.03762"; card "a sentence in -> its translation out"; during C1 a red arrow off the paper's edge to "what came after?". | n2, n3, **c1**, n4 |
| 2 | 0:37.0 | P2 reader and writer | `line_reader_writer`: "mib tavoo krenn" letters onto the reader's strip, pencil "a sentence in a made-up language", card "means: I am a student."; tags "encoder: reads" / "decoder: writes"; three red boxes "token". | n5, n6, n7 |
| 3 | 0:55.5 | P3 the encoder reads | Push-in on the reader's strip: six red arrows between the three words at once (both ways); "krenn" ringed, its arrows thicken unevenly, "like me? -> gather -> update", label "attention"; during C2 the arrows flash on her words, "both ways" under the strip. | n8, n9, **c2** |
| 4 | 1:21.7 | P4 a line vs a table | `line_whisper_line`: red ticks pop over the five heads one by one, "recurrent network: one word per step", the last one "still waiting"; it shrinks up, `line_round_table` draws below: arrows burst among all five at once, "attention: all the words, one step"; "recurrence" struck, "attention" ticked. | n10-n13 |
| 5 | 1:48.8 | P5 the decoder writes | `line_reader_writer` again, framed on the card and the writer; header "decoding time step: 1 2 3 4" (after her slides 9-10); per step: number ringed, a red arrow from the note card to the pen, the word letters on: I · am · a · student.; then one bracket over the four arrows, "cross-attention". | n14-n18 |
| 6 | 2:13.9 | P6 never peek | `line_writer_cover`: strip "I am", pen at "a"; red arrows back to "am", "I" and a loop on itself; an arrow at the card, struck: "never ahead"; the card ringed, "no peeking" on it; label "masked (causal) attention". | n19, n20 |
| 7 | 2:30.2 | P7 her slide 11, surgery | Right-half crop taped, credit "figure: Vaswani et al., 2017"; "encoder" / "decoder" over the towers, "N×" ringed "= 6"; a dashed red cut round the shaded encoder, the piece slides off the page; then the shaded cross-attention band, cut the same way; tick "stays: masked"; pencil card "GPT-1 (2018): 12-layer, decoder-only". | n21, n22, n23 |
| 8 | 2:53.2 | P8 the writer alone | `line_writer_cover` (lower) + a hand-drawn strip box above: "Translate to English:" / "mib tavoo krenn ->", then I · am · a · student. one by one, a small card stepping right; red arrows from the newest word back over the request; card "still both halves: translation (a large 2022 model) · T5, BART (2019)". | n24-n27 |
| 9 | 3:19.5 | P9 her slide 12, the ledger | Slide 12 taped whole; "Imperfect Simulation" underlined; during C4 a red "−" by the Bidirectional Context row (pencil "can hurt on some tasks" by "poorer") on "losing", "+" by Parameters and Training Data on "gaining". Hold 1.4 s. | n28, **c4** |
| 10 | 3:30.3 | P10 the bank | `line_two_banks`, "The bank was full of fish." lettered under it; a reading arrow stops at "bank", a card covers "was full of fish.", "money?" / "river?" in the two skies; hold 0.8 s; the card lifts, an arrow from "fish" back to "bank", the river ticked (blue), the money half to pencil; "one way only: can hurt on some understanding tasks". | n29-n31, **c3**, n32 |
| 11 | 3:57.5 | P11 one tower, two towers | `line_block_towers`: "parameters: the numbers a model learns"; "decoder only: ~1×" / "encoder + decoder: ~1.5-2×" + "(the slide's estimate)"; the planks tagged "cross-attention"; card "by our count (2017 base model): ~63M -> ~38M", "about 40% fewer" ringed, pencil "the paper says 65M". | n33, n34 |
| 12 | 4:17.6 | P12 pairs vs any text | `line_paired_cards` (left) beside `line_heap` (right): the front pair "mib tavoo krenn" / "I am a student.", "paired data", "2017: about 4.5 million sentence pairs (one of its two tasks)"; on the heap's top sheet "The bank was full of ___", the pen writes "fish." + tick, "any text"; "GPT-3 (2020): about 300 billion tokens read" / "Llama 3 (2024): about 15 trillion". | n35-n38 |
| 13 | 4:43.4 | P13 slide 12, corrected | Slide 12 again, zoomed on Training Data: "1T+" ringed, "Llama 3: ~15T"; bracket "the slide's rough guess" under "10-100× less"; "to learn translation directly" by "needs paired/parallel data"; pan to the encoder-decoder cell of row 1: the 2022-study card; zoom out, "Accurate modeling vs. Simple modeling?" ringed. | n39, n40, n41, **c5** |
| 14 | 5:10.6 | P14 the balance | `line_balance`: "accurate: both halves, reads both ways" (blue) / "simple: one half, any text" (yellow); card "episode 1: scale changes what models can do"; red tick "won, for now"; "?" on the post, "nobody has proven"; during C6 a red double arrow swings between the pans. | n42, n43, n44, **c6** |
| 15 | 5:33.2 | P15 bookend | The cover layout again; the red wash over the reader and card has gone pencil grey; tag "kept: the writer + the card", pencil "most of today's big chat models". Hold 0.6 s. | n45, n46 |
| - | 5:46.6 | end card | Logo, "Compute not included", "After Prof. Yufei Ding's CSE 291P, Lecture 2, UC San Diego", line "Guess what comes after.", small print (section 5). 4 s. | - |

## 2. Narration (synthetic voice; at = planned start; FACTS rows)
- n0 (0:00.6, P0): "The paper that started it all was about translation. Today's big chatbots threw away half of its
  design." - work-order hook (brief wording); F2; F15 (no "every"; "most" in n23 and n45)
- n1 (0:08.4): "Which half, and why? Lecture 2 of Professor Yufei Ding's CSE 291P at UC San Diego." - L02 key (credit)
- n2 (0:16.1, P1): "\"Attention Is All You Need\", 2017. Built to translate: a sentence in, its translation out." - F1, F2
- n3 (0:22.7): "Her advice for reading an older paper:" - F33 (set-up; her context at 12:26-12:33)
- c1 (0:26.1): her clip C1, 7.2 s
- n4 (0:33.8): "Let's try, with one sentence." - (none)
- n5 (0:37.0, P2): "Our sentence, in a made-up language: mib tavoo krenn. It means: I am a student." - RUN (sentence)
- n6 (0:43.6): "The machine has two halves. The encoder reads the sentence. The decoder writes the translation." - F3
- n7 (0:50.2): "Here, each word is one token: one piece of text." - token defined ("here": our simplification)
- n8 (0:55.5, P3): "In the encoder, every word can look at every other word, before and after it." - F5
- n9 (1:02.1): "Each word asks: which of the others are like me? It gathers from them, weighted by that, and updates
  itself. That's called attention." - F11
- c2 (1:12.0): her clip C2, 8.4 s - F5
- n10 (1:21.7, P4): "Before 2017, the best translators were mostly recurrent networks." - F13
- n11 (1:25.8): "A recurrent network reads one word after another: one step per word, a whisper passed down a line."
  - F9
- n12 (1:33.6): "Attention is a round table: all the words in one step, so a GPU can work on them at the same time." -
  F9, F10 (a contrast with recurrent networks, never "the first parallel model")
- n13 (1:43.1): "The paper dropped recurrence and kept only attention. Hence the title." - F12 (Trap 1)
- n14 (1:48.8, P5): "Writing, though, is still one word at a time." - F10, F8 (Trap 8)
- n15 (1:52.9): "Step 1: the decoder looks back at the encoder's reading of the whole sentence, and writes I." - F7, F8
- n16 (2:00.3): "Step 2: I joins its input. It looks back again, and writes am." - F8
- n17 (2:06.1): "Step 3, a. Step 4, student." - F8; RUN (the output sentence)
- n18 (2:09.0): "That look back, at every step, is called cross-attention." - F7
- n19 (2:13.9, P6): "The decoder's own words follow one rule: each word may look at itself and the words before it, never
  ahead." - F6 (Trap 7: "itself" kept)
- n20 (2:22.5): "So the writer keeps a card over what's ahead. No peeking. That's masked, or causal, attention." - F6
- n21 (2:30.2, P7): "Her slide 11: the 2017 design, two stacks of six layers. Shaded red: what decoder-only models
  remove." - L02 slide 11; F4; F16
- n22 (2:37.6): "Delete the encoder. The cross-attention has nothing left to look at, so it goes too. What stays: the
  masked decoder." - F16 (exact)
- n23 (2:46.3): "Most of today's large chat models that publish their design keep only the decoder." - F15 (exact)
- n24 (2:53.2, P8): "With no encoder, how does it translate? Put it all on one strip: \"Translate to English: mib tavoo
  krenn.\"" - F28; RUN
- n25 (3:01.4): "Ask it to translate, and it simply continues the text: I, am, a, student." - F28 (exact), F8
- n26 (3:07.6): "The request came before, so the card never hides it." - F6 (earlier words are always in view)
- n27 (3:12.2): "Two-stack models still show up in translation: a large 2022 translation model kept both halves." - F21
  (exact; F20 lettered)
- n28 (3:19.5, P9): "Why accept a less exact model? Her slide 12 keeps the books." - L02 slide 12 title; core idea
- c4 (3:24.8): her clip C4, 2.8 s - hold 1.4 s after it
- n29 (3:30.3, P10): "The loss first: \"The bank was full of fish.\"" - RUN (our ambiguity sentence)
- n30 (3:34.5): "Read one way only, and at the word bank, fish hasn't come yet. Money, or river?" - F6; RUN - hold 0.8 s
- n31 (3:42.3): "The 2017 encoder reads both ways, on purpose." - F5; her 19:40-19:43 ("designed ... for the
  translation process"); C3 follows with her "Because ..."
- c3 (3:46.0): her clip C3, 6.1 s
- n32 (3:52.7): "Looking only backward can hurt on some understanding tasks." - F22 (exact; Trap 3)
- n33 (3:57.5, P11): "The gains. Parameters are the numbers a model learns. Two stacks carry more: about 1.5 to 2 times,
  the slide estimates." - F23 (Trap 6)
- n34 (4:06.6): "By our count, the 2017 base model has about 63 million parameters. Cut the encoder and the
  cross-attention: about 38 million, about 40% fewer." - F23; RUN (63M, 38M, 40 %; Trap 9: 65M lettered)
- n35 (4:17.6, P12): "To learn translation directly you need pairs: a sentence and its translation. That's paired data." -
  F25 (exact; Trap 4)
- n36 (4:24.2): "The 2017 model learned from about 4.5 million sentence pairs." - F26 (exact; "one of its two tasks"
  lettered)
- n37 (4:28.7): "Our writer is a next-word model. A next-word model can learn from any text: hide the next word, guess
  it, check." - F25 (exact), F27
- n38 (4:37.8): "GPT-3 read about 300 billion tokens. Llama 3, about 15 trillion." - F24 (exact), F18, F19 (Trap 10:
  "read"); no ratio to the 4.5 million pairs (RUN)
- n39 (4:43.4, P13): "The pen adds Llama 3, and labels the multiplier the slide's rough guess." - F24, F25; errata 4-5
- n40 (4:49.2): "Still, a 2022 study found the next-word model best right after its first training on plain text, and
  the two-stack model ahead after extra training on many tasks." - F30 (the honest limit; Trap 3)
- n41 (5:01.1): "So which is better? She asks the question students ask:" - F29 (set-up; her "But students may ask,")
- c5 (5:05.7): her clip C5, 3.6 s
- n42 (5:10.6, P14): "Accurate: both halves, reading both ways. Simple: one half, any text." - F29, F5, F25
- n43 (5:15.6): "Remember episode one: scale changes what models can do. The simple design that scales won, for now." -
  F35 (exact), F29 (exact)
- n44 (5:23.0): "Nobody has proven it is the best design. Her verdict:" - F31 (soften, exact)
- c6 (5:27.5): her clip C6, 4.3 s - F32
- n45 (5:33.2, P15): "So most of today's big chat models kept just the writer and the card." - F15 ("most"), F16, F6
- n46 (5:39.4): "Next time you read a famous paper, try her test: guess what comes after it." - F33 (callback to C1,
  outside quotes) - hold 0.6 s, then the end card at 5:46.6

Planned time per beat (s): P0 15.5 · P1 20.9 · P2 18.5 · P3 26.2 · P4 27.1 · P5 25.1 · P6 16.4 · P7 23.0 · P8 26.3 ·
P9 10.9 · P10 27.2 · P11 20.0 · P12 25.9 · P13 27.2 · P14 22.6 · P15 13.4. Word count 672 (whitespace count), 116 wpm.

Spoken forms for the voice file (captions keep the written form): "mib tavoo krenn" -> "mib, tah-VOO, KREN" (same
take reused in n5, n24); "CSE 291P" -> "C S E 2 91 P"; "GPT-3" -> "G P T 3"; "40%" -> "40 percent"; "1.5 to 2 times"
as written; the quoted sentence in n29 and the strip in n24 get a short pause on both sides.

Defined before use: encoder, decoder (n6); token (n7); attention (n9); recurrent network (n11); cross-attention (n18);
masked / causal (n20); decoder-only (n21, by the red shading, "what stays: the masked decoder"); "stack" (n21: "two
stacks of six layers", seen on the slide); parameters (n33); paired data (n35); next-word model (n37, "our writer");
GPU is taken as known.

## 3. Her clips (text exactly as clips.json; captions show it; mic tag "Prof. Ding · lecture 2")
| clip | recording | dur | at | panel | her words | set up by / paid off by |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | 12:32.9-12:40.1 | 7.2 s | 0:26.1 | P1 | "you can always ask yourself, can you predict what is the trend afterwards? And can you improve that paper?" | n3 "Her advice for reading an older paper:"; the film then reads the 2017 paper as a puzzle; n46 calls back "try her test". |
| C2 | 19:32.2-19:40.6 | 8.4 s | 1:12.0 | P3 | "So even the first token can look at the third token. And the second token can also look at the third token. So it's bidirectional for the encoding part." | n8-n9 have defined token and attention on our three words; the arrows mib->krenn and tavoo->krenn flash on her words; "both ways" lettered on "bidirectional". |
| C4 | 25:50.1-25:52.9 | 2.8 s | 3:24.8 | P9 | "So we are losing something. But we are gaining something." | n28 opens her ledger; "−" lands on "losing", "+" on "gaining"; the next four panels are the rows. |
| C3 | 25:02.5-25:08.6 | 6.1 s | 3:46.0 | P10 | "Because if you look at the translation example, at least we believe for the translation, we should look at the whole sentence." | n31 "The 2017 encoder reads both ways, on purpose." - her "Because" answers it; n32 states the loss in FACTS wording. |
| C5 | 27:23.9-27:27.5 | 3.6 s | 5:05.7 | P13 | "when you should do accurate modeling and when you should do simple modeling?" | n41 "She asks the question students ask:" (her own lead-in was "But students may ask,"); the pen has just ringed the slide's bottom line. |
| C6 | 27:51.0-27:55.4 | 4.3 s | 5:27.5 | P14 | "Because it's always alternating between each other. No clean winner." | n44 "Nobody has proven it is the best design. Her verdict:"; the double arrow swings between the pans; the bookend follows. |

C3 plays after C4 (her order is C3 then C4) because the ledger opens on her C4 and the bank is its first row; each
clip stands on its own words. C2's caption uses "bidirectional" (clips.json `text`, normalised from "bi-directional").

## 4. Panels: layout and details beyond the beats table
Safe zones (kit guides): nothing that matters above y 260 or below y 1480; captions at y 1300-1440; the mic tag sits top
right (x 890-1040, y 340-560) during a clip, so P1, P3, P9, P10, P13, P14 keep that corner empty. Washes: blue = the
encoder / reading (course accent), yellow = the decoder / writing, pink = the costly side, sage = the light side; the
red pen is never a wash. Every character is invented and appears only while a line is about what it does.

- **P0** `line_reader_writer` 1040 px (x 20-1060, y 640-1333); title y 290-470, strip y 510; the red wash and the
  dashed cut are on frame 0; the underline on "Half" (n0) is the only motion.
- **P1** `line_paper` 560 px (x 110-670, y 400-1240); card x 690-1050, y 1000-1180; the C1 arrow leaves the paper at
  y 800, below the mic tag; n4 adds a pencil "one sentence" at its end. Blue under the ribbon.
- **P2** the same drawing at 1040 px (y 520-1213); "mib tavoo krenn" letters on with n5; blue under the reader, yellow
  under the writer (n6); one small "token" under each red box (n7).
- **P3** camera push to 2x on the reader's strip (words about 120 px tall, y 760). The six arrows land in one burst
  (all at once is the point); on n9 the two arrows into "krenn" thicken by different amounts.
- **P4** whisper line 1040 px (y 300-993), ticks 0.6 s apart, pink wash; on n12 it shrinks to 620 px (y 300-713) and
  the round table draws at 600 px (x 240-840, y 740-1340), blue wash; n13's struck "recurrence" sits top right. No
  step numbers are drawn.
- **P5** P2's drawing with its lettering kept, camera 1.3x on the card and the writer; header y 330; the card lettered
  small "the encoder's reading"; n16 adds a pencil arrow from "I" back into the writer, "joins the input".
- **P6** `line_writer_cover` 1040 px (y 500-1193); label "masked (causal) attention: itself + before". The determined
  face carries the gag; nothing covers it.
- **P7** slide 11 cropped below its title, right half only (the table and its model column are off); taped 700 px
  wide (x 90-790, y 330-1290), credit lettered above it, kit label "her slide 11"; the margin notes sit at x 800-1060.
  The cut pieces slide off the page; if the kit cannot move part of a printout, a blank taped sheet covers each piece
  (as in the L01 five-minute cut). Yellow wash on what stays.
- **P8** the strip box is a code-drawn paper strip (x 60-1020, y 330-560), two rows, the zoomed copy of the writer's
  strip, so the words stay legible; `line_writer_cover` below (y 620-1313); the code card on the strip steps right
  with each word, mirroring the drawn card. Yellow under the strip box.
- **P9** slide 12 whole at 1040 px (y 580-1165, below the mic tag), label "her slide 12"; marks land on her words.
- **P10** `line_two_banks` 1040 px (y 360-1053); the sentence at y 1110-1190, 64 px; "money?" / "river?" kept at
  x < 860; the covering card is the same code card as P8 (the writer's rule, now as the loss).
- **P11** `line_block_towers` 1040 px (y 420-1113); the count card at y 1140-1280; sage under the one tower, pink under
  the two.
- **P12** paired cards 500 px (x 20-520) beside the heap 540 px (x 530-1070), y 580-1120; pink behind the cards,
  yellow behind the heap; no ratio and no "x" between the two sides.
- **P13** camera 1.6x on the Training Data row, a pan to row 1's Encoder-Decoder cell for the study card (pencil
  border), then the full slide at y 580+ for C5; the pen rests during the clip.
- **P14** `line_balance` 800 px (x 140-940, y 520-1320); blue under "accurate", yellow under "simple"; the episode-one
  card top left.
- **P15** the cover's layout and lettering; the red wash fades to pencil grey over 1 s on n45.

## 5. Drawings, slides, end card (art list)
Drawings (all exist in `art/src/`; nothing new is needed): `line_reader_writer` (P0, P2, P3, P5, P15),
`line_writer_cover` (P6, P8), `line_whisper_line` + `line_round_table` (P4), `line_paper` (P1), `line_two_banks`
(P10), `line_block_towers` (P11; the redraw in progress, one tower vs two bridged towers), `line_paired_cards` +
`line_heap` (P12), `line_balance` (P14), `line_mic` (automatic). Not used: `line_chat_first`, `line_lab_2017` (its snow
cloud is L01's "ML winter", not this story), `line_grow` (the episode-one callback is one card in P14, no sticker).
Code draws only lettering, pen marks, the strip box (P8), note cards and washes.
Slides: 11 (right-half crop, the figure + her red shading, credit lettered), 12 (whole, P9 and P13). Not taped: 7 (her
outline), 8-10 (another author's illustrations; their example is redrawn as P2-P6).
End card small print: "After Prof. Yufei Ding's CSE 291P, Lecture 2, UC San Diego. Figure on slide 11: Vaswani et al.,
Attention Is All You Need, 2017. Decoding steps after Jay Alammar, The Illustrated Transformer (2018). GPT-1: Radford
et al., 2018. GPT-3: Brown et al., 2020. Llama 3: Llama Team, AI @ Meta, 2024. The 2022 study: Wang et al., ICML 2022.
Translation model: NLLB Team, 2022. Parameter count: ours. The sentence 'mib tavoo krenn' is made up. The narration is
a synthetic voice."

## 6. Facts on screen beyond the voice, and traps
On screen only: "Vaswani et al., 2017 · arXiv:1706.03762" (F1); "N× = 6" (F4); "decoding time step: 1 2 3 4" (slides
9-10, ALA credit on the end card); "GPT-1 (2018): 12-layer, decoder-only" (F17); "T5, BART (2019)" (F20); "the paper
says 65M" (VAS Table 3); "(one of its two tasks)" (F26); "GPT-3 (2020)", "Llama 3 (2024)" (F18, F19); "Llama 3: ~15T",
"the slide's rough guess", "to learn translation directly" (errata 4-6); "can hurt on some tasks" by "poorer" (F22,
erratum 7); "Wang et al., ICML 2022" (F30). No slide-11 model names (cropped), no "1T+" or "10-100x" as fact.
Traps: 1 n13; 2 n0 (brief wording) + n23, n45 ("most"); 3 n32, n40, n44; 4 n35; 5 P13 pen; 6 n33 ("the slide
estimates"); 7 n19; 8 n14; 9 n34 ("by our count") + the 65M note; 10 n38 ("read"); 11 n5 ("a made-up language"; no
real language but English is named).
No countries, no companies' models beyond the cleared course names, no assistant names anywhere.

## 7. Length, and what to cut if the voice runs long
Planned 5:47 + end card on the strict L01-04 model. If the takes run past 5:30, cut in this order (each idea stays on
screen in pen): n39 off the voice, its pen marks in a 1.5 s hold (-4.5 s); "Hence the title." (-1.5 s); n42 off the
voice, the pans stay lettered (-5.4 s); n26 (-4.6 s; the back-arrows and "came before" carry it); n7 to "Each word here
is a token." (-2 s); then C1 with n3 and n4 (-14 s; n46 becomes "Next time you read a famous paper, guess what comes
after it."). All six: about -32 s, to about 5:15. If it runs short of 4:45, add F34 after n13 (training cost) or F14.

## 8. What was cut from the lecture, and why
- Slide 7 beyond C1; slides 8-10's illustrations (redrawn). The feed-forward "local update", positional encoding (F14),
  the per-layer detail of the decoder's attention, the KV-cache asides, "Kencdec / Vencdec": not needed to follow one
  sentence through.
- Slide 11's table and her spoken list of models (companies' models; the "LLaMA-3" and UL2 errata go with it); her
  mention of a chat product for translation: P8's prompt strip makes the point with our sentence (F28).
- Her "more parameters need more data" chain (not in FACTS); her advice on switching after two years (only C6 kept);
  T5's base-scale result (one honest limit is enough); summarization as a niche (not cleared).

```json
[
{"id": "n0", "en": "The paper that started it all was about translation. Today's big chatbots threw away half of its design."},
{"id": "n1", "en": "Which half, and why? Lecture 2 of Professor Yufei Ding's CSE 291P at UC San Diego."},
{"id": "n2", "en": "\"Attention Is All You Need\", 2017. Built to translate: a sentence in, its translation out."},
{"id": "n3", "en": "Her advice for reading an older paper:"},
{"id": "n4", "en": "Let's try, with one sentence."},
{"id": "n5", "en": "Our sentence, in a made-up language: mib tavoo krenn. It means: I am a student."},
{"id": "n6", "en": "The machine has two halves. The encoder reads the sentence. The decoder writes the translation."},
{"id": "n7", "en": "Here, each word is one token: one piece of text."},
{"id": "n8", "en": "In the encoder, every word can look at every other word, before and after it."},
{"id": "n9", "en": "Each word asks: which of the others are like me? It gathers from them, weighted by that, and updates itself. That's called attention."},
{"id": "n10", "en": "Before 2017, the best translators were mostly recurrent networks."},
{"id": "n11", "en": "A recurrent network reads one word after another: one step per word, a whisper passed down a line."},
{"id": "n12", "en": "Attention is a round table: all the words in one step, so a GPU can work on them at the same time."},
{"id": "n13", "en": "The paper dropped recurrence and kept only attention. Hence the title."},
{"id": "n14", "en": "Writing, though, is still one word at a time."},
{"id": "n15", "en": "Step 1: the decoder looks back at the encoder's reading of the whole sentence, and writes I."},
{"id": "n16", "en": "Step 2: I joins its input. It looks back again, and writes am."},
{"id": "n17", "en": "Step 3, a. Step 4, student."},
{"id": "n18", "en": "That look back, at every step, is called cross-attention."},
{"id": "n19", "en": "The decoder's own words follow one rule: each word may look at itself and the words before it, never ahead."},
{"id": "n20", "en": "So the writer keeps a card over what's ahead. No peeking. That's masked, or causal, attention."},
{"id": "n21", "en": "Her slide 11: the 2017 design, two stacks of six layers. Shaded red: what decoder-only models remove."},
{"id": "n22", "en": "Delete the encoder. The cross-attention has nothing left to look at, so it goes too. What stays: the masked decoder."},
{"id": "n23", "en": "Most of today's large chat models that publish their design keep only the decoder."},
{"id": "n24", "en": "With no encoder, how does it translate? Put it all on one strip: \"Translate to English: mib tavoo krenn.\""},
{"id": "n25", "en": "Ask it to translate, and it simply continues the text: I, am, a, student."},
{"id": "n26", "en": "The request came before, so the card never hides it."},
{"id": "n27", "en": "Two-stack models still show up in translation: a large 2022 translation model kept both halves."},
{"id": "n28", "en": "Why accept a less exact model? Her slide 12 keeps the books."},
{"id": "n29", "en": "The loss first: \"The bank was full of fish.\""},
{"id": "n30", "en": "Read one way only, and at the word bank, fish hasn't come yet. Money, or river?"},
{"id": "n31", "en": "The 2017 encoder reads both ways, on purpose."},
{"id": "n32", "en": "Looking only backward can hurt on some understanding tasks."},
{"id": "n33", "en": "The gains. Parameters are the numbers a model learns. Two stacks carry more: about 1.5 to 2 times, the slide estimates."},
{"id": "n34", "en": "By our count, the 2017 base model has about 63 million parameters. Cut the encoder and the cross-attention: about 38 million, about 40% fewer."},
{"id": "n35", "en": "To learn translation directly you need pairs: a sentence and its translation. That's paired data."},
{"id": "n36", "en": "The 2017 model learned from about 4.5 million sentence pairs."},
{"id": "n37", "en": "Our writer is a next-word model. A next-word model can learn from any text: hide the next word, guess it, check."},
{"id": "n38", "en": "GPT-3 read about 300 billion tokens. Llama 3, about 15 trillion."},
{"id": "n39", "en": "The pen adds Llama 3, and labels the multiplier the slide's rough guess."},
{"id": "n40", "en": "Still, a 2022 study found the next-word model best right after its first training on plain text, and the two-stack model ahead after extra training on many tasks."},
{"id": "n41", "en": "So which is better? She asks the question students ask:"},
{"id": "n42", "en": "Accurate: both halves, reading both ways. Simple: one half, any text."},
{"id": "n43", "en": "Remember episode one: scale changes what models can do. The simple design that scales won, for now."},
{"id": "n44", "en": "Nobody has proven it is the best design. Her verdict:"},
{"id": "n45", "en": "So most of today's big chat models kept just the writer and the card."},
{"id": "n46", "en": "Next time you read a famous paper, try her test: guess what comes after it."}
]
```
