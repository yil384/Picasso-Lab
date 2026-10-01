# Yufei "Picatso" - status (2026-10-01)

**Done and live on the branch:** `people/static/film/yufei.mp4` (H.264 high, 480x480, 192 frames, 1.18 MB) +
`yufei.webm` (VP9, 1.3 MB); `people/fx/yufei.js` has `film: 'film/yufei'` (double click plays it in the avatar circle).
The user approved her face: the real photo cut out and pasted into the comic world (comic look only around the face).
First / last frame vs the photo: mean abs diff 3.4/255 (resampling + yuv420).

To re-render: copy this folder to `video-kit/films/yufei` in a video-kit worktree, run `tools/comic_photo.py`
(rebuilds the comic layers), then the render / finish commands below. Next: films for the other members.

Brief: `STORYBOARD.md` (this folder). Status: **a complete, watchable draft of all 6 beats exists as a scene and has been
reviewed from rendered stills (about 2.5 review -> fix rounds)**. No final mp4 has been encoded yet: the first full
960 render was stopped at frame 35 on request and its frames were deleted. Current state: `work/progress_sheet.jpg`
(12 frames, circle-cropped). Earlier full-film sheet: `work/sheet_v1_48frames.jpg` (every 4th frame, one round older).

## Files

| path | what it is |
|---|---|
| `yufei.html` | the scene (~1000 lines): one three.js world through the film's NPR copy, plus 4 Canvas2D layers. Layers: `paper` (cached) -> `npr` (3D, underlay) -> `ink` (2D speed lines, sparks, glints, splatter, sparkles, puffs) -> `letters` (hand-built stroke-skeleton lettering) -> `photo` (the exact photo at f0-2 and f184-191, the ink-burst iris f3-10, the gold paint wipe f173-184). No p5 / p5.brush layer (all textures are Canvas2D, so boot is ~0.5 s). Key frames are in the `K` object at the top. |
| `npr/` | copy of `reference/style-comic/npr` (the newer film-comic version) with ONE addition in `npr.js`: `surface({ cut })` = alpha cut-out (discard below `cut`, colour = map) for the photo layers. |
| `assets/yufei.webp`, `yufei-cut.webp`, `yufei-plate.webp`, `yufei_grid.jpg` | inputs copied from the site repo / grid (read-only originals untouched). The plate is not used. |
| `assets/photo_full.png` | exact 512 px photo with the transparent corners (outside the inscribed circle) filled by inpainting, so the circle edge has no fringe; drawn at 960 in the `photo` layer. |
| `assets/comic_person.png`, `comic_palm.png`, `comic_sky.png` | 1536 px comic panel layers made by `tools/comic_photo.py` (photo coords x3). Person: 2-tone flat skin (face forced lit), XDoG feature lines in eye/brow/nose boxes only, redrawn red half-rim glasses + vector smile with teeth + blush, ink-violet hair with a hand-placed shine, navy blazer in steps with Ben-Day dots, cream zigzag top, pendant, bold silhouette line. Sky: banded San Diego dusk with halftone seams, sun on the horizon behind her right shoulder, Pacific + Point Loma. Palm: silhouette on the left with an orange rim. |
| `tools/comic_photo.py` | regenerates the 4 asset PNGs above + `work/comic_flat.jpg`, `work/comic_face.jpg` (12 s). |
| `tools/pv.py` | wrapper for `pipeline/render.py`, `snap.py`, `tools/nshoot.py`: patches `launch_kwargs` to use `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (this VM's Playwright 1.63 wants a headless-shell build that is not installed; override with `$PV_CHROME`). Works for render.py's spawned workers too. |
| `tools/sheet.py` | contact sheet from `f_XXXX.jpg` stills, `--circle` crops each to the avatar circle. |
| `tools/finish.py` | NOT YET RUN: encodes PNG frames -> `out/yufei/yufei.mp4` (480, 24 fps, high, yuv420p, `-tune animation`, `+faststart`, `-an`, `--search` finds the lowest CRF under `--max-mb 1.2`), writes `yufei_sheet.jpg` (16 decoded frames), `yufei_circle_135.jpg` (key frames at 200 and 135 px in a circle), prints ffprobe JSON and the first/last-frame mean abs diff vs the photo resized to 480 (inside the circle) + f182-191. |
| `work/` | gitignored scratch: `progress_sheet.jpg`, `sheet_v1_48frames.jpg`, `sheet_stroke_beat.jpg`, `hi2/` (4 full-res 960 stills f40 f80 f112 f160, one round old), comic filter previews, `circle_test.png` (photo vs comic panel at 200/135 px). |

## Beats as built (frames at 24 fps) and status

| # | frames | what happens | status |
|---|---|---|---|
| 1 | 0-12 | f0-2 exact photo; f3-10 ink-burst iris (jagged ink ring + yellow keyline + converging ticks) closes from the rim onto her FACE: photo inside, comic panel outside; f10-13 comic panel holds with a tiny push (outBack) | done |
| 2 | 12-58 | whip right (quartic ease-in from f12, cut under the smear at f18) to the bench at dusk: gold chip on a navy PCB, 3x3 cyan qubits, 12 bronze couplers, xmon crosses + readout meanders + bond pads painted on the die, dusk sunburst cyclorama behind, paint pot + mug props. Three red spiky gremlins peek out of the gap behind the chip (from f17/19/21), jump up f20/22/24 (stretch), land on the rim f24/26/28, hop onto qubits 0 / 4 / 2 (land f31/35/36, squash). Their qubits flicker crimson/wine, wobble, throw red/yellow zigzag sparks, red spill on the die; couplers next to them flicker. BZZT! (yellow fill, red keyline, ink, on a jagged balloon) f31-52. Centre gremlin sticks its tongue out f42-52. Bench shake while the noise runs. | done, good |
| 3 | 55-89 | whip left (cut f59) to her panel; crash zoom to her face (outBack, concentration lines); glasses flash f61-68 (white sweep clipped to each lens + small 4-point stars on the outer rims); SHING! (small, 112 px) f62-71; camera eases back (f66-74) and the white cat leaps up from below the frame (f68-75, stretched), lands on her left-in-image shoulder (squash ring), glances up at her, winks f80-83, crouches f84, leaps off upward f86 with the camera tilting up after it | done |
| 4 | 86-134 | tilt-whip (cut f89) down onto the chip; gremlins in shock; the cat drops in from the upper left with the big brush, paints ONE gold ribbon (3D flat ribbon grown with drawRange, bristle texture, ink hull) through the three gremlins f97-122 (camera follows the cat); each hit (f~104 / ~109.5 / ~116, computed from the path) squashes that gremlin into a gold blob that shrinks away with radiating drops; impact frame + concentration lines + SPLAT! (126 px, lower left, gold splat blob) on the middle hit; the hit qubits snap back to cyan with a ray burst + sparkle; couplers light gold in a wave (hit + 2 + 3 x lattice distance); after the stroke the ribbon soaks into the chip (f126-138) while the cat flips through the top of the frame | done, still the roughest beat |
| 5 | 134-173 | pull back to the hero shot (dusk sun behind); the cat lands on the chip front (f140, squash, puffs, concentration lines), grows to 0.95 scale off-screen beforehand; a glint band sweeps the die (f133-145); chest puff + pride marks + smug closed eyes f143-; brush raised; gold "PICASSO" (110 px) f147-163 and "LAB" (118 px) f158-168 write on stroke by stroke, a wavy gold paint stream runs from the brush tip to the write head; sparkles; wink f164-169 | done |
| 6 | 173-191 | gold paint wipe: three fat strokes (L->R, R->L, L->R; f173-182.5) with long gold trails and rounded heads uncover the plain photo; ragged gold edges fade; f184-191 exact photo | done, needs one more look |

## Look (current settings in `LOOK`, design = 960 x 960, rendered at 960, encode to 480)
comic preset with lengths for this 960 design: `lineW 3.0, lineWShadow 4.3, hullW 6.0, depthT 0.13` (depthT raised from 0.035: with the thicker Sobel radius the grazing bench produced blotchy "camo" ink), `htPx 13, misreg [2.4,-1.8], sat 1.1, grain 0.012, vignette 0.06, bgDots on the cyclorama`. Paper blotch reduced to 0.012. Smear only inside whip windows, capped at 110 px.

## Known problems / ideas (seen in frames)
1. Beat 4 is busy: drops + SPLAT + ribbon + gremlins + cat. The ribbon is the hero but is partly hidden by SPLAT and the gremlins; consider fewer drops and a 2-frame hold on the ribbon before SPLAT. The cat is only fully in frame from ~f104.
2. Payoff: the cat's chest puff reads weakly (white on white); the raised brush is partly lost among the letters. LAB was moved up to 402 and the hero camera target raised to y 1.95 to keep the cat's head clear of the letters: verify.
3. Wipe (f173-183): last change (W2 450, smaller tilts) not yet checked for comic slivers between bands at f181-183.
4. Whip frames: f89 (tilt-up cut) can be a near-blank cream/purple frame; the cyclorama was made taller (24) and its texture extended upward to fix it: verify. Smear ghosts (9 taps) are visible but read as motion.
5. SHING!/glints: fine; the iris now closes on her face.
6. Not yet measured: file size at 480 (expect CRF ~28-32 for <= 1.2 MB with the halftone), real 135 px readability from the encoded file.

## Commands (run from `video-kit/films/yufei`; timings measured on this 4-CPU VM, SwiftShader)
```sh
python3 tools/comic_photo.py                                   # rebuild comic assets (12 s)
# quick look: 480 px stills (S = 0.5), ~0.65 s/frame after a 0.5 s boot; --deadline is a hard wall-clock cap
python3 tools/pv.py nshoot yufei.html stills $(seq 0 4 191) --out work/sN --width 480 --height 480 --deadline 480
python3 tools/sheet.py work/sheetN.jpg work/sN --cols 8 --thumb 240 --circle
# full-res stills: ~1.5-2.8 s/frame at 960
python3 tools/pv.py nshoot yufei.html stills 40 80 112 160 --out work/hiN --deadline 280
# debug views: --q debug=1..5 ; look overrides: --q 'lk={"depthT":0.13}'
# final render (from video-kit/pipeline): ~1.7 s/frame at 960 -> ~5.5 min for 192 frames; one process only;
# split with --range 0:96 / 96:192 to stay under 8 min per command (it resumes)
cd ../../pipeline && python3 ../films/yufei/tools/pv.py render ../films/yufei/yufei.html --out ../out/yufei/r960 \
   --width 960 --height 960 --workers 1 --store png --range 0:96
