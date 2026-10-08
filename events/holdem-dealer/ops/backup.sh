#!/bin/sh
# Daily backup of the service's data volume (README "Backup and restore"). Cron runs this script, so the crontab
# line holds no % (cron would cut the line there):
#   10 4 * * * /home/yichen/workspace/holdem-dealer/ops/backup.sh
# Writes ~/backups/holdem/holdem-YYYY-MM-DD.json.gz (folder 700, files 600, owned by the user running it): both data
# files from one moment, without the IP memory (src/backup.js). Keeps 14 days. Every run adds a line to backup.log
# there; a failure exits 1 (cron mails it when mail is set up).
set -u
cd "$(dirname "$0")/.."
DIR="${HOLDEM_BACKUP_DIR:-$HOME/backups/holdem}"
KEEP_DAYS="${HOLDEM_BACKUP_DAYS:-14}"
VOLUME="${HOLDEM_VOLUME:-holdem-dealer_holdem-data}"
IMAGE="${HOLDEM_IMAGE:-picasso/holdem-dealer:latest}"
umask 077
mkdir -p "$DIR" && chmod 700 "$DIR" || exit 1
LOG="$DIR/backup.log"
D=$(date +%F)
OUT="holdem-$D.json.gz"
if docker run --rm --network none --user 0 -e OWNER="$(id -u):$(id -g)" \
     -v "$VOLUME":/data:ro -v "$DIR":/backup "$IMAGE" node src/backup.js save /data "/backup/$OUT" >>"$LOG" 2>&1; then
  find "$DIR" -maxdepth 1 -name 'holdem-*.json.gz' -mtime +"$KEEP_DAYS" -delete
  echo "$(date '+%F %T') ok $OUT" >>"$LOG"
else
  echo "$(date '+%F %T') FAILED $OUT (the lines above say why)" >>"$LOG"
  exit 1
fi
