# L02-02 · "The Gate: From ReLU to SwiGLU" · draft B

Runtime target 6:00 (this draft: about 6:22). 1080x1920, 30 fps, English. CSE 291P, Prof. Yufei Ding, UC San Diego, Lecture 2 slides 13-21 and Lecture 3 slides 2-4 (worksheet 2).

**Angle B, the worked example first:** two numbers, x = 2 and x = -1, ride through ReLU, GELU and SiLU as ink curves on one set of axes, her slide-21 scorecard fills row by row (its last row held blank until SwiGLU arrives), and the worksheet arithmetic (8h² = 3 h d_ff, d_ff = 8h/3, Llama 7B's 11,008) is the payoff.

Continuity: follows L01-04 (decoding); no decoding recap. The two spine cards ("x = 2", "x = -1") stay pinned in a top corner from panel 0 to panel 16 and are picked up on every function panel.

## 1. Beats

| # | time | panel (on screen: drawing, slide, pen work) | narration / clip | FACTS rows |
| --- | --- | --- | --- | --- |
| 0 | 0:00.5 | **cover**: `line_tap_glass` large (blue wash in the glass); title "The Gate" / "From ReLU to SwiGLU"; strip "CSE 291P · Lecture 2 · UC San Diego" (frame 0 = finished cover). On n1 two note cards slide in at the bottom: "x = 2" and "x = -1" (they stay in a top corner through the film as the spine). | n0-n2 | F26, F31; L02 |
| 1 | 0:21.5 | **the layer**: Code boards, no drawing: a tall strip of h boxes ("h numbers: the model width"), a rectangle W1 drawn as a board, the strip widening to 4h boxes ("hidden width: 4h"), a small "act" gap ringed in red, board W2, back to h. Lettered formula "FFN(x) = act(x W1) W2". During C17 the pen underlines W1, then W2. | n3, n4, C17, n5 | F5, F6, F7, F8 (formula without biases) |
| 2 | 0:48.8 | **rulers**: `line_ruler_curve` fills the frame; pen lettering "matrix x matrix = one matrix" / "still a straight line"; mic tag on C12 with "2, 3, 5, 6 layers" ticked off and a red "no fit". On n8 one ruler is bent by a red pen line: "activation = a bend". On n9-n10 a note card slides over the lower third: "one hidden layer + enough units ≈ any continuous function" / "Hornik 1991 (bounded activations) · 1993: ReLU too" / "exists ≠ how big". | n6, n7, C12, n8, n9, n10 | F1, F2, F3, F4 |
| 3 | 1:31.2 | **ReLU on the axes**: Hand-drawn axes, 80% of the width (blue wash under the positive half). The pen draws ReLU as an ink curve. The two spine cards drop onto x = 2 and x = -1: red dots, lettered "2 → 2" and "-1 → 0". On n12 slope tags "slope 1" / "slope 0" and "gradient: which way to nudge a weight". | n11, n12 | F6, F9, F10, F11; computed |
| 4 | 1:47.6 | **dead unit**: `line_wilted_plant` (empty watering can); the red pen letters "gradient 0 → no water" and "dead ReLU"; the "-1 → 0" card pinned on the can. | n13 | F13 |
| 5 | 1:55.8 | **switch and dimmer**: `line_switch_dimmer` fills the frame; switch labelled "ReLU: on / off", dimmer "GELU: smooth"; then the frame slides up into panel 6. | n14 (first half) | F9, F15 |
| 6 | 1:55.8 | **her slide 17**: Slide 17 taped; its two plots covered by a blank taped sheet. On the sheet: the same axes, ReLU in pencil, GELU drawn in ink over it. Lettered "GELU(x) = x · Φ(x)", "Φ(x): chance a bell-curve sample falls below x". Gate cards: "x = 2: gate 0.98 → 1.95", "x = -1: gate 0.16 → -0.16", the dip ringed "a little gradient". Small: "BERT, first GPT" and "cost: small change next to the matmuls". | n14 (second half), n15, n16, n17 | F14, F15, F16, F17; computed |
| 7 | 2:26.2 | **SiLU on the axes**: Back to the big axes. A sigmoid S drawn in pencil, "0 to 1" brackets; mic tag on C15; then "slope ≤ 1/4"; the pen multiplies: "x · sigmoid(x) = SiLU" and inks SiLU beside the pencil GELU. Gate cards: "x = 2: gate 0.88 → 1.76", "x = -1: gate 0.27 → -0.27". | n18, C15, n19, n20, n21 | F12, F18; computed |
| 8 | 2:55.7 | **the search**: `line_card_catalog`, one drawer pulled; card in the drawer "x · sigmoid(βx) = Swish"; "β = 1: SiLU"; small "named SiLU in 2016 · Swish search 2017". | n22, n23 | F19, F20, F21, F36 |
| 9 | 3:10.9 | **her scorecard**: Slide 21 taped, full frame. Rows fill in turn: the pen ticks ReLU's first two cells, crosses GELU's, draws "~" on SiLU's; row 3 three ticks; row 4 ReLU's cross ringed with the "-1 → 0" card beside it. The last row gets a strip of blank tape with "?". | n24, n25 | L02 s21; F10, F11, F13, F15, F17, F18 |
| 10 | 3:25.7 | **two hands**: `line_tap_two_people` fills the frame (blue wash in the pipe). First a small inset callback of `line_tap_glass` lettered "SiLU: x is the water and the hand", then the full drawing: the pourer lettered "content", the valve wheel "gate". During C6 the pen underlines "gating" and "value" on the caption; on n28 "two projections". | n26, n27, C6, n28 | F22, F23, F25 |
| 11 | 3:57.0 | **her slide 20, worked**: Slide 20 taped (model list covered by blank tape). The pen traces W1 → Swish → ⊗ ← V; lettered "SiLU(x W) · (x V) → W2". In the table, "sigmoid(x2)" struck in red, "SiLU" written above; the caption under the figure ringed. Worked cards beside the ⊗: "content 2 · gate 2 → SiLU 1.76 → 3.52" and "content 2 · gate -1 → SiLU -0.27 → -0.54 (nearly shut)". Last: the three trapezoids lettered "gate · content · back down". | n29, n30, n31, n32 | F24, F25; computed |
| 12 | 4:27.0 | **who uses it**: Zoom to the blank tape over slide 20's list: code letters "Llama · Mistral · OLMo: SwiGLU", "PaLM: SwiGLU", "Gemma: GeGLU". Cut back to slide 21: the "?" strip peels off, a tick written "SiLU, esp. SwiGLU". Note card: "same size, same compute: 1.68 → 1.64 (lower is better)", the arrow drawn short. | n33, n34, n35 | F26, F27, F28; L02 s21 |
| 13 | 4:46.8 | **test it**: `line_tiny_lab` (warm wash); mic tag on C8; then a taped paper card, lettered in typewriter: "We offer no explanation as to why these architectures seem to work; we attribute their success, as all else, to divine benevolence." with "Shazeer, 2020"; the red pen underlines "no explanation" during C7. | C8, n36, C7 | F28, F29, F37 |
| 14 | 5:06.2 | **the bill**: L03 slide 4 taped, the worksheet box in focus; mic tag "lecture 3" on C20. Then below it the code boards: two h × 4h boards ("8h²"), a ghost third board in pencil ("12h², 1.5x") struck; three narrower h × d_ff boards whose total area matches the two; "3 h d_ff = 8h²" → "d_ff = 8h/3 ≈ 2.67h"; the slide's red "2/3" ringed. On n42 `line_balance` slides in under the boards: one pan "2 boards", the other "3 boards", level; "1 weight ≈ 2 FLOPs per token". | n37, C20, n38, n39, n40, n41, n42 | F30, F31, F32, F33; FACTS RUN |
| 15 | 5:53.1 | **Llama 7B**: Code boards at true proportion for h = 4096: "4h = 16,384" (pencil, struck), "2/3 → 10,923", "rounded up → 11,008". Under them two tallies: "135,266,304 weights (3 boards)" vs "134,217,728 (2 boards)", "≈ the same". | n43, n44 | F35; computed |
| 16 | 6:07.9 | **bookend**: The cover layout again: `line_tap_glass`, the "x = 2" card walks along a row of small labels "ReLU 2 · GELU 1.95 · SiLU 1.76 · SwiGLU: a second hand"; then "3 matrices · 2/3 the width · same compute". | n45, n46 | computed; F22, F31, F32 |
| - | 6:21 | **end card**: The logo; "After Prof. Yufei Ding's CSE 291P, Lecture 2 and Lecture 3" / "The gate decides." / "UC San Diego · Picasso Lab"; small print: the sources (Hornik 1991; Leshno et al. 1993; Vaswani et al. 2017; Hendrycks & Gimpel 2016; Ramachandran et al. 2017; Dauphin et al. 2017; Shazeer 2020; Touvron et al. 2023), "The narration is a synthetic voice." | - | - |

## 2. Narration and clips (in play order)

Times: narration at 2.5 words/s, clips at their checked lengths, 0.6 s gap after every line; narration starts at 0:00.5.

| id | at | line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.5 | Llama, Mistral and OLMo all build with the same three-matrix trick. The textbook way to pay for it: shrink the layer's middle to two-thirds. | F26, F31 (SHAZEER20's 2/3 recipe); work-order hook, softened |
| n1 | 0:10.7 | Why two-thirds? Follow two numbers, 2 and minus 1, to the answer. | computed (x = 2, x = -1) |
| n2 | 0:16.1 | From Professor Yufei Ding's CSE 291P at UC San Diego: the gate. | L02 source key |
| n3 | 0:21.5 | A matrix multiply, or linear layer, turns a list of numbers into weighted sums of them. | F5 (definition) |
| n4 | 0:28.5 | The feed-forward layer is two matrix multiplies with an activation in between. | F5 |
| c17 | 0:33.9 | her clip C17: "The first layer is a matrix multiplication. Right. The other one is also a matrix multiplication." | clips.json, verbatim |
| n5 | 0:39.8 | The first widens the list from h numbers, the model width, to 4h, the hidden width. The second squeezes it back. | F6, F7 |
| n6 | 0:48.8 | Why the activation? Stack matrix multiplies all you like: together they are still one straight-line map. | F1 |
| n7 | 0:55.8 | Straight rulers never trace a curve. Her class demo: | F1 |
| c12 | 1:00.0 | her clip C12: "Instead of having two layers, you can have three or five or six, it doesn't really converge at all." | clips.json, verbatim |
| n8 | 1:05.4 | An activation function bends each number on its own. That bend is called a non-linearity. | F5 (definition) |
| n9 | 1:12.0 | With it, one hidden layer with enough units can get as close as you like to any continuous function on a bounded region. | F2 |
| n10 | 1:21.8 | Hornik proved it in 1991 for bounded activations; a 1993 follow-up covered ReLU. It says such a network exists, not how big. | F2, F3, F4 |
| n11 | 1:31.2 | Our two numbers. The 2017 Transformer used ReLU: positives pass unchanged, negatives become zero. 2 stays 2; minus 1 becomes 0. | F6, F9; computed |
| n12 | 1:40.2 | Training nudges each weight along its slope, the gradient. ReLU's is one for positives, zero for negatives. | F10 (gradient defined) |
| n13 | 1:47.6 | So minus 1 sends nothing back. A unit that outputs zero for every input stops learning: a dead ReLU. | F13 |
| n14 | 1:55.8 | GELU is a dimmer. It multiplies x by Phi of x, the chance a standard bell-curve sample falls below x. | F14 |
| n15 | 2:04.4 | Read Phi as a gate from 0 to 1. For 2 it's 0.98: out comes 1.95. | F14; computed |
| n16 | 2:11.4 | For minus 1 it's 0.16: out comes minus 0.16, and a little gradient still flows. | F15; computed |
| n17 | 2:18.0 | BERT and the first GPT used it. It costs more than ReLU: small change next to the matrix multiplies. | F16, F17 |
| n18 | 2:26.2 | A sigmoid squashes any number into the range 0 to 1, along an S-shaped curve. | F18 (definition) |
| c15 | 2:32.8 | her clip C15: "Sigmoid function itself is not good." | clips.json, verbatim |
| n19 | 2:35.5 | Its slope never tops one quarter. But as a gate, times x, it works. | F12, F18 |
| n20 | 2:41.7 | That's SiLU, the Sigmoid Linear Unit: x times sigmoid of x, cheaper than GELU. | F18 |
| n21 | 2:47.9 | For 2 the gate is 0.88: out comes 1.76. For minus 1 it's 0.27: out comes minus 0.27. | computed |
| n22 | 2:55.7 | The GELU paper named it in 2016. In 2017, a Google Brain team's computer search through simple functions landed on Swish. | F19, F21 |
| n23 | 3:04.7 | Swish adds a knob, beta. With beta equal to one, it is exactly SiLU. | F20, F36 |
| n24 | 3:10.9 | Her slide 21 keeps score. Cheap forward? Cheap gradient? ReLU: yes, yes. GELU: no, no. SiLU: so-so. | L02 s21; F10, F17, F18 |
| n25 | 3:18.3 | Healthy output size? All three. Healthy gradients? Not ReLU: zero on all negatives. The last row waits. | L02 s21; F11, F13, F15 |
| n26 | 3:25.7 | GELU and SiLU are both x times a gate. In SiLU, x is both the water and the hand on the tap. | F14, F18, F22 |
| n27 | 3:35.1 | A gated linear unit gives those two jobs to two hands. Her slide 20: | F23; L02 s20 |
| c6 | 3:41.3 | her clip C6: "Instead of using the value for the gate and the value for the value itself, they are using two parts. One is just for the gating and the other one is just for the value." | clips.json, verbatim |
| n28 | 3:50.4 | Two separate projections: a sigmoid of one decides how much of the other gets through. | F23 |
| n29 | 3:57.0 | SwiGLU swaps that sigmoid for SiLU: SiLU of x W, times x V, then times W2. | F24 |
| n30 | 4:04.0 | Her table says sigmoid; the caption under her own figure says SiLU. The gate is SiLU. | F24 (slide 20 erratum) |
| n31 | 4:11.0 | Content 2, gate number 2: SiLU gives 1.76, out comes 3.52. Gate minus 1: out comes minus 0.54, nearly shut. | computed |
| n32 | 4:19.6 | Three matrices: gate, content, and one back down. The trick is separating the gate from the content. | F24, F25 |
| n33 | 4:27.0 | Llama, Mistral and OLMo, open models with published designs, use SwiGLU; so did PaLM. Gemma uses a cousin, GeGLU. | F26, F27 |
| n34 | 4:35.2 | So her last row fills in: SiLU, especially in SwiGLU. | L02 s21; F26 |
| n35 | 4:39.8 | Better, but only a little: same size, same compute, about 1.68 against 1.64, lower is better. | F28 |
| c8 | 4:46.8 | her clip C8: "No one will know which one is better until you test it." | clips.json, verbatim |
| n36 | 4:50.4 | Why does it work? The SwiGLU paper ends: "We offer no explanation as to why these architectures seem to work." | F29 (exact quote; the card letters the full sentence) |
| c7 | 4:59.0 | her clip C7: "A lot of research is experimental research. If you get better results, you can get good explanation." | clips.json, verbatim |
| n37 | 5:06.2 | Now the bill. The weights training learns are called parameters, and a third matrix adds more. Her worksheet: | F30 (parameters defined) |
| c20 | 5:14.0 | her clip C20 (mic tag "lecture 3"): "Instead of having four times, maybe we need to have a different dimension." | clips.json, verbatim |
| n38 | 5:18.1 | Count. The plain layer: two matrices of h by 4h, 8 h-squared weights. | F30 |
| n39 | 5:23.9 | Keep 4h with three matrices, and it's 12 h-squared: one and a half times as many. | FACTS RUN (12 h^2 vs 8 h^2) |
| n40 | 5:30.9 | So call the hidden width d_ff. Three matrices of h by d_ff: 3 h d_ff. Set that equal to 8 h-squared. | F31 |
| n41 | 5:39.9 | d_ff comes out at 8/3 of h: two-thirds of 4h, about 2.67h. | F31 |
| n42 | 5:45.3 | Each weight costs about two operations per token, a multiply and an add: FLOPs. Equal weights, equal compute. | F32, F33 |
| n43 | 5:53.1 | Llama's 7B: model width 4096, so 4h is 16,384. Two-thirds is about 10,923; the code rounds up to 11,008. | F35 |
| n44 | 6:01.3 | Per layer: about 135 million weights now, 134 million before. Near enough the same bill. | computed (new, see below) |
| n45 | 6:07.9 | Follow the 2 once more: ReLU kept it, GELU and SiLU dimmed it, SwiGLU gave the tap to a second hand. | computed; F22, F25 |
| n46 | 6:16.9 | Three matrices, a narrower middle, the same compute. That's the two-thirds. | F31, F32 |

