# @akokoi1 (WY) - 「大气环流」 line-art (线稿) geography lesson, plus the edulab skill that codifies the look

- Post: https://x.com/akokoi1/status/2102606609574941028 (2026-09-23). Snapshot via api.fxtwitter.com on 2026-10-04: 147,098 views, 717 likes,
  834 bookmarks, 90 RTs, 45 replies. The author bio says "AI教育工具探索 ... edulab skills 作者".
- Video: 1920x1080, 30 fps, 288.1 s, AAC stereo, -16.7 LUFS (I measured it). I watched the video itself: 60 frames at 5 s spacing
  (frames2/akokoi1-atmosphere/sheet1..7.jpg), a dense pass over the first 12 s (m_open.jpg) and over a chapter transition at 88-93 s
  (m_trans.jpg). I did not hear the audio.
- Related posts by the same author: 中华五千年历史速览 line-art https://x.com/akokoi1/status/2102584165220962502 (about 150k views per the
  dylantlwu course page); a physics competition problem that reuses the same prompt https://x.com/akokoi1/status/2102680453912449223.
- Codified as a skill: https://github.com/wy51ai/edulab (1,331 stars, Apache-2.0). The `edu-math-video` skill was added 2026-09-26, three
  days after the post. Its demo frame (frames2/akokoi1-atmosphere/edulab-demo.jpg) uses the same graph-paper ground, the same orange-underlined
  chapter tag and the same bilingual subtitle box.

## Provenance (quoted)
- Post: "一段简单的提示词，Opus 5.5花了26分钟，直接生成了这段将近5分钟的，解释地理知识点“大气环流”的视频，消耗的token极低。"
- Prompt (verbatim in the post): "做一个动画，讲解高中地理知识点“大气环流”。风格轻松有趣，动画格式为线稿，添加合适的音乐，请务必做到引人入胜，字幕用中英双语，
  解说用TTS，如果 TTS 接口有关闭水印的参数就关掉，文档在TTS.md，API KEY 和音色分别是 .env 里的 APIKEY 和 VOICE，最终视频要能直接导出。"
  Setup: paste a TTS vendor's docs into TTS.md (豆包、智谱、海螺、千问 ...); put the key in .env; deny `Read(./.env)` in .claude/settings.json.
- Replies from the author: "是的，都是svg，大力出奇迹" (all SVG, no Remotion or HyperFrames); "声音用付费的TTS合成的，如果不指定付费的TTS，claude会调用mac自带的TTS，效果很差";
  cost "一条视频的成本在1-3元人民币"; "plus就够了" (he means Pro).
- edulab: older commits carry "Co-Authored-By: Claude Opus 4.8"; it ships as a Claude Code plugin (.claude-plugin/). The edu-math-video commits
  have no co-author line.

## What I saw
- Ground: warm cream paper with a faint square grid and a soft vignette. Lines are clean dark strokes of near-constant width with small
  hand-drawn wobble, drawn on (write-on) as the narration reaches them. The colours are limited: red for warm, rising, low pressure and
  north; blue for cold, sinking, high pressure and south; green for the equator and trade winds; purple for westerlies. Each colour keeps its
  meaning through the whole lesson.
- Mascot "小气团 / Puff": a small white cloud with blush and dot eyes. It introduces itself ("嘿！我是一团空气，你可以叫我“小气团”" with a speech
  bubble "Hi~ 我是小气团!"). It then rides along the circulation loop, sits between the rainforest and desert panels with a red "?", blushes red
  and sweats near the hot equator, shivers near the poles, carries a "搬家啦! Moving!" sign when the belts shift with the seasons, and says
  goodbye ("我是小气团，我们下次旅行再见!"). It acts and reacts and is never just a pointer. It is what makes the video charming.
