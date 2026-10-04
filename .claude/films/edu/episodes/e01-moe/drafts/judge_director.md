# Pilot E01 (MoE), creative director's judgment of the three competing scripts

Read in full: `script_bidao.md` (毕导 T1 loop, "256 doors"), `script_he.md` (何同学 T3, "671B parameters. 37B per
token."), `drafts/script_sketch.md` (喜人 sketch, 《6710亿在编，370亿在岗》). Measured against `research/creators.md`,
`research/comedy.md`, `research/identity.md` §2 (taste rules) and `FACTS.md`. I re-ran the bidao
arithmetic: C(256,8) = 409,663,695,276,000; C(64,8) = 4,426,165,368 (so the paper's p.2 figure is a misprint);
4.1e14 s = 12.98 M years; C(256,8)^58 has 848 digits; node-limited count = 71,614,201,382,880; 51/256 = 19.9%. All correct.

## 0. Verdict

**Winner: the sketch (《6710亿在编，370亿在岗》 / "671 Billion on the Payroll, 37 Billion on Shift").** It is the only
draft where the hook, the structure and the ending are one joke system, and every laugh is a mechanism. It needs the
何同学 draft's camera and transition discipline and the 毕导 draft's on-screen experiment (cat vs notebook) to become
the pilot. Grafts are in section 3; required fixes in section 4; the merged beat map in section 5.

| Score (1-10) | Hook | Story | Comedy | Bilingual | Visual buildability | Distinctiveness | Total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bidao 《256扇门的门道》 | 5 | 7 | 7 | 7 | 5 | 7 | **38** |
| he 《671B parameters. 37B per token.》 | 6 | 8 | 5 | 7 | 9 | 5 | **40** |
| **sketch 《6710亿在编，370亿在岗》** | **9** | 8 | **9** | **8** | 6 | **9** | **49** |

---

## 1. Script by script

### 1.1 bidao: "Bet you can't guess which eight doors" (38)

**First 3 s.** Cover "256 doors. / Guess eight." / 「256扇门 / 猜哪8扇？」, VO "Bet you can't guess which eight
doors." / 「打个赌：这八扇门，你猜不中。」. 毕导's bets work because the viewer can play in their head ("你说不出第二种
蓝色的水果"). Here nobody knows what the doors are, so there is no game and no stakes. "DeepSeek · 671B · 37B" sits in
a 34 px mono line. **X:** most tech scrollers won't stop for doors. **Douyin:** it reads as a puzzle-app ad. The
paper-hospital image is pretty, but the claim doesn't land in 3 s. Hook 5.

**Structure and pacing.** It's a faithful T1 loop, run twice: departments (wrong), MMLU language flip, dice (wrong),
why it matters, bet race, "habits", bonus, moral. The ONE idea is clean: 「不是分科，也不是掷骰子。是习惯。」 Three
problems:
- B1 dumps 671B / 37B / 256 / 8 / 58 into 11.5 s, which is where Douyin viewers swipe away.
- The course half of L14 is missing: why sparse saves compute, load balancing, expert parallelism. It never pays off
  its own subtitle, "37B per token".
- From 25 s on, the paper is the spine. That is exactly the user's v2 complaint (「我要的是……不是介绍best paper」) and
  breaks taste rule 3 ("the point is the teaching, not the lab's trophies").

**Comedy.** The best single gags of the three drafts are here, and each one is the explanation:
- "CONTROL GROUP: 1 CAT" / 「对照组：一只猫」, plus "The cat starts confident. The cat has no idea." It's a real race
  with a clock and real traces (release checklist item 4). Only this draft has one.
- The printer prints all 848 digits of C(256,8)^58 while the cat tugs the tape. The joke teaches that choices
  multiply layer by layer.
- 「牌子我们都做好了」: the self-made department signs are an honest boke.
- The COPY note 「（真医生做不到）」 turns the analogy's break into a laugh.

Weaker beats:
- The cat dozing in B6 is only a pacing gag.
- The closing moral 「挂不上专家号，别怪运气。那是规律。」 brushes against the 看病难 social topic (the draft flags this
  itself).

**Bilingual.** ZH lines that read native: 「专家号已满」, 「靠记录，不靠算命」, 「我们直接看一下」. Note that the
last one sits very close to 毕导's 「我们直接试一下子」 (creators §5.4 says don't borrow their phrases). EN problems:
- B9 is telegraphese: "Bonus: DeepSeek's pair map has bright squares. Fold it up: they're the buildings. Its own
  four-machine rule, drawn by the traffic."
- The moral, "not bad luck. A pattern.", is flat.
- 「门道」 is a ZH-only pun, kept to the title, which is correct.

**Visual buildability.** This is the heaviest build list of the three:
- Three paper hospitals (8-tower campus, Llama 4 round building, two background silhouettes)
- 57 MMLU cards × 10 flags
- A die and a handwritten formula card
- Two 16×16 grids with 51 coins each, a notebook, chrome counters and two mini printers
- A red-thread board
- A risograph pair map that pops up into the 8 towers

Three beats (B4, B7, B9) are blocked until trace data arrives. The pop-up heatmap is the single most beautiful idea
in any of the three drafts, but it is also a chart: if the print and paper craft slip, it reads as a default heatmap.
Hard to finish at the quality the user expects.

**Transitions.** Physical and lively: the ticket rolls up, a sign falls past the lens, the exam stack drops, a sign
flips off the desk edge onto a rolling die (whip pan), tape stripes match-cut to the tower windows, a coin wakes the
cat, a lifted pin pulls red thread. This is more 毕导 energy than 何同学 smoothness: there are two whip pans.

**Ending.** It calls back the bet honestly: "we can guess the doors, half the time. The other half still queue." The
cat stamps 「不随机」. The honest limit is delivered as a joke, which is the best honest-limit device in the three
drafts. The final moral is the weak part.

**平庸?** No, but a "bet + door puzzle" hook plus a paper-centred story risks 「这是介绍best paper」. Fact rigor is the
best of the three: it corrects the paper's C(256,8) misprint, separates Ob1 (downstairs predicts upstairs) from Ob2
(same expert for adjacent tokens), and plans out-of-sample replay. One error: its risk note says 1.25× appears only
in the abstract, but Fig. 17 p.13 has it. Harmless here, because the draft drops 1.25× entirely.

### 1.2 he: "671B parameters. 37B per token." (40)

**First 3 s.** VO "Six hundred seventy-one billion parameters." / 「6710亿个参数。」 over a white-card tower with 8 lit
rooms and the cat looking up. Muted viewers get the paradox from the title; listeners don't get it until 11 s
("…thirty-seven billion"). **X:** many tech viewers already know 671B, so a bare number doesn't stop them.
**Douyin:** a plain DeepSeek number, the opener of a hundred 2025 explainers. The best ZH hook line, 「喂给这位
'满血版'……只来了370亿」, arrives at 9 s, too late. Hook 6.

**Structure and pacing.** The clearest course explainer: A/B dense vs sparse, triage, then the escalation 「不是8位，
不是64位，而是256位……可每个字能挂上的，还是8个号」 (何同学's typewriter cadence, used well). After that come the fake
answer and retraction, balancing, dismantling the building into 320 GPUs, the commute, the quiet-zone time-lapse
("It isn't random."), the payoff, the coda and the callback. The paper is a twist that starts at 81 s. Story 8.

**Comedy.** About six beats, restrained on purpose. Two of them are A-tier:
- The cat sleeps in the dark half and is woken when balancing sends it a patient. The gag is the mechanism.
- 「以上门牌，纯属虚构」 / "We made those signs up."

The English cut deliberately has no English-specific jokes ("英文版不另找笑点，靠停顿"), so the X version will play
as a polished lecture. Prof. Ding's placeholder line is the best of the three drafts: "MoE saves the thinking. Not the
legwork." / 「MoE 省的是算力，省不了跑腿。」 Comedy 5.

**Bilingual.** ZH is excellent: 「满血版」, 「纯属虚构」, 「语数外」. EN is correct but plain: "Real hospitals can't.",
"booked solid". 「*挂号费另计」 / "*copay not included" is cute but doesn't teach anything.

**Visual buildability.** The best of the three:
- It builds on the existing look-dev (`hospital.js` 16×16, `tileKit`, `accum.js`, and the cover / triage / queue /
  long-exposure frames).
- New builds are few and each is a beautiful object: a paper brick that glows whole like a lantern (the dense model),
  the three-building product line-up with flip counters, brass plates that flip, the building dismantled into 320
  little card buildings, a wafer.
- A transition table lists the cause of every cut: rows of buildings match-cut to rack rows; the lamp goes off for a
  "night" long-exposure and comes back on; a grid match-cuts to a wafer. This is exactly the 何同学 / launch-film
  smoothness the user asked for (quote 5).

The one craft risk is the slide-28 printout, which is close to a "lecture slide on screen".

**Ending.** The sincere coda reads Zhongkai's slide-28 parenthetical, 'the square patterns we observed in our paper',
then the Best Paper stamp, then a callback to "which door is mine?". The coda is moving to insiders and opaque to
Douyin, and the last line has two fact problems:
- "Every word sees eight specialists" breaks trap T3 (word ≠ token; the 8 is per layer).
- "Now we can guess which eight" is the T20 overclaim. bidao's "half the time" is the honest version.

**Fact flags.**
- **The 15.3% → 76.0% bill.** These numbers come from Cai et al.'s small test model. The fact brief says to avoid
  them in the pilot, and the slide's venue is unverified. Placing them right after "DeepSeek gives every specialist a
  GPU" invites misreading.
- **1.25×.** It lacks "Qwen3-235B · 8×H100 · MoE compute only".
- **The squares.** They are shown as a found pattern, although DeepSeek's own 4-node rule causes them.

**平庸?** On craft, no: the user would likely say 「质感对了」. On wit, very possibly: 「不够幽默诙谐，很平庸」 (quote
3) is the most likely verdict on this draft.

### 1.3 sketch: 《6710亿在编，370亿在岗》 (49)

**First 3 s.** Cover 「6710亿 在编 / 370亿 在岗」 / "671B on payroll. / 37B on shift." The cat has stuck a note on the
glass door: 「剩下的呢？」 / "And the rest?" VO: "671 billion on the payroll. Per word, 37 billion on shift." … "Seeing
other patients."
- **Douyin:** 在编/在岗 is instantly funny to any Chinese viewer (编制 culture). It states the paradox and lands it as
  a joke within 2 s.
- **X:** payroll/shift is a fresh corporate frame on a known number. The cat's "And the rest?" is the viewer's own
  question.
- "Seeing other patients" quietly heads off the "37B at a time" trap (in batch serving, the other experts really are
  serving other tokens).

This is the best hook of the three, by a margin. Hook 9.

**Structure and pacing.** The spine is a 场景错位 premise with posted rules (the 《八十一难》 device that comedy.md
calls the franchise's biggest hit), escalated by real scale (三翻四抖):
1. One patient, 8 doors.
2. A crowd: the queue runs off the desk edge.
3. 「这整栋楼，只是一层。一共58层」: one tower is one layer, there are 58, then the page flips to 320 buildings.
4. The break (四抖): gridlock on the roads.

Then the reversal ("our own paper says 'random' on page one"), the payoff and the callback. The running gag 「要排队吗？」
(plant at 0:18 / escalate at 0:45 / invert at the end) binds it, with the same note, position and sound each time.

The draft covers more of L14 than any other (sparsity, weighted blend, learned specialisation, collapse, bias,
58 layers, EP320, all-to-all) and still lands the paper. The cost is density: at about 12 laughs in 128 s it sits at
the top of comedy.md's range. The reversal (B9) is described rather than demonstrated (the draft's own self-scoring
admits this). Story 8.

**Comedy.** Nearly every laugh passes all four tests:
- 「哪家医院这么看病？」 / 「就这家。问八位，不问全部，省就省在这。」: you need to see the 248 dark doors to get it.
- The tracing-paper prescriptions are a weighted sum you can see, with ink weight standing for score.
- 「117看什么科？」: the analogy's break is the joke.
- The queue falling off the desk is routing collapse, acted out.
- The cat woken by balancing (same gag as the 何同学 draft). "Done? Not quite." is the fake resolution.
- 「一人一栋？？」 / 「320块GPU。」
- 「我还是排队吧」 / "I'll take the queue." is the best teaching gag across all three drafts: it separates load
  imbalance (a door problem) from communication (a road problem) in four characters.

The ending is a quotable chiasmus written natively in each language. Comedy 9.

**Bilingual.**
- ZH: 「在编/在岗」, 「层层挂号」, 「看病不贵，路上贵」 and 「以前是病人等专家；看懂了规律，就是专家等病人」 are all
  native, and the last one is screenshot-ready 对仗.
- EN: "on the payroll / on shift", "What hospital works like this?" / "This one.", "One building EACH?", "I'll take the
  queue." and the chiasmus "Patients used to wait for the specialist. Read the patterns, and the specialist waits for
  you." are written as English, not translated.
- Weak EN line: "The checkups are fast. The commute is the bottleneck." (it explains instead of landing).
- Watch: 「搭子」 may date, and 「看病不贵」 carries a faint social echo. The draft flags both.

Bilingual 8.

**Visual buildability.** B0-B6 reuse `hospital.js` and the existing look-dev frames. New builds:
- The 58-tower avenue (low-detail instances)
- A foam-board page flip into a 320-building pop-up city
- Card shuttle buses
- A red-thread board
- Tracing-paper sheets and a ledger

Two craft risks:
1. **The cork board of seven 「院规」.** It is the closest any draft comes to a bullet list, i.e. 「HTML味/AI味」.
   Rules 2 and 5 run two lines in a 340 px board.
2. **The paper bus jam with an overturned bus.** It can look toy-cheap.

Also, the cat sleeping *on top of* a white-card tower breaks the "physically logical" rule (the model would crush).
Buildability 6.

**Transitions.** Mostly physical:
- Push through the lobby glass
- Follow a tile
- Pan along the cat's eye-line
- A crowd bursts the doors
- A red pen rolls in
- The cat's paw flips the page
- The bus departs, match-cut to a data packet
- Reverse push out through the rack door

It has no transition table and no single hero lighting change for the turn. 何同学's lamp-off / lamp-on solves that
(graft H1).

**Ending.** Best of the three. The light at door 041 comes on *before* the tile moves, which reverses B3 and is the
mechanism (pre-placement) shown in one image. Then the 「已就诊 / SEEN」 stamp on the seven rules, and No.02 TOKENS set
up by Rule 1's footnote.

**平庸?** The least likely of the three to get that verdict.

**Fact flags.**
- "Per word" in B0 VO, and 「每个词」 (T3).
- "671 GB of specialists": it is 671 GB of *weights*, and the figure is derived, not in FACTS.
- "Too big for one GPU, so … one specialist per building" is a non sequitur, and true only for decode.
- 1.25× lacks the Qwen3 / 8×H100 fine print.
- In the 320-building city, building *i* holds expert *i* of every layer. Any rope between buildings encodes a
  layer-to-layer transition (Ob1), not Ob2. Label it that way.

---

## 2. Why the sketch wins

- It is the only draft whose hook would stop both feeds, and the hook is itself the explanation (sparsity, and "the
  rest are serving other tokens").
- Its escalation is the real scale of the system, so the laugh rhythm teaches the per-layer trap (T4) more memorably
  than any explanation could: 「这整栋楼，只是一层」.
- It keeps the course first and the paper as the twist (taste rule 3), and still credits Zhongkai.
- It gives the silent cat the richest role of the three: tsukkomi through notes, the mechanism through sleep.
- Its weaknesses are fixable by grafting: thin proof in the reversal, build load, a text-heavy board, a few fact
  wordings. The 何同学 draft's weakness (wit and hook) can't be fixed by grafting without rewriting it into the sketch.

---

## 3. Graft list

### From he (何同学)
- **H1. The turn as a lighting event (B9).** The lamp clicks off; the long exposure shows the city's traffic as a
  tangle of light trails ("looks random"). The lamp clicks back on and the red threads are already strung (the
  pattern). Give the reversal a physical cause and use the existing `longexp` look-dev. Keep the sketch's threads and
  the cat batting the yarn.
- **H2. Prof. Ding's one line (placeholder), moved to B8 as the button of the 四抖.** EN "MoE saves the thinking. Not
  the legwork." / ZH 「MoE 省的是算力，省不了跑腿。」
  - Voice only, with a mono credit "— Prof. Yufei Ding"; this keeps one hero prop.
  - It replaces the weak EN line "The checkups are fast. The commute is the bottleneck." It also replaces the sketch's
    optional B10b 「混乱，只是还没人读过的数据」, whose aphorism template reads AI-ish, and which would put her line on
    the trophy beat instead of the teaching beat.
  - If she declines, the narrator reads it and the ZH cut can use 「看病不贵，路上贵」.
- **H3. Misconception first in B4.** As the cat asks 「117看什么科？」, two doors briefly carry brass plates (MATH /
  POETRY; 数学科 / 诗词科). The red pen (`pen_strike`) strikes them: EN "We made those signs up." / ZH 「以上门牌，纯属
  虚构。」 Then cut to 117's empty slot. This costs about 1 s, taken from the 118 time-lapse.
- **H4. The full transition table**, one cause per cut, written into the merged SCRIPT.md. Use his grid-to-wafer match
  cut for the 6.6× in B10, but the wafer must show the paper's simulated layouts (5×5 Dojo-like or 8×3 SoW-like
  dies), **not** a 16×16 grid; his version matches nothing in the paper.
- **H5. The cat's nap position (B5).** It curls on the desk against the dark half of the tower (his B6), never lying
  on the card model.
- **H6. The honest forecast in B11.** Most of the pre-lit doors are right; one door lights late, outside the
  forecast, taken from a real trace token.
- **H7. 「满血版」 for Douyin.** Use it in the Douyin title and in the B1 ZH VO: 「DeepSeek-V3满血版，混合专家模型，就是
  家医院。」 It's a search keyword. Drop it if it feels dated at release.
- **H8. Honesty apparatus.**
  - The red-pen asterisk "*simulated" on the 6.6× receipt.
  - A 何同学-style disclosure paragraph in both post texts (what is illustrative, what is trace-driven, where the
    numbers come from, the full author list).
  - The mechanical hand counter, a real 3D object, for "requests 0 → 24,000+" instead of a printed strip.
  - The real arXiv first-page render instead of a typeset `props.js` title page.
- **Optional, only if time allows: H9.** The dense "paper brick" that glows whole (1.5 s, in B3 behind "Asking eight,
  not 256"). It's the clearest image of what sparsity saves.

### From bidao (毕导)
- **B1. The bet race, compressed to about 7 s inside B9.** This is the reversal's proof and the only true experiment
  in the three drafts.
  - EN: "Then we placed a bet. Control group: one cat. Twenty percent. A notebook that only knows your last tower:
    fifty."
  - ZH: 「我们打了个赌。对照组：一只猫，20%。一个本子，只看你上一栋楼进了哪扇门：50%。」
  - Mechanics: the cat bats 51 brass coins onto a 16×16 grid at random, while the notebook shades its 51 cells.
  - In the sketch's world, "your last tower" is the previous layer on the avenue, so this is Ob1 (Fig. 4c, DeepSeek-V3
    50%; random 19.9%).
  - Requirements: replay real traces, held out from whatever the notebook learned from; label the checkpoint (the HF
    trace is DeepSeek-R1, trap T16); add a mono source tag.
  - Keep "The cat has no idea." if the timing allows.
- **B2. The 848-digit tape (about 3 s, at the start of B9).** On "our own paper says 'random' on page one", the printer
  prints the header "IF EVERY TOWER WERE RANDOM · ROUTES FOR 1 PATIENT" / 「假如每栋都随机 · 1位病人的路线数」 and
  then the real 848-digit C(256,8)^58. `cat_tug` hauls the tape across the desk. This makes "random" vivid before the
  turn. Never cite the paper's misprinted 4,426,165,368.
- **B3. The honest limit becomes the callback.** Change the B11 answer from "Not anymore." / 「不用了。」 to "Not for
  regulars." / 「常客不用。」, then the chiasmus. It calls back the B9 label, admits that the unpredictable half still
  queues (bidao's "half the time"), and keeps the quotable line.
- **B4. The language-flip easter egg (Ob4).** The EN cut's threads and long exposure come from English-prompt traces,
  the ZH cut's from Chinese-prompt traces, so different buildings glow. Add a mono tag: "this cut: English prompts" /
  「本版：中文题」. Put one line in both post texts. Quote "only two hot experts overlap" only if the shot uses the Llama
  4 layer-7 data it comes from.
- **B5. Fact corrections carried into the merged script.**
  - The same expert index in different layers is a different expert. Ob2 means adjacent tokens within one layer. In
    the 320-building city, a rope between buildings means layer N → N+1.
  - Use 60-90% only as "in our model". The sketch doesn't need it.
- **B6. VO counting rule.** "When over, cut words, not pauses." Recount with `vo_count.py` after the grafts.

### Director's addition
- **D1. Replace the footnote "*copay not included" / 「*挂号费另计」 with "*commute not included" / 「*路费另计」.**
  It goes on the final receipt line "No.01 MoE ........ 37B of 671B" / 「第01项 MoE ……… 671B里用37B」.
  - It teaches the thesis: 37B counts the thinking, and the road between GPUs is billed separately.
  - It rhymes with the series name in each language natively: compute → commute is a one-letter English pun;
    算力另计 → 路费另计 is a structural Chinese echo, not a translation.

---

## 4. Required fixes to the winner (before storyboard frames)

1. **Word vs token (T3).**
   - B0 VO: "Per token, 37 billion on shift." / 「每个token，370亿在岗。」
   - Rule 1: "RULE 1 · Every token is a patient.* *roughly a word. Next episode." / 「院规1 · 每个token，一位病人。
     *大约一个词，下集讲」. The next-episode hook stays.
2. **B7 logic.** Replace "Too big for one GPU, so at serving time: one specialist per building." with "When it writes
   answers, DeepSeek gives each specialist its own building." / 「写答案的时候，DeepSeek给每位专家单独一栋楼。」
   Small text: "671 GB of weights (FP8) · 80 GB per GPU". Clear it in FACTS.md as derived, or drop it.
3. **1.25×.** The receipt must carry "Qwen3-235B · 8×H100 · MoE compute only". The VO uses the fact brief's wording:
   "up to 1.25× faster expert math, using what your question already revealed" (this also lets Ob3, 「读题≈答题」,
   live in B10 instead of B9).
4. **6.6×.** "6.6× MoE throughput on average, on a simulated wafer-scale GPU" / 「模拟的晶圆级GPU上，MoE吞吐平均6.6倍」.
   Say "a Best Paper Award at ISCA 2026", never "the best paper" (T18).
5. **The cork board.**
   - Each rule ≤ 6 EN words / ≤ 10 ZH characters, ≥ 40 px at 1080 wide.
   - Rules arrive one at a time on real thermal strips; the full board is read only in the final still.
   - Trim Rule 2 to "256 specialists. You see 8.*" with the footnote "*+ the GP, always". Trim Rule 5 the same way.
   - Prove legibility on a phone-size contact sheet before animating.
6. **Craft.**
   - Card buses get a printed card texture and are instanced; at most one tipped bus as a static gag, no physics
     tumble.
   - The page flip is the one hero move of B7; simplify the street's ticket time-lapse to pay for it.
7. **Illustrative labels.** Door numbers 041 / 117 / 118 come from the trace or carry "illustrative / 示意". Don't use
   the squares at all (they come from DeepSeek's own 4-node rule; the sketch is right to skip them).

---

## 5. Merged beat map (128.5 s; X cut fits 2:15)

| Beat | Time | Content after grafts |
| --- | --- | --- |
| B0 | 0:00.0-0:07.5 | Cover 「6710亿 在编 / 370亿 在岗」; 「剩下的呢？」 / 「在看别的病人。」 (VO "per token") |
| B1 | 0:07.5-0:18.0 | Stinger ≤ 1.5 s; "a hospital, basically"; Rules 1-2 (fixed); ZH 「满血版」 (H7) |
| B2 | 0:18.0-0:21.0 | 「要排队吗？」 / 「暂时不用。」 (plant) |
| B3 | 0:21.0-0:33.0 | Ticket from the slot, 8 doors lit, tracing-paper blend; 「哪家医院这么看病？」 / 「就这家。」 (optional H9) |
| B4 | 0:33.0-0:41.0 | Fake plates struck: 「以上门牌，纯属虚构」 (H3); 117's empty slot; shortened 118 time-lapse; Rule 4 |
| B5 | 0:41.0-0:51.0 | Crowd; queue off the desk edge; 「要排队吗？？」 / 「现在要了。」; cat curls against the dark half (H5) |
| B6 | 0:51.0-1:00.5 | Ledger "−/+"; the cat is woken by a balanced patient; "Done? Not quite." |
| B7 | 1:00.5-1:11.0 | 「这整栋楼，只是一层。一共58层」; avenue, then page flip to 320 buildings; 「一人一栋？？」 / 「320块GPU」 (fixed logic) |
| B8 | 1:11.0-1:23.0 | Shuttles and gridlock; match cut to racks, back out through the rack door; "DATA MOVEMENT" "this one."; 「我还是排队吧」; Prof. Ding's line (H2) |
| B9 | 1:23.0-1:44.0 | Page one "random" plus the 848-digit tape (B2); lamp off long exposure, lamp on threads (H1); Zhongkai credited; cat vs notebook 20% / 50% (B1); EN/ZH traces differ (B4) |
| B10 | 1:44.0-1:56.5 | Quiet zone. Move specialists before the rush; 1.25× with fine print; BEST PAPER stamp; city grid match-cut to a 5×5 wafer, 6.6× simulated (H4); Zhongkai's nameplate |
| B11 | 1:56.5-2:08.5 | 「要排队吗？」 / 「常客不用。以前是病人等专家；看懂了规律，就是专家等病人。」 (B3); one door lights late (H6); SEEN stamp; 「*路费另计」 / "*commute not included" (D1); No.02 TOKENS; loop to frame 0 |

B9 is the tightest beat: about 45 EN words in roughly 17 s of VO. If the recount is over, cut the spoken flag names
first; the race and the tape stay.

---

## 6. Open items (unchanged by this judgment)

- Prof. Ding approves her line (EN and ZH) or it goes to the narrator.
- Zhongkai: consent to be pictured and named, his Chinese name, access to the trace and permission to use it, and a
  read of B4 / B9 / B10 wording. He might also voice the EN or ZH narration.
- FACTS.md must clear every number above before frames. Derived numbers (848 digits, 19.9%, 671 GB) are presented as
  our arithmetic.
- First deliverable: four 9:16 style frames at phone size, in EN and ZH, before any timeline: B0 cover, B7 page flip,
  B9 lamp-on threads, B11 pre-lit door. Taste rule 2: lock the look on stills first.
