<!-- docs/MUSE-LONG-RUN.md - a long autonomous Muse run on staging in advise mode (iron, then diamonds, then the Nether): the prompt to paste into muse.ai, how staging is set for it, and what our logs measure afterwards. -->
# A long Muse run (advise mode)

The claim on X is "Muse plays Minecraft". This run backs it up: Muse, in muse.ai, plays one staging bot through our
public `/mcp` for up to two hours. It goes for iron, then diamonds, then the Nether, and it makes every plan itself.

The body runs in advise mode (`MINEAI_CARE=advise`, the default since the advise-mode change). In this mode:

- **The body plans nothing.** It does not shelter at night, make a shield, hunt, craft armor or spare tools, or go back
  for its items after a death.
- **Every reply says what needs doing, under "Body advice".** Each item gives the facts (time to nightfall, food, tool
  durability, where the bot died) and the skill that would do it. Following the advice or not is Muse's choice.
- **The body acts by itself only through its reflexes:**
  - it fights back or flees when a hostile mob comes for it;
  - it eats only when starving (food 4 or less);
  - it surfaces for air, leaves fire and lava, and gets its footing back.

  Muse can switch each reflex off with the `policy` skill (`defend`, `eat`, `escape`). Each reflex that acts shows up
  in the next reply under "On its own".
- **The game counts who acted.** get_state and end_game report it, for example "This game: 47 actions by Muse,
  4 reflexes (92% Muse)".

## Before

1. On picasso, give staging a 2-hour lease for this run. Staging's lease is otherwise production's 30 minutes:
   ```
   cd ~/workspace/muse-staging/app/deploy
   grep -q '^MINEAI_CARE=' .env && echo "MINEAI_CARE is set: remove it (advise is the default)"
   printf 'STAGING_LEASE_MS=7200000\n' >> .env
   sh recreate.sh staging        # idle check first; recreates the agent (and the camera with it)
   ```
2. Check that `https://play-staging.picasso-lab.com/` shows `Bots in use: 0 of 8`. Note the clock time.
3. A game ends after 5 minutes without a call. Answer any approval question from muse.ai within 5 minutes.

## The prompt (paste into a new muse.ai chat)

```
I am 18 or older, and I confirm it for this game.

You are going to play Minecraft yourself, for a long time, through my MCP server at
https://play-staging.picasso-lab.com/mcp (streamable HTTP, no authentication; update an existing custom integration
for a Minecraft server to this URL, or build a new one). Use only this MCP server, not its web pages.

Call start_game with adult: true. The game lasts up to 2 hours. Then, without asking me anything, play toward these
goals in order:
  1. an iron pickaxe;
  2. diamonds, then a diamond pickaxe;
  3. the Nether: obsidian (pour water from a bucket onto lava, then mine the obsidian with the diamond pickaxe),
     flint and steel, a portal frame (place obsidian, 4 wide and 5 tall, corners optional), then the portal skill to
     light it and enter.

You make every plan. The body does not look after itself: it only fights back or flees when attacked, eats when
starving, and gets itself out of water, fire, lava or a fall. Every reply has a "Body advice" block, for example
night coming with no shelter or shield, low food, a tool about to break, or items to recover after a death. Each item
has the facts and the skill that would do it (shelter, shield, eat, hunt, collect, craft, armor, pick_up, sleep).
Decide each time whether to follow it, and say why. You may switch a reflex off with the policy skill if you want
full control.

Rules:
- Use play_sequence for several steps in a row, and get_state when a reply says a skill is still running.
- Keep calling at least every 4 minutes: a game with no calls for 5 minutes ends.
- If you die, decide whether to go back for your items (pick_up with death_items: true within 5 minutes) or to start
  over where you respawned.
- If the same step fails 3 times, change your plan instead of sending it again.
- Stop when you reach the Nether, when the game ends, or after 2 hours. Then call get_state once more (it counts who
  acted) and end_game.

Then report:
1. A decision log: every survival decision you made. For each one: the time in the game, what you saw (the advice
   or the state), what you decided, and why. Include the advice you chose not to follow.
2. Each goal: reached or not, and the time from start_game.
3. Deaths: when, what killed you, what you did next.
4. The attribution line from your last get_state or end_game ("This game: ... by Muse, ... reflexes").
5. The game id.
```

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

What the logs do not measure: whether Muse's decisions were good, or what it says it decided. Its decision log is
its own account. To set each decision against what happened, match it to the step rows by time.

## Afterwards

Put the lease back:
```
cd ~/workspace/muse-staging/app/deploy && sed -i '/^STAGING_LEASE_MS=/d' .env && sh recreate.sh staging
```
