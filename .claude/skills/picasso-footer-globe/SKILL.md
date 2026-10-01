---
name: picasso-footer-globe
description: The Picasso Lab site footer (home/footer.html, one Google Sites embed on every page) - UCSD seal, PICASSO LAB + address, and the WebGL visitor globe (real Earth, Moon, M78 Nebula, Cybertron through a wormhole) that also records visits into Supabase. Use for any change to the footer's layout, the globe's look, the off-world joke visits, the visit recording, or when the footer looks wrong at some size.
---

# The footer and its visitor globe

Read `picasso-sites-embed` first: the footer is pasted embed code (re-paste to deploy, absolute URLs, quirks mode).

## Files
- `home/footer-src/footer.tpl.html` - **edit this**. Layout CSS/JS, the globe (WebGL shader + 2D overlay), hover/drag/click.
- `home/footer-src/build.py` - `python3 home/footer-src/build.py` writes `home/footer.html`. It copies, verbatim
  from `home/visitor-map.html`: the Supabase constants, the land mask + projection constants, the country table, the
  "data + capture" block (geo-IP, insert, select, aggregation). It asserts on those lines; if visitor-map.html moves
  them, the assertion says which to update. Never hand-edit `home/footer.html`.
- `home/static/globe/` - textures, loaded only when the card scrolls on screen (IntersectionObserver), ~158 KB total:
  `earth_day.jpg` (NASA land/ocean/ice 1024x512, 69 KB), `earth_night.jpg` (city lights, grayscale, 28 KB),
  `clouds.jpg` (512x256 grayscale, 21 KB), `moon.jpg` (512x256, 40 KB). Sources: the three.js example textures
  (`examples/textures/planets/` in mrdoob/three.js). GitHub Pages sends `Access-Control-Allow-Origin: *`, which
  WebGL needs (`img.crossOrigin = 'anonymous'`).
- `home/footer-src/test/` - `ft.js` (screenshots), `ft_globe.js` (hover each object, a city, drag), `gen_rows.js`
  (fake Supabase rows -> `rows.json`). Not committed: `rows.json`, `seal.png` (any copy of the UCSD seal PNG), `shots/`.

## Testing (always by screenshots, at all sizes)
```
cd home/footer-src/test && node gen_rows.js            # once
NODE_PATH=$(npm root -g) WAIT=5000 node ft.js ../../footer.html w1 957x200 700x146 352x73@phone 352x107@phone
NODE_PATH=$(npm root -g) WAIT=5000 node ft_globe.js ../../footer.html g1 957x200 352x73@phone
NODE_PATH=$(npm root -g) WAIT=6000 node ft.js ../../footer.html big 1800x376   # big render: crop the card to judge detail
```
The harness nests the page like Sites does (top page -> sandboxed atari frame -> about:blank + document.write),
mocks Supabase and geo-IP (it must never reach production), and serves `https://yil384.github.io/Picasso-Lab/**`
from the checkout with the CORS header. `957x200` is the desktop box (1440-wide window), `352x73` the same box on a
phone (Sites keeps the aspect ratio and only shrinks it). Look at every shot before you say it works.

## Layout rules (the user's, from many rounds of feedback)
- Keep the old three-part look: seal | title + address (nearly centred on desktop) | map card. Seal and map about the
  same height, the address block a bit shorter and slightly lower, minimal vertical padding, generous gaps between the
  three parts. `rowLayout(W, H)` for W >= 560, `stripLayout(W, H)` below (phones: address 9-11 px, seal level with the
  title, card 2:1). `fitCard` hides the stats pill under ~90 px card height.
- It must look right at every size; phones were "一团糟" once because the desktop rule forced 10 px text into a 73 px strip.

## The globe (one fragment shader, no library)
- Painted in order: star layers (lensed round the wormhole) -> Milky Way band -> M78 -> wormhole -> Moon behind ->
  Earth (day texture lit by `SUN`, city lights on the night side, clouds, ocean glint, limb scattering, terminator,
  atmosphere halo) -> Moon in front -> film grade (`1 - exp(-1.3c)`, cool shadows, vignette, grain).
- JS draws the overlay on `#vmap-fx`: visitor pings (latest three pulse amber; pings hidden under a Moon in front),
  blips on the off-world objects, survey labels (`M78 NEBULA / 3,000,000 LY`, `CYBERTRON / VIA WORMHOLE`, hidden when
  the card is under 110 px tall), and the signals: a dotted path whose dots grow from far to near, a light packet with
  a tail (M78 slowest), a ripple on the Earth's limb.
- **Wormhole** (`uCyb` = centre + throat radius): a point lens with Einstein radius 1.3 throats bends the star layers
  outside (`sp = p - dir * R * 1.69 / r`, faded beyond 2-4.5 R); inside, the far sky is squeezed toward the rim
  (`fp = dir * r / sqrt(1 - 0.6 r^2)`): violet nebula, a blue-white sun at `(-0.6, -0.55)`, Cybertron's horizon
  (sphere at `(0.9, 1.3)`, radius 1.1) lit by that sun. No glowing ring (a neon rim looked fake); the edge is a thin
  Einstein-ring line. The hover blip position `WB` in JS is the inverse of that mapping: move the planet, recompute it.
- Off-world visits are decoration only (`OFFWORLD`), never recorded. Tooltips: the Moon "384,400 km away", M78
  "3,000,000 light-years away, arrived at the speed of light", Cybertron "distance unknown, only seen through a wormhole".
- Interaction: auto-rotate 4 deg/s, drag with inertia (`touch-action: pan-y` keeps page scroll on phones), a click that
  is not a drag opens the analytics page, tap on an object shows its tip. ~30 fps, only while on screen and visible.
- `window.__pfGlobe()` / `window.__pfPing(city)` / `window.__pf()` are test hooks (state, a ping's position, the layout).

## What the user wanted from the look
Real textures over procedural "laser dot" maps ("AI 味太重"); cinematic, physically plausible sci-fi, but small and fast
to load (shader effects over new images). Each far object needs its own identity and a sense of distance.

## Deploying
Commit, merge into `main`, push (the user's standing rule). Then the user re-pastes `home/footer.html` into the one
footer embed (the three old footer embeds, including the old visitor-map one, must be gone or visits count twice).
Texture changes go live with the push alone.
