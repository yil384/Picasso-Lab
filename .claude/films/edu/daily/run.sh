#!/bin/bash
# The nightly CSE 291P explainer. launchd (com.picassolab.edu-daily) starts this at 02:00:
#   lock -> keep awake -> wait for the network -> git pull -> new decks -> next.py (tonight's episode) -> its recording
#   + transcript -> the headless producer session with daily/PROMPT.md, in its own process group, killed at the work
#   order's deadline (08:45); restarted (resumed) when it ends early without a film -> everything it started is killed
#   at the end -> the mp4 is checked (ffprobe against timeline.json) before it counts as delivered -> a notification.
#
#   bash .claude/films/edu/daily/run.sh                 what launchd runs
#   DRY_RUN=1 bash .claude/films/edu/daily/run.sh       everything except starting the producer (prints its command)
#   NOW="2026-10-07 02:00" DRY_RUN=1 bash ...           pretend time for the episode choice (tests)
#
# Logs: ~/picasso-work/logs/daily/<date>_<time>.log (this script), .r<N>.jsonl (the producer's stream, one per round),
# .r<N>.err. The producer inherits the permission mode of ~/.claude/settings.json (a headless run cannot answer prompts;
# this script warns when that default is not "bypassPermissions"). PERMISSION_MODE=... passes one explicitly.
set -u
export PATH="$HOME/miniforge3/bin:$HOME/.local/bin:$HOME/.local/share/picasso-tools/node_modules/.bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export HF_HUB_OFFLINE=1 PYTHONUNBUFFERED=1 LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
export GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=20"
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="${REPO:-$(git -C "$SELF_DIR" rev-parse --show-toplevel 2>/dev/null)}"
WORKROOT="$HOME/picasso-work"
mkdir -p "$WORKROOT/daily" "$WORKROOT/logs/daily"

# git pull may rewrite this file while bash is still reading it: run from a private copy (one per start, so a second
# start, a test run or a pull never rewrites the file a running night is reading). The copy deletes itself.
if [ -z "${RUN_COPY:-}" ]; then
  COPY=$(mktemp "$WORKROOT/daily/run.XXXXXX") || exit 1
  cp "$0" "$COPY"
  RUN_COPY="$COPY" REPO="$REPO" exec /bin/bash "$COPY" "$@"
fi
trap 'rm -f "$RUN_COPY"' EXIT
EDU="$REPO/.claude/films/edu"
DAILY="$EDU/daily"
AGENT="${AGENT:-$HOME/.local/bin/claude}"
IMG_CLI="${IMG_CLI:-$HOME/.local/share/picasso-tools/node_modules/.bin/codex}"
DRY="${DRY_RUN:-0}"
STAMP="$(date +%F_%H%M%S)"
LOG="$WORKROOT/logs/daily/$STAMP.log"
exec > >(tee -a "$LOG") 2>&1
say() { echo "$(date '+%F %T') $*"; }
notify() { bash "$DAILY/notify.sh" "$1" "Picasso daily"; }
RUN_START=$(date +%s)

say "run.sh start (dry=${DRY}, pid $$, repo ${REPO})"
[ -d "${EDU}" ] || { say "no ${EDU}"; notify "每日视频：找不到仓库 ${REPO}"; exit 1; }

# one run at a time; a lock whose pid is not a run.sh copy any more (a reboot, a crash) is stale
LOCK="$WORKROOT/daily/run.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  OLD=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "${OLD}" ] && ps -p "${OLD}" -o command= 2>/dev/null | grep -Eq '/picasso-work/daily/run\.[A-Za-z0-9]{6}( |$)'; then
    say "another run is going (pid ${OLD}): exit"
    [ "$DRY" = 1 ] || notify "每日视频：另一个夜间运行还在进行（pid ${OLD}），这次没有开始"
    exit 0
  fi
  say "stale lock (pid ${OLD:-?} is not a run): taking it"; rm -rf "${LOCK}"; mkdir "${LOCK}" || exit 1
fi
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"; rm -f "$RUN_COPY"' EXIT

/usr/bin/caffeinate -is -w $$ &                      # no idle or system sleep while this runs (-s holds on AC only)

