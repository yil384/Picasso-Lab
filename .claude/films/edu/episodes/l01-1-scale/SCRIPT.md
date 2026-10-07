# L01-1 定稿剧本
## 《一只蚂蚁不会算数》 / "One Ant Can't Add"

系列：Compute Not Included /《算力另计》· 主线第一支教学短片 · 2D 纸剧场 + 里索印刷
题材：CSE 291P "LLM System Optimization" 第 1 讲（Prof. Yufei Ding，UC San Diego），课程要求之后的第一节 Background，
slides 9-11（涌现 / 语言模型的工业化 / 再看一眼 scaling law）
定稿日期：2026-10-04 · 片长 **79.1 s**（丁老师那句不用时 77.7 s）· 1080×1920 · 30 fps · 画面渲一次，画中字和字幕按 `?lang=en|zh` 各一套

**这一版怎么来的**
- 骨架是评审选出的赢家：剧本 B 小品版《一只蚂蚁不会算数》（`drafts/script_B.md`，加权 54.5 : 53.75 胜 A）。
- 嫁接了评审点名的 A 版段落（§0.1），逐条落实了评审第 7 节的 13 项修改（§0.2）。
- 所有数字、标题、引文都用 `FACTS.md` 的措辞；评审第 4 节新核的几行（Chinchilla 表 1、6ND、Wei 表 1 等）FACTS 里还没有，
  我今天又从 arXiv 原文核了一遍（§10.2），**录音前必须先补进 FACTS.md**。
- 丁老师的一句原话按评审推荐放进结尾（`notes/ding_on_background.md` 排名第 1），**标「需本人同意」**；不同意就用 §5 B7 的备用句。
- 语速按 e01 `vo_rate.py` 的口径算（EN 按口语词，ZH 按音节，token 读两音节），检查脚本在 session scratchpad，没进 repo。

---

## 0. 相对比稿改了什么

### 0.1 从 A 版嫁接（评审 §6 编号）

| # | 嫁接 | 落在哪 |
| --- | --- | --- |
| 1 | 口号定性：旁白说 "Stanford's CS336 motto" /「斯坦福一门课的口号」；卡上署名 CS336，并印「a motto, not a law / 是口号，不是定律」 | B7 |
| 2 | 印章盖在口号卡 "RESOURCES*" 的星号上：课教「效率」那一半，「资源」那一半另计。品牌句由此自己解释自己。跑马灯 "FREE ENTRY*" 只作伏笔，第 0 帧不亮 | B1 起、B7 |
| 3 | 打赌进帖文：X 首行 "Same compute budget. One AI model is 4x bigger. Who wins?"（投票另发，见 §11）；片中猫的 "REHEARSAL??" 多停 0.5 s，当观众自己下注的那一刻 | B4、§11 |
| 4 | 图 2G 彩蛋（同一横坐标两个点，上面那个是 70B）：放进 X 首条回复和抖音置顶评论，片中不加（片长已到 79 s） | §11 |
| 5 | 对数轴：曲线海报上猫的红笔在每两个刻度之间写「×100」，轴下写 "operations, not speed /总运算量，不是速度"，不加旁白 | B2 |
| 6 | MMLU 的人类单位：评委分牌下写 "57-subject exam /57 科考试" | B5 |
| 7 | A 的诚实提醒：抖音版 Stargate、xAI 是否点名交用户定（§16）；片中不出现任何动物形象的 Chinchilla / Gopher | B5、B6 |

未嫁接：A 的卷尺出门（换画风、约 12 s）、地鼠和龙猫木偶、四格涌现海报。

### 0.2 评审第 7 节的 13 项修改

| # | 修改 | 落实 |
| --- | --- | --- |
| 1 | 错句「训练一次，一亿美元起」 | 改为 ZH「训一个顶级模型，估计上亿美元」/ EN "One frontier run: an estimated hundred million plus."（FACTS C2、§2b） |
| 2 | 口号必须定性为口号 | B7 旁白 + 卡面（嫁接 1） |
| 3 | Mirage 一句去掉「除非」并收窄 | EN "…one paper finds many jumps smooth out." / ZH「有篇论文发现：很多'突然'，变成了'渐渐'」（FACTS B3 的「变成了」，B6 的限定进帖文） |
| 4 | 抖音标题不能「越大越开窍」 | 「一只蚂蚁不会算数｜同一笔算力，该把模型做大，还是多喂数据？」 |
| 5 | FACTS 补行 | §10.2 列出要补的 9 行；示意题 347 + 586 标「our example」 |
| 6 | 第 0 帧只留三处字 | 标题卡、顶部纸条（改成 "LLM SYSTEMS · CSE 291P · LECTURE 1"，静音的 X 观众也知道是讲 AI）、猫的便利贴。铜牌随第一次评分升起，跑马灯第 0 帧不亮、没有小字 |
| 7 | B6 去掉 30 倍拉远 | 删。保留「台灯被抽暗」（资源因子变成实物），镜头只后退 20% 把台灯带进画面；30 倍拉远列为 v2 可选（§15 风险 13） |
| 8 | 「我们教」的归属 | 结尾用丁老师原话（需本人同意）+ "Efficiency: taught here." /「效率，这门课教。」，不说「我们教」 |
| 9 | 安德森的中文 | 旁白「物理学家安德森说：多，就不一样。」；「多者异也」只上海报，请母语者过一遍 |
| 10 | 片长 | 删 "Either way, bigger won"；集群那一翻纯画面；删"参数乘数据"口播（卡上有）；删 175B·530B「也赢了」侧牌（进帖文）。79.1 s，比评审预估长约 1 s，因为按录音实测丁老师那句约 4.6 s，不是 3.5 s |
| 11 | 先做的技术测试 | 第 12 节 6 张风格帧覆盖评审的 (a)(b)(c) |
| 12 | 帖文 | §11 |
| 13 | 遗留核查 | §16 |

另外三处我自己的改动：
- 曲线海报只标 "13B" 一个点（原稿还标 175B、约 33%），减少屏上数字。
- 账单三张牌去掉逐张年份片，只留一条 "2023–2025" 年份条。
- 剧场规定卡不印 "(C ≈ 6ND)"，改印 "budget = training compute /预算 = 训练算力"，防止观众把 B4-B5 的「预算」（算力）和 B6 的美元混为一谈；6ND 放进帖文。

---

## 1. 标题、logline、ONE idea、最后一句

| 项 | EN | ZH |
| --- | --- | --- |
| 片名 | **One Ant Can't Add** | **《一只蚂蚁不会算数》** |
| 副标题 | Scale, the bill, and the smaller model that won | 规模、账单，和赢了的小模型 |
| 封面标题（≤5 词 / ≤8 字） | One ant / can't add. | 一只蚂蚁 / 不会算数 |
| X 帖首行 | Same compute budget. One AI model is 4x bigger. Who wins? | — |
| 抖音标题 | — | 一只蚂蚁不会算数｜同一笔算力，该把模型做大，还是多喂数据？ |

**Logline**
- ZH：书桌上的纸剧场在办「蚂蚁达人之夜」。一只蚂蚁不会算数，一大群突然会了；可小模型上，你看不出这一跳什么时候来。
  于是剧团越请越大，排练原地踏步；直到 2022 年，一个只有四分之一演员、排练约四倍的小剧团，用同一笔预算赢了。
  随后账单涨进了工业时代，连桌上的台灯都被剧场抽暗。最后，戴红色画家帽的毛毡猫给口号里的「资源*」盖上脚注：*算力另计。
- EN: A toy paper theatre on the lab's night desk hosts Ant Talent Night. One ant can't add; a crowd suddenly can, and
  small crowds never warn you when. So the casts get bigger while rehearsal stands still, until, in 2022, a troupe a
  quarter the size that rehearsed about four times as much wins on the same budget. Then the bills go industrial, the
  desk lamp dims, and the felt cat in the red beret stamps the footnote on "resources*": compute not included.

**ONE idea**
- ZH：规模能带来新本事，也带来天价账单；但在同一笔预算下，赢的是把它花对的一方。准确率 = 效率 × 资源，规模越大，
  效率越值钱，而效率是这门课教的东西。
- EN: Scale buys new abilities and a giant bill, but on a fixed budget the winner is whoever spends it best. Accuracy =
  efficiency × resources: the bigger the bill, the more efficiency is worth, and efficiency is what this course teaches.

**可引用的最后一句**（回扣第 0 帧跑马灯上的 "FREE ENTRY*"）
- EN：**"Efficiency: taught here. Compute… not included."**
- ZH：**「效率，这门课教。算力嘛……另计。」**

结构：小品（场景错位 + 两次三翻四抖 + 一条 running gag + 结尾 callback），对应 SERIES §6.2 T1 的「错误直觉」骨架：
旁白装傻（"更多就行""排练？小剧团才排练"），猫用便利贴吐槽，事实在 B5 和 B7 收回。

---

## 2. 映射表（剧场规矩 = 课上的想法）

| # | 剧场里的东西 | 课上的想法 | 类比在哪里失效 → 怎么处理 | 出现 |
| --- | --- | --- | --- | --- |
| 1 | 一只蚂蚁举一张卡（一个像素） | 极小的模型：容量不够，数据再多也学不会 | 蚂蚁是个体，参数不是：B2 红笔脚注「*是参数，不是蚂蚁（比喻是我们的）」（FACTS §6） | B0 |
| 2 | 一群蚂蚁翻牌拼数字 | 模型变大，答案由整体算出来 | 人数是示意，不对应参数量；真数只有海报上的 13B | B1 |
| 3 | 乐池评委：全对才举 100，否则 0 | exact match 这类「全对才给分」的指标 | — | B1、B3 |
| 4 | 猫按位给分：1/3 → 2/3 → 3/3 | 连续指标（Schaeffer 等用 token edit distance） | 「按位」是简化；旁白只说「部分分 / partial credit」 | B1、B3 |
| 5 | 剧场规定：预算 ≈ 演员 × 排练 | 训练算力 C ≈ 6ND（参数 × 训练 token） | 预算 = 算力，不是美元：卡上小字说明；「≈」 | B4 |
| 6 | 剧团越请越大，排练原地踏步 | 2020-21 年的大模型：175B / 280B / 530B，约 300B token | 只给规模，不给名字 | B4 |
| 7 | 2022：四分之一的演员，约四倍的排练，赢了 | Chinchilla 70B / 1.4T vs Gopher 280B / 300B，同算力 | 同预算只对 Gopher 说；不说「小就是好」 | B5 |
| 8 | 演员翻倍，排练也翻倍 | 计算最优：模型和数据等比例放大 | 今天常训得更久（E10），进帖文 | B5 |
| 9 | 账单板翻三下，侧幕外拉，台灯被抽暗 | 工业化：> 1 亿美元一次顶级训练、10 万张 GPU 一个集群、四年 5000 亿美元的计划 | 三个单位不同，每张牌只写一种 | B6 |
| 10 | 口号卡：准确率 = 效率 × 资源* | slide 11 的口号（CS336） | 是口号，不是定律；卡上写明 | B7 |
| 11 | 「规模就是一切」被红笔划掉 →「能放大的算法」 | slide 11 的错误 / 正确读法 | 错误读法从不单独出现：牌上先印「错误读法：」，立刻被划 | B7 |
| 12 | 节目单 | CSE 291P《大模型系统优化》 | 中文课名是我们的译名 | B7 |
| 13 | "FREE ENTRY*" → 印章 "*compute not included" | 课能教效率，给不了前沿规模的资源 | 课程是否发 GPU 额度未核（F6） | B1、B7 |

剧场规矩只有三块实物：铜牌（B1 起）、剧场规定海报（B4）、口号卡（B7），从不同时挂满一墙。

**Running gag：猫的「排练」便利贴**（同一种黄贴、同一个拍打声）

| 次 | 时间 | 便利贴 | 旁白 |
| --- | --- | --- | --- |
| 埋 | 0:00（第 0 帧就在） | Rehearse more? /多排练？ | It could rehearse forever. Still one ant. /排练一万遍，也还是一只。 |
| 升级 | 0:36.9（停 1.2 s） | REHEARSAL?? /排练呢？？（大一号） | 下一句旁白：Rehearsal's for small troupes. /排练？小剧团才排练。 |
| 反转 | 0:47.2 | Rehearse more. /多排练。（问号换句号） | The small troupe won. /小剧团赢了。 |

B0 猫错（太小，练也没用），B5 猫对（数据不够也不行），合起来就是 Chinchilla：演员和排练一起涨。

---

## 3. 封面 / 第 0 帧（1080×1920）

第 0 帧就是封面，也是 X 缩略图。安全区：上 0-260 留空；下 1480-1920 留空；右栏 x 880-1080 在 y 700-1480 留空；
必读的东西都在 x 60-880、y 260-1180 里。画面上只有三处字。

