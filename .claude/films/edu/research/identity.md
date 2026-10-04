# Series identity: what we can reuse, what the user's taste demands, and a proposed identity

Scope: the reusable visual assets and identity elements for the @PicassoLabUCSD explainer account, the user's taste history
turned into rules, and a proposed identity: names, cast, narrator, visual language, stingers, cover and type. I only read
the repo. Evidence images I made are in this folder (`research/`):

| File | What it shows |
| --- | --- |
| `sheet_yufei_cat.jpg`, `sheet_members.jpg`, `sheet_props_extra.jpg`, `sheet_ink.jpg` | the launch-film art (`.claude/films/xlaunch/art`) |
| `sheet_yufei_art3d.jpg`, `sheet_yufei_chibi.jpg` | the avatar-short art (`.claude/films/yufei/anime/art3d`, `art`) |
| `sheet_hotpot.jpg` | the hot-pot short's key frames |
| `sheet_projects.jpg` | 16 frames from the four 3D-comic project films |
| `sheet_v7.jpg`, `sheet_v9.jpg`, `sheet_v10.jpg`, `v10_type.jpg` | the approved stills, the archived v9 cut, the 67 s v10 render |
| `cover_mock_en.jpg`, `cover_mock_zh.jpg`, `cover_mock_zh_safezones.jpg`, `cover_mock_sheet.jpg` | a cover/frame-0 layout mock, made with `cover_mock.py` |

The v10 frames come from `~/Downloads/1C68E3F9-….mp4`: 1080x1350, 67.06 s, with an audio track. It matches the v10
length in `STORYBOARD_v10.md`. That this is the cut actually posted on X is **(unverified)**.

---

## 0. Conclusions in brief

1. **The approved "studio" look should be the base.** It is the look the user approved ("可以可以，就要这个质感"),
   the look already posted on X, and the style the whole painted cast is drawn in. It has a dark cyclorama, a walnut
   desk under a warm lamp, real paper, red-pen ink, stamps, sticky notes and editorial type. The 3D-comic look of the
   project films comes in only *inside* that world: a project film plays on a printed comic page or a phone on the
   desk. Mixing the two character styles in one frame would clash.
2. **The launch film already holds a series format.** THE BILL (the receipt the printer printed) lists GPU TIME,
   MEMORY + CHIPS, THE NEXT COMPUTER (TBD) and DATA MOVEMENT. Those lines map onto LLM systems, hardware and quantum.
   Each episode can be one line item on the bill, so the series reads as an itemized receipt.
3. **Recommended names:**
   - Main line: **Compute Not Included / 《算力另计》**.
   - Side line: **Not on the Exam / 《这题不考》**. Alternative: **Off-Syllabus / 《超纲了》**. The English
     "Off Syllabus" is already the name of a podcast.
   - I found no clashes on the web for the Chinese names, but they still need an in-app search on Douyin
     **(unverified)**.
4. **Cast:**
   - Prof. Ding is the Professor.
   - The white cat in the red beret is the audience stand-in. It speaks only in red pen and sticky notes, falls asleep
     when an explanation drags, and stamps each episode's verdict. Possible names: "Picatso" (the title of Yufei's
     avatar short) or 毕加猫.
   - Members appear as the guest expert of an episode, each with the gag their approved Team-page avatar effect
     already gives them.
   - The red noise gremlins are the recurring villain.
5. **Narrator.** The host should be a real human voice, recorded in each language by a lab member. Prof. Ding can add
   short lines of her own. Only an on-screen "AI" character should ever use a synthetic voice, and that use is a joke.
   Every visual must still work with the sound off.
6. **Typography:**
   - English keeps v10's set: Instrument Serif, Caveat as red pen, JetBrains Mono.
   - Chinese uses Noto Serif SC (思源宋体) for statements and Noto Sans SC (思源黑体) for subtitles. Handwritten
     remarks should be real handwriting scans, with Long Cang (龙藏体) or LXGW WenKai (霞鹜文楷) as fallbacks.
   - All text is rendered inside the scene from a string table, so the Chinese version is a second render and not an
     overlay.
7. **Missing assets:**
   - Teaching poses for Yufei (point, count, shrug, at a board).
   - More than one pose for most members (all 14 hold a milk-tea toast).
   - Paintings for Ohm, Yanju, Yilin and Zihan.
   - A taller 9:16 set: the launch film is 4:5.

---

## 1. Inventory of what can be reused

### 1.1 Painted cast, Pixar-style 3D, flat #00FF00 (`.claude/films/xlaunch/art`, 1024x1536 or 1024x1024)

Every sprite below also exists already keyed, with a depth-relief map (`<name>_d.png`), in
`.claude/films/xlaunch/kit/assets/cut/`. `sprite.js` uses those maps to relight the sprite from the shot's own key and
rim light.

