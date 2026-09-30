#!/bin/bash
# encode_stack.sh NAME -> out/NAME.mp4: 960x1440 H.264 (colour on top, alpha below), CRF search to <= 850 KB
set -e
cd "$(dirname "$0")"; mkdir -p out
N=$1; F=render/${N}_stack
for crf in 24 26 28 30 32; do
  ffmpeg -v error -y -framerate 24 -i $F/f_%05d.png -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -c:v libx264 -profile:v high -preset veryslow -crf $crf -tune animation -movflags +faststart -an out/$N.mp4
  sz=$(wc -c < out/$N.mp4); [ $sz -le 870400 ] && break
done
echo "$N crf=$crf mp4=$(wc -c < out/$N.mp4) webp=$(wc -c < out/$N.webp)"
