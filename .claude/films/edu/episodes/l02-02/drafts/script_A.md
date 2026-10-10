# L02-02 · "The Gate: From ReLU to SwiGLU" · script draft A

Runtime target 6:00 (estimate 6:50.7 by the brief's formula; at the usual +4% voice about 6:35). 1080x1920, 30 fps, English.

**Angle A, story / analogy first:** one kitchen tap carries the episode. The water is the content, the hand on the tap is the gate. ReLU is a switch (shut or fully open), GELU and SiLU are a dimmer the water turns by itself, GLU / SwiGLU hands the tap to a second person; then the bill: the second person's matrix is paid for by a narrower pipe, two-thirds of 4h. The math is lettered on every panel, but the picture carries each beat.

Sources: Lecture 2 slides 13-21, Lecture 3 slides 2-4, FACTS.md (rows cited per line), clips.json (passing clips only). Continuity: follows L01-04 (decoding); no decoding recap. Lecture 2 slides 1-12 (structure) are assumed and not re-explained beyond "inside a transformer".

## 1. Beats

| # | time | panel (what is on screen: drawing, slide, pen work) | narration / clip | FACTS rows |
| --- | --- | --- | --- | --- |
| 0 | 0:00.3 | **cover**: `line_tap_glass` (fills 80% of the width; blue wash in the glass): frame 0 is finished, title "The Gate" / "From ReLU to SwiGLU". On n0 three red boards slide in under the tap, lettered W · V · W2, and "Llama · Mistral · OLMo" small above them; on n1 the red pen squeezes the boards narrower and letters "about 2/3". Strip "CSE 291P · Lecture 2 · UC San Diego". | n0, n1, n2 | F26, F24 (hook, softened); F35, F31 (hook); source key L02/L03; F25 |
| 1 | 0:21.3 | **straight rulers**: `line_ruler_curve` (blue wash on the wavy curve). On n4 three ruler strokes join into one straight red line, "still one straight line"; during c12 the pen adds rulers "2 · 3 · 5 · 6", each one still straight; on n6 a red bend at a joint, "a bend: activation function"; n7-n8 a note card "Hornik, 1991: one hidden layer, enough units, close to any continuous function"; n9 the pen adds "exists ≠ easy to find". | n3, n4, n5, c12, n6, n7, n8, n9 | definition (F1, F5); F1; F1 (her demo); F1, F5; F2; F4 |
| 2 | 1:13.7 | **the feed-forward layer**: code boards: x (a thin strip) → W1 (a wide board) → a small red bend → W2 → back to a thin strip, the boards' areas true to h × 4h; lettered "FFN(x) = act(x W1) W2"; on n12 a brace over the wide middle, "hidden width 4h", and a small card "2017: 512 → 2048 → 512"; mic tag on c17, the two matrices ringed as she names them | n10, c17, n11, n12 | F5; F5, F8; F7 |
| 3 | 1:41.8 | **the tap**: `line_tap_glass` again, closer: the water ringed "content (the numbers)", the hand ringed "the gate"; under the tap, lettered small: "act( · )" | n13 | F22, F25 (analogy) |
| 4 | 1:50.4 | **the switch**: left half of `line_switch_dimmer` (switch and bright bulb), with an ink plot drawn on hand axes beside it: ReLU, flat at zero then the 45° line; "ReLU(x) = max(0, x)"; on n17 a tiny arrow on the curve, "gradient: how much the result moves"; on n18 the slopes lettered "1" on the right arm, "0" on the flat arm | n14, n15, n16, n17 | F6, F9 (512 to 2048: on the panel); F9; definition (F10, F13); F10 |
| 5 | 2:17.2 | **the dead unit**: `line_wilted_plant` (pale green wash on the plant, none in the can); the empty can lettered "gradient = 0", the plant "a dead ReLU" | n18, n19 | F13 |
| 6 | 2:28.8 | **the dimmer**: the camera eases right on `line_switch_dimmer` to the dimmer and its softer bulb; "GELU(x) = x · Φ(x)"; a small bell curve with its left part washed blue, "Φ(x): chance a bell-curve sample is below x"; red arrows on the knob "big x: open" / "negative x: mostly shut" | n20, n21, n22 | F14; F14, F22 |
| 7 | 2:53.0 | **her slide 17**: slide 17 taped; its two plots covered by a blank taped sheet on which the pen draws ReLU (pencil grey) and GELU (ink) on the same axes; the GELU dip below zero ringed, "-0.17", "still a gradient"; in the margin "BERT · GPT · GPT-2's code" and "costs more, still small change" | n23, n24 | F15; RUN (GELU dip -0.17); F16, F17 |
| 8 | 3:10.2 | **sigmoid, then SiLU**: ink plots on hand axes, one after the other: the S-curve between 0 and 1, "sigmoid", its steepest point ringed "slope ≤ 1/4" (c15 with the mic tag); then the pen multiplies: "x · sigmoid(x) = SiLU", the SiLU curve drawn over the faint GELU, "cheaper", "in the 2016 GELU paper" | n25, c15, n26, n27 | F12 (erratum: 0.25); slide 18; F18; F18, F19 |
| 9 | 3:34.7 | **the search**: `line_card_catalog` (blue wash on the pulled drawer); the drawer's card lettered "x · sigmoid(βx)" → "Swish"; "2017, a Google Brain team: a computer search"; on n31 the card flips: "β = 1: SiLU, 2016" | n28, n29, n30 | F21; F20, F21; F36, F19 |
| 10 | 3:55.7 | **the second person**: `line_tap_two_people` at full width (blue wash in the jug and the bucket): the boy's jug ringed "content: x V", the girl's wheel ringed "gate: SiLU(x W)"; during c6 the pen underlines "gating" and "value" in her caption and draws one arrow to each person; on n35 a red "×" at the valve and "then W2" at the bucket; on n36 three small boards W · V · W2 lettered under the pipe | n31, n32, n33, c6, n34, n35 | F22; F23, F25; F23; F25; F24 |
| 11 | 4:44.5 | **her slide 20**: slide 20 taped; the model list covered by a blank taped sheet lettered "Llama · Mistral · OLMo: SwiGLU" and "Gemma: GeGLU, a cousin"; in the table the pen strikes "sigmoid(x2)" and writes "SiLU(x2)", an arrow to her own caption "SwiGLU = x1 · SiLU(x2)"; "latency" in her note struck, "compute" written above | n36, n37 | F24 (erratum); F26, F27 |
| 12 | 5:00.1 | **her slide 21**: slide 21 taped; the pen walks the columns: red ticks over hers on ReLU's cheap rows, a ring on "0 on all negatives", rings on GELU's two crosses, a ring on "esp. SwiGLU variants" | n38 | slide 21; F10, F13, F17, F26 |
| 13 | 5:09.5 | **small gain, no reason**: a note card: "same size, same compute: 1.68 → 1.64 (lower is better)", the arrow short; then a taped paper strip with the paper's last sentence in type, "divine benevolence" underlined; during c7/c8 `line_tiny_lab` (blue wash on the screen), "test it" lettered on the screen | n39, n40, n41, c7, c8 | F28; F29; F29 (exact quote); F37 |
| 14 | 5:42.5 | **the bill**: `line_balance`: left pan two boards "h × 4h" + "4h × h" = "8h²"; a third board drops on the right pan, the beam tips, "12h²"; card "1 weight ≈ 2 operations per token (FLOPs)"; mic tag "lecture 3" on c20 | n42, n43, n44, c20 | F24, F30; F30; RUN (12 h^2 vs 8 h^2); F32; F7, F31 (lecture 3) |
| 15 | 6:09.7 | **her worksheet**: L03 slide 4 taped; the pen rings the box "3 × (h × d_ff) = 8h² → d_ff = 2/3 × 4h", writes "≈ 2.67h"; beside it the three boards redrawn narrower, same total area, and the balance level again (small); card "Llama 7B: 4 × 4096 = 16,384 → 2/3 ≈ 10,923 → 11,008 (rounded up)" | n45, n46, n47 | F31; F32, F33; F35 |
| 16 | 6:35.9 | **bookend**: the cover layout again: `line_tap_glass`, the three narrow boards W · V · W2 under it, "2/3" ringed; a row of three small icons from the episode lettered "switch → dimmer → second pair of hands" | n48, n49 | F24, F31; F9, F14, F18, F23 |
| - | 6:50.7 | **end card**: the logo; "After Prof. Yufei Ding's CSE 291P, Lecture 2" / "Who holds the tap?" / "UC San Diego · Picasso Lab"; small print: Hornik 1991; Vaswani et al. 2017; Hendrycks & Gimpel 2016; Ramachandran, Zoph & Le 2017; Dauphin et al. 2017; Shazeer 2020; Touvron et al. 2023; "The narration is a synthetic voice." | - | source key |

## 2. Narration and clips, in order

| id | at | line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.3 | Llama, Mistral and OLMo, big open models, all use the same three-matrix trick. | F26, F24 (hook, softened) |
| n1 | 0:06.1 | And Llama pays for it by shrinking its layer to about two-thirds. Why would anyone do that? | F35, F31 (hook) |
| n2 | 0:13.5 | Tonight, from Professor Yufei Ding's CSE 291P at UC San Diego: the gate, told with a kitchen tap. | source key L02/L03; F25 |
| n3 | 0:21.3 | A matrix multiply turns a list of numbers into a new list, each new number a weighted sum of the old. | definition (F1, F5) |
| n4 | 0:30.3 | Layers like that are linear. Stack as many as you like: together they are still one matrix multiply. | F1 |
| n5 | 0:38.1 | One straight-line map: straight rulers on a wavy curve. Her demo: | F1 |
| c12 | 0:43.1 | **c12** (her clip, L02, 4.8 s): "Instead of having two layers, you can have three or five or six, it doesn't really converge at all." | F1 (her demo) |
| n6 | 0:48.5 | So between them goes a bend: a non-linearity, also called an activation function. | F1, F5 |
| n7 | 0:54.3 | In 1991, Kurt Hornik proved that one hidden layer with a bounded non-linear activation and enough units | F2 |
| n8 | 1:01.7 | can get as close as you like to any continuous function on a bounded region. | F2 |
| n9 | 1:08.3 | It promises such a network exists, not that training will find it. | F4 |
| n10 | 1:13.7 | Inside a transformer, the activation sits in one place: the feed-forward layer. In her words: | F5 |
| c17 | 1:20.3 | **c17** (her clip, L02, 5.3 s): "The first layer is a matrix multiplication. Right. The other one is also a matrix multiplication." | F5 |
| n11 | 1:26.2 | Two matrix multiplies, the activation in between. In letters: FFN of x equals act of x W1, times W2. | F5, F8 |
| n12 | 1:34.4 | Here h is the model width. The first matrix widens each vector to 4h, the hidden width. | F7 |
| n13 | 1:41.8 | Picture that bend as a kitchen tap. The water is the content. The hand on the tap is the gate. | F22, F25 (analogy) |
| n14 | 1:50.4 | The 2017 Transformer used ReLU: positive numbers pass as they are, negative numbers become zero. | F6, F9 (512 to 2048: on the panel) |
| n15 | 1:57.0 | Shut or fully open: a switch. In letters, max of zero and x. | F9 |
| n16 | 2:02.8 | To learn, each weight is nudged by its gradient: how much the result moves when that weight moves. | definition (F10, F13) |
| n17 | 2:10.6 | ReLU's gradient is one for positive inputs and zero for negative ones. Cheap both ways. | F10 |
| n18 | 2:17.2 | But if a unit outputs zero for every input, its gradient is zero everywhere. | F13 |
| n19 | 2:23.4 | No water ever reaches it, so it never grows: a dead ReLU. | F13 |
| n20 | 2:28.8 | So, a dimmer instead of a switch. GELU multiplies x by Phi of x. | F14 |
| n21 | 2:35.0 | Phi of x is the chance a standard bell-curve sample falls below x: near one for big x, near zero for very negative x. | F14 |
| n22 | 2:45.2 | The water sets the tap by itself: a strong flow opens it, a negative trickle mostly shuts it. | F14, F22 |
| n23 | 2:53.0 | Her slide 17, with our own curves: small negative inputs still trickle through, so they still get a gradient. | F15; RUN (GELU dip -0.17) |
| n24 | 3:01.2 | BERT and the first GPT used GELU. It costs more than ReLU, but beside the matrix multiplies it is small change. | F16, F17 |
| n25 | 3:10.2 | A sigmoid squeezes any number into an S-curve between zero and one. Alone, its slope is never more than one quarter. | F12 (erratum: 0.25) |
| c15 | 3:19.2 | **c15** (her clip, L02, 2.1 s): "Sigmoid function itself is not good." | slide 18 |
| n26 | 3:21.9 | But as a hand on the tap, it works. x times sigmoid of x: SiLU, the Sigmoid Linear Unit. | F18 |
| n27 | 3:30.1 | Cheaper than GELU, and already in the 2016 GELU paper. | F18, F19 |
| n28 | 3:34.7 | In 2017, a Google Brain team let a computer search through combinations of simple functions. | F21 |
| n29 | 3:41.3 | Swish came out on top: x times sigmoid of beta times x. With beta equal to one, it is exactly SiLU. | F20, F21 |
| n30 | 3:50.3 | The search had re-found a tap that was already in the drawer. | F36, F19 |
| n31 | 3:55.7 | So far, the water turns its own tap: the same x is both the water and the hand. | F22 |
| n32 | 4:03.5 | A gated linear unit gives the tap to a second person: two separate projections of the input, two matrix multiplies. | F23, F25 |
| n33 | 4:12.1 | One becomes the water. A sigmoid of the other decides, number by number, how much of that water gets through. | F23 |
| c6 | 4:20.7 | **c6** (her clip, L02, 8.4 s): "Instead of using the value for the gate and the value for the value itself, they are using two parts. One is just for the gating and the other one is just for the value." | F25 |
| n34 | 4:29.7 | SwiGLU gives that hand a SiLU instead. In letters: SiLU of x W, times x V, then W2. | F24 |
| n35 | 4:37.5 | Three matrices: one makes the gate, one makes the content, one brings the result back down. | F24 |
| n36 | 4:44.5 | On her slide 20, the pen fixes one thing: SwiGLU's gate is SiLU, as her own caption says. | F24 (erratum) |
| n37 | 4:52.3 | Llama, Mistral and OLMo, open models with published designs, all use SwiGLU. Gemma uses a GELU-gated cousin, GeGLU. | F26, F27 |
| n38 | 5:00.1 | Her slide 21 scores them. ReLU: cheap, but zero gradient on negatives. GELU: healthy, but costly. SiLU, in its SwiGLU form, dominates. | slide 21; F10, F13, F17, F26 |
| n39 | 5:09.5 | The gain is small: at the same size and compute, about 1.68 against 1.64 on the paper's score, lower is better. | F28 |
| n40 | 5:18.5 | And why does it work? The paper ends: | F29 |
| n41 | 5:22.3 | "We offer no explanation as to why these architectures seem to work; we attribute their success, as all else, to divine benevolence." | F29 (exact quote) |
| c7 | 5:31.7 | **c7** (her clip, L02, 6.5 s): "A lot of research is experimental research. If you get better results, you can get good explanation." | F37 |
| c8 | 5:38.8 | **c8** (her clip, L02, 3.1 s): "No one will know which one is better until you test it." | F37 |
| n42 | 5:42.5 | Now the bill. Each matrix entry is a weight, a parameter the model learns. The second person needs her own matrix. | F24, F30 |
| n43 | 5:51.5 | A plain layer: two matrices of h by 4h, 8 h-squared weights. A third one adds half again. | F30; RUN (12 h^2 vs 8 h^2) |
| n44 | 5:59.3 | Each weight costs about two arithmetic operations, FLOPs, per token. More weights, more compute. | F32 |
| c20 | 6:05.5 | **c20** (her clip, lecture 3, 3.6 s): "Instead of having four times, maybe we need to have a different dimension." | F7, F31 (lecture 3) |
| n45 | 6:09.7 | Three matrices of h by d_ff hold the same 8 h-squared weights when d_ff is 8/3 of h: two-thirds of 4h, about 2.67h. | F31 |
| n46 | 6:19.5 | The same weights, the same compute: the tap is paid for with a narrower pipe. | F32, F33 |
| n47 | 6:26.1 | In Llama's 7B model, 4 times 4096 would be 16,384. Two-thirds of that is about 10,923, which the code rounds up to 11,008. | F35 |
| n48 | 6:35.9 | Back to the puzzle: one matrix for the water, one for the hand, one for the way back. And two-thirds pays the bill. | F24, F31 |
| n49 | 6:45.7 | A switch, then a dimmer, then a second pair of hands. | F9, F14, F18, F23 |
## 3. Panels (one idea each) and exact on-screen lettering

| # | idea | drawing / slide | code letters (exact words) |
| --- | --- | --- | --- |
| 0 | the puzzle: three matrices, a narrower layer | `line_tap_glass` | "The Gate" · "From ReLU to SwiGLU" · "CSE 291P · Lecture 2 · UC San Diego" · "W" "V" "W2" · "Llama · Mistral · OLMo" · "about 2/3" |
| 1 | linear layers stack into one straight line; a bend fixes it | `line_ruler_curve` | "still one straight line" · "2 · 3 · 5 · 6" · "a bend: activation function" · card "Hornik, 1991: one hidden layer, enough units, close to any continuous function" · "exists ≠ easy to find" |
| 2 | where the bend sits | code boards (area = parameters) | "FFN(x) = act(x W1) W2" · "hidden width 4h" · "h = model width" · card "2017: 512 → 2048 → 512" |
| 3 | the analogy | `line_tap_glass` (closer) | "content (the numbers)" · "the gate" · "act( · )" |
| 4 | ReLU = a switch; gradient defined | `line_switch_dimmer` (left) + ink plot | "ReLU(x) = max(0, x)" · "gradient: how much the result moves" · "1" · "0" |
| 5 | dead ReLU | `line_wilted_plant` | "gradient = 0" · "a dead ReLU" |
| 6 | GELU = a dimmer the water turns | `line_switch_dimmer` (right) + small bell curve | "GELU(x) = x · Φ(x)" · "Φ(x): chance a bell-curve sample is below x" · "big x: open" · "negative x: mostly shut" |
| 7 | GELU keeps a little gradient; who used it | slide 17 taped, plots covered by a blank sheet with our ink curves | "ReLU" · "GELU" · "-0.17" · "still a gradient" · "BERT · GPT · GPT-2's code" · "costs more, still small change" |
| 8 | sigmoid alone is weak; as a gate it makes SiLU | ink plots | "sigmoid" · "slope ≤ 1/4" · "x · sigmoid(x) = SiLU" · "cheaper" · "in the 2016 GELU paper" |
| 9 | the search found Swish (= SiLU at β = 1) | `line_card_catalog` | "x · sigmoid(βx)" · "Swish" · "2017, a Google Brain team: a computer search" · "β = 1: SiLU, 2016" |
| 10 | the gate goes to a second person: GLU, SwiGLU | `line_tap_two_people` | "content: x V" · "gate: SiLU(x W)" · "×" · "then W2" · "W" "V" "W2" · "SwiGLU: (SiLU(x W) × x V) W2" |
| 11 | her two layers; the pen's fixes; who uses it | slide 20 taped, model list covered | "Llama · Mistral · OLMo: SwiGLU" · "Gemma: GeGLU, a cousin" · "SiLU(x2)" (over "sigmoid(x2)") · "compute" (over "latency") |
| 12 | her scorecard | slide 21 taped | red ticks, rings, crosses only (no new words) |
| 13 | small gain, no explanation, test it | note card + taped quote + `line_tiny_lab` | "same size, same compute: 1.68 → 1.64 (lower is better)" · the paper's sentence verbatim (F29) · "test it" |
| 14 | the bill: a third matrix costs half again | `line_balance` + boards | "h × 4h" · "4h × h" · "8h²" · "12h²" · "1 weight ≈ 2 operations per token (FLOPs)" |
| 15 | shrink to two-thirds: same weights, same compute | L03 slide 4 taped + boards | "≈ 2.67h" · "same area" · card "Llama 7B: 4 × 4096 = 16,384 → 2/3 ≈ 10,923 → 11,008 (rounded up)" |
| 16 | bookend | `line_tap_glass` + boards | "2/3" · "switch → dimmer → second pair of hands" |
| - | end card | logo | "After Prof. Yufei Ding's CSE 291P, Lecture 2" · "Who holds the tap?" · "UC San Diego · Picasso Lab" · sources · "The narration is a synthetic voice." |

Slides shown: 17 (plots covered), 20 (model list covered), 21, L03 slide 4. Not shown: 14 (playground: the ruler drawing carries it), 15 (Transformer figure: the code boards carry it), 16, 18, 19 (their content is lettered on our own panels).

Clips used (7, all from the passing list, verbatim): c12, c17, c15, c6, c7, c8, c20 (c20 tagged "lecture 3"). Each is set up by the line before it and never paraphrased as a quote; c15 is followed by the narrator's "But as a hand on the tap, it works" (the brief's pairing); c7 and c8 follow the paper's "no explanation" quote (F29 + F37).

