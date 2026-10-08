<!-- muse-reuse-spike.md - ROADMAP M0 reuse spike: can "Muse plays Minecraft" reuse Mine AI MCP (MIT) instead of building M2/M4/M8-M11 itself? Measured 2026-10-07 on the Mac; no code in our agent was changed. -->
# Muse plays Minecraft: Mine AI MCP reuse spike (ROADMAP M0, [C7, H4])

Date: 2026-10-07. Subject: https://github.com/aibengineering/mine-ai-mcp at commit `2fe1306` (2026-10-01, tag
`beat-the-game` is older), cloned to `~/picasso-work/spike/mine-ai-mcp`. Nothing in our agent changed. All runs were
on this Mac (M1, 8 cores, 16 GB; load average 7-11 during the runs from other work), not on staging on picasso, and
the client was a script, not Muse (see "Deviations from the M0 spike plan"). Labels as in the ROADMAP: **measured**,
**estimate**, **UNVERIFIED**.

## 1. Recommendation

**Reuse their body, keep our front end.** Run Mine AI MCP's runtime as the bot body (one child process per guest bot)
behind our gateway (`/mcp`, `/play`, `/api`, quotas, live views, stream and camera, deploy), after fixing one Paper
incompatibility in their crafting. Do not adopt their MCP surface for Muse as it is, and do not keep building the
endgame in our body.

| Skill area | Build (our ROADMAP) | Reuse (after the shared platform work below) | Call |
| --- | --- | --- | --- |
| Shared platform: their runtime as our body | - | 10-13 days | needed by every row below |
| Survival (overworld: travel, gather, craft, reflexes; M2 body part and M4) | 12-15 days (M2 body about 4-5 of its 6-7, M4 8-10) | 1-2 days on top of the platform | **Reuse** |
| Nether (M8 portal/obsidian/diamonds + M9 rods/pearls) | 11-14 days | 3-4 days | **Reuse** |
| Stronghold (M10) | 4-6 days | 1-2 days | **Reuse** |
| End fight (M11) | 6-8 days | 3-4 days (a `fight_dragon` job with a stall watchdog) | **Reuse, wrapped in a job** |
| **Total** | **33-43 days** | **18-25 days** | |

All effort numbers are estimates in focused engineering days. The reuse column assumes the Paper crafting fix holds
for furnaces, chests and the Nether as well (only crafting was found broken; smelting, containers, portals and the
Nether were not run on Paper here).

Why, in one paragraph: on our seed their body reached an iron pickaxe 5 of 5 times (median 142 s, 8 actions, 0 failed
steps, on a vanilla server) where ours, on Paper at three of the same start points, passed 1 of 3 (204 s; one bot
drowned, one ran out its 10-minute lease); their tool set already covers almost all of M4 and every endgame item of
M8-M11 and was proven once in a natural dragon kill; and every dependency is MIT. Against that: their crafting fails
on Paper (measured below), their runtime is 58,500 lines of TypeScript we have not written, and my scripted End lab
on Paper destroyed all 10 crystals and took the dragon from 200 to 70 health, then dealt no damage for 9 minutes,
failing again and again to escape from one cell, and died to dragon breath: the primitives work, the sequencing
around them is the hard part.

What we keep from our own stack, because they have nothing like it: the multi-guest gateway (sessions, per-address
limits, 18+, kill switch, zero-JS `/play`, OpenAPI), 45-second MCP replies and `play_sequence` (tested with Muse), the
live views (`/eyes`, `/watch`, smoothing, crack overlay), the Facebook Live streamer and the real-client camera,
confirmed window clicks (`src/skills/window.js`, which works on Paper), the walk watch, and the picasso deployment.
Their host binds 127.0.0.1, has no authentication and drives exactly one bot.

## 2. Does it install? (measured)

