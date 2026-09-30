#!/bin/bash
# Square effect sprite (explosion etc.). Codex returns an RGBA PNG with a real transparent background;
# look at it over a coloured backdrop — a JPEG preview flattens the alpha to white and fools you.
# usage: ./gen_sq.sh NAME "description"  -> art/NAME.png (1024x1024)
cd "$(dirname "$0")"; mkdir -p art logs
N=$1; S=$2
P="Generate ONE square image (1024x1024) with your image generation tool and save it as art/$N.png in the current directory (copy the generated file there — do not write any code to draw it). Subject: $S $(cat style.txt) When the file is saved, reply with just its path."
printf "%s" "$P" | codex exec --skip-git-repo-check -s workspace-write -C "$PWD" > logs/$N.log 2>&1
echo "EXIT $?" >> logs/$N.log
