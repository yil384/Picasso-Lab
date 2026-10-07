---
name: picasso-comic-demo-film
description: Make (or remake) a code-rendered "3D comic" demo film for a Picasso Lab project — the looping card videos on the Projects page (Qubrio, TritonGym, TritonDFT, ChipMATE) — with the video-kit pipeline (three.js + NPR ink/halftone + p5.brush lettering, rendered deterministically frame by frame, encoded with ffmpeg). Use when asked for a new project video, a new card film, a remake of one of the four, or any short explanatory film in the same series look.
---

# 3D comic demo films (Projects page series)

Four films are live: `projects/<id>/<id>_loop.mp4` + `<id>.webp` for qubrio, tritongym, tritondft, chipmate.
They were made with the **video-kit** toolkit (branch `video-kit`) — one session per film on its own branch
`video/<id>`, final renders on the Mac.

## 1. Get the toolkit and read the brief (do this first)
```bash
git fetch origin video-kit
git worktree add ../vk origin/video-kit          # keeps main (and these skills) checked out here
cd ../vk && git switch -c video/<id>              # your film branch; never commit to main from here
```
Then read, in this order — they are the real brief, this skill is the map:
1. `video-kit/README.md` — the user's taste history (quoted), the **series rules** (look, story, card use, known
   mistakes), how to build/render, deliverables, and the **4-lens self-review** protocol.
2. `video-kit/briefs/<id>.md` — accent colour, facts, numbers, accuracy pitfalls (write one for a new project:
   fetch the project site text into `reference/site-<id>.txt` and list only verified numbers).
3. `video-kit/pipeline/README.md` and `pipeline/runtime/npr/README-NPR.md` — the scene contract and the NPR look.
4. The finished films as worked examples: `git show origin/video/qubrio:video-kit/films/qubrio/…` (branches
   `video/qubrio`, `video/tritongym`, `video/tritondft`, `video/chipmate`: scene code, `STORYBOARD.md`,
   `out/<id>/REVIEW.md` with four rounds of reviews and fixes).
Cloud VM setup: `video-kit/CLOUD_SETUP.md` (ffmpeg, Playwright Chromium; everything else is vendored).

## 2. What the user wants (short version — the README has the quotes)
- **The look: 3D comic** — a real lit three.js world through the NPR stack (cel ramp, inverted-hull + edge ink with
  wobble, halftone, offset-print colour, paper grain), comic camera (whips with smear, crash zooms, dutch angles —
  never dissolves), hand-lettered SFX built from brush strokes. Never "HTML味/AI味": no UI panels, charts, centred
  letter-spaced titles, generic glow, glossy default three.js.
- **The story: accurate and informative** — every shot maps to a real concept of the project (cast-as-concepts:
  agents are characters, the slow baseline is a snail, the payoff number is a big comic moment). Only real numbers.
  15–30 s at 24 fps, seamless loop. Charm bar: *I'm Upping My P(doom)* (see `reference/pdoom/`).
- **Series coherence**: cream paper + the project's accent colour + one pop colour + ink black; same ink weight,
  dot scale and lettering as the other three.
- **Card use**: plays muted at ≈400×195 CSS px (`object-fit: cover`); keep faces, action and the payoff inside the
  central band; the card file starts on the poster frame.

## 3. Workflow that worked
1. **Storyboard** (`films/<id>/STORYBOARD.md`): beats of 1.5–4 s, each tied to a concept + the fact it shows.
2. **Build** from `reference/style-comic/comic.html` (look) and `reference/story-picturebook/` (cast/timeline
   structure). Split code by role (set, cast, timeline, ink, letters, physics checks) as in `films/qubrio/`.
3. **Iterate at 960×540**: `python3 snap.py SCENE.html 0 120 240 --width 960 --height 540 --out /tmp/s` and look at
   the frames (JPEG contact sheets). Trust frames, not code.
4. **Check facts in code** where geometry encodes them (Qubrio used `tools/check_phys.mjs`: distances, no crossings,
   ratios measured on screen).
5. **Review ≥ 3 rounds** with four lenses (creative director, stylised-three.js tech-art lead, domain expert, Projects
   web designer), evidence = frame numbers + stills + motion strips + card-size crops + loop-seam diff; write
   `out/<id>/REVIEW.md`; fix; repeat until every lens ≥ 8.5. Running each lens as an independent subagent plus a
   consolidator that re-checks every must-fix against the images worked well.
6. **Final render**: on the Mac (Metal) `python3 render.py SCENE.html --out OUT --workers 3 --verify 12 --check-loop`
   takes ~40 s for 720 frames at 1080p. A cloud VM has no GPU (SwiftShader, 2–5 s/frame): render finals in
   `--range A:B` chunks under ~8 min per command, or hand the final render to a local session.
7. **Encode** (`pipeline/encode.py` or the film's `tools/encode_segs.py`): master 1920×1080 CRF≈18 `+faststart`;
   card loop = centre crop to 1.82:1 → 960×528, CRF searched to fit ≤ 4 MB (the search must be allowed to go
   past CRF 29), starting on the poster frame; poster = that frame as 960×528 WebP.

## 4. Putting it on the site (separate step, on `main`)
- Replace `projects/<id>/<id>_loop.mp4` and `projects/<id>/<id>.webp` in place (same names) — live on push, no
  re-paste. A new project also needs an entry in `PROJECTS` in `projects/projects.html` (media comes from
  `const MEDIA = 'https://yil384.github.io/Picasso-Lab/projects/'`) and then a **re-paste** of projects.html into
  Google Sites (see the `picasso-sites-embed` skill). Masters stay out of the repo (keep them locally, e.g.
  `~/claude-work/picasso/review/<id>/`).
- Before replacing anything the user can see, give them a **local preview page** with all films side by side at card
  size and full size, and wait for their OK (they approved the set with "可以可以", then "记得push").
- Update the card copy in `projects.html` to the same verified numbers the film shows.

## 5. Mistakes we already made (don't repeat)
Chaotic content unrelated to the project (the first comic Qubrio); flat single-colour backgrounds; whip pans done as
dissolves; bubbly rounded SFX; glossy plastic characters; cluttered identical props; payoff off-centre or cropped by
the card; text overflowing its sign; a blank brush-wipe that the card shows 1 s into playback; physics drawn wrong
(Rydberg pulse as a narrow beam, crossing AOD rows, a "verified" route that collides); a card budget that forces
CRF > 29 when the encoder search stopped at 29; set leaks (bare paper past a wall), 2D ink layers that skip the 3D
post (crisp outlines over smeared fills).

## 6. Hygiene
Never commit frames/segments (`.gitignore` covers them — check `git status`); commit and push the film branch often
(sessions get interrupted); JPEG for review images; delete `OUT/` render dirs after encoding.
