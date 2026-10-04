# Comedy for Picasso Lab explainers: devices, rules, bilingual craft, joke bank

Research date: 2026-10-04. Scope: comedy devices from 一年一度喜剧大赛 1-2 / 喜人奇妙夜 1-2 (iQIYI x 米未) and
脱口秀大会 / 脱口秀和Ta的朋友们 (笑果), and how to use them in 60-150 s vertical science explainers (main line: LLM
systems + quantum, rebuilt in three.js/q5.js; side line: iPhone vlogs).

How this was checked: performer lines and show facts come from news articles and encyclopedias fetched during
research (list at the end). Where I could only see a secondary summary and not the article itself, the item is marked
**(secondary)**. Where I could not confirm it at all it is marked **(unverified)**. Technical facts in the joke bank
come from the CSE 291 slides (L01-L14, cited as "course Lxx"), paper abstracts fetched from arXiv/Crossref, and token
counts I ran myself with `tiktoken` 0.14.0. I did not check whether either show has a 2026 season.

---

## 0. Key conclusions

1. **The best gag IS the explanation.** Research on teaching with humor finds that humor tied to the content helps
   learning and unrelated humor does not (Banas et al. 2011; Wanzer, Frymier & Irwin 2010, "IHPT"). The viewer has to
   *resolve* the incongruity, and for us that means understanding the mechanism. Write premises where getting the joke
   requires understanding the system.
2. **装傻/吐槽 (manzai) is the device that best protects accuracy.** The 装傻 (boke) voices the pop-science myth or
   the naive design, and the 吐槽 (tsukkomi) corrects it with the real mechanism. Muller's physics-video research found
   that stating the misconception first and then breaking it beats a clean exposition. The films already have the two
   voices: the serif narration and the **red-pen notes** (the Caveat font in v10).
3. **场景错位 premises with consistent rules** are the franchise's biggest hits: 《互联网体检》 (app dark patterns
   played out as a medical checkup), 《八十一难》 (a rule-bound 西游记: they have 80 trials and need one more), and
   《技能五子棋》 (five-in-a-row with "skills"). A systems analogy is a premise with rules, so build it beat by beat:
   one mechanism, one gag.
4. **Systems topics carry 三翻四抖 inside them.** Quadratic attention, KV growth, memory budgets and QEC cycles all
   escalate on their own (10 -> 100 -> 100,000, then it breaks). The math supplies the rhythm.
5. **Bilingual rule: put about 70% of the beats in pictures and situations.** Write separate EN and ZH punchlines for
   verbal beats on the same picture-locked timing. A 谐音梗 is ZH-only, at most one per video, and never the only
   joke on its beat. "谐音梗要扣钱" is still the audience's default verdict.
6. **Gentle beats harsh.** Two 2024-25 experiments found that harsh satire lowered how credible the message seemed
   and how trustworthy the scientist seemed. In a survey of college science students, jokes about science were found
   funny by 89.3% and offensive by 1.5%, while jokes about social identities were the ones found offensive. Laugh at
   the memory wall, the network and physics, not at people.
7. **Avoid:** real people (lab rule; the v10 CEO quotes are as close to that line as we should get), politics and
   export controls, the military (笑果 was fined 13.35M yuan in 2023 over one joke), punching down (the "$5 San Diego"
   vlog is high-risk), reusing other comedians' bits, stale memes and slang, and "AI-ish" joke templates.
8. **Account-level running gags are already there:** "*compute not included", the cat, the red pen, the bill,
   Paper #137. A footnote tag on every episode ("*error correction not included") is a cheap series signature.

---

## 1. The source shows (verified facts)

| Show (producer) | Season / year | Results and works referenced here |
| --- | --- | --- |
| 一年一度喜剧大赛 (iQIYI x 米未) | S1, 2021-10-15 to 2022-01-07, 12 episodes | Best duo 蒋龙 & 张弛 (works include 《这个杀手不大冷》, 《台下十年功》); runner-up 大锁 & 孙天宇; third 史策 & 王皓; best troupe 三板大斧子; 六兽 named writer of the year. 《互联网体检》 aired in episode 1 and was the first sketch to reach the trending lists. |
| 一年一度喜剧大赛 | S2, final 2022-12-17 | Champion 某某某 (张维伊, 左凌峰, 刘同); 2nd 少爷和我; 3rd 小婉管乐; 4th 胖达人2. |
| 喜人奇妙夜 (iQIYI x 米未) | S1, 2024; final 2024-09-06 | Champion troupe 十上无难事. 《八十一难》 (四士同堂: 刘旸, 王建华, 松天硕, 李治良; aired 2024-07-05; won the WeChat most-popular-work award). 《小品的世界》 (吕严, 邓帅, 何欢, the "量子力学小队"; aired 2024-06-28) **(secondary)**. |
| 喜人奇妙夜 | S2, 2025 | Champion 五花八门 **(secondary)**. 《技能五子棋》 (外星从: 张兴朝, 李嘉诚, with 张呈; aired 2025-09-26). 《墅大招风》 borrows the shell of the film 《寄生虫》. A view count of "over 2.5 billion" for 技能五子棋 is **(unverified)**. |
| 脱口秀大会 (笑果) | S1 2017 / S3 2020 / S4 2021 / S5 2022 | S1 champion 庞博. S3 champion 王勉 (呼兰 3rd). S4 champion 周奇墨 (庞博 2nd, 何广智 3rd). S5 champion 呼兰 (鸟鸟 2nd, 毛豆 3rd). |
| 脱口秀和Ta的朋友们 (笑果) | S1 2024 / S2 2025 | S1 champion 漫才兄弟 (徐浩伦 & 谭湘文). S2 champion 何广智 (漫才兄弟 2nd, Kid 3rd). |

---

## 2. Device catalogue

Each device lists what it is, verified examples, what it needs to work in a 60-150 s vertical video, and how it maps
onto our code-rendered pipeline.

### 2.1 铺垫 + 包袱 and 预期违背 (setup, punch, violated expectation): the base mechanism

- **What:** the 单立人喜剧 stand-up handbook (石老板, v1.1, 2019) defines "段子 = 铺垫(不好笑的部分) + 包袱(好笑的部分)"
  and "人笑是因为现在发生的事和之前预判的不一样". Every other device is a special case of this one.
- **Examples:**
  - 鸟鸟 (脱口秀大会5): "我怕我成为评分最低的一季脱口秀的冠军，那我就是水军". The listener expects a line about
    the title; the punch swaps 冠 for 水, so a champion of a watered-down season becomes a paid shill (水军). This is
    预期违背 and wordplay at the same time.
  - 小鹿: "很多女孩子都很焦虑，觉得自己离30岁越来越近了，不像我，离30岁越来越远了" (she is past 30). Wording
    **(secondary)**.
- **In 60-150 s:** the setup has to be one sentence or one image. In an explainer, the natural setup is the viewer's
  naive intuition. Muller's physics-video research (PhD, University of Sydney, 2008) found that presenting the common
  misconception first and then showing why it is wrong worked better than a clear exposition. A plain exposition left
  students more confident in their wrong ideas. 预期违背 is that method with a laugh.
