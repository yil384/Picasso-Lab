# Reviewer brief — TritonGym film ("The Loop")

You are one of four strict, independent reviewers of a 27.5 s (660 frames @ 24 fps) seamless-loop 3D comic film made
for the TritonGym card on the Picasso Lab Projects page. Nobody else will catch what you miss.

Read first (quickly but completely):
- `video-kit/README.md` sections 1–5 and 8 (the user's taste history is the most important part)
- `video-kit/briefs/tritongym.md` (the facts; nothing beyond these may be claimed)
- `video-kit/films/tritongym/STORYBOARD.md` (what the film intends; judge the frames, not the intent)
- `video-kit/reference/round1-notes.json` is long; skim the must_fix lists for the kinds of mistakes reviewers caught before

Look at the references (Read shows images): `video-kit/reference/style-comic/qubrio_comic_sheet.jpg` (the chosen look),
`video-kit/reference/story-picturebook/qubrio_picturebook_sheet.jpg` (the storytelling bar),
`video-kit/reference/pdoom/sheets/s03_chorus1_a.jpg` and `video-kit/reference/pdoom/stills/h04_25_70s_foom.jpg` (the charm bar).

Then study the evidence for this round (the folder is given in your task): `sheet_1fps.jpg` (one frame per second),
`strip_*.jpg` (every 2nd frame through each beat), `strip_seam.jpg` (frames 636–658 then 0–14: the loop seam), and
`card.jpg` (key frames cropped the way the card shows them: 2.1:1 at 400 px and 2.64:1 at 515 px, with the LIVE pill and
the bottom fade). Frame labels are "f<frame> <seconds>". Also look at a few frames at full size if a sheet is ambiguous
(the master video is `tritongym_master.mp4` in the parent folder; you may extract frames with
`python3 video-kit/films/tritongym/tools/sheet.py video OUT.jpg VIDEO --frames N ... --cols 2 --thumb 960`).

Score the film 0–10 from YOUR lens only, and return (as your final message, markdown):

```
### <lens name> — <score>/10
**What works** (cite frames)
**Must fix** (numbered; each: frame range, what is wrong, a concrete fix)
**Nice to have** (numbered)
```

Be concrete and cite frame numbers. A must-fix is anything that keeps your lens below 8.5. Do not soften; do not pad.
