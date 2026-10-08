#!/bin/sh
# Makes the data folder once (README "Deploy"): HOLDEM_DATA_DIR from .env, owned by uid 1000 (the image's node user)
# with mode 700, so the service can write it and no other host user can read it (it also sits under /home/yichen,
# mode 750). Owning a folder by another uid needs root, so a throwaway container of the service image does it (run
# `docker compose build` first). An existing folder is left as it is.
set -eu
cd "$(dirname "$0")/.."
DATA=$(sed -n 's/^HOLDEM_DATA_DIR=//p' .env | tail -1)
IMAGE="${HOLDEM_IMAGE:-picasso/holdem-dealer:latest}"
[ -n "$DATA" ] || { echo "HOLDEM_DATA_DIR is not set in .env" >&2; exit 1; }
if [ -d "$DATA" ]; then echo "$DATA kept"; exit 0; fi
PARENT=$(dirname "$DATA")
NAME=$(basename "$DATA")
docker run --rm --network none --user 0 --entrypoint sh -v "$PARENT":/parent "$IMAGE" \
  -c "mkdir /parent/$NAME && chown 1000:1000 /parent/$NAME && chmod 700 /parent/$NAME"
echo "$DATA created (owner uid 1000, mode 700)"
