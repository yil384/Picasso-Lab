# L02-01 "Why Chatbots Kept Only Half the Transformer": judging A and B

## Recount and runtime (brief's model: 2.55 words/s + 0.4 s a line + 1 s at each panel change + clips)
| | words | lines | panels | clips | estimate | + named holds | wpm | clip share |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | 669 | 42 | 16 (15 changes) | 6, 32.4 s | 262.4 + 16.8 + 15 + 32.4 = 326.6 s = **5:27** | +4.5 s = 5:31 | 123 | 9.9 % |
| B | 672 | 47 | 16 (15 changes) | 6, 32.4 s | 263.5 + 18.8 + 15 + 32.4 = 329.7 s = **5:30** | +2.8 s = 5:32 | 122 | 9.8 % |

Both are under 160 wpm and about 30 s over the 5:00 target. Numbers read aloud ("2017", "291P", "4.5") add a few
more seconds (A has 22 numeric tokens, B 27). A says its own plan is 5:14, B says 5:47; on the shared model they are
level. Longest panel by the model: A P14 30.6 s (five beats); B P4 26.1 s. B P9 is 8.9 s, under the 10 s floor.
Captions: all six clip texts in both drafts match clips.json exactly.

## Scores
| Criterion | A (story first) | B (worked example first) |
| --- | --- | --- |
| 1 Hook | 8: n0 at 0.3 s; the cover's "which half?" and an unlabelled cut line keep the puzzle open; paid off at 2:03 (n16 "They fired the reader"), bookend reprises | 6: same line, but frame 0 gives the answer away (red wash over the reader, "kept" + tick on the writer); payoff at 2:37-2:46; C1 at 0:26 stalls |
| 2 Clarity | 8: one desk carries everything; every listed term defined before use; slips: n27 "one desk instead of two" contradicts n4 "a team at one desk"; n14 calls the glance cross-attention, n29/P7/P11/P15 call the notes cross-attention; n28 packs 3 ideas | 7: the step-by-step decoding is concrete and Trap 8 is explicit (n14); but "the writer" is first spoken at n20 with no set-up; "decoder-only models" used (n21) before defined; "the Transformer" never spoken; "She" in n41 has no near antecedent; n17 "Step 3, a." reads badly |
| 3 Accuracy | 8: no Trap broken; soft spots listed below | 8: no Trap broken; soft spots listed below |
| 4 Her voice | 8: C1 turns the viewer into the predictor right before the cut ("What would you cut?"); C3 answers "Why read both ways at all?"; C2 pen on her words; but n26 repeats C4, and C6's "Because" follows "answer:" to a "when" question | 7: C4 set up by "Why accept a less exact model?" and C6 by "Nobody has proven ... Her verdict:" (both better than A); but C1 lands before any content and n4 "Let's try, with one sentence." does not follow from it |
| 5 Pace | 7: P14 holds C5, pans, callback, "won, for now", "nobody has proven", C6 in ~30 s; P10 is a C4 echo | 6: P1 spends 20 s on paper + advice; P8 (4 ideas) and P13 (errata, study, C5, meta line n39) overloaded; P9 short |
| 6 Craft | 8: gags are the explanation (whisper line, round table, fired reader, card, bank with fish, flustered builder); listed drawings only; the made-up words stay lettered (no gibberish for the voice) | 8: the slide-11 "surgery" (the shaded encoder cut out of the printout) is the best visual in either draft; card motif reused on the bank; but the cover spoils the puzzle and P4 shrinks the whisper line to 620 px |
| **Total** | **47** | **42** |

Both: no mascot, no politics or China-related content, no assistant names, only cleared model names (GPT-1, GPT-3,
Llama 3, T5, BART), no joke about a real person, slides 8-10 not taped, slide 11 right half only.

### Accuracy: lines beyond the safe wording
A
- n40 "Today's big chatbots kept only the writer": the unhedged hook form outside the hook (F15, Trap 2). Needs "most".
- n34 swaps F30's "next-word model" / "two-stack model" for "the lone writer" / "the team": implies the 2022 study
  tested the 2017 team. Use the safe wording; the analogy stays on the card.
- n30 "the big one": ranks data over parameters; not in FACTS.
- n15 "for reading any paper": her context (12:26-12:29) is a paper read without knowing later work.
- n29, P7, P11, P15 "the notes: cross-attention" vs n14 "That glance is called cross-attention": internal mismatch.
- P10 tapes slide 12 whole with "1T+" and "10-100x less" unmarked; the pen fixes them only at P12, ~36 s later (F24, F25).
- Every/all: n10 "every word ... all at once" (F9), n11 "every word ... every other word" (F5): both cleared.
- Numbers: all in FACTS (2017, 2018, 2022, 6, 63M, 38M, 40%, 65M, 1.5-2, 4.5M, 300B, 15T).
B
- n13 "Hence the title.": an inference no FACTS row states (low risk; not grafted).
- P8 card "still both halves: translation (a large 2022 model) · T5, BART (2019)": "still" suggests the 2019 models
  are today's survivors; F20 only clears "T5 and BART, both 2019, kept both halves".
- P9 tapes slide 12 whole, unmarked, 1:24 before the P13 corrections (F24, F25).
- n7 "Here, each word is one token" (a labelled simplification); n21 "decoder-only models" before definition.
- Every/all: n8 (F5), n12 "all the words in one step" (F9), n18 "at every step" (F7): cleared.
- Numbers: all in FACTS (adds arXiv:1706.03762, "12-layer", "N x = 6").

## Winner: A
A's spine is one picture that pays off the hook early: the team at one desk, the viewer asked "What would you cut?"
on her own advice, the reader fired at 2:03, the lone writer's card, the bank she cannot peek at, one stack and any
text as the gains, the bookend. B is more literal about her slides 9-12 and has the stronger single images
(slide surgery, the decoding steps) and better clip set-ups; those graft cleanly.

