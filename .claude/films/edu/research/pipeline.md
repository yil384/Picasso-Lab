# edu-kit: production pipeline for vertical explainer episodes with voice-over

Research report, 2026-10-04. Scope: the main-line explainer episodes (LLM / systems / quantum, from CSE 291 "LLM System
Optimization") rendered as code (three.js + q5/p5 + Canvas2D), frame by frame, 1080x1920, with recorded voice-over,
EN and ZH caption variants, music and SFX. The iPhone vlog side line reuses the back half (captions, mix, encode) and
is covered briefly in section 13.

Everything below was read or measured read-only on this Mac. Nothing in the repo or in any worktree was changed.
Statements I could not verify are marked **(unverified)**.

---

## 0. Conclusions first

1. **Keep the existing engine and add a timeline driven by the VO.** The pv runtime (video-kit `pipeline/runtime/pv.js`
   plus render.py/pvlib.py) already gives us pure frame functions, parallel resumable Playwright rendering, lossless
   segments and purity checks, and the X launch film proved it at scale (2000+ frames, painted sprites, studio look).
   What it lacks for explainers is a timeline keyed to the voice (it assumes a loop: `t = (i mod N)/N`), audio of any
   kind, a transparent overlay pass, CJK fonts and portrait defaults. edu-kit is a fork of pv (about 525 lines) plus
   a timeline layer, a captions layer, an audio stage and a primitive library. It is not a new engine.
2. **Render the picture once, then render captions and localized text separately per language.** Picture pass: 3D
   plus language-neutral 2D. Overlay pass: a transparent RGBA canvas with captions and the few localized labels.
   ffmpeg composites the two in RGB. I tested this compositing path here: straight-alpha PNG overlay, then
   `overlay=format=gbrp`, then bt709 yuv420p, with AAC LC from `aac_at`. A caption-only overlay frame is about 34 KB,
   so overlays cost almost no disk. A typo or translation fix then re-renders only the cheap overlay and never the 3D.
3. **Captions are drawn by the browser, not by ASS.** The browser uses the same fonts, renderer and animation system
   as the picture and can be anchored to 3D points and to word timings. ASS is kept for draft animatics and
   emergency fixes only. The `ffmpeg` on PATH (Homebrew 8.1.1) has **no libass, freetype or drawtext**. A keg-only
   **ffmpeg-full 8.1.1 is installed** at `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`. It has libass 0.17.4 (with
   libunibreak), harfbuzz, fontconfig, zimg (zscale), rubberband and libvpx, and its ASS burn-in of Chinese text
   worked in a test here.
4. **Forced alignment works offline today, so build the timeline from it.** `/usr/bin/python3` (3.9.6) has torch
   2.8, torchaudio 2.8, openai-whisper and librosa. A wav2vec2 English CTC model is already cached. CTC forced
   alignment of a known script ran in about 8 s on an 11 s sample. Its word boundaries are much tighter than
   Whisper's word timestamps at pauses: on the sample, "what" came out as 5.41-5.57 s from CTC and 4.30-5.56 s from
   Whisper, which smeared the pause into the word. Pauses carry the comedy timing, so the timeline uses CTC timings,
   and Whisper is used only to diff what was said against the script.
5. **Disk is the binding constraint, not the GPU.** I measured a portrait 1080x1920 frame of the grainy NPR demo on
   the M2 with Metal at **0.10-0.14 s/frame** per browser. About 80 ms of that is PNG encoding; the draw itself is
   under 10 ms of CPU time. The same frames take **3.66 MB/frame as lossless x264rgb**, which is about 20 GB for a
   3-minute episode, and this disk has **17 GB free (92% used)**. ProRes 422 HQ takes 0.96 MB/frame and x264 yuv444p
   CRF 8 takes 0.61 MB/frame. Use a near-lossless mezzanine for the picture and keep per-frame animated grain out of
   the render. Platforms re-encode it to mush anyway.
6. **Final renders run on the Mac (Metal) through render.py. Cloud sessions only author and snap at 540x960.**
   SwiftShader is about 10x to 30x slower (0.9-1.2 s/frame for the demo, 3-8 s/frame for the launch film). This
   session runs on the Mac itself, so the WebCodecs kit (`render.html`) becomes a fallback rather than the main path.
7. **Taste risk outweighs technical risk.** The user has rejected slideshow, "HTML味" and "AI味" work at every stage
   (VERSIONS.md v1-v6). The launch film only moved forward after **style frames were approved first** (v7: "可以可以，就要这个质感").
   So the build plan front-loads vertical style frames and a primitive gallery before any episode. Every primitive
   is a physical object in the approved studio look, never a UI panel or chart.
8. **Platform facts need a probe upload before production.** X's official API docs set a 1:3 to 3:1 aspect ratio,
   at most 60 fps, H.264 High, yuv420p, AAC LC and no open GOP. Third-party guides also cite a 1200x1900 portrait
   maximum for app uploads and a 2:20 limit for non-Premium accounts. Douyin safe zones and loudness handling are
   unverified. Step 0 of the plan is a 20 s calibration video uploaded to both platforms.

---

## 1. What exists (read-only survey)

### 1.1 video-kit pv pipeline (`~/claude-work/picasso/papers/kvflow/video-kit/pipeline`, branch `video-kit`)

| part | what it does | notes for edu-kit |
|---|---|---|
| `runtime/pv.js` (525 lines) | `defineScene({meta, setup, update, layers, post})`; layer types `2d` / `three` / `brush` (shared p5 WEBGL + p5.brush); per-layer cache keys; seeded `rng / boilRng / frameRng`; `Math.random` re-seeded per frame and layer; fonts must load or the scene errors; `window.renderFrame(i)`, `__pv.capture(i,url,'png'|'rgba')`; a scrub/play preview UI when not `?render=1` | Time is a **loop phase** `t = (i mod N)/N`. The final canvas is `alpha:false`. 2D layers are letterboxed in design units, but three layers fill W x H (seen in the portrait test: the 3D filled the frame and the 2D labels did not). There is no audio, and `?profile=1` is documented but not implemented. |
| `render.py` | up to 3 Playwright Chromium workers (Metal on macOS, SwiftShader on Linux), a dynamic frame queue, an atomic PNG POST to a local server, background compaction into lossless `libx264rgb -qp 0` 30-frame segments (bit-checked), resume, `--verify K` and `--check-loop` purity checks, and a manifest `render.json` that refuses to mix scene, size or backend changes | Keep it. Gaps: (a) the scene hash in `pvlib.scene_dependencies` only follows `'./x.js'` refs inside the scene file, so absolute `/scene/...` imports (which film10 uses everywhere) are **not hashed** and stale frames could be resumed; (b) there is no per-frame timeout, only a 10-minute no-progress watchdog; (c) workers are capped at 3. |
| `encode.py` | master, card loop with a CRF search, poster, contact sheet and preview; functions return `(value, err)` | `load_job` only reads **PNG** frames, although the README says it encodes from segments. xlaunch's `scene/finish.py` handles segments. The card and loop presets are not needed for edu. |
| `snap.py`, `serve.py` | a few frames to PNG with per-layer ms timings; an interactive scrubber | Reuse both. |
| `runtime/npr/*` | NPR stack (cel ramp, hull and Sobel ink, halftone, watercolour, painterly DoF, comic FX, impact frames); camera rigs (orbit, dolly, crane, whip, shake, handheld); p5.brush bridge (`bakeBrushTexture`, `track`, `callout`, `leader`, `burst`, `letter`, `sfx`) | This is the comic look of the project cards. `letter / sfx / burst` are the comic SFX lettering primitives. Its gotcha: low-resolution previews drop p5.brush strokes, because the bounds test ignores the scale. |
| vendor | p5 2.3.4, p5.brush 2.2.3 with a determinism patch (dFdx after an early return), three r186 with addons; fonts Fraunces, Instrument Serif, Inter, Caveat, Permanent Marker, JetBrains Mono (Latin only) | **No CJK font anywhere.** q5 4.8 is vendored only in `anime/tiga/vendor/q5.min.js`. |

### 1.2 X launch film (`.claude/films/xlaunch`, the approved look)

- `scene/film10.html` (147 KB) is one pv scene with two layers: `'3d'` (an EffectComposer studio) and `'type'` (Canvas2D).
  It uses shot tables (`S10`), frame remaps to reuse v8 shots (`REMAP`, `oldF`), arc-length camera splines
  (`camPath`, which replaced `camRig` because the latter stopped at every key) and `window.__camDump(a,b)`, which
  checks cameras numerically without rendering.
- `studio.js`: the v7 "approved texture" studio. It has RectAreaLights, a Reflector floor, a cyclorama,
  fibre-bumped paper, PMREM room environment, Bokeh, UnrealBloom, a motion-blur ShaderPass and a grade with grain.
- `sprite.js`: painted Codex characters as billboards. They are relit from a depth-relief map (Depth Anything V2
  via `tools/depth.py`), cast real shadows and are reflected by the floor.
- `type.js`: `txt` (rising-mask reveal), `leader` (a line from a 3D anchor to a label), `odometer` (rolling
  digits), the v10 "warm nerds" voice (`serif`, `hand` red pen in Caveat, `ink` real ink marks, `sticky` notes).
  **Hard-coded `W = 1080, H = 1350, M = 72`**, so it needs parameters for 1920 height.
- `lib.js`: easings, `spring`, `win`, `MotionBlurShader`, `GradeShader` (vignette, grain from the frame index,
  flash, fade).
- `kit/`: the local renderer for the user. `get.sh` (curl one-liner) pulls a manifest of about 840 files (about
  130 MB) into `~/PicassoFilmKit`. `start.command` serves it, and `render.html` drives the scene's
  `renderFrame(i)` in an iframe and encodes with WebCodecs H.264 (16 Mbps) plus a silent AAC track, muxed by
  `mp4-muxer@5.1.3`. **mp4-muxer is deprecated in favour of Mediabunny.** `build_kit.py` syncs from a `~/vk`
  worktree; its default `--vk` is `/home/user/vk`, a cloud path.
- Lessons recorded in the skill (`picasso-x-launch-film`): frame 0 is the thumbnail; check every layout at the
  shot's own camera; story logic must be physical; on-screen text must not read like a false claim; only verbatim
  quotes for real people; Codex paints the art that code draws badly; hard-surface objects are better as real 3D;
  the user judges from screenshots and contact sheets.
- Audio: v1-v10 were silent, and the user laid music in CapCut ("67 s, with music" in `POST_v10.md`). **No audio
  pipeline exists.**

### 1.3 Skills

- `picasso-comic-demo-film`: the workflow that worked was storyboard, then build from references, iterate at
  960x540 and trust frames, check facts in code, run 4-lens reviews for at least 3 rounds, render finals on the Mac.
  Series rules: never a UI panel, chart, centred letter-spaced title, generic glow or glossy default three.js.
- `picasso-x-launch-film`: the resume protocol (`tools/restore_workdir.sh` rebuilds `~/vk` plus the film dir from
  the repo copy). The friction is that the working dir is not in git and has to be synced back with
  `build_kit.py`. edu-kit should avoid this by living and running in place (section 4.2).

---

## 2. This Mac (measured 2026-10-04)

| item | state |
|---|---|
| hardware | Apple M2, 8 cores, 16 GB RAM, macOS 15.5. **Disk: 228 GB, 17 GB free (92%)**. Load average was 4.5-8 during my tests (other agents' Chromium processes; the PIPELINE-REPORT shows that 3 workers slow down above load 16). |
| node | v25.2.1 (full ICU, `Intl.Segmenter` present); global npm packages `@openai/codex` 0.156.1 (art generation is possible locally), pnpm |
| Playwright | Python Playwright 1.58.0 in `/usr/bin/python3`; browsers `chromium-1208`, `chromium-1243` and headless shells in `~/Library/Caches/ms-playwright`. Google Chrome 154 in /Applications. |
| python | **`/usr/bin/python3` 3.9.6 has everything**: PIL 10.2, numpy 1.26, PyMuPDF (fitz) 1.26.5, playwright, torch 2.8, torchaudio 2.8, openai-whisper 20240930, librosa 0.11, soundfile, scipy, cv2 4.13, fontTools 4.60, transformers 4.57. Homebrew python 3.14 has none of them. Missing: pyloudnorm, pydub, jieba, pypinyin, opencc, brotli (fontTools needs it to write woff2), demucs. |
| ffmpeg on PATH | Homebrew 8.1.1, the slim build: libx264, libx265, libsvtav1, libvpx, libopus, videotoolbox, audiotoolbox. Filters loudnorm, ebur128, sidechaincompress, acompressor, deesser, afftdn, arnndn, speechnorm, overlay, premultiply, colorspace, tonemap. Encoders prores_ks (yuva444p10le), qtrle (argb), hevc_videotoolbox (`alpha_quality`), aac_at, mov_text, srt, ass. **No libass, freetype, drawtext, zscale or rubberband.** |
| ffmpeg-full | **Installed, keg-only**: `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` 8.1.1 with libass 0.17.4 (CoreText font provider, libunibreak), freetype, harfbuzz, fontconfig, zimg, rubberband, soxr, libplacebo, libvpx, tesseract and `--enable-whisper`. Brew says 9.0.2 is available. |
| whisper | `whisper-cli` (whisper-cpp 1.8.4, Metal) is installed, but only the test model `for-tests-ggml-tiny.bin` exists, so there is no usable ggml model. `~/.cache/whisper/small.en.pt` (English only) works with openai-whisper: 11 s of audio transcribed in 4.7 s on CPU with word timestamps. |
| aligner | torchaudio `forced_align` and `merge_tokens` work. The cached `wav2vec2_fairseq_base_ls960.pth` (English CTC) aligned a known script offline in about 8 s including model load. `MMS_FA` (multilingual, uroman romanization) is not cached and has to be downloaded. The 2.8 docs say these APIs are "deprecated in 2.8 and will be removed in 2.9"; a later notice says forced_align was kept. Pin torchaudio 2.8. |
| other caches | `~/.cache/torch/hub/checkpoints/955717e8-8726e21a.th` looks like the Demucs htdemucs checkpoint **(unverified)**, which would be useful for vlog audio cleanup if demucs were installed. briaai RMBG-2.0 (background removal) is in the HF cache. |
| TTS for scratch VO | macOS `say` voices "Flo/Eddy (English (US))" and "Flo/Eddy (Chinese (China mainland))" work offline. My test lines rendered to 5.1 s (EN) and 4.5 s (ZH); the EN line measured -19 LUFS. |
| CJK fonts | Only Apple system fonts (Heiti, Songti, Hiragino Sans GB, PingFang via assets). **No OFL CJK font is installed or vendored.** |

### 2.1 Measurements I took (portrait, Metal)

```
snap.py scenes/npr_demo.html --width 1080 --height 1920   (gl = ANGLE Metal Renderer: Apple M2, load avg ~8)
f00020 0.10-0.12 s  {npr 5-7 ms, ink 2 ms, letters 0.3-0.7 ms, encode 81-97 ms, upload 11-18 ms}
f00071 0.10-0.11 s  {npr 4-5.5 ms, ... encode 84-85 ms}
12 consecutive frames f30-f41: 0.11-0.14 s each (1 browser)
```
Storage for the same 12 consecutive frames at 1080x1920 (grainy NPR look, grain changes every frame):

| intermediate | MB / frame | 150 s episode (4500 f) | 180 s (5400 f) |
|---|---|---|---|
| PNG (what render.py writes before compaction) | 4.8 | 21.6 GB | 25.9 GB |
| `libx264rgb -qp 0` (pv default segments, bit-exact) | 3.66 | 16.5 GB | 19.8 GB |
| ProRes 422 HQ (`prores_ks -profile:v 3`) | 0.96 | 4.3 GB | 5.2 GB |
| `libx264 -crf 8 yuv444p` (visually lossless) | 0.61 | 2.7 GB | 3.3 GB |

The demo scene in PIPELINE-REPORT measured 0.67 MB/frame lossless at 1080p because its paper grain was static.
**Per-frame grain is what makes the lossless mezzanine explode.**

---

## 3. Platform constraints

| | X (EN version) | Douyin (ZH-subtitled version) |
|---|---|---|
| container / codec | MP4 or MOV, H.264 **High**, AAC **LC**, yuv420p only, progressive, **no open GOP**, at most 60 fps, aspect 1:3 to 3:1 (official X API media best-practices page) | MP4 with H.264, 1080x1920 at 30 or 60 fps per third-party guides; suggested upload bitrates of 8-16 Mbps differ from guide to guide **(unverified)** |
| resolution | The API page lists 1280x720 / 720x1280 as *recommended* and dimensions "between 32x32 and 1280x1024" for **API** uploads. Third-party guides cite 1920x1200 / **1200x1900 max** for app uploads and recommend 1080x1920 **(unverified, and contradictory)**. The 1080x1350 launch film was posted from the app, so app uploads clearly exceed the API limit. | 1080x1920 is the de facto standard **(unverified as an official spec)** |
| duration | 2:20 for standard accounts per third-party guides; the API page says 20 min default for Post video **(unverified which applies to @PicassoLabUCSD)** | not checked |
| captions | X accepts a sidecar **.srt** on web uploads ("Upload caption file (.srt)", help.x.com) | burned-in is the norm; sidecar upload **(unverified)** |
| UI overlays | X's portrait viewer also overlays buttons and text **(unverified pixel sizes)** | The TikTok template values I found are 130 px top, **484 px bottom**, 44 px left and **140 px right** on 1080x1920, a safe area of 896x1306. Douyin's UI is similar **(unverified)**. |
| loudness | no published normalization **(unverified)** | A Zhihu answer mentions a one-click -23 LUFS "match loudness" in 剪映 **(unverified)**. Target -14 LUFS integrated, -1 dBTP (section 7.5). |

Feed crop: whether X's timeline crops a 9:16 video to a shorter preview is **unverified**. Mitigation: keep the
hook (the first 3 s) and the poster frame inside the central 4:5 band (y 285-1635), the same framing the launch film
used.

---

## 4. Architecture

### 4.1 Principles
1. **One picture, many deliveries.** A language-neutral picture pass, plus per-language overlays and audio mixes,
   composited at encode time.
2. **Time is authored against the voice, never in absolute frames.** Modules ask for "the frame where the VO says
   *half*", "0.4 s after that" or "the rest of the beat". When the VO is re-recorded, the picture re-times itself.
3. **Every frame and every audio sample is a pure function of (episode files, frame index or sample index).** At 30
   fps and 48 kHz, one frame is exactly 1600 samples, so picture and audio share an integer clock. Use 30 fps, not
   29.97.
4. **The picture is physical, not a UI.** Primitives are lit objects in the approved studio (v7 look) or desk (v10
   look), with real textures (ambientCG), painted sprites and real ink marks. Charts become stacks of objects
   (as the launch film's year chart was made of papers).
5. **Iterate cheaply.** Use a scratch VO from `say` and placeholder beats from day 1 (an animatic), draft-quality
   real-time preview with audio, and contact sheets per beat at phone size.
6. **It lives in the repo and runs in place.** No out-of-git working copy to restore and sync back. Large media and
   outputs stay outside git and are referenced by sha256.
7. **Python follows the user's convention**: every helper returns `(value, None)` or `(None, "error")`, as pvlib and
   encode.py already do. Target `/usr/bin/python3` 3.9: no `match` statements and no `X | Y` type hints.

### 4.2 File layout

```
.claude/films/edu/                      # in main (film sources live in .claude/films per CLAUDE.md)
  README.md                             # resume brief: taste quotes, state, commands (read first)
  SERIES.md                             # style bible: look, voice, comedy rules, layout grid, safe zones, fonts
  kit/
    edu                                 # CLI entry (#!/usr/bin/python3), subcommands in section 11
    runtime/
      pv.js                             # fork of pv.js "pv 1.1": passes, alpha, lang, non-loop time, q5 layer
      timeline.js                       # beats.json -> per-frame beat context B (section 5)
      stage.js                          # studio/desk/paper stages (from xlaunch studio.js), quality tiers
      captions.js                       # caption layout + styles (EN/ZH), karaoke, SRT dump
      linebreak.js                      # EN/ZH line breaking, kinsoku, autospace, glossary
      type.js                           # xlaunch type.js, W/H/M parametrised (txt, serif, hand, sticky, leader, odometer)
      lib.js                            # easings, camPath (arc-length), win, spring, shaders (from xlaunch lib.js)
      sprite.js                         # painted characters (from xlaunch)
      prims/                            # explainer primitives (section 6), one file each
      fx/                               # comic SFX lettering, speed lines, impact, dot wipes (npr brush.js + film10 2D fx)
    py/
      pvlib.py render.py snap.py serve.py   # from video-kit, patched (section 9.4)
      script.py   align.py   beats.py   mix.py   encode.py   fonts.py   slides.py   sheet.py   doctor.py
    vendor -> served from ../xlaunch/kit/assets/pv/vendor (three r186, p5, p5.brush.pv) + q5 4.8 added
    fonts/                              # Latin woff2 (copied) + CJK masters (OFL, see 7.3) + per-episode subsets
    sfx/                                # licensed SFX library, LICENSES.md, loudness-normalised
    gallery.html                        # every primitive alone, at phone size, on each stage (taste review)
    preview.html                        # authoring preview with audio (section 10)
  episodes/
    e01-paged-kv/
      episode.json                      # meta, sources, media sha256, deliveries
      script.md                         # authored: beats, EN VO text, anchors, SFX, ZH captions
      words.en.json                     # generated: forced alignment (committed)
      beats.json                        # generated: resolved timeline (committed)
      cues.json                         # generated: audio events from scene modules (committed)
      scene.html                        # defineEpisode(...) - imports modules
      modules/*.js                      # episode-specific beat modules
      art/                              # keyed sprites + depth maps (small); prompts in PROMPTS.md
      ref/                              # slide crops from the lecture PDF (slides.py), for fidelity checks
      STORYBOARD.md  REVIEW.md  STATE.md
social/edu/versions/                    # every published cut + feedback + lesson (as social/x/versions)
~/PicassoEdu/                           # outside git
  media/e01/  vo_en_raw.m4a  vo_en.wav  vo_zh.wav?  music/*.wav
  out/e01/    picture/segments  overlay_en/  overlay_zh/  audio/  final/  sheets/
```

Vendor reuse: `.claude/films/xlaunch/kit/assets/pv` (19 MB) is already in main. edu-kit's server maps `/pv/vendor`
to it instead of committing a second copy. A shared `.claude/films/_pv/` would be cleaner later, but it touches the
launch film, so leave that for a separate change.

### 4.3 Data flow

```
 lecture PDF ──slides.py──> ref/*.png  (facts + figures to rebuild, never shown as-is)
      │
 script.md ──script.py──> script.json ─┬─> `say` scratch VO ─┐
 (beats, EN text, [[anchors]],         │                     ├─> vo_en.wav ──align.py──> words.en.json
  {sfx}, (pause), ZH captions)         │   real VO (m4a) ────┘   (CTC on script text; Whisper diff report)
                                       │
                                       └──────────────beats.py────> beats.json  (frames, anchors, cues EN/ZH)
                                                                         │
 scene.html + modules ── edu cues (dry run, no drawing) ──> cues.json ───┤
        │                                                                │
        ├─ render --pass picture (Metal) ─> picture mezzanine ───────────┤
        ├─ render --pass overlay --lang en ─> overlay_en/*.png (RGBA) ───┤
        └─ render --pass overlay --lang zh ─> overlay_zh/*.png (RGBA) ───┤
                                                                         │
 music + sfx library ──mix.py (duck by VO spans, cues, loudnorm)──> mix_en.wav, stems ──┤
                                                                         ▼
                        encode.py ─> e01_x_en.mp4, e01_douyin_zh.mp4, e01_nomusic_zh.mp4,
                                     e01_en.srt, e01_zh.srt, poster.jpg, sheets/*.jpg
```

---

## 5. Timeline driven by the VO

### 5.1 `script.md`: the one authored source

```markdown
---
id: e01-paged-kv
fps: 30
voice: en
source: CSE 291 L13 "LLM Serving - Scheduling, KV Management, and Kernel Optimization", slides 20-25
---

::: beat b01 hook | scene=lot.hook | in=cut
EN: Your GPU says it is out of memory. [[half]]Half of it is empty.
ZH: 显卡说显存满了。可其中[[half]]一半，是空的。
SFX: @half record_scratch -6
MUSIC: @half cut
:::

::: beat b02 why | scene=lot.reserve | in=whip 8
EN: The server does not know how long your answer will be, (pause 0.4) so it [[reserve]]reserves the maximum.
ZH: 服务器不知道你的回答会有多长，|所以它直接[[reserve]]按最长的占座。
:::

::: beat b03 fact | scene=lot.waste | in=match
EN: In the vLLM paper's measurements, [[fifty]]more than half of the allocated KV cache memory was wasted.
ZH: vLLM 论文测得：分配出去的 KV 缓存显存，[[fifty]]一半以上被浪费了。
SRC: L13 p.22 (Kwon et al., SOSP 2023)
:::
```

- `[[name]]` is an anchor placed before a word, resolved to that word's onset. In ZH text, the same anchor marks
  which characters get emphasis when the EN anchor fires.
- `(pause 0.4)` is a scripted beat of silence. It tells the reader to pause and gives the aligner a gap; the actual
  length comes from the recording.
- `|` in ZH is a preferred line break; `~` glues two tokens together (section 7.4).
- `SRC:` is required for any number. These numbers are verbatim from L13 (p.20-22: reservation waste, internal and
  external fragmentation, "More than 50% of allocated KV cache memory are wasted"; p.24: blocks "e.g. 16
  tokens/block"). The example above is only a format illustration, not a proposed script.

### 5.2 Alignment (`edu align`)

1. Convert the VO to 48 kHz mono float WAV (with a light cleanup chain, section 8.1).
2. Whisper (`small.en` for EN, which is cached) transcribes it, and the transcript is diffed against the script.
   The diff report lists ad-libs, skipped words and retakes so the script (and the captions) match what was
   actually said.
3. CTC forced alignment runs on the **script text**: torchaudio `forced_align` with the cached
   `WAV2VEC2_ASR_BASE_960H` for EN. Numbers and symbols are normalised to spoken words first ("50%" becomes
   "fifty percent", "vLLM" becomes "v l l m"); the original tokens are kept for captions. For a ZH VO, use
   `MMS_FA` with uroman romanization (the torchaudio 2.8 tutorial demonstrates Chinese this way) or a multilingual
   Whisper model. Both need downloads.
4. Output `words.en.json`:
```json
{"audio": {"file": "vo_en.wav", "sha256": "…", "sr": 48000, "dur": 141.37},
 "model": "WAV2VEC2_ASR_BASE_960H", "words": [
   {"w": "Your", "s": 0.512, "e": 0.698, "score": 0.93, "beat": "b01", "idx": 0},
   {"w": "Half", "s": 2.271, "e": 2.505, "score": 0.88, "beat": "b01", "idx": 7, "anchor": "half"}]}
```
Low-score words (below 0.5) are flagged in the report. Fall back to Whisper timings for those words, or re-record.

### 5.3 `beats.json` (generated, committed; the contract between audio and picture)

```json
{
 "episode": "e01-paged-kv", "fps": 30, "sr": 48000, "frames": 4260,
 "voice": {"lang": "en", "sha256": "…", "offset_f": 15},
 "chapters": [{"id": "c1", "title": {"en": "The empty full GPU", "zh": "满了，又没满"}, "start": 0}],
 "beats": [
  {"id": "b01", "kind": "hook", "scene": "lot.hook", "params": {},
   "start": 0, "end": 98, "vo": [15, 94], "in": {"type": "cut", "frames": 0},
   "anchors": {"half": 83},
   "words": [[15, 21, "Your"], [83, 90, "Half"]],
   "cues": [{"id": "b01.1", "f": [15, 60], "en": "Your GPU says it is out of memory.", "zh": "显卡说显存满了。"},
            {"id": "b01.2", "f": [60, 98], "en": "Half of it is empty.", "zh": "可其中一半，是空的。", "em": {"en": "Half", "zh": "一半"}}],
   "sfx": [{"f": 83, "id": "record_scratch", "gain": -6}],
   "music": [{"f": 83, "op": "cut"}]}
 ]}
```
Rules in `beats.py`:
- Seconds are converted to frames once, here: `f = round(s * fps)`. Beat ranges are half-open `[start, end)`.
- A beat starts `lead` frames before its first word (default 3, so the cut lands just before the sound) or where
  the previous beat ends, whichever is later. The last beat gets a tail hold for the outro and end card.
- Caption cues are clause groups that respect reading speed. The default cue sizes for vertical video are smaller
  than the TV guides (section 7.4).
- `beats.json` stores the sha256 of `script.md`, `words.en.json` and the VO, and `edu status` flags anything stale.

### 5.4 The beat context `B` (what a module sees each frame)

```js
// runtime/timeline.js
const TL = timeline(beatsJson, { fps: 30 });
// per frame i:
const B = TL.at(i);
B.id, B.kind, B.params            // from beats.json
B.f, B.sec, B.dur, B.u            // local frame, local seconds, beat length (s), progress 0..1
B.at('half')                      // local frame of the anchor (Infinity if absent: fail loudly in dev)
B.after('half', 0.4, ease)        // 0..1 progress over 0.4 s after the anchor (0 before it)
B.win(a, b, fa, fb)               // envelope in local seconds
B.word(k)                         // [f0, f1, text] of the k-th word in the beat
B.speaking                        // true inside a word (for character "talk" poses, never lip-sync)
B.prev, B.next                    // neighbour beat contexts (for transitions and callbacks)
B.trans                           // {type, k} while inside an incoming transition, else null
B.lang                            // 'en' | 'zh' (overlay pass only; null in the picture pass)
B.chapter                         // {id, title, idx, k}
```
Modules must not read absolute frames. They read `B.*` only, which keeps them elastic when the VO changes. Motion
inside a module is either anchored (`B.after(anchor, dur)`), intrinsic (a fixed duration in seconds) or a hold that
stretches.

### 5.5 Module API

```js
// episodes/e01-paged-kv/modules/lot.js
import { defineModule } from '/edu/timeline.js';
import { SeatRow } from '/edu/prims/seats.js';
import { Odometer } from '/edu/prims/odometer.js';

export const waste = defineModule({
  id: 'lot.waste',
  build(stage) {                      // once, at init: create objects (hidden), return state
    return { seats: SeatRow(stage, { n: 24, style: 'cinema' }) };
  },
  frame(B, stage, st) {               // picture pass, pure: visibility, transforms, camera
    st.seats.show(true);
    st.seats.reserve(0, 24, B.after('fifty', 0.6));          // empty "reserved" seats light up
    stage.cam(B, [[0, [0, 2.2, 6], [0, 0.6, 0], 28], [1, [0.4, 1.6, 4.6], [0, 0.5, 0], 26]]); // camPath over u
  },
  ink(B, g, st) {                     // language-neutral 2D on the picture (numbers, SFX lettering)
    Odometer(g, 50 * B.after('fifty', 0.8), { x: 540, y: 520, size: 220, suffix: '%+' });
  },
  text(B, g, st, lang) {              // overlay pass: localized in-picture text (rare; captions are separate)
    st.seats.label(g, B, lang === 'zh' ? '占座' : 'reserved', B.after('reserve', 0.3));
  },
  sounds(B) { return [{ f: B.at('fifty'), id: 'odometer_roll', gain: -10 }]; }   // pure; read by `edu cues`
});
```
Transitions are declared in the script (`in=cut | whip N | match | push N | dotwipe N`). The timeline calls
`frame()` for both the outgoing and incoming module with `B.trans.k`. All modules share **one stage** (one three.js
scene with per-module groups, hidden when inactive), as film10 did. Cameras use the arc-length `camPath` (the round 3
lesson). A `window.__edu.dump(a, b)` debug hook returns cameras and visibility without rendering, like `__camDump`.

---

## 6. Primitive library (`kit/runtime/prims/`)

Each primitive has three things: a **physical metaphor** that reads on a phone, a small API, and a gallery entry.
Numbers shown on screen come from `beats.json` params with `SRC`, never from code literals.

| primitive | metaphor / look | API sketch | builds on |
|---|---|---|---|
| **TokenTiles** (3D token blocks) | Mahjong-like tiles or acrylic blocks with the token text cut in. They clack into rows, colour by id or role, and stack as a sequence. A Chinese audience reads 麻将 tiles instantly; EN viewers see "Scrabble tiles". | `TokenTiles(stage,{tokens,style:'tile'│'acrylic'│'paper',colorBy})` then `.layout('row'│'stack'│'grid',p,k)`, `.fly(i,to,k)`, `.highlight(mask,k)` | three InstancedMesh, canvas-baked glyph atlas (per-episode font subset), sprite.js lighting tricks |
| **Tensor / Matrix** | A grid of small cubes or a sheet of tiles; slices lift out, and matmul shows a row sweeping over a column with a glow on the products | `Tensor(stage,{shape:[r,c,d],cell,values,palette})` then `.slice(axis,i,k)`, `.mask(fn,k)`, `.matmul(B,u)`, `.shardTo(n,k)` (for DP/TP/PP) | InstancedMesh plus per-instance colour; `ctx.project` for labels |
| **GPU die + HBM** | A macro "product shot" of a package: substrate, die with an SM grid, HBM stacks at the sides, a heat-spreader lid that lifts off. Data moves as light pulses on the interposer. | `GpuPackage(stage,{sm:[x,y],hbm:n,lid:true})` then `.lid(k)`, `.flow(from,to,rate,k)`, `.fill('hbm',frac,k)` | real 3D (the skill's lesson: hard surfaces as 3D, not paintings); gear.js GPU card from xlaunch as a start |
| **MemoryHierarchy** | A building or a desk, from drawer (registers/SRAM) to bookshelf (L2) to warehouse (HBM) to another city (SSD). The camera travels the distance. A 毕导-style scaler ("if 1 ns were 1 s") is applied only to numbers taken from the slides. | `MemoryTower(stage,{levels:[{name,size,lat,src}]})` then `.travel(from,to,k)`, `.scale('human',k)` | stage desk/studio, odometer |
| **RequestQueue / Scheduler** | A ticket line or conveyor of request cards; batches leave on trays; continuous batching shows trays refilling as cards finish; a Gantt made of paper strips on the desk | `Queue(stage,{lanes,items})` then `.enqueue(id,k)`, `.batch(ids,k)`, `.finish(id,k)`, `.gantt(u)` | TokenTiles, sticky notes |
| **KV blocks / pages** | Seats, parking slots or bookshelf slots with a block table as a clipboard; for paging, a block table maps logical to physical slots with string between them | `Blocks(stage,{n,blockTokens,owners})` then `.alloc(req,k)`, `.free(req,k)`, `.map(table,k)` | episode-1 workhorse |
| **CodeCallout** | Code printed on a paper card on the desk (not a UI window): JetBrains Mono, a highlighter-pen stripe on the active line, a red-pen circle on the key token | `CodeCard(stage,{code,lang,lines,typeOn})` then `.hl(lines,k)`, `.circle(token,k)` | type.js `hand`/`ink`, real ink-mark scans |
| **NumberOdometer** | rolling digits (already in type.js); add units, signs and a "keeps rolling" gag mode | `Odometer(g,value,{x,y,size,suffix,roll})` | type.js `odometer` |
| **A/B split** | For 9:16, **top/bottom** halves (not left/right), two cameras in one renderer via scissor viewports; a torn-paper seam; "before / after" stamps | `Split(stage,{axis:'y',a:camA,b:camB,seam:'tear'})` then `.k(k)` | WebGLRenderer `setScissor`/`setViewport` |
| **Comic SFX lettering** | brush-stroke letters, burst balloons, speed lines, impact frames | `Sfx(g,txt,x,y,size,age,{style})`, `Burst(...)`, `Impact(k)` | npr/brush.js `letter / sfx / burst`, npr `impact`, film10 `misreg`, `dotWipe` |
| **ChapterCard** | split-flap tiles (film10), or a sticky note slapped on the lens | `Chapter(g,n,title,k,{style:'flap'│'sticky'})` | film10 2D layer, type.js `sticky` |
| **ProgressBar** | A thin ink line with chapter ticks at the **top**, below the 130 px platform band, because both apps draw their own scrubber at the bottom. The current chapter name is written in Caveat. | `Progress(g,sec,total,chapters,{y:150})` | overlay pass (localized chapter names) |
| **Cast** | The launch film's painted cat (white, red beret) as a recurring reaction character; painted Prof. Ding for intros and outros. Use poses, not lip-sync. | `Cast(stage,'cat',{poses})` then `.put(pose,x,z,o)`, `.react(kind,B)` | sprite.js + key.py + depth.py + gen_art.py |
| **Comedy kit** | `freeze(label)` (freeze frame, red-pen label, record scratch), `crashZoom`, `cutaway(cat,'side-eye',8f)`, `stamp('NOPE')`, `callback(beatId)` (re-show an earlier state), `deadpanCalc` (an absurd calculation on paper with an odometer) | functions over B, stage and g | stamps from film10, odometer, sprites |

Taste guardrails for every primitive (from VERSIONS.md and the skills): no flat single-colour backgrounds, no UI
panels, dashboards or bar charts, no centred letter-spaced titles, no glossy default materials, no generic glow, no
dissolves for whips. Each primitive ships with a gallery still, reviewed at phone size before an episode uses it.

---

## 7. Captions layer (EN and ZH)

### 7.1 Overlay versus ASS: evaluation

| | browser overlay (chosen) | ASS burned in by ffmpeg-full |
|---|---|---|
| look | same fonts and rasteriser (Skia) as the picture; house styles (rising-mask reveal, red-pen emphasis, karaoke word highlight, sticky-note asides) | FreeType/HarfBuzz rasteriser, a second text engine; `\k`, `\t`, `\move`, `\fad` are enough for pop-ins but not for the house look |
| sync | per frame; can use word timings and 3D anchors | event times only |
| cost | one extra render pass per language: about 0.05-0.1 s/frame (mostly PNG encode), about 35 KB/frame for sparse overlays (measured 34 KB), about 160-200 MB per language per episode | almost free |
| fixes | re-render the overlay for the affected range only (`--range`) | edit text, re-encode |
| availability | Chromium via Playwright, which is already used | only the keg-only `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`; the PATH ffmpeg cannot burn subtitles (no libass, freetype or drawtext) |
| determinism | vendored fonts, same Chromium build | needs `fontsdir` with vendored fonts; otherwise the CoreText provider picks system fonts (seen in the test log: "Using font provider coretext") |

Decision: overlays for every published cut. ASS (generated from the same cues) for animatics and drafts, and as an
emergency path. SRT for X's closed captions (X accepts .srt only) and as a record. Whether to upload the SRT on top
of burned captions is the user's call (double text when CC is on).

### 7.2 Overlay pass mechanics
- `?pass=overlay&lang=zh`: the final canvas is created with `alpha:true` and cleared to transparent. Only layers
  tagged `pass:'overlay'` draw (captions, `module.text()`, progress bar, localized chapter cards). `update()` still
  runs, so `ctx.project()` has the current camera.
- The PNGs are straight alpha. Compositing: `[pic][ov]overlay=format=gbrp,` then the bt709 yuv420p conversion.
  Tested here.
- Dedupe: the page reports `overlayKey(i)` (a hash of the visible cue state plus animation phase). Identical keys
  are written once and hard-linked, so static captions cost nothing.
- Rule for 3D-anchored localized labels: they are always on top. Text that has to sit **inside** the 3D world
  (printed on a card, a die marking) stays language-neutral: English technical terms or numbers ("KV cache",
  "HBM", "16").

### 7.3 Fonts (all must be vendored and OFL or equivalent; never PingFang or Hiragino)

| role | EN | ZH | notes |
|---|---|---|---|
| captions | Inter 600/700 (vendored) | **Noto Sans SC / Source Han Sans SC** (OFL) 600/700 | neutral, complete coverage |
| punch words / comic | Permanent Marker or brush lettering (vendored) | **Smiley Sans 得意黑** (OFL 1.1) | oblique display face, good for comedic punch words |
| statements | Instrument Serif (vendored) | **Noto Serif SC / Source Han Serif SC** (OFL) | pairs with the v10 "warm nerds" serif voice |
| remarks (red pen) | Caveat (vendored) | **LXGW WenKai 霞鹜文楷** (OFL 1.1) | warm handwriting, pairs with Caveat |
| code / data | JetBrains Mono (vendored) | JetBrains Mono for code, Noto Sans SC for any Chinese inside it | |

Licences: Smiley Sans, LXGW WenKai and Noto Sans SC are SIL OFL 1.1 (checked via their GitHub repos and summaries).
CJK masters are 10-20 MB each, so `fonts.py` **subsets per episode** with fontTools (installed). It collects every
glyph used in `script.md`, captions and module strings, adds ASCII and CJK punctuation, and writes `.ttf` (or woff2
once `pip install brotli` is done). Font-load checks must pass sample text:
`document.fonts.check('32px "Noto Sans SC"', '显存')`. Otherwise a family with a unicode-range can pass while
glyphs fall back. A post-render check rasterises each cue and compares it against a `.notdef` render to catch tofu.

### 7.4 Line breaking and caption rules

Reference limits: Netflix Simplified Chinese allows 16 characters per line, 2 lines, 9 characters per second for
adults, "Do not use commas or periods. Use one single space instead", and a bottom-heavy pyramid shape. Netflix
English (USA) allows 42 characters per line, 2 lines and 20 characters per second for adults, and breaks after
punctuation and before conjunctions and prepositions. These guides are written for landscape TV. On a 1080-wide phone
frame, with the right 140 px reserved:

| | EN | ZH |
|---|---|---|
| font size | 56-60 px Inter 600 | 62-68 px Noto Sans SC 700 |
| max width | about 800 px, centred at x≈520 (pulled left of the right-side buttons) | same |
| per line | target ≤ 28 characters (hard limit 34) | target ≤ 13 characters (hard limit 15) |
| lines | 1 preferred, 2 max, bottom-heavy | same |
| reading speed | ≤ 17-20 cps | ≤ 7-9 characters per second |
| end punctuation | keep ? and !, drop trailing . and , | replace ，。 with a space; keep ？！ and quotes |

ZH line breaker (`linebreak.js`; widths measured in the browser with the real font after loading):
1. **Atoms**: each CJK character; runs of Latin, digits and symbols ("PagedAttention", "16 tokens", "50%",
   "KV~cache"); glossary words that must never split. Note: ICU `Intl.Segmenter('zh')` is **not enough**. Tested
   here, it split 缓存, 显存 and 预留 into single characters. So a per-series `glossary.zh.txt` (显存, 缓存, 预留,
   算子, 张量, 流水线 …) is applied first, and jieba (pip) can propose additions offline.
2. **Kinsoku (禁则)**: no line may start with ，。、；：？！）》」』】…—％ or a closing quote; no line may end with
   （《「『【 or an opening quote; never split —— or ……
3. **Break scoring**: break after punctuation (cost 0), at the author's `|` (0), between clauses or after 的/了/是
   (low), between other CJK characters (medium), inside an atom (forbidden). Minimise raggedness² + break cost,
   with the bottom line ≥ the top line.
4. **Autospace**: insert a quarter-em gap between CJK and Latin or digits (Canvas2D does not apply CSS
   `text-autospace`).
5. **Full-width punctuation** in ZH. Typographic quotes in EN.
6. The final line breaks are dumped to `captions.<lang>.lines.json` for SRT and ASS export and for review.

Caption styles: white fill, a 0.09 em dark outline (round joins, drawn under the fill) and a soft shadow, with no
box. That matches the house rule from v10 ("never a dark box behind words on a light set"). The emphasised word or
phrase (`em`) is drawn in pen red `#c8352b` or lab gold. EN can highlight word by word from `words.en.json`; ZH
highlights the matching phrase when the EN anchor fires. A **ZH-only aside channel** (small Caveat/WenKai asides,
字幕吐槽) lets the Douyin cut carry localized jokes without changing the picture.

### 7.5 Safe-zone layout grid (1080x1920, starting values to calibrate in step 0)

```
y 0-130      platform top band (status, tabs)          -> no content
y 140-260    progress line + chapter tag                -> overlay
y 260-1150   hero zone (main action, faces, numbers)    -> picture
y 1160-1420  caption band (1-2 lines)                   -> overlay
y 1436-1920  platform bottom band (484 px, TikTok tmpl) -> picture continues, nothing essential
x 940-1080   right button column (about y 900-1700)     -> nothing essential
4:5 band     y 285-1635: hook and poster must read inside it (X feed crop, unverified)
```

---

## 8. Audio

### 8.1 VO
- Record: a quiet room. On iPhone, Voice Memos or a clip-on mic; on the Mac, a USB mic. Deliver WAV, or m4a that
  gets converted.
- Cleanup (`mix.py vo`, ffmpeg chain, all available in the PATH ffmpeg): `highpass=f=80`, `afftdn` (mild) or
  `arnndn` (needs an RNNoise model file), `deesser`, `acompressor=threshold=-20dB:ratio=3:attack=5:release=120`, a
  light `alimiter`. Room reverb cannot be removed well, so record dry.
- Breaths and clicks: trim to the word boundaries from alignment, with 60-80 ms fades and comedic pauses kept
  as-is.
- A lecture-audio VO is possible (excerpts from Prof. Ding's recorded lectures, transcribed with `small.en`), but
  lecture room sound and pace rarely fit short video. Use it only for short quoted moments, and ask her first.

### 8.2 Music and ducking (deterministic, numpy plus soundfile)
- The music bed is trimmed or looped to length, with stings on chapter cards and `MUSIC: cut | drop | hit` events
  from the script (a dead stop before a punchline is the stand-up timing device).
- **Ducking comes from the alignment, not a sidechain detector.** Speech spans are words merged across gaps under
  300 ms. The music gain is -10 dB inside spans, with a 120 ms pre-roll attack and a 350 ms release, and it is
  smoothed. Scripted pauses get no duck release unless marked, so a two-beat silence stays silent. Exact and
  repeatable; `sidechaincompress` is the fallback.
- SFX come from `cues.json` (module `sounds()` plus script `SFX:` lines): each entry has an id, a seeded variant
  pick, a gain and a category bus (whoosh/pop/tick/stamp/scratch/foley). Picture events and their sounds share one
  source, so they cannot drift apart.
- Comedy SFX (record scratch, rimshot, crowd laugh) are used sparingly; a laugh track reads cheap quickly. This is a
  style rule for SERIES.md.

### 8.3 Loudness and outputs
- Two-pass `loudnorm` (measure, then `linear=true` with measured values) to **-14 LUFS integrated and -1.0 dBTP**,
  verified with `ebur128=peak=true` and logged in `encode.json`. For reference, `say` output measured -19 LUFS
  before normalisation.
- Audio is AAC LC 48 kHz stereo at 256 kb/s via `aac_at` (AudioToolbox) when present, otherwise `aac`.
- Stems: `vo.wav`, `music.wav`, `sfx.wav`, `mix.wav`, plus a **no-music mix**. Douyin's in-app music library may
  be the safer licensing route (unverified), and the user previously added music in CapCut.
- Music and SFX licences are recorded per file in `kit/sfx/LICENSES.md` and `episode.json`. Rights for X versus
  Douyin are **unverified** per source; avoid anything "non-commercial".

---

## 9. Rendering

### 9.1 Mac GPU (default) versus cloud SwiftShader

| | Mac M2, Metal (`render.py --gpu metal`) | cloud VM, SwiftShader |
|---|---|---|
| measured | 0.10-0.14 s/frame per browser at 1080x1920 (NPR demo; PNG encode about 80 ms of it). Studio scenes with Reflector, Bokeh and Bloom will be heavier (unmeasured; measure in step 1). | 0.9-1.2 s/frame (demo, 1080p, PIPELINE-REPORT); about 3.7 s/frame (launch film, 1080x1350, xlaunch README); 3-8 s/frame (v9 notes) |
| 150 s episode (4500 frames) | about 8-10 min for 1 worker, about 4-6 min with 2-3 workers at moderate load, plus overlays of about 4-8 min per language | about 1.2-10 h, so not viable for finals |
| use | finals, verify, overlays | authoring only: `snap.py` at 540x960, short ranges |

Cloud fallback for finals: the user runs a local `start.command`, which calls `kit/edu render` with
`/usr/bin/python3`, because Playwright is already installed there. The WebCodecs `render.html` stays as a last
resort. It cannot do lossless picture/overlay separation, so it would render `pass=full&lang=xx` and should switch
from deprecated mp4-muxer to Mediabunny so it can mux the mixed audio.

Contention: other agents' Chromium processes share the GPU and CPU. render.py should read the load average and drop
to 1 worker above about 12 (the report measured 3 workers slower than 1 at load 16-20).

### 9.2 Storage plan (the 17 GB problem)
- **Picture mezzanine**: render.py's compactor writes `libx264 -crf 8 -preset veryfast -pix_fmt yuv444p` segments
  (about 0.6 MB/frame measured, about 3 GB per 3-minute episode) instead of qp0 RGB (3.7 MB/frame, about 20 GB).
  Keep qp0 for `--verify` comparisons only (verify against the PNG before compaction). ProRes 422 HQ is the option
  for editing in other tools (about 1 MB/frame).
- **No per-frame film grain in the render.** Use static paper and texture grain in the scene, and optional light
  grain at final encode (`noise=alls=…:allf=t` with a fixed seed). Platforms smear moving grain, and it costs
  bitrate. This one change cuts mezzanine size several times (the 0.67 versus 3.66 MB/frame difference above).
- Overlays as PNG with dedupe (about 0.2 GB per language). Audio is tiny.
- `EDU_OUT` defaults to `~/PicassoEdu/out` and can point to an external disk. `edu doctor` refuses a final render
  when free space is below the estimate.

### 9.3 Final encodes (`encode.py`)
```
ffmpeg -i picture_concat.txt (segments) -framerate 30 -i overlay_zh/%05d.png -i mix_zh.wav
  -filter_complex "[0:v][1:v]overlay=format=gbrp:shortest=1,
                   scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p[v]"
  -map [v] -map 2:a -c:v libx264 -profile:v high -preset slow -crf 17 -maxrate 20M -bufsize 40M
  -g 60 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv
  -c:a aac_at -b:a 256k -ar 48000 -movflags +faststart  e01_douyin_zh.mp4
```
- x264's default GOP is closed, which satisfies X's "no open GOP". `-maxrate` keeps a 180 s file under about
  450 MB.
- Deliverables: `e01_x_en.mp4`, `e01_douyin_zh.mp4`, `e01_douyin_zh_nomusic.mp4`, `e01_clean.mp4` (picture
  only, no captions, for re-cuts), `e01_en.srt`, `e01_zh.srt`, `e01_poster.jpg`, per-beat contact sheets, and
  `encode.json` (ffprobe report plus loudness).
- Poster: a chosen frame (`episode.json.poster`), composed as a thumbnail (launch-film lesson: frame 0 is the
  thumbnail). Douyin lets you pick a cover in the app.

### 9.4 Changes to the pv runtime and Python tools (the fork)
1. `pass` (`picture | overlay | full`) and `lang` query parameters; an alpha final canvas for overlays; a layer
   `pass` tag.
2. Non-loop time: `ctx.i` and `ctx.sec = i/fps`, with no `mod N`, plus `ctx.B` from the timeline. `--check-loop`
   is not used.
3. A `q5` layer type (vendored q5 4.8; `noLoop`, `pixelDensity(1)`, seeded `randomSeed/noiseSeed` per frame) for
   2D fx.
4. Quality tiers `?q=draft|final` (draft disables Reflector, Bokeh and Bloom and halves shadow maps) for real-time
   preview.
5. **Scene hash = every file the page actually loaded.** The page reports `performance.getEntriesByType('resource')`
   URLs (same-origin), and render.py hashes those files plus beats.json, words, captions and fonts. This fixes the
   pvlib gap where absolute `/scene/...` imports were not hashed.
6. Per-frame timeout (for example 60 s) with a worker restart. The compactor writes the near-lossless mezzanine
   (9.2). Encoding reads segments.
7. `__pv.capture` gets an option to skip identical overlay frames (dedupe by key).
8. Record Chromium version, GL renderer, Playwright version and font file hashes in `render.json`.

---

## 10. Preview and review

- `edu preview e01` serves `kit/preview.html?ep=e01`. It shows the scene in a phone-sized frame (real CSS size) next
  to a desktop-size view. The VO or mix plays through `<audio>`. The page renders `draft` quality at 540x960 and
  **drops frames to follow the audio clock**, which is safe because frames are pure functions. It has a beat list
  with script text (click to jump, loop the beat), an EN/ZH caption toggle, safe-zone masks (X and Douyin), and a
  "snap" button that saves the current frame at full resolution to `out/e01/review/`.
- **Animatic from day 1**: before a module exists, its beat renders a placeholder card (beat id, VO text, planned
  module, anchors as ticks), and the scratch VO from `say` gives real pacing. The user can review story and timing
  before any 3D is built.
- `edu sheet e01` writes per-beat contact sheets (first, anchor and last frames) at phone size with captions and
  safe-zone outlines, as JPEG for the user. That fits their habit: "合格" is judged on screenshots at desktop and
  phone sizes.
- `edu animatic e01` writes a 540x960 mp4 with audio at a low bitrate for phone review (shared via Google Drive, as
  the launch film was).
- Reviews follow the comic-film protocol: four lenses for this series (creative director, stylised-3D tech art,
  **domain expert against the slides**, platform editor for X and Douyin), at least 3 rounds, evidence as frame
  numbers and stills.

---

## 11. CLI (`kit/edu`) and resuming in a new session

```
edu doctor                    # tools, models, fonts, Playwright, ffmpeg-full path, disk headroom
edu new e02-flash-attn        # episode skeleton from template
edu slides L13 20-25          # PyMuPDF: slide PNGs + text into episodes/<id>/ref/ (facts only)
edu scratch e01 [--lang en]   # macOS `say` scratch VO from script.md
edu vo e01 PATH               # import + clean real VO
edu align e01                 # Whisper diff report + CTC word timings -> words.<lang>.json
edu beats e01                 # -> beats.json (+ staleness report)
edu cues e01                  # dry-run modules -> cues.json
edu preview e01 | snap e01 FRAMES | sheet e01 | animatic e01
edu render e01 --pass picture|overlay --lang en|zh [--range A:B] [--workers N]
edu mix e01 --lang en         # stems + mix + loudness report
edu encode e01 --target x|douyin|nomusic|clean|srt|all
edu status e01                # stage table with staleness (hash graph)
```

Resume protocol for a new session:
1. Read `.claude/films/edu/README.md`, which holds taste quotes, the series bible pointer and the commands.
   Register a skill `picasso-edu-kit` in `.claude/skills/` and a row in CLAUDE.md's table. That is a later change;
   this report edits nothing.
2. `edu doctor`, then `edu status <ep>`, which prints what exists, what is stale and the next step, computed from
   file hashes. Nothing depends on memory.
3. Read `episodes/<ep>/STATE.md`: the last round's verbatim user feedback (Chinese, quoted as in VERSIONS.md), what
   was changed, what was not verified, and the next steps.
4. If `~/PicassoEdu/media/<ep>` is missing (different machine or cloud), `beats.json` and `words.json` are committed,
   so picture work continues with the scratch VO regenerated by `say`. Only the final mix needs the real media
   (checked by sha256).
5. Version archive: each published cut goes to `social/edu/versions/` with its feedback and lesson. mp4s in git
   grow the repo, so consider poster-only plus Drive links for longer episodes.

---

## 12. Determinism checklist

- Picture: pv purity rules (no accumulated state, seeded RNG only, integer-cycle noise not needed since episodes are
  not loops), the p5.brush patch, `--disable-accelerated-2d-canvas`, `--font-render-hinting=none`, sRGB colour
  profile, a single backend per OUT, `render.py --verify 12` on every final. Fonts are vendored and subset. Pin
  Playwright and Chromium, and refuse to resume across a Chromium build change.
- Timeline: alignment runs only when the VO changes. Its outputs are committed, and frames are derived once in
  `beats.py`.
- Audio: integer sample clock (1600 samples per frame), numpy mixing, SFX variants seeded by `(episode, cue id)`, and
  loudnorm in linear two-pass mode. `mix.json` records gains and hashes.
- Overlays: same purity rules. Dedupe keys must include everything drawn.

---

## 13. Side line (iPhone vlogs): what carries over

- The same back end: `edu align` (Whisper transcript for picking takes and timing captions), `captions.js` overlays
  (EN and ZH, same fonts and styles), `mix.py` (VO and dialogue cleanup, music ducking from speech spans, -14 LUFS),
  `encode.py` presets.
- Ingest: conform to CFR 30 fps and make 540x960 proxies. iPhone HDR (HLG) footage must be tone-mapped to SDR
  bt709. That needs `zscale`, which is only in ffmpeg-full here, so shooting with HDR Video off is simpler. Lock
  frame rates and avoid "auto FPS".
- Graphics packs from the kit: comic SFX lettering, odometers (a running "$5.00 → $0.00" wallet for the San Diego
  challenge), chapter cards and maps, rendered as overlay passes. Delivery: PNG sequences, VP9-alpha WebM (libvpx
  is in both ffmpeg builds), or ProRes 4444. Third-party guides say CapCut does not read ProRes alpha but does read
  VP9-alpha WebM on desktop **(unverified)**.
- Game footage (Honor of Kings) and music rights on each platform are **unverified** and need checking per video.

---

## 14. Build plan (effort in focused session-days; user review rounds in brackets)

| step | what | effort | gate |
|---|---|---|---|
| 0 | **Platform probe**: a 20 s calibration video at 1080x1920 (grid and rulers, safe-zone candidates, EN and ZH caption samples at 3 sizes, a VO sample at -14 LUFS, a music bed). The user posts privately on Douyin (仅自己可见) and on X (test account or a reply). Record acceptance of 1080x1920, feed crop, UI overlap (phone screenshots), loudness change, recompression. | 0.5 | [1] calibrated grid and encode presets |
| 1 | **Kit skeleton**: fork pv (passes, alpha, lang, non-loop time, q5 layer, quality tiers, full-dependency hash, frame timeout, mezzanine segments, encode-from-segments), `edu doctor`, server maps to xlaunch vendor, portrait defaults. Measure studio-scene ms/frame at 1080x1920. | 1.5 | verify passes on a test scene |
| 2 | **Script, VO and timeline**: `script.md` parser, `say` scratch, VO import and cleanup, Whisper diff plus CTC alignment (EN), `beats.json`, the timeline `B` API, placeholder modules, preview with audio, animatic export. | 1.5 | [1] first animatic of episode 1 with scratch VO |
| 3 | **Captions**: vendor and subset CJK fonts (+ brotli), `linebreak.js` (glossary, kinsoku, autospace, scoring), styles, overlay pass, dedupe, SRT and ASS export, ffmpeg composite. | 1.5 | [1] caption stills EN and ZH at phone size |
| 4 | **Audio**: mix.py (ducking from spans, cues, buses, stings), loudnorm two-pass with a report, stems, no-music variant; an SFX starter library with licences. | 1 | [1] listen test on phone |
| 5 | **Look development**: 4 vertical style frames (studio, desk, a token close-up, a GPU macro) with type and captions, before animating anything (the v7 lesson). | 2 | [1-3] "就要这个质感" |
| 6 | **Primitives v1** (what episode 1 needs first): TokenTiles, Blocks/seats, Odometer, ChapterCard, Progress, Comic SFX, CodeCard, Split, Cast (cat), then GPU package, MemoryTower, Queue, Tensor. Each gets a gallery entry. | 4-6 | [1-2] gallery review |
| 7 | **Episode 1** (for example L13 PagedAttention): script with comic beats, Prof. Ding fact check against the slides, real VO, align, modules, 3+ review rounds, final render, mix, encode, publish both versions. | 3-4 | [2-4] |
| 8 | **Hardening**: skill file, CLAUDE.md row, STATE/REVIEW templates, `edu status` staleness graph, version archive script. | 1 | |
| 9 | **Vlog support** when the first footage arrives: ingest, proxies, transcript-based take picking, graphics packs. | 1.5 | [1] |

Total: about 17-20 session-days plus 9-15 user review rounds, roughly 3-5 calendar weeks to the first published
episode. Episodes 2+ should take about 3-5 session-days each once the library exists. That estimate is based on the
launch film's experience and is **unverified**.

---

## 15. Risks and mitigations

| risk | likelihood / impact | mitigation |
|---|---|---|
| **Taste rejection** ("HTML味/AI味", slideshow, generic) | high / high: every early cut of the launch film failed this way | Style frames first (step 5); physical metaphors only; real textures and painted art (Codex on green, keyed); gallery review per primitive; no charts or UI panels; 4-lens reviews with a creative director who knows the reference creators |
| **Disk full** during finals (17 GB free; qp0 at about 20 GB per episode) | high / high | Near-lossless mezzanine (0.6 MB/frame), no per-frame grain, delete segments after encode, `EDU_OUT` on an external disk, `doctor` space check |
| Platform specs differ from assumptions (1080x1920 on X, feed crop, safe zones, length limit, loudness) | medium / medium | Step 0 probe; hook inside the 4:5 band; episodes ≤ 2:20 for X until the account status is known |
| Alignment errors (fast speech, numbers, code words; a ZH or mixed-language VO) | medium / medium | Script normalisation for numbers; low-score flagging; Whisper fallback; manual anchor nudges in `script.md` (`[[half+2f]]`); a multilingual model download for ZH VO |
| CJK tofu or wrong breaks | medium / high (embarrassing on Douyin) | Glossary plus kinsoku tests; a per-cue tofu check; ZH caption stills reviewed by the user (native reader) |
| Font licensing | low / high | OFL fonts only, licences committed next to the subsets; no Apple system fonts in published cuts |
| Render nondeterminism or slowness under GPU contention | medium / low | `--verify`; one backend per OUT; drop workers when the load average is high; pin Playwright and Chromium |
| Python environment drift (only `/usr/bin/python3` 3.9 has the stack; a macOS update could replace it) | low / medium | `edu doctor` pins and checks versions; a `requirements.lock`; avoid 3.10+ syntax |
| torchaudio forced-align deprecation | low / low | Pin 2.8 (a later notice says forced_align was kept); fall back to Whisper timings |
| Music and SFX rights on X and Douyin | medium / medium | A licence ledger; a no-music variant; Douyin in-app music |
| Factual errors in teaching content | medium / high (it is Prof. Ding's course) | `SRC:` required on every number; a domain-expert review lens; Prof. Ding (or the TA) signs off on the script |
| Comedy misfires (jokes about people; EN versus ZH humour gap) | medium / medium | Launch-film rule: no jokes about a person, verbatim quotes only; language-specific punchlines in captions and the ZH aside channel; jokes come from the concept (a GPU "seat-hogging"), not from celebrities |
| Scope creep (2 languages x 2 platforms x variants x 2 lines) | high / medium | One picture, generated variants, a fixed deliverable list in `episode.json` |

---

## 16. Open questions for the user

1. VO language: one English VO with ZH captions for Douyin (what "中文字幕版" literally says), or also a Chinese VO
   for Douyin? The timeline supports both. A ZH VO needs its own alignment (MMS_FA or multilingual Whisper) and a
   re-timed picture render, which is cheap on the Mac.
2. Who voices it: a lab member, Prof. Ding, or lecture excerpts?
3. Target length per episode (60-90 s or 2-3 min), and whether @PicassoLabUCSD has X Premium (length limits).
4. Recurring host: the launch film's cat as a mascot, painted characters of lab members, or no characters?
5. Music source: a licensed library subscription, CC0 only, or Douyin in-app music added at upload?

---

## Sources

- X API media best practices: https://docs.x.com/x-api/media/quickstart/best-practices
- X help, upload .srt captions: https://help.x.com/en/using-x/upload-caption-srt-file
- X video specs (third-party): https://www.nemovideo.com/blog/twitter-video-specs-guide-2026 , https://videosize.net/guide/twitter-video-size
- TikTok safe zone template (third-party): https://cadenus.io/resources/blog/tiktok-safe-zone/ , https://www.previewmyprofile.com/free-tools/tiktok-safe-zone-template
- Douyin upload specs (third-party, Chinese): https://www.toolbox365.cn/tutorials/video-compress-platform-upload-specs-2026/ , https://k.sina.cn/article_7879995960_1d5af323806801jrm2.html
- Douyin loudness (Zhihu answer): https://www.zhihu.com/question/500002600/answer/2939353085
- Netflix Simplified Chinese timed-text guide: https://partnerhelp.netflixstudios.com/hc/en-us/articles/215986007-Chinese-Simplified-Timed-Text-Style-Guide
- Netflix English (USA) timed-text guide: https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide
- Homebrew slim ffmpeg vs ffmpeg-full: https://github.com/homebrew-ffmpeg/homebrew-ffmpeg , https://github.com/DerKIProfi/Marius-Lerho/pull/6
- torchaudio multilingual forced alignment (2.8): https://docs.pytorch.org/audio/2.8/tutorials/forced_alignment_for_multilingual_data_tutorial.html ; TorchAudio future: https://github.com/pytorch/audio/issues/3902
- mp4-muxer deprecation (Mediabunny): https://github.com/Vanilagy/mp4-muxer
- Fonts: https://github.com/atelier-anchor/smiley-sans , https://github.com/lxgw/LxgwWenKai , https://github.com/Markjinli/free-commercial-fonts
- CapCut alpha formats (third-party): https://javii.tools/blog/transparent-video-export , https://capcutguide.com/capcut-transparent-video-alpha-export/
- Course facts: L13.txt slides 20-25 (scratchpad `course/L13.txt`), citing Kwon et al., SOSP 2023
- Local files: video-kit `pipeline/{README.md, PIPELINE-REPORT.md, render.py, snap.py, encode.py, serve.py, pvlib.py, runtime/pv.js, runtime/npr/README-NPR.md}`, `anime/README.md`; xlaunch `kit/{README.md, render.html, build_kit.py, get.sh, start.command}`, `scene/{film10.html, type.js, lib.js, studio.js, sprite.js, finish.py}`, `tools/restore_workdir.sh`; skills `picasso-x-launch-film`, `picasso-comic-demo-film`; `social/x/versions/VERSIONS.md`
- Test artefacts (scratchpad): `snaptest/` (portrait snaps, overlay and ASS composite tests, `say` samples), `snapseq/` (mezzanine size test)
