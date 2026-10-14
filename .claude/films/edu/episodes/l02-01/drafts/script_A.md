# L02-01 "Why Chatbots Kept Only Half the Transformer" - script draft A (story / analogy first)

- Source: CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 2 "Transformer Model Architecture
  Variants (1)", slides 7-12, recording 11:41-28:09. Fifth episode of the daily series, after L01-04 (no recap of it).
  Facts: `../FACTS.md` only, in its Safe EN wording (soften rows verbatim); F-numbers per line. Clips: `../clips.json`.
- Runtime: planned **5:14** to the end of the bookend (end card after), at 2.79 spoken words/s (L01-04's measured rate
  at +4 %), 0.6 s gaps inside a panel, 1.1 s at panel changes, three short holds. The cut order at the bottom reaches
  5:00. 1080x1920, 30 fps, English only, the L01-01 line look (warm paper, ink that draws itself, red pen, washes, blue
  course accent, taped slides, mic tag "Prof. Ding · lecture 2" and red-bordered captions on her clips, logo end card).
- Words: **669 narration words in 42 lines (n0-n41), 128 words per minute** over 5:14 (limit 160). Her clips: **all 6,
  32.4 s (10.3 % of the runtime)**. Panels: **16 (P0-P15)**, 10-30 s each, plus the automatic end card.
- **Angle A: one picture carries everything.** The 2017 Transformer is a translation team at one long desk: the READER
  (encoder) reads the whole made-up sentence "mib tavoo krenn", back and forth; the WRITER (decoder) writes "I am a
  student." one word at a time, a card hiding what is ahead (the mask), glancing at the reader's folded notes
  (cross-attention). Her C1 ("can you predict what is the trend afterwards?") turns the viewer into the predictor:
  what would you cut? Answer: most of today's big chat models fired the reader. The writer works alone; your prompt is
  the start of her page. Lost: the bank with fish (she cannot peek ahead). Gained: one desk instead of two (fewer
  weights) and any text in the world as practice, where learning translation directly needs clipped pairs of cards.
  Then the honest limit (the reader still has work), her question, "no clean winner", and the bookend: the reader in
  pencil, the writer ringed, her strip holding the prompt and the answer.
- Terms defined before use: encoder / decoder (n3), recurrent network (n7), attention (n9), tokens (n12),
  bidirectional (n11 "before and after it", lettered on C2), cross-attention (n14), decoder-only (n18), masked /
  causal (n20), prompt (n21, by example), parameters / weights and stacks of layers (n28), pairs = paired data (n31).
- Honest limit: F30 (n34) plus F21 (n35); softened: F15 (n16 verbatim), F22 (n25 verbatim), F24 (n33), F25 (n31),
  F31 (n37-n38 verbatim). Layout rule for every panel: subjects fill 80-96 % of the width (the portrait paper in P1, 64 %; P12, two drawings at 47 % each); nothing the pen does sits
  under the caption band (lower third, from about y 1290) or, during a clip, under the mic tag (top right). Washes:
  blue = the reader / encoder (the course accent), pink = the writer / decoder, yellow = the one thing to look at.

