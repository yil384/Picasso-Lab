export const meta = {
  name: 'muse-minecraft-build',
  description: 'Build the Muse-plays-Minecraft agent (body, brain, viewer page, probe, tests) against a mock LLM, then adversarially review and fix',
  phases: [
    { title: 'Skeleton', detail: 'contracts, package.json, config, mock LLM server' },
    { title: 'Modules', detail: 'body, brain, web, probe in parallel (separate files)' },
    { title: 'Integrate', detail: 'wire, run tests, fix' },
    { title: 'Review', detail: 'adversarial review: correctness, safety, API contract' },
    { title: 'Fix', detail: 'apply confirmed findings, rerun tests' },
  ],
}

const DIR = '/Users/yil384/UCSD/Picasso-Lab/.claude/films/edu/episodes/hot-muse-minecraft/agent'
const PLAN = '/Users/yil384/UCSD/Picasso-Lab/.claude/films/edu/research/muse-minecraft-plan.md'
const FIND = '/Users/yil384/UCSD/Picasso-Lab/.claude/films/edu/research/muse-minecraft-findings.json'
const RULES = `Project: "Muse plays Minecraft" for Picasso Lab (UC San Diego). Read the plan at ${PLAN} (sections 1-4 and 6) and, when you need an API detail, the findings at ${FIND}. Build in ${DIR} (Node.js ESM, plain JavaScript, Node >= 20; this Mac has Node 25). Hard constraints:
- No real API key exists. NEVER call api.meta.ai or any paid API. All tests use a local mock OpenAI-compatible server (the skeleton provides it). The real key will come from the env var MODEL_API_KEY, base URL from MODEL_BASE_URL (default https://api.meta.ai/v1), model from MODEL_ID (default muse-spark-1.3). Never send the "stop" parameter (Meta returns 400). parallel_tool_calls false, tool_choice "auto", reasoning_effort from env (default "low").
- Do not install Java, a Minecraft server, Minecraft, nvm or anything global. npm install only inside ${DIR}, lean deps (mineflayer, mineflayer-pathfinder, mineflayer-collectblock, minecraft-data, openai; prismarine-viewer optional and lazy-loaded). Disk is tight (~4 GB free): no large downloads.
- No code execution from model or viewer input, ever. Skills are a fixed whitelist with validated arguments.
- Every file starts with a short comment saying what it is. Match a clean, small-module style. Use node:test for tests (npm test).
- Do not touch anything outside ${DIR}. Do not commit (the lead commits).`

phase('Skeleton')
const skel = await agent(`${RULES}

You write the SKELETON so four people can then build modules in parallel without conflicts:
1. package.json (type: module, scripts: test, start, probe, mock), .gitignore (node_modules, logs, .env), README.md (what it is, the architecture diagram from the plan, how to run with a real key on a machine with Paper 1.21.4, what is mocked).
2. src/config.js: all env vars with defaults (MODEL_*, MC_HOST/PORT/VERSION=1.21.4, WEB_PORT, COST caps per run and per hour, STEP_CAP, LOG_DIR), one exported frozen object.
3. src/contracts.js: JSDoc typedefs and the exact interfaces between modules: the 10 tools (get_state, go_to, collect(block,n), craft(item,n), smelt(item,n), place(block,pos), build(blueprint), attack(target), eat, say) with JSON Schemas (strict, additionalProperties false, bounded numbers, enum where possible) exported as TOOLS for the brain; the Body interface (createBody(opts) -> { state(): string, run(tool, args): Promise<{ok, result, delta}>, stop(), on(event) }); the Brain interface (createBrain({body, llm, log, caps}) -> { step(goal): Promise<StepResult>, runUntil(goal, cond) }); the Logger (JSONL row fields from the plan: time, model, effort, prompt/cached/completion tokens, ttft, latency, tool, args, result, inventory delta, cost); the pricing table for cost estimates (Standard and Contributor tiers from the plan) with a function cost(usage, tier).
4. src/llm.js: a thin wrapper over the openai SDK (chat.completions with tools), measuring TTFT via streaming, returning {message, toolCalls, usage, ttftMs, latencyMs}; strips "stop"; supports prompt_cache_key. 
5. test/mock-llm.js: a local mock OpenAI-compatible HTTP server (node:http) with a scripted queue of responses (tool calls), that records every request body so tests can assert no "stop" field, correct tools, etc. Export start(script) -> {url, requests, close}. Also a CLI (npm run mock).
6. test/fake-bot.js: an in-memory fake of the parts of a mineflayer bot the body uses (inventory, position, health, food, findBlocks, dig, craft stubs, chat), so body logic is testable without a server.
7. Minimal smoke test that imports config/contracts/llm and talks to the mock.
Run npm install and npm test; make them pass. Return a short summary of the files and the exact interfaces others must implement.`, { label: 'skeleton', phase: 'Skeleton' })
if (!skel) return { error: 'skeleton failed' }

