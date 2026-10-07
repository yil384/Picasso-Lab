# @PicassoLabUCSD launch video: version log

Every cut of the first X post, newest last. Watch them side by side: https://yil384.github.io/Picasso-Lab/social/x/versions/

## v1 - Photo reel (照片拼接视频) - 2026-10-02, 29 s

- File: `v1_photo_reel.mp4`
- How: Python + PIL：活动照片缓推加编辑式字幕，插入 ISCA 漫画开场和火锅短剧片段。脚本 social/x/reel.py（已删除，见 git 404e05a）。
- What: 29 秒近况集锦：ISCA 最佳论文、LightStim 资助、两位新博士、新成员、组里生活、火锅短剧、片尾卡。
- Feedback: “这个AI短剧做的有很多瑕疵……现在你所谓的这个4:5视频做的太垃圾了，还不如用three.js+q5.js逐帧做出来的漫画视频”
- Lesson: 照片加字幕的幻灯片显得平庸；AI 短剧瑕疵明显；而 lab 自己已有更强的风格（代码逐帧渲染的 3D 漫画）。

## v2 - ISCA Best Paper 3D comic (ISCA 最佳论文 3D 漫画) - 2026-10-02, 16 s

- File: `v2_isca_comic.mp4`
- How: three.js + NPR 漫画管线（video-kit），分支 video/x-launch，video-kit/films/xlaunch/xlaunch.html。
- What: 16 秒漫画：token 堵在 die 间链路（随机选专家），放大镜侦探找到规律，热门专家搬家，流量畅通，6.6× 加 ISCA 2026 最佳论文横幅。
- Feedback: “？我要的是介绍Picassolab的首支post，不是介绍best paper”
- Lesson: 理解错了需求：首帖要介绍 lab，而不是一篇论文。（这版留作以后单独发最佳论文。）

## v3 - Comic-page lab intro (漫画分格 lab 介绍) - 2026-10-02, 24 s

- File: `v3_comic_page_intro.mp4`
- How: Python + PIL 把四部项目漫画片、最佳论文片和合照排成漫画分格，配手写字。脚本 social/x/intro.py（已删除，见 git 069cead）。
- What: 24 秒：HELLO X! / we are PICASSO LAB，五个分格（Qubrio、TritonGym、TritonDFT、ChipMATE、最佳论文），合照，@PicassoLabUCSD。
- Feedback: “感觉还是太粗糙了……不够独特不够惊艳不够新奇也不够幽默诙谐，很平庸啊” / “做的不像是一个Lab的东西，和学术毫无关系啊”
- Lesson: 产品目录加转场就是幻灯片；卡通把学术内容藏起来了。应该用 lab 真实的学术产出来展示。

## v4 - Paper wall (论文墙（25 秒）) - 2026-10-02, 26 s

- File: `v4_paper_wall_25s.mp4`
- How: Python + PIL：136 篇论文首页（51 篇 arXiv 真实首页，其余按论文版式排版）。脚本 social/x/paperwall.py（git ee6c771）。
- What: 论文落下计数到 136，拼成 PICASSO，按会议叠成柱状图，落进 logo 三环，获奖论文盖奖章，合照，logo 加招生。
- Feedback: “做的有些粗糙……动画不够美观，整体太短了太干巴，不过大体方向是很好的，按照这个继续往下走吧”
- Lesson: 方向被认可：用 lab 的真实论文做主角。需要更长、更顺滑、细节更细。

## v5 - Paper wall, longer (论文墙（43 秒）) - 2026-10-02, 43 s

- File: `v5_paper_wall_43s.mp4`
- How: 同一脚本重写：加镜头推拉、飞行时的抬升阴影、错落飞行（git 81ba130）。
- What: 新增 2013–2026 按年份的成长曲线、三个研究方向各三篇代表作、最佳论文特写、资助方墙。
- Feedback: “还是有点粗糙……我想要那种手机发布会的概念机视频转场的那种惊奇感和酷感和丝滑感……参考‘何同学’”
- Lesson: 2D 合成做不出发布会那种景深、光影和匹配剪辑转场，需要真正的 3D 场景。

## v6 - Keynote-style 3D (3D 发布会风格) - 2026-10-02, 44 s

- File: `v6_keynote_3d.mp4`
- How: three.js（395 行）：深色影棚、聚光灯、阴影、景深和辉光、一镜到底；CPU 渲染 864×1080 再放大。分支 video/x-launch，video-kit/films/xkeynote/xkeynote.html。
- What: 聚光灯下的第一篇论文 → 时间螺旋到 136 → 成长曲线 → 地面上按会议的纸堆 → 三条原子轨道 → 获奖 → 合照 → logo。
- Feedback: “做的还是太粗糙了，真的用了three.js了吗？一看就设计代码量不够啊”
- Lesson: 零厚度纸片看起来像灰色方块；空间空荡；每个转场都是同一种插值；文字像幻灯片；CPU 渲染放大发软。下一步：先做成片质量的样张，再设计匹配剪辑转场，加运动模糊，原生分辨率渲染。

## v7 - Style frames (stills) (样张（静帧）) - 2026-10-02, 3 张静帧

- File: `v7_style_frame.jpg`
- How: three.js 新场景（分支 video/x-launch，video-kit/films/xstyle/xstyle.html）：带弯曲和纸纤维凹凸的纸面、面光源加轮廓光、带倒影的亮面地板、弧形影棚、2 倍超采样；排版补全页改为仿真正文。
- What: 三张成片质量的静帧：1 聚光灯下的第一篇论文（2013）；2 136 篇论文立成的长廊，最新在前、2013 在远处；3 结尾：三个玻璃圆环（logo）、文字、虚化的论文。
- Feedback: “可以可以，就要这个质感”
- Lesson: 先定质感再做动画：这三张通过后，才设计转场和镜头运动。

## v9 - Compute Not Included (不含算力（大佬预言 + 账单 + 实验室）) - 2026-10-03, 110 s

- File: `v9_compute_not_included.mp4`
- How: v7 影棚质感 + v8 的论文叙事（逐帧映射复用）+ 新镜头（分支 video/x-launch，video-kit/films/xfilm/film9.html；仓库 .claude/films/xlaunch/scene）。剧本由三版构思评审、挑刺、修改而来（STORYBOARD_v9.md），大佬原话逐句核对出处（QUOTES_v9.md）。角色为 Codex 生成的皮克斯风 3D（含 21 张成员重画），深度图浮雕 + 呼吸摆动；真实纸张扫描、真实印泥/笔迹素材。1080×1350，110 秒，2 秒一拍。
- What: 三张旧报纸剪报：马斯克、Amodei、Altman 的原话 → “*Compute not included.” → 账单从地缝吐出、流成小河，猫把它拖进发动机房 → 2013 一个博士生、一盏台灯 → 136 篇论文、年份、会议 → 三个方向给账单盖章（FASTER / CHEAPER / IN PROGRESS），只剩“数据搬运”没人盖 → 反转：最佳论文本身就是一次预测（Forecasting Data Movement）→ 奶茶 → 14 人点名 → Paper #137 和一把给你的椅子 → “*Milk tea included.”
- Feedback: （待反馈）
- Lesson: 先做 4 张风格帧再铺满全片；复用旧镜头靠逐帧映射，不重写；云端渲染每帧 3–8 秒、主要耗在 PNG 编码，Mac 本地渲染工具包（.claude/films/xlaunch/kit）可在 GPU 上快得多。