| Question | Answer |
| --- | --- |
| Bun | Bun 1.4.2 (darwin-aarch64 release zip, no installer, no profile change). `bun install`: 204 packages in 3.3 s, no errors |
| The forks | mineflayer `9fa1140`, prismarine-physics `56a6794`, prismarine-recipe `542f060` (GitHub), minecraft-data 3.116.0 from a release tarball: all installed |
| "Engineering GitHub access" | **Stale.** `aibengineering/mine-labs` and `aibengineering/minecraft-block-highlighter` are public now: the GitHub API answers 200 without a token for all six repos, and both installed with no credentials (`GIT_TERMINAL_PROMPT=0`, no token in the environment) |
| Node instead of Bun | Works: `node --import tsx src/server/host.ts` on Node 26.10 joined the vanilla server, collected 2 logs and crafted a table. The code uses `node:sqlite`, not `bun:sqlite`; one file has a Bun-only branch. `package.json` asks for Node >= 24.15 or Bun >= 1.4 |
| Size | `src/`: 58,500 lines of TypeScript plus 42,000 lines of tests (actions 16.3k, navigation 15.6k, survival 15.4k, world 2.4k, bot data 1.9k, server 1.8k, session 1.3k). 243 scenario files for their Mine Labs harness |
| Process model | One host = one HTTP server + one child process with one mineflayer bot; the parent kills the child when its event loop misses heartbeats for 5 s. Child RSS about 65-100 MB (macOS `ps`) |
| MCP | Streamable HTTP, SDK 1.30.0, `/mcp` and `/health`. 37 tools. `tools/list` is **1.36 MB**: 54 KB input schemas, 28 KB descriptions, 1.27 MB output schemas (`wait_for_action` alone 157 KB) |

## 3. Does it run on Paper 1.21.4? (measured)

Servers: a separate Paper 1.21.4-232 on 127.0.0.1:25566 and a vanilla 1.21.4 (Mojang's jar from Paper's cache) on
127.0.0.1:25567, both seed 71811045, Easy, offline, daylight locked, under `~/picasso-work/spike/`. Bots: `Tst_M0_Mine`
(Paper), `Tst_M0_Van` (vanilla), `Tst_M0_Node`, `Tst_M0_Probe`, and our agent's guests `Tst_M0_<id>`. The shared local
server on 25565 was not used.

It joins, walks, mines, equips, shoots and fights on Paper (smelting, containers and portals were not reached
there). **Crafting breaks:**

| Test | Paper | Vanilla |
| --- | --- | --- |
| 2x2 craft (1 log to 4 planks), 25 calls | 6 ok, **19 failed** "Server did not supply the expected crafting result" | 25 ok |
| Same, with a 4-line wait for the result slot (spike-only patch in `node_modules`) | 25 ok | - |
| Table craft (wooden pickaxe, temporary table), 8 calls, with that patch | 2 ok, **6 failed** | 17 of 17 table crafts in the iron runs ok |
| Iron route | stops at the first craft (spot 1; at spot A 5 failures in a row, then "missing ingredient"); with the patch, stops at the first table craft (spot B) | 5 of 5 (section 4) |

Cause, from a packet probe (`scripts/result-slot-probe.mjs`, upstream mineflayer 4.39): after the click that
completes a recipe, vanilla sends one `set_slot` for the result. Paper sends a burst within 0-2 ms: `set_slot` of the
source slot, `set_slot 0` three times (empty, then the result), the grid slot, then a full `window_items` resync.
Their fork's `craft.js` `grabResult` reads `window.slots[0]` as soon as the click resolves, so it sees the
intermediate state. In a table window the resync also leaves mineflayer's cursor model wrong, so later clicks put a
plank where a stick belongs (the failed grid read `planks planks planks / - stick - / - planks -`). A wait is not
enough there; it needs confirmed clicks. Our `src/skills/window.js` already does this, and our crafting works on the
same Paper build. **Fix: port our confirmed window clicks into their craft path: 1.5-2 days with tests (estimate).**

Second break, under load: the first End run died at its first `view_status` with `RUNTIME_UNRESPONSIVE` (event-loop
heartbeat absent 5.1 s while the dragon reflex ran an escape search; Mac load average 11). The host then needs a
restart. picasso runs at load 170-230: the 5 s heartbeat and CPU share must be tuned there before any rollout
(UNVERIFIED on picasso).

## 4. The iron route (measured)

Same strict script shape for both: no model, no retries, no automatic fights, every call counted
(`~/picasso-work/spike/scripts/iron-route.mjs` for theirs, `our-route.mjs` for ours). Theirs: 8 actions (`collect_block
logs 5`, `craft_item crafting_table`, `craft_item wooden_pickaxe + 4 sticks` on a temporary table, `collect_block
stone 11`, `craft_item stone_pickaxe + furnace`, `collect_block iron_ore 3`, `smelt_item raw_iron 3` on a temporary
furnace, `craft_item iron_pickaxe`) plus one `view_status` to pick the fuel. Ours: the 13-skill route of
`~/picasso-work/web/mcp_e2e.mjs`, made strict. Theirs ran on vanilla (their crafting fails on Paper); ours on Paper,
the server we deploy, at the same coordinates in an untouched copy of the same world, at the same time.

