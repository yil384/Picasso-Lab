# 试播集剧本 · 小品版（sketch-first）
## 《6710亿在编，370亿在岗》 / "671 Billion on the Payroll, 37 Billion on Shift"

这是一版参与比稿的剧本，角度是小品：整集就是一个荒诞医院小品，规则固定，角色是导诊员（旁白）和一只只会写便利贴的猫。
题材是 L14（MoE，Zhongkai Yu 主讲）加实验室 ISCA'26 最佳论文 *Patterns behind Chaos*。
写作日期 2026-10-04。

**结论先行**

- 比喻保留医院，理由见 0.1。我做了四处改造：
  - 「一整栋塔 = 一层」：直接用 look dev 已建好的 `hospital.js`，16×16 = 256 间诊室全在一面立面上，大堂就是全科。
  - 「58 栋塔 = 58 层」。
  - 「楼 = GPU」。
  - 「门上不挂科室牌」：这是类比失效点，写成了一个包袱。
- 已对齐 `picasso-edu-series` skill 里的安全措辞：
  - 「37B per token」，从不说 "at a time"。
  - 「每层 8 位 + 全科」。
  - 6.6× 一律带「模拟、晶圆级」。
  - 写作时 `episodes/e01-moe/FACTS.md` 还不存在，出来后请逐条再核一次。
- 全片按《八十一难》式的「院规」推进。7 条院规逐条打印、钉上墙，每条对应一个 MoE 机制。片尾这张院规纸就是全集的截图卡。
- 喜剧结构有五件：
  1. 三翻四抖：一个病人、8 扇门 → 一群病人 →「这整栋楼只是一层，一共 58 层」+ 320 栋楼 → 堵车。
  2. 装傻/吐槽：旁白一本正经，猫用便利贴吐槽。
  3. 一条三段式 running gag：「要排队吗？」
  4. 反转：「我们自己的论文第一页就写着 random」→ 两万四千个请求里的规律。
  5. 最后一句回扣，是一句回文：「以前是病人等专家；看懂了规律，就是专家等病人。」
- 默认片长 **2:08.5（128.5 s）**。可选的丁老师一句台词（占位）另加 3 s，用时 B4 减 1.5 s，总长落在 130 s。
- 本稿新核对的事实：
  - DeepSeek-V3 报告原文：671B 总参数、37B 激活；61 层，前 3 层不是 MoE（所以 MoE 层 = 58）；1 个共享专家 + 256 个路由专家，选 8；解码阶段 320 张 GPU、每张一个专家；bias 只用于路由。
  - *Patterns behind Chaos* 摘要原文：6.6× 是「未来晶圆级 GPU」上的平均值（series 规定的说法是「模拟、晶圆级」），1.25× 是「现有 GPU 上 MoE 计算最多」。
  - 实验室的 trace 数据集在 Hugging Face 上，需申请访问；含 DeepSeek-R1 等 4 个模型，可以直接驱动反转镜头。

---

## 0. 先写设定表：这家医院的规矩 = MoE 的机制

### 0.1 为什么还是医院（以及我考虑过的替代）

| 候选 | 中文观众 | 英文观众 | 能不能一条规则对一个机制 | 结论 |
| --- | --- | --- | --- | --- |
| **医院 / 专家门诊** | 「挂专家号」是全民痛点，「层层挂号」「号已挂满」都是现成的话 | specialist、waitlist、referral、copay 是美国观众的日常；「一次看 8 个专家」的荒诞感一眼就懂 | 能。分诊 = router，挂号单 = top-k，名医排队 = 负载不均，住院医师边看边学 = 只有被选中的专家才学习，院区 + 摆渡车 = 多 GPU + all-to-all，「熟客」= 规律 | **保留** |
| 餐厅后厨（256 个厨师） | 「后厨」不如「挂号」有情绪 | 好懂 | 「厨师没菜做就学不会」很勉强；「一道菜 8 个厨师按比例混」反而合理，没有荒诞感 | 弃 |
| 机场登机口 / 春运 | 强 | 强（holiday rush） | 只有交通，前半集的稀疏激活讲不出来 | 只借来做 B8 的堵车段 |
| 外卖骑手派单 | 强 | 弱（DoorDash 不对应「专家」） | 骑手不是「专家」，「专长是练出来的」讲不了 | 弃 |

医院的优势：前半集（稀疏、路由、训练平衡）和后半集（多机通信、规律）在同一个世界里，不用中途换比喻。
它的弱点是「专家」容易让人以为门后是心内科、皮肤科（L14 p.44 的陷阱）。这一点不藏，正面写成 B4 的包袱：「门上不挂科室牌」。

### 0.2 映射表（设定 → 系统）

| # | 医院设定（ZH / EN） | MoE 机制 | 出处 | 类比在哪里失效 → 怎么处理 | 节拍 |
| --- | --- | --- | --- | --- | --- |
| 1 | 病人 / patient | token（一个词或一个词片） | L14 p.4 | 词 ≠ token → 院规1 加红笔脚注「*严格说是 token，下集讲」，顺手给第 2 集埋梗 | B1 |
| 2 | 一栋塔里 256 间诊室（16 层 × 16 间的立面，`hospital.js`） / 256 specialists in one tower | 一个 MoE 层的 256 个路由专家（一整栋塔 = 一层） | L14 p.9；DS-V3 报告 §4.2 | 门后不是「科室」→ B4 吐槽；塔的 16 个物理楼层只是排布，不是层 → B7 用「这整栋楼只是一层」说清 | B1, B4, B7 |
| 3 | 大堂里的全科，灯常亮，人人必看 / the GP in the lobby everyone sees | 共享专家（每个 token 都经过） | DS-V3 §4.2（1 shared + 256 routed），§3.4.2（"always be selected"）；L14 p.26 | 只在画面和院规小字里出现，VO 不讲 | B1 |
| 4 | 分诊亭 + 从出票口吐出的挂号小票（8 个诊室号） / triage kiosk + the ticket from its slot | router / gate：给全部专家打分，取 Top-K | L14 p.10：h(x)=TopK(W_g·x) | 不出公式；DS-V3 实际用 sigmoid + 归一化（§2.1.2），课件写 softmax，所以画面不写公式 | B3 |
| 5 | 每人只看 8 位 / you see 8 | top-k = 8 | L14 p.9；DS-V3 §4.2 | — | B1, B3 |
| 6 | 8 张描图纸药方，按分数叠成一张 / 8 prescriptions blended by score | y = Σ p_i·E_i(x)，按权重加和 | L14 p.10 | 真实医院不会这么干 → 猫吐槽「哪家医院这么看病？」 | B3 |
| 7 | 专长是看病人看出来的 / specialties are learned on the job | 专家参数只从路由给它的 token 学习；没被选中的专家梯度为 0 | L14 p.14 | 人类医生没病人也能看书，专家不能；不提 | B4 |
| 8 | 没病人，学不会；猫睡在没人去的那半圈 / no patients, no learning | "Most experts are never trained" | L14 p.15 | — | B4, B5 |
| 9 | 名医门口排到桌子底下 / the famous doctor's queue | 负载不均 / routing collapse | L14 pp.15-16, p.22；DS-V3 §2.1.2 | 排队长度只是示意 → 画面挂「示意」小标签 | B5 |
| 10 | 太忙的专家挂号时悄悄往后排（不影响意见分量） / busy specialists quietly bumped down the list | DS-V3 的无辅助损失 bias：只用于选专家，不参与加权 | L14 p.17；DS-V3 §2.1.2 | 「只管挂谁，不管分量」写成红笔脚注 | B6 |
| 11 | 一条街 58 栋一模一样的塔，栋栋（层层）挂号 / an avenue of 58 identical towers, triage at each | 层：61 层，前 3 层是普通 FFN，后 58 层是 MoE，每层各有 router 和专家 | DS-V3 §4.2 | 前 3 层画成街口 3 座矮的「普通病房」 | B7 |
| 12 | 一栋细楼 = 一张 GPU；一个院区 = 一个节点（8 栋） / slim building = GPU, campus = node | 专家并行（EP） | L14 pp.21-22, p.26 | — | B7 |
| 13 | 一位专家一栋楼，另 64 栋给全科和替班 / one specialist per building, 64 more for the GP and stand-ins | 解码阶段 EP320：每张 GPU 只放一个专家，64 张放共享和冗余专家 | L14 p.26；DS-V3 §3.4.2 | 只在解码阶段成立（预填充是 32 张 GPU）→ 脚注写「解码阶段」 | B7 |
| 14 | 坐车去、再坐车回 / shuttle out, shuttle back | dispatch + combine，每个 MoE 层两次 all-to-all | L14 p.25（"2 x All2All in MoE"）；DS-V3 §3.4.2 | — | B8 |
| 15 | 堵车 / gridlock | 数据搬运成为多机推理的主要瓶颈 | *Patterns* 摘要；L14 pp.22-23 | 车流密度是示意 → 标「示意」 | B8 |
| 16 | 楼顶的红线调查板 / red-thread investigation board | 专家选择的 profiling：4 个模型、24,000+ 请求 | *Patterns* 摘要；L14 p.38 | 有 trace 授权就用真数据画线，否则标「示意」 | B9 |
| 17 | 常客 / regulars | Ob2：相邻 token 常选同一批专家（高层更明显，因模型而异）；Ob4：专家被选频率不均 | L14 p.40, p.44 | 「常常」，不说「总是」 | B9 |
| 18 | 搭子 / package deals | Ob5：某些专家对更常被一起选 | L14 p.45 | — | B9 |
| 19 | 读题时忙的诊室，写答案时还忙 / busy while reading = busy while answering | Ob3：prefill 和 decode 的专家频率分布相似 | L14 pp.41-42 | 「相似」不是「相同」→ 小标签 | B9 |
| 20 | 赶在高峰前把专家挪过去 / move specialists before the rush | 预测数据搬运 → 专家放置。现有 GPU：prefill-aware 专家放置，MoE 计算最多 1.25×；（模拟的）未来晶圆级 GPU：轻量架构改动，平均 6.6× | *Patterns* 摘要 | 两个数字都带限定词上屏；6.6× 一律说「模拟、晶圆级」 | B10 |
| 21 | *挂号费另计 / *copay not included | 系列脚注「*算力另计 / *compute not included」 | 发射片 v10 | — | B11 |

