# Strata x 《混乱背后的规律》线稿全片：事实核查

> 2026-10-05 核对 `SCRIPT.md` 与 `vo_lines.json` 的每句旁白、每个画中字、每个"来源"注。
> 判定：**OK** / **改措辞** / **错** / **无法核实**。行号指 `SCRIPT.md`。来源编号见 §1。
> 我们自己的算术都在本机重算过（`res_*.json`、`film/anim.json`、带宽、字节数）。

## 0 最要紧的 10 处

1. **B4-B5 把 Strata 讲成"叫人上楼"，与 Strata 的实际做法不符（错）。** Strata 写回答时，显卡没有的专家主要由
   **处理器在内存里就地计算**（"your processor works on it - at the same time as the graphics card"，S2；
   "The CPU computes the experts that are not on the GPU in place"，S3）；只有一小部分未命中按 `--pcie-frac` 拷上显卡，
   读长提示时才整层经 PCIe 流上去。b10 说"Strata's trick"，紧接 b12 的"楼梯"，观众会以为 Strata 靠搬人上楼。
   改：楼下也有一口**小灶**（= 处理器），楼下的人能做菜，只是慢；"楼梯"降为次要路径。措辞见 B4/B5。
2. **b12 "over thirty times slower / 慢三十多倍"（改措辞）。** 32 倍只对一条路、一张卡成立：RTX 4090 显存
   1,008 GB/s 对 PCIe 4.0 x16 约 31.5 GB/s。Strata 的主路（处理器读 DDR5，双通道约 80-96 GB/s）在 4090 上约 10 倍；
   Strata 自己测速用的 RTX 5070（672 GB/s、PCIe 5.0）上，主路约 8 倍、搬运约 11 倍。改成"慢好多倍"，屏上去掉 "30×"。
3. **b13 "Every word that needs someone from downstairs waits"（改措辞）。** Strata README 明说显卡和处理器同时干活，
   "so neither waits for the other"（S2）。真实情况是楼下的活越多，这个词越慢。改成"楼下要用的人越多，出得越慢"。
4. **B2 的立意"压缩不是答案，后面的厨房才是"（l.187-188）不对（改措辞）。** Strata 跑的就是压缩版：Q2_0 到 IQ3_S，
   约 2-3 bit，37.6-54.8 GB（S4），HN 评论区争的正是压缩的质量代价（S5）。压缩是招数的一半，只是不够。b05 改成
   "Strata 已经使劲压缩过，一张卡还是塞不进去"。
5. **b05 "ten times what a gaming card holds"（改措辞）。** 250 GB ÷ 24 GB = 10.4，只对 RTX 4090 成立；RTX 5090 有 32 GB
   （7.8 倍）。改成"十倍于一张 RTX 4090 / 要十多张 4090"。
6. **小字 "9,082 words / 9082 个词"（错）。** 9,082 是生成的 **token** 数（`res_*.json` decode_tokens_test）；Strata
   README 自己也说 "A token is about ¾ of a word"。另外 "Strata's figures are its author's" 不全：4090 / 100 T/s 是
   HN 发帖人 snehesht 的说法，他不是作者 Niko1221；README 自己的数字测在 RTX 5070 上。小字还应写明 Strata 的模型
   与 Qwen3-235B 不同（每层 512 位专家、每词 10 位）。全文见 §2"小字"。
7. **b24 "no new chip / 不换新芯片"（改措辞）。** 论文的头条结果（6.6 倍）正是靠"lightweight architectural
   modifications"，在模拟的晶圆级 GPU 上（S8），而 b26 紧接着说 "Our paper on this"，两句放在一起会互相打架。
   去掉"不换新芯片"，保留"把手里的硬件用得更聪明"。
8. **b26 "Our paper on this"（改措辞，仅 EN）。** 论文研究的是大规模（多卡、晶圆级）部署里的数据搬运，不是游戏电脑；
   它写的是"这些规律"。改成 "Those patterns are in our paper…"。获奖措辞 "a Best Paper Award at ISCA 2026" 已核
   （当届两篇之一，S10）。中文原句可留。
