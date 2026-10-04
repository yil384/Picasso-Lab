# Platform specs and delivery rules: X + Douyin (with notes for YouTube Shorts, Bilibili, Xiaohongshu)

Researched 2026-10-04 for the @PicassoLabUCSD 科普 relaunch. Every number below has a source in the list at the end.
**(unverified)** marks claims that come only from third-party blogs or that I could not confirm on an official page.
**(official)** marks numbers read on the platform's own pages.

Context from the repo: the X launch cuts are **1080x1350 (4:5), 30 fps, H.264 High, yuv420p, BT.709, about 4.7 Mbps**
(`social/x/versions/v9_compute_not_included.mp4`, 110 s). The archived v9 file has a **silent** AAC track (measured
-70 LUFS). So the 科普 format adds two things the launch films never needed: a voice-over loudness spec and
captions. It also moves from 4:5 to 9:16.

---

## 0. TL;DR decisions

| Item | Decision |
| --- | --- |
| Master raster | **1080x1920, 9:16, 30 fps CFR, progressive, SDR BT.709** (same 30 fps as the launch films) |
| Delivery codec | H.264 High, yuv420p, closed GOP, 2 s keyframe interval, `+faststart`; AAC-LC 48 kHz stereo 256 kbps |
| Delivery bitrate | X: about 12 Mbps VBR (cap 16). Douyin: about 10 Mbps. X allows up to 25 Mbps and asks for at least 5 Mbps |
| Loudness | **-14 LUFS integrated, true peak <= -1.5 dBTP**, VO-led mix |
| Main-line length | **<= 2:15 per X cut** (hard X limit 2:20 for non-Premium). Target 1:30-2:10. One concept per episode |
| Captions | **Burned in** on both (EN on X, ZH on Douyin). EN <= 26 chars/line, ZH <= 12 chars/line, 2 lines max |
| Safe zone | One template for both platforms (section 3): keep-clear top 0-260, bottom 1480-1920, right rail x 880-1080 for y 700-1480 |
| Cover | 1080x1920 master cover, title band y 560-1000 so it survives 1:1, 4:5 and 3:4 center crops. Also export 1080x1440 (3:4) |
| X account tier | 1080p playback on X needs a subscribed account (X API docs). Check @PicassoLabUCSD's tier before mastering at 1080 |

---

## 1. X (Twitter)

### 1.1 Length and file size (conflicting official sources)

| Source | Non-Premium | Premium / verified |
| --- | --- | --- |
| **X Help Center**, "How to share and watch videos on X" (official, 2026 snapshot) | **140 s (2:20), 512 MB** | under 4 h at 1080p, 16 GB; 2-4 h must be 720p, 16 GB |
| X Help Center, "Longer videos FAQ" (official, 2026 snapshot) | n/a | "Videos shorter than 4 hours (1080p) should not exceed 16GB"; 2-4 h at 720p |
| **X API docs**, "Best practices - Media" (official, docs.x.com; a third party dates the update to 1 Sep 2026) | **Post video 0.5 s-20 min, 8 GB** ("Post-video caps match the X app") | Post video 0.5 s-125 min, 16 GB |
| Android app (third-party, repeated across 2025-26 guides) | | Premium on Android limited to 10 min **(unverified)** |
| X Ads, Vertical Video Ads (official) | Ads: 15 s recommended, **up to 2:20 supported** | same |

Other notes:
- The API docs also say "Limits follow the authenticated user (X Premium / verified status)."
- A 2025 RouteNote test found free accounts quietly uploading 9:59 on web and over 6 h on iOS. This is a third-party
  test, not an official statement **(unverified)**.
- Premium tiers: Basic is reported at 3 h / 8 GB / 1080p versus 4 h for Premium and Premium+ **(unverified)**.
- Verified Organizations: "All accounts associated with Verified Organizations gain access to the features of X
  Premium" (per X help summary in search results). Whether that includes long video was not confirmed **(unverified)**.
- 4K uploads: X Engineering said on 2025-04-30 that it was "starting to roll out 4k video uploads for some creators.
  Coming soon for all Premium subscribers" (Engadget). I found no confirmation that it shipped to everyone
  **(unverified)**. It does not matter for a 1080 master.

**Takeaway:** treat **2:20 as the hard cap** until a test upload of a 3-minute file on the lab account proves the
20-minute API figure applies in the app. Every main-line episode is built to fit 2:20 anyway (section 4).

### 1.2 Resolution, fps, bitrate, codec (official, X API "Best practices - Media")

- Codec: **H264 High Profile**. Audio: **AAC LC**. HE-AAC is not supported. Mono or stereo only, no 5.1.
- Frame rate: **30 or 60 fps** recommended, must be 60 fps or less.
- Bitrate: **minimum video bitrate 5,000 kbps**, minimum audio bitrate 128 kbps. The Vertical Video Ads spec gives a
  **target of 5-10 Mbps and a maximum of 25 Mbps**. Amplify gives 6-10 Mbps for 1080p.
