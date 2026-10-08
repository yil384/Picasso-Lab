#!/bin/sh
# deploy/recreate.sh production|staging [all]: recreate the agent (with "all": Paper too) from the images there are,
# never building, so a changed deploy/.env takes effect (docs/SWITCH.md, steps 3-5). Run on picasso, any directory.
#
# - The containers that live in the agent's network namespace (stream, camera: network_mode "service:agent") are
#   recreated with it, the ones push.sh starts (deploy/stream.env, deploy/camera.env there). A bare
#   `docker compose up -d --no-deps --force-recreate agent` leaves a running stream or camera in the removed agent's
#   namespace, cut off from the new agent with no error.
# - Idle check first: it reads "Bots in use" from the agent itself (inside its container, so the proxy secret does not
#   apply) and stops when a game is in progress, since a recreate ends every game. MUSE_NOW=1 goes on anyway (a
#   rollback that cannot wait). An agent that does not answer (down, restarting) does not stop it.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
target=${1:-}; what=${2:-agent}
usage() { echo "usage: recreate.sh production|staging [all]   (MUSE_NOW=1: even with games in progress)" >&2; exit 2; }
case $what in agent|all) ;; *) usage ;; esac
profiles=""; extra=""
case $target in
  production)
    file=compose.yaml; container=muse-minecraft-agent-1; set --
    if [ -f "$here/stream.env" ]; then profiles=stream; extra=" stream"; fi
    if [ -f "$here/camera.env" ]; then profiles="${profiles:+$profiles,}camera"; extra="$extra camera"; fi
    ;;
  staging)
    file=staging.compose.yaml; container=muse-staging-agent-1; set -- -p muse-staging -f staging.compose.yaml ;;
  *) usage ;;
esac
[ -f "$here/$file" ] || { echo "recreate: no $file in $here (the deployed deploy/ folder of $target?)" >&2; exit 2; }
cd "$here"

n=$(docker exec "$container" node -e 'fetch("http://127.0.0.1:8787/").then((r) => r.text()).then((t) => console.log((/Bots in use: (\d+) of/.exec(t) || [])[1] ?? "?"), () => console.log("?"))' 2>/dev/null) || n="?"
case $n in
  0) echo "recreate: $target is idle (Bots in use: 0)" ;;
  ''|*[!0-9]*) echo "recreate: the $target agent did not say how many bots are in use (down or restarting?); going on" ;;
  *) if [ "${MUSE_NOW:-}" = 1 ]; then echo "recreate: $n bot(s) in use, going on (MUSE_NOW=1): their games end"
     else echo "recreate: STOPPED, nothing changed: $n bot(s) in use on $target, and a recreate ends their games; wait for 0 (or MUSE_NOW=1)" >&2; exit 3; fi ;;
esac

if [ "$what" = all ]; then services="paper agent$extra"; else services="agent$extra"; fi
echo "recreate: $services${profiles:+ (profiles $profiles)}"
# shellcheck disable=SC2086 # $services is a list of service names
COMPOSE_PROFILES=$profiles docker compose "$@" up -d --no-build --no-deps --force-recreate $services
COMPOSE_PROFILES=$profiles docker compose "$@" ps --format '{{.Service}}: {{.Status}}'
