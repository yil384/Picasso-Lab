# splash/ — transparent comic films over a page (the Events opening splashes)

The six Events splashes (`events/static/splash/<id>.mp4|.webp` on main) are 2.25 s Q-version comic films that play
over a full-screen CSS sunburst. They are transparent, so the film has no visible "rectangle":

1. Art: `./gen.sh NAME photo.jpg "scene"` → `art/NAME.png` (Codex, Q-version from an event photo; crop children or
   family out of the photo first; `style.txt` is the shared style).
2. Config: add an entry to `CFG` in `build.py` (art, colours, title, kicker, SFX word/position, props), then
   `python3 build.py NAME` writes `scene/NAME_k.html` and `scene/NAME_w.html` — the same film on a black and on a
   white matte (the scene itself is `scene/template.html`: three.js toon props with ink hulls bursting from the panel,
   p5.brush focus lines and lettering).
3. Render both from `../pipeline` with PNG storage:
   `python3 render.py ../splash/scene/NAME_k.html --out ../splash/render/NAME_k --store png --clean` (and `_w`).
4. `python3 matte.py NAME` difference-mattes them (alpha = 1 − (W − K)/255, colour = K/alpha) into stacked frames:
   colour on top, alpha as grey below, 960x1440, plus a transparent WebP still (last frame).
5. `./encode_stack.sh NAME` → `out/NAME.mp4` (H.264, CRF search to ≤ 850 KB).
6. On the page, a WebGL compositor draws the top half as colour and the bottom half as alpha (premultiplied),
   `crossorigin="anonymous"` on the video (GitHub Pages sends ACAO *); the WebP still is the fallback (no WebGL,
   reduced motion, error, or 1.4 s without a frame). See the `#ev-splash` script in `events/events.html` on main.

Keep splashes short (the user: "开屏动画时间都别太长"). Delete `render/` after encoding (it is large).
