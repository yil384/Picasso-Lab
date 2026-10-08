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
                                  | per-session token, quotas, $ cap, kill switch, operator-only log
                    mc-body (Node, mineflayer 4.39.0): 10 bounded skills + text state
                                  |
                    Paper 1.21.4, online-mode=false, localhost/LAN only (on picasso: whitelisted bots only)
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
| `src/body.js`, `src/skills/`, `src/state.js` | the mineflayer body, the 10 skills (plus `craft_batch` for MCP: `src/skills/craft-batch.js`) and the plain-text state (the block scan cached per bot) |
| `src/reflexes.js` | what the body does on its own, with no model turn: fight back a mob that hits the bot (run below 8 health, or from a creeper close by), eat at food 14 or less; the body interrupts the skill for it, runs the skill on afterwards and reports it in the next result |
| `src/stations.js`, `src/skills/station.js` | crafting tables and furnaces stay where a bot put them and belong to it: reused within 24 blocks, never used or mined by another bot, at most 4 per bot (never retiring a furnace still smelting or one the running skill uses), removed (server console) when its game ends |
| `src/skills/tunnel.js` | collecting stone without walking about: what is in reach and in view first, then a 1x2 passage dug one block into the stone, only into blocks the chunk data shows are safe |
| `scripts/bench-body.mjs` | the body's speed on a real server with no model: one bot per run at a fixed spot (console), the iron route from an empty inventory or a list of calls; every call's time, result and phases (path, dig, pickup, sync, reflex...), and every block broken (the game's dig time, how long it took), as JSONL |
| `src/walk-watch.js` | is a walk still getting closer? Ends one that is not (digging by hand, pillaring, going in circles) with what held it up, where the bot is and what to try |
| `src/skills/window.js` | window clicks the server confirms: crafting (and the inventory checks around every skill) never trust mineflayer's optimistic window picture |
| `src/brain.js`, `src/memory.js` | the tool loop, its guards, short-term memory and `notes.json` |
| `src/web.js` | `/`, `/play`, `/api`, `openapi.json`, `/ask`, `/log` (operator), `/admin/stop`, the live-view proxy, the queue for a bot, the trusted-proxy check |
| `src/mcp.js`, `src/mcp-queue.js`, `src/plan.js` | `/mcp`: start_game, play, play_sequence, get_state, stop, end_game, live_view and their replies (text plus `structuredContent`); resume handles; the MCP client's protocol version and name in the log; the per-game step queue with idempotent calls; the dry-run check that simulates the inventory through a call's steps before it runs (section "MCP calls") |
| `src/live-view-fx.js` | runs in the live-view pages: eased first-person camera, crack overlay on the block being broken |
| `src/stream.js`, `src/stream-page.js` | live video of a guest game (off unless `STREAM_ENABLED`): headless Chromium on the bot's first-person view, a smoothed camera, ffmpeg to RTMPS (Facebook Live) or an MP4; the stream service and its client for the container (section "Live video") |
| `src/camera.js` | the real-client camera (`STREAM_SOURCE=client`): Xvfb + the vanilla Minecraft client as a spectator in the bot's head, ffmpeg x11grab, the same stream interface (section "Real-client camera") |
| `scripts/stream.mjs` | one stream on demand (to a file or an RTMP(S) URL, with its CPU, RAM and frame numbers), a side-by-side camera comparison, `--camera` (one real-client stream of a player), or `--serve` (the stream or camera container) |
| `scripts/camera-login.mjs` | signs the camera's Microsoft account in once (device code, no password) and keeps its tokens in the auth folder; `--check` |
| `deploy/Dockerfile.camera`, `deploy/camera/` | the camera image: Java 21, the 1.21.4 client (`install-client.mjs`, SHA-1 checked, no sounds), `CameraMain.java` (the token from the environment, never the command line), Xvfb, Mesa, VirtualGL, ffmpeg |
| `deploy/camera-test.compose.yaml` | a separate test project on picasso (`muse-camera-test`: own Paper, agent, camera, network; shares nothing with production) |
| `deploy/push.sh`, `deploy/staging.compose.yaml` | deploys to picasso: staging first (play-staging.picasso-lab.com), production with `--prod` only after the staging checks pass (section "Staging and deploys") |
| `scripts/staging-check.mjs` | the staging checks: the page, `openapi.json`, `/mcp`, a scripted game to a wooden pickaxe (strict, no model) |
| `scripts/probe.mjs` | latency and $ per call: effort x cache on/off x Chat/Responses, CSV per call |
| `scripts/run-goal.mjs` | one goal from the command line (real server, or the mock and the fake bot), JSONL log, HUD table |
| `scripts/hud-data.mjs` | the video HUD numbers from one or more run logs (milestones, totals, failures, timeline) |
| `scripts/a11y_snapshot.py` | the accessibility tree of a `/play` page, as an agent browser sees it; `--check` asserts it (Python Playwright 1.49+) |
| `scripts/a11y-chrome.mjs` | the same tree and check through a Chrome that is already installed (DevTools protocol, JavaScript off); no Playwright |
| `test/e2e/mcp-iron.mjs`, `test/e2e/two-starts.mjs` | the scripted MCP runs against a running agent, no model (section "Scripted runs over MCP") |
| `deploy/slim-modules.mjs` | run in the agent image after `npm ci`: keeps the game data of one Minecraft version only |
| `src/mineai/host.js` | `BODY=mineai`: one Mine AI MCP host per guest game (their runtime from `MINEAI_DIR`), on a loopback port of a private range with a token of its own, watched by heartbeat, restarted once after a crash, killed with its game (section "The Mine AI MCP body") |
| `src/mineai/body.js` | a Body (`src/contracts.js`) driving that host as an MCP client: our skills onto their actions, their status as our state, stop and time limits through their cancel |
| `src/mineai/skills.js` | the mapping (our 10 skills and `craft_batch` onto their tools, their results and codes back) and the extra skills MCP offers with this body (`equip`, `hunt`, `sleep`, `bucket`, `chest`, `explore`, `policy`, `pick_up`, `drop`) |
| `src/mineai/preload.mjs` | loaded into their host's processes: ends the host with the agent, serves `/eyes` and `/watch` from inside the bot's process |
| `mineai/` | `UPSTREAM.json` (their repository, the pinned commit and our patches in order), `patches/` (ours: crafting on Paper and its tests, the watchdog window, the host token), `fetch-and-patch.sh` (the build), `LICENSE-mine-ai-mcp` (their MIT notice), `bench/` (crafting and window flows on their tools; `gateway-iron.mjs`: the iron route through our `/mcp` with resources), `README.md` (the pins, the Paper fix and its numbers); their code is never in this repo |
| `scripts/mineai-fetch.mjs` | the same fetch in Node (also updates a folder in place); `--check` says whether a folder is exactly the pin plus our patches |
| `test/fake-mineai.js`, `test/fake-mineai-host.mjs` | a stand-in Mine AI host (MCP tools, `/health`, the token, a tiny world) in-process and as a process |
| `test/mock-llm.js` | local mock of the chat (and Responses) endpoint, also `npm run mock` |
| `test/fake-bot.js` | in-memory fake of the mineflayer bot surface the body uses (also `--fake-bot`) |
| `test/real-mcp.test.js` | the MCP calls on a real Paper server (skipped unless `MC_REAL=1` and `MC_CONSOLE`): `MC_REAL=1 MC_CONSOLE=server/console.in node --test test/real-mcp.test.js` |

Node 22 or newer (mineflayer 4.39, minecraft-protocol and openai 7 require it). Every command below runs in this
folder.

## Tests (no key, no Minecraft)

```sh
npm install
npm test          # node --test test/ : every *.test.js (about 15 s), the e2e harness on the fake world included
npm run test:stream   # the streamer's tests with its end-to-end run: a real headless Chromium and ffmpeg (about 15 s)
```

Tests never reach a real API: `createLLM` refuses any non-local URL while running under `node --test`, and the API
key is only ever sent to the configured `MODEL_BASE_URL`. The accessibility check runs through the installed Chrome
(`CHROME_PATH`, or the usual install places; skipped without one) and again through Python Playwright when a
`python3` with Playwright 1.49+ is found (`A11Y_PYTHON`, `python3`, `/usr/bin/python3`; skipped otherwise, with the
reason).

## Scripted runs over MCP (no model)

The harness that measures the route drives a running agent's `/mcp` the way a connector does, with no model: the iron
pickaxe from an empty inventory (logs, planks, sticks, table, wooden pickaxe, stone, stone pickaxe, furnace, iron ore
with a step 14 blocks down while none is found, coal if needed, smelt, iron pickaxe), and several clients starting at
once.

```sh
node test/e2e/mcp-iron.mjs http://127.0.0.1:8787 --out run.json   # strict: one line per step, RESULT line, exit 0 only with the pickaxe and no failed step
node test/e2e/mcp-iron.mjs http://127.0.0.1:8787 --lenient         # the old harness: each step up to 4 times, fights back when attacked
node test/e2e/two-starts.mjs http://127.0.0.1:8787 --n 2            # every bot of n simultaneous starts must join
```

Strict mode is what measurements use (ROADMAP, testing rules): every step is sent once, the harness never fights a mob
on its own, and every failed step counts. Waiting is not retrying: a step still running is waited for with get_state,
and a full server's queue is asked again as it says. `--out` has every step with its time; the agent's log has each
step's phases (`viewer_action.phases`). `npm test` runs both against the agent on the fake world (`test/e2e.test.js`).
On the real server, give the test bots names of their own: `MC_USERNAME=Tst_<who>` (guests become `Tst_<who>_<game>`).

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
| `GET /` | what this is, "NOT AN OFFICIAL MINECRAFT SERVICE", 18+ and why, "Get a bot" form, a ready-to-paste agent prompt, the "Ask our Muse" form, the privacy notice (what the log keeps, who reads it, no cookies, addresses in memory only) |
| `POST /session`, `GET /play/<token>` | start a guest session; the zero-JS control page (state, one form per skill, stop, end, plain links to the live views) |
| `POST /api/session` `{"adult":true}` | the same session as JSON; then `GET /api/<token>/state`, `POST /api/<token>/<skill>`, `POST /api/<token>/stop`, `DELETE /api/<token>`. All bots in use: 503 with `queue: {position, waiting, etaSeconds, holdSeconds}` |
| `GET /openapi.json` | OpenAPI 3.1, one operation per skill (operationId = skill name), for a custom connector |
| `GET/POST /ask` | the queue for our own brain: 18+, `WEB_ASK_MAX_CHARS`, one waiting or running request and `WEB_ASK_PER_HOUR` per address, closed while the hourly $ cap is spent |
| `GET /log?n=50` | the operator's JSONL tail, `Authorization: Bearer $WEB_ADMIN_TOKEN` (404 without one configured; wrong tokens count toward the lock-out); session tokens and the admin token scrubbed, no IP addresses |
| `POST /admin/stop` | kill switch, `Authorization: Bearer $WEB_ADMIN_TOKEN`; stops every skill and clears the queue, `{"end":true}` also ends every session; 5 wrong tokens lock an address out for the hour |
| `/mcp` | MCP (streamable HTTP) for a connector such as Muse: `start_game {adult: true}`, `play`, `play_sequence`, `get_state`, `stop`, `end_game`, `live_view {format}` (src/mcp.js) |
| `GET /watch/<view id>/`, `GET /eyes/<view id>/` | a guest bot's live 3D views under the game's view id (128 random bits, not the game id; never logged), prismarine-viewer, read-only: clicks from the page are ignored; with src/live-view-fx.js added (`muse-fx.js`): eased first-person turns (the bot is not slowed: the picture turns, at most 360 degrees a second), the game's crack textures on the block being broken (`muse-fx/events`, server-sent), no magenta boxes for dropped items. A view of a game that ended answers 410; an address that asks for 60 different views that never existed in an hour gets 429 for unknown views until the hour rolls on (the same unknown id again, a tab still reconnecting to a view from before an agent restart, counts once; the views of live games are always served) |

MCP: one game per MCP session (connector users share the agent's egress addresses); per address at most
`WEB_MCP_GAMES_PER_ADDRESS` live MCP games (default `max(2, WEB_MAX_SESSIONS / 2)`; set it from probe T8, up to
`WEB_MAX_SESSIONS` if Muse users share a few addresses) and 60 MCP game starts an hour, no cooldown. When every bot is in
use, start_game (and the web page and API) answers with the caller's place in a first-come queue, how many wait, and an
estimate (when enough leases end; games often end sooner); asking again within 90 s keeps the place, and a bot that
frees up goes to the first in line. Every reply comes within 45 s with the result and the state (with the time left);
steps still running or queued then go on, and a later reply (get_state waits for them) reports their results once the
client has received them (section "MCP calls"). start_game returns a resume handle (22 characters, 128 random bits,
never the control token) that resumes the game, with its queue, from a new MCP session while the game lives; the game
then counts for that session. Replies and the server
instructions carry no links and never tell the agent to open, show or watch anything. `live_view` (read-only) returns
data only: `{format: "link"}` (the default) gives `first_person_url` and `behind_url`; `{format: "embed"}` gives, while
a live video of the game is being broadcast and `STREAM_VIDEO_URL` names it, `live: true`, `embed_url` (Facebook's video
player, the one player the muse.ai panel frames) and `video_url`, otherwise `live: false`. Each MCP session logs one
`mcp_client` row: the protocol version the client asked for, the one agreed, and the name and version it reports. MCP
sessions: 64 KB per request, 20 per address and 200 in all (the one called longest ago without a game makes room),
1200 new ones per address an hour, dropped after 10 minutes without a game; a game ends after 5 minutes without calls.
Live views: per address 4 open WebSockets, 32 requests in flight and 120 new views an hour, 12 WebSockets per bot; a
WebSocket idle for 90 s, or whose reader lets 8 MB pile up, is dropped.

Other players' chat never reaches a guest: not the session's lines, `/play`, the API or MCP replies (strangers' text is
abuse and prompt injection, and the guest did not ask for it). On `/ask` a request's text is shown only to the address
that sent it.

Each address (IPv6: each /64) holds one guest bot at a time and waits a minute after its session ends. POSTs that
another website makes a browser send (`Sec-Fetch-Site: cross-site` or `same-site`, or a foreign `Origin`) get 403;
server-side agents send neither header and are not affected. `/play` never reloads while the bot waits for the next
action (an agent filling a form would lose it); while the bot joins or a skill runs it reloads every 5 or 15 s, and
"Check again" reloads it by hand.

### MCP calls

`play` (one step) and `play_sequence` (up to 32) go through these stages (ROADMAP M2):

1. Every step's skill and arguments are validated; one bad step refuses the whole call (`BAD_ARGS`), nothing runs.
   That holds for what the SDK's schema check catches first too (an unknown skill, more than 32 steps, `args` that is
   not an object, a `request_id` over 64 characters): the same `BAD_ARGS` reply with `structuredContent` and the state.
2. A repeat of an accepted call returns that call's steps and runs nothing: the same `request_id` (kept for the game's
   life, the newest 256), or without one the same call with the same arguments while its steps run or wait and until
   a reply carrying all their results has reached the client (at most until 60 s after its last step ended). Once
   the client has its results, the same call again is a deliberate repeat (a retry after a failure, the same collect
   after a go_to) and runs. A repeat's `code` is the first call's outcome (`HOSTILE_CONTACT`, `DIED`, ...) when one of
   its steps failed, else `DUPLICATE`; `structuredContent.duplicate` marks it either way. The same `request_id` for a
   different call is refused (`BAD_ARGS`: nothing of it ran). `stop` forgets the calls without a `request_id`, so a
   deliberate repeat after a stop runs.
