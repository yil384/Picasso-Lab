# Strata x 《混乱背后的规律》：线稿全片脚本，定稿（line_full，3:27）

> 2026-10-05 · 用户在三样式比稿里选了**线稿**（akokoi1 式：暖白纸、黑墨线条自己画出来、红笔批注、手写标签）。
> 开头 17.5 s 已做好（`../bakeoff/line/`），本稿把它扩成全片。本版吸收了 `FACTCHECK.md`（全部事实修正）、`OUTSIDER.md`
> （外行试读）、`RETENTION.md`（留存编辑）；没采纳的意见和原因在 §11。旁白逐句在 `vo_lines.json`，时钟在 `timeline.json`
> （cue 名与 §4 一致），新画稿在 `ART.md`，出图脚本 `art_batch.sh`（Codex 限流，未运行）。
> 时间都来自 edge-tts 临时配音（`--rate +4%`）的逐词时间，`mix.py vo` 排过：EN、ZH 都没有被压速，相邻两句至少隔 0.49 s。

## 0 一页说明

### 0.1 这条片子讲什么
- **热点**：Strata（github.com/Niko1221/Strata，MIT，免费开源）把 1250 亿参数的千问 Qwen3.8-Flash-Next 跑在一台游戏电脑上。
  Hacker News 帖子 "Run Qwen 3.8 Flash Next (125B) on consumer hardware (RTX 4090) at 100T/s"（发帖人 snehesht，不是作者），
  2026-10-04 首页第 2 名，910 分、411 条评论。速度都是作者 / 发帖人的说法，片中不引用任何 tok/s。
- **它其实怎么做的**（FACTCHECK #1）：显卡里放最常用的专家，而且边聊边学该放谁；其余专家留在内存里，**由处理器就地计算**，
  和显卡同时干；只有一小部分会被搬上显卡。片中的厨房照这个画：楼上小厨房 = 显卡，楼下大屋子 = 内存，楼下有一口小灶 =
  处理器，楼梯 = 搬运。
- **钩子**：一句矛盾（"这个 AI，一张游戏显卡装不下"）+ 画面里大脑硬塞进显卡；Strata 的 README 自己就用厨房打比方，我们顺着
  这个厨房往里走。
- **我们的角度**：楼上留谁，决定了要麻烦楼下多少次。我们 ISCA 2026 最佳论文奖论文公开了四个大模型的"后厨单子"（专家选择
  记录）；拿其中 Qwen3-235B 的一部分单子在模拟厨房里走一遍：楼上放 1/4 时，蒙眼 25 分、留最忙的 51 分、留最近的熟面孔 77 分；
  楼上扩一倍，熟面孔 93 分。
- **观众**：不是计算机圈的人。全片只念一个结果单位："叫一百次，有几次人正好在楼上"（分数）。只说出一个行话"专家 experts"；
  "显卡 / 内存条"是楼上楼下的名字。不出现 token、MoE、PCIe、cache、hit rate、LRU（小字和帖子除外）。

### 0.2 规格
- 1080x1920，30 fps；EN 发 X，ZH 发抖音。画面渲一次，画中字和字幕走 `strings.js`（`?lang=en|zh`）。
- **全长 3:27.0**（207.0 s）：旁白 0:00.3 起，EN 结束于 3:20.9、ZH 结束于 3:21.6，片尾卡 3:22.8-3:27.0。X 的 2:15 版见 §7。
- 安全区：字幕 y 1300-1440（纸底框，沿用开头的 `captions()`）；顶部 0-260、底部 1480 以下不放要读的字；画中字在 x 880 左边
  （y 700-1480 的右栏是抖音按钮列）。标题带 y 260-560：B3-B9 的最上面一行（y 280-340）是"回答条"（§0.4），标题 / 记分在 y 360-560。
- 第 0 帧就是封面（服务器墙 + 红晕大脑 + 问题式标题）。出图时 `?guides=1` 另截 1:1 和 3:4 裁切；第一行被裁就只把第 0 帧的标题
  下移到封面带 y 560-1000（RETENTION §1）。

### 0.3 这一版改了什么（F = FACTCHECK，O = OUTSIDER，R = RETENTION）
1. **Strata 的做法讲对了**（F1）：楼下有小灶（处理器就地算），楼梯是次要路径；"慢 30 多倍"改成"慢好多倍"（F2）；"缺人就干等"
   改成"楼下的人越多，出得越慢"（F3）。响铃计时器删掉（O4：响铃 = 做好了，意思反了），换成标题带里一词一词写出来的回答，缺人时变慢。
2. **压缩是招数的一半**（F4）：b04 "Strata squeezes it hard. Still won't fit."；"十倍"只对 RTX 4090 说（F5）。
3. **开头三秒换成矛盾句**（R1），封面、首句、字幕不再是同一句话；ZH 封面换成抖音观众认得的"千问"（R2、O6），"900+"删掉，
   论坛评论撑破窗框代替（O6）。
4. **自我介绍挪到代价之后**，先承诺再介绍（R3）："Part of the answer is a pattern our lab measured."
5. **正面回答"怎么塞进去"**（O1）：b10 "How does it fit, then? It doesn't have to."，红笔把封面的"?"再写一遍、划掉。
6. **一个单位**（O2）：百分制分数，三翻是 25 → 51 → 77，扩建后 50 / 93；"F / 不及格"只给蒙眼，"A / 优"只给 93。
   屏幕上不再有 "÷7"、"×2"、"3 of 4 downstairs"。
7. **121 号厨师**（O3 + R5）：埋（B3 第一张单子里红圈一下）→ 升级（B8 "四十个词里叫了十九次"）→ 兑现（"又是你，又是你"，规则三）
   → 收尾（B12 他的脸放大）。连续出现是真数据（anim.json 第 1-6 个词都有 121）。
8. **热点不掉线**：b14 "So tricks like Strata's come down to one question"（R6）；规则三之后加 Strata 自己的证据："Strata's own
   upstairs works a bit like this: while you chat, it keeps learning who's busy."（F10）。
9. **B7 不再报三个大数**（O5、O6）：旁白念四个模型名，2.4 万条请求和约 680 万次点名只上屏；奖项从片尾挪进 B7（O9）。重放范围说清：
   "ran a sample through a pretend kitchen"，"an older, bigger cousin"（F9）。
10. **结尾从 35 s 压到 27 s**（R4、O10）："不换新芯片"删掉（F7），"系统研究"降成红笔小字（O10），最后一句回扣钩子：
    "It looks like chaos. It's a pattern. The trick isn't fitting every chef upstairs. It's guessing who's next."（R4，"guessing"见 §11）。
11. 小字按 F6 重写（9,082 是生成的 token，不是词；Strata 的模型不同；速度说法来自作者和发帖人）。
12. 旁白重新编号 b01-b28（旧 → 新：b03→b05，b04→b03，b05→b04，b19 并进 b15，b26 并进 b17，b21 拆成 b21 + b22，b24 + b25 → b26，
    新增 b19、b23；其余同号）。

### 0.4 画面语法（全片只有一张纸）
- **一张很长的纸，镜头只滑不切**：每个段落是纸上的一块区域（§2）；B7 往右平移到出菜口一侧，再滑回来。转场 = 镜头滑动 + 新画稿
  按笔时自己画出来。
- **两种笔**：黑墨 = 世界；红笔 = 重要的东西（分数、被叫到的厨师、圈、箭头、删除线）；一点灰蓝只做次要强调（开头已有）。
  红笔批注和手写字由代码写；所有人物、道具、建筑都是 Codex 线稿，**代码不画任何角色或道具**。
- **回答条**（O4）：B3 起，标题带最上面一行手写一个问题和 AI 正在写的回答。EN 问 "How do I make tomato-egg stir-fry?"，
  答 "First, beat the eggs with a pinch of salt…"；ZH 问「西红柿炒鸡蛋怎么做？」，答「先把鸡蛋打散，加一小撮盐……」。
  每走一张单子多一个词；B5 楼下的活多时字一个一个爬出来；B9 一口气写完。厨房在做菜谱，自带一点 meta。
- **121 号**：开头 cast 里的 6 号（白胡子老师傅），代码在他胸口写红色号牌 "121"；全片只有他戴号牌。
- **真数据上屏**：单子上的厨师号、亮起的厨师、121 号的出现，都来自 `../film/anim.json`（我们公开数据里 LiveCodeBench 第 0 个请求、
  第 46 层、连续 40 个生成词）。分数来自 `../res_32.json`、`../res_64.json`。
- **字体**：手写 EN Caveat 700 / ZH 站酷快乐体；字幕 EN Inter 600 / ZH Noto Sans SC 700（开头已定）。全片中文用"一个词"，
  开头 17.5 s 的 `strings.js`（`ticket: ['一个字']`、b4 字幕）要跟着改。
