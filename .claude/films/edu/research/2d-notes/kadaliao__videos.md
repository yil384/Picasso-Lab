# kadaliao/videos

- URL: https://github.com/kadaliao/videos  (0 stars, no license file, created 2026-08-20, pushed 2026-09-29)
- Repo description is stale/unrelated ("Local-first dashboard for analyzing agent token usage"); content is a film collection.
- Two films: `ai-history-1900-2026/` (一个问题的一百二十六年, 9:16, 2:56, 1080p60, 27 shots) and
  `insurance-101/` (保险，到底在保什么, 16:9, 6:12, TTS narration + burned subtitles).

## Made with (verified)
- All 5 commits carry `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; the 3 ai-history commits are authored
  by "Claude" with `Claude-Session: https://claude.ai/code/session_017ef6YwGazz5ZMZbtJmaSQS` (Claude Code on the web).
- ai-history README: "分镜、每一帧的绘制代码与配乐均由 Claude 生成。"
- insurance-101 README: "画面、字幕、配乐和音效全部由代码生成，只有旁白用了 TTS（OpenRouter · MiniMax Speech 2.8 HD ...），没有使用任何生成图片。"
- No CLAUDE.md / skills / guides in the repo - the method is not documented, only the outputs and source.

## Stack / pipeline (ai-history)
- Plain Canvas 2D, ~2000 lines: `src/engine.js` (easings, hash noise, kinetic text `txt()` with modes
  rise/drop/pop/slam/scramble/type, pixel text via threshold + nearest-neighbour upscale, grain tiles, vignette,
  scanlines, silent-film scratches/dust/flicker, chroma split, slice glitch, snow, frost, brush-ink act cards),
  `scenes1-3.js` (27 shots registered with `scene({id,s,e,draw,post,trans,tin})`).
- Every frame is a pure function of t; same code plays live in `film.html` and renders offline.
- Transitions are buffer-to-buffer functions: cut, fade, whipUp (with motion smear), iris, paper tear, zoom, glitch, crtOff.
- Camera = `kick(t, amp, decay)` impulse shake + optional film "weave" per scene; flashes registry.
- A year ruler HUD on the left edge interpolates the current year (`yseg`) across the whole film.
- `cue(t, type)` calls inside scenes build a sound-event timeline -> `cues.json` (~700 cues: tick, blip, key, pop,
  type, relay, slam, whoosh...) -> `music.py` (numpy/scipy synth: 120 BPM A minor, leitmotif A4 C5 B4 E5 "a phrase
  that ends on a question", drums/bass/lead/sfx buses, convolution reverb) so every hit lands on its frame.
- `render.js`: Playwright Chromium, 4 parallel pages each render a frame range -> JPEG dataURL -> ffmpeg image2pipe x264
  segments -> concat + mux soundtrack. `preview.js "12,50,110" sheet.png` renders a contact sheet at chosen times
  (the review loop).
- 16 Google Fonts used as era signifiers (Bodoni, UnifrakturMaguntia, Special Elite typewriter, VT323 CRT, Silkscreen
  pixel, Archivo Swiss, Anton, Unbounded, Ma Shan Zheng brush...).

## Stack / pipeline (insurance-101)
- Node + skia-canvas (no browser), `src/script.json` holds narration (`say` for TTS, `sub` for subtitle, `gap`).
- TTS via OpenRouter; Whisper char-level alignment -> `audio/lines.json`; `timeline.mjs` lays lines end to end and
  exposes `S(id)`, `END(id)`, `cue('lineId','关键词')` = the moment the narrator says that word. Visual beats are keyed
  to spoken words. `still.mjs x.png a5@放进+1.2` renders a still at "line a5, word 放进, +1.2 s".
- `mix.py` procedural pad (D major), ducking -6 dB under voice; `master.sh` to -16 LUFS.

## Look (from frames I extracted: frames/kadaliao__videos/aihist_sheet.png, aihist_row1/2.jpg, insurance_sheet.png)
- ai-history: kinetic typography / motion-graphics poster film. Huge era-specific year numerals top-left
  ("1900" Bodoni, "1936" on blueprint blue with a Turing tape of 0/1 cells and a bracketed read head, "1956" Swiss
  poster with a red sun disc, "1987" pixel font over a storm of amber IF-THEN rules). Constructivist red diagonal
  band with a black "R" for R.U.R.; a cream re-drawn NYT front page "NEW NAVY DEVICE LEARNS BY DOING"; a flat
  isometric chessboard with gears; a black/white chess position; ImageNet as a sea of coloured pixel squares
  with "14,163,764"; ChatGPT as a cloud of multilingual chat bubbles ("Fix my SQL", "Bonjour", "帮我写首诗");
  2025 agents as four dark terminal panes; the end is a chat bubble prompt and "你给了我一句话。我还你126年。"
  A magenta brush "涌" splash marks a chapter. Grain/vignette everywhere, CRT and film effects per era.
- Strong typographic and graphic-design craft, smart era-switching, clever ending (the film reveals its own prompt).
  But it is flat vector + type: no characters, no painted texture, no comedy; a few shots (2012 bar chart with
  GTX 580 cards, 2025 terminal panes) read as slides/dashboard. It is the best "editorial motion graphics" piece.
- insurance-101: navy-gradient dark UI with glowing gold accents, dot grids, a ring chart, bar charts, shield icons
  around family glyphs, card buttons "保什么 / 不保什么", subtitles bottom. This is exactly the "animated dashboard /
  explainer slideshow" look the lab rejects; useful only for its narration-sync tooling.

## Quality
- ai-history 7/10 (typographic craft 8, charm 5); insurance-101 3/10 visually.

## Borrow
- `cue()` sound-event registry exported from the film -> procedural score where every hit lands on its frame.
- Word-level narration sync: `cue('lineId','keyword')` from Whisper char timings (insurance-101/timeline.mjs) so
  animation beats land on spoken words; `still.mjs` addressing stills by line+word for review.
- `preview.js` contact-sheet-at-times review loop; parallel Playwright workers each piping JPEGs to an ffmpeg segment.
- Buffer-to-buffer transition library (whipUp with smear, paper tear, iris, crtOff) and impulse camera kicks.
- Era/topic-dependent typeface + texture switching as a storytelling device (per-chapter look), and a single
  recurring protagonist object (the amber question mark) threading all shots.
- Do NOT borrow the dark-navy infographic look of insurance-101.
