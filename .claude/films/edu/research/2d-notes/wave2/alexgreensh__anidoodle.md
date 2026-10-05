# alexgreensh/anidoodle

- URL: https://github.com/alexgreensh/anidoodle (788 stars, 64 forks; created 2026-09-22, pushed 2026-10-04; v0.6.0;
  244 commits). Apache-2.0. Author Alex Greenshpun. Claude Code / Codex / Grok Build plugin + a TypeScript engine.

## Made with Claude / Opus 5.5? (NOT verified)
- No first-party Opus 5.5 claim found. 0 of 244 commits carry a `Co-Authored-By: Claude` trailer; README only says it
  "Works in Claude Code · Codex · Grok Build". Release notes: no model named.
- Code comments mention a "FABLE review" (`example/src/canvas-core/butterfly/act2art.ts`, `alive/cues.ts`), which
  suggests a Claude Fable model reviewed the example film; not confirmed.
- Third party: blog.cosine.ren "Making Videos with Opus 5.5" lists anidoodle as a skill resource. A search snippet tied
  it to Addy Osmani's Opus 5.5 post, but that post's text (read via the X syndication endpoint) is "Claude Opus 5.5 drew
  each frame of this animation in JavaScript. Here's "how browsers work" in 40 seconds." with no anidoodle mention.

## Stack / pipeline
- `skills/anidoodle/engine`: portable TS "canvas-core" (one pure function per frame, seeded), esbuild page builder,
  playwright-core + Chromium for stills (every still drawn twice and md5-compared), ffmpeg for mp4/gif/webm/apng, one-file
  HTML emitter; four backends (playwright, html-player, remotion, hyperframes). Music composed as data (21 vocabularies,
  optional 373 MB sample pack), SFX kit, `music.mjs check`.
- 31 style plates, each a TS file with its recipe at the top and a `*Draw` film that draws it in medium order.
- Launch-film kit renders 16:9, 1:1, 4:5 and 9:16; `scaffold.mjs --format 9x16` exists.
- Workflows in `references/workflows/`: explainer.md (research ledger, one concept on screen, drawn lettering, "a
  recurring guide ... build it once as a character module"), drawing-process.md, character-consistency.md (Mira),
  teach-drawing.md (owl and cat lessons).

## What I rendered (frames2/anidoodle/render/, 1080 px, all reported reproducible)
woodcut 140/419, sumiE 200/509, charcoalErasure 200/539, scratchboard 479, pocketWatchDraw (ballpoint) 449,
moonPhasesDraw (chalkboard) 300/539, balloonDraw (crayon) 449, lighthouseDraw (riso) 329, rubberHose 100/250/400,
paperCraft 389, colouredPencil 539, storybookDraw 449, halftone 419, miraEveryHand, miraComic, miraRiso, miraWalk 0/120,
lessonCat 400/1000/1600. Also frames from the shipped mechanical-lepidoptera.mp4 (47 s) and lesson.mp4 (owl, 95 s,
1080x1656). 1:1 crops: crops_1to1.jpg, crops2_1to1.jpg.

## What I saw (candid)
Truly hand-made at 1:1:
- **Chalkboard** (best): chalk capitals with grainy dropout, a yellow double underline, half-erased ghosts
  ("HOMEWORK P 42", "NEWTON") smeared into the slate, chalk dust and a stick of chalk on the tray. Moon fills are plain
  speckle noise, though. Mid-draw frame shows moons appearing one by one along the arc: the diagram builds itself.
- **Scratchboard** lynx: fine scratched hairs following fur direction, lit eyes; very convincing (photo-derived).
- **Crayon** balloon: waxy strokes whose direction changes per region, white paper skipping through; a real kid-drawing
  charm. Outlines are marker-clean.
- **Newsprint halftone** viaduct; **rubber-hose** final frame (sepia, grain, vignette, a grinning teapot in gloves).
  Its blocking frames are blue construction pencil, then ink; mid-fill frame has grey rectangles on the arms (artifact).
Procedural-looking:
- **Sumi-e**: opaque grey leaves overlapping by alpha, uniform stalks, bristle marks only at the nodes; no bleed, no
  dry brush in the stalks. The sparrow is cute.
- **Woodcut**: clean vector heron outlines, wood-grain as a fill texture, uniform ruled rain lines.
- **Charcoal erasure**: canopy is noise-stipple blobs; odd blurred bokeh circles in the sky. The bare-tree mid-draw frame
  looks better than the finished one.
- **Riso lighthouse**: coarse multi-colour dot screen everywhere, busy, reads like a filter.
- **Paper-craft**: stock flat vector with drop shadows. **Ballpoint** watch: good rim hatching, but flat vector hands
  with drop shadows break the medium.
- **Code-drawn characters are the weak point**: Mira (yellow raincoat girl) is one stiff pose across nine hands; the
  comic panel bends her head back at a broken angle; the riso cover's seated legs are wrong; the walk film is empty
  colour bands. The sitting cat lesson is plain and stiff. Butterfly film: flat layered fills, flowers are translucent
  faceted polygons.

## For our 9:16 explainer with a painted white cat
- Borrow: the **drawing-process** mechanic (a diagram drawn on in medium order, never faded in) in **chalkboard** for
  board beats; **rubber-hose** for comedy cutaways; crayon for "the cat's own drawing" gags. explainer.md's research
  ledger + "one concept on screen" matches our pipeline.
- Avoid: its character module for the hero (keep the painted sprite), sumi-e/woodcut/charcoal/paper-craft/riso plates,
  the Mira look.