| Group | Files | Notes for the series |
| --- | --- | --- |
| **Yufei** (12) | `y_award, y_hold_cat, y_hold_up, y_invite, y_paint_air, y_proud, y_receipt, y_surprise, y_swing, y_toast, y_wave, y_write` | Red half-rim glasses, navy blazer, chevron top, silver pendant (style paragraph in `PROMPTS.md`, reference `.claude/films/yufei/anime/art/y_ref3d.png`, a turnaround sheet). Good for welcome, react, toast and award. **Missing for teaching:** pointing or presenting, counting on fingers, holding a marker or chalk, facing a board, shrugging, a facepalm, laughing, seated and talking to camera. |
| **The cat** (5 + 4) | `cat_bat, cat_receipt, cat_sit, cat_sleep, cat_tug`; plus `cat_cheer, cat_jump, cat_pot, cat_scared` in `.claude/films/yufei/anime/art3d/` | A fluffy white cat with a red painter's beret and blue eyes. It is the strongest single image we have: white on a dark set, readable at thumbnail size (see `cover_mock_sheet.jpg`). It already has comedy poses: smug, asleep, batting, tugging, buried in receipt paper, scared. The repo gives it no name. |
| **Members** (14) | `m_chang, m_haotian, m_jixuan, m_keyi, m_parikshit, m_rishabh, m_xiang, m_xinwei, m_yichen, m_yue, m_zaifeng, m_zhengding, m_zhongkai, m_zhuo` | All in **one** pose: a full-body milk-tea toast, each with one personal prop (coffee, cap, calligraphy brush, controller, headlamp, stopwatch, mic, frying pan, cards, bat, papers, sunglasses, medals). `PROMPTS.md` says the members agreed to be painted. Round-1 table names but no files: `m_ohm, m_yanju, m_yilin, m_zihan` (all four have Team-page photos in `people/static/`). |
| **Member extras** (7) | `xiang_chip` (quantum chip), `xiang_land` (superhero landing), `zaifeng_flop`, `zaifeng_gpu`, `zhongkai_offer`, `zhongkai_tray` (six milk teas), `zhongkai_wafer` | Ready for quantum, GPU and chip episodes. |
| **Gremlins** | `gremlins, grem_burst, grem_dizzy` (art3d; sheets of three, split by connected components) | Red, spiky "noise gremlins" from the avatar short (quantum noise). They make a ready villain for any episode that needs a conflict: noise, a straggler, a cache miss, a bug. |
| **Furniture** | `desk_empty`, `chair_spare` | The "seat open / first author wanted" pair: the recruiting ending. |

### 1.2 Props, ink, textures, photos

- **Painted props** (`art/prop_*.png`): `books, calendar` ("DAY 4,700" is painted into it), `lamp` (green banker's
  lamp), `pen` (red ballpoint), `plant` (succulent), `printer` (thermal receipt printer), `rack` (mini server rack),
  `tea` (milk tea). The printer, rack, lamp and tea make up the series' desk.
- **Ink** (`art/ink/`, scans of real ink on paper):
  - red ballpoint marks: `pen_arrow, pen_bracket, pen_circle, pen_squiggle, pen_strike`, and `pen_working`
    ("working on it.")
  - `seal_gold`, `stain_ring` (a coffee ring)
  - stamps: `stamp_faster` (green), `stamp_cheaper` (red), `stamp_progress` (blue), `stamp_bestpaper` (gold)

  The stamp colours match the logo's three rings, so they can double as track colours.
- **Textures** (`scene/tex/`): CC0 from ambientCG (`LICENSE.txt`): Paper001 (fine paper, colour + normal), Paper003
  (creased paper, normal), Wood026 (walnut: colour, normal, roughness).
- **Photos** (`kit/assets/photos/`): six real group photos (Christmas, CNY 2026, Fire Spot 4.1, Hezi's defense, the
  0725 party, Thanksgiving), `team.jpg`, and the X banner (`social/x/media/banner.jpg`, 1500x500, a real outdoor
  group photo). The four halftone CEO press photos (`press_*.png`) belong to the launch film's opening. Reuse them only
  with their credits, and only for verbatim quotes.
- **Papers**: 136 first pages (`kit/assets/pages/`, `social/x/pages/`, `pubs.json`). About 60 are real scans; the
  rest are typeset placeholders, which must stay out of close-ups. They give a "receipts" visual for any episode that
  cites the lab's own papers.

### 1.3 Code we can reuse (the launch film's scene, `.claude/films/xlaunch/scene/`)

| Module | What it is |
| --- | --- |
| `studio.js` | The approved v7 studio: curved, fibre-bumped papers, area lights, a glossy reflecting floor, a cyclorama, bokeh, bloom, motion blur on whip pans, grade and grain. |
| `sprite.js` | Painted cut-outs as relit relief billboards with cast and contact shadows. |
| `props.js` | Newsprint clipping with halftone photo; receipt ribbon; sticky notes; decals; a typeset title page ("Paper #137" with byline); the 3D lab logo. |
| `gear.js` | A modelled 3D GPU card, and an instanced datacenter hall (440 racks, LED blink per instance, data packets on fibre trays). |
| `lib.js` | `camPath`: one spline per shot, no stop-and-go. |
| `type.js` and the `typeLayer10` 2D layer in `film10.html` | The 2D vocabulary: punch words, ink bursts, shock rings, halftone dot wipes, print misregistration, split-flap chapter tiles, rewind ruler, red-pen lines, god rays, flare, gold dust, motes, glints, edge grades (instead of dark boxes). |
| `tools/` | `key.py` (green key), `depth.py` (relief maps), `gen_art.py` (Codex art with the style paragraph), `halftone.py`, `overlap.py` (desk interpenetration check), `sheet.py` (contact sheets). |
| `kit/` | A local Mac GPU renderer (`get.sh` → `~/PicassoFilmKit`), Final 1080x1350 at 16 Mbps. It vendors three.js, p5 and p5.brush, **not q5**. The anime transition films use q5.js for their effect layer (`picasso-anime-transition-film` skill). |

Also reusable from the Yufei short (`.claude/films/yufei/anime/film/film18.html`): a three.js lab desk in front of a
sunset window, and a **3D quantum chip** with qubits and couplers. Lighting and camera notes are in its README. This
is a ready set for quantum episodes.

### 1.4 The other film looks

