"""Shared helpers for the pv render pipeline: static/upload HTTP server, frame paths, manifest.

Conventions: helpers return (value, None) on success and (None, "error message") on failure.
"""
import hashlib
import io
import json
import os
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse, parse_qs

PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
FRAME_FMT = "f_{:05d}.png"
FRAME_RE = re.compile(r"^f_(\d{5})\.png$")

MIME = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
    ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json",
    ".hdr": "application/octet-stream", ".exr": "application/octet-stream", ".map": "application/json",
    ".wasm": "application/wasm", ".txt": "text/plain; charset=utf-8", ".csv": "text/csv; charset=utf-8",
}


def frame_path(frames_dir, i):
    return os.path.join(frames_dir, FRAME_FMT.format(i))


def png_complete(path):
    """True if `path` is a PNG that ends with an IEND chunk (i.e. was fully written)."""
    try:
        size = os.path.getsize(path)
        if size < 64:
            return False
        with open(path, "rb") as f:
            if f.read(8) != b"\x89PNG\r\n\x1a\n":
                return False
            f.seek(-12, os.SEEK_END)
            return f.read(12)[4:8] == b"IEND"
    except OSError:
        return False


def existing_frames(frames_dir):
    """Set of frame indices already rendered completely in frames_dir."""
    done = set()
    if not os.path.isdir(frames_dir):
        return done
    for name in os.listdir(frames_dir):
        m = FRAME_RE.match(name)
        if m and png_complete(os.path.join(frames_dir, name)):
            done.add(int(m.group(1)))
    return done


# ---------------------------------------------------------------------------
# Lossless segments: PNG frames are compacted into x264rgb qp0 (bit-exact RGB) .mkv chunks.
# Temporal prediction makes them ~5x smaller than PNG for static-paper content, and every
# segment is verified pixel-exact against its PNGs before the PNGs are deleted.
# ---------------------------------------------------------------------------
SEG_FMT = "seg_{:05d}_{:05d}.mkv"
SEG_RE = re.compile(r"^seg_(\d{5})_(\d{5})\.mkv$")
LOSSLESS_ARGS = ["-c:v", "libx264rgb", "-qp", "0", "-preset", "veryfast", "-pix_fmt", "rgb24"]


def existing_segments(seg_dir):
    """Sorted [(a, b, path)] of complete segments (they are only ever created by atomic rename)."""
    out = []
    if not os.path.isdir(seg_dir):
        return out
    for name in os.listdir(seg_dir):
        m = SEG_RE.match(name)
        if m:
            out.append((int(m.group(1)), int(m.group(2)), os.path.join(seg_dir, name)))
    return sorted(out)


def covered_frames(frames_dir, seg_dir):
    done = existing_frames(frames_dir)
    for a, b, _ in existing_segments(seg_dir):
        done.update(range(a, b))
    return done


def decode_frames(seg_path, local_indices):
    """Decode frames (0-based within the segment) to PIL RGB images. Returns (list, None) or (None, err)."""
    import subprocess
    from PIL import Image
    if not local_indices:
        return [], None
    expr = "+".join(f"eq(n\\,{k})" for k in sorted(set(local_indices)))
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", seg_path, "-vf", f"select='{expr}'",
           "-vsync", "0", "-f", "image2pipe", "-c:v", "png", "-pix_fmt", "rgb24", "-"]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        return None, f"decode {seg_path}: {r.stderr.decode()[-500:]}"
    data, ims, pos = r.stdout, [], 0
    while pos < len(data):
        end = data.find(b"IEND", pos)
        if end < 0:
            break
        end += 8
        ims.append(Image.open(io.BytesIO(data[pos:end])).convert("RGB"))
        pos = end
    order = sorted(set(local_indices))
    if len(ims) != len(order):
        return None, f"decode {seg_path}: wanted {len(order)} frames, got {len(ims)}"
    by = dict(zip(order, ims))
    return [by[k] for k in local_indices], None


