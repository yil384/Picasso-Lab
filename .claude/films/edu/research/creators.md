# Style DNA: 影视飓风 / Tim, 老师好我叫何同学, 毕导THU, and rules for Picasso Lab's 60-150 s vertical LLM-systems explainers

Prepared 2026-10-04 for @PicassoLabUCSD (主线: code-rendered q5.js + three.js explainers built from CSE 291 "LLM System Optimization"; 支线: iPhone vlog "tutorials"). Default output: 9:16, English cut for X, Chinese-subtitled cut for Douyin.

---

## 0. How this was researched (and what counts as "verified")

| Evidence | What it gave | Reliability |
| --- | --- | --- |
| Bilibili search API (`x/web-interface/search/type`), pulled 2026-10-04 | Exact titles, view counts, durations, upload dates, descriptions and tags of each creator's top ~40 videos; account follower counts and signatures; cover images | Exact as of that day (view counts keep moving) |
| Official YouTube uploads, **manual** subtitles (Mediastorm影视飓风, 老师好我叫何同学 / HTX Studio) | Word-for-word scripts of 10 Tim videos and 2 何同学 videos (Chinese, plus English for several Mediastorm videos) | Verbatim |
| Official YouTube audio, transcribed locally with whisper.cpp large-v3-turbo | First 150 s or the full script of 5 何同学 videos and 10 毕导 videos | Machine transcript; homophone errors fixed only where the meaning is obvious. Quotes from these are marked **(ASR)** |
| Frames sampled from 4 videos + 36 Bilibili covers, inspected by eye | Visual grammar: subtitle style, picture-in-picture, props, cover layout | Direct observation, small sample |
| Press articles (界面, 澎湃, 腾讯新闻, 新浪, 36氪, 维基百科, 科普中国 framing study, 新榜 interview) | Background, controversies, creators' own statements | Secondary; quoted where possible |

Anything I could not check against one of these is marked **(unverified)**. View counts below are Bilibili plays as of 2026-10-04.

Account snapshot (Bilibili API, 2026-10-04):

