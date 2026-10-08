<!-- docs/SWITCH.md - the runbook for switching production (play.picasso-lab.com) to the Mine AI MCP body (BODY=mineai): pre-checks, the deploy with the production config, the proxy secret and the Paper whitelist (ROADMAP M0 items 6 and 7), the switch, the smoke checks, the one-line rollback, with the expected output of each command. -->
# Switching production to the Mine AI MCP body

The go/no-go report (`../../../../research/muse-reuse-validation.md`) asks for three gates before production plays
with `BODY=mineai`. Gate 1 (the production config) and gate 3 (the two runtime patches, 0007 and 0008) are in this
commit; gate 2 is the soak on staging and one Muse run: the scripted soak passed on 2026-10-08 (the agent's README,
"Gates before the switch": 10 of 10 one at a time, 6 of 8 at once, a whole 30-minute lease, 0 restarts), and the Muse
run is the operator's; the switch waits for it.

Production is `play.picasso-lab.com` on picasso: compose project `muse-minecraft`, code in
`~/workspace/muse-minecraft/app`, its world in `app/data`, logs in `app/logs`, the agent on `172.24.0.1:7850` behind
the FRAS Caddy (`~/workspace/FRAS/caddy-config/Caddyfile`, container `fras-caddy-1`). Commands marked "Mac" run in this
agent folder; the others on picasso (`ssh picasso`).

The steps go in this order and each one leaves production working. Every step that restarts the agent or Paper ends
the games in progress, so each starts with the idle check of section 1.

| Step | What changes | Visitors notice |
| --- | --- | --- |
| 2. Deploy (gate 1) | the code of this commit, the image with the runtime, an init, the bot data folder, the Paper whitelist; still our body | games in progress end once |
| 3. Proxy secret | Caddy sends a secret; the agent believes forwarded addresses only with it | nothing |
| 4. The switch | `BODY=mineai` in `deploy/.env` | games in progress end once |
| 5. Rollback (if needed) | `BODY=ours` | games in progress end once |

What production ran when this was written (read-only on picasso, 2026-10-08): the code deployed on 2026-10-07 (before
staging, the day-0 fixes, the whitelist and this body), a `deploy/.env` with `WEB_ADMIN_TOKEN` only, Paper with
`white-list=false`, and Caddy's `play.picasso-lab.com` block without `X-Muse-Proxy`. So step 2 brings all of the
earlier fixes too; staging has run them since 2026-10-07.

## 1. Pre-checks

| Check | Command | Expected |
| --- | --- | --- |
| gate 2 passed | the soak's numbers (report, section 1; README, "Gates before the switch") | strict iron route at least 7 of 10 one at a time and 6 of 8 at once with today's build; 0 heartbeat restarts and 0 watchdog stops; a whole 30-minute lease; one Muse run through the gateway that finishes the iron route (2026-10-08: all but the Muse run; 10 of 10, 6 of 8, 0 in 23 games, the lease ended at 30.0 min) |
| the commit's tests (Mac) | `npm test` | `ℹ pass 250`, `ℹ fail 0` (252 tests, 2 skipped) |
| staging runs this commit (Mac) | `deploy/push.sh` | ends with `push: staging runs this code and passed its checks; deploy/push.sh --prod also puts it in production` |
| staging's runtime is the pin plus eight patches | `docker exec muse-staging-agent-1 node scripts/mineai-fetch.mjs /opt/mine-ai-mcp --check` | `/opt/mine-ai-mcp: 2fe1306 with 8 patches, dependencies installed` |
| production is idle (Mac) | `curl -s https://play.picasso-lab.com/ \| grep -o 'Bots in use: [0-9]* of [0-9]*'` | `Bots in use: 0 of 8` |
| disk | `df -h /ssd2` | at least 5 GB available (96% used, 162 GB free on 2026-10-08) |

Backups, once, before step 2 (picasso). The `.env` copies go to a folder of their own, never into `app/deploy`:
`push.sh` copies `deploy/` with `rsync --delete`, which keeps only `.env`, `stream.env` and `camera.env` there, so a
backup next to them is gone after the next deploy (on staging one was, 2026-10-08).

