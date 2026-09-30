---
name: picasso-sites-embed
description: How the Picasso Lab website (yufeiding.ucsd.edu, Google Sites) runs the pages in this repo as pasted "embed code", and the rules that follow — absolute asset URLs, re-paste to deploy, no history entries in the embed (the nav-frame pattern), sandbox limits, swallowed # links, wiped storage, and how to test inside the real Sites page. Use before changing or adding anything that runs on a Sites page (events, projects, blogs, pub, teaching, people, home), or when something works on GitHub Pages but breaks on the live site.
---

# Picasso Lab pages inside Google Sites

The public site **https://yufeiding.ucsd.edu** is Google Sites. Most section pages are not native Sites content:
the whole HTML file from this repo (`events/events.html`, `projects/projects.html`, `blogs/blogs.html`,
`pub/pub.html`, `teaching/teaching.html`, the people snippets, …) is pasted into a Sites **embed-code** block.
GitHub Pages (**https://yil384.github.io/Picasso-Lab/**, branch `main`) serves every asset those pages load, plus
standalone pages such as `events/guandan.html` and `blogs/nvidia-ising/`.

## Deploying
- **Assets** (images, video, JS/CSS files loaded by URL) replaced in place under the same name go live when `main`
  is pushed (GitHub Pages build ~1 min, CDN cache up to 10 min; check with
  `gh api repos/yil384/Picasso-Lab/pages/builds/latest`).
- **Any change to a pasted HTML file** only goes live after the user re-pastes it into the Sites block and clicks
  **Publish**. Give them the command: `! pbcopy < <path>/events/events.html`, and say which Sites page it is.
- Verify a re-paste by fetching the live page and comparing the embed with the repo file:
  the embed is HTML-escaped in a `data-code="…"` attribute of the Sites page HTML
  (`html.unescape` it and compare after normalising line endings).
- Every URL inside a pasted file must be **absolute** (`https://yil384.github.io/Picasso-Lab/...`); relative paths
  resolve against Google's sandbox origin and silently 404.
- In a cloud session: push your own branch only, never `main`; the user (or a local session) merges and deploys.

## What the embed runtime does (verified by reading Google's `inner-frame-minified.html`)
- The pasted code is **written with `document.write` into an `about:blank` iframe** (`#userHtmlFrame`) inside a **sandboxed**
  frame on a random `NNNN-atari-embeds.googleusercontent.com` origin (a new random origin on every load).
- **Never create history entries in the embed document** (`history.pushState`, or navigating the embed frame
  itself). Chrome restores such an entry as a fresh `about:blank`: swipe-back / Back shows an empty page under the
  Sites nav bar. `replaceState` does not rescue it.
- **Back/forward for in-page views = the nav-frame pattern.** Keep the view state in the fragment of a tiny hidden
  iframe (`https://yil384.github.io/Picasso-Lab/nav-frame.html`, it posts `{picassoNav: hash}` to its parent);
  opening a view navigates that frame (one entry), Back moves only that frame. Copy the `createNavHistory` helper
  verbatim from `blogs/blogs.html`: `push`, `replace`, `pop(view, steps = 1)` and an `onTraverse(view)` callback.
  It keeps a stack of its own entries: `pop` goes back `steps` entries (`history.go(-steps)`) only when they are all
  ours, otherwise it replaces the current entry with `view`. The frame's report of the entry a pop lands on is
  swallowed even when it comes late (up to 3000 ms; echoes arrive ~1 s late while a film is running), so it can
  never undo what the visitor did since; any other report is the visitor traversing and goes to `onTraverse`.
  `projects/projects.html` and `events/events.html` still carry the older one-step version (`depth` counter, the
  pop landing reaches `onTraverse`), which is enough for their single-level views; use the blogs one for new work.
- The embed and everything inside it are **sandboxed without allow-top-navigation**: a frame may only move history
  for frames in its own subtree, so `history.back()` from a child iframe is silently ignored when the step would also
  move a sibling. Call it from the embed document.
- **Iframes you create:** create a fresh iframe per view (its first navigation replaces the blank frame — no entry);
  navigate helper frames with `contentWindow.location.replace`; don't move an iframe in the DOM (it reloads).
  A frame kept behind an overlay must be `opacity:0; pointer-events:none`, not `visibility:hidden`/`display:none`
  (hidden frames are throttled and may never paint or report ready), and it must not focus itself on load
  (it would steal the keyboard from the page).
- Google injects `<base target="_blank">` and a **capture-phase click handler that swallows every
  `<a href="#…">` click** (preventDefault + stopPropagation; for existing ids it also pushState's — see above).
  Handle such links from a `window` capture listener, or don't use `#` hrefs.
- Google runs **`localStorage.clear()` on every load** and the origin is random per load: browser storage never
  persists in an embed. Persist through a GitHub-Pages iframe (storage partitioned under the Sites top level) if needed.
- `position: fixed; inset: 0` covers the embed box (the visible embed area), not the whole Sites page.
- The embed document has no doctype of its own, so it runs in **quirks mode** (`document.compatMode ===
  'BackCompat'`): `documentElement.clientHeight` is the whole document, so read the viewport size from
  `document.body` there (`innerWidth`/`innerHeight` as the fallback). `overflow` on `body` makes body the scroll
  box and breaks `position: sticky`.
- Google's own (i) button sits over every embed, 12-60 px from the left and 12-64 px from the bottom: keep inputs
  and buttons out of that corner.

## Testing inside the real Sites page
- Load the live Sites page and **swap the embed for your local file**: route the Sites page request, `fetch()` it, and
  replace the `data-code="…"` attribute with `html.escape(local_html, quote=True)`. Route
  `https://yil384.github.io/Picasso-Lab/**` to your checkout so assets come from your working tree.
  `.claude/skills/picasso-avatar-fx/test/harness.js` does all of this: `open({ width, height, swaps: { '<text only
  in the live embed>': '<local file>' } })`, then `gotoSites(page, 'https://yufeiding.ucsd.edu/<page>')`, then find
  the `about:blank` frame holding your element.
- Real Back-button behaviour needs Chrome's own path: load a tiny MV3 extension whose service worker calls
  `chrome.tabs.goBack(tabId)` (Playwright `launch_persistent_context(channel='chromium')` with `--load-extension`).
  `history.back()` from script and CDP `navigateToHistoryEntry` do NOT reproduce the blank-page bug.
  A ready-made harness: `video-kit/anime/tiga/test/harness.py` + `test/ext/` on branch `video-kit`.
- Google Sites is slow and flaky under routing: wait for `domcontentloaded` with retries, then poll for your embed's
  element; `networkidle` never arrives (analytics pings).
- In a cloud container (outbound traffic through a proxy) route every request through Playwright's
  `route.fetch()` with retries and cache the responses on disk: Chromium's own network stack gives up with
  `ERR_TOO_MANY_RETRIES`. Chrome's device emulation does not reach the cross-origin embed unless you launch with
  `--disable-site-isolation-trials --disable-features=IsolateOrigins,site-per-process`, and a host test page needs
  a viewport meta or phone layouts come out zoomed.
- **Never write to production Firebase / Supabase in tests.** Stub `https://www.gstatic.com/firebasejs/**` with the
  stubs in `guandan-kit/harness/` (branch `guandan-cloud`: `fb-stub-app.js`, `mustkeep.DB_STUB`) and abort
  `*firebaseio.com*` / `*supabase.co*`.
- Screenshots as JPEG (quality ≤ 80), one browser at a time, close it in `finally` — the Mac's disk is nearly full.

## House rules that apply everywhere
- No emoji in the pages; use the professional SVG icon sprite (IconPark / Simple Icons) already in `events/events.html`.
- `guandan-kit/` (Tencent reference images) must never reach `main` — GitHub Pages would publish it.
- Never touch the user's uncommitted local files `people/haotian_shen.html` and `people/yufei_cats.html`.
- Commit messages end with the co-author line given in the session.
