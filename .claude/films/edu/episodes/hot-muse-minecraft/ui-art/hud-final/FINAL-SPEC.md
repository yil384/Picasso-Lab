# Muse HUD: final design spec (for the node-canvas port)

**Files.** The mock-up `final/index.html` draws the whole 1080x1080 frame on one `<canvas>` with the 2D context. It uses
only calls node-canvas has. Each `/* ---------- */` section is a function that takes the state, so the port lifts the
sections into `src/ui-panel.js` and feeds them live state in place of `window.HUD_STATES[state]`.

**Renders.** In `final/`: `nowhy.png`, `long.png` and `fresh.png`, each with a `-phone.png` at 390 px. In
`final/work/`: the extra checks `fresh-muse`, `long-max` (a 139-character why and a 400-character plan), `long-noplan`,
`nowhy-words` (a plain-words goal) and `nowhy-empty` (no advice, no events).

**URL parameters.**

| parameter | effect |
| --- | --- |
| `?state=nowhy\|long\|fresh\|fresh-muse` | which state to draw |
| `&test=max\|noplan\|words\|empty` | the edge cases above |
| `&qa=1` | outlines every text problem in red and prints the computed layout |

The page always sets `window.HUD_LAYOUT` (the regions it computed) and `window.HUD_QA`. A port can be checked against
both.

The winner of the review was the **broadcast** mock-up (ranked first by all three judges). This is broadcast with every
judge issue fixed and the grafts listed in section 11.

---

## 1. Concept

There are two "teams", each with one colour, and everything else is neutral.

| who | colour | what is drawn in it |
| --- | --- | --- |
| **The caller (Muse)** | violet | its why (quoted), plan and earlier whys; its calls (tool names in RAW and NOW); the NOW block; its share of the actions |
| **The body and the world** | amber | advice, reflexes, the body's events, the body's sub-step and its progress bar in NOW, the reflex share |
| **Neutral** | grey / white | game state, server answers (`←`), steps the server added, waiting / running states |

Green means ok, red means failed or "went on without it".

- **Possession rule.** A 3 px line across the full width on top of the stats strip. The violet part is the caller's
  share of actions; the amber part is the reflexes. When the share is unknown the line is grey.
- **Caller name.** It comes from the MCP client: `MUSE` for Muse, `TEST SCRIPT` when our smoke test drives the game.
  Every label, the stats, the advice verdict and the event meta use it. The HUD never puts Muse's name on words Muse
  did not send.

---

## 2. Grid and regions (px, 1080x1080)

**Margins and grid.**

- Outer margin 20, so content runs from x 20 to x 1060.
- 12 columns of 72 px with 16 px gutters. A column step is 88 px.

**Columns.**

| part | x | width |
| --- | --- | --- |
| Left column (NOW, the caller) | 20 to 620 | 600 (7 columns) |
| Divider (1 px hairline) | 628 | |
| Right column (body and world) | 636 to 1060 | 424 (5 columns) |

**Thinking band.** Its why/plan split is fitted to the why (section 5.3), not to the grid. The why starts at x 20 and
the plan starts 32 px after the why's measure.

**Regions, top to bottom.** Each band ends with a 1 px hairline (`line`).

| region | y | height |
| --- | --- | --- |
| Video | 0 | 608, fixed. Overlays only in the bottom 64 px, at the corners (5.9). The bot's area, x 380-700, is never covered. |
| Stats strip | 608 | 36 |
| Goal band | 644 | 60 (milestones) or 40 (counted goal or plain words) |
| Thinking band | after the goal | the fitted height, at least 76 (with a why); or 30 (the one-line "no why") |
| Columns | band bottom + 10 | H, chosen by the layout (section 6) |
| RAW | column bottom + 10, to 1080 | 24 header + n x 18 lines + 2-10 bottom padding |

**Measured layout in the renders** (`HUD_LAYOUT`):

| state | goal | thinking | columns y / H | RAW y / lines / entries | left / right gap | right column |
| --- | --- | --- | --- | --- | --- | --- |
| nowhy | 60 | 30 (no why) | 744 / 152 | 906 / 8 / 5 | 0 / 2 | advice 3 lines, verdict, 1 event; left uses both fillers |
| long | 40 | 86 | 780 / 112 | 902 / 8 / 5 | 2 / 13 | full advice (4 lines), verdict inline; 2 earlier whys under the plan |
| fresh | 40 | 86 | 780 / 132 | 922 / 7 / all 5 | 0 / 5 | advice 2 lines, verdict inline, 1 server event (2 lines) |
| fresh-muse | 60 | 30 | 744 / 224 | 978 / 4 / all 2 | 0 / 21 | advice empty, 3 events wrapped |