## Beats (planned times; the voice decides)
| # | Time | Panel | Picture: drawing + what the code letters / the pen does | Voice |
| --- | --- | --- | --- | --- |
| P0 | 0:00-0:14 | **Cover = the puzzle** | Frame 0 is finished: `line_reader_writer` (~94 % wide, y 640-1280). His raised strip lettered "mib tavoo krenn", her strip on the desk "I am a student."; blue wash under him, pink under her. Title top-left "Why Chatbots Kept" (ink) / "Only Half the Transformer" (red); strip "CSE 291P · Lecture 2 · UC San Diego". A red dashed cut line runs down the desk just right of the folded note card, a small red "which half?" beside it. Nothing moves until n1, when the course strip gets its blue wash stroke. | n0, n1 |
| P1 | 0:14-0:26 | **The 2017 paper** | `line_paper` (~64 % wide, centred, y 300-1260). Heading lines lettered "Attention Is All You Need" / "Vaswani et al., 2017"; the ribbon "2017". n2: note card by the paper "built to translate". n3: in the paper's figure box, two hand-drawn boxes "encoder" (blue) → "decoder" (pink); red brackets "reads the sentence" / "writes the translation". 1 s hold. | n2, n3 |
| P2 | 0:26-0:38 | **The team** | `line_reader_writer` draws itself (~94 %, y 560-1180). Head "picture a team". n4: "the reader = encoder" (blue wash), "the writer = decoder" (pink wash). n5: his strip letters "mib tavoo krenn", pencil tag "a made-up language"; her strip writes "I am a student." word by word with the voice. The note card stays blank (pays off in P6). | n4, n5 |
| P3 | 0:38-0:50 | **One step per word** | `line_whisper_line` (~94 %, y 480-1120). Head "before 2017: recurrent networks". The first person's blank card lettered "mib tavoo krenn". n7: red arrows hop mouth to ear, each starting only when the last has landed (0.6 s apart); under the row "one step per word". The people act (whispering); nothing else moves. | n6, n7 |
| P4 | 0:50-1:12 | **Everyone at once** | `line_round_table` (square, ~84 %, y 380-1260). Head "attention". n8: the three blank cards on the table lettered "mib", "tavoo", "krenn". n9: from "krenn", red lines to the other two, one thick, one thin; pencil "like me? → gather → update", a small arrow back into its own card. n10: every card links to every other in one beat, all lines drawn at once; "every word, the same step"; small card "a GPU works on them all at once". Blue wash pooled under the table. | n8, n9, n10 |
| P5 | 1:13-1:34 | **The reader reads both ways** | Same desk; the camera eases into the left half (the reader ~90 % wide), his strip big. Head "the reader (encoder)". n11: red arcs from each word to each other word, arrowheads both ways, drawn together. n12: thin boxes round the three words, "tokens: words or pieces of words". C2: the pen follows her words, "mib → krenn" on "the first token can look at the third token", "tavoo → krenn" on "the second token", then "bidirectional = both ways" underlined. Blue wash under the strip. 0.8 s hold. | n11, n12, C2 |
| P6 | 1:35-2:02 | **The writer, and the notes** | The camera pans to the writer and the note card. Head "the writer (decoder)". n13: her strip writes "I", "am", "a", "student." one at a time; after each, a small red loop from the new word back to the line's start ("joins the input"). n14: the note card lettered "his notes"; a red dashed glance line from her eyes to it, "cross-attention". n15: the camera eases out to the whole desk, every label in place: "the 2017 team". C1 plays on that still state; on "predict what is the trend afterwards?" one red arrow runs off the right end of her strip to a red "?". | n13, n14, n15, C1 |
| P7 | 2:03-2:23 | **The cut (her slide 11)** | Slide 11's right half taped (the paper's figure with her red shading and "Removed from Decoder-only LLMs"; cropped below the title row, the table cropped off), ~88 %, y 300-1270; lettered under it "figure: Vaswani et al., 2017". n16: the pen rings "Removed from Decoder-only LLMs"; on "They fired the reader", "the reader" in red on the shaded left block. n17: "the notes: cross-attention" with an arrow to the shaded middle band. n18: red tick by "Masked Multi-Head Attention", "the writer, alone", head "decoder-only"; small pencil "GPT-1 (2018): already built this way". | n16, n17, n18 |
| P8 | 2:24-2:46 | **The writer alone** | `line_writer_cover` (~94 %, y 520-1150). Head "decoder-only". n19: the drawn card gets a red "the mask" and a yellow wash. n20: under the strip "each word: itself + the words before it · never ahead", then "masked = causal". n21: the camera pushes into the left of the strip (1.5x): pencil grey "mib tavoo krenn, in English:" with a red bracket "your prompt = the start of her page", then ink "I am a" word by word up to her pen; the card still covers the rest. Pink wash under her strip. | n19, n20, n21 |
| P9 | 2:46-3:13 | **The bank with fish** | `line_two_banks` (~94 %, y 640-1270); above it, large lettering "The bank was full of fish." (y 380-480), written during n22. n23: a hand-drawn index card slides over "was full of fish.", leaving "The bank"; red "money?" with an arrow to the left half, "river?" to the right. On "The reader saw", the card turns see-through, "fish" is ringed with an arrow to the leaping fish (yellow wash on the fish, the bank building to pencil), pencil "the reader: the whole sentence at once". C3: the pen underlines the whole lettered sentence on "look at the whole sentence". n25: small red line under the drawing "only backward: can hurt on some understanding tasks". | n22, n23, n24, C3, n25 |
| P10 | 3:14-3:25 | **The trade (her slide 12)** | Slide 12 taped whole (~96 %, y 480-1060). C4: on "losing something" the pen underlines the Bidirectional Context row, "lost" in the margin; on "gaining something" a bracket over the Parameters and Training Data rows, "gained". n26: beside "poorer", the pen adds "can hurt on some tasks". 1.2 s hold. | C4, n26 |
| P11 | 3:25-3:50 | **One desk instead of two** | `line_block_towers` (~92 %, y 420-1080). Head "first gain". n27: "one desk: decoder-only" by the single tower; on the bridged towers "encoder" and "decoder", the planks "the notes: cross-attention" (red arrow). n28: a bracket "6 layers" on a tower; slide 12's Parameters row, cropped, taped under the drawing (y 1110-1250), "~1.5–2×" underlined, "the slide's estimate". n29: card over the drawing (y 280-400) "our count, the 2017 base model: about 63M → about 38M weights · about 40% fewer (the paper says 65M)". Yellow wash on the single tower. | n27, n28, n29 |
| P12 | 3:50-4:14 | **Any text is practice** | Two drawings side by side (y 400-930): `line_paired_cards` (left, ~47 %) and `line_heap` (right, ~47 %). Head "second gain: practice". n31: the front pair lettered "mib tavoo krenn" / "I am a student."; "paired data" over the cards; "about 4.5 million sentence pairs (2017, one of its two tasks)". n32: "any text" over the heap; one sheet lifts out as a card (y 960-1090): "The bank was full of ___" → pencil "fish" → red tick; "hide the next word, guess it, check". n33: slide 12's Training Data row, cropped, taped (y 1110-1250): "300B" ringed + "GPT-3"; "1T+" struck → "Llama 3: ~15T"; "10–100× less" ringed → "the slide's rough guess". Pink wash under the cards, blue under the heap. | n30-n33 |
| P13 | 4:15-4:28 | **The reader still has work** | `line_reader_writer` whole again (~94 %, y 700-1270), the reader in full ink with his blue wash. Head "one honest limit". Card (y 300-640): "a 2022 study (Wang et al.) · right after training on plain text: the lone writer best · after extra training on many tasks: the team ahead". n35: a smaller card on the desk front: "translation: two-stack models still show up · a large 2022 translation model kept both halves". | n34, n35 |
| P14 | 4:29-4:59 | **Accurate or simple?** | `line_balance` (~80 %, y 470-1200). Head in red, slide 12's own line in quotes: "Accurate modeling vs. Simple modeling?", small "her slide 12". C5: the pen underlines the head. n37: left pan "the team: more exact" (blue wash), right pan "the lone writer: scales, simple" (pink wash). n38: card under the right pan "episode one: scale changes what models can do"; "won, for now" in red; pencil at the base "nobody has proven it is the best design". C6: a red two-way arrow between the pans on "alternating". | n36, C5, n37, n38, n39, C6 |
| P15 | 5:00-5:14 | **Bookend** | The cover layout again. n40: the left half (the reader and the note card) fades to pencil grey, red "cut: the reader (encoder) + the notes (cross-attention)"; a red ring round the writer, "kept: the writer (decoder)"; her strip now reads, small, "mib tavoo krenn, in English: I am a student." (the prompt in pencil). n41: under the title, red "what comes next?". 1.5 s hold on the finished page. | n40, n41 |
| - | 5:14-5:19 | end card | Automatic logo card: "After Prof. Yufei Ding's CSE 291P, Lecture 2 · UC San Diego · Picasso Lab". Small print: "Figure on slide 11: Vaswani et al., 2017. Decoding steps after Jay Alammar, The Illustrated Transformer (2018). GPT-3: Brown et al., 2020. Llama 3: Llama Team, 2024. The 2022 study: Wang et al., ICML 2022. Translation model: NLLB Team, 2022. The 63M / 38M split is our count. 'mib tavoo krenn' is made up. The narration is a synthetic voice." | - |

