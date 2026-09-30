#!/bin/bash
cd /tmp/picasso-tools
export NODE_PATH=/opt/node22/lib/node_modules
while pgrep -f "review/rv6/check.js" >/dev/null; do sleep 2; done
echo "=== strobe"; node review/rv6/strobe.js 2>&1 | tail -3
echo "=== yue states"; node review/rv6/states.js yue_baseball yst 0 "0.95:0,0.95:0.2,0.95:0.4,0.99:0.2,0.99:0.4,0.95:0.6" 2>&1 | tail -2
for s in xiang_concert yichen_card_master yue_baseball zaifeng_academician zhengding_sunshine zhuo_gold_medal; do echo "=== rm $s"; node review/rv6/rm.js $s rm_${s%%_*} 0 2>&1 | tail -2; done
echo ALLDONE
