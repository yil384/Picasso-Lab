# linsank2005/science-video-skill (MP3 narration -> p5.brush watercolour science explainer)

- URL: https://github.com/linsank2005/science-video-skill (0 stars on 2026-10-04; created 2026-10-03; 1 commit "Publish portable science-video
  skill and runtime" by Linsan; no license file). Size 112 KB: SKILL.md, references (SCIENCE_VIDEO.md, ANIMATION_GUIDE.md), a runtime
  (src/core.js, clawd.js, cast.js, props.js, video-timeline.js; scripts project.mjs, render-video.mjs, video.mjs, transcribe.py) and a zip.
- **No example video, still or storyboard ships.** I could not view any output. The README itself says "尚未在其他电脑上完成全流程运行验证".
- Provenance: the README says "基础绘画与渲染代码来自 JohnHeibel/PDoomVideo 的本地科普视频适配" and package.json says "Portable MP3 narration runtime
  based on JohnHeibel/PDoomVideo". PDoomVideo is the Claude Opus 5.5 music video studied in wave 1, so the drawing engine is Claude-made.
  The skill text itself is model-neutral ("AI 编程助手") and ships `agents/openai.yaml` ("Codex Skill 界面信息"). There is no Claude or Opus
  statement and no co-author line, so I cannot confirm this package was made with Claude.

## What it does (from SKILL.md and SCIENCE_VIDEO.md)
- **The narration exists before anything is drawn.** "原 MP3 只复制，实际音频长度是整条时间线的依据". If only the MP3 is supplied, it runs local
  faster-whisper (Chinese, small model, CPU int8, word timestamps) -> transcript.json, which is the single source of truth for subtitles and
  SRT. "保留真实时间戳，不按字数估计整段 MP3 的时序". If an SRT exists, it is imported and ASR is skipped.
- The storyboard divides 0..duration into contiguous scenes with no gaps or overlaps. Each scene lists start and end, narration, teaching goal,
  main action, camera, transition and modules. "用可见的因果变化、比较和过程解释概念" and "不能仅靠替换图片完成制作". Facts are checked
  against primary sources and noted in the storyboard; the recorded narration is never rewritten.
- Scenes are pure functions `draw(t, lt, dur)` using p5.js plus p5.brush watercolour, with `hash` instead of Math.random and paired
  `camBegin/camEnd` camera calls. The bottom 18% is reserved for subtitles. Defaults are 1920x1080 at 24 fps, or 1080x1920 for vertical.
  Clawd and the researcher character are optional; the original song's fixed beats, chapters and HUD are explicitly dropped.
- Checks: a keyframe contact sheet, a short clip with audio, a project integrity check, then the full render plus verification.json. It notes
  "媒体结构检查通过，不代表科学事实、视觉质量、声音语义或音画同步已通过".

## For our channel
- Borrow: the strict **audio-first** contract, where the measured MP3 duration and ASR word timestamps drive every cut (useful for the side
  line, where we have real recorded voice rather than TTS); word-level timestamps let us split subtitles finely without karaoke; the honest
  "what the structural check does not prove" note at delivery.
- Avoid or watch: it is an untested repackaging of PDoomVideo's music-video engine. The painted p5.brush look was built for a song, and
  nothing here shows it working for diagrams or Chinese text. 24 fps is a poor default for Douyin, which usually runs 30.
