#!/bin/bash
# One square image with Codex's image tool (needs the logged-in `codex` CLI; run on the Mac, not in a cloud VM).
# usage: ./gen.sh NAME "description" [ref.png ...]   -> art/NAME.png (1024x1024)
# The prompt goes in on stdin: `codex exec -i` swallows a positional prompt.
cd "$(dirname "$0")"; mkdir -p art logs
N=$1; S=$2; shift 2
REFS=(); for r in "$@"; do REFS+=(-i "$r"); done
P="Generate ONE square image (1024x1024) with your image generation tool and save it as art/$N.png in the current directory (copy the generated file there; do not write any code to draw it). $S $(cat character.txt) $(cat style.txt) ${1:+Use the attached image(s) as the reference for her face and the character design so every image stays consistent.} When the file is saved, reply with just its path."
printf "%s" "$P" | codex exec --skip-git-repo-check -s workspace-write -C "$PWD" "${REFS[@]}" > logs/$N.log 2>&1
echo "EXIT $?" >> logs/$N.log
[ -f art/$N.png ] && echo "ok   art/$N.png" || echo "FAIL $N (see logs/$N.log)"
