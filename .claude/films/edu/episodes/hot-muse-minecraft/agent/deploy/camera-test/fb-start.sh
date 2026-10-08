#!/bin/sh
# deploy/camera-test/fb-start.sh - starts a live test of the real-client camera on the muse-camera-test stack (never
# production or staging): the camera (the test clock on unless STREAM_CLOCK=0), a hard stop after FB_MINUTES (30;
# stop-fb.sh auto) and the bot loop (show.mjs, SHOW_S seconds, a minute short of the stop). The ingest comes from
# deploy/camera.env (STREAM_RTMP_URL=rtmps://.../<key>, file 600, made on picasso by hand and never printed); without
# it the stream is an MP4 in ~/workspace/muse-camera-test/streams. Stop early with stop-fb.sh.
DEPLOY=$(cd "$(dirname "$0")/.." && pwd)
TEST=$(cd "$DEPLOY/../.." && pwd)
MIN=${FB_MINUTES:-30}
cd "$DEPLOY" || exit 1
[ -f camera.env ] || echo "note: no deploy/camera.env, so no ingest: the stream goes to an MP4"
STREAM_CLOCK=${STREAM_CLOCK:-1} docker compose -f camera-test.compose.yaml up -d camera >/dev/null 2>&1
sleep 3
for i in $(seq 1 90); do L=$(ls -t "$TEST"/logs/run-stream-*.jsonl | head -1); grep -q camera_joined "$L" && break; sleep 2; done
grep -q camera_joined "$L" || { echo "the camera did not join"; exit 1; }
setsid -f sh -c "echo \$\$ > '$TEST/fb-watchdog.pid'; sleep $((MIN * 60)); '$DEPLOY/camera-test/stop-fb.sh' auto" </dev/null >/dev/null 2>&1
date -u +%FT%TZ > "$TEST/fb-test.started"
docker cp "$DEPLOY/camera-test/show.mjs" muse-camera-test-agent-1:/tmp/show.mjs
docker exec muse-camera-test-agent-1 rm -f /tmp/show.log
docker exec -d -e SHOW_S="${SHOW_S:-$((MIN * 60 - 60))}" muse-camera-test-agent-1 node /tmp/show.mjs
echo "started $(cat "$TEST/fb-test.started"); hard stop after $MIN min"