- Must be yuv420p, square pixels (1:1 PAR) and progressive scan, with **no open GOP**. Aspect ratio must be between 1:3
  and 3:1.
- **1080p vs 720p by tier:** "Subscribed users can upload a 1080p video and get 1080p playback. Unsubscribed users
  can upload a 720p video and get a 720p playback." If @PicassoLabUCSD is not subscribed, a 1080x1920 upload will
  likely play at 720x1280. The tier of @PicassoLabUCSD is unknown to me **(check)**.
- The same doc still lists "Dimensions must be between 32x32 and 1280x1024" under "Advanced". That is legacy
  text: the lab's own 1080x1350 launch film was posted to X, so it is not enforced in the app.
- Vertical Video Ads (official): maximum 1080x1920, minimum 720x1280, 9:16 recommended.

### 1.3 Vertical playback and how videos are cropped

- **Video tab / Immersive Media Viewer.**
  - The video tab rolled out in the US on 2025-01-19/20 (MediaPost). Ads in the viewer are "full-screen, sound-on"
    (X Business, official).
  - X says vertical video is about 20% of time spent on X and that more than 100M users watch it daily (X Business
    marketing figures).
  - X Business (official): "9:16, 16:9, and 1:1 videos are all supported on Media Viewer; however 9:16 vertical
    video is recommended."
- **Timeline crop.**
  - Feb 2026: X shipped a new immersive player on iOS (one tap to full screen, swipe up for the next video), and
    users complained that it cropped videos.
  - Head of Product Nikita Bier replied: "Sorry, but cropping the video incentivized people to post square videos.
    We are a mobile company." He said X will **stop cropping vertical content going forward** (TechCrunch,
    2026-02-18; Dataconomy 2026-02-19).
  - What the Home timeline does today with a 9:16 file is not documented **(unverified, test it)**.
  - History: Wes Bos measured X/Twitter cropping 9:16 video on iPhones by about 98 px left and right and about
    190 px at the bottom, with no crop at the top (2022).
  - X's own ad guidance for mixed placements says "1:1 square video may be the best for all placements without being
    cropped." That is why the template below keeps the key content inside a central 4:5 / 1:1 core.
- **Immersive viewer overlays.** These are X's official ad-spec numbers. The organic layout is probably similar, minus
  the CTA **(unverified)**.
  - **iOS** (on a 1125 px-wide screen):
    - top bar 1125x110
    - back arrow / avatar 100x100 at (45, 180)
    - blurb bar 1125x250 (name, handle, 2 lines of post text)
    - CTA bar 160 (ads only)
    - metrics bar 1125x70 ("Replies, Shares, Likes, Views, Save, and Share appear here at the bottom of the screen")
    - bottom menu 1125x250
  - **Android** (1080 wide):
    - top bar 72
    - back arrow at (75, 75)
    - blurb 1030x285 (3 lines)
    - metrics 1080x45
    - bottom bar 1080x80
    - CTA at y 1385 (ads only)
  - On a 1080x1920 frame the Android stack covers roughly **y 1510-1920** (285+45+80 = 410 px).
  - Unlike Douyin, the X engagement buttons are a **horizontal row at the bottom, not a right-side column**.
  - X says "This overlay disappears after two seconds of your video is watched" (Vertical Video Ads page, official,
    for ads).
- **Post copy in the viewer:** at most 3 lines before "Read More". X recommends **90 characters or fewer** so the
  whole caption shows (official, ads).
- **First 3 seconds:** "The first three seconds are critical ... Place your most important visual at the three
  second mark" (X Vertical Video Ads best practices, official).

### 1.4 Captions on X

- **SRT upload:**
  - Web composer only: "Upload caption file (.srt)" next to "Tag people".
  - SRT only, UTF-8 (help.x.com/en/using-x/upload-caption-srt-file via 3Play / Blitzcut summaries). The
    web-only and format details are from third-party summaries **(unverified)**.
  - Amplify docs (official) list "subtitles" as a media category.
- **Muted autoplay and auto-captions** (X Help Center, official):
  - "In timelines, Moments, the Explore tab, and across X, native videos and GIFs will autoplay."
  - Subtitles show when "your device's sound [is] off".
  - "On iOS and Android, captions are shown automatically when videos are viewed in your timeline."
  - "Speech-to-text is generated using Microsoft Azure Cognitive Services."
  - "Not all videos will have captions or subtitles available."
- **Risk: double captions.** Burned-in subtitles plus an uploaded SRT, or X's own speech-to-text, could show two
  caption layers in the muted timeline. **Rule:** burn captions into the X cut (they are part of the design) and do
  **not** attach an SRT to the X post. Check once on a test post whether X adds auto-captions on top, and whether that
  can be switched off **(unverified)**.
- A vendor claims that 70-85% of X video impressions are muted autoplay (Blitzcut). It is not official
  **(unverified)**, but it is consistent with burning captions in.

### 1.5 Thumbnail / cover on X

