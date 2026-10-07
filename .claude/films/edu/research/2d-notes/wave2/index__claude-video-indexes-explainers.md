# Explainer subset of the curated Claude-video indexes (wave 2)

Sources read (text only, no media cloned; clones in scratchpad/anim2d/repos2/):
- athemeroy/awesome-claude-5-5-videos (= awesome-opus-5-5-videos, renamed; 468 stars). data/domain-style.csv = 1,401 SHA-distinct X videos classified by domain/style/opus_made; data/cases.csv = 168 reviewed cases; engagement refresh 2026-09-27; Oct-02/03 source reviews (157 new posts, many "Fable 5.5" claims).
- yihui-dev/awesome-opus5-5-videos (1,936 stars): data/videos.json, 475 entries with prompts; category "explainer" = 62.
- joeseesun/opus-video-prompts: 54 cases (cases.json, zh), 18 verbatim prompt files.
- zhuyansen/awesome-claude-video-skills: data/skills.json, 230 repos, kind "explainer" = 39.
- Views: I re-fetched X post views/likes for 374 candidate posts through the fxtwitter API on 2026-10-04 (post views, not video plays). Table: repos2/edu_ranked_all.tsv; raw: repos2/edu_fx.json.
- Frames looked at: athemeroy case thumbnails (one mid-video frame each, 480x270) -> frames2/index-edu/sheet{1,2,3}.jpg; X poster frames -> frames2/posters-{A,B}.jpg (many are blank first frames); Skillry posters (mid-video) -> frames2/skillry-sheet.jpg; close-ups frames2/picks-closeup.jpg. I did NOT watch any video in motion.

## Subset size
Classifier domain education_science (167) + data_viz (18) = 185 files; opus_made yes/likely and de-duplicated by post = 158 posts.
Primary style counts (158): motion_graphics_ui 63, 3d_render 25, flat_vector_cartoon 24, math_diagram 18, hand_drawn_sketch 15, pixel_art 6, paper_cutout_collage 4, generative_abstract 2, photoreal 1.

## Which styles win among the most-viewed
- Share of total views: 3d_render 51%, flat_vector_cartoon 25%, motion_graphics_ui 14%, hand_drawn 4%, math_diagram 4%. This is two outliers: RyanSael interactive lens lab (3.49M, a 3D app capture, not a film) and devteamdrew cosmos short (1.82M, flat cartoon mascot).
- Median views per post by primary style is the fairer signal: math_diagram 8.8k (n=18), hand_drawn_sketch 8.7k (n=15), 3d_render 2.7k (n=25), motion_graphics_ui 1.4k (n=63), flat_vector_cartoon 1.1k (n=24), pixel_art 247, paper_cutout 102 (n=4). Overall median 2,064.
  -> The most common look (dark/UI motion graphics, "animated web page") has a low median. Hand-drawn/whiteboard and clean math diagrams travel better.
- Duration: 35-70 s median 3.9k views; <35 s 1.05k; 70-180 s 1.9k; >180 s 1.5k.
- Vertical: 31 of 158 are vertical. Best vertical: lucian__03 Nvidia Blackwell GPU zoom 330k (3D, datacenter -> chip -> atom), deedydas IKEA 74k, hyuki crayon picture-book Pythagoras 36k, AxtonLiu talking-head -> line-art 34k.

## Ranked (Claude-made explainers, views on 2026-10-04)
1. RyanSael interactive lens lab 3.49M https://x.com/RyanSael/status/2102591147927654847 (3D app capture)
2. devteamdrew science/cosmos journey 1.82M https://x.com/devteamdrew/status/2102436464323661880 (flat cartoon mascot, "Made with @claudeai Opus 5.5")
3. konstantinsaifo take-apart Raptor engine 1.14M https://x.com/konstantinsaifo/status/2104094723887501736 (interactive Three.js)
4. DotCSV pixel-art neural net training 574k https://x.com/DotCSV/status/2102737776219168939
5. lucian__03 Nvidia GPU micro zoom (vertical) 330k https://x.com/lucian__03/status/2103494418477260830
6. addyosmani how browsers work 216k https://x.com/addyosmani/status/2103009037164110327
7. DotCSV 3D CNN 212k https://x.com/DotCSV/status/2102747527955050766
8. kimmonismus history of AI (Remotion, 7,400 lines) 200k https://x.com/kimmonismus/status/2102844654169575547
9. dotey 什么是 Transformer (12 min) 187k https://x.com/dotey/status/2103683057689522564
10. akokoi1 中华五千年 line art 162k https://x.com/akokoi1/status/2102583898865873225
11. akokoi1 大气环流 147k https://x.com/akokoi1/status/2102606609574941028
12. rege_dev cell-to-cosmos 134k; 13. bridgemindai AI timeline 133k; 14. Voxyz black-hole lab 125k
15. realYunfanYe Leidenfrost whiteboard 78k https://x.com/realYunfanYe/status/2103496245343916158
16. Ror_Fly Negroni 77k; 17. deedydas IKEA (vertical) 74k; 18. DotCSV diffusion 71k
19. superalesha history of Claude models 71k https://x.com/superalesha/status/2102463796149440888
20. emollick recursion 70k https://x.com/emollick/status/2103688362960019567
21. goodside pelican explains a shell pipeline 66k https://x.com/goodside/status/2103149526244618682
22. masahirochaen twin paradox paper cut-out (ja) 59k; 23. wolfie_ how LLMs work 51k; 24. Tz_2022 passkey (zh) 41k
LLM-systems topics specifically: dotey 187k, kimmonismus 200k, DotCSV 574k/71k, wolfie_ 51k, joaoli13 context window 31k, NFT_Chen token limits 28k, daniel_mac8 usage limits 27k, Hesamation C pointers 9k, arthurkatcher coding agent 0.4k, ParkerRex token bucket <0.1k.
Excluded: "imjustnewatai Human progress in one day" 351k is creator-attributed to Fable 5.5, not Opus.

