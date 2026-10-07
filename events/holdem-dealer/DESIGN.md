# Picasso Lab games service: Texas Hold'em dealer + accounts — DESIGN

Status: design of record for `cloud/guandan-holdem`. Server code lives in `events/holdem-dealer/`, client code in
`events/guandan.html` + `events/static/holdem*.{js,css}` + `events/static/games-account.js` + `events/account-link.html`.
Production host: `https://poker.picasso-lab.com` (lab server, Docker behind Caddy). Nothing here is deployed by the
builders; the lead deploys (see `guandan-kit/HOLDEM_REPORT.md`).

## 1. Goals and non-goals

Goals
- No-Limit Texas Hold'em for 2–9 players inside the existing Guandan page (`events/guandan.html`): same lobby, same
  design system, same lab personalization (portraits, labmate face cards, BGM, the "picasso" return egg).
- Hidden information that is really hidden: no client can ever learn another player's hole cards, the deck, burn cards
  or a mucked hand — not from the network, not from devtools, not from any database.
- One identity layer for both games: guest first; optional IP-based *suggestion*; optional email-link "save"; existing
  Guandan players keep their local id and name.
- Play money only. Chips are virtual, cannot be bought, sold or transferred, and have no value.
- Survives reloads, flaky phones, and a restart of the service.

Non-goals
- Changing Guandan's rules, table behaviour or its Firebase schema (Guandan rooms stay in Firebase RTDB exactly as now).
- Real money, payments, chip transfers between players, tournaments (cash tables only), chat, anti-collusion analytics.

## 2. Architecture

```
 Google Sites embed (events.html, pasted)                  GitHub Pages (yil384.github.io/Picasso-Lab)
 └─ iframe "gd-portal" ─────────────► events/guandan.html  ──── static assets: holdem*.js/css, games-account.js
                                         │       │               events/account-link.html (email-link landing page)
                       Guandan rooms ────┘       │
                Firebase RTDB (unchanged,        │ HTTPS  /v1/*   (accounts, IP suggestion, records, leaderboard)
                client-trusted, Guandan only)    │ WSS    /v1/ws  (Hold'em tables: the authoritative dealer)
                                                 ▼
                         Caddy  poker.picasso-lab.com  ──►  holdem-dealer (Node 22, one process, Docker)
                                                              ├─ engine (pure): cards, evaluator, pots, table, ai
                                                              ├─ rooms: timers, bots, persistence
                                                              ├─ accounts: tokens, IP memory, email link, records
                                                              └─ /data volume: accounts.json, tables.json (atomic)
 Firebase Auth (email-link sign-in, behind a flag) ── verified by the service with Google's public keys (no admin SDK)
```

Why Hold'em does not use Firebase: RTDB is client-trusted (any client can read and write any room), so a deck or hole
cards stored there are visible to everyone with devtools. The dealer service is the single authority for Hold'em:
rooms, seats, chips, the deck, every action and every timer. Firebase keeps carrying Guandan (rooms, presence) as
today. Keeping Hold'em lobby state out of Firebase avoids two sources of truth for the same table.

## 3. Trust boundaries

| Party | Trusted for | Never trusted for |
|---|---|---|
| Dealer service | everything in Hold'em; account records; IP hashing | — (it is the root of trust; it never logs IPs, tokens or hole cards) |
| Hold'em client | its own decisions (fold/call/raise), its own display | deck, other players' cards, pot math, timers, chip counts, whose turn it is |
| Guandan client | the whole Guandan game (unchanged, client-trusted Firebase) | Hold'em anything; other accounts |
| Firebase Auth | proving control of an email address (ID token) | nothing else |
| IP address | a hint that "someone here used name X recently" | identity; never signs anyone in |
| account-link.html | carrying a Firebase ID token to the service once | it gets no account token itself |

Rules that follow:
- The deck exists only in server memory and in the server's data directory (`tables.json`, file mode 600). It is
  shuffled with `crypto.randomInt` (Fisher–Yates). The deck is dealt from the top; burn cards are discarded server-side.
- Every message to a client is built by `views.js` from scratch for that recipient: public table state + that
  recipient's own hole cards. Shown cards appear in the public state only when the rules expose them (showdown, all-in
  run-out, voluntary show). A folded or mucked hand is never sent to anyone, including after the hand.
