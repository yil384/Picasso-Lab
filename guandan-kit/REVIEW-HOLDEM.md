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

## Round 2
One reviewer list over the tree at 239f0ff (R2-1 to R2-16): 3 medium rules / cheating / account findings, 1 medium
UI finding, 12 lows (remnants of round 1 and new ones from its fixes). Every medium and every low is fixed; two
suggested sub-fixes are answered instead (R2-2, R2-10).

| id | lens | sev | title | outcome |
| --- | --- | --- | --- | --- |
| R2-1 | poker rules | medium | Dead big blind became a side pot only its poster could win; a loser recorded as winning | fixed in fa62f7c: dead money is kept out of the side-pot levels (`seat.dead`) and added to the main pot, which every live seat can win (test: "a dead big blind goes to the main pot: the poster calls down and loses", fails without the fix: 2 pots) |
| R2-2 | cheating / chip creation | medium | Fresh guest accounts are a free chip supply for dumping into one ranked account | fixed in 4232507: the ranking sorts and shows `rnet`, the net won from established accounts only. Each hand record carries its hand id and `gain` (all chips won, bots included); a winner's ranked gain is cut by the share fresh accounts lost (younger than 3 days or under 50 hands; bots count as established). `holdem.net` keeps the plain sum (test: "chips lost by fresh accounts never count"). Not done: holding back a fresh guest's starting chips or charging them to the network's refill budget; once they cannot reach the ranking they buy nothing, and campus NAT would have made new players start with nothing |
| R2-3 | account security | medium | First save binds the email to the link starter's account with no code | fixed in 1a6c4fe: every completion that changes an account (first save and merge) needs the device code; `need_code` / `bad_code` carry `merge` so `account-link.html` says what confirming does; the asking browser stores `{ lid, code }` (`picasso.games.linkCode`) and the link page sends it itself, so only a link opened elsewhere asks (tests: email-link "the address is not bound without the code", e2e accounts "opened on another device the link asks for the code and binds nothing without it") |
| R2-4 | UI fidelity | medium | Portrait: shown cards cover the side seat's avatar, the 全下 pill sits on card indices | fixed in 52dd71e: portrait side seats show their cards beside and above the avatar toward the felt (where the backs were, clear of their own bet slot); a low side seat (its cards there would meet mine) holds them up and in; the button goes under a showing side seat's cards, under a low seat's plate end; no action label over face-up cards (`has-shown`), and no 全下 label at all (R2-15). Re-shot portrait allin / showdown / sidepots / split / quads / burst (zh, en) and a new nine-seat face-up probe (`nine-shown`) |
| R2-5 | poker rules | low | Stand and re-sit dodges the big blind three-handed; someone posts it twice | fixed in 3214fe1: a seat that leaves after being dealt in is remembered by account for 15 minutes (`recent`); sitting back down inside that window makes a `returning` seat that waits for the big blind like one back from sitting out (tests: three seeds of the stand-and-re-sit dodge, fail without the fix; a brand-new or long-gone player is still dealt in at once heads-up) |
| R2-6 | multiplayer robustness | low | After a crash the time bank in use is refunded | fixed in ed3692e: `rooms.stop()` calls `table.markStopped(now)`, which saves the stop time; a restore without it (a crash) charges the running bank up to the restore time, at most all of it (tests: clean stop charges up to the stop, a crash 7 s later charges 7 s, 10 minutes later the whole bank) |
| R2-7 | hidden information / rate limits | low | Code-guessing limit per account only; free guests get around it | fixed in 9bbb505: misses also count per network (ipKey): over 60 in a minute closes the socket, 600 in a day shuts that network out of code lookups (every `watch` refused) until the day is over; about a 0.4 % chance a day to find a given private table (rooms test with a new guest every 20 guesses) |
| R2-8 | UI fidelity | low | English hand names in 上一手 wrap mid-phrase on a phone | fixed in 52dd71e: each row is a grid; the hand's name runs on its own line under the name and the cards, one line, ellipsis if ever needed (re-shot portrait last, zh and en) |
| R2-9 | UI fidelity | low | Portrait: my clock on my card face; an opponent's clock touches its backs | fixed in 52dd71e: my portrait clock sits on the felt above my first card's corner (clear of the 9-max bottom seats, the bets and the open raise panel); portrait side seats' clocks sit 104 px out, past their backs (re-shot raise, nine, reconnect) |
| R2-10 | UI fidelity | low | An action label on a bot seat sits on its AI badge | fixed in 52dd71e: while a label shows, the seat's AI / 我 badge fades out (the label takes its place for 1.5 s). Stacking the label higher was not taken: top seats would push it into the HUD (re-shot desk-en, hd, phone nine) |
| R2-11 | UI fidelity | low | Empty ranking fills half a phone; my 0 / 0 / - row above "nobody ranked" | fixed in 52dd71e: on a phone the empty panel takes the screen with the podium in the middle and a 去打一手 / Play a hand button (from the lobby: closes the page and starts a practice table); my own row shows only once I have played (re-shot board) |
| R2-12 | UI fidelity | low | Ghost 盖牌 / Muck pills over dimmed seats | fixed in 52dd71e: no muck label (the dimmed seat without cards says it) and no label at all once a hand is decided (re-shot showdown, burst) |
| R2-13 | UI fidelity | low | Portrait split: a +20 pill runs into the hand title | fixed in 52dd71e: on the portrait felt the title scales down (from layout sizes, anchored at its foot) until it clears every bet slot beside it (re-shot split zh / en, sidepots) |
| R2-14 | UI fidelity | low | 重新连接中… pill over the board cards | fixed in 52dd71e: the pill sits in the HUD row, top centre (re-shot reconnect) |
| R2-15 | UI fidelity | low | 全下 2,040 stays after the uncalled part came back; EN tag says "Next hand"; two all-in markers | fixed in 52dd71e: an all-in shows only as the plate's 全下 tag (it pops in), so no stale amount; a seat's unchanged last action is not re-announced on a new street (it re-popped through every run-out street); the EN waiting tag reads "Waiting" |
| R2-16 | UI fidelity | low | 1280 x 720/800: my plate touches the 弃牌 pill | fixed in 52dd71e: with the action pills up, my seat steps left until its plate is 16 px clear of them (re-shot hd raise / turn) |

