# video-kit — Picasso Lab project videos (3D comic series)

You are a Claude Code session with **no prior context**. This file is your full brief. Read it completely, then read your
project brief in `briefs/<project>.md`, then do the work. Everything you need is in this folder and in the repo.

## 1. What you are making and why

The Picasso Lab website (UCSD, Prof. Yufei Ding's group; this repo deploys to it via GitHub Pages) has a **Projects page**
(`projects/projects.html`, live at https://yufeiding.ucsd.edu/projects). It shows four project cards — **Qubrio, TritonGym,
TritonDFT, ChipMate** — and each card plays a **muted looping video** (`projects/<id>/<id>_loop.mp4`, card box ≈ 400×195 CSS px,
`object-fit: cover`, with a webp poster). Those videos were generated with Gemini/Veo; they are generic and rough (blurry glowing
blobs, morphing crystals) and don't show what the projects do. We are replacing all four with **one coherent series of short,
code-rendered 3D comic films**, made the way viral Claude-made videos are made: code (p5.js + p5.brush + three.js) rendered
deterministically frame by frame, then encoded with ffmpeg.

You make **one** film: the project named in your launch prompt. Other sessions make the other three projects in parallel,
so follow the **series rules (§4)** exactly, or the four cards won't look like a set.

## 2. What the user has said so far (the taste history — this matters more than anything else here)

Quoted verbatim (the user writes Chinese), with what it means:

1. On the first round (an engraved scientific plate, a watercolour lab notebook, luminous 3D atoms):
   - "我总感觉做的还是不够惊艳，没有I'm Upping My P(doom)带给我的那种惊艳感觉" — not stunning; must feel as delightful as the
     viral Claude-made music video *I'm Upping My P(doom)* (see §5).
   - "现在做的还是html味道太浓了，AI味道太浓了，并且three.js用的少了或者用的不精" — it looked like an animated web page and
     AI-made; three.js was used too little or crudely.
2. On the second round (three concept films for Qubrio: a comic-3D one, a watercolour picture book, a notebook diorama):
   - "风格上我更喜欢漫画三维，但是这个展示的内容太混乱了，和这个project有关系吗？不如水彩绘本展示的有信息量和准确" — **the comic-3D
     style won**, but its content was chaotic and unrelated to the project; the picture book was more informative and accurate.
   - "故事可以做的更好一些，15s讲不完的话30s讲" — the story should be better; use up to 30 s if needed.
3. On the series: all four projects in **3D comic**; a sci-fi flavour is welcome where it fits, **but the base stays 3D comic**.

So the bar is: **the look of `reference/style-comic` (done better) + the clarity and accuracy of `reference/story-picturebook`
(done better) + P(doom)-level charm.** Never: animated web page, dashboard, UI panels, bar charts, centred letter-spaced titles,
borders/frames, generic AI glow, default glossy three.js.

## 3. References in this folder (look at them — don't just read about them)

| path | what it is | use it for |
|---|---|---|
| `reference/style-comic/` | Qubrio comic-3D film (the style the user picked): `comic.html` scene + its NPR toolkit copy `npr/`, `STORYBOARD.md`, `stills/` (6 full-res frames), contact sheet, card-size test, poster, card loop mp4 | **the look**: bold ink outlines, halftone, offset-print colour, speed lines, hand-lettered SFX, comic 3D camera. Also how a scene is built on the pipeline. |
| `reference/story-picturebook/` | Qubrio watercolour picture book ("The Convoy"): `qubrio_book.html` + `qb_world.js` (3D set & cast), `qb_anim.js` (timeline/acting/camera), `qb_ink.js` (2D ink tracked to 3D), `STORYBOARD.md`, sheet, loop | **the storytelling**: every shot maps to a project concept (compass = placement agent, toy train on tracks = routing agent moving rows without crossing, pocket watch = scheduler, snail = slow baseline, payoff 4.7×). Clear, charming, accurate. |
| `reference/round1-notes.json` | independent reviewers' notes on both Qubrio films (director, tech-art, physicist, web designer) | **mistakes to avoid** (see §4.4) |
| `reference/pdoom/` | real frames rendered from the P(doom) source + `NOTES.md` analysing why it delights | **the charm bar** |
| `reference/research-REPORT.md` | research on the trend, the pipeline, p5.brush 2.x API cheatsheet, pitfalls | technique |
| `reference/site-*.txt` | text of the project websites (fetched for you — the sandbox may not reach them) | **facts** (your brief summarises them) |
| `pipeline/` | the deterministic render pipeline (read `pipeline/README.md` and `pipeline/runtime/npr/README-NPR.md`) | building + rendering |

External (if your network allows): P(doom) source https://github.com/JohnHeibel/PDoomVideo (its `ANIMATION_GUIDE.md` and
`STORYBOARD.md` are the best taste documents in the wild) and https://github.com/JohnHeibel/ClaudeAnimationBase (MIT).

## 4. Series rules (all four films must obey these — they are what make the set coherent)

### 4.1 Look ("3D comic", from `reference/style-comic`, done better)
- A **real lit 3D world with depth** built in three.js and rendered through the NPR toolkit (`pipeline/runtime/npr`): toon/cel
  light ramp, inked outlines (inverted hull + screen-space edges) with slight hand wobble, **halftone** shading, **offset-print**
  colour with a hint of misregistration, paper grain. Not a slab in front of a flat colour; not glossy plastic.
- **Matte comic characters** with thick ink outlines, simple strong silhouettes that read at 400×195.
- **Comic camera**: real whip pans with motion blur/speed lines, dutch angles, pushes, crash zooms — never cross-dissolves.
  Transitions always (whip, iris, panel-to-panel move, match cut, brush wipe); no hard cuts to static layouts.
- **Hand-lettered SFX** (WHOOSH, ZAP!, CLICK, TICK…) drawn with p5.brush strokes in a comic lettering style — never a bubbly web font.
- Palette: warm cream paper base + **your project's accent colour** (in your brief) as the dominant hue + one complementary pop
  colour + ink black. Sci-fi flavour (glows, holograms, circuitry, lab gear) is welcome **inside** the comic language (inked,
  halftoned, flat-lit), never as neon/HUD/bloom haze.
- Ink weight, halftone dot scale, paper grain and lettering style should match `reference/style-comic` so the four films sit together.

### 4.2 Story
- **Every shot maps to a real concept of the project** (component, agent role, step of the method, the measured result). If a
  viewer can't say what a shot is about, cut it. The picture book's cast-as-concepts approach is the model.
- **Original characters** for the project's agents/components (no Clawd, no existing IP), with real acting: anticipation,
  squash & stretch, overshoot, readable faces/emotes, one clear beat per shot (1.5–4 s), something happening in every shot.
- A tiny conflict helps (the slow baseline, a bug, a failed attempt) and a clear **payoff** on the project's headline number(s).
- **Text minimal**: the project name once (hand-lettered or as an object label), the payoff number(s) as a big comic moment,
  optional tiny hand-written labels only if they clarify. No sentences.
- **Facts must be exactly right** (numbers, names, what the system does). Your brief lists them. Never invent numbers.
- Length **15–30 s** at 24 fps (360–720 frames), **seamless loop** (last frame flows into the first).

### 4.3 Card use
It also plays muted as a ≈400×195 card (centre crop to ~2.1:1). Keep key action and faces inside the central band, big
silhouettes, high contrast; test the card crop at real size.

### 4.4 Known mistakes to avoid (from `reference/round1-notes.json`)
Flat single-colour backgrounds; recolouring the background instead of lighting; whip pans done as dissolves; bubbly rounded SFX
font; glossy/specular plastic characters; cluttered crowds of identical props; payoff placed off-centre or too low for the card;
characters blocking the payoff; physics shown wrong (in Qubrio: pairs geometry, a "global" pulse drawn as a narrow beam). Read the
notes; the same kinds of errors apply to your project.

## 5. Why P(doom) delights (read `reference/pdoom/NOTES.md`, look at `reference/pdoom/sheets/`)
Characters with personality in every shot, gags that read instantly, beat-driven motion with squash/stretch and overshoot, a camera
that is always alive, transitions that turn one scene into the next, cohesive hand-made texture. Match that charm in 3D comic form.

## 6. How to build and render (cloud specifics)

- Setup: see `CLOUD_SETUP.md` (ffmpeg, Playwright Chromium). Fonts and JS libraries are vendored — nothing is fetched at render time.
- The cloud VM has **no GPU**: rendering uses CPU WebGL (SwiftShader). `render.py`/`snap.py`/`tools/nshoot.py` default to
  SwiftShader on Linux automatically. Measured on a laptop CPU: ~0.5 s per 960×540 frame for the comic scene (mostly PNG encode);
  expect ~2–5 s per 1920×1080 frame on the cloud VM → a 30 s film is ~25–60 min of final rendering. So:
  - **Iterate at 960×540** with `snap.py` on a handful of frames and `render.py --width 960 --height 540` for full passes;
    render **1920×1080 only for the final**.
  - Keep every shell command **under ~8 minutes** (the sandbox has per-command limits): render in chunks with
    `render.py --range A:B` (it resumes), or run long renders in the background and poll.
  - Keep scenes cheap: hundreds of fills/strokes per frame are fine, thousands are not; bake static p5.brush textures once.
- Start your scene from `pipeline/scenes/_template.html` or by adapting `reference/style-comic/comic.html` (which already wires
  the NPR look, the ink layer and SFX lettering) — reuse its code freely.
- Encoding: `pipeline/encode.py` reads PNG frames (`render.py --store png`); `reference/style-comic/tools/encode_segs.py` encodes
  from render.py's default lossless segments. Deliverables in §7.
- Look at your work: render contact sheets / stills (JPEG) and open them; check every shot's first/last frames, transitions, the
  loop seam, and the card crop at real size. Do not trust code — trust frames.

## 7. Deliverables and git

- Work on a new branch **`video/<project>`** created from `video-kit`. Never commit to or push `main`; never edit site files.
- Scene source in `video-kit/films/<project>/` (scene HTML/JS, `STORYBOARD.md`, small tools).
- Outputs in `video-kit/out/<project>/`: `<project>_master.mp4` (1920×1080, 24 fps, H.264 High yuv420p CRF≈18 `+faststart`,
  seamless loop, ≤ ~70 MB), `<project>_loop.mp4` (960×528 centre crop, ≤ 4 MB, `+faststart`), `<project>_poster.webp` (960×528,
  the most telling frame), `<project>_sheet.jpg` (contact sheet, 1 frame/s), `REVIEW.md` (§8).
- **Never commit frames, segments or other intermediates** (`.gitignore` covers the usual ones; check `git status` before committing).
- Commit early and often (sessions can be interrupted); push the branch when a version is complete and again after each revision.

## 8. Review yourself like four strict reviewers (no one else will)

After the first full version, and after every revision, write a round in `out/<project>/REVIEW.md` with evidence (frame times,
still paths) and scores 0–10 from each lens. **Do at least three review → fix rounds**; stop only when every lens is ≥ 8.5 with
no must-fix left, or you are out of time (then say what remains).
1. **Creative director** who loved P(doom): delightful, alive, clearly told? Could it be mistaken for an animated web page or
   AI-generic art anywhere?
2. **Tech-art lead (stylised three.js)**: real lit 3D comic world, comic shading, ink, halftone, real camera moves, hand-lettered SFX;
   anything default-three.js, glossy, flat or cluttered?
3. **Domain expert** for the project (GPU kernels / DFT materials science / RTL & chip verification): does every shot map to the
   project and is everything technically right, including every number?
4. **Web designer of the Projects page**: as a muted 400×195 card next to three others — readable, on-series, good poster, clean
   loop seam, file sizes within budget.

## 9. Finish
Push the branch and end with a short report: branch name, output paths, duration, file sizes, the storyboard summary, the final
review scores, and anything unresolved.
