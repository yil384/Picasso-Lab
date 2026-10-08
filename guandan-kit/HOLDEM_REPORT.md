# Hold'em: report for the lead

Branch `cloud/guandan-holdem`, after review round 3 (see `REVIEW-HOLDEM.md` for all three rounds). Sections 1-3
were run on this branch against a local dealer. The dealer is now deployed on picasso and the live suite passed
against it (section 0). Nothing is merged into main.

## 0. Deployed on picasso (2026-10-08)

Steps 4(a), 4(b) and 4(f) are done; 4(c) merge and 4(d) email are not. `EMAIL_LINK` is off.

| What | Where |
| --- | --- |
| Service | `~/workspace/holdem-dealer` (rsync of `events/holdem-dealer` at this branch), compose project `holdem-dealer`, container `holdem-dealer-holdem-dealer-1`, image `picasso/holdem-dealer:latest`, `restart: unless-stopped` |
| Network | on `fras_default` as `holdem-dealer:8787`; **no host port** (stricter than a loopback or 172.24.0.1 port); `TRUST_PROXY=fras-caddy-1` |
| Secrets | `./secrets/games_secret`, `./secrets/ip_salt` (made on picasso by `ops/secrets.sh`, folder 700, never printed); `.env` 600 holds no secret; `docker inspect` shows neither |
| Data | volume `holdem-dealer_holdem-data` = bind of `~/workspace/holdem-dealer/data` (owner uid 1000, mode 700) on the NVMe root disk, not `/ssd2` (below) |
| Caddy | block `poker.picasso-lab.com` from `events/holdem-dealer/Caddyfile.snippet`, inserted after `play-staging` in `~/workspace/FRAS/caddy-config/Caddyfile` (backup `Caddyfile.bak-20261008-174136`), validated and reloaded in `fras-caddy-1`; Let's Encrypt certificate issued; no other block changed |
| Cron (user `yichen`) | `10 4 * * * .../ops/backup.sh` and `*/5 * * * * .../ops/watchdog.sh`, both also run by hand under cron's bare environment |
| Backups | `~/backups/holdem/` (700, files 600); restore tested twice with the documented command (a backup with 47 accounts and 17 tables came back whole and a saved token still signed in; then the empty pre-test backup wiped every test account, table and the IP memory) |
| State now | healthy, 0 accounts, 0 tables, the IP memory empty; today's backup is that empty state |

Checks after the Caddy reload: `flashevolve`, `tritongym`, `play` and `lab.picasso-lab.com` answer 200; `poker`
`/v1/health` 200, the socket upgrade 101, a foreign Origin 403. Caddy logged no client address for `poker` (only the
ACME validators' addresses while it got the certificate). The service keys networks correctly behind Caddy: a name
recorded from one network is suggested to a fresh browser on that network, not to one on picasso's, a forged
`X-Forwarded-For` from a client changes nothing, and the host reaching the container directly with a forged header is
not believed. The backups hold no card except last hands' public cards (board, shown hands, winners' five).

**Found while measuring, fixed in the deploy:** Docker's root on picasso is `/ssd2`. A write + fsync there (what the
store does on every change, synchronously) took up to 13.6 s in a 150 s probe (median 7 ms, p99 144 ms); on the
root disk max 101 ms, p99 12 ms. With the data on `/ssd2`, a pinger inside the container saw the service freeze for
1.1, 1.8 and 2.5 s during play and a player action waited 4.2 s; every table froze with it, and a freeze longer
than the health timeout could make the watchdog restart the service (calling off hands). The data now lives on the
root disk (`HOLDEM_DATA_DIR`, `ops/datadir.sh`, compose and README updated); in the same two-minute test afterwards
the loopback pinger's worst round trip was 1.5 ms. A follow-up worth doing in code: write the files off the event
loop (async `fs` / a worker), so a slow disk can never stop the tables.

**Live end to end** (`guandan-kit/harness/holdem/prod.py`: the page served from this checkout as
yil384.github.io, talking to the real `https://poker.picasso-lab.com`; restarts over ssh; final run 2026-10-08
11:28-11:38 PDT): **ALL PASS, 84 checks, 0 failures.**

