# L01-03 review (independent, pre-render)

Looked at: r6 sheets s0-s2, guides_r6, r6 full frames (0, 90, 1518, 2670, 4011, 4893, 5832, 6495, 7332, 7764, 8214, 9315,
9912, 10824, 11295, 11652, 12483), and safety-render frames for what r6 does not show (520, 600, 1540, 1780, 2300, 3480,
5400, 5820, 6770, 8440, 8810, 9000, 10200, 10460, 11380, 11590, 11830, 12180, 12350). r6 has no frame of p12 (receipt) or
p16 (bookend), nor of the slide-22 "not 3x" card, the clerk card or the slide-24 card.

## Verdict
- Facts: the voice and captions trace to FACTS rows in their safe wording. All 7 quotes equal clips.json, the TTS words match vo_lines.json, and no trap is hit in the film. Two problems: one false line on screen ("not today's"), and the X post drops the conditions F8, F10, F14 and F22 attach.
- Clarity: easy to follow, and the hook is posed (0:00-0:14) and paid off ("That's where they come from", 3:10). Two gaps: "token" is never defined, and the step from rare entries to "the bill" has no bridge.
- Craft: the look meets L01-01, but several frames are broken. On slide 23 (the payoff) the pen strikes the wrong words. The mic tag sits on the art in 4 panels. The caption covers the 32,000 cabinet on the cover and the bookend. Every FACTS qualifier is 19-24 px, too small to read on a phone.

## Must-fix

**M1. X post drops FACTS conditions** (x_post.md).
- Main post: F8 requires "at a width of 4,096" and "the input table alone". Replace with: "Grow a model's dictionary from 32,000 entries to 200,000 and, at a width of 4,096, its input table alone gains almost 700 million parameters, before any of them has learned a thing. Why do it?"
- 2/: F14 is measured "inside a sentence" (at the start of a text, Llama 3 gives v | ocabulary, RUN). Write: "Inside a sentence, the word "vocabulary" is 4 pieces on Llama 2, 1 token on Llama 3."
- 4/: F10 gives the counts at a stated width. Start with "At a width of 4,096, ...".
- 6/: F22 says "on today's tokenizers". Write: "code: not 500-750 on today's tokenizers (we measured 224-340)".
- 7/: F25 says "about". Write "one paper of about 10,000 tokens".

**M2. p11, string `pr5` "the worksheet's list prices, not today's" is false** (frames ~9580-9948).
- The PRICE row: the pricing page read on 2026-10-07 shows the same three numbers. F26 only forbids calling them today's prices; it does not let us say they are not today's.
- Fix: delete `pr5` (`pr0` already says "the prices on the course worksheet"), or write "as printed on the course worksheet".

**M3. The FACTS qualifiers on screen are too small to read on a phone.** At 1080 px wide shown at about 390 pt, 22 px is about 8 pt.
- `hookc` 23 px (F8, cover, frames 0-640)
- `alone` 19 px (F8, on the payoff slide, p6)
- `vsent` 22 px (F14, p3)
- `same` 24 px and `cnt0` 22 px ("counted by us", F16 and F21-F23)
- `cq3` 22 px (F31, p13)
- `lim3` 24 px (the F12 citation)
- Fix: at least 32 px (36 px for `hookc` and `alone`) at alpha 0.85 or more, or set them in the handwriting font at 34 px or more. Re-check each `fit`.

