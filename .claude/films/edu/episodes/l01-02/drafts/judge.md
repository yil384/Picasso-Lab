# L01-02 script judgement: A (story first) vs B (worked example first)

> Note (2026-10-07): written for the first cut. Its hook used slide 19's second example, which the user's rule
> (`daily/PROMPT.md`, first of the "Rules for the night") forbids; that example is replaced below by a pointer, and the film now uses our
> own example "eucalyptus" (see `../SCRIPT.md` and `../FACTS.md` T20).

Final clips: C1, C2b, C3, C5b, C9, C11, C12b (7, 33.2 s). **C8b failed: both drafts must drop it** (A beat 8, B after n34).

## Scores (1-5)
| Criterion | A | B | Note |
| --- | --- | --- | --- |
| Hook, first 5 s | 4 | 3 | Both open on n0 (~5 s). A holds the 7 -> 1 gap as a red "?" and saves the glue for the payoff. B glues the clippings in the hook (beat 0) and says "a seventh" in n1: the payoff picture is spent at 0:08. |
| Clarity | 4 | 3 | A defines tokenizer and vocabulary (n4-n6, the cabinet) before slide 15. B says "cl100k_base" at n7 (0:50) before any vocabulary exists, and n10's "The full stop is 13" collides with "13 tokens". Both leave "context window" (A n9, B n4), "corpus" (A n21, B n22) and "merges" (A n29, B n32) undefined. |
| Accuracy | 4 | 3 | Lists below. No trap triggered in either (ties stated, no "seven times cheaper", no "Gemini uses Unigram"). |
| Her voice and slides | 4 | 4 | Same clips, sensible slots in both. B's paper flap over slide 19's second example is the better slide device. |
| Pace | 4 | 4 | A 720 words, ~6:07 with the final clips (118 wpm). B 688 words, ~5:58 (115 wpm). Both in range. |
| Craft | 4 | 3 | A's cabinet getting labelled drawers es / est / lo is the gag-as-explanation. B beat 5 packs four ideas into one stretch (two drawings, the balance, the correction). A's flaws: the cabinet "small, top corner" in beat 7 reads as a corner element, and beat 11 crams trend + honest limit. |
| **Total** | **24** | **20** | |

## Lines beyond FACTS safe wording
**A**
- n5 "That list is all the model ever sees": stronger than T2. Cut or fold into n6.
- n17 "Google's reports say SentencePiece. They do not say Unigram.": paraphrases the GEM check, not T8's wording. Use: "One red-pen note on the Gemini line: SentencePiece, yes; Unigram: not stated."
- n31 "A real one just keeps going" and n36 "learned more merges": these come from the brief, but no FACTS row says o200k_base/cl100k_base are BPE-trained. Add a row (tiktoken is a BPE tokenizer, TIK README) before the film locks.
- n40 "built bottom-up by gluing common pairs": made general, this contradicts n16 (Unigram is top-down). Say "built, in BPE, by gluing common pairs".

**B**
- n0 "Its successor": not FACTS wording (the brief uses it). Fine as voice, but the pen should letter the real names.
- n10 and beat 9 ids (9906, 13, 155245): RUN output with no safe row; "13" also confuses.
- n19 "the toolkit, SentencePiece, checks out. Unigram for the named models is not stated.": "the named models" is vague and moves off T8.
- n35: the same BPE issue as A n31.
- n43 "the gap cuts both ways": PET does not support this, and it hints that bigger vocabularies reverse it. Cut the phrase.
- n44 "tokens are whatever the merges made": too general (Unigram). Cut.

## Winner: A

## Graft from B
1. **The slide 19 flap** (B beats 3/9): when slide 19 is taped whole in A beat 9, fold its second example under a flap. Lift it in A beat 10.
2. **B n42 replaces A n36**: "What changed? The vocabulary went from about 100,000 entries to about 200,000. More merges, and this whole name got glued into one tile." It answers the hook in the hook's words.
3. **B n34 replaces A n30**: "est got its own tile because it kept showing up. That's the whole idea: what's frequent gets glued."
4. **B n9's second sentence** goes onto A n8: "Sometimes it's a whole word, sometimes a scrap of one."
5. **B n23's "The target is 13."** goes onto A n22, so the stop rule is known before round one. Then A n29 drops "That was the target."
6. **B n2's "tiny word list"**: A n21 becomes "Her practice word list." This replaces the undefined "corpus".
7. **B beat 10 as its own panel** (one short strip, one long strip, "up to 15x"). It replaces A beat 11's bracket and takes A n38. A beat 11 keeps only C12b, C11 and the trend arrow.
8. **The B vocabulary strip** (10 tiles, growing to 13) replaces A's corner cabinet in beat 7. The strip runs full width under the tile rows, and each new tile flies into a cabinet drawer at the glue moment. That keeps the cabinet gag without a corner element.

## Cut (length, redundancy, failed clip)
- C8b and its slot (A beat 8). n29 -> n30 already joins.
- n1, 2nd sentence ("By the end of this video, you can answer that yourself."): filler. The "?" hold does the job.
- n5: overclaim, and n6 says it properly.
- n14, 2nd sentence ("Our sample sentence is 55 characters, and 13 tokens."): repeats n7. The ribbon's pen "55 vs 13" carries it.
- n27 (voice): keep the "s-t first: same est" point as the grey on-screen note only. For a first-year it is a detour inside the hardest beat.
- n39 and the small balance return in beat 12: they repeat n10/n11.
- n40: trim to "A model sees numbers from a fixed vocabulary, and context, compute and price are all counted in them."
- n18, first half ("Now the main event."): keep only if the beat needs the breath.

These cuts remove about 75 words (~30 s). The grafts add about 35. Expected result: ~680 words, ~5:50, 7 clips (9% of runtime).

## Before lock
- Gloss "context window" (A n9). It needs a FACTS row, or drop the clause and keep "prices are per token, and the model does work for every token".
- Add the BPE-tokenizer row (A n31/n36).
- B's producer note stands: if the pen should write "one per character" under the seven tiles, add that row first.
