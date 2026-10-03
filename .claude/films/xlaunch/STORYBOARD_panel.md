# The storyboard panel's plan (reference only)

Four independent storyboards, three judges, one synthesis. The film that was built is `STORYBOARD.md`: it keeps the
desk bookend and the art set in `PROMPTS.md`, and grafts the panel's best beats (the print that flips to Paper #137,
"Yufei Ding, PhD student", "The next one is yours.", the hop that bursts the chart, the cat batting the ring,
"Say hot pot"). Batch 3 of `PROMPTS.md` holds the art for the panel beats still open (the helping hand on the 2020
step, "(Not you.)", the spare milk tea).

# Picasso Lab launch film v8 - "One Paper, Many Hands" (panel synthesis)

4:5, 1080x1350 native, 30 fps, **59 s = 1770 frames**, silent autoplay on X (@PicassoLabUCSD).
v7 texture (curved fibre-bumped papers, soft area light, glossy floor, cyclorama, DOF + bloom + ACES) + the v6 beats
+ a character line woven through every beat. Painted 3D characters stand in the three.js world as billboards (sprite.js).

**Logline.** In 2013 PhD student Yufei Ding stands alone under her first paper. Her touch sets the papers multiplying,
and by 2020 they arrive faster than one person can catch, so four students and the lab cat crash in to help. From then
on the crew builds every chart with their own hands: Leo pulls Yufei up the 2020 wall, a spirit level settles the 15-15
venue tie, the three research directions become portals they stand in, and the Best Paper gets a gold edge and a
milk-tea toast. A self-timer flash turns them into the real Picasso Lab. The photo flips over to a blank
"Paper #137 - You et al.", and the crew leaves a lit spot and a spare milk tea for the viewer before the logo locks.

The panel proposed replacing the desk beats; the built film kept them (see `STORYBOARD.md`).

## How this was chosen

Each of the three judges voted for a different proposal: keynote-wow, founder-arc and feasibility. The base is
**keynote-wow**, which had the highest combined score (247, against 245 for founder-arc and 238 for feasibility). It
contributes the camera grammar, a different physical cause for every transition, the 2020 "growth needs people" turn,
the spirit-level tie, the self-timer and the byline bookend. Grafted onto it:

- **From founder-arc:**
  - The true 2013 origin: Yufei was a PhD student on ProfMig.
  - "Then a few more." / "Then a team."
  - "Paper #137 - You et al." and the cat gag "(Not you.)" before the sincere beat.
  - Research props inside the rings.
  - A reverent Best Paper.
  - Hand anchors.
- **From feasibility:**
  - A named light rig for every new painting.
  - A fixed billboard yaw per shot.
  - No walk cycles.
  - Contact only in camera-facing planes, with the paper bending to meet the finger.
  - Leo reaching down at the 2020 wall.
  - The card flip from the real photo to Paper #137.
- **From ensemble-comedy:**
  - Opaque milk-tea cups.
  - No straight top-down camera over standing cut-outs.
  - The spare milk tea offered to the viewer.

## Shot table

