#!/bin/bash
# camera framing test: tools/camtest.sh FRAME OUT.jpg "name:az,el,r,tx,ty,tz[,fov]" ... -> the variants stacked (960x540 each)
# (the trailing ",0" keeps nshoot's own "?w=..." query from corrupting the last number)
cd "$(dirname "$0")/.." || exit 1
F=$1; OUT=$2; shift 2
D=work/cam/_ct$$; mkdir -p $D
i=0
for v in "$@"; do n=${v%%:*}; c=${v#*:}; case $(echo "$c" | tr -cd , | wc -c) in 5) c="$c,30,0";; *) c="$c,0";; esac
  python3 ../../pipeline/tools/nshoot.py "qubrio.html?cam=$c" stills $F --out $D --prefix $(printf %02d $i)_$n --width 960 --height 540 > /dev/null 2>&1 &
  i=$((i+1)); done; wait
python3 - "$D" "$OUT" <<'PY'
import sys, glob
from PIL import Image, ImageDraw
fs = sorted(glob.glob(sys.argv[1] + '/*.jpg')); ims = [Image.open(f) for f in fs]
W = Image.new('RGB', (960 * 2, 540 * ((len(ims) + 1) // 2)), 'white')
for i, (f, im) in enumerate(zip(fs, ims)):
    W.paste(im, (960 * (i % 2), 540 * (i // 2))); ImageDraw.Draw(W).text((960 * (i % 2) + 8, 540 * (i // 2) + 6), f.split('/')[-1], fill=(255, 0, 0))
W.save(sys.argv[2], quality=85)
PY
rm -rf $D