3. The dry-run check (`src/plan.js`) simulates the inventory through the steps, after the steps already queued (taken
   to work in full): the craft variants of minecraft-data 1.21.4, the smelt skill as the body runs it (24-item cap,
   up to 3 furnaces with extra ones made from spare cobblestone, each with its own fuel), collect's drops and harvest
   tools, place and build materials. A table or furnace a step puts down stays where it is (it leaves the inventory),
   and what the bot's furnaces are still making counts as carried (a craft that needs it waits for it). When something
   is missing the call is refused with a list per step (`NEED_ITEMS`, `structuredContent.missing`); planks (from logs,
   one cut per wood), sticks, a crafting table (none carried, and none of the bot's own or nobody's within 24 blocks)
   and a furnace that can be made are added as craft steps instead, or into a `craft_batch`'s list. `dry_run: true`
   only returns the plan. If the check itself fails, the call is not refused. It follows `go_to` steps from where the
   bot stands: a table left more than 16 blocks (or 4 up or down) behind is replaced by a new one from 4 spare planks
   or a log, as the body does (counted); when there is no wood to spare and the old table is past 24 blocks, or a craft
   needs furnace output left more than 28 blocks behind, or a smelt has no furnace left within 24, the call is not
   refused (where the bot ends up is only roughly known; `collect` walks are not followed) but the reply says so
   (`structuredContent.warnings`, "The check warns ...").