| Spot (start) | Mine AI MCP, vanilla | Our body, Paper |
| --- | --- | --- |
| B (-502, 123, 401) | **99.2 s**, 8 actions, 0 failed | - |
| C (1201, 70, -898) | **109.6 s**, 8 actions, 0 failed | **203.7 s**, 13 skills (22 MCP calls with polls), 0 failed |
| D (-1501, 76, -1297), mangrove swamp | **141.6 s**, 8 actions, 0 failed | **failed**: drowned at 105 s while collecting stone (no breath reflex) |
| E (2201, 96, 1798), savanna | **162.1 s**, 8 actions, 0 failed | **failed**: 114 s for 6 logs, a furnace craft "the server did not answer the clicks in time" (46 s), `collect iron_ore` 280 s, then the 10-minute lease ended at 597 s |
| F (-2601, 70, 2902), no trees within 32 blocks | **199.6 s**, 8 actions, 0 failed (logs 33 s away) | not comparable: our `collect` takes one named log within 32 blocks, the script asked for `oak_log` |
| **Summary** | **5 of 5; median 141.6 s, max 199.6 s** | **1 of 3; 203.7 s** (README: 195-223 s at three earlier spots) |

Spot A (first run) stopped at the smelt because my script picked planks as fuel when only 1 was left; it had reached
3 raw iron in 108 s. It is excluded.

Where the time goes, spot C (theirs / ours, seconds): logs 20.5 / 25.6; everything up to the wooden pickaxe 4.5 / 11.2
(2 calls / 4 calls); stone 24.6 (11) / 36.4 (12); stone pickaxe and furnace 4.3 / 13.6; iron 19.3 / 57.5, plus our coal
19.9 (theirs had coal from the stone); smelting 32.0 / 32.9; iron pickaxe 4.4 / 6.6. Their gains are in moving and
mining (their own A* and physics executor), in recursive crafting in one call, and in a temporary table and furnace
that are placed and picked up inside the action. Smelting is the same, about 32 s for 3 iron in one furnace: our S5
(parallel furnaces) would beat both.

For a model client: their route is 8 foreground calls, each needing its result read before the next is admitted.
With our 45 s reply cap, iron at 87 s (spot F) would need one `wait_for_action`. Ours is 13 calls, or 4 batches of
`play_sequence` for Muse (ROADMAP section 2).

## 5. A prepared End fight on Paper (measured; prepared evidence, not natural)

Lab: `Tst_M0_Mine` on the Paper spike server, kit by console (diamond armor, diamond sword, bow, 64 arrows, shield,
32 steak, 128 end stone, 64 cobblestone, water bucket, carved pumpkin), `equip` by tool, then `execute in
minecraft:the_end run spreadplayers 30 0 0 3` (no portal, no platform, no bed), Easy. Script:
`~/picasso-work/spike/scripts/end-fight.mjs`: crystals nearest first (`auto`, then `melee` staircase, then `melee`
pillar), then `prepare_dragon_perch` + `attack_dragon_perch` cycles, `shoot_dragon` when a perch attack fails, eat
below 10 health, cancel any action that has not settled after 180 s.

**Result: no kill.** All 10 crystals destroyed; dragon from 200 to 70 health; then no damage for 9 minutes and the
bot died ("killed by Ender Dragon using magic", the breath) after repeated failed escapes from one cell. About 40
minutes in the End in all.