- **Custom thumbnails:**
  - @XCreators posted "Thumbnails are here. Upload an image or pick any frame from your video, then customize it with
    our photo editor. Now live on iOS." The post ID decodes to 2026-07-21. I read the text in a search snippet only;
    the post itself is paywalled to fetch **(partly verified)**.
  - Before that, custom thumbnails went through **Media Studio** (Premium): "Change thumbnail", upload or pick a
    frame. The thumbnail's **aspect ratio must match the video** (X guidance quoted via a Grok reply and Sprinklr
    help) **(unverified)**.
- **Rule:** export the cover at **1080x1920** to match the video, and design frame 0 as a usable fallback thumbnail.
- **Downloads:** since 2023-07-25, Premium users can download your videos unless you switch off "Allow video to be
  downloaded" while composing. Help Center: the setting "cannot be changed later".

---

## 2. Douyin (抖音)

Official Douyin spec pages are sparse and mostly behind a login. Only the open-platform upload doc and news reports
of Douyin announcements are first-party below. **All Douyin UI pixel numbers are third-party (unverified)**, so
section 3 builds in margin and ends with a calibration step.

### 2.1 Resolution, format, size, length tiers

- **Open platform "上传视频" doc (official):**
  - "支持常用视频格式，推荐使用 mp4、webm"
  - files over 300 MB must use chunked upload, total within **4 GB**
  - length **within 15 minutes**
  - "推荐上传 16:9，分辨率为 720p（1280x720）及以上的竖版视频" (the doc literally says 16:9 and vertical in one
    breath)
- Recommended raster: **1080x1920, 9:16** (every guide agrees). Several 2026 guides say 4K uploads are allowed and
  that 1080p is the normal playback ceiling **(unverified)**.
- **Length tiers (all unverified):**
  - App camera: 15 s / 60 s / 3 min modes.
  - App upload: up to 15 min.
  - Web creator center (creator.douyin.com): up to 60-90 min for accounts with long-video permission (real-name, often
    1,000+ followers).
  - In 2024 Douyin pushed hour-plus videos as showcase cases (woshipm, 2024-09-19).
  - **None of this matters for our plan**, because the main line stays under 2:20 (section 4).
- **Quality folklore** (Chinese creator guides): uploads above about 6,000 kbps "get compressed harder", turn on
  "高清发布", and upload from the web **(unverified)**. Practical rule: upload a clean 1080x1920 30p file of about
  10 Mbps from the web creator center, then compare the playback with the source.
- **Mid-length plus creator monetization:** the old 中视频伙伴计划 (horizontal, more than 1 min) was replaced in
  Aug-Sep 2024 by **抖音创作者伙伴计划**. "只要是原创，竖屏视频、图文内容都能获得收益", so the 1-minute rule is
  gone (woshipm 2024-09-19, plus several guides). In Douyin's 精选 channel most videos run 1-10 min (same source).

### 2.2 Cover (封面)

- Cover for the full-screen feed: 1080x1920 (9:16).
- Profile grid and the double-column feed show covers as **3:4 (1080x1440)**. Douyin center-crops 9:16 covers to 3:4
  on the profile page, and the bottom about 25% of a 3:4 card is overlaid by the title and author info
  (secaiyun 2026, cardcrafter) **(unverified)**.
- The web creator center lets you set separate 竖封面 (3:4) and 横封面 (4:3) covers (third-party mentions)
  **(unverified)**.
- Rule: always export a dedicated 1080x1440 cover in addition to the 1080x1920 one.

### 2.3 UI safe zones on 1080x1920 (third-party, unverified)

