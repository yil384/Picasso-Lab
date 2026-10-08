# Hold'em browser harness

Playwright (Python) checks for the Hold'em part of `events/guandan.html` and the shared accounts layer, against the
**real dealer service** (`events/holdem-dealer`). The page is served from this checkout as
`https://yil384.github.io/Picasso-Lab/**` (routed by `gdh.py`), Firebase RTDB is stubbed in memory, Firebase Auth by
`../fb-stub-auth.js`, and every request to `*firebaseio.com*` or `*supabase.co*` is aborted. Nothing here touches a
production service. Screenshots go to `HD_SHOTS` (default `/tmp/holdem-shots`); never commit them.

The page finds the service through `window.__PICASSO_GAMES_ORIGIN`, set by an init script
(`http://127.0.0.1:8787`, or the port a script picks). The dealer runs as a child process:
`PORT=8787 DATA_DIR=<temp> ALLOWED_ORIGINS=https://yil384.github.io BOT_THINK_SCALE=0.2 HOLDEM_TEST_HOOKS=1 node src/server.js`.

`HOLDEM_TEST_HOOKS=1` adds loopback-only test endpoints (`events/holdem-dealer/src/test-hooks.js`; the service refuses
the flag with `NODE_ENV=production`): `GET /__test/hands` (what every hand really dealt, the ground truth for the
frame checker), `POST /__test/deck` (rig the next hand of a table), `POST /__test/hold-writes` (keep changes off the
disk for a while, the worst case of a kill -9). `FIREBASE_JWKS_URL` (hooks only) points the dealer's Firebase key
fetcher at a local JWK set, so the email link completes with a locally signed ID token. `RESEND_API_URL` (hooks only)
sends the dealer's own sign-in emails (`EMAIL_SENDER=resend`) to `FakeResend` on loopback, which keeps them (the link
is read from there) and never reaches the network; its key is a made-up one in a temp file.

Requirements: `cd events/holdem-dealer && npm ci` (and `npm test` green), Python 3 with `playwright` and
`cryptography`, Chromium for Playwright. Run everything from this folder.

## Files