- **3D comic** (projects page; `projects/<id>/<id>_loop.mp4`, 960x528, 27.5–30 s, 24 fps; `sheet_projects.jpg`):
  - The look: cream paper, ink outlines with wobble, halftone, offset-print colour, cel lighting, hand-lettered SFX
    (ZAP!) made from brush strokes, and a comic camera with whips and smear.
  - One accent per project: Qubrio purple, TritonGym green, TritonDFT blue, ChipMATE orange.
  - Cast-as-concepts: toy train, magnifier, owl, snail, a paper city.
  - The NPR toolkit lives on branch `video-kit` (`pipeline/runtime/npr`); a copy is in `.claude/films/yufei/npr/`.
- **Anime chibi 2D** (`.claude/films/yufei/anime/art/`): the first Yufei design. The user called the 8 s short made with
  it "太短了，风格太粗糙", and it was replaced by the 3D design. It is not a series candidate.
- **Hot-pot short** (`.claude/films/hotpot/`, "Neural Hotpot Temperature Scaling"):
  - Four invented students (LEO, MIA, KAI, ZOE).
  - Key frames from ChatGPT, animated as AI video (Google Vids), with bilingual burned-in captions in Noto Sans SC.
  - The user's verdict was "这个AI短剧做的有很多瑕疵". **Retire this cast and this method.**
  - Keep the *joke format*: a fake paper title and an end card ("accepted, with sesame sauce").

### 1.5 Identity elements already in public use

- **Logo** (`home/static/PicassoLab-Logo.png`, 1168x815): three rings linked by grey bars, and a decorative
  blackletter-style "PICASSO" wordmark with a drop shadow (I could not identify the typeface).

  | Ring | Holds | Colour in the PNG | Colour in the film (`RING_COL`) | The film uses it for |
  | --- | --- | --- | --- | --- |
  | Blue | Physics (atom) | about #2581BA | #3f8cff | Quantum computing (27 publications) |
  | Green | Computer Science (monitor) | about #90CE5F | #63d36f | Machine learning systems (61) |
  | Red | Math (∫, π, ∞, e) | about #CC0505 | #ff4d4d | Architecture & compilers (48) |

  The film's assignments come from `data.json`. The kit has the logo split into parts
  (`logo_cs/math/phys/word*.png`). The v9 complaint about "three plain rings for the logo" means the real artwork
  must be used.
- **Header system (v10):** "Picasso Lab" in Instrument Serif italic at the top left; a split-flap chapter tile with a
  mono label at the top right ("0 1 the bill"). See `v10_type.jpg`.
- **Running motifs:**
  - "*compute not included" → "*milk tea included" (the bookend asterisk joke)
  - milk tea as the lab's currency
  - the desk lamp ("compute budget: 1 lamp")
  - THE BILL with its rows and "TBD"
  - "2016: 0 papers. 1 cat nap."
  - Paper #137 with "first author wanted"
  - hot pot (in the suggested X bio: "Lab life: lots of hot pot.")
- **Member personas**: each member's approved Team-page avatar effect (`people/fx/*.js` headers):

  | Member | Gag |
  | --- | --- |
  | Chang | 高考状元 + Infinity Gauntlet |
  | Haotian | 叶神 = Thor |
  | Jixuan | 国画 / calligraphy |
  | Keyi | 电竞天才, esports MVP |
  | Ohm | AMMA chiplets |
  | Parikshit | 3 AM summit push |
  | Rishabh | warp specialization |
  | Xiang | concert |
  | Xinwei | 厨神 / MasterChef |
  | Yichen | card magician |
  | Yue | home run, 熱血 manga |
  | Zaifeng, Zhongkai | 院士 |
  | Zhengding | sunshine five-star general |
  | Zhuo | CPhO gold |
  | Yufei | San Diego sunset, palm, her white cat |

  These are the members' running gags, and the members have already approved them.
- **Fonts in the films** (vendored in `kit/assets/pv/fonts/`, declared in `film10.html`): Inter, Instrument Serif,
  JetBrains Mono, Fraunces, Caveat, Newsreader, Permanent Marker. The comic films use no fonts: their lettering is
  stroke skeletons and brush strokes. The hot-pot edit used Noto Sans SC Bold and Medium.

### 1.6 Gaps the series must fill

1. **A 9:16 set.** Every launch-film shot was framed for 1080x1350. Natively, 1080x1920 needs taller sets: the wall
   and lamp shade above the desk, more floor below. In my mock, the 4:5 frame leaves dead space above the desk.
2. **Teaching poses** for Yufei (see 1.1) and the cat (asking, confused, taking notes, asleep on a keyboard, pointing a
   paw).
