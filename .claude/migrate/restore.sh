#!/bin/zsh
# On the new Mac: unpack the archive from pack.sh into a cloned repo and Claude Code's folders.
#   git clone git@github.com:yil384/Picasso-Lab.git ~/UCSD/Picasso-Lab && cd ~/UCSD/Picasso-Lab && git checkout claude/edu-series
#   tar -xzf picasso-migrate-YYYYMMDD.tar.gz && picasso-migrate/restore.sh ~/UCSD/Picasso-Lab
set -u
REPO=$(cd "${1:?usage: restore.sh PATH_TO_CLONED_REPO}" && pwd)
HERE=$(cd "$(dirname "$0")" && pwd)
KEY=${REPO//\//-}; CL=$HOME/.claude
echo "== project files -> $REPO"; cp -R $HERE/repo/. $REPO/
echo "== memory -> $CL/projects/$KEY/memory"; mkdir -p $CL/projects/$KEY
[ -d $HERE/claude/memory ] && cp -R $HERE/claude/memory $CL/projects/$KEY/
[ -d $HERE/claude/session ] && cp -R $HERE/claude/session/. $CL/projects/$KEY/
[ -d $HERE/claude/rules ] && { mkdir -p $CL/rules; cp -R $HERE/claude/rules/. $CL/rules/; }
[ -f $HERE/claude/CLAUDE.md ] && [ ! -f $CL/CLAUDE.md ] && cp $HERE/claude/CLAUDE.md $CL/CLAUDE.md
[ -f $HERE/claude/settings.json ] && [ ! -f $CL/settings.json ] && cp $HERE/claude/settings.json $CL/settings.json
echo "== scratch assets -> ~/picasso-assets (tell Claude where they are; old paths were /private/tmp/...)"
mkdir -p $HOME/picasso-assets && cp -R $HERE/scratch/. $HOME/picasso-assets/
[ -d $HERE/downloads ] && [ -n "$(ls $HERE/downloads)" ] && cp -R $HERE/downloads/. $HOME/Downloads/
cat <<'TXT'
== now install the tools (once):
  brew install node ffmpeg poppler gh git-lfs
  python3 -m pip install --user numpy pillow opencv-python scikit-image scipy playwright edge-tts openai-whisper
  python3 -m playwright install chromium
  npm i -g @openai/codex            # art generation (then: codex login)
  gh auth login                     # GitHub; or add your SSH key: ssh-add --apple-use-keychain ~/.ssh/id_ed25519
Then install Claude Code, open it in the repo, and say: "continue from MEMORY.md; assets are in ~/picasso-assets".
TXT
