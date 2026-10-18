# QC01-01 review (preview v3, sheet + guides + full-res frames)

Overall: the line look holds (warm paper, ink, red pen, washes, taped slides), the door story carries the episode, frame 0
is a finished cover, captions are at most 2 rows, the 7 clips are exact/near and the captions match clips.json word for word.
Facts trace cleanly; traps avoided (no "first", no 1,127 in captions, roadmaps are "plans", C9 limited by n37/n38).
No countries or politics. The faults are mostly in the slide panels (p2, p5, p9).

## Must-fix
1. p5, 2:51-3:00 (n22, f5340): "The red pen fixes one digit" shows no digit being fixed. The red ellipse goes around
   "Recent 9 Years / 1,127", cuts through "1,127 Qubits", and its tail runs across "Cloud Access" and the chart.
   Fix: strike only the last "7" of "1,127" with a short red stroke, write a small red "1" above it, and drop the big
   ellipse. Keep the long tail off the slide text, or leave it out.
2. p5, f5340: the small "IBM's Condor, December 2023" line (condor, xy 60,1170) runs under the 2025 slide ("2023" sits
   on the slide). The 2024 cut-out is cropped mid-word ("Recent 7 Year|") and tucked behind the slide. Fix: move the
   2025 slide right or make it smaller (x >= 420), or set `fit` on condor so it ends before the slide edge. Show the
   2024 cut-out whole.
3. p2, 1:33-1:37 (n12, f2850): on the zoom card, the red pen's strike/leader line from "7~12" to "2 to 12" crosses
   "17 Years", so it looks as if the pen corrects the 17. Fix: strike only "7~", then start the leader below the
   "Years" line, from the right end of "12", and run it to "2 to 12".
4. p1, 0:45-0:56 (comp "a computer?", xy 70,700, f1500): the red label sits on the shelf and plant lines of the bench
   drawing. Fix: move it up to y ~560 (between "demo" and the drawing), or move the drawing down about 60 px.
5. p6, n26 (~3:21), label `few` "few mistakes beat many qubits": this goes beyond F13's safe wording (it says fewer
   errors always win). Fix: "more qubits help only with few mistakes" (F13).
6. p9, 5:05-5:20 (f9540): the slide crop shows rotated chart labels cut off mid-word ("om", "ics" at bottom left), the
   red ellipse cuts through "Qubits", the n40 caption overlaps the slide's bottom edge, and the slide fills only about
   55% of the width with the left half empty. Fix: crop to the header plus the arrows only, with no cut labels; scale
   to about 75% of the width; draw the ellipse round "1M" only; keep the slide bottom above the caption box (y < ~1300).
7. Render log: every worker logs "Failed to load resource: 404" (preview/v3/report.json). Find the missing asset
   before the final render. It may be a drawing or a slide that silently falls back.

## Should-fix
1. C4, 0:49 "you can only verify the type of gates on it": "gates" is never defined, and a first-year student will stop
   here. Add half a line to n7: "...is it a computer? (A gate is one basic step a qubit program takes.)", or a small
   label "gate = one basic qubit operation" on p1.
2. n11 (1:22) "The red pen adds the twos": confusing (only one "2" is added). Use "The red pen adds the 2s from 1998."
   or "The red pen writes 2 to 12." Same in strings cap.n11.
3. p3 (1:37-2:14, f3750): two ideas on one panel (locked door, then May 2016 online), and the mail slot exists only as a
   red box drawn on the door. Fix: either move m16/ibm16 to p4 (cloud panel) so p3 stays "locked door -> mail slot",
   or make sure the boxed slot reads clearly as a slot at phone size (a filled slit, not only an outline).
4. Tiny sans text unreadable at phone size: ibm16 and s24, condor (26 px, a 0.75), asof (24 px), and the company lines
   on p7 k1c-k5c (22 px, a 0.75). At 2:04 "IBM, free for anyone to try" is almost invisible. Fix: >= 34 px and a = 1, or
   drop the lines the voice already says (ibm16, asof).
5. Superconducting is used from n28 (3:36) but only explained at n36 (4:28). Add "metal that carries current with no
   resistance" to n28: "Superconducting circuits: metal loops that carry current with no loss, on a chip."
   This fix and fix 1 are new claims: add a FACTS row for each first.
6. n15 (1:59) "in the recent nine years" reads as a slide quote, not speech. Use "Then, from 2016 on, the door began
   to give."
7. Captions sit on top of the drawings in most panels (p1 f1500, p3 f3750, p4 f4230, p8 f8040, p10 f10050). The boxed
   captions are readable, but on p3 the box covers the student's legs and the rope. Move the drawings up about 40-60 px
   where there is room above them (p3, p4, p8), so the caption box sits below the ground line.
8. p0, hk1 "is that even a computer?" (xy 70,660) shows at n2@seventeen, while the voice is already on the 17 years,
   and it shares its spot with qdef. Show it at n0@computer (the hook) and qdef at n1. Check frames 0:05-0:24 for any
   overlap with the "2 qubits" label at y ~750.
9. p10, nx "next: what has been done before" (xy 70,688) is close to the top of the open-door drawing (y ~670). Check
   a frame at 5:40. Also make n44 concrete: "Next time: what quantum computers have already done." The current line is
   vague.
10. p1, f1500: the mic tag reads "Prof. Ding · 202" at 0:50. If it is still typing, fine; if it is clipped by the mic
   wash, move it left so the full "Prof. Ding · 2025 lecture 1" shows for the whole clip. No frame was sampled during
   C5, C12, C9 or C10: check that the mic and tag show on each of them.
11. p5: the 2024 cut-out says "Recent 7 Years" and the 2025 slide says "Recent 9 Years". With no word on it, a viewer
   sees two different spans. Crop the 2024 cut-out to "433 Qubits" only (that is all n20 uses).

## X post (2026-10-19_QC01-01/x_post.md)
- Must: thread 5/ "Superconducting chips need the deepest cold" is not in FACTS (photon detectors at 12 mK are just
  as cold, PHOT). Use: "Superconducting chips are kept about a hundredth of a degree above absolute zero (F19)."
- Main post is 262 characters: under 280, OK. Thread 1-4 and 6 trace to F2-F4, F5, F7-F14, F25.
- Credits: add the sources the film uses but does not list: Intel 2023 (F16), the QuEra FAQ, the photon-detector
  papers (F24), and the CMB value (F20). Or say "full source list in the pinned reply".