| # | Time (s) | Frames | v6 beat | Papers | Characters | Transition in | Type |
|---|---|---|---|---|---|---|---|
| S1 | 0-5.5 | 0-165 | first paper | ProfMig in the v7 frame-1 light; bends to meet a fingertip | 2013 PhD student Yufei alone, from behind; looks up, touches | light ignition on a fibre macro, rack to the byline | 2013 / It started with one paper. / Yufei Ding, PhD student |
| S2 | 5.5-9 | 165-270 | growth | pages peel off ProfMig at the real yearly rhythm, 2016 = a ripple with no page | young Yufei left behind at the origin, shrinking | touch and peel, the camera rides the page backward | counter 1 -> 18, ticker 2014-2019 / Then a few more. |
| S3 | 9-15 | 270-450 | growth | 2020 volley of 15, then 2021-2026 | Prof. Yufei swamped; Leo slides, Mia rides a page in, Kai rolls in on a chair, Zoe hops in with two cups | volley occlusion wipe hides the time jump | counter 18 -> 124 / Prof. Yufei Ding -> Then a team. |
| S4 | 15-18 | 450-540 | 136 | the 12 undated papers land; v7 frame-2 gallery | crew tiny at NOW, waving | crane-up riding the final volley | 136 / papers. / 2013 - 2026 / NOW |
| S5 | 18-24 | 540-720 | by year | floating stacks 1,2,3,0,3,3,6,15,18,18,12,9,19,15 | cat jumps the '16 gap; Leo pulls Yufei up the 2020 wall; crew on '21-'23; cat at the '25 summit | dolly-zoom fold (depth becomes height) | Year by year. + labels and counts |
| S6 | 24-29.5 | 720-885 | by venue | storm into 8 piles, ASPLOS 15 = ISCA 15 | cat swats the summit; Kai vs Mia glare; Leo's spirit level | the cat knocks it off the table | Top venues. / plates / 15 = 15 |
| S7 | 29.5-37 | 885-1110 | three directions | gold ribbon cools into 3 glass rings; orbits 27 / 61 / 48; 3 representative papers each | Yufei paints; Zoe surfs with both cups level; Mia chip / Kai GPU / Leo wafer inside the rings | brush-stroke wipe across the lens | Three directions. / name / count / 3 titles |
| S8 | 37-42.5 | 1110-1275 | awards | Best Paper slingshots into gold light; 5 honours rise; edges turn gold | glasses glint; Yufei paints gold edges; milk-tea toast (Leo missing) | slingshot whip-pan chase | Best Paper. / ISCA 2026 / +5 more honors. / Lab rule: acceptance = milk tea. |
| S9 | 42.5-46 | 1275-1380 | (team) | honours as the photo backdrop, red blinks on the floor | Leo presses the lens, slides into the gap; cat photobombs mid-air | hand over the lens | Say "hot pot"! |
| S10 | 46-49.5 | 1380-1485 | team photo | the real photo as a curved satin print | none: real people only | the flash becomes the photo | The people behind the papers. / Lab life: lots of hot pot. |
| S11 | 49.5-55 | 1485-1650 | (recruiting) | the print flips to blank Paper #137 in the S1 spot | cat claims the spot, Yufei lifts it out; invite; Zoe offers the spare cup | card flip | Paper #137 / You et al. / (Not you.) / The next one is yours. |
| S12 | 55-59 | 1650-1770 | logo + recruiting | rings descend and interlock: v7 frame 3 | cat bats the red ring, then a clean hold | rings drop in, camera tilts up | Picasso Lab / UC San Diego · Prof. Yufei Ding / We are recruiting PhD students. / @PicassoLabUCSD / yufeiding.ucsd.edu |

Cuts sit on a 0.5 s grid; music will be cut to picture later.

## Shots in detail

### S1 One paper (0-5.5)
- **Papers.** ProfMig (CGO'13) hangs alone in the approved frame-1 look: curved, fibre-bumped, twice Yufei's height,
  its lower edge just above her reach, with far papers in bokeh at 25%. For the macro, the page is re-rendered at 4k
  over a real paper-macro photo texture. At 4.4 s its lower edge bends about 4 cm down to meet her fingertip (a vertex
  bend centred on the contact point) and a light ripple runs up the sheet. At 5.2 s a fresh page peels off toward the
  lens.
- **Character.** Young Yufei, a PhD student, seen only from behind: burgundy oversized hoodie, navy backpack, low
  ponytail, the arm of her red glasses showing. She stands beneath the page looking up (`y13_back_look`), with 1.2%
  breathing and 1 deg of sway. The bright page backlights her into a rim-lit silhouette (Rig B). Her shadow falls
  toward the lens and her soles touch their reflection. At 4.4 s, on a breath, she rises on tiptoe and touches the page
  (`y13_back_touch`), and her rim brightens 60% with the ripple.
- **Camera.**
  - 0-0.8 s: black while the soft box blooms on.
  - 0.8-1.8 s: macro (fov 8 deg, 6 cm off the page) across the fibre, racking to "Yufei Ding" in the byline.
  - 1.8-4.6 s: one crane-back. Dolly back 5 m, drop to her waist height, arc 20 deg right, fov 8 -> 30. It comes over
    her right shoulder onto the frame-1 composition, with Yufei lower right at about 22% of frame height. Billboard yaw
    is fixed at the middle of the arc and pitch change stays under 15 deg.
  - 4.4 s: rack focus to her fingertip.
- **Type.** PICASSO LAB (header, every shot) / **2013** (168 px light) / It started with one paper. (44 px) /
  Yufei Ding, PhD student (34 px grey).

### S2 A few more (5.5-9)
- **Papers.** Each ripple peels a page off ProfMig. It sails over Yufei's head and lands upright (overshoot, settle,
  growing reflection), and the line grows toward the lens as the far end of the S-curve. The rhythm follows the real
  counts: 2014: 2, 2015: 3, **2016: a ripple runs and nothing peels** (a held half-beat), 2017: 3, 2018: 3, 2019: 6.
