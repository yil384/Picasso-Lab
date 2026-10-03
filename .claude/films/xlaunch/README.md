# The X launch film, v8 (papers + characters)

v7's look (approved stills) + v6's story of the lab's 136 real papers + a character line. 4:5, 1080x1350, 30 fps,
59 s, silent (a silent AAC track; the user lays music in CapCut). Every cut sits on a 2 s bar (120 bpm grid).
Archive of every cut and its verdict: `social/x/versions/` (`make_index.py`).

## Files

- `scene/` - the film for the video-kit pipeline (branch `video/x-launch`, `video-kit/pipeline`):
  - `film.html` - the whole film: shot table `S`, per-shot cameras `CAMS`, `paperAt(k, f)` (every paper through
    every beat), `SHOTFN` (lights, characters, props per shot), `typeLayer` (editorial type + leader lines).
  - `studio.js` - the v7 studio: curved fibre-bumped papers, area lights, glossy Reflector floor, cyclorama,
    bokeh + bloom + whip-pan motion blur + grade/grain; `blankPage()` draws "Paper #137".
  - `layouts.js` - where the papers are in each beat (gallery, year chart, venue towers, ring wreaths, honours row,
    cloud, end arc).
  - `sprite.js` - painted characters as billboards: graded into the scene light, a thin cool rim on the side facing
    the rim light, a real cast shadow, a contact shadow; the floor reflects them.
  - `type.js` - Inter + JetBrains Mono, rising-mask reveals, chapter header, leader lines anchored to 3D points,
    a rolling odometer.
  - `lib.js` - easing, camera rig (Catmull-Rom through keys, a key can be a cut), motion blur and grade shaders.
- `art/` - the painted characters (ChatGPT, prompts in `PROMPTS.md`), flat #00FF00. Key them with
  `python3 tools/key.py` (writes `scene/cut/`, not committed). Existing art reused from
  `.claude/films/yufei/anime/art3d/` (Yufei poses, the cat).
- `STORYBOARD.md` - the shot list.

## Render

```sh
# in a worktree of video/x-launch:  git worktree add ../vk origin/video/x-launch
cp -r .claude/films/xlaunch/scene ../vk/video-kit/films/xfilm
python3 .claude/films/xlaunch/tools/export_pages.py --fonts FONTS --out ../vk/video-kit/films/xfilm --hero-dir HERO   # pages, data.json, team.jpg, logo.png (heroes at 1600 px)
SRC=.claude/films/xlaunch/art OUT=../vk/video-kit/films/xfilm/cut python3 .claude/films/xlaunch/tools/key.py
cd ../vk/video-kit/pipeline
python3 snap.py ../films/xfilm/film.html 150 470 700 1200 --width 540 --height 675 --out /tmp/snaps   # stills first
python3 render.py ../films/xfilm/film.html --out ../out/xfilm --workers 2 --width 1080 --height 1350   # ~3.7 s/frame on 4 CPU cores
python3 ../films/xfilm/finish.py ../out/xfilm   # mp4: H.264 high, CRF 18, yuv420p, +faststart, silent AAC
```
