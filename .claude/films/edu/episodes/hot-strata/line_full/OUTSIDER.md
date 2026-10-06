# 外行试读：line_full/SCRIPT.md（2026-10-05）

> 读的是 `SCRIPT.md` + `vo_lines.json`（28 句旁白），按两位读者各过一遍，再对照 `NOTES.md`、`res_32.json`、`res_64.json`、
> e01 FACTS 的 T16-T24、Strata README（2026-10-05 读过）核对改法里的每个数字。本文件只提意见，不改脚本。

**读者 A：16 岁，打游戏。** 认识 RTX 4090（梦中情卡）、知道"显存 / VRAM 不够"、"内存条"、"卡顿"，用过 ChatGPT / 豆包。
不知道 Hacker News、README、MoE、ISCA、"系统研究"。耐心：一拍 6 秒没新东西就划走。
**读者 B：55 岁，亲戚，刷抖音。** 用过 DeepSeek / 千问 / Kimi 的 App，听说过"显卡"（孩子打游戏用的）。"内存"在她那里是
"手机内存满了"（= 存储）。看得懂：厨房、川菜粤菜、考试分数、"又是你"。看不懂：英文缩写、"请求"、"重放"、分数和倍数混着说。

## 0 结论
1. **厨房类比立住了**，两位读者都跟得上楼上 / 楼下 / 楼梯。丢人的地方不在类比，在三处：
   - **关键那一下没说出口**：开头问"怎么塞得进去"，全片没有一句正面回答。观众要自己推出"每次只用 8 位 → 只把几位放进快厨房"，
     A 能推出来一半，B 推不出来。
   - **B6-B9 的数字换了六种说法**：1/4、"四位里三位在楼下"、"四中一"、"两位里有一位"、"四位里有三位"、"三倍"、"一半"、
     "93/100"、"七分之一 / seven times fewer"。同一个量（楼上找到人的比例）一会儿按命中说、一会儿按没命中说。B 在 B8 掉线，
     A 在 B9 的 "seven times fewer" 掉线。
   - **最后 35 秒是讲座**：B10 "这就是系统研究" + B11 论文标题、ISCA、最佳论文奖。A 会在 2:40 前后划走；B 听不懂"系统研究""ISCA"。
2. **无聊段**：B1 自我介绍 8.4 s（正好在划走高发区，图书馆斜线亮窗手机上看不出是"规律"）；B7 23 s 连报三个大数
   （4 个模型、2.4 万条请求、近 700 万次点名），没有画面笑点；B10-B11 见上。
3. **热点只骑了一半**：Strata 在 B4 之后几乎消失，直到 B11 一句"下一个 Strata"。而 README 自己写的留人规则
   （"keeps the few thousand experts that are used most often"）正好就是我们的规则二——这是全片最好的回扣点，现稿没用。

## 1 前十条改动（按影响排序）

### 1. 把"怎么塞进去的"正面答出来，并补上"下一个词换一拨人"
**问题**：b08 说"只要 8 位上手，其余闲着"，A 的第一反应是"那雇 128 个干嘛，开掉 120 个"（e01 FACTS T24 的坑：听起来像"大部分没用"）。
b10 直接跳到"Strata 的诀窍：显卡是楼上小厨房"，中间缺"因为每次只用几位，所以只需要一个小厨房"这一环。0:08 抛出的问题
（"how does that even fit?"）到 1:04 都没被点名回答。
**改法**：b08 补一句"下一个词换另外八位"；b10 改成先回答开头的问题。
- b08 EN: "For each word the AI writes, the slip calls just eight of them. The next word calls a different eight."
- b08 ZH: 「AI 每写一个词，单子上只叫八位上手；下一个词，又换一拨人。」
- b10 EN: "So how does it fit? It doesn't have to. Each word needs only a few chefs, so a small, fast kitchen upstairs will do: the graphics card."
- b10 ZH: 「那它是怎么塞进去的？根本不用全塞。每个词只用得着几位，楼上一间小厨房就够了，这间小厨房就是显卡。」
- b14 EN: "And the next slip could call anyone. So who do you keep upstairs?"
- b14 ZH: 「可下一张单子叫谁，谁也说不准。楼上，到底留谁？」

**画面**：b08 第二句时第二张单子落下，亮起的 8 位换了一拨（anim.json 第 2 个词，真数据）。b10 "It doesn't have to" 时红笔把 B0 的
"?" 再写一次，然后一笔划掉（回扣封面）。