**Empty space.** Checked by `work/holes.py`: the largest empty square in y 612-1080, counting every non-flat pixel as
content and the outer margins as structure.

| state | final | broadcast before the fixes |
| --- | --- | --- |
| nowhy | 48 | 64 |
| long | 52 | 52 |
| fresh | 40 | 60 |

Every remaining square is a ragged line ending or the 32 px why/plan gutter. None is a structural hole.

---

## 3. Colour tokens

| token | value | use |
| --- | --- | --- |
| base | `#07090d` | page and band backgrounds |
| band | `#0b0e14` | stats strip, RAW |
| panel2 | `#141924` | the "next" milestone cell |
| chip | `#252c3a` | the fold count chip (`×5`) |
| track | `#222837` | goal and step progress tracks |
| zebra | `rgba(255,255,255,.028)` | odd RAW entries |
| line / line2 | `rgba(255,255,255,.08)` / `.16` | hairlines / separators in strips |
| t1 / t2 / t3 / t4 | `#f3f5f9` / `#bcc3d0` / `#7f889b` / `#4e5667` | primary / secondary / meta / to-do and queued |
| muse | `#9d8cff` | caller accent: labels, the NOW block, quote marks, possession |
| museHi | `#c6bcff` | tool names, the skill in a step, the `(132)` share count |
| museInk | `#e4dfff` | plan, earlier whys |
| museDim | `#a69fd6` | earlier whys run on under the plan |
| museDeep / museTrack / museTint | `#15122b` / `#2a2450` / `rgba(157,140,255,.07)` | NOW strap / tracker track / running step and newest RAW entry |
| body / bodyHi | `#efa443` / `#ffc77a` | body labels, advice bars, reflex share, BODY tag, step progress / sub-step words, stale advice age |
| world | `#8fb1d6` | WORLD tag, NIGHT |
| ok / fail | `#5fd39b` / `#ff6f61` | done, "ok", followed / FAILED codes, "went on without it" |
| jKey / jStr / jNum / jPun | `#939cb1` / `#dcd5ff` / `#ffffff` / `#5f687c` | JSON as sent: keys / strings / numbers, true, false, null / punctuation |
| ans | `#a0a9bc` | server answers |

There is no gold. The new-goal toast is white, and the fold chip and stale advice use the tokens above.

---

## 4. Type scale

**Families.** MuseUI is Inter at 500, 600 and 700; there is no 400. MuseMono is JetBrains Mono at 400 and 500. Every
number that must line up is set in MuseMono, because node-canvas cannot turn on `tnum`.

**Spaced capitals ("caps")** are always UI 700, drawn one character at a time with advance = glyph width + 0.09 em
(0.1 em in the stats strip).

| role | font, size / line | colour |
| --- | --- | --- |
| Why | UI 600 22/28; 20/26 when it needs a 3-line measure over 640 | t1, quote marks muse |
| Plan | UI 500 14/19; 13/18 above 6 lines | museInk |
| Running step label | UI 600 18 | t1 |
| Done / queued step label | UI 600 15 | t2 / t3 |
| Goal title, counted title, plain words | UI 600 16 | t1 |
| Advice | UI 600 14 gist + UI 500 14 rest, 19 rows | t1 / t2 |
| Place, phase words, part label | UI 500 14 | t2 |
| Sub-step (body) | UI 500 13 | bodyHi |
| No-why sentence, empty states | UI 500 13 | t3 |
| Events, earlier whys, verdict | UI 500 12, 19 rows | t2 / museInk / verdict colour |
| Big numbers (HP, food, y, share, game clock) | Mono 500 18 | t1; "/20" Mono 400 13 t3 |
| World clock (time of day) | Mono 400 14 | t2 (smaller than the game clock, so the two clocks never compete) |
| NOW clock | Mono 500 20 | t1 |
| Tool in the strap | Mono 500 16 | t1 |
| Step count / step time | Mono 500 15 / Mono 400 13 | t1 / t2 |
| Step JSON | Mono 400 12 | skill museHi, then JSON colours (queued: t4) |
| RAW | Mono 400 13/18 (tool, states, chip 500) | JSON colours; answers ans |
| RAW time column | Mono 500 12 (recent) / 400 12 | t1 / t3 |
| Meta (right of headers) | Mono 400 11 | t3 |
| Labels | caps 10 (headers), 11 (NOW, CALL, phase), 9 (LATEST, QUEUED, BEFORE, NEW, ADDED BY THE SERVER), 8 (BODY, WORLD, SERVER, EARLIER) | the speaker's colour |

**Phone (390 px, scale 0.361).**

