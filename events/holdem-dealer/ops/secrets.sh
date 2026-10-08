#!/bin/sh
# Makes the service's two secrets once (README "Deploy"): ./secrets/games_secret and ./secrets/ip_salt, 48 random
# bytes each. They are files, not env values, so `docker inspect` never shows them. An existing file is kept: a new
# GAMES_SECRET cuts saved accounts off from their emails, a new IP_SALT only forgets the IP memory.
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p secrets
chmod 700 secrets
for f in games_secret ip_salt; do
  if [ -s "secrets/$f" ]; then echo "secrets/$f kept"; continue; fi
  openssl rand -base64 48 > "secrets/$f"
  echo "secrets/$f created"
done
# The Resend API key (EMAIL_SENDER=resend) is not made here: it comes from Resend (ops/resend-key.sh writes it).
# Until then an empty file stands in, so compose can mount it; the service reads it only with EMAIL_SENDER=resend.
if [ -e secrets/resend_api_key ]; then
  echo "secrets/resend_api_key kept"
else
  : > secrets/resend_api_key
  echo "secrets/resend_api_key created empty (ops/resend-key.sh puts the key in)"
fi
# the container's user (uid 1000) reads them through the bind mount; the 700 folder keeps every other host user out
chmod 444 secrets/games_secret secrets/ip_salt secrets/resend_api_key
