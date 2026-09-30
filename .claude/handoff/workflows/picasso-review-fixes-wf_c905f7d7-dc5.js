export const meta = {
  name: 'picasso-review-fixes',
  description: 'Fix the 24 confirmed review findings (blogs egg, avatar kit + snippets, 4 scenes) and independently verify each group',
  phases: [
    { title: 'Fix', detail: 'blogs.html and kit+snippets in parallel, then the scenes on the final kit' },
    { title: 'Verify', detail: 're-run each reproduction and a regression pass per group' },
  ],
}

const REPO = '/home/user/Picasso-Lab'
const SP = '/tmp/picasso-tools'
const COMMON = `Repo ${REPO} (branch claude/beautiful-einstein-0qnvta). Pages are pasted into Google Sites as embed code; read ${REPO}/.claude/skills/picasso-sites-embed/SKILL.md and ${REPO}/.claude/skills/picasso-avatar-fx/SKILL.md first.
The confirmed review findings, with failure scenarios, evidence and suggested fixes, are in ${SP}/review_confirmed.txt (numbered #1..#24). Reproduction scripts the reviewers wrote are in ${SP}/review/ (e.g. t1.js, t10.js, t14.js, vr_leakpic.js, vfy14.js, vfq_probe.js, vtexc/...). Test tools in ${SP}: pfx_test.js (people snippets; DSF=2 env; args <snippet> <prefix> [times] [exits] [phone 0/1]), egg_test.js (blogs egg; args <W> <H> <prefix> [in-times] [out-times]), egg_sites.js / sites_pfx.js (live Google Sites, slow), pgrid.py / grid.py contact sheets; run node with NODE_PATH=/opt/node22/lib/node_modules from ${SP}. Use your own shot prefixes. Do NOT git commit or push (the lead commits). Keep code style consistent with the surrounding code (comment density, naming). No emoji. Report: what you changed per finding (file:line), test evidence (commands + results), anything not fixed and why.`

const BLOGS = `${COMMON}

YOUR FILES: ${REPO}/blogs/blogs.html only.
Fix findings #1, #2, #3, #4, #5 (same as #9), #6, #7, #8, #10, #11 from review_confirmed.txt:
- #6 (high): eggViewport must use the viewport of the current compat mode (the Sites embed document runs in quirks/BackCompat mode, where documentElement.clientHeight is the whole document): use document.body in BackCompat, documentElement otherwise, falling back to innerWidth/innerHeight. Check every other place in the egg code that reads a viewport size.
- #1 + #3: leaving the Real Blogs with a leak (fake article) open must land on the official blog in one go (close the viewer without recording, pop both entries — e.g. pop(view, steps) with history.go(-steps)), and our own pop echo must be recognised and swallowed (track the stack of our pushed hashes and the base hash, remember the expected landing hash on pop, swallow it; reset on external traversal) so a late echo cannot cancel a newer transition. Keep createNavHistory's contract (push/replace/pop/onTraverse) and its header comments accurate.
- #2: after the load waits and after the first snapshot, if the article viewer has opened meanwhile, switch without the film (renderBlogMode) and return; also stop the film early if the viewer opens during it.
- #4: hide the type hint on the instant paths too.
- #5/#9: eggSnapshot must honour CSS transforms (measure untransformed geometry by temporarily setting the element's inline transform to none, synchronously, then paint through the computed matrix about its transform-origin); the rotated CLASSIFIED stamp must come out rotated.
- #7: tabloid cards at <=600px: illustrations fill the card width (align-items: stretch / width 100%).
- #8: the masthead stamp must not overlap the title between 601 and ~960px (move it into the flow at a wider breakpoint, or anchor it to the title).
- #10: shard shadows depth-tested against the shards (z just above the page, depthTest true, transparent, depthWrite false); fix the misleading renderOrder comments.
- #11: decide the egg-hold-fonts hold from whether eggFonts() settled within the budget, not document.fonts.check().
Then test: egg_test.js at 390x844, 768x1024 and 1280x800 (in and out films: frames look right, the final frame equals the page), the reviewers' repro scripts for #1/#2/#3 (they must now pass), and at least one egg_sites.js run inside the live Sites page at 1280x800 checking the canvas buffer height equals the embed height x dpr (see review/vfq_probe.js). Zero console errors.`