Notes on wording:
- n0 softens the work-order hook. "Almost every big model" is slide 20's claim, which FACTS F26 narrows to Llama, Mistral and OLMo. The two-thirds is called "the textbook way" because it is the recipe from the paper and the worksheet (F31, SHAZEER20), not something every model does. Llama follows it (F35). Mistral 7B's hidden width is 14,336 = 3.5 x 4096, so it does not (from memory of its config, not in FACTS: check before relying on it; the draft never says Mistral shrank to two-thirds). PaLM is not said to shrink either (Traps).
- n10 keeps the theorem honest: Hornik for bounded activations, the 1993 follow-up for ReLU, "exists, not how big" (F2, F3, F4; Traps).
- n19 states the sigmoid's slope as at most one quarter (F12 erratum: never 0.75).
- n29-n30: the gate is SiLU, never a plain sigmoid (F24, Traps). The pen fixes slide 20's table on screen.
- n35: "only a little", with the paper's own numbers (F28; Traps: never "much better").
- n36 speaks the first half of the paper's sentence, word for word. The card letters the whole sentence (F29).
- n42 says "compute", never "latency" (F33).
- n43: 11,008 is "rounded up", never "exactly 8/3 h" (F35, Traps).

## 3. Panel list (one idea each) and the exact lettering

