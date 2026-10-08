# Hold'em: report for the lead

Branch `cloud/guandan-holdem`, after review round 2 (see `REVIEW-HOLDEM.md` for both review rounds). Everything
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
big blind (any dead money goes to the main pot). Players can rebuy or top up between hands. Two timeouts sit a
player out. A player who stands up and sits straight back down cannot dodge the big blind. A host can never decide
a hand by removing a bot or dissolving the table.

**Accounts.** One identity serves Guandan and Hold'em. Players start as guests, and the service may suggest a guest
name used before from the same network, which takes effect only when the player clicks it. "Save with email" uses a
Firebase email link behind the `EMAIL_LINK` flag, and every save needs a 4-digit code from the device that asked
(the link page fills it in itself on that device). Saved names are protected. There is one free refill a day per
account and five a day per network. Chips are play money only.

**Records.** For Hold'em the service records hands, hands won, net, the biggest pot and showdowns for each account.
The Hold'em ranking sorts by net chips won from established accounts (at least 3 days old and 50 hands), so chips
dumped from new guest accounts never rank. Guandan rounds and wins are self-reported by the page and deduplicated.
Both games have a ranking page.

**Restarts.** Tables survive a restart: a live hand resumes and clients reconnect by themselves. After a crash, a
time bank that was running is charged up to the restore.

**Screens.** The Guandan lobby has a game switch with Hold'em tiles. Hold'em has a room screen, a table for
landscape and portrait, a last-hand popup, rules and the ranking. Everything is in Chinese and English and built from
Guandan's own components.

## 2. Test results (final runs, tree at c82d4b8 plus this report)

| suite | result |
| --- | --- |
| `cd events/holdem-dealer && npm test` | 125 tests: 124 pass, 0 fail, 1 skipped (the slow sweep, run separately) |
| `npm run test:slow` | 1 pass (all 133,784,560 seven-card hands, exact category counts) |
| `cd guandan-kit/harness/holdem && python3 e2e.py` | ALL PASS: 111 checks, 0 failures, 8 scenarios against the real local dealer (checker 8, heads 14, six 12, nine 6, sidepots 14, timeout 15, restart 21, accounts 21) |
| `python3 shots_live.py` (5 viewports x zh/en) | 380 screenshots over 13 runs, no failed step, no console error |
| Guandan `python3 play.py desk 1` | round 1 played to the end, no console error, no long task over 50 ms |
| Guandan `python3 mustkeep.py` | 113 pass, 0 failed (two runs); a first run missed one timing check (phone/room, the return film's 11 s navigation wait), which also happened in round 1, in code this work does not touch |

## 3. Open issues

- **Google's live keys and a real email link are not tested end to end.** The tests sign tokens with a local key
  set. The first real "save with email" after the Firebase steps (4d) is the real test: save one account and open
  the link on another device.
- **Campus NAT.** The per-network limits apply to everyone behind one public address: 30 new accounts an hour,
  5 refills a day, 5 email links an hour, 600 requests a minute, 100 sockets, and table-code misses of 60 a minute
  and 600 a day (after that, nobody on that network can open a table by code or invite link until the day is
  over). A busy UCSD egress address could reach them. Watch the logs after launch. The limits are constants in
  `src/http.js`, `src/ws.js`, `src/rooms.js` and `src/accounts.js`.
- **The IP suggestion is shown to everyone on the same network** (by design; never for email-saved accounts). The
  privacy note says so.
- **Ranking.** A new player's losses do not count toward anyone's ranked net in their first 3 days or 50 hands.
  Dumping from established accounts is still possible, but only as fast as their refills (one a day per account,
  five a day per network).
- **Guandan records are self-reported** by the page, so they are only as trustworthy as Guandan itself.
- **One instance.** The service keeps its data in two JSON files on one volume, with at most 200 open tables. That
  is fine for the lab, but there is no failover.
- **Merge order.** Once the merge lands on Pages, the lobby shows the Hold'em tiles. Until the dealer is up they
  show "the table service is unavailable". Deploy first (4a, 4b), then merge (4c).
- **The privacy note (5) needs the owner's approval** before launch.

## 4. What the lead must do

### (a) Deploy the dealer (lab server, Docker)

```sh
# from a checkout of this branch (or main after 4c); the folder name sets the volume name used in (f)
rsync -a --exclude node_modules --exclude .env --exclude data events/holdem-dealer/ <server>:/srv/holdem-dealer/
ssh <server>
cd /srv/holdem-dealer
cp .env.example .env
sed -i "s|^GAMES_SECRET=.*|GAMES_SECRET=$(openssl rand -base64 48)|; s|^IP_SALT=.*|IP_SALT=$(openssl rand -base64 48)|" .env
chmod 600 .env                      # EMAIL_LINK stays off until (d); ALLOWED_ORIGINS / TRUST_PROXY=1 are preset
docker compose up -d --build
docker compose ps                   # (healthy) after about 30 s
curl -s 127.0.0.1:8787/v1/health    # {"ok":true,"tables":0,"players":0,"uptime":...}
```

Keep `.env` stable and private. Changing `GAMES_SECRET` cuts saved accounts off from their emails; changing
`IP_SALT` only forgets the IP memory. The service refuses to start on a missing or weak secret. Update later with
`docker compose up -d --build`; tables survive it.

### (b) DNS and Caddy

1. Add a DNS A record `poker.picasso-lab.com` pointing to the server's public IPv4 (and an AAAA record if it has
   IPv6). Ports 80 and 443 must be reachable so Caddy can get the certificate.
