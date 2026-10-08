#!/bin/zsh
# host.sh <paper|van|iron> <built tree> : start one Mine AI MCP host (Bun) for a Tst_rv bench bot; logs and bot data go
# under $WORK (default ~/picasso-work/rv-craft). paper = spike Paper on 25566 (MCP on 25691), van = spike vanilla on
# 25567 (25692), iron = the fresh Paper copy for the iron route on 25568 (25693). BOT and LP override name and port.
which=$1; tree=${2:?usage: host.sh <paper|van|iron> <tree built by fetch-and-patch.sh>}
BUN=${BUN:-$(command -v bun)}
WORK=${WORK:-$HOME/picasso-work/rv-craft}
case $which in
  paper) MCP=25566; LP=${LP:-25691}; U=${BOT:-Tst_rv_cp} ;;
  van)   MCP=25567; LP=${LP:-25692}; U=${BOT:-Tst_rv_cv} ;;
  iron)  MCP=25568; LP=${LP:-25693}; U=${BOT:-Tst_rv_ir} ;;
  *) echo "paper, van or iron" >&2; exit 2 ;;
esac
mkdir -p $WORK/logs $WORK/data
cd $tree
exec $BUN src/server/host.ts --minecraft-port $MCP --username $U --listen-port $LP \
  --data-root $WORK/data/$which-$U > $WORK/logs/host-$which-$U.log 2>&1
