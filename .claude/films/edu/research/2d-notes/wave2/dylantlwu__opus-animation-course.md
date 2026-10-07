# dylantlwu/opus-animation-course (「Opus 代码动画导演课」, Chinese self-study course)

- URL: https://github.com/dylantlwu/opus-animation-course (0 stars on 2026-10-04; created 2026-10-01, last push 2026-10-04; MIT code,
  CC BY-NC-SA content). Live site: https://course.oxygentwo.com (HTTP 200 on 2026-10-04). VitePress site plus a `studio/` practice project.
- Provenance (quoted): README: "用 Claude Opus 5.5 **写代码**做科普解说与动态图形视频的中文自学课程". Every commit I read ends
  "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Commit 12b65dd: "In Claude Code 2.1.251 the 'opus' alias starts Opus 5, not 5.5"
  (so launch with `claude --model claude-opus-5-5 --effort xhigh`).
- What I looked at myself: the 76.6 s example film `site/docs/public/media/gps.mp4` (19 frames at 4 s, frames2/dylan/gps_sheet.jpg), the
  M11 Blender x 2D overlay clip (overlay_sheet.jpg), and the 4-style comparison demo `style-gps.html`, which I rendered at t=5.5 s in headless
  Chrome (style_gps_5.5.jpg). I also read README, index, M3 (writing), M6 (sound), M9 (dual aspect), style/index, community.md and
  studio/CLAUDE.md.

## Curriculum (13 modules) and the parts that matter to us
- Contract: `window.__meta` plus a pure `window.seek(t)`. One renderer (`render.mjs --clip --sheet --strip --still --verify --blur --audio`).
- **M3 writing**: a five-part short (① 钩子 0-3 s "制造一个「咦？」" ... ⑤ 回报 "回扣钩子"); an ABT logline ("写不出 ABT，说明你还没想清楚");
  a **concept dependency graph** cut to at most 6 nodes to decide the order; **reads**, meaning one new piece of information at a time
  that never overlaps the previous one; numbers written as they are spoken ("3×10⁸ m/s" -> "每秒三十万公里"). "节奏太快，往往是概念依赖图里漏了节点
  ... 是编剧问题，不是动画问题".
- **M6 sound, 声音先行**: narration.txt (one sentence per line, a blank line adds a 0.6 s paragraph pause) -> `audio/tts.py` (edge-tts
  sentence by sentence) -> voice.wav + `timeline.json` {lines:[{i,text,start,end}]} + voice.srt. The picture code references only `S(i)`,
  the start of sentence i; "代码里不写死任何秒数"; shot changes land 0.25 s before the first sentence of a paragraph. Changing the voice means
  re-running tts.py and the picture follows. TTS comparison: edge-tts `zh-CN-YunyangNeural` (稳重，新闻腔) or `YunxiNeural` (活泼), described as
  "社区普遍觉得「偏平」"; CosyVoice/IndexTTS can clone voices; Volcengine/SeedAudio sound more natural (not tested). `mix.py`: sidechain ducking,
  -14 LUFS, true peak -1.5 dBTP, with a well-documented loudnorm pitfall table. Subtitle homework: split by punctuation or length, allocate time
  by character share, each subtitle at least 1.8 s, about 16-20 characters per line in landscape and fewer in portrait. **Chinese font
  engineering**: subset the fonts (55 MB -> 37 KB with pyftsubset, using the text in timeline.json); wait for `document.fonts.ready`; PingFang
  may not be redistributed, so use Noto Sans SC or Source Han (OFL).
- **M9 dual aspect**: one seek(t) renders both 16:9 and 9:16 with separate layouts. Vertical safe area: **top 150 px, bottom 170 px, sides 60 px**
  ("标题栏、点赞 / 评论按钮、文案会盖住"; labelled an empirical value). Text larger than in landscape (body text at least 40 px). A top/middle/bottom
  composition with the hook in the upper third. "竖屏用户划走更快：第 1 秒就要有运动". Export: Douyin, 视频号 and Shorts at 1080x1920, 30 fps.