3. **A second pose** for each member who guests in an episode (explaining, holding the episode's object).
4. **Art for Ohm, Yanju, Yilin and Zihan**, if they are current members **(unverified)**.
5. **Explainer props:** token tiles, a KV-cache filing drawer, a pipeline conveyor, a GPU SM floor plan. Hard-surface
   objects should be real 3D (the skill says GPUs and racks "are better as real 3D"). Soft and character objects are
   painted.
6. **q5.js** is not vendored in the film kit (only p5 and p5.brush). The user names q5.js, so the 2D layer should move
   to q5, or at least add it.

---

## 2. Taste history

### 2.1 Verbatim quotes

Every quote I could find, quoted exactly as written in the source.

| # | Context | Quote | Source |
| --- | --- | --- | --- |
| 1 | v1 photo reel + AI short | “这个AI短剧做的有很多瑕疵……现在你所谓的这个4:5视频做的太垃圾了，还不如用three.js+q5.js逐帧做出来的漫画视频” | VERSIONS.md |
| 2 | v2 Best Paper comic | “？我要的是介绍Picassolab的首支post，不是介绍best paper” | VERSIONS.md |
| 3 | v3 comic-panel intro | “感觉还是太粗糙了……不够独特不够惊艳不够新奇也不够幽默诙谐，很平庸啊” / “做的不像是一个Lab的东西，和学术毫无关系啊” | VERSIONS.md |
| 4 | v4 paper wall 25 s | “做的有些粗糙……动画不够美观，整体太短了太干巴，不过大体方向是很好的，按照这个继续往下走吧” | VERSIONS.md |
| 5 | v5 paper wall 43 s | “还是有点粗糙……我想要那种手机发布会的概念机视频转场的那种惊奇感和酷感和丝滑感……参考‘何同学’” | VERSIONS.md |
| 6 | v6 keynote 3D | “做的还是太粗糙了，真的用了three.js了吗？一看就设计代码量不够啊” | VERSIONS.md |
| 7 | v7 style frames | “可以可以，就要这个质感” | VERSIONS.md |
| 8 | project films, round 1 | "我总感觉做的还是不够惊艳，没有I'm Upping My P(doom)带给我的那种惊艳感觉" | kvflow video-kit README §2 |
| 9 | project films, round 1 | "现在做的还是html味道太浓了，AI味道太浓了，并且three.js用的少了或者用的不精" | kvflow README §2 |
| 10 | Qubrio concepts, round 2 | "风格上我更喜欢漫画三维，但是这个展示的内容太混乱了，和这个project有关系吗？不如水彩绘本展示的有信息量和准确" | kvflow README §2 |
| 11 | Qubrio, round 2 | "故事可以做的更好一些，15s讲不完的话30s讲" | kvflow README §2 |
| 12 | project set approved | "可以可以", then "记得push" | picasso-comic-demo-film skill |
| 13 | Yufei avatar short | "人物不能只是背景板" (real photo panels); "太垃圾" (chibi from code primitives); "太短了，风格太粗糙" (8 s 2D painted) | yufei/anime/README.md |
| 14 | page transitions | "转的不丝滑有卡顿和闪烁突变"; "开屏动画时间都别太长" | anime-transition skill |
| 15 | footer | "一团糟" (phones); "没有星云那种感觉" (procedural nebula); "AI 味太重" (procedural laser-dot maps) | footer-globe skill |
| 16 | this request | “这类教学视频即使有录屏，我们也要用q5.js+three.js等技术重做成网页再截帧拼成视频，就像我们X上的那些视频一样” and “所有视频默认竖屏” | the user's request |

Other notes, which are paraphrases and not quotes:

- **kvflow README §2:** all four project films in 3D comic; sci-fi is welcome, "but the base stays 3D comic".
- **Anime-transition skill:** the user likes "热血写实日漫风".
- **STORYBOARD_v10.md**, on why v9 was judged rough: an HTML-looking opening, a cat that popped in and clipped through
  things, generic fonts, sticker-like characters, a slow pace, and an unfinished ending (template paper, "(not you,
  cat)", three plain rings for the logo). The round notes record changes, not the user's words.
- **picasso-x-launch-film skill:** a sticky note passed through a clipping and "the user caught it twice".
- **The same skill:** the user agreed that more content may make the film longer.
- **PROMPTS.md:** round-1 member art "came back photorealistic", which "clashes with the Pixar-style Yufei".
- **STORYBOARD_v9.md:** the client asked for a 2-seconds-per-member roll call.
- **v10 round 2:** "Everyone pictured".
- **CLAUDE.md:** "合格" is judged by screenshots at desktop and phone sizes. "If something looks rough, generic or
  'AI-ish', rethink it rather than tweak it." Art drawn with code primitives was "rejected every time".

### 2.2 Taste rules (each traced to the quotes above)

1. **Rendered in code, frame by frame, as a real 3D scene.** Never a photo slideshow with captions, never AI-video
   animation, never a lecture screen recording (1, 3, 16). The user's question "真的用了three.js了吗" (6) means the
   craft must be visible: lit materials, depth of field, real geometry, not interpolated flat cards.
2. **Lock the look on stills before animating.** v7 was the only round that passed first time (7). For a new series:
   four style frames at 9:16, at phone size, before any timeline.
3. **Substance first.** It must look like it comes from a lab (3). The lab's real work is the hero (4). Each shot maps
   to a real concept, and nothing is chaotic or unrelated (10). Facts are exact. The point is the teaching, not the
   lab's trophies (2).
4. **Distinctive, stunning, new and funny all at once** (3, 8). Average is a failure ("很平庸"). The charm bar is
   *I'm Upping My P(doom)*: every shot is an event, someone reacts, and metaphors become physical props
   (`reference/pdoom/NOTES.md`).
5. **Smooth like a phone launch, with 何同学-style transitions** (5, 14). Match cuts, each transition with a physical
   cause, one motivated camera move per shot, no stutter and no flash glitches.
6. **No HTML or AI flavour** (9, 15). No UI panels, dashboards, default charts, centred letter-spaced titles, borders,
   generic glow, or procedural fake textures.
7. **Characters are painted, never built from code primitives** (13). They come in one consistent style, never mixed
   with photoreal (PROMPTS round 1). They must be protagonists, not backdrops (13). They must sit in the scene's light,
   not look like stickers. They must stay physically logical: no clipping through objects, no popping in (v10 notes).
8. **Real assets over procedural ones**: real paper, wood, ink scans, photos (15, CLAUDE.md). Hard-surface objects as
   real 3D; soft and character art painted.
9. **Pace.** Not too short or dry (4, 13), but v9's slow 110 s became a 65 s fast cut. The story sets the length
   ("15s讲不完的话30s讲", 11). Intros and stingers stay short (14).
10. **Typography with a voice.** Generic fonts were a reason v9 failed. v10's "warm nerds" set survived.
11. **Phone first.** Judged on screenshots at phone size (15, CLAUDE.md). Every round gets a contact sheet in Chinese,
    with a note of what was not verified.
12. **Real people.** Only verbatim, sourced quotes. Credited CC-licensed photos. No jokes about a person. Members
    appear kind and flattering, get names only, and are never the afterthought of a joke. Everyone gets pictured.
13. **The lab's real logo artwork**, never an abstraction of it.

---

## 3. Proposed series identity

### 3.1 Names

**Main line (LLM, systems and quantum explainers built from CSE 291 "LLM System Optimization"):**

| EN | ZH | Idea | For | Against |
| --- | --- | --- | --- | --- |
| **Compute Not Included** (recommended) | **《算力另计》** | Continues the launch film. Every episode is one line on AI's bill: GPU TIME, MEMORY + CHIPS, DATA MOVEMENT, THE NEXT COMPUTER (TBD = quantum). The episode title prints as a receipt row. | Brand continuity with the posted film. An episode device built in. The receipt, printer, stamp and red-pen assets all exist. 另计 is the exact wording on a Chinese receipt, so the pun works in both languages. A season-long running TOTAL. | It does not say "teaching" at first glance, so the cover title must carry the question. No web clash found for 算力另计 (Douyin in-app search **unverified**). |
| Explain It to the Cat | 《讲给猫听》 | The professor explains to the cat; if the cat gets it, so will you. | Says "accessible" at once; built on our strongest character. | Reads childish for the systems audience on X; derivative of "explain like I'm five". Better as the **tagline** of the main line ("Explained to a cat. / 讲给猫听。"). |
| The Engine Room | 《机房夜话》 | The launch film's chapter "The engine room."; in Chinese 机房 is both engine room and server room, and 夜话 suggests late-night talks under the lamp. | Warm and humanist (何同学's register). | The English name is common (many podcasts, **unverified**). Less of a joke engine. |
| One Lamp | 《一盏台灯》 | "compute budget: 1 lamp" | Poetic. | Says nothing about the content. |

