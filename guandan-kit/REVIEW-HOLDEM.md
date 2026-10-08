# Hold'em review log

Each round reviews the Hold'em build (`events/holdem-dealer`, `events/static/holdem*.js|css`, `games-account.js`,
`events/account-link.html`) through strict lenses, then a fixer fixes every high and medium finding (and the cheap
lows), adds a test for each engine or rules fix, re-shoots the affected UI states and re-runs the whole verification.

Lenses: cheating and chip creation, poker rules (TDA / real NLHE), account security, multiplayer robustness and DoS,
hidden information and rate limits, deployment; poker layout, Guandan fidelity (SPEC §3, HOLDEM-UI), polish,
visual correctness.

How to rerun the verification (from the repo root; see `guandan-kit/harness/holdem/README.md` for the details):
- `cd events/holdem-dealer && npm test` (unit, invariants over 20,000+ hands, service, WebSocket protocol).
- `cd guandan-kit/harness/holdem && python3 e2e.py` (every multi-player scenario against the real local dealer).
- `python3 shots_live.py [desk hd ifr phone portrait] --lang=zh|en|both --par=2` (29 states per viewport; shots go to
  `/tmp/holdem-shots`, never committed).
- Guandan regression: `cd guandan-kit/harness && python3 play.py desk 1 && python3 mustkeep.py`.

## Round 1
Two reviewer lists (their ids overlapped, so they are prefixed here): **S** = service, rules and security (S1-S13 =
their F1-F13), **U** = UI (U1-U20 = their F1-F20). 33 findings: 9 high, 12 medium, 12 low. Every
high and medium is fixed, every low is fixed or answered.