- Bots receive exactly the view a human in their seat would receive (`viewFor(seat)`) — they cannot peek.
- Action messages are validated against the current hand id, the seat to act and the legal ranges; stale or illegal
  actions are rejected with an error and change nothing.
- Account credentials are bearer tokens (32 random bytes, base64url) kept by the browser in localStorage
  (`picasso.games.token`); the server stores only `sha256(token)`. Guandan `clientId`s are public (they are in
  Firebase seat data), so a clientId is never a credential.

## 4. Identity model (shared by Guandan and Hold'em)

### 4.1 Account
```
Account {
  id: "u_<16 base32>",            // internal, never sent to other players
  pid: "p_<10 base32>",           // public id shown in table state / leaderboard (stable, not secret)
  name: string (1–24, trimmed),
  createdAt, lastSeen: ms,
  tokens: [{ hash, createdAt, lastUsed }],   // one per device, max 10 (oldest dropped)
  clientIds: [string],            // Guandan local ids seen with this account (metadata only)
  email: null | { uid, masked: "y***@ucsd.edu", hash, linkedAt },   // hash = HMAC(secret, lowercased email)
  chips: int,                     // bankroll not at a table; starts at 10,000
  refills: int,                   // free refills taken (virtual chips only)
  holdem:  { hands, won, biggestPot, net, showdowns },
  guandan: { rounds, wins, seen: { "<room>:<round>": 1 } (last 200 keys) }
}
```
Names are not unique for guests. A name used by an email-linked account is **protected**: no other account may take
it (case- and space-insensitive). Hold'em enforces this on the server (sitting with a protected name fails); Guandan's
name lives in client-trusted Firebase, so there the protection is enforced by the UI (the lobby name field asks the
service and reverts with a toast) — documented as UI-level.

### 4.2 Guest first (unchanged behaviour)
1. The page keeps generating `picasso.guandan.client` and `picasso.guandan.name` exactly as before.
2. Before generating a missing clientId the page notes `fresh = (no clientId && no name && no token in storage)`.
3. In the background (never blocking the lobby) it calls `POST /v1/session { clientId, name, fresh }` with
   `Authorization: Bearer <token>` if it has one. Unknown/absent token ⇒ a new guest account is created and its token
   returned; the page stores it. Existing players are migrated this way on their first visit: their clientId and
   name are attached to the new guest account; nothing else changes for Guandan.
4. If the service is unreachable the page works exactly as today (Guandan) and Hold'em shows "牌桌服务暂不可用 · 重试".

### 4.3 IP memory (suggestion only)
- `ipKey = HMAC-SHA256(IP_SALT, normalize(ip))` truncated to 128 bits, hex. `normalize`: IPv4 as is; IPv6 → its /64
  prefix; IPv4-mapped IPv6 → IPv4. The raw IP is never stored, logged or returned.
- On each authenticated `/v1/session` the service records `{ accountId, name, at }` under `ipKey` (max 5 entries per
  key, newest first). Entries older than 30 days are deleted (hourly sweep + at startup). Accounts with an email are
  never recorded here.
- Only when `fresh === true` does `/v1/session` return `suggestions: [{ sid, name }]` (max 3): names recently used from
  the same `ipKey` by guest accounts that are not this one. `sid` is a random id valid for 10 minutes that maps to
  `{ accountId, ipKey }` server-side.
- The page shows a one-click prompt: "继续以 <name> 的身份？ [继续] [我是新玩家]" with a "隐私说明" link. Only a click on
  继续 calls `POST /v1/claim { sid }`; the service re-checks that the caller's `ipKey` still matches and that the
  account is still a guest, then issues a new device token for that account (the fresh, empty guest account the page
  got in step 3 is deleted if it never played). Nothing is ever done silently by IP.

