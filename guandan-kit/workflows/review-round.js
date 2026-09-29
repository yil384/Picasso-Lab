export const meta = {
  name: 'guandan-review-round',
  description: 'Four-lens review of the merged Guandan UI (Tencent fidelity, gameplay QA, AI-tell, must-keep) + open-issue verification, synthesized into ranked findings and per-screen scores',
  whenToUse: 'Each review round of the Guandan redesign (args: {round, prevReview?})',
  phases: [
    { title: 'Review', detail: 'six independent reviewers, each with its own lens' },
    { title: 'Synthesize', detail: 'dedupe, calibrate severity, per-screen scores, fix plan by track' },
  ],
}

const ROUND = (args && args.round) || 1
const PREV = (args && args.prevReview) || ''

const CONTEXT = `
You are one reviewer in review round ${ROUND} of the Picasso Lab Guandan (掼蛋) redesign. The goal of the redesign: a 1:1 replica of
Tencent's professional Guandan UI (腾讯掼蛋 / 大掼蛋 2026) while keeping every lab easter egg and personalization. The user rejected earlier
versions as "AI味 / 不专业" (looks AI-generated / unprofessional) and said "好好优化，不要糊弄" (do it properly, no corner-cutting). Be strict and concrete.

Repo: /home/user/Picasso-Lab (branch guandan-cloud). YOU ARE READ-ONLY: do not edit, commit, or push anything in the repo. Your own scratch
files (scripts, screenshots, crops, side-by-sides) go under /home/user/Picasso-Lab/guandan-kit/scratch/r${ROUND}-<your-lens>/ (git-ignored).

Read first: guandan-kit/SPEC.md (binding spec), guandan-kit/refs/research-tencent.md (measured Tencent spec), guandan-kit/refs/README.md.
Game code: events/guandan.html (one ES module: lobby/room/table/result code; read the functions relevant to your lens),
events/static/guandan-ui.css (tokens, cards, popups, buttons), guandan-table.css, guandan-lobby.css, guandan-records.css (+ guandan-records.js
board UI), guandan-transition.css. The AI engine (guandan-engine.js, guandan-ai-worker.js), Firebase schema and game rules are out of scope
for changes — report UI/UX problems, and gameplay bugs only if they are UI-side.

Tencent reference screenshots (copyrighted, reference only — never commit): guandan-kit/refs/img/ (full resolution). Downscaled copies:
/tmp/claude-0/-home-user-Picasso-Lab/7a6c480f-dd91-54ff-b4ee-d4a33dbcf32f/scratchpad/refs/. Key refs: tg_ingame_classic.png (table, hand columns,
level tiles, bottom bar), tg_ingame_wild_timer_report.png (逢人配, alarm-clock timer, 剩10张), tg_ingame_bomb.png, tg_ingame_tianwangzha_lowres.png,
dagd_store_4.jpg (NOTE: this is the 2026 in-game action row 不出·hexagon timer·提示·出牌 — README calls it dagd_store_5 but the App Store order
shifted; dagd_store_5.jpg is the tilted 2026 lobby), tx_p3_img5.jpg (in-game), qqg_result.jpg (result), qqg_ribbons.jpg, qqg_shouchu.jpg (首出),
yxrb_lobby.jpeg (PRIMARY lobby), tx_p3_img1.jpg, yxrb_room.png (PRIMARY room), tx_p3_img3.jpg, yxrb_vs.jpeg (VS popup), yxrb_matchlist.jpeg,
tx_p3_img4.jpg, tx_p3_img6.jpg, yxrb_popup.png (popup with gold oblique title).

Baseline screenshots of the CURRENT build (already captured for you): guandan-kit/harness/shots/<vp>-<scene>.jpg with captions in
guandan-kit/harness/shots/<vp>-scenes.json. Viewports: desk 1440x900@2, hd 1280x720@2, ifr 1024x640@2 (iframe-ish), phone 844x390@3
(landscape phone, touch), portrait 390x844@3 (touch; the in-game stage is rotated 90deg, lobby/room are not). Scenes: lobby, lobby-typehint,
lobby-rules, lobby-settings, lobby-labdeck, records-latest/mvp/board/history, lobby-loading, room-alone-toast, room-alone, room-typehint, room-full,
room-dissolve, room-guest, en-lobby, en-room, en-table-follow, en-table-menu, en-result-win, t-intro, t-dealing, t-firstlead, t-opening-other,
t-mylead, t-mylead-hint, t-follow, t-follow-hint, t-others, t-typehint, t-bomb4(-late), t-bomb6(-late), t-flush(-late), t-joker(-late), t-ribbons,
t-menu, t-tracker, t-tracker-log, t-rules, t-rowmode, t-tribute(-return), t-tribute2(-return), t-kanggong(-after), t-return, r-win, r-peek, r-lose,
r-afail, r-gameover, r-guest, spectator. Screenshots are large (dpr 2-3): downscale/crop with PIL (python3) before viewing them, and build
side-by-side comparisons with the matching reference. LOOK at the images; don't guess from code.

Harness (to reproduce or measure anything the baseline doesn't show): run from /home/user/Picasso-Lab/guandan-kit/harness.
gdh.py: "async with session(vp, tag) as s" -> s.goto(query, lang=, store=, local=), s.press(sel) (real touch on phones), s.shot(name),
s.state(), s.get_game()/put_game()/set_game(fn), s.stage(js, arg) (stage.js helpers __gd.make/give/trim/sameRank/play/pass/turn/put/get/high),
s.create_room(), s.fill_ai(), s.start(), s.quick_start(), s.wait_deal_done(), s.until_deal(ms), s.act(), s.play_round(), s.next_round(),
s.rect(sel), s.long_tasks(), s.errors. scenes.py holds ready-made staged states (FOLLOW, OTHERS, BOMB_PRE/BOMB_GO, RIBBONS, FIRST_LEAD,
TRIBUTE, KANGGONG, RESULT, SPECTATE) — import them. window.__fbDelay = ms simulates Firebase latency. Set GD_SHOTS=<your scratch dir> so
your shots don't overwrite the baseline. The machine has 4 CPUs and another reviewer may be running a browser: run ONE browser at a time,
keep runs short, never leave browsers open. play.py <vp> 2 plays two full rounds (~2 min).

Severity: high = broken/unusable/clearly wrong vs Tencent or spec or a must-keep regression; medium = clearly visible defect or noticeable
fidelity gap a lab member would notice; low = polish. Every finding needs evidence (screenshot path + what exactly is wrong, with measurements
where possible) and a concrete fix (file + selector/function + what to change). Don't pad: report real problems only, no praise.
${PREV ? `\nPrevious review rounds (for context: check whether earlier findings are really fixed and look for regressions):\n${PREV}\n` : ''}`