| Phase | What happened |
| --- | --- |
| Start | First run: the runtime died at the first `view_status` (`RUNTIME_UNRESPONSIVE`, section 3). Host restarted, same world |
| Crystals by bow (`auto`) | 9 of 10, 1.6-13 s each where the shot was clear, 55 s for one caged crystal. Two first shots ended "Crystal remains loaded after the server observed the shot's flight window": one crystal fell to the second shot, the other (caged) went to melee |
| Caged crystal, melee staircase | Three tries, never placed a block: the body cycled approach and recover under the dragon (61 approach and 60 recover entries in the first 10 minutes, 14 steak eaten, armor worn) and never settled. Cancelled after 600 s, 180 s (watchdog) and about 120 s |
| Same crystal, `approach: pillar` | Destroyed in 140 s |
| Perch phase | Four good perch windows in 10 minutes: 200 to 144 (8 swings), to 87.5 (18 swings), to 85.9, to 70; one bow hit (-2.8). Three `PERCH_PASSAGE_CLOUDED`, one `PERCH_RETREAT_INCOMPLETE` |
| Loop and death | One more window did no damage; then five `attack_dragon_perch` in a row (2 minutes) ended `END_ESCAPE_BLOCKED` ("No clear escape route was reached ... navigation timeout") from the same cell (-4.5, 62, -13.5), and two shots ended `DRAGON_SHOT_BLOCKED`; the breath killed the bot at minute 23 of the run, 9 minutes after the last damage |
| Calls | Last run: 34 actions and 77 tool calls in 23 minutes (waits and status reads included), 5 `ACTION_BUSY` refusals while the dragon reflex owned the body |
| Paper | One "moved wrongly!" warning from Paper in the whole session, no kicks; the WIN_GAME fix was not reached |

What this says: the End primitives work on Paper, and their failures are explicit codes, but two kinds of stall need
a supervisor: an action that never settles (the staircase) and the same failure from the same cell again and again.
The reference model handled the same situations by retrying, switching to the bow, eating at 1.95 health and walking
away from the fountain. Our `fight_dragon` job must do that itself: a cap per action, pillar first for caged crystals,
"same code from the same cell twice: move 20 blocks out, or dig down and wait", and retreat and eat below 10
health. My script was simpler than that; a better one would likely kill (UNVERIFIED).

## 6. The reference run, from its published data (measured from the dataset)

Dataset: https://huggingface.co/datasets/aibengineering/beat-the-game-minecraft (CC BY 4.0). Vanilla 1.21.4, seed
97996358, prompt with strategy tips (bed, shield, food, bow and 64 arrows before the End). The agent was a frontier
model in a coding-agent harness; `result.json` bills **$93.17** at list price (163 M cached input tokens, 148 k output
tokens).

| Milestone | Wall clock |
| --- | --- |
| first iron pickaxe (after food, a bed and 24 iron) | 0:17 |
| into the Nether | 0:55 |
| back from the Nether (22 min there, blaze rods) | 1:17 |
| died once (creeper) | 2:12 |
| stronghold portal frame seen | 3:19 |
| into the End | 3:31:43 |
| last call, dragon dead | 3:56:41 |

- 387 calls in the SQLite action log (their README and our ROADMAP say 388): `wait_for_action` 59, `navigate` 39,
  `collect_mob_drop` 34 (18 of them endermen for pearls, 5 blazes), `collect_block` 25, `view_status` 24,
  `craft_item` 23, `equip` 18, `drop_item` 17, `view_blocks` 15, `prepare_dragon_perch` 15, `destroy_end_crystal` 15,
  `query_bot_data` 14, `attack_dragon_perch` 13, ...
- Responses: 217 succeeded, 49 failed, 25 partial, 19 refused, 13 cancelled. The model worked through about 90
  failed, partial or refused calls; the body alone does not win.
- The End took 25 minutes and 70 calls: 10 crystals in 9 minutes (the bow for the 8 open ones, then end stone
  collected three times for spiral staircases to the 2 caged ones), then 13 perch attacks over 15 minutes; health fell
  to 1.95 once.
- Pearls came from overworld endermen (18 hunts over 1.6 hours), not bartering.

## 7. What they have that we lack

From their fork README, source and docs (file paths are in their repo).

**Library fixes** (all MIT, small, portable to our mineflayer 4.39; their fork is 11 commits ahead of upstream and 17
behind):
- mineflayer: item use tracked by hand and item through hurt and shield-block statuses (eating, bow draw, shield);
  oxygen read only from the bot's own metadata; stale metadata cleared on respawn; partial pickups update the dropped
  item's count; placement corrections matched to interaction acknowledgements; crafting results and remainders
  synchronized (vanilla only, see section 3).