## Verbatim prompts behind the best explainers
- dotey (187k): "帮我用js制作一个视频，主题是：什么是 Transformer / 要深入浅出，让高中生也能看得懂，不仅high level说的清楚，也要有细节，包括注意力机制，甚至一些数学概念 / 你可以用任何工具或者安装工具，可以联网检索 / 请给我惊喜"
- akokoi1 history (162k): "做一个动画，快速回顾中华五千年的历史。风格轻松有趣，动画格式为线稿，添加合适的音乐，请务必做到引人入胜"
- akokoi1 geography (147k): "做一个动画，讲解高中地理知识点“大气环流”。风格轻松有趣，动画格式为线稿，添加合适的音乐，请务必做到引人入胜，字幕用中英双语，解说用TTS，如果 TTS 接口有关闭水印的参数就关掉，文档在TTS.md，API KEY 和音色分别是 .env 里的 APIKEY 和 VOICE，最终视频要能直接导出。"
- emollick (70k): "A video explaining recursion, where every explanation about recursion has a radically different video style, make this self-referential & clever & fast moving."
- goodside (66k): "Create a 30s animated video with sythesized voice where an animated pelican on a unicycle explains the shell command `w | tail -n +3 | cut -d ' ' -f1 | sort -u` with visuals while juggling several fish." / (14k): "Create a 1 minute video where the right half explains the Black-Scholes formula with voiceover and visuals and the left half plays a generic knockoff of Subway Surfers"
- hyuki (36k, vertical): 「30秒くらいのピタゴラスの定理の解説動画をJavaScriptで作って（絵本風、クレヨン手書き風）」
- Tz_2022 (41k): "给我一个可互动交互动画页面，讲解清楚 password 和 passkey 到底有什么区别，也包括它们的历史沿革，把它制作成一个小白也能看懂的讲解视频"
- LinearUncle (23k): "请用Manim给我制作一个导数概念学习的视频，要求通俗易懂，并且有例子，引人思考。配音使用edge-tts"
- AxtonLiu (34k, vertical): "把 short-1.mp4 做成一条新的竖屏短片 short-1-v5.mp4：1. 我的人像缩小成右下角的圆形画中画，能看清我在讲话，不遮字幕。2. 主画面换成一段动画 B-roll，跟着我讲的内容走：我说到哪个概念，画面就画哪个概念。风格轻松有趣，线稿动画就可以，不要写实。3. 原声、原字幕、时长都不变。"
- AstroTheWizard photon (3.6k views, but the richest brief) - see AstroTheWizard__photon-journey.md.
- ParkerRex: "explain a token bucket rate limiter, canvas only, no libraries, every frame a pure function of time so my renderer can screenshot it."

## Chinese knowledge videos
akokoi1 (WY) is the clearest Chinese explainer voice: line art + a small ink-drop mascot, one-sentence prompts, and he says he is starting a Douyin account (Dou-gong vertical 27.7k). dotey's Transformer explainer is the most-viewed Chinese LLM explainer, but its frames are dark slides with matrices and captions. Tz_2022 / imShiWen passkey and sundyme GitHub are white or dark card decks with TTS. 0xpai_eth's inflation lesson reuses a recurring yellow character from his own 《小岛经济学》 series (the agent found the voice, subtitle rules and series style in his local project). ZhuiDao760 reposts a Douyin video (creator 骑老爷爷过马路被罚300), "全程Claude Opus5.5制作", 16k views. xRog3r (zh, 540 s) is an open-sourced pipeline tutorial: voice is the clock, numpy audio, 8-process headless Chrome, automated QA.

## Explainer skills in the zhuyansen index worth knowing
EverMind-AI/Raven git-story-film (5.1k stars, hand-drawn 2-min film), Alisa0808/vox-director (paper collage), adithya-s-k/manim_skill, runesleo/claude-video-kit (9:16 narrated explainer), Mr-funny/hbg-douyin-code-explainer-video (zh 9:16 HyperFrames, dialogue TTS, Whisper sync; Codex skill), hi-nikola/hand-drawn-explainer-video-nikola (zh hand-drawn, "怪诞小黑"; Codex skill, so not Claude-made). The two that produced viewed videos in this wave: arthurkatcher/explainer-video and alesha-pro/tools skills/hand-drawn-canvas-animation (see their notes).
