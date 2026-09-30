export const meta = {
  name: 'picasso-branch-review',
  description: 'Find real bugs across the mobile fixes, blogs easter egg, avatar kit and 10 avatar scenes, then adversarially verify each finding',
  phases: [
    { title: 'Find', detail: 'six area reviewers read the diff vs 8fb8a99 and may run the test harness' },
    { title: 'Verify', detail: 'skeptics try to refute each finding (3 votes for high severity)' },
  ],
}

const REPO = '/home/user/Picasso-Lab'
const SP = '/tmp/picasso-tools'

const CONTEXT = `You are reviewing branch claude/beautiful-einstein-0qnvta of ${REPO} (Picasso Lab website, pages pasted into Google Sites as embed code; assets served by GitHub Pages). Base commit: 8fb8a99 — see \`git -C ${REPO} diff 8fb8a99..HEAD -- <paths>\`.
Read first: ${REPO}/.claude/skills/picasso-sites-embed/SKILL.md (how Sites runs embeds: document.write into an about:blank iframe in a sandboxed random origin, no history entries, localStorage cleared, (i) button, absolute URLs only) and ${REPO}/.claude/skills/picasso-avatar-fx/SKILL.md (the avatar kit contract).
Test tools already exist in ${SP} (Node + Playwright, run with NODE_PATH=/opt/node22/lib/node_modules, from ${SP}):
- pfx_test.js <snippet> <prefix> [times csv] [exit csv] [phone 0/1] — renders a people snippet like Sites does, clicks it, holds the effect clock at times (window.__pfxClock), captures shots/<prefix>_*.jpg, runs the exit (window.__pfxExit), prints console errors and the off-state [glPresent, imgVisibility, ariaPressed]. Use DSF=2 env for 2x pixels. python3 pgrid.py shots/g_<prefix>.jpg <prefix> makes a contact sheet you can Read.
- egg_test.js <W> <H> <prefix> [in-times] [out-times] — blogs.html easter egg: types picasso, holds the transition clock (window.__eggClock), captures frames, then leaves again. python3 grid.py <out> '<glob>' <cols> <scale> for sheets.
- egg_sites.js / sites_pfx.js run inside the live Google Sites page (slow, flaky network).
Use your own unique shot prefixes. NEVER edit, create or delete files under ${REPO}; never git commit. Scratch files only under ${SP}/review/.
Report only REAL defects a visitor or maintainer would hit: crashes, console errors, wrong visuals, things that don't restore, leaks of WebGL contexts / textures / listeners / rAF loops, race conditions (toggle during load/exit, repeated triggers, history back/forward), Safari/iOS or Android incompatibilities with concrete API evidence, Sites-embed rule violations (relative URLs in pasted files, history entries, relying on localStorage, emoji in pages), accessibility breakage (keyboard, reduced motion). No style nits, no "could be cleaner". Each finding needs a concrete failure scenario and the exact file + line.`

