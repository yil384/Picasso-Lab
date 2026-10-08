#!/bin/sh
# Every 5 minutes from cron (README "Watchdog"):  */5 * * * * /home/yichen/workspace/holdem-dealer/ops/watchdog.sh
# Asks the running service how it is (src/health.js). A service that does not answer (its event loop is stuck) is
# restarted. One that answers but cannot write its data is NOT restarted - its memory holds the only copy of every
# change since the disk failed - and the problem is logged for a person (usually a full disk: df -h $HOME).
# A container that is not running is left alone (stopped on purpose, e.g. for a restore; crashes restart by
# themselves). Lines go to ~/backups/holdem/watchdog.log.
set -u
cd "$(dirname "$0")/.."
LOG="${HOLDEM_WATCHDOG_LOG:-$HOME/backups/holdem/watchdog.log}"
mkdir -p "$(dirname "$LOG")"
[ -n "$(docker compose ps -q --status running holdem-dealer 2>/dev/null)" ] || exit 0
out=$(timeout 30 docker compose exec -T holdem-dealer node src/health.js 2>&1)
case "$out" in
  ok) exit 0 ;;
  persist_failing*)
    echo "$(date '+%F %T') data not being saved ($out); not restarting. Check: df -h $HOME" >>"$LOG"
    exit 1 ;;
  *)
    echo "$(date '+%F %T') no answer ($out); restarting" >>"$LOG"
    docker compose restart holdem-dealer >>"$LOG" 2>&1
    exit 1 ;;
esac
