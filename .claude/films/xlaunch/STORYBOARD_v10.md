# Launch film v10 - "Compute Not Included", fast cut (65 s, 1950 frames, 4:5, 30 fps)

Source: `scene/film10.html` (the v8 film is kept whole inside it and replayed through `REMAP` for the shared lab
shots; the new shots are `SHOTX`). Render locally with the kit (`kit/README.md`), v10 is the default.

Why v10: the v9 cut was judged rough - an HTML-looking opening, a cat that popped in and clipped through things,
generic fonts, sticker-like characters, a slow pace, an ending that looked unfinished (template paper, "(not you,
cat)", three plain rings for the logo).

## What changed
- **Pace**: 110 s -> 65 s; most shots are 1-3 s, the remapped lab shots run 2-3x faster.
- **The desk** (opening and ending): walnut (ambientCG Wood026), a warm lamp pool, painted props from Codex
  (`prop_printer`, `prop_tea`, `prop_pen`), real scale (1 unit ~ 15 cm).
- **Clippings**: scissor-cut newsprint, set in Newsreader (a news serif), the back page faintly showing through,
  the next story's headline sliced off by the cut. Stacked with clearance, so no sheet pokes through another.
- **Voice** ("warm nerds"): Instrument Serif for statements, Caveat in red pen for remarks, real ink marks,
  sticky notes as 3D props in the scene (written on as you watch), JetBrains Mono for data.
- **Characters**: sprites relit from their depth relief by the shot's own key and rim, so they sit in the light.
- **Cat continuity**: asleep on the desk from frame 0; the third slam wakes it; it bats the bill, bites it, runs at
  the lens, dives off the desk after it, lands in the engine room asleep on the paper.
- **Ending**: Paper #137 lands on the desk like the clippings did, a finished title page with its byline
  ("You¹ · Yufei Ding¹"); the red pen circles "You", a note says "first author wanted."; then the film's three
  rings fly in and lock into the lab's real logo in 3D (rings, links, the artwork inside each ring and the PICASSO
  wordmark, all from `home/static/PicassoLab-Logo.png`).

## Round 2 (after the first local render)
- **Camera**: one motivated move per shot. Each slam is a cut with a slow push (no whip pans, no shake; one small
  thud when the sheet lands). v8's handheld drift is off. The replayed v8 shots (d1-d3, e0-e3, g2) have their own
  steady cameras (`CAMS_OVER`): each ring is a straight cut and a push, not a swing over from the previous ring.
- **Cut-offs and overlaps**: the cat fully in frame on the desk; the bill no longer folds at its corner; "this
  one." stays inside the frame; the engine-room cat lies on the desk top, clear of the chair; the "markets" clipping
  and the paper #1 note clear Yufei; the backdrop bill is wide enough to stand behind all three rings; the stamps
  no longer pile on each other; nobody is half out of the frame in the toast or the receipt shot; roll-call names
  fade at the frame edges; the cat on Paper #137 is inside the frame.
