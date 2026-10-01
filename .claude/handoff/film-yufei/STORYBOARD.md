# Yufei — "Picatso" (Team page avatar short, double-click to play)

Plays INSIDE Prof. Yufei Ding's round avatar on the Team page (https://yufeiding.ucsd.edu/people/team) when a visitor
double-clicks / double-taps her photo. The avatar circle is 200 CSS px on desktop and as small as 135 px on small tiles;
the video is square and the circle crops it (border-radius 50 %).

## Specs
- Square: design 960 x 960, final output 480 x 480, 24 fps, **192 frames = 8.0 s**, NOT a loop.
- **Frame 0 and the last ~8 frames are exactly the photo** (`people/static/yufei.webp`, 512 px, drawn to fill the square
  exactly like the `<img>` with object-fit: cover) so the film starts and ends seamlessly on the photo in the tile.
- Everything that matters stays inside the inscribed circle (radius 480 design px; keep key content within ~420 of the
  centre). Corners are cut off by the circle.
- Must read at 135-200 CSS px: 2-3 bold elements per shot, ink >= 6 design px, lettering >= 110 design px tall, big
  silhouettes, high contrast. No small text.
- Look: the series' **3D comic** (video-kit `reference/style-comic`, the NPR stack: cel ramp, ink hull + edge ink with
  wobble, halftone, offset print, paper grain), hand-lettered SFX from brush strokes, comic camera (whips with smear and
  speed lines, crash zooms, dutch angles, iris / paint wipes; never dissolves). No emoji, no UI panels, no glossy
  default three.js, no generic glow haze.
- Silent (muted video).

## Who she is (facts to stay true to)
Prof. Yufei Ding, Associate Professor, CSE, UC San Diego, founder of the PICASSO Lab; B.S. in Physics (USTC), Ph.D.
(NC State); research: programming frameworks / compilers for quantum computing and ML systems that are high-performance
and high-fidelity (taming hardware noise). Her avatar effect already uses a San Diego sunset and her white cat; the cat
is her sidekick here. Keep it affectionate and flattering: she is the calm genius, the cat is the comic relief.
No numbers anywhere (none would be verifiable).

## Beats (frame ranges at 24 fps)
1. **f0-12 (0.0-0.5 s) The photo becomes a comic panel.** f0-3 the exact photo; an ink burst ring closes in from the rim;
   by f12 her photo is a comic panel: inked, halftoned (comic-filtered photo, pre-processed once), the garden behind her
   turned into a halftone San Diego dusk sky (orange/pink bands, a palm silhouette). Small caption box at the top inside
   the circle is optional (only if it reads at 135 px; otherwise none).
2. **f12-55 (0.5-2.3 s) Trouble on the chip.** Whip pan (speed lines + smear) to a lab bench at dusk: a gold quantum chip
   (square tile, 3 x 3 qubits = cyan glowing pearls with ink outlines, couplers between them) in 3/4 view, dutch angle.
   Three red spiky **noise gremlins** (toon, angry eyes, little teeth) pop up over the chip's edge (staggered,
   squash & stretch) and hop onto qubits: those qubits flicker red and wobble. Hand-lettered **"BZZT!"** (red with yellow
   fill, ink) at ~f30. Handheld shake.
3. **f55-86 (2.3-3.6 s) Enter the professor and her cat.** Whip back to Yufei (the comic photo panel), crash zoom toward
   her face; her **glasses flash** (two 4-point star glints on the lenses + a shine sweep, "SHING!" small) around f62.
   At ~f70 her **white cat** leaps up from the bottom of the frame onto her shoulder: a round toon white cat (pink inner
   ears, blue eyes, a tail), wearing a **red beret** and carrying a **big paintbrush** (wooden handle, gold ferrule, bristles
   dipped in gold paint) - "the PICASSO cat". Squash on landing.
4. **f86-134 (3.6-5.6 s) One stroke.** Whip down to the chip: the cat leaps in with the brush and paints **one huge arcing
   gold stroke** across the chip (a thick ribbon that grows from the brush tip, splatter drops); each gremlin the stroke hits
   goes **"SPLAT!"** (one big hand-lettered SPLAT at ~f110) and squashes into a paint blob that vanishes; along the stroke the
   qubits snap back to clean cyan one by one and the couplers light gold in sequence. Camera follows the brush with speed lines.
5. **f134-173 (5.6-7.2 s) Payoff.** Pull back: the chip shines clean, the cat lands on it and puffs its chest (proud pose,
   brush raised); above the chip the gold paint writes **"PICASSO LAB"** as hand-lettered brush lettering (big, two lines if
   needed, inside the circle), sparkles.
6. **f173-191 (7.2-8.0 s) Back to the photo.** A gold paint wipe sweeps across the circle and reveals her plain photo; the
   last ~8 frames are exactly the photo.
