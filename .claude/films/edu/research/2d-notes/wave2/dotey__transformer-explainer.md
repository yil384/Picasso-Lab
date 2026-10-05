# @dotey (宝玉) - 《什么是 Transformer》, 12-minute Chinese explainer

- Post: https://x.com/dotey/status/2103683057689522564 (2026-09-26). Snapshot via api.fxtwitter.com on 2026-10-04: 187,397 views,
  1,337 likes, 1,706 bookmarks (more bookmarks than likes, so people saved it to study), 267 RTs, 77 replies.
- Follow-up with the same prompt: 《什么是 DINOv3》 https://x.com/dotey/status/2103965723081187407 (596.6 s, 20,202 views, 58 likes).
- Video: 1920x1080, 30 fps, 732.3 s, AAC stereo, integrated loudness -16.5 LUFS (I measured it). I watched the video itself: 63 frames at
  12 s spacing from the 720p file (frames2/dotey-transformer/sheet1..7.jpg), plus 8 frames of the DINOv3 film (dino_sheet.jpg).
  I could not listen to the narration (no speech-recognition model on this machine), so everything below about the voice comes from the
  author's replies and the burned-in subtitles.

## Provenance (quoted)
- Post text: "《什么是 Transformer》由 Claude Code + Opus 5.5 制作". Full prompt is in the post: "帮我用js制作一个视频，主题是：什么是 Transformer /
  要深入浅出，让高中生也能看得懂，不仅high level说的清楚，也要有细节，包括注意力机制，甚至一些数学概念 / 你可以用任何工具或者安装工具，可以联网检索 / 请给我惊喜".
- Author replies: "one shot （Opus 5.5 xhigh）"; "它的 TTS 是自己找的 微软 EdgeTTS（开源的 API 逆向） https://github.com/rany2/edge-tts
  用 Remotion（React/JS 视频框架）+ KaTeX 渲染公式。" Source code is not public. I found no repo; the awesome lists only quote the prompt.

## What I saw
- Look: a dark navy page with a faint teal and purple vignette, the same on every shot. Top left there is an orange chapter chip
  ("01 开场", "07 Q·K·V", up to "16 揭晓") and top right a small grey watermark ("什么是 Transformer"). Every frame has a
  dark-pill subtitle in bold sans at the bottom centre, and an orange segmented progress bar along the bottom edge (one segment per chapter).
  Headings are white with orange or green keywords. Numbers use a monospace font. Formulas are typeset in KaTeX serif italics.
  Rounded token chips have coloured glowing borders.
- Structure (16 chapters): opening hook -> a puzzle ("一个小谜题：「它」指的是谁?" with the sentence 小猫没有跳上桌子因为它太累/高了, where changing
  one character changes what 它 refers to) -> the RNN "记忆小本子" bottleneck -> a three-step overview -> word vectors (a 2D scatter of
  animals and fruit, then 国王 - 男人 + 女人 ≈ 女王, then a 12288-number heat strip for GPT-3) -> "三分钟数学课：点积" (vectors a=(3,1),
  b=(2,2), dot = 8, then the cos θ form, then the negative case) -> Q/K/V as a library (a query card, book spines with key labels, weights 0.9 /
  0.1 / 0.0 / 0.7 / 0.1, and "学到的 = 加权混合") -> **"亲手算一次注意力"**: the 4-dim q for 它 against the keys of 小猫/桌子/它, step by step
  through 打分 -> ÷√d -> softmax (e^x, the sum 11.1, 67% / 9% / 24%) -> weighted sum of V, giving the new vector "浓浓的「小猫」味" -> the full
  formula -> why ÷√d (the distribution at d=64 versus after scaling) -> multi-head attention (8 small heat maps labelled 前一个词 / 自己 / 指代 /
  句首 ...) -> positional encoding (sine waves, a 4-number "位置指纹") -> the full block (residuals) -> ×96 layers -> next-token prediction
  (今天天气真 ? -> 好 62%) with a causal mask -> training (床前明月光，疑是地上? with a loss of -log p) -> gradient descent (a cartoon ball rolls
  into the valley; a loss curve at step 298,300) -> **callback to the opening puzzle**, now with real attention arcs (它太累了 -> 小猫 58%; 它太高了 -> 桌子 55%) ->
  a one-line recap pipeline -> a final chat-window shot ("此刻正在进行的点积: 1,180,013,259,700" counting up).
- Motion seen across the frames: chips and arcs drawn on, numbers counting up (one frame catches "8,881" mid-count while the subtitle says
  12288), bars growing, and step tabs that light up in turn (①打分 ②缩放 ③softmax ④加权求和). The camera never moves and there is
  no depth. Every shot is a static layout that builds in place, which makes it a slide deck with good builds.
- Subtitles: one line per sentence. I ran scene detection on the subtitle strip and got about 173 changes in 732 s, so a median line
  lasts about 4 s (p10 2.9 s, p90 5.5 s). With 18-26 characters per line that is roughly 5 characters per second, a normal edge-tts pace.
  These numbers are approximate.
- DINOv3 follow-up: the same house template (chapter chip, bottom pill, progress bar). It adds a real cat photograph, a rainbow
  PCA feature map of that cat used at both the opening and the end, and small source chips: "实机运算 · DINOv3 ViT-L/16" and
  "数据来自 DINOv3 论文 表 3".

## Audience reaction (replies, verbatim)
- Positive: "这次是真看懂了", "这可能是看过的最好的Transformer 视频了， 可以发B站了", "我全程看完了，真的能让外行的我看下去".
- Negative, and close to our user's taste: "就像最初用 html 做 ppt 的风格", "ai 味还是挺浓的", "画风太 AI 了", "没啥惊喜的，非常的枯燥无趣",
  "感觉这个视频看上去跟Codex+Remotion的效果区别不大".
- **The author's own diagnosis** (reply to @xiaohu): "提示词把“js制作”换成“js画”会更好，js制作会搞成这种 PPT 格式，js画就会有很多动效，更酷一些".
  So the word 制作 pushed the model toward a slide format and 画 pushes it toward drawn motion. This matters for any brief we write.
- A third-party reply makes a correctness point: "最怕的是 QKV、softmax 这些公式细节一本正经地写错。提示词里加一句“公式必须可溯源”".

## For our channel
- Borrow the pedagogy, not the look. Specifically: (1) a concrete Chinese-sentence puzzle as the hook and as the payoff at the end;
  (2) one worked example with small real numbers carried through every step (q·k -> ÷√d -> e^x -> % -> weighted V), which is what made viewers say
  they finally understood; (3) a numbered step tracker so viewers know where they are; (4) culturally native examples (床前明月光, 今天天气真好);
  (5) source chips on every factual number, and real measured data where possible (the DINOv3 "实机运算" tag).
- Avoid: the dark-navy glow dashboard, a chapter chip plus watermark plus progress bar in every frame, every scene a centred build-up
  with no camera, and the generic "AI 味" palette. Chinese viewers named it as PPT within hours.
- Format: 16:9, 12 minutes. That suits Bilibili or X long form, not Douyin.
