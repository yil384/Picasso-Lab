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
src/server.js wiring + process signals
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
locally generated RSA key (the key fetcher is injected) and never contact Firebase, Google or any production
service. The kill -9 test runs the server as a child process.

## Configuration (environment)

| Variable | Default | Meaning |
|---|---|---|
| `GAMES_SECRET` | dev value | 32+ random characters; keys the email hashes. **Required in production.** |
| `IP_SALT` | dev value | 32+ random characters, different from `GAMES_SECRET`; keys the ipKey hash. **Required in production.** |
| `EMAIL_LINK` | `off` | `on` shows "save with email" (after the Firebase steps below). |
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
cp .env.example .env              # EMAIL_LINK stays off until "save with email" below
ops/secrets.sh                    # ./secrets/games_secret and ./secrets/ip_salt (folder 700), made once, kept after
docker compose up -d --build
docker compose ps                 # STATUS shows (healthy) after about 30 s
docker compose exec -T holdem-dealer node src/health.js       # ok
```

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

Update: copy the folder again (same rsync), then `docker compose up -d --build`. The old container gets SIGTERM:
sockets close with 1012 and both files are flushed. **A hand in progress is called off** (the deck and the hole cards
are never written to disk, so no restart can continue it): every chip put in goes back to its seat, nothing is
recorded, the pages say so and a new hand is dealt with the same button. Deploy between sessions when you can.

Logs: `docker compose logs -f` (rotated: 3 x 10 MB). One JSON line per lifecycle event, and while any limit refuses
something, one `rate limited` line a minute saying which limit, how often and from how many networks; the service
never logs IP addresses, tokens or cards. Caddy logs no IP either for this site (no access log; its own 502s are
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
volume is on `/ssd2`) is logged to `~/backups/holdem/watchdog.log` and **not** restarted, since memory then holds the
only copy. A container stopped on purpose is left alone.

```sh
*/5 * * * * /home/yichen/workspace/holdem-dealer/ops/watchdog.sh
```

Look now and then: `tail ~/backups/holdem/*.log` and `df -h /ssd2`.

## Turn on "save with email" (EMAIL_LINK)

In the Firebase console of project `yichen-5e23e`:

1. Authentication → Get started (if it was never opened).
2. Authentication → Sign-in method → Email/Password → Enable, then also enable "Email link (passwordless sign-in)"
   → Save.
3. Authentication → Settings → Authorized domains → Add domain → `yil384.github.io` (`poker.picasso-lab.com` is not
   needed: the link opens `events/account-link.html` on GitHub Pages).
4. If the Web API key has HTTP-referrer restrictions (Google Cloud Console → APIs & Services → Credentials), allow
   `https://yil384.github.io/*`.

Then set `EMAIL_LINK=on` in `.env` and `docker compose up -d` (a restart; a hand in progress is called off). The page shows "用邮箱保存" only while
`/v1/session` reports `features.emailLink: true`. The service verifies each ID token itself (RS256 against
Google's published keys); it needs outbound HTTPS to `www.googleapis.com`.

## Limits and housekeeping

Bodies ≤ 8 KB; per network (ipKey): 30 new accounts/h, 5 email links/h, 10 claims/h, 600 requests/min. Sockets:
hello within 10 s, frames ≤ 4 KB, ≤ 40 messages/s, ≤ 100 sockets per network. At most 200 open tables, 30 created
from one network; an account creates or hosts at most 3 and sits at most at 4; a table that never started closes
after 30 minutes. Every refusal is counted per limit (`limited` in `/v1/health`, and the minute log line). Hourly:
IP memory older than 30 days, expired links and claims, and guest accounts that never played and were not seen for
90 days are deleted.