- **动作**：只用弹簧、缓入缓出和衰减抖动，不抖镜头；小人走位按两拍（15 fps）。

## 1 类比表（一个类比走到底）

| 真实的东西 | 厨房里 | 第一次出现 |
| --- | --- | --- |
| AI 模型（一大堆数字） | 一家超大的餐厅 | B1 数字堆 → B3 厨房 |
| 模型写出的一个词（token） | 一张点菜单 | B3 |
| 一层（Qwen3-235B 有 94 层） | 一个灶台（"94"只进小字） | B3 |
| 每层 128 个专家，每词选 8 个 | 每个灶台 128 位厨师，每张单子叫 8 位 | B3 |
| 路由（学出来的选择） | "叫谁，是 AI 自己琢磨出来的"，不分川菜粤菜 | B3 |
| 显卡显存（快、小） | 楼上的小厨房 | B4 |
| 内存（大） | 楼下的大屋子 | B4 |
| 处理器就地计算（Strata 的主路） | 楼下的小灶，火慢 | B4 |
| 把专家拷上显卡（PCIe） | 把人叫上楼 | B5 |
| 缓存策略 | 楼上留谁（经理的规则） | B6、B8 |
| 命中率 | 分数：叫一百次，有几次人正好在楼上 | B6 |
| 我们公开的专家选择记录 | 后厨的单子 | B7 |
| 我们的缓存模拟 | 模拟厨房 | B7 |

**类比在哪里失效**：专家不分科（B3 说出来，划掉名牌，守 e01 FACTS T23）；"上楼"是拷贝，楼下那份还在（不提）；楼上放 1/4、1/2
是我们模拟的比例，不是 Strata 的（Strata 看显存，"every extra GB holds ~700 more experts"，片中不说比例）。

## 2 版图（纸上从上到下；世界坐标，宽 1080）

| 区域 | 世界 y（约） | 段落 | 画稿 |
| --- | --- | --- | --- |
| A 机房与显卡 | 0-2600 | B0 | line_d_servers, line_brain, line_gpu（开头已有） |
| B 论坛 | 2600-3400 | B0 | line_forum（已有，首次用）, line_coders |
| C 数字堆 | 3400-5600 | B1 | **line_heap**, **line_press**（新）, line_gpu |
| D 校园 | 5600-7000 | B2 | **line_geisel**（新）, line_ticket |
| E 厨房 | 7000-10000 | B3 | line_d_kitchen, line_d_chef_w1-6 / c1-6, line_ticket（已有） |
| F 两层楼 | 10000-12400 | B4-B6, B8-B9 | **line_building_q / _h**, **line_chef_b1-6 / r1-6**, **line_manager_1-3**（新） |
| F' 出菜口（F 的右侧，x 1080-2160） | 10000-12400 | B7 | **line_spike**, **line_slip_boxes**, **line_paper**（新）, line_ticket |
| G 家里的书桌 | 12400-14600 | B10-B11 | **line_pc_kitchen**（新）, line_slip_boxes |
| H 收尾 | 14600-16200 | B12 | line_d_chef_w1-6（缩小）, line_d_chef_w6（放大） |
| 片尾卡 | 16200- | B13 | 真 logo `art/brand/picasso_logo.png` |

开头 17.5 s 的世界坐标要整体重排：B0 之后先经过 C、D 再进厨房；开头的厨房 / 128 位厨师 / 单子 / 8 位上手的代码原样搬到 E 区。
**B6-B9 的版式**：楼缩到约 760 px 宽放右边（x 300-1060，楼下可以伸进抖音按钮列，那里没有字）；记分卡在左上（x 60-480，
y 560-1000）；经理在左下前景（y 900-1290）；记分卡下一行墨色小标签（O8）："Scores: our simulation on Qwen3-235B slips. Not a
test of Strata." /「分数：我们在千问 Qwen3-235B 单子上的模拟，不是对 Strata 的实测。」，从 `grid` 留到 `desk`。

## 3 总表

| 段 | 时间 | 旁白 | 内容 | 新画稿 |
| --- | --- | --- | --- | --- |
| B0 冷开场 | 0:00.0-0:10.8 | b01-b02 | 这个 AI 显卡装不下；免费软件 Strata 偏偏跑起来了；程序员炸了 | - |
| B1 一大堆数字 | 0:10.8-0:27.2 | b03-b04 | 1250 亿个数；十倍于 4090；Strata 压缩过，还是塞不下 | line_heap, line_press |
| B2 我们是谁 | 0:27.2-0:36.2 | b05 | 那怎么跑起来的？答案里有我们测到的规律；Picasso Lab | line_geisel |
| B3 厨房 | 0:36.2-1:02.4 | b06-b09 | 作者的厨房；128 位厨师；每词叫 8 位，下一个词重新点；"专家"，不分菜系 | - |
| B4 楼上楼下 | 1:02.4-1:22.8 | b10-b11 | 不用全塞：最忙的在楼上（显卡）；其余在楼下（内存条），楼下有小灶 | line_building_q, line_chef_b* |
| B5 楼下慢 | 1:22.8-1:35.6 | b12-b13 | 楼下做、或叫上楼，都慢好多倍；楼下的人越多，回答越慢 | line_chef_r* |
| B6 楼上留谁 | 1:35.6-1:50.7 | b14-b15 | Strata 这类办法就一个问题；打分；第一种蒙眼：25 分 | line_manager_1 |
| B7 后厨的单子 | 1:50.7-2:14.2 | b16-b18 | 能比蒙眼强吗？我们留着单子；四个模型；论文获奖；千问家老大哥 | line_spike, line_slip_boxes, line_paper |
| B8 121 号与三翻 | 2:14.2-2:46.9 | b19-b23 | 121 号 19/40；留最忙 51；"又是你"；留熟面孔 77；Strata 也在学 | line_manager_2, _3 |
| B9 扩建 | 2:46.9-2:59.8 | b24-b25 | 蒙眼 50、熟面孔 93；只剩 7 次找楼下；回答写完 | line_building_h |
| B10 跟你有关 | 2:59.8-3:09.4 | b26 | 同样的硬件用得更聪明；更便宜、进你的电脑、不出家门 | line_pc_kitchen |
| B11 单子公开 | 3:09.4-3:14.4 | b27 | 单子全部公开；下一个 Strata | - |
| B12 收尾 | 3:14.4-3:22.8 | b28 | 看着乱，其实有规律；诀窍是猜准下一个轮到谁 | - |
| B13 片尾卡 | 3:22.8-3:27.0 | - | 真 logo、名字、账号；末 0.5 s 回到封面构图 | - |

旁白起点（`timeline.json`）：b01 0:00.3 · b02 0:03.7 · b03 0:11.1 · b04 0:18.8 · b05 0:27.6 · b06 0:36.2 · b07 0:40.8 · b08 0:47.3 ·
b09 0:53.6 · b10 1:02.7 · b11 1:14.5 · b12 1:22.8 · b13 1:30.5 · b14 1:35.6 · b15 1:40.4 · b16 1:50.7 · b17 1:56.4 · b18 2:06.8 ·
b19 2:14.2 · b20 2:21.1 · b21 2:27.6 · b22 2:34.8 · b23 2:40.9 · b24 2:46.9 · b25 2:53.2 · b26 3:00.0 · b27 3:09.4 · b28 3:14.4。
每句的长度（临时配音，EN / ZH 秒）：b01 2.4/2.9 · b02 5.9/6.6 · b03 6.5/7.2 · b04 7.1/7.5 · b05 6.5/7.9 · b06 3.0/4.1 · b07 5.9/5.8 ·
b08 5.7/5.3 · b09 7.7/8.2 · b10 9.9/11.2 · b11 7.2/7.5 · b12 7.2/5.7 · b13 4.2/3.8 · b14 3.8/4.2 · b15 9.3/9.1 · b16 4.7/5.2 ·
b17 9.4/9.8 · b18 6.9/4.5 · b19 5.5/6.3 · b20 5.7/5.2 · b21 5.9/6.6 · b22 4.8/4.8 · b23 5.2/5.4 · b24 5.7/4.2 · b25 5.6/5.4 ·
b26 8.7/8.1 · b27 2.9/4.4 · b28 6.5/7.2。最长的空档约 10 s（每段都有新画面或揭晓，见 R §2 的检查法）。

## 4 分拍（括号里是 `timeline.json` 的 cue 名和秒数）

### B0 冷开场 · 0:00.0-0:10.8（主张 3 s 内落地）
**画面**
- `cover` 0.0 第 0 帧 = 封面：服务器墙（line_d_servers）中间一颗红晕大脑（line_brain）在呼吸。标题带 y 300-540 两行手写：小字黑墨 +
  大字红笔；下方 y 约 600 一行墨色小标签。