- These stay legible: the why (about 8 px), the running step label, every big number, the NOW clock, the goal title,
  the advice gist and the toast.
- RAW, meta and events read as texture. That texture is deliberate: it shows how much Muse is sending.

---

## 5. Regions: content, overflow, truncation, collapse, empty states

Two cutting rules hold everywhere:

- Text that does not fit is cut with "…" at a word boundary, if that keeps at least 60 % of the room (`ellip`).
- RAW is cut only at JSON separators (5.8).

### 5.1 Stats strip (y 608, 36 px, fill `band`)

**Possession rule** on the top 3 px. All text baselines are at y + 25.

**Left group.** Separators are 22 px wide with a `line2` hairline in the middle.

1. heart icon 20, then `hp` and `/max`;
2. food icon 20, then `food` and `/max`;
3. sun / moon / flame icon, then the phase in caps 11 (`DAY` t1, `NIGHT` world), then the world clock Mono 400 14 t2,
   then the rest of `phaseWords` ("dusk in 1 min");
4. depth icon, then `y N`, then the place words.

**Right group**, laid out from x 1060 leftward:

1. the game clock;
2. the game id, Mono 400 13 t2;
3. `GAME` in caps;
4. a separator;
5. `reflexes N% (r)` in amber;
6. `(m)` in Mono museHi;
7. `N%`;
8. the caller name in violet caps;
9. a separator.

**Fit order.** When the left group would run into the right group, the `(m)` / `(r)` counts are dropped first, then
the place words are cut.

**Unknown share.** It shows "–" and "share not counted yet", and the possession rule turns `t4`.

### 5.2 Goal band

**Milestones (60 px).**

- **Tab** (120 px):
  - `GOAL` in caps 10 t3, with `done/total` Mono 500 13 right-aligned at x 124;
  - the title UI 600 16 at y + 44;
  - a hairline at x 136.
- **Grid**: 12 cells, 6 columns x 2 rows in reading order, starting at x 150 with 14 px gaps.
  - Each column is as wide as its widest cell (icon 16 + 5 + label + 8 + time). Spare width is shared out evenly, so
    no label is cut at this width.
  - Rows sit at y + 8 and y + 30.

| cell | icon | label | time |
| --- | --- | --- | --- |
| done | full opacity | UI 500 13 t2 | Mono 400 11 t3, right-aligned |
| next | full opacity | UI 600 t1 | progress "8/14" (or "next") in Mono 500 12 t1 |
| to-do | alpha .3 | t4 | none |

The **next** cell also has:

- a `panel2` fill;
- a 2 px t1 bar on its left;
- a 2 px progress underline across the cell (track `line2`, fill t1, done/of).

**Counted goal (40 px).** Baseline y + 26.

- `GOAL` in caps.
- While the goal is new, an outlined `NEW` chip (1 px t2 stroke, 15 high, caps 9 t1).
- The title, then a hairline.
- Parts share the width. Each part has:
  - icon 20;
  - label UI 500 14 t2;
  - a bar: one 6 px segment per unit (3 px gaps, done t1, rest `track`) when `of` ≤ 20, otherwise a rounded continuous
    bar;
  - `done/of` Mono 500 18 right-aligned.
- At the right, the previous goal **in words** (no icon strip): `BEFORE` caps 9 t3, its title UI 500 13 t2, `6/12`
  Mono 500 13 t2, and "next was Water bucket" UI 500 12 t3.
- No bar is drawn for a part the server cannot count.

**Plain words (40 px).**

- `GOAL`, the free-play title, a hairline;
- the words in UI 600 16 t1, cut with "…";
- at the right, "plain words: the server does not count them" in t3.

### 5.3 Thinking band (only when the latest call carries a why)

**Header row (20 px), the same style as every module header.**

- Left: `MUSE · WHY` in caps 10 muse.
- Right, at the end of the why's measure: "call 10 · sent 43:30 · " in t3, then the age ("9s ago") in t2. An old why
  never reads as current.
- A hairline at + 15 across the why's measure.
- The plan column gets its own header: `PLAN` with meta "sent with call N".

**The why** is quoted speech.

- The opening `“` (muse) hangs in the margin left of x 20, so the words align with every label at x 20.
- The closing `”` (muse) follows the last line.
- Lines are balanced, so a short why never ends on a one-word line.
- First baseline at y + 20 + 4 + size.

**Fitted measure (`thinkingLayout`).** For each why size (22, then 20) and line count n (1, 2, 3):

1. Binary-search the narrowest width that keeps the why to n lines.
2. Set whyW to that width + the closing quote, rounded up to 4 px, and at least the header's width (≥ 260). Skip it if
   it is over 640.