- **Everyone pictured**: after the flash the team print is joined by six more group photos from `events/static`
  (Christmas, CNY 2026, Fire Spot 4.1, Hezi's defense, the 0725 party, Thanksgiving lunch), and the camera pulls
  back to show them all.

## Round 3 (camera and a second full check)
- **Why it wobbled**: `camRig` eases every segment, so a camera with three or four keys stops at each one. v10's
  cameras now use `camPath`: the keys are waypoints of one smooth spline travelled by arc length under a single
  ease, so every shot is one move (start, travel, settle) and never stops mid-way. Checked numerically with
  `window.__camDump(a, b)` (every frame's camera, no rendering): one motion per shot, no reversals.
- **Camera language**: the opening holds on the sleeping cat before the first clipping falls in; each further slam
  is a cut to a new angle (+-10 degrees), never the same angle shifted; the printer and the rings get slow arcs for
  parallax; the cat leaps off the edge in frame, then the camera dives after the bill, and the engine room opens
  with a crane down the well (the fall continues across the cut); the roll call is one steady truck flowing into
  the pull-back; the logo gets a slow orbit.
- **Second full check, fixed**: the a4 title clear of the cat, the cat's leap in frame, the paper #1 note only once
  Yufei is clear, "timed by Rishabh" under his feet, CHEAPER clear of the person in the ring, the bill's head out of
  frame in f3 (and its stamps fade with it), roll-call names fade instead of un-writing, a stray Paper #137 on the
  logo card (a camera function set it visible), no floor reflection under the logo.

## Round 4
- The red circle on the Best Paper: no flight from behind the page (it started over "Patterns behind Chaos"); the
  red pen now draws it around "Data Movement" in the title, rhyming with the circle on the bill, lifted off the
  curved sheet and drawn on top so no half of it sinks into the paper.
- End card: "We're hiring." with "interns · PhD students · postdocs" (the lab hires broadly), then the handle and
  site, then "*milk tea included".

## Round 5
- **The three answers accumulate**: whoever has been introduced stays in their ring (Zaifeng from e1 on, Zhongkai
  from e2), so the pull-back e4 shows all three (before, only the last one visited was left, a v8 leftover).
- **Roll call in the Team page's order** (yufeiding.ucsd.edu/people/team): Yufei first with her milk tea and the
  cat, then the postdocs, the Ph.D. students, the master's and undergrads, with the group names riding above as the
  camera passes; names fade before the pull-back instead of piling up.
- **End card**: the openings listed by seniority, "postdocs · PhD students · interns".
- **Light**: a warm pool of light on the ring in focus with the backdrop bill falling off into shadow (it was a flat
  grey wall); a softer pool on the bill rows in f4 so they keep their contrast; a breath of warm glow far behind the
  dark sets (the printer, the toast, the roll call, the logo card) for depth; gentler motion blur on camera moves;
  the a4 title waits for the reveal so it never sits on the cat.

## Round 6
- **Opening redesigned**: four predictions instead of three, Jensen Huang added (GTC 2025 keynote, verbatim from the
  Rev transcript, QUOTES_v9.md). Each clipping is now a real newspaper page with a halftone press photo
  (`tools/halftone.py`, `scene/photos/press_*.png`): front pages for Musk and Huang (masthead, date line, headline,
  photo, caption, credit, a column of body text), essay pages for Amodei (round headshot) and Altman (photo beside the
  headline). Photo credits are on each clipping and in the small print: Musk, U.S. Department of Defense (public
  domain); Amodei, TechCrunch (CC BY 2.0); Altman, Steve Jurvetson (CC BY 2.0); Huang, NVIDIA Taiwan (CC BY 2.0); all
  from Wikimedia Commons.
- **GPUs in 3D** (`scene/gear.js`, modelled in three.js and lit by the lamp): at the fourth prediction ten datacenter
  GPU cards rain onto the desk and stack into a tower; a mono counter by the tower counts them ("10 / 100"), the
  red pen adds "need more desk."; the crash wakes the cat. The tower stays on the desk for the bill shots.
- **2D motion graphics** (the type layer, plain canvas): at every slam a shock ring and a burst of ink dots, and the
  quote's key words (verbatim fragments) hit the frame full size, then fly down into the clipping's headline; halftone
  dot wipes hide the big cuts (desk to printer, engine room to lab, lab to the three answers, toast to roll call, photo
  to Paper #137); a slow ripple of warm halftone dots round the logo on the end card and a red-pen underline under
  "We're hiring."; edge grades instead of dark boxes behind the words (f2, f3, e4, h2); print misregistration (the
  cyan and magenta plates knocked off by the hit, settling to a hair) on "FAST. CHEAP. POSSIBLE.", "one prediction."
  and the opening title; a timeline ruler that rewinds under 2026 -> 2013 and brakes on 2013; the chapter number on
  split-flap tiles that flip at each chapter; dashed data streams with packets between the three rings in e4.
- **Painted desk props** (ChatGPT, keyed with tools/key.py): the brass lamp where the desk light is, a mini server rack
  (the lamp browns out when the datacenter clipping lands), the DAY 4,700 tear-off calendar (behind the Altman
  clipping), a succulent, a stack of books.
- **Fixes**: the cat is no longer flat (sprites on the desk lean back to face the camera, and the relight from the
  shot's lamp now actually reaches them); no clipping passes through another (checked with `__deskCheck`); h2 keeps the
  whole title in frame; "tied for gold" is inside the frame; the h1 cat is inside the frame; the logo rings fly in from
  the frame edge (no black second); "*milk tea included" no longer un-writes at the end.

## Round 7
- **The printer and the bill make sense**: the cat no longer bats a painted streamer that is not the bill; it sits and
  watches THE BILL print, then pounces. The close-up (b2) shows only the bill, centred on the circled DATA MOVEMENT
  row with "this one." under it (the bill stops growing so the row stays put), then the bill is yanked out of frame by
  someone off-screen; b3 shows the cat leaping off the desk after it.
- **The paper storm**: wind streaks race through it; as the Best Paper rises, warm god rays break out from behind it
  (kept off the sheet), an anamorphic flare crosses its top edge and gold dust rises round it.
- **Opening**: Musk's sticky note no longer passes through Amodei's clipping (each sheet has its own layer with room
  for the notes; the overlap check is clean on every desk frame); dust turns in the engine-room beam; glints on the
  gold seals.

## Round 8
- **Into the rack** (the fly-through, 2.4 s spliced in after Amodei's note; the film is now 67 s, 2010 frames): the
  camera turns to the mini rack by the lamp and rushes its glass door; a cool flash, and it is flying down the aisle of
  a full-size datacenter (gear.js `hall`: 440 instanced racks whose LED fronts blink per instance in the shader, a
  reflecting floor under perforated tiles, light strips, fibre trays with data packets racing along them, sheets of
  haze, a 2D rush of streaks from the vanishing point); "country of geniuses in a datacenter" rides the aisle with a
  misprint hit; it flies up into the light and the flash cuts to the third prediction.
- d3 now reads "15 at ASPLOS, 15 at ISCA." (the old "ASPLOS 15 = ISCA 15" read like an equation).
- A wall behind the desk (the lamp's warm pool on dark plaster) instead of a black band; the cup moved back; the
  calendar is left off the night desk (it was cut by the frame); each ring in the three answers gets an arc of its share
  of the 136 papers; stronger dust motes, glints and flare.

## Shots
| shot | frames | what happens |
| --- | --- | --- |
| a1-a4 | 0-196 | four verbatim predictions (QUOTES_v9.md) slam onto the desk as press clippings with photos; sticky notes: "collectively = how many GPUs?", "who pays their power bill?", "we're on day 4,700.", "...and 100x the bill."; at the fourth, ten GPUs rain down into a tower and wake the cat |
| a5 | 196-240 | pull back: "The future, as predicted.*" / "*compute not included" |
| b1 | 240-330 | the printer starts by itself: THE BILL, row by row; the cat bats the curl. "Imagining it: free. Running it: see receipt." |
| b2 | 330-368 | close on the bill: the red pen circles DATA MOVEMENT ("this one."); the cat paws it, bites it, bolts |
| b3 | 368-480 | the bill slides over the desk edge, the cat dives after it. "Someone has to make it FAST. CHEAP. POSSIBLE." |
| c1-c3 | 480-690 | the engine room: the cat lands asleep on the bill; one PhD student, 2013; paper #1 |
| d1-d3 | 690-900 | the lab, briefly: 136 publications, by year, by venue |
| e0-e4 | 900-1170 | three answers to the bill: the stamps FASTER / CHEAPER / IN PROGRESS, "...and this one?" |
| f1-f5 | 1170-1500 | plot twist: the Best Paper is a forecast (of where data moves next); "still one milk tea." |
| g1-g2 | 1500-1710 | the roll call in the Team page's order (PI, postdocs, Ph.D., master's and undergrads); the flash turns the crew into the real team photo; "not pictured: you." |
| h1-h2 | 1710-1830 | Paper #137 on the desk, byline, "first author wanted." / "The next one has your name on it." |
| h3 | 1830-1950 | the 3D logo; LAB · UC SAN DIEGO · PROF. YUFEI DING; "We're hiring." postdocs · PhD students · interns; handle and site; "*milk tea included" |
