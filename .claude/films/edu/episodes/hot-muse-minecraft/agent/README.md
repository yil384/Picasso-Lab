<!-- README.md - what the Muse-plays-Minecraft agent is, how its modules fit, how to run it, and what is mocked. -->
# Muse plays Minecraft: the agent

Meta's Muse Spark (through its OpenAI-compatible API) decides what to do; a mineflayer bot does the walking, mining
and crafting. The model sees the game as plain text and acts only through 10 whitelisted skills with validated
arguments. Viewers watch and play through a zero-JavaScript web page that an agent browser (a viewer's own Muse) can
operate from the accessibility tree. Plan and sources: `../../../research/muse-minecraft-plan.md` and
`../../../research/muse-minecraft-findings.json`.

Not affiliated with or endorsed by Meta or Mojang.

## Architecture

```
viewer's Muse (muse.ai) --HTTPS--> play.<domain>: control page (zero-JS forms) + /api + openapi.json
viewer (our page / X replies via operator) --> /ask queue --> muse-brain (our key)
                                  | per-session token, quotas, $ cap, kill switch, public log
                    mc-body (Node, mineflayer 4.39.0): 10 bounded skills + text state
                                  |
                    Paper 1.21.4, online-mode=false, bound to localhost/LAN only
                    prismarine-viewer watch page | JSONL decision log | user's client in /spectate
```

| File | What it is |
| --- | --- |
| `src/index.js` | `npm start`: the web page, one bot per guest session, the house bot + brain for `/ask`, the optional watch page, shutdown on Ctrl-C |
| `src/config.js` | every env var with its default, validated and frozen; the key is never printable |
| `src/contracts.js` | the 10 tools (`TOOLS`, strict JSON Schemas), the MCP-only `craft_batch` (`MCP_SKILLS`, `SKILL_NAMES`), `validateArgs` / `parseArgs` / `coerceArgs`, the typed result codes of MCP replies (`RESULT_CODES`, `codeOf`), and the JSDoc interfaces of Body, Brain, LLM, Logger, Web and the MCP reply |
| `src/game.js` | the game vocabulary the tool schemas are built from: minable blocks, craftable items, furnace inputs, fuels, blueprints, attack targets |
| `src/pricing.js` | Muse Spark prices, `cost(usage, tier)`, the rolling one-hour spend meter |
| `src/llm.js` | the chat client: clean request, streaming, TTFT and latency, $ per call |
| `src/log.js` | JSONL decision log with secrets scrubbed |
| `src/mc.js` | vec3 and the prismarine libraries, resolved through mineflayer (one copy each) |
| `src/body.js`, `src/skills/`, `src/state.js` | the mineflayer body, the 10 skills (plus `craft_batch` for MCP: `src/skills/craft-batch.js`) and the plain-text state |
| `src/walk-watch.js` | is a walk still getting closer? Ends one that is not (digging by hand, pillaring, going in circles) with what held it up, where the bot is and what to try |
| `src/skills/window.js` | window clicks the server confirms: crafting (and the inventory checks around every skill) never trust mineflayer's optimistic window picture |
| `src/brain.js`, `src/memory.js` | the tool loop, its guards, short-term memory and `notes.json` |
| `src/web.js` | `/`, `/play`, `/api`, `openapi.json`, `/ask`, `/log`, `/admin/stop` |
| `src/mcp.js`, `src/mcp-queue.js`, `src/plan.js` | `/mcp`: the tools and their replies (text plus `structuredContent`); the per-game step queue with idempotent calls; the dry-run check that simulates the inventory through a call's steps before it runs (section "MCP calls") |
| `src/live-view-fx.js` | runs in the live-view pages: eased first-person camera, crack overlay on the block being broken |
| `src/stream.js`, `src/stream-page.js` | live video of a guest game (off unless `STREAM_ENABLED`): headless Chromium on the bot's first-person view, a smoothed camera, ffmpeg to RTMPS (Facebook Live) or an MP4; the stream service and its client for the container (section "Live video") |
| `src/camera.js` | the real-client camera (`STREAM_SOURCE=client`): Xvfb + the vanilla Minecraft client as a spectator in the bot's head, ffmpeg x11grab, the same stream interface (section "Real-client camera") |
| `scripts/stream.mjs` | one stream on demand (to a file or an RTMP(S) URL, with its CPU, RAM and frame numbers), a side-by-side camera comparison, `--camera` (one real-client stream of a player), or `--serve` (the stream or camera container) |
| `scripts/camera-login.mjs` | signs the camera's Microsoft account in once (device code, no password) and keeps its tokens in the auth folder; `--check` |
| `deploy/Dockerfile.camera`, `deploy/camera/` | the camera image: Java 21, the 1.21.4 client (`install-client.mjs`, SHA-1 checked, no sounds), `CameraMain.java` (the token from the environment, never the command line), Xvfb, Mesa, VirtualGL, ffmpeg |
| `deploy/camera-test.compose.yaml` | a separate test project on picasso (`muse-camera-test`: own Paper, agent, camera, network; shares nothing with production) |
| `scripts/probe.mjs` | latency and $ per call: effort x cache on/off x Chat/Responses, CSV per call |
| `scripts/run-goal.mjs` | one goal from the command line (real server, or the mock and the fake bot), JSONL log, HUD table |
| `scripts/hud-data.mjs` | the video HUD numbers from one or more run logs (milestones, totals, failures, timeline) |
| `scripts/a11y_snapshot.py` | the accessibility tree of a `/play` page, as an agent browser sees it; `--check` asserts it (Python Playwright 1.49+) |
| `scripts/a11y-chrome.mjs` | the same tree and check through a Chrome that is already installed (DevTools protocol, JavaScript off); no Playwright |
| `test/mock-llm.js` | local mock of the chat (and Responses) endpoint, also `npm run mock` |
| `test/fake-bot.js` | in-memory fake of the mineflayer bot surface the body uses (also `--fake-bot`) |
| `test/real-mcp.test.js` | the MCP calls on a real Paper server (skipped unless `MC_REAL=1` and `MC_CONSOLE`): `MC_REAL=1 MC_CONSOLE=server/console.in node --test test/real-mcp.test.js` |

Node 22 or newer (mineflayer 4.39, minecraft-protocol and openai 7 require it). Every command below runs in this
folder.

## Tests (no key, no Minecraft)

```sh
npm install
npm test          # node --test test/ : every *.test.js (about 15 s)
npm run test:stream   # the streamer's tests with its end-to-end run: a real headless Chromium and ffmpeg (about 15 s)
```

Tests never reach a real API: `createLLM` refuses any non-local URL while running under `node --test`, and the API
key is only ever sent to the configured `MODEL_BASE_URL`. The accessibility check runs through the installed Chrome
(`CHROME_PATH`, or the usual install places; skipped without one) and again through Python Playwright when a
`python3` with Playwright 1.49+ is found (`A11Y_PYTHON`, `python3`, `/usr/bin/python3`; skipped otherwise, with the
reason).

## A scripted episode end to end (no key, no Minecraft)

The mock model plays a scripted player against the fake bot; the run writes a JSONL log that `hud-data` reduces.

```sh
node scripts/run-goal.mjs iron_pickaxe --mock      # 13 decisions to an iron pickaxe; log in logs/run-mock-<time>.jsonl
node scripts/hud-data.mjs                          # HUD table from the newest run log in logs/
node scripts/hud-data.mjs logs/run-mock-*.jsonl --out hud.json   # one row per run plus medians, as JSON too
```

These numbers are plumbing checks, not measurements. `hud-data` labels every run `SIMULATED` (mock model, $ not
billed, or the fake world with instant moves; from the `mode` and `simulated` fields of run-goal's `run_start`) or
`UNVERIFIED` (the log does not say), in the table and as `label` / `simulatedParts` in the JSON. A HUD render must
show that label, and no caption may quote such a run as measured.

Other goals for the scripted player: `logs:N`, `planks:N`, `hut`, `wooden_pickaxe`, `stone_pickaxe`, `furnace`,
`iron_ingot`. `--script replies.json` replays your own replies instead. Mock runs use a temporary `notes.json`.

The same with the mock as its own process (it replays a wooden-pickaxe episode, then answers HTTP 500; restart it
before each run):

```sh
npm run mock                                                                         # terminal 1
MODEL_BASE_URL=http://127.0.0.1:8788/v1 node scripts/run-goal.mjs wooden_pickaxe --fake-bot   # terminal 2
```

## The viewer page locally (no key, no Minecraft)

```sh
npm start -- --fake-bot        # http://127.0.0.1:8787/ ; every guest bot plays in its own fake world
```

Without a model the Ask queue is closed and says so. To try it on the mock:

```sh
npm run mock -- --loop                                                   # terminal 1
MODEL_BASE_URL=http://127.0.0.1:8788/v1 npm start -- --fake-bot          # terminal 2
node scripts/a11y-chrome.mjs http://127.0.0.1:8787/ --check             # terminal 3 (uses the installed Chrome)
python3 scripts/a11y_snapshot.py http://127.0.0.1:8787/ --check          # or: Python Playwright 1.49+ (exit 3 if missing or older)
```

Ctrl-C stops everything: the Ask queue closes, every session ends and its bot leaves, notes and the log are written. A
second Ctrl-C exits at once.

| Route | What it does |
| --- | --- |
| `GET /` | what this is, 18+, "Get a bot" form, a ready-to-paste agent prompt, the "Ask our Muse" form |
| `POST /session`, `GET /play/<token>` | start a guest session; the zero-JS control page (state, one form per skill, stop, end) |
| `POST /api/session` `{"adult":true}` | the same session as JSON; then `GET /api/<token>/state`, `POST /api/<token>/<skill>`, `POST /api/<token>/stop`, `DELETE /api/<token>` |
| `GET /openapi.json` | OpenAPI 3.1, one operation per skill (operationId = skill name), for a custom connector |
| `GET/POST /ask` | the queue for our own brain: 18+, `WEB_ASK_MAX_CHARS`, one waiting or running request and `WEB_ASK_PER_HOUR` per address, closed while the hourly $ cap is spent |
| `GET /log?n=50` | the public JSONL tail (session tokens and the admin token scrubbed, no IP addresses) |
| `POST /admin/stop` | kill switch, `Authorization: Bearer $WEB_ADMIN_TOKEN`; stops every skill and clears the queue, `{"end":true}` also ends every session; 5 wrong tokens lock an address out for the hour |
| `/mcp` | MCP (streamable HTTP) for a connector such as Muse: `start_game {adult: true}`, `play`, `play_sequence`, `get_state`, `stop`, `end_game` (src/mcp.js) |
| `GET /watch/<id>/`, `GET /eyes/<id>/` | a guest bot's live 3D views (prismarine-viewer, read-only: clicks from the page are ignored), with src/live-view-fx.js added (`muse-fx.js`): eased first-person turns (the bot is not slowed: the picture turns, at most 360 degrees a second), the game's crack textures on the block being broken (`muse-fx/events`, server-sent), no magenta boxes for dropped items |

MCP: one game per MCP session (connector users share the agent's egress addresses); per address at most
`max(2, WEB_MAX_SESSIONS / 2)` live MCP games and 60 MCP game starts an hour, no cooldown. Every reply comes within
45 s with the result and the state (with the time left); steps still running or queued then go on, and a later reply
(get_state waits for them) reports their results once the client has received them (section "MCP calls"). start_game
returns a handle that resumes the game, with its queue, from a new MCP session.
MCP sessions: 64 KB per request, 20 per address and 200 in all (the one called longest ago
without a game makes room), 1200 new ones per address an hour, dropped after 10 minutes without a game; a game ends
after 5 minutes without calls. Live views: per address 4 open WebSockets, 32 requests in flight and 120 new views an
hour, 12 WebSockets per bot; a WebSocket idle for 90 s, or whose reader lets 8 MB pile up, is dropped.

Each address (IPv6: each /64) holds one guest bot at a time and waits a minute after its session ends. POSTs that
another website makes a browser send (`Sec-Fetch-Site: cross-site` or `same-site`, or a foreign `Origin`) get 403;
server-side agents send neither header and are not affected. `/play` never reloads while the bot waits for the next
action (an agent filling a form would lose it); while the bot joins or a skill runs it reloads every 5 or 15 s, and
"Check again" reloads it by hand.

### MCP calls

`play` (one step) and `play_sequence` (up to 32) go through these stages (ROADMAP M2):

1. Every step's skill and arguments are validated; one bad step refuses the whole call (`BAD_ARGS`), nothing runs.
2. A repeat of an accepted call returns that call's steps and runs nothing (`DUPLICATE`): the same `request_id`
   (kept for the game's life, the newest 256), or without one the same call with the same arguments until 60 s after
   its last step ended (never while it runs). The same `request_id` for a different call is refused. `stop` forgets
   the calls without a `request_id`, so a deliberate repeat after a stop runs.
3. The dry-run check (`src/plan.js`) simulates the inventory through the steps, after the steps already queued (taken
   to work in full): the craft variants of minecraft-data 1.21.4, the smelt skill's fuel order and 24-item cap,
   collect's drops and harvest tools, place and build materials. When something is missing the call is refused with a
   list per step (`NEED_ITEMS`, `structuredContent.missing`); planks (from logs, one cut per wood), sticks, a crafting
   table (none carried or within 32 blocks) and a furnace that can be made are added as craft steps instead, or into
   a `craft_batch`'s list. `dry_run: true` only returns the plan. If the check itself fails, the call is not refused.
4. The steps go into the game's queue (`src/mcp-queue.js`, at most 64 waiting, else `QUEUE_FULL`) and run one after
   another past the reply. Each step is `pending` (waiting or running), `confirmed`, `failed` or `cancelled`; a failed
   step cancels everything queued after it, in every call; `stop` stops the running step and clears the queue.
5. The reply (within 45 s) has the text as before plus `structuredContent`: `code` (null, or `NEED_ITEMS`,
   `HOSTILE_CONTACT`, `RETREATED_LOW_HEALTH`, `INVENTORY_FULL`, `DIED`, `NOT_STARTED`, `DUPLICATE`, `BAD_ARGS`,
   `QUEUE_FULL`, `TIMED_OUT`, `STOPPED`, `FAILED`), `steps`, `earlier` (steps that finished since the last delivered
   reply), `queue`, `changed` (the inventory change) and a short `state` (health, food, position, inventory, seconds
   left; no scan of the blocks around). `get_state {full: true}` adds the whole state as `full`. A step's code comes
   from its result text (`codeOf` in src/contracts.js): a body that flees on its own should say "retreated" or "fled".

`craft_batch {items: [{item, n}, ...]}` (MCP only; the brain's tools and the web page keep the 10 skills) crafts a
list in order with one crafting table: the one within reach, or the carried one, placed once and picked up at the end.
On the local Paper server (2026-10-07, prepared: items from the console, the Mac loaded by other servers), a wooden
pickaxe, axe and stone pickaxe from 4 logs and 3 cobblestone took 7.5 and 6.9 s of skill time as one craft_batch (one
table) and 16.5 and 16.7 s as the same 8 crafts in a play_sequence (the table placed and picked up 3 times). Two runs
(`test/real-mcp.test.js`): a plumbing check, not a benchmark. The check itself costs under 3 ms, plus about 30 ms for
each station lookup it needs (`findBlock` within 32 blocks in a forest); the state text of every reply costs about
850 ms there.

## Run it for real (a machine with Paper 1.21.4 and a key)

1. Minecraft server: Paper 1.21.4 (plus ViaVersion so a current client can spectate), `server.properties` with
   `online-mode=false`, `server-ip=127.0.0.1` (or a LAN address), `server-port=25565`, a fixed `level-seed`. It must
   never be reachable from the internet: offline mode means anyone could join under any name. Accept the Minecraft
   EULA yourself (`eula.txt`).
2. Key: create one at dev.meta.ai and put `export MODEL_API_KEY=...` in your shell profile. Never paste it into code,
   chat or a file in this folder.
3. Measure first (no Minecraft needed):
   ```sh
   npm run probe -- --dry-run                       # the plan and the worst-case $, no calls
   npm run probe                                    # the same grid against the in-process mock
   npm run probe -- --live                          # the real API: prints the worst-case $, asks y/N first
   npm run probe -- --live --api chat,responses --efforts minimal,low --n 10 --yes   # no terminal to ask in
   ```
   A live run is refused when its worst case is over `--max-usd` (default `COST_CAP_HOUR`). One CSV row per call goes
   to `logs/probe-<date>.csv` (a second run that day gets `-2`). Every run starts with two brain-shaped calls per API
   (`--shape brain` runs only those): goal and state as two user messages, then the replayed tool call, its tool
   result and the next state (Responses: `previous_response_id` and a `function_call_output`). If they fail, fix the
   request shape before any brain run. Cache-off calls put a fresh nonce first in the system prompt and in the tools;
   compare cache on and off by the `cached_tokens` column, which is what the server reported.
4. One goal from the command line (caps from the env below, or `--steps`, `--usd`, `--minutes`):
   ```sh
   node scripts/run-goal.mjs iron_pickaxe --seed=-4172144997902289642   # real server + real model; seed only labels the log
   node scripts/run-goal.mjs hut --mock-llm         # the scripted mock player on the real server (integration test, no key)
   node scripts/run-goal.mjs iron_pickaxe --fake-bot --usd 0.2          # the real model on the fake bot (spends real $)
   node scripts/hud-data.mjs logs/run-a.jsonl logs/run-b.jsonl logs/run-c.jsonl --out hud.json   # median of three runs
   ```
   Exit codes: 0 goal met, 1 otherwise, 2 refused. Ctrl-C stops the brain.
5. Everything (guest bots + the Ask queue + the page): `npm start`, then open `http://127.0.0.1:8787/`. The house bot
   joins as `MC_USERNAME` when a model is configured on the Standard tier; guests join as `<MC_USERNAME>_<id>`. Expose
   only the web port, through a tunnel, and only while you are watching. With a tunnel, keep `WEB_HOST=127.0.0.1`,
   set `WEB_PUBLIC_URL` to the tunnel's https URL (it goes into the agent prompt, `openapi.json` and session links),
   and tell the server where client addresses come from: `WEB_TRUST_PROXY=cloudflare` for a Cloudflare Tunnel (the
   `CF-Connecting-IP` header), or the number of proxies that each append to `X-Forwarded-For` for another tunnel that
   does. Left `off`, every visitor through the tunnel shares one address for the limits.
6. Watch page (optional): `npm install prismarine-viewer`, then `npm start` serves the house bot's view on
   `http://WEB_HOST:MC_VIEWER_PORT/` (bound to `WEB_HOST`, like the page). `MC_VIEWER_PORT=0` turns it off.
7. After a world reset, delete `notes.json` and `notes-ask.json` (or their `places`): the known crafting tables and
   furnaces belong to the old world. Lessons may stay.

## Live video (Facebook Live)

The muse.ai preview panel loads no page of ours, but it frames Facebook's video plugin, so the bot's first-person view
goes out as a live video: H.264 + silent AAC over RTMPS to a Facebook Live stream, shown in the panel through
`https://www.facebook.com/plugins/video.php?href=...`. Off unless `STREAM_ENABLED`; with it off nothing starts and no
page changes.

How a stream works (`src/stream.js`, `src/stream-page.js`):

- When a guest game's `/eyes/<id>/` view listens, the stream of that game starts; it stops when the game ends. At most
  `STREAM_MAX` at once, each holding one `STREAM_RTMP_URL` (an ingest key takes one stream) until it is fully down.
- A headless Chromium (Playwright's headless shell; WebGL on SwiftShader, page composited in software) opens the eyes
  page on 127.0.0.1. In that page only, prismarine-viewer's client is patched as it is served: the first-person camera
  is ours, the render loop is capped at `STREAM_FPS`, one mesher worker instead of four (260 MB each), and "fast leaves"
  (no faces between leaves of a kind: half the triangles in a forest). The view is fogged at `STREAM_FAR` blocks, and
  sections far below or above the eye are not drawn. Placeholder boxes for entities without a model (dropped items) are
  hidden. The public `/watch` and `/eyes` pages are unchanged.
- The camera: the bot's pose updates arrive about 20 a second but irregularly; they are played 300 ms late and
  interpolated, updates that arrive in a bunch get their 50 ms ticks back, a stand-still holds until a tick before the
  next update, a move over 8 blocks (spread, respawn) is a cut, and an eased spring smooths the rest, with turns held
  under 270 degrees a second (pathfinder snaps the bot's look; the viewer showed every snap). Until the first update
  the page gets the bot's pose from the agent (the viewer sends none while the bot stands still).
- Frames: the DevTools screencast (JPEG, 640x360 at the default scale), put on a constant 30 fps clock by the time each
  frame was drawn (a 200 ms jitter buffer; a slow page repeats its last frame). ffmpeg scales 2x (square pixels), draws
  the caption (plain words from the running skill: "Collecting oak log (3)", "Walking to 12 64 -40"; never chat or
  viewer text) and encodes 1280x720 H.264 High, CBR 3000 kb/s, keyframe every 2 s, no B-frames, + silent 48 kHz stereo
  AAC 128 kb/s, FLV to the URL (MP4 to a file). It starts with the first frame.
- Supervision: a browser that exits, crashes, stalls 15 s or passes `STREAM_MAX_RSS_MB` is restarted while ffmpeg goes
  on with the last frame (the ingest connection stays); ffmpeg is restarted with a backoff (1-30 s). More than 6
  failures of either in 5 min end the stream (`stream_failed`). Frames for an ffmpeg more than ~5 s behind are dropped
  and counted. The browser runs at nice 10 (bots and the game first), ffmpeg at 0 (it must keep real time).
- Log rows: `stream_start`, `stream_browser`, `stream_live`, `stream_stats` (every minute: page and capture fps, repeats,
  drops, CPU and RAM of both children), `stream_browser_restart`, `stream_ffmpeg_exit`, `stream_stop`, `stream_failed`,
  `stream_skipped`, `stream_error`. The URLs are masked (`rtmps://live-api-s.facebook.com:443/rtmp/***`); the log
  scrubs the keys anyway.

Turn it on with a Facebook stream key (Live Producer, "Streaming software", a persistent key):

```sh
# locally, the agent streams itself (needs Chromium and ffmpeg on this machine)
STREAM_ENABLED=1 STREAM_RTMP_URL='rtmps://live-api-s.facebook.com:443/rtmp/<key>' npm start
# a test without Facebook: every guest game to an MP4 in /tmp/streams
STREAM_ENABLED=1 STREAM_OUT_DIR=/tmp/streams npm start
# one stream by hand from a running game (eyes link from /play), with its numbers every 5 s
node scripts/stream.mjs --source http://127.0.0.1:8787/eyes/<session>/ --out sample.mp4 --seconds 45
node scripts/stream.mjs --source http://127.0.0.1:8787/eyes/<session>/ --out compare.mp4 --compare --width 1280 --height 360 --scale 0.75
```

On picasso (`deploy/`): the streamer is its own container (compose profile `stream`, `deploy/Dockerfile.stream`), in
the agent's network namespace, capped at 8 CPUs and 3 GB together. Put the keys in `deploy/stream.env` (read by that
container alone; `push.sh` never copies or deletes it):

```sh
STREAM_ENABLED=1
STREAM_RTMP_URL=rtmps://live-api-s.facebook.com:443/rtmp/<key>
```

and tell the agent where it is, in `deploy/.env`: `STREAM_ENABLED=1` and `STREAM_SERVICE_URL=http://127.0.0.1:7861`.
`deploy/push.sh` builds and starts the stream container whenever `deploy/stream.env` exists. For more streams at once:
one URL per stream in `STREAM_RTMP_URL`, `STREAM_MAX` in compose.yaml, and the caps raised (about 6 CPUs and 1.5 GB per
stream). In the muse.ai panel: `https://www.facebook.com/plugins/video.php?href=<the live video's URL>&show_text=false`.

Measured on the M1 here (8 cores; a local model server held 10 GB of the 16 GB as wired memory throughout, so the
machine was short of RAM and CPU and the numbers are on the slow side), default settings, real games on the local
Paper server (2026-10-07):

| | |
| --- | --- |
| CPU per drawn frame (browser, all processes) | 93-166 ms in five games (birch and dark-oak forest, hills, a hillside tunnel); 230-250 ms on top of a dense dark-oak canopy (measured before software compositing) |
| browser CPU, RSS | 1.6-2.9 cores on average (peaks 4-4.7) and 0.4-0.7 GB |
| ffmpeg CPU, RSS | 0.6-0.75 core, 40-250 MB |
| page frame rate | 16-23 fps (CPU-bound on this machine; the cap is 30); the screencast caught 72-98 % of them, the clock repeats the rest |
| output | 1280x720, 30.000 fps CFR, 3.0 Mb/s, keyframes at every 2.000 s, AAC; decodes clean |
| what the settings saved | fast leaves -40 % per frame (234k -> 123k triangles); software compositing -26 %; 1 mesher worker -520 MB; 640x360 instead of 1280x720 -41 %; the viewer as it is at 1280x720 managed 7-9 fps on 4.6-6.7 cores |

Camera, the viewer's own vs smoothed, the same frames side by side (42 s walk and dig, 828 frames at 18 fps): turns of
more than 170 degrees in one frame at the 99th percentile vs 25; largest turn 268 vs 68 degrees a frame (that one after
a 0.5 s page stall); 55 vs 4 sudden turns and 36 vs 7 sudden moves (a frame more than 3x its neighbours); 5 vs 0
frames standing still mid-walk; frame-to-frame speed change 12.8 vs 1.2 blocks/s.

Estimate for picasso (2x EPYC 9534, 256 threads, load 170-230, no GPU for Chromium): SwiftShader's cost grows with
triangles and pixels and it uses up to 16 threads per browser; a Zen 4 thread whose sibling is busy does perhaps
0.6-0.8 of an M1 core, so plan 120-300 ms CPU per frame: 3.5-9 threads at 30 fps (3-7 at `STREAM_FPS=24`), plus one
for ffmpeg and about 1 GB RAM per stream; the compose caps (8 CPUs, 3 GB) fit one stream. With the load at 230 there
are about 26 threads spare: 2-3 streams at most. UNVERIFIED until measured there (`stream_stats` in the log gives the
real numbers every minute).

## Real-client camera

The live video can be the game itself instead of prismarine-viewer: a vanilla Minecraft Java 1.21.4 client joins the
Paper server as a spectator and rides along in the guest bot's head (`/spectate` through the console), so the picture
has the real block-break cracks, particles, lighting, sky and clouds. It is the same stream manager, service and agent
hook as above with another frame source (`STREAM_SOURCE=client`, `src/camera.js`), in its own container (compose
profile `camera`, `deploy/Dockerfile.camera`).

- The rig: Xvfb (`:99`, 1280x720) and the client (Temurin 21, the 1.21.4 jar and libraries from Mojang's manifest,
  SHA-1 checked, assets without the sounds), started with `--quickPlayMultiplayer` straight into the server. The
  client's `options.txt` is written before every start: render distance 8, 30 fps cap, fancy graphics, smooth
  lighting, brightness "Bright", chat hidden, sound off, no first-run or accessibility screens, no pause without focus,
  never throttled as idle. After it has joined ("Loaded N advancements" in its log) the rig puts it in spectator mode
  (console) and presses F1 (`xdotool`); a spectator shows no hotbar, hearts or crosshair anyway.
- One game: `tp <camera> <bot>`, two seconds later `spectate <bot> <camera>` (a client told to spectate an entity it
  has not loaded yet ignores it, and the server still carries it along: it films from inside the bot's head with its
  own view; the first test did exactly that). Every 5 s a console line checks that the camera is still at the bot and
  re-attaches it after a respawn or a long teleport (tagged, so nothing is printed while it rides along); a client
  that restarted mid-game is put back at once. ffmpeg grabs the display (x11grab, no cursor) and encodes it like the
  viewer streams: 1280x720 H.264 High, CBR, keyframe every 2 s, no B-frames, silent 48 kHz AAC, the caption, FLV to
  RTMPS or MP4 to a file. At the end the camera stops riding and floats 250 blocks up looking at the sky.
- Between games: the client stays in the world (a game goes live 3.5 s after it starts). After `CAMERA_IDLE_MS`
  (10 min) without a game it quits and Xvfb stays (0 % CPU, 46 MB); the next game starts it again (live after 15 s).
- Supervision: a client that exits, is disconnected ("Client disconnected with reason", "Couldn't connect to server")
  or has not joined after 150 s is restarted with a backoff (1-30 s); more than 6 restarts in 10 min rest the camera
  for 2 min (`camera_failed`). Xvfb is restarted if it dies. ffmpeg as in the viewer streams.
- The account: `scripts/camera-login.mjs` signs a Microsoft account that owns Java Edition in with the device code flow
  (prismarine-auth's live.com flow, the one mineflayer uses for Java accounts; nobody types the password anywhere but
  on Microsoft's own page), and keeps the tokens in `~/workspace/muse-minecraft/camera/auth` (700, files 600, never in
  the repo or the image). The camera refreshes them silently; it never asks for a code itself. The Minecraft token
  reaches the client through its environment (`deploy/camera/CameraMain.java`), never its command line, which every
  user of the machine can read. `CAMERA_AUTH=offline` runs an unauthenticated client under `CAMERA_NAME`, for tests on
  our own offline-mode server only.
- Log rows: `camera_client_start`, `camera_connecting`, `camera_joined`, `camera_disconnected`, `camera_restart`,
  `camera_client_exit`, `camera_failed`, `camera_sleep`, `camera_error`, and the stream rows (`stream_stats` has
  `clientFps` from Mesa's HUD, `captureFps`, `clientCpu`, `clientMB`, `ffmpegCpu`, ...).

Sign the account in once (on picasso; the code is valid for 15 minutes; the owner opens the link on any device):

```sh
docker run -d --name muse-camera-login --user "$(id -u):$(id -g)" -v ~/workspace/muse-minecraft/camera/auth:/auth \
  muse-minecraft-camera node scripts/camera-login.mjs --dir /auth      # or the muse-camera-test-camera image
cat ~/workspace/muse-minecraft/camera/auth/LOGIN_CODE.txt               # the link and the code
cat ~/workspace/muse-minecraft/camera/auth/LOGIN_STATUS.txt             # "signed in: <name>" once it worked
docker run --rm --user "$(id -u):$(id -g)" -v ~/workspace/muse-minecraft/camera/auth:/auth muse-minecraft-camera \
  node scripts/camera-login.mjs --dir /auth --check
```

Turn it on in production: `deploy/camera.env` on picasso with `STREAM_RTMP_URL=rtmps://...` (or
`STREAM_OUT_DIR=/logs/streams` for files), and in `deploy/.env` `STREAM_ENABLED=1` and
`STREAM_SERVICE_URL=http://127.0.0.1:7862`; then `deploy/push.sh` builds and starts the `camera` profile. The same
push also turns Paper's per-address connection throttle off (`deploy/paper-entry.sh`): every bot and the camera join
from the agent's one address, and the 4 s throttle refused a bot that joined right after the camera (it already
refused two guests starting within 4 s). It restarts Paper: push when no game runs.

Test it next to production: `deploy/camera-test.compose.yaml` (project `muse-camera-test`: its own Paper with the same
seed, agent and camera on 10.77.78.0/28, no published ports, videos in `~/workspace/muse-camera-test/streams`). Start a
game with `docker exec muse-camera-test-agent-1 node -e ...` against `http://127.0.0.1:8787/api/session`, or film one
player by hand inside the camera container: `node scripts/stream.mjs --camera --player Muse_ab12cd --out /streams/x.mp4
--seconds 45`.

Measured on picasso (2026-10-07; 2x EPYC 9534, load 170-230 most of the day, once 340; CPU rendering, defaults),
real games on the test server:

| | |
| --- | --- |
| client frame rate | 12-30 fps in a birch forest (about 17 typical), 8-27 on another walk, 9-12 on a dense dark-oak lake view; the 30 fps video repeats frames when the client is slower |
| client CPU, RSS | 3.3-4.4 cores (the render thread one whole core, llvmpipe's 8 threads about 0.3 each) and 1.2-1.35 GB |
| ffmpeg, Xvfb | 0.5-0.9 core and 100 MB; under 0.1 core and 90 MB |
| one camera while it films | about 4.5-5 CPU threads and 1.5 GB; parked between games about 2 cores (it still draws the sky), asleep 0 |
| output | 1280x720, 30.000 fps CFR, 3.5 Mb/s, keyframes at every 2.000 s, AAC 48 kHz stereo; no encoder drops |
| latency | a bot's head turn to the grabbed frame: 225-293 ms (median 261 ms, 10 turns); the encoder adds about a frame; Facebook's own delay is not measured |
| start | client to in the world 12-20 s; a game goes live 3.5 s after it starts (warm) or 15 s (asleep) |

Why so few frames: a JFR profile of the client puts 87 % of the render thread in native code, 95 % of that in
`glDrawElements`, i.e. llvmpipe's vertex processing, which runs on the calling thread. So the frame rate follows the
vertices on screen and one core's speed (the same on an idle machine: 9.4 fps on the dark-oak scene at load 12).
Fixed-scene tries: render distance 4 15.7 fps (6: no gain), fast leaves 11.9, drawing at 0.75x / 0.5x and scaling up
11.2 / 12.7, 16 llvmpipe threads 10.6; Mesa 25 (bookworm-backports), `mesa_glthread` and Zink on lavapipe: no gain.
The GPU path is wired (`CAMERA_GL=gpu`: VirtualGL's EGL back end) but cannot run on picasso: its H100s create OpenGL
contexts, yet every framebuffer object is `GL_FRAMEBUFFER_UNSUPPORTED` (on the host and in a container, driver
580.159.03; Mesa passes the same probe) and Vulkan cannot create a device, and both Minecraft and VirtualGL draw
into framebuffer objects.

How many cameras picasso can run: by CPU, at 5 threads each and the 26-86 threads the machine has spare at load
170-230, 5-15 in theory; in practice 2-4, because each camera's frame rate is one core's speed and drops when the
machine is crowded (the 340 spike). RAM (1.5 GB each) is no limit. Each camera also needs its own account: a second
client under the same name kicks the first (`createCameraPool` names camera 2 `<name>2`, which works only because the
server is offline-mode; that is the operator's call, not a default).

## Configuration

| Env var | Default | Meaning |
| --- | --- | --- |
| `MODEL_API_KEY` | (none) | the key; read from the environment only |
| `MODEL_BASE_URL` | `https://api.meta.ai/v1` | any OpenAI-compatible endpoint (OpenRouter, llama.cpp, the mock) |
| `MODEL_ID` | `muse-spark-1.3` (`-contributor` on that tier) | model id |
| `MODEL_TIER` | from the id | `standard` or `contributor`; picks the price table |
| `MODEL_EFFORT` | `low` | `minimal` / `low` / `medium` / `high` / `xhigh` / `max` (`none` is rejected by the API) |
| `MODEL_CACHE_KEY` | `muse-mc-v1` | `prompt_cache_key` prefix (the brain appends a hash of its prompt + tools); `off` sends none, which only drops the routing key: the prefix stays identical, so a provider's automatic cache may still hit (measure cache off with the probe) |
| `MODEL_STREAM` | `true` | stream (needed for TTFT); the client switches to plain JSON for good if a streamed reply comes without usage or the server refuses `stream_options` |
| `MODEL_TOOL_SCHEMA` | `full` | `basic` moves numeric/length bounds into descriptions; the client also switches on its own after a 400 that names a bound in the tools (setting it skips that first refused call) |
| `MODEL_MAX_TOKENS` | `8192` | `max_completion_tokens` (reasoning included), bounds the cost of one call; 0 sends none |
| `MODEL_TIMEOUT_MS`, `MODEL_MAX_RETRIES` | `120000`, `2` | deadline for one whole call, stream included (retries inside it); retries of HTTP errors |
| `MC_HOST`, `MC_PORT`, `MC_VERSION`, `MC_USERNAME` | `127.0.0.1`, `25565`, `1.21.4`, `Muse` | the server; a public host is refused |
| `MC_VIEWER_PORT` | `3007` | prismarine-viewer for the house bot, if installed; `0` is off |
| `WEB_HOST`, `WEB_PORT`, `WEB_PUBLIC_URL` | `127.0.0.1`, `8787`, (none) | the viewer page; the public URL goes into links and `openapi.json` (unset: the forwarded host behind a trusted proxy, else the listen address) |
| `WEB_TRUST_PROXY` | `off` | where the client address for the limits comes from: `off` (the socket), `cloudflare` (`CF-Connecting-IP`), or 1-5 proxies appending to `X-Forwarded-For` |
| `WEB_LEASE_MS`, `WEB_MAX_SESSIONS` | `600000`, `4` | one bot per guest for 10 minutes |
| `WEB_ASK_PER_HOUR`, `WEB_ASK_MAX_CHARS`, `WEB_MAX_BODY` | `3`, `300`, `8192` | `/ask` limits per address, request body cap |
| `WEB_ASK_ALLOW_CONTRIBUTOR` | `false` | the Ask queue stays closed on the Contributor tier (Meta may train on it) unless this is `true`; the page then says so |
| `WEB_ADMIN_TOKEN` | (none) | operator kill switch, at least 24 characters (`openssl rand -base64 24`); `/admin/stop` answers 404 without it |
| `BODY_MAX_TRAVEL` | `256` | farthest `go_to` |
| `STEP_CAP`, `COST_CAP_RUN`, `COST_CAP_HOUR` | `300`, `1.00`, `3.00` | per run, per run in US$, rolling hour in US$ |
| `ERROR_CAP`, `LOOP_REPEAT` | `8`, `3` | errors in a row (8 leaves room to explore for ore); same call failing (or changing nothing) before a hint |
| `NOTES_PATH`, `ASK_NOTES_PATH`, `SHORT_MEMORY` | `notes.json`, `notes-ask.json`, `8` | long-term notes of the filmed runs, of the Ask brain (viewer requests never write `notes.json`), steps kept verbatim |
| `LOG_DIR` | `logs` | JSONL logs: `run-<time>.jsonl` (run-goal), `run-serve-<time>.jsonl` (`npm start`), `probe-<date>.csv` |
| `STREAM_ENABLED` | `false` | live video of every guest game (section "Live video"); off: nothing is started and nothing changes |
| `STREAM_RTMP_URL` | (none) | `rtmps://...` ingest URLs with their stream keys, comma-separated, one per stream that may run at once; never printed or logged |
| `STREAM_OUT_DIR` | (none) | without an RTMP URL: every stream is an MP4 file here (local tests) |
| `STREAM_SERVICE_URL` | (none) | the stream container's API (`http://127.0.0.1:7861`); the agent then starts and stops streams there instead of in its own process |
| `STREAM_MAX` | `1` | streams at once (never more than output URLs or than games) |
| `STREAM_FPS`, `STREAM_SCALE`, `STREAM_BITRATE_K`, `STREAM_FAR` | `30`, `0.5`, `3000`, `48` | frame rate; the page renders at 1280x720 times the scale; video kb/s (CBR); how far the bot sees (blocks, fogged) |
| `STREAM_MAX_RSS_MB`, `STREAM_NO_SANDBOX` | `1600`, `false` | the browser is restarted above this RAM; Chromium without its sandbox (in the container) |
| `STREAM_CHROMIUM`, `STREAM_FFMPEG`, `STREAM_FONT` | (found) | Playwright's headless shell or a system Chromium; ffmpeg; a TTF for the caption |
| `STREAM_SOURCE` | `viewer` | `viewer` (prismarine-viewer in Chromium) or `client` (the real-client camera; the camera image sets it) |
| `CAMERA_AUTH`, `CAMERA_AUTH_DIR`, `CAMERA_NAME` | `msa`, (none), (none) | the camera account: `msa` (the login in the auth folder) or `offline` (tests on our own server only, as `CAMERA_NAME`, default MuseCam) |
| `CAMERA_GL`, `CAMERA_GL_THREADS`, `CAMERA_JAVA_THREADS` | `cpu`, `8`, `4` | Mesa llvmpipe or `gpu` (VirtualGL); llvmpipe's threads; the threads the JVM sees |
| `CAMERA_RENDER_DISTANCE`, `CAMERA_MAX_FPS`, `CAMERA_GRAPHICS`, `CAMERA_SCALE` | `8`, `30`, `fancy`, `1` | the client's video settings; it draws at 1280x720 times the scale and ffmpeg scales up |
| `CAMERA_IDLE_MS`, `CAMERA_NICE`, `CAMERA_HEAP_MB` | `600000`, `5`, `2048` | quit the client after this long without a game (0: never); its niceness; its heap |
| `CAMERA_MC_DIR`, `CAMERA_HOME`, `CAMERA_DISPLAY` | `/opt/mc`, tmp, `99` | the installed client; the game folders; the first X display (one per camera) |

## How the brain plays

- Each step is one model call that may run one skill; the result goes back as a `tool` message with its
  `tool_call_id`. The system prompt and tools never change, the goal message is fixed for a run, and the state,
  known places, older-step summaries and hints go in the last message, so every request starts with the previous one
  and the provider's prefix cache keeps hitting.
- A free-text goal ends when the model calls `say` with text starting `Done:` (the system prompt asks for that); an
  `/ask` request also ends when the model answers in words, or after 40 steps. A failed model call or an invalid call
  is not an answer: the brain backs off (or the model sees the correction) and goes on. One request may spend at most
  a fifth of `COST_CAP_HOUR`.
- Guards: `STEP_CAP`, `COST_CAP_RUN` and the shared `COST_CAP_HOUR` meter stop before a call that would likely cross
  them; `ERROR_CAP` errors in a row end the run. Calls that were stopped, timed out or broke off mid-stream count
  their estimated cost too; a reply without a usage block is billed with a reasoning allowance per effort. The loop
  guard adds a hint when the same call fails `LOOP_REPEAT` times or succeeds that often without changing anything (a
  second trip on that call ends the run), and a lesson in the notes, but only for a validated call whose arguments
  are fixed names and numbers: never `say` text, never an invalid call.
- A tool call whose arguments do not parse is replayed in later requests with `{}` as its arguments.
- Request shapes the server refuses once are adapted for the rest of the process and logged as `request_adapted`
  (`change`: `stream` = plain JSON, `tool_schema` = basic schemas, `merge_user_turns` = goal and state as one user
  message when the server wants turns to alternate). Each costs one unbilled HTTP 400, once. Nothing else is retried
  on a 400.
- Iron is underground: the system prompt, `go_to`'s description and a failed `collect` of an ore all say to `go_to`
  a spot about 10 blocks lower (pathfinder digs its way down) and collect again. There is no separate explore skill.
- The log: one `decision` row per model call (tokens, cached tokens, TTFT, latency, tool, arguments, result,
  inventory change, $) plus `event` rows: `run_start`, `run_end`, `milestone`, `loop_guard` (`call`, `trigger`),
  `learned` (`block`, `pos`), `stop`, `model_error`, `usage_missing`, `request_adapted` (`change`, `detail`), the
  web's `session_*`, `viewer_action` and `viewer_stop` (what the guest did: "viewer" is the person or agent driving
  the bot; `viewer_stop` has the `reason`: the /play button, the API or MCP), `view_close` (a live 3D view closed:
  `view`, `why`, seconds `s`, `mb` sent), `ask_*`, `admin_stop`.

## What is mocked

- The model: `test/mock-llm.js` speaks Chat Completions and the Responses API (streamed and not), replays scripted tool
  calls with usage (cached and reasoning tokens, a simple prefix-cache model keyed by `prompt_cache_key`), and answers
  HTTP 400 to what Meta rejects (`stop`, `n` > 1, `logprobs`, `logit_bias`, `tool_choice` other than `auto`, effort
  `none`). Real latency, real token counts and real caching are only measured by the probe with `--live`.
- The game: `test/fake-bot.js` fakes the mineflayer surface (blocks, inventory, real recipes and drops from
  minecraft-data 1.21.4, furnaces, pathfinder, combat). No physics, no mob AI, instant movement unless timings are
  set; drops go straight into the inventory. No Minecraft server, Java or client is used anywhere in the tests.
- The skills mine with pathfinder and `dig`, then walk over the drops for at most 5 s (collectblock's own collect is
  not used: its pickup can wait forever). Every walk clears the pathfinder goal when it ends, so a walk that settles
  short never carries on into the next skill; a walk also ends when pathfinder keeps resetting a path it cannot follow
  ("stuck"), the bot stands still for `stillMs`, or it gets less than `progressGain` (3) blocks closer in `progressMs`
  (22 s), digging and building included (src/walk-watch.js; all legs of one go_to share that watch). The result then
  says what held it up (digging stone by hand, pillaring, no way through), how far underground the bot is and what to
  try. go_to digs a staircase down only where the target lies below the ground at its own spot; a stop or timeout
  closes any open crafting or furnace window.
- `test/fake-bot.js` with `clickServer: {lagMs, deaf, noOpen}` adds a protocol client and the server's side of windows
  (vanilla click rules, results from the real recipes, a stale-state resync after every click), so crafting goes
  through the same window clicks as on a real server (`test/craft.test.js`).

## Not tested yet

- Real server (Paper 1.21.4, 2026-10-06): the body without a model, driven by scripts. Crafting by clicks (2x2 and
  at a table, placed or found, birch / spruce / dark oak / oak), many batches at once, collect (logs, stone, coal and
  iron ore), smelt (coal and planks), go_to (surface trips, spiral descents), a hit by a zombie interrupting a skill,
  and the full route from an empty inventory at a fresh spot to an iron pickaxe with skills only (no console items):
  195, 202 and 223 s at three spots, 13 calls each, none failed. In other runs (normal difficulty) the scripted
  player, which always fights back with wooden tools, was killed by zombies or skeletons at night, under dark oak
  shade and in a cave: the body stopped the skill and said who attacked; fleeing or hiding is the player's choice.
  Not yet: `run-goal --mock-llm` on the real server, `build`, long sessions.
  2026-10-07, go_to on hilly forest ground (seed 71811045): 33 walks of 25-186 blocks up and down hill arrived (2 more
  were stopped by mobs; one started in a cave failed after 22 s, where the old code wandered for 120 s and failed too);
  the longest span without 3 blocks of progress in a walk that arrived was 8 s (12 s with the old code on the same
  routes), well under the 22 s watch. The trap a guest hit (the bottom of a 9-deep shaft, 4 dirt, no pickaxe: two
  120 s timeouts before) now ends in 22.5 s saying it was digging stone by hand, that the bot is 9 blocks underground
  and what to do. Live views in headless Chrome: crack stages 0-9 on logs, dirt
  and leaves; the drawn camera turns at most 360 degrees a second where the bot's look jumps up to 200 in a frame.
- Nothing has run against Meta's API: the request shape is checked against the documented rejections. Run
  `npm run probe -- --live --shape brain` before anything else: the brain-shaped calls (two user messages in a row, a
  replayed tool call and its result, `previous_response_id` with `--api responses`). Unknown until then: strict
  tool schemas with `minimum`/`maximum`/`pattern`/`minLength`, `stream_options`, `max_completion_tokens` 8192 and two
  user messages in a row. Each has an automatic fallback (above); the CSV's `adapted` column and the printed lines
  say which one fired. If `stream` fired, TTFT equals the whole call: say so next to any latency number.
- Caves, lava, water, night mobs and fall damage never happen in the fake bot (its `hurt(amount, source)` reports a
  hit the way the server does). On the real server a hit from a hostile mob stops the running skill (not attack or
  eat) with "a zombie is attacking you ...; fight back with attack zombie, or go_to somewhere safe": the server names
  who dealt each hit (damage_event, checked on Paper 1.21.4), so a skeleton up to 24 blocks away counts and a fall,
  drowning or hunger next to a mob does not. For 10 s after that the same mob's hits stop nothing (time to flee or
  fight) unless health drops to 6. After a death the next skill waits for the respawn. Lava is only avoided as far as
  pathfinder's own digging rules go.
- The guests' live views run the real prismarine-viewer in tests only for the read-only check (a click from the page
  reaches nothing); the house bot's watch page is tested with a stand-in module.
- Real-client camera: run on picasso against its own test Paper server, through the camera service and the agent,
  to MP4 files, and with an unauthenticated client (`CAMERA_AUTH=offline`) until the account was signed in. Not yet:
  RTMPS to Facebook, a long stream, a guest bot dying mid-game (the re-attach is tested with stand-ins only), more than
  one camera at once.
- Live video: run on this Mac against the local Paper server only, in-process and through the stream service, to MP4
  files. Not yet: any RTMP(S) ingest (no stream key exists; Facebook's acceptance of the exact stream, its latency and
  the video plugin inside the muse.ai panel are open), the stream container (no Docker here: `deploy/Dockerfile.stream`
  and the compose service are unbuilt), SwiftShader's speed on picasso's EPYC cores, and long streams (the longest run
  was 4 min).

## Safety rules

- No code execution from model or viewer text: skills are a fixed whitelist and every argument is checked against its
  schema before it reaches the game. `say` cannot start with `/` or a space and cannot contain `§` (the server kicks
  for it).
- Viewer text never reaches long-term memory: the Ask brain has its own notes file and lessons hold only tool names,
  fixed block and item names and numbers. Viewer text goes to the Standard tier unless the operator opts in.
- Minecraft stays on localhost/LAN (any other `MC_HOST` is refused); only the web port is meant to be exposed.
- $ caps per run and per hour, a step cap, a stop button per session and an operator kill switch; every decision is
  logged with its cost.
- The key lives only in the environment and is only sent to `MODEL_BASE_URL`; logs scrub anything shaped like a key.
- Skill logic adapted from Mindcraft (MIT) is credited where it is used. Nothing is taken from rmalde/minecraft-agent
  (no license).
