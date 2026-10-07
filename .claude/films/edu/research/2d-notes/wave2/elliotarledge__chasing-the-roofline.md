# Elliot Arledge - "Chasing the Roofline" (CUDA music video)

- X post: https://x.com/elliotarledge/status/2104096029847277687 (2026-09-27; text: "claude opus 5.5 just one-shot a music video on how to optimize CUDA kernels"; syndication API: 2,400 likes, 174 replies; the task brief says 568k views; the repo's AGENTS.md logs "378k impressions, reposted by Bryce Lelbach and Elon Musk" at an earlier point).
- Source FOUND: https://github.com/Infatoshi/ai-video (Infatoshi = Elliot Arledge per GitHub profile; MIT code; created 2026-09-29; 0 stars at check) -> `projects/cuda-roofline/` (SPEC.md, DEVLOG.md, app/, song/, analysis/).
- YouTube: https://youtu.be/_TJoJYLsEcQ "Why your GPU code is slow: CUDA and the roofline, as a music video" (576 views on 2026-10-04).
- Video VIEWED: downloaded the 720p X file (190 s, 16:9, 60 fps), 63 frames at 1/3 s + 4 full frames: frames2/elliotarledge-cuda/.

## Provenance (quotes)
- Repo README: "Made with Claude Code (Claude Opus 5.5); Studio and TikTok clicks by Codex." / "Coding agents (Claude Code, with Codex for the few clicks no API offers) write the lyrics, generate and score the song, record the data, align every sung word, build the scenes, render the video".
- Single commit 06aaa17 (2026-09-28) ends `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Not literally one-shot: DEVLOG shows v1 (on the P(doom) song) -> v2 (own song) -> v4 "beginner cut" -> v5 "3D world", each after Elliot's review, all on 2026-09-26 (4:36 pm ask -> 10:47 pm final).
- Song: ACE-Step 1.5 XL (open model) on an RTX 3090; lyrics by the agent; renderer forked from mexicat/pdoom-video (MIT).

## What I see
- Dark charcoal world, one accent colour (signal orange), a 3D GPU board/die model (H100 SXM5 + DGX node modelled for v5) that the camera flies over constantly with motion blur. Bold grotesk karaoke lyric at top or bottom, word-by-word orange highlight; tiny IBM Plex Mono labels with chapter citations ("shared memory · near · ~30 cycles · CH06").
- Concepts carried as objects on the board: numbers as keycap-like tiles each with its own thread spark ("one thread for every number you've got"); `i = block x size + thread` built as an equation under three blocks of tiles with the worked example `i = 2 x 4 + 1 = 9`; a warp as 32 lit bars, divergence as the bars turning green/half waiting; HBM as a far stack; a 4x4 tile glowing in shared memory with 16 reuse rays ("Sync the block and reuse it here", counter "reads from the tile 4"); a 16x16 tensor-core cube; flash attention as an NxN wall of heat-map tiles "268 MB NEVER STORED"; int4 as bit strings; 8 GPUs as braided light fibres.
- The recurring device: the roofline chart as a physical ramp + ceiling standing on the board, "your kernel" as a glowing ball that climbs; the chorus returns to it each time with the readout ACHIEVED / PEAK 0.01 -> 0.26 -> 0.70 -> 0.78 (real numbers from the book's CH6 GEMM ladder on a 3090). That callback is the spine of the piece.
- Transitions: whips, glitch/datamosh, streaks, an iris; 9 transition kinds keyed per cut (v5). End card in a serif "CUDA for Deep Learning / ELLIOT ARLEDGE" (the book promo).

## Narration / pacing
- No VO: the lesson is the sung lyric (synth-pop, 133 BPM, AABB couplets, jargon only mid-line). Lyrics on screen as karaoke. Measured by the author: 103 sung words/min, a cut every 0.87 s (218 cuts in 190 s).
- Song pipeline: 16-36 takes per lyric version, ranked by Whisper word recall after Demucs vocal separation, a rhythm scorer (rhymes on the grid), Audiobox aesthetics; then CTC forced alignment gives every sung word a time; scenes are pure functions of song time, cut on the beat grid.

## Good / slide-like
- Good: real numbers with chapter citations; one recurring metric that climbs; every lyric line has a physical metaphor on one consistent world; camera never stops; deterministic render with adaptive motion blur (up to 108 sub-frames) gives a filmic finish.
- Weak for us: it is a dark "tech keynote" 3D look (orange-on-black, glow, HUD labels) - generic-premium, exactly the 3D-heavy register our 2D-first rule moved away from; tiny mono labels are unreadable on a phone; 0.87 s cuts are too fast to learn from (the author's own viewers said so, see ml-slowly note). No characters, no comedy beyond pun lyrics.

## Borrow
- The *one number that climbs* across the episode (ACHIEVED/PEAK) as the spine, returned to at each chorus/section.
- The production method: SPEC with a per-line plate table -> parallel scene authors (one file each) -> lead reviews contact sheets and fixes the engine centrally -> cut QA sheets with both neighbours loaded -> gate tool measuring activity per second.
- Footnote-style source labels on every number ("CH06 table 6.4") - but at phone-readable size.
