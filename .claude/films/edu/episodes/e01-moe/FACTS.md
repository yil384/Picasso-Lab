# Fact brief: pilot episode (L14-A, MoE + "Patterns behind Chaos")

The rule for this pilot: every number, title and quote on screen or in the voice-over comes from this brief, worded the
way it is worded here. If a line in the script needs a fact that is not here, it is not cleared yet.

Checked on 2026-10-04 against the primary sources below. Page numbers are **PDF page indices** of the cited files.
For L14 the PDF page equals the slide number.

## Source key

| Key | Source | Local copy |
| --- | --- | --- |
| **PBC** | Z. Yu, Y. Guan, Z. Yu, C. Zhou, Z. Hu, S. Pei, Y. Kang, Y. Ding, P.-A. Tsai, "Patterns behind Chaos: Forecasting Data Movement for Efficient Large-Scale MoE LLM Inference", arXiv 2510.05497 **v5** (12 May 2026), "Accepted to ISCA 2026" (footnote p.1). v1 was 7 Oct 2025. Quote v5 only. | arXiv 2510.05497 v5 (download; not in the repo), `pbc.txt`, figure renders `pbc_p*.png` |
| **DSV3** | DeepSeek-AI, "DeepSeek-V3 Technical Report", arXiv 2412.19437 **v2** (18 Feb 2025) | `(download) dsv3.pdf`, `dsv3.txt` |
| **L14** | CSE 291P "LLM System Optimization", lecture "MoE and MoE System", Zhongkai Yu (47 slides) | `course/L14.pdf`, renders `course/ renders of L14 p*.png` |
| **L07** | CSE 291P L07, slide 32 (DeepSeek-V3 671B/37B training setup) | `course/L07.txt` |
| **SIGARCH** | "ISCA 2026 Trip Report", Bingyao Li, sigarch.org, 10 Jul 2026 | web |
| **XREF91** | Crossref record, DOI 10.1162/neco.1991.3.1.79 | web |
| **SHZ17** | Shazeer et al., "Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer", arXiv 1701.06538 (23 Jan 2017), abstract | web |
| **DSMOE** | Dai et al., "DeepSeekMoE: Towards Ultimate Expert Specialization in Mixture-of-Experts Language Models", arXiv 2401.06066 (11 Jan 2024), abstract | web |
| **MIX** | Jiang et al., "Mixtral of Experts", arXiv 2401.04088, abstract and Section 5 "Routing analysis" | `(download) mixtral.html` |
| **K2 / Q3 / L4** | Kimi K2 report arXiv 2507.20534 (Table 2); Qwen3 report arXiv 2505.09388 (Table 2); Meta Llama 4 launch blog | web |
| **EPLB / DSGH** | github.com/deepseek-ai/EPLB README; github.com/deepseek-ai/DeepSeek-V3 README | web |
| **HF** | Hugging Face dataset card `core12345/MoE_expert_selection_trace` (exists, public, auto-gated) | web |
| **LAB** | `social/x/build.py` lines 26-33 (the lab's Best Paper post copy); `social/x/versions/VERSIONS.md` (v2 comic) | repo |

Verified column: **Yes** = read in the primary source today. **Derived** = our own arithmetic on verified numbers. If a
derived number goes on screen, it is presented as our arithmetic ("that's about...", never as the source's claim).
**Lecture only** = only on a slide, with no primary source checked. **CONFLICT** = the sources disagree. Use the
fix given.

---

## 1. Fact table

### A. DeepSeek-V3: the hook numbers

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Total parameters | 671B | DSV3 abstract p.1; §4.2 p.22 | Yes | "671 billion parameters." | "总参数 6710 亿。" |
| A2 | Activated parameters per token | **37B** (L14 p.9 says 36B, which does not match the DeepSeek report) | DSV3 abstract p.1 ("37B activated for each token"); §4.2 p.22; L07 p.32 | Yes. **CONFLICT** with L14 p.9; use 37B | "Each token activates 37 billion of them." | "每个 token 只激活其中 370 亿。" |
| A3 | Share of parameters active per token | 37/671 = 5.5%; 671/37 = about 18x | from A1, A2 | Derived | "About 5.5% of the weights, per token." | "每个 token 只动用约 5.5% 的参数。" |
| A4 | Experts per MoE layer | 1 shared expert + 256 routed experts | DSV3 §4.2 p.22 | Yes | "Each MoE layer: 256 routed experts, plus 1 shared expert." | "每个 MoE 层：256 个路由专家，外加 1 个共享专家。" |
| A5 | Experts picked per token | 8 of the 256 routed experts, per layer. The shared expert is always used. | DSV3 §4.2 p.22. During decoding the shared expert is treated as routed, so it is "9 experts": §3.4.2 p.19 | Yes | "Each token gets 8 of the 256, plus the shared one." | "每个 token 只挑 8 个，再加上人人都走的那个共享专家。" |
| A6 | Number of layers | 61 Transformer layers. All FFNs except the first 3 are MoE, so there are 58 MoE layers. | DSV3 §4.2 p.22 (61 layers, "all FFNs except for the first three layers"); PBC p.11 ("94 vs. 58" MoE layers) | Yes | "...and it picks again in every one of 58 MoE layers." | "这样的挑选，58 个 MoE 层里每层都来一次。" |
| A7 | Routed experts in the whole model | 58 x 256 = 14,848 | from A4, A6 | Derived | "That's 14,848 routed experts in total, by our count." | "按我们的算法，全模型共 14848 个路由专家。" |
| A8 | Size of one expert | Hidden 7168, expert intermediate 2048, so about 3 x 7168 x 2048 = 44M parameters (SwiGLU form, L14 p.10) | DSV3 §4.2 p.22 (dims); L14 p.10 (3-matrix expert) | Derived. Confirm with Zhongkai before it goes on screen | "Each expert is a small network of roughly 44 million weights." | "每个专家是一个约 4400 万参数的小网络。" |
| A9 | Ways to pick 8 of 256 | C(256,8) = 409,663,695,276,000, about 4.1 x 10^14 | arithmetic (Python `math.comb`) | Derived. **PBC p.2 prints 4,426,165,368 (that is C(64,8))** as 4,426,165,368, which is C(64,8) | "More than 400 trillion ways to pick 8 of 256." | "256 选 8，有超过 400 万亿种选法。" |
| A10 | How the router scores | Sigmoid affinity per expert; top-8 kept; gate weights normalized among the selected | DSV3 §2.1.2 p.8-9 | Yes | "A small router scores all 256 and keeps the top 8." | "一个小小的路由器给 256 个专家打分，只留前 8 名。" |
| A11 | Node-limited routing | Each token goes to at most 4 nodes (M = 4). In training, a layer's routed experts sit on 64 GPUs in 8 nodes. | DSV3 §2.1.2 p.9; §4.2 p.23; §3.2.2 p.13 | Yes | "Each token may visit at most 4 machines." | "每个 token 最多只能去 4 台机器。" |
| A12 | Why 4 nodes | NVLink 160 GB/s, about 3.2x InfiniBand (50 GB/s), so about 3.2 experts per node at no extra NVLink cost. Up to 13 experts (4 x 3.2) at the same communication cost; in practice 8. | DSV3 §3.2.2 p.13-14; L14 p.29 | Yes | "The rule is about cables, not about meaning." | "这条规矩是为了省网线，不是因为专家分科。" |
| A13 | Load balancing without (much) auxiliary loss | A per-expert bias is added **only for choosing** experts; the gate weight still uses the original score. Bias update speed 0.001 for the first 14.3T tokens. A tiny sequence-wise balance loss (alpha = 0.0001) is still kept. | DSV3 §2.1.2 p.9; §4.2 p.23; L14 p.17 | Yes | "Busy experts get a small handicap when it's time to choose." | "太忙的专家，挑人时被悄悄扣一点分。" |
| A14 | No token dropping | No tokens dropped in training or in inference | DSV3 §2.1.2 p.9 | Yes | (background; use only if asked) | (背景) |
| A15 | Serving: prefill unit | 4 nodes / 32 GPUs; attention TP4 + SP, DP8; MoE EP32; 32 redundant experts; each GPU hosts its 8 experts + 1 redundant | DSV3 §3.4.1 p.19; L14 p.26 | Yes | "Even the smallest serving unit is 32 GPUs." | "最小的预填充部署单元就要 32 张卡。" |
| A16 | Serving: decode unit | 40 nodes / 320 GPUs; attention TP4 + SP, DP80; MoE EP320; one expert per GPU; 64 GPUs hold redundant and shared experts | DSV3 §3.4.2 p.19; L14 p.26 | Yes | "For generating text: 320 GPUs, one expert each." | "生成阶段：320 张卡，一张卡只放一个专家。" |
| A17 | Hot experts re-balanced | High-load experts detected from live statistics and adjusted periodically, e.g. every 10 minutes | DSV3 §3.4.1 p.19 | Yes | "Every ten minutes or so, the busiest experts get a copy." | "大约每 10 分钟，最忙的专家会被复制一份。" |
| A18 | Training cost (only if THE BILL shows it) | 2.788M H800 GPU hours; $5.576M **assuming $2 per GPU hour**, official training run only, excluding prior research and ablations | DSV3 abstract p.1; §1 and Table 1 p.5 | Yes, with all caveats | "2.788M GPU hours for the final run, at an assumed $2 an hour. Research not included." | "最终一次训练 278.8 万 GPU 小时，按每小时 2 美元估算。前期研究不算在内。" |
| A19 | Pretraining data | 14.8T tokens | DSV3 abstract p.1 | Yes | "14.8 trillion training tokens." | "14.8 万亿个训练 token。" |
| A20 | Hugging Face size is 685B, not 671B | 685B = 671B main model + 14B Multi-Token Prediction module | DSGH README | Yes | Say 671B. If someone shows 685B: "the extra 14B is a training add-on." | 说 6710 亿。 |

### B. Other MoE models (only if the pilot shows the "everyone does it" table)

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Kimi K2 | 1T total ("1.04T" in Table 2), 32B activated (32.6B in Table 2), 384 experts, 8 per token, 1 shared, 61 layers | K2 abstract and Table 2; L14 p.9; PBC p.12 (61 layers, 384 experts) | Yes | "Kimi K2: 1 trillion parameters, 32B per token, 384 experts." | "Kimi K2：1 万亿参数，每 token 320 亿，384 个专家。" |
| B2 | Qwen3-235B-A22B | 235B / 22B, 128 experts, 8 activated, 94 layers, **no shared expert** | Q3 Table 2; L14 p.9; PBC p.12 | Yes | "Qwen3: 235B, 22B per token, 8 of 128." | "Qwen3：2350 亿，每 token 220 亿，128 选 8。" |
| B3 | Llama 4 Maverick | 400B total (PBC writes 402B), 17B active, 128 routed experts; each token goes to the shared expert + 1 routed | L4 blog; L14 p.9; PBC p.3 | Yes | "Llama 4 Maverick: 400B, 17B per token, 1 of 128 plus a shared expert." | "Llama 4 Maverick：4000 亿，每 token 170 亿，128 选 1，外加共享专家。" |
| B4 | Mixtral 8x7B | 8 experts, top-2; **47B** total, 13B active (L14 p.9 says 45B) | MIX abstract | Yes. **CONFLICT** with L14 p.9; use 47B | "Mixtral 8x7B: 47B, not 56B. Experts share everything outside the FFN." | "Mixtral 8x7B 是 470 亿，不是 560 亿。" |
| B5 | Dense vs MoE comparison (lecture estimate, FP8) | Llama3-70B: 70B all active, FFN 79.8%. Qwen3-235B: 22B active (9.4%), FFN 96.4%. MoE has 3.4x the parameters but activates 0.3x. | L14 p.7 | Lecture only (arithmetic checks out: 235/70 = 3.36, 22/70 = 0.31) | "3.4 times the weights, a third of the work per token." | "参数是 3.4 倍，每个 token 的活儿只有三分之一。" |
| B6 | Activated counts include attention, not only experts | Qwen3 "Activated 22B" includes attention 6.7B and embedding 0.6B | L14 p.7 | Lecture only | "37B is everything a token touches, attention included." | "370 亿包括注意力等所有部分，不只是专家。" |
| B7 | Trend | 2025 models have more than 100 experts and higher sparsity; activated parameters grow slower than total | L14 p.9 | Lecture only | "Models get bigger; what each token touches barely grows." | "模型越来越大，每个 token 用到的却没怎么涨。" |

### C. History

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | The 1991 paper | "Adaptive Mixtures of Local Experts", Robert A. Jacobs, Michael I. Jordan, Steven J. Nowlan, Geoffrey E. Hinton. *Neural Computation* 3(1):79-87, Feb 1991 | XREF91 | Yes | "1991: Jacobs, Jordan, Nowlan and Hinton." | "1991 年，Jacobs、Jordan、Nowlan 和 Hinton 的论文。" |
| C2 | 2017: sparse and huge | Sparsely-Gated MoE layer, "up to thousands of feed-forward sub-networks", up to 137B parameters, between LSTM layers. Authors: Shazeer, Mirhoseini, Maziarz, Davis, Le, Hinton, Dean (Google) | SHZ17 abstract | Yes | "2017: a Google team makes it sparse: thousands of experts, a few per input." | "2017 年，Google 团队把它做成稀疏的：成千上万个专家，每次只用几个。" |
| C3 | Fine-grained + shared experts | Introduced in DeepSeekMoE (Jan 2024): split into more, smaller experts, and isolate some as shared. DeepSeek-V3 uses this architecture. | DSMOE abstract; DSV3 §2.1.2 p.8 | Yes. L14 p.6 credits "DeepSeek V3" (wrong) | "2024: DeepSeek splits experts finer, many small ones and one shared." | "2024 年，DeepSeek 把专家切得更细：很多小专家，加一个共享专家。" |

### D. MoE mechanics from the lecture (training and serving)

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | An expert is a smaller FFN, and MoE replaces the FFN | E_i(x) = W_down(SiLU(W_gate x) * (W_up x)); output y = sum of p_i E_i(x) over the top-K | L14 p.10, p.31; PBC §II-A p.2 | Yes | "Each expert is a small feed-forward block. The router mixes the 8 answers." | "每个专家是一个小前馈网络，路由器把 8 份结果按权重加起来。" |
| D2 | Top-K is not smooth | Unselected experts get zero gradient | L14 pp.11-14 | Yes (standard) | "Experts that aren't picked don't learn on that token." | "没被选中的专家，这一轮学不到东西。" |
| D3 | Without balancing | Slide: "Most experts are never trained"; "extremely sensitive to initial value" | L14 p.15 | Lecture only. It describes naive top-K without balancing, **not** trained DeepSeek-V3 | "Without a balancing rule, a few experts hog the work and others barely learn." | "不加均衡，少数专家包揽一切，其余的几乎学不到。" |
| D4 | Expert parallelism costs | Experts on different GPUs means all-to-all traffic + imbalanced GPUs | L14 pp.21-23 | Yes | "Tokens have to travel to their experts' GPUs, and back." | "token 得跑到专家所在的卡上，再跑回来。" |
| D5 | All-to-all share grows with nodes (one small model) | All2All 15.3% (1 node), 62.5% (2), 70.2% (4), 76.0% (8) | L14 p.23 (cites arXiv 2404.05019 = ScMoE, Cai et al.; the slide's "ASPLOS'25" venue is not on arXiv) | Lecture only; venue unverified | Avoid in the pilot, or say "in one small test model". | 试播集不用。 |
| D6 | Real systems separate attention and experts | MegaScale-Infer: disaggregated attention / FFN, ping-pong pipeline | L14 pp.33-35 | Lecture only | (season 2 material) | (第二季素材) |

### E. Patterns behind Chaos (the lab's paper)

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | Title | "Patterns behind Chaos: Forecasting Data Movement for Efficient Large-Scale MoE LLM Inference" | PBC p.1 | Yes | Full title on the paper prop; spoken: "Patterns behind Chaos". | 道具纸上用英文原标题；口播"混沌背后的规律"（意译，屏幕上同时出现原标题）。 |
| E2 | Award | One of **two** Best Paper Awards at ISCA 2026 (53rd ISCA, Raleigh NC, 27 Jun - 1 Jul 2026). The other: "Cerberus" (Kim et al.). | SIGARCH; PBC p.1 footnote (accepted to ISCA 2026); LAB | Yes | "Best Paper Award, ISCA 2026." | "ISCA 2026 最佳论文奖。" |
| E3 | Authors and affiliations | Zhongkai Yu (lead), Yue Guan, Zhengding Hu, Yufei Ding (UCSD); Zihao Yu (Indiana University Bloomington); Chenyang Zhou (Columbia); Shuyi Pei, Yangwook Kang (Samsung Semiconductor); Po-An Tsai (NVIDIA) | PBC p.1 | Yes | "Led by Zhongkai Yu, with coauthors at IU Bloomington, Columbia, Samsung and NVIDIA." | "第一作者 Zhongkai Yu，合作者来自 IU Bloomington、哥伦比亚大学、三星半导体和 NVIDIA。" |
| E4 | Models profiled | DeepSeek V3 (671B), Llama4-Maverick-128E (402B), Qwen3-235B, Kimi K2 (1000B). The abstract says "200B-1000B"; the intro says "235B to 1000B". | PBC abstract p.1; p.2; §III p.3 | Yes (see trap T16 on checkpoints) | "Four of the largest open MoE models, 235B to 1 trillion parameters." | "四个最大的开源 MoE 模型，2350 亿到 1 万亿参数。" |
| E5 | Requests | "over 24,000 requests"; ">2000 GPU hours"; traces >150 GB JSON; ">70,000 expert selection traces" | PBC abstract p.1; p.2; §III p.3 | Yes | "Over 24,000 requests. Every expert choice, every layer, every token, logged." | "超过 24000 条请求，每个 token、每一层选了哪个专家，全部记下来。" |
| E6 | Traces are public | Hugging Face dataset `core12345/MoE_expert_selection_trace` (auto-gated) | PBC abstract; HF | Yes | "The traces are public." | "数据已公开。" |
| E7 | The paper's own framing | "random expert selection mechanism" (abstract); conclusion: "structured patterns underlying seemingly random data movement" (p.13) | PBC p.1, p.13 | Yes | "It looks random. It isn't." | "看起来是随机的，其实不是。" |
| E8 | Data movement is the bottleneck | Exceeds 50% of execution time even for Mixtral 8x7B on 2-4 GPUs (cited from prior work); for DeepSeek-V3, MoE data movement is 60-90% of latency **in the paper's model** of three serving setups (4K sequence) | PBC p.1; Fig. 2 and §II-B p.2-3 | Yes, but **modeled** | "Moving data, not math, eats most of the time." (No percentage, or "60-90% in our model") | "最耗时的不是计算，而是搬数据。" |
| E9 | Six insights | Six insights, used in two case studies | PBC abstract; pp.5-7 | Yes | "Five patterns, six design rules." | "五个规律，六条设计原则。" |
| E10 | **6.6x** | See section 2 | PBC abstract; §I p.2; §V-C/D p.11 | Yes | see §2 | see §2 |
| E11 | **1.25x** | See section 2 | PBC abstract; §VI p.12-13; Fig. 17 | Yes | see §2 | see §2 |
| E12 | Hardware cost of the change | Total area and power overhead under 0.04% | PBC §V-G p.12, Table II | Yes | "The hardware change: under 0.04% of the chip." | "硬件改动不到芯片的 0.04%。" |
| E13 | Simulator fidelity | Event-driven simulator, validated against an 8xH100 DGX, error within 5% | PBC §V-A/B p.9-10 | Yes | (fine print) "Simulated; simulator checked against real H100s." | （小字）"模拟结果；模拟器已用真实 H100 校准。" |
| E14 | Hop reduction | Allo+Pred cuts cross-die hops by over 213x | PBC §V-D p.11 | Yes | "213 times fewer hops between dies." | "芯片之间的跳数少了 213 倍以上。" |
| E15 | Lecture link | L14 p.28 (Zhongkai's own slide) explains DeepSeek's 4-node limit as "the square patterns we observed in our paper" | L14 p.28 | Yes (verbatim slide text) | On-screen quote allowed, attributed "L14 slides, Zhongkai Yu". | 可作为屏幕引语，注明出自 Zhongkai Yu 的 L14 课件。 |

### F. Lab / people

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Who taught L14 | Zhongkai Yu, PhD student supervised by Prof. Yufei Ding. The slide (written for the course) says "second-year"; do not repeat the year. | L14 p.2 | Yes | "Zhongkai Yu, PhD student in our lab, who taught this lecture and led the paper." | "我们组的博士生 Zhongkai Yu，这节课是他讲的，论文也是他一作。" |
| F2 | His research focus | Wafer-scale and memory-centric architecture, accelerating MoE LLMs; AI-aided chip design | L14 p.2 | Yes | (fine print, if needed) | （需要时作小字） |
| F3 | The lab's earlier Best Paper post | "4 MoE models (200B-1000B), 24,000+ requests. Guided by the insights: 6.6x average speedup on wafer-scale GPUs, up to 1.25x on today's GPUs." | LAB build.py lines 30-31 | Yes, consistent with PBC | Reuse this wording; the pilot adds the qualifiers in §2. | 同左。 |
| F4 | v2 comic (16 s) | Tokens jam the links between dies (random expert choice); a magnifying-glass detective finds the pattern; hot experts move; traffic flows; "6.6x" + ISCA 2026 Best Paper banner. Rejected as the *launch* post only because it was about one paper, and kept for a Best Paper post. | VERSIONS.md v2 | Yes | The twist may call back to it. | 反转段可以呼应 v2。 |

---

## 2. Exact wording for the paper's results

### 2a. The 6.6x

**What it is.** In **simulation** of a **future wafer-scale GPU**, MoE layers in the **decode stage** reach **6.6x the
throughput, averaged** over four models. The comparison is against a baseline wafer that runs as one big GPU and ignores
where each expert's weights live. The gain comes from two things:
- a placement-aware task allocator (Insight 3)
- a predictor that copies soon-needed experts into each die's local memory (Insights 1-2)

Both run on small hardware additions: a two-level command processor and a prediction unit in the die-to-die
controller.

- Abstract (p.1): "On wafer-scale GPUs, lightweight architectural modifications guided by our insights yield a 6.6x
  average speedup across four 200B-1000B models."
- §I (p.2): "achieving an average 6.6x speedup in MoE serving throughput on wafer-scale GPUs."
- §V-D (p.11): Allo+Pred "performance improvement is only 6.63x over baseline". The word "only" is used there because
  hops drop 213x.
- Per model (p.11): DeepSeek 7.0x, Kimi 8.2x, Llama 7.3x, Qwen 4.1x. Per layout: 6.0x on a Dojo-like 5x5 mesh, 7.5x on
  a TSMC-SoW-like 8x3 mesh (p.11).
- Setup (pp.9-10):
  - Hardware: H100-like dies (1,000 TFLOPS FP16, 80 GB HBM, 3.35 TB/s local, 1.7 TB/s die-to-die).
  - Batch sizes: 4096 / 8192 / 16384.
  - Traces: real traces from more than 24,000 requests per model (MMLU, MMLU-Pro (CH), ChineseSimpleQA,
    LiveCodeBench), collected with SGLang on 8xH100 and 8xH200.
- Honesty notes:
  - The plain EP placement (with the same new hardware) already gets a large part of the gain. Their advantage over EP
    appears at large batch: 1.44x at batch 16,384 (p.11).
  - The paper's "Models and Workloads" sentence (p.10) names only Qwen3 and DeepSeek V3, but Figure 12 and the abstract
    cover all four models. Say "four models".

**Say (EN):** "6.6x MoE throughput on average, in simulation of a future wafer-scale GPU."
Fine print: "Simulated, decode-stage MoE layers, 4 models; vs. a wafer that treats every die alike. Yu et al., ISCA 2026."

**Say (ZH):** "在模拟的未来晶圆级 GPU 上，MoE 层吞吐平均提升 6.6 倍。"
小字："模拟结果；解码阶段 MoE 层；4 个模型；对比把所有 die 一视同仁的基线。Yu et al., ISCA 2026。"

**Never:**
- "6.6x faster AI"
- "DeepSeek runs 6.6x faster"
- "6.6x faster on GPUs"
- "6.6x speedup" with no "simulated" or "wafer-scale"
- "up to 10.5x" (a single bar in Fig. 12; not the paper's headline)
- "a wafer-scale GPU we built" (nothing was built)

### 2b. The 1.25x

**What it is.** On **today's hardware**: **one 8xH100 server**, **Qwen3-235B**, SGLang with the DeepEP backend. The
prefill stage's expert statistics are used to place experts for decoding (Insight 1). The metric is **MoE computation
time only**: the three expert linear layers, excluding attention, all-to-all and top-k.
- Remap reaches **1.25x at batch 4K** (Fig. 17, p.13). That is the "up to".
- Averaged over batch sizes, the gains are +15.5% (Remap) and +12.5% (Dup) over the default placement (p.13).
- Both are within 10% of an oracle placement and more than 2x better than the worst placement.
- Datasets: MMLU and Global-MMLU.
- The artifact appendix summarizes the result as "about 5-25%" (p.14).
- The authors *expect* larger gains at larger expert-parallel scales. That is an expectation, not a result.

**Say (EN):** "On today's GPUs: up to 1.25x faster MoE compute, just by placing experts using what the prompt already
revealed."
Fine print: "Qwen3-235B, 8xH100, MoE compute time only; 15.5% on average."

**Say (ZH):** "在现有 GPU 上：只靠提前摆好专家的位置，MoE 计算最多快 1.25 倍。"
小字："Qwen3-235B，8 张 H100，仅统计 MoE 计算时间；平均提升 15.5%。"

**Never:**
- "1.25x faster inference" or "end to end"
- "on all four models" (only Qwen3-235B)
- "on a cluster" (a single 8-GPU server)

### 2c. Models and requests

- "Four MoE models: DeepSeek-V3, Kimi K2, Llama 4 Maverick and Qwen3-235B, from 235B to 1 trillion parameters." Or the
  abstract's "200B-1000B" (the lab's post uses this).
- "Over 24,000 requests." The paper also says "more than 24,000" (§III p.3) and "over 24,000 requests per model" for the
  evaluation traces (p.10). Never "24,000 users" or "24,000 conversations".
- ZH: "四个模型：DeepSeek-V3、Kimi K2、Llama 4 Maverick、Qwen3-235B，2350 亿到 1 万亿参数；超过 24000 条请求。"

### 2d. One-card version for the end slate

EN:
> Patterns behind Chaos. Yu, Guan, Yu, Zhou, Hu, Pei, Kang, Ding, Tsai. ISCA 2026 Best Paper.
> 4 MoE models, 24,000+ requests. 6.6x MoE throughput on a simulated wafer-scale GPU; up to 1.25x MoE compute on 8xH100.
> arxiv.org/abs/2510.05497

ZH:
> Patterns behind Chaos，ISCA 2026 最佳论文。4 个 MoE 模型，24000+ 条请求。模拟晶圆级 GPU 上 MoE 吞吐 6.6 倍；8 张 H100 上 MoE 计算最多 1.25 倍。

---

## 3. The five observations

Setup in one line: the paper logged which experts every token picked in every layer. It then asked whether the choices
are related **over time** (Ob1-Ob3, "temporal") or **across the machine at one moment** (Ob4-Ob5, "spatial") (PBC
§III-A p.3; L14 p.38).

| Ob | Plain words (EN) | 白话 (ZH) | Key number (source) | Visual? | Desk-miniature idea |
| --- | --- | --- | --- | --- | --- |
| **Ob1** Layer level | Which expert you used in this layer hints at which one you'll use in the next. The hint differs by model and by layer. | 这一层选了谁，能猜出下一层大概选谁；但不同模型、不同层，规律不一样。 | Top 20% of next-layer candidates cover 50% / 65% / 77% / 56% of the probability for DeepSeek-V3 / Qwen3 / Llama 4 / Kimi K2 (random would be about 20%) (PBC p.4, Fig. 4) | Medium. The heatmap has white dots and bright vertical lines. | Two rows of tiles (layer N, N+1) on the walnut desk, with red threads between them. A few threads are thick. |
| **Ob2** Token level | The next word often goes back to the same expert, mostly in deeper layers. | 下一个 token 常常回头找同一个专家，深层尤其明显。 | Bright **diagonal** in deep layers (17, 43), absent in shallow ones (1, 3), in all models. Top 20% of candidates cover 47% / 62% / 80% / 53% (PBC p.4, Fig. 5) | **High.** A diagonal line appears out of noise. | A mahjong-tile grid where a diagonal of tiles lights up under the lamp, one by one. |
| **Ob3** Prefill-decode | The way the model reads your prompt predicts how it will write the answer. | 模型"读题"时选的专家，能预测它"答题"时选谁。 | Spearman mostly 0.7 or more (strong). Top-5 prefill experts cover about 60% of the top-5 decode experts; 75% for top-10, 90% for top-20 (PBC p.4-5, Figs. 6-7) | Medium. Two prints that look alike. | Two receipts from the thermal printer, "READING" and "WRITING", laid side by side. The red pen circles the same tiles on both. **This is the basis of the 1.25x.** |
| **Ob4** Single expert | A few experts are wildly popular. Which ones depends on the subject, and even more on the language. | 少数专家忙到爆；谁最忙，随科目变，换个语言变得更厉害。 | Some experts are picked over 16x more often than average (Llama 4, layer 7). Across 57 MMLU subjects, some experts are hot everywhere and the rest vary. Same questions in Chinese: 5-6 experts stay hot, but **only two** overlap with English's hot set (PBC p.5-6, Fig. 8) | **Highest.** | Coin stacks on a few tiles, towering over the rest. Then the language swap: the EN cut and the ZH cut light *different* tiles. This works as a bilingual gag. |
| **Ob5** Expert pairs | Some experts are almost always picked together. | 有些专家总是"成对出诊"。 | Pairs are 20-40x more likely than random. The top 10% of pairs carry 60-80% of co-activations. DeepSeek's map shows **bright squares** from its at-most-4-nodes rule (PBC p.6, Fig. 9; L14 p.28) | **High.** The squares are the money shot. | Tiles tied in pairs with paper strips; pull back to reveal square blocks on a printed grid. |

Insights, for the voice-over if needed (PBC pp.5-7; L14 pp.43, 46):
1. Use the prefill to predict decode (Ob3).
2. Prefetch and cache experts across the memory levels (Ob1, Ob2).
3. Hand out work knowing where experts sit (Ob4, Ob5).
4. Copy or spread hot experts (Ob4).
5. Split up pairs that are always picked together (Ob5).
6. Use task and language to place experts before serving (Ob4).

Case study 1 (6.6x) uses Insights 3, 1 and 2. Case study 2 (1.25x) uses Insight 1 (PBC p.13).

Best on screen in under 15 seconds: **Ob4** (stacks + language flip), then **Ob5** (squares), with **Ob2** (diagonal) as
the reveal shot. Ob3 is the one to name if the film mentions the 1.25x.

---

## 4. What an MoE "expert" is, and is not

**Is:**
- A small feed-forward network (FFN) inside one layer (L14 p.10, p.31; PBC §II-A p.2).
- In DeepSeek-V3, each of 58 MoE layers has 256 routed experts plus 1 shared expert (DSV3 §4.2 p.22).
- A small learned router scores every routed expert **for each token, in each layer** and keeps the top 8. The token's
  output is the weighted sum of those 8 experts plus the shared one (DSV3 §2.1.2).
- What an expert is "good at" is whatever training made it. It is statistical, and nobody assigns it.

**Is not:**
- **Not a topic specialist with a job title.** No "math expert" or "poetry expert".
  - Mixtral's routing analysis: "Surprisingly, we do not observe obvious patterns in the assignment of experts based on
    the topic." Expert use was "very similar" for ArXiv, PubMed and PhilPapers text. What they did see was syntax: Python
    `self`, English "Question", and code indentation tokens routed to the same experts (MIX §5).
  - The lab's own Ob4 is the nuance: *which* experts are busy shifts with subject and language, but several stay hot
    across all subjects. That is a statistical preference, not a department (PBC p.6).
  - DeepSeek reports "greater expert specialization patterns" across Pile domains for its balancing method (DSV3 §4.5.3
    p.27). Again, these are load patterns, not labels.
- **Not chosen once per question.** The choice is made per token, in every layer: 58 separate picks per token in
  DeepSeek-V3.
- **Not 8 experts in the whole model.** It is 8 per layer. Expert #17 in layer 3 has nothing to do with expert #17 in
  layer 40.
- **Not a separate model, agent or chatbot.** You cannot talk to an expert, and experts do not "discuss".
- **Not "the best" expert for the job.** The router picks the highest-scoring experts. In DeepSeek-V3 a balancing bias
  also nudges that choice (A13).
- **Not human doctors.** If the film uses doors, rooms or tiles, number them (#0-#255) and never label them by subject.

A safe gag that teaches this: the cat sticks a note "MATH?" on a tile. The tile gets picked for a comma, a Chinese
character and a line of Python. The cat crosses out the note.

---

## 5. Traps and forbidden phrasings

**Numbers and slides**
- **T1.** "36B active" (L14 p.9) does not match the primary source. Use **37B** (DSV3 abstract; L07 p.32).
- **T2.** "37B at a time" is wrong. Say **"per token"**. A batch of tokens can use all 256 experts at once. The working
  title "671B parameters, 37B at a time" becomes **"671B parameters, 37B per token"** /
  《6710 亿参数，每个 token 只用 370 亿》.
- **T3.** "Each word sees 8 experts" is wrong twice:
  - A token is not a word. In ZH say "token" or "词元", not "每个字/词".
  - It is 8 **per layer**, plus 1 shared expert.
- **T4.** "256 experts in DeepSeek" needs "per layer". The model has 14,848 routed experts in total (derived).
- **T5.** "Mixtral 45B" (L14 p.9) does not match the primary source; Mixtral's own abstract says 47B. "8x7B = 56B" is also wrong.
- **T6.** "Llama 4 Maverick 400B vs 402B": the Meta blog says 400B and PBC says 402B. Say "400B".
- **T7.** **4,426,165,368 combinations** (PBC p.2) is a misprint. That number is C(64,8). C(256,8) is about
  4.1 x 10^14. Never quote the paper's figure; use "more than 400 trillion" as our arithmetic, or skip it.
- **T8.** "FFN is over 80% of the parameters" (L14 p.7) is slightly off: the dense example is 79.8%. Say "about 80% or
  more".
- **T9.** "60-90% of latency is MoE data movement" is a modeled estimate (PBC Fig. 2). Either say "in our model" or
  don't give a number.
- **T10.** "Most experts are never trained" (L14 p.15) is about naive top-K without balancing. It is not true of
  DeepSeek-V3, which drops no tokens and keeps good balance (DSV3 p.9).
- **T11.** "DeepSeek-V3 has no auxiliary loss" is wrong. It keeps a tiny sequence-wise balance loss (alpha = 0.0001).
  Say "almost no".
- **T12.** "Trained for $5.6M" without caveats is not allowed. Always add: assumed $2/GPU-hour, final run only, excluding
  research and ablations. Also never say MoE alone explains DeepSeek's cost.
- **T13.** "DeepSeek-V3, released in 2025": the report is from Dec 2024 (PBC loosely groups all four as "released in
  2025"). Don't date it on screen.
- **T14.** "685B": that is the Hugging Face size including the 14B MTP module. Use 671B.

**Slide-citation errors (don't copy them into the film's source cards)**
- **T15.**
  - L14 p.26-27 cite arXiv 2401.08383 for the DeepSeek-V3 serving setup. That paper is Yao et al., "Exploiting
    Inter-Layer Expert Affinity...". Cite DSV3 §3.4 instead.
  - "EBLP" on p.27 should be **EPLB** (Expert Parallelism Load Balancer, deepseek-ai/EPLB). The 12-experts example
    comes from its README.
  - L14 p.23's "ASPLOS'25" for arXiv 2404.05019 (ScMoE) is unverified.
  - L14 p.38-45 links read "htthttps://".

**The lab's paper**
- **T16.** Which checkpoints? The paper says DeepSeek V3 and Kimi K2; the Hugging Face trace card says DeepSeek-R1 and
  Kimi-K2-Thinking (same architectures). On screen, use the paper's names. If the exact checkpoint matters, ask
  Zhongkai.
- **T17.** Never say "6.6x faster" without "simulated / future wafer-scale GPU", and never say "1.25x" without "MoE
  compute, one 8xH100 server, Qwen3-235B" (§2).
- **T18.** Don't call it "the ISCA Best Paper" or "the best paper of the year". It was **one of two** Best Paper Awards
  at ISCA 2026. "Won a Best Paper Award at ISCA 2026" / "获 ISCA 2026 最佳论文奖" is fine. Avoid unsourced superlatives
  about ISCA ("the Oscars of chips").
- **T19.** "Expert choice is random" is false as a statement of fact. Say "looks random" / "看起来随机". "Chaos" is the
  paper's title word; the claim is that there is structure behind it.
- **T20.** "The paper predicts exactly which expert comes next" is an overclaim. It forecasts **likely popular** experts
  to pre-copy, and predicts decode hot spots from prefill.
- **T21.** Don't call DeepSeek's 4-node rule "adjacent nodes" (PBC p.6's wording). DSV3 says "at most 4 nodes" chosen
  by score.
- **T22.** "Wafer-scale GPU" is a future design studied in simulation: Dojo-like and TSMC-SoW-like layouts with H100-like
  dies. Nobody built one for this paper.

**Expert metaphor**
- **T23.** No subject labels on experts. No "the math expert", "the Chinese expert", "专家分科".
- **T24.** "Only 5.5% of the brain works" echoes the 10%-brain myth and implies the rest is idle. Say "5.5% of the
  weights, per token".

**History and people**
- **T25.** "Hinton invented MoE in 1991" (L14 p.6) over-credits one author. Say "Jacobs, Jordan, Nowlan and Hinton
  (1991)".
- **T26.** "Google introduced MoE into neural networks in 2017" (L14 p.6) does not match the primary source: 1991 was already neural networks.
  Say "2017: made sparse and huge (up to 137B parameters)".
- **T27.** "DeepSeek-V3 introduced fine-grained experts" (L14 p.6) is wrong. They were introduced in DeepSeekMoE
  (Jan 2024).
- **T28.** No jokes about any real person. That covers Hinton, the DeepSeek team, coauthors and Zhongkai. Zhongkai
  appears with his own verbatim slide text only (E15).
- **T29.** "Zhongkai, second-year PhD student" is dated slide text. Say "PhD student in our lab".
- **T30.** Prof. Ding's line is `[PLACEHOLDER - needs Prof. Ding's approval]`. Never write it as a quote she said.
- **T31.** No model names of AI tools in captions or credits (house rule). Name the models *studied* (DeepSeek-V3 etc.)
  only.

---

## 6. The 1991 paper

**Robert A. Jacobs, Michael I. Jordan, Steven J. Nowlan, Geoffrey E. Hinton**, "Adaptive Mixtures of Local Experts",
*Neural Computation* 3(1):79-87, February 1991. DOI 10.1162/neco.1991.3.1.79 (Crossref).

The idea, in the paper's terms (per the Semantic Scholar summary): a system of separate networks, each learning a
subset of the training cases, with a gating network that decides which network handles each case.

- EN: "The idea is from 1991: Jacobs, Jordan, Nowlan and Hinton."
- ZH: "这个想法来自 1991 年，Jacobs、Jordan、Nowlan 与 Hinton 的论文。"

Side fact (verified, optional): Hinton is also an author of the 2017 sparsely-gated MoE paper (SHZ17). Present it as a
plain fact, not as a joke.
