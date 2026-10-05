# sevenevesai/riso-windowseat

- URL: https://github.com/sevenevesai/riso-windowseat (273 stars, 32 forks; created 2026-09-22; MIT; 11 commits).
  Site: https://seveneves.ai/riso/. MP4s on the v1.0 release. Eight films (Window Seat 78 s, Roost, Held, Nonpareil
  70 s each, Eclosion and Passenger 36 s, Lumen and Emergence 28 s), three print series, studies, tools, skills.

## Made with Claude / Opus 5.5? (Claude Code yes, model version not stated)
- README: "I directed each work; Claude Code (Anthropic's coding agent) wrote the code, using the skills, rules and docs
  in this repo." seveneves.ai/riso: "Claude Code wrote them". No co-author trailers, no model version anywhere I found,
  so Opus 5.5 is unverified. Passenger is credited as "a child of Window Seat and alexgreensh/anidoodle".

## Stack / pipeline
- Each work is one `index.html`: Canvas 2D + Web Audio, no libraries, fonts, images or network. Contract
  `window.__riso = {duration, ready, seek(t), renderAudio(), marks, shots}`; `seek(t)` must be pure.
- Ink-plate model (`.claude/rules`): each ink drawn into a coverage layer, screened to halftone, tinted, multiplied on
  paper; knockout rules (`destination-out`), order within a plate. A hook warns on determinism breaks.
- tools/: verify (repeat seeks, cold jumps, reverse order, Chromium + Firefox), review (shot sheet + stillness
  report from the MP4), shoot, still (2160 px), render (every frame to ffmpeg), audio (loudness, spectrogram, sync).
- Skills riso-film / riso-still / riso-score; docs on brief, visual development, drawing, characters (eight revisions of
  a person eating), scene space, motion, sound, quality bar.

## What I rendered (frames2/riso/, 1080x1080, my own seek-and-grab script around `window.__riso.seek`)
Emergence t = 1..26 (12 frames, emergence_sheet.jpg), Window Seat t = 8/25/45/62, Passenger t = 4/10/18/30
(ws_pass_sheet.jpg); 1:1 crops emergence_crop.jpg, ws_crop.jpg.

## What I saw (candid)
- The most convincing print texture in the cluster: multi-ink halftone rosettes, a misregistration fringe, mottled
  paper with fibres, dense screens producing a real moire in the data-hall shot.
- **Window Seat**: one fixed train window with a glass of water on the sill; outside, golden fields with a pole and
  wires, a night city of lit windows, fireworks over a lake, a pink mountain sunrise. The fixed frame is a strong device.
- **Passenger**: a butterfly drawn by a finger in window fog, drips running from the strokes, sunrise colouring it, then
  it sits on the glass rim over riso fields. Charming idea.
- **Emergence** (AI history in nine metaphor worlds): a neuron dot in a ring, a loss valley with a ball rolling to the
  minimum, an attention "loom" with a query knot and an orange row, a jellyfish drop, a prism (2023), an orrery (2024),
  a data hall in deep perspective (2020), a web. Clean editorial riso; abstract, no character, no comedy.
- Risk: a fine halftone at 1080 is likely to moire or smear after X / Douyin re-encoding at phone size (not tested).

## For our 9:16 explainer with a painted white cat
- Emergence is the closest existing piece to our subject: LLM concepts as small physical metaphor worlds (loss valley,
  query loom, data hall). Steal the metaphor-world approach and the fixed-frame device (a window or a desk that never
  moves, the world changing behind it).
- Riso as a channel finish is tempting (screen the painted cat through 2-3 ink plates with knockouts), but it pulls
  toward quiet and poetic; use it for a premium or seasonal episode, and test re-encode moire first.
- The tools (pure seek, verify in two browsers, stillness report from the delivered MP4) are worth copying.
