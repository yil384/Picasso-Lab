# Review: L01-02 "How Text Becomes Numbers" (independent)

Basis: the 22 preview frames (plain and with guides), SCRIPT, vo_lines, clips, strings, FACTS, check.json, x_post.
I did not see frames for c3, c5b or c12b, so I could not check their mic tag.

Overall: the facts are clean. Every narration line maps to a FACTS row in its safe wording, the traps are avoided
(no "seven times cheaper", the Gemini/Unigram claim is corrected, both ties are stated), and every clip caption
joined on "|" equals the clips.json text. The post's main text is 236 characters, so under 280. The craft problems
are mostly in the taped slides, a few overlaps and broken caption fragments.

## Must-fix

1. **f09000 (n31, 5:00) has tape with nothing under it.** Two tape strips sit at the top corners but no slide or
   paper is attached. It reads as a bug. Either drop the tape or put the clipping on a taped paper card.
2. **The taped slides are unreadable on a phone: f04740 (slide 15), f05640 (slide 17), f08100 (slide 19).** The body
   text is about 12-15 px at 1080 wide, and the red pen marks small words nobody can read. After a 1-2 s "this is
   her slide" hold, zoom or crop to the marked region:
   - slide 15: the Subword block (bottom-up, Top-Down, the struck Gemini line);
   - slide 17: the Round 1-3 lines with the "tie:" notes;
   - slide 19: the library table, then the Output row with the ringed 13.
   The marked words should be at least 36 px tall. Also make the pen notes ("README: vs one older library",
   "tie: (s, t) also 9") at least 34 px.
3. **f01500 (n5, the cabinet): text overlaps the drawing and the numbers can't be read.** The "Hello -> 9906 -> Hello"
   card covers the cabinet's bottom row and hides the "279" plate. The red ids (0, 13, 82, 9906) are about 25 px
   and sit across the drawer plates, half outside them. Fix: move the card below the cabinet (y around 1300, with
   the caption under it, or shorten the cabinet). Write the ids at least 40 px, centred inside the plates.
4. **Caption fragments that orphan one word.** The "|" splits follow line wraps, not phrases, so single words
   flash alone:
   - c11: "vocabulary." (seen at f09690);
   - n32: "200,000." and "entry.";
   - c9: "English,";
   - n35: "Next:" (seen at f10560);
   - shorter cases: n11 "One:", n13 "Two:", n16 "Unigram:".

   Re-split by phrase, at most 2 rows each. Two examples: c11 "So that's why sometimes you want to have a larger
   vocabulary.|And that's also the trend." and n32 "...went from about 100,000 entries|to about 200,000." Clip
   captions must still join back to the exact clips.json text.
5. **n29 "Then she lifts the flap" credits our edit to Prof. Ding.** The flap is ours, not hers. Say "Then the flap
   lifts:" or "And on the same slide:".

## Should-fix

1. **Cover f00000 / f00090: the hook "7 tokens or 1?" sits in the right rail** (x about 900-1000, y about 760-900).
   Move it to the left of the mill or under the title (y about 600). The cover is otherwise finished.
2. **f02760 (n8, the receipt) is too small and off to the side.** The art is about 30 % of the width and sits in
   the right rail, and the "Prof. Ding · lecture 1" mic label touches its top. Centre the receipt at 60-70 % width
   and put the three key/value pairs on its lines (price / per token, and so on), not in a column beside it.
3. **f03810 (n12): text sits on the drawing.** "huge list" is written over the book and the librarian's arm, and
   "tokenizaton" with its arrow sits in the right rail. Put "huge list" on the empty paper above the book with an
   arrow to it, and move the typo card left to about x 700.
4. **f04050 (n13): the ribbon reads as a movie film reel with nothing on it.** It does not read as "characters".
   Letter the visible cells with the sentence one character per cell (H e l l o _ s t u ...). The "55 characters /
   instead of 13 tokens" line should be on screen while n13 says "long".
5. **f03330 (balance):** "fewer tokens" and "learns something" are written across the pan chains. Move them under
   the pans.
6. **f09690 (c11, two cabinets): the panel is crowded.** The mic label "Prof. Ding · lecture 1" collides with the
   big cabinet's top. The 中华人民共和国 tag covers the cabinet's base, at y about 1270-1330. Shrink the big cabinet
   about 10 % and move the tag below the cabinet's feet.
7. **f10140 (n33): the 15-tile row has no label.** Only "one language" is labelled. Add "another language" under the
   15-tile row, so 1 vs 15 reads at a glance.
8. **f10560 (recap):** "context, compute, price: all in tokens" runs into the tray's blue wash. Lift it about 40 px
   or shorten the tray.
9. **Terms used before they are defined** (clarity for a first-year student):
   - "token" is never said to be the number. In n5, after "a list of whole numbers", add "each one is a token".
   - "merge" first appears in n26 ("3 merges") but the film always says "glue". In n23 say "Glue, that is a merge."
     or change n26 to "3 glued pairs".
   - "cl100k_base" (n29) needs "GPT-4's tokenizer, called cl100k_base", which is nearly done already; keep the
     naming order the same in n32 and the labels.
10. **c9 is a "near" match.** One recognizer heard "large", the other heard "library". Before posting, listen by ear
    to "larger vocabulary" at 40:21-40:22. If it is uncertain, end the clip after "English," and let the narration
    carry the rest.
11. **n2 "Last time, models got big and expensive"** is a recap of L01-01 and is not in this FACTS. It is harmless,
    but add a row (pointing to the L01-01 FACTS) so the rule "nothing beyond FACTS" holds.
12. **Post:** "Lecture 1 ... in 6 minutes" suggests the whole lecture. Say "The tokenization part of Lecture 1 of
    Prof. Yufei Ding's CSE 291P ..." (still under 280 characters; it is 236 now).
13. **Recipe f05340:** step 4 has not appeared by 178 s while n18 says "Repeat". Check that all four steps are on
    screen before n18 ends.

## Hook

It is paid off clearly: n30 to n32 and c9/c11 answer "what changed" with the vocabulary size. The cabinet analogy
carries through from n4 to f09690. That is good.
