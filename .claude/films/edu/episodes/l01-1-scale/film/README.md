# L01-1 "One Ant Can't Add" / 《一只蚂蚁不会算数》 - the film (v1, 2026-10-04)

The first teaching short: CSE 291P Lecture 1, "Background" (slides 9-11), as a toy paper theatre on the lab's night desk.
81 s, 1080x1920, 30 fps, English cut for X and Chinese cut for Douyin (captions burned in, picture text per language).
Script: `../SCRIPT.md` (with the B7 timing shifted +0.9 s and a 1 s longer stamp hold); facts: `../FACTS.md`.

## Files
- `film.html` + `film.js` - the whole film as one pv scene (kit2d stage camera, lights, riso prints, captions).
  `?lang=en|zh`, `?guides=1` (safe zones), `?cap=0` (no captions).
- `strings.js` - every word in the picture and every caption, EN and ZH.
- `timeline.json` - the one clock: picture cues, voice starts, foley events (read by `film.js` and `mix.py`).
- `vo_en.json`, `vo_zh.json` - where each voice line sits after fitting (written by `mix.py vo`; the captions read them).
- `mix.py` - fits the scratch voice into the timeline, synthesizes the foley, mixes to -14 LUFS.

The look: painted felt puppets and set pieces (Codex, `../../../art/`, keyed with `art/key.py`, the ant crowd sheet split
with `art/split.py`) are flat planes through kit2d's stage camera; all information is risograph print (kit2d riso press);
the cat's sticky notes, red pen and stamp are drawn live. Code never draws a character.

## Make it
```sh
cd .claude/films/edu
python3 art/key.py && python3 art/split.py felt_ant_crowd          # art/cut/ (not committed)
python3 kit2d/fonts.py kit2d/test.html episodes/l01-1-scale/film/strings.js   # CJK subsets after string edits
# scratch voice (temporary, never published) and Prof. Ding's line (course recording, git-ignored course/)
python3 tools/tts.py VO.json SCRATCH/tts                              # VO.json = the JSON block in SCRIPT.md section 7
ffmpeg -ss 1297.85 -t 5.0 -i course/L01.mp4 -vn -ac 1 -ar 48000 SCRATCH/d01_raw.wav
ffmpeg -i SCRATCH/d01_raw.wav -af "highpass=f=90,lowpass=f=9000,afftdn=nf=-38:nr=14,loudnorm=I=-17:TP=-2:LRA=7,afade=t=in:d=0.08,afade=t=out:st=4.85:d=0.15" SCRATCH/d01.wav
python3 episodes/l01-1-scale/film/mix.py vo  SCRATCH/tts SCRATCH/d01.wav
python3 episodes/l01-1-scale/film/mix.py mix SCRATCH/tts SCRATCH/d01.wav SCRATCH/audio
python3 tools/snap.py episodes/l01-1-scale/film/film.html 0 300 790 --out SCRATCH/frames [--q lang=zh]   # stills first
python3 tools/film.py episodes/l01-1-scale/film/film.html --frames 2430 --out SCRATCH/full_en --audio SCRATCH/audio/mix_en.wav --mp4 SCRATCH/l01_en.mp4
python3 tools/film.py episodes/l01-1-scale/film/film.html --frames 2430 --out SCRATCH/full_zh --q lang=zh --audio SCRATCH/audio/mix_zh.wav --mp4 SCRATCH/l01_zh.mp4
```
On the M2 a frame takes 0.2-0.4 s; the whole cut renders in about 3.5 min with 4 workers.

## Not final in v1
- Voices are edge-tts scratch tracks (timing only). Real EN / ZH voice-over replaces them; `mix.py` keeps the same slots.
- Prof. Ding's line (21:38, "If you can make it larger, then the idea is how can you efficiently make it larger?") is
  her lecture recording, checked with a second ASR pass (medium.en) but not by ear, and **needs her OK** before
  anything is published. Without it, SCRIPT.md's fallback line `fb1` takes the slot.
- Foley is synthesized (numpy) as a placeholder; no music.
- Douyin naming of xAI / Stargate / Gemini in the B6 small print is still the user's call (SCRIPT.md section 16).
