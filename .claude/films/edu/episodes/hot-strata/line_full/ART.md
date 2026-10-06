# Line-art drawings for the full Strata film (line_full, final script)

Everything on screen that is a person, a building or an object is a Codex line drawing (black ink on pure white), packed
by `../bakeoff/line/ink.py` into an ink / paper / pen-time sprite so it draws itself. Code only writes: hand lettering,
red-pen circles, arrows, ticks, strike-throughs, tally marks, the score grids, the "121" badge and the real-data
highlights. The Picasso logo is the real file `art/brand/picasso_logo.png`, never redrawn.

## How to make them
`art_batch.sh` (this folder) holds every prompt and runs the whole job. Do not run it while Codex is rate-limited.

```sh
cd .claude/films/edu/episodes/hot-strata/line_full
./art_batch.sh gen 1      # building, chef poses, manager, order spike   (4 jobs in parallel)
./art_batch.sh gen 2      # slip boxes, number heap, press, Geisel        (4 jobs)
./art_batch.sh gen 3      # renovated building, PC kitchen, paper         (3 jobs; needs line_building_q)
./art_batch.sh pack       # cut the two pose sheets, ink.py every new drawing -> art/cut/
./art_batch.sh            # all of the above in order
```
- Each job is `art/gen.sh NAME "prompt + STY" refs...` with a `REFNOTE`. Every job gets references: the bake-off's own
  Codex line drawings `src/line_gpu.png` + `src/line_forum.png` for line weight and pen feel, and the cast sheet
  `src/line_d_chefs.png` (top row waiting, bottom row cooking) wherever chefs or a new character appear. Group 3 also
  gets `src/line_building_q.png` so the renovated building and the PC miniature match it.
- The style string `STY` is the bake-off's, unchanged (black ink on pure white, no text, no fills).
- Look at every `src/<name>.png` at full size before starting the next group; expect 10-40k tokens a job. A failed job
  leaves `art/logs/<name>.log` and no PNG; re-run its group (the others are simply regenerated).
- `pack` runs `ink.py name:sweep` on the single drawings and `sheet_cut.py` on the two sheets. `sheet_cut.py` is the
  same cut as `derive.split_sheet` (every ink blob goes whole to one figure, 14 px margin, written to `art/src/`), but it
  measures the white gaps between figures row by row instead of taking guessed centres; it packs each cut figure as it
  goes. Tested on `line_d_chefs` (6 x 2, all 12 figures clean). `--dry` prints the edges without writing anything.
- The new figures may come out slightly thinner-lined than the derived `line_d_chef_*`; match them with
  `sprite(img, scale, boost, grow)` in film.js, not by redrawing.

## Existing drawings reused (no new work)

| Drawing | Beats | Use |
| --- | --- | --- |
| `line_d_servers` | B0, B13 | the cover's server wall; the last 0.5 s of the end card returns to it (X loop) |
| `line_brain` | B0 | the AI model, red wash, squeezed into the card |
| `line_gpu` | B0, B1 | the gaming card; small at the foot of the number heap in B1 ("RTX 4090 · 24 GB" lettered by code) |
| `line_forum` | B0 | the forum thread; its own comment row is cropped and stamped again and again so the comments overflow the window (no new art, no vote counter) |
| `line_coders` | B0 | programmers losing their minds |
| `line_d_kitchen` | B3 | the kitchen behind the 128 chefs |
| `line_d_chef_w1-6` | B3, B8, B12 | 128 waiting chefs (8 x 16); tiny again in B12. **Chef 6 (the old man with the white beard) is chef 121**: code writes a red "121" badge on his chest, and only on him; `w6` is blown up to ~400 px for B12's close-up |
| `line_d_chef_c1-6` | B3-B9 | the 8 who cook (red pen); the chefs cooking upstairs; two of them, small and at half speed, at the little stove downstairs |
| `line_ticket` | B2, B3, B5-B8 | the order slip: pinned blank on the Geisel notice board (B2), then with real chef numbers from anim.json |

Dropped from the earlier plan: `line_timer` (a ringing timer means "done", the opposite of waiting; B5 now shows the
answer line crawling instead).

## New drawings (11 jobs, 24 sprites)

### Group 1: the building and its cast (B4-B9, the longest stretch of the film)