| panel | idea | code letters |
| --- | --- | --- |
| 0 cover | the gate idea + the puzzle | The Gate · From ReLU to SwiGLU · CSE 291P · Lecture 2 · UC San Diego · x = 2 · x = -1 |
| 1 the layer | what a feed-forward layer is | h numbers: the model width · hidden width: 4h · act · W1 · W2 · FFN(x) = act(x W1) W2 |
| 2 rulers | why a non-linearity | matrix x matrix = one matrix · still a straight line · 2, 3, 5, 6 layers · no fit · activation = a bend · one hidden layer + enough units ≈ any continuous function · Hornik 1991 (bounded activations) · 1993: ReLU too · exists ≠ how big |
| 3 ReLU on the axes | ReLU on the two numbers | ReLU(x) = max(0, x) · 2 → 2 · -1 → 0 · slope 1 · slope 0 · gradient: which way to nudge a weight |
| 4 dead unit | dead ReLU | gradient 0 → no water · dead ReLU |
| 5 switch and dimmer | hard cut vs smooth | ReLU: on / off · GELU: smooth |
| 6 her slide 17 | GELU on the two numbers | GELU(x) = x · Φ(x) · Φ(x): chance a bell-curve sample falls below x · x = 2: gate 0.98 → 1.95 · x = -1: gate 0.16 → -0.16 · a little gradient · BERT, first GPT · cost: small change next to the matmuls |
| 7 SiLU on the axes | sigmoid as a gate = SiLU, on the two numbers | sigmoid: 0 to 1 · slope ≤ 1/4 · x · sigmoid(x) = SiLU · x = 2: gate 0.88 → 1.76 · x = -1: gate 0.27 → -0.27 |
| 8 the search | Swish = SiLU re-found | x · sigmoid(βx) = Swish · β = 1: SiLU · named SiLU in 2016 · Swish search 2017 |
| 9 her scorecard | the three scored | (her table) red ticks, crosses, "~"; blank tape with ? on the last row |
| 10 two hands | gate separate from content | SiLU: x is the water and the hand · content · gate · two projections |
| 11 her slide 20, worked | SwiGLU on worked numbers | SiLU(x W) · (x V) → W2 · sigmoid struck → SiLU · content 2 · gate 2 → SiLU 1.76 → 3.52 · content 2 · gate -1 → SiLU -0.27 → -0.54 (nearly shut) · gate · content · back down |
| 12 who uses it | the last row + how much better | Llama · Mistral · OLMo: SwiGLU · PaLM: SwiGLU · Gemma: GeGLU · SiLU, esp. SwiGLU · same size, same compute: 1.68 → 1.64 (lower is better) |
| 13 test it | results before explanations | We offer no explanation as to why these architectures seem to work; we attribute their success, as all else, to divine benevolence. · Shazeer, 2020 |
| 14 the bill | the 2/3 arithmetic | 8h² · 12h², 1.5x · 3 h d_ff = 8h² · d_ff = 8h/3 ≈ 2.67h · 2 boards · 3 boards · 1 weight ≈ 2 FLOPs per token |
| 15 Llama 7B | a real width | h = 4096 · 4h = 16,384 · 2/3 → 10,923 · rounded up → 11,008 · 135,266,304 weights (3 boards) · 134,217,728 (2 boards) · ≈ the same |
| 16 bookend | the 2's whole trip | ReLU 2 · GELU 1.95 · SiLU 1.76 · SwiGLU: a second hand · 3 matrices · 2/3 the width · same compute |

