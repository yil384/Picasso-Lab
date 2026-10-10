<!-- mineai/README.md - Mine AI MCP as the Muse bot body: the pinned upstream commit, our patches (crafting on Paper, the watchdog window, the host token, the player name off the command line, the runtime's exit, no placement into a flower, a collect tried again after a landing, no placement into a mob's cell, a build that never stalls the event loop, builds on rough ground), how to build it, and what was measured. -->
# Mine AI MCP as the bot body: pinned upstream, our patches

Decision (2026-10-08, after the M0 reuse spike, `../../../../research/muse-reuse-spike.md`): run the Mine AI MCP
runtime (https://github.com/aibengineering/mine-ai-mcp, MIT) as the body of a guest bot, behind our gateway. Their
code never enters this repository. We keep a pinned upstream commit and our patch files, and
`fetch-and-patch.sh` clones that commit into a folder, applies the patches and installs the dependencies at build
time. How the agent runs it (`BODY=mineai`, one host per guest game) is in `../README.md`, section "The Mine AI MCP
body"; this folder is the runtime itself: the pin, our eleven patches, the build, and the measurements of the crafting
fix (their crafting failed on Paper, the server we deploy), of the two gate patches, of 0009, 0010 and 0011.

| File | What it is |
| --- | --- |
| `UPSTREAM.json` | the one place the pin is written down: their repository, the commit, their mineflayer fork's commit, and our patches in the order they apply |
| `fetch-and-patch.sh` | the build: `mineai/fetch-and-patch.sh <new folder>`: clone the pinned commit, `git apply` our patches in order, `bun install --frozen-lockfile`, check that `node_modules/mineflayer` is their pinned fork, stamp the folder (`.muse-mineai.json`: the commit and each patch's sha-256), typecheck, run the crafting tests. `--no-install`, `--no-check`. The agent image runs it too (`deploy/Dockerfile.agent`, `--build-arg MINEAI=1`) |
| `../scripts/mineai-fetch.mjs` | the same fetch in Node, which can also update a folder in place; `--check <dir>` says whether a folder is exactly the pin plus these patches (either script's stamp) |
| `patches/0001-craft-by-confirmed-window-clicks.patch` | the fix: crafting by confirmed window clicks (below) |
| `patches/0002-confirmed-crafting-tests.patch` | its tests: a bot double with a server's side of windows that also sends Paper's result burst |
| `patches/0003-unresponsive-window-from-env.patch` | their supervisor's 5 s event-loop watchdog widened by `MINEAI_UNRESPONSIVE_MS` (5-120 s) for a loaded machine |
| `patches/0004-host-token.patch` | with `MINEAI_HOST_TOKEN` set (from the agent, per host, environment only), their host and its runtime refuse requests without `Authorization: Bearer <token>` (their host had no authentication); the agent checks that a request without it gets 401 before it uses a host |
| `patches/0005-player-name-off-the-command-line.patch` | the player name from `MINEAI_USERNAME`, and the runtime's bootstrap (which holds the name) in the runtime's environment instead of its command line: on a whitelisted server the private name is the secret, and every user of the machine can read command lines; with a test of its own in `src/server/config.test.ts` |
| `patches/0006-runtime-exits-once-stopped.patch` | their runtime process exits once a SIGTERM's stop is done (its IPC channel kept it alive until their supervisor's SIGKILL, `MINEAI_UNRESPONSIVE_MS` later, on every game end) |
| `patches/0007-no-placement-into-a-flower.patch` | a placed block (a temporary table or furnace, a bed, `place_block`) never goes into a cell the server will not replace: flowers and tulips out of their replaceable set (vanilla's and Paper's `replaceable` tag has none of them), snow only as a single layer; staging spot 7's table went on a poppy and the server refused it. Tests in `src/world/block-classification.test.ts` and `src/world/nearby-placement.test.ts` |
| `patches/0008-collect-retries-once-after-landing.patch` | `collect_block` whose path search gave up ("no path found", nothing gained or broken) within 30 s of a landing (the server moved the bot more than 16 blocks) is run once more after the chunks around the bot have loaded and a 2 s pause; staging's 8-at-once failure. The runtime owns the landing watch (`src/world/landing.ts`, disposed with the bot's other listeners). Tests in `src/world/landing.test.ts` and `src/actions/collect-block/collect-block.test.ts` |
| `patches/0009-placement-around-a-mob.patch` | a block put down beside the bot (a temporary table or furnace, a table for a craft, `place_block`'s nearby cell) never goes into a cell a mob or another player is in, and when one moves into the chosen cell before the block goes down, the next cell is tried after a 4-tick pause (3 cells at most); the soak's run 8 of 8 at once ("Placement cell ... overlaps bat"). Tests in `src/world/nearby-placement.test.ts` |
| `patches/0010-build-never-stalls-the-event-loop.patch` | `build_structure` never stops the runtime's event loop, and builds a shelter around the bot: no placement is held back as enclosing when the bot is meant to be inside (the request asks for the cell its feet stand in to be air, as our `shelter` does) or the world already walls it in (a pocket in stone); steps out of the structure in a row that change nothing end the build after 3 with the reason; every pass of the loop yields to the event loop. A shelter in a pocket in stone stopped their runtime 4 of 4 times (their watchdog, `RUNTIME_UNRESPONSIVE`), and on open ground stopped at 9 of 10. Tests in `src/navigation/processes/building/build-process.test.ts` |
| `patches/0011-build-on-rough-ground.patch` | `build_structure` gives up on no cell the bot can reach: no scaffolding into a cell of the structure; a cell no route reaches is tried from up to 3 places to stand within reach of it (5 s searches, 12 such routes a run) before that cell alone is given up on ("unreachable", with what was tried); a column of up to 4 blocks under a cell with nothing to place against (a wall over a drop or over water); a wall or roof cell of solid ground that cannot be dug out keeps its block, and a cell to clear that holds water stays water (both counted done, and reported: `kept`, `water`, `supports` in the audit); a cell that fills again after 3 digs is given up on; every cell worked yields to the event loop. The Muse re-test's builds in a gravel pocket (g42b738), a hut over a slope (0 of 23 placed) and a hut in a pond (the runtime stopped). Tests in `build-process.test.ts`, `build-structure.test.ts`, `movement-policy.test.ts` |
| `patches/0012-reflex-toggles.patch` | Two policy fields so the player (Muse) decides what the body does on its own: `food.reflex` (`full`, their default: eat at hunger 14 or when hurt; `starving`: eat only at hunger 4 or less; `never`) and `navigation.escape_reflexes` (default true; false keeps the breath, fire and footing reflexes from acting). Both are set through `set_survival_policy` (the gateway's `policy` skill). Advise mode (MINEAI_CARE=advise) sets `food.reflex: starving`. Tests in `hunger.test.ts`, `breath.test.ts` |
| `LICENSE-mine-ai-mcp` | their MIT notice, kept with the patches |
| `bench/` | the scripted checks behind the numbers below (no model): crafting, smelting, chests, equip and drop against the server's own record, and the strict iron route on their tools; `gateway-iron.mjs`: the strict iron route through our `/mcp` (`../test/e2e/mcp-iron.mjs`), n games in turn or at once, with every host's and runtime's memory and CPU, the agent's event loop and the bots' deaths; `gates.mjs`: the Paper check of patches 0007 and 0008; for the soak of gate 2, `lease-soak.mjs` (one game through its whole lease with a mixed script: memory, heartbeats, restarts and the live view watched throughout) and `muse-session.mjs` (a session in plain HTTP JSON-RPC through the public `/mcp`, with a re-sent `request_id` and a resume by handle); `procs.mjs`: the process sampler both benches share; `muse-deltas.mjs`: the actions behind the Muse run's unclear inventory changes, with their evidence and our reply, the check of 0009 (bats in the cells around the bot) and the shelters of 0010 (s4, s4b); `muse-replay.mjs`: the Muse run's calls again through the public `/mcp`, every reply checked; `build-spots.mjs`: `build_structure` with our blueprints at rough spots on Paper (the re-test's own gravel pocket, a cave mouth, a slope, a pond edge), every try from the same saved terrain, checked cell by cell on the server; `build-staging.mjs`: hut and shelter builds through the public `/mcp`, one game per spot, a retry that must continue the same hut; `survive.mjs`: n games at once, each through its whole lease with a slow scripted player in real days and nights (the M4 natural check: deaths, nights, what the body did on its own and whether every reply said so); `survive-labs.mjs`: the M4 prepared labs (hunger, a night shelter, a bed, zombie, skeleton and creeper fights, armor, a tool about to break, a death), set up with console commands |

## Pins

| What | Pinned at | From |
| --- | --- | --- |
| Mine AI MCP | `2fe1306a0ac51efa99154048e65f2caff00a8934` (upstream `main` on 2026-10-08) | `UPSTREAM.json` |
| their mineflayer fork | `9fa1140b90877a084efd988905df0c0eceaa78d0` (mineflayer 4.39.0 + their fixes) | their `package.json` and `bun.lock` |
| prismarine-physics, prismarine-recipe forks | `56a6794611069272653b14eb078a1454633f4eb3`, `542f0600f5ddf07bb16df67fa1ac06e603bd28e0` | their overrides |
| minecraft-data | 3.116.0 from their release `mine-ai-c932f743` | their overrides |
| Mine Labs (their scenario harness, dev only) | `aba1cdf0add0e7239194e23b5c657c97378aef53` | their dev dependencies |

No patch to their mineflayer fork is needed: the fix replaces the one call into mineflayer's `craft()` from their
`src/world/crafting.ts`, so the fork stays exactly as they pin it (the script checks it after install).

## Build: Bun

```sh
BUN=/path/to/bun mineai/fetch-and-patch.sh ~/picasso-work/mineai-runtime   # under a minute with a warm Bun cache
node scripts/mineai-fetch.mjs ~/picasso-work/mineai-runtime --check        # the pin plus our 11 patches, installed
BODY=mineai MINEAI_DIR=~/picasso-work/mineai-runtime MINEAI_RUNTIME=bun npm start   # the agent, one host per game
cd ~/picasso-work/mineai-runtime && MINEAI_USERNAME=Tst_rv_cp bun src/server/host.ts --minecraft-port 25566 \
  --listen-port 25691 --data-root <dir>                                     # or one host by hand
```

Install and run with **Bun** (1.4.2 here; their `package.json` asks for Bun >= 1.4 or Node >= 24.15). The install
uses their `bun.lock` frozen, so the GitHub forks resolve to the commits above; their test and typecheck scripts are
Bun too. The same tree also runs under Node 24+ as `node --import tsx src/server/host.ts ...` (measured in the spike),
which keeps a Node-only image possible, but the install step still needs Bun for the lockfile. The image therefore
gets a Bun binary (or a Bun build stage) next to Node.

## The Paper fix (patch 0001)

On Paper 1.21.4 their crafting fails: 5 of 50 2x2 crafts and 0 of 30 table crafts on this bench before the patch
("Server did not supply the expected crafting result"), and their own Mine Labs crafting scenario stops at its first
craft. After the click that completes a recipe, vanilla sends one `set_slot` for the result; Paper sends a burst (the
clicked slot, the result slot empty and then filled, the grid, a full window resync). Their fork's `craft.js` reads
the result slot as soon as its click resolves and sees the empty step, and at a table the resync leaves mineflayer's
cursor model wrong, so later clicks put a stick where a plank belongs.

The patch ports our confirmed window clicks (`../src/skills/window.js`, `../src/skills/craft.js`) into
`src/world/confirmed-window.ts` and `src/world/confirmed-craft.ts` and routes `executeCraftPlan` through them whenever
the bot talks to a real 1.17.1+ server:

- every click is a raw `window_click` with state id -1, which the server always answers with exactly one full resync;
  a settle counts those resyncs and then waits for a 50 ms quiet spell, so extra packets (Paper's burst) cannot end
  it early, and a server that stays silent fails after 4 s instead of hanging;
- clicks are planned only on a window the server has confirmed: put k of each ingredient in its grid slots, settle,
  check that the result slot shows the recipe's item (else hand the grid back and fail with what the server showed),
  shift-click the result, settle, count what arrived, hand back anything left in the grid;
- one window for the whole plan (a table opens once, not once per application), batches of up to a stack per grid
  slot when the outputs fit, using the native path's room rule per batch (a batch that would overflow the inventory is
  made smaller, and a single one that cannot fit is refused before any click, with their error text);
- the 2x2 grid is closed with `close_window 0` (mineflayer never sends it), so nothing stays in the grid; the player
  inventory is resynced before the action counts its gains;
- cancellation stops between clicks and still closes the window, so the server hands the grid back.

Their native path stays for test doubles without a protocol client and for pre-1.17 servers. Smelting, chests,
equip and drop were measured on Paper with their unchanged code and need nothing (below).

## Measured (2026-10-08, this Mac, Paper 1.21.4-232 on 25566 and vanilla 1.21.4 on 25567, seed 71811045)

Every call is checked against the **server's own record** (console `data get entity` / `data get block`), not only
against what the bot reports: the server inventory must gain exactly what was asked (recursive crafting may leave less
than one application's surplus), wood, stone and iron units must be conserved (nothing left in a grid, on a cursor or
on the ground), and the bot's own inventory view must equal the server's afterwards. Bots `Tst_rv_cp` (Paper) and
`Tst_rv_cv` (vanilla) on a stone platform at 3000, 200, 3000; hosts built by `fetch-and-patch.sh`.

| Check | Paper, before | Paper, patched | Vanilla, before | Vanilla, patched |
| --- | --- | --- | --- | --- |
| 2x2 crafts (planks of four woods, sticks, tables) | 5 of 50 | **50 of 50**, 0.31 s median per call | 50 of 50, 0.013 s | **50 of 50**, 0.31 s |
| table crafts (wooden, stone, iron pickaxes, furnace; a table in reach and a temporary one) | 0 of 30 | **30 of 30**, 0.32 s with a table in reach, 4.7 s with a temporary one (place, craft, dig it back) | 29 of 30 (1.06 s in reach, 4.4 s temporary; the miss: a temporary table dug but not picked up, a `collect_block` pickup, not a window) | **30 of 30**, 0.33 s and 4.9 s |
| their tests | - | typecheck clean; crafting tests 53 pass; whole suite 1572 pass, 0 fail (1564 upstream + 8 new) | - | - |
| their Mine Labs scenario `craft/workshop` (nine logs to a table and 32 planks, a door, smelting at 16 TPS, furnace recovery) | fails at its first `craft_item` | **passed** (146 s) | - | **passed** (145 s) |

Other window flows on Paper, their code unchanged (the patch does not touch them):

| Flow | Paper | Vanilla |
| --- | --- | --- |
| `smelt_item` raw iron x1-3, coal or planks, temporary and placed furnace | **24 of 24** in two runs (input, fuel and furnace exact; placed furnace left empty) | 17 of 18 in two runs: the miss was the bench reading the server a few ms before the take arrived (the ingots were there a second later; the bench now reads again after a second, and the second run had 12 of 12, none late) |
| `use_container` deposit, withdraw, organize, inspect | **30 of 30** (and 30 of 30 in an earlier run) | 30 of 30 |
| `use_container` on a fragmented chest (organize packs it in order, then deposit into partial stacks, withdraw) | **30 of 30** (and 30 of 30 earlier) | 30 of 30 |
| `equip` (four armour pieces, shield to the off-hand, sword from the main inventory) and `drop_item` | **10 of 10** (every slot checked on the server; 10 of 10 earlier) | 10 of 10 |

So the burst that breaks crafting is specific to the crafting result slot; furnace output, container transfers and
number-key swaps are answered as mineflayer predicts.

### Their iron route on Paper (patched)

The spike's strict route (`bench/iron-route.mjs`, unchanged: `collect_block logs 5`, `craft_item crafting_table`,
`craft_item wooden_pickaxe + 4 sticks` on a temporary table, `collect_block stone 11`, `craft_item stone_pickaxe +
furnace` on a temporary table, `collect_block iron_ore 3`, `smelt_item raw_iron 3` in a temporary furnace,
`craft_item iron_pickaxe`; no model, no retries, every call counted) at the spike's five spots, on a fresh copy of the
spike's Paper server (same jar 1.21.4-232, configs and seed, untouched world, port 25568: the 25566 world had been
mined at B to E by earlier spike runs). Bot `Tst_rv_ir`, empty inventory, full health and food at each start.

