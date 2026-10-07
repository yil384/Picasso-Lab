#!/bin/zsh
# Deploy the agent to picasso (play.picasso-lab.com): copy the code, then rebuild and restart the containers.
# Games in progress end when the agent restarts; check https://play.picasso-lab.com/ first ("Bots in use"). With
# deploy/stream.env on picasso, the live-video streamer (compose profile "stream") is built and started too; with
# deploy/camera.env, the real-client camera (profile "camera"; its account signed in with scripts/camera-login.mjs).
# Afterwards it prunes our own dangling images (label org.picasso-lab.app=muse-minecraft, set in every Dockerfile here):
# the lab shares the Docker root, so it never touches an image without that label.
set -e
A=$(cd "$(dirname "$0")/.." && pwd)
R=picasso:workspace/muse-minecraft
ssh picasso 'mkdir -p ~/workspace/muse-minecraft/{app,data,logs}'
(cd "$A" && rsync -az --delete --exclude deploy/.env --exclude deploy/stream.env --exclude deploy/camera.env --relative src scripts deploy package.json package-lock.json README.md .dockerignore $R/app/)
(cd "$A/server" && rsync -azL paper.jar $R/app/paper.jar && rsync -azL --delete --include '*.jar' --exclude '*' plugins/ $R/app/plugins/)
ssh picasso 'set -e; cd ~/workspace/muse-minecraft/app
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
  grep -q "^WEB_TRUSTED_PROXIES=" .env || echo "note: deploy/.env has no WEB_TRUSTED_PROXIES: forwarded headers are believed from any peer on 7850 (README, Configuration)"'
