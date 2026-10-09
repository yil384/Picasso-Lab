<!-- README.md - what the Muse-plays-Minecraft agent is, how its modules fit, how to run it, and what is mocked. -->
# Muse plays Minecraft: the agent

Meta's Muse Spark (through its OpenAI-compatible API) decides what to do; a mineflayer bot does the walking, mining
and crafting. The model sees the game as plain text and acts only through 10 whitelisted skills with validated
arguments. Viewers watch and play through a zero-JavaScript web page that an agent browser (a viewer's own Muse) can
operate from the accessibility tree. Plan and sources: `../../../research/muse-minecraft-plan.md` and
`../../../research/muse-minecraft-findings.json`.

Not affiliated with or endorsed by Meta or Mojang.

**Status 2026-10-08: production (https://play.picasso-lab.com) plays with the Mine AI MCP body (`BODY=mineai`, the
runtime at 2fe1306 with our 11 patches, builds on rough ground included); staging too.** Both stacks have the proxy secret and the Paper whitelist.
Section "The switch" below; rollback `docs/SWITCH.md`, section 5. **Staging since 2026-10-09: Normal with real days
and nights, and the body looks after itself between calls (ROADMAP M4; section "The bot looks after itself"); its gate
is not met yet, so production keeps easy and locked daylight and the build before it.**

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
| `src/rtmp.js` | the RTMP(S) publisher: ffmpeg writes FLV to its fd 3 and this sends it to the ingest, so a stream key is never on a command line (picasso has no hidepid), in a file or in a child's environment |
| `src/fb-live.js`, `src/live-page.js` | `FB_LIVE=on`: the Graph API (Page token from a 600 file, spaced, retried, rate-limit aware, scrubbed) and the one live channel on the Facebook Page (each guest game goes live by itself; one camera follows the last `live_view` request; the live video ends with the last game; a crash's leftovers ended at start); the static page `live_view` returns for muse.ai's artifact panel (section "Live on a Facebook Page") |
| `scripts/fb-token.mjs`, `scripts/fb-probe.mjs` | the Page token from the App ID, the App Secret and a short-lived user token (written 600; prints only the Page's name and id); one real test live video from this machine (a test pattern with a clock, checked live, ended, deleted) |
| `src/camera.js` | the real-client camera (`STREAM_SOURCE=client`): Xvfb + the vanilla Minecraft client as a spectator in the bot's head, ffmpeg x11grab, the same stream interface (section "Real-client camera") |
| `scripts/stream.mjs` | one stream on demand (to a file or an RTMP(S) URL, with its CPU, RAM and frame numbers), a side-by-side camera comparison, `--camera` (one real-client stream of a player), or `--serve` (the stream or camera container) |
| `scripts/camera-login.mjs` | signs the camera's Microsoft account in once (device code, no password) and keeps its tokens in the auth folder; `--check` |
| `deploy/Dockerfile.camera`, `deploy/camera/` | the camera image: Java 21, the 1.21.4 client (`install-client.mjs`, SHA-1 checked, no sounds), Fabric and Sodium (`mods.json`, SHA-512 pinned), `CameraMain.java` (the token from the environment, never the command line), Xvfb, Mesa, VirtualGL, ffmpeg |
| `deploy/camera-test/` | test-only tools for the camera test stack: `camera-bench.sh` (one measured pass), `route.cjs` (the fixed route bot), `fb-start.sh` / `stop-fb.sh` / `show.mjs` (a live test with a 30-minute hard stop) |
| `deploy/camera-test.compose.yaml` | a separate test project on picasso (`muse-camera-test`: own Paper, agent, camera, network; shares nothing with production) |
| `deploy/push.sh`, `deploy/staging.compose.yaml` | deploys to picasso: staging first (play-staging.picasso-lab.com), production with `--prod` only after the staging checks pass (section "Staging and deploys") |
| `deploy/recreate.sh`, `deploy/caddy-proxy-line.py` | the runbook's tools on picasso (`docs/SWITCH.md`): recreate the agent after a `.env` change (idle check first, never a build, a running stream or camera recreated with it); add or remove the one `X-Muse-Proxy` line of a site in the shared FRAS Caddyfile (validated, refused if another session saved the file meanwhile, never a restore of an old copy) |
| `scripts/staging-check.mjs` | the staging checks: the page, `openapi.json`, `/mcp`, a scripted game to a wooden pickaxe (strict, no model) |
| `scripts/probe.mjs` | latency and $ per call: effort x cache on/off x Chat/Responses, CSV per call |
| `scripts/run-goal.mjs` | one goal from the command line (real server, or the mock and the fake bot), JSONL log, HUD table |
| `scripts/hud-data.mjs` | the video HUD numbers from one or more run logs (milestones, totals, failures, timeline) |
| `scripts/a11y_snapshot.py` | the accessibility tree of a `/play` page, as an agent browser sees it; `--check` asserts it (Python Playwright 1.49+) |
| `scripts/a11y-chrome.mjs` | the same tree and check through a Chrome that is already installed (DevTools protocol, JavaScript off); no Playwright |
| `test/e2e/mcp-iron.mjs`, `test/e2e/two-starts.mjs` | the scripted MCP runs against a running agent, no model (section "Scripted runs over MCP") |
| `deploy/slim-modules.mjs` | run in the agent image after `npm ci`: keeps the game data of one Minecraft version only |
| `src/mineai/host.js` | `BODY=mineai`: one Mine AI MCP host per guest game (their runtime from `MINEAI_DIR`), on a loopback port of a private range with a token and the player name in its environment only, watched by heartbeat, restarted once after a crash, stopped with its game (its whole process group), its bot data deleted after the game unless the game failed (section "The Mine AI MCP body") |
| `src/mineai/body.js` | a Body (`src/contracts.js`) driving that host as an MCP client: our skills onto their actions, their status as our state, stop and time limits through their cancel |
| `src/mineai/skills.js` | the mapping (our 10 skills and `craft_batch` onto their tools, their results and codes back) and the extra skills MCP offers with this body (`equip`, `hunt`, `sleep`, `bucket`, `chest`, `explore`, `policy`, `armor`, `pick_up`, `drop`) |
| `src/mineai/care.js` | what the body does by itself between the player's calls (ROADMAP M4): a death's items, armor worn and crafted, food eaten and hunted, a spare tool before one breaks, a shelter or a bed at night; their reflexes' events in our words; the journal every MCP reply reports from (section "The bot looks after itself") |
| `src/mineai/preload.mjs` | loaded into their host's processes: ends the host when the agent closes its stdin (game end) or goes away, serves `/eyes` and `/watch` from inside the bot's process |
| `mineai/` | `UPSTREAM.json` (their repository, the pinned commit and our patches in order), `patches/` (ours: crafting on Paper and its tests, the watchdog window, the host token, the player name off the command line, the runtime's exit), `fetch-and-patch.sh` (the build), `LICENSE-mine-ai-mcp` (their MIT notice), `bench/` (crafting and window flows on their tools; `gateway-iron.mjs`: the iron route through our `/mcp` with resources; `survive.mjs` and `survive-labs.mjs`: the M4 survival runs, natural and prepared), `README.md` (the pins, the Paper fix and its numbers); their code is never in this repo |
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
| `/mcp` | MCP (streamable HTTP) for a connector such as Muse: `start_game {adult: true}`, `play`, `play_sequence`, `get_state`, `stop`, `end_game`, `live_view {format: html \| link \| embed}` (src/mcp.js) |
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
instructions carry no links and never tell the agent to open, show or watch anything. `live_view` (read-only for the
game) returns where to watch: `{format: "html"}` (the default) a page under 1 KB for muse.ai's artifact panel
(Facebook's video player and a status line, no script, no request of its own) and a plain link to the video, in the
text and in `structuredContent` (`state`, `live`, `camera_game`, `video_url`, `embed_url`, `html`); with the Facebook
live channel it points the one camera at the game and waits up to about 40 s for Facebook to show it live (section
"Live on a Facebook Page"); `{format: "link"}` gives `first_person_url` and `behind_url`; `{format: "embed"}` gives
`live`, `state`, `embed_url` (Facebook's video player, the one player the muse.ai panel frames) and `video_url`
(also from `STREAM_VIDEO_URL` while the game's stream runs). Each MCP session logs one
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
   (`structuredContent.warnings`, "The check warns ..."). Added crafts never renumber the caller's steps: the reply,
   `get_state` and `dry_run` number the steps as the caller sent them and show an added craft on a line of its own
   starting "+", "(added by the check before step 4, for craft wooden_pickaxe 1)"; items the check puts into a
   `craft_batch`'s list are named on that step's line ("(the check added to your list: 12 oak_planks, 4 stick for
   wooden_pickaxe)"), and a list they make longer than 12 runs in parts numbered "3 (part 1 of 2)"; the reply's first
   line counts the two kinds apart and promises "+" lines only when there are some. In `structuredContent` a step's
   `step` is the caller's number (null for an added craft, whose `before` names the step it comes before; `part` and
   `parts` for a split batch, `addedItems` for what went into its list), `call` the call's number in the game (#1, #2,
   ...: every accepted `play` and `play_sequence`; the reply to each says its own as `call`), and `n` only the order a
   call's steps run in (unique within its call).
4. The steps go into the game's queue (`src/mcp-queue.js`, at most 64 waiting, else `QUEUE_FULL`) and run one after
   another past the reply. Each step is `pending` (waiting or running), `confirmed`, `failed` or `cancelled`; a failed
   step cancels everything queued after it, in every call ("step 2 of your play_sequence #1 (say) failed"), except
   `eat` at a full food bar (`NOT_HUNGRY`), which changed nothing; `stop` stops the running step and clears the queue.
   Steps of earlier calls that finish later come under "Finished since your last call:", each call under its own
   header ("From your play_sequence #2, sent 41 s ago:"), one-step plays included.
5. The reply (within 45 s, the state text included: a call waits for its steps until 2 s before that) has the text as
   before plus `structuredContent`: `code` (null, or `NEED_ITEMS`,
   `HOSTILE_CONTACT`, `RETREATED_LOW_HEALTH`, `INVENTORY_FULL`, `DIED`, `NOT_HUNGRY` (eat at 20/20: harmless, the
   steps after it still run, and the text says so), `BODY_RESTARTED` (`BODY=mineai`: the body's runtime stopped during
   the step and is being started again, once per game; the text says the step may be what stopped it and not to send
   it again from there), `NOT_STARTED`, `DUPLICATE`, `BAD_ARGS`,
   `QUEUE_FULL`, `TIMED_OUT`, `STOPPED`, `FAILED`; for a call whose steps were all cancelled, what cancelled them: the
   failed step's code, or `STOPPED`), `steps`, `earlier` (steps that finished since the last delivered
   reply), `queue`, `changed` (the inventory change) and a short `state` (health, food, position, inventory, seconds
   left; no scan of the blocks around). `get_state {full: true}` adds the whole state as `full`. A step's code comes
   from its result text (`codeOf` in src/contracts.js): the body's "retreated: ..." is `RETREATED_LOW_HEALTH`, and
   "stopped: a zombie hit you ..." or "stopped: mobs kept attacking ..." (a fight it could not go on from) is
   `HOSTILE_CONTACT`. A reply counts as delivered only once its HTTP response was written out in full: one whose
   connection dropped, that a proxy gave up on, or that the client cancelled, delivers nothing, so its results come
   again in the next reply (and a re-send of the call is a repeat). When the body can tell what a step itself used
   and made (`BODY=mineai`, from the runtime's evidence: a craft's recipe steps, a smelt's input, fuel and output, a
   collect's or hunt's gain, a build's placed blocks, a meal; `SkillResult.own`), the step also carries `used`,
   `gained` and `other` (the rest of its `delta`: blocks dug through or scaffolding placed on the way, items picked up,
   other drops of a kill, the drops of cells a build dug clear, a tool that wore out, food the body ate on its own), and
   its line shows its own change first and the rest apart, `[-3 cobblestone, -2 stick, +1 stone_pickaxe; also changed
   meanwhile (dug through, scaffolding, pickups, other drops): +1 cobblestone]`, with a tool that wore out ("worn out:
   -1 wooden_pickaxe") and food eaten meanwhile named on their own; `delta` and `changed` stay the whole change. A
   smelt that failed before its furnace was loaded used nothing (their evidence still says what was asked). The server instructions, `play` (with each skill's arguments),
   `play_sequence` and both `skill` enums name the skills the server offers, all from the body's one skill set.

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
noindex`). It runs no streamer or camera (production runs neither on 2026-10-08). Its `deploy/.env` holds its own admin token;
push.sh writes one the first time and never copies or overwrites it.

```sh
deploy/push.sh                     # staging, then the staging checks; production is not touched
deploy/push.sh --prod              # the same, then production exactly as before, only if every check passed
deploy/push.sh --check             # the staging checks alone, against what staging runs now
deploy/push.sh --prod --dry-run    # print what would run, run nothing
node scripts/staging-check.mjs [url] [--no-game]   # the checks by hand (default: the staging URL)
```

Since ROADMAP M4 staging plays on Normal with real days and nights (`PAPER_DIFFICULTY=normal`, `PAPER_DAYLIGHT=cycle` in
its `deploy/.env`): the check's strict game can be stopped by a mob at night (2026-10-09: a zombie took `craft stick`
over at 3 blocks), so a deploy that matters goes out in daylight, or `deploy/push.sh --check` runs again.

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
with production's commands as before staging existed (plus the bots' data folder, mode 700; after the build, the prune
of our own dangling images with a note when picasso refuses it, the body `deploy/.env` picks, and the note while
`WEB_PROXY_SECRET` is unset, ROADMAP M0 items 8 and 6; staging prunes the same way; and `mineai/` in the copy, which
every agent image copies); and both compose files must build the runtime, run the agent under an init, mount the
data folder and leave `BODY` to `deploy/.env`.

Staging plays with `BODY=mineai` (section "The Mine AI MCP body"): `staging.compose.yaml` builds its agent image with
`--build-arg MINEAI=1` (the runtime fetched and patched at build time, 163 MB in `/opt/mine-ai-mcp`; the image 794 MB
against 470 MB without it) and mounts `~/workspace/muse-staging/mineai-data` (mode 700: `push.sh` makes it so; the
bots' private names are in it) at `/mineai-data` for their per-bot SQLite; the agent there runs under an init
(`init: true`) that reaps whatever a host leaves behind.
Which body plays is set in staging's `deploy/.env` only, next to its admin token: `BODY=mineai`,
`MINEAI_DIR=/opt/mine-ai-mcp`, `MINEAI_DATA_DIR=/mineai-data`, and `MC_USERNAME=Tst_rv` (staging's bots are test
bots: `Tst_rv_` and random letters). Remove the `BODY` line (and `docker compose -p muse-staging -f staging.compose.yaml
up -d` in its deploy folder) to go back to our body. Production's compose file builds, runs and mounts the same way
since gate 1 of the switch (its data folder: `~/workspace/muse-minecraft/app/mineai-data`, next to its world and
logs), and its own `deploy/.env` decides its body: without a `BODY` line it plays ours, as before. The switch, the
proxy secret, the whitelist, the smoke checks and the one-line rollback: `docs/SWITCH.md`.

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
- The stream key is never on a command line: picasso has no `hidepid`, so every user there can read every process's
  `/proc/<pid>/cmdline`. ffmpeg writes FLV to its fd 3 and `src/rtmp.js` publishes it over RTMP(S) with the key in
  memory (handshake, connect, createStream, publish, then the tags; pings answered; a refusal, a stall or a slow link
  is an error that restarts ffmpeg with its backoff). ffmpeg could not take the key from a file: `-/rtmp_playpath
  file` is refused by both builds we run (5.1.9 in the camera image, 9.0.2 on the Mac: the `-/` form covers only
  ffmpeg's own options), and `-fpre` with `rtmp_playpath=` is read but never reaches the protocol (measured
  2026-10-08). Children get the environment without `STREAM_RTMP_URL` and the other secrets. `test/rtmp.test.js` runs
  real ffmpeg through the publisher, over TLS, into ffmpeg's own RTMP server, checks the key arrived in the session
  and scans every command line on the machine (`ps`, or `/proc/*/cmdline` and our `/proc/*/environ` on Linux).
- Log rows: `stream_start`, `stream_browser`, `stream_live`, `stream_publishing`, `stream_stats` (every minute: page and
  capture fps, repeats, drops, CPU and RAM of both children), `stream_browser_restart`, `stream_ffmpeg_exit`,
  `stream_stop`, `stream_failed`, `stream_skipped`, `stream_error`, `rtmp_publishing`, `rtmp_error`. The URLs are
  masked (`rtmps://live-api-s.facebook.com:443/rtmp/***`); the log scrubs the keys anyway.

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

- The rig: Xvfb (`:99`, 960x540: the client draws at 1280x720 times `CAMERA_SCALE`, ffmpeg scales up) and the client
  (Temurin 21, the 1.21.4 jar and libraries from Mojang's manifest, SHA-1 checked, assets without the sounds), started
  with `--quickPlayMultiplayer` straight into the server. The client's `options.txt` is written before every start:
  render distance 5, 30 fps cap, fast leaves and clouds, smooth lighting, brightness "Bright", chat hidden, sound off,
  no first-run or accessibility screens, no pause without focus, never throttled as idle.
- Client mods: the Fabric loader 0.19.5 and Sodium 0.6.13 (`CAMERA_MODS=sodium`, the default; `off` runs the vanilla
  client). `deploy/camera/mods.json` pins every jar with its SHA-512 (the loader's libraries checked against the Fabric
  Maven `.sha512` files and the Fabric meta profile, the mods against Modrinth); `install-client.mjs` checks them at
  build time. The game's ASM 9.6 gives way to Fabric's 9.10.1 (two copies stop the loader). Sodium needs no Fabric API
  (it carries the modules it uses), runs on llvmpipe ("OpenGL Renderer: llvmpipe"), and its options
  (`config/sodium-options.json`: chunk builder threads, culling) are written before every start. ImmediatelyFast 1.8.7
  and FerriteCore 7.1.3 are pinned too but off: no gain measured. The first start prepares the remapped game (a few
  seconds more: in the world after 23 s). After it has joined ("Loaded N advancements" in its log) the rig puts it in spectator mode
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
seed, agent and camera on 10.77.78.0/28, no published ports, test bots named `Tst_cam_*`, videos in
`~/workspace/muse-camera-test/streams`). Start a game with `docker exec muse-camera-test-agent-1 node -e ...` against
`http://127.0.0.1:8787/api/session`, or film one player by hand inside the camera container:
`node scripts/stream.mjs --camera --player Muse_ab12cd --out /streams/x.mp4 --seconds 45`. Test-only tools in
`deploy/camera-test/` (run on picasso from the synced copy; test world only):

| Tool | What it does |
| --- | --- |
| `camera-bench.sh` | one measured pass: the camera recreated with the `CAMERA_*` given, the fixed route, a stream to an MP4; prints client fps, picture pacing, ffmpeg drops, CPU, RAM and the busiest client threads (`LABEL=x RUN_S=150 deploy/camera-test/camera-bench.sh`) |
| `route.cjs` | the fixed route bot (`Tst_cam_route`, whitelisted for the run); `CHOP=1` also chops, mines and digs at each corner |
| `fb-start.sh`, `stop-fb.sh`, `show.mjs` | a live test to the ingest in `deploy/camera.env` (made on picasso, 600, never printed): the camera with the clock, a hard stop after `FB_MINUTES` (30), a bot that walks, chops, crafts, mines and builds; `stop-fb.sh` stops it early |

`STREAM_CLOCK=1` (test only, off by default) burns a large HH:MM:SS clock (`STREAM_CLOCK_TZ`, America/Los_Angeles)
into the top right of the video, to read the end-to-end delay against a clock on the viewer's screen.

Smoothness, measured on picasso (2026-10-08, load 150-215; `deploy/camera-test/camera-bench.sh`): the same 150 s
route each time (`route.cjs`: a 12-block square in a birch forest, a full turn at every corner, later turning on the
spot), client frames a second from Mesa's HUD (the first 15 s left out), new pictures a second and the gaps between them
from a raw 30 fps grab of the display, the camera container's CPU:

| | client fps (mean / p10 / min) | new pictures, longest gap | CPU |
| --- | --- | --- | --- |
| vanilla, fancy, distance 8, 1280x720 (before) | 8.1-8.8 / 6.9-7.4 / 5.6-6.3 | 8.3/s, 233 ms | 3.95 cores |
| + Sodium | 11.7-12.2 / 10.6-10.7 / 8.6-9.8 | 13.1/s, 133-167 ms | 4.5 cores |
| + 960x540 drawn, scaled up | 12.9 / 11.4 / 8.8 | 14.1/s, 133 ms | 3.7 cores |
| + 16 llvmpipe threads instead of 8 | 11.5 / 9.9 / 7.8 | 13.4/s, 200 ms | 5.7 cores |
| + render distance 6 | 12.8 / 11.2 / 10.2 | 12.6/s, 133 ms | 5.6 cores |
| + fast leaves | 17.8 / 13.5 / 12.0 | 14.4/s, 133 ms | 4.9 cores |
| fast leaves, distance 6 | 22.6 / 18.8 / 15.9 | 22.3/s, 167 ms | 4.9 cores |
| fast leaves, distance 6, 960x540 | 24.4 / 21.0 / 17.2 | 22.8/s, 167 ms | 4.0 cores |
| fast leaves, distance 5 | 24.9 / 22.4 / 19.6 | 24.1/s, 133 ms | 5.2 cores |
| the same + ImmediatelyFast + FerriteCore (distance 6) | 21.1 / 18.2 / 16.1 | 20.5/s, 133 ms | 4.8 cores |
| fast leaves, distance 5, 960x540, 6 llvmpipe threads | 24.5 / 22.9 / 21.7 | 24.9/s, 133 ms | 4.3 cores |
| the same, ZGC (generational) instead of G1 | 22.1 / 11.9 / 9.2 | 20.1/s, 133 ms | 3.9 cores, 2.6 GB |
| the same, 1 chunk builder thread | 24.1 / 11.1 / 10.1 | 9.0/s, 400 ms (chunks late) | 4.0 cores |
| **tuned: fast leaves, distance 5, 960x540, 8 llvmpipe threads** | **29.4 / 28.8 / 25.5** | **26.5/s, 133 ms** | **4.1 cores** |
| the tuned settings again, twice (the defaults now) | 29.1-29.5 / 27.8-28.8 / 24.7-25.0 | 27.0-27.5/s, 67-133 ms | 3.7-4.1 cores, 1.36 GB |

The 30 fps cap is the limit now, at about 4 cores a camera. Runs vary with picasso's load: distance 5 at 960x540 with 8
threads during a load spike (242) dropped to a p10 of 12 for stretches. ffmpeg dropped and repeated no
frames in any run (30.000 fps out). Why these knobs: a JFR profile of the client puts 87 % of the render thread in
native code; without Sodium 95 % of that is `glDrawElements`, with it 84 % is `glMultiDrawElementsBaseVertex`, i.e.
llvmpipe's vertex processing, which runs on the calling thread. So what counts is the vertices on screen (leaves,
distance) and one core's speed; Java is about 13 % of the thread, so JVM flags hardly matter; more llvmpipe threads
only add CPU. Earlier tries without Sodium (2026-10-07): Mesa 25 (bookworm-backports), `mesa_glthread` and Zink on
lavapipe gave nothing. Other numbers (2026-10-07/08): latency from a bot's head turn to the grabbed frame 200-370 ms
(median 261-334 ms by load); one camera 1.3-1.5 GB; parked between games about 2 cores (it still draws the sky), asleep
0. The GPU path is wired (`CAMERA_GL=gpu`: VirtualGL's EGL back end) but cannot run on picasso: its H100s create
OpenGL contexts, yet every framebuffer object is `GL_FRAMEBUFFER_UNSUPPORTED` (on the host and in a container, driver
580.159.03; Mesa passes the same probe) and Vulkan cannot create a device, and both Minecraft and VirtualGL draw into
framebuffer objects.

How many cameras picasso can run: by CPU, at about 4.5 threads each and the 26-86 threads the machine has spare at
load 170-230, 5-15 in theory; in practice 2-4, because each camera's frame rate is one core's speed and drops when the
machine is crowded (the spikes to 240-340). RAM (1.5 GB each) is no limit. Each camera also needs its own account: a second
client under the same name kicks the first (`createCameraPool` names camera 2 `<name>2`, which works only because the
server is offline-mode; that is the operator's call, not a default).

## Live on a Facebook Page (FB_LIVE)

muse.ai's artifact panel blocks `fetch` and WebSocket (CSP `connect-src 'none'`) but plays an iframe of
`https://www.facebook.com/plugins/video.php?href=<video URL>&show_text=false&width=1280` (the owner's test, 2026-10-08;
YouTube embeds fail). So with `FB_LIVE=on` every guest game goes live on a Facebook Page by itself, and `live_view`
returns a static page with that player. The owner's personal profile cannot be driven by the API; a Page can.

- **One channel, one camera** (`src/fb-live.js`, `createLiveChannel`; there is one camera account). A game whose
  first-person view comes up is put on the channel. With no live video running, the channel creates one
  (`POST /{page}/live_videos`, `status=LIVE_NOW`, title "Picasso Lab demo: an AI plays Minecraft (game g...)",
  a description naming the demo and the marker sentence), then starts the camera stream to its `secure_stream_url`
  (Facebook shows a stream only if it connects after the live video exists), reads the video's permalink for the
  embed, and reads the status until Facebook says `LIVE` while our publisher has had `NetStream.Publish.Start`. The
  camera films one game: the one whose `live_view` call came last, else the one it films, else the newest. When the
  filmed game ends, the camera moves to another game on the channel and the title follows; when no game is left
  (game end, lease end, idle end, all reach the channel as the game's end), ffmpeg stops and the live video is ended
  (`end_live_video=true`). The `live_view` reply says this plainly.
- **Failures**: a failed create is tried again after 5 s, 15 s, 30 s, 1 min, 2 min (never retried blindly: a create is
  not idempotent, so a sweep of our open live videos runs first); a refusal only a person can fix (the Page not
  eligible, a dead token, a missing permission) is said in plain words and tried again every 10 min. A stream that
  fails (ffmpeg or the ingest, 7 times in 5 min) or a live video Facebook ends itself (`LIVE_STOPPED`, `VOD`; checked
  every 30 s) is ended and replaced while a game remains.
- **Crash leftovers**: the ids of open live videos are kept in `FB_STATE_FILE` (ids only); at start, those and every
  open live video of the Page whose description carries the marker are ended; a live video the owner starts by hand
  is never touched. An end that fails is tried again every 30 s.
- **The Graph client** (`createGraph`): the Page token comes from `FB_TOKEN_FILE` (the token alone, mode 600; a
  looser file is refused; read again when it changes), goes only in the `Authorization: Bearer` header (never a URL,
  a form or an environment), calls are spaced 300 ms and capped at 900 an hour, a transient error is tried again
  after 1, 2 and 4 s, a rate-limit answer stops calls for a minute, and every error and log row is scrubbed of the
  token and of stream keys.
- **The camera service** (`scripts/stream.mjs --serve` in the camera container) runs the channel; the agent reaches it
  over loopback: `PUT /streams/<id>` (a game), `DELETE /streams/<id>`, `POST /streams/<id>/focus` (`live_view`; a game
  the service lacks after a restart is put on it), `GET /live` (state, game on camera, video and embed URLs; never an
  ingest URL). The agent reports its games every minute; a game not reported for 3 minutes (the agent died) leaves the
  channel, and a restarted service gets its games back and goes live again.
- **`live_view`** (default format `html`): points the camera at the game and waits up to about 40 s (the 45 s reply
  budget less a margin) for it to be live, also when called before the bot is in the world. The reply: one line of
  state (live since, or starting with the last error and when it tries again, or "call live_view again in about 20 s"),
  `Video (plain link): <the video>`, the one-camera sentence, then the page: the player (only Facebook's
  `plugins/video.php`, escaped) above "Live: game g... One camera films the game that asked for the live view last.",
  "Joining: ...", or "Waiting for the next game." (`src/live-page.js`, under 1 KB, no script).
- Log rows: `fb_game`, `fb_game_end`, `fb_live_created`, `fb_status`, `fb_live`, `fb_camera` (the camera moved),
  `fb_live_failed`, `fb_stream_lost`, `fb_live_stop`, `fb_live_ended`, `fb_orphan`, `fb_error` (the Graph call, its
  HTTP status and code, scrubbed).

**Where it goes live (`FB_TARGET`).** `page` (the default, and the long-term setup) posts to the Page with the Page
token, which never expires, and keeps each video. `me` posts to the token owner's own profile with a long-lived user
token: `POST /me/live_videos` with `privacy={"value":"EVERYONE"}` (`FB_PRIVACY`; the video plugin plays only public
videos), and with `FB_DELETE_AFTER` (on by default for `me`) every live video is deleted once it is ended, so the
owner's timeline stays clean. The delete is of the live video object, which takes its recording with it; deleting the
recording's own id is refused on a profile ("publish_actions ... deprecated"). A delete that fails is kept in
`FB_STATE_FILE` and tried again every 30 s and at the next start; the start sweep also ends and deletes our own
leftovers on the profile (the ids in the state file, and our live videos with the marker sentence), never another
video. The profile is the stopgap while the Page is too new to go live (about 2026-12-07); then set `FB_TARGET=page`
with the Page's id and token. A long-lived user token lasts about 60 days: renew it before then with
`node scripts/fb-token.mjs --app-id <app id> --dir <folder> --user` (a fresh short-lived user token from the Graph API
Explorer with `publish_video`; it writes `<folder>/user-token`, 600, and prints the profile's name and id and the
expiry), then copy the file to picasso as below; the camera reads it again when the file changes.

Measured on the profile from the Mac (2026-10-08, `scripts/fb-probe.mjs --target me --privacy SELF`): the live video is
created in 2.9 s and reports `LIVE` at once, before any stream; our publisher's `NetStream.Publish.Start` came 2.6 s
after the create (Facebook's ingest accepts the publisher); the plugin URL answered 200; ended, then deleted with its
recording (both ids then "does not exist"). Because `LIVE` comes before the stream, the channel calls a video live only
after our stream has been accepted for `settleMs` (3 s) as well.

The Page token, once (the owner: a Meta app with the Page, a short-lived user token from the Graph API Explorer with
`pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `publish_video`):

```sh
node scripts/fb-token.mjs --app-id <app id> --dir ~/.config/picasso/fb-page      # then type the App Secret and the token
node scripts/fb-token.mjs --app-id <app id> --dir <folder> --app-secret-file <f> --user-token-file <f>   # from files
```

It exchanges the user token for a long-lived one, reads `/me/accounts`, writes the Page's token (which then never
expires) to `<folder>/page-token` (600, folder 700) and prints only the Page's name and id, the file, the expiry and any
missing permission. The secret and the tokens never go on a command line. One real test from a machine, outside the
game (a test pattern with a clock for 60 s, the status read until live, the plugin fetched without a login, then ended
and deleted): `node scripts/fb-probe.mjs --env ~/.config/picasso/fb-page.env`.

On picasso (staging; production the same with its own folders): the token file at `~/workspace/muse-staging/fb/
page-token` (600; copied over ssh through standard input, never as an argument), mounted read-only into the camera
alone; `deploy/camera.env` (600) with

```sh
FB_LIVE=on
FB_PAGE_ID=<page id>
FB_TOKEN_FILE=/fb/page-token
```

and `STREAM_ENABLED=1`, `STREAM_SERVICE_URL=http://127.0.0.1:7862` in `deploy/.env`; `deploy/push.sh` then starts the
camera profile (only while no other camera container runs: one account, one client). Without `FB_LIVE`, the same
camera films each game to `STREAM_OUT_DIR` (`/logs/streams`) or `STREAM_RTMP_URL`.

Measured 2026-10-08 (`scripts/fb-probe.mjs` from the Mac, Page "Muse plays Minecraft", created that day, app in
development mode): the token works (the Page reads), and the create is refused with `code 200, subcode 1363120,
"Permissions error"`, which Meta's Live Video API reference explains as "You're not eligible to go live. Your profile
needs to be at least 60 days old before you can go live on Facebook" (1363144 is the 100-follower rule). Nothing was
created. So this Page cannot go live through the API until it is 60 days old (about 2026-12-07), unless an older
Page is used. UNVERIFIED until a Page can go live: which statuses a `LIVE_NOW` live video passes through before the
stream arrives, how long Facebook takes to show it `LIVE`, whether the plugin plays a live video for viewers who are
not logged in while the app is in development mode, and whether the plugin needs the video to be live before it
loads (the reply waits for `LIVE` to be safe).

On staging (2026-10-08, `deploy/push.sh`, the staging checks passed each time): the camera runs under its profile
(`muse-staging-camera-1`; the camera-test stack's camera, asleep since 16:03, was stopped first: one account). With the
Page (`FB_TARGET=page`) every create was refused (200/1363120) and said so in `live_view` at once. Staging now runs
`FB_LIVE=on`, `FB_TARGET=me`, `FB_TOKEN_FILE=/fb/user-token` (the owner's long-lived user token, 600, in
`~/workspace/muse-staging/fb/`). Measured through the public `/mcp` (two games, plus the staging check's own game):

| | game 1 | game 2 |
| --- | --- | --- |
| `live_view` called to its answer "live" (the camera already in the world) | 7.1 s | 6.0 s |
| live video created to "live" (our stream accepted 3 s or more) | 10.8 s | about 8 s |
| game ended to the live video ended, then deleted | 1 s, 5 s | about 1 s, 4.3 s |

With the camera starting cold (the staging check's game, the client joining the world in 19.6 s) the live video was
"live" 19.8 s after it was created. Facebook's own thumbnail of the live video shows the real client's picture. The
profile's other videos were never touched (it had none of its own during the test; the sweep matches only ours).
Open: Facebook stored each live video as "Only me" (`privacy.value` `SELF`) although we asked for `EVERYONE`, so the
video plugin answers a viewer who is not the owner with "Video Unavailable. This video may no longer exist, or you
don't have permission to view it." (checked logged out, in three URL forms; Facebook's public sample video plays in
the same check). Facebook caps a post at the audience the owner allowed the app, and an app in development mode may be
capped too (UNVERIFIED which): the owner sets the app's audience to Public (Facebook, Settings, Apps and websites) and,
if that is not enough, switches the app to Live mode. `live_view` reports it ("Warning: Facebook stored this live
video as \"Only me\" ...") and the page says "Live, but Facebook shows this video to its owner only." The owner, logged
in to Facebook in the same browser, may still see it in the muse.ai panel (UNVERIFIED). A fresh worktree needs `server/paper.jar` and `server/plugins` (not in git) before `push.sh`.

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
  `docker image inspect <id>`, then `docker rmi <id>`. picasso's `docker` is a wrapper that refuses every `prune` to a
  user who is not root (it says prune needs sudo and exits 1; checked 2026-10-08): staging's push then prints a note with
  the number of our dangling images left and goes on to its checks (it used to stop there under `set -o pipefail`);
  remove them one at a time with `docker images -q -f dangling=true -f label=org.picasso-lab.app=muse-minecraft` and
  `docker rmi <id>`, or ask the lab admin for the prune.
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
  Staging the same way (its own secret, port 7851). Both stacks have had it since 2026-10-08: the secrets in
  `caddy-config/priv/` (mode 600), the Caddy line `header_up X-Muse-Proxy {file./etc/caddy/priv/<secret file>}` added
  by `deploy/caddy-proxy-line.py`, so the secret itself is never in the Caddyfile (`docs/SWITCH.md`, step 3). Set `WEB_MCP_GAMES_PER_ADDRESS` there once probe T8 has measured how many Muse users share an address.

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
| `MINEAI_DATA_DIR`, `MINEAI_VIEWS` | (none: temporary), `true` | their per-bot SQLite (made mode 700); the live views from inside the host |
| `MINEAI_CARE` | `true` | the body looks after itself between the player's calls (src/mineai/care.js); `false`: only the runtime's reflexes (measurements) |
| `PAPER_DIFFICULTY`, `PAPER_DAYLIGHT` | `easy`, `locked` | read by the compose files from the stack's `deploy/.env` and handed to Paper: the difficulty, and `locked` (the clock stopped at morning) or `cycle` (real days and nights); both set again at every Paper start |
| `MINEAI_KEEP_FAILED`, `MINEAI_DATA_DAYS` | `10`, `3` | a game's bot data and incidents are deleted when it ends, except the last N games that crashed or failed to join; at agent start, game folders older than this many days go |
| `STEP_CAP`, `COST_CAP_RUN`, `COST_CAP_HOUR` | `300`, `1.00`, `3.00` | per run, per run in US$, rolling hour in US$ |
| `ERROR_CAP`, `LOOP_REPEAT` | `8`, `3` | errors in a row (8 leaves room to explore for ore); same call failing (or changing nothing) before a hint |
| `NOTES_PATH`, `ASK_NOTES_PATH`, `SHORT_MEMORY` | `notes.json`, `notes-ask.json`, `8` | long-term notes of the filmed runs, of the Ask brain (viewer requests never write `notes.json`), steps kept verbatim |
| `LOG_DIR` | `logs` | JSONL logs: `run-<time>.jsonl` (run-goal), `run-serve-<time>.jsonl` (`npm start`), `probe-<date>.csv` |
| `STREAM_ENABLED` | `false` | live video of every guest game (section "Live video"); off: nothing is started and nothing changes |
| `STREAM_RTMP_URL` | (none) | `rtmps://...` ingest URLs with their stream keys, comma-separated, one per stream that may run at once; never printed or logged |
| `STREAM_VIDEO_URL` | (none) | the public URLs of the Facebook live videos those ingests feed (same order; one URL serves all): MCP `live_view` returns Facebook's player for it while a game's stream runs (without `FB_LIVE`) |
| `FB_LIVE` | `off` | `on`: every guest game goes live on the Facebook Page by itself, one camera, one live channel (section "Live on a Facebook Page"); read by the process that runs the camera |
| `FB_PAGE_ID`, `FB_TOKEN_FILE` | (none) | the Page's numeric id; the file (600) holding the Page token alone (or, with `FB_TARGET=me`, the long-lived user token; `scripts/fb-token.mjs` writes either); the token is never an environment variable and never logged |
| `FB_TARGET`, `FB_PRIVACY`, `FB_DELETE_AFTER` | `page`, `EVERYONE`, `true` for `me` (`false` for `page`) | where the live videos go: the Page (long-term) or `me`, the token owner's profile; a profile video's privacy (the embed plays only `EVERYONE`); delete each live video after it is ended |
| `FB_GRAPH_VERSION`, `FB_GRAPH_URL`, `FB_STATE_FILE`, `FB_TITLE` | `v23.0`, `https://graph.facebook.com`, `<LOG_DIR>/fb-live-state.json`, `Picasso Lab demo: an AI plays Minecraft` | the Graph API (another URL only on this machine, for tests); where the ids of open live videos are kept; the live video's title before " (game g...)" |
| `STREAM_OUT_DIR` | (none) | without an RTMP URL: every stream is an MP4 file here (local tests) |
| `STREAM_SERVICE_URL` | (none) | the stream container's API (`http://127.0.0.1:7861`); the agent then starts and stops streams there instead of in its own process |
| `STREAM_MAX` | `1` | streams at once (never more than output URLs or than games) |
| `STREAM_FPS`, `STREAM_SCALE`, `STREAM_BITRATE_K`, `STREAM_FAR` | `30`, `0.5`, `3000`, `48` | frame rate; the page renders at 1280x720 times the scale; video kb/s (CBR); how far the bot sees (blocks, fogged) |
| `STREAM_MAX_RSS_MB`, `STREAM_NO_SANDBOX` | `1600`, `false` | the browser is restarted above this RAM; Chromium without its sandbox (in the container) |
| `STREAM_CHROMIUM`, `STREAM_FFMPEG`, `STREAM_FONT` | (found) | Playwright's headless shell or a system Chromium; ffmpeg; a TTF for the caption |
| `STREAM_SOURCE` | `viewer` | `viewer` (prismarine-viewer in Chromium) or `client` (the real-client camera; the camera image sets it) |
| `CAMERA_AUTH`, `CAMERA_AUTH_DIR`, `CAMERA_NAME` | `msa`, (none), (none) | the camera account: `msa` (the login in the auth folder) or `offline` (tests on our own server only, as `CAMERA_NAME`, default MuseCam) |
| `CAMERA_GL`, `CAMERA_GL_THREADS`, `CAMERA_JAVA_THREADS` | `cpu`, `8`, `4` | Mesa llvmpipe or `gpu` (VirtualGL); llvmpipe's threads; the threads the JVM sees |
| `CAMERA_RENDER_DISTANCE`, `CAMERA_MAX_FPS`, `CAMERA_GRAPHICS`, `CAMERA_SCALE` | `5`, `30`, `fast`, `0.75` | the client's video settings (the tuned ones); it draws at 1280x720 times the scale and ffmpeg scales up |
| `CAMERA_MODS`, `CAMERA_CHUNK_THREADS`, `CAMERA_JVM_ARGS` | `sodium`, `0`, (none) | client mods from the image (`deploy/camera/mods.json`; `off` = vanilla); Sodium's chunk builder threads (0: its own choice); extra JVM flags (a collector given here replaces G1) |
| `STREAM_CLOCK`, `STREAM_CLOCK_TZ` | `false`, `America/Los_Angeles` | test only: the wall clock burned into the video |
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
stream. The house bot of the Ask queue stays on our body. Production runs `mineai` since 2026-10-08 (switched with
`docs/SWITCH.md`; section "The switch" below).

Their code stays out of this repo: `mineai/UPSTREAM.json` pins the commit and lists our patches, `mineai/patches/` holds
them, and `mineai/fetch-and-patch.sh` puts the two together in a folder of its own at build time (`mineai/README.md`):

```sh
BUN=/path/to/bun mineai/fetch-and-patch.sh ~/picasso-work/mineai-runtime-11   # clone 2fe1306, the 11 patches, bun install, fork check, typecheck, the patches' tests
node scripts/mineai-fetch.mjs ~/picasso-work/mineai-runtime-11 --check
BODY=mineai MINEAI_DIR=~/picasso-work/mineai-runtime-11 MINEAI_RUNTIME=bun MINEAI_EXEC=/path/to/bun MC_USERNAME=Tst_rv npm start
```

The agent runs that same check when it starts with `BODY=mineai`: a folder that is not exactly the pin plus every patch
of `UPSTREAM.json` (an older build, or a plain clone of theirs) is refused before anything is served.

Our patches: `0001` crafts by confirmed window clicks, so crafting works on Paper (their fork's craft read the result
slot before Paper's burst of slot updates had settled; `mineai/README.md`), `0002` its tests; `0003` lets
`MINEAI_UNRESPONSIVE_MS` (5-120 s) widen their supervisor's 5 s event-loop watchdog for a loaded machine; `0004` makes
their host and its runtime refuse any request without `Authorization: Bearer $MINEAI_HOST_TOKEN` (their host had no
authentication); `0005` takes the player name from `MINEAI_USERNAME` and hands their runtime its bootstrap (which holds
the name) through its environment instead of its command line, so the name is on no command line at all; `0006` lets
their runtime exit once a stop is done (its IPC channel kept it alive until their supervisor's SIGKILL); `0007` never
puts a placed block (a temporary table or furnace, a bed, `place_block`) into a cell the server will not replace: no
flowers (their rule counted them as replaceable, so a table went on a poppy and the server refused it) and snow only as
a single layer; `0008` tries a collect once more when its path search gave up ("no path found", nothing gained or
broken) within 30 s of a landing (the server moved the bot more than 16 blocks: our spread, a teleport, a respawn),
after the chunks around the bot have loaded and a 2 s pause; `0009` never puts a block down beside the bot (a temporary
table or furnace) into a cell a mob is in, and tries the next cell when one moves in first (the soak's bat); `0010`
keeps a build from stopping the runtime's event loop (steps out of the structure that change nothing end the build
after 3, every pass yields) and builds a shelter around the bot (the bot's own cells asked to be air, or the world
already walling it in) instead of refusing the block that closes it; `0011` builds on rough ground: no scaffolding into
the structure, a cell no route reaches tried from places to stand near it before it alone is given up on, a column of
blocks under a wall over a drop or water, solid ground it cannot dig out kept and water left as water (section
"Builds on rough ground").

How a host runs (`src/mineai/host.js`): one per guest game, their `src/server/host.ts` under Node with tsx (their own
dev dependency; Node 24.15 or newer) or Bun (`MINEAI_RUNTIME=bun`, `MINEAI_EXEC`), with `--listen-host 127.0.0.1` on
`MINEAI_PORT_BASE` + slot (never 0.0.0.0; a slot is used only when its host port and both live-view ports are free),
the server and port on its command line, and the player name and a random token per host in its environment only:
every user of the machine can read command lines, and on a whitelisted server the private name is what keeps anyone
else from logging in as the bot. None of our keys, tokens or stream URLs reach it. Ready when its `/health` says the
bot is connected under that name (`MINEAI_START_MS`) and a `/health` without the token is refused (401): a runtime
without patch 0004 or 0005 is never used. Then a heartbeat (`MINEAI_HEARTBEAT_MS`; each unanswered one is logged as
`mineai_heartbeat_miss`): `MINEAI_HEARTBEAT_MISSES` unanswered in a row, a runtime their supervisor gave up on
(`RUNTIME_UNRESPONSIVE`, `RUNTIME_EXITED`), a bot that lost its connection or a process that exited is a crash: the host is started again once (the bot rejoins where it was), a second crash ends the
game ("the body could not go on"); the step that was running fails with `BODY_RESTARTED` ("This step may be what
stopped it: do not send it again from here ... a second stop ends the game"), and a step sent while the host is being
started again answers `NOT_STARTED` at once ("send the step again in a few seconds"). It is stopped when its game ends (end_game, the lease, the operator's
`{"end": true}`, an agent stop) and with the agent even when the agent is killed: the agent closes the host's stdin,
`src/mineai/preload.mjs` turns that into one SIGTERM and lets go of the pipe, and their host ends in milliseconds (it
never calls `process.exit`, so a pipe still read kept it alive until our SIGKILL: every game end used to take 8 s). The
host runs in a process group of its own; after their stop's own allowance (`MINEAI_UNRESPONSIVE_MS` + 5 s) the whole
group is killed, and once the host is gone whatever is left of the group too, so a runtime whose event loop is stuck
never outlives its host or keeps the view ports of its slot. At most `MINEAI_MAX_HOSTS` at once (a closing host no
longer counts; its ports stay taken until its processes are gone). Bot data is temporary unless `MINEAI_DATA_DIR` is
set; then the folder is made mode 700, a game's folders (`<data>/<world>/bots/<uuid of its player name>` and
`<data>/host-incidents/<game>`) are deleted when it ends, except those of the last `MINEAI_KEEP_FAILED` games whose host
crashed or never got ready (kept for diagnosis), and at agent start folders untouched for `MINEAI_DATA_DAYS` go.

What a guest's skill becomes (`src/mineai/skills.js`):

| Our skill | Their action | Notes |
| --- | --- | --- |
| `get_state` | `view_status` | their status in our state text (`renderState`); notable blocks from `view_blocks` (two finds of 8 names, in the background, every 20 s at most) |
| `go_to {x, y, z}` | `navigate` | `BODY_MAX_TRAVEL` checked first |
| `collect {block, n}` | `collect_block` | their search covers every loaded chunk; more than 32 is two calls; `cobblestone` mines `stone` and `cobbled_deepslate` `deepslate` (their collect looks for blocks of the name it is given); the result says how many target blocks were mined and how much of the gain came on the way |
| `craft {item, n}`, `craft_batch {items}` | `craft_item` (recursive), one call per item, in order | a table carried at that point (also one made earlier in the batch) is put down for the item and picked up again (`temporary_workstation`); 2x2 recipes put none down |
| `smelt {item, n}` | `smelt_item`, one call per fuel | at most 24 a call (the schema's maximum, as for our body); fuel as the check plans it (`FUEL_ORDER` and `fuelPlan` in `src/game.js`: one kind after another when one is not enough); a carried furnace put down and picked up, else a furnace within 24 blocks; waits for the whole load |
| `place {block, pos}` | `place_block` | |
| `build {blueprint, material}` | `build_structure` | our blueprints as cells, anchored as our build skill anchors them, by their compass heading; the result gives their audit (placed, dug, cells as the blueprint) |
| `attack {target}` | `collect_mob_drop` (the mob's usual drop, 1) | the fight is read every 2 s and ended as soon as the mob died (their hunt would chase the next one for a drop the first did not give): ok; hostile mobs fought without a shield; `nearest_hostile` from their status |
| `eat {}` | `eat_food` | the best safe food carried, as ours picks it; at 20/20 nothing is sent and the step fails `NOT_HUNGRY` (harmless, as the text says) |
| `say {text}` | `send_message` | |
| `equip {item, to?}` | `equip` | extra skill; what is worn and in the off-hand shows in the state (`wearing: ...; off-hand: ...`, `equipment` in the short state) and an equip changes no inventory count |
| `hunt {mob, drop, n, without_shield?}` | `collect_mob_drop` | extra; never players, villagers, pets or golems |
| `sleep {}` | `sleep` | extra |
| `bucket {action, liquid?, pos?}` | `use_bucket` | extra; the world is shared: lava is never poured (filling is fine), nothing within 32 blocks of where the bot joined (the world spawn) or 4 of another player |
| `chest {action, pos, items?}` | `use_container` | extra; inspect, deposit, withdraw; never a chest another game's bot put down (the bodies record the chests they place) |
| `explore {heading, chunks?, biome?}` | `explore_frontier` | extra |
| `policy {retreat_health?, raw_food?, fight?, night?, armor?, food?, tools?}` | `set_survival_policy` | extra; for the rest of the game, with the revision read from their status; `night`, `armor`, `food` and `tools` are the care's (src/mineai/care.js) and stay in the gateway; none of them: back to the defaults |
| `armor {}` | `craft_item` per piece, then `equip` | extra; the best armor the carried iron, leather, gold or diamonds pay for, then worn with any better piece or shield carried |
| `pick_up {item?, death_items?}` | `pick_up_items` | extra |
| `drop {item, n}` | `drop_item` | extra |

Every call of ours carries a fresh `submission_id`, a fixed one-sentence rationale (their log only) and asks for JSON;
when one of their reflexes holds an idle body (a fight, a meal: their `ACTION_BUSY` with no action id) the body submits
again every 0.5 s until the skill's limit, then says what held it (`HOSTILE_CONTACT` for a fight); the body waits with
`wait_for_action` up to the skill's limit, cancels with `cancel_foreground_action` on stop or
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

On staging on picasso (2026-10-08, play-staging.picasso-lab.com, the image of commit 6e87498 built by
`deploy/push.sh` with the runtime fetched and patched at build time and run with Bun 1.4.2; Paper 1.21.4, seed
71811045, Easy, daylight locked, natural; heartbeat and watchdog at their defaults: 5 s, 3 misses, 5 s; picasso's
1-minute load average 181-237, median 221, over the runs). The same strict harness and bench as above
(`mineai/bench/gateway-iron.mjs`, run in a container of the agent image with `--pid host --network host`, so it reads
the agent's processes from /proc), at the same 10 spots and then the same 8 spots at once, all fresh in staging's world
(it had only been generated within 1,024 blocks of spawn). Bots `Tst_rv_` and random letters. The last column is the
staging run of our own body a few hours earlier (2026-10-08, 02:48-03:41; its spots: the random spread up to 400
blocks from spawn, so not the same spots).

| | `BODY=mineai`, 10 spots one at a time | `BODY=mineai`, 8 games at once | `BODY=ours`, staging, earlier |
| --- | --- | --- | --- |
| strict passes | **8 of 10** | **7 of 8** | 5 of 10; 8 at once: 1 of 8 |
| iron pickaxe made | 8 of 10 | 7 of 8 | 7 of 10; 8 at once: 5 of 8 |
| time, median / max (passes) | 161.1 / 166.5 s | 160.8 / 184.0 s | 132.7 / 157.0 s; 8 at once: 325.5 s (the one pass) |
| deaths | 0 | 0 | 3 |
| MCP calls per game, median | 14 | 14 | 15 |
| where the time goes (median s): first action, logs, all crafts, stone, iron and coal, smelt | 6.3, 32.5, 23.7, 27.8, 35.8, 32.1 | 6.7, 28.2, 24.5, 26.6, 45.9, 32.3 | |
| agent event loop (60 s windows) | p50 0.09 ms, p99 0.5 ms median, 2.0 ms max; longest stall 29 ms | p99 1.4 ms median, 3.6 ms max; longest stall 198 ms | 8 at once: p99 1.0-3.2 s, p50 up to 515 ms, stalls up to 7.0 s |
| hosts | 10 started, ready in 1.6 s (median), 0 heartbeats missed, 0 restarts, 0 watchdog stops | 8 at once, ready in 1.6 s, 0 missed, 0 restarts, 0 watchdog stops | - |
| memory (RSS) | agent 116-120 MB; a host 79 MB at most; a runtime 305 MB median, 321-417 MB at its peak (two outliers: 679 MB in spot 1's 11-minute run, 1,023 MB in spot 7's long path searches) | agent 126-137 MB; hosts 569 MB together; runtimes 310 MB median, 601 MB max, 3.0 GB together at most | |
| CPU (one core = 100%) | agent 0.6% median; a runtime 18% median, 44% p90, 137% max | agent 1.6% median, 12% max; a runtime 17% median, 53% p90, 163% max; all runtimes together 443% at most | |

23 hosts in all on staging that day (the deploy's check, the 18 games above, one re-run, three sessions): 0 heartbeats
missed, 0 restarts, 0 runtimes stopped by their watchdog, so the defaults hold at this load; picasso's load is mostly
niced batch work, and our containers run at normal priority. Their per-bot SQLite took 108 MB for the 23 bots
(`~/workspace/muse-staging/mineai-data`; since the review below, the agent deletes a game's data when it ends).

Every failure, with its cause:
- Spot 1 (1800 0), one at a time: `collect oak_log 6` got 1 log in its 180 s; their SQLite shows the bot travelled 118
  blocks without ever getting more than 11 from where it started, the last minute at (1805, 62.5, -9), in shallow water
  by the shore: their collect's walk going back and forth with nothing to stop it but our time limit. The strict
  harness then went on without a pickaxe, and each `go_to` down (digging stone by hand) ran out its 120 s. The same
  spot was slow on the Mac too (3 logs in 180 s once, 28.7 s on another copy): this spot, not the load.
- Spot 7 (-3049 -1263), one at a time: `craft wooden_pickaxe` failed in 81 ms: "crafting_table: Server processed
  placement, but block at (-3056, 104, -1322) is still poppy". Their `isReplaceableForPlacement`
  (`src/world/block-classification.ts`) counts poppy, dandelion and every other flower as replaceable, so their
  temporary table was put on a flower; the server replaces grass, ferns or vines with a placed block, but not a flower
  (vanilla and Paper alike). A bug in their runtime, hit by chance (the Mac run of this spot put its table elsewhere);
  a patch can drop the flowers from that set. The rest of the route went on without a pickaxe (path searches up to
  their 2 s limit; the runtime's 1,023 MB).
- Spot 6 of the 8 at once (-3825 761): `collect oak_log 6` failed after 2.2 s: "no path found after 234 ms compute;
  visited 5097 nodes", and their collect did not try another tree. The same spot alone afterwards passed (logs in
  30.6 s, the route in 181.1 s), as it did in the Mac's 8-at-once run (30.7 s). Likely (UNVERIFIED): the search ran
  2.3 s after the bot landed in one of 8 fresh regions being generated at once, before the chunks around it had
  arrived, so the region looked closed. Waiting for the chunks around a new spot (we wait a fixed 3 s), or trying a
  collect that found no path once more, would cover it.
- A scripted session through https://play-staging.picasso-lab.com/mcp (start_game, `play_sequence` with a
  `request_id`, the same call again, the same `request_id` with other steps, get_state, `live_view`, end_game):
  `craft_batch {items: [oak_planks 12, stick 4, crafting_table 1, wooden_pickaxe 1]}` after 4 oak logs failed both
  times with their "Missing leaf materials: pale_oak_log x2". We send the whole list as one `craft_item`, and their
  planner treats every listed item as a gain to keep ("one shared inventory plan"): the 12 planks stay, and the stick,
  table and pickaxe need 9 more planks from the 1 log left, so it asks for 2 logs of the first wood it knows. Our
  dry-run check simulates the list in order, each item using what the earlier ones made (as our body crafts it), and
  let the call through. Fixed since: `craft_batch` is one `craft_item` per item, in order, and a table made earlier in
  the list is put down and picked up for the items after it (section "After the review"). The same session
  with separate crafts worked: a stone pickaxe in 72 s, 10 MCP calls, no reply over 34 s; the repeat came back as
  `DUPLICATE` with the first call's steps and ran nothing; the other steps under the same `request_id` were refused
  (`BAD_ARGS`); both live views answered 200 through Caddy; `tools/list` 25.4 KB.

Reproduce on picasso (the runs, their JSON and the load log are in `~/workspace/muse-staging/accept-mineai/runs`;
`SPREAD_SPOTS` and `WEB_MCP_GAMES_PER_ADDRESS=8` go into staging's `deploy/.env` for the measurement only, then out
again; `rsync -az --relative test/e2e mineai/bench picasso:workspace/muse-staging/accept-mineai/` first):

```sh
cd ~/workspace/muse-staging; L=$(ls -t logs | grep run-serve | head -1); P=$(docker inspect -f '{{.State.Pid}}' muse-staging-agent-1)
docker run --rm --network host --pid host --user $(id -u):$(id -g) -v $PWD/accept-mineai:/app/rv -v $PWD/logs:/staging-logs:ro \
  -v $PWD/data/logs:/paper-logs:ro muse-staging-agent node rv/mineai/bench/gateway-iron.mjs http://172.24.0.1:7851 \
  --agent-pid $P --agent-log /staging-logs/$L --server-log /paper-logs/latest.log --label staging-mineai-seq10 --n 10 \
  --out rv/runs                                                       # --parallel --n 8: all at once
```

Not yet: more than 8 games at once, the End lab, Muse itself as the client (the sessions above and the soak's were
scripted), production. A whole 30-minute lease ran in the soak of gate 2 (section "Gates before the switch").

### After the review (2026-10-08)

A review of this body found twelve defects (the two about stopping hosts share a bullet); each is fixed, with a test
in `test/mineai.test.js` (and the fake host models what was missing: a body held by one of their reflexes, a hunt
whose kill drops nothing, worn stacks):

- The private player name was on their host's command line and, inside the bootstrap, on their runtime's (`ps` shows
  every process on picasso, container ones included; the whitelist name is what keeps an offline-mode client from
  taking a guest's bot over). Patch 0005: the name comes from `MINEAI_USERNAME` and the bootstrap goes through the
  runtime's environment. The data folder is mode 700.
- Stopping: the preload's stdin kept their host alive until our SIGKILL (8.0 s on every game end) and a runtime
  whose event loop was stuck could outlive its host and keep its slot's view ports. Now the agent closes stdin (one
  SIGTERM), the host runs in a group of its own that is killed after `MINEAI_UNRESPONSIVE_MS` + 5 s and once the host
  is gone, staging's agent has an init, and patch 0006 lets their runtime exit once its stop is done (its IPC channel
  kept it until their supervisor's SIGKILL, 5 s later). A closing host no longer counts against `MINEAI_MAX_HOSTS`; a
  slot is used only with all three of its ports free, and one found busy is tried again later.
- The host token failed open on a runtime without patch 0004: a host must now refuse a `/health` without it (401) and
  report the bot under its own name, and the agent refuses to start on a runtime folder that is not the pin plus every
  patch.
- Per-game data grew without bound (4.7 MB a game): see `MINEAI_KEEP_FAILED` and `MINEAI_DATA_DAYS` above.
- `craft_batch` sent the list as one `craft_item` (staging failure 4, and a table bought twice when none was carried):
  now one call per item, a table made earlier in the list put down for the items after it.
- A body one of their reflexes held refused the next step at once (`ACTION_BUSY` without an action id), and the queue
  dropped the rest: now waited for, up to the step's limit.
- An attack whose kill dropped nothing chased the next mob of that kind for 60 s and ended `STOPPED`: it now ends at
  the kill, ok.
- A step sent while a crashed host was down reported the whole inventory as gained: now `NOT_STARTED` at once, or the
  restart text, with no change counted.
- The smelt fuel differed from the check's (sticks) and one fuel had to cover the load: `FUEL_ORDER` is shared, and a
  load takes one fuel after another, a call each. `smelt`, `craft`, `craft_batch`, `collect` and `go_to` describe this
  body's behaviour to Muse.
- What is worn or in the off-hand vanished from the state and counted as lost: now `wearing: ...; off-hand: ...`.
- `bucket` and `chest` could harm other guests: lava is never poured, nothing within 32 blocks of the world spawn or 4
  of another player, and no chest another game's bot put down is opened.

Measured on this Mac (local Paper 1.21.4 on 25565, the runtime built with all six patches, Bun 1.4.2): the agent
refused a folder with the four older patches and the spike's unpatched clone; a host started with the name in its
environment joined under it, answered 401 without the token, and neither the host's nor the runtime's command line
held the name or the bootstrap; stopping a host by closing its stdin took 33-41 ms (5.0 s with patch 0005 alone, 8.0 s
before), with and without the live views; the game end in the agent's log took 41 ms, its data deleted, while a game
whose runtime was killed twice kept its data (`data: "kept"`); after the runtime was killed mid-game a step was ok again
4.6 s later (about 9 s before); `scripts/staging-check.mjs` passed (wooden pickaxe in 18.2 s, 3 MCP calls); and staging
failure 4's sequence (collect 4 oak logs, then `craft_batch [oak_planks 12, stick 4, crafting_table 1, wooden_pickaxe 1]`)
ended with the pickaxe and the table carried, both live views answering 200.

On staging (picasso, deployed by `deploy/push.sh` the same day, the image's runtime built with all six patches, under
`docker-init`): the agent started (so the image's runtime passed the start check), the staging check passed (wooden
pickaxe in 19.4 s, 3 MCP calls), `ps` on picasso showed both of their processes of a running game (as root) with no
player name and no bootstrap on either command line, staging failure 4's sequence passed (birch, 22.4 s, the table
carried at the end) with both live views at 200 through Caddy, and the two game ends closed their hosts in 150 and 245
ms (8.00-8.01 s before) with the games' bot data deleted (23 bot folders before and after).

### Gates before the switch (2026-10-08)

The report (`../../../research/muse-reuse-validation.md`) asks for three gates before production plays with this
body. Gate 3 is two runtime patches for staging's two body failures, gate 1 the production config, gate 2 the soak on
staging and one Muse run: the scripted soak passed (below), and so did the Muse run (section "The Muse run on staging"
below) and, after the fixes it led to, the Muse re-test with the `muse-fix` build (game `g42b738`; section "The review
of the fixes and the re-check on staging"). The runbook for the switch itself is `docs/SWITCH.md`.

Gate 3, on this Mac's Paper (1.21.4-232 on 25565, seed 71811045), `mineai/bench/gates.mjs` (one host of the runtime,
their MCP tools, bot `Tst_gate_` and random letters, every placement checked with the server's `execute if block`):

| Check | Runtime with patches 0001-0006 | With 0007 and 0008 (built by `fetch-and-patch.sh`) |
| --- | --- | --- |
| `craft_item wooden_pickaxe` with a temporary table, the 8 cells around the bot holding flowers (poppy, dandelion, cornflower, oxeye daisy, red tulip) | **0 of 5**: "Server processed placement, but block at ... is still poppy" (and the other four), staging spot 7's failure | **10 of 10**: the table 2 blocks away on clear ground, all 8 flowers standing, the pickaxe in the server's inventory, the table picked up again; 2.8-2.9 s a craft |
| `collect_block oak_log 1` from inside a closed barrier box with logs outside, 1 s after a 100-block teleport, and again 35 s after it | no second try either time | **3 of 3**: tried once more right after the landing (the result says so; 2.2-4.4 s instead of 0.9 s), not after 35 s |

Their whole suite with both patches: 1,579 pass, 0 fail (6 of the tests new); typecheck clean. Through our
gateway on the same Paper (`BODY=mineai`, the runtime built with all eight patches): `scripts/staging-check.mjs`
PASS (wooden pickaxe in 21.4 s, 3 MCP calls) and the strict iron route `test/e2e/mcp-iron.mjs` PASS (141.1 s, 14 MCP
calls, 0 failed steps). Staging was redeployed with `deploy/push.sh`: the image (794 MB) built the runtime with all
eight patches, the agent passed its start check, the staging check passed (wooden pickaxe in 22.7 s, 3 MCP calls),
the host was ready in 1.25 s and closed in 222 ms with the game's data deleted. The landing retry itself has not met a
real "no path" after a spread on staging: the soak's 8 games landing at once had none, and a retry that works leaves no
trace once the game's data is deleted.

Gate 1 (`deploy/compose.yaml`, `deploy/push.sh`): production's agent image is built with `MINEAI=1` (the runtime at
the pin and its patches, fetched, built and tested at build time), runs under an init, and mounts
`~/workspace/muse-minecraft/app/mineai-data` (made mode 700 by `push.sh --prod`) at `/mineai-data`; which body plays
comes from production's `deploy/.env` (`BODY`, `MINEAI_DIR`, `MINEAI_DATA_DIR`), and without a `BODY` line it is ours,
so the next deploy changes no game. `push.sh --prod` prints the body, and goes on with a note when picasso refuses the
prune (its remote script now runs with `pipefail`, as staging's). Checked: `npm test`; `docker compose config` of the
production file on picasso in a scratch folder (valid; build args `MINEAI=1`, init, the data folder next to `app/logs`,
no `BODY`); `deploy/push.sh --prod --dry-run`. Production was not deployed. The proxy secret (M0 item 6) and the Paper
whitelist (item 7) are in the runbook: the whitelist goes out with that deploy, the secret in Caddy first and the
agent's `.env` second. Caddy's `{file.*}` placeholder (v2.11.2, FRAS's image, in a throwaway container) sends exactly
a secret file's contents, so the secret stays in `caddy-config/priv/` (mode 700) and out of the Caddyfile (mode 664).

Gate 2, the soak on staging (2026-10-08, the image of commit `109c882` deployed with `deploy/push.sh`: the runtime at
the pin with all eight patches, Bun 1.4.2, under `docker-init`; Paper 1.21.4, seed 71811045, Easy, daylight locked,
natural; heartbeat and watchdog at their defaults; picasso's 1-minute load 160-194, median 175-184 over the runs).
Bots `Tst_gate_` and random letters (`MC_USERNAME=Tst_gate`), 18 fresh spots of staging's world (`SPREAD_SPOTS`, 5,400
to 6,300 blocks from spawn, never generated before; on a same-seed copy on the Mac a spectator probe left out the
spots `spreadplayers` refuses and the ocean ones, nothing else picked), the strict harness and bench of the validation
(`mineai/bench/gateway-iron.mjs`), then two new benches: `mineai/bench/lease-soak.mjs` (one game through its whole
lease with a mixed script, the process tree, the agent's log and the first-person view watched throughout) and
`mineai/bench/muse-session.mjs` (a session in plain HTTP JSON-RPC through the public `/mcp`, as the code Muse writes
for itself). No model; staging only; production was not touched.

| | Validation (staging, the image of `6e87498`) | Soak (staging, the image of `109c882`) |
| --- | --- | --- |
| strict iron route, 10 spots one at a time | 8 of 10 | **10 of 10**, 0 failed steps |
| the same, 8 games at once | 7 of 8 | **6 of 8** (the no-go line is below 6) |
| deaths | 0 | 0 (18 strict games, the lease game, the session, 2 eat probes) |
| median / max time (passes), one at a time | 161.1 / 166.5 s | 168.0 / 179.4 s |
| median / max time (passes), 8 at once | 160.8 / 184.0 s | 166.0 / 209.7 s |
| where the time goes, one at a time (median s): first action, logs, crafts, stone, iron and coal, smelt | 6.3, 32.5, 23.7, 27.8, 35.8, 32.1 | 5.8, 33.3, 23.4, 27.5, 41.2, 32.2 |
| MCP calls per game, median | 14 | 14 (8 at once: 14.5) |
| hosts: heartbeats missed, restarts, downs, watchdog stops | 0 | 0 in all 23 games (ready in 1.2 s one at a time, 1.5 s at once) |
| game end (host closed, data) | 150-245 ms | 115-220 ms, every game's bot data deleted (the data folder keeps the 23 older bot folders it had) |
| agent event loop (60 s windows) | p99 0.5 ms median, 2.0 max; 8 at once 1.4, 3.6 | p99 0.27 ms median, 0.41 max, longest stall 31 ms; 8 at once 0.75, 1.34, 6 ms |
| memory (RSS): agent; a runtime median, max | 116-120 MB; 305 MB, 1,023 MB; 8 at once 126-137 MB; 310 MB, 601 MB (3.0 GB together) | 96-119 MB; 319 MB, 741 MB; 8 at once 113-132 MB; 313 MB, 1,332 MB (3.7 GB together) |
| a whole 30-minute lease | not run | **ended by the lease at 30.0 min**; 0 misses, restarts or deaths; memory flat; `/eyes` up throughout (below) |
| a Muse-like session through `https://play-staging.picasso-lab.com/mcp` | 1 (before the review fixes) | **13 of 13 checks** (below) |

The lease game (`lease-soak.mjs`, run on picasso in a container of the agent image, `/mcp` direct, the live view
through Caddy; spot -3174 -4369, a forest): logs, planks, sticks, a table and a wooden pickaxe; 40 stone; a stone
pickaxe, a stone sword and a furnace; 200 s without calls; `hunt pig porkchop 2` (3 pigs, 4 porkchops); `smelt porkchop
2`; `build hut_3x3 cobblestone`; `say`; 240 s without calls; then six rounds of 3 logs, 4 planks and 120 s without calls
until the lease ended it at 30.0 minutes (`session_end`: "the lease ended"). 40 MCP calls, 25 steps, 24 ok, 1,160 s of
idle stretches (each under the 5-minute idle rule). Its host: ready, 0 heartbeats missed, 0 restarts, closed in 172 ms
with its data deleted. Memory over the 30 minutes did not grow: the agent 132 to 136 MB, the host 68 to 71 MB (75 at
most), the bot's runtime 300 to 310 MB (median 312 MB in minutes 5-10, 310 MB in the last 5; 405 MB at most; CPU median
10.5% of a core, p90 24%, max 61%); the agent's loop p99 at most 0.88 ms, longest stall 5.9 ms. The first-person view:
one socket.io WebSocket through Caddy held from the start to the end, connected once, 0 drops while the game ran, events
in every minute (19,000-28,000 a minute; 704,000 in all, 128 chunk loads), and the page fetched every minute through
Caddy: 29 of 29 answered 200, then 410 once the game had ended.

The session (`muse-session.mjs`, from the Mac through Caddy, while the lease game ran; spot 7200 0): initialize,
`tools/list` (7 tools, 25.0 KB), `start_game` (5.9 s), `live_view` (both views 200 through Caddy), a `play_sequence`
of `collect spruce_log 4` and `craft_batch [spruce_planks 12, stick 4, crafting_table 1, wooden_pickaxe 1]` with a
`request_id` (21.3 s), the same call again 5 s later while it ran ("Already received", `DUPLICATE`, answered when the
first finished; one pickaxe made), the same `request_id` with other steps (`BAD_ARGS`, nothing run), `get_state`, a
second `play_sequence` to a stone pickaxe (17.4 s), a new connection that resumed the game by its handle (the old one
then answered "your game ended: it moved to another connection"), `end_game`, and a call after the end (`NOT_STARTED`).
13 of 13 checks, 15 HTTP calls, the slowest reply 21.3 s, 45 s in all.

Every failure, with its cause:
- 8 at once, run 7 (spot 4455 4455, snowy plains): `collect oak_log 6` ran out its 180 s with no log (8 dirt dug), and
  the strict harness went on without a pickaxe (18 more steps failed or were refused by the dry-run check). The state
  showed no wood nearby, so the harness asked for oak, its default; the nearest oak was about 190 blocks away (the
  nearest spruce 49): on a same-seed copy, a spectator at the spot found no oak within its loaded chunks, and one 2
  blocks from where the bot stood at the end, 186 blocks from its landing. Their collect, which searches every loaded
  chunk, walked to that oak and our time limit ran out as it got there. The spot and the harness's choice of wood, not
  the load: a collect of the nearest wood of any kind would have found the spruce. Not a body defect.
- 8 at once, run 8 (spot 0 6300): every step passed (smelt done 183.6 s after the start) until the last, `craft
  iron_pickaxe`, which failed in 1.3 s: "crafting_table: Placement cell (3, 51, 6322) overlaps bat #44444". In a cave a
  bat flew into the cell their planner had picked for the temporary table; the placement re-checks the cell
  (`occupiedCell` in `src/world/placement.ts`) and fails instead of picking another one. A runtime bug of the same kind
  as the flower (patch 0007): a candidate patch 0009 would take the next free cell, or wait a moment and check again,
  when a mob is in the way.
- The lease game: `build hut_3x3 cobblestone` placed 21 of its 23 blocks; 2 cells (one at -3205 77 -4381, two above
  where the bot stood) were refused when their path search for a place to stand gave up at its 2,000 ms compute limit
  ("no path or usable partial route found; visited 7792 nodes"). Uneven ground at that spot; the game went on.
- The lease game never ate: its food bar stayed at 20 of 20 for the whole 30 minutes (Easy, the saturation of a fed
  start, and work that tires little), so the script's eat waited for a drop that never came (the skill refuses a full
  bar: "not hungry: food is 20/20"). Two short probe games afterwards (not natural: the operator gave the bot a hunger
  effect through the console): with the effect over before the call, `hunt cow beef 2` then `eat` ate one beef, food 13
  to 16; the first probe sent `eat` while a stronger effect still drained the bar, and their eat ate 2 porkchops and
  reported a failure ("eat porkchop at hunger 3") because the bar kept falling: the probe's doing, not the body's.
- Not on staging: one of five plumbing runs of `muse-session.mjs` on the Mac (a scratch Paper with the same seed) had
  `craft stone_pickaxe` fail after `collect stone 3` (which had used one plank); the reason was not kept (the script
  printed only the first line then; it prints every failed step's reason now). The other four, and staging's, passed.
- An operations slip, no game affected: a backup of staging's `deploy/.env` made inside `app/deploy` was deleted by
  the next `push.sh`, whose `rsync --delete` keeps only `.env`, `stream.env` and `camera.env` there. `docs/SWITCH.md`
  now keeps its backups in `~/workspace/<project>/backups` (mode 700).
- A review of the runbook (2026-10-08) found six gaps, each fixed in `docs/SWITCH.md`: the Caddy undo restored a whole
  older copy of the shared Caddyfile (dropping whatever other projects added since, such as that day's poker block) and
  did not say which of two backups; the forward edit moved the new file in even when `caddy validate` failed; step 3
  claimed visitors notice nothing although its agent recreate ends games and every reload drops the live views; two
  backup commands wrote into Paper's root-owned `data/`; a bare agent recreate leaves a running stream or camera in the
  old agent's network namespace; and the undo of step 2 named no commit for the old files. Now
  `deploy/caddy-proxy-line.py` adds or removes only the one header line (validate, a check that nobody saved the file
  meanwhile, then move and reload), `deploy/recreate.sh` is the only agent recreate (idle check, no build, stream and
  camera with it), and section 1 archives production's deployed files for the undo (`backups/app-pre-switch.tgz`).

Against the gate (`docs/SWITCH.md`, section 1): at least 7 of 10 one at a time (10 of 10), at least 6 of 8 at once (6 of
8, at the line), 0 heartbeat restarts and 0 watchdog stops (0 in 23 games), a whole 30-minute lease (yes): the
scripted soak passes. The Muse run (ROADMAP appendix A; the Muse-like session above is a script) passed too: below. Staging's `deploy/.env` is back as it was (`MC_USERNAME=Tst_rv`, no `SPREAD_SPOTS`).

Reproduce on picasso (`rsync -az --relative test/e2e mineai/bench picasso:workspace/muse-staging/accept-gate2/`;
`MC_USERNAME=Tst_gate`, `SPREAD_SPOTS` and `WEB_MCP_GAMES_PER_ADDRESS=8` in staging's `deploy/.env` for the soak only,
then `docker compose -p muse-staging -f staging.compose.yaml up -d` in its deploy folder; the runs, their JSON and the
load log are in `~/workspace/muse-staging/accept-gate2/runs`):

```sh
cd ~/workspace/muse-staging; L=$(ls -t logs | grep run-serve | head -1); P=$(docker inspect -f '{{.State.Pid}}' muse-staging-agent-1)
R="docker run --rm --network host --pid host --user $(id -u):$(id -g) -v $PWD/accept-gate2:/app/rv -v $PWD/logs:/staging-logs:ro -v $PWD/data/logs:/paper-logs:ro muse-staging-agent"
$R node rv/mineai/bench/gateway-iron.mjs http://172.24.0.1:7851 --agent-pid $P --agent-log /staging-logs/$L \
  --server-log /paper-logs/latest.log --label gate2-seq10 --n 10 --out rv/runs --base Tst_gate      # --parallel --n 8
$R node rv/mineai/bench/lease-soak.mjs http://172.24.0.1:7851 --agent-pid $P --agent-log /staging-logs/$L \
  --server-log /paper-logs/latest.log --label gate2-lease30 --public https://play-staging.picasso-lab.com --out rv/runs
node mineai/bench/muse-session.mjs https://play-staging.picasso-lab.com --out session.json   # on the Mac
```

### The Muse run on staging and what it found (2026-10-08)

The owner's run of `docs/MUSE-TEST.md`: Muse in muse.ai, through its own MCP client ("muse-minecraft-mcp 1.0", a
wrapper of its own pointed at staging's `/mcp`), game `g38e5ef`, 20:30:26-20:37:38 UTC. The iron pickaxe was in its
inventory 3:34 after `start_game` (Muse's clock; staging's log has the craft at 20:33:59), then a shelter, a hunted pig,
2 cooked porkchops, and `eat` twice at a full food bar. 12 MCP calls, 0 transport failures; staging's log: 19 steps, 17
ok, 2 failed (both `eat`, "not hungry"), 0 heartbeat misses, 0 host restarts, no death, the host closed in 160 ms with
the game's data deleted. Gate 2 passed. The owner's decision: fix what Muse found unclear or wrong first, re-test on
staging, then switch.

What Muse found, the cause, and the change (each with a test; `mineai/bench/muse-deltas.mjs` replays the actions on
this Mac's Paper with their evidence, since staging's log keeps only each step's whole change and the game's runtime
data was deleted at its end):

| Muse's finding | Cause | Change |
| --- | --- | --- |
| smelt says "at most 24 a call", its schema allows n 1-64 | the schema used the shared 1-64 count, while both bodies load at most `SMELT_PER_CALL` (24) a call | smelt's `n` is 1 to 24 in the schema and both descriptions; `test/descriptions.test.js` checks every bound a description states ("A to B", "at most N", "up to N") against the schema, for every skill of both bodies, the brain's tools and every MCP tool as `tools/list` sends it (numbers that are not argument bounds are listed there with their source) |
| `collect cobblestone 12`: "mined 0 blocks and picked up 12 cobblestone" | we sent `block_name: cobblestone`; their collect looks for cobblestone blocks (dungeon walls, builds, the bot's own scaffolding) and counts the stone it digs on its way there, and their `blocksBroken` counts only target blocks. Bench s1: a cobblestone block 10 blocks into stone, 0 target blocks broken, 12 cobblestone picked up, the block still there | `collect cobblestone` mines `stone` (`cobbled_deepslate`: `deepslate`); s2: "mined 12 stone (stone drops cobblestone) and picked up 12 cobblestone (12 of 12 wanted)". The wording says what was mined as a target and how much of the gain came on the way, never "mined 0" for a gain |
| `craft stone_pickaxe` -2 cobblestone (the recipe takes 3); `build shelter` +9 cobblestone +1 dirt; `collect coal_ore` +7 cobblestone -4 dirt; `hunt` -2 dirt +12 cobblestone | a step's change was their inventory before and after the whole step, so it held everything that came or went meanwhile: stone dug through and dirt placed as scaffolding by the walks (s5: +12 cobblestone on the way to one coal ore 6 blocks into stone), the cells a build digs clear or out of its way (their audit's `dug`), and items picked up during the step (s3: a cobblestone lying in the temporary table's cell, picked up during the craft, gives -2 while their evidence says 3 were used; the local replay below had +1 cobblestone in a stick craft, a late pickup from the collect before it) | the body takes what the step itself used and made from their evidence (`ownChange` in `src/mineai/skills.js`: a craft's recipe steps, a smelt's input, fuel and output, a collect's or hunt's gain, a build's placed blocks, a meal) and the reply gives it first and the rest apart: `used`, `gained`, `other` (section "MCP calls"); `delta` and `changed` stay the whole change. Builds say their audit: "placed 10 cobblestone and dug 2 cells clear" |
| `play_sequence` inserted a crafting table as step 4 and renumbered Muse's steps | replies numbered the steps by their run order | the caller's numbers stay; an added craft is a "+" line "added by the check before step N", in replies, `get_state` and `dry_run` (`step`, `before`) |
| the integration's notes listed only some skills; `hunt` was known only from `start_game`'s reply | the server's own skill list was in `play`'s description and `start_game`'s reply only; the notes Muse wrote for its integration listed fewer (production, on our body, offers 11; the web page and `openapi.json` 10) | the server instructions and `play_sequence` name every skill too, from the same list as `play`'s description and the `skill` enums |
| `eat` failed twice: "not hungry: food is 20/20" | a full bar refuses eat (both bodies) | still a failure, with the code `NOT_HUNGRY` and the words "Harmless: nothing was eaten or used; eat again once food is below 20" |
| (the soak's run 8) "Placement cell ... overlaps bat" | their cell choice for a temporary table ignored mobs | patch 0009 (`mineai/README.md`): bats in the 8 cells around the bot, 0 of 3 before, 3 of 3 with it |

Through our gateway on this Mac (`BODY=mineai`, the runtime with all nine patches, Bun 1.4.2, local Paper 1.21.4 on
25565): `scripts/staging-check.mjs` PASS (wooden pickaxe in 27.0 s, 3 MCP calls); Muse's own calls replayed (its
12-step `play_sequence`, `get_state` until done, `collect cobblestone 8` and `build shelter`, `eat`): the table craft
shown as "+ craft ... (added by the check before step 4 ...)" with steps 1-12 as sent, the iron pickaxe 220.6 s after
the start, every step's own change apart from the rest, `eat` `NOT_HUNGRY`, and the shelter as below.

Found while checking, and fixed after the review below (patch 0010): the shelter. Their builder never sealed the bot
in, and our `shelter` is built around the bot: on open ground it stopped at 9 of 10 blocks ("could not step out of the
structure"), and in a pocket in stone their runtime's event loop stopped until their watchdog ended it
(`RUNTIME_UNRESPONSIVE`; 4 of 4 bench tries, and once through the gateway in the replay above). Muse's shelter on
staging finished in 16.3 s.

```sh
BUN=... node mineai/bench/muse-deltas.mjs ~/picasso-work/mineai-runtime-10b --server <Paper folder with console.in>   # s1-s5, bats; s4 last
```

### The review of the fixes and the re-check on staging (2026-10-08)

A review of the fixes above found seven problems; each was checked against the code with a test first (all seven
held), then fixed:

| Finding | Change |
| --- | --- |
| items the check puts into a `craft_batch`'s list were not marked, although the reply's first line promised "marked + below"; a list they made longer than 12 ran as parts with the same number | the items are named on the batch's line ("the check added to your list: 12 oak_planks, 1 crafting_table, 4 stick for wooden_pickaxe"); parts are numbered "3 (part 1 of 2)" (`part`, `parts`); the first line counts added crafts and items put into a list apart, and promises "+" lines only when there are some; `dry_run` the same |
| a runtime stop told the model to send the same step again, with code `FAILED`; a shelter in a pocket in stone stopped the runtime every time, and a second stop ends the game | code `BODY_RESTARTED`; the text says the step may be what stopped it, not to send it again from there (a build: build in the open), and that a second stop ends the game; and patch 0010 removes the stop itself (`mineai/README.md`) |
| `NOT_HUNGRY` was called harmless, but cancelled every step queued after it | eat at a full bar cancels nothing; eat's description, the queue text and the reply say the steps after it still run |
| earlier steps of several calls in one reply: a one-step play sat under the previous call's header, two calls had the same header, and `n` repeated across calls | every call under its own header ("From your play_sequence #2, sent 41 s ago:"), calls numbered per game, the cancel reason names the call, `call` on each step and on the reply |
| a smelt that failed before its furnace was loaded showed its input as used (their evidence says `requested` even then) | nothing used when nothing was inserted or produced; recovered input and fuel clamped; the words say "nothing was put into a furnace" |
| copper ore and clay drop several items a block, but their own drops were put "on the way" | the most a block drops (`MAX_DROPS`) counts as the targets' own; and a collect that broke more than it picked up says "the drops of 4 were not picked up" |
| everything outside a step's own change was called "on the way (dug through, scaffolding, pickups)", also a tool that wore out, a meal the body took on its own, other drops of a kill | "also changed meanwhile (dug through, scaffolding, pickups, other drops)", with "worn out" and "eaten meanwhile" apart |

The re-check, staging with the `muse-fix` build (runtime with all ten patches; `deploy/push.sh`, its staging check
passed: wooden pickaxe in 20.0 s), fresh spots of staging's world that no bot had visited (24 candidates 8,100 blocks
from spawn probed on a same-seed copy, 14 on land kept, ocean and refused ones left out; `SPREAD_SPOTS`, `MC_USERNAME=Tst_gate` and
`WEB_MCP_GAMES_PER_ADDRESS=8` in staging's `deploy/.env` for the runs only), picasso's 1-minute load 135-244 (median 175, as in the soak):

- Muse's own calls again, without a model, through the public `/mcp` in plain HTTP JSON-RPC
  (`mineai/bench/muse-replay.mjs`): the 12-step `play_sequence` to the iron pickaxe (the wood of the spot for dark
  oak), `get_state` until done, `collect cobblestone 8` + `build shelter`, `hunt pig porkchop 2` + `smelt porkchop 2`,
  `eat` twice, `end_game`. Spot 7015 -4050 (plains; the build of commit `ce24b47`, 0010's first cut): 11 of 11 reply
  checks, the iron pickaxe 224.4 s after `start_game`, 19 steps, 14 ok; the shelter ended "could not step out of the
  structure: 3 routes out ended ... with the bot still held by it" (a clean failure where the runtime would have
  stopped before 0010; it led to 0010's shelter rule), the hunt found one pig ("No loaded pig remained after observing
  porkchop 1/2"), so its smelt was not run. Spot 8100 0 (forest; this build): 11 of 11, the iron pickaxe 211.7 s after
  `start_game`, 19 steps, 17 ok (both failures `eat`, `NOT_HUNGRY`, as in g38e5ef), the shelter built underground in
  11.4 s with its collect ("placed 10 cobblestone and dug 6 cells clear (12 of 12 cells as the blueprint)"). Both
  games: steps 1-12 numbered as sent with the table as "+ craft ... (added by the check before step 4 ...)", every
  step's `gained - used + other` equal to its `delta`, all the deltas of the game equal to the inventory at its end,
  no "mined 0"; 0 heartbeat misses, host restarts or downs, the hosts closed in 201 and 183 ms with the data deleted.
- The strict iron route (`mineai/bench/gateway-iron.mjs`, unchanged), against the soak's numbers:

| | Soak (build `109c882`, 8 patches) | Re-check (build `02ad527`, 10 patches) |
| --- | --- | --- |
| strict iron route, one at a time | 10 of 10 | **5 of 5**, 0 failed steps |
| the same, at once | 6 of 8 | **4 of 6**, then **6 of 8** (8 more fresh spots, 9,000 blocks out; 7 of 8 made the pickaxe) |
| deaths | 0 | **1** (8 at once, run 5, spot 3444 8315, taiga in shade: "was slain by Zombie" 23 s into the game while collecting logs; their hide response did not save it) |
| median / max time (passes), one at a time | 168.0 / 179.4 s | 177.0 / 188.5 s |
| median / max time (passes), at once | 166.0 / 209.7 s | 162.2 / 195.2 s (6), 157.4 / 189.1 s (8) |
| MCP calls per game, median | 14 | 15 one at a time; 15 and 14 at once |
| hosts: heartbeats missed, restarts, downs, watchdog stops | 0 in 23 games | **0** in all 23 games of the day (2 staging checks, 2 replays, 5, 6 and 8 strict), ready in 1.5 s |
| agent event loop (60 s windows) | p99 0.27 ms median, longest stall 31 ms; at once 0.75 ms, 6 ms | p99 0.28 ms median, longest stall 9.6 ms; at once p99 at most 2.3 ms, one stall of 202 ms (the window of 6 game starts) and one of 251 ms (the window of the agent's own start and 8 game starts; the validation build had 198 ms at 8 at once) |
| memory (RSS): agent; a runtime median, max | 96-119 MB; 319, 741 MB; at once 313, 1,332 MB (3.7 GB together) | 113-117 MB; 310, 441 MB; at once 123-134 MB; 315-319, 769 MB (3.3 GB together) |

Every failure, with its cause (none in the code this branch changed, none in the gateway):
- 6 at once, run 6 (spot 0 -8100, snowy taiga on a slope): `collect stone 12` ended "only partly done: Mined 17 blocks
  and collected 5 of the 12 requested; the rest were mined but never recovered" (their collect; the reply now says
  "the drops of 12 were not picked up"), so the furnace lacked cobblestone and the strict harness, which never retries,
  went on to the dry-run check's refusals.
- 6 at once, run 1 (spot -4050 7015, birch forest by water): during `collect stone 12` the inventory lost 8 spruce
  planks, the crafting table and a log (the reply: "also changed meanwhile ...: -1 spruce_log, -1 crafting_table, -8
  spruce_planks"); their emergency hide builds walls from carried planks among other blocks (`HIDE_CAP_BLOCKS`; the soak
  lost 1-3 planks the same way), so `craft stone_pickaxe` was refused before it ran (a table needs a log), and the
  harness's walks down for iron then wore out the wooden pickaxe.
- 8 at once, run 2 (spot 8315 3444, dark forest): `craft stick 8` failed "evade response for zombie ... creeper" (their
  reflex took the body in the shade); the pickaxe was made, the strict count fails it.
- 8 at once, run 5: the death above; after the respawn at the world spawn the harness's steps were refused or ran out
  of time.
- Not a failure, the replay at spot 7015 -4050: the shelter of 0010's first cut ("3 routes out ended ...") and a hunt
  that found one pig.

Against the validation's no-go lines (`../../../research/muse-reuse-validation.md`): one at a time at least 7 of 10 (5
of 5 today, 10 of 10 in the soak), at once at least 6 of 8 (6 of 8; with the 6-game run 10 of 14, 71%), no heartbeat
restart or watchdog stop (0 in 23 games), a Muse run that finishes the iron route (g38e5ef). No line is crossed; the
death (1 in 21 strict games today, 0 in the soak's 23; our body had 3 in 28 in the validation) and the 6-game run are
the numbers to watch. Staging's `deploy/.env` is back as it was (`MC_USERNAME=Tst_rv`, no `SPREAD_SPOTS`); staging keeps
running this build.

The owner's Muse re-test on staging with this build (`02ad527`, ten runtime patches; `docs/MUSE-TEST.md`, the same
prompt), game `g42b738`, 2026-10-08 23:40:26-23:47:41 UTC, Muse's own client (`muse-minecraft-mcp 1.0`): the iron
pickaxe 3:16 after `start_game` (3:34 in g38e5ef), every step of the iron route ok (13 of 13), no death, 0 heartbeat
misses, host restarts or downs, the host closed in 172 ms with the data deleted. Of its 21 steps 15 were ok; the other
six: `build hut_3x3` three times and `build shelter` on rough ground (1-3 cells refused each, their path search for a
place to stand timed out at 2,000 ms, as in the soak's lease game) and `eat` twice at 20/20 (`NOT_HUNGRY`). Neither is
part of the gate (`docs/MUSE-TEST.md`): **gate 2 passed with the `muse-fix` build**, the last condition of the switch.

### The switch (2026-10-08)

Production switched to `BODY=mineai` on 2026-10-08 between 23:51 and 23:58 UTC with `docs/SWITCH.md`, sections 1-4,
every step with production idle (`Bots in use: 0 of 8`) and its checks passed:

| Step | Checks |
| --- | --- |
| 1. pre-checks, backups | gate 2 passed (`g42b738`, above); `npm test` 271 pass, 0 fail (273, 2 skipped); `deploy/push.sh` (staging, commit `68c72fa`) PASS; staging's runtime `2fe1306 with 10 patches`; `/ssd2` 151 GB free; no `stream.env` or `camera.env`. Backups in `~/workspace/muse-minecraft/backups` (`.env`, `server.properties`, `app-pre-switch.tgz` 138 MB, mode 600) and the `pre-switch` tags of both images |
| 2. deploy (`deploy/push.sh --prod`) | `production body: ours`; a production game PASS (wooden pickaxe in 20.9 s, 3 MCP calls); `white-list`, `enforce-whitelist`, `hide-online-players` all `true`; 2 whitelist add/remove lines; the image's runtime `2fe1306 with 10 patches`; init `true`; `mineai-data` mode 700; `body: Mine AI MCP` 0 times |
| 3a. proxy secret, staging | `caddy-proxy-line.py add staging` (the one line, `Valid configuration`, reloaded); the agent recreated; 200, forged header 200, past Caddy 403, 0 warnings; `deploy/push.sh --check` PASS |
| 3b. proxy secret, production | the same for `play.picasso-lab.com`: 200, 200, 403, 0; a production game PASS |
| 4. the switch | `body: Mine AI MCP from /opt/mine-ai-mcp, one host per guest game on 127.0.0.1:27100+ (at most 8)`; a production game PASS (wooden pickaxe in 17.7 s, 3 MCP calls); the host ready in 1.8 s, closed in 169 ms (`the game ended`, 0 restarts, data deleted); 0 heartbeat misses, restarts, downs; no private name on a command line during the game; the page 200 |

After it, through the public `https://play.picasso-lab.com/mcp`: the strict iron route (`test/e2e/mcp-iron.mjs`,
game `g00a4c0`) **PASS in 152.4 s, 14 MCP calls, 0 failed steps**; the first-person view (`/eyes`) 200 and its
socket.io WebSocket held for 15 s (9,117 events); the other sites behind the same Caddy as before (lab, flashevolve,
tritongym 200, poker's `/v1/health` 200, play-staging 200); the agent's log over the first three games: 0 heartbeat
misses, host restarts or downs, every host closed with its data deleted, no death. Our five dangling images (staging's
earlier builds) were removed one at a time with `docker rmi`; five dangling images of the camera test project stay
(not this stack's). Rollback, one line from the Mac: `docs/SWITCH.md`, section 5.

```sh
node mineai/bench/muse-replay.mjs https://play-staging.picasso-lab.com --out replay.json      # on the Mac
# on picasso, as for the soak (section "Gates before the switch"), with accept-musefix for accept-gate2:
$R node rv/mineai/bench/gateway-iron.mjs http://172.24.0.1:7851 --agent-pid $P --agent-log /staging-logs/$L \
  --server-log /paper-logs/latest.log --label musefix-seq5 --n 5 --out rv/runs --base Tst_gate   # --parallel --n 6
```

### Builds on rough ground (2026-10-08, patch 0011)

The Muse re-test on staging (`g42b738`) left every build short: three `hut_3x3` and a `shelter` in a gravel pocket its
iron route had dug near -178 62 56, 1-3 cells each "refused" with "search timed out after 2000 ms compute (limit 2000
ms); no path or usable partial route found"; each retry started a new hut facing the way the bot then looked; and the
third reply was cut 400 characters in ("-178,64,58: sea (placed ...", its parenthesis never closed), which read as a
cell of sea water. `mineai/bench/build-spots.mjs` plays our blueprints at that very spot on this Mac's Paper (same seed
as staging, the tunnels of the Muse game carved from staging's region file) and at a cave mouth, a slope and a pond
edge, every try from the same saved terrain, every cell checked on the server. It reproduced F1 and F3 cell for cell.

| Cause (found with the runtime's own build loop traced at the spot) | Change |
| --- | --- |
| a route out of the hut put dirt scaffolding into a wall cell it had just dug; the cell's only open face was then on the far side | patch 0011: no scaffolding into any cell of the structure (the movement policy's `noScaffoldCells`) |
| a search for any workable cell that failed (2 s) gave up on whichever cell was nearest the bot, not the one it was for | 0011: that cell is tried from up to 3 places to stand within reach of it (open now, nearest the bot first, for a dig only where a face can be seen), each with a 5 s search (sliced between turns of the event loop like every search), 12 such routes a run; only then is it given up on, alone, as "unreachable" with what was tried |
| a roof or wall cell of stone buried by its neighbours could not be dug from anywhere | 0011: a cell asked for a block that holds solid ground it cannot dig out keeps that block (`kept`, counted done, reported) |
| on a slope a hut whose walls stood over a 2-4 block drop placed none of its 23 blocks ("nothing solid to place against") | 0011: a column of up to 4 blocks under such a cell from the ground (dirt or another carried scaffold block that is not the structure's material, else spare material; `supports` in the audit) |
| standing in a pond, the hut's door and inside cells held water; a dig of water settled at once without removing it and the loop never yielded: their watchdog ended the runtime (`RUNTIME_UNRESPONSIVE`, the bench's 5 s window, production's default); a shelter there: the bot floats half a block up, into the roof cell, and the placement was refused | 0011: a cell to clear that holds water is left as water (`water`, counted done); a cell that fills again after 3 digs is given up on; every cell worked yields to the event loop first; a placement into a cell the bot's own body reaches into lets go of jump and waits up to 1.5 s for the body to settle |
| each retry built a new hut facing the bot's new heading; nothing in the description said so | the gateway remembers the structure a build of this game left incomplete: `build` again with the same blueprint and material within 12 blocks of it (a shelter: where it was built) sends the same cells and says "continued the hut_3x3 begun facing south at ..."; the skill's description says so |
| the reply was their error text cut at 400 characters | a build's reply is made from its audit: "24 of 27 cells done; could not reach 2 cells (-176,64,58; -177,64,58): 3 places to stand tried: path search gave up after 5 s"; "1 cell kept the stone already there", "2 cells to clear are water", "put 2 dirt under walls"; any long reply is cut at a clause with "..." and every bracket it opened closed (`cut` in `src/mineai/skills.js`); "1 was refused", not "1 were refused" |

Measured (`mineai/bench/build-spots.mjs`, this Mac's Paper; the table per spot is in `mineai/README.md`, "Patch 0011
on Paper"): the 16 spot and blueprint pairs, the runtime with 10 patches **12 of 32 complete, 4 runtime stops** (every
build standing in the pond), the runtime with 11 patches **48 of 48 complete** (33 with every cell exactly the block
asked for, the rest with a cell of stone kept or a cell to clear left as water), **0 runtime stops**; the runtime's
event loop during the builds: longest delay 17.8 ms. F1's two cells: the wall cell placed, the roof corner of stone
kept; F3's two roof cells of stone kept (each buried in stone and in the hut's own blocks: no place within reach can
see a face of it).
Their suite with 0011: 1,595 pass, 0 fail; `npm test`: 278 tests, 276 pass, 0 fail, 2 skipped.

Staging (`deploy/push.sh`, its check PASS: wooden pickaxe in 17.6 s; runtime `2fe1306 with 11 patches`), through the
public `/mcp` with `mineai/bench/build-staging.mjs` (a wooden pickaxe, 43 cobblestone, a stone pickaxe, then the
builds; `SPREAD_SPOTS` in staging's `deploy/.env` for the run only, removed after):

| Game | Spot | hut_3x3 | shelter |
| --- | --- | --- | --- |
| `g83e35a` | the re-test's gravel pocket (-176 61 52, the tunnels and partial huts of g42b738 still there) | ok in 40.3 s: placed 15, dug 19 clear, 21 exact and 6 kept the stone already there | ok in 7.7 s: 11 exact, 1 stone kept |
| `g46e86c` | a grass slope with dark oaks (-180 70 -27) | ok in 4.4 s: 27 of 27 | ok in 0.1 s (beside the hut: 2 placed) |
| `g25bf43` | a pond's bank (-90 63 -13) | ok in 1.4 s: 27 of 27, "put 1 dirt and 3 cobblestone under walls that had nothing to place against" | ok in 1.5 s |

13 of 13 reply checks (`RESULT PASS`). An earlier run (the first deploy of this branch) found two things fixed since:
the first build in the gravel pocket stopped when the wooden pickaxe wore out and its reply named 22 cells "holding
stone" without saying why (now: "the build stopped: your wooden_pickaxe wore out (no pickaxe remains); carry a better
tool and build again to continue it"); and `build hut_3x3` again from there **continued the same hut** ("continued the
hut_3x3 begun facing east at -176 61 52") and completed it. A hut built standing in the sea after a walk ran out of air
(2195 62 2012) completed with 2 cells left as water and 4 blocks put under its walls. The strict iron route through the
public `/mcp` after the runs: **PASS in 155.7 s, 14 MCP calls, 0 failed steps** (`g39ca3d`). Staging's logs over the
12 games since this branch was first deployed there: 0 heartbeat misses, host restarts or downs, no death.

Production then got it with `deploy/push.sh --prod` (`docs/SWITCH.md`, section 7), idle (`Bots in use: 0 of 8`), the
running image tagged `muse-minecraft-agent:pre-0011` first: staging again (its check PASS, wooden pickaxe in 23.0 s),
then production: `production body: mineai`; its runtime `2fe1306 with 11 patches`; a production game PASS (wooden
pickaxe in 33.1 s, 3 MCP calls, `g5d270e`); one build game through the public `/mcp`
(`build-staging.mjs --production --games 1`, `g160515`): `RESULT PASS`, 5 of 5 checks, the hut ok ("placed 18
cobblestone and dug 17 cells clear (22 of 27 cells as the blueprint; 5 cells kept the stone already there ...)") and
the shelter ok; 0 heartbeat misses, host restarts or downs, both hosts closed with their data deleted. Undo (picasso):
`docker tag muse-minecraft-agent:pre-0011 muse-minecraft-agent:latest && sh
~/workspace/muse-minecraft/app/deploy/recreate.sh production`. Our dangling images of the three deploys were removed
one at a time with `docker rmi`; the camera test project's five stay.

```sh
BUN=... node mineai/bench/build-spots.mjs ~/picasso-work/mineai-runtime-11 --server <Paper folder with console.in> --tries 3
node mineai/bench/build-staging.mjs https://play-staging.picasso-lab.com --games 3 "--go=-176,61,52;-180,70,-27;-90,63,-13"
```

### The bot looks after itself (ROADMAP M4, 2026-10-09)

The world can now run its real day and night on Normal: the body keeps itself alive while Muse is busy or slow, and
says what it did. The runtime's own reflexes already fight, flee, hide, eat carried food, swim up for air, leave fire
and keep their footing, during a step and between steps. `src/mineai/care.js` adds what needs a plan over minutes,
made only of the runtime's own actions (`sleep`, `build_structure`, `collect_mob_drop`, `smelt_item`, `eat_food`,
`craft_item`, `equip`, `pick_up_items`, `navigate`), and acts only while no step of the player's runs (3 s after the
last one ended), yielding at once to the next step (its action cancelled through their cancel and its result read
first, as their result gate wants). In order, what it does when nothing else needs the body:

| What | When | How |
| --- | --- | --- |
| a death's items | it died within the last 4.5 minutes (their items despawn after 5) and respawned within 600 blocks (new bots land up to 400 from the world spawn, where they respawn) | `pick_up_items {recover_death_items}`, once more 10 s after a walk that found no way through; the only care action a step waits for (the step's time starts after it) |
| armor | it carries a better piece than it wears, or a shield and an empty off-hand | `equip`, each piece to its slot |
| food | food 14 or less (or hurt and below 18, which healing needs) and something safe to eat | `eat_food`, raw meat too (their hunger reflex keeps raw meat for emergencies) |
| | no food at all, food 14 or less in daylight (6 or less at night) | hunts the nearest cow, pig, sheep or rabbit within 32 blocks for 3 meat (`collect_mob_drop`), cooks it when it carries a furnace and fuel, eats |
| tools | a pickaxe, axe, shovel or sword with 6% of its life (or 6 uses) left and no other one with more | a spare of the best tier up to its own that what it carries pays for (`craft_item`, planks, sticks and a table made on the way) |
| armor | the player has left it alone for 30 s, and leather, or iron beyond 6 ingots (kept for a pickaxe and a bucket), pays for a piece better than it has | chestplate, leggings, boots, helmet in that order, crafted then worn; never diamonds or gold by itself |
| dusk | time of day 10800 to 12300 (the last minute of daylight) with fewer than 13 blocks for a shelter and no bed | collects them while it can see: stone (cobblestone) with a pickaxe, else dirt (`collect_block`); a bot with no blocks and no pickaxe on rock could not dig in either (staging) |
| night | time of day 12300 to 23300 (beds take a player from 12542) in the overworld | with a bed it carries and no hostile mob within 10 blocks: `sleep` (the night passes when no other player is awake), then the bed is picked up again; otherwise, and when the night did not pass: a closed shelter (`build_structure` without digging out anything: a cell that already holds a solid block is wall enough) of carried blocks, cobblestone first, around the bot, with a one-block pocket in front of its feet for a temporary crafting table or furnace (a craft at night works inside it), 13 blocks on open ground; with fewer than 13 blocks it first digs two blocks down and the ground is the wall (where it cannot dig in, on a tree or on rock with no pickaxe, it collects dirt for walls). It stays inside until the next call; one that will not close is tried at most three times a night |

Two settings of the runtime's own go with it: their fight reflex may wall itself in when badly hurt even without food
to heal with (`hide: when_exposed`; their default `when_recovery_possible` needs carried food or a full bar first, and
a hurt bot with neither ran on and died on staging), and it protects itself from 10 health on instead of 8
(`critical_health`; two arrows of a skeleton on Normal kill from 8: a lab death on the Mac). Their policy goes back to
its defaults at a death, a change of dimension or the player's `policy {}`, so the care sets both again within seconds
(a `retreat_health` the player set stays); `MINEAI_CARE=off` leaves them alone.

During a step, two things keep a tool from breaking in the middle of it: a `collect` of blocks a pickaxe mines gets a
spare first when the best pickaxe has fewer uses left than the blocks asked for plus 4 ("on its own first: crafted a
spare stone_pickaxe (your stone_pickaxe had 5 uses left, too few for 12 stone)"), and a pickaxe that breaks anyway
(their `TOOL_TIER_LOST`) is replaced from what is carried and the collect goes on with the rest ("your stone_pickaxe
broke after 4 of 10 stone; on its own: crafted a new stone_pickaxe and went on with the other 6"), at most twice a step.

What Muse sees: every reply carries what the body did by itself since the last reply that reached the client, once,
oldest first, as text ("On its own since your last reply (the body, not a step of yours):", a line each: "- 41 s ago,
on its own, shelter: night (time 13287): closed itself in at 10 71 247 (placed 3 blocks, 3 wall cells already solid);
it stays inside until your next call") and as `structuredContent.onItsOwn` (`source` care or reflex, `kind`, `ok`,
`text`, `agoS`). The runtime's reflexes come from their event log (`read_recent_events`, read every 4 s): a fight of
many short contacts is one line ("fought zombie and killed one; fled from creeper; 1 explosion near it; health 20 ->
4.6"), with meals, air, fire, footing, a tool about to break or broken, and deaths with the server's cause; a reflex
that interrupted a step is left to that step's own result (it says "on its own: ..." already), and chat is never read
into a reply. The state says what the body does by itself right now ("on its own now: sheltering for the night") and
the last thing it did; the short state has the time of day (`time`). The server instructions say the body looks after
itself and that the policy skill changes it.

`policy` takes four more knobs, kept in the gateway (never sent to the runtime) for the rest of the game: `night`
(shelter, off), `armor` (craft, wear, off), `food` (hunt, eat, off), `tools` (spare, off); no arguments puts these and
the runtime's back to the defaults. A new extra skill, `armor {}`, crafts the best pieces what is carried pays for
(iron, leather, gold or diamonds, nothing kept back) and puts them on with any better piece or shield carried.
`MINEAI_CARE=off` turns the care off (only the runtime's reflexes act), for measurements. The world: Paper's
difficulty and daylight come from `PAPER_DIFFICULTY` (default easy) and `PAPER_DAYLIGHT` (locked or cycle, default
locked) in the stack's `deploy/.env`, and `deploy/paper-entry.sh` sets both again at every start (a world that was
locked stays locked otherwise: the game rule is saved in the world).

Measured on staging (picasso, 2026-10-09; `deploy/push.sh`, its check PASS; Paper 1.21.4, seed 71811045, **Normal,
daylight cycling**, set with `PAPER_DIFFICULTY=normal` and `PAPER_DAYLIGHT=cycle` in staging's `deploy/.env`; the
runtime `2fe1306 with 11 patches`, no runtime change). Natural: fresh spots 12,000 blocks from spawn that no game had
touched (land spots found on a same-seed copy on the Mac by spreading an armor stand there, ocean ones left out; never
generated on staging), no console commands, 8 games at once through the public `/mcp`, each from an empty inventory
through its whole 30-minute lease (1.5 in-game days, so one whole night) with the slow scripted player of
`mineai/bench/survive.mjs` (wood, wooden and stone tools, a furnace, then silences of 150-240 s, each followed by
get_state and now and then a small task: 3 logs, 6 stone, 4 dirt, a walk, some of them at night). The baseline is the
same build with `MINEAI_CARE=off` (only the runtime's reflexes), at its own 8 fresh spots of the same ring.

| | baseline: care off | care on, build `3c25a22` | care on, build `8a0d855` (this branch's src) |
| --- | --- | --- | --- |
| when the games began | morning (time 3000) | morning (time 70) | the middle of the night (time 18800) |
| games, passes (the lease ended it and the bot never died) | 8, **6** | 8, **7** | 8, **5** |
| deaths (server log) | 2: drowned, shot by a skeleton, both idle at night between calls; neither said in a reply | 1: a bot that found no wood (no tools, no blocks), shot by a skeleton at night while it dug in | 3: two killed in the first night they joined in (a zombie while it collected dirt for walls; a skeleton at health 8 by day after that fight), one shot by a skeleton in the second night as zombies kept taking its shelter build over |
| nights lived through | 8 | 8 | 8 |
| health at its lowest, median (min) | 18 (2) | 12.3 (7) | 20 (8) |
| what it did on its own (replies) | nothing reported | 27 shelters, 3 flights, 1 hide, 1 fight, the death and its recovery | 35 shelters, 6 dusk gatherings, 2 hides, 2 flights, 1 fight, 2 tool warnings, 3 deaths and their recoveries |
| sheltered after dusk, p50 / p90 / max | - | 2 / 201 / 201 s | 4 / 461 / 479 s (when a step of the player's ran at dusk, the shelter waited for it) |
| a care action's time, p50 / p90 | - | 2.9 / 41.7 s | 2.3 / 24.4 s |
| told in a reply / done before the game's last reply | - | 34 / 40 (the bench counted later ones too then) | **55 / 55** |
| steps ok, step time p50 / p90 | 112 of 121, 13.0 / 30.7 s | 105 of 116, 14.9 / 35.2 s | 86 of 110, 14.8 / 34.5 s (bots that joined at night lost their first steps to mobs) |

**Against the gate (ROADMAP M4, "Acceptance of the survival step"): not met.** The care on cut the deaths from 2 in 8
(baseline) to 1 in 8 with a day start, but a night start cost 3 in 8, and the gate allows at most 1 death in 16
games. What kills: skeletons (4 of 6 deaths), and zombies close by that keep taking a shelter build over; bots with no
tools or blocks are the weakest. Production keeps easy and locked daylight and was not changed. Not yet run on staging:
the prepared labs (`survive-labs.mjs`; on the Mac's copy of the world, 4 trials each with an earlier build: hunger 3/4,
shelter 3/4, armor 4/4, tool 4/4, bed 4/4, death 3/4, zombie, skeleton and creeper 2-3/4 with one lab death to a
skeleton; prepared, on the Mac, not evidence for the gate).

```sh
# on picasso (staging's deploy/.env: PAPER_DIFFICULTY=normal, PAPER_DAYLIGHT=cycle; for a run only: SPREAD_SPOTS,
# WEB_MCP_GAMES_PER_ADDRESS=8, MC_USERNAME=Tst_m4, and MINEAI_CARE=off for the baseline, then the agent recreated)
rsync -az --relative test/e2e mineai/bench picasso:workspace/muse-staging/accept-m4/          # on the Mac
cd ~/workspace/muse-staging; L=$(ls -t logs | grep run-serve | head -1)
docker run -d --name m4-care-a --network host --user $(id -u):$(id -g) -v $PWD/accept-m4:/app/rv -v $PWD/logs:/staging-logs:ro \
  -v $PWD/data/logs:/paper-logs:ro muse-staging-agent node rv/mineai/bench/survive.mjs https://play-staging.picasso-lab.com \
  --label care-a --games 8 --stagger-ms 5000 --agent-log /staging-logs/$L --server-log /paper-logs/latest.log --out rv/runs
# the labs: the console through the compose volume, the lab spots 15,000 blocks out, no SPREAD_SPOTS
docker run -d --name m4-labs --network host --user $(id -u):$(id -g) -v $PWD/accept-m4:/app/rv -v $PWD/logs:/staging-logs:ro \
  -v $PWD/data/logs:/paper-logs:ro -v muse-staging_console:/console muse-staging-agent node rv/mineai/bench/survive-labs.mjs \
  https://play-staging.picasso-lab.com --console /console/console.in --agent-log /staging-logs/$L --server-log /paper-logs/latest.log \
  --labs hunger,shelter,bed,zombie,skeleton,creeper,armor,tool,death --n 20 --parallel 8 --spots "15000 0; 14712 2926; ..." --out rv/runs
```

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

- The care (section "The bot looks after itself", ROADMAP M4): not yet with Muse itself as the player (the runs are
  scripted), not in a private world (M3), not past one 30-minute lease (1.5 in-game days: phantoms come after three
  nights without sleep), not in the Nether or the End (no night there; its shelter is never built there), and not with
  several guests' bots trying to sleep in the same shared world (the night passes only when every player sleeps; each
  bot that lay down for nothing shelters after).

- The day-0 fixes (2026-10-07) ran on this Mac only: `npm test`, and against the local Paper server through MCP (two
  strict iron-pickaxe runs: one PASS in 214 s with 15 calls and no failed step; one FAIL: the crafting table vanished
  while `craft stone_pickaxe` tried to place it, 15.5 s in `place`, and the run went on without a stone pickaxe; two
  simultaneous starts; the live views under view ids, recorded through the streamer). The agent image has since been
  built on picasso (staging, with and without the Mine AI MCP runtime) and the prune in push.sh run there: picasso
  refuses it to non-root users (section "Deploy on picasso"). Not yet: the proxy secret behind the real Caddy (the agent sees the Docker gateway, not Caddy's
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
  files. Not yet: the stream container (no Docker here: `deploy/Dockerfile.stream` and the compose service are
  unbuilt), SwiftShader's speed on picasso's EPYC cores, and long streams (the longest run was 4 min).
- Facebook live (`FB_LIVE`): the Graph flow, the channel, the service, `live_view` and the token helper against a fake
  Graph API (`test/fake-graph.js`); the RTMP publisher against ffmpeg's own RTMP server, over TLS, with real ffmpeg and
  a scan of every command line (on the Mac, and inside the camera image on picasso). The real Page answers reads, but
  refuses to go live (code 200/1363120, 2026-10-08: the Page is new). Not yet: Facebook's ingest accepting our
  publisher (librtmp-style simple handshake; UNVERIFIED), the statuses and the time to `LIVE`, the plugin for viewers
  not logged in while the app is in development mode, and the page inside the muse.ai panel.

## Safety rules

- No code execution from model or viewer text: skills are a fixed whitelist and every argument is checked against its
  schema before it reaches the game. `say` cannot start with `/` or a space and cannot contain `§` (the server kicks
  for it).
- Viewer text never reaches long-term memory: the Ask brain has its own notes file and lessons hold only tool names,
  fixed block and item names and numbers. Viewer text goes to the Standard tier unless the operator opts in.
- Minecraft stays on localhost/LAN (any other `MC_HOST` is refused); on picasso, where every local user can reach the
  compose network, Paper lets in only the bots the agent lists (`MC_WHITELIST`), under names nobody can guess, and
  shows no names in the server list. Those names never go on a command line (every local user can read command lines):
  with `BODY=mineai` they reach their host and runtime through the environment only (patch 0005), and their per-bot data
  folder is mode 700. Only the web port is meant to be exposed, and with `WEB_PROXY_SECRET` only the
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