**M4. p6, her slide 23 (the hook's payoff, frames 4928-5866): the red pen lands on the wrong words.**
- (a) The underline under "Size × Hidden Dimension." runs through the next line, so it reads as a strike through "If the model's hidden dimension is 4096".
- (b) The rings around 131M and 819M overlap each other and their arcs cross the digits, so both numbers look struck out.
- (c) The "every" underline runs through "Softmax" on the next line.
- (d) During the zoom (z 1.25 at [505,765], about frames 4990-5700):
  - the label is clipped to "er slide 23" at the left edge;
  - the slide's right edge is cut ("dataset sc");
  - the caption sits on the slide's last lines;
  - the ringed numbers are still about 20 px.
- Fix:
  - Crop s23 to the title plus the first bullet, the way s24 is cropped. Its other two bullets are p7 and p8. At w 1000 the sub-bullets double in size.
  - Replace the underline with a yellow wash behind "Vocab Size × Hidden Dimension".
  - Draw one ring per number, fitted to that number, and keep the two rings apart.
  - Drop the "every" underline.
  - Keep the whole crop inside x 20-1060 and above y 1280 at every camera position, or drop the zoom.

**M5. The mic tag sits on the drawings** (rule: no text over drawings).
- p3 / C1 (frames 2489-2790): "Prof. Ding · lecture 1" sits on the right hand's fingers.
- p7 / C7 (6362-6584): the tag runs across the drawer wall next to the clerk's clipboard, and the mic covers the top-right drawers.
- p8 / C9 (7210-7412): the tag runs across the open "seen often" drawer and touches its label; the mic stands on the cabinet top.
- p10 / C11 (9276-9342): the tag lies on the taped slide beside its title, and the mic covers the right tape.
- Fix: keep the mic and tag on clear paper and check with guides=1.
  - p7: clerk w 860 -> ~780, dropped ~60 px.
  - p8: dusty w 980 -> ~900, dropped ~60 px.
  - p3: glue w 1000 -> ~900, lowered 40 px.
  - p10: put the tag left of the mic at y ≈ 470 (x 560-850), above the slide's top edge.

**M6. The cover and the bookend hide the 32,000 cabinet under the caption.**
- The small cabinet is half of the hook's comparison. The caption covers it:
  - at f90 (n0/n1, 0.5-13 s);
  - at the end of the n2 push (frames 427-640), which the script says "eases onto the small cabinet" but which parks it under "last episode's card catalogue, one drawer per entry";
  - in p16 (f11830-12390).
- During the push, "the dictionary" and "CSE 291P · Lecture 1 / UC San Diego" also sit in the top keep-clear zone (y 20-270, f520).
- Fix:
  - Lay out p0 and p16 so the art's ink ends at y ≤ 1280 (e.g. tower w ≈ 620, title block lifted about 30 px, then check the title clears the tower top).
  - Aim the push so the small cabinet lands at y ≈ 850-1150.
  - Fade the title, strip and tags at n2 (alpha to 0 over 0.4 s) so no text stays above y 260. Or drop the push.

**M7. p10, slide 24: the red "chat" insert collides with "context"** (frames 8308-9390; zoom of f9315).
- The word is written under line 1, on top of "avoid context", and the caret points at "APIs" from below.
- Fix: letter "chat" above line 1, in the gap under the title. Put the caret at the baseline gap between "OpenAI" and "APIs", pointing up, and keep it clear of the M5 tag.

**M8. p1: "keeps growing" never shows whole** (frames ~1515-1553).
- It starts at `n5@growing` (≈50.5 s) and the panel cuts at 51.79. The settled frame f1518 shows only a stray red "k", and f1540 shows the words on a table rule and the wash.
- Fix: trigger it at `n5@direction` (≈1.5 s earlier). Letter it in the empty right half of the Era column (right of "2023", clear of the rules), with the arrow down that column.

**M9. p11: the ring around "$14.00" cuts through the "output" label** (f9912), so the word reads as struck (a red line through a word means a correction).
- Fix: ring height ≤ 30 px around the number only, or move `pr4` row 0 up 14 px.

**M10. "token" is never defined** (clarity; n2, used from n5 on).
- The voice never says that an entry is a token. A viewer coming from X without L01-02 loses the thread.
- Fix n2: "That dictionary is the vocabulary: every token the model knows, each a word or a piece of one. Last episode's card catalogue, one drawer per entry."
- Add a FACTS row citing L01-02 FACTS T2, then re-time.

## Should-fix

**S1. Bridge from the dictionary to the bill** (n27). The voice jumps from rare entries to API billing without saying why it matters here.
- n27: "Now the bill. As she said, fewer tokens is cheaper: chat APIs take text, not token IDs, but the bill is counted in tokens." (C1, F18)

**S2. Series promise.** L01-02 ended "Next: how the model picks the next token", and this episode is not that.
- Add to n2 or n3: "Picking comes next time; first, the size of the dictionary it picks from." n42 then keeps the promise.

**S3. n23 is vague.** "Same width, same two numbers, now as work" never says which numbers.
- Write: "Same two numbers, now as work: about 131 million multiply-adds per token at 32,000 entries, about 819 million at 200,000." (F10)

**S4. n12/n13: the claim is not attributed, and "the rule" is opaque.**
- n12: "Her slide also says a big vocabulary makes 1000 one token. Not quite: Llama 2 splits it into four digits."
- n13, second sentence: "How digits are cut is a rule the designers choose, not a matter of size." (F17)

**S5. p15: the 3-chunk "cheaper" state is up only about 2.5 s before the flip, and the balance stays level while the labels say one side is cheaper.**
- n39: "Retrieval, 3.4 cents, beats the cache. Always? Fetch 6 chunks instead of 3, and caching wins." (F32, F34)
- Add a red "<" / ">" between the pans (judge's graft 6).
- Pull `r6a`/`r3a` left so they end at x ≤ 870 (right rail).

**S6. n37: how are "the best 3" chosen?**
- Write "send only the 3 that best match the question".

**S7. n9: give the context window a gloss** (defined in L01-02 n8).
- Write: "more pages fit in the context window, the text a model can take in at once."

**S8. p5 ribbon: too small and too many labels.**
- The subject fills only about 46 % of the width.
- Five label blocks are stacked at once (one idea per panel).
- The caption box sits on the coil (f4893).
- Fix: ribbon w ≈ 620 with its ink ending at y ≤ 1280. Show at most 3 labels: fade `rb1`/`rb2` when `rb4` arrives.

**S9. Captions on art elsewhere: the ladder wheels (p7, f6495) and the shoes and chair (p9, f8214).**
- L01-01 tolerated legs, but these are easy to lift: raise the drawings so their ink ends at y ≤ 1280.

**S10. Lecture 2 material is credited as Lecture 1 only.** C13, C14c and slide 5 come from Lecture 2.
- End card `end[0]`: "After Prof. Yufei Ding's CSE 291P, Lectures 1 and 2".
- Post main line: "Lectures 1 and 2".
- Post credits: add "Tao et al., NeurIPS 2024" to match the end card.

**S11. p10 card.**
- The last line, "1,000 digits: ...", touches the card's bottom stroke (f9000). Make the card rect run to 1290, or set the rows at dy 54 from y 1120.
- The "Split documents by tokens" underline fires while the voice is on rules of thumb, and nothing voices it. Drop it, or open n29 with "Count before you call, and cut documents by tokens." (F19, F20)

**S12. C1 keeps two "like" fillers that neither recognizer heard** (check.json "near").
- Listen by ear. If they are not audible, drop them from clips.json and from `cap.c1`.
- Minor fixes in the same pass:
  - break the c4 caption at "...strength of large vocabulary | and what is the weakness...";
  - paint out the "($L$)" artefact on slide 22.
