# feitangyuan/onetake ("Motion films that never cut to the next slide")

- URL: https://github.com/feitangyuan/onetake  (author "Patrick", X @paojiaofty per web search)
- gh api (2026-10-04): 1,514 stars, 96 forks, created 2026-09-26, 8 commits, last push 2026-09-29.
- Licence: PolyForm Noncommercial 1.0.0 ("Commercial use is not permitted"). A university channel is probably
  noncommercial, but check before copying code.
- 10 case films ship as MP4 + breakdown README; "The films' source code is not included."

## Made with (evidence)
- README: "A Claude Agent Skill that makes product launch films ..."; install into `~/.claude/skills/onetake`.
- cases/clearing-15s/README.md: "Made in Claude Code with this skill on 2026-09-14. The user left concept, palette,
  camera and visual elements entirely to Claude"; knockon, one-dot and pith READMEs say the same ("Made in Claude Code").
- NO model is named anywhere (grep for opus/anthropic finds nothing) and commits carry no Co-Authored-By trailer.
  The cases are dated 2026-09-13/14, about ten days before the earliest Opus 5.5 posts in this wave (2026-09-23/24).
  So: Claude Code, model unstated; do not cite it as Opus 5.5.

## What it is
A skill for 10-30 s product launch / feature-demo films (up to ~60 s narrated): one HTML composition,
`window.__seek(t)` pure in t, a move library (`lib/motion.js`, "1.1.0-lite", 39 moves: springs, entrances, carries
`morphRect / iris / zoomThrough / hop / gather / ribbon / seal`, contact, sims, camera), Playwright render with real
shutter motion blur (several seeks across a 180-degree shutter averaged in linear light; 1080p30 drafts, 4K60 final),
synthesized + recorded sound in one reverb, and an oracle (`probe.py`, `verify_promo.py`).

## How the continuous camera is built
- `OM.camera(t, keys)`: keys `{t, x, y, zoom, rot, curve}` = the world point at frame centre; zoom interpolated in LOG
  space; each segment has its own curve.
- The operator feel comes from three layers on top of the keys (references/composition.md "A camera"):
  1. "Chase, don't follow": key the subject ~0.1 s ahead on `sineInOut` to follow; key the LANDING point before a snap
     on `expoInOut` to whip to it.
  2. A hand: a slow two-sine float (`e*(sin 1.7t + .6 sin(2.9t+1))/zoom`), multiplied by an envelope that is ZERO in
     the holds ("a floating camera is never dead still, and the rests are what make the moves land").
  3. `OM.shake(t, tHit)` on every landing: decaying, seeded, starts from zero.
  Plus a faint far `OM.lattice` of dots at depth 1.2 so a move on an empty ground still reads; `OM.view(cam, {depth})`
  gives per-layer parallax matrices.
- Deep zoom ("clearing", 1x -> 300x -> 1x): key the SCREEN position of an anchor and log zoom, recover the camera from
  it, because a world-space spring at 300x "swings the target a frame-width for every pixel of lag". Nested levels are
  drawn in their own units (a day is a 1440 px page inside a 24 px cell) with level-of-detail fades by on-screen size.
- `OM.rig` (a spring operator, integrated once at a fixed rate and sampled) is documented in comments but its body is
  not in the public lite build (commit 511193b "trim tuned defaults and measured numbers from the public build").
- Framing guard: `__meta.inFrame` names what must never leave the frame; verify fails any frame where it does
  ("the one-dot film's first camera render lost its dot behind a snap and nothing else noticed").

## Does it escape the slideshow? (frames viewed: frames2/feitangyuan-onetake/*_sheet.jpg)
- Structurally yes, and it MEASURES it: probe.py marks each 0.4 s window where most screen area changes identity as a
  boundary; CARRIED if something survives and visibly moves/scales, ANCHORED if only a large static thing survives,
  BARE if nothing; score = (carried + anchored/2)/boundaries; < 0.5 fails. README table: a launch film with "perfect
  rhythm, still a slideshow" scored 0.00 (v1), 0.40 (v2), accepted at 0.75 (v3); the onetake launch film 0.83.
- What I saw: launch film = prompt bar types "/onetake A launch film for Da[yline]..." and opens into a calendar app,
  the camera rides into one event card, the window becomes a phone ("Now it"), the next prompt bar collapses into a
  line... a purple stage of onomatopoeia words (WOOF, beep beep, BOOM HONK), a festival poster, the three outputs gather
  in a row, the cursor writes "onetake". clearing = a 52x7 year grid on ultramarine, the camera falls into one day, a
  yellow scan finds 15:00-15:30, dives to 300x ("Clear."), whips back with heavy motion blur, kept days spell CLEARING
  in a 5x7 pixel font. unbroken = one dry-brush ink stroke on near-black that keeps getting broken by notification chips
  on the left and completes on the right ("Finish the circle."). knockon = a light tabletop chain reaction (return key ->
  toggle -> ball -> notification card) with long soft shadows.
- But the LOOK is product-UI motion design: cream/ultramarine grounds, Inter/Geist type, app cards, kinetic words, an
  end wordmark. This is exactly the "animated web page" genre the user rejects. The carry discipline transfers; the
  surfaces do not.
- Everything is 1920x1080 (all 10 MP4s probed). No 9:16 rules, no safe areas. "Small elements, big ground. The genre's
  frame is 70 % white" contradicts what a phone-vertical explainer needs (subjects at 60-90% of width).

## Rules worth stealing (each "cost a cut" per SKILL.md)
- "Never replace a beat - carry it." At every section boundary name the thing that survives and moves; mutually
  exclusive scenes are slides "even with perfect rhythm". Bare cuts only inside a burst of hits and at the end card.
- "Never cut on a metronome": shot lengths vary by >= 4x (0.25 s words next to 2.5 s holds); the reference they
  matched was "34 % dead-still".
- "The cause must be visible" (a hand or the concept's own subject causes each reaction).
- Three concepts that differ in their central picture-idea (one element transforms through everything / one camera
  move through scale / before-after split / chain reaction), user picks. "Never carry the last film's look into the next."
- "No particles / confetti / speck bursts. They read as a template."
- "Fast moves need the shutter. Over 80 px/frame without motion blur strobes into copies."
- The overlap lesson: "adding labelled cursors made it worse; it read only once the idea was built into the artwork".

## Quality (candid): 7/10 overall
Craft 8/10 within its genre (motion blur, rests, whips, real continuity). Relevance of the method to us 9/10; relevance
of the look 2/10 (UI cards and kinetic type). Not vertical, not illustrated, not an explainer of ideas.

## Borrow
- A carry column in our storyboard ("what survives this seam") and a probe-like continuity score on our renders.
- The camera recipe: log-zoom keys + lead/whip curves + a hand envelope that is zero in holds + seeded shake on
  landings + a far parallax layer; screen-space anchoring for deep zooms (chip -> die -> transistor; qubit -> lattice).
- Shutter-blur render for fast camera moves; a framing guard that fails if the subject leaves frame.
## Avoid
- Its look (UI rebuilds, kinetic type, wordmark lockups), the 70%-empty frame, and its PolyForm-NC code in anything
  commercial.
