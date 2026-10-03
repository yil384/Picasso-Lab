#!/bin/bash
# Rebuild the film's working directory in a fresh session: the video-kit pipeline (branch video-kit) at ~/vk and the
# film dir ~/vk/video-kit/films/xfilm from the repo's scene code + kit assets. Edit there, then kit/build_kit.py syncs back.
set -e
REPO=$(git -C "$(dirname "$0")" rev-parse --show-toplevel); XL=$REPO/.claude/films/xlaunch
if [ ! -d ~/vk/video-kit/pipeline ]; then git -C "$REPO" fetch -q origin video-kit && git -C "$REPO" worktree add -f ~/vk origin/video-kit; fi
F=~/vk/video-kit/films/xfilm; mkdir -p "$F"
cp "$XL"/scene/*.html "$XL"/scene/*.js "$F"/ 2>/dev/null || true
cp -r "$XL"/scene/tex "$F"/
for d in cut pages photos; do rm -rf "$F/$d"; cp -r "$XL/kit/assets/$d" "$F/$d"; done
cp "$XL"/kit/assets/{data.json,team.jpg,logo.png} "$F"/
cp -r "$XL"/kit/assets/pv/fonts/. ~/vk/video-kit/pipeline/fonts/      # Newsreader etc. were added for this film
pip -q install playwright pillow numpy opencv-python-headless onnxruntime 2>/dev/null || true
echo "ready: $F   (snap: cd ~/vk/video-kit/pipeline && python3 snap.py ../films/xfilm/film10.html 0 120 --out /tmp/s --width 432 --height 540)"
