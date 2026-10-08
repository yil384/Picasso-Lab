# Hold'em: report for the lead

Branch `cloud/guandan-holdem`, after review round 3 (see `REVIEW-HOLDEM.md` for all three rounds). Everything
below was run on this branch; nothing has been deployed and nothing touched production.

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
whole account to another device takes "save with email"). "Save with email" uses a
Firebase email link behind the `EMAIL_LINK` flag, and every save needs a 4-digit code from the device that asked
(the link page fills it in itself on that device). Saved names are protected. There is one free refill a day per
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

## 2. Test results (final runs, review round 3)

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

- **Google's live keys and a real email link are not tested end to end.** The tests sign tokens with a local key
  set. The first real "save with email" after the Firebase steps (4d) is the real test: save one account and open
  the link on another device.
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
- **One instance.** The service keeps its data in two JSON files on one volume (on `/ssd2`, 96% full when checked),
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
docker compose up -d --build
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

In the Firebase console of project `yichen-5e23e` (DESIGN 4.4, README "Turn on save with email"):

1. Authentication → Get started (if it was never opened).
2. Authentication → Sign-in method → Email/Password → Enable, then also enable "Email link (passwordless sign-in)"
   → Save.
3. Authentication → Settings → Authorized domains → Add domain → `yil384.github.io`.
4. If the Web API key has HTTP-referrer restrictions (Google Cloud Console → APIs & Services → Credentials), allow
   `https://yil384.github.io/*`.

Then, on the server, set `EMAIL_LINK=on` in `.env` and run `docker compose up -d` (this recreates the container
with the new env; a hand in progress is called off, chips back). The service needs outbound HTTPS to `www.googleapis.com` for Google's keys. Check: the 账号 popup
in the game now offers 用邮箱保存. Save once with your own address and open the link on a second device; it should
ask for the code shown on the first.

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
`/ssd2`) is logged to `~/backups/holdem/watchdog.log` and left running, since its memory holds the only copy. Look
now and then: `tail ~/backups/holdem/*.log; df -h /ssd2`.

## 5. Privacy note (shown in the game; for the owner to approve)

ZH: 隐私说明：为了让你换浏览器时能一键用回原来的昵称，游戏服务会把你的网络地址做加盐哈希（不保存、不记录原始 IP），并记住最近
30 天里在这个网络用过的游客昵称，30 天后自动删除，备份里也不保留。新浏览器只会看到"继续使用昵称 X？"的建议，必须由你点一下才会生效，
而且只换昵称：筹码、战绩和座位都不会跟过来（想在别的设备上用同一个账号，请用邮箱保存）。同一校园网或路由器下的人也可能看到同样的建议，
所以绑定了邮箱的账号的昵称永远不会这样被推荐。邮箱只用于发送登录链接，我们只保存脱敏地址和一个哈希。能管理这台服务器的人在技术上可以从
哈希反推出网络地址。所有筹码都是虚拟的，不能购买、出售或转让，没有任何价值。

EN: Privacy: so you can pick your name up again in a new browser, the game service keeps a salted hash of your network
address (never the raw IP) together with the guest names used from that network in the last 30 days, and deletes it
after 30 days; backups never hold it. A new browser only sees a "Use the name X?" suggestion, nothing happens until you
click it, and a click only takes the name: chips, records and seats stay with their account (to use one account on
several devices, save it with an email). People on the same campus network or router may see the same suggestion, so
the name of an email-saved account is never suggested. Your email is used only to send the sign-in link; we keep a
masked form and a hash. Whoever administers the server could technically work a network address back out of its hash.
All chips are play money: they cannot be bought, sold or transferred and have no value.