### 4.4 Save with email (Firebase Auth email link, behind a flag)
Flag: the service's env `EMAIL_LINK=on` (reported as `features.emailLink`); default off. The page shows "用邮箱保存"
only when the flag is on. Flow (the game runs inside an iframe, so the link completes on a GitHub Pages page):
1. Page → `POST /v1/email/start { email }` (Bearer). Service stores a pending link `{ lid, accountId, emailHash,
   pollHash, createdAt }` (30 min TTL, max 5 pending per account) and returns `{ lid, poll }` (`poll` = random secret
   kept only in the requesting page's memory).
2. Page loads `firebase-auth.js` (gstatic 12.8.0, lazily) and calls `sendSignInLinkToEmail(auth, email,
   { url: "https://yil384.github.io/Picasso-Lab/events/account-link.html?lid=<lid>&lang=<zh|en>", handleCodeInApp: true })`.
   The page shows "登录链接已发送到 y***@ucsd.edu，请在邮件里点开" and polls `POST /v1/email/poll { lid, poll }` every
   2.5 s for up to 30 min (stops when the popup closes; can be resumed).
3. The user opens the link (any device/browser). `account-link.html` asks for the email again (Firebase requires it on
   another device; it is prefilled when the same browser stored it), calls `signInWithEmailLink`, takes the ID token
   and posts `POST /v1/email/complete { lid, idToken }`. It then signs out of Firebase and shows "已完成，可以回到游戏"
   (it never receives an account token).
4. The service verifies the ID token itself (RS256 against Google's `securetoken@system.gserviceaccount.com` JWKs,
   cached per `Cache-Control`; `aud` = project id `yichen-5e23e`, `iss` = `https://securetoken.google.com/yichen-5e23e`,
   `exp`/`iat`/`auth_time` sane, `email_verified` true, `email` hash equals the pending link's `emailHash`).
   - Email not yet linked anywhere → link it to the pending link's account (guest becomes protected; its name is now
     reserved unless another email account already holds it — then the user is asked to pick another name).
   - Email already linked to account A (this is a second device, or a guest who already saved) → the requesting
     device's guest account B is merged into A: B's Hold'em/Guandan counters are added to A (biggestPot = max), B's
     clientIds join A, B's bankroll is dropped (prevents farming starting chips), B is deleted; A keeps its name.
5. The next poll returns `{ status: "done", token, account }`: a new device token for the linked account. The page
   stores it, keeps `picasso.guandan.client` as is (Guandan), and sets `picasso.guandan.name` to the account name.

Firebase console steps (for the owner; repeated in HOLDEM_REPORT.md): Authentication → Get started (if needed) →
Sign-in method → Email/Password → enable, then enable "Email link (passwordless sign-in)" → Save. Authentication →
Settings → Authorized domains → add `yil384.github.io` (and `poker.picasso-lab.com` is not needed). If the Web API key
has HTTP-referrer restrictions in Google Cloud Console, allow `https://yil384.github.io/*`. Then set `EMAIL_LINK=on`
in the service env and restart it.

### 4.5 Records attach
Guandan: at each `roundOver`, the client of every seated human posts `POST /v1/guandan/round { room, round, won,
place }` once (deduped by `room:round` on both sides). It is self-reported, exactly as trustworthy as Guandan itself.
Hold'em: the dealer updates records itself at the end of each hand (hands, won, biggestPot, net, showdowns).
Leaderboards: `GET /v1/leaderboard?game=holdem|guandan`.

## 5. HTTP API (JSON, `https://poker.picasso-lab.com/v1/...`)

All bodies ≤ 8 KB. CORS: `Access-Control-Allow-Origin` echoes an allow-listed origin (`ALLOWED_ORIGINS`, default
`https://yil384.github.io`; tests add `http://127.0.0.1:*`), `Access-Control-Allow-Headers: authorization,
content-type`, and `Access-Control-Allow-Private-Network: true` on preflight (needed by local tests only; harmless).
Errors: HTTP 4xx/5xx with `{ error: "<code>", message }`. Rate limits (in memory, per ipKey): session creation 30/h,
email start 5/h, claims 10/h, other calls 600/min. `Authorization: Bearer <token>` where noted (B).

| Method & path | Body → Response |
|---|---|
| `POST /v1/session` (B optional) | `{ clientId?, name?, fresh? }` → `{ token? (only when a new account was made), account: AccountView, suggestions?: [{sid,name}], features: { emailLink } }` |
| `POST /v1/claim` (B) | `{ sid }` → `{ token, account }` · 403 `ip_mismatch`, 404 `expired`, 409 `protected` |
| `GET /v1/me` (B) | → `{ account }` |
| `POST /v1/name` (B) | `{ name }` → `{ account }` · 409 `name_protected`, 400 `bad_name` |
| `POST /v1/refill` (B) | → `{ account }` · 409 `not_needed` (refill only when chips < 2,000 and no chips at any table; sets chips to 10,000, refills += 1) |
| `GET /v1/leaderboard?game=holdem\|guandan&limit=50` (B optional) | → `{ rows: [{ pid, name, chips, net, hands, won, biggestPot } \| { pid, name, rounds, wins }], me?: row }` |
| `POST /v1/guandan/round` (B) | `{ room, round, won, place }` → `{ ok }` |
| `POST /v1/email/start` (B) | `{ email }` → `{ lid, poll }` · 403 `disabled` when the flag is off |
| `POST /v1/email/complete` | `{ lid, idToken }` → `{ ok, name }` · 401 `bad_token`, 404 `expired`, 409 `email_mismatch` |
| `POST /v1/email/poll` | `{ lid, poll }` → `{ status: "pending" }` \| `{ status: "done", token, account }` |
| `POST /v1/signout` (B) | → `{ ok }` (revokes this device token) |
| `GET /v1/health` | → `{ ok, tables, players, uptime }` |

`AccountView = { pid, name, guest: bool, email: masked|null, chips, refills, holdem: {...}, guandan: { rounds, wins },
protected: bool }`.

## 6. Hold'em WebSocket protocol (`wss://poker.picasso-lab.com/v1/ws`)

JSON text frames, ≤ 4 KB from clients, ≤ 40 messages/s per socket (excess closes with 1008). Origin must be allowed.
The first client message must be `hello` within 10 s. One socket may watch one table at a time; an account may have
several sockets (phone + laptop); any of them may act for the account's seat.

Client → server
```
{ t:"hello", v:1, token }                          → { t:"welcome", account, serverTime, features }
{ t:"ping" }                                       → { t:"pong", serverTime }
{ t:"create", settings:{ blinds:"10/20", seats:6, actionSec:20, timeBankSec:30 }, practice?:bool }
                                                   → { t:"created", code } then state (practice: bots fill, table starts)
{ t:"watch", code }                                → state stream for that table (spectator until seated)
{ t:"unwatch" }
{ t:"sit", seat, buyIn }                           seat index 0..seats-1; buyIn within [minBuyIn, maxBuyIn] and ≤ chips
{ t:"stand" }                                      leave the seat (folds a live hand at once; chips → bankroll at hand end)
{ t:"sitOut", on:bool }                            on: skipped from the next hand; off: back (waits for the big blind)
{ t:"postBB" }                                     a waiting player posts a big blind to be dealt in next hand
{ t:"act", hand, action:"fold"|"check"|"call"|"raise"|"allin", to? }   to = total street bet after a raise/bet
{ t:"show" }                                       show own cards after winning uncontested / when allowed to muck
{ t:"topUp", amount }                              add chips from bankroll (applied between hands, ≤ maxBuyIn)
{ t:"host", op:"settings", settings }              waiting phase only
{ t:"host", op:"start" } | { t:"host", op:"fillBots" } | { t:"host", op:"removeBot", seat } | { t:"host", op:"dissolve" }
```
Server → client
```
{ t:"state", rev, table: PublicTable, me: Me|null, serverTime }   full snapshot for this recipient on every change
{ t:"error", code, re }                                           e.g. not_your_turn, bad_amount, seat_taken, no_table,
                                                                  insufficient_chips, name_protected, not_host, stale_hand
{ t:"account", account }                                          bankroll / records changed
{ t:"closed", code, reason:"dissolved"|"idle" }
```
Snapshots (not diffs) keep reconnect trivial: whatever the client missed, the next `state` is complete. A table
snapshot is ~2–4 KB. `rev` increases by one per change; clients ignore older revs.

```
PublicTable {
  code, phase: "waiting"|"running"|"closed", host: pid, rev,
  settings: { sb, bb, minBuyIn, maxBuyIn, seats, actionSec, timeBankSec },
  seats: [ null | {
    pid, name, bot: null|"steady"|"fierce"|"sly"|"veteran",
    stack, bet,                 // bet = chips in front of the seat on the current street
    state: "playing"|"folded"|"allin"|"out"|"waiting"|"busted",
    connected, inHand: bool,    // inHand: holds cards this hand (show a card back)
    shown: null | [c1,c2],      // only when the rules exposed them
    last: null | { a:"sb"|"bb"|"check"|"call"|"bet"|"raise"|"allin"|"fold"|"timeout"|"muck"|"show", amt },
    timeBank                    // seconds left in the bank
  } ],
  hand: null | {
    id, no, street: "preflop"|"flop"|"turn"|"river"|"showdown",
    board: [c...], button, sbSeat, bbSeat,
    toAct: seat|null, deadline: ms|null, usingBank: bool,
    currentBet, minRaiseTo,
    pots: [{ amt, seats:[...] }],          // collected pots (main first), not counting bets in front of seats
    winners: null | [{ seat, amt, pot, hand: { cat, name, cards:[5] } | null }],
    done: bool
  },
  log: [{ seat, a, amt, street }],        // this hand's public actions, for the history strip and animations
  last: null | { no, board, winners, shown: { [seat]: [c1,c2] } }   // the previous hand, for "上一手"
}
Me {
  pid, seat: int|null, chips (bankroll),
  hole: null|[c1,c2], best: null|{ cat, name, cards:[5] },
  legal: null | { fold, check, call (amount to add), minRaiseTo, maxRaiseTo, canRaise },
  canShow: bool, pendingTopUp: int
}
```
Cards are two-character strings: rank `23456789TJQKA` + suit `shdc` (e.g. `"As"`, `"Td"`). `cat` is the hand
category key (`high`, `pair`, `two_pair`, `trips`, `straight`, `flush`, `full_house`, `quads`, `straight_flush`;
`royal` is a straight flush to the ace), `name` an English short label; the client localizes from `cat`.
Times: `deadline` and `serverTime` are server epoch ms; clients compute `offset = serverTime - Date.now()` per message.

## 7. Rules (No-Limit Texas Hold'em, cash table)

- Seats 2–9 (room setting; default 6). Blinds presets `5/10`, `10/20` (default), `25/50`, `50/100`; min buy-in 40 BB,
  max buy-in 100 BB, default buy-in = min(max buy-in, bankroll). Starting bankroll 10,000 virtual chips.
- Button moves one dealt-in seat clockwise each hand. SB = next dealt-in seat after the button, BB = next after SB.
  Heads-up: the button posts the SB and acts first pre-flop and last after the flop. If a blind seat is empty or
  sitting out the button still advances one seat (simplified moving button; no dead blinds).
- New players and players returning from sit-out are `waiting` and are dealt in when the big blind reaches them, or
  at once with `postBB` (they post a BB in addition to the blinds). At the very first hand of a table all seated players
  are dealt in.
- Betting: pre-flop action starts left of the BB; after the flop, left of the button. Minimum bet = BB. A raise must
  raise by at least the largest bet or raise increment of this street (pre-flop the BB counts as the opening bet).
  All-in for less than a full raise does **not** reopen betting for players who have already acted and face only that
  incomplete raise (they may call or fold, not re-raise); players who have not yet acted may raise normally.
  `minRaiseTo`/`maxRaiseTo` in `legal` encode this. No cap on raises.
- Street ends when all non-folded, non-all-in players have acted since the last full raise and matched the current
  bet. Uncalled bets return to the bettor before pots are built.
- Side pots: built from each player's total contribution this hand (folded players' chips stay in the pots they
  reached; folded players are never eligible). Each pot is awarded to the best hand(s) among its eligible players.
