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
| `TRUST_PROXY` | `0` | `1` behind Caddy: the client address is the right-most `X-Forwarded-For` entry. |
| `PORT` / `HOST` | `8787` / `127.0.0.1` | The image sets `HOST=0.0.0.0`; compose publishes only on `127.0.0.1`. |
| `DATA_DIR` | `./data` (`/data` in production) | `accounts.json`, `tables.json` and their `.bak` copies, mode 600. |
| `BOT_THINK_SCALE` | `1` | Multiplies bots' think delays (tests use 0). |
| `PACE_SCALE` | `1` | Tests only: shortens the pauses between streets and hands. Action timers are never scaled. |

With `NODE_ENV=production` (set in the image) the service refuses to start on a missing, short or placeholder
secret, or any invalid value, and prints every problem.

## Deploy (lab server, Docker behind Caddy)

```sh
git clone https://github.com/yil384/Picasso-Lab.git && cd Picasso-Lab/events/holdem-dealer   # or git pull
cp .env.example .env
sed -i "s|^GAMES_SECRET=.*|GAMES_SECRET=$(openssl rand -base64 48)|; s|^IP_SALT=.*|IP_SALT=$(openssl rand -base64 48)|" .env
chmod 600 .env
docker compose up -d --build
docker compose ps                      # STATUS shows (healthy) after about 30 s
curl -s 127.0.0.1:8787/v1/health       # {"ok":true,"tables":0,"players":0,"uptime":...}
```

Then add [`Caddyfile.snippet`](Caddyfile.snippet) to the Caddyfile (`poker.picasso-lab.com` → `127.0.0.1:8787`,
access logs discarded), point the DNS name at the server and `caddy reload`. Check from outside:
`curl -s https://poker.picasso-lab.com/v1/health`.

Keep the secrets stable: changing `GAMES_SECRET` breaks the link between saved accounts and their emails;
changing `IP_SALT` only forgets the IP memory.

Update: `git pull && docker compose up -d --build`. The old container gets SIGTERM: sockets close with 1012, both
files are flushed, the new container restores every table (a live hand resumes; the player to act gets a fresh
timer) and the clients reconnect by themselves.

Logs: `docker compose logs -f`. One JSON line per lifecycle event; the service never logs IP addresses, tokens or
cards.

## Backup and restore

Everything is in the named volume (`holdem-dealer_holdem-data` when compose runs from this directory). A daily copy
is enough; files are always complete on disk (written to a temp file, fsynced, renamed).

```sh
# backup (cron, e.g. 04:10 every day)
docker run --rm -v holdem-dealer_holdem-data:/data:ro -v /srv/backups/holdem:/backup alpine \
  sh -c 'tar czf /backup/holdem-$(date +%F).tgz -C /data accounts.json tables.json'
find /srv/backups/holdem -name 'holdem-*.tgz' -mtime +30 -delete

# restore
docker compose stop
docker run --rm -v holdem-dealer_holdem-data:/data -v /srv/backups/holdem:/backup alpine \
  sh -c 'tar xzf /backup/holdem-2026-10-08.tgz -C /data && chown 1000:1000 /data/*.json && chmod 600 /data/*.json'
docker compose start
```

If the service refuses to start with "not a valid data file", it left the file untouched; the previous good copy is
`<name>.json.bak` in the same volume. Copy it over the broken file (or restore a backup) and start again.

## Turn on "save with email" (EMAIL_LINK)

In the Firebase console of project `yichen-5e23e`:

1. Authentication → Get started (if it was never opened).
2. Authentication → Sign-in method → Email/Password → Enable, then also enable "Email link (passwordless sign-in)"
   → Save.
3. Authentication → Settings → Authorized domains → Add domain → `yil384.github.io` (`poker.picasso-lab.com` is not
   needed: the link opens `events/account-link.html` on GitHub Pages).
4. If the Web API key has HTTP-referrer restrictions (Google Cloud Console → APIs & Services → Credentials), allow
   `https://yil384.github.io/*`.

Then set `EMAIL_LINK=on` in `.env` and `docker compose up -d` (a restart). The page shows "用邮箱保存" only while
`/v1/session` reports `features.emailLink: true`. The service verifies each ID token itself (RS256 against
Google's published keys); it needs outbound HTTPS to `www.googleapis.com`.

## Limits and housekeeping

Bodies ≤ 8 KB; per network (ipKey): 30 new accounts/h, 5 email links/h, 10 claims/h, 600 requests/min. Sockets:
hello within 10 s, frames ≤ 4 KB, ≤ 40 messages/s, ≤ 100 sockets per network. At most 200 open tables and 3 hosted
by one account. Hourly: IP memory older than 30 days, expired links and claims, and guest accounts that never
played and were not seen for 90 days are deleted.
