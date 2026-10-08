#!/bin/zsh
# Deploy the agent to picasso, staging first (ROADMAP M0 item 9):
#   deploy/push.sh              staging only: https://play-staging.picasso-lab.com (compose project muse-staging,
#                               deploy/staging.compose.yaml, ~/workspace/muse-staging), then the staging checks
#                               (scripts/staging-check.mjs: the page, openapi.json, /mcp, a scripted wooden-pickaxe game)
#   deploy/push.sh --prod       the same, then, only if every check passed and the code did not change meanwhile,
#                               production (play.picasso-lab.com) exactly as before
#   deploy/push.sh --check      the staging checks alone, against what staging runs now
#   add --dry-run to print what would run (no ssh, no rsync, no checks)
# Each deploy copies the code, then rebuilds and restarts the containers. Games in progress end when an agent restarts;
# check https://play.picasso-lab.com/ first ("Bots in use"). With deploy/stream.env on picasso, the live-video streamer
# (compose profile "stream") is built and started in production too; with deploy/camera.env, the real-client camera
# (profile "camera"; its account signed in with scripts/camera-login.mjs). Staging runs neither.
# After each build it prunes our own dangling images (label org.picasso-lab.app=muse-minecraft, set in every Dockerfile
# here, staging's images included): the lab shares the Docker root, so it never touches an image without that label.
set -e
A=$(cd "$(dirname "$0")/.." && pwd)
PROD=0 CHECK_ONLY=0 DRY=0
for a in "$@"; do
  case $a in
    --prod) PROD=1 ;;
    --check) CHECK_ONLY=1 ;;
    --dry-run) DRY=1 ;;
    *) print -u2 "usage: deploy/push.sh [--prod | --check] [--dry-run]"; exit 2 ;;
  esac
done
if (( PROD && CHECK_ONLY )); then print -u2 "push: --prod and --check do not go together"; exit 2; fi

# every command that reaches picasso or runs the checks goes through x: with --dry-run it is printed instead
x() { if (( DRY )); then print -r -- "${(j: :)${(q-)@}}"; else "$@"; fi }

# what goes out: a hash of every file the deploy copies, so production gets exactly the code staging was checked with
fingerprint() {
  (cd "$A" && { find -L src scripts deploy -type f ! -name .env ! -name stream.env ! -name camera.env ! -path '*/__pycache__/*'
    print -l package.json package-lock.json README.md .dockerignore server/paper.jar server/plugins/*.jar(N); } \
    | LC_ALL=C sort | tr '\n' '\0' | xargs -0 shasum 2>/dev/null | shasum | cut -c1-16)
}

staging() {
  local S=picasso:workspace/muse-staging
  x ssh picasso 'mkdir -p ~/workspace/muse-staging/{app,data,logs}'
  # production's compose files stay out of the staging copy: a bare `docker compose` there must never reach production
  (cd "$A" && x rsync -az --delete --exclude deploy/.env --exclude deploy/stream.env --exclude deploy/camera.env --exclude deploy/compose.yaml --exclude deploy/camera-test.compose.yaml --relative src scripts deploy package.json package-lock.json README.md .dockerignore $S/app/)
  (cd "$A/server" && x rsync -azL paper.jar $S/app/paper.jar && x rsync -azL --delete --include '*.jar' --exclude '*' plugins/ $S/app/plugins/)
  x ssh picasso 'set -eo pipefail; cd ~/workspace/muse-staging/app
  [ -f deploy/.env ] || printf "WEB_ADMIN_TOKEN=%s\n" "$(openssl rand -base64 24 | tr -d "/+=" | head -c 32)" > deploy/.env
  chmod 600 deploy/.env
  cd deploy && docker compose -p muse-staging -f staging.compose.yaml up -d --build 2>&1 | tail -4 && docker compose -p muse-staging -f staging.compose.yaml ps --format "staging {{.Service}}: {{.Status}}"
  docker image prune -f --filter "label=org.picasso-lab.app=muse-minecraft" | tail -1
  grep -q "^WEB_PROXY_SECRET=" .env || echo "note: staging deploy/.env has no WEB_PROXY_SECRET: forwarded headers are believed from any local peer on 7851 (README, Deploy on picasso)"'
}

check() {
  x node "$A/scripts/staging-check.mjs" https://play-staging.picasso-lab.com
}

# production, as before staging existed (with the prune of our own dangling images and the trusted-proxy note)
prod() {
  local R=picasso:workspace/muse-minecraft
  x ssh picasso 'mkdir -p ~/workspace/muse-minecraft/{app,data,logs}'
  (cd "$A" && x rsync -az --delete --exclude deploy/.env --exclude deploy/stream.env --exclude deploy/camera.env --relative src scripts deploy package.json package-lock.json README.md .dockerignore $R/app/)
  (cd "$A/server" && x rsync -azL paper.jar $R/app/paper.jar && x rsync -azL --delete --include '*.jar' --exclude '*' plugins/ $R/app/plugins/)
  x ssh picasso 'set -e; cd ~/workspace/muse-minecraft/app
  [ -f deploy/.env ] || printf "WEB_ADMIN_TOKEN=%s\n" "$(openssl rand -base64 24 | tr -d "/+=" | head -c 32)" > deploy/.env
  chmod 600 deploy/.env
  # the live-video streamer runs only when its stream keys are there (deploy/stream.env, made by hand on picasso)
  P=""
  if [ -f deploy/stream.env ]; then chmod 600 deploy/stream.env; P=stream; fi
  # the real-client camera runs only when its output is there (deploy/camera.env, made by hand on picasso)
  if [ -f deploy/camera.env ]; then chmod 600 deploy/camera.env; P="${P:+$P,}camera"; mkdir -p ../camera/auth && chmod 700 ../camera ../camera/auth; fi
  if [ -n "$P" ]; then export COMPOSE_PROFILES=$P; fi
  cd deploy && docker compose up -d --build 2>&1 | tail -4 && docker compose ps --format "{{.Service}}: {{.Status}}"
  # the images this build replaced: dangling, ours only (an image a container still uses is never removed)
  docker image prune -f --filter "label=org.picasso-lab.app=muse-minecraft" | tail -1
  grep -q "^WEB_PROXY_SECRET=" .env || echo "note: deploy/.env has no WEB_PROXY_SECRET: forwarded headers are believed from any local peer on 7850 (README, Deploy on picasso)"'
}

if (( CHECK_ONLY )); then check; exit; fi
before=$(fingerprint)
staging
if ! check; then print -u2 "push: the staging checks failed; production was not touched"; exit 1; fi
if (( ! PROD )); then
  (( DRY )) || print "push: staging runs this code and passed its checks; deploy/push.sh --prod also puts it in production"
  exit 0
fi
if [[ $(fingerprint) != "$before" ]]; then print -u2 "push: files changed while staging was checked; production was not touched (run it again)"; exit 1; fi
prod