# encode + checks (writes out/yufei/yufei.mp4, yufei_sheet.jpg, yufei_circle_135.jpg)
python3 ../films/yufei/tools/finish.py ../out/yufei/r960/frames ../out/yufei --crf 30 --search --max-mb 1.2
rm -rf ../out/yufei/r960                                       # delete frames after encoding
```

## Next steps (in order)
1. Snap f86-145 and f170-191 every 2-3 frames at 480; fix items 1-4 above.
2. Full 960 render in two `--range` chunks, `finish.py --search`; read `yufei_sheet.jpg` + `yufei_circle_135.jpg`; check
   ffprobe (192 frames, 480x480, high, yuv420p) and the first/last-frame diff (frame 0 and f184-191 should be the photo;
   expect mean abs diff ~1-3/255 from resampling + yuv420).
3. Formal review rounds (>= 3 total) with the four lenses (creative director / stylised three.js tech-art / quantum
   computing / Team-page web designer at 135-200 px), fix, re-render.
4. Report: shot list, outputs, size, ffprobe facts, photo-match numbers, scores, open questions.

## Decisions taken
- Her panel is three cut-out planes (sky z-14, palm z-6, her z0) sized to fill the home frustum exactly, so the comic
  panel lines up with the photo during the iris and the crash zoom gets real parallax; the cat stands in front of her
  plane (z+0.95). Her plane is flat 0.82 (receives a little cast shadow), the others flat.
- The bench world sits at the origin, the panel at z = 60: whips are pans/tilts cut under the smear (each shot rig is
  continuous through its own half of the whip, so the smear is computed from one rig).
- The gold die is a stylisation (real dies are Si/sapphire); the chip art keeps real topology: 3x3 nearest-neighbour
  couplers, xmon-like crosses, readout meanders, bond pads. Noise = gremlins (metaphor), fix = one stroke; no numbers.
- Brush in the cat's right paw (local -x): off her face on the panel, towards the camera on the bench. Cat scale 1.0 on
  the panel, 0.72 during the stroke, 0.95 for the payoff (changed while off-screen).
- Lettering = stroke skeletons in Canvas2D (from reference/style-comic, glyphs B G T L C added), no fonts at all.
- Nothing in `/home/user/Picasso-Lab` was edited; nothing committed.