3. Then planX = 20 + whyW + 32 and planW = 1060 − planX, which must be ≥ 360.
4. Wrap the plan to planW. Score:
   `max(whyH, planH, 76) + 1000·(plan cut) + 8·(20 px why) + 0.3·|whyH − planH|`.
5. The lowest score wins.

Heights: whyH = 20 + 4 + ws + (n − 1)·wl + 12, and planH = 20 + 16 + (m − 1)·pl + 10.

This removes the hole to the right of a short why for good: the why's column is exactly as wide as its lines.

**Plan.**

- At most 6 lines at 14 px, or 7 at 13 px.
- The layout lowers the cap toward 3 before RAW drops below 6 lines.
- When cut, it is cut at a word with "…".
- The sample's placeholder plan ("next part of the plan, as the goal says") is never drawn.

**Room under a short plan.** When the last plan baseline + 21 ≤ band bottom − 7, the caller's earlier whys run on
across the rest of the band, newest first:

- `EARLIER` in caps 8 muse;
- then, per why: the time Mono 11 t3, the why UI 500 12 museDim, and 18 px before the next one;
- the last item is cut with "…".

The count shown is remembered (`EARLIER_FROM`), so the column module never repeats a why.

**No plan.**

- The plan header reads `PLAN` in t3 with meta "none sent with this call".
- The column lists `EARLIER WHYS · N` and one why per row: time right-aligned at + 34, text at + 44 in museInk.

**No why.** The band collapses to **one line (30 px, full width)**:

- `MUSE · WHY` in caps muse;
- a hollow ring (t4);
- then, in t3: "Muse sent no why or plan with play call 9 (11:24), nor with any of its 26 calls this game." When some
  earlier calls did carry a why, it reads "Muse sent no why or plan with play call 9 (11:24)."

Nothing else is drawn and there is no filler: the rest of the space goes to the columns and RAW.

### 5.4 NOW (left column, x 20, w 600)

**Strap (32 px, `museDeep`).**

- **Tag block**, width = caps width + 24: muse with `NOW` while the call runs; t2 with `LAST` once it has ended. Its
  caps are in the base colour.
- Then: `CALL n` caps 11 t2, the tool Mono 500 16 t1, and "sent m:ss" Mono 400 12 t3.
- **Right**:
  - running: `RUNNING` caps 10 t2 and the clock Mono 500 20 t1;
  - ended ok: `DONE IN` with the duration in ok;
  - otherwise: `ENDED` in fail.
- **Step tracker, only for 2 or more steps.** One segment per step the caller sent: 4 px tall, 3 px gaps, 30 px per
  step, with a "d/n" label (Mono 11 t3) when there is room.

  | step state | segment |
  | --- | --- |
  | done | ok |
  | running with a count | muse, filled in proportion |
  | running with no count | hollow muse outline: no fake progress |
  | queued | museTrack |
  | failed | fail |

  A single step gets no tracker; its own row already shows the count.

**Step rows**, in the order sent. A server-added row comes before the step it serves.

- **Running (54 px, `museTint`)**, row 1:
  - the number at x + 14 (Mono 12 t3);
  - a ring (r 6, 2 px muse) with a dot (r 2.5) at (x + 34, y + 17);
  - icon 20 at (x + 48);
  - the label UI 600 18 t1 at x + 76;
  - then 12 px later the step **exactly as sent**, `skill {"json":"args"}`, in RAW colours at Mono 12, cut with "…";
  - at the right: "8 of 14" (Mono 500 15 t1), or the elapsed time when there is no count.

  Row 2, baseline + 41, is **the body**:
  - `BODY` caps 8 amber;
  - the sub-step words in bodyHi;
  - a 5 px bar (fill amber, `track`) to the elapsed time (Mono 400 13 t2) at the right;
  - with no count, an amber dotted line (`setLineDash([2,4])`, 55 % alpha) instead of the bar, and no time on this row.
- **Done, queued or failed (24 px).**
  - The mark: a check (ok), a cross (fail) or a ring (t4); then icon 18, at alpha .4 when queued.
  - The label UI 600 15: t2 when done, t3 when queued.
  - The JSON in Mono 12, t4 when queued.
  - At the right: the time it took (Mono 400 13 t2), or `QUEUED` caps 9 t4.
  - A done step adds "→ result" (UI 500 12 t3) only when the whole result fits or there are at least 160 px of room.
- **Added by the server (22 px).** `+` in t3, the raw step Mono 12 t3, and `ADDED BY THE SERVER` caps 9 t4 at the
  right. It never gets a number.

**LATEST row (28 px, a hairline on top).** Shown when the newest call is not this call (polls, `set_goal`, …).

