# 留存编辑意见：Strata 线稿全片（`SCRIPT.md` 3:20 稿）

> 2026-10-05 · 角色：X / 抖音留存编辑。只看"人会不会划走"：前 3 秒、每 15-20 s 有没有新钩子、时长值不值、结尾、热点、
> 帖文和标题。事实核查不在本文范围，但本文新加的每个数都在 §9 给了出处。旁白时长按 EN 2.6 词/s、ZH 4.4 字/s 估算
> （与 SCRIPT §0.2 同口径；edge-tts 实际约快 10%）。

## 0 结论

骨架是对的：一个类比走到底，三翻（蒙眼 → 留最忙 → 留熟面孔）是全片最强的留存装置，压力机和蒙眼经理都是"笑点即解释"。
问题集中在四处：
1. **前 3 秒是一句重复**：封面字、第一句旁白、第一条字幕是同一句话（"A data-center AI, on one gaming card"），没有动词，
   没有矛盾；外行不知道"机房级"为什么值得停。中文第一句 3.9 s，超过圣经的 2.5 s。
2. **0:10-0:34 是全片最危险的 24 s**：钩子刚落地就做自我介绍（0:10.6），然后才证明"塞不下"。圣经 §6.1 要求 3-15 s 放
   "代价"，自我介绍应该挪到代价之后。
3. **最后一个揭晓（÷7，2:40）之后还有 35 s**：系统研究 14 s + 论文 14 s + 收尾 7 s。这是竖屏片掉人最多的位置。
4. **帖文和抖音标题根本不在稿里**（SCRIPT 只有"tok/s 只进帖子"这类注记）。§6 起草了。

按圣经 §6.4 打分（满 18，≥ 14 才发）：现稿约 **15**（第 1 项"封面 + 3 s 内主张"1 分；第 2 项"前 30 s 内有真东西"1 分；
第 9 项"最后一句可引用并回扣开头"1 分）。按本文改完约 **17**，全长从 3:20 降到约 **2:57（EN）/ 2:53（ZH）**。

## 1 前 3 秒

**现状**：第 0 帧服务器墙 + 红晕大脑 + 手写"A data-center AI / on ONE gaming card?"；0.3 s 旁白念同一句；2.2 s 镜头下滑，
3.5 s 大脑"噗"地塞进显卡。

| 项 | 判断 |
| --- | --- |
| 画面 | **好**。大脑塞进显卡正好落在 3 s 附近（X 官方："把最重要的画面放在第 3 秒"）。保留。 |
| 封面字 | 可以，但 EN 7 个词（圣经 ≤ 5）；ZH「机房级 AI 大模型」对抖音观众不具体，「Hacker News 首页」抖音没人认识。 |
| 第一句旁白 | **弱**：和封面字、字幕三重重复，浪费了静音观众的第一眼（字幕区和标题区读到的是同一句）；没有矛盾。 |
| 字幕 | b01 字幕与封面同句同时在屏，读两遍。 |

**改法**（旁白讲矛盾，封面讲问题，两者互补不重复）：
- b01 EN "This AI is too big for a gaming card." / ZH「这个 AI，一张游戏显卡装不下。」（12 字，约 2.7 s）
- b02 EN "A free program called Strata runs it on a gaming PC anyway. Programmers lost their minds."
  / ZH「可一个叫 Strata 的免费开源软件，偏偏在一台游戏电脑上把它跑起来了。国外程序员论坛直接炸了。」
  画面不变：旁白说"装不下"，画面里大脑硬塞进去、显卡一颤，正好是"偏偏"。这句矛盾也给结尾留了回扣（§4）。