- **Pipeline:** the camera can carry the setup. In the v7/v10 "keynote" look, push in on a spotlit pedestal and reveal
  something tiny (a 4-bit integer).

### 2.2 三翻四抖 (three setups, the fourth breaks)

- **What:** a 相声 term for organizing a 包袱: several setups in one direction steer the listener, then the last beat
  reverses. The "three" is nominal; 《如此照相》 uses six setups (Baidu Baike via secondary).
- **Examples:**
  - 徐志胜 (脱口秀大会4): "就我这个长相，你让我卖面和卖馍都行，但卖面膜会不会太冒险了呀". 面 -> 馍 -> 面膜 is a
    three-step sound chain whose third step turns into self-mockery. It is untranslatable, which makes it a good warning
    for section 4.
  - 《八十一难》: "我，孙行者" / "我，猪刚鬣" / Sha Seng tries "我，沙宝亮" (a real singer's name) and realizes he has
    no name of his own **(secondary)**. A second run does the same with relatives: 六耳猕猴 is the brother, the seven
    spider spirits are aunts, and Sha Seng has none **(secondary)**.
- **In 60-150 s:** a full 三翻四抖 costs about 8-15 s. The beats need the same rhythm, shot size, text position and
  sound cue so the pattern locks in. The break lands on a cut. In video, two setups plus the break is often enough,
  because pictures read faster than words. Use at most one or two per video, or it starts to feel formulaic.
- **Why it suits systems topics:** scaling *is* a 三翻四抖. Ten tokens is fine, a thousand is fine, a hundred
  thousand and the GPU catches fire. The escalation is real, so the joke teaches the growth curve.

### 2.3 Callback (回扣 / 扣题)

- **What:** 程璐 (笑果 head writer): "先讲一个笑话，几分钟以后，再把之前讲的笑话的部分内容重复一次", and it lets you
  "拉近与观众的距离，无需铺垫直接抛笑点". His own example: early in a set he teases a colleague who studied civil
  engineering (土木) and later closes with "下面我把舞台交给学土木的阿凯和学软件的朋友们".
- **Examples:**
  - 何广智, final of 脱口秀和Ta的朋友们2 (2025), framed as a "2018-2025年度述职报告", closed with
    "我今年的荔枝送到了，请大家笑纳，我到长安了". It calls back to 《长安的荔枝》 and to his three earlier tries for
    the title. One line carries both the joke and the emotional payoff.
  - 鸟鸟 builds a "略" motif ("生活中很多问题的答案都是'略'… 它的答案也只有'略略略'"). The widely shared version is
    "我向生活要答案，生活对我略略略" **(secondary)**.
- **In 60-150 s:** plant within the first 15-20 s and pay off in the last 10-15 s. Make the planted item **visual**
  (an object, a sticky note, the cat) so it is recognized in half a second. The best payoff is the callback that
  carries the takeaway.
- **Across episodes:** callbacks between episodes build a series ("*compute not included", the bill printer, the
  cat), but each episode must also work for a first-time viewer.

### 2.4 Running gags

- **What:** a callback that comes back three or more times and escalates each time.
- **Examples:**
  - 《技能五子棋》: "技能五子棋，飞沙走石！" (throw the opponent's stones into 什刹海), "技能五子棋，力拔山兮！"
    (flip the board). The chant repeats with a new "skill" each time and became the earworm "技能五子棋之歌". Fans
    later posted "看看真正的飞沙走石" from 什刹海.
  - 《八十一难》: the whole sketch runs on one rule, "only 81 trials earn the scriptures", and each scene is another
    attempt to manufacture the last one.
- **In 60-150 s:** keep the form fixed (same words, sound or framing) and change the content. Three appearances is
  the right number: plant, escalate, invert.
- **Best systems running gags:** things that literally repeat in the mechanism, such as each decode step, each
  micro-batch, each QEC cycle, or each request re-reading the same system prompt.

### 2.5 反差 (contrast of register or persona)

- **Examples:**
  - 徐志胜 opened his 脱口秀大会4 set with "大家好，我是徐志胜，就，我没有容貌焦虑". The persona contradicts the
    statement.
  - 《小品的世界》: inside a 春晚-style sketch world, the son wants to smash the glowing "fourth wall" **(secondary)**.
  - 何同学's 5G video is built on repeated reversals (a test event clashes with midterms; his own campus turns out to
    have 5G) **(secondary)**.
  - 毕导 is described as telling jokes "一本正经" with rigorous methods (科普创作评论 analysis, **(secondary)**).
- **For us:** the lab already owns a premium "launch event" register (the v7/v10 studio look). A mock-epic launch
  for something tiny (one INT4 number, one token, one qubit) costs almost nothing. The contrast needs a clearly
  established baseline: show the grand register once, played straight, before you undercut it.

### 2.6 谐音梗 (homophone puns)

- **Examples:**
  - 徐志胜's 面/馍/面膜 (above) and 鸟鸟's 冠军/水军.
  - 《八十一难》: Sha Seng is told he will end up a mount (坐骑) "因为你人善呢", and he answers "啊，人善被人骑呗"
    (from 人善被人欺). Verified from a script excerpt.
- **Status in the scene:** "谐音梗要扣钱" comes from 笑果 and 李诞. It is the shorthand for "the cheapest device, so
  the audience punishes lazy use". A Tencent headline on the 喜人2 semifinal ("无论是谐音梗还是内部梗，只要好笑，就一起来吧")
  shows that an earned pun is still welcome.
- **For us:** ZH-only, at most one per video, and ideally doubled by a visual or by the content itself (see T4: the
  tokenizer literally charges more for the pun). The EN version needs its own joke on that beat.

### 2.7 自嘲 (self-deprecation)

- **Examples:**
  - 徐志胜 (脱口秀大会4): "就我这个长相，还有什么能失去的呢？直到我开始脱发". A Tencent profile argues it works
    because he has truly made peace with his looks (和解), so the audience relaxes instead of pitying him.
  - 何广智: "我现在住的两室嘛，就一个卧室住我，另一个卧室住我的尊严". He says about 80% of his material is true.
  - 鸟鸟 (脱口秀大会5 final): "我平时的生活状态只有三种，中悲、大悲、超大悲".
- **For us:** mock the lab, the narrator and our own pipeline: the GPU budget, the 2013 desk lamp, how many frames
  this video took to render. Never mock the audience or students. Avoid "anti-science" self-deprecation such as
  "nobody really understands quantum"; it undercuts the explainer.

### 2.8 Act-out (呈现)

- **What:** the 单立人 handbook: "通过举例、直接表演、模仿等方式来把前提表达出来。呈现的情绪应该与前提相同".
- **Example:** 漫才兄弟's 徐浩伦 presses an invisible door code lock, and the key positions match a real nine-key
  keypad (澎湃). The precision of the mime is the joke.
- **For us:** act-out means characters or objects performing the mechanism on screen: tokens queueing, a GPU fainting
  under 782 GB of optimizer state. Code rendering makes act-out exact: positions and timings can be the real algorithm,
  so the mime is correct by construction. Keep a recurring cast of painted, keyed sprites (the Codex workflow) rather
  than primitive shapes.

### 2.9 装傻 / 吐槽 (manzai boke and tsukkomi; in 相声 terms 逗哏 / 捧哏)

- **What:** the boke "exhibits misinterpretation and forgetfulness"; the tsukkomi "butts in" to correct, often with a
  smack, traditionally a paper fan (harisen) (Wikipedia, "Manzai").
- **Examples:**
  - 漫才兄弟 won 脱口秀和Ta的朋友们 S1 (2024) and placed 2nd in S2 (2025). 徐浩伦 plays dumb; 谭湘文 lands the
    correction at the right moment. Press praised how densely they pack laughs into a fast rhythm, helped by their
    Changsha-accented Mandarin.
  - 《技能五子棋》 has the same structure: champion 张呈 is the normal-world straight man inside a "中二世界" school.
    A Sina analysis calls the structure manzai-like and notes "有人上头，有人蒙".
- **Why this is our core device:** in an explainer the boke states the myth ("quantum computers try every answer at
  once") or the naive design ("just reserve the max length"), and the tsukkomi corrects it with the real mechanism. The
  correction is the punch, so accuracy is built into the joke.
- **Pipeline:** the serif statement line (Instrument Serif) plays the straight voice or the boke; the red-pen note
  (Caveat) plus a tiny sound cue is the tsukkomi. With voiceover, use two voices or VO plus red-pen text.
- **In 60-150 s:** turns must be fast, and tsukkomi lines short (about 6 EN words or 10 ZH characters on screen) so
  they can be read in time.

### 2.10 场景错位 / absurd premise (设定喜剧)

- **Examples:**
  - 《互联网体检》 (S1 episode 1; 蒋诗萌, 刘思维 and a third performer whose name differs between sources; writers
    credited include 六兽 **(secondary)**). A man going for a job health check meets the internet at every step: face
    recognition instantly reveals his height, weight and bank PIN, a 360-second ad, 超前点播, per-piece purchases, a
    required app download, 加速包, pop-ups and live-stream selling. Viewers wrote "这个作品简直就是在屏幕前上网冲浪的我".
  - 《八十一难》 (a rule-bound 西游记) and 《技能五子棋》 (a rule-breaking board game).
- **Why it fits explainers:** a premise is an analogy with rules. 《互联网体检》 works because each real dark pattern
  maps to exactly one checkup step. Build systems analogies the same way: write the **mapping table** (premise element
  -> system element) before the script. Once the audience can predict the next gag from the rules, they understand
  the system.
- **In 60-150 s:** one premise per video, readable in 5 s or less (title card plus one image). The internal logic
  must stay consistent. Mark where the analogy breaks; that is a free 吐槽 beat.

### 2.11 名场面 / quotable lines

- **Examples:**
  - 李诞: "开心点朋友们，人间不值得" (secondary sources; he has explained it as "don't be so unhappy", not nihilism).
  - 庞博, an ex-programmer and 2017 champion: "我有三行代码，在太空里，再过十五分钟咱们去窗边，也许能看见一颗流星"
    (quoted by Sina; which season it is from is **(unverified)**). It is sincere rather than a joke, and it was quoted
    precisely because of that.
  - 何广智's 荔枝/长安 line.
  - Ours: "*Compute not included."
- **Needs:** short and rhythmic, attached to a strong visual frame (the screenshot or GIF people will share), placed
  late, and used once. Write it independently in each language rather than translating it.

### 2.12 The sincerity turn (笑中带泪), a bonus device the shows depend on

- A Tencent review says 《八十一难》's reversal finally returns to "普度众生" as its core. 庞博: "如果只剩最后一件事，那就一定是真诚".
  何广智: once the audience has had enough jokes, saying something deep makes them burst out laughing.
- **For us:** the last beat is one sincere line about why the problem matters, as in the lab ending style (Paper #137
  and a chair for you), followed by the footnote tag.

---

## 3. Jokes inside a science explainer without hurting accuracy

### 3.1 What the research says

- **Related humor helps; unrelated humor doesn't.** Banas, Dunbar, Rodriguez & Liu (2011), a four-decade review: humor
  can enhance learning when tied to course content, and it raises likability and motivation. Wanzer, Frymier & Irwin
  (2010), IHPT: learners must perceive *and resolve* the incongruity. If they can't resolve it, they get confusion,
  not humor.
- **Humor can lift perceived expertise.** Yeo, Anderson, Becker & Cacciatore (2020, *Public Understanding of Science*):
  viewers who found a science comedian funnier rated comedy as a more valid source of science, mediated by perceived
  *expertise*, not likability. Yeo et al. (2020, *Science Communication*): mirth predicts intention to engage on
  Twitter.
- **Harsh satire costs credibility.** Freiling et al. (2024): gentle satire had no effect, while harsh satire reduced
  perceived message credibility. Yeo et al. (2025, N = 723): satire raised perceived aggression, which lowered the
  scientist's perceived trustworthiness.
- **Science is a safe topic.** Cooper et al. (2018, *PLOS ONE*, college science courses): about 99% of students
  appreciate instructor humor. Jokes about science: 89.3% find them funny, 1.5% offensive. Jokes about social
  identities are the ones found offensive (e.g. people with disabilities 63.7%, women 61.6%).
- **Caution.** Riesch (2015, *PUS*): the learning benefits of humor in informal science are often assumed and little
  studied, and humor also shapes the science-public relationship. Treat jokes as part of the argument, not decoration.

### 3.2 The four tests every joke passes before it is filmed

1. **Resolution test (IHPT):** can a viewer get the joke only if they understood the mechanism? If yes, it is a
   teaching gag. If they can laugh without understanding, it is decoration; that is allowed in the cold open, nowhere
   else. If they can't get it even after the explanation, cut it.
2. **Truth test:** the picture is technically right even when the VO is joking. The attention matrix has the right
   shape, the causal mask is lower-triangular, the numbers on screen are real.
3. **Number test:** a number inside a joke is either real and sourced, or so absurd nobody could take it literally
   ("a billion years"). Never a plausible invented figure ("37% faster").
4. **Analogy-break test:** every analogy breaks somewhere. Say where, as a 吐槽 beat ("and unlike a hotel, the KV
   cache can share rooms between guests"). This turns the analogy's weakness into a laugh and an extra fact.

Process: keep a `JOKES_epNN.md` next to each storyboard, like `QUOTES_v9.md`. Every factual claim inside a gag gets a
source (course slide, paper, own measurement), and a lab member who knows the topic reviews it. The accuracy veto
beats the laugh.

### 3.3 Density and placement (our recommendation, not a measured rule)

| Length | Laugh beats | Notes |
| --- | --- | --- |
| 60 s | 4-6 | One premise, one 吐槽 correction, one tag. |
| 90 s | 6-9 | Add one 三翻四抖 driven by the mechanism. |
| 150 s | 9-13 | Add a running gag (3 appearances) and a callback. |

Placement map for a 90 s episode:

- **0-3 s, cold open:** a gag that *is* the question (预期违背 or act-out), e.g. a GPU fainting under a suitcase.
- **3-15 s:** the premise (场景错位), rules stated by picture.
- **15-60 s:** the mechanism. The escalation is the 三翻四抖 the math provides; one myth gets 装傻/吐槽'd; the running
  gag appears twice.
- **60-75 s, quiet zone:** the key number or claim with **no joke on top of it**. Let it land; the tag can come one
  beat later. (何广智's point: depth after jokes is what explodes.)
- **75-90 s:** callback with the takeaway, one quotable line, the sincere line, then the "*… not included" footnote.

**Two-layer jokes:** give general viewers a situational surface (a hotel, a sushi conveyor) and engineers a corner
detail (the right block size in the hotel's room numbers). The X audience is tech-heavy, but no beat should *depend*
on the insider layer.

---

## 4. The bilingual problem (EN for X, Chinese-subtitled for Douyin)

### 4.1 Three tiers of joke

| Tier | Travels? | Examples | Rule |
| --- | --- | --- | --- |
| A. Universal | Yes | Act-out, 场景错位 premises, visual 反差, rhythm (三翻四抖 with pictures), callbacks to on-screen objects, slapstick by the cat | Aim for about 70% of beats here. Picture-lock these. |
| B. Rewrite | With a new line | Verbal 预期违背, self-deprecation, idiom twists, cultural references | Same timing, two independently written punchlines. |
| C. One language only | No | 谐音梗 (面/馍/面膜), Chinese meme lines (谐音梗扣钱), English puns ("cache"/"cash") | Pair with a *different* joke in the other language on the same beat, or play that beat straight there. Never explain a pun; replace it. |

### 4.2 Production rules for our pipeline

- **Picture-lock the punch, not the words.** Leave 0.5-1.0 s of slack after each verbal punch, because ZH and EN lines
  read at different speeds.
- **Type layer per language.** The kit draws text on a canvas layer, so render with `LANG=en` and `LANG=zh`. Red-pen
  notes are *written* in each language, not translated.
- **If one English VO also serves Douyin with Chinese subtitles**, ZH-only jokes cannot live in the VO. Put them in the
  red-pen notes or a subtitle aside written like a fansub translator's note (译者注). That is a familiar comic format in
  Chinese fansub culture (my observation, not a sourced fact). If there is a Chinese VO, the ZH punchlines go in the VO.
- **Cultural swaps** (same picture idea, different reference):

| Idea | ZH | EN |
| --- | --- | --- |
| Crowded transfer | 春运火车站 | holiday airport rush |
| Idle by design | 摸鱼 | "scheduled slacking" |
| Passing data around | 传纸条 | passing notes |
| Waiting for the slowest | 交卷 | "pencils down" |
| Bored experts | 斗地主 | poker |
| Team that needs good members | 小组作业 | group project |
| Endless queue | 食堂打饭 | DMV line |

### 4.3 Example pairs (same picture, two punchlines)

- **Tokenizer bill:** ZH "谐音梗要扣钱——字面意义上的" / EN "Puns cost extra. Literally: 12 tokens vs 5."
- **Pipeline bubble:** ZH "这段摸鱼，是写进排班表的" / EN "This slacking is in the schedule."
- **Superposition split:** ZH "'叠'被切成两半，它自己先叠加了。——不是量子，是 UTF-8。" / EN "The Chinese word for
  superposition gets cut in half. Not quantum. UTF-8."
- **Ring attention:** ZH "上课传纸条，老师是时钟" / EN "Passing notes, and the teacher is the clock."
- **Decoherence:** ZH "社恐量子比特" / EN "a qubit with stage fright"

---

## 5. Joke bank (48 gags and premises)

Format: **gag**, then *device* | *language* | *anchor* (fact and source) | *watch-out*. Language codes: EN+ZH means it
works in both (tier A, or tier B with two written lines); ZH means ZH-strong and needs a different EN beat; EN means
the reverse.

### Tokenization (course L01)

- **T1. "分词被分词了"** The red pen writes 分词 on a sticky note and feeds it to GPT-4's tokenizer. It comes back as
  分 plus two broken byte shards of 词 (render as two halves of "�"). Tag: GPT-4o's tokenizer keeps 词 whole.
  *反差 + act-out* | ZH (EN with subtitle "the Chinese word for 'tokenization' doesn't survive tokenization") |
  *cl100k_base: 分词 -> 3 tokens [分][E8 AF][8D]; o200k_base -> 2 tokens (own run, tiktoken 0.14.0)* | name the tokenizer.
- **T2. "叠加态 in superposition"** Both tokenizers cut 叠 into two byte pieces. Boke: "it's in a superposition!"
  Tsukkomi: "No. It's UTF-8."
  *semantic pun + 吐槽* | ZH (EN with gloss) | *叠加态 -> 4 tokens in both; 叠 = [E5 8F][A0] (own run)* | the 吐槽 line is
  mandatory, or it implies a false link.
- **T3. "st-raw-berry"** GPT-4o's tokenizer reads "strawberry" (no leading space) as st | raw | berry; with a leading
  space it is one token. The model never sees letters, which is why letter-counting is hard.
  *预期违背 + visual* | EN (ZH visually) | *own run: cl100k str|aw|berry, o200k st|raw|berry* | the strawberry meme is
  from 2024, so stale: use it as a 2 s tag, not the premise, and don't claim current models fail at it.
- **T4. "谐音梗要扣钱, literally"** "谐音梗要扣钱。" = 12 tokens and "Puns cost extra." = 5 tokens (cl100k), and APIs
  bill by the token.
  *callback to a famous meme + meta-pun* | ZH (EN weaker) | *own run; course L01 "pricing… measured in tokens"* | don't
  name the person behind the meme; say "more tokens", not "costs you money".
- **T5. "Same sentence, two receipts"** Two receipts print from the v10 bill printer: the KV-cache sentence is 18
  tokens in English and 27 in Chinese on GPT-4's tokenizer, 18 vs 17 on GPT-4o's.
  *反差 + callback (the bill)* | EN+ZH | *own run; course L01 table (per 1,000 characters: EN ~250 tokens, ZH ~700-1,100)*
  | compare the same meaning, not characters; it is one sentence, so say "this sentence".
- **T6. "The dictionary needs its own truck"** A 200k vocabulary x hidden size 4096 is about 819M parameters for the
  embedding table alone (32k is about 131M). The model moves house; the dictionary rides in a separate truck.
  *夸张 with a real number* | EN+ZH | *course L01* | assumes hidden size 4096.

### Attention (L02-L03, L11, FlashAttention)

- **A1. "Everyone greets everyone"** A party where every guest must greet every guest: 10 guests means 100 greetings,
  1,000 means a million, 100,000 means 10 billion, and the venue (GPU memory) catches fire.
  *三翻四抖 + 场景错位* | EN+ZH | *attention scores are N x N, quadratic in sequence length (FlashAttention abstract)* |
  a causal model computes about half; the 吐槽 says "scores", not handshakes.
- **A2. "No spoilers"** Each token wears blinders that only see leftward; one tries to peek ahead and the red pen
  slaps "NO SPOILERS". The lower-triangular mask is drawn exactly.
  *装傻/吐槽 + running gag* | EN+ZH | *decoder-only causal attention (course L13 prefill/decoding)* | nerd tag:
  encoders like BERT see both ways.
- **A3. "The chef and the warehouse"** Standard attention runs down to HBM (the basement warehouse) for every pinch of
  salt; FlashAttention keeps a tray (a tile in SRAM) at the stove. Tsukkomi: "And it's exact, not an approximation."
  *场景错位 + act-out* | EN+ZH | *Dao et al. 2022: IO-aware, exact, tiling, fewer HBM accesses* | "exact" must be said.

### KV cache, serving, batching (L13)

- **K1. "The waiter who re-reads the whole order"** With no KV cache, each new token recomputes everything, like a
  waiter reading the full order aloud before adding one item. Three ever-longer orders; on the fourth beat the
  customer has grown a beard.
  *三翻四抖 + act-out* | EN+ZH | *course L13 (KV cache, decode stage)* | the cache stores per-layer K and V, not "answers".
- **K2. "A banquet hall for a party of three"** Old serving systems reserved one contiguous max-length chunk per
  request. vLLM's profiling found only **20.4%-38.2%** of KV-cache memory held real token states. PagedAttention hands
  out hotel rooms (blocks) as guests arrive: near-zero waste, **2-4x** throughput.
  *场景错位 + 反差 with real numbers* | EN+ZH | *Kwon et al., SOSP'23 (abstract; Sec. 3, Fig. 2); course L13
  (reservation waste, internal fragmentation)* | the numbers describe the prior systems profiled in that paper.
- **K3. "复读机 system prompt"** Every scene opens with the same 2,000-word preamble read aloud, a little faster each
  time. Payoff: prefix sharing (SGLang's RadixAttention): "say it once."
  *running gag* | EN+ZH (复读机 is a nice ZH label) | *course L13 outline* | call it prefix caching or sharing.
- **K4. "Conveyor sushi"** Static batching is a bus that won't leave until everyone from the last trip has got off.
  Continuous batching (ORCA, OSDI'22, scheduling per iteration) is conveyor sushi: a seat frees, a new diner sits,
  every rotation.
  *场景错位* | EN+ZH | *course L13* | none.
- **K5. "Kitchen vs front of house"** Prefill reads the whole menu at once (compute-bound); decode orders one dish at a
  time (memory-bound). Prefill-decode disaggregation separates the kitchen from the waiters. Tsukkomi: "now carry the
  KV cache across the street", because it needs a fast network.
  *漫才 + 场景错位* | EN+ZH | *course L13 (PD disaggregation needs a fast network for KV transfer)* | none.
- **K6. "The 300-page order"** One customer reads a 300-page order at the counter and blocks the line. Chunked
  prefill cuts it into slices served between the others.
  *act-out* | EN+ZH | *course L13* | none.

### Quantization (L12)

- **Q1. "16 crayons"** INT4 has 16 levels; FP16 has 65,536 bit patterns. Render the lab's real group photo at 16 grey
  levels: surprisingly fine, until an outlier ruins it (Q2).
  *反差 + act-out (a real asset)* | EN+ZH | *arithmetic; 4-bit weights are about 1/4 of FP16 memory plus scales* | FP16
  values are not evenly spaced, so say "bit patterns".
- **Q2. "The 2.3 m classmate"** In the class photo, one very tall student forces the camera to zoom out until
  everyone else is a few pixels: the scale is set by the max. LLM.int8() gives the outlier feature dimensions their own
  16-bit lane while more than 99.9% of values stay 8-bit.
  *场景错位 + 反差* | EN+ZH | *Dettmers et al. 2022 abstract; course L12 (int8 outliers kept in FP16, SmoothQuant)* |
  outliers are activation *feature dimensions*, not tokens; the tall student is the hero, not the butt.
- **Q3. "Bit diet"** 16-bit, then 8-bit (fine), then 4-bit (fine with GPTQ/AWQ), then the fourth beat is an obviously
  cartoon 1-bit model answering in grunts.
  *三翻四抖* | EN+ZH (punch rewritten) | *course L12 (GPTQ "first 4-bit high accuracy solution", W4A16)* | the punch
  must look like hyperbole; never imply 4-bit is broken; avoid claims about real low-bit models.

### Mixture of experts (L14)

- **M1. "256 specialists, 8 per patient"** A hospital where each patient sees 8 of 256 specialists: payroll vs the cost
  of one visit. DeepSeek-V3 has **671B parameters, 37B activated per token**.
  *场景错位 + 反差* | EN+ZH | *DeepSeek-V3 report abstract; course L14 table (256 experts, 8 selected; the slide says
  36B, so use the report's 37B)* | it is not "a 37B model".
- **M2. "The doctor nobody visits"** Without load balancing the router keeps choosing the same experts ("Most experts
  are never trained", course L14). One doctor has a queue out the door while the rest play 斗地主 (EN: poker), which
  keeps running in the background. Payoff: one finally gets a patient after the balancing loss or bias fix.
  *act-out + running gag + cultural swap* | EN+ZH | *course L14 (TopK effect, load-balance loss, DS-V3 bias-based
  balancing)* | none.
- **M3. "Travel rush for tokens"** Expert parallelism needs all-to-all: tokens cross a transfer hall to their expert's
  GPU and back. This calls back to the lab's own v2 ISCA comic (tokens jammed at the links between dies).
  *callback across the account + 场景错位* | ZH 春运 / EN holiday rush | *course L14 (EP + all-to-all)* | none.

### Parallelism (L04-L07)

- **P1. "The 1,043 GB suitcase"** Training a 70B model in mixed precision with AdamW: weights 130.4 GB, gradients
  130.4 GB, optimizer states 782.3 GB, total **1,043.1 GB**, against one 80 GB GPU. Weights? No. Gradients? No. Adam
  states? The GPU faints. ZeRO is roommates each carrying a slice.
  *三翻四抖 + act-out* | EN+ZH | *course L06 worksheet; ZeRO in L05* | activations excluded; "80 GB" is an example card
  (an A100-80GB appears on a course L12 slide).
- **P2. "Scheduled slacking / 写进排班表的摸鱼"** Pipeline bubble ratio = (N-1)/M: stations stand idle at the start of
  each shift. More micro-batches shrink the bubble. Worksheet example: all-forward-all-backward 100% vs 1F1B 83.3%.
  *反差 + act-out* | ZH 摸鱼 / EN scheduled slacking | *course L06-L07* | the worksheet numbers are for its uneven
  example only.
- **P3. "Surgeons by mail"** Tensor parallelism over a 25 GB/s link: communication takes about 4x the compute, so
  about 80% of GPU time is spent waiting. Over NVLink it works. Two surgeons share one operation but can only write
  letters.
  *场景错位 + 反差* | EN+ZH | *course L07 slide (A100, 312 TFLOPS at 50%, h = 4096)* | none.
- **P4. "传纸条 / passing notes"** Context parallelism: the sequence is too long for one GPU, so each keeps its chunk
  of queries and K/V blocks travel around the ring like notes around a classroom. The teacher is the clock.
  *场景错位 + act-out* | EN+ZH | *course L07 (CP, ring)* | K/V move, Q stays; compute and communication overlap.
- **P5. "Shouting vs pigeons"** Inside a node, ~900 GB/s (shouting across the dorm); between nodes, ~50 GB/s (carrier
  pigeons). So reduce inside first, then send one pigeon.
  *反差 + act-out* | EN+ZH | *course L05 hierarchical all-reduce (example numbers, "e.g.")* | say "example
  bandwidths".

### Speculative decoding (L08, L10)

- **S1. "Intern drafts, boss signs"** A small model drafts several tokens; the big model checks them all in one pass,
  keeps the accepted prefix and replaces the first rejection with its own token. The output distribution is unchanged.
  The intern plays dumb with confident guesses; the boss's red pen stamps ✓ ✓ ✗.
  *装傻/吐槽 + running gag (the stamp)* | EN+ZH | *Leviathan et al. 2022: "without changing the distribution", 2-3x on
  T5-XXL, identical outputs; course L08* | the payoff line is "same output as the boss alone"; the speedup depends on
  the acceptance rate.
- **S2. "抢答 / the kid who blurts out answers"** The classmate shouts the answer before the teacher finishes. Right:
  time saved. Wrong: the teacher's answer stands.
  *act-out* | EN+ZH | *as S1* | none.
- **S3. "Grandpa CPU"** A 1990s CPU cameo: "I've been speculating for decades." The idea is borrowed from speculative
  execution in classical computer architecture.
  *反差 + 自嘲 (systems people)* | EN+ZH | *course L08 ("Inspired by speculative execution in classical computer
  architecture")* | keep it to a 2 s tag.

### ML compilers and Triton (L09)

- **C1. "Three trips to the supermarket"** Unfused operators: load, add, store; load, relu, store; load, scale, store.
  Fourth beat: "Ever heard of a shopping list?" That is fusion.
  *三翻四抖 + act-out* | EN+ZH | *course L09 (graph-level fusion in TVM)* | fusion cuts memory traffic, not FLOPs.
- **C2. "Soldiers vs platoons"** In CUDA you command thousands of soldiers one by one; in Triton you command platoons
  (blocks) and the compiler handles the inside.
  *反差 + act-out* | EN+ZH | *course L09 (Triton among tile-level DSLs)* | CUDA still exists underneath.
- **C3. "Autotuning!"** An homage to xkcd #303 "Compiling" (2007): two lab members sword-fight on office chairs, and
  when a manager calls they shout "Autotuning!".
  *callback to a nerd classic + act-out* | EN | *xkcd 303 exists (fetched)* | homage, not a copy of the drawing; lab
  members only with consent; the reference is old, so use it as a tag.
- **C4. "The curse of specialization"** Every time the narrator says "new hardware", a new DSL name card drops
  (cuTile, NKI, Pallas, TileLang…). On the fourth, the whiteboard runs out of room.
  *running gag + 三翻四抖* | EN+ZH | *course L09 slide "The Curse of Specialization" and the landscape slide* | mock
  nobody; names only, no logos.

### RL for LLMs (L10)

- **R1. "12 x 34 = 56?"** RLVR: the model confidently says 56, the verifier smacks back 408. The training data becomes
  (56, A = -1) and (408, A = +1). GRPO is "grading on a curve inside the group".
  *装傻/吐槽* | EN+ZH | *course L10 slide (12x34 example, GRPO, DeepSeek-R1 reference)* | the tsukkomi gives the precise
  version (group-relative advantage).
- **R2. "Pencils down / 交卷"** "In RL, generation is the bottleneck: mem-bound, limited parallelism, long-tail." The
  whole exam room (the trainer GPUs) waits for one student still writing page 30. Then async RL.
  *act-out + 反差* | EN+ZH | *course L10* | none.
- **R3. "Teaching to the test"** A hypothetical: the model learns what makes the checker say ✓ (the right format)
  rather than solving the problem.
  *预期违背* | EN+ZH | *reward hacking is a known RL failure mode; this specific scene is illustrative* | label it as
  hypothetical.

### Quantum (lab research area; not in CSE 291)

- **QC1. "It tries every answer at once." No.** The boke states the myth. The tsukkomi: quantum computers "won't solve
  hard problems instantly by just trying all solutions in parallel". Then the real point: amplitudes interfere, and a
  measurement returns one outcome.
  *装傻/吐槽 + 预期违背 (misconception first)* | EN+ZH | *Scott Aaronson's blog tagline (fetched); Muller 2008* | quote
  without making him a character.
- **QC2. "Analogy police"** Whenever a spinning coin appears as the picture of superposition, a siren sounds and the
  red pen writes "classical uncertainty ≠ superposition". On the third appearance the narrator slips himself.
  *running gag + 自嘲* | EN+ZH | *standard QM: complex amplitudes, interference* | end on the correct picture
  (amplitudes or the Bloch sphere).
- **QC3. "No Ctrl+C"** Copy a file ✓, copy a photo ✓, copy a qubit: "Not permitted by physics" (no-cloning). So error
  correction spreads the information over many qubits and measures parities (syndromes) without reading the data.
  *三翻四抖 + act-out* | EN+ZH | *no-cloning theorem (Wootters-Zurek / Dieks, 1982; citation from memory, verify
  before publishing)* | the 吐槽 must add "encoding is not copying" (α|000⟩+β|111⟩).
- **QC4. "101 babysitters"** Google (2024): a distance-7 surface code used **101 qubits** for one logical memory. The
  error rate drops **2.14x** each time the distance grows by 2, and the logical qubit outlives its best physical qubit
  **2.4x**. 101 nannies for one baby, and more nannies help only if each is good enough.
  *反差 + 场景错位* | EN+ZH | *arXiv:2408.13687 abstract* | it is a logical *memory*, not a full computer.
- **QC5. "A referee at 1.1 µs"** A new syndrome round every **1.1 µs**; the real-time decoder averages **63 µs**
  latency at distance 5 and keeps up for up to a million cycles. A referee in a match where a new play happens every
  microsecond: if he falls behind, the pile of unreviewed plays grows forever.
  *act-out + 三翻 (1 play, 1,000, 1,000,000)* | EN+ZH | *same abstract* | latency is longer than a cycle; the point is
  that throughput keeps up. Don't say each round is decoded in 1.1 µs.
- **QC6. "Group project above threshold / 小组作业"** More qubits help only if each one's error rate is below the
  threshold; otherwise more teammates means more mistakes.
  *场景错位 + 自嘲 (students)* | EN+ZH | *same abstract ("only occurs if the physical error rate is below a critical
  threshold")* | none.
- **QC7. "社恐量子比特 / stage-fright qubit"** Decoherence: the qubit loses its tune whenever anything touches the
  stage. Tsukkomi: "Not when someone *looks*. When anything *interacts*."
  *拟人 + 反差 + 吐槽* | ZH 社恐 / EN stage fright | *standard decoherence* | kill the "consciousness collapses it" myth.
- **QC8. "The hourly disaster"** Repetition codes up to distance 29 are limited by rare correlated error events about
  once an hour (about 3x10^9 cycles): billions of perfect cycles, then a fire drill.
  *running gag + 反差* | EN+ZH | *same abstract* | don't name a cause; the abstract does not.

### Account-level and meta

- **X1. "*… not included"** Every episode ends with a footnote that continues the launch film: "*KV cache not
  included", "*error correction not included".
  *callback across episodes + 名场面* | EN+ZH | *v10 film / POST_v10.md* | the episode itself must still make sense
  without it.
- **X2. "Frame counter"** A fourth-wall break, as in 《小品的世界》: the narrator says "imagine 100,000 tokens", the
  render's frame counter in the corner slows down, and the cat stares at it.
  *meta + 反差* | EN+ZH | *the films really are rendered frame by frame* | use real render times from the kit's log.
- **X3. "Red pen vs serif"** The house manzai: the serif line states, the red pen corrects. Introduce it in episode 1
  and keep it as the series voice.
  *装傻/吐槽 as a format* | EN+ZH | *v10 voice ("warm nerds": Instrument Serif and red-pen Caveat)* | none.
- **X4. "The cat is the only safe butt"** The cat knocks old KV blocks off the desk: cache eviction as slapstick.
  *act-out + running gag* | EN+ZH | *v10 cat continuity* | if an eviction policy is named, name it correctly.

---

## 6. What to avoid

- **Punching down.** Students, people who don't know the topic ("this is so easy"), non-native accents, region (地域黑),
  gender, appearance, disability, religion. The PLOS ONE data show identity jokes are what science audiences find
  offensive. 徐志胜 and 何广智 joke about *their own* looks and poverty; we can borrow the self-mockery move, aimed only
  at ourselves.
- **Jokes about real people (lab rule).** That includes CEOs, researchers, other labs and their papers ("their method
  is slow" is punching sideways), comedians, and lab members without consent.
  - The v10 post quotes four CEOs verbatim with sources. It aims at the compute bill, not the people, and
    `POST_v10.md` keeps a lower-risk version with no names. Treat that as the ceiling, not a template.
  - Don't name the person behind a meme you reference (T4).
  - No caricatures of real people. A recognizable outfit counts as a caricature.
- **Reusing bits (抄梗).** Borrow devices, never lines. Don't put 鸟鸟's "略略略" or the 技能五子棋 chant in our videos.
  Quote a line only when it is analysed and credited.
- **Politics and geopolitics.** Chip export controls (e.g. the H800 lower-NVLink detail on the course L14 slide: teach
  the bandwidth, skip the why), the US-China "AI race", Taiwan, elections, the military, and the AI-doom vs.
  accelerationist wars. Chinese platforms enforce this: in May 2023 笑果's operating company was fined 13,353,816
  yuan, and 1,325,381.6 yuan of illegal gains were confiscated, after a performer's joke judged to insult the army.
  Its Beijing shows were suspended indefinitely.
- **Harsh satire and sneering**, even at abstract targets (see 3.1). Gentle teasing of a *problem* is fine.
- **Hype jokes.** "AGI next Tuesday" or "AI will replace you" conflict with accuracy and age quickly.
- **Stale memes and slang overuse** (my judgement, not a measured list):
  - The strawberry r-count as a premise.
  - "X is all you need" title puns.
  - Generic reaction-meme templates.
  - Slang peaks: yyds, 绝绝子, 家人们谁懂啊, 遥遥领先 (also tied to a brand).
  - English brainrot slang.
  One fresh, *specific* reference beats three trending ones; trending slang dates the video within months.
- **"AI-ish" comedy smells** (the user rejects anything generic):
  - Template jokes ("X walks into a bar", "Why did the proton cross the road").
  - Puns on technical terms with no situation behind them.
  - Explaining the joke.
  - Laugh tracks, emoji (also a house rule), random meme stickers.
  - Gags not tied to the mechanism, and a pile of disconnected jokes.
  The antidote is *specificity*: a real number, a real lab detail, a real constraint.
- **Fake numbers inside jokes** (section 3.2, test 3).
- **Side-line risks.**
  - The "$5 / 24 h San Diego" challenge can drift into poverty tourism. The butt must be the host's incompetence,
    never people experiencing homelessness or workers. Don't film strangers without consent.
  - The scooter tutorial must not model unsafe riding: helmet, traffic law. Check the current California rules before
    you film; none were checked here.
  - Game tutorials: don't invent hero mechanics; check the current patch.

---

## 7. Side line (iPhone vlogs): quick device notes

These are premises, not facts; check every claim before filming.

- **Deadpan tutorial voice over chaotic footage (反差).** Narrate a scooter ride like a launch countdown, using a real
  safety checklist as the "pre-flight" list. The joke delivers the safety content.
- **三翻四抖 of failures.** Attempts 1-3 fail the same way; the fourth succeeds in the dumbest possible way.
- **Crossover with the main line.** Track the $5 budget like a token budget ("remaining context: $1.25"), ending with
  "*lunch not included".
- **Game tutorial as a CSE lecture (反差).** Slide numbers, a "worksheet", an attention heat map over the minimap. If
  甄姬 is not a standard jungle pick in the current patch **(unverified)**, the premise itself is the joke.
- **Two-person 漫才.** A lab member as the straight man (with consent), the host as the boke.

---

## 8. Sources

Comedy shows and performers
- 一年一度喜剧大赛 S1 results: https://zh.wikipedia.org/zh-cn/%E4%B8%80%E5%B9%B4%E4%B8%80%E5%BA%A6%E5%96%9C%E5%89%A7%E5%A4%A7%E8%B5%9B ; https://www.sohu.com/a/515166959_121135336 ; https://baike.baidu.com/item/%E4%B8%80%E5%B9%B4%E4%B8%80%E5%BA%A6%E5%96%9C%E5%89%A7%E5%A4%A7%E8%B5%9B%E7%AC%AC%E4%B8%80%E5%AD%A3/62060507
- 《互联网体检》: https://time-weekly.com/post/285834 ; https://baike.baidu.com/item/%E4%BA%92%E8%81%94%E7%BD%91%E4%BD%93%E6%A3%80/58893060 ; https://zhuanlan.zhihu.com/p/426096947
- 一年一度喜剧大赛2 results: https://news.qq.com/rain/a/20221218A01RDP00 ; https://ent.sina.cn/zy/2022-12-20/detail-imxxhwte0764786.d.html
- 喜人奇妙夜 S1: https://www.163.com/dy/article/JBMDBJFB055633XD.html ; https://news.qq.com/rain/a/20240909A0708O00 ; https://www.thepaper.cn/newsDetail_forward_28679892
- 《八十一难》: https://baike.baidu.com/item/%E5%85%AB%E5%8D%81%E4%B8%80%E9%9A%BE/64634863 ; script excerpt http://www.dousg.com/news/show-941.html ; https://news.qq.com/rain/a/20240712A0AF7700 ; https://www.zhihu.com/question/661070141
- 《小品的世界》: https://xinwen.bjd.com.cn/content/s66822233e4b07e497a975a69.html ; https://www.inewsweek.cn/people/2024-07-29/22684.shtml
- 喜人奇妙夜 S2 and 《技能五子棋》: https://m.bjnews.com.cn/detail/1758950868168840.html ; http://finance.sina.com.cn/jjxw/2025-10-16/doc-infuakcp2565778.shtml ; https://www.sohu.com/a/939005438_121826468 ; https://www.zhihu.com/question/1980605851153749439 ; https://news.qq.com/rain/a/20251209A07H0200 ; https://view.inews.qq.com/a/20251130A03F9H00
- 脱口秀大会 seasons: https://zh.wikipedia.org/wiki/%E8%84%B1%E5%8F%A3%E7%A7%80%E5%A4%A7%E4%BC%9A ; https://www.bbtnews.com.cn/2022/1116/458086.shtml
- 徐志胜: https://news.qq.com/rain/a/20210903A036D300
- 鸟鸟: http://www.ctdsb.net/c1742_202211/1572296.html ; https://news.qq.com/rain/a/20221116A09WIL00
- 何广智: https://k.sina.cn/article_5726009017_v1554bf6b901900phw1.html ; https://news.qq.com/rain/a/20221114A0665000 ; S2 title: https://news.qq.com/rain/a/20250831A00J5N00 ; https://www.chinanews.com.cn/cul/2025/08-30/10473946.shtml ; https://finance.sina.com.cn/jjxw/2025-08-30/doc-infntvsk1731909.shtml
- 庞博: https://k.sina.cn/article_6177512772_170355d44019016p5p.html ; https://news.qq.com/rain/a/20241014A07K0S00
- 呼兰: https://k.sina.com.cn/article_5737990122_15602c7ea01901077o.html ; https://www.163.com/dy/article/HMDFDJL20553QRWY.html
- 小鹿: https://news.qq.com/rain/a/20220922A08PGE00 ; https://m.jiemian.com/article/12085356.html ; https://www.163.com/dy/article/HJ39282U0518AFNU.html (secondary for the 30-year line)
- 漫才兄弟: https://m.thepaper.cn/newsDetail_forward_29171613 ; https://m.voc.com.cn/xhn/news/202410/20885807.html ; https://news.qq.com/rain/a/20240925A08SKA00
- 李诞, 人间不值得: https://baike.baidu.com/item/%E4%BA%BA%E9%97%B4%E4%B8%8D%E5%80%BC%E5%BE%97/56247202 ; 谐音梗扣钱: https://news.qq.com/rain/a/20220222A0C4DT00 ; https://www.maigoo.com/goomai/284273.html
- 三翻四抖: https://baike.baidu.com/item/%E4%B8%89%E7%BF%BB%E5%9B%9B%E6%8A%96/8668232 ; https://zh.wikipedia.org/wiki/%E5%8C%85%E8%A2%B1_(%E7%9B%B8%E8%81%B2)
- Manzai: https://en.wikipedia.org/wiki/Manzai
- Stand-up terms: 单立人 handbook https://yes1am.github.io/stand-up-comedy/ ; 程璐 on callback https://site.douban.com/widget/notes/2381693/note/216157436/
- 笑果 2023 fine: https://www.yicai.com/news/101758850.html ; https://zh.wikipedia.org/zh-hans/%E6%9D%8E%E6%98%8A%E7%9F%B3%E4%BA%8B%E4%BB%B6
- 何同学 5G video: https://www.jiemian.com/article/6737714.html ; 毕导: https://sw.kpcswa.org.cn/Catalog/202302/VCResearch/2023/1101/526.html

Humor and learning research
- Banas, Dunbar, Rodriguez & Liu, "A Review of Humor in Educational Settings: Four Decades of Research", *Communication Education* 60(1):115-144, doi:10.1080/03634523.2010.496867
- Wanzer, Frymier & Irwin, "An Explanation of the Relationship between Instructor Humor and Student Learning: Instructional Humor Processing Theory", *Communication Education* 59(1):1-18, doi:10.1080/03634520903367238
- Yeo, Anderson, Becker & Cacciatore, "Scientists as comedians…", *PUS* 29(4):408-418 (2020), doi:10.1177/0963662520915359
- Yeo, Su, Cacciatore, McKasy & Qian, "Predicting Intentions to Engage With Scientific Messages on Twitter…", *Science Communication* 42(4) (2020), doi:10.1177/1075547020942512
- Freiling et al., "Communicating About Renewable Energy With Satire…", *Science Communication* 47(4) (2024), doi:10.1177/10755470241293361
- Yeo et al., "Examining the Use of Aggressive Satirical Humor on Perceptions of Trustworthiness…", *Science Communication* (2025), doi:10.1177/10755470251345746
- Cooper et al., "To be funny or not to be funny…", *PLOS ONE* 13(8):e0201258 (2018)
- Riesch, "Why did the proton cross the road? Humour and science communication", *PUS* 24(7):768-775, doi:10.1177/0963662514546299
- Muller, *Designing Effective Multimedia for Physics Education* (PhD, Univ. of Sydney, 2008): https://www.per-central.org/items/detail.cfm?ID=11344
- Fireship's "in 100 Seconds" format (a short, humorous code-explainer precedent): https://read.engineerscodex.com/p/how-fireship-became-youtubes-favorite
- Translating humor across Chinese and English subtitles: https://www.tandfonline.com/doi/abs/10.1080/0907676X.2020.1815814

Technical anchors
- CSE 291 slides L01-L14 (scratchpad `course/`).
- Kwon et al., PagedAttention / vLLM (SOSP'23), arXiv:2309.06180.
- Leviathan et al., speculative decoding, arXiv:2211.17192.
- Dettmers et al., LLM.int8(), arXiv:2208.07339.
- Dao et al., FlashAttention, arXiv:2205.14135.
- DeepSeek-V3 Technical Report, arXiv:2412.19437.
- Google Quantum AI, "Quantum error correction below the surface code threshold", arXiv:2408.13687.
- Scott Aaronson's blog tagline: https://scottaaronson.blog/
- xkcd 303 "Compiling": https://xkcd.com/303/
- Token counts: own runs with `tiktoken` 0.14.0 (cl100k_base, o200k_base).