const AREAS = [
  { key: 'blogs-state', prompt: `Area: blogs/blogs.html — the easter-egg state machine and history. Functions reconcileBlogMode, runEggTransition, renderBlogMode, renderTrueBlogs/renderOfficialBlogs, startBlogSecretTransition, requestBlogReturn, syncBlogFromHistory, createNavHistory usage, blogTransitionToken/blogTransitionTarget, the keydown handler and installPicassoTripleTap, the article viewer (openArticle/openFakeArticle/closeArticle) interplay, prefers-reduced-motion path, the eggWipe fallback, the egg-hold-fonts class, scroll blocking listeners. Look for states that get stuck (overlay left on screen, body classes not removed, wrong mode after rapid double triggers or Back during a transition, history depth mistakes), exceptions, keyboard traps.` },
  { key: 'blogs-render', prompt: `Area: blogs/blogs.html — rendering: eggSnapshot (DOM-to-canvas painter), eggStage/eggShatter/eggCrumple (three.js 0.160 shaders and resource disposal), eggFocusLines, eggStampCanvas, the dynamic import of three from jsdelivr, font loading (eggFonts), the tabloid CSS (body.true-blogs …) at widths 320–1440, the EGG_ART inline SVGs, and fakeArticleHTML (srcdoc). Check GLSL validity under WebGL1 and WebGL2 (extensions, reserved words, precision), canvas tainting risks, DPR handling, memory/context release, Safari/iOS compatibility of every Canvas2D API used (roundRect, letterSpacing, fontBoundingBoxAscent, ellipse, createPattern on SVG images), and layout breakage (overflow, overlaps) at phone and desktop widths — you may run egg_test.js at 320x640, 390x844, 768x1024, 1440x900 and read frames.` },
  { key: 'kit', prompt: `Area: people/fx/kit.js and the 10 pasted snippets people/{chang_top_scorer,jixuan_painting,keyi_esports_genius,ohm,xiang_concert,yichen_card_master,yue_baseball,zaifeng_academician,zhengding_sunshine,zhuo_gold_medal}.html (they must be identical except header comment, data-fx, aria-label, img src — diff them). Check: lifecycle races (click while loading, click during exit, double click, toggling many times, switching off while build() is pending), teardown (every canvas removed, renderer disposed + forceContextLoss, rAF cancelled, document listeners never leak across toggles, cached textures not disposed in a way that breaks the next activation), webglcontextlost handling, reduced motion path (turnOn/turnOff), tilt spring stability, q5 load failure fallback, the import map + dynamic import in a document.write'd about:blank iframe, browsers without import-map support (iOS < 16.4) — does the click fail gracefully and keep the photo?, the phone detection and CSS layout, the camera view-offset math (avatar must land exactly where the <img> is at any tile size), k.at/k.patch/k.toScreen correctness. You may write small test pages under ${SP}/review/ and run them with the harness (see pfx_test.js for how).` },
  { key: 'scenes-a', prompt: `Area: avatar scenes people/fx/chang.js, jixuan.js, keyi.js, ohm.js (each with its snippet). For each scene verify with code reading AND pfx_test.js runs (desktop DSF=2 and phone): (1) t=0 shows exactly the photo (no prop visible, no tint); (2) at e=1 (exit done) the frame is exactly the photo again — every tint, opacity, colour, visibility the scene changed on kit layers (k.layers.photo/plate/person) is restored, including when the effect is switched on again after an exit (state carried over between activations?); (3) clicking again during the exit reverses cleanly; (4) no per-frame allocations in update/draw2d hot paths (new THREE.Vector3/Color/Matrix, closures creating arrays each frame), no textures/materials created outside the scene graph without dispose; (5) nothing overflows the avatar circle by more than ~8 px or gets clipped by the tile on desktop (266x284, photo top-left at 8,8) or phone (257x274, photo bottom-centre); (6) q5 state leaks (fill/stroke/strokeWeight carry-over, textAlign) causing stray drawing; (7) reduced-motion still frame (module.still) is sensible; (8) any console error or NaN.` },
  { key: 'scenes-b', prompt: `Area: avatar scenes people/fx/xiang.js, yichen.js, yue.js, zaifeng.js, zhengding.js, zhuo.js (each with its snippet). For each scene verify with code reading AND pfx_test.js runs (desktop DSF=2 and phone): (1) t=0 shows exactly the photo (no prop visible, no tint); (2) at e=1 (exit done) the frame is exactly the photo again — every tint, opacity, colour, visibility the scene changed on kit layers (k.layers.photo/plate/person) is restored, including when the effect is switched on again after an exit; (3) clicking again during the exit reverses cleanly; (4) no per-frame allocations in update/draw2d hot paths, no textures/materials created outside the scene graph without dispose; (5) nothing overflows the avatar circle by more than ~8 px or gets clipped by the tile on desktop (266x284, photo top-left at 8,8) or phone (257x274, photo bottom-centre); (6) q5 state leaks causing stray drawing; (7) reduced-motion still frame is sensible; (8) any console error or NaN; (9) Yue's impact frames: a full-frame strobe — check it is ≤ 3 frames and not repeated (photosensitivity).` },
  { key: 'mobile-docs', prompt: `Area: the mobile fixes and docs: home/address.html (embed mode: m-phone class, wide-tile media query, full mode untouched), home/ucsd.html, sponsors/sponsors.html (whole-page embed: absolute URLs, layout at 320–1440 px, the Sites (i) button clearance), events/events.html (the in-frame class + danmaku bar change: does it break desktop, landscape phones, the image-preview popover or any other bottom UI?), docs/sites-mobile.md (every claim accurate? instructions correct for current Google Sites?), .claude/skills/picasso-avatar-fx/SKILL.md (accurate vs the code?), people/fx/tools/make_layers.py (would it run? paths right?), .gitignore. You may render pages with the harness (page_shot.js <url> <out> <W> <H> <full 0/1> and foot_test.js exist in ${SP}).` },
]

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          summary: { type: 'string' },
          failure_scenario: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: ['file', 'severity', 'summary', 'failure_scenario', 'evidence'],
      },
    },
  },
  required: ['findings'],
}
const VERDICT = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    reproduced: { type: 'boolean' },
    reason: { type: 'string' },
    fix_hint: { type: 'string' },
  },
  required: ['refuted', 'reproduced', 'reason'],
}