- Showdown: if betting is closed with ≥2 players and at least one all-in (no more decisions possible), all remaining
  hands are exposed and the board is run out street by street. Otherwise at river showdown the last aggressor on the
  river shows first (no river bet ⇒ the first remaining player clockwise from the button); each next player shows if
  their hand can win or tie a pot they are eligible for, else mucks automatically (Me.canShow lets them show anyway).
  A hand that wins uncontested is not shown (the winner may `show`).
- Splits: equal shares; odd chips go one at a time to the winners in seat order starting left of the button.
- Hand ranks: straight flush (A-5 "wheel" lowest, royal highest) > quads > full house > flush > straight (wheel
  lowest) > trips > two pair > pair > high card; kickers break ties; suits never break ties; the board can play.
- Timers: `actionSec` (15/20/30, default 20) per decision, then the player's time bank (`timeBankSec`, default 30,
  +5 s every 10 hands dealt, cap 60) runs automatically. On expiry: check if legal, else fold; `last.a = "timeout"`.
  Two consecutive timeouts ⇒ the player is set to sit out. Bots never time out.
- Sit-out: skipped when dealing; a player sitting out for 5 minutes (or busted for 60 s without topping up) is stood
  up and their stack returns to their bankroll. Disconnected players keep their seat and simply time out.
