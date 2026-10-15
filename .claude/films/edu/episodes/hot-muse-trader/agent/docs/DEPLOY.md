# Deploying on picasso (trade.picasso-lab.com)

Live since 2026-10-15 (Alpaca paper, record started 11:56 ET with $100,000; the two $10 AAPL orders at 11:57 ET are
the deployment test, labelled TEST in the public log). Compose project `muse-trader` in `~/workspace/muse-trader`
(code in `app/`, the record in `run/paper`), next to the Minecraft stack: its own project name, port
`172.24.0.1:7870` (7850, 7851 and 7860 are taken) and network `10.77.80.0/29` (picasso's default address pools are
used up). Secrets only in
files outside git: `deploy/.env` on the server, `~/.config/picasso/alpaca-paper.env` on the owner's Mac.

## 1. DNS

Nothing to add. `*.picasso-lab.com` is a wildcard CNAME to `picasso-hopper.ucsd.edu` (137.110.161.94), so
`trade.picasso-lab.com` already resolves there (checked with dig on 2026-10-15). Caddy gets the certificate by itself
once the site block is in. (Without the wildcard the record would be `trade  CNAME  picasso-hopper.ucsd.edu.` in the
picasso-lab.com zone at Google Cloud DNS.)

## 2. First deploy (mock broker until the keys are in)

```sh
deploy/push.sh                       # on the Mac: tests, copy, deploy/.env made on the server, build, start
ssh picasso 'cd ~/workspace/muse-trader/app/deploy && umask 077 && grep ^WEB_PROXY_SECRET= .env | cut -d= -f2- | tr -d "\n" \
  > /nvme2n1/yichen/picasso-edge/caddy-config/priv/muse-trader-proxy-secret'
```

Check the secret file is readable by the Caddy container the way `priv/muse-play-proxy-secret` is (same owner, group
and mode: `ls -l` both), then add the site block (validate, swap and reload, with a record of the old file):

```sh
ssh picasso 'python3 ~/workspace/muse-trader/app/deploy/caddy-site.py add \
  --dir /nvme2n1/yichen/picasso-edge/caddy-config --container picasso-edge-caddy'
curl -s https://trade.picasso-lab.com/healthz      # {"ok": true, "mock": true, ...}
```

Undo: the same script with `remove`.

## 3. The switch to Alpaca paper (one step)

The owner makes a paper account at alpaca.markets, creates the paper API keys (they start with `PK`), and writes them
on the Mac:

```sh
mkdir -p ~/.config/picasso && umask 077 && cat > ~/.config/picasso/alpaca-paper.env <<'EOF'
ALPACA_KEY_ID=PK...
ALPACA_SECRET_KEY=...
EOF
deploy/push.sh --keys
```

`--keys` sends the two lines over ssh into the server's `deploy/.env` and restarts. `/healthz` then says
`"mock": false`, the MOCK DATA banner goes, and the challenge record starts fresh in `run/paper` (the mock's record
stays in `run/mock`). The paper URL is wired into the code: a live-trading URL or a live key (`AK...`) stops the server
at start. Locally, `npm run start:paper` reads the same file.

## 4. Muse

Paste `docs/MUSE-PROMPT.md` into muse.ai (with the owner key from the server's `deploy/.env`).