# every Bash call of the producer and its subagents sources this (the login shell puts Python 3.8 first otherwise)
export EDU_DAILY_RUN="$STAMP"                         # next.py mark counts a failure once per run
export CODEX="$IMG_CLI"
ENVF="$WORKROOT/daily/env.sh"
cat > "$ENVF" <<ENV
# written by run.sh at $(date '+%F %T'): the night's environment for every Bash call of the producer session
export PATH="\$HOME/miniforge3/bin:\$HOME/.local/bin:\$HOME/.local/share/picasso-tools/node_modules/.bin:/opt/homebrew/bin:\$PATH"
export HF_HUB_OFFLINE=1 PYTHONUNBUFFERED=1 EDU_DAILY_RUN="$STAMP" CODEX="$IMG_CLI"
ENV
export CLAUDE_ENV_FILE="$ENVF"

# power: on battery the Mac may sleep; low power mode slows rendering and transcription
pmset -g batt | grep -q "AC Power" || { say "WARNING: on battery"; notify "每日视频：Mac 没插电，夜里可能睡眠"; }
LOWPOWER=$(pmset -g custom 2>/dev/null | awk '/AC Power/{f=1} f&&/lowpowermode/{print $2; exit}')
if [ "${LOWPOWER:-0}" = 1 ]; then
  POWER="low power mode ON (rendering is slower: start the full render by D - 2:00, not D - 1:15)"
  say "WARNING: ${POWER}; fix: sudo pmset -c lowpowermode 0"
  [ "$DRY" = 1 ] || notify "每日视频：插电时低电量模式开着，渲染会变慢（sudo pmset -c lowpowermode 0）"
else
  POWER="full speed (low power mode off)"