### 2. 所有结果只用一个单位：百分制"打分"
**问题**：见 §0.1。"one call in four" 和上一拍的 "three of four downstairs" 说的是同一件事的正反面，A 以为是两个结果；
"seven times fewer" 在英语里本来就有歧义；B 听到"四位里有三位""两位里有一位""放一半"会把规则二的"一半"和 B9 的"放一半"搅在一起。
**改法**：定义一次"叫一百次，有几次人正好在楼上"，之后只报分数。红笔像老师批卷子：大号红字分数 + 双下划线。
数字全是现成的：楼上放 1/4 时 random 25.0、popular 50.7、decay 76.7（`res_32.json`）；放 1/2 时 random 50.0、decay 93.0（`res_64.json`）。
- b15 EN: "Let's keep score: out of a hundred calls, how many find their chef already upstairs? Upstairs holds a quarter. Pick them blindfolded: twenty-five."
- b15 ZH: 「打个分：叫一百次，有几次人正好在楼上？楼上放得下四分之一，蒙着眼随便挑：25 分。」
- 规则二：「51 分，已经是蒙眼的两倍」；规则三：「77 分，蒙眼的三倍」（76.7 / 25 = 3.07）。
- b22 EN: "Double the room upstairs. Blindfold: fifty. Recent regulars: ninety-three."
- b22 ZH: 「楼上扩建一倍：蒙眼 50 分，留熟面孔 93 分。」
- b23 EN: "Out of a hundred calls, only seven still take the stairs. Fewer trips, faster answers."
- b23 ZH: 「一百次点名，只剩 7 次要跑楼梯。楼梯跑得少，回答就快。」

**画面**：B9 现成的 10x10 勾格阵从 B6 起就用（每条规则一张格阵，打勾数 = 分数），观众看三遍就会读。只在两处加"评语"笑点：
蒙眼 25 旁红笔 EN "F" / ZH「不及格」，最后的 93 旁 EN "A" / ZH「优」。中文观众对"红笔分数 + 不及格"是条件反射，比任何比例都快。
**不要**给规则二评"不及格"（见第 8 条，它是 Strata 的思路，不拿真实项目开玩笑）。删掉屏幕上的 "÷7"、"×2"、"3 of 4 downstairs"。

### 3. 给"规律"一张脸：121 号厨师（running gag 三次）
**问题**：全片最重要的发现是 b21 中间一句"刚被叫过的，往往很快又被叫到"，夹在规则三的长句里一闪而过（b21 一句 11 s）。
B7 / B12 的 "121" 在两位读者眼里只是数字，不是人。
**改法**：让 121 号固定成同一个厨师 sprite（建议 6 号白胡子老头，胸口代码写红色号牌 "121"），真数据保证他一直被叫：
anim.json 第 46 层 40 个词里出现 19 次。
- 埋（B3 b08）：第一张单子的 8 位里就有他，红笔圈一下，不说话。
- 升级（B5 / B7）：他刚爬下楼、咖啡还没端起来，又被叫上去（真数据里连续两个词都叫到他的那几拍）。
- 兑现（B8 规则三）：b21 EN: "Now watch the slips. Chef one-twenty-one. Again. And again. Whoever was just called tends to be called again."
  ZH: 「再盯着单子看：121 号，又是你。刚被叫过的，往往很快又被叫到。」经理干脆在楼上给他摆了把凳子。
- 收尾（B12）：一片乱闪的小厨师里，121 的脸放大，红笔圈住，写 "pattern." / 「有规律。」

**核对**：上一个词的 8 位在下一个词里平均再出现 30%，随机 6.25%（SCRIPT §4 B8 来源）；"又是你"只说这一位，不外推。
小字照旧（单个灶台、40 个词、我们公开的数据）。

### 4. 让观众看见"一个词"：答案一词一词地出来，缺人就卡住（替换响铃计时器）
**问题**：全片说了 10 次"词"，但观众从没看到 AI 在写什么。b13 "Every word that needs someone from downstairs waits" 是抽象的；
响铃的厨房计时器意思是"时间到了 / 做好了"，跟"在等"正好相反。A 最熟的感受是"卡"，片里没给。
**改法**：B3 起标题带（y 300-540）手写一句正在生成的回答，每出一道菜就多一个词。厨房在回答一道做菜的问题（厨房做菜谱，自带一点 meta）：
EN 问 "How do I make tomato-egg stir-fry?"，答 "First, beat the eggs…"；ZH 问「西红柿炒鸡蛋怎么做？」答「先把鸡蛋打散……」。
B5 缺人时句子停在半截，光标处红笔点 "…" 一闪一闪，旁边红笔 EN "lag" / ZH「卡」。
- b13 EN: "Miss one chef, and the whole answer stalls, mid-sentence."
- b13 ZH: 「缺一位，整句回答就卡在半截。」

