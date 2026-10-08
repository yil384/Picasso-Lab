<!-- muse-reuse-validation.md - go/no-go for switching the production bot body of "Muse plays Minecraft" to the Mine AI MCP runtime (BODY=mineai), after the 2-3 day validation of 2026-10-07/08: evidence, what is missing, the remaining plan for M4 and M8-M11 on this body, risks. -->
# Muse plays Minecraft: switching the production body to Mine AI MCP (validation, 2026-10-08)

Follows the reuse spike (`muse-reuse-spike.md`, 2026-10-07), which recommended running the Mine AI MCP runtime
(https://github.com/aibengineering/mine-ai-mcp, MIT, pinned at `2fe1306`) as the bot body behind our own gateway. Since
then the body was built (`BODY=mineai`, `src/mineai/` in the agent), their crafting was fixed for Paper, the body was
measured on the Mac and on staging against our own body with the same strict harness, a review found twelve defects,
and all twelve were fixed and re-checked on staging. Production still plays with our body. Labels as in the ROADMAP:
**measured**, **estimate**, **UNVERIFIED**. Every number below is from a scripted client (no model), Easy, daylight
locked, natural terrain, no console items, unless it says otherwise.

## 1. Recommendation

**Go, in two steps.** Switch production to `BODY=mineai` once the three gates below pass (about 2-3 days, estimate),
and keep `BODY=ours` in the same image as the rollback (one line in `deploy/.env` and a restart).

| Gate before the switch | Why | Effort (estimate) |
| --- | --- | --- |
| 1. Production config: `--build-arg MINEAI=1`, `init: true`, a `mineai-data` folder (mode 700) mounted, `BODY=mineai MINEAI_DIR=/opt/mine-ai-mcp MINEAI_DATA_DIR=/mineai-data` in production's `deploy/.env`; one rehearsal with `push.sh --prod` against the staging image first | staging has all of it; `compose.yaml` (production) has none of it today | 0.5 day |
| 2. A soak with today's build on staging: the strict 10 spots and 8 at once again, one whole 30-minute lease, and one Muse run through the gateway (ROADMAP appendix A) | the strict numbers in section 2 are from the builds before the review fixes; nothing has run a full lease or with Muse as the client | 1 day (the Muse run is the user's) |
| 3. Two small runtime patches: never put a temporary table on a flower (staging spot 7), and one retry of a log collect that found no path right after landing (8-at-once run 6) | 2 of the 18 staging games failed this way; both are cheap, and the third failure (a shoreline wander) needs a stall stop that can come after | 0.5-1 day |

