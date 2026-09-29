#!/usr/bin/env python3
"""Render a pv scene frame-by-frame with headless Chromium (Playwright), in parallel, resumably.

    python3 render.py SCENE.html --out OUT [--workers 3] [--range A:B] [--width W --height H]
                      [--fps F --frames N --seed S] [--gpu metal|swiftshader] [--fmt png|rgba]
                      [--store segments|png] [--seg-frames 30]
                      [--verify K] [--check-loop] [--encode] [--clean | --force]

Each browser renders frame i, reads the final canvas losslessly (PNG via canvas.toBlob, or raw
RGBA) and POSTs it to a local server that writes OUT/frames/f_00000.png atomically. With
--store segments (default) every complete, aligned run of --seg-frames PNGs is streamed into
ffmpeg as a bit-exact lossless x264rgb (qp 0) segment OUT/segments/seg_AAAAA_BBBBB.mkv, verified
against the PNGs, and the PNGs are deleted (about 5x less disk than PNG for paper-textured scenes).
Re-running skips frames that exist as PNG or inside a segment, so an interrupted render resumes.
OUT/render.json records the effective parameters, the scene hash and timings; resuming with
different parameters or a changed scene is refused unless --clean (discard) or --force (keep).
"""
import argparse
import multiprocessing as mp
import os
import queue
import random
import shutil
import sys
import threading
import time
from urllib.parse import urlencode

import pvlib

GL_INFO_JS = """() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl2');
  if (!gl) return 'no-webgl2'; const d = gl.getExtension('WEBGL_debug_renderer_info');
  return gl.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : gl.RENDERER); }"""
COMMON_ARGS = ["--disable-background-timer-throttling", "--disable-renderer-backgrounding",
               "--disable-backgrounding-occluded-windows", "--force-color-profile=srgb",
               "--font-render-hinting=none", "--hide-scrollbars", "--mute-audio",
               # Canvas2D on the CPU rasteriser: GPU-backed 2D canvases (used by p5.brush for its
               # fill masks) caches path masks, so edge pixels depended on render history.
               "--disable-accelerated-2d-canvas"]