| Scenario | Checks | What |
| --- | --- | --- |
| checker | 10 | the frame checker without a dealt-cards record (production has no test hooks) catches 9 planted leaks |
| latency | 3 | 30 socket pings through Caddy; 20 REST calls |
| heads | 13 | 2 seats, desk + phone; 8 hands, 8 showdowns; reload mid-hand waiting (0.3 s) and on my turn (0.5 s): same hand, same cards, pills back; 20,000 chips conserved |
| headsai | 5 | 2 seats, one human against one AI; 5 hands; the stack goes back to the bankroll |
| six | 11 | 6 seats, 3 humans (desk, portrait, ifr) + 3 AI; 8 hands; a player leaves mid-hand and folds at once, his stack back |
| sidepots | 9 | 2,000 / 1,400 / 800 all in: pots 2,400 + 1,200 paid, 600 uncalled back, pills 主池 / 边池 1, run-outs, 30,000 conserved with rebuys |
| restart | 30 | 3 humans + 3 AI + a spectator; graceful stop, `docker compose kill -s SIGKILL`, and node killed inside the container (Docker restarted it by itself): every time 重新连接中 on every page, the hand called off and announced everywhere, every chip back on the seats, a new hand finishes, all pages agree |
| stalls | 3 | two minutes of 6-seat play with pings from a page (through Caddy) and from inside the container (loopback) |

Every received frame of every page (2,506 frames on 16 pages; 106 dealt seats seen by their owners) was checked: no
page ever got another seat's hole cards outside showdown, an all-in run-out or a voluntary show; no seat's cards
went to two accounts; shown cards matched what their owner was dealt; no card was in two places. Zero console errors
(the restart scenario's 32 Chrome lines for refused reconnects inside the deliberate down windows are excluded, as
in `e2e.py`).

Latency, measured from the Mac that ran the browsers (outside picasso, over the internet): socket ping median 23 ms, p95 31 ms;
action to the state that answers it median 24 ms, p95 35 ms, max 203 ms over 408 actions; REST `/v1/health` with a
new TLS connection each time median 77 ms. Restarts: the service answers again 2.5-2.9 s after the start command
(or the crash), every page is back at the table 3.2-4.9 s after it.

Not tested live: save with email (off), the campus-NAT limits under real load, and Guandan (unchanged by the deploy;
its harness keeps the games service stubbed).

## 0.1 Sign-in email from @picasso-lab.com (Resend), built 2026-10-08, not deployed

With Firebase sending the link, the email comes from `noreply@yichen-5e23e.firebaseapp.com`, not from the lab's
domain. The dealer can now send it itself through Resend (`EMAIL_SENDER=resend`), from
`Picasso Lab <noreply@picasso-lab.com>` (`picasso-lab.com` is already verified in Resend). The link carries a
single-use token (30 minutes) that `account-link.html` redeems at the dealer (`POST /v1/email/redeem`); everything
after that (the 4-digit code on another device, binding, merging, the waiting page's polling) is unchanged, and the
page loads no Firebase script for it. The default stays `EMAIL_SENDER=firebase`, so nothing changes until the steps in
4(d) are done on picasso and the new `account-link.html` / `games-account.js` are on Pages (merge, 4(c)). Rollback:
`EMAIL_SENDER=firebase` and a restart. Limits on top of today's 5 an hour per network: 10 a day per network, 5 a day
per account, per address 3 an hour from one network and 20 a day from all networks (counted by the inbox: a `+tag`
or Gmail dots do not make a new address), 90 a day in all (`EMAIL_DAILY_CAP`, of which 30 are kept for addresses
already saved) and 1500 in any 30 days (`EMAIL_MONTHLY_CAP`); Resend's free tier is 100 a day and 3000 a month, and
FRAS sends from the same domain. The dealer's whole send (one retry included) ends within 9 s and the page waits 20 s
for it. Tests: section 2.

## 1. What works

**Game.** No-Limit Texas Hold'em cash tables for 2 to 9 seats, played on a small dealer service
(`events/holdem-dealer`, Node, one Docker container). The service runs every rule and the deck, and each client
only sees what its seat may see. Table settings: blinds 5/10 to 50/100, buy-in 40 to 100 BB, a 15, 20 or 30 s
action clock and a 0 to 60 s time bank. Private tables use a 5-character code and an invite link; spectators can
watch. There are AI bots in four styles; a bot decides only from its own seat's view.

**Rules.** The engine follows TDA / real NLHE: blinds and the dead button, heads-up order, minimum raises, and
incomplete all-ins that do not reopen betting. It handles side pots, an uncalled bet coming back, the run-out when
everyone is all in, the showdown order with automatic mucks, odd chips, and sit-out with waiting for or posting the
big blind (any dead money goes to the main pot). Players can rebuy (at least the minimum buy-in) or top up between
hands. Two timeouts sit a player out; the time bank is charged whatever ends a turn. A player who stands up and sits
straight back down cannot dodge the big blind. A host can never decide a hand by removing a bot or dissolving the
table.

**Accounts.** One identity serves Guandan and Hold'em. Players start as guests, and the service may suggest a guest
name used before from the same network, which takes effect only when the player clicks it, and then only renames the
player's own account: chips, records, a seat and its cards are never handed to whoever shares the network (moving a
whole account to another device takes "save with email"). "Save with email" sends a
one-time link behind the `EMAIL_LINK` flag, either from `noreply@picasso-lab.com` through Resend (`EMAIL_SENDER=resend`)
or through Firebase Auth (the default), and every save needs a 4-digit code from the device that asked (the link page
fills it in itself on that device). Saved names are protected. There is one free refill a day per
account and five a day per network. Chips are play money only.