- `hookOut` 2.2 标题淡出；`gpu` 2.4 镜头往下滑，游戏显卡（line_gpu，蓝灰淡底）自己画出来；`squeeze` 3.4 大脑被拉长、挤扁，"噗"地硬塞进
  显卡，显卡一颤（开头的 squeeze + wobble，提前约 2.3 s）。旁白说"装不下"，画面偏偏塞进去了。红笔 "ONE gaming card"。
- `forum` 4.6 镜头滑到 B 区：论坛窗口（line_forum）0.5 s 画出，标题框里墨色手写帖子标题、日期；`strataName` 4.8 红笔圈住 "Strata"。
- `coders` 7.9 四个程序员（line_coders）从论坛下面弹出来；`overflow` 8.6 评论行一条接一条往下长，撑破窗框、溢出纸边（评论行是从
  line_forum 自己的评论行裁出来重复用的），行里蹦出手写惊叹。没有赞数。
- 10.4-10.8 镜头往下滑向 C 区。

**旁白**
- b01 EN: "This AI is too big for a gaming card."
- b01 ZH: 「这个 AI，一张游戏显卡装不下。」
- b02 EN: "A free program called Strata runs it on a gaming PC anyway. Programmers lost their minds."
- b02 ZH: 「可免费软件 Strata，偏偏在一台游戏电脑上把它跑起来了。国外程序员直接炸了。」

**手写字**
| | EN | ZH |
| --- | --- | --- |
| 封面小字（墨） | A data-center AI | 1250 亿参数的千问大模型 |
| 封面大字（红） | on ONE gaming card? | 塞进一张游戏显卡？ |
| 封面标签（墨，小） | Strata · No. 2 on Hacker News, Oct 4 | Strata · 国外程序员论坛 Hacker News 当日第 2 |
| 显卡标签（红） | ONE gaming card | 一张游戏显卡 |
| 论坛标题（墨） | Strata: a 125B model on a gaming PC | Strata：1250 亿参数模型跑在游戏电脑上 |
| 论坛日期（墨，小） | Oct 4, 2026 | 2026 年 10 月 4 日 |
| 评论惊叹 | WHAT?! · no way · how?? · it RUNS? | 啊？！· 不可能 · 真的假的 · 跑起来了？ |

**来源**：README "Run a 125-billion-parameter AI model on your own gaming PC"、"free and open source"、MIT（F S1）；"装不下" =
250 GB（BF16）和压缩到最小的 37.6 GB 都大于任何游戏卡（24 GB 4090、32 GB 5090）（F S4、S6、S11、S12）；HN 第 2 名、910 分、411 评论
（F S5，**发布前复核**）。论坛是手画的通用窗口，不用 HN 的 logo 和橙色；评论是通用惊叹，不引用真实网友。
**声音**：`cover` 纸张放下（rpg/bookPlace1）；`squeeze` 闷响（imp/impactPlank_medium_002）；`forum` cloth3；`overflow` bookFlip2。
音乐 Investigations（Kevin MacLeod，CC BY）从 0.0 起，人声下压。

### B1 一大堆数字 · 0:10.8-0:27.2
**画面**
- `heap` 10.8 C 区中间，一座空白小方块堆成的大山（**line_heap**）从山顶往下画出来；山脚一张小游戏显卡（line_gpu，约 300 px 宽）。
- `decimals` 12.6 最前面十几块方块上代码手写小数（"0.013"、"-0.27"、"0.71"……），像数字在往外冒。
- `count125` 16.3 红笔 "125,000,000,000" 一位一位写出（ZH「1250 亿个数」）；`years` 17.8 下面红笔小字 "count 1 per second: ~4,000 years"
  （ZH「一秒数一个，要数近四千年」），不念（O5）。
- `fits` 19.8 红笔在显卡上方画虚线框 "what fits"；`card4090` 20.5 显卡旁墨色标签 "RTX 4090 · 24 GB"；`x10` 22.0 沿山的一侧往上叠
  10 个一样的虚线框，写 "×10"。
- `press` 23.6 一台老式螺旋压力机（**line_press**）从上方落下，横梁上红笔写 "Strata"；`pressDown` 24.3 压板压住山顶，山被压扁、缩小，
  停在 1.6 个虚线框高，还是比显卡的框高；`stillNo` 25.7 红笔 "still won't fit!"，显卡委屈地抖一下。立意：**压缩是招数的一半，光压缩
  不够**（F4），后面的厨房是另一半。
- 26.8-27.2 镜头滑向 D 区。

**旁白**
- b03 EN: "An AI model is a giant pile of numbers. The one Strata runs, Qwen, has a hundred and twenty-five billion."
- b03 ZH: 「AI 模型，说白了就是一大堆数字。Strata 跑的是阿里的千问，足足一千二百五十亿个。」
- b04 EN: "Stored the usual way, that's ten times what an RTX 4090 holds. Strata squeezes it hard. Still won't fit."
- b04 ZH: 「正常存，得十多张 4090 才装得下。Strata 使劲压缩过，一张卡还是塞不下。」

**手写字**：EN "125,000,000,000 numbers"、"count 1 per second: ~4,000 years"、"what fits"、"RTX 4090 · 24 GB"、"×10"、"Strata"、
"still won't fit!"；ZH「1250 亿个数」「一秒数一个，要数近四千年」「显卡装得下的」「RTX 4090 · 24 GB」「×10」「Strata」「还是塞不下！」。
**来源**：125B = README + HF 模型卡 "125B with 6B activated"（完整权重另有 51B n-gram 嵌入和 4B MTP，只说 125B 主模型，不说"全部"）；
千问 = 阿里云的模型家族（HF Qwen 组织页："the large language model family built by Alibaba Cloud"，2026-10-05 读）；十倍 =
125B x 2 字节 = 250 GB ÷ 24 GB = 10.4（我们的算术，只对 4090 说）；Q2_0 最小 37.6 GB > 24 GB，37.6 / 24 = 1.57 个框（Strata
docs/MODELS.md）；近四千年 = 125e9 / 31,557,600 s = 3,961 年（我们的算术）。
**声音**：`press` 重响（imp/impactWood_heavy_000）；`pressDown` 吱呀（rpg/creak1）。

### B2 我们是谁 · 0:27.2-0:36.2（先承诺，后介绍）
**画面**
- `campus` 27.2 D 区：UC San Diego 的盖泽尔图书馆（**line_geisel**）按笔时画出来，两侧桉树，前面小广场上一块空白告示板。
  镜头缓推（1.0 → 1.08）。
- `patternSlip` 30.2 "a pattern our lab measured"：一张空白单子（line_ticket）飞来，红笔把它钉在告示板上，单子上红笔写 "pattern?"
  （ZH「规律？」）：预告 B7 的"单子"。
- `labName` 31.4 标题带红笔大字 "Picasso Lab"，下面墨色小字。
- 35.8-36.2 镜头滑向 E 区。

**旁白**
- b05 EN: "So how does it run? Part of the answer is a pattern our lab measured. We're Picasso Lab, at UC San Diego."
- b05 ZH: 「那它怎么跑起来的？答案里，有我们测到的一个规律。我们是加州大学圣地亚哥分校的 Picasso 实验室。」

**手写字**：EN "pattern?"、"Picasso Lab"（红）、"UC San Diego · Prof. Yufei Ding's lab"（墨，小）；ZH「规律？」「Picasso 实验室」（红）、
「加州大学圣地亚哥分校 · Yufei Ding 教授课题组」（墨，小）。丁老师的中文名不写（未确认）。
**来源**：实验室自述（`social/x/build.py` launch post）；"测到"不说"发现"：专家选择有局部性前人也观察过，论文是在四个超大模型上
测出来并公开。Geisel 只是校园地标，不是实验室所在楼（§9）。

### B3 厨房 · 0:36.2-1:02.4
**画面**
- `quote` 36.2 E 区顶部，README 原话边念边写（不单独等它写完，O §3）：EN "“Think of a kitchen…”" + 红笔小字 "— Strata's author"；
  ZH「“可以想象一个厨房……”」+「—— Strata 作者」。
- `kitchen` 37.9 厨房（line_d_kitchen）自己画出来；`goIn` 38.8 镜头推进（1.0 → 1.2），引语淡出。
- `chefs` 43.0 128 位厨师（line_d_chef_w1-6，8 排 x 16）从中间往外依次画出；`label128` 44.4 红笔 "128 chefs"；左上墨色小字
  "one station" 和 "(Qwen3-235B, one of the models in our data)"。灶台数 94 不上这里（O5）。
