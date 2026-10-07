# Muse Spark live probe, 2026-10-06 (first real numbers)

`quick-probe.mjs` (standalone, fetch + SSE): 2 tiers x reasoning_effort minimal/low/medium x prompt cache off/on,
3 timed calls each (+1 warm-up per cached cell), ~4.4k input tokens per call (3k-token rules/playbook prefix + the 10
skill schemas + a changing state line), streaming, `parallel_tool_calls:false`. Raw rows: `probe-run1.csv`.
Run: `source ~/.config/picasso/muse.env && N=3 CAP=1 node quick-probe.mjs out.csv`. 42 calls cost $0.116 in total.

Medians (n=3 per cell, so treat as rough; single calls ranged 1.4-16 s):

| model | effort | cache | first token | total | cached/input | $ per decision |
|---|---|---|---|---|---|---|
| muse-spark-1.3 | minimal | off | 2.3 s | 2.6 s | 0/4429 | 0.0063 |
| muse-spark-1.3 | minimal | on | 2.1 s | 2.2 s | 4337/4420 | 0.0015 |
| muse-spark-1.3 | low | off | 4.2 s | 4.5 s | 0/4428 | 0.0064 |
| muse-spark-1.3 | low | on | 3.4 s | 3.6 s | 4337/4420 | 0.0022 |
| muse-spark-1.3 | medium | off | 6.2 s | 6.4 s | 0/4429 | 0.0073 |
| muse-spark-1.3 | medium | on | 9.5 s | 9.7 s | 4337/4420 | 0.0040 |
| ...-contributor | minimal | off | 3.1 s | 3.3 s | 0/4430 | 0.00047 |
| ...-contributor | minimal | on | 2.0 s | 2.2 s | 4337/4420 | 0.00005 |
| ...-contributor | low | off | 1.8 s | 2.0 s | 0/4428 | 0.00048 |
| ...-contributor | low | on | 4.4 s | 4.5 s | 4337/4420 | 0.00007 |
| ...-contributor | medium | off | 4.5 s | 4.7 s | 0/4428 | 0.00051 |
| ...-contributor | medium | on | 3.8 s | 4.0 s | 4337/4420 | 0.00009 |

What it says:
- Prompt caching works through `prompt_cache_key`: 98% of the prompt was served from cache after one warm-up, and
  $ per decision fell ~4x on Standard (0.0063 -> 0.0015) and ~9x on Contributor. Latency gains are small and inside
  the noise at n=3: the time goes to hidden reasoning, not prefill. The honest video line is about $, not speed.
- minimal is ~2-3 s per decision; low ~3.5-4.5 s; medium 6-10 s with long tails (reasoning up to ~1.2k tokens).
- All 36 timed calls returned exactly one valid tool call with sensible arguments.
- Iron-pickaxe run estimate (~180 decisions, Standard, minimal, cached): ~$0.27 and ~7 min of model time.
- Billing must be set up first (HTTP 402 `billing_not_configured` before; no free credits). `stop` -> HTTP 400.
