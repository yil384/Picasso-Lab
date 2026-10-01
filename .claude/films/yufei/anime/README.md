# Yufei's anime short (double-click on her Team-page avatar)

- `art/`: the painted images (ChatGPT image generation from `art/y_ref.png`, the approved chibi design; prompts in
  the chat history: one style paragraph + one line per image, poses / cat / gremlins on flat #00FF00).
- `tools/key.py`: keys the green sprites into `cut/` (generated, not committed); the gremlins sheet is split into
  `cut/grem0-2.png` by connected components (see the commit that added it).
- `film/anime.html` (+ `lib2d.js`): the 8 s scene for the video-kit pipeline (branch `video-kit`). To render: copy
  `film/` to `video-kit/films/yufei_anime/`, put `cut/*.png`, `art/bg_*.png`, `photo_full.png`, `comic_sky.png`,
  `comic_palm.png` into its `assets/`, then
  `cd video-kit/pipeline && python3 ../films/yufei_anime/tools/pv.py render ../films/yufei_anime/anime.html --out ../out/yufei_anime/r960 --width 960 --height 960 --workers 2 --store png`
  and encode to 480 (mp4 H.264 + webm VP9) -> `people/static/film/yufei.{mp4,webm}`.
