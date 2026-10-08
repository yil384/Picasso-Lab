#!/bin/zsh
# stop.sh <bot name> : stop the mine-ai-mcp host and runtime of one Tst_rv bench bot
pkill -f -- "--username $1 " ; pkill -f -- "\"username\":\"$1\"" ; sleep 1
pgrep -fl -- "$1" || echo "stopped $1"