- Rebuy / top-up: between hands only (a request during a hand is queued and applied before the next deal), from the
  bankroll, up to max buy-in. Bankroll empty ⇒ free refill to 10,000 (`/v1/refill`, counted in `refills`, and the
  leaderboard ranks by `net`, so refills never help). No chip transfers between accounts, ever.
- Pacing (server): 700 ms between a closed street and the next card(s); all-in run-outs 1,200 ms per street; hand end
  hold 3,000 ms (5,000 ms with a showdown) before the next deal; at least 2 eligible players needed to deal.

## 8. Engine structure (server)

```
src/engine/cards.js      deck, encoding, crypto shuffle (rng injectable for tests)
src/engine/evaluator.js  best-5-of-7 evaluation → { cat, rank (comparable int), cards, name }
src/engine/pots.js       side pots from contributions; awarding with odd-chip rule
src/engine/table.js      HoldemTable: pure state machine, JSON-serializable, clock/rng injected
src/engine/ai.js         bot decisions from viewFor(seat) only (Monte Carlo equity, pot odds, position, personality)
src/views.js             publicTable(state) / me(state, accountId) — the only code that turns state into messages
src/rooms.js             table registry: timers (setTimeout to table.nextWakeAt()), bots' think delays, persistence
src/accounts.js          accounts, tokens, IP memory, email links, records, leaderboard
src/firebase-token.js    Firebase ID token verification (JWKs fetched + cached; injectable for tests)
src/store.js             JSON persistence: write temp + fsync + rename, debounced 200 ms, flush on SIGTERM
src/http.js, src/ws.js   transport; src/server.js wires everything; src/config.js reads env
```
`HoldemTable` API (all methods take `now`; randomness only through the injected `rng`):
`constructor({ code, settings, host, now, rng })`, `static fromJSON(obj, { rng })`, `toJSON()`,
`sit(account, seat, buyIn, now)`, `stand(accountId, now)`, `setSitOut(accountId, on, now)`, `postBB(accountId)`,
`act(accountId, handId, action, to, now)`, `show(accountId)`, `requestTopUp(accountId, amount)`,
`hostOp(accountId, op, args, now)`, `tick(now)` (applies due timeouts / street transitions / next deal; returns
whether state changed), `nextWakeAt()`, `viewFor(seat)` (for bots), `settlements()` (drains chip movements and records
to apply to accounts). Every mutation returns `{ ok, error? }` and bumps `rev`.

