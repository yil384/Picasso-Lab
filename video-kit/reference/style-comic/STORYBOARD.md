# Qubrio: "The Convoy Job" (comic-book 3D, 15 s seamless loop, 360 f @ 24 fps), as built

Logline: a sleepy lattice of atoms has to pair up for one Rydberg flash. Three tiny brass heroes (the compiler's
agents) pull it off in one move. The Compass picks the atoms, the Fork hauls them over as a single convoy, and the
Stopwatch fires the pulse, then snips the schedule down to 4.7x shorter.

World: one real three.js set, rendered through runtime/npr as "comic x engraving x watercolour". It is a cream chip
slab on a periwinkle optical table: teal storage wash on the left, violet entanglement band on the right, a brass
objective lens hanging over the band, and a painted sunburst cyclorama behind. The camera lives inside the set and
never stops. Look: two-step cel with Ben-Day dots on the characters, burin hatching on the set's shade sides, cast
shadows drawn as engraved hatch, watercolour washes and granulation, boiling ink at 12 drawings/s, and off-register
colour plates. Palette arc: lavender dawn -> ochre action -> night (lights down) -> hot pink ZAP -> gold triumph ->
lavender.

Cast (original designs):
- Atoms (27): cream pearls with minimal baked faces (sleep, awake, surprised, whee, love, sparkle, squint, yawn).
  Their centres are rigid; all acting sits on top.
- The Compass (placement): a brass drafting divider in a red cape. It walks by pivoting 180 deg round one planted
  tip. Silhouette: tall inverted V.
- The Fork (routing): a steel-blue tuning fork in a domino mask. Its tines are its arms. Silhouette: Y.
- The Stopwatch (optimize): a brass pocket watch whose dial is its face, with stubby legs and a scissor hand.
  Silhouette: round.

| # | frames | event -> reaction | camera | out |
|---|---|---|---|---|
| A | 0-58 | Compass walks the storage row; each landing TICKs a column (14/26/38). The column pops up with a red "!" and an ochre target ring. Hop + spin, lands, points at the Fork | low tracking dolly, dutch, rises with the hop | whip pan right (58-70) |
| B | 70-100 | Fork crouches, THWIPs the ochre AOD threads onto the 3x3 block (72-80); reins snap taut (88) with a twang; leans back and hauls | close on Fork -> tug-of-war wide (Fork right, block left) | whip (100-111) |
| C | 100-144 | CONVOY: the whole block glides as ONE rigid AOD move (92-132). Lanes spread, columns and rows accordion, and it docks cheek-to-cheek with its partners. WHOOSH; movers "whee"; partners jolt awake with "!" | truck alongside at convoy speed, speed lines | Stopwatch hops in from off-screen right (126-144), lands with dust puffs |
| D | 144-181 | Lights go down (160-174): the lab turns to night, a warm follow-spot stays on the Stopwatch. It turns to camera, squats, winds up, and slaps its crown (176). The lens charges pink and the beam drops (176-181) | settles round to a low hero angle, then DOLLY-ZOOM (158-178): fov 27 -> 66 deg with the watch held at constant size, so the lab stretches away behind it; concentration lines close in | FLASH CUT under 2 impact frames (182-183) |
| E | 182-222 | ZAP!: global Rydberg pulse over the band. The key light swings overhead so every shadow snaps under its atom, then relaxes (181-215). Pairs turn sparkle-eyed, and pink ligatures with hearts draw on between partners only. Storage atoms flinch | high 3/4 over the whole zoned chip, slow push-in, shake | swing down to the front strip (210-226) |
| F | 222-262 | Stopwatch kicks a paper roll, and a long teal schedule tape unrolls along the front (224-244). It leaps with scissors: SNIP (254). The long tail flies off | along the tape in deep perspective, whip back for the snip | continuous |
| G | 262-312 | "4.", "7" and "x" fall as extruded 3D block letters and SLAM (266-272, impact frame + concentration lines). The short stub pops up as a card: "Qubrio" hand-lettered in cream on teal. Stopwatch hops onto the 7, and the team cheers with out-of-phase hops. The Compass points at the number | HERO ORBIT round the team (az +0.34 -> -0.26): the 3D letters slide across the set with real parallax | whip pan home (312-326) |
| H | 312-360 | Convoy glides back into storage; pairs' ligatures pop; atoms yawn and fall asleep one by one; the Compass walks back in | settles to the frame-0 rig | seamless into A (f360 == f0, pixel-identical) |

Text: "Qubrio" once (hand-lettered on the tape stub) and "4.7x" as extruded 3D letters. The SFX are WHOOSH, ZAP!
and SNIP!, built from hand-authored stroke skeletons, with no web font. There are no borders, panels, charts or
titles.

Physics: the movers are the row x column intersection of the AOD. Moves are rigid min-jerk; rows and columns spread
but never cross or reorder; lanes avoid non-partners. Pairs form only at interaction distance inside the
entanglement band, under one global pulse from the objective. The loop closes on the same layout.
