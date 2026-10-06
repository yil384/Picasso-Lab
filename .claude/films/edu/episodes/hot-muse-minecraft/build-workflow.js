export const meta = {
  name: 'muse-minecraft-build',
  description: 'Build the Muse-plays-Minecraft agent (body, brain, viewer page, probe, tests) against a mock LLM, then adversarially review, fix and acceptance-test it',
  phases: [
    { title: 'Skeleton', detail: 'contracts, package.json, config, mock LLM server' },
    { title: 'Modules', detail: 'body, brain, web, probe in parallel (separate files)' },
    { title: 'Integrate', detail: 'wire, run tests, fix' },
    { title: 'Review', detail: 'adversarial review: correctness, safety, API contract' },
    { title: 'Fix', detail: 'verify each finding against the code, fix the real ones, rerun tests' },
    { title: 'Accept', detail: 'independent acceptance run against the plan checklist; one more fix round if it finds gaps' },
  ],
}

// Paths on the new Mac (M1, 16 GB, ~138 GB free). Change REPO if the repo moves.
const REPO = '/Users/linyichen/UCSD/Picasso-Lab'
const DIR = `${REPO}/.claude/films/edu/episodes/hot-muse-minecraft/agent`
const PLAN = `${REPO}/.claude/films/edu/research/muse-minecraft-plan.md`
const FIND = `${REPO}/.claude/films/edu/research/muse-minecraft-findings.json`
const RULES = `Project: "Muse plays Minecraft" for Picasso Lab (UC San Diego). Read the plan at ${PLAN} (sections 1-4 and 6) and, when you need an API detail, the findings at ${FIND}. Build in ${DIR} (Node.js ESM, plain JavaScript, Node >= 20; this Mac has Node v26.10.0 and no nvm - mineflayer is pure JS, so use it as is). Hard constraints:
- No real API key exists. NEVER call api.meta.ai, openrouter.ai or any paid API. All tests use a local mock OpenAI-compatible server (the skeleton provides it). The real key will come from the env var MODEL_API_KEY, base URL from MODEL_BASE_URL (default https://api.meta.ai/v1), model from MODEL_ID (default muse-spark-1.3). Never send the "stop" parameter, n>1, logprobs or logit_bias (Meta returns 400). parallel_tool_calls false, tool_choice "auto" (the only accepted value), reasoning_effort from env (default "low"; "none" is rejected, "minimal" is the lowest).
- Do not install Java, a Minecraft server, Minecraft, nvm, Playwright browsers or anything global (the user has not accepted the Minecraft EULA yet; a real-server test comes later, separately). npm install only inside ${DIR}, lean deps (mineflayer, mineflayer-pathfinder, mineflayer-collectblock, minecraft-data, openai; prismarine-viewer optional and lazy-loaded, NOT installed now).
- No code execution from model or viewer input, ever. Skills are a fixed whitelist with validated arguments. Minecraft stays bound to localhost/LAN; only the HTTP viewer channel is meant to be exposed (through a tunnel later).
- If you reuse skill logic from Mindcraft (MIT) credit it in a comment; never copy from rmalde/minecraft-agent (no license).
- Every file starts with a short comment saying what it is. Match a clean, small-module style. Use node:test for tests (npm test runs all of them).
- Never write "Claude", "Anthropic" or any assistant model name in code, comments, docs or logs.
- Do not touch anything outside ${DIR}. Do not commit (the lead commits).`
const PARALLEL = `Other agents are working in the same folder at the same time:
- only create or edit the files named in your task;
- do NOT run npm install (the skeleton installed every dependency; if you need another one, say so in your reply);
- run only your own tests (node --test test/<yours>.test.js), not npm test, because the others' files may be half-written.`

