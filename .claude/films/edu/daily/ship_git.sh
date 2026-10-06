#!/bin/bash
# Ship an episode's sources: commit ONLY the given paths on the current branch, push it, then merge it into origin/main
# with --no-ff in a temporary detached worktree (the working tree, and any other uncommitted work in it, is never
# touched; no branch is left checked out anywhere) and push that merge to main. The house rule "commit, merge into
# main, push both" without the risks of a checkout at night.
#   bash .claude/films/edu/daily/ship_git.sh "Commit message" PATH...        (repo-relative or absolute paths)
#   GIT_DRY=1 bash .claude/films/edu/daily/ship_git.sh ...                   (print what would happen)
# Refuses: committing on main or a detached HEAD; course files, recordings, audio/video, slide images and crops
# (*/slides/*, *_panel*.png, any PNG outside art/src and art/cut), files over 15 MB (git-ignored files are never picked
# up); a merge that would bring guandan-kit/ into main.
# Exit codes: 0 done, 2 usage, 3 wrong branch, 4 refused file, 5 commit failed, 6 push failed, 7 merge refused/failed.
set -u
DRY=${GIT_DRY:-0}
run() { if [ "$DRY" = 1 ]; then echo "DRY: $*"; else "$@"; fi; }
REPO=$(git -C "$(dirname "$0")" rev-parse --show-toplevel) || exit 2
cd "$REPO" || exit 2
MSG=${1:-}; shift || true
if [ -z "$MSG" ] || [ $# -eq 0 ]; then echo "usage: $0 MESSAGE PATH..."; exit 2; fi
BR=$(git rev-parse --abbrev-ref HEAD)
case "$BR" in main|HEAD) echo "on '$BR': not committing here (check out the edu branch)"; exit 3 ;; esac
export GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=20"

FILES=()
while IFS= read -r f; do [ -n "$f" ] && FILES+=("$f"); done < <(
  { git ls-files --others --exclude-standard -- "$@"; git diff --name-only HEAD -- "$@"; } | sort -u)
for f in ${FILES[@]+"${FILES[@]}"}; do
  case "$f" in
    */course/*|course/*) echo "refused: $f is course material (never committed)"; exit 4 ;;
    */slides/*|slides/*|*_panel*.png) echo "refused: $f is a slide image or crop (course material)"; exit 4 ;;
    *.mp4|*.mov|*.m4v|*.wav|*.mp3|*.m4a|*.aac|*.flac|*.ogg) echo "refused: $f is audio/video"; exit 4 ;;
    .claude/films/edu/art/src/*.png|.claude/films/edu/art/cut/*.png) ;;
    .claude/films/edu/*.png|.claude/films/edu/*.jpg|.claude/films/edu/*.jpeg)
      echo "refused: $f is an image outside art/src and art/cut (a slide crop or a preview?)"; exit 4 ;;
  esac
  if [ -f "$f" ] && [ "$(stat -f %z "$f")" -gt 15000000 ]; then echo "refused: $f is over 15 MB"; exit 4; fi
done

if [ ${#FILES[@]} -gt 0 ]; then
  echo "committing ${#FILES[@]} file(s) on $BR:"; printf '  %s\n' "${FILES[@]}"
  run git add -A -- "${FILES[@]}" || exit 5
  run git commit -q -m "$MSG" -- "${FILES[@]}" || exit 5
else
  echo "nothing new to commit under: $*"
fi
run git push -q origin "$BR" || { echo "push of $BR failed (commit kept locally)"; exit 6; }

git fetch -q origin main || { echo "could not fetch origin/main"; exit 7; }
if git diff --name-only "origin/main...$BR" | grep -q '^guandan-kit/'; then
  echo "refused: merging $BR would bring guandan-kit/ into main"; exit 7
fi
SUBJ=$(printf '%s' "$MSG" | head -1 | cut -c1-72)
if [ "$DRY" = 1 ]; then
  echo "DRY: git worktree add --detach TMP origin/main; git -C TMP merge --no-ff $BR; git -C TMP push origin HEAD:main"
  exit 0
fi
TMP=$(mktemp -d "$HOME/picasso-work/ship-main.XXXXXX") || exit 7
rmdir "$TMP"
cleanup() { git worktree remove --force "$TMP" 2>/dev/null || rm -rf "$TMP"; git worktree prune; }
trap cleanup EXIT
git worktree add -q --detach "$TMP" origin/main || exit 7
if ! git -C "$TMP" merge -q --no-ff "$BR" -m "Merge $BR: $SUBJ"; then
  git -C "$TMP" merge --abort 2>/dev/null; echo "merge of $BR into main failed (aborted; nothing pushed to main)"; exit 7
fi
git -C "$TMP" push -q origin HEAD:main || { echo "push of main failed (nothing changed locally; run ship_git.sh again)"; exit 6; }
# keep the local main ref in step, but only when no worktree has main checked out (never touch a checkout)
if ! git worktree list --porcelain | grep -qx 'branch refs/heads/main'; then
  git fetch -q origin main:main 2>/dev/null || true
fi
echo "shipped: $BR -> main ($(git rev-parse --short "$BR"); main is $(git -C "$TMP" rev-parse --short HEAD))"
