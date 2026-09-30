# Guandan redesign — review log

Each round reviews the current `guandan-cloud` build with four strict lenses (HANDOFF §3) plus a re-check of the earlier
open issues, then fixes every high/medium finding (and cheap lows) and re-verifies. Scores are 0–10 per screen (8+ = a
Tencent player would take it for the real product); a screen's score is its worst viewport.

## How a round is run
- Baseline shots: `cd guandan-kit/harness && python3 scenes.py desk hd ifr phone portrait` → `shots/<vp>-<scene>.jpg`
  (git-ignored) with captions in `shots/<vp>-scenes.json`. Viewports per SPEC §6: desk 1440×900@2, hd 1280×720@2,
  ifr 1024×640@2, phone 844×390@3 (touch), portrait 390×844@3 (touch, rotated table).
- Table states are staged deterministically with the real engine (`stage.js`), so before/after shots compare 1:1:
  opening lead + 首出, my lead / follow with 提示, others' turn, 4/6-bombs, 同花顺, 天王炸, ribbons, menu, 记牌器, rules,
  横排, 进贡/还贡, 双贡, 抗贡, results (win, lose, 冲A失败, 比赛结束, guest), spectator, English, the picasso transition.
- Full rounds into round 2 (through the tribute): `python3 play.py phone 2`, `python3 play.py desk 2`,
  `python3 play.py portrait 2` (real touch on phones).
- Lenses: Tencent fidelity (table / lobby-room-results-records, side by side with `refs/img`), gameplay QA, AI-tell
  hunter, must-keep (SPEC §1), plus a verifier for `open-issues.json`. A synthesizer merges duplicates, calibrates
  severity and assigns each finding to a code-ownership track (table / lobby / records / transition / shared).
- Fixes: one agent per track in its own worktree and branch, each checked by an independent verifier (fixed / partial /
  regressed) until it passes; the branches are then merged into `guandan-cloud` and the whole scene set is re-shot.
- Evidence paths below point into the git-ignored `guandan-kit/harness/shots` and `guandan-kit/scratch` folders
  (screenshots and the Tencent references are never committed).

## Round 1 — the merge of gd3/table + gd3/lobby (build 802ef99)
Reviewers: fidelity-table, fidelity-meta (lobby/room/popups/results/VS/records/English), gameplay QA, AI-tell hunter, must-keep, open-issues verifier; synthesized and re-checked (full detail with proposed fixes: `guandan-kit/scratch/review-r1.md`). 55 findings: 2 high, 18 medium, 35 low.
### Scores (0–10; ≥ 8 = a Tencent player would take it for the real product; worst viewport)

The official score is the fidelity reviewer's score. Where no fidelity reviewer scored a screen, it is estimated. The
other lenses' scores are listed for context.

| Screen | Score | Worst vp | Other lenses | Why it is not ≥ 8 yet |
|---|---|---|---|---|
| lobby | 7 | desk | ai-tell 7 | Entry points duplicated (18 slots, about 9 actions); 16:10 viewports leave about 26% empty height; a "window" rectangle sits behind the rail |
| room | 8 | phone | ai-tell 6.5, QA 8 | Read-only rules drawn as one-option radios ("进贡 ● 进贡"); EN Rules row overflows; roster captions truncated; 解散房间 is a text link |
| popups | 7 | phone | QA 6, ai-tell 8 | Settings radios are 17–22 px touch targets; scrim is lighter than Tencent's; lab deck is a plain sheet |
| table | 7.5 | phone | QA 7, ai-tell 7 | Phone bottom bar is a hard-edged band with the hand raised; toast lands on the partner's play; no confirmation when leaving mid-game; spectator labels |
| table-actions | 7 | phone / hd | QA 6, ai-tell 8 | Hexagon instead of the crowned gem; on 16:9 the row covers side opponents' plays; no pending state on slow Firebase; '180' cramped |
| table-moments | 5 | phone | QA 4, ai-tell 5 | Every 进贡/还贡 card renders broken (high); 天王炸 is three flat discs fading to green; deal is sparse; 首 shows early |
| results | 6 | ifr | QA 7, ai-tell 7 | Table plates, ribbons and my hand show through the band (high); no per-player deltas; match end looks like a round win |
| vs-intro | 6 | desk | ai-tell 7.5 | Hard-split flat poster, unlike yxrb_vs; the 跳过 pill sits over 规则 |
| records | 8 | phone | ai-tell 7.5 | Low only: rows read as a KPI table with the formula printed; dead banner code |
| portrait | 6.5 | portrait | ai-tell 7 | Inherits every phone table issue (bottom bar, toast, tribute, 天王炸, type hint); the portrait lobby dock shows the next tile row |
| english | 6.5 | phone | ai-tell 6 | Rules row overflows in the room; literal copy (Catch-wind, 'Table', R/W/G, 'Played 7', 'Win'); letter-spaced Latin buttons |
| eggs | 7 (estimated) | phone | must-keep 8, ai-tell 7 | All must-keep items work. The type hint covers the timer, played cards and the lobby stat pills, and stays above popups and results. The transition keeps blurred halos |

### Open issues (from `open-issues.json`, re-verified by the open-issues verifier)

