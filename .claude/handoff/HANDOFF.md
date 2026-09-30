# Handoff: finish the Picasso Lab branch `claude/beautiful-einstein-0qnvta`

The first session ran out of budget and handed over here. Everything it produced is committed on this
branch. This file is its memory: what the user asked, what is done, what is left, how to test.
Reply to the user in Chinese; they read the chat in the Claude app.

## 1. What the user asked (paraphrased from Chinese)

1. The lab site https://yufeiding.ucsd.edu/ (Google Sites) is ugly on phones and the layout is poor. Work out
   how to fix it within the limits of Google Sites.
2. Redesign the blogs easter egg (the page you get by typing "picasso" on the Blogs page) and carefully design
   both transitions, blog -> egg and egg -> blog. The old ones looked "like a sketch".
3. Every `people/xxx_xxx.html` avatar effect except Xinwei's was an early, low-quality version. Keep the ideas
   and rebuild them properly with three.js + p5.js (q5) + whatever helps.
   - Later: Alon and Chenyang are alumni, don't do them. The user also chose to skip Hezi (alumnus).
4. (Added later) `teaching/291P-W25/cse291p.html` (CSE 291P course page): too many tabs, too many redundant
   left-sidebar buttons, UI looks AI-made, items jump on hover. Optimise it. **Done** (commit c27f34a).
5. (Open question to the user, no answer yet) The Teaching page (`teaching/teaching.html`) course cards also
   lift on hover (`transform: translateY(...)` at lines ~125/190/340/504). I asked whether to remove that too.
   Do it only if they say yes.

## 2. Hard rules (from the user and the repo)

- Never touch the user's uncommitted local files `people/haotian_shen.html` and `people/yufei_cats.html`.
- Don't modify `people/xinwei_masterchef.html` (the approved quality bar), nor the alumni snippets
  `people/alon_iron_man.html`, `people/chenyang_captain_america.html`, `people/hezi_scholar.html`.
- No emoji in pages. `guandan-kit/` must never reach `main`.
- Push only `claude/beautiful-einstein-0qnvta` (`git push -u origin claude/beautiful-einstein-0qnvta`, retry
  2/4/8/16 s on network errors). Never push `main`. No PR unless the user asks.
- Every URL inside a pasted (Sites embed) file must be absolute. Never create history entries in an embed
  document (no pushState / navigating the embed frame; tabs and views must not touch `location`).
- Never write to production Firebase / Supabase in tests (the harness aborts those hosts).
- No model identifiers in commits, code or docs. Commit messages end with the trailer the session gives you
  (Co-Authored-By + Claude-Session lines).
- Read `.claude/skills/picasso-sites-embed/SKILL.md` and `.claude/skills/picasso-avatar-fx/SKILL.md` before
  touching embeds or avatars; they hold the Sites and kit rules in detail.

## 3. State of the branch

Done and committed (see `git log origin/main..HEAD`):

- **Mobile (Q1)**: `home/address.html`, `home/ucsd.html` (footer), `sponsors/sponsors.html` (new whole-page
  embed, logos in `sponsors/static/wall/`), `events/events.html` (danmaku input clears the Sites (i) button),
  `docs/sites-mobile.md` (Chinese guide: root causes, re-paste table, editor steps). Home / Prof / Team stay
  native Sites text for SEO.
- **Blogs egg (Q2)**: `blogs/blogs.html` — "The Real Blogs" comic tabloid + three.js transitions (shatter in,
  crumple out, paper-wipe fallback), fonts held during films, nav-frame history. All 11 blogs review findings
  (#1-#11) are fixed and independently verified (`fix_results.md`, verifier a88029c406f2c4371: all_fixed true).
- **Avatars (Q3)**: shared runtime `people/fx/kit.js` (three.js layers of the real photo: plate / props /
  cut-out person, toon + ink, q5 2D comic layer), 11 scenes `people/fx/{chang, jixuan, keyi, ohm, xiang,
  yichen, yue, zaifeng, zhengding, zhongkai, zhuo}.js`, their layers `people/static/fx/<name>-{cut,plate}.webp`,
  and 11 pasted snippets `people/{chang_top_scorer, jixuan_painting, keyi_esports_genius, ohm, xiang_concert,
  yichen_card_master, yue_baseball, zaifeng_academician, zhengding_sunshine, zhongkai_academician,
  zhuo_gold_medal}.html`. Tool: `people/fx/tools/make_layers.py`. Kit findings #12-#18 fixed (responsive tile
  sizing in logical 200 px units, build race, tilt reset, texture cache, context loss, disposal, focus ring).
  Scene findings #19-#24 fixed (chang papers + rim patch, keyi banner 1.08x, ohm packet window, yue impact
  flash + exit shake).
- **CSE 291P (Q4)**: four tabs (Overview / Schedule / Syllabus / FAQ), links once in the shared hero, no hover
  motion. Tested inside the live Sites page at 1280, 820 and 390. Content notes for the final summary:
  dropped the "scribe" FAQ and the Ed / exams wording (left over from another course), used the Syllabus's
  project categories (Survey / Tool Development / Exploration) over the stale Assignments list, added lecture
  time/room from the Teaching page, fixed "Duffusion" -> "Diffusion". Sponsors logos no longer lift on hover.