**Side line (iPhone vlog "tutorials": 甄姬刷野, scooter riding, a $5 / 24 h San Diego survival challenge):**

| EN | ZH | Idea | Notes |
| --- | --- | --- | --- |
| **Not on the Exam** (recommended) | **《这题不考》** | A CS lab teaching things no exam will ever test; each episode ends on "this will not be on the exam". | Teacher's voice plus a talk-show tag line. No clash found on the web. Pairs with the main line's course-syllabus framing. |
| Off-Syllabus | 《超纲了》 | Beyond the syllabus. | Short and energetic. "Off Syllabus" is already a podcast (Apple Podcasts) and "Out of Syllabus" is a YouTube channel, so use it in Chinese only, or as "Off-Syllabus with Picasso Lab". |
| Milk Tea Included | 《奶茶附赠》 | The launch film's closing joke ("*milk tea included"). | The best pairing with "Compute Not Included", but it could read as a food channel. Better as the **end-card tag** of the side line. |
| Reviewer 2 Approved | 《二审通过》 | The academic "Reviewer 2" meme; the cat is Reviewer 2. | An insider joke; good as a running gag, too niche as a title. |

**Umbrella.** On X the account stays @PicassoLabUCSD. On Douyin a display name such as "Picasso Lab｜毕加索实验室" is
an option; the repo has no Chinese name for the lab **(to confirm with the user)**.

### 3.2 Recurring cast and roles

| Character | Role | What they do in every episode |
| --- | --- | --- |
| **Prof. Yufei Ding** | **The Professor** | Calm, warm and precise: "the calm genius" (avatar storyboard). She delivers the one key sentence of each episode and owns the red pen. Her lines are approved by her; no invented quotes are attributed to her. |
| **The cat** (white, fluffy, red painter's beret) | **The audience stand-in and class clown** (P(doom)'s "Researcher": its face tells you how to feel) | Asks the "dumb" question on a sticky note. Physically misuses the metaphor prop: bats the token tiles, sleeps in the KV-cache drawer. **Falls asleep when an explanation runs long**, which is a self-mocking pacing alarm. Stamps the episode's verdict at the end. Never talks: only red pen, sticky notes and real meows. Name options below. |
| **Lab members** | **Guest expert of the episode** (the "TA of the day") | Chosen by their research: Zhongkai Yu gave the course's MoE lecture (L14); Rishabh does warp specialization; Zaifeng was the launch film's featured systems/compilers member; Xiang holds the quantum chip; Zhuo works on quantum computing systems. Each brings the gag from their own Team-page effect (1.5). Names only; nobody is the butt of a joke. Consent needed for new poses. |
| **Noise gremlins** | **The villain** | Whatever slows things down: noise, stragglers, memory stalls. They give each episode the "tiny conflict + payoff" structure the comic films proved works. |
| **THE BILL** (receipt) and the printer | **The table of contents** | Prints the episode's line item at the top. The season's TOTAL is the finale. |
| **Milk tea** | **The currency** | The reward and the end tag. |

**Cat name options.** All need the user's choice.

- **Picatso**: already coined in the repo as the title of Yufei's avatar short. It is a pun on Picasso + cat.
- **毕加猫** in Chinese, from 毕加索. There is no web clash beyond pages about Picasso and cats; uniqueness on Douyin is
  **(unverified)**.
- **索索**: a short pet name.

**Side line.** The painted cat composited into iPhone footage risks the "sticker-like" complaint. Two options:

- The cat shows up only as its red-pen notes over the footage.
- A **real white plush cat with a red beret** becomes the on-location mascot. This is a real asset, it costs little,
  and it is a running gag that links both lines. It is a suggestion; the user decides.

Member personas suggest natural hosts, subject to consent:

