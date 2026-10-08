<!-- docs/MUSE-TEST.md - the owner's Muse run on staging (gate 2 of the switch, docs/SWITCH.md): the prompt to paste into muse.ai, what to note while it runs, and how its numbers are read from staging's log afterwards. -->
# The Muse run on staging (gate 2)

The last open condition before production switches to the Mine AI MCP body (`docs/SWITCH.md`, section 1): Muse itself,
in muse.ai, drives a staging bot through our public `/mcp` and finishes the iron route. The scripted soak passed on
2026-10-08 (10 of 10 one at a time, median 168 s to the iron pickaxe; a script playing Muse's part 13 of 13), but no
model has driven this body yet. Staging (`https://play-staging.picasso-lab.com`) plays with `BODY=mineai`; its bots are
test bots (`Tst_rv_` and random letters) in staging's own world, so nothing here touches production.

For comparison, Muse on our old body through production's `/mcp` (2026-10-07): an iron pickaxe 4:40 after
`start_game`, 13 actions, 0 failures. This body takes about 20-30 s longer per iron route in the scripts (it puts a
table and a furnace down and picks them up again for every craft and smelt).

## Before

1. `https://play-staging.picasso-lab.com/` in a browser shows `Bots in use: 0 of 8` (or 1-2: someone else's test).
2. Note the clock time. The game lasts 30 minutes and ends after 5 minutes without a call: answer any approval
   question from muse.ai within 5 minutes.

## The prompt (paste into a new muse.ai chat)

```
I am 18 or older, and I confirm it for this game.

1. Connect to my Minecraft MCP server at https://play-staging.picasso-lab.com/mcp (streamable HTTP, no
   authentication). If you already have a custom integration or a client for a Minecraft server (an earlier one used
   https://play.picasso-lab.com/mcp), update it to this URL or build a new custom integration for it; either is fine.
   Use only this MCP server, not its web pages.

2. Call start_game with adult: true. Then, without asking me anything:
   a. get an iron pickaxe into your inventory;
   b. build a small shelter around or next to you (the build skill, blueprint shelter or hut_3x3, with planks or
      cobblestone you carry; gather more first if you need it);
   c. eat something. If eat says you are not hungry, that is fine: get food anyway (attack a pig, cow, chicken or sheep
      and cook what it drops with smelt) and try eat once more later; report what happened.
   Use play_sequence for several steps in a row, and get_state when a reply says a skill is still running.
   When you are done, or if you are stuck for more than 3 tries on the same step, call end_game.

3. Then report, as a table:
   - every MCP tool call in order: the tool, the steps in it, how long the call took, ok or failed (with the
     failure text exactly as the server sent it);
   - the total number of tool calls, and how many failed;
   - the clock time of start_game, of the iron pickaxe in your inventory, of the finished shelter, of eating,
     and of end_game;
   - anything in the tool descriptions or replies that was unclear, wrong, or made you guess.
```

## What to note while it runs

| What | Why |
| --- | --- |
| Approval prompts: did muse.ai ask you to approve the integration, each tool call, code it runs, or "continue"? How many times, and did any wait hold the game for minutes? | The idle rule ends a game after 5 minutes without a call; many approvals would make the demo slow |
| The clock: your prompt, the first tool call, the iron pickaxe, the shelter, eating, `end_game` | Gate 2 needs the iron route finished through the gateway; the time is compared with 4:40 (old body) and 168 s (scripts) |
| Step time: long pauses between calls (Muse thinking or writing code) versus long calls (our server working) | Tells which side the time goes to |
| Anything odd: a queue message, the bot dying, "your game ended", a failed step Muse could not get past, Muse rebuilding its client, calling a tool that does not exist, or asking you something although told not to | Each is a finding; the bot dying or a step that cannot be passed is a no-go condition |
| A screenshot of Muse's final report and of any error | The report is read against staging's own log |

## After

Send the report, the screenshots and the clock times of your prompt and of Muse's last message. Staging's log
covers the same game from our side (on picasso, `~/workspace/muse-staging/logs`):

```sh
cd ~/workspace/muse-staging/logs && L=$(ls -t run-serve-*.jsonl | head -1)   # the run file that covers the game
grep -h '"kind":"\(mcp_client\|mcp_game\|session_start\|session_end\|mcp_idle_end\)"' $L | tail -8
grep -hc '"kind":"viewer_action"' $L
grep -hc '"kind":"mineai_\(heartbeat_miss\|host_restart\|host_down\)"' $L
grep -h '"kind":"mineai_host_\(ready\|close\)"' $L | tail -2
```

Gate 2 passes when Muse finished the iron route (the pickaxe in its inventory) through `/mcp`, with 0 heartbeat
misses, host restarts and downs, and no death. The shelter and eating are not part of the gate: they show the next
skills Muse will be asked for, and their failures go to the ROADMAP rather than stop the switch. If the route does
not finish, the report and the log say whether the body, our gateway or Muse's client was at fault; the body or the
gateway means no switch yet.
