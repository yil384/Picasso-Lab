# Daily CSE 291P explainers

Every morning at 9:00 a new 4-10 minute English explainer of the next part of Prof. Yufei Ding's CSE 291P course,
in the approved look of L01-01 (`episodes/l01-5min`). It is made unattended on this Mac (M1, 16 GB): launchd starts
`run.sh` at 02:00, `run.sh` prepares the night and starts a headless agent session with `PROMPT.md`, and the session
delivers to `~/Downloads/picasso-daily/<YYYY-MM-DD>_<id>/` by 08:45 (it is killed then).

## Files
| File | What it does |
| --- | --- |
| `syllabus.json`, `SYLLABUS.md` | The queue: 53 episodes in course order (slides, core idea, hook, facts to check, permissions) |
| `state.json` | What was delivered (by morning), what failed, guest policy, speakers' OKs, skips. Written by `next.py mark` |
| `next.py` | Picks tonight's episode and its delivery morning; writes the work order; `status`; `mark` |
| `run.sh` | The launchd entry (below) |
| `PROMPT.md` | The producer's brief for the headless session: the whole per-episode pipeline, rules and time plan |
| `art.py` | The episode's drawings: `gen` (image tool, 3 at a time, retries, checks), `pack`, `check`, `prompts` (fallback page) |
| `clips.py` | Her voice clips: `cut` from the recording, `check` with two recognizers, `words` around a moment |
| `notify.sh` | A macOS notification + a line in `~/picasso-work/logs/notify.log` |
| `ship_git.sh` | Commit only the given paths (never slide images or crops), push the branch, merge into origin/main (`--no-ff`) in a temporary detached worktree, push main |
| `com.picassolab.edu-daily.plist`, `install.sh` | The LaunchAgent (02:00 daily) and its installer |

Shared tools in `../tools/`: `fetch_recordings.py` (lecture videos from Drive into `course/`, resumable) and
`transcribe.py` (word-timed transcript + slide timing: `course/Lnn.words.json`, `Lnn.slides.json`,
`Lnn.transcript.md`). Everything in `course/` is git-ignored and never committed.

## A night
1. `run.sh` (02:00): one run at a time (lock), `caffeinate -is`, warns on battery / low power mode, `git pull
   --ff-only` on the current branch, new decks (`fetch_course.py`), `next.py` picks the episode, its recording and
   transcript are fetched/made if missing (normally done ahead by the background batch), the work order is written to
   `~/picasso-work/daily/<id>/work_order.json` (keyed by episode, so a retry finds the earlier night's work), the
   image tool's login and the renderer's Chromium are checked. It waits up to 30 min for the network, notifies on low
   power mode and on a morning that got no video, and writes `~/picasso-work/daily/env.sh` (`CLAUDE_ENV_FILE`: the
   miniforge Python first on PATH for every shell command of the session).
2. The producer session (`PROMPT.md` + a "Tonight" block) runs in its own process group with a hard stop at the
   deadline (`perl alarm`); when it ends early without a finished film and over an hour is left, it is resumed
   (`--resume`, at most 4 rounds). At the end every process still working on the episode is killed:
   sources -> FACTS.md -> her clips (two-recognizer check) -> two script drafts + judge + synthesis -> drawings
   (image tool, checked, packed; or the prompts page) -> narration, timeline, `episode.json` (the `kit-lesson`
   template) -> previews at phone size -> an independent review -> render, mix, cover, `x_post.md` -> `report.md`
   (Chinese) -> `next.py mark ... delivered` -> notification -> `ship_git.sh`.
   Checkpoints are relative to the deadline; at 07:30 the full render starts whatever the state.
3. `run.sh` again: an mp4 counts only when `next.py verify` passes it (ffprobe: length = timeline.json within 1 s,
   1080x1920, audio; `film.py` only ever moves a finished, checked encode into the delivery folder). It marks the
   episode delivered (if the session did not) or failed, writes a minimal report.md if the session could not, and
   notifies. A failure is counted once per run (the session and run.sh may both mark it); a failed episode is
   retried the next night from its work folder; after failures in two runs it is passed over and listed in the work
   order.

Episode choice (`next.py`): the first episode in `syllabus.json` order that is not shipped/delivered, skipped,
blocked or a guest lecture without an OK. The delivery morning is the first morning without a video, from today
(before 08:45) or tomorrow, up to today + 2 (at most 2 days of buffer).

## Commands
```sh
cd /Users/linyichen/UCSD/Picasso-Lab/.claude/films/edu
~/miniforge3/bin/python3 daily/next.py status                     # the queue and the buffer
~/miniforge3/bin/python3 daily/next.py --dry                       # what tonight would make
DRY_RUN=1 bash daily/run.sh                                        # the whole night except the producer
bash daily/install.sh --check                                      # checks only
bash daily/install.sh                                              # install + load the LaunchAgent
launchctl kickstart gui/$(id -u)/com.picassolab.edu-daily          # run a night now (a daytime run gets 6 h 45 min)
bash daily/install.sh --uninstall                                  # stop it
~/miniforge3/bin/python3 daily/next.py mark L01-02 failed --note "why"   # e.g. to make a night redo an episode
```
Every recording fetched and transcribed ahead of the nights (started 2026-10-06 as `~/picasso-work/transcribe_batch.sh`;
re-runnable, skips what is done, about 35 min per 80-min lecture with low power mode on):
```sh
cd /Users/linyichen/UCSD/Picasso-Lab/.claude/films/edu && HF_HUB_OFFLINE=1 nohup bash -c \
  '~/miniforge3/bin/python3 tools/fetch_recordings.py --all; ~/miniforge3/bin/python3 tools/transcribe.py --all' \
  > ~/picasso-work/logs/transcribe-batch.log 2>&1 &
```

Decisions live in `state.json`: `"guest_policy": "narration-only"` makes guest episodes without clips or taped slides;
`"speaker_ok": {"L09": {"voice_clips": true, "slides_on_screen": true, "date": "...", "note": "..."}}` when a speaker
says yes; `"skip": ["L09-03"]` drops an episode.

## Logs and outputs
- `~/picasso-work/logs/daily/<date>_<time>.log` (run.sh), `.r<N>.jsonl` (each round's stream; its first line has
  the session id, and the log prints the command to resume it), `.r<N>.err`; `~/picasso-work/logs/notify.log`.
- `~/picasso-work/daily/<id>/` (work order, progress.md, jobs.pid, TTS, previews, frames; frames are deleted after
  3 days),
  `~/picasso-work/clips/<episode>/` (clip audio), `~/picasso-work/art/` (art status, rejected drawings).
- `~/Downloads/picasso-daily/<morning>_<id>/`: `<id>_<slug>_en.mp4`, `cover_en.jpg`, `contact_en.jpg`, `x_post.md`,
  `report.md`, and `art-prompts.html` when the image tool could not draw everything (the episode ships without
  those drawings; no night re-renders it on its own: ask a session once the drawings are saved).

## What the Mac needs
Plugged in, logged in, lid open (or an external display), network. `sudo pmset -c lowpowermode 0` for full speed
(install.sh refuses to install while it is on);
optionally `sudo pmset repeat wakeorpoweron MTWRFSU 01:58:00`. The image tool must stay logged in (`install.sh
--check`). The headless session uses the permission mode of `~/.claude/settings.json` (it cannot answer prompts).