| Episode idea | Host | Why |
| --- | --- | --- |
| 甄姬 jungling | Keyi | esports MVP |
| $5 / 24 h survival | Xinwei | MasterChef |
| A 掼蛋 tutorial | Yichen | card master; the lab already runs a Guandan web game |
| Outdoor or summit episodes | Parikshit | 3 AM summit |

### 3.3 Narrator options

The facts that shape this choice:

- X autoplays muted. `social/x/kit.html` already says "视频是静音自动播放的，所以画面里的大字已经把故事讲清楚了".
- 何同学 writes, shoots and edits everything himself and narrates his own scripts (secondary sources: cbndata,
  jiemian).
- 毕导 explains in a joking voice with animated models; a study found 23.8% of his titles are questions
  (kepuchina.cn).
- All three reference creators are **self-voiced hosts**: their voice is the brand.
- China's 《人工智能生成合成内容标识办法》 has been in force since 2025-09-01. It requires labels on AI-generated text,
  images, **audio** and video.
- Douyin asks creators to declare "内容由AI生成"; unlabelled AI content may be demoted.

| Option | For | Against |
| --- | --- | --- |
| **A. A lab member as host VO**, recorded separately in EN (for X) and ZH (for Douyin), possibly two members | Authentic and warm. Comic timing (talk-show delivery needs a human voice). Matches the reference creators. Cheap to record. Turns a member into the face of the series. | Recording quality and consistency. Bilingual delivery may need two voices. Takes time per episode. One person carries the series. |
| **B. Prof. Ding herself** | The most authority and authenticity ("the professor teaches her own course"). Real course material in her voice. | Her time. Self-deprecating comedy may sit awkwardly on the PI. The lecture recordings are classroom audio: quality **(unverified)**, unscripted, and they may contain student voices (consent). Best as **short "原声" moments**: one or two lines per episode, recorded on purpose or cut from a lecture with permission. |
| **C. A synthetic or cloned voice** | Fast. Consistent. Both languages from one script. Re-cuts are free. | Clashes head-on with "AI味" (1, 9, 15). A legal label is required on Douyin and under Chinese rules. Cloning a real person needs explicit consent. Hurts trust in a 科普 channel. **Only acceptable diegetically**, as the voice of an on-screen "AI model" character, labelled. |
| **D. No VO, on-screen text** (the launch film) | Proven and approved. Works muted. Localization is just a re-render of the text layer. | Reading speed caps depth: v9 carried about 331 words in 110 s. Douyin 科普 is voice-led. Talk-show comedy loses its delivery. Fine for teaser cuts and the first pilot. |

**Recommendation: A + B.**

- A lab member hosts the voice in each language.
- Prof. Ding gives one or two lines per episode.
- The cat stays silent and speaks through red pen.
- Visuals and burned-in text still carry the story muted.
- Option D serves for 15–30 s teaser cuts.
- Open point: the request says the Douyin version is "中文字幕版". That could mean English VO with Chinese subtitles,
  or Chinese VO. Ask the user. A Chinese VO probably helps Douyin retention **(unverified)**, and in a Chinese-speaking
  lab it costs little.

### 3.4 Visual language for vertical main-line episodes

**Option 1: continue the studio look.**

- For:
  - Approved (7) and already on X.
  - The whole cast is painted in its Pixar-style 3D.
  - Built from real materials (CC0 paper and walnut, ink scans, stamps).
  - It has the "发布会" depth and light the user asked for in v5.
  - The joke engine of receipts, stamps and sticky notes is part of the set.
- Against:
  - Dark sets need care for contrast at thumbnail size.
  - Abstract mechanisms (attention, pipeline bubbles, quantization) are the danger zone where a diagram turns into
    "HTML味".

**Option 2: the 3D comic look of the project films.**

- For:
  - The user preferred it for explaining projects (10).
  - Cast-as-concepts is a superb teaching device.
  - Bright, and reads small.
- Against:
  - It is the Projects-card identity: landscape loops without text.
  - Its original concept characters don't match the painted Pixar cast. Putting inked toon objects next to soft-lit
    painted people would look like two films.
  - The user's comic-based lab intro failed as "不像是一个Lab的东西" (3), though for its slideshow form more than its
    look.

**Option 3: a mix in the same frame.** Two character and rendering languages per shot risks the incoherence the user
punishes ("太混乱").

**Recommendation: studio as the base, with the comic films' ideas but not their rendering.**