- 封面字：EN 大字（红）"on ONE gaming card?"，小字（墨）"A data-center AI"（大字 4 个词）；标签保留 "Strata · front page
  of Hacker News"。ZH 大字「塞进一张游戏显卡？」，小字「1250 亿参数的千问大模型」，标签改「Strata · 冲上国外程序员论坛首页」
  （别写"刷屏"：它只是上了首页，910 分）。**千问是抖音观众认得的本土钩子**（Strata 跑的就是
  Qwen3.8-Flash-Next），圣经 §1 说 DeepSeek 这类本土钩子在抖音最有效，#23 允许题材模型名上屏。
- 封面的 3:4 网格裁切（y 240-1680）保得住 y 300-540 的手写字，1:1 裁切（y 420-1500）会切掉第一行：出图时 `?guides=1`
  加一张 1:1 和 3:4 裁切检查；放不下就把封面字下移进圣经 §8.4 的封面标题带 y 560-1000（只改第 0 帧，片中标题仍在 260-560）。
- 外行的"关我什么事"提前：b02 的 "on a gaming PC" / 「一台游戏电脑」 就是"在你自己家里"，B10 的大段可以缩（§3）。

## 2 每 15-20 s 一个理由继续看

现稿的钩子 / 揭晓时间线（来自 SCRIPT §3 旁白起点）：

| 时间 | 事件 | 类型 |
| --- | --- | --- |
| 0:00 | 机房 AI 塞进游戏卡？ | 开环 A：怎么塞得进 |
| 0:08 | "how does that even fit?" | 开环 A 重申 |
| 0:10.6-0:19 | 我们是谁 + "我们测到的规律" | 开环 B（埋得好，但位置太早） |
| 0:19-0:34 | 一大堆数字、十倍、压力机 | 升级 A；0:30 笑点 |
| 0:34 | "So how does it run?" README 的厨房 | 重申 A + 热点 |
| 0:50 | 128 位里只要 8 位 | **揭晓 1** |
| 0:56-1:04 | 专家；没有分科 | 术语 + 类比失效处 |
| 1:04 | 楼上楼下 = Strata 的诀窍 | **揭晓 2**（回答 A） |
| 1:17 | 楼梯慢 30 多倍 | 新问题 |
| 1:28 | 楼上留谁？ | 开环 C |
| 1:40 | 可真是随机的吗？我们留着单子 | **反转**（回收 B） |
| 1:47-2:04 | 4 个模型、2.4 万条、重放、700 万次 | **17 s 履历，没有新东西**（121 号画面没有旁白） |
| 2:04-2:20 | 三种规则 → 3 倍 | **揭晓 3（主结果）** |
| 2:25-2:40 | 93/100、÷7 | 揭晓 4 |
| 2:40-3:15 | 系统研究、论文、收尾 | **35 s 无新钩子** |

断档：0:10-0:30（自我介绍 + 讲数字）、1:47-2:04（履历）、2:40-3:15（收尾过长）。修法：
- **B1 和 B2 对调**：钩子 → 为什么塞不下（数字堆、十倍、压力机，正是圣经"3-15 s 放代价"）→ "So how does it run? Part of the
  answer is a pattern our lab measured. We're Picasso Lab, at UC San Diego."（先承诺，后自我介绍）/ ZH「那它是怎么跑起来的？
  答案里，有我们实验室测到的一个规律。我们是加州大学圣地亚哥分校的 Picasso 实验室。」→ 厨房。版图上 C、D 区对调即可，
  图书馆亮窗的伏笔不受影响。b04 原句不动（"Strata's has a hundred and twenty-five billion" 正好又点一次热点）。b06 去掉重复
  的问句：EN "Strata's own guide explains it with a kitchen. Let's go in." / ZH「Strata 的说明里，自己就拿厨房打比方。走，进去看看。」
- **b07 把一句让人困惑的话变成开环**："In the one we recorded" 在 0:41 没有上下文（"记录"要到 1:40 才解释）。改成
  EN "Picture a giant restaurant. We kept records on one: every station has a hundred and twenty-eight chefs." / ZH「想象一家
  超大的餐厅。其中一家，我们手里有记录：每个灶台，站着一百二十八位厨师。」，b16 回收："No need to guess: remember, we kept
  the order slips." /「不用猜——我们手里有单子。」 屏幕小字 "(Qwen3-235B, the model in our data)" 保留，128 位不被当成 Strata 的模型。
