---
name: picasso-anime-transition-film
description: Make a pre-rendered anime-style film (Codex-painted key frames animated with three.js + q5.js effects) and wire it as a seamless transition between two Picasso Lab pages, like the Events <-> Guandan Ultraman Tiga films; also covers transparent comic overlay films like the Events opening splashes. Use for any new page-to-page transition, easter-egg cutscene, splash, or "make it a video instead of a janky CSS animation" request.
---

# Anime transition films (the Tiga pattern)

Live example (main 6c794e2): typing `picasso` on Events plays **attack** (Golza and Melba strike the pyramid, two
giants fall, Tiga's statue cracks → white) while `events/guandan.html` loads behind it; leaving Guandan plays
**light** (Guandan cards give Tiga light, a beam of cards destroys Melba, Golza flees → white → Events).
Full source: branch `video-kit`, folder `video-kit/anime/tiga/` (copy it as the template for a new film).
Render pipeline: `video-kit/pipeline/`. Read the `picasso-sites-embed` skill too — every integration rule there applies.

## Why a video (what the user asked for)
The old CSS transition navigated the page at the end, so a heavy page load showed as a blank/white gap and stutter
("转的不丝滑有卡顿和闪烁突变"). A pre-rendered film plays at a fixed frame rate whatever the page is doing, and the
destination loads *under* it. The user explicitly wanted three.js + q5.js on top of anime art and a real story;
they like hot-blooded realistic anime (热血写实日漫风). Other taste rules: films skippable, no emoji anywhere,
splashes short ("开屏动画时间都别太长"), the result must feel seamless.

## 1. Story and timing
- 6–7 s per direction, 5–7 shots of 0.6–1.5 s (anime limited animation: painted stills + camera moves + effects).
- Design the **hand-off frames**: the entering film ends on pure white (or a solid colour) so the destination can
  fade in from it; the leaving film starts on white so it can be cut in over anything. Hold that colour in the page
  (a white layer) while the destination is still loading.
- Write the shot list with times, image, camera per aspect, and effects per beat before generating art.

## 2. Key frames with Codex (Mac only — needs the logged-in `codex` CLI)
- `./gen.sh NAME "scene…" [ref.png …]` → `art/NAME.png` 1536×1024; `style.txt` is appended to every prompt (keep one
  style paragraph for the whole film). The prompt must go in on stdin (`codex exec -i` swallows a positional prompt).
- Naming the characters explicitly worked (Ultraman Tiga, Golza, Melba — plus a physical description). Pass earlier
  frames as `-i` references so the setting and characters stay consistent (the statue hall was the reference for
  every statue / Tiga shot). Tell Codex what to leave empty where an effect will be drawn ("do NOT draw the beam").
- Movable sprites: ask for a flat pure-green `#00FF00` background and key it out (green dominance → alpha, despill);
  effect sprites from `./gen_sq.sh` come back as RGBA PNGs with real transparency — check them over a coloured
  backdrop (a JPEG preview flattens alpha to white and looks like a white background).
- Remove an unwanted painted element with `cv2.inpaint` (the jet painted into the establishing shot was masked and
  inpainted so the jet could fly as a sprite).
- Draw a labelled coordinate grid (every 128 art px) on small previews of each frame and read effect anchor points
  (eyes, colour timer, hands, impact points) from them — don't guess coordinates.
- In a cloud session without Codex: reuse `art/`, or give the user the exact `gen.sh` commands to run on the Mac.
- The characters are someone's IP: fine for a lab easter egg the user asked for; say so once, don't lecture.

## 3. The scene (`engine.js`, `fxlib.js`, one timeline HTML per film)
- `makeFilm({ seconds, fps: 30, art, shots, shakes, impacts, flashes, debris, three(api,…), fx(q, c, …) })`.
- **Shots**: `{id, img, t0, t1, cam: {land: keys, port: keys}, grade?, art?(g,t,v,IMG), light?, dissolve?}`;
  camera keys `[u, x, y, zoom, rotDeg, ease]` in art pixels (zoom 1 = full width for 16:9, full height for 9:16).
  Portrait needs its own path (pans across what landscape shows at once).
- **three.js layer**: the camera is set so the z = 0 plane shows exactly the 2D view, so effects anchored at art
  coordinates stick to the painting while z > 0 gives parallax. Debris = instanced toon icosahedra with an
  inverted-hull ink outline, pure-function ballistics per burst; cards = one InstancedMesh per card face (textures
  drawn on canvases) + additive glow quads; beam = an additive gradient quad.
- **q5.js fx layer** (`new Q5('graphics')` offscreen, drawn onto a pv 2D layer): anime focus lines and speed lines
  (re-drawn on twos), katakana SFX (Hiragino Sans 900, gradient fill, black + white stroke, pop-in), cel dust clouds
  from noise textures, embers, glows, god rays, monster rays, branching crack systems, explosion sprite, jet sprite
  with contrail. Positions per aspect (`PORTRAIT ? … : …`) so lettering stays in the safe area.
- **post**: impact frames (posterised B/W, inverted, red-multiplied) for 2–4 frames at hits; flashes.
- Everything is a pure function of the frame index (pv runtime contract).

## 4. Render and encode
```bash
cd video-kit/pipeline
python3 snap.py ../anime/tiga/attack.html 0 45 90 150 --width 960 --height 540 --out /tmp/s   # look at frames
python3 render.py ../anime/tiga/attack.html --out /tmp/r/attack_land --width 1280 --height 720 --workers 2 --clean
python3 render.py ../anime/tiga/attack.html --out /tmp/r/attack_port --width 720 --height 1280 --workers 2 --clean
# encode the lossless segments (concat list of /tmp/r/<name>/segments/*.mkv):
ffmpeg -f concat -safe 0 -i list.txt -c:v libx264 -preset slow -crf 27 -profile:v high -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -tune animation -movflags +faststart -an OUT.mp4
```
On the Mac each film renders in ~6–14 s. CRF 27 gave 1.9–3.4 MB for 6.3–6.6 s and looked clean (check a busy frame).
Also export the first frame of the entering film as a JPEG poster (shown while the video buffers). Delete render dirs
afterwards. Deliverables on main: `events/static/<name>/{film}_{land,port}.mp4` (+ posters).

## 5. Pitfalls we hit (all fixed in the template)
- The pv runtime has no `ctx.load`: load images with `new Image(); img.src = …; await img.decode()`.
- **InstancedMesh frustum culling**: its bounding sphere is computed once at warm-up when `count` is 0, so every
  instance was culled → set `frustumCulled = false` on the effect meshes.
- Toon rocks under a warm key light looked like saturated brown cookies: neutral key light, orange rim light, pale
  stone colours matching the painting, thin ink hull (×1.07), fewer and smaller pieces than you think.
- Dust drawn as soft circles looked like foam/smudges → cel-shaded noise cloud textures (lit top, shaded base).
- Cracks as random walks looked like tangled hair → few, long, angular segments that taper.
- Explosions from radial gradients look like bokeh → a painted explosion sprite, scaled and burnt off.
- A flash drawn after the impact frames hides them → flash after, and partial alpha.
- Film grain costs bitrate → overlay alpha ≈ 0.04.

## 6. Wiring it as a transition (see `events/events.html` "Guandan portal" + `events/guandan.html` on main)
- **Portal overlay** in the origin page: `#gd-portal` (fixed, full embed) holding the destination in a **fresh
  iframe** (`name="gd-portal"`, `allow="autoplay; fullscreen; clipboard-write"`, `opacity:0; pointer-events:none`
  until revealed), a `<video playsinline muted>`, a white layer, and a Skip button.
- **Enter**: play the film; the destination posts `ready` after load + 2 rAF; at film end show the white layer
  instantly, hide the video, and fade the white out once ready (hold white otherwise; reveal anyway after 8 s);
  then focus the iframe and hide the page under it (`visibility:hidden` on siblings) so it isn't painted.
- **Leave**: the destination posts `exit` (and `left` once it has released its game seat) instead of navigating;
  the origin fades white in over it, starts the return film, lifts the white on the film's **first frame**
  (`requestVideoFrameCallback`) — forgetting this left the whole return film under the white layer — then at the
  end removes the frame (after `left`, max 2.5 s) and fades white out to the untouched page.
- The destination detects the portal by `window.name` (survives its own reloads — use `location.replace` for those
  inside the portal); opened standalone it plays the return film itself and then navigates.
- **Keyboard**: the hidden destination must not focus itself on load (it stole Esc/Enter); Esc/Enter/Space/click skip.
- **Preload on intent**: start buffering the entering film on the first letters of the trigger word / first tap;
  warm the return film with a low-priority `fetch` while the destination is shown.
- **History**: push a nav-frame entry when opening; Back from the destination plays the return film; a normal exit
  pops the entry so a later Back leaves the page (see `picasso-sites-embed`).
- **Phones**: choose `_port` when `innerHeight > innerWidth`; if the destination rotates its stage for a
  sideways-held phone, it reports that (`layout`/`turned`) and the return film uses `_land` rotated 90° the same way.
- `prefers-reduced-motion`: skip the films (cross-fade only).

## 7. Test before shipping
- `video-kit/anime/tiga/test/t_tiga.py` (env `SITE_ROOT` = a main checkout, `GD_HARNESS` = `guandan-kit/harness`
  from branch `guandan-cloud`): live Sites page with the embed swapped for your file, Firebase stubbed, real Back
  button; prints the portal state every 0.5 s and saves JPEG screenshots at key times. Check: film time advances 1:1,
  the white hand-offs, table reveal, return film visible (not under white), page restored, history clean, Esc skip,
  portrait. Note: screenshots themselves stall playback for a moment — don't mistake that for a real stall.
- Guandan's must-keep suite covers the portal and the standalone return film:
  `GD_ROOT=<main checkout> python3 guandan-kit/harness/mustkeep.py all` (branch `guandan-cloud`) — 0 failures.
- Then the user re-pastes the origin page into Google Sites (`picasso-sites-embed`); the films and the destination
  page are live on push.

## 8. Variant: transparent overlay films (the Events splashes)
When the film must float over the page (no rectangle), render it twice on black and white mattes, difference-matte
to colour + alpha, encode colour-over-alpha stacked in one H.264, and composite in WebGL on the page. Pipeline and
steps: `video-kit/splash/README.md` (branch `video-kit`); page side: the `#ev-splash` script in `events/events.html`.