## Narration (synthetic voice; planned start · panel · words · FACTS rows; clips in place)
n0: "The paper that started it all was about translation. Today's big chatbots threw away half of its design."  
   0:00.3 · P0 · 18 w · work-order hook; F1, F2; F15 ("today's big chatbots", never "every")
n1: "Which half, and why? From Lecture 2 of Professor Yufei Ding's CSE 291P at UC San Diego."  
   0:07.4 · P0 · 17 w · source key L02 (the credit line)
n2: "The paper: “Attention Is All You Need”, 2017. Its model, the Transformer, was built to translate."  
   0:14.5 · P1 · 16 w · F1; F2
n3: "The encoder reads the sentence; the decoder writes the translation."  
   0:20.9 · P1 · 10 w · F3 (its safe wording)
n4: "Picture them as a team at one desk: a reader and a writer."  
   0:26.6 · P2 · 13 w · F3 (the analogy: reader = encoder, writer = decoder)
n5: "He reads a sentence in a made-up language. She writes the translation: I am a student."  
   0:31.8 · P2 · 16 w · RUN (the made-up sentence, "I am a student."); F2
n6: "Before 2017, the best translators were mostly recurrent networks."  
   0:38.7 · P3 · 9 w · F13
n7: "A recurrent network reads one word after another, like a whisper passed down a line: one step per word."  
   0:42.5 · P3 · 19 w · F9 ("one step per word"); the whisper is our analogy
