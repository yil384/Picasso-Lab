---
name: picasso-x-launch-film
description: Make, fix or extend the Picasso Lab X launch film ("Compute Not Included", .claude/films/xlaunch) or a film built the same way - three.js scenes + painted sprites + a 2D canvas type layer, rendered frame by frame, the user renders locally with the kit. Use for any change to that film, to resume it in a new session, or to start a new film of this kind.
---

# The X launch film (v10, "Compute Not Included")

Read `.claude/films/xlaunch/STORYBOARD_v10.md` first (story, shot table, every round's changes and why), then this.

## Resume in a new session
1. `bash .claude/films/xlaunch/tools/restore_workdir.sh` - checks out the video-kit pipeline (branch `video-kit`) to
   `~/vk` and rebuilds the film dir `~/vk/video-kit/films/xfilm` from `scene/` + `kit/assets/`. The film dir is NOT in
   git; the repo copy (`.claude/films/xlaunch/scene/*`, `kit/assets/*`) is the source of truth.
2. Edit in `~/vk/video-kit/films/xfilm` (film10.html, props.js, gear.js, type.js, sprite.js ...).
3. Look: `cd ~/vk/video-kit/pipeline && python3 snap.py ../films/xfilm/film10.html <frames> --out DIR --width 432 --height 540`
   (SwiftShader, ~5 s a frame); contact sheet: `python3 .claude/films/xlaunch/tools/sheet.py DIR OUTPREFIX 12`.
4. Check: `python3 .claude/films/xlaunch/tools/overlap.py` (desk interpenetration, must print `clean` everywhere).
5. Sync and ship: `python3 .claude/films/xlaunch/kit/build_kit.py`, update STORYBOARD_v10.md (a "Round N" note),
   commit, merge the working branch into main `--no-ff`, push both. The user renders with
   `curl -fsSL https://raw.githubusercontent.com/yil384/Picasso-Lab/main/.claude/films/xlaunch/kit/get.sh | bash`
   (Final = 16 Mbps, never lower the bitrate) and uploads the mp4 to Google Drive for review.

## How film10.html is built
- **Timelines**: `S10` is the round-5 shot table (old frames 0-1950). Round 8 spliced a 72-frame fly-through after
  Amodei's note: `oldF(f)` maps a film frame to an old one (null = the splice, `framePortal`); `frameAt`/`typeAt` are
  the entry points; `NFALL` is the film length. To insert more shots, add another splice the same way (the length is
  not fixed: more content may make the film longer, the user agreed).
- v8 shots are replayed through `REMAP` (old frame -> v8 frame); new shots are `SHOTX`; cameras are `CAMS10` (new) and
  `CAMS_OVER` (replayed). Use `camPath(keys, ease)` (one spline, arc-length, one ease: no stop-start); never `camRig`.
- **Desk** (1 unit ~ 15 cm): `deskOn()` (lamp, wall, painted props `DECOR`, tea, printer, pen), `clipOnDesk(i)` (each
  clipping on its own layer, `i * 0.026` up), `noteOn`, `deskSet()` (everything once the predictions are in),
  `gpuPile()` (3D GPU tower). Sprites: `put/putH` (relight from the shot's key, `DESK_TILT` leans desk sprites back to
  face the camera - without it they look flat).
- **Props**: `props.js` (newsprint `pressClip` with halftone photos, receipt ribbon, notes, decals, title page, 3D logo),
  `gear.js` (3D GPU card, the instanced datacenter `hall` at x = 200 with per-instance LED blink in the shader).
- **2D layer** (`typeLayer10`, plain canvas, drawn over the 3D): punch words, ink bursts, shock rings, halftone
  `dotWipe`s on big cuts, `misreg` (print misregistration on big lines), rewind ruler, split-flap chapter tiles, ring
  data streams and share arcs, `streaks`, `godRays` (clipped off the sheet), `flare`, `goldDust`, `motes`, `glints`,
  `edgeFade` (grade from the frame edge - never a dark box behind words on a light set).

## Lessons (each one cost a round)
- **Run `tools/overlap.py` after ANY change to the desk layout** (clips, notes, pen, props). A sticky note moved without
  re-checking passed through a clipping in every frame and the user caught it twice.
- Never put a `//` comment in the middle of a one-line statement (it silently commented out a rotation).
- Check every new layout at the shot's own camera: things at the frame edge, a prop between the camera and its target
  (the push into the rack first hit the milk tea), text over the cat.
- The story must be physically logical: a painted streamer in a sprite is not the 3D bill; a close-up must show the
  thing the text points at (freeze growth so it stays put); the cat must not pop up as a giant head.
- On-screen text must not read like a claim it is not ("ASPLOS 15 = ISCA 15" read like an equation).
- Frame 0 is the thumbnail: a composed still life, nothing important cut by the edge.
- Real people: verbatim quotes only (`QUOTES_v9.md`, with sources), real CC BY / public-domain press photos credited
  on the clipping and in the small print; fictional masthead ("The Future"); no jokes about a person.
- Art that code draws badly comes from Codex (`tools/gen_art.py`) or, when Codex is out of quota, from the user via
  ChatGPT web (give exact prompts: green #00FF00 background, size, file name in `art/`); key with `tools/key.py`
  (OUT=film cut dir), relief with `tools/depth.py`. Hard-surface objects (GPUs, racks, halls) are better as real 3D.
- Wikimedia rate-limits the proxy: use the WebFetch tool for the API, a slow retry loop with a User-Agent for files;
  `tools/halftone.py` turns a photo into newsprint dots.
- The user judges by screenshots: send a contact sheet of the changed frames each round, in Chinese, and say what was
  not verified.

## State at the end of round 8 (next steps)
Done: four press clippings (Musk, Amodei, Altman, Huang), GPU rain, painted desk props, the rack fly-through, the
printer/bill logic, the paper-storm light, many 2D effects. Not done yet: section d (690-900 old: the lab grows, 2025
bars, ASPLOS/ISCA tie) has no new effects; frame 0's top is still a dim wall; motes/glints/flare only checked as stills.
