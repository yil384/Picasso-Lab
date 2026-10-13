# L03-01 review (independent reviewer, r4 frames + full render frames_en)

## Verdict
The content is sound. Every voice line and caption matches vo_lines.json / clips.json word for word. All six clips
check as exact. Every claim traces to a FACTS row, and the Xavier and "exploding" traps are handled in the voice.
Toy numbers are called toy on screen and in the voice. The house content rules are met everywhere, and
the end card is the real logo. The order works for a first-year student: card, tag, parcel, dot product, shares,
mix, root d_k, heads.

It is not ready to post. The layout has collisions:
- the mic tag sits on other text in 3 of 4 panels with her voice;
- text runs into the right rail on 4 panels;
- slide 8 runs off the frame;
- one caption page starts with "k".

One trap is also tripped: "each word becomes a token". Fix the must-fix items, then check them in a new sheet.

## Must-fix
1. **Mic tag collides with other text (2:07.8-2:12 c23, 3:58.6-4:04 c11, 4:35-4:58 c27/c12).** The mic and its
   label "Prof. Ding · lecture 3" have one fixed spot: the mic at x 860-1060, y 300-520, the label at about x 635-890,
   y 545. The collisions:
   - P5: the label covers her "[0.119, 0.881]," and the mic covers the slide's tape and corner.
   - P9: the label sits on the banner's top line.
   - P11: the label hides "matrix" of "one more matrix", and the mic sits on "her slide 10".
   
   Fix: give the mic tag a position per panel, placed in free paper.
   - P11: move "her slide 10" to x 70, y 330 as on the other slides, and step the margin notes down about 100 px
     (mixL 600, glue 720, h8 840, d512 950).
   - P9: draw the readers about 60 px lower.
   - P5: shift the printout down about 60 px and put the mic above its right tape.
2. **Text in the right rail (x 880-1080, y 700-1480).**
   - P4 bars (1:35-1:48) and P8 bars (3:14-3:49): the "tired" bar label and its "21%" / "<1%" sit at x about 860-960.
     Fix: change the bars `w` from 860 to 740.
   - P5 clipping (2:13-2:29): the two "= 1" labels sit at x 880-950, y 1100-1200. Fix: bring the clipping to w about
     780 and set "= 1" at x ≤ 840.
3. **Slide 8 (2:44-3:14) overflows.**
   - The printout is cut at the frame edge ("Training instabilit").
   - "assumed: independent, mean 0, variance 1" runs to x ≈ 1000 at y 860, and "64 numbers: about 8 times wider" runs
     to x ≈ 1010 at y 930. Both are in the rail, and the 1.22 zoom pushes them further out.
   - "paper: tiny" lands at about 3:12, during "brings the spread back to one". That is 13 s before the voice gets to
     gradients (n15, 3:25), when the slide is already gone.
   
   Fix:
   - Crop slide 8 to its first three bullets. Dropping "Large logits ... (vanishing/exploding gradients)" also
     removes the slide's "exploding" erratum. P8's "tiny gradients: learning stalls" already carries F16.
   - Print the slide at w ≤ 840.
   - Set the two red notes left-aligned, at x 70-850, under the slide (y about 1150 and 1220). Update the SCRIPT row
     for P7.
4. **Caption page splits "d k" (about 3:11).** The page reads "k brings the spread back to one." Fix `cap.n13`:
   "...with 64 numbers, scores spread about 8 times wider.|Dividing by the square root of dₖ|brings the spread back
   to one."
5. **P2 (1:01-1:20): the drawing hits text twice.** The raised question card covers the start of the subtitle "three
   lists of numbers, made by three learned matrices" (y 384). The boy's shoes (y about 1300-1370) are under the
   caption box. Fix: set qkv `w` 560 → about 480 and centre it about y 860, so it spans about y 430-1270. Check P3:
   its shoes reach y 1290 and touch the caption box.
6. **P10 (about 4:22-4:25): "the new 'it': a bit of both" is drawn on the blue thread to "tired".** It also covers
   the "head 2" label, which becomes unreadable. Fix: move `both` into the empty paper right of the red threads, at
   about x 640-880, y 620-760. Leave "head 2" by "tired".
7. **n3 (0:33.8) says "Each word becomes a token", which trips FACTS G.** The tokenizer on the slide splits "didn't"
   and "tired" into pieces. Fix: "The sentence is cut into tokens, words or pieces of words, and 'it' draws a thread
   to every token in the sentence." (F4). The redrawn word list can stay.

