<!-- docs/MUSE-LONG-RUN.md - a long autonomous Muse run on staging in advise mode (iron, then diamonds, then the Nether and back): the one-line prompt to paste into muse.ai, what the server carries instead of a long prompt, how staging is set for it, and what our logs measure afterwards. -->
# A long Muse run (advise mode)

The claim on X is "Muse plays Minecraft". This run backs it up: Muse, in muse.ai, plays one staging bot through our
public `/mcp` for up to two hours. It goes for iron, then diamonds, then the Nether, and it makes every plan itself.

The body runs in advise mode (`MINEAI_CARE=advise`, the default since the advise-mode change). In this mode:

- **The body plans nothing.** It does not shelter at night, make a shield, hunt, craft armor or spare tools, or go back
  for its items after a death.
- **Every reply says what needs doing, under "Body advice".** Each item gives the facts (time to nightfall, food, tool
  durability, where the bot died) and the skill that would do it. Following the advice or not is Muse's choice.
- **The body acts by itself only by rules Muse sets** (since 2026-10-13). Every game starts with none: no reflex, and
  nothing before Muse's first call. Muse sets them with start_game `rules` or the `policy` skill at any time:
  - `defend`: fight back, raise the shield, wall in when badly hurt;
  - `flee`: withdraw from a hostile mob;
  - `escape`: out of water for air, out of fire and lava, footing back after a hit;
  - `eat_below N`: eat the best food carried at food N or less.

  The start_game reply explains the trade-off: a rule acts within a second, Muse's calls take seconds to minutes, so
  without defend and escape the bot dies more. Each action under a rule shows up in the next reply under "On its own"
  as "by your rule ...".
- **The game counts who acted.** get_state and end_game report it, for example "This game: 31 actions by Muse
  directly, 7 by rules Muse set (defend, set at 0:12 with call 2), 0 by the body on its own (100% decided by Muse)".

## Before

1. On picasso, give staging a 2-hour lease for this run. Staging's lease is otherwise production's 30 minutes:
   ```
   cd ~/workspace/muse-staging/app/deploy
   grep -q '^MINEAI_CARE=' .env && echo "MINEAI_CARE is set: remove it (advise is the default)"
   printf 'STAGING_LEASE_MS=7200000\n' >> .env
   sh recreate.sh staging        # idle check first; recreates the agent (and the camera with it)
   ```
   On production instead (the owner's run on play.picasso-lab.com): the same line as `PROD_LEASE_MS`, while production
   is idle, and removed again afterwards (see "Afterwards"). Production's lease must never stay at 2 hours:
   ```
   cd ~/workspace/muse-minecraft/app/deploy && printf 'PROD_LEASE_MS=7200000\n' >> .env && sh recreate.sh production
   ```
2. Check that `https://play-staging.picasso-lab.com/` shows `Bots in use: 0 of 8` (production:
   `https://play.picasso-lab.com/`). Note the clock time.
3. A game ends after 5 minutes without a call. Answer any approval question from muse.ai within 5 minutes.

## The prompt: one line (paste into a new muse.ai chat)

```
Play Minecraft on https://play-staging.picasso-lab.com/mcp and get to the Nether and back.
```

On production the address is `https://play.picasso-lab.com/mcp`. If muse.ai has no integration for the address yet,
ask Muse first, in a chat, to build a custom integration (an MCP connector) for it: streamable HTTP, no
authentication. Once is enough.

The long prompt this line replaces (until 2026-10-12) is no longer needed: the server carries all of it.

- **The rules, in the MCP server's `instructions`** (sent with `initialize`; src/mcp.js `instructionsText`):
  - start_game with the goal, then live_view, its HTML shown as a web artifact (play is refused with NEED_LIVE_VIEW until
    then; start_game `live: false` only when the user does not want to watch);
  - play_sequence, and get_state while a skill runs;
  - a why and a plan on every play and play_sequence call (why: one sentence, what and why; plan: the next few steps
    and the fallbacks, up to about 400 characters, longer is cut at a word; both shown live, the call's arguments as
    sent in the stream's RAW console, both kept in the report);
  - the body acts only by rules Muse sets (none at the start), and the Body advice is Muse's to follow or not;
  - a call at least every 4 minutes;
  - after a death, pick_up within 5 minutes or start over;
  - a new plan after 3 failures of the same step;
  - end_game at the end, and its report shown to the user.
- **The plan, in start_game's reply.** start_game takes an optional `goal`: `free` (the default), `iron_pickaxe`,
  `diamonds`, `nether`, `nether_and_back`, or a short text (read for these words). The reply lists the milestones
  with how to do each:
  - diamonds: most lie near y -59;
  - obsidian: a water bucket and a still lava pool;
  - the frame: build nether_portal on open, dry ground;
  - flint: from gravel;
  - the way back: portal light, enter, then enter again.

  The server tracks each milestone as the bot reaches it (src/report.js).
- **The report, from the server.** end_game returns it (game_report gives it during the game):
  - the goal, and the milestones with their times;
  - deaths with their causes;
  - the attribution line;
  - a decision log built from Muse's own why and plan texts and the Body advice it followed or declined.
- **Ready prompts** for MCP clients that list them: `play_to_the_nether` and `free_play` (argument `goal`). Both still
  have Muse ask the user's age.
- **Other goals:** end the line with "get an iron pickaxe", "get diamonds" or "just play".

## After: what our logs measure

The game's rows are in staging's agent log (`~/workspace/muse-staging/logs/run-serve-*.jsonl`, the newest one).
Read them with:
```
cd ~/workspace/muse-staging
docker run --rm -v $PWD/logs:/l:ro muse-staging-agent node scripts/long-run-report.mjs /l/$(ls -t logs | grep run-serve | head -1) --game <id>
```

What the report measures:

- **How the game ended:** the lease, `end_game`, the idle rule, or a crash (`session_end`). The run succeeds when
  the bot reached the Nether. Short of that, it says the last milestone reached.
- **Deaths:** the time and cause of each (`death` rows, from the body's own status).
- **Time per milestone:** seconds from `start_game` to each of: wooden pickaxe, stone pickaxe, iron ingot, iron
  pickaxe, diamond, diamond pickaxe, obsidian, flint and steel, the Nether.
  - The items are read from each step's inventory change (`viewer_action` delta), counting what the bot carries at
    that moment. An ingot used up within the same step that made it (the shield skill, for example) is not counted.
  - The Nether is read from the `dimension` row.
- **Who acted:**
  - Muse's steps: every skill except get_state and policy (`viewer_action`, source `muse`). The shelter and shield
    skills count as Muse's, because Muse asked for them.
  - The body's reflexes (`care` rows, source `reflex`).
  - The body's own plans (source `care-full`). These appear only in full mode, so in advise mode they should be 0.
  - The Muse share is Muse's steps over all actions. The same numbers are in `session_end`'s attribution.
- **Steps that failed:** `viewer_action` rows with `ok: false`.

What the logs do not measure: whether Muse's decisions were good. The decision log in end_game's report is built by
the server from Muse's own why and plan texts (also in the `mcp_call` rows) and the advice each reply showed, so each decision
sits next to the step it came with.

## Afterwards

Put the lease back:
```
cd ~/workspace/muse-staging/app/deploy && sed -i '/^STAGING_LEASE_MS=/d' .env && sh recreate.sh staging
```
On production, as soon as the run's game has ended (`recreate.sh` waits until production is idle):
```
cd ~/workspace/muse-minecraft/app/deploy && sed -i '/^PROD_LEASE_MS=/d' .env && sh recreate.sh production
```