| Spot (start) | Paper, patched (2026-10-08) | Vanilla, unpatched (spike, 2026-10-07) |
| --- | --- | --- |
| B (-502, 123, 401) | **103.0 s**, 8 actions, 0 failed | 99.2 s |
| C (1201, 70, -898) | **117.0 s**, 8 actions, 0 failed | 109.6 s |
| D (-1501, 76, -1297), mangrove swamp | **135.7 s**, 8 actions, 0 failed | 141.6 s |
| E (2201, 96, 1798), savanna | **139.0 s**, 8 actions, 0 failed | 162.1 s |
| F (-2601, 70, 2902), no trees within 32 blocks | **160.7 s**, 8 actions, 0 failed | 199.6 s |
| **Summary** | **5 of 5; median 135.7 s, max 160.7 s**; 0 failed steps, 0 retries, 10 tool calls each | 5 of 5; median 141.6 s, max 199.6 s |

Before the patch the same route on Paper stopped at its first craft (spike, spots A and 1). Where the time goes on
Paper (seconds, range over the five spots): logs 19.5-45.0, the four crafting calls together 15.5-16.2 (vanilla's
native path: 13.3-14.7), stone 23.5-28.9, iron 11.7-62.4, smelting 3 iron 32.0-33.0. Mining varies with the terrain
and the ore the bot happens to find; the crafting calls cost about 1-3 s more per route than on vanilla.