| Account | Followers | Signature |
| --- | --- | --- |
| 影视飓风 (mid 946974) | 18,543,904 | "无限进步！" |
| 老师好我叫何同学 (mid 163637592) | 13,035,418 | "目标是做有意思的视频" |
| 毕导 (mid 254463269) | 8,390,938 | "和你一起感受科学的快乐和美！！也欢迎关注一个UP叫毕的二阶导" |
| 毕的二阶导 (mid 489763089, 毕导's short-form account) | 2,548,778 | "分享科学的快乐和美！" |

---

## TL;DR: the conclusions that matter for us

1. **The closest template for our format is 毕的二阶导, 毕导's short account, not his main channel.** It posts 1.5-4 min single-question pieces that get 3-12M plays each, for example *大海为什么是蓝色的？两个诺奖得主吵起来了……* (3:20, 11.9M) and *让100万网友吵架的问题，你能答对吗？* (3:09, 5.3M). They run as vertical shorts on YouTube. The beats repeat every time: a bet or poll, the wrong intuition argued well, a real experiment, "结果非常amazing啊", a formula with "稍加计算易得", an elegant extra fact, then a mock life lesson.
2. **Tim's 音画不同步 explainer is the best model for a systems-latency story.** It opens on a complaint everyone has seen, says "you're not imagining it", gives a baseline from the real world, then a demo the viewer does on themselves (McGurk). Thresholds are given in milliseconds and converted into frames. It walks the pipeline stage by stage, says "对吧？不对", shows the engineers' trick, and ends on a reflection. Swap "audio/video sync" for "time-to-first-token" and the structure carries over unchanged.
3. **何同学's edge is restraint, not effects.** He shows one object in a dark set, says a number, then escalates it ("不是2480…不是2万4800…整整9万个字"). Covers have little or no text. Under the polish there is a fair, pre-declared experiment with a control group and a failure he admits to. His descriptions disclose staging and speed ramps. That kind of honesty matters more for a professor's lab than it does for him.
4. **All three put a real artifact on screen**: a satellite and a Phantom camera (Tim), a desk he built and 40 phones (何同学), takeout boxes and a ¥300 acrylic tank (毕导). Our version is a real measurement: tokens/s, GPU memory and acceptance rates measured on lab hardware and drawn by the code-rendered scene. Simulations should run for real, like 毕导's "用Python开了10万辆公交车". They should not be animations made to look like data.
5. **Comedy here is structural, not a string of jokes.** The devices that repeat across all three: an anti-climax ("我惊喜地发现，这绝对不可能"; "研究了三个月后，我们放弃了"), a fake answer and retraction ("对不起各位，刚才都是我编的"), rule-of-three escalation ("很巧…更巧…最巧"), deadpan absurd props ("家中常备的高速相机/传送带/飞机"), sports commentary for a race between objects, and a meta-joke that turns the concept on the video itself.
6. **Some things do not transfer**: Tim's money-scale spectacle and team stunts, 何同学's months-long hardware builds and personal-life material, 毕导's toilet humor, licensed meme clips (Tom and Jerry), danmaku polls, and B站-specific slang ("三连", "小学二年级"). Each of the three has had a public backlash, and each one teaches a rule we can adopt: credit sources (何同学's ASCII-generator case), don't stage clips that can be cut out of context (Tim's 相亲角), and publish corrections openly (毕导's blueberry follow-up).

---

## 1. 影视飓风 / Tim (潘天鸿)

### 1.1 Snapshot
- Founder-led media company (杭州星奥传媒) with four Bilibili channels: 影视飓风 (main), 亿点点不一样 (science), 一步一部Rolling (short films), 飓多多StormCrew (behind-the-scenes and team challenges). Source: 维基百科.
- Tim's own content theory, from the 罗永浩 podcast as summarized by 人人都是产品经理 and 即刻:
  - Viral videos combine four elements: **"快乐幽默、知识、共鸣和节奏"**.
  - On the long-video form: **"以前的长视频是花很长时间讲一件事，现在长视频是不断转场给你讲八件事"**. Each segment should stand alone as a short, with several stimulus points such as "悬念、奇观、知识".
  - **"自媒体最大的修炼的点是大众情绪感知"**.
  - Titles and covers are now "比之前更激烈".
- English: the YouTube channel *Mediastorm影视飓风* uses English titles. On 2026-09-16 the team released a fully English-narrated iPhone 18 review; Tim stressed it was "没有AI，纯手搓" and that some shots were cut for time (新浪, 2026-09). This is a direct precedent for our English-for-X plan.

### 1.2 Signature formats
1. **Annual flagship review.** *选哪个？iPhone 18 Pro&Duo深度上手* (2026-09-16, 27:12, 15.4M); *外观变了，值得买吗？iPhone 17 Pro&Air评测* (2025-09-17, 30:15, 16.2M).
2. **"We pulled off an absurd shoot."** *我们买了一颗国产卫星。* (2023-11-28, 13:38, 14.5M); *我们拍到了，中国自己的可回收火箭。* (2026-01-08, 11.8M); *耗时2个月辗转10个机场，我们终于拍到了！* (2024-10-25, 9.7M).
3. **Gear and technology explainers.** *1秒能拍44万帧？！高速摄影的代价是…* (2025-06-14, 10.1M); *家里的旧光盘，为什么播不出来了？* (2026-08-07, 13.9M); *音画不同步！为什么视频口型总是怪怪的？* (YouTube upload; Bilibili figures not retrieved); *清晰度不如4年前！视频变糊是你的错觉吗？* (2024-10-08, taken down within a day).
4. **Humanities and expeditions.** *3000年前的"神兽"长什么样？* (14.1M); *关于"活着"，我们问了问余华* (10.9M); *去了一趟潮汕。* (11.7M).
5. **MrBeast-style challenges and stunts**, mostly on 飓多多StormCrew: hide-and-seek, "破产团建", the 100-hour island livestream.

### 1.3 Representative videos and why they work

| Video (exact title) | Data | What made it work |
| --- | --- | --- |
| 我们买了一颗国产卫星。 | 2023-11-28, 13:38, 14.5M | Opens on the payoff shot (the rocket) and confirms it: "这是真的". Then a superlative plus a time cost ("我们做过最离谱的一个项目，耗时两年半"). The story starts from a fan promise made in 2021 ("让大家写下心声…2年后，我们真的做到了"). Ends on a personal dream ("我的此生的梦想 是去火星看看 / 梦想可以大 第一步总是小的"), then a stinger after the sign-off. |
| 1秒能拍44万帧？！高速摄影的代价是… | 2025-06-14, 11:22, 10.1M | Cold open on a spectacle with a hard number attached: "你现在看到的，是玻璃裂开的瞬间。玻璃裂纹每秒可以传播上千米，而你必须要使用每秒4万帧以上…". Candid about money ("我们花光了预算…赚到了比较多的收入"). The sponsor is woven in as a test subject (徕芬 razors, "一拍即合"). |
| 音画不同步！为什么视频口型总是怪怪的？ | YouTube, ~8.5 min | The best structural model for us; full beat map in 1.5. |
| 家里的旧光盘，为什么播不出来了？ | 2026-08-07, 12:52, 13.9M | A host other than Tim (乐乐) opens with her own artifact: "这是2002年刻在光盘里面 我6岁时候的影像". Then a crowd-sourced pile of broken discs, then the question. Shows the format is a team grammar, not one face. |
| 世界上最疯狂的摄影棚？我们参观了野兽先生工作室！ | 2025-06-02, 30:34, 13.8M | Understated scale and self-comparison: "这个楼看着平平无奇…他总共有8个亿的粉丝…比我们还要高好几个量级…光是拍一期节目 他们就能产生40多个吉尼斯纪录". Ends with an actionable three-step lesson (立项方向 / 中期纠错 / 复盘). |
| AI可以取代我，那我的意义是？ | 2025-11-28, 23:09, 11.9M | A live contrast experiment as the hook: 9 people spend an hour on one drawing, 6 AIs take 15 s. Then the uncomfortable question, "请问我们为什么要用手工做东西 而不用AI去做它". Relevant to our "no AI-ish visuals" stance. |
| 一位粉丝想看到自己奔跑的样子 | 2022-12-02, 18:49, 12.1M | Emotional stakes: an amputee fan's message turns into a 9-month VFX project and a charity call to action. |

### 1.4 Hook patterns, first 3-15 s (verbatim from manual subtitles)
- **Spectacle plus a number**: "你现在看到的，是玻璃裂开的瞬间…每秒4万帧以上" (440k fps). "这枚正在飞出地球 / 这是真的 / 这应该是有史以来我们做过最离谱的一个项目" (satellite). The English cut reads "This rocket flying out of the Earth… contains our satellite. For real."
- **Shared annoyance, then validation**: "在互联网上，你应该多多少少看过这样的评论：为什么总感觉屏幕里这个人说话的时候，他的声音和嘴巴对不上…所有人都有这个疑惑…你的感觉很有可能不是错觉，这背后的原因又会比想的要复杂很多。你会感兴趣的，我们直接开始".
- **The viewer's objection, then evidence against the product**: "我为什么不买一个好的直板手机…结果这两天我们在回看素材的时候发现…这个屏幕居然已经有问题了" (iPhone 18 Duo).
- **Live contrast experiment**: 9 humans for 1 hour vs 6 AIs for 15 s (AI video).
- **Personal artifact**: "这是2002年刻在光盘里面我6岁时候的影像" (discs).

### 1.5 Script structure: the 音画不同步 beat map (manual subtitles, timestamps in seconds)
| t | Beat | Line or device |
| --- | --- | --- |
| 0-16 | Common complaint, validation, promise | "你的感觉很有可能不是错觉…你会感兴趣的 我们直接开始" |
| 29-60 | Real-world baseline | Light is 300,000 km/s, sound ~340 m/s; at a concert "两者会差出去0.1秒…但是我们从来没有觉得现实中难受" |
| 62-120 | Mechanism plus a demo on the viewer | "多感官整合"; McGurk effect: "你听到的是不是更接近far…但实际上我发出的是bar" |
| 121-176 | Hard numbers in familiar units | Audio early: noticeable at 45 ms ("也就是30帧视频的一帧半"), annoying at 90 ms. Audio late: 125 / 185 ms. Asymmetry explained by the baseline. |
| 180-250 | Pipeline walk | "录制 剪辑 播放", built up line by line. Smartphone VFR is the culprit; practical fix (Handbrake to constant frame rate) |
| 254-264 | **Fake ending** | "我们大家都能看音画同步的视频了 对吧 / 不对" |
| 264-400 | Last-mile cause plus the engineers' trick | Bluetooth codec plus buffer ~250 ms; "既然声音追不上画面 我们不如让画面来等声音 很天才"; then where the trick fails (calls, games, editing) |
| 455-480 | Pro tip | Sub-frame audio nudging; align on a sharp collision, not lips |
| 485-500 | Reflective close | "当音画完美同步的时候 它其实就是完全无感的…这背后其实是无数人努力的结果" |
| 506-512 | Sign-off | "点赞投币三连转发…那么我们下次再见" |

This maps one-to-one onto a time-to-first-token or decode-latency explainer: complaint, baseline, human threshold, pipeline, fake ending, trick, where the trick fails, reflection.

### 1.6 Narrator persona and voice
- First person plural "我们" (a company speaking), warm and slightly informal ("哥 求你了 给我个卫星吧", "然后他啵～"). Self-deprecating about money and status.
- Sponsor lines are ritualized ("于是我们就一拍即合", "我们和学而思学习机…一拍即合"). Endings move from wonder to meaning ("只有过程才是最重要的"), sometimes to a charity call (¥200k and ¥300k donations announced in the fan-running and AI videos).
- Rituals: "那么以上就是本期节目全部内容…点赞投币三连转发…那么我们下次再见". Description boilerplate: "如果你喜欢这期视频，请多多支持我们，并把视频分享给你的朋友们一起看看". Signature: "无限进步！".

### 1.7 Pacing and editing grammar
- The theory above ("讲八件事", every segment a standalone short) shows up as frequent chapter turns driven by questions: "那这时候你肯定要问…", "那这里就要说到…", "那既然…为什么…".
- Numbers always get converted ("30帧视频的一帧半", "相当于声音已经慢了五六帧").
- Stingers after the sign-off (satellite: "那唯一的问题是…").
- 4D Gaussian splatting of a rocket launch was published as an interactive web page (description of 我们拍到了，中国自己的可回收火箭。: "欢迎大家戳www.ysjf.com/4dgs，体验我们用4D高斯记录到的火箭发射瞬间"). This is a precedent for "the video is captured from a web page" and for linking the live page from the post.

### 1.8 Visual signatures
- **Gear as protagonist**: Phantom T1340, later T4040 (high speed); balloon at 40,000 m; satellite; rented satellites; 4D Gaussian splatting. "4K" appears in the tags of many uploads.
- **Covers** (12 inspected): Tim's face, often holding the product at the lens; 2-6 huge bold characters ("我们的卫星", "世界第1博主 工作室啥样?", "1200W Q&A"); yellow "?" stickers and a red arrow; "VS" pairings (刘谦, MrBeast). High production, saturated, glossy. The AI video cover shows half of a face dissolving into blue particles.

### 1.9 How a hard topic becomes accessible
Anchor in a daily annoyance, then a physical baseline everyone already knows, then a human perception threshold, then the machine pipeline. Every abstraction is paid for with a number in household units.

### 1.10 Recurring bits and catchphrases (verified)
- "无限进步" (signature)
- "一拍即合" (sponsor segue)
- "我们直接开始"
- "你会感兴趣的"
- "那么我们下次再见"
- 100 new iPhones given away with the iPhone 17 and iPhone 18 reviews (per their descriptions)
- "百万支票" series (*带着100万，我们揭开了赌场的秘密…*)
- "破产团建" N.0
- Follower-milestone Q&As

### 1.11 Criticisms and pitfalls
- **Platform conflict**: *清晰度不如4年前！视频变糊是你的错觉吗？* (2024-10-08) argued that platforms cut bitrate on popular videos. It was removed across platforms within a day (腾讯新闻, 经济观察网). Lesson: an explainer that accuses the distribution platform can vanish.
- **Context collapse**: the 1400万粉丝 Q&A (2025-11) contained about 50 s of Tim at a 相亲角 (a blind-date corner) posing modestly (primary-school education, father "delivery-related"). Clips spread as mockery and Tim answered with *关于影视飓风近期舆情*, arguing "切片抽象化" distorted it (腾讯新闻, 36氪). Lesson: any comic bit must survive being clipped alone.
- **Livestream incident** (2026-07, 100小时重返荒岛): a scuffle over a treasure chest, an employee's "暴揍老板" post, apologies and a rules reform (新浪).
- **Background**: recurring "富二代" framing (father is 圆通's president), e.g. 澎湃 2024.
- **Commercial density**: many episodes are built around a sponsor (徕芬, 学而思, OPPO, vivo…). This is accepted because of the "一拍即合" ritual and the fact that the sponsor gets tested.

---

## 2. 老师好我叫何同学 (何世杰)

### 2.1 Snapshot
- Born 1999. 北京邮电大学 / 伦敦玛丽女王 dual degree in telecom. Studio in 杭州 ("HTX Studio"). Bilibili 百大 2019-2021 and again 2025 (signature lists "2025百大UP主、2025年度最佳作品奖UP主、2020年度最佳作品奖UP主").
- Very low output by design: "四年里何同学只发布了43支视频…一期视频花费数月时间打磨" (CBNData). One water-ripple shot took "整整一个星期，更换了大、中、小三个鱼缸与一个儿童充气泳池".

### 2.2 Signature formats
1. **Phenomenon-experience tech essay** (2019-2021): 5G, folding phones, Mac Pro, AR glasses.
2. **"I built the thing" DIY** (2021-): AirDesk, a self-typing keyboard, a Chinese typewriter, an assembly line.
3. **Large controlled experiments**: 40 phones over 2 years on fast charging; 40 students for a week on phone use; 500 people on focus.
4. **Short sponsored DIY** (2024-2026, 3-5 min): the "为了X，我们做了这个..." formula. *为了不用倒垃圾，我们做了这个...* (5:14, 24.0M); *为了让大家多喝水，我做了这个…* (3:27, 16.3M).
5. **Studio-life competitions**: *不用电，你能把一张A4纸扔多远？*; *不用脚，你能把球踢多远？*

### 2.3 Representative videos and why they work

| Video (exact title) | Data | What made it work |
| --- | --- | --- |
| 【何同学】有多快？5G在日常使用中的真实体验 | 2019-06-06, 7:34, 33.9M | A personal puzzle ("4G已经够快了，5G到底有什么用呢？"), then a quest with comic coincidences (the 5G launch event falls on his midterm exam day; "很巧…更巧…最巧的事情来了"), then an anti-climax (only 4G speeds), then a payoff shown visually ("一首10兆的歌，进度条只有全空和全满两种状态"). The twist is a search for "4G有什么用" limited to 2012-2013, and the thesis is "我现在最大的期望，就是当我5年后再打开这个视频，会发现速度其实是5G最无聊的应用" (ASR). Picked up by 人民日报 and other state media; about +1M followers in 3 days (界面). |
| 【何同学】我做了苹果放弃的产品... | 2021-10-17, 7:48, 26.2M | A grievance with a launch-event memory ("还得回到四年前的苹果秋季发布会") and a waiting gag ("等啊等，等啊等，等啊等，等到第4个明年"). The naive solution comes with a cost number (632 coils). v1 "工作得很完美，除了有三个非常严重的问题". Reveal, a fake feature, then "对不起各位，刚才都是我编的". An open loop pays off ("视频的结尾，你会知道这些点有什么用"), plus a naming gag: "AirPower Pro Max Ultra Plus Lift" (ASR). |
| 【何同学】我们做了一台中文打字机... | 2023-03-26, 9:30, 17.1M | A/B contrast cold open ("这是一台英文打字机，小巧简洁…而这是一台中文打字机，庞大复杂") and escalation ("它不是能打2480个字，不是能打2万4800字，它能打整整9万个字"). Tragic twist: "总共只生产出了一台，而这唯一一台被当成垃圾扔掉了". Comic deflation: "研究了三个月后，我们放弃了". The mechanism is explained on a working model they built (6×6×8×29 = 8352 type slots; about 70 × 1300 ≈ 91,000 combinations). Callback to the previous video's self-typing keyboard. Human close quoting 林语堂's daughter (manual subtitles). |
| 【何同学】快充伤电池？40部手机两年实验，告诉你最佳充电方式 | 2022-10-27, 9:27, 15.4M | Folk belief, then the question list, then "今天，就让我们用实验来告诉你". The protocol is declared up front with control groups, **and what each outcome would mean is stated before the data** ("如果…那么就说明快充更伤电池"). Independence disclaimer: "没有和任何品牌做过任何沟通…不会受到任何神秘力量的影响". Results with decimals, an admission that the first two runs failed, a liberating conclusion ("最好的充电方式就是你想怎么充就怎么充…不要为了减少电池损耗而带来精神上的损耗"), and a personal memory (ASR). |
| 【何同学】我拍了一张600万人的合影... | 2020-08-02, 10:33, 17.4M | Price-number cold open ("120毫米微距镜头售价4.5万元…中画幅相机售价38万元…4亿像素"), an absurd goal, fast anti-climaxes ("经过了非常复杂的计算后，我惊喜地发现，这绝对不可能"; a 2,400 m² wall "约等于6个篮球场"), and a family cameo (mom refuses the living-room wall) (ASR). |
| 【何同学】为了找到流量密码，我们做了个假B站... | 2023-05-16, 13:17, 10.5M | He built a fake B站 mini-program (鸽哩鸽哩) to A/B-test covers and titles with 100+ testers. Reported findings: simpler covers and titles get higher click rates; cover text helps only if it adds to the title; faces on covers help only established creators; over-the-top titles hurt clicks; familiar or trending keywords act as 流量锚点 (Sohu and 飞瓜 summaries; not checked against the video). |

### 2.4 Hook patterns
- **A/B contrast pair** (typewriter).
- **Price and spec numbers on a hero object** (600万).
- **A single striking statistic** ("8小时4分钟", from 5,289 survey replies; *这视频能让你戒手机*, ASR).
- **A folk belief to test** (fast charging).
- **A personal confusion question** (5G).
- **Time-anchored backstory** ("过去的两个月里，我做了一张桌子。要明白这个桌子有什么用，还得回到四年前…").
- **The title spoken as the first line** (A4: "不用电 你能把一张A4纸扔多远").

### 2.5 Script structure
Personal stake → the conventional approach and its cost → a cleverer idea → v1 fails in a funny way → v2 → the reveal, shot like a product launch → anticipated viewer question → the real answer → a human or emotional coda → ritual CTA. The experiments add a declared protocol and a control, predictions stated before results, and an admitted failure.

### 2.6 Narrator persona and voice
- A gentle, slightly shy student, humble-bragging through self-deprecation ("不是通信专业的朋友可能听不懂我在说什么，其实我也听不懂", from someone who studied telecom).
- Calm delivery at a medium pace.
- Signature rituals (verified in 5 transcripts):
  - Video opener: "OK各位" (also used before the sign-off)
  - CTA: "求赞 求收藏 求硬币 求转发 / 最重要的是点个大大的关注 / 各位的支持就是我们做视频的最大动力"
  - Sign-off: "OK各位，我们下期再见"
  - Every title prefixed with "【何同学】"
  - Titles trail off with "..." or "…"

### 2.7 Pacing and editing grammar (frames of the typewriter cold open)
- Dark, warm "museum" set; the hero object centered on a wooden table; slow push-ins.
- Top-down shots of hands; macro close-ups of mechanisms; side-by-side split of the two machines.
- Animated counters ("26↑", "1").
- Archival black-and-white photo shown as a framed print.
- Centered title card in clean type ("明快打字机").
- Subtitles are small, thin and white at the bottom. They never compete with the image.
- Credits list 3D animation (joyteeth), flip-book animation, sound design and pixel art: a small specialist crew behind the "one student" image.

### 2.8 Visual signature: "product-launch smoothness" and physical props
- Apple-keynote language: hero object, black or warm background, typographic product names. The AirDesk cover is just "AirDesk" in thin sans. The 5G cover is just the phone status bar "16:50 5G" (covers inspected).
- Props are real builds: a desk-sized tracking charger, an electromagnetic self-typing keyboard, a three-level drum typewriter, a wall of 6M printed usernames, 40 phones on rigs with time-lapse plants as a "proof of 100 days" joke ("虽然我们植物种的非常失败，但是实验还是很成功的", ASR).
- Covers almost never carry a sentence. Usually it is an object plus his gesture, sometimes one product word.

### 2.9 Honesty pattern (worth copying)
Descriptions disclose manipulations:
- "视频中51秒处焊接键盘镜头为摆拍" (keyboard)
- "为了配合旁白，视频中电机的速度有在后期加速和减速" (AirDesk)
- "本视频中出现的烧坏的手机屏幕为后期处理" (3D-printer video)
- "林语堂的原话其实是…我们出于气氛的原因把后半句省略了" (typewriter)
- "本视频中的数据只能说明参加测试的手机在500次循环的时候，快充并不影响电池寿命，并不能说明广义上的'快充'不影响电池寿命" (fast charging)

### 2.10 Criticisms and pitfalls
- **Attribution**: *我用36万行备忘录做了个动画…* (2024-11) said "我们专门写了一个软件". The software was a modified MIT-licensed GitHub project (ASCII-generator, by vietnh1009) used without credit. He admitted it, apologized, and promised a review group (澎湃, OSCHINA, 网易).
- **"形式大于内容" / "为做而做"**: DIY builds called impractical. "我做了苹果放弃的产品" was criticized for overstating his technical ability, and he is compared unfavorably with 稚晖君 (depth) and 手工耿 (fun) (腾讯新闻 2022). Accusations of staged shots and code that "根本无法运行".
- **Cadence**: near-annual uploads ("年更"; 10 videos in 2022-2023 combined).
- **Persona drift**: the 2025-04 post about refusing to give ride-hailing drivers good ratings read as elitist ("#何同学被评傲慢而不自知#"). He later apologized (维基百科, 腾讯新闻).

---

## 3. 毕导THU (毕啸天)

### 3.1 Snapshot
- 清华 chemical-engineering PhD, graduated in 2023 after 13 years at 清华 (*【毕导】13年过去了，我终于毕业啦！*, 2023-10-28). Started with WeChat long-reads (2016-). His first hit essay was about heating season; *微信红包先抢和后抢差距居然这么大！* went viral (澎湃, 蓝鲸).
- Two Bilibili accounts:
  - 毕导: 7-15 min flagship pieces. A 2023 framing study found 60.3% of videos run 7-10 min, 88.9% are explanation-style, 23.8% of titles are questions, 61.9% use charts or simulated scenarios, and 38.1% stage sketches (科普中国 / 科普创作评论).
  - 毕的二阶导: 1.5-4 min shorts.
- YouTube channel *毕导THU* posts vertical shorts (240×426 downloads) plus full episodes with heavy hashtags.
- His own statements:
  - Method: "清华精神就是把一个复杂的问题，转化为若干个我们已经会解决的简单问题" (澎湃).
  - "创作一定是大纲先行，结构充分清晰之后再去填内容" (蓝鲸).
  - Every piece must be at least one of "有趣、有用、有意义".
  - Knowledge transfer: "用一套语言体系去表达另一套知识体系。比如我们的方法论就是用做科研的心态去写推送" (蓝鲸).
  - On short video: "7、8月份做了两个月之后，抖音粉丝成功掉了3000…外行永远无法领导内行。我当时就是那个外行" (新榜 via 腾讯新闻).

### 3.2 Signature formats
1. **Absurd everyday question, analyzed seriously** (2019-2021 "SNP / 厕所大一统理论" era): *难言之隐！上厕所时如何科学压住水花…* (5.8M); *女生勿进！男生尿尿时如何防止液体溅到脚上？* (4.4M); *薯片掉地上到底能不能吃了？这次我打脸我自己！* (4.9M).
2. **Counterintuitive phenomenon with a physical experiment** (2024-): blueberries, acid, refraction, candle and sound, chili and surface tension.
3. **Big-idea math and philosophy**: infinity and supertasks, Gödel (34 min, 10.7M), the inspection paradox, logarithmic perception.
4. **Debunking textbooks and internet arguments**: *在这个简单的问题上，你学的教材可能一直是错的* (12.1M); *地球是平的？不要随便跟网友辩论……* (12.9M); *好笑吗，我只看到了一名绝望的机长* (plane-on-a-treadmill, 4.75M).
5. **Short-form (毕的二阶导)**: one phenomenon in 2-4 min.

### 3.3 Representative videos and why they work

| Video (exact title) | Data | What made it work |
| --- | --- | --- |
| 【毕导】这是什么妖术？酒在坛子里是绿色，舀出来瞬间变红！ | 2026-05-29, 12:40, 21.7M (his most-played) | Starts from a viral "suspicious" sales clip ("一个诡异的卖酒视频，让我差点走上犯罪的道路"). One visual paradox solved with optics (二色性). |
| 【毕导】打个赌，你说不出第二种蓝色的水果！为什么蓝莓是蓝色的？ | 2024-06-07, 10:41, 19.0M | A bet-hook title the viewer can test in their head instantly; the cover shows an SEM image labeled "放大20000倍". Followed by a public correction, *毕导千万播放的蓝莓视频，竟然讲错了？？* (YouTube upload 2024-06-24). |
| 【毕导】看了这个视频，你会释怀你倒霉的一生 | 2024-08-02, 9:55, 8.1M | Personal grievance ("为什么我等的那班公交车就总是不来？"), then the wrong explanation (survivorship bias) with a roast ("你肯定是那种股票亏了就在群里喊别人发红包…"), then a toy model with personified buses, then a computed number (6分15秒 vs 5分钟), then **a simulation as the experiment** ("用Python开了10万辆公交车"). A second instance follows (the friendship paradox on a Tang-poet social graph: 李白 8 friends), a doggerel poem gag and escalating twist jokes ("你的敌人也拥有比你更多的敌人…你的前任也拥有比你更多的前任。这么一想，还是别想"). Then the unifying concept (检查悖论), a rhythmic "为什么呀？因为…" list, **a meta-joke applying the paradox to his own comment section**, the moral "你看到什么，取决于你在看哪", and a closing skit (ASR). |
| 让100万网友吵架的问题，你能答对吗？ (毕的二阶导) | 2026-01-09, 3:09, 5.3M | Poll in the first 5 s ("观众朋友们，在弹幕上做出你的选择，我们直接试一下子"). The race between two takeout boxes gets sports commentary ("小蓝的起步很完美啊…小黄反杀了"), a "●REPLAY" broadcast graphic, a Tom and Jerry insert for the eating analogy, then 托里拆利 v=√(2gh) with "稍加计算易得". The elegant extra: the overtaking point is always at the same height ("13.4%"). Mock moral at the end (ASR plus frames). |
| 大海为什么是蓝色的？两个诺奖得主吵起来了…… (毕的二阶导) | 2026-06-10, 3:20, 11.9M | The conflict is in the title, and two Nobel laureates provide the authority. Most-played short. |
| 【毕导】这个视频里说的都是真的，但你却永远无法证明 | 2023-08-31, 34:04, 10.7M | Gödel's incompleteness for a mass audience at 34 minutes. Hard topics can work when the self-reference is treated as the joke. The description asks finishers to comment "sub(n,n,17)". |

### 3.4 Hook patterns, first 3-15 s (ASR unless noted)
- **Bet / 99%**: "这道题你初中肯定做过，但我打赌99%的人都被错误答案误导了" (water jets). Title formulas "打个赌，你…" and "99%的人都…".
- **Poll**: "在弹幕上做出你的选择" or "同意请在弹幕上扣1，不同意请扣2" (treadmill plane).
- **Cold-open skit**: an airline captain announcing a take-off from a treadmill; a viewer-mail skit ("@毕导，这是为什么？" / "你能不能，先艾特上来再问").
- **Sensory cold open**: chair screech plus "为什么拖桌子椅子的时候经常会发出这种尖锐…的音调呢？…光看这个画面都肯定有人起鸡皮疙瘩".
- **Callback to his own hit**: "前段时间我发了这全网几千万播放的视频…结果发现一个怪事…这朵乌云始终悬在心里".
- **Personal grievance**: "我经常疑惑，为什么我等的那班公交车就总是不来？".

### 3.5 Script structure (the 毕导 loop)
1. Phenomenon or question.
2. The popular intuition, argued *well* by him (he plays the wrong side convincingly).
3. Poll.
4. "这个说法是错的".
5. Experiment with "家中常备的X", or a simulation.
6. "结果非常amazing啊".
7. Formula with "稍加计算易得".
8. An *extra* elegant fact (13.4%; the jet distance equals the water height).
9. Generalization to everyday cases.
10. Mock life lesson ("这个故事也告诉我们一个人生的道理…" / "人生又何尝不是如此").
11. Absurd tag or skit.

### 3.6 Persona and voice
A deadpan "serious scientist on unserious questions". 澎湃 reports his self-description as "一本正经、胡说八道" (as reported, not seen in a primary source). He plays a confident but slightly unlucky everyman, roasts himself and the viewer, and uses mock-academic register ("SNP理论的重大突破！", "肛体力学"). Lines are fast and punchy, with deliberate pauses before the reveal.

### 3.7 Recurring bits and catchphrases (verified in transcripts, tags, frames)
- **"小学二年级"**: appears in tags of almost every video, and spoken ("服从我们小学二年级学过的指数分布"). Hard math is ironically called second-grade material; he even predicts the comments will say "这不是小学二年级学过的吗？".
- **"非常amazing啊"**: spoken in 4 of the transcripts. A red neon "Amazing" sign sits behind him in the studio.
- **"家中常备的X"**: 高速相机, 传送带, 飞机, 弹簧测力计.
- **"稍加计算易得"**: said right after a heavy formula.
- **"这个故事也告诉我们一个人生的道理" / "人生又何尝不是如此"**.
- **Other bits**: "老演员" (recurring props), "DLC" (sequels; also on a cover), "万物研究所" (B站 science program tag), "SNP大一统理论".

### 3.8 Visual signatures (frames inspected)
- **Vertical shorts**:
  - Cover frame: a huge boxed keyword headline plus a "???" cutout of him.
  - Problems drawn as textbook-style illustration cards.
  - He appears as a chroma-keyed **picture-in-picture cutout** reacting in a corner.
  - Bold white subtitles with colored outline or keyword highlighting, placed center-low.
  - Real household props (takeout boxes, a paper plate, red and blue paper halves cut and re-joined).
  - Clean 3D on a dark grid floor (cone section); formula cards with a yellow handwritten-style title; h-t plot.
  - Screenshots of real viewer comments as the source of the wrong intuition; a phone stopwatch inside the shot.
  - Meme clips (Tom and Jerry, credited on screen); a glitch-TV meme transition; a street skit as the ending.
- **Long form (2025-)**: he speaks from a studio with the "Amazing" neon and a "毕导" wooden sign. B-roll sits in a HUD-style frame with him as a lower-left cutout. **Bilingual Chinese + English subtitles.**
- **Covers** (12 inspected):
  - 3D-extruded 3-6 character headline, often "诡异的X" (诡异的蓝莓 / 无穷 / 披萨, 数学的诡异漏洞).
  - **a small English line underneath** ("Weird Blue in Blueberry", "The Weird Infinity", "The World is Logarithmic", "The Deception of Light").
  - His exaggerated face, one striking object or micrograph, arrows, "?" stickers, a small yellow tag ("瞬间变色?", "有多恐怖!?").
  - Cover text is a short noun phrase; the long sentence lives in the title.
- Earlier "slide-style" (PPT-like) visuals of 2019-2020 were not inspected: **(unverified)**.

### 3.9 How hard topics become accessible
Start from a body-level or household experience (bus waits, sticky chairs, toilets, pizza). Personify the toy model (守时侠 / 随机侠 drivers). Run the experiment cheaply on camera, or simulate it ("用Python开了10万辆公交车"). Show the formula briefly as a joke, not as homework. Pay off with *one more* surprising fact the viewer did not ask for.

### 3.10 Criticisms and pitfalls
- **Accuracy and self-corrections**: the 薯片 "相切可吃理论" was reversed by himself ("这次我打脸我自己！净tm扯淡！"). The blueberry explanation was corrected in a follow-up. Also *【毕导】被网友打脸了！居然真能这样？！*. He turns errors into content, which builds trust.
- **"哗众取宠" / clickbait and toilet humor**, plus criticism from academics that a 清华 PhD should do research instead (蓝鲸, CSDN repost).
- **Heavy sponsor integration**: 追觅, 极米, 蔚来, 华为 appear in tags and descriptions.
- **Douyin attempt**: the 2-month experiment lost about 3,000 followers by his own account (新榜).
- **Fatigue**: long gaps during the PhD ("最近这两年半经常被大家催更").

---

## 4. Cross-creator synthesis: the shared DNA

| Dimension | Tim | 何同学 | 毕导 | Shared rule |
| --- | --- | --- | --- | --- |
| First 3 s | Spectacle plus number | Object plus number, or A/B pair | Bet or poll or skit | **Show the thing and state a checkable claim before any context** |
| Proof | Gear and access | Builds and controlled experiments | Cheap experiment or simulation | **Something real happens on screen** |
| Numbers | Converted to frames and meters | Prices, decimals, counts | One elegant constant (13.4%) | **Every number gets a human unit** |
| Turn | "对吧？不对" | "除了有三个非常严重的问题" | "这个说法是错的" | **A fake resolution before the real one** |
| Humor | Light, self-deprecating, stinger | Anti-climax, fake answer and retraction | Deadpan, personification, meta-joke | **Comedy lives in structure, not inserts** |
| Ending | Meaning or dream | Human coda | Mock moral or skit | **End on a sentence worth quoting** |
| Honesty | Shows a defect it found in its own footage | Discloses staging | Public corrections | **Trust is the product** |

---

## 5. Rules for a 60-150 s vertical LLM-systems explainer (code-rendered + voice-over)

### 5.1 Hook formulas (first 0-3 s carry the claim; 3-15 s carry the stakes)
Each formula comes with a 中文 line (Douyin) and an English line (X). Every number has to be measured or sourced before it appears on screen.

1. **The number paradox (Tim / 何同学)**. "这块GPU显存满了，其中一半是空的。" / "This GPU is full. Half of it is empty."
2. **The bet (毕导)**. "打个赌：一个小模型能让大模型变快，而且一个字都不改。" / "Bet you think a small model can't speed up a big one without changing a single word."
3. **The A/B pair (何同学)**. Split screen: "左边每次只出一个字，右边一次猜五个。最后两边输出一模一样。" / "Left: one token at a time. Right: guesses five at once. Same output."
4. **Shared annoyance, then validation (Tim)**. "你一定见过：AI 回答时，第一个字总要卡一下。不是你的错觉。" / "Ever notice the first word always takes the longest? You're not imagining it."
5. **Poll (毕导, adapted for X)**. "A 还是 B？先在评论区站队。" / "A or B? Reply before you watch." Run a real X poll in the post text if the format allows.
6. **Absurd scale (Tim)**. "训练一个70B模型要约1TB显存，一张H100只有80GB。" (L06 worksheet) / "Training a 70B model needs ~1 TB of memory. One H100 has 80 GB."
7. **Textbook-is-wrong (毕导)**. "几乎所有科普都把 MoE 画成'专家会诊'。我们看了真正的路由，没那么简单。" Use only if our own data supports it; **(to be measured)**.
8. **Callback to our own work (毕导 / 何同学)**. "我们组的 ISCA 2026 论文，就是从这一帧开始的。" Only with Prof. Ding's sign-off.

Hook rules:
- The first frame is a composed cover (毕导's vertical shorts open on one) with ≤ 8 Chinese characters or ≤ 5 English words.
- The first spoken line is ≤ 2.5 s.
- No logo sting, no "hi I'm…", no channel intro before the claim.

### 5.2 Structure templates (seconds for a 90-s cut; scale ±50%)

**T1 "Wrong intuition" (毕导 loop). Default for 主线**
| t | Beat |
| --- | --- |
| 0-3 | Claim or bet on a composed cover frame |
| 3-12 | Setup with one concrete scene (one request, one GPU) |
| 12-25 | The popular intuition, argued fairly and convincingly, ideally quoting a real comment or misconception |
| 25-28 | Poll / "我们直接试一下" |
| 28-55 | The experiment: real measurement or a real simulation rendered as a race, with a timer |
| 55-70 | Reveal plus the mechanism in one picture; at most one formula, "稍加计算" style |
| 70-82 | The extra elegant fact nobody asked for |
| 82-90 | Callback or mock-moral line, then a tag |

**T2 "Pipeline latency" (Tim 音画不同步). For serving and latency topics**
Complaint → "not your imagination" → physical baseline → human threshold in ms → walk the pipeline (tokenize → prefill → decode → stream), building it up line by line → "对吧？不对" → the engineers' trick → where the trick breaks → a one-line reflection.

**T3 "Contrast, escalation, mechanism" (何同学 typewriter). For a history-plus-mechanism topic**
A/B cold open → escalating number reveal ("不是…不是…而是…") → mini tragedy or twist → mechanism shown on a working model (our live web scene) → modern connection → quote or human coda.

**T4 "Pre-registered experiment" (何同学 快充). For myth-busting with our own measurements**
Folk belief → protocol on screen (groups, control) → "如果结果是X，说明Y" said before the data → results with decimals → limits of the claim (copy his description caveat) → practical takeaway.

**T5 "Quest with failures" (何同学 AirDesk / 5G). Mainly for 支线 vlogs** (Zhen Ji jungling, scooter, $5/24 h San Diego)
Personal stake → naive plan plus cost → v1 fails funny ("工作得很完美，除了…") → v2 → payoff → anticipated question with a fake answer and retraction → human coda.

### 5.3 Visual rules for the code-rendered vertical format
1. **One idea per shot.**
   - One protagonist object per frame: a memory bar, a token queue, a GPU tile.
   - 何同学's frames work because a single object sits in a dark, warm set.
   - In three.js, use PBR materials with real scanned or photographed textures and a real HDRI. That matches the house rule of preferring real assets.
2. **Data must be real and visibly real.**
   - Drive animations from logged measurements: a vLLM trace, `nvidia-smi` memory, acceptance logs. Show a tiny monospace "source" tag (GPU model, date, script).
   - This is our equivalent of 毕导's on-camera experiment and 何同学's 40 phones.
3. **Races, not diagrams.**
   - When comparing two methods, run them side by side with a shared clock.
   - Optionally add sports-broadcast grammar ("REPLAY", lap times) and deadpan commentary, as 毕导 does for takeout boxes.
4. **Numbers as counters.** Animate numbers (何同学's "26↑", "1") and always pair them with a human unit ("= 1.5 frames", "= one page of a novel").
5. **Layout for 9:16.**
   - The main visual sits in the central band.
   - Subtitles go center-low in bold with keyword highlighting (毕导's shorts). Keep clear of the platform UI at the right edge and bottom, a general Douyin/X practice: **(verify against current app UI)**.
   - Captions are burned in on both cuts because feeds autoplay muted, a general platform behavior: **(verify)**.
6. **Presenter cutout.** If a human appears (Prof. Ding or a student), use 毕导's picture-in-picture cutout reacting in a corner rather than a talking head that pushes out the visual. If nobody appears, give the narrator a recurring visual avatar: a painted sprite generated with Codex on green and keyed, never drawn with code primitives (house rule).
7. **Cover frame is its own composition** (both cuts).
   - 3-6 Chinese characters ("显存在占座") plus a small English line, following 毕导's covers, which carry an English subtitle line.
   - 何同学-style minimal covers (object only) work once the account is known. His own fake-B站 test reportedly found simpler covers click better and faces help only established creators.
8. **No meme clips from copyrighted media** (Tom and Jerry and the like). Recreate the comic beat with our own painted sprites or the lab's anime-film assets.
9. **Real-world inserts are allowed and encouraged.** 2-3 s iPhone shots of real lab hardware (a GPU server, a rack, cables) between code-rendered scenes play the role of Tim's gear shots.

### 5.4 Narration rules
1. **Voice**:
   - Use "我们 / we" (Tim's company voice) and keep the lab as the protagonist.
   - Second person for the viewer's experience ("你一定见过…").
   - Deadpan, no hype adjectives. Let numbers and visuals carry the excitement.
2. **Density**: about 3.5-4.5 Chinese characters/s, and 2.3-2.8 English words/s **(a general benchmark, unverified for these creators)**. 90 s ≈ 330-400 字 or 210-250 English words. Write the English script natively; don't translate the Chinese line by line. Puns get replaced, not translated.
3. **Questions as joints**: use "那这时候你肯定要问…" / "So why not just…?" as chapter turns (Tim), every 15-25 s.
4. **One fake resolution per video** ("对吧？不对。" / "Done, right? Not quite.").
5. **One honest limit per video**, said aloud or put in the post text: what the measurement does *not* show (何同学's fast-charging caveat).
6. **Endings**: a quotable line plus a callback to the hook. No "like and subscribe" ritual in the English cut. On Douyin, add a short native CTA if desired.
7. **A running gag of our own**, not a borrowed one. Candidates: "家里常备的H100" is too close to 毕导's "家中常备". Better: "这一步，Yufei 老师上课讲过" as a recurring teaser for the full lecture, or a recurring GPU sprite that sighs. **Never reuse "非常amazing", "小学二年级", "OK各位", "一拍即合"**; they are identity marks of other creators.

### 5.5 Comedy devices (observed in these three, ready to use)
- **Anti-climax after effort**: "我们花了三个月优化这个 kernel……然后发现瓶颈根本不在这。"
- **Fake answer and retraction**: "MoE 就是每个问题找最懂的专家——对不起，刚才是我编的。"
- **Rule-of-three escalation**: "很巧…更巧…最巧" (5G).
- **Personification and sports commentary**: draft model vs target model as relay runners; tokens as passengers.
- **Meta-joke**: apply the concept to the video itself, e.g. "这条视频也是边生成边播放的", or quantize the narrator's own voice to 4 bits for one line.
- **Mock moral**: "人生也是如此：先占的座，未必有人坐。"
- **Stinger after the end card** (Tim).

(喜人奇妙夜 / 脱口秀大会-specific devices were not researched for this report.)

### 5.6 "Do this" examples for our topics
All facts below come from the CSE 291 decks in the scratchpad. Anything marked **(to be measured)** must come from our own runs before release.

**A. KV cache waste / PagedAttention (L13). Template T1, about 90 s**
- Title CN: 《你的显存，一半在给空气占座》. EN: "Half your GPU memory is saving seats for nobody."
- 0-3 s: a GPU memory bar 100% red ("FULL"). The VO says the 中文/English formula #1 line.
- 3-25 s: one request reserves max-length slots ("座位") for tokens that don't exist yet. Three wastes appear one at a time: reservation waste, internal fragmentation, external fragmentation. The labels follow L13 slides 20-21. Campus 占座 metaphor (books on library seats); in English, "backpack on a seat".
- 25-28 s: poll: "加显存 vs 换个分配方式?"
- 28-55 s: race between contiguous allocation and paged blocks on the same request stream. Concurrent requests served is the score **(to be measured on lab GPU)**.
- 55-70 s: reveal the paper's motivating number, ">50% of allocated KV cache memory wasted" (L13, citing Kwon et al., SOSP'23). Mechanism: OS-style pages allocated on demand.
- 70-82 s: extra fact: pages also let requests *share* a prefix (prefix caching, radix tree; L13).
- 82-90 s: callback: "座位按需发，不用提前占。" Tag: the GPU sprite finally sits down.

**B. Speculative decoding (L08). Templates T3 and T1, about 100 s**
- Hook: A/B split, plain decoding vs speculative decoding, **same final text**, two clocks.
- Wrong intuition: "a smaller model helping must lower quality."
- Mechanism: the draft proposes, the target verifies all drafts in one pass and accepts the longest correct prefix. On rejection the target's own token is sampled, so the output distribution matches the target (L08: accept probability, then "If draft token is rejected, sample from target model"). Lab-insider comedy (needs Prof. Ding's OK): the student drafts five sentences, the professor checks them in one read, keeps the first three, rewrites the fourth.
- Escalation (何同学 "不是…而是…"): one guess, then a guess *tree* (SpecInfer: LLaMA-7B target + LLaMA-68M draft), then self-drafting heads (Medusa). All from L08.
- Experiment: acceptance rate and speedup on a real prompt set **(to be measured)**.
- Extra elegant fact (L08, citing DeepMind's speculative sampling paper): acceptance depends on the task. HumanEval code has "predictable sub-sequences (e.g., for i in range(len(arr)))" while XSum summaries have "high semantic complexity". Speculation helps code more than prose. Show the two races side by side with measured numbers **(to be measured)**.
- Honest limit: speedup depends on the acceptance rate. L08 notes the overhead "verify 64 tokens vs. one".

**C. Quantization (L12). Template T1, about 80 s**
- Hook: "我们把模型里每个数砍掉了75%的比特。" (FP16 → INT4 = 16 → 4 bits). EN: "We cut 75% of the bits from every weight." Follow with the measured quality result **(to be measured)**.
- Toy model on screen: a number line with 16 INT4 levels mapping the L12 example values 0, 0.8, 1.2, 2.5.
- Wrong intuition: "just round each number". Then the outlier problem: one outlier stretches the scale and everything small collapses to zero. The 毕导-style analogy: compress a class's scores into A-F when one student scored 1000, and everyone else fails.
- Fixes in one picture each: per-group scales; GPTQ's error compensation (W4A16; L12); AWQ protecting salient channels (L12).
- Extra fact: why INT4 weights still compute in FP16 (dequantization overhead, L12 slide on int4 → FP16 format mismatch).

**D. Mixture of Experts (L14), with a payoff from the lab's own work. Template T3, about 110 s**
- Hook: a scale contrast from the L14 table. "Mixtral 8x7B: 45B参数，每个词只用13B." Then escalate: "DeepSeek-V3: 671B，256个专家，每个词只叫8个." Check the activated count: the L14 table says 36B, while DeepSeek's own report says 37B activated. Resolve before release.
- Wrong intuition: experts as a hospital of specialists, every token sees the right doctor.
- Reality (L14):
  - Routing is learned top-K.
  - Without balancing, "a few experts are always chosen" and "most experts are never trained".
  - Fix: load-balance loss, or DeepSeek-V3's auxiliary-loss-free balancing.
  - Comedy: one doctor with a queue around the block while the others play cards.
- Systems turn: expert parallelism ("a special TP, without All Reduce", L14). Tokens must travel to their experts' GPUs; traffic jams.
- Payoff: the lab's ISCA 2026 Best Paper story, as already described in `social/x/versions/VERSIONS.md` v2 (tokens jammed on die-to-die links, a detective finds the pattern, hot experts relocate, 6.6×). Re-check every number with the authors.

**E. Data / tensor / pipeline parallelism (L05-L07). Template T2 or T1, about 120 s; or a 3-part series**
- Hook from the L06 worksheet: training a 70B model needs ≈1,043 GB. An H100 has 80 GB. Split 16 ways:
  - ZeRO-1: 309.7 GB per GPU
  - ZeRO-2: 187.7 GB
  - ZeRO-3/FSDP: 65.7 GB, which finally fits. The counters animate down from 1,043.
  - The worksheet mixes 130.4 and 134.4 for the weight term; re-derive before using.
- Moving-house metaphor:
  - DP: every crew carries a full copy of the furniture.
  - TP: one sofa is sawn into pieces and carried together, with constant shouting (all-reduce).
  - PP: an assembly line.
- Pipeline bubble as "官方摸鱼时间" (EN: "paid to wait"): a Gantt chart animates GPipe and then 1F1B.
  - The slide formula is bubble ratio = (N−1)/M, so idle share = (N−1)/(N−1+M).
  - Raising the micro-batch count M shrinks the idle time.
  - Show it live as M goes 1 → 4 → 16.
- Ending: "四个 GPU 一起搬家，最难的不是搬，是等。" EN: "The hard part of moving with four friends isn't carrying. It's waiting."

### 5.7 Release checklist (score each cut 0-2 per line; ship at ≥ 14/18)
1. The first frame works as a cover, and the claim lands in ≤ 3 s.
2. A real artifact (measurement, trace, hardware shot) appears in the first 30 s.
3. A wrong intuition is stated fairly.
4. An experiment or race runs on screen, with a clock.
5. Every number has a human unit and a source tag.
6. Exactly one formula at most, and it is optional to understanding.
7. One structural joke (anti-climax, fake answer, meta) survives being clipped alone.
8. One honest limit is stated.
9. The last line is quotable and calls back the hook. English and Chinese cuts are each written natively.

---

## 6. What does NOT transfer

**From Tim / 影视飓风**
- Budget spectacle (satellites, Phantom cameras, 100-iPhone giveaways, travel, celebrity guests). Our "spectacle" has to be visual clarity plus real data, not money.
- 15-30 min chaptered long-form, and the founder-celebrity persona. A professor's lab shouldn't build a personality cult around one face.
- Team stunts and livestream chaos (the 2026 island scuffle). Q&A stunts that can be clipped against us (相亲角).
- Platform-accusation topics (清晰度 takedown) if we want reliable distribution.
- 16:9 cinematography, and sponsor-driven topics ("一拍即合"). An academic account should avoid sponsor framing entirely, or disclose it plainly.

**From 何同学**
- Months-long physical builds per episode. At most an occasional tentpole, and code-rendered builds take their place.
- Personal-life material (dorm, mom, nostalgia essays), unless a student volunteers it for 支线.
- His keynote aesthetic can be *imitated* in three.js lighting, but without real objects it can feel hollow. Pair it with iPhone inserts of real hardware.
- "为了X，我们做了这个..." ad-product DIY.
- Overclaiming titles ("我做了苹果放弃的产品" drew backlash). Uncredited code: our scenes must credit open-source libraries and papers on screen or in the post.

**From 毕导**
- Toilet and body humor (SNP 大一统理论). It works for a Bilibili persona, not for a lab under a professor's name, and it reads worse in English on X.
- Licensed meme clips and B站 danmaku culture ("弹幕扣1", "三连", "小学二年级" irony). On X, use the post's poll or "reply A/B". On Douyin, a comment prompt.
- On-camera household experiments as the core proof. A code render alone looks like an animation unless the numbers are visibly real, so lean on measured traces.
- The cheap-prop deadpan ("家中常备的高速相机") depends on a recognizable presenter. Without one, transfer the *attitude*, not the line.
- His catchphrases themselves: copying "非常amazing" would read as imitation.

**General to a lab account and a code-rendered format**
- No fabricated experiments and no undisclosed staging. A professor's credibility is the asset; copy 何同学's disclosure notes and 毕导's public corrections.
- Humor must not mock real students, reviewers, other labs or companies by name.
- Video length: all three made their names on 7-15 min Bilibili videos. Only 毕的二阶导 and 何同学's 3-5 min pieces are evidence for our 60-150 s format. 毕导's own Douyin experiment lost followers, so treat each platform cut as native work, not a trim.

---

## 7. Sources

Primary data (pulled 2026-10-04):
- Bilibili search API: video search ordered by plays for 毕导, 影视飓风, 何同学, 毕的二阶导; user search for account data; cover images from the API `pic` field.
- YouTube official uploads with manual subtitles, Mediastorm影视飓风:
  - iIAYPtNThlo (satellite)
  - jkxa7haTPPs (440k fps)
  - rCz2Rq_Lwvw (lip-sync)
  - PAZLLswtqxU (discs)
  - g_cU-DrUPGI (MrBeast)
  - euvZ8Z_5zK0 (AI)
  - lE2SyQnJyrc (山海经)
  - 5uYJx1akwgo (fan running)
  - 150PSOWCPkg (iPhone 18)
- YouTube official uploads with manual subtitles, 何同学: yNoWMaOyWHY (typewriter), Xyi1qmpFUd0 (A4).
- Whisper transcripts (ASR), 何同学: pz4UCrtbb4c (5G, re-upload), txfIzLpR9Uc (fast charging), -Xo7dZlJQ2w (AirDesk), IlDxH-Jtqnw (600万), mCEjEkgU1AA (戒手机).
- Whisper transcripts (ASR), 毕导: tJ7qzfOw9Kk (公交车悖论), uchdbqFDYec, 41WTSPS5bew, vwyU2jrc3W4, 2VsGv2TMKww, 54GNsaSYops, b0kRrTx_H4Q, OgCoi21G1DY.
- Local working files (scratchpad): `tr/`, `frames/`, `covers/`, `research/bi_*.json`.

Press and secondary:
- 影视飓风 (维基百科): https://zh.wikipedia.org/zh-hans/%E5%BD%B1%E8%A7%86%E9%A3%93%E9%A3%8E
- 老师好我叫何同学 (维基百科): https://zh.wikipedia.org/zh-cn/%E8%80%81%E5%B8%88%E5%A5%BD%E6%88%91%E5%8F%AB%E4%BD%95%E5%90%8C%E5%AD%A6
- 为什么这么多人如此关注「影视飓风」 (人人都是产品经理): https://www.woshipm.com/share/6299214.html
- Tim on 罗永浩's podcast (即刻 summary): https://m.okjike.com/originalPosts/68ef23fe26b22c70b79d1e3a
- 影视飓风全英文测评iPhone新机 (新浪): https://k.sina.cn/article_7879849089_1d5acf48106801cva6.html
- 影视飓风下架视频变糊科普视频 (腾讯新闻): https://news.qq.com/rain/a/20241010A06H2700
- 谁动了我们的视频 (经济观察网): https://www.eeo.com.cn/2024/1020/692319.shtml
- 影视飓风终于回应了，去相亲角被批的他冤吗？ (36氪): https://36kr.com/p/3554124971932804
- 影视飓风员工道歉 (新浪, island livestream): https://www.sina.cn/news/detail/5316385664405559.html
- 何同学的"5G"时代 (界面): https://www.jiemian.com/article/3201696.html
- 10支视频5次热搜，何同学总能刷屏的原因有哪些？ (CBNData): https://www.cbndata.com/information/210654
- 转型的何同学，夹在稚晖君和手工耿之间 (腾讯新闻): https://news.qq.com/rain/a/20220824A01I2G00
- 何同学塌房，一场熟悉的"电子献祭" (腾讯新闻): https://news.qq.com/rain/a/20250418A02VF400
- 千万粉丝博主"何同学"抄袭？原作者发声 (澎湃): https://m.thepaper.cn/newsDetail_forward_29403104
- 何同学 假B站 实验结论 (搜狐): https://www.sohu.com/a/678471032_120948063
- 毕导：为生活添笑料，科学可以很好玩 (澎湃): https://www.thepaper.cn/newsDetail_forward_5263177
- 毕导：篇篇10万+，如何设计出脑洞超大、受欢迎的选题？ (蓝鲸): https://www.lanjinger.com/d/111053
- "毕导"做自媒体这8年 (新榜, via 腾讯新闻): https://news.qq.com/rain/a/20240131A04AEW00
- 基于框架理论的科普短视频内容创作研究——以B站UP主"毕导THU"为例 (科普中国): https://www.kepuchina.cn/article/articleinfo?business_type=100&ar_id=456194

Course material:
- CSE 291 decks L05, L06, L08, L12, L13, L14 (scratchpad `course/`)
- `/Users/yil384/UCSD/Picasso-Lab/social/x/versions/VERSIONS.md` (v2 MoE paper film description)
