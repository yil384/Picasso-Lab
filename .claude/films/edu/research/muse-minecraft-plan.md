# Muse plays Minecraft: build plan (2026-10-06)

## 1. Verdict: can viewers play from the Muse web app?

**muse.ai is the right product.** It is Meta's consumer agent "Muse", launched 2026-09-08 on Muse Spark ([Meta newsroom](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)). The old video host called muse.ai is now Skiv ([skiv.com](https://skiv.com/blog/muse-ai-is-now-skiv)). Muse Glimmer is not offered inside muse.ai ([dev.meta.ai](https://dev.meta.ai/models/muse-glimmer/)).

**Not possible: Muse playing a Minecraft game in its own browser.** That includes classic.minecraft.net.
- Muse's browser sub-agent sees only an accessibility-tree snapshot and cannot run JavaScript ([Meta research](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)).
- A `<canvas>` exposes nothing to that tree ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)).

**Possible on paper, untested: "your Muse plays Minecraft on our server".** Both routes use documented Muse features:
- **A. Control page.** A page we host shows the game state as plain text and has one HTML form button per skill. The viewer pastes one prompt and approves "Allow for this site" once ([Meta help: approvals](https://www.meta.com/help/artificial-intelligence/1385290430137537/)). The viewer watches through Muse's "Open browser" window ([Meta help](https://www.meta.com/help/artificial-intelligence/2124746764949121/)).
- **B. Custom connector.** The viewer asks Muse to build a connector from our `openapi.json`. Meta's help says Muse writes custom connectors for any API or CLI, and that Meta does not review them ([Meta help](https://www.meta.com/help/artificial-intelligence/1687253048996149/)). Sources disagree on whether consumer Muse accepts an MCP URL ([parallel.ai](https://parallel.ai/articles/meta-muse-custom-integrations) vs [aiagentslibrary](https://www.aiagentslibrary.com/blog/meta-muse-mcp/)). Build plain REST + OpenAPI first; MCP is a bonus.
- **Both routes need a public HTTPS endpoint.** Muse runs in a VM in Meta's cloud, so a server on localhost cannot be reached ([Meta research](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)).
- **Who can play:**
  - US adults only. Muse requires 18+ ([muse.ai/terms](https://muse.ai/terms)). Canada is conflicting ([zentor](https://zentor.ai/blog/meta-muse-for-mac)).
  - The free tier has a weekly limit ([Meta help](https://www.meta.com/help/subscriptions/1021145227643680/)), reported as 100M tokens per week ([The Batch](https://www.deeplearning.ai/the-batch/how-to-secure-agents-for-the-masses)).
  - Whether a card is needed even on the free tier is UNVERIFIED.
  - Douyin viewers cannot play.
- **Unknowns** that only a hands-on test settles:
  - Does Muse keep looping for 20 to 200 clicks?
  - Does Sentinel ask for approval on every step?
  - How long does one step take?
- **Official directory listing** at muse.ai/platform gives the best viewer experience. It needs business verification and reviews arrive "in waves" ([muse.ai/platform/docs](https://muse.ai/platform/docs), [stacktr.ee](https://stacktr.ee/blog/muse-connector-platform)). Submit it in parallel, but do not plan the launch around it.
- **Muse for Mac** sees pixels: Screen Recording plus Accessibility permissions ([TechCrunch](https://techcrunch.com/2026/09/18/metas-muse-hits-mac-letting-the-ai-take-actions-on-your-computer/)). Driving real Minecraft that way is untested, so it is a bonus shot at most. There is a report of it ignoring permissions ([AppleInsider](https://appleinsider.com/articles/26/09/28/metas-new-ai-agent-blatantly-ignores-users-permissions)).

**Fallback for everyone else** (non-US X viewers):
- An "Ask our Muse" box on our page. The viewer types an instruction, it goes into a queue, and our server-side Muse Spark brain (lab key) drives the bot. Viewers watch live through prismarine-viewer.
- Meta's API terms require end users to be 18+ and bar products aimed at under-18s, so the page needs an 18+ gate ([ToS 10.1](https://dev.meta.ai/legal/terms-of-service)).
- It cannot be offered in the PRC, Hong Kong or Macau ([Geographic Use Policy](https://dev.meta.ai/legal/geographic-use-policy)). The Douyin cut is watch-only.
- **X-reply loop:** during a "stream hour", an operator pastes the top replies into the same queue. Automated reply reading through the X API: access and cost UNVERIFIED.

| Path | Who can play | Our cost | Viewer setup | Status |
|---|---|---|---|---|
| A. muse.ai + control page | US, 18+ | $0 model cost (viewer's Muse quota) | 1 prompt + 1 approval | documented, untested |
| B. muse.ai + custom connector | US, 18+ | $0 | 1 prompt + connector warning | documented, untested |
| C. Our "Ask Muse" page | 18+, not PRC/HK/Macau | our key, capped | none | under our control |
| D. Join our server (Hao's model) | Java owners | server only | buy and install Java | rejected as primary: Hao's 112K views led to 54 players ([fxtwitter](https://api.fxtwitter.com/haoailab/status/2104302648786919643), [blog](https://haoailab.com/blogs/mcjev/)) |

**Correction for the lab notes:** Hao's "Jev" is DJev on DiffusionGemma-26B-A4B, at about 24 ms per decision on B200s ([MCJev](https://github.com/hao-ai-lab/MCJev)). It is not TypeSafe's Jev.

## 2. Model path

- **This Mac cannot run Glimmer.**
  - It is an M2 with 16 GB RAM and 4.2 GB free disk (local check).
  - The smallest official Glimmer file is 16.8 GB at Q4_K_M ([HF](https://huggingface.co/meta-models/Muse-Glimmer-30B-GGUF)), and LM Studio says at least 26 GB RAM ([LM Studio](https://lmstudio.ai/models/muse-glimmer)).
  - Even 2-bit builds of 8.7 GB or more exceed the free disk, and they degrade "precise multi-step tool schemas" first ([Ollama](https://ollama.com/venkataparswanadh/muse-glimmer:iq2_m)).
- **Spark API:**
  - Endpoint `https://api.meta.ai/v1`, OpenAI-compatible, model `muse-spark-1.3` ([docs](https://dev.meta.ai/docs/models)). 1.1 is the default, so pass 1.3 explicitly ([promptfoo](https://www.promptfoo.dev/docs/providers/meta/)).
  - Prices and limits ([pricing](https://dev.meta.ai/docs/pricing-rate-limits)):
    - Standard: $1.25 in / $0.15 cached / $4.25 out per million tokens, 3,000 RPM.
    - Contributor: $0.10 / $0.002 / $0.20, 100 RPM, and Meta may train on your prompts and outputs.
  - Reasoning cannot be turned off; `minimal` is the lowest setting ([reasoning](https://dev.meta.ai/docs/reasoning)).
  - Time to first token is about 34 s at xhigh ([Artificial Analysis](https://artificialanalysis.ai/models/muse-spark-1-3-xhigh)). Latency at minimal is unpublished and has to be measured.
- **Glimmer, hosted:** OpenRouter `meta/muse-glimmer-30b`, $0.30 / $1.20 per million tokens, with tools ([OpenRouter](https://openrouter.ai/api/v1/models/meta/muse-glimmer-30b/endpoints)).
- **Glimmer on a lab 24 GB GPU:** about 75 tok/s out and 3,100 tok/s prefill on a 4090 ([report](https://x.com/analogalok/status/2086834522461806748)). Which GPU box the lab has is unknown.

**Estimated cost** (my estimate, not measured). Assumptions: a text-state loop with about 4k input tokens per call (3k of them a cacheable prefix), about 300 output tokens including reasoning, and one decision every 5 s (0.2/s, 720 calls/h). The Jev Ender Dragon run averaged 0.32 calls/s ([rmalde](https://github.com/rmalde/minecraft-agent)).

| Brain | $/hour, no cache | $/hour, cached | Iron-pickaxe run (~180 calls) |
|---|---|---|---|
| Spark 1.3 Standard | ~$4.5 | ~$2.1 | ~$0.40–0.80 |
| Spark 1.3 Contributor | ~$0.33 | ~$0.12 | <$0.10 |
| Glimmer, OpenRouter | ~$1.1 | — | ~$0.30 |
| Glimmer, own 4090 | $0 API cost, ~5 s/call | — | — |

At 1 call/s with 1.5k in / 150 out, the research estimate is about $9/h on Standard and about $0.65/h on Contributor. Hidden reasoning is billed as output and raises every figure.

**Decisions per second:**
- Spark: unknown. Plan for 0.1–0.3 per second and measure on day 1.
- Rate limits: Contributor's 100 RPM fits about 8 bots at one call every 5 s; Standard has room to spare.
- Do not compete with Jev's 24 ms reflexes.

**Recommendation:**
- **Primary: Spark 1.3.** It is the model a viewer's own Muse runs on, so the video can say "the same model your Muse uses".
- **Contributor tier** for development and long evolution runs (disclosed).
- **Standard tier** for the filmed run and the public "Ask Muse" page, so viewer text is not used for training.
- **Stretch race:** "open vs closed Muse to an iron pickaxe" with Glimmer via OpenRouter. The same code only changes `base_url` and `model`. A race between two Meta models is not "promoting a competing product" under [ToS 10.1(xi)](https://dev.meta.ai/legal/terms-of-service); legal reading UNVERIFIED.

## 3. Architecture

```
viewer's Muse (muse.ai) --HTTPS--> play.<domain>: control page (zero-JS forms) + /api + openapi.json
viewer (our page / X replies via operator) --> /ask queue --> muse-brain (our key)
                                  | per-session token, quotas, $ cap, kill switch, public log
                    mc-body (Node 20, mineflayer 4.39.0): 10 bounded skills + text state
                                  |
                    Paper 1.21.4, online-mode=false, bound to localhost/LAN only
                    prismarine-viewer watch page | JSONL decision log | user's client in /spectate
```

**Minecraft server: Paper 1.21.4 with ViaVersion 5.12.0**
- ViaVersion 5.12.0 lets the current 26.3 client join an older server ([ViaVersion](https://github.com/ViaVersion/ViaVersion/releases)).
- Why 1.21.4: prismarine-viewer lists support up to 1.21.4 ([repo](https://github.com/PrismarineJS/prismarine-viewer)), and Mindcraft supports up to 1.21.11 ([Mindcraft](https://github.com/mindcraft-bots/mindcraft)).
- Whether a Paper 1.21.4 build is still downloadable is UNVERIFIED (current stable is 26.2, [Paper](https://papermc.io/downloads/paper)).
- `online-mode=false` is acceptable only if the server is never reachable from the internet ([wiki](https://minecraft.wiki/w/Server.properties)). Our design meets that: only the HTTP API is exposed, so the bots need no Microsoft accounts.
- The required JDK version is UNVERIFIED (21 expected). The /usr/bin/java on this Mac is the macOS stub.

**Body (mc-body)**
- Node 20 LTS via nvm. Mindcraft warns about Node 24+, and this Mac has v25.2.1 ([Mindcraft](https://github.com/mindcraft-bots/mindcraft)).
- mineflayer 4.39.0 ([mineflayer](https://github.com/PrismarineJS/mineflayer)) with mineflayer-pathfinder, mineflayer-collectblock, mineflayer-pvp and prismarine-viewer.
- Skill code reused from Mindcraft (MIT) with attribution. Do NOT reuse rmalde/minecraft-agent, which has no license ([gh](https://github.com/rmalde/minecraft-agent)).
- 10 tools: `get_state, go_to, collect(block,n), craft(item,n), smelt(item,n), place(block,pos), build(blueprint), attack(target), eat, say`. Each one runs seconds to minutes of game work.
- The state is plain text: health, food, inventory, nearby blocks and mobs, position, current goal.

**Day-1 baseline: stock Mindcraft**
- Mindcraft at the main branch (last commit 2026-10-03) runs a profile `{api:'openai', model:'muse-spark-1.3', url:'https://api.meta.ai/v1', params:{reasoning_effort:'low'}}` with the key in `OPENAI_API_KEY`.
- Required one-line patch: Mindcraft's `gpt.js` sends `stop` unless the model name contains o1, o3 or 5 ([gpt.js](https://github.com/mindcraft-bots/mindcraft/blob/main/src/models/gpt.js)), and Meta returns HTTP 400 on `stop` ([chat-completions](https://dev.meta.ai/docs/protocols/chat-completions)).

**Brain (muse-brain)**
- The openai SDK on Chat Completions: the same code then works against OpenRouter and llama.cpp Glimmer, and `prompt_cache_key` is supported.
- Settings: `parallel_tool_calls:false`, `tool_choice` auto (the only value accepted), strict schemas, `reasoning_effort` minimal or low ([tool-calling](https://dev.meta.ai/docs/tool-calling)).
- Run one A/B against the Responses API with `previous_response_id`, which keeps reasoning across tool turns ([protocols](https://dev.meta.ai/docs/protocols/)).
- Guards: a loop guard (Glimmer tool-looping is documented in [rickyzzzzz](https://github.com/rickyzzzzz/muse-glimmer-benchmark)), a step cap and a $ cap.

**Memory**
- Short-term: the last N steps.
- Long-term: a `notes.json` the bot reads and writes, holding known chests, furnaces and lessons.
- A served `/playbook` page.

**Viewer channel**
- `/play/<token>`: server-rendered HTML, no JS required, state in a live text block, one `<form method=post>` per skill, meta-refresh.
- `/api` plus `openapi.json`.
- `/ask`: queue and 18+ gate.
- Each guest session gets its own bot for a 10-minute lease. There is no login and no personal data, which keeps Sentinel's personal-data classifier quiet ([Meta research](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)).
- No code execution: Mindcraft's `allow_insecure_coding` stays false.
- A visible log and a stop button cover the AUP's human-oversight rule ([AUP](https://dev.meta.ai/legal/acceptable-use-policy)).

**Logging**
- One JSONL row per decision: time, model, effort, prompt/cached/completion tokens, TTFT and total latency, tool and arguments, result, inventory change, $ cost.
- Plus milestone timestamps for the HUD.

**Lab tie-in**
- **Real this week: a prompt-caching measurement.** On Spark, compare latency and $ per decision with `prompt_cache_key` on vs off. This is Meta's cache, not ours. It sets up the KVFlow story honestly ([KVFlow](https://arxiv.org/abs/2507.07400)).
- **Real in week 2, the best tie-in: FlashEvolve** ([site](https://flashevolve.picasso-lab.com/), [code](https://github.com/Leo9660/FlashEvolve)).
  - Its client is OpenAI-compatible, so it runs from this Mac against the Spark API.
  - Each rollout is one timed episode. The evolved system prompt v1 to vN goes into `/playbook`, and a viewer's Muse reads it, so our project reaches muse.ai viewers.
  - Wiring takes about 2–4 days. The repo has no license file; it is the lab's own code, but add a license before publishing.
- **Aspirational:** KVFlow/ScaleSim serving a Glimmer "village" on our own GPU. It is a CUDA SGLang 0.5.2rc1 fork ([repo](https://github.com/PanZaifeng/KVFlow)), needs a rebase for Glimmer (inferred) and a 24–48 GB GPU. That is a later episode. Never say KVFlow speeds up Muse Spark: Meta's servers are not ours.

## 4. Scope

**MVP (this week)**
1. **Fresh world (fixed seed) to an iron pickaxe**, driven by Muse Spark 1.3. Three runs, report the median time, number of decisions and $.
2. **The muse.ai test:** one US account's Muse drives a bot through `/play` to "collect 10 logs and build a 3x3 hut".
3. **"Ask Muse" page** working locally.

**Stretch**
- The FlashEvolve "it teaches itself a faster route" beat.
- The Glimmer race.
- Viewers ordering builds ("build what you ask").
- A 24/7 stream.
- A pixel peek: Spark takes about 1.4k tokens per 1280px frame ([image docs](https://dev.meta.ai/docs/image-understanding)).
- Submitting the official connector.
- A Muse for Mac shot driving the real client.

## 5. Demo video (vertical 9:16, about 75 s)

| Time | On screen | Caption (EN; ZH for Douyin) |
|---|---|---|
| 0:00–0:02 | Hook. Top: a phone in muse.ai, "Get me an iron pickaxe in Minecraft." Bottom: the bot already punching a tree (real client in /spectate) | "I told my Muse to play Minecraft." |
| | Fallback hook if path A or B fails: the finished HUD "Iron pickaxe 14:02 · $0.41", then rewind | |
| 0:02–0:10 | Bot view plus a scrolling state-text panel and tool-call chips (`collect oak_log 4`) | "Meta's Muse Spark decides. A Mineflayer bot does the walking." |
| 0:10–0:32 | Timelapse wood → stone → furnace → iron. Corner HUD: real clock, decisions, $, `muse-spark-1.3 · low` | milestone captions |
| 0:32–0:40 | One real failure from the log (only if it happened) | e.g. "It dug straight down. Twice." |
| 0:40–0:44 | Pickaxe crafted, freeze frame, measured numbers | "N decisions. M minutes. $C." |
| 0:44–0:58 | muse.ai screen recording: paste the prompt, "Allow for this site", Muse clicks, the bot builds | "Your Muse. Our Minecraft body. No game install." |
| 0:58–1:10 | Cache on/off numbers; FlashEvolve v1→vN if done | "Every move re-sends the same 3k-token brief. Caching it: X s → Y s per move." KVFlow (NeurIPS'25) credit |
| 1:10–1:15 | Lab logo end card | "Try it: play.… (US, 18+) · code: github…" / Douyin: watch-only, no link |

Craft rules from the earlier feedback still apply: fill the frame, no jitter, no corner mascot, no synth sound effects, logo end card.

**The user records:**
1. **muse.ai takes**, 2–3, vertical phone screen recording.
2. **Minecraft Java client footage:** `/gamemode spectator`, then `/spectate <bot>`, recorded in OBS for 1–2 full runs.
3. **Optional:** an iPhone reaction for the side line.

Claude renders the HUD, the state panel, the tool chips and the end card from the JSONL log.

**Honest claims**
- **OK:** the measured time, $ and decision count, with model id, effort and seed shown.
- **OK:** "plays from text state through 10 scripted skills, not pixels". This heads off the standard Jev criticism ([HN](https://news.ycombinator.com/item?id=49845172)).
- **OK, only if test A or B passes:** "your Muse can drive it (US, 18+)".
- **NOT "first".** The search found nothing on GitHub, HN or the web, but X, Reddit and YouTube were not searched (UNVERIFIED). At most say "we couldn't find an earlier one".
- **NOT** "faster than Jev".
- **NOT** "runs locally on a Mac".
- **NOT** any Meta or Mojang endorsement. No Meta or Muse logos ([ToS §7](https://dev.meta.ai/legal/terms-of-service)), and add a "not affiliated" line.

## 6. Steps and time

**Claude, now (no Minecraft account; a mock LLM until the key exists):**

| # | Work | Time |
|---|---|---|
| C1 | nvm Node 20 and a JDK (needs the user's OK; fits in 4.2 GB for a headless server) | 0.5 h |
| C2 | Paper 1.21.4 + ViaVersion scripts: start, stop, reset with a fixed seed, offline, localhost | 1 h |
| C3 | Mindcraft baseline, Muse profile, `stop` patch, mock-OpenAI test proving `stop` is never sent | 2 h |
| C4 | `probe` script: 20 calls each at minimal/low/medium × cache on/off × Chat/Responses, output CSV of TTFT, total, tokens, $ | 1 h |
| C5 | mc-body: 10 skills, state serializer, per-session bots, JSONL log, kill switch | 1.5 d |
| C6 | muse-brain: tool loop, guards, notes memory, $ cap | 0.5–1 d |
| C7 | `/play` (zero-JS), `openapi.json`, `/ask` with queue, 18+ gate, quotas, public log, stop | 1 d |
| C8 | Tests (below) | 0.5 d |
| C9 | HUD and overlay renderer from JSONL, animatic, edit | 1 d after footage |
| C10 | Stretch: FlashEvolve 2–4 d; Glimmer race 0.5 d; connector submission pack 0.5 d; re-check "first" when search is back | — |

C8 tests:
- Unit: state serializer and tool schemas.
- Integration: local Paper plus a scripted fake LLM that reaches a wooden pickaxe.
- A Playwright accessibility snapshot of `/play` asserting every state field and button is exposed. This is the proxy for Muse's browser.

**User:**

| # | Task | Time |
|---|---|---|
| U1 | Free at least 15–20 GB of disk (4.2 GB now). This blocks the client and capture | 30 min |
| U2 | dev.meta.ai: sign up (18+, payment method), create a key, set `MODEL_API_KEY` in the shell profile. Do not paste the key into chat. Report whether $20 of credit shows (UNVERIFIED). Optional: an OpenRouter key | 15 min |
| U3 | Approve the installs | 2 min |
| U4 | Hosting: a tunnel from the Mac during test and filming windows only, or a small cloud VM for launch (cost UNVERIFIED), plus a subdomain such as play.picasso-lab.com | 15 min |
| U5 | muse.ai test with Claude's prompt. Report the step count, approval prompts, and whether REST or MCP worked | 30 min |
| U6 | Confirm Minecraft Java ownership; record the spectator runs | 1–2 h |
| U7 | Record the muse.ai takes | 30 min |
| U8 | Naming and legal OK from Prof. Ding / UCSD. "Muse plays Minecraft" under ToS §7 and the Mojang guidelines are UNVERIFIED (minecraft.net timed out) | — |
| U9 | Optional: say which GPU box (`picasso` / `ssi-gpubnode01`) can serve Glimmer | — |

**Timeline**

| When | Work | Result |
|---|---|---|
| Day 1 | C1–C4, U1–U3 | first Muse-driven bot and real latency/$ numbers |
| Days 2–4 | C5–C8, U4–U5 | — |
| Day 5 | U6–U7 film runs | — |
| Days 6–7 | edit and post | public page live if U4 is done |
| Week 2 | FlashEvolve beat | — |

## 7. Risks and how to cut scope

| Risk | Cut |
|---|---|
| Spark at minimal takes more than 10 s per step | Longer skills, timelapse with a real clock, switch the goal to "build what you ask" |
| No free credits or cost runs high | Contributor tier for development, hard $ cap, cached prefix |
| Muse cannot loop on `/play`, or asks approval every step | Switch to the connector (B); if both fail, ship C and cut the muse.ai beat from the video |
| Sentinel or site blocks our domain (Amazon blocked Muse, [wiki](https://en.wikipedia.org/wiki/Muse_(AI_agent))) | Stable lab subdomain, not a random tunnel URL |
| Disk stays full | Headless server plus prismarine-viewer footage only (weaker look) |
| Mindcraft native deps on Node 25 | nvm Node 20 |
| prismarine-viewer breaks on the chosen version | Pin 1.21.4 |
| Viewer abuse or prompt injection | Whitelisted skills, no code execution, per-session bots, world reset, stop button |
| Legal or brand problem | Descriptive title, disclaimers, 18+ gate, no China link |
| "First" is false | Never claim it |
| The video gets read as a Jev comparison | No PvP; position Muse as the slow planner (System 2) |
| Glimmer flakes in the race | Drop the race |
| FlashEvolve slips | Ship with the caching beat only |