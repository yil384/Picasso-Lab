# Main-line episode map: CSE 291P (LLM System Optimization) + the lab's quantum work

Picasso Lab knowledge-explainer series for @PicassoLabUCSD (English cut on X, Chinese-subtitled cut on Douyin, both 9:16).
Research date: 2026-10-04. Read-only research; nothing in the repo or the paper worktrees was changed.

---

## 0. Key conclusions

1. **The course gives 14 decks, but only 10 are Prof. Ding's own lectures.** L09, L10 and L11 are invited talks (Yue Guan:
   ML compilers; Guyue Huang of NVIDIA: RL for system designers, which carries a "personal opinions" disclaimer; the PyTorch
   team: FlexAttention + CUDAGraph). L14 (MoE) was taught by the lab's PhD student Zhongkai Yu. Episodes built on invited
   talks should credit the speaker on screen, and the NVIDIA talk's claims should be presented as one engineer's opinion.
2. **The lab's own papers are already inside the slides.** This makes the "course → lab research" twist natural, not
   forced. Patterns behind Chaos (ISCA'26 Best Paper) is the core of L14 pp.28, 38-46. Yggdrasil (NeurIPS'25) is in
   L08 pp.25 and 30. WLB-LLM (OSDI'25) is in L07 pp.38-42. Mercury (SOSP'25) and TLX are in L09 pp.35-39 and 68.
   RM-STC (MICRO'23) is cited in L05 p.3.
3. **Pilot recommendation: the MoE episode**, "671B parameters, 37B at a time" (DeepSeek has 256 experts and asks 8 per
   token). It ends with the lab's Best Paper twist: the expert traffic looks random, but it isn't. It is the only
   candidate that scores on all four criteria: a DeepSeek-name hook, a hospital-triage visual (专家号挂不上), very broad
   Chinese and English appeal, and a direct tie to the lab's research. It also finally uses the 16-second ISCA comic
   (launch-film v2) that was held back "以后单独发最佳论文". If you want the safest broad-reach opener instead, use
   "7 characters, 1 token". Its hook ("中华人民共和国" is 7 tokens for GPT-4's tokenizer and 1 for GPT-4o's) is
   verified locally with tiktoken.
4. **Recommended Season 1 (10 episodes)**, in order: MoE (pilot) → tokens → KV-cache memory → speculative decoding
   (crosstalk / 相声 format) → PagedAttention (保温杯占座) → 4-bit quantization (电子包浆) → "584 years on one GPU" →
   pipeline bubbles (摸鱼率) → qubit seat-swapping (SABRE) → atoms in convoy (Qubrio). That is 8 LLM/system episodes
   and 2 quantum. The season runs from the user-facing side (inference) to the data center (training) and then to the
   lab's other frontier. The finale bridges LLM agents and quantum.
5. **The strongest quantum hook is verified.** The lab's ASPLOS'19 paper (Li, Ding, Xie) introduced SABRE. Qiskit's
   SabreSwap docs say it implements this paper's algorithm (with LightSABRE changes), and Qiskit's transpiler-stages
   guide says Qiskit uses SabreSwap for routing. Qiskit is the most widely used open quantum SDK (unverified), so the
   pitch "if you ever ran a circuit through Qiskit, you probably used our lab's router" is defensible if worded with
   "probably" and "builds on".
6. **Numbers to double-check before any frame is rendered** (slides are written for class; a film needs the primary source):
   - L01 p.22 says "1000" is one token in large vocabularies. Not the case for cl100k or o200k: both give ['100','0'] (checked with tiktoken).
   - L06 p.3 uses 134.4 GB where it should use 130.4 GB, so ZeRO-2/3 should read 187.4 and 65.2 GB.
   - L03 p.12: the 1M-token KV figure for the 405B model is not reproducible from its own formula (about 7.5 TiB, not
     7.69 TB).
   - L08 pp.10 and 17 attribute Medusa and EAGLE to "Dao et al.".
   - L14 p.6 says "Hinton proposed MoE in 1991"; the 1991 paper is Jacobs, Jordan, Nowlan & Hinton.
   - L02 p.20 lists closed models (Claude 4, Gemini 2.5, Grok-3) as SwiGLU users, which cannot be verified.
   - DeepSeek-V3's active parameter count is 37B in L07 p.32 and 36B in L14 p.9.
   - The lab's existing L01 highlight video shows "target vocabulary size of 11"; the current deck correctly says 13.
7. **Every lecture has a culturally native Chinese metaphor that also reads in English:**
   - all-reduce = 圆桌转盘 (Lazy Susan)
   - pipeline bubble = 摸鱼率 on a dumpling line
   - KV reservation waste = 大爷用保温杯占座
   - speculative decoding = 相声 逗哏/捧哏
   - MoE = 医院分诊 / 专家号
   - quantization = 电子包浆
   - convoy shuttling = 广场舞阿姨整队平移
   - qubit routing = 高铁换座
   - tokenization = 活字印刷

   The lab's existing running gags carry over from the launch film and should become the series cast: the painted cat,
   the bill/receipt printer, and "milk tea included".
8. **Per-paper briefs do not exist yet.** All nine `papers/*/video-kit/briefs/` folders hold the same four project
   briefs (Qubrio, TritonGym, TritonDFT, ChipMATE; identical md5). For AMMA, FlashEvolve, iSwitch, KVFlow, Patterns,
   ScaleSim, Syncopate and Yggdrasil, I only had titles and author lists (from `pub/pub.html`) plus what the lecture
   slides say. Any number about those papers beyond that is marked (unverified).

---

## 1. Sources and citation convention

| File | Lecture (from `teaching/291P-W25/cse291p.html`) | Speaker | Pages |
| --- | --- | --- | --- |
| L01 | 1. Introduction: LLM API usage + tokenization (Jan 6 2026) | Yufei Ding | 37 |
| L02 | 2. Transformer architecture variants I (structure, activations, positional encoding) | Ding | 36 |
| L03 | 3. Transformer architecture variants II (attention, KV cache, MQA/GQA/MLA, norms, hyper-connections, hyperparameters) | Ding | 37 |
| L04 | 4. Distributed LLM training: foundations (why, hardware, DP, all-reduce) | Ding | 45 |
| L05 | 5. Distributed training: DP and ZeRO-1/2/3 (the slide title wrongly says "Lecture 6") | Ding | 33 |
| L06 | 6. Pipeline parallelism + tensor parallelism | Ding | 37 |
| L07 | 7. Context parallelism (+ industry 4D recipes, WLB-LLM) | Ding | 42 |
| L08 | 8. LLM serving: speculative decoding | Ding | 37 |
| L09 | 9. Invited: Machine Learning Compiler | Yue Guan | 70 |
| L10 | 10. Invited: LLM-RL Introduction for System Designers ("personal opinions, not NVIDIA's", p.3) | Guyue Huang (NVIDIA) | 34 |
| L11 | 11. Invited: FlexAttention + PT2 CUDAGraph ("PyTorch Team"; schedule lists Boyuan Feng) | PyTorch team | 52 |
| L12 | 12. LLM quantization | Ding | 40 |
| L13 | 13. LLM serving: scheduling, KV management, kernels | Ding | 46 |
| L14 | 14. MoE and MoE serving systems | Zhongkai Yu (lab PhD student) | 47 |

- "L08 p.25" means PDF page 25 of L08.pdf. I checked that PDF page numbers equal the slide footers for the
  instructor decks. L10 and L11 have partial or no footers, so I cite the PDF page index (located with PyMuPDF).
- Lecture 15 (Keren Zhou, Triton/Gluon) has a recording but is not in this set.
- **Lab material read:**
  - `projects/projects.html` card copy and `projects/qubrio/prompt_qubrio.md`
  - the Qubrio site text and four project briefs (`papers/*/video-kit/briefs/`, `reference/site-qubrio.txt`)
  - the QEC decoding blog (`origin/video-kit:blogs/nvidia-ising/index.html`, Yin, Ruan, Lin, Apr 8 2026)
  - `pub/pub.html` (full publication list)
  - `teaching/291P-F25/cse291p.html` (the lab's Fall 2025 *Quantum Computing Systems* course schedule)
  - `social/x/versions/VERSIONS.md` (the user's verbatim feedback)
  - `social/x/build.py` / `kit.html` (Best Paper post copy)
- **Verified by me outside the slides:**
  - tiktoken 0.12.0 token counts (run locally)
  - H100 FP8 dense = 1,979 TFLOPS (NVIDIA datasheet numbers via search)
  - SABRE ↔ Qiskit (IBM Qiskit docs)

---

## 2. A house format for a main-line episode (so every entry below plugs into one template)

- **Length.** Main cut 75-120 s. Keep a 30-45 s cut-down for the feed. X's per-tier video length limits: (unverified).
- **Frame.** 1080×1920. Put all on-screen text in a separate 2D type layer, as the xlaunch kit already does. EN/ZH then
  swaps with a flag, and only the type layer is re-rendered for Douyin.
- **Beats**, borrowing from the three models:
  - 0-3 s **hook**: one image plus one number or one absurd question (Tim's bold claim / 毕导's "如果…会怎样").
  - 3-15 s **the real question**.
  - 15-75 s **build**: one metaphor, escalated (何同学's single continuous camera move and match cuts).
  - 75-95 s **wow**: the scale reveal or the morph.
  - 95-110 s **twist**: the lab's own paper, or "the slide was wrong".
  - Last 5 s **callback joke + formula card**: one line of math the viewer can screenshot, 毕导-style.
- **Comedy grammar** (喜人奇妙夜 / 脱口秀大会):
  - one act-out character per episode (the cat, an intern, a 大爷)
  - one 反转 at the twist
  - one callback to an earlier episode
  - one 谐音梗 maximum

  Jokes must be specific to the mechanism. A generic meme reads as "AI-ish", and the user rejects that.
- **Look.** Start from the approved v7 studio texture ("可以可以，就要这个质感"): curved studio, glossy floor, area
  lights, real paper texture. Make style frames before animating (lesson of v6/v7). Never draw characters or props with
  code primitives. The cat, members, printer and milk tea already exist as painted sprites in
  `.claude/films/xlaunch/art/`.
- **Recurring cast:**
  - **the cat**: the viewer's stand-in, curious and destructive; it is also Schrödinger's cat in the quantum episodes
  - **the bill printer**: every inefficiency prints a receipt; this is the launch film's "*compute not included" gag
  - **milk tea**: the reward at the end of each episode

---

## 3. Episode candidates by lecture

Field order for each candidate: **Title** (EN / ZH) · **ONE idea** · **Hook (0-3 s)** · **Core visual (three.js /
q5.js)** · **Wow** · **Comedy** · **Facts to use** · **Accuracy traps**.

### L01: Tokenization, API cost, decoding

#### L01-A "7 characters, 1 token" (Season 1 #2; backup pilot)
- **Title.** EN: *Why does GPT-4o read 中华人民共和国 as ONE word?* / ZH: 《为什么GPT-4o把"中华人民共和国"当成一个字？》
- **ONE idea.** Models don't read letters or words; they read tokens. The tokenizer decides how much you pay and how much
  fits in the model's memory.
- **Hook.** Seven metal movable-type blocks spell 中华人民共和国. A hammer hits, and they shatter into 7 tiles (GPT-4's
  tokenizer). Rewind: they fuse into one block (GPT-4o's). Caption: "7 → 1. Same seven characters."
  - English-cut alternate hook, also verified: `strawberry` = 3 tokens (str|aw|berry), but ` strawberry` with a leading
    space = 1 token.
- **Core visual.** 活字印刷: tokens as lead type blocks on a compositor's tray (use a real movable-type photo or scan
  texture, not procedural).
  - BPE training as type blocks fusing. The slide corpus {low:5, lower:2, newest:6, widest:3} starts as single-letter
    blocks.
  - Round 1: e+s weld into "es" (count 9). Round 2: es+t → "est" (9). Round 3: l+o → "lo" (7). A counter ticks the
    vocabulary up to 13.
  - three.js instanced blocks with a weld spark; q5.js tally marks on the tray edge.
- **Wow.** The UC San Diego Chinese name 加州大学圣地亚哥分校 = 14 tokens in cl100k. Several characters split into **two
  byte-shards** (shown as '�'), so a single character is literally broken in half. In o200k it is 9 tokens. 吃了吗 is
  5 → 2.
- **Comedy.**
  - "在GPT-4眼里，一个'吃'字要掰成两半来收钱" (吃 alone = 2 tokens in cl100k).
  - A 毕导-style mock invoice from the bill printer: "字税 receipt".
  - Callback: the cat bats away a stray byte-shard.
- **Facts.**
  - Tokens are integer IDs into a fixed vocabulary (L01 p.14).
  - BPE = merge the most frequent adjacent pair until the target size (p.16); worked trace (p.17).
  - GPT-4o target ~200,000 vocabulary; 中华人民共和国: 7 tokens cl100k vs 1 token o200k (p.19, **verified locally**).
  - Vocabulary sizes: Llama 1/2 32,000; Llama 3 128,000; GPT-4o ~200,000 (p.20).
  - Embedding size at hidden 4096: 32k vocab ≈ 131M parameters vs 200k ≈ 819M (p.23; arithmetic checks).
  - 1,000 characters ≈ 250 tokens (English), 500-750 (code), 700-1,100 (Chinese) (p.24).
  - Context length, compute and price are all counted in tokens (p.13).
- **Traps.**
  - p.22's "1000 as one token": not the case for cl100k and o200k (both ['100','0'], checked). Do not repeat it.
  - Per-character cost is not per-meaning cost. A Chinese character carries more meaning than an English letter, so do
    not say "Chinese is 4× more expensive" without that caveat.
  - "Unigram used by Gemini" (p.15) is (unverified).
  - Vocabulary-size figures are for the named tokenizers only.
  - The old highlight video says target vocabulary 11; the correct value is 13 (10 initial symbols + 3 merges).

#### L01-B "AI has a thermostat"
- **Title.** EN: *What does "temperature" heat up inside an AI?* / ZH: 《AI的"温度"，到底是什么温度？》
- **ONE idea.** The model gives every possible next token a probability. Temperature sharpens or flattens that
  distribution, and top-p cuts off the unlikely tail. "Creativity" is controlled randomness.
- **Hook.** One prompt, three replies side by side at T=0 / 0.7 / 1.4; the third derails mid-sentence.
- **Core visual.** Next-token probabilities as a row of glass bars on a lab bench, with a real mercury thermometer
  beside them.
  - Cooling: the bars condense into one spike. Heating: they melt flat.
  - top-p is a velvet rope that fences the tallest bars until the cumulative label reads 0.92 (the slide's example);
    everything outside the rope dims.
  - three.js glass with refraction; q5.js handwriting for the sampled word.
- **Wow.** A token-by-token sentence types itself while the bar chart reshapes live under each word.
- **Comedy.** "T=0 是你爸妈说话；T=1.4 是你凌晨三点发的朋友圈" (talk-show crowd-work style).
- **Facts.**
  - API knobs: temperature, top_p, presence/frequency penalty, seed, stream (L01 p.26).
  - Greedy vs beam (p.28); top-k k=6 example (p.30).
  - top-p 0.92 example (p.31, Holtzman et al. ICLR 2020).
  - T<1 sharper, T>1 flatter (p.32).
  - Recommended ranges (p.34): chat 0.7-0.8, code 0.0-0.2, factual 0.0-0.3, creative 0.8-1.2, "avoid >1.5".
  - Self-consistency / bag-of-N sampling (p.33).
- **Traps.**
  - The p.34 table is heuristic guidance, not a spec.
  - Do not claim T=0 is perfectly reproducible on real serving stacks (unverified).
  - The probability bars must sum to 1 in every frame.

#### L01-C "Ask a paper 5 questions: $0.11 or $0.03?" (short, 45 s)
- **ONE idea.** You pay per token, so re-sending the same document is the expensive habit. Caching and retrieval (RAG)
  cut the bill.
- **Hook.** The bill printer spits a receipt per question.
- **Visual.** Three receipts race:
  - naive $0.1085
  - cached $0.0455
  - RAG $0.034125
- **Facts.** L02 pp.4-6: 10,000-token paper; 300 output tokens; $1.75/M input, $14/M output, cached $0.175/M; 500-token
  chunks with top-3 retrieval.
- **Traps.** The slide does not name the model behind the prices, and prices change. Say "at the prices used in
  class". RAG trades cost for system complexity (p.6).

### L02: Transformer variants I

#### L02-A "The cat chased the dog" (positional encoding, RoPE)
- **Title.** EN: *How does AI know who chased whom?* / ZH: 《猫追狗还是狗追猫？AI怎么知道词的顺序》
- **ONE idea.** Attention by itself is blind to word order. Positional encoding adds "where". RoPE does it by
  *rotating* each word's vector, so only the distance between two words matters.
- **Hook.** The lab cat chases a dog across frame. Then the same words reshuffle and the dog chases the cat. Without
  position, the model "sees" an identical pile of words (the slide's exact example).
- **Core visual.** A clock tower with many clock faces.
  - Each pair of embedding dimensions is one hand. Low dimensions spin fast (second hand); high dimensions crawl (hour
    hand).
  - The slide's table gives real values: pos1 dim0 = 0.841 = sin 1; dim6 barely moves.
  - Two words become two clocks. Shift both by k: every hand advances by the same angle, so the angle *between* them
    is unchanged (PE(pos+k) = R_k·PE(pos); R_k is a rotation, so inner products are preserved).
  - For context extension, Position Interpolation squeezes the clock face so 128k positions fit where 4k used to.
- **Wow.** The camera flies through a field of thousands of clocks rotating in lockstep, then snaps to one pair whose
  angle never changes.
- **Comedy.** "没有位置编码，'我爱你'和'你爱我'在AI眼里一模一样——难怪单相思" (one line, a shared-laugh beat).
- **Facts.**
  - "The cat chased the dog / The dog chased the cat" (L02 p.24).
  - Sinusoidal table for d_model = 8 (p.26).
  - Rotation proof (pp.27-30).
  - Sinusoidal is only "partially" relative because Q and K come from embedding + PE (p.31).
  - RoPE: the inner product depends only on content + relative position (p.33).
  - PI / NTK-aware / YaRN extend 4k → 128k → 1M+ (p.36).
  - Modern models apply RoPE to q and k in *every layer* (L04 p.2).
- **Traps.**
  - Don't show RoPE as "added to embeddings"; it rotates q and k.
  - The base 10000 belongs to the sinusoidal formula.
  - RoPE's origin paper is not on the slides (RoFormer, Su et al. 2021, is the usual citation; verify before showing).

#### L02-B "Every top model uses the same switch: SwiGLU"
- **Title.** EN: *Why do top LLMs all use the same weird activation?* / ZH: 《为什么顶级大模型都用同一个"开关"？》
- **ONE idea.** Nonlinearity is what makes a network able to approximate anything. Modern LLMs use a *gate that is
  separate from the content* (SwiGLU), and shrink the layer to 2/3 width so the cost stays the same.
- **Hook.** A row of valves. ReLU slams shut on every negative: "dead ReLU", neurons as zombies.
- **Core visual.** Glass water pipes (three.js) with valves.
  - ReLU: a one-way check valve.
  - SiLU: a soft valve that leaks a little below zero.
  - SwiGLU: a second pipe whose flow turns the first pipe's valve handle (gate from another projection).
  - A balance scale shows 2 pipes of width 4h = 3 pipes of width 2.67h (8h² = 3·h·d_ff).
- **Wow.** The width-compensation trick: three thinner pipes carry the same flow budget as two wide ones.
- **Comedy.** "ReLU：负数？不存在的。" A zombie-neuron gag ("dead ReLU") with the cat poking a dead neuron.
- **Facts.**
  - Universal approximation (L02 p.14).
  - FFN location (p.15); ReLU / GELU / SiLU / Swish history (pp.16-19).
  - Comparison table (p.21).
  - SwiGLU d_ff = 2/3 × 4h ≈ 2.67h (L03 pp.2-4).
  - d_ff/d_model: PaLM 4.00, LLaMA 70B 2.68, Qwen 14B 2.67 (L03 p.35).
- **Traps.**
  - p.20 lists Claude 4, Gemini 2.5 and Grok-3 as SwiGLU users. Closed-model architectures are not public:
    **(unverified), do not repeat**.
  - Gemma's exact gated variant (GeGLU vs SwiGLU) is (unverified).
  - "Dead ReLU" means zero gradient for negative inputs, not literally dead weights.

### L03: Attention, KV cache, GQA/MLA, hyperparameters

#### L03-A "AI's memory is bigger than its brain" (Season 1 #3)
- **Title.** EN: *Why can an AI's memory cost more than the AI itself?* / ZH: 《AI的"记忆"，比它的"脑子"还大？》
- **ONE idea.** To avoid recomputing, the model stores keys and values for every past token (the KV cache). It grows
  with every token, so long contexts explode memory, and GQA/MLA exist to shrink it.
- **Hook.** "One prompt. 2 GB of memory. Before the AI says a word." (Llama-3-8B-shaped model with plain multi-head
  attention, 4k prompt.) Then a 1M-token prompt: 488 GB.
- **Core visual.** A library behind the model.
  - Every new token adds a pair of books (K and V) to every shelf (layer × head). three.js instanced books stack into a
    skyscraper as the prompt grows.
  - **GQA**: 32 readers share 8 shelves, and the tower drops 4×.
  - **MLA**: vacuum-sealed storage bags compress each pair into one thin latent; the tower drops ~14×.
- **Wow.** One continuous pull-back from one token's 512 KB to the 1M-token tower, then the two compressions collapse
  it in two beats.
- **Comedy.** "AI不是记性好，是记性贵。" The cat knocks one book out and the whole tower re-computes (a recompute
  gag, shown sparingly).
- **Facts.**
  - Per-token KV = 2 × layers × kv_heads × head_dim × 2 bytes (L03 p.12).
  - Hypothetical MHA (p.12): 8B-shape 512 KB/token, 2 GB @4k, 488 GB @1M; 70B-shape 2.5 MB, 10 GB, 2.44 TB.
  - GQA ratios: Llama 3 8B 32→8 (4×); 70B 64→8 (8×); 405B 128→8 (16×) (p.14).
  - MQA 32-128× reduction "often at the cost of quality" (p.13).
  - MLA worksheet: 36 KB vs 512 KB per token (~14×), 90 KB vs 2.5 MB (~28×), ~142 KB vs 8 MB (~56×) (L04 p.5).
  - DeepSeek-V2 setting: d_c = 4·d_h, d_h^R = d_h/2, which equals GQA with ~2.25 groups (L03 p.20).
  - Derived: real Llama-3-8B (GQA, 8 KV heads) = 128 KiB/token.
- **Traps.**
  - The MHA numbers are **hypothetical** (the slide says so); real Llama 3 uses GQA. Batch size = 1; FP16.
  - The 405B 1M-token figure "~7.69 TB" does not follow from the formula (8,257,536 B × 10⁶ ≈ 7.5 TiB). Say "about
    7.5 TB" or "terabytes".
  - MLA is not free: in absorbed form it adds compute, and vLLM skips absorption for short contexts (L04 p.6).
  - "MLA gives better perplexity" comes with the instructor's "My Guess" explanations (L04 p.3). Present it as a
    hypothesis.

#### L03-B "Why labs overfeed their models"
- **Title.** EN: *Chinchilla said 20 tokens per parameter. Llama 3 ate 215.* / ZH: 《大模型为什么要"吃撑"？》
- **ONE idea.** "Compute-optimal" (about 20 training tokens per parameter) minimizes *training* cost. Labs overtrain
  smaller models on purpose because a smaller model is cheaper to run forever after.
- **Hook.** A rice bowl per parameter: GPT-3 gets 2 grains, Chinchilla 20, Llama 3 70B 215.
- **Visual.** A bar race of bowls (q5.js ink-brush rice grains); then a cost ledger split into "train once" vs "serve
  forever".
- **Wow.** Chinchilla 70B beating GPT-3 175B (a smaller model with more data).
- **Comedy.** "你妈给你买大一号的衣服：'你还会长的'——训练多花点，上线少花点。"
- **Facts.**
  - Chinchilla 70B beats 175B GPT-3 (L01 p.11).
  - Tokens/parameter: GPT-3 2, Chinchilla 20, LLaMA 65B 22, Llama 2 70B 29, Mistral 7B 110, Llama 3 70B 215 (L03 p.33).
  - Depth/width ratios (p.34); critical batch size 4M-16M+ tokens (p.36).
- **Traps.**
  - "20×" is an approximation.
  - Mistral's training-token count is not officially published (unverified); keep it as "per the course slide".

#### L03-C (optional, niche) "Four clones of you in a meeting" (hyper-connections / mHC)
- **ONE idea.** Residual streams can be widened into n parallel streams that mix. DeepSeek's mHC keeps the mixing
  matrix doubly stochastic so the numbers stay stable.
- **Facts.** L03 pp.28-31: ByteDance Hyper-Connections 2025; DeepSeek mHC 2026; "the person has 4 clones" analogy;
  Birkhoff matrix, rows and columns sum to 1.
- Good for a later season; too abstract for Season 1.

### L04: Distributed training foundations

#### L04-A "584 years on one GPU" (Season 1 #7)
- **Title.** EN: *Training Llama 3 on one GPU would take 584 years.* / ZH: 《训练一个大模型，一张显卡要584年》
- **ONE idea.** Frontier training needs so much arithmetic that it only fits in time if tens of thousands of GPUs work
  as one. The real engineering is making them cooperate.
- **Hook.** One GPU on a pedestal with a progress bar: "ETA 584 years". ZH line: "要是从明朝正统年间开始训，今天刚好训完。"
  (2026 − 584 = 1442, Ming Zhengtong 7; derived.)
- **Core visual.** 毕导-style blackboard math in chalk (q5.js), each factor dropping in as a physical object:
  - 405B parameters as a stack of punch cards
  - 15T tokens as a river
  - × 6 → 3.645×10²⁵ FLOPs
  - ÷ 1,979 TFLOPS → 584 years
  - ÷ 16K GPUs → ~2 weeks
  - × 2 (40% utilization) × 2 (FP16 instead of FP8) → ~54 days

  Then a three.js pull-back: GPU → 8-GPU node → 256-GPU NVLink pod → a field of 16,384 GPUs lit like a city at night.
- **Wow.** One continuous zoom-out from a single chip to a data-center campus (use a real aerial photo with clear
  licensing, as the launch film did with CC photos).
- **Comedy.** The progress bar's "remaining time" estimate jumps around like a Windows file copy. The cat sleeps on the
  GPU for 584 years (time-lapse with the seasons changing).
- **Facts.**
  - 6 × 405×10⁹ × 15×10¹² = 3.645×10²⁵ FLOPs (L04 p.11).
  - H100 FP8 peak 1,979 TFLOPS → ≈584 years (p.12); 16K H100 → ~13.5 days (p.13); MFU 40% and FP16 → ×4 ≈ 54 days
    (p.13).
  - Hardware table, H100 / B200 / Rubin (p.17): 80 / 208 / >300 B transistors; 80 / 192 / ~288 GB HBM; 3.35 / 8 /
    22 TB/s.
  - NVLink ~900 GB/s vs ~50 GB/s per InfiniBand card (p.18); SuperPOD 32 nodes × 8 = 256 GPUs (p.19).
  - xAI Colossus: 100k H100 (2024/08) → 555K → 1M planned 2026 (p.16).
- **Traps.**
  - 1,979 TFLOPS is H100 SXM FP8 **dense** (3,958 is with sparsity; verified via the NVIDIA datasheet figures). BF16
    dense is ~989.
  - 584.1 years ÷ 16,000 = 13.3 days and ÷ 16,384 = 13.0 days. The slide's 13.5 is rounded; say "about two weeks".
  - The 54 days is a classroom estimate, **not** Meta's reported training time.
  - Colossus counts, "> 8 million H100 sold" (p.17) and Rubin specs are vendor/press figures (unverified beyond the
    slide).

#### L04-B "This server would fall through your floor" (45-60 s short)
- **Title.** EN: *This AI server would fall through your office floor.* / ZH: 《这台服务器，能把你家楼板压塌》
- **ONE idea.** AI hardware is now engineered at building scale. One NVL72 rack wires 72 GPUs with about 5,000 copper
  cables to act like one giant GPU, and it is too dense for normal floors.
- **Hook.** A rack lowered by crane into an office; the floor cracks (comic slow motion).
- **Visual.** x-ray through the rack to the copper spine (painted cutaway plates keyed over three.js); a floor-load
  gauge needle passing "office 250-500 kg/m²" and "data center 1,000-1,500" to stop at 1,800+.
- **Facts.** L04 p.20: 0.6 m × 1.2 m, 1,300 kg → 1,800+ kg/m²; NVLink 1,800 GB/s; 72 B200; ~5,000 copper cables,
  < 10 m runs; "slab-on-grade only".
- **Comedy.** 装修师傅："你这是放冰箱还是放导弹？"
- **Traps.** "Instant collapse" is the slide's hyperbole; real floors have safety factors. Say "far beyond what office
  floors are rated for". 1,300 / 0.72 = 1,806 kg/m² checks out.

#### L04-C "The Lazy Susan that trains AI" (ring all-reduce)
- **Title.** EN: *How do 1,000 GPUs agree on one number?* / ZH: 《一千张显卡怎么"对答案"？——饭桌转盘算法》
- **ONE idea.** Data-parallel GPUs must add up their gradients every step. Ring all-reduce passes slices around a ring
  so every link carries only 1/N of the data per step, which uses all the bandwidth evenly.
- **Hook.** A round banquet table with a glass turntable (转盘). Every diner holds a different dish's portion. "How
  does everyone get the full set without shouting?"
- **Core visual.** A three.js round table with N GPUs as diners, each tensor split into N plates (A, B, C).
  - Reduce-scatter (N−1 turns): each turn, every diner passes one plate right, and the receiver adds their own portion.
  - All-gather (N−1 turns): finished plates circulate.
  - A tree all-reduce comparison as a waiter relay up and down a family tree. Ring = throughput; tree = latency.
- **Wow.** At 2(N−1) turns every plate on every seat shows A1+A2+A3.
- **Comedy.** "中国人最懂 all-reduce：转盘一转，谁也别抢" + 抢最后一块 when a slow inter-node link (the guest at the
  far table) holds everyone up.
- **Facts.**
  - All-reduce = reduce-scatter + all-gather; ring 2(N−1) steps, M/N per step, latency 2(N−1)(M/(NB) + α); tree
    2·log N steps (L04 pp.34-43).
  - Hierarchical ring: intra-node NVLink ~900 GB/s vs inter-node ~50 GB/s (L05 p.4).
  - NCCL picks Ring/Tree by a cost model (L05 p.7).
  - Meta NCCLX init: 96k GPUs 265 s → 24 s (11×) (L05 p.10).
- **Traps.** The worked example uses 3 GPUs (pp.35-39). Don't animate more data per step than M/N. NCCLX numbers are
  Meta's own (per the slide).

### L05: Data parallelism and ZeRO

#### L05-A "Training a 70B model needs 1 TB. Where does it go?"
- **Title.** EN: *A 70B model needs a terabyte to train. Where does it all go?* / ZH: 《训练70B模型要1TB显存，都花哪儿了？》
- **ONE idea.** The model's weights are the *small* part. Adam's optimizer state takes 12 of the 16 bytes per
  parameter, and ZeRO stops every GPU from storing the same copy.
- **Hook.** A suitcase labeled "70B". It opens and keeps unpacking: weights 2 bytes, gradients 2, optimizer 12.
- **Core visual.** 合租 (16 roommates).
  - Plain DP: every roommate buys their own fridge, sofa and wardrobe (full copies).
  - ZeRO-1 shares the wardrobe (optimizer); ZeRO-2 also the sofa (gradients); ZeRO-3 everything, with each item
    fetched from a neighbour right before use (all-gather).
  - Memory towers per GPU drop below an 80 GB H100 line.
- **Wow.** 1,043 GB total → ~65 GB per GPU with ZeRO-3 on 16 GPUs: the tower dips under the red line.
- **Comedy.** "每人一台冰箱 vs 共享冰箱，饿了去隔壁拿" + the cost: ZeRO-3 means 1.5× the talking (the neighbour
  knocks on your door every layer).
- **Facts.**
  - Memory: FP16 weight + grad 2+2 B, FP32 m, v and master 4+4+4 B; K = 12 (L05 p.18).
  - Stage diagrams (p.20); ZeRO-1/2 no extra communication under the (N−1)/N ≈ 1 approximation (p.22); ZeRO-3 1.5×
    (pp.25-26); prefetch overlap (p.27).
  - Worksheet (L06 pp.2-3): weights 130.4 GB, grads 130.4 GB, optimizer 782.3 GB, total 1,043.1 GB; per GPU on 16
    GPUs: ZeRO-1 309.7 GB.
- **Traps.**
  - **L06 p.3**: the worksheet uses 134.4 where the weights term is 130.4. Correct values are ZeRO-2 = 187.4 GB and ZeRO-3 = 65.2 GB (the
    slide shows 187.7 / 65.7).
  - "GB" here is GiB (÷1024³).
  - Activations are not counted, so "fits in 80 GB" is only about states.

#### L05-B "Hide the talking behind the thinking" (compute/communication overlap; lab tie)
- **ONE idea.** Communication stops costing time when it runs *while* the GPUs compute. Dependency analysis shows which
  transfers can be hidden.
- **Visual.** A restaurant pass: the chef cooks layer N while the runner carries layer N+1. Gantt bars slide under each
  other.
- **Facts.**
  - Backward-pass gradient computations don't depend on all-reduce, so all-reduce stays off the critical path (L05
    p.15).
  - Bandwidth ≥ FLOPS·DP / (2·tokens) back-of-envelope (p.16).
  - ZeRO-3 layer-ahead all-gather (p.27); MegaScale fused AllGather+GEMM (L07 p.35).
- **Lab tie.** Syncopate (OSDI'26, "automatic chunk-centric compute-communication overlap") and Mercury (SOSP'25,
  L09 pp.35-39). Their numbers are (unverified, no brief yet).

### L06: Pipeline and tensor parallelism

#### L06-A "The GPU assembly line's 摸鱼率" (Season 1 #8)
- **Title.** EN: *Why GPUs on an assembly line spend time doing nothing* / ZH: 《流水线上的显卡，为什么总在摸鱼？》
- **ONE idea.** Pipeline parallelism splits the model's layers across GPUs like stations on an assembly line. Stations
  idle while the line fills and drains (the "bubble"); smarter schedules squeeze it out.
- **Hook.** Four GPU workers on a dumpling line (擀皮 → 包馅 → 捏边 → 下锅). At t=0, three of them stand idle. Caption:
  "摸鱼率 75%".
- **Core visual.** A three.js conveyor with 4 stations; micro-batches as dumplings; a Gantt chart draws itself
  underneath in the slide's colors.
  - More micro-batches → the bubble shrinks to (N−1)/M.
  - 1F1B → same bubble, but each worker holds fewer half-made dumplings (memory).
  - Interleaving → each worker runs two non-adjacent stations.
  - Zero-bubble → backward split into urgent and deferrable parts.
  - DeepSeek DualPipe → a *second* belt runs the other way and fills the gaps.
- **Wow.** DualPipe: two belts, opposite directions, the gaps interlock like a zipper.
- **Comedy.** "摸鱼率 = (N−1)/M" as a formula card. The cat as the line supervisor with a stopwatch.
- **Facts.**
  - GPipe (L06 p.6); P2P activations (p.7).
  - Bubble ratio (N−1)/M; non-bubble M·N of (N−1+M)·N slots (p.13).
  - 1F1B in-flight micro-batches O(N) vs O(M) (pp.11-12).
  - Interleaved bubble (N−1)/(M·L), L× more communication (p.16).
  - Megatron default L = 2-4 (p.18); zero-bubble ILP/heuristics (pp.19-20).
  - DualPipe stores 2 copies of the parameters (p.21).
  - Worksheet bubbles: AFAB 100% vs 1F1B 83.3% with an uneven first micro-batch (L07 p.4).
- **Traps.**
  - AFAB and 1F1B have the **same** bubble ratio for uniform micro-batches (p.13). 1F1B's win is memory.
  - The slide's bubble ratio is idle/useful, not idle/total. Pick one and label it.

#### L06-B "Cut one matrix across 8 GPUs" (tensor parallelism)
- **ONE idea.** Tensor parallelism slices each weight matrix. Splitting columns then rows needs only one all-reduce per
  block, but it is so chatty that it only pays off inside a fast NVLink box.
- **Hook.** "On a slow network, these GPUs would spend ~80% of their time waiting."
- **Visual.** A layered cake cut by columns, then rows; eight plates; slices reassembled by a ring of waiters.
- **Facts.**
  - Column/row split, skip the all-gather (L06 pp.25-29).
  - Sequence parallelism: all-gather/reduce-scatter conjugate pair (pp.31-33).
  - TP compute/comm ratio = 3h·bandwidth / (FLOPS·TP): A100 at 25 GB/s → 1/4 (comms 4× longer, "~80% wasted"); over
    NVLink 300 GB/s → 3 (L07 p.6).
- **Traps.** The 80% figure assumes no overlap and A100 at 50% utilization.

### L07: Context parallelism and industry 4D recipes

#### L07-A "Reading a million-token book with 8 GPUs"
- **Title.** EN: *How do you split a 1,000,000-token prompt across GPUs?* / ZH: 《百万字的上下文，怎么分给几张卡一起读？》
- **ONE idea.** Attention compares every token with every earlier token, so the work forms a triangle. Context
  parallelism splits the sequence, and ring attention passes keys/values around. A naive split gives one GPU a sliver
  and another a mountain; zigzag folding makes it fair.
- **Hook.** A triangular cake (the causal mask) cut into 4 horizontal strips. GPU 0 gets the tip; GPU 3 gets the base.
- **Core visual.** The triangle as a real slab of layered cake; strips slide to four plates; the ring passes K/V boxes
  plate to plate.
  - Zigzag: cut into 2N strips and pair the thinnest with the fattest (the "top-bottom fold"). Every plate now holds
    equal area.
- **Wow.** The fold: the triangle lifts, flips its tip onto its base, and becomes a rectangle.
- **Comedy.** 分家产 sketch: the eldest brother gets "the pointy bit"; the mother (scheduler) folds it.
- **Facts.**
  - Context windows on the slide: Gemini 3 1M, ChatGPT-5 400K, Grok 4 Fast 2M; attention compute grows
    quadratically, activations linearly (L07 p.8).
  - Ulysses: all-to-all, 4Sh/P volume, crossover ~32K, ~175 TFLOPS at 32-128K, 1M tokens at 54%+ of peak (pp.12-15).
  - Ring attention with async P2P and ping-pong buffers (pp.16-18).
  - Causal imbalance (p.23); striped (p.24).
  - Zigzag ~1.7× and striped ~1.4× vs vanilla ring (8 GPUs, 8k sequence) (p.25).
  - Llama 3 CP uses all-gather (pp.26-27).
- **Traps.**
  - The speedups are from one repo benchmark (zhuzilin ring-flash-attention), not general.
  - Context-window sizes are vendor claims.
  - "Quadratic" applies to attention compute, not to the whole model.

#### L07-B "How the giants actually set the knobs" (4D parallelism + lab's WLB-LLM)
- **ONE idea.** Real training mixes four kinds of splitting:
  - tensor parallelism inside a node
  - pipeline across nodes
  - context parallelism for long sequences
  - data parallelism for the rest

  Packing documents of very different lengths makes some GPUs wait. The lab's WLB-LLM rebalances that.
- **Visual.** A 4D Rubik's cube: each cubelet is a GPU, and each face turn is one parallelism axis.
- **Facts.**
  - Nemotron-4 340B on 6,144 H100: TP 8, PP 12 interleaved, DP 16-64 with ZeRO-1 (L07 p.31).
  - DeepSeek-V3 671B/37B on 2,048 H800: DualPipe PP 16, EP 64, DP 2, no TP; 4K → 32K → 128K (p.32).
  - Llama 3 405B on 16,384 H100 (p.33).
  - ByteDance MegaScale: 12,288 GPUs, 55.2% MFU, TP 8, PP 8, DP 192 (p.34).
  - WLB-LLM (OSDI'25, lab): speedups vs Plain-4D up to 1.41× (550M, 128K), 1.33× (7B, 128K), 1.26× (30B, 128K), 1.20×
    (70B, 128K) (p.42).
- **Traps.** WLB-LLM gains are much smaller at 64K (1.06-1.21×), so show both bars.

### L08: Speculative decoding (lab: Yggdrasil)

#### L08-A "The intern who finishes the professor's sentences" (Season 1 #4)
- **Title.** EN: *How a tiny AI makes a giant AI talk 3× faster (without changing a word it would say)* / ZH:
  《让小模型帮大模型"抢答"》
- **ONE idea.** Generating text one token at a time leaves the big model mostly waiting on memory. A cheap drafter
  guesses several tokens; the big model checks them all in one pass. A special accept/reject rule keeps the output
  distribution *exactly* the big model's.
- **Hook.** A 相声 duo on stage. The 逗哏 (drafter) blurts five words ahead; the 捧哏 (big model) answers "对、对、对、
  不对" in one breath.
- **Core visual.**
  - Draft tokens as translucent tiles shooting ahead on a track.
  - The verifier's red ink stamp (real stamp-ink texture already in the xlaunch art) slams ACCEPT/REJECT down the row
    in one motion.
  - The draft becomes a branching tree (SpecInfer / EAGLE).
  - EAGLE-2's tree grows *wide* on a hard spot ("10+2=") and *deep* on an easy one.
  - The GPU-utilization bar sits mostly empty during plain decoding (the "idle computation resource" chart).
- **Wow.** The lab's Yggdrasil: a dynamic tree that grows in equal layers, so the GPU can run it as one static, fast
  kernel. Freeze-frame at the moment the tree snaps into a hardware-friendly shape.
- **Comedy.** The 相声 frame is the comedy: 逗哏 overconfident, 捧哏 deadpan. The last line: 捧哏 rejects the joke
  itself.
- **Facts.**
  - Speculative execution borrowed from CPU architecture; T5-XXL 11B with a T5-small 60M drafter; Chinchilla 70B with
    a 400M drafter (L08 pp.4-5).
  - Acceptance rule min(1, q/p); with q(target) 30% vs p(draft) 20% → accept; 30% vs 40% → accept with probability 75%;
    the residual distribution example (p.6).
  - Code (HumanEval) speeds up more than summarization (XSum) (p.7).
  - Speedup formula (p.15).
  - EAGLE-2: depth 5-6 (coding ~10), acceptance length mostly 3-5 tokens (p.20).
  - DeepSeek-V3 MTP second-token acceptance 85-90% (p.29).
  - Useful at small batch (< 4-32) (p.30); chat TTFT 200-500 ms (p.33); reasoning models are a strong case (p.36).
  - Yggdrasil NeurIPS'25 (p.25).
- **Traps.**
  - "Same output" means the same **distribution** under sampling, and identical text only under greedy decoding.
  - The slides use q = target and p = draft, which is reversed from some papers' notation; keep one convention.
  - Speedup disappears at large batch / throughput serving (p.37).
  - **Slide citation errors**: Medusa is cited "[Dao et al., ICML'24]" (p.10; first author Tianle Cai) and EAGLE-1 as
    "[Dao et al.]" (p.17; Li et al.). Verify before crediting on screen.
  - The "3×" in the title needs a specific source. AWQ's 3× is a different topic. Use "several tokens per step" unless
    a number is sourced.

### L09: ML compilers (invited, Yue Guan; lab ties: Mercury, TLX, TritonGym, KPerfIR, Proton)

#### L09-A "Same recipe, different kitchen" (algorithm vs schedule)
- **Title.** EN: *Why does the same AI code run 10× faster on one chip than another?* / ZH: 《同一道菜谱，为什么换个厨房就快十倍？》
  (The "10×" is rhetorical and must be replaced by a sourced number or dropped; see traps.)
- **ONE idea.** A compiler separates *what* to compute (the algorithm) from *how* to run it (the schedule), and searches
  for the schedule that fits each chip. Triton lets humans write at the level of tiles instead of single threads.
- **Hook.** One 番茄炒蛋 recipe card; two kitchens. In one, a single cook runs back and forth. In the other, 32 cooks
  move in lockstep (a warp).
- **Core visual.**
  - GPU anatomy as a food court: SMs are kitchens; each has registers (cutting board), shared memory (counter) and the
    shared pantry (HBM).
  - Warps are 32 cooks doing the same step.
  - Halide-style schedule changes (tile, reorder, parallelize) rearrange the kitchen while the recipe card stays fixed.
- **Wow.** The "curse of specialization" chart: PyTorch, TVM, Triton, CUDA and PTX on productivity vs performance axes
  as a 3D landscape; the new tile DSLs (TileLang, Gluon, TLX) climb the ridge between them.
- **Comedy.** "一个线程拐弯，全队等他" (warp divergence) as a crosswalk-crowd act-out.
- **Facts.**
  - GPU has many SMs sharing DRAM/L2 (L09 p.3); grid/block/thread (p.4).
  - Warps of 32 threads, SIMT (p.5).
  - Halide PLDI'13: algorithm vs schedule, auto-tuning (pp.16-23).
  - TVM OSDI'18 (pp.26-29); Mercury SOSP'25 (pp.35-39).
  - Curse of specialization (pp.49-53); CUDA / Triton / TVM comparison (p.55).
  - Triton block-level programming (pp.57-64); DSL landscape with TLX "Meta, UCSD" (p.68).
- **Lab tie.** TritonGym (ICML'26, from its brief):
  - 164 operators (139 standard / 13 OOD / 12 DSL)
  - Pass@1 = max abs error ≤ 0.01 vs PyTorch
  - Perf@1 = oracle latency ÷ generated latency; > 1 beats the hand-tuned kernel
  - four agent workflows
- **Traps.**
  - Triton's 2019 paper appeared at the MAPL workshop co-located with PLDI (verify; the slide says "@PLDI'19").
  - Don't rank commercial models from TritonGym (brief pitfall).
  - SIMT divergence serializes the branches; it is not "the whole team waits forever".

### L10: RL systems (invited, Guyue Huang, NVIDIA, "personal opinions")

#### L10-A "How AI learned math by grading its own homework"
- **Title.** EN: *How does AI learn math with no teacher?* / ZH: 《没有老师，AI怎么靠"对答案"学会数学？》
- **ONE idea.** In RL with verifiable rewards, the model writes many answers, a simple checker marks them right or
  wrong, and the model is nudged toward the right ones. In systems terms, *writing the answers* is the bottleneck.
- **Hook.** "12 × 34 = 56." A red ✗, advantage −1. "12×30 + 12×4 = 408." A green ✓, +1.
- **Core visual.**
  - An exam hall: the model fills G answer sheets per problem; a stamping machine grades them; sheets feed a furnace
    labelled "training".
  - Below, the GPU timeline from the slide: long ragged generation bars (the long tail), a tiny CPU verify block, then
    training and weight sync.
- **Wow.** Async RL: the writing hall never stops. Training happens on another floor, and weights (10 GB+) flow back
  through a pneumatic tube.
- **Comedy.** "AI自己刷题自己对答案，比你自觉。" Then the 反转: the slowest student (the long-tail rollout) holds up
  the whole class.
- **Facts.**
  - RLHF vs RLVR (L10 pp.9-10); 12×34 example (p.10).
  - Generation dominates the timeline (p.15).
  - Low-precision rollout with matched FP8 training (Jet-RL) (pp.17-19).
  - Speculative decoding in RL, incl. the draft-training caveat (p.21); suffix-tree drafting from past rollouts (p.22).
  - Async/disaggregated RL (pp.23-24).
  - Data 1-100 MB per batch, weight sync 10 GB+ (p.31).
  - The "RL consumes more and more compute" chart from the xAI Grok 4 livestream (p.13).
- **Lab tie.** JigsawRL (arXiv, "assembling RL pipelines"), FlashEvolve (NeurIPS'26, agent self-evolution): details
  (unverified).
- **Traps.**
  - Credit the speaker and his disclaimer.
  - The Grok chart is xAI's marketing graphic, not a measurement.
  - p.21's "without training the draft model, the final accuracy is lower than no draft model" needs the ReSpec paper
    read before use; the interpretation is (unverified).

### L11: FlexAttention + CUDAGraph (invited, PyTorch team)

#### L11-A "Attention, ordered like milk tea"
- **Title.** EN: *One kernel, a hundred kinds of attention* / ZH: 《注意力机制也能"去冰少糖加珍珠"？》
- **ONE idea.** Most attention variants are just a mask (who may look at whom) or a tweak to the score. FlexAttention
  lets you write each as a tiny Python function and compiles one fast fused kernel that skips the blank tiles.
- **Hook.** A milk-tea order screen: `causal` / `sliding window` / `document mask` / `soft-cap 20`. Each option
  stencils a different pattern on the attention grid.
- **Core visual.** The attention matrix as a terrazzo floor of tiles. Masks are stencils (triangle, diagonal band, block
  diagonal); skipped blocks stay dark and never get "walked on".
- **Wow.** Paged attention through the same API: **<5% latency overhead, 76× higher batch size** in their example.
- **Comedy.** The milk-tea gag is the lab's running reward ("Milk tea included"): score_mod = 加料, mask_mod = 去冰.
- **Facts.**
  - Variants (L11 pp.2-6).
  - Soft-capping in Gemma 2 and Grok-1, softcap = 20 code (p.15).
  - FlexDecoding on par with FlashDecoding; vs SDPA: LLaMA-3.1-8B 1.22×-2.04×, 70B 0.99×-1.66× (p.32).
  - Paged attention <5% overhead, 76× batch (p.39).
  - CUDAGraph trees (p.49).
- **Traps.** 0.99× means sometimes slightly slower. 76× is one Attention Gym example. Pages are PDF indices (no slide
  numbers).

### L12: Quantization

#### L12-A "4 bits is enough?" (Season 1 #6)
- **Title.** EN: *Can you shrink an AI to 4 bits without making it dumb?* / ZH: 《把AI压到4个比特，它还聪明吗？》
- **ONE idea.** Quantization is rounding to a coarse ruler. It works if you protect the few numbers that matter: give
  each small group its own ruler and keep outliers and salient weights accurate.
- **Hook.** Four numbers drop onto a 15-step ruler: 0, 0.8, 1.2, 2.5 → 0, 2, 3, 7. "That's it. That's quantization."
- **Core visual.** Marbles rolling down a smooth ramp, then snapping onto a staircase:
  - INT4 symmetric [-7, 7]: even steps
  - FP4 E2M1: steps bunched near zero (0, 0.5, 1, 1.5, 2, 3, 4, 6)
  - Group-wise scaling: every 128 marbles get their own staircase.
  - Outliers: one skyscraper among bungalows (SmoothQuant's activation plot); "smoothing" moves height from activations
    into weights (Y = X·diag(s)⁻¹ · diag(s)·W).
  - AWQ: 1% of weights wear a gold helmet (scaled before rounding).
- **Wow.** The two-level NVFP4 scaling animation, where tiny blocks have their own scales inside bigger blocks.
- **Comedy.** "电子包浆"—a meme image re-forwarded until it turns green, versus a smartly quantized model that still
  looks crisp.
- **Facts.**
  - Data types: FP32 1/8/23, FP16 1/5/10, BF16 1/8/7, TF32, FP8 E4M3 and E5M2 (H100+), NVFP4 E2M1 (B200+) (L12 p.7).
  - Mantissas cost more hardware than exponents (p.6).
  - RTN example (p.9); granularity (p.10); group size 128 on GPU (p.12).
  - Quantization only saves compute with hardware support (p.13); benefits (pp.16-17).
  - GPTQ: Hessian compensation, 128-512 calibration samples, "a few hours" (pp.20-22).
  - AWQ: 1% salient weights, INT4-g128 ≈ FP16, 3× speedup at batch 1 (pp.24-25).
  - llama.cpp / GGUF blocks of 16-32 (pp.26-27).
  - SmoothQuant W8A8 and LLM.int8 (pp.28-30).
  - NVFP4 "nearly original accuracy, 2-3× speedup" (pp.33-34).
  - QAT straight-through estimator (p.37); QLoRA NF4 (pp.38-39).
- **Traps.**
  - Symmetric INT4 uses [-7, 7], not [-8, 7] (p.9 footnote).
  - "AWQ beats GPTQ" is AWQ's own claim; NVFP4 figures are NVIDIA's.
  - Derived dequantization: 2 × 0.357 = 0.714 (error 0.086). Show the error honestly.

#### L12-B "Why a laptop can run a 70B model" (broad-appeal short)
- **ONE idea.** Weight-only 4-bit quantization shrinks a 70B model to roughly 35 GB of weights. llama.cpp's C/C++
  engine and Apple's unified memory make it runnable at home.
- **Facts.** llama.cpp: pure C/C++, CPU-first, Apple Silicon "first-class citizen", GGUF, K-quants 2-6 bit, i-quants
  (L12 pp.26-27).
- **Traps.** "~35 GB" is derived (70×10⁹ × 0.5 B) and excludes KV cache and overhead. Don't promise a specific Mac
  model runs it (unverified).

### L13: Serving (lab ties: KVFlow, FastTree, ScaleSim, Pancake, AMMA)

#### L13-A "The thermos that reserves a seat" (PagedAttention; Season 1 #5)
- **Title.** EN: *AI servers used to waste over half their memory. An old OS trick fixed it.* / ZH:
  《大模型的内存，一半被"保温杯占座"占掉了》
- **ONE idea.** Each chat's memory (KV cache) used to be reserved as one long block "just in case", so most of it sat
  empty. PagedAttention stores it in small fixed pages anywhere in memory, tracked by a table, the way an operating
  system manages RAM.
- **Hook.** A canteen. A 大爷 puts his thermos on ten seats. Caption: "57% of seats: reserved, empty."
- **Core visual.** A three.js multi-storey car park (or canteen).
  - Old system: each request reserves a contiguous row for its maximum length. Waste is colored by type (reservation,
    internal fragmentation, external gaps).
  - vLLM: valet parking. Cars park in any free 16-slot block, and a ticket (block table) maps "my 3rd block" → "bay 47".
  - Shared prefixes (system prompts) are one parked bus that many passengers ride (prefix caching / RadixAttention
    tree).
- **Wow.** The slide's stacked bars morph live: Orca(Max) 20.4% actually used → vLLM 96.3%.
- **Comedy.** 保温杯占座 is the whole sketch. The 反转: vLLM gives the 大爷 a numbered ticket instead.
- **Facts.**
  - Prefill vs decode, TTFT/TBT (L13 p.2); latency targets (p.3).
  - Three kinds of waste (pp.20-21).
  - ">50% of allocated KV memory wasted" (p.22). Bars: Orca(Max) token states 20.4 / reservation 13.3 / internal frag
    57.3 / external 8.9; vLLM 96.3 used. On an A100 40 GB, parameters take 26 GB (65%) and KV cache >30% (p.22, read
    from the rendered figure).
  - Blocks e.g. 16 tokens, waste ≤ 1 partial block per sequence (p.24).
  - Prefix sharing (pp.26-27); SGLang RadixAttention LRU radix tree (pp.28-32).
  - Mooncake (Kimi) FAST'25 Best Paper (p.34).
- **Lab tie.** KVFlow (NeurIPS'25): "efficient prefix caching for multi-agent workflows" (title only). ScaleSim
  (ICML'26), Pancake, Lookahead Context Engineering: agent-memory serving. Details (unverified).
- **Traps.**
  - "Orca" bars are vLLM's reimplementations (Max / Pow2 / Oracle), not the Orca product.
  - Paging's history ("an old OS trick"): avoid a specific decade unless sourced.

#### L13-B "Why AI pauses, then types fast" (prefill vs decode, batching, PD disaggregation)
- **ONE idea.** Reading your prompt (prefill) is one big parallel job; writing the answer (decode) is a slow
  one-token-at-a-time job. Serving systems mix, chunk or physically separate the two to keep both fast.
- **Hook.** A cursor blinking for half a second, then text streaming.
- **Visual.**
  - Static batching = a restaurant that seats the next group only when the whole table leaves.
  - Continuous batching = 回转寿司: seats refill every plate cycle.
  - Chunked prefill = a big order cut into courses.
  - PD disaggregation = two kitchens joined by a dumbwaiter carrying KV cache.
- **Wow.** Wave quantization as a nerd encore: 168 jobs on an H100's 132 SMs. The second wave runs with 36 of 132
  kitchens lit.
- **Facts.**
  - Chat TTFT < 1 s, TBT ~100 ms; code TTFT ~200 ms, TBT ~50 ms (L13 p.3).
  - ORCA OSDI'22 iteration-level scheduling (pp.8-9).
  - Sarathi chunked prefill, token budget e.g. 512 on A100 (pp.10-13).
  - DistServe / Splitwise, target TTFT 400 ms / TBT 40 ms (pp.14-18).
  - FlashDecoding, LeanAttention (pp.37-39); POD-Attention (p.41); wave quantization (p.42).
- **Traps.** Latency targets are typical values, not standards. PD disaggregation is not always better (p.18).

### L14: MoE (taught by Zhongkai Yu; lab: Patterns behind Chaos, ISCA'26 Best Paper)

#### L14-A "671B parameters, 37B at a time" (**Season 1 #1, pilot**)
- **Title.** EN: *DeepSeek has 256 experts. Each word sees only 8.* / ZH: 《6710亿参数，每次只用370亿：大模型里的"专家门诊"》
- **ONE idea.** A Mixture-of-Experts model is huge but sparse: a router sends each token to a few small "expert"
  networks, so you get a giant model's capacity at a fraction of the compute. The hard part moves to traffic, and the
  traffic turns out to be predictable.
- **Hook.** A hospital lobby with 256 specialist doors. A token-patient takes a ticket; the triage desk lights exactly 8
  doors. Big number: "671B in the building. 37B on duty."
- **Core visual.**
  - A three.js hospital atrium (painted interior plates over a three.js layout) with 256 consulting rooms around a
    multi-storey well.
  - Tokens are patients with glowing tickets; the router is the triage nurse; top-k sends each to 8 rooms.
  - Act 2: popular rooms get long queues (load imbalance) while others never see a patient ("most experts are never
    trained" without balancing). The balance rule (aux loss → DeepSeek's bias term) adds a discreet "please try room
    117" sign.
  - Act 3: the hospital spans many buildings (GPUs). Patients now ride shuttles between buildings (all-to-all), and the
    shuttle traffic jams.
- **Wow (twist).** Time-lapse the shuttle traffic from above. What looked like random headlights resolves into highways:
  - the same rooms chosen layer after layer
  - pairs of rooms that are always visited together
  - square blocks in the co-activation heatmap

  Cut to the lab's paper title, "Patterns behind Chaos", and the Best Paper medal. Forecast the traffic, move the
  experts before the rush.
- **Comedy.**
  - "专家号永远挂不上" — the hot-expert queue as 挂号 culture.
  - Callback: the cat sneaks into the empty rooms and naps (the never-visited experts).
  - Closing card: "Only 5.5% of the brain works per word. Same as me on Monday."
- **Facts.**
  - MoE milestones: 1991; Google 2017; DeepSeek fine-grained 256 experts 2024 (L14 p.6).
  - Dense Llama-3-70B: all 70B active. Qwen3-235B: 22B active (9.4%); MoE has 3.4× the parameters but activates 0.3×;
    FFN is >80% of parameters (p.7).
  - Model table (p.9): DeepSeek-V3 671B / 36B active, 256 experts, top-8, sparsity 32; Kimi K2 1000B / 32B, 384
    experts, top-8, 48; Llama 4 Maverick 400B / 17B, 128 experts, top-1, 128; Mixtral 8x7B 45B / 13B, top-2.
  - Top-k is discontinuous; unselected experts get zero gradient (pp.11-15).
  - Load-balance loss (p.16); DeepSeek-V3 auxiliary-loss-free bias (p.17).
  - Expert parallelism = all-to-all + imbalance (pp.21-23).
  - DeepSeek-V3 serving: prefill 32 GPUs (attention TP4 DP8, MoE EP32); decode 320 GPUs EP320 (256 routed experts + 64
    for shared/redundant); H800 NVLink 160 vs 450 GB/s (p.26).
  - Limited routing ≤ 4 nodes with "the square patterns we observed in our paper" (p.28).
  - IB 50 GB/s vs NVLink 160 → 3.2 experts per node, ~13 experts with no extra cost (p.29).
  - MegaScale-Infer disaggregates attention and FFN (p.35).
  - Patterns Ob1-Ob5 (pp.38-46, arXiv 2510.05497).
  - Lab post copy (`social/x/build.py`): 4 MoE models (200B-1000B), 24,000+ requests; 6.6× average speedup on
    wafer-scale GPUs, up to 1.25× on today's GPUs.
- **Traps.**
  - Active parameters: 37B (L07 p.32) vs 36B (L14 p.9). Pick one and cite it; DeepSeek's own report is the arbiter
    (unverified).
  - The 1991 paper is Jacobs, Jordan, Nowlan & Hinton ("Hinton proposed" on p.6 over-credits).
  - "Experts" are not topic specialists in a human sense. The slides show overlap across subjects (p.44); don't label
    rooms "math", "poetry".
  - Don't claim MoE alone explains DeepSeek's cost.
  - The 6.6× is on **wafer-scale** hardware (simulated or projected?). Check the paper's wording before saying "6.6×
    faster" without the qualifier (unverified).

#### L14-B "Why don't we put the brain and the experts in the same room?" (attention/FFN disaggregation; Season 2)
- **ONE idea.** At decode time, attention is memory-hungry and MoE layers want big batches. Splitting them onto
  different machines lets each scale on its own.
- **Facts.** L14 pp.32-35 (MegaScale-Infer: ping-pong pipeline, M2N communication).

---

## 4. Quantum episodes (from the lab's material + basics)

The lab's quantum course (CSE 291P Quantum Computing Systems, Fall 2025) covered:
- qubits, gates and measurement
- reversible logic / oracles
- Deutsch-Jozsa, Simon, Shor, Grover
- gate synthesis and qubit mapping
- surface code / Stim
- QEC decoders and NVIDIA tools
- stabilizer codes, transversal gates, magic states
- threshold theorem

Its slides were not in this set, so basics below stay at textbook level and lab-specific facts come only from the
sources listed in §1.

#### Q1 "Schrödinger's cat, but it's our lab cat" (qubit basics; Season 2 opener or a 60 s primer)
- **Title.** EN: *A qubit is not "0 and 1 at the same time". Here's what it is.* / ZH: 《量子比特不是"同时是0和1"》
- **ONE idea.** A qubit's state is a point on a sphere. Gates rotate it; measuring snaps it to a pole, with
  probabilities set by where it pointed.
- **Hook.** The lab cat in a box; the box lid shows a globe. "Our lab really has a Schrödinger's cat."
- **Visual.** The Bloch sphere as a real-looking globe. The lab footer already renders a WebGL Earth (picasso-footer-globe
  skill), a visual callback for site visitors. Gates are rotations of the globe; measurement drops a marble to the
  north or south pole, and repeated drops build a histogram.
- **Wow.** Two globes linked by a thread that stays taut (entanglement) when one is measured.
- **Comedy.** The cat refuses to be measured.
- **Facts.** State vector in Hilbert space; gates are unitary matrices; measurement (F25 course schedule, lecture 1
  topic list).
- **Traps.**
  - Avoid "both at once" and "tries all answers in parallel" clichés.
  - The Bloch sphere represents a *single* qubit's pure state only.
  - Entanglement cannot be drawn as a thread that transmits signals (no faster-than-light messaging).

#### Q2 "Excuse me, can we swap seats?" (qubit routing, SABRE; **Season 1 #9**)
- **Title.** EN: *If you've run a circuit in Qiskit, you've probably used our lab's algorithm.* / ZH:
  《在IBM的Qiskit里跑过量子程序？你可能用过我们组的算法》
- **ONE idea.** On a chip, a qubit can only interact with its physical neighbours. The compiler keeps swapping qubits
  around to bring partners together, and every swap adds error. SABRE plans the swaps by searching forward and backward
  through the program.
- **Hook.** A high-speed train carriage. Two passengers must hold hands (a two-qubit gate) but sit three rows apart.
  "大哥，能换个座吗？"
- **Core visual.**
  - The chip's coupling map as a carriage seating chart (or 棋盘); qubits are passengers.
  - SWAP is the seat-swap dance (three CNOTs, shown as three small shuffle steps).
  - SABRE's bidirectional trick: run the trip forward, then backward, and use where everyone ended up as a better
    starting seating chart.
- **Wow.** Side-by-side counters of extra swaps, naive vs SABRE (only with the paper's sourced number).
- **Comedy.** 高铁霸座 meme. The 反转: SABRE politely re-plans everyone's seats before the train leaves.
- **Facts.**
  - Li, Ding, Xie, "Tackling the Qubit Mapping Problem for NISQ-Era Quantum Devices", ASPLOS'19 (`pub/pub.html`).
  - Qiskit's SabreSwap docs: "Implementation of the SWAP-based heuristic search from the SABRE qubit mapping paper
    (Algorithm 1) with the modifications from the LightSABRE paper", citing Li, Ding, Xie ASPLOS 2019.
  - Qiskit's transpiler-stages guide: Qiskit uses SabreSwap for routing; SabreLayout runs SabreSwap repeatedly from
    random starting layouts.
  - Search summary of the arXiv abstract (1809.02573): finds optimal mappings on small benchmarks and "reduces the number
    of additional gates by 91%" (verify against the paper text before use).
- **Traps.**
  - Today's Qiskit Sabre includes LightSABRE modifications: say "builds on our algorithm".
  - "Default" holds for routing per the docs; layout defaults vary by optimization level.
  - A SWAP is three CNOTs on most hardware (standard; verify for the specific device shown).

#### Q3 "Atoms in convoy" (neutral-atom compilation, Qubrio; **Season 1 #10, finale**)
- **Title.** EN: *In this quantum computer, qubits have to commute. AI agents found a faster way.* / ZH:
  《这种量子计算机，量子比特要"通勤"——AI找到了更快的路线》
- **ONE idea.** In neutral-atom machines, qubits are single atoms held by laser tweezers. To entangle two, you
  physically move them next to each other under strict traffic rules. Qubrio's LLM agents discovered "convoys": moving
  many atoms in one synchronized move.
- **Hook.** A glowing grid of atoms; one atom crawls alone across the grid; the clock races.
- **Core visual.** Reuse the Qubrio film world (the violet atom array of `projects/qubrio`).
  - A static SLM trap grid; AOD rows and columns as rails that stretch and squeeze but never cross.
  - The entanglement zone lit by one global Rydberg pulse.
  - Placement agent = compass; routing agent = train dispatcher; optimizer = pocket watch (the picture-book metaphors
    the user praised); deterministic verifiers as referees.
- **Wow.** 广场舞阿姨整队平移: whole rows glide together in formation. A counter flips from 1.7 to 30.3 atoms per move
  (GHZ-78).
- **Comedy.** 广场舞 formation discipline: no crossing lines, nobody runs. The LLM agent as the dance captain who
  noticed the buffer spot.
- **Facts (Qubrio site/brief).**
  - Three-level decomposition: input into CZ stages; Placement / Routing / Optimize agents; verifiers localizing
    collisions, adjacency, crosstalk, AOD crossings and trajectory conflicts.
  - Convoy shuttling with buffer positions and continuous motion; 30.3 vs 1.7 qubits per AOD move on GHZ-78.
  - 4.7× lower hardware runtime and 1.3× higher fidelity vs PowerMove; the distilled heuristic recovers 38% of the
    runtime reduction inside PowerMove.
  - NeurIPS'26 (to appear). PowerMove itself is the lab's ASPLOS'25 compiler.
- **Traps (reviewer notes from the Qubrio brief).**
  - The Rydberg pulse is global over the zone.
  - Paired atoms sit close; non-partners sit clearly apart.
  - Rows and columns never cross.
  - The site also states "30.3× speedup on GHZ-78 vs Enola". This is a *different* 30.3 from "30.3 qubits per AOD
    move"; use only one, labelled correctly.
  - Per the house rule against model names in pages, keep the LLM backbone names off screen.

#### Q4 "Why one good qubit needs dozens of bad ones, and who reads the alarms" (QEC + neural pre-decoders)
- **Title.** EN: *Quantum computers spend most of their qubits checking each other.* / ZH: 《量子计算机，大部分比特都在"互相查岗"》
- **ONE idea.** Error correction spreads one reliable "logical" qubit over many physical ones that keep running parity
  checks. A decoder must turn the stream of alarms into a fix in real time, and a small neural "pre-decoder" can clear
  the easy alarms first.
- **Hook.** A Go board (围棋) of qubits; red and blue squares flash like alarms.
- **Core visual.**
  - The rotated surface code as a 围棋 board with red X / blue Z checker plaquettes.
  - Errors light pairs of plaquettes; the main decoder (minimum-weight matching) draws strings between lit pairs.
  - The pre-decoder is a 快递分拣员 (parcel sorter) who removes the obvious local ones first, so the main hub sees a
    sparser board.
- **Wow.** The BB-code reveal. The board wraps into a torus with long-range links: 144 qubits storing **12** logical
  qubits, where the same 144 in a surface code store **1**.
- **Comedy.** "课代表先改选择题，老师只看大题" (the pre-decoder as the class rep).
- **Facts (lab blog, Apr 8 2026).**
  - A surface code stores 1 logical qubit in d² data qubits.
  - The NVIDIA Ising pre-decoder is a 3D CNN on (B, 4, T, D, D) syndrome tensors: R=9 (~913K parameters), R=13 (~1.8M).
  - At p = 0.004 (R=13): d=5 1.47× faster / 1.50× lower LER; d=7 2.03× / 1.66×; d=9 2.12× / 1.56×.
  - BB [[72,12,6]] rate 16.7%; [[144,12,12]] 8.3%; surface d=12 (144 qubits) 0.7%.
  - MLP pre-decoder on [[144,12,12]]: 14× LER reduction at p=0.01, 5.31× at 0.02, fading to 0.94-0.97× above
    threshold.
  - Lab QEC papers: Surf-Deformer (MICRO'24), QECC-Synth (ASPLOS'25), CaliQEC (ISCA'25), iSwitch (ASPLOS'26),
    symmetry-breaking decoders (arXiv 2412.02885).
- **Traps.**
  - The NVIDIA model is NVIDIA's; the lab *evaluated* it and built the BB-code MLP.
  - "LER reduction" is not "speedup".
  - Gains vanish above threshold.
  - Don't say "100 bad qubits per good one" unless derived for a stated distance (d=9 → 81 data qubits plus check
    qubits).

#### Q5 "Error correction on demand" (ion traps, iSwitch; needs the paper first)
- **ONE idea (from title only).** Switch QEC encoding on for the qubits that need it, in place, instead of paying full
  protection everywhere.
- **Visual.** A trapped-ion chain as 冰糖葫芦; selected haws get a sugar shell (encoded) only when they enter the
  dangerous part of the program.
- **Facts.** iSwitch: "QEC on Demand via In-Situ Encoding of Bare Qubits for Ion Trap Architectures", ASPLOS'26. The blog
  cites a related 2025 arXiv, "Flexion: Adaptive In-Situ Encoding for On-Demand QEC in Ion Trap Systems" (same author
  group; whether it is the same work is unverified).
- **Traps.** Everything beyond the title is (unverified) until the paper or brief is read.

#### Q6 "A data center made of quantum computers" (SwitchQNet / distributed QC; needs the paper first)
- **ONE idea (from titles only).** Big quantum programs may span several small quantum machines linked by photons.
  Routing those links through switches is a networking problem, and the lab compiles for it.
- **Visual.** A telephone switchboard (real 1950s photo texture) patching photon links between quantum "rooms".
- **Facts.** SwitchQNet (ISCA'25), AutoComm (MICRO'22), QuComm (MICRO'23), MECH (ASPLOS'24), OnePerc / OneQ / OneAdapt
  (photonic) — titles only.
- **Traps.** No numbers until the papers are read.

---

## 5. Recommended Season 1 (order and why)

| # | Episode | Source | Why here | Lab tie |
| --- | --- | --- | --- | --- |
| 1 | **671B parameters, 37B at a time** (MoE, 专家门诊) | L14 | Pilot (see §6) | Patterns behind Chaos, ISCA'26 Best Paper (in L14 itself) |
| 2 | **7 characters, 1 token** (活字印刷) | L01 | Easiest concept; best Douyin hook; verified locally | course (Ding) |
| 3 | **AI's memory is bigger than its brain** (KV-cache library) | L03 (+L04 p.5) | The "why" behind episodes 4-5; skyscraper reveal | MLA/GQA worksheet; AMMA (MICRO'26, 1M-context serving) as the twist (unverified details) |
| 4 | **The intern who finishes the professor's sentences** (相声) | L08 | A comedic format change keeps the season fresh | Yggdrasil (NeurIPS'25, in L08 p.25) |
| 5 | **The thermos that reserves a seat** (PagedAttention) | L13 | Most relatable gag; clean before/after chart | KVFlow (NeurIPS'25), ScaleSim, Pancake |
| 6 | **4 bits is enough?** (电子包浆) | L12 | Broad appeal ("AI on your laptop") | course; AsymHP / Shfl-BW-type sparsity work as an aside (unverified) |
| 7 | **584 years on one GPU** (from the Ming dynasty to today) | L04 | Turns from serving to training; biggest scale shot | WLB-LLM (OSDI'25) as the closing beat |
| 8 | **摸鱼率** (dumpling line, DualPipe zipper) | L06 (+L07 p.4) | Funniest title; continues the training arc | Syncopate (OSDI'26) on hiding communication (unverified details) |
| 9 | **Can we swap seats?** (SABRE) | lab ASPLOS'19 + Qiskit docs | Opens the quantum line with a "you've used our work" hook | SABRE |
| 10 | **Atoms in convoy** (Qubrio) | Qubrio site/brief | Finale: AI agents compile quantum programs, joining both lines | Qubrio (NeurIPS'26), PowerMove (ASPLOS'25) |

Notes on the arc:
- Episodes 1-6 follow one chat request: tokens → memory → generation → serving → compression. Episodes 7-8 go
  backstage to how the model was trained. Episodes 9-10 turn to the lab's other frontier.
- Each episode's last 5 s can plant the next. Examples: ep. 2 ends on "and each token leaves a memory behind…" → ep. 3;
  ep. 3's skyscraper "…unless someone reserves seats badly" → ep. 5.
- **Season 2 bench:**
  - L04-C Lazy Susan all-reduce
  - L05-A 1 TB suitcase (ZeRO)
  - L07-A million-token cake
  - L13-B 回转寿司 batching
  - L10-A AI grading its own homework
  - L09-A same recipe, different kitchen (+ TritonGym)
  - L02-A cat chased the dog (RoPE)
  - L01-B thermostat
  - L03-B overfed models
  - Q1 qubit basics, Q4 QEC
  - L11-A milk-tea attention
  - L14-B attention/FFN split
- **Short-form fillers (30-45 s):** L01-C receipts, L04-B floor collapse, L12-B laptop 70B.

---

## 6. Pilot recommendation

**Pilot: L14-A "671B parameters, 37B at a time" (MoE + Patterns behind Chaos).**

Against the four criteria:
- **Strong hook.** DeepSeek is a household name in China and well known on X. "671B, but 37B at a time" is one
  surprising number pair, and the 256-door hospital lobby reads without narration in the first 3 s.
- **Most visual.** It has three escalating set pieces, each a natural three.js build:
  - the triage lobby
  - the queues (imbalance)
  - the inter-building shuttles

  The twist is a time-lapse that turns "random" traffic into highways. That is the 何同学-style reveal the user asked
  for in the launch-film feedback ("手机发布会的概念机视频转场的那种惊奇感").
- **Broad appeal.** 挂专家号 is a universal Chinese frustration, and MoE is the architecture of most frontier open
  models (L14 p.9 table). The English version works as "the hospital with 256 specialists".
- **Ties to the lab.**
  - It is the lab's most decorated result (ISCA'26 Best Paper).
  - L14 was taught by its first author (Zhongkai Yu), and the paper is cited on the slides.
  - The lab already has post copy for it (`social/x/build.py`) and a 16 s comic (v2) that was explicitly saved for a
    Best Paper post. Its "magnifying-glass detective finds the pattern" beat can be reused as the twist.

**Risks and how to handle them:**
- It carries two ideas (sparsity, then traffic patterns). Keep the ONE idea as "giant but sparse, and the cost moves
  into traffic", with the patterns as a 15 s twist, not a second lecture.
- Verify DeepSeek-V3's active-parameter number (36B vs 37B).
- Verify the wafer-scale qualifier on 6.6× before putting it on screen.

**Backup / fast-follow pilot: L01-A "7 characters, 1 token."**
- Lowest production risk (type blocks, no characters required), every fact verified locally, and the most universal
  topic.
- Its weakness is no lab-research tie. That is acceptable for episode 2, but weaker as the account's first statement
  as a lab.

---

## 7. Which episodes tie into the lab's papers

| Lab paper (venue) | Episode(s) | Where in the course | What we have |
| --- | --- | --- | --- |
| Patterns behind Chaos (ISCA'26 Best Paper) | L14-A (pilot) | L14 pp.28, 38-46 | Slides + X post copy (4 models, 24,000+ requests, 6.6× wafer-scale, up to 1.25× today's GPUs); v2 comic |
| Yggdrasil (NeurIPS'25) | L08-A | L08 pp.25, 30 | Slide figures only |
| WLB-LLM (OSDI'25) | L07-B, L04-A coda | L07 pp.38-42 | Speedup chart (up to 1.41×) |
| Mercury (SOSP'25), Syncopate (OSDI'26) | L05-B, L06-A coda, L09-A | L09 pp.35-39 | Mercury slides; Syncopate title only |
| TLX, KPerfIR (OSDI'25), Proton (CGO'26), TritonGym (ICML'26) | L09-A | L09 p.68 (TLX "Meta, UCSD") | TritonGym brief (facts), others titles only |
| KVFlow (NeurIPS'25), FastTree (MLSys'25), ScaleSim (ICML'26), Pancake, Lookahead Context Eng. | L13-A, L13-B | L13 pp.26-32 (prefix caching) | Titles only |
| AMMA (MICRO'26, 1M-context attention serving) | L03-A coda, L07-A coda | L07 p.8, L13 | Title only |
| JigsawRL, FlashEvolve (NeurIPS'26) | L10-A | L10 | Titles only |
| AsymHP (NeurIPS'26, sparse attention for video diffusion) | L11-A coda | L11 masks/sparsity | Title only |
| RM-STC (MICRO'23) | L05 aside | L05 p.3 (cited for backward = 2× forward) | Citation only |
| SABRE (ASPLOS'19) | Q2 | not in course | pub list + Qiskit docs |
| Qubrio (NeurIPS'26), PowerMove (ASPLOS'25) | Q3 | not in course | Site + brief (full facts) |
| QEC line: Surf-Deformer, QECC-Synth, CaliQEC, iSwitch, symmetry-breaking decoders; NVIDIA Ising blog | Q4, Q5 | not in course | Blog (full facts); papers titles only |
| SwitchQNet, AutoComm, QuComm, MECH, OnePerc/OneQ/OneAdapt | Q6 | not in course | Titles only |

The `papers/` worktrees are named for exactly these films: amma, flashevolve, iswitch, kvflow, patterns, scalesim,
syncopate, yggdrasil, plus smoke. Their branches (`video/<paper>`) are still at the shared base commit c01942a, except
smoke, which has a WIP snapshot. Writing one fact brief per paper (as was done for the four projects) is the
prerequisite for the coda beats marked "title only".

---

## 8. Cross-cutting accuracy checks (numbers to confirm before use)

1. **L01 p.22**: "1000 as one token". Not the case for cl100k_base and o200k_base (both encode "1000" as ['100','0'];
   verified with tiktoken 0.12.0).
2. **Existing highlight video** (`teaching/291P-W25/lecture1-tokenization-bpe-highlight.mp4`) shows "target vocabulary
   size of 11"; the current L01 p.17 says 13, and 13 is correct.
3. **L03 p.12**: 405B @1M-token KV "~7.69 TB" does not follow from its formula (≈7.5 TiB). The other rows check out.
4. **L06 p.3**: 134.4 used instead of 130.4. Corrected ZeRO-2 = 187.4 GB and ZeRO-3 = 65.2 GB per GPU.
5. **L04 p.13**: "~13.5 days". The arithmetic gives 13.0-13.3. And "54 days" is a classroom estimate, not Meta's
   figure.
6. **L08 p.10 / p.17**: Medusa and EAGLE attributed to "Dao et al." Medusa's first author is Tianle Cai and EAGLE's is
   Yuhui Li (verify before crediting).
7. **L14 p.6**: "Hinton proposed MoE in 1991". The paper is Jacobs, Jordan, Nowlan & Hinton.
8. **L02 p.20**: closed models (Claude 4, Gemini 2.5, Grok-3) listed as SwiGLU users. Unverifiable.
9. **DeepSeek-V3 active parameters**: 37B (L07 p.32) vs 36B (L14 p.9).
10. **L04 p.20 floor "instant collapse"**: hyperbole. Keep it as a joke with the rated-load comparison.
11. **Qubrio site**: two different "30.3" figures (qubits per AOD move; speedup vs Enola).
12. **ChipMATE card vs site mismatch** (DeepSeek V3 / 20-180× vs DeepSeek V4 / ~200×), from its brief. Not a
    main-line topic, but don't let a card number leak into a film.
13. **Invited talks.** L10 carries a "personal opinions, not NVIDIA's" disclaimer (p.3). Credit the speakers in L09-L11
    and L14.
14. **Vendor numbers on slides**: Colossus GPU counts, Rubin specs, NVFP4 accuracy/speed, context-window sizes. Label
    them "per vendor" on screen.

---

## 9. Open items before production

- Read the Patterns behind Chaos paper for the exact 6.6× wording (wafer-scale: simulated vs measured) and the
  DeepSeek-V3 active-parameter figure to use.
- Write fact briefs for Yggdrasil, KVFlow, WLB-LLM, AMMA, Syncopate and iSwitch (one page each, in the Qubrio brief's
  format) so the lab-tie codas can carry real numbers.
- Confirm SABRE's "91% fewer additional gates" in the paper itself (the number came from a search summary of the
  abstract).
- Pull the lecture recordings from Drive only for **voice and anecdotes** (e.g., Prof. Ding's own phrasing of the
  Chinchilla insight). All visuals are rebuilt, per the user.
- X/Douyin duration limits and caption-safe areas: (unverified here); take them from the platform-spec research.

---

## Sources (web)

- [arXiv 1809.02573: Tackling the Qubit Mapping Problem for NISQ-Era Quantum Devices (Li, Ding, Xie)](https://arxiv.org/abs/1809.02573)
- [Qiskit SabreSwap API docs](https://quantum.cloud.ibm.com/docs/api/qiskit/qiskit.transpiler.passes.SabreSwap)
- [Qiskit transpiler stages guide](https://quantum.cloud.ibm.com/docs/en/guides/transpiler-stages)
- [Qiskit generate_preset_pass_manager docs](https://quantum.cloud.ibm.com/docs/en/api/qiskit/qiskit.transpiler.generate_preset_pass_manager)
- [NVIDIA H100 datasheet](https://resources.nvidia.com/en-us-gpu-resources/h100-datasheet-24306) and [Hopper architecture whitepaper](https://www.advancedclustering.com/wp-content/uploads/2022/03/gtc22-whitepaper-hopper.pdf)
