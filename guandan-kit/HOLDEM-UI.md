# Hold'em inside guandan.html — UI brief (binding together with SPEC.md)

The owner (verbatim): "给guandan.html增加一个德州扑克功能，也作为guandan游戏页面的一部分，局内外UI风格和guandan保持统一，以后要多人真实要玩的，
一定要做好。" Hold'em is a second game of the same app: same tokens (`guandan-ui.css` `:root`), same fonts (Noto Sans SC 500/700/900,
Barlow Condensed for numbers, Noto Serif Display for card ranks, Smiley Sans for display words), same components (3D pill
buttons `--pri/--sec/--ok/--danger/--off`, popups `GuandanUI.openPopup`, avatars with the 2 px ring + overlapping pill label,
toasts, the navy lobby, the teal felt, the blue "P" card back, the card component with labmate portraits on J/Q/K/A), same
motion vocabulary (transform/opacity only, 120/220/350 ms, `--ease-out`/`--ease-back`), same rules (SPEC §3: no emoji, no
glow/halo outside avatars, no glassmorphism, no infinite decorative loops, no letter-spaced English kickers, Chinese-first
copy through `L(en, zh)`, absolute asset URLs). It must read as a professional poker app — think of how the best mobile
Hold'em apps lay out a table — never as a web page or a demo.

## 1. Lobby: game choice
- A game switch **掼蛋 | 德州扑克** (EN: Guandan | Hold'em) in Tencent hall-tab style above the tile grid (selected: white 900
  weight with a short gold bar under it; other: 60% white). Remembered in localStorage `picasso.games.game`. Portrait: the same
  strip above the tiles. A `?game=holdem&room=CODE` link opens Hold'em directly (invite links carry it).
