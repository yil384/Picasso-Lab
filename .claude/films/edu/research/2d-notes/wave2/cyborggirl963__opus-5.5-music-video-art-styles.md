# cyborggirl963/opus-5.5-music-video-art-styles

- URL: https://github.com/cyborggirl963/opus-5.5-music-video-art-styles (0 stars, 0 forks; created 2026-09-27; MIT;
  3 commits). Eighteen music-video engines, each with the same 37.5 s demo (Christina Rossetti, "Who Has Seen the
  Wind?", over a synthesised tune), style labs of sibling looks, Python render tools, Whisper/alignment timing tools.

## Made with Claude / Opus 5.5? (verified)
- README: "**Made by Claude Opus 5.5.** Nearly everything here (every engine, demo, tool and page of documentation) was
  written by Claude Opus 5.5, Anthropic's model, working in Claude Code, directed by Miranda Dixon-Luinenburg."
- All 3 commits end `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Stack / pipeline
- Each style: `styles/<style>/index.html` (Canvas 2D, some WebGL / three.js: aurora, liquid light, diorama, thermal,
  pinscreen) + README + `lab/`. Page contract `window.__video.ready / renderAt(t) / step(t)`, `<canvas id="film">`.
- `tools/still.py`, `render_mp4.py`, `lab_stills.py`, `splice.py` (re-render one stretch), `reel.py`, `probe.py`
  (Playwright + Chrome, imageio-ffmpeg). `tools/audio/` (Whisper transcribe, align, snap, MIDI, onsets, sections).
- CLAUDE.md + docs/workflow.md: ask what the song means, measure it, pitch three looks with an "organizing object" and a
  small visual grammar, style lab, build one section for notes, then the rest, deliver an MP4.
- All demos are 1920x1080; no 9:16 support mentioned anywhere.

## What I rendered (frames2/artstyles/, 1920x1080, t = 9 s and 24 s for all 18 engines; no console errors)
Sheets: artstyles_sheetA.jpg, artstyles_sheetB.jpg; 1:1 crops artstyles_crop1.jpg, artstyles_crop2.jpg.
Build times: most ready in 0.5-7 s; batik 20 s, thermal 24 s, diorama 109 s.

## What I saw (candid)
Hand-made at 1:1:
- **Stone mosaic**: tesserae laid along every outline with grout between, swirling sky courses; very convincing.
- **Wool embroidery**: satin-stitch fills with thread direction, stem-stitch outlines, couched gold wind lines, linen
  weave, a stitched border of little motifs. People are stiff paper dolls.
- **Showboat stage**: painted backdrop with believable brushwork, leaves hung on visible wires, stagehands at the wings
  working a wind machine, two puppet-like actors (one with an umbrella), footlights, audience heads in silhouette, the
  lyric on a card on an easel. Theatrical and quietly funny.
- **Magic lantern**: everything engraved in vertical hatching, a lecturer pointing at a projected circular slide (a
  weathervane), seated audience silhouettes, a lit lantern projector. Dark and monotone.
- **Archive desk**: top-down desk with a weather map (isobars, fronts), a wind-force card with one line circled, photos
  with red circling and stamps ("NO SIGHTING", "PASSED THROUGH"), a typed "Record of statement", film strips, ashtray
  smoke, a pencil, plus VHS tear bands. Rich, research-like; photo faces are mush.
- **Tinted linocut** (gouge-line skies, wind-bent trees, a night window) and **screenprint** (halftone, misregistered
  plates, a clothesline being pegged by a hand) are good poster looks, though linocut edges are clean vector.
Procedural or weak:
- **Flat vector poster** (MS-Paint-level), **marbling** (crisp vector-edged swirls, flat), **carved diorama** (looks
  like a low-poly game, stiff figure), **photomontage** (the code-made face is uncanny), **glass plate** and **painted
  enamel** (mannequin figures), **backlit paper cut** (beautiful layered night with aurora and a floating house, but it
  reads as layered vector more than paper).
- Figures are the weak link in nearly every engine; docs/workflow.md itself warns of "people who look like mannequins".

## For our 9:16 explainer with a painted white cat
- Organizing objects worth stealing: **archive desk** (a desk-miniature evidence board: KV cache as index cards,
  stamps as verdicts, a magnifier on the bottleneck); **showboat** (a stage whose stagehands visibly run the mechanism:
  "what the scheduler does behind the curtain" with the cat as the stagehand); **magic lantern** (cat as lecturer,
  diagrams as slides; too dark as a house look).
- Texture engines worth a test under the cat sprite: embroidery and mosaic (real-feeling surfaces); screenprint for
  loud title beats.
- docs/workflow.md lessons transfer directly: something new on nearly every beat; no hold longer than a beat or two;
  "show the medium working"; props must sit in hands; "what makes a look cute"; real documents as props.
- Every engine is 16:9 and would need re-layout; their human figures should be replaced, not reused.
