<!-- mineai/README.md - Mine AI MCP as the Muse bot body: the pinned upstream commit, our patches (crafting on Paper), how to build it, and what was measured. -->
# Mine AI MCP as the bot body: pinned upstream, our patches

Decision (2026-10-08, after the M0 reuse spike, `../../../../research/muse-reuse-spike.md`): run the Mine AI MCP
runtime (https://github.com/aibengineering/mine-ai-mcp, MIT) as the body of a guest bot, behind our gateway. Their
code never enters this repository. We keep a pinned upstream commit and our patch files, and
`fetch-and-patch.sh` clones that commit into a folder, applies the patches and installs the dependencies at build
time. This folder is the first piece of that work: their crafting failed on Paper, the server we deploy, and the
patches here fix it.

| File | What it is |
| --- | --- |
| `fetch-and-patch.sh` | `mineai/fetch-and-patch.sh <new folder>`: clone the pinned commit, `git apply` our patches in order, `bun install --frozen-lockfile`, check that `node_modules/mineflayer` is their pinned fork, typecheck, run the crafting tests. `--no-install`, `--no-check` |
| `patches/mine-ai-mcp/0001-craft-by-confirmed-window-clicks.patch` | the fix: crafting by confirmed window clicks (below) |
| `patches/mine-ai-mcp/0002-confirmed-crafting-tests.patch` | its tests: a bot double with a server's side of windows that also sends Paper's result burst |
| `LICENSE-mine-ai-mcp.txt` | their MIT notice, kept with the patches |
| `bench/` | the scripted checks behind the numbers below (no model): crafting, smelting, chests, equip and drop against the server's own record, and the strict iron route |

## Pins

| What | Pinned at | From |
| --- | --- | --- |
| Mine AI MCP | `2fe1306a0ac51efa99154048e65f2caff00a8934` (upstream `main` on 2026-10-08) | `fetch-and-patch.sh` |
| their mineflayer fork | `9fa1140b90877a084efd988905df0c0eceaa78d0` (mineflayer 4.39.0 + their fixes) | their `package.json` and `bun.lock` |
| prismarine-physics, prismarine-recipe forks | `56a6794611069272653b14eb078a1454633f4eb3`, `542f0600f5ddf07bb16df67fa1ac06e603bd28e0` | their overrides |
| minecraft-data | 3.116.0 from their release `mine-ai-c932f743` | their overrides |
| Mine Labs (their scenario harness, dev only) | `aba1cdf0add0e7239194e23b5c657c97378aef53` | their dev dependencies |

No patch to their mineflayer fork is needed: the fix replaces the one call into mineflayer's `craft()` from their
`src/world/crafting.ts`, so the fork stays exactly as they pin it (the script checks it after install).

## Build: Bun

```sh
BUN=/path/to/bun mineai/fetch-and-patch.sh ~/picasso-work/rv-craft/mineai-build   # under a minute with a warm Bun cache
cd ~/picasso-work/rv-craft/mineai-build
bun src/server/host.ts --minecraft-port 25566 --username Tst_rv_cp --listen-port 25691 --data-root <dir>
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

## Found along the way (not window clicks)

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
(`LICENSE-mine-ai-mcp.txt`). Their forks keep the upstream MIT licenses (mineflayer: Copyright (c) 2015 Andrew Kelley;
prismarine-physics: Copyright (c) 2020 PrismarineJS; prismarine-recipe and minecraft-data: MIT, PrismarineJS). The
patches modify their MIT code and add files ported from this agent; the built tree keeps their `LICENSE`, and any
image that ships it keeps that notice. Whether to offer patch 0001 upstream (and under which terms for our part) is
the owner's call.