- **B7 的 121 号升为旁白揭晓**：这是观众第一次**亲眼看到**规律，比"将近七百万次点名"这种抽象大数有用得多。b18 改
  EN "Take Qwen3, a bigger cousin of Strata's. Watch chef 121: nineteen calls in forty words. Random would be two or three."
  / ZH「拿千问3来看，Strata 那个模型的大表哥。盯住 121 号：四十个词里叫了十九次。要是随机，也就两三次。」
  "≈ 6,800,000 chef calls" 只留在屏幕计数器上。这一拍同时给规则三（"刚被叫过的往往又被叫到"）铺好了直觉。
- **b17 压一口气**："Four giant AIs, over twenty-four thousand requests: every chef called, recorded, and put online." /
  「四个超大模型、两万四千多条请求，叫了谁全记了下来，还放到了网上。」（删 "Every word, every station"，画面上圈就够）。

改完的最大间隔约 13 s（新时间见 §8）。

## 3 节奏：值不值它的时间

| 段 | 现长 | 判断 | 动作 |
| --- | --- | --- | --- |
| B0 冷开场 | 10.6 s | 值 | 换 b01（§1）；论坛那拍保留，它是"热点"的社会证明 |
| B1 我们是谁 | 8.4 s | 位置错 | 挪到 B2 后，先承诺后介绍，约 9 s（含 "So how does it run?"） |
| B2 数字堆 + 压力机 | 15 s | 值（代价 + 笑点） | 原样，只微调字（b05 "ten gaming cards' worth"，ZH「得十多张游戏显卡」） |
| B3 厨房 | 30 s | 稍长 | b09 删 "Engineers call the chefs experts"（"experts" 之后旁白再没用过，不算"挣到位置"的术语；红笔标签留在画面上给 X 上的内行），保留"不分川菜粤菜"这个类比失效拍：EN "No soup chefs, no pastry chefs: the AI learned on its own whom to call." 省约 2 s |
| B4-B5 楼上楼下、楼梯 | 24.5 s | 值 | 不动 |
| B6 楼上留谁 | 12 s | 值，b15 太绕 | b15 EN 拆成两句短的："Say upstairs fits a quarter of the chefs. If calls were random, three of every four would be downstairs."（ZH 原句已经顺，不动） |
| B7 单子 | 23 s | 履历太长 | §2 的 b17 / b18 改法 |
| B8 三种规则 | 21 s | **全片核心，别砍** | 不动 |
| B9 一半 | 15 s | 值 | b23 去掉 "That's"：EN "Seven times fewer trips up the stairs than the blindfold. Fewer trips, faster answers." |
| B10 跟你有什么关系 | 14 s | 太晚、太长 | 和 b25 合成一句（§4） |
| B11 论文 | 14 s | 太长 | 合成一句（§4） |
| B12 收尾 | 7.6 s | 换句 | §4 |

旁白里的数（125 亿 / 十倍 / 三十多倍 / 2.4 万 / 700 万 / 1/4 / 1/2 / 3/4 / 93 / 7 倍）对外行太密；上面的改法把"700 万"下放到
屏幕，换成一个看得见的"19 次 vs 两三次"。

## 4 结尾

**现状**：b24-b25 系统研究（14 s）→ b26-b27 论文、奖、数据、"下一个 Strata"（14 s）→ b28 "It looks like chaos. It's a
pattern. And a pattern is something you can plan for." /「看着是一团乱麻，其实有规律。有规律，就能提前安排。」

