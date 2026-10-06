#!/usr/bin/env python3
"""scripts/a11y_snapshot.py - print the accessibility tree of a running /play page, as a proxy for what a viewer's Muse
sees: its browser reads a page only as an accessibility-tree snapshot and cannot run JavaScript.

Usage:
  python3 scripts/a11y_snapshot.py http://127.0.0.1:8787/play/<token>   a session you already have
  python3 scripts/a11y_snapshot.py http://127.0.0.1:8787/               start one through the landing page, as an agent would
  python3 scripts/a11y_snapshot.py URL --check [--fields health,food,position,inventory]

--check also asserts that the tree exposes every skill listed in /openapi.json as a named form with a "Run <skill>"
button, that every input has a name, and that the status, the last result, the stop and end buttons and the state text
(with each of --fields) are there. A session this script started itself is ended afterwards ("End my session"), so it
does not hold a bot for the whole lease. Session tokens are shortened in the printed tree.

The browser runs with JavaScript off, like the agent's. Nothing is installed by this script.
Exit codes: 0 ok, 1 the check failed or the page could not be loaded, 2 bad arguments, 3 Playwright or its Chromium is
missing, or Playwright is older than 1.49 (no aria_snapshot; it needs Python 3.9 or newer) - nothing was checked.
Without Playwright, scripts/a11y-chrome.mjs runs the same check through a Chrome that is already installed.
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

EXIT_OK, EXIT_FAIL, EXIT_USAGE, EXIT_MISSING = 0, 1, 2, 3
DEFAULT_FIELDS = "health,food,position,inventory"
CONTROL_ROLES = "textbox|spinbutton|combobox|checkbox|radio|slider|searchbox|button"
HEADINGS = ("Status", "Last result", "Game state", "Actions", "Recent actions (newest first)")
MIN_PLAYWRIGHT = (1, 49)  # Locator.aria_snapshot arrived in 1.49


def parse_args(argv):
    """Command line -> (namespace, None) or (None, 'error msg')."""
    parser = argparse.ArgumentParser(description="Print the accessibility tree of a /play page.")
    parser.add_argument("url", help="a /play/<token> page, or the site root to start a session first")
    parser.add_argument("--check", action="store_true", help="assert that every skill, input and state field is exposed")
    parser.add_argument("--fields", default=DEFAULT_FIELDS, help="comma-separated words the state text must contain")
    parser.add_argument("--timeout", type=float, default=20.0, help="seconds per page load")
    try:
        ns = parser.parse_args(argv)
    except SystemExit as e:
        return None, f"bad arguments (exit {e.code})"
    parts = urllib.parse.urlsplit(ns.url)
    if parts.scheme not in ("http", "https") or not parts.netloc:
        return None, f"not an http(s) URL: {ns.url}"
    return ns, None


def version_tuple(text):
    """'1.49.1' -> ((1, 49, 1), None) or (None, 'error msg')."""
    parts = re.findall(r"\d+", str(text or ""))[:3]
    if not parts:
        return None, f"unreadable version: {text!r}"
    return tuple(int(p) for p in parts), None


def load_playwright():
    """-> (sync_playwright, None), or (None, 'error msg') when Playwright for Python is missing or too old."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None, f"Playwright for Python is not installed for {sys.executable} (pip install playwright, then python3 -m playwright install chromium)"
    try:
        from importlib.metadata import version
        have, err = version_tuple(version("playwright"))
    except Exception as e:  # metadata missing or unreadable
        have, err = None, str(e)
    if err:
        return None, f"could not read the Playwright version: {err}"
    if have < MIN_PLAYWRIGHT:
        need = ".".join(map(str, MIN_PLAYWRIGHT))
        return None, (f"Playwright {'.'.join(map(str, have))} is older than {need} and has no aria_snapshot "
                      f"(Playwright {need} needs Python 3.9 or newer; this is Python {sys.version.split()[0]})")
    return sync_playwright, None


def site_root(url):
    parts = urllib.parse.urlsplit(url)
    return f"{parts.scheme}://{parts.netloc}"


def fetch_tools(root, timeout):
    """The skill names from /openapi.json (operations tagged 'tools') -> (list, None) or (None, 'error msg')."""
    try:
        with urllib.request.urlopen(f"{root}/openapi.json", timeout=timeout) as res:
            spec = json.loads(res.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, ValueError) as e:
        return None, f"could not read {root}/openapi.json: {e}"
    tools = []
    for item in spec.get("paths", {}).values():
        for op in item.values():
            if isinstance(op, dict) and "tools" in op.get("tags", []) and op.get("operationId"):
                tools.append(op["operationId"])
    if not tools:
        return None, "openapi.json lists no operations tagged 'tools'"
    return tools, None


def open_play_page(page, url, timeout):
    """Load url; from the site root, tick 18+ and start a session like an agent would.
    -> ((play url, True if this call started the session), None) or (None, 'error msg')."""
    started = False
    try:
        page.goto(url, timeout=timeout * 1000)
        if "/play/" not in urllib.parse.urlsplit(page.url).path:
            started = True
            form = page.get_by_role("form", name="Get a bot")
            form.get_by_role("checkbox", name="I am 18 or older").check(timeout=timeout * 1000)
            form.get_by_role("button", name=re.compile(r"^Start a ")).click(timeout=timeout * 1000)
            page.wait_for_url(re.compile(r"/play/[A-Za-z0-9_-]+$"), timeout=timeout * 1000)
            # the bot joins in the background; reload until the status line says it is in the world
            for _ in range(int(timeout * 4)):
                if "joining the world" not in page.get_by_role("status").first.inner_text():
                    break
                page.wait_for_timeout(250)
                page.goto(page.url, timeout=timeout * 1000)
    except Exception as e:  # Playwright raises its own error types; report them as text
        return None, f"could not open the play page: {str(e).splitlines()[0]}"
    return (page.url, started), None


