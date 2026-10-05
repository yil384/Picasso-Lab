# hi-nikola/hand-drawn-explainer-video-nikola ("讲一部分、画一部分" skill)

- URL: https://github.com/hi-nikola/hand-drawn-explainer-video-nikola (358 stars on 2026-10-04; created 2026-09-02; 2 commits; Apache-2.0;
  the vendored runtime is MIT). Author Nikola, X @Nikola314159.
- **Not made with Claude, as far as the repo shows.** README line 1: "一个面向中文知识讲解的 Codex Skill". The install path is
  `~/.codex/skills/...`, it ships `agents/openai.yaml`, and docs/INSTALL.md has an "OpenAI Skill 上传" section. A grep for claude, opus and
  anthropic finds nothing. Commits are by hi_nikola with no co-author lines. The repo predates Opus 5.5 (2026-09-22). I include it because the
  brief listed it and because it is the main Chinese reference for "边讲边画". It should not be counted as a Claude example.
- I watched the three shipped samples myself: frames from yuefa-sanzhang-16x9-stroke-story.mp4 (38.5 s), steve-jobs-biography.mp4 (57.2 s) and
  what-is-skill-sample.mp4 (14 s, 1080x1920) in frames2/nikola/ (yuefa_a.jpg, jobs.jpg, skill.jpg, full_y.jpg, full_s.jpg).

## Pipeline
- Two routes. (1) **逐笔故事 / stroke story**: generate a painted illustration with an image model, extract a bitmap line drawing from it,
  skeletonise it into continuous "stream" strokes (vendored geeklee/srt-whiteboard-animation), and reveal it region by region along the SRT
  timeline. A PNG of a hand holding a marker follows the pen, then the colour fills in. (2) **程序动画**: HTML/SVG plus GSAP or HyperFrames
  with independent elements.
- Voice: by default Volcengine Seed-TTS 2.0 with the 刘飞 voice (`zh_male_liufei_uranus_bigtts`). The README rejects system TTS and edge-tts as
  "低质量" and says that if no proper voice is available, the skill should report the gap rather than silently substitute.
- "语义岛" (semantic islands): a 16:9 page holds two independent scene islands, left then right, separated by a 6-10% empty gutter, with the
  bottom 18% kept clean for subtitles. The left island is inked, coloured and held for at least 0.5 s, and then the right island begins.
  "先做声音预算，再决定画多少": the drawing time each region needs is its duration divided by its line complexity. If a region reads as rushed,
  extend the narration, simplify the art or split the scene; never just speed up the hand.
- Keywords: 2-6 Chinese characters, revealed one by one with ASS `\kf`. The image model is never allowed to render text.

## What I saw
- 约法三章 (16:9, seven scenes): Q-version (chibi) Han-dynasty crowds, city gates and bamboo-slip boards, all clearly from an image model. Each
  scene starts as a black ink line drawing written in by a large photographic hand with a red-capped marker, then a colour pass
  (muted earthy palette, warm paper) sweeps in. In full_y.jpg the colour reveal is a **hard horizontal band**: the top third is
  fully painted and everything below a straight line at about y=360 is still line art. The line extraction leaves **speckle and broken
  hatching** on walls and ground. The subtitle is small white sans with a dark outline at the bottom centre ("公元前206年，刘邦攻入咸阳").
  The three laws appear as handwritten keywords on the boards (杀人者死 / 伤人及盗抵罪 / 余悉除去秦法).
- 乔布斯 (16:9, semantic islands): sparse, semi-realistic ink figures on cream paper. Red **brush-calligraphy** keywords in the top-right
  corner (被赶走 / 重新开始 / 21岁创业 / Macintosh / NeXT·Pixar / 1997回归 / 复杂→简单). Orange accent squiggles. The drawing hand recurs. The
  ending (an empty chair with a folded black turtleneck and glasses, plus a tangle of cables becoming a simple box) is the strongest image in the
  set.
- 什么是 Skill (9:16, programmatic): flat vector illustration (a man in a blue shirt and a yellow robot) on off-white. The headline sits top
  left in two lines (black plus a blue or red accent line, heavy sans), with a small kicker above it ("AI 入门 · 一个常见烦恼"). Speech bubbles
  stack up. A two-line centred subtitle sits at about 85% height, above a blue progress bar and a footer ("把 AI 用明白" / "手绘动效 · 样片"). This is
  a tidy 9:16 grid but generic.

## For our channel
- Borrow: the **sound-budget rule** (art complexity follows narration time, not the reverse); "one complete event per scene";
  keywords of 2-6 characters revealed one at a time and kept out of the bottom 18%; never let an image model render text; the 9:16 vertical
  grammar of a top-third headline in two lines with an accent colour on line 2, a centred subtitle above the platform UI and a thin progress bar.
- Avoid: the photographic hand marker (a VideoScribe cliché; our user would read it as generic); image-model chibi art with a skeleton line
  extraction (speckle, hard reveal bands); a two-route skill that splits the look into "drawn" and "flat vector".