n8: "The 2017 paper dropped the whisper line and kept only attention."  
   0:50.4 · P4 · 11 w · F12 ("kept only attention"; Trap 1)
n9: "Attention is a round table. Each word asks: which of the others are like me? It gathers from them, weighted by that, and updates itself."  
   0:54.9 · P4 · 25 w · F11 (its safe wording)
n10: "Unlike the whisper line, every word does this in the same step, so a GPU chip can do them all at once."  
   1:04.5 · P4 · 22 w · F9, F10 ("unlike recurrent networks"; never "the first parallel model")
n11: "The reader uses attention: every word can look at every other word, before and after it."  
   1:13.5 · P5 · 16 w · F5
n12: "Models read text in tokens: words or pieces of words. Professor Ding:"  
   1:19.8 · P5 · 12 w · the term tokens (as in L01-03; her 14:35 "after tokenizations, we have a series of tokens"); sets up C2
   **C2** her clip, 1:24.9, 8.4 s
n13: "The writer writes one word at a time, and each new word joins the input for the next."  
   1:35.2 · P6 · 18 w · F8 (Trap 8: the writing stays word by word)
n14: "Before each word, she glances at the reader's notes: his reading of the whole input. That glance is called cross-attention."  
   1:42.3 · P6 · 20 w · F7
n15: "That's the 2017 team. Professor Ding's advice for reading any paper:"  
   1:50.0 · P6 · 11 w · F33 (lead-in to C1)
   **C1** her clip, 1:54.8, 7.2 s
n16: "What would you cut? Most of today's large chat models that publish their design keep only the decoder. They fired the reader."  
   2:03.1 · P7 · 22 w · F15 (its soften wording, verbatim) + the analogy
n17: "Slide 11 of the lecture shades the cut in red: the encoder, and the cross-attention, which has nothing left to look at."  
   2:11.6 · P7 · 22 w · F16; slide 11 (crop)
n18: "What stays: the decoder alone. It's called decoder-only."  
   2:20.1 · P7 · 8 w · F16 ("what stays"); slide 11's title; GPT1 4.1 (the term)