## 9. Persistence, restart and reconnect

- `DATA_DIR` (Docker volume `/data`): `accounts.json` (accounts, ip memory, pending links) and `tables.json` (every open
  table including the deck of a live hand). Both are written atomically (temp file, fsync, rename), debounced 200 ms
  and flushed on `SIGTERM`/`SIGINT`. Files are `chmod 600`. Daily backup copies are the lead's job (Docker volume).
- Restart: tables are loaded, every live hand resumes where it stopped; the player to act gets a fresh full action
  timer (`deadline = now + actionSec`), bots re-think. Connected clients see the socket close with code 1012 and
  reconnect; they resume from the next full snapshot.
- Client reconnect: exponential backoff 0.5 s → 8 s with jitter, forever while the Hold'em screen is open; the table
  shows a small "重新连接中…" pill (no blocking overlay) and disables action buttons until a fresh `state` arrives.
  On reconnect the client sends `hello` then `watch <code>`; its seat was never released.
- Chip safety: a seat's stack lives in the table, the bankroll in the account; moves between them happen only in the
  same synchronous step that changes both, then one persistence flush covers both files (written together).

## 10. Failure modes

| Failure | Behaviour |
|---|---|
| Service down / not deployed | Guandan unaffected. Lobby Hold'em tiles show "牌桌服务暂不可用" + 重试. Identity stays local (guest). |
| Service restarts mid-hand | Hand resumes from disk; sockets reconnect; the actor's timer restarts. Losing the last ≤200 ms of actions is possible only on a crash (not on a clean restart). |
| Client drops mid-hand | Seat kept; timer runs; auto check/fold; two timeouts ⇒ sit out; 5 min ⇒ stood up, chips back to bankroll. |
| Same account in two tabs | Both watch; either may act; the first valid action wins, the other gets `stale_hand`. |
| Host leaves | Host passes to the longest-seated human; no humans left ⇒ table pauses (bots stop) and closes after 10 min idle. |
| Clock skew | Clients render deadlines with the server offset; the server alone decides timeouts. |
| Abuse (spam, floods) | Size and rate limits per socket and per ipKey; max 200 open tables; bots only on tables with a human. |
| Corrupt data file | The service refuses to start and keeps the file (never overwrites it); the last good copy is `*.bak`. |