phase('Skeleton')
const skel = await agent(`${RULES}

You write the SKELETON so four people can then build modules in parallel without conflicts:
1. package.json (type: module, engines node >= 20, scripts: test = node --test test/, start, probe, mock), .gitignore (node_modules, logs, .env, notes.json), README.md (what it is, the architecture diagram from the plan, how to run with a real key on a machine with Paper 1.21.4, what is mocked).
2. src/config.js: all env vars with defaults (MODEL_*, MODEL_TIER standard|contributor, MC_HOST=127.0.0.1/PORT/VERSION=1.21.4, WEB_HOST=127.0.0.1, WEB_PORT, COST caps per run and per hour, STEP_CAP, LOG_DIR), one exported frozen object; never log the key.
3. src/contracts.js: JSDoc typedefs and the exact interfaces between modules: the 10 tools (get_state, go_to, collect(block,n), craft(item,n), smelt(item,n), place(block,pos), build(blueprint), attack(target), eat, say) with JSON Schemas (strict, additionalProperties false, bounded numbers, enum where possible) exported as TOOLS for the brain, plus validateArgs(tool, args) -> {ok, error}; the Body interface (createBody(opts) -> { state(): string, run(tool, args): Promise<{ok, result, delta}>, stop(), on(event) }); the Brain interface (createBrain({body, llm, log, caps}) -> { step(goal): Promise<StepResult>, runUntil(goal, cond) }); the Logger (JSONL row fields from the plan: time, model, effort, prompt/cached/completion tokens, ttft, latency, tool, args, result, inventory delta, cost) as src/log.js; the pricing table (Standard $1.25 in / $0.15 cached / $4.25 out; Contributor $0.10 / $0.002 / $0.20 per million tokens) with cost(usage, tier) that bills cached prompt tokens at the cached rate (usage.prompt_tokens_details.cached_tokens) and reasoning as output.
4. src/llm.js: a thin wrapper over the openai SDK (chat.completions with tools, stream true with stream_options include_usage), measuring TTFT and total latency, returning {message, toolCalls, usage, ttftMs, latencyMs}; strips every forbidden parameter; supports prompt_cache_key; key from config only.
5. test/mock-llm.js: a local mock OpenAI-compatible HTTP server (node:http, streaming SSE and non-streaming) with a scripted queue of responses (tool calls, usage with cached tokens), that records every request body so tests can assert no "stop" field, correct tools, etc. Export start(script) -> {url, requests, close}. Also a CLI (npm run mock).
6. test/fake-bot.js: an in-memory fake of the parts of a mineflayer bot the body uses (inventory, position, health, food, time, findBlocks, blockAt, dig, craft/recipesFor stubs, equip, chat, pathfinder.goto), so body logic is testable without a server.
7. A minimal smoke test (test/smoke.test.js) that imports config/contracts/llm and talks to the mock.
Run npm install and npm test; make them pass. Return a short summary of the files and the exact interfaces others must implement.`, { label: 'skeleton', phase: 'Skeleton' })
if (!skel) return { error: 'skeleton failed' }