n19: "Alone, the writer keeps the rule she always had: a card hides the rest of her strip."  
   2:24.0 · P8 · 17 w · F6 (the card is our analogy; her 19:46: the decoder was causal in 2017 too)
n20: "Each word may look at itself and the words before it, never ahead. That's called masked, or causal, attention."  
   2:30.7 · P8 · 19 w · F6 ("itself and the words before it"; Trap 7)
n21: "Your prompt becomes the start of her page. Write the made-up sentence, then “in English:”, and she simply continues the text."  
   2:38.1 · P8 · 21 w · F28; RUN (the made-up sentence)
n22: "What does she lose? Try this: The bank was full of fish."  
   2:46.7 · P9 · 12 w · RUN ("The bank was full of fish.")
n23: "When she reaches bank, the card hides the fish. Money, or river? The reader saw the whole sentence at once."  
   2:51.7 · P9 · 20 w · F5, F6 (the analogy)
n24: "Why read both ways at all? Professor Ding:"  
   2:59.4 · P9 · 8 w · lead-in to C3
   **C3** her clip, 3:03.1, 6.1 s
n25: "Looking only backward can hurt on some understanding tasks."  
   3:09.8 · P9 · 9 w · F22 (its soften wording, verbatim)
   **C4** her clip, 3:14.3, 2.8 s
n26: "Slide 12 of the lecture sets out the trade: what is lost, and what is gained."  
   3:17.7 · P10 · 16 w · L02 slide 12
n27: "First gain: one desk instead of two."  
   3:25.7 · P11 · 7 w · F23 (the analogy)
n28: "The numbers a model learns are called parameters, or weights. Each half is a stack of layers, and two stacks carry more: about 1.5 to 2 times, the slide estimates."  
   3:28.9 · P11 · 30 w · F23 ("the slide estimates"; Trap 6); F4 (the layers)
n29: "By our count, cutting the reader and the notes takes the 2017 base model from about 63 million weights to about 38 million: about 40% fewer."  
   3:40.2 · P11 · 26 w · F23, RUN (about 63M to about 38M, 40%, "by our count"; Trap 9)
n30: "Second gain, the big one: practice."  
   3:50.6 · P12 · 6 w · F27 (lead-in)
n31: "To learn translation directly you need pairs: a sentence and its translation. The 2017 model learned from about 4.5 million sentence pairs."  
   3:53.4 · P12 · 22 w · F25 (first sentence, verbatim; Trap 4), F26
n32: "For a writer who only guesses the next word, any text is a lesson: hide the next word, guess it, check."  
   4:01.9 · P12 · 21 w · F27 (its safe wording)
n33: "GPT-3 read about 300 billion tokens; Llama 3, about 15 trillion."  
   4:10.0 · P12 · 11 w · F24 (its soften wording, verbatim), F18, F19 (Trap 10: tokens read)
n34: "One honest limit. A 2022 study found the lone writer best right after training on plain text, but the team ahead after extra training on many tasks."  
   4:15.0 · P13 · 27 w · F30 (the honest limit; lone writer = next-word model, team = two-stack model)
n35: "And two-stack models still show up in translation."  
   4:25.3 · P13 · 8 w · F21 (first clause of its soften wording)
n36: "Professor Ding asks the question students ask:"  
   4:29.3 · P14 · 7 w · F29 (lead-in to C5)
   **C5** her clip, 4:32.6, 3.6 s
n37: "The team is more exact. The lone writer? It scales smoothly and keeps the recipe simple."  
   4:36.8 · P14 · 16 w · F29 (the team = accurate modeling; work order "a less exact model"), F31 (first sentence, verbatim)
n38: "Remember episode one: scale changes what models can do. The simple design that scales won, for now. Nobody has proven it is the best design."  
   4:43.1 · P14 · 25 w · F35 (verbatim), F29 ("won, for now"), F31 (second sentence, verbatim)
n39: "Professor Ding's answer:"  
   4:52.7 · P14 · 3 w · F32 (lead-in to C6)
   **C6** her clip, 4:54.6, 4.3 s
