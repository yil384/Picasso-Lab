# Picasso Lab games service (Hold'em dealer + accounts)

One Node 22 process that deals No-Limit Texas Hold'em for the Guandan page (`events/guandan.html`) and keeps the
accounts both games share. It is the only authority for Hold'em: the deck, every card, chip, action and timer live
here, and each client receives only its own snapshot (public table + its own hole cards). Play money only: chips
are virtual, cannot be bought, sold or transferred, and have no value.

Design of record: [`DESIGN.md`](DESIGN.md) (architecture, protocol, rules, trust boundaries). Section 14 lists what
the service layer added or settled while it was built.

```
src/engine/   cards, evaluator, pots, table (pure state machine), ai (bots)      src/views.js   the only message builder
src/rooms.js  tables, timers, bots, broadcasts      src/accounts.js  accounts, IP memory, email links, records
src/http.js   REST /v1/*      src/ws.js  socket /v1/ws      src/protocol.js  message validation
src/store.js  accounts.json + tables.json (atomic)  src/firebase-token.js  ID token check   src/config.js  env
src/mailer.js the sign-in email and the Resend call   src/server.js wiring + process signals
```

## Run locally

```sh
cd events/holdem-dealer
npm ci
npm start                       # http://127.0.0.1:8787, data in ./data (dev secrets, EMAIL_LINK off)
curl -s localhost:8787/v1/health
```

For the Guandan page against a local service, allow the page's origin, e.g.
`ALLOWED_ORIGINS=https://yil384.github.io,http://127.0.0.1:* npm start`, and point the page at it with
`window.__PICASSO_GAMES_ORIGIN = "http://127.0.0.1:8787"` (the Playwright harness in `guandan-kit/harness/holdem/`
sets this in an init script). Bots think 0.7-2.4 s; `BOT_THINK_SCALE=0.2` makes local play quicker.

## Test

```sh
npm test            # about 20 s: engine, accounts, tokens, store, HTTP, email links, sockets, restarts
npm run test:slow   # all 133,784,560 seven-card hands (about 2 s)
```

The service tests start real servers on ephemeral ports in temp directories, sign Firebase-style ID tokens with a
locally generated RSA key (the key fetcher is injected), send the sign-in email to a fake Resend (the mailer's
`fetch` is injected; `test/email-resend.test.js`, `test/email-limits.test.js`) and never contact Resend, Firebase, Google or any production
service. The kill -9 test runs the server as a child process.

## Configuration (environment)

