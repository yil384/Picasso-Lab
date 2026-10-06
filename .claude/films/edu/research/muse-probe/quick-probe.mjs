// Quick live latency/cost probe for Muse Spark (standalone; the real one is agent/scripts/probe.mjs).
// tiers x reasoning_effort x prompt cache off/on, N calls each; streams to time the first token; hard $ cap.
import { writeFileSync } from 'node:fs'

const KEY = process.env.MODEL_API_KEY, BASE = process.env.MODEL_BASE_URL || 'https://api.meta.ai/v1'
if (!KEY) { console.error('MODEL_API_KEY not set'); process.exit(1) }
const N = Number(process.env.N || 3), CAP = Number(process.env.CAP || 1)
const TIERS = { 'muse-spark-1.3': [1.25, 0.15, 4.25], 'muse-spark-1.3-contributor': [0.10, 0.002, 0.20] }
const EFFORTS = ['minimal', 'low', 'medium']

const str = (d) => ({ type: 'string', description: d })
const int = (d, min, max) => ({ type: 'integer', description: d, minimum: min, maximum: max })
const fn = (name, description, props = {}, req = Object.keys(props)) => ({ type: 'function', function: { name, description, strict: true, parameters: { type: 'object', properties: props, required: req, additionalProperties: false } } })
const TOOLS = [
  fn('get_state', 'Re-read the full game state.'),
  fn('go_to', 'Walk to a block position.', { x: int('x', -30000, 30000), y: int('y', -64, 320), z: int('z', -30000, 30000) }),
  fn('collect', 'Find, walk to and mine n blocks of a type.', { block: str('block id, e.g. oak_log'), n: int('count', 1, 64) }),
  fn('craft', 'Craft n of an item (places a crafting table if needed).', { item: str('item id'), n: int('count', 1, 64) }),
  fn('smelt', 'Smelt n items in a furnace with fuel from inventory.', { item: str('input item id'), n: int('count', 1, 64) }),
  fn('place', 'Place a block next to the bot.', { block: str('block id'), x: int('x', -30000, 30000), y: int('y', -64, 320), z: int('z', -30000, 30000) }),
  fn('build', 'Build a named blueprint here.', { blueprint: { type: 'string', enum: ['hut_3x3', 'pillar', 'shelter'] } }),
  fn('attack', 'Attack the nearest mob of a type.', { target: str('mob id') }),
  fn('eat', 'Eat the best food in inventory.'),
  fn('say', 'Say a short line in chat.', { text: { type: 'string', maxLength: 120 } }),
]

// ~3k-token stable prefix: rules + a playbook of recipes and tactics (the part prompt caching should reuse).
const recipes = [
  ['oak_planks', '1 oak_log -> 4 oak_planks'], ['stick', '2 planks -> 4 sticks'], ['crafting_table', '4 planks'],
  ['wooden_pickaxe', '3 planks + 2 sticks, needs crafting table'], ['stone_pickaxe', '3 cobblestone + 2 sticks, needs crafting table'],
  ['furnace', '8 cobblestone, needs crafting table'], ['iron_ingot', 'smelt raw_iron in furnace, 1 fuel per 8 items with coal, 1.5 items per plank'],
  ['iron_pickaxe', '3 iron_ingot + 2 sticks, needs crafting table'], ['torch', '1 coal + 1 stick -> 4 torches'], ['chest', '8 planks'],
]
const tactics = Array.from({ length: 40 }, (_, i) => `Tactic ${i + 1}: ${[
  'Iron ore is most common between y=0 and y=64; look in exposed cave walls before digging.',
  'Never dig straight down; dig a staircase so you can walk back up and do not fall into lava.',
  'Keep at least 6 food; eat when food is below 14 so health regenerates.',
  'Carry a spare crafting table instead of walking back to the old one.',
  'Coal ore is common near the surface and is the best early fuel.',
  'At night, stay near light or build a 3x3 shelter; zombies and skeletons spawn in the dark.',
  'If the same action fails twice, change the plan instead of retrying it a third time.',
  'Collect a few extra logs early: planks are also fuel and sticks are always needed.',
][i % 8]}`)
const PREFIX = [
  'You are the brain of a Minecraft bot in a fresh survival world. You see the game only as the text state below and act only through the tools.',
  'Rules: call exactly one tool per turn. Prefer skills that do a lot of work (collect 8 logs, not 1). Explain nothing; just call the tool.',
  'Goal: craft an iron_pickaxe as fast as possible.',
  'Recipes:', ...recipes.map(([k, v]) => `- ${k}: ${v}`),
  'Playbook:', ...tactics, ...tactics.map((t) => t.replace('Tactic', 'Reminder')), ...tactics.map((t) => t.replace('Tactic', 'Lesson')),
].join('\n')

const STATES = [
  'health 20, food 20, day 0 06:10, pos (12, 70, -4). inventory: empty. nearby: oak_log x14 (nearest 6), grass_block, stone x220 (nearest 9).',
  'health 20, food 19, day 0 06:40, pos (15, 70, -2). inventory: oak_log 8. nearby: oak_log x6 (nearest 4), stone x220 (nearest 7).',
  'health 20, food 18, day 0 07:05, pos (15, 70, -2). inventory: oak_planks 24, stick 4, crafting_table 1. nearby: stone x220 (nearest 7).',
  'health 19, food 17, day 0 07:30, pos (18, 66, 1). inventory: wooden_pickaxe 1, oak_planks 13, stick 2. nearby: stone x400 (nearest 2), coal_ore x5 (nearest 11).',
  'health 19, food 16, day 0 08:10, pos (22, 60, 6). inventory: stone_pickaxe 1, cobblestone 23, coal 6, stick 3. nearby: iron_ore x3 (nearest 14).',
]

