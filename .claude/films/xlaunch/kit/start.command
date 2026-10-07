#!/bin/bash
# Picasso Lab film renderer: serves this folder on localhost and opens render.html (Chrome if installed).
# Double-click it, or run ./start.command in Terminal. Close the window (or Ctrl-C) to stop the server.
cd "$(dirname "$0")"
PORT=8765
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is needed: macOS will now offer to install its developer tools. Run this again afterwards."
  xcode-select --install; exit 1
fi
lsof -ti tcp:$PORT >/dev/null 2>&1 && kill $(lsof -ti tcp:$PORT) 2>/dev/null
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
URL="http://127.0.0.1:$PORT/render.html"
open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL"
echo "Renderer: $URL   (keep this window open while it renders; Ctrl-C to stop)"
wait $SRV