| File | What it is |
| --- | --- |
| `live.py` | Library for the live suite: `Service` (the dealer as a child process: start, graceful stop, kill -9, restart on the same data, polls the dealt-cards record), `KeyServer` (local JWK set + RS256 signer), `FakeResend` (Resend's `POST /emails` on loopback: keeps every email, answers 200 or planned failures), `Player` (one browser context per person, records every WebSocket frame it receives, acts through real clicks / taps), decision policies, `check_frames` (the leak checker). |
| `hdh.py` | Library for the single-page scripts: `dealer()` (real by default, `HD_DEALER=fake` for the stand-in), `hsession()`. |
| `e2e.py` | **The multi-player suite** (below). |
| `shots_live.py` | Screenshots of every key state from real play (rigged decks), five viewports, ZH and EN. |
| `layout.py` | Table layout checks for every seat count 2-9 per viewport: each bet nearer its own seat than any other and clear of other seats and my clock, the dealer button never under the button seat's clock, betting controls at least 40 CSS px on phones. |
| `flows.py`, `restart.py`, `eggs.py`, `play.py` | Older single-page scripts, now against the real dealer. |
| `accounts.py` | Runs `e2e.py accounts`. |
| `prod.py` | The live suite against the **deployed** dealer (`https://poker.picasso-lab.com`): the games service is not stubbed or redirected, restarts run on picasso over ssh, and the frame checker works without a dealt-cards record (below). |
| `shots.py`, `fake-dealer.mjs` | Scripted stand-in dealer and its scene screenshots (kept for rare states only). |

## The multi-player suite: `python3 e2e.py [scenario ...]`

One browser, one context per player; phone contexts (`phone` 844×390, `portrait` 390×844) are `is_mobile` +
`has_touch` and tap. Each scenario starts its own dealer on a fresh data directory. Every scenario ends with two
checks over all of its pages:

- **frames**: every frame every page received (`page.on("websocket")` → `framereceived`), against the dealer's record
  of what it dealt: a page's own hole cards are exactly what its seat was dealt and go to that account only; another
  seat's cards appear only in `shown` when the rules expose them (showdown, all-in run-out, a voluntary show) and
  never for a folded or mucked hand, also in `last`; winners' best five only use shown cards; no card in any other
  message or field. A crash can re-deal a hand number with new cards, so the record keeps every version.
- **console**: zero console errors on every page. The only messages left out are Chrome's own failed-reconnect lines
  (`WebSocket connection to … failed`, `ERR_CONNECTION_REFUSED`) inside a window when the service was down on
  purpose, and, in `accounts`, Chrome's "Failed to load resource" lines for the three refusals the scenario provokes
  (a protected name 409, a bad token 401, a wrong email 409); both are counted in the summary.

| Scenario | Players | What it covers |
| --- | --- | --- |
| `checker` | none | The frame checker on synthetic frames: clean frames pass; seven planted leaks are each caught. |
| `heads` | Ann desk (host), Bo phone | 2-seat friends table from the lobby tile, seats set with the room stepper, join by invite link, buy-in popup; 10+ hands to the end with showdowns; Bo reloads mid-hand while waiting and again on his turn: same seat, hand and cards, URL kept, pills back; Ann switches the language at the table (☰) and back; both leave: 20,000 chips between them, records counted. |
| `six` | Ann desk (host), Bo portrait, Cy ifr + 3 AI | Host moves seats in the waiting room and stays host; AI 补位; 10+ hands; Cy leaves mid-hand through ☰ → 返回大厅 → confirm: lobby with a clean URL, the others see the fold, the seat empties after the hand, his stack is back in his bankroll to the chip. |
| `nine` | Ann hd (host), Bo phone, Cy portrait, Di desk + 5 AI | 9-seat table, 8+ hands with showdowns. |
| `sidepots` | Ann desk 2,000, Bo phone 1,400, Cy portrait 800 | Rigged deck, all three all in: main pot 2,400 to the short stack's aces, side pot 1,200 to the kings, 600 uncalled back; the pot pills show 主池 / 边池 1; stacks after; hand 2 busts two players: the rebuy popup on both pages, rebuy, dealt back in; 30,000 conserved across the bankrolls after leaving. |
| `timeout` | Ann desk (host), Tim phone (never acts) + 2 AI | 15 s from the room pills; Tim's clock counts down, then 时间银行 on his page and on Ann's; the bank runs out: auto check / fold logged as 超时, bank 0; the next timeout sits him out: 暂离中 · 回来 on his page, 暂离 on Ann's; 回来 → 等待大盲 · 立即补盲 → dealt into the next hand posting a blind. |
| `restart` | Ann desk, Bo portrait, Cy phone + 3 AI, a spectator (ifr) | Mid-hand with a human to act: graceful SIGTERM, kill -9 right after a human action, and kill -9 after 2.5 s of play held off the disk (`hold-writes`). Each time every page shows 重新连接中… with the pills off and reconnects; the hand in progress was called off on every page (its deck is never on disk), the players in it are told, every chip on the table is back on the seats, that hand never finishes anywhere, a new hand finishes on every page and all pages agree on the table (rev and seats). |
| `email` | four contexts + two email renders | The dealer in resend mode (`EMAIL_SENDER=resend`) against `FakeResend`. 账号 → 用邮箱保存: one email to Resend (path, key, `Idempotency-Key`, sender `Picasso Lab <noreply@picasso-lab.com>`, recipient, subject), the link `account-link.html?lid=&t=&lang=zh`, Chinese first; the sent screen names noreply@picasso-lab.com and says to look in spam; no `sendSignInLinkToEmail`, no firebase-auth.js. The email's HTML at 375 and 1280 px (no sideways scroll, one button and the raw link, card at most 520 px, no request; `email-<lang>-<vp>.jpg`). The link on another device: asks for the code (saving, not merging), the token gone from the address bar, no Firebase script; a wrong code binds nothing; a reload still holds the token. On the asking device: saved at once; the game picks it up by polling; the link again: expired or used. A phone in English saves with the same address: English email and screen; opened on the first device it is a merge and needs the phone's code; the phone ends up in the saved account. Resend down (502 twice: one retry, same key) and busy (429): clear messages, then sent. The dealer's log and data hold no address, key, token or link. |
| `accounts` | six contexts | A returning Guandan player's name goes into the IP memory; a fresh browser (no clientId, name or token) is asked "继续使用昵称「Zhuo」？" and stays its own guest until the click, after which it is still its own account (same token) under the name Zhuo, and Zhuo's account is untouched; 我是新玩家 keeps the new guest; a returning player and a reloaded fresh browser are never asked. Save with email: 账号 popup → 用邮箱保存 → the link (Firebase stub) → `account-link.html` with a token signed by another key (refused), for another email (refused), then a good one (done); the dealer fetched the keys from the local JWK set; the game page picks the saved account up by polling. A protected name (' yufei ') is reverted with a toast; a free name reaches the service. A finished Guandan round is posted once and the service ignores a repeat. |

Results of the final run: see the end of this file.

## Other scripts

| Command | Covers |
| --- | --- |
| `python3 shots_live.py [desk hd ifr phone portrait] [--lang=zh\|en\|both] [--par=2]` | 30 screenshots per viewport and language from real play: lobby, ranking, account popup, room (alone, seated, 9 seats), buy-in, every street on my turn, the raise panel, showdown, all-in run-out, side pots, busted rebuy, split (royal on the board), top-up, the quads burst (its animation frozen 300 ms in), quads, sit-out, last hand, menu, hand ranking, waiting for the big blind, spectator, reconnecting, heads-up, 9-max, 9-max with every opponent's cards face up (a DOM layout probe). Writes `live-<vp>-<lang>-<step>.jpg`. Parallel runs use their own dealer ports (8801+). |
| `python3 layout.py [portrait phone desk hd] [--seats=2-9] [--shots]` | Layout at every seat count (bets, dealer button vs clock, touch sizes of the raise panel and the pre-action pills). |
| `python3 flows.py [desk\|phone\|portrait]` | Offline lobby (no service), Guandan still deals, an invite link, a second player joining, card privacy, leaving. |
| `python3 restart.py [desk\|phone\|portrait]` | One page, the dealer killed and restarted on the same data mid-hand: the hand is called off (the page says so) and a new one is dealt. |
| `python3 eggs.py [desk\|hd\|ifr]` | The picasso hint and return film on the Hold'em lobby, room and table, keyboard shortcuts, BGM, table sounds. |
| `python3 play.py [vp] [hands] [practice\|room]` | One player plays hands through the UI (人机练习 or a room with AI 补位). |
| `python3 shots.py [vps] --lang=both` | The scripted stand-in's scenes (fake dealer), for states that are hard to reach in play. |

## The live suite: `python3 prod.py [scenario ...]`

Against the deployed service, so it adds guest accounts and tables there (about 16 accounts a full run; the
per-network limit is 30 an hour); after a run, restore the last clean backup on picasso (README "Backup and restore"
in `events/holdem-dealer`) to wipe them. Scenarios: `checker` (the truth-free checker catches 9 planted leaks),
`latency` (socket pings through Caddy, REST round trips), `heads` (2 humans, reloads mid-hand), `headsai` (1 human
against 1 AI), `six` (3 humans + 3 AI, a leaver), `sidepots` (2,000 / 1,400 / 800 all in, no rigged deck),
`restart` (graceful stop, SIGKILL of the container, node killed inside it and restarted by Docker), `stalls` (two
minutes of play with pings through Caddy and on loopback inside the container, to tell network delays from service
freezes). Without test hooks the frame checker accepts a card on a page only as the board, its own seat's hole
cards, or a seat's shown cards (showdown, all-in run-out, voluntary show, last hand), and across pages checks that a
seat's hole cards go to one account and never change, that a human seat's shown cards match what its owner was dealt,
that no card is in two places in one hand, and that folded hands are never shown. Env: `HD_PROD_ORIGIN`,
`HD_PROD_SSH` (default `picasso`), `HD_PROD_DIR`, `HD_STALL_SECS`.

Final run (2026-10-08, data on the root disk): **ALL PASS, 84 checks** (checker 10, latency 3, heads 13, headsai 5,
six 11, sidepots 9, restart 30, stalls 3); 2,506 frames on 16 pages; socket ping median 23 ms, action to state median
24 ms / p95 35 ms / max 203 ms; pages back 3.2-4.9 s after a restart; loopback ping max 1.5 ms during play.

Guandan regression (in `..`): `python3 play.py desk 2`, `python3 play.py phone 2`, `python3 mustkeep.py`.

## Results after the Resend sender (2026-10-08)

`python3 e2e.py`: **ALL PASS, 141 checks, 0 failures** (checker 8, heads 14, six 12, nine 6, sidepots 14, timeout 15,
restart 27, accounts 22, email 23; email: 6 requests to the fake Resend, 7 provoked refusals logged by Chrome, 0
console errors). Dealer `npm test` 158 tests, 157 pass, 1 skipped; `npm run test:slow` pass. Guandan: `../mustkeep.py`
113 pass; `../play.py desk 2` and `../play.py phone 2` no errors.

## Results of the final run (2026-10-08, review round 3)

`python3 e2e.py`: **ALL PASS, 118 checks, 0 failures** (checker 8, heads 14, six 12, nine 6, sidepots 14, timeout 15,
restart 27, accounts 22). `python3 layout.py`: **ALL PASS, 110 checks**. `python3 shots_live.py --lang=both --par=3`:
10 runs, 300 shots, no failed step, no console error. `python3 restart.py phone`: ALL PASS. Dealer: `npm test` 144
tests, 143 pass, 1 skipped; `npm run test:slow` pass. Guandan: `../play.py desk 1` no errors, no long tasks;
`../mustkeep.py` 113 pass.

## Results of the round-2 run (2026-10-08, this sandbox)


`python3 e2e.py` on commit 20b5c1f: **ALL PASS, 110 checks, 0 failures**, 11 minutes.

| Scenario | Checks | Hands played | Showdowns | Side pots | Run-outs | Frames checked (pages) | Console errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| checker | 8 | - | - | - | - | 7 planted leaks caught | - |
| heads | 14 | 10 | 10 | 0 | 0 | 302 (2) | 0 |
| six | 12 | 10 | 9 | 1 | 3 | 569 (3) | 0 |
| nine | 6 | 8 | 8 | 2 | 0 | 987 (4) | 0 |
| sidepots | 14 | 5 | 5 | 2 | 2 | 274 (3) | 0 |
| timeout | 15 | 5 | 4 | 0 | 0 | 186 (2) | 0 |
| restart | 21 | 9 | 9 | 3 | 3 | 865 (4) | 0 (36 refused reconnects while down, by design) |
| accounts | 20 | - | - | - | - | - | 0 (3 provoked refusals logged by Chrome, by design) |

From that run: heads ended 9,840 + 10,160 = 20,000; the leaver in `six` had 4,000 in the bankroll and 1,930 at the
table, and 5,930 after the hand; side pots 2,400 / 1,200 with stacks 600 / 1,200 / 2,400 after the hand and 30,000
conserved after leaving; every page back after a restart in 4.1 s (graceful), 3.8 s (kill -9), 4.1 s (kill -9 after
held writes: pages at rev 161-162, the restored table's first snapshots 156-162).

`python3 shots_live.py --lang=both --par=2` on 20b5c1f: 10 runs, 280 screenshots, no failed step, no console error.

While the tree went from 1ba3f60 to 386f09a (the two differ, and differ from 20b5c1f, only in where the dealer button
is placed): `flows.py desk` and `portrait`,
`restart.py desk` and `phone`, `eggs.py desk` and `ifr`: ALL PASS; `play.py desk 6 practice` (7 hands),
`play.py portrait 4 practice` (5 hands), `play.py phone 4 room` (5 hands): no console errors (long tasks 51-110 ms,
at the table's first layout). `../mustkeep.py`: 113 PASS, 0 FAIL.

Dealer (unchanged since 6b081ff): `npm test` 106 tests, 105 pass, 1 skipped (the slow one), 0 fail; `npm run
test:slow` pass. Guandan on 7ef2bf2: `../play.py desk 2` and `../play.py phone 2`, 2 rounds each, no errors, no long
tasks.