- `answerStrip` 46.6 标题带最上面一行出现回答条：墨色问题 + 空的回答 + 闪烁的光标。
- `ticket` 49.0 单子（line_ticket）从上面掉下来，代码写 8 个厨师号（anim.json 第 1 个词：88 21 97 0 126 71 121 58）和红笔 "one word"；
  `eight` 50.0 这 8 位弹出来，换成红笔做菜姿势（line_d_chef_c1-6），其余变淡；回答条多出第一个词；`seed121` 50.8 红笔在 121 号身上
  飞快圈一下，不说话（埋）。
- `ticket2` 51.3 第二张单子落下（第 2 个词：88 21 121 55 70 71 89 58），亮起的 8 位重排：5 位留着、3 位换人（真数据，121 还在），
  回答条再多一个词。
- `experts` 54.4 红笔箭头指向一位厨师，写 "experts"（ZH「专家」）；`titles` 56.0 两位厨师头顶各弹出手写名牌 "soup chef" / "pastry chef"
  （ZH「川菜」「粤菜」）；`strike` 58.7 红笔一笔划掉两块，换成 "?"；`learned` 59.6 从单子到 8 位厨师画一道红笔弧线：叫谁是学出来的。
- 62.0-62.4 镜头往下滑、拉远。

**旁白**
- b06 EN: "Strata's author explains it with a kitchen. Let's go in."
- b06 ZH: 「Strata 的作者自己打了个比方：厨房。进去看看。」
- b07 EN: "Picture a giant restaurant. The one we'll follow today has a hundred and twenty-eight chefs at every station."
- b07 ZH: 「想象一家超大的餐厅。今天跟拍的这一家，每个灶台站着一百二十八位厨师。」
- b08 EN: "For each word the AI writes, the slip calls just eight of them. The next word calls its own eight."
- b08 ZH: 「AI 每写一个词，单子上只叫八位上手；下一个词，再重新点八位。」
- b09 EN: "Engineers call them experts. Experts in what? Nothing as simple as soup or pastry: the AI worked out on its own whom to call."
- b09 ZH: 「工程师管他们叫"专家"。专什么？可不是川菜粤菜这么简单。叫谁，是 AI 自己琢磨出来的。」

**手写字**：EN "“Think of a kitchen…” — Strata's author"、"128 chefs"、"one station"、"(Qwen3-235B, one of the models in our data)"、
"one word"、"experts"、"soup chef" / "pastry chef"（划掉）、"?"、回答条 "How do I make tomato-egg stir-fry?"；ZH「“可以想象一个厨房……”——
Strata 作者」「128 位厨师」「一个灶台」「（千问 Qwen3-235B，我们数据里的模型之一）」「一个词」「专家」「川菜」/「粤菜」（划掉）「？」、
回答条「西红柿炒鸡蛋怎么做？」。
**来源**：README 原话（EN 与 README.zh-CN，F S1）；Qwen3-235B 每层 128 专家、每词选 8、94 层（F S7，`analysis.py`）；我们数据里四个模型
每层分别 256 / 384 / 128 / 128 位（F B3 行）；不分科（e01 FACTS T23；"不简单"比"没有分科"更稳，O7）；路由是训练出来的；"重新点八位"
不说"换一拨人"：相邻两个词平均有 30% 的人重复（anim.json 重算，随机为 6.25%）。Strata 自己的模型 48 层 x 512 位、每词 10 位 + 1 位常驻
（HF 模型卡），只进帖子回复。
**声音**：`kitchen` 锅响（rpg/metalPot1）；`ticket` bookFlip1；`eight` 木板轻响（imp/impactPlank_medium_000）。

### B4 楼上楼下 · 1:02.4-1:22.8
**画面**
- `building` 62.4 镜头拉远滑到 F 区：两层楼剖面（**line_building_q**，像拆掉前墙的娃娃屋）自己画出来：楼上一间紧凑的厨房（约占
  楼高三成），楼下一间大屋子（沙发、储物柜、咖啡机、圆桌，角落一口旧的双眼小灶），右侧一道斜楼梯。
- `qAgain` 62.8 红笔在楼顶上方把封面那个大"?"再写一遍；`strikeQ` 64.2 一笔划掉，旁边写 "doesn't have to" /「不用全塞」（回答开头）。
- `split` 65.6 同一批 128 个 sprite 缩到约 110 px 高，从楼的左门排队进来；`upstairs` 68.6 32 位上楼（两排各 16，含 121 号）；
  `cardLabel` 72.0 楼上一侧红笔标 "graphics card · small, fast"。
- `crowd` 74.6 96 位进楼下，换成休息姿势（**line_chef_b1-6**：瘫坐、伸懒腰、看报、刷手机、吃三明治、端咖啡），走位按两拍；
  `ramLabel` 78.1 楼下一侧墨色标 "memory · big"。
- `stoveCook` 79.4 楼下角落的小灶前，两位厨师（line_d_chef_c* 缩小）慢吞吞地颠勺（半速），墨色小字 "small, slow stove"。
- `flop` 81.9 最后一位进门，屋里还空着一大片，他往沙发上一躺（line_chef_b1 瘫坐姿势；"谁都待得下"，O §3 替换胖师傅挤门）。

**旁白**
- b10 EN: "How does it fit, then? It doesn't have to. Each word needs only a few chefs, so the busiest work upstairs, in a small, fast kitchen: the graphics card."
- b10 ZH: 「那到底怎么塞进去的？根本不用全塞。每个词只用得着几位，最忙的就待在楼上的小厨房：地方小，手脚快。这就是显卡。」
- b11 EN: "Everyone else waits downstairs in a big room: the computer's memory. They can cook there too, on a small, slow stove."
- b11 ZH: 「其余的人，都待在楼下的大屋子里，也就是电脑的内存条。楼下也能做菜，只是灶小火慢。」

**手写字**：EN "doesn't have to"、"graphics card · small, fast"（红）、"memory · big"（墨）、"small, slow stove"（墨，小）；
ZH「不用全塞」「显卡：小，但快」「内存条：大」「小灶，火慢」。
**来源**：Strata HOW_IT_WORKS："an expert cache that fills the rest of VRAM with the most-used experts"；"The CPU computes the experts that
are not on the GPU in place, at the same time as the GPU works on the cached ones"（F S2、S3，2026-10-05 复读）；README "Your RAM holds all
of them"。楼上画 32/128 是我们模拟的 1/4（b15 才说），不是 Strata 的比例。
**声音**：`flop` 软垫一声（imp/impactSoft_medium_000）。

### B5 楼下慢 · 1:22.8-1:35.6
**画面**
- `slowStove` 83.6 新单子到了楼上出菜口（anim.json 第 2 个词，在 `resident` 集合下 8 位里 6 位在楼上）：楼上 6 位刷刷开工；不在楼上的
  一位由楼下小灶慢慢做（半速、冒烟）。
- `runner` 85.6 另一位（**line_chef_r1-6** 跑步姿势）开始爬楼梯，喘、冒汗、慢；`manyX` 87.6 红笔沿楼梯和小灶各写 "many × slower"
  （ZH「慢好多倍」），旁边一道长长的红色虚线箭头。同一时间楼上的厨师已经颠完好几锅（不计数）。
- `crawl` 90.8 回答条的下一个词一个字母一个字母往外爬，光标一闪一闪；`lag` 93.5 红笔在光标旁写 "lag"（ZH「卡」）。爬楼的终于到了，
  词才写完。

**旁白**
- b12 EN: "The catch: cooking downstairs, or running a chef up the stairs, is many times slower than using one already upstairs."
- b12 ZH: 「麻烦就在这儿：在楼下小灶上做，或者把人叫上楼，都比用楼上现成的慢好多倍。」
- b13 EN: "The more chefs a word needs from downstairs, the slower the answer comes out."
- b13 ZH: 「一个词要的人里，楼下的越多，回答就出得越慢。」

**手写字**：EN "many × slower"、"lag"；ZH「慢好多倍」「卡」。
**来源**（只按带宽算，[check: 没算计算量]）：RTX 4090 显存 1,008 GB/s；PCIe 4.0 x16 约 31.5 GB/s（32 倍）；DDR5 双通道 83-96 GB/s
（处理器路约 10 倍）；Strata 测试机 RTX 5070 672 GB/s，处理器路约 8 倍、PCIe 5.0 搬运约 11 倍（F B5 行、S11、S12）。所以只说"好多倍"。
"越多越慢"：Strata 显卡和处理器同时干，"so neither waits for the other"，一层要等慢的那一边（F3）。
**声音**：`runner` 楼梯脚步两声，第二声更慢（imp/footstep_wood_000、001）。没有计时器。