**美术**：句子和光标是手写批注，不用新画稿；计时器要么去掉，要么按 `ART.md` 重出一张不带震动线 / 响铃弧线的（只当表盘用，指针转一圈 = 半分钟，配第 5 条）。
单子从 B3 起就印上 8 个厨师号（现在要到 B7 才有号码），这样 B7 "我们留着单子"一出来，观众已经知道单子上记的就是"叫了谁"。

### 5. 大数字换成人能感觉的单位，或者只留在画面上
| 现稿 | 谁掉线 | 改法 |
| --- | --- | --- |
| "over thirty times slower than using one who's already there" | A、B 都不知道"比用楼上的慢"指什么 | b12 EN: "The catch is the stairs. If a chef upstairs starts in one second, one from downstairs takes half a minute." ZH: 「麻烦出在楼梯上：楼上的厨师一秒开工，楼下叫一位上来，得等半分钟。」（1 s : 30 s = 30 倍，N6 的 32 倍以内） |
| 125,000,000,000 | B：零太多，没感觉 | 不加旁白，红笔在数字下面补一行小字 EN "count 1 per second: ~4,000 years" / ZH「一秒数一个，要数近四千年」（125e9 / 31,557,600 s = 3,961 年，我们的算术） |
| "over twenty-four thousand requests" | B："请求"是行话；A：没感觉 | 旁白删，留在纸箱上的红笔 "24,000+"；若保留，说 EN "questions" / ZH「提问」，不说"请求" |
| "Almost seven million chef calls" | 两位都无感，而且是 B7 第三个大数 | 旁白删，只留右上角滚动计数器 |
| "station 1 of 94"、"every station" | A 会问：一个词要过 94 个灶台？那缺一位就等，93 分不也天天等？——这是个兔子洞 | 旁白不提灶台数；"94" 只在小字里 |

### 6. 骑热点：用观众认得的名字（千问 / DeepSeek / Kimi / 4090），撤掉 "900+" 和裸的 "Hacker News"
**问题**：
- 封面和论坛的 "900+" 赞：在抖音上 900 赞是条普通视频，B 会觉得"没多火"；A 拿 TikTok 的十万赞比，也觉得少。HN 的 910 分很高，但只有程序员知道。
- "Hacker News"：B 会读成"黑客新闻"，以为是黑客的事；A 不认识。
- b18 "Qwen3, a bigger cousin of Strata's" / 「Strata 那个模型的大表哥」：旁白从没说过 Strata 跑的是千问，"大表哥"没有落点。
- B7 四个纸箱上写了 DeepSeek、Kimi、Llama、Qwen——这是 B 全片唯一认得的东西，却只写在箱子上，旁白没念。

**改法**：
- B0 论坛：去掉赞数滚动，改成评论一条接一条往下长、撑破窗框、从纸上溢出来（"炸了"本身）。封面小标签 ZH 改
  「Strata · 冲上程序员论坛 Hacker News 首页」，EN 保留 "front page of Hacker News"（X 上懂的人多）。显卡画稿上加红笔小字 "RTX 4090"（A 一眼认出）。
- b04 EN: "An AI model is a giant pile of numbers. The one Strata runs, Qwen, has a hundred and twenty-five billion."
- b04 ZH: 「AI 模型，说白了就是一大堆数字。Strata 跑的是阿里的千问，足足一千二百五十亿个。」
- b17 EN: "DeepSeek, Kimi, Llama, Qwen: who got called, for every word. Our paper on them, Patterns behind Chaos, won a Best Paper Award this summer."
- b17 ZH: 「DeepSeek、Kimi、Llama，还有千问：每个词叫了谁，全记了下来。写成的论文《混乱背后的规律》，今年拿了最佳论文奖。」
- b18 EN: "We ran the slips of Qwen, a bigger cousin of Strata's model, through a pretend kitchen."
- b18 ZH: 「这次，我们拿千问家老大哥的单子，在模拟厨房里重新走了一遍。」（"重放"是行话；"大表哥"指亲戚不同家，同一个 Qwen 团队、上一代、更大，"老大哥"更准）

