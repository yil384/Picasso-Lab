#!/bin/bash
# Review evidence from a rendered pass: encode the segments to a review mp4, then contact sheet (1 f/s), motion strips per
# beat (every 2nd frame), the loop seam, and card-size crops. Usage: tools/evidence.sh OUT_DIR TAG
set -e
OUT=$1; TAG=$2
HERE=$(cd "$(dirname "$0")" && pwd)
EV="$OUT/ev_$TAG"; mkdir -p "$EV"
python3 "$HERE/encode_segs.py" "$OUT" master tritongym --crf 20 --preset veryfast > /dev/null
V="$OUT/tritongym_master.mp4"
S="python3 $HERE/sheet.py video"
$S "$EV/sheet_1fps.jpg" "$V" --every 24 --nframes 660 --cols 6 --thumb 320 > /dev/null
strip() { $S "$EV/strip_$1.jpg" "$V" --frames $(seq -s ' ' $2 2 $3) --cols 8 --thumb 240 > /dev/null; }
strip b1_write 0 94
strip b2_compile 96 190
strip b3_verify 192 262
strip b4_race1 264 358
strip b5_refine 360 418
strip b6_lap2 420 486
strip b7_race2 488 562
strip b8_payoff 564 634
$S "$EV/strip_seam.jpg" "$V" --frames $(seq -s ' ' 636 2 658) $(seq -s ' ' 0 2 14) --cols 10 --thumb 240 > /dev/null
$S "$EV/card.jpg" "$V" --frames 30 70 131 150 186 238 270 330 400 450 530 552 600 620 --cols 2 --card > /dev/null
echo "$EV"; ls "$EV"