- `LATEST` caps 9 t3 at x + 14.
- The tool Mono 500 13 museHi at x + 76, then the args Mono 13 jStr.
- For a folded run, the `×N` chip and " since t".
- Right: "waiting 0:40" (Mono 500 13 t1), or "3s ago · answered" in t2.

**Fillers.** The layout turns these on only when the column has room for them.

| filler | height | contents |
| --- | --- | --- |
| latest answer | 18 | under LATEST: `←` at x + 18, its time Mono 11 t3 right-aligned at x + 66, the answer Mono 12 ans at x + 76, cut with "…" |
| interim answer | 20 | the running call's own last answer (same layout), above LATEST |

After the fillers, the caller's EARLIER WHYS module may follow (5.6).

### 5.5 Right column: BODY · ADVICE

**Header.** `BODY · ADVICE` in amber. The meta is "given · age", for example "28:00 · 16 min ago"; the age turns
bodyHi after 5 minutes, so stale advice reads as stale.

**Items.** Each item has:

- a 3 px amber bar on its left;
- the gist in UI 600 t1, then the rest of the text in UI 500 t2, at 14/19;
- 3 px between items.

**Lines.** The first item gets at least 3 lines (or all it has); every other item gets at least 1. The layout then adds
lines in item order. Each advice line is worth 4 px of gap, so the full advice beats a slightly tighter fit.

**Verdict.** Its wording:

| case | glyph | words |
| --- | --- | --- |
| current follow | check (ok) / cross (fail) | "Muse followed it" / "Muse went on without it" |
| a past verdict newer than this advice | check / cross | "Muse went on without it · call at 28:30" |
| no play call since the advice | hollow ring | "No play call from Muse since 14:34" (t3) |
| otherwise | hollow ring | "No verdict logged" |

A verdict about older advice is never shown against the current one.

The verdict sits **right-aligned on the advice's last line** when that line + 28 + the verdict fit in 424 px.
Otherwise it gets its own 20 px row.

**Empty state.** "None given to Muse yet" (42 px).

### 5.6 Right column: BODY · WORLD, and earlier whys

**BODY · WORLD** (8 px gap above it).

- **Header** label: `BODY · WORLD`, plus `· SERVER` only when a server event is shown. Meta: "21 logged · not Muse".
- **Rows of 19 px**:
  - the time Mono 11 t3, right-aligned at + 34;
  - a tag in caps 8 at + 42: `BODY` amber, `WORLD` world, `SERVER` t3;
  - the text UI 500 12 t2 at + 84 (milestones in t1).
- Newest first, one line each. Spare rows let the newest events wrap to 2, then 3 lines.
- With 4 events or fewer, the body's full logged text is used.
- When no row fits, the module is not drawn.

**EARLIER WHYS** (caller, violet): the header "N before" (or "N more before" when the band already showed some), then
rows with the time and the text in museInk.

- It goes in the left column under NOW when that column has room; otherwise in the right column after the events.
- It always continues from `EARLIER_FROM`.

### 5.7 RAW (full width, the rest of the frame)

**Header (24 px).**

- Left: `MUSE · RAW CALLS` in caps 10 muse (the caller name), then the legend "exactly as sent, newest first   ← the
  server's answer" in Mono 11 t3.
- Right: "26 calls · 6 repeats folded · 16 older below (0:00–8:27)". The range is a single time when both ends are
  equal.

**Entries come from `raw.runs`**, where identical consecutive calls are already folded.

- **Time column**, right-aligned at x 62: "40s" (Mono 500 t1) when the newest call of the run was sent under 100 s ago;
  otherwise its game clock, "11:24" (Mono 400 t3).
- **The call** at x 72: the tool (Mono 500 museHi), then the args JSON exactly as sent, coloured by token.
- **The fold**: the `×5` on a `chip` rounded rect (radius 3, 15 tall, Mono 500 t1), then " 12:14–15:26" in t2.
- **The answer**, after "  ← " (t3):

  | answer state | shown |
  | --- | --- |
  | waiting | `waiting 0:40` (Mono 500 t1), then " · last answer 15:20: " (t3) and the text |
  | running | `running 4:41` (Mono 500 t1), then " · 12:07: " and the call's last interim answer |
  | answered | any code (`FAILED`, …) in fail, then the text in ans, with "ok" in ok |

- **Lines**: 13/18. A line holds 126 characters; continuation lines are indented 2 characters (124).
- **Bands**: the newest entry gets a `museTint` band with a 3 px violet rule at x 0; odd entries get `zebra`.

**Wrapping** (`wrapChars`).

- The search for a break goes back at most 45 % of the line.
- It prefers breaking after a space or a comma, then after `:`, `{`, `[` or `;`, or before `"` or `{`.
- It never breaks inside the fold chip. A token is split only when no break exists in that window. This fixes
  "diamond_pickax|e".