### Patches 0007 and 0008 on Paper (gate 3)

`bench/gates.mjs` on this Mac's Paper (1.21.4-232 on 25565, seed 71811045), one host of the runtime, bot `Tst_gate_`
and random letters, every placement checked with the server's `execute if block` (2026-10-08):

| Check | Built with 0001-0006 | Built with 0001-0008 |
| --- | --- | --- |
| a temporary table for `craft_item wooden_pickaxe`, the 8 cells around the bot holding flowers (5 kinds in turn) | 0 of 5: "block at ... is still poppy" (dandelion, cornflower, oxeye_daisy, red_tulip) | 10 of 10: the table on clear ground 2 blocks away, 8 of 8 flowers standing, the pickaxe in the server's inventory, the table picked up again, 2.8-2.9 s |
| `collect_block oak_log 1` from a closed barrier box with logs outside, 1 s and 35 s after a 100-block teleport | no second try | 3 of 3: one more try right after the landing (2.2-4.4 s, the result says so), none after 35 s |

Their whole suite with both: 1,579 pass, 0 fail (6 of the tests new); typecheck clean. `fetch-and-patch.sh` now also runs the
tests of 0007 and 0008 (and the runtime's own listener-count and disposal tests, which the landing watch touches).

```sh
BUN=... node mineai/bench/gates.mjs ~/picasso-work/mineai-runtime-8 --server <Paper folder with console.in> --flowers 10 --landings 3
```

### Patch 0009 on Paper (after the Muse run, 2026-10-08)

The soak's one runtime failure of 8 games at once (run 8): `craft iron_pickaxe` failed in 1.3 s, "crafting_table:
Placement cell (3, 51, 6322) overlaps bat #44444". Their cell choice (`chooseCell` in `src/world/nearby-placement.ts`)
looked at blocks only; the placement then checked the cell for bodies (`occupiedCell`) and failed. 0009 leaves out
cells a mob or another player is in, and when one moves into the chosen cell between the choice and the placement
(their check before the click, or the server refusing it while a body is there), tries the next cell after a 4-tick
pause, 3 cells at most; any other refusal is reported as before. `bench/muse-deltas.mjs` on this Mac's Paper (25565,
bot `Tst_dl_` and random letters): a stone platform in the sky, bats held still (NoAI, no gravity) in the 8 cells
around the bot, `craft_item wooden_pickaxe` with a temporary table:

| Runtime | Result |
| --- | --- |
| 0001-0008 (`mineai-runtime-8`) | **0 of 3**: "[WORKSTATION_PLACEMENT_FAILED] crafting_table: Placement cell (14399, 200, 14000) overlaps bat #29469", the soak's error, in 0.5 s |
| 0001-0009 (`fetch-and-patch.sh`) | **3 of 3**: the table 2 blocks away (dx -2), the pickaxe made, the table picked up again, 5.1-5.2 s |

Unit tests (`src/world/nearby-placement.test.ts`, 3 new): a cell a bat is in is not chosen; a bat that arrives between
the choice and the placement sends the table to the next cell after a pause; bats in the way of every try end with the
last refusal after 3 cells, and a refusal with nobody in the cell is not tried again. Their whole suite with 0009:
1,582 pass, 0 fail; typecheck clean; the build's own test list (`fetch-and-patch.sh`, which already runs
`nearby-placement.test.ts`): 99 pass.

```sh
BUN=... node mineai/bench/muse-deltas.mjs ~/picasso-work/mineai-runtime-9 --server <Paper folder with console.in> --only bats --bats 3
```

### Patch 0010 on Paper (2026-10-08)

The cause, found in their loop (`build()` in `src/navigation/processes/building/build-process.ts`): when the bot stands
in a cell the structure needs, or when every placement left would seal it in, the build asks for a route out of the
structure and goes round again; a route whose goal is already met where the bot stands completes at once, so the loop
asked again forever with nothing real to await, and the event loop never ran another timer or socket read until their
supervisor's watchdog ended the runtime. In a 1x2 pocket in stone every placement reads as sealing the bot in (the
stone already does), and our shelter keeps the bot's own cells as air, so their rule refused its last block anywhere.
The two new unit tests (a pocket in stone; routes out that leave the bot where it was) hung without the patch: their
per-test timeout never fired, because the loop starved the event loop. With it: a placement is never held back as
enclosing when the request asks for the cell the bot's feet stand in to be air or the world already walls the bot in;
3 step-outs in a row that change nothing end the build ("could not step out of the structure: 3 routes out ended at
x,y,z with the bot still held by it"); every pass yields to the event loop. `bench/muse-deltas.mjs` on this Mac's
Paper (25565, bot `Tst_dl_` and random letters), `build_structure` with our shelter's cells:

| Runtime | s4: shelter in a 1x2 pocket in stone | s4b: shelter on open ground |
| --- | --- | --- |
| 0001-0009 (`mineai-runtime-9`) | **0 of 4**: the runtime's event loop stopped, their watchdog ended it (`RUNTIME_UNRESPONSIVE`, over 60 s with `MINEAI_UNRESPONSIVE_MS=60000`) | 9 of 10 placed: "could not step out of the structure: no path found" |
| 0010 without the shelter rule (the first cut, `mineai-runtime-10`) | 3 of 3 without a runtime stop: 1 complete (7.1 s), 2 at 11 of 12 cells (a roof cell refused, 8.6 s) | 9 of 10 placed, as before |
| 0001-0010 (`fetch-and-patch.sh`, `mineai-runtime-10b`) | **3 of 3 complete**: 10 placed, 10 cells dug, 7.0-7.1 s, the bot inside | **3 of 3 complete**: 10 placed, 1.0 s, the bot inside |

Their whole suite with 0010: 1,585 pass, 0 fail (3 tests new); typecheck clean; the build's own test list (now with
`build-process.test.ts`): 112 pass. On staging (the first cut), Muse's calls replayed at spot 7015 -4050 ended the
shelter "could not step out of the structure: 3 routes out ended at 7011,83,-4049 with the bot still held by it": a
clean failed step where the runtime would have stopped before; with the shelter rule, the replay at spot 8100 0 built
it (10 placed, 6 cells dug, 11.4 s for the collect and the build).

