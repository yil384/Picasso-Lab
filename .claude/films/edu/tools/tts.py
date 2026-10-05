#!/usr/bin/env python3
"""Temporary voice-over with edge-tts (a scratch track for timing; the real VO is recorded by people).
Reads a VO table (JSON list of {"id", "en", "zh"}) and writes, per language, <out>/<lang>/<id>.mp3, <id>.json (word or
sentence boundaries in seconds) and <out>/<lang>/durations.json.
usage: python3 tools/tts.py VO.json OUT [--lang en,zh] [--rate +0%]"""
import os, sys, json, asyncio, argparse, subprocess

VOICES = {'en': 'en-US-AndrewMultilingualNeural', 'zh': 'zh-CN-YunxiNeural'}


async def _say(text, voice, rate, mp3):
    import edge_tts
    com = edge_tts.Communicate(text, voice, rate=rate, boundary='WordBoundary')
    marks = []
    with open(mp3, 'wb') as f:
        async for ch in com.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] in ('WordBoundary', 'SentenceBoundary'):
                marks.append({'t': ch['offset'] / 1e7, 'd': ch['duration'] / 1e7, 'w': ch['text']})
    return marks


def duration(path):
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                             capture_output=True, text=True, check=True).stdout.strip()
        return float(out), None
    except (subprocess.CalledProcessError, ValueError) as e:
        return None, 'ffprobe failed on %s: %s' % (path, e)


def synth(table, out, langs=('en', 'zh'), rate='+0%'):
    try:
        rows = json.load(open(table))
    except (OSError, ValueError) as e:
        return None, 'cannot read %s: %s' % (table, e)
    done = {}
    for lang in langs:
        d = os.path.join(out, lang); os.makedirs(d, exist_ok=True)
        durs = {}
        for row in rows:
            text = (row.get(lang) or '').strip()
            if not text:
                continue
            mp3 = os.path.join(d, row['id'] + '.mp3')
            try:
                marks = asyncio.run(_say(text, VOICES[lang], rate, mp3))
            except Exception as e:  # network or service errors from edge-tts
                return None, 'edge-tts failed on %s/%s: %s' % (lang, row['id'], e)
            json.dump(marks, open(os.path.join(d, row['id'] + '.json'), 'w'), ensure_ascii=False, indent=0)
            sec, err = duration(mp3)
            if err:
                return None, err
            durs[row['id']] = round(sec, 3)
        json.dump(durs, open(os.path.join(d, 'durations.json'), 'w'), indent=1)
        done[lang] = durs
    return done, None


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('table'); ap.add_argument('out')
    ap.add_argument('--lang', default='en,zh'); ap.add_argument('--rate', default='+0%')
    a = ap.parse_args()
    res, err = synth(a.table, a.out, a.lang.split(','), a.rate)
    if err:
        sys.exit(err)
    for lang, durs in res.items():
        print(lang, '%.1f s total' % sum(durs.values()), durs)
