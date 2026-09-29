# Guandan redesign — review log

Each round reviews the current `guandan-cloud` build with four strict lenses (HANDOFF §3) plus a re-check of the earlier
open issues, then fixes every high/medium finding (and cheap lows) and re-verifies. Scores are 0–10 per screen (8+ = a
Tencent player would take it for the real product); a screen's score is its worst viewport.

## How a round is run
- Baseline shots: `cd guandan-kit/harness && python3 scenes.py desk hd ifr phone portrait` → `shots/<vp>-<scene>.jpg`
  (git-ignored) with captions in `shots/<vp>-scenes.json`. Viewports per SPEC §6: desk 1440×900@2, hd 1280×720@2,
  ifr 1024×640@2, phone 844×390@3 (touch), portrait 390×844@3 (touch, rotated table).
- Table states are staged deterministically with the real engine (`stage.js`), so before/after shots compare 1:1:
  opening lead + 首出, my lead / follow with 提示, others' turn, 4/6-bombs, 同花顺, 天王炸, ribbons, menu, 记牌器, rules,
  横排, 进贡/还贡, 双贡, 抗贡, results (win, lose, 冲A失败, 比赛结束, guest), spectator, English, the picasso transition.
- Full rounds into round 2 (through the tribute): `python3 play.py phone 2`, `python3 play.py desk 2`,
  `python3 play.py portrait 2` (real touch on phones).
- Lenses: Tencent fidelity (table / lobby-room-results-records, side by side with `refs/img`), gameplay QA, AI-tell
  hunter, must-keep (SPEC §1), plus a verifier for `open-issues.json`. A synthesizer merges duplicates, calibrates
  severity and assigns each finding to a code-ownership track (table / lobby / records / transition / shared).
- Fixes: one agent per track in its own worktree and branch, each checked by an independent verifier (fixed / partial /
  regressed) until it passes; the branches are then merged into `guandan-cloud` and the whole scene set is re-shot.
- Evidence paths below point into the git-ignored `guandan-kit/harness/shots` and `guandan-kit/scratch` folders
  (screenshots and the Tencent references are never committed).