def launch_kwargs(gpu):
    if gpu == "metal":
        # "new headless" full Chromium can use the Mac GPU for WebGL through ANGLE/Metal.
        return dict(channel="chromium", headless=True,
                    args=COMMON_ARGS + ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"])
    return dict(headless=True, args=COMMON_ARGS + ["--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                                                   "--ignore-gpu-blocklist"])


def worker_main(wid, base, scene_url, tasks, results, opts):
    """One browser process: boot the scene once, then capture frames pulled from `tasks`."""
    from playwright.sync_api import sync_playwright
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(**launch_kwargs(opts["gpu"]))
            page = browser.new_page(viewport={"width": 960, "height": 600}, device_scale_factor=1)
            page.on("pageerror", lambda e: results.put(("log", wid, f"pageerror: {e}")))
            page.on("console", lambda m: m.type in ("error", "warning") and "favicon" not in m.text and
                    "404" not in m.text and results.put(("log", wid, f"console.{m.type}: {m.text[:300]}")))
            t0 = time.time()
            page.goto(scene_url, wait_until="load")
            page.wait_for_function("() => window.__pv && (window.__pv.ready || window.__pv.error)",
                                   timeout=opts["boot_timeout"] * 1000, polling=100)
            err = page.evaluate("() => window.__pv.error")
            if err:
                results.put(("fatal", wid, f"scene error: {err}"))
                return
            meta = page.evaluate("() => window.PV_META")
            gl = page.evaluate(GL_INFO_JS)
            results.put(("ready", wid, {"meta": meta, "gl": gl, "boot_s": round(time.time() - t0, 2)}))
            while True:
                item = tasks.get()
                if item is None:
                    break
                i, dirkey = item
                t1 = time.time()
                tm = page.evaluate("([i, u, f]) => window.__pv.capture(i, u, f)",
                                   [i, f"{base}/__frame/{i}?dir={dirkey}", opts["fmt"]])
                results.put(("done", wid, i, dirkey, tm, time.time() - t1))
            browser.close()
    except Exception as e:  # noqa: BLE001
        results.put(("fatal", wid, repr(e)[:2000]))


def parse_range(s, n):
    if not s:
        return 0, n
    a, _, b = s.partition(":")
    return int(a or 0), int(b) if b else n


def scene_query(a):
    q = {"render": "1"}
    for k in ("width", "height", "fps", "frames", "seed"):
        v = getattr(a, k)
        if v is not None:
            q[k] = v
    return urlencode(q)


class Pool:
    def __init__(self, n, base, scene_url, opts):
        ctx = mp.get_context("spawn")
        self.tasks, self.results = ctx.Queue(), ctx.Queue()
        self.procs = [ctx.Process(target=worker_main, args=(w, base, scene_url, self.tasks, self.results, opts),
                                  daemon=True) for w in range(n)]
        for p in self.procs:
            p.start()

    def stop(self, hard=False):
        for _ in self.procs:
            self.tasks.put(None)
        for p in self.procs:
            p.join(timeout=2 if hard else 60)
            if p.is_alive():
                p.terminate()


class Compactor:
    """Background thread that turns complete, aligned runs of PNG frames into lossless segments."""

    def __init__(self, frames_dir, seg_dir, n, fps, seg_frames, keep_png=False):
        self.frames_dir, self.seg_dir, self.n, self.fps, self.S = frames_dir, seg_dir, n, fps, seg_frames
        self.keep_png = keep_png
        self.q = queue.Queue()
        self.submitted = {a for a, _, _ in pvlib.existing_segments(seg_dir)}
        self.errors, self.made, self.busy_s = [], 0, 0.0
        self.th = threading.Thread(target=self._run, daemon=True)
        self.th.start()

    def _run(self):
        while True:
            job = self.q.get()
            if job is None:
                return
            a, b = job
            t0 = time.time()
            _, err = pvlib.compact_segment(self.frames_dir, self.seg_dir, a, b, self.fps, self.keep_png)
            self.busy_s += time.time() - t0
            if err:
                self.errors.append(err)
            else:
                self.made += 1

    def poke(self, lo=0, hi=None, final=False):
        """Queue every aligned segment whose frames are all present as PNG (partial tail if final)."""
        hi = self.n if hi is None else hi
        have = pvlib.existing_frames(self.frames_dir)
        for a in range(0, self.n, self.S):
            b = min(a + self.S, self.n)
            if a in self.submitted:
                continue
            if all(i in have for i in range(a, b)):
                self.submitted.add(a)
                self.q.put((a, b))

    def close(self):
        self.q.put(None)
        self.th.join()
        return self.errors


def drive(pool, on_ready, fmt_prefix="", on_done=None):
    """Event loop: returns (stats, None) or (None, err). on_ready(info) enqueues work on first ready."""
    done, busy_s, layer_ms, per_worker = 0, 0.0, {}, {}
    started, expected, gl, meta = None, None, None, None
    t_start = last_msg = time.time()
    while True:
        try:
            msg = pool.results.get(timeout=5)
        except queue.Empty:
            if not any(p.is_alive() for p in pool.procs):
                return None, "all workers exited"
            if time.time() - last_msg > 600:
                return None, "no progress for 10 minutes"
            continue
        last_msg = time.time()
        kind, wid = msg[0], msg[1]
        if kind == "log":
            print(f"{fmt_prefix}[w{wid}] {msg[2]}", flush=True)
        elif kind == "fatal":
            return None, f"worker {wid}: {msg[2]}"
        elif kind == "ready":
            info = msg[2]
            print(f"{fmt_prefix}[w{wid}] ready in {info['boot_s']}s  gl={info['gl']}", flush=True)
            if expected is None:
                expected, err = on_ready(info)
                if err:
                    return None, err
                started, gl, meta = time.time(), info["gl"], info["meta"]
                if expected == 0:
                    return {"frames": 0, "wall_s": 0, "gl": gl, "meta": meta}, None
        elif kind == "done":
            _, _, i, dirkey, tm, wall = msg
            done += 1
            if on_done:
                on_done(i, dirkey)
            busy_s += wall
            per_worker.setdefault(wid, []).append(wall)
            for k, v in tm.items():
                layer_ms.setdefault(k, []).append(v)
            el = time.time() - started
            eta = el / done * (expected - done)
            parts = " ".join(f"{k}={v:.0f}" for k, v in tm.items() if k != "total")
            print(f"{fmt_prefix}[{done:4d}/{expected}] f{i:05d} w{wid} {wall:5.2f}s  ({parts} ms)  "
                  f"elapsed {el:5.0f}s eta {eta:5.0f}s", flush=True)
            if done >= expected:
                wall_total = time.time() - started
                return {
                    "frames": done, "wall_s": round(wall_total, 2),
                    "s_per_frame_effective": round(wall_total / done, 3),
                    "s_per_frame_mean": round(busy_s / done, 3),
                    "s_per_frame_per_worker": {f"w{w}": round(sum(v) / len(v), 3) for w, v in per_worker.items()},
                    "layer_ms_mean": {k: round(sum(v) / len(v), 1) for k, v in layer_ms.items()},
                    "workers": len(per_worker), "gl": gl, "meta": meta,
                    "total_s_incl_boot": round(time.time() - t_start, 2),
                }, None


def load_frame(frames_dir, seg_dir, i):
    """PIL image of rendered frame i from its PNG or from the lossless segment holding it."""
    from PIL import Image
    p = pvlib.frame_path(frames_dir, i)
    if pvlib.png_complete(p):
        return Image.open(p).convert("RGB"), None
    for a, b, path in pvlib.existing_segments(seg_dir):
        if a <= i < b:
            ims, err = pvlib.decode_frames(path, [i - a])
            return (ims[0], None) if not err else (None, err)
    return None, f"frame {i} not rendered"


def compare(ia, ib):
    """((identical, max_diff, frac_pixels_differing), None) or (None, err)."""
    from PIL import ImageChops
    if ia.size != ib.size:
        return (False, 255, 1.0), None
    diff = ImageChops.difference(ia, ib)
    if diff.getbbox() is None:
        return (True, 0, 0.0), None
    ext = max(e[1] for e in diff.getextrema())
    g = diff.convert("L").point(lambda v: 255 if v > 0 else 0)
    return (False, ext, round(g.histogram()[255] / (ia.size[0] * ia.size[1]), 6)), None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scene")
    ap.add_argument("--out", required=True)
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--range", help="A:B frame range (default 0:durationFrames)")
    ap.add_argument("--width", type=int)
    ap.add_argument("--height", type=int)
    ap.add_argument("--fps", type=int)
    ap.add_argument("--frames", type=int, help="override durationFrames")
    ap.add_argument("--seed", type=int)
    ap.add_argument("--gpu", choices=["metal", "swiftshader"], default="metal" if sys.platform == "darwin" else "swiftshader")
    ap.add_argument("--fmt", choices=["png", "rgba"], default="png", help="frame transfer format (both lossless)")
    ap.add_argument("--store", choices=["segments", "png"], default="segments")
    ap.add_argument("--seg-frames", type=int, default=30)
    ap.add_argument("--verify", type=int, default=0, help="re-render K random frames in a fresh browser, in "
                    "shuffled order, and require pixel-identical output")
    ap.add_argument("--check-loop", action="store_true", help="render frame N and require it to equal frame 0")
    ap.add_argument("--encode", action="store_true", help="run encode.py all afterwards")
    ap.add_argument("--clean", action="store_true", help="delete existing frames/segments first")
    ap.add_argument("--force", action="store_true", help="resume even if params/scene changed")
    ap.add_argument("--boot-timeout", type=int, default=240)
    ap.add_argument("--name")
    a = ap.parse_args()
    if a.workers > 3:
        print("note: capping workers at 3 (shared machine)", file=sys.stderr)
        a.workers = 3

    scene = os.path.abspath(a.scene)
    scene_dir, scene_file = os.path.split(scene)
    out = os.path.abspath(a.out)
    frames_dir, seg_dir, verify_dir = (os.path.join(out, d) for d in ("frames", "segments", "verify"))
    if a.clean:
        for d in (frames_dir, seg_dir, verify_dir):
            shutil.rmtree(d, ignore_errors=True)
    os.makedirs(frames_dir, exist_ok=True)
    (srv, base), err = pvlib.start_server(scene_dir, {"frames": frames_dir, "verify": verify_dir})
    if err:
        print("ERROR", err, file=sys.stderr)
        return 2
    scene_url = f"{base}/scene/{scene_file}?{scene_query(a)}"
    print(f"[render] {scene_url}", flush=True)
    opts = {"gpu": a.gpu, "fmt": a.fmt, "boot_timeout": a.boot_timeout}
    scene_hash = pvlib.file_hash(pvlib.scene_dependencies(scene))
    name = a.name or os.path.splitext(scene_file)[0]
    state = {}

    def on_ready(info):
        m = info["meta"]
        N = int(m["N"])
        lo, hi = parse_range(a.range, N)
        eff = {"name": name, "scene": scene, "scene_hash": scene_hash, "width": m["W"], "height": m["H"],
               "fps": m["fps"], "frames": N, "seed": m["seed"], "poster": m.get("poster", 0),
               "backend": a.gpu, "title": m.get("title")}
        old, _ = pvlib.read_manifest(out)
        have = pvlib.covered_frames(frames_dir, seg_dir)
        if have and not a.force:
            keys = ["scene_hash", "width", "height", "fps", "frames", "seed", "backend"]
            diff = {k: ((old or {}).get(k), eff[k]) for k in keys if (old or {}).get(k) != eff[k]}
            if diff:
                return None, (f"existing frames were rendered with different settings {diff}; "
                              f"use --clean to discard them or --force to keep them")
        eff["runs"] = (old or {}).get("runs", [])
        pvlib.write_manifest(out, eff)
        state["manifest"] = eff
        todo = [i for i in range(lo, hi) if i not in have]
        print(f"[render] {m['W']}x{m['H']} @{m['fps']}fps N={N} range {lo}:{hi}  "
              f"{len(have & set(range(lo, hi)))} frames exist, {len(todo)} to render, store={a.store}", flush=True)
        if a.store == "segments":
            state["compactor"] = Compactor(frames_dir, seg_dir, N, m["fps"], a.seg_frames)
            state["compactor"].poke()
        for i in todo:
            pool.tasks.put((i, "frames"))
        return len(todo), None

    def on_done(i, dirkey):
        c = state.get("compactor")
        if c and dirkey == "frames" and (i + 1) % a.seg_frames == 0 or (c and i == state["manifest"]["frames"] - 1):
            c.poke()

    pool = Pool(a.workers, base, scene_url, opts)
    stats, err = None, None
    try:
        stats, err = drive(pool, on_ready, on_done=on_done)
    finally:
        pool.stop(hard=stats is None)
    comp = state.get("compactor")
    if comp:
        t_c = time.time()
        comp.poke()
        cerr = comp.close()
        segs = pvlib.existing_segments(seg_dir)
        print(f"[render] segments: {len(segs)} lossless ({comp.made} new, compaction {comp.busy_s:.1f}s total, "
              f"+{time.time() - t_c:.1f}s after last frame), "
              f"{sum(os.path.getsize(p) for _, _, p in segs) / 1e6:.1f} MB", flush=True)
        if cerr and not err:
            err = "; ".join(cerr)
    if err:
        print("ERROR", err, file=sys.stderr)
        return 1
    man = state["manifest"]
    if stats["frames"]:
        run_rec = {k: v for k, v in stats.items() if k != "meta"}
        run_rec["when"] = time.strftime("%Y-%m-%d %H:%M:%S")
        man["runs"].append(run_rec)
        pvlib.write_manifest(out, man)
        print(f"[render] {stats['frames']} frames in {stats['wall_s']}s with {stats['workers']} worker(s): "
              f"{stats['s_per_frame_effective']} s/frame effective (wall/frames), "
              f"{stats['s_per_frame_mean']} s/frame per worker", flush=True)

    # ---- purity / loop checks: a FRESH browser renders frames in shuffled order
    if a.verify or a.check_loop:
        have = sorted(pvlib.covered_frames(frames_dir, seg_dir))
        rnd = random.Random(12345)
        pick = rnd.sample(have, min(a.verify, len(have))) if a.verify else []
        jobs = [(i, "verify") for i in pick]
        if a.check_loop:
            jobs.insert(len(jobs) // 2, (man["frames"], "verify"))
        shutil.rmtree(verify_dir, ignore_errors=True)
        vpool = Pool(1, base, scene_url, opts)

        def on_ready_v(info):
            for j in jobs:
                vpool.tasks.put(j)
            return len(jobs), None
        vstats = None
        try:
            vstats, err = drive(vpool, on_ready_v, "verify ")
        finally:
            vpool.stop(hard=vstats is None)
        if err:
            print("ERROR verify:", err, file=sys.stderr)
            return 1
        checks, ok_all = [], True
        for i, _ in jobs:
            is_loop = i == man["frames"]
            ref, err = load_frame(frames_dir, seg_dir, 0 if is_loop else i)
            new, err2 = load_frame(verify_dir, "", i)
            if err or err2:
                print("ERROR compare:", err or err2, file=sys.stderr)
                return 1
            (same, mx, frac), _ = compare(new, ref)
            label = f"loop f{i}==f0" if is_loop else f"determinism f{i}"
            checks.append({"check": label, "identical": same, "max_diff": mx, "frac_px": frac})
            print(f"[check] {label:22s} {'IDENTICAL' if same else f'DIFFERS max={mx} px={frac:.4%}'}", flush=True)
            ok_all &= same
        man["checks"] = checks
        pvlib.write_manifest(out, man)
        shutil.rmtree(verify_dir, ignore_errors=True)
        if not ok_all:
            print("WARNING: frame purity check failed (see above)", file=sys.stderr)

    if a.encode:
        import encode
        _, err = encode.run_targets(out, ["master", "card", "poster", "sheet", "preview"], {"name": name})
        if err:
            print("ERROR encode:", err, file=sys.stderr)
            return 1
    srv.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