- **Character.** Young Yufei stays at the origin, watching them fly over (`y13_back_look`), and shrinks into the
  distance. Time passing reads as her getting smaller, and the solitude sets up the team.
- **Camera.** Rides backward with the newest page, low, fov 34, one slot per page. Each page arrives big in the
  foreground and sweeps past the lens edge.
- **Type.** Odometer counter 1 -> 18 (200 px, top-left). The S1 "2013" numeral shrinks into a small year ticker
  (2014 ... 2019) under it. Then a few more. (56 px, bottom-left).

### S3 Then a team (9-15)
- **Papers.** 2020 arrives as a volley of 15 that land upright around Yufei in staccato bursts. 2021-2026 keep landing
  behind the group, and the counter reaches 124 at 2026.
- **Characters.** The occlusion wipe clears on Prof. Yufei (approved design), hands up (`y_surprise`), with the cat
  peeking from behind her legs (`cat_scared`). The entrances come from four directions, about 1.1 s each:
  - **10.2 s, LEO from the left.** He knee-slides across the glossy floor and catches the falling corner of a big page
    on his palm an inch above the floor, and the page rights itself (`leo_slide`).
  - **11.3 s, MIA from above.** She rides a page in like a magic carpet, crouched (`mia_land`), hops off as it tilts
    upright, and lands in a superhero pose with a squash and a ripple in the floor reflection.
  - **12.4 s, KAI from the right.** He rolls in on an office chair, legs out, laughing (`kai_chair`, one rigid pose
    gliding). The pages sway in his wake and he bumps to a stop against one.
  - **13.5 s, ZOE from the back.** She hops in toward camera in small careful hops, sipping her tea with a second cup
    held perfectly level (`zoe_cups`). Nobody asks who the spare is for.
  - **14.5 s.** Yufei leaps with joy (`y_pop`). The arc ends: Leo, Mia, Yufei, cat, Kai, Zoe.
- **Camera.** Medium shot, low, fov 34, characters at 40-45% of frame height, one slow 15 deg arc. Small bump on Mia's
  landing.
- **Type.** Counter 18 -> 124, ticker 2020 ... 2026. From 9.0 to 10.4 s: **Prof. Yufei Ding** (34 px grey), which
  mirrors the S1 subline. From 10.4 s: **Then a team.**

### S4 136 (15-18)
- **Papers.** The 12 undated papers sail in over the crew and land along the edges. The gallery settles exactly on
  v7 frame 2. Hold 17-18 s.
- **Characters.** Tiny at the NOW row (about 1/6 of frame): Yufei waving up (`y_wave`), `leo_peace`, `mia_land`,
  `kai_smug`, `zoe_cups` and `cat_cheer`. Swaps are hidden by the distance.
- **Camera.** Cranes up and back with the volley. Pitch 0 -> -18 deg (within the 20 deg cap), settling on the frame-2
  composition.
- **Type.** **136** (rolls 124 -> 136) / papers. / 2013 - 2026 / NOW.

### S5 Year by year (18-24)
- **Papers.**
  - The gallery folds. Each year's row tips down and squares into a floating stack of flat sheets, with 8 cm of air
    between sheets, soft shadows between layers and a real title on each top sheet.
  - There are 14 stacks, heights 1, 2, 3, 0, 3, 3, 6, 15, 18, 18, 12, 9, 19, 15.
  - '16 is an empty slot with a "0" on the floor. The 12 undated papers drift, dimmed, far behind.