## 4. Word count and runtime

- Narration: 856 words in 50 lines (each 6-25 words); her clips: 7, 33.8 s (8% of the runtime, under a quarter).
- Estimate: 856 / 2.5 = 342.4 s + 33.8 s clips + 57 lines × 0.6 s = 34.2 s → **410.7 s = 6:51** by the brief's formula; 125 narration words per minute (limit 150). At the series' usual +4% voice rate, about 6:37.
- If it must land nearer 6:00: drop n30 (the "re-found drawer" gag, F36), n12 ("h is the model width": letter it only), n43's second sentence (the half-again line: the balance shows it), saving about 37 words, about 18 s.

## 5. Checks against FACTS traps

- Hornik is said with "one hidden layer", "bounded", "enough units" (F2) and paired with the limit (F4); ReLU is not claimed under Hornik.
- SiLU is credited to the 2016 GELU paper before the 2017 search (F19, F20); "Swish" is the paper's name (slide 19 erratum not shown).
- SwiGLU's gate is SiLU (F24); the plain sigmoid gate is named only for GLU (F23); the pen corrects slide 20's table.
- The gain is "small" with the paper's numbers (F28); the paper's no-explanation sentence is quoted exactly (F29).
- Only Llama, Mistral, OLMo named as SwiGLU users; Gemma as GeGLU (F26, F27); the hook names Llama for the two-thirds (F35), not Mistral or PaLM. "Compute", never "latency" (F33). 11,008 is "rounded up" from about 10,923 (F35). Sigmoid slope: "never more than one quarter" (F12).
- No real person drawn; the boy, the girl and the student are invented characters; no tool named.
