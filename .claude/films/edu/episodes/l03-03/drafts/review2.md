# L03-03 review 2 (v2, independent)

**Verdict: ship after must-fix.** The voice, facts and post are clean. Captions match vo_lines.json and clips.json word for word, the voice takes match their lines, and nothing overlaps (8:04.2). Every post part is at most 278 characters. None of the banned topics or names. But one fix broke the callback (N1), the larger strips now hit the mic tag (N2), and the rest of M3, M4 and M5 (below) is still must-fix.

## Status

| Item | Status |
| --- | --- |
| M1 | fixed |
| M2 | fixed, but now clashes with P6 (S-N1) |
| M3 | partly. `kib` is still 30 px grey sans and ends at x 891, in the rail; the new `cols` is 26 px. Make both hand labels, px 36, fit 780. |
| M4 | partly. The punch-in is done, but the rings still cut "~" and "(≈93%)" / "(≈96%)" / "(≈98%)", and the layers ring cuts "32" and "126". Use red pen boxes on the savings cells, inset 6 px, like the 512 / 36 boxes; layers ring r [86, 165]. |
| M5 | partly. P7 has no wash: add cobalt ["turned", 0.58, 0.42], w 760, h 170, a 0.28, at n19@angle. P14 has two washes, not three: pouch yellow as on the cover, plus peach ["cover2", 0.1893, 0.5569], w 430, h 250. |
| S1, S2 | fixed |
| S3 | fixed in the voice, F11 and post; the picture still turns the pouches (S-N2) |
| S4 | fixed; `rdT` missed (S-N1) |
| S5 | fixed |
| S6 | fixed via F18's KiB figures |
| S7, S8 | fixed (P12's strips fade at n32, not c14; see N2) |
| S9 | partly: the quarter is washed and boxed, but its label is in the rail (N3) |
| S10 | partly: one ring per slide, but they still cross letters (S-N3) |
| S11 | partly: captions clear the drawings (which end at y ~1300), but the P3 / P11 slim shelf and its ring sit in the rail (x 700-950) |
| S12, S13, S14 | fixed |

## New must fix

**N1 - P1, 0:20-0:45, `q1` / `q2`.** The callback shows "at two model sizes: 4 to 14% of the cache" and "higher on 7 of 8 benchmark scores" above "parcel = value" while the voice explains query and key (frames_en f00950). `scripts/panels_v2.py` defines `lab('q1')` and `lab('q2')` twice (lines 86-87 and 315-316), and the P11 text overwrote P1's. Fix:
- Rename the P11 pair `qr1` / `qr2` in panels_v2.py, strings.json and episode.json.
- Restore `q1` "question card = query" and `q2` "name tag = key".
- Make the builder fail when a key repeats.

**N2 - The mic tag (fixed by the kit at 960, 405; label right-aligned at 890, 545) covers her slides:**
- P11, c11 (6:13-6:16): it covers "Dropout)." in `gA`, the label is printed across "(like Dropout)", and it hides the "4" of `hs3`.
- P12, c13 + c14 (6:27-6:51): it covers "MHA." and the label sits on "Interference".
- P13, c6: "token" in `ar` runs into the mic.

Fix: keep x ≥ 820, y 280-570 clear while a clip plays.
- P11: `gA` (tick and underline after it) at c11.end+0.3; `hs3` and `hs3b` at xy [600, 350].
- P12: `gB` at c13.end+0.2; fade the `gB` / `gC` / `gD` / `g2s` group at c14-0.4.
- P13: `ar` fit 740.

**N3 - P9, 4:56-5:13, `qtr`.** "+ a quarter" sits at x 840-1000, under the rail and 150 px from its box, so S9's payoff is hidden again. Fix: xy [760, 872], px 44, fit 160, plus a red arrow to ["groups2", 0.83, 0.33].

## New should fix

**S-N1 - n8 / `sh` (1:17) against n18 / `rdT` (3:19).** "Every head gets its own key and value back out of it", then "Nothing is unpacked" and "never unpacked", then P13's "unpack for the prompt". Fix:
- n8: "...Every head can get its own key and value back out of it." (re-voice)
- `sh`: "every head can get its own key + value back out"
- `rdT`: "read sealed, not unpacked"

**S-N2 - P7, 3:25-4:09.** The turntables rotate sealed pouches, the idea S3 removed from the voice. Fix: `rope` "RoPE: each unpacked key turned by position".

**S-N3 - Rings cross letters on the taped slides:** P2 "it", P4 the "c" after W^UK and W^UV, P5 "Q" and "T", P7 "^T", P8 "(" and ")", P9 both "=" signs, "2.25 groups" and the bottom of "Effective". Fix: on printouts use a pen underline at baseline + 8 px, as P2 and P8 already do. A ring that stays gets r = half the text box + 14 px.

**S-N4 - P12, 6:33-6:51.** The left edge cuts off the `gC` tick. Fix: `gC` xy [430, 590].

**S-N5 - P11, 6:16-6:26.** The sage wash is on the wild, untrimmed half of the hedge. Fix: ["hedge", 0.42, 0.45], w 420, h 380.