**Cutting an entry to n lines** (`cutMono`).

- A short call (≤ 55 % of the room) is kept whole, and its answer is cut at a word.
- A long call is cut at a separator in its **arguments** (trailing spaces dropped, then "…"). The fold count and up to
  45 % of the room for the answer are kept. Every visible entry shows its answer.

**Line allocation.** Lines are handed out in this order (`RAW_ORDER`):

1. the newest entry in full, up to 4;
2. 1 line each for entries 2, 3 and 4;
3. entry 2 up to 2;
4. entry 5;
5. entry 3 up to 2;
6. entry 6;
7. entry 2 up to 3;
8. entry 7;
9. entry 3 up to 3;
10. entry 4 up to 2;
11. 1 line for every older entry.

Lines left over after every entry shows go to the cut entries, newest first. The newest calls are complete, and only
older ones are cut.

---

## 6. Layout algorithm (per data change, all measured)

1. Video and overlays, the stats strip, the goal band height.
2. The thinking band with the plan cap at 7, which sets `EARLIER_FROM`. Then `colTop` = band bottom + 10, and `avail`
   = 1080 − colTop − 10.
3. For each RAW line count n from min(6, needFull) to the most that fits, and each bottom padding from 10 down to 2:
   1. H = avail − (24 + 18n + padding).
   2. `packLeft(H)`: NOW must fit. Then the latest answer (18), the interim answer (20) and earlier whys
      (8 + 20 + 19k) are added if they fit.
   3. `packRight(H)`: the advice minimum must fit. Then for each advice line count b, take events and earlier whys
      into the remaining room and score `gap − 4b`; the lowest wins.
   4. Score the layout:
      `18n + 40·(events shown) + 20·(earlier whys shown) − 4·(each gap px over 24) − 0.25·(left gap + right gap)`.
4. Take the best score. If the best layout gives RAW fewer than 6 lines (or than its need), lower the plan cap by one
   (not below 3) and redo from step 2.
5. Draw:
   1. the goal and thinking bands;
   2. NOW with its fillers;
   3. earlier whys on the left (if chosen);
   4. the divider (full H);
   5. advice, events, earlier whys on the right;
   6. RAW at colTop + H + 10.

What this gives:

- RAW gets every line it can use.
- The columns get exactly what their content needs.
- A BODY · WORLD row is worth about 2 RAW lines.
- Holes are punished.

---

## 7. Attribution styling (honesty rules)

| content | colour / label |
| --- | --- |
| Caller's words (why, plan, earlier whys) | quoted / violet labels and ink; the label names the caller from the MCP client |
| Caller's calls (NOW strap, step JSON, RAW tool) | violet block, museHi tool and skill, lilac strings |
| The body executing a step | `BODY` tag, amber text, amber progress |
| Body advice, reflexes, the body's events | amber header and bars, `BODY` tag |
| World events (milestones) | `WORLD` tag, steel |
| Server answers, server events, server-added steps | neutral grey, `←`, `SERVER` tag, `ADDED BY THE SERVER`, no step number |
| Running / waiting states | neutral (t1); never violet, never amber |
| Smoke-test runs | `TEST SCRIPT` everywhere Muse would appear, including "not the test script" and "No play call from the test script" |

---

## 8. Port to node-canvas

| mock-up | node-canvas |
| --- | --- |
| `@font-face` MuseUI 500/600/700, MuseMono 400/500 | `registerFont` as `ui-panel.js` does today; same family strings (`"600 18px MuseUI"`) |
| `fillText`, `measureText`, `textAlign`, `textBaseline='alphabetic'` | same |
| `caps()` char-by-char spacing | same code; no `letterSpacing` needed |
| `fillRect`, `arcTo` rounded rects, `arc` rings and dots, check and cross paths, `strokeRect`, `setLineDash` | same |
| `strokeText` (hotbar counts, 3 px dark outline) | same |
| `globalAlpha` (dimmed icons) | same |
| `drawImage(icon, x, y, s, s)` | pre-scale each icon once to 16, 18, 20, 24 and 28 px and draw them unscaled |
| the frame `drawImage(0, 0, 1080, 608)` | skip: the camera layer is under the panel |

Not used: shadows, blur, filters, gradients, `tnum` or any CSS layout. Every position comes from `measureText`, the
mono advance (`W('0000000000')/10` = 7.8 px at 13 px) and the constants above.

**Speed at 30 fps.**