**Records.** For Hold'em the service records hands, hands won, net, the biggest pot and showdowns for each account.
The Hold'em ranking lists established accounts only (at least 3 days old and 50 hands) and sorts by net chips won
from established accounts, so neither dumped chips nor a throwaway guest's lucky hands rank. Guandan rounds and wins are self-reported by the page and deduplicated.
Both games have a ranking page.

**Restarts.** Tables, seats and stacks survive a restart and clients reconnect by themselves. The deck and the hole
cards are never written to disk (nobody who can read the server's data volume can see a card), so a hand in progress
at a restart is called off: every chip put in goes back to its seat, nothing is recorded, the pages say so and the
next hand is dealt with the same button. Deploy between sessions when you can.

**Screens.** The Guandan lobby has a game switch with Hold'em tiles. Hold'em has a room screen, a table for
landscape and portrait, a last-hand popup, rules and the ranking. Everything is in Chinese and English and built from
Guandan's own components.

## 2. Test results

After the review of the Resend sender, 2026-10-08 (limits per network, account and inbox, the part of the daily cap
kept for saved addresses, the monthly cap, the mailer's 9 s budget and the page's 20 s wait, unknown outcomes counted,
Outlook markup), against a local dealer and a fake Resend on loopback (no email left the machine):

| suite | result |
| --- | --- |
| `npm test` | 167 tests: 166 pass, 0 fail, 1 skipped (the slow sweep); new `test/email-limits.test.js` 9 tests, each failing on the build before the review |
| `npm run test:slow` | 1 pass |
| `python3 e2e.py` | ALL PASS: 142 checks, 0 failures (checker 8, heads 14, six 12, nine 6, sidepots 14, timeout 15, restart 27, accounts 22, email 24; email's new check: Resend answers after 8.5 s and the page still reaches the sent screen, which the page before the fix did not; email was run again alone after its fake Resend's fixed port turned out to be taken by another program, and now takes a free port) |
| Guandan `python3 mustkeep.py` | 113 pass, 0 failed |
| Guandan `python3 play.py desk 1` | round 1 to the end, no console error, no long task over 50 ms |

After the Resend sender (0.1), 2026-10-08, against a local dealer and a fake Resend on loopback (no email left the
machine):

| suite | result |
| --- | --- |
| `npm test` | 158 tests: 157 pass, 0 fail, 1 skipped (the slow sweep); new `test/email-resend.test.js` 14 tests |
| `npm run test:slow` | 1 pass |
| `python3 e2e.py` | ALL PASS: 141 checks, 0 failures (checker 8, heads 14, six 12, nine 6, sidepots 14, timeout 15, restart 27, accounts 22 with the Firebase sender, email 23 with the Resend sender) |
| Guandan `python3 mustkeep.py` | 113 pass, 0 failed |
| Guandan `python3 play.py desk 2` / `phone 2` | 2 rounds each to the end, no console error (one 52 ms long task on desk) |

`layout.py` and `shots_live.py` were not run again (the table did not change). Screenshots of the email (zh and en,
375 and 1280 px), the sent popup and the link page: `email-*.jpg`, `*-email-sent*.jpg` in `HD_SHOTS`.

Review round 3 (before the Resend sender):

| suite | result |
| --- | --- |
| `cd events/holdem-dealer && npm test` | 144 tests: 143 pass, 0 fail, 1 skipped (the slow sweep, run separately) |
| `npm run test:slow` | 1 pass (all 133,784,560 seven-card hands, exact category counts) |
| `cd guandan-kit/harness/holdem && python3 e2e.py` | ALL PASS: 118 checks, 0 failures, 8 scenarios against the real local dealer (checker 8, heads 14, six 12, nine 6, sidepots 14, timeout 15, restart 27, accounts 22) |
| `python3 layout.py` (portrait, phone, desk, hd; 2-9 seats) | ALL PASS: 110 checks (bets read as their own seat's and clear of other seats and clocks, the dealer button clear of the button seat's clock, betting controls at least 40 CSS px on phones); the build before round 3 fails all three |
| `python3 shots_live.py --lang=both` (5 viewports x zh/en) | 300 screenshots over 10 runs, no failed step, no console error |
| `python3 restart.py phone` | ALL PASS (the hand called off and announced, a new hand dealt, my actions go through) |
| Guandan `python3 play.py desk 1` | round 1 played to the end, no console error, no long task over 50 ms |
| Guandan `python3 mustkeep.py` | 113 pass, 0 failed |

## 3. Open issues

- **A real email is not tested end to end.** The tests send to a fake Resend on loopback (and sign Firebase tokens
  with a local key set). The first real "save with email" after 4(d) is the real test: save one account, check the
  email in Gmail / Outlook / Apple Mail (and the spam folder), and open the link on another device.
- **Resend's quota is shared** with FRAS (same domain, and the same account if FRAS's key is on it). The game stops
  at 90 emails in any 24 hours (`EMAIL_DAILY_CAP`) and 1500 in any 30 days (`EMAIL_MONTHLY_CAP`); lower them if FRAS
  needs more room.