| 区 | 内容 | 字号 / 位置 |
| --- | --- | --- |
| y 0-260（留空） | 暗墙；左上角银行家台灯的暖光边缘（远景板，虚） | 无字 |
| y 275-325 | 两根线吊着一张纸条："LLM SYSTEMS · CSE 291P · LECTURE 1" /「大模型系统 · CSE 291P · 第 1 讲」 | JetBrains Mono 40 px，x 110-780 |
| y 340-540 | 纸剧场台口顶：卡纸拱，里索花纹（黄 + 粉叠成金色，错版 2-3 px）；跑马灯灯泡**不亮**，字是暗的卡纸镂空，读不出 | — |
| y 570-880 | **标题卡**挂在台口里：EN "One ant / can't add."，ZH「一只蚂蚁 / 不会算数」；奶油色卡纸，里索蓝字，粉色错版影子；"can't /不会"下一道真墨迹红笔下划线 | Instrument Serif 120 px / 思源宋体 Bold 112 px；x 150-830 |
| y 880-1080 | 琥珀色滤色片追光（光柱里有灰），一只毛毡蚂蚁站在光圈中央，两只前足把一张纯黑方卡举过头顶 | 蚂蚁约 170 px 高，x 455-590 |
| y 1070-1180 | 乐池栏杆（卡纸，z ≈ 820）；猫的黄便利贴 "Rehearse more?" /「多排练？」贴在栏杆中左 | Caveat 56 px / 霞鹜文楷 60 px；x 360-660 |
| 前景左 y 940-1190 | 毛毡猫坐在第一排卡纸座椅里，背对舞台半侧身，回头看镜头，冷面半眯眼（felt_cat_back）；比栏杆平面略虚 | x 60-340 |
| y 1200-1440（字幕区） | 暗下去的台唇和桌面，空 | — |
| y 1480-1920（留空） | 桌沿落进暗处 | — |
| 右栏 x 880-1080，y 700-1480 | 右侧红毡幕和暗墙，没有字、没有主体 | — |

- 焦点：z ≈ 1000（标题卡和蚂蚁），光圈小，栏杆 z ≈ 820 上的便利贴模糊 < 1.5 px；猫 z ≈ 650 虚约 4 px。
- 光：唯一的琥珀追光从左上飞杆打下来；天幕一层很淡的钢蓝补光；标题卡上一层偏粉的跟光；观众席全暗。
- 裁切：4:5（y 285-1635）、3:4（y 240-1680）、1:1（y 420-1500）都保得住标题、蚂蚁、便利贴、猫（1:1 会丢顶部纸条，可以接受）。
- 缩略图尺寸下最抢眼的是左下的白猫，视线从右上标题经蚂蚁落到左下的猫和便利贴。
- 构图提醒：kit2d 默认机位下台口开口右沿约在 x 891，略进右栏。右侧红幕要盖住开口右缘，或机位 x 右移 12；所有必读物 x ≤ 860。

**备选封面（风格比稿里一起测，评审 §7 第 6 条）**：A 版的打赌封面。EN "Same budget. / Who wins?"；ZH「同一笔预算 / 谁赢？」
（不用「押大押小」：赌博词，抖音有审核风险）。画面用 B5 的双层舞台（上层拥挤的大剧团、下层抱厚剧本的小剧团、中间的
"SAME BUDGET" 信封），评委分牌还没举。抖音封面可以单独上传，X 只能用第 0 帧。

---

## 4. 拍摄约定

- **世界**：桌上一座玩具纸剧场（kit2d：`stage.js` 透视相机穿过按 z 分层的平面，景深按平面虚化，每个平面一张乘法光照图，
  加法光柱带灰尘）。布景 = 卡纸 + 毛毡（代码做）；一切「信息」= 里索印刷（`riso.js`：粉 / 黄 / 蓝 / 藏青四色）；
  角色 = 图像模型画的毛毡偶（绿幕抠像，§13）；猫的工具 = 便利贴、红笔、橡皮章（优先用真扫描）。
- **平面**（相机 z = 0，z = 1000 时 1 单位 = 1 设计像素）：前排座椅和猫 z 600-700；乐池栏杆 z ≈ 820，评委分牌从 850-900
  的乐池里升起；台口 940（帷幔 943、大幕 946）；吊挂的海报 / 卡片 950-1150；台面、看台、蚂蚁 1050-1250；天幕 1275；
  远墙和书桌 2700。
- **3D 只做点缀**：按平面的景深和视差；B6 镜头后退时的视差；其余镜头都是推拉摇，不转视角。
- **节奏**：木偶和翻牌按 12-15 fps（on twos），镜头、灰尘、颗粒按 30 fps。随机数一律哈希，同一帧两次渲染逐像素一致。
- **转场**：每个剪辑点都有物理原因（大幕、吊杆、配重、视线跟随）。全片没有甩镜，没有淡入淡出。
- **字**：画中字 ≥ 40 px（1080 宽）；每个镜头必读的字不超过两处；字幕在 x 120-880、y 1200-1440，EN ≤ 26 字符/行、
  ZH ≤ 12 字/行，至多两行，不跨镜头。

---

## 5. 节拍表

### 5.0 总览

| 拍 | 时间 | 长 | 内容 | 喜剧结构 |
| --- | --- | --- | --- | --- |
| B0 | 0:00.00-0:05.05 | 5.05 | 一只蚂蚁不会算数 | 冷开场，装傻 / 吐槽反用；running gag 埋 |
| B1 | 0:05.05-0:14.15 | 9.10 | 再多来点：918 → 932 → 933；More Is Different | 三翻（涌现） |
| B2 | 0:14.15-0:22.45 | 8.30 | 真曲线：13B 处一跳；小模型不报信 | 安静区 |
| B3 | 0:22.45-0:28.55 | 6.10 | 猫的打分：斜坡 vs 台阶（诚实限定） | 小反转 |
| B4 | 0:28.55-0:41.80 | 13.25 | 剧场规定；演员越请越大，排练 300 / 300 / 270 | 主包袱三翻；running gag 升级 |
| B5 | 0:41.80-0:52.55 | 10.75 | 2022：小剧团赢了；演员翻倍，排练也翻倍 | 四抖；running gag 反转 |
| B6 | 0:52.55-1:05.15 | 12.60 | 账单进工业时代；台灯被抽暗；省 1% = 100 万 | 三翻（账单）；视觉笑点 |
| B7 | 1:05.15-1:19.10 | 13.95 | 口号；错误读法划掉；丁老师一句；盖章；回到第 0 帧 | 反转 + callback |

转场表：

| 剪辑点 | 物理原因 |
| --- | --- |
| B0 → B1 | 红毡大幕落下又升起（换景） |
| B1 内三次 | 同上，同一声幕杆「咔」 |
| B1 → B2 | 安德森海报被吊上去，同一根绳经滑轮把曲线海报放下来（配重） |
| B2 → B3 | 蚂蚁顺着海报边滑下来，镜头跟着它落到乐池栏杆 |
| B3 → B4 | 新海报从飞杆落下，镜头被带着上摇 |
| B4 → B5 | 被蚂蚁挤鼓的大幕整体「咚」地落下；年份卡落在幕前 |
| B5 → B6 | 小剧团谢幕、落幕；巨大的账单板从飞杆砸下，镜头后退把它装进画面 |
| B6 → B7 | 红幕落下（幕后换景、机位回到第 0 帧那一套），再升起时口号卡已经挂好 |
| B7 尾 → 第 0 帧 | 口号卡被吊上去，露出一直挂在后面的标题卡；那只蚂蚁走回追光（X 循环） |

### B0 · 一只蚂蚁 / One ant　0:00.00-0:05.05

**画面**
- 0:00.00 第 0 帧（§3）。微动：光柱里的灰尘、红毡幕轻摆、蚂蚁触角按 on twos 抖。镜头 5 s 内慢推 1.5%。
- 0:01.90 猫抬爪「啪」地拍一下栏杆上的便利贴 "Rehearse more?"，把视线拉过去（felt_cat_slap）。
- 0:02.10 标题卡被两根线吊走（吊杆收线），0:02.60 出画，露出天幕上里索印的算式 "347 + 586 = ?"（72 px，y 620-700）。
  蚂蚁仰头看算式（0:02.6），再低头看自己的卡（0:03.2）。
- 0:02.80-0:03.90 说到 "rehearse forever" 时，蚂蚁把卡翻黑、翻白、翻黑，越翻越快（on twos）：一个像素在「排练」。
- 0:04.20 "Still one ant." 时它停住，卡停在黑面，触角耷拉。
- 0:04.65 红毡大幕从上落下，0:05.05 合拢 → B1。

**VO EN**："One ant can't add." (0:00.25-0:02.05) … "It could rehearse forever. Still one ant." (0:02.35-0:04.95)
**VO ZH**：「一只蚂蚁，不会算数。」…「排练一万遍，也还是一只。」

**画中字**：标题卡（120 / 112 px）；顶部纸条（40 px）；便利贴 "Rehearse more?" /「多排练？」（56 / 60 px）；
天幕 "347 + 586 = ?"（72 px，中英相同）。

**喜剧**：装傻 / 吐槽反过来用：猫装傻（以为多练就行），旁白吐槽（只有一只，练多少都没用）。翻卡「排练」是 act-out。
**为什么就是讲解**：先立住「规模」这个变量。一个太小的模型，数据再多也学不会；连一个数字都拼不出来。同时埋下 running gag：
在这家剧场里，「排练」就是训练数据。

**SFX**：夜里书房的底噪；吊杆收线「嗖」；便利贴「啪」（全片同一条素材）；翻卡「嗒嗒嗒」越来越快；大幕「呼」+ 幕杆「咔」。
**出处**：347 + 586 = 933 是我们自出的示意题（算术已核）；同类题型「三位数加减」在 GPT-3 上 13B 才出现（Wei 表 1，§10.2）。
「一只蚂蚁」是荒诞极值，不需要出处。

### B1 · 再多来点 / More ants　0:05.05-0:14.15（三翻）

**画面**：三次起幕，同一机位、同一节奏、同一套音效。每次起幕镜头后退约 4%，看台「长高」。拼字的卡阵每次一样大
（5×7 格一位数，三位数约 x 220-660、y 780-960，数字高约 180 px），变的是周围的蚂蚁数量。每次都拼得清清楚楚，只是拼错。
- 0:05.05 大幕升起（0.4 s）；跑马灯灯泡逐个亮起："ANT TALENT NIGHT · FREE ENTRY*" /「蚂蚁达人之夜 · 免费入场*」
  （y 400-460，52 px）。星号没有脚注。
- **一翻** 0:05.55：约 300 只蚂蚁站在三级卡纸看台上，每只举一张卡，拼出 "918"。
  - 0:06.25 乐池里三块评委分牌（卡纸圆牌 + 木棍，看不到手）冒头："0 / 0 / 0"（x 560-860，y 1060-1150）；
    栏杆上的小铜牌跟着升起："JUDGES: ALL OR NOTHING" /「评委：全对才给分」（40 px，y 1150-1190）。
  - 0:06.80 猫在栏杆上贴一张小黄贴 "1/3"，贴得低（x 360-440）。
- 0:06.95 落幕，0:07.25 起幕。**二翻** 0:07.60：约 1,500 只，看台高到飞杆，拼出 "932"。
  - 0:08.05 评委 "0 / 0 / 0"。0:08.85 猫贴 "2/3"，高一截（x 450-530）。
- 0:08.90 落幕，0:09.15 起幕。**三翻** 0:09.50：蚂蚁塞满舞台、侧幕、天桥，连台口檐上都站着（约 4,000 只，多数在景深里虚掉），
  拼出 "933"。
  - 0:09.95 评委分牌一齐翻成 "100 / 100 / 100"，飞杆撒下粉、黄两色的里索纸屑。
  - 0:10.30 猫贴 "3/3"，最高（x 540-620）。三张便利贴连起来是一道坡。
- 0:10.70 一张里索海报从飞杆落进台口上部（y 500-740，盖不住数字），在绳上摆两下，0:11.40 停住：
  EN "MORE IS DIFFERENT"（96 px）+ "P. W. Anderson · Science, 1972"（40 px）；
  ZH「多者异也」（96 px）+ "More Is Different"（40 px）+「P. W. 安德森 ·《科学》· 1972」（40 px）。
  可选的更小一行（给暂停的人，40 px）："first given as a lecture in La Jolla, 1967" /「最早是 1967 年在拉霍亚的一场讲座」。

**VO EN**："More ants." (0:05.25) … "Zero." (0:06.35) … "More." (0:07.30) … "Still zero." (0:08.15) … "More—" (0:09.20) …
"…it adds." (0:10.05) … "A physicist put it: more is different." (0:10.75-0:13.85)
**VO ZH**：「多来点。」…「零。」…「再多。」…「还是零。」…「再多——」…「……会了！」…「物理学家安德森说：多，就不一样。」

**画中字**：跑马灯（52 px）；卡阵数字 "918 / 932 / 933"；评委分牌 "0 / 100"（56 px）；铜牌（40 px）；便利贴 "1/3 2/3 3/3"
（48 px，高低递增）；安德森海报（96 / 40 px）。

**喜剧**
- 三翻：同一句「再多」、同一个起幕声，第三下才翻成 100。
- 装傻：旁白只念评委的分，「零。还是零。」
- 无声吐槽（埋）：猫的便利贴一张比一张高，其实每次都在进步。B3 兑现。

**为什么就是讲解**
1. 拼出数字的是一群蚂蚁，不是任何一只：能力属于整体。Wei 等把涌现定义为 "quantitative changes in a system result in
   qualitative changes in behavior"，并说这个说法源自 Anderson 1972（FACTS A10）。
2. 评委的 0 / 0 / 100 正是「涌现」曲线的形状。
3. 台上只演一道题；真数据在 B2 的海报上，画面不替论文夸大。

