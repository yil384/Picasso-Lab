# Muse trades (working name)

An AI agent (Muse, Meta's AI, running on a schedule in muse.ai) trades US stocks and crypto on a **paper** account
with real market data, through this MCP server. Every order and its reason is public; a risk layer the agent cannot
switch off checks every order; the account is measured against buy-and-hold of SPY and BTC. A research demo by
Picasso Lab, UC San Diego. **Paper money, not investment advice, not affiliated with Meta.**

## What is here

| Path | What |
| --- | --- |
| `src/mcp.js` | MCP server (streamable HTTP, `/mcp`): `rules`, `market`, `news`, `portfolio`, `orders`, `journal`, `live_view` (open to all); `place_order`, `cancel_order`, `hold` (owner key) |
| `src/risk.js` | the risk layer: long only, no options, no leverage, 20% of equity per symbol, 10 orders an hour, buys halted for the day at -2%, allowlist, market hours; typed refusals |
| `src/trader.js` | the desk: market data and indicators, portfolio vs benchmarks, orders into the journal, the tick (fills, equity, outcomes, daily summary) |
| `src/journal.js` | the record in `DATA_DIR` (JSONL): decisions, calls, equity, daily summaries; the public order log and CSV |
| `src/svg.js`, `src/floor.js`, `src/page.js` | the trading floor: server-drawn SVG images reloaded by the page (muse.ai's panel blocks fetch, not images); the public page |
| `src/alpaca.js`, `src/mock-alpaca.js` | Alpaca's paper and data APIs; a mock of them for tests and for running without keys |
| `data/sp500.txt`, `data/crypto.txt` | the allowlist (`npm run refresh-sp500` updates the first) |
| `deploy/` | Dockerfile, compose, `push.sh`, `caddy-site.py` (docs/DEPLOY.md) |
| `docs/MUSE-PROMPT.md` | the one-time setup prompt for muse.ai |

## Run it

```sh
npm install
npm test                 # risk layer, validation, journal, SVGs, MCP contracts against the mock
npm start                # no keys: the mock broker (made-up prices, said on every page); http://127.0.0.1:8790/
npm run demo             # three weeks of made-up decisions on the mock, then the server with that record
npm run start:paper      # Alpaca paper with the keys in ~/.config/picasso/alpaca-paper.env
```

Settings (environment): `ALPACA_KEY_ID`, `ALPACA_SECRET_KEY` (paper keys; without them the mock), `MCP_OWNER_KEY` (who
may trade; without it only callers on this machine), `WEB_PUBLIC_URL`, `WEB_TRUST_PROXY=1` and `WEB_PROXY_SECRET`
(behind a proxy), `DATA_DIR`, `PORT`. The broker URL is Alpaca's paper API, wired in; live trading is refused.

## Self-hosting

No secret is in this folder: keys come from the environment. Point your agent's MCP client at
`https://<your host>/mcp?key=<MCP_OWNER_KEY>`. The word filter for public text is LDNOOBW's list (CC BY 4.0,
`src/moderation/NOTICE.md`).