- **The caps can still be used up on purpose, by many networks.** One network sends at most 10 a day and one account
  5, so filling the 60 a day open to new addresses takes at least 6 networks (a VPN or Tor gives many); the 30 kept
  for addresses already saved still let saved players sign in on a new device, and a saved address is refused only
  after 20 in a day. Someone who knows a player's address can, from 2 or more networks, send it 20 emails in a day
  and so block that player's new-device sign-in for the rest of the 24 hours. Made-up addresses bounce, which counts
  against the domain's reputation in Resend. When a cap starts refusing, the log says `email cap reached` once (and
  `email_daily_cap` / `email_monthly_cap` grow under `limited` in `/v1/health`). The email's text is fixed, so the
  service cannot be used to send anything else.
- **Campus NAT.** The per-network limits apply to everyone behind one public address: 30 new accounts an hour,
  5 refills a day, 5 email links an hour, 600 requests a minute, 100 sockets, 30 open tables, and table-code misses
  of 60 a minute and 600 a day (after that, nobody on that network can open a table by code or invite link until the
  day is over; players already at a table, its host and its watchers always get back in). A busy UCSD egress address
  could reach them. Every refusal is now counted: one `rate limited` line a minute in `docker compose logs` (which
  limit, how often, from how many networks) and the totals under `limited` in `/v1/health`. The limits are constants
  in `src/http.js`, `src/ws.js`, `src/rooms.js` and `src/accounts.js`.
- **The IP suggestion is shown to everyone on the same network** (by design; never for email-saved accounts). It
  only ever hands over a name. The privacy note says so.
- **Ranking.** Only established accounts (3 days, 50 hands) rank, so the board is empty for the first 3 days after
  launch; the page says when an account will rank. Dumping from established accounts is still possible, but only as
  fast as their refills (one a day per account, five a day per network).
- **Restarts call off the hand in progress** (chips back). That is the price of keeping no card on disk.
- **The host can read memory.** Anyone with root or the `docker` group on picasso (about 40 accounts) can read the
  service's memory, so the deck is safe from players' devtools and from the data volume, not from a host admin. The
  IP hashes can be reversed by someone who also reads the salt; the privacy note says so. Everything is play money.
