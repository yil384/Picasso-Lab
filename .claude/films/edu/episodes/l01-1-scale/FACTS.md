# Fact brief: L01-1 "More is different" (CSE 291P Lecture 1, slides 9-11, "Background")

The rule for this episode: every number, title, name and quote on screen, in the voice-over or in the post comes from
this brief, worded the way it is worded here. If a line in the script needs a fact that is not here, it is not cleared.

Checked on 2026-10-04 against the primary sources below. Page numbers are **PDF page indices** of the cited files (for
L01 the PDF page equals the slide number). Local copies of the papers are in the session scratchpad only (not in the
repo; the course PDFs stay in the git-ignored `course/`).

## Source key

| Key | Source | Where |
| --- | --- | --- |
| **L01** | CSE 291P "LLM System Optimization", Lecture 1 "Introduction (LLM API Usage + Tokenization)", Yufei Ding, UC San Diego. Slides 9 (Emergence), 10 (Industrialization), 11 (Scaling law); slide 4 (course objectives) | `course/L01.pdf`, `course/L01.txt` |
| **CS336** | Stanford CS336 "Language Modeling from Scratch", Spring 2025 (instructors Tatsunori Hashimoto and Percy Liang). Lecture 1 "Overview, tokenization (Percy)", Tue 1 Apr 2025. Executable lecture `lecture_01.py`, sections "The industrialization of language models", "More is different", "The bitter lesson" (lines 68-111 of the current file). Present since the initial commit 6bb0319 by Percy Liang, 2025-04-01. Not in the 2024 edition's lecture 1 | github.com/stanford-cs336/spring2025-lectures/blob/main/lecture_01.py ; cs336.stanford.edu/spring2025/ |
| **AND72** | P. W. Anderson, "More Is Different: Broken symmetry and the nature of the hierarchical structure of science", *Science* 177(4047): 393-396, 4 Aug 1972, doi:10.1126/science.177.4047.393 (Crossref checked) | JSTOR scan, e.g. sites.ualberta.ca/~fm3/courses/Camerino_Lectures/science177_393_1972_anderson.pdf (PDF p.2 = journal p.393) |
| **AND01** | P. W. Anderson, "More Is Different - One More Time", chapter 1 in *More is Different: Fifty Years of Condensed Matter Physics* (Princeton UP, 2001), p.1 | marom.net.technion.ac.il/files/2016/07/Anderson-PW-2001a.pdf |
| **NOBEL** | Nobel Prize in Physics 1977, nobelprize.org summary page + Nobel API v2.1 laureate record | nobelprize.org/prizes/physics/1977/summary/ |
| **KOHN** | "Former Chair of UC San Diego Physics Department and Nobel-Prize-Winner Walter Kohn Dies", UC San Diego Today (2016) | today.ucsd.edu (search result summary only) |
| **WEI** | J. Wei, Y. Tay, R. Bommasani, C. Raffel, B. Zoph, S. Borgeaud, D. Yogatama, M. Bosma, D. Zhou, D. Metzler, E. H. Chi, T. Hashimoto, O. Vinyals, P. Liang, J. Dean, W. Fedus, "Emergent Abilities of Large Language Models", *Transactions on Machine Learning Research* (TMLR), 08/2022, OpenReview yzkSU5zdwD; arXiv 2206.07682 v2 (26 Oct 2022) | arxiv.org/abs/2206.07682 |
| **SMK** | R. Schaeffer, B. Miranda, S. Koyejo (Stanford), "Are Emergent Abilities of Large Language Models a Mirage?", NeurIPS 2023 (Outstanding Main Track Paper); arXiv 2304.15004 v2 (22 May 2023) | arxiv.org/abs/2304.15004 ; proceedings.neurips.cc/paper_files/paper/2023/hash/adc98a266f45005c403b8311ca7e8bd7-Abstract-Conference.html |
| **NIPS23** | NeurIPS 2023 press release "NeurIPS Announces Outstanding Paper Awards..." (11 Dec 2023) | media.neurips.cc/Conferences/NeurIPS2023/NeurIPS2023-Press_Release.pdf |
| **KAP** | J. Kaplan, S. McCandlish, T. Henighan, T. B. Brown, B. Chess, R. Child, S. Gray, A. Radford, J. Wu, D. Amodei (OpenAI / Johns Hopkins), "Scaling Laws for Neural Language Models", arXiv 2001.08361 v1, 23 Jan 2020 (preprint) | arxiv.org/abs/2001.08361 |
| **CHIN** | J. Hoffmann, S. Borgeaud, A. Mensch et al. (DeepMind), "Training Compute-Optimal Large Language Models", arXiv 2203.15556 v1, 29 Mar 2022. Published at NeurIPS 2022 under the title "An empirical analysis of compute-optimal large language model training" | arxiv.org/abs/2203.15556 ; proceedings.neurips.cc/paper_files/paper/2022/hash/c1e2faff6f588870935f114ebe04a3e5-Abstract-Conference.html |
| **GPT3** | T. Brown et al., "Language Models are Few-Shot Learners", arXiv 2005.14165: p.8 (300B tokens), Table D.1 p.46 (compute) | arxiv.org/abs/2005.14165 |
| **GPT4** | OpenAI, "GPT-4 Technical Report", arXiv 2303.08774, p.2 | arxiv.org/abs/2303.08774 |
| **IGPT** | L. Ouyang et al., "Training language models to follow instructions with human feedback", arXiv 2203.02155, abstract | arxiv.org/abs/2203.02155 |
| **HB20** | D. Hernandez, T. B. Brown, "Measuring the Algorithmic Efficiency of Neural Networks", arXiv 2005.04305 (8 May 2020), abstract | arxiv.org/abs/2005.04305 |
| **SUT** | R. Sutton, "The Bitter Lesson", 13 Mar 2019 | incompleteideas.net/IncIdeas/BitterLesson.html |
| **SWITCH** | W. Fedus, B. Zoph, N. Shazeer, "Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity", arXiv 2101.03961 (JMLR 2022 = the slide's "Fedus et al. (2022)"), pp.22-23, 26 | arxiv.org/abs/2101.03961 |
| **K2** | Kimi Team, "Kimi K2: Open Agentic Intelligence", arXiv 2507.20534, abstract | arxiv.org/abs/2507.20534 |
| **L3** | Llama Team, Meta, "The Llama 3 Herd of Models", arXiv 2407.21783 v3, pp.1-2 | arxiv.org/abs/2407.21783 |
| **STAR** | OpenAI (authors: OpenAI, SoftBank), "Announcing The Stargate Project", 21 Jan 2025 | openai.com/index/announcing-the-stargate-project/ (read via web.archive.org snapshot of 2025-01-22) |
| **CNN** | CNN, "Stargate: Trump announces a $500 billion AI infrastructure investment in the US", 21 Jan 2025 | cnn.com/2025/01/21/tech/openai-oracle-softbank-trump-ai-investment (search summary only) |
| **MUSK** | Elon Musk on X, 2 Sep 2024: "This weekend, the @xAI team brought our Colossus 100k H100 training cluster online. From start to finish, it was done in 122 days. ... it will double in size to 200k (50k H200s) in a few months." | x.com/elonmusk/status/1830650370336473253 (text via search index; X not fetchable) |
| **NV** | NVIDIA newsroom, "NVIDIA Ethernet Networking Accelerates World's Largest AI Supercomputer, Built by xAI", 28 Oct 2024 | nvidianews.nvidia.com/news/spectrum-x-ethernet-networking-xai-colossus |
| **XG3** | xAI, "Grok 3 Beta - The Age of Reasoning Agents", 19 Feb 2025 | x.ai/news/grok-3 (live page + web.archive.org 2025-03-11) |
| **XCOL** | xAI, "Colossus" page | x.ai/colossus (web.archive.org 2025-03-12) |
| **WIRED** | W. Knight, "OpenAI's CEO Says the Age of Giant AI Models Is Already Over", WIRED, 17 Apr 2023 | wired.com (web.archive.org 2023-04-19) |
| **AIX** | Stanford HAI, "Inside the New AI Index: Expensive New Models, Targeted Investments, and More", 15 Apr 2024 (on the 2024 AI Index Report) | hai.stanford.edu/news/inside-new-ai-index-expensive-new-models-targeted-investments-and-more |
| **HPC** | HPCwire, "The Generative AI Future Is Now, Nvidia's Huang Says", 19 Mar 2024 | hpcwire.com (web.archive.org) |
| **BARON** | Transcript of Elon Musk at the 32nd Baron Investment Conference, 14 Nov 2025 (third-party transcript, The Singju Post) | singjupost.com |

Verified column: **Yes** = read in the primary source today. **Derived** = our own arithmetic or inference on verified
facts; if it goes on screen it is presented as ours ("that's about...", "by our count"). **Claim** = a statement by a
company or its CEO, reported, with no technical disclosure behind it. **Secondary** = only in press or third-party
summaries. **Unverified** = could not be checked. **CONFLICT** = sources disagree, or the slide disagrees with the
source; use the fix given.

---

## 0. Where slides 9-11 come from (credit this)

Slides 9-11 adapt the opening of Stanford CS336 Lecture 1 (Spring 2025), largely word for word:
- Slide 9 "Building small language models (<1B) might not be representative of large models" = CS336: "But building
  small language models (<1B parameters in this class) might not be representative of large language models." The "<1B"
  is **CS336's class budget**, not a known emergence threshold. "Emergence of behavior with scale [Wei+ 2022]" is also
  CS336's line, and the figure is WEI Fig. 2.
- Slide 10 title "The industrialization of language models" = the CS336 section title. CS336's list there: "GPT-4
  supposedly has 1.8T parameters", "GPT-4 supposedly cost $100M to train", "xAI builds cluster with 200,000 H100s to train
  Grok", "Stargate (OpenAI, NVIDIA, Oracle) invests $500B over 4 years". Note CS336's own "supposedly".
- Slide 11 "Wrong interpretation: scale is all that matters, algorithms don't matter." / "Right interpretation: algorithms
  that scale is what matters." / "accuracy = efficiency x resources" / "In fact, efficiency is way more important at
  larger scale (can't afford to be wasteful)." / "Framing: what is the best model one can build given a certain compute
  and data budget?" / "In other words, maximize efficiency!" are CS336 verbatim, under the CS336 heading **"The bitter
  lesson"** (i.e. a reading of SUT). The Chinchilla bullet is L01's own addition.

So the film credits the slogan to CS336, and the post credits both: "After Prof. Yufei Ding's CSE 291P Lecture 1, which
draws on Stanford CS336 (Percy Liang, Tatsunori Hashimoto)."

---

## 1. Fact table

### A. Emergence and "More Is Different" (slide 9)

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Anderson's essay | P. W. Anderson, "More Is Different: Broken symmetry and the nature of the hierarchical structure of science", *Science* 177(4047): 393-396, 4 Aug 1972 | AND72 p.393; Crossref | Yes | "In 1972, the physicist Philip Anderson published an essay called 'More Is Different.'" | "1972 年，物理学家菲利普·安德森在《科学》杂志发表了一篇文章，题目就叫《More Is Different》（多者异也）。" |
| A2 | His Nobel | 1977 Nobel Prize in Physics, shared in thirds with Sir Nevill F. Mott and John H. Van Vleck, "for their fundamental theoretical investigations of the electronic structure of magnetic and disordered systems". Affiliation at award: Bell Telephone Laboratories. Lived 1923-12-13 to 2020-03-29 | NOBEL | Yes | "Anderson shared the 1977 Nobel Prize in Physics." | "安德森是 1977 年诺贝尔物理学奖的三位得主之一。" |
| A3 | The Nobel was not for this essay | The prize was for electronic structure of magnetic and disordered systems; the essay is a 1972 opinion piece | NOBEL; AND72 | Yes | (do not link the prize to the essay; say "Nobel laureate" only as a description) | （只说"诺奖得主"，不说"凭这篇文章拿了诺奖"） |
| A4 | The essay began as a 1967 lecture in La Jolla | Footnote: "This article is an expanded version of a Regents' Lecture given in 1967 at the University of California, La Jolla." Anderson later: "In the Spring of 1967 ... I spent a pleasant month at La Jolla with, among others, some old friends from Bell who had been recruited there by Walter Kohn to give a jump-start to the infant physics department. I had an appointment as Regents' lecturer, the only requirement being to give one more or less public lecture." Kohn was a founding physics professor at UC San Diego from 1960 and chaired physics 1961-63 | AND72 p.393 (footnote); AND01 p.1; KOHN | Footnote and AND01: Yes. "That campus is UC San Diego": **Derived** (Kohn's department = UCSD physics) | "It started as a lecture he gave in La Jolla in 1967, at UC San Diego, the campus where this course is taught." Fine print: "Science 177:393, footnote: 'a Regents' Lecture given in 1967 at the University of California, La Jolla.'" | "这篇文章最早是他 1967 年在拉霍亚做的一场讲座，地点就是加州大学圣迭戈分校，也就是开这门课的学校。" 小字同英文脚注。 |
| A5 | What the essay is about | Physics and the hierarchy of the sciences: reductionism does not imply "constructionism"; new properties appear at each level of complexity; broken symmetry. Not about AI or computers learning language | AND72 pp.393-396 | Yes | "He was writing about physics, not AI. About 50 years later, AI researchers borrowed his title." (1972 to 2022 = 50: Derived) | "他写的是物理，不是 AI。大约五十年后，AI 研究者借用了他的标题。" |
| A6 | Verbatim quote, cleared for a card or a respectful silhouette | "The behavior of large and complex aggregates of elementary particles, it turns out, is not to be understood in terms of a simple extrapolation of the properties of a few particles. Instead, at each level of complexity entirely new properties appear" | AND72 p.393 (checked against the scan image, not only OCR) | Yes | Quote exactly, ending with "...entirely new properties appear." Short form allowed: "at each level of complexity entirely new properties appear" | 引文必须标"（我们的译文）"："大量基本粒子组成的复杂集合体，其行为并不能靠简单外推少数粒子的性质来理解。相反，在每一个复杂层级上，都会出现全新的性质。" |
| A7 | Second verbatim quote (optional) | "Psychology is not applied biology, nor is biology applied chemistry." | AND72 p.393 | Yes | As written | "心理学不是应用生物学，生物学也不是应用化学。"（我们的译文） |
| A8 | Anderson on giving that lecture (optional, humanizing) | "I think this was the first time I had ever had such an assignment; I was nervous and worked hard on it." | AND01 p.1 | Yes | Quote exactly; credit "P. W. Anderson, 2001" | "我想那是我第一次接这种任务；我很紧张，下了很大功夫。"（我们的译文） |
| A9 | The emergence paper | Wei et al., "Emergent Abilities of Large Language Models", TMLR 08/2022; 16 authors from Google Research, Stanford, UNC Chapel Hill, DeepMind | WEI p.1 | Yes | "Wei and colleagues, 2022" | "Wei 等人，2022 年" |
| A10 | Their definition | "We consider an ability to be emergent if it is not present in smaller models but is present in larger models." Also: "Emergence is when quantitative changes in a system result in qualitative changes in behavior." (adapted from Steinhardt 2022, "rooted in" Anderson 1972) | WEI p.1 (abstract), p.2 | Yes | "An ability is 'emergent' if small models don't have it and large ones do." | "所谓'涌现能力'：小模型没有，大模型有。" |
| A11 | The figure on slide 9 | WEI Figure 2: eight few-shot tasks, five model families. Panels: (A) Mod. arithmetic, (B) IPA transliterate, (C) Word unscramble, (D) Persian QA [A-D from BIG-Bench, 2-shot], (E) TruthfulQA, (F) Grounded mappings, (G) Multi-task NLU (= MMLU, 57 subjects), (H) Word in context (WiC). Models: LaMDA, GPT-3, Gopher, Chinchilla, PaLM; dashed line = random. Each point is a separate model | WEI p.3-4, Fig. 2 | Yes | "Eight tests, five families of models." | "八项测试，五个模型家族。" |
| A12 | The x-axis | "Model scale (training FLOPs)": the **total** floating-point operations spent on training (not FLOP/s), log scale, 10^18 to 10^24. Appendix figures plot the same against parameters | WEI p.2, p.4 | Yes | "Across the bottom: how much computing went into training." | "横轴：训练总共用了多少次运算。" |
| A13 | Where the jumps happen | Mod. arithmetic: GPT-3 at 2x10^22 FLOPs (13B params), LaMDA at 10^23 (68B). TruthfulQA: only Gopher's largest, 5x10^23 (280B). MMLU: about 10^22 (about 10B) or less = chance; 3-5x10^23 (70B-280B) clearly above. WiC: only PaLM at 2.5x10^24 (540B) | WEI p.3-4 | Yes. "Roughly 10^22 to 10^24" is our summary (Derived) | "Flat at chance, then a jump somewhere between about 10^22 and 10^24 training operations." | "一直在瞎猜水平，训练运算量到了大约 10^22 到 10^24 之间，突然跳起来。" |
| A14 | Wei's own caveat 1: the threshold is not fixed | "the scale at which an ability is first observed to emerge depends on a number of factors and is not an immutable property of the ability" | WEI p.2 | Yes | "Even the authors say the tipping point isn't fixed." | "作者自己也说，这个临界点不是固定的。" |
| A15 | Wei's own caveat 2: algorithms and data move the threshold | 14 BIG-Bench tasks where LaMDA 137B and GPT-3 175B are near random but PaLM 62B is above random, "despite having fewer model parameters and training FLOPs" (possible reasons: better data, architecture). Also cites InstructGPT | WEI p.7 (§5.2 "Beyond scaling") | Yes | "On 14 BIG-Bench tasks, a 62B model got above chance where 137B and 175B models did not: better data and design, not just size." | "在 BIG-Bench 的 14 项任务上，1370 亿和 1750 亿参数的模型还在瞎猜，620 亿的却已经超过瞎猜水平：靠的是更好的数据和设计，不只是个头。" |
| A16 | Supporting: small beats big with better training | "outputs from the 1.3B parameter InstructGPT model are preferred to outputs from the 175B GPT-3, despite having 100x fewer parameters" (human evaluations on their prompt distribution) | IGPT abstract | Yes | Only with "in human ratings" | 必须带"在人工评测里" |

### B. The counterpoint on slide 9 (the honest limit)

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Exact title | "Are Emergent Abilities of Large Language Models **a Mirage**?" The slide says "...an Illusion?" | SMK p.1; NIPS23; NeurIPS proceedings page | Yes. **CONFLICT** with L01 p.9: use "a Mirage?" | "'Are Emergent Abilities of Large Language Models a Mirage?'" | "《大语言模型的涌现能力是海市蜃楼吗？》（原题 ...a Mirage?）" |
| B2 | Authors, venue, award | Rylan Schaeffer, Brando Miranda, Sanmi Koyejo (Computer Science, Stanford). NeurIPS 2023, one of two Outstanding Main Track Papers | SMK p.1; NIPS23 | Yes | "Schaeffer, Miranda and Koyejo, Stanford: one of NeurIPS 2023's two outstanding-paper awards." | "斯坦福的 Schaeffer、Miranda、Koyejo，NeurIPS 2023 杰出论文奖（两篇之一）。" |
| B3 | Main claim | "emergent abilities appear due the researcher's choice of metric rather than due to fundamental changes in model behavior with scale. Specifically, nonlinear or discontinuous metrics produce apparent emergent abilities, whereas linear or continuous metrics produce smooth, continuous, predictable changes in model performance." (original has "due the") | SMK p.1 abstract | Yes | "Change the ruler, and many of those jumps turn into smooth slopes." | "换一把尺子量，很多'突然跳起'就变成了平滑的坡。" |
| B4 | The two culprit metrics | More than 92% of the claimed emergent abilities on BIG-Bench appear under Multiple Choice Grade or Exact String Match | SMK p.2, p.6-7 | Yes | "Over 92% of the claimed jumps on one big benchmark show up under all-or-nothing scoring." | "某大型测试集里，超过 92% 的'涌现'，都出现在'全对才给分'的评分方式下。" |
| B5 | Why all-or-nothing scoring makes a cliff | Their toy model: if each output token is right with probability p, an L-token exact-match answer scores about p^L. Our numbers for a 5-digit answer: p = 0.5 gives 3.1%, 0.7 gives 16.8%, 0.8 gives 32.8%, 0.9 gives 59.0%, 0.99 gives 95.1% | SMK p.4 (formula); numbers ours | Formula Yes; numbers **Derived** | "Get each digit right 90% of the time, and a 5-digit answer is fully right only 59% of the time." | "每一位数字有 90% 的把握，5 位数整题全对也只有 59%。" |
| B6 | Their own limit | "We emphasize that nothing in this paper should be interpreted as claiming that large language models cannot display emergent abilities; rather, our message is that previously claimed emergent abilities ... might likely be a mirage induced by researcher analyses." | SMK p.9 | Yes | "They don't say big models can't surprise us. They say many of the famous jumps were partly about how we score." | "他们没说大模型不会带来惊喜，只是说：不少有名的'跳变'，部分是评分方式造出来的。" |
| B7 | Wei et al. had flagged the metric issue too | Exact match "may disguise compounding incremental improvements as emergence"; cross-entropy loss improves even where accuracy sits at random; but metrics "are at best an incomplete explanation" because classification tasks still jump | WEI p.7 (§5.1) | Yes | "Even the original paper noticed: under the hood, the model was improving the whole time." | "原论文其实也注意到了：分数没动的时候，模型底下一直在变好。" |

The honest framing for the episode: both sides agree the model's underlying loss improves smoothly with scale; they
disagree on how much of the "sudden" jump is in the model versus in the scoring. The slide's point survives either way:
you cannot fully judge a big model by testing small ones.

### C. The industrialization numbers (slide 10)

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | "GPT-5.2, Gemini 3 Pro, Grok-3, Claude 4.5: trillion-parameter scale" | None of these vendors publishes parameter counts. GPT-4 report: "this report contains no further details about the architecture (including model size), hardware, training compute, dataset construction, training method, or similar." Only claims exist: NVIDIA's CEO said GPT-4 "has about 1.8 trillion parameters" (HPC paraphrase, Mar 2024; never confirmed by OpenAI); xAI's CEO: "Grok 3 and 4 are based on a 3 trillion parameter model" (BARON, Nov 2025, third-party transcript) | GPT4 p.2; HPC; BARON | **Unverified** for every named closed model (Claim at best) | "The biggest labs stopped publishing model sizes. Open models you can check have passed a trillion parameters." Do not name the four closed models with a size | "顶级大厂早就不公布参数量了；能查证的开源模型，已经过了一万亿参数。" 不给四个闭源模型配参数 |
| C1b | Verifiable trillion-parameter models | Kimi K2: "32 billion activated parameters and 1 trillion total parameters", pre-trained on 15.5T tokens (2025). Switch-C: 1.6 trillion parameters, 2048 experts (Google, 2021; the slide's "Fedus et al. (2022)") | K2 abstract; SWITCH pp.22-23 | Yes | "Kimi K2: 1 trillion parameters, 32 billion active per token." (links back to the MoE pilot) | "Kimi K2：1 万亿参数，每个 token 激活 320 亿。" |
| C2 | "Training cost: > $100 million" | WIRED: "At the MIT event, Altman was asked if training GPT-4 cost $100 million; he replied, 'It's more than that.'" The same article states GPT-4 training "cost over $100 million". Independent estimates (AI Index 2024): GPT-4 about $78 million, Gemini Ultra about $191 million, as estimated training cost | WIRED (17 Apr 2023); AIX | WIRED: Yes. AIX: Yes for the numbers (method not read: Secondary on "compute only") | Preferred (no person): "Training one frontier model: estimated at well over $100 million." Fine print: "Gemini Ultra, about $191M, Stanford AI Index 2024 estimate." Alternative: "Asked if GPT-4 cost $100 million to train, OpenAI's CEO said: 'It's more than that.' (WIRED, 2023)" | "训练一个顶级模型：估计远超 1 亿美元。" 小字："Gemini Ultra 约 1.91 亿美元，斯坦福 AI Index 2024 估算。" |
| C3 | "Compute: 100,000 H100s (Grok 3)" | xAI's Colossus (Memphis): 100,000 NVIDIA Hopper GPUs, built in 122 days, online Sept 2024 (MUSK: "Colossus 100k H100 training cluster"; NV: "100,000 NVIDIA Hopper GPUs", "used to train xAI's Grok family"). Grok 3 was "Trained on our Colossus supercluster with 10x the compute of previous state-of-the-art models" (XG3). The cluster then "doubled it in 92 days to 200k GPUs" (XCOL), including H200s (MUSK) | MUSK; NV; XG3; XCOL | Cluster size: Yes (Claim by xAI, confirmed by NVIDIA). **Exactly how many GPUs trained Grok 3: Unverified** (press reports say 100k, some say up to 200k) | "One training cluster: 100,000 H100 GPUs." Fine print: "xAI's Colossus, 2024 (xAI, NVIDIA). Grok 3 was trained on it." | "一个训练集群：10 万张 H100。" 小字："xAI 的 Colossus 集群，2024 年（xAI、英伟达）；Grok 3 就在它上面训练。" |
| C4 | "Investment: $500 billion (Stargate Project)" | "The Stargate Project is a new company which intends to invest $500 billion over the next four years building new AI infrastructure for OpenAI in the United States. We will begin deploying $100 billion immediately." Equity funders: SoftBank, OpenAI, Oracle, MGX; SoftBank financial responsibility, OpenAI operational; Masayoshi Son chairman; technology partners Arm, Microsoft, NVIDIA, Oracle, OpenAI; buildout starting in Texas. Announced 21 Jan 2025; presented at a White House event with the US president, Son, Altman and Ellison (CNN) | STAR; CNN | Yes (STAR). White House event: Secondary. Later progress figures (GW, "$400B in play"): Secondary, do not use | "A plan to invest $500 billion over four years in AI data centers." Fine print: "Stargate Project, announced 21 Jan 2025 by OpenAI and SoftBank, with Oracle and MGX." | "一个计划：四年内投入 5000 亿美元，建 AI 数据中心。" 小字："星际之门（Stargate）项目，2025 年 1 月 21 日由 OpenAI、软银宣布，甲骨文、MGX 参与出资。" |
| C5 | Slide 10's footnote references | Kaplan 2020 (KAP), Fedus 2022 (SWITCH), "SemiAnalysis (2023)" (paywalled GPT-4 architecture report; not read), "NVIDIA Eos Tech Report" (not read), Lewis 2020 RAG, Kwon 2023 vLLM (belong to later lectures) | L01 p.10 | SemiAnalysis, Eos: **Unverified** | Do not cite SemiAnalysis or Eos numbers | 不引用 |
| C6 | Scale of a 1% saving (for "can't afford to be wasteful") | 1% of $100 million = $1 million | arithmetic | **Derived** | "At $100 million a run, saving 1% is a million dollars." | "一次训练 1 亿美元，省 1% 就是 100 万美元。" |

### D. Scaling laws and "algorithms that scale" (slide 11)

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | The scaling-laws paper | Kaplan et al., "Scaling Laws for Neural Language Models", OpenAI, arXiv preprint, 23 Jan 2020 (no conference version) | KAP p.1 | Yes | "OpenAI's scaling-laws paper, 2020." | "OpenAI 2020 年的 Scaling Laws 论文。" |
| D2 | What it measures | Test **cross-entropy loss** (how surprised the model is by the next token), not accuracy. "The loss scales as a power-law with model size, dataset size, and the amount of compute used for training, with some trends spanning more than seven orders of magnitude." (p.3 summary says "more than six orders of magnitude"; both are in the paper) | KAP p.1, p.3 | Yes. Internal wording differs (six vs seven); use "many orders of magnitude" | "Make the model, the data and the compute bigger, and the error falls along a smooth, predictable curve." | "模型、数据、算力一起加大，误差就沿着一条平滑、可预测的曲线往下走。" |
| D3 | Shape matters less than scale | "Performance depends strongly on scale, weakly on model shape" (depth vs width etc., within reasonable limits) | KAP p.3 | Yes | (background only) | （仅作背景） |
| D4 | Kaplan's budget advice (what Chinchilla overturned) | Optimal model size N grows as C^0.73 and data as C^0.27; "training very large models on a relatively modest amount of data". In Chinchilla's summary: for 10x compute, model 5.5x and tokens 1.8x | KAP p.1, p.3, p.5; CHIN p.1 | Yes | "2020 advice: spend most of a bigger budget on a bigger model." | "2020 年的建议：预算多了，主要拿去把模型做大。" |
| D5 | Algorithms multiply with hardware | Compute needed to reach AlexNet-level ImageNet accuracy fell 44x from 2012 to 2019 (doubling every 16 months); Moore's law alone would give 11x. "We observe that hardware and algorithmic efficiency gains multiply" | HB20 abstract (CS336 cites it right under the slogan) | Yes | "In seven years, better algorithms cut the compute for the same image classifier 44-fold. Hardware alone: 11-fold. And the two multiply." | "七年里，更好的算法让同样水平的图像分类器少用了 44 倍算力；光靠硬件只有 11 倍。两者还能相乘。" |
| D6 | The Bitter Lesson (what "wrong/right interpretation" is about) | "The biggest lesson that can be read from 70 years of AI research is that general methods that leverage computation are ultimately the most effective, and by a large margin." Later: "methods that continue to scale with increased computation" | SUT (13 Mar 2019) | Yes | If quoted, verbatim with "Rich Sutton, 2019". The film can just say "a famous essay called 'The Bitter Lesson'" | 如引用须逐字并标"Rich Sutton，2019"（我们的译文） |

### E. Chinchilla (slide 11)

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | The paper | Hoffmann et al. (DeepMind), "Training Compute-Optimal Large Language Models", arXiv 29 Mar 2022; NeurIPS 2022 as "An empirical analysis of compute-optimal large language model training" | CHIN p.1; NeurIPS 2022 proceedings | Yes | "DeepMind, 2022." | "DeepMind，2022 年。" |
| E2 | How they found it | Over 400 models, 70M to over 16B parameters, 5 to 500B tokens | CHIN p.1 | Yes | "They trained over 400 models to find the best split." | "他们训了 400 多个模型，找最划算的分配。" |
| E3 | The rule | "for compute-optimal training, the model size and the number of training tokens should be scaled equally: for every doubling of model size the number of training tokens should also be doubled." Exponents about 0.5 and 0.5 (vs Kaplan 0.73 / 0.27) | CHIN p.1; Table 2 p.8 | Yes | "Double the model, double the data." | "模型翻一倍，数据也得翻一倍。" |
| E4 | The test | Chinchilla: 70B parameters, 1.4 trillion tokens. Same training compute as Gopher (280B parameters, 300B tokens): 5.76 x 10^23 FLOPs. "4 times smaller, while being training on 4 times more tokens" | CHIN p.2, Table 1 p.3, p.5, p.9 | Yes. 280/70 = 4; 1400/300 = 4.7 (Derived) | "Same budget as their own 280B model. Chinchilla: a quarter of the size, about 4x the data." | "和自家 2800 亿参数的 Gopher 同样的算力预算；Chinchilla 只有四分之一大，数据却多了约 4 倍。" |
| E5 | Tokens per parameter | Chinchilla 1.4T / 70B = 20 tokens per parameter. GPT-3 300B / 175B = about 1.7. Gopher about 1.1. The paper never states "20 tokens per parameter" as a rule; its Table 3 (1B params -> 20.2B tokens; 10B -> 205.1B) is consistent with it | CHIN Table 1, Table 3 p.8; GPT3 p.8 | **Derived** | "That works out to about 20 tokens of training text per parameter. GPT-3 got under 2." | "折算下来，每个参数大约读 20 个 token；GPT-3 不到 2 个。" |
| E6 | What it beat | "Chinchilla uniformly and significantly outperforms Gopher (280B), GPT-3 (175B), Jurassic-1 (178B), and Megatron-Turing NLG (530B) on a large range of downstream evaluation tasks." MMLU 5-shot: Chinchilla 67.6%, Gopher 60.0%, GPT-3 43.9%, random 25% | CHIN p.1; Table 6 p.11 | Yes. **CONFLICT inside the paper**: abstract says 67.5%, Table 6 and text say 67.6%. Use 67.6% or "about 68%" | "The 70B model beat the 175B GPT-3, and even the 530B Megatron-Turing." On a 57-subject exam: "about 68% vs GPT-3's 44%." | "700 亿参数的 Chinchilla，赢了 1750 亿的 GPT-3，连 5300 亿的 MT-NLG 也赢了。57 科考试：约 68% 对 GPT-3 的 44%。" |
| E7 | Not same compute as GPT-3 | GPT-3 175B: 3.14 x 10^23 FLOPs. Chinchilla: 5.76 x 10^23, so about 1.8x GPT-3's compute. The same-compute comparison is against Gopher | GPT3 Table D.1 p.46; CHIN p.5 | Yes; ratio **Derived** | Say "same compute as Gopher". Never "same compute as GPT-3" | 只说"和 Gopher 同样算力" |
| E8 | Not a clean sweep | On MMLU, Chinchilla underperforms Gopher on 4 tasks (college math, econometrics, moral scenarios, formal logic) | CHIN p.11 | Yes | "Beat on most tests", or "on a wide range of tests" | "大多数测试上更强" |
| E9 | Smaller is cheaper to run | Being 4x smaller than Gopher, its "memory footprint and inference cost" are smaller; "substantially less compute for fine-tuning and inference" | CHIN p.1, p.9 | Yes | "And a smaller model is cheaper every time someone uses it." | "模型小了，之后每一次使用都更省。" |
| E10 | Practice moved past "Chinchilla-optimal" | Llama 3: "we also train our smaller models for much longer than is compute-optimal. The resulting models perform better than compute-optimal models at the same inference budget." Flagship 405B on 15.6T tokens | L3 pp.1-2 | Yes | (only if needed) "Today labs often train small models even longer than Chinchilla's rule, to save at serving time." | "现在各家常把小模型训得比 Chinchilla 规则还久，为的是部署时更省。" |

### F. The slogan, the credit and the course (slide 11 and the ending)

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Origin of "accuracy = efficiency x resources" | Stanford CS336 Lecture 1 (Percy Liang), section "The bitter lesson", in the 1 Apr 2025 initial commit. Not in the 2024 lecture 1 (which says "Key: it's all about *efficiency*"). No earlier source found | CS336 | Yes (earliest trace found; an earlier origin cannot be ruled out) | On screen: "accuracy = efficiency x resources" with credit "Stanford CS336, Lecture 1 (2025)" | "准确率 = 效率 × 资源" 署名"出自斯坦福 CS336 第 1 讲（2025）" |
| F2 | It is a slogan, not a law | No units, no fit, no paper. It is CS336's one-line reading of the Bitter Lesson | CS336 | Yes | Present it as a motto on a card, never as a fitted equation or a "law" | 当口号用，不说"公式""定律" |
| F3 | The two readings | Wrong: "scale is all that matters, algorithms don't matter." Right: "algorithms that scale is what matters." | CS336; L01 p.11 | Yes | "Wrong takeaway: only size matters. Right takeaway: what matters is methods that keep paying off as you scale." | "错误理解：只有规模重要。正确理解：重要的是那些规模越大越管用的方法。" |
| F4 | Why efficiency matters more at scale | "efficiency is way more important at larger scale (can't afford to be wasteful)" | CS336; L01 p.11 | Yes (as their claim; C6 gives our arithmetic) | "The bigger the run, the more every wasted percent costs." | "规模越大，浪费的每一个百分点越贵。" |
| F5 | This course | CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego. Objective: "Understand major system bottlenecks in LLM training and inference (compute, memory, latency, etc.)" | L01 p.1, p.4 | Yes | "That's this course: CSE 291P, LLM System Optimization. It's about the efficiency half: where training and serving waste compute, memory and time." | "这就是这门课：CSE 291P《大模型系统优化》，讲的是'效率'那一半：训练和推理里，算力、显存、时间浪费在哪。" |
| F6 | The brand line | "*compute not included" / "*算力另计" fits: a course can teach the efficiency factor; it cannot hand out frontier-scale resources (CS336 says it plainly: "Frontier models are out of reach for us.") | CS336 | Yes for the CS336 line. **Unverified** whether CSE 291P gives students any GPU credits: check with the TAs; if it does, say "*frontier-scale compute not included" | "We can teach you the efficiency. *Compute not included." | "效率，课上教。*算力另计。" |

### G. Rows added for the final script (SCRIPT.md section 10.2; re-read in the arXiv PDFs, 2026-10-04)

| # | Statement | Exact value | Source | Verified | Safe EN | Safe ZH |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | Where arithmetic emerges for GPT-3 | "Addition/subtraction (3 digit)": 2.3E+22 training FLOPs, 13B parameters, GPT-3; 4-5 digit: 3.1E+23, 175B | WEI Table 1 (arXiv 2206.07682v2 p.6) | Yes | "near zero on arithmetic, then a jump at thirteen billion parameters"; poster labelled "schematic" | "算术题几乎零分，到一百三十亿参数，突然跳起"；海报标"示意" |
| G2 | The big models of 2020-21 and their data | GPT-3 175B / 300B tokens; Jurassic 178B / 300B; Gopher 280B / 300B; MT-NLG 530B / 270B; Chinchilla 70B / 1.4T | CHIN Table 1 p.3 | Yes | sizes only, no names: "175B / 280B / 530B", "300B / 300B / 270B tokens" | "1750 亿 / 2800 亿 / 5300 亿"，"3000 亿 / 3000 亿 / 2700 亿 token" |
| G3 | Data stood still | "many of the recently trained large models have been trained for approximately 300 billion tokens (Table 1), in line with the approach of predominantly increasing model size when increasing compute" | CHIN p.1 | Yes | "Rehearsal: three hundred billion tokens." | "排练：三千亿 token。" |
| G4 | The compute rule | "FLOPs(N, D) ≈ 6ND (Kaplan et al., 2020)" | CHIN §3.3 p.7 | Yes | "budget is roughly cast times rehearsal" (budget = training compute, on the card); 6ND only in the post | "预算，约等于演员乘排练"（卡上注明预算 = 训练算力） |
| G5 | What the Mirage paper measured | "outputs from the InstructGPT/GPT-3 family on two tasks: 2-shot multiplication between two 2-digit integers and 2-shot addition between two 4-digit integers"; with token edit distance the change is smooth | SMK p.5 (arXiv 2304.15004v2) | Yes | "Give partial credit, like the cat, and one paper finds many jumps smooth out." | "像猫这样给部分分，有篇论文发现：很多'突然'，变成了'渐渐'。" |
| G6 | Same compute, two dots on the emergence chart | Wei Fig. 2(G): Chinchilla and Gopher at the same x (5.0E+23); about 67.9% vs 60.1% (judge's vector read; matches CHIN 67.6 / 60.0) | WEI Fig. 2, Table 1 | Yes for the x; the y reading is the judge's | post only (Easter egg) | 只进置顶评论 |
| G7 | The GPT-3 points of Fig. 2(A) | 6.7B about 1%, 13B about 8%, 175B about 32% (judge's read of the figure) | WEI Fig. 2(A) | Shape only | the poster redraws the shape, labelled "schematic · after Wei et al. 2022, Fig. 2A"; only "13B" is printed | 海报只画形状，标"示意"，只印"13B" |
| G8 | MT-NLG's date | announced 11 Oct 2021 | NVIDIA developer blog, 11 Oct 2021 | Yes (judge) | year strip "2020–2021" | 年份条"2020–2021" |
| G9 | Our worked example | 347 + 586 = 933; 918 and 932 are wrong answers with 1 and 2 of 3 digits right | our arithmetic | **Derived** ("our example") | not credited to any paper | 不归给任何论文 |

---

## 2. Exact wording blocks

### 2a. Emergence, with the honest limit

**Say (EN):** "1972: physicist Philip Anderson writes 'More Is Different': pile up enough simple parts and entirely new
behavior appears. Fifty years later, AI researchers saw the same thing: on some tests, small language models score at
chance, then, past a certain amount of training compute, the scores jump."
Honest limit: "A 2023 paper argued many of those jumps come from all-or-nothing scoring; under the hood the models
improve smoothly. Either way: you can't fully judge a big model by testing small ones."
Fine print: "Anderson, Science 1972. Wei et al., TMLR 2022, Fig. 2. Schaeffer, Miranda & Koyejo, 'Are Emergent
Abilities of Large Language Models a Mirage?', NeurIPS 2023."

**Say (ZH):** "1972 年，物理学家安德森写下《More Is Different》：简单的东西堆得足够多，就会冒出全新的性质。五十年后，AI
研究者也看到了类似的事：有些测试上，小模型的分数一直是瞎猜水平，训练算力过了某个量，分数突然跳起来。"
诚实限定："2023 年有篇论文指出：很多'跳变'来自'全对才给分'的评分方式，模型底下其实一直在平滑进步。不管哪种解释，结论都一样：
光测小模型，看不全大模型。"

**Never:**
- "AI suddenly wakes up / becomes conscious / gains a mind at scale"
- "Nobody knows why" (Wei et al. discuss explanations; say "it is still debated")
- "Anderson predicted AI" / "Anderson said this about AI" / "Anderson won the Nobel for 'More Is Different'"
- "Anderson won the Nobel in 1972" (1977) or "alone" (shared with Mott and Van Vleck)
- "...an Illusion?" as the paper's title (it is "a Mirage?")
- "Emergence was proven fake" or "debunked" (SMK say the opposite, B6)
- "Emergence happens at 1B parameters" (the <1B is CS336's class budget)
- "FLOPS" for the x-axis (it is FLOPs, a total count)

### 2b. The industrialization card set (four flown-in riso cards)

| Card | EN on screen | ZH on screen | Fine print (post or card corner) |
| --- | --- | --- | --- |
| Size | "1,000,000,000,000 parameters" + "the biggest labs no longer say" | "1 万亿参数" + "大厂已经不公布了" | "Open example: Kimi K2, 1T total (arXiv 2507.20534). Closed models' sizes are undisclosed." |
| Money | "> $100,000,000 for one frontier training run" | "训练一个顶级模型 > 1 亿美元" | "Gemini Ultra about $191M, Stanford AI Index 2024 estimate." |
| Chips | "100,000 H100 GPUs in one cluster" | "一个集群 10 万张 H100" | "xAI Colossus, 2024 (xAI, NVIDIA)." |
| Plan | "$500,000,000,000 over 4 years (planned)" | "四年 5000 亿美元（计划）" | "Stargate Project, announced 21 Jan 2025." |

**Never:**
- A parameter count next to GPT-5.2, Gemini 3 Pro, Grok-3 or Claude 4.5 (undisclosed; the last is also covered by the
  house rule on model names, open item [#23])
- "GPT-4 has 1.8 trillion parameters" (NVIDIA CEO's remark, unconfirmed)
- "Grok 3 was trained on exactly 100,000 H100s" (xAI does not say; the cluster later had 200k GPUs incl. H200s)
- "$500 billion spent / invested" (it is a stated intention), "the US government's $500 billion", "the president's
  $500 billion", "NVIDIA's Stargate" (NVIDIA is a technology partner, not an equity funder; CS336's "(OpenAI, NVIDIA,
  Oracle)" is off)
- "Every model costs $100 million to train"
- Any gag that puts Altman's 2023 line ("end of the era ... giant, giant models", WIRED) next to Stargate: that is a joke
  about a real person

### 2c. Chinchilla

**Say (EN):** "2022, DeepMind: same compute budget as their own 280-billion-parameter model. Instead: a 70-billion model,
fed four times the data. It won, and it beat the 175-billion GPT-3 too. Lesson: not just bigger; better balanced."
Fine print: "Hoffmann et al., NeurIPS 2022. Chinchilla 70B, 1.4T tokens, same FLOPs as Gopher 280B. MMLU 67.6% vs
GPT-3 43.9%."

**Say (ZH):** "2022 年，DeepMind：拿着和自家 2800 亿参数模型一样的算力，改训一个 700 亿的小模型，喂四倍的数据。结果它赢了，
连 1750 亿参数的 GPT-3 也赢了。教训：不是越大越好，是要配比得当。"

**Never:**
- "with less compute than GPT-3" or "same compute as GPT-3" (it used about 1.8x GPT-3's)
- "smaller models are better" (the point is the size-to-data balance under a fixed budget)
- "the 20-tokens-per-parameter law" (our arithmetic from their results, not a stated law; and it is about training
  compute, not serving cost)
- "beat everything on every test" (lost to Gopher on 4 MMLU subjects)
- implying the names "Chinchilla" or "Gopher" describe the models (they are just names; a felt chinchilla and a felt
  gopher are fine as clearly labelled stand-ins)

### 2d. The slogan

On a card: **accuracy = efficiency x resources**, credit line "Stanford CS336, Lecture 1 (2025)". ZH card:
**准确率 = 效率 × 资源**，署名"斯坦福 CS336 第 1 讲（2025）". The voice-over may call it "a motto from Stanford's
CS336", never "a law" or "the formula".

### 2e. Post / end-card credits

EN: "Based on Prof. Yufei Ding's CSE 291P (LLM System Optimization), Lecture 1, UC San Diego, which draws on Stanford
CS336 (Liang & Hashimoto). Sources: Anderson, Science 1972; Wei et al., TMLR 2022; Schaeffer, Miranda & Koyejo,
NeurIPS 2023; Kaplan et al. 2020; Hoffmann et al., NeurIPS 2022; Hernandez & Brown 2020; OpenAI Stargate announcement,
Jan 2025; xAI / NVIDIA on Colossus, 2024; Stanford AI Index 2024."
ZH：同上，标题保留英文原名。

---

## 3. Slide errata (fix in the film; tell the course team if useful)

1. L01 p.9: counterpoint title "Are Emergent Abilities of Large Language Models an Illusion?" is wrong: it is "...a
   Mirage?" (SMK, NeurIPS 2023).
2. L01 p.9: "(<1B)" reads like a general threshold; in the source (CS336) it is that class's own model budget.
3. L01 p.10: trillion-parameter scale for GPT-5.2, Gemini 3 Pro, Grok-3, Claude 4.5 is not disclosed by any vendor.
4. L01 p.10: "100,000 H100s (Grok 3)": 100k is the Colossus cluster at launch; xAI does not state the GPU count for
   Grok 3, and the cluster doubled to 200k GPUs (incl. H200) around Grok 3's release.
5. L01 p.10: "Investment: $500 billion" is a four-year intention announced 21 Jan 2025, not money invested.
6. CS336 (source of the slides): "Stargate (OpenAI, NVIDIA, Oracle)": equity funders are SoftBank, OpenAI, Oracle, MGX;
   "200,000 H100s": Musk's own post said 200k including 50k H200s.
7. CHIN abstract 67.5% vs Table 6 67.6% (inside the paper; use 67.6%).
8. KAP abstract "more than seven orders of magnitude" vs p.3 "more than six" (inside the paper; say "many").

---

## 4. The meme on slide 10 (do not reuse)

Two images, side by side:
- **Left: the "Vince McMahon reaction" meme**, four stacked stills from WWE broadcast footage of the former WWE chairman
  getting more and more excited (the last with red laser eyes), relabelled "AI" / "GenAI LLM" / "Training your private
  LLM $$$" / "Private/Secure RAG $$$ SAVINGS".
- **Right: a three-panel cat comic**: an orange-and-white cat fishing at a riverbank with a bucket; a grey, Siamese-
  coloured cat arrives and fishes out of the first cat's bucket instead of the river. Relabelled "Liability Data" (the
  river), "Heavy Model" (the first cat), "Lite Model" (the second cat). It is shared online as a reaction template
  ("Fish-stealing cat" on Imgflip); the original artist was **not identified**. The slide's reading (a small model
  fishing from a big model's outputs, i.e. distillation, while the big one carries the data liability) is our
  interpretation: **Unverified**.

Why not reuse: a real person's face (house rule: no jokes about real people), third-party broadcast stills and an
unattributed comic (rights), and both jokes are about RAG / distillation (later lectures), not this episode's idea.
Our white beret cat must not be staged or drawn like the comic's cats (no fishing-from-the-bucket bit).

---

## 5. Real people in this episode

| Person | Allowed | How |
| --- | --- | --- |
| Philip W. Anderson (1923-2020) | Yes | Name, years, Nobel line (A2), verbatim quotes A6-A8 only. A respectful cut-paper silhouette at a lectern is acceptable; no felt puppet, no caricature, no invented lines, no gag at his expense |
| Wei et al.; Schaeffer, Miranda, Koyejo; Kaplan et al.; Hoffmann et al. | As paper credits | Names on paper cards / fine print. No faces |
| Percy Liang, Tatsunori Hashimoto | As credit | "Stanford CS336" credit line; no likeness |
| Rich Sutton | Optional | Verbatim D6 quote on a card with name and date; no likeness |
| Sam Altman | Text only, optional | Only the WIRED exchange in C2, attributed; no likeness, no juxtaposition gag |
| Elon Musk, Jensen Huang | No | Their parameter claims are not used; xAI / NVIDIA appear only as company sources in fine print |
| Political figures at the Stargate announcement | No | Not named on screen; "announced 21 Jan 2025" is enough |
| Vince McMahon | No | See section 4 |
| Prof. Yufei Ding | Yes, as the course credit | Name and course on the end card; any line from her must be verbatim from the lecture recording (not checked yet) |

---

## 6. Traps and forbidden phrasings (all in one place)

- "Scaling laws" are about **loss**, not accuracy or "intelligence". Never "scaling laws prove bigger models are
  smarter" or "scaling laws guarantee emergence".
- "accuracy = efficiency x resources" is a motto (CS336), not a measured equation. No units, no plotted fit.
- "Scale is all you need" is the slide's **wrong** interpretation: never let a card or the cat's note state it without
  the red-pen correction.
- Emergence: say "debated", never "proven" or "debunked".
- Training FLOPs (a total amount of work) are not FLOP/s (speed). ZH: "训练总运算量", not "算力速度".
- Parameters are not capability: Switch-C (1.6T) scored 87.7 on SQuAD, below the smaller Switch-XXL's 89.6 (SWITCH
  p.26). Never "more parameters = smarter" as a rule.
- Chinchilla: "same compute as Gopher", never "as GPT-3"; "about 20 tokens per parameter" is our arithmetic.
- Kimi K2 is MoE: "1 trillion total, 32 billion active". Never "a 1-trillion-parameter model runs all 1T per word".
- $500B is planned over four years; $100M+ is per training run (estimate); 100,000 is GPUs in one cluster. Do not mix
  units on one card ("$500B of GPUs").
- No closed-model parameter counts, no "leaked" numbers, no SemiAnalysis figures.
- Anderson: physics, 1972, Nobel 1977 (shared), lecture in La Jolla 1967. Nothing about AI in his mouth.
- ZH: "涌现能力" for emergent abilities; "Scaling Law（规模定律）" on first use; "Chinchilla" keep the English name
  (if a nickname is wanted, "龙猫" is common in Chinese media but must not replace the name on a citation card).
- No "AI is just like the brain / like a city / like an ant colony" analogies beyond Anderson's own physics framing,
  unless the analogy is labelled as ours.

---

## 7. Open items and unverified

1. The L01 lecture recording: what Prof. Ding actually said on slides 9-11 (voice, anecdotes) is not checked.
2. Whether CSE 291P provides GPU credits (affects F6 wording).
3. [#23] whether model names that are the subject (GPT-3, Gopher, Chinchilla, Kimi K2, Grok 3) may appear on screen;
   this brief assumes yes for published research models, and recommends never naming the slide's four closed models.
4. AI Index 2024 report methodology ("compute cost only") read via the HAI news summary, not the report PDF.
5. Exact GPU count used for Grok 3 (press reports conflict); not needed if C3 wording is used.
6. The cat comic's artist (section 4).
7. Stargate's progress after January 2025: only secondary sources; not used.
8. Wei Fig. 2 data points: the film can redraw the **shape** of panel (A) or (G) as a schematic "after Wei et al. 2022,
   Fig. 2", not as exact data; label the poster "schematic".