- Run the layout (section 6) and every wrap (why, plan, advice, events, RAW) **once per data change**, not per frame.
- Per frame, only these change:
  - the clocks: game clock, time of day, NOW clock, step elapsed, `waiting m:ss`, "40s", "9s ago" and advice ages;
  - the progress bars.
- Draw the static layer to an offscreen canvas and redraw only the clock cells on top. Every clock is in a fixed-width
  mono cell, right-aligned, so the width never changes inside a second.
- When a RAW time crosses 100 s it switches from "Ns" to the clock (same width class). That is a data change.

**Panel and overlays.** The panel is the 472 px under the game plus the see-through band over it (`over`, 72 today),
which stays at 72.

- **Hotbar**: x 16-372, y 544-592, radius 6, `rgba(7,9,13,.82)`. Slots are 40 px with 4 px gaps (fill `.08`, or
  `.03` when the count is 0); icon 28; the count Mono 500 13 bottom-right with a stroke.
- **New-goal toast**: right edge 1064, y 544-592, `rgba(7,9,13,.86)`. A 3 px white bar, star 24, `NEW GOAL` caps 10
  t3, the title UI 600 18 t1. Shown while `goal.new`.

---

## 9. Data each region needs

Fields are named as in `data/states.json`. The last column says what today's `ui-panel.js` holds.

| region | fields | current panel |
| --- | --- | --- |
| caller name | the MCP client of the game (`clientInfo.name`; smoke script vs Muse) | **missing** (every label is hard-coded "Muse") |
| stats | `hp`, `food`, `dimension`, `timeOfDay` + `phase` + `phaseWords`, `position.y`, `position.place`, `museShare.pct/muse/reflex`, `gameId`, `gameClock` | `st.hp/food/clock/pct/muse/reflex`, `anchor` (ticks), `game`, `pos` |
| goal | `goal.kind` (`milestones` / `counted` / `text`), `title`, `done/total`, `list[]` (`label`, `icon`, `state`, `done`, `progress`), `parts[]` (`label`, `icon`, `done`, `of`), `new`, `previous` (`title`, `done/total`, `list`) | `goal`, `newGoalAt`; **previous goal missing** |
| thinking | `why`, `plan`, `whyCall`, `whyAt`, `lastCallAgoS`; `latestPlayCall` (`no`, `tool`, `sent`) for the no-why line; `raw.entries[].hasWhy` | `thoughts` (text, gs, call), `latestPlan()` |
| earlier whys | `earlierThinking[]` (`at`, `why`) | `thoughts` |
| NOW | `currentCall` (`no`, `tool`, `sent`, `state`, `running` / `doneIn`), `steps[]` (`say`, `skill`, `args` as sent, `icon`, `state`, `elapsed`, `took`, `result`, `sub {text, done, of}`), `addedByServer[]` (`before`, `raw`), `serverAnswer` (`at`, `text`) | `calls[0]` (`steps[].say/raw/state/ms`), `sub`, `live`. Step `raw` is a paraphrase: **take `skill` + `args` from the call's own JSON**. The answer **time** is missing; server-added steps need forwarding if the agent does not send them |
| LATEST | `raw.runs[0]` (`tool`, `args`, `count`, `firstSent`, `lastAgoS`, `newestState`, `latestAnswer`, `latestAnswerAt`) and `raw.entries[0].answer.waitingS` | `calls` (`reply` text only) |
| advice | `advice.items[]` (`text`, `gist`, `givenAt`, `givenAtS`), `advice.follow`, `advice.lastFollow` (`atS`, `at`, `ok`) | `advice` map holds **only `adviceGist(text)`**: keep the full text and the time given; tie `follow` to the advice by time |
| events | `events[]` (`at`, `who`: body / world / server, `kind`, `text`, `logged`) | `events` holds body / reflex / death only: **add world (milestones, today only a toast) and server (care policy) events with game time** |
| RAW | `raw.total`, `raw.runs[]` (fold identical consecutive calls in the renderer), `raw.entries[]` (`answer.state`, `waitingS`, `hudText`, `code`) | `calls[].raw` / `reply`: **add the answer time and code; fold runs** |
| inventory | `inventory[]` (`icon`, `count`) | `inv` |

---

## 10. What changes from the current renderer

1. **Frame.**
   - The 38 px header becomes the 36 px stats strip, with the possession rule.
   - The THINKING band becomes the fitted why/plan band, or the one-line no-why.
   - The 560 px trace and state columns become NOW (600) and body (424) on the 12-column grid.
   - The goal moves to its own full-width band.
   - Inventory moves to a hotbar on the video, and y and place move into the stats strip.
2. **Status words dropped.** "Waiting for Muse's next move · 0:40" and similar lines are replaced by facts: the NOW
   strap (RUNNING 4:41 or LAST / DONE IN) and the LATEST row (get_state ×5 since 12:14, waiting 0:40). No sentence
   speaks for Muse.
