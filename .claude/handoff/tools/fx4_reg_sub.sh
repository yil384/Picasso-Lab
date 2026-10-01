#!/bin/bash
# regression pass: every kit scene at desktop 266x284, phone 257x274, 163x174 and 151x161 (DSF 2)
# usage: fx4_reg.sh <lane 0|1>   (two lanes run side by side)
LANE=$1
cd /tmp/picasso-tools
export NODE_PATH=/opt/node22/lib/node_modules DSF=2
declare -A T
T[chang_top_scorer]=0,0.3,0.6,0.9,1.2,2.0,3.1,4.3
T[jixuan_painting]=0,0.15,0.35,0.6,0.9,1.3,2.0,3.1
T[keyi_esports_genius]=0,0.35,0.6,0.9,1.0,1.2,2.0,3.1
T[ohm]=0,0.35,0.6,0.9,1.1,1.3,2.0,3.1
T[xiang_concert]=0,0.3,0.6,1.0,1.4,2.0,2.4,3.3,5.0
T[yichen_card_master]=0,0.1,0.3,0.55,0.75,1.1,1.4,2.0,2.2,2.5,3.0,5.6
T[yue_baseball]=0,0.3,0.7,0.95,0.99,1.3,2.0,2.4
T[zaifeng_academician]=0,0.2,0.46,0.6,0.9,1.1,1.5,2.0,2.4,3.0
T[zhengding_sunshine]=0,0.3,0.6,0.9,1.05,1.15,1.3,2.0,2.4,3.0
T[zhuo_gold_medal]=0,0.12,0.3,0.6,0.9,1.2,1.5,2.0,2.4,3.3,5.0
T[zhongkai_academician]=0,0.3,0.6,0.78,0.9,1.1,1.3,2.0,2.4,3.1
S=(${SCENES})
CFG=("d 266 284 0" "p 257 274 1" "s163 163 174 0" "s151 151 161 0")
i=0
for s in "${S[@]}"; do
  for c in "${CFG[@]}"; do
    set -- $c
    n=$i; i=$((i+1))
    (( n % 2 == LANE )) || continue
    pre="${PRE:-fx4r}_${s%%_*}_$1"
    echo "=== $s $1"
    timeout 400 node fx4_test.js $s $pre ${T[$s]} 0.3,0.6,1 $4 $2 $3 2>&1 | grep -v '^kit s'
    python3 fx4_ana.py $pre $2 $3 $4 2
  done
done
