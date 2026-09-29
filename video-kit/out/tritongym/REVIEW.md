# TritonGym — self-review log

Protocol (README §8): after every full pass, four independent strict reviewers (separate agents with no access to each
other's notes) score the film 0–10 from one lens each, citing frames: **creative director** (P(doom) delight, clarity,
anti-web/anti-AI look), **tech-art lead** (stylised three.js: lit 3D comic world, ink, halftone, camera, lettering),
**domain expert** (GPU kernels / TritonGym facts), **web designer** (the muted ~400×195 card next to three siblings,
poster, loop seam, sizes). Every must-fix is either fixed in the next pass or answered below. Evidence for each round
(contact sheet at 1 f/s, per-beat motion strips at every 2nd frame, the seam strip, card-size crops) was generated from
the rendered pass with `films/tritongym/tools/evidence.sh`; the evidence images are not committed (render
intermediates), the key stills referenced here are in `out/tritongym/stills/`.

Target: every lens ≥ 8.5 with no must-fix left.
