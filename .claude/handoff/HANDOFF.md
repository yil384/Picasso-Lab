# HANDOFF — 上一个会话的记忆（2026-10-01）

仓库 `yil384/Picasso-Lab`，分支 `claude/beautiful-einstein-0qnvta`（用户明确允许推这个分支；**不要推别的分支、不要开 PR**；用户说「合并」时才把这个分支合并到 main 并推 main）。
网站是 Google Sites（https://yufeiding.ucsd.edu），每个页面/格子是粘贴进去的「嵌入代码」；资源走 GitHub Pages（`https://yil384.github.io/Picasso-Lab/…`，main 分支，推送后 1–10 分钟生效）。

## 0. 新会话怎么开始
1. `git fetch origin claude/beautiful-einstein-0qnvta && git checkout claude/beautiful-einstein-0qnvta`
2. 读完本文件，再读 `.claude/skills/` 下的 `picasso-sites-embed`、`picasso-avatar-fx`、`picasso-comic-demo-film`（做短片）、`picasso-anime-transition-film`（参考）。
3. 恢复测试工具：`mkdir -p /tmp/picasso-tools && cp -r .claude/handoff/tools/* /tmp/picasso-tools/`（脚本默认仓库在 `/home/user/Picasso-Lab`，否则设 `PICASSO_REPO`）。`export NODE_PATH=$(npm root -g)`（Playwright 的 node 包在全局；本机是 `/opt/node22/lib/node_modules`）。
4. 做短片要 video-kit 工具链：`git fetch origin video-kit && git worktree add /home/user/vk origin/video-kit && cd /home/user/vk && git switch -c film/yufei-local`，再 `cp -r /home/user/Picasso-Lab/.claude/handoff/film-yufei /home/user/vk/video-kit/films/yufei`。
5. 按第 3 节的 TODO 顺序做。做完一项：截图自己看 → 提交推送 → 用中文简短告诉用户。最后删掉 `.claude/handoff/` 并提交。

