#!/bin/sh
# scripts/soak-nightly.sh - the nightly soak on staging (scripts/soak.mjs), run by launchd on the Mac
# (deploy/soak/com.picassolab.muse-soak.plist, 04:00 local). It runs from its own checkout of main (MUSE_SOAK_WT,
# default ~/picasso-work/muse-soak-wt, a git worktree detached at origin/main, its node_modules linked to a working
# checkout's), brought up to date first, so the soak always plays with the current scripts. 3 games on
# https://play-staging.picasso-lab.com; the report goes to ~/picasso-work/soak/<date>.md, the run's lines to
# ~/picasso-work/soak/soak.log. Never production (soak.mjs refuses it).
set -eu
WT=${MUSE_SOAK_WT:-$HOME/picasso-work/muse-soak-wt}
OUT=${MUSE_SOAK_OUT:-$HOME/picasso-work/soak}
NODE=${MUSE_SOAK_NODE:-$(command -v node || echo /Users/linyichen/miniforge3/bin/node)}
mkdir -p "$OUT"
{
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) soak"
  git -C "$WT" fetch -q origin && git -C "$WT" checkout -q --detach origin/main
  cd "$WT/.claude/films/edu/episodes/hot-muse-minecraft/agent"
  "$NODE" scripts/soak.mjs https://play-staging.picasso-lab.com --games "${MUSE_SOAK_GAMES:-3}" --out "$OUT"
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) done ($?)"
} >> "$OUT/soak.log" 2>&1
