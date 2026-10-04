# Accuracy and lab-fit verdict: pilot L14-A, three competing scripts

Judge: accuracy and lab fit. Date: 2026-10-04.

Checked against:
- `FACTS.md`
- `course/L14.txt`, plus the slide renders `course/ renders of L14 p28.png` and `p45.png`
- *Patterns behind Chaos* v5 text (`(download) pbc.txt`), cited as PBC
- DeepSeek-V3 report text (`research/ds_v3.txt`), cited as DSV3
- my own recomputation of every derived number (Python `math.comb`)

Page numbers follow the brief: for L14, the PDF page equals the slide number.

Verdict codes:
- **OK**: correct as written.
- **REWORD**: true, but needs a qualifier or different wording.
- **WRONG**: false, or contradicted by its own picture.
- **UNCLEARED**: may be true, but it is not in the fact brief and has no primary source yet.
- **UNVERIFIED**: claimed by the script but not checkable from the sources.

---

## 0. Scores

| Script | Accuracy | Clarity of the ONE idea | Honesty of the lab tie | One-line reason |
| --- | --- | --- | --- | --- |
| **bidao** | **8** | **7** | **7** | Most rigorous numbers. Its Ob4 language beat and its cat-vs-notebook bet use the paper's own data. Problems: the subtitle says "37B at a time", the payoff line misstates the 50% metric, and the "8 squares" pop-up is unverified. The spine (departments / dice / habits) gives "the cost moves into traffic" only 13 s. |
| **he** | **6** | **8** | **7** | Clearest sparse-activation teaching (the dense-vs-sparse A/B, the three buildings). It also has the most factual slips: 字/word for token throughout the ZH VO, "still gets eight" over a top-2 model, a 4-node limit drawn onto the decode layout, a borrowed small-model 76%, and a last line that overclaims. |
| **sketch** | **7** | **8** | **8** | Its ONE idea matches the brief word for word. "Seeing other patients" is the only line in the three scripts that teaches trap T2 correctly. The 1.25x is tied to the right mechanism, and it labels the trace as R1. Problems: the title "37B on shift" reads as "at a time", B7 has wrong causation and an uncleared "671 GB of specialists", and the last line ("Not anymore") overclaims. |

**Recommendation from the accuracy chair:** use sketch's spine (payroll, rules, roads, forecast). Graft in bidao's B4 language flip and B7 cat-vs-notebook bet, both after the fixes below, plus he's B1 dense-vs-sparse A/B. With the fixes below, all three can ship accurately. None should ship as written.

---

## 1. Findings that apply to all three scripts

1. **The Best Paper is verified.** Fact brief E2 confirms it through the SIGARCH ISCA 2026 trip report: one of **two** Best Paper Awards. All three scripts still cite `build.py`, and bidao marks it "待核". Update the source line. Say "won a Best Paper Award at ISCA 2026" / "获 ISCA 2026 最佳论文奖" (T18). Spoken lines without the year ("an ISCA Best Paper", "Best Paper, ISCA", "ISCA最佳论文") need the year, because the video will be watched for years.
2. **The public trace is DeepSeek-R1, not V3 (T16).** The HF card lists DeepSeek-R1 and Kimi-K2-Thinking. Sketch labels it correctly. Bidao (B1 ticket, B7 race, B8 threads, B9 map, B10 record) and he (§6.4: B3 ticket, B8 light trails, B11) do not. Any frame drawn from the trace says "DeepSeek-R1 trace (same architecture as V3)". Otherwise use the paper's figure values.
3. **The 1.25x always carries its fine print** (brief §2b): "Qwen3-235B, one 8×H100 server, MoE compute time only; +15.5% on average." He and sketch both omit Qwen3 and the 8×H100.
   - What produced the 1.25x (PBC §VI-A/C, p.12-13): **Remap** (reassign experts across GPUs) and **Dup** (copy hot experts), both guided by prefill traces.
   - **Splitting expert pairs (Insight 5) is in neither measured result.** Don't put it on screen right before the number.
4. **The 6.6x wording:** "6.6x **MoE throughput**, average of 4 models, **simulated future** wafer-scale GPU" (abstract; §I p.2). He and sketch give the qualifiers but drop "MoE throughput".
   - All three put `zhongkai_wafer` (a person holding a wafer) next to the 6.6x or the paper. Keep "simulated" in the same frame so nobody reads it as "we built one" (T22).
5. **Derived numbers I recomputed** (all correct):
   - C(256,8) = 409,663,695,276,000, about 410 trillion. PBC p.2 misprints it as 4,426,165,368, which is C(64,8); no script quotes the misprint.
   - 409.66T s / 31,557,600 s per year = 12.98 million years.
   - C(256,8)^58 has 848 digits.
   - 8-subsets of 8 groups × 32 experts that touch at most 4 groups: 71,614,201,382,880.
   - 51/256 = 19.9%.
   - 37/671 = 5.5%.
   - 671/70 = 9.6.
   - 37/70 = 0.53.
   - 58 × 256 = 14,848.
6. **PBC quotes I checked against v5:**
   - p.1: "random expert selection mechanism"; ">2000 GPU hours" (p.2).
   - Fig. 4(c): 50 / 65 / 77 / 56%, "Deepseek the weakest" (p.4). Llama 4 pairs adjacent *MoE* layers (footnote 1).
   - Ob2: diagonal in layers 17 and 43 (p.4).
   - Ob3: Spearman ≥ 0.7; top-5 prefill covers about 60% of top-5 decode (p.4-5).
   - Ob4: Fig. 8 is **Llama 4 layer 7**. "Top 10 most popular experts for each subject"; the Chinese MMLU (from MMLU Pro) has "identical questions"; "5-6 experts remain popular… only two overlap" (p.6).
   - Ob5: "20-40 times higher" (p.6). Fig. 9(a) is DeepSeek **layer 17** (label in L14 p.45).
   - Fig. 2 (p.2-3): "MoE-related data movement (MoE All-to-All and MoE Weights)… **60%-90% of total latency** under 4K sequence length", "**modeled** after various serving configurations".
