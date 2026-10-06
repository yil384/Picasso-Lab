#!/bin/zsh
# Pack everything this project needs that is NOT on GitHub into one archive, to carry to another Mac.
#   .claude/migrate/pack.sh DEST_DIR [--with-downloads] [--with-session]
# Includes: git-ignored course files, notes and slides; the drawn sprites (art/cut, so nothing has to be re-packed);
# Claude Code memory, global rules and settings (never API keys); the session scratch assets that cannot be regenerated
# cheaply (Prof. Ding's cut clips, word times, sound packs, music, writers'-room notes).
# --with-downloads also takes ~/Downloads/picasso-* (finished videos, ~1.5 GB).
# --with-session also takes this project's Claude Code transcripts (~1.5 GB) so `claude --resume` works if the repo
# sits at the same path on the new Mac.
set -u
DEST=${1:?usage: pack.sh DEST_DIR [--with-downloads] [--with-session]}; shift
WITH_DL=0; WITH_SESSION=0
for a in "$@"; do case $a in --with-downloads) WITH_DL=1;; --with-session) WITH_SESSION=1;; esac; done
REPO=$(cd "$(dirname "$0")/../.." && pwd)
KEY=${REPO//\//-}                                   # Claude Code's project key: the path with / turned into -
CL=$HOME/.claude
SCRS=($(ls -dtr /private/tmp/claude-$(id -u)/$KEY/*/scratchpad 2>/dev/null))   # every session, oldest first
STAGE=$(mktemp -d)/picasso-migrate; mkdir -p $STAGE/{repo,claude,scratch,downloads}

echo "== git"
cd $REPO
if [ -n "$(git status --porcelain)" ]; then echo "WARNING: uncommitted changes - commit them first:"; git status --short | head; fi
for b in main $(git branch --show-current); do
  [ "$(git rev-parse $b 2>/dev/null)" = "$(git rev-parse origin/$b 2>/dev/null)" ] || echo "WARNING: $b is not pushed to origin"
done

echo "== git-ignored project files"
for p in .claude/films/edu/course .claude/films/edu/art/cut .claude/films/edu/episodes/l01-1-scale/notes .claude/films/edu/episodes/l01-5min/slides; do
  [ -e "$p" ] && { mkdir -p "$STAGE/repo/$(dirname $p)"; cp -R "$p" "$STAGE/repo/$p"; echo "  $p"; }
done

echo "== Claude Code memory, rules, settings"
[ -d $CL/projects/$KEY/memory ] && cp -R $CL/projects/$KEY/memory $STAGE/claude/memory
[ -d $CL/rules ] && cp -R $CL/rules $STAGE/claude/rules
[ -f $CL/settings.json ] && cp $CL/settings.json $STAGE/claude/settings.json
[ -f $CL/CLAUDE.md ] && cp $CL/CLAUDE.md $STAGE/claude/CLAUDE.md
if [ $WITH_SESSION = 1 ]; then
  mkdir -p $STAGE/claude/session; cp $CL/projects/$KEY/*.jsonl $STAGE/claude/session/ 2>/dev/null
  for d in $CL/projects/$KEY/*/; do [ "$(basename $d)" = memory ] || cp -R "$d" $STAGE/claude/session/; done
fi

echo "== scratch assets (${#SCRS} session folders; the newest copy of each wins)"
for SCR in $SCRS; do
  for p in l01c/clips l01c/words.json snd ref; do
    [ -e "$SCR/$p" ] && { mkdir -p "$STAGE/scratch/$(dirname $p)"; rm -rf "$STAGE/scratch/$p"; cp -R "$SCR/$p" "$STAGE/scratch/$p"; echo "  $p  <- $(basename $(dirname $SCR))"; }
  done
done

if [ $WITH_DL = 1 ]; then echo "== ~/Downloads/picasso-*"; cp -R $HOME/Downloads/picasso-* $STAGE/downloads/ 2>/dev/null; fi

cp "$REPO/.claude/migrate/restore.sh" "$REPO/.claude/migrate/README.md" $STAGE/
OUT=$DEST/picasso-migrate-$(date +%Y%m%d).tar.gz
tar -czf $OUT -C $(dirname $STAGE) picasso-migrate && rm -rf $(dirname $STAGE)
echo "== done: $OUT ($(du -h $OUT | cut -f1))"