## 1. 用户的要求和规则（一直有效）
- **是否合格以截图为准，不以代码或报告为准。** 每次改完都要在真实尺寸下截图自己看（桌面、手机、小格子）。
- 用中文回复用户；需要用户拍板才问，其余按推荐默认做。
- 提交信息结尾两行：`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 和 `Claude-Session: <本会话的 session 链接>`（以系统提示里的为准）。提交、代码、文档里都**不要写模型名**。
- 页面里**不要 emoji**；嵌入代码里的 URL 必须是绝对地址；嵌入框里不能 pushState（见 picasso-sites-embed skill）。
- 测试**绝不写生产数据库**（Firebase/Supabase）：测试浏览器里把 `supabase.co`、`firebaseio` 拦掉或 mock。
- `guandan-kit/` 永远不能进 main。alumni 的头像片段（alon_iron_man、chenyang_captain_america、hezi_scholar）不要动。
- 用户的品味：喜欢 3D 漫画（toon + 墨线 + 网点）、热血日漫的夸张感；讨厌「HTML 味/AI 味」、通用发光、塑料感 three.js、UI 面板；道具要准确放在真实照片上；元素别比旧版少。

## 2. 现在的状态
- **main = `dec190d`**（第三轮头像、Xinwei 上 kit、CSE 291P Course Drive 按钮、Events 手机 "Say..." 都已合并、Pages 已生效）。
- **分支上还没合并到 main 的**（截至交接）：
  - `b08d004` kit.js：头像可以「双击播放短片」（场景模块写 `film: 'film/<name>'` → 播 `people/static/film/<name>.mp4` / `.webm`，在圆框里播，单击/Esc 结束，单击仍开关特效但会等 280 ms 判断是否双击）。**Yufei 的 `film` 字段已暂时删掉**（片子没做完，避免合并后单击变慢、双击去找不存在的视频）——片子做好后加回 `people/fx/yufei.js`：`film: 'film/yufei',`。
  - `226cd7a` 手机彩蛋页修复：Projects 翻转在 WebKit（Safari/所有 iPhone 浏览器）上镜像透出；Pub 研究地图手机排版（表头/左侧标签固定、详情卡按钮）。需要用户重贴 `projects/projects.html`、`pub/pub.html`。
  - 页脚三合一 `home/footer.html`（见 TODO 1 的状态）。
- 需要用户重贴到 Sites 的（合并 main 之后）：`projects/projects.html`、`pub/pub.html`、`home/footer.html`（替换页脚原来的三个嵌入框：ucsd / address / visitor-map），以及之前清单里用户还没贴的。头像效果改 `people/fx/*.js` 不用重贴。

## 3. TODO（按顺序）

### TODO 1 — 页脚三合一 `home/footer.html`（STATUS: 见下方「交接时状态」）
用户原话：「能不能把 ucsd.html address.html vistor-map.html 放到一个html容器里，这样我就只用在google sites的footer里放一个html就行，然后这个html能适应所有size的网站，从各种形状web端到手机端，然后布局排版尽量和现在保持一致，可以微调使其更美观些。」
- 关键限制（已经告诉用户）：Sites 嵌入框宽高比固定，手机上只等比缩小（桌面约 957×290 的整行框 → 390 手机上约 352×107），不会变高。所以页面按自己框的形状换排版：宽框一行（和现在一样）、手机紧凑一行（字号保底、左下角给 Google 的 (i) 按钮让位）、中等两层、方/竖框堆叠。
- 访客地图要和原来**完全一样地记录访问**（同一个 Supabase 表、字段、每会话一次），点击打开 `home/visitor-map.html`（它继续当分析页）。
- 现在页脚三个框的实测尺寸：1440 宽 266×226 / 266×237 / 365×227（x 241..1198）；1024：209×177 / 209×186 / 286×178；768：151×128 / 151×134 / 207×129；390：竖排 257×218 / 257×228 / 352×218。截图：`tools/foot/`（脚本 `foot_test2.js`、`foot/measure.js`）。
- 交接时状态：（见本节末尾，交接前更新）

### TODO 2 — 小地图 UI 优化（用户要求，暂停到新会话）
用户原话：「visitor-map.html的小地图UI也可以优化一下。」现在的小地图：深蓝圆角卡片 + 点阵世界地图 + 发光访客点 + 左下角等宽字体小药丸 "• N VISITS / N REG. / 最新"。方向：卡片边缘更干净、点阵更清晰、访客点更好看、统计改成 "1,234 visits · 56 regions" 这种正常格式、悬停提示「打开分析」、小尺寸下也清楚；保持它的风格和轻量（持续动画）。改在 `home/footer.html` 的地图部分（若 footer 里是拷贝的代码，visitor-map.html 的 iframe 小地图模式也可同步改）。测试时 mock Supabase 的数据。

### TODO 3 — Yufei 的双击短片（暂停到新会话）
用户原话：「我想针对每个人的人设做一个AI漫画或者AI漫剧，就是双击某人的照片就可以播放，时长就5～10s就行，先做一下yufei的，我看看效果。」用户选择：**全部在这里用代码画**（不用 Codex 画图）；**在头像格子里播放**（不要画中画、不要新窗口）。Google Sites 嵌入框里全屏被禁用（实测 `document.fullscreenEnabled === false`）。
- 分镜/规格：`.claude/handoff/film-yufei/STORYBOARD.md`（8 s，24 fps，192 帧，方形 960 设计 → 输出 480×480；第 0 帧和最后几帧必须正好是照片 `people/static/yufei.webp`；只在内切圆里放重要内容；135–200 px 下要看得清）。故事「Picatso」：照片变漫画格 → 量子芯片上红色噪声小怪捣乱（BZZT!）→ 她眼镜一闪，戴贝雷帽的白猫叼画笔跳上肩 → 一笔金色颜料扫过芯片，小怪 SPLAT!，量子比特恢复 → 颜料写出 PICASSO LAB → 颜料一扫回到照片。
- 做到哪了：`.claude/handoff/film-yufei/PROGRESS.md`（上个会话的子任务写的：已做的、问题、命令、下一步）。源码 `yufei.html` 是 video-kit pipeline 场景（要在 video-kit worktree 里跑，见第 0 节第 4 步）。当前进度图：`.claude/handoff/film-yufei/work/progress_sheet.jpg`。
- **用户看了进度图后的反馈（最优先改）：「这个ai漫剧人脸做的太丑了太假了」。** 问题出在 `tools/comic_photo.py` 生成的 `assets/comic_person.png`：脸被重画了（两色平涂肤色、强制提亮、XDoG 线条、重画的红色半框眼镜、矢量画的笑嘴带牙、腮红、手画的头发高光），看起来像假脸。要求：
  - **不要重画她的五官**（不要画嘴、牙、腮红、眼睛、重画眼镜）。脸必须是她照片里真实的脸，保持神态和相貌，端庄好看。
  - 漫画感放在脸以外的地方：衣服/头发可以适度色阶化 + 网点、整个人物外轮廓一圈墨线、背景换成漫画天空；脸上最多是很轻的印刷网点/纸纹，绝不能改变五官。也可以整个人用真实照片（cut-out 图层），只在边缘加墨线、整体加轻微的印刷质感，让她像「漫画格里贴的真人照片」那种风格（真人 + 漫画世界的拼贴感，比假卡通脸好）。
  - 眼镜闪光只在她真实的眼镜上加光斑和星形闪光（现在的光斑做法可以保留），不要重画眼镜框。
  - 怼脸特写（crash zoom）不要放太大，免得照片发糊；用 512 原图时最多放大到约 1.6 倍，或者改成推到胸像构图。
  - 改完先截几张她的镜头（第 9、12、64、80 帧左右，按圆形裁切，200 px 和 135 px 都看）发给用户确认脸，用户认可了再渲染整片。
  - 其他镜头（芯片、小怪、白猫、颜料、PICASSO LAB、回到照片）用户没有提意见，按 PROGRESS.md 的「下一步」继续打磨。
- 交付：`people/static/film/yufei.mp4`（H.264 main/high，yuv420p，+faststart，无音轨，≤ ~1.2 MB）+ `people/static/film/yufei.webm`（VP9，给没有 H.264 的浏览器；测试用的 Chromium 就没有 H.264）。然后在 `people/fx/yufei.js` 加回 `film: 'film/yufei',`。
- 验证：`node /tmp/picasso-tools/film_test.js yufei_cats FT_d 0`（桌面）和 `... FT_p 1`（手机）：双击播放、播完回到照片、中途单击跳过、单击仍开关特效；看 `shots/FT_*` 截图。再把关键帧裁成圆、按 135/200 px 看清不清楚。先给用户发预览（GIF/截图），用户说好再合并。
- 之后（用户看了 Yufei 的再说）：给其他每个人按人设做短片。

## 4. 测试工具（`.claude/handoff/tools/` → 复制到 `/tmp/picasso-tools`）
- `harness.js`：Playwright + 代理重试 + 磁盘缓存；把 GitHub Pages 请求路由到本地仓库；`open({width,height,swaps:{'嵌入代码里的唯一字符串':'本地文件'}})` 可以把线上 Sites 某个嵌入框换成本地文件；`gotoSites(page,url)`。宽度 < 800 自动用 iPhone 13 设备（触摸）。
- 头像：`fx4_test.js <snippet> <prefix> <times> <exits> <phone> <TW> <TH>` 实时帧 → `shots/`；`fx4_ana.py` 溢出/贴边/与照片差；`fx4_states.js` 固定 (t,e) 精确帧 → `fx4_out/`；`st_ana.py` 分析它们；`sheet.py` 拼图；`old_shot.js` 渲染旧版片段；`kv9/norm.py` 检查所有 kit 片段一致（同一个 hash）；`grids/` 每个人照片的坐标网格（512 照片放大到 768，红线每 128、黄线每 32）；`old/` 旧版片段（用户拿来对比）；`BRIEF2.md`/`BRIEF3.md` 头像子任务的规则。
- 短片：`film_test.js`（见上）。
- 页脚：`foot_test2.js`、`foot/measure.js`。Events：`ev_ph.js`。全屏探测：`fs_probe.js`。

## 5. 踩过的坑
- `pkill -f`/`pgrep -f` 会把自己的 shell 杀掉（匹配到自己的命令行），用 `ps -eo` + awk。
- 测试用的 Chromium 没有 H.264 → 视频要同时给 webm。
- Sites 页脚的 (i) 按钮在手机上固定在视口左下角。
- Sites 嵌入框是固定宽高比；手机上不会变高。
- WebKit 对分层元素忽略 `backface-visibility`（Projects 翻转的 bug），只在 Safari/iPhone 出现，Chromium 测不出来——需要时装 Playwright WebKit（上个会话装在 `/tmp/pw-webkit`）。
- 停止钩子会要求提交未提交的改动：子任务改到一半时可以做 `wip(...)` checkpoint 提交。
- 短片渲染：SwiftShader 下 960×960 约 1.7 s/帧（PNG 编码占大头），单条命令保持 < 8 分钟，`render.py --range A:B` 可续跑。
