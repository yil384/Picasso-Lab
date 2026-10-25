#!/bin/bash
# One slow web_art.py round (10 pictures, 3-6 min apart), started by launchd 4 times a day
# (com.picassolab.edu-webart.plist). Skips when a round is still running or when the queue is empty. Pictures go to
# ~/picasso-work/edu-art-drop (launchd cannot read ~/Downloads) and into the library, packed per episode.
HERE="$(cd "$(dirname "$0")" && pwd)"
PY="$HOME/miniforge3/bin/python3"
LOG="$HOME/picasso-work/logs/web_art.log"
export WEB_ART_DROP="$HOME/picasso-work/edu-art-drop"
say() { echo "$(date '+%F %T') $*" >> "$LOG"; }
if pgrep -f "web_art.py run" > /dev/null; then say "launchd: a round is still running; skipped"; exit 0; fi
if "$PY" "$HERE/web_art.py" list | tail -1 | grep -q '^0 pictures'; then say "launchd: queue empty"; exit 0; fi
say "launchd: round starts"
cd "$HERE" && exec "$PY" web_art.py run --max 10 >> "$HOME/picasso-work/logs/web_art.out" 2>&1
