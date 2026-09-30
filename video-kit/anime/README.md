# anime/ — pre-rendered anime films for page transitions

`tiga/` is the complete source of the Events ↔ Guandan transition films (main 6c794e2): Golza and Melba attack
the pyramid (`attack.html`, events → guandan) and Tiga wins with a beam of Guandan cards (`light.html`,
guandan → events). Copy the folder to start a new film of the same kind; the how-to, the design rules and every
pitfall we hit are in the skill `.claude/skills/picasso-anime-transition-film/SKILL.md` on `main`.

```
tiga/
  engine.js     shots + per-aspect cameras over 1536x1024 key frames, three.js layer (toon debris with ink
                hulls, Guandan card stream / beam, glow sprites), q5.js fx layer hook, impact frames, flashes
  fxlib.js      q5 / Canvas2D effects: focus + speed lines, katakana SFX, cel dust clouds, embers, rays,
                monster rays, crack systems, explosion sprite, jet sprite + contrail
  attack.html   film 1 timeline      light.html   film 2 timeline
  art/          Codex key frames (+ jet.png keyed from green, fx_boom.png with real alpha)
  gen.sh / gen_sq.sh   Codex key frame / sprite generators (Mac only: needs the logged-in Codex CLI)
  style.txt     the shared art-style paragraph appended to every prompt
  sheet.py      contact sheet of snapped frames
  vendor/q5.min.js
  test/         Playwright checks on the live Google Sites page (see t_tiga.py header)
```

Render (from `../pipeline`): `python3 snap.py ../anime/tiga/attack.html 0 60 120 --width 960 --height 540 --out /tmp/s`,
then `python3 render.py ../anime/tiga/attack.html --out OUT --width 1280 --height 720 --workers 2 --clean` and the
same at `--width 720 --height 1280` for phones. Encode the lossless segments in `OUT/segments/*.mkv` with ffmpeg
(concat demuxer → libx264 CRF 27, `-tune animation -pix_fmt yuv420p -movflags +faststart`, bt709 tags, no audio).
