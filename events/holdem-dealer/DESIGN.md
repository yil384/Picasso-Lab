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
 Resend (EMAIL_SENDER=resend) ◄── the service sends the sign-in email from noreply@picasso-lab.com (HTTPS API)
 Firebase Auth (EMAIL_SENDER=firebase) ── its ID tokens verified by the service with Google's public keys (no admin SDK)
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
| Firebase Auth | proving control of an email address (ID token; `EMAIL_SENDER=firebase`) | nothing else |
| Resend | delivering the sign-in email to the address (`EMAIL_SENDER=resend`): it sees the address and the link | storing anything for the service; the link alone does nothing without the device code |
| IP address | a hint that "someone here used name X recently" | identity; never signs anyone in, never hands over an account |
| account-link.html | carrying the emailed token, or a Firebase ID token, to the service once | it gets no account token itself |

Rules that follow:
- The deck exists only in server memory: `tables.json` never holds the deck, the burn cards or a hole card (shown
  cards and the board are public and are kept), so whoever can read the data volume learns nothing hidden; a restart
  therefore calls a live hand off (section 9). It is shuffled with `crypto.randomInt` (Fisher–Yates). The deck is
  dealt from the top; burn cards are discarded server-side. Anyone with root or `docker` on the dealer's host can
  still read the process's memory: the host must be trusted (it is the lab server; play money only).
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
- The page shows a one-click prompt: "继续使用昵称「<name>」？ [继续] [我是新玩家]" with a "隐私说明" link. Only a click
  on 继续 calls `POST /v1/claim { sid }`; the service re-checks that the caller's `ipKey` still matches and that the
  account is still a guest, then gives **the caller's own account** that name. A suggestion hands over a name, never
  an account: no token is issued for the other account, whose chips, records, seat and hole cards stay its own
  (anyone on the same campus network sees the same suggestions). A whole account moves to another device only
  through "save with email". Nothing is ever done silently by IP.

### 4.4 Save with email (behind a flag; the email from Resend or from Firebase Auth)
Flag: the service's env `EMAIL_LINK=on` (reported as `features.emailLink`); default off. The page shows "用邮箱保存"
only when the flag is on. Sender: `EMAIL_SENDER=resend` (the service sends the email itself, from
`noreply@picasso-lab.com`; section 4.4.1) or `firebase` (the default and the rollback: the page asks Firebase Auth to
send its own link, steps 2-4 below), reported as `features.emailSender`. Everything after the proof of the address
(the device code, binding, merging, polling) is the same for both. Flow with Firebase (the game runs inside an
iframe, so the link completes on a GitHub Pages page):
1. Page → `POST /v1/email/start { email }` (Bearer). Service stores a pending link `{ lid, accountId, emailHash,
   pollHash, codeHash, createdAt }` (30 min TTL, max 5 pending per account) and returns `{ lid, poll, code }` (`poll`
   = random secret kept only in the requesting page's memory; `code` = 4 random digits the page shows next to "waiting
   for the link").
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
   - Every completion that changes an account must carry the `code` shown on the requesting device (else
     `need_code`; a wrong one `bad_code`; 5 wrong ones drop the link; both errors carry `merge: true|false`).
     `account-link.html` sends it by itself when opened in the browser that asked (`picasso.games.linkCode` in
     localStorage, `{ lid, code }`); anywhere else it asks for it, says what confirming does, and "if you did not ask
     for this, close this page". So a link someone else started for your address can neither bind the address to
     their account nor hand them a token for yours.
   - Email not yet linked anywhere → link it to the pending link's account (guest becomes protected; its name is now
     reserved unless another email account already holds it — then the user is asked to pick another name).
   - Email already linked to account A (this is a second device, or a guest who already saved) → the requesting
     device will be signed in to A (the page says another device is being signed in). Then the requesting device's guest account B is merged into A: B's Hold'em/Guandan counters are added to A (biggestPot = max), B's
     clientIds join A, B's bankroll is dropped (prevents farming starting chips), B is deleted; A keeps its name.
5. The next poll returns `{ status: "done", token, account }`: a new device token for the linked account. The page
   stores it, keeps `picasso.guandan.client` as is (Guandan), and sets `picasso.guandan.name` to the account name.

Firebase console steps (for the owner; repeated in HOLDEM_REPORT.md): Authentication → Get started (if needed) →
Sign-in method → Email/Password → enable, then enable "Email link (passwordless sign-in)" → Save. Authentication →
Settings → Authorized domains → add `yil384.github.io` (and `poker.picasso-lab.com` is not needed). If the Web API key
has HTTP-referrer restrictions in Google Cloud Console, allow `https://yil384.github.io/*`. Then set `EMAIL_LINK=on`
in the service env and restart it.

