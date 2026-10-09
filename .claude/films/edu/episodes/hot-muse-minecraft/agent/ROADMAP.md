<!-- ROADMAP.md - the plan to make "Muse plays Minecraft" commercial grade, able to beat the Ender Dragon, with the live view inside muse.ai's right-hand panel. Written 2026-10-07 from four research passes, then revised the same day after an adversarial review; no code was changed. -->
# Muse plays Minecraft: roadmap (2026-10-07, revised after review)

**Status 2026-10-08: production (`play.picasso-lab.com`) plays with the Mine AI MCP body (`BODY=mineai`, the runtime
at 2fe1306 with our 10 patches, build of `muse-fix`; patch 0011, builds on rough ground, since the same day), switched with `docs/SWITCH.md` after gate 2 passed (Muse re-test
`g42b738` on staging).** M0 items 6 (the proxy secret, `X-Muse-Proxy`) and 7 (the Paper whitelist) are live on staging
and production. Rollback: `docs/SWITCH.md`, section 5 (`BODY=ours`). README, "The switch".

This plan comes from four research passes run on 2026-10-07 (the live view in muse.ai's panel, the Ender Dragon, the
platform on picasso, smoothness and speed) and one adversarial review of the first draft the same day. No code was
changed. Section 8 lists what the review changed and which of its points were rejected. Review IDs in brackets, like
[A1], mark where each accepted point landed. Labels used throughout:
- **measured**: run or read from a log on 2026-10-07, and the source is named;
- **estimate**: arithmetic on game formulas or code;
- **UNVERIFIED**: not confirmed.

Testing rules for every milestone:
- Tests never call paid model APIs. Scripted runs drive the MCP endpoint with no model, using the repo's own harness in
  strict mode (no retries, no automatic fights; every failed step counts) [D3]. Muse runs use the user's own consumer
  Muse at muse.ai. The `/ask` brain path, which uses our own key, stays off.
- Every number is measured on the staging stack on picasso, not on the Mac through a tunnel [D5, C9].
- Never mix "prepared" evidence (a lab world set up with console commands) with "natural" evidence (a fresh world, no
  commands). Natural results state the difficulty and the daylight setting [D7, G8].
- Muse results report n, the success rate and the p90 time, not one good run [D2, D8].

## 1. The target experience

A user types into muse.ai: "Play Minecraft for me and beat the Ender Dragon", or something smaller like "build me a
house by the river". The first time, Muse sets up our connector and the user signs in once. After that it just plays.
The right-hand preview panel next to the chat shows the bot live, because the user's request (or the prompt on our
landing page) asks for it: a smooth chase view, a button for first person, and a short caption saying what the bot is
doing, what just happened, and its milestone times. Nobody is asked to open a new tab, and the panel keeps showing the
user's bot from one game to the next. Muse makes the plan and talks to the user. The bot handles moment-to-moment
survival itself, so a creeper or a lava pool never waits on a model turn. Every Muse call gets an answer within 45 s,
long tasks keep running between calls, and the user's own world is still there tomorrow.

Targets (estimates):
- first use: about 1 minute until the bot moves, because Muse's own setup took 43 s in the one measured run; later
  chats: a world within about 10 s of Muse's first call [B6];
- an iron pickaxe in under 3.5 minutes from the first action;
- free-form building and everyday tasks (farm, trade) from a plain request;
- the dragon on Easy: first match the only public reference (3 h 56 min, 388 tool calls), then aim for under 3 h. Call
  counts are reported, not targeted [H5].

## 2. Where we are (2026-10-07)