**刻意不画的**（理由见第 7 节）：
- DeepSeek「每个 token 最多去 4 个节点」的路由限制。它是 L14 p.28 那些「方块图案」的来源，画出来会让人误以为方块是天然规律。
- 冗余专家的动态搬迁（EPLB）。
- Attention 那一半的 TP/DP。
- 1991 年的历史。

### 0.3 院规七条（画面里的那张纸，也是片尾截图卡）

由热敏小票打印机逐条打出，黄铜图钉钉在桌面左侧的软木板上（x 80-420，始终在右侧 UI 栏以左）。

| # | ZH（思源宋体 + 红笔脚注用手写扫描） | EN（Instrument Serif + Caveat 红笔） |
| --- | --- | --- |
| 1 | 院规1　每个词，一位病人。*　〔*严格说是 token，下集讲〕 | RULE 1　Every word is a patient.*　〔*technically a token. Next episode.〕 |
| 2 | 院规2　专家256位，每人只看8位。（另：全科1位，人人必看） | RULE 2　256 specialists. You see 8. (Plus the GP. Everyone sees the GP.) |
| 3 | 院规3　分诊台挑前8位，按分数采纳意见。 | RULE 3　Triage books your top 8 and weighs what they say. |
| 4 | 院规4　没病人，学不会。 | RULE 4　No patients, no learning. |
| 5 | 院规5　太忙的专家，挂号时悄悄往后排。*　〔*只管挂谁，不管意见分量〕 | RULE 5　Too busy? Quietly moved down the list.*　〔*changes who you see, not how much they count〕 |
| 6 | 院规6　这整栋楼只是一层：共58层，层层挂号。 | RULE 6　This tower is one layer. 58 layers, new triage at each. |
| 7 | 院规7　一位专家一栋楼。楼 = GPU。 | RULE 7　One specialist per building. Building = GPU. |

### 0.4 喜剧引擎

**装傻 / 吐槽的分工**（相声里的逗哏 / 捧哏，漫才里的 boke / tsukkomi）

- **旁白 = 导诊台**，是装傻的一方。他把荒诞的院规当成天经地义，一本正经地念：一次看 8 个专家、意见按分数兑在一起、一位专家独占一栋楼。他念的每一句都是真机制。
- **猫 = 第一次来的病人**，是吐槽的一方，替观众问出「这也行？」。便利贴每张 ≤10 个汉字 / ≤6 个英文词，红笔手写。
- 有两处角色反过来，由猫装傻：
  - 「一人一栋？？」：猫的惊讶就是观众的惊讶，旁白用数字回答。
  - 「我还是排队吧」：猫给出一个错误的偏好，旁白用「路上贵」纠正。
- 包袱的结构固定是三步：荒诞的规则（真机制）→ 猫吐槽 → 旁白一本正经地答（答案就是解释）。所以笑点就是讲解本身，不是装饰。

**三翻四抖**（升级靠规模，节奏靠打印机）

每一翻的形式相同：打印机吱吱声 → 小票打出院规 → 图钉「嗒」一声钉上墙 → 机位升高一级。

| 步 | 规模 | 画面 | 结果 |
| --- | --- | --- | --- |
| 一翻 | 1 个病人，1 层，8 扇门 | 8 盏灯亮，248 盏暗 | 「省就省在这」 |
| 二翻 | 一大群病人 | 名医门口的队排到桌子底下，猫睡在暗的那半圈 | 用 bias 平衡后：「完事了？还没。」 |
| 三翻 | 「这整栋楼只是一层」→ 58 栋（58 层）→ 320 栋细楼 | 一条街 58 栋塔；整条街折叠倒下，一座 320 栋细楼的立体书纸城弹起来 | 「一人一栋？？」「320块GPU。」 |
| **四抖** | 每个词 × 每层 × 去 + 回 × 所有请求 | 纸巴士堵死，打印机卡纸，猫埋在小票里 | 「看病不贵，路上贵。」问题从门口转到了路上 |

**running gag：「要排队吗？」**（埋 → 升级 → 反转，同一张黄便利贴、同一个位置、同一个音效）

| 次 | 时间 | 便利贴 | VO |
| --- | --- | --- | --- |
| 埋 | 0:18 | 要排队吗？ / Is there a wait? | 暂时不用。 / Not yet. |
| 升级 | 0:45 | 要排队吗？？（字更大） / Is there a wait?? | 现在要了。 / Now there is. |
| 反转 | 1:55 | 要排队吗？ / Is there a wait? | 不用了。以前是病人等专家；看懂了规律，就是专家等病人。 / Not anymore. … |

**反转**：前 80 秒整个小品都在说「乱」，堆到堵车为止。然后自嘲：连我们自己的论文第一页都写着 "random"。紧接着是两万四千个请求的红线，乱里长出了常客、搭子和「读题时忙 = 写答案时忙」。

**回扣**：最后一句同时回扣两处，一是「要排队吗」，二是 0:00 的「在编 / 在岗」（片尾小票）。

---

## 1. 标题、logline、ONE idea、片长

**标题**

- ZH：《6710亿在编，370亿在岗》，副标题「大模型里的专家门诊」，系列行「算力另计 · 第01项」。
  - 抖音标题建议：「DeepSeek有256个专家，你每打一个字只能挂8个号」
- EN："671 Billion on the Payroll, 37 Billion on Shift"，subtitle "Inside the 256-specialist hospital (Mixture of Experts)"。
  - X 帖首行：「DeepSeek-V3 has 256 experts. Each word sees 8.」

**Logline**

- ZH：一只戴红贝雷帽的猫走进一家医院：一栋楼 256 位专家，这样的楼一共 58 栋，最后还要摊成 320 栋，想弄明白两件事：为什么每个词只看 8 位专家；为什么这家医院最后堵的不是诊室，是路。直到有人在楼顶拉了两万四千根红线。
- EN: A cat in a red beret walks into a hospital: 256 specialists in one tower, 58 identical towers, and eventually 320 buildings. It wants to know why each word only sees eight doctors, and why the jam ends up on the roads instead of at the doors. Then someone strings 24,000 requests' worth of red thread across the rooftops.

**ONE idea**

- ZH：混合专家模型是一家巨型医院：编制很大，但每个词只挂 8 个号，所以算力只为「在岗」的那部分付钱。代价从诊室转移到了路上，也就是 GPU 之间的数据搬运。而这些路线看着乱，其实有规律，可以预报。
- EN: A mixture-of-experts model is a huge hospital where each word sees only eight specialists, so you pay for the visit, not the payroll. The cost moves from the doors to the roads between GPUs, and that traffic, which looks random, can be forecast.

**片长**

- 默认 2:08.5（128.5 s，第 3 节逐拍时间码）。
- 加丁老师那句占位台词（+3.0 s）时，B4 的 117 号门延时段缩 1.5 s，总长 130.0 s。
- 硬上限 135 s，X 上限 2:20，均有余量。

---

## 2. 封面 / 第 0 帧（1080×1920）

第 0 帧就是封面。它是 X 自动截取的缩略图，也是 X 循环播放回来的那一帧。片尾最后一帧的构图要回到这里（去掉标题字）。

```
y    0 ┌─────────────────────────────────────────┐
       │  K-TOP：只放背景。绿罩银行灯的灯罩        │  灯罩在 x 80-360，y 120-380，
       │  和暖光晕                                │  只当背景
  260  ├─────────────────────────────────────────┤
  300  │  系列字标（小、灰）                        │  EN Instrument Serif Italic 40 px：
       │                                         │  "Compute Not Included"
       │                                         │  ZH 思源宋体 40 px：「算力另计」
  390  │  小票行（等宽，印在真的热敏纸条上，        │  "No.01  MoE ........ 37B / 671B"
       │  纸条从右侧打印机里出来；打印机在         │  「第01项  MoE ……… 671B里用37B」
       │  x 760-1020，y 260-560；y 700 以上        │  JetBrains Mono / 更纱等宽 34 px；
       │  可以用到 x 1020）                        │  行首一个绿色小勾（ML 系统色 #63d36f）
  560  ├────────── 封面标题带 x 100-880 ──────────┤
  620  │  EN（Instrument Serif 128 px，两行）：    │
       │    671B on payroll.                     │
       │    37B on shift.                        │
       │  ZH（思源宋体 Bold 132 px，两行）：       │
       │    6710亿 在编                           │  每行约 680 px 宽
       │    370亿 在岗                            │
       │  「on shift / 在岗」下面一道真红笔         │
       │  下划线（ink_pen_* 扫描）                 │
  960  │  标题后面是虚化的医院塔上层：一排排诊室    │  用边缘压暗保证对比，
       │  退进暗处，屋顶灯箱招牌（移轴虚化）        │  不用黑底框
  980  ├────────── 主体 x 60-880 ─────────────────┤
       │  医院塔模型（白卡纸，45° 俯视），         │
       │  大堂玻璃门在 x 160-420，y 1240-1400；    │
       │  门上一张黄便利贴：                       │
       │  「剩下的呢？」 / "And the rest?"         │
       │  猫（cat_sit）x 620-860，y 1080-1460，    │  在右侧 UI 栏（x 880）以左
       │  盯着塔看                                 │
       │  奶茶杯 x 80-200，y 1320-1460             │
       │  来源小字（等宽 30 px，y 1440）：          │
       │  "DeepSeek-V3 Technical Report ·         │
       │   arXiv 2412.19437"                     │
 1480  ├─────────────────────────────────────────┤
       │  K-BOT：桌子前沿落在阴影里，什么都不放     │
 1920  └─────────────────────────────────────────┘
```

**裁切检查**

- 3:4 网格裁切（y 240-1680）：系列字标、标题、塔和猫都在里面。
- 1:1 裁切（y 420-1500）：标题带和猫都在里面。
- 4:5 裁切（y 285-1635）：同样全部在里面。

**另出两张图**

- `cover_1080x1440.jpg`：抖音 3:4 封面。
- 只有画、没有字的版本：留着以后账号认知度高了，做何同学式的极简封面。

**为什么这样定**