## 4. TODO (in order)

1. **Zhongkai's snippet missed the kit snippet patch** (#14 + #18 leftover, found by the kit verifier):
   `people/zhongkai_academician.html` still has `width: 200px` / `margin-left: -100px` and no focus ring, so
   it is cut off on 163/151 px tiles and on landscape phones. Fix:
   `python3 /tmp/picasso-tools/review/kitfix/patch_snippets.py zhongkai_academician`, then check all 11
   snippets are identical apart from header comment, `data-fx`, `aria-label`, `<img src>`
   (`/tmp/picasso-tools/kv9/norm.py`), and test zhongkai at 266x284, 257x274 phone, 163x174, 151x161,
   168x180 phone (`kv9/reg.js` + `kv9/ana.py`, `kv9/focus2.js` + `kv9/ring.py`; commands in `fix_results.md`).
2. **Re-verify the scene fixes #19-#24** — the scene verifier was stopped before it reported. Re-run each
   finding's check from `review_findings.txt` (#19-#24) against the current scenes plus the regression pass
   `bash /tmp/picasso-tools/fx4_reg.sh 0` / `1` (10 scenes x 4 tiles; add zhongkai) and look at the frames.
   Pass criteria: console `[]`, switch-off frame == photo (mean 0.00), overflow past the circle <= ~8 logical
   px, nothing cut at the tile edge, t = 0 matches the photo.
3. **Small leftovers from the reports** (judgement calls, keep them small):
   - `people/fx/yue.js`: at t = 0.9 the bat tip reaches 8.6-9.4 logical px past the circle (limit ~8).
   - `people/chang_top_scorer.html` header comment still says "理综 300"; the scene shows 数学 150 + 理综
     (comment only, but the snippet is re-pasted anyway).
   - t = 0 vs photo mean diff is 2.6-4.4 on busy photos (keyi, ohm, zaifeng, yichen, zhengding) against the
     ~2 target. The kit fixer and scene fixer both traced it to the kit's plain linear texture downscale of the
     512 px photo, not to any scene. A possible fix in `kit.js`: upload the photo/plate/cut layers pre-resized to
     the canvas pixel size with a high-quality resample (e.g. `createImageBitmap(img, {resizeWidth,
     resizeHeight, resizeQuality: 'high'})`), keeping `generateMipmaps = false`. Only do it if frames prove it
     better; desktop t = 0 is already fine (0.4-2.1).
   - Blogs: `projects/projects.html` and `events/events.html` still carry the old `createNavHistory` (one-step
     pop, no echo swallowing), and the `picasso-sites-embed` skill still says pop goes back "one step only".
     Syncing is optional; at least update the skill wording to match `blogs/blogs.html` (`pop(view, steps)`,
     landing echoes swallowed, 3000 ms timer).
4. **Own spot-check before the final push** (trust frames, not reports): the egg at 390x844, 768x1024,
   1280x800 (`egg_test.js`) and once inside the live Sites Blogs page (`egg_sites.js 1280 800 <prefix>`);
   a few avatars at 266x284, 257x274, 163x174, 151x161; CSE 291P in Sites (`c291/tabs_shot.js`).
5. Commit with descriptive messages, push the branch.
6. Delete this handoff folder in the final commit (`git rm -r .claude/handoff`) so it never reaches `main`
   (GitHub Pages would publish it). Keep anything worth keeping in the skills instead.
7. Mark the work done and give the user the final summary **in Chinese**: Q1 root causes + editor checklist
   (point to `docs/sites-mobile.md`), Q2 what changed, Q3 the 11 rebuilt avatars (alumni and
   Xinwei / Haotian / Yufei untouched), Q4 CSE 291P, the re-paste list below, and that merging to `main`
   deploys `people/fx/`, `people/static/fx/`, `sponsors/static/wall/` (GitHub Pages, ~10 min cache).

## 5. Re-paste list (Sites embeds only go live after re-paste + Publish; `pbcopy < <file>` on the Mac)

| File | Sites page / place |
|---|---|
| `blogs/blogs.html` | Blogs page (whole-page embed) |
| `sponsors/sponsors.html` | Sponsors page — NEW whole-page embed replacing the title + 9 logo images |
| `home/address.html`, `home/ucsd.html` | footer, middle and left tiles (every page) |
| `events/events.html` | Events page |
| `teaching/291P-W25/cse291p.html` | https://yufeiding.ucsd.edu/teaching/cse291p-w26 (whole-page embed) |
| the 11 `people/*.html` kit snippets | Team page, one embed per person |

Scenes, kit and images deploy by merging to `main`; the snippets load them from
`https://yil384.github.io/Picasso-Lab/people/fx/...`, so re-paste the snippets after the merge is live.

## 6. Test tooling

