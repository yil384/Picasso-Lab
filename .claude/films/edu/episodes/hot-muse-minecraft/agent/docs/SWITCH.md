<!-- docs/SWITCH.md - the runbook for switching production (play.picasso-lab.com) to the Mine AI MCP body (BODY=mineai): pre-checks, the deploy with the production config, the proxy secret and the Paper whitelist (ROADMAP M0 items 6 and 7), the switch, the smoke checks, the one-line rollback, with the expected output of each command. -->
# Switching production to the Mine AI MCP body

**Done 2026-10-08 (23:51-23:58 UTC): production plays with `BODY=mineai`; every step's checks passed (README, "The
switch").** The undo of each step below stays valid; the rollback is section 5.

The go/no-go report (`../../../../research/muse-reuse-validation.md`) asks for three gates before production plays
with `BODY=mineai`. Gate 1 (the production config) and gate 3 (the two runtime patches, 0007 and 0008) are in this
commit; gate 2 is the soak on staging and one Muse run: the scripted soak passed on 2026-10-08 (the agent's README,
"Gates before the switch": 10 of 10 one at a time, 6 of 8 at once, a whole 30-minute lease, 0 restarts), and so did the
owner's Muse run the same day (game g38e5ef: the iron pickaxe 3:34 after start_game, 12 MCP calls, 0 transport
failures, 0 heartbeat misses or restarts, no death; README, "The Muse run on staging"). The owner chose to fix what
Muse found first (branch `muse-fix`: stable step numbers, each step's own use and gain apart from the rest, smelt's
limit, `collect cobblestone`, the skill list, `NOT_HUNGRY`, patch 0009; after its review, `BODY_RESTARTED`, call
headers, the `craft_batch` notes and patch 0010, a build that stopped the runtime), deploy that to staging, run Muse
again, and then switch. The `muse-fix` build has run on staging since 2026-10-08 (commit `02ad527`): Muse's calls
replayed through the public `/mcp` at two fresh spots (11 of 11 reply checks each), the strict iron route 5 of 5 one
at a time and 4 of 6 and 6 of 8 at once, 0 heartbeat misses, restarts or watchdog stops in 23 games, 1 death (a zombie
in shade); README, "The review of the fixes and the re-check on staging". The Muse re-test on staging with that build
passed too (game `g42b738`, 2026-10-08 23:40 UTC: the iron pickaxe 3:16 after `start_game`, every step of the iron
route ok, no death, 0 heartbeat misses or restarts; `docs/MUSE-TEST.md`, "Runs"): gate 2 passed.

Production is `play.picasso-lab.com` on picasso: compose project `muse-minecraft`, code in
`~/workspace/muse-minecraft/app`, its world in `app/data`, logs in `app/logs`, the agent on `172.24.0.1:7850` behind
the FRAS Caddy (`~/workspace/FRAS/caddy-config/Caddyfile`, container `fras-caddy-1`). Commands marked "Mac" run in this
agent folder; the others on picasso (`ssh picasso`).

