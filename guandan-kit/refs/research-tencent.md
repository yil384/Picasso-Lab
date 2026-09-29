# Tencent Guandan design spec (measured from official screenshots, 2026-09-27)

## 0. What "like Tencent, not AI-looking" means
1. One bright flat teal felt, no casino: #049484 centre → #045454 edges, fine twill texture. Thin rim arc near the bottom, floor only in the
   bottom corners. No wood/gold rail, no dark green, no glow.
2. Almost no text on the table: two tiny level tiles (我方 7 / 对方 5), avatars + name plates, played cards beside each seat, "不出" as a word,
   one centred action row. No stat pills, "Last Trick" panels, trick logs, "Selected N cards" meters, advisor sentences.
3. Readable cards: index + one big pip, no pip grids. Hand = vertical same-rank columns (竖排).
4. Chunky glossy pill buttons, one colour code: primary 出牌 orange-yellow; 不出/提示 sky→periwinkle; utility pills periwinkle; chat/invite
   green. White heavy CJK labels with dark stroke, letter-spaced ("出 牌").
5. Lobby/room chrome: navy-periwinkle with near-white panels; ink navy #1c2f66; gold radios; big orange CTA.
6. Warm vs cool encodes rank: 头游/二游 warm gold plates, 三游/末游 cool blue plates; result screens split warm-left vs cool-right.

## 1. Tokens (already in events/static/guandan-ui.css :root)
felt #069a8a/#049484/#048c7c/#047c74/#046c64/#045454, rim #14948c, floor #5a4034/#3e2b22;
navy #1b2750/#243464/#34447c, panel #f7f9fd/#ecf2fc, line #d6e0f0, ink #1c2f66/#44507a/#8290b4, tab-sel #c4dcfc, radio on #fcd45c off #b4c4dc;
primary gradient #fce541→#fec93b→#fcaf2f→#fa9f29 (edge #c9700f, stroke #b85f07); secondary #8aebfe→#72bfff→#739cfb→#7385f9 (edge #4a5bc9,
stroke #3b53b8); util #6484f4; chat #18c474; opponent #e05454/#b43c3c; partner/self #1cb4e4/#1587b8; warm plate #ffcf5a→#f49a1c;
cool plate #8fd0ff→#4c86f0; card face #fff→#f6f6f6→#e7e7e7, edge #b8b8b8, red #c01c1c, black #141414; 级 #4fbf63; wild #e8772a, wild heart #ffc21a.
Level tiles: 我方 header #e47424, 对方 header #8d949c. 不出 word: fill #fff4c8, 5px stroke #5a3310. Report badge 剩N张: #fff3a0→#fcd444,
number #e0201a. Timer (大掼蛋): purple hexagon #b44cff→#6a06c4 with gold rim/crown #ffd66b. VS: red #a43454/#c8304e, blue #2c5ce4, gold VS #fcecac→#b8660c.

## 2. Type
UI: Noto Sans SC 700/900 (no Nunito). Display (effects, 胜利, 巅峰对决): Smiley Sans Oblique (得意黑, jsDelivr @chinese-fonts/dyh) with
ZCOOL QingKe HuangYou fallback; gold gradient #fffbe0→#ffe066→#ff9a1c→#e4480e + dark-brown outline. Card ranks: Noto Serif Display
wdth 62.5 wght 900 (subset 0123456789JQKA), letter-spacing -.04em. Numbers: Barlow Condensed 700.

## 3. Table layout (腾讯掼蛋, % of screen W/H, screen aspect ≈2.06)
- Hand card h = 19.1% H, w/h = 0.74, radius 7.5% of w. One column per rank, high→low left→right, jokers far left; same-rank stack step
  35% of card height (only the index row shows); 1 px column gap; with 15+ columns pitch shrinks to ~93% of w; bottom edge 7.6% H above
  screen bottom; centred.
- Played cards 79% of hand-card height, overlap step 48% of card width, index vertical (rank over suit).
- Partner avatar top-centre (~1.5% H), name plate to its right, played cards centred at ~15% H.
- Opponents: avatar 3.2% W from the side edge at 28% H, name plate under the avatar, played cards inboard ~10.8% W from edge at ~26.6% H;
  "不出" in the same slot.
- Self played cards centred, top ≈32% H. Avatar ≈11.5% H (circles with 2px ring: red opponent, cyan partner/self; pill label 对手/队友
  overlapping the bottom). Name plate rgba(0,0,0,.28) r4, name 11px/700 white.
- Level tiles top-left under the ☰ menu. Top-right round translucent icon buttons (记牌器, 规则). Centre watermark logo + mode text at
  rgba(0,40,36,.28).