- 封面标题是一个可以核对的反差（在编 / 在岗）。封面标题规则是中文 ≤8 字或英文 ≤4 词。中文每行 7 字，合规。英文两行一共 6 个词，超了，但都是短词，读的是节奏。
- 便利贴「剩下的呢？」制造好奇缺口，而且它就是 B0 的第一个吐槽。
- 白猫在暗桌面上，缩略图尺寸下也认得出（`cover_mock_sheet.jpg` 已经验证过）。

---

## 3. 分镜节拍表

**通用设定**

- **桌面布景**：夜里的胡桃木桌（Wood026），绿罩银行灯，热敏小票打印机，奶茶，红笔。重新搭成 9:16，灯在画面上方的 K-TOP 区。暖色主光，冷色轮廓光，移轴式浅景深（焦平面跟着 camPath 走）。
- **医院塔**：直接用 look dev 已建好的 `.claude/films/edu/look/hospital.js`。
  - 白卡纸建筑模型，16 层 × 16 间 = 256 间诊室，编号 001-256，从一楼往上、从左到右。
  - 每层门前有开放走廊和栏杆；亮灯的诊室开门，暖光洒在走廊上。
  - 大堂灯常亮 = 全科（共享专家）。雨棚下是分诊亭（router），带亮屏和出票口。屋顶有一个灯箱招牌，招牌字跟着语言换。
  - **这一整栋塔 = 一个 MoE 层**。它自己的 16 个物理楼层只是排布，VO 从不把它们叫作「层」。
  - B7 需要新增两样：一条 58 栋塔的街（低细节实例），街口 3 座矮的「普通病房」。
- **镜头**：景深用 `look/accum.js` 的真镜头景深（32 个光圈采样平均）。
- **病人**：`tileKit` 的象牙色小牌，竖着立，正面刻一个词。病人连起来就是一句奶茶订单（系列梗）。
  - EN 牌面：one / milk / tea / less / sugar
  - ZH 牌面：一杯 / 奶茶 / 少 / 糖
  - 牌面是画面内文字，每种语言各渲染一次。
- **字幕**：烧在 S 区（x 120-880，y 1200-1440）。EN 每行 ≤26 字符，ZH 每行 ≤12 字，最多两行，一句 VO 一个字幕事件，不跨镜头。
- **猫**：只用已有的、已抠像并带深度图的姿势。不能凭空出现：每次换姿势都藏在一帧运动模糊里，或者由画面内的动作引出。
- **画面内文字**：全部从字符串表 `?lang=en|zh` 读，每种语言渲染一遍。

**节拍总览**

| 拍 | 时间码 | 幕 | 三翻四抖 | 院规 | 猫的便利贴（ZH / EN） |
| --- | --- | --- | --- | --- | --- |
| B0 | 0:00.0-0:07.5 | 冷开场 | | | 剩下的呢？ / And the rest? |
| B1 | 0:07.5-0:18.0 | 场景错位 | | 1、2 | |
| B2 | 0:18.0-0:21.0 | 埋梗 | | | 要排队吗？ / Is there a wait? |
| B3 | 0:21.0-0:33.0 | 分诊 | 一翻 | 3 | 哪家医院这么看病？ / What hospital works like this? |
| B4 | 0:33.0-0:41.0 | 类比失效 | | 4 | 117看什么科？ / Dr. 117's specialty? |
| B5 | 0:41.0-0:51.0 | 排队 | 二翻 | | 要排队吗？？ / Is there a wait?? |
| B6 | 0:51.0-1:00.5 | 平衡 | | 5 | |
| B7 | 1:00.5-1:11.5 | 楼层与楼 | 三翻 | 6、7 | 一人一栋？？ / One building EACH? |
| B8 | 1:11.5-1:22.5 | 堵车 | 四抖 | | 我还是排队吧 / I'll take the queue. |
| B9 | 1:22.5-1:39.5 | 反转 | | | |
| B10 | 1:39.5-1:53.5 | 收益（安静区） | | | |
| (B10b) | +3.0 s | 丁老师一句（占位，可删） | | | |
| B11 | 1:53.5-2:08.5 | 回扣 | | 盖章 | 要排队吗？ / Is there a wait? |

---

### B0 · 0:00.0-0:07.5 · 冷开场：在编 / 在岗

**画面**

- 0.0-0.4：第 0 帧（封面）静止。
- 0.4 起：一条 camPath 缓慢推进，推进约 8%，同时略降，朝大堂玻璃门去。
- 封面标题字在 VO 念完前两句后（约 4.6 s）以印刷错版的方式退场，在此之前一直留在屏上，静音观众能读到。
- 4.6：猫从 cat_sit 换到 cat_bat（换姿势藏在一帧运动模糊里），爪子点一下门上那张便利贴（便利贴从第 0 帧就在，不会凭空出现），便利贴抖了一下。
- 5.4：「在看别的病人」时，机位推近立面：几十块小牌分别站在各个亮着的门口。答案就在画面里：其他专家正在接待别的词。

**转场**：推进不停，穿过玻璃门（便利贴从画左滑出），景深切到分诊台，接 B1。

**VO EN**：
> 671 billion on the payroll. Per word, 37 billion on shift.
> *(0.8 s: the cat taps the note)*
> Seeing other patients.

**VO ZH**：
> 6710亿在编，每个词，370亿在岗。
> （停 0.8 s，猫点便利贴）
> 在看别的病人。

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 封面标题 | 671B on payroll. / 37B on shift. | 6710亿 在编 / 370亿 在岗 |
| 小字 | DeepSeek-V3 · parameters per token | DeepSeek-V3 · 参数 · 每个token |
| 小票行 | No.01 MoE ........ 37B / 671B | 第01项 MoE ……… 671B里用37B |
| 便利贴 | And the rest? | 剩下的呢？ |
| 来源小字 | DeepSeek-V3 Technical Report, arXiv 2412.19437 · CSE 291P L07 p.32 | 同左 |

**喜剧手法**：预期违背 + 第一次装傻/吐槽。猫问的就是观众心里的问题；旁白一本正经的回答本身就是机制（稀疏激活：不同的词用不同的专家）。

| 检验 | 结果 |
| --- | --- |
| 理解 | 只有明白了「每个词只用一小撮，其余专家在服务别的词」，这句才好笑 ✓ |
| 真实 | 在批量服务里，其余专家确实在处理别的 token ✓ |
| 数字 | 671B / 37B 有出处 ✓ |
| 类比失效 | 不适用 |

**SFX**：台灯嗡声底噪，打印机待机的「嗒」，爪子碰纸，大堂里压低了的小牌碰撞声（微缩感）。

**数字出处**：671B 总参数、每个 token 激活 37B，见 DeepSeek-V3 Technical Report 摘要第一句（arXiv 2412.19437）、L07 p.32（"DeepSeek V3 MoE 671B/37B"）。L14 p.9 写的是 36B，见第 7 节。

---

### B1 · 0:07.5-0:18.0 · 场景错位：这是一家医院（院规 1、2）

**画面**

- 7.5-9.0（片头 stinger，≤1.5 s）：打印机吱吱打出一行「No.01 MoE …」，红笔在这一行打勾。
- 9.0：机位在大堂雨棚下，贴着小牌的高度，移轴虚化。
  - 一条热敏小票从画面上方垂下来（打印机在模型后面的桌沿），打着「院规1」，被黄铜图钉钉到桌面左侧的软木板上。
  - 5 块小牌「one / milk / tea / less / sugar」嗒嗒排到分诊亭前。
- 12.5：「院规2」打印、钉板。
- 机位一条摇臂从大堂沿立面升起：16 层走廊，256 间诊室，门牌 001-256，灯都不亮。只有大堂（全科 / GP）的暖光一直亮着。

**转场**：摇臂停在立面中段；景深切到塔旁巨大、虚化的猫脸，接 B2。

**VO EN**：
> DeepSeek-V3 is a mixture of experts: a hospital, basically. Rule one: every word is a patient. Rule two: 256 specialists. You see eight.

**VO ZH**：
> DeepSeek-V3，混合专家模型，就是家医院。院规一：每个词，一位病人。院规二：两百五十六位专家，你只看八位。

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 院规条 1 | RULE 1 · Every word is a patient.* | 院规1 · 每个词，一位病人。* |
| 红笔脚注 | *technically a token. Next episode. | *严格说是token，下集讲 |
| 院规条 2 | RULE 2 · 256 specialists. You see 8. (Plus the GP. Everyone sees the GP.) | 院规2 · 专家256位，每人只看8位。（另：全科1位，人人必看） |
| 大堂门楣刻字卡 | DeepSeek-V3 · Mixture of Experts | DeepSeek-V3 · 混合专家门诊 |

**喜剧手法**：

- 场景错位的设定。院规像《八十一难》那样贴出来，规则固定，这一节奏会在每一翻重复（打印声 → 院规条 → 钉板）。
- 脚注是一个小吐槽：自己先承认「词 ≠ token」，同时给第 2 集埋梗。

| 检验 | 结果 |
| --- | --- |
| 理解 | 院规本身就是机制 ✓ |
| 真实 | 256 个路由专家 + 1 个共享专家，top-8 ✓ |
| 数字 | 有出处 ✓ |
| 类比失效 | 词 ≠ token 已用脚注标出 ✓ |

**SFX**：打印机吱吱声（系列声音标识 2 号），图钉「嗒」，麻将牌落在卡纸地板上，远远的大堂人声。

**数字出处**：L14 p.4（定义）、p.9（DeepseekV3：每层 256 个专家，选 8 个）；DS-V3 §4.2（"1 shared expert and 256 routed experts … 8 experts will be activated for each token"）；§3.4.2（共享专家 "always be selected"）。

---

### B2 · 0:18.0-0:21.0 · 埋梗：要排队吗？

**画面**

- 猫（cat_sit，在塔旁，虚化）伸爪（cat_bat），把第 2 张便利贴贴在二楼走廊的栏杆上：「要排队吗？」。
- 走廊空空的，门都是暗的，没有队。
- VO 说完后留 0.8 s 空白。

**转场**：一块小牌「milk」走到楼下分诊亭的屏前；机位跟着它降下去，接 B3。

**VO EN**：
> Not yet.