### 7. 去掉两处让人"咦？"的跳跃：先说"学出来的"又问"是不是随机"；"我们记录过的那一家"
**问题**：
- b09 刚说"该叫谁，是 AI 自己学出来的"，b16 就问"可真是随机的吗？"A 会说："你刚才不是说它学过吗？"真正的问题是"能不能**提前猜到**下一张单子叫谁"（也守住 e01 FACTS T19：不说"专家选择是随机的"）。
- b07 "In the one we recorded" / 「我们记录过的那一家」出现在 0:41，"记录"要到 1:47 才解释，两位读者都卡一下。
- b09 "Engineers call the chefs experts. No job titles, though" 自相矛盾（"专家"又"没头衔"），而且"专家"这个词之后旁白再也没用过。

**改法**：
- b07 EN: "Picture a giant restaurant. The one we'll follow today has a hundred and twenty-eight chefs at every station."
- b07 ZH: 「想象一家超大的餐厅。今天跟拍的这一家，每个灶台站着一百二十八位厨师。」（"跟拍"是抖音观众的母语）
- b09 EN: "Engineers call them experts. Experts in what? Nothing as simple as soup or pastry. The AI worked out on its own whom to call."
- b09 ZH: 「工程师管他们叫"专家"。专什么？可不是川菜粤菜这么简单。叫谁，是 AI 自己琢磨出来的。」（划掉名牌的笑点保留；"不简单"比"没有分科"更稳，T23）
- b16 EN: "Can you beat the blindfold? We didn't have to guess. Our lab kept the order slips."
- b16 ZH: 「能比蒙眼强吗？不用猜。我们实验室，留着后厨的单子。」

### 8. 在结果里回扣 Strata：规则二就是 Strata README 写的思路
**问题**：现稿 B4 之后 Strata 基本消失，热点和我们的发现没接上。
**事实**：Strata README："Your graphics card keeps the few thousand experts that are used most often."——就是"留最常用的"，即我们的规则二。
**改法**（正面说，不评判）：
- b20 EN: "Keep the busiest chefs, the idea in Strata's own notes: fifty-one. Already double the blindfold."
- b20 ZH: 「留最常用的几位，Strata 说明文档里也是这个思路：51 分，已经是蒙眼的两倍。」
- 这一拍屏幕上必须同时有小字："Scores: our simulation on Qwen3-235B slips, room for 1/4. Not a test of Strata." / 「分数：我们在千问 Qwen3-235B 单子上的模拟，楼上放 1/4；不是对 Strata 的实测。」
- 然后规则三自然变成"我们的单子还多看出了一层"，结尾 "Maybe you'll build the next Strata" 有了落点。

**风险与退路**：发布前看 Strata 源码里留人用的是不是纯频次（有没有按最近 / 预测的成分）[check]。如果还有别的，改成
EN "Strata keeps the most-used chefs upstairs, and that already doubles the blindfold." / ZH「Strata 留的是最常用的那几位，光这一条，分数就翻倍。」
不给规则二打"不及格"，不拿 Strata 和规则三比高低的字眼（"beats Strata"之类一律不用）。

### 9. 自我介绍给个理由并缩短；B7 从 23 s 缩到约 15 s，奖项挪进 B7
**问题**：B1 8.4 s 只说了"我们是谁"+"一个规律"，没有理由让人留下；B11 的论文 + 奖项放在片尾，变成"自夸收尾"。
**改法**：
- b03 EN: "We're Picasso Lab at UC San Diego, and on this one, we have the receipts."
- b03 ZH: 「我们是加州大学圣地亚哥分校的 Picasso 实验室。这事，我们有发言权。」
  （"receipts" 是 A 熟的俚语 = 证据，B7 的单子就是字面意义的 receipts：红笔在铁钎旁写 "the receipts"。中文"有发言权"是原生说法。约 5.8 s。）
- 图书馆的斜线亮窗手机上读不成"规律"，删；换成红笔把一张空白单子钉在图书馆前的告示牌上（预告 B7），不需要新画稿以外的东西。
- 奖项进 b17（见第 6 条），论文首页画稿 + 玫瑰花结钉在铁钎上那摞单子的最上面，"ISCA 2026" 只写在花结上，不念。
  中文旁白不念 "ISCA"（念出来是四个字母，B 听不懂）；屏幕小字「计算机体系结构顶会 ISCA 2026」。

### 10. 结尾改成"跟你有关"+"乱中有序"，删"这就是系统研究"
**问题**：b24 "This is systems research" / 「这就是系统研究」是讲座句：B 听成"系统性的研究"，A 无感。B10-B11 合计 28 s 没有一个新画面笑点。
**改法**：先说观众得到什么，"系统研究"降成红笔小字（EN "(this is called systems research)" / ZH「这叫"系统研究"」），然后直接收到"乱中有序"。
- b24 EN: "No new chip. The same card, used smarter."  ZH: 「不换新芯片，同一张显卡，用得更聪明。」
- b25 EN: "That's how big AI gets cheaper and moves onto your own desk, where what you type never leaves the room."
  ZH: 「大模型变便宜、搬进你自己的电脑，聊什么都不出家门，靠的就是这个。」（README "Nothing leaves your PC."）