**SFX**：每次相同：幕落「呼」→ 幕杆「咔」→ 看台翻牌「哗啦」→ 评委牌木头「嗒嗒嗒」。三翻那次加一记小军鼓、一声变调的蚂蚁群倒吸气、
纸屑沙沙。海报落下的纸声 + 绳子「嘣」。
**出处**：Anderson, "More Is Different", *Science* 177:393-396, 1972（FACTS A1）；不提诺奖和这篇文章的关系（A3）；
拉霍亚 1967（A4，小字只写原文的 "La Jolla"）。

### B2 · 真曲线 / The real curve　0:14.15-0:22.45（安静区）

**画面**
- 0:13.95-0:14.55 安德森海报被吊上去；同一根绳经滑轮把一张更大的里索海报放下来（配重），停在台口前（x 80-860，y 330-1150）。
  焦点拉到海报平面（z ≈ 950），后面的剧场虚掉。音乐退场。
- 海报（重画 Wei 等 2022 图 2A 的形状，只画 GPT-3 一条线，**示意**）：
  - 标题 "ARITHMETIC · GPT-3" /「算术题 · GPT-3」（56 px，y 360-420）；下面一行 "modified arithmetic, BIG-Bench" /
    「改版算术题，BIG-Bench」（40 px）。
  - 纵轴 "accuracy" /「准确率」；横轴 "training compute →" /「训练总运算量 →」（40 px，y ≈ 1010）。四个刻度，不印指数。
  - 八个藏青网点印的点：左边贴着 0，在标 "13B"（44 px）的点处抬头，右上最后一点不标数。
  - 角落 "schematic · after Wei et al. 2022, Fig. 2A" /「示意 · 据 Wei 等 2022 图 2A」（40 px，y ≈ 1100）。
- 0:15.60 一只毛毡蚂蚁从海报底边爬上来（felt_ant_climb），0:17.20 坐在 13B 那个拐点上（felt_ant_sit）。
- 0:17.60-0:19.20 猫的红笔在三段刻度间隔上各写一个 "×100"（44 px，每个 0.5 s）；0:19.40 在横轴下画一道线，写
  "operations, not speed" /「总运算量，不是速度」（44 px）。
- 0:20.40 拐点上的蚂蚁回头指了指左边贴着地面的那一串点（小模型），耸耸肩。
- 0:21.20 蚂蚁旁边，红笔脚注自己写出来："*parameters, not ants (our analogy)" /「*是参数，不是蚂蚁（比喻是我们的）」（40 px）。
- 0:21.90-0:22.45 蚂蚁顺着海报侧边像滑楼梯扶手一样滑下去，镜头跟着下摇到乐池栏杆 → B3。

**VO EN**："Language models too: near zero on arithmetic, then a jump at thirteen billion parameters." (0:14.30-0:20.15) …
"Small models won't warn you." (0:20.30-0:22.25)
**VO ZH**：「大模型也是：算术题几乎零分，到一百三十亿参数，突然跳起。」…「小模型上，看不出来。」

**画中字**：海报标题（56 px）、"13B"（44 px）、轴标签和出处（40 px）、红笔 "×100" 和 "operations, not speed"（44 px）、
脚注（40 px）。必读只有两处：标题和 "13B"。

**喜剧**：无（关键数字的安静区，SERIES §6.2）。只有一个视觉锚点：坐在拐点上的蚂蚁；一行说破类比的脚注给暂停的人。
**为什么就是讲解**
- 「真东西」在前 30 s 内上屏（发布检查表第 2 项）。
- "Small models won't warn you." 就是 slide 9 第一条，也是丁老师在课上的原话意思："you do not do the experiments, you will
  never know"（20:11）。CS336 原句里的 "<1B" 是那门课自己的预算，不是阈值（FACTS §0），所以不说 1B。
- 红笔 ×100：横轴是对数的，每格贵一百倍，这为 B6「规模越大越不能浪费」埋了伏笔（嫁接 5）。

**SFX**：滑轮吱呀 + 海报纸声 + 绳子「嘣」；蚂蚁爬纸的细碎声；红笔「吱」×3 + 一道长线；滑下来的「咻」。只有底噪，没有音乐。
**出处**：FACTS A13（改版算术：GPT-3 在 2×10^22 FLOPs、13B 参数处跳起）；Wei 表 1（三位数加减：2.3E+22、13B、GPT-3，§10.2 待补行）；
A12（横轴是训练总 FLOPs，不是 FLOP/s；图 2 刻度 10^18 / 10^20 / 10^22 / 10^24，每格 ×100）；A11（图 2A 是 BIG-Bench 改版算术）；
曲线按开放项 8 标「示意」。

### B3 · 猫的打分 / The cat's scorecard　0:22.45-0:28.55（诚实限定）

**画面**
- 0:22.45 焦平面落在乐池栏杆（z ≈ 820），近景：
  - 左：猫的三张黄便利贴高低递增 "1/3 · 2/3 · 3/3"（x 120-460，y 780-1100），像一道**坡**。
  - 右：评委三块牌 "0 · 0 · 100"（x 520-860，y 780-1100），像一级**台阶**。
  - 底下两块铜牌（40 px，y 1120-1170）：左 "CAT: PARTIAL CREDIT" /「猫：给部分分」，右 "JUDGES: ALL OR NOTHING" /「评委：全对才给分」。
  - 画面顶部露出曲线海报的底边（y 290-440）。
- 0:22.60 猫的头从左下前景探进来（x 60-300，y 980-1190），转向镜头，冷面半眯眼，0.5 s（felt_cat_back）。
- 0:24.20 猫的红笔从第一张便利贴到第三张连一条斜线；同一瞬间评委牌上方印出一条直角折线（里索蓝）。坡和台阶并排。
- 0:26.00 一个粉色里索滚筒从海报底边压过，留下一枚章（44 / 40 px，y 300-420）：
  EN "…a Mirage?" + "Schaeffer, Miranda & Koyejo · NeurIPS 2023"；ZH「……是海市蜃楼吗？」+「Schaeffer 等 · NeurIPS 2023」。
- 0:28.20 一张新海报从飞杆落下，镜头被带着上摇 → B4（0:28.55）。

**VO EN**："Give partial credit, like the cat, and one paper finds many jumps smooth out." (0:22.60-0:28.30)
**VO ZH**：「像猫这样给部分分，有篇论文发现：很多『突然』，变成了『渐渐』。」

**画中字**：便利贴、评委牌、两块铜牌（40 px）、滚筒章（44 / 40 px）。章上的题目只用原题里的原词（"…a Mirage?"），
不缩写成 "LLMs"（评审 A10）。

**喜剧**：小反转。B1 里被旁白无视的那排便利贴，才是更好的尺子。吐槽是无声的：猫的冷脸。
**为什么就是讲解**：这就是反方论文的论点：同样的模型输出，换成连续的尺子，很多「突然跳起」就成了平滑的坡（FACTS B3）。
他们用的正是 GPT-3 家族的算术题、token edit distance（SMK p.5，§10.2），所以猫「按位给分」是对论文实验相当贴切的简化。
- 这是本集的诚实限定（SERIES §4 每集一个）。
- 坡和台阶是剧里猫的分数，不是论文数据；海报上不加任何「平滑曲线」，不伪造数据线。
- 论文自己的限定（没说大模型不会带来惊喜，B6）和「仍有争议」进帖文。

**SFX**：红笔长「吱——」；猫一声很轻的鼻息；滚筒压印「咚嚓」。
**出处**：FACTS B1（原题 "a Mirage?"，课件误作 "an Illusion?"）、B2、B3、B6；SMK p.5 的实验设置（§10.2 待补行）。

### B4 · 剧团越请越大 / Bigger casts　0:28.55-0:41.80（主包袱三翻，running gag 升级）

**画面**
- 0:28.55 剧场规定海报落在台口上部（y 520-760），里索三色：
  - EN "HOUSE RULE"（44 px）/ "BUDGET ≈ CAST × REHEARSAL"（64 px）；
  - ZH「剧场规定」/「预算 ≈ 演员 × 排练」；
  - 给暂停的人（40 px，两行）："budget = training compute · cast = parameters · rehearsal = training tokens" /
    「预算 = 训练算力 · 演员 = 参数 · 排练 = 训练 token」。
- 0:30.60 两块卡纸翻页牌沿台面滑轨从两侧侧幕推到台唇的画架上：左 "CAST /演员"（x 120-440），右 "REHEARSAL /排练"
  （x 500-860），y 930-1180。帷幔上换上年份条 "2020–2021"（40 px，y 470-510）。
- **翻一** 0:32.10：CAST "175B" / REHEARSAL "300B tokens"。幕后的看台上，蚂蚁每只手里拿一页薄薄的剧本（felt_ant_crowd #3）。
- **翻二** 0:35.85：CAST "280B" / REHEARSAL "300B"。蚂蚁挤进乐池，把评委牌顶歪。
- 0:36.90 猫把第二张「排练」便利贴拍在 REHEARSAL 牌的上沿，大一号："REHEARSAL??" /「排练呢？？」（72 px）。**停 1.2 s**
  （比原稿多 0.5 s，嫁接 3：这是观众自己下注的一刻）。
- **翻三** 0:38.10：CAST "530B"；REHEARSAL 牌多翻过去一页、犹豫一下、又倒回来一页（0:38.10-0:38.60），停在 "270B"。
  - 0:39.00 蚂蚁漫过脚灯，涌到桌面上；红毡大幕被挤得鼓起来。
  - 0:39.40 猫用红笔在 "270B" 上画个圈，加一个向下的箭头（felt_cat_pen）。
- 0:39.50 旁白装傻那句时，镜头停在两块牌的对比上。0:41.50 鼓起的大幕整体「咚」地落下 → B5。

**VO EN**："House rule: budget is roughly cast times rehearsal." (0:28.70-0:32.10) … "Casts grew." (0:32.20) …
"Rehearsal: three hundred billion tokens." (0:33.75-0:35.75) … "Three hundred." (0:35.95) … "Two-seventy." (0:38.65) …
"Rehearsal's for small troupes." (0:39.50-0:41.45)
**VO ZH**：「剧场规定：预算，约等于演员乘排练。」…「演员越请越多；」…「排练：三千亿 token。」…「三千亿。」…「两千七。」…
「排练？小剧团才排练。」

**画中字**
- 翻页牌数字 96 px、标签 44 px：EN "175B / 280B / 530B" 和 "300B / 300B / 270B tokens"；
  ZH「1750 亿 / 2800 亿 / 5300 亿」和「3000 亿 / 3000 亿 / 2700 亿 token」。
- 年份条 "2020–2021"（40 px）；便利贴 "REHEARSAL??" /「排练呢？？」（72 px）。

**喜剧**
- 三翻：演员一路涨，排练原地踏步，第三下甚至往回掉。「两千七」是真数字，本身就是包袱。
- 装傻：旁白亲口说「排练？小剧团才排练」，把 slide 11 的错误读法（只有规模重要）演出来；B5、B7 两次收回。
- 吐槽：猫的便利贴升级。

**为什么就是讲解**：规矩写在墙上（预算 ≈ 参数 × 数据）。观众看着一个因子猛涨、另一个不动，自己就能猜到下一拍，这正是
Chinchilla 的问题设定：固定算力下，模型和数据怎么分。三组都是真实配置（Chinchilla 表 1），只给规模，不给名字（不拿别家开玩笑）。

**SFX**：翻页牌「哗啦啦」三次同音，第三次多一个「咔哒——咔」的倒翻；蚂蚁群声越来越密；毡幕被挤的闷声；大幕重重的「咚」。
**出处**：Chinchilla 表 1（p.3：GPT-3 175B / 300B，Gopher 280B / 300B，MT-NLG 530B / 270B）与 p.1 原句 "many of the recently trained
large models have been trained for approximately 300 billion tokens"（§10.2 待补行；FACTS E4 只有 Gopher 一行）；
「预算 ≈ 演员 × 排练」= Chinchilla §3.3 p.7 "FLOPs(N, D) ≈ 6ND (Kaplan et al., 2020)"（§10.2 待补行）；D4（2020 年的建议：
预算多了主要拿去做大模型）；年份：GPT-3 2020，Gopher 2021 年 12 月，MT-NLG 2021 年 10 月宣布（评审 §4）。

### B5 · 2022，小剧团 / The small troupe　0:41.80-0:52.55（四抖，主反转）

**画面**
- 0:41.80 一张黄色里索年份卡 "2022"（120 px，y 560-760）落在合着的大幕前，「咚」。
- 0:42.10 大幕连同年份卡一起升起（同一根吊杆），露出一个**两层舞台**（像楼座）。竖屏里上下分（SERIES §5.3）：
  - 上层（y 560-800）：280B 大剧团，拥挤，每只拿一页薄剧本，冷一些的钢蓝光；楼座栏杆上的牌 "280B · 300B tokens"
    （x 560-860，y 740-800，44 px）。
  - 下层（y 880-1130）：70B 小剧团，只有上层四分之一的蚂蚁，每只抱一摞厚剧本（felt_ant_scripts），琥珀追光；
    牌 "70B · 1.4T tokens"（x 560-860，y 1060-1130）。B0 那只蚂蚁站在下层第一排正中。
  - 两层之间横挂一个卡纸信封（x 220-780，y 800-880），一半在上层一半在下层，盖着章 "SAME BUDGET" /「同一笔预算」（56 px）；
    封口小字（40 px）："same training compute · Chinchilla 70B vs Gopher 280B · Hoffmann et al. 2022" /
    「训练算力相同 · Chinchilla 700 亿 vs Gopher 2800 亿 · Hoffmann 等 2022」。