**VO ZH**：
> 暂时不用。

**画面内文字**：便利贴 EN「Is there a wait?」/ ZH「要排队吗？」

**喜剧手法**：running gag 第 1/3 次（埋）。「暂时」是给后面的预告。

| 检验 | 结果 |
| --- | --- |
| 理解 | 这里只是医院笑话。这是埋梗，喜剧规则允许；它在 B5（负载不均）和 B11（专家放置）兑现成讲解 |
| 真实 | ✓ |
| 数字 | 无 |

**SFX**：便利贴拍上去的声音（纸 + 轻拍，**这一个采样在 B5、B11 原样复用**），可选一声真实的猫「呜」，然后安静。

**数字出处**：无。

---

### B3 · 0:21.0-0:33.0 · 一翻：分诊台挑前 8 位，意见按分数合成（院规 3）

**画面**

- 21.0：分诊亭微距（移轴；即 look dev 里的 triage macro 镜头）。
  - 牌「milk」停在亭前，亭子的亮屏闪一下。
  - 出票口吐出一卷热敏挂号小票，上面印 8 个诊室号和条码。小票是从机器里出来的，不是凭空出现（skill 的教训）。
  - **不写分数数字**，权重只在后面的描图纸上用墨色轻重表示。
- 24.0：切到立面，恰好那 8 间诊室依次亮灯开门（相隔 40 ms），暖光洒到走廊上。
  - 不画飞过去的光束，只是灯亮。
  - 8 个房号用 look.html 里的 `LIT`（示意），有 trace 就换成真实的。
- 25.5：8 间亮着的诊室各递出一张描图纸「药方」。药方用真实手写扫描，故意写成看不懂的医生字。
  - 8 张飘下来叠在小牌上：墨深的（分高的）压过墨浅的，叠成一张能读的方子。
  - 半透明描图纸的叠加，就是加权求和。
- 28.0：猫的第 3 张便利贴拍在分诊台边：「哪家医院这么看病？」
- 29.0：VO 说「就这家」。机位后拉，让 8 盏亮灯和 248 扇暗门同框：省下来的部分一眼可见。院规条 3 钉板。

**转场**：猫的眼珠向右转，机位沿立面平滑横移，跟着它的视线停在一扇暗门（117）前，接 B4。

**VO EN**：
> Rule three: triage scores every specialist and books your top eight. Eight answers, blended by score.
> *(note lands)*
> This one. Asking eight, not 256: that's the whole trick.

**VO ZH**：
> 院规三：分诊台给专家打分，挂前八名。八份意见，按分数合成一份。
> （便利贴）
> 就这家。问八位，不问全部，省就省在这。

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 院规条 3 | RULE 3 · Triage books your top 8 and weighs what they say. | 院规3 · 分诊台挑前8位，按分数采纳意见。 |
| 挂号小票抬头 | TRIAGE · ROOMS | 分诊 · 诊室号 |
| 便利贴 | What hospital works like this? | 哪家医院这么看病？ |

**喜剧手法**：

- 场景错位的荒诞：真实医院不会把 8 张药方兑成一张。猫吐槽，旁白一本正经地回「就这家」。
- 笑点在荒诞本身，紧跟的那句就是概念：稀疏 = 省。
- 门控公式用描图纸演出来，这是 act-out。

| 检验 | 结果 |
| --- | --- |
| 理解 | 「问八位，不问全部」要看见 248 扇暗门才好笑 ✓ |
| 真实 | router 给全部专家打分，取 top-k，加权求和；描图纸叠加 = 加权和；画面不出 softmax 公式（DS-V3 实际用 sigmoid + 归一化）✓ |
| 数字 | ✓ |
| 类比失效 | 吐槽本身就点出了失效处：真医院不这么干 ✓ |

**SFX**：热敏打印的「吱」（一短声），8 盏灯依次「嗒」，门轴轻响，描图纸沙沙声，便利贴。

**数字出处**：L14 p.10（h(x)=TopK(W_g·x)，p=Softmax(h)，y=Σ_{i∈K} p_i·E_i(x)）；p.9（256 选 8）；DS-V3 §2.1.2（门控值来自亲和分数）。

---

### B4 · 0:33.0-0:41.0 · 类比失效：117 号看什么科？（院规 4）

**画面**

- 机位停在 117 号门前：门是暗的，黄铜门牌「117」。旁边一个**空的科室牌插槽**：本来该插「心内科」的地方是空的。
- 背景是巨大的猫眼和白毛（虚化，蓝眼睛）。需要新画一张特写 `cat_peek`，没有就用 cat_sit 裁切 + 景深代替。
- 便利贴 4：「117看什么科？」
- 36.0：旁白回答时，旁边 118 号门里有一段小延时：小牌一趟趟来看病，它的科室牌插槽里，一张卡片被红笔自己慢慢写满（用 pen_squiggle 扫描，内容读不出来）。专长是看出来的。117 的插槽一直是空的。
- 38.5：院规条 4 钉板。

**转场**：大堂门被一大群小牌冲开（延时），机位后拉上升，接 B5。

**VO EN**：
> No sign on the door. Nobody assigns specialties; they're learned from patients. Rule four: no patients, no learning.

**VO ZH**：
> 门上不挂科室牌。专长没人分配，是看病人看出来的。院规四：没病人，学不会。

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 便利贴 | Dr. 117's specialty? | 117看什么科？ |
| 院规条 4 | RULE 4 · No patients, no learning. | 院规4 · 没病人，学不会。 |

**喜剧手法**：把类比的弱点直接做成吐槽（comedy.md 3.2 第 4 项检验），同时用它引出训练机制。这一拍是全片防「专家 = 科室」误解的关键。

| 检验 | 结果 |
| --- | --- |
| 理解 | 只有意识到「专家」不是心内科、皮肤科，这句才好笑 ✓ |
| 真实 | 路由是学出来的；只有被选中的专家有梯度；课件 p.44 显示各科目之间有重叠 ✓ |
| 数字 | 无 |
| 类比失效 | 这一拍就是失效点本身 ✓ |

**SFX**：红笔自动写字的沙沙声，图钉。

**数字出处**：L14 p.14（未被选中的专家 E_j，这一项 = 0），p.15（"Most experts are never trained"），p.44（"Top experts across different subjects and language share differences and similarities"）。

---

### B5 · 0:41.0-0:51.0 · 二翻：来一群病人 → 名医门口排到桌子底下

**画面**

- 41.0：机位升高到全景，延时。一大批小牌（一个训练 batch）涌进大堂。
  - 分诊台反复打同几个孔。041 号和旁边两扇门前排起长队。
  - 队沿着几层走廊排开，顺楼梯下来，出大堂，穿过胡桃木桌面，从**桌子边缘掉下去**。机位跟着队往下摇，摇进桌下的黑暗里，这是排队这个包袱的「抖」。
- 45.0：桌沿、队伍掉下去的地方，贴着猫的同款黄便利贴，字更大：「要排队吗？？」
- 46.0：VO「现在要了」。机位回到上方：
  - 立面的左半边一直是暗的，灯从没亮过，门牌上落了一层细灰。
  - 猫（cat_sleep）趴在塔顶睡着了，身子垂下来盖住左半边大约一百间暗诊室，像一朵云压在一座城上。有轻微的呼噜声。

**转场**：一支红笔（prop_pen 的 3D 版）滚进画面，滚向分诊台的台账，接 B6。

**VO EN**：
> Add a crowd. Left alone, triage keeps picking the same few doors.
> *(note)*
> Now there is. The rest never see a patient, and never learn.

**VO ZH**：
> 来一群病人。没人管的话，分诊台总挂那几位。
> （便利贴）
> 现在要了。其余的专家没病人，也就学不会。

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 便利贴 | Is there a wait?? | 要排队吗？？ |
| 041 号门口的牌 | FULLY BOOKED | 号已挂满 |
| 队伍旁的等宽小字 | illustrative | 示意 |

队伍长度不是数据，所以标「示意」。如果拿到 trace，041 换成真实的热门专家编号，标签改成模型名和层号。

**喜剧手法**：

- 三翻四抖的第二翻：一个病人 → 一群病人。
- running gag 第 2/3 次（升级）。
- act-out：队排到桌子底下，就是 routing collapse 的样子。
- 猫睡着有两层：一是自嘲式的节奏警报，二是那些「从来没被训练的专家」。

| 检验 | 结果 |
| --- | --- |
| 理解 | 知道院规 4 之后，猫睡在暗的那半圈才读得出「这些专家学不会」 ✓ |
| 真实 | 不做平衡时，总是少数专家被选中，大多数从未被训练（训练阶段）✓ |
| 数字 | 没有数字 ✓ |

**SFX**：延时的小牌哗啦声（升调），小牌一块块从桌沿掉下去（嗒……嗒……嗒，三声），便利贴（同一采样），真实的猫呼噜声。

**数字出处**：L14 p.15、p.16（"If a few experts are always chosen, the Loss will be large"）；DS-V3 §2.1.2（"routing collapse"）。

---

### B6 · 0:51.0-1:00.5 · 平衡：太忙的悄悄往后排（院规 5）；对吧？不对

**画面**

- 51.0：分诊台台账微距（一本很小的装订本，256 行）。
  - 红笔在忙的门号（041……）旁边打小小的「−」，在闲的门号旁边打「+」。这就是 bias。
  - 041 号门的插槽里滑进一张小卡：「隔壁也看得好」。
- 54.0：队伍散开，流向暗的门；立面上的灯一片片均匀地亮起来。
  - 一块小牌走岔了，撞上熟睡的猫的尾巴。猫惊醒（cat_scared），然后坐起（cat_sit），毛是乱的。
  - 这一跤有物理原因：平衡之后，没人去的那半圈来病人了。
- 56.0：院规条 5 连同红笔脚注钉板。整面楼均匀地亮着暖光。
- VO「平衡了。完事了？」，停 0.6 s，「还没。」

**转场**：机位开始后拉并升高，越过塔顶，接 B7。

**VO EN**：
> DeepSeek-V3's fix: quietly bump busy specialists down the list. It changes who you see, not how much they count. Balanced. Done?
> *(0.6 s)*
> Not quite.