### 4.4.1 The email sent by the service (`EMAIL_SENDER=resend`)
1. Page → `POST /v1/email/start { email, lang }` (Bearer). Limits: 5 an hour per network (as above), and for the
   emails the service sends, 3 an hour and 10 a day per address (by its HMAC hash) and `EMAIL_DAILY_CAP` (90) in
   any 24 hours in all (Resend's free tier is 100 a day); these counts are kept in `accounts.json` (times and hashes
   only), so a restart does not reset them. Refused: 429 `rate_limited` with `Retry-After`, nothing sent.
2. The service stores the pending link as above plus `tokenHash = sha256(t)` of a new single-use token `t` (32 random
   bytes, base64url; same 30-minute life as the link), and sends the email through Resend's HTTP API
   (`POST https://api.resend.com/emails`, `Authorization: Bearer` from `RESEND_API_KEY_FILE`, `Idempotency-Key:
   picasso-signin-<lid>`, from `EMAIL_FROM`, a text and an HTML part) with the link
   `https://yil384.github.io/Picasso-Lab/events/account-link.html?lid=<lid>&t=<t>&lang=<zh|en>`. A network error,
   a timeout or a 5xx is retried once with the same key (Resend sends a key at most once). The plaintext address is
   used for this request only: never stored, never logged (the link keeps the masked form and the hash).
3. Answer `{ lid, poll, code, sent: true, from: "noreply@picasso-lab.com" }`; the page skips Firebase, says who the
   email comes from and to look in spam, shows the code and polls as in step 2 above. Errors: 429 `rate_limited`
   (Resend said 429; not counted), 502 `send_failed` (Resend refused or could not be reached; a refusal is not
   counted, an outage is). The failed link is dropped. Logged: Resend's status and error name, never the address.
4. The user opens the link (any device). `account-link.html` takes `t` out of the address bar (kept in this tab's
   sessionStorage for a reload), loads no Firebase script and posts `POST /v1/email/redeem { lid, t, code? }`, with
   the code when it is the device that asked. The service compares `sha256(t)` with `tokenHash` in constant time;
   a wrong, malformed or expired token answers 404 `expired` like an unknown link; a link already done 409 `used`.
   Then exactly step 4's rules: `need_code` / `bad_code` (5 tries) / `at_table` / `already_linked` leave the token
   usable, a success binds or merges and marks the link done (single use), and the waiting page's next poll gets the
   token (step 5). The email: subject "Picasso Lab 游戏登录 / Sign in to Picasso Lab games", Chinese first for
   `lang=zh`, one button and the raw link, the expiry, "if you did not ask for this, ignore this email"; table layout
   with inline styles, at most 520 px wide, no image, no tracking pixel, no emoji (`src/mailer.js`).

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
email start 5/h, link redeems 60/h, claims 10/h, other calls 600/min (and the per-address and daily email limits of
4.4.1). `Authorization: Bearer <token>` where noted (B).