The first session's Playwright harness and ~220 test scripts are in `.claude/handoff/tools/`. Set up:

```bash
cp -r /home/user/Picasso-Lab/.claude/handoff/tools /tmp/picasso-tools
bash /tmp/picasso-tools/init_dirs.sh
cd /tmp/picasso-tools && export NODE_PATH=/opt/node22/lib/node_modules
```

- `harness.js` — `open({width, height, swaps, dsf})` + `gotoSites(page, url)`. Routes
  `https://yil384.github.io/Picasso-Lab/**` to the working tree with `Access-Control-Allow-Origin: *`,
  disk-caches everything else (Sites is slow and flaky through the proxy), aborts analytics / Firebase /
  Supabase, disables site isolation so phone emulation reaches the cross-origin embed. `swaps` replaces a
  Sites embed whose code contains a needle with a local file. Repo path: `PICASSO_REPO` env (default
  `/home/user/Picasso-Lab`). Some older one-off scripts hard-code `/opt/pw-browsers/chromium-1194`; sed it if
  the container has a different Chromium.
- Avatars: `DSF=2 timeout 300 node pfx_test.js <snippet> <prefix> <times csv> <exit csv> <phone 0/1>` ->
  `shots/<prefix>_t###.jpg`, `_hov`, `_tilt`, `_x###`, console errors and the off-state; `python3 pgrid.py
  shots/g_<prefix>.jpg <prefix>` makes a contact sheet; `exact.py` compares `_hov` with `_t000`. Small tiles:
  `review/kitfix/pfx_test_sized.js <snippet> <prefix> <times> <exits> <phone> [TW TH]`; scene-file override
  and analysis: `fx4_test.js`, `fx4_ana.py`, `fx4_reg.sh`. Clock hooks: `window.__pfxClock = () => t`,
  `window.__pfxExit = () => e`.
- Blogs egg: `egg_test.js` (clock hook `window.__eggClock`), `egg_sites.js W H <prefix>` (inside live Sites),
  reviewer repros `review/t*.js`, fixer tests `my/*.js`, verifier tests `vb/*.js`.
- Pages in Sites: `c291/sites_shot.js`, `c291/tabs_shot.js` (course page), `page_shot.js URL out.jpg W H`.
- Python needs pillow, numpy, opencv (the setup script installs them). Screenshots as JPEG, one browser at a
  time.

Other context files here: `review_findings.txt` (the 24 confirmed findings with repro and suggested fix),
`fix_results.md` (what each fixer changed + the two verifier reports), `AVATAR_BRIEF.md` (the brief the scene
builders got), `workflows/` (the review and fix workflow scripts, for reference).

## 7. Things learned the hard way (memory)

- Sites embed = `document.write` into an `about:blank` iframe inside a sandboxed random
  `*-atari-embeds.googleusercontent.com` origin. The embed document is in **quirks mode** (BackCompat):
  `documentElement.clientHeight` is the whole document, so viewport size must come from `document.body`;
  `overflow` on `body` makes body the scroll box and breaks `position: sticky`. Sites clears `localStorage` on
  every load, swallows clicks on `href="#..."`, injects `<base target="_blank">`, and its (i) button sits at
  12-60 px from the left and 12-64 px from the bottom of every embed.
- Team tiles by window width: 266x284 (>= 1280), 244x260 (1180), 209x223 (1024), 163x174 (820),
  151x161 (768), 257x274 (portrait phone), 168x180 (landscape phone). Phones are detected with
  `Math.min(screen.width, screen.height) < 600` (the tile itself is about the same size everywhere).
- Kit: three.js 0.160 from jsdelivr via an import map in each snippet; q5.js 4.8.3 for the 2D layer
  (`new Q5('graphics')` gives an OffscreenCanvas: `createCanvas(W, H, {alpha: true})`, `pixelDensity(dpr)`,
  then blit onto a visible canvas every frame). Camera uses `setViewOffset` so the optical axis is on the
  avatar centre; `depthScale(z) = (dist - z) / dist`. Photo textures: `generateMipmaps = false`,
  `LinearFilter` (mipmaps blurred busy photos). Use `k.show` for anything that scales in (ink outlines leave
  black specks at scale ~0). GLSL: `flat` is reserved.
- Layers: BiRefNet portrait matte via rembg (`birefnet-portrait`) crashes after the first image in a process,
  so `make_layers.py` runs one process per image; plates are OpenCV TELEA inpaints (blurry where the person
  was: never show a big plate area without covering it).
- Egg: `eggRun` uses rAF timestamps plus the `__eggClock` hook; shards pick the texture by `vFlip > 0.5`;
  crumple uses `uHalf` per-direction normalisation; a `blogTransitionTarget` guard stops history echoes from
  cancelling a transition; `egg-hold-fonts` avoids a font reflow mid-film.
- Playwright in this container: route every request through `route.fetch` with retries (Chromium's own
  network stack hits `ERR_TOO_MANY_RETRIES` on the proxy). Give the host test page a viewport meta or phone
  layouts come out zoomed.