| Item | Today | Source |
|---|---|---|
| Muse, iron pickaxe | 279.6 s (4:40); 13 actions in 4 batches; 0 failures. Server on the Mac behind a trycloudflare tunnel, not on picasso [D5] | measured, `~/picasso-work/web/run-serve-2026-10-07T07-34-14-151Z-c88f.jsonl` |
| Where that time went | collect 59%, Muse setup before the first action 15%, smelt 12%, crafts at a placed table 10%, gaps between calls 3% | same log |
| Muse's turn time | 2.2, 2.7 and 2.5 s between one batch's last action and the next batch's first. 43 s from the game start to the first action; 2 MCP sessions. Such short turns suggest a script Muse wrote and ran, not one model turn per call. Whether Muse played turn by turn is UNVERIFIED (probe T11) [B1] | same log; Meta's model API measures about 34 s to first token at its highest effort (`research/muse-minecraft-findings.json`) |
| Scripted MCP runs, no model | 3:47 and 4:39 (`mcp_e2e.mjs`); README full runs 195–223 s. All on the Mac through a tunnel. The harness retries each step up to 4 times and fights by itself, and lives outside the repo with absolute paths [D3, D5] | measured; `~/picasso-work/web/mcp_e2e.mjs` |
| Body | 10 skills. `go_to` is capped at 256 blocks. No armor, shield, bow, buckets, beds, chests or portals. A mob hit stops the skill and asks Muse what to do (`src/body.js`, `ATTACKER_RANGE` 6, `GRACE_MS` 10 s) | code |
| Whitelists (`src/game.js`) | `collect` has no gold, diamond, obsidian, cobweb, netherrack or end stone, and does allow `crafting_table` and `furnace` (other players' too). `craft` has no diamond gear, flint and steel, bow, arrow, bed, shears, boat, gold armor, blaze powder, eye of ender or nugget-to-ingot. `attack` has no enderman, blaze, ghast, magma cube, wither skeleton, silverfish, endermite or dragon, and the end crystal is an entity, not a mob [G1] | code |
| Sessions | A game is tied to one MCP transport: it ends when the transport closes, after 5 min without calls (`IDLE_MS`), or after the 30-min lease. The resume handle is the game's control token (`src/mcp.js:189`) [F2] | code |
| Limits | Per address: 4 MCP games (`src/web.js:419`), 20 MCP sessions (`src/mcp.js:65`). 60 MCP starts and 1,200 inits an hour (`src/web.js:426-428`). 8 guest bots in total. Muse's traffic leaves through Meta's forward proxy, so many users may share a few addresses [C1, F1] | code; Meta safety blog |
| Public data | `/log` is public and shows every user's actions and `say` text. Other bots' chat lands in every player's lines (`src/web.js:524`), which `/play`, the API and replies show. View ids are 24-bit (`src/web.js:502`) and the 404 path has no rate limit [C3, F3, F6] | code; `curl https://play.picasso-lab.com/log` |
| Live view | prismarine-viewer 1.33 (three.js r128) WebGL in the browser, 63 MB worker bundle into 4 workers. The `/watch` camera never follows the bot. Nothing is drawn below y=0. No model for `end_crystal` or dropped items. The `start_game` reply and the server instructions lead with "Watch live" links (`src/mcp.js:145`, `:189`), and `/play` says the views open in new tabs (`src/web.js:827`) [A5, A8] | code, `node_modules/prismarine-viewer/viewer/lib/entity/entities.json` |
| muse.ai | `frame-src` allows `*.s.`, `*.cf.` and `*.h.metaaiusercontent.com`, `*.s.` and `*.cf.ecto1usercontent.com`, `*.meta-agents-apps.workers.dev`, YouTube, Instagram, fbcdn and Stripe. Permissions-Policy: `autoplay=()`, `fullscreen=(self)`, `screen-wake-lock=()`, `picture-in-picture=()`. These headers came on a 307 redirect to auth.muse.ai, so the logged-in app's policy is UNVERIFIED [A1, A7, H3] | measured, `curl -I https://muse.ai/` |
| Artifact hosts | `*.s.metaaiusercontent.com`: CSP `default-src *`, frame-ancestors include muse.ai. `*.cf.*` (both domains): CSP `default-src *`, a different frame-ancestors list that adds `*.preview.museai.com` and localhost. `*.h.*`: no CSP on a 404. `workers.dev`: `X-Frame-Options: SAMEORIGIN`. Which one hosts the panel is UNVERIFIED [A1] | measured, `curl -I` on each host |
| MCP protocol | SDK 1.32.1 (the 2025 protocol, with sessions). A 2026-07-28 `server/discover` call gets `400 "Server not initialized"` [B5] | reviewer's test, 2026-10-07 |
| picasso | 256 threads, 1.5 TB RAM. Load average 171–230, but 57% of CPU time is niced batch work and CPU pressure is under 1%. 1.3 TB RAM free. Disks 77–98% full: `/nvme2n1` has 1.6 TB free, `/ssd2` (the docker root, shared by the whole lab) is 94% full. Each `push.sh` builds a new image of about 1 GB (node_modules is 946 MB: minecraft-data 432 MB and prismarine-viewer 365 MB, mostly other versions) and never prunes [E4]. 1 Gb/s NIC. The 8 H100s have no hardware video encoder | measured over ssh; `du` on node_modules |
| Paper container | 18.6 s to boot; 2.3 GiB RSS at `-Xmx6G`; 0.34 core when empty | measured |

## 3. Architecture: now and target

**Now**

```
muse.ai (Muse writes its own MCP client in its cloud VM)
   | HTTPS  /mcp, /play, /api   (through Meta's egress proxy)
Caddy (FRAS project) -> 172.24.0.1:7850
agent container, ONE Node process:
   web.js + mcp.js
   up to 8 guest bots (mineflayer), plus the house bot
   2 prismarine-viewer servers per bot (ports 3101-3164 and 3201-3264), one WorldView per viewer socket
   | 10.77.77.0/28
paper container: Paper 1.21.4, ONE shared world (seed 71811045), offline mode, Easy, locked daylight, -Xmx6G
live view: /eyes and /watch, WebGL in the browser, opened in NEW TABS
```

**Target**

```
muse.ai chat ------------------ MCP (both protocol eras, signed-in user) ----> gateway
muse.ai right-hand panel: artifact (Meta host, made at the user's request) -->  /live/c/<channel>  (read-only)

Caddy -> gateway x2: stateless Node; MCP, OAuth, /live, /play, /api, quotas per account; blue/green deploys
         |-- Postgres: accounts, worlds, channels, jobs, checkpoints, quotas, audit (nightly backup)
         |-- world-manager: the only process with Docker access; fixed operations on server-made names
         |-- broadcaster (if M6 ships): headless Chromium per WATCHED bot -> JPEG, later H.264
         `-- Prometheus, Alertmanager, Grafana, cAdvisor, node-exporter, one external uptime probe
mcnet 10.78.0.0/22 (internal; Paper has no route out)
   trial world: today's shared world, no persistence
   world pod per account:
      paper-<id>  Paper 1.21.4, -Xmx2G, 2 CPUs, 3 GB
      bot-<id>    sidecar: mineflayer, skills, reflexes, job runner, chunk cache and live feed
staging: the same stack under its own compose project, port and hostname
storage: /nvme2n1/muse/{worlds,backups,archive}  (needs the lab admin's OK)
```

| Area | Now | Target | Milestone |
|---|---|---|---|
| Live view | WebGL per viewer, new tab | Artifact in the panel on a stable channel; renderer chosen by a bake-off; a 2D map view that works everywhere; server video where WebGL can't run or real textures are wanted | M1, M6 |
| Control | 10 primitive skills, Muse handles every hit | Primitives with typed results, basic reflexes, then long jobs (`obtain`, `travel`, `fight_dragon`, ...) | M2, M4, M8–M12 |
| Calls | `play_sequence` of up to 12 steps; leftover steps dropped; retries can run a step twice | Steps queue past the reply; idempotent calls; `wait` long-poll; dry-run check; batched crafting | M2, M3 |
| Identity | One game per MCP transport; limits per address | Signed-in accounts; quotas per account; handles bound to the account | M0 (interim), M3 |
| Worlds | One shared world, at most 8 guests | A private world per account, with its own dragon; the shared world stays as a trial | M3, M7 |
| Operations | No staging, limits per address, public log, no backups, games end on every deploy | Staging first; private log; nightly backups; metrics and alerts; deploys that never end games | M0, M3, M7 |

**Design decisions this plan makes, and why:**

1. **The panel view is an artifact Muse creates when the user asks for it.** muse.ai cannot frame our domain, and
   Meta-hosted artifacts are the only frameable surface we can put content into. Our tool replies only describe what
   `live_view` returns; they never tell Muse to open anything. Meta's connector guidelines say: "Do not use tool
   descriptions or responses to instruct Muse to … take unrequested actions" [A4]. Whether the artifact runs in the
   user's browser or in Muse's cloud VM is UNVERIFIED (probe T1) [A3].
2. **Pick the renderer by measurement, and always have a view that needs no textures.** A one-day bake-off compares
   patched prismarine-viewer, zardoy/minecraft-renderer and a 2D map [A8]. The 2D map plus captions works on phones and
   in strict frames, and needs no game files [A9, I1].
3. **Game textures only where the rules allow.** Mojang's guidelines say "Do not redistribute our games or any
   alterations of our games or game files", and assets include "textures … models". A browser WebGL view downloads the
   textures to every viewer. Videos and streams of gameplay are a use the guidelines describe. So the browser view uses
   flat colours or a permissively licensed pack, and real textures appear only in server-rendered video (M6) unless
   the user decides otherwise (section 7) [I1].
4. **Muse decides strategy; the body owns reflexes and timing.** Muse's reaction time is unmeasured, and its one run
   looked like a script that would ignore "a zombie is attacking you". Either way, a hit cannot wait for a model turn.
   Basic reflexes ship in M2 [B1, C8].
5. **New abilities are skills inside `play` / `play_sequence`; long ones run as jobs.** The tool list stays short
   (start_game, play, play_sequence, get_state, wait, stop, end_game, live_view, plan). Replies carry
   `structuredContent` and typed codes from M2, so any client, scripted or not, can react [B1].
6. **Accounts before anything that keeps state.** Nothing secret goes into replies, URLs, prompts or logs. Meta's
   guidelines: "Do not expose them in prompts, tool descriptions or responses, URLs, analytics, or logs". Muse's
   sandbox injects real credentials at the network edge and the agent sees only a surrogate (Meta safety blog). OAuth
   2.1 is preferred if probe T7 shows Muse's connector supports it [B3, C2].
7. **One world per account, early.** It gives each user their own dragon, removes clashes between users (stations,
   chests, chat), and lets resume rely on Paper's own player files. It moves from day 31 to M3 [C4, C5].
8. **Reuse is decided in week 1, not week 10.** Mine AI MCP (MIT) is the only verified MCP-driven dragon kill: vanilla
   1.21.4, 3 h 56 min, 388 tool calls, 2026-09-15. It runs on forked mineflayer and prismarine-physics with fixes we
   lack (crafting sync, placement acknowledgements, item-use metadata, physics drift), so porting is cheaper than first
   assumed. A 2-day spike in M0 runs it with Muse as the client [C7, H4]. Mindcraft and the furrywall fork (MIT,
   JavaScript) stay sources for single skills. rmalde/minecraft-agent (no license) gives lessons only.
9. **Staging first.** Every change runs on a staging stack on picasso before `push.sh --prod` [C9].

## 4. Milestones

Effort is in focused engineering days (estimates). Every milestone ends with a deploy that users can try. Longer
milestones list intermediate drops.

### M0. Probes, day-0 fixes, staging and the reuse spike (days 0–4)

**Scope:** fix what is unsafe on the live site today, settle the open questions about Muse with the user's own
account, and decide build versus reuse before building.

**Build, day-0 fixes** (staging first, then production):
1. Replies and the server instructions carry no links and no "watch live" text; `/play` no longer says "new tab". A
   link exists only when asked for, through `live_view {format: "link"}` in M1 [A5].
2. The resume handle is no longer the control token: a separate random handle, valid only while that game lives
   [F2].
3. Other players' chat is kept out of `s.lines`, `/play`, the API and replies. `say` text no longer reaches any public
   page [F3].
4. `/log` becomes admin-only. A short privacy notice, the 18+ reason and the Mojang "NOT AN OFFICIAL MINECRAFT
   SERVICE" line go on the landing page [C3, I4].
5. Interim limits: one game per MCP session; the per-address game cap is set from probe T8 (if Muse users share
   addresses, it rises to the global cap); a full server answers with a queue position and an ETA instead of a plain
   refusal [C1].
6. Forwarded addresses are trusted only when the connection comes from the Caddy container's address; anything else
   on 7850 is refused [F5].
7. View ids become 128-bit and the 404 path is rate-limited [F6].
8. The agent image keeps only 1.21.4 data and drops the unused `openai` package; `push.sh` prunes our own dangling
   images (label filter on the compose project, never other users' images) [E4].
9. Staging: a second compose project with its own Paper, port and hostname (route from the FRAS owner). `push.sh`
   deploys to staging; `--prod` only after the staging checks pass [C9].
10. The e2e harness moves into the repo (`test/e2e/`), with relative imports and a strict mode [D3].
11. Logs record the protocol version and client info of each MCP client [B5].
12. Per-phase timing in every result row (path, dig, drop, sync, place, open, clicks, pickup) and event-loop delay p50
    and p99 (`monitorEventLoopDelay`).

**Build, measurements on staging on picasso** [D5]:
- the iron-pickaxe route, 5 strict scripted runs;
- event-loop p99 with 8 bots;
- state-scan time on the real world (a synthetic world measured 940 ms at y=70);
- SwiftShader render fps at 640x360, to size M6.

**Build, reuse spike (2 days):** run Mine AI MCP on staging with its own Paper 1.21.4 and Muse as its client. Its
README says the block highlighter and one development dependency "currently require engineering GitHub access"; most
components run with Bun and Git, and whether its forks install cleanly is UNVERIFIED. Record: the iron route time and
calls, a prepared End fight, what broke on Paper, and which fixes we lack. Output: a build-versus-reuse
recommendation for the user [C7].

**User runs probes** (Appendix A, about 90 minutes in total, most of it the 60-minute T6):
- T1 and T10 decide the artifact shape and the harness for M1 [A1, A2, A3].
- T2 checks the real view in the panel; T4 checks Muse's own browser.
- T6 (endurance), T7 (credentials), T8 (egress), T9 (timeouts, on staging) and T11 (was it a script?) [B1, B2, B3,
  F9].
- T3 (MCP Apps) only if T7 finds a native connector screen [H6].

**Acceptance:**
- The day-0 fixes are live; a grep of 100 replies finds no link and no token.
- The probe screenshots and DevTools notes are in hand.
- The baseline numbers above are recorded from picasso.
- The spike report exists and the user has made the build-versus-reuse call.

**Effort:** 3–4 days (day-0 fixes 1.5, staging and baselines 0.5–1, spike 2, partly in parallel).

### M1. Live view inside the muse.ai panel (days 5–10)

**Status 2026-10-08: the Facebook route is built (README, "Live on a Facebook Page").** The owner measured that the
artifact panel blocks fetch and WebSocket (`connect-src 'none'`) but plays Facebook's video plugin, so shapes (b) and
(c) below are out and the panel shows a Facebook live video instead: each guest game goes live on a Page by itself
(`FB_LIVE=on`), one camera follows the last `live_view` request, and `live_view` returns a static page with the player
plus a plain link. The real Page ("Muse plays Minecraft", created 2026-10-08) is refused live videos for now (Graph
code 200/1363120: a profile or Page must be 60 days old). The channels, the 2D view and the WebGL bake-off below wait.

**Users get:** when they ask for it, the right-hand panel shows their bot live and keeps showing it across games.
Muse never sends anyone to a new tab.

**Build:**

1. **Channels.** `live_view` mints a read-only channel key of 128 bits and returns the artifact HTML for it.
   `start_game {channel}` attaches each new game to that channel, so one artifact keeps working after the 5-minute
   idle end, a transport close or the lease end. In M3 the channel binds to the account automatically [A6, F6]. The
   channel key grants viewing only and is never the control handle.
2. **`/live/c/<channel>` page and feeds** in `src/web.js`.
   - Headers:
     - no `X-Frame-Options` and no COOP (skip `BASE_HEADERS`);
     - CSP `frame-ancestors *` and `connect-src 'self' wss://play.picasso-lab.com`;
     - `Cross-Origin-Resource-Policy: cross-origin` and `Access-Control-Allow-Origin: *` on the bundle and data files.
   - It must work in an opaque (sandboxed, "null") origin with no storage, because sandbox flags carry into nested
     frames [A2]. No `localStorage`, no cookies, no IndexedDB.
   - Feeds: JSON over HTTPS polling for the 2D view (works wherever `fetch` does), and a WebSocket for the 3D view.
     Both read-only; any Origin is accepted, including `null`; capped at 4 viewers per channel and about 48 feeds in
     total; reconnect with backoff and show "joining", "live" or "waiting for the next game".
3. **Renderer bake-off (day 1)** [A8]. Same 3-minute route, panel-sized canvas, M2 desktop and Chrome at 4× CPU
   throttle:
   - patched prismarine-viewer 1.33 (three.js r128);
   - zardoy/minecraft-renderer (MIT; WebGL 2, lighting, sky, items; its 1.21.4 quality is UNVERIFIED);
   - measure first frame, bytes, frame time, below-y=0 drawing, and which entities appear (dragon, crystals, drops).
   - Never expose mcraft-fun-mineflayer-plugin: it has bot controls and remote code execution.
4. **Renderer fixes** for the winner:
   - a damped chase camera that keeps the bot in frame;
   - snapshot interpolation: server-timestamped poses at a fixed 20 Hz, drawn 100–150 ms in the past;
   - turn-rate cap and easing in first person;
   - mesh sections from y −64 to 320 (prismarine-viewer issue #250);
   - pixel ratio at most 1.5, fog at the edge of the view distance;
   - a 1.21.4-only worker bundle, brotli-compressed, long cache headers, 2 workers, created from blob URLs;
   - textures per the section 7 decision: flat colours or a permissively licensed pack by default [I1].
5. **2D map view** [A9]: a top-down map of the area around the bot, one flat colour per block, the bot, mobs and
   drops as marks, and the caption strip. It is the default on phones and wherever WebGL or workers fail.
6. **Feed side:** one chunk cache per bot, serialised once as binary and shared by all sockets; `perMessageDeflate`
   on; no WorldView per viewer. Written as a module the M3 bot sidecar takes over unchanged [C5].
7. **Captions over the view:** current skill and its elapsed time, last result, inventory change, health and food,
   time left. They come from the session log, with other players' chat filtered out [F3].
8. **MCP changes:**
   - New read-only tool `live_view {channel?, format: "html" | "link"}`. The description is descriptive: "Returns an
     HTML page under 1 KB that shows this game live; it can be shown as a web artifact." No reply tells Muse to call
     it or to open anything [A4].
   - The landing-page prompt the user pastes, and our suggested first message, contain the request: "show the game
     live in your preview panel". The request comes from the user.
   - `server/discover` answers with a JSON-RPC error naming the supported version (2025-11-25) instead of HTTP 400, so
     a newer client can fall back. Whether SDK clients fall back on it is UNVERIFIED [B5].
9. **Artifact shape, chosen by T1 and T10:**
   - (a) an iframe of `/live/c/<channel>`, if nested frames load;
   - (b) a `<script src="https://play.picasso-lab.com/live/embed.js">` that draws into the artifact's own canvas, if
     frames are blocked but scripts and network are allowed;
   - (c) a 2D-only artifact that polls JSON, if WebGL or workers fail;
   - (d) the `<img>` stream from M6 (pulled forward), if only images load;
   - (e) Muse's own browser, only if T4 shows it inside muse.ai's panel (the user opens nothing); otherwise dropped.

Template for (a). It has no `allow="fullscreen"`: both muse.ai and the artifact host send `fullscreen=(self)`, so it
would do nothing. They also send `screen-wake-lock=()`, so a laptop may sleep during a long watch; the page shows
"paused" and resumes on wake [A7].

```html
<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Minecraft live</title>
<style>html,body{margin:0;height:100%;background:#111}iframe{border:0;width:100%;height:100%}</style>
<iframe src="https://play.picasso-lab.com/live/c/CHANNEL"></iframe>
```

**Drops:**
- Day 2: channels, the 2D view, captions and the MCP changes. The panel works, on any device.
- Day 6: the 3D view from the bake-off winner, smooth.

**Acceptance, scripted:**
- **Panel harness**, built from what T1 and T10 found: every nesting level, with each level's real CSP,
  Permissions-Policy and `sandbox` and `allow` attributes; if T10 finds several possible hosts, every one of them
  [A1, D1]. Run in Chromium and WebKit, at 1× and at 4× CPU throttle, at the panel sizes T1 reported [D4]:

  | Check | Target |
  |---|---|
  | First frame, cold, throttled to 50 Mb/s | ≤ 4 s (3D), ≤ 1.5 s (2D) |
  | First frame, warm | ≤ 1.5 s |
  | Bytes on a cold load | ≤ 8 MB (3D), ≤ 300 KB (2D) |
  | Bot in frame over a 3-minute collect route that digs below y=0 | 100% of sampled frames |
  | Median frame time, M2 desktop / 4× throttle | ≤ 17 ms / ≤ 33 ms |
  | Longest frame gap | under 100 ms on the M2 |
  | Underground blocks | drawn |
  | Game ends, then a new one starts on the same channel | the new game appears within 5 s, every time |

- If an Intel integrated-GPU laptop is available, record its frame times too.
- **Load on staging on picasso:** 8 bots with 4 viewers each: agent event-loop delay p99 ≤ 50 ms, and the bots keep
  20 Hz physics.

**Acceptance, Muse runs** [D2]: the prompt is "Play Minecraft and get me an iron pickaxe. Show it live in your
preview panel."
- At least 5 runs over 2 days, in Chrome and Safari on desktop. One run starts from first-time setup (the integration
  removed, or a second account if the user has one). One run lasts 30 minutes or more with several goals and at
  least one new game on the same channel.
- Pass: in 5 of 5 runs the panel opens next to the chat without Muse suggesting a new tab, and stays live to the end,
  including across the new game.
- Screenshots at the start, middle and end of each run; note what the phone app shows.

**Risks and cuts:**
- The real panel may block nested frames, scripts or WebGL: ship whichever shape T1 allows; the 2D artifact (c) needs
  only `fetch`.
- Muse may rewrite the HTML into React or file it in the Library: the template is small enough to survive a rewrite;
  tighten the landing-page wording.
- The panel may close while Muse works: the page reconnects when reopened, on the same channel.
- If M1 slips, ship the day-2 drop and move the 3D work into M2.

**Effort:** 5–6 days.

### M2. Faster, safer bot with machine-readable replies (days 11–17)

**Users get:** the same tasks in about 40% less time, a bot that defends itself and eats, and no double actions when
a connection drops.

**Build, body.** All gains are estimates, from game formulas and the 2026-10-07 run logs.

| ID | Change | Expected gain |
|---|---|---|
| S1 | After a dig, wait 2–3 ticks instead of 10 (`util.js` `mineBlock`). Pick up drops in one sweep at the end | Stone 3.5 → about 2.2 s per block |
| S2 | Collect stone by tunnelling, or by a staircase down that also serves as the descent to iron | 12 stone: about 42 → 10–15 s |
| S3 | Allow an axe in the same table session as the pickaxe | Faster logs; picking the table back up drops from 3.75 s to 0.95 s with a stone axe |
| S4 | Keep placed tables and furnaces, owned by the bot that placed them, reused within 24 blocks; at most 4 per bot. Other bots can neither mine nor use them; `collect` stops accepting `crafting_table` and `furnace` unless the bot owns them [C4] | 4–5 s saved per table craft |
| S5 | Parallel furnaces, and a background smelt that returns at once and reports later; output goes only to the owner | 3 iron: 30 → 10 s |
| S6 | Rank target blocks by an approximate path cost, not by straight-line distance (`collect.js` `found[0]`) | Gain UNVERIFIED |
| S8 | Pathfinder search radius per goal; a 3–5 s think limit on collect walks (now 15 s) | Fewer multi-second stalls |
| S10 | Skip inventory syncs made redundant by a sync under 1 s earlier; merge the settles inside a craft | 2x2 craft 0.75 → 0.35 s |
| S11 | Bot view distance 6 instead of mineflayer's `'far'` | About 40% less chunk traffic per bot |
| — | Cache the nearby-block scan: recompute only after 4 blocks of movement, a block change in range, or 5 s | — |

**Status 2026-10-07 (body work done, branch `muse-body`; README, "The body on its own"):** S1, S2 (stone family,
safe blocks only), S3 (an axe carried is used; nothing crafts one on its own), S4, S5 (up to 3 furnaces, background
smelt), S6, S8 (2 s search for a view of a block, then dig to it within 7 blocks; staircase steps 4 s, radius 16),
S10, S11, the cached scan, the basic reflexes, and a fix found on the way (mineflayer timed iron ore with a stone
pickaxe at 4.55 s instead of 1.15 s). Measured on a private copy of the local Paper server on the Mac, not on
staging: the iron route from an empty inventory at 5 fixed fresh spots, two rounds, 229.7 s before and 148.2 s after
(medians of 10 runs), 8 and 10 of 10 runs made the pickaxe. Still open: staging numbers (the MCP parts below are built too).

**Build, basic reflexes** (moved up from the first draft's M4) [C8]. They act with no Muse call and are reported afterwards ("fought 2
zombies, ate 1 bread"):
- fight back or flee by a simple policy (flee below 8 health), instead of stopping to ask;
- eat when food is 14 or less and no mob is near;
- the skill that was interrupted resumes when the threat is gone.

**Build, MCP:**
- **Queued sequences.** Steps that don't fit in the 45 s reply keep running, and the next reply reports them.
  `MAX_STEPS` goes from 12 to 32. `stop` clears the queue.
- **Idempotency** [B4]. Every `play` and `play_sequence` takes an optional `request_id`; without one, the server
  derives a key from the session, the call and its arguments for a 60 s window. A repeat returns the first call's
  result instead of running it again, and each step reports `pending`, `confirmed`, `failed` or `cancelled`, as Meta's
  guidelines ask ("Prevent duplicate transactions"). Today `runOne` waits for the pending skill and then runs the step
  again, so a re-sent `play_sequence` crafts or smelts twice; the 2026-07-28 protocol makes clients re-send after a
  broken stream.
- **Dry-run check.** Simulate the inventory through the recipes before starting. Refuse with the missing items, or
  insert the planks and stick crafts automatically.
- **Recursive and batched `craft`.** A list of items, all in one table session.
- **Typed, compact replies** (moved up from the first draft's M11) [B1]. `structuredContent` with what changed and a short state, plus
  typed codes: `NEED_ITEMS`, `HOSTILE_CONTACT`, `RETREATED_LOW_HEALTH`, `INVENTORY_FULL`, `DIED`, `NOT_STARTED`,
  `DUPLICATE`. The text stays for readers. `get_state {full: true}` gives the rest.
- Status 2026-10-07: the five MCP items above are built (README, "MCP calls"): `src/mcp-queue.js`, `src/plan.js`,
  `craft_batch` (`src/skills/craft-batch.js`, MCP only). Tested with stub bodies and the fake world (`npm test`) and
  once on the local Paper server (`test/real-mcp.test.js`), not yet on staging or with Muse.

**Acceptance, scripted** (strict harness on staging on picasso, iron pickaxe from an empty inventory at 10 fresh
spots, locked daylight, Easy):

| Check | Target |
|---|---|
| Median time | ≤ 170 s (baseline from M0) |
| Slowest run | ≤ 210 s |
| Deaths and failed steps (no retries) | 0 |
| Table craft p95 | ≤ 3 s |
| 12 stone | ≤ 15 s |
| Smelting 3 iron | ≤ 12 s |
| A `play_sequence` re-sent after a cut stream | runs once |
| A zombie summoned mid-collect (lab) | the bot fights, finishes the collect, and reports it, 10 of 10 |
| Per-phase logs | explain the 21–26 s craft outliers seen today |

**Acceptance, Muse runs:** the same prompt as M1, 3 runs. Iron pickaxe in ≤ 3:30 from the first action, with ≤ 3
`play` / `play_sequence` calls and no "not enough ingredients" failures.

**Risks and cuts:**
- Stations litter the shared world: the per-bot cap, ownership and end-of-game cleanup handle it until M3.
- Tunnelling can hit lava or water: dig only into blocks the chunk data shows are safe; keep the current walk as the
  fallback.
- Cut if it slips: do S1, S4, S5, the queue, idempotency, batched craft and the basic reflexes first; move S2 and S6
  into M8.

**Effort:** 6–7 days.

### M3. Accounts and a world of your own (days 18–30)

**Users get:** sign in once. Their own private world, with its own Nether, End and dragon, still there tomorrow,
with the same bot and inventory. The panel follows them across chats. Fair limits that don't punish them for sharing
Meta's network.

**Build:**

1. **Identity**, by the method probe T7 proves works with Muse [B3, C2]:
   - preferred: OAuth 2.1 as in the MCP authorization spec (Client ID Metadata Documents, with dynamic registration
     for older clients), signing in with a Microsoft account. Muse's support is UNVERIFIED; secondary sources disagree;
   - else: an API key the user creates on our site and stores in Muse's connector or secret settings, which Muse's
     sandbox injects at the network edge. Never pasted into chat;
   - last resort, only if neither works: a short world code the user types, with the risk written in the terms.
   - Keys and handles never appear in replies, URLs or logs; a test greps every reply and log line for them. No
     `/mcp/k/<key>` path.
   - Account creation is tied to a real sign-in; if email sign-in is offered, add proof-of-work and a global cap.
2. **Quotas per account** [C1]: 1 active world, play hours a day, starts an hour. A global cap, then a queue with an
   ETA, then 503 with `Retry-After`. Per-address limits remain only as a loose flood guard.
3. **World pods** (moved up from the first draft's M6) [C4, C5]:
   - `paper-<id>`: `-Xms512M -Xmx2G`, `--cpus 2`, `--memory 3g`, `--pids-limit 512`, read-only root filesystem except
     `/data`, `cap-drop ALL`, `no-new-privileges`, on an internal network with no route out [F4].
   - `bot-<id>`: a sidecar holding the bot, skills, reflexes, job runner and the M1 feed module; one process per bot
     ends the shared event loop. Its 768 MB cap is measured here, not assumed [E6].
   - Player and world names are server-generated `[A-Za-z0-9_]`; they reach the console FIFO, where a newline would be
     an operator command [F7].
   - world-manager is the only process with Docker access, and exposes fixed operations (create, pause, stop, delete)
     on ids it made. Rootless Docker or gVisor if the admin agrees (section 7) [F4].
   - Network `mcnet` with the explicit subnet `10.78.0.0/22` (picasso already has 44 docker networks).
   - Start with 8 active private worlds and a warm pool of 2; the idle tiers come in M7.
   - Templates: about 20 curated seeds with land spawn and a first-ring stronghold within 1,500 blocks of spawn,
     pre-generated once and cloned per world (reflink if the filesystem supports it, UNVERIFIED) [E3].
   - World settings: view distance 6, simulation distance 4, `spawnChunkRadius 0`; world border `set 6000` (a
     diameter, so ±3,000 blocks; first-ring strongholds lie 1,280–2,816 blocks out) [H2]; autosave every 2,400 ticks;
     Easy; `allow-flight=true`; `entity-tracking-range.monsters` 160 (hedges the dragon-tracking bug fixed by Paper PR
     #13046); `disable-end-credits: true`; daylight per the section 7 decision.
4. **Game lifetime:** a game no longer ends when the transport closes. After 5 idle minutes the bot logs out and Paper
   saves; after 30 the world stops. Resume ≤ 5 s while running, ≤ 30 s from stopped (estimates).
5. **`wait {seconds ≤ 40}`:** a long-poll that returns early on events (step done or failed, hit, health below 6,
   death, nightfall, target reached).
6. **Jobs survive restarts:** queued steps are checkpointed in Postgres; after a restart the bot rejoins and reports
   "interrupted at step k of n".
7. **Both MCP protocol eras** [B5]. `@modelcontextprotocol/server` 2.x serves 2026-07-28 clients (no protocol
   sessions; explicit `world` handles, bound to the signed-in account so a handle alone grants nothing) and 2025
   clients from the same tools. Keep the 1.32.1 path at `/mcp` until Muse passes on the new one.
8. **Channels bind to the account:** the panel artifact shows whatever the account's bot is doing.
9. **Backups** (moved up from the first draft's M6) [C6]: nightly world and Postgres backups to `/nvme2n1`, plus one at every world
   stop. Retention: the last 3 stops, 7 nightlies and every milestone backup; 30 days after the last use (trial
   worlds: 24 h) [E3]. A restore test runs weekly.
10. **Privacy and terms, final text** (section 7): `/log` opt-in per world; deletion on request; a consent clause
    before any user's footage or logs go into films or posts [C3, I5].
11. **The shared world stays as the instant trial:** no account, no persistence, 30-minute games, stations and chests
    owned and cleared at game end.

**Drops:**
- Day 4: sign-in and per-account quotas on the shared world.
- Day 9: private worlds.
- Day 13: persistence, jobs, backups, both protocol eras.

**Acceptance, scripted:**
1. Close the MCP transport mid-collect: the collect finishes. Reconnect as the same account: same bot, same inventory.
2. `docker restart` of a bot sidecar mid-sequence: back within 30 s at the same spot, with the interrupted job
   reported.
3. A 24-step sequence completes across `wait` calls, never idle for more than 2 s between steps.
4. Two accounts' bots never meet; one account cannot reach another's world with any handle.
5. No key, token or handle appears in 1,000 replies or in the logs.
6. Burst: 10 sign-ins in 60 s. The first 2 get a world at once; the rest see a queue with an ETA and all have a world
   within 2 minutes (estimate; M7 sizes the pool).
7. A backup restores to a playable world.
8. Both protocol eras pass the strict harness.

**Acceptance, Muse run:**
- Chat A makes stone tools, then the user closes it.
- The next day, chat B: "continue my Minecraft game". The same world resumes with nothing pasted (or only the world
  code, if T7 forced that).
- The old artifact in the panel shows the resumed game.

**Risks and cuts:**
- Muse may support none of the sign-in methods (T7): fall back to the world code and say so in the terms.
- The protocol migration may break Muse's self-written client: keep the legacy endpoint.
- Cut if it slips: ship private worlds without the 2026 protocol, which moves to M7.

**Effort:** 11–13 days.

### M4. The bot survives on its own (days 31–40)

STATUS_M4_ROADMAP

**Acceptance of the survival step (defined 2026-10-09, from the acceptance below).** The first step of M4 is the bot
that stays alive while Muse is busy or slow, through real nights on Normal; the goal-level skills (`obtain`, bows,
buckets, chests, `explore`, `travel`) come after it. Its gate, all on staging on picasso, scripted, no model, every
step sent once:
- **Natural** (the gate for production): at least 16 games, each from an empty inventory through its whole 30-minute
  lease (1.5 in-game days, so at least one whole night), at fresh spots no earlier game touched, Normal, daylight
  cycling, no console commands, played by a slow scripted player (`mineai/bench/survive.mjs`: wood, wooden and stone
  tools and a furnace, then silences of 150-240 s with a small task now and then, some of them at night): **at most 1
  death across all of them** (as the natural acceptance below) and **at least 15 of 16 games pass** (the lease ended
  the game and its bot never died). Every action the body took by itself is in a reply. The same run with the care off
  (`MINEAI_CARE=off`, only the runtime's reflexes) is the baseline, reported beside it, never mixed in.
- **Prepared labs** (`mineai/bench/survive-labs.mjs`, console commands, reported apart from the natural runs): hunger
  (no food, animals near), a night shelter (zombies near), a bed, zombie, skeleton and creeper fights at night, armor
  from iron, a tool about to break in a collect, a death and the items back: **20 trials each, at least 16 pass (80%),
  no death** a lab did not cause (as the prepared acceptance below). Each reports n, the rate and the p50 and p90 time
  to the outcome.
- No regression: the staging check (a wooden pickaxe, strict) passes.


**Users get:** hour-long goals in the overworld ("full iron armor, a bow, a base with a bed and a chest") without Muse
babysitting every mob.

**Build, skills** (inside `play`):

| Skill | What it does |
|---|---|
| `equip` | Armor slots and the off-hand, confirmed by the server; mineflayer-armor-manager 2.0.1 |
| Shield | Blocks with the shield in the off-hand |
| Auto-eat | mineflayer-auto-eat 5.0.3 behind the food policy |
| `hunt {mob, drop, n}` | Hunts, then cooks the meat; also feathers (chickens), wool (sheep), string (spiders) |
| `bucket` | Fill and pour water and lava |
| `shears` | Shear sheep for wool, cut cobwebs for string |
| `bed` | Craft (3 wool, 3 planks) [G4], place, set the spawn point, sleep where daylight cycles |
| `chest` | Stash and retrieve; private worlds only [C4] |
| Bow and arrows | Craft (bow: 3 sticks, 3 string; arrows: flint, stick, feather) and shoot with our own ballistic model [G3] |
| Gold | `collect` gold ore (y ≤ 32 and badlands), smelt raw gold, nuggets to ingots, gold armor [G1, G2] |
| `travel {x, z}` | Up to 3 km in hops (`BODY_MAX_TRAVEL` raised) |
| `explore {find}` | Searches for a biome, block or structure |
| `recover` | Goes back to the death spot within the 5-minute despawn time |
| Inventory hygiene | Tosses junk so drops always fit |

Material budgets (estimates from minecraft.wiki drop rates): 32 arrows need 8 flint (about 80 gravel at 10% each) and
8 feathers (about 8 chickens); one bow needs 3 string (2 or 3 spiders, or cobwebs) [G3].

**Build, full reflexes:** back away from creepers; raise the shield against skeletons; step out of fire and lava;
swim up; pour a water bucket on falls of 4 or more blocks; an unstuck watchdog.

**Build, control and goals:**
- `set_policy {retreat_health, risk, raw_food, fight_at_night}`, each override with a lifetime.
- Goal-level `obtain {item, n}`, run as a job: recursive gather, smelt and craft over minecraft-data recipes plus
  gathering rules. First targets: tools, armor, shield, bucket, bed, torches, bow, arrows, food.
- The state gains armor, effects and points of interest (home, bed, chests, last death).

**Port from (MIT, with attribution):** Mindcraft `skills.js` and `modes.js` (equip, `attackNearest`,
`pickupNearbyItems`, `goToBed`, chest functions, the `self_preservation` and `unstuck` modes), furrywall (`swimToAir`,
`bunkerDown`, the junk toss), and whatever the M0 spike recommends from Mine AI MCP. mineflayer-pvp on npm (1.3.2)
listens to `physicTick`, which mineflayer 4.39 still emits but marks deprecated (`lib/plugins/physics.js:86`): pin it
and add a test that fails if the event disappears [H1].

**Infrastructure:** a lab Paper server on staging (its own seed and console, with a daylight cycle) for prepared
tests.

**Drops:**
- Day 3: equip, shield and the full reflexes.
- Day 7: `obtain`, bows, beds, gold.
- Day 10: everything.

**Acceptance, prepared labs** (20 trials each; pass at 80% or better with no deaths):
- skeleton and creeper duels at Easy; a zombie at night;
- a 30-block drop with a water bucket; a lava pool beside the path; starting underwater;
- set the spawn, die, respawn at the bed; stash, die, retrieve.

**Acceptance, natural** (strict harness, private worlds, Easy, **daylight cycling**, no commands, 5 seeds) [D7]: from
an empty inventory to full iron armor, shield, iron sword, bow with 32 arrows, water bucket and bed. Report p50 and
p90; p50 ≤ 30 min, at most 1 death across all runs.

**Acceptance, Muse runs** (3): "Get full iron armor, a bow and a shield, then build a shelter with a bed and a chest".
No death, all of it visible in the panel; report the calls.

**Risks and cuts:**
- Reflexes can fight Muse's plan: reflexes only react and report; they never change the goal.
- Cut if it slips: move `chest` and `explore` to M8.

**Effort:** 8–10 days.

### M5. Free-form building and everyday tasks (days 41–46)

**Users get:** "build me a house by the river", "start a wheat farm", "trade with a villager for bread" [G7].

**Build:**
- `build_plan {origin, blocks: [[dx, dy, dz, block], ...]}` with up to 2,000 blocks: Muse writes the plan; we check
  materials (with a dry run and an `obtain` offer for what is missing), sort the order (supports first), scaffold,
  and report the block diff when done. Simple shapes (`floor`, `wall`, `box`, `roof`) for short requests.
- `find_site {near: water | flat | hill, size}` for "by the river".
- `farm`: till, plant, harvest and replant wheat, carrots and potatoes; craft bread.
- `breed {mob}`; `trade`: find a villager, read its offers, buy or sell; villagers are never attacked.
- Enchanting and brewing wait until after the Nether (M9), because they need lapis, books and nether wart.

**Acceptance, scripted:** 3 plans of 300–1,500 blocks on 3 terrains, built with a block diff of 0; 16 bread from a
farm the bot planted; 1 completed villager trade.

**Acceptance, Muse runs** (3): "Build me a house by the river, with a door and windows". The result matches what Muse
said it would build, seen in the panel.

**Effort:** 5–6 days.

### M6. Server-rendered stream (days 47–52; moves up to right after M1 if T1, T10 or the texture decision needs it)

**Users get:** the live view without WebGL (phones, strict frames, Muse's own browser), real game textures if chosen,
and clean footage for the films.

**Build:**
- **A broadcaster container**, never inside a bot or the gateway. One headless Chromium per watched bot, loading the
  `/live` page in chase mode from the internal feed.
- **Capture:** CDP `Page.startScreencast`, JPEG at quality about 70, 640x360, 15–20 fps, with ack flow control.
- **Outputs:** `/live/c/<channel>.mjpeg` as `multipart/x-mixed-replace` for a plain `<img>` (no JavaScript, no WebGL,
  no autoplay rules), and the same frames over the M1 WebSocket into a canvas, dropping frames per viewer on slow
  links.
- **On demand:** start on the first viewer, stop 30 s after the last.
- **Limits:** at most 8 renderers at first, a lower frame rate under load, a triangle budget of about 100k, and at
  most 20 MJPEG viewers in total (60–180 Mb/s) until H.264 lands [E5].
- **Later:** H.264 (x264 ultrafast/zerolatency) decoded with WebCodecs onto a canvas: about 1.3 Mb/s per viewer.
- **Artifact template (d):** `<img src="https://play.picasso-lab.com/live/c/CHANNEL.mjpeg" style="width:100%">`.

**Acceptance, scripted** (staging on picasso, 8 concurrent streams for 30 minutes):

| Check | Target |
|---|---|
| Frame rate at 640x360 | 15 fps or more |
| Glass-to-glass delay on the campus network | ≤ 500 ms |
| Broadcaster CPU | ≤ 24 threads |
| Paper TPS in the watched worlds | 19.5 or more |
| Longest stall | under 1 s |

- Renderers are gone 30 s after the last viewer leaves.
- In the panel harness with autoplay blocked, the `<img>` stream plays.

**Acceptance, Muse run:** if the panel uses shape (d), a whole iron-pickaxe run shows in it; if T4 chose Muse's
browser inside the panel, it shows 10 fps or more and survives Muse's tool calls.

**Risks and cuts:**
- SwiftShader on loaded EPYC cores may be slower than the M0 benchmark (UNVERIFIED): drop to 480x270 at 10 fps.
- Caddy might buffer the multipart stream (UNVERIFIED): test through Caddy on staging.
- Cut if it slips: MJPEG only.

**Effort:** 4–6 days.

### M7. Scale and operations (days 53–60, in parallel with M8–M9)

**Users get:** more people at once, worlds that wake quickly, and deploys that never end a game.

**Build:**
- World lifecycle:

  | Step | When |
  |---|---|
  | active → idle (bot logged out) | 5 min with no call and no job running |
  | idle → frozen (`docker pause`, memory kept) | 10 min later |
  | frozen → stopped | after 30 min (not 2 h, to bound frozen RAM) [E1] |
  | stopped → archived as zstd | after 7 days |
  | deleted | 30 days without use; trial worlds after 24 h |

- JVM flags for freezing: `-Ddisable.watchdog=true`, `max-tick-time -1`, `-XX:G1PeriodicGCInterval=60000`.
- Warm pool sized from the burst test.
- Metrics: the minecraft-prometheus-exporter in each world, cAdvisor, node-exporter, Alertmanager to email and ntfy,
  an external probe; Docker logs capped at 10 MB × 3.
- Two gateway replicas, blue/green. MCP state lives outside the process (the 2026 protocol is stateless; 2025
  sessions go in a shared store), so a deploy loses no session. Whether Muse's client re-initializes after a 404 is
  probe T9 [F9].
- Ask the FRAS owner to set Caddy's `stream_close_delay`, so a Caddy reload doesn't cut every WebSocket and stream
  [F8].
- The capacity table in section 5, published on the landing page as "up to N players at once".

**Acceptance, scripted soak on staging** (2 h) [D6]. Workload: 16 active worlds, each on a route that generates new
chunks, one viewer per bot, 32 frozen and the warm pool; plus a burst of 10 new worlds in 60 s.

| Check | Target |
|---|---|
| TPS in every world | 19 or more |
| MSPT p95 | ≤ 40 ms |
| New world p95, within the warm pool | ≤ 5 s |
| New world, burst beyond the pool | queued with an ETA; all ≤ 60 s |
| Resume p95 | ≤ 5 s from frozen, ≤ 30 s from stopped |
| `kill -9` on a Paper | back within 60 s, ≤ 2 min of progress lost |
| Gateway redeploy mid-play | 0 games ended, 0 MCP errors |
| RAM / CPU | within the section 5 budget |

**Effort:** 6–8 days.

### M8. Diamonds and a Nether portal (days 61–66)

**Users get:** "get diamonds and take me to the Nether" works, and the view follows through the portal.

**Build:**
- **S7, safe straight-down descent:** check the shaft and its neighbours in chunk data, then dig.
- **Mining:** strip mining at Y −59 with the deepslate ore variants; lava-safe digging (close lava faces, never break
  a block next to unchecked lava); gravel for flint; whitelist diamond ore, obsidian, diamond gear, flint and steel
  [G1].
- **Obsidian:** pour water on lava sources, then mine with a diamond pickaxe (about 9.4 s per block).
- **Portal:** build a 4×5 frame (corners optional) and light it; enter and leave by waiting for the respawn packet and
  the change in `game.dimension`; optionally complete a ruined portal.
- **Live view across dimensions:** clear loaded chunks and re-sync on every dimension change (for prismarine-viewer,
  which has no code for it; the bake-off winner may differ).
- **Pathfinder settings per dimension:** liquid cost 20; scaffold with dirt, cobblestone, netherrack, end stone; avoid
  magma blocks, soul fire and powder snow; never break beds, portal frames or chests.

**Acceptance, labs:** a portal on flat and on uneven ground, 20 of 20; 10 portal round trips with the view following
and no stale chunks; 10 obsidian from a natural pool, 16 of 20 or better, no deaths.

**Acceptance, natural** (5 seeds, Easy, daylight cycling): from an empty inventory to standing in the Nether; report
p50 and p90; p50 ≤ 55 min (the reference reached the Nether at 55 min).

**Acceptance, Muse runs** (3): "Get diamonds and take me to the Nether".

**Risks and cuts:** lava deaths (the main killer in rmalde's runs): lava checks before every dig. Out of scope:
casting a portal with buckets.

**Effort:** 5–6 days.

### M9. The Nether: blaze rods and pearls (days 67–74)

**Users get:** "get the eyes of ender I need".

**Build:**
- **Nether pathing:** extra cost next to lava; covered tunnels instead of open bridges (ghasts); no water.
- **Piglin safety:** keep one gold armor piece on (M4 gold); never mine gold blocks or open chests.
- **Fortress:** `explore` along a heading for nether bricks.
- **Blazes:** shield up, fight at the spawner, bow from M4.
- **Whitelist** [G1]: attack blaze, ghast, magma cube, wither skeleton and enderman; collect netherrack; craft blaze
  powder and gold ingots from nuggets.
- **Pearls:** endermen with a gaze guard (never look at their eyes, fight under a 2-block roof) by default; `barter`
  with a gold budget as the alternative, which costs about 245 gold for 16 pearls (estimate: pearls have weight 10 of
  459 and come 2–4 at a time).
- **Points of interest:** the return portal; travel at 1:8.
- **Port from (MIT):** furrywall `collectBlazeRods`, `collectEnderPearls`, `shootNearest`.

**Targets** [G6]: 8 blaze rods and 16 pearls, enough for 14–16 eyes. Expected need is about 10.8 eyes for the frames
(each frame starts filled 10% of the time) plus throws for the search, each breaking 20% of the time.

**Acceptance, labs:** 8 blaze rods with health 10 or more, 16 of 20 or better; 16 pearls in a warped forest, 16 of 20
or better.

**Acceptance, natural** (5 seeds): from entering the Nether to 8 rods and 16 pearls; report p50 and p90; at most 1
death across all runs.

**Acceptance, Muse runs** (3): "Get 16 eyes of ender".

**Risks and cuts:** ghasts, piglin brutes and falls. Cut if it slips: melee blazes at the spawner with a shield.

**Effort:** 6–8 days.

### M10. The stronghold (days 75–80)

**Users get:** "find the stronghold and open the End portal".

**Build:**
- Craft eyes of ender (whitelist).
- Throw an eye and track the entity: bearing, "flies down" detection, picking the eye up again.
- Triangulate by least squares over 2–3 throws with a wide baseline.
- Travel 1–3 km, by the Nether at 1:8 when shorter. Boats (5 planks) as an option for oceans, if mineflayer's boat
  control works on 1.21.4 (UNVERIFIED) [G5].
- Dig down to the portal room; attack silverfish and endermites (whitelist).
- Fill the frames, checking each frame's `eye` property.
- Set the spawn point with a bed near the portal.
- **Port from (MIT):** furrywall `throwEnderEye`, `locateStronghold` (`intersectRays`), `activateEndPortal`.

**Acceptance:** the estimate is within 100 blocks on 5 seeds; the bot reaches the frame on 5 of 5; 12 of 12 frames
lit; natural from 16 eyes to an active portal, p50 ≤ 30 min; Muse runs (3) with the prompt above.

**Effort:** 4–6 days.

### M11. The End (days 81–88)

**Users get:** the dragon fight, first proven in a prepared lab, and visible in the panel.

**Build, server and client:**
- `disable-end-credits: true`.
- The client answers WIN_GAME with value 0, as Mine AI MCP's `end-credits.ts` does. mineflayer 4.39 acknowledges only
  value 1, which can leave a bot stuck at the first exit from the End.
- Tracking range from M3.

**Build, skills:**
- Arrival on the platform and bridging to the island.
- End reflexes: the void, breath clouds as a path cost, enderman gaze.
- Read the dragon's phase and health from its metadata. mineflayer creates no dragon parts: the head is the entity id
  + 1, 6.5 blocks along the facing and 1 block down when perched.
- **Crystals** [G1]: targeted as entities, not mobs; by bow, or by a staircase or pillar for the caged ones, breaking
  only the iron bars needed; stay outside the blast radius.
- **Perch melee:** wait for the landing phases, hit the head on sword cooldown, leave on takeoff. The dragon is immune
  to arrows while perched.
- Beds are optional. The exit portal.
- `fight_dragon {crystals, kill, max_minutes}` as a resumable job.
- **Live view** [D9]: the dragon, the crystals, their beams and drops are drawn (prismarine-viewer has no crystal
  model; the bake-off winner may).

**Reuse:** follows the M0 decision. If we build: furrywall first (MIT, our stack; its kit-started fight killed the
dragon in 12.1 min with no deaths), and Mine AI MCP's `end-fight.ts` and `dragon-hazards.ts` (MIT). Gate: if our
perch-melee lab is below 80% after 3 days, port Mine AI MCP's fight modules wholesale.

**Acceptance, prepared End lab** (kit given, then `execute in the_end`; 20 trials, Easy): kills in 80% or more, 0
deaths, median ≤ 20 min; back in the overworld within 30 s every time; the bot sees the dragon at 150 blocks; the live
view shows the crystals and the dragon and follows into the End and out of it.

**Risks and cuts:** perch timing, crystal explosions and wing knockback. Cut if it slips: drop the bed method; bow only
for crystals.

**Effort:** 6–8 days.

### M12. Beat the dragon with Muse, and launch (days 89–95)

**Users get:** "Beat the Ender Dragon" from a fresh world on Easy, watched in the panel.

**Build:**
- **`plan {goal}`**, read-only: the dependency tree, what is missing, alternatives with costs, and an ETA.
- **Milestone splits** in replies and captions, against the reference run (Mine AI MCP, 2026-09-15, vanilla 1.21.4):
  iron 17 min, Nether 55 min, End 3:31, dragon dead 3:56.
- **Readiness gates** that refuse risky steps with a typed reason and an explicit `accept_risk` override: at least 16
  food and 32 arrows before the Nether or the End, and a confirmed bed spawn before the End.
- **A short playbook** in `start_game`, descriptive only.
- **`obtain`** covers every endgame item.
- **A natural-run harness:** a fixed macro list acting as a scripted planner, with no model. Every incident becomes a
  regression test.
- **A decision log:** every call is tagged as a primitive, a job, or a call made from a script Muse wrote (from the
  client info and timing), so a report says what Muse itself decided [D8].

**Acceptance, scripted natural runs** (10 curated seeds; Easy, no commands, no keepInventory): 7 of 10 or more kill the
dragon; p50 ≤ 4 h; report p90 [H5].

**Acceptance, Muse runs** (5, if T6 shows the quota allows; else as many as it allows, stated): "Beat the Ender
Dragon".
- Report the success rate, p50 and p90 wall clock, calls, and the decision-log split [D8].
- The user watches in the panel the whole time.
- First target: 3 of 5 succeed within 4 h. Claims say "on Easy" [G8].

**Launch gate:** the legal items in section 7 are done.

**Risks and cuts:**
- Muse may lose the thread over hundreds of calls, or hit its quota (T6 measures it): accounts, `plan` and jobs let it
  pick up again in a new chat.
- Cut if it slips: ship a clearly labelled "dragon from a prepared kit" mode while natural runs mature.

**Effort:** 5–7 days.

### Timeline

All dates are estimates.

| Days | Milestone | What users notice |
|---|---|---|
| 0–4 | M0 | Safer site: no links, private log, fair limits |
| 5–10 | M1 | The game plays live in the muse.ai panel, on any device |
| 11–17 | M2 | About 40% faster; the bot defends itself; no double actions |
| 18–30 | M3 | Sign in once; a private world that is still there tomorrow |
| 31–40 | M4 | Long overworld goals without babysitting |
| 41–46 | M5 | Houses from a description, farms, trading |
| 47–52 | M6 (or right after M1) | Server video: phones, strict frames, real textures |
| 53–60 | M7 (parallel with M8–M9) | More players at once; no game lost to a deploy |
| 61–80 | M8, M9, M10 | Diamonds, the Nether, eyes of ender, the stronghold |
| 81–95 | M11, M12 | The dragon in a lab, then from a fresh world with Muse |

- **Serial total:** about 75–95 engineering days.
- **With M7 in parallel:** about 14–18 weeks of calendar time.
- **If the M0 spike says reuse:** M8–M11 shrink by an estimated 8–12 days.

## 5. Capacity (estimates, to be measured in M3 and M7)

| Resource | Per unit | Plan | Notes |
|---|---|---|---|
| RAM | active world 3.8 GB (Paper 3 GB + bot 0.8 GB); frozen 2.3–3 GB (`docker pause` keeps memory); warm 2.3 GB | 16 active + 32 frozen + 4 warm = 143–165 GB, plus about 15 GB for the gateway, Postgres, monitoring and broadcasters | Ask for 200 GB of picasso's 1.5 TB, or stop frozen worlds after 30 min instead of 2 h [E1] |
| CPU | Paper 2 CPUs cap, bot 1.5; broadcaster 2–3 per stream | worlds ≤ 40 threads, broadcasters ≤ 24, cap 64 | About 16 active players with streams on; publish that number [E2] |
| Disk | template 0.5–2 GB per dimension; a played world 150–600 MB (UNVERIFIED) | 300 GB on `/nvme2n1` | Clone templates with reflinks if the filesystem allows (UNVERIFIED); the retention rule in M3 [E3] |
| Docker root | about 1 GB per agent image build today | slim image (1.21.4 data only) and prune our dangling images on every push | `/ssd2` is 94% full and shared by the lab; fixed in M0 [E4] |
| Bandwidth | MJPEG 3–9 Mb/s per viewer; H.264 about 1.3; 2D view a few KB/s | at most 20 MJPEG viewers (60–180 Mb/s) until H.264 | 32 MJPEG viewers would need 96–288 Mb/s against a 200 Mb/s ask [E5] |
| Bot sidecar | 768 MB cap | measured in M3 before the cap is set | [E6] |

## 6. Security and abuse

| Risk | Fix | When |
|---|---|---|
| `/mcp` is open; any caller sets `adult: true`; 2 addresses can hold all 8 bots [F1] | Interim per-session limits and a queue (M0); sign-in and per-account quotas (M3). The 18+ gate stays as a declaration [I4] | M0, M3 |
| The control token is the resume handle [F2] | A separate short-lived handle (M0); handles bound to the account (M3) | M0, M3 |
| Other bots' chat reaches every player and the public log: abuse and cross-user prompt injection [F3] | Filtered out of lines, replies, captions and public pages | M0 |
| Docker socket access is root-equivalent [F4] | world-manager alone holds it, with fixed operations; rootless Docker or gVisor if the admin agrees; Paper has no outbound network | M3 |
| 7850 reachable from any container; forwarded addresses trusted from anyone [F5] | Trust forwarded headers only from Caddy's address; refuse other peers | M0 |
| 24-bit view ids, unlimited 404s [F6] | 128-bit ids and channels; rate-limited 404s | M0, M1 |
| Names written into the console FIFO [F7] | Server-generated `[A-Za-z0-9_]` only | M3 |
| A Caddy reload closes every stream [F8] | `stream_close_delay` set by the FRAS owner | M7 |
| Deploys lose in-memory MCP sessions [F9] | State outside the process; T9 checks Muse's client re-initializes | M7 |
| Keys in replies, URLs or logs [B3] | Never; grep tests in M3 | M3 |

## 7. What the user must do or decide

**Now (this week):**
1. **Run the M0 probes** (Appendix A): T1, T10, T2 and T4 first (about 25 min; T2 and T4 before the day-0 fixes
   deploy); then T6 (60 min), T7 (2 days apart), T8, T9 and T11. Send screenshots and the DevTools notes.
2. **Decide the look of the browser view** [I1]: (a) flat colours or a permissively licensed texture pack in WebGL
   (smooth, cheap, no game files served; recommended for the panel); (b) real Minecraft textures only through
   server-rendered video (M6, 15–20 fps, costs CPU); (c) real textures in WebGL after a UCSD counsel opinion.
3. **After the M0 spike, decide build versus reuse** for the hard parts (crafting sync, physics fixes, the End fight).
4. **Ask Prof. Ding or the picasso admin** for:
   - 300 GB on `/nvme2n1` for worlds and backups;
   - about 200 GB of RAM and up to 64 threads (launch about 40);
   - about 200 Mb/s of the NIC for streams;
   - rootless Docker or gVisor for the world pods, or approval of a world-manager that alone holds Docker access;
   - approval of image pruning (our images only) on `/ssd2`.
5. **Ask the FRAS Caddy owner** for: a staging hostname routed to a second port; `stream_close_delay` set; and a note
   that `/live/*` carries long-lived WebSockets and streams.
6. **Ask UCSD IT** which rules apply to a public service on a campus server, and how long user logs may be kept
   (which policy applies is UNVERIFIED) [I3].

**Before M3:**
7. **Sign-in method**, after T7: OAuth with a Microsoft account (preferred if Muse supports it), a key stored in Muse's
   settings, or a world code as the last resort.
8. **Approve the privacy policy and terms:** 18+ (kept because `/mcp` serves callers who are not on Muse; Muse itself
   is reported as 18+ and US-only, UNVERIFIED) [I4]; free, no warranty; worlds deleted after 30 days idle (trial
   worlds after 24 h); deletion on request; no selling of data, no training on it; and a consent clause before any
   user's footage or logs appear in films or X posts [I5]. Gameplay logs cannot feed lab model work without separate
   consent.
9. **Daylight in private worlds:** recommended cycling (beds, spiders for string, endermen for pearls); locked
   daylight stays in the shared trial world.

**Before a public launch or a directory listing:**
10. **Mojang rules.** "Commercial use" covers free servers: "regardless of whether you receive payment or provide it
    for free … or even a server you host" [I2]. Server access "must only be granted to users who have a genuine
    paid-for version of Minecraft". Choose one:
    - (a) lab-licensed bot accounts at $29.99 each (16 for $480, 40 for $1,200); whether that satisfies "users" is
      UNVERIFIED;
    - (b) the user signs the bot in with their own Microsoft account. This fits the rule best and pairs with the M3
      sign-in, but means we hold sensitive tokens;
    - (c) a UCSD counsel opinion first.
11. **UCSD signature authority:** the Muse Connector Terms include indemnifying Meta, so a directory listing must go
    through UCSD Strategic Procurement or another office (which one is UNVERIFIED). Custom connectors need no
    submission.
12. **Public name:** "Minecraft" may only be a secondary name, and "Muse" is Meta's mark. Something like "Picasso Lab
    Blockbots: an AI player for Minecraft: Java Edition" is safer (UNVERIFIED whether Meta would accept it). Show
    "NOT AN OFFICIAL MINECRAFT SERVICE" everywhere.
13. **Optional "speed mode"** (a datapack with faster smelting): recommended no, unless clearly labelled.

**During M12:**
14. **Muse dragon attempts:** up to 5 attempts of up to 4 h each from the user's own account, as the T6 quota allows.

## 8. Changes after review

The review's points were checked against the code, the logs and the sources on 2026-10-07. All of them were
accepted, and the milestone order changed: accounts and private worlds moved from day 31 to M3, basic reflexes and
typed replies to M2, the reuse spike to M0, and a building milestone (M5) was added. These points were rejected or
changed:
- **C1 (identity-based limits in M1):** changed. The refusal of the 5th Muse user is fixed in M0 with per-session
  limits and a queue; per-account limits arrive in M3 with sign-in, so M1 stays on the panel the user asked for.
- **B3 ("Meta's guidelines require OAuth"):** the connector guidelines page, read on 2026-10-07, asks to protect
  credentials and keep them out of prompts, replies, URLs and logs, but does not name OAuth. The fix is adopted; OAuth
  is our preference, not a confirmed Meta rule.
- **C7 ("the forks require engineering GitHub access"):** the Mine AI MCP README says that of the block highlighter
  and a development dependency, and says most components need only Bun and Git. The spike is adopted.
- **F2 (no handle in replies at all):** partly. The MCP 2026-07-28 changelog prescribes "explicit, server-minted
  handles passed as ordinary tool arguments". A handle bound to the signed-in account is not a credential. Until M3 a
  separate short-lived handle replaces the token.
- **A5 (drop Way 2):** partly. Links in replies go on day 0. Muse's own browser stays as shape (e) only if T4 shows
  it inside muse.ai's panel, because then the user opens nothing.
- **H6 (T3 cannot succeed):** partly. With a client Muse writes itself, T3 shows text only, so T3 now runs only if
  T7 finds a native connector screen.
- **E1 (RAM over target):** the arithmetic is accepted, but the 160 GB cap was our own on a 1.5 TB machine. The answer
  is a 200 GB ask and shorter freezing, not a design change.
- **B1 and A4** keep their causes marked UNVERIFIED (a script; injection filters), but their fixes are adopted.
- **Code review of M0 and M2 (2026-10-07), fixed on `claude/edu-series`, not deployed:** M0 item 6 cannot work by
  address on picasso (every connection to a published port comes from the Docker gateway): the proxy now proves itself
  with a shared secret (`WEB_PROXY_SECRET`, Caddy `header_up`), to be set in Caddy and `.env` together. Item 7: only
  different unknown view ids count as misses, and a live game's view is always served. Paper on the compose network
  is reachable by every user on picasso: whitelist on, players hidden from the server list, bots listed by the agent
  under names nobody can guess (`MC_WHITELIST`). S4 never retires a busy furnace or a station in use. S1 sweeps the
  drops of chance blocks and of a try a reflex interrupted; a block another bot took is not counted. Forced head
  turns (the reviewer measured the scripted route at 35.8 -> 23.0 s; the "12 stone <= 15 s" target needs them). B4: a
  reply counts as delivered only once its HTTP response was written out, and the same call without a `request_id` is
  a repeat only until its results reached the client. B1: cancelled calls carry the cause's code, a repeat keeps the
  first call's failure code, a reused `request_id` and the SDK's own input errors are `BAD_ARGS`. The dry-run check
  follows `go_to` and warns about stations and furnace output left behind; replies leave within 45 s with the state.

## 9. Open questions (UNVERIFIED)

**The muse.ai panel:**
- The panel's host, nesting, `sandbox` and `allow` attributes and response headers on the logged-in page (T10).
- Whether the artifact runs in the user's browser or in Muse's cloud VM (T1: GPU string, client address, frame rate).
- Whether a chat-created artifact opens in the right-hand panel on desktop web and stays open while Muse keeps calling
  tools (T1, T2). What the phone app shows.
- Whether Muse's own browser shows inside the panel (T4).
- Whether Muse renders MCP Apps (`ui://` resources); only testable through a native connector (T3).
- Whether `default-src *` covers `wss:` in Safari and Firefox. The 2D view polls over HTTPS anyway.

**Muse behaviour:**
- Whether the measured run was a script Muse wrote (T11) and Muse's real turn time (T6).
- Task length, step caps, VM lifetime, quotas on each tier, and approval prompts over a long run (T6) [B2].
- Whether Muse can keep a credential across chats, and how (T7). Whether custom connectors support OAuth.
- How many egress addresses Muse users share (T8).
- When Muse's client gives up on a slow reply, whether it re-sends, and whether it re-initializes after a 404 (T9).
- Which MCP protocol version Muse's client speaks (logged from M0).

**Rendering and capacity:**
- zardoy/minecraft-renderer on 1.21.4; a permissively licensed texture pack that covers 1.21.4.
- SwiftShader fps and CPU on picasso's loaded cores.
- Paper RSS and CPU at `-Xmx2G` with one bot; the bot sidecar's memory.
- Whether a frozen JVM resumes cleanly with the watchdog off.
- World size after a full dragon run; whether `/nvme2n1` supports reflinks.

**Game and server:**
- Whether Paper 1.21.4-232 has the dragon tracking-range bug; whether `disable-end-credits` works on this build.
- Whether the chosen renderer survives a portal crossing.
- Whether mineflayer's boat control works on 1.21.4.

**Gains and causes:**
- The real gains of S6, S8 and the compact replies; the cause of the 21–26 s table-craft outliers.

**Legal:**
- The Mojang "genuine paid-for version" reading for bot accounts.
- Which UCSD IT and records-retention rules apply; whether the IRB must review published analyses of users'
  instructions.

## Appendix A. Muse tests the user can run (no code changes unless noted)

**T1, panel probe (3 min).** Prompt: "Create a web artifact (one plain HTML file, no build step, keep the code exactly
as given) named panel-probe.html with the code below, open it in your preview panel, and do nothing else." Wait 10
seconds, then screenshot the panel.

```html
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Panel probe</title></head>
<body style="font:13px/1.45 system-ui,sans-serif;margin:10px">
<b id="s">Scripts are blocked (this line never changed).</b>
<pre id="o" style="white-space:pre-wrap"></pre>
<iframe id="f" style="width:100%;height:120px;border:1px solid #999"></iframe>
<img id="i" style="height:32px">
<script>
var o=document.getElementById('o'),L=[];function log(t){L.push(t);o.textContent=L.join('\n')}
function T(n,f){try{log(n+' '+f())}catch(e){log(n+' THREW '+e.name)}}
document.getElementById('s').textContent='Scripts run.';
addEventListener('securitypolicyviolation',function(e){log('BLOCKED '+e.effectiveDirective+' '+e.blockedURI)});
log('href '+location.href);log('origin '+self.origin);
log('ancestors '+(location.ancestorOrigins?[].slice.call(location.ancestorOrigins).join(' > '):'n/a'));
log('size '+innerWidth+'x'+innerHeight+' dpr '+devicePixelRatio);
T('gpu',function(){var g=document.createElement('canvas').getContext('webgl2');if(!g)return 'no webgl2';var x=g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'webgl2, name hidden'});
T('localStorage',function(){localStorage.setItem('p','1');return 'OK'});
T('indexedDB',function(){var r=indexedDB.open('p');r.onsuccess=function(){log('indexedDB OK')};r.onerror=function(){log('indexedDB ERROR')};return 'opening'});
T('OffscreenCanvas',function(){return typeof OffscreenCanvas});
T('VideoDecoder',function(){return typeof VideoDecoder});
var n=0,t0=performance.now();(function f(){n++;if(performance.now()-t0<5000)requestAnimationFrame(f);else log('rAF '+n+' frames in 5 s')})();
fetch('https://api.ipify.org?format=json').then(function(r){return r.json()}).then(function(j){log('ip '+j.ip)},function(){log('ip fetch FAILED')});
fetch('https://play.picasso-lab.com/openapi.json').then(function(r){log('our fetch '+r.status)},function(){log('our fetch FAILED')});
try{var w=new WebSocket('wss://echo.websocket.org');w.onopen=function(){log('wss OPEN');w.close()};w.onerror=function(){log('wss ERROR')}}catch(e){log('wss THREW')}
try{var k=new Worker(URL.createObjectURL(new Blob(['postMessage(1)'])));k.onmessage=function(){log('blob worker OK')};k.onerror=function(){log('blob worker ERROR')}}catch(e){log('blob worker THREW')}
try{var m=new Worker(URL.createObjectURL(new Blob(['postMessage(2)'],{type:'text/javascript'})),{type:'module'});m.onmessage=function(){log('module worker OK')};m.onerror=function(){log('module worker ERROR')}}catch(e){log('module worker THREW')}
var i=document.getElementById('i');i.onload=function(){log('img OK')};i.onerror=function(){log('img FAILED')};i.src='https://upload.wikimedia.org/wikipedia/commons/7/70/Example.png';
document.getElementById('f').src='https://yil384.github.io/Picasso-Lab/';
setTimeout(function(){log('done')},8000);
</script></body></html>
```

How to read the screenshot:

| Result | Meaning |
|---|---|
| `href`, `ancestors` | The preview host, and how deep the frame sits |
| `origin null`, `localStorage THREW` | A sandbox without `allow-same-origin`; nested frames inherit it. `/live` must run without storage (M1 does) |
| `gpu` names SwiftShader or llvmpipe, `ip` is not the user's own address, `dpr` 1 | The artifact runs in Muse's cloud VM, not in the user's browser [A3] |
| `rAF` well under 250 in 5 s | The panel throttles drawing; prefer the 2D view or the stream |
| `webgl2` present, `blob worker OK`, `module worker OK` | A 3D view can run |
| `wss OPEN` and the lab site visible in the frame | Shape (a), a nested frame |
| `wss OPEN` or `our fetch 200`, frame blocked | Shape (b) or (c), the artifact draws the view itself |
| Only `img OK` | Shape (d): pull M6 forward |
| Nothing runs, or the artifact lands in the Library | Check T4; otherwise shape (d) |
| Each `BLOCKED <directive>` line | The rule that blocks it |

**T10, panel facts from DevTools (10 min, desktop Chrome, logged in).** With the T1 artifact open in the panel:
1. Elements panel: find each `<iframe>` between muse.ai and the probe. For each, copy its `src` host and its `sandbox`
   and `allow` attributes.
2. Network panel, filter "Doc": for each of those frames, copy the response headers `content-security-policy`,
   `permissions-policy` and `x-frame-options`.
3. Also copy muse.ai's own headers from the logged-in page (the curl results came from a redirect).
These notes define the M1 panel harness [A1, D1].

**T2, the real view in the panel (5 min).** In a chat where the integration works: "start_game. Then create a web
artifact containing exactly `<iframe src="https://play.picasso-lab.com/eyes/GAME_ID/"
style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>` (GAME_ID from the start_game reply), open it
in your preview panel, then collect 5 oak logs." Check whether the panel stays open and live while Muse keeps calling
tools. Expect a slow first load (about 4 MB plus 4 workers). Run T2 before the day-0 fixes deploy: after them the
view ids are 128-bit and no reply carries a view address until `live_view` ships in M1.

**T3, MCP Apps (3 min, only if T7 finds a native connector screen) [H6].** Add https://mcp.excalidraw.com/mcp (no
auth) as a native connector and ask: "Use create_view to draw boxes A -> B -> C." A canvas in the panel or the chat
means Muse renders MCP Apps.

**T4, Muse's own browser (3 min; step 2 before the day-0 fixes, like T2).**
1. "Open https://webglreport.com/?v=2 in your browser." SwiftShader or llvmpipe means software rendering.
2. During a game: "Open https://play.picasso-lab.com/eyes/GAME_ID/ in your browser and leave it open while you play."
   Note where it shows (inside the muse.ai panel or not), the frame rate, and whether it survives tool calls.

**T5, YouTube (1 min, optional).** Paste `https://www.youtube.com/watch?v=jfKfPfyJRdk` and ask Muse to show it here.
muse.ai's `frame-src` allows YouTube, so a YouTube Live spectator cam could be a low-priority extra.

**T6, endurance (60 min) [B2].** "Play Minecraft for an hour: full iron armor, an iron sword, a shield, then a hut.
Keep going until I say stop." At about minute 20, the operator summons a zombie next to the bot (a probe, not natural
evidence). Record: the number of calls (from our log), any stops, approval dialogs or quota messages, and whether and
how fast Muse reacts to the hit.

**T7, credentials (2 days) [B3].** Look for a connector or integration settings screen in muse.ai (headers, API key,
OAuth). On staging (code: a test endpoint that requires a bearer key and reports whether it saw one), try in order:
OAuth if the screen offers it; a key stored in Muse's settings; nothing else. The next day, in a new chat: "continue
my Minecraft game" without pasting anything. Record whether the key or sign-in carried over.

**T8, egress (15 min) [C1].** Start 3 short games from 3 chats (2 accounts if available). Count the distinct source
addresses for `/mcp` in our request log.

**T9, timeouts and re-initialization (15 min, staging only; code: a test tool) [F9].** Ask Muse to call a staging tool
that sleeps 50, 70, 100 and 130 s. Record when Muse's client gives up and whether it re-sends. Then restart the
staging agent mid-session and see whether Muse's client re-initializes after the 404.

**T11, script or turn by turn (5 min) [B1].** Scroll the Muse transcript of the 2026-10-07 iron-pickaxe run. Did Muse
write a program that called the tools in a loop, or call each tool itself and read each reply? Screenshot the part
that shows it.

## Sources

All accessed 2026-10-07.

**Measured today:**
- `curl -I` on https://muse.ai/ (a 307 to auth.muse.ai), https://abcdefgh.s.metaaiusercontent.com/,
  https://abcdefgh.cf.metaaiusercontent.com/, https://abcdefgh.h.metaaiusercontent.com/,
  https://abcdefgh.cf.ecto1usercontent.com/, https://test.meta-agents-apps.workers.dev/ and
  https://play.picasso-lab.com/ (and `/log`).
- picasso over ssh, read-only: `uptime`, `top`, PSI, `nvidia-smi`, `docker info`, `docker stats`.
- Run logs: `~/picasso-work/web/run-serve-2026-10-07T07-34-14-151Z-c88f.jsonl` (gaps between batches computed from
  each action's end time and duration) and `~/picasso-work/web/mcp_e2e.mjs`.
- Local benchmarks: SwiftShader render, ffmpeg encodes, chunk serialisation, state scan; all on an M2 or a synthetic
  world.
- The reviewer's production test: one MCP session opened with no game and deleted; one 2026-07-28 `server/discover`
  request, answered 400.

**Code read:**
- `src/{mcp,web,index,body,game,config}.js` and `src/skills/*.js` (working tree on top of `7e20915`).
- `deploy/{compose.yaml,Dockerfile.agent,paper-entry.sh,push.sh}`.
- `node_modules/prismarine-viewer` 1.33.0 (three 0.128.0, `viewer/lib/entity/entities.json`), `mineflayer` 4.39.0
  (`lib/plugins/physics.js:86`), `mineflayer-pathfinder` 2.4.5, `@modelcontextprotocol/sdk` 1.32.1.
- Earlier research: `.claude/films/edu/research/muse-minecraft-plan.md` and `muse-minecraft-findings.json`.

**Muse and Meta:**
- Connector guidelines: https://muse.ai/platform/docs (quotes on unrequested actions, credentials, duplicate
  transactions)
- Safety blog (2026-09-08): https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse
  (untrusted-input labels, an ensemble of injection classifiers, the forward proxy, surrogate credentials, approvals)
- Connector terms (effective 2026-09-18): https://muse.ai/platform/terms
- Artifacts help (says nothing about the panel): https://www.meta.com/help/artificial-intelligence/2074655449783957/
- Browser help: https://www.meta.com/help/artificial-intelligence/2124746764949121/
- Connectors help: https://www.meta.com/help/artificial-intelligence/1687253048996149/
- Custom integrations and surrogate credentials: https://parallel.ai/articles/meta-muse-custom-integrations
- Settings, Connectors and OAuth (checked 2026-09-25, UNVERIFIED): https://anythingmcp.com/guides/clients/muse
- No MCP settings screen (2026-09-26): https://www.aiagentslibrary.com/blog/meta-muse-mcp/
- Egress through a forward proxy: https://www.jahanzaib.ai/blog/meta-muse-personal-ai-agent-security-architecture
- 18+ and US-only (secondary, UNVERIFIED): https://www.neoteo.com/en/zuckerberg-presented-muse-charm-meta-bars-minors-from-muse
- Third-party teardowns: https://gist.github.com/simonpure/d6f960045334453360eff1e2a0ebda1e (2026-09-22, updated
  10-02) and https://github.com/sys-dissect/meta-muse-sandbox-architecture (2026-09-29/30)
- VM specs: https://www.starkinsider.com/2026/09/meta-muse-specs-what-it-runs-on.html (2026-09-22)

**MCP:**
- 2026-07-28 changelog (no sessions, server-minted handles, `server/discover`, re-issue after a broken stream):
  https://modelcontextprotocol.io/specification/2026-07-28/changelog
- MCP Apps: https://modelcontextprotocol.io/extensions/apps/overview
- Client list: https://modelcontextprotocol.io/extensions/client-matrix
- Tasks extension: https://modelcontextprotocol.io/extensions/tasks/overview
- TS SDK v2: https://ts.sdk.modelcontextprotocol.io/v2/serving/http
- Excalidraw MCP App: https://mcp.excalidraw.com/mcp (checked by curl)

**Prior dragon attempts and renderers:**
- Mine AI MCP: https://github.com/aibengineering/mine-ai-mcp (README: forks of mineflayer, prismarine-physics and
  prismarine-recipe; MIT; TypeScript on Bun) and https://huggingface.co/datasets/aibengineering/beat-the-game-minecraft
  (388 tool calls, 3 h 56 min, vanilla 1.21.4, 2026-09-15)
- furrywall: https://github.com/furrywall/mindcraft/pull/1 (merged 2026-10-04)
- Mindcraft: https://github.com/mindcraft-bots/mindcraft
- rmalde: https://github.com/rmalde/minecraft-agent (no license; lessons only)
- AltoClef: https://github.com/gaucho-matrero/altoclef
- https://github.com/zardoy/minecraft-renderer (MIT) and https://github.com/zardoy/mcraft-fun-mineflayer-plugin (has
  bot controls and remote code execution; notes visual issues on 1.21.4)

**Game and server:**
- minecraft.wiki: Ender_Dragon, Bartering, Eye_of_Ender, Stronghold, Breaking, Item_(entity), Recipe_(Java_Edition),
  https://minecraft.wiki/w/Commands/worldborder
- Paper: https://github.com/PaperMC/Paper/issues/11259 and https://github.com/PaperMC/Paper/pull/13046
- prismarine-viewer issues: https://github.com/PrismarineJS/prismarine-viewer/issues/250 and
  https://github.com/PrismarineJS/prismarine-viewer/issues/35
- itzg autopause: https://docker-minecraft-server.readthedocs.io/en/latest/misc/autopause-autostop/autopause/
- Caddy `reverse_proxy` (`stream_close_delay`): https://caddyserver.com/docs/caddyfile/directives/reverse_proxy

**Streaming:**
- MDN Permissions-Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
- CDP Page domain: https://chromedevtools.github.io/devtools-protocol/tot/Page/
- NVIDIA Hopper in depth (no hardware video encoder): https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/
- Entity interpolation: https://www.gabrielgambetta.com/entity-interpolation.html

**Policy and legal:**
- Mojang usage guidelines (redistribution, assets, commercial use, server access): https://www.minecraft.net/en-us/usage-guidelines
- Mojang EULA: https://www.minecraft.net/en-us/eula
- UCSD signature authority: https://ipps.ucsd.edu/supplier-resources/policies/signature-authority.html (search snippet)