9. **b18 / b07 夸大了重放范围（改措辞）。** 我们只下载了 Qwen3-235B 的 150 条请求，其中 79 条用来学热度、71 条用来测；
   "将近七百万次点名"（6,829,664）只算测的那 71 条。"We replayed one model's slips" 改成 "a sample of one model's
   slips"。b07 "the one we recorded" 改成 "the one we replayed"（我们记录了四个模型，每层专家数各不相同）。
10. **加一句 Strata 自己的证据，把热点接到我们的结论上（新增，已核）。** Strata 的显卡专家缓存"keeps learning which
    ones those are while you use it"（S2），会随对话调整（`--adapt-every`），出厂时先装好一份"最常用专家"名单，
    运行时还报告 `hit_rate`（S3）。也就是说，Strata 自己就押注"谁会被叫到是有规律的"，而我们的数据量的就是这件事。
    放在 b21 后面："Strata's own cache works a bit like this…"。不要说 Strata 用了我们的方法，也不要说它的命中率
    等于我们算出来的。

## 1 来源（2026-10-05 读取）

| # | 来源 | 用到的内容 |
| --- | --- | --- |
| S1 | Strata README（github.com/Niko1221/Strata，main）+ README.zh-CN | 标语 "Run a 125-billion-parameter AI model on your own gaming PC"、"usually needs a server"、"free and open source"、"Nothing leaves your PC"、厨房原话、"24,576 small specialists… Each word needs only 10"、"A token is about ¾ of a word"；测速在 RTX 5070 12 GB / Ryzen 5 7600 / 64 GB 与 RX 9070 XT 上；MIT |
| S2 | Strata `docs/HOW_IT_WORKS.md` | "servers with hundreds of gigabytes of graphics memory"；显卡留最常用专家，"It keeps learning which ones those are while you use it"；"your processor works on it - at the same time as the graphics card, so neither waits for the other"；读长提示时专家经 PCIe 流上显卡 |
| S3 | Strata `docs/DETAILS.md`（How it works、Tuning、Low-RAM mode、`/metrics`） | "The CPU computes the experts that are not on the GPU in place"；`--pcie-frac`："the share of the experts missing from VRAM that are copied to the GPU instead of computed by the CPU"；自适应专家层 `--adapt-every`；出厂专家热度表；`hit_rate` 指标；测试机 DDR5-5200 |
| S4 | Strata `docs/MODELS.md` | 规格：Q2_0 37.6 GB、IQ2_XS 39.2、IQ3_XXS 47.0、IQ3_S 54.8（RAM+VRAM）；RTX 5070 实测 53-94 tokens/s（Coder 55）；"RTX 3090 should do roughly 100-140"（作者估算） |
| S5 | HN 49953495（Algolia API）+ news.ycombinator.com/front?day=2026-10-04 | 标题 "Run Qwen 3.8 Flash Next (125B) on consumer hardware (RTX 4090) at 100T/s"；发帖人 snehesht；2026-10-04 12:51:53 UTC；910 分、411 条评论；当日首页**第 2 名**；发帖人自述 "Nvidia 4090, 128GB DDR5, Ryzen 7950x3d… 124 tokens per sec"；评论里有不少人质疑 2-3 bit 的质量 |
| S6 | HF `Qwen/Qwen3.8-Flash-Next` 模型卡 + API | "125B with 6B activated, plus 51B n-gram embedding and 4B MTP"；48 层；512 专家；"10 Routed + 1 Shared"；safetensors 为 BF16，共 179,999,981,424 个参数；作者 Qwen |
| S7 | HF `Qwen/Qwen3-235B-A22B-FP8` config.json | hidden 4096、moe_intermediate 1536、num_experts 128、num_experts_per_tok 8、94 层、FP8 e4m3 |
| S8 | arXiv 2510.05497（v5，2026-05-12）摘要 | 标题、九位作者；"four 200B-1000B"、"over 24,000 requests"；"lightweight architectural modifications… 6.6x"（晶圆级 GPU）；"up to 1.25x… on MoE computation"（现有 GPU）；traces 公开 |
| S9 | HF 数据集 `core12345/MoE_expert_selection_trace` 页面 + API | gated: auto（"agree to share your contact information"）；checkpoint：Llama-4-Maverick-17B-128E-Instruct、DeepSeek-R1-AWQ、Kimi-K2-Thinking、Qwen3-235B-A22B-FP8；按输出 token、按层记录；199 GB |
| S10 | SIGARCH "ISCA 2026 Trip Report" | 第 53 届 ISCA，Raleigh，2026-06-27 至 07-01；两篇 Best Paper：Cerberus 与 Patterns Behind Chaos |
| S11 | NVIDIA RTX 4090 产品页；Wikipedia "GeForce RTX 40 series"（raw） | 24 GB GDDR6X、384-bit、PCIe Gen 4；21 Gbps、1,008 GB/s；2022-10-12 发售，首发价 $1,599 |
| S12 | Wikipedia "GeForce RTX 50 series"（raw） | RTX 5070：672 GB/s、PCIe 5.0 |
| S13 | IntuitionLabs "NVIDIA H100 Price 2026"（行业价格指南） | H100 每张约 $25k-40k（估计，NVIDIA 不公布标价） |
| S14 | `../NOTES.md`、`../analysis.py`、`../res_16/32/64.json`、`../film/anim.json`（本机重算） | 命中率、调用次数、单子号码、重复率、去重后的厨师数 |
| S15 | `../../e01-moe/FACTS.md` | E2/T18（获奖措辞）、E3（作者）、E4/E5（模型、请求数）、T16（checkpoint 名）、T23（专家不分科）、Ob2 |

