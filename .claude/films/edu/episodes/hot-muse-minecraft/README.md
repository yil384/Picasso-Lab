# Muse plays Minecraft (hot-topic episode, in progress)
Plan and sourced findings: `../../research/muse-minecraft-plan.md`, `../../research/muse-minecraft-findings.json`.

`build-workflow.js` is the multi-agent build (skeleton -> body / brain / web / probe in parallel -> integrate ->
three reviewers -> fix) that writes the agent into `agent/`. It was stopped on the old Mac before the skeleton finished
(the old Mac could not run Java or Minecraft anyway). On the new Mac, ask Claude Code to run it with the Workflow tool
(scriptPath = this file). Before running, edit its RULES if the new Mac CAN run things the old one could not:
- its DIR / PLAN / FIND paths are absolute (`/Users/yil384/UCSD/Picasso-Lab/...`): change them if the repo lives
  elsewhere;
- "Do not install Java, a Minecraft server..." can become "a JDK 21 + Paper 1.21.4 + ViaVersion in agent/server/ are
  allowed once the user has accepted the Minecraft EULA", so the integrator can run a real headless server test;
- the API key stays out of chat: the user sets MODEL_API_KEY in their shell.