- **Guandan records are self-reported** by the page, so they are only as trustworthy as Guandan itself.
- **One instance.** The service keeps its data in two JSON files in `~/workspace/holdem-dealer/data` on picasso's
  root disk (NVMe; not `/ssd2`, whose fsync stalls froze every table, see section 0),
  with at most 200 open tables. That is fine for the lab, but there is no failover. A failing disk shows as 503 /
  unhealthy and in `~/backups/holdem/watchdog.log`; nothing restarts a service that cannot save.
- **Merge order.** Once the merge lands on Pages, the lobby shows the Hold'em tiles. Until the dealer is up they
  show "the table service is unavailable". Deploy first (4a, 4b), then merge (4c).
- **The privacy note (5) needs the owner's approval** before launch (it changed in round 3: the name-only
  suggestion, backups without the IP memory, what a server admin can see).

## 4. What the lead must do

### (a) Deploy the dealer (lab server picasso, Docker)

On picasso, Caddy runs in the container `fras-caddy-1` on the Docker network `fras_default`. The service joins that
network and publishes no port on the host; it believes `X-Forwarded-For` only from `fras-caddy-1`, so nobody on the
host can pose as another network. The secrets are files (`./secrets`, folder 700), never env values.

```sh
# from a checkout of this branch (or main after 4c); the folder name holdem-dealer gives the volume holdem-dealer_holdem-data
rsync -a --exclude node_modules --exclude .env --exclude data --exclude secrets events/holdem-dealer/ picasso:workspace/holdem-dealer/
ssh picasso
cd ~/workspace/holdem-dealer
cp .env.example .env               # TRUST_PROXY=fras-caddy-1, HOLDEM_EDGE_NETWORK=fras_default; EMAIL_LINK off until (d)
ops/secrets.sh                     # makes ./secrets/games_secret and ./secrets/ip_salt once; never overwrites them
docker compose build
ops/datadir.sh                     # makes ./data (HOLDEM_DATA_DIR, owner uid 1000, mode 700) once; never touches it after
docker compose up -d
docker compose ps                  # (healthy) after about 30 s
docker compose exec -T holdem-dealer node src/health.js       # ok
```

Keep `./secrets` stable and private. A new `games_secret` cuts saved accounts off from their emails; a new `ip_salt`
only forgets the IP memory. The service refuses to start on a missing or weak secret. Update later with the same
rsync and `docker compose up -d --build`; tables and stacks survive it, a hand in progress is called off (chips back).

### (b) Caddy (no DNS step)

`poker.picasso-lab.com` already resolves to picasso through the `*.picasso-lab.com` record (no AAAA record). Append
`events/holdem-dealer/Caddyfile.snippet` to the FRAS Caddyfile and reload inside the container (there is no `caddy`
on the host):