Also in this round: `events/holdem-dealer/.gitignore` ignores `.env` (85456bd), so a deploy checkout cannot commit
its secrets; `shots_live.py` gained the `nine-shown` probe (0df4608, 30 shots per run).

Verification (tree at 85456bd):
- `npm test`: 125 tests, 124 pass, 0 fail, 1 skipped (the slow sweep); `npm run test:slow`: 1 pass. New tests: dead
  big blind to the main pot, ranking ignores fresh-account losses, first save needs the code, crash charges the
  running bank, stand-and-re-sit dodge (3 seeds) and the rejoin window, per-network code guessing.
- `python3 e2e.py`: **ALL PASS, 111 checks, 0 failures** in 8 scenarios (checker 8, heads 14, six 12, nine 6,
  sidepots 14, timeout 15, restart 21, accounts 21; accounts gained the other-device code check).
- `python3 shots_live.py`: all five viewports in both languages (290 shots), then portrait in both languages (60,
  with `nine-shown`) after the card-height tweak and portrait zh (30) after the button tweak: 380 shots, no failed
  step, no console error.
  Looked at: portrait allin / sidepots / showdown / split / raise / nine / nine-shown / reconnect / last / board /
  burst, desk allin / showdown / nine (en), hd raise / turn / nine, phone allin / nine, ifr waiting (en).
- Guandan: `python3 play.py desk 1`: round 1 to the end, no console error, no long task over 50 ms.
  `python3 mustkeep.py`: 113 pass, 0 failed (two runs). The first run missed one timing check ("phone/room: lands
  on events.html?from=guandan", an 11 s wait for the return film's navigation; this round does not touch
  guandan.html), as in round 1.

Left open: nothing from this list. Still untested against the real thing: Google's live JWKs and a real Firebase
email link (unit and e2e tests use a locally signed key set), and how the per-network limits feel behind a campus NAT.

## Round 3
A third review (rules, security, ops and UI lenses, each finding verified against the code and, where it mattered,
on picasso read-only) found 25 defects: 4 high, 11 medium, 10 low (severities as verified). All are fixed except
where noted; the dealer tests, the browser scenarios, the layout checks and the Guandan regression were run again.

