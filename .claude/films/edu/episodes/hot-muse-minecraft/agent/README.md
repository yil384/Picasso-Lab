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
| `src/contracts.js` | the 10 tools (`TOOLS`, strict JSON Schemas), `validateArgs` / `parseArgs` / `coerceArgs`, and the JSDoc interfaces of Body, Brain, LLM, Logger, Web |
| `src/game.js` | the game vocabulary the tool schemas are built from: minable blocks, craftable items, furnace inputs, fuels, blueprints, attack targets |
| `src/pricing.js` | Muse Spark prices, `cost(usage, tier)`, the rolling one-hour spend meter |
| `src/llm.js` | the chat client: clean request, streaming, TTFT and latency, $ per call |
| `src/log.js` | JSONL decision log with secrets scrubbed |
| `src/mc.js` | vec3 and the prismarine libraries, resolved through mineflayer (one copy each) |
| `src/body.js`, `src/skills/`, `src/state.js` | the mineflayer body, the 10 skills and the plain-text state |
| `src/skills/window.js` | window clicks the server confirms: crafting (and the inventory checks around every skill) never trust mineflayer's optimistic window picture |
| `src/brain.js`, `src/memory.js` | the tool loop, its guards, short-term memory and `notes.json` |
| `src/web.js` | `/`, `/play`, `/api`, `openapi.json`, `/ask`, `/log`, `/admin/stop` |
| `scripts/probe.mjs` | latency and $ per call: effort x cache on/off x Chat/Responses, CSV per call |
| `scripts/run-goal.mjs` | one goal from the command line (real server, or the mock and the fake bot), JSONL log, HUD table |
| `scripts/hud-data.mjs` | the video HUD numbers from one or more run logs (milestones, totals, failures, timeline) |
| `scripts/a11y_snapshot.py` | the accessibility tree of a `/play` page, as an agent browser sees it; `--check` asserts it (Python Playwright 1.49+) |
| `scripts/a11y-chrome.mjs` | the same tree and check through a Chrome that is already installed (DevTools protocol, JavaScript off); no Playwright |
| `test/mock-llm.js` | local mock of the chat (and Responses) endpoint, also `npm run mock` |
| `test/fake-bot.js` | in-memory fake of the mineflayer bot surface the body uses (also `--fake-bot`) |

Node 22 or newer (mineflayer 4.39, minecraft-protocol and openai 7 require it). Every command below runs in this
folder.

## Tests (no key, no Minecraft)

```sh
npm install
npm test          # node --test test/ : every *.test.js (about 3 s)
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

Each address (IPv6: each /64) holds one guest bot at a time and waits a minute after its session ends. POSTs that
another website makes a browser send (`Sec-Fetch-Site: cross-site` or `same-site`, or a foreign `Origin`) get 403;
server-side agents send neither header and are not affected. `/play` never reloads while the bot waits for the next
action (an agent filling a form would lose it); while the bot joins or a skill runs it reloads every 5 or 15 s, and
"Check again" reloads it by hand.

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
  web's `session_*`, `viewer_action`, `ask_*`, `admin_stop`.

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
  ("stuck") or the bot stands still for `stillMs`; a stop or timeout closes any open crafting or furnace window.
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
- Nothing has run against Meta's API: the request shape is checked against the documented rejections. Run
  `npm run probe -- --live --shape brain` before anything else: the brain-shaped calls (two user messages in a row, a
  replayed tool call and its result, `previous_response_id` with `--api responses`). Unknown until then: strict
  tool schemas with `minimum`/`maximum`/`pattern`/`minLength`, `stream_options`, `max_completion_tokens` 8192 and two
  user messages in a row. Each has an automatic fallback (above); the CSV's `adapted` column and the printed lines
  say which one fired. If `stream` fired, TTFT equals the whole call: say so next to any latency number.
- Caves, lava, water, night mobs and fall damage never happen in the fake bot. On the real server a hit from a hostile
  mob within 6 blocks stops the running skill (not attack or eat) with "a zombie is attacking you ...; fight back with
  attack zombie, or go_to somewhere safe"; after a death the next skill waits for the respawn. Lava is only avoided as
  far as pathfinder's own digging rules go.
- prismarine-viewer is not installed; the watch page code is tested with a stand-in module only.

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
