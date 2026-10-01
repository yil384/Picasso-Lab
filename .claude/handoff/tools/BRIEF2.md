# Brief: second round on the Team-page avatar effects (the user's feedback)

Repo: `/home/user/Picasso-Lab` (branch `claude/beautiful-einstein-0qnvta`). Test tools: `/tmp/picasso-tools` (`$SP`).
The Team page https://yufeiding.ucsd.edu/people/team shows every lab member's round photo; each is its own Google
Sites embed (`people/<file>.html`). A click turns on an effect; a second click turns it off.

## Read first
1. `/home/user/Picasso-Lab/.claude/skills/picasso-avatar-fx/SKILL.md` — the kit, the scene contract, the rules, gotchas.
2. `/home/user/Picasso-Lab/people/fx/kit.js` — the shared runtime (the header comment is the contract; read it fully).
   **Do not edit kit.js.** If you truly need a kit change, describe it in your report instead.
3. Your person's current scene `people/fx/<name>.js` and snippet, and one finished scene for reference
   (`people/fx/zhuo.js`, `people/fx/keyi.js`).
4. The OLD version of your person's effect (what the user compares against — it is what is live today):
   `$SP/old/<snippet>.html`, and its real-time frames `$SP/shots/old_<name>_{idle,hov,m00150,m00400,m00800,m01300,m02000,m03000,m04500}.jpg`
   (ms after the click). Contact sheets of all old effects: `$SP/sheets/old_0.jpg`, `$SP/sheets/old_1.jpg`. LOOK at them.
5. Landmarks: `$SP/grids/<name>.jpg` = the 512 px photo shown at 768 px with a grid (red every 128 photo px, yellow every
   32, labels every 64; photo px = image px / 1.5). Cut-out / plate layers: `people/static/fx/<name>-cut.webp`,
   `-plate.webp` (the plate is blurry where the person was: never leave a big plate area uncovered).

## The user's standard (hard rules)
- Default = the plain photo; the first rendered frame (t = 0) must look exactly like the photo (every prop starts hidden;
  use `k.show` / `presence` for anything that scales in).
- Entrance <= ~1.3 s, staged (not everything at once); then a calm loop (3-4 s beat, busy part <= ~25 %); exit <= 0.5 s,
  and at e = 1 the image is exactly the photo again.
- Stay inside the avatar circle, at most ~8 logical px past it (briefly breaking the frame for one prop is fine), and
  nothing may be cut off by the tile edge.
- Readable at 200 px and at the 135 px tile. Bold props placed EXACTLY on the real photo (hands, head, chest), held
  props sit IN the hand (`k.patch` re-layers the real fingers in front of a prop), "3D comic" look: toon + ink,
  halftone, bold simple silhouettes. No generic glow haze, no glossy default three.js, no clutter, no UI panels,
  no emoji (draw icons yourself), system fonts only.
- The user judges by what they SEE. They explicitly compared the new effects with the old ones and found several worse:
  fewer elements, props in the wrong place, less exaggeration. Keep every good idea of the old version (listed in your
  assignment), and make it better, not sparser.

## Files
- Scene: `people/fx/<name>.js` — `export default { title, exit, still, plate, async build(k) { ...; return { update(t, e, dt), draw2d(q, t, e), dispose() } } }`,
  pure functions of (t, e). Import only from `./kit.js` (THREE is re-exported) and `three/addons/...`.
- Snippet: every kit snippet is identical except the header comment, `data-fx`, `aria-label` and `<img src>`. To create
  one, copy `people/zhuo_gold_medal.html` and change only those four. Check with `python3 $SP/kv9/norm.py` (all kit
  snippets must print the same hash). Only people whose snippet is new in this round (Yufei, Haotian) touch snippets;
  for the others change the header comment only if the effect's description changed.
- Only edit the files of your own people. Never `git commit` / push. Never touch `people/fx/kit.js`, other people's
  files, `people/ohm.html` / `people/fx/ohm.js`, or the alumni (Alon, Chenyang, Hezi).

## Test loop (at least 3 rounds; trust frames, not code)
```bash
cd /tmp/picasso-tools && export NODE_PATH=/opt/node22/lib/node_modules DSF=2
# frames: node fx4_test.js <snippet> <prefix> <times csv> <exits csv or ""> <phone 0|1> <TW> <TH>
timeout 900 node fx4_test.js zhuo_gold_medal v2_zhuo_d 0,0.3,0.6,0.9,1.3,2.0,3.1 0.3,0.6,1 0 266 284
python3 fx4_ana.py v2_zhuo_d 266 284 0 2        # t000/x100/zoff vs photo, overflow per frame (logical px), tile-edge px
timeout 900 node fx4_test.js zhuo_gold_medal v2_zhuo_s 0,0.9,2.0 "" 0 151 161      # the smallest tile (135 px photo)
timeout 900 node fx4_test.js zhuo_gold_medal v2_zhuo_p 0,0.9,2.0 "" 1 257 274      # portrait phone
python3 sheet.py sheets/v2_zhuo.jpg shots hov,t000,t030,t060,t090,t130,t200,t310,tilt,x030,x060,zoff v2_zhuo_d v2_zhuo_s v2_zhuo_p
```
- `shots/<prefix>_t###.jpg` (### = round(t*100)), `_hov` (the reference photo), `_tilt`, `_x###` (exit), `_zoff` (after off).
- `node fx4_states.js <snippet> <prefix> <phone 0|1> "t:e,t:e"` holds exact (t, e) pairs -> `fx4_out/<prefix>_t<ms>_e<pct>.png`.
- OLD/NEW side by side: `python3 sheet.py <out.jpg> shots <names> <prefix1> <prefix2>` works across prefixes; for old
  frames use names like `m00800` with prefix `old_<name>`.
- LOOK at your frames with the Read tool, at full size and cropped/enlarged (python3 + PIL) for small details.
  Big sheets: crop them into readable pieces before reading.
- Required before you report: console `[]`, after-off `[false,"","false"]`, zoff mean 0.00, t000 looks like the photo,
  overflow <= ~8 logical px, tile-edge px 0 (except the tilt frame's own rim), frames checked on desktop 266x284,
  151x161 and the phone 257x274.
- Use your own shot prefixes starting with `v2_<name>`. Run ONE browser at a time, wrap every node run in `timeout 900`
  (other agents share this 4-CPU machine, so a run can take a few minutes).

## Report back (concise, in English)
Per person: what the effect does now (timeline), which old ideas are back / what is new, the landmark coordinates you
used, the test numbers (console, zoff, t000 mean, worst overflow), anything unsure, and the path of a FINAL contact
sheet (desktop + 151 tile + phone, 10-14 frames) the lead will look at.
