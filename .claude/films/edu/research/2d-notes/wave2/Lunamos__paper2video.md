# Lunamos/paper2video - Claude Code skill: research paper -> "3Blue1Brown-style" explainer (Remotion)

- Repo: https://github.com/Lunamos/paper2video (MIT; 1 star; created 2026-09-30; author Zehao Jin, Georgia Tech).
- Provenance: commit e293cfd ends `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; vertical covers carry "Made with Claude Opus 5.5 + Remotion".
- Showcase films (viewed): "Transformers Stop Thinking Too Early, and a Tiny LoRA Fixes It" EN https://youtu.be/zauTNrrZQW8 (260 s, 21 views), ZH https://www.bilibili.com/video/BV1Ymad68Eof (284 s); FLAS EN https://youtu.be/5Tg7fNdvvvs (17 views), ZH BV16Wa76aEnL. Downloaded the ZH and EN STTE cuts; 35 frames of the ZH cut at 1/8 s, plus the repo's showcase stills: frames2/lunamos-paper2video/ (zh_sheet, showcase, vertical). Transcribed the first 60 s of the Chinese VO with Whisper small.

## What I see
- Dark navy UI, thin serif titles + sans, one orange and one cyan accent. Each scene = section kicker ("04 · 模型内部：一场接力") + a chart or code card + bottom caption with the spoken word highlighted. Real data: re-plotted accuracy curves, a heat-map "relay" of read-out accuracy with a layer cursor sweeping, LaTeX formula `h <- M(h) = sh + BAh`, a big "65,537" parameter count, 3D trajectories from the paper. Every chart has a tiny source line.
- Vertical (9:16): big Chinese headline in the top third ("大模型想几步就停了"), a 16:9-ish chart card in the middle, caption at ~70% height, authors at the bottom.
- Chinese VO opens "大家好，今天讲的这篇论文叫 ..." - a conventional lecture read.

## Narration / pacing
- VO-led (ElevenLabs v4 if a key, else edge-tts; also GPT-SoVITS, Fish Audio, own recording). One TTS request per scene, 2-3 seeds, picked by ASR round-trip accuracy then pitch variation; `keyTerms` that must survive ASR (e.g. "Qwen|千问" - a take that says 千万 loses); captions word-timed; picture keyed to anchor words; music ducked; "no count-up numbers and no full-frame shake".
- reference/vertical.md: native 9:16 rebuild, text-safe area x 120-888, y 260-1500 (keep x <= 780 below y 840 for the button column), captions at 68-78% height, 60-72 px bold, <= 2 lines, ~9-10 CJK chars per line, jieba word breaks (Intl.Segmenter splits 金门大桥 badly), frame 0 = the hook claim <= 7 words at >= 110 px, "a visible change every 1-3 s", end on a frame that loops to the first; on Bilibili knowledge videos are still mostly landscape.
- reference/voice.md (GPT-SoVITS lessons): split text every few sentences not every comma; temperature 0.7/top_k 5/top_p 0.8; a short clause after a comma is often silently dropped - give key claims their own sentence; keep English terms few inside a Chinese voice; Whisper-small is too weak to judge, use medium/large-v3.

## Good / slide-like
- Slide-like: it is an animated chart deck - dark dashboard, cards, captions. Rigorous and clean, nothing to love. Exactly what our user rejects visually.
- Valuable as plumbing: the Chinese caption/TTS/QA rules and the Douyin-safe vertical layout numbers are directly reusable for our ZH cut.

## Borrow
- vertical.md safe-area numbers and caption rules; jieba break table; keyTerms ASR check per take; multi-seed TTS picking; J-cuts (next scene's voice leads its picture); fact-check the vertical cut's new headlines separately.