```sh
BUN=... node mineai/bench/muse-deltas.mjs ~/picasso-work/mineai-runtime-10b --server <Paper folder with console.in> --only s4b,s4
```

### Patch 0011 on Paper (builds on rough ground, 2026-10-08)

The Muse re-test on staging (game `g42b738`) left 1-3 cells of every build "refused" after 2 s path searches, in a
gravel pocket its iron route had dug near -178 62 56. This Mac's Paper (25565) has staging's seed, so the spot's
natural terrain is the same; `bench/build-spots.mjs` carves in the tunnels and shafts the Muse game dug (read from
staging's region file `r.-1.0.mca` after the game, its huts left out), saves each spot once with `/clone` to a stash
20,000 blocks east and clones it back before every try, gives the bot (`Tst_bs_` and random letters) 64 cobblestone,
an iron pickaxe, an iron shovel and 16 dirt, turns it to the spot's heading, and sends `build_structure` with our
blueprints' cells (`blueprintCells`, as the gateway sends them). A try counts complete when the server's own record
(`execute if block`) has every cell as asked, or as the audit says it was left: solid ground kept, water in a cell to
clear. It reproduced F1 and F3 cell for cell: before 0011, F1's start left `-178,61,55` and `-178,62,53` and F3's
start `-176,64,58` and `-177,64,58` refused, the same cells as on staging.

The causes, traced in their build loop at the spot (a log line per pass, cell and route; not part of the patch):

- **Scaffolding in a structure cell.** The route out of the hut put dirt into the wall cell `-178,61,55` it had just
  dug and stood in; the dirt's only open face was behind the back wall, so no place within reach could see it.
- **The wrong cell refused.** When a search for any workable cell failed (2 s, `failureTimeoutMs`), their builder
  gave up on whichever cell was nearest the bot (`refuseClosest`), not the one the search was for.
- **Buried cells.** A roof cell of stone whose every face is stone or a block the build had placed cannot be dug from
  anywhere; for a wall or roof the stone does the cell's job.
- **Walls over a drop.** On the slope (`hill-down`) every wall cell stood 2-4 blocks over the ground: "23 have nothing
  solid to place against", 0 placed.
- **Water.** Standing in a pond (`pond-wade`), the hut's door and inside cells held water. Their dig of water settles
  at once without removing it, so the in-reach loop dug it again and again without yielding, and their watchdog ended
  the runtime (`RUNTIME_UNRESPONSIVE` after 5.0-5.2 s; 5 s is also production's window). A shelter there: the bot floats half a
  block up in water, into its roof cell, and the placement was refused ("overlaps player").

`bench/build-spots.mjs` on this Mac's Paper, 2026-10-08, the same spots, inventory and headings for both runtimes (the
first 2 tries a spot, the second 3; complete: every cell as asked on the server, or as the audit says it left it):

| Spot (start, heading) | hut_3x3, 0001-0010 (`mineai-runtime-10b`) | hut_3x3, 0001-0011 (`mineai-runtime-11`) | shelter, 0001-0010 | shelter, 0001-0011 |
| --- | --- | --- | --- | --- |
| `muse-f1`: the gravel pocket, F1's start (-177 61 52, south) | **0 of 2**: 25 of 27, F1's two cells refused after 2 s searches, 24 s | **3 of 3**: 26 exact, 1 roof cell of stone kept, 24 s | 0 of 2: 11 of 12, 1 refused | 3 of 3: 11 exact, 1 stone kept, 5.0 s |
| `muse-f3`: the pocket, F3's start (-175 62 57, west) | **0 of 2**: 25 of 27, F3's roof cells refused, 15 s | **3 of 3**: 25 exact, 2 roof cells of stone kept, 17 s | 2 of 2 | 3 of 3, 3.2 s |
| `cave-in`: a tunnel mouth, facing in | 2 of 2, 1.2 s | 3 of 3, 1.2 s | 2 of 2 | 3 of 3, 0.5 s |
| `cave-side`: the mouth, half the hut in rock | 2 of 2, 9.6 s | 3 of 3, 9.8 s | 2 of 2 | 3 of 3, 0.5 s |
| `hill-up`: a stone slope, uphill (the hut cut into it) | **0 of 2**: 26 of 27, 1 refused, 25 s | **3 of 3**, 21 s | 0 of 2: 8 of 12, "nothing solid to place against" | 3 of 3 (2 dirt under it), 1.4 s |
| `hill-down`: the slope downhill, walls 2-4 over the ground | **0 of 2**: 0 placed, 23 "nothing solid to place against" | **3 of 3** (2 dirt under the walls), 1.3 s | 0 of 2: 10 of 12 | 3 of 3 (1 dirt), 0.6 s |
| `pond-bank`: a pond's bank, facing the water | 2 of 2, 1.2 s | 3 of 3 (3 dirt in the water under the walls), 1.3 s | 0 of 2: 10 of 12 | 3 of 3 (1 dirt), 0.5 s |
| `pond-wade`: standing in the pond | **0 of 2: the runtime stopped** (`RUNTIME_UNRESPONSIVE`, 5.0 and 5.1 s) | **3 of 3**: 25 exact, the door and inside cells water, 1.2 s | **0 of 2: the runtime stopped** | 3 of 3: 11 exact, the bot's cell water, 0.6 s |
| **All** | **12 of 32, 4 runtime stops** | **48 of 48** (33 exact), 0 runtime stops | | |

The runtime's event loop during the builds, measured inside it (`monitorEventLoopDelay`, a log line per build; a dev
tree only, not part of the patch), every spot and blueprint once: 16 builds, the longest delay 17.8 ms, the worst 99th
percentile 8.7 ms (their watchdog ends a runtime after 5,000 ms); no runtime stop in any build with 0011 on this bench.
Their whole suite with 0011: 1,595 pass, 0 fail (10 tests new); typecheck clean; the build's own test list
(`fetch-and-patch.sh`, now with `build-structure` and `movement-policy`): 134 pass.

