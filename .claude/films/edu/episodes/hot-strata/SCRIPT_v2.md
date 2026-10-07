# Strata x "Patterns behind Chaos" - script v2 (for people outside computing), 2.5-3.5 min

User's notes on the 64 s cut (2026-10-05): the paper-theatre + riso look should change; outsiders cannot follow it (no
intro, jargon); it did not really ride the hot topic. Up to 5 min is fine. Plan: this script, then a 3-look bake-off of
the opening (~15 s) - line-art explainer (akokoi1), rubber-hose toon + watercolour (tollens-ai/quality-education),
pure risograph (drawn-by-code) - then the whole film in the chosen look. X non-Premium caps video at 2:20: a 2 min X cut
or Premium; the full cut for Douyin / Bilibili.

Rules: one analogy carried all the way (a restaurant kitchen); no jargon on screen without the analogy first; at most
one number per beat; every number from `NOTES.md` or marked [check].

## The analogy
| Real thing | In the kitchen |
| --- | --- |
| AI model (Mixture of Experts) | a restaurant with 128 chefs at each of its 94 stations |
| a word / token | one dish |
| the 8 experts picked per token | the 8 chefs a dish needs at a station |
| GPU memory (fast, small) | the kitchen upstairs: room for only 32 chefs per station |
| system RAM (big, slow to reach) | the break room downstairs |
| PCIe copy | calling a chef up the stairs |
| cache policy | deciding who waits upstairs |
| our traces | a year of real order slips from a real 235B "restaurant" |

## Beats (EN / ZH VO, picture)
**0. Cold open - the hot topic as a story (0:00-0:15)**
- EN: "Last week, someone ran an AI model that normally lives in a data center... on one gaming graphics card. Programmers
  lost their minds." ZH: 「上周，有人把一个平时只在数据中心跑的 AI 大模型，塞进了一张游戏显卡里。程序员们都炸了。」
- Picture: a forum thread exploding with upvotes (generic, no real logos); a gaming card next to a wall of servers.
- EN: "How is that even possible? The answer is a pattern our lab found." ZH: 「这怎么可能？答案藏在我们实验室发现的一个规律里。」

**1. What is a model, in one breath (0:15-0:40)**
- EN: "An AI model is a giant pile of numbers. This one has 125 billion. That's far too many to fit on a gaming card's
  memory." ZH: 「AI 模型，说白了就是一大堆数字。这一个有一千二百五十亿个，游戏显卡的显存根本装不下。」
- Picture: numbers pouring into a small box that overflows. Number check: 125B x ~0.5-1 byte (4-bit/8-bit) = 60-125 GB vs
  24 GB on an RTX 4090 [check card memory: 24 GB, yes].

**2. The kitchen (0:40-1:15)**
- EN: "But this kind of model works like a restaurant kitchen. At every station there are 128 chefs - experts. For each
  word it writes, only 8 of them cook." ZH: 「但这种模型的工作方式，很像一间餐厅后厨：每个灶台有 128 位厨师，叫'专家'。它每写一个字，只需要其中 8 位上手。」
- Picture: 128 chefs lined up; a dish ticket comes in; 8 step forward.
- EN: "So the trick: keep only a few chefs in the small kitchen upstairs - the graphics card - and the rest in the big
  break room downstairs - the computer's ordinary memory." ZH: 「所以诀窍是：楼上的小厨房（显卡）只留少数厨师，其余都待在楼下的大休息室（电脑内存）。」

**3. The catch (1:15-1:45)**
- EN: "Calling a chef up the stairs is slow. Every dish that needs someone from downstairs waits." ZH: 「可是从楼下叫人上来很慢，缺谁，这道菜就得等。」
- EN: "If the chefs a dish needs were random, a kitchen with room for a quarter of them would be missing someone three
  times out of four. About two dishes a second." ZH: 「如果每道菜要哪几位厨师完全随机，楼上只放得下四分之一，那四次里有三次要去楼下叫人，一秒钟只能出两道菜左右。」
- Picture: chefs running up and down stairs, dishes piling up. (2 tok/s = PCIe bound, our arithmetic, NOTES.md.)

**4. Our finding (1:45-2:30)**
- EN: "But they're not random. Our lab recorded which experts four giant models actually pick, millions of times, and
  released the records." ZH: 「但它们不是随机的。我们实验室记录了四个超大模型每一次选了哪些专家，几百万次，并把数据公开了。」[check wording: 4 models,
  "millions" of selections: 24k requests x tokens x layers - fine]
- EN: "The same chefs keep getting called, in patterns you can predict. Keep the right ones upstairs, and three times as
  many dishes find their chef already there." ZH: 「总是那几位被叫到，而且有规律可循。提前把对的人留在楼上，命中率是瞎猜的 3 倍。」(25% -> 77%)
- EN: "Give the kitchen half the room, and almost every dish is ready to go - 93 percent." ZH: 「楼上放一半人时，93% 的菜不用等。」

**5. Why it matters (2:30-3:00)**
- EN: "That's systems research: the same hardware, used smarter. It's how big AI gets cheaper - and closer to your own
  computer." ZH: 「这就是系统研究：同样的硬件，更聪明地用。大模型变便宜、跑进你自己的电脑，靠的就是这个。」
- EN: "Our paper, 'Patterns behind Chaos', won best paper at ISCA 2026. The data is open - link below."
  ZH: 「这篇论文《混乱背后的规律》拿了 ISCA 2026 最佳论文，数据全部公开，链接在评论区。」
- Logo end card.

## Fine print (post + on screen once)
Simulation on our released Qwen3-235B traces, not a run of Strata; "predict" = a simple recency model for this video,
not the paper's method; speeds are PCIe transfer bounds. Strata's numbers are claimed by its author.