| # | Area | Status | Evidence (one line) |
|---|---|---|---|
| 0 | room: empty seat + host AI badge (touch sizes) | fixed | AI chip drawn at 20–35 px with a separate 40 px tap box; every tap sample on 入座 hits #seat-N (room_measure.json) |
| 1 | room: host seat controls (移除 / 离开) | fixed | Round red × badge on AI/guest seats with a 40 px tap box, none on the host's own seat; the top × box stays clear of the header chips |
| 2 | room + lobby: tap floor inflating drawn size | fixed (low remainder) | Drawn size and tap box are now separate (chips 27 px drawn in a 40 px box). Remainder: EN 844×390 roster shows 'Zhengdi…' (overflow under 1 px), folded into R1-43 |
| 3 | room: own name plate | fixed | #nick-input sits on the shared plate: no outline or border; the underline appears only on :focus-within |
| 4 | room: 房间已创建 toast placement | fixed | Toast is centred over the level tiles and overlaps no seat disc at any viewport |
| 5 | EN layout (lobby tiles + room settings) | fixed | No SOLO tag; no collision between the '+' disc and the title; 'Classic' is larger; room keys clear the steppers; EN letter-spacing is normal |
| 6 | SPEC §3.2 avatar rule (room seat avatar shadow) | fixed | Computed box-shadow is none on .room-seat-av and its pseudo-elements; no avatar selector has a shadow |
| 7 | lobby: tile grid proportions | fixed | Grid 20.3–89.7% W; small tiles 1.20:1; 经典 18.1% W; rail 6.5–12.7% W (phone) |
| 8 | Room portrait: AI badge over 入座 | fixed | AI chips do not touch the 入座 labels; 112/112 tap samples hit #seat-N |
| 9 | Lobby: 快速开始 / 人机练习 / 经典 / 好友房 under latency | fixed | .is-loading appears about 75 ms after the tap, with 正在开局… / 正在创建房间…; no 房间已创建 toast on quick start |
| 10 | Room: ↩ back arrow leaves the seat | fixed | 正在离开房间… then leaveRoom is awaited; an AI-only room is deleted; with a human guest the host passes to the guest |
| 11 | Room: host 离开 dead end | fixed | No leave control on the host's own seat; host hands off to the remaining human, never to an AI |
| 12 | Lobby top bar: labmate profile matching | fixed | labPlayerKey matches the exact first or full name only: 'Lin'/'Chen' get initials, 'Yichen' gets the photo |
| 13 | Room: 解散房间 confirmation + guest notice | fixed | Confirm popup, room kept until confirmed; the guest lands on the lobby with 房主已解散房间 and a clean URL |
| 14 | type hint placement (#return-type-hint) | partially-fixed | Clear of controls at most viewports, but it still covers the hd partner's 不出, the phone played-card indices and hex timer, the lobby stat pills and the portrait room panel title. Now R1-20 |
| 15 | hand columns: index legibility on 720-high stages | fixed (low remainder) | Step stays 35% with 0 px of any index covered. Remainder: a tall column shrinks every card (8-card column at k≈.68), folded into R1-26 |
| 16 | Hand columns: stacked-strip readability on phones | fixed | Step never drops below the glyph height at any viewport; a 12+ card 理牌 group is the only compression (R1-26) |
| 17 | Round 2+: 进贡/还贡 vs the first lead | fixed | Last tribute flight ends at 3720 ms, inside the 3780 ms deal window; never intersects the row, played cards or hand |
| 18 | Touch targets on phones (bottom pills 重选/理牌/横排) | fixed | .gd-tool::after reaches the stage bottom; every pill has a ≥ 42 px box (844×390, EN and rotated) |

### Findings

**high**
- **R1-01** [table · table-moments · desk, hd, ifr, phone, portrait] Tribute (进贡/还贡) cards render broken: the plate CSS leaks into the card's own spans. The descendant selectors `.gd-tribute span`, `.gd-tribute span:lang(en)` and `.gd-tribute.is-back span` also match the spans inside the flying card (.gd-ix, .gd-ji, .gd-joker-word, .gd-joker-art, .gd-wild-tag, .gd-portrait). As a result, in every round 2+ at every viewport: - the index sits on an orange or blue stroked plate; - 级 becomes an orange plate; - a Joker becomes two orange blocks; - portraits get an orange frame. _Evidence:_ - guandan-kit/scratch/r1-aitell/z-tribs.jpg - guandan-kit/scratch/r1-gameplay-qa/crop-trib-A.jpg and crop-trib.jpg (real round 2) - guandan-kit/harness/shots/phone-t-tribute.jpg, phone-t-tribute2.jpg, phone-t-tribute-return.jpg, desk-t-tribute2.jpg - Code: guandan-table.css:806-818 vs guandan.html:3621
- **R1-02** [table · results · ifr, hd, desk, phone, portrait] Result screen: seat plates, finish ribbons and my leftover hand show through the band and title. The .gd-res-half ends fade to transparent over their outer 16% and the scrim is only .66-.84. Behind the panel you can see: - the side opponents' plates, cut by the feathered band ends (ifr: 'Zhongkai 胜率55%' sits half inside the band); - 末游/三游 ribbons doubled at the band ends, and 二游 under the meta line; - the partner plate beside 胜利; - my own plate and my leftover hand below the buttons. It affects every result variant and reads as a layering bug. qqg_result has hard-edged panels. _Evidence:_ - guandan-kit/scratch/r1-fidelity-lobby/ifr_rwin_leftedge.jpg, cmp_result.jpg - guandan-kit/scratch/r1-aitell/z-rwin.jpg, z-afail.jpg, z-enres.jpg - guandan-kit/scratch/r1-gameplay-qa/crop-res-leftover.jpg, crop-meta.jpg - guandan-kit/harness/shots/ifr-r-win.jpg

**medium**
- **R1-03** [table · table-actions · hd] On 16:9 screens the action row covers the side opponents' plays of 5+ cards. When my tallest column has 5+ cards, rowTop drops below SIDE_PLAY_TOP+PLAYED_H (299). actionPillWidth clamps at PILL_MIN_W 132, which leaves a 552 design-px row. A left-seat straight then sits under 不出, and a right-seat 钢板 under 出牌: exactly the play I must beat. Desk, ifr and phone have 0 overlap. _Evidence:_ guandan-kit/scratch/r1-gameplay-qa/shots/str-hd-a-straight-sm.jpg (2095 px²), big-hd-a-8bomb-sm.jpg (4090 px²), big-hd-b-10right-sm.jpg (3566 px²); scripts bigplay.py and straight.py.
- **R1-04** [table · table-actions · phone, portrait] Stage toasts (牌型不符 / 管不上 / 请先选牌) land on the partner's play slot on phones. --toast-y = max(150, min(266, rowTop−46)). On phones rowTop ≈ 232, so the toast sits at y ≈ 186, inside the partner slot (112-221). The feathered band is about 36 px tall against the partner's 50 px 不出 word, so the word pokes out above and below it and reads as two stacked labels. Otherwise it hides the partner's play. _Evidence:_ guandan-kit/scratch/r1-aitell/z-toast.jpg; guandan-kit/scratch/r1-fidelity-table/m/toast_crop.jpg (toast y 81-115 vs 不出 y 77.7-102.6 CSS px); guandan-kit/scratch/r1-gameplay-qa/legal-portrait-grid.jpg; guandan.html:3707.
- **R1-05** [table · table-actions · desk, hd, ifr, phone, portrait] Own-turn timer is a generic hexagon, not the 大掼蛋 2026 crowned heart gem. dagd_store_4 shows a purple faceted inverted-heart gem set in a wide 5-spike gold crown with pink studs, and a thin white number. Ours (#gd-sym-hex) is a flat hexagon with a small separate crown and a heavy 6px-stroked number. The research doc's 'hexagon' wording is wrong; follow the image. _Evidence:_ guandan-kit/scratch/r1-synth/hex_sbs.jpg (reference vs ours); guandan-kit/scratch/r1-fidelity-table/ref_actionrow.jpg vs phone_actionrow.jpg.
- **R1-06** [table · table-moments · desk, hd, ifr, phone, portrait] 天王炸 FX: three flat orange discs in a row that fade to mint/olive green. The reference is one tall rising fire and smoke column with the vertical word in it. Ours: - three identical lobed discs at ±175 design px; - the side discs sit on my hand; - the fading orange mixes with the teal into green-grey (sampled (104,175,133)) under dark scalloped outlines. _Evidence:_ guandan-kit/scratch/r1-synth/twz_sbs.jpg (reference, ours early, ours late); guandan-kit/scratch/r1-fidelity-table/phone-t-joker-late-zoom.jpg; guandan-kit/scratch/r1-aitell/z-joker.jpg.
- **R1-07** [table · table · phone, portrait] Phones: the bottom bar is a hard-edged dark band (10.4% H) and the hand floats at 11.1% H. handBottom() raises the hand to 80 design px to fit the 40 CSS px targets. .gd-bottombar grows to 75 px, painted rgba(10,14,22,.42→.58) with an abrupt top edge. Tencent uses a soft ramp and the hand sits at about 7.6% H. Ours reads as a web footer and pushes the row up into the side-play band. _Evidence:_ guandan-kit/scratch/r1-fidelity-table/sbs_classic_phone.jpg, our_bar.jpg vs ref_bar.png, m/measure-phone.json.
- **R1-08** [table · table · desk, hd, ifr, phone, portrait] Leaving a live game from ☰ (新桌 / 返回活动) has no confirmation. A mis-tap on 新桌 or 返回活动 mid-game leaves at once. The seat stays occupied, so each of its turns waits 180 s. If the leaver was the host, the guests are stuck at 等待房主. This is pre-existing on main. Tencent asks 确定退出吗. _Evidence:_ guandan-kit/scratch/r1-gameplay-qa/shots/leave-desk-a-menu-sm.jpg → leave-desk-b-after-newroom-sm.jpg; leave.py; guandan.html:3936 (lobby-only seat release), 1538 nextRound host-only.
- **R1-09** [table · table-actions · phone, portrait, desk] No feedback while 出牌 / 不出 / 提示 wait on a slow Firebase. With __fbDelay=2000, tapping 出牌 changes nothing visible for 2 s. The selection stays and the buttons stay at full opacity, while #root.action-busy silently swallows further taps. The lobby and room have pending states; the table does not. _Evidence:_ guandan-kit/scratch/r1-gameplay-qa/shots/slow-phone-a-play-250-sm.jpg, slow-phone-a-play-1200-sm.jpg (slowplay.py).
- **R1-10** [table · results · desk, hd, ifr, phone, portrait] Result has no per-player deltas, and a match win looks like any round win. research-tencent §6 and qqg_result put a delta under each player. Ours stops at the name, leaving the bottom quarter of each column empty. For gameOver, resultHTML overwrites 比赛结束 with 胜利/失败, so the final 过A looks like a normal round. _Evidence:_ guandan-kit/scratch/r1-fidelity-lobby/cmp_result.jpg; guandan-kit/harness/shots/phone-r-gameover.jpg vs phone-r-win.jpg; guandan.html:3886-3890.
- **R1-11** [table · vs-intro · desk, hd, ifr, phone, portrait] VS intro: the translucent 跳过 pill sits on top of the HUD's 规则 button. .gd-vs-skip (right 28 / top 22, fill rgba(255,255,255,.16)) sits on .gd-hud-right's 规则: a 72 px overlap at desk, plus 6 px over 记牌. '规则' reads through '跳过' on the first frame of every match. _Evidence:_ guandan-kit/scratch/r1-fidelity-lobby/desk_intro_skip.jpg; guandan-kit/scratch/r1-aitell/z-skip.jpg; guandan-kit/scratch/r1-mustkeep/c-skip-phone.jpg.
- **R1-12** [table · vs-intro · desk, hd, ifr, phone, portrait] VS intro poster is two flat hard-split rectangles, not yxrb_vs's blended poster. yxrb_vs has a blended red→violet→blue field, square team-framed portraits with seat chips and brackets, a light gold italic VS and the title inside the poster. Ours has: - clip-path halves with a hard seam; - bare circle avatars; - a heavy 3D orange VS; - the title floating above; - the deal's backs and plates reading through a light scrim. Our records poster (.gdr-poster) already has the blended field. _Evidence:_ guandan-kit/scratch/r1-fidelity-lobby/cmp_vs_intro.jpg; guandan-kit/harness/shots/desk-t-intro.jpg. The synthesizer checked the side-by-side, which overrides AI-tell's 7.5.
- **R1-13** [lobby · lobby · desk, hd, ifr, phone, portrait] Lobby entry points are padded with duplicates (18 slots, about 9 actions). The records modal opens from 6 places, the lab deck from 3 and rules from 3. Every Tencent slot is distinct, so ours reads as 'fill every slot' filler. _Evidence:_ guandan-kit/scratch/r1-synth/phone-lobby-s.jpg; guandan-kit/harness/shots/desk-lobby.jpg; guandan.html lobbyRailHTML (1812), renderLobby nav (1911-1918), #hud-records-btn and #hud-rules-btn.
- **R1-14** [lobby · lobby · desk, ifr] Lobby at 16:10 (desk, 1024x640 iframe): the grid floats in about 26% empty height. --tiles-h is capped at 420lu. At desk the grid spans y 203-676 (52.5% H), leaving empty bands of 12.5% and 13.5% H. yxrb_lobby's grid is 61% H with bands of about 8% and 5%. 1024x640 is the Google Sites iframe size. _Evidence:_ guandan-kit/scratch/r1-synth/desk-lobby-s.jpg; guandan-kit/scratch/r1-fidelity-lobby/cmp_lobby_desk.jpg; guandan-kit/harness/shots/ifr-lobby.jpg.
- **R1-15** [lobby · lobby · desk, hd, ifr, phone, portrait] Lobby background paints hard-edged translucent window-pane rectangles behind the rail. Two background layers draw a mullioned window over x 2-13.7% W and y 12-50% H, exactly the rail column, with a light bar crossing behind 赛季MVP. More pane rectangles sit right of the tiles. Without a painted scene they read as stray empty panels. _Evidence:_ guandan-kit/scratch/r1-fidelity-lobby/desk_rail.jpg, phone_rail.jpg; guandan-kit/scratch/r1-aitell/z-lobby-rail.jpg; guandan-kit/scratch/r1-synth/desk-lobby-s.jpg.
- **R1-16** [lobby · room · desk, hd, ifr, phone, portrait] Room 对局设置: fixed rules drawn as one-option radios and pre-ticked checkboxes. 目标 ●过A, 进贡 ●进贡 (a stutter; EN 'Tribute ● Tribute'), 升级, 出牌时间, 发牌 and 旁观 are checked gold radios with one option, and 逢人配/接风 are ticked checkboxes. None can be changed. They are mock controls next to the real steppers. In yxrb_room every radio row offers 2+ choices. _Evidence:_ guandan-kit/scratch/r1-synth/phone-room-full-s.jpg; guandan-kit/scratch/r1-aitell/desk-room.jpg; guandan-kit/harness/shots/desk-en-room.jpg.
- **R1-17** [lobby · english · phone] English room: the Rules row overflows its separators on the landscape phone. In EN the checks stack (about 58ru), but .room-row shrinks (flex-shrink 1) to 50ru inside the flex-column panel body. 'Wild' ends up on the top rule and 'Catch-wind' on the bottom one. _Evidence:_ guandan-kit/scratch/r1-fidelity-lobby/phone_en_room_rules.jpg; guandan-kit/harness/shots/phone-en-room.jpg.
- **R1-18** [lobby · english · desk, hd, ifr, phone, portrait] English copy on lobby / room / popups is literal and cryptic. - 'Catch-wind' for 接风. - 'Table' for 对局设置. - Stat pills 'R 50 / W 50% / G 8'. - The rules popup says 'Flush run' / 'Jokers' while combo labels say 'Straight Flush' / 'Joker Bomb'. - 'Back to Events' vs 'Back to events'. _Evidence:_ guandan-kit/harness/shots/phone-en-room.jpg, desk-en-room.jpg, phone-en-lobby.jpg; guandan.html 2344, 2348, 1750, 2184, 2185, 269.
- **R1-19** [lobby · popups · phone, portrait] Settings popup radio options are 17-22 CSS px tall touch targets. 中文 / English and 开 / 关 are inline labels about 18 px tall with a 1x1 px input and no extender. The spec requires ≥40 CSS px. _Evidence:_ guandan-kit/scratch/r1-gameplay-qa/tt-settings.jpg. targets.py: phone 52x20, 74x20, 38x18; portrait 56x22, 82x22, 42x18.
- **R1-20** [transition · eggs · phone, portrait, hd, desk, ifr] The picasso type hint covers content: the phone/portrait timer and played cards, the hd partner 不出, the lobby stat pills, the portrait room panel title. placeReturnTypeHint (307) tries only the centred bands y 200/266 and takes the least-covered even when both are covered. The pill does not scale with the stage (about 410x74 design px on phones). It covers: - the hex timer and the partner's 不出 (phone FOLLOW); - the index strips of my played cards (phone OTHERS); - 98x10 of the partner's 不出 (hd); - the 分/胜 values (the lobby branch deliberately centres on .hud-stats); - the 对局设置 title (portrait room). _Evidence:_ guandan-kit/scratch/r1-mustkeep/c-phone-hint2.jpg, c-portrait-thint.jpg; guandan-kit/scratch/r1-openissues/z-hd-hint-follow.jpg, sbs-hint-phone.jpg, sbs-hint-portrait.jpg; guandan-kit/scratch/r1-aitell/z-typehint.jpg; t_hintov.py and hint_measure.json.

**low**
- **R1-21** [table · results · phone, portrait] Result buttons 查看牌桌 / 继续游戏 are 38 CSS px tall on phones. --btn-h 70 design px × s .5417 gives 37.9 px (136x38). _Evidence:_ guandan-kit/scratch/r1-gameplay-qa/shots/tt-phone-tt-result.jpg.
- **R1-22** [lobby · room · phone, portrait] Remaining sub-40 px controls in lobby / room on phones. Effective hit boxes: - roster 邀请: 40x26; - room #nick-input: 54x29 (portrait 66x32); - lobby #nick-input: 72x29; - portrait #join-room: 82x33, partly covered by the code cells. _Evidence:_ guandan-kit/scratch/r1-gameplay-qa/tt-room.jpg, tt-portrait-lobby.jpg.
- **R1-23** [shared · room · portrait] Toasts wrap with an orphaned character ('…你成为房' / '主'). The portrait room hand-off toast breaks with a lone 主 on the second line and covers the top seat and the tiles. _Evidence:_ guandan-kit/scratch/r1-gameplay-qa/room-portrait-grid.jpg (third panel).
- **R1-24** [table · table · desk, phone, portrait] Spectator view uses seat-0-relative labels and hides seat 0's card count. A spectator sees tiles 我方/对方 and pills 队友/对手 although they have no team, and pos 0 never shows 剩N张. _Evidence:_ guandan-kit/scratch/r1-gameplay-qa/shots/misc2-phone-c-spectator-p0-sm.jpg.
- **R1-25** [table · table · desk, phone, portrait] 首 tag is lost after a reload once the round's history reaches the 16 cap. roundLeaderSeat falls back to history[0] only while history.length < 16. _Evidence:_ rejoin2.py: lead tag ['is-p3'] before the reload, [] after it (hist = 16).
- **R1-26** [table · table · phone, hd, portrait] One tall column or 理牌 group shrinks the whole hand; a 14-card group compresses the normal columns' step below the index. One k and one step come from the tallest column, groups included. Eight of a rank on phone gives k .68. A 14-card group on hd gives step 21.3 < the 22.8 index need, so the regular columns' suits are clipped. _Evidence:_ guandan-kit/scratch/r1-gameplay-qa/shots/index-phone-a-tall-sm.jpg; guandan-kit/scratch/r1-gameplay-qa/idx-hd-group.jpg.
- **R1-27** [table · table · desk, hd, ifr, phone, portrait] Bottom tools: 重选 is a permanently greyed pill, and all three tools stay after my hand is gone. Tencent's bar has only 理牌/横排. Ours shows 重选 at .55 opacity most of the time, and after I finish, 重选/理牌/横排 remain and do nothing. _Evidence:_ guandan-kit/harness/shots/phone-t-follow.jpg (bottom right); guandan-kit/scratch/r1-gameplay-qa/shots/misc-phone-b-me-out-sm.jpg.
- **R1-28** [table · table-actions · desk, phone, portrait] 提示 cycle and 建议不出 reset on any Firebase tick during my turn. attachRoom clears hintAdvisor on every snapshot (~901), and the hint cache is keyed on revision. _Evidence:_ misc2.py: 提示 x2, then a revision-only tick, then option 1 came back instead of option 3.
- **R1-29** [table · table-moments · phone, portrait] 抗贡 revealed Red Jokers are about 18x25 CSS px on phones. The only public information the 抗贡 rule creates is barely legible: --card-w-small 34 design px, JOKER letters about 4 px. _Evidence:_ guandan-kit/scratch/r1-gameplay-qa/crop-kg-jokers.jpg; guandan-kit/scratch/r1-fidelity-table/kanggong_zoom.jpg.
- **R1-30** [table · table · desk, phone, portrait] Turn-timeout outcome is barely signalled. My auto-pass shows no toast because the filter drops '超时不要。', and my auto-play toasts in the third person with my own name. _Evidence:_ timers.py (desk).
- **R1-31** [table · table-actions · phone, desk, portrait] Action-pill labels are about 15% smaller and more heavily stroked than Tencent's. Our label ink is about 40% of the pill height with a 3px stroke; Tencent's is about 48-50% with a thin outline. _Evidence:_ guandan-kit/scratch/r1-fidelity-table/phone_actionrow.jpg vs ref_actionrow.jpg.
- **R1-32** [table · table-actions · phone, desk, portrait] Three-digit countdown ('180') crams the timer and the alarm clock. .is-3 drops the number to 28 design px for most of every turn; Tencent always shows two big digits. _Evidence:_ guandan-kit/scratch/r1-fidelity-table/our_hex.jpg; guandan-kit/harness/shots/phone-t-others.jpg.
- **R1-33** [table · table-moments · phone, desk, portrait] 首 tag appears during the round-1 deal, before the 首出 reveal. 首 is on the leader about 1 s before the 首出 card pops, which spoils the reveal. _Evidence:_ guandan-kit/harness/shots/phone-t-dealing.jpg vs phone-t-firstlead.jpg.
- **R1-34** [table · table-moments · phone, desk, portrait] Deal reads sparse (4-6 small backs in the air, empty felt for 2.8 s). A 3-back deck never visibly shrinks, and the hand area stays empty for the whole deal. _Evidence:_ guandan-kit/scratch/r1-fidelity-table/m/grid_deal.jpg.
- **R1-35** [table · table-moments · phone, desk, portrait] Finish ribbons use flat Noto text instead of Tencent's gradient display lettering. The reference uses brush-like gold (头游/二游) and blue (三游/末游) gradient letters; ours is Noto 900 in flat #fff6cf. _Evidence:_ guandan-kit/harness/shots/phone-t-ribbons.jpg vs guandan-kit/scratch/r1-fidelity-table/ref_ribbons_3x.jpg.
- **R1-36** [table · table · phone, portrait] Felt twill reads as regular pinstripes on 3x phones. A 1px white line every 3 px at .04 alpha renders as crisp stripes at dpr 3. _Evidence:_ guandan-kit/scratch/r1-fidelity-table/felt_texture.jpg.
- **R1-37** [table · table · phone, desk, portrait] Watermark subtitle is letter-spaced like a kicker. '经 典 · 打 7' is set at .24em; Tencent's subtitle is set solid. _Evidence:_ guandan-kit/harness/shots/phone-t-opening-other.jpg.
- **R1-38** [table · results · phone, desk, ifr, hd] Result title is heavier and louder than qqg_result's. Ours is 100px with a thick outline and a 3D extrusion (WordArt look). The reference is about 12% H with a thin outline and no extrusion. _Evidence:_ guandan-kit/scratch/r1-fidelity-lobby/phone_rwin_title.jpg vs ref_result_title.jpg.
- **R1-39** [lobby · popups · phone, desk, ifr, hd, portrait] Popups: scrim lighter than Tencent's; the lab deck is a plain sheet. Our scrim leaves about 50% luminance against Tencent's about 30%, so the lobby edges stay busy. The lab deck has small cards and uneven rows. _Evidence:_ guandan-kit/scratch/r1-fidelity-lobby/cmp_popup_scrim.jpg; guandan-kit/harness/shots/phone-lobby-labdeck.jpg.
- **R1-40** [lobby · room · phone, desk, ifr, hd, portrait] Room header has no dark strip, and the ↩ is thin. yxrb_room's header sits on a darker navy strip with a thick light-blue return arrow. _Evidence:_ guandan-kit/scratch/r1-fidelity-lobby/room_header_cmp.jpg.
- **R1-41** [lobby · room · desk, hd, ifr, phone, portrait] 解散房间 is a red hyperlink-style text link, the only web link in the product. Every other action is a pill; this one is bare red right-aligned text. _Evidence:_ guandan-kit/scratch/r1-synth/phone-room-full-s.jpg.
- **R1-42** [lobby · lobby · phone, desk, ifr, hd, portrait] Lobby rail: the 音乐 vinyl reads as a dark hole with two stickers. A near-black disc with invisible grooves, a red 关 chip and a gold note. _Evidence:_ guandan-kit/scratch/r1-fidelity-lobby/phone_rail.jpg.
- **R1-43** [lobby · room · desk, hd, ifr, phone, portrait] Room roster captions are ellipsized after 2-3 characters; EN 'Zhengdi…'. 'A♦ · 记牌…' and 'Q♠ · 灵活接…' read as broken text, and in EN 'Zhengding' still truncates on phone. _Evidence:_ guandan-kit/scratch/r1-synth/phone-room-full-s.jpg; guandan-kit/scratch/r1-openissues/c-en-phone-roster.jpg.
- **R1-44** [lobby · lobby · desk, hd, ifr, phone] The PICASSO P emblem on the lobby share-rail card back is half hidden by the share badge. The green .rail-share badge covers about 40% of the must-keep P disc. _Evidence:_ guandan-kit/scratch/r1-mustkeep/c-share2.jpg, sbs-share.jpg.
- **R1-45** [lobby · portrait · portrait] Portrait lobby: the next tile row peeks between the grid and the fixed 快速开始 dock. Tile tops and a labmate head show as a sliver above the gold bar. _Evidence:_ guandan-kit/scratch/r1-aitell/z-plobby.jpg.
- **R1-46** [lobby · lobby · desk, hd, ifr, phone, portrait] Loading veil: bare white text over busy card art, with no plate or progress mark. '正在创建房间…' is printed directly across the ace cards and portraits. _Evidence:_ guandan-kit/scratch/r1-aitell/z-load.jpg; guandan-kit/harness/shots/phone-lobby-loading.jpg.
- **R1-47** [lobby · english · desk, phone] The English lab deck drops each member's style tag. openLabDeck shows the style only when isZH(), although guandan-records.js has the EN strings. _Evidence:_ guandan-kit/scratch/r1-mustkeep/sbs-labdeck.jpg.
- **R1-48** [transition · eggs · desk, hd, ifr, phone, portrait] The type hint stays on top when a popup, the records modal or a result opens after it appears. The popup check runs only at show time. #return-type-hint (z 70) sits above modals (60) and results (50) for its 2.6 s, which contradicts 'never covers popups or results'. _Evidence:_ guandan-kit/scratch/r1-mustkeep/sbs-hintlate.jpg (t_hintlate.py).
- **R1-49** [table · english · desk, hd, ifr, phone, portrait] English copy on the table and result is literal or inconsistent; Latin button labels are letter-spaced. - 'Played 7' (elsewhere 'Level 7'). - 过A shown as 'Win'. - 'Group' / 'Reset'. - Result buttons keep the .12em CJK tracking ('View table'); only lobby and room reset it (guandan-lobby.css:1229/1234). _Evidence:_ guandan-kit/scratch/r1-aitell/z-enres.jpg; guandan-kit/harness/shots/phone-en-table-follow.jpg.
- **R1-50** [table · global · desk, hd, ifr, phone, portrait] Copy variants for the same situation (我 vs 自己; three wordings for an empty or invalid selection; 不要 instead of 不出). relationForSeat says 自己 while the room says 我. Lines 1308/1311 vs 3013/3016 word the same errors differently, and there are two different 'retry' messages. 1364 says 新一轮不能不要, and 1633 says 建议不出. _Evidence:_ guandan-kit/harness/shots/phone-room-alone.jpg vs phone-t-intro.jpg and phone-r-win.jpg; guandan.html 1159, 1308, 1311, 1357, 1364, 1398, 1633, 2573.
- **R1-51** [shared · table · desk, hd, ifr, phone, portrait] Initials-in-a-circle placeholder avatars for guests and AI seats. Non-lab names get white circles with navy initials, and AI seats get a plain blue disc with 北/西/东. They look like web placeholders; Tencent always shows a head portrait. _Evidence:_ guandan-kit/scratch/r1-aitell/z-reslong.jpg; guandan-kit/scratch/r1-aitell/shots/ai-phone-quick.jpg.
- **R1-52** [shared · global · desk] Dead code: an unused stroke icon set, unused primitives and a .felt / 'three.js stage' block. SPEC §3.7 says no dead code. The synthesizer's scan finds 0 uses of: - iconHTML() (guandan.html:478); - .ui-icon-label, .gd-pill*, .gd-badge*, .gd-plate*, .gd-display, .gd-gold-text, .gd-stroke-text; - .is-pulse, .btn.util; - .felt / html.gd-stage-live, with a 'three.js stage' comment. _Evidence:_ grep across guandan.html, guandan-records.js and events.html (the synthesizer's scan).
- **R1-53** [transition · eggs · desk, hd, ifr, phone, portrait] Return transition keeps blurred gold halos, Georgia faces and .46em tracking. SPEC §3 forbids glows, but the transition keeps: - .rvx-title drop-shadow 0 0 14px; - .rvx-ring box-shadow 0 0 24px; - .rvx-coin box-shadow 0 0 8px; - .rvx-beam filter:blur; - Georgia card faces; - the subtitle at .46em; - EN all-caps 'TABLE CLEARED' / 'VICTORY'. _Evidence:_ guandan-kit/harness/shots/desk-t-return.jpg; guandan-transition.css 50, 56, 65, 76, 116, 161; guandan.html:446.
- **R1-54** [transition · eggs · desk, hd, ifr, phone, portrait] The type hint uses dev-doc <kbd> keycaps in a gold-hairline black pill. The keycap boxes are a documentation idiom foreign to the Tencent look, and the pill does not match the product's toast. _Evidence:_ guandan-kit/scratch/r1-aitell/z-typehint.jpg.
- **R1-55** [records · records · desk, hd, ifr, phone, portrait] Dead 战报 banner: a subtree MutationObserver on #root, buildBanner and 21 banner CSS rules; the board prints its scoring formula. No screen has [data-gdr-banner-slot] (verified by grep), yet the inline bootstrap (guandan.html 4061-4071) observes #root with subtree:true and runs fillBannerSlots on every table update. buildBanner (guandan-records.js:597) and 21 gdr-banner/gdr-bn rules are dead. Separately, 排行榜 prints '评分 = 赛量修正胜率: (胜+2)÷(场次+4)' and three captioned KPI cells per row, which reads as a dashboard. _Evidence:_ grep in the repo; guandan-kit/scratch/r1-synth/phone-records-board-s.jpg; guandan-kit/harness/shots/ifr-records-board.jpg.

### Round 1 fixes
Four track branches (gd4/r1-table-core, gd4/r1-table-moments, gd4/r1-lobby, gd4/r1-eggs), 46 commits, each track passed its independent checker (max 3 fix → check iterations); merged into guandan-cloud (two adjacent-line conflicts in renderSeat and the action-pill CSS, resolved by keeping both sides). Verdicts are the checker's, not the fixer's.

| id | track | verdict | checker note |
|---|---|---|---|
| R1-01 | table-moments | fixed | The label now renders as span.gd-tribute-tag and the CSS styles only .gd-tribute-tag, its :lang(en) and .is-back variants. No bare span rule is left under .gd-tribute, and grepping guandan-table.css turned up no other container de |
| R1-02 | table-moments | fixed | When a result is showing and 查看牌桌 has not been pressed, .gd-stage.has-result fades out seats, slots, hand, tools, actions, spectate and the 记牌器 strip. On a live round end the fade waits RESULT_IN_MS; on a reload or when coming bac |
| R1-03 | table-core | fixed | Commit 1432f1a fixes the burst/flight regression from the last check. My own frame-sampled script (scratch/check/flight3.py) at hd, with the 8-bomb fitted to k=.712: on the first frame the card centre sits on the avatar centre (p1 |
| R1-04 | table-core | fixed | toastchk.py at phone and hd: partnerOverlap 0 and rowOverlap 0. On phone the toast deliberately sits over the top of the hand (stageToastY fallback). It is transient and accepted. |
| R1-05 | table-core | fixed | The crowned purple heart gem in the desk t-follow crop matches the dagd_store_4 action row. Digits are verified in gemdigits2.jpg. The static shots are pixel-identical to the last check. |
| R1-06 | table-moments | fixed | 天王炸 is now one column: a ground blast, two stem puffs and a mushroom head behind the vertical word, built from lobed puffs with brown smoke. Paused frames (q.py phone joker, 300-1860ms) show fire and core shrinking into brown smok |
| R1-07 | table-core | wontfix-accepted | The hard-edged band is now a soft ramp with no top edge (phone t-follow and t-mylead against the baseline). The hand bottom is 40/.5417+1 = 74.8 design px, 10.4% H. The ≤9% target would need a tool tap box under 40 CSS px or one r |
| R1-08 | table-core | fixed | leave2.py at portrait: the 离开牌局 popup shows the host text and the menu closes. Esc stays on the table. 离开 starts the return transition. Typing picasso leaves at once. A confirmed 新桌 lands in the lobby. errors []. The gameOver 返回大厅 |
| R1-09 | table-core | fixed | slowplay.py on phone with __fbDelay 2000: play-btn gets is-pending at opacity 1 at +250 ms and +1200 ms, the selection is kept, and the commit completes (hand 27 -> 25). |
| R1-10 | table-moments | fixed | A .gd-res-note line now sits under every player. The first team gets +N 级, 冲A n/3 on a failed A try, or 过A at the match end. Everyone else gets 剩N张 when they still hold cards, otherwise nothing. The values come from game.roundResu |
| R1-11 | table-moments | fixed | 跳过 is now inside the poster's top-right corner (phone 647,71, inside the poster at 140-703 x 62-327) with an opaque navy fill and a border, so it no longer covers 规则. has-intro hides .gd-hud-right and .gd-tools. My timing probe (i |
| R1-12 | table-moments | fixed | The poster now follows yxrb_vs: one blended red-violet-blue field (the records-poster gradient plus its stripe texture) with the title and subtitle inside, framed team pairs with square photos in 4px team borders, 南/西/北/东 seat chi |
| R1-13 | lobby | fixed | Measured at all 5 viewports: 16 visible lobby entries. The top bar has only EN and 返回; the rail has 赛季MVP, 分享 and 音乐; the 7 tiles are unchanged; the nav has 邀请, 历史对阵, 排行榜 and 设置; then 快速开始. Each records page and feature appears on |
| R1-14 | lobby | fixed | Band measurements. Desk 1440x900: grid 146-731, 65% H; 56px (6.2%) above and 67px (7.4%) below. Ifr 1024x640: 6.2% / 7.5%, grid 65%. Both are within the target of 8% or less. Hd is unchanged (the formula adds max(0, vh-720lu)) and |
| R1-15 | lobby | fixed | The three hard-edged pane layers are deleted from the background stack; the radial lights, lilac wash and horizon band are kept. The rail crops at phone and desk, and the room header crop, show no window rectangles; the baseline s |
| R1-16 | lobby | fixed | The rows now show plain ink values: 过A (3把不过回2), 进贡 开启 (双大王抗贡), 双上升3级, 3分钟. 逢人配 and 接风 are pale tags, and the 发牌 and 旁观 rows are gone. No radio dots or checkboxes remain, and the room-chk/room-checks/is-extra CSS is removed with n |
| R1-17 | lobby | fixed | EN settings rows at phone, portrait, desk, ifr and hd: 0 rows with children outside their separators. Wild and Jiefeng sit on one line (phone rows are 33px). .room-row has flex-shrink: 0. |
| R1-18 | lobby | fixed | Checked strings: Jiefeng (with the gloss 'their partner leads instead (Jiefeng)' in the rules), Match settings, stat discs showing star/trophy/cards glyphs with the word in title, Straight Flush / Joker Bomb / Pair Run / Triple Ru |
| R1-19 | lobby | fixed | Measured tap boxes. Phone: 中文 52x40, English 74x40, 开 40x40, 关 40x40. Portrait: 56x40, 82x40, 42x40, 42x40. Gaps between options are 23-24px. Desktop sizes are unchanged because --tap is 0 there. |
| R1-20 | eggs | fixed | (medium) I checked this with my own code, not the page's hintObstacles: /home/user/wt/r1-eggs/guandan-kit/scratch/check/hintx.py measures the pill against every visible text line, control, img/svg, card and seat part. Covered: all |
| R1-21 | table-moments | fixed | Every result and peek button carries <i class="gd-hit">, and the rule is generalised to `.gd-result .btn > .gd-hit`. On phone the buttons measure 135x38 with 42px hit areas, and the peek button 114x31 with a 42px hit area. element |
| R1-22 | lobby | partial | These are now 40px: room #nick-input (phone 54x40, portrait 66x40), roster 邀请 (40x40 / 50x40), portrait 加入 (82x40), landscape 加入 (40x40) and portrait lobby name (84x40). The remainder is the landscape phone (844x390) lobby name fi |
| R1-23 | lobby | fixed | The toast is width: max-content with max-width min(92vw, 520px) and text-wrap: balance. '房主已离开，你成为房主' is one line at every viewport, including portrait (205px). Long EN and CJK messages wrap evenly into 2 lines. This also changes  |
| R1-24 | table-core | fixed | hintcycle.py desk spectator: the tiles are 蓝队/红队, the tags on all four seats including p0 are team names, and seat 0 shows the turn clock. The phone spectator shot matches. |
| R1-25 | table-core | fixed | rejoin2.py phone: the 首 tag is on is-p0 before and after a reload with the history at the 16-entry cap. Storage goes through the try/catch storageGet/Set. |
| R1-26 | table-core | wontfix-accepted | The 理牌 group now compresses only its own column (per-column steps). The remaining behaviour, where one 8-card rank column shrinks the whole hand, is SPEC §5.1's shrink-before-compress rule. Low severity; deferral accepted. |
| R1-27 | table-core | fixed | The tools are 理牌 · 横排, with 重选 only while cards are selected (phone t-mylead-hint against t-mylead). They are hidden once the hand is gone. EN: Clear / Sort / Row. |
| R1-28 | table-core | fixed | hintcycle.py desk: three 提示 presses give the same cycle with and without a revision-only tick (SAME). No engine or Firebase changes. |
| R1-29 | table-moments | fixed | The revealed Red Jokers are now 50 design px wide, 27x37 CSS px on phone (they were 18x25), and legible at every viewport. On side seats they sit above the inboard column: phone y 59-96 CSS, with plays starting at 103 and the cloc |
| R1-30 | table-core | fixed | timers2.py desk: my pass gives 超时，自动不出, my lead gives 超时，自动出 2♣, and another seat gives 'Zaifeng 超时，自动不出'. The g.message writes are unchanged in the diff. |
| R1-31 | table-core | fixed | --btn-fs is 40px with a 2.5px stroke. The label weight in the desk row crop matches the reference. |
| R1-32 | table-core | fixed | timers2.py: 80 s shows '80' with no pulse, and 3 s shows '3' with gd-timer-pulse. Clock hands show above 99 s (t-follow). |
| R1-33 | table-moments | fixed | 首 is now shown only when dealPhase === 'done'. The deal probe finds no .gd-first at 700-3700ms and 首 present from 3850ms, after the 首出 card has landed at the leading seat (shots 3150-3700). It is no longer visible during the deal. |
| R1-34 | table-moments | fixed | The deck is six offset backs that leave one by one (probe opacities 1,1,1,1,1,0 at 700ms, then 1,1,.75,0,0,0 at 1600ms, then all 0 by 2750ms). My 14 flights land face down in a growing fan at hand size, and the fan is removed when |
| R1-35 | table-moments | fixed | The ribbons now use wordHTML in the display face: cream-to-gold gradient lettering with a thin brown outline on the warm ribbons, pale blue on the cool ones, and no drop edge. The entrance animation now targets .gd-word, and reduc |
| R1-36 | table-core | fixed | The twill is a 2px period at .026 (CSS diff). The static shots are unchanged from the last check. |
| R1-37 | table-core | fixed | The watermark span is .04em, and the :lang(en) override is removed rather than stacked. |
| R1-38 | table-moments | fixed | .gd-res-title is now 84px (72px in EN) with a 6px paint-order stroke, which shows as roughly a 3px outline, and text-shadow none, so there is no extrusion. The keyframes line that had been glued onto the previous rule is back on i |
| R1-39 | lobby | fixed | Scrim computes to rgba(6,10,30,.72). Lab deck: pale #eef3fd cells, 108pu cards and equal row heights (phone 169, desk 269). The remnant is that the style line breaks after the middle dot ('记牌反击 ·' / '后发制人'). It shows on desk too ( |
| R1-40 | lobby | fixed | Header crop at desk: a dark navy strip behind ↩ 好友同玩, and the ↩ is a chunky #e2eeff fill with a navy stroke. Also verified in the phone and portrait room shots. |
| R1-41 | lobby | fixed | 解散房间 is a red btn danger pill centred at the panel foot. Its tap box is 92x40 on phone and 112x40 on portrait. room-dissolve still opens the confirm popup. A guest's panel has no admin row (.room-admin:empty). |
| R1-42 | lobby | fixed | On state (lobby-musicon crop at phone and desk): a #252b4d record with a white rim, grooves and a larger red label, plus the gold note. Off state: the record dimmed to .6 with a grey 关 plate on its centre; the red corner chip is g |
| R1-43 | lobby | fixed | Roster captions show the card and the first style segment ('A♦ · 记牌反击'), with no ellipsis at any viewport. EN 'Zhengding' fits: 0 overflowing names in EN at all 5 viewports. |
| R1-44 | lobby | fixed | The share badge overlaps the P emblem by 0% at all 5 viewports (for example phone emblem 68,180 16x16 and badge 86,188 19x19). The emblem is fully visible in the rail crop. |
| R1-45 | lobby | fixed | Portrait 390x844 lobby, zh and EN: no fourth tile row peeks above the dock, and there is no stray arc. The dock is an opaque #223066 sheet with an 8lu fade above it. Row 3 ends cleanly in the dock-head crop, and portrait-lobby mat |
| R1-46 | lobby | fixed | Tested 60 cases: 5 viewports x zh/EN x 6 sources (经典, 人机练习, 好友房, nav 邀请, 加入 with a code, 快速开始). Every plate is at least 11.2px from the tile sides (minimum: phone EN 好友房) and single-line; plate height equals one line plus padding. |
| R1-47 | eggs | fixed | The EN lab deck now shows Card counter / Gap finder / Steady control / Bomb assault / Ace charger / Thunder strike on phone, portrait and desk. zh is unchanged. Members with no tag have no line. The deck uses styleText through opt |
| R1-48 | eggs | fixed | On all 5 viewports I showed the pill first and then opened something. The pill's opacity went 1 → 0 each time, for the lobby rules popup, the 巅峰对决 records modal, the table ☰ menu and a round result landing. Typing over a result do |
| R1-49 | table-core | fixed | Table tools read Clear/Sort/Row. The EN menu is in sentence case (Invite friends, Card tracker, Music: off, New table, Back to events; phone en-table-menu crop). EN Spectating has .02em tracking. The result copy belongs to table-m |
| R1-49 | table-moments | fixed | Checked the result copy only, as scoped: 'Played N' became 'Level N' and 'Win' became 'Passed A'. `.gd-result .btn:lang(en)` resets --btn-ls to .02em, so 'View table' / 'Continue' / 'Lobby' are no longer tracked. The 4-character z |
| R1-50 | table-core | fixed | Grep of the current file: 我/Me, selectionVerdict reused, one 牌局已变化，请重试 wording, and 首出不能不出. The 建议不出 toast and the old retry strings are gone. The only 自己 left is in introHTML's VS tag (table-moments). |
| R1-51 | eggs | partial | (low) seatFaceHTML now draws flat default faces inside the circle, used on table seats, the VS intro and the result. Guests get a silhouette on periwinkle; AI seats get a navy robot with 东/西/北 in gold on its screen. Nothing is dra |
| R1-52 | eggs | fixed | iconHTML, .ui-icon*, .gd-pill*, .gd-badge*, .gd-plate*, .gd-display, .gd-gold-text, .gd-stroke-text, .is-pulse/gd-pulse, .btn.util/--util-stroke and the .felt/gd-stage-live block are gone; a grep finds 0 leftover references. I ran |
| R1-53 | eggs | fixed | I captured frames of the base tree and of the new tree on desk, rotated portrait and desk EN (check/sbs-ret-desk.jpg, s-ret-portrait.jpg, s-ret-en.jpg, c-ret-title.jpg, c-ret-cards.jpg). The title halo is gone and a dark 2px outli |
| R1-54 | eggs | fixed | The pill is now a navy product-toast: rgba(12,20,64,.85), full radius, no gold border and no shadow. 'picasso' is gold Barlow text with no kbd keycaps. The fade, the rise and the 90° turn now run on --hint-r/--hint-s, and the page |
| R1-55 | eggs | fixed | The banner observer, fillBannerSlots, buildBanner and all gdr-banner/gdr-bn CSS are gone; a grep finds 0 references in events/. In node, stats(), PLAYERS, MATCHES and PAGE_KEYS are identical between base and new (check/stats.js).  |

Accepted as not fixed this round: R1-07 (on a 390 px-high phone the 40 CSS px tap rule for 理牌/横排 keeps the hand bottom at 10.4% H instead of Tencent's 7.6%; the band itself is now a soft ramp), R1-26 (one 8-card rank column still shrinks the whole hand, as SPEC §5.1 prescribes; the index stays legible). Partial: R1-22 (landscape-phone lobby name field shows ~35 of its 40 px box), R1-51 (default faces on the table/VS/result; the room and lobby profile still use initials).

## Round 2 (partial: fidelity-table, fidelity-meta, gameplay QA) — the merged build (9602148)
First independent review of the merged round-1 fixes. Of the six reviewers, three finished: **fidelity-table**,
**fidelity-meta** (lobby / room / popups / results / VS / records / English) and **gameplay QA**. **Missing**:
AI-tell hunter and must-keep (both started, then stopped mid-run), the round-1 re-check (never started) and the
synthesizer (never ran). So the findings below are **not deduplicated or calibrated**: each severity is the reporting
reviewer's own, and each finding names its lens. The reviewers' scripts, measurements and crops are in the git-ignored
`guandan-kit/scratch/r2-fidelity-table/`, `r2-fidelity-meta/` and `r2-gameplay/`.

Baseline for the round (run before the reviewers started):
- **Scenes:** `scenes.py` on all five viewports, 59 scenes each, zero console errors.
- **Full rounds:** `play.py desk|portrait|phone 2` gave two rounds each through the tribute (a 双贡 on portrait), with zero console errors.
- **Pre-fix comparison shots** of de0134d at phone, desk and portrait are in `scratch/shots-r0`.

### Scores (0–10; ≥ 8 = a Tencent player would take it for the real product; worst viewport)
The official score is the fidelity reviewer's, as in round 1; QA's score is listed for context.

| Screen | Score | Worst vp | Other lenses | Round 1 | What still costs points |
|---|---|---|---|---|---|
| lobby | 7 | desk / ifr | — | 7 | At 16:10 the tiles stretch into portrait posters (R2-01) and the rail spreads out. There is also a stray horizon stripe, and the 快速开始 plate is heavy. Phone and hd match yxrb_lobby |
| room | 8 | desk | QA 8.5 | 8 | AI letter discs and initials, unlike the table's faces. Desk panel bottoms are 139 px apart. Steppers and 解散 have no slow-network feedback |
| popups | 7.5 | phone / portrait | — | 7 | Single-character CJK orphans; the lab deck's dangling '·'; stroked, letter-spaced titles instead of the display title |
| table | 8 | desk | — | 7.5 | No 四炸/六炸 column tags. The felt vignette is weak. 级 is clipped with 14+ columns at 1280 wide. Heavy 不出 stroke; small tool pills |
| table-actions | 8 | phone | QA 7.5 | 7 | Stale 不出 words after a trick is collected. The partner's ribbon sits under the row. Clocks show hands, not digits, for the first 81 s. Toasts cover my top indices |
| table-moments | 6.5 | phone | QA 8 | 5 | The bomb burst is a pale mint bubble. Every display word is heavy WordArt, and the bomb label hides the play. 天王炸 is clip-art puffs. 首出 is under-scaled |
| results | 8 | ifr / desk | QA 7.5 | 6 | 继续游戏 has no pending state (a double tap gives a false toast). There is a blank note line under some players, and 胜利 is too red and heavy |
| vs-intro | 8 | desk | — | 6 | The 巅峰对决 title is fiery and heavy rather than pale gold |
| records | 8.5 | phone | — | 8 | The records VS is extruded, unlike the intro VS. The '?' hit box is 37 px tall |
| portrait | 7.5 | portrait | QA 8 | 6.5 | Equivalent to phone, so it inherits the table-moments and row/ribbon issues. No portrait-only defect |
| english | 7.5 | phone | — | 6.5 | No overflow anywhere. Remaining strings: 'A failed', '1-2 finish +3' vs 'Double win', 'level 2', bare 'Jiefeng' |
| eggs | not scored | — | — | 7 (est.) | The must-keep and AI-tell lenses did not finish |

Below 8: lobby, popups, table-moments, portrait, english (eggs unscored).

### Round-1 fixes confirmed in passing
There was no systematic round-1 re-check this round. These are what the three lenses reported as holding on the merged build:
- **Table (fidelity-table):** R1-01, R1-04, R1-05, R1-27, R1-33, R1-35, R1-36, R1-37 and R1-49 (table English fits).
- **Results, VS, room, records, English (fidelity-meta):**
  - R1-02 and R1-10: hard-edged result halves, deltas, a distinct 比赛胜利.
  - R1-11 and R1-12: the blended VS poster, with 跳过 inside it.
  - R1-16, R1-40 and R1-41: room chrome.
  - R1-17: English fits at every viewport.
  - R1-55: records rows.
- **Gameplay (QA):**
  - R1-09: pending states on 出牌/不出/room/lobby.
  - R1-17: the tribute ends at 3760 ms, before the row appears at ≥3800 ms.
  - R1-19 and R1-21: touch targets are ≥ 40 px, apart from R2-31 and R2-32.
  - R1-25: 首 survives a reload at the 16-entry cap.
  - R1-28: 提示 cycles and wraps.
  - R1-29: 抗贡 jokers are legible.
  - R1-30 and R1-32: timeouts are toasted; digits and the red pulse from 10 s.

Reported as not holding:
- **R1-14** is now a regression: see R2-01.
- **R1-39** has a remnant: see R2-15.
- **R1-51** has a remainder: see R2-12.
- **R1-22** has a residual: see R2-31.

The other round-1 fixes are **unverified** on the merged build.

Performance (QA): in play, no long task was over 120 ms (the largest was 83 ms). The only ones over 120 ms (113–184 ms) come at lobby
load. A trace shows Layout/UpdateLayoutTree as the web fonts swap in.

### Findings (7 medium, 25 low, no high)

**medium**
- **R2-01** [lobby · lobby · desk, ifr] (fidelity-meta) On 16:10 screens the lobby tiles stretch into portrait posters, and the art floats in empty space. This is a regression introduced by the R1-14 fix: all the 16:10 slack goes into `--tiles-h` while the grid width stays at 900lu.
  - Desk small tiles are 242×289 (0.84:1) and 经典 is 264×585 (0.45:1); ifr is the same. yxrb_lobby is about 1.22:1 and 0.67:1, phone matches (1.21 / 0.65), and the pre-fix build was about 1.05:1.
  - The tile art does not scale with tile height: the 经典 fan fills 29% of its tile.
  - The rail spreads to a 28% H pitch.
  - 1024×640 is the Google Sites embed size.
  - _Fix:_ guandan-lobby.css `.lobby`:
    - Cap `--tiles-h` so small tiles stay ≥ 1.1:1 (about 397lu) and 经典 ≥ 0.6:1.
    - Give the remaining slack to the chrome: about 40% to `--hud-h` and 60% to the dock row, which keeps the bands at about 8% H.
    - Scale the tile art with `--tiles-h` (the fan's `--card-w`, and the tiles' `--t`).
    - Pack the rail from the top (R2-13).
- **R2-02** [table · table-moments · all] (fidelity-table) The 炸弹/六炸 burst reads as a pale soap bubble, not a hot explosion.
  - tg_ingame_bomb has a white-hot core, orange flame tongues, a flat shock disc and red cracks; dagd_store_10 is a red-orange fireball with smoke.
  - Ours: a near-white `.gd-fx-dome` at .1–.38 alpha over the teal, thin pale `.gd-fx-rays`, and a `.gd-fx-core` that starts at scale .15, so it is a faint smudge at 60/150/250 ms.
  - The full-screen `.gd-fx-flash` turns the whole felt milky mint for 300 ms.
  - _Fix:_ guandan-table.css bomb block:
    - A hotter core that starts at scale .45 at full opacity.
    - Flame tongues on the existing `#gd-g-fire` gradient instead of the pale star.
    - A warm rim on the dome.
    - A wider flat ring (about 700×170).
    - Drop the flash, or confine it to a radial glow around the anchor.
- **R2-03** [table · table-moments · all] (fidelity-table) Every display word (炸弹, 六炸, 同花顺, 天王炸, 抗贡, 顺子/连对/钢板/三带二) is heavy WordArt.
  - Style: `.gd-word` has a .15em #6a1a00 stroke (about 7.8 px on the bomb label) and a `0 .07em 0` extruded edge over a yellow-to-red gradient. Tencent's labels are cream to pale gold with a thin outline.
  - Size: the bomb label is 104 design px (×1.3 for 6+), 0.95–1.25× the played-card height against Tencent's 0.55–0.7×.
  - Placement: it is centred on the cards, hiding the bomb for about 1 s, and the combo label (top 72%) covers a straight's middle indices.
  - _Fix:_
    - `.gd-word`: stroke .07em #7a3a10, no extrusion, cream-to-gold gradient.
    - `.gd-fx > .gd-word`: 72px×k, anchored under the cards.
    - `.gd-combo-label`: below the played cards.
    - Ribbons stay as they are.
- **R2-04** [table · table · all] (fidelity-table) The hand has no 四炸/五炸/六炸 bomb-count tags. In 大掼蛋 2026 (dagd_store_4, dagd_store_10) and qqg_shouchu, every bomb column's front card carries a small vertical tag in the 逢人配 slot. Ours shows bomb columns (five 7s, six 9s) untagged.
  - _Fix:_
    - renderHand: for a same-rank column of 4 or more cards (not a mixed 理牌 group), add `<span class="gd-bomb-tag">` with `L('4×', '四炸')` etc. to the front card, rebuilt on each render.
    - guandan-ui.css: `.gd-bomb-tag` with the `.gd-wild-tag` geometry, white fill, a blue #3f6fe0 border and blue text.
    - On J/Q/K/A cards, place it clear of the portrait.
- **R2-05** [table · table-actions · all] (gameplay QA) After a trick is collected, its 不出 words stay on the felt while the winner leads.
  - When I lead, three 不出 words sit around the table and the row has no 不出, so it looks like a follow. In the 接风 case the partner's stale last cards stay too.
  - It is reproduced through the real handleTurnTimeout path.
  - Cause: doPass and handleTurnTimeout set `lastPlay = null` but keep `trickPlays` until the next playCards, and renderSlot draws `trickPlays[i]` for every seat except the live turn.
  - _Fix (UI only, the Firebase writes are unchanged):_ in renderSlot, when `!game.lastPlay` and the history is non-empty, draw no entry (only a finish ribbon), and add that flag to the slot key.
- **R2-06** [table · table-actions · phone, portrait, desk, hd, ifr] (gameplay QA) The partner's 头游/二游 ribbon is cut by my action row.
  - The ribbon hangs at design y 200.5–250.5, but the row may rise to `ROW_MIN_TOP` 226.9, which only reserves the partner's cards.
  - 提示 covers the ribbon's lower part. Overlap: 81×10 CSS px (37%) on phone with a 5-card column, and 155×20 on desk with a 7-card column.
  - This is a common late-round state: following the partner's last play, or leading after 接风.
  - _Fix:_ lay the partner-slot ribbon over the lower half of its cards (`.gd-slot.is-p2 .gd-ribbon:not(:only-child)`), or include it in the row floor.
- **R2-07** [table · results · all] (gameplay QA) 继续游戏 has no pending state.
  - With `__fbDelay` 2000 it looks untouched for the whole write: the className stays `btn play` at 150, 600 and 1200 ms.
  - A second tap then toasts a false "下一局还没准备好。" over the result band while the round is starting. This is the result-screen counterpart of R1-09.
  - _Fix:_
    - nextRound: return quietly while actionBusy.
    - Toggle `is-pending` on `#next-round` around the write.
    - Add a pending style, and add `.gd-res-actions` to the `#root.action-busy` pointer-events rule.
    - Toast only when the transaction ran and was refused.

**low**
- **R2-08** [table · table · desk, hd, ifr] (fidelity-table) With 14 or more columns on a 1280-wide stage, the 级 corner glyph is clipped by the next column.
  - Cards are w 92.9 at pitch 86.4, so each column overlaps the previous one by 6.5 px. The `.gd-ji` right edge is at 211.3 against the next column at 204.8. Phone is unaffected.
  - _Fix:_ pass the overlap as `--ov` from renderHand and pad and shift `.gd-ji` by it.
- **R2-09** [table · table · all] (fidelity-table) The felt vignette is much weaker than Tencent's.
  - Side mid-height samples (4,108,104) in the reference against (7,145,130) in ours; upper side (5,119,111) against (8,139,125). The centre matches.
  - The `.gd-rot` radial ellipse is larger than the stage, so `--felt-4`/`--felt-5` never show.
  - _Fix:_ shrink the ellipse (about 64% 92% at 50% 58%) and tune it to the reference samples.
- **R2-10** [table · table-moments · all] (fidelity-table) 天王炸 is still flat clip-art.
  - The puffs have 6–7 px dark strokes and flat radial fills.
  - In the late frame the base puff blends with the teal into an olive blob, sampled (40,122,100).
  - _Fix:_
    - Smoke stroke 2 px at .45 alpha; no stroke on the fire.
    - A lighter warm-grey top stop in `#gd-g-smoke`.
    - End the base puff's blast opacity earlier, or give it an opaque smoke fill.
- **R2-11** [table · table · all] (fidelity-table) The 不出 word's stroke is too heavy and dark: 46 px with a 9 px #5a3310 stroke plus a drop shadow, so the counters of 出 close up. In the 记牌器 log it is a brown blob.
  - _Fix:_
    - `--pass-stroke` #7a4a1c, a 6 px stroke and a lighter shadow.
    - In the log, plain grey text.
- **R2-12** [lobby · room · all] (fidelity-meta) R1-51 remainder: the room and the lobby profile still draw initials and letter discs, while the table, VS intro and result draw faces.
  - AI seats in the room are lavender discs with 北/西/东 plus an 'AI' pill; non-lab humans get 'CH' / '欧阳' initials; the lobby profile shows a 'MO' square.
  - _Fix:_ use `defaultFaceHTML` in seatHTML and lobbyProfileHTML.
- **R2-13** [lobby · lobby · phone, hd, desk, ifr] (fidelity-meta) The rail's three items spread over the full grid height: `justify-content: space-between` gives a 24.6% H pitch on phone and 28% on desk, against Tencent's packed 13.4%.
  - _Fix:_ `justify-content: flex-start` with a fixed gap.
- **R2-14** [lobby · lobby · phone, hd, desk, ifr] (fidelity-meta) A background band at 50–63% H (peak rgba(190,212,255,.22) at 58.2%) reads as a stray light stripe across the rail, the tile gap and the room's mini table.
  - _Fix:_ delete it, or soften it to one broad low-alpha gradient (guandan-lobby.css:35).
- **R2-15** [lobby · popups · all] (fidelity-meta) R1-39 remnant: the lab deck's style line still breaks after the middle dot ('记牌反击 · / 后发制人').
  - _Fix:_ split the style on ' · ' into nowrap spans, stacked without the dot.
- **R2-16** [lobby · popups · all] (fidelity-meta) Popup and confirm text leaves single CJK characters on their own line:
  - '…头游先 / 出。'
  - '「接 / 风」。'
  - '每人 27 / 张。'
  - '红 / 桃 7'
  - '回 / 到大厅'

  _Fix:_ add `text-wrap: pretty` to the rules rows, notes and popup body, and `word-break: keep-all` to the confirm line. Rephrase any string that still orphans.
- **R2-17** [lobby · popups · all] (fidelity-meta) Popup titles are letter-spaced (.12em), 5 px-stroked Noto on a flat periwinkle bar. That sits between yxrb_popup's display-gold title and yxrb_room's plain white header.
  - _Fix:_ pick one: the display word with a thin outline, or plain white with light tracking and no stroke.
- **R2-18** [lobby · lobby · all] (fidelity-meta) The 快速开始 plate is saturated orange with a 3lu dark frame and two inset rings. yxrb_lobby's is a pale flat metallic gold (#fff6c4→#f0d27a) with a thin light edge.
  - _Fix:_ a thin light border, a paler gradient and no inset rings.
- **R2-19** [lobby · room · desk, ifr, hd] (fidelity-meta) At 1440×900 the settings panel ends at 82% H and the roster panel at 97.8% H, 139 px apart. yxrb_room's panels share their bottom edge.
  - _Fix:_ stretch both panels to the grid row and pin `.room-admin` to the bottom, or cap the roster's height.
- **R2-20** [table · results · all] (fidelity-meta) Some players have a blank note line on the result: me as 二游 in a loss, 二游 in 冲A失败. The other three columns carry a line.
  - _Fix:_ resultNoteHTML's final branch returns a neutral note (已出完 / ±0 级) instead of an empty span.
- **R2-21** [table · vs-intro · all] (fidelity-meta) Display titles (胜利, 巅峰对决) are orange-red with a heavy brown outline: `.gd-word`'s gradient ends in #e4480e, with a 6 px stroke on the result and a .15em stroke plus a drop edge on the VS. qqg_result's 胜利 and yxrb_vs's title are clean yellow and pale gold with a thin outline.
  - _Fix:_ a title variant for `.gd-res-title` and `.gd-vs-title`: .08em #7a3200 stroke, no shadow, a #fffbe6→#f09a1c gradient.
  - Coordinate with R2-03.
- **R2-22** [records · records · all] (fidelity-meta) The VS language is inconsistent across three places:
  - The records 最新战报 VS (`.gdr-gold`) is extruded and heavy.
  - The lobby 巅峰对决 tile's mini poster is still a hard red/blue split.
  - The intro poster has the blended yxrb_vs look.

  _Fix:_
  - `.gdr-gold`: the intro VS gradient and a thin outline.
  - `.peak-poster`: the blended field.
- **R2-23** [shared · english · all] (fidelity-meta) Some English strings are literal or inconsistent:
  - 'A failed' (result title)
  - '1-2 finish +3' (room) vs 'Double win' (result)
  - 'PICASSO Guandan · level 2' (room watermark)
  - bare 'Jiefeng' tag

  _Fix:_ 'Missed A', 'Double win +3', 'Level N', and 'Catch-up lead' or a glossed title.
- **R2-24** [table · table · all] (fidelity-table) The bottom tool pills are about 20% smaller than tg_ingame_classic's: 98×38 design px with a 20 px label, against about 122×38 with 24–26 px. 重选 is a text-only pill beside two icon pills.
  - _Fix:_ `.gd-tool` about 120 px wide with a 24 px label and a 28 px icon, and a ↺ glyph for 重选.
- **R2-25** [table · table-actions · all] (fidelity-table) Clock digits are condensed, heavily stroked and fill about 40% of the face, and the two digits touch. For a 180 s turn both the clock and the gem show hands, with no number, for the first 81 s. Tencent always shows a big, clean number.
  - _Fix:_ a wider numeral at about 0.55 of the face, with a 2 px #b8660c stroke.
  - Decide whether turns over 99 s keep hands.
- **R2-26** [table · table-moments · all] (fidelity-table) The 首出 reveal is a slightly enlarged card (26% H) with an orange strip. qqg_shouchu's is about 45% H, with 首出 in big red display lettering and 第一个出牌 under it.
  - _Fix:_ pop the card to about 1.7×, and make the label a red display word over the lower half.
- **R2-27** [lobby · room · desk, phone, portrait] (gameplay QA) On a slow connection the room's level ‹ › steppers and a confirmed 解散 give no feedback. After 解散 the room stays fully interactive for 2 s.
  - _Fix:_ route the stepper through the roomPending/render wrapper. After the confirm, set `roomPending = 'delete-room'` and toast 正在解散房间….
- **R2-28** [table · table-actions · phone, portrait, desk] (gameplay QA) On my turn, 2.6 s table messages (e.g. '…接风给队友 Yichen。') drop under the pills and cover my tallest columns' top indices while I choose. R1-04 accepted this only for the short verdict toasts.
  - _Fix:_ when I can act, put table-message toasts high on the felt (about design y 70), or show 接风 as a seat word.
- **R2-29** [table · table-actions · desk, phone, portrait] (gameplay QA) Against a pair of 2s, the first 提示 press offers the wild 7♥ plus 5♣ while natural 33 and 44 are in hand. The cycle holds at most 3 engine options, and when the partner owns the trick every press advises 不出.
  - _Fix (engine untouched):_ in hintMove, stable-sort the options, natural before wild, then by ascending power.
- **R2-30** [table · table-actions · desk, phone, portrait] (gameplay QA) A single selected against a pair toasts 管不上 (can't beat) instead of 牌型不符 (wrong type).
  - _Fix:_ selectionVerdict returns 管不上 only for a bomb or a combo of the table's type and length.
- **R2-31** [lobby · lobby · phone] (gameplay QA) R1-22 residual: the 844×390 lobby nickname field's tap box is 72×35.
  - _Fix:_ a coarse-pointer `::after` extender to 40 px.
- **R2-32** [records · records · phone] (gameplay QA) The 评分怎么算 '?' is 22×22 drawn with a 40×37 hit box: the only records control under 40 px.
  - _Fix:_ a transparent `::after` of at least 44×44 on `.gdr-help`.

### Must-keep lens (SPEC §1) — finished on the merged build (5c33f71), desk 1440×900 / phone 844×390 / portrait 390×844
Run with the new `harness/mustkeep.py` (`python3 mustkeep.py [events|portraits|music|screens|all] [viewport ...]`), which drives
the real pages against the in-memory Firebase stub (a widened database stub for `events.html`, so nothing touches production).
**Everything on the must-keep list works; one low finding.** 60 checks, all pass except the one below.

| SPEC §1 item | Result |
|---|---|
| Labmate portraits on J/Q/K/A | All 16 J/Q/K/A cards (4 ranks × 4 suits) in one hand render a loaded portrait (naturalWidth > 0), from 16 different labmates, at all three viewports |
| Seat avatars are the labmate photo | Table seats load `people/static/<name>.webp` (Zhengding, Zhongkai, Zaifeng, Yichen); no initials on the table |
| 巅峰对决 data and scoring | `PLAYERS` (18) and `MATCHES` (11) serialise identically to the pre-redesign file (ec32e31); `buildStats` is unchanged apart from an additive read-only `byKey`. The board's four pages read the same, character for character, in the guandan modal and in the `events.html` mvp overlay |
| PICASSO "P" card back | `.gd-back-emblem` "P" (blue, 19.8 px) on the deal's 60 backs, all viewports |
| "picasso" return transition + hint on every screen | Typing "pi" shows `#return-type-hint` on lobby, room and table at all three viewports and it covers no control, hand or played card, except the portrait room (MK-1). Typing "picasso" runs the transition (16 labmate-avatar shards, 5 cards, 10 coins, title) over the full screen on the lobby, on the room (the seat is given back first: no room is left in the store) and on the table, including the rotated portrait table (frames checked: title and shards turn with the stage, no frame gap over 83 ms). It lands on `events.html`, which strips `?from=guandan` and plays the restore fade |
| BGM `#guandan-bgm` | Absolute lab URL, `loop`, volume .45; plays after the first tap; `GuandanMusic.setOn(false/true)` pauses/resumes, stores `picasso.guandan.music` and fires `guandan:music` twice; the lobby 音乐 control flips the state |
| events.html eggs | `222aak` opens the egg overlay and the photo loads (760×570); Esc closes it; the card egg trigger opens it too; "mvp" opens the records board (splash, 4 tabs, 4 pages, ArrowRight pages to the last, Esc closes); typing "pi" shows the events hint; typing "picasso" and, on phones, three taps on the news strip start the launch transition, which lands on `guandan.html`; `?from=guandan` plays the restore fade. Zero console errors on both viewports. (On phones the award intro "TAP TO CONTINUE" sits over the page until it is tapped, as before) |
| Lab copy | 蓝队/红队 and 南家/西家/北家/东家 AI on the room's mini table and seat plates; the watermark says PICASSO 掼蛋 |

- **MK-1** [eggs · low · portrait, room] The "试试输入 picasso" pill lands over the blank right half of the settings panel's 目标 row (`.room-panel`, 140×30 px at 233,667). It hides no text or control, so this is what remains of R1-14/R1-20 there.
  - _Fix:_ in the portrait room, place the hint in the header band beside 好友同玩, or above the panel title (top ≈ 96 CSS px).

### AI-tell lens — finished on the merged build (5c33f71)
Method: a static sweep of `guandan.html` and the five stylesheets against SPEC §3, all 258 `L(en, zh)` strings read, then the
scene set looked at on phone (9 sheets), portrait, desk and a 16-frame capture of the deal + VS intro, plus behaviour probes
(text selection, dragging, focus, scrollbars). Evidence in the git-ignored `scratch/sheets/` and `scratch/shots-r2/`.

Clean: no `backdrop-filter`, `conic-gradient`, CSS mask, `border-image`, blur filter or glow in any Guandan stylesheet; no emoji in
`guandan.html` or `guandan-records.js` (only the card suits and the ☰ glyph); the three infinite animations are the timer pulse, the
报牌 pulse and the loading spinner (all purposeful); the lobby's `drop-shadow`s are hard, un-blurred offsets; the copy is short,
Chinese-first and free of advisor sentences; the deal, VS intro and 首出 read as one designed sequence (VS held about 2.5 s,
cross-faded into the flying backs, the hand fans in, 首出 shows). The overlap with round 2's fidelity findings is large
(bomb/word-art effects R2-02/03/10, stroked titles R2-17/21, initials/letter discs R2-12, stripe R2-14, EN strings R2-23), so only
what those did not cover is listed. 1 medium, 6 low.

- **AT-1** [shared · all · medium] Lobby, room, popups, results and records are ordinary selectable web text: `user-select` is `auto` on `body`, `.lobby`, the tiles and the nav; only the table stage sets `none`. Ctrl+A in the room paints browser-blue selection over 491 characters (titles, seat plates, chips, steppers; `scratch/shots-r2/sel-room-ctrlA.jpg`), a double-click or drag does the same, and on phones a long press selects and offers the callout. Most lobby images can also be dragged out as a ghost (only the seat photo has `draggable="false"`). Tencent's UI never selects.
  - _Fix:_ guandan-ui.css: `body { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none }`, `img { -webkit-user-drag: none }`, `button, [role=button] { touch-action: manipulation }`; then `user-select: text` on `input, textarea` only (nickname, room code).
- **AT-2** [lobby · room · low · all] An empty seat is a dashed-outline circle with "+ 入座" and a separate blue "AI" chip. That is the generic web empty-state placeholder. Tencent's invite slot (tx_p3_img3, 我的队伍) is a solid gold tile with a "+".
  - _Fix:_ solid gold disc (`#ffe08a→#f2b43c`) with a white "+" and the 入座 plate under it; keep the AI chip as a small cap.
- **AT-3** [lobby · rail · low · all] The 赛季MVP rail item says the same thing twice: an "MVP" ribbon on the avatar and the label 赛季MVP, with the stroked label overlapping the avatar's lower edge.
  - _Fix:_ keep the ribbon and set the label to 赛季冠军 / "Season MVP" without the repeat, or drop the ribbon text for a crown glyph; leave a gap under the avatar.
- **AT-4** [table · low · phone, desk] A toast outlives its screen: 房间已创建 (2.6 s) is still on screen over the 巅峰对决 poster in the first 1.1 s of the intro when the host presses 开始游戏 within its lifetime (frames at 625, 873 and 1123 ms in `scratch/sheets/deal-seq.jpg`).
  - _Fix:_ clear the toast when `body.dataset.screen` changes or when the intro starts.
- **AT-5** [english · room · low] More literal strings: the room row 出牌时间 is "Turn 3 min" (reads as a seat turn), and the rules tabs pair 出牌/"Turns" with 出牌记录/"Plays".
  - _Fix:_ "Time limit 3 min"; "Turn" (rules tab) and "Play log". Fold into R2-23.
- **AT-6** [shared · low · all] Scroll panes (`.gd-rules-pane`, `.room-roster-list`, the lab-deck grid, popup bodies) use the classic browser scrollbar on desktop; only the records board styles its own (`scrollbar-width: thin`). Not visible in headless captures (overlay scrollbars), so this is from the CSS.
  - _Fix:_ `scrollbar-width: thin; scrollbar-color: rgba(28,47,102,.35) transparent` on those panes.
- **AT-7** [shared · low · all] The single-colour white glyph family (menu rows, room header chips, tool pills, the lobby nav 邀请/历史对阵/排行榜/设置) is generic; yxrb_lobby's nav uses two-tone illustrated icons (crown, mail, gear, podium). They are filled with hard shadows, so they do not read as thin-stroke Lucide icons, which keeps this low.
  - _Fix (optional):_ give the four lobby nav glyphs a second tone (gold or periwinkle accent).
  - _Also:_ the tab title is "Picasso Lab Guandan Arena", the only English marketing name in the product (no `theme-color` either). Suggest "掼蛋 · Picasso Lab".

### Round-1 re-check — finished on the merged build (5c33f71)
Every round-1 finding is now accounted for: confirmed in passing by the round-2 lenses (listed above), by the must-keep and AI-tell
work this session, or by `harness/recheck.py` (live probes, hd / desk / phone) plus screenshots. Three probe results were
false alarms of the probe itself (a wrapper element counted as a control, a selector, a threshold) and were fixed in the script.

| Result | Findings |
|---|---|
| **Holds** (51) | R1-01, 02, 03, 04, 05, 08, 09, 10, 11, 12, 13, 15, 16, 17, 19, 20, 21, 23, 24, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 52, 53, 54, 55 (and 18 apart from R2-23's strings) |
| **Remnant, carried as a round-2 finding** | R1-06 → R2-10 (天王炸 still flat), R1-14 → **R2-01 (regression, medium)**, R1-22 → R2-31, R1-38 → R2-21, R1-39 → R2-15/16/17, R1-51 → R2-12, R1-18 → R2-23 |
| **Accepted, not fixed** | R1-07 (phone bottom bar at 10.4% H for the 40 px tap rule), R1-26 (one tall column shrinks the hand, as SPEC §5.1 says) |

New evidence this session (all on the merged build):
- **R1-03** (16:9 row over side plays): with a left 5-card straight, a right 6-card 钢板 and my tallest column at 5, no button touches any side play at hd 1280×720, desk or phone (`rc-hd-row-vs-plays.jpg`, `rc-phone-row-vs-plays.jpg`).
- **R1-08**: 新桌 mid-game opens the 离开牌局 confirm (host and guest wording) and the table stays.
- **R1-13**: the records board opens from four distinct pages only (mvp, latest, history, board) plus the room's 战绩 chip; the lab deck and rules each have one lobby entry.
- **R1-24**: the spectator sees 蓝队/红队 tiles and plates, and 观战中.
- **R1-46**: the loading veil is a dark plate with a spinner on the 经典 tile.
- **R1-47**: the English lab deck shows each style tag (Card counter, Gap finder, Steady control, Bomb assault, …).
- **R1-48**: the type hint fades out when a popup opens after it appeared (opacity 0 at hd, desk and phone).
- **R1-52/53/55**: zero references to the removed icon set, `.gd-pill`/`.gd-badge`/`.gd-plate`, `.felt`; the transition has no text-shadow, drop-shadow, blur, Georgia or .46em tracking; no banner code remains in the Guandan files.
- **R1-23**: `.toast` uses `text-wrap: balance`. **R1-45**: no tile-row sliver above the portrait dock. **R1-44**: the P on the share card is fully visible.

### Round 2 synthesis (all six lenses in; build 9602148)
40 findings from the lenses (R2-01..32, MK-1, AT-1..7). **No high, 8 medium, 32 low** after calibration: AT-1 (text selection) joins
the seven mediums the reviewers raised; every other severity stands. Duplicates are merged into fix groups rather than renumbered.

**Merges** (same defect or one fix): R2-03 + R2-21 + R2-17 (display-word and title style: one `.gd-word` family) · R2-12 + AT-2
(room seat placeholders: faces and a solid "+" tile) · R2-02 + R2-10 (bomb and 天王炸 burst art) · R2-15 + R2-16 (CJK line
breaks) · R2-23 + AT-5 (English strings) · R2-07 + R2-27 (pending states) · R2-31 + R2-32 (sub-40 px hit boxes) · R2-22 with the
lobby's peak poster (VS gradient).

**Scores** (0–10, worst viewport; the fidelity reviewer's score, lowered where a medium finding is open on that screen):

| Screen | Score | Worst vp | Open (medium first) |
|---|---|---|---|
| lobby | 7 | desk, ifr | **R2-01**, R2-13, R2-14, R2-18, AT-3, AT-7 |
| room | 8 | desk | AT-1 (all screens), R2-12/AT-2, R2-19, R2-27 |
| popups | 7.5 | phone, portrait | AT-1, R2-15/16, R2-17, AT-6 |
| table | 8 | desk | **R2-04**, R2-08, R2-09, R2-24, R2-11 |
| table-actions | 7.5 | phone | **R2-05, R2-06**, R2-25, R2-28, R2-29, R2-30 |
| table-moments | 6.5 | phone | **R2-02, R2-03**, R2-10, R2-26 |
| results | 7.5 | ifr, desk | **R2-07**, R2-20, R2-21 |
| vs-intro | 8 | desk | R2-21, AT-4 |
| records | 8.5 | phone | R2-22, R2-32 |
| portrait | 7.5 | portrait | as phone: table-moments and actions; MK-1 |
| english | 7.5 | phone | R2-23/AT-5 |
| eggs | 8.5 | portrait | MK-1, AT-4. Must-keep passes in full; the type hint is a product toast and the transition has no halos left |

Below 8: lobby, popups, table-actions, table-moments, results, portrait, english.

**Fix plan** (each group: fix, screenshots at the SPEC viewports, commit, push; the engine files stay untouched):
- **A. Shared behaviour and copy:** AT-1, AT-6, R2-15/16, R2-23/AT-5, tab title.
- **B. Table play flow:** R2-05, R2-06, R2-28, R2-29, R2-30, R2-07/27, R2-20.
- **C. Lobby and room:** R2-01, R2-13, R2-14, R2-18, R2-12/AT-2, AT-3, R2-19, R2-31/32.
- **D. Effects and display words:** R2-02/10, R2-03/21/17, R2-26, R2-22, R2-11, R2-25.
- **E. Table static:** R2-04, R2-08, R2-09, R2-24.
- **F. Eggs:** MK-1, AT-4.

## Handoff status
- **Done (previous sessions):**
  - gd3/table and gd3/lobby merged.
  - Harness built: gdh.py, stage.js, scenes.py, play.py, sheet.py.
  - Review round 1 (55 findings) and fix round 1 (46 commits on four track branches gd4/r1-*, each passed an independent checker) merged into guandan-cloud.
- **Done (this session, up to build 9602148):**
  - Harness environment: Chromium now trusts the proxy CA (HANDOFF §5). The first captures had silently lost the web fonts to ERR_CERT_AUTHORITY_INVALID.
  - Fresh baselines: `scenes.py` at all five viewports (59 scenes each, zero console errors).
  - Pre-fix comparison shots of de0134d at phone, desk and portrait (`scratch/shots-r0`).
  - Full rounds: `play.py desk|portrait|phone 2` gave two rounds each through the tribute, zero console errors.
  - Merge with main: a trial merge of origin/main is clean. Outside the Guandan files only events/events.html differs from main, by the intended shared-records-board change.
  - Workflow scripts now take the refs, pre-shot and session paths as args.
- **Review round 2: partial.** The fidelity-table, fidelity-meta and gameplay-QA lenses finished: 32 findings (7 medium, 25 low, no high) and scores for 11 of the 12 screens (see Round 2 above).
  - Below 8: lobby 7, popups 7.5, table-moments 6.5, portrait 7.5, english 7.5.
- **Done (session 3, 2026-09-30):** harness re-set up (proxy CA in Chromium's NSS store, references downloaded, phone/portrait/desk baselines re-captured into `scratch/shots-r2`, zero console errors); **must-keep lens finished** (see above: all pass, MK-1 low), `harness/mustkeep.py` added.
  **AI-tell lens finished** too (1 medium, 6 low; see above).
- **Missing from round 2:**
  - ~~Round-1 re-check~~: done (see above; `harness/recheck.py`).
  - ~~Synthesizer~~: done (see "Round 2 synthesis").
- **Fix round 2 (in progress, session 3):** the plan is groups A–F of the synthesis; verified on screenshots and probes, one commit + push per group.
  - **A shared behaviour and copy — done:** AT-1 (no selection/drag/callout), AT-6, R2-15/16, R2-23/AT-5, tab title. Verified by `ctrl+A` selecting 0 characters in room and table; phone EN room fits again.
  - **B table play flow — done:** R2-05, 06, 07, 20, 27, 28, 29, 30. `harness/verify_b.py` and `verify_b2.py` pass on phone and desk.
  - **C lobby and room — done:** R2-01 (tiles ≈1.05:1 at 16:10, top bar and dock take the slack), R2-12/AT-2 (robot and head faces, solid gold empty seat), R2-13, R2-14, R2-18, R2-19 (panels share a bottom edge), R2-31/32, AT-3 (the MVP label is the member's first name).
  - **D effects and display words — done (R2-10 partly):** R2-02 (warm burst: hot core, orange rim and flame-coloured rays, wider flat ring, no full-screen flash), R2-03/21 (one thin-outline cream-to-gold `.gd-word`; bomb and combo labels sit under the played cards at 72 px), R2-17 (popup titles plain white), R2-11 (lighter 不出 stroke, grey in the log), R2-22 (records VS and the lobby poster share the intro's gradient, no extrusion, no hard seam), R2-25 (bigger, cleaner timer digits; hands still show above 99 s), R2-26 (首出 card at 44% of the stage height, red display word, 第一个出牌 plate). R2-10: 天王炸's smoke has a 2 px light outline, the fire none, a lighter smoke ramp and a shorter fade, but the column is still a cartoon puff (kept as low).
  - **E table static, F eggs — not started.**
- **Next (no multi-agent workflow; one lens or one fix group at a time, push after each):**
  1. ~~Round-1 re-check~~ (done, see above).
  2. ~~Synthesize round 2~~ (done above; 8 medium, 32 low, no high).
  3. Fix round 2 by the groups in the synthesis (A shared, B play flow, C lobby/room, D effects/words, E table static, F eggs), each verified on screenshots at the SPEC viewports and pushed.
  4. Round 3 lens by lens, fix, and repeat until every screen scores ≥ 8 with no high or medium finding.
  5. Merge origin/main (keep main's non-Guandan files), replay a full round, and push guandan-cloud.
  6. Final report per HANDOFF §6.
- **Environment notes (session 3):** Chromium trusts the proxy CA via `~/.pki/nssdb` (HANDOFF §5, redo after a container reset); `refs/fetch_refs.sh` sometimes times out on news.yxrb.net (rerun it or curl the two files again); the phone `events.html` has an award intro ("TAP TO CONTINUE") over the page until tapped. Harness: `GD_SHOTS=<dir> python3 scenes.py phone portrait desk` (about 2 min per viewport), `python3 mustkeep.py all desk phone portrait` (about 6 min).