| Variable | Default | Meaning |
|---|---|---|
| `GAMES_SECRET` | dev value | 32+ random characters; keys the email hashes. **Required in production.** |
| `IP_SALT` | dev value | 32+ random characters, different from `GAMES_SECRET`; keys the ipKey hash. **Required in production.** |
| `EMAIL_LINK` | `off` | `on` shows "save with email" (after the steps below). |
| `EMAIL_SENDER` | `firebase` | Who sends the sign-in email: `resend` (this service, from `EMAIL_FROM`, through Resend's HTTP API) or `firebase` (the page, through Firebase Auth; also the rollback). Reported as `features.emailSender`. |
| `EMAIL_FROM` | `Picasso Lab <noreply@picasso-lab.com>` | `resend` only: the sender, `Name <address>` or an address on a domain verified in Resend. |
| `EMAIL_DAILY_CAP` | `90` | `resend` only: at most this many emails in any 24 hours, kept across restarts (Resend's free tier is 100 a day, shared with the lab's other senders). A third of it is kept for addresses already saved: new addresses use at most the other two thirds. |
| `EMAIL_MONTHLY_CAP` | `1500` | `resend` only: at most this many emails in any 30 days, kept across restarts (Resend's free tier is 3000 a month for the whole Resend account: leave FRAS its share). |
| `RESEND_API_KEY_FILE` | - | `resend` only, required: a file holding the Resend API key (compose: `./secrets/resend_api_key`). There is no env value for the key; the service reads the file once at startup and never logs or shows it. |
| `RESEND_API_URL` | Resend's | Browser harness only (needs `HOLDEM_TEST_HOOKS=1`): a loopback URL standing in for `https://api.resend.com`. |
| `FIREBASE_PROJECT_ID` | `yichen-5e23e` | Expected `aud` / `iss` of ID tokens. |
| `ALLOWED_ORIGINS` | `https://yil384.github.io` | Comma list; `http://127.0.0.1:*` allows any port. Other origins get 403. |
| `TRUST_PROXY` | `0` | Who may say who the client is (`X-Forwarded-For`): a comma list of addresses, CIDR ranges or host names (re-resolved every 30 s). Production behind Caddy: `fras-caddy-1`. A request from any other peer is keyed by its socket address. `1` (any peer) is for tests and refused with `NODE_ENV=production`. |
| `GAMES_SECRET_FILE` / `IP_SALT_FILE` | - | Files holding the secrets instead of the env values (the deploy: `docker inspect` never shows them). |
| `PORT` / `HOST` | `8787` / `127.0.0.1` | The image sets `HOST=0.0.0.0`; compose publishes nothing on the host (Caddy reaches it on the Docker network). |
| `DATA_DIR` | `./data` (`/data` in production) | `accounts.json`, `tables.json` and their `.bak` copies, mode 600. |
| `BOT_THINK_SCALE` | `1` | Multiplies bots' think delays (tests use 0). |
| `PACE_SCALE` | `1` | Tests only: shortens the pauses between streets and hands. Action timers are never scaled. |
| `HOLDEM_TEST_HOOKS` | `0` | Browser harness only: `1` adds loopback-only `/__test/*` endpoints (dealt cards, rigged decks). Refused in production. |
| `FIREBASE_JWKS_URL` | Google's key set | Browser harness only (needs `HOLDEM_TEST_HOOKS=1`): a loopback URL serving a test JWK set. |

With `NODE_ENV=production` (set in the image) the service refuses to start on a missing, short or placeholder
secret, or any invalid value, and prints every problem.

## Deploy (lab server `picasso`, Docker behind the FRAS Caddy)

On picasso, Caddy runs in the container `fras-caddy-1` (Caddyfile bind-mounted from
`~/workspace/FRAS/caddy-config/Caddyfile`) on the Docker network `fras_default`. The service joins that network and
publishes no port on the host: Caddy reaches it as `holdem-dealer:8787`, and the service believes `X-Forwarded-For`
only from `fras-caddy-1` (`TRUST_PROXY`), so a user on the host who reaches the container cannot pose as another
network. `poker.picasso-lab.com` already resolves to picasso (the `*.picasso-lab.com` record); no DNS change.

```sh
# from a checkout of this branch (or main after the merge): the folder name holdem-dealer gives the volume
# holdem-dealer_holdem-data, which ops/backup.sh expects
rsync -a --exclude node_modules --exclude .env --exclude data --exclude secrets events/holdem-dealer/ picasso:workspace/holdem-dealer/
ssh picasso
cd ~/workspace/holdem-dealer
cp .env.example .env              # EMAIL_LINK stays off until "save with email" below; chmod 600 .env
ops/secrets.sh                    # ./secrets/games_secret and ./secrets/ip_salt (folder 700), made once, kept after;
                                  # an empty ./secrets/resend_api_key until the Resend key goes in (save with email below)
docker compose build
ops/datadir.sh                    # ./data (HOLDEM_DATA_DIR): owner uid 1000, mode 700, made once, kept after
docker compose up -d
docker compose ps                 # STATUS shows (healthy) after about 30 s
docker compose exec -T holdem-dealer node src/health.js       # ok
```

The data files are not in Docker's own volume folder: on picasso that is `/ssd2`, where a write + fsync was measured
taking up to 13.6 s (p99 144 ms), and the service writes synchronously, so every table froze for that long. The
volume `holdem-dealer_holdem-data` is a bind of `HOLDEM_DATA_DIR` (`./data`, on the NVMe root disk: max 101 ms, p99
12 ms); its name is unchanged for the backup and restore commands.

Then the Caddy block ([`Caddyfile.snippet`](Caddyfile.snippet)): back the Caddyfile up, append the block, validate
and reload inside the container (there is no `caddy` on the host):

```sh
cd ~/workspace/FRAS/caddy-config
cp Caddyfile "Caddyfile.bak-$(date +%Y%m%d-%H%M%S)"
cat ~/workspace/holdem-dealer/Caddyfile.snippet >> Caddyfile
docker exec fras-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec fras-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Check from outside, the API and the socket path both (a WebSocket upgrade must answer 101):

```sh
curl -s https://poker.picasso-lab.com/v1/health
curl --http1.1 -s -i -N --max-time 3 -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Origin: https://yil384.github.io' https://poker.picasso-lab.com/v1/ws | head -1
```

Keep the secrets stable: a new `games_secret` breaks the link between saved accounts and their emails; a new
`ip_salt` only forgets the IP memory. `ops/secrets.sh` never overwrites an existing file.

Update: copy the folder again (same rsync), then `docker compose up -d --build` (`ops/datadir.sh` once before, if
`./data` does not exist yet; `ops/secrets.sh` once before, if `./secrets/resend_api_key` does not exist yet: compose
mounts it whatever the sender). The old container gets SIGTERM:
sockets close with 1012 and both files are flushed. **A hand in progress is called off** (the deck and the hole cards
are never written to disk, so no restart can continue it): every chip put in goes back to its seat, nothing is
recorded, the pages say so and a new hand is dealt with the same button. Deploy between sessions when you can.

Logs: `docker compose logs -f` (rotated: 3 x 10 MB). One JSON line per lifecycle event, and while any limit refuses
something, one `rate limited` line a minute saying which limit, how often and from how many networks; the service
never logs IP addresses, email addresses, tokens, keys or cards. With `EMAIL_SENDER=resend` every email gives one line:
`sign-in email sent` with Resend's email id (look it up in the Resend dashboard) and the counts of the last 24 hours
and 30 days, or `sign-in email not sent` with Resend's HTTP status and error name (`invalid_api_key`,
`validation_error`, `rate_limit_exceeded`, `daily_quota_exceeded`, `concurrent_idempotent_requests`, ...; `network` /
`timeout` when Resend did not answer; `"counted":true` when the email may still have gone out). When a shared cap
starts refusing, one `email cap reached` line says which (`daily_new`, `daily`, `monthly`) with the counts: many of
them, or `email_daily_cap` / `email_monthly_cap` growing under `limited` in `/v1/health`, mean someone is using the
form to send emails. Caddy logs no IP either for this site (no access log; its own 502s are
debug-level). The FRAS Caddy container itself has no log rotation: add `logging: { driver: json-file, options:
{ max-size: 10m, max-file: "3" } }` to its compose file when convenient.

What the host can still see: anyone with `docker` or root on picasso can read the service's memory and its volume.
The files hold no card and no IP address, but the IP hashes in `accounts.json` can be reversed by someone who also
reads the salt. Everything is play money.

## Backup and restore

`ops/backup.sh` writes `~/backups/holdem/holdem-YYYY-MM-DD.json.gz` (folder 700, files 600, owned by you): both data
files from one moment (it reads them again when a flush landed in between), without the IP memory. It keeps 14 days
and logs every run to `~/backups/holdem/backup.log`. Cron calls the script (a `%` in a crontab line would cut it):

```sh
crontab -e
10 4 * * * /home/yichen/workspace/holdem-dealer/ops/backup.sh
```

Restore both files from one backup, never one file alone (two files from different moments can create or lose chips):

```sh
cd ~/workspace/holdem-dealer
docker compose stop
docker run --rm --network none --user 0 -v holdem-dealer_holdem-data:/data -v ~/backups/holdem:/backup:ro \
  picasso/holdem-dealer:latest node src/backup.js restore /backup/holdem-YYYY-MM-DD.json.gz /data
docker compose start
```

If the service refuses to start with "not a valid data file", it left the file untouched. Restore both files from the
last backup as above; the `.bak` copies in the volume are only the previous write of each file and need not match.

## Watchdog

Docker restarts a crashed container but not an unhealthy one. `ops/watchdog.sh`, every 5 minutes from cron, asks the
service how it is: no answer (a stuck process) means a restart; "changes not being saved" (usually a full disk; the
data is in `./data` on the root disk) is logged to `~/backups/holdem/watchdog.log` and **not** restarted, since memory then holds the
only copy. A container stopped on purpose is left alone.

```sh
*/5 * * * * /home/yichen/workspace/holdem-dealer/ops/watchdog.sh
```

Look now and then: `tail ~/backups/holdem/*.log` and `df -h ~`.

## Turn on "save with email" (EMAIL_LINK)

The page shows "用邮箱保存" only while `/v1/session` reports `features.emailLink: true` (`EMAIL_LINK=on`). Two senders:

### With Resend: the email comes from noreply@picasso-lab.com (`EMAIL_SENDER=resend`)

`picasso-lab.com` is verified in Resend (DKIM `resend._domainkey`, SPF on `send.picasso-lab.com`). The service sends
the email itself (`POST https://api.resend.com/emails`, from `EMAIL_FROM`, an `Idempotency-Key` per link, one retry
after a network error, a timeout or a 5xx, all within 9 s, which the page outwaits) with a single-use token in the
link; the page never loads Firebase for it.

1. In Resend: API Keys -> Create API key, permission **Sending access**, domain `picasso-lab.com`. Use a key of its
   own (not the one FRAS uses), so it can be revoked alone. In Domains -> `picasso-lab.com`, open and click tracking
   should be off (click tracking would route the sign-in link through Resend's tracking domain).
2. On picasso, put the key in place without it showing on screen or in the shell history:
   ```sh
   cd ~/workspace/holdem-dealer
   ops/secrets.sh                  # once: makes the empty secrets/resend_api_key if there is none, sets the modes
   ops/resend-key.sh               # paste the key, Enter (not echoed); or: ops/resend-key.sh < file
   ```
   A key file made by hand works too (one line, `re_...`); `ops/secrets.sh` then sets its mode to 444 like the other
   two secrets (the folder stays 700), which the container's user needs to read it through the bind mount.
3. In `.env`: `EMAIL_LINK=on`, `EMAIL_SENDER=resend` (and, if they should differ from the defaults, `EMAIL_FROM`,
   `EMAIL_DAILY_CAP`, `EMAIL_MONTHLY_CAP`). Then `docker compose up -d --force-recreate` (the env and the key are read at start; a hand in
   progress is called off, chips back).
4. Check: `docker compose logs --since 2m` has no "invalid configuration" and the `dealer listening` line says
   `"emailSender":"resend"`; `curl -s -X POST -H 'content-type: application/json' -d '{}'
   https://poker.picasso-lab.com/v1/session | grep -o '"features":{[^}]*}'` shows `"emailSender":"resend"` (this makes
   one guest account). Save once in the game with your own address: the email comes from
   `noreply@picasso-lab.com`, and `docker compose logs | grep 'sign-in email'` shows it sent (or why not).

The service needs outbound HTTPS to `api.resend.com`. A wrong or revoked key shows as `sign-in email not sent ...
"status":401` or `403` and the page says the email could not be sent. A new key: `ops/resend-key.sh` again, then
`docker compose up -d --force-recreate`.

Limits: per network 10 a day (on top of 5 links an hour); per asking account 5 a day; per address 3 an hour from one network and 20 a day from all networks together, counted by the inbox (case, a `+tag`, Gmail dots and `googlemail.com` do not make a new address); `EMAIL_DAILY_CAP` (90) in any 24 hours, of which a third (30) is kept for addresses already saved (players signing in on a new device); `EMAIL_MONTHLY_CAP` (1500) in any 30 days. The address and cap counts survive restarts (`accounts.json`: times, keyed inbox hashes and a
count per day, never an address; backups keep the counts, not the hashes); the per-network, per-account and
address-from-one-network counts are kept in memory only. Refusals show under `limited` in `/v1/health`
(`email_network`, `email_account`, `email_address`, `email_daily_cap`, `email_monthly_cap`, `email_provider` when
Resend itself says 429).

### With Firebase Auth (`EMAIL_SENDER=firebase`, the default; also the rollback)

In the Firebase console of project `yichen-5e23e`:

1. Authentication → Get started (if it was never opened).
2. Authentication → Sign-in method → Email/Password → Enable, then also enable "Email link (passwordless sign-in)"
   → Save.
3. Authentication → Settings → Authorized domains → Add domain → `yil384.github.io` (`poker.picasso-lab.com` is not
   needed: the link opens `events/account-link.html` on GitHub Pages).
4. If the Web API key has HTTP-referrer restrictions (Google Cloud Console → APIs & Services → Credentials), allow
   `https://yil384.github.io/*`.

Then set `EMAIL_LINK=on` in `.env` and `docker compose up -d` (a restart; a hand in progress is called off). The email
comes from Firebase (`noreply@yichen-5e23e.firebaseapp.com`). The service verifies each ID token itself (RS256 against
Google's published keys); it needs outbound HTTPS to `www.googleapis.com`.

**Rollback from Resend to Firebase:** the Firebase steps above (once), `EMAIL_SENDER=firebase` in `.env`, `docker
compose up -d`. The page asks the service on every session which sender is on, so nothing on Pages changes. Links
already emailed by Resend keep working until they expire (30 minutes): the service redeems a token whatever the
sender. To turn saving off altogether: `EMAIL_LINK=off`.

## Limits and housekeeping

Bodies ≤ 8 KB; per network (ipKey): 30 new accounts/h, 5 email links/h, 60 link redeems/h, 10 claims/h, 600
requests/min; emails the service sends itself: 10/day per network, 5/day per account, 3/h per address from one
network and 20/day per address in all, `EMAIL_DAILY_CAP` a day (a third kept for saved addresses) and
`EMAIL_MONTHLY_CAP` in 30 days. Sockets:
hello within 10 s, frames ≤ 4 KB, ≤ 40 messages/s, ≤ 100 sockets per network. At most 200 open tables, 30 created
from one network; an account creates or hosts at most 3 and sits at most at 4; a table that never started closes
after 30 minutes. Every refusal is counted per limit (`limited` in `/v1/health`, and the minute log line). Hourly:
IP memory older than 30 days, expired links and claims, and guest accounts that never played and were not seen for
90 days are deleted.
