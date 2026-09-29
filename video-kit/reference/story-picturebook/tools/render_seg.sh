#!/bin/zsh
# render_seg.sh A B : render frames [A,B) at 1920x1080 into a lossless segment out/seg/s_AAAA_BBBB.mkv (skip if present)
cd "$(dirname "$0")/.."
A=$1; B=$2; O=$(printf "out/seg/s_%04d_%04d.mkv" $A $B)
if [[ -s $O ]]; then n=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $O); if [[ $n == $((B-A)) ]]; then echo "skip $O ($n frames)"; exit 0; fi; fi
python3 ../../pipeline/tools/nshoot.py qubrio_book.html seg --range $A:$B --clip $O.tmp.mkv --deadline ${3:-96} 2>&1 | grep -v "warning\|404" | awk 'NR%10==1 || /frames/ || /ERROR|DEADLINE/'
n=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $O.tmp.mkv 2>/dev/null)
if [[ $n == $((B-A)) ]]; then mv $O.tmp.mkv $O; echo "OK $O $n frames $(du -h $O | cut -f1)"; else rm -f $O.tmp.mkv; echo "INCOMPLETE $O ($n)"; fi
