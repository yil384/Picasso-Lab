# Guandan redesign — handoff to a cloud session (read this first)

You are a Claude Code session with **no prior context**, taking over a large redesign that is ~80% done. Read this file, then
`SPEC.md` (the binding design spec), then `refs/README.md` + `refs/research-tencent.md`, then run `refs/fetch_refs.sh` and LOOK at the
reference screenshots. Then finish the job.

## 1. What this is
`events/guandan.html` is the Picasso Lab's real-time multiplayer Guandan (掼蛋) card game (Firebase Realtime Database, AI seats, rooms,
tribute, levels), reached as an easter egg from the lab's events page. Lab members really play it. The user asked for a **1:1 replica of
Tencent's professional Guandan UI** (腾讯掼蛋 / 大掼蛋 2026) while **keeping every easter egg and all lab personalization**.

What the user said (verbatim, Chinese): "现在这个 guandan.html 还是没优化到我想要的样子，彩蛋和实验室个性化是够了，这是值得表扬和保留的，但是
其他最基础的功能部分和UI设计还是有很大的问题，看着一点也不专业，好好重构优化" · "我说了除了我之前做的那些实验室个性化之外，我想要1:1复刻腾讯的
专业设计的惯蛋游戏" · "好好优化，不要糊弄" (do it properly, don't cut corners). Earlier versions were rejected as "AI味 / 不专业".

## 2. Where the work stands (all in git)
| branch | content |
|---|---|
| `gd2/integrate` | merge of the first three tracks (table core, lobby+room, records+eggs) on top of the design-system foundation and the Web-Worker AI engine. This branch (`guandan-cloud`) = `gd2/integrate` + this kit. |
| `gd3/table` | 10 commits on top of `gd2/integrate`: hand columns always show the whole index; 提示 works on the first press (touch and mouse) + 40 px taps; 进贡/还贡 finish inside the deal window; 提示 package precomputed; bomb tiers, finish ribbons, gold display words; Tencent round/match result screens; 巅峰对决 VS intro once per match start; my played cards lift out over the hand; 首出 ends with the sorting window. |
| `gd3/lobby` | 12 commits on top of `gd2/integrate`: 解散房间 confirms + tells guests; exact labmate matching; loading feedback on every Firebase wait; ↩ and the picasso exit give the seat back; host hand-off to a human with "房主已离开，你成为房主"; type hint never covers popups, results, the hand or played cards; English layout fixes; invite without clipboard shows 房间号. |

Neither `gd3/*` branch was independently reviewed yet (the review run was cut off by a usage limit). `open-issues.json` lists the
high/medium issues the previous reviewers found **before** those commits — many are probably fixed now; verify each one.

## 3. Your job, in order
1. `git fetch origin && git checkout guandan-cloud` (you are probably already on it). Merge `origin/gd3/table` and `origin/gd3/lobby`
   into it; resolve conflicts by understanding both sides (table track owns `renderTable` and table code; lobby track owns
   lobby/room/records/transition code — SPEC §4.1). Parse-check the module script and play a full round before going further.
2. Set up the harness (`harness/`, see §5) and play: full rounds vs AI into round 2 (tribute) at all five SPEC viewports, touch and mouse.
3. Review the merged game with four strict lenses (write each round into `guandan-kit/REVIEW.md` with screenshot evidence):
   - **Tencent fidelity**: every screen side by side with the references (lobby, room, table states, moments, results, 巅峰对决) at
     844×390 and 1440×900 (+390×844 rotated portrait and 1024×640). Score 0–10 per screen; ≥ 8 needed.
   - **Gameplay QA**: complete games (host, non-host and spectator via state injection), rejoin by reload mid-round, timers/timeouts,
     tribute and 抗贡, A-challenge and game over (inject states), hint/play/pass legality, zero console errors, no long tasks.
   - **AI-tell hunter**: anything that still looks AI-generated, web-page-like, amateur, over-explained or inconsistent (copy, icons,
     spacing, animation, English mode).
   - **Must-keep**: every item of SPEC §1 still works (labmate J/Q/K/A portraits, seat photos, 巅峰对决 data identical, the "picasso"
     return transition + hint on every screen incl. the rotated table, BGM, events.html egg/mvp flows).
4. Fix every high/medium finding (and cheap lows), re-verify, repeat — **at least three review → fix rounds**, until every screen scores
   ≥ 8 and nothing high/medium remains.
5. Finally merge `origin/main` into your branch (main has moved: visitor map, people pages, new events cards) — keep main's versions of
   non-Guandan files — re-run a full round, and push.

## 4. Rules
- UI only: Firebase schema, game rules, the AI engine (`events/static/guandan-engine.js`, `guandan-ai-worker.js`) must not change behaviour.
- Absolute asset URLs `https://yil384.github.io/Picasso-Lab/...` (the page is embedded via Google Sites).
- **Push only to `guandan-cloud`. Never push to `main`** — the lab lead reviews and deploys (main deploys straight to production).
- Never commit screenshots or the Tencent reference images (copyrighted; `refs/img/` is git-ignored).
- Commit early and often with clear messages; the session may be interrupted.

## 5. Environment
- Setup (claude.ai/code environment setup script, or run once in the session):
  ```bash
  apt-get update -y && apt-get install -y fonts-noto-cjk fonts-noto-color-emoji
  python3 -m pip install --break-system-packages --quiet playwright pillow
  python3 -m playwright install --with-deps chromium
  ```
- Network: the page loads Google Fonts (fonts.googleapis.com, fonts.gstatic.com) and a font from cdn.jsdelivr.net, and the reference
  script downloads from news.yxrb.net, game.gtimg.cn, play-lh.googleusercontent.com, qqgame.qq.com and is1-ssl.mzstatic.com — use network
  access **Full**, or **Custom** with those domains. Without fonts the screenshots will not be comparable.
- Harness: `python3 guandan-kit/harness/play.py desk|phone` serves `https://yil384.github.io/Picasso-Lab/**` from this checkout and stubs
  Firebase in memory (`window.__fbStore`, `__fbSet`, `__fbGet`) — it never touches the production database. `#play-btn` is
  soft-disabled with `aria-disabled="true"` (so a tap can toast "牌型不符"); check aria-disabled, not `.disabled`. Test touch with real touch
  events (Playwright `page.tap` in an `is_mobile` + `has_touch` context), not only mouse clicks. Inject rare states with `__fbSet`.

## 6. Finish
Push `guandan-cloud` and end with a report: what you merged/changed (commit list), the final review scores per screen, how each item of
`open-issues.json` ended up, what's left, and the exact commands you used to verify.