n40: "In 2017: a reader and a writer. Today's big chatbots kept only the writer: she never peeks ahead, but any text is practice."  
   5:00.0 · P15 · 23 w · F3, F15, F6, F27 (the bookend)
n41: "Next time you read a paper, ask what comes next."  
   5:08.8 · P15 · 10 w · F33 (an echo of C1, not a quote)

**669 narration words in 42 lines, 127.9 words per minute over 5:13.9** (the voice decides the final clock). Her
clips: 6, 32.4 s, 10.3 %. Planned panel spans: P0 13.1 s · P1 10.9 · P2 11.0 · P3 10.6 · P4 22.0 · P5 20.6 · P6 26.8 ·
P7 19.8 · P8 21.6 · P9 26.3 · P10 10.3 · P11 23.8 · P12 23.3 · P13 13.1 · P14 29.6 · P15 13.9. The hook: n0 starts at
0.3 s; "threw away half" lands near 5 s, and the cover's title poses the same puzzle from frame 0.

## Her clips (text exactly as clips.json; 6 clips, 32.4 s)
| Clip | Recording | Text (captions show exactly this) | Where | Set up / paid off |
| --- | --- | --- | --- | --- |
| C2 (8.4 s) | 19:32-19:41 | "So even the first token can look at the third token. And the second token can also look at the third token. So it's bidirectional for the encoding part." | P5, after n12 | n11 shows the reader's arcs, n12 defines tokens and hands over ("Professor Ding:"); the pen draws her two arrows on her words and underlines "bidirectional = both ways". |
| C1 (7.2 s) | 12:33-12:40 | "you can always ask yourself, can you predict what is the trend afterwards? And can you improve that paper?" | P6, after n15 | n15 frames it as her advice for reading any paper, on the finished 2017 team; n16 turns it into the viewer's question, "What would you cut?" |
| C3 (6.1 s) | 25:02-25:09 | "Because if you look at the translation example, at least we believe for the translation, we should look at the whole sentence." | P9, after n24 | n24 asks "Why read both ways at all?", so her "Because" answers it; n25 gives the softened loss (F22). |
| C4 (2.8 s) | 25:50-25:53 | "So we are losing something. But we are gaining something." | opens P10 (slide 12, where she said it) | follows the loss directly; the pen marks "lost" and "gained" on her table in step with her two sentences. |
| C5 (3.6 s) | 27:24-27:27 | "when you should do accurate modeling and when you should do simple modeling?" | P14, after n36 | n36 "Professor Ding asks the question students ask:" (her own "But students may ask," is cut); n37 maps team = exact, lone writer = simple. |
| C6 (4.3 s) | 27:51-27:55 | "Because it's always alternating between each other. No clean winner." | P14, after n39 | n39 "Professor Ding's answer:" ties it to C5; F31's "nobody has proven" comes just before, so the film ends the argument on her words. |

- In the narration Prof. Ding is always "Professor Ding" (never "she"), because "she" is the writer.
- Swap if a clip fails by ear: C1 can drop with n15 (n16 still opens "What would you cut?"); C4 can drop (P10 then
  runs n26 with a 2.5 s hold, the pen marking lost / gained on the voice). C2, C3, C5, C6 carry explanations and should stay.

## Drawings
- New for this episode, used: `line_reader_writer` (P0, P2, P5, P6, P13, P15: the carrier; camera crops left / right
  for variety), `line_writer_cover` (P8), `line_whisper_line` (P3), `line_round_table` (P4), `line_two_banks` (P9),
  `line_block_towers` (P11; the redraw keeps one tower vs two bridged towers, so the planks read as cross-attention),
  `line_paired_cards` (P12).
- Reused: `line_paper` (P1), `line_heap` (P12), `line_balance` (P14), `line_mic` (the tag on all six clips).
- Not used: `line_chat_first`, `line_lab_2017`, `line_grow` (no character appears unless it acts; the scale callback
  is one card in P14). No new drawing is needed.