```sh
BUN=... node mineai/bench/build-spots.mjs ~/picasso-work/mineai-runtime-11 --server <Paper folder with console.in> --tries 3
```

## Found along the way (not window clicks)

- **A build around the bot (our `shelter` blueprint) did not finish, and in a pocket in stone it stopped their
  runtime: fixed by 0010 (below).** Their builder never sealed the bot in (`build-process.ts`: it steps out of the
  structure first).

- **Their planner counts carried sticks toward a pickaxe even when sticks are asked for too.** `craft_item
  wooden_pickaxe 1 + stick 4` with 20 sticks carried makes 4 sticks and uses 2 carried ones: a net gain of 2 of 4,
  reported `partial` ([CRAFT_RESULTS_NOT_OBSERVED]). Same on vanilla; the iron route does not hit it (no sticks
  carried). For the gateway: ask for sticks first, or fix the planner's reservation upstream.
- **A reused `submission_id` replays the old result, across restarts** (their per-bot SQLite keeps it). A bench that
  reused labels got "succeeded" with no clicks at all. Our gateway's `request_id` must map to a fresh
  `submission_id` per game.
- **Speed of the confirmed path.** A 2x2 craft call takes 0.31 s (median) on both servers, where vanilla's native path
  answered in 0.013 s, because the native path reports from the client's prediction without waiting for the server.
  At a table in reach the confirmed path is faster (0.32 s against 1.06 s: the native path opens and closes the table
  for every application). Follow-up (estimate, about 0.1 s per call): skip the settle before the first click in a
  table that has just opened, and the inventory resync after a close that left the grid and cursor empty, as our body
  does (ROADMAP M2, S10).