- **Characters.**
  - 19.5 s: the cat on '15 sizes up the empty '16 slot (`cat_sit`), leaps it (`cat_jump`) and lands with a squash.
  - Yufei hops '17 -> '18 -> '19 (`y_pop` mirrored in the air, `y_land` mirrored on each landing).
  - 20.5 s, **the 2020 wall** (6 -> 15, a chest-high step). On tiptoe she can't reach (`y_reach_up`). Leo kneels on top
    of '20 and reaches down (`leo_reach_down`), and their hands meet in one camera-facing plane. After a 6-frame
    vertical whip with stretch, she lands beside him (`y_land`). She is no longer climbing alone.
  - 22 s: the truck passes Mia on '21 (`mia_land`), Kai on '22 with fists on hips (`kai_smug`) and Zoe on '23
    (`zoe_cups`). The cat bounds up to the '25 summit (`cat_jump`) and sits (`cat_sit`).
- **Camera.**
  - 18-19.5 s: a 90 deg arc plus a dolly zoom (fov 34 -> 24), papers only. The crew leaves frame in the first 20 deg.
  - 19.5-23 s: perpendicular side truck, 10 deg above the stack tops. Billboard yaw is fixed at the middle of the
    path (within +-20 deg), and two soft loose sheets drift past the lens.
  - 23-24 s: dolly back to a wide of the whole chart.
- **Type.** Year by year. (64 px) / floor labels '13 ... '26 (30 px) / counts popping above the stacks (40 px bold),
  with "19" highlighted in the wide.

### S6 Top venues (24-29.5)
- **Papers.**
  - The summit sheet slides off '25 and hits '26, and the staircase bursts upward into a storm.
  - The sheets flutter down on falling-leaf paths into 8 piles on labelled floor plates in a shallow arc: ASPLOS 15,
    ISCA 15, MICRO 9, NeurIPS 6, OSDI 5, SC 5, ATC 5, ICML 4.
  - The other 72 settle as a dim scatter behind. ASPLOS and ISCA count up in lockstep.
- **Characters.**
  - 24.0 s: the cat paws the top sheet off (`cat_jump`, paw raised). During the descent it lands on ICML, the one pile
    its size (`cat_sit`, small).
  - At eye level: Kai left of ASPLOS (`kai_smug`) and Mia right of ISCA (`mia_glare`) glare across the towers while
    sheets fall in front of them.
  - 27.2 s: Leo hops in between and, on tiptoe, lays a long yellow spirit level across both tops (`leo_level`). It
    tilts +-3 deg and settles. The push-in finds the bubble dead centre, and Kai and Mia freeze.
- **Camera.**
  - 24-24.6 s: tilt up into the storm.
  - 24.6-26.4 s: 40 deg high angle, never top-down, papers only.
  - 26.4-27.2 s: crane down to eye level (pitch under 10 deg).
  - 28.2-29.5 s: push-in and rack to the vial.
- **Type.** Top venues. / plates: ASPLOS 15 · ISCA 15 · MICRO 9 · NeurIPS 6 · OSDI 5 · SC 5 · ATC 5 · ICML 4 /
  **15 = 15** (120 px).

### S7 Three directions (29.5-37)
- **Papers.**
  - The gold ribbon's three loops cool into glass rings standing on the floor in a row: blue, green, red. Each bottom
    arc dips under the floor so the reflection completes the circle.
  - Sheets peel off the piles into an orbit band around each ring: Quantum computing 27, Machine learning systems 61,
    Architecture & compilers 48.
  - Per visit, three representative papers swing to the front: OnePerc, EQC, Qubrio / EVT, FlashEvolve, AsymHP /
    Patterns behind Chaos, AMMA, ScaleSim.
- **Characters.**
  - The wipe reveals Yufei in follow-through with the giant golden brush (`y_follow`). The painted gold arc hands off
    to the 3D ribbon at the projected brush tip, and she paints loops two and three (`y_paint_air`).
  - Zoe surfs a paper along the row with both cups level (`zoe_surf`). The camera is locked to her: her paper slows
    at each ring and slingshots on to the next.
  - Inside each ring, standing on the floor: **Mia** raises a glowing quantum chip (blue, `mia_qubit`), **Kai** hugs a
    three-fan GPU like a pet (green, `kai_gpu`), **Leo** tilts a rainbow wafer (red, `leo_wafer`).
  - Ring colour reaches the sprites only through the uTint/uRim uniforms.