### B6 楼上留谁 · 1:35.6-1:50.7
**画面**
- 95.6 楼退到右边（§2 版式），楼上一侧红笔 "Strata" 小标签回来；`question` 98.6 标题带红笔大字 "Who stays upstairs?"（ZH「楼上留谁？」），
  问号弹一下。b14 后面留 0.6 s。
- `grid` 101.6 左上记分卡：一个 10 x 10 的空格阵，上面墨色写 "out of 100 calls: chef already upstairs?"；下方一行墨色小标签（§2）。
- `quarter` 105.6 楼上标红笔 "room for 1/4"；`blindfold` 106.6 经理（**line_manager_1**：蒙着眼，从倒过来的厨师帽里抓纸条）出现在
  左下前景，楼上 32 位换成随便抽的一批（固定种子）。
- `ticks1` 107.6 真单子（anim.json 前几个词）一张张过：在楼上的打红勾，不在的楼梯上多一个小人；格阵按平均值填满：25 格红勾、75 格各一个
  灰色小人（单张单子是示意，格阵才是分数）。`s25` 108.9 记分卡第一行
  红笔大字 "① blindfold 25"；`gradeF` 109.8 旁边红笔 "F"（ZH「不及格」）。

**旁白**
- b14 EN: "So tricks like Strata's come down to one question: who stays upstairs?"
- b14 ZH: 「所以 Strata 这类办法，说到底就一个问题：楼上留谁？」
- b15 EN: "Let's keep score: out of a hundred calls, how many find their chef upstairs? Say upstairs fits a quarter. Rule one: pick blindfolded. Twenty-five."
- b15 ZH: 「打个分：叫一百次，几次人正好在楼上？假设楼上放得下四分之一。第一种，蒙眼随便挑：25 分。」

**手写字**：EN "Who stays upstairs?"、"out of 100 calls: chef already upstairs?"、"room for 1/4"、"① blindfold 25"、"F"；ZH「楼上留谁？」
「叫 100 次：人正好在楼上的有几次？」「楼上放 1/4」「① 蒙眼 25 分」「不及格」。
**来源**：Strata 的显卡留谁是它自己的决定（"the most-used experts … adapts to the conversation"，F S2）；随机时 = 32/128 = 25%
（`res_32.json` random 0.25）。
**笑点检查**：蒙眼抓阄就是"随机"本身；"F"给的是规则，不是人。
**声音**：`blindfold` 抓纸条（rpg/cloth2）。

### B7 后厨的单子 · 1:50.7-2:14.2
**画面**
- `unmask` 110.7 经理一把扯下眼罩（manager_1 淡出、manager_3 淡入），镜头往右平移到 F' 区（出菜口一侧）。
- `spike` 113.4 一根插单子的铁钎（**line_spike**）串着高高一摞单子，画出来，有几张飘下来；EN 红笔 "the receipts"，ZH「单子都在」。
- `boxes` 116.4 铁钎后面四个档案纸箱（**line_slip_boxes**）随着念名字一个个画出（每个隔约 0.7 s），代码在空白标签上手写 "DeepSeek-V3"、
  "Kimi K2"、"Llama 4 Maverick"、"Qwen3-235B"；红笔小字 "24,000+ requests"（ZH「两万四千多条提问」），不念。
- `called` 119.6 单子从箱子里弹出，每张上都是一串厨师号。
- `paper` 121.4 论文首页（**line_paper**）落到铁钎那摞单子的最上面，代码手写标题 "Patterns behind Chaos"、副标题和作者；`rosette` 124.4
  别在右上角的玫瑰花结中心写 "Best Paper Award"，下面 "ISCA 2026"；墨色小字 "ISCA: a computer-architecture conference"。
- `qwenBox` 127.0 从 "Qwen3-235B" 箱子里抽出一摞单子，箱子旁红笔小字 "older, bigger cousin of Strata's Qwen"（ZH「千问家老大哥」）；
  右上（x < 880）红笔计数器滚到 "≈ 6,800,000 chef calls"（ZH「约 680 万次点名」），不念。
- `pretend` 130.0 单子像流水一样流向那栋楼，楼上方红笔小字 "pretend kitchen = our simulation"（ZH「模拟厨房 = 我们的模拟」）；
  `panBack` 132.4 镜头平移回 F 区。

**旁白**
- b16 EN: "Can you beat the blindfold? We didn't have to guess. Our lab kept the order slips."
- b16 ZH: 「能比蒙眼强吗？不用猜。我们实验室，留着后厨的单子。」
- b17 EN: "DeepSeek, Kimi, Llama, Qwen: who got called, for every word. Our paper on them, Patterns behind Chaos, won a Best Paper Award this summer."
- b17 ZH: 「DeepSeek、Kimi、Llama、千问：每个词叫了谁，全记着。写成的论文《混乱背后的规律》，今年拿了最佳论文奖。」
- b18 EN: "We took slips from Qwen3, an older, bigger cousin of Strata's model, and ran a sample through a pretend kitchen."
- b18 ZH: 「我们挑了千问家老大哥的一部分单子，在模拟厨房里重新走了一遍。」

**手写字**：EN "the receipts"、四个模型名、"24,000+ requests"、"Patterns behind Chaos"、"Forecasting Data Movement for Efficient Large-Scale
MoE LLM Inference"、"Yu, Guan, Yu, Zhou, Hu, Pei, Kang, Ding, Tsai"、"Best Paper Award · ISCA 2026"、"ISCA: a computer-architecture
conference"、"older, bigger cousin of Strata's Qwen"、"≈ 6,800,000 chef calls"、"pretend kitchen = our simulation"；ZH「单子都在」、模型名照写
英文、「两万四千多条提问」、标题照写英文原题 +「（混乱背后的规律）」、「ISCA 2026 最佳论文奖」「ISCA：计算机体系结构会议」「千问家老大哥」
「约 680 万次点名」「模拟厨房 = 我们的模拟」。
**来源**：T19：问"能比蒙眼强吗"，不问"是不是随机"（O7）；四个模型、"over 24,000 requests"、按输出 token 逐层记录、数据公开（F S8、S9；
屏上用论文的叫法，T16）；获奖：当届两篇之一，ISCA 2026 在 6 月 27 日-7 月 1 日，"this summer / 今年"成立（F S10，e01 FACTS E2 / T18）；
标题、作者（F S8）；Qwen3-235B（235B / 22B 激活）比 Qwen3.8-Flash-Next（125B / 6B）大、更早、同出 Qwen 团队（F B7 行）；
"一部分"：150 条请求里 79 条学热度、71 条测；约 680 万 = 9,082 个生成 token x 94 层 x 8 = 6,829,664（F S14）。
**声音**：`spike` 一声"噗"（rpg/dropLeather）；`boxes` 纸箱落地（imp/impactWood_medium_000）。

### B8 121 号与三翻 · 2:14.2-2:46.9
**画面**（F 区，§2 版式；记分卡左上已有第一行 "① blindfold 25 F"）
- `c121` 134.5 镜头推向楼上的 121 号（6 号老师傅，红色号牌）；`tally19` 135.9 40 张真单子（anim.json 第 1-40 个词）在他旁边飞快翻过，
  每张有 121 的就在他脸边记一道红勾：19 道；`random23` 138.3 旁边铅笔灰写 "random: 2-3"，画两三道灰勾。墨色小字 "one station,
  40 words, our released data"。
- `rule2` 141.1 经理（**line_manager_2**）站在空白记分板旁，代码在板上画计数道道，最多的几位被红笔圈出来、请上楼（楼梯上一队小人）；
  格阵第二张填起来。`s51` 144.4 记分卡第二行 "② busiest 51"；`double` 145.7 小字 "double the blindfold"。不打评语（O8）。
- `closer` 147.6 经理（**line_manager_3**）弯腰拿放大镜看出菜口那摞单子；`streak1` 149.9 / `streak2` 150.7 第 1-6 个词的单子一张压一张
  排开，每张上的 121 被红笔圈出（ZH 配「又是你」两次，手写在圈旁）；`link` 151.6 红笔把六个圈连成一条线。楼上 121 号站的位置旁红笔
  写 "reserved: 121"（ZH「121 专座」）。
- `rule3` 154.8 楼上换成 anim.json 的 `resident` 集合（真实的 decay 规则状态），连放几个词：大多是红勾，楼梯几乎空了；格阵第三张填起来。
  `s77` 157.6 记分卡第三行 "③ recent regulars 77"；`triple` 158.9 小字 "3× the blindfold"。这一拍安静，不放笑料（SERIES 6.2）。