fi
MODE=$(python3 -c 'import json,os
try: print(json.load(open(os.path.expanduser("~/.claude/settings.json"))).get("permissions",{}).get("defaultMode",""))
except Exception: print("")' 2>/dev/null)
if [ -z "${PERMISSION_MODE:-}" ] && [ "$MODE" != "bypassPermissions" ]; then
  say "WARNING: default permission mode is '${MODE:-default}': tools that need approval will be denied tonight"
fi

# the network (Wi-Fi may still be reconnecting after the display slept): wait up to 30 min
net_ok() { curl -s -o /dev/null --max-time 10 -I https://api.anthropic.com && curl -s -o /dev/null --max-time 10 -I https://github.com; }
if [ "$DRY" != 1 ]; then
  for i in $(seq 1 60); do net_ok && break; [ "$i" = 1 ] && say "no network yet: waiting (up to 30 min)"; sleep 30; done
  net_ok && say "network: ok" || { say "WARNING: still no network after 30 min: going on (the producer waits and retries)"; notify "每日视频：凌晨没有网络，今晚可能做不完"; }
fi

# the browser the renderer drives (a cleaned cache has lost it before)
CHROME=$(python3 -c 'from playwright.sync_api import sync_playwright
with sync_playwright() as p: print(p.chromium.executable_path)' 2>/dev/null)
if [ -z "$CHROME" ] || [ ! -x "$CHROME" ]; then
  say "the renderer's Chromium is missing: installing it"
  python3 -m playwright install chromium > /dev/null 2>&1 && say "Chromium: installed" || say "WARNING: Chromium install failed: renders will fail"
fi

# the code: pull the branch (fast-forward only; other uncommitted work in the tree is left alone)
cd "$REPO" || exit 1
BR=$(git rev-parse --abbrev-ref HEAD)
[ "${BR}" = "${EDU_BRANCH:-claude/edu-series}" ] || say "WARNING: the repo is on '${BR}', not ${EDU_BRANCH:-claude/edu-series}"
if [ "$DRY" = 1 ]; then say "DRY RUN: no git pull"
elif git pull -q --ff-only origin "${BR}"; then say "git pull ${BR}: ok ($(git rev-parse --short HEAD))"
else say "WARNING: git pull failed; going on with the local tree"; fi

# new decks (skips the ones on disk; re-extracts the text)
python3 "${EDU}/tools/fetch_course.py" > /dev/null && say "decks: ok" || say "WARNING: fetch_course failed (offline?)"

# tonight's episode
NEXT_ARGS=(); [ -n "${NOW:-}" ] && NEXT_ARGS=(--now "$NOW")
OUT=$(python3 "${DAILY}/next.py" --dry --shell ${NEXT_ARGS[@]+"${NEXT_ARGS[@]}"}) || { say "next.py failed"; notify "每日视频：next.py 出错，见 ${LOG}"; exit 1; }
eval "$OUT"
if [ -n "${EP_MISSED:-}" ]; then
  say "MISSED: ${EP_MISSED} has no video"
  [ "$DRY" = 1 ] || notify "每日视频：今天 ${EP_MISSED} 没有视频（Mac 在 02:00 睡着了，或者昨晚失败了）"
fi
if [ -z "${EP_ID:-}" ]; then say "nothing to make tonight: ${EP_WHY:-}"; exit 0; fi
# Daytime starts (launchd also runs this at 12:00 and 19:00) only catch up a lost night, e.g. a macOS update that
# rebooted the Mac at 03:00 (2026-10-07): they make an episode only when tomorrow morning still has no video.
NOWH=$(date +%H); TOMORROW=$(date -v+1d +%Y-%m-%d)
if [ "${FORCE:-0}" != 1 ] && [ -z "${NOW:-}" ] && [ "$NOWH" -ge 6 ] && [ "${EP_MORNING:-}" != "$TOMORROW" ]; then
  say "daytime catch-up: tomorrow (${TOMORROW}) already has its video; nothing to do"; exit 0
fi
say "tonight: ${EP_ID} \"${EP_TITLE}\" for ${EP_MORNING} (lectures: ${EP_LECTURES}; deadline ${EP_DEADLINE})"

# its recordings and transcripts (normally already made by the background batch; a lock makes us wait for it)
for L in $EP_LECTURES; do
  python3 "${EDU}/tools/fetch_recordings.py" "${L}" || say "WARNING: recording ${L} not fetched"
  if [ -f "$EDU/course/$L.mp4" ]; then
    python3 "${EDU}/tools/transcribe.py" "${L}" || say "WARNING: transcript ${L} failed"
  fi
done

# the work order (now with the slide windows from the transcripts)
if [ "$DRY" = 1 ]; then OUT=$(python3 "${DAILY}/next.py" --dry --shell ${NEXT_ARGS[@]+"${NEXT_ARGS[@]}"})
else OUT=$(python3 "${DAILY}/next.py" --shell ${NEXT_ARGS[@]+"${NEXT_ARGS[@]}"}); fi || { say "next.py failed"; notify "每日视频：next.py 出错，见 ${LOG}"; exit 1; }
eval "$OUT"
say "work order: ${EP_ORDER:-(dry run: not written)}"
[ "${EP_LATE:-0}" = 1 ] && [ "$DRY" != 1 ] && notify "每日视频：今天开始得晚，${EP_ID} 会晚到（约 ${EP_DEADLINE}）"
mkdir -p "$EP_WORK/logs"
EP_BASE=$(basename "$EP_DIR")

if "$IMG_CLI" login status > /dev/null 2>&1; then IMG="logged in"; else IMG="NOT logged in: use the art fallback (art-prompts.html)"; fi
say "image tool: ${IMG}"

left() { echo $(( EP_DEADLINE_EPOCH - $(date +%s) )); }
SECS=$(left)
if [ "$SECS" -lt 1800 ]; then
  say "only ${SECS} s left before the deadline: not starting"; notify "每日视频：${EP_ID} 没开始，离截止只剩 $((SECS / 60)) 分钟"; exit 1
fi

PROMPT_TEXT="$(cat "$DAILY/PROMPT.md")

## Tonight (written by run.sh at $(date '+%F %H:%M'))
- Work order: ${EP_ORDER:-$EP_WORK/work_order.json}
- Episode: $EP_ID \"$EP_TITLE\", for the morning of $EP_MORNING
- Hard stop: $EP_DEADLINE (this session and everything it started are killed then; plan every checkpoint against it)
- Power: $POWER
- Image tool: $IMG
- Branch: $BR
- Run log: $LOG"
PERM=(); [ -n "${PERMISSION_MODE:-}" ] && PERM=(--permission-mode "$PERMISSION_MODE")
FLAGS=(${PERM[@]+"${PERM[@]}"} --output-format stream-json --verbose --max-turns 3000)

if [ "$DRY" = 1 ]; then
  say "DRY RUN: would start the producer for ${SECS} s ($((SECS / 60)) min) in its own process group:"
  echo "  cd $REPO && CLAUDE_ENV_FILE=$ENVF EDU_DAILY_RUN=$STAMP perl -e 'setpgrp(0,0); alarm shift; exec @ARGV' $SECS $AGENT -p \"\$(PROMPT.md + Tonight)\" ${FLAGS[*]} < /dev/null > ${LOG%.log}.r1.jsonl"
  echo "  (resumed with --resume <session> while there is no checked mp4 and over 60 min are left; at most 4 rounds)"
  echo "--- Tonight block of the prompt:"; printf '%s\n' "$PROMPT_TEXT" | sed -n '/^## Tonight/,$p'
  echo "--- prompt size: $(printf '%s' "$PROMPT_TEXT" | wc -c | tr -d ' ') bytes"
  echo "--- env file ($ENVF):"; cat "$ENVF"
  exit 0
fi

# ---------------------------------------------------------------- the producer
python3 "$DAILY/next.py" mark "$EP_ID" in-progress --morning "$EP_MORNING" > /dev/null
NLOG="$WORKROOT/logs/notify.log"; touch "$NLOG"; NBEFORE=$(wc -l < "$NLOG" | tr -d ' ')
PGIDS=()

# kill everything the producer started: its process group, the detached jobs it recorded in WORK/jobs.pid, and any
# process still working on this episode's files (nohup'd renders, ffmpeg, the art batch). The agent runs each shell
# command in a process group of its own, so the group kill alone does not reach them: the paths do.
kill_all() {
  local sig
  for sig in TERM KILL; do
    for g in ${PGIDS[@]+"${PGIDS[@]}"}; do kill -"$sig" -- "-$g" 2>/dev/null; done
    if [ -f "$EP_WORK/jobs.pid" ]; then
      while read -r p; do [ -n "$p" ] && { kill -"$sig" -- "-$p" 2>/dev/null; kill -"$sig" "$p" 2>/dev/null; }; done < "$EP_WORK/jobs.pid"
    fi
    pkill -"$sig" -f "$EP_WORK" 2>/dev/null; pkill -"$sig" -f "$EP_DELIVER" 2>/dev/null
    pkill -"$sig" -f "episodes/$EP_BASE/art.json" 2>/dev/null; pkill -"$sig" -f "ep=$EP_BASE( |&|$)" 2>/dev/null
    [ "$sig" = TERM ] && sleep 8
  done
}

# the newest mp4 in DELIVER that is a finished film; prints its path, or nothing (and the reason on stderr)
checked_mp4() {
  local m info
  for m in $(ls -t "$EP_DELIVER"/*.mp4 2>/dev/null); do
    case "$m" in *.part.mp4) continue ;; esac
    TLARG=(); [ -f "$EP_DIR/timeline.json" ] && TLARG=(--timeline "$EP_DIR/timeline.json")   # (the film/ fallback has none)
    if info=$(python3 "$DAILY/next.py" verify "$m" ${TLARG[@]+"${TLARG[@]}"} 2>&1); then echo "$m"; return 0; fi
    echo "not a finished film: $info" >&2
  done
  return 1
}

summary() {   # session id and result of one round's stream
  python3 - "$1" <<'PY'
import json, sys
sid, res = '', None
for line in open(sys.argv[1], errors='replace'):
    try:
        d = json.loads(line)
    except ValueError:
        continue
    if d.get('type') == 'system' and d.get('subtype') == 'init':
        sid = d.get('session_id', '')
    if d.get('type') == 'result':
        res = d
r = 'no result' if not res else f"{res.get('subtype', '?')}: {str(res.get('result') or '')[:300]}"
print(f"session {sid} | {r}".replace('\n', ' '))
PY
}

ROUND=0; SID=""; RC=0; WHY=""
while :; do
  ROUND=$((ROUND + 1))
  SECS=$(left)
  JSONL="${LOG%.log}.r$ROUND.jsonl"; ERRF="${LOG%.log}.r$ROUND.err"
  if [ "$ROUND" = 1 ] || [ -z "$SID" ]; then
    ARGS=(-p "$PROMPT_TEXT")
  else
    ARGS=(--resume "$SID" -p "The session stopped early (round $((ROUND - 1)): ${WHY}). It is now $(date '+%H:%M'); the hard stop is still ${EP_DEADLINE}. Continue tonight's episode from ${EP_WORK}/progress.md and the files on disk: check what is still running (art batch, render) before starting anything again, then carry on with the brief.")
  fi
  say "producer round ${ROUND}: start ($((SECS / 60)) min until the hard stop${SID:+, resuming $SID})"
  perl -e 'setpgrp(0,0); alarm shift; exec @ARGV' "$SECS" "$AGENT" "${ARGS[@]}" "${FLAGS[@]}" < /dev/null > "$JSONL" 2> "$ERRF" &
  PG=$!; PGIDS+=("$PG")
  wait "$PG"; RC=$?
  SUM=$(summary "$JSONL")
  NEWSID=$(printf '%s' "$SUM" | sed -n 's/^session \([^ ]*\).*/\1/p'); [ -n "$NEWSID" ] && SID="$NEWSID"
  say "producer round ${ROUND}: exit ${RC} (0 ok, 1 error or turn limit, 142 hard stop): ${SUM}"
  [ -n "${SID}" ] && say "resume it with: cd ${REPO} && ${AGENT} --resume ${SID}"
  if MP4=$(checked_mp4); then break; fi
  WHY="exit $RC; $(printf '%s' "$SUM" | cut -c1-160)"
  if [ "$RC" = 142 ] || [ "$(left)" -lt 3600 ] || [ "$ROUND" -ge 4 ]; then break; fi
  say "no finished film and $(( $(left) / 60 )) min left: restarting in 5 min"
  sleep 300
  until curl -s -o /dev/null --max-time 10 -I https://api.anthropic.com || [ "$(left)" -lt 3600 ]; do sleep 60; done
done

# the hard stop (or the last round ended): stop every render, encode and art job of this episode
kill_all
say "producer: stopped after ${ROUND} round(s)"
MP4=$(checked_mp4)
NEW_NOTES=$(tail -n +$((NBEFORE + 1)) "$NLOG")
if [ ! -f "$EP_DELIVER/report.md" ]; then       # the session was killed before it wrote one: a minimal report
  mkdir -p "$EP_DELIVER"
  { echo "# ${EP_ID} 运行报告（run.sh 自动写的：制作会话没有写 report.md）"; echo
    echo "- 结果：${MP4:-没有通过检查的成片}"; echo "- 轮次：${ROUND}，最后退出码 ${RC}（142 = 到点被停）"
    echo "- 日志：${LOG}"; [ -n "$SID" ] && echo "- 继续这个会话：cd ${REPO} && ${AGENT} --resume ${SID}"
    echo; echo "## progress.md"; cat "$EP_WORK/progress.md" 2>/dev/null || echo "（没有）"; } > "$EP_DELIVER/report.md"
  say "wrote a minimal report.md"
fi
if [ -n "$MP4" ]; then
  python3 "${DAILY}/next.py" mark "${EP_ID}" delivered --mp4 "${MP4}" --morning "${EP_MORNING}" > /dev/null && say "marked ${EP_ID} delivered"
  if ! printf '%s' "$NEW_NOTES" | grep -q "$EP_ID"; then        # the producer did not send its own
    notify "${EP_ID} 成片已到 ${EP_DELIVER}（制作流程没有发完成通知：${ROUND} 轮，exit ${RC}，看 report.md 和 ${LOG}）"
  fi
  say "delivered: ${MP4}"
else
  # next.py counts a failure once per run, so the producer's own "failed" mark and this one are one attempt
  python3 "$DAILY/next.py" mark "$EP_ID" failed --note "run.sh: no checked mp4 after ${ROUND} round(s), exit ${RC}; ${WHY:0:200}" > /dev/null
  notify "每日视频失败：${EP_ID} 没有成片（${ROUND} 轮，exit ${RC}）。日志 ${LOG}"
  say "FAILED: no finished mp4 in ${EP_DELIVER}"
fi

# housekeeping: rendered frames older than 3 days (an mp4 is kept in Downloads), old run copies
find "$WORKROOT/daily" -maxdepth 2 -type d -name 'frames*' -mtime +3 -exec rm -rf {} + 2>/dev/null
find "$WORKROOT/daily" -maxdepth 1 -name 'run.??????' -mtime +2 -delete 2>/dev/null
rm -f "$WORKROOT/daily/run.current.sh"
say "run.sh end"
