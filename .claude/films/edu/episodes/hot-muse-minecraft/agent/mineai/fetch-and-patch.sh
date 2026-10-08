#!/usr/bin/env bash
# fetch-and-patch.sh - build the Mine AI MCP runtime we use as the bot body: clone the pinned upstream commit into a
# target folder, apply our patches (patches/mine-ai-mcp/*.patch, in order), install its dependencies with Bun from
# its own lockfile (frozen: the forks of mineflayer, prismarine-physics and prismarine-recipe stay at the commits it
# pins), then typecheck and run the crafting tests. Their code never enters this repository; see README.md.
#
#   mineai/fetch-and-patch.sh <target dir> [--no-install] [--no-check]
#
# Needs git and Bun >= 1.4 (BUN=/path/to/bun if it is not on PATH). The target must not exist or be empty.
set -euo pipefail

REPO=https://github.com/aibengineering/mine-ai-mcp.git
COMMIT=2fe1306a0ac51efa99154048e65f2caff00a8934   # upstream main on 2026-10-08 ("Acknowledge first-time End credits ...")
MINEFLAYER_FORK=9fa1140b90877a084efd988905df0c0eceaa78d0   # what their package.json pins; checked after install

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
for patch in "$HERE"/patches/mine-ai-mcp/*.patch; do
  git -C "$TARGET" apply --check "$patch"
  git -C "$TARGET" apply "$patch"
  echo "   $(basename "$patch")"
done
{
  echo "mine-ai-mcp $COMMIT"
  for patch in "$HERE"/patches/mine-ai-mcp/*.patch; do
    echo "patch $(basename "$patch") $(git hash-object "$patch")"
  done
} > "$TARGET/.picasso-patched"

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

if [ "$CHECK" = 1 ]; then
  echo "== typecheck and crafting tests"
  (cd "$TARGET" && "$BUN" x --bun tsc -p tsconfig.check.json --noEmit)
  (cd "$TARGET" && "$BUN" test src/world/crafting.test.ts src/world/confirmed-craft.test.ts src/actions/craft-item \
    src/utils/craft-plan.test.ts src/actions/temporary-workstation.test.ts src/actions/smelt-item src/actions/use-container)
fi

cat <<EOF
== ready: $TARGET
   one bot (Bun):  cd $TARGET && $BUN src/server/host.ts --minecraft-port 25566 --username Tst_rv_X --listen-port 25691 --data-root <dir>
   with Node 24+:  cd $TARGET && node --import tsx src/server/host.ts ...same flags...
EOF