const FINDING = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    screen: { type: 'string', description: 'lobby | room | popups | table | table-actions | table-moments | results | vs-intro | records | portrait | english | eggs | global' },
    viewports: { type: 'array', items: { type: 'string' } },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    problem: { type: 'string' },
    evidence: { type: 'string' },
    fix: { type: 'string' },
    track: { type: 'string', enum: ['table', 'lobby', 'records', 'transition', 'shared'] },
  },
  required: ['title', 'screen', 'severity', 'problem', 'evidence', 'fix', 'track'],
}
const SCORE = {
  type: 'object',
  properties: { screen: { type: 'string' }, score: { type: 'number' }, worst_viewport: { type: 'string' }, rationale: { type: 'string' } },
  required: ['screen', 'score', 'rationale'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    summary: { type: 'string' },
    scores: { type: 'array', items: SCORE },
    findings: { type: 'array', items: FINDING },
  },
  required: ['lens', 'summary', 'findings'],
}
const ISSUE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' }, area: { type: 'string' },
          status: { type: 'string', enum: ['fixed', 'partially-fixed', 'open', 'obsolete'] },
          evidence: { type: 'string' }, remaining: { type: 'string' },
        },
        required: ['index', 'area', 'status', 'evidence'],
      },
    },
  },
  required: ['items'],
}