**VO ZH**：
> DeepSeek的办法：太忙的专家，挂号时悄悄往后排，只管挂谁，不管意见分量。平衡了。完事了？
> （停 0.6 s）
> 还没。

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 台账抬头 | TRIAGE LEDGER | 分诊台账 |
| 041 号门卡片 | Next door's good too | 隔壁也看得好 |
| 院规条 5 | RULE 5 · Too busy? Quietly moved down the list.* | 院规5 · 太忙的专家，挂号时悄悄往后排。* |
| 红笔脚注 | *changes who you see, not how much they count | *只管挂谁，不管意见分量 |

**喜剧手法**：

- 有物理原因的 act-out 打闹：修复手段直接把猫吵醒了。
- 「对吧？不对」式的假解决（creators.md 5.4 第 4 条），用来分幕。

| 检验 | 结果 |
| --- | --- |
| 理解 | 猫被撞醒 = 闲置专家终于有病人了，没看过 B5 就不好笑 ✓ |
| 真实 | bias 只加在 top-K 选择上，加权仍用原始分数；训练时更新，推理时固定（画面是台账，不讲具体时间）✓ |
| 数字 | 无 |
| 类比失效 | 「悄悄」= 不加额外的损失项（aux-loss-free），只隐含，不展开 |

**SFX**：红笔划纸，卡片滑入，灯一片片「嗒嗒」亮起，一声短促的真实猫叫（受惊），然后「还没」之前完全安静。

**数字出处**：L14 p.16（DS V1/2 的负载均衡损失），p.17（bias "Only used for expert selection, not weighted addition"；"Dynamically updated during training, but stays unchanged when inference"）；DS-V3 §2.1.2（"the bias term is only used for routing"）。

---

### B7 · 1:00.5-1:11.5 · 三翻：「这整栋楼只是一层」→ 58 层 → 一位专家一栋楼（院规 6、7）

**画面**

- 60.5：机位越过塔顶灯箱招牌继续后拉、升高。VO 说「这整栋楼只是一层」。
  - 后拉不停：塔后面沿着一条笔直的街，又站着 57 栋一模一样的塔，一路退进黑暗（移轴，低细节实例）。
  - 每栋屋顶的灯箱写「Layer 1/58 … 58/58」。
  - 街口有 3 座矮的朴素亭子「普通病房 1-3 / General ward 1-3」（前 3 层 dense）。
  - 一块小牌沿街一栋一栋走过去，每栋分诊亭各吐给它一张新的挂号小票（延时），小票在它推的小托盘里越摞越高（58 张）。
- 65.0：猫（cat_jump）跳上桌，落在街尾做比例尺；爪子（cat_bat）一拨，把垫在下面的泡沫板**像巨型立体书那样翻过一页**：
  - 整条街沿纸铰链折倒、压平。
  - 下一页弹起一座移轴纸城：40 个街区，每个街区 8 栋细楼（一个院区 = 一个节点），共 320 栋。
  - 每栋细楼只有一间宽：一位专家一栋楼，每层各一间。其中 64 栋是朴素的（全科 + 替班）。
- 69.0：一栋楼顶上贴着猫的便利贴 5：「一人一栋？？」，VO「320块GPU」。
  - 院规条 6、7 钉到软木板上。软木板是桌面左侧单独的一块，不在翻页的泡沫板上，所以翻页后它还在。

**转场**：小小的纸摆渡车从小牌所在的那栋楼开出来（它在自己楼里做完 attention），上了纸条路，接 B8。

**VO EN**：
> That tower is one layer. There are 58. Too big for one GPU, so at serving time: one specialist per building.
> *(note)*
> 320 GPUs.

**VO ZH**：
> 这整栋楼，只是一层。一共58层，层层挂号。一块GPU装不下，上线时一位专家一栋楼。
> （便利贴）
> 320块GPU。

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 屋顶灯箱 | Layer 1/58 … 58/58；General ward 1-3 | 第1/58层 … 第58/58层；普通病房 1-3 |
| 院规条 6 | RULE 6 · This tower is one layer. 58 layers, new triage at each. | 院规6 · 这整栋楼只是一层：共58层，层层挂号。 |
| 院规条 7 | RULE 7 · One specialist per building. Building = GPU. | 院规7 · 一位专家一栋楼。楼 = GPU。 |
| 便利贴 | One building EACH? | 一人一栋？？ |
| 320 的脚注 | *decode stage: 256 specialists + 64 for the GP and stand-ins | *解码阶段：256位专家 + 64栋给全科和替班 |
| 「装不下」的小字 | 671 GB of specialists (FP8) · 80 GB per GPU | 专家共约671 GB（FP8）· 每块GPU 80 GB |
| 来源 | DeepSeek-V3 report §4.2, §3.4.2 · L14 p.26 | 同左 |

**喜剧手法**：

- 三翻四抖的第三翻：一栋楼 → 「这整栋只是一层，一共 58 层」→ 320 栋。升级完全靠数字，「这整栋楼只是一层」是全片最大的反差。
- 「层层挂号」是中文成语改写（层层审批 → 层层挂号），属于 B 档包袱。英文同位置靠 "That tower is one layer. There are 58." 的冷淡停顿出笑。
- 猫吐槽一个荒诞但真实的事实，旁白一本正经地拿数字回答。
- 翻立体书有物理原因（猫爪翻页），符合何同学式「转场要有原因」。

| 检验 | 结果 |
| --- | --- |
| 理解 | 先说了「楼 = GPU」，「一人一栋」的荒诞才成立 ✓ |
| 真实 | 61 层、前 3 层不是 MoE；每层各有自己的 router；解码阶段 EP320，每张 GPU 一个专家，64 张给冗余和共享专家 ✓ |
| 数字 | 全部有出处 ✓ |
| 类比失效 | 真实的 attention 和专家在同一批 320 张 GPU 上（attention 用 TP4+DP80），所以摆渡车从小牌自己的楼出发，不另设「家」街区 ✓ |

**SFX**：分诊亭吐票的「吱」越来越快（延时），猫落地「咚」，泡沫板翻页的大「哗」，纸铰链立起的一串「啪嗒」，卡纸楼弹到位的轻响。

**数字出处**：

- DS-V3 §4.2（"number of Transformer layers to 61"；"substitute all FFNs except for the first three layers with MoE layers"），所以 MoE 层 = 58。
- DS-V3 §3.4.2：
  - "40 nodes with 320 GPUs … EP320 … each GPU hosts only one expert, and 64 GPUs are responsible for hosting redundant experts and shared experts"。
  - attention 为 "TP4 with SP, combined with DP80"。
- L14 p.26 同。注意 L14 p.26 引的 arXiv 号是 2401.08383，应以 DS-V3 报告为准。
- 671 GB：按 L14 p.7 的 FP8 口径（70B ↔ 70 GB），671B ≈ 671 GB。
- 80 GB：L04 p.17（H100 HBM 容量）。L14 p.26 说 H800 与 H100 类似。

---

### B8 · 1:11.5-1:22.5 · 四抖：堵车（镜头进入机器）

**画面**

- 71.5：60° 俯视纸城。纸摆渡车（卡纸剪出来的小巴，路牌写「去 / OUT」「回 / BACK」）载着小牌从它自己的楼开往 8 栋专家楼，再开回来；车头的层数牌从 1 跳到 58。
  - 车越来越多（延时），纸条路堵死，车在院区门口首尾相接，一辆车侧翻。
- 75.5：桌边的打印机卡纸，吐出一长条小票「DATA MOVEMENT ........」。
  - 红笔把这一行圈起来，写上「this one.」。这是对发射片 v10 b2 镜头的跨账号回扣，新观众不懂也不影响。
  - 猫被埋在小票里（cat_receipt）。便利贴 6：「我还是排队吧」。
- 78.0：匹配剪辑（形状 + 运动）：纸路上的一辆小巴 → gear.js 机房里光纤托盘上的一个数据包。
  - 真实 3D 机柜，冷色过道光。数据包在交换机端口后面挤成一团。
  - 推近机柜里的一块 GPU 卡（gear.js），风扇在转。
- 81.0：反向复用 v10 的「穿过小机柜玻璃门」：从机柜门里拉出来，回到桌面纸城。

**转场**：机位继续升到正俯视的「地图」视角，接 B9。

**VO EN**：
> Every word, every layer: shuttle out to eight buildings, shuttle back. Times every request.
> *(note)*
> The checkups are fast. The commute is the bottleneck.

**VO ZH**：
> 每个词，每一层，都要坐车去八栋楼，再坐车回来。再乘上所有请求。
> （便利贴）
> 看病不贵，路上贵。

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 车牌 | OUT / BACK | 去 / 回 |
| 小票 | DATA MOVEMENT ........ 〔红笔：this one.〕 | 数据搬运 ……… 〔红笔：就是这项〕 |
| 便利贴 | I'll take the queue. | 我还是排队吧 |
| 等宽小字 | dispatch + combine: 2 all-to-alls per MoE layer · L14 p.25 · traffic density illustrative | 分发 + 合并：每个MoE层2次all-to-all · L14 p.25 · 车流密度为示意 |

**喜剧手法**：

- 三翻四抖的「抖」：前三翻的问题都能在门口解决，这一次问题跑到了路上。
- 猫的便利贴是预期违背加小回扣：它宁可回去排 B5 那条队。排队是门口的问题，堵车是路上的问题，猫的偏好正好把两者区分开。
- 中文「看病不贵，路上贵」改写自常说的「看病贵」，属于 B/C 档包袱；英文同位置单独写了一句「The checkups are fast. The commute is the bottleneck.」

| 检验 | 结果 |
| --- | --- |
| 理解 | 「我还是排队吧」要明白堵车比排队更糟、而且是另一种问题才好笑 ✓ |
| 真实 | 每个 MoE 层都有 dispatch/combine 两次 all-to-all；论文摘要说数据搬运在多机推理里成为主要瓶颈 ✓ |
| 数字 | 「8 栋」「58 层」有出处；车流密度标了示意 ✓ |
| 类比失效 | 真小巴一车拉很多人；这里每个 token 的隐藏状态要发往最多 8 张 GPU。「车载小牌」的说法足够，不展开 |

**SFX**：

