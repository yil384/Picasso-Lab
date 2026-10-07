# Third-party code and assets in kit2d

kit2d ports and adapts code from two MIT-licensed repositories. The files that carry ported code say so in their
headers; the full notices are below, as the MIT license requires.

| kit2d file | Derived from | What came from it |
| --- | --- | --- |
| `material.js` | bohemian-tokenry-video `video/styles/papertheater/kit.js` | paper and felt texture tiles, polygon kit (`segP`, `arcP`, `rrect`, `ellipseP`, `polarP`, `densify`, `starP`, `wobble`, `toPath`, `bbox`), `cut`, `fuzz`, `bake`, `spr`, hash and mulberry32 helpers |
| `material.js` | drawn-by-code `styles/paper-cutout/paper.js`, `detail.js` | `resample`, `torn` (torn paper edge), `spline`, `cspline`, `taper`, `shade` |
| `stage.js` | bohemian-tokenry-video `video/styles/papertheater/kit.js` | the plane camera (`F / (z - cam.z)` with roll), the multiply light map of gel pools, screen-blended beams with dust, vignette and grain post |
| `riso.js` | drawn-by-code `styles/risograph/riso.js` | the whole press: inks, paper, plates, halftone screens, register, mottle/starve/specks/fibres, spread, `tone`, `ramp`, `radial`, `line` (now `inkLine`) |
| `set.js` | bohemian-tokenry-video `video/styles/papertheater/kit.js` | the recipes for the proscenium, felt curtains, valance and footlight hoods (redrawn for 9:16) |
| `cat.js` | bohemian-tokenry-video `video/styles/papertheater/kit.js` | the puppet-rig pattern (pose options, `blinkAt`, per-step jitter, baked parts with drop shadows); the cat itself is new |

New in kit2d (not ported): thin-lens depth of field per depth group, perspective floors with blur bands, per-plane light
maps (lights with `zmin`/`zmax`), occluded beams with bokeh dust, `clipTo`, thread `stitch`/`thread`/`nap`, `inset`,
`runWhere`, `imageSprite`, `brushLine`, the set pieces' geometry, the felt cat, `lyingProp`, `flyCard`.

Not used from drawn-by-code: its fonts (each under its own OFL) and its sound effects (ElevenLabs terms).

## Assets the test page uses (not copied into kit2d)
- `/scene/tex/Wood026/Wood026_2K-JPG_Color.jpg` (the desk): ambientCG, CC0 (see `.claude/films/xlaunch/scene/tex/LICENSE.txt`).
- `/scene/cut/prop_pen.png` (the red pen): the lab's own painted cast prop from the X launch film.
- `kit2d/fonts/*.woff2`: subsets of Noto Serif SC, Noto Sans SC and Long Cang from Google Fonts, SIL Open Font License 1.1
  (made by `kit2d/fonts.py`). Latin fonts come from `/pv/fonts` (Fraunces, Inter, JetBrains Mono; OFL).

---

## ledbetterljoshua/bohemian-tokenry-video

```
MIT License

Copyright (c) 2026 Joshua Ledbetter

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## illodev/drawn-by-code (code only)

```
MIT License

Copyright (c) 2026 illodev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