- 0:47.20 猫的第三张「排练」便利贴，同一声拍打，拍在下层的牌上："Rehearse more." /「多排练。」问号换成句号。
- 0:47.40-0:48.00 **静 0.6 s**（音乐退、只有底噪）。0:47.60 两块评委分牌升起：一块绑在一根长得离谱的竹竿上，一直举到楼座，
  "60.0"；一块在栏杆前给下层，"67.6"。下层那块下面一行 "57-subject exam" /「57 科考试」（40 px），再小一行 "MMLU, 5-shot"（40 px）。
- 0:48.00 掌声（变调的蚂蚁掌声）。
- 0:49.90 "Double the cast…" 时，下层两块牌同步各翻一下，翻成 "×2" 和 "×2"（只示意规则，不编新数字）。
- 0:51.90 小剧团鞠躬（felt_ant_bow）；0:52.20 大幕落下 → B6（0:52.55）。

**VO EN**："Same budget: a quarter of the cast, about four times the rehearsal." (0:42.25-0:47.05) … "The small troupe won."
(0:48.10-0:49.60) … "Double the cast, double the rehearsal." (0:49.75-0:52.25)
**VO ZH**：「同一笔预算：演员只要四分之一，排练约四倍。」…「小剧团赢了。」…「演员翻倍，排练也得翻倍。」

**画中字**：年份卡 "2022"；信封章（56 px）+ 小字（40 px）；两层的牌（44 px）；便利贴 "Rehearse more." /「多排练。」（56 px）；
分牌 "60.0 / 67.6"（72 px）+ "57-subject exam /57 科考试"（40 px）；"×2 ×2"（72 px）。必读：信封和两块分牌（一组对比）。

**喜剧**
- 四抖：前三次都是「更大」，第四次反方向「更小」，而且赢了。
- running gag 反转：问号变句号，猫当初的傻问题成了答案。旁白认输，只念结果。
- 回扣：B0 那只被嫌弃的蚂蚁站在赢家第一排。
- 长竹竿举分牌：给楼座打分得够得着，物理上合理，也让「60.0」低人一头。

**为什么就是讲解**：这就是 Chinchilla。同样的训练算力，模型缩到四分之一、数据约 4 倍（实为 4.7 倍），在大多数测试上赢了。
B0 + B5 合起来：演员（参数）不够不行，排练（数据）不够也不行，所以一起涨（"double the cast, double the rehearsal"，E3）。
不说「小就是好」（FACTS §2c），规则那句把意思收回到「配比」。关键数字处静 0.6 s，笑点晚一拍（SERIES §6.2）。

**SFX**：年份卡「咚」；幕起；剧本摞「噗」地落在台板上；便利贴「啪」（同一条素材）；静；两声木牌「嗒」；掌声；谢幕的窸窣；大幕。
**出处**：FACTS E1、E3、E4（70B / 1.4T vs 280B / 300B，同为 5.76×10^23 FLOPs；论文原话 "4 times more tokens"，1400 / 300 = 4.7，
所以说 "about four times"）、E6（MMLU 5-shot：67.6 / 60.0，用表 6 的 67.6；57 科见 A11）、E7（同预算只对 Gopher）、E8（不是全胜：
「在大多数测试上」进帖文）。

### B6 · 账单进了工业时代 / The bill goes industrial　0:52.55-1:05.15

**画面**
- 0:52.55 一块巨大的翻页账单板从飞杆砸下来，横担在台口顶上（y 280-680，x 60-1020；y < 700 允许到 1020），光柱里扬起一团灰。
  板太大，镜头被迫后退约 20%（0:52.55-0:53.95，各平面产生视差）：左上角的银行家台灯进了画（x 40-300，y 80-420，远景，
  只当背景），剧场在画面里变小。帷幔上的年份条换成 "2023–2025"。
- **翻一** 0:54.30：EN "> $100,000,000"（96 px）+ "one frontier training run (est.)"（44 px）；ZH「> 1 亿美元」+「训练一个顶级模型（估算）」。
  角落小字（40 px）："e.g. Gemini Ultra ≈ $191M · Stanford AI Index 2024" /「例：Gemini Ultra 约 1.91 亿美元 · 斯坦福 AI Index 2024」。
  两侧侧幕片沿桌面上的卡纸滑轨向外拉开，台口宽了约 10%。
- **翻二** 0:57.10（**纯画面，不念**）：EN "100,000 H100 GPUs" + "in one cluster"；ZH「10 万张 H100」+「一个集群」；角落 "xAI Colossus, 2024
  (xAI, NVIDIA)"。一根灯杆从飞杆降下，上面一排排小滤色片灯（实例化，往景深里排到看不见）「咔咔咔」依次亮起。
  0:57.60 桌上的银行家台灯闪两下，暗下去一档（0:57.60-0:58.20）：电被剧场抽走了。猫抬头看台灯（felt_cat_lookup）。
- **翻三** 0:58.25：EN "$500,000,000,000" + "over 4 years (planned)"；ZH「5000 亿美元」+「四年（计划）」；角落 "Stargate Project, announced
  21 Jan 2025"（抖音版措辞待定，§16）。侧幕再外拉一次。
- 1:00.60 猫（在画面里变小了，左下 x 80-420，y 960-1180）双爪举起一张便利贴（felt_cat_note）："1% of $100M = $1M" /
  「1 亿的 1% = 100 万」（56 px）。
- 1:04.75 红幕落下（幕后机位回到第 0 帧那一套）→ B7（1:05.15）。

**VO EN**："Budgets went industrial. One frontier run: an estimated hundred million plus." (0:52.85-0:57.00) … [翻二不念，台灯闪] …
"One plan: five hundred billion dollars." (0:58.30-1:00.50) … "Save one percent of one run: a million dollars." (1:00.90-1:04.80)
**VO ZH**：「加量，又加价：训一个顶级模型，估计上亿美元。」…［不念］…「一个计划：五千亿美元。」…「按一亿算，省百分之一，就是一百万美元。」

**画中字**：每页一个数字 + 一行说明（数字 96 px，说明 44 px），每张牌只用一种单位（FACTS §6）；角落出处 40 px（给暂停的人）；
年份条 40 px；便利贴 56 px。

**喜剧**
- 三翻：每翻一次剧场长大一圈。
- 视觉笑点（EN 的主笑点）：台灯被抽暗，「资源」那个因子变成书房里看得见的东西。它在中段，按 §7.2 只因为它把「资源」画成了实物
  才保留（评审 fix 7）。
- ZH 独有的 B 级重写：「加量，又加价」改写自「加量不加价」：B5 刚说完「演员翻倍，排练也翻倍」（加量），账单就来了（加价）。
  EN 同一拍是冷面的 "Budgets went industrial."，笑点交给台灯。

**为什么就是讲解**：slide 10 的工业化数字，加上 slide 11 的关键洞见「规模越大越不能浪费」（F4）：便利贴把「1%」换成真钱，
是我们自己的算术（C6）。诚实措辞：5000 亿是「计划四年内投入」，不是一次训练，也不是已经花掉的钱（C4）；1 亿美元以上是「估计」（C2）；
10 万张卡是「一个集群」，不说 Grok 3 用了多少（C3）。

**SFX**：账单板砸下的重「嘭」+ 灰；三次翻页（与 B4 同一种声音，更低、更大的空间）；卡纸滑轨摩擦；灯杆滑轮 + 一排灯「咔咔咔」亮起；
台灯电流「滋滋」两下变暗；便利贴窸窣；大幕。
**出处**：FACTS C2（WIRED 2023；AI Index 2024 估算 Gemini Ultra 约 1.91 亿美元；不放人名，不放 Altman 的话）、C3（Colossus 10 万张
Hopper GPU，2024 年 9 月上线）、C4（Stargate，2025-01-21 宣布，四年 5000 亿美元的计划）、C6（Derived）、F4；年份条 2023（WIRED）–2025（Stargate）。

### B7 · 两个因子 / The two factors　1:05.15-1:19.10（结尾：反转 + callback）

**画面**
- 1:05.15 红幕升起，机位回到第 0 帧那一套。台上空着，琥珀追光。台口里已经挂着口号卡（里索三色，"×" 用粉色大字，y 520-760）：
  - EN "ACCURACY = / EFFICIENCY × RESOURCES*"（76 px，两行）；ZH「准确率 = 效率 × 资源*」（80 px）；
  - 署名（40 px）："motto · Stanford CS336, Lecture 1 (2025)" /「口号 · 斯坦福 CS336 第 1 讲（2025）」；
  - 下一行（40 px）："a motto, not a law" /「是口号，不是定律」。
- 1:09.40 口号卡下面，一块小牌在自己的线上荡进来（x 160-820，y 800-950）：上面先印着 "wrong reading:" /「错误读法：」（40 px），
  再是 "SCALE IS ALL THAT MATTERS." /「规模就是一切。」（56 px）。1:10.00 它一停稳，猫的红笔就一道斜线划掉（felt_cat_pen）。
- 1:10.25 猫把座位上的节目单（折页，里索印）推到栏杆上，摊开（x 480-860，y 1060-1180）："PROGRAMME · CSE 291P · LLM System
  Optimization"（44 px）/ "Prof. Yufei Ding · UC San Diego"（40 px）；ZH「节目单 · CSE 291P ·《大模型系统优化》」/
  「Yufei Ding 教授 · UC San Diego」。
- 1:10.45-1:15.05 **丁老师本人的声音**（课堂录音片段，或请她按原话重录）。字幕是她的原话，加引号。
  1:12.60-1:14.60 猫在划掉的牌下面用红笔写 "→ ALGORITHMS THAT SCALE" /「→ 能放大的算法」（56 px），恰好在她说
  "efficiently make it larger" 时写完。
- 1:15.05 口号卡沿着吊线降到栏杆的高度（飞杆放线），"RESOURCES*" 那一行停在猫爪够得着的地方（y ≈ 1020-1100），盖住划掉的小牌。
- 1:15.25 "Efficiency: taught here." 时，猫用红笔圈一下 "EFFICIENCY"。
- 1:16.80 "Compute…" 时猫举起橡皮章；1:17.55-1:18.05 **静 0.5 s**。
- 1:18.00 **盖章**「咚」：红色印章盖在 "RESOURCES*" 的星号上："*compute not included" /「*算力另计」（56 px，felt_cat_stamp）。
- 1:18.70-1:19.10 口号卡被吊回去，停在高处，只露出盖了章的那条底边，正好在已经亮着的跑马灯 "… FREE ENTRY*" 下面
  （y 470-560）：跑马灯的星号终于有了脚注。追光扫回中央，露出一直挂在后面的标题卡；那只单独的蚂蚁走回光圈，举起它的一张黑卡。
  构图回到第 0 帧（多了亮着的跑马灯和那条红章），X 循环时接回 0:00。

**VO EN**："Stanford's CS336 motto: accuracy equals efficiency times resources." (1:05.40-1:10.00) …
**[Prof. Yufei Ding, lecture voice]** "If you can make it larger, then the idea is: how can you efficiently make it larger?"
(1:10.45-1:15.05) … "Efficiency: taught here." (1:15.25-1:16.70) … "Compute…" (1:16.80-1:17.55) [静 0.5 s，1:18.00 盖章]
"…not included." (1:18.10-1:18.70)
**VO ZH**：「斯坦福一门课的口号：准确率，等于效率乘资源。」…［丁老师原声，英文；中文字幕：「"能做大，接下来就要想：怎么更高效地
做大？"」后缀小字「（译文）」］…「效率，这门课教。」…「算力嘛……」［盖章］「另计。」

**丁老师不同意时的备用**（1:10.45 起，3.2 s，全片 77.7 s）：EN "Not scale alone: algorithms that scale." /
ZH「不是光堆规模，是能放大的算法。」画面不变（节目单照样摊开，但不印她的名字以外的任何引语）。

**画中字**：口号卡（76-80 px）+ 署名 + 定性（40 px）；错误读法小牌（40 / 56 px）+ 红笔改写（56 px）；节目单（44 / 40 px）；
跑马灯（52 px）；印章（56 px）。丁老师说话时，画中必读只有红笔改写和节目单两处。

**喜剧**：反转 + callback。第 0 帧之后一直挂着的 "FREE ENTRY*" 在最后一秒有了脚注：免费的是效率，算力得自己带。
品牌句盖在 "RESOURCES*" 上，所以它自己就能解释：口号两个因子，这门课教前一个，后一个另计。最后一句是系列名，这一集第一次把它「挣」到手。

**为什么就是讲解**
- 口号的正确读法：效率是乘数，不是替代品；资源为零，效率再高也是零。这一拍把 B5 可能留下的「规模不重要」拉回来。
- 红笔改写就是 slide 11 的错误 / 正确读法（F3）；「规模就是一切」从不单独出现（FACTS §6）。
- 丁老师那句就是她课上对「研究为什么由效率驱动」的原话：能做大，就要想怎么高效地做大。它是本集 ONE idea 的她自己的版本，
  也是这门课存在的理由（她 24:16 说 "that's why we want to develop this class"）。不让她承担任何笑点（SERIES §3）。

