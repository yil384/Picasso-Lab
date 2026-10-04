# Picasso Lab explainer channel (@PicassoLabUCSD on X, a Chinese cut for Douyin)

From 2026-10-04 the lab's X account becomes a knowledge channel. Two lines, every video vertical (1080x1920):

- **Main line, "Compute Not Included / 《算力另计》"** (working name): 1:30-2:10 explainers built from Prof. Ding's course
  CSE 291P "LLM System Optimization" and the lab's quantum work. Every picture is a code-rendered scene (three.js + q5.js,
  rendered frame by frame on the Mac GPU), even where a lecture recording exists. The look: the launch film's night desk
  under the banker's lamp; each idea is a physical miniature on the desk, shot like a tilt-shift macro.
- **Side line, "Not on the Exam / 《这题不考》"** (working name): odd "tutorials" shot on iPhone as vlogs (Honor of Kings Zhen Ji
  jungling, scooter riding, $5 / 24 h in San Diego), edited with a code-assisted pipeline.
- English cut to X, Chinese cut to Douyin. Style models: 影视飓风 Tim, 何同学, 毕导THU; comedy from 喜人奇妙夜 / 脱口秀大会.

## Read first
1. `SERIES.md` - the series bible (Chinese): positioning, names, cast, voice, look, episode templates, comedy rules,
   vertical specs and safe zones, both production pipelines, Season 1, platform operations, and the open decisions.
2. `episodes/e01-moe/` - the pilot (MoE, "671B parameters, 37B per token", ending on the lab's ISCA'26 Best Paper):
   `FACTS.md` (every number with its source and safe wording - nothing goes on screen that is not in it), `SCRIPT.md`.
3. `research/` - the seven reports behind the bible (creators, comedy, platforms, episodes, pipeline, vlog, identity).
4. `sideline/SHOOTING_CARDS.md` - shot lists and checklists for the three iPhone pilots.

## Tools
```sh
python3 .claude/films/edu/tools/fetch_course.py                     # course PDFs + text -> course/ (git-ignored)
python3 .claude/films/edu/tools/snap.py look/look.html 0 1 2 --out DIR [--q lang=zh] [--q guides=1]   # frames on the GPU
python3 .claude/films/edu/tools/sheet.py OUT.jpg DIR/*.png --h 900  # contact sheet
python3 .claude/films/edu/tools/cjk_fonts.py look/look.html          # CJK subset fonts for the strings a scene uses
```
`snap.py` serves `/pv` and `/scene` from the launch film's kit (`.claude/films/xlaunch`), so scenes reuse its studio,
sprite and props modules and its vendored three.js; `/edu` is this folder.

## Look development (`look/`)
- `look.html` - style frames: the cover, a worm's-eye of the tower, the triage kiosk macro, a corridor, the long
  exposure (rooms glow by how often they are picked; the English and Chinese cuts light different rooms, after the
  paper's language observation).
- `hospital.js` - the white-card outpatient tower: 16 x 16 rooms = DeepSeek-V3's 256 routed experts, the lobby = the
  shared expert, corridors, railings, a lit sign in the film's language, the triage kiosk. `tileKit` makes token tiles.
- `accum.js` - real lens depth of field: the frame is rendered from 32 points on the aperture and averaged.
- `e01.html` + `e01kit.js` - the pilot's key frames (SCRIPT.md section 5), round 1: F1 cover, F3 the pop-up book,
  F5a lamp off (light trails), F5b lamp on (red threads), F8 the ending. `city.js` = many towers as instances with a
  per-tower lit-room data texture (ready for the real trace); `streets.js` and `campus.js` are earlier experiments.

Lessons from the first look round (each cost a render):
- Two coplanar surfaces (the model's foam board on the desk) z-fight as 32 px screen blocks once the lens is jittered.
  Lift everything that lies on the desk off its plane.
- Accumulating into a render target: turn `renderer.autoClear` off for the additive quad, use a HalfFloat target and
  `ONE, ONE` blending; three's AdditiveBlending multiplies by alpha again.
- BokehPass smears dark streaks at depth edges in macro shots; use `AccumDOFPass` instead.
- A `//` comment pasted into the middle of a line silently disabled the model's scale (the launch film had the same bug).
- The white cat blooms out next to the lamp: keep its `light` under 0.85 and the bloom threshold at 0.85.
- A page lifted towards the light shows the camera its underside: shoot a turning page from the side its face points to.
- Depth-relief sprites tear when tilted or seen from the side (the cat in F3): keep `tilt` 0 and relief low, or paint
  the pose the shot needs (a cat paw for F3 is still to paint).
- A long perspective lens over a city of thin towers makes them splay and the ropes read as random; F5 uses a 17 deg
  lens from 13.5 units up, like a map.