- prismarine-physics: tolerance for floating-point drift at block contacts (stalled moves, refused jumps, upstream
  PR #135); step-up probe uses the requested movement (low ceilings, PR #140).
- prismarine-recipe: returned containers (buckets, bottles). minecraft-data: corrected mining speeds (PR #1232).
- `src/world/end-credits.ts`: answer WIN_GAME value 0 (our M11 item; mineflayer 4.39 only answers 1).

**Runtime design worth taking even if we build:**
- Foreground actions return an action id; `wait_for_action` reads progress or the result; a retried `submission_id`
  returns the original action, a changed one is refused (`SUBMISSION_CONFLICT`). This is our M2 idempotency item [B4].
- A required one-sentence `rationale` on every call, logged: the M12 decision log [D8] for free.
- Receipts that wait a few ticks for the inventory count and say `confirmed: false` when it did not come.
- A supervisor process that kills a runtime whose event loop stalls (protects every other guest; ours is one process).
- Per-bot SQLite: status, inventory, containers, explored chunks with biomes, every call and outcome; `query_bot_data`
  (read-only SQL); notes.
- `set_survival_policy`: every reflex reads its thresholds from one policy with per-override lifetimes (session,
  encounter, until a health or item condition, or a duration). Our M4 `set_policy` is the same idea.

**Skills and reflexes** (none of these exist in our 10 skills):
- Reflexes: hostile combat (melee, bow, shield, creeper retreat, hiding, recovery), fire escape, breath (would have
  saved our spot D bot), footing with a water-bucket fall save, hunger with a raw-food policy, dragon evade, enderman
  gaze guard.
- Overworld: own navigation engine (incremental A*, continuous physics, dig, bridge, pillar, water-bucket drops up to
  80 blocks, hostile proximity cost), `collect_block` over every loaded chunk with a `logs` selector, lava faces sealed
  before mining, obsidian made by pouring water on lava; recursive `craft_item` with temporary tables; `smelt_item` with
  a temporary furnace; `collect_mob_drop` (shield required for hostiles, spawner camping); `use_bucket`,
  `use_container`, `build_structure` (Baritone-style builder), `sleep` (bed spawn), `equip` with slots,
  `drop_item in_a_hole`, `pick_up_items recover_death_items`, `explore_frontier` with an ASCII map, `barter`.
- Nether: `build_structure portal_frame`, `activate_portal` (flint and steel or eyes), `enter_nether_portal` and
  `enter_end_portal` (wait for arrival, portal cooldown, refuse with fewer than 16 food or 32 arrows unless overridden,
  require a bed respawn before the End), blaze hunting with the shield up through fireball bursts, endermen under a
  2-block roof.
- Stronghold: `locate_stronghold`, two phases: two eye throws triangulated (saved in SQL), then travel, a local
  refinement throw, eye pickup, and a survey of loaded chunks until an `end_portal_frame` is seen.
- End: `destroy_end_crystal` (bow trajectory with firing gaps, or a spiral staircase or pillar of end stone with the
  server's blast arithmetic checked against worn armor before the swing), `prepare_dragon_perch`,
  `attack_dragon_perch` (one perch window), `shoot_dragon` (leads the body, 64-block limit), dragon hazards
  (`src/world/dragon-hazards.ts`: breath clouds, fireballs, body corridor, perched head 6.5 blocks along the facing).
- Tests: 210 flat and 33 natural-terrain scenarios (End, Nether fortress and endermen, stronghold, combat, terrain)
  for Mine Labs, which builds the arena, places the player and summons the mobs. They run on vanilla servers; Paper
  support is UNVERIFIED.

## 8. What reuse costs (estimates)

The shared platform (10-13 days):
1. Paper crafting: confirmed window clicks in their craft path, then a Paper sweep of crafting, smelting, containers,
   portals and their scenario subset that Mine Labs can run against Paper: 3-4 days.
2. One body process per guest: spawn their runtime (or their host on a private port) per `start_game`, map game end,
   lease and kill switch onto it: 2 days.
3. Gateway mapping: our `start_game`, `play`, `play_sequence`, `get_state`, `stop`, `end_game` onto their actions,
   with the 45 s reply cap, `structuredContent`, and a curated tool subset for Muse (their 1.36 MB `tools/list` and
   required rationales are built for a large model): 2-3 days.
4. Live views: `/eyes`, `/watch` and the stream attach to an in-process mineflayer bot; theirs lives in a child
   process, so the viewer server moves into the child (the camera rides by player name through the console and is
   unaffected): 1.5-2 days.
5. Operations: Bun or tsx in the image, a data volume for per-bot SQLite, the 5 s heartbeat and CPU share tuned for
   picasso's load, logs into our JSONL: 1 day.
6. Strict iron runs and the End lab on staging (ROADMAP testing rules [D3, D5]): 1 day.

Then per area: Survival 1-2 days (expose `equip`, `eat`, `hunt`, `sleep`, `bucket`, `chest`, `explore`, the policy);
Nether 3-4 days (portal and obsidian flows on Paper, Nether labs, the live view across dimensions, which is ours
either way, M8); Stronghold 1-2 days; End 3-4 days (a `fight_dragon {max_minutes}` job over their primitives with the
stall watchdog from section 5, the crystal and dragon models in the view stay ours, M11).

## 9. License notes

- Mine AI MCP, Mine Labs and the block highlighter: MIT, "Copyright (c) 2026 AI Bengineering". Their forks of
  mineflayer, prismarine-physics, prismarine-recipe, node-minecraft-data and minecraft-data keep the upstream MIT
  licenses. Reuse, modification and redistribution are allowed; keep the copyright and permission notice in every copy
  or substantial portion (a `THIRD_PARTY` file and a credit line in the README, as we do for Mindcraft).
- The block highlighter's client part is a NeoForge mod for debugging; we do not need it.
- The reference dataset is CC BY 4.0: any caption, HUD or video that quotes its numbers (3 h 56 min, 388 calls,
  the milestone splits) credits "aibengineering / beat-the-game-minecraft".
- Nothing here changes the Mojang points in ROADMAP section 7: their code ships no game assets; minecraft-data is the
  same kind of data we already use.

If the call is "build" instead, take these anyway (MIT, small, each under a day; estimates): the mineflayer and
prismarine-physics fork fixes (section 7), the WIN_GAME value 0 answer (M11), a breath reflex (spot D), a `logs`
selector and a search over every loaded chunk for `collect` (spot F), `submission_id` replay for idempotency [B4],
temporary tables and furnaces inside `craft` and `smelt` (S4 gets simpler), and their dragon hazard geometry
(`src/world/dragon-hazards.ts`, `src/world/end-fight.ts`) for M11.

## 10. Deviations from the M0 spike plan

- Ran on this Mac, not on staging on picasso [D5]: no staging stack exists yet, and the Mac was loaded (load average
  7-11), which matters for the heartbeat failure and our furnace click timeout at spot E.
- A scripted MCP client, not Muse: Muse cannot reach a host bound to 127.0.0.1, and their MCP has no authentication,
  so it must not be exposed through a tunnel. A Muse run belongs after the gateway mapping (section 8, item 3).
- Their iron route ran on vanilla, ours on Paper, because their crafting does not work on Paper.
- n = 5 (theirs) and 3 (ours), one End lab: the ROADMAP asks for n, success rate and p90 [D2, D8]; these are first
  numbers, not acceptance results.

## 11. Reproduce

Everything lives in `~/picasso-work/spike/` (outside the repo):

```sh
cd ~/picasso-work/spike
paper-25566/start.sh > paper-25566/server.log 2>&1 &        # Paper 1.21.4, seed 71811045, port 25566
vanilla-25567/start.sh > vanilla-25567/server.log 2>&1 &    # vanilla 1.21.4, same seed, port 25567
cd mine-ai-mcp && ../bun-dl/bun-darwin-aarch64/bun install
../bun-dl/bun-darwin-aarch64/bun src/server/host.ts --minecraft-port 25567 --username Tst_M0_Van \
  --listen-port 25576 --data-root ../mine-data-van &
cd ../scripts
MCP_URL=http://127.0.0.1:25576/mcp node iron-route.mjs van-X        # strict iron route; runs/van-X.json
node craft-diag.mjs dark_oak_planks 25 tag                          # 2x2 craft reliability (port 25575 = Paper host)
node result-slot-probe.mjs 25566 Tst_M0_Probe                       # result-slot packets after a grid click
SERVER_LOG=../paper-25566/server.log PRESEED= node end-fight.mjs end-X   # scripted End fight
```

The spike patch to their fork's `craft.js` is in `mine-ai-mcp/node_modules/mineflayer/lib/plugins/craft.js`
(`craft.js.orig` is the original). Run logs: `scripts/runs/*.json`, raw replies in `scripts/runs/raw/`, the
reference data in `btg-dataset/`.

State after the spike: both spike servers, every host and both of our spike agent instances are stopped; no test bot
is online. The worlds stay in `paper-25566/` and `vanilla-25567/`. The shared local server (25565), picasso and
production were not touched, and no paid model API was called.