17 panels plus the end card (the brief asks for 12-15). Panel 5 is a short bridge and can fold into panel 6 by sliding the dimmer drawing off as the slide comes in. That gives 16.

Drawings used: `line_tap_glass`, `line_ruler_curve`, `line_wilted_plant`, `line_switch_dimmer`, `line_card_catalog`, `line_tap_two_people`, `line_tiny_lab`, `line_balance`. Slides: 17 (plots covered), 20 (model list covered), 21, L03-4. No new drawings.

## 4. Computed numbers (new; to add to FACTS.md, section Computed)

Every value below was computed tonight. On screen these are labelled as plain arithmetic. None of them is a claim about a paper.

```
x = 2   : ReLU 2   | Phi(2) = 0.977  GELU 1.954 | sigmoid(2) = 0.881  SiLU 1.762
x = -1  : ReLU 0   | Phi(-1) = 0.159 GELU -0.159 | sigmoid(-1) = 0.269 SiLU -0.269
SwiGLU worked (content 2): gate 2 -> SiLU(2) = 1.762 -> 3.524 ; gate -1 -> SiLU(-1) = -0.269 -> -0.538
Llama 7B per-layer FFN weights: 3 * 4096 * 11008 = 135,266,304 ; 2 * 4096 * 16384 = 134,217,728 ; (3 * 4096 * 16384 = 201,326,592)
```
Command:
```
~/miniforge3/bin/python3 -c "
import math
Phi=lambda x:0.5*(1+math.erf(x/2**.5)); sig=lambda x:1/(1+math.exp(-x))
for x in (2,-1):
  print(x, 'relu',max(0,x),'Phi',round(Phi(x),3),'gelu',round(x*Phi(x),3),'sig',round(sig(x),3),'silu',round(x*sig(x),3))
print('swiglu gate silu(2)*content(-1)=', round(2*sig(2)*-1,3), 'silu(-1)*content 2=', round(-1*sig(-1)*2,3))
h=4096; print(3*h*11008, 2*h*4*h, 3*h*4*h)"
```
(The SwiGLU line prints -1.762 for gate 2 times content -1. The script uses content 2, which gives 2 x 1.762 = 3.524 and 2 x -0.269 = -0.538.) Rounding as spoken: 0.98, 1.95, 0.16, -0.16, 0.88, 1.76, 0.27, -0.27, 3.52, -0.54, "about 135 million" and "134 million".