我们自己的算术（只按带宽算，没算计算量）：PCIe 4.0 x16 = 16 GT/s × 16 × 128/130 ÷ 8 = 31.5 GB/s；PCIe 5.0 x16 = 63 GB/s；
DDR5 双通道：6000 MT/s 时 96 GB/s，5200 MT/s 时 83 GB/s。Qwen3-235B 每个专家 3 × 4096 × 1536 B = 18.9 MB（FP8），
共 12,032 个，合计 227 GB（不含 scale）；1/4 为 56.8 GB，1/2 为 113.5 GB。

## 2 逐条

### B0 冷开场

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b01 "A data-center AI, on one gaming card." | 改措辞（作钩子可以留） | S1 "usually needs a server"、S2 "hundreds of gigabytes of graphics memory"："机房级"成立。但大部分专家不在显卡上（S2、S3），发帖人那台机器还有 128 GB 内存（S5）。打问号的钩子可以留，前提是 B4 明说"显卡只装最忙的那些" | "A data-center AI, on one gaming PC." | 「机房级的 AI 大模型，跑在一台游戏电脑上。」 |
| b02 "A free program called Strata pulled it off." | OK | S1 "free and open source"，LICENSE 为 MIT。"pulled it off"：能跑，HN 上有用户复现（S5）；但跑的是 2-3 bit 压缩版（S4） | 原句 | 原句 |
| b02 "Programmers lost their minds" | OK（夸张修辞） | 910 分、411 条评论，10-04 首页第 2 名（S5）；评论区不少人在质疑质量。画面只用通用的惊叹字，不引用真实网友 | 原句 | 原句 |
| 封面标签 "Strata · front page of Hacker News" | OK，可以说得更具体 | S5：front?day=2026-10-04 排第 2 | "Strata · No. 2 on Hacker News, Oct 4" | 「Strata · 10 月 4 日 Hacker News 第 2 名」 |
| 论坛标题 "Strata: a 125B model on one RTX 4090" | 改措辞（小） | 原标题见 S5；4090 是发帖人自己的配置，不是作者的（README 测在 12 GB 的 RTX 5070 上） | "Strata: a 125B model on a gaming PC" | 「Strata：1250 亿参数模型跑在游戏电脑上」 |
| 论坛日期 "Oct 4, 2026" | OK | 2026-10-04 12:51 UTC（太平洋时间 05:51）（S5） | 原样 | 原样 |
| 赞数 "900+" | OK（发布前复核） | 910 分（S5） | 原样 | 原样 |