- 最后一个揭晓之后 35 s，太长。压到约 20 s：
  - b24 EN "No new chip. Same hardware, used smarter: that's systems research, and it's how big AI moves onto your own
    computer." / ZH「不换新芯片，同样的硬件用得更聪明：这就是系统研究，大模型就是这样搬进你自己电脑的。」（真诚转折保留，
    "stays on your desk" 因 b02 已说"游戏电脑"可删）
  - b26 EN "It's from our paper, Patterns behind Chaos, a Best Paper Award at ISCA 2026. The slips are public: maybe
    you'll build the next Strata." / ZH「这些规律写进了我们的论文《混乱背后的规律》，拿了 ISCA 2026 最佳论文奖。单子全部
    公开：下一个 Strata，说不定就出自你手。」
- **最后一句**：现句像海报标语，ZH「提前安排」是公文腔，而且只回扣 B1 的图书馆，不回扣开头的矛盾。换成回扣钩子的一句：
  - EN **"The trick was never fitting it all in. It's knowing who's next."**
  - ZH **「诀窍从来不是全塞进去，而是猜准下一个轮到谁。」**
  它同时收掉开环 A（"装不下"）和开环 B（规律 = 能猜），"who's next / 轮到谁"是后厨里的话，也正是论文标题里的
  "Forecasting"。"chaos?" → "pattern." 的手写和 121 号连线画面保留（片名的回声在画面上，可引用的话在旁白里）。
  "猜准"不夸大：93/100 是猜，不是知道。
- 片尾卡最后 0.5 s 可以让纸面回到封面构图（服务器墙 + 大脑），X 循环播放时无缝接回第 0 帧（圣经 §6.3）。

## 5 热点用得好不好

- **好的**：Strata 在 0:04.6 就点名；README 自己的厨房比方（0:34）是最漂亮的"蹭"法，类比是借来的，不是硬套的；
  "大表哥"把我们的数据和 Strata 的模型诚实地连起来；"下一个 Strata"收尾。
- **缺的**：1:04（"Strata 的诀窍"）到 1:55（"大表哥"）之间 51 s 没有 Strata。b14 是天然的回接点：EN "So every trick like
  Strata's comes down to one question: who stays upstairs?" / ZH「所以 Strata 这类办法，说到底就一个问题：楼上留谁？」
  （README 自己说显卡留"最常用的几千个专家"，所以 Strata 确实在做"楼上留谁"的决定。）
- **抖音的热点不是 Hacker News**：中文版的钩子是"千问 + 一张游戏显卡 + 本地跑大模型"，Strata 是答案的载体。见 §1 封面、
  §6 标题。
- **别做**：别把规则二写成"Strata 的办法"（README 说"used most often"，但我们的"留最忙"是在另一半请求上学的静态热度，
  不是 Strata 的实现；暗示"Strata 比我们差一半"既不公平，也会在 HN 圈里招来反噬）。

## 6 X 帖文与抖音标题（原稿缺，起草）

**X 正文**（≤ 90 字符，沉浸式播放器只露 3 行；不放 emoji）：
- 推荐（79 字符）：`Strata runs a 125B AI on one gaming GPU. It shouldn't fit. Here's why it works:`
- 备选（88）：`Strata runs a 125B AI on one gaming GPU. It doesn't fit. It doesn't have to. Here's why:`

**第一条回复**（出处和诚实限定；每条 ≤ 280，URL 按 23 计）：
1. `Paper (ISCA 2026 Best Paper Award): arxiv.org/abs/2510.05497 · Our released traces: huggingface.co/datasets/core12345/MoE_expert_selection_trace · Strata: github.com/Niko1221/Strata`
2. `The film is a simulation on our Qwen3-235B traces (71 requests, 9,082 words), not a run of Strata. Rules 2-3 are simple rules written for this video, not the paper's method. "On one GPU" = GPU + system RAM; Strata's speeds are its author's.`
3. （可选，给内行）`Strata's own model: 48 layers x 512 experts, 10 per word + 1 always on (model card). Ours: 94 x 128, 8 per word. With half the experts on the GPU: random 50%, LRU 90%, our recency rule 93%.`