```sh
cd ~/workspace/FRAS/caddy-config
cp Caddyfile "Caddyfile.bak-$(date +%Y%m%d-%H%M%S)"
cat ~/workspace/holdem-dealer/Caddyfile.snippet >> Caddyfile
docker exec fras-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec fras-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

The block proxies to `holdem-dealer:8787`, keeps open table sockets through a Caddy reload (`stream_close_delay 5m`)
and keeps client IPs out of Caddy's logs (no access log; its own 502s, when the service is down, are answered by
`handle_errors` and logged at debug level only). Check from outside, the API and the socket (101):

```sh
curl -s https://poker.picasso-lab.com/v1/health
curl --http1.1 -s -i -N --max-time 3 -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Origin: https://yil384.github.io' https://poker.picasso-lab.com/v1/ws | head -1
```

The FRAS Caddy container has no log rotation of its own (its other sites' errors do log IPs); consider
`logging: { driver: json-file, options: { max-size: 10m, max-file: "3" } }` in the FRAS compose file.

### (c) Merge into main without guandan-kit

`guandan-kit/` (specs, harness, review logs, reference images) must never reach main. Nothing else differs outside
`events/`.

```sh
git fetch origin
git checkout main && git pull --ff-only
git merge --no-ff --no-commit origin/cloud/guandan-holdem
git rm -r -q --cached guandan-kit          # unstage the kit
rm -rf guandan-kit                         # and drop its working copy (it stays on the branch)
git status --short | grep guandan-kit      # must print nothing
git commit -m "Merge Hold'em (cloud/guandan-holdem) without guandan-kit"
git push origin main
```

Any later merge of the branch hits a modify/delete conflict on `guandan-kit/`. Resolve it the same way
(`git rm -r -q --cached guandan-kit && rm -rf guandan-kit`).

Keep `events/holdem-dealer/` in main. On Pages it is only static source text (no secrets; `.env`, `secrets/`,
`data/` and `node_modules/` are ignored), and its README is the deploy guide. Excluding it would only make deploying harder.

### (d) Turn on "save with email"

**From noreply@picasso-lab.com through Resend (the owner's choice)** (README "Turn on save with email", DESIGN 4.4.1):

1. Resend → API Keys → Create API key: permission **Sending access**, domain `picasso-lab.com`, a key of its own (not
   FRAS's). Domains → `picasso-lab.com`: open and click tracking off.
2. On picasso, after the update (same rsync as 4(a)):
   ```sh
   cd ~/workspace/holdem-dealer
   ops/secrets.sh          # keeps the two secrets; makes an empty secrets/resend_api_key if there is none; sets modes
   ops/resend-key.sh       # paste the key + Enter (not shown); skip if secrets/resend_api_key already holds it
   ```
3. `.env`: `EMAIL_LINK=on`, `EMAIL_SENDER=resend` (`EMAIL_FROM`, `EMAIL_DAILY_CAP` and `EMAIL_MONTHLY_CAP` have the
   right defaults; lower the two caps if FRAS needs more of Resend's 100 a day and 3000 a month).
4. `docker compose up -d --build --force-recreate` (a hand in progress is called off, chips back).
5. Check: the `dealer listening` log line says `"emailSender":"resend"`; save once in the game with your own address;
   the email comes from `noreply@picasso-lab.com`; `docker compose logs | grep 'sign-in email'` says `sent` (with
   Resend's id) or why not (Resend's status and error name; never the address).

The page side (`games-account.js`, `account-link.html`) goes live on Pages with the merge (4(c)); the old page with
the new dealer in resend mode would still call Firebase, so merge first, then switch `EMAIL_SENDER`.

**Rollback / the Firebase sender:** in the Firebase console of project `yichen-5e23e`: Authentication → Get started
(if needed) → Sign-in method → Email/Password → Enable, and "Email link (passwordless sign-in)" → Save; Settings →
Authorized domains → add `yil384.github.io`; if the Web API key has HTTP-referrer restrictions, allow
`https://yil384.github.io/*`. Then `EMAIL_SENDER=firebase` (or remove the line) and `docker compose up -d`. Links
already sent by Resend keep working until they expire. The service needs outbound HTTPS to `api.resend.com`
(Resend) or `www.googleapis.com` (Firebase's keys).

### (e) Google Sites re-paste list

**Nothing to re-paste.** Against `origin/main` (caad5d9), no pasted embed changed: `git diff --stat origin/main --
events/events.html home people projects nav-frame.html google-sites-picasso-lab-embed.html` is empty. The changed
files are `events/guandan.html` and `events/account-link.html` (standalone GitHub Pages pages, not pasted) and
assets under `events/static/` (`holdem*.js|css`, `games-account.js`, `guandan-lobby.css`,
`guandan-transition.css`, `holdem-sfx/`), which go live on Pages with the merge.

### (f) Backups and the watchdog (cron)

```sh
crontab -e
10 4 * * * /home/yichen/workspace/holdem-dealer/ops/backup.sh
*/5 * * * * /home/yichen/workspace/holdem-dealer/ops/watchdog.sh
```

`ops/backup.sh` writes `~/backups/holdem/holdem-YYYY-MM-DD.json.gz` (folder 700, files 600, yours): both data files
from one moment, without the IP memory; keeps 14 days; logs to `~/backups/holdem/backup.log`. Restore both files
from one backup, never one alone (README "Backup and restore"):

```sh
cd ~/workspace/holdem-dealer && docker compose stop
docker run --rm --network none --user 0 -v holdem-dealer_holdem-data:/data -v ~/backups/holdem:/backup:ro \
  picasso/holdem-dealer:latest node src/backup.js restore /backup/holdem-YYYY-MM-DD.json.gz /data
docker compose start
```

`ops/watchdog.sh` restarts a service that stops answering; one that answers but cannot save (usually a full
disk) is logged to `~/backups/holdem/watchdog.log` and left running, since its memory holds the only copy. Look
now and then: `tail ~/backups/holdem/*.log; df -h ~`.

## 5. Privacy note (shown in the game; for the owner to approve)

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