const verifyPrompt = (f, lens) => `${CONTEXT}

You are a skeptical verifier. A reviewer claims this defect:
FILE: ${f.file}${f.line ? ':' + f.line : ''}
SEVERITY: ${f.severity}
CLAIM: ${f.summary}
FAILURE SCENARIO: ${f.failure_scenario}
EVIDENCE GIVEN: ${f.evidence}

Your lens: ${lens}
Try hard to REFUTE it: read the actual code paths end to end, check whether the scenario can really happen in a browser inside Google Sites, and where feasible reproduce it with the harness (your own shot prefix). Set refuted=true if the claim is wrong, impossible, already handled elsewhere, or only a matter of taste; if uncertain after investigating, lean refuted=true. Set reproduced=true only if you actually observed it (test output or frames). If it is real, give a concrete minimal fix_hint (file, what to change).`

const LENSES = [
  'code-path tracing: follow every call and guard; is there a branch that already prevents it?',
  'reproduction: build the smallest harness run or test page that would show it, and run it',
  'platform facts: check the browser/Sites/three.js/q5 behaviour the claim depends on (API support, spec semantics)',
]

const results = await pipeline(
  AREAS,
  (a) => agent(`${CONTEXT}\n\n${a.prompt}\n\nBe thorough: read the code fully, run the harness where it helps, and list every real defect you find (can be zero).`, { label: `find:${a.key}`, phase: 'Find', schema: FINDINGS }),
  (found, a) => {
    const list = (found && found.findings) || []
    log(`${a.key}: ${list.length} finding(s) to verify`)
    return parallel(list.map((f, i) => () => {
      const n = f.severity === 'high' ? 3 : 1
      return parallel(Array.from({ length: n }, (_, j) => () =>
        agent(verifyPrompt(f, LENSES[j % LENSES.length]), { label: `verify:${a.key}#${i + 1}.${j + 1}`, phase: 'Verify', schema: VERDICT })))
        .then(vs => {
          const votes = vs.filter(Boolean)
          const keep = votes.filter(v => !v.refuted).length
          const survives = n === 1 ? keep === 1 : keep >= 2
          return { area: a.key, ...f, survives, votes }
        })
    }))
  },
)

const all = results.filter(Boolean).flat().filter(Boolean)
const confirmed = all.filter(f => f.survives)
const dropped = all.filter(f => !f.survives)
log(`${all.length} findings, ${confirmed.length} confirmed, ${dropped.length} refuted`)
return { confirmed, dropped: dropped.map(f => ({ area: f.area, file: f.file, line: f.line, summary: f.summary, why: f.votes.map(v => v.reason).join(' | ') })) }