| id | lens | sev | title | outcome |
| --- | --- | --- | --- | --- |
| R3-1 | security | high | A same-network suggestion handed the clicker a token for someone else's guest account (its seat, hole cards and turn, bankroll, name, email binding) | fixed: `/v1/claim` renames the caller's own account and never issues a token for another; suggestions list each name once; prompt reads 继续使用昵称「X」？; privacy note says a click only takes the name (tests: accounts claims, a WebSocket claimer never gets the seat, cards or turn; e2e accounts) |
| R3-2 | security | medium | `TRUST_PROXY=1` believed `X-Forwarded-For` from any peer: a host user could pose as any network (claims, limits) | fixed: `TRUST_PROXY` is a list of addresses, CIDR ranges or host names (re-resolved every 30 s; `fras-caddy-1` in production), `1` refused in production; the deploy joins Caddy's Docker network with no published port (tests: config, an untrusted peer is keyed by its socket address and cannot escape the account limit) |
| R3-3 | security | medium | `tables.json` held the deck and every hole card (readable by the ~40 docker-group users); secrets visible in `docker inspect` | fixed: the saved form leaves out deck, burns and hole cards; a restore calls the live hand off (chips back, nothing recorded, same button, pages told); secrets come from files (`GAMES_SECRET_FILE`, `IP_SALT_FILE`, `ops/secrets.sh`). Host root / docker can still read memory: said in README and the report (tests: table, views fuzz, restart graceful and kill -9, e2e restart, restart.py) |
| R3-4 | ops | medium | The runbook could not work on picasso: Caddy in a container (127.0.0.1 upstream = 502), no host `caddy`, `/srv` not writable, needless DNS step | fixed: compose joins `fras_default` (alias `holdem-dealer`), Caddy block `reverse_proxy holdem-dealer:8787`, `docker exec fras-caddy-1 caddy validate/reload`, deploy to `~/workspace/holdem-dealer`, DNS step dropped, WebSocket 101 check added; README, DESIGN 12, report 4a/4b, compose and snippet together (the block was validated and run locally with Caddy 2.11.2: health 200, WebSocket 101) |
| R3-5 | security | medium | Caddy's per-site error logger still wrote client IPs; world-readable backups outliving 30 days; salt in `docker inspect` | fixed: `handle_errors` answers the 502 itself, so it is logged at debug only (checked with Caddy 2.11.2: no `remote_ip` line, also when the upstream dies mid-socket); backups leave the IP memory out and go to `~/backups/holdem` (700 / 600); salt is a file; the note says a server admin can reverse the hash. FRAS Caddy log rotation is the owner's call (its own compose) |
| R3-6 | security | medium | The ranking listed brand-new accounts: throwaway guests free-rolled against bots into the top places; a merge carried a fresh guest's gains | fixed: only established accounts (3 days, 50 hands) rank, fresh ones see their own row unranked with the rule; a merge carries a fresh guest's losses only (tests: accounts) |
| R3-7 | security | medium | One person could trigger the network-wide code ban and lock seated players out of their own tables | fixed: a player seated at the table, its host or creator, or anyone who watched it before always gets back in; the ban still stops strangers (test: rooms) |
| R3-8 | robustness | medium | 9 free accounts could fill the 200-table cap for hours (host hand-off reset the 3-table limit; seated tables never closed) | fixed: an account creates or hosts at most 3 (creators keep counting), sits at most at 4, a network opens at most 30, an unstarted table closes after 30 minutes (buy-ins back) (tests: rooms) |
| R3-9 | ui | medium | Portrait 7-9 seats: corner bets sat next to the neighbour seat | fixed: bets are placed from the seat's final position, at most 160 / 200 design px from it, pulled in while another avatar is nearer, and step aside from my clock (`layout.py`: every seat count 2-9, portrait, phone, desk, hd) |
| R3-10 | ui | medium | Betting controls 8-30 CSS px on phones (presets, steps, slider, pre-actions) | fixed: sized from the stage scale (at least 44 CSS px, wider gaps), the ±20 label grows with them (`layout.py` touch checks; the old build fails them) |
| R3-11 | ops | medium | The backup recipe could not run from cron (%), wrote root-owned 0644 files nobody could prune | fixed: `ops/backup.sh` (no % in the crontab line, 700 folder, 600 files owned by the user, 14 days, a log) with `src/backup.js` (tests: backup) |
| R3-12 | ops | medium | Health could not see a failing disk; nothing acted on an unhealthy container | fixed: 503 `persist_failing` after 10 s unsaved, failures logged once a minute, `src/health.js` for the healthcheck, `ops/watchdog.sh` restarts a hung service and never one that cannot save (tests: http) |
| R3-13 | ops | low | No rate-limit refusal was ever logged; container logs unrotated | fixed: every refusal counted per limit, one `rate limited` line a minute (no keys), totals in `/v1/health`; compose rotates logs (tests: config, http) |
| R3-14 | rules | low | A seat standing up refunded the actor's running time bank | fixed: the bank is charged whenever the turn moves on (`_chargeBank`) (test: table, both the hand-ending and street-closing stand-ups) |
| R3-15 | rules | low | A 1-chip rebuy was accepted | fixed: a rebuy is at least the minimum buy-in, a top-up at least a big blind or exactly the room left (test: table) |
| R3-16 | rules | low | Dropping to two ready seats with a waiting big blind: SB posted twice; a new seat dealt in at once at a table that was three-handed | fixed: a new seat is dealt in at once only when the last hand was heads-up; when last hand's big blind has gone, the small blind is dead (the button stays, which keeps the big blinds in turn; moving it skipped a big blind in simulation) (test: table) |
| R3-17 | ops | low | Backups could mix two moments; the `.bak` advice mixed them too | fixed: `src/backup.js` re-reads until no flush landed in between and restores both files as one batch; the advice is "both files from one backup" (test: backup) |
| R3-18 | ops | low | A Caddy reload dropped every table socket mid-hand | fixed: `stream_close_delay 5m` in the block |
| R3-19 | security | low | (duplicate of R3-2 from the ops lens) | fixed with R3-2 |
| R3-20 | ui | low | The button seat's clock covered its own dealer button | fixed: the button steps below (or above) the clock box (`layout.py` dealer check over several hands per seat count) |
| R3-21 | ui | low | Portrait presets ran all-in to min against a min-to-max slider | fixed: the portrait row reads 最小 · ½ 池 · ⅔ 池 · 1 池 · 全下 |
| R3-22 | ui | low | Empty seats vanished once seated: opponents bunched on one side | fixed: a dim 空位 disc (no dashed ring, no gold, not a control) keeps the table's shape |
| R3-23 | ui | low | Bots numbered (狐狸 2); Stone and Sage shared the S mark | fixed: three names per personality, each with its own first letter and character (石头 橡树 磐石 / 烈火 猛虎 雄鹰 / 狐狸 山猫 蝮蛇 / 老将 公爵 灰狼), never repeated at a table (test: table) |
| R3-24 | ui | low | Hold'em lobby showed the Guandan rank badge and Guandan's podium | fixed: the badge and the ranking tile read the Hold'em ranking (fetched in the background, applied in place); with nobody ranked the tile shows its empty steps |
| R3-25 | ui | low | The flop showed two open outlines over the print for half a second | fixed: the open slots and the end of the print wait for the first flop card's turn |

