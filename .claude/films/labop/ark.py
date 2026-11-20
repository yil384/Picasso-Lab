"""Thin client for the Ark (Volcengine) image and video APIs, with a cost guard and a cost log.

Every call is logged to ~/picasso-work/labop/costs.csv with the usage the API returned and a yuan
estimate. Before each paid call the guard checks the estimate against the per-episode and per-day caps.
Functions return (value, None) on success and (None, "error message") on failure.
"""
import base64
import csv
import datetime
import json
import mimetypes
import os
import time

import requests

BASE = "https://ark.cn-beijing.volces.com/api/v3"
OUT = os.path.expanduser("~/picasso-work/labop")
COSTS = os.path.join(OUT, "costs.csv")
EPISODE_CAP = 150.0  # yuan (the whole film)
DAY_CAP = 150.0  # yuan

IMAGE_PRO = "doubao-seedream-5-0-pro-260628"
IMAGE_FLASH = "doubao-seedream-5-0-flash-260915"
VIDEO_MINI = "doubao-seedance-2-0-mini-260615"

# Yuan per million output tokens for video without a video input (official 2026 list prices;
# mini 0.023 yuan / 1k tokens, about 0.5 yuan per second at 720p).
VIDEO_RATE = {"mini": 23.0, "fast": 37.0, "seedance-2-0-26": 46.0}
# Yuan per image by output pixels (Seedream 5.0 pro: 0.3 up to 2.36 MP, 0.6 above). The flash rate is
# not published yet; it is charged at the pro rate here so the guard errs on the safe side.
IMAGE_RATE = {"small": 0.3, "large": 0.6, "split_px": 2_360_000}

NOT_OPEN = set()  # model ids the account has not activated (seen this run)

FIELDS = ["ts", "date", "episode", "script", "kind", "model", "item", "task_id", "status",
          "tokens", "images", "seconds", "yuan", "usage", "note"]


def _key():
    path = os.path.expanduser("~/.config/picasso/ark.env")
    for line in open(path, encoding="utf-8"):
        k, _, v = line.strip().partition("=")
        if k.strip() == "ARK_API_KEY":
            return v.strip().strip('"').strip("'")
    raise SystemExit("ARK_API_KEY missing in ~/.config/picasso/ark.env")


def _headers():
    return {"Authorization": "Bearer " + _key(), "Content-Type": "application/json"}


def _err(r):
    try:
        e = r.json().get("error") or r.json()
        return f"HTTP {r.status_code} {e.get('code', '')}: {e.get('message', '')}".strip()
    except Exception:
        return f"HTTP {r.status_code}: {r.text[:300]}"


def _request(method, path, body=None, tries=4):
    """(json, None) or (None, error). Retries 429 / 5xx / network errors with backoff."""
    last = ""
    for i in range(tries):
        try:
            r = requests.request(method, BASE + path, headers=_headers(),
                                 data=json.dumps(body) if body is not None else None, timeout=180)
        except requests.RequestException as e:
            last = f"network: {e}"
        else:
            if r.ok:
                return r.json(), None
            last = _err(r)
            if r.status_code not in (429, 500, 502, 503, 504):
                return None, last
        time.sleep(5 * (i + 1))
    return None, last


def data_url(path):
    mime = mimetypes.guess_type(path)[0] or "image/jpeg"
    with open(path, "rb") as f:
        return f"data:{mime.lower()};base64,{base64.b64encode(f.read()).decode()}"


# ---------------------------------------------------------------- cost log and guard