**SFX**：红幕升；小牌在线上荡的吱呀；红笔划线「skrrt」；节目单在栏杆上滑开；（丁老师原声，底下只留很轻的房间声）；红笔写字；
吊线放下的吱呀；红笔画圈；静 0.5 s；印章「咚」（系列声音 logo）；可选一声真猫叫（全片唯一一声，1:18.75）；追光「咔」接回第 0 帧的底噪。
**出处**：F1、F2、§2d（口号、署名、不是定律）；F3；F5（课名、L01 p.1、p.4）；F6（GPU 额度未核）；丁老师原话：L01 录音 21:38-21:44
（ASR 草稿，须对着录音听一遍改字，须本人同意，`notes/ding_on_background.md` 排名第 1）。

---

## 6. 喜剧四项测试（SERIES §7.2）

| # | 笑点 | Resolution（懂了机制才笑得出） | Truth | Number | Analogy-break |
| --- | --- | --- | --- | --- | --- |
| G1 | B0「多排练？」/ 翻卡排练 /「也还是一只」 | 半懂也能笑；冷开场允许，且立住「容量」 | 一个参数学不会三位数加法：对 | 荒诞极值 | 蚂蚁 ≠ 参数，B2 脚注说破 |
| G2 | B1「零。还是零。」对上猫的 1/3、2/3 | 要看懂评委和猫用的是两把尺子，B3 兑现 | 单道示意题，真数据在 B2 | 918 / 932 / 933 是示意 | 人数不对应参数量；只用 13B 一个真数 |
| G3 | B3 坡 vs 台阶，「像猫这样给部分分」 | 只有懂「全对才给分会把渐进藏起来」才好笑 | 与 SMK 论点一致；不画假数据线 | 无新数字 | 「按位」是简化，旁白只说「部分分」 |
| G4 | B4 300 / 300 / 270 + 「排练？小剧团才排练」 | 要看懂「预算 ≈ 演员 × 排练」才好笑 | 三组配置都是真的（表 1） | 真数，有出处 | 预算 = 算力，不是美元：卡上写明 |
| G5 | B5 小剧团赢了；问号变句号；长竹竿 | 要懂「同预算下的配比」才成立 | Chinchilla 原结论；同预算只对 Gopher | 真数（67.6 / 60.0） | 不说「小就是好」，规则那句收回 |
| G6 | B6 台灯被抽暗；「加量，又加价」 | 台灯偏装饰，靠把「资源」画成实物留在中段；「加量又加价」要懂规模与成本 | 不给耗电数字 | 三个账单数都有出处 | — |
| G7 | B7 "FREE ENTRY*" → 盖在 "RESOURCES*" 上的 "*compute not included" | 要懂口号是乘法：资源省不掉 | 课教效率，给不了前沿规模资源（F6） | 无 | 若课程发 GPU 额度，改 "*frontier-scale compute not included" |

密度：79 s 里 7 个笑点（SERIES §7.3：60 s 4-6 个、90 s 6-9 个）。约 70% 是跨语言的 A 级（act-out、三翻、便利贴、视觉反转）；
B 级一处（ZH「加量，又加价」，EN 换成台灯）；C 级是最后一句的系列名，中英各自原生（"Compute… not included." /「算力嘛……另计。」）。
不拿任何真人开玩笑：B4、B5 只给规模；猫是全片唯一被开玩笑的对象（加上装傻的旁白，也就是「我们」自己）。

---

## 7. VO 表

每行一句；时间是片内绝对时间；「时长」是给这句留的窗口。EN 列是字幕 / 显示文字，JSON 里的 `en` 是给 TTS 念的口语形式
（"CS336" 写成 "C S three thirty-six"）。字幕切分用 `|` 表示换一条、`/` 表示同一条的第二行。

| id | 拍 | 起 | 时长 | EN | ZH | 字幕切分 EN | 字幕切分 ZH |
| --- | --- | --- | --- | --- | --- | --- | --- |
| v01 | B0 | 0.25 | 1.80 | One ant can't add. | 一只蚂蚁，不会算数。 | One ant can't add | 一只蚂蚁 不会算数 |
| v02 | B0 | 2.35 | 2.60 | It could rehearse forever. Still one ant. | 排练一万遍，也还是一只。 | It could rehearse forever \| Still one ant | 排练一万遍 \| 也还是一只 |
| v03 | B1 | 5.25 | 0.70 | More ants. | 多来点。 | More ants | 多来点 |
| v04 | B1 | 6.35 | 0.35 | Zero. | 零。 | Zero | 零 |
| v05 | B1 | 7.30 | 0.45 | More. | 再多。 | More | 再多 |
| v06 | B1 | 8.15 | 0.65 | Still zero. | 还是零。 | Still zero | 还是零 |
| v07 | B1 | 9.20 | 0.45 | More— | 再多—— | More— | 再多—— |
| v08 | B1 | 10.05 | 0.60 | …it adds. | ……会了！ | …it adds | ……会了！ |
| v09 | B1 | 10.75 | 3.10 | A physicist put it: more is different. | 物理学家安德森说：多，就不一样。 | A physicist put it: / more is different | 物理学家安德森说 / 多 就不一样 |
| v10 | B2 | 14.30 | 5.85 | Language models too: near zero on arithmetic, then a jump at thirteen billion parameters. | 大模型也是：算术题几乎零分，到一百三十亿参数，突然跳起。 | Language models too: / near zero on arithmetic \| then a jump / at 13B parameters | 大模型也是 / 算术题几乎零分 \| 到130亿参数 / 突然跳起 |
| v11 | B2 | 20.30 | 1.95 | Small models won't warn you. | 小模型上，看不出来。 | Small models / won't warn you | 小模型上 看不出来 |
| v12 | B3 | 22.60 | 5.70 | Give partial credit, like the cat, and one paper finds many jumps smooth out. | 像猫这样给部分分，有篇论文发现：很多"突然"，变成了"渐渐"。 | Give partial credit, / like the cat, \| and one paper finds / many jumps smooth out | 像猫这样给部分分 \| 有篇论文发现 / 很多"突然" 变成了"渐渐" |
| v13 | B4 | 28.70 | 3.40 | House rule: budget is roughly cast times rehearsal. | 剧场规定：预算，约等于演员乘排练。 | House rule: budget is / roughly cast × rehearsal | 剧场规定 / 预算约等于演员乘排练 |
| v14 | B4 | 32.20 | 1.45 | Casts grew. | 演员越请越多； | Casts grew | 演员越请越多 |
| v15 | B4 | 33.75 | 2.00 | Rehearsal: three hundred billion tokens. | 排练：三千亿 token。 | Rehearsal: 300B tokens | 排练：3000亿 token |
| v16 | B4 | 35.95 | 0.80 | Three hundred. | 三千亿。 | 300B | 3000亿 |
| v17 | B4 | 38.65 | 0.75 | Two-seventy. | 两千七。 | 270B | 2700亿 |
| v18 | B4 | 39.50 | 1.95 | Rehearsal's for small troupes. | 排练？小剧团才排练。 | Rehearsal's for / small troupes | 排练？/ 小剧团才排练 |
| v19 | B5 | 42.25 | 4.80 | Same budget: a quarter of the cast, about four times the rehearsal. | 同一笔预算：演员只要四分之一，排练约四倍。 | Same budget: / a quarter of the cast \| about 4x the rehearsal | 同一笔预算 / 演员只要四分之一 \| 排练约四倍 |
| v20 | B5 | 48.10 | 1.50 | The small troupe won. | 小剧团赢了。 | The small troupe won | 小剧团赢了 |
| v21 | B5 | 49.75 | 2.50 | Double the cast, double the rehearsal. | 演员翻倍，排练也得翻倍。 | Double the cast, / double the rehearsal | 演员翻倍 / 排练也得翻倍 |
| v22 | B6 | 52.85 | 4.15 | Budgets went industrial. One frontier run: an estimated hundred million plus. | 加量，又加价：训一个顶级模型，估计上亿美元。 | Budgets went industrial \| One frontier run: / an estimated $100M+ | 加量 又加价 \| 训一个顶级模型 / 估计上亿美元 |
| v23 | B6 | 58.30 | 2.20 | One plan: five hundred billion dollars. | 一个计划：五千亿美元。 | One plan: $500 billion | 一个计划：5000亿美元 |
| v24 | B6 | 60.90 | 3.90 | Save one percent of one run: a million dollars. | 按一亿算，省百分之一，就是一百万美元。 | Save 1% of one run: / a million dollars | 按一亿算 省1% / 就是一百万美元 |
| v25 | B7 | 65.40 | 4.60 | Stanford's CS336 motto: accuracy equals efficiency times resources. | 斯坦福一门课的口号：准确率，等于效率乘资源。 | Stanford's CS336 motto: \| accuracy equals efficiency / times resources | 斯坦福一门课的口号 \| 准确率 等于效率乘资源 |
| d01 | B7 | 70.45 | 4.60 | [Prof. Yufei Ding] "If you can make it larger, then the idea is: how can you efficiently make it larger?" | （原声英文，中文字幕为译文） | "If you can make it larger, / then the idea is: \| how can you efficiently / make it larger?" | "能做大， / 接下来就要想： \| 怎么更高效地做大？" /（译文） |
| v26 | B7 | 75.25 | 1.45 | Efficiency: taught here. | 效率，这门课教。 | Efficiency: taught here | 效率 这门课教 |
| v27 | B7 | 76.80 | 0.75 | Compute… | 算力嘛…… | Compute… | 算力嘛…… |
| v28 | B7 | 78.10 | 0.60 | …not included. | 另计。 | …not included | 另计 |
| fb1 | B7 | 70.45 | 3.20 | （备用，替换 d01）Not scale alone: algorithms that scale. | 不是光堆规模，是能放大的算法。 | Not scale alone: / algorithms that scale | 不是光堆规模 / 是能放大的算法 |

给 `tools/tts.py` 的表（它读 `id` / `en` / `zh`，多余的键不影响；`d01` 两种语言留空，TTS 跳过，时间轴上留 4.6 s 空；
`fb1` 只在丁老师不同意时用）。复制到 scratchpad 的 `vo.json` 再跑：
`python3 .claude/films/edu/tools/tts.py SCRATCH/vo.json SCRATCH/tts`。临时 TTS 只用来对时间，永不发布。

<!-- VO_JSON_BEGIN -->
```json
[{"id": "v01", "beat": "B0", "who": "narrator", "t0": 0.25, "dur": 1.8, "en": "One ant can't add.", "zh": "一只蚂蚁，不会算数。"},
 {"id": "v02", "beat": "B0", "who": "narrator", "t0": 2.35, "dur": 2.6, "en": "It could rehearse forever. Still one ant.", "zh": "排练一万遍，也还是一只。"},
 {"id": "v03", "beat": "B1", "who": "narrator", "t0": 5.25, "dur": 0.7, "en": "More ants.", "zh": "多来点。"},
 {"id": "v04", "beat": "B1", "who": "narrator", "t0": 6.35, "dur": 0.35, "en": "Zero.", "zh": "零。"},
 {"id": "v05", "beat": "B1", "who": "narrator", "t0": 7.3, "dur": 0.45, "en": "More.", "zh": "再多。"},
 {"id": "v06", "beat": "B1", "who": "narrator", "t0": 8.15, "dur": 0.65, "en": "Still zero.", "zh": "还是零。"},
 {"id": "v07", "beat": "B1", "who": "narrator", "t0": 9.2, "dur": 0.45, "en": "More—", "zh": "再多——"},
 {"id": "v08", "beat": "B1", "who": "narrator", "t0": 10.05, "dur": 0.6, "en": "…it adds.", "zh": "……会了！"},
 {"id": "v09", "beat": "B1", "who": "narrator", "t0": 10.75, "dur": 3.1, "en": "A physicist put it: more is different.", "zh": "物理学家安德森说：多，就不一样。"},
 {"id": "v10", "beat": "B2", "who": "narrator", "t0": 14.3, "dur": 5.85, "en": "Language models too: near zero on arithmetic, then a jump at thirteen billion parameters.", "zh": "大模型也是：算术题几乎零分，到一百三十亿参数，突然跳起。"},
 {"id": "v11", "beat": "B2", "who": "narrator", "t0": 20.3, "dur": 1.95, "en": "Small models won't warn you.", "zh": "小模型上，看不出来。"},
 {"id": "v12", "beat": "B3", "who": "narrator", "t0": 22.6, "dur": 5.7, "en": "Give partial credit, like the cat, and one paper finds many jumps smooth out.", "zh": "像猫这样给部分分，有篇论文发现：很多突然，变成了渐渐。"},
 {"id": "v13", "beat": "B4", "who": "narrator", "t0": 28.7, "dur": 3.4, "en": "House rule: budget is roughly cast times rehearsal.", "zh": "剧场规定：预算，约等于演员乘排练。"},
 {"id": "v14", "beat": "B4", "who": "narrator", "t0": 32.2, "dur": 1.45, "en": "Casts grew.", "zh": "演员越请越多；"},
 {"id": "v15", "beat": "B4", "who": "narrator", "t0": 33.75, "dur": 2.0, "en": "Rehearsal: three hundred billion tokens.", "zh": "排练：三千亿 token。"},
 {"id": "v16", "beat": "B4", "who": "narrator", "t0": 35.95, "dur": 0.8, "en": "Three hundred.", "zh": "三千亿。"},
 {"id": "v17", "beat": "B4", "who": "narrator", "t0": 38.65, "dur": 0.75, "en": "Two seventy.", "zh": "两千七。"},
 {"id": "v18", "beat": "B4", "who": "narrator", "t0": 39.5, "dur": 1.95, "en": "Rehearsal's for small troupes.", "zh": "排练？小剧团才排练。"},
 {"id": "v19", "beat": "B5", "who": "narrator", "t0": 42.25, "dur": 4.8, "en": "Same budget: a quarter of the cast, about four times the rehearsal.", "zh": "同一笔预算：演员只要四分之一，排练约四倍。"},
 {"id": "v20", "beat": "B5", "who": "narrator", "t0": 48.1, "dur": 1.5, "en": "The small troupe won.", "zh": "小剧团赢了。"},
 {"id": "v21", "beat": "B5", "who": "narrator", "t0": 49.75, "dur": 2.5, "en": "Double the cast, double the rehearsal.", "zh": "演员翻倍，排练也得翻倍。"},
 {"id": "v22", "beat": "B6", "who": "narrator", "t0": 52.85, "dur": 4.15, "en": "Budgets went industrial. One frontier run: an estimated hundred million plus.", "zh": "加量，又加价：训一个顶级模型，估计上亿美元。"},
 {"id": "v23", "beat": "B6", "who": "narrator", "t0": 58.3, "dur": 2.2, "en": "One plan: five hundred billion dollars.", "zh": "一个计划：五千亿美元。"},
 {"id": "v24", "beat": "B6", "who": "narrator", "t0": 60.9, "dur": 3.9, "en": "Save one percent of one run: a million dollars.", "zh": "按一亿算，省百分之一，就是一百万美元。"},
 {"id": "v25", "beat": "B7", "who": "narrator", "t0": 65.4, "dur": 4.6, "en": "Stanford's C S three thirty-six motto: accuracy equals efficiency times resources.", "zh": "斯坦福一门课的口号：准确率，等于效率乘资源。"},
 {"id": "d01", "beat": "B7", "who": "ding", "t0": 70.45, "dur": 4.6, "en": "", "zh": "", "note": "Prof. Ding, verbatim lecture clip L01.mp4 21:38-21:44 (ASR draft, ear-check, needs her OK); not synthesized"},
 {"id": "v26", "beat": "B7", "who": "narrator", "t0": 75.25, "dur": 1.45, "en": "Efficiency: taught here.", "zh": "效率，这门课教。"},
 {"id": "v27", "beat": "B7", "who": "narrator", "t0": 76.8, "dur": 0.75, "en": "Compute…", "zh": "算力嘛……"},
 {"id": "v28", "beat": "B7", "who": "narrator", "t0": 78.1, "dur": 0.6, "en": "…not included.", "zh": "另计。"},
 {"id": "fb1", "beat": "B7", "who": "narrator", "t0": 70.45, "dur": 3.2, "en": "Not scale alone: algorithms that scale.", "zh": "不是光堆规模，是能放大的算法。", "note": "fallback that replaces d01 if Prof. Ding declines"}]
```
<!-- VO_JSON_END -->

