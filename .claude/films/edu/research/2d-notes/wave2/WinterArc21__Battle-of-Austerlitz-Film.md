# WinterArc21/Battle-of-Austerlitz-Film - 5-minute narrated history film, rendered in code

- Repo: https://github.com/WinterArc21/Battle-of-Austerlitz-Film (18 stars; created 2026-09-24; no license). The rendered film is in the repo (video/austerlitz.mp4, 301 s, 1920x1080, 24 fps, subtitles in video/austerlitz.srt).
- Provenance: the only commit 86dae32 is authored by "Claude <noreply@anthropic.com>", ends `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and a `Claude-Session: https://claude.ai/code/session_...` line.
- VIEWED: downloaded the mp4 (deleted after), 50 frames at 1/6 s + 3 full frames: frames2/winterarc21-austerlitz/.

## How it is made (README)
- WebGL2 engine: real SRTM terrain of the battlefield (38 m grid, 3x vertical exaggeration), Natural Earth coasts for the campaign map; procedural sprite atlas of soldiers of three armies and horses with IK gallop; fog, god rays, bloom; "The painterly look comes from a Kuwahara filter blended over the rendered frame, a canvas weave, grain and a 2.35:1 letterbox".
- `web/script.js` is the narration as beats with pre/gap/tail silences - "every picture in the film is timed against these beats"; Kokoro TTS offline; synthesized score; `events.js` derives sound cues from the picture ("Sound travels at 343 m/s. Guns seen far away are heard late, filtered by distance, placed left or right of the camera.").
- Historical honesty: the sun's real azimuth used to stage "le soleil d'Austerlitz"; the drained ponds' finds (38 guns, ~130 horses, a handful of bodies) contradict the Bulletin and the film says so.

## What I see
- Night: two lines of camp fires across dark hills; French soldiers with straw torches (simple paper-doll sprites). Elegant small-caps serif chapter titles bottom-left ("MORAVIA / The night of 1 December 1805").
- Campaign map: parchment-coloured Europe with dark sea, a blue dotted route Boulogne -> Ulm -> Vienna with red date labels, red allied arrows converging; then the real relief map of the battlefield in sand tones with village clusters, labelled "PRATZEN HEIGHTS", "Goldbach", "Sokolnitz", "Telnitz", blue French and red allied blocks, big red curved arrows for the allied flanking plan.
- Fog sea at dawn; rows of tiny soldiers; the sun rising exactly behind Pratzen hill over a French column; Rapp's cavalry charge with motion blur and painterly smoke; sunset over the frozen ponds with fleeing figures; casualty numbers set quietly over the dusk landscape (27,000 / 9,000); closing proclamation quote in italic serif under the torches.

## Narration / pacing
- Calm documentary narration (Kokoro), ~129 wpm (645 words in 301 s), 63 subtitle cues, silences planned per beat (title holds 7.5 s of silence, the sun scene opens with 7 s). Shots hold several seconds; the camera glides; map scenes build arrows in time with the sentence.

## Good / slide-like
- Good: the map-to-terrain-to-ground progression is a real explainer device (strategy shown on a relief model you can believe, then the ground-level consequence); restraint, typography and silence give it dignity; sound design derived from the picture; real data (terrain, sun azimuth).
- Weak: sprites are crude (stiff paper dolls, mannequin horses) at close range; the Kuwahara "painterly" filter reads as smeared rather than painted; 3D-heavy; humourless; 16:9 letterbox.

## Borrow
- Narration as beats with explicit silences that drive the picture timeline (`script.js`).
- The "map table" device: one diorama-like relief/board that the camera flies over while arrows and blocks explain, then a cut down to ground level for the human moment - matches our desk-miniature idea.
- Picture-derived SFX cues (each event on screen emits its sound with distance/pan).
