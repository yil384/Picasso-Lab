#!/bin/bash
# One image with Codex's image tool (needs a logged-in `codex` CLI), for the explainer channel's 2D looks.
# usage: ./gen.sh NAME "description" [ref.png ...]   -> src/NAME.png  (green #00FF00 background; key it with key.py)
# REFNOTE="..." overrides the sentence that tells the model what the reference images are (default: the felt cat).
# The prompt goes in on stdin: `codex exec -i` swallows a positional prompt.
cd "$(dirname "$0")"; mkdir -p src logs
N=$1; S=$2; shift 2
REFS=(); for r in "$@"; do REFS+=(-i "$r"); done
P="Generate ONE image with your image generation tool and save it as src/$N.png in the current directory (copy the generated file there; do not write any code to draw it). $S ${1:+${REFNOTE:-The attached image is the reference for the character design (a white fluffy cat with a red beret and a smug half-closed look): keep the same character, but in the material described.}} When the file is saved, reply with just its path."
printf "%s" "$P" | codex exec --skip-git-repo-check -s workspace-write -C "$PWD" "${REFS[@]}" > logs/$N.log 2>&1
echo "EXIT $?" >> logs/$N.log
[ -f src/$N.png ] && echo "ok   src/$N.png" || echo "FAIL $N (see logs/$N.log)"