def compact_segment(frames_dir, seg_dir, a, b, fps, keep_png=False):
    """Stream PNG frames a..b-1 into a lossless segment, verify it bit-exact, then drop the PNGs.

    Returns (path, None) or (None, err).
    """
    import subprocess
    from PIL import Image, ImageChops
    os.makedirs(seg_dir, exist_ok=True)
    dst = os.path.join(seg_dir, SEG_FMT.format(a, b))
    tmp = dst + ".part.mkv"
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", str(fps),
           "-c:v", "png", "-i", "-", *LOSSLESS_ARGS, tmp]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        for i in range(a, b):
            with open(frame_path(frames_dir, i), "rb") as f:
                p.stdin.write(f.read())
        p.stdin.close()
    except (OSError, BrokenPipeError) as e:
        p.kill()
        return None, f"segment {a}:{b} write failed: {e}"
    if p.wait() != 0:
        return None, f"segment {a}:{b} ffmpeg failed: {p.stderr.read().decode()[-500:]}"
    # verify first, middle and last frame are bit-exact before trusting the segment
    probe = sorted({0, (b - a) // 2, b - a - 1})
    ims, err = decode_frames(tmp, probe)
    if err:
        return None, err
    for k, im in zip(probe, ims):
        ref = Image.open(frame_path(frames_dir, a + k)).convert("RGB")
        if ImageChops.difference(im, ref).getbbox() is not None:
            return None, f"segment {a}:{b} is not lossless at frame {a + k}"
    os.replace(tmp, dst)
    if not keep_png:
        for i in range(a, b):
            try:
                os.remove(frame_path(frames_dir, i))
            except OSError:
                pass
    return dst, None


def file_hash(paths):
    h = hashlib.sha256()
    for p in paths:
        try:
            with open(p, "rb") as f:
                h.update(f.read())
        except OSError:
            h.update(b"<missing>" + p.encode())
    return h.hexdigest()[:16]


def scene_dependencies(scene_path):
    """Scene file + local .js/.mjs/.json/.css siblings it references + the runtime (best effort)."""
    deps = [scene_path, os.path.join(PIPELINE_DIR, "runtime", "pv.js")]
    try:
        with open(scene_path, encoding="utf-8") as f:
            src = f.read()
        base = os.path.dirname(scene_path)
        for ref in re.findall(r"""['"](\./[^'"]+\.(?:m?js|json|css|glsl))['"]""", src):
            deps.append(os.path.normpath(os.path.join(base, ref)))
    except OSError:
        pass
    return deps


def read_manifest(out_dir):
    path = os.path.join(out_dir, "render.json")
    if not os.path.exists(path):
        return None, "no render.json in " + out_dir
    try:
        with open(path) as f:
            return json.load(f), None
    except (OSError, ValueError) as e:
        return None, f"bad render.json: {e}"


def write_manifest(out_dir, data):
    path = os.path.join(out_dir, "render.json")
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)
    return path, None


def save_rgba_png(data, w, h, path, compress_level=3):
    from PIL import Image
    try:
        im = Image.frombuffer("RGBA", (w, h), data, "raw", "RGBA", 0, 1).convert("RGB")
        buf = io.BytesIO()
        im.save(buf, "PNG", compress_level=compress_level)
        return buf.getvalue(), None
    except Exception as e:  # noqa: BLE001
        return None, f"png encode failed: {e}"


class _Handler(BaseHTTPRequestHandler):
    server_version = "pv/1"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):  # quiet
        if getattr(self.server, "verbose", False):
            super().log_message(fmt, *args)

    def _send(self, code, body=b"", ctype="text/plain"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _resolve(self, path):
        for prefix, root in self.server.mounts:
            if path.startswith(prefix):
                rel = unquote(path[len(prefix):])
                full = os.path.normpath(os.path.join(root, rel))
                if full == root or full.startswith(root + os.sep):
                    return full
        return None

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = urlparse(self.path).path
        full = self._resolve(path)
        if not full or not os.path.isfile(full):
            self._send(404, b"not found: " + path.encode())
            return
        with open(full, "rb") as f:
            body = f.read()
        self._send(200, body, MIME.get(os.path.splitext(full)[1].lower(), "application/octet-stream"))

    def do_POST(self):
        u = urlparse(self.path)
        m = re.match(r"^/__frame/(\d+)$", u.path)
        if not m:
            self._send(404)
            return
        i = int(m.group(1))
        q = parse_qs(u.query)
        target = q.get("dir", ["frames"])[0]
        if target not in self.server.upload_dirs:
            self._send(400, b"bad dir")
            return
        n = int(self.headers.get("Content-Length", "0"))
        data = self.rfile.read(n)
        fmt = self.headers.get("x-pv-format", "png")
        if fmt == "rgba":
            w, h = int(self.headers["x-pv-width"]), int(self.headers["x-pv-height"])
            data, err = save_rgba_png(data, w, h, None)
            if err:
                self._send(500, err.encode())
                return
        out_dir = self.server.upload_dirs[target]
        os.makedirs(out_dir, exist_ok=True)
        dst = frame_path(out_dir, i)
        tmp = dst + f".part{threading.get_ident()}"
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, dst)  # atomic: a frame file either exists complete or not at all
        self._send(200, b"ok")


def start_server(scene_dir, upload_dirs=None, verbose=False):
    """Serve /pv/* from the pipeline dir and /scene/* from scene_dir; accept POST /__frame/<i>?dir=<k>.

    Returns ((server, base_url), None) or (None, error).
    """
    try:
        srv = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    except OSError as e:
        return None, f"cannot bind server: {e}"
    srv.daemon_threads = True
    srv.mounts = [("/pv/", PIPELINE_DIR), ("/scene/", os.path.abspath(scene_dir))]
    srv.upload_dirs = dict(upload_dirs or {})
    srv.verbose = verbose
    th = threading.Thread(target=srv.serve_forever, daemon=True)
    th.start()
    return (srv, f"http://127.0.0.1:{srv.server_address[1]}"), None
