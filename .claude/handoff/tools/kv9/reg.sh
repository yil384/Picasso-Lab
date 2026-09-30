#!/bin/bash
# usage: kv9/reg.sh <lane 0|1>
LANE=$1
cd /tmp/picasso-tools
export NODE_PATH=/opt/node22/lib/node_modules
S=(zhuo_gold_medal chang_top_scorer yue_baseball zhongkai_academician)
CFG=("d 266 284 d" "p 257 274 p" "s163 163 174 d" "s151 151 161 d" "pl 168 180 pl")
i=0
for s in "${S[@]}"; do
  for c in "${CFG[@]}"; do
    set -- $c
    n=$i; i=$((i+1))
    (( n % 2 == LANE )) || continue
    pre="r_${s%%_*}_$1"
    timeout 400 node kv9/reg.js $s $pre $2 $3 $4 > /dev/null 2>&1
    python3 kv9/ana.py $pre
  done
done
