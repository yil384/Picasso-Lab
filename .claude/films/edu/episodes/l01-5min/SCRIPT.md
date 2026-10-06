# L01 · Background, 5-minute cut — 《多，就不一样》 / "More Is Different (and Expensive)"

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 1, the first section after the course
logistics: "Background", slides 9-11. Requested 2026-10-06: ~5 min, the line look (ink lines that draw themselves, red
pen) plus extra colour (watercolour washes), with her original voice and the original slides in places.

Sources: `../l01-1-scale/FACTS.md` (every number; its safe wording), `../l01-1-scale/notes/ding_on_background.md`
(her lecture, timestamped; ASR drafts to be checked by ear), `course/L01.pdf` p9-11 (git-ignored), `course/L01.mp4`.
Prof. Ding approved her voice clips and her slides on screen (2026-10-06). The X account can post the full length.

Look: warm paper; black ink line drawings drawing themselves; red pen for marks; watercolour washes (pink, blue,
yellow; painted swatches, multiplied under the ink) as the colour; her slides appear as photographed printouts taped
onto the paper (slightly rotated, a strip of tape), and the red pen annotates them; each original-voice clip has a
hand-drawn microphone tag "Prof. Ding, lecture 1" / 「丁老师 · 第 1 讲原声」 and her words as captions (ZH: translated,
marked 译). No drawing of her (a real person): voice only.

## Beats (target 5:00; times are planned, the voice decides)
| # | Time | Picture | Voice |
| --- | --- | --- | --- |
| 0 | 0:00-0:16 | Cover: a person at a laptop, a chat window answering, jaw dropped; pink wash bursts behind the reply. Title lettering "More is different" / 「多，就不一样」 + strip "CSE 291P · Lecture 1 · UC San Diego". | N0 + **C1** her: the first time you played with ChatGPT, how surprised you were |
| 1 | 0:16-0:46 | The 2017-2020 lab desk: small nets (labelled ResNet, LSTM by pen) being trimmed with scissors (pruning) and squeezed (quantization); a grey cloud "ML winter?" with snowflakes. | N1 + **C2** her: pruning, quantization... "we feel like its job is kind of limited" |
| 2 | 0:46-1:30 | "Make it larger": a small robot grows into a giant across the page (blue wash grows with it). Then the chicken and the egg: a researcher with an empty wallet facing a funder; arrows loop. | N2 + **C3** her: "No one will give you the money... chicken egg problem" |
| 3 | 1:30-2:40 | **Slide 9** taped in. Red pen traces the flat part ("small models: ~0"), then the jump. A wash of yellow over the jump. One water molecule vs a wave (Anderson: you can't see a wave in one molecule); his essay title "More Is Different" (Science, 1972). Honest note: a later paper argues many jumps are partly how we score them ("…a Mirage?", NeurIPS 2023). | N3a + **C4** her: "you do not do the experiments, you will never know" + N3b |
| 4 | 2:40-3:40 | **Slide 10** (left half only, the meme cropped out), red-pen corrections: "sizes not published", "a cluster, not Grok 3's run". Then a receipt unrolls over a server wall: > $100M one frontier run (est.), 100,000 GPUs in one cluster, $500B over 4 years (planned). Cut to a tiny university lab with one GPU and five students around it. | N4a + N4b + **C5** her: academia "a little bit embarrassing, because we are not having a lot of GPUs" |
| 5 | 3:40-4:30 | **Slide 11** taped in; red pen boxes "accuracy = efficiency × resources" + "motto: Stanford CS336". A balance: two pans. Chinchilla: a giant with one thin book vs a smaller figure with a stack of books, same budget envelope; the smaller wins (67.6 vs 60.0 on a 57-subject exam). | N5a + **C6** her: "If you can make it larger, then the idea is how can you efficiently make it larger?..." + N5b |
| 6 | 4:30-4:58 | The course as a road map drawn by the pen: stops for the lectures ahead (tokens, attention, KV cache, serving, training, MoE...), a little GPU car on the road. | **C7** her: "that's why we want to develop this class" + N6 |
| 7 | 4:58-5:03 | Logo end card (line), "Compute not included" / 「算力另计」. | - |

## Narration (scratch TTS until a person records; EN and ZH written natively)
- N0 EN "Remember the first time an AI actually answered you? Our professor does." ZH 「还记得第一次被 AI 认真回答的那一刻吗？丁老师也记得。」
- N1 EN "Rewind to 2017 to 2020. Models were small, and much of the research was about making them even smaller. Some people wondered if AI was heading into another winter." ZH 「倒回 2017 到 2020 年：模型都不大，很多研究在想办法把它们做得更小。甚至有人担心，AI 又要进入寒冬。」
- N2 EN "Then came the bet: just make it larger. More data, more parameters. Sounds easy. It isn't." ZH 「然后有人押了一个注：做大。更多数据、更多参数。听起来简单，其实不然。」
- N3a EN "This is the chart from her slide. On many tasks, small models score almost nothing. Then, past a certain size, the score jumps." ZH 「这是她课件上的图：很多任务上，小模型几乎是零分；模型大到某个程度，分数突然跳起来。」
- N3b EN "A physicist, Philip Anderson, called this 'More Is Different': one water molecule can't make a wave. Fair warning: a later paper argues many of these jumps look smoother when you score more gently." ZH 「物理学家安德森管这叫『多，就不一样』：一个水分子，掀不起浪。也要说句公道话：后来有论文发现，换一种更宽松的打分，很多『突然』会变成『渐渐』。」
- N4a EN "Bigger also means pricier. Her slide lists the bill. Two corrections in red: those model sizes were never published, and the hundred thousand GPUs are one company's cluster." ZH 「做大，也意味着更贵。她的课件列了账单。我们用红笔订正两处：那几家模型的大小从没公开过；十万张 GPU 是一家公司一个集群的规模。」
- N4b EN "An estimated hundred million dollars for one top training run. A five-hundred-billion-dollar plan. And in a university?" ZH 「训一个顶级模型，估计上亿美元；一个计划，五千亿美元。那大学里呢？」
- N5a EN "So the slide's punchline, borrowed from a Stanford course: accuracy equals efficiency times resources. Scale is not everything; methods that scale are." ZH 「所以这一页的重点，借自斯坦福一门课的口号：准确率等于效率乘资源。规模不是一切，能放大的方法才是。」
- N5b EN "In 2022, a 70-billion-parameter model trained on four times the data beat a 280-billion one on the same compute." ZH 「2022 年，一个 700 亿参数、多喂了约四倍数据的模型，用同样的算力，赢了 2800 亿参数的大模型。」
- N6 EN "That's this course: how to make big models cheaper and faster. Compute not included." ZH 「这门课讲的，就是怎么让大模型更便宜、更快。算力嘛，另计。」

## Original voice clips (cut on whisper medium.en word times, cleaned and levelled; exact cuts and text: clips.json; audio is
made from git-ignored course/L01.mp4)
| id | Recording | Her words (ASR draft, see notes) |
| --- | --- | --- |
| C1 | 18:16.3-18:24.2 | "I don't know if you still remember the first time you are playing with ChatGPT, how surprised maybe you are, how talented they are in answering questions." |
| C2 | 17:41.0-17:50.5 | "...mostly focusing on the pruning, quantization, design new models. But we feel like its job is kind of limited, okay?" |
| C3 | 18:50.2-18:59.0 | "if you want to do some experiment at larger scale, that means money. No one will give you the money to do larger results until you get the result. So it's a chicken egg problem." |
| C4 | 20:15.0-20:17.1 | "you do not do the experiments, you will never know." |
| C5 | 22:42.1-22:55.3 | "the training cost is also tremendous... and that also makes academia a little bit embarrassing, because we are not having a lot of GPUs." |
| C6 | 21:38.0-21:46.6 | "If you can make it larger, then the idea is how can you efficiently make it larger? If you cannot really get better performance, you will try to compress it." |
| C7 | 24:12.0-24:21.9 | "especially because it's very large, we need to care about its performance. So that's why we want to develop this class." |