### B1 我们是谁

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b03 Picasso Lab, UC San Diego, Prof. Yufei Ding's lab | OK | S15 LAB；论文首页单位（S8） | 原句 | 原句 |
| "a pattern we've measured / 我们测到的规律" | OK | 论文在四个模型上做了 profiling（S8） | 原句 | 原句 |
| Geisel 代表 UC San Diego | OK（画面） | 它是校园地标，不是实验室所在楼（脚本已注明） | - | - |

### B2 一大堆数字

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b04 "Strata's has 125 billion" | OK | S1、S6 "125B with 6B activated"；完整权重另有 51B n-gram 嵌入和 4B MTP，合计 180B（S6）。说 125B 没问题，别说"全部就 125B" | 原句 | 原句 |
| b05 "ten times what a gaming card holds" / 「要十多张游戏显卡」 | 改措辞 | 125B × 2 B（BF16，S6）= 250 GB；÷ 24 GB（4090，S11）= 10.4 ✓。但 RTX 5090 是 32 GB（7.8 倍）。算上整份 180B 是 360 GB，合 15 张 24 GB 的卡 | "Stored the usual way, that's ten times what an RTX 4090 holds." | 「照常规存下来，要十多张 4090 才装得下。」 |
| b05 "Even squeezed hard, it won't fit." | 改措辞（事实对，立意错） | 最小的 Q2_0 要 37.6 GB > 24 GB ✓（S4）；但 Strata 本身就是靠压缩（2-3 bit）**加**厨房分工才跑起来的。l.187-188 的"压缩不是答案"改成"光压缩不够" | "Strata squeezes it hard, and it still won't fit on the card." | 「Strata 已经使劲压缩过，一张卡还是塞不进去。」 |
| 压力机停在 1.6 个框高 | OK | 37.6 ÷ 24 = 1.57 | - | - |

### B3 厨房

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b06 README 的厨房原话 | OK | EN 逐字；ZH README 原文是「可以想象一个厨房：常用的东西放在台面上，其余的放在储藏室里。」（S1），手写 「"可以想象一个厨房……"」 对得上 | 原句 | 原句 |
| b07 "In the one we recorded, every station has 128 chefs" | 改措辞（小） | 128 / 94 层 ✓（S7）。但我们记录了四个模型，每层分别是 256 / 384 / 128 / 128 位（S15 B1-B3），只重放了这一家 | "In the one we replayed, every station has a hundred and twenty-eight chefs." | 「我们重放的那一家，每个灶台站着一百二十八位厨师。」 |
| b08 "only eight of them cook" | OK | num_experts_per_tok 8，每层各选一次（S7）。"word" 指 token；口播用 word 可以（README 也这么说），小字写 token | 原句 | 原句 |
| b09 没有头衔；该叫谁是学出来的 | OK | S15 T23 + Mixtral 的路由分析；Qwen3 的 router 是训练出来的。论文 Ob4 讲的"谁忙随科目、语言变"是统计偏好，不是分科 | 原句 | 原句 |
| 手写 "(Qwen3-235B, the model in our data)" | 改措辞（小） | 我们的数据里有四个模型 | "(Qwen3-235B, one of the models in our data)" | 「（千问 Qwen3-235B，我们数据里的模型之一）」 |
| 帖子用：Strata 的模型 48 层 × 512 位，每词 10 位 + 1 位常驻，共 24,576 | OK | S6；48 × 512 = 24,576 = README 的数字（S1） | - | - |

### B4 楼上楼下

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b10 "Strata's trick: the graphics card is a small kitchen upstairs… room for only a few chefs" | OK | 显卡留"the few thousand experts that are used most often"，总共 24,576 个（S1、S2） | 原句（"a few" 也可改 "some"） | 原句 |
| b11 "ordinary memory is a big break room downstairs. Everyone fits." | 改措辞（类比少了一半） | RAM 确实装下全部专家（S1），但楼下的人**会做菜**：处理器就地算没在显卡上的专家，和显卡同时干（S2、S3）。休息室里加一口小灶（= 处理器） | "Everyone else is in the big room downstairs, the computer's ordinary memory. They can cook down there too, on a small, slow stove." | 「其余的人都在楼下的大屋子里，也就是电脑的内存。楼下也能做菜，只是灶小火慢。」 |
| 楼上画 32/128 | OK（画面） | 这是我们模拟的 1/4，不是 Strata 的比例；Strata 的比例取决于显存，"every extra GB holds ~700 more experts"（S2），片中不说比例 | - | - |