- 桌面：真实的小号捏喇叭（玩具感但是真录音），打印机卡纸的嘎吱声，纸条倾泻声。
- 机房：低沉风扇声，光纤上的数据包「嗒嗒」（有 v10 音效库就复用）。
- 回到桌面：台灯底噪。

**数字出处**：L14 pp.21-23（EP；workload imbalance、All2All overhead），p.25（"2 x All2All in MoE"）；DS-V3 §3.4.2（"All-to-all communication of the dispatch and combine parts"）；*Patterns* 摘要（"data movement overhead that becomes the dominant bottleneck in multi-unit LLM serving systems"）。

---

### B9 · 1:22.5-1:39.5 · 反转：看着像随机，我们看了两万四千个请求

**画面**

- 82.5：正俯视，纸城的灯暗下来，只剩台灯的光池。
  - 猫（cat_tug）从桌面左下角拖进来一页纸：*Patterns behind Chaos* 的首页。用 props.js 的排版标题页，真实标题 + 9 位作者署名。正文**只排摘要第二句原文**，不做假正文的仿真页。
  - 红笔把句中的 "random" 圈起来。
- 86.5：VO 提到 Zhongkai 时，红笔在署名「Zhongkai Yu」下划一道线。
- 87.5：320 栋楼顶各「啪」地插上一枚黄铜图钉，红棉线开始在图钉之间拉起来：
  - 一个请求 = 一条线，从它出发的那栋楼开始，逐层穿过它去过的 8 栋楼。
  - 标题区（y 300-380）一条打印纸上，等宽计数器在跑：「requests 0 → 24,000+ · models 4 (200B-1000B)」。
  - 一开始是一团乱麻（这就是 chaos）。猫（cat_bat）伸爪去扑线，猫见了毛线的本能，是真实的猫喜剧。
- 91.5-93.0：无 VO 的延时。线越来越粗；机位上升，数据越多，结构越清楚：少数几条线路粗成了绳。
- 93.0：插上红笔小旗做标注，每面小旗带一个等宽小标签：
  1. 常客 / Regulars：相邻的词反复去同一批楼的地方，线捆成一束；还有几栋楼缠成大疙瘩（热门专家）。标签「Ob2 · varies by model」。
  2. 搭子 / Package deals：两栋楼之间一根特别粗的绳（专家对）。标签「Ob5」。
  3. 读题 ≈ 写答案：「读题时」拉的线用象牙白棉线，「写答案时」用红线，两种线走在同样的沟里。标签「Ob3 · similar, not identical」。

**转场**：猫一爪把一块黄铜门牌从楼上拍下来，机位跟着门牌沿红线滑走，接 B10。

**VO EN**：
> The traffic looks random. Our own paper says "random," on page one. Then Zhongkai, who taught this lecture, led a study of 24,000 requests.
> *(1.5 s: thread time-lapse, no VO)*
> Regulars. Package deals. And what's busy while it reads your question stays busy while it answers.

**VO ZH**：
> 这车流，看着全凭运气。我们自己的论文，第一页就写着「随机」。然后，教这节课的 Zhongkai，带头分析了两万四千个请求。
> （1.5 s 延时，无 VO）
> 有常客，有搭子；读题时忙的诊室，写答案时还忙。

〔Zhongkai 的中文名待本人确认，确认前中文 VO 读拼音。〕

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 标题页（两版都用英文原题） | "Patterns behind Chaos: Forecasting Data Movement for Efficient Large-Scale MoE LLM Inference" · Zhongkai Yu, Yue Guan, Zihao Yu, Chenyang Zhou, Zhengding Hu, Shuyi Pei, Yangwook Kang, Yufei Ding, Po-An Tsai | 同左；ZH 版在圈旁加红笔注「随机」 |
| 摘要原句 | "…their random expert selection mechanism introduces significant data movement overhead…" | 同左 |
| 计数器 | requests 24,000+ · 4 models, 200B-1000B | 请求 24,000+ · 4个模型（200B-1000B） |
| 小旗 | Regulars / Package deals / Reading ≈ writing | 常客 / 搭子 / 读题 ≈ 写答案 |
| 来源小字（用 trace 时） | trace: lab's public MoE expert-selection traces · DeepSeek-R1 · layer N | 同左 |
| 来源小字（不用 trace 时） | illustrative | 示意 |

**喜剧手法**：

- 反转：整个小品世界一直在堆「乱」，现在乱里有了常客。
- 自嘲：连我们自己的论文第一页都写着 random，打的是自己，而且是诚实的。
- act-out：猫扑毛线。

| 检验 | 结果 |
| --- | --- |
| 理解 | 先看懂了堵车是车流造成的，反转才成立 ✓ |
| 真实 | "random" 一词摘自摘要原文；24,000+ 请求、4 个模型都在摘要里；Ob2/Ob3/Ob5 按课件措辞并带限定词；有 trace 授权时，线就用真数据画 ✓ |
| 数字 | ✓ |
| 类比失效 | 「读题 / 写答案」= prefill / decode，在小标签里注明 |

**SFX**：猫拖纸，红笔画圈，图钉连响，棉线的「嗖」和拨弦声。全片唯一一处音乐：延时段下面一个很低的大提琴持续音，到「Regulars / 有常客」时解决。

**数字出处**：

- *Patterns behind Chaos* 摘要（arXiv 2510.05497v5）："random expert selection mechanism"；"four state-of-the-art large-scale MoE models released in 2025 (200B-1000B) using over 24,000 requests"。
- L14 p.38（时间 / 空间两类关系），p.40（Ob2："Token-Level Relation exists but differs across models; Higher layers tend to choose the same expert across tokens"），pp.41-42（Ob3：prefill 和 decode 在专家频率分布上相似），p.44（Ob4：专家被选不均匀），p.45（Ob5："Some expert pairs are more likely to be selected together"）。

---

### B10 · 1:39.5-1:53.5 · 收益（安静区）：预报车流，提前挪专家；最佳论文

**画面**

- 99.5：猫（cat_bat）沿着红线，把一块块黄铜门牌（"Dr. 041"）拍进它们的常客会去的那栋楼。
  - 摆渡车改成同一院区内的短途；堵车像波纹一样一圈圈化开。
- 103.0：机位停在标题页上。金色「BEST PAPER · ISCA 2026」印章（stamp_bestpaper 扫描）落下，「咚」。**这里不放任何笑点**，是安静区。
- 104.5：打印机打出两行小票，各贴在一件实物旁边：
  1. 桌上 3D GPU 卡（gear.js）旁边：today's GPUs，最多 1.25×（MoE 计算）。
  2. Zhongkai 的手绘角色（zhongkai_wafer：举着一片泛彩虹光的晶圆，自豪地笑）旁边，配名牌：simulated, future wafer-scale GPUs，平均 6.6×（模拟，4 个模型）。
- 112.0：静止停留。

**转场**：机位从标题页平滑滑落到一栋细楼的门口（B11 的机位），接 B11。（如用 B10b，先接 B10b。）

**VO EN**：
> Forecast the traffic; move specialists before the rush.
> *(stamp, 1 s)*
> Best Paper, ISCA. Today's GPUs: up to 1.25 times on the expert layers. Simulated wafer-scale chips: 6.6 times on average.

**VO ZH**：
> 预报车流，赶在高峰前把专家挪过去。
> （盖章 1 s）
> ISCA最佳论文。今天的GPU：专家层最多快1.25倍。模拟晶圆级芯片：平均6.6倍。

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 印章 | BEST PAPER · ISCA 2026 | 印章保留英文；下方小字「ISCA 2026 最佳论文」 |
| 小票 1 | today's GPUs ........ up to 1.25× (MoE computation) | 今天的GPU ……… 专家计算最多1.25倍 |
| 小票 2 | simulated wafer-scale GPUs (future) ........ 6.6× avg (4 models) | 模拟·未来晶圆级GPU ……… 平均6.6倍（4个模型） |
| 名牌 | Zhongkai Yu · taught Lecture 14 · first author | Zhongkai Yu · 第14讲主讲 · 论文一作 |

**喜剧手法**：不放包袱。按 comedy.md 3.3，关键结论上面不压笑点。猫拍门牌只是温和的 act-out（演「专家放置」），让角色一直在动，但不设笑点。

| 检验 | 结果 |
| --- | --- |
| 理解 / 真实 / 数字 | 限定词全部上屏：up to、MoE computation、average、simulated、wafer-scale、4 models ✓；按 series 规定，6.6× 的 VO 和画面都带「模拟、晶圆级」 |

**SFX**：黄铜门牌在纸上滑（轻刮），放松下来的车流声，印章「咚」（系列声音标识 3 号），打印机吱吱（两行）。

**数字出处**：

- *Patterns* 摘要："On wafer-scale GPUs, lightweight architectural modifications guided by our insights yield a 6.6× average speedup across four 200B–1000B models"；"On existing GPU systems, our insights drive the design of a prefill-aware expert placement algorithm that achieves up to 1.25× speedup on MoE computation"；"future wafer-scale GPU architectures"；"a concrete design study"。
- 最佳论文：实验室帖子文案 `social/x/build.py`（01_isca）。

### B10b（可选，+3.0 s）· 丁老师的一句

**画面**：丁老师手绘角色（y_proud，已抠像）站在标题页旁边，和 Zhongkai 并排。她从画框左边走进来，不凭空出现。

**VO**：丁老师本人录音。下面这句是**占位**，必须由她本人确认或改成她自己的话；不确认就删掉，片长回到 2:08.5。

- EN【PLACEHOLDER，needs Prof. Ding's approval】："Chaos is just data nobody has read yet."
- ZH【占位，需丁老师本人确认或改写】：「混乱，只是还没人读过的数据。」

---

### B11 · 1:53.5-2:08.5 · 回扣结尾

**画面**

- 113.5：机位低低地停在一栋细楼的门口，构图和 B2 的走廊栏杆镜头匹配。
  - 猫（cat_bat）用爪推着一块新牌「sugar / 糖」走向门口。
  - 然后在 **B2 的同一位置**拍上同一款黄便利贴，用同一个音效：「要排队吗？」