| id | lens | sev | title | outcome |
| --- | --- | --- | --- | --- |
| S1 | cheating / chip creation | high | Host removes a bot mid-hand (even in an exposed run-out) and wins uncontested | fixed in 9a8cb89: a bot in a live hand is marked leaving, plays the hand out and is removed at hand end; a host op never folds a seat (test: "a host op never decides a hand") |
| S2 | cheating | high | Host dissolves a live hand after seeing the run-out, full refund | fixed in 9a8cb89: `dissolve` during a live hand sets `dissolving`; the hand is played out and recorded, the table closes at the next hand boundary (tests: table + ws) |
| S3 | poker rules | high | Standing up takes back an uncalled bet | fixed in 9a8cb89: `_returnUncalled` returns only to a live top bettor; a folded seat forfeits its bets, the excess stays in the last pot; DESIGN 7 / 8.1 reworded (test: "the leaver's raise is forfeit and stays in the pot") |
| S4 | poker rules | medium | Standing during an all-in run-out folds a hand with no decisions left | fixed in 9a8cb89: once betting is over (run-out, or no one left who can bet) a leaver is not folded and is paid at hand end (test: "standing in a run-out does not fold") |
| S5 | account security | medium | Email-link merge hands the link's starter a token for the victim's saved account | fixed in 5d3ab4e: `/v1/email/start` returns a 4-digit code shown only on the asking device; a merge into an existing saved account needs it on `account-link.html` (`need_code`, `bad_code`, 5 wrong codes drop the link), which says another device is being signed in; no code, no merge, no token (test: email-link "no merge and no token without the code") |
| S6 | robustness / DoS | medium | A running table with one gone human never closes | fixed in 5d3ab4e: the rooms sweep also stands up a human gone 10 minutes when no hand is live (running table that cannot deal), so the chips return and the idle close runs (rooms test) |
| S7 | chip creation / leaderboard | medium | Unlimited refills plus chip dumping inflate a main account's net | fixed in 5d3ab4e: refills at most once per 24 h per account and 5 per day per network (`refill_later`, client toasts); DESIGN 7 reworded (refills never lift the refilled account; dumping is slowed, not stopped). Ranking on net against distinct opponents is left as a follow-up (accounts test) |
| S8 | poker rules | medium | Mid-hand top-up checked against the reduced stack | fixed in 9a8cb89: checked against the stack the hand began with, and cut at the max buy-in at hand end (`topup_back` settlement for the rest) (test) |
| S9 | poker rules | low | Blind dodging three-handed; a player posts the BB twice going heads-up | fixed in 9a8cb89: heads-up, the big blind moves on from last hand's (`lastBB`); only brand-new seats skip the wait at a heads-up table, a player back from sitting out is dealt in on the big blind (test; the old heads-up expectation updated) |
| S10 | poker rules | low | A postBB player lands in the SB and posts only the SB | fixed in 9a8cb89: in the small blind it posts the SB live plus the rest of a BB dead (`hand.dead`, counted in the pot by the view and the client; invariants include it) (test) |
| S11 | timers | low | A restart refunds the time bank in use | fixed in 9a8cb89 + 5d3ab4e: `fromJSON` charges the bank used up to the saved clock; `rooms.stop()` saves the clock at the stop time (test) |
| S12 | deployment | low | Production does not require TRUST_PROXY | fixed in 5d3ab4e: NODE_ENV=production refuses to start without an explicit TRUST_PROXY (config test, README) |
| S13 | rate limits | low | Table codes brute-forceable over `watch` | fixed in 5d3ab4e: more than 30 misses a minute per account closes the socket (1008 `too_many_misses`); codes stay 5 characters (rooms test) |
| U1 | poker layout | high | Portrait 9-max side plates cover the board | fixed in b2a4fe3: portrait angle sets keep every side seat ~30 degrees off the board row (2-9 seats) on the taller felt, plus a board-collision pass in `geometry()` |
| U2 | poker layout | high | Winner's shown cards and the D disc on the board | fixed in b2a4fe3: portrait side seats show their cards over their own avatar; the D disc's board check (already there) now never meets a side seat on the board row |
| U3 | Guandan fidelity | high | Big-pot burst rings the word and flashes white over the board | fixed in b2a4fe3: only quads and better; rays and sparks only (no sweep, ring or core), ~half the board wide, in a layer under the board, centred on the word; a big pot shows through a 5-chip flight. Shot: `burst` (animation frozen 300 ms in) |
| U4 | poker layout | high | Portrait table wastes the height | fixed in b2a4fe3: felt from y 190 (under the HUD) to just above my seat at h-250; side margin 72; the raise panel overlays the lower felt and hides my avatar and D disc while open |
| U5 | Guandan fidelity | high | White blob under the robot face | fixed in b2a4fe3: robots are a head only in seats, room plates and 上一手, nudged down 7% |
| U6 | polish | high | Dimmed cards are translucent ghosts | fixed in b2a4fe3: `filter: brightness(.55) saturate(.6)`, opaque (table and popups); the winning five keep their lift |
| U7 | polish | medium | Raise presets repeat amounts, two light up | fixed in b2a4fe3 (+ harness d493334): a fraction equal to the min, the max or a bigger fraction is disabled; only the chosen preset id is lit |
| U8 | polish | medium | Stale labels and 全下 plates after the hand | fixed in b2a4fe3: at a decided hand every label but a muck is cleared; 全下 shows only while the hand is live and the stack is 0 |
| U9 | polish | medium | A seat's clock covers its own card backs | fixed in b2a4fe3 + 9516753: side seats' clocks sit past the backs (their bets moved in), top seats' left of the avatar; my portrait clock rides my first card's corner (clear of the 9-max neighbour's backs and of the raise panel) |
| U10 | correctness-visual | medium | 亮牌 tags with no cards after standing up at a showdown | fixed in b2a4fe3 (no 亮牌 label at a decided hand, the face-up cards say it). The cards were there: the view had `shown`; the shot caught the first frames of their turn-over (scaleX 0) while the label had popped (the pot pill, which fades 400 ms into a showdown, was still up) |
| U11 | Guandan fidelity | medium | Ranking empty state is a bare web page; 0 in green | fixed in b2a4fe3 + c5baaf1 + 23e89ca: Guandan's framed records panel; empty: my row under the header, then the three places on their steps (the game's rank shields and default faces) with one line; the panel ends under it; 0 in neutral ink |
| U12 | Guandan fidelity | medium | Room settings: 座位 not justified, rows do not fill | fixed in b2a4fe3: every two-character key justified, the rows share the panel height; 买入 marked read-only in HOLDEM-UI §2 (c5baaf1) |
| U13 | polish | medium | 上一手 names only the winners' hands | fixed in c5baaf1: `last.hands` (each shown hand's best five, from its own cards and the board) labels every row (views leak test checks it) |
| U14 | Guandan fidelity | low | Pre-action toggles look like checkboxes, wrong order | fixed in b2a4fe3: Guandan pills (off grey, on blue) with a round tick disc; order 过牌/弃牌 · 跟任何注 · 过牌/跟注 |
| U15 | polish | low | Winnings collide with avatars at top seats | fixed in b2a4fe3: the chips fly to the seat's bet slot and the +amount stays there |
| U16 | polish | low | Empty seats as dashed rings; reconnect pill on a seat | fixed in b2a4fe3: empty seats hide while I am seated; 重新连接中… sits over the middle of the felt |
| U17 | poker layout | low | Landscape hero cluster off the table | fixed in b2a4fe3 + 23e89ca: on tall stages (1280 x 800) my avatar sits on the bottom rail, my cards on the felt; the board keeps its place |
| U18 | polish | low | Email popup stacked over the 账号 popup, toast over it | fixed in c5baaf1: the account popup closes first; no toast while the email popup shows the same news |
| U19 | polish | low | Buy-in presets never lit; 70 BB middle preset | fixed in c5baaf1: the matching preset is lit; middle preset 100 BB, or 50 / 25 BB when 100 BB is not strictly between |
| U20 | Guandan fidelity | low | Half-width ？ and letter-spaced PICASSO LAB | wordmark fixed in 5d3ab4e (letter-spacing 0). The ？ is rejected: `games-account.js` already uses the full-width U+FF1F (继续以 X 的身份？); the screenshot's font draws it narrow |