- Chinese typography: titles and keywords are set one character at a time in a rounded handwritten display face. It looks identical to
  ZCOOL KuaiLe (站酷快乐体), the font the edulab template bundles. The title "大气环流" appears as 大 -> 大气环 -> 大气环流. English is in a
  handwritten Latin face (edulab bundles Patrick Hand). The mnemonic is stamped as three big coloured words with underlines drawn in:
  **北右** (red) / **南左** (blue) / **赤不偏** (green), each with a small English gloss. This kind of rhyme or 口诀 is the most Douyin-native
  moment in the video.
- Subtitles: a rounded off-white paper box at the bottom centre with a dark outline. Line 1 is bold black Chinese sans. Line 2 is
  small blue handwritten English, underlined. One sentence per box.
- Layout and transitions: a chapter tag top left ("01 根本原因 The Root Cause" with an orange underline). A **page turn or slide** moves
  between chapters: the old page with "赤不偏" slides off left over the new page, where the next axis line is already being drawn. Inside a
  chapter the camera is locked and diagrams build up (three-cell circulation, seven pressure belts "像给地球系上了七条腰带", wind arrows, the
  Eurasia map with Winter/Summer). The ending rhymes with the opening (the rainforest/desert question returns in three comic panels:
  赤道低压带 / 副热带高压带 / 地中海气候), followed by a checklist recap and the mascot's goodbye.
- Subtitle-change rate from scene detection on the subtitle strip: about 104 changes in 288 s. This is noisy because nearby drawings also
  register as changes.

## Audience reaction (replies)
- "html ppt动画的感觉  风格比较简单", "svg还是有点粗糙，不知道有没有更好的方案", "这玩意还是太粗糙了 只适合割割小白" versus "大气环流光看课本挺绕的，做成动画好理解多了".

## edulab `edu-math-video` (the codified version; I read SKILL.md and reference/visual-design.md)
- Core rule: "画面跟着旁白走，而且图会“讲题”". Each narration sentence gets one **指 -> 动 -> 留 -> 连** action (指: highlight what
  the line names; 动: one 0.6-1.5 s motion that acts out the reasoning; 留: a mark left behind; 连: the same colour on the board and the
  figure). Timing is always `S.at(k, f)`, a fraction f into sentence k, "绝不写死秒数". A `render.mjs motion` check samples 6 frames per
  sentence and fails sentences where nothing moved. There is a 动作表 that maps reasoning moves to animations (equal segments -> a copy slides
  over; 3D -> top view is a camTween on the same model; a length result -> a glow sweep plus a number counting up).
- Chinese TTS rules: the `tts` field must be speakable Chinese with no digits or symbols ("AC等于三"). Polyphones are pinned with `字[pinyin]`
  placed after the character, kept in a shared pron.json, and `--check` must report 0 unresolved before the paid TTS runs. Clauses are at most
  18 characters, with commas where the speaker breathes. An ASR round trip (`--asr`) catches misread letters. Subtitle lines are at most 36
  characters so they never wrap. All content sits above y=860 because 914-1044 is the subtitle box.
- Engine: GLM-TTS (voice chuichui), falling back to edge-tts, then macOS say. Synthesized music. Playwright plus ffmpeg at 30 fps. 16:9 only.

## For our channel
- Borrow: a recurring mascot that is a physical piece of the subject (an air parcel; for us a token, a KV block or a qubit) and acts out the
  process with emotions; a one-colour-one-meaning palette; per-character write-on of Chinese keywords; a stamped 口诀 / rhyme beat; page-turn
  chapter breaks; an ending that rhymes with the opening; edulab's sentence-indexed timing (`S.at(k,f)`), its motion check and its
  pronunciation pipeline (pron.json, digit-free tts field, clause ≤18 characters, ASR check).
- Avoid: flat constant-width SVG strokes and clip-art suns (viewers called it 粗糙 and PPT); the locked camera with in-place diagram builds;
  a 16:9 layout with a large subtitle box (it would need a full re-layout for 9:16).