Suggested FACTS rows:
- F38 (RUN) "2 through ReLU, GELU, SiLU gives 2, 1.95, 1.76; -1 gives 0, -0.16, -0.27; the gates are 0.98 / 0.16 (Phi) and 0.88 / 0.27 (sigmoid)." Safe wording: as spoken in n11, n15, n16, n21.
- F39 (RUN) "SwiGLU with content 2: gate number 2 gives 3.52, gate number -1 gives -0.54." Safe wording: n31. The numbers are made up for the example.
- F40 (RUN) "Llama 7B FFN per layer: 135,266,304 weights with 3 x 4096 x 11,008, against 134,217,728 for 2 x 4096 x 16,384." Safe wording: "about 135 million against 134 million: near enough the same."

## 5. Word count and runtime

- Narration: 788 words in 47 lines (n0-n46). Every line is 6-25 words.
- Clips: 7 (C17 5.3 s, C12 4.8 s, C15 2.1 s, C6 8.4 s, C8 3.1 s, C7 6.5 s, C20 3.6 s): 33.8 s, 9% of the runtime (cap 25%).
- Estimate: 0.5 s lead + 788 / 2.5 = 315.2 s + 33.8 s clips + 0.6 s x 54 lines = 381.9 s, about 6:21.9.
- Pace: 124 narration words per minute (cap 150).
- To reach 6:00, cut n17's second sentence, n23, and the PaLM clause in n33 (about 25 words, 10 s), or fold panel 5 into panel 6.
