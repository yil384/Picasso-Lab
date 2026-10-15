# Setting Muse up (once, in muse.ai)

Muse runs itself on a schedule inside muse.ai (scheduled tasks); our server only answers its tool calls. Paste the
prompt below into a new muse.ai chat, once, after the server is deployed.

The server is live at https://trade.picasso-lab.com (MCP endpoint `https://trade.picasso-lab.com/mcp`, Alpaca paper
account, record started 2026-10-15 11:56 ET with $100,000). Before pasting, get your MCP URL with the owner key in it
by running this on your Mac (it prints the URL; nothing else needs it):

```sh
ssh picasso 'printf "https://trade.picasso-lab.com/mcp?key=%s\n" "$(grep ^MCP_OWNER_KEY= ~/workspace/muse-trader/app/deploy/.env | cut -d= -f2-)"'
```

and put that whole URL in place of `https://trade.picasso-lab.com/mcp?key=OWNER_KEY` in step 1.

The key lets Muse place orders; anyone without it can only read. If it leaks: delete the line from the server's
`deploy/.env`, run `deploy/push.sh` (it makes a new one), and give Muse the new URL.

---

```text
Please set up a trading research project for me. It uses paper money only (a simulated account with real market
data), for a public research demo by Picasso Lab, UC San Diego, where every order and its reason is shown publicly.

1. Connect a custom MCP integration (streamable HTTP) named "Muse Trades" at this URL:
   https://trade.picasso-lab.com/mcp?key=OWNER_KEY
   Then list its tools. You should see: rules, market, news, portfolio, place_order, cancel_order, orders, journal,
   hold, live_view.

2. Call rules and read them. A risk layer checks every order and cannot be switched off: long only, no options, no
   leverage, at most 20% of equity per symbol, at most 10 orders an hour, buys stop for the day after a 2% daily loss,
   S&P 500 stocks and ten crypto pairs only, stocks in market hours only.

3. Create three scheduled tasks that use only this integration:

   a. "Stocks round": every 30 minutes, Monday to Friday, from 9:45 to 15:45 New York time.
      Call portfolio, then market for the stocks you hold plus up to 15 S&P 500 candidates you want to look at
      (news if a move needs explaining). Then either place_order (at most 3 orders in a round) or hold. Every
      place_order and hold carries why (at most 140 characters: the reason, with the numbers that matter) and plan
      (at most 400 characters: what you will do next, when you would add, take profit or sell).

   b. "Crypto round": every 2 hours, every day. The same steps for the crypto pairs (BTC/USD, ETH/USD, SOL/USD,
      XRP/USD, DOGE/USD, LINK/USD, AVAX/USD, LTC/USD, BCH/USD, DOT/USD).

   c. "Daily wrap-up": every day at 16:30 New York time. Call journal (days 7) and portfolio, and write me a short
      note in this chat: how the account did against SPY and BTC buy-and-hold, which decisions worked and which did
      not, and one thing to do differently. Place no orders, and post nothing anywhere else.

4. How to decide:
   - You are measured against buying and holding SPY (stocks) and BTC (crypto) from the same start. Beating them
     after costs is hard; trade only when you have a reason you can state in numbers. Holding cash or doing nothing
     is a fine decision; record it with hold.
   - Think in days and weeks, not minutes. Keep turnover low. Size positions so one bad trade costs little.
   - The indicators describe the past; news can be stale. Say what you see, never more than the data shows.
   - When an order is refused, read the code and the words, and adjust; never resend the same order.
   - Read journal now and then, and learn from the outcomes of your past decisions.
   - Do only what these tools offer: no other websites, accounts, emails or posts.

5. Finally, call live_view and show the HTML it returns, exactly as returned, as a web artifact in the preview panel,
   so I can watch the trading floor. Then run one "Stocks round" (or a "Crypto round" if the stock market is closed)
   now, so I can see the first decision.
```

---

Notes for the owner

- The public page is https://trade.picasso-lab.com/ (the floor, the rules, every order with CSV/JSON downloads, the
  daily summaries). Anyone can connect to `/mcp` without the key and use the reading tools.
- To pause Muse: pause the scheduled tasks in muse.ai. To stop trading at the server: remove `MCP_OWNER_KEY` from the
  server's `deploy/.env` and recreate (`docker compose -p muse-trader up -d` in `~/workspace/muse-trader/app/deploy`);
  every acting tool then answers OWNER_ONLY.
- If muse.ai's scheduled tasks cannot run a custom integration, ask Muse in chat which of its features can call the
  integration on a timer; the server works the same way however it is called.
