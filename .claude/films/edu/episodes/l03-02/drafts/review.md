# L03-02 review (independent)

**Verdict:** the spine works (hook, cloakroom, formula, worked sizes, MQA/GQA, payoff to 516 GB). Facts are clean; all seven quotes match clips.json and check.json. Not ready: 1:14-1:28 is an empty page with the mic over her slide, one clip reads as a claim she did not make, the slide correction sits under the button rail, labels sit on drawings, and "KV heads" comes before any head is recalled.

## Must-fix

**M1 - P3, 1:13.7-1:28.0.** For 14 s the frame is a thin slide-11 strip over empty paper; the wall only arrives at n7-0.4. During c2 the mic covers "Optimization?" and "we can focus on". Fix: bring `wall` in at p3+0.7, and move the mic clear of the strip.

**M2 - P7, c7 (3:56.7).** After "the million is a thought experiment", "They are not using it today because it's too costly" reads as "nobody uses long prompts". That is false, and not what she meant (F22: plain MHA). Fix n18: "And Llama 3.1 actually stops at 128K tokens: the million is a thought experiment. So is the plain attention. Real models don't use it." Add a label "plain multi-head: too costly" at c7.

**M3 - P6, 3:32 (n17).** The 1M column, its strikes and its header sit at x 880-1060, y 700-1000, under the button rail. The table text (~17 px) is unreadable on a phone. Fix: punch in about 1.8x on the right three columns at n17@units, so the column sits near x 500-800, then strike. Use the same zoom on the rows at n14 and n16.

**M4 - Text on drawings.**
- Cover: "a million-token prompt" sits on the desk. Move it below the desk (y ~1300).
- P3, 1:28-1:54: "keys / values / the new token" sit on the counter moulding, with stray `||||` marks between the patches. Drop the slide after c2, lift the wall about 150 px and letter the lines below the counter.
- P9, 4:37.6: "a squeeze..." sits on the ring and the feet. The ring is about 80 px low-left and circles empty floor. Centre it on the rack and put the label in the left column (y ~600).
- P7, 3:45: the caption covers the bottom of the flood. Use w 760.

**M5 - Heads never recalled (n13, 2:28).** The formula and the diet rest on "KV heads". Nothing says what a head is, or that KV heads = heads in plain attention. "Rack" then appears at 4:01 unintroduced. Fix n13: "...a model is a stack of layers, each running attention again; every layer, every floor, keeps its own cloakroom. Then the KV heads. Remember heads from last time: attention runs several copies side by side, and each head keeps its own rack of tags and parcels."

**M6 - X main post.** "A million-token prompt could need about 8 terabytes" has no qualifier (trap G). Replace with: "With textbook attention, a million-token prompt on a 405B model would need about 8 terabytes of memory just to be remembered."

## Should-fix

**S1 - Cover (the thumbnail).** "to remember it: about 8 TB" reads before the prompt label. Put the prompt first and the size second. Add a small black line: "textbook attention, 405B".

**S2 - P5, 2:21-2:45.**
- The floor ring sits beside "× KV heads", so a layer looks labelled as a head. Align it with "× layers".
- The captions at 2:23 and 2:43 cover the tower. Use tower w 280, or move the captions right.

**S3 - Mic tag.** At 3:11 it touches the slide-12 edge and tape; at 5:34 it touches slide 13's tape. Leave at least 30 px clear.

**S4 - n17.** "two kinds of units" means nothing to a newcomer. Use: "its last column mixes units counted in 1,024s with units counted in 1,000s."

**S5 - n19.** "Layers, head size and bytes come with the model" is untraced, and bytes can change. Use: "Layers and head size come with the model's design. The KV heads are the factor to change."

**S6 - n21 / "sq".** "Squeeze" suggests crowding, not quality. Use: "Sharing has a price: quality can drop." On screen: "the price: quality can drop".

**S7 - n26 then c13.** The narrator ends on "an inference saving" and she answers "Not a huge saving", which sounds like a contradiction. Use: "And one thing her slide stresses: grouping is mainly an inference saving. For the arithmetic, and for training, it changes little."

**S8 - P8, 4:01.** Eight racks are drawn under "32 heads, 32 racks". Letter "one rack per head (8 of 32 drawn)".

**S9 - P11, 5:01-5:23.**
- Slide 14's text is ~14 px: punch in on each row as its ring lands.
- Label "405B, a million tokens (thought experiment):".
- The lower 40% is empty: add a small `group_racks`.

**S10 - P12, 5:40.** The trolley is about 48% of the width. Use w 780.

**S11 - P13, 5:45.** "let heads share" sits over the P3 cloakroom. Use `group_racks`, so the last picture is the diet.

**S12 - Caption break, 4:43.** "...and colleagues split" dangles. Use: "In 2023, Joshua Ainslie and colleagues|split the difference with grouped-query attention."

**S13 - Naming.** n1 says "Llama 3's biggest size", n18 says "Llama 3.1". In n18 use: "That 405B model, released as Llama 3.1, stops at 128K tokens."

**S14 - X thread 3/.** "Real models don't use plain multi-head attention" is a census claim. Use: "and Llama 3 itself uses grouped-query attention, not plain multi-head."