7. **Placeholders.** All three mark Prof. Ding's line as a placeholder that needs her approval, with narration as the fallback. Two cases need care:
   - Bidao shows her sprite (`y_write`) writing the line in red pen. He adds an on-screen credit "— Prof. Yufei Ding".
   - If she declines, the sprite and the credit must go too, not only the audio. Otherwise the picture still attributes the line to her (T30).
   - Zhongkai has no lines in any script. All three flag that he must consent and that his Chinese name must not be guessed.
8. **Real people.** No script jokes about a real person (T28). Three lines touch social topics:
   - bidao: "挂不上专家号"
   - he: "满血版"
   - sketch: "看病不贵，路上贵"

   Each script already flags its own line and has a backup ready.

---

## 2. bidao (毕导式 "wrong intuition" loop)

### 2.1 Every factual claim

| # | Where | Claim | Verdict | Fix / source |
| --- | --- | --- | --- | --- |
| 1 | §1 subtitle | "671B parameters, 37B at a time" / "6710亿参数，每次只用370亿" | **WRONG** (T2) | "671B parameters, 37B per token" / "6710亿参数，每个token只用370亿". The cover already says "per token". The subtitle row and the file heading don't. |
| 2 | §1 X post | "DeepSeek has 256 experts per layer and calls 8 per token" | REWORD (minor) | Say "DeepSeek-V3". Fine otherwise (DSV3 §4.2). |
| 3 | Cover | "DeepSeek · 671B params · 37B per token" | OK | A1, A2. Use "DeepSeek-V3". |
| 4 | Cover / B1 | 8 towers × 32 doors per floor = 256 per layer, in 8 groups | OK | DSV3 §4.2: the routed experts sit on 64 GPUs in 8 nodes; config n_group = 8. |
| 5 | B1 | "671 billion parameters… each token wakes up just 37 billion" | OK | DSV3 abstract; L07 p.32 (not L14 p.9's 36B). |
| 6 | B1 | "On every floor, a router picks 8 experts out of 256"; on screen "+1 GP, everyone sees" | OK | A5, A10. Cite DSV3 §4.2 for the shared expert; L14 p.9 has no shared-expert column. |
| 7 | B1 | "Fifty-eight floors"; "Floors 1-3: no experts / 普通门诊" | OK | A6 (DSV3 §4.2: first three layers are dense). |
| 8 | B1 | "634B: on call" | OK | Derived (671 − 37). "On call" is the right word: in a batch, those weights serve other tokens. |
| 9 | B1 | 8 copies come back with stamps of different sizes, merged into one (weighted sum) | OK | L14 p.10; DSV3 §2.1.2 (sigmoid scores, normalized over the selected 8). No formula on screen, which is good. |
| 10 | B2 | "The router picks the best match" (presented as the myth) | OK | Brief §4 says "not 'the best'". B4 retracts it. |
| 11 | B3 | "MMLU · 57 subjects"; "4 models · 24,000+ requests · 2,000+ GPU hours" | OK | PBC p.6; abstract; p.2 (">2000 GPU hours"). |
| 12 | B4 | "Llama 4 Maverick · layer 7 · 128 doors, 1 per token" | REWORD (minor) | PBC Fig. 8 is layer 7 (OK). Add "+ shared" for consistency with B1 (B3: 1 of 128 + shared). |
| 13 | B4 | Each subject flags its 10 hottest doors; a few doors get every subject | OK | PBC p.6: "top 10 most popular experts for each subject"; "horizontal bright lines… regardless of subject". |
| 14 | B4 | "The same questions, in Chinese. Most of the busiest doors change. Two stay." | OK | PBC p.6: Chinese MMLU from MMLU Pro, "identical questions"; "5-6 experts remain popular… only two overlap". Keep the "Llama 4, layer 7" plate in frame. |
| 15 | B4 | "Whatever these doors are, they're not departments" | OK | Keeping the subject-to-subject differences visible is exactly right (brief §4, T23). |
| 16 | B5 | 256-choose-8 is about 410 trillion | OK | Recomputed. Fine as "about 410 trillion" or the brief's "more than 400 trillion". |
| 17 | B5 | One guess a second takes 13 million years; C(256,8)^58 has 848 digits | OK | Recomputed (12.98M; 848). |
| 18 | B6 | "In our model of DeepSeek-V3, moving data is 60 to 90 percent of the time" | REWORD (minor) | PBC p.2-3 counts **MoE** data movement (all-to-all + weights), modeled over three serving setups at 4K. EN: "In our model of DeepSeek-V3 serving, moving MoE data takes 60 to 90 percent of the time." ZH: "按我们论文的建模，DeepSeek-V3 推理里，MoE 搬数据占六到九成时间。" The footnote is already right. |
| 19 | B6 | Tokens travel to the experts' machines | OK | L14 pp.21-22; brief D4. |
| 20 | B7 | Each player bets 20% (51 of 256); "Cat: twenty percent" | OK | Derived: 51/256 = 19.9%, the expected random hit rate. |
| 21 | B7 | "Notebook: fifty"; Qwen3 65%, Kimi K2 56%, Llama 4 77%; "DeepSeek was the hardest of the four" | OK, needs a label | PBC Fig. 4(c), p.4. This is the paper's **in-sample** conditional-probability statistic, not a forecast test. On screen: "replay of the paper's Fig. 4(c) statistic" plus "DeepSeek-R1 trace". If you run the race out of sample and get less than 50%, show your own number (bidao's risk #8 already says this). |
| 22 | B8 | "Your door downstairs predicts the one upstairs" | REWORD | Ob1 "differs across models" and is weakest in DeepSeek. "...**hints at** the one upstairs" / "楼下进哪扇门，能**透露**楼上大概进哪扇". |
| 23 | B8 | "The next token often takes the same door" ("higher floors") | OK | PBC p.4 (layers 17, 43; not 1, 3). |
| 24 | B8 | "Some doors keep showing up in pairs"; "20-40× chance" | OK | PBC p.6. |
| 25 | B8 | "That's our lab's paper: Patterns behind Chaos, an ISCA Best Paper" / "这是我们组的论文，ISCA最佳论文。" | REWORD | E2, E3, T18. EN: "Our lab led that study, with collaborators: Patterns behind Chaos, a Best Paper Award at ISCA 2026." ZH: "这是我们组牵头的论文，获 ISCA 2026 最佳论文奖。" |
| 26 | B8 | Name card "Zhongkai Yu · lead author · taught CSE 291P Lecture 14" | OK | F1. No year of study, which is correct. |
| 27 | B9 | Copy a hot expert; split a pair | OK | Insights 4 and 5 (PBC p.6). DeepSeek's redundant experts are re-chosen about every 10 minutes (DSV3 §3.4.1; A17). |
| 28 | B9 | "DeepSeek's pair map has bright squares"; "≤ 4 machines per token: DeepSeek's own rule" | OK | PBC p.6; L14 p.28; A11. Never say "adjacent nodes" (T21). |
| 29 | B9 | "8 bright squares… fold it up: they're the buildings" | **UNVERIFIED** | Fig. 9(a) (L14 p.45, layer 17) shows square clusters inside a band between two red diagonal lines. The paper never says "8 blocks of 32", and the render doesn't show 8 separate blocks. Recompute the map from the R1 trace. If the blocks aren't 8 × 32, cut "they're the buildings". Keep "its own four-machine rule, drawn by the traffic" and L14 p.28's verbatim slide text. |
| 30 | B9 | "→ 71,614,201,382,880 (still a lot)" | OK | Recomputed. It is the count for "8 of 256, touching at most 4 of 8 groups". |
| 31 | B10 | "We can guess the doors, half the time. The other half still queue." | **WRONG** | Fig. 4(c) says a **shortlist of 1 door in 5** covers about 50% of the probability. It doesn't let you guess "the doors" half the time. See fix #2. |
| 32 | B10 | Picture: the notebook's circles hit 4 of 8 on a real trace record | OK if real | Show the 51 shaded cells, not 8 circles. |
| 33 | End | "No.02 TOKENS ........ 7 characters, 1 token" / "7个字，1个token" | **UNCLEARED** | Not in the brief, and no tokenizer is named. Measure it with a named tokenizer and add it to the No.02 fact brief, or print "No.02 TOKENS ........ next". |
| 34 | §7 risk 6 (internal) | "1.25× appears only in the abstract and the contribution list" | WRONG (internal) | Fig. 17 (p.13) shows 1.25 at batch 4K. Fix the note. Nothing changes on screen. |
| 35 | §7 risk 11 (internal) | "Best Paper not checked against an official list" | Outdated | Verified through SIGARCH (E2). |

### 2.2 The ONE idea

- **Present and correct**:
  - Sparse activation: B1.
  - The cost moves into traffic: B6.
  - The traffic is predictable: B7-B9.
- **Clarity is the weak point.** The spine argues about *what routing is* (departments, then dice, then habits). That is an excellent misconception structure. But:
  - "The cost moves into traffic" gets one 13 s beat (B6).
  - The payoff ("so what") is a single line in B9 with no result attached.
  - B5's 410 trillion and 848-digit receipt are about combinatorics, not about the idea. That beat is the first cut if the film runs long.
- **Density.** Four observations plus the squares (Ob4, Ob1, Ob2, Ob5) is a lot for one episode.

### 2.3 The lab tie

- **Conservative and honest.** Neither 6.6x nor 1.25x appears on screen.
- **The bet (B7) is a re-staging of a paper statistic.** It is honest only with the "replay of Fig. 4(c), in-sample, R1 trace" label.
- **Over-claims to fix:**
  - "our lab's paper" (it has coauthors from IU, Columbia, Samsung and NVIDIA)
  - "an ISCA Best Paper" (needs "a Best Paper Award … 2026")
  - the B10 "guess half" line

### 2.4 Jokes against comedy.md §3.2 (R = needs the mechanism to get it; T = the picture is true; N = the number is real or obviously absurd; A = says where the analogy breaks)

| Beat | Gag | R | T | N | A | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| B0 | "Bet you can't guess which eight doors" | cold open (decoration allowed) | its payoff (B10) overclaims | – | – | Pass once B10 is fixed |
| B1 | 634B "on call", the cat asleep | ✓ | ✓ | ✓ derived | ✓ (red pen "all 8 at once") | Pass |
| B2→B4 | "We even made the signs"; the cat bats them off; "not departments" | ✓ | ✓ (subject differences kept) | ✓ | ✓ | Pass. The best myth-bust of the three: it uses the paper's own Fig. 8. |
| B5 | 410 trillion → 13 million years → "Per floor" → 848-digit receipt | ✓ | ✓ (labeled "if random") | ✓ | – | Pass. Off the main idea. |
| B6 | "FULLY BOOKED", "this one." callback, the cat dozing | ✓ | ✓ | ✓ (modeled, with footnote) | ✓ | Pass |
| B7 | "Control group: one cat" | ✓ | ✓ only with the label and the R1 note | ✓ | ✓ ("learned from logs") | Pass with the fixes |
| B9 | "(real doctors can't do this)" on the copy | ✓ | ✓ | – | ✓ | Pass |
| B9 | Pop-up squares = the 8 buildings | wonder beat | **unverified** | ✓ | – | Hold until recomputed |
| B10 | "Not bad luck. A pattern." | ✓ | ✗ ("guess the doors half the time") | ✗ (misstates the metric) | – | **Fail** until reworded. Also touches 挂号难; the backup line is ready. |

No jokes about people. The 门道 pun is in the title only, in ZH only, and is the only pun (comedy §0.5).

### 2.5 People and placeholders

- Yufei's line, "Not departments. Not dice. Habits.", is marked as a placeholder. If she declines, drop the `y_write` writing shot as well (see §1.7).
- Zhongkai is shown without lines, with a correct name card.
- A member records the PA voice ("This clinic is fully booked."). That is fine: it isn't attributed as anyone's quote.

### 2.6 Top 5 required fixes (bidao)

1. **Subtitle (T2).** "671B parameters, 37B at a time / 6710亿参数，每次只用370亿" → "671B parameters, 37B per token / 6710亿参数，每个token只用370亿". Do the same wherever "at a time" appears.
2. **The B10 payoff misstates Fig. 4(c).**
   - EN: "About that bet: bet on one door in five, and we catch about half of them. The other half still surprise us. So if you can't get that appointment: not bad luck. A pattern."
   - ZH: "说回那个赌：押五分之一的门，能接住大约一半；另一半，照样猜不中。所以下次挂不上专家号，别怪运气。那是规律。"
   - Picture: the 51 shaded cells, about 4 of 8 pins inside them.
   - Change the B0 hook / X post from "Bet you can't guess which 8" to "Bet you can't narrow it down", so the payoff doesn't promise a guess.
3. **The B9 "8 squares = 8 buildings" pop-up is unverified.**
   - Recompute the pair map from the R1 trace before building the pop-up book.
   - If it isn't 8 × 32 blocks on the diagonal, cut "Fold it up: they're the buildings".
   - Keep "Its own four-machine rule, drawn by the traffic", with L14 p.28 verbatim on screen.
4. **Label every trace-driven frame "DeepSeek-R1 trace (same architecture as V3)" (T16).** In B7, mark "Notebook: fifty" as a replay of the paper's in-sample Fig. 4(c) statistic.
5. **B8 wording.**
   - "predicts" → "hints at".
   - "our lab's paper… an ISCA Best Paper" → "led by our lab, with collaborators… a Best Paper Award at ISCA 2026" / "获 ISCA 2026 最佳论文奖".
   - Also clear or replace the end-slate "7 characters, 1 token" (uncleared number), and update the two outdated internal notes (#34, #35).

---

## 3. he (何同学-style T3)

### 3.1 Every factual claim

| # | Where | Claim | Verdict | Fix / source |
| --- | --- | --- | --- | --- |
| 1 | Title | "671B parameters. 37B per token." / "每个token只用370亿" | OK | A1, A2, T2. |
| 2 | §1 X alt | "DeepSeek has 256 specialists per layer. Each word sees 8." | REWORD | T3: "DeepSeek-V3: 256 experts per layer. Each token gets 8, plus a shared one." |
| 3 | Logline (internal) | "最大的开源模型" (the largest open model) | REWORD | DeepSeek-V3 is not the largest (Kimi K2 is 1T; B1). Say "最大的开源模型之一" (one of the largest). |
| 4 | B0 | "Six hundred seventy-one billion parameters" | OK | A1. |
| 5 | B1 | A 70B dense model: "One word in, and all seventy billion get to work" | OK (lecture only) | L14 p.7 (B5 in the brief). The "word" wording is covered by item 7. |
| 6 | B1 | "…thirty-seven billion"; sticky note "~10× bigger, ~½ the work?" | OK | Derived: 9.6× and 0.53. |
| 7 | B1/B3/B4/B11 ZH VO | "喂一个字", "每个字", "每个字，只挂八个专家号" | **WRONG** (T3) | The brief: in ZH say "token" or "词元", never "每个字/词". Rewrite every ZH line with "token". In EN, either say "token" or add a "*technically a token" note on screen at first use, the way sketch does. |
| 8 | B1 | "满血版… 每个字只来 5.5%" | OK (number) | 37/671 = 5.5% (A3). The "字" is covered by item 7. |
| 9 | B3 | "256 specialists… eight specialists, plus the GP everyone sees… at the same time" | OK | A4, A5. Parallel top-k is right. |
| 10 | B3 | Ticket "weights add up to 100%" | OK | DSV3 §2.1.2: gate values are normalized over the selected routed experts. |
| 11 | B3 | "LAYER 04", then "LAYER 05" | OK | 1-indexed, layer 4 is the first MoE layer (layers 1-3 are dense; A6). The risk note can close: the brief has the answer. |
| 12 | B3 source | "Shared expert: L14 p.26" | REWORD | Cite DSV3 §4.2 ("1 shared expert and 256 routed experts"). |
| 13 | B3/B4 | "256 specialists" with no "per layer" in the VO | REWORD (minor) | T4. The B4 signs say "per layer". Put it on the B3 ticket too: "58 MoE layers, a new ticket at each". |
| 14 | B4 | Mixtral 8 / top-2; OLMoE 64 / top-8; DeepSeek-V3 256 / top-8; "1 room in 32"; "Kimi K2: 384 →" | OK, but OLMoE is UNCLEARED | L14 p.9; brief B1 and B4. OLMoE is lecture-only and **not in the fact brief**. Add it with its primary source (OLMoE paper: 64 experts, 8 active) before it goes on screen. |
| 15 | B4 | "Not eight. Not sixty-four. Two hundred fifty-six. And each word **still** gets eight." | **WRONG** | The first building (Mixtral) lights 2, not 8, so "still" contradicts the picture. See fix #2. |
| 16 | B5 | "Nobody assigns specialties. Training sorts it out, and not neatly by school subject." | OK | Brief §4 (MIX §5; PBC Ob4). |
| 17 | B6 | "Left alone, triage plays favorites… a doctor with no patients never learns. So training adds a nudge: busy doors get marked down, idle doors up." | OK | D3 ("left alone" = naive top-K, so T10 holds) and A13. "Never learns" could soften to "barely learns" (the brief's safe wording). |
| 18 | B7 | "Real deployments don't fit in one building. DeepSeek gives every specialist a GPU of its own." | REWORD | True only for **decoding** (A16; prefill is 32 GPUs, each with 8 + 1 experts, A15). EN: "When it writes answers, DeepSeek-V3 gives every specialist its own GPU." ZH: "生成回答时，DeepSeek-V3 给每位专家单独一张 GPU。" |
| 19 | B7 | 320 buildings in 40 blocks of 8; 64 grey ones "shared + spare" | OK | DSV3 §3.4.2. |
| 20 | B7 | "Every word commutes: out to eight buildings and back, at every layer" | OK | Dispatch + combine, 2 all-to-alls per MoE layer (L14 p.25; DSV3 §3.4.2). "Every MoE layer" is more exact; "word" is covered by item 7. |
| 21 | B7b picture | "Each tile visits 8 buildings, but crosses at most 4 blocks" | **WRONG / unsupported** | The 4-node limit is the training-time, group-based rule (DSV3 §2.1.2, §4.2: 8 nodes of 32 experts). DSV3's decode deployment (one expert per GPU, 40 nodes) states no node limit: a group of 32 experts spans 4 decode nodes. Drop "at most 4 blocks" from the decode city. Risk note §7.1-8 repeats this mix-up; fix it there too. |
| 22 | B7c bill | All-to-all share 15.3% / 62.5% / 70.2% / 76.0% at 1 / 2 / 4 / 8 nodes, "small test MoE · Cai et al. · via L14 p.23" | REWORD (prefer replace) | Lecture only. It is a different paper's small model (brief D5: "avoid in the pilot, or say 'in one small test model'"), and its venue is unverified. The VO "walking went from fifteen percent… to seventy-six" never says what changed. **Better:** use the lab's own number: "MoE DATA MOVEMENT ........ 60-90%* (*modeled: DeepSeek-V3, 4K)" (PBC Fig. 2). If you keep the 15→76: EN "On one small test model, spreading from one machine to eight took walking from 15% of the time to 76%"; ZH "在一个小测试模型上，从1台机器扩到8台，走路时间从15%涨到76%". |
| 23 | B7d | Prof. Ding: "MoE saves the thinking. Not the legwork." | OK as a placeholder | Marked. The content is true (compute saved, communication added). The on-screen credit "— Prof. Yufei Ding" appears only if she approves. |
| 24 | B8 | "We logged four of these giant models: over twenty-four thousand requests." | OK | E4, E5. |
| 25 | B8 | "It isn't random." | OK | E7's safe wording ("It looks random. It isn't."). |
| 26 | B8 | "A few doctors are booked solid. Some tend to come in pairs. And the doors a question visits help predict the doors its answer will." | OK | Ob4, Ob5, Ob3 (PBC p.4-6). Well hedged. |
| 27 | B8a/b | Counter "4 models · 200B-1000B"; the EN cut and the ZH cut light different buildings | OK | Abstract; Ob4. Use the same model and layer for both languages, and label the trace "DeepSeek-R1" (T16). |
| 28 | B8c | Heatmap "DeepSeek-V3, layer 17" | OK | Fig. 9(a), layer label in L14 p.45. |
| 29 | B8c / B10 | The red pen frames the bright squares as the pattern; slide 28 is quoted from its parenthesis only | REWORD | The squares come from DeepSeek's at-most-4-nodes rule (L14 p.28's own sentence; PBC p.6). Shown alone, they read as a natural pattern. Quote the full sentence, or add a small label: "squares = DeepSeek's ≤4-node routing rule". |
| 30 | B9 | "Expert layers up to one point two five times faster on today's GPUs" | REWORD | Add the fine print: "Qwen3-235B, one 8×H100 server, MoE compute only; +15.5% avg" (§2b). |
| 31 | B9 | "Six point six times on average, on a simulated wafer-scale GPU" | REWORD (minor) | Add "MoE throughput" (§2a). The "simulated" qualifier is right. |
| 32 | B9a picture | A twin building (copy a hot expert) and a pair split apart, then the 1.25x | REWORD | The copy is Dup (OK). The pair split is Insight 5 and appears in neither result. Drop the split, or caption it "design rule (not in the measured result)". |
| 33 | B9c | A real 3D wafer, plus a red "*simulated" | OK | Keep "*simulated" in frame (T22). |
| 34 | B10 | "Taught by Zhongkai Yu, one of our PhD students" | OK | F1. |
| 35 | B10 | "On slide twenty-eight, in parentheses: 'the square patterns we observed in our paper.'" | OK (verbatim) | Checked against the p28 render. See item 29 for context. |
| 36 | B10 | "It won Best Paper at ISCA twenty twenty-six." / "论文拿了 ISCA 2026 最佳论文" | REWORD | "It won a Best Paper Award at ISCA 2026." / "获 ISCA 2026 最佳论文奖" (T18). |
| 37 | B11 | "Every word sees eight specialists. Now we can guess which eight." | **WRONG** (T20) | An overclaim. The paper forecasts likely-hot experts: a top-20% shortlist covers about 50% (Ob1); top-5 prefill covers about 60% of top-5 decode (Ob3). The picture ("most of the 8 lights inside the 8 circles") is also unsupported. See fix #4. |
| 38 | §5 post disclosure | Full author list; 1.25x is MoE compute; 6.6x is simulated; 15→76% is another paper | OK | Add "Qwen3-235B, 8×H100" to the 1.25x line. |

### 3.2 The ONE idea

- **The clearest of the three on the mechanism:**
  - sparse: B1's dense-vs-sparse A/B, then B3, then B4's three buildings
  - traffic: B7, the commute and THE BILL
  - predictable: B8
  - payoff: B9
- **Distractions:**
  - B6 (training-time balancing) is a tangent from the main line.
  - The "walking" cost is shown with a different paper's toy model instead of the lab's own DeepSeek-V3 estimate. That weakens the link between "the cost moves into traffic" and "our paper".

### 3.3 The lab tie

- Both results appear, with most qualifiers. The disclosure in the post is exemplary.
- **Over-claims:**
  - B11's last line
  - the bright squares shown as "pattern" without their cause
  - the pair-split picture next to the 1.25x
  - "won Best Paper" (needs "a … Award")
- Zhongkai's credit is warm and accurate.

### 3.4 Jokes against comedy.md §3.2

| Beat | Gag | R | T | N | A | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | "~10× bigger, ~½ the work?", then a 1 s pause | ✓ | ✓ | ✓ derived | – | Pass |
| B1 (ZH) | 满血版 | ✓ | ✓ (R1 and V3 are both 671B / 37B) | ✓ | – | Pass. Not about a person, but it will date and invites the "满血/阉割" vendor debate in the comments. |
| B3 | "All eight see it at the same time. Real hospitals can't." | ✓ | ✓ | ✓ | ✓ | Pass |
| B4 | "Not 8. Not 64. 256. And each word still gets eight." | ✓ | ✗ (Mixtral lights 2) | ✓ | – | **Fail** until reworded |
| B5 | "We made those signs up" / 以上门牌，纯属虚构 | ✓ | ✓ | – | ✓ | Pass |
| B6 | The cat is woken by the balanced traffic | ✓ | ✓ | – | ✓ | Pass (the best visual gag in this script) |
| B7 | "this one." circling 76% | ✓ | number from another model | lecture only | – | Pass only with the relabel or the lab's own 60-90% |
| B3/B11 | "*copay not included" | ✓ (series) | ✓ | – | – | Pass |
| B11 | "Now we can guess which eight." plus the SEEN stamp | ✓ | ✗ (overclaim) | – | – | **Fail** until reworded |

No jokes about people.

### 3.5 People and placeholders

- Prof. Ding's B7d line is marked as a placeholder, with narration as the fallback. The on-screen credit must follow the same rule.
- Zhongkai is credited without lines. His consent and his Chinese name are flagged as open.

### 3.6 Top 5 required fixes (he)

1. **Token, not 字/word (T3).**
   - Rewrite every ZH VO line with "token" or "词元". For example B11: "每个token只挂八个专家号".
   - In EN, either say "token", or keep "word" and add an on-screen "*technically a token" at the first use.
   - Fix the X alt line to: "DeepSeek-V3: 256 experts per layer. Each token gets 8, plus a shared one."
2. **B4: "still gets eight" contradicts the Mixtral building (top-2).**
   - EN: "Eight specialists. Sixty-four. Two hundred fifty-six. And each word still gets only a handful."
   - ZH: "专家从8位，到64位，到256位。每个token能挂上的，还是那么几个号。"
   - Red pen: "1 in 4 → 1 in 8 → 1 in 32".
   - Add OLMoE to the fact brief with its primary source.
3. **B7 (three changes).**
   - (a) Make "every specialist a GPU" decode-only: "When it writes answers…".
   - (b) Remove "at most 4 blocks" from the decode-layout picture; that rule belongs to the training-time group layout.
   - (c) Replace the borrowed 15.3→76.0% bill with the lab's own "MoE DATA MOVEMENT ........ 60-90%* (*modeled: DeepSeek-V3, 4K)". If you keep it, say "one small test model, from one machine to eight" in both languages.
4. **B11's last line overclaims (T20).**
   - EN: "Every token sees eight specialists. Now we can forecast where the crowds will be."
   - ZH: "每个token只挂八个号。人往哪几间挤，现在能提前猜个大概。"
   - Picture: circle a heat zone (a shortlist), not exactly 8 rooms, with about half the lights landing inside, taken from a real R1 trace token.
5. **Qualifiers on the lab tie.**
   - 1.25x fine print: "Qwen3-235B · one 8×H100 server · MoE compute only · +15.5% avg".
   - 6.6x: add "MoE throughput".
   - Drop the pair-split picture right before the numbers.
   - "won Best Paper" → "won a Best Paper Award at ISCA 2026".
   - Label the squares "DeepSeek's ≤4-node routing rule" and quote slide 28's full sentence.
   - Label trace frames "DeepSeek-R1".

---

## 4. sketch (小品, hospital rules)

### 4.1 Every factual claim

| # | Where | Claim | Verdict | Fix / source |
| --- | --- | --- | --- | --- |
| 1 | Title / cover | "671 Billion on the Payroll, 37 Billion on Shift" / 《6710亿在编，370亿在岗》; cover lines "671B on payroll. / 37B on shift." | REWORD (priority) | "On shift" means "working right now", which is the "37B at a time" error (T2). It also contradicts the script's own (correct) B0 answer: the rest are "seeing other patients", so they are on shift too. Keep payroll; change the second half to a per-token form. See fix #1. |
| 2 | Cover small text and receipt | "DeepSeek-V3 · parameters per token"; "37B / 671B" | OK | A1, A2. |
| 3 | §1 Douyin title | "DeepSeek有256个专家，你每打一个字只能挂8个号" | **WRONG** | T3 (字), T4 (per layer). "你每打一个字" also suggests typed input. → "DeepSeek-V3每层256个专家，每个token只挂8个号". |
| 4 | §1 X first line | "DeepSeek-V3 has 256 experts. Each word sees 8." | **WRONG** | T4 and T3. → "DeepSeek-V3: 256 experts per layer. Each token sees 8 (plus a shared one)." |
| 5 | B0 | "671 billion on the payroll. Per word, 37 billion on shift." / "每个词，370亿在岗" | REWORD | "Per token" (EN) / "每个token" (ZH, T3). |
| 6 | B0 | "And the rest?" "Seeing other patients." | OK | True in batched serving. This is the best teaching of trap T2 in the three scripts. Keep it. |
| 7 | B1 | "Rule one: every word is a patient." "*technically a token. Next episode." | OK (EN) / REWORD (ZH) | The footnote covers the EN. In the ZH VO, "每个词" should be "每个token" (T3 is explicit for ZH). The footnote gag can stay on screen. |
| 8 | B1 | "Rule two: 256 specialists. You see eight. (Plus the GP. Everyone sees the GP.)" | OK as a setup | The "per layer" reveal is delayed to B7 on purpose ("That tower is one layer"). That is acceptable because the reveal *is* the joke and comes within 45 s. Don't let any frozen frame or post quote Rule 2 alone. |
| 9 | B3 | "Triage scores every specialist and books your top eight. Eight answers, blended by score." "Asking eight, not 256: that's the whole trick." | OK | A10, D1. No softmax on screen is the right call (DSV3 uses sigmoid + normalize). |
| 10 | B4 | "Nobody assigns specialties; they're learned from patients. Rule four: no patients, no learning." | OK | D2 (L14 p.14); brief §4. |
| 11 | B5 | "Left alone, triage keeps picking the same few doors… The rest never see a patient, and never learn." | OK / minor | D3 (T10 holds: "left alone", training). "Never learn" → "barely learn" is the brief's safer wording. |
| 12 | B6 | "DeepSeek-V3's fix: quietly bump busy specialists down the list. It changes who you see, not how much they count." | OK | A13 (DSV3 §2.1.2; L14 p.17). Doesn't claim "no aux loss", so T11 holds. ZH "DeepSeek的办法" → "DeepSeek-V3的办法". |
| 13 | B7 | "That tower is one layer. There are 58."; "General ward 1-3"; 58 tickets | OK | A6. |
| 14 | B7 | "Too big for one GPU, so at serving time: one specialist per building." | **WRONG** | Wrong causation and wrong scope. Size explains needing many GPUs, not one expert per GPU. DSV3 uses large expert parallelism so that "each expert processes a sufficiently large batch size" (§3.4.1). One expert per GPU holds only for **decode** (§3.4.2); prefill hosts 8 + 1 experts per GPU on 32 GPUs (A15). See fix #2. |
| 15 | B7 | "320 GPUs"; footnote "*decode stage: 256 specialists + 64 for the GP and stand-ins" | OK | A16. |
| 16 | B7 | On screen: "671 GB of specialists (FP8) · 80 GB per GPU" | **WRONG / UNCLEARED** | 671B is the whole model, not just the specialists: routed experts are about 14,848 × 44M ≈ 654B (derived, A7, A8). Neither 671 GB nor 80 GB is in the brief: 80 GB is an H100 spec from L04 p.17 (lecture only), and DeepSeek used H800s. Drop the line, or add both facts to the brief and write "671B weights ≈ 671 GB in FP8 · one GPU holds 80 GB". |
| 17 | B7 | 40 blocks × 8 slim buildings; one room per floor; attention on the same 320 GPUs (TP4 + DP80) | OK | DSV3 §3.4.2; A16. |
| 18 | B8 | "Every word, every layer: shuttle out to eight buildings, shuttle back. Times every request."; "2 all-to-alls per MoE layer · L14 p.25" | OK | L14 p.25; DSV3 §3.4.2. "Word" → "token" in ZH (T3). |
| 19 | B8 | "The checkups are fast. The commute is the bottleneck." | OK | PBC abstract: "data movement overhead that becomes the dominant bottleneck in multi-unit LLM serving systems". |
| 20 | B9 | "Our own paper says 'random,' on page one." Quoted sentence on screen. | OK (verbatim) | PBC p.1 abstract, exact wording checked. |
| 21 | B9 | "Zhongkai, who taught this lecture, led a study of 24,000 requests." | REWORD (minor) | "of **over** 24,000 requests" / "两万四千**多**个请求" (E5, §2c). |
| 22 | B9 | "Regulars. Package deals. And what's busy while it reads your question stays busy while it answers." | OK | Ob2/Ob4, Ob5, Ob3 with the labels "varies by model" and "similar, not identical". |
| 23 | B9 | Counter "24,000+ · 4 models, 200B-1000B"; trace label "DeepSeek-R1" | OK | Abstract; T16. Handled correctly. |
| 24 | B10 | "Forecast the traffic; move specialists before the rush." | OK | Insight 1, which leads to the prefill-aware Remap / Dup (PBC §VI). This is the right mechanism for the 1.25x. |
| 25 | B10 | "Best Paper, ISCA." / "ISCA最佳论文" | REWORD | "A Best Paper Award at ISCA 2026" / "获 ISCA 2026 最佳论文奖". The stamp already says 2026. |
| 26 | B10 | "Today's GPUs: up to 1.25 times on the expert layers." Receipt: "(MoE computation)" | REWORD | Add "Qwen3-235B · one 8×H100 server · +15.5% avg" in fine print. |
| 27 | B10 | "Simulated wafer-scale chips: 6.6 times on average." Receipt: "(future) … 6.6× avg (4 models)" | REWORD (minor) | Add "MoE throughput". The qualifiers are otherwise right (E10, T17, T22). |
| 28 | B10b | Prof. Ding: "Chaos is just data nobody has read yet." | OK as a placeholder | Marked, optional, deleted along with `y_proud` if she declines. |
| 29 | B11 | "Not anymore. Patients used to wait for the specialist. Read the patterns, and the specialist waits for you." | REWORD (overclaim) | "Not anymore" says the wait is gone. The results are up to 1.25x on MoE compute on one server, and 6.6x simulated. See fix #3. |
| 30 | B11 | "No.01 MoE ........ 37B of 671B" | OK | A1, A2. |
| 31 | §7.1-4 (comment reply) | 37/671 = 5.5% vs 8/256 = 3.1%; the gap is attention, embeddings, the shared expert and the 3 dense layers | OK | Brief B6 plus our arithmetic. A good reply for the comments. |
| 32 | §7.1-8 | Deliberately doesn't draw the squares, because they come from the routing rule | OK | A judgement call that avoids presenting an artifact as a discovered pattern. Defensible. |

### 4.2 The ONE idea

- **Stated exactly as the brief has it** ("pay for the visit, not the payroll; the cost moves from the doors to the roads; that traffic, which looks random, can be forecast").
- **The middle link is the clearest of the three.** "看病不贵，路上贵 / The commute is the bottleneck" says it directly, and the four-step escalation (三翻四抖) builds up to it.
- **Two dilutions:**
  - B4-B6 (training-time balancing, about 28 s) is a second lesson.
  - Seven rules is a lot to read on a phone.
  - If the cut runs long, compress B4-B6 into one beat.

### 4.3 The lab tie

- **Most honest of the three:**
  - the results are tied to the right mechanism
  - "simulated / future" is on screen
  - the R1 trace is labeled
  - the squares are avoided
  - the paper's own "random" is quoted verbatim
- **To fix:**
  - the B11 overclaim
  - the missing Qwen3 / 8×H100 fine print
  - "24,000" → "over 24,000"
  - the year in the Best Paper line
- **The "our own paper says random" self-jab sits right before Zhongkai's name.** Under identity rule 12 ("never the afterthought of a joke"), credit him *after* the turn: "Our own paper opens with 'random'. Then it shows why it isn't: Zhongkai, who taught this lecture, led a study of over 24,000 requests."

### 4.4 Jokes against comedy.md §3.2

| Beat | Gag | R | T | N | A | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| B0 | Payroll / shift; "And the rest?" "Seeing other patients." | ✓ | partly ("on shift" ≈ "at a time"; the reply fixes it) | ✓ | – | Pass once the title is fixed. The reply is the best T2-correct gag in all three scripts. |
| B1 | "*technically a token. Next episode." | ✓ | ✓ | – | ✓ | Pass |
| B3 | "What hospital works like this?" "This one." | ✓ | ✓ | – | ✓ | Pass |
| B4 | "Dr. 117's specialty?" and an empty slot | ✓ | ✓ | – | ✓ | Pass (the analogy-break beat) |
| B5 | The queue falls off the table; "Is there a wait??" "Now there is." | ✓ | ✓ (labeled illustrative) | – | – | Pass |
| B6 | The cat is woken; "Balanced. Done? Not quite." | ✓ | ✓ | – | ✓ (footnote) | Pass |
| B7 | "One building EACH?" "320 GPUs." | ✓ | ✗ ("too big for one GPU, so…"; "at serving time") | ✗ ("671 GB of specialists") | ✓ | **Fail** until reworded |
| B8 | "I'll take the queue." / 看病不贵，路上贵 | ✓ | ✓ | – | ✓ | Pass. The ZH line riffs on 看病贵, a social topic; keep the backup 「看病很快，堵在路上。」 ready. |
| B9 | "Our own paper says random on page one" | ✓ | ✓ (verbatim) | ✓ | – | Pass. Reorder so Zhongkai's credit follows the turn, not the jab. |
| B9 | The cat bats at the red thread | decoration | ✓ | – | – | Minor: decoration outside the cold open (§3.2-1). Keep it short and silent. |
| B11 | "Not anymore… the specialist waits for you" | ✓ | ✗ (overclaim) | – | – | **Fail** until hedged |

No jokes about a real person. The 二百五 risk is handled (read it as 两百五十六).

### 4.5 People and placeholders

- Prof. Ding's B10b line is marked as a placeholder and is optional.
- Zhongkai is named in the VO with correct facts. It is not a quote, and no joke is made at his expense.
- The optional first-person VO by Zhongkai needs his approval; the script already flags this.

### 4.6 Top 5 required fixes (sketch)

1. **Title / cover "37B on shift / 370亿在岗" (T2).** Keep the payroll gag and make the second half per token.
   - EN: "671B on the payroll. 37B per patient." (the cover can use "37B per token.")
   - ZH: 《6710亿在编，每个token只派370亿》, or cover lines "6710亿 在编" / "每个token 派370亿".
   - Change the B0 VO to "Per token, 37 billion on the case" / "每个token，只派370亿". Keep "Seeing other patients."
2. **B7 causation and numbers.**
   - EN: "That tower is one layer. There are 58. When it writes, DeepSeek-V3 gives each specialist a building of its own." Note: "320 GPUs."
   - ZH: "这整栋楼只是一层。一共58层，层层挂号。写答案的时候，一位专家独占一栋楼。"
   - Delete "671 GB of specialists (FP8) · 80 GB per GPU", or clear both numbers in the brief and relabel them as "weights".
3. **B11 overclaim.**
   - EN: "Less of one. Patients used to wait for the specialist. Read the patterns, and the specialist can be waiting for you."
   - ZH: "少排一点了。以前是病人等专家；看懂了规律，专家可以先等病人。"
   - The picture (041 is lit before the patient arrives) can stay.
4. **Title and post copy (T3 / T4).**
   - Douyin: "DeepSeek-V3每层256个专家，每个token只挂8个号"
   - X: "DeepSeek-V3: 256 experts per layer. Each token sees 8 (plus a shared one)."
   - ZH VO: "每个词" → "每个token" throughout. The EN "*technically a token" footnote gag stays.
5. **B9 / B10 qualifiers.**
   - "24,000" → "over 24,000" / "两万四千多".
   - 1.25x fine print: "Qwen3-235B · one 8×H100 server · MoE compute only · +15.5% avg".
   - 6.6x: add "MoE throughput".
   - "Best Paper, ISCA" → "a Best Paper Award at ISCA 2026".
   - Reorder B9 so Zhongkai's credit follows "Then it shows why it isn't."
   - B5 "never learn" → "barely learn".