const KIT = `${COMMON}

YOUR FILES: ${REPO}/people/fx/kit.js, the 10 kit snippets ${REPO}/people/{chang_top_scorer,jixuan_painting,keyi_esports_genius,ohm,xiang_concert,yichen_card_master,yue_baseball,zaifeng_academician,zhengding_sunshine,zhuo_gold_medal}.html (keep them identical except header comment, data-fx, aria-label, img src — patch them with one script), and ${REPO}/.claude/skills/picasso-avatar-fx/SKILL.md. Do NOT touch people/fx/<scene>.js files, xinwei, haotian_shen, yufei_cats, or the alumni snippets (alon_iron_man, chenyang_captain_america, hezi_scholar).
Fix findings #12, #13, #14, #15, #16, #17, #18, plus these:
- #14 (design decided by the lead): the Team page tiles shrink with the viewport (measured on the live page: 266x284 at >=1280 wide, 244x260 at 1180, 209x223 at 1024, 163x174 at 820, 151x161 at 768, 168x180 on a landscape phone). Make the photo size to its tile in the snippet CSS: --d: min(200px, calc(100vw - 16px), calc(100vh - 16px)); .pfx width/height var(--d); the phone anchor centres with margin-left: calc(var(--d) / -2). The kit keeps scenes in LOGICAL units of a 200 px avatar: s = actual D / 200; k.D = 200, k.R = 100 always; root is scaled by s (together with the tilt rotation); k.dist = actual camera distance / s and k.depthScale(z) uses it; k.at/k.patch/photo/plate/mask geometry stay in logical units; k.W/k.H = canvas CSS size / s; k.toScreen/k.screenAt return logical px; the q5 context is scaled by s around fx.draw2d so 2D drawing is in the same logical px; expose k.s. Scenes that project themselves with ((V.x+1)/2*k.W) then stay correct. The ink outline stays in screen px. The avatar must land exactly on the <img> at every tile size (camera view offset uses actual px).
- If the tile or iframe size changes while an effect is on (rotation, window resize), switch the effect off cleanly (teardown back to the photo, aria-pressed false).
- Quirks-safe viewport size in the kit (document.body in BackCompat, like the blogs fix).
- If mod.build(k) throws after the renderer exists, dispose the renderer/canvases (no leaked context).
- #12: no second build while one is pending; stale webglcontextlost handlers must not kill a newer effect. #13: reset the tilt spring in teardown and scale the applied rotation by (1 - e) so the exit ends flat and t=0 is flat. #15 evict failed texture loads. #16 context-lost handler resets the button state; skip forceContextLoss on an already lost context. #17 dispose cached textures in teardown (they stay cached as objects and re-upload next time). #18 a visible keyboard focus ring in both off and on states.
- Update the skill doc for the logical-unit contract (k.s, k.W/k.H logical, sizes).
Test: pfx_test.js for 3 scenes (zhuo_gold_medal, xiang_concert, jixuan_painting) at desktop DSF=2 and phone; also add a tile-size option to your own copy of the test (e.g. ${SP}/review/pfx_test_sized.js taking TW TH) and check 163x174 and 151x161 tiles: photo fully visible and centred as designed, the effect scaled down with it, t=0 matches the hovered photo (mean abs diff < ~2 using ${SP}/exact.py logic), exit returns to the photo, no console errors, toggle races (click-off-click while loading; click during exit) leave exactly one canvas or none.`

const SCENES = `${COMMON}

The kit (people/fx/kit.js) has just changed: scenes now work in logical units of a 200 px avatar scaled to the tile (k.s = actual/200, k.W/k.H logical, q5 context pre-scaled) — read the kit header and the updated skill doc first.
YOUR FILES: ${REPO}/people/fx/chang.js, keyi.js, ohm.js, yue.js only.
Fix findings #19, #20 (chang), #21 (keyi), #22 (ohm), #23, #24 (yue) as described in review_confirmed.txt.
Then run a regression pass over ALL 10 kit scenes (chang_top_scorer, jixuan_painting, keyi_esports_genius, ohm, xiang_concert, yichen_card_master, yue_baseball, zaifeng_academician, zhengding_sunshine, zhuo_gold_medal) with pfx_test.js at desktop DSF=2 and phone, and with ${SP}/review/pfx_test_sized.js (made by the kit fixer; if missing, write it: same as pfx_test.js with tile width/height args) at 163x174 and 151x161: everything scaled consistently with the photo (props, lettering, 2D layer), nothing detached or misplaced relative to the photo, nothing clipped by the tile, zero console errors, t=0 = photo, exit = photo. If a scene other than your four breaks under the new kit, report exactly what and where (do not edit it).`

const VERDICT = {
  type: 'object',
  properties: {
    all_fixed: { type: 'boolean' },
    items: { type: 'array', items: { type: 'object', properties: {
      finding: { type: 'string' }, fixed: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['finding', 'fixed', 'evidence'] } },
    regressions: { type: 'array', items: { type: 'string' } },
  },
  required: ['all_fixed', 'items', 'regressions'],
}

const verify = (group, findings, extra) => agent(`${COMMON}

You are an independent verifier for the ${group} fixes (findings ${findings}). Do not edit repo files. For each finding, re-run the original reproduction (from review_confirmed.txt evidence and ${SP}/review/ scripts) or build one, and decide fixed/not fixed with evidence. Then do a regression pass: ${extra}. Report regressions precisely (file, line, symptom, how to reproduce).`, { label: `verify:${group}`, phase: 'Verify', schema: VERDICT })

phase('Fix')
const [blogsReport, kitReport] = await parallel([
  () => agent(BLOGS, { label: 'fix:blogs', phase: 'Fix' }),
  () => agent(KIT, { label: 'fix:kit+snippets', phase: 'Fix' }),
])
const scenesReport = await agent(SCENES, { label: 'fix:scenes', phase: 'Fix' })

phase('Verify')
const [vBlogs, vKit, vScenes] = await parallel([
  () => verify('blogs.html', '#1-#11', 'egg in/out films at 390x844 and 1280x800 (frames sane, final frame = page), fake article open/close, Back/forward through the nav frame, reduced-motion instant switch, zero console errors, and one run inside the live Sites page'),
  () => verify('kit + snippets', '#12-#18 and the responsive tile sizing', 'the 10 snippets identical except the 4 allowed parts; 3 scenes at 266x284, 257x274 phone, 163x174, 151x161; toggle races; context released after off; focus ring visible'),
  () => verify('scenes', '#19-#24', 'all 10 scenes at desktop, phone and 151x161: t=0 = photo, exit = photo, nothing clipped, zero console errors'),
])
return { blogsReport, kitReport, scenesReport, vBlogs, vKit, vScenes }