Verification (tree at the round-3 commits on `cloud/guandan-holdem`):
- `npm test`: 144 tests, 143 pass, 0 fail, 1 skipped (the slow sweep); `npm run test:slow`: 1 pass.
- `python3 e2e.py`: **ALL PASS, 118 checks, 0 failures** (checker 8, heads 14, six 12, nine 6, sidepots 14,
  timeout 15, restart 27, accounts 22; restart now checks the called-off hand, the notice and that every chip is back;
  accounts checks that a claim keeps the caller's own account).
- `python3 layout.py`: **ALL PASS, 110 checks** over portrait, phone, desk and hd at 2-9 seats. Run against the
  pre-round-3 client it fails the bets, touch and dealer checks (portrait 9: four bets nearer a neighbour; presets
  25-33 CSS px, steps 24 px; the button under its seat's clock in 2 of 8 hands).
- `python3 shots_live.py --lang=both --par=3`: 10 runs, 300 shots, no failed step, no console error. Looked at:
  desk / hd / phone / portrait preflop (empty seats), raise panels (phone en, portrait zh), the flop in an all-in run-out
  (no open outlines before the cards), sidepots and nine-shown (portrait), the lobby (Hold'em badge and empty podium)
  and the ranking page; plus `layout.py` shots of every seat count with every bet filled in and every clock shown.
- `python3 restart.py phone`: ALL PASS. Guandan: `python3 play.py desk 1` (round 1 to the end, no console error, no
  long task over 50 ms) and `python3 mustkeep.py` (113 pass, 0 failed).
- Caddy 2.11.2 (the version on picasso), locally: the block adapts; with the dealer behind it `/v1/health` is 200 and
  `/v1/ws` answers 101; with the dealer down the 502 is answered by `handle_errors` and no line carries a client IP.

Not done here: the deploy itself (picasso was only read: the Caddy container's networks and DNS names, the Caddyfile's
layout, home folder modes). Still untested against the real thing: Google's live JWKs and a real email link, and the
per-network limits behind a campus NAT (now visible in the logs and `/v1/health`).