def end_session(page, timeout):
    """Press "End my session" -> (True, None) or (None, 'error msg')."""
    try:
        page.get_by_role("button", name="End my session").click(timeout=timeout * 1000)
        page.wait_for_load_state(timeout=timeout * 1000)
    except Exception as e:
        return None, f"could not end the session: {str(e).splitlines()[0]}"
    return True, None


def mask_tokens(text):
    """Shorten every /play/<token> to its first four characters: the token is the session's key."""
    return re.sub(r"(/play/[A-Za-z0-9_-]{4})[A-Za-z0-9_-]+", r"\1...", text)


def aria_tree(page):
    """-> (the page's accessibility tree as Playwright's aria snapshot text, None) or (None, 'error msg')."""
    try:
        return page.locator("body").aria_snapshot(), None
    except Exception as e:
        return None, f"could not take the accessibility snapshot: {str(e).splitlines()[0]}"


def has_node(tree, role, name):
    """True when the tree has a node of this role with exactly this accessible name."""
    pattern = rf"^\s*- '?{re.escape(role)} \"{re.escape(name)}\""
    return re.search(pattern, tree, re.MULTILINE) is not None


def check_tree(tree, tools, fields):
    """Assert what an agent needs is in the tree -> (summary, None) or (None, 'problems')."""
    problems = []
    for tool in tools:
        if not has_node(tree, "form", tool):
            problems.append(f'no form named "{tool}"')
        if not has_node(tree, "button", f"Run {tool}"):
            problems.append(f'no button "Run {tool}"')
    for name in ("Stop the current action", "End my session"):
        if not has_node(tree, "button", name):
            problems.append(f'no button "{name}"')
    if not has_node(tree, "link", "Check again"):
        problems.append('no link "Check again" (the page does not reload while idle)')
    for name in HEADINGS:
        if not has_node(tree, "heading", name):
            problems.append(f'no heading "{name}"')
    if not re.search(r"^\s*- status\b", tree, re.MULTILINE):
        problems.append("no status line (role=status)")
    unnamed = re.findall(rf"^\s*- '?(?:{CONTROL_ROLES})(?=$|:| \[)", tree, re.MULTILINE)
    if unnamed:
        problems.append(f"{len(unnamed)} control(s) without an accessible name: {', '.join(u.strip() for u in unnamed[:5])}")
    lower = tree.lower()
    missing = [f for f in fields if f.lower() not in lower]
    if missing:
        problems.append(f"state text lacks: {', '.join(missing)}")
    if problems:
        return None, "\n".join(f"- {p}" for p in problems)
    controls = len(re.findall(rf"^\s*- '?(?:{CONTROL_ROLES}) \"", tree, re.MULTILINE))
    return f"check passed: {len(tools)} skills as named forms with Run buttons, {controls} named controls, stop and end buttons, state fields {', '.join(fields)}", None


def snapshot(sync_playwright, url, timeout):
    """Run Chromium (JavaScript off) -> ((play url, tree), None) or (None, (exit code, 'error msg'))."""
    try:
        with sync_playwright() as p:
            try:
                browser = p.chromium.launch(headless=True)
            except Exception as e:
                return None, (EXIT_MISSING, f"Chromium for Playwright could not start (python3 -m playwright install chromium): {str(e).splitlines()[0]}")
            try:
                page = browser.new_context(java_script_enabled=False).new_page()
                opened, err = open_play_page(page, url, timeout)
                if err:
                    return None, (EXIT_FAIL, err)
                play_url, started = opened
                tree, err = aria_tree(page)
                if err:
                    return None, (EXIT_FAIL, err)
                if started:
                    _, err = end_session(page, timeout)
                    if err:
                        print(f"a11y_snapshot: {err}", file=sys.stderr)
                return (play_url, tree), None
            finally:
                browser.close()
    except Exception as e:
        return None, (EXIT_FAIL, f"browser error: {str(e).splitlines()[0]}")


def main(argv):
    ns, err = parse_args(argv)
    if err:
        print(f"a11y_snapshot: {err}", file=sys.stderr)
        return EXIT_USAGE
    sync_playwright, err = load_playwright()
    if err:
        print(f"a11y_snapshot: {err}. Nothing was checked.", file=sys.stderr)
        return EXIT_MISSING
    tools = []
    if ns.check:
        tools, err = fetch_tools(site_root(ns.url), ns.timeout)
        if err:
            print(f"a11y_snapshot: {err}", file=sys.stderr)
            return EXIT_FAIL
    result, err = snapshot(sync_playwright, ns.url, ns.timeout)
    if err:
        code, message = err
        print(f"a11y_snapshot: {message}", file=sys.stderr)
        return code
    play_url, tree = result
    print(f"# accessibility tree of {mask_tokens(play_url)}")
    print(mask_tokens(tree))
    if not ns.check:
        return EXIT_OK
    fields = [f.strip() for f in ns.fields.split(",") if f.strip()]
    summary, problems = check_tree(tree, tools, fields)
    if problems:
        print(f"# check FAILED:\n{problems}")
        return EXIT_FAIL
    print(f"# {summary}")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