- **The set:** the night desk (walnut, banker's lamp, rack, printer, milk tea, the cat), rebuilt taller for 9:16. Add
  one **day variant** (warm window light) for variety and for crossover with the side line.
- **The explanation surface is paper on the desk**, seen top-down or at 45°. Tokens are printed tiles, the KV cache is
  a real drawer of index cards, pipeline stages are paper trays on a conveyor, quantization is coins rounded on a
  ruler. Red pen, stamps and sticky notes annotate in the world.
  - This is "metaphors become physical props" (P(doom)) done in the approved materials.
  - It keeps the diagram a physical object, not a UI panel.
- **"Inside the machine"** cuts go to real 3D hardware lit in the same studio way: v10's push through the mini rack's
  glass door into the datacenter hall (`gear.js`), the 3D GPU card, the quantum chip from the Yufei short.
- **Conflict as characters:** gremlins for noise and slowdowns, a snail-like slow baseline. These are the comic films'
  cast-as-concepts, but painted in the studio's style.
- **Track colour** from the logo rings: green = LLM and ML systems (most of the course), red =
  architecture/hardware, blue = quantum. It shows on the split-flap chapter tile, the stamp and the cover underline.
- **Camera language from v10:** one motivated `camPath` move per shot, cuts on a 2 s bar, no shake, halftone dot
  wipes or physical match cuts on big transitions.
- **Comic films only as diegetic objects.** When an episode mentions Qubrio, TritonGym, TritonDFT or ChipMATE, their
  existing comic film plays on a phone or monitor on the desk, or as a printed comic page that the camera pushes into.
- **Side line:** real iPhone footage plus the same 2D brand layer: Caveat or real red pen, sticky notes, stamps,
  JetBrains Mono receipt rows. Render it as transparent overlay films with the existing overlay pattern (Events
  splashes, anime-transition skill). The brand glue across both lines is the *paper-and-ink layer*, not the 3D set.

### 3.5 Vertical framing

Use one safe-zone template for both platforms. The sibling report `research/platforms.md` §3 defines it:

- **Keep clear:** top 0–260, bottom 1480–1920, and the right rail x 880–1080 for y 700–1480.
- **Title zone:** y 260–560.
- **Hero zone:** x 60–880, y 560–1180.
- **Caption zone:** x 120–880, y 1200–1440.

These numbers are third-party or scaled from official geometry, so calibrate them once with a grid test post.

My mock (`cover_mock_zh_safezones.jpg`) showed that a sticky note placed naturally on the right side of the desk falls
under Douyin's button rail. The rule: in-world text props go left of x 880.

### 3.6 Intro and outro stingers

**Main line.**

- **Cold open first.** The first 3–6 s is the hook: the question, or the cat causing the problem. Frame 0 is a composed
  still life; it is the X thumbnail (a skill lesson).
- **Title stinger (≤ 1.5 s).**
  - A real lamp-switch *click* lights the desk.
  - The thermal printer chatters out one receipt row, which is the episode title: `No.07  KV CACHE ........ see receipt`
    / `第07项  KV缓存 ………… 另计`.
  - A red-pen tick lands on the row.
  - It lives in the title zone, in the track colour.
- **Outro (≤ 4 s).**
  - The cat stamps the row with the verdict: FASTER / CHEAPER / IN PROGRESS, or an episode stamp such as EXPLAINED /
    讲完了. The stamp art style already exists.
  - The receipt rolls on by one more row: the **next item**, the serial hook.
  - Small print "*compute not included" / "*算力另计", the handle, and the real 3D logo for the last beat.
  - End on a frame that loops cleanly into frame 0 (X loops).
- **Sonic logo.** Three real foley sounds, recorded once on an iPhone: lamp click, printer chatter, stamp thunk.
  Optional: a real meow. No synthetic jingle.

**Side line.**

- **Intro:** a real red rubber stamp slams **「这题不考」 / NOT ON THE EXAM** onto paper, shot in iPhone macro, about
  0.8 s. Then a parody syllabus card: "CSE 0: Zhen Ji Jungling · 0 units · Instructor: Keyi". It is set like the real
  CSE 291 slide header, which links the side line to the main line.
- **Outro:** the plush cat, or a sticky note, gives the verdict "ACCEPTED (with milk tea) / 录用（附奶茶）", then a
  "*milk tea included" tag.

### 3.7 Cover template (1080x1920; mocks in `cover_mock_*.jpg`)

**Layout, top to bottom:**

1. Small series wordmark: Instrument Serif italic / Noto Serif SC, muted.
2. The receipt row in mono: `No.01 DECODING ....... 1 token at a time`.
3. A **question title** of two lines at most. Use 96–112 px for English. Chinese should be about 13 characters or
   fewer per line at about 100 px.
4. A red-pen underline (a real ink scan in production) under the key word.
5. The hero: the cat, or the episode's prop, lit on the desk.
6. One sticky note with the cat's joke, left of x 880.

**Rules:**

- The title stays inside the 3:4 grid crop (y 240–1680) and the title band.
- The track colour appears only on the underline or stamp.
- Same positions every episode, so the profile grid reads as a set.

**What the mock showed:**

- The white cat on the dark desk carries at thumbnail size.
- Noto Serif SC is visibly heavier than Instrument Serif at the same size, so use Bold, not Black.
- The 4:5 source leaves an empty band above the set. Native 9:16 sets need their own wall and lamp above the desk.

The mock reuses a v10 frame. It is a layout study, not proposed final art.

### 3.8 Typography

| Role | EN (keep v10's approved set) | ZH | Notes |
| --- | --- | --- | --- |
| Statements, titles, series wordmark | Instrument Serif, roman + italic | **Noto Serif SC** (思源宋体) Bold | Both are high-contrast serifs. Avoid Inter as display (the v9 "generic fonts" complaint). |
| Remarks in red pen, sticky notes | Caveat (red) | **Real handwriting scans** by a member, a few words per episode. Fallbacks: **Long Cang** (龙藏体, casual pen) or **LXGW WenKai** (霞鹜文楷, calmer) | Real ink fits rule 8. Jixuan's calligraphy persona could letter side-line titles. Avoid ZCOOL KuaiLe (too cute, templated). |
| Data, receipt rows, labels, chapter tile | JetBrains Mono | JetBrains Mono for digits + Noto Sans SC; or **Sarasa Mono SC** (更纱黑体), where CJK is exactly 2 Latin widths, so receipt leaders line up | Sarasa's license is OFL **(unverified)**. |
| Burned-in subtitles | Instrument Serif is too thin for subtitles; use **Inter SemiBold** or Newsreader Medium (no long lines) | **Noto Sans SC** Medium/Bold, white with a soft dark edge grade (v10 rule: edge grades, never dark boxes) | Option: **抖音美好体** (Douyin Sans), by Douyin and Founder, OFL per several font sites. It feels native but rounder and more templated. |
| Newsprint, paper titles | Newsreader / Fraunces | Noto Serif SC | Only for clippings and title pages. |

- **Sizes on the 1080 width**, from v9's checked scale (to retest at 9:16 on a phone):
  - titles 96–112 px; statements 72–84 px; remarks 46–56 px
  - subtitles: EN 48–54 px; ZH 52–58 px, at most about 12–16 characters per line
  - mono labels 32–36 px; nothing under 30 px
- **All text is set inside the scene** from a string table (`?lang=en|zh`). Sticky notes, red-pen remarks, receipt
  rows and stamps are localized *in the world*, so the Chinese cut is a second render, not subtitles pasted over
  English props.
- I verified on 2026-10-04 that Google Fonts serves Instrument Serif, Caveat, Noto Serif SC, Noto Sans SC, Long Cang,
  LXGW WenKai TC, ZCOOL KuaiLe, ZCOOL XiaoWei, Ma Shan Zheng and Zhi Mang Xing (CSS endpoint returns 200). Google
  hosts LXGW WenKai only as the TC build; the Simplified-Chinese build comes from its GitHub release **(unverified)**.

### 3.9 Colour

| Element | Value |
| --- | --- |
| Set | near-black #0b0b0e (the film's background), warm lamp amber, walnut |
| Paper | cream |
| Red pen | about #d62828 (my estimate) |
| Sticky note | yellow |
| Gold | #ffc547, for honours only |
| Tracks | film ring colours #63d36f (ML systems), #ff4d4d (architecture), #3f8cff (quantum); the logo PNG's own are #90CE5F / #CC0505 / #2581BA |

On the dark set use the film values; the logo values are for print and light backgrounds. The side line keeps
real-world colour and adds only red ink and sticky yellow.

### 3.10 Comedy devices the identity already contains

| Device | Use |
| --- | --- |
| The asterisk small print | "*compute not included" becomes a per-episode footnote punchline. |
| The escalating bill | "a lot / a lot / TBD / even more" becomes the rule of three in every receipt row. |
| Callbacks | "2016: 0 papers. 1 cat nap." |
| The plot-twist reversal | v9's "No predictions down here" → "Plot twist: one prediction". |
| Fake paper titles and verdicts | "accepted, with sesame sauce", from the hot-pot short. |
| Member personas as running gags | See 1.5. |

The launch film's tone rules carry over: jokes land on bills, receipts, naps and milk tea, or on the lab itself, and
never on a person.

---

## 4. Open questions for the user

1. Douyin: English VO with Chinese subtitles (as worded), or a Chinese VO?
2. Who hosts the voice? Will Prof. Ding record a line or two per episode, and may lecture audio be used?
3. Series names: approve or pick from 3.1. The cat's name: Picatso / 毕加猫 / other. A Chinese name for the lab on
   Douyin?
4. Member consent for new poses and side-line hosting. Are Ohm, Yanju, Yilin and Zihan still in the lab (they have no
   paintings)?
5. A real plush cat with a beret and a real 「这题不考」 rubber stamp as physical brand props: yes or no?

## Sources

- Repo (read-only):
  - `social/x/versions/VERSIONS.md`, `social/x/kit.html`
  - `.claude/films/xlaunch/{README,STORYBOARD_v9,STORYBOARD_v10,PROMPTS,POST_v10}.md`, `scene/`, `kit/`,
    `scene/tex/LICENSE.txt`, `kit/assets/data.json`
  - `.claude/films/yufei/{STORYBOARD,PROGRESS}.md`, `anime/README.md`, `anime/style.txt`
  - `.claude/films/hotpot/STORYBOARD.md`
  - `.claude/skills/*/SKILL.md`
  - `people/fx/*.js` headers
  - `home/static/PicassoLab-Logo.png`
  - `/Users/yil384/claude-work/picasso/papers/kvflow/video-kit/README.md` and `reference/pdoom/NOTES.md`
  - course text `.claude/films/edu/course/L01–L14.txt`
- Web (fetched 2026-10-04):
  - AI content labelling rules: [news.cn](https://www.news.cn/politics/20250314/b7a24028f2924b7681e6ed1bfbd8fade/c.html), [cctv.com](https://news.cctv.com/2025/09/01/ARTI3ZlXK7MyM39Pm3PuZ5Hm250901.shtml)
  - Douyin AI declaration: [ithome.com](https://www.ithome.com/0/879/586.htm), [sina](https://k.sina.com.cn/article_7879849516_1d5acf62c06801lo3m.html?from=tech)
  - Douyin Sans license: [maoken.com](https://www.maoken.com/freefonts/19687.html), [100font.com](https://www.100font.com/thread-587.htm)
  - X length limit: [superx.so](https://superx.so/blog/twitter-video-length-limit), [clideo](https://clideo.com/resources/twitter-video-specs); official numbers in `platforms.md`
  - Douyin safe zones (third-party): [cardcrafter.cn](https://www.cardcrafter.cn/blog/douyin-cover-size-and-design), [adsturbo.cn](https://adsturbo.cn/blog/ecommerce-video-ad-subtitle-ui-safe-zone)
  - 何同学: [cbndata](https://www.cbndata.com/information/210654), [jiemian](https://www.jiemian.com/article/3201696.html)
  - 毕导: [kepuchina.cn](https://www.kepuchina.cn/article/articleinfo?business_type=100&ar_id=456194), [zh.wikipedia](https://zh.wikipedia.org/zh-hans/%E6%AF%95%E5%95%B8%E5%A4%A9)
  - Name checks: [Off Syllabus podcast](https://podcasts.apple.com/us/podcast/off-syllabus/id1875660567), [Out of Syllabus](https://www.youtube.com/@OutofSyllabusbyAltEd); searches for "算力另计", "讲给猫听", "毕加猫", "Not on the Exam" found no series using the name.