const LENSES = [
  { key: 'qa', label: 'review:gameplay-qa', schema: REVIEW_SCHEMA, prompt: `${CONTEXT}
YOUR LENS: GAMEPLAY QA. Actually play and break it. Required coverage (write a small script per item under your scratch dir):
1. Complete games vs AI into round 2 (through the tribute) on desk (mouse) and phone + portrait (real touch via s.press / page.tap): python3 play.py phone 2 etc.
   Zero console errors and no long tasks > 120 ms during play (report what you see).
2. Rejoin by reload mid-round (open a new page with ?room=CODE and the store seeded from s.get_game()): the hand, played cards, turn, timers,
   selection, 首 tag and no replayed animations (deal, intro, bursts) must be right.
3. Timers/timeouts: stage a state with turnStartedAt = now - 175000 on my turn and on an AI/other seat; check the countdown display (hexagon and
   alarm clock, red pulse <= 10 s), the auto-pass / auto-play on timeout, and that the opening lead is untimed (clock hands).
4. Tribute and 抗贡 in a real round 2 and staged (scenes.TRIBUTE / KANGGONG): the moment finishes before anyone can act; revealed jokers.
5. A-challenge fail, A-challenge pass/game over (stage via scenes.RESULT args like scenes.group_result does), host vs guest (等待房主), spectator view.
6. 提示/出牌/不出 legality: invalid selections toast 牌型不符 / 管不上 and 出牌 stays soft-disabled (aria-disabled); 不出 absent on a lead;
   the no-beat state (only 不出 primary); 提示 cycles on repeated presses; press-and-slide selection in column mode; tap on felt clears;
   理牌 grouping and 横排 row mode + long-press reorder; hand columns never hide a rank/suit index (J/Q/K must read correctly) at every viewport.
7. Room flows: sit / change seat, AI 补位 and per-seat AI badge, remove a seat (× badge), guest leaves, host ↩ (leave), 解散房间 with
   confirmation and guests notified, host hand-off to a human (房主已离开，你成为房主), loading feedback when Firebase is slow (__fbDelay=2000).
8. Touch targets: measure hit areas of every tappable control on phone and portrait (>= 40 CSS px required by the spec) — report any below.
Report each defect as a finding (track = the code owner: table | lobby | records | transition | shared). Give scores only if you have a
clear view (optional).` },
  { key: 'fid-table', label: 'review:fidelity-table', schema: REVIEW_SCHEMA, prompt: `${CONTEXT}
YOUR LENS: TENCENT FIDELITY — IN-GAME TABLE. Compare every table scene side by side with the matching reference at 844x390 (phone) and
1440x900 (desk), plus 390x844 (rotated portrait) and 1024x640: felt colour/texture/rim/floor, seat placement and avatar/name-plate/relation-pill
shapes and sizes, level tiles, top-right round buttons, watermark, hand card size/proportion/index/pip/portraits, column step and pitch, the
bottom bar and its pills, the action row (sizes, colours, 3D edge, stroked letter-spaced labels, hexagon timer, order, placement), played cards
(size, overlap, index), 不出 word, alarm clock, 剩N张 badge, 首 tag, 首出 popup (qqg_shouchu), deal animation, tribute/还贡/抗贡 moment, finish
ribbons (qqg_ribbons), bomb/同花顺/天王炸 FX (tg_ingame_bomb / tianwangzha), combo labels, 记牌器 strip, ☰ menu, row mode, rules popup in the stage,
toasts. Measure (PIL pixel coordinates, % of screen) against research-tencent.md numbers. Score each of these screens 0-10 (8+ = a Tencent
player would accept it as the real thing; list what keeps it from 10): table (idle / others' turn), table-actions (my turn, action row,
selection, 提示), table-moments (deal, 首出, tribute/抗贡, ribbons, bombs, combo labels), portrait (the rotated table on 390x844).
Findings for everything that costs points. Also judge English mode on the table where you see it.` },
  { key: 'fid-meta', label: 'review:fidelity-meta', schema: REVIEW_SCHEMA, prompt: `${CONTEXT}
YOUR LENS: TENCENT FIDELITY — LOBBY, ROOM, POPUPS, RESULTS, VS INTRO, 巅峰对决 BOARD. Side by side with yxrb_lobby / tx_p3_img1 / dagd_store_5
(lobby), yxrb_room / tx_p3_img3 (room; our room is "room-as-table" per SPEC 5.3 — judge the chrome, panels, radios, pills, header, proportions),
yxrb_popup (popups: rules, settings, lab deck, dissolve confirm), qqg_result (round/match result screens, all variants r-win r-lose r-afail
r-gameover r-guest r-peek), yxrb_vs (巅峰对决 VS intro t-intro and the records board style), yxrb_matchlist / tx_p3_img4 / tx_p3_img6 (records
board pages). At 844x390 and 1440x900 first, then 1024x640, 1280x720 and 390x844 portrait (lobby/room are NOT rotated in portrait; they get
portrait adaptations). Measure proportions (top bar height, rail, tile grid extents and aspect, bottom nav, 快速开始 bar; room header, panels,
row heights, radio size, CTA pill). Score each 0-10 (8+ = reads as Tencent's product): lobby, room, popups, results, vs-intro, records,
english (English mode across lobby/room/table/result: fits, no collisions, not machine-translated-looking). Findings for everything that
costs points.` },
  { key: 'ai-tell', label: 'review:ai-tell-hunter', schema: REVIEW_SCHEMA, prompt: `${CONTEXT}
YOUR LENS: AI-TELL HUNTER. Hunt everything that still looks AI-generated, web-page-like, amateur, over-explained or inconsistent, on every
screen and viewport: copy (Chinese first; wordy captions, advisor sentences, bilingual stutter, English kickers, inconsistent terms like 不要 vs
不出, machine-translated English), icons (stroke icon sets, mismatched glyph styles, emoji), spacing/alignment/baseline issues, mismatched
radii/shadows, text overflow/ellipsis/clipping, inconsistent button styles, low-contrast text, anything "SaaS dashboard" or "landing page".
Also scan the CSS/HTML for SPEC §3 violations: backdrop-filter, glow/neon text-shadow or box-shadow halos (esp. outside avatar circles — a
standing user rule), HUD corner brackets, dot-grid textures, letter-spaced English kickers, infinite decorative animations (only the turn
timer and 报牌 pulse may loop), animated filter/box-shadow, CSS mask/conic-gradient/border-image, will-change on text, missing
prefers-reduced-motion handling, relative asset URLs (must be absolute https://yil384.github.io/Picasso-Lab/...), third-party hosts other than
fonts.googleapis.com / fonts.gstatic.com / cdn.jsdelivr.net / www.gstatic.com, dead code and stacked "theme pass" CSS overrides.
Give each finding a severity by how much it makes the product look unprofessional. Optional scores.` },
  { key: 'must-keep', label: 'review:must-keep', schema: REVIEW_SCHEMA, prompt: `${CONTEXT}
YOUR LENS: MUST-KEEP (SPEC §1). Verify every item still works, with evidence, and report any regression as a finding:
- Labmate portraits on every J/Q/K/A card (hand, played cards, lobby fan, rules examples, lab deck), facePortraitMap signature mapping unchanged.
- Seat avatars show the real labmate photo when the nickname matches a member exactly (table seats, room seats, result, VS intro), initials
  otherwise, AI seats their glyph; exact matching only (a fragment like "Lin" matches nobody).
- 巅峰对决 records: data (PLAYERS/MATCHES) and scoring identical — diff events/static/guandan-records.js against origin/main
  (git diff origin/main -- events/static/guandan-records.js) and make sure only UI changed; MVP, leaderboard, Bayesian score, signature
  card/style/quote per player all shown; works in guandan.html's modal and in events.html's mvp overlay.
- The PICASSO "P" card back emblem (deal, tribute, lobby share rail).
- Typing "picasso" returns to the events page through the return transition (labmate-avatar shards, cards, coins) from EVERY screen: lobby,
  room, table (landscape AND the rotated portrait table), result, with a popup open; the "try typing picasso" hint (#return-type-hint) shows
  after 2+ typed letters, never covers the hand, lobby controls, popups or results, and is rotated with the portrait table.
- Background music #guandan-bgm plays after a gesture, the music toggle works in the lobby rail, settings and the table menu, and persists.
- events/events.html: the Guandan egg trigger/overlay, the launch transition to guandan.html, the "222aak" photo, the mvp overlay (board with
  splash) — load events.html in the harness (it is served from the checkout) and exercise them. Compare events.html against origin/main
  (git diff origin/main -- events/events.html) — it should be unchanged except where the shared records board requires.
- Lab copy: 蓝队/红队, 南家 AI/西家 AI/北家 AI/东家 AI, small Picasso Lab branding; English toggle and L(en, zh) strings.
Score optional (use screen "eggs" for the easter eggs overall).` },
  { key: 'open-issues', label: 'review:open-issues', schema: ISSUE_SCHEMA, prompt: `${CONTEXT}
YOUR JOB: verify each of the 19 items in guandan-kit/open-issues.json (index 0-18) against the CURRENT build. They were found BEFORE the
gd3/table and gd3/lobby commits that were merged since; many may be fixed. For each item: reproduce the exact scenario at the named viewport
(use the baseline shots when they show it, else run the harness), measure (e.g. element rects, overlaps, tap target sizes, legibility of the
stacked index), and report status fixed / partially-fixed / open / obsolete with concrete evidence and, if not fixed, what remains.` },
]