4. The steps go into the game's queue (`src/mcp-queue.js`, at most 64 waiting, else `QUEUE_FULL`) and run one after
   another past the reply. Each step is `pending` (waiting or running), `confirmed`, `failed` or `cancelled`; a failed
   step cancels everything queued after it, in every call; `stop` stops the running step and clears the queue.
5. The reply (within 45 s, the state text included: a call waits for its steps until 2 s before that) has the text as
   before plus `structuredContent`: `code` (null, or `NEED_ITEMS`,
   `HOSTILE_CONTACT`, `RETREATED_LOW_HEALTH`, `INVENTORY_FULL`, `DIED`, `NOT_STARTED`, `DUPLICATE`, `BAD_ARGS`,
   `QUEUE_FULL`, `TIMED_OUT`, `STOPPED`, `FAILED`; for a call whose steps were all cancelled, what cancelled them: the
   failed step's code, or `STOPPED`), `steps`, `earlier` (steps that finished since the last delivered
   reply), `queue`, `changed` (the inventory change) and a short `state` (health, food, position, inventory, seconds
   left; no scan of the blocks around). `get_state {full: true}` adds the whole state as `full`. A step's code comes
   from its result text (`codeOf` in src/contracts.js): the body's "retreated: ..." is `RETREATED_LOW_HEALTH`, and
   "stopped: a zombie hit you ..." or "stopped: mobs kept attacking ..." (a fight it could not go on from) is
   `HOSTILE_CONTACT`. A reply counts as delivered only once its HTTP response was written out in full: one whose
   connection dropped, that a proxy gave up on, or that the client cancelled, delivers nothing, so its results come
   again in the next reply (and a re-send of the call is a repeat).