### B5 楼梯

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b12 "The catch is the stairs. Bringing a chef up is over thirty times slower…" | 错（拿来讲 Strata 时）；数字只在一种情况下成立 | 4090：1,008 GB/s ÷ 31.5 GB/s = 32（搬运路，S11 + 我们的算术）。Strata 写回答时主要走处理器（S2、S3）：4090 配 DDR5 约 10 倍；Strata 的测试机（RTX 5070 672 GB/s，DDR5-5200 约 83 GB/s，S3、S12）约 8 倍；5070 走 PCIe 5.0 搬运约 11 倍。只按带宽算 [check] | "The catch: downstairs is slow. Cooking on that little stove, or running a chef up the stairs, is many times slower than using a chef who's already upstairs." | 「麻烦在楼下慢：在楼下小灶上做，或者把人叫上楼，都比用楼上现成的慢好多倍。」 |
| 手写 "30× slower" / 「慢 30 多倍」 | 改 | 理由同上；非要数字的话，只给楼梯配一行小字 "RTX 4090: 1,008 GB/s on card vs ~32 GB/s over PCIe 4.0 (our arithmetic)" | "many × slower" | 「慢好多倍」 |
| b13 "Every word that needs someone from downstairs waits." | 改措辞 | Strata："at the same time as the graphics card, so neither waits for the other"（S2）。实际上一层要等慢的那一边做完，所以楼下的活越多越慢 | "The more chefs a word needs from downstairs, the slower it comes out." | 「一个词要用到的楼下的人越多，出得就越慢。」 |
| l.75-76 注："Strata 还会让 CPU 在楼下直接做一部分" | 改（脚本注释） | 写回答时这是**主路**，不是"还会"；搬运是 `--pcie-frac` 的那一小部分（写回答时），读提示时才是主路（S3） | - | - |

### B6 楼上留谁

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b15 随机时，楼上放 1/4，每四位有三位在楼下 | OK | res_32 random 0.25 = 32/128（S14） | 原句 | 原句 |

### B7 后厨的单子

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b16 "Our lab kept the order slips." | OK | S8、S15 E5 | 原句 | 原句 |
| b17 四个超大模型、两万四千多条请求，每个词、每个灶台都记了，并放上网 | OK | S8 "four 200B-1000B"、"over 24,000 requests"、traces 公开；S9 按输出 token、按层记录。数据集需登录并同意共享联系方式（自动通过） | 原句（要补一句的话："free to download after sign-up"） | 原句（可补「免费，注册就能下」） |
| 纸箱标签 DeepSeek-V3 / Kimi K2 / Llama 4 Maverick / Qwen3-235B | OK（用论文的叫法） | HF 卡片上的 checkpoint 是 DeepSeek-R1-AWQ 和 Kimi-K2-Thinking（S9）；按 S15 T16，屏上用论文名 | 原样 | 原样 |
| b18 "We replayed one model's slips: Qwen3, a bigger cousin of Strata's. Almost seven million chef calls." | 改措辞（小） | 150 条请求（6 个子集各 25 条），79 学 / 71 测；9,082 × 94 × 8 = 6,829,664 ✓（S14）。Qwen3-235B-A22B（235B / 22B）比 Qwen3.8-Flash-Next（125B / 6B）大，同属 Qwen 团队 ✓（S6、S7）；它是上一代，架构也不同 | "We replayed a sample of one model's slips: Qwen3, an older, bigger cousin of Strata's. Almost seven million chef calls." | 「我们从中挑了一家，重放了一部分单子：千问3，Strata 那个模型的大表哥。将近七百万次点名。」 |
| 计数器 "≈ 6,800,000 chef calls" / 「约 680 万次点名」 | OK | S14 | 原样 | 原样 |
| 单子 "word 1 · 88 21 97 0 126 71 121 58" | 改措辞（小） | 号码 ✓；但这是 LiveCodeBench 第 0 条请求、第 46 层的第 41 个生成 token（S14） | "one word · 88 21 …" 或 "word 41 · …" | 「一个词 · 88 21 …」 |
| 121 号在 40 个词里出现 19 次 | OK | 重算：121 出现 19 次、95 出现 16 次、23 出现 14 次（S14） | - | - |