- **Camera.**
  - 29.5-31 s: wide, frontal, a small crane up as the loops form.
  - 31-37 s: lateral truck parallel to the row, locked to Zoe, who holds the lower-left third. It eases to a stop at
    each ring (about 2 s each) and accelerates with her between rings: the background streaks and she stays sharp.
  - Each stop racks from the student to the three titles. Students stay within +-18 deg, and the camera never orbits
    a character.
- **Type.** Three directions. / Quantum computing (56 px blue) + 27 papers (40 px) + OnePerc · EQC · Qubrio (32 px).
  The green and red visits follow the same pattern.

### S8 Best Paper (37-42.5)
- **Papers.**
  - Patterns behind Chaos (ISCA 2026) slingshots out of the red orbit and lands upright at hero scale in a warm gold
    spotlight, with a gold rim on its curl.
  - Five more honoured papers rise behind it on pedestals of light: EQC (ISCA'22 nominee), the DAC'22 nominee, the
    OOPSLA'20 Distinguished Paper, and OnePerc and EVT (ASPLOS'24 Distinguished Artifacts).
  - Their top edges turn gold one by one, and a tag appears on each floor plate.
- **Characters.**
  - 37.8 s: crash-zoom on Yufei adjusting her glasses, the gold page glinting in her lenses (`y_glasses_gold`).
  - 38.5 s: she leaps along the row (`y_leap`), painting the gold edges (`y_brush`), with the brush tip driving the
    gold.
  - 40.5 s, the toast: Yufei (`y_toast`), Mia and Kai (`mia_toast`, `kai_toast`, each with its own hop and squash),
    Zoe sipping with the spare level (`zoe_cups`), and the cat (`cat_cheer`). A gold flare lifts the sprites' light 40%
    for 6 frames.
  - **Leo is missing** (setup for S9). The brush-to-cup swap happens while Yufei is out of frame.
- **Camera.**
  - 37-37.8 s: whip-pan chase after the flying page (3 motion-blur sub-frames).
  - 37.8-38.5 s: crash-zoom, fov 30 -> 12 in 6 frames.
  - 38.5-40.5 s: dolly along the row at paper-top height.
  - 40.5-42.5 s: low 3/4 rising pull-back.
- **Type.** **Best Paper.** (96 px gold) / ISCA 2026 · Patterns behind Chaos / +5 more honors. (with gold floor tags:
  Nominee · ISCA'22, Nominee · DAC'22, Distinguished Paper · OOPSLA'20, Distinguished Artifact · ASPLOS'24 x2) /
  **Lab rule: acceptance = milk tea.**

### S9 Self-timer (42.5-46)
- **Papers.** The six honoured papers are the backdrop. Red self-timer blinks wash across the floor.
- **Characters.**
  - Leo's palm covers the lens and pulls back: his face looms as he presses, tongue out (`leo_press`). He ducks out
    left.
  - The line-up: Mia and Kai (`mia_toast`, `kai_toast`), Yufei centre (`y_toast`), Zoe (`zoe_cups`), and a gap.
  - Blinks at 43.8, 44.4 and 45.0 s. At 44.2 s Leo **knee-slides into the gap** (`leo_slide`, a callback to his
    entrance).
  - At 45.1 s the missing cat leaps in from the right (`cat_jump`). **The flash fires at 45.5 s with it mid-air**: the
    photobomb.
- **Camera.** We are the self-timer: black, then an extreme close-up of the finger, then a locked tripod POV at chest
  height (fov 36) with a tiny settle wobble. All billboards within +-12 deg.
- **Type.** Say "hot pot"!

### S10 The people (46-49.5)
- **Papers.** The real 1200x900 team photo (16 people outside The Fire Spot) appears where the line-up stood, as a
  curved satin print with a white border and a floor reflection. It develops from overexposed to full colour in about
  1 s.
- **Characters.** None. The flash matches only the horizon and the group silhouette, never person to person.
- **Camera.** A slow push-in (6% or less) with an 8 deg arc, never past the photo's native resolution.
- **Type.** The people behind the papers. (56 px) / Lab life: lots of hot pot. (34 px).

### S11 The next one (49.5-55)
- **Papers.** The print turns over on its vertical axis, the light sliding across its curve. Its back is a blank 4k
  sheet: **Paper #137 / You et al.**, with a blinking cursor in the abstract. It settles exactly where ProfMig hung in
  S1, with the 136 faint in bokeh far behind.
