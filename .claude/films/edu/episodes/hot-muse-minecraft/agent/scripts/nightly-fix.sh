#!/bin/bash
# scripts/nightly-fix.sh - the nightly fix job (deploy/soak/com.picassolab.muse-nightly-fix.plist, 05:30 local, after
# the 04:00 soak). It starts a headless Claude Code run with docs/NIGHTLY-FIX.md only when tonight's soak shows a
# failure kind that is new or worse than the night before's (scripts/soak-compare.mjs). Otherwise it writes "nothing
# new" in the morning report and starts no model. No soak tonight: the night is skipped.
#   NIGHTLY_DRY=1  the gate and the report run for real; instead of the fix run, the exact command and its prompt are
#                  printed and the CLI answers a one-line check (the wiring, at almost no cost)
# The run's hard cap is NIGHTLY_CAP_S (default 5400 s = 1.5 h); it runs in its own checkout of main (MUSE_NIGHTLY_WT).
set -u
WT=${MUSE_NIGHTLY_WT:-$HOME/picasso-work/muse-nightly-wt}
SOAK=${MUSE_SOAK_OUT:-$HOME/picasso-work/soak}
CLI=${AGENT:-$HOME/.local/bin/claude}
CAP=${NIGHTLY_CAP_S:-5400}
DRY=${NIGHTLY_DRY:-0}
NODE=${MUSE_SOAK_NODE:-$(command -v node || echo /Users/linyichen/miniforge3/bin/node)}
A=.claude/films/edu/episodes/hot-muse-minecraft/agent
DATE=$(date -u +%F)
LOG=$SOAK/nightly-fix-$DATE.log
REPORT=$SOAK/$DATE-fixes.md
mkdir -p "$SOAK"
exec >> "$LOG" 2>&1
say() { echo "$(date -u +%T) $*"; }
note() { bash "$WT/.claude/films/edu/daily/notify.sh" "$1" "Muse nightly"; }
say "== nightly fix (dry: $DRY)"
# one run at a time; a lock older than 4 hours is stale
LOCK=$SOAK/nightly-fix.lock
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +240 2>/dev/null)" ]; then rm -rf "$LOCK"; mkdir "$LOCK"; else say "another run holds the lock"; exit 0; fi
fi
trap 'rm -rf "$LOCK"' EXIT
git -C "$WT" fetch -q origin && git -C "$WT" checkout -q --detach origin/main || { say "could not update $WT"; note "Muse nightly: its checkout would not update"; exit 1; }
# tonight's soak: a result written in the last 6 hours
TON=$(find "$SOAK" -maxdepth 1 -name '20??-??-??.json' -mmin -360 | sort | tail -1)
if [ -z "$TON" ]; then
  say "no soak tonight: skipped"; printf '# %s\n\nNo soak ran tonight: nothing done.\n' "$DATE" > "$REPORT"; note "Muse nightly: no soak tonight, nothing done"; exit 0
fi
PREV=$(find "$SOAK" -maxdepth 1 -name '20??-??-??.json' ! -name "$(basename "$TON")" | sort | tail -1)
CMP=$("$NODE" "$WT/$A/scripts/soak-compare.mjs" "${PREV:-/dev/null}" "$TON"); RC=$?
say "compare $(basename "${PREV:-none}") -> $(basename "$TON"): rc $RC"
if [ "$RC" = 3 ]; then
  printf '# %s\n\nNothing new in tonight'"'"'s soak (%s, against %s): no fix run.\n' "$DATE" "$(basename "$TON" .json)" "$(basename "${PREV:-none}" .json)" > "$REPORT"
  note "Muse nightly: nothing new in the soak"; exit 0
fi
[ "$RC" = 0 ] || { say "compare failed ($RC): $CMP"; note "Muse nightly: the soak comparison failed"; exit 1; }
STOP=$(date -u -v+"${CAP}"S +%H:%M 2>/dev/null || date -u -d "+${CAP} sec" +%H:%M)
PROMPT="$(cat "$WT/$A/docs/NIGHTLY-FIX.md")

## Tonight (written by scripts/nightly-fix.sh at $(date -u '+%F %H:%M') UTC)
- Soak report: ${TON%.json}.md (the night before: ${PREV:+${PREV%.json}.md})
- New or worse:
$(printf '%s\n' "$CMP" | sed 's/^/  - /')
- Dry run: $DRY
- Morning report: $REPORT
- Hard stop: $STOP UTC
- Run log: $LOG"
PERM=(); [ -n "${PERMISSION_MODE:-}" ] && PERM=(--permission-mode "$PERMISSION_MODE")
if [ "$DRY" = 1 ]; then
  say "DRY RUN: would run in $WT, for at most $CAP s:"
  echo "  perl -e 'setpgrp(0,0); alarm shift; exec @ARGV' $CAP $CLI -p \"\$PROMPT\" ${PERM[*]:-} --output-format stream-json --verbose --max-turns 400 < /dev/null > ${LOG%.log}.jsonl"
  echo "--- prompt ($(printf '%s' "$PROMPT" | wc -c | tr -d ' ') bytes), its Tonight block:"; printf '%s\n' "$PROMPT" | sed -n '/^## Tonight/,$p'
  OK=$(cd "$WT" && perl -e 'alarm 120; exec @ARGV' "$CLI" -p "Reply with the single word OK." --max-turns 1 < /dev/null 2>&1 | tail -1)
  say "CLI check: $OK"
  printf '# %s (dry run)\n\nNew or worse in the soak:\n%s\n\nThe fix run would have started (dry run: it did not). CLI check: %s\n' "$DATE" "$(printf '%s\n' "$CMP" | sed 's/^/- /')" "$OK" > "$REPORT"
  note "Muse nightly (dry): $(printf '%s\n' "$CMP" | head -1)"; exit 0
fi
cd "$WT" && perl -e 'setpgrp(0,0); alarm shift; exec @ARGV' "$CAP" "$CLI" -p "$PROMPT" ${PERM[@]+"${PERM[@]}"} --output-format stream-json --verbose --max-turns 400 < /dev/null > "${LOG%.log}.jsonl"; RC=$?
say "fix run ended: rc $RC"
if [ ! -s "$REPORT" ]; then
  printf '# %s\n\nThe fix run ended (rc %s) without writing its report: see %s.\n' "$DATE" "$RC" "$LOG" > "$REPORT"
  note "Muse nightly: the fix run ended without a report (rc $RC)"
fi
exit 0