The steps go in this order and each one leaves production working. Every step that restarts the agent or Paper ends
the games in progress, so each starts with the idle check of section 1. Apart from the deploy itself (`push.sh`), the
agent is only ever recreated with `deploy/recreate.sh`, which checks again and stops while a bot is in use (it also
recreates a running stream or camera with the agent: they live in its network namespace, and a bare `docker compose
up -d --no-deps --force-recreate agent` leaves them in the removed one's, cut off without an error). Each Caddy reload (step 3) closes every WebSocket that
Caddy proxies on picasso: open live views (`/watch`, `/eyes`) on play and play-staging drop and reconnect, and so do
other sites' sockets (the web IDEs); reload only while production is idle.

| Step | What changes | Visitors notice |
| --- | --- | --- |
| 2. Deploy (gate 1) | the code of this commit, the image with the runtime, an init, the bot data folder, the Paper whitelist; still our body | games in progress end once |
| 3. Proxy secret | Caddy sends a secret; the agent believes forwarded addresses only with it | games in progress end once (3b's agent recreate, and its undo); open live views drop at each Caddy reload and reconnect |
| 4. The switch | `BODY=mineai` in `deploy/.env` | games in progress end once |
| 5. Rollback (if needed) | `BODY=ours` | games in progress end once |

What production ran when this was written (read-only on picasso, 2026-10-08): the code deployed on 2026-10-07 (before
staging, the day-0 fixes, the whitelist and this body), a `deploy/.env` with `WEB_ADMIN_TOKEN` only, Paper with
`white-list=false`, and Caddy's `play.picasso-lab.com` block without `X-Muse-Proxy`. So step 2 brings all of the
earlier fixes too; staging has run them since 2026-10-07.

## 1. Pre-checks

| Check | Command | Expected |
| --- | --- | --- |
| gate 2 passed | the soak's numbers (report, section 1; README, "Gates before the switch" and "The Muse run on staging") | strict iron route at least 7 of 10 one at a time and 6 of 8 at once with today's build; 0 heartbeat restarts and 0 watchdog stops; a whole 30-minute lease; one Muse run through the gateway that finishes the iron route (2026-10-08: 10 of 10, 6 of 8, 0 in 23 games, the lease ended at 30.0 min; the Muse run passed; the `muse-fix` build: 5 of 5, 4 of 6 and 6 of 8, 0 in 23 games), and the Muse re-test on staging with the `muse-fix` build done (passed: game `g42b738`, 2026-10-08) |
| the commit's tests (Mac) | `npm test` | `ℹ pass 271`, `ℹ fail 0` (273 tests, 2 skipped) |
| staging runs this commit (Mac) | `deploy/push.sh` | ends with `push: staging runs this code and passed its checks; deploy/push.sh --prod also puts it in production` |
| staging's runtime is the pin plus ten patches | `docker exec muse-staging-agent-1 node scripts/mineai-fetch.mjs /opt/mine-ai-mcp --check` | `/opt/mine-ai-mcp: 2fe1306 with 10 patches, dependencies installed` |
| production is idle (Mac) | `curl -s https://play.picasso-lab.com/ \| grep -o 'Bots in use: [0-9]* of [0-9]*'` | `Bots in use: 0 of 8` |
| disk | `df -h /ssd2` | at least 5 GB available (96% used, 162 GB free on 2026-10-08) |
| stream and camera off (picasso) | `ls ~/workspace/muse-minecraft/app/deploy/` | no `stream.env`, no `camera.env` (2026-10-08: neither). With either there, `recreate.sh` recreates it with the agent, but neither has run with `BODY=mineai` yet: try it on staging first |

Backups, once, before step 2 (picasso). They go to a folder of their own, never into `app/deploy` (`push.sh` copies
`deploy/` with `rsync --delete`, which keeps only `.env`, `stream.env` and `camera.env` there, so a backup next to them
is gone after the next deploy; on staging one was, 2026-10-08) nor into `app/data` (root's: Paper runs as root).

```sh
cd ~/workspace/muse-minecraft/app
T=$(date +%Y%m%d-%H%M%S); B=~/workspace/muse-minecraft/backups; mkdir -p $B && chmod 700 $B
cp -p deploy/.env $B/env.bak-$T                                 # mode 600 stays
cp data/server.properties $B/server.properties.bak-$T            # a record: the old Paper image rewrites it at start
# the deployed files (src, scripts, deploy with its .env, server, test, paper.jar, plugins, ...), what the undo of
# step 2 puts back; not the world, the logs or the bot data. Once: a second run keeps the first archive and tags
[ -e $B/app-pre-switch.tgz ] || (umask 077; tar -czf $B/app-pre-switch.tgz --exclude=./data --exclude=./logs --exclude=./mineai-data .)
docker image inspect muse-minecraft-agent:pre-switch >/dev/null 2>&1 || docker tag muse-minecraft-agent:latest muse-minecraft-agent:pre-switch
docker image inspect muse-minecraft-paper:pre-switch >/dev/null 2>&1 || docker tag muse-minecraft-paper:latest muse-minecraft-paper:pre-switch
tar -tzf $B/app-pre-switch.tgz ./deploy/compose.yaml ./src/web.js
```

Expected: only the last command prints, `./deploy/compose.yaml` and `./src/web.js`. The archive is about 140 MB
(mode 600; a rehearsal in a scratch folder on 2026-10-08: 138 MB, nothing of `data` or `logs` in it).
`docker images muse-minecraft-agent` then lists `latest` and `pre-switch` with the same image id.

## 2. Deploy the production config (gate 1), still with our body

Mac, in this agent folder:

```sh
deploy/push.sh --prod
```

It deploys staging, runs the staging checks, and only if they pass and no file changed meanwhile, production. What the
production part does (`deploy/push.sh --prod --dry-run` prints every command):

- `~/workspace/muse-minecraft/app/mineai-data` made, mode 700 (their per-bot SQLite; the bots' private names are in it);
- `docker compose up -d --build` with `deploy/compose.yaml`: the agent image built with `MINEAI=1` (the runtime at the
  pin, our ten patches, `bun install --frozen-lockfile`, typecheck and the tests of our patches, all inside the
  build: about 5-10 minutes on picasso), the agent under an init (`init: true`), the data folder mounted at
  `/mineai-data`; Paper's image with the whitelist (`paper-entry.sh` writes `white-list`, `enforce-whitelist` and
  `hide-online-players`) and the agent's `MC_WHITELIST`, in the same `up`, so Paper and the agent switch together;
- the prune of our own dangling images, a note when picasso refuses it, the body `deploy/.env` picks, and the proxy note.

Expected, at the end:

```
 Container muse-minecraft-agent-1  Recreated
 Container muse-minecraft-agent-1  Starting
 Container muse-minecraft-agent-1  Started
agent: Up 1 second
paper: Up 3 seconds
⛔ prune 命令需要 sudo 权限
note: the prune was refused (picasso allows it as root only); our dangling images left: 2 (README, Deploy on picasso)
production body: ours (deploy/.env BODY; docs/SWITCH.md)
note: deploy/.env has no WEB_PROXY_SECRET: forwarded headers are believed from any local peer on 7850 (README, Deploy on picasso)
```

(The prune lines are `Total reclaimed space: ...` instead where the prune is allowed; the dangling count varies.)

Checks:

| Check | Command | Expected |
| --- | --- | --- |
| a game on production (Mac) | `node scripts/staging-check.mjs https://play.picasso-lab.com --production` | `PASS: wooden pickaxe in ... s from the first action, 3 MCP calls in all (game g...)` and `end_game -> game g... ended, its bot left` |
| the whitelist is on | `grep -E '^(white-list\|enforce-whitelist\|hide-online-players)=' ~/workspace/muse-minecraft/app/data/server.properties` | `white-list=true`, `enforce-whitelist=true`, `hide-online-players=true` |
| the bot was listed, then taken off | `docker logs --since 10m muse-minecraft-paper-1 2>&1 \| grep -cE '(Added\|Removed) .* (to\|from) the whitelist'` | 2 or more (one pair per game) |
| the runtime in the image | `docker exec muse-minecraft-agent-1 node scripts/mineai-fetch.mjs /opt/mine-ai-mcp --check` | `/opt/mine-ai-mcp: 2fe1306 with 10 patches, dependencies installed` |
| the init | `docker inspect -f '{{.HostConfig.Init}}' muse-minecraft-agent-1` | `true` |
| the data folder | `ls -ld ~/workspace/muse-minecraft/app/mineai-data` | `drwx------ ... yichen yichen ... mineai-data` |
| still our body | `docker logs muse-minecraft-agent-1 2>&1 \| grep -c 'body: Mine AI MCP'` | `0` |

Undo step 2 (after undoing 4 and 3b, if they were done): the `pre-switch` images and the archived files, then both
containers recreated from those images, without building:

```sh
cd ~/workspace/muse-minecraft/app
docker tag muse-minecraft-agent:pre-switch muse-minecraft-agent:latest
docker tag muse-minecraft-paper:pre-switch muse-minecraft-paper:latest
tar -tzf ../backups/app-pre-switch.tgz >/dev/null && rm -rf src scripts mineai plugins && tar -xzf ../backups/app-pre-switch.tgz --exclude=./deploy/.env --exclude=./deploy/stream.env --exclude=./deploy/camera.env
sh deploy/recreate.sh production all
```

The extraction overwrites `deploy/` with the old compose file, Dockerfiles and `push.sh`; the files step 2 added to
`deploy/` (this runbook's `recreate.sh` among them) stay and do nothing. `data/server.properties` needs nothing: the
old Paper image rewrites it at every start without the whitelist lines, so the server starts with `white-list=false`
again (`grep '^white-list=' data/server.properties`). Production then runs exactly what it ran before step 2; the next
`deploy/push.sh --prod` from the Mac deploys whatever that checkout holds.

## 3. The proxy secret (ROADMAP M0 item 6), staging first

Why: on picasso every connection to a published port arrives from the Docker bridge gateway, Caddy's and any local
user's alike, so the agent cannot tell Caddy by its address. `WEB_TRUSTED_PROXIES` therefore stays unset on picasso
(Caddy's address would refuse every visitor, the gateway's would let any local user pick their own address for the
limits). Caddy proves itself with a secret header instead (`WEB_PROXY_SECRET`, header `X-Muse-Proxy`).

Order, so no visitor is ever refused: Caddy first, then the agent. An agent without `WEB_PROXY_SECRET` ignores the
header (and strips it before the live views); an agent with it refuses every non-loopback request without it.

The secret lives in a file in `caddy-config/priv/` (mode 700, mounted read-only into the Caddy container at
`/etc/caddy/priv/`) and reaches the header through Caddy's `{file.*}` placeholder, so it is never written into the
Caddyfile (which is mode 664). Checked on picasso with the FRAS Caddy image (v2.11.2) in a throwaway container
(2026-10-08): the header carried exactly the file's contents, with or without a trailing newline.

`deploy/caddy-proxy-line.py add|remove staging|production` (python3, on picasso) makes the Caddy change, and only
that: it adds (or removes) the one line `header_up X-Muse-Proxy {file./etc/caddy/priv/<secret file>}` right after the
site's `reverse_proxy` line, writes `Caddyfile.new`, prints the diff, has the Caddy container validate it, checks
that nobody saved the Caddyfile meanwhile, moves it into place and reloads; any stop before the move leaves the live
Caddyfile as it was. The Caddyfile is shared (FRAS, the lab dashboard, tritongym, poker, lab-publish, the web IDEs;
another job added poker.picasso-lab.com on 2026-10-08), so the undo is `remove`, never a copy of an older Caddyfile,
which would drop whatever was added since. The copy the script keeps, `Caddyfile.bak-<time>-<add|remove>-<site>`,
is a record only.

Both tools were checked on 2026-10-08 (`test/switch.test.js` runs them against stand-ins): `caddy-proxy-line.py` on
picasso against a copy of the live Caddyfile in a throwaway container of FRAS's Caddy image (`caddy:2-alpine`, no
network): add for both sites, then a new site block appended, then remove for both, left a file identical to the
copy plus the new block, and the loaded config carried
`"X-Muse-Proxy":["{file./etc/caddy/priv/muse-staging-proxy-secret}"]` after the add; a block Caddy refuses stopped it
with the file untouched. `recreate.sh staging` on staging: idle check, the agent recreated, `Bots in use: 0 of 8`
and `body: Mine AI MCP` again within seconds.

### 3a. Staging (the rehearsal)

Caddy first (picasso):

```sh
cd ~/workspace/FRAS/caddy-config &&
{ [ -e priv/muse-staging-proxy-secret ] || (umask 077; openssl rand -hex 24 | tr -d '\n' > priv/muse-staging-proxy-secret); } &&
python3 ~/workspace/muse-staging/app/deploy/caddy-proxy-line.py add staging &&
curl -s -o /dev/null -w '%{http_code}\n' https://play-staging.picasso-lab.com/
```

Expected (the line numbers vary):

```
--- Caddyfile
+++ Caddyfile.new
@@ -94,2 +94,3 @@
 	reverse_proxy 172.24.0.1:7851 {
+		header_up X-Muse-Proxy {file./etc/caddy/priv/muse-staging-proxy-secret}
 		header_up X-Forwarded-Proto {scheme}
Valid configuration
caddy: play-staging.picasso-lab.com sends X-Muse-Proxy; reloaded (the file before: Caddyfile.bak-<time>-add-staging, a record only, never copied back)
200
```

A line starting `caddy: STOPPED, nothing changed:` says why (the block is not as expected, the secret file is
missing, `caddy validate` refused, or another session saved the Caddyfile meanwhile: run it again); the Caddyfile is
untouched. Exit 2 (`the reload failed`) leaves the validated file on disk and Caddy on its old config: run the reload
it prints again.

Then the agent; the first line makes sure Caddy has the line:

```sh
grep -q 'priv/muse-staging-proxy-secret}' ~/workspace/FRAS/caddy-config/Caddyfile &&
cd ~/workspace/muse-staging/app/deploy &&
B=~/workspace/muse-staging/backups && mkdir -p $B && chmod 700 $B && cp -p .env $B/env.bak-$(date +%Y%m%d-%H%M%S) &&
{ grep -q '^WEB_PROXY_SECRET=' .env || printf 'WEB_PROXY_SECRET=%s\n' "$(cat ~/workspace/FRAS/caddy-config/priv/muse-staging-proxy-secret)" >> .env; } &&
sh recreate.sh staging
```

Expected: `recreate: staging is idle (Bots in use: 0)`, `recreate: agent`, the four `Container muse-staging-agent-1
Recreate ... Started` lines and the services' status. If it stops with `recreate: STOPPED, nothing changed: N bot(s)
in use`, `.env` already has the secret: run `sh recreate.sh staging` again once the games have ended.

Checks:

| Command | Expected |
| --- | --- |
| `curl -s -o /dev/null -w '%{http_code}\n' https://play-staging.picasso-lab.com/` | `200` |
| `curl -s -o /dev/null -w '%{http_code}\n' -H 'X-Muse-Proxy: forged' https://play-staging.picasso-lab.com/` | `200` (Caddy replaces the header) |
| `curl -s -o /dev/null -w '%{http_code}\n' http://172.24.0.1:7851/` (on picasso, past Caddy) | `403` |
| `docker logs --since 2m muse-staging-agent-1 2>&1 \| grep -c 'neither WEB_PROXY_SECRET'` | `0` |
| Mac: `deploy/push.sh --check` | ends with `PASS: wooden pickaxe ...` and exit 0 |

If the page answers 403 after the agent step, Caddy is not sending the secret: take the agent back first (the undo
below), then look at the Caddy block.

Undo 3a (the reverse order, the agent first, then Caddy; one chain, so Caddy keeps the line while the agent still
wants it):

```sh
cd ~/workspace/muse-staging/app/deploy && sed -i '/^WEB_PROXY_SECRET=/d' .env && sh recreate.sh staging &&
python3 ~/workspace/muse-staging/app/deploy/caddy-proxy-line.py remove staging
```

Expected: the recreate lines, then a diff with the one `-		header_up X-Muse-Proxy {file./etc/caddy/priv/muse-staging-proxy-secret}`
line, `Valid configuration` and `caddy: play-staging.picasso-lab.com no longer sends X-Muse-Proxy; reloaded (...)`.
Every other site block, including any added after 3a, stays as it is now.

### 3b. Production

Idle check first (section 1): the agent recreate ends the games in progress, and the reload drops production's open
live views. Then on picasso, Caddy:

```sh
cd ~/workspace/FRAS/caddy-config &&
{ [ -e priv/muse-play-proxy-secret ] || (umask 077; openssl rand -hex 24 | tr -d '\n' > priv/muse-play-proxy-secret); } &&
python3 ~/workspace/muse-minecraft/app/deploy/caddy-proxy-line.py add production &&
curl -s -o /dev/null -w '%{http_code}\n' https://play.picasso-lab.com/
```

Expected: as in 3a, with `reverse_proxy 172.24.0.1:7850`, `priv/muse-play-proxy-secret`, `caddy: play.picasso-lab.com
sends X-Muse-Proxy; reloaded (...)` and `200`. Then the agent:

```sh
grep -q 'priv/muse-play-proxy-secret}' ~/workspace/FRAS/caddy-config/Caddyfile &&
cd ~/workspace/muse-minecraft/app/deploy &&
B=~/workspace/muse-minecraft/backups && mkdir -p $B && chmod 700 $B && cp -p .env $B/env.bak-$(date +%Y%m%d-%H%M%S) &&
{ grep -q '^WEB_PROXY_SECRET=' .env || printf 'WEB_PROXY_SECRET=%s\n' "$(cat ~/workspace/FRAS/caddy-config/priv/muse-play-proxy-secret)" >> .env; } &&
sh recreate.sh production
```

Expected: `recreate: production is idle (Bots in use: 0)`, `recreate: agent` (`agent stream` / `agent camera` when
those are on), the `Container muse-minecraft-agent-1 Recreate ... Started` lines and the services' status; then the
same table as 3a with `https://play.picasso-lab.com/` (200, forged header 200) and `http://172.24.0.1:7850/` (403); the
next `deploy/push.sh --prod` no longer prints the `WEB_PROXY_SECRET` note.

Undo 3b (idle check first; the agent, then Caddy, in one chain):

```sh
cd ~/workspace/muse-minecraft/app/deploy && sed -i '/^WEB_PROXY_SECRET=/d' .env && sh recreate.sh production &&
python3 ~/workspace/muse-minecraft/app/deploy/caddy-proxy-line.py remove production
```

Expected: as the undo of 3a, for `play.picasso-lab.com`; staging's line stays. `WEB_MCP_GAMES_PER_ADDRESS` can go into
the same `.env` once probe T8 has measured how many Muse users share an address.

## 4. The switch

Idle check first (section 1). Then on picasso:

```sh
cd ~/workspace/muse-minecraft/app/deploy &&
B=~/workspace/muse-minecraft/backups && mkdir -p $B && chmod 700 $B && cp -p .env $B/env.bak-$(date +%Y%m%d-%H%M%S) &&
sed -i '/^\(BODY\|MINEAI_DIR\|MINEAI_DATA_DIR\)=/d' .env &&
printf 'BODY=mineai\nMINEAI_DIR=/opt/mine-ai-mcp\nMINEAI_DATA_DIR=/mineai-data\n' >> .env &&
sh recreate.sh production
```

(`docker compose restart` would keep the old environment; `recreate.sh` runs `up --force-recreate`, which reads `.env`
again.) Expected:

```
recreate: production is idle (Bots in use: 0)
recreate: agent
 Container muse-minecraft-agent-1  Recreate
 Container muse-minecraft-agent-1  Recreated
 Container muse-minecraft-agent-1  Starting
 Container muse-minecraft-agent-1  Started
agent: Up Less than a second
paper: Up ...
```

If it stops with `recreate: STOPPED, nothing changed: N bot(s) in use`, `.env` already says `BODY=mineai`: run
`sh recreate.sh production` again once the games have ended.

Smoke checks:

| Check | Command | Expected |
| --- | --- | --- |
| the agent took the body | `docker logs --since 2m muse-minecraft-agent-1 2>&1 \| grep 'body: Mine AI MCP'` | `body: Mine AI MCP from /opt/mine-ai-mcp, one host per guest game on 127.0.0.1:27100+ (at most 8)` |
| a game (Mac) | `node scripts/staging-check.mjs https://play.picasso-lab.com --production` | `PASS: wooden pickaxe in ... s` (this body: 16-22 s on the Mac, 19.4 s on staging), `3 MCP calls in all`; `end_game -> game g... ended, its bot left` |
| its host started, got ready and closed | `grep -h '"kind":"mineai_host_\(ready\|close\)"' $(ls -t ../logs/run-serve-*.jsonl \| head -1) \| tail -2` | a `mineai_host_ready` row (`"ms"` about 1000-2000) and a `mineai_host_close` row with `"why":"the game ended"`, `"restarts":0`, `"data":"deleted"` |
| no restarts or misses | `grep -hc '"kind":"mineai_\(heartbeat_miss\|host_restart\|host_down\)"' $(ls -t ../logs/run-serve-*.jsonl \| head -1)` | `0` |
| no private name on a command line (during a game) | `ps -eo args \| grep -c '[M]use_'` | `0` |
| the page and the views | `curl -s -o /dev/null -w '%{http_code}\n' https://play.picasso-lab.com/` | `200` |

If the agent does not come up (`docker ps` shows it restarting), its log says why; a runtime that is not the pin plus
every patch is refused with `BODY=mineai: ... build the runtime with mineai/fetch-and-patch.sh <new folder> and set
MINEAI_DIR to it`. Roll back (section 5) and look at the build.

Watch the first days (report, section 3): the daily count of `mineai_host_restart`, `mineai_host_down` and failed
joins in `app/logs`; the no-go conditions of the report (a heartbeat restart or watchdog stop at normal load, a Muse
run that cannot finish the iron route) mean the rollback.

## 5. Rollback (one line)

Mac:

```sh
ssh picasso 'cd ~/workspace/muse-minecraft/app/deploy && sed -i "s/^BODY=.*/BODY=ours/" .env && sh recreate.sh production'
```

Expected: the `recreate:` lines and the four `Container muse-minecraft-agent-1 Recreate ... Started` lines; then
`docker logs --since 1m muse-minecraft-agent-1 2>&1 | grep -c 'body: Mine AI MCP'` is `0` and
`node scripts/staging-check.mjs https://play.picasso-lab.com --production` passes with our body. While a bot is in
use it stops (`.env` already says `ours`); when the rollback cannot wait, `MUSE_NOW=1 sh recreate.sh production` goes
on and the games in progress end. A running stream or camera is recreated with the agent. The `MINEAI_*` lines may
stay; our body ignores them. To switch again: `sed -i "s/^BODY=.*/BODY=mineai/" .env && sh recreate.sh production`.

## 6. After the switch

- The image grew from 470 MB (1.07 GB for production's current, unslimmed one) to about 794 MB. picasso refuses
  `prune` to our user: remove our dangling images by hand,
  `docker images -q -f dangling=true -f label=org.picasso-lab.app=muse-minecraft | xargs -r docker rmi`, and the
  `pre-switch` tags once the switch has held for a week (`docker rmi muse-minecraft-agent:pre-switch
  muse-minecraft-paper:pre-switch`).
- Bot data: deleted when a game ends, the last 10 failed games kept (`MINEAI_KEEP_FAILED`), folders older than 3 days
  removed at agent start (`MINEAI_DATA_DAYS`).
- Capacity: production allows 8 guest bots (`WEB_MAX_SESSIONS`), about 0.4 GB and a fifth of a core each.

## 7. A runtime update after the switch (patch 0011, 2026-10-08)

**Done 2026-10-09 (01:45 UTC): production runs `2fe1306 with 11 patches`; every check below passed (README, "Builds on
rough ground").**

Builds on rough ground (README, "Builds on rough ground"; `mineai/README.md`, "Patch 0011 on Paper") changed the
runtime (the pin plus eleven patches) and the gateway, so production gets them with `deploy/push.sh --prod`, as in
section 2: staging first, then production only if staging's checks pass and nothing changed meanwhile. Production
must be idle (section 1's check) and the running image tagged first, for the undo (picasso):

```sh
docker tag muse-minecraft-agent:latest muse-minecraft-agent:pre-0011
```

Checks after it: `docker exec muse-minecraft-agent-1 node scripts/mineai-fetch.mjs /opt/mine-ai-mcp --check` says
`/opt/mine-ai-mcp: 2fe1306 with 11 patches, dependencies installed`; `node scripts/staging-check.mjs
https://play.picasso-lab.com --production` passes; one build game through the public `/mcp`:
`node mineai/bench/build-staging.mjs https://play.picasso-lab.com --production --games 1` ends `RESULT PASS`.

Undo (picasso; the image of before the update, no build; `recreate.sh` waits for production to be idle):

```sh
docker tag muse-minecraft-agent:pre-0011 muse-minecraft-agent:latest && sh ~/workspace/muse-minecraft/app/deploy/recreate.sh production
```

The code folder then holds the newer files, which the old image does not read (the agent's code is in its image); the
next `deploy/push.sh --prod` from an older commit replaces them. Remove the `pre-0011` tag once the update has held
for a week (`docker rmi muse-minecraft-agent:pre-0011`).

## 8. The bot looks after itself, with real nights on Normal (ROADMAP M4)

STATUS_M4

The care (README, "The bot looks after itself") changes only the gateway (no runtime patch: the runtime stays `2fe1306
with 11 patches`), and the world settings change through two lines in `deploy/.env`, which `deploy/compose.yaml` hands
to Paper (`PAPER_DIFFICULTY`, `PAPER_DAYLIGHT`; `deploy/paper-entry.sh` sets both again at every start). Production gets
both only after the M4 gate passed on staging (ROADMAP, M4, "Acceptance of the survival step"), idle, with the running
images tagged first for the undo (picasso):

```sh
docker tag muse-minecraft-agent:latest muse-minecraft-agent:pre-m4 && docker tag muse-minecraft-paper:latest muse-minecraft-paper:pre-m4
```

Then the code (Mac, this folder; staging first, production only when staging's checks pass):

```sh
deploy/push.sh --prod
```

Then the world (picasso; the idle check again, then Paper and the agent recreated from the images just built):

```sh
cd ~/workspace/muse-minecraft/app/deploy &&
B=~/workspace/muse-minecraft/backups && mkdir -p $B && chmod 700 $B && cp -p .env $B/env.bak-$(date +%Y%m%d-%H%M%S) &&
sed -i '/^PAPER_\(DIFFICULTY\|DAYLIGHT\)=/d' .env && printf 'PAPER_DIFFICULTY=normal\nPAPER_DAYLIGHT=cycle\n' >> .env &&
sh recreate.sh production all
```

Checks: `docker logs --since 2m muse-minecraft-paper-1 2>&1 | grep -E 'doDaylightCycle is now set to: true|difficulty has been set to Normal'`
prints both lines; `node scripts/staging-check.mjs https://play.picasso-lab.com --production` passes; one game through
the public `/mcp` at night shows a shelter in its reply (`node mineai/bench/survive-labs.mjs` is for staging only: it
writes to the server console).

Undo (picasso; the world first, then the code; `recreate.sh` waits for production to be idle):

```sh
cd ~/workspace/muse-minecraft/app/deploy && sed -i '/^PAPER_\(DIFFICULTY\|DAYLIGHT\)=/d' .env &&
docker tag muse-minecraft-agent:pre-m4 muse-minecraft-agent:latest && docker tag muse-minecraft-paper:pre-m4 muse-minecraft-paper:latest &&
sh recreate.sh production all
```

Paper starts again with easy and locked daylight at morning (the old entry script locks the clock and the server
properties say easy), the agent without the care. Only the care, keeping the world as it is: `MINEAI_CARE=off` in
`.env` and `sh recreate.sh production`. Remove the `pre-m4` tags once the update has held for a week.
