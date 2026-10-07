#!/bin/bash
# One-line install / update of the local film renderer (needs only curl, which macOS has):
#   curl -fsSL https://raw.githubusercontent.com/yil384/Picasso-Lab/main/.claude/films/xlaunch/kit/get.sh | bash
# Downloads the film (scene code, painted characters, paper pages, the pv runtime) into ~/PicassoFilmKit and
# opens the renderer. Run it again to update: code is always refreshed, large assets only when missing.
set -e
BASE="https://raw.githubusercontent.com/yil384/Picasso-Lab/main"
DEST="$HOME/PicassoFilmKit"
mkdir -p "$DEST" && cd "$DEST"
curl -fsSL "$BASE/.claude/films/xlaunch/kit/manifest.txt" -o manifest.txt
N=$(wc -l < manifest.txt | tr -d ' ')
echo "Fetching $N files into $DEST ..."
# each line: <path in the repo> <path in the kit> <code|asset>
cat manifest.txt | xargs -P 8 -L 1 sh -c 'mkdir -p "$(dirname "$1")"; if [ "$2" = code ] || [ ! -s "$1" ]; then curl -fsSL "'"$BASE"'/$0" -o "$1" || echo "failed: $0"; fi'
chmod +x start.command
echo "Done. Opening the renderer..."
exec ./start.command
