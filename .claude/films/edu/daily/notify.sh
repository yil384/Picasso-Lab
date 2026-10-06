#!/bin/bash
# A macOS notification for the daily run (Notification Center lists it under "Script Editor"), plus a line in
# ~/picasso-work/logs/notify.log so run.sh and the morning check can see what was said.
#   bash .claude/films/edu/daily/notify.sh "message" ["title"]
MSG=${1:-}
TITLE=${2:-Picasso daily}
mkdir -p "$HOME/picasso-work/logs"
echo "$(date '+%F %T') [$TITLE] $MSG" >> "$HOME/picasso-work/logs/notify.log"
[ "${NOTIFY_DRY:-0}" = 1 ] && exit 0          # tests: log only, no banner
/usr/bin/osascript - "$MSG" "$TITLE" <<'OSA' >/dev/null 2>&1
on run argv
  display notification (item 1 of argv) with title (item 2 of argv) sound name "Glass"
end run
OSA
exit 0