| Method & path | Body → Response |
|---|---|
| `POST /v1/session` (B optional) | `{ clientId?, name?, fresh? }` → `{ token? (only when a new account was made), account: AccountView, suggestions?: [{sid,name}], features: { emailLink, emailSender } }` |
| `POST /v1/claim` (B) | `{ sid }` → `{ account }` (the caller's own account, renamed; no token) · 403 `ip_mismatch`, 404 `expired`, 409 `protected` |
| `GET /v1/me` (B) | → `{ account }` |
| `POST /v1/name` (B) | `{ name }` → `{ account }` · 409 `name_protected`, 400 `bad_name` |
| `POST /v1/refill` (B) | → `{ account }` · 409 `not_needed` (refill only when chips < 2,000 and no chips at any table; sets chips to 10,000, refills += 1) |
| `GET /v1/leaderboard?game=holdem\|guandan&limit=50` (B optional) | → `{ rows: [{ pid, name, chips, net, hands, won, biggestPot } \| { pid, name, rounds, wins }], me?: row, rule?: { days, hands } }` (Hold'em ranks established accounts only) |
| `POST /v1/guandan/round` (B) | `{ room, round, won, place }` → `{ ok }` |
| `POST /v1/email/start` (B) | `{ email, lang? }` → `{ lid, poll, code, sent: false }` (Firebase sends) \| `{ lid, poll, code, sent: true, from }` (the service sent it) · 403 `disabled` when the flag is off · 429 `rate_limited` · 502 `send_failed` |
| `POST /v1/email/redeem` | `{ lid, t, code? }` → `{ ok, name, nameReserved }` · 404 `expired` (also a wrong token), 409 `used`, 409 `need_code` / `bad_code` (`merge: bool`), 409 `at_table`, 409 `already_linked` |
| `POST /v1/email/complete` | `{ lid, idToken, code }` → `{ ok, name, nameReserved }` · 401 `bad_token`, 404 `expired`, 409 `email_mismatch`, 409 `need_code` / `bad_code` (`merge: bool`), 409 `at_table`, 409 `already_linked` |
| `POST /v1/email/poll` | `{ lid, poll }` → `{ status: "pending" }` \| `{ status: "done", token, account }` |
| `POST /v1/signout` (B) | → `{ ok }` (revokes this device token) |
| `GET /v1/health` | → `{ ok, tables, players, uptime, limited: { <limit>: refusals } }` · 503 `persist_failing` while changes wait more than 10 s for the disk |

`AccountView = { pid, name, guest: bool, email: masked|null, chips, refills, holdem: {...}, guandan: { rounds, wins },
protected: bool }`. Additional response fields and error codes of the service as built: section 14.

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
snapshot is ~2–4 KB. `rev` increases by one per change; clients ignore older revs on the same socket, and take the
first snapshot after a new `welcome` whatever its rev (a crash can restore a table a few changes behind what a page saw).

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
    dead,                                  // dead blind money posted this street (a returning player in the SB)
    winners: null | [{ seat, amt, pot, hand: { cat, name, cards:[5] } | null }],
    done: bool
  },
  log: [{ seat, a, amt, street }],        // this hand's public actions, for the history strip and animations
  last: null | { no, board, winners, shown: { [seat]: [c1,c2] }, hands: { [seat]: HandInfo | null } }   // the previous hand, for "上一手"; hands = each shown hand's best five
  voided: null | int                      // the last hand a restart called off (chips back); pages in it say so
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
  sitting out the button still advances one seat (simplified moving button). When play drops to heads-up the big
  blind moves on from last hand's big blind, so nobody posts it twice running; when it reaches a waiting player
  (three dealt) and last hand's big blind has gone (stood up, sitting out), the small blind is dead rather than
  posted a second time running by the seat before the big blind (the button stays, which keeps the big blinds in
  turn).
- New players and players returning from sit-out are `waiting` and are dealt in when the big blind reaches them, or
  at once with `postBB` (they post a BB in addition to the blinds; one who lands in the small blind posts the SB live
  plus the rest of a BB dead). At the very first hand of a table all seated players are dealt in, and a brand-new seat
  at a heads-up table (the last hand was heads-up) is dealt in at once; a player back from sitting out at a heads-up
  table, and a new seat at a table that is down to two only now, still wait for the BB.
  An account that played at the table and stood up less than 15 minutes ago (`recent`, by account) sits back down as
  a returning player (`returning`): it waits for the BB like one back from sitting out, so standing and re-seating
  never dodges the big blind or makes someone else post it twice.
- Betting: pre-flop action starts left of the BB; after the flop, left of the button. Minimum bet = BB. A raise must
  raise by at least the largest bet or raise increment of this street (pre-flop the BB counts as the opening bet).
  All-in for less than a full raise does **not** reopen betting for players who have already acted and face only that
  incomplete raise (they may call or fold, not re-raise); players who have not yet acted may raise normally.
  `minRaiseTo`/`maxRaiseTo` in `legal` encode this. No cap on raises.
- Street ends when all non-folded, non-all-in players have acted since the last full raise and matched the current
  bet. An uncalled bet returns to the bettor before pots are built, but only to a bettor still in the hand: a folded
  seat (also one that stood up) forfeits every chip it put in, and its unmatched bet stays in the pot.
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
  bankroll, a rebuy (nothing left) at least the min buy-in, a top-up at least a BB (or exactly what is left to the
  max), up to max buy-in (in a hand, counted from the stack the hand began with; a queued top-up that would lift
  a winning stack above the max is cut there and the rest goes back to the bankroll). Bankroll below 2,000 ⇒ free
  refill to 10,000 (`/v1/refill`, counted in `refills`), at most once per 24 hours per account and per network. The
  leaderboard ranks by the ranked net `rnet` (shown as its `net` column), so refills never lift the refilled account
  itself. Chips lost on purpose to another account (chip dumping) do not rank either: each hand record carries the
  hand id and `gain` (every chip won in that hand, bots included), and a winner's ranked gain is cut by the share
  that fresh accounts lost (younger than 3 days or under 50 hands; bots count as established). Fresh guests are free
  (30 an hour per network), so their starting chips can move but never reach the ranking, and only established
  accounts rank at all (a throwaway guest's lucky hands against the bots never do; a fresh account sees its own row,
  unranked). A merge (email link) carries a fresh guest's losses into the saved account, never its gains.
  `holdem.net` keeps the plain sum. No direct chip transfers between accounts, ever.
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

### 8.1 Engine as built (additions and clarifications; the header comment of each file is the reference)

API additions, all backwards compatible with the list above:
- `constructor({ ..., options: { pauseWithoutHumans = true } })`: `false` lets a bots-only table deal (tests).
- `toJSON()` is what goes to disk: the whole state without `hand.deck`, `hand.burns` and every `seats[].hole`;
  `snapshot()` is the whole state (tests). `fromJSON(obj, { rng, now })` with a live hand that has no deck (any
  restore from disk) calls the hand off (`_voidHand`): every chip put in goes back to its seat, queued top-ups join
  the stacks, leavers go, a dissolve completes, nothing is recorded, the next deal restores the button and blinds it
  had, and `PublicTable.voided` carries the called-off hand's number. Time bank already used before the saved clock
  stays used (the rooms layer saves the clock at a graceful stop). `expire(now)` closes a table that never started.
- `requestTopUp(accountId, amount, bankroll?)`: `bankroll` (when given) is checked (`insufficient_chips`). The chips
  leave the bankroll at once (settlement `-amount`, reason `topup`) and join the stack at hand end (or at once when
  the seat is not in a live hand), so a queued top-up can never be unfunded. `postBB`, `show`, `requestTopUp` accept
  an optional trailing `now`; without it the table uses the latest time it has seen.
- `setConnected(accountId, on)` feeds `PublicTable.seats[].connected` (true on sit; no effect on play).
- `releaseHost(accountId, now)`: for the rooms layer when a host is gone without standing (host passes to the
  longest-seated other human; `no_candidate` when there is none). Standing up never hands off by itself (changed
  in the integration pass: a host who stood to change seats lost the table to a guest); the rooms layer decides.
- Read helpers: `seatOf(accountId)`, `actor()` → `{ seat, id, bot, handId } | null` (who must act; bots: the rooms
  layer asks `ai.decide(table.viewFor(seat))` and acts after `ai.thinkDelay(...)`), `legalFor(seat)`, `canShow(seat)`.
- `views.me(table, accountId, account?)`: `account = { pid, chips }` supplies `Me.chips` (the table never knows
  bankrolls). `views.publicTable(table, now?)`: `now` only refines the time bank shown for a seat using its bank.
- `settlements()` → `{ chips: [{ accountId, amount, reason: buyin|topup|cashout }], records: [{ accountId, hands,
  won (0/1), biggestPot (chips won this hand), net, showdowns (0/1), hand, gain }] }`; bots never appear. Reason `topup_back`
  (positive) returns the part of a queued top-up that the max buy-in cut off at hand end.

Rule details fixed by the engine:
- Seats not in a hand show `state` `out` (sitting out), `busted` (stack 0), `waiting` (for the big blind) or
  `playing` (ready). A mucked hand shows as `folded` with `last.a = "muck"`. `last.amt` (and `log[].amt`) is the
  seat's total bet on the street after the action; an automatic check/fold is logged as `timeout`.
- `Me.hole` is `null` once the recipient's own hand is folded or mucked (DESIGN 3: such a hand is sent to nobody).
- `hand.winners` has one entry per pot per winner (`pot` = pot index, main pot 0); `hand: null` when uncontested.
- Exposure at an all-in run-out happens only when cards remain to be dealt; betting that closes on the river with an
  all-in goes to the ordinary showdown order (aggressor first, automatic mucks).
- A short big blind (all-in from the post) still makes the others call the full big blind. A short all-in that
  opens the betting below the big blind does not change the minimum raise increment (the big blind).
- A seat that stands mid-hand stays (folded, or all-in and still live) until hand end, then its stack is cashed
  out. Once betting is over (an all-in run-out, or nobody left who could bet) a leaver is not folded: its hand plays
  to showdown like an all-in one. A folded leaver forfeits its bets: if its bet was the only thing the player to act
  still faced, the street closes and that bet stays in the pot.
- Sitting needs a buy-in within 40-100 BB; a top-up may bring stack + queued top-ups up to 100 BB. Host settings
  change only before the start (existing stacks are kept).
- `hostOp dissolve` during a live hand waits for it: the hand plays out, the pot is awarded, then the table closes
  (a host could otherwise undo a lost all-in once the board shows). `hostOp removeBot` on a bot in a live hand lets
  it play the hand out and removes it at hand end (a host op never folds a seat). A table with no human
  seated (also before the first sit) closes as `idle` 10 minutes later when `pauseWithoutHumans` is on.
- Bots (`b_<n>`, styles rotate from a random start, names Stone/Blaze/Fox/Sage by style) buy in for the maximum,
  never time out or sit out, and are removed 60 s after busting like anyone else. Their raises are tidy amounts
  (multiples of the small blind, of the big blind from 20 BB up), or the minimum / all-in.

## 9. Persistence, restart and reconnect

- `DATA_DIR` (Docker volume `/data`): `accounts.json` (accounts, ip memory, pending links) and `tables.json` (every open
  table, without the deck, burn cards or hole cards). Both are written atomically (temp file, fsync, rename), debounced
  200 ms and flushed on `SIGTERM`/`SIGINT`. Files are `chmod 600`. Daily backups (`ops/backup.sh`, README): both
  files from one moment, without the IP memory, kept 14 days in a 700 folder of the deploying user.
- Restart: tables are loaded; a hand that was live is called off (its deck and hole cards were never on disk), every
  chip put in goes back to its seat and a new hand is dealt 2 s later with the same button. Connected clients see the
  socket close with code 1012, reconnect, resume from the next full snapshot and say "the hand was called off, chips
  returned" when the snapshot's `voided` is the hand they were in.
- Client reconnect: exponential backoff 0.5 s → 8 s with jitter, forever while the Hold'em screen is open; the table
  shows a small "重新连接中…" pill (no blocking overlay) and disables action buttons until a fresh `state` arrives.
  On reconnect the client sends `hello` then `watch <code>`; its seat was never released.
- Chip safety: a seat's stack lives in the table, the bankroll in the account; moves between them happen only in the
  same synchronous step that changes both, then one persistence flush covers both files (written together).

## 10. Failure modes

| Failure | Behaviour |
|---|---|
| Service down / not deployed | Guandan unaffected. Lobby Hold'em tiles show "牌桌服务暂不可用" + 重试. Identity stays local (guest). |
| Service restarts mid-hand | The live hand is called off (chips back, nothing recorded); sockets reconnect; the next hand is dealt. Losing the last ≤200 ms of changes is possible only on a crash (not on a clean restart). |
| Disk full / data not writable | Play goes on in memory; `/v1/health` answers 503 `persist_failing` after 10 s and the container shows unhealthy; the failure is logged once a minute; `ops/watchdog.sh` logs it and does not restart (memory holds the only copy). |
| Client drops mid-hand | Seat kept; timer runs; auto check/fold; two timeouts ⇒ sit out; 5 min ⇒ stood up, chips back to bankroll. |
| Same account in two tabs | Both watch; either may act; the first valid action wins, the other gets `stale_hand`. |
| Host leaves | Host passes to the longest-seated human; no humans left ⇒ table pauses (bots stop) and closes after 10 min idle. |
| Clock skew | Clients render deadlines with the server offset; the server alone decides timeouts. |
| Abuse (spam, floods) | Size and rate limits per socket and per ipKey (refusals counted and logged once a minute); max 200 open tables, 30 created from one network, 3 created or hosted and 4 seats per account, unstarted tables close after 30 minutes; bots only on tables with a human. |
| Corrupt data file | The service refuses to start and keeps the file (never overwrites it); restore both files from the same daily backup (README). |

## 11. Privacy note (shown in the game; owner to approve)

ZH: 隐私说明：为了让你换浏览器时能一键用回原来的昵称，游戏服务会把你的网络地址做加盐哈希（不保存、不记录原始 IP），并记住最近
30 天里在这个网络用过的游客昵称，30 天后自动删除，备份里也不保留。新浏览器只会看到"继续使用昵称 X？"的建议，必须由你点一下才会生效，
而且只换昵称：筹码、战绩和座位都不会跟过来（想在别的设备上用同一个账号，请用邮箱保存）。同一校园网或路由器下的人也可能看到同样的建议，
所以绑定了邮箱的账号的昵称永远不会这样被推荐。邮箱只用于发送登录链接（通过邮件服务 Resend 发送），
我们只保存脱敏地址和一个哈希。能管理这台服务器的人在技术上可以从哈希反推出网络地址。所有筹码都是虚拟的，不能购买、出售或转让，没有任何价值。

EN: Privacy: so you can pick your name up again in a new browser, the game service keeps a salted hash of your network
address (never the raw IP) together with the guest names used from that network in the last 30 days, and deletes it
after 30 days; backups never hold it. A new browser only sees a "Use the name X?" suggestion, nothing happens until you
click it, and a click only takes the name: chips, records and seats stay with their account (to use one account on
several devices, save it with an email). People on the same campus network or router may see the same suggestion, so
the name of an email-saved account is never suggested. Your email is used only to send the sign-in link, which goes
out through the mail service Resend; we keep a masked form and a hash. Whoever administers the server could
technically work a network address back out of its hash. All chips are play money: they cannot be bought, sold or
transferred and have no value.

## 12. Deployment (lead)

The lab server runs Caddy in the container `fras-caddy-1` on the Docker network `fras_default`.
`events/holdem-dealer/compose.yaml` joins that network (alias `holdem-dealer`), publishes no host port, keeps `/data`
in a named volume, reads the two secrets from files (`./secrets`, folder 700; `docker inspect` never shows them) and
rotates its logs. Caddy (`Caddyfile.snippet`, appended to the FRAS Caddyfile, reloaded with `docker exec fras-caddy-1
caddy reload ...`):
```
poker.picasso-lab.com {
    encode zstd gzip
    reverse_proxy holdem-dealer:8787 { stream_close_delay 5m }   # a reload keeps open sockets
    handle_errors { respond `{"error":"unavailable",...}` {err.status_code} }   # its 502s logged at debug only
    log { output discard }                                        # no access log: Caddy logs no client IP either
}
```
Env (`.env`): `EMAIL_LINK` (`off`|`on`), `EMAIL_SENDER` (`firebase`|`resend`), `EMAIL_FROM` (default
`Picasso Lab <noreply@picasso-lab.com>`), `EMAIL_DAILY_CAP` (90), `FIREBASE_PROJECT_ID=yichen-5e23e`, `ALLOWED_ORIGINS=https://yil384.github.io`,
`TRUST_PROXY=fras-caddy-1` (only that container may set `X-Forwarded-For`; the client IP is its right-most entry,
which Caddy appends; any other peer, e.g. a user on the host reaching the container, is keyed by its own address),
`DATA_DIR=/data`, `PORT=8787`; compose sets `GAMES_SECRET_FILE` and `IP_SALT_FILE` (32+ random bytes each) and
`RESEND_API_KEY_FILE` (`./secrets/resend_api_key`, read only with `EMAIL_SENDER=resend`; the key is never an env value).
Operations (README): `ops/secrets.sh`, `ops/backup.sh` (cron, daily), `ops/watchdog.sh` (cron, every 5 minutes:
restarts a service that does not answer, never one that cannot save), `src/health.js`.

## 13. Testing

- `npm test` (node:test): evaluator (all 2,598,960 five-card hands → exact category counts; hand-picked kicker, wheel,
  board-plays, split and odd-chip cases), pots (side pots, folded contributions, uncalled bets), table (blinds,
  heads-up order, min-raise and incomplete all-in, street closing, showdown order and mucking, timeouts and time bank,
  sit-out/waiting for BB, rebuy, persistence round-trip mid-hand), ai (never sees hidden cards; legal actions only;
  personalities differ), accounts (guest, migration, IP suggestion rules and expiry, claims, name protection, email
  link with a locally signed test JWK, merge rules), views (no hidden card ever appears in another recipient's message
  — fuzzed over thousands of random hands), WS integration (2–9 seats, restart mid-hand).
- Service (`npm test` too): config and ipKey, store (batches, crash roll-forward, corrupt-file refusal), firebase-token
  (valid, expired, aud/iss, signature, unverified email, kid rotation), HTTP integration (CORS, auth, suggestions by
  network, claims, limits, body size), email link end to end with a locally signed token (new link, second-device
  merge, mismatch, expiry, flag off), the email sent by the service against a fake Resend (the request's body and
  headers, idempotency and the one retry, the email itself, the token: wrong, malformed, expired, replayed, single
  use, the device code, merge and at-table, every limit and the daily cap across a restart, Resend's 429 / 4xx / 5xx
  / outage, config checks, no address or key in logs, data or a config dump), WebSocket integration with real clients (2-, 6- and 9-seat tables of humans and
  bots, every frame scanned for cards the recipient may not see, chips conserved after every step, reconnect,
  refused actions, protocol limits), graceful restart mid-hand and kill -9 restarts (child process).
- `npm run test:slow`: all 133,784,560 seven-card hands → exact category counts.
- Round 3 added: the saved table holds no hidden card (also checked in the views fuzz), a restore calls the live hand
  off with every chip back, the time bank charged when another seat's stand-up ends the turn, rebuy and top-up
  minimums, blinds when a table drops to two with a waiting big blind, distinct bot names, name-only claims (also over
  a real socket: a claimer never gets the seat, cards or turn), established-only ranking and merges, trusted proxies,
  secrets from files, health 503 on a failing disk, refusal counts, the own-table exemption from the network ban,
  table caps and the unstarted-table expiry, consistent backups and restores.
- Browser: `guandan-kit/harness/holdem/` (`layout.py` checks bets, the dealer button and touch sizes at every seat
  count; `e2e.py email` saves with email with the dealer in resend mode against a local fake Resend that captures
  the link) — Playwright against the local service (the page reads
  `window.__PICASSO_GAMES_ORIGIN`, set by the harness's init script; production uses `https://poker.picasso-lab.com`).

## 14. Service layer as built (additions and clarifications)

Code: `src/config.js`, `src/util.js` (ipKey, rate limits, log), `src/store.js`, `src/accounts.js`,
`src/firebase-token.js`, `src/rooms.js`, `src/protocol.js`, `src/http.js`, `src/ws.js`, `src/server.js`; operations in
`README.md`. Each file's header comment is the reference. Everything below is additive to sections 4-6, 9, 10, 12.

Accounts
- A guest created with no usable name (empty, invalid, or a name protected by an email account) is named
  `Player <4 digits>`. Name rules: trimmed, inner spaces collapsed, 1-24 characters, no control, private-use or
  invisible direction characters. Protection compares NFKC, lower case, without spaces. When two email accounts carry
  the same name, the one linked first holds it; `AccountView.protected` is true only for an email account that holds
  its own name (the other must rename to be protected).
- IP memory records an entry on every authenticated `/v1/session` of a guest, on a successful claim, and when a new
  guest is created with a name the page supplied while `fresh` is not true (a returning Guandan player). A fresh
  browser's new placeholder guest is never recorded. Suggestions use each account's current name and come only with
  a session that creates the account (a fresh browser has no token), so their `sid`s are bounded by the 30/h
  account-creation limit; a request that carries a known token gets `suggestions: []` even with `fresh: true`.
- Claims: `sid`s live in memory only (a restart forgets them; they last 10 minutes anyway) and are single use. A claim
  renames the caller's own account (409 `protected` when an email account holds the name by now) and records it for
  the network; suggestions list each name once. No account is ever deleted or handed over by a claim.
- Email links: `POST /v1/email/start` also answers 400 `bad_email` and 409 `already_linked` (the account already has
  an email). `POST /v1/email/complete` answers `{ ok, name, nameReserved }` (`nameReserved: false` means the name is
  held by another saved account: ask for a new name); it is idempotent for a completed link; 409 `already_linked`
  when the guest got another email meanwhile; 409 `at_table` when the guest that would be merged is seated at a
  Hold'em table (its stack would otherwise be lost; the link stays valid, so completing again after leaving works).
  `auth_time` must be within the last hour. A done link hands out its token once (the next poll is 404 `expired`);
  the device token that started the link is retired when the link saved that same account. A wrong `poll` secret
  answers exactly like an unknown link. With the flag off, complete, redeem and poll also answer 403 `disabled`. The
  raw email is never stored (masked form + HMAC only). A link sent by the service (4.4.1) can be redeemed whatever
  the sender is now (a rollback to Firebase leaves emailed links working until they expire); a Firebase link has no
  token and can only be completed with an ID token. A saved account bound through a token has `email.uid: null`.
- Hourly sweep (and at start): IP entries older than 30 days, expired links and claims, and pristine guests not seen
  for 90 days are deleted.
- `POST /v1/guandan/round` answers `{ ok: true, duplicate: true }` for a round already counted; `round` must be an
  integer, `place` 0-9 or absent.
- Leaderboards: every row and the `me` row carry `rank` (`me.rank` is null without games, and for Hold'em until the
  account is established; the response's `rule` says when: 3 days, 50 hands). Hold'em ties break by more hands,
  Guandan ties by fewer rounds.

HTTP
- Requests carrying an `Origin` that is not allow-listed are refused with 403 `origin` (not merely left without CORS
  headers); requests without `Origin` (health checks, curl) are served. Errors: 400 `bad_json` / `bad_request` /
  `bad_name` / `bad_email`, 401 `auth` / `bad_token`, 404 `not_found` / `expired`, 405 `method_not_allowed`, 413
  `too_large`, 429 `rate_limited` (with `Retry-After`), 500 `server_error`. Responses are `Cache-Control: no-store`.
- `POST /v1/signout` also closes that token's sockets (code 4001).

WebSocket
- The `Origin` header is required (403 otherwise); at most 100 sockets per ipKey; the server pings every 30 s and
  drops dead sockets, and drops a socket that stops reading (more than 1 MB waiting to be sent; it reconnects). A failed `hello` answers `{ t:"error", code:"bad_token", re:"hello" }` and closes with 1008 (the
  page reconnects with whatever token it then holds). More error codes: `bad_json`, `bad_message` (any message that
  fails validation; unknown fields are ignored), `no_hello`, `already_hello`, `bad_settings`, `bad_seat`, `not_seated`,
  `too_many_tables`, `no_account`, `restarting`, `server_error`, plus every engine code (section 8).
- A socket whose account is deleted (merged by an email link, or replaced by a claim) is closed with 4001.
- `create` sends `created`, then the creating socket watches the table and gets its first `state`. Practice: the
  table is 6-max whatever `seats` says, the creator sits at seat 0 with the default buy-in (error
  `insufficient_chips` below the minimum buy-in, `name_protected` for a protected name), 5 bots fill the other seats
  and the table starts. `{ t:"host", op:"fillBots", count? }` takes an optional count (1-8).
- Presence (rooms): the host keeps the role while any of its sockets is on the table, seated or not. A host whose
  last socket leaves without a seat hands it on at once (`releaseHost`), a seated host after 60 s without a socket
  (it may be reconnecting), an unseated host found gone after a restart after 15 s. While no hand is live (the
  waiting phase, or a running table that cannot deal, e.g. one human left), where no timers run, a seated human with
  no socket for 10 minutes is stood up (which lets the idle close run). An account creates or hosts at most 3 open
  tables (a creator who handed the host role on still counts; `too_many_tables`) and sits at most at 4
  (`too_many_seats`); one network creates at most 30 open tables (`too_many_tables_net`); a table that never started
  closes as `idle` 30 minutes after it was created (buy-ins back).
- Table codes are the only gate to a private table: an account that misses (`watch` of an unknown code) more than 30
  times in a minute has its socket closed (1008 `too_many_misses`). Since guests are free, misses also count per
  network (ipKey): more than 60 in a minute closes the socket, and after 600 in a day that network cannot look a
  table up by code until the day is over (each `watch` is refused with `too_many_misses`), except its own tables: an
  account seated at the table, its host or creator, or one that watched it before always gets back in (a Wi-Fi blip
  never locks a player out of its seat). With 32^5 codes and at most 200 tables, a network finds a given private
  table with a chance of about 0.4 % a day.
- Every `state` is built per recipient by `views.js`; the public part is serialized once per change. `{ t:"account" }`
  is pushed after every table step that moved that account's bankroll or records, and after HTTP changes (name,
  refill, Guandan round, email link).

Persistence
- Each file is an envelope `{ v: 1, gen, batch: [names], savedAt, data }`. A flush writes every dirty file as one
  batch: all temp files written and fsynced first, then each renamed into place (the previous file hard-linked to
  `.bak` first), then the directory fsynced. At start, a batch interrupted between its renames is rolled forward from
  its complete temp files and an incomplete one is discarded, so `accounts.json` and `tables.json` always describe the
  same moment (a kill -9 never creates or destroys chips; tested). A missing file whose `.bak` exists also refuses
  the start. An uncaught exception exits without writing (the last batch is consistent and at most 200 ms old).
  `store.health()`: a change that has waited more than 10 s for the disk makes `/v1/health` answer 503; a failing
  write is logged at once and then once a minute. `src/backup.js` copies both files from one moment (it reads them
  again when a flush landed in between; the IP memory is left out) and restores both as one batch.
- Config adds `HOST` (default `127.0.0.1`; the image sets `0.0.0.0`) and `PACE_SCALE` (tests only: scales the
  engine's pacing pauses; action timers are never scaled). Production refuses secrets shorter than 32 characters,
  equal to each other or still holding a placeholder.
- Browser test hooks (`src/test-hooks.js`): only with `HOLDEM_TEST_HOOKS=1`, which production refuses at startup, and
  only for loopback callers. `GET /__test/hands?code=` returns every recent hand's dealt hole cards (the ground truth
  the browser suite checks every received frame against) and `POST /__test/deck` rigs the next hand of a table (side
  pots, splits, quads on demand); `POST /__test/hold-writes { ms }` keeps changes off the disk for a while so a
  kill -9 can be tested at its worst. `FIREBASE_JWKS_URL` (hooks only, loopback URL) points the production key fetcher
  at a local JWK set so the email link can be completed in a browser with a locally signed ID token, and
  `RESEND_API_URL` (hooks only, loopback URL) sends the service's emails to a local fake Resend.