- b27 EN: "The slips are public. Maybe you'll build the next Strata."  ZH: 「单子全部公开。说不定，下一个 Strata 就出自你手。」
- b28 不动（"It looks like chaos. It's a pattern…" 是全片最好的一句，b17 念过论文标题之后它就成了标题的回声）。
- 玻璃侧板里的迷你两层厨房留着（A 会心一笑）；"new chip?" 划掉也留着。

## 2 观众必须一路攥着的逻辑链
| 环 | 内容 | 现稿 | 改后 |
| --- | --- | --- | --- |
| L1 | 模型太大，一张卡装不下 | B2 有，压力机笑点好 | 不动 |
| L2 | 每个词每个灶台只叫 8 位 | B3 有 | 不动 |
| L3 | 下一个词叫另一拨人 | **缺** | b08 补（第 1 条） |
| L4 | 所以：小快厨房只放几位，其余放大休息室（= 怎么塞进去的） | 隐含，没回答开头的问题 | b10 正面回答（第 1 条） |
| L5 | 从楼下叫人很慢，缺一位整句就卡 | B5 有，但"慢 30 倍"无参照、计时器意思反了 | 一秒 vs 半分钟；句子卡住（第 4、5 条） |
| L6 | 所以要猜下一张单子叫谁 | 问成了"是不是随机"，跟"学出来的"打架 | "能提前猜到吗"（第 7 条） |
| L7 | 单子里有规律：刚叫过的会再被叫 | 埋在 b21 长句中间 | 121 号三次出场（第 3 条） |
| L8 | 猜得好 → 少跑楼梯 → 回答快 | 有，但单位乱 | 一个百分制分数（第 2 条） |
| L9 | 这就是大模型能进你电脑的原因 | 有，但讲座腔 | 第 10 条 |

## 3 逐拍记录
| 段 | 时间 | A（16 岁）卡在 | B（55 岁）卡在 | 无聊 / 说教 | 改法 |
| --- | --- | --- | --- | --- | --- |
| B0 | 0:00-0:10.6 | 无，钩子好；"900+" 显得少 | "Hacker News" 读成黑客；900 赞不算火 | 无 | 第 6 条 |
| B1 | 0:10.6-0:19.0 | 自我介绍没理由，想划走 | 「加州大学圣地亚哥分校的 Picasso 实验室」一口气 20 个字，记不住；斜线亮窗看不出意思 | **无聊** | 第 9 条 |
| B2 | 0:19.0-0:34.0 | 无；压力机好笑 | 1250 亿没感觉；「照常规存下来」略书面 | 无 | 第 5 条；ZH b05 改「正常存，得十多张游戏显卡才装得下；使劲压缩，一张还是塞不进去。」 |
| B3 | 0:34.0-1:03.9 | "the one we recorded"？"station 1 of 94"？128 个只用 8 个，剩下的干嘛 | "我们记录过的那一家"？"专家"又"不分菜系"有点绕 | README 引语那 4.6 s 偏慢：引语边写边念，不要单独等它写完 | 第 1、7 条；屏幕上 "Strata's README" EN 改 "Strata's author"（README 是行话），ZH「Strata 说明文档」可以 |
| B4 | 1:03.9-1:16.8 | 无（知道显存 / 内存条） | 「电脑的内存」= 手机存储？ | 胖师傅挤门：拿体型逗笑，也不解释任何东西 | ZH 一律说「内存条」；胖师傅改成最后一位进门发现还空着一大片，往沙发上一躺（"谁都待得下"） |
| B5 | 1:16.8-1:28.4 | "30 times slower than using one" 比的是什么 | 同左 | 无 | 第 4、5 条 |
| B6 | 1:28.4-1:40.5 | b15 EN 句子太绕（"a kitchen with room for a quarter would find three of every four it needs... downstairs"） | ZH 可以 | 无 | 第 2 条；b15 两句拆开 |
| B7 | 1:40.5-2:03.7 | 三个大数连发；"replayed" | "请求""重放"是行话；"大表哥"没落点 | **最无聊的 23 s** | 第 5、6、9 条：报模型名不报数，奖项挪进来，约 15 s |
| B8 | 2:03.7-2:24.7 | 跟得上，最好看的一段 | 分数说法换了三次 | b21 一句 11 s 太长 | 第 2、3、8 条；b21 拆成"121 号又是你"+"熟面孔 77 分" |
| B9 | 2:24.7-2:40.0 | "seven times fewer" | "放一半"和规则二的"两位里有一位"混了 | 无 | 第 2 条；EN 说 "Double the room upstairs"，不说 "half the chefs" |
| B10 | 2:40.0-2:54.1 | 想划走 | 「系统研究」听不懂 | **说教** | 第 10 条 |
| B11 | 2:54.1-3:08.0 | ISCA？ | 「ISCA」念出来是字母 | **说教 / 自夸收尾** | 第 9 条：奖项进 B7，这里只剩"单子公开 + 下一个 Strata" |
| B12 | 3:08.0-3:15.6 | 50 px 的小厨师手机上是一片点，可以（就是"乱"） | 同左；"规律"要有个看得见的东西 | 无 | 第 3 条：121 的脸放大收尾 |
| B13 | 3:15.6-3:20.0 | 无 | 无 | 无 | 不动 |

