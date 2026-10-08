#!/bin/sh
# deploy/camera-test/stop-fb.sh - stops a live test started by fb-start.sh: the watchdog (unless it is the caller),
# the bot loop, the camera's stream (ffmpeg finishes and closes the ingest), then the camera container. Run by hand to
# stop early; fb-start.sh's watchdog runs it with "auto".
DEPLOY=$(cd "$(dirname "$0")/.." && pwd)
TEST=$(cd "$DEPLOY/../.." && pwd)
cd "$DEPLOY" || exit 1
W="$TEST/fb-watchdog.pid"
[ "$1" = auto ] || { [ -f "$W" ] && kill -- "-$(cat "$W")" 2>/dev/null; }
rm -f "$W"
# the loop's node process; the shell running this loop has show.mjs in its own command line, so it skips itself
docker exec muse-camera-test-agent-1 sh -c 'for p in /proc/[0-9]*; do [ "${p#/proc/}" = "$$" ] && continue; grep -qs show.mjs $p/cmdline && kill ${p#/proc/}; done' 2>/dev/null
docker exec muse-camera-test-camera-1 node -e "fetch('http://127.0.0.1:7862/streams').then((r) => r.json()).then(async (l) => { for (const s of l.streams) await fetch('http://127.0.0.1:7862/streams/' + s.id, { method: 'DELETE' }); })" 2>/dev/null
sleep 10
docker compose -f camera-test.compose.yaml stop camera >/dev/null 2>&1
echo "$(date -u +%FT%TZ) stopped (${1:-by hand})" >> "$TEST/fb-test.log"