- `finePrint` 159.6-166.0 记分卡下面（y 1180-1280，字幕上方）一段墨色小字，全片只出现这一次（§6）。
- `strataOwn` 160.9 楼上红笔 "Strata" 小标签旁画一个绕圈箭头；`learning` 164.6 楼上换进一位刚被叫过的厨师：边聊边学。

**旁白**
- b19 EN: "Watch chef one-twenty-one. Nineteen calls in forty words. Random would be two or three."
- b19 ZH: 「盯住 121 号：四十个词里，他被叫了十九次。要是随机，也就两三次。」
- b20 EN: "Rule two: keep the busiest chefs upstairs. Fifty-one. Already double the blindfold."
- b20 ZH: 「第二种：把最忙的几位留在楼上。51 分，已经是蒙眼的两倍。」
- b21 EN: "Look closer: one-twenty-one, again, and again. Whoever was just called tends to be called again."
- b21 ZH: 「再细看：121 号，又是你，又是你。刚被叫过的，往往很快又被叫到。」
- b22 EN: "Rule three: keep the recent regulars. Seventy-seven. Triple the blindfold."
- b22 ZH: 「第三种：留最近的熟面孔。77 分，蒙眼的三倍。」
- b23 EN: "Strata's own upstairs works a bit like this: while you chat, it keeps learning who's busy."
- b23 ZH: 「Strata 自己的楼上，也是这么留人的：你聊着，它一直在学谁最忙。」

**手写字**：EN "121"、"random: 2-3"、"one station, 40 words, our released data"、"② busiest 51"、"double the blindfold"、"reserved: 121"、
"③ recent regulars 77"、"3× the blindfold"、"Strata"；ZH「121」「随机：两三次」「一个灶台、40 个词，我们公开的数据」「② 留最忙的 51 分」
「蒙眼的两倍」「又是你」「121 专座」「③ 留熟面孔 77 分」「蒙眼的三倍」「Strata」。
**来源**：121 号 40 个词里 19 次、95 号 16 次、23 号 14 次；第 1-6 个词连续都有 121（anim.json 重算）；随机期望 40 x 8 / 128 = 2.5（我们的
算术）；楼上放 32/128（`res_32.json`，71 个测试请求、9,082 个生成 token）：popular 0.507（2.03 倍），热度在另外 79 条请求上学出来；decay 0.767
（3.07 倍），LRU 0.749；"刚被叫过的往往又被叫到"：论文 Ob2（深层更明显）+ 这段数据（上一个词的 8 位下一个词平均再出现 30%，随机 6.25%）。
规则三是为本视频写的简单"近期 + 常用"打分（`analysis.py` 的 decay），**不是论文的方法**。Strata：显卡专家集合"keeps learning which ones
those are while you use it"、`--adapt-every`（F S2、S3）；不说 Strata 用了我们的方法，也不拿它和我们的分数比。
**数据待导出**：规则一的随机集合（固定种子）和规则二的 top-32 不在 anim.json 里（`export_anim.py` 加 `random`、`popular` 字段；traces 需
`fetch.py` + HF_TOKEN）。
**声音**：`tally19` 单子翻页（rpg/bookFlip3）；`s51` 轻敲（imp/impactGeneric_light_000）；`s77` 木板一响（imp/impactPlank_medium_003）。

### B9 扩建 · 2:46.9-2:59.8
**画面**
- `renovate` 166.9 红笔写 "room ×2"（ZH「楼上扩建一倍」）；`rebuild` 167.2 楼板线淡出，新楼（**line_building_h**，楼上楼下各一半）按笔时
  重新画出来（施工式转场），楼下 32 位上楼，楼上变成 64 位（4 排 x 16）。
- 记分卡翻到新的一页，标题 "room for 1/2"：`s50` 169.2 "blindfold 50"；`s93` 171.5 新格阵 93 格依次打红勾，红笔大字 "93"；`gradeA` 172.5
  旁边 "A"（ZH「优」），楼上一声"叮"。
- `seven` 173.6 剩下 7 格，每格里一个小人（楼下小灶或楼梯上）。
- `answerDone` 177.8 "faster answers"：回答条一口气写完，整句刷地写满。

**旁白**
- b24 EN: "Now double the room upstairs. Blindfold: fifty. Recent regulars: ninety-three."
- b24 ZH: 「楼上再扩建一倍：蒙眼 50 分，留熟面孔 93 分。」
- b25 EN: "Only seven calls in a hundred still need downstairs. Less work downstairs, faster answers."
- b25 ZH: 「一百次点名，只剩 7 次要找楼下。楼下的活少了，回答就快。」

**手写字**：EN "room ×2"、"room for 1/2"、"blindfold 50"、"recent regulars 93"、"A"、回答条全句 "First, beat the eggs with a pinch of salt…"；
ZH「楼上扩建一倍」「楼上放 1/2」「蒙眼 50 分」「留熟面孔 93 分」「优」、回答条全句「先把鸡蛋打散，加一小撮盐……」。
**来源**：`res_64.json`：random 0.50、decay 0.9301（未命中 6.99%，说"7 次"）；LRU 0.895、PCIe 上限 3.5 → 25 tok/s 只进帖子。"回答就快"
不带数字：楼下要算 / 要搬的少了。
**声音**：`rebuild` 吱呀（rpg/creak2）；`s93` 很轻的一声铃（imp/impactBell_heavy_000，0.15）。

### B10 跟你有关 · 2:59.8-3:09.4（真诚转折）
**画面**
- `desk` 179.8 镜头往下滑到 G 区：一个普通人在家里书桌前打字（**line_pc_kitchen**），桌边一台游戏主机，玻璃侧板里是一座迷你两层厨房，
  楼上几位小厨师在忙，楼下角落有小灶。镜头慢推向玻璃侧板。
- `smarter` 181.2 红笔 "same hardware, used smarter"；`cheaper` 183.6 "cheaper"；`ownPC` 185.2 "on your own computer"；`private` 186.8
  "stays on your desk"；`sysResearch` 188.0 角落红笔小字 "(this is called systems research)"。不写 "new chip?"（F7）。

**旁白**
- b26 EN: "Same hardware, used smarter. That's one way big AI gets cheaper, and moves onto your own computer, where what you type never leaves your desk."
- b26 ZH: 「同样的硬件，用得更聪明。大模型要变便宜、搬进你自己的电脑，聊什么都不出家门，少不了这类功夫。」

**手写字**：EN 上面五条；ZH「同样的硬件，用得更聪明」「更便宜」「在你自己的电脑上」「不出家门」「（这叫"系统研究"）」。
**来源**：README "Nothing leaves your PC."；"one way / 少不了这类功夫"不说成唯一原因（F b25 行）；不说"不换新芯片"（论文的 6.6 倍正是
靠轻量的芯片改动，在模拟的晶圆级 GPU 上，F7）。音乐此时已停（见 §6 声音），这一拍靠留白。
**声音**：`desk` 纸张放下（rpg/bookPlace3）。

### B11 单子公开 · 3:09.4-3:14.4
**画面**
- `public` 189.6 四个档案纸箱（line_slip_boxes）在书桌下方再出现，盖子弹开，单子往外飞；红笔圆角框 "open data"；墨色小字 "link in first
  reply"（ZH「链接见评论区」）。
- `you` 191.8 一张单子飞到画面中间停住，上面红笔写 "you?"（ZH「你？」）。

**旁白**
- b27 EN: "The slips are public. Maybe you'll build the next Strata."
- b27 ZH: 「单子全部公开。说不定，下一个 Strata 就出自你手。」

**来源**：HF 数据集 gated: auto（同意共享联系方式后自动通过，F S9）；arXiv 2510.05497。
**声音**：`public` 盖子弹开（imp/impactWood_light_000）。

### B12 收尾 · 3:14.4-3:22.8
**画面**
- `chaos` 194.4 H 区：一个灶台的 128 位小厨师（line_d_chef_w 缩到约 50 px，8 x 16），用 anim.json 的 40 个真实词快速放一遍：每个词亮 8 位
  红色，闪来闪去；手写 "chaos?"（ZH「乱？」）。
- `pattern` 196.0 放慢；121 号的脸从人堆里放大（line_d_chef_w6 放到约 400 px，红号牌），红笔圈住，再把 121、95、23 三位常客连起来，
  手写 "pattern."（ZH「有规律。」）。
- `nextUp` 199.8 红笔把 `resident`（楼上那 32 位）圈成一块，下一个词的红点大多落在圈里；箭头指向下一张空白单子。
- 201.6-202.8 留白一拍，镜头往后拉。

**旁白**
- b28 EN: "It looks like chaos. It's a pattern. The trick isn't fitting every chef upstairs. It's guessing who's next."
- b28 ZH: 「看着是一团乱麻，其实有规律。诀窍不是把人全塞上楼，而是猜准下一个轮到谁。」