**抖音标题**（约 20 字，上限 30 未核实）：
- 推荐（22 字）：「1250亿参数的千问，怎么塞进一张游戏显卡？」
- 备选（18 字）：「显卡装不下的大模型，凭什么跑起来了？」
- 话题（3-5 个）：#大模型 #AI科普 #千问 #本地部署 #加州大学圣地亚哥分校
- 简介：「Strata（免费开源）把 1250 亿参数的千问大模型跑在了一台游戏电脑上。为什么塞得进去？我们用 ISCA 2026 最佳论文公开的
  后厨单子重放了一遍：留对人，楼上命中是瞎猜的 3 倍。基于我们公开的 Qwen3-235B 数据模拟，并非实测 Strata；Strata 的速度
  为其作者自报。论文 arXiv 2510.05497。」勾 AI 标注；合集「算力另计 · 热点篇」。

## 7 Top 10 改动（按对留存的影响排序）

1. **b01 换成矛盾句**，不再和封面字、字幕三重重复：EN "This AI is too big for a gaming card." / ZH「这个 AI，一张游戏显卡
   装不下。」（ZH 2.7 s，原句 3.9 s）。画面（大脑硬塞进显卡）不动，正好演"偏偏"。
2. **ZH 封面和冷开场换本土钩子**：小字「1250 亿参数的千问大模型」、大字「塞进一张游戏显卡？」；「Hacker News」→「国外程序员
   论坛」；b02 ZH 加「国外程序员论坛直接炸了」。
3. **B1 与 B2 对调**，自我介绍从 0:10 挪到约 0:26，并改成先承诺后介绍："So how does it run? Part of the answer is a pattern
   our lab measured. We're Picasso Lab, at UC San Diego."
4. **b07 的 "In the one we recorded" 改成开环**（"We kept records on one"），b16 回收（"remember, we kept the order slips"）。
5. **b18 改成 121 号揭晓**："Watch chef 121: nineteen calls in forty words. Random would be two or three." "700 万次"只上屏。
6. **b14 回接热点**："So every trick like Strata's comes down to one question: who stays upstairs?"
7. **结尾从 35 s 压到约 20 s**：b24+b25 合一句，b26+b27 合一句（奖只说一次，不做奖杯段）。
8. **最后一句换成回扣钩子的可引用句**："The trick was never fitting it all in. It's knowing who's next." /「诀窍从来不是全塞
   进去，而是猜准下一个轮到谁。」片尾卡末 0.5 s 回到封面构图，X 循环无缝。
9. **小刀**：b09 删 "Engineers call the chefs experts"（只留红笔标签），b15 EN 拆短句，b17 压一口气，b06 去重复问句。合计全长
   3:20 → 约 2:57（EN）/ 2:53（ZH）。
10. **补上帖文和标题**（§6），并替换 SCRIPT §7 的 X 删减表：现表删了 b14（全片核心问题）、b20（三翻的中间一级，三翻变两步就
    不成立）和 b27（热点收尾），这三样恰恰是留存装置。新删法见 §8.2。

## 8 改后的旁白表与时长

