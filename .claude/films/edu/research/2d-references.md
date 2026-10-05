# 2D animation made with Claude (Opus 5.5): what exists, what works, what to take

Sweep of 2026-10-04 after the user moved the explainer channel to 2D-first (pure-3D three.js films were judged weak; 3D
stays only as an accent or a render effect). 135 candidates were found (GitHub repo search, commit trailers, Hacker News,
Reddit, X through quotes, curated indexes); 16 repos were cloned, read, and their films looked at frame by frame (frames
were extracted from release videos or rendered locally with the repos' own renderers). Provenance below is verified from
README text and `Co-Authored-By: Claude Opus 5.5` commit trailers unless marked.

## The shared recipe (nearly every good one)
- Every frame is a **pure function of time** `fn(t)` in a browser page (p5.js + p5.brush, or plain Canvas2D, sometimes a
  WebGL pass), rendered by headless Chrome in parallel workers, encoded by ffmpeg. Randomness is hashed, never
  `Math.random`; line "boil" re-seeds on twos (12 fps) while the camera moves on ones.
- The model writes two documents before drawing: a **STORYBOARD** (time | line | shot | out-transition, palette arc,
  text-light rule) and an **ANIMATION_GUIDE** that briefs parallel **chapter subagents** (one file each, shared files
  frozen, report bugs to the lead).
- A **self-review loop**: the model renders contact sheets, frame strips around every key motion, and 1:1 crops of faces,
  opens them with the Read tool, and fixes before showing the human. Several repos add measured checks: still-frame
  detection, text safe-area and reading-time audits, flash limits, pixel-identical regression.
- Sound is the clock: beats and word times from forced alignment (Demucs + Whisper / CTC), cuts snapped to words.

## The strongest references (looked at, ranked for this channel)
| Repo | What | Look | Why it matters to us |
| --- | --- | --- | --- |
| tollens-ai/quality-education | 9:16 educational music-video series on software quality, a domain expert checks every claim | ep4: rubber-hose characters with painted brick-cellar backgrounds, bold boiling outlines, lyric band | The closest format to ours: vertical, episodic, educational, comedic, expert-checked. Its CLAUDE.md + VIDEO.md lesson ledger and "one place to look" rule |
| illodev/drawn-by-code | Code-drawn animation sandbox; physics-history is a science film with a recurring cat | risograph press (per-ink plates, halftone, misregistration), paper cutout with torn edges and real hands | A science explainer with a cat that works; `riso.js` and `paper.js`/`detail.js` engines; mandatory render-and-look loop with dated lessons |
| ledbetterljoshua/bohemian-tokenry-video | Comedy opera in five styles | paper theatre: felt puppets, stitched seams, cardstock sets, gel lights, real depth of field by plane | "2D core, 3D as render effect" done right: flat cut planes through a perspective camera with DOF. The art-direction bake-off (5 subagents, same two moments) |
| ledbetterljoshua/functional-emotions-video | Music video about Anthropic's emotion-concepts paper | 60k GPU brushstrokes repaint a flat 2D underpainting; whip smears | GPU used only as a paint pass over 2D (`js/paint.js`, 171 lines); director + 7 chapter subagents |
| neelnanda-io/dont-go-quiet-on-me | Song + video on the history of mech interp (real figures reproduced as data) | researcher's field notebook, a growing shoggoth motif, real figure plates | Closest subject (ML research). Its skills for research videos and explainer videos; `--textcheck`; "one image carries the idea; one motif with one parameter" |
| lemomo-ai/lemo-opuscar | 43 film styles as skills + a feature of 98 films | crayon book, rubber hose, sci-fi toon, ink wash, whiteboard, halftone dossier (Chinese) | A style catalogue with a STYLE.md template and a DIRECTOR.md of craft rules; whiteboard engine (stroke-order writing); provenance from README only |
| JohnHeibel/PDoomVideo + ClaudeAnimationBase | The reference music video and its MIT starter kit | watercolour picture book, Clawd rig with 31 acted emotions | The method everyone copies (guide, storyboard, contact sheets, `emotions()` acting API). PDoomVideo has no licence: do not copy its code |
| bishpls/animation-pipeline | Films incl. WORDS ARE FOSSILS (9:16 narrated etymology explainer) | riso cut-paper title design; letterpress strata | Narrated 9:16 explainer cued to word timestamps; CRAFT.md's measured rules (holds after punchlines, vertical safe area, 74 px captions read on a phone, 60 px did not). No licence |
| mexicat/pdoom-video | The most-starred remake (2.3k) | typographic motion design + 3D drawn as engraved hairlines; deadpan bureaucratic props | 3D as engraving inside a print look; a TREATMENT with a "not slop" list and numbered revision notes; a filmic post chain |
| francozanardi/papermotion | Cut-paper engine with physics (gaits, strands, soft bodies) | clean cut paper, aerial-perspective parallax | Secondary motion by simulation; "one character = one piece of paper" |

## What to avoid (seen in the sweep)
- satyajitghana/ai `explainer-films`: LLM-paper explainers (MoE, KV-cache compression) as diagram boxes with a mascot
  holding a pointer - a slideshow with a character. Same topics as ours, the wrong form.
- kinetic "work reel" looks (headline + HUD + particle 3D): the animated web page / dashboard the user rejects.
- Characters built from code primitives (stiff capsule mannequins, block mascots with dot eyes): every repo that tried
  hard on characters switched to painted art cut out as paper, or a dedicated rig with acting.

## What the channel should adopt
1. **Process**: STORYBOARD + episode guide before drawing; pure `fn(t)`; boil on twos; contact sheet / strip / crop
   review with a checklist before anything reaches the user; a lesson ledger with the user's verbatim notes.
2. **Look**: decide by a bake-off, not by argument - 3-4 short samples of the same pilot moment in candidate 2D looks,
   shown moving. Candidates that fit an LLM-systems explainer with a recurring white cat: paper theatre / cut paper with
   depth (keeps our desk-miniature idea, in 2D), risograph print, a sitcom / rubber-hose toon with painted backgrounds,
   and a painted repaint pass over flat 2D.
3. **3D only as treatment**: depth-of-field and parallax for flat planes, engraved/hatched 3D props inside a print look,
   a GPU paint or print pass. Our `accum.js` lens and the instanced towers can survive in that role.
4. **Explainer-specific**: real data drawn as plates with provenance; a checked text layer (safe areas, reading time,
   caption size for phones); VO word timing drives cuts.
5. **Licences**: ClaudeAnimationBase, functional-emotions, bohemian-tokenry, drawn-by-code (code), papermotion,
   mexicat/pdoom-video, lemo-opuscar, quality-education (code) are MIT; PDoomVideo and animation-pipeline declare none
   (read, don't copy). Clawd is Anthropic's character; our host is the lab's own cat.

## Second wave: explainers, Chinese knowledge videos, vertical formats (notes in `2d-notes/wave2/`)
- **What travels** (index data, athemeroy/awesome-claude-5-5-videos: 158 Claude-made education posts, views re-fetched
  2026-10-04): median views by style - math diagram 8.8k, hand-drawn sketch 8.7k, 3D render 2.7k, motion-graphics UI
  1.4k (the most common look and the weakest), flat vector 1.1k. 35-70 s posts have the best median (3.9k). Two big
  outliers (an interactive 3D app capture, a cartoon cosmos short) dominate the totals, so the medians are the signal.
- **LLM-systems explainers already out there**: Elliot Arledge's CUDA "Chasing the Roofline" (568k, 3D keynote look,
  sung) and "Next Token" (riso print, real Llama 3.1 8B data, with a native 9:16 Short) - his own audience found both
  too fast to learn from, so his unreleased "ML, slowly" course enforces a slower pace with a gate script; dotey's
  12-min Chinese "什么是 Transformer" (187k; Remotion + EdgeTTS, dark slides with token chips: popular but slide-like);
  DotCSV's pixel-art neural-net training (574k); addyosmani's 40 s "how browsers work" (216k).
- **Chinese / Douyin**: akokoi1's one-prompt line-art explainers (中华五千年 162k, 大气环流 147k) and a 9:16 dou-gong
  explainer posted to Douyin (27.7k on X); dylantlwu/opus-animation-course is a Chinese course with vertical rules
  (safe area top 150 / bottom 170 / sides 60 px, body text >= 40 px, "竖屏用户划走更快：第 1 秒就要有运动").
- **Media engines worth trying for the 2D look**: alesha-pro hand-drawn-canvas-animation (doodles drawn over real photo
  objects - fits our "real assets" rule), sevenevesai/riso-windowseat (riso films), cyborggirl963's 18 hand-made-media
  engines (backlit paper cut, embroidery, linocut...), masahirochaen's cut-paper physics explainer (59k).
- **Vertical rules learned by others** (`wave2/_synthesis-vertical-and-one-take.md`): compose for the height, never
  crop; the must-read box is the intersection of the platforms' safe areas, enforced on the rendered frame by a gate;
  subject on the centre line filling 60-90 % of the width; frame 0 is a finished picture with the hook already up;
  review a whole-film contact sheet at 0.25 scale ("if it fails to read at that size, fix the composition").
- **Verbatim prompts** that produced the best explainers are collected in `wave2/index__claude-video-indexes-explainers.md`.