## Should-fix
1. **Hook payoff (5:14, n23).** The "too wide" sentence never comes back, so "what is 'it'?" is answered only for
   "tired". Close the loop in n23 using F4/F12 and the point already made in n2: "So, who is listening to whom? 'it'
   listens to every token and takes a share from each: that is how the other words decide what 'it' is. Every token,
   to every token, ..." Do not claim the model's threads flip to "street" unless you add a FACTS row from the
   blog's image.
2. **"head" is used before it is defined.** The subtitle at 0:33 says "one head of a trained model", and n18 never
   says what a head is.
   - Subtitle (`thrS`): "a trained model, redrawn after her slide 6".
   - n18: "So the layer runs several heads, several copies of this whole recipe side by side, each with its own
     query, key and value matrices, each free to look for something different." (F20, F23)
   
   "layer" is also never explained. Either accept that, or add a FACTS row (VAS17 3.1, a stack of layers) and one
   clause.
3. **"every other token" (n4 0:52.8, post 2/) contradicts F4 ("every token") and the drawing.** The drawing threads
   "it" to itself too. Fix: "'it' pulls a little information out of every token." In the post: "'it' scores every
   token with a dot product...".
4. **Captions spell "d k" (n9 1:49, n12 2:45, n13, n15 3:25, n22 4:58).** Use "dₖ" in `cap.*` to match the formula on
   screen. The voice can stay "d k".
5. **Caption pages break mid-phrase.** Re-break at phrase ends:
   - n2: "Lecture 3 of Prof.|Yufei Ding's ..." splits her name; the next row also splits "UC|San Diego".
   - n6: "parcel you|hand over"
   - n11: "of the|first value"
   - n15: "is the|temperature knob"
   - n16: "says its|authors"
   - n20: "glued back|together"
   - n22: "cost about|the same"
6. **P3 (1:21): nothing says which figure is 'it' and which is 'animal'.** The label promises "query of 'it' · key
   of 'animal'". Letter "it" and "animal" in ink under the two figures.
7. **P6 (2:30): the pour contradicts the numbers.**
   - The glass wash is orange, which reads as the red value 1 (× 0.119), and the two streams are the same width.
     Make the glass mostly blue with a red tint, and the blue stream clearly thicker.
   - The toy line "the new 'it' comes out mostly 'animal'" is a second example in this panel, with nothing on screen
     for it. Add a red label for it, e.g. "toy: the new 'it' ≈ 58% animal" (F8).
8. **P5 (1:49-2:13): the formula lettering is rough.**
   - It is broken over three lines, and the radical's bar stops before dₖ ("/√‾ dₖ"). Letter it as on the paper
     (F11), with the bar over dₖ: "softmax(QKᵀ / √dₖ)" on one line, "V" on the next.
   - The blank cover also clips the first characters of her own example text ("(QKᵀ) for 2*2", "[0.119"). Narrow the
     cover, or let the x7 clipping replace that corner earlier.
9. **P7 rings (about 3:00-3:12).** The two red rings overlap each other and cut through the struck "Xavier)" and
   through "std(QKᵀ)". Use one ring round both lines, or two tighter rings that stay clear of each other.
10. **P8 (3:16) says "100%".** FACTS F16 gives 99.97 % ("essentially 100"). Label it "≈100%".
11. **P8 header (3:35-3:49).** "skip the ÷√dₖ ..." stays up after the knob has turned back and the bars show 58 %
    again. At n15@temperature, red-pen out "skip the", or swap the header to "÷ √dₖ = the temperature knob".
12. **P9 (3:50): the readers read a blank banner.** "Many heads, one sentence" only works if the sentence is on it.
    - Letter the sentence on the banner, with head 1's glass over "animal" and head 2's over "tired" (F19).
    - The drawing is 1040 px wide (96 %); bring it to about 900.
13. **P11 notes.**
    - "all heads: about one full-size head" is squeezed to fit 190 px, about 20 px glyphs, which is unreadable on a
      phone. Set it on 3 lines at px 40 in the x 700-870 column.
    - "8 heads" and "512 ÷ 8 = 64" end at x ≈ 880; move them 20 px left.
14. **n21 (4:41): "each head works in a smaller space" is vague.** Fix: "And each head works with fewer numbers per
    token." (F21)
15. **P12 (5:14).**
    - The `bill` string drops "per head, per layer" (F24): "1,000 tokens: 1,000,000 scores, per head, per layer".
    - The table drawing shows a chat, not the all-to-all. Faint red threads between every pair of diners would make
      the gag the explanation.
16. **Cover (0:00 frame and 0:08-0:33).**
    - The ring around "it" cuts into the "e" of "because". Tighten it.
    - The n1 arrow to the street runs through the red "?". Route the arrow right of it, or fade the "?" at
      n1@street.
17. **X post (main post).** "in 6 minutes" does not match the 5:35 runtime. Fix: "in under 6 minutes".