```sh
cd ~/workspace/muse-minecraft/app
T=$(date +%Y%m%d-%H%M%S); B=~/workspace/muse-minecraft/backups; mkdir -p $B && chmod 700 $B
cp -p deploy/.env $B/env.bak-$T                           # mode 600 stays
cp -p data/server.properties data/server.properties.bak-$T
docker tag muse-minecraft-agent:latest muse-minecraft-agent:pre-switch   # the images production runs now
docker tag muse-minecraft-paper:latest muse-minecraft-paper:pre-switch
```

Expected: no output. `docker images muse-minecraft-agent` then lists `latest` and `pre-switch` with the same image id.

## 2. Deploy the production config (gate 1), still with our body

Mac, in this agent folder:

```sh
deploy/push.sh --prod
```

It deploys staging, runs the staging checks, and only if they pass and no file changed meanwhile, production. What the
production part does (`deploy/push.sh --prod --dry-run` prints every command):

- `~/workspace/muse-minecraft/app/mineai-data` made, mode 700 (their per-bot SQLite; the bots' private names are in it);
- `docker compose up -d --build` with `deploy/compose.yaml`: the agent image built with `MINEAI=1` (the runtime at the
  pin, our eight patches, `bun install --frozen-lockfile`, typecheck and the tests of our patches, all inside the
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
| the runtime in the image | `docker exec muse-minecraft-agent-1 node scripts/mineai-fetch.mjs /opt/mine-ai-mcp --check` | `/opt/mine-ai-mcp: 2fe1306 with 8 patches, dependencies installed` |
| the init | `docker inspect -f '{{.HostConfig.Init}}' muse-minecraft-agent-1` | `true` |
| the data folder | `ls -ld ~/workspace/muse-minecraft/app/mineai-data` | `drwx------ ... yichen yichen ... mineai-data` |
| still our body | `docker logs muse-minecraft-agent-1 2>&1 \| grep -c 'body: Mine AI MCP'` | `0` |

Undo step 2 (the old code and images): restore the backups and recreate both containers from the `pre-switch` images,
without building:

```sh
cd ~/workspace/muse-minecraft/app
docker tag muse-minecraft-agent:pre-switch muse-minecraft-agent:latest
docker tag muse-minecraft-paper:pre-switch muse-minecraft-paper:latest
cp -p data/server.properties.bak-<T> data/server.properties
cd deploy && docker compose up -d --no-build --force-recreate
```

(then `deploy/push.sh --prod` from the old commit to put the old files back as well).

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

### 3a. Staging (the rehearsal)

```sh
cd ~/workspace/FRAS/caddy-config
(umask 077; openssl rand -hex 24 | tr -d '\n' > priv/muse-staging-proxy-secret)
T=$(date +%Y%m%d-%H%M%S); cp -p Caddyfile Caddyfile.bak-$T
python3 - Caddyfile Caddyfile.new play-staging.picasso-lab.com 7851 muse-staging-proxy-secret <<'PY'
import sys
src, dst, host, port, name = sys.argv[1:]
s = open(src).read()
head = f"{host} {{\n\treverse_proxy 172.24.0.1:{port} {{\n"
assert s.count(head) == 1, f"the {host} block is not as expected"
assert f"priv/{name}" not in s, "already there"
s = s.replace(head, head + f"\t\theader_up X-Muse-Proxy {{file./etc/caddy/priv/{name}}}\n")
open(dst, "w").write(s)
PY
diff Caddyfile Caddyfile.new
docker exec fras-caddy-1 caddy validate --config /etc/caddy/Caddyfile.new --adapter caddyfile 2>&1 | tail -1
mv Caddyfile.new Caddyfile && chmod 664 Caddyfile
docker exec fras-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
curl -s -o /dev/null -w '%{http_code}\n' https://play-staging.picasso-lab.com/
```

Expected: the diff shows one added line,
`> 		header_up X-Muse-Proxy {file./etc/caddy/priv/muse-staging-proxy-secret}`; then `Valid configuration`; the reload
prints nothing (or an INFO line); the page `200`.

Then the agent:

```sh
cd ~/workspace/muse-staging/app/deploy
B=~/workspace/muse-staging/backups; mkdir -p $B && chmod 700 $B && cp -p .env $B/env.bak-$(date +%Y%m%d-%H%M%S)
printf 'WEB_PROXY_SECRET=%s\n' "$(cat ~/workspace/FRAS/caddy-config/priv/muse-staging-proxy-secret)" >> .env
docker compose -p muse-staging -f staging.compose.yaml up -d --no-deps --force-recreate agent
```

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

### 3b. Production

The same, with production's names: secret file `priv/muse-play-proxy-secret`; in the python line
`play.picasso-lab.com 7850 muse-play-proxy-secret`; the agent:

```sh
cd ~/workspace/muse-minecraft/app/deploy
B=~/workspace/muse-minecraft/backups; mkdir -p $B && chmod 700 $B && cp -p .env $B/env.bak-$(date +%Y%m%d-%H%M%S)
printf 'WEB_PROXY_SECRET=%s\n' "$(cat ~/workspace/FRAS/caddy-config/priv/muse-play-proxy-secret)" >> .env
docker compose up -d --no-deps --force-recreate agent
```

Expected: the same table with `https://play.picasso-lab.com/` (200, forged header 200) and `http://172.24.0.1:7850/`
(403); the next `deploy/push.sh --prod` no longer prints the `WEB_PROXY_SECRET` note.

Undo (the reverse order: the agent first, then Caddy):

```sh
cd ~/workspace/muse-minecraft/app/deploy && sed -i '/^WEB_PROXY_SECRET=/d' .env && docker compose up -d --no-deps --force-recreate agent
cd ~/workspace/FRAS/caddy-config && cp -p Caddyfile.bak-<T> Caddyfile && docker exec fras-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

(Staging: its `.env` and `-p muse-staging -f staging.compose.yaml`.) `WEB_MCP_GAMES_PER_ADDRESS` can go into the same
`.env` once probe T8 has measured how many Muse users share an address.

## 4. The switch

Idle check first (section 1). Then on picasso:

```sh
cd ~/workspace/muse-minecraft/app/deploy
B=~/workspace/muse-minecraft/backups; mkdir -p $B && chmod 700 $B && cp -p .env $B/env.bak-$(date +%Y%m%d-%H%M%S)
cat >> .env <<'E'
BODY=mineai
MINEAI_DIR=/opt/mine-ai-mcp
MINEAI_DATA_DIR=/mineai-data
E
docker compose up -d --no-deps --force-recreate agent
```

(`docker compose restart` would keep the old environment; `up --force-recreate` reads `.env` again.) Expected:

```
 Container muse-minecraft-agent-1  Recreate
 Container muse-minecraft-agent-1  Recreated
 Container muse-minecraft-agent-1  Starting
 Container muse-minecraft-agent-1  Started
```

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
ssh picasso 'cd ~/workspace/muse-minecraft/app/deploy && sed -i "s/^BODY=.*/BODY=ours/" .env && docker compose up -d --no-deps --force-recreate agent'
```

Expected: the four `Container muse-minecraft-agent-1 Recreate ... Started` lines; then
`docker logs --since 1m muse-minecraft-agent-1 2>&1 | grep -c 'body: Mine AI MCP'` is `0` and
`node scripts/staging-check.mjs https://play.picasso-lab.com --production` passes with our body. Games in progress end.
The `MINEAI_*` lines may stay; our body ignores them. To switch again: `sed -i "s/^BODY=.*/BODY=mineai/" .env` and the
same `up`.

## 6. After the switch

- The image grew from 470 MB (1.07 GB for production's current, unslimmed one) to about 794 MB. picasso refuses
  `prune` to our user: remove our dangling images by hand,
  `docker images -q -f dangling=true -f label=org.picasso-lab.app=muse-minecraft | xargs -r docker rmi`, and the
  `pre-switch` tags once the switch has held for a week (`docker rmi muse-minecraft-agent:pre-switch
  muse-minecraft-paper:pre-switch`).
- Bot data: deleted when a game ends, the last 10 failed games kept (`MINEAI_KEEP_FAILED`), folders older than 3 days
  removed at agent start (`MINEAI_DATA_DAYS`).
- Capacity: production allows 8 guest bots (`WEB_MAX_SESSIONS`), about 0.4 GB and a fifth of a core each.
