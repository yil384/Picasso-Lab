#!/bin/zsh
# Deploy the trader to picasso (compose project muse-trader, ~/workspace/muse-trader):
#   deploy/push.sh             copy the code, make deploy/.env there once (owner key, proxy secret, uid), build, (re)start
#   deploy/push.sh --keys      the same, and first put the paper keys from ~/.config/picasso/alpaca-paper.env into the
#                              server's deploy/.env (sent over ssh's stdin, never on a command line): the switch from
#                              the mock broker to Alpaca paper. The record starts fresh in run/paper (the mock's stays
#                              in run/mock).
#   add --dry-run to print what would run
# Nothing here touches the Caddyfile: that is deploy/caddy-site.py, once (docs/DEPLOY.md).
set -e
A=$(cd "$(dirname "$0")/.." && pwd)
R=workspace/muse-trader
KEYS=0 DRY=0
for a in "$@"; do
  case $a in
    --keys) KEYS=1 ;;
    --dry-run) DRY=1 ;;
    *) print -u2 "usage: deploy/push.sh [--keys] [--dry-run]"; exit 2 ;;
  esac
done
x() { if (( DRY )); then print -r -- "${(j: :)${(q-)@}}"; else "$@"; fi }

(cd "$A" && npm test >/dev/null) || { print -u2 "push: the tests fail; nothing deployed"; exit 1; }
x ssh picasso "mkdir -p ~/$R/app ~/$R/run && chmod 700 ~/$R/run"
(cd "$A" && x rsync -az --delete --exclude deploy/.env --relative src data assets deploy docs package.json package-lock.json README.md .dockerignore picasso:$R/app/)
# deploy/.env, made once on the server: the owner's MCP key, the secret the edge proxy sends, the user the container runs as
x ssh picasso "cd ~/$R/app/deploy && umask 077 && if [ ! -f .env ]; then printf 'MCP_OWNER_KEY=%s\nWEB_PROXY_SECRET=%s\nTRADER_UID=%s\nTRADER_GID=%s\n' \"\$(openssl rand -hex 24)\" \"\$(openssl rand -hex 24)\" \"\$(id -u)\" \"\$(id -g)\" > .env; echo 'push: made deploy/.env (owner key, proxy secret)'; fi; chmod 600 .env"
if (( KEYS )); then
  F=~/.config/picasso/alpaca-paper.env
  [[ -f $F ]] || { print -u2 "push: $F is missing (two lines: ALPACA_KEY_ID=PK... and ALPACA_SECRET_KEY=...)"; exit 1; }
  grep -q '^ALPACA_KEY_ID=PK' $F || { print -u2 "push: ALPACA_KEY_ID in $F does not start with PK (paper keys do; live keys start with AK and are refused)"; exit 1; }
  grep -q '^ALPACA_SECRET_KEY=.' $F || { print -u2 "push: no ALPACA_SECRET_KEY in $F"; exit 1; }
  if (( DRY )); then print -r -- "grep -E '^ALPACA_(KEY_ID|SECRET_KEY)=' $F | ssh picasso '<replace the ALPACA_ lines of deploy/.env>'"
  else grep -E '^ALPACA_(KEY_ID|SECRET_KEY)=' $F | ssh picasso "cd ~/$R/app/deploy && umask 077 && { grep -v '^ALPACA_' .env; cat; } > .env.new && mv .env.new .env && chmod 600 .env && echo 'push: paper keys in deploy/.env'"; fi
fi
x ssh picasso "cd ~/$R/app/deploy && docker compose -p muse-trader up -d --build && docker compose -p muse-trader ps --format '{{.Service}}: {{.Status}}'
docker image prune -f --filter label=org.picasso-lab.app=muse-trader >/dev/null 2>&1 || echo 'push: note: dangling images of ours are left (the docker wrapper refuses prune)'"
x ssh picasso "sleep 3; curl -fsS http://172.24.0.1:7870/healthz && echo"
