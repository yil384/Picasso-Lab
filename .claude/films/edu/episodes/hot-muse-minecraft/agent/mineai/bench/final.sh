#!/bin/zsh
# final.sh <paper|van> : the acceptance runs on one server, in order (a host from host.sh must be up). Each run writes
# $WORK/runs/<label>.json and .out; the summary of each is printed. Labels carry the date: the runtime keeps submission
# ids across restarts, and the bench adds a per-run stamp to them as well.
BENCH="$(cd "$(dirname "$0")" && pwd)"
WORK=${WORK:-$HOME/picasso-work/rv-craft}
mkdir -p $WORK/runs && cd $WORK
s=$1; day=$(date +%Y%m%d-%H%M)
run() { label=$1; shift; node "$BENCH/$1" "${@:2}" --label $label > runs/$label.out 2>&1; tail -1 runs/$label.out; }
run $s-2x2-$day bench.mjs --server $s --series 2x2 --n 50
run $s-table-$day bench.mjs --server $s --series table --n 30
run $s-chest-$day flows.mjs --server $s --series chest --n 30
run $s-chest2-$day flows.mjs --server $s --series chest2 --n 30
run $s-equip-$day equip.mjs --server $s --n 10
run $s-smelt-$day flows.mjs --server $s --series smelt --n ${SMELT_N:-12}
