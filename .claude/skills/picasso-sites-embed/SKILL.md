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
  verbatim from `blogs/blogs.html` (also in `projects/projects.html`, `events/events.html`): `push`, `replace`,
  `pop` (goes back one step only when the entry behind is ours), and an `onTraverse(view)` callback.
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

## Testing inside the real Sites page
- Load the live Sites page and **swap the embed for your local file**: route the Sites page request, `fetch()` it, and
  replace the `data-code="…"` attribute with `html.escape(local_html, quote=True)`. Route
  `https://yil384.github.io/Picasso-Lab/**` to your checkout so assets come from your working tree.
- Real Back-button behaviour needs Chrome's own path: load a tiny MV3 extension whose service worker calls
  `chrome.tabs.goBack(tabId)` (Playwright `launch_persistent_context(channel='chromium')` with `--load-extension`).
  `history.back()` from script and CDP `navigateToHistoryEntry` do NOT reproduce the blank-page bug.
  A ready-made harness: `video-kit/anime/tiga/test/harness.py` + `test/ext/` on branch `video-kit`.
- Google Sites is slow and flaky under routing: wait for `domcontentloaded` with retries, then poll for your embed's
  element; `networkidle` never arrives (analytics pings).
- **Never write to production Firebase / Supabase in tests.** Stub `https://www.gstatic.com/firebasejs/**` with the
  stubs in `guandan-kit/harness/` (branch `guandan-cloud`: `fb-stub-app.js`, `mustkeep.DB_STUB`) and abort
  `*firebaseio.com*` / `*supabase.co*`.
- Screenshots as JPEG (quality ≤ 80), one browser at a time, close it in `finally` — the Mac's disk is nearly full.

## House rules that apply everywhere
- No emoji in the pages; use the professional SVG icon sprite (IconPark / Simple Icons) already in `events/events.html`.
- `guandan-kit/` (Tencent reference images) must never reach `main` — GitHub Pages would publish it.
- Never touch the user's uncommitted local files `people/haotian_shen.html` and `people/yufei_cats.html`.
- Commit messages end with the co-author line given in the session.