- Hold'em tiles use the same grid geometry, tile component and art language as Guandan's:
  - tall hero tile **德州扑克** (= create a friends table): two big hole cards from the real card component (labmate face
    cards, e.g. A♠ + K♥ with portraits) over a small chip stack; title 德州扑克.
  - **人机练习** (6-max with 5 AI, starts at once), **加入房间** (5-cell code input, same as Guandan), **排行榜** (Hold'em board,
    art: three labmate portraits on a podium), **实验室** (the lab deck, as in Guandan), **好友桌** (create + copy invite),
    **玩法规则** (Hold'em rules + hand ranking chart using the real cards).
  - bottom dock: same nav (邀请 / 历史 / 排行榜 / 设置) and the gold bar "德州 · 人机 快速开始".
  - top bar stats in Hold'em mode: 筹 (bankroll), 胜 (hands won %), 手 (hands played); in EN glyphs as Guandan does.
- Service unreachable: the Hold'em tiles stay but tapping shows a toast "牌桌服务暂不可用，稍后再试" and the hero tile
  shows a small "离线" plate; Guandan is untouched.

## 2. Room (waiting) — mirror Guandan's room screen
Header: ↩ (gives the seat back), title 德州好友桌 + 房间号, chips 邀请 / 规则 / 战绩, 文/EN.
Left panel 牌桌设置 (host editable, guests read-only): 盲注 (radio pills 5/10 · 10/20 · 25/50 · 50/100), 座位 (2–9 with the
gold ‹ › stepper), 买入 (40–100 BB → shows the chip range), 思考时间 (15 / 20 / 30 秒), 时间银行 (30 秒). Centre: the mini
teal oval with N seat plates (photo / AI badge / + 入座), taking a seat opens the buy-in popup (slider + presets 最小 / 100 BB /
最大, bankroll shown). Right: 实验室成员 panel with 邀请 (as Guandan). Buttons: AI 补位, 开始游戏 (host; needs ≥2 seated),
解散房间 (confirm). Guests see 等待房主开始.

## 3. Table — landscape stage (design 1280 × 720, scaled like Guandan's stage, never rotated)
- Background: Guandan's teal felt + floor tones. A large oval table (≈ 74% W × 64% H) with a dark rail and an inner line;
  centre watermark "PICASSO 德州" in Guandan's watermark style; the room's blinds under it small ("盲注 10/20").
- Seats around the oval, hero always bottom-centre; others evenly by angle from the hero (6-max: bottom, lower-left,
  upper-left, top, upper-right, lower-right; 9-max: add the bottom corners and both tops). Seat = avatar (≈ 76 px, photo or
  default face, ring cyan for me / red for others) + name plate pill overlapping the bottom + stack (Barlow) under the name.
  Small blue card backs tucked at the avatar's table side while a player holds cards; folded seats dim to 55%.
- In front of each seat toward the centre: the bet (chip stack + Barlow amount on a dark pill); the dealer button
  (white "D" disc) next to the button seat; action label pill above the avatar for ~1.5 s (过牌 / 跟注 / 下注 / 加注 / 全下 /
  弃牌 / 超时), all-in seats keep a red 全下 plate.
- Centre: 5 board slots (faint outlines) with the real card component at ≈ 72 px wide; pot pill above the board
  ("底池 1,240", Barlow); side pots as separate small pills ("边池 1 · 300").
- Turn timer: the seat to act shows Guandan's gold alarm-clock timer with seconds; when the time bank is running the clock
  turns red and shows "时间银行". Mine shows the same clock above my cards (no new timer component).
- Hero: my two hole cards large (≈ 104 px wide, the Guandan hand card size) fanned slightly above my avatar, my best-hand
  label under them ("两对 · K 和 7"), my stack under my plate.
- Action area (my turn), bottom-right, Guandan 3D pills: 弃牌 (--off grey) · 过牌 / 跟注 80 (--sec blue) · 加注 / 全下
  (--pri gold). 加注 opens a raise panel above the buttons: presets 最小 · ½ 池 · ⅔ 池 · 1 池 · 全下, a vertical (portrait:
  horizontal) slider, the amount in Barlow, ‹ › BB steps, 确定. Keyboard on desktop: F fold, C check/call, R raise, Enter
  confirm, Esc closes the panel (only while the table has focus; typing "picasso" still works).
- Not my turn: pre-action toggles in the same spot (过牌/弃牌 · 跟任何注 · 过牌) as checkbox pills; cleared when the bet changes.
- Showdown: cards flip (scaleX), the winning five cards lift and the rest dim, a gold Smiley Sans word banner with the hand
  name (同花顺 / 四条 / 葫芦 / 同花 / 顺子 / 三条 / 两对 / 一对 / 高牌) and chips fly from the pot to the winner(s) (FLIP,
  transform only). Split pots fly to each winner. A big pot (≥ 50 BB) or quads+ gets Guandan's burst treatment.
- Top-left: ☰ menu (邀请好友, 规则, 牌型, 语言, 音乐, 补充筹码, 暂离 / 回来, 站起, 返回大厅) and the room code under it;
  top-right: 上一手 (last hand: board, winners, shown cards) and 规则 buttons in Guandan's round-button style.
- Seated but waiting: a slim plate "等待大盲 · 立即补盲" above my plate; sitting out: "暂离中 · 回来"; busted: the rebuy popup.
- Empty seat when I am not seated: "+ 入座" disc (Guandan's gold + seat button); tapping it opens the buy-in popup.
- Reconnecting: a small pill top-centre "重新连接中…", action buttons disabled, nothing else covers the table.

## 4. Table — portrait phones (design 720 × 1280, width-fitted, its own layout, not rotated)
A vertical oval (≈ 86% W × 66% H) with the hero at the bottom centre, others around it (9-max: 4 per side + top). Board and
pot in the middle; my hole cards above my avatar; the action pills in one full-width row at the very bottom (弃牌 · 跟注 · 加注),
the raise panel slides up above them with a horizontal slider. Menu top-left, 上一手 top-right.

## 5. Records
- Hold'em leaderboard in the 巅峰对决 board style (`gdr-` navy header, white rows, rank badges 1–3, Barlow numbers, lab
  portraits when a name matches a lab member, "我" row pinned at the bottom when outside the top). Columns: 名次, 玩家,
  净胜筹码, 手数, 胜率, 最大底池.
- The profile (tap my avatar in the lobby top bar) opens an 账号 popup: name, guest / saved status (y***@ucsd.edu),
  bankroll + 领取筹码 (refill, when allowed), Hold'em and Guandan counters, 用邮箱保存 (when the flag is on), 隐私说明.

## 6. Identity prompts
- "继续以 Yufei 的身份？" one-click popup for a fresh browser with suggestions: [继续] [我是新玩家] + 隐私说明 link; never
  automatic; dismissing it keeps the new guest.
- Email save popup: email field, 发送登录链接, then a waiting state with the masked address, 重新发送 and 取消.

## 7. Viewports, input, language
SPEC §6 viewports (1440×900@2, 1280×720@2, 1024×640@2, 844×390@3 touch, 390×844@3 touch). Touch targets ≥ 40 CSS px.
EN and ZH both fit (long names ellipsize). Mouse hover states only under `(hover: hover)`.
