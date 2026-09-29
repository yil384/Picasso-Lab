# Cloud setup (Claude Code on the web)

## 1. Environment setup script (claude.ai/code → environment settings → Setup script)
Runs as root on Ubuntu 24.04 before the session starts (keep it under ~5 minutes so it gets cached):

```bash
#!/bin/bash
set -e
apt-get update -y
apt-get install -y ffmpeg webp fonts-noto-color-emoji
python3 -m pip install --break-system-packages --quiet playwright pillow
python3 -m playwright install --with-deps chromium
```

Network access: the default **Trusted** level is enough (apt, PyPI and the Playwright browser download are package sources).
Everything the films need at render time (p5, p5.brush, three.js, fonts) is vendored in `pipeline/`.
Optional: add `github.com` / `raw.githubusercontent.com` if you want to browse the P(doom) source online (a copy of its analysis
and frames is already in `reference/pdoom/`).

Recommended environment variable: `BASH_MAX_TIMEOUT_MS=600000` (10-minute commands). Still keep renders in chunks.

## 2. If the setup script was not configured
Run the same commands at the start of the session (use `sudo` if not root).

## 3. Smoke test (≈1 minute)
```bash
cd video-kit/pipeline
python3 snap.py ../reference/style-comic/comic.html 0 96 200 --width 960 --height 540 --out ../out/_smoke
```
Open the three PNGs: you should see the Qubrio comic scene (sleepy atoms, a blue crane character). Delete `../out/_smoke` afterwards.
On Linux the scripts use CPU WebGL (SwiftShader) automatically; `--gpu swiftshader` forces it anywhere.
