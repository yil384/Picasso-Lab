#!/bin/bash
# deploy/camera-test/camera-bench.sh - one measured pass of the real-client camera on the muse-camera-test stack (TEST
# server only): the camera recreated with the CAMERA_* / STREAM_* given in the environment, the fixed route bot
# (route.cjs), a camera stream to an MP4 while it walks. Prints the client's frames a second (Mesa's HUD, one value a
# second, the first 15 s of the window left out: chunks are still being built), ffmpeg's dropped and duplicated
# frames, the pacing of the picture (a raw 30 fps grab of the display for 30 s: new pictures a second and the gaps
# between them; a repeated picture is byte-identical there, unlike in the encoded video), and the camera container's
# CPU (cores) and RAM. Needs no ingest (park camera.env away first).
#
#   LABEL=baseline RUN_S=150 deploy/camera-test/camera-bench.sh
set -u
DEPLOY=$(cd "$(dirname "$0")/.." && pwd)
TEST=$(cd "$DEPLOY/../.." && pwd)
LABEL=${LABEL:-run}
RUN_S=${RUN_S:-150}
OUT=$TEST/bench
mkdir -p "$OUT"
[ -f "$DEPLOY/camera.env" ] && { echo "camera.env is there (a live ingest): move it away first"; exit 2; }
cd "$DEPLOY" || exit 1
docker compose -f camera-test.compose.yaml up -d --force-recreate camera >/dev/null 2>&1
sleep 3
for i in $(seq 1 90); do L=$(ls -t "$TEST"/logs/run-stream-*.jsonl | head -1); grep -q camera_joined "$L" && break; sleep 2; done
grep -q camera_joined "$L" || { echo "$LABEL: the camera did not join"; exit 1; }
sleep "${WARM:-15}"
docker cp "$DEPLOY/camera-test/route.cjs" muse-camera-test-agent-1:/tmp/route.cjs
docker exec -e RUN_S=$((RUN_S + 25)) -e ROUTE_AT="${ROUTE_AT:-54,-54}" -e CHOP="${CHOP:-0}" muse-camera-test-agent-1 node /tmp/route.cjs > "$OUT/$LABEL.route.txt" 2>&1 &
for i in $(seq 1 60); do grep -q '^ready' "$OUT/$LABEL.route.txt" && break; sleep 1; done
ID="bench-$LABEL"
api() { docker exec muse-camera-test-camera-1 node -e "$1"; }
api "fetch('http://127.0.0.1:7862/streams/$ID', { method: 'PUT', body: JSON.stringify({ source: 'http://127.0.0.1:1/eyes/$ID/', player: 'Tst_cam_route' }) }).then((r) => r.json()).then((j) => console.log(JSON.stringify(j)))" >/dev/null
sleep 15
cpu() { docker exec muse-camera-test-camera-1 cat /sys/fs/cgroup/cpu.stat | awk '/^usage_usec/{print $2}'; }
hudn() { docker exec muse-camera-test-camera-1 sh -c 'wc -l < /camera/cam0/hud/fps'; }
c0=$(cpu); h0=$(hudn); t0=$(date +%s)
G=$(docker exec muse-camera-test-camera-1 sh -c 'xdpyinfo -display :99 | awk "/dimensions/{print \$2}"')
docker exec -d muse-camera-test-camera-1 sh -c "ffmpeg -loglevel error -nostdin -y -f x11grab -draw_mouse 0 -framerate 30 -video_size $G -i :99 -t 30 -vf scale=160:90:flags=area,format=gray -f rawvideo /tmp/pace.gray"
sleep 45
# where the client's CPU goes: its busiest threads over 5 s (render thread, llvmpipe workers, chunk builders)
THREADS=$(docker exec muse-camera-test-camera-1 sh -c 'P=$(pgrep -f muse.camera.CameraMain | head -1); snap() { for t in /proc/$P/task/*; do printf "%s %s\n" "$(tr " " _ < $t/comm)" "$(cut -d")" -f2 $t/stat | awk "{print \$12+\$13}")"; done; }; snap > /tmp/t0; sleep 5; snap > /tmp/t1; paste /tmp/t0 /tmp/t1 | awk "{d=(\$4-\$2)/5; if (d>=5) a[\$1]+=d} END {for (k in a) print a[k], k}" | sort -rn | head -6 | awk "{printf \"%s %d%%, \", \$2, \$1}"')
sleep $((RUN_S - 65))
PACE=$(docker exec muse-camera-test-camera-1 node -e "
const b = require('fs').readFileSync('/tmp/pace.gray'); const F = 160 * 90; const n = Math.floor(b.length / F); const g = []; let last = 0;
for (let i = 1; i < n; i++) { if (Buffer.compare(b.subarray(i * F, i * F + F), b.subarray((i - 1) * F, i * F))) { g.push(i - last); last = i; } }
g.sort((x, y) => x - y); const ms = (f) => Math.round(f * 1000 / 30);
console.log('pictures ' + (g.length / (n / 30)).toFixed(1) + '/s, gap median ' + ms(g[g.length >> 1]) + ' p95 ' + ms(g[Math.floor(g.length * 0.95)]) + ' max ' + ms(g[g.length - 1]) + ' ms');")
c1=$(cpu); h1=$(hudn); t1=$(date +%s)
S=$(api "fetch('http://127.0.0.1:7862/streams/$ID').then((r) => r.json()).then((s) => console.log([s.encoder.frame, s.encoder.drop, s.encoder.dup, s.restarts.ffmpeg].join(' ')))")
MEM=$(docker exec muse-camera-test-camera-1 cat /sys/fs/cgroup/memory.current)
api "fetch('http://127.0.0.1:7862/streams/$ID', { method: 'DELETE' })" >/dev/null
docker exec muse-camera-test-camera-1 sh -c "sed -n '$((h0 + 1)),${h1}p' /camera/cam0/hud/fps" > "$OUT/$LABEL.fps"
echo "$t0" > "$OUT/$LABEL.t0"
FPS=$(sort -n "$OUT/$LABEL.fps" | awk '{a[NR]=$1; s+=$1} END {printf "mean %.1f p10 %.1f min %.1f n %d", s/NR, a[int(NR*0.1)+1], a[1], NR}')
read -r FRAMES DROP DUP RST <<< "$S"
echo "$LABEL: threads ${THREADS%, }" | tee -a "$OUT/results.txt"
echo "$LABEL: client fps $FPS | $PACE | ffmpeg frames $FRAMES drop $DROP dup $DUP restarts $RST | cpu $(echo "($c1 - $c0) / (($t1 - $t0) * 1000000)" | bc -l | cut -c1-4) cores, ram $((MEM / 1048576)) MB | load $(cut -d' ' -f1 /proc/loadavg)" | tee -a "$OUT/results.txt"
sleep 12
ls -t "$TEST"/streams/stream-$ID-*.mp4 | head -1