Status (2026-10-08, later the same day): gates 1 and 3 are done on branch `muse-gates` and checked on the Mac's Paper
and on staging (the agent's README, "Gates before the switch"); production is unchanged. The switch, the proxy secret,
the whitelist, the smoke checks and the one-line rollback are the agent's `docs/SWITCH.md`. Gate 2's scripted soak ran
on staging with the gates' build (measured; bots `Tst_gate_*`, 18 fresh spots, load median 175-184) and passes every
scripted condition; the Muse run is the owner's and still open:

| Gate 2 condition | Validation (before the review fixes) | Soak (build `109c882`, 8 patches) |
| --- | --- | --- |
| strict, 10 one at a time (at least 7) | 8 of 10, median 161.1 s | **10 of 10**, median 168.0 s, max 179.4 s |
| strict, 8 at once (at least 6) | 7 of 8, median 160.8 s | **6 of 8**, median 166.0 s, max 209.7 s |
| deaths | 0 | 0 |
| heartbeat restarts, watchdog stops (none) | 0 in 23 hosts | 0 in 23 hosts |
| a whole 30-minute lease | not run | ended by the lease at 30.0 min; memory flat (runtime 300 to 310 MB); `/eyes` up throughout |
| a Muse run through the gateway | not run | open (the owner's); a scripted Muse-like session through the public `/mcp` passed 13 of 13 checks |

The two failures at once: a spot with no oak within about 190 blocks (the harness asks for oak when it sees no wood;
their collect walked to the far oak and our 180 s limit ran out: the spot, not the body), and a temporary table refused
because a bat flew into its cell in a cave (their placement fails instead of taking another cell: a runtime bug, a
candidate patch 0009). The lease game's hut lost 2 of 23 blocks to a path search's 2 s limit on uneven ground.

Why go:

| | Our body (in the agent's process) | Mine AI MCP body (one process per bot) |
| --- | --- | --- |
| Strict iron route, staging, 10 spots one at a time | 5 of 10, 3 deaths (earlier run, random spots) | **8 of 10**, 0 deaths |
| Same, 8 games at once on staging | **1 of 8**; the agent's event loop stalled up to 7.0 s | **7 of 8**, 0 deaths; loop p99 at most 3.6 ms |
| Strict iron route, Mac, the same 10 fresh spots | 8 of 10, 34 failed steps | 8 of 10 (9 under the lost-station rule), 3 failed steps; 8 of 8 at once |
| Median time to the iron pickaxe (passes) | **132.7 s** staging, 134.4 s Mac | 161.1 s staging, 154.0 s Mac |
| What it can grow into (M4, M8-M11) | 10 skills; the endgame is still to build (ROADMAP: 29-38 days) | 37 tools that already cover reflexes, buckets, beds, containers, portals, the stronghold and the End; 17-24 days on top (section 4) |

The body is slower by about 20-28 s per iron route (it puts a table down and digs it up for every craft and waits for
the whole smelt; ours leaves its stations standing and returns at once), but it passes more often, never died in 36
strict games, keeps the agent's event loop free with 8 games at once, and brings the survival and endgame skills the
roadmap would otherwise build. The speed gap has a known fix (keep the table and furnace for the game, estimate 10-15 s
a route) and both bodies are inside the ROADMAP target of 3.5 minutes.

No-go conditions (switch back to `ours`, or do not switch): the soak's strict pass rate below 7 of 10 one at a time or
below 6 of 8 at once; any heartbeat restart or watchdog stop at picasso's normal load; a Muse run that cannot finish
the iron route through the gateway.

## 2. Evidence

### 2.1 The strict iron route, same harness for both bodies (measured)

The harness: `test/e2e/mcp-iron.mjs` through our `/mcp` (start_game, then the iron route from an empty inventory,
every step once, no retries, no fights by the harness), driven by `mineai/bench/gateway-iron.mjs`, which also samples
every process under the agent and reads the agent's log. Paper 1.21.4, seed 71811045. Each game at a fresh spot.

On the Mac (local Paper on 25565; both bodies at the same 10 spots, ours on an untouched copy of the world):

| | `mineai`, 10 spots one at a time | `mineai`, 8 more spots at once | `ours`, the same 10 spots |
| --- | --- | --- | --- |
| strict passes | **8 of 10** (9 with the lost-station rule) | **8 of 8** | **8 of 10** |
| iron pickaxe made | 10 of 10 | 8 of 8 | 8 of 10 |
| median / max time (passes) | 154.0 / 173.9 s | 156.5 / 179.8 s | 134.4 / 157.3 s |
| deaths | 0 | 0 | 0 |
| failed steps | 3 | 0 | 34 (two runs where every later step failed) |
| MCP calls per game (median) | 14 | 14 | 14 |
| agent event loop | p99 2.2-2.4 ms, max 43 ms | p99 2.4-7.5 ms, max 18 ms | p99 41-153 ms, max 3.1 s; 15 of 22 minutes had a stall over 1 s |

On staging (picasso, play-staging.picasso-lab.com, 1-minute load average 181-237, median 221; `mineai` at the same
spots as on the Mac, fresh in staging's world; `ours` is the staging run of a few hours earlier at random spots up to
400 blocks from spawn, so not the same spots):

| | `mineai`, 10 one at a time | `mineai`, 8 at once | `ours`, earlier |
| --- | --- | --- | --- |
| strict passes | **8 of 10** | **7 of 8** | 5 of 10; 8 at once: 1 of 8 |
| iron pickaxe made | 8 of 10 | 7 of 8 | 7 of 10; 8 at once: 5 of 8 |
| median / max time (passes) | 161.1 / 166.5 s | 160.8 / 184.0 s | 132.7 / 157.0 s; 8 at once: 325.5 s (the one pass) |
| deaths | 0 | 0 | 3 |
| MCP calls per game (median) | 14 | 14 | 15 |
| where the time goes (median s): first action, logs, crafts, stone, iron and coal, smelt | 6.3, 32.5, 23.7, 27.8, 35.8, 32.1 | 6.7, 28.2, 24.5, 26.6, 45.9, 32.3 | |
| agent event loop (60 s windows) | p99 0.5 ms median, 2.0 ms max; longest stall 29 ms | p99 1.4 ms median, 3.6 ms max; longest stall 198 ms | 8 at once: p99 1.0-3.2 s, stalls up to 7.0 s |

Together: the Mine AI body passed 31 of 36 strict games (16 of 18 on the Mac, 15 of 18 on staging) with no death; ours
passed 14 of 28 (8 of 10 on the Mac, 6 of 18 on staging) with 3 deaths. Where the time differs (Mac medians): their
crafting and smelting cost about 31 s more per route (54.5 s against 23.2 s: 4.6-5.7 s per table craft against 0.15 s
at a table that stays, and a smelt that waits for the load), and they get some back at the ore (32.2 s against 43.9 s)
and at the logs, because their search covers every loaded chunk (spot 7 had no oak within our 32 blocks).

### 2.2 Eight bots at once (measured)

- Staging: 7 of 8 strict, 0 deaths; 8 hosts ready in 1.6 s; 0 heartbeats missed, 0 restarts, 0 runtimes stopped by
  their watchdog. Over the whole day 23 hosts ran on staging (the deploy check, 18 bench games, one re-run, three
  sessions): 0 misses, 0 restarts, 0 exits. The 5 s heartbeat and watchdog defaults hold at picasso's load; most of
  that load is niced batch work and our containers run at normal priority.
- Mac: 8 of 8 strict at once, load average up to 5.5 on 8 cores, the same zero counts.
- The one failure at once (staging run 6) was a log collect that found no path 2.3 s after the bot landed in one of 8
  regions being generated at the same moment; the same spot alone passed (gate 3).
- Our body at once on staging: 1 of 8, with the agent's own loop stalling 1-7 s, because all 8 bots ran in the agent's
  process. That is the strongest single argument for the process-per-bot design.

### 2.3 Resources on picasso (measured, staging)

| | 10 one at a time | 8 at once |
| --- | --- | --- |
| a bot's runtime (RSS) | median 305 MB, peaks 321-417 MB; two outliers: 679 MB (spot 1's 11-minute run), 1,023 MB (spot 7's long path searches) | median 310 MB, max 601 MB; 3.0 GB for all 8 at their peak |
| a host (their supervisor) | up to 79 MB | 569 MB for the 8 |
| the agent | 116-120 MB, 0.6% of a core median | 126-137 MB, 1.6% median, 12% max |
| a bot's runtime, CPU (one core = 100%) | median 18%, p90 44%, max 137% | median 17%, p90 53%, max 163%; 443% for all 8 at most |

- So a guest bot costs about 0.4 GB and a fifth of a core on average; 8 cost about 3.6 GB and up to 4.5 cores at the
  worst moment. picasso has 256 threads and about 1.3 TB of free memory: capacity is set by Paper and our limits, not
  by the body.
- The image: 794 MB with the runtime (163 MB in `/opt/mine-ai-mcp`, trimmed to 1.21.4 game data) against 470 MB
  without it. Docker's root on picasso (`/ssd2`) is about 94% full and the docker wrapper refuses `prune` to our user,
  so old images must be removed by hand (`docker rmi`).
- Bot data: about 4.7 MB per game (their SQLite and incident logs). Since today it is deleted when a game ends,
  except the last 10 failed games; folders older than 3 days go at agent start.

### 2.4 Crafting and the other window flows on Paper (measured)

Their crafting failed on Paper (the server we deploy): after the click that completes a recipe, Paper sends a burst of
slot updates and a full resync where vanilla sends one, and their fork read the result slot too early. Patch 0001
ports our confirmed window clicks into their craft path. Checked against the server's own record, not the bot's:

| Check (Mac, Paper 1.21.4-232) | Before | Patched |
| --- | --- | --- |
| 2x2 crafts (planks of four woods, sticks, tables) | 5 of 50 | **50 of 50**, 0.31 s per call |
| table crafts (pickaxes, furnace; a table in reach and a temporary one) | 0 of 30 | **30 of 30**, 0.32 s in reach, 4.7 s temporary |
| their own test suite | - | 1,572 pass, 0 fail (8 new) |
| their Mine Labs `craft/workshop` scenario | fails at its first craft | **passed** (146 s) |
| `smelt_item` (temporary and placed furnace) | 24 of 24 (unchanged code) | - |
| `use_container` deposit, withdraw, organize, inspect; a fragmented chest | 30 of 30, 30 of 30 (unchanged) | - |
| `equip` (armor, shield to the off-hand) and `drop_item` | 10 of 10 (unchanged) | - |
| their own strict iron route at the spike's 5 spots | stopped at its first craft | **5 of 5**, median 135.7 s, 0 failed steps |

Portals, the Nether and the End have not run on Paper with their code (UNVERIFIED; first job of M8).

### 2.5 Every failure and its cause (measured)

| Where | What happened | Cause | Status |
| --- | --- | --- | --- |
| Staging spot 1 (1800 0), also slow on the Mac | `collect oak_log 6` got 1 log in 180 s; the rest of the route then ran out its time limits | their collect's walk went back and forth in shallow water by the shore (118 blocks travelled, never more than 11 from the start) with nothing to stop it but our limit | open: a stall stop for collect (after the switch) |
| Staging spot 7 (-3049 -1263) | `craft wooden_pickaxe` failed in 81 ms: "block ... is still poppy" | their placement rule counts flowers as replaceable, so the temporary table was put on a poppy; the server refuses that | open: gate 3 (a one-line patch) |
| Staging, 8 at once, run 6 | `collect oak_log 6` failed after 2.2 s: "no path found ... visited 5097 nodes" | likely (UNVERIFIED) the chunks around a fresh landing spot had not arrived while 8 regions generated at once; we wait a fixed 3 s | open: gate 3 (retry once, or wait for the chunks) |
| Staging session | `craft_batch [planks 12, stick 4, table 1, pickaxe 1]` after 4 logs failed 2 of 2: "Missing leaf materials" | we sent the list as one `craft_item`; their planner keeps every listed item, so the planks could not feed the later items | **fixed**: one call per item; passed on the Mac and on staging after the fix |
| Mac spot 9 | the smelt was done but the temporary furnace could not be reached to pick it up | terrain | **fixed**: done in full is ok, and the result says where the furnace stayed |
| Mac spot 1 | 3 of 6 logs in 180 s; 28.7 s on another copy of the same world | not found (temporary bot data, nothing left to read); the staging run of the same spot points to the shoreline wander | data now kept for failed games |
| Our body, Mac spots 3 and 7 | 2 of 6 spruce logs picked up, then every step failed; no oak within 32 blocks | our pickup sweep; our 32-block search | not pursued (our body) |

### 2.6 The review and its fixes (measured, 2026-10-08)

A review of the new body found twelve defects (verified: none high, seven medium, five low; two of them, about
stopping hosts, share a row below). All are fixed in commit `d6a30f0` with tests (the agent's suite: 252 tests, 250
pass, 2 skipped), and the runtime has two more patches:

| Defect | Fix | Checked |
| --- | --- | --- |
| The bot's private player name (the whitelist secret on an offline-mode server) was on their host's and their runtime's command lines, which every user of picasso can read | patch 0005: the name from `MINEAI_USERNAME`, the runtime's bootstrap through its environment; data folder mode 700 | `ps` on picasso during a staging game: neither process shows the name or the bootstrap |
| Every game end took 8.0 s (our stdin pipe kept their host alive), and a stuck runtime could outlive its host and keep its slot's view ports | the agent closes stdin (one SIGTERM); the host runs in its own process group, killed after their stop's allowance and once the host is gone; staging runs under an init; patch 0006 lets their runtime exit once stopped; a closing host frees its place at once; slots need all three ports free | game end 150 and 245 ms on staging, 33-41 ms on the Mac; a child left behind dies with the group (test) |
| The host token failed open on a runtime without patch 0004 | a host must refuse `/health` without its token (401) and report the bot under its own name; the agent refuses a runtime folder that is not the pin plus every patch | refused the older four-patch build and the spike's plain clone |
| Bot data grew 4.7 MB per game, undeletable by the operator | deleted at game end, last 10 failed games kept, older than 3 days removed at start | staging: 23 bot folders before and after two games |
| `craft_batch` as one call (staging failure, above) | one call per item, a table made in the list used for the next item | passed on the Mac and on staging |
| A body held by one of their reflexes (a fight, a meal) refused the next step at once and the queue dropped the rest | wait and submit again up to the step's limit, then name what held it | test with their exact refusal |
| An attack whose kill dropped nothing chased the next mob for 60 s and ended `STOPPED` | the fight is read every 2 s and ended at the kill: ok | test |
| A step during a crash restart reported the whole inventory as gained | `NOT_STARTED` at once, or the restart text, no change counted | test; after a real runtime kill a step was ok again 4.6 s later (about 9 s before) |
| The smelt fuel differed from the check's, and one fuel had to cover the load | one shared fuel order; one fuel after another, a call each, as the check plans it; this body's own skill descriptions | tests |
| Worn and off-hand items vanished from the state and counted as lost | `wearing: ...; off-hand: ...` in the state, `equipment` in the short state | test |
| `bucket` could pour lava anywhere and `chest` could empty another guest's chest | no lava poured; no pour within 32 blocks of the world spawn or 4 of another player; no chest another game's bot put down | tests |

## 3. What is still missing before the switch

**Live views.** `/eyes` and `/watch` work with this body (a viewer inside the bot's process, proxied as before; 200
through Caddy on staging; the streamer recorded from it on the Mac). Missing: the crack overlay (no dig events cross
the process boundary; cosmetic), and nothing has been tested across a dimension change (portals: M8, ours either way)
or for the End's crystals and dragon (M11, ours either way). Not a gate.

**Survival tools exposed to Muse.** Exposed today, beyond our 10 skills and `craft_batch`: `equip`, `hunt`, `sleep`,
`bucket`, `chest`, `explore`, `policy` (their survival policy), `pick_up` (including death items), `drop`. Their
reflexes (hostile combat with shield and bow, fire, breath, footing with a water-bucket save, hunger) act on their own
and are reported in each result. Not exposed yet: their portal, stronghold, End and barter tools; `drop_item` into a
hole; their notes and SQL views. Our whitelists still stop at the iron age: `collect` has no gold, diamond, obsidian,
netherrack or end stone; `craft` has no bed, bow, arrows, flint and steel, diamond gear, eye of ender or blaze powder;
`go_to` is capped at 256 blocks. That is M4 and M8-M11 work (section 4), not a gate: production today has none of it
either.

**Operations.**
- Production's compose file and `deploy/.env` (gate 1). Production's image grows from 470 to 794 MB; remove the old
  images by hand after the switch (the docker wrapper refuses prune to our user).
- Watching it: the agent logs `mineai_host_start`, `_ready`, `_heartbeat_miss`, `_restart`, `_down`, `_close` (with
  how long the stop took and what happened to the data) and `mineai_data_pruned`. Nothing alerts on them yet; a daily
  count of restarts, downs and failed joins is the minimum (estimate 0.5 day, can follow the switch).
- `MINEAI_UNRESPONSIVE_MS` stays at 5 s: 0 watchdog stops in 23 hosts at load 181-237. Raise it only if stops appear;
  the stop allowance now follows it.
- Capacity: production allows 4 guest bots (`WEB_MAX_SESSIONS`), staging 8. More than 8 at once is untested.
- Not yet run: a whole 30-minute lease, Muse as the client, the End lab on staging, production itself.

## 4. The remaining plan on this body: M4 and M8-M11 (estimates)

The ROADMAP's build estimates assumed we write every skill into our body. On this body most primitives exist; what
remains is exposing them through our gateway (schemas, whitelists, the dry-run check, typed codes, short results), a
few jobs that sequence them, our live-view work, and the ROADMAP's acceptance labs and natural runs, which take most of
the time. The spike's per-area numbers (8-12 days) covered exposure only; these include acceptance.

| Milestone | What the runtime already does | What we still build | Days on this body | ROADMAP build |
| --- | --- | --- | --- | --- |
| Before the switch | - | gates 1-3 (section 1) | 2-3 | - |
| Speed (after the switch) | temporary table and furnace per call | keep a placed table and furnace for the game (their `temporary_workstation` off when one stands within reach), skip the first settle in a fresh table window | 1-1.5 | - |
| **M4** survival, overworld | reflexes (combat with shield and bow, creeper retreat, fire, breath, falls with a water bucket, hunger), equip, hunt, bed, buckets, containers, explore, survival policy, death recovery | whitelists (bed, bow, arrows, gold, shears if theirs can), `travel` in hops past 256 blocks, an `obtain {item, n}` job over their recursive craft, collect and smelt, points of interest in the state; a lab Paper server with a daylight cycle; the six prepared labs (20 trials each), natural runs (5 seeds), 3 Muse runs | 5-7 | 8-10 |
| **M8** diamonds and a portal | lava faces sealed before mining, obsidian by pouring water on lava, `build_structure` portal frame, `activate_portal`, `enter_nether_portal` with arrival checks | whitelists (diamond ore and gear, obsidian, flint and steel), the live view across dimension changes (ours), a Paper sweep of their portal flows, labs and natural runs | 3-4 | 5-6 |
| **M9** blaze rods and pearls | blaze hunting with the shield up, endermen under a 2-block roof, `barter`; `explore_frontier` (whether it finds fortresses well is UNVERIFIED) | whitelists (blaze, enderman, ghast, magma cube, wither skeleton; blaze powder, nuggets), Nether labs on Paper, natural runs | 3-4 | 6-8 |
| **M10** stronghold | `locate_stronghold` (two throws triangulated, refinement, eye pickup, portal room survey), `enter_end_portal` with readiness checks | eye of ender crafting, frame filling checks, labs on 5 seeds | 2-3 | 4-6 |
| **M11** the End | `destroy_end_crystal` (bow, staircase, pillar), `prepare_dragon_perch`, `attack_dragon_perch`, `shoot_dragon`, dragon hazards, the WIN_GAME answer | a `fight_dragon {max_minutes}` job with the spike's stall rules (a cap per action, pillar first for caged crystals, move away after the same failure from the same cell twice, retreat and eat below 10 health), the crystal and dragon in the live view (ours), the End lab (20 trials, Easy) | 4-6 | 6-8 |
| **Total** | | | **20-28.5** | **29-38** |

So M4 and M8-M11 take 17-24 days on this body against 29-38 to build them into ours, and with the gates and the
speed work (3-4.5 days) the net saving is about 9 engineering days (estimate). The platform work the spike put at
10-13 days (Paper crafting, a process per bot, the gateway mapping, the live views, staging operations, strict runs on
staging) was done within this 2-3 day validation, except production's config and the End lab. The biggest saving is
in the parts most likely to go wrong in a build: the Nether, the stronghold search and the dragon fight, which their
runtime has already completed once in a natural run. M12 (a fresh
world to the dragon with Muse) is unchanged at 5-7 days; their per-bot SQLite and required rationales give its decision
log most of what it needs.

Order: gates, then the switch, then M4 (it also builds the lab server the later milestones use), then M8 to M11 in
order. The End lab can run earlier as a check on their primitives on Paper (1 day), since the spike's End fight on
Paper failed in the sequencing, not the primitives.

## 5. Risks

| Risk | Likelihood, impact | Mitigation |
| --- | --- | --- |
| **We own 58,500 lines of their TypeScript through a pin.** Upstream moves; every pin bump means rebasing six patches and re-running the Paper checks | certain, medium | the pin only moves on purpose; `fetch-and-patch.sh` fails loudly when a patch does not apply; the agent refuses a folder that is not the pin plus every patch; offer 0001, 0004 and 0005 upstream |
| **Their bugs are now ours.** Found so far: a table on a flower, a collect that wanders with no stall stop, a path search that gives up while chunks load, a planner that keeps every listed item, sticks counted twice in one craft, a table refused when a mob moves into its cell | likely, low to medium each | each found bug becomes a patch or a gateway rule with a test; failed games keep their SQLite for diagnosis |
| **Paper is only checked for the overworld.** Their portals, the Nether and the End have never run on Paper | unknown, high for M8-M11 | the Paper sweep is the first task of M8; the End lab can run first |
| **Slower route.** About 20-28 s more per iron route than our body | certain, low | keep stations for the game (1-1.5 days); still inside the 3.5-minute target |
| **Shared world isolation is weaker than with our body.** The extra skills act on a world every guest shares; today's rules stop lava, pours near spawn or players, and opening another game's chest, but a guest could still wall in another bot with `place` (as before) | low (bots land up to 400 blocks apart; nothing tells a guest where others are) | private worlds (M3) remove the class; until then the rules above and the per-game data deletion |
| **Local insiders on picasso.** About 40 of 50 local accounts are in the docker group and can read container logs and processes anyway; the review fixed what the others could see (command lines) | low, high if exploited (a guest's bot taken over) | names in the environment only, data folder 700, token per host; the whitelist name stays the secret |
| **Resources.** About 0.4 GB and a fifth of a core per bot; outliers to 1 GB during long path searches; the image 794 MB on a 94%-full docker disk that we cannot prune | likely, low | sessions capped (4 production, 8 staging); old images removed by hand after each deploy |
| **Watchdog under load.** Their 5 s event-loop watchdog restarts a runtime that stalls (it did once on the loaded Mac in the spike's End fight) | low on picasso so far (0 of 23), medium in the End | `MINEAI_UNRESPONSIVE_MS` up to 120 s, and the stop allowance now follows it |
| **Muse has never driven this body.** Every number here is from scripts | unknown, high | gate 2's Muse run before production |
| **Their MCP surface is large.** 37 tools behind our gateway; only our curated skills reach a guest, but a runtime without our token patch would expose all of them on loopback | low after today's checks | the 401 check on every host, and the start check of the pin and patches |
| **License.** MIT, "Copyright (c) 2026 AI Bengineering"; the reference dataset CC BY 4.0 | low | the notice is kept in `mineai/LICENSE-mine-ai-mcp` and in every patch; their code never enters our repo; credit any quoted reference numbers |

## 6. Sources and reproduce

- The spike: `muse-reuse-spike.md` (this folder).
- The body, its numbers and how to reproduce them: the agent's `README.md`, section "The Mine AI MCP body" (the Mac and
  staging tables, every failure, "After the review"); `mineai/README.md` (the pin, the patches, the Paper crafting
  numbers); `mineai/UPSTREAM.json` (pin `2fe1306` and patches 0001-0006).
- Run data: Mac runs in `~/picasso-work/rv-int/runs/` (`a-mineai-paper.json`, `b-mineai-paper-8.json`,
  `c-ours-paper.json`) with agent logs; staging runs and the load log in `~/workspace/muse-staging/accept-mineai/runs/`
  on picasso.
- Commits on this branch (not pushed): `161e36b` and `a6a422e` (the two tracks merged), `d4c141d` (validation on
  the Mac), `6e87498` and `7d47eb4` (staging), `d6a30f0` (the review fixes, staging redeployed with them).
- No paid model API was called; all test bots were `Tst_rv_*`; production was not touched.
