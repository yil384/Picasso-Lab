#!/usr/bin/env python3
"""deploy/caddy-proxy-line.py add|remove staging|production: adds or removes the one line that makes the FRAS Caddy
send the proxy secret to the agent (docs/SWITCH.md, step 3), and changes nothing else in that shared Caddyfile.

    header_up X-Muse-Proxy {file./etc/caddy/priv/<secret file>}

goes right after `reverse_proxy 172.24.0.1:<port> {` of the site's block. Run on picasso (python3, any directory).
The Caddyfile is shared with other projects that edit it often, so the undo is this script's `remove`, never a copy of
an older file: a copy would drop whatever was added since (on 2026-10-08 another job added poker.picasso-lab.com).

In order, each step only if the one before succeeded: read the Caddyfile and its hash; check the site block (and, for
`add`, that the secret file is there and not empty); keep a copy, `Caddyfile.bak-<time>-<op>-<target>`, as a record
only; write `Caddyfile.new` (the same mode and group) and print the diff; `caddy validate` it inside the container;
check that the Caddyfile is still the one read (another session's save in between stops it); move it into place;
`caddy reload`. Any stop before the move leaves the live Caddyfile as it was and removes `Caddyfile.new`.
Exit 0 done, 1 stopped with nothing changed, 2 the file moved but the reload failed (Caddy still runs the old config).
Options: --dir DIR (default ~/workspace/FRAS/caddy-config), --container NAME (default fras-caddy-1).
"""
import difflib
import hashlib
import os
import shutil
import subprocess
import sys
import time

SITES = {
    'staging': ('play-staging.picasso-lab.com', 7851, 'muse-staging-proxy-secret'),
    'production': ('play.picasso-lab.com', 7850, 'muse-play-proxy-secret'),
}


def edit(text, op, host, port, name):
    """The Caddyfile text with the site's header line added or removed: (new text, None) or (None, why not)."""
    head = f"{host} {{\n\treverse_proxy 172.24.0.1:{port} {{\n"
    line = f"\t\theader_up X-Muse-Proxy {{file./etc/caddy/priv/{name}}}\n"
    if text.count(head) != 1:
        return None, f"the {host} block does not start with `reverse_proxy 172.24.0.1:{port} {{` exactly once"
    if op == 'add':
        if 'X-Muse-Proxy' in text.split(head, 1)[1].split('\n}\n', 1)[0] or f"priv/{name}" in text:
            return None, f"the {host} block already has an X-Muse-Proxy line (or priv/{name} is used elsewhere)"
        return text.replace(head, head + line), None
    if op == 'remove':
        if text.count(line) != 1 or text.count(head + line) != 1:
            return None, f"the {host} block does not have exactly one `{line.strip()}` right after its reverse_proxy line"
        return text.replace(head + line, head), None
    return None, f"unknown operation {op!r}"


def args_of(argv):
    """(options dict, None) or (None, usage text)."""
    usage = 'usage: caddy-proxy-line.py add|remove staging|production [--dir DIR] [--container NAME]'
    opts = {'dir': os.path.expanduser('~/workspace/FRAS/caddy-config'), 'container': 'fras-caddy-1'}
    rest = []
    it = iter(argv)
    for a in it:
        if a in ('--dir', '--container'):
            v = next(it, None)
            if v is None:
                return None, usage
            opts[a[2:]] = v
        else:
            rest.append(a)
    if len(rest) != 2 or rest[0] not in ('add', 'remove') or rest[1] not in SITES:
        return None, usage
    opts['op'], opts['target'] = rest
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
    sys.stdout.reconfigure(line_buffering=True)  # the diff before any STOPPED line, through a pipe or ssh too
    opts, err = args_of(argv)
    if err:
        print(err, file=sys.stderr)
        return 1
    op, target, d, container = opts['op'], opts['target'], opts['dir'], opts['container']
    host, port, name = SITES[target]
    live, new = os.path.join(d, 'Caddyfile'), os.path.join(d, 'Caddyfile.new')
    stop = lambda why: print(f"caddy: STOPPED, nothing changed: {why}", file=sys.stderr) or 1

    with open(live, encoding='utf-8') as f:
        text = f.read()
    read_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
    if op == 'add':
        secret = os.path.join(d, 'priv', name)
        if not os.path.isfile(secret) or os.path.getsize(secret) == 0:
            return stop(f"{secret} is missing or empty (make it first: docs/SWITCH.md, step 3)")
    changed, err = edit(text, op, host, port, name)
    if err:
        return stop(err)
    if os.path.exists(new):
        return stop(f"{new} exists: another edit in progress, or a leftover; look at it and remove it")

    record = os.path.join(d, f"Caddyfile.bak-{time.strftime('%Y%m%d-%H%M%S')}-{op}-{target}")
    shutil.copy2(live, record)
    with open(new, 'w', encoding='utf-8') as f:
        f.write(changed)
    shutil.copymode(live, new)
    try:
        os.chown(new, -1, os.stat(live).st_gid)
    except OSError:
        pass
    sys.stdout.writelines(difflib.unified_diff(text.splitlines(True), changed.splitlines(True),
                                               'Caddyfile', 'Caddyfile.new', n=1))

    out, err = caddy(container, 'validate', '--config', '/etc/caddy/Caddyfile.new')
    if err:
        os.remove(new)
        print('\n'.join(err.splitlines()[-5:]), file=sys.stderr)
        return stop('caddy validate refused Caddyfile.new')
    # exit 0 is the verdict; caddy prints its log lines to stderr around "Valid configuration"
    print(next((l for l in out.splitlines() if 'Valid configuration' in l), 'Valid configuration'))
    if sha(live) != read_hash:
        os.remove(new)
        return stop('the Caddyfile changed while this ran (another session saved it); run this again')
    os.replace(new, live)

    out, err = caddy(container, 'reload', '--config', '/etc/caddy/Caddyfile')
    if err:
        print(err, file=sys.stderr)
        print(f"caddy: the Caddyfile on disk has the change (validated), but the reload failed and Caddy still runs the "
              f"old config; run `docker exec {container} caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile` "
              f"again, or `{os.path.basename(sys.argv[0])} {'remove' if op == 'add' else 'add'} {target}` to go back",
              file=sys.stderr)
        return 2
    print(f"caddy: {host} {'sends' if op == 'add' else 'no longer sends'} X-Muse-Proxy; reloaded "
          f"(the file before: {os.path.basename(record)}, a record only, never copied back)")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
