# L04-01 "584 Years on One GPU" - script

CSE 291P Lecture 4 (slides 7-14, recording 10:43-20:09) + Lecture 5 slide 3. Runtime 292.5 s; 531 narration words; 15 panels; 5 clips. Built from data by `~/picasso-work/daily/L04-01/scripts/build.py` (panels) and `plan.py` (timeline).

Angle: the worked example first (her slides 10-13 are the spine), carried by one kitchen picture: the work is a mountain of ingredients, a GPU is one cook at one stove, 16,000 GPUs a hall of cooks.

## Beats

| Panel | Picture | Lines | FACTS |
| --- | --- | --- | --- |
| p0 | cover: the manager hands the young chef an endless order ticket; hook (F1, F11) | n0, n0b | |
| p1 | her classroom scenario, slide 10; her C1 (F1) | n1, c1 | |
| p2 | scaling laws: bigger models + more data -> lower loss (F2); slide 9 plot not shown | n2 | |
| p3 | first step: count the FLOPs; 405B params, 15T tokens; Chinchilla 20, Llama 3 37 (F3, F4) | n3, n4, n5 | |
| p4 | forward 2 + backward 4 = 6 (F5, F8, F9); her C11 (L05) | n6, n7, n8, c11, n9 | |
| p5 | her slide 11, scenario + the compute line (F6, F7, F23) | n10, n11 | |
| p6 | the work as a mountain, one GPU = one cook (picture only) | n12 | |
| p7 | her slide 12 (references cropped out): 1,979 TFLOPS FP8 peak; 1.84e10 s; 584 years (F10, F11); her C4 | n13, c4, n14 | |
| p8 | 584 years: started in the 1440s (F12) | n15 | |
| p9 | up to 16,000 H100s: about 13 days (F13, F14); her C6 | n16, n17, c6 | |
| p10 | her slide 13, lower half: the factor of four; errata 13.5 -> 13 and FP16 -> BF16 corrected in red (F13, F18) | n18 | |
| p11 | MFU 38-43%, call it 40: about 2x (F15, F16) | n19, n20 | |
| p12 | 54-day stretch: 466 interruptions, 419 unexpected, ~78% hardware (F17, F20) | n21 | |
| p13 | 16-bit not FP8: half the peak (F18); 13 x 2 x 2 close to 54 (F19) | n22, n23 | |
| p14 | count the FLOPs first; one GPU is hopeless; next: the cluster (F21, F22); her C10 | n24, c10, n25 | |

## Narration and clips (in order)