`craft_batch {items: [{item, n}, ...]}` (MCP only; the brain's tools and the web page keep the 10 skills) crafts a
list in order at one crafting table: the bot's own nearby, or the carried one put down once; the table stays (as
after any craft, section "The body on its own"). After a reflex it goes on from the item it was at. Measured before
the tables stayed (2026-10-07, local Paper, prepared: items from the console, the Mac loaded by other servers): a
wooden pickaxe, axe and stone pickaxe from 4 logs and 3 cobblestone took 7.5 and 6.9 s of skill time as one
craft_batch (one table) and 16.5 and 16.7 s as the same 8 crafts in a play_sequence (the table placed and picked up 3
times; with tables that stay, separate crafts place it once too). Two runs (`test/real-mcp.test.js`): a plumbing
check, not a benchmark. The check itself costs under 3 ms, plus about 30 ms for
each station lookup it needs (the body's `stationNear`, within 24 blocks); the state text of every reply costs about
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
   does. Left `off`, every visitor through the tunnel shares one address for the limits. Behind a proxy that is not on
   this machine (Caddy on picasso), also give the proxy a secret to send (`WEB_PROXY_SECRET`, section "Deploy on
   picasso"): forwarded headers then count only on requests that carry it, and any other request from a peer that is
   not loopback gets 403 (logged once an hour per peer as `proxy_refused`). `WEB_TRUSTED_PROXIES` (the proxy's
   address) does the same where the agent really sees the proxy's address, which a published Docker port hides.
6. Watch page (optional): `npm install prismarine-viewer`, then `npm start` serves the house bot's view on
   `http://WEB_HOST:MC_VIEWER_PORT/` (bound to `WEB_HOST`, like the page). `MC_VIEWER_PORT=0` turns it off.
7. After a world reset, delete `notes.json` and `notes-ask.json` (or their `places`): the known crafting tables and
   furnaces belong to the old world. Lessons may stay.

## Staging and deploys

Every change runs on staging on picasso before production (ROADMAP M0 item 9). Staging is production's stack under
its own name and shares nothing with it: compose project `muse-staging` (`deploy/staging.compose.yaml`), code in
`~/workspace/muse-staging/app`, its own Paper 1.21.4 and world (seed 71811045) in `~/workspace/muse-staging/data`,
logs in `~/workspace/muse-staging/logs`, network 10.77.79.0/28, the agent on 172.24.0.1:7851, served at
https://play-staging.picasso-lab.com (its own block in the FRAS Caddyfile, next to `play.`, with `X-Robots-Tag:
noindex`). It runs no streamer or camera (production runs neither today). Its `deploy/.env` holds its own admin token;
push.sh writes one the first time and never copies or overwrites it.

```sh
deploy/push.sh                     # staging, then the staging checks; production is not touched
deploy/push.sh --prod              # the same, then production exactly as before, only if every check passed
deploy/push.sh --check             # the staging checks alone, against what staging runs now
deploy/push.sh --prod --dry-run    # print what would run, run nothing
node scripts/staging-check.mjs [url] [--no-game]   # the checks by hand (default: the staging URL)
```

The checks (`scripts/staging-check.mjs`): the page answers; `openapi.json` names the host it was asked on (so
`WEB_PUBLIC_URL` is staging's, not production's); `/mcp` initializes and lists the game tools; and a scripted game
with no model goes from an empty inventory to a wooden pickaxe with one `play_sequence` (3 logs of the nearest wood,
12 planks, 4 sticks, a table, the pickaxe, with a `request_id`), whose steps run on in the game's queue while
`get_state` waits for them (`structuredContent`). The game is strict: no step is retried, and a failed or cancelled
step fails the check (the body still fights back on its own; a mob it cannot deal with fails the step). It always ends the game, so its bot leaves the server. While a new agent or Paper starts, the checks
wait (up to 2 minutes for the page, and `start_game` again every 5 s). They refuse play.picasso-lab.com. `--prod`
goes on only when they pass and the files to deploy did not change while they ran (a hash taken before staging).

Measured on picasso (2026-10-07, n = 2, natural: a fresh world and no console commands; Easy, locked daylight): the
first push built staging and started a fresh world (Paper ready 14 s after its start; `start_game` refused for 11 s,
then worked) and passed in 85 s, the wooden pickaxe 60.6 s after the first action (the collect walk outlived its 45 s
call); a second `--check` passed in 37 s, the pickaxe in 34.1 s. (Both before the queued MCP calls of M2 and the
day-0 fixes were merged; the check now sends the route as one call.) On picasso every connection to the published
ports arrives from the Docker bridge gateway (docker-proxy), Caddy's and any local user's alike (checked read-only
with `ss`, 2026-10-07), so the address cannot single out Caddy: use `WEB_PROXY_SECRET` (section "Deploy on picasso").
The first push from the Mac also uploads the 51 MB
paper.jar (a few minutes); later pushes skip it.

`test/deploy.test.js` keeps this honest without picasso: `staging.compose.yaml` must keep production's Paper and
agent settings (only `MC_HOST` and `WEB_PUBLIC_URL` differ) and every service production always runs; and push.sh,
run with stand-ins for ssh, rsync and node, must reach production only with `--prod` and only after a passing check,
with production's commands as before staging existed (plus, after the build, the prune of our own dangling images and
the note while `WEB_PROXY_SECRET` is unset, ROADMAP M0 items 8 and 6; staging prunes the same way).

Caddy: the block was added to `~/workspace/FRAS/caddy-config/Caddyfile` after a backup
(`Caddyfile.bak-20261007-222723`), validated as a separate file inside the container, moved into place, then
`docker exec fras-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile`.

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
`deploy/push.sh --prod` builds and starts the stream container whenever `deploy/stream.env` exists. For more streams at once:
one URL per stream in `STREAM_RTMP_URL`, `STREAM_MAX` in compose.yaml, and the caps raised (about 6 CPUs and 1.5 GB per
stream). In the muse.ai panel: `https://www.facebook.com/plugins/video.php?href=<the live video's URL>&show_text=false`.
Put the live video's public URL (one per `STREAM_RTMP_URL`, same order) in the agent's `STREAM_VIDEO_URL`, and MCP's
`live_view {format: "embed"}` returns that embed URL while the game's stream runs. Whether a persistent stream key keeps
one URL across broadcasts, and which URL the plugin takes for a page's current live video, is UNVERIFIED.

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
`STREAM_SERVICE_URL=http://127.0.0.1:7862`; then `deploy/push.sh --prod` builds and starts the `camera` profile. The same
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

## Deploy on picasso

`deploy/push.sh` copies the code and runs `docker compose up -d --build` in `~/workspace/muse-minecraft/app/deploy`
(games in progress end when the agent restarts).

- The agent image keeps the game data of one version (`MC_VERSION` build argument, 1.21.4): `deploy/slim-modules.mjs`
  runs in the same layer as `npm ci` and removes every other version from minecraft-data (all of bedrock, every
  `pc/<version>` that 1.21.4's `dataPaths.json` does not name) and from prismarine-viewer's textures and block states.
  node_modules: 946 MB -> 271 MB on disk (measured here; `npm test` and a live run with real bots and the live views
  passed on the slimmed copy, 2026-10-07). `openai` stays: src/llm.js (the Ask brain) and scripts/probe.mjs use it.
- Every Dockerfile here labels its image `org.picasso-lab.app=muse-minecraft`, and push.sh ends with
  `docker image prune -f --filter label=org.picasso-lab.app=muse-minecraft`: only our dangling images (the ones a
  rebuild replaced), never another user's, never one a container uses. Images built before the label carry none and
  stay until removed by hand: list them with `docker images -f dangling=true`, check each is ours with
  `docker image inspect <id>`, then `docker rmi <id>`.
- `deploy/.env` on picasso (made by push.sh with `WEB_ADMIN_TOKEN`) should also hold `WEB_PROXY_SECRET` (ROADMAP M0
  item 6): a secret Caddy adds to every request it forwards, so the agent can tell Caddy's requests from anyone
  else's. The peer address cannot: the published ports go through docker-proxy, so Caddy, other containers and every
  user on picasso all reach the agent from the bridge gateway (10.77.77.1; staging 10.77.79.1), and setting
  `WEB_TRUSTED_PROXIES` to Caddy's address would refuse every visitor with 403 while the gateway's address would let
  any local user pick their own address for the limits. Make one (`openssl rand -hex 24`), keep it in
  `caddy-config/priv` and in the stack's `deploy/.env`, and add it to the site's block in the Caddyfile, in the same
  change (one without the other refuses every visitor with 403; push.sh prints a note while `.env` has none):
  ```
  play.picasso-lab.com {
      reverse_proxy 172.24.0.1:7850 {
          header_up X-Muse-Proxy <the secret>
      }
  }
  ```
  The agent compares it in constant time, never logs it, and strips it before a request goes on to the live views.
  Staging the same way (its own secret, port 7851). Set `WEB_MCP_GAMES_PER_ADDRESS` there once probe T8 has measured how many Muse users share an address.

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
| `MC_WHITELIST` | `false` | the server lets in only listed players (the Paper container on picasso: `white-list`, `enforce-whitelist` and `hide-online-players` on): each guest bot gets a name nobody can guess (`MC_USERNAME`, at most 8 characters of it, and random letters and digits up to 16: `Muse_` and 11; not the game id; the log's `bot_name` row maps it to the game) and goes on the list through `MC_CONSOLE` just before it joins, off when it leaves; the house bot `MC_USERNAME` stays on it while the Ask queue is open, and the real-client camera lists itself |
| `MC_CONSOLE`, `SPREAD_RANGE` | (none), `400` | the server console FIFO (`server/start.sh` and the Paper container make one): a new guest bot is spread to a fresh spot up to `SPREAD_RANGE` blocks from spawn, the real-client camera is put in place, and a bot's crafting tables and furnaces are removed when its game ends (without it they stay in the world) |
| `SPREAD_SPOTS` | (none) | for measurements: `"x z; x z; ..."`, the spots new guest bots land at in turn (within a block, on the top block; a spot in water cannot be spread to), instead of the random spread, so both bodies can be run at the same fresh spots |
| `WEB_HOST`, `WEB_PORT`, `WEB_PUBLIC_URL` | `127.0.0.1`, `8787`, (none) | the viewer page; the public URL goes into links and `openapi.json` (unset: the forwarded host behind a trusted proxy, else the listen address) |
| `WEB_TRUST_PROXY` | `off` | where the client address for the limits comes from: `off` (the socket), `cloudflare` (`CF-Connecting-IP`), or 1-5 proxies appending to `X-Forwarded-For` |
| `WEB_PROXY_SECRET` | (none) | a secret of at least 24 characters the proxy sends in `X-Muse-Proxy` (Caddy: `header_up`; needs `WEB_TRUST_PROXY`): forwarded headers count only on requests that carry it, and any other non-loopback request is refused. Use it on picasso, where every peer is the Docker gateway. Never logged or printed |
| `WEB_TRUSTED_PROXIES` | (none) | the proxy's addresses or ranges (`172.24.0.5`, `172.24.0.0/16`, comma-separated; needs `WEB_TRUST_PROXY`): forwarded headers count only on its connections, and any other non-loopback peer is refused. Only where the agent sees the proxy's own address (not behind a published Docker port). With neither set: believed from any peer (the agent prints a note) |
| `WEB_MCP_GAMES_PER_ADDRESS` | `max(2, WEB_MAX_SESSIONS / 2)` | live MCP games one address may hold (probe T8 decides; `WEB_MAX_SESSIONS` caps MCP games only globally) |
| `WEB_LEASE_MS`, `WEB_MAX_SESSIONS` | `600000`, `4` | one bot per guest for 10 minutes |
| `WEB_ASK_PER_HOUR`, `WEB_ASK_MAX_CHARS`, `WEB_MAX_BODY` | `3`, `300`, `8192` | `/ask` limits per address, request body cap |
| `WEB_ASK_ALLOW_CONTRIBUTOR` | `false` | the Ask queue stays closed on the Contributor tier (Meta may train on it) unless this is `true`; the page then says so |
| `WEB_ADMIN_TOKEN` | (none) | operator kill switch, at least 24 characters (`openssl rand -base64 24`); `/admin/stop` answers 404 without it |
| `BODY_MAX_TRAVEL` | `256` | farthest `go_to` |
| `BODY` | `ours` | who plays a guest game: `ours` (mineflayer here) or `mineai` (a Mine AI MCP host per game; section "The Mine AI MCP body") |
| `MINEAI_DIR` | (none) | the fetched and patched runtime (`mineai/fetch-and-patch.sh <dir>`); needed by `BODY=mineai` |
| `MINEAI_RUNTIME`, `MINEAI_EXEC` | `node`, (this node / `bun`) | run their host with Node and tsx (24.15 or newer) or Bun |
| `MINEAI_PORT_BASE`, `MINEAI_PORTS`, `MINEAI_MAX_HOSTS` | `27100`, `64`, `WEB_MAX_SESSIONS` | loopback ports: hosts from the base, their live views two ranges above; hosts at once |
| `MINEAI_START_MS`, `MINEAI_HEARTBEAT_MS`, `MINEAI_HEARTBEAT_MISSES` | `90000`, `5000`, `3` | time to be ready; our `/health` heartbeat and how many may go unanswered before a restart |
| `MINEAI_UNRESPONSIVE_MS` | `5000` | their own event-loop watchdog (patch 0003), up to 120000 for a loaded machine |
| `MINEAI_DATA_DIR`, `MINEAI_VIEWS` | (none: temporary), `true` | their per-bot SQLite; the live views from inside the host |
| `STEP_CAP`, `COST_CAP_RUN`, `COST_CAP_HOUR` | `300`, `1.00`, `3.00` | per run, per run in US$, rolling hour in US$ |
| `ERROR_CAP`, `LOOP_REPEAT` | `8`, `3` | errors in a row (8 leaves room to explore for ore); same call failing (or changing nothing) before a hint |
| `NOTES_PATH`, `ASK_NOTES_PATH`, `SHORT_MEMORY` | `notes.json`, `notes-ask.json`, `8` | long-term notes of the filmed runs, of the Ask brain (viewer requests never write `notes.json`), steps kept verbatim |
| `LOG_DIR` | `logs` | JSONL logs: `run-<time>.jsonl` (run-goal), `run-serve-<time>.jsonl` (`npm start`), `probe-<date>.csv` |
| `STREAM_ENABLED` | `false` | live video of every guest game (section "Live video"); off: nothing is started and nothing changes |
| `STREAM_RTMP_URL` | (none) | `rtmps://...` ingest URLs with their stream keys, comma-separated, one per stream that may run at once; never printed or logged |
| `STREAM_VIDEO_URL` | (none) | the public URLs of the Facebook live videos those ingests feed (same order; one URL serves all): MCP `live_view {format: "embed"}` returns Facebook's player for it while a game's stream runs |
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
  `view`, `why`, seconds `s`, `mb` sent), `ask_*`, `admin_stop`, `mcp_client` (`protocolVersion`, `negotiated`,
  `client` {name, version}), `mcp_game`, `proxy_refused` (`peer`), `proxy_peer` (`peer`: who sends forwarded headers
  while neither `WEB_PROXY_SECRET` nor `WEB_TRUSTED_PROXIES` is set), `bot_name` (`session`, `username`, with
  `MC_WHITELIST`), `whitelist_error`.
- Where a skill's time went: every `viewer_action` row and every `decision` row (`skillMs`) has `phases`, in ms: `path`
  (walking, path search included), `dig`, `drop` (the ticks after a dig for its drops to appear), `sync` (inventory
  syncs with the server), `place`, `open` (a window opening), `clicks` (window clicks and their answers), `pickup`
  (walking over drops), `cook` (waiting for a furnace), `reflex` (fighting, fleeing or eating on its own, its walks
  included) and `other`; a phase inside another counts toward the outer one (a walk to a drop is pickup), so they add
  up to the skill's time (src/body.js `createPhases`).
- `loop_delay` every minute: the event loop's lag beyond its 10 ms sampling interval, `p50Ms`, `p99Ms`, `maxMs`,
  `meanMs`, and `samples` (well under 6000 when the loop was blocked). A 2026-10-07 strict run on the local server
  (this Mac, loaded) logged p50 1.3-2 ms, p99 2.6-268 ms per minute, and one stall of 28 s during an underground go_to.

## The body on its own (roadmap M2)

What the body does without a model turn, and how it saves time (roadmap M2, the S-items named):

- Reflexes (`src/reflexes.js`). A hit from a hostile mob (the server names who dealt it) during a skill, or between
  skills, is fought back with the best weapon carried (up to 24 swings); below 8 health, or for a creeper, the bot runs
  16 blocks instead, eats if it can, and the skill ends with "retreated: ...". A creeper within 4 blocks is run from
  before it blows. At food 14 or less with no hostile mob within 12 blocks the bot eats before the next skill, while
  it waits, or by interrupting a go_to, collect or build. The interrupted skill goes on afterwards from where it was
  (collect and craft only do what is left, build keeps its spot, go_to and place are simply called again); at most 4
  fights or runs (and 8 meals) per skill, then the hit stops it as before. One meal at a time: a meal asked for while
  another is eaten is dropped when food is above 14 by then. A mob in its death animation (mineflayer keeps it in its
  entity list for about a second) is neither fought again nor taken as `attack`'s target. The skill's time limit stops while a reflex runs. The next result
  says what happened: `mined 5 oak_log [on its own: fought back a zombie and killed it (2 swings)]`, and lists it in
  `reflexes`; the log has `attacked`, `reflex` (what it did, health before and after, ms) and `reflex_idle` rows.
  `createBody({reflexes: false})` keeps the old behaviour (a hit stops the skill and says what to do).
- Stations (S4, `src/stations.js`, `src/skills/station.js`). A crafting table or furnace a bot puts down (craft,
  smelt, or place) stays where it is and belongs to that bot. A craft walks back to a table that is close (within 16
  blocks and 4 up or down), else puts down the one carried, else makes one from 4 planks when the planks pay for it
  and the recipe, else walks to one up to 24 blocks away. Other bots never use, open or mine a bot's stations (craft,
  smelt and `collect crafting_table` / `collect furnace` skip them; pathfinder never breaks stations). A bot owns at
  most 4; a fifth retires the oldest one not in use: never a furnace still smelting or holding output not yet taken,
  never one the running skill works at (it may be about to load it). While every station is in use the bot keeps more
  (a second smelt while the first cooks puts down three more furnaces), up to 8, and is refused a ninth; the extra
  ones are retired at the next placement once idle. When the game ends (`close()`, or the bot leaves) its stations are removed
  through the server console (`MC_CONSOLE`): `execute if block X Y Z minecraft:furnace run setblock X Y Z air`, which
  drops nothing and leaves any other block alone. The state lists `your stations: ...`.
- Background smelting (S5). `smelt` loads the furnaces and returns at once ("... ready in about 10 s"); the output is
  taken by the next skill that starts within reach of a finished furnace, or by a craft, eat, place or build that
  needs it (waiting for it), or by calling smelt again. Up to 3 furnaces share one load: the bot's (or nobody's)
  furnaces close by, the ones it carries, and extra ones crafted from spare cobblestone (8 each) when a table is close
  or the planks pay for one. Each furnace of a split load burns planks first (one plank is 1.5 items, so no coal burns
  for one item), never sticks. A furnace nobody owns is held for the bot while its items are in it. The state shows
  `furnaces: 3 iron_ingot ready in about 7 s in your furnaces at ...`. A craft (or eat, place, build) that needs output
  from furnaces more than 28 blocks away says where it is ("1 iron_ingot is still in your furnace at X Y Z, 50 blocks
  away (too far to fetch: go_to there first)"), and every furnace that is gone is named.
- Mining (S1, S2, S6, S8). No 10-tick wait after a dig and no detour to each drop: `collect` sweeps its drops up once
  at the end, nearest first, only the wanted items, within 8 s; for blocks that drop by chance (gravel, leaves,
  grass) every drop seen where they broke, with a note when some stay on the ground. A collect a reflex interrupted
  hands the drops still lying on to the try that finishes it, and what was picked up counts from the first try. Only
  blocks this bot broke count: when a block goes while the bot walks to it (another bot mined it), the walk ends at
  once and the block is skipped (it was counted as mined, after a 22 s walk). The head turns at once for a dig, a
  placement or a block opened (the server needs no turn; mineflayer turns at 3 rad/s and waits for it, up to about
  1 s an action; measured on the local Paper by the reviewer: the same scripted route 35.8 s before, 23.0 s after). Targets go by an approximate path cost, not by
  straight-line distance: an open block before a buried one, climbing at 1.5 a block. A walk to a block gets a 2 s
  path search and a search radius of its distance + 64; a block no spot can see (buried) is then dug to, if it is
  within 7 blocks (4 s search, 12 s walk). Stone (and deepslate, andesite, ...) is tunnelled: what is in reach and in
  view first, then a 1x2 passage one block into the stone, at most 10 steps a collect; a block is dug only when no
  water or lava touches it and no sand or gravel rests on it, the floor ahead is solid, and never the floor under the
  bot. The staircase steps of go_to get a 4 s, radius-16 search. The bot waits to stand on the ground before it digs
  (in the air the game digs 5 times slower).
- Dig times. minecraft-data 1.21.4 files the blocks that need a stone pickaxe or better (iron, copper, lapis, gold,
  diamond ore, obsidian) under a material whose speed table has wooden tools only, so mineflayer timed every
  pickaxe on them at hand speed and waited that long before it told the server the block was broken: iron ore with a
  stone pickaxe 4.55 s instead of 1.15 s. The body times such a block as the pickaxe block it is.
- Clicks and syncs (S10). An inventory sync under a second old with nothing changed since is not repeated (before or
  after a skill); a 2x2 craft right after another sends no sync of its own; a table window that just opened needs no
  settle; after the last shift-click the window is closed at once and one settle counts the result. The quiet spell
  after a settle is 50 ms (was 100).
- Chunks (S11): the bot asks for 6 chunks around it (mineflayer's default asks for 12; the server sends at most its
  own view distance, 8 here).
- The state's block scan (about 30 searches of the chunks around the bot) is kept per bot and done again only after 4
  blocks of movement, a change to a notable block within the radius, or 5 s; distances are taken from where the bot
  stands now.
- Every result has `phases`: ms per part of the work (path, dig, pickup, sync, reflex...; see "How the brain plays").
- Axes (S3): an axe carried is used for logs, planks, tables (mineflayer-tool picks the fastest tool), and a table
  is no longer mined back after each craft, so crafting an axe at the table right after the pickaxe costs one craft
  (0.4 s here). A log takes 3.0 s by hand, 0.74 s with a stone axe (lab test below).

### Speed, measured

Measured 2026-10-07 on this Mac (M1, 8 cores, shared with other work), no model, no MCP:
`scripts/bench-body.mjs` drives the body directly. The server is a private copy of the local Paper 1.21.4 (same jar
and settings as `server/start.sh`: Easy, daylight locked at morning, view 8, simulation 6; port 25571) with a world
generated from seed 71811045 and restored from the same snapshot before each phase, so before and after play the
same terrain. Five fixed fresh spots (`spreadplayers X Z 0 2`: 450,60 birch hills; -520,-330 birch; 900,-200
spruce; -380,420 snowy spruce; 700,-700 birch), one new bot with an empty inventory per run, natural world (no
console items). The route is the scripted MCP player's: collect 6 logs, planks 20, sticks 8, a table, wooden
pickaxe, collect 12 stone, stone pickaxe, furnace, collect 3 iron ore (on a failure go_to 14 blocks lower and try
again, up to 6 times), 2 coal if none, smelt 3 raw iron, iron pickaxe. Strict: a failed call counts and is not
repeated, except one stopped by a mob (then the route attacks it and calls again). Before = commit cced072, after
= this body. Two rounds, each phase on a freshly restored world: round 1 before, then after; round 2 before, then
after.

| | before | after |
| --- | --- | --- |
| iron route from an empty inventory, median of 10 runs | 229.7 s | 148.2 s (-35 %) |
| median per round (5 runs each) | 268.5 s, 229.6 s | 140.0 s, 156.3 s |
| fastest / slowest run | 176.3 s / 285.2 s | 96.5 s / 177.5 s |
| runs that made the iron pickaxe | 8 of 10 | 10 of 10 |
| failed calls in all 10 runs | 18 (2 runs lost the crafting table: mined back, its drop never picked up) | 1 |
| collect 6 logs by hand, s per log (median) | 6.14 s | 4.83 s |
| collect 12 stone with a wooden pickaxe, whole call (median, range) | 46.0 s (39.2-50.3) | 26.2 s (22.3-33.1) |
| the same, s per stone (median) | 3.84 s | 2.18 s |
| dig one iron ore with a stone pickaxe (median of every dig) | 4.53 s | 1.16 s |
| 2x2 craft (planks, sticks, table), median | 0.76 s | 0.15 s |
| table craft (pickaxes, furnace), median / p95 | 6.08 s / 15.17 s | 0.44 s / 3.54 s |
| smelt call | 33.2 s | 3.1 s (returns once loaded; 3 furnaces in 9 of 10 runs) |
| smelt 3 iron, through the iron pickaxe craft | 38.7 s | 14.4 s |

Reading it: the table crafts gain the most (no table placed and mined back each time), then the smelt (three furnaces
at once, the call returns at once and the iron pickaxe craft waits for the ingots), stone (no 10-tick waits, no detour
per drop, tunnelling, digging on the ground) and iron ore (the dig time fix). The route's remaining time is mostly
the search for iron underground (the go_to 14 lower and the walks to ore), which varies most between runs. The
roadmap's M2 checks, here on the Mac rather than on staging: median 148 s (target 170), slowest 177.5 s (210), no
deaths, 1 failed call in 10 runs (0), table craft p95 3.5 s (3), 12 stone 26 s (15), 3 iron 14.4 s with the pickaxe
craft (12).

| Lab test (prepared with console commands) | Result |
| --- | --- |
| A zombie summoned 2 blocks from the bot 5 s into `collect stone 12`, at night (more mobs come on their own), a stone pickaxe as the only weapon; 10 runs at the 5 spots | the zombie hit the bot in 6 runs: 4 times the bot fought back (1 to 4 zombies), finished the collect and said so in the result; twice it died (once worn down by three zombies, its run at health under 8 caught; once knocked off a cliff edge mid-fight). In the other 4 runs no hit came. The roadmap's "10 of 10" is not met |
| The Hunger effect (level 101, 40 s: about 2.5 food a second) during `collect stone 12`, 4 bread carried; 3 runs | it ate all 4 bread on the way (each at food 14 or less) and the collect finished, in 27-28 s. (A first version stopped the collect after 4 meals as if mobs kept attacking, and reported meals the server had not taken; both fixed) |
| `collect <log> 6` by hand vs with a stone axe (S3), same spot one after the other | one log 2.99 s by hand, 0.74 s with the axe; 6 spruce logs 34.0 s vs 20.9 s (mangrove with the axe: 19.4 s) |
| The route once on the shared local server (127.0.0.1:25565, spot -520,-330) | 129.7 s, 12 calls, none failed; 3 furnaces; the bot's 6 stations: 2 retired on the way (cap 4), the other 4 removed through the console when it left |

## The Mine AI MCP body (BODY=mineai)

`BODY=mineai` (default `ours`) puts each guest's bot in a Mine AI MCP runtime (https://github.com/aibengineering/mine-ai-mcp,
MIT, "Copyright (c) 2026 AI Bengineering") instead of in this process, after the reuse spike
(`../../../research/muse-reuse-spike.md`). Everything a guest talks to stays ours: `/mcp` (the queue, `request_id`,
45 s replies, typed codes, the dry-run check), `/play`, `/api`, quotas, leases, the kill switch, the live views and the
stream. The house bot of the Ask queue stays on our body. Production runs `ours` until the switch is flipped.

Their code stays out of this repo: `mineai/UPSTREAM.json` pins the commit and lists our patches, `mineai/patches/` holds
them, and `mineai/fetch-and-patch.sh` puts the two together in a folder of its own at build time (`mineai/README.md`):

```sh
BUN=/path/to/bun mineai/fetch-and-patch.sh ~/picasso-work/mineai-runtime   # clone 2fe1306, the 4 patches, bun install, fork check, typecheck, crafting tests
node scripts/mineai-fetch.mjs ~/picasso-work/mineai-runtime --check
BODY=mineai MINEAI_DIR=~/picasso-work/mineai-runtime MINEAI_RUNTIME=bun MINEAI_EXEC=/path/to/bun MC_USERNAME=Tst_rv npm start
```

Our patches: `0001` crafts by confirmed window clicks, so crafting works on Paper (their fork's craft read the result
slot before Paper's burst of slot updates had settled; `mineai/README.md`), `0002` its tests; `0003` lets
`MINEAI_UNRESPONSIVE_MS` (5-120 s) widen their supervisor's 5 s event-loop watchdog for a loaded machine; `0004` makes
their host and its runtime refuse any request without `Authorization: Bearer $MINEAI_HOST_TOKEN` (their host had no
authentication).

How a host runs (`src/mineai/host.js`): one per guest game, their `src/server/host.ts` under Node with tsx (their own
dev dependency; Node 24.15 or newer) or Bun (`MINEAI_RUNTIME=bun`, `MINEAI_EXEC`), with `--listen-host 127.0.0.1` on
`MINEAI_PORT_BASE` + slot (never 0.0.0.0), the server, port and player name on its command line and a random token per
host in its environment only; none of our keys, tokens or stream URLs reach it. Ready when its `/health` says the bot
is connected (`MINEAI_START_MS`). Then a heartbeat (`MINEAI_HEARTBEAT_MS`; each unanswered one is logged as
`mineai_heartbeat_miss`): `MINEAI_HEARTBEAT_MISSES` unanswered in a row, a runtime their supervisor gave up on
(`RUNTIME_UNRESPONSIVE`, `RUNTIME_EXITED`), a bot that lost its connection or a process that exited is a crash: the host is started again once (the bot rejoins where it was), a second crash ends the
game ("the body could not go on"). It is killed when its game ends (end_game, the lease, the operator's `{"end": true}`,
an agent stop) and with the agent even when the agent is killed (`src/mineai/preload.mjs` watches the stdin pipe). At
most `MINEAI_MAX_HOSTS` at once. Bot data is temporary unless `MINEAI_DATA_DIR` is set.

What a guest's skill becomes (`src/mineai/skills.js`):

| Our skill | Their action | Notes |
| --- | --- | --- |
| `get_state` | `view_status` | their status in our state text (`renderState`); notable blocks from `view_blocks` (two finds of 8 names, in the background, every 20 s at most) |
| `go_to {x, y, z}` | `navigate` | `BODY_MAX_TRAVEL` checked first |
| `collect {block, n}` | `collect_block` | their search covers every loaded chunk; more than 32 is two calls |
| `craft {item, n}`, `craft_batch {items}` | `craft_item` (recursive, one call) | a carried table is put down for the call and picked up again (`temporary_workstation`); 2x2 recipes put none down |
| `smelt {item, n}` | `smelt_item` | at most 24 a call; one fuel, chosen as the check plans it; a carried furnace put down and picked up, else a furnace within 24 blocks; waits for the whole load |
| `place {block, pos}` | `place_block` | |
| `build {blueprint, material}` | `build_structure` | our blueprints as cells, anchored as our build skill anchors them, by their compass heading |
| `attack {target}` | `collect_mob_drop` (the mob's usual drop, 1) | ok once the mob died; hostile mobs fought without a shield; `nearest_hostile` from their status |
| `eat {}` | `eat_food` | the best safe food carried, as ours picks it |
| `say {text}` | `send_message` | |
| `equip {item, to?}` | `equip` | extra skill |
| `hunt {mob, drop, n, without_shield?}` | `collect_mob_drop` | extra; never players, villagers, pets or golems |
| `sleep {}` | `sleep` | extra |
| `bucket {action, liquid?, pos?}` | `use_bucket` | extra |
| `chest {action, pos, items?}` | `use_container` | extra; inspect, deposit, withdraw |
| `explore {heading, chunks?, biome?}` | `explore_frontier` | extra |
| `policy {retreat_health?, raw_food?, fight?}` | `set_survival_policy` | extra; for the rest of the game, with the revision read from their status; none of them: back to the defaults |
| `pick_up {item?, death_items?}` | `pick_up_items` | extra |
| `drop {item, n}` | `drop_item` | extra |

Every call of ours carries a fresh `submission_id`, a fixed one-sentence rationale (their log only) and asks for JSON;
the body waits with `wait_for_action` up to the skill's limit, cancels with `cancel_foreground_action` on stop or
timeout, and always reads the final result before the next call (their result gate; a result left unread by a cut call
is read first). Results come back in our words with the inventory change from their status before and after; their
codes become ours (`CRAFT_MATERIALS_MISSING`, `SMELT_FUEL_STARVED`, `TARGET_UNMINEABLE`, `BED_NOT_FOUND`... `NEED_ITEMS`;
`HOSTILE_CONTACT`; `*_DIED` or a new death in their status `DIED`; `INVENTORY_FULL`; unknown names `BAD_ARGS`; a
partial result is a failure, since the steps after it were planned on all of it; except a craft or smelt done in full
whose temporary table or furnace could not be picked up again: that is ok, and the result says where the station was
left, as our own body leaves its stations; sending it again would craft or smelt twice). Their reflexes (combat, fire,
breath, footing, hunger) act on their own and are listed in the result ("on its own: ..."). The dry-run check knows the
stations come back (`temporaryStations`) and what `hunt`, `chest`, `drop` and `bucket` bring or take; after `pick_up`
what seems missing only warns.

What Muse sees: the same 7 tools; `play` and `play_sequence` list the extra skills with compact schemas (`tools/list`
25.5 KB, ours alone 22.7 KB; theirs is 1.36 MB). No rationale, submission id, action id or anything else of their 37
tools reaches a guest.

Live views: `src/mineai/preload.mjs` (loaded with `--import`, or Bun's `--preload`, into their processes; no change
to their code) starts our prismarine-viewer, read-only, on two loopback ports of the range inside the bot's process once
it has spawned, under the game's `/watch/<view id>` and `/eyes/<view id>` prefixes; `src/web.js` proxies them as it
proxies ours, so `live_view` and the stream work unchanged. Not available with this body: the crack overlay (no dig
events cross the process boundary).

Measured on this Mac (2026-10-08, the spike's vanilla 1.21.4 on 25567, seed 71811045, Easy, daylight locked, natural:
no console items, a fresh spot per game via `spreadplayers`; the Mac loaded by other work):

| Run | Result |
| --- | --- |
| `scripts/staging-check.mjs` (start_game, one `play_sequence` of 5 steps to a wooden pickaxe, strict), Node | 4 of 4 PASS: 16.1, 20.7, 18.3, 17.9 s from the first action, 3 MCP calls each; `start_game` 6-12 s (host ready in 6.6 s, then the spread) |
| the same with Bun (`MINEAI_RUNTIME=bun`) | PASS, 17.2 s |
| `test/e2e/mcp-iron.mjs` (strict iron route, 12 steps) | PASS: iron pickaxe 150.2 s after the start (143 s from the first action), 14 MCP calls, 0 failed steps |
| extra skills (two games) | `hunt sheep white_wool 1` ok (34 and 16 s), `hunt cow beef 1` ok (71 and 33 s), `attack pig` ok, `policy` ok, `equip` ok, `drop dirt 2` ok (after a fix: the held item may go); `sleep` without a bed `NEED_ITEMS`; `build platform_3x3` with 3 of 9 dirt `NEED_ITEMS`; `pick_up dirt` right after the drop: their partial ("not confirmed in inventory"), so `FAILED` |
| live views | `/eyes` and `/watch` through our proxy: 200, socket.io up, 49-56 chunks and the bot's moves in 10 s; the streamer recorded the first-person view (30 fps) |
| crash | the bot's runtime process killed mid-game: the running step failed, a new runtime in about 9 s, the next step ok; killed again: the game ended with the reason |
| agent killed (`kill -9`) | the host and its runtime gone and the bot off the server within 1-2 s (Node and Bun) |

On Paper, the server we deploy (2026-10-08, this Mac, our local Paper 1.21.4-232 on 25565, seed 71811045, Easy,
daylight locked, natural: no console items). The runtime built by `mineai/fetch-and-patch.sh` (all four patches), run
with Bun 1.4.2 (`MINEAI_RUNTIME=bun`, as in the image), heartbeat and watchdog at their defaults (5 s, 3 misses; 5 s).
Each game lands at a fresh spot of its own: `SPREAD_SPOTS`, spots no earlier game had touched (regions never
generated before a spectator probe looked at them; spots in water left out, nothing else picked). Every number is the
strict harness `test/e2e/mcp-iron.mjs` (iron pickaxe from an empty inventory, every step once, no fights by the
harness), driven by `mineai/bench/gateway-iron.mjs`, which also samples every process under the agent every 3-5 s and
reads the agent's `loop_delay` rows and host events and the server's death messages. Our body ran the same 10 spots on
an untouched copy of the same world (snapshot taken before any of these games, port 25569). Times are from the
harness's start, `start_game` included (about 5 s with this body, 3 s with ours).

| | `BODY=mineai`, 10 spots one at a time | `BODY=mineai`, 8 more spots, 8 games at once | `BODY=ours`, the same 10 spots |
| --- | --- | --- | --- |
| strict passes (iron pickaxe, no failed step) | **8 of 10** (9 of 10 counting the lost furnace as ok, as the body now does) | **8 of 8** | **8 of 10** |
| iron pickaxe made | 10 of 10 | 8 of 8 | 8 of 10 |
| time, median / max (passes) | 154.0 / 173.9 s (all 10 made: median 158.3 s, one 300.1 s) | 156.5 / 179.8 s | 134.4 / 157.3 s |
| deaths | 0 | 0 | 0 |
| failed steps | 3 (spot 1: `collect oak_log 6` got 3 in its 180 s, then the planks check; spot 9: the smelt was done, the temporary furnace was not picked up again) | 0 | 34 (spot 3: 6 spruce logs mined, 2 picked up, then every step after it; spot 7: no oak log within 32 blocks, then every step after it) |
| MCP calls per game, median | 14 | 14 | 14 |
| where the time goes (median s): logs, all crafts, stone, iron and coal, smelt | 37.5, 22.3, 26.8, 32.2, 32.2 | 28.8, 23.1, 26.4, 43.9, 32.2 | 35.3, 19.6 (the last craft waits 15.6 for the ingots), 23.5, 43.9, 3.6 |
| agent event loop (60 s windows) | p50 2.0 ms, p99 2.2-2.4 ms, max 43 ms | p50 2.0 ms, p99 2.4-7.5 ms, max 18 ms | p50 2.0 ms, p99 41-153 ms, max 3.1 s (15 of 22 windows had a stall over 1 s, 5 over 2 s): the bot runs in the agent's process |
| hosts | 10 started, ready in 1.0 s (median), 0 heartbeats missed, 0 restarts | 8 at once, ready in 1.1 s, 0 heartbeats missed, 0 restarts, 0 watchdog stops | - |
| memory | agent 143-156 MB; each host 70 MB; each runtime (the bot, with its live views) 446 MB median, 689 MB max | agent 146-168 MB; hosts 548 MB together; runtimes 428-548 MB each, 3.8 GB together at most | agent 394 MB after the 10 games |
| CPU (one core = 100%) | agent 0.4% median; a runtime 18% median, 35% p90, 97% max | agent 1.3% median, 6.5% max; a runtime 9% median, 45% p90; all runtimes together 337% at most; Paper 153% mean, 494% max (8 fresh areas generating); load average up to 5.5 on 8 cores | agent 36% of a core on average over the games |

Spot 1's slow log collect did not come back: the same spot on another untouched copy (port 25570, with
`MINEAI_DATA_DIR` set so their SQLite kept every action) collected its 6 logs in 28.7 s and passed in 159.7 s. With
temporary bot data nothing of the slow run was left to read: staging should set `MINEAI_DATA_DIR` (and prune it). Their
4 table crafts take 4.6-5.7 s each because the table is put down and dug up again every time (ours: 0.15 s at a table
that stays), and their smelt waits for the whole load (ours returns at once and smelts in up to 2 furnaces): crafting
and smelting cost theirs about 31 s more per route (median 54.5 s against 23.2 s), more than the whole 20 s gap in the
median; theirs gets some back at the ore (32.2 s against 43.9 s). Keeping a placed table and furnace for the game, as
ours does, is the obvious next speed-up (estimate: 10-15 s a route). Their log search over every loaded chunk is why spot 7 (no tree within 32 blocks) passed with
theirs and failed with ours.

Reproduce (the servers and the world copies are outside the repo, in `~/picasso-work/rv-int/`):

```sh
SPREAD_SPOTS="1800 0; 1273 1273; -1800 0; 0 -1800; 3049 1263; -1263 3049; -3049 -1263; 3049 -1263; 4500 0; -4500 0" \
  BODY=mineai MINEAI_DIR=~/picasso-work/mineai-runtime MINEAI_RUNTIME=bun MINEAI_EXEC=<bun> MC_CONSOLE=server/console.in \
  MC_USERNAME=Tst_rv WEB_PORT=8791 WEB_MAX_SESSIONS=8 WEB_MCP_GAMES_PER_ADDRESS=8 WEB_LEASE_MS=960000 npm start
node mineai/bench/gateway-iron.mjs http://127.0.0.1:8791 --agent-pid <agent pid> --agent-log logs/run-serve-<...>.jsonl \
  --server-log server/logs/latest.log --label a-mineai-paper --n 10            # --parallel --n 8: all at once
```

Not yet: staging (the image builds the runtime with `--build-arg MINEAI=1`, UNVERIFIED: no Docker here; staging also
needs `BODY=mineai`, `MINEAI_DATA_DIR` on a volume and the build arg in its compose file), picasso's load
(`MINEAI_UNRESPONSIVE_MS`, the heartbeat), a whole lease, more than 8 games at once.

## What is mocked

- The model: `test/mock-llm.js` speaks Chat Completions and the Responses API (streamed and not), replays scripted tool
  calls with usage (cached and reasoning tokens, a simple prefix-cache model keyed by `prompt_cache_key`), and answers
  HTTP 400 to what Meta rejects (`stop`, `n` > 1, `logprobs`, `logit_bias`, `tool_choice` other than `auto`, effort
  `none`). Real latency, real token counts and real caching are only measured by the probe with `--live`.
- The game: `test/fake-bot.js` fakes the mineflayer surface (blocks, inventory, real recipes and drops from
  minecraft-data 1.21.4, furnaces, pathfinder, combat). No physics, no mob AI, instant movement unless timings are
  set; drops go straight into the inventory. No Minecraft server, Java or client is used anywhere in the tests.
- The skills mine with pathfinder and `dig` (collectblock's own collect is not used: its pickup can wait forever);
  `collect` goes straight on to the next block and sweeps the drops up once at the end, nearest first, within 8 s. Every walk clears the pathfinder goal when it ends, so a walk that settles
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

- The day-0 fixes (2026-10-07) ran on this Mac only: `npm test`, and against the local Paper server through MCP (two
  strict iron-pickaxe runs: one PASS in 214 s with 15 calls and no failed step; one FAIL: the crafting table vanished
  while `craft stone_pickaxe` tried to place it, 15.5 s in `place`, and the run went on without a stone pickaxe; two
  simultaneous starts; the live views under view ids, recorded through the streamer). Not yet: the agent image build
  (no Docker here; the slimming was run on a copy of node_modules and the suite and a live game passed on it), the
  prune in push.sh, and the proxy secret behind the real Caddy (the agent sees the Docker gateway, not Caddy's
  container address, on the published port: checked read-only on picasso; `WEB_PROXY_SECRET` and Caddy's `header_up`
  are not deployed yet).
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
  hit the way the server does; its mobs never move or hit back). On the real server the server names who dealt each
  hit (damage_event, checked on Paper 1.21.4), so a skeleton up to 24 blocks away counts and a fall, drowning or
  hunger next to a mob does not. A hit from a hostile mob is a reflex (section "The body on its own"); with
  `reflexes: false` it stops the running skill (not attack or eat) with "a zombie is attacking you ...; fight back
  with attack zombie, or go_to somewhere safe", and for 10 s the same mob's hits stop nothing unless health drops to
  6. After a death the next skill waits for the respawn. Lava is only avoided as far as pathfinder's own digging
  rules go, and by the tunnel's checks.
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
- Minecraft stays on localhost/LAN (any other `MC_HOST` is refused); on picasso, where every local user can reach the
  compose network, Paper lets in only the bots the agent lists (`MC_WHITELIST`), under names nobody can guess, and
  shows no names in the server list. Only the web port is meant to be exposed, and with `WEB_PROXY_SECRET` only the
  proxy (and this machine) may talk to it.
- Strangers' text stays out: other players' chat never reaches a page, reply or API, the log is the operator's, and an
  `/ask` request's text is shown only to its sender. Replies to agents carry no links and no tokens; resume handles and
  live-view ids are 128-bit and separate from the control token.
- $ caps per run and per hour, a step cap, a stop button per session and an operator kill switch; every decision is
  logged with its cost.
- The key lives only in the environment and is only sent to `MODEL_BASE_URL`; logs scrub anything shaped like a key.
- Skill logic adapted from Mindcraft (MIT) is credited where it is used. Nothing is taken from rmalde/minecraft-agent
  (no license). `BODY=mineai` runs Mine AI MCP (MIT, Copyright (c) 2026 AI Bengineering; notice in
  `mineai/LICENSE-mine-ai-mcp`), fetched at build time, never copied into this repo; our patches carry the notice.