| Source (all third-party) | Top | Bottom | Right | Left |
| --- | --- | --- | --- | --- |
| cardcrafter.cn / databrush (Douyin) | 220 | 380 (buttons, caption, music bar) | about 194 (18%) | - |
| "conservative multi-platform" rule in the same guides | 270 (14%) | 500 (26%) | 216 (20%) | 54 (5%) |
| TikTok in-feed (third-party readings of TikTok's templates) | 130 | 300-484 | 120-140 | 60 |
| YouTube Shorts (third-party) | about 180 | about 350-390 | about 120 | about 40-60 |

TikTok itself publishes downloadable template files rather than pixel numbers. Its help page says the safe area
"changes with orientation, caption length, and additional ad formats". The same is true on Douyin: a long 作品描述,
a 合集 strip, a location tag or a 商品 card all push the bottom overlay up.

### 2.4 Subtitles on Douyin

- There is no official Douyin subtitle style spec. Practice in creator guides:
  - one line, about 8-12 characters
  - big title 14-16 pt and body subtitle 10-13 pt in 剪映 terms
  - at most 2 colors, no gradients
  - **(unverified)**
- Professional reference, Netflix Simplified Chinese Timed Text Style Guide (official, for 16:9 TV):
  - **16 characters per line, maximum two lines**, "usually ... one line"
  - reading speed **up to 9 characters per second** (adult)
  - "Do not use commas or periods. Use one single space instead"
  - full-width ？！：, ellipsis U+2026
  - half-width digits
  - bottom-heavy pyramid when breaking lines
- For 9:16 at a legible size the line must be shorter: **12 characters**. See section 5.

### 2.5 Topics, titles, 合集

- **Topics (#话题):** creator guides recommend 3-5 per video: 2-3 precise content topics, 1 audience/scenario topic,
  and 0-1 official activity topic (hailuoshe) **(unverified)**. No official cap found.
- **Title field:** reported as up to 30 characters, with about 20 as the sweet spot **(unverified)**.
- **合集 (collections):**
  - Created first in the **web** creator center (内容管理 -> 合集管理 -> 创建合集), then managed in the app.
  - Name up to 20 characters, intro up to 100 characters, up to 100 videos per 合集. These numbers and the follower
    or account-age thresholds (1,000 or 10,000 followers in various guides) are **(unverified)**.
  - At launch in 2019, Douyin opened 合集 to knowledge creators first (21财经, 2019-09-09).
  - **Paid 合集 ended on 2026-02-05.** Douyin "自2026年2月5日起，正式停止付费合集的相关功能与服务". Creators move to
    付费视频 and the "合集升级" incentive plan (QQ News 2026-02-03). Free 合集 are unaffected as far as reported.
  - Plan: **one 合集 per season of the main line** (e.g. "LLM系统优化 · 第一季"), one per side-line series.

### 2.6 Knowledge (知识) content programs

- **抖音知识创作砥砺计划** (announced 2025-04-24/26, 科技日报 / 央广网):
  - Four directions: 自然科普, **前沿科技**, 人文社科, **名校名课**.
  - Serves 1,000 quality authors a year, with dedicated traffic.
  - Theme activities include "Tech the world" and "名校公开课".
  - An **"AI新星计划" for AI creators**.
  - 200+ university courses.
  - A publishing program with 20+ publishers.
  - The lab's content is "名校名课 + 前沿科技 + AI": a direct fit.
- **2026 plans** (China Daily, 2025-12-30):
  - 全球创作者计划 (funding to film in 50+ countries)
  - 大国重器计划 (more than 1 billion "exclusive traffic")
  - 专业合伙人计划
  - **创作阶梯计划**: a single video can earn up to 500,000 yuan in revenue share plus 10 million plays of
    traffic support
  - As of Nov 2025, Douyin had 1,216 "精选" knowledge authors
- **抖音创作者伙伴计划** pays for original content, vertical included (section 2.1).

### 2.7 Running a Douyin account from the US: constraints

1. **Registration needs a Chinese mainland identity.**
   - On 2025-01-16 Douyin denied opening overseas registration. VP 李亮: "有海外IP不代表是海外注册用户". Douyin said
     it had handled 10,000+ accounts impersonating foreigners, and that registration still needs a **+86 mobile
     number** (大屏时代 / 腾讯新闻 / 新浪).
   - A Sina test the same day: a US number receives the code but **fails at real-name verification**, because there
     is no US ID option.
   - So the account must be registered and real-named by a lab member with a PRC ID and a +86 number. Ownership and
     handover therefore sit with that person; plan for it.
2. **IP location.** Posts and profiles show IP属地, which will read 美国. Effect on distribution: no source found
   **(unverified)**.
3. **Enterprise/organization verification (蓝V)** normally requires a mainland business license. Monetization payouts
   need real-name plus a mainland payout account **(unverified, typical requirements)**.
4. **AI-content labeling is mandatory since 2025-09-01.**
   - 《人工智能生成合成内容标识办法》 (CAC, MIIT, MPS, NRTA): users must declare AI-generated content when they publish.
   - Douyin's labels:
     - creator declaration "内容由AI生成"
     - platform detection "疑似使用了AI生成技术，请谨慎甄别"
     - metadata "作品含AI生成内容"
     - (IT之家 2025-09-01)
   - Codex-painted key art, AI voices or AI-generated footage need the declaration.
   - Code-rendered q5/three.js visuals are not AIGC, but a film that mixes them with painted AI sprites should still be
     declared.
5. **Professional qualification for "high professional level" topics.**
   - The NRTA / Ministry of Culture and Tourism 《网络主播行为规范》 (2022-06) covers presenters who appear in
     uploaded audio and video too.
   - It names medicine, finance, law and **education**: "主播应取得相应执业资质".
   - A university professor presenting her own course is the strongest case for this. Applying for Douyin's
     职业认证 (高校教师) for the presenter account is advisable; the exact process is **(unverified)**.
6. **Copyrighted material.**
   - Do not cut in clips or audio from 喜人奇妙夜 / 脱口秀大会. Re-perform the joke structure instead.
   - Same rule on YouTube, where any Content-ID claim on a Short longer than 1 min blocks it globally (official, below).

---

## 3. ONE safe-zone template for 1080x1920 (X + Douyin together)

Built from the union of:
- Douyin's third-party numbers (top 220, bottom 380, right about 194)
- X's official immersive-viewer overlay geometry (Android bottom stack about 410 px; iOS back/avatar button down to
  about y 270 at 1080 scale)
- the 3:4 / 4:5 / 1:1 center crops that profile grids and timelines may apply

All coordinates are pixels, origin at the top left.

```
 x: 0   60  120                          880 1020 1080
 y:0 +---------------------------------------------+
     |  K-TOP  keep clear (status bar, Douyin tabs, |
     |  X back/avatar, 3:4 grid crop 0-240)         |
 260 +---+----------------------------------+------+
     |   |  T  TITLE ZONE  x60-1020 y260-560        |
 560 |   +----------------------------------+      |
     | M |                                  |      |
 700 | A |  H  HERO / CONTENT               +------+
     | R |     x60-880 (to 1020 above y700) | K-R  |
     | G |                                  | right|
1180 | I +----------------------------------+ rail |
1200 | N |  S  CAPTION ZONE x120-880         | x880-|
     |   |     y1200-1440, 2 lines max       | 1080 |
1440 |   +----------------------------------+ y700-|
1480 +---------------------------------------------+ 1480
     |  K-BOT keep clear 1480-1920                  |
     |  (Douyin nickname/description/music/合集    |
     |   strip; X blurb + metrics + nav bar)        |
1920 +---------------------------------------------+
```

| Zone | x | y | Use | Why |
| --- | --- | --- | --- | --- |
| **K-TOP** keep-clear | 0-1080 | 0-260 | nothing that matters (background only) | Douyin top tabs/search about 220 (unverified); X iOS top bar plus back/avatar to about y 270 at 1080 scale (official geometry, scaled); 3:4 grid crop removes 0-240 |
| **K-BOT** keep-clear | 0-1080 | 1480-1920 | background only | Douyin bottom stack about 380 plus growth for long descriptions and 合集 strip (unverified); X Android immersive stack about 410 (official geometry); YouTube Shorts about 350-390 (unverified) |
| **K-R** right rail | 880-1080 | 700-1480 | background only | Douyin like/comment/collect/share/music column about 18% of width (unverified); TikTok/YouTube 120-140 |
| **Margins** | 0-60 and 1020-1080 | all | nothing | finger and rounded-corner margin; TikTok/YouTube left 40-60 |
| **T** title zone | 60-1020 | 260-560 | episode kicker, chapter cards, short on-screen headline | clear of every platform's top UI; right rail starts lower |
| **H** hero / content | 60-880 (60-1020 above y 700) | 560-1180 | diagrams, character, the one thing the eye must read | center of the 4:5 (y 285-1635) and 1:1 (y 420-1500) crops |
| **S** caption zone | 120-880 (760 wide, centered on x = 500) | 1200-1440 | burned-in subtitles, last baseline <= 1420 | above Douyin and X bottom overlays, left of the right rail |
| **C** cover title band (covers only) | 100-880 | 560-1000 | cover headline and episode number | survives 1:1, 4:5 and 3:4 center crops and the 3:4 card's bottom-25% overlay |

Notes:
- **Center of interest:** keep faces and the key diagram node inside **x 60-880, y 420-1180**. That is inside every
  crop above and away from every overlay.
- **Calibration (do once):** render a 10-second grid video (100 px lines, labeled), post it on Douyin as 仅自己可见
  and on a protected X test account, and screenshot both on an iPhone and an Android phone (feed, video tab, profile
  grid). Then tighten or relax the numbers. The Douyin figures are third-party, and X's organic overlay may differ
  from the ad spec.

---

## 4. Length strategy

Hard limits that matter:
- **X 2:20** (non-Premium, Help Center; also the X vertical-ad maximum)
- **YouTube Shorts 3:00** (official)
- Douyin about 15 min (open-platform doc)

The binding limit is X.

**Main line (LLM / systems / quantum, from CSE 291's 14 lectures):**
- Episode = **one idea**, finished length **1:30-2:10, hard cap 2:15** (5 s under the X limit, room for an end
  card). At about 150-160 wpm that is about 230-340 words of English VO.
- Shape:
  - 0-3 s hook (a visual plus the question; X says the first 3 s are critical)
  - 3-20 s the problem / stakes
  - 20-100 s the mechanism (the q5/three.js scenes)
  - 100-125 s payoff plus one comedic button
  - 125-135 s the "next episode" tag
- Plan **3-4 episodes per lecture**, so about 40-55 episodes per season. Number them so they read as a series (X
  post text and cover badge), and put them in **one Douyin 合集 per season**.
- A topic that needs more than 2:15 becomes **Part 1 / Part 2**, not a longer video. That keeps the identical file
  valid for X, YouTube Shorts and Douyin.
- Optional Douyin-only **加长版** (3-6 min) for lectures that deserve it. Douyin's 精选 knowledge feed is mostly
  1-10 min (woshipm). This is a second edit, not the default.
- If the X account is Premium (or the 20-min API figure proves true in the app), longer X uploads become possible. Keep
  the 2:15 rule anyway as the series format, because it is what fits every platform at once.

**Side line (iPhone vlogs: Zhen Ji jungling, scooter, $5/24 h San Diego):**
- X cut **45-90 s** (hard cap 2:15). Douyin cut 1-3 min.
- Multi-day challenges become a **3-4 part mini-series**, each part under 2:15, with a Douyin 合集 per series. An
  optional Douyin long version can run up to 15 min.

---

## 5. Caption style rules (burned in)

Base references, Netflix Timed Text Style Guides (official, written for 16:9):

| Language | Max chars/line | Max lines | Max reading speed (adult) |
| --- | --- | --- | --- |
| English (USA) | 42 | 2 | 20 characters/s |
| Simplified Chinese | 16 | 2 | 9 characters/s |

Line-break rules:
- EN: break after punctuation and before conjunctions/prepositions; never split article+noun or first+last name.
- Both: prefer a bottom-heavy pyramid.

Adapted for a 760-px-wide caption box on a 1080x1920 frame:

| | English (X cut) | Chinese (Douyin cut) | Bilingual variant (Douyin, if the VO stays English) |
| --- | --- | --- | --- |
| Font size (px at 1080 wide) | **54** (semibold, sans) | **60** (黑体 class, medium/bold) | ZH 58 + EN 38 |
| Line height | 1.2 (about 65 px) | 1.25 (about 75 px) | ZH line on top, EN below |
| Chars per line | **<= 26** (760 px / about 28.6 px average glyph at 54 px) | **<= 12** (12 x 60 = 720 px); prefer one line | ZH <= 12, EN <= 34 |
| Lines | 1 preferred, 2 max | 1 preferred, 2 max | exactly 2 (1 ZH + 1 EN) |
| Reading speed target | <= 17 cps (Netflix max 20) | <= 7 chars/s (Netflix max 9) | pace by the ZH line |
| Punctuation | normal, no trailing period | no commas or periods, use a space (Netflix SC); full-width ？！ | same |
| Position | zone S: last baseline at y <= 1420, centered on x = 500 | same | same |
| Treatment | white fill plus a soft dark shadow or a 4-6 px dark stroke, or a translucent bar; one accent color for keywords; no gradients (Douyin practice) | same | EN line at about 85% opacity |

Rules:
- One subtitle event = one spoken phrase. Never let a subtitle cross a scene cut. Keep each event on screen for about
  0.8-7 s (Netflix general requirements; not re-checked here).
- **No SRT on the X post** (double-caption risk, section 1.4). Keep `en.srt` and `zh.srt` anyway for YouTube and
  Bilibili CC and as the translation source.
- **On-screen labels inside the q5/three.js pages:** give every page a `lang=en|zh` switch and render the film twice,
  so diagrams in the Douyin cut are in Chinese. Minimum on-screen label size: about 40 px at 1080 wide (my
  recommendation, not a platform rule).

---

## 6. Cover / thumbnail rules

1. **Exports per episode:**
   - `cover_1080x1920.jpg` (X thumbnail and Douyin full-screen cover; X requires the same aspect as the video)
   - `cover_1080x1440.jpg` (Douyin 3:4 grid and double-column cards, Xiaohongshu)
   - optional `cover_1920x1080.jpg` (Bilibili horizontal cover)
   - sRGB JPG, under 2 MB
2. **Title band** x 100-880, y 560-1000 on the 9:16 cover. It survives the 1:1 (y 420-1500), 4:5 and 3:4 center crops
   and stays above the bottom-25% title overlay of a 3:4 card.
3. **Copy:** at most about 8 Chinese characters or 4 English words in the headline, at least 120 px tall. Add a small
   series badge ("LLM Sys 03") in a fixed corner inside the band.
4. **One series template:** same layout, type and badge. Color-code by line (LLM / Systems / Quantum / 支线) so the
   profile grid reads as a set.
5. **Art:** the painted key art (Codex green-screen, keyed) or a real photo plus one hero object from the episode. Use
   no auto-picked mid-motion frames and none of the generic "AI" look the user rejects.
6. **Frame 0 = fallback thumbnail.** Make the first frame a clean, legible image. Thumbnail behavior without a custom
   upload varies, and autoplay-off users see a still.
7. On X, set the custom thumbnail through iOS (rolled out July 2026) or Media Studio. On Douyin, set both the 竖封面
   and the 3:4 cover in the web creator center.

---

## 7. Master spec sheet

| Parameter | Master (archive) | X delivery (EN) | Douyin delivery (ZH) |
| --- | --- | --- | --- |
| Raster | 1080x1920 | 1080x1920 (plays at 720x1280 if the account is unsubscribed) | 1080x1920 |
| Frame rate | 30 fps CFR (launch-film standard; iPhone vlogs shot 4K30 and conformed to 30) | 30 | 30 |
| Scan / PAR | progressive, 1:1 | same | same |
| Color | SDR BT.709. iPhone HDR (Dolby Vision/HLG) converted to Rec.709 in the edit; platform HDR handling is **(unverified)** | BT.709 tagged | BT.709 tagged |
| Video codec | PNG frame sequence, or ProRes 422 HQ | H.264 High, level 4.2, yuv420p, closed GOP, keyframe every 60 frames | same |
| Video bitrate | n/a (intra / near-lossless) | **about 12 Mbps VBR, maxrate 16 Mbps** (X min 5, target 5-10, max 25). Fine halftone and ink lines need the headroom | **about 10 Mbps VBR** (test against the "over 6 Mbps" folklore) |
| Audio | 48 kHz / 24-bit WAV stems (VO, music, SFX) | AAC-LC 48 kHz stereo 256 kbps (X min 128; no HE-AAC) | same |
| Loudness | mix to **-14 LUFS integrated, <= -1.5 dBTP**, VO dominant, music bed about 8-12 LU under VO | same file | same file |
| Container | .mov / folder | .mp4 with `+faststart` | .mp4 |
| Size check | n/a | 2:15 at 12 Mbps is about 205 MB (< 512 MB) | under 4 GB |

About the loudness target:
- No X or Douyin loudness target was found.
- -14 LUFS / -1 dBTP follows Spotify's published normalization (official). YouTube's -14 is measured and widely
  reported, not published **(unverified)**.
- Mixing to -14 means no platform has to turn the video up. Speech stays intelligible on phone speakers.

Reference encode (from a PNG sequence plus the mixed WAV):

```
ffmpeg -framerate 30 -i frames/%05d.png -i mix.wav \
  -c:v libx264 -profile:v high -level 4.2 -pix_fmt yuv420p -preset slow \
  -b:v 12M -maxrate 16M -bufsize 24M -g 60 -keyint_min 60 -sc_threshold 0 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -profile:a aac_low -ar 48000 -ac 2 -b:a 256k \
  -movflags +faststart out_x_en.mp4
# Loudness: two-pass loudnorm on mix.wav first (I=-14, TP=-1.5, LRA=11, linear=true).
```

Deliverables per episode:
- `master/` (PNG or ProRes plus WAV stems)
- `x_en.mp4`
- `dy_zh.mp4`
- `en.srt`
- `zh.srt`
- `cover_1080x1920.jpg`
- `cover_1080x1440.jpg`

Each film is rendered twice (`lang=en` / `lang=zh`), so on-screen text and burned captions are language-native.

---

## 8. Cross-posting notes

- **YouTube Shorts** (official):
  - Up to **3 minutes**, square or vertical; uploads on or after 2024-10-15 are classified as Shorts.
  - "Any Short that is over one minute in duration with an active Content ID claim of any type ... will be blocked
    globally."
  - Most songs are usable for up to 90 s in a 3-min Short.
  - The X EN file works as is. Upload `en.srt` as CC.
  - The Shorts UI keeps about 120 px on the right and about 350-390 px at the bottom clear **(unverified)**; the
    template above already covers this.
- **Bilibili:**
  - 1080x1920 uploads are detected as 竖屏 and play in the vertical swipe feed (third-party how-tos).
  - File cap is reported at 8 GB; at least 6 Mbps is advised for 1080p **(unverified)**.
  - Knowledge zone (知识区) audiences tolerate longer pieces, so stitched "whole lecture" compilations are a natural
    extra.
  - Covers 1920x1080 and 1080x1920 **(unverified)**.
  - Upload `zh.srt` as CC.
  - The AI-content labeling law applies on every mainland platform.
- **Xiaohongshu:**
  - Video notes up to 15 min / about 10 GB via creator.xiaohongshu.com **(unverified)**.
  - The feed is a double-column **3:4** grid, so reuse `cover_1080x1440.jpg` (1080x1440 recommended, third-party).
  - Use the Douyin ZH cut.

---

## 9. Open items to test (cheap, once)

1. **X tier of @PicassoLabUCSD:** is the account Premium or Verified Org (1080p playback, length)? Upload a 3:00 test
   file to confirm whether the 20-min API figure applies in the app.
2. **X muted timeline:** does a burned-caption video get X auto-captions on top? Does a 9:16 file display uncropped
   in the Home timeline on iOS and Android?
3. **Douyin and X grid-video calibration** of the safe zones (section 3).
4. **Douyin playback quality:** web upload at 8 / 10 / 12 Mbps with 高清发布 on. Compare the downloaded or recorded
   playback.
5. **Douyin account owner:** who holds the +86 number and PRC ID? Plan 职业认证 for the presenter.

---

## Sources

Official / first-party:
- X API docs, Media best practices (size, duration, codec, 1080p-by-tier): https://docs.x.com/x-api/media/quickstart/best-practices
- X Help Center, How to share and watch videos on X (140 s / 512 MB; Premium 4 h / 16 GB; autoplay; captions; downloads): https://help.x.com/en/using-x/x-videos (read via a 2026 web.archive.org snapshot; live page behind Cloudflare)
- X Help Center, Longer videos FAQ: https://help.x.com/en/using-x/premium-longer-videos (archive snapshot)
- X Help Center, Upload caption (.srt) file: https://help.x.com/en/using-x/upload-caption-srt-file (via summaries)
- X Business, Vertical Video Ads (specs, overlays disappear after 2 s, 20% time spent): https://business.x.com/en/products/vertical-video-ads
- X Business, Ads creative specs (Immersive Media Viewer overlay geometry, iOS/Android): https://business.x.com/en/help/campaign-setup/creative-ad-specifications-old
- @XCreators thumbnails post (2026-07-21, read via search snippet): https://x.com/XCreators/status/2079626925291532484
- Douyin Open Platform, 上传视频: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/create-video/upload-video
- YouTube Help, three-minute Shorts: https://support.google.com/youtube/answer/15424877
- Netflix, Chinese (Simplified) Timed Text Style Guide: https://partnerhelp.netflixstudios.com/hc/en-us/articles/215986007-Chinese-Simplified-Timed-Text-Style-Guide
- Netflix, English (USA) Timed Text Style Guide: https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide
- Spotify, Loudness normalization: https://support.spotify.com/us/artists/article/loudness-normalization/
- 《人工智能生成合成内容标识办法》 (新华网): https://www.news.cn/politics/20250314/b7a24028f2924b7681e6ed1bfbd8fade/c.html
- 《网络主播行为规范》 (中国政府网): https://www.gov.cn/gongbao/content/2022/content_5707286.htm

News:
- TechCrunch 2026-02-18, X immersive player / cropping: https://techcrunch.com/2026/02/18/x-continues-to-bet-on-vertical-video-with-its-latest-update/
- Dataconomy 2026-02-19: https://dataconomy.com/2026/02/19/x-to-stop-cropping-vertical-videos-after-immediate-user-backlash/
- ContentGrip, X immersive player: https://www.contentgrip.com/x-vertical-video-player-update/
- MediaPost 2025-01-20, X video tab: https://www.mediapost.com/publications/article/402695/x-rolls-out-vertical-video-tab.html
- Engadget 2025-04-30, X 4K uploads: https://www.engadget.com/big-tech/x-is-bringing-4k-video-uploads-to-premium-subscribers-120044356.html
- RouteNote 2025-04-15, free-user length test: https://routenote.com/blog/x-increases-video-length/
- 腾讯新闻 2025-01-16, 抖音 not opening overseas registration: https://news.qq.com/rain/a/20250116A02A1R00
- 新浪 2025-01-16, US number cannot register: https://finance.sina.com.cn/stock/wbstock/2025-01-16/doc-inefczxx6814078.shtml
- 大屏时代, +86 still required: https://www.dapingtime.com/article/803.html
- 科技日报 2025-04-26, 抖音知识创作砥砺计划: https://www.stdaily.com/web/gdxw/2025-04/26/content_331719.html
- 中国日报网 2025-12-30, 2025 knowledge list and 2026 plans: https://cn.chinadaily.com.cn/a/202512/30/WS69538831a310942cc4999637.html
- 腾讯新闻 2026-02-03, paid 合集 discontinued: https://news.qq.com/rain/a/20260203A04WNI00
- IT之家 2025-09-01, Douyin AI labels: https://www.ithome.com/0/879/586.htm
- 21财经 2019-09-09, 合集 opened to knowledge creators first: https://m.21jingji.com/article/20190909/herald/bae7fd96304b8f3c02613fdba032c0cd.html
- 人人都是产品经理 2024-09-19, Douyin length / creator partner plan: https://www.woshipm.com/share/6116678.html

Third-party (used only where marked unverified):
- Wes Bos 2022, Twitter vertical crop: https://wesbos.com/twitter-cropping-vertical-video
- postfa.st X video sizes (dev-docs vs Help Center discrepancy): https://postfa.st/sizes/x/video
- bulkpublish X limits: https://www.bulkpublish.com/blog/x-twitter-limits/
- Kapwing, X vertical video tab: https://www.kapwing.com/resources/how-to-post-videos-on-x-in-2025-vertical-video-tab/
- Blitzcut, X captions: https://blitzcutai.com/blog/how-to-add-captions-x-twitter-video
- cardcrafter, Douyin cover and safe zone: https://www.cardcrafter.cn/blog/douyin-cover-size-and-design
- databrush, vertical safe-zone checklist: https://www.databrush.com/article.php?id=595
- secaiyun, Douyin sizes 2026: https://www.secaiyun.com/docs/douyin-kuaishou-video-size-specification-guide-2026-06-02.html
- secaiyun, cover sizes 2026: https://www.secaiyun.com/docs/short-video-cover-size-guide-2026-05-23.html
- recharm, TikTok safe zones: https://www.recharm.com/blog/tiktok-video-ad-specs
- YouTube Shorts safe-zone guides: https://www.hopperhq.com/blog/youtube-shorts-dimensions/
- deervideo, Bilibili upload specs: https://deervideo.net/guide/bilibili-video-upload-format
- Xiaohongshu length guide: https://insight.xiaoduoai.com/commerce-knowledge/xiaohongshu-information/xiaohongshu-can-upload-videos-up-to-15-minutes-or-30-minutes-where-is-the-upload-button-hidden-official-duration-limit-analysis-complete-guide-to-upload-entry-even-newbies-can-get-started-quickly.html
- 抖音合集 creation guides: https://xueyuan.yixiaoer.cn/article/29679
- Douyin hashtag guide: https://www.hailuoshe.com/blog/douyin-hashtag-strategy