- **Characters.**
  - Beneath the page, the empty pool of light where the 2013 student stood.
  - 51.0 s: the cat hops in and sits smugly (`cat_jump` -> `cat_sit`).
  - 52.0 s: Yufei lifts it out at arm's length, one eyebrow raised (`y_hold_cat`): **(Not you.)**
  - A stray page drifts across the foreground and hides the swap, then a beat of stillness.
  - 53.3 s: Yufei opens her palm to the empty spot (`y_invite`), the cat at her feet (`cat_sit`). Zoe holds the spare
    milk tea straight out to the lens (`zoe_offer`): it was always for you.
  - Behind, in soft focus: `leo_peace`, `mia_toast`, `kai_toast`.
- **Camera.** The exact S1 framing, mirrored for the viewer: same lens, height and page position, with the spot in the
  lower third. A tiny push toward the spot and the cup.
- **Type.** On the page: Paper #137 / You et al. / (Not you.) (40 px grey) / **The next one is yours.** (64 px).

### S12 End card (55-59)
- **Papers and characters.**
  - The three glass rings descend and interlock into the logo with a glint and bloom: v7 frame 3.
  - At 55.8 s the cat springs up from below frame and bats the red ring (`cat_jump`). The ring wobbles on a damped
    spring and settles.
  - Clean hold from 56.5 s.
- **Camera.** Tilts up about 25 deg from a fixed position, focus pulled from the page to the rings, then locked off.
- **Type.** Picasso Lab (104 px) / UC San Diego · Prof. Yufei Ding / We are recruiting PhD students. /
  @PicassoLabUCSD (blue gradient) / yufeiding.ucsd.edu.

## Character arcs

- **Yufei.**
  - Alone in 2013, a student who starts it all with one touch.
  - Swamped by success in 2020, then joyful when the team arrives.
  - Can't climb the 2020 wall alone and is pulled up by Leo: the heart of the film.
  - Paints the three directions into being, gilds the honours, toasts with milk tea.
  - Lifts the cat out of the empty spot and invites the viewer into it.
- **Leo (calm lead).** Slide-catch entrance, pulls Yufei up, settles the tie with a spirit level, holds the wafer
  (architecture), sets the self-timer, and slides into the photo (callback).
- **Mia (tiny, fierce).** Rides a page in and lands like a superhero, glares at Kai over the tie, raises the quantum
  chip.
- **Kai (mischief).** Rolls in on an office chair, smug about his tower, hugs the GPU like a pet, thumbs-up toast.
- **Zoe (cautious).** Always carries a spare milk tea, surfs the orbits without spilling a drop, and finally offers
  the spare to the viewer.
- **Cat (chaos).**
  - Hides from the volley and jumps the 2016 gap.
  - Knocks the staircase off the table, causing the venue storm.
  - Claims ICML, photobombs the picture, claims the empty spot ("Not you.").
  - Bats the logo ring.

## Transitions (12, each a different physical cause)

1. Light ignition: the soft box blooms on over a fibre macro and racks to the byline.
2. Touch and peel: the fingertip ripple peels a page toward the lens, and the camera rides it.
3. Volley occlusion wipe: a 2020 page tumbles into the lens, hiding the time jump.
4. Crane-up riding the final volley.
5. Dolly-zoom fold: depth becomes height as the rows lie down into stacks.
6. The cat knocks it off the table: a chain reaction bursts into a storm.
7. Brush-stroke wipe: the gold ribbon sweeps the lens and loops into rings.
8. Slingshot: a whip-pan chases the flung Best Paper into its spotlight.
9. Hand over the lens: Leo's palm, and then we are the self-timer.
10. The flash becomes the photo.
11. Card flip: the photo's back is Paper #137.
12. The orbits come home: the rings drop in and the camera tilts up to meet them.

## On-screen type (Inter, v7 editorial)

- **Layout.** Left-aligned with a 72 px margin and a small tracked PICASSO LAB header. The end card is centred, as
  approved.
- **Sizes and length.** Headlines 56-64 px, numbers 120-200 px, sublines 32-44 px, diegetic floor tags 26-30 px. At
  most 6 words per line and two lines at once, each held at least 1.5 s.
