#!/bin/bash
# usage: ./gen.sh NAME REF.jpg "scene description"  -> art/NAME.png (Q-version art from an event photo)
# Crop children / family out of the reference photo first.
cd "$(dirname "$0")"; mkdir -p art logs
N=$1; R=$2; S=$3
P="Generate ONE image with your image generation tool and save it as art/$N.png in the current directory (create art/ if needed; copy the generated file there — do not write any code to draw it). Scene: $S $(cat style.txt) Use the attached photo only as the reference for the people. When the file is saved, reply with just its path."
printf "%s" "$P" | codex exec --skip-git-repo-check -s workspace-write -C "$PWD" -i "$R" > logs/$N.log 2>&1
echo "EXIT $?" >> logs/$N.log