## 4 词表：每个让人掉线的词
| 词 | 在哪 | 谁掉线 | 换成 |
| --- | --- | --- | --- |
| Hacker News | B0 封面标签 | A、B | ZH「程序员论坛 Hacker News」；EN 不动 |
| 900+ | B0 | B | 删，评论溢出窗框 |
| README / 说明文档 | B3 手写 | A（EN） | EN "Strata's author"；ZH 不动 |
| the one we recorded / 我们记录过的那一家 | b07 | A、B | "the one we'll follow today" / 「今天跟拍的这一家」 |
| experts + no job titles | b09 | A、B | 第 7 条 |
| 内存 | b11 | B | 「内存条」 |
| thirty times slower | b12 | A、B | 一秒 vs 半分钟 |
| random / 随机 | b15, b16 | A（与"学出来的"打架） | "guess who's next" / 「提前猜到」；"蒙眼"留着 |
| requests / 请求 | b17 | B | 删或"questions /提问" |
| replayed / 重放 | b18 | A、B | "ran … through a pretend kitchen" / 「在模拟厨房里重新走了一遍」 |
| 大表哥 | b18 | B（没落点） | 「千问家老大哥」，且 b04 先说 Strata 跑的是千问 |
| seven times fewer / 七分之一 | b23 | A、B | "only seven still take the stairs" / 「只剩 7 次要跑楼梯」 |
| systems research / 系统研究 | b24 | A、B | 降成红笔小字 |
| ISCA | b26 | A、B | 只写在花结上；ZH 不念 |
| 一个词 vs 一个字 | ZH 全片 vs `bakeoff/line/strings.js`（`ticket: ['一个字']`） | 前后不一 | 定一个；建议全片「一个词」，把开头 17.5 s 的单子和字幕改过来 |

## 5 数字：现稿 vs 改后（只算旁白里念出来的）
| 段 | 现稿念出的数 | 改后念出的数 |
| --- | --- | --- |
| B2 | 1250 亿、十倍 | 1250 亿、十多张（红笔另写"近四千年"，不念） |
| B3 | 128、8 | 128、8 |
| B5 | 30 多倍 | 一秒、半分钟 |
| B6 | 四分之一、四位里三位 | 四分之一、25 分 |
| B7 | 4 个模型、两万四千多、将近七百万 | 四个名字（不是数） |
| B8 | 四中一、两位里一位、四位里三位、三倍 | 51 分（两倍）、77 分（三倍） |
| B9 | 一半、九十三、七分之一 | 50 分、93 分、7 次 |
| B11 | ISCA 2026 | （挪到 B7，念"今年"） |
| 合计 | 约 18 个，6 种说法 | 约 13 个，一种分数 + 一个人类单位 |

所有改后的数都来自原稿已核过的来源：25.0 / 50.7 / 76.7（`res_32.json`）、50.0 / 93.0（`res_64.json`）、7 = 100 - 93、
121 号 19/40（anim.json）、30 倍（N6，1,008 / 31.5 = 32）、近四千年（125e9 / 31,557,600 s，我们的算术）。

## 6 画面笑点：留 / 换 / 新增
**留**（都是解释本身）：大脑被挤进显卡（B0）；压力机压山"还是塞不下"（B2）；川菜粤菜名牌被划掉（B3，类比失效处）；
喘着爬楼梯的厨师（B5）；蒙眼抓阄的经理（B6 / B8）；楼板下移的"施工式"转场（B9）；玻璃侧板里的迷你厨房（B10）。