- **Data.**
  - The running total climbs 1, 3, 6, 6, 9, 12, 18, 33, 51, 69, 81, 90, 109, 124 through 2026. The 12 undated papers
    arrive in S4 (124 -> 136) while the ticker becomes "2013 - 2026".
  - The top 8 venues hold 64 papers; the other 72 are scatter. 27 + 61 + 48 = 136.
  - "ATC" is the short label for USENIX ATC. Award labels use the exact names.

## Art

**New images: 23 planned + 1 reserved = 24.** Generate in the ChatGPT/Codex flow from `PROMPTS.md`, with references
y_ref3d.png, cast.png and cat_cheer.png.

### Common spec for every new image
- Pixar-quality 3D render matching the references, full body with a margin under the shoes.
- Flat #00FF00 background: no floor, no ground shadow, no text.
- Portrait 1024x1536. The two sheets are landscape 1536x1024 and the cat is square.
- **No green props or green light** (they key out). The green ring glow is added in the shader.
- Milk teas are **opaque and tea-filled**.
- Hands are empty wherever a 3D paper attaches.

### Light rigs
- **A, studio.** Large soft warm-white key upper front-right, strong cool-blue rim behind-left, faint warm kicker,
  very little fill.
- **B, backlit.** The only strong source is in front of and above the character, away from the camera, giving a
  bright rim; the back is in soft shadow.
- **C, ring.** Low warm key, a blue or red glow from the prop and from in front, cool rim.
- **D, award.** Warm gold spotlight from directly above, cool rim from behind.

| name | who | rig | used in | pose (short) |
|---|---|---|---|---|
| y13_back_look | Yufei, 2013 PhD student | B | S1, S2 | from behind, burgundy hoodie + backpack, looking up |
| y13_back_touch | Yufei, 2013 | B | S1 | same framing, tiptoe, finger up (anchor: fingertip) |
| y_reach_up | Yufei | A | S5 | 3/4 facing right, tiptoe, both arms up for a hand |
| y_toast | Yufei | D | S8, S9 | milk tea raised, hand on hip, laughing |
| y_hold_cat | Yufei + cat | A | S11 | cat held out at arm's length, eyebrow raised |
| y_invite | Yufei | A | S11 | palm open toward screen-left, eyes to lens |
| y_glasses_gold | Yufei | edit of y_glasses | S8 | relit: gold page in her lenses, star glint |
| leo_slide | Leo | A | S3, S9 | knee slide right, palm up just above the floor |
| leo_reach_down | Leo | A | S5 | kneeling at a ledge, reaching down-left |
| leo_level | Leo | A | S6 | front, tiptoe, long yellow level overhead, amber vial |
| leo_wafer | Leo | C red | S7 | rainbow 300 mm wafer at chest |
| leo_press | Leo | A | S9 | waist-up close-up, finger at the lens, tongue out |
| leo_peace | Leo | A | S4, S11 | front, peace sign, hand in pocket |
| mia_land | Mia | A | S3, S4, S5 | superhero landing (also crouched on the gliding page) |
| mia_qubit | Mia | C blue | S7 | glowing quantum chip at eye level |
| kai_chair | Kai | A | S3 | rolling left on a mesh office chair, legs out, laughing |
| kai_gpu | Kai | A (no green) | S7 | hugging a three-fan GPU like a pet |
| zoe_cups | Zoe | A | S3, S4, S5, S8, S9 | sipping, spare cup held level |
| zoe_surf | Zoe | A | S7 | low surf crouch, both cups level |
| zoe_offer | Zoe | A | S11 | spare cup held straight out to the lens |
| toast_sheet | Mia + Kai | D | S8, S9, S11 | split into mia_toast / kai_toast; wide green gap |
| rivals_sheet | Kai + Mia | A | S4, S5, S6 | split into kai_smug / mia_glare; glaring across the gap |
| cat_sit | Cat | A | S5, S6, S11 | upright, smug, compact |
| (reserve) | - | - | - | one relight, by image edit, of whichever existing pose fails the still test (likely y_paint_air or y_surprise) |

**Reused existing poses (11):** y_surprise, y_pop (also mirrored), y_land (mirrored), y_wave, y_follow, y_paint_air,
y_leap, y_brush, cat_scared, cat_jump, cat_cheer. The real team photo appears only in S10/S11. The existing warm poses
get a shader grade (saturation 0.85, cooler rim, darker feet) and are never shown larger than about 45% of frame
height.

