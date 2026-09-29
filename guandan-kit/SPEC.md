# Picasso Lab Guandan — SPEC v2: "1:1 腾讯掼蛋" rebuild

Read this whole file before touching code (and `HANDOFF.md` first — it says where the work stands).
Paths below: K = `guandan-kit/` in this repo.

## 0. What the user said (2026-09-27, verbatim)
> 现在这个 events/guandan.html 还是没优化到我想要的样子，彩蛋和实验室个性化是够了，这是值得表扬和保留的，但是其他最基础的功能部分和UI设计还是
> 有很大的问题，看着一点也不专业，好好重构优化
> 我说了除了我之前做的那些实验室个性化之外，我想要1:1复刻腾讯的专业设计的掼蛋游戏
> (later) 好好优化，不要糊弄

Intent: keep every easter egg and every lab-personalization feature exactly (they were praised). Everything else — the basic game
functionality and the UI — must be a **1:1 replica of Tencent's professional Guandan game** (腾讯掼蛋 / 大掼蛋 2026): same layout
proportions, component shapes, colour/typography language, interaction model, information density and motion vocabulary. When in doubt,
open the reference screenshot and copy what it does. A screen that still reads like a web page, a SaaS form or a dashboard is NOT done.

## 1. Must keep (lab personalization + easter eggs)
- Labmate portraits on J/Q/K/A cards (`facePortraitMap`/`faceCardPortrait`; card component in `events/static/guandan-ui.css`).
- Seat avatars show the real labmate photo when the nickname matches a lab member (`seatMemberPhoto`).
- 巅峰对决 records content: real matches, players, MVP, leaderboard, Bayesian scoring, signature card/style/quote per player
  (`events/static/guandan-records.js` PLAYERS/MATCHES). Data and scoring must not change. Visual style follows Tencent competitive style.
- The PICASSO "P" card back emblem (blue Tencent-style back).
- Easter egg: typing "picasso" returns to the events page through the return transition (`startReturnToEvents`, labmate-avatar shards,
  cards, coins) plus the "try typing picasso" hint (`#return-type-hint`).
- Background music `#guandan-bgm`.
- Everything in `events/events.html` (egg trigger/overlay, launch transition, "222aak" photo, mvp overlay) — don't edit it except where the
  shared records board requires, and then verify the events page still works.
- Lab copy: team names 蓝队/红队, bot names 南家 AI/西家 AI/北家 AI/东家 AI, small Picasso Lab branding.

## 2. References (look at them — they are the spec)
Images: K/refs/img/ (download with K/refs/fetch_refs.sh — copyrighted, never commit them) — catalogue in K/refs/README.md.
Measured spec (tokens, layout %, cards, action row, tribute/result, effects, lobby/room/competitive): K/refs/research-tencent.md.
- In-game: tg_ingame_classic.png, tg_ingame_wild_timer_report.png, tg_ingame_bomb.png, tg_ingame_tianwangzha_lowres.png, dagd_store_5.jpg
  (2026 action row: 不出 · hexagon timer · 提示 · 出牌), tx_p3_img5.jpg.
- Result / finish: qqg_result.jpg, qqg_ribbons.jpg, qqg_shouchu.jpg.
- Lobby: yxrb_lobby.jpeg (primary), tx_p3_img1.jpg, dagd_store_6.jpg. Room: yxrb_room.png (primary), tx_p3_img3.jpg.
- Competitive / VS / records: yxrb_vs.jpeg, yxrb_matchlist.jpeg, tx_p3_img4.jpg, tx_p3_img6.jpg.
- Copyright: never ship Tencent images/logos/mascots/characters. Copy layout/colour/type/motion with original assets only. Do not copy
  platform chrome (WeChat "···  ◎" capsule, phone status bar, beans/diamond currencies, 加倍/倍 multipliers, 聊天 — we have none).

## 3. Ground rules
1. No AI tells: no emoji in UI, no glassmorphism/backdrop-filter, no neon/glow, no HUD corner brackets, no dot-grid "tech" textures, no
   letter-spaced English kickers, no bilingual label stutter, no Lucide-style stroke icons as primary UI, no infinite decorative animations
   (only purposeful loops: turn timer, 报牌 pulse). Chinese-first copy (English toggle stays; strings go through `L(en, zh)`).