---

## 8. 字数与语速

口径：EN 按口语词（数字按读法，"twenty twenty-three" 算 2，连字符词算 1，"CS336" 算 4）；ZH 按音节（一个汉字一个，token 读「托肯」算 2）。
窗口 = 给每句留的时长之和（不含换幕、拍便利贴、翻牌、静音）。

| 拍 | 长 | VO 窗口 | EN 词 | 词/s | ZH 音节 | 字/s |
| --- | --- | --- | --- | --- | --- | --- |
| B0 | 5.05 | 4.40 | 11 | 2.50 | 18 | 4.09 |
| B1 | 9.10 | 6.30 | 16 | 2.54 | 26 | 4.13 |
| B2 | 8.30 | 7.80 | 19 | 2.44 | 32 | 4.10 |
| B3 | 6.10 | 5.70 | 14 | 2.46 | 23 | 4.04 |
| B4 | 13.25 | 10.35 | 23 | 2.22 | 41 | 3.96 |
| B5 | 10.75 | 8.80 | 22 | 2.50 | 33 | 3.75 |
| B6 | 12.60 | 10.25 | 26 | 2.54 | 43 | 4.20 |
| B7 | 13.95 | 7.40 | 17 | 2.30 | 30 | 4.05 |
| **合计** | **79.10** | **61.00** | **148** | **2.43**（全片 1.87） | **246** | **4.03**（全片 3.11） |

- 另有丁老师原声 17 个英文词，约 4.6 s（ASR 时间戳推算，须实听）。用备用句时旁白 154 词 / 259 音节，全片 77.7 s。
- 单句最快：v22 EN 2.65 词/s、ZH 4.34 字/s；v25 ZH 4.13 字/s。录音偏赶就删 "Budgets went industrial." /「加量，又加价」
  （两种语言一起删，约 -1.0 s，全片 78.1 s，代价是 ZH 少一个 B 级包袱）。
- 字幕阅读速度：最密的一条是 v10 第一条（"Language models too: / near zero on arithmetic"，43 字符 / 约 2.6 s ≈ 16.5 字符/s），
  在 17 字符/s 以内；ZH 最密「大模型也是 / 算术题几乎零分」12 字 / 约 2.6 s ≈ 4.6 字/s，在 7 字/s 以内。

---

## 9. 声音

- 底噪：夜里的书房 + 一台纸剧场。音乐（原创，待定，SERIES §12.4）用小型杂耍剧场编制：钢琴、刷子军鼓、低音提琴。
  B2 整拍、B5 那 0.6 s、B7 丁老师原声和 "Compute…" 之后的 0.5 s，音乐全部退出，真的静。
- 固定拟音（三翻要求同一声，务必复用同一条素材）：幕落「呼」+ 幕杆「咔」；翻页牌「哗啦」；评委牌木头「嗒」；便利贴「啪」；
  红笔「吱」；印章「咚」（系列声音 logo，iPhone 实录一次）。
- 蚂蚁群声用真人群声升调 6-8 个半音，不用卡通音效库；真猫叫全片最多一声（B7 尾）。
- 丁老师那句：课堂录音的音质未知，混响去不掉；评审建议请她按同样的原话重录一遍（更干净，也能顺便确认用词）。
- 混音：旁白段音乐 -10 dB；-14 LUFS，true peak ≤ -1.5 dBTP（SERIES §8.1）。

---

## 10. 数字与出处台账

### 10.1 每个上屏 / 入旁白的数字