phase('Modules')
const MODS = [
  ['body', `Implement src/body.js (createBody) and src/skills/*.js: a mineflayer bot body with the 10 whitelisted skills (use mineflayer-pathfinder and mineflayer-collectblock; recipes via minecraft-data; craft needs a crafting table nearby or placed; smelt uses a furnace and fuel), argument validation against the TOOLS schemas, per-skill timeouts, a stop() kill switch, and src/state.js: the plain-text state serializer (health, food, position, time of day, inventory, nearby notable blocks within 32 blocks with counts and nearest distance, nearby mobs, current goal, last result). Body supports an injected bot (for tests with test/fake-bot.js) or creates one from config. Write test/body.test.js using the fake bot.`],
  ['brain', `Implement src/brain.js (createBrain) and src/memory.js: the tool loop (system prompt with the goal, rules and the state; the model calls exactly one tool per turn; the result goes back as a tool message), guards (step cap, $ cap per run, a loop guard that detects the same failing call 3 times and injects a hint, max consecutive errors), short-term memory (last N steps summarized), long-term notes.json (known chest/furnace/table positions, lessons) read and written through a memory tool-free API, and logging every step through the Logger. Keep the system prompt prefix stable so prompt caching can work (put the dynamic state last). Write test/brain.test.js using the mock LLM and a stub body, including: no "stop" ever sent, a scripted 5-step run to a goal, the loop guard firing, the $ cap stopping the run.`],
  ['web', `Implement src/web.js: the viewer channel with node:http only (no framework): GET / landing (what this is, not affiliated with Meta or Mojang, 18+), GET /play/:token zero-JS control page (the state as a <pre> text block with meta refresh, one <form method=post> per skill with labelled inputs, a stop button, the last 20 log lines), POST /play/:token/:tool, GET /openapi.json describing the same actions (OpenAPI 3.1, operationIds = tool names), JSON /api/:token/state and /api/:token/:tool, POST /ask (queue a natural-language instruction for our own brain; 18+ checkbox required; per-IP rate limit; length cap), GET /log (public JSONL tail). Sessions: a token per guest, each with its own bot slot and a 10-minute lease (inject a body factory so tests use a stub). Escape all output (no XSS), validate all args against TOOLS, cap request size. Write test/web.test.js (starts the server on a random port with stub bodies; checks forms, openapi validity basics, escaping, rate limits, lease expiry). Also scripts/a11y-snapshot.mjs that uses Playwright if installed (skip gracefully otherwise) to print the accessibility tree of /play, as a proxy for what Muse's browser sees.`],
  ['probe', `Implement scripts/probe.mjs: the latency/cost probe from the plan (C4): N calls at reasoning_effort in [minimal, low, medium] x prompt cache on/off x API style [chat] (responses optional behind a flag), with a realistic 3k-token stable prefix + a changing state suffix, measuring TTFT, total latency, tokens (prompt, cached, completion, reasoning if reported) and $ via the pricing table; writes CSV to logs/probe-<date>.csv and prints a summary table. It must refuse to run against the real API unless --live is passed AND MODEL_API_KEY is set, and print the estimated max $ before starting; default target is the mock. Also scripts/run-goal.mjs: CLI to run the brain on a goal ("iron_pickaxe", "logs:10", "hut") against a real server with caps and a JSONL log, and scripts/hud-data.mjs: reduce a run's JSONL to milestones (first log, wooden pickaxe, stone pickaxe, furnace, iron ingot, iron pickaxe) with timestamps, decisions and $ for the video HUD. Write test/probe.test.js against the mock.`],
]
const mods = await parallel(MODS.map(([k, p]) => () => agent(`${RULES}\n\nThe skeleton is done; its summary:\n${skel}\n\nYour module (only create/edit the files named here, plus their tests; if you need a change in a shared file, describe it in your reply instead of editing it):\n${p}\nRun npm test for your tests and make them pass. Return: files written, how to use them, anything the integrator must change in shared files.`, { label: `module:${k}`, phase: 'Modules' }).then((r) => ({ k, r }))))

