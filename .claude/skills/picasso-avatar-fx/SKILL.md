---
name: picasso-avatar-fx
description: Build or change a click-to-activate avatar effect on the Picasso Lab Team page (people/<name>.html snippets running on people/fx/kit.js — three.js layers of the real photo + q5/p5 comic layer). Use for a new member's avatar effect, reworking an existing one, fixing placement of a prop on someone's photo, or anything touching people/fx/.
---

# Team page avatar effects (people/fx)

Every avatar on https://yufeiding.ucsd.edu/people/team is its own Google Sites embed. Read the
`picasso-sites-embed` skill too — its rules apply (absolute URLs, re-paste to deploy the snippet).

## Pieces
- `people/<file>.html` — the **pasted snippet** (one per person): the photo, an import map for three.js,
  and a tiny loader. All snippets are identical except the header comment, `data-fx`, `aria-label`, `<img src>`.
  Copy `people/zhuo_gold_medal.html`. Changing a snippet needs a re-paste; changing a scene does not.
- `people/fx/kit.js` — shared runtime (header comment = the contract). Loads on the first hover/touch,
  builds a three.js stage on click, releases the WebGL context after the effect switches off (15 embeds on
  one page would exceed a phone's context limit), tilts the stage toward the pointer, phones sway.
- `people/fx/<name>.js` — the scene: `export default { title, exit, still, plate, async build(k) { return { update(t, e, dt), draw2d(q, t, e), dispose() } } }`.
  `t` = seconds since the click, `e` = exit progress 0 -> 1. Pure functions of (t, e).
- `people/static/fx/<name>-cut.webp` / `-plate.webp` — the person cut out / the photo with the person
  inpainted out. Make them with `python3 people/fx/tools/make_layers.py <name> --grid` (BiRefNet portrait
  matte via rembg; the `--grid` image is how you read landmarks — red lines every 128 photo px, labels every 64).
- Not on the kit: `people/xinwei_masterchef.html` (SVG/CSS, the approved quality bar), the user's own
  `people/haotian_shen.html`, `people/yufei_cats.html` (never touch these two), and the alumni Alon, Chenyang
  and Hezi (`alon_iron_man.html`, `chenyang_captain_america.html`, `hezi_scholar.html`): alumni have no avatar
  on the Team page, so the user asked to leave them as they are.

## Scene toolkit (k)
World units = CSS px, origin = avatar centre, y up, z toward the viewer; the avatar is 200 px (k.R = 100).
`k.at(u, v, z)` photo px -> world (size-compensated for depth); `k.screenAt(u, v)` / `k.toScreen(v3)` -> CSS px
for q5. Layers `k.layers.{photo, plate, person, mask}`; set pieces between z = -36 and 0 behind the person,
`k.clip(material)` keeps them inside the circle. `k.patch(polygon, z)` re-layers part of the real photo (a hand)
in front, so a prop between z = 0 and that z sits in the hand. `k.toon`, `k.ink(mesh, px)`, `k.show(obj, a, scale)`
(always use for things that scale in — outlines leave specks otherwise), `k.card`, `k.canvasTexture`,
`k.glowSprite`, `presence(t, e, t0, dur, ease, order)`, `env`, `ease`, `rng`. `k.q` / `draw2d(q, …)` = q5.js
(p5 API) in screen space; system fonts only.

## Rules the user cares about
Default = plain photo; t = 0 identical to the photo; entrance ≤ ~1.3 s, staged; then a calm loop (3–4 s beat,
busy ≤ 25 %); exit ≤ 0.5 s back to the exact photo. Stay inside the circle (≤ ~8 px overflow; desktop puts the
photo top-left of the tile, phones bottom-centre). Readable at 200 px: few bold props placed exactly on the real
photo (hands, head, chest) — "3D comic": toon + ink, no generic glow haze, no emoji, no clutter.

## Test (trust frames, not code)
The session that built this kept a Playwright harness in its scratchpad (`pfx_test.js` + `harness.js`): it
document.write()s the snippet into a 266 x 284 (desktop) or 257 x 274 (phone) iframe, routes
`https://yil384.github.io/Picasso-Lab/**` to the working tree **with `Access-Control-Allow-Origin: *`** (the
kit is an ES module loaded cross-origin, like on GitHub Pages), hovers, clicks, holds the effect clock at chosen
times through `window.__pfxClock = () => t` (and `window.__pfxExit = () => e` for the exit), screenshots each
time, checks console errors, and checks that switching off removes the canvas and shows the photo again.
Rebuild it from this description if it is gone. Chrome's device emulation does not reach cross-origin iframes:
launch with `--disable-site-isolation-trials --disable-features=IsolateOrigins,site-per-process`, and give
the host test page a viewport meta, or phone layouts are wrong in tests (not on real phones).
To try one inside the live Sites page, swap the embed's `data-code` for your snippet (see `picasso-sites-embed`).

## Deploy
Scenes, kit and layer images go live when `main` is pushed (GitHub Pages, ≤ 10 min cache). A new or changed
**snippet** must be re-pasted into its Team page embed (`pbcopy < people/<file>.html`), then Publish.
