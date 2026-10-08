#!/bin/sh
# Puts the Resend API key into ./secrets/resend_api_key (README "Turn on save with email"), never printing it:
#   ops/resend-key.sh                 paste the key, then Enter (not echoed)
#   ops/resend-key.sh < keyfile       or from a file
# Only a key that looks like one (re_...) is written. The file is replaced in one step and made readable for the
# container's user like the other secrets (mode 444 inside the 700 folder). Restart the service afterwards
# (`docker compose up -d --force-recreate`): it reads the key once at startup.
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p secrets
chmod 700 secrets
if [ -t 0 ]; then
  printf 'Resend API key (not shown): ' >&2
  stty -echo
  trap 'stty echo' EXIT INT TERM
  IFS= read -r key || true
  stty echo
  trap - EXIT INT TERM
  echo >&2
else
  IFS= read -r key || true
fi
key=$(printf '%s' "$key" | tr -d '[:space:]')
case "$key" in
  re_????????*) ;;
  *) echo "that does not look like a Resend API key (re_...); nothing written" >&2; exit 1 ;;
esac
tmp=secrets/.resend_api_key.tmp
rm -f "$tmp"
printf '%s\n' "$key" > "$tmp"
chmod 444 "$tmp"
mv -f "$tmp" secrets/resend_api_key
echo "secrets/resend_api_key written"