**换**：
| 现稿 | 问题 | 换成 |
| --- | --- | --- |
| 赞数从 1 跳到 900+ | 抖音上显得少 | 评论条撑破窗框溢出来 |
| 图书馆窗户斜线亮红 | 手机上读不成"规律"，B12 的伏笔没人接得住 | 一张空白单子钉在图书馆告示牌上（预告"单子"） |
| 胖师傅挤门 | 拿体型逗笑，不解释任何东西 | 最后一位进门，休息室还空一大片，他往沙发上一躺 |
| 响个不停的计时器 | 响铃 = "做好了"，意思反了 | 回答句子停在半截，光标"…"闪，红笔 "lag" /「卡」 |
| 论文首页 + 花结单独一段 | 片尾自夸 | 论文钉在 B7 那摞单子最上面 |
| "÷7"、"×2"、"3 of 4 downstairs" | 单位混乱 | 10x10 勾格阵 + 红笔分数 |

**新增**：
1. 121 号厨师（第 3 条），三次出场 + B12 收尾。
2. 标题带里一词一词长出来的回答（第 4 条），全片贯穿：B3 开始、B5 卡住、B9 楼梯少了以后一口气写完（"Fewer trips, faster answers" 时整句刷地写满）。
3. 老师批卷式红笔分数，只在蒙眼 25 和最后 93 上加评语（"F" /「不及格」，"A" /「优」）。
4. 125,000,000,000 下面的红笔小字"一秒数一个，要数近四千年"。

## 7 改后旁白全文（EN / ZH）
按原稿的估算法（EN 2.6 词/秒、ZH 4.4 字/秒）：EN 435 词约 2:47、ZH 678 字约 2:34，加停顿和片尾卡约 **EN 3:10 / ZH 2:58**，
和原稿差不多长，但时间从报数挪到了"恍然大悟"和 121 号上。要压到 2:45：删 b09 后半句（-4 s）、b18 并进 b17（-6 s）、b25 缩成一句（-3 s）。