### 8.1 全长版（估算起点；未改的行照抄 `vo_lines.json`）
| 顺序 | id | 改动 | EN 起点 | ZH 起点 |
| --- | --- | --- | --- | --- |
| 1 | b01 | 换句 | 0:00.3 | 0:00.3 |
| 2 | b02 | 换句 | 0:04.4 | 0:03.6 |
| 3 | b04 | - | 0:11.1 | 0:10.8 |
| 4 | b05 | 微调 | 0:18.2 | 0:17.0 |
| 5 | b03 | 挪位 + 改写 | 0:25.9 | 0:23.7 |
| 6 | b06 | 去问句 | 0:35.2 | 0:34.2 |
| 7 | b07 | 开环 | 0:40.2 | 0:39.3 |
| 8 | b08 | - | 0:47.3 | 0:47.7 |
| 9 | b09 | 删半句 | 0:53.7 | 0:52.8 |
| 10 | b10-b13 | - | 1:00.3 | 0:57.9 |
| 11 | b14 | 回接 Strata | 1:25.2 | 1:19.0 |
| 12 | b15 | EN 拆句 | 1:30.7 | 1:23.8 |
| 13 | b16 | 回收开环 | 1:38.8 | 1:31.7 |
| 14 | b17 | 压缩 | 1:44.6 | 1:36.5 |
| 15 | b18 | 121 号 | 1:50.5 | 1:43.3 |
| 16 | b19-b21 | - | 1:59.4 | 1:52.8 |
| 17 | b22-b23 | b23 微调 | 2:19.3 | 2:13.4 |
| 18 | b24 | 合并 b25 | 2:33.6 | 2:27.1 |
| 19 | b26 | 合并 b27 | 2:41.8 | 2:36.1 |
| 20 | b28 | 换句 | 2:51.6 | 2:47.1 |
| - | 片尾卡 3.5 s | | 2:57.4 | 2:52.9 |

（含每句后 0.4-1.2 s 的画面余量；压力机、三翻 "3×"、最后一句后各留 1 s 以上。）

### 8.2 X 版（≤ 2:15，替换 SCRIPT §7）
删旁白、画面保留无声：b09（川菜粤菜名牌照样被划掉）、b13（计时器照响）、b17（纸箱和 "24,000+ · public" 手写照出）、b24。
缩：b03 只留 "How? Part of the answer is a pattern our lab measured."（"Picasso Lab · UC San Diego" 手写字照出）；b10+b11 合成
"Strata's trick: a small, fast kitchen upstairs, the graphics card. And a big break room downstairs, ordinary memory."；
b15 "Upstairs fits a quarter of them. If calls were random, three in four would be downstairs."；b23 "Seven times fewer
trips up the stairs."；b26 "It's from our Best Paper Award paper at ISCA 2026, and the slips are public. Maybe you'll
build the next Strata."；留白缩两成；片尾卡 3.0 s。**保留** b14、b20、b26、b28。估算 2:17（2.6 词/s），edge-tts 约 2:04；
TTS 后若超 2:15，再删 b05 后半句 "Even squeezed hard..."（压力机画面无声照演）。

## 9 本文新加或挪动的数字（给事实核查）
| 数 | 用在 | 出处 | 状态 |
| --- | --- | --- | --- |
| 121 号 40 个词里 19 次 | b18 旁白 | `../film/anim.json`（LiveCodeBench execution 第 0 个请求、第 46 层、40 个词），本次重算：121 x 19、95 x 16、23 x 14，共 66 位 | 真数据，已重算 |
| 随机"两三次" | b18 旁白 | 40 x 8 / 128 = 2.5 | 我们的算术 |
| 千问 = Qwen3.8-Flash-Next 的出品方 | ZH 封面、标题、简介 | HF `Qwen/` 组织（SCRIPT B7 来源已写） | **[check]** 发布前看一眼模型卡 |
| "on a gaming PC" / 「游戏电脑」 | b02 | README "Run a 125-billion-parameter AI model on your own gaming PC" | 已在 SCRIPT B0 来源 |
| "on one gaming GPU" | X 正文 | HN 标题 "on consumer hardware (RTX 4090)"；回复 2 写明 GPU + 内存 | 热点原话的转述 |
| 90% / 93% / 50%（回复 3） | X 回复 | `res_64.json`：LRU 0.895、decay 0.930、random 0.50 | 我们的模拟 |
| 48 x 512、每词 10 + 1 | X 回复 | HF 模型卡（SCRIPT B3 来源） | 已在 SCRIPT |