async function call(model, effort, cache, i) {
  const nonce = cache ? '' : `Session ${Math.random().toString(36).slice(2)}\n`
  const body = {
    model, reasoning_effort: effort, parallel_tool_calls: false, tool_choice: 'auto', tools: TOOLS, stream: true, stream_options: { include_usage: true },
    messages: [{ role: 'system', content: nonce + PREFIX }, { role: 'user', content: `State: ${STATES[i % STATES.length]}` }],
  }
  if (cache) body.prompt_cache_key = 'muse-mc-probe-v1'
  const t0 = performance.now()
  const res = await fetch(`${BASE}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) return { error: `HTTP ${res.status} ${(await res.text()).slice(0, 200)}` }
  let ttft = null, usage = null, buf = '', tool = '', args = '', text = ''
  const dec = new TextDecoder()
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true })
    let k
    while ((k = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, k).trim(); buf = buf.slice(k + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') continue
      const j = JSON.parse(data)
      if (j.usage) usage = j.usage
      const d = j.choices?.[0]?.delta
      if (!d) continue
      if (ttft === null && (d.content || d.tool_calls)) ttft = performance.now() - t0
      if (d.content) text += d.content
      for (const tc of d.tool_calls || []) { if (tc.function?.name) tool += tc.function.name; if (tc.function?.arguments) args += tc.function.arguments }
    }
  }
  const total = performance.now() - t0
  let validArgs = false
  try { JSON.parse(args || '{}'); validArgs = true } catch {}
  return { ttft, total, usage, tool, args, text, validArgs }
}

const cost = (u, [pin, pcache, pout]) => {
  const cached = u?.prompt_tokens_details?.cached_tokens || 0
  return ((u.prompt_tokens - cached) * pin + cached * pcache + u.completion_tokens * pout) / 1e6
}

const rows = [], t = Date.now()
let spent = 0
console.log(`prefix ~${Math.round(PREFIX.length / 4)} tokens; ${Object.keys(TIERS).length * EFFORTS.length * 2 * N} calls (+1 warm-up per cached cell); cap $${CAP}`)
for (const [model, price] of Object.entries(TIERS)) for (const effort of EFFORTS) for (const cache of [false, true]) {
  for (let i = cache ? -1 : 0; i < N; i++) {
    if (spent > CAP) { console.error(`$ cap reached ($${spent.toFixed(4)})`); process.exit(2) }
    const r = await call(model, effort, cache, Math.max(i, 0) + (cache ? 1 : 0))
    if (r.error) { console.log(model, effort, cache, r.error); rows.push({ model, effort, cache, warm: i < 0, error: r.error }); continue }
    const c = cost(r.usage, price); spent += c
    const row = { model, effort, cache, warm: i < 0, ttft_ms: Math.round(r.ttft ?? -1), total_ms: Math.round(r.total), prompt: r.usage.prompt_tokens, cached: r.usage.prompt_tokens_details?.cached_tokens || 0, completion: r.usage.completion_tokens, reasoning: r.usage.completion_tokens_details?.reasoning_tokens || 0, usd: +c.toFixed(6), tool: r.tool || '(none)', args: r.args, valid: r.validArgs && !!r.tool }
    rows.push(row)
    console.log(`${model.padEnd(27)} ${effort.padEnd(7)} cache=${cache ? 'on ' : 'off'}${i < 0 ? ' warm' : '     '} ttft ${String(row.ttft_ms).padStart(5)} ms  total ${String(row.total_ms).padStart(5)} ms  in ${row.prompt} (cached ${row.cached})  out ${row.completion} (reason ${row.reasoning})  $${row.usd.toFixed(5)}  ${row.tool} ${row.args}`)
  }
}
const out = process.argv[2] || `probe-${t}.csv`
const cols = ['model', 'effort', 'cache', 'warm', 'ttft_ms', 'total_ms', 'prompt', 'cached', 'completion', 'reasoning', 'usd', 'tool', 'args', 'valid', 'error']
writeFileSync(out, [cols.join(','), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n'))
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN }
console.log(`\nmedians (warm-ups excluded)  total spent $${spent.toFixed(4)}  csv ${out}`)
for (const model of Object.keys(TIERS)) for (const effort of EFFORTS) for (const cache of [false, true]) {
  const g = rows.filter((r) => r.model === model && r.effort === effort && r.cache === cache && !r.warm && !r.error)
  if (!g.length) continue
  console.log(`${model.padEnd(27)} ${effort.padEnd(7)} cache=${cache ? 'on ' : 'off'}  ttft ${med(g.map((r) => r.ttft_ms))} ms  total ${med(g.map((r) => r.total_ms))} ms  cached ${med(g.map((r) => r.cached))}/${med(g.map((r) => r.prompt))}  $/call ${med(g.map((r) => r.usd)).toFixed(5)}  valid ${g.filter((r) => r.valid).length}/${g.length}`)
}