- **Their other actions also report from the client's prediction.** A furnace take or a chest transfer can still be
  on its way to the server when the action returns (one vanilla smelt was read a few ms early above); the items
  arrive. A gateway that reads the inventory from the server right after an action should allow for that.

## Reproduce

Everything outside the repo lives in `~/picasso-work/rv-craft/` (bench output, bot data, logs, built trees) and
`~/picasso-work/spike/` (the two test servers). The bench needs this agent's `node_modules` (MCP client).

```sh
cd ~/picasso-work/spike && paper-25566/start.sh > paper-25566/server.log 2>&1 &     # Paper 1.21.4 on 25566
vanilla-25567/start.sh > vanilla-25567/server.log 2>&1 &                            # vanilla 1.21.4 on 25567
BUN=~/picasso-work/spike/bun-dl/bun-darwin-aarch64/bun mineai/fetch-and-patch.sh ~/picasso-work/rv-craft/mineai-build
BUN=... mineai/bench/host.sh paper ~/picasso-work/rv-craft/mineai-build &           # Tst_rv_cp, MCP on 25691
BUN=... mineai/bench/host.sh van ~/picasso-work/rv-craft/mineai-build &             # Tst_rv_cv, MCP on 25692
mineai/bench/final.sh paper; SMELT_N=6 mineai/bench/final.sh van                    # 2x2, table, chest, chest2, equip, smelt
mineai/bench/iron.sh rv-paper B C D E F    # after IRON_SERVER_DIR/start.sh and `host.sh iron`
mineai/bench/stop.sh Tst_rv_cp             # stop a host and its runtime
```