- 115.0：小牌还没动，隔壁（同一个院区）041 号那栋楼的灯**已经亮了**，门开着，它的门牌是 B10 被猫一路拍过来的。专家在等病人。
  - 这一拍和 B3 正好相反：B3 是出票之后灯才亮。
- 115.5-122.0：VO。
- 122.0：猫（**新画的 cat_stamp**）拿红色橡皮章，在软木板上那张完整的七条院规上盖章：「已就诊 / SEEN」。
- 123.5：打印机打出最后一行，红笔打勾；紧接着下一行开始打。
- 126.5：机位缓缓回到第 0 帧的封面构图，小票抬头上压着 3D 实验室 logo（真 logo 美术）。最后一帧去掉标题字后与第 0 帧一致，方便 X 循环播放。

**VO EN**：
> Not anymore. Patients used to wait for the specialist. Read the patterns, and the specialist waits for you.

**VO ZH**：
> 不用了。以前是病人等专家；看懂了规律，就是专家等病人。

**画面内文字**

| 元素 | EN | ZH |
| --- | --- | --- |
| 便利贴 | Is there a wait? | 要排队吗？ |
| 印章 | SEEN | 已就诊 |
| 最后一行小票 | No.01 MoE ........ 37B of 671B　*copay not included | 第01项 MoE ……… 671B里用37B　*挂号费另计 |
| 下一行（预告） | No.02 TOKENS ........ next | 第02项 Token ……… 下期 |

**喜剧手法**：

- callback：running gag 第 3/3 次（反转）。
- 回文式金句（名场面）。
- 系列脚注的变体：「*挂号费另计」属于「*算力另计」那一家。

| 检验 | 结果 |
| --- | --- |
| 理解 | 只有明白「专家放置 = 赶在车流前把专家挪到位」，反转才成立 ✓ |
| 真实 | 条件句「看懂了规律，就……」保持诚实；放置由规律指导，见摘要 ✓ |
| 数字 | 同 B0 ✓ |

**SFX**：便利贴（与 B2 同一采样，声音本身就是回扣），已经亮着的门灯嗡声，印章「咚」，打印机吱吱，撕纸，可选最后一声台灯「咔」。

**数字出处**：同 B0、B10。

---

## 4. 字数与语速

**计数方法**

- EN 数的是口语词：数字按读法展开（如 "six hundred seventy-one billion"），带连字符的复合数字和缩写按一个词计。
- ZH 数的是口语音节：数字写成汉字读法；GPU / ISCA 按读出来的音节计。
- 「VO 窗口」= 本拍时长减去便利贴停顿和无 VO 的延时段。
- 脚本：`(session) vo_count.py`，改台词后可以重跑。

| 拍 | 时间码 | VO 窗口 s | EN 词 | EN 词/s | ZH 音节 | ZH 音节/s |
| --- | --- | --- | --- | --- | --- | --- |
| B0 | 0:00.0-0:07.5 | 6.3 | 16 | 2.54 | 25 | 3.97 |
| B1 | 0:07.5-0:18.0 | 9.8 | 25 | 2.55 | 43 | 4.39 |
| B2 | 0:18.0-0:21.0 | 1.2 | 2 | (1.67) | 4 | (3.33) |
| B3 | 0:21.0-0:33.0 | 10.2 | 27 | 2.65 | 41 | 4.02 |
| B4 | 0:33.0-0:41.0 | 6.8 | 18 | 2.65 | 30 | 4.41 |
| B5 | 0:41.0-0:51.0 | 8.6 | 24 | 2.79 | 35 | 4.07 |
| B6 | 0:51.0-1:00.5 | 8.7 | 24 | 2.76 | 38 | 4.37 |
| B7 | 1:00.5-1:11.5 | 10.0 | 24 | 2.40 | 44 | 4.40 |
| B8 | 1:11.5-1:22.5 | 10.0 | 23 | 2.30 | 33 | 3.30* |
| B9 | 1:22.5-1:39.5 | 15.5 | 41 | 2.65 | 64 | 4.13 |
| B10 | 1:39.5-1:53.5 | 12.0 | 33 | 2.75 | 53 | 4.42 |
| B11 | 1:53.5-2:08.5 | 6.5 | 18 | 2.77 | 23 | 3.54 |
| **合计** | **128.5 s** | **105.6** | **275** | **2.60** | **433** | **4.10** |
| B10b（可选） | +3.0 s | 3.0 | 8 | 2.67 | 12 | 4.00 |

**读法**

- VO 窗口内：EN 2.60 词/s，在 2.3-2.8 之内；ZH 4.10 音节/s，在 3.5-4.5 之内。
- 全片平均（含静默段）：EN 2.14 词/s，ZH 3.37 音节/s。静默都是故意留的：便利贴、0.8 s 停顿、反转延时、盖章、安静区。
- *B8 的中文故意偏慢，给堵车画面留时间。
- B2 只有一句，不计速率。

---

## 5. 回扣结尾与金句

**最后一句（全片金句）**

- ZH：「不用了。以前是病人等专家；看懂了规律，就是专家等病人。」
- EN："Not anymore. Patients used to wait for the specialist. Read the patterns, and the specialist waits for you."

**为什么是这句**

1. **回扣**：同时回 running gag「要排队吗？」（0:18 暂时不用 → 0:45 现在要了 → 1:55 不用了）和全民痛点「专家号挂不上」。
2. **回文**：病人等专家 ↔ 专家等病人。中文是对仗，截图就能传；英文的倒装（chiasmus）同样成立，是另写的，不是翻译过来的。
3. **诚实**：「看懂了规律，就……」是条件句，不说「问题解决了」。今天的 GPU 上最多 1.25× 的限制，已在 B10 明说。
4. **就是机制**：专家放置 = 让专家提前出现在病人要去的楼里。画面上 041 号门的灯在小牌动之前就亮了，和 B3「出票后才亮」正好反过来。

**片尾的余韵**（不再有 VO）：盖章「已就诊 / SEEN」→ 小票「*挂号费另计 / *copay not included」→ 下一行「No.02 TOKENS」。这一行回扣 B1 的脚注「*严格说是 token，下集讲」，连成系列。

**备选**（给比稿评审）

- ZH：「6710亿在编，370亿在岗；谁什么时候上岗，我们现在能预报。」直接回扣开头，但不如回文好传。
- EN："671 billion on the payroll. 37 billion on shift. And now we know the shift schedule." 同上。

---

## 6. 素材清单

### 6.1 已有（已在仓库里，已核对）

| 类别 | 文件 | 用在 |
| --- | --- | --- |
| 猫（已抠像 + 深度图，`.claude/films/xlaunch/kit/assets/cut/`） | cat_sit, cat_bat, cat_sleep, cat_scared, cat_jump, cat_receipt, cat_tug（另有 cat_cheer 备用） | B0-B11 |
| Zhongkai（已抠像） | zhongkai_wafer（举着晶圆）；m_zhongkai 备用 | B10 |
| 丁老师（已抠像） | y_proud | B10b（可选） |
| 道具画（`xlaunch/art/`） | prop_printer, prop_lamp（绿罩银行灯）, prop_tea, prop_pen, prop_rack | 全片 |
| 墨迹扫描（`xlaunch/art/ink/`） | pen_circle, pen_squiggle, pen_arrow, pen_strike, pen_working, stamp_bestpaper, seal_gold | B4、B8、B9、B10 |
| 纹理（CC0） | Paper001 / Paper003, Wood026 | 全片 |
| 代码（`xlaunch/scene/`） | studio.js（布景 / 光 / 景深）、sprite.js（重新打光的手绘角色）、props.js（小票纸带、便利贴、排版标题页、3D logo）、gear.js（3D GPU 卡、带光纤托盘数据包的机房）、lib.js camPath、2D 字层 | 全片；B8 机房；B10 GPU 卡 |
| 声音标识 | 台灯咔、打印机吱吱、印章咚（identity 3.6 要求录的那三声） | stinger、B10、B11 |
| look dev（`.claude/films/edu/look/`） | `hospital.js`（16×16 = 256 间诊室的白卡塔、常亮大堂 = 全科、带出票口的分诊亭、屋顶灯箱、亮灯开门）、`tileKit`（象牙小牌）、`accum.js`（真镜头景深）、`look.html` 的风格帧（封面、仰视、分诊亭微距、走廊、长曝光）和挂号小票、便利贴；`campus.js`（8 栋塔 = 8 个节点、楼层 = 层，见 7.3 第 9 条） | B0-B6 直接用；B7 起扩展 |

### 6.2 要新画（Codex，#00FF00 绿底再抠像，统一 PROMPTS.md 的画风段落）

| 名称 | 内容 | 必要性 |
| --- | --- | --- |
| `cat_stamp` | 白猫红贝雷帽，双爪按着一枚红色橡皮章往下盖 | 必需（B11） |
| `cat_peek` | 猫眼 + 脸的大特写，从上方往微缩模型里看 | 可选（B4）；没有就用 cat_sit 裁切 + 景深代替 |

### 6.3 要新建（代码，三维）

1. **在 `hospital.js` 上加**：
   - 每间诊室门旁的空科室牌插槽（B4）。
   - 暗诊室门牌上的细灰（B5）。
   - 沿走廊排、再下桌沿的队伍（B5）。
   - 「号已挂满」牌（B5）。
2. **B7 的街和立体书**：
   - 57 栋低细节的塔实例，加 3 座矮亭（普通病房）。
   - 泡沫板翻页（纸铰链折倒 / 立起）。
   - 320 栋一间宽的细楼（instanced），排成 40 个街区。
   - 纸城（新增，不用 `campus.js` 的 8 塔布局，原因见 7.3 第 9 条）。
3. 小牌直接用 `tileKit`；挂号小票直接用 `look.html` 里的。
4. **描图纸药方** ×8：半透明，叠加时按权重调透明度；字用真实手写扫描。
5. **分诊台账小本**：256 行，翻页。
6. **纸摆渡车 + 纸条路**：卡纸剪成的小巴，instanced。
7. **黄铜图钉 + 红棉线**：tube 几何加棉纤维法线贴图，线可以累积变粗；另有一种象牙白线，用在「读题」段。
8. **黄铜门牌**（"Dr. 041"）：可滑动。
9. **软木板**：从 ambientCG 找 CC0 软木纹理（待找）。
10. **9:16 布景**：灯在上方 K-TOP，桌面占 y 560-1480（look dev 的风格帧已经是 9:16）。