2. Add this block (also in `events/holdem-dealer/Caddyfile.snippet`, DESIGN section 12) to the server's Caddyfile:

   ```
   poker.picasso-lab.com {
       encode zstd gzip
       reverse_proxy 127.0.0.1:8787
       log {
           output discard
       }
   }
   ```
3. Run `caddy reload --config /etc/caddy/Caddyfile`, then from outside:
   `curl -s https://poker.picasso-lab.com/v1/health`.

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

Keep `events/holdem-dealer/` in main. On Pages it is only static source text (no secrets; `.env`, `data/` and
`node_modules/` are ignored), and its README is the deploy guide. Excluding it would only make deploying harder.

### (d) Turn on "save with email"

In the Firebase console of project `yichen-5e23e` (DESIGN 4.4, README "Turn on save with email"):

1. Authentication → Get started (if it was never opened).
2. Authentication → Sign-in method → Email/Password → Enable, then also enable "Email link (passwordless sign-in)"
   → Save.
3. Authentication → Settings → Authorized domains → Add domain → `yil384.github.io`.
4. If the Web API key has HTTP-referrer restrictions (Google Cloud Console → APIs & Services → Credentials), allow
   `https://yil384.github.io/*`.

Then, on the server, set `EMAIL_LINK=on` in `.env` and run `docker compose up -d` (this recreates the container
with the new env). The service needs outbound HTTPS to `www.googleapis.com` for Google's keys. Check: the 账号 popup
in the game now offers 用邮箱保存. Save once with your own address and open the link on a second device; it should
ask for the code shown on the first.

### (e) Google Sites re-paste list

**Nothing to re-paste.** Against `origin/main` (caad5d9), no pasted embed changed: `git diff --stat origin/main --
events/events.html home people projects nav-frame.html google-sites-picasso-lab-embed.html` is empty. The changed
files are `events/guandan.html` and `events/account-link.html` (standalone GitHub Pages pages, not pasted) and
assets under `events/static/` (`holdem*.js|css`, `games-account.js`, `guandan-lobby.css`,
`guandan-transition.css`, `holdem-sfx/`), which go live on Pages with the merge.

### (f) Backups of the /data volume

Everything lives in the named volume `holdem-dealer_holdem-data` (`accounts.json`, `tables.json`, each written
atomically). A daily copy is enough:

```sh
# cron, e.g. 04:10 every day
docker run --rm -v holdem-dealer_holdem-data:/data:ro -v /srv/backups/holdem:/backup alpine \
  sh -c 'tar czf /backup/holdem-$(date +%F).tgz -C /data accounts.json tables.json'
find /srv/backups/holdem -name 'holdem-*.tgz' -mtime +30 -delete

# restore
docker compose stop
docker run --rm -v holdem-dealer_holdem-data:/data -v /srv/backups/holdem:/backup alpine \
  sh -c 'tar xzf /backup/holdem-YYYY-MM-DD.tgz -C /data && chown 1000:1000 /data/*.json && chmod 600 /data/*.json'
docker compose start
```

`accounts.json` holds email hashes and masked addresses, so keep the backups as private as `.env`. If the service
refuses a damaged file, the previous good copy is `<name>.json.bak` in the same volume.

## 5. Privacy note (shown in the game; for the owner to approve)

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