## 11. Privacy note (shown in the game; owner to approve)

ZH: 隐私说明：为了让你换浏览器时能一键找回昵称，游戏服务会把你的网络地址做加盐哈希（不保存、不记录原始 IP），并记住最近 30 天里
在这个网络用过的游客昵称，30 天后自动删除。新浏览器只会看到"继续以 X 的身份？"的建议，必须由你点一下才会生效；同一校园网或路由器下的人
也可能看到同样的建议，所以绑定了邮箱的账号永远不会靠网络地址被推荐或登录。邮箱只用于发送登录链接，我们只保存脱敏地址和一个哈希。所有筹码
都是虚拟的，不能购买、出售或转让，没有任何价值。

EN: Privacy: so you can pick your name up again in a new browser, the game service keeps a salted hash of your network
address (never the raw IP) together with the guest names used from that network in the last 30 days, and deletes it
after 30 days. A new browser only sees a "Continue as X?" suggestion and nothing happens until you click it. People on
the same campus network or router may see the same suggestion, so an email-saved account is never suggested or signed
in by network address. Your email is used only to send the sign-in link; we keep a masked form and a hash. All chips
are play money: they cannot be bought, sold or transferred and have no value.

## 12. Deployment (lead)

`events/holdem-dealer/compose.yaml` runs the image with `/data` as a named volume and binds `127.0.0.1:8787`. Caddy:
```
poker.picasso-lab.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8787
    log { output discard }          # the service never stores IPs; keep Caddy from logging them too
}
```
Env: `GAMES_SECRET` (32+ random bytes, signs nothing public; keys HMACs), `IP_SALT` (32+ random bytes), `EMAIL_LINK`
(`off`|`on`), `FIREBASE_PROJECT_ID=yichen-5e23e`, `ALLOWED_ORIGINS=https://yil384.github.io`, `TRUST_PROXY=1` (take the
client IP from the right-most `X-Forwarded-For` entry, which Caddy appends), `DATA_DIR=/data`, `PORT=8787`.

## 13. Testing

- `npm test` (node:test): evaluator (all 2,598,960 five-card hands → exact category counts; hand-picked kicker, wheel,
  board-plays, split and odd-chip cases), pots (side pots, folded contributions, uncalled bets), table (blinds,
  heads-up order, min-raise and incomplete all-in, street closing, showdown order and mucking, timeouts and time bank,
  sit-out/waiting for BB, rebuy, persistence round-trip mid-hand), ai (never sees hidden cards; legal actions only;
  personalities differ), accounts (guest, migration, IP suggestion rules and expiry, claims, name protection, email
  link with a locally signed test JWK, merge rules), views (no hidden card ever appears in another recipient's message
  — fuzzed over thousands of random hands), WS integration (2–9 seats, restart mid-hand).
- `npm run test:slow`: all 133,784,560 seven-card hands → exact category counts.
- Browser: `guandan-kit/harness/holdem/` — Playwright against the local service (the page reads
  `window.__PICASSO_GAMES_ORIGIN`, set by the harness's init script; production uses `https://poker.picasso-lab.com`).