3. **Steps** show the call's arguments exactly as sent (`collect {"block":"obsidian","n":14}`), not the paraphrase
   "collect obsidian 14". Done and queued rows drop to 15 px, so the running step is the only 18 px row.
4. **Body colour.** Blue `#7cc4ff` becomes amber `#efa443`. The body's sub-step and its progress bar are amber with a
   `BODY` tag. Gold `#ffd164` goes; the toast becomes a flat dark lower-third with white text.
5. **Labels.** The 13 px caps with a coloured square become 10 px caps in the speaker's colour, with meta in Mono 11 at
   the right and a hairline under. One header style everywhere; the NOW block is the only solid element.
6. **RAW.**
   - Before: 13 px in the 560 px trace column, a "> tool" prompt, no times, answers cut to "…" after about 20
     characters.
   - After: full width at 13/18, with a time column, the fold chip with its range and latest answer, every visible
     answer kept, token-aware wrapping, the line allocation order, zebra rows, the newest entry highlighted, and an
     "N older below (range)" header.
7. **Advice.** Gist only becomes gist + full text + age (stale in bodyHi) + a verdict tied to that advice.
8. **Events.** Body only becomes body, world and server, with tags and game times.
9. **Caller name** comes from the MCP client, so the smoke test shows `TEST SCRIPT`.
10. **The milestone toast** stays a 6 s overlay (unchanged behaviour), restyled like the new-goal toast.

---

## 11. Judge issues fixed, and grafts

**Fixed in broadcast:**

1. The boxed speaker tab is replaced by a quoted why with one meta line; it no longer leaves a dead violet block.
2. Step labels are smaller than the why (18 vs 22), and queued and done steps are 15 px rows.
3. No tracker for a single step, so "0/1 steps" no longer disagrees with the fill.
4. RAW wraps at JSON separators: "diamond_pickax|e" is gone.
5. The BEFORE icon strip becomes words: "Nether and back 6/12 next was Water bucket".
6. BODY · WORLD events now show in nowhy (judges 1-3).
7. The RAW header legend is terse.
8. The NEW chip is outlined; it is no longer a white web tag.
9. RAW is 13/18 (was 12/16), with brighter keys.
10. The 458x32 RAW hole is filled: the running call carries its interim answer.
11. Long shows 5 RAW entries (was 4).
12. Advice cuts at words, and long shows the full advice.
13. The running and waiting states and the sub-step are no longer violet: neutral and amber.
14. Fresh-muse's right column leaves 21 px (was 80 px).
15. One header language.
16. The two clocks are told apart (phase first, a smaller world clock).

**Grafts:**

| from | what |
| --- | --- |
| editorial | the hanging-quote why; a progress underline on the next goal cell |
| rawfirst | balanced why lines; the full-sentence no-why; the why meta with age; "N older below (range)"; zebra rows; verdict wording |
| mission | the `×N` fold chip (neutral, not gold); the highlighted newest RAW entry; the segmented counted bar; "next was …" for the previous goal; the QA overlay (`?qa=1`) |

**Tried and dropped:**

- Dotted leaders in the milestone grid. They appeared in only 2 of 12 cells, which looked inconsistent.
- Gold accents. One accent system is kept: violet and amber.

---

## 12. Checks run and known limits

**Checks.**

- **QA** (`window.HUD_QA`, `?qa=1`) checks every drawn text for overlaps (> 1 px), for leaving the canvas, and for
  crossing its column. It caught a real overlap during the work (the filler rows' times). The final has zero problems
  in nowhy, long, fresh and fresh-muse.
- **Empty space** (`work/holes.py`): 48 / 52 / 40 px, with every remaining square a ragged line end or the why/plan
  gutter (section 2).
- **Edge cases**:
  - `long-max`: the why at 3 lines x 22 px, the plan 6 lines at 14 px uncut, RAW 6 lines;
  - `long-noplan`: the earlier whys fill the plan side, with no duplicates in the column module;
  - `nowhy-words`: the plain-words goal band;
  - `fresh-muse`: 3 server-added rows, a hollow tracker, wrapped events.

**Known limits.**

- `nowhy-empty` (no advice and no events at all, a made-up case) leaves about 70 px under "None given to Muse yet".
  Real games always log the care policy at 0:02, so the right column has content.
- The plain-words goal band shows only the words, with the note at the right, so its middle stays open.
- Mock-up data: `long` is the made-up sample, `fresh` was driven by our smoke test (hence TEST SCRIPT), and every RAW
  answer in the data is rebuilt; production shows the logged text.