phase('Integrate')
const integ = await agent(`${RULES}\n\nYou are the integrator. Four modules were built in parallel; their reports:\n${JSON.stringify(mods, null, 1)}\n\nApply the shared-file changes they asked for, wire src/index.js (start body + brain + web from config; graceful shutdown), make npm test pass in full, and make sure 'npm run mock' + 'node scripts/run-goal.mjs --mock' runs an end-to-end scripted episode with a fake bot (no Minecraft) and writes a JSONL log that scripts/hud-data.mjs can reduce. Update README with exact commands. Return the test output summary and any known gaps.`, { label: 'integrator', phase: 'Integrate' })

phase('Review')
const FIND_SCHEMA = { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, line: { type: 'number' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, issue: { type: 'string' }, fix: { type: 'string' } }, required: ['file', 'severity', 'issue', 'fix'] } } }, required: ['findings'] }
const LENS = [
  ['correctness', 'Correctness: mineflayer API usage (versions in package.json), crafting/smelting logic, pathfinding timeouts, the tool loop and message format for OpenAI-compatible chat completions with tools (tool_call ids, roles), async error handling, tests that pass for the wrong reason.'],
  ['safety', 'Security and abuse: anything that could execute viewer/model text, XSS or injection in the web page, missing rate limits or leases, the $ caps actually enforced, the probe never hitting a paid API without --live, secrets never logged, the server binding (Minecraft must stay localhost/LAN).'],
  ['contract', 'API contract with Meta Muse Spark per the findings file: base URL, model id, no stop param, tool_choice values, parallel_tool_calls, reasoning_effort values, prompt_cache_key, usage fields (cached tokens), streaming TTFT; and whether the /play page and openapi.json are something an agent browser that sees only the accessibility tree could operate.'],
]
const reviews = await parallel(LENS.map(([k, p]) => () => agent(`${RULES}\n\nReview the code in ${DIR} through ONE lens and report only real, specific defects (file, line, why it breaks, the fix). Do not edit files. ${p}`, { label: `review:${k}`, phase: 'Review', schema: FIND_SCHEMA }).then((r) => r ? r.findings.map((f) => ({ ...f, lens: k })) : [])))
const all = reviews.flat()
log(`${all.length} review findings (${all.filter((f) => f.severity === 'high').length} high)`)

phase('Fix')
const fixed = all.length ? await agent(`${RULES}\n\nReview findings (verify each against the code first; fix the real ones, skip false positives and say why):\n${JSON.stringify(all, null, 1)}\n\nRun npm test until it passes. Return: fixed / skipped per finding, final test summary, remaining gaps, and exact next steps for a human with a real key and a Paper 1.21.4 server.`, { label: 'fixer', phase: 'Fix' }) : 'no findings'

return { skel, mods, integ, reviewCount: all.length, fixed }