## Facts (all from ../l01-1-scale/FACTS.md)
Anderson, "More Is Different", Science 1972 (no causal link to his 1977 Nobel on screen); Wei et al. 2022 emergence
plots (credit on the taped slide); Schaeffer, Miranda & Koyejo, NeurIPS 2023 "...a Mirage?" (the slide's "Illusion?"
is a slip: red-pen it); > $100M per frontier run is an estimate; 100,000 GPUs = xAI Colossus cluster, 2024; $500B
Stargate = planned over 4 years, announced 21 Jan 2025; closed-model sizes unpublished; motto = Stanford CS336
lecture 1 (2025); Chinchilla 70B / 1.4T tokens vs Gopher 280B / 300B, same training compute, MMLU 5-shot 67.6 vs 60.0.
Do not use: the slide-10 meme and cartoon, OpenAI's finances, the $20/$200 joke, the agents/RAG claim.

## New line art (ChatGPT / Codex; black ink on white; see ~/Downloads/picasso-l01-art/prompts.html)
line_chat_first, line_lab_2017, line_grow, line_chicken_egg, line_wave, line_receipt, line_tiny_lab, line_two_teams,
line_balance, line_course_map, line_mic, plus wash_swatches (watercolour, colour; the course's accent is blue) and
tape_strips (real masking tape for the taped slides) - 13 images.
Reused: line_gpu, line_servers, line_brain, line_paper, line_heap, the chef cast, the logo.