- **Style module**: a four-layer style spec (本质 incl. "不是什么" / visual / motion / guardrails) written as `LOOK.md` with a verbatim
  "风格块" carried into every shot; 16 style cards. The demo shows one reads timetable in four styles at once.
- **studio/CLAUDE.md** (the director's handbook for Opus): gates G0 brief -> G1 storyboard (stop) -> G2 stills with self-critique "列问题，不列优点"
  (stop) -> G3 half-resolution preview plus strips at transitions -> G4 final. Anti-"AI 味" list: no centred big title on a gradient, no
  everything-fades-in-together, no static opening longer than 1 s, no text under 28 px at 1080p, no made-up numbers, no fake UI screenshots, one
  focal point per shot; elements staggered 0.06-0.12 s; "快到、轻落" ease-out; transitions land on beats or narration pauses.

## What I saw
- GPS film: a near-black board (#1C1C1C) with thin white and teal lines. A phone outline with a red jittering clock, lightning plus
  sound rings counting 1, 2, 3 s, satellites as small teal glyphs, spheres intersecting into ellipses with the old ones dimmed, a red X "在太空里，排除",
  then red error scatter "1 毫秒 × 光速 = 300 公里", then x y z t boxes with t in red, and an ending that returns to the phone with
  "位置 ✓ 时间 ✓" (the clock motif comes back). Subtitles are small white text on black pills at the bottom centre. It is clean and correct but
  sparse and grey: a competent 3B1B imitation with no character, texture or camera.
- 4-style demo at t=5.5: Swiss (cream ground, black squares, a huge red "4"), 3B1B (dark ground with circles and a yellow italic "4"), whiteboard
  (handwritten Chinese, blue dashed lines, a red circled "4") and 国风水墨 (ink-blot satellites, a dry-brush earth arc, a running-script 四 and a
  red seal 定). The same content and timing look completely different. This is the point the course makes: "差别主要不在颜色，而在「东西是怎么出现的」".

## Platform context (the course's community.md, plus my own Bilibili search)
- community.md lists the head hits by X views (Western civilisation about 14M, P(doom) about 3.76M, 中华上下五千年 by @akokoi1 about 150k) and notes
  that Opus 5.5's default look is "居中大字 + 渐变背景 + 所有元素一起淡入" and "深蓝底 + 琥珀色强调", which is exactly the dotey look.
- Douyin-specific numbers are absent here, as everywhere else in this cluster. Bilibili is the measurable Chinese platform. I ran the Bilibili
  search API myself (sorted by plays, 2026-10-04): the top Claude-made Chinese knowledge videos are all 16:9, 4-5 minutes, with dark cinematic or
  editorial looks: 当我问Opus5.5什么是量子力学 87,084 plays; 设计科普：瑞士风格 70,590 plays / 6,498 favourites; 信息论 惊奇之学 70,345 / 6,390 favourites;
  熵 52,350; 傅里叶变换 35,557; "AI 被提问时，脑子里到底在想什么" 81.6 s, 49,826. Favourite rates around 9% mark these as save-to-study content.
  Most titles lean on the "震惊瘫坐！Opus 5.5 ..." novelty hook. Covers (frames2/bili/covers.jpg): serif Chinese titles with letter-spaced
  English on black, glowing particle glyphs (熵), or Swiss red/cream editorial. The "transformer 历史" one-prompt video got 383 plays, so a
  topic alone does not carry a video.

## For our channel
- Borrow nearly all of the process: ABT logline, a dependency graph of at most 6 nodes, reads, 声音先行 timeline.json with `S(i)` timing,
  ducking plus -14 LUFS, font subsetting with OFL fonts, the 9:16 safe area (150/170/60 px), motion in the first second, LOOK.md with a "不是什么"
  line and a verbatim style block, G2 stills with a list of problems, and the anti-AI-smell list.
- Avoid: the example film's look (grey 3B1B pastiche, small subtitles on black pills). It shows the method, not the taste our user wants.