phase('Modules')
const MODS = [
  ['body', `Implement src/body.js (createBody) and src/skills/*.js: a mineflayer bot body with the 10 whitelisted skills (use mineflayer-pathfinder and mineflayer-collectblock; recipes via minecraft-data for the configured version; craft needs a crafting table nearby or placed; smelt uses a furnace and fuel), argument validation against the TOOLS schemas, per-skill timeouts, a stop() kill switch that cancels the running skill, and src/state.js: the plain-text state serializer (health, food, position, time of day, inventory, nearby notable blocks within 32 blocks with counts and nearest distance, nearby mobs, current goal, last result). Body supports an injected bot (for tests with test/fake-bot.js) or creates one from config. Write test/body.test.js using the fake bot.`],
  ['brain', `Implement src/brain.js (createBrain) and src/memory.js: the tool loop (system prompt with the goal and rules; the model calls exactly one tool per turn; the result goes back as a tool message with the matching tool_call_id), guards (step cap, $ cap per run, a loop guard that detects the same failing call 3 times and injects a hint, max consecutive errors, a model reply with no tool call), short-term memory (last N steps summarized), long-term notes.json (known chest/furnace/table positions, lessons) read and written through a plain API the brain calls (not a model tool), and logging every step through the Logger. Keep the system prompt prefix byte-stable so prompt caching can work (the dynamic state goes last) and pass a prompt_cache_key. Write test/brain.test.js using the mock LLM and a stub body, including: no "stop" ever sent, a scripted 5-step run to a goal, the loop guard firing, the $ cap stopping the run, the prefix staying byte-identical across steps.`],
  ['web', `Implement src/web.js: the viewer channel with node:http only (no framework): GET / landing (what this is, not affiliated with Meta or Mojang, 18+), GET /play/:token zero-JS control page (the state as a <pre> text block with meta refresh, one <form method=post> per skill with labelled inputs, a stop button, the last 20 log lines; semantic HTML so an agent that sees only the accessibility tree can operate it), POST /play/:token/:tool (redirect back after the action), GET /openapi.json describing the same actions (OpenAPI 3.1, operationIds = tool names), JSON /api/:token/state and POST /api/:token/:tool, POST /ask (queue a natural-language instruction for our own brain; 18+ checkbox required; per-IP rate limit; length cap), GET /log (public JSONL tail, no secrets). Sessions: a token per guest (crypto random), each with its own bot slot and a 10-minute lease (inject a body factory so tests use a stub). Escape all output (no XSS), validate all args against TOOLS, cap request size, bind to WEB_HOST. Write test/web.test.js (starts the server on a random port with stub bodies; checks forms, openapi basics, escaping, rate limits, lease expiry). Also scripts/a11y_snapshot.py: Python Playwright with Chromium is installed on this Mac (python3 -c "import playwright" works); it prints the accessibility tree of a running /play page as a proxy for what Muse's browser sees and exits cleanly with a message if Playwright is missing. Python convention in this repo: functions return (value, error) tuples - (result, None) on success, (None, 'error msg') on failure.`],
  ['probe', `Implement scripts/probe.mjs: the latency/cost probe from the plan (C4): N calls at reasoning_effort in [minimal, low, medium] x prompt cache on/off x API style [chat] (responses optional behind a flag), with a realistic 3k-token stable prefix + a changing state suffix, measuring TTFT, total latency, tokens (prompt, cached, completion, reasoning if reported) and $ via the pricing table; writes CSV to logs/probe-<date>.csv and prints a summary table. It must refuse to run against the real API unless --live is passed AND MODEL_API_KEY is set, and print the estimated max $ before starting; default target is the mock. Also scripts/run-goal.mjs: CLI to run the brain on a goal ("iron_pickaxe", "logs:10", "hut") against a real server with caps and a JSONL log, with --mock to run against the mock LLM and the fake bot; and scripts/hud-data.mjs: reduce a run's JSONL to milestones (first log, wooden pickaxe, stone pickaxe, furnace, iron ingot, iron pickaxe) with timestamps, decision counts and $ for the video HUD. Write test/probe.test.js against the mock. src/brain.js and src/body.js are being written in parallel: code against the interfaces in src/contracts.js.`],
]
const mods = await parallel(MODS.map(([k, p]) => () => agent(`${RULES}\n\n${PARALLEL}\n\nThe skeleton is done; its summary:\n${skel}\n\nYour module (only create/edit the files named here, plus their tests; if you need a change in a shared file, describe it in your reply instead of editing it):\n${p}\nMake your tests pass. Return: files written, how to use them, anything the integrator must change in shared files.`, { label: `module:${k}`, phase: 'Modules' }).then((r) => ({ k, r }))))
const missing = MODS.map(([k]) => k).filter((k) => !mods.find((m) => m && m.k === k && m.r))
if (missing.length) log(`modules with no report (integrator must build them): ${missing.join(', ')}`)

phase('Integrate')
const integ = await agent(`${RULES}\n\nYou are the integrator. Four modules were built in parallel; their reports:\n${JSON.stringify(mods.filter(Boolean), null, 1)}\n${missing.length ? `These modules returned nothing and may be missing or half-written; finish them: ${missing.join(', ')}\n` : ''}\nApply the shared-file changes they asked for, wire src/index.js (start body + brain + web from config; graceful shutdown on SIGINT/SIGTERM), make npm test pass in full, and make sure 'npm run mock' + 'node scripts/run-goal.mjs --mock' runs an end-to-end scripted episode with a fake bot (no Minecraft) and writes a JSONL log that scripts/hud-data.mjs can reduce. Update README with exact commands. Return the test output summary and any known gaps.`, { label: 'integrator', phase: 'Integrate' })

