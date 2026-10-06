# CSE 291P daily explainers: the episode queue

Planned 2026-10-06 from every slide of `course/L01.pdf`-`L14.pdf` (text and page images) and the Drive recordings list. The machine-readable queue is `syllabus.json` (same order, same content); this page is the readable copy. One new English episode every morning at 9:00, in course order, in the approved look of L01-01.

Conventions: slide numbers are PDF page numbers of `course/Lnn.pdf` (git-ignored; `tools/fetch_course.py`). Paths are relative to `.claude/films/edu/` unless they start with `~`. Status: `shipped`, `queued` (Prof. Ding's lectures, cleared to use her voice and slides), `needs-ok` (guest lectures: no voice clips or taped slides until the speaker agrees), `blocked`. Dates assume one episode a day with no gaps; skipping an episode pulls the later ones forward. Every number and name below is a planning note: nothing goes on screen until the episode's `FACTS.md` clears it (the `facts_to_check` lists say where to look first).

## Totals

- Episodes: 53 in all: 1 shipped (L01-01), 38 queued from Prof. Ding's lectures, 13 from guest lectures (needs-ok), 1 blocked (L15, no deck).
- Days: 52 daily slots, 2026-10-07 to 2026-11-27, ~322 min of film (average 6.2 min). Prof. Ding's lectures alone: 38 days.
- The first guest episode is day 29 (2026-11-04, L09-01): ask the guest speakers before then (see Open questions).

## The queue

| Day | Date | ID | Title | Min | Slides | Status |
| --- | --- | --- | --- | --- | --- | --- |
| - | 2026-10-06 | L01-01 | More Is Different (and Expensive) | 4.4 | 9-11 | shipped |
| 1 | 2026-10-07 | L01-02 | How Text Becomes Numbers | 6 | 12-19 | queued |
| 2 | 2026-10-08 | L01-03 | The Size of the Dictionary | 6 | 20-24 | queued |
| 3 | 2026-10-09 | L01-04 | Temperature and Top-p | 7 | 25-34 | queued |
| 4 | 2026-10-10 | L02-01 | Why Chatbots Kept Only Half the Transformer | 5 | 7-12 | queued |
| 5 | 2026-10-11 | L02-02 | The Gate: From ReLU to SwiGLU | 6 | 13-21 | queued |
| 6 | 2026-10-12 | L02-03 | Where Am I? Positional Encoding | 6 | 23-31 | queued |
| 7 | 2026-10-13 | L02-04 | RoPE: Position as a Rotation | 6 | 32-36 | queued |
| 8 | 2026-10-14 | L03-01 | Attention: Who Is Listening to Whom | 5 | 5-10 | queued |
| 9 | 2026-10-15 | L03-02 | The KV Cache and Its Diet | 6 | 11-14 | queued |
| 10 | 2026-10-16 | L03-03 | MLA: Zipping the KV Cache | 7 | 15-20 | queued |
| 11 | 2026-10-17 | L03-04 | The Residual Highway | 8 | 22-31 | queued |
| 12 | 2026-10-18 | L03-05 | The Recipe Card: How Big, How Wide, How Much Data | 5 | 32-36 | queued |
| 13 | 2026-10-19 | L04-01 | 584 Years on One GPU | 5 | 7-14 | queued |
| 14 | 2026-10-20 | L04-02 | From One Chip to a City of GPUs | 6 | 15-21 | queued |
| 15 | 2026-10-21 | L04-03 | Four Ways to Cut the Job | 4.5 | 22-29 | queued |
| 16 | 2026-10-22 | L04-04 | AllReduce: Adding Up a Thousand Homeworks | 7 | 30-44 | queued |
| 17 | 2026-10-23 | L05-01 | Talking While Working: NCCL and Overlap | 6 | 6-17 | queued |
| 18 | 2026-10-24 | L05-02 | ZeRO: Stop Everyone Packing the Same Suitcase | 8 | 18-33 | queued |
| 19 | 2026-10-25 | L06-01 | The Assembly Line and Its Bubbles | 7 | 5-13 | queued |
| 20 | 2026-10-26 | L06-02 | Squeezing Out the Bubbles | 6 | 14-22 | queued |
| 21 | 2026-10-27 | L06-03 | One Matrix, Many GPUs: Tensor Parallelism | 7 | 23-33 | queued |
| 22 | 2026-10-28 | L07-01 | A Million Tokens: Splitting the Sentence | 6 | 7-15 | queued |
| 23 | 2026-10-29 | L07-02 | Ring Attention: Pass the Pages Around the Table | 7 | 16-28 | queued |
| 24 | 2026-10-30 | L07-03 | How the Giants Set the Dials | 7 | 29-42 | queued |
| 25 | 2026-10-31 | L08-01 | Guess, Then Check: Speculative Decoding | 7 | 2-7 | queued |
| 26 | 2026-11-01 | L08-02 | Guess a Tree, Not a Line | 6 | 8-13 | queued |
| 27 | 2026-11-02 | L08-03 | EAGLE: Guess the Thought, Not the Word | 8 | 14-25 | queued |
| 28 | 2026-11-03 | L08-04 | Built-in Guessers, and When Guessing Pays | 7 | 26-37 | queued |
| 29 | 2026-11-04 | L09-01 | How a GPU Runs Your Code | 6 | 2-12 | needs-ok (guest) |
| 30 | 2026-11-05 | L09-02 | What vs How: The Compiler Idea Behind ML | 6 | 12-31 | needs-ok (guest) |
| 31 | 2026-11-06 | L09-03 | Compilers for the Awkward Cases | 5 | 32-48 | needs-ok (guest) |
| 32 | 2026-11-07 | L09-04 | Tiles: Why Kernel Languages Are Back | 6 | 49-68 | needs-ok (guest) |
| 33 | 2026-11-08 | L10-01 | Rewards You Can Check: RL for Language Models | 5 | 4-14 | needs-ok (guest) |
| 34 | 2026-11-09 | L10-02 | RL's Real Bottleneck: The Model Talking to Itself | 7 | 15-25 | needs-ok (guest) |
| 35 | 2026-11-10 | L10-03 | Plumbing an RL System | 5 | 26-33 | needs-ok (guest) |
| 36 | 2026-11-11 | L11-01 | FlexAttention: Every Attention Variant in a Few Lines | 7 | 1-41 | needs-ok (guest) |
| 37 | 2026-11-12 | L11-02 | CUDA Graphs: When the CPU Is the Slow Part | 5 | 42-52 | needs-ok (guest) |
| 38 | 2026-11-13 | L12-01 | How a Computer Writes a Number | 5 | 2-7 | queued |
| 39 | 2026-11-14 | L12-02 | Rounding a Whole Model | 7 | 8-17 | queued |
| 40 | 2026-11-15 | L12-03 | 4-Bit Weights Without Losing the Plot: GPTQ and AWQ | 7 | 19-27 | queued |
| 41 | 2026-11-16 | L12-04 | Outliers: Quantizing Activations and the KV Cache | 7 | 28-35 | queued |
| 42 | 2026-11-17 | L12-05 | Training Through the Rounding: QAT and QLoRA | 5 | 36-40 | queued |
| 43 | 2026-11-18 | L13-01 | Two Clocks: Prefill, Decode and Batching | 6 | 2-9 | queued |
| 44 | 2026-11-19 | L13-02 | Sprint and Marathon: Chunked Prefill vs Disaggregation | 7 | 10-18 | queued |
| 45 | 2026-11-20 | L13-03 | PagedAttention: Virtual Memory for the KV Cache | 6 | 19-27 | queued |
| 46 | 2026-11-21 | L13-04 | Don't Read the Same Prompt Twice: Prefix Caching | 5 | 28-34 | queued |
| 47 | 2026-11-22 | L13-05 | One Query, Idle Cores: Kernels for Decoding | 7 | 35-46 | queued |
| 48 | 2026-11-23 | L14-01 | Mixture of Experts: A Huge Model That Only Wakes a Few | 6 | 3-11 | needs-ok (guest) |
| 49 | 2026-11-24 | L14-02 | Training a Router | 5 | 12-17 | needs-ok (guest) |
| 50 | 2026-11-25 | L14-03 | Serving Experts Across 320 GPUs | 7 | 18-29 | needs-ok (guest) |
| 51 | 2026-11-26 | L14-04 | Experts Have Habits | 7 | 30-47 | needs-ok (guest) |
| 52 | 2026-11-27 | L15-01 | Triton, Gluon and Tile-Based Programming | 6 | none (recording only) | blocked (guest) |

## L01 - Introduction: LLM API Usage + Tokenization

Speaker: Prof. Yufei Ding. Recording: https://drive.google.com/file/d/1gzYhZsAf4IDNTfkfuj4VJKz7e5Og4ZFu/view.
Not used: 1-8 logistics (title, instructor, syllabus, objectives, schedule, grading, staff, reading list); 12 and 25 section outlines; 21 discussion prompt (asked as a question in L01-03); 35 project brainstorm (rate limits); 36 why worksheets; 37 the worksheet itself (its answer is the worked example in L01-03). 9-11 shipped as L01-01.

### L01-01 - More Is Different (and Expensive)

Slides 9-11. 4.4 min, shipped 2026-10-06, status shipped.

**Core idea.** Some abilities only appear at scale, and scale costs a fortune, so the real question is how to scale efficiently, which is why the course exists.

- Emergence: small models score near zero on some tasks, then jump (Wei et al. 2022; Anderson, "More Is Different", 1972).
- The honest footnote: part of the jump is how we score it ("...a Mirage?", NeurIPS 2023).
- The industrial scale: > $100M per frontier run (est.), 100,000-GPU clusters, $500B over 4 years (planned).
- accuracy = efficiency x resources; Chinchilla: 70B on more data beats 280B on the same compute.

**Hook.** Her own line: remember the first time you played with a chatbot, how surprised you were.

**Needs.** nothing. Math: none. Slides to tape on: 9, 10, 11.

**Notes.** Shipped 2026-10-06 (EN, 4:25). Approved look: warm paper, black ink lines that draw themselves, red pen, watercolour washes, her slides taped on, her voice clips with a mic tag and red-bordered captions, logo end card.

**Shipped files.** date: `2026-10-06`; duration_s: `265`; episode_dir: `episodes/l01-5min`; script: `episodes/l01-5min/SCRIPT.md`; film: `episodes/l01-5min/film/`; clips: `episodes/l01-5min/clips.json`; vo_lines: `episodes/l01-5min/vo_lines.json`; slides: `episodes/l01-5min/slides/`; facts: `episodes/l01-1-scale/FACTS.md`; lecture_notes: `episodes/l01-1-scale/notes/ding_on_background.md`; video_en: `~/Downloads/picasso-l01-5min/l01_background_en.mp4`; x_post: `~/Downloads/picasso-l01-5min/x_post.md`; art: `~/Downloads/picasso-l01-art/ (prompts.html, refs/)`

### L01-02 - How Text Becomes Numbers

Slides 12-19. 6 min, day 1, 2026-10-07, status queued.

**Core idea.** A model never sees letters or words: a tokenizer turns text into integer IDs from a fixed vocabulary built bottom-up by BPE, and context, compute and price are all counted in those tokens.

- Why care: context length, compute cost and pricing are all measured in tokens, not characters or words (13).
- A tokenizer maps a string to a list of integers and back; the vocabulary is fixed (14).
- Three granularities: word-level (huge vocabulary, unknown words), character-level (no unknowns, very long sequences), subword (today: BPE bottom-up, Unigram top-down) (15).
- BPE training in four steps: split into characters, count adjacent pairs, merge the most frequent, repeat until the target size (16).
- The worked trace on {low:5, lower:2, newest:6, widest:3}: es (9), est (9), lo (7), 13 symbols (17).
- In practice: tiktoken and Hugging Face tokenizers; the sample sentence is 13 tokens; the same seven Chinese characters are 7 tokens in cl100k_base and 1 in o200k_base (18-19).

**Hook.** Seven Chinese characters: 7 tokens in one tokenizer, 1 token in its successor. Same text, seven times cheaper. What changed?

**Needs.** L01-01. Math: light. Slides to tape on: 15, 17, 19.

**Notes.** Recording: slide 12 at ~24:30, slide 13 at ~24:43; episodes/l01-1-scale/notes/L01_transcript_35min.txt covers to 35:00 (mid slide 15), transcribe the rest. The BPE trace is the centrepiece: letter tiles merging, the red pen circling the most frequent pair each round. Slide 18 is a screenshot of a vendor web tool: redraw, do not tape. In the lecture she says "24 alphabets" (a slip or ASR error; English has 26): do not caption it.

**Check first.**
- Run tiktoken: 13 tokens for the slide-19 sample sentence in cl100k_base; the 7 vs 1 token counts for the Chinese phrase in cl100k_base vs o200k_base.
- BPE trace counts: (e,s)=9 ties with (s,t)=9 in round 1 and (l,o)=7 ties with (o,w)=7 in round 3; say which tie-break rule picks e-s and l-o, or avoid implying they were the unique maximum.
- Vocabulary of the trace: 10 characters + 3 merges = 13.
- Sennrich et al. 2015 (BPE for NMT); Kudo 2018 (SentencePiece Unigram); the slide's note on which commercial model family uses Unigram: verify or drop.
- o200k_base has about 200k entries.

### L01-03 - The Size of the Dictionary

Slides 20-24; + L01 37 (the worksheet question); + L02 4-6 (the worksheet answer: naive vs cached vs retrieval cost). 6 min, day 2, 2026-10-08, status queued.

**Core idea.** A bigger vocabulary packs more meaning into each token but bloats the embedding and output layers and needs more data; and because every call is billed in tokens, you should count them yourself before you send.

- Vocabularies grew: 32,000 (Llama 1/2) to 128,000 (Llama 3) to about 200,000 (o200k, 2024) (20).
- "Smarter": more meaning per step, shorter sequences so more fits in the context window, whole numbers as one token (22).
- "Heavier": the embedding table is vocab x hidden; at hidden 4096, 32k gives ~131M parameters and 200k ~819M; the final softmax scores every entry; rare tokens need much more data (23).
- Count locally: APIs take text but bill tokens; estimate before calling, chunk documents by tokens; 1,000 characters is ~250 tokens of English, 500-750 of code, 700-1,100 of Chinese (24).
- Worked example from the course worksheet: one 10,000-token paper, 5 questions, 300-token answers: $0.1085 naive, $0.0455 with a cached context, $0.034 with retrieval of three 500-token chunks.

**Hook.** Grow a model's dictionary from 32,000 entries to 200,000 and you add almost 700 million parameters before it has learned a thing.

**Needs.** L01-02. Math: light. Slides to tape on: 20, 23, 24.

**Notes.** Slide 21 is a discussion prompt: ask it as the episode's question. The worksheet prices are the slide's list prices for one model at lecture time: show them as "the prices on the course worksheet", not today's prices, and keep the model name off screen if possible. L02 slide 5 has a typo in the cached total ("$0.0175 + $ $0.00175*4"): recompute. Slide 22's "a 128k-vocab model can remember a book that would take 3x the space" is loose: soften or drop. The worksheet answer is at the start of the L02 recording.

**Check first.**
- Vocab sizes: Llama 1/2 32,000; Llama 3 128,256 (slide rounds to 128,000); o200k_base ~200k.
- 32,000 x 4,096 = 131.1M; 200,000 x 4,096 = 819.2M; difference 688M.
- Character-to-token ratios on slide 24: find a source or present as the course's rule of thumb.
- Worksheet arithmetic with $1.75 / $0.175 cached / $14.00 per million input/cached/output tokens: $0.0217 per question; $0.1085 naive; $0.0455 cached; $0.006825 per question and $0.034125 for five with retrieval.

### L01-04 - Temperature and Top-p

Slides 25-34. 7 min, day 3, 2026-10-09, status queued.

**Core idea.** A model outputs a score for every token; decoding decides which to pick: greedy and beam search take the likeliest, sampling picks by chance, temperature reshapes the odds, and top-k / top-p cut off the long tail.

- The API knobs: temperature, top_p, max output tokens, presence and frequency penalties, seed, stream (26).
- Text to tokenizer to token IDs to model to logits: one score per vocabulary entry (27).
- Greedy (always the top token) vs beam search (keep the best few paths) (28).
- Sampling by probability; top-k keeps the k best; top-p keeps the smallest set whose probabilities reach p (29-31).
- Temperature divides the logits before softmax: below 1 sharpens, above 1 flattens; rules of thumb: code 0-0.2, chat ~0.7, creative 0.8-1.2 (32, 34).
- Coda: sample many reasoning paths and take the majority; accuracy keeps rising with test-time compute (33).

**Hook.** Ask the same question twice and get two different answers. That is not a glitch; it is a dial.

**Needs.** L01-02. Math: light. Slides to tape on: 28, 31, 32, 34.

**Notes.** Slides 28-31 reuse figures from Hugging Face blog posts and Holtzman et al.: keep their credit lines visible when taped. Slide 33's plots come from a vendor blog: redraw as a plain rising line or skip. Visual: a bar chart of next-word odds that sharpens and flattens as a temperature knob turns; top-p as a red-pen bracket adding bars until it reaches 0.92. Find the decoding part of the L01 recording with whisper (after ~45:00, estimate).

**Check first.**
- Top-k example k=6 (Fan et al. 2018); top-p example p=0.92 (Holtzman et al., ICLR 2020).
- Softmax with temperature formula as on slide 32.
- Slide 34's recommendation table has no source: present as the course's rule of thumb.
- Self-consistency (Wang et al. 2022) if named; the test-time scaling claim without the vendor's numbers.

## L02 - Transformer Model Architecture Variants (1)

Speaker: Prof. Yufei Ding. Recording: https://drive.google.com/file/d/1XTY6tvcEH5BI3Laa2fPC6o4C_nw-OjnJ/view.
Not used: 1-3 title, syllabus, recap; 4-6 worksheet answer (used in L01-03); 7, 13, 23 outlines; 22 break.

### L02-01 - Why Chatbots Kept Only Half the Transformer

Slides 7-12. 5 min, day 4, 2026-10-10, status queued.

**Core idea.** The 2017 Transformer was an encoder-decoder built for translation; today's large models keep only the decoder, accepting a less exact model because it is simpler, scales better and trains on any text.

- 2017, "Attention Is All You Need": the encoder reads, the decoder writes; "je suis etudiant" to "I am a student" (8).
- Attention lets every position be computed in parallel, the reason it beat recurrent networks (9-10).
- Decoder-only: only causal (masked) self-attention; encoder and cross-attention removed; dominant in frontier models while encoder-decoder survives in niches like translation (11).
- The trade: one-way context is worse on some understanding tasks, but ~1x parameters instead of 1.5-2x and it trains on unpaired text, 10-100x more of it (12).
- "Accurate modeling vs simple modeling": the simple design that scales wins (12; callback to L01-01).

**Hook.** The paper that started it all was about translation. Every big chatbot since threw away half of its design.

**Needs.** L01-01. Math: none. Slides to tape on: 11, 12.

**Notes.** Slides 8-10 are J. Alammar's illustrations: redraw, do not tape. The L02 recording opens with the L01 worksheet answer (used in L01-03).

**Check first.**
- arXiv:1706.03762 (2017).
- Encoder-decoder examples (T5 2019, BART 2019); the 1.5-2x parameter and 10-100x data comparisons are the slide's rough estimates: say so.

### L02-02 - The Gate: From ReLU to SwiGLU

Slides 13-21; + L03 2-4 (worksheet: SwiGLU hidden width 2/3 of 4h). 6 min, day 5, 2026-10-11, status queued.

**Core idea.** The non-linearity inside each feed-forward layer went from ReLU to GELU to SiLU and finally SwiGLU, where a separate gate decides how much content passes, and models shrink the hidden width to 2/3 to pay for the extra matrix.

- Why non-linearity: universal approximation (Hornik 1991); where it sits: FFN(x) = act(xW1 + b1)W2 + b2 (14-15).
- ReLU: cheap, but dead for negative inputs (zero gradient) (16).
- GELU = x * Phi(x), smooth, used by BERT and GPT-1/2; SiLU / Swish = x * sigmoid(x), cheaper; Swish-beta found by a search at Google Brain (17-19).
- Gated linear units: decouple the gate from the content; SwiGLU = x1 * sigmoid(x2) from two projections, now used by almost all top models (20).
- Scorecard: forward and backward cost, healthy magnitudes, dominance (21).
- The bill: a third matrix; keep parameters and FLOPs equal with d_ff = 2/3 x 4h ~ 2.67h, since 8h^2 = 3 h d_ff (L03 2-4).

**Hook.** Almost every big model today uses the same three-matrix trick, and pays for it by shrinking its layer to two-thirds.

**Needs.** L02-01. Math: medium. Slides to tape on: 17, 20, 21.

**Notes.** Slide 14's playground is a third-party tool: redraw. Activation curves are diagrams, fine as ink plots. Analogy: a tap (gate) separate from the water (content). Callback in L03-05 (FFN ratio 8/3).

**Check first.**
- Hornik 1991; GELU definition; Ramachandran et al. 2017 (Swish search); Dauphin et al. 2017 (GLU); Shazeer 2020 (SwiGLU in Transformers) if named.
- Slide 20's model list includes closed models: name only open models with published architectures (Llama, Qwen, DeepSeek-V3, Gemma).
- Width arithmetic: 3 h d_ff = 8 h^2 gives d_ff = 8h/3.

### L02-03 - Where Am I? Positional Encoding

Slides 23-31. 6 min, day 6, 2026-10-12, status queued.

**Core idea.** Attention alone cannot tell word order, so the original Transformer adds sine and cosine waves at many frequencies to each word; shifting a position rotates those waves, so they carry some relative-distance information, but only partly, because they are added to the word itself.

- "The cat chased the dog" vs "The dog chased the cat": without positions attention sees the same bag of words (24).
- Sinusoidal encoding: each pair of dimensions is a clock hand at its own speed, fast hands for local detail, slow hands for global position (25-26).
- Strengths: no extra parameters, values in [-1, 1], a good first guess about distance (26).
- PE(pos + k) = R_k PE(pos), a rotation, so the dot product of two encodings depends only on the offset k (27; proof on 28-30 is self study).
- The catch: queries and keys come from word + position, so the clean relative property is diluted ("How" at 1 with "You" at 3 differs from 2 with 4) (31), which sets up RoPE.

**Hook.** "The cat chased the dog." "The dog chased the cat." To attention without positions, these are the same sentence.

**Needs.** L02-01. Math: heavy. Slides to tape on: 24, 26, 27, 31.

**Notes.** Heavy math: carry it with the clock-hands picture (many hands at different speeds, the red pen marking the angle between two positions); flash at most one proof slide. Haviv et al. 2022 (models without positional encoding still learn positions, slide 24) is an optional honest footnote.

**Check first.**
- PE formula with 10000^(2i/d_model); recompute the d_model = 8 table on slide 26 before showing numbers.
- Rotation identity and the inner-product invariance (28-30).
- Haviv et al., EMNLP 2022 (Findings) title.

### L02-04 - RoPE: Position as a Rotation

Slides 32-36; + L04 2 (recap: RoPE is applied to q and k in every layer). 6 min, day 7, 2026-10-13, status queued.

**Core idea.** Rotary position embedding rotates each query and key by an angle proportional to its position, so their dot product depends only on the words and their distance; slowing those rotations down is how models trained on 4k tokens are stretched to 128k and beyond.

- The family tree: sinusoidal (2017), learned absolute (2018-20), relative (2018-22), RoPE (2021-now) (32).
- RoPE rotates q and k in 2-D pairs; "we know that": the angle between "we" and "know" is the same wherever the phrase sits (33-34).
- Multiplicative, not added: no cross terms between word and position (35).
- Applied to q and k in every layer, not added once at the input (L04 2).
- Stretching context: Position Interpolation (squeeze positions), NTK-aware scaling (slow the low frequencies more), YaRN (finer scaling plus an attention temperature): 4k to 128k to 1M+ (36).

**Hook.** How do you get a model trained on 4,000-token texts to read a million? Slow down its clocks.

**Needs.** L02-03. Math: heavy. Slides to tape on: 32, 33, 36.

**Notes.** The "we know" rotation drawing (slide 33) is a natural ink animation. Slide 34 is from Su et al. (credit). Keep YaRN to one sentence.

**Check first.**
- Su et al. 2021 (RoFormer); Chen et al. 2023 (arXiv:2306.15595, PI); bloc97 / emozilla 2023 (NTK-aware, community); Peng et al. 2023 (arXiv:2309.00071, YaRN).
- The "max context tested" column on slide 36 is approximate: say so.

## L03 - Transformer Model Architecture Variants (2)

Speaker: Prof. Yufei Ding. Recording: https://drive.google.com/file/d/1IuTN9xrW6eR-vVISCW6XMHYACZ4p1D3U/view.
Not used: 1 title; 2-4 worksheet (used in L02-02); 5, 22, 27, 32 outlines; 21 break; 37 self-study reading list.

### L03-01 - Attention: Who Is Listening to Whom

Slides 5-10. 5 min, day 8, 2026-10-14, status queued.

**Core idea.** Self-attention lets every token score how relevant every other token is (query dot key, scaled, softmaxed) and take a weighted mix of their values; several heads do this in parallel, each looking for a different relationship.

- Encoding "it", the model looks back at "the animal" (6).
- The recipe: Q, K, V projections; softmax(QK^T / sqrt(d_k)) V; a 2x2 softmax worked out (7).
- Why divide by sqrt(d_k): the dot product's variance grows with d_k; large logits make softmax one-hot and training unstable (8, self study).
- Many heads: one head links "it" to "animal", another to "tired"; separate Q/K/V per head, concatenated (9-10).

**Hook.** "The animal didn't cross the street because it was too tired." What is "it" looking at?

**Needs.** L02-01. Math: medium. Slides to tape on: 7, 8, 10.

**Notes.** Slides 6, 9, 10 use J. Alammar's illustrations: redraw the "it" lines as ink threads between words (a natural line-art beat).

**Check first.**
- Recompute the 2x2 softmax [[0.119, 0.881], [0.182, 0.818]] from its inputs if shown.
- Variance argument Var(q.k) ~ d_k under unit-variance initialisation.

### L03-02 - The KV Cache and Its Diet

Slides 11-14. 6 min, day 9, 2026-10-15, status queued.

**Core idea.** When generating, a model reuses the keys and values of all earlier tokens instead of recomputing them; that cache grows with layers x heads x context, so modern models let groups of query heads share key/value heads (MQA, GQA) and shrink it 4-16x.

- KV cache: compute attention only for the new token, reuse the cached K and V (11).
- Size per token = 2 x layers x KV heads x head dim x 2 bytes (FP16) (12).
- Hypothetical Llama 3 with plain multi-head attention: 8B ~512 KB per token (~2 GB for 4k tokens); 405B ~8 MB per token, terabytes for a 1M-token prompt (12).
- MQA: one shared KV head (32-128x smaller, quality drops); GQA: groups share, e.g. 8 KV heads (4-16x) (13).
- Real configurations: Llama 3 8B / 70B / 405B with 32 / 64 / 128 query heads and 8 KV heads: 4x / 8x / 16x (14).

**Hook.** Give a 405B model plain multi-head attention and a million-token prompt, and it would need terabytes just to remember what it read.

**Needs.** L03-01. Math: light. Slides to tape on: 11, 12, 13, 14.

**Notes.** Visual: a filing cabinet that grows a drawer per token, then drawers shared by groups of readers. Say batch size 1, as the slide does. GQA is mainly an inference saving (13).

**Check first.**
- Slide 12 mixes binary and decimal units: 405B with MHA is 2 x 126 x 128 x 128 x 2 = 8,257,536 B per token; x 1,000,000 tokens = 8.26 TB (decimal) = 7.5 TiB; the slide's "7.69 TB" is 7,690 GiB. Recompute every cell and use one unit system.
- MQA Shazeer 2019; GQA Ainslie et al. 2023; KV-head counts from the model cards.

### L03-03 - MLA: Zipping the KV Cache

Slides 15-20; + L04 3-6 (MLA recap, worksheet answers (14x/28x/56x), when absorption hurts). 7 min, day 10, 2026-10-16, status queued.

**Core idea.** DeepSeek's multi-head latent attention caches one small compressed vector per token instead of full keys and values, folds the decompression into the query and output projections, and keeps position in a separate small RoPE key: a cache like GQA with 2.25 groups, with quality that held up or improved.

- Not head sharing but compression: a learned low-rank latent c_KV per token (15-16).
- Does decompressing cost the savings back? No: W_UK folds into W_Q and W_UV into W_O by associativity (17).
- Why RoPE breaks the folding (a position-dependent rotation sits in between) and the fix: a decoupled, shared RoPE key (18-19).
- Size: (d_c + d_h^R) per layer per token; with d_c = 4 d_h and d_h^R = d_h / 2 it equals GQA with 2.25 groups (20).
- Worksheet: 14x / 28x / 56x smaller than MHA for the three Llama-3-sized configurations; in the paper, perplexity was even better (L04 3-5).
- Not always a win: absorbed MLA adds compute on short contexts, so serving engines turn it off there (L04 6).

**Hook.** DeepSeek shrank its memory of past words to a few percent, and the model got better, not worse.

**Needs.** L03-02, L02-04. Math: heavy. Slides to tape on: 15, 17, 19, 20.

**Notes.** Visual: a vacuum-packed suitcase that is only unpacked inside the reader's glasses (absorbed into the query). L04 slide 3 lists "My guess" reasons for the better perplexity: present them as her guesses (a voice clip is ideal). Do not show the GitHub issue page from L04 slide 6.

**Check first.**
- DeepSeek-V2, arXiv:2405.04434: d_c = 4 d_h, d_h^R = d_h / 2, 2.25 groups, and the quality comparison.
- Worksheet: layers x 4.5 d_h x 2 bytes: 32 x 576 x 2 = 36 KiB; 80 x 576 x 2 = 90 KiB; 126 x 576 x 2 = 141.75 KiB per token; savings 14.2x / 28.4x / 56.9x.

### L03-04 - The Residual Highway

Slides 22-31. 8 min, day 11, 2026-10-17, status queued.

**Core idea.** Deep transformers train because each block adds onto a clean skip path and normalizes along the way; where the norm sits (post, pre, both) and how many skip lanes there are (hyper-connections, DeepSeek's mHC) are still being redesigned.

- LayerNorm, not BatchNorm: sequences vary, so normalize per token instead of per batch (23).
- RMSNorm drops the mean and the bias: cheaper; Llama-family models use it (24).
- Post-LN vs Pre-LN: Pre-LN leaves the identity path untouched so gradients flow; only early models such as BERT used Post-LN (25).
- Peri-LN: normalize before and after the block, outside the residual path (Gemma 2/3, OLMo 2) (26).
- Hyper-connections: n learnable skip lanes instead of one fixed identity (ByteDance 2025); the weights scale the gradients (28-29).
- mHC: keep the lane-mixing matrix doubly stochastic (Birkhoff): closed under multiplication, entries in 0-1, numerically stable (DeepSeek 2026) (30-31).

**Hook.** A skip connection is one express lane past every block. What if you built four, and how do you keep them from blowing up?

**Needs.** L03-01. Math: medium. Slides to tape on: 23, 25, 28, 30.

**Notes.** Her analogy on slide 31 (attention = listening to others in a meeting; hyper-connections = one person's four clones talking among themselves) is excellent: use it with her voice if the clip is clean. The doubly-stochastic attention references on 31 are self study: skip.

**Check first.**
- Xiong et al. 2020 (Pre-LN); Kim et al. 2025 (Peri-LN) and which models adopted it (the slide also lists a closed model: verify or drop).
- Zhu et al. 2025 Hyper-Connections; Xie et al. 2026 mHC and its 28B-model plot.
- Doubly stochastic matrices closed under multiplication.

### L03-05 - The Recipe Card: How Big, How Wide, How Much Data

Slides 32-36. 5 min, day 12, 2026-10-18, status queued.

**Core idea.** Beyond the architecture, a model is a set of proportions (tokens per parameter, width vs depth, FFN width, batch size), and today's models are deliberately trained far past Chinchilla's 20 tokens per parameter because inference is the bill that keeps coming.

- Tokens per parameter: GPT-3 2, Chinchilla 20, LLaMA 65B 22, Llama 2 70B 29, Mistral 7B 110, Llama 3 70B 215 (33).
- 20x is compute-optimal for training; going far past it pays up front for a smaller, cheaper model to serve (33; callback to L01-01).
- Deep or wide: d_model / n_layer of about 100-200 across models; wider is easier to parallelize and lower latency (34).
- FFN width: 4x d_model for plain activations, 8/3 for gated ones (35; callback to L02-02).
- Batch size in tokens: millions (Llama 3 4M-16M+); the critical batch size idea (36).

**Hook.** GPT-3 read 2 tokens for every parameter it had. Llama 3 70B read 215. Why overfeed a model?

**Needs.** L01-01, L02-02. Math: light. Slides to tape on: 33, 34, 35.

**Notes.** Slide 37 (optimizers, schedules) is self study: skip. Visual: a recipe card with red-pen ratios.

**Check first.**
- Tokens/parameter from the papers: GPT-3 300B/175B = 1.7; Chinchilla 1.4T/70B = 20; Llama 3 70B 15T/70B = 214.
- d_model / n_layer and d_ff / d_model rows (Kaplan et al. 2020 for the depth-width finding).
- Batch sizes (Llama 3 paper; Kaplan et al. critical batch size).

## L04 - Distributed LLM Training: Foundations

Speaker: Prof. Yufei Ding. Recording: https://drive.google.com/file/d/1CuXKsynwNRnn7bs1zQ77OiuWMBK5Vgz1/view.
Not used: 1 title; 2 recap (used in L02-04); 3-6 recap and worksheet (used in L03-03); 7-8, 15, 22, 30 outlines; 14 clip-art cartoon; 45 course survey.

### L04-01 - 584 Years on One GPU

Slides 7-14; + L05 3 (why training is 6 x tokens x parameters (backward = 2x forward)). 5 min, day 13, 2026-10-19, status queued.

**Core idea.** Training compute is about 6 x parameters x tokens; for Llama 3 405B on 15T tokens that is 3.6 x 10^25 FLOPs: centuries on one GPU, weeks on 16,000, which is why training must be distributed.

- Scaling laws: bigger models and more data give lower loss, so the pressure only grows (9).
- The scenario: end of 2023, train a 405B model in four months (10).
- FLOPs ~ 6 x 405B x 15T = 3.645 x 10^25; the 6 is forward 2 + backward 4 (input and weight gradients) (11; L05 3).
- One H100 at 1,979 TFLOPS (FP8, peak): ~584 years (12).
- 16K GPUs: ~13.5 days at 100%; at ~40% utilisation, with failures, in 16-bit instead of FP8: ~54 days (13).

**Hook.** Your manager wants a 405-billion-parameter model trained in four months. On one GPU it would take 584 years.

**Needs.** L01-01. Math: light. Slides to tape on: 11, 12, 13.

**Notes.** Opens the training season. Slide 14's elephant cartoon is clip art: do not use. Visual: one GPU with a calendar flipping centuries, then a field of 16,000.

**Check first.**
- Llama 3 405B: 15T tokens, 16K H100s, BF16, ~38-43% MFU (The Llama 3 Herd of Models, 2024).
- H100 SXM FP8 dense peak 1,979 TFLOPS (3,958 with sparsity).
- 3.645e25 / 1.979e15 = 1.842e10 s = 584 years; / 16,384 = 13.0 days (slide uses 16K = 16,000: 13.5 days).

### L04-02 - From One Chip to a City of GPUs

Slides 15-21. 6 min, day 14, 2026-10-20, status queued.

**Core idea.** A training cluster is a ladder (GPU, 8-GPU node on NVLink, pod, data center), and each step up trades bandwidth for scale (about 900 GB/s inside a node, about 50 GB/s per GPU between nodes), which shapes every parallel strategy that follows.

- xAI's Colossus: 100k H100s in 2024 and growing (16).
- Chips: H100, B200, Rubin: transistors, FP8 / FP4 throughput, memory capacity and bandwidth, price (17).
- Node: 8 GPUs on NVLink ~900 GB/s (18 links x 50 GB/s); leaving the node over InfiniBand ~50 GB/s per GPU (18).
- Pod: an H100 SuperPOD links 32 nodes x 8 = 256 GPUs in one NVLink domain (19).
- Rack scale: GB200 NVL72 meshes 72 GPUs into one big virtual GPU with ~5,000 copper cables; ~1,300 kg on 0.6 x 1.2 m (20).
- The lesson: the network is a ladder of speeds; keep the heavy talk on the fast rungs.

**Hook.** One NVL72 rack weighs about as much as a car, on a footprint smaller than a desk; an ordinary office floor is not built for it.

**Needs.** L04-01. Math: none. Slides to tape on: 17, 18, 19.

**Notes.** Slides 16, 20, 21 contain third-party photos (an aerial photo of Colossus, product photos, a vendor's data hall): do not tape them; paint a generic rack with art/gen.sh if needed (no logos). Visual: the bandwidth ladder as a staircase.

**Check first.**
- Colossus timeline (slide: 100k in 2024, "555K now", "1M in 2026"): verify or drop the later numbers.
- H100 / B200 specs from datasheets; Rubin numbers on the slide are estimates: drop or label "announced".
- NVLink 4 = 18 links x 50 GB/s = 900 GB/s; ConnectX-7 400 Gb/s ~ 50 GB/s; DGX SuperPOD 256 GPUs.
- NVL72 weight (~1.36 t per NVIDIA) and the floor-loading figures on slide 20 (need a source; avoid "instant collapse").

### L04-03 - Four Ways to Cut the Job

Slides 22-29. 4.5 min, day 15, 2026-10-21, status queued.

**Core idea.** To spread training across thousands of GPUs you split the data by batch (DP) or by sequence (CP), and the model by layers (PP) or inside each layer (TP); real systems combine all four, and every GPU holds one shard of data and one shard of model.

- One GPU: a batch of sentences flowing through layers 0-3 (23).
- Data parallel: split the batch (24).
- Context parallel: split each sequence along its length (25).
- Pipeline parallel: split the layers (26).
- Tensor parallel: split each layer's matrices (27).
- 4D: each GPU is one coordinate (DP, CP, PP, TP), the map for the next eight episodes (28-29).

**Hook.** Four knives, one cake: cut a training job by the batch, by the sentence, by the layers, or inside each layer.

**Needs.** L04-02. Math: none. Slides to tape on: 24, 25, 26, 27, 28.

**Notes.** The split diagrams are Meta's ("Scaling Llama 3 Training with Efficient Parallelism Strategies", 2025): credit when taped, or redraw as our own four cuts. Short on purpose: it is the season map.

**Check first.**
- Credit line for the Meta figures.

### L04-04 - AllReduce: Adding Up a Thousand Homeworks

Slides 30-44; + L05 4-5 (hierarchical ring cost; rail-optimized topology); + L06 4 (optional: two-node AllGather worked answer (17T)). 7 min, day 16, 2026-10-22, status queued.

**Core idea.** In data-parallel training every GPU computes a different gradient and all must end with the sum; ring AllReduce does it in 2(N-1) steps with each GPU sending only 1/N of the data per step, tree AllReduce in 2 log N steps, and real clusters do it hierarchically to keep slow links light.

- Data parallel: copy the model, shard the data, sum the gradients (31-33).
- AllReduce: everyone ends with the sum (34).
- Ring: reduce-scatter (N-1 steps) then all-gather (N-1 steps), each step moving M/N (35-40).
- Tree: reduce up, broadcast down, 2 log N steps of full M: low latency for small messages (41-43).
- Hierarchy: reduce-scatter inside the node on NVLink, cross-node on quarter-size pieces, all-gather inside (44; L05 4-5).

**Hook.** A thousand GPUs each finish their homework with a different answer. How do they all get the class total without one doing everyone's sums?

**Needs.** L04-03. Math: medium. Slides to tape on: 35, 39, 41, 43, 44.

**Notes.** The ring steps (35-39) are the animation: coloured A/B/C chunks passing around a circle of desks. Slide 45 is admin.

**Check first.**
- Latency formulas: ring 2(N-1)(M/(NB) + alpha); tree 2 log N (M/B + alpha).
- Hierarchical ring cost terms (L05 4).

## L05 - Distributed LLM Training: DP (ZeRO-1-2-3)

Speaker: Prof. Yufei Ding. Recording: https://drive.google.com/file/d/121v8Gb2OMGhwBXEMIi3x0CEvKCGk8_UY/view. The deck's title slide says "Lecture 6"; the Drive file is Lecture 5. We use the Drive numbering.
Not used: 1 title; 2 schedule changes; 3 (used in L04-01); 4-5 recap (used in L04-04); 6 outline; 12 and 17 class questions (transitions only).

### L05-01 - Talking While Working: NCCL and Overlap

Slides 6-17. 6 min, day 17, 2026-10-23, status queued.

**Core idea.** One line of PyTorch hands communication to NCCL, which maps the hardware and picks ring or tree; and because a layer's gradient AllReduce does not block the backward pass of earlier layers, communication can hide behind computation, up to a point.

- backend="nccl": topology discovery, algorithm and protocol choice, data streamed over several channels (7-8).
- The NCCL toolbox: collectives (AllReduce, AllGather, ReduceScatter), point-to-point Send/Recv, group calls, and which parallelism uses which (9).
- At 100k-GPU scale even start-up matters: Meta's NCCLX initialises 96k GPUs in ~24 s instead of ~265 s (10).
- Overlap: layer i's gradients are ready before layer i-1's, so their AllReduce runs during the rest of the backward pass (13-15).
- Back of the envelope: overlap holds if bandwidth >= (FLOPS x DP) / (2 x tokens) (16).

**Hook.** One line of Python, backend="nccl", and a library starts surveying your cluster like a mapmaker.

**Needs.** L04-04. Math: medium. Slides to tape on: 7, 9, 10, 15.

**Notes.** Slide 13 is a video placeholder (black) and 14 an NVIDIA docs figure: redraw. Slide 11 (library zoo) optional. Slide 17 ("any bugs in our analysis?") makes a cliffhanger into L05-02.

**Check first.**
- Hu et al. 2025, "Demystifying NCCL".
- NCCLX numbers (Meta, "Collective Communication for 100k+ GPUs", 2026): 265 s vs 24 s at 96k, 15 s vs 4 s at 8k.
- Derivation of the bandwidth bound on slide 16.

### L05-02 - ZeRO: Stop Everyone Packing the Same Suitcase

Slides 18-33; + L06 2-3 (worksheet: 70B memory, per-GPU memory under ZeRO-1/2/3 on 16 GPUs). 8 min, day 18, 2026-10-24, status queued.

**Core idea.** Mixed-precision Adam training stores about 16 bytes per parameter, and plain data parallelism copies all of it to every GPU; ZeRO shards the optimizer state, then the gradients, then the weights, cutting memory per GPU for little or no extra communication (1.5x at stage 3).

- The bill: FP16 weights 2 B + gradients 2 B + FP32 Adam moments and master weights 12 B = 16 B per parameter; a 70B model needs ~1 TB before any activations (18; L06 2).
- ZeRO-1: shard the optimizer state; reduce-scatter + all-gather cost the same as one AllReduce (20-22).
- ZeRO-2: shard gradients too; is it strictly better? (23-24).
- ZeRO-3 (= FSDP): shard the weights, gather each layer just in time, ~1.5x communication hidden by prefetching (25-27).
- 70B on 16 GPUs: ~310 GB, ~187 GB, ~65 GB per GPU for ZeRO-1, 2, 3 (L06 3).
- In practice the big pre-training runs mostly use ZeRO-1, which fits pipelines; when DP stops scaling, other parallelism takes over (28-33).

**Hook.** Before a 70-billion-parameter model sees a single word of data, its training state already weighs about a terabyte.

**Needs.** L05-01. Math: medium. Slides to tape on: 18, 20, 27.

**Notes.** Visual: 16 hikers each carrying an identical full suitcase, then splitting the contents. L06 slide 3 has a typo (134.4 for 130.4): use our own numbers. Slide 28 shows excerpts of papers: cite, do not tape the paper text.

**Check first.**
- 16 bytes per parameter with K = 12 (Rajbhandari et al., ZeRO, 2019/2020).
- 70B: weights 130.4 GiB, gradients 130.4 GiB, optimizer 782.3 GiB, total 1,043 GiB; ZeRO-1 309.7, ZeRO-2 130.4 + 912.7/16 = 187.4, ZeRO-3 1,043.1/16 = 65.2 GiB.
- Which runs used ZeRO-1 (DeepSeek-V2/V3, Nemotron-4, Llama 3 reports).

## L06 - Distributed Training: Pipeline Parallelism and Tensor Parallelism

Speaker: Prof. Yufei Ding. Recording: https://drive.google.com/file/d/1SyNSymfwewvLDYiBzd08sU1akmeS8foL/view.
Not used: 1 title; 2-3 worksheet (used in L05-02); 4 worksheet on a two-node AllGather (optional extra for L04-04); 5 and 23 outlines; 34-37 2D tensor parallelism (self study) and homework.

### L06-01 - The Assembly Line and Its Bubbles

Slides 5-13; + L07 2-4 (worksheet: AFAB vs 1F1B timelines and bubble ratios). 7 min, day 19, 2026-10-25, status queued.

**Core idea.** Pipeline parallelism puts groups of layers on different GPUs and passes activations along like an assembly line; micro-batches and one-forward-one-backward scheduling keep more stations busy and memory bounded, but an idle "bubble" of (N-1)/M remains.

- GPipe: stages of layers; point-to-point activations forward, activation gradients backward (6-7).
- Cheap talk: compute grows with h^2, communication with h: compute/communication ratios of 8-16 on A100s (8).
- A naive pipeline idles; micro-batches fill it (all-forward-all-backward) (9-10).
- 1F1B (PipeDream): start backward as early as possible, so in-flight micro-batches peak at O(N) instead of O(M) (11-12).
- Bubble ratio (N-1)/M is the same for both; 1F1B wins on memory, which buys more micro-batches (13).
- Worked example: 3 stages, 3 micro-batches, a heavy first batch: 100% vs 83% bubble (L07 2-4).

**Hook.** Four workers on an assembly line, and for a big part of every shift most of them are standing around.

**Needs.** L04-03. Math: medium. Slides to tape on: 10, 11, 13.

**Notes.** The timelines are the visual: coloured ink blocks filling in, the red pen shading the bubbles.

**Check first.**
- GPipe (NeurIPS 2019); PipeDream (SOSP 2019); bubble ratio formula.
- Slide 8 ratios: 12 x 4096 x 25e9 / 156e12 = 7.9 (forward), 15.8 (backward).
- L07 slide 4 arithmetic (72T vs 66T total, 36T useful).

### L06-02 - Squeezing Out the Bubbles

Slides 14-22. 6 min, day 20, 2026-10-26, status queued.

**Core idea.** Newer pipeline schedules shrink the idle time: interleaving gives each GPU several non-adjacent chunks of layers (bubble divided by L, for L times the messages), zero-bubble schedules split backward into an urgent part and a part that can wait, and DeepSeek's DualPipe runs two pipelines in opposite directions.

- Interleaving / looping (Megatron-LM 2021): each GPU holds 2+ virtual stages; bubble = (N-1)/(M x L) (14-16).
- The cost: L times more communication; layers mixed in time favour ZeRO-1 for the DP part (16-17).
- In practice: Megatron-Core recommends interleaved 1F1B with L = 2-4 (18).
- Zero Bubble (ICLR 2024): backward = input gradient (blocking) + weight gradient (can wait); fill the bubbles with weight gradients (19-20).
- DualPipe (DeepSeek-V3): two pipelines in opposite directions, paid for with two copies of the parameters (21-22).

**Hook.** DeepSeek runs its training pipeline in both directions at once, like two trains on one track that never collide.

**Needs.** L06-01. Math: medium. Slides to tape on: 15, 19, 21.

**Notes.** DualPipe's X-shaped diagram (21) is striking: tape it or redraw as two trains crossing. Skip the config code (18).

**Check first.**
- Narayanan et al. 2021 (Megatron-LM, SC'21); Qi et al. 2024 (Zero Bubble, Sea AI Lab); DeepSeek-V3 report (DualPipe); Chimera 2021 as a precursor.

### L06-03 - One Matrix, Many GPUs: Tensor Parallelism

Slides 23-33; + L07 5-6 (recap and the TP back-of-the-envelope (network vs NVLink)). 7 min, day 21, 2026-10-27, status queued.

**Core idea.** Tensor parallelism splits each big matrix multiply across GPUs; cutting the first matrix by columns and the second by rows runs a whole MLP or attention block with one AllReduce, and sequence parallelism splits the leftover norms and dropout by token, but the talk sits on the critical path, so it needs NVLink.

- Most parameters live in linear projections (Q, K, V, O; up, down): GEMMs (24).
- Column split needs an AllGather; row split needs an AllReduce (25).
- Column then row: skip the AllGather, one AllReduce per block, two per layer (26-29).
- What is left (LayerNorm, dropout) is replicated; sequence parallelism splits it by token, and the AllReduce becomes AllGather + ReduceScatter at the same cost (30-33).
- Back of the envelope: over a 25 GB/s network the talk takes 4x the compute; over NVLink the ratio is ~3, so keep TP inside a node (L07 6).

**Hook.** Cut one matrix by columns and the next by rows, and a whole conversation between GPUs disappears.

**Needs.** L04-04. Math: medium. Slides to tape on: 25, 26, 31, 32, 33.

**Notes.** Slides 34-37 (2D TP, homework) are self study: skip. Visual: a sheet of paper cut into strips along columns, then rows.

**Check first.**
- Shoeybi et al. 2019 (Megatron-LM); Korthikanti et al. 2022 (sequence parallelism).
- L07 slide 6: 3 x 4096 x 25e9 / (156e12 x 8) = 0.25; with 300 GB/s = 2.95.

## L07 - Distributed Training: Context Parallelism

Speaker: Prof. Yufei Ding. Recording: https://drive.google.com/file/d/1k4PwhFVOk-DXG-GQHHciMcO5SFLN0d9m/view.
Not used: 1 title; 2-4 worksheet (used in L06-01); 5 recap; 6 (used in L06-03); 7 and 11 outlines.

### L07-01 - A Million Tokens: Splitting the Sentence

Slides 7-15. 6 min, day 22, 2026-10-28, status queued.

**Core idea.** Long contexts make attention cost grow with the square of the length, so the sequence itself must be split across GPUs; DeepSpeed-Ulysses does it with two all-to-all swaps that turn "each GPU has some tokens of all heads" into "each GPU has all tokens of some heads".

- Context windows of hundreds of thousands to millions of tokens; attention compute ~ length^2, activations ~ length (8).
- Why the earlier sequence parallelism is not enough: attention still needs the whole sequence per head (9).
- Projections are per token, so they combine perfectly with TP; the hard part is softmax(QK^T)V (10).
- Ulysses: all-to-all before attention (gather the sequence, scatter the heads) and after; volume 4Sh/P, constant when S and P grow together (12-14).
- Limits: heads must divide CP x TP; GQA's few KV heads force replication; Ulysses overtakes TP near 32K tokens (15).

**Hook.** Double a document's length and attention costs four times as much. At a million tokens, no single GPU can hold it.

**Needs.** L06-03, L03-01. Math: medium. Slides to tape on: 8, 12, 13, 15.

**Notes.** Visual: a long scroll cut into strips (tokens), then re-dealt as columns (heads): two card deals. Slide 8 lists commercial models' context sizes: say "context windows have reached a million tokens or more" or verify each.

**Check first.**
- Jacobs et al. 2023 (DeepSpeed-Ulysses): 4Sh vs 4Sh/P; ~175 TFLOPS; 54% of peak at 1M tokens.

### L07-02 - Ring Attention: Pass the Pages Around the Table

Slides 16-28. 7 min, day 23, 2026-10-29, status queued.

**Core idea.** Ring attention keeps each GPU's queries at home and passes key/value blocks around a ring, overlapping each hop with computation; with a causal mask the work is lopsided, so striped and zigzag orderings deal the tokens out evenly.

- Each CP shard computes attention for its own queries against every K/V block, one block per round, blockwise like FlashAttention (16-17).
- Overlap: asynchronous send and receive with ping-pong buffers (18).
- With TP: one ring per TP lane; with GQA only one KV head per GPU travels (19-22).
- The causal mask leaves some GPUs with far more work (23).
- Striped (permute the tokens) and zigzag (2N chunks folded top-to-bottom): ~1.4x and ~1.7x on 8 GPUs at 8k (24-25).
- Llama 3's CP: all-gather the small GQA keys/values instead of a ring, to support document masks (26-27).

**Hook.** Eight people at a round table, each holding one page of a book, passing pages to the left until everyone has read every page.

**Needs.** L07-01. Math: medium. Slides to tape on: 17, 23, 25, 27.

**Notes.** The round table is a perfect ink animation; zigzag = folding the causal triangle.

**Check first.**
- Liu et al. 2023 (Ring Attention; venue: the slide says NeurIPS'23, check); Brandon et al. 2023 (Striped Attention); zhuzilin/ring-flash-attention zigzag numbers; Chu et al., ISCA 2025 (Llama 3 CP).

### L07-03 - How the Giants Set the Dials

Slides 29-42. 7 min, day 24, 2026-10-30, status queued.

**Core idea.** Real training runs pick a point in the 4D space by a simple rule (tensor parallel inside a node, pipeline across nodes, context parallel for long sequences, data parallel for the rest), and the published setups of Nemotron-4, DeepSeek-V3, Llama 3 and MegaScale show the rule and its exceptions.

- The rule, ranked by how much each parallelism talks (TP most, DP least) (29-30).
- Nemotron-4 340B on 6,144 H100s: TP 8, PP 12 interleaved, DP 16-64 with ZeRO-1, 4k sequences (31).
- DeepSeek-V3 (671B MoE, 37B per token) on 2,048 H800s: PP 16 (DualPipe), EP 64, DP 2, no TP (32).
- Llama 3 405B on 16,384 H100s: pipeline-data co-design; CP for long contexts (33).
- ByteDance MegaScale: 175B on 12,288 GPUs at 55.2% MFU; fused AllGather+GEMM; decoupled send/recv; cluster management (34-37).
- Coda (self study): packing documents makes 4D workloads uneven (WLB-LLM, OSDI 2025) (38-42).

**Hook.** DeepSeek-V3 trained on 2,048 GPUs and used no tensor parallelism at all. Why skip the most famous trick?

**Needs.** L06-02, L06-03, L07-02, L05-02. Math: light. Slides to tape on: 30.

**Notes.** Slides 31-33 are excerpts of papers: cite, redraw as a mixing desk with four knobs per run. The H800's lower NVLink bandwidth (see L14 slide 26) explains the no-TP choice: cross-check. Closes the training season.

**Check first.**
- Each configuration from its report (Nemotron-4 340B; DeepSeek-V3; Llama 3; MegaScale NSDI'24: 12,288 GPUs, 55.2% MFU).
- DeepSeek-V3 37B activated per token (use the e01-moe FACTS wording).

## L08 - LLM Serving: Speculative Decoding

Speaker: Prof. Yufei Ding. Recording: https://drive.google.com/file/d/1uo6JtnkQlvoNXFam6PI7MGhfplT-iv6z/view.
Not used: 1-2 title and outline; 31 section title.

### L08-01 - Guess, Then Check: Speculative Decoding

Slides 2-7; + L08 30 (why verifying is nearly free at small batch). 7 min, day 25, 2026-10-31, status queued.

**Core idea.** Writing one token at a time leaves a big model waiting on memory, not math; so a small model guesses several tokens and the big model checks them all in one pass, with a rejection rule that makes the output exactly what the big model alone would have produced.

- Why it is nearly free: at small batch, decoding is matrix-vector work and the GPU's compute sits idle (30).
- Roots: blockwise parallel decoding (Google Brain, 2018) (3).
- 2022-23: two papers (Google Research; DeepMind): a small draft model plus the large target, inspired by speculative execution in CPUs (4-5).
- Speculative sampling: accept a draft token with probability min(1, target/draft); if rejected, resample from the leftover max(0, target - draft); the "playing / studying" example (6).
- Speed-ups depend on the task: predictable code vs free-form summaries (7).

**Hook.** A big model writing one word at a time is mostly waiting. So let a small model guess the next five words and the big one just check.

**Needs.** L01-04, L03-02. Math: medium. Slides to tape on: 4, 6, 7, 30.

**Notes.** Opens the serving season. Analogy: an intern drafts, the editor approves in one read. Notation on slide 6 (q = target, p = draft) is the reverse of Leviathan et al.: pick one and stay consistent.

**Check first.**
- Stern et al. 2018; Leviathan et al. (arXiv Nov 2022); Chen et al. 2023 (DeepMind).
- T5-XXL 11B with T5-small 60M; Chinchilla 70B with a 400M draft.
- The acceptance rule reproduces the target distribution exactly.

### L08-02 - Guess a Tree, Not a Line

Slides 8-13. 6 min, day 26, 2026-11-01, status queued.

**Core idea.** Since drafts are cheap, systems draft many continuations at once as a token tree and verify the whole tree in one pass with a tree-shaped attention mask; Medusa drops the separate draft model and adds extra prediction heads to the big model itself.

- SpecInfer: a draft tree such as <2,2,1>; accept the longest prefix that matches any branch (8).
- Verify the tree in one kernel: load the weights once, share the KV prefix, mask by tree topology (9).
- Medusa: four extra heads on the big model guess tokens +1, +2, ...: blockwise decoding revived, with tree attention (10).
- Which tree? A static 64-node sparse tree grown greedily on calibration data: broad for 7B, deep and narrow for 33B (11-12).
- Medusa-1 (frozen backbone) vs Medusa-2 (fine-tuned together): checking 64 tokens costs about one step at batch 1 (13).

**Hook.** If guessing is cheap, why guess one sentence? Guess a whole tree of them and check them all at once.

**Needs.** L08-01. Math: light. Slides to tape on: 8, 9, 11.

**Notes.** Tree in ink with the accepted path in red pen. Do not use Medusa's mascot image (slide 10).

**Check first.**
- Miao et al. 2023 (SpecInfer; LLaMA-7B target with a 68M draft).
- Medusa is Cai et al., ICML 2024 (the slide credits "Dao et al."): fix the citation.
- Vicuna 7B/13B/33B; 70K ShareGPT dialogues.

### L08-03 - EAGLE: Guess the Thought, Not the Word

Slides 14-25. 8 min, day 27, 2026-11-02, status queued.

**Core idea.** EAGLE drafts with one small autoregressive layer that predicts the big model's next hidden feature instead of the next token; EAGLE-2 grows the draft tree where the model is confident; EAGLE-3 trains the drafter on its own mistakes so it scales with data; serving engines now ship it.

- Three designs: separate small model; Medusa (parallel heads); EAGLE (self-draft, autoregressive head on features) (14).
- Speedup = alpha x T_verify(1) / (M x T_draft + T_verify(M)): a heavier drafter is fine if the acceptance length alpha rises (15).
- EAGLE-1: one decoder layer plus the frozen LM head; regression and classification losses; a static tree (16-17).
- EAGLE-2: a dynamic tree, wide where unsure ("10+2"), deep where sure; acceptance mostly 3-5 tokens (18-20).
- EAGLE-3: fuse features from several layers, drop the feature loss, "training-time test" (practise on its own drafts); keeps improving from 1B to 50B training tokens (21-23).
- In practice: a flag in vLLM / SGLang; Yggdrasil makes dynamic trees hardware-friendly (24-25).

**Hook.** EAGLE does not guess the model's next word. It guesses what the model is thinking just before it speaks.

**Needs.** L08-02. Math: medium. Slides to tape on: 14, 15, 18, 23.

**Notes.** Visual: a thought bubble (feature) vs the spoken word. Slide 17 credits "[Dao et al.]" for EAGLE and slide 21 has "NuerIPs25": fix both. Skip the command-line screenshots on 24.

**Check first.**
- EAGLE (Li et al., ICML 2024); EAGLE-2 (Li et al., EMNLP 2024; the slide says Zhang et al., check the author order); EAGLE-3 (Li et al., NeurIPS 2025); Yggdrasil (Leng et al., NeurIPS 2025).
- Acceptance length and depth numbers (20).

### L08-04 - Built-in Guessers, and When Guessing Pays

Slides 26-37. 7 min, day 28, 2026-11-03, status queued.

**Core idea.** Drafts can also come from lookups (past text, n-gram pools) or from extra heads trained into the model from the start (multi-token prediction, as in DeepSeek-V3); either way, speculation pays when latency matters and batches are small, and pays less when the GPU is already busy serving many users.

- Retrieval drafts: REST looks continuations up in a datastore; lookahead decoding keeps an n-gram pool (26-27).
- Multi-token prediction: extra heads trained with the backbone from scratch, which also improves the model (Meta, ICML 2024) (28).
- DeepSeek-V3's MTP modules: 85-90% acceptance for the second token (29).
- When: small batches (under 4-32) and latency-critical uses: a chat's first token in 200-500 ms, search, code completion (30-35).
- Reasoning models: long outputs, long contexts (so small batches), strong patterns: a good fit (36).
- When throughput rules (cheap tokens, big batches) the compute is already busy (37).

**Hook.** A code completion that arrives after you have typed the line is useless. Here is when guessing ahead is worth it, and when it is not.

**Needs.** L08-03. Math: light. Slides to tape on: 26, 28, 29, 30.

**Notes.** Slides 32-37 contain product screenshots, a pricing page and a third-party poster ("The 3 response time limits"): do not tape; use the 0.1 s / 1 s / 10 s thresholds only with a primary source (Nielsen). Avoid naming chat products; say "a chat app", "a code assistant".

**Check first.**
- He et al., NAACL 2024 (REST); lookahead decoding, ICML 2024 (Fu et al.; the slide says Zhang et al., check); Gloeckle et al., ICML 2024 (multi-token prediction); DeepSeek-V3 report (85-90%).

## L09 - Invited talk: Machine Learning Compilers

Speaker: Yue Guan (invited) (guest). Recording: https://drive.google.com/file/d/1rY4ayVpOoeq8VtCX2iVlMO4f5gwT8MGM/view.
Not used: 1-2 title and contents; 69 attendance survey; 70 one-line summary.

### L09-01 - How a GPU Runs Your Code

Slides 2-12. 6 min, day 29, 2026-11-04, status needs-ok.

**Core idea.** A GPU is many streaming multiprocessors sharing one big memory; a kernel launches a grid of thread blocks, each block runs on one SM, threads march in warps of 32, and fast code keeps data in the small, fast memories close to the threads.

- Architecture: many SMs sharing DRAM and L2; each SM with functional units, registers and its own cache (3).
- Kernel, grid, block, thread; blocks scheduled onto SMs (4).
- Warps of 32 threads in lockstep (SIMT): a branch makes half the lanes wait (5).
- The memory ladder: registers, shared memory, global memory (HBM, L2), host memory (6).
- Vector addition end to end: allocate, copy in, launch asynchronously, copy back, free (7-11).
- Then the problem: so many models times so many chips is too many kernels to write by hand (12).

**Hook.** A GPU is thousands of workers who can only march in squads of 32.

**Needs.** L04-02. Math: none. Slides to tape on: none (guest, until OK).

**Notes.** Guest. Slides 3-6 reuse figures from the CUDA Programming Guide: redraw. Fills a gap the course assumes; useful before L09-04, L11 and L13-05.

**Check first.**
- Warp size 32; CUDA API steps; SM/memory hierarchy wording per the CUDA Programming Guide.

### L09-02 - What vs How: The Compiler Idea Behind ML

Slides 12-31. 6 min, day 30, 2026-11-05, status needs-ok.

**Core idea.** Halide's insight, to write the algorithm once and describe the schedule (tiling, parallelism, order) separately and let a search tune it, moved from image processing to tensors (Tensor Comprehensions, TVM) and gave one code path to many chips.

- The kernel explosion: many models x many hardware targets (12-15).
- Halide (PLDI 2013): algorithm vs schedule; the same blur, written naively and expert-fast (16-20).
- Autotuning: generate schedules and search with performance feedback (21-23).
- Tensor Comprehensions (2018): the same idea for tensor programs (24-25).
- TVM (OSDI 2018): graph-level (fusion, layout) and operator-level transformations, template-free tuning (26-31).

**Hook.** The same blur filter, two programs: one a few lines long, one many times faster. Halide's trick: keep "what" and "how" apart.

**Needs.** L09-01. Math: none. Slides to tape on: none (guest, until OK).

**Notes.** Guest. Slide 16's images come from the Halide paper: redraw.

**Check first.**
- Ragan-Kelley et al., PLDI 2013 (with any speed-up quoted from the paper); Vasilache et al. 2018; Chen et al., OSDI 2018.

### L09-03 - Compilers for the Awkward Cases

Slides 32-48. 5 min, day 31, 2026-11-06, status needs-ok.

**Core idea.** The same compile-and-schedule recipe extends to programs that span many GPUs (CoCoNet, Mercury), tensors that are mostly zeros (TACO, Fractal) and shapes that change at run time (DietCode).

- Distributed: CoCoNet (ASPLOS 2022) puts communication in the language; DP and TP become two schedules of one program (32-34).
- Mercury (SOSP 2025): asynchrony through new primitives such as "shift" (35-39).
- Sparse: TACO (formats and loops); Fractal (ASPLOS 2024) groups the zeros into hardware-friendly blocks, with a "perforate" primitive (40-45).
- Dynamic shapes: DietCode (MLSys 2022) splits into micro-kernels with joint schedules (46-48).

**Hook.** What if your tensor is mostly zeros, or changes shape with every request?

**Needs.** L09-02. Math: light. Slides to tape on: none (guest, until OK).

**Notes.** Guest. The most specialised episode in the queue: first to merge or drop if the season needs trimming. Some of these papers may be the speaker's own: check before saying so.

**Check first.**
- Venues and years per paper.

### L09-04 - Tiles: Why Kernel Languages Are Back

Slides 49-68. 6 min, day 32, 2026-11-07, status needs-ok.

**Core idea.** Fully automatic compilers cannot keep up with each new hardware feature, so a layer of domain-specific languages, Triton first, lets programmers write at the level of tiles while the compiler handles threads, memory and tensor cores; newer DSLs go lower (Gluon, TileLang, TLX) or higher (Helion).

- The curse of specialization: new hardware features (tensor cores, TMA, warp specialization) outrun automatic compilers (49-53).
- The performance-productivity map: PTX, CUDA, TVM, PyTorch, and the gap DSLs fill (52-54).
- Triton: program the block, not the thread; the compiler pipelines, prefetches and uses TMA (56-64).
- Who specifies what: CUDA vs Triton vs TVM (55, 65).
- Today's landscape: lower than Triton (Gluon, TileLang, TLX), higher (Helion), distributed (Triton-Distributed, ParallelKitten) (66-68).

**Hook.** Why did GPU programmers stop thinking about threads and start thinking about tiles?

**Needs.** L09-01. Math: none. Slides to tape on: none (guest, until OK).

**Notes.** Guest. L15 (Keren Zhou: Triton, Gluon, tile-based models) continues this story. Slide 69 is an attendance survey: skip.

**Check first.**
- Tillet et al. 2019 (Triton, MAPL at PLDI; the slide says PLDI'19); the DSL organisation table (68).

## L10 - Invited talk: LLM-RL Introduction for System Designers

Speaker: Guyue Huang (invited; NVIDIA) (guest). Recording: https://drive.google.com/file/d/1tk4YQ6zyfoIEsH5YrgjqRJ3XzsznZkLp/view. Slide 3: "All contents in this talk is my personal opinions and not viewpoints of NVIDIA." Keep that framing.
Not used: 1-3 title, about the speaker, disclaimer; 34 references.

### L10-01 - Rewards You Can Check: RL for Language Models

Slides 4-14. 5 min, day 33, 2026-11-08, status needs-ok.

**Core idea.** Reinforcement learning trains a model by letting it act and rewarding the outcome; for language models it started with a learned human-preference reward (RLHF) and now increasingly uses rewards a simple program can verify (RLVR), with advantages measured within a group of answers (GRPO).

- The loop: actor, environment, action, reward and new state, policy update (4-7).
- SFT copies a dataset; RL generates and gets rewarded (8).
- RLHF: train a reward model on human preferences, then PPO (9).
- RLVR: sample G answers to "12 x 34 = ?", a checker gives +1 or -1, compare within the group (GRPO) (10).
- Where it works: math, code, agent tasks; RL takes a growing share of compute (11-14).

**Hook.** 12 x 34 = ? Let the model answer eight times and reward only the answers a calculator agrees with.

**Needs.** L01-04. Math: light. Slides to tape on: none (guest, until OK).

**Notes.** Guest; the speaker's personal views, not his employer's (slide 3). Slides 11 and 13 are third-party charts: redraw or skip.

**Check first.**
- DeepSeek-R1 paper (GRPO, RLVR framing); RLHF pipeline (InstructGPT).

### L10-02 - RL's Real Bottleneck: The Model Talking to Itself

Slides 15-25. 7 min, day 34, 2026-11-09, status needs-ok.

**Core idea.** In LLM reinforcement learning most of the time goes to generating rollouts, which is memory-bound and long-tailed, so RL systems borrow inference tricks (low-precision generation, speculative decoding, suffix-tree drafts from past rollouts) and generate asynchronously, a weight version or two behind training.

- One RLVR step: generate on GPUs, verify on CPUs, train, sync the weights (15).
- Quantized generation: FP8/FP4 rollouts; keep training and generation numerics aligned (Jet-RL) (17-19).
- Speculative decoding in RL: the draft has to keep learning as the policy moves (ReSpec) (20-21).
- History rhymes: earlier rollouts of the same prompt make a suffix-tree draft (RhymeRL) (22).
- Async RL: start the next batch before the weight update; separate generation and training GPUs (23-25).

**Hook.** In RL training for language models, the slow part is not the training. It is waiting for the model to finish its answers.

**Needs.** L10-01, L08-01. Math: light. Slides to tape on: none (guest, until OK).

**Notes.** Guest. Links back to L08 (speculation) and forward to L12 (quantization).

**Check first.**
- Jet-RL, ReSpec, RhymeRL papers.

### L10-03 - Plumbing an RL System

Slides 26-33. 5 min, day 35, 2026-11-10, status needs-ok.

**Core idea.** Large RL systems are a pipeline of trainers, generators, verifiers and tools; moving 10+ GB of fresh weights between differently parallelised GPU groups, shipping rollouts and waiting on CPU-bound tool calls are now the hard problems.

- Weight sync: trainers (expert / pipeline parallel) to generators (tensor / data parallel), point to point (27-28).
- Agents: a model plans, calls tools, reads results (the trip-booking example) (29).
- Agentic RL: tools and verifiers run on CPUs and can become the bottleneck (30).
- A full system: rollout manager, data store, checkpoints; 1-100 MB of data per batch vs 10 GB+ of weights (31).
- Single controller vs asynchronous dataflow, and the open problems (32-33).

**Hook.** Every step, gigabytes of fresh weights have to jump from the GPUs that learn to the GPUs that talk.

**Needs.** L10-02. Math: none. Slides to tape on: none (guest, until OK).

**Notes.** Guest. Merge into L10-02 if the season needs trimming.

**Check first.**
- Slide 31 sizes; LlamaRL; the weight-transfer-in-2-seconds post cited on slide 28.

## L11 - Invited talk: FlexAttention and CUDAGraph

Speaker: Boyuan Feng (invited; PyTorch team) (guest). Recording: none. No recording in the Drive folder: narration only.
Not used: Title slides 1 and 42 only; slides 2-3 are context for L11-01.

### L11-01 - FlexAttention: Every Attention Variant in a Few Lines

Slides 1-41. 7 min, day 36, 2026-11-11, status needs-ok.

**Core idea.** Attention variants (causal, sliding window, document masks, relative bias, ALiBi, soft-capping) each used to need a hand-written fused kernel; FlexAttention takes a small Python score_mod or mask_mod, compiles it into a FlashAttention-style kernel and skips fully masked blocks, for training and for decoding.

- FlashAttention made attention fast, but only for the variants it hard-coded (4-8).
- score_mod: change each score in Python (relative position, ALiBi, soft-cap) without materialising the bias (9-15).
- mask_mod and the block mask: skip blocks that are fully masked: causal, sliding window, documents (16-23).
- How: torch.compile turns the functions into a Triton template, forward and backward (24-26).
- Inference: decoding over long KV caches and paged KV via block-mask conversion, at under 5% overhead (27-41).

**Hook.** Every new attention idea used to need its own hand-tuned GPU kernel. Now it is a three-line Python function.

**Needs.** L03-01, L09-04. Math: light. Slides to tape on: none (guest, until OK).

**Notes.** Guest; no recording, so narration only. Facts can be checked against the public PyTorch blog posts and the MLSys 2025 paper listed on slide 41. PagedAttention gets its full story in L13-03: one line here.

**Check first.**
- Speed-ups (LLaMA3.1-8B 1.22-2.04x; 70B 0.99-1.66x), 76x batch size and <5% overhead from the PyTorch blog / paper.

### L11-02 - CUDA Graphs: When the CPU Is the Slow Part

Slides 42-52. 5 min, day 37, 2026-11-12, status needs-ok.

**Core idea.** For small, fast kernels the GPU finishes before the CPU can launch the next one; CUDA Graphs record the launch sequence once and replay it, torch.compile's "reduce-overhead" mode does this automatically, and graph partitioning works around operations that cannot be captured.

- Profiles: eager mode launches many small kernels with gaps; torch.compile fuses them; reduce-overhead replays a CUDA graph (43-48).
- Graph breaks make several graphs and extra memory; CUDA Graph Trees share memory between them (49).
- Unsafe operations (a CPU sync) break capture; Inductor graph partition splits around them (50-51).
- In vLLM: register the custom op as unsafe and wrap each partition (52).

**Hook.** The GPU finishes its work faster than the CPU can tell it what to do next.

**Needs.** L09-01. Math: none. Slides to tape on: none (guest, until OK).

**Notes.** Guest; no recording. Visual: a conductor (CPU) who cannot hand out sheet music fast enough, then a player piano roll (the recorded graph).

**Check first.**
- PyTorch documentation on CUDA Graph Trees and graph partition.

## L12 - LLM Quantization

Speaker: Prof. Yufei Ding. Recording: https://drive.google.com/file/d/1uLAAR-BllMtzJ-MhbmouCwJopi3rlRm5/view.
Not used: 1-2, 8, 15, 18 overview slides; 19 section title.

### L12-01 - How a Computer Writes a Number

Slides 2-7. 5 min, day 38, 2026-11-13, status queued.

**Core idea.** Every number in a model is a bit pattern: integers spend all bits on even steps, floating point splits them into exponent (range) and mantissa (precision), and the march from FP32 to BF16, FP8 and FP4 is a series of choices about that split, made fast by new hardware.

- Integers: unsigned, sign-magnitude (two zeros), two's complement (one zero, and the adder just works) (3).
- IEEE 754 FP32: sign, 8-bit exponent, 23-bit fraction; subnormals near zero (4).
- In 4 bits: INT4 is evenly spaced; FP4 variants trade range for resolution (5).
- Hardware: the mantissa multiplier is the expensive part (6).
- The family: FP32, FP16, TF32, BF16, FP8 E4M3 / E5M2, NVFP4 (E2M1), and the GPU generation that brought each (7).

**Hook.** Same eight bits, two formats: one tops out at 448, the other at 57,344. Which would you train with?

**Needs.** L01-01. Math: medium. Slides to tape on: 3, 4, 7.

**Notes.** Opens the quantization season. Visual: bits as ivory tiles; a ruler with even ticks (integers) vs ticks that spread out (floats).

**Check first.**
- E4M3 max 448, E5M2 max 57,344; the format/hardware table (7).

### L12-02 - Rounding a Whole Model

Slides 8-17. 7 min, day 39, 2026-11-14, status queued.

**Core idea.** Quantization maps real numbers onto a few integer levels with a scale (and maybe a zero point); the error depends on granularity (per tensor, per row, per group of 128), and whether it saves time depends on whether the hardware can compute in the low format or must convert back first.

- Symmetric round-to-nearest: S = max|x| / 7; 0.8 to 2, 1.2 to 3, 2.5 to 7 (9).
- Asymmetric: scale plus zero point for lopsided ranges; today: symmetric with fine-grained groups (11).
- Granularity: per-row beats per-tensor (error 2.08 vs 2.28 in the example) (10).
- Which axis: activations per token (on the fly), weights along input features in groups of 128 (offline) (12).
- Saving compute? Without INT4 math the weights are converted back, and unpacking INT4 into FP16 costs time (13-14).
- Benefits: less memory, less bandwidth (faster small-batch decoding), simpler math; W4A16 vs W8A8 vs W4A4 by GPU generation (16-17).

**Hook.** Squeeze 0, 0.8, 1.2 and 2.5 into 4-bit integers. What comes back out?

**Needs.** L12-01. Math: medium. Slides to tape on: 9, 10, 12, 17.

**Notes.** The worked examples are the visual: red pen rounding numbers onto a ruler of 15 ticks.

**Check first.**
- Recompute the slide 9 and slide 10 examples (scales, reconstructed values, errors 2.08 / 2.28).

### L12-03 - 4-Bit Weights Without Losing the Plot: GPTQ and AWQ

Slides 19-27. 7 min, day 40, 2026-11-15, status queued.

**Core idea.** Post-training weight quantization made 4-bit models practical: GPTQ rounds weights a column at a time and nudges the rest to cancel the error using second-order information from a small calibration set; AWQ protects the ~1% of weights that see large activations by scaling them first; fast kernels and llama.cpp brought both to everyday hardware.

- Retraining a 175B model is impractical, so one-shot post-training quantization; larger models are easier to quantize (19-20).
- GPTQ: quantize a few, update the rest to compensate; a fixed order and one Cholesky factorisation make it hours, not months (21).
- Results: 3-bit OPT-175B at 3-4x lower latency per token at batch 1; small groups rescue 2-bit (22).
- Kernels: AutoGPTQ, ExLlama, Marlin; inside vLLM, SGLang, TensorRT-LLM (23).
- AWQ: scale the salient channels before rounding; INT4 with groups of 128 matches FP16 on the benchmarks (24-25).
- llama.cpp: plain C/C++, CPU and Apple silicon first, GGUF with small blocks, k-quants mixing 2-6 bits (26-27).

**Hook.** GPTQ squeezed a 175-billion-parameter model to 3 or 4 bits in a few hours, and it ran faster on fewer GPUs.

**Needs.** L12-02. Math: heavy. Slides to tape on: 21, 22, 24.

**Notes.** Keep the Hessian at intuition level: some weights matter more; fix one, adjust its neighbours (a tailor pinning fabric). Possible aside: this Mac runs models through llama.cpp.

**Check first.**
- Frantar et al., ICLR 2023 (the 4.53x / 3.24x speed-ups and GPU counts on slide 22).
- Lin et al. 2023 (AWQ) and the MBPP / GSM8K table (25).
- llama.cpp facts (GGUF block sizes, k-quants).

### L12-04 - Outliers: Quantizing Activations and the KV Cache

Slides 28-35. 7 min, day 41, 2026-11-16, status queued.

**Core idea.** Activations carry a few huge outlier channels that wreck 8-bit rounding: SmoothQuant moves the difficulty into the weights with a per-channel scale, LLM.int8() keeps outliers in 16-bit, KV caches need their own grouping because K and V are read along different axes, and NVFP4 uses two-level block scales in hardware.

- Activations change with every input and have outlier channels (28).
- SmoothQuant: Y = (X diag(s)^-1)(diag(s) W), so W8A8 keeps its accuracy (29-30).
- LLM.int8(): outliers in FP16, the rest in INT8 (30).
- KV cache quantization: longer contexts and bigger batches; K and V need different grouping axes (31-32).
- NVFP4: E2M1 with micro-block scales; near-original accuracy at 2-3x speed (33-34).
- Vector quantization: replace groups of numbers with codebook entries (k-means), mostly for audio/video tokens (35).

**Hook.** A handful of giant numbers ruin 8-bit math for everyone else. SmoothQuant's fix: hand part of the problem to the weights.

**Needs.** L12-02, L03-02. Math: medium. Slides to tape on: 28, 29, 32, 33.

**Notes.** Slides 31-32 cite M-ANT (Hu et al. 2025): check whether it is the lab's paper before saying so.

**Check first.**
- Xiao et al. 2022 (SmoothQuant) table on 30; Dettmers et al. 2022 (LLM.int8()); NVIDIA's NVFP4 post (accuracy, 2-3x); M-ANT authors and venue.

### L12-05 - Training Through the Rounding: QAT and QLoRA

Slides 36-40. 5 min, day 42, 2026-11-17, status queued.

**Core idea.** Post-training quantization fixes the weights and calibrates; quantization-aware training learns with rounding in the loop by pretending the rounding step has slope 1 (the straight-through estimator); QLoRA freezes a 4-bit base model in a bell-curve-shaped format (NF4) and trains small low-rank adapters on top.

- PTQ vs QAT pipelines (36).
- The gradient problem: rounding is flat almost everywhere; STE passes the gradient straight through; clipped STE stops it outside the range (37).
- LoRA: freeze W, train low-rank A and B (38).
- QLoRA: a frozen 4-bit base plus LoRA; NF4 places its 16 levels at normal quantiles because weights are bell-shaped (38-39).
- The quantization tour in one picture (40).

**Hook.** Rounding has no slope, so gradients die on it. The fix is a polite lie: pretend the slope is 1.

**Needs.** L12-04. Math: medium. Slides to tape on: 37, 39.

**Notes.** Short; merge into L12-04 if the season needs trimming. Callback to L10-02 (FP8 RL).

**Check first.**
- Bengio et al. 2013 (STE); Hu et al. 2021 (LoRA); Dettmers et al. 2023 (QLoRA, NF4 construction).

## L13 - LLM Serving: Scheduling, KV Cache Management, and Kernel Optimization

Speaker: Prof. Yufei Ding. Recording: https://drive.google.com/file/d/1YxWfKfvfIeir0GRXPoS6BOpYodIpEUea/view.
Not used: 1 title; 5, 19, 35 outlines; 46 summary.

### L13-01 - Two Clocks: Prefill, Decode and Batching

Slides 2-9. 6 min, day 43, 2026-11-18, status queued.

**Core idea.** Serving has two phases, prefill (reads the whole prompt at once, compute-bound) and decode (one token per step, memory-bound), measured by time to first token and time between tokens; batching helps decode, and continuous batching admits and retires requests every iteration instead of per batch.

- Prefill vs decode, with the KV cache between them; TTFT and TBT (TPOT) (2).
- Targets by use: chat, search, code, summarisation (3).
- A serving system: request queue, scheduler, KV cache, model executor; SLOs: latency, requests and tokens per second (4).
- Batching raises arithmetic intensity for decode; one long prefill already saturates the GPU (6).
- Static batching: early finishers wait, newcomers wait (7).
- Continuous batching (ORCA, OSDI 2022): schedule every iteration; batch the matmuls, run attention per request (8-9).

**Hook.** Every chatbot races two clocks: how long until the first word, and how long between words.

**Needs.** L03-02. Math: light. Slides to tape on: 2, 3, 7, 8.

**Notes.** Visual: a restaurant: prefill reads the order, decode serves one dish at a time; static batching seats tables together, continuous batching fills seats as people leave.

**Check first.**
- Yu et al., OSDI 2022 (ORCA); slide 3 targets are rules of thumb.

### L13-02 - Sprint and Marathon: Chunked Prefill vs Disaggregation

Slides 10-18. 7 min, day 44, 2026-11-19, status queued.

**Core idea.** Long prefills stall everyone's decoding: Sarathi-Serve slices prefills into chunks mixed with decode steps under a token budget, while DistServe and Splitwise put prefill and decode on different GPUs (even different GPU types) and ship the KV cache across; which wins depends on workload, hardware and latency targets.

- The stall: prefill-first scheduling makes gaps of seconds between tokens (10).
- Chunked prefill: split prompts into chunks and fill each iteration up to a token budget (e.g. 512 on an A100); even iterations, fewer pipeline bubbles (11-13).
- Disaggregation: no interference; separate pools with their own parallelism; used in production (14-15).
- Worked example: TTFT 400 ms and TBT 40 ms: 2 prefill + 1 decode GPU serve 3.3 requests/s per GPU vs 1.6 colocated (16).
- Rate matching: prefill jobs = requests; decode jobs = requests x output length (17).
- Which to use: chunked prefill for small scale; disaggregation for strict SLOs and mixed hardware, if the network can move the KV cache (18).

**Hook.** Prefill is a sprint, decode is a marathon. Why make them share one running track?

**Needs.** L13-01. Math: light. Slides to tape on: 11, 14, 16, 18.

**Notes.** Visual: a running track shared by sprinters and marathoners.

**Check first.**
- Agrawal et al., OSDI 2024 (Sarathi-Serve); Zhong et al., OSDI 2024 (DistServe, and its worked example numbers); Patel et al., ISCA 2024 (Splitwise).

### L13-03 - PagedAttention: Virtual Memory for the KV Cache

Slides 19-27. 6 min, day 45, 2026-11-20, status queued.

**Core idea.** Because no one knows how long an answer will be, older servers reserved a contiguous maximum-length slab per request and wasted more than half of KV memory; vLLM's PagedAttention borrows the operating system's page table (small fixed blocks allocated on demand and mapped from logical to physical), which nearly removes the waste and lets requests share prefix blocks.

- Three kinds of waste: reservation, internal fragmentation, external fragmentation (20-21).
- More than 50% of allocated KV memory wasted, so fewer requests fit at once (22).
- The operating-system idea: pages and a page table (23).
- Blocks of, e.g., 16 tokens on demand; at most one partly used block per sequence; any free block fits (24-25).
- Sharing: parallel samples and system prompts reuse prefix blocks (26-27).

**Hook.** Servers used to waste more than half of their most precious memory. The fix came from operating systems.

**Needs.** L13-01. Math: none. Slides to tape on: 20, 21, 22, 25.

**Notes.** Visual: a car park with reserved rows vs any free bay plus a ticket (the block table).

**Check first.**
- Kwon et al., SOSP 2023: the >50% waste chart, block size 16.

### L13-04 - Don't Read the Same Prompt Twice: Prefix Caching

Slides 28-34. 5 min, day 46, 2026-11-21, status queued.

**Core idea.** Many requests share long prefixes (system prompts, few-shot examples, chat history), so SGLang's RadixAttention keeps every request's KV cache in a radix tree with LRU eviction and reuses the longest matching prefix; Mooncake scales the idea into a distributed KV pool across a disaggregated cluster.

- Sharing patterns: few-shot, self-consistency, multi-turn chat, tree of thought (28).
- A radix tree of KV caches: new nodes, hits, evictions over time (29-31).
- A zero-overhead scheduler: the CPU prepares the next batch while the GPU runs (32).
- vLLM vs SGLang: no fragmentation (nodes hold blocks); vLLM's block hashing; both do chunked prefill and disaggregation (33).
- Mooncake (FAST 2025 best paper): KV-cache-centric disaggregation with a distributed pool (34).

**Hook.** Millions of requests begin with the same system prompt. Why compute it again for every one?

**Needs.** L13-03, L13-02. Math: none. Slides to tape on: 28, 29, 34.

**Notes.** Visual: a tree of shared beginnings growing branches, the red pen pruning the least recently used.

**Check first.**
- Zheng et al., NeurIPS 2024 (SGLang); Qin et al., FAST 2025 (Mooncake, Best Paper).

### L13-05 - One Query, Idle Cores: Kernels for Decoding

Slides 35-46. 7 min, day 47, 2026-11-22, status queued.

**Core idea.** FlashAttention fuses attention and keeps tiles in fast memory, but in decoding there is one query per request, so too few blocks run to fill the GPU; FlashDecoding splits the KV cache across blocks and merges the partial results, LeanAttention balances the split, FlashInfer packages these kernels for serving engines, and POD-Attention runs prefill and decode side by side.

- FlashAttention: online softmax, tiles in shared memory, far less memory traffic (36).
- Decoding launches 1 x heads x batch blocks, far fewer than the SMs at small batch (37).
- FlashDecoding: split along the KV length and reduce at the end (the split-K idea) (38).
- Wave quantization: 168 blocks on 132 SMs is one full wave plus 36 stragglers; stream-K / LeanAttention evens it out (39, 42-45).
- FlashInfer: one KV format for many systems plus JIT for variants; POD-Attention co-locates compute-bound prefill and memory-bound decode (40-41).

**Hook.** When a model writes one word, a GPU with 132 processors might keep only a handful busy.

**Needs.** L13-02, L09-01. Math: light. Slides to tape on: 36, 37, 38, 39.

**Notes.** Slides 42-45 are self study, but the 168-on-132 example is a great picture (a bus with 132 seats and 168 passengers).

**Check first.**
- Dao et al., NeurIPS 2022; FlashDecoding (Stanford CRFM blog, Oct 2023); Lean Attention (2024); Ye et al., MLSys 2025 (FlashInfer); Kamath et al., ASPLOS 2025 (POD-Attention); H100 SXM has 132 SMs.

## L14 - MoE and MoE Serving Systems

Speaker: Zhongkai Yu (PhD student in the lab, course TA) (guest). Recording: https://drive.google.com/file/d/1NogrgLByydnj6lH7vS82ECxqmEN_7Qlj/view. Given by a student, so marked guest. He is a lab member: ask him; the e01-moe pilot already waits on his consent.
Not used: 1-3 title, about the speaker, outline; 12, 19, 24, 37 outlines; 18, 30, 36 are questions used as transitions.

### L14-01 - Mixture of Experts: A Huge Model That Only Wakes a Few

Slides 3-11; + L14 31-32 (MoE review). 6 min, day 48, 2026-11-23, status needs-ok.

**Core idea.** A mixture-of-experts model replaces each feed-forward layer with many smaller expert FFNs and a router that sends each token to its top-k; since FFNs hold most of the parameters, capacity multiplies while the parameters used per token barely grow.

- What MoE is: router plus experts; history from 1991 to Google 2017 to DeepSeek's fine-grained experts in 2024 (4-6).
- Back of the envelope: a dense 70B model uses all 70B per token; Qwen3-235B uses 22B: 3.4x the parameters, 0.3x per token (7).
- Why the FFN: it holds about 80-96% of the parameters (7-8).
- The trend: more experts, more sparsity: DeepSeek-V3 picks 8 of 256, Kimi K2 8 of 384 (9).
- The math: y = sum over top-k of p_i E_i(x), p = softmax(topk(W_g x)) (10).

**Hook.** Qwen3-235B has 3.4 times the parameters of Llama 3 70B, and uses less than a third as many for each word.

**Needs.** L02-02, L01-01. Math: medium. Slides to tape on: none (guest, until OK).

**Notes.** Lecturer Zhongkai Yu (PhD student in Prof. Ding's lab, course TA): guest-marked; ask him. Reuse episodes/e01-moe/FACTS.md (safe wording "37B per token", "8 per layer, plus the shared expert") and the pilot's hospital-triage metaphor.

**Check first.**
- Qwen3-235B-A22B and Llama 3 70B parameter splits (slide 7, FP8 sizes).
- The 1991 paper is Jacobs, Jordan, Nowlan & Hinton (slide says "Hinton proposed").
- Slide 9 lists DeepSeek-V3 activated 36B: use 37B per the pilot FACTS.
- Expert counts in the slide 9 table from the model cards.

### L14-02 - Training a Router

Slides 12-17. 5 min, day 49, 2026-11-24, status needs-ok.

**Core idea.** Top-k routing is not differentiable, so unselected experts get no gradient and a few experts can hog the tokens while the rest never learn; MoE training adds a load-balancing loss (DeepSeek V1/V2) or, in DeepSeek-V3, a per-expert bias that nudges selection without touching the output weights.

- Top-k is discontinuous: a tiny change flips which expert is chosen (11, 13).
- Backprop only reaches the selected experts (14).
- Rich get richer: most experts never trained, sensitivity to initialisation (15).
- Fix 1: an auxiliary load-balance loss that penalises uneven use (16).
- Fix 2 (DeepSeek-V3): auxiliary-loss-free balancing, a bias used only for selection, updated during training and frozen at inference (17).

**Hook.** If the router keeps picking the same few experts, the rest never learn anything.

**Needs.** L14-01. Math: medium. Slides to tape on: none (guest, until OK).

**Notes.** Guest-marked (Zhongkai). Visual: the triage desk sending everyone to two famous doctors, then a queue board that nudges the choice (the bias).

**Check first.**
- DeepSeekMoE balance loss; DeepSeek-V3 auxiliary-loss-free balancing (Wang et al. 2024).

### L14-03 - Serving Experts Across 320 GPUs

Slides 18-29. 7 min, day 50, 2026-11-25, status needs-ok.

**Core idea.** Serving MoE spreads the experts across GPUs (expert parallelism, a tensor parallelism with no AllReduce) and pays with two all-to-all exchanges per layer and uneven load; DeepSeek-V3's deployment shows the answers: data/tensor-parallel attention, replicated hot experts, routing limited to 4 nodes, overlapped InfiniBand and NVLink hops.

- An MoE FFN is a set of isolated experts; EP places them on different GPUs with no AllReduce (20-21).
- The costs: all-to-all dispatch and combine; uneven expert load (22-23).
- Real systems: DP/TP for attention, EP for experts, two all-to-alls (25).
- DeepSeek-V3: prefill on 32 GPUs (EP32), decode on 320 (EP320: 256 for routed experts, 64 for shared and redundant ones) (26).
- Balance: replicate hot experts; limit each token to 4 nodes; two-hop routing over InfiniBand then NVLink, about 3.2 experts per node at no extra cost (27-29).

**Hook.** DeepSeek-V3 decodes on 320 GPUs, and 256 of them each hold a single expert.

**Needs.** L14-01, L04-04. Math: light. Slides to tape on: none (guest, until OK).

**Notes.** Guest-marked. Slide 28 cites the lab's own paper (arXiv 2510.05497, "the square patterns we observed in our paper").

**Check first.**
- DeepSeek-V3 inference deployment (prefill 4 nodes / 32 GPUs; decode 40 nodes / 320 GPUs) from the report; EPLB; the 4-node limit.
- H800 NVLink figure (slide 26: 160 GB/s vs 450 GB/s) and the 3.2 = 160 / 50 estimate.

### L14-04 - Experts Have Habits

Slides 30-47. 7 min, day 51, 2026-11-26, status needs-ok.

**Core idea.** Decoding MoE wastes GPUs because attention is memory-bound while experts need big batches, so systems like MegaScale-Infer put attention and experts on separate GPUs with a ping-pong pipeline; and profiling which experts get picked (across layers, tokens, phases, topics and pairs) reveals stable habits that future MoE systems can plan around.

- The decode problem: attention's memory caps the batch, so the experts starve (31-33).
- Disaggregate attention and FFN: scale each separately, use cheaper hardware where it fits (34).
- MegaScale-Infer: disaggregation, a ping-pong pipeline, M-to-N communication (35).
- Habits in time: layer-level and token-level relations; prefill looks like decode (38-43).
- Habits in space: experts picked unevenly, shifting by subject and language; experts that come in pairs (44-46).
- Takeaways: sparse activation scales capacity, not compute; balance; EP plus all-to-all; habits for smarter systems (47).

**Hook.** Some experts get picked again and again, some always together. A system that knew their habits could seat them side by side.

**Needs.** L14-03. Math: light. Slides to tape on: none (guest, until OK).

**Notes.** Guest-marked. Slides 38-46 are from the lab's own paper (arXiv 2510.05497, Zhongkai's work): the natural season finale for the lab and the bridge to the e01-moe pilot (trace data and consent pending). Slides 31-35 cite another course's reading list: use the MegaScale-Infer paper as the source.

**Check first.**
- MegaScale-Infer (ByteDance 2025).
- Observations Ob1-Ob5 in the words of arXiv 2510.05497.

## L15 - Invited talk: Triton, Gluon, and the Future of Tile-Based Programming Models

Speaker: Keren Zhou (invited) (guest). Recording: https://drive.google.com/file/d/1QMNvyP1APlDIxlaN4-vZ91RWYgpzyrLZ/view. Recording only; no slide deck in the Drive folder.
Not used: No deck.

### L15-01 - Triton, Gluon and Tile-Based Programming

Slides none (recording only). 6 min, day 52, 2026-11-27, status blocked.

**Core idea.** To be written from the recording: where tile-based GPU programming (Triton, Gluon) is heading.

- To be outlined after transcribing the recording and getting the speaker's OK.

**Hook.** To be written.

**Needs.** L09-04. Math: unknown. Slides to tape on: none (guest, until OK).

**Notes.** Invited talk by Keren Zhou (the course's last lecture). The Drive folder has the recording but no deck. Blocked until a deck or the speaker's OK; if neither comes, drop it and end the season on L14-04.

## Open questions for the user

1. Guest lectures (L09 Yue Guan, L10 Guyue Huang, L11 Boyuan Feng, L14 Zhongkai Yu, L15 Keren Zhou): ask each speaker for their voice and slides; until then, make narration-only episodes with our own drawings (credited to the talk) or skip them? Skipping all guests leaves 38 days of Prof. Ding's lectures.
2. L15 has a recording but no deck in the Drive folder: ask for the slides, or drop it.
3. Merge candidates if the season should be shorter: L09-03 (into L09-02), L10-03 (into L10-02), L12-05 (into L12-04), L04-03 (into L04-02).
4. The worksheet prices used in L01-03 belong to one vendor's price list at lecture time: show them as the course worksheet's numbers, or swap in neutral round prices?
