#!/usr/bin/env python3
"""deploy/caddy-site.py add|remove --dir DIR --container NAME: adds or removes the trade.picasso-lab.com site block in the
shared edge Caddyfile, and changes nothing else in it. The same careful steps as the Minecraft agent's
deploy/caddy-proxy-line.py (that script adds a header line to an existing block; this one adds the whole block):

    trade.picasso-lab.com {
    	reverse_proxy 172.24.0.1:7870 {
    		header_up X-Muse-Proxy {file./etc/caddy/priv/muse-trader-proxy-secret}
    		header_up X-Forwarded-Proto {scheme}
    	}
    	encode gzip
    }

goes at the end of the file. Run on picasso (python3, any directory). In order, each step only if the one before
succeeded: read the Caddyfile and its hash; check the block is absent (add) or there exactly as above (remove), and for
`add` that the secret file is there and not empty; keep a copy, `Caddyfile.bak-<time>-<op>-trade`, as a record only;
write `Caddyfile.new` (same mode and group) and print the diff; `caddy validate` it inside the container; check the
Caddyfile is still the one read; move it into place; `caddy reload`. Exit 0 done, 1 stopped with nothing changed, 2 the
file moved but the reload failed. Today: --dir /nvme2n1/yichen/picasso-edge/caddy-config --container picasso-edge-caddy.
"""
import difflib
import hashlib
import os
import shutil
import subprocess
import sys
import time

HOST, PORT, SECRET = 'trade.picasso-lab.com', 7870, 'muse-trader-proxy-secret'
BLOCK = (f"\n# muse-trader (Muse trades, paper money): added by its deploy/caddy-site.py\n{HOST} {{\n"
         f"\treverse_proxy 172.24.0.1:{PORT} {{\n\t\theader_up X-Muse-Proxy {{file./etc/caddy/priv/{SECRET}}}\n"
         f"\t\theader_up X-Forwarded-Proto {{scheme}}\n\t}}\n\tencode gzip\n}}\n")


def edit(text, op):
    """The Caddyfile text with the block added or removed: (new text, None) or (None, why not)."""
    if op == 'add':
        if f"{HOST} {{" in text or f"{HOST}," in text or f"priv/{SECRET}" in text:
            return None, f"{HOST} (or priv/{SECRET}) is already in the Caddyfile"
        return text.rstrip('\n') + '\n' + BLOCK, None
    if op == 'remove':
        if text.count(BLOCK) != 1:
            return None, f"the {HOST} block is not in the Caddyfile exactly as this script writes it; edit by hand"
        return text.replace(BLOCK, ''), None
    return None, f"unknown operation {op!r}"


def args_of(argv):
    """(options dict, None) or (None, usage text)."""
    usage = ('usage: caddy-site.py add|remove --dir DIR --container NAME\n'
             '  today: --dir /nvme2n1/yichen/picasso-edge/caddy-config --container picasso-edge-caddy')
    opts, rest, it = {}, [], iter(argv)
    for a in it:
        if a in ('--dir', '--container'):
            v = next(it, None)
            if v is None:
                return None, usage
            opts[a[2:]] = v
        else:
            rest.append(a)
    if len(rest) != 1 or rest[0] not in ('add', 'remove') or not opts.get('dir') or not opts.get('container'):
        return None, usage
    opts['dir'], opts['op'] = os.path.expanduser(opts['dir']), rest[0]
    return opts, None


def caddy(container, *args):
    """(output, None) when the command inside the Caddy container succeeded, else (None, its output)."""
    try:
        r = subprocess.run(['docker', 'exec', container, 'caddy', *args, '--adapter', 'caddyfile'],
                           capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, str(e)
    out = (r.stdout + r.stderr).strip()
    return (out, None) if r.returncode == 0 else (None, out or f"exit {r.returncode}")


def sha(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def main(argv):
    sys.stdout.reconfigure(line_buffering=True)
    opts, err = args_of(argv)
    if err:
        print(err, file=sys.stderr)
        return 1
    op, d, container = opts['op'], opts['dir'], opts['container']
    live, new = os.path.join(d, 'Caddyfile'), os.path.join(d, 'Caddyfile.new')
    stop = lambda why: print(f"caddy: STOPPED, nothing changed: {why}", file=sys.stderr) or 1

    with open(live, encoding='utf-8') as f:
        text = f.read()
    read_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
    if op == 'add':
        secret = os.path.join(d, 'priv', SECRET)
        if not os.path.isfile(secret) or os.path.getsize(secret) == 0:
            return stop(f"{secret} is missing or empty (docs/DEPLOY.md, step 2)")
    changed, err = edit(text, op)
    if err:
        return stop(err)
    if os.path.exists(new):
        return stop(f"{new} exists: another edit in progress, or a leftover; look at it and remove it")

    record = os.path.join(d, f"Caddyfile.bak-{time.strftime('%Y%m%d-%H%M%S')}-{op}-trade")
    shutil.copy2(live, record)
    with open(new, 'w', encoding='utf-8') as f:
        f.write(changed)
    shutil.copymode(live, new)
    try:
        os.chown(new, -1, os.stat(live).st_gid)
    except OSError:
        pass
    sys.stdout.writelines(difflib.unified_diff(text.splitlines(True), changed.splitlines(True), 'Caddyfile', 'Caddyfile.new', n=1))

    out, err = caddy(container, 'validate', '--config', '/etc/caddy/Caddyfile.new')
    if err:
        os.remove(new)
        print('\n'.join(err.splitlines()[-5:]), file=sys.stderr)
        return stop('caddy validate refused Caddyfile.new')
    print(next((l for l in out.splitlines() if 'Valid configuration' in l), 'Valid configuration'))
    if sha(live) != read_hash:
        os.remove(new)
        return stop('the Caddyfile changed while this ran (another session saved it); run this again')
    os.replace(new, live)

    out, err = caddy(container, 'reload', '--config', '/etc/caddy/Caddyfile')
    if err:
        print(err, file=sys.stderr)
        print(f"caddy: the Caddyfile has the change (validated) but the reload failed; run `docker exec {container} caddy reload "
              f"--config /etc/caddy/Caddyfile --adapter caddyfile` again, or `caddy-site.py {'remove' if op == 'add' else 'add'}` to go back",
              file=sys.stderr)
        return 2
    print(f"caddy: {HOST} {'added' if op == 'add' else 'removed'}; reloaded (the file before: {os.path.basename(record)}, a record only)")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
