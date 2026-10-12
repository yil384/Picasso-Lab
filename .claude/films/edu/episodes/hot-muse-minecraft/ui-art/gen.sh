#!/bin/bash
# One square image with Codex's image tool (the logged-in local codex CLI), as in .claude/films/yufei/anime/gen.sh.
# usage: ./gen.sh NAME "description" [ref.png ...]   -> art/NAME.png
# The prompt goes in on stdin: `codex exec -i` swallows a positional prompt.
cd "$(dirname "$0")"; mkdir -p art logs
CODEX=${CODEX:-$HOME/.local/share/picasso-tools/node_modules/.bin/codex}
N=$1; S=$2; shift 2
REFS=(); for r in "$@"; do REFS+=(-i "$r"); done
P="Generate ONE square image (1024x1024) with your image generation tool and save it as art/$N.png in the current directory (copy the generated file there; do not write any code to draw it). $S $([ -z "$NOCHAR" ] && cat character.txt) $(cat style.txt) ${1:+Use the attached image(s) as the reference for the character design, proportions, colours and line style, so every image shows exactly the same character.} When the file is saved, reply with just its path."
printf "%s" "$P" | "$CODEX" exec --skip-git-repo-check -s workspace-write -C "$PWD" "${REFS[@]}" > logs/$N.log 2>&1
echo "EXIT $?" >> logs/$N.log
[ -f art/$N.png ] && echo "ok   art/$N.png" || echo "FAIL $N (see logs/$N.log)"
