# albertobeiz/kindergrimm ("drawai")

- URL: https://github.com/albertobeiz/kindergrimm (172 stars, 28 forks; created 2026-08-15, last push 2026-08-24;
  Unlicense). Site: https://kindergrimm.vercel.app. Procedural doodle characters on cream paper plus three games
  (Kindergrimm, Marbles, a class-photo poker game), an editor, a crowd page, a toy shop, nine art-history "styles".

## Made with Claude / Opus 5.5? (Claude yes, Opus 5.5 no)
- 61 commits; 39 carry Claude co-author trailers: 22 x `Claude Fable 5`, 11 x `Claude Opus 5`, 6 x `Claude Sonnet 5`.
  None says Opus 5.5, and the last push (2026-08-24) predates Opus 5.5. Repo has CLAUDE.md and a 153 KB ARCHITECTURE.md.

## Stack
- Vanilla ES modules. `src/sketch.js` is "the hand": strokes are filled ribbons with wobble, dry granulation and
  overshoot; fills are techniques (hatch, scribble, stipple, graphite, wash, oil daubs, chalk, marker).
  `media.js` (tone/skin/edge), `species.js` (loaded dice per animal: human, dog, cat, nightmare), `parts/*`,
  `rig.js` (recipe -> bones -> meshes, three.js), `anim.js` (boil, blink, gaze saccades, talk, sway, breath; eyes
  pre-draw six states so a glance is a texture swap), a p5.brush second hand (`crowdbrush.html`), `styles/` (gothic
  1310 .. surrealism 1929). A face is a JSON recipe `{seed, media, color, parts}`.

## What I rendered (frames2/kindergrimm/, headless Chromium screenshots via a local server)
crowd (seed 7), crowd species=cat (and a 3x DPR crop cats_zoom.jpg), crowdbrush, editor (a dog), styles (after 30 s),
how (the guide), game title.

## What I saw (candid)
- Cream speckled paper, ruled shelf lines with grass ticks, 35 small chibi doodles per page. The cat page: round heads,
  triangle ears, whiskers, x-eyes, eye patches, crowns, glasses, a bowler hat, sausage bodies in striped jumpers, all in
  scribbled coloured pencil with wobbly graphite outlines. Reads like a child's sketchbook crossed with Don't Starve; it
  has charm and a deadpan grim humour.
- Limits: every creature is the same round-head-on-sausage template; at 3x zoom the textures are blurry (drawn at a
  fixed low resolution); the "styles" sheet (chibis in gothic gold, ukiyo-e, cubist frames) is a gimmick. The editor
  dog has heavy diagonal streaks that look like a filter. The game itself is a dark title card in a mono font.

## For our 9:16 explainer with a painted white cat
- Not a hero-character source (our cat is a painted sprite and should stay one).
- Useful as an **extras generator**: a queue of doodle cats as requests in a batch, a crowd of tokens, a classroom of
  tiny workers, cheap and varied by seed, with the life layer (blink, saccade, breath, talk) already built.
- Borrow `anim.js`'s list of idle life (blink, gaze saccades, breath, sway, small mutters/emotes on a timer) for the
  painted cat.