phase('Review')
const reviews = await parallel(LENSES.map(l => () => agent(l.prompt, { label: l.label, phase: 'Review', schema: l.schema })))
const byKey = {}
LENSES.forEach((l, i) => { byKey[l.key] = reviews[i] })
const missing = LENSES.filter((l, i) => !reviews[i]).map(l => l.key)
if (missing.length) log(`reviewers with no result: ${missing.join(', ')}`)

phase('Synthesize')
const synth = await agent(`${CONTEXT}
YOU ARE THE SYNTHESIZER for review round ${ROUND}. Below are the raw results of six reviewers (JSON). Your job:
1. Merge duplicates across lenses into single findings (keep the strongest evidence, note which lenses reported it). Re-check any
   finding that looks doubtful by opening its evidence screenshot (downscaled) or the code; drop findings that are wrong, and say which you dropped.
2. Calibrate severity consistently (high / medium / low per the definitions) and give each finding an id R${ROUND}-NN ordered by severity.
3. Assign each finding to a fix track by code ownership (SPEC §4.1): table (renderTable and table code, guandan-table.css, card component in
   guandan-ui.css), lobby (lobby/room code, guandan-lobby.css, popups in guandan-ui.css), records (guandan-records.css / board UI in
   guandan-records.js — data must not change), transition (return transition, type hint, guandan-transition.css), shared (tokens / cross-cutting).
4. Per-screen scores: for each screen (lobby, room, popups, table, table-actions, table-moments, results, vs-intro, records, portrait, english,
   eggs) give the score (take the fidelity reviewers' scores; if several, the lower; if none, estimate from the evidence and say so).
5. Open issues: pass through the open-issues verifier's statuses (index, area, status, one-line evidence).
6. Write the round's review as Markdown into /home/user/Picasso-Lab/guandan-kit/scratch/review-r${ROUND}.md: a scores table, the open-issue
   status table, then all findings grouped by severity (id, title, screen, viewports, track, lenses, problem, evidence path(s), fix). This
   file is what the fix agents will work from, so make each fix instruction precise.
Return the structured result as well.

RAW REVIEWS:
${JSON.stringify(byKey, null, 1)}`, {
  label: 'synthesize', phase: 'Synthesize', schema: {
    type: 'object',
    properties: {
      scores: { type: 'array', items: SCORE },
      open_issues: { type: 'array', items: { type: 'object', properties: { index: { type: 'number' }, area: { type: 'string' }, status: { type: 'string' }, evidence: { type: 'string' } }, required: ['index', 'status'] } },
      findings: { type: 'array', items: { type: 'object', properties: Object.assign({ id: { type: 'string' }, lenses: { type: 'array', items: { type: 'string' } } }, FINDING.properties), required: ['id', 'title', 'severity', 'track', 'problem', 'fix'] } },
      dropped: { type: 'array', items: { type: 'string' } },
      markdown_path: { type: 'string' },
    },
    required: ['scores', 'findings', 'markdown_path'],
  },
})
return { synth, raw: byKey }