Sheets are cut by connected components in key.py, so every character is its own sprite with its own bob. There are
no static group billboards.

## Production rules
- **Scale** (in Yufei heights): Yufei 1.0, Leo 1.3, Kai 1.1, Zoe 0.92, Mia 0.8, cat 0.35.
  - Gallery pages are about 2.0, and the hero sheets (ProfMig, Best Paper, Paper #137) are about 2.4.
  - Year stacks use 8 cm of air per sheet, so the 2020 step is chest-high.
  - Venue-pile spacing is set so a 15-sheet top sits exactly at the painted level's height in leo_level.
- **Billboards.**
  - Fixed yaw per shot, aimed at the middle of the camera path. Relative yaw 20 deg or less (never more than 35).
  - Pitch change 20 deg or less while characters are visible. No top-down view over standing sprites (S6 uses a
    40 deg high angle with papers only).
  - The camera never orbits a character. Its big moves happen with characters off-frame, tiny, or locked-on (Zoe in
    S7).
- **Grounding.**
  - Alpha-tested (0.5) depth for the cast shadows, with the shadow light within 35 deg of each billboard's normal.
  - Soft contact blob, soles sunk 2-3 mm, a reflection in the glossy floor, and 1.2% breathing plus 1 deg of sway on
    every idle sprite.
- **Locomotion.** No walk cycles. Characters move only by:
  - hops with squash
  - Leo's knee slide
  - Kai's chair roll (one rigid pose)
  - Mia's page ride
  - Zoe's surf
  - the cat's leaps
  - the 6-frame whip in S5

  Pose swaps land on motion peaks, behind foreground pages, inside smears or under the flash.
- **Contact.** Contact happens only in camera-facing planes:
  - the S1 page bends to meet the fingertip
  - Leo's palm sits under the page corner in S3
  - Leo's and Yufei's hands meet in one plane under a perpendicular camera in S5
  - the level is painted and the tower heights are matched to it
  - Zoe's foot line sits on her page's surface
  - the brush tips drive the 3D ribbon and the gold edges

  Each of these sprites records a hand-anchor UV.
- **Resolution.**
  - ProfMig and Paper #137 are re-rendered at 4k, with a real paper-macro photo texture, before the camera comes closer
    than about 0.5 m.
  - The team photo is never magnified past native.
  - leo_press and y_glasses_gold are painted as close-ups.
- **People.** The four students are original characters. Real members appear only in the untouched photo, captioned
  "The people behind the papers.", with no cartoon-to-person mapping.
- **Render.** 1770 frames at 30 fps (about 2-4.5 h on 4 cores). At most 7 sprites per shot. Motion-blur sub-frames
  only on the S8 whip, the crash-zoom and the S9 exits. Proof at 540x675 on every 3rd frame, and stills of each shot at
  desktop and phone size, before the full render.

## Risks and fixes
- **Pasted-on look.** Light rigs per painting, plus the shader grade, rim and event-driven light (ripple, gold flare,
  flash), and the same bokeh, bloom, ACES and grain as the papers. One reserve image covers a relight.
- **Off-model art.** Generate each character from its reference plus its previous approved pose. Young Yufei appears
  only from behind (approve y13_back_look as a still first), and her burgundy hoodie keeps her silhouette distinct from
  Leo's grey. Review a contact sheet before animating.
- **Keying.** No green props or light, opaque cups, despill and a 1 px choke. The two sheets need a wide gap.
- **Busy frames.** One active character per beat, entrances about 1.1 s apart from four directions, papers in focus
  for at least half of every shot, and the type zones kept clear.
- **Data.** Real counts only. 2016 = 0 is shown honestly (a silent ripple, an empty slot) with no joke caption.
- **Cut order if pacing is tight:**
  1. the S8 glasses crash-zoom (0.7 s)
  2. the S12 ring bat
  3. the cat on ICML in S6

## Considered and left out
- The AoE 23:59:59 sprint: it is a non-data beat in a full 59 s.
- The office-chair bookend: prop geometry across three generations would not match.
- The OPEN-neon portal: it would mean a 7x upscale.
- Three surfers: generic.
- Mia kicking off the Best Paper: it trivialises the award.
- The hot-pot ensemble painting: a flat slide.
- The Hezi Zhang and roles lines: too much small text.
- A front-facing young Yufei: face drift.
