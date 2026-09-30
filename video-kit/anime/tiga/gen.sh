#!/bin/bash
# Key frame generator (needs the Codex CLI with its image tool, logged in; runs on the Mac, not in a cloud VM).
# usage: ./gen.sh NAME "scene description" [ref1.png ref2.png ...]  -> art/NAME.png (1536x1024)
# The prompt goes in on stdin: `codex exec -i` swallows a positional prompt.
cd "$(dirname "$0")"; mkdir -p art logs
N=$1; S=$2; shift 2
REFS=(); for r in "$@"; do REFS+=(-i "$r"); done
P="Generate ONE landscape image (1536x1024) with your image generation tool and save it as art/$N.png in the current directory (copy the generated file there — do not write any code to draw it). Scene: $S $(cat style.txt) ${1:+Use the attached image(s) as the reference for the look of the setting and characters so they stay consistent.} When the file is saved, reply with just its path."
printf "%s" "$P" | codex exec --skip-git-repo-check -s workspace-write -C "$PWD" "${REFS[@]}" > logs/$N.log 2>&1
echo "EXIT $?" >> logs/$N.log
