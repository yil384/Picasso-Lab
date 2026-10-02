# Picasso Lab website (yufeiding.ucsd.edu)

The public site is Google Sites; most section pages are HTML files from this repo pasted into Sites "embed code"
blocks, and GitHub Pages (https://yil384.github.io/Picasso-Lab/, branch `main`) serves every asset they load.
Read the matching skill in `.claude/skills/` before touching an area:

| Area | Skill |
| --- | --- |
| anything that runs on a Sites page, deploying, testing in the real page, search indexing | `picasso-sites-embed` |
| the footer (seal, address, WebGL visitor globe) | `picasso-footer-globe` |
| Team-page avatar effects (`people/`, `people/fx/`) | `picasso-avatar-fx` |
| page-to-page anime transition films, comic splashes | `picasso-anime-transition-film` |
| the Projects card films | `picasso-comic-demo-film` |

The X account kit is `social/x/` (`kit.html`); every cut of the launch video is archived in `social/x/versions/` with
its feedback and lesson (add the mp4 + poster, add an entry to `make_index.py`, run it).

Film sources and notes live in `.claude/films/` (Yufei's avatar short: `.claude/films/yufei/anime/README.md`).

## Working with the user
- Reply in Chinese. Show results as screenshots; "合格" is judged by the screenshots, at desktop and phone sizes.
- After every finished change: commit, merge the working branch into `main` (`--no-ff`) and push both - no need to
  ask (standing instruction). No pull requests unless asked.
- End each round with the list of files the user must re-paste into Google Sites (pasted HTML only changes on re-paste).
- The user is picky about craft: if something looks rough, generic or "AI-ish", rethink it rather than tweak it.
  Prefer real assets (photos, textures, painted art) over procedural approximations, but keep pages light to load.
- When art is needed that code cannot make well, never draw it with code primitives (rejected every time). Generate it
  with Codex's image tool: in a cloud session install `@openai/codex`, start `codex login --device-auth` in the
  background and give the user the URL + one-time code (they enter it within 15 min); then `codex exec` as in
  `.claude/films/yufei/anime/gen.sh` (green #00FF00 background for sprites, then key them). If no login is possible,
  hand the user ready-to-use prompts for ChatGPT and they push the images to the repo.

## House rules
- No emoji in pages; embed URLs absolute; no `history.pushState` in an embed (use the nav-frame pattern).
- Tests never write production Firebase / Supabase (mock or abort `supabase.co`, `firebaseio`).
- `guandan-kit/` never goes to `main`. Leave the alumni avatar snippets (`alon_iron_man`, `chenyang_captain_america`,
  `hezi_scholar`) alone.
- Never put model names in commits, code or pages.