def _rows():
    if not os.path.exists(COSTS):
        return []
    with open(COSTS, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def spent(episode=None, day=None):
    day = day or datetime.date.today().isoformat()
    tot = 0.0
    for r in _rows():
        if r["date"] == day and (episode is None or r["episode"] == episode):
            tot += float(r["yuan"] or 0)
    return tot


def guard(episode, estimate):
    """(True, None) if a call costing `estimate` yuan stays under both caps, else (None, reason)."""
    ep, day = spent(episode), spent()
    if ep + estimate > EPISODE_CAP:
        return None, f"cost guard: episode {episode} would reach {ep + estimate:.2f} yuan (cap {EPISODE_CAP})"
    if day + estimate > DAY_CAP:
        return None, f"cost guard: today would reach {day + estimate:.2f} yuan (cap {DAY_CAP})"
    return True, None


def log(**kw):
    os.makedirs(OUT, exist_ok=True)
    new = not os.path.exists(COSTS)
    now = datetime.datetime.now()
    row = {k: "" for k in FIELDS}
    row.update(ts=now.isoformat(timespec="seconds"), date=now.date().isoformat())
    row.update({k: v for k, v in kw.items() if k in FIELDS})
    if isinstance(row["usage"], dict):
        row["usage"] = json.dumps(row["usage"], separators=(",", ":"))
    with open(COSTS, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if new:
            w.writeheader()
        w.writerow(row)


def image_cost(w, h):
    return IMAGE_RATE["small"] if w * h <= IMAGE_RATE["split_px"] else IMAGE_RATE["large"]


def video_rate(model):
    for k, v in VIDEO_RATE.items():
        if k in model:
            return v
    return max(VIDEO_RATE.values())


def video_estimate(model, seconds, w=720, h=1280, fps=24):
    return w * h * fps * seconds / 1024 * video_rate(model) / 1e6


# ---------------------------------------------------------------- images

def image(model, prompt, size, refs=(), episode="", script="", item="", kind="image"):
    """Generate one image. size is 'WxH'. refs are local paths (Image 1..n in the prompt).
    Returns (jpeg bytes, None) or (None, error)."""
    w, h = (int(x) for x in size.split("x"))
    est = image_cost(w, h)
    ok, err = guard(episode, est)
    if err:
        return None, err
    body = {"model": model, "prompt": prompt, "size": size, "response_format": "b64_json",
            "output_format": "jpeg", "watermark": False}
    if refs:
        body["image"] = [data_url(p) for p in refs] if len(refs) > 1 else data_url(refs[0])
    res, err = _request("POST", "/images/generations", body, tries=2)
    if err and "ModelNotOpen" in err and model == IMAGE_PRO:
        NOT_OPEN.add(model)
        log(episode=episode, script=script, kind=kind, model=model, item=item, status="not-open", yuan=0,
            note="model not activated; fell back to the flash model")
        print(f"  ! {model} is not activated on this account; using {IMAGE_FLASH}", flush=True)
        model = body["model"] = IMAGE_FLASH
        res, err = _request("POST", "/images/generations", body, tries=2)
    if err or not res.get("data"):
        err = err or json.dumps(res.get("error", res))[:300]
        log(episode=episode, script=script, kind=kind, model=model, item=item, status="failed",
            yuan=0, note=err)
        return None, err
    usage = res.get("usage", {})
    n = usage.get("generated_images", 1)
    log(episode=episode, script=script, kind=kind, model=model, item=item, status="ok",
        tokens=usage.get("total_tokens", ""), images=n, yuan=round(n * est, 3), usage=usage,
        note=f"{size}, {len(refs)} refs")
    return base64.b64decode(res["data"][0]["b64_json"]), None


# ---------------------------------------------------------------- video

def video_submit(model, prompt, first_frame, seconds, episode="", script="", item="",
                 ratio="9:16", resolution="720p", audio=True):
    """Create an image-to-video task with a first frame. Returns (task_id, None) or (None, error)."""
    ok, err = guard(episode, video_estimate(model, seconds))
    if err:
        return None, err
    body = {"model": model,
            "content": [{"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url(first_frame)}, "role": "first_frame"}],
            "ratio": ratio, "duration": int(seconds), "resolution": resolution,
            "generate_audio": audio, "watermark": False}
    res, err = _request("POST", "/contents/generations/tasks", body, tries=2)
    if err and "ModelNotOpen" in err:
        NOT_OPEN.add(model)
    if err:
        log(episode=episode, script=script, kind="video", model=model, item=item, status="rejected",
            yuan=0, note=err)
        return None, err
    # Reserve the estimate in the log so parallel submits see it; video_wait books the real figure.
    log(episode=episode, script=script, kind="video-reserve", model=model, item=item, task_id=res["id"],
        status="submitted", seconds=seconds, yuan=round(video_estimate(model, seconds), 3))
    return res["id"], None


def video_wait(task_id, model, seconds, dest, episode="", script="", item="", timeout=1800):
    """Poll a task until done, download the mp4 to dest. Returns (dest, None) or (None, error)."""
    t0 = time.time()
    while True:
        res, err = _request("GET", f"/contents/generations/tasks/{task_id}")
        st = (res or {}).get("status", "")
        if res and st in ("succeeded", "failed", "expired", "cancelled"):
            break
        if time.time() - t0 > timeout:
            return None, f"task {task_id} timed out ({st or err})"
        time.sleep(10)
    usage = res.get("usage") or {}
    tokens = usage.get("completion_tokens") or usage.get("total_tokens") or 0
    yuan = round(tokens * video_rate(model) / 1e6, 3)
    est = round(video_estimate(model, seconds), 3)
    # The reserve row stays; this row books the difference so the sum equals the real cost.
    log(episode=episode, script=script, kind="video", model=model, item=item, task_id=task_id, status=st,
        tokens=tokens, seconds=res.get("duration", seconds), yuan=round(yuan - est, 3), usage=usage,
        note=f"real {yuan} yuan (reserve {est} offset); " + json.dumps(res.get("error") or {})[:200])
    if st != "succeeded":
        return None, f"task {task_id} {st}: {json.dumps(res.get('error') or {})[:300]}"
    url = (res.get("content") or {}).get("video_url")
    try:
        r = requests.get(url, timeout=300)
        r.raise_for_status()
    except requests.RequestException as e:
        return None, f"download failed: {e}"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(r.content)
    return dest, None


def real_cost(episode=None, day=None, kinds=None):
    """Sum of logged yuan, optionally by kind prefix ('image' / 'video')."""
    day = day or datetime.date.today().isoformat()
    tot = 0.0
    for r in _rows():
        if r["date"] == day and (episode is None or r["episode"] == episode) and \
                (kinds is None or r["kind"].startswith(kinds)):
            tot += float(r["yuan"] or 0)
    return round(tot, 3)