`IRON_SERVER_DIR` (default `~/picasso-work/rv-craft/paper-iron-25568`) is a copy of `~/picasso-work/spike/paper-25566`
without its worlds, logs and console, whose `start.sh` is the spike's with `server-port=25568`.

Their tests in the built tree: `bun x --bun tsc -p tsconfig.check.json --noEmit`, `bun test ./src ./scenarios/src
./tests`, and the Mine Labs scenario with `MINE_LABS_HOME=<dir> JAVA_HOME=<Java 21> bun x --bun --no-install mine-labs
run --port 25700 tests/minecraft/scenarios/craft` (for Paper: a `MINE_LABS_HOME` whose `servers/1.21.4/server.jar` is
the Paper jar and whose `runtimes/1.21.4/` holds Paper's `libraries` and `versions`).

## License

Mine AI MCP, Mine Labs and the block highlighter are MIT, "Copyright (c) 2026 AI Bengineering"
(`LICENSE-mine-ai-mcp`). Their forks keep the upstream MIT licenses (mineflayer: Copyright (c) 2015 Andrew Kelley;
prismarine-physics: Copyright (c) 2020 PrismarineJS; prismarine-recipe and minecraft-data: MIT, PrismarineJS). The
patches modify their MIT code and add files ported from this agent; the built tree keeps their `LICENSE`, and any
image that ships it keeps that notice. Whether to offer patch 0001 upstream (and under which terms for our part) is
the owner's call.