2. Avatars: circular photo, 2px ring (opponent red #e05454, partner/self cyan #1cb4e4), pill label overlapping the bottom. **Never any
   glow/halo/shadow outside the avatar circle** (standing user rule).
3. Perf: animate only transform/opacity; no CSS mask, conic-gradient, border-image, backdrop-filter, animated filter/box-shadow loops.
   Respect prefers-reduced-motion. No will-change on text containers.
4. Absolute asset URLs `https://yil384.github.io/Picasso-Lab/...` for everything we host (Google Sites embed requirement). Third-party only
   from fonts.googleapis.com / fonts.gstatic.com / cdn.jsdelivr.net / www.gstatic.com (firebase).
5. Gameplay must not break: Firebase schema, AI/hint engine (`events/static/guandan-engine.js`, `guandan-ai-worker.js` — do not edit),
   room codes, rejoin, tribute, 接风, A-challenge, timeouts, i18n message parsing behave exactly as before; Firebase writes byte-identical
   unless a real bug fix requires otherwise (then say so explicitly).
6. No Three.js in this round (Tencent's table is flat 2D; fidelity first). No new third-party libraries.
7. Coding style: match the file (plain ES module, template strings, `L()`), sparse useful comments, no dead code, no stacked "theme pass" CSS.

## 4. Architecture (already implemented on the track branches — keep it)
- Fixed-height design stage for the table: logical height 720, width ≥1280, `s = min(H/720, W/1280)`, `transform: scale(s)`; positions in
  design px anchored to stage edges. Portrait phones (W<H, max ≤1024) rotate the in-game stage 90°; overlays live inside the rotated stage;
  lobby/room are not rotated (they have inputs) and get portrait adaptations.
- Table rendering: persistent skeleton + region-diffed updates + event delegation (no full #root.innerHTML per Firebase tick); entry
  animations keyed so re-renders never replay; selection survives ticks.
- `document.body.dataset.screen = 'lobby' | 'room' | 'table'`.
- CSS: guandan-ui.css (tokens/primitives/cards/popups), guandan-table.css, guandan-lobby.css, guandan-records.css, guandan-transition.css.
- Cross-module contracts: `window.GuandanUI.openPopup({title, html, container, wide})` / `openRules(container)` (lobby-owned);
  `window.GuandanMusic = {isOn(), setOn(bool)}` (lobby-owned); `window.GuandanRecordsUI = {open(page), close()}` + `[data-open-records]`
  delegation + banner only into `[data-gdr-banner-slot]` (records-owned). Existing handlers stay the single source of behaviour: invite =
  copyLinkBtn handler, 新桌 = newRoomBtn, language = langToggleBtn, 返回 = startReturnToEvents.

## 5. Screens (targets)
### 5.1 In-game table — copy tg_ingame_* + dagd_store_5
Teal felt exactly like tg_ingame_classic; seats (partner top-centre; opponents left/right ~28% H; self bottom-left) with avatar ≈11.5% H,
name plate, 剩N张 report badge at ≤10; level tiles 我方/对方 under a ☰ menu (邀请好友, 规则, 记牌, 语言, 音乐, 新桌, 返回活动); top-right
记牌/规则 buttons (记牌器 strip computed from unplayed cards not in my hand); centre watermark "PICASSO 掼蛋 / 经典 · 打X" only.
Hand in vertical rank columns (35% step, card h ≈19.1% H, w/h .74, **index always fully legible — shrink cards before compressing the
step**), 理牌/横排 pills, tap + press-and-slide selection, tap felt clears; action row [不出][hexagon timer][提示][出牌] only on my turn
(opening lead hides 不出; invalid ⇒ 出牌 disabled + toast); others' gold alarm-clock timer; played cards 79% size, 48% overlap, rank over
suit; 不出 big stroked word; messages as short toasts; 首 tag + 首出 popup; deal flights synced to dealStartedAt; tribute flights with
进贡/还贡 seat plates, 抗贡 centre word; finish ribbons 头游/二游 warm, 三游/末游 cool; combo labels; bomb tiers (炸弹, 6+, 同花顺, 天王炸
vertical, ≤2 s) as authored FX; played-card FLIP flights (180–220 ms); result screens (viewer-centric 胜利/失败, meta line, warm/cool
two-column panel, level tiles X → Y, #next-round host-only, non-host 等待房主; A-challenge and game-over variants); match intro 巅峰对决 VS
once per match start (keyed room+dealStartedAt, tap to skip). Spectator view; English fits; long names ellipsize. Touch targets ≥40 CSS px.
### 5.2 Lobby — copy yxrb_lobby: top bar, left rail, tall 经典 tile (labmate signature-card fan with the real card component) + tiles
人机练习 / 加入房间 (inline code) / 巅峰对决 / 实验室 / 好友房 / 玩法规则, bottom nav, gold 快速开始 bar. Portrait adaptation. Loading
feedback on every action that waits for Firebase.
### 5.3 Room — copy yxrb_room + room-as-table: header (↩ leaves the seat properly, title, room code, chips), mini teal table with 4 seat plates,
gold-radio level setup, 实验室成员 panel, 开始游戏 / AI 补位 / 解散房间 (with confirmation, guests notified), AI seat button 移除, host
hand-off never strands the room.
### 5.4 巅峰对决 — Tencent competitive language (navy, white rows, red-vs-blue VS poster, SVG rank badges, Barlow numbers, slide paging),
same data; works in the guandan modal and the events.html mvp overlay.
### 5.5 Easter eggs — return transition + type hint styled (guandan-transition.css), working over every screen incl. the rotated table; the
hint must not cover the hand or lobby controls.

## 6. Verification
- Harness: K/harness/ (play.py serves https://yil384.github.io/Picasso-Lab/** from GD_ROOT and stubs Firebase in memory via fb-stub-*.js —
  `window.__fbStore`, `__fbSet`, `__fbGet`; never touches production). Copy it into your own folder; adapt selectors.
- Viewports: 1440×900@2, 1280×720@2, 1024×640@2 (iframe-ish), 844×390@3 (landscape phone, is_mobile+has_touch), 390×844@3 (portrait).
- LOOK at every screenshot; build side-by-side comparisons with the matching reference (PIL); list differences; fix what matters.
- Play full rounds vs AI into round 2 (through tribute) with zero console errors.
- Hygiene: screenshots as JPEG q≤85 (PNG only when pixel-exact) in a git-ignored scratch folder, one browser at a time, close
  browsers in finally, never commit screenshots or reference images. Branch rules: see HANDOFF.md.