| # | EN | ZH |
| --- | --- | --- |
| b01 | A data-center AI, on one gaming card. | 机房级的 AI 大模型，塞进一张游戏显卡。 |
| b02 | A free program called Strata pulled it off. Programmers lost their minds: how does that even fit? | 免费程序 Strata 做到了。程序员们全炸了：这怎么塞得进去？ |
| b03 | We're Picasso Lab at UC San Diego, and on this one, we have the receipts. | 我们是加州大学圣地亚哥分校的 Picasso 实验室。这事，我们有发言权。 |
| b04 | An AI model is a giant pile of numbers. The one Strata runs, Qwen, has a hundred and twenty-five billion. | AI 模型，说白了就是一大堆数字。Strata 跑的是阿里的千问，足足一千二百五十亿个。 |
| b05 | Stored the usual way, that's ten times what a gaming card holds. Even squeezed hard, it won't fit. | 正常存，得十多张游戏显卡才装得下；使劲压缩，一张还是塞不进去。 |
| b06 | So how does it run? Strata's author compares it to a kitchen. Let's go in. | 那它是怎么跑起来的？Strata 的作者自己打了个比方：厨房。走，进去看看。 |
| b07 | Picture a giant restaurant. The one we'll follow today has a hundred and twenty-eight chefs at every station. | 想象一家超大的餐厅。今天跟拍的这一家，每个灶台站着一百二十八位厨师。 |
| b08 | For each word the AI writes, the slip calls just eight of them. The next word calls a different eight. | AI 每写一个词，单子上只叫八位上手；下一个词，又换一拨人。 |
| b09 | Engineers call them experts. Experts in what? Nothing as simple as soup or pastry. The AI worked out on its own whom to call. | 工程师管他们叫"专家"。专什么？可不是川菜粤菜这么简单。叫谁，是 AI 自己琢磨出来的。 |
| b10 | So how does it fit? It doesn't have to. Each word needs only a few chefs, so a small, fast kitchen upstairs will do: the graphics card. | 那它是怎么塞进去的？根本不用全塞。每个词只用得着几位，楼上一间小厨房就够了，这间小厨房就是显卡。 |
| b11 | Everyone else waits in the big break room downstairs: the computer's ordinary memory. | 其余的人，都待在楼下的大休息室，也就是电脑的内存条，多少人都待得下。 |
| b12 | The catch is the stairs. If a chef upstairs starts in one second, one from downstairs takes half a minute. | 麻烦出在楼梯上：楼上的厨师一秒开工，楼下叫一位上来，得等半分钟。 |
| b13 | Miss one chef, and the whole answer stalls, mid-sentence. | 缺一位，整句回答就卡在半截。 |
| b14 | And the next slip could call anyone. So who do you keep upstairs? | 可下一张单子叫谁，谁也说不准。楼上，到底留谁？ |
| b15 | Let's keep score: out of a hundred calls, how many find their chef already upstairs? Upstairs holds a quarter. Pick them blindfolded: twenty-five. | 打个分：叫一百次，有几次人正好在楼上？楼上放得下四分之一，蒙着眼随便挑：25 分。 |
| b16 | Can you beat the blindfold? We didn't have to guess. Our lab kept the order slips. | 能比蒙眼强吗？不用猜。我们实验室，留着后厨的单子。 |
| b17 | DeepSeek, Kimi, Llama, Qwen: who got called, for every word. Our paper on them, Patterns behind Chaos, won a Best Paper Award this summer. | DeepSeek、Kimi、Llama，还有千问：每个词叫了谁，全记了下来。写成的论文《混乱背后的规律》，今年拿了最佳论文奖。 |
| b18 | We ran the slips of Qwen, a bigger cousin of Strata's model, through a pretend kitchen. | 这次，我们拿千问家老大哥的单子，在模拟厨房里重新走了一遍。 |
| b19 | （并进 b15） | （并进 b15） |
| b20 | Keep the busiest chefs, the idea in Strata's own notes: fifty-one. Already double the blindfold. | 留最常用的几位，Strata 说明文档里也是这个思路：51 分，已经是蒙眼的两倍。 |
| b21 | Now watch the slips. Chef one-twenty-one. Again. And again. Whoever was just called tends to be called again. Keep the recent regulars upstairs: seventy-seven. Triple the blindfold. | 再盯着单子看：121 号，又是你。刚被叫过的，往往很快又被叫到。把熟面孔留在楼上：77 分，蒙眼的三倍。 |
| b22 | Double the room upstairs. Blindfold: fifty. Recent regulars: ninety-three. | 楼上扩建一倍：蒙眼 50 分，留熟面孔 93 分。 |
| b23 | Out of a hundred calls, only seven still take the stairs. Fewer trips, faster answers. | 一百次点名，只剩 7 次要跑楼梯。楼梯跑得少，回答就快。 |
| b24 | No new chip. The same card, used smarter. | 不换新芯片，同一张显卡，用得更聪明。 |
| b25 | That's how big AI gets cheaper and moves onto your own desk, where what you type never leaves the room. | 大模型变便宜、搬进你自己的电脑，聊什么都不出家门，靠的就是这个。 |
| b26 | （并进 b17） | （并进 b17） |
| b27 | The slips are public. Maybe you'll build the next Strata. | 单子全部公开。说不定，下一个 Strata 就出自你手。 |
| b28 | It looks like chaos. It's a pattern. And a pattern is something you can plan for. | 看着是一团乱麻，其实有规律。有规律，就能提前安排。 |

X 的 2:15 版（SCRIPT §7）照此重算：保留 b08 第二句和 b10（"怎么塞进去"的答案不能删），删 b09、b18、b20（三翻变两步，Strata 回扣改放帖子）、b25、b27。

## 8 改法带进来的待核项
1. **[check]** Strata 源码里留在显卡上的专家怎么选（纯频次？有没有近期 / 预测）。决定第 8 条用正文还是退路句。
2. **[check]** "阿里的千问"：README 写 "Qwen3.8-Flash-Next by the Qwen team"；Qwen 团队属阿里巴巴是公开常识，抖音上说"阿里"需要的话再找一个官方页面挂 SRC。
3. **[check]** "老大哥"：Qwen3-235B 是不是 Qwen3.8-Flash-Next 的上一代（发布时间先后），否则保留"大表哥"或改"同门的大块头"。
4. **[check]** "this summer" / 「今年」：ISCA 2026 在 6 月 27 日-7 月 1 日（e01 FACTS E2），没问题；若跨年发布，改成"ISCA 2026"。
5. "一秒 vs 半分钟"是 30 倍的比喻，不是真实耗时；字幕旁红笔小字保留 "~30×" 让懂行的人对得上。
6. 121 号"又被叫到"的那几拍，必须是 anim.json 里真的连续两个词都叫到 121 的位置，不能为了笑点挪。
7. 抖音版"不及格""优"只挂在蒙眼和 93 上；规则二（Strata 的思路）不加任何评语。