## Graft from B
1. B P7 surgery into A P7: a dashed red cut round the shaded encoder, the piece slides off the printout, then the
   shaded cross-attention band the same way; tick "stays"; fallback: a blank taped sheet over each piece. Voice: B n22's
   first two sentences replace A n17: "Delete the encoder. The cross-attention has nothing left to look at, so it goes
   too." A n18 stays ("What stays: the decoder alone. It's called decoder-only.").
2. B n14 opens A n13: "Writing, though, is still one word at a time, and each new word joins the input for the next."
3. B P5's header "decoding time step: 1 2 3 4" into A P6 (no extra voice): each number ringed as "I", "am", "a",
   "student." letter on, a red arrow from the note card to her pen per step.
4. B n28 replaces A n26 as C4's set-up (A's naming rule): "So why accept a less exact model? Professor Ding's slide 12
   keeps the books." Then C4 with A's "lost" / "gained" pen marks.
5. B n26 merged into A n21: "Your prompt is the start of her page, so the card never hides it: write the made-up
   sentence, then “in English:”, and she simply continues the text."
6. B n35's "That's paired data." after the first sentence of A n31 (the term is spoken, not only lettered).
7. B n42 replaces A n37: "Accurate: the team, reading both ways. Simple: the lone writer, any text."
8. B n44's set-up: A n39 becomes "Professor Ding's verdict:" (right after "Nobody has proven it is the best design.").
9. B n45's hedge into A n40 (fix 4). 10. B n3's "an older paper" into A n15.
11. B P13's pen note "to learn translation directly" beside "needs paired/parallel data" on A P12's slide crop (Trap 4).
12. B's spoken-forms list ("CSE 291P", "GPT-3", "40%", pauses round quoted sentences) and the underline on "Half" at n0.
Not grafted: B n13 "Hence the title." (no FACTS row), n17 "Step 3, a." (voice), n39 (narrates the pen), B's cover
(spoils the puzzle), C1 at 0:26, the spoken gibberish "mib tavoo krenn" (A keeps it lettered only).

## Fixes for the synthesis (most important first)
1. Runtime. A with grafts 1-8 is about 5:25. Trim to about 5:11 + holds (631 words, all six clips):
   n1 -> "From Lecture 2 of Professor Yufei Ding's CSE 291P at UC San Diego." (the cover letters "which half?");
   n4 + n5 -> "Picture a team at one desk. The reader takes a sentence in a made-up language; the writer writes: I am
   a student."; n14 -> "Before each word, she reads his notes on the whole input. That is cross-attention.";
   n29 -> "By our count, that cut takes the 2017 base model from about 63 million parameters to about 38 million:
   about 40% fewer."; n32 -> "For a next-word model, any text is a lesson: hide the next word, guess it, check.";
   n40 as in fix 4. If the rendered voice still runs past 5:15, cut n15 + C1 (A's own cut 1, -12 s, about 5:02);
   n16 then opens "What would you cut?" and n41 stays.
2. n27 + P11: "one desk instead of two" contradicts n4. -> "First gain: one stack instead of two."; lettering
   "one stack: decoder-only" by the single tower (never "desk").
3. Cross-attention is reading the notes, one mapping everywhere: n14 as in fix 1; n29 says "that cut" (fix 1);
   P7, P11 planks and P15 lettered "reading his notes: cross-attention", not "the notes".
4. n40 -> "Most of today's big chat models kept only the writer: she never peeks ahead, but any text is practice."
   (F15, Trap 2; the hook alone keeps the brief's wording; the picture already shows "in 2017: reader + writer").
5. Slide 12 errata on its first appearance (P10): during the 1.2 s hold after C4 the pen strikes "1T+" ->
   "Llama 3: ~15T" and brackets "10-100x less" "the slide's rough guess" (no voice); P12's crop repeats them (F24, F25).
6. n26 -> graft 4 (it no longer echoes C4).
7. n34 -> "One honest limit. A 2022 study found the next-word model best right after training on plain text, but the
   two-stack model ahead after extra training on many tasks." (F30; "next-word model" set up by n32 in fix 1; the card
   may add "the lone writer" / "the team").
8. n19 "the rule she always had": in P6 a code-drawn index card sits right of her pen during n13 (no voice), so
   "always" pays off; P8 then rings the drawn card "the mask".
9. n16: a 1.0 s hold after "What would you cut?" (the viewer's turn; the pen's "?" lands there), then the answer.
10. n30: drop "the big one" (a ranking not in FACTS); "Second gain: practice." opens n31.
11. P14 to 25 s or less: C5 -> n37 (graft 7) -> n38 -> n39 (graft 8) -> C6; the episode-one card small, lettered on
    the voice; no other marks.
12. n28 (30 words) -> "The numbers a model learns are called parameters, or weights. Each half is a stack of layers;
    two stacks carry more: about 1.5 to 2 times, the slide estimates." Use one term after that (fix 1 says
    "parameters").
13. Keep "Its model, the Transformer," in n2: the only spoken use of the title's key word (withdraw A's cut 4).
14. n15 -> "That's the 2017 team. Professor Ding's advice for reading an older paper:" (graft 10).
15. n0 starts by 0.3 s; at 2.55 words/s "threw away half" lands near 5.8 s, so the cover title must carry the puzzle
    from frame 0 (keep the brief's wording; keep the cover unlabelled: no wash, no tick, only the cut line and
    "which half?").
16. Captions: "bank" in quotes in n23; "mib tavoo krenn" stays lettered, never spoken; listen to C2 for
    "bidirectional" (normalised from "bi-directional").