Verification (tree at 9516753):
- `npm test`: 116 tests, 115 pass, 0 fail, 1 skipped (the slow full evaluator sweep, `npm run test:slow`). New tests:
  host ops never decide a hand, run-out leaver plays on, forfeit leaver's raise, top-up base and cap, blind dodging,
  dead small-blind post, restart keeps the used bank, refill limits, email-link code, running-table sweep, code
  guessing, TRUST_PROXY in production, `last.hands` named.
- `python3 e2e.py`: **ALL PASS, 110 checks, 0 failures** in 8 scenarios (checker 8, heads 14, six 12, nine 6, sidepots 14,
  timeout 15, restart 21, accounts 20). The run before the last harness fix failed one check (six: "the others see Cy
  fold at once"): Cy was all in when he left, and an all-in or run-out leaver now correctly plays the hand out; the
  check now waits for a moment where Cy still has a decision.
- `python3 shots_live.py`: portrait, desk, ifr (zh), hd, phone, portrait (en), desk, hd (zh again after the last layout
  tweaks): 290 shots, no failed step, no console error. Looked at: portrait nine / raise / river / showdown / sidepots /
  quads / last / board / room / spectator, desk nine / raise / sidepots / burst / room / buy-in / sit-out, ifr raise,
  hd sidepots (en), phone raise / nine; e2e's timeout (clock, pre-action pills) and email-done shots.
- Guandan: `python3 play.py desk 1`: round 1 played to the end, no console errors (long tasks 50-124 ms).
  `python3 mustkeep.py`: 113 pass, 0 failed. (A first run alongside e2e missed one timing check, "portrait:
  ?from=guandan plays the restore fade", a 120 ms class check on events.html, which this round does not touch; alone
  it passes.)

Left open: ranking on net against distinct opponents (S7, the refill limit only slows chip dumping); the landscape
hero plate still sits right beside the 弃牌 pill at 1280 x 800 (as before this round, now 2 px apart).