### 6.4 要新做的实物 / 录音

- **橡皮章「已就诊」和「SEEN」**：网上定制两枚，盖在纸上扫描。和已有印章扫描同一种做法。
- **猫的便利贴手写**：ZH 由一位成员手写后扫描（identity 3.8）；EN 用 Caveat 或真手写。
- **医生字药方**：成员故意写得看不懂，扫描。
- **拟音**：热敏出票、描图纸、小牌落卡纸、泡沫板翻页、小号捏喇叭、棉线拨弦、黄铜在纸上滑、真实猫呼噜和受惊叫声。猫声要用自己的猫，或买有授权的素材。
- **VO**：EN 和 ZH 各录一版，由一位成员录（见风险 7.3 关于 Zhongkai 是否兼任旁白）。

### 6.5 数据

实验室公开的 MoE 专家选择 trace：

- 位置：Hugging Face `core12345/MoE_expert_selection_trace`，arXiv 2510.05497 的配套数据。
- **访问需要申请**（gated）。仓库没有数据卡，许可不明。
- 目录里有 4 个模型：Qwen3-235B-A22B-FP8、DeepSeek-R1-AWQ、Llama-4-Maverick-17B-128E、Kimi-K2-Thinking；数据集包括 Chinese-SimpleQA、mmlu、mmlu_ZH_CN、hellaswag、livecodebench 等。
- 用途：
  - 驱动 B9 的红线和 B5 的热门门号。
  - ZH 版可以用 mmlu_ZH_CN / Chinese-SimpleQA 的中文请求，EN 版用 mmlu。
- 拿不到授权的话：B5、B9 画面一律标「示意 / illustrative」。

---

## 7. 风险

### 7.1 已避开的准确性陷阱

1. **36B 和 37B**：L14 p.9 写 36B，L07 p.32 和 DeepSeek-V3 报告摘要写 37B。本片用 37B，来源标报告。建议告诉 Zhongkai，他的课件这一格和报告不一致。
2. **不讲 MoE 历史**：避开 L14 p.6「Hinton 1991」的过度归功（论文是 Jacobs, Jordan, Nowlan & Hinton）。
3. **专家 ≠ 科室**：门上不挂科室牌，而且专门做成了 B4 的包袱（p.44）。门号只有数字，没有「数学科」「诗歌科」。
4. **共享专家**：画成「全科，人人必看」，所以「只看 8 位」不误导（DS-V3 §4.2）。
   - 37/671 ≈ 5.5%，而 8/256 ≈ 3.1%。差额来自始终激活的部分：attention、embedding、共享专家、前 3 层 dense。VO 不展开；评论区有人问时，可以用这一条回复。
5. **bias 只管选择，不管权重**：写进院规 5 的脚注（L14 p.17；DS-V3 §2.1.2）。
6. **「一位专家一栋楼」只在解码阶段成立**：预填充是 32 张 GPU，每张 8 个专家 + 冗余。脚注写「解码阶段」，VO 用「上线时 / at serving time」略作概括。这一处如果评审觉得太宽，可以把 VO 改成「解码时 / when it's writing」，多 1 个词。
7. **6.6× 和 1.25× 的限定词**：
   - 6.6×：VO 和画面都写「模拟、晶圆级、4 个模型平均」，用 series 规定的措辞（skill 里写的是 "simulated, wafer-scale"）。
     - 摘要原文只写 "future wafer-scale GPU architectures" 和 "design study"，没有出现 "simulated"。
     - 「模拟」应该来自 FACTS.md 对论文正文的核对。写作时 FACTS.md 还不存在，请出来后确认。
   - 1.25×：VO 说「今天的 GPU、专家层、最多」，画面写「MoE computation」。
8. **规律不夸大**：
   - Ob2 说「常常」，并标「因模型而异」。
   - Ob3 说「相似」，不说「相同」。
   - 不画 L14 p.28 的「方块图案」，因为那是 DeepSeek「每个 token 最多 4 个节点」的路由规则造成的，画出来像在把规则造成的形状说成天然规律。
9. **不说「只有我们发现了流量规律」**：DeepSeek 自己就按线上负载统计周期性地决定冗余专家（DS-V3 §3.4；L14 p.27 的 EPLB）。本片的说法只到摘要原话为止：首个全面的、以数据为中心的分析，加一个设计研究。「我们自己的论文第一页就写着随机」是自嘲，不是踩别人。
10. **不把 MoE 和 DeepSeek 的训练成本挂钩**：不提 2.788M GPU 小时。
11. **不碰 H800 的来历**：不提 H800 带宽为什么低（出口管制）；本片只用到「每块 GPU 80 GB」这一个和 H100 相同的事实。
12. **trace 是 DeepSeek-R1 的，不是 V3 的**：如果 B9 用的是 trace，来源小字写「DeepSeek-R1」。不要在 V3 的画面上直接说「这就是 V3 的流量」。R1 和 V3 同架构（R1 基于 V3-Base），这一点需要再核一次。
13. **词 ≠ token**：已用脚注标出，也给第 2 集埋了梗。画面小字用 series 的安全措辞「per token / 每个token」。VO 说「per word / 每个词」，是口语化，有院规 1 的脚注兜底；如果 FACTS.md 要求 VO 也说 token，B0 改成 "Per token, 37 billion on shift."（词数不变）。全片不出现 "at a time"。
14. **「每层 8 位 + 全科」**：在院规 2（8 位 + 全科）和院规 6（这整栋楼只是一层）合起来说清。

### 7.2 可能在某种语言里不响的包袱

| 包袱 | 风险 | 备用 |
| --- | --- | --- |
| 「看病不贵，路上贵」 | 改写自社会话题「看病难、看病贵」，有极轻的现实指涉 | 「看病很快，堵在路上。」 |
| 「层层挂号」 | 中文好笑，英文无对应 | 英文同位置换成另一个包袱："That tower is one layer. There are 58." 的冷淡停顿 |
| 「搭子」 | 2023 年起的流行词，到 2026 年可能显旧 | 「老搭档」 |
| 「两百五十六」 | 旁白若读成「二百五十六」，开头「二百五」是骂人话，弹幕可能会刷 | VO 统一读「两百五十六」，字幕写数字「256」 |
| EN "package deals" | 带一点商业味 | "Always-together pairs." |
| EN "copay" | 偏美式；X 观众以美国为主，问题不大，英国观众可能要反应一下 | 保留 |
| EN "on the payroll / on shift" | 无风险 | — |
| 「哪家医院这么看病？」/ "What hospital works like this?" | 两种语言都成立 | — |
| 「一人一栋？？」/ "One building EACH?" | 两种语言都成立 | — |
| 猫扑毛线、睡在城上 | 纯画面，两边都成立（A 档） | — |

### 7.3 不确定、需要人拍板的事

1. **丁老师的一句**：必须由她本人确认或改写。不确认就删 B10b。
2. **Zhongkai**：
   - 他的中文名和声调（中文 VO 和名牌要用）。
   - 他是否同意被画在 B10，以及被点名为「教这节课的人」。
   - 可以考虑由他本人录旁白，最有可信度。如果他录，B9 的「然后，教这节课的 Zhongkai……」要改成第一人称：「然后我——这节课就是我教的——带头分析了……」。
3. **trace 数据**：要申请访问；许可不明，因为是实验室自己的数据，请 Zhongkai 授权使用。拿不到就把 B5、B9 改成「示意」。
4. **「专家等病人」是否准确概括 prefill-aware 专家放置**：请 Zhongkai 看一眼 B10、B11 的说法。
5. **B4 的知识点密度**：「专长是看病人看出来的」概括的是梯度只流向被选中的专家，这一点也请 Zhongkai 审一下措辞。
6. **院规条在 phone 尺寸上的可读性**：七条院规在 1080 宽度下要 ≥40 px，软木板只有 340 px 宽，长的院规（2、5）要折两行。做静帧时在手机尺寸上实测。
7. **片长**：加上丁老师一句后是 131.5 s，需要按第 1 节说的从 B4 减 1.5 s，才能回到 130 s。
8. **两条主线挤在一集里**：稀疏激活和流量规律。我的处理：
   - 用院规纸和「要排队吗」两条线把两部分串起来。
   - 反转段控制在 17 s，「规律」只给三个词：常客、搭子、读题≈写答案。层与层之间的规律（Ob1）不讲。
   - 如果样片看下来还是太满，先删 B4 的 118 号门延时，再删 B7 小牌沿街领票的延时。
9. **B7 与 `campus.js` 的取舍**：
   - look dev 的 `campus.js` 是 8 栋塔 = 8 个节点、每栋每层 32 间、楼层 = 层，对应的是训练时 EP64 的布局（L07 p.32：EP = 64）。
   - 本稿的三翻需要「解码时一位专家一栋楼，320 张 GPU」，这个数字才荒诞。
   - 两个方案：
     - (a) 按本稿新建 320 栋细楼纸城。
     - (b) 沿用 `campus.js`：三翻改成「8 栋塔、每栋每层 32 位专家」；猫的便利贴改成「最多只准跑4栋？」，配 DeepSeek「每个 token 最多 4 个节点」的院规（DS-V3 §4.2）。这样损失「一人一栋」的包袱，还要在 B9 交代「方块图案来自这条院规」。
   - 我推荐 (a)。
10. **反转画面：红线 vs 长曝光**：
    - look dev 已有「长曝光」风格帧：诊室按被选次数亮度累积，中英两版亮不同的房间，对应 Ob4 的语言差异。
    - 本稿用红线调查板，因为它是实物（棉线、图钉），能演「搭子」（两栋楼之间的粗绳），也能让猫扑毛线。
    - 两者可以合用：先长曝光（「常客」），再拉红线（「搭子」）。中英两版用不同语言的 trace，这一点在两种方案里都保留。

**自评**（creators.md 5.7 发布清单，每项 0-2 分，≥14 可发）：约 16/18。

- 失分 1：前 30 s 里的「真实物件」只有报告来源小字，没有实测画面。
- 失分 2：「实验」要用上 trace 数据才算满分。