### B8 三种规则（楼上放 32/128，`res_32.json`，71 条请求、9,082 个 token）

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b19 蒙眼：四中一 | OK | random 0.250 | 原句 | 原句 |
| b20 留最忙的：翻一倍，二中一 | OK | popular 0.507（2.03 倍），热度在另外 79 条请求上学出来 | 原句 | 原句 |
| b21 "Chefs who were just called tend to be called again" | OK | 论文 Ob2（深层更明显，S15 §3）；我们这一段：上一个词的 8 位在下一个词里平均再出现 30.1%，随机为 6.25%（重算，S14） | 原句 | 原句 |
| b21 留熟面孔：四中三，蒙眼的三倍 | OK | decay 0.767（3.07 倍），LRU 0.749（S14）。已核：decay 只会把刚用过的专家放进楼上，所以它就是普通的"缺了再搬"缓存，没有算漏的额外搬运 | 原句 | 原句 |
| 新增：Strata 自己的缓存也在学谁最忙 | 新增（已核） | "It keeps learning which ones those are while you use it"（S2）；`--adapt-every`、出厂热度表、`hit_rate`（S3）。不说 Strata 用了我们的方法，也不拿它的命中率和我们的比 | "Strata's own cache works a bit like this: it keeps learning who's busy while you chat." | 「Strata 的显卡也是这个思路：你聊着，它一直在学谁最忙。」 |

### B9 楼上放一半（`res_64.json`）

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b22 每一百次有九十三次人在楼上 | OK | decay 0.9301 | 原句 | 原句 |
| b23 "seven times fewer trips up the stairs" | 改措辞（跟着第 1 条改） | 0.50 ÷ 0.0699 = 7.15 ✓。在 Strata 那里，楼下的活主要是"在楼下做"，不是"上楼" | "That's seven times fewer calls downstairs than the blindfold. Fewer calls, faster answers." | 「要去楼下找人的次数，只有蒙眼抓阄的七分之一。找得少，回答就快。」 |
| 帖子用：PCIe 上限 3.5 → 25 tok/s | OK（只能当上限讲） | res_64：random 3.52、decay 25.21；Qwen3-235B FP8、25 GB/s，只算搬运。注意一张 4090 放不下 Qwen3-235B 一半的专家（约 114 GB），帖子里要说明 | "PCIe transfer bound for Qwen3-235B FP8, our arithmetic, not a measured speed" | 「按 PCIe 搬运上限估算（Qwen3-235B FP8，我们的算术，非实测）」 |

### B10 跟你有什么关系

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b24 "no new chip, just smarter use of the one you have" | 改措辞 | 论文的 6.6 倍正是"lightweight architectural modifications"在模拟晶圆级 GPU 上的结果（S8），而 b26 说 "Our paper on this" | "This is systems research: getting more out of the hardware you already have." | 「这就是系统研究：把手里的硬件用得更聪明。」 |
| b25 "It's how AI gets cheaper… what you type stays on your desk" | 改措辞（小） | "Nothing leaves your PC"（S1）✓；"It's how" 说得像唯一原因 | "It's one way AI gets cheaper and moves onto your own computer, where what you type stays on your desk." | 「大模型变便宜、搬进你自己的电脑，打的字不出你家门，这类研究是关键一环。」 |

### B11 论文与数据

