#!/bin/bash
# Install (or remove) the daily explainer's LaunchAgent: run.sh every day at 02:00.
#   bash .claude/films/edu/daily/install.sh              check, install, load
#   bash .claude/films/edu/daily/install.sh --check      only the checks
#   bash .claude/films/edu/daily/install.sh --uninstall  unload and remove
# It never runs sudo: the power settings it suggests are for you to type.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
LABEL=com.picassolab.edu-daily
SRC="$HERE/$LABEL.plist"
DST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"
export PATH="$HOME/miniforge3/bin:$HOME/.local/bin:$HOME/.local/share/picasso-tools/node_modules/.bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

if [ "${1:-}" = --uninstall ]; then
  launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null && echo "unloaded $LABEL" || echo "$LABEL was not loaded"
  rm -f "$DST" && echo "removed $DST"
  exit 0
fi

ok=1
chk() { if eval "$2" > /dev/null 2>&1; then echo "  ok    $1"; else echo "  FIX   $1${3:+: $3}"; [ "${4:-hard}" = hard ] && ok=0; fi; }
echo "checks:"
chk "plist is valid" "plutil -lint '$SRC'"
chk "run.sh parses" "bash -n '$HERE/run.sh'"
chk "plist points at this run.sh" "grep -q '$HERE/run.sh' '$SRC'" "edit ProgramArguments in $SRC"
chk "agent CLI at ~/.local/bin" "test -x '$HOME/.local/bin/claude'"
chk "python with cv2, playwright, mlx_whisper" "python3 -c 'import cv2, playwright, mlx_whisper, edge_tts'"
chk "ffmpeg, ffprobe, pdftoppm, node" "command -v ffmpeg && command -v ffprobe && command -v pdftoppm && command -v node"
chk "the renderer's Chromium" "test -x \"\$(python3 -c 'from playwright.sync_api import sync_playwright
with sync_playwright() as p: print(p.chromium.executable_path)')\"" "python3 -m playwright install chromium (run.sh also does this)"
chk "image tool logged in" "\"\$HOME/.local/share/picasso-tools/node_modules/.bin/codex\" login status" "run: ~/.local/share/picasso-tools/node_modules/.bin/codex login (art falls back to a prompts page until then)" soft
chk "headless sessions may use tools unattended" \
    "python3 -c 'import json,os,sys; sys.exit(json.load(open(os.path.expanduser(\"~/.claude/settings.json\"))).get(\"permissions\",{}).get(\"defaultMode\")!=\"bypassPermissions\")'" \
    "permissions.defaultMode in ~/.claude/settings.json is not bypassPermissions; set PERMISSION_MODE in the plist or accept that tools get denied" soft
chk "on AC power" "pmset -g batt | grep -q 'AC Power'" "plug the Mac in overnight" soft
chk "low power mode off on AC (the renders and the time plan assume full speed)" "test \"\$(pmset -g custom | awk '/AC Power/{f=1} f&&/lowpowermode/{print \$2; exit}')\" = 0" "type: sudo pmset -c lowpowermode 0"
chk "syllabus + state readable" "python3 '$HERE/next.py' --dry"
[ "${1:-}" = --check ] && exit $((1 - ok))
[ $ok = 1 ] || { echo "fix the FIX lines above first"; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/picasso-work/logs/daily"
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null
cp "$SRC" "$DST" || exit 1
launchctl bootstrap "$DOMAIN" "$DST" || { echo "launchctl bootstrap failed"; exit 1; }
echo
echo "installed: $DST (every day at 02:00)"
launchctl print "$DOMAIN/$LABEL" | grep -E '^\s*(state|last exit code)' | sed 's/^/  /'
cat <<TXT

next steps (you type these; they need sudo):
  sudo pmset repeat wakeorpoweron MTWRFSU 01:58:00      # optional: wake at 01:58 in case the Mac sleeps
  pmset -g sched                                        # check; cancel with: sudo pmset repeat cancel
Keep it plugged in, logged in, lid open (or an external display). Run once now: launchctl kickstart $DOMAIN/$LABEL
Status: python3 $HERE/next.py status    Logs: ~/picasso-work/logs/daily/    Remove: bash $0 --uninstall
TXT
