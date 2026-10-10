#!/usr/bin/env bash
# fetch-and-patch.sh - build the Mine AI MCP runtime we use as the bot body (BODY=mineai, MINEAI_DIR): clone the
# pinned upstream commit (UPSTREAM.json) into a target folder, apply our patches (UPSTREAM.json's list, in order),
# install its dependencies with Bun from its own lockfile (frozen: the forks of mineflayer, prismarine-physics and
# prismarine-recipe stay at the commits it pins), stamp the folder (.muse-mineai.json, which
# `node scripts/mineai-fetch.mjs <dir> --check` reads), then typecheck and run the crafting tests. Their code never
# enters this repository; see README.md.
#
#   mineai/fetch-and-patch.sh <target dir> [--no-install] [--no-check]
#
# Needs git, Node (to read UPSTREAM.json) and Bun >= 1.4 (BUN=/path/to/bun if it is not on PATH). The target must not
# exist or be empty.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="${NODE:-$(command -v node || true)}"
[ -x "$NODE" ] || { echo "Node is needed to read $HERE/UPSTREAM.json (set NODE=/path/to/node)" >&2; exit 2; }
# the pin and the patch list: UPSTREAM.json is the one place they are written down
pin() { "$NODE" -e 'const u = require(process.argv[1]); const k = process.argv[2]; console.log(k === "patches" ? u.patches.join("\n") : u[k]);' "$HERE/UPSTREAM.json" "$1"; }
REPO="$(pin repo).git"
COMMIT="$(pin commit)"
MINEFLAYER_FORK="$(pin mineflayerFork)"   # what their package.json pins; checked after install
PATCHES=()
while IFS= read -r p; do [ -n "$p" ] && PATCHES+=("$HERE/$p"); done < <(pin patches)
[ "${#PATCHES[@]}" -gt 0 ] || { echo "UPSTREAM.json lists no patches" >&2; exit 1; }
TARGET="" INSTALL=1 CHECK=1
for arg in "$@"; do
  case "$arg" in
    --no-install) INSTALL=0; CHECK=0 ;;
    --no-check) CHECK=0 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    -*) echo "unknown option $arg" >&2; exit 2 ;;
    *) TARGET="$arg" ;;
  esac
done
[ -n "$TARGET" ] || { echo "usage: $0 <target dir> [--no-install] [--no-check]" >&2; exit 2; }
if [ -e "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null)" ]; then
  echo "$TARGET exists and is not empty; give a new folder" >&2; exit 2
fi
BUN="${BUN:-$(command -v bun || true)}"
if [ "$INSTALL" = 1 ]; then
  [ -x "$BUN" ] || { echo "Bun >= 1.4 is needed (set BUN=/path/to/bun)" >&2; exit 2; }
  version="$("$BUN" --version)"
  case "$version" in 1.[4-9]*|1.[1-9][0-9]*|[2-9]*) ;; *) echo "Bun $version is too old (>= 1.4)" >&2; exit 2 ;; esac
fi

echo "== clone $REPO at $COMMIT"
mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"
git -C "$TARGET" init -q
git -C "$TARGET" remote add origin "$REPO"
git -C "$TARGET" fetch -q --depth 1 origin "$COMMIT"
git -C "$TARGET" checkout -q --detach FETCH_HEAD
[ "$(git -C "$TARGET" rev-parse HEAD)" = "$COMMIT" ] || { echo "fetched the wrong commit" >&2; exit 1; }

echo "== apply our patches"
for patch in "${PATCHES[@]}"; do
  git -C "$TARGET" apply --check "$patch"
  git -C "$TARGET" apply "$patch"
  echo "   $(basename "$patch")"
done

if [ "$INSTALL" = 1 ]; then
  echo "== bun install --frozen-lockfile (Bun $("$BUN" --version))"
  (cd "$TARGET" && "$BUN" install --frozen-lockfile)
  # Bun tags a GitHub dependency with its owner, repository and short commit
  fork="$(cat "$TARGET/node_modules/mineflayer/.bun-tag" 2>/dev/null || echo unknown)"
  case "$fork" in
    *"aibengineering-mineflayer-${MINEFLAYER_FORK:0:7}"*) echo "   mineflayer: $fork" ;;
    *) echo "node_modules/mineflayer is not the pinned fork ${MINEFLAYER_FORK:0:7} ($fork)" >&2; exit 1 ;;
  esac
fi

# the stamp: this commit and these patch files (their sha-256), as scripts/mineai-fetch.mjs writes and checks it
"$NODE" "$HERE/../scripts/mineai-fetch.mjs" "$TARGET" --stamp
if [ "$INSTALL" = 1 ]; then "$NODE" "$HERE/../scripts/mineai-fetch.mjs" "$TARGET" --check; fi

if [ "$CHECK" = 1 ]; then
  echo "== typecheck, crafting tests, the config test (0005), placement (0007, 0009), collect and landings (0008), builds (0010, 0011), reflex toggles (0012)"
  (cd "$TARGET" && "$BUN" x --bun tsc -p tsconfig.check.json --noEmit)
  (cd "$TARGET" && "$BUN" test src/world/crafting.test.ts src/world/confirmed-craft.test.ts src/actions/craft-item \
    src/utils/craft-plan.test.ts src/actions/temporary-workstation.test.ts src/actions/smelt-item src/actions/use-container \
    src/server/config.test.ts src/world/block-classification.test.ts src/world/nearby-placement.test.ts \
    src/world/placement-candidates.test.ts src/actions/collect-block src/world/landing.test.ts \
    src/runtime/minecraft-runtime.test.ts src/server/runtime-host.test.ts \
    src/navigation/processes/building/build-process.test.ts src/actions/build-structure \
    src/navigation/mineflayer/movement-policy.test.ts \
    src/survival/reflexes/hunger.test.ts src/survival/reflexes/breath.test.ts)
fi

cat <<EOF
== ready: $TARGET
   one bot (Bun):  cd $TARGET && MINEAI_USERNAME=Tst_rv_X $BUN src/server/host.ts --minecraft-port 25566 --listen-port 25691 --data-root <dir>
   with Node 24+:  cd $TARGET && node --import tsx src/server/host.ts ...same flags...
EOF
