#!/bin/bash
cd /tmp/picasso-tools
export NODE_PATH=/opt/node22/lib/node_modules
declare -A T
T[xiang_concert]=0,0.3,0.6,1.0,1.4,2.0,2.4,3.3,5.0
T[yichen_card_master]=0,0.1,0.3,0.55,0.75,1.1,1.4,2.0,2.2,2.5,3.0,5.6
T[yue_baseball]=0,0.3,0.7,0.8,0.93,0.95,0.99,1.05,1.2,1.5,2.0,2.4,8.15
T[zaifeng_academician]=0,0.2,0.46,0.6,0.9,1.1,1.5,2.0,2.4,3.0
T[zhengding_sunshine]=0,0.3,0.6,0.9,1.05,1.15,1.3,2.0,2.4,3.0
T[zhuo_gold_medal]=0,0.12,0.3,0.6,0.9,1.2,1.5,2.0,2.4,3.3,5.0
for s in xiang_concert yichen_card_master yue_baseball zaifeng_academician zhengding_sunshine zhuo_gold_medal; do
  for ph in 0 1; do
    p=${s%%_*}_$ph
    echo "=== $s phone=$ph"
    DSF=2 node review/rv6/check.js $s $p $ph ${T[$s]} 2>&1 | tail -3
    python3 review/rv6/ana.py $p $ph 2
  done
done