| 说法 | 判定 | 来源 / 说明 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| b26 "Our paper on this… won a Best Paper Award at ISCA 2026" | 改措辞（仅 EN） | 获奖 ✓，当届两篇之一（S10、S15 E2/T18）。论文讲的是大规模部署里的规律（S8），不是"这件事"（游戏电脑） | "Those patterns are in our paper, Patterns behind Chaos, which won a Best Paper Award at ISCA 2026." | 原句可留：「我们把这些规律写成了论文《混乱背后的规律》，拿了 ISCA 2026 最佳论文奖。」 |
| 论文首页的标题、副标题、作者 "Yu, Guan, Yu, Zhou, Hu, Pei, Kang, Ding, Tsai" | OK | S8 | 原样 | 原样 |
| "ISCA: a conference on computer architecture" | OK | International Symposium on Computer Architecture，第 53 届（S10） | 原样 | 原样 |
| b27 "the order slips are public" | OK | gated: auto（S9） | 原句 | 原句 |
| 数据地址、arXiv 2510.05497 | OK | S8、S9 | 原样 | 原样 |

### B12 收尾

| 说法 | 判定 | 来源 / 说明 |
| --- | --- | --- |
| 40 个词只叫到 66 位，随机约 118 位 | OK | 重算：66；128 × (1 - (120/128)^40) = 118.3 |
| 121 / 95 / 23 是常客（19 / 16 / 14 次） | OK | S14 |
| b28 "looks like chaos… a pattern" | OK | 论文自己的说法（S15 E7、T19："looks random"） |

### 小字（l.478-481）

| 说法 | 判定 | 说明 |
| --- | --- | --- |
| "9,082 words" / 「9082 个词」 | 错 | 是生成的 token |
| "Strata's figures are its author's" | 改措辞 | 4090 / 100 T/s 来自 HN 发帖人，不是作者 |
| （缺）Strata 的模型不同 | 补 | S6 |

安全 EN："Simulation on our released Qwen3-235B traces (71 requests, 9,082 generated tokens), not a run of Strata, whose
model is different (512 experts per layer, 10 per token). Rules two and three are simple rules written for this
video, not the paper's method. Speed claims are Strata's and the Hacker News poster's."

安全 ZH：「基于我们公开的 Qwen3-235B 数据模拟（71 个请求、9082 个生成 token），并非实测 Strata；Strata 用的模型不同
（每层 512 位专家、每词 10 位）。第二、三种规则是为本视频写的简单规则，不是论文方法。速度说法来自 Strata 作者和
Hacker News 发帖人。」

### §0 / §5 注释

| 说法 | 判定 | 说明 |
| --- | --- | --- |
| l.12 "910 分、410 条评论" | 更新 | 2026-10-05 再抓：910 分、411 条评论，当日首页第 2 名（S5）。发布前再抓一次 |
| §0.3 #3 "4090 放不下 Qwen3-235B 专家的 1/4（约 57 GB）" | OK | 56.8 GB（§1 的算术） |
| §5 N6 "4090 规格页复核" | 已核 | 21 Gbps × 384-bit = 1,008 GB/s，PCIe Gen 4（S11） |
| §5 "README：RTX 5070 12 GB 上 53-94 tokens/s" | OK | S1、S4（另有 AMD RX 9070 XT 上 44-60） |
| §5 "HN 标题 100T/s on RTX 4090" | OK | 发帖人自述 124 tok/s（4090 + 128 GB DDR5 + 7950X3D，S5）。作者的 README 只**估算** 24 GB 的 RTX 3090 能到 100-140（S4） |
| §8 #2 "混乱 / 混沌" | 无关事实 | 两种译法都不算错，频道里统一一个就行 |

### 硬件和价格（现在脚本里没有；以后要加时这样说）

| 说法 | 判定 | 来源 | 安全 EN | 安全 ZH |
| --- | --- | --- | --- | --- |
| RTX 4090：24 GB 显存，2022-10-12 发售，首发价 $1,599 | OK | S11 | "a gaming card that launched at $1,599, with 24 GB of memory" | 「首发价 1599 美元、24 GB 显存的游戏显卡」 |
| 数据中心显卡（H100）每张 $25k-40k | 只是估计 | S13（行业价格指南；NVIDIA 不公布标价） | "data-center GPUs cost tens of thousands of dollars each" | 「数据中心显卡，一张就要几万美元」 |
| 这类模型通常跑在有几百 GB 显存的服务器上 | OK（Strata 原话） | S2 | "Models like this usually run on servers with hundreds of gigabytes of graphics memory." | 「这类模型平时跑在有几百 GB 显存的服务器上。」 |
