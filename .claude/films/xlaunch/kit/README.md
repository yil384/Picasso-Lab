# Local film renderer (macOS)

Renders the launch film on your own Mac's GPU in Chrome and saves an mp4 (H.264, 30 fps, silent AAC, ready for X).

Install or update, in Terminal:

    curl -fsSL https://raw.githubusercontent.com/yil384/Picasso-Lab/main/.claude/films/xlaunch/kit/get.sh | bash

It downloads about 120 MB into `~/PicassoFilmKit` and opens `render.html`. Later, double-click
`~/PicassoFilmKit/start.command` (or run it in Terminal) to open the renderer again.

- Draft (540 x 676) for a fast check, Final (1080 x 1350), or Final supersampled (drawn at 2160 x 2700).
- A frame range renders just a part (frames are 30 per second).
- Keep the tab in front while it renders. The file lands in Downloads.

Maintainers: after changing the film, run `python3 .claude/films/xlaunch/kit/build_kit.py` (needs the video-kit
worktree at ~/vk) to refresh `kit/assets`, the scene code and `manifest.txt`, then push to main.
