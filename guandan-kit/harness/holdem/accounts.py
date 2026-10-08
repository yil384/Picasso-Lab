"""Account layer checks (games-account.js + account-link.html) against the real dealer: this is `e2e.py accounts`
(continue-as for fresh browsers only and only on a click, save with email through account-link.html with a locally
signed ID token and a local key set, a protected name reverted, a Guandan round reported once).
Usage: python3 accounts.py"""
import asyncio, sys
import e2e

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(e2e.main(['accounts'])) else 1)