**手写字**：EN "chaos?" → "pattern."；ZH「乱？」→「有规律。」；图下小字 "one station, 40 words, our released data" /「一个灶台、40 个词，
我们公开的数据」。
**来源**：anim.json（同 B8）；40 个词只叫到 66 位，随机约 118 位（128 x (1 - (120/128)^40) = 118.3，可做小字，可不放）；论文自己的说法
"seemingly random data movement"（e01 FACTS E7、T19）；"猜准 / guessing"不说"知道"（T20：论文预测的是可能的热门专家）。

### B13 片尾卡 · 3:22.8-3:27.0
**画面**：`endCard` 202.8 同一张纸往上翻出一张干净的卡；真 logo（`art/brand/picasso_logo.png`，multiply 印在纸上）三个环依次弹出，再出
"PICASSO" 字（沿用 film2 的 `endDraw`）；手写 "Picasso Lab · UC San Diego"、"@PicassoLabUCSD"、"paper + data: first reply"。ZH：
「Picasso 实验室 · 加州大学圣地亚哥分校」「《算力另计》热点篇」「论文和数据：评论区」。`loop` 206.5 最后 0.5 s 纸面滑回封面构图
（服务器墙 + 大脑），X 循环时无缝接回第 0 帧（R4）。
**来源**：logo 用原文件，不让 Codex 重画。**声音**：`endCard` 合书（rpg/bookClose）。

## 5 数字清单（屏幕或旁白上的每个数）

| # | 数 | 用在 | 出处 | 状态 |
| --- | --- | --- | --- | --- |
| N1 | 125B（1250 亿） | B0 封面 / 论坛、B1 | README；HF Qwen3.8-Flash-Next 模型卡 | 已核 |
| N2 | HN 10 月 4 日第 2 名（910 分、411 评论） | B0 封面标签 | HN 49953495；front?day=2026-10-04 | **发布前复核** |
| N3 | 十倍 / 十多张 4090 | B1 | 125B x 2 B = 250 GB ÷ 24 GB = 10.4 | 我们的算术 |
| N4 | 压缩后仍塞不下（1.6 个框） | B1 | Strata MODELS.md：Q2_0 37.6 GB；37.6 / 24 = 1.57 | 已核 |
| N5 | 近四千年 | B1 小字 | 125e9 / 31,557,600 s = 3,961 年 | 我们的算术 |
| N6 | 128 位 / 8 位（94 只进小字） | B3 | Qwen3-235B config（F S7） | 已核 |
| N7 | 慢好多倍（不给数） | B5 | 32x（4090 PCIe 4.0）、约 10x（4090 + DDR5）、8-11x（5070） | 我们的算术，[check: 只按带宽] |
| N8 | 25 分（楼上 1/4，蒙眼） | B6 | res_32 random 0.25 | 我们的模拟 |
| N9 | 4 个模型、24,000+ 条请求（只上屏） | B7 | 论文摘要（F S8） | 已核 |
| N10 | 最佳论文奖，ISCA 2026，今年夏天 | B7 | SIGARCH trip report（F S10）；两篇之一 | 已核 |
| N11 | 约 680 万次点名（只上屏） | B7 | 9,082 x 94 x 8 = 6,829,664 | 我们的算术 |
| N12 | 121 号 19 / 40；随机两三次 | B8 | anim.json；40 x 8 / 128 = 2.5 | 真数据 + 算术 |
| N13 | 51 分、两倍 | B8 | res_32 popular 0.507（2.03） | 我们的模拟 |
| N14 | 121 连续出现（第 1-6 个词） | B3、B8 | anim.json | 真数据 |
| N15 | 77 分、三倍 | B8 | res_32 decay 0.767（3.07）；LRU 0.749 | 我们的模拟 |
| N16 | 50 分 / 93 分（楼上 1/2） | B9 | res_64 random 0.50、decay 0.930 | 我们的模拟 |
| N17 | 7 次 | B9 | 100 - 93（未命中 6.99%） | 我们的模拟 |
| N18 | 单子上的厨师号 | B3、B5、B6、B8、B12 | anim.json（LiveCodeBench 第 0 个请求、第 46 层、第 41-80 个生成 token） | 真数据 |
| N19 | 66 位 vs 约 118 位 | B12 小字（可删） | anim.json；128 x (1-(120/128)^40) | 真数据 + 算术 |

不上屏、只进帖子：Strata 自报速度（README：RTX 5070 12 GB 上 53-94 tokens/s；HN 发帖人自述 4090 + 128 GB DDR5 上 124 tok/s），
Strata 模型的 48 层 x 512 专家、每词 10 + 1（HF 模型卡），PCIe 上限 3.5 → 25 tok/s（res_64，Qwen3-235B FP8，只算搬运；注意一张 4090
放不下它一半的专家，约 114 GB）。

## 6 笑点、小字、声音、检查

**笑点**（每个都是解释本身，过 SERIES 7.2 四项测试）
1. B0 大脑硬塞进显卡、评论撑破窗框（冷开场装饰性笑点，只许在冷开场）。
2. B1 压力机压山，"还是塞不下"：光压缩不够（Strata 确实压缩了，F4）。
3. B3 "川菜 / 粤菜"名牌被划掉：类比失效处（专家不分科），EN 用 soup / pastry chef，各自原生。
4. B4 最后一位进门，屋里还空一大片，往沙发上一躺："谁都待得下"。
5. B5 喘着爬楼梯的厨师、灶小火慢、回答条里一个字一个字往外爬的词 + "卡"。
6. B6 / B8 经理三翻：蒙眼抓阄（25，"F"）→ 计数板（51）→ 放大镜（77）；扩建后 93 得 "A"。只给蒙眼和 93 打评语。
7. 121 号 running gag：B3 埋 → B8 "十九次" → "又是你，又是你" + "121 专座" → B12 脸放大。
8. B7 "the receipts"（EN）/「单子都在」（ZH），B 级各自重写；"千问家老大哥"。
9. B11 "下一个 Strata 就出自你手"：真诚，不是笑点。
不拿任何真人开玩笑；论坛评论是通用惊叹；"F"给的是规则；不给规则二打评语（O8）。

**小字（只出现一次，B8 `finePrint` 159.6-166.0，记分卡下方 y 1180-1280；帖子里再写全）**
- EN: "Simulation on our released Qwen3-235B traces (71 requests, 9,082 generated tokens), not a run of Strata, whose model is
  different (512 experts per layer, 10 per token). Rules two and three are simple rules written for this video, not the paper's
  method. Speed claims are Strata's and the Hacker News poster's."
- ZH: 「基于我们公开的 Qwen3-235B 数据模拟（71 个请求、9082 个生成 token），并非实测 Strata；Strata 用的模型不同（每层 512 位专家、
  每词 10 位）。第二、三种规则是为本视频写的简单规则，不是论文方法。速度说法来自 Strata 作者和 Hacker News 发帖人。」

**术语进场顺序**：厨房（B3）→ "专家 experts"（B3，README 也这么叫）→ "显卡 / 内存条"（B4，作为楼上楼下的名字）。不出现：token、MoE、
PCIe、缓存、命中率、LRU、预测器（只在小字和帖子里）。

**声音**：Kenney 音效 23 个，都很轻（g 0.15-0.35），都挂在画面 cue 上（`timeline.json` sfx；只有第二声脚步在 `runner` 后 0.8 s）。音乐 Investigations 只有 93.5 s：
从 0.0 起，自己的收尾正好落在 b13（"回答就出得越慢"）下面，b14 的问题在安静里落地；之后到片尾**还没有音乐**，`mix.py` 只接受一条
音乐床，第二条（同一首从头起，约 1:40.4 进、3:20.5-3:22.8 淡出）要等 `mix.py` 支持列表（`timeline.json` 的 `_music` 注）。

**发布前硬门槛**：N2 复核；中文字幕母语者读一遍；手机上静音看一遍（每拍不靠旁白也看得懂：分数都在画面上）；安全区 `?guides=1` 截图
（含 1:1、3:4 封面裁切）；抖音勾 AI 标注；音乐授权（Investigations，Kevin MacLeod，CC BY 署名）。