- Bottom bar ≈6% H, transparent→rgba(0,0,0,.35): self avatar bottom-left + name; right: pills 理牌/横排 (#6484f4), 聊天 (#18c474), 22–26px tall.
- Rim: thin arc (white .2 + dark .3 line) meeting the bottom at centre, ~80% H at the sides; floor #5a4034 only in bottom corners.

## 4. Cards
White→light-gray face, 1px #b8b8b8 edge, inset top highlight, small drop shadow. Index top-left 0.44×w in the condensed serif; hand cards put
the suit beside the rank; played/row cards stack suit under rank. Big pip bottom-right 0.42×w. Inline SVG suit symbols. 级牌: green corner
triangle top-right with white 级. 逢人配 (red-heart level card): gold heart index + orange vertical tag 逢人配 bottom-left. Jokers: vertical
JOKER letters + figure. Column-mode selection: blue tint rgba(70,110,230,.32) + 2px #5b8cff inset; row mode: lift 18% of card height.

## 5. Action row
Only on your turn, centred just above the tallest hand column. Order [不出] [timer] [提示] [出牌]. Height ≈0.57× hand-card height,
width ≈2× card width, radius = h/2. Shading: white top inset line .6, dark bottom inset .3, 3px solid bottom edge, gloss over top 38%.
Label 17px Noto Sans SC 900, white, -webkit-text-stroke 3px stroke colour, paint-order stroke fill, letter-spacing .35em. Disabled 出牌:
gray #c9ced8→#9aa3b3; no advisor text (optional toast 牌型不符). Use 不出 (not 不要). Timer: mine = hexagon badge in the row; others =
gold alarm clock by the active avatar; red pulse ≤5 s. 报牌 剩N张 at ≤10 cards replaces the 对手/队友 label. 首 tag by the leader.
记牌器: strip with rank headers 大王 小王 2 A K … 3 and remaining counts (red = all left, orange partial, gray 0).

## 6. Tribute / finish / result
No tribute dialog: card flies seat→seat (~350 ms) + small seat plate 进贡 (orange) / 还贡 (blue); 抗贡 = centre word. Finish ribbons:
hexagon-cut plates at the seat's play slot, 头游/二游 warm, 三游/末游 cool, white 16px/900 stroked text. Result: title 胜利 (Smiley Sans,
gold gradient, ~52px, drops in) / 失败 (cool gray-blue); meta line "双上 · 升 3 级 · 本局打 7"; two-column panel warm (#fff4d6→#ffe39c,
red labels) vs cool (#e3efff→#c9dcff, blue labels), faint VS between; circular avatars, names, deltas; level tiles 7 → 10; buttons
secondary blue + primary orange 继续游戏.

## 7. Effects (recommended timings)
Combo labels (顺子/连对/钢板/三带二…): display font, gold gradient, 1.4→1 in 120 ms, hold 500, fade 200. 炸弹: burst + orange/red label,
6px/250 ms shake, ~1 s; 6+ bigger. 同花顺: gold ring sweep + label. 天王炸: vertical text over three explosions, 1.6–2 s. Played-card fly
180–220 ms ease-out, scale 1→0.79. Popups: backdrop 150 ms, panel .9→1 in 220 ms with slight overshoot.

## 8. Lobby / room / competitive (大掼蛋 2026)
Lobby: top bar ≈11% H (avatar, name, rank pill, currency pills rgba(10,18,60,.45), icon chips right); left rail icon+label items; 4-column
tile grid ≈69% W × 61% H, gap 6–8 px, radius 4, first tile tall (2 rows, ≈26% of grid width) = 经典; six small pastel tiles (peach,
lemon→lilac, periwinkle, mint, gray-blue, sky) with heavy ink title (#1a1f33) at the bottom and a 3D-ish object above; red vertical tags;
bottom nav white icon+label; gold 快速开始 bar bottom-right (#fff6c4→#ffd766→#f2b43c, dark-red text).
Room 好友同玩: top bar ≈12% H (↩, title, gray subtitle, dark chips 详情/加入房间/战绩); left tabs ≈15% W (selected = light gradient with
chevron); centre near-white panel ≈48% W with rows ≈8% H (justified navy label + gold radios/checkboxes); big orange pill 创建房间;
right panel 邀请好友 ≈20% W (periwinkle header #6c84ec, white rows, green 邀请 pills).
Competitive screens are NOT black/neon esports: white rows on navy, tall pastel cards, red-vs-blue diagonal VS with big gold VS.
Page switching: left-rail tabs or short horizontal slide (200–260 ms, cubic-bezier(.2,.8,.2,1)), no 3D page flips.
