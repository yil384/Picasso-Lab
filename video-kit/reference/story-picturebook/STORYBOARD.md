# Qubrio — "The Convoy" (picture-book film, painted 3D) — v2 as built

15 s loop, 360 f @ 24 fps, 96 BPM (1 beat = 15 f). Frame 360 == frame 0 (render hash of f360 equals f0).
World = one real three.js set (a navy chip plate with a brass rim on a wooden lab bench, painted cyclorama behind),
rendered through runtime/npr (watercolour picture-book base + engraved hatching in the cores + comic hits).
Faces, emotes, pencil arcs, ligatures, wind swooshes, the margin note and the painted "4.7×" are 2D ink tracked
to 3D points.

## Cast (original)
- **Atoms** (18 qubits): cream pearls hovering on light pedestals (teal = static SLM trap, ochre = AOD grip).
  Minimal faces: dot eyes, a mouth only when emoting; the eye shape carries the emotion.
- **Pip** (placement agent): a drafting compass with a coral head and two steel legs (needle + pencil). It walks
  by pivoting one leg round the other and measures partners by swinging an arc (the interaction distance).
- **Rook** (routing agent): a small teal locomotive riding the ochre AOD rail at the head of the convoy. The brass
  nameplate on its cab reads "Qubrio", the only appearance of the word.
- **Tick** (optimize agent): a brass stopwatch with gloves and a baton. It conducts the Rydberg downbeat and
  clicks the time; its hand stops at 1/4.7 of a turn.
- **Slo** (the baseline, new in v2): a putty snail with a lilac log-spiral shell, hauling ONE sleeping atom along
  the bench's front lane. It moves less than one atom-width in 15 s. It is the running gag of the race, and a
  pencilled margin note says "baseline".

## Honesty
- Atom centres move only by rigid AOD moves. Rows stay fixed on their rails; the 4 selected columns shift right
  together (minimum-jerk), contracting pairwise but never crossing (the order 2<3<4<5 is preserved).
- The convoy is rows {0,1} × cols {2,3,4,5}: 8 atoms in ONE move. The baseline carries one at a time.
- The Rydberg pulse is global over the entanglement zone; only the 4 adjacent pairs light up.

## Shots
| frames | shot | action (one read at a time) | camera | out-transition |
|---|---|---|---|---|
| 0–63 | S1 Match | The storage lattice sleeps (breathing, painted z's). Pip wakes with a "!", strides in (pivot walk, on twos) and plants its needle by atom 2. It swings the pencil leg: an ochre arc lands on atom 3, a tap, and both atoms do a take (squint, stretch, eyes pop), glance and blush. The second pair (4,5) goes the same way, faster, and the row-1 partners wake in a stagger. Slo and its cargo atom creep into the bottom-right corner. | continuous "home" path: slow crane-down and push-in, drifting right with Pip | the camera carries right |
| 64–155 | S2 Convoy / race | Pip points; the pencil marks are rubbed out. Rook wakes, bounces, squashes and TOOTS (3D steam puffs; a 7% camera punch-in). Slo, in the foreground beside it, jumps ("!") and braces. The ochre rails draw on, 8 cones turn ochre, and the atoms crouch and squeeze their eyes (anticipation). The whole block glides into the violet zone in one 42-frame min-jerk move, stretching and grinning, with speed lines. The gust lifts Slo and spins it once round (painted wind swooshes). The cargo atom jolts awake, and both end up with spiral dizzy eyes. "baseline" is pencilled beside it. The pairs land: squash and wobble, cheek bump, blush. | truck to Rook (3/4 front) with the snail in the lower-left foreground, then dolly alongside the convoy at its speed (fov 30→34→31), leaving the snail behind | whip pan (smear) |
| 156–229 | S3 Downbeat | Tick, on its podium, raises the baton (tiptoe, squint) and the pairs turn to each other. DOWNBEAT: a rose light sheet sweeps the zone (moving painted light), then a two-frame black-and-white impact frame, a spiky pink-and-cream 3D flash burst behind Tick, concentration lines and a shake, and a brief comic look (Ben-Day dots). Ink ligatures tie each pair and their eyes become sparkles, then hearts. The storage atoms squint (secondary action). Tick bows. | whip in, slow push, 8% punch on the hit | a fast push-in |
| 230–299 | S4 4.7× | Close on Tick: it presses its crown, CLICK, and the hand stops at 1/4.7 of a turn. A 3D sunburst flat pops up, and "4.7×" is painted on stroke by stroke over a yellow burst, with a shake. Tick leaps with star eyes. Two paper-confetti cannons just out of shot fire real 3D chips that tumble (the cel ramp flickers them) and flutter down through the ≥1.2 s hold. | low push-in, slow orbit, shake on the click and the slam | brush wipe (violet/indigo; the cut happens under full cover at f306) |
| 300–359 | S5 Home | Rook reverses and the convoy glides home (the pairs spread back), sweeping past Slo again: its stalks blow the other way and it sweats. The rails un-draw, the cones turn teal, and the atoms yawn and fall asleep one by one. Pip walks back left and folds up. Slo keeps inching. | "home" path wide → push-in, arriving exactly at frame 0's pose and velocity | seamless loop |

Poster: the 4.7× hold (f276).

## v2 changes vs v1 (snaps/v1_*, snaps/v1_code)
- Added the baseline race. Slo moved from a hidden back lane to the foreground front lane (z = 2.62, never occluded
  by the atoms), scaled ×1.3, with the shell winding fixed so it lights correctly. Its acting: the toot take,
  the gust spin with a hop, the dizzy wobble, and the S5 gust. The cargo atom has its own face track.
- Slime trail: the 2D ink trail was removed, because it drew a stray line across the atoms and Pip. It is now a
  3D wavy ribbon on the bench (same surface id as the bench top, so it has no outline), revealed by drawRange.
- Hit flash: the empty pink "speech balloon" was replaced by a 26-spike pink burst with an 18-spike cream core.
- Confetti: 80 tumbling 3D paper chips (7 shared painted materials), fired by off-screen cannons.
- Pip's pencil arcs are rubbed out at f68–78, so they never cross the foreground snail.
- Added a toot punch-in and a spiral 'dizzy' eye, and removed Tick's pointing at the (now absent) snail in S4.
