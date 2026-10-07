#!/bin/zsh
# Deploy the agent to picasso (play.picasso-lab.com): copy the code, then rebuild and restart the containers.
# Games in progress end when the agent restarts; check https://play.picasso-lab.com/ first ("Bots in use"). With
# deploy/stream.env on picasso, the live-video streamer (compose profile "stream") is built and started too.
set -e
A=$(cd "$(dirname "$0")/.." && pwd)
R=picasso:workspace/muse-minecraft
ssh picasso 'mkdir -p ~/workspace/muse-minecraft/{app,data,logs}'
(cd "$A" && rsync -az --delete --exclude deploy/.env --exclude deploy/stream.env --relative src scripts deploy package.json package-lock.json README.md .dockerignore $R/app/)
(cd "$A/server" && rsync -az paper.jar $R/app/paper.jar && rsync -az --delete --include '*.jar' --exclude '*' plugins/ $R/app/plugins/)
ssh picasso 'set -e; cd ~/workspace/muse-minecraft/app
  [ -f deploy/.env ] || printf "WEB_ADMIN_TOKEN=%s\n" "$(openssl rand -base64 24 | tr -d "/+=" | head -c 32)" > deploy/.env
  chmod 600 deploy/.env
  # the live-video streamer runs only when its stream keys are there (deploy/stream.env, made by hand on picasso)
  if [ -f deploy/stream.env ]; then chmod 600 deploy/stream.env; export COMPOSE_PROFILES=stream; fi
  cd deploy && docker compose up -d --build 2>&1 | tail -4 && docker compose ps --format "{{.Service}}: {{.Status}}"'