- **n0** (0.4 s): End of 2023. In her scenario, your job is to train a 405-billion-parameter model in four months.
- **n0b** (9.2 s): On one GPU, even at full speed, it would take 584 years. How can you know that before you start?
- **n1** (18.2 s): It's a scenario Prof. Ding gives in her course, CSE 291P, as it turns to training: you, a huge job, and a deadline.
- **c1** (28.1 s) HER CLIP, L04 740.50-745.65: "I think you should be excited. Usually like getting the resources is the first step."
- **n2** (35.0 s): Why so huge? Bigger models and more data give lower loss. Those are the scaling laws, from 2020. So the jobs only grow.
- **n3** (45.5 s): Before you touch a single GPU, there is a quicker first step.
- **n4** (50.7 s): FLOPs are floating-point operations: the multiplies and adds a chip does. This model has 405 billion parameters, the numbers it learns, and it reads about 15 trillion tokens, pieces of words.
- **n5** (65.7 s): A 2022 rule of thumb, Chinchilla, says about 20 tokens per parameter. Llama 3 used about 37.
- **n6** (75.4 s): Now the rule. Training costs about six operations per parameter, per token. Where does six come from?
- **n7** (83.1 s): Going forward, every weight does a multiply and an add for every token. That's two.
- **n8** (89.7 s): Going backward costs twice that. Here is why, in her words.
- **c11** (94.6 s) HER CLIP, L05 514.60-523.15: "So that's why in the forward, you have one time. In the backward, because you are doing the computation for both input and weight. So that's why you have two copies."
- **n9** (104.3 s): One gradient for the input, one for the weights: how each number should change. Two plus four makes six.
- **n10** (112.3 s): So multiply. Six, times 405 billion, times 15 trillion. That's 3.645 times ten to the 25 operations.
- **n11** (123.6 s): The paper itself reports 3.8 times ten to the 25: the same rule, with its 15.6 trillion tokens. It's an estimate. It counts the big matrix multiplies and little else.
- **n12** (138.1 s): Picture that work as a mountain of ingredients, and one GPU as one cook at one stove.
- **n13** (145.6 s): One H100 GPU, using 8-bit numbers called FP8, peaks at 1,979 trillion operations a second. That's without sparsity, a trick for skipping zeros, and at 100 percent, all the time.
- **c4** (161.6 s) HER CLIP, L04 970.05-973.60: "I guess no matter what is the result, you cannot bear with it, right?"
- **n14** (166.3 s): Divide. About 1.84 times ten to the ten seconds. About 584 years.
- **n15** (174.5 s): A GPU that started in the 1440s would just about be finishing.
- **n16** (180.8 s): But Llama 3 was trained on up to 16,000 H100s. Split the mountain that many ways, at full speed, and it's about 13 days.
- **n17** (191.4 s): Thirteen days. Easy? Then she asks the class.
- **c6** (195.6 s) HER CLIP, L04 1016.80-1021.95: "Do you know what is the real time they are having there? 54 days."
- **n18** (202.6 s): Her slide hunts for the missing factor of four. First.
- **n19** (207.6 s): MFU, model FLOPs utilization, is the share of the peak you actually use. Llama 3 kept 38 to 43 percent. At 40 percent, it runs two and a half times slower.
- **n20** (220.9 s): Why not 100 percent? Cooks wait on each other, and on memory. Her list.
- **n21** (227.1 s): And things break. The paper gives no single total time. It reports a 54-day stretch of pre-training with 466 interruptions. 419 were unexpected, and about 78 percent of those were hardware, GPUs most of all.
- **n22** (245.6 s): Second. Llama 3 trained in 16-bit numbers, not FP8, and in 16-bit the H100 peaks at half its FP8 speed. Another two times.
- **n23** (257.4 s): Her slide rounds both factors to two: 13 days times four, about 54 days. With two and a half, it's nearer two months. Either way, weeks, not centuries.
- **n24** (269.8 s): The lesson. Count the FLOPs first, and the rest follows.
- **c10** (274.1 s) HER CLIP, L04 1148.25-1151.60: "So you do the calculation, you only use flops, you get the final result."
- **n25** (278.8 s): And the count says one GPU is hopeless. Training has to be spread over thousands of them. Next: what is inside a cluster like that.

## Clips

| Id | Lecture | Window (s) | Text | Check |
| --- | --- | --- | --- | --- |
| C1 | L04 | 740.50-745.65 | I think you should be excited. Usually like getting the resources is the first step. | see check.json |
| C4 | L04 | 970.05-973.60 | I guess no matter what is the result, you cannot bear with it, right? | see check.json |
| C6 | L04 | 1016.80-1021.95 | Do you know what is the real time they are having there? 54 days. | see check.json |
| C10 | L04 | 1148.25-1151.60 | So you do the calculation, you only use flops, you get the final result. | see check.json |
| C11 | L05 | 514.60-523.15 | So that's why in the forward, you have one time. In the backward, because you are doing the computation for both input and weight. So that's why you have two copies. | see check.json |

## Facts

Every number traced to FACTS.md: F1 (scenario), F2 (scaling laws), F3-F4 (405B, 15T, 20, 37), F5-F9 (six), F6-F7 (3.645e25, 3.8e25), F10-F12 (1,979 TFLOPS, 1.84e10 s, 584 years, 1440s), F13-F14 (16,000, 13 days), F15-F19, F24-F26 (38-43%, 2.5x, 2x, 54 on her slide, nearer two months, FP8 = 8-bit), F17/F20 (54-day stretch, 466, 419, 78%), F22 (next).

## Art

Library drawings (pre-drawn 2026-10-14): line_train_giant_order (cover), line_train_envelope_sums, line_train_two_pots, line_train_chef_mountain, line_train_long_beard, line_train_calendar_flurry, line_train_kitchen_hall, line_train_waiting_chefs, line_train_blown_fuse, line_train_scoop_spoon. Reused: line_manager_2, line_grow, line_gpu, line_mic. Not made: line_cover_l04_01 (the cover uses line_train_giant_order).