## 7 X 的 2:15 版（全长版给抖音 / B 站；替换 R §8.2，按新编号）
删旁白、画面照演（无声）：b06（README 引语照写）、b09（名牌照样被划掉）、b13（回答条照样爬）、b18（"older, bigger cousin" 写在箱子旁）、
b26（书桌和红笔字照出）。缩：
- b05 "So how does it run? Part of the answer is a pattern our lab measured."（"Picasso Lab · UC San Diego" 照写）
- b10 "It doesn't have to fit. Each word needs only a few chefs, so the busiest work upstairs, in a small, fast kitchen: the graphics card."
- b11 "Everyone else waits downstairs, in the computer's memory. They can cook there too, slowly."
- b12 "But downstairs is many times slower."
- b15 "Score it: out of a hundred calls, how many find their chef upstairs? Upstairs fits a quarter. Blindfolded: twenty-five."
- b16 "Can you beat the blindfold? Our lab kept the order slips."
- b17 "DeepSeek, Kimi, Llama, Qwen: who got called, for every word. Our paper on them won a Best Paper Award this summer."
- b19 "Watch chef one-twenty-one. Nineteen calls in forty words."
- b21 + b22 "Look closer: one-twenty-one, again and again. Rule three: keep the recent regulars. Seventy-seven. Triple the blindfold."
**保留** b14、b20、b23、b27、b28（三翻、热点回接、收尾都是留存装置）。按临时配音的语速估算约 2:13（旁白约 1:58 + 21 个停顿 + 3 s 片尾卡）；
TTS 后若超 2:15，再删 b04 后半句（压力机照演）。

## 8 帖文与标题（R §6，按 F 修过）
**X 正文**（87 字符）：`Strata runs a 125B AI on one gaming PC. It doesn't fit on the card. It doesn't have to:`
**第一条回复**：
1. `Paper (ISCA 2026 Best Paper Award): arxiv.org/abs/2510.05497 · Our released traces: huggingface.co/datasets/core12345/MoE_expert_selection_trace · Strata: github.com/Niko1221/Strata`
2. `The film is a simulation on our released Qwen3-235B traces (71 requests, 9,082 generated tokens), not a run of Strata. Rules 2-3 are simple rules written for this video, not the paper's method. Strata uses GPU + CPU + RAM; speed claims are its author's and the HN poster's.`
3. `Strata's own model: 48 layers x 512 experts, 10 per token + 1 shared (model card). Ours: 94 x 128, 8 per token. With half the experts on the GPU: random 50%, LRU 90%, our recency rule 93%.`

**抖音标题**：「1250亿参数的千问，怎么塞进一张游戏显卡？」（备选「显卡装不下的大模型，凭什么跑起来了？」）；话题 #大模型 #AI科普 #千问
#本地部署 #加州大学圣地亚哥分校。
**简介**：「Strata（免费开源）把 1250 亿参数的千问大模型跑在了一台游戏电脑上。为什么塞得下？我们拿 ISCA 2026 最佳论文奖论文公开的
后厨单子，在模拟厨房里重新走了一遍：留对人，楼上找到人的次数是瞎猜的 3 倍。基于我们公开的 Qwen3-235B 数据模拟，并非实测 Strata；
速度说法来自 Strata 作者和 Hacker News 发帖人。论文 arXiv 2510.05497。」勾 AI 标注；合集「算力另计 · 热点篇」。

## 9 待用户 / 待确认
1. 实验室中文名（SERIES #3）：先写 "Picasso 实验室"。
2. 中文片名用"混乱背后的规律"还是"混沌背后的规律"（64 s 版 vs e01 FACTS E1），全频道统一。
3. 用 Geisel 图书馆代表 UC San Diego 可以吗（不是实验室所在楼）。
4. 配音：仍是 edge-tts 临时声（只定时长）；ZH b01 临时声 2.9 s，超过圣经的 2.5 s，真人录时压一点。真人 EN / ZH 旁白谁录。
5. 后半段音乐：要不要让 `mix.py` 支持第二条音乐床（§6 声音）。
6. 是否在帖子回复里点名作者 Niko1221（建议只给 README 链接）；HN 排名发布前复核。

## 10 下一步（做片）
1. Codex 限流结束后跑 `art_batch.sh`（三组：楼 / 厨师姿势 / 经理 / 铁钎 → 纸箱 / 数字堆 / 压力机 / 图书馆 → 扩建楼 / 书桌 / 论文），
   逐张全尺寸检查后再进下一组；它会自动切两张姿势表并 `ink.py` 打包。
2. `line_full/film.js` 从 `../bakeoff/line/film.js` 长出来：同一套 `sprite / paint / put / hand / captions`，世界按 §2 版图重排，读
   `timeline.json` 的 cue；`strings.js` 收所有画中字（EN / ZH）和字幕（`vo_en.json` / `vo_zh.json` 是逐词时间）。
3. `export_anim.py` 加随机集合（固定种子）和 popular 集合（需要 traces）。
4. 先出每段 2 帧 EN / ZH 截图（桌面 + 手机尺寸）给用户看，再全片渲染、`mix.py mix`。

## 11 没采纳的意见和原因
1. **O5 "楼上一秒开工，楼下得等半分钟"**：30 倍只对 4090 走 PCIe 那条路成立；Strata 的主路是处理器在内存里算，约 8-10 倍（F2）。改成
   "many times slower / 慢好多倍"，不给数。
2. **O4 "Miss one chef, and the whole answer stalls"**：Strata 显卡和处理器同时干，"neither waits for the other"（F3）；楼下的人多只会变慢，
   不会停。回答条保留，改成"爬"。
3. **O1 b08 "The next word calls a different eight / 又换一拨人"**：真数据里第 2 个词 8 位有 5 位没换（平均重复 30%），而且会和 b21
   "刚被叫过的又被叫到"打架。改成"calls its own eight / 再重新点八位"。
4. **O8 规则二 = "the idea in Strata's own notes"（含退路句）**：Strata 的楼上会边聊边调（HOW_IT_WORKS："adapts to the conversation"），
   不是我们静态的规则二；把 51 分挂在 Strata 名下等于替它打了一个没测过的分（R §5 同样反对）。改用 F10 的说法，放在规则三之后（b23）。
5. **O10 / R §4 "No new chip / 不换新芯片" 和 B10 划掉 "new chip?"**：论文的头条 6.6 倍正是靠轻量的芯片改动（F7）。只留"同样的硬件，用得更聪明"。
6. **R §3 "ten gaming cards' worth / 得十多张游戏显卡"**：十倍只对 24 GB 的 4090 成立，5090 是 7.8 倍（F5）。旁白点名 RTX 4090。
7. **R §2 b07 "We kept records on one" + b16 "remember"**：我们记录了四个模型（F9），"记录了一家"不对。用 O7 的"今天跟拍的这一家"，
   开环由 b05 的承诺（"a pattern our lab measured"）来扛。
8. **R §3 删 b09 的 "Engineers call them experts"**：没删。brief 允许"挣到位置"的术语："experts"是 Strata README 和所有相关报道用的词，
   观众看完能去读那个帖子；"Experts in what?"这个笑点也要它。代价约 1.5 s。
9. **R §4 奖项留在片尾（b26 合并）**：用了 O9 的位置，奖项进 B7，和"我们留着单子"一起当证据；片尾只剩"跟你有关 + 单子公开 + 收尾一句"，
   最后一个揭晓（93）之后 27 s，原来 35 s。
10. **R §4 最后一句 "It's knowing who's next"**：改成 "guessing"（T20：论文预测的是可能热门的专家，93/100 是猜中率）；前面保留 O 认为全片
    最好的 "It looks like chaos. It's a pattern."，两边的诉求都在。中文同理用「猜准」。
11. **O9 b03 "we have the receipts" / 「这事，我们有发言权」作自我介绍**：自我介绍用 R3 的"先承诺"版；"the receipts"挪到 B7 铁钎旁的红笔字（EN），
    中文写「单子都在」。
12. **O1 b14 "And the next slip could call anyone"**：没用，换成 R6 的热点回接；"能不能提前猜到"由 b16 "Can you beat the blindfold?" 承担。
13. **O6 冷开场显卡标 "RTX 4090"**：挪到 B1 的小显卡上（念"十倍于 4090"的地方）。冷开场的卡保持通用：4090 是 HN 发帖人的配置，README 测在
    12 GB 的 RTX 5070 上（F B0 论坛行）。
14. **O3 "经理在楼上给 121 摆把凳子"**：代码不画道具，为一个小笑点多一张 Codex 图不值；换成红笔批注 "reserved: 121 / 121 专座"。
15. **F10 原句 "Strata's own cache works a bit like this"**：意思照用，"cache"换成类比里的 "upstairs"（不出行话）。
16. **R §1 b02 ZH「国外程序员论坛直接炸了」、O 的 b17 / b10 等长句**：为时长略缩（ZH b02 7.3 → 6.6 s，b10 12.2 → 11.2 s），意思不变。
17. **R 估的全长 2:57**：临时配音实测全长 3:27（ZH 普遍比 EN 长，共用一条时钟按长的排），在 brief 的 2:30-3:30 之内，没为凑 3:00 再砍内容。