| 拍 | 数字或说法 | 措辞 | 出处 | 状态 |
| --- | --- | --- | --- | --- |
| B0-B1 | 347 + 586 = 933；918 / 932 按位得 1/3、2/3 | 示意题 | 我们的算术 | Derived，「our example」 |
| B1 | More Is Different, P. W. Anderson, *Science*, 1972 | 只用原题；不提诺奖与本文的关系 | FACTS A1、A3 | 已清 |
| B1 | 1967 年拉霍亚的讲座（可选小字） | 只写 "La Jolla" | A4 | 已清 |
| B2 | 算术题上 GPT-3 在 13B 处跳起 | "near zero on arithmetic, then a jump at thirteen billion parameters"；海报标「示意」与 "GPT-3" | A13；Wei 表 1 p.6 | A13 已清；表 1 待补行 |
| B2 | 横轴每格 ×100，是总运算量不是速度 | 红笔，不念 | A12、§6 | 已清 |
| B3 | "…a Mirage?"，Schaeffer, Miranda & Koyejo, NeurIPS 2023 | 只用原题原词 | B1、B2 | 已清 |
| B3 | 换连续指标，很多跳变变平滑 | "one paper finds many jumps smooth out" | B3（帖文加 B6） | 已清 |
| B3 | 论文用的是 GPT-3 家族算术题 + token edit distance | 不上屏，支撑猫的类比 | SMK p.5 | 待补行 |
| B4 | 预算 ≈ 演员 × 排练（C ≈ 6ND） | "roughly"；卡上「≈」；6ND 只进帖文 | Chinchilla §3.3 p.7 | 待补行 |
| B4 | 175B / 300B，280B / 300B，530B / 270B | 只给规模，不给名字 | Chinchilla 表 1 p.3（Gopher 一行 = E4） | 待补行（除 Gopher） |
| B4 | 「约 3000 亿 token」是当时的普遍做法 | 画面上的三张牌 | Chinchilla p.1 原句 | 待补行 |
| B4 | 2020–2021 | 年份条 | GPT-3 2020；Gopher 2021-12；MT-NLG 2021-10 宣布 | 评审 §4 已核，待补行 |
| B5 | 2022；70B / 1.4T vs 280B / 300B，同训练算力 | "Same budget: a quarter of the cast, about four times the rehearsal" | E1、E4、E7 | 已清 |
| B5 | 60.0 / 67.6，57 科考试，MMLU 5-shot | 分牌 | E6、A11 | 已清 |
| B5 | 演员翻倍，排练也翻倍 | 规则 | E3 | 已清 |
| B6 | > 1 亿美元，一次顶级训练，估计 | "an estimated hundred million plus" /「估计上亿美元」 | C2、§2b | 已清 |
| B6 | Gemini Ultra 约 1.91 亿美元（小字） | "Stanford AI Index 2024" | C2 | 已清 |
| B6 | 10 万张 H100，一个集群 | 不念；小字 "xAI Colossus, 2024" | C3 | 已清 |
| B6 | 5000 亿美元，四年，计划 | "One plan"；牌上 "over 4 years (planned)" | C4 | 已清 |
| B6 | 1 亿的 1% = 100 万 | 猫的便利贴 + "Save one percent of one run" | C6 | Derived |
| B6 | 2023–2025 | 年份条 | C2（WIRED 2023-04）、C3（2024-09）、C4（2025-01） | 已清 |
| B7 | 准确率 = 效率 × 资源；CS336 第 1 讲（2025）；是口号不是定律 | "Stanford's CS336 motto" | F1、F2、§2d | 已清 |
| B7 | 错误 / 正确读法 | 「规模就是一切」先印「错误读法：」并立刻划掉 | F3、§6 | 已清 |
| B7 | CSE 291P LLM System Optimization，Prof. Yufei Ding，UC San Diego | 节目单 | F5 | 已清（中文课名为我们的译名） |
| B7 | 丁老师原话 | 21:38-21:44 | `notes/ding_on_background.md` | **ASR 草稿，须实听 + 本人同意** |
| B7 | *compute not included /*算力另计 | 印章 | F6 | GPU 额度未核 |

### 10.2 录音前必须补进 FACTS.md 的行（评审第 4 节；本 session 又从 arXiv 原文逐条核过）

1. **Wei 表 1**（arXiv 2206.07682v2，p.6）："Addition/subtraction (3 digit)"：2.3E+22，13B，GPT-3；"MMLU Benchmark (26 topics)"：5.0E+23，280B（Gopher）；
   "MMLU Benchmark (30 topics)"：5.0E+23，70B，Chinchilla。（另：4-5 位加减在 3.1E+23、175B 才出现，备查。）
2. **Chinchilla 表 1**（arXiv 2203.15556v1，p.3）：LaMDA 137B / 168B；GPT-3 175B / 300B；Jurassic 178B / 300B；Gopher 280B / 300B；
   MT-NLG 530B / 270B；Chinchilla 70B / 1.4T tokens。
3. **Chinchilla p.1**："many of the recently trained large models have been trained for approximately 300 billion tokens (Table 1), in line
   with the approach of predominantly increasing model size when increasing compute"。
4. **算力规则**（Chinchilla §3.3，p.7）："FLOPs(N, D) ≈ 6ND (Kaplan et al., 2020)"。
5. **Mirage 的实验**（arXiv 2304.15004v2，p.5）："outputs from the InstructGPT/GPT-3 family on two tasks: 2-shot multiplication between two
   2-digit integers and 2-shot addition between two 4-digit integers"；换成 token edit distance 后变化平滑。
6. **Wei 图 2(G) 两个点**（评审用矢量路径核过，我没有复核）：Chinchilla 和 Gopher 在同一横坐标，纵坐标约 67.9% / 60.1%（对应 CHIN 67.6 / 60.0）。
   只用于帖文彩蛋。
7. **Wei 图 2(A) GPT-3 各点**（评审核）：6.7B 约 1%、13B 约 8%、175B 约 32%。本稿海报只标 13B，形状按此画，仍标「示意」。
8. **MT-NLG 宣布日期**：2021-10-11（NVIDIA developer blog；Voicebot.ai 同日报道），支撑年份条 "2020–2021"。
9. **示意题注**："347 + 586 is our example; plain 3-digit addition/subtraction emerges at 13B for GPT-3 (Wei Table 1)"。

---

## 11. 帖文

**X（英文）**
- 正文：
  > Same compute budget. One AI model is 4x bigger. Who wins?
  >
  > Episode 1 of our explainer series, from Prof. Yufei Ding's CSE 291P (LLM System Optimization), Lecture 1, UC San Diego.
  > *compute not included
- 投票：据我所知 X 的一条帖子不能同时带视频和投票（**未核实**，发之前在 composer 里试一下）。可以先发一条纯文字投票
  "Same compute budget. Model A is 4x bigger; model B trains on ~4x more data. Who wins?"（选项 "The bigger model" / "The one with more data"），
  一小时后用视频帖引用它。
- 首条回复（出处与限定）：
  > Based on Prof. Yufei Ding's CSE 291P, Lecture 1, UC San Diego, which draws on Stanford CS336 (Liang & Hashimoto). Sources: Anderson,
  > Science 1972; Wei et al., TMLR 2022; Schaeffer, Miranda & Koyejo, NeurIPS 2023; Kaplan et al. 2020; Hoffmann et al., NeurIPS 2022;
  > OpenAI Stargate announcement, Jan 2025; xAI / NVIDIA on Colossus, 2024; Stanford AI Index 2024.
  > Notes: curves are schematic, after Wei et al. 2022. Emergence is still debated; the Mirage paper doesn't say big models can't
  > surprise us. "Budget" in the theatre = training compute (C ≈ 6ND). Chinchilla also beat the 175B GPT-3 and the 530B MT-NLG on most
  > tests (it used about 1.8x GPT-3's compute). Today labs often train small models even longer than Chinchilla's rule, to save at
  > serving time.
- 第二条回复（彩蛋，嫁接 4）：
  > It was on the emergence chart all along: Wei et al. 2022, Fig. 2G (a 57-subject exam). Same training compute, two dots. The
  > higher one is the 70B.

**抖音（中文）**
- 标题：一只蚂蚁不会算数｜同一笔算力，该把模型做大，还是多喂数据？
- 简介：
  > 「算力另计」第 1 集。内容来自 UC San Diego Yufei Ding 教授的 CSE 291P《大模型系统优化》第 1 讲（部分内容出自斯坦福 CS336）。
  > 出处：Anderson,《科学》1972；Wei 等 2022；Schaeffer、Miranda、Koyejo，NeurIPS 2023；Hoffmann 等 2022（Chinchilla）；
  > 斯坦福 AI Index 2024 等。曲线为示意重画；「涌现」至今仍有争议；剧场里的「预算」指训练算力。画面为代码渲染，角色由 AI 绘图后制作。
- 勾选 AI 标注（毛毡角色是图像模型画的，SERIES §6.4 硬门槛）。
- 置顶评论（彩蛋）：「其实答案一直印在那张涌现图上：Wei 等 2022 图 2G（57 科考试），同样的训练算力，两个点，高的那个是 700 亿的。」
- 可选的原生 CTA（只放抖音，不进 EN）：评论区说说你押的是哪个。

---

## 12. 先做的 6 张风格帧（9:16，EN 和 ZH 各一张，`?guides=1` 各一张，手机尺寸 + 0.25 倍联系表看）

| # | 帧（30 fps） | 拍 | 构图（安全区内） | 焦点 | 光 | 要验证什么 |
| --- | --- | --- | --- | --- | --- | --- |
| **SF1** | 0（0:00.00） | B0 封面 | 见 §3：纸条 y 275-325；标题卡 y 570-880；蚂蚁 x 455-590、y 880-1080；便利贴 x 360-660、y 1070-1170；猫 x 60-340、y 940-1190；右栏只有红幕 | z ≈ 1000（标题卡、蚂蚁），栏杆便利贴模糊 < 1.5 px，猫虚约 4 px | 琥珀追光从左上飞杆打下，光柱带灰；天幕淡钢蓝补光；标题卡偏粉跟光；左上台灯暖边 | 180×320 缩略图下标题、蚂蚁、猫、便利贴都读得出；画上只有三处字；新画的毛毡蚂蚁和毛毡猫是不是同一个世界；右栏干净 |
| **SF2** | 298（0:09.95） | B1 三翻 | 卡阵 "933" x 220-660、y 780-960；四周蚂蚁塞满舞台、侧幕、天桥；评委 "100 100 100" x 560-860、y 1060-1150；猫的三张便利贴在栏杆上 x 360-620；纸屑在 y 500-1000 | z ≈ 1150（看台），侧幕和天桥按平面虚掉 | 舞台全亮的暖光 + 跑马灯灯泡 + 纸屑高光 | 评审测试 (a)：0.25 倍下 933 能读；约 4,000 个实例蚂蚁加按平面景深的单帧耗时；人群不能像贴图平铺 |
| **SF3** | 586（0:19.55） | B2 曲线海报 | 海报 x 80-860、y 330-1150；蚂蚁坐在 13B 拐点；三个红笔 "×100" 和 "operations, not speed" 已写好；"schematic" 小字在 y ≈ 1100 | z ≈ 950（海报），后面剧场重虚 | 飞杆上一盏冷白工作灯，一道带灰的光柱只扫过海报左上角（不压字） | 里索数据图在手机上可读；红笔压在里索上像真墨迹；"schematic" 标签和 "13B" 的层级 |
| **SF4** | 1163（0:38.77） | B4 三翻 | 剧场规定海报 y 520-760；两块翻页牌 "530B" / "270B"（红圈 + 下箭头）x 120-860、y 930-1180；"REHEARSAL??" 便利贴在右牌上沿；蚂蚁漫过脚灯；大幕鼓起；年份条 y 470-510 | z ≈ 960（台唇的翻页牌） | 偏热的琥珀主光；脚灯从下往上照蚂蚁 | 评审测试 (b)：卡纸 + 毛毡 + 里索同框不乱；必读不超过两处（两块牌算一组） |
| **SF5** | 1446（0:48.20） | B5 两层舞台 | 上层 y 560-800（拥挤，冷光）；信封 "SAME BUDGET" x 220-780、y 800-880；下层 y 880-1130（稀疏，抱厚剧本，琥珀追光）；长竹竿分牌 "60.0" 在楼座，"67.6" + "57-subject exam" 在栏杆前；"Rehearse more." 便利贴 | z ≈ 1100（下层）；楼座前沿 z ≈ 1000 略虚 | 上层钢蓝、下层琥珀：赢家在暖光里 | 竖屏上下对比一眼读懂；两个分数的大小关系不用读字也看得出（竹竿那块低人一头） |
| **SF6** | 2340（1:18.00） | B7 盖章 | 口号卡降到栏杆高度，"RESOURCES*" 在 y ≈ 1020-1100；猫（felt_cat_stamp，近景，x 380-860、y 760-1190）双爪按章，红印 "*compute not included"；上方划掉的小牌和红笔 "→ ALGORITHMS THAT SCALE" 露出一部分；节目单在栏杆左段 | z ≈ 820（栏杆 / 卡面 / 章） | 琥珀追光 + 卡面上一层粉色跟光；印泥红要比贝雷帽红深一档，两者不能撞色 | 评审测试 (c)：毛毡猫近景达到 painted cast 的水准；印章的墨色和压痕质感；EN / ZH 印章字都清楚 |

第二轮：B3 坡 vs 台阶（0:24.5）、B6 台灯变暗（0:58.0，镜头后退后的全景）、B7 丁老师那句时的画面（1:13.5）。

---

## 13. 美术清单

### 13.1 代码做（kit2d：Canvas2D + 每平面景深 + 里索印刷）

- **纸剧场布景**：卡纸台口（里索花纹，黄 + 粉叠成金）；红毡大幕（毡纹、缝线下摆、阻尼摆动）；帷幔；侧幕片和桌面滑轨；三级看台；
  两层舞台（B5）；天幕（"347 + 586 = ?"）；台面；乐池栏杆和铜牌；评委分牌（卡纸圆牌 + 木棍，含 B5 的长竹竿）；前排卡纸座椅；
  翻页牌和画架（绕铰链翻转，含 B4 的倒翻）；信封；节目单（折页，2.5D 翻开）；跑马灯（灯泡逐个亮）；灯杆和成排的小滤色片灯（B6，实例化）。
  painted 的 `art/cut/theatre_front.png` 只作台口正面的备选；全片用代码台口，因为它吃每平面的光。
- **全部印刷品**（里索，四色）：标题卡、算式、安德森海报、曲线海报（GPT-3 形状按 §10.2 第 7 条）、剧场规定、年份卡和年份条、
  账单三页、口号卡、错误读法小牌、节目单、滚筒章、信封章。
- **翻牌拼字**：每只蚂蚁一张卡，卡色就是像素，代码按 5×7 点阵分配（918 / 932 / 933），卡贴到「举空白卡」的蚂蚁精灵手上，按 twos 抖动。
- **灯**：琥珀追光、钢蓝补光、跟光、光柱和灰尘、脚灯、台灯变暗（改台灯光照层的强度，不是加滤镜）。
- **镜头**：慢推、后退 20% 的视差、焦点拉移。
- **书桌和台灯**：远景板用 `art/src/desk_night.png`（已有），台灯的光晕单独一层，B6 由代码调暗。

### 13.2 必须由图像模型画（Codex，绿幕 #00FF00，再用 `art/key.py` 抠像）

已有（`art/cut/`）：`felt_cat_lookup`（B6 抬头看台灯）、`felt_cat_note`（B6 举 1% 便利贴；便利贴是空白的，字由代码或扫描贴上）、
`felt_cat_shock`（B1 三翻时的反应，可选）、`theatre_front`（备选）、`desk_night`（远景板）。

要新画的：

| 文件 | 尺寸 | 用在 | 说明 |
| --- | --- | --- | --- |
| felt_cat_back | 1024×1536 | 第 0 帧、B3、B7 尾 | 坐着，背对镜头 3/4，回头看镜头，冷面半眯眼 |
| felt_cat_slap | 1024×1536 | B0、B1、B4、B5 | 后腿站立，一只前爪高举正往前拍（拍便利贴） |
| felt_cat_pen | 1024×1536 | B1、B3、B4、B7 | 握一支红色记号笔，正在写 |
| felt_cat_stamp | 1024×1536 | B7 | 双爪按一枚木柄橡皮章 |
| felt_cat_clap（可选） | 1024×1536 | B5 | 鼓掌 |
| felt_ant_card | 1024×1536 | 第 0 帧、B0、B7 尾 | 主角蚂蚁，前足把空白方卡举过头顶 |
| felt_ant_climb | 1024×1536 | B2 | 侧面，往上爬 |
| felt_ant_sit | 1024×1536 | B2 | 坐着，腿悬空 |
| felt_ant_scripts | 1024×1536 | B5 | 抱一摞厚剧本 |
| felt_ant_bow | 1024×1536 | B5 | 深鞠躬 |
| felt_ant_crowd | 1536×1024 | B1、B4、B5 群众 | 同一只小蚂蚁的四个姿势一排（举卡正面 / 举卡 3/4 / 拿一页纸 / 鼓掌），之间留清楚的绿 |

规则：
- 卡和剧本一律画成**空白白色**（代码按需要染成黑卡、像素卡，写上字）；画面里不要任何字。
- 猫的眼睛：现有三张毛毡猫和主参考 `cat_sit.png` 都是琥珀棕色珠眼，SERIES §3 写的是蓝眼睛。下面的 prompt 按现有毛毡图写琥珀棕，
  以保持一致；用户要蓝眼就把这一句换掉，并把现有三张重画（§16）。
- `gen.sh` 带参考图时会自动加一句「参考图是白猫的角色设计」，所以**蚂蚁不要带参考图**；第一只蚂蚁定稿后，若要以它为参考，
  直接用 `codex exec` 调（或在 ChatGPT 网页里附图），不用 `gen.sh`。
- 生成后：`python3 art/key.py felt_cat_back felt_ant_card ...`（白毛要它的去绿溢色）。先只画 `felt_cat_back` 和 `felt_ant_card`，
  进 SF1 看过再画其余。

**可直接运行的 Codex 调用**（在 `.claude/films/edu/art/` 下）：

```sh
cd /Users/yil384/UCSD/Picasso-Lab/.claude/films/edu/art
REF_FELT=cut/felt_cat_note.png
REF_CAT=../../xlaunch/kit/assets/cut/cat_sit.png
CAT_MAT="Material: a handmade stop-motion puppet made of felt - needle-felted white wool body with a soft fuzzy surface and visible fibres, flat cut-felt pieces for the inner ears, nose and eyelids with tiny visible hand stitches along the seams, a red wool felt beret with a little stalk on top, small round amber-brown glass-bead eyes with a bright highlight, exactly like the attached felt puppet. It must look like a real handmade object photographed in a studio, not a 3D render and not a drawing. Soft warm key light from the upper left, gentle soft shadows on the puppet itself only."
ANT_MAT="Material: a tiny handmade felt puppet of an ant for a toy paper theatre: dark chocolate-brown wool felt body in three rounded segments (head, thorax, abdomen) with soft fuzzy fibres and tiny pale hand stitches along the seams, two shiny black glass-bead eyes with a white highlight, short bendable antennae of brown pipe cleaner with a small felt ball on each tip, six thin legs of brown pipe cleaner, a friendly simple face with a small embroidered smile. It must look like a real handmade object photographed in a studio, not a 3D render, not a drawing, and not resembling any character from an existing film. Soft warm key light from the upper left, gentle soft shadows on the puppet itself only."
GREEN="Background: perfectly flat solid pure green #00FF00 filling the whole image, no floor, no cast shadow on the background, no gradient, no vignette. The whole figure is in frame with a margin on every side, centred, nothing cropped. No text, no letters, no numbers, no logo, no frame."

./gen.sh felt_cat_back "A full-body felt cat puppet sitting with its back three-quarters turned to the viewer, looking back over its shoulder straight at the camera with a deadpan, half-lidded, unimpressed expression and a flat stitched mouth, tail curled beside it. $CAT_MAT $GREEN Portrait 1024x1536." $REF_FELT $REF_CAT
./gen.sh felt_cat_slap "A full-body felt cat puppet standing on its hind legs in side three-quarter view, one front paw raised high and pushed forward mid-slap, palm out, as if slapping a note onto a wall at its own head height; the other paw on its hip; smug half-lidded eyes. $CAT_MAT $GREEN Portrait 1024x1536." $REF_FELT $REF_CAT
./gen.sh felt_cat_pen "A full-body felt cat puppet standing on its hind legs in side three-quarter view, holding a plain red felt-tip marker (red barrel, cap off, no writing on it) in its right front paw, the tip touching an invisible surface in front of it mid-stroke, concentrating, tongue tip slightly out. $CAT_MAT $GREEN Portrait 1024x1536." $REF_FELT $REF_CAT
./gen.sh felt_cat_stamp "A full-body felt cat puppet standing on its hind legs, front view, both front paws pressing a small wooden rubber stamp with a round wooden knob straight down onto an invisible surface at chest height, eyes closed with deep satisfaction, small closed smile. The stamp's rubber face is hidden (pressed down). $CAT_MAT $GREEN Portrait 1024x1536." $REF_FELT $REF_CAT
./gen.sh felt_cat_clap "A full-body felt cat puppet sitting, front view, both front paws together mid-clap in front of its chest, eyes happily closed, small open smile. $CAT_MAT $GREEN Portrait 1024x1536." $REF_FELT $REF_CAT

./gen.sh felt_ant_card "A full-body felt ant puppet standing upright on its four back legs, front view, proudly holding a blank plain white square card (thin cardstock, completely empty) above its head with its two front legs. $ANT_MAT $GREEN Portrait 1024x1536."
./gen.sh felt_ant_climb "A full-body felt ant puppet in side view climbing straight upward on an invisible vertical surface, all six legs gripping, antennae pointing up, determined face. $ANT_MAT $GREEN Portrait 1024x1536."
./gen.sh felt_ant_sit "A full-body felt ant puppet sitting on an invisible ledge in three-quarter view, back legs dangling down, front legs resting on its knees, looking at the viewer, relaxed and a little smug. $ANT_MAT $GREEN Portrait 1024x1536."
./gen.sh felt_ant_scripts "A full-body felt ant puppet standing upright, front view, hugging a tall stack of blank white paper scripts (about twelve thick bundles held with a black binder clip, no writing) against its chest with its front legs, leaning back slightly under the weight, proud. $ANT_MAT $GREEN Portrait 1024x1536."
./gen.sh felt_ant_bow "A full-body felt ant puppet in side three-quarter view bowing deeply like an actor at a curtain call, front legs spread wide, antennae drooping forward. $ANT_MAT $GREEN Portrait 1024x1536."
./gen.sh felt_ant_crowd "Four copies of the same small felt ant puppet standing side by side in one row, evenly spaced with wide clear green gaps between them, all the same size: (1) front view holding a blank white square card above its head with both front legs; (2) the same pose in three-quarter view; (3) front view holding a single thin blank white sheet of paper in front of its chest; (4) front view clapping its front legs. $ANT_MAT $GREEN Landscape 1536x1024."
```

ChatGPT 网页端（Codex 没额度时）：每张图的 prompt = 上面引号里的姿势句 + `CAT_MAT` 或 `ANT_MAT` 那段 + `GREEN` 那段，原样拼起来粘贴；
猫的图附上 `art/cut/felt_cat_note.png` 和 `xlaunch/kit/assets/cut/cat_sit.png` 两张参考图，并加一句 "The attached images show the
character: keep the same felt cat." 生成后按文件名放进 `.claude/films/edu/art/src/` 推到 repo。

**纹理（优先实拍）**：在书桌台灯下用 iPhone 平拍一块红羊毛毡、一张奶油色厚卡纸、一张牛皮卡纸（正面、均匀光、填满画面），
替换 kit2d 的程序纹理（SERIES §5.6 禁「程序生成的假纹理」）。没法拍时的 Codex 备用（不用绿幕）：
- `tex_felt_red`："A flat, evenly lit macro photograph of a sheet of red wool felt filling the whole frame edge to edge, visible soft fibres,
  no folds, no objects, no shadows, seamless and tileable. Square 1024x1024."
- `tex_cardstock`："A flat, evenly lit macro photograph of cream heavyweight cardstock filling the whole frame, subtle paper fibres and
  tooth, no objects, no shadows, seamless and tileable. Square 1024x1024."

### 13.3 建议真扫描（用户偏好真素材；做不到就用 Caveat / 霞鹜文楷 + 墨迹纹理代替）

- 黄便利贴（真红笔或黑笔手写，EN、ZH 各一套）："Rehearse more?" "1/3" "2/3" "3/3" "REHEARSAL??" "Rehearse more." "1% of $100M = $1M"；
  「多排练？」「排练呢？？」「多排练。」「1 亿的 1% = 100 万」。
- 红笔手写（白纸上写，扫描后抠出）："×100" "operations, not speed" "*parameters, not ants (our analogy)" "→ ALGORITHMS THAT SCALE"；
  「总运算量，不是速度」「*是参数，不是蚂蚁（比喻是我们的）」「→ 能放大的算法」；划线、圈、下箭头可用已有的 `xlaunch` `ink_pen_*`。
- 印章 "*compute not included" /「*算力另计」：最好刻一枚真橡皮章（系列声音 logo 那一枚），盖在纸上扫描；否则代码用 `ink_stamp_*`
  的墨色纹理配字体合成。**不要让图像模型画带字的印章。**

### 13.4 不画的
安德森本人（只用原题）；任何真人，包括丁老师（只有声音和节目单上的名字）；课件第 10 页的梗图和猫漫画（FACTS §4，也不要让我们的猫做
「从桶里偷鱼」的动作）；Chinchilla、Gopher 的动物形象；任何公司 logo。

---

## 14. 和课堂的对应（丁老师的重点有没有保住）

| 她在课上强调的 | 片中 |
| --- | --- |
| slide 9 讲了约 5 分钟：先平后陡，「不做实验永远不知道」 | B1 三翻 + B2「小模型上，看不出来」 |
| Anderson：只看分子看不出整体的性质 | B1「拼出数字的是一群，不是任何一只」 |
| slide 10 不念数字，讲的是贵 | B6 只念两个数，集群那张不念；台灯被抽暗 |
| slide 11：研究由效率驱动，这就是开这门课的原因 | B7 口号 + 她自己的那句 + "Efficiency: taught here." |
| 没讲出口但在课件上的 Chinchilla | B4-B5 的主包袱（课件第 11 页最后一条） |

没用的（按 FACTS 和 notes）：OpenAI 亏损、20 美元到 200 美元的玩笑、agent / RAG 让小模型追上大模型（都无出处）；
诺奖「因为」这篇文章（A3）；曲线横轴上的「2012-2020」。

---

## 15. 风险

1. **片长 79.1 s 贴着 80 s 上限。** 丁老师那句按 ASR 时间戳约 4.6 s，比评审估的 3.5 s 长。退路依次：她按原话重录（约 3.6 s，-1.0 s）；
   删 "Budgets went industrial." /「加量，又加价」（-1.0 s）；不用她的原声，用备用句（-1.4 s）。
2. **丁老师那句是 ASR 草稿**："how(?)" 不确定；必须 `ffplay -ss 1298 course/L01.mp4` 实听后改字，再请她本人同意。课堂录音音质未知，可能录到学生。
3. **翻牌拼字的可读性和成本**（SF2）：0.25 倍下 933 要读得出；约 4,000 只实例蚂蚁 + 每平面景深的单帧耗时要先测。读不出就减少周围人数，
   卡阵本身不变。
4. **毛毡猫的近景**：kit2d 的代码猫只够远景（README 自评）；近景一律用画的姿势（SF6 检验）。眼睛颜色和 SERIES 不一致，见 §16。
5. **风格统一**：代码做的毛毡 / 卡纸 + 图像模型画的毛毡偶 + 照片质感的书桌台灯 + 里索印刷。规则：布景 = 卡纸 + 毛毡；信息 = 里索；
   猫的工具 = 真扫描。书桌和台灯是「玩具放在真桌子上」，和毛毡偶同属「被拍下来的实物」，不算写实与手绘同框；SF1、SF4 验证。
6. **数字密度**：屏上必读数字约 12 个（13B；175 / 280 / 530；300 / 300 / 270；70B / 1.4T；60.0 / 67.6；1 亿 / 10 万 / 5000 亿；1%），
   旁白只念其中 7 个。若手机上显得乱，先删 B5 上层牌的 "300B tokens"，再删 B6 的角落出处（帖文里有）。
7. **「预算」一词两用**：B4-B5 的预算是算力，B6 是美元。剧场规定卡和信封都印了「预算 = 训练算力 / same training compute」，但观众仍可能混；
   若测试观众混了，把 B5 的 "Same budget" 改成 "Same compute budget" /「同样的算力预算」（+0.4 s）。
8. **两张带「×」的卡**（剧场规定、口号）与「至多一个公式」：前者是剧中规矩，后者是口号，旁白都不当公式讲。评审仍嫌多，剧场规定改纯文字
   "Budget pays for every actor's every rehearsal" /「预算 = 每个演员的每一场排练」。
9. **时间线**：B4（2020-21）→ B5（2022）→ B6（2023-25），年份条必须读得出。「排练原地踏步」只说那几年；今天的做法相反（E10），已进帖文。
10. **别家的名字**：B4 只给规模；B5 的 Chinchilla / Gopher 只在信封小字；B6 的 xAI、Stargate、Gemini 只在角落小字。抖音是否点名待定（§16）。
11. **Mirage 段的简化**：猫「按位」打分 ≠ token edit distance；旁白只说 "partial credit"，海报不画假曲线。
12. **循环接缝**：最后一帧比第 0 帧多亮着的跑马灯和一条红章；X 循环时会有一下跳变。若要完全无缝，把第 0 帧的跑马灯也点亮（但评审要求第 0 帧只留三处字），
    或尾帧 0.4 s 里让跑马灯熄灭（多一个动作）。目前按「多一枚红章」处理，和 e01 一致。
13. **30 倍拉远**（原稿 B6）已删；如果 v2 想加回，配「与此同时，我们实验室的显卡预算：」这类朝我们自己的自嘲（评审 fix 7），并先做技术样片。
14. **右栏**：kit2d 默认台口开口右沿在 x ≈ 891；必读物 x ≤ 860，右幕盖住开口右缘（§3）。
15. **双语**：ZH 平均 4.03 字/s，B6 的 v22 到 4.34；「多者异也」偏文言（只上海报）；请中文母语者通读一遍，EN 请英文母语者读一遍
    "an estimated hundred million plus" 是否自然（备选 "estimated at well over a hundred million"，+0.4 s）。
16. **「这门课教」的归属**："taught here" 指画面上的节目单（CSE 291P），不说「我们教」。用户若确认实验室可以说 "we"，可改回。
17. **磁盘**：约 14 GB 可用，渲染放 scratchpad 或外置盘。

---

## 16. 待决问题（给用户）

1. **丁老师那一句**：用排名第 1 的原话吗？用课堂录音，还是请她按原话重录？中文版用她的英文原声配中文字幕（「译文」），还是请她用中文说一遍？
   她不同意就用备用句（全片 77.7 s）。
2. **抖音版的公司名**：B6 角落小字保留 "xAI Colossus" "Stargate" "Gemini Ultra"，还是换成泛称（「某 AI 公司的训练集群，2024」「美国一项
   AI 数据中心计划，2025 年 1 月宣布」）？
3. **GPU 额度**：CSE 291P 给学生发 GPU 额度吗？发的话印章改 "*frontier-scale compute not included" /「*前沿规模算力另计」（需问助教）。
4. **封面**：「一只蚂蚁 / 不会算数」，还是在比稿里和「同一笔预算 / 谁赢？」一起测？
5. **毛毡猫的眼睛**：现有毛毡图和主参考 `cat_sit.png` 是琥珀棕，SERIES §3 写蓝眼睛。按哪个？（选蓝眼要重画现有三张。）
6. **配音**：EN、ZH 谁来录？在那之前用 `tools/tts.py` 的临时声音对时间，临时声音永不发布。
7. **丁老师的中文名**：节目单中文版目前写「Yufei Ding 教授」，没有替她写汉字。要不要用她的中文名（请提供写法）？
8. **片长**：79.1 s 可以吗，还是删「加量，又加价 / Budgets went industrial」压到 78 s？
9. **另外两种你喜欢的画风**：tollens-ai/quality-education 的橡皮管卡通 + 水彩背景、@akokoi1 的线稿科普，要不要在比稿里把 SF1 和 SF3
   也各出一版（同一构图，换引擎），和纸剧场一起看？我的看法：线稿最适合给中文版做红笔批注层和抖音封面；橡皮管卡通更适合以后讲「人」的集
   （如带客串成员的），这一集的蚂蚁群用它会变成另一部片。
10. **真扫描**：便利贴、红笔字、印章愿意手写 / 刻章后扫描吗？（§13.3，约 20 张小图）
11. **X 投票**：如果 X 确实不能视频 + 投票同发，先发投票再引用，还是不要投票？
12. **模型名上屏**（#23）：本稿只在小字里出现 GPT-3、Chinchilla、Gopher，可以吗？
13. **音乐**：原创杂耍剧场小编制的来源和授权。