- Code-drawn only: lettering, red-pen marks (rings, underlines, ticks, strike-throughs, arrows, brackets, the dashed
  cut line, the two-way arrow), hand-drawn boxes, note and index cards (the sliding card over "was full of fish."),
  washes, the taped slide pieces. The reader, the writer, the whisperers, the table, the kids, the hand are invented
  characters; Prof. Ding is never drawn.

## Slides on screen
- 11: right half only (the paper's figure with her red shading and label), cropped below the title row; credit
  "figure: Vaswani et al., 2017". The table and its model column are cropped off and never mentioned.
- 12: whole (P10), then two cropped rows taped under drawings: Parameters (P11), Training Data (P12, the "1T+" and
  "10–100× less" fixes); its bottom line is lettered as P14's head in quotes.
- Not shown: 7 (outline), 8-10 (another author's illustrations; the encoder / decoder and the decoding steps are
  redrawn as the desk, credited on the end card).

## Facts on screen beyond the voice
"6 layers" (F4); "the paper says 65M" (VAS Table 3, RUN note); "GPT-1 (2018): already built this way" (F17); "2017,
one of its two tasks" (F26); "GPT-3" by "300B" (F18); "Llama 3: ~15T" (F24, erratum); "the slide's rough guess" on
"10–100× less" (F25); "the slide's estimate" on "~1.5–2×" (F23); "can hurt on some tasks" by "poorer" (F22, erratum);
"Wang et al." (F30); "a large 2022 translation model kept both halves" (F21); "figure: Vaswani et al., 2017" (F1,
third-party table); "episode one: scale changes what models can do" (F35). No number appears that is not in FACTS.

## Checks against the Traps
1. Attention is never "invented": n8 "kept only attention". 2. Never "every" or "all" chatbots: the hook says
"today's big chatbots"; n16 is F15 verbatim ("Most ... that publish their design"). 3. Decoder-only is not "simply
better": n34 (F30), n35 (F21), n38 ("Nobody has proven ..."), C6. 4. Pairs only "to learn translation directly" (n31);
the cards are labelled "paired data", never "what the team needs". 5. "10–100×" and "1T+" appear only on her slide,
marked by the pen. 6. "about 1.5 to 2 times, the slide estimates" (n28). 7. The mask always includes "itself" (n20).
8. Writing stays word by word (n13; n10 is about every word being processed in one step). 9. 63M / 38M / 40% are
"by our count" (n29) and the card shows the paper's 65M. 10. GPT-3's tokens are "read" (n33). 11. "a sentence in a
made-up language" (n5); the only real language named is English.
House rules: nothing from the banned-topics list (no countries, no politics); no pictograms; no assistant or product names (only GPT-1,
GPT-3, Llama 3, cleared in FACTS); no joke about a real person (the gags are the writer's card, the fired reader, the
bank with fish, the flustered tower builder: all invented characters, and each gag is the explanation).

## Cut order to reach 5:00 (each cut is clean)
1. n15 + C1 (-12.4 s, lands at 5:01): P6 ends on n14 with the camera easing out; n16 opens "What would you cut?".
2. n35 to lettering only (-3.5 s): the F21 card stays on P13.
3. n1's "Which half, and why?" (-1.6 s): the cover already letters "which half?".
4. n2's "Its model, the Transformer," (-1.1 s): "The paper: ..., 2017. It was built to translate."

## Spare lines if the cut runs short (cleared)
- F20 (after n35): "T5 and BART, both 2019, kept both halves."
- F34 (after n10): "The small version trained in about 12 hours on one machine with eight GPUs."
- F17 (after n18, then off the P7 lettering): "GPT-1, in 2018, was a 12-layer decoder-only transformer."

## Voice lines (in order; clips not included)
```json
[
{"id": "n0", "en": "The paper that started it all was about translation. Today's big chatbots threw away half of its design."},
{"id": "n1", "en": "Which half, and why? From Lecture 2 of Professor Yufei Ding's CSE 291P at UC San Diego."},
{"id": "n2", "en": "The paper: “Attention Is All You Need”, 2017. Its model, the Transformer, was built to translate."},
{"id": "n3", "en": "The encoder reads the sentence; the decoder writes the translation."},
{"id": "n4", "en": "Picture them as a team at one desk: a reader and a writer."},
{"id": "n5", "en": "He reads a sentence in a made-up language. She writes the translation: I am a student."},
{"id": "n6", "en": "Before 2017, the best translators were mostly recurrent networks."},
{"id": "n7", "en": "A recurrent network reads one word after another, like a whisper passed down a line: one step per word."},
{"id": "n8", "en": "The 2017 paper dropped the whisper line and kept only attention."},
{"id": "n9", "en": "Attention is a round table. Each word asks: which of the others are like me? It gathers from them, weighted by that, and updates itself."},
{"id": "n10", "en": "Unlike the whisper line, every word does this in the same step, so a GPU chip can do them all at once."},
{"id": "n11", "en": "The reader uses attention: every word can look at every other word, before and after it."},
{"id": "n12", "en": "Models read text in tokens: words or pieces of words. Professor Ding:"},
{"id": "n13", "en": "The writer writes one word at a time, and each new word joins the input for the next."},
{"id": "n14", "en": "Before each word, she glances at the reader's notes: his reading of the whole input. That glance is called cross-attention."},
{"id": "n15", "en": "That's the 2017 team. Professor Ding's advice for reading any paper:"},
{"id": "n16", "en": "What would you cut? Most of today's large chat models that publish their design keep only the decoder. They fired the reader."},
{"id": "n17", "en": "Slide 11 of the lecture shades the cut in red: the encoder, and the cross-attention, which has nothing left to look at."},
{"id": "n18", "en": "What stays: the decoder alone. It's called decoder-only."},
{"id": "n19", "en": "Alone, the writer keeps the rule she always had: a card hides the rest of her strip."},
{"id": "n20", "en": "Each word may look at itself and the words before it, never ahead. That's called masked, or causal, attention."},
{"id": "n21", "en": "Your prompt becomes the start of her page. Write the made-up sentence, then “in English:”, and she simply continues the text."},
{"id": "n22", "en": "What does she lose? Try this: The bank was full of fish."},
{"id": "n23", "en": "When she reaches bank, the card hides the fish. Money, or river? The reader saw the whole sentence at once."},
{"id": "n24", "en": "Why read both ways at all? Professor Ding:"},
{"id": "n25", "en": "Looking only backward can hurt on some understanding tasks."},
{"id": "n26", "en": "Slide 12 of the lecture sets out the trade: what is lost, and what is gained."},
{"id": "n27", "en": "First gain: one desk instead of two."},
{"id": "n28", "en": "The numbers a model learns are called parameters, or weights. Each half is a stack of layers, and two stacks carry more: about 1.5 to 2 times, the slide estimates."},
{"id": "n29", "en": "By our count, cutting the reader and the notes takes the 2017 base model from about 63 million weights to about 38 million: about 40% fewer."},
{"id": "n30", "en": "Second gain, the big one: practice."},
{"id": "n31", "en": "To learn translation directly you need pairs: a sentence and its translation. The 2017 model learned from about 4.5 million sentence pairs."},
{"id": "n32", "en": "For a writer who only guesses the next word, any text is a lesson: hide the next word, guess it, check."},
{"id": "n33", "en": "GPT-3 read about 300 billion tokens; Llama 3, about 15 trillion."},
{"id": "n34", "en": "One honest limit. A 2022 study found the lone writer best right after training on plain text, but the team ahead after extra training on many tasks."},
{"id": "n35", "en": "And two-stack models still show up in translation."},
{"id": "n36", "en": "Professor Ding asks the question students ask:"},
{"id": "n37", "en": "The team is more exact. The lone writer? It scales smoothly and keeps the recipe simple."},
{"id": "n38", "en": "Remember episode one: scale changes what models can do. The simple design that scales won, for now. Nobody has proven it is the best design."},
{"id": "n39", "en": "Professor Ding's answer:"},
{"id": "n40", "en": "In 2017: a reader and a writer. Today's big chatbots kept only the writer: she never peeks ahead, but any text is practice."},
{"id": "n41", "en": "Next time you read a paper, ask what comes next."}
]
```