| Name | What | Beats | Codex | On screen | Pack |
| --- | --- | --- | --- | --- | --- |
| `line_building_q` | Two-storey cutaway, front wall removed. Upstairs (a third of the height): compact kitchen = the graphics card. Downstairs: big staff room = memory, with sofas, lockers, coffee counter, coat rack, and **a small old two-burner stove in the back-left corner = the processor** (Strata computes most missing experts there, FACTCHECK #1). Staircase on the right = copying up. | B4-B8 | 1024x1536 | ~1000 x 1500 in B4-B5; ~760 x 1140 on the right in B6-B8 | `:y` |
| `line_chefs_more` -> `line_chef_b1-6`, `line_chef_r1-6` | Pose sheet of the same six chefs. Top row, on break: 1 flopping backwards onto an (undrawn) sofa (B4's last chef in, room still half empty), 2 stretch-yawn, 3 newspaper, 4 phone, 5 sandwich, 6 coffee mug at his lips (chef 121, about to be called up again). Bottom row: running up stairs, sweat and motion strokes. | B4-B9 | 1536x1024 | ~110 px tall in the building, ~280 px in close-ups | `:c` each |
| `line_manager` -> `line_manager_1-3` | New invented character, the manager who decides who stays upstairs: 1 blindfolded, drawing slips from a chef's hat (rule one); 2 pointing at a blank board on an easel (rule two; code draws the tally); 3 bending over a slip with a magnifying glass (B7 unmask, rule three). | B6-B8 | 1536x1024 | ~520 px tall, lower-left foreground | `:y` each |
| `line_spike` | Order spike with a tall stack of blank slips, a few fluttering down: "our lab kept the order slips". The paper's first page lands on top of the stack. | B7, B8 | 1024x1536 | ~800 px tall, serving-hatch side (world x 1080-2160) | `:y` |

### Group 2: the number heap, the press, the campus, the archive

| Name | What | Beats | Codex | On screen | Pack |
| --- | --- | --- | --- | --- | --- |
| `line_slip_boxes` | Four archive boxes overflowing with blank slips, blank labels (code writes "DeepSeek-V3", "Kimi K2", "Llama 4 Maverick", "Qwen3-235B"). Lids pop and slips fly in B11 ("open data"). | B7, B11 | 1536x1024 | ~1000 x 667 | `:x` |
| `line_heap` | A mountain of blank square tiles: "a giant pile of numbers" (code writes decimals on the front tiles). Shrinks under the press. | B1 | 1024x1024 | ~900 x 900 | `:y` |
| `line_press` | Old screw press with a blank crossbeam band (code writes "Strata" on it): Strata does compress, and it still won't fit. | B1 | 1024x1536 | ~700 x 1050, dropping in from the top | `:y` |
| `line_geisel` | Geisel Library, UC San Diego, with eucalyptus trees and **a blank notice board on the plaza** (a blank slip gets pinned there in red: the teaser for the slips). The diagonal of lit windows is gone (unreadable on a phone). | B2 | 1536x1024 | ~1000 x 667 (y ~560-1230) | `:y` |

If Codex gets Geisel's shape wrong, put a photo the user takes or picks into `art/refs/` and re-run that one job with
`REFNOTE="The attached photo shows the real building: draw it as a line illustration in the style described."`.

### Group 3: the renovation and the payoff

| Name | What | Beats | Codex | On screen | Pack |
| --- | --- | --- | --- | --- | --- |
| `line_building_h` | The same building rebuilt with equal floors (room for half the chefs upstairs, twice the stoves); keeps the small stove downstairs. The pen redraws it over `_q`; same size and position (align roof and ground lines in film.js if Codex shifts it). | B9 | 1024x1536 | as `_q` | `:y` |
| `line_pc_kitchen` | A person typing at a home desk; a gaming PC whose glass side panel holds a tiny two-storey kitchen (chefs upstairs, a crowd and a little stove downstairs). The camera pushes in to the panel. | B10 | 1024x1536 | ~1000 x 1500 | `:y` |
| `line_paper` | One printed first page, upright, curled corners, blank title space, text as lines, a small figure box, an award rosette pinned top-right (code writes the title, subtitle, authors, "Best Paper Award · ISCA 2026"). It lands on top of the spike's stack. | B7 | 1024x1536 | ~600 x 900 | `:y` |

## Summary

| Name | Group | Beat | Codex size | On screen | ink.py |
| --- | --- | --- | --- | --- | --- |
| line_building_q | 1 | B4-B8 | 1024x1536 | ~1000 x 1500 / ~760 x 1140 | :y |
| line_chefs_more -> line_chef_b1-6, line_chef_r1-6 | 1 | B4-B9 | 1536x1024 | 110 / 280 px tall | :c each (sheet_cut.py) |
| line_manager -> line_manager_1-3 | 1 | B6-B8 | 1536x1024 | ~520 px tall | :y each (sheet_cut.py) |
| line_spike | 1 | B7-B8 | 1024x1536 | ~800 px tall | :y |
| line_slip_boxes | 2 | B7, B11 | 1536x1024 | ~1000 x 667 | :x |
| line_heap | 2 | B1 | 1024x1024 | ~900 x 900 | :y |
| line_press | 2 | B1 | 1024x1536 | ~700 x 1050 | :y |
| line_geisel | 2 | B2 | 1536x1024 | ~1000 x 667 | :y |
| line_building_h | 3 | B9 | 1024x1536 | as _q | :y |
| line_pc_kitchen | 3 | B10 | 1024x1536 | ~1000 x 1500 | :y |
| line_paper | 3 | B7 | 1024x1536 | ~600 x 900 | :y |

Not drawn by Codex: the logo (real file), every word (Caveat / ZCOOL KuaiLe hand lettering, including the answer line
"How do I make tomato-egg stir-fry?" / 「西红柿炒鸡蛋怎么做？」), the red-pen marks, the "121" badge, the tally marks, the
10 x 10 score grids (hand-lettered ticks plus small runner sprites), and the real-data highlights (`../film/anim.json`).

### Optional: the bake-off jobs that never ran
`line_servers`, `line_kitchen` and `line_burst` failed on the usage limit (prompts in `../bakeoff/line/art.sh 1`). The
derived stand-ins `line_d_servers` and `line_d_kitchen` passed the bake-off. Re-run the originals only if a full-size
frame of B0 or B3 looks rough next to the new Codex drawings.