phase('Review')
const FIND_SCHEMA = { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, line: { type: 'number' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, issue: { type: 'string' }, fix: { type: 'string' } }, required: ['file', 'severity', 'issue', 'fix'] } } }, required: ['findings'] }
const LENS = [
  ['correctness', 'Correctness: mineflayer API usage (versions in package.json; read node_modules sources to confirm signatures), crafting/smelting logic (crafting table, furnace, fuel), pathfinding timeouts, the tool loop and message format for OpenAI-compatible chat completions with tools (tool_call ids, roles, streamed tool-call deltas), async error handling and cleanup, tests that pass for the wrong reason.'],
  ['safety', 'Security and abuse: anything that could execute viewer/model text, XSS or injection in the web page, missing rate limits or leases, token guessability, request size caps, the $ caps actually enforced, the probe never hitting a paid API without --live, secrets never logged or served, the server bindings (Minecraft must stay localhost/LAN).'],
  ['contract', 'API contract with Meta Muse Spark per the findings file: base URL, model id, no stop / n / logprobs, tool_choice values, parallel_tool_calls, reasoning_effort values, prompt_cache_key, usage fields (cached tokens), streaming TTFT and include_usage; and whether the /play page and openapi.json are something an agent browser that sees only the accessibility tree (no JavaScript) could operate.'],
]
const reviews = await parallel(LENS.map(([k, p]) => () => agent(`${RULES}\n\nReview the code in ${DIR} through ONE lens and report only real, specific defects (file, line, why it breaks, the fix). You may run npm test and small node scripts against the mock to confirm a defect; do not edit files. ${p}`, { label: `review:${k}`, phase: 'Review', schema: FIND_SCHEMA }).then((r) => r ? r.findings.map((f) => ({ ...f, lens: k })) : [])))
const all = reviews.filter(Boolean).flat()
log(`${all.length} review findings (${all.filter((f) => f.severity === 'high').length} high)`)

phase('Fix')
const fixed = all.length ? await agent(`${RULES}\n\nReview findings from three independent reviewers. Treat each as a claim to REFUTE first: read the code, reproduce it if you can, and only fix the ones that hold up; skip false positives and say why:\n${JSON.stringify(all, null, 1)}\n\nRun npm test until it passes. Return: fixed / skipped per finding (with the reason), the final test summary, remaining gaps.`, { label: 'fixer', phase: 'Fix' }) : 'no findings'

phase('Accept')
const ACCEPT_SCHEMA = { type: 'object', properties: { tests: { type: 'string' }, e2e: { type: 'string' }, a11y: { type: 'string' }, gaps: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['high', 'medium', 'low'] }, gap: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'gap', 'fix'] } }, nextSteps: { type: 'string' } }, required: ['tests', 'e2e', 'a11y', 'gaps', 'nextSteps'] }
const acceptPrompt = `${RULES}\n\nYou are the acceptance tester, independent of the people who built and fixed this. Do not edit files. In ${DIR}:
1. Run npm test; report pass/fail counts.
2. Run the mock end to end: the mock LLM + node scripts/run-goal.mjs --mock, then scripts/hud-data.mjs on the log it wrote; report what came out.
3. Start the web server against stub/fake bodies on a free localhost port, run python3 scripts/a11y_snapshot.py on /play, and judge whether every state field and every skill button is exposed by name; then stop the server.
4. Check the plan's MVP scope and C3-C8 against what exists (the Mindcraft baseline C3 and the real Paper server C2 are out of scope for this run): what is missing, broken or only pretending to work? Look for tests that pass for the wrong reason.
Return the results and a list of gaps (high = blocks the MVP or unsafe), plus exact next steps for a human with a real key and a Paper 1.21.4 server.`
let accept = await agent(acceptPrompt, { label: 'acceptance', phase: 'Accept', schema: ACCEPT_SCHEMA })
let fixed2 = null
const serious = accept ? accept.gaps.filter((g) => g.severity !== 'low') : []
if (serious.length) {
  log(`acceptance found ${serious.length} high/medium gaps; one more fix round`)
  fixed2 = await agent(`${RULES}\n\nThe acceptance tester found these gaps (verify each against the code first; fix the real ones):\n${JSON.stringify(serious, null, 1)}\n\nRun npm test and the mock end-to-end run until both pass. Return fixed / skipped per gap with reasons and the final test summary.`, { label: 'fixer-2', phase: 'Accept' })
  accept = (await agent(acceptPrompt, { label: 'acceptance-2', phase: 'Accept', schema: ACCEPT_SCHEMA })) || accept
}

return { skel, mods, integ, reviewCount: all.length, findings: all, fixed, fixed2, accept }
