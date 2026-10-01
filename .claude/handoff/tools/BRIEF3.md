# Brief: third round on four Team-page avatar effects (the user's new feedback)

Everything in `/tmp/picasso-tools/BRIEF2.md` still holds (read it first: the kit, the scene contract, the hard rules,
the test loop, the report format). Differences for this round:
- Use shot prefixes starting with `v3_<name>`.
- The current scene of your person is what is live now and what the user just looked at. Keep everything that is not
  mentioned in your assignment exactly as it is (timings, props, looks): the user was happy with the rest.
- Only edit `people/fx/<name>.js` (and the header comment of `people/<snippet>.html` if the description changes).
  Never commit, never touch other people's files or `people/fx/kit.js`.
- Other agents share this 4-CPU machine: one browser at a time, `timeout 900` on every node run.
- Deterministic frames at exact (t, e): `node fx4_states.js <snippet> <prefix> <phone 0|1> "t:e,t:e"` ->
  `fx4_out/<prefix>_t<ms>_e<pct>.png` (desktop 266x284 or phone 257x274). `python3 st_ana.py <prefix> <phone>` prints
  overflow / tile-edge per fx4_states frame. Use these for fast moments (a blink, a flip) that real-time shots miss.
- Old version frames (what the user remembers): `shots/old_<name>_{hov,m00150,m00400,m00800,m01300,m02000,m03000,m04500}.jpg`,
  old snippet source `old/<snippet>.html` (read its CSS keyframes/JS to see exactly what the old effect did and when).

Report: what changed (timeline), landmarks used, test numbers (console, zoff, t000 mean, worst overflow, tile-edge),
anything unsure, and the path of a FINAL contact sheet (desktop + 151 tile + phone, 10-14 frames, include the new moments).
