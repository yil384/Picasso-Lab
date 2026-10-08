#!/bin/zsh
# iron.sh <label prefix> [spots...] : the strict iron route (iron-route.mjs: 8 actions, no retries) through the
# patched runtime at the M0 spike's spots B-F, on a fresh copy of the spike's Paper server (same jar, configs and seed
# 71811045, untouched world; IRON_SERVER_DIR, port 25568, host from `host.sh iron`, bot Tst_rv_ir). Before each spot:
# empty inventory, full health and food, the bot on the spot's start block. Labels must be new (the runtime replays a
# known submission id). Output: $WORK/runs/<prefix>-<spot>.json and $WORK/runs-<prefix>-<spot>.out.
BENCH="$(cd "$(dirname "$0")" && pwd)"
WORK=${WORK:-$HOME/picasso-work/rv-craft}
S=${IRON_SERVER_DIR:-$WORK/paper-iron-25568}
PREFIX=${1:-rv-paper}; shift
SPOTS=(${@:-B C D E F})
typeset -A AT
AT=(B "-502 123 401" C "1201 70 -898" D "-1501 76 -1297" E "2201 96 1798" F "-2601 70 2902")
con() { print -r -- "$*" > $S/console.in; sleep 0.4; }
mkdir -p $WORK/runs && cd $WORK
for spot in $SPOTS; do
  xyz=(${=AT[$spot]})
  con forceload add ${xyz[1]} ${xyz[3]}
  con clear Tst_rv_ir
  con effect clear Tst_rv_ir
  con tp Tst_rv_ir $((xyz[1] + 0.5)) ${xyz[2]} $((xyz[3] + 0.5))
  con effect give Tst_rv_ir minecraft:instant_health 1 5
  con effect give Tst_rv_ir minecraft:saturation 1 20
  sleep 4
  con forceload remove ${xyz[1]} ${xyz[3]}
  MCP_URL=${MCP_URL:-http://127.0.0.1:25693/mcp} node "$BENCH/iron-route.mjs" $PREFIX-$spot > runs-$PREFIX-$spot.out 2>&1
  tail -1 runs-$PREFIX-$spot.out
done
