# Fact brief: L01-04 "Temperature and Top-p" (CSE 291P Lecture 1, slides 25-34)

The rule for this episode: every number, title, name and quote on screen, in the voice-over or in the post comes from
this brief, worded the way it is worded here. A line that needs a fact not listed here is not cleared.
Checked on 2026-10-08 (02:00-02:30). For L01 the PDF page equals the slide number (letter pages). Recording span:
L01 50:41-68:13 (slides 25-34). Full research notes with quotes, URLs and commands:
`~/picasso-work/daily/L01-04/research_A.md` (decoding papers) and `research_B.md` (API reference, nondeterminism,
tokenizer counts); summarized here. The dog chart is ours: made-up odds, computed by `scripts/odds.py` in the work
folder, the same rounding as the kit's `bars` item.

## Source key
| Key | Source | Where read |
| --- | --- | --- |
| **L01** | CSE 291P "LLM System Optimization", Lecture 1, Yufei Ding, UC San Diego: slides 25-34, recording 50:41-68:13 | `course/L01.pdf`, `L01.txt`, `L01.words.json` (git-ignored) |
| **HF2020** | Patrick von Platen, "How to generate text: using different decoding methods for language generation with Transformers", Hugging Face blog, 1 Mar 2020 (edited Jul 2023). Sections Greedy Search, Beam search, Sampling, Top-K, Top-p; figures greedy_search, beam_search, top_k_sampling, top_p_sampling | huggingface.co/blog/how-to-generate; source md on github.com/huggingface/blog |
| **FAN2018** | Fan, Lewis, Dauphin, "Hierarchical Neural Story Generation", ACL 2018, pp. 889-898, arXiv:1805.04833. Sec. 5.4: "We randomly sample from the k = 10 most likely candidates"; "Sentences produced by beam search tend to be short and generic." | aclanthology.org/P18-1082 |
| **HOL2020** | Holtzman, Buys, Du, Forbes, Choi, "The Curious Case of Neural Text Degeneration", ICLR 2020, arXiv:1904.09751. Sec. 3.1 (top-p = "the smallest set such that" its probability is ">= p"), Sec. 3.2 (a constant k is "sub-optimal across varying contexts"), Sec. 3.3 (temperature), Table 1 (main setting p = 0.95), Fig. 9 ("values of p are usually in [0.9, 1)"), abstract ("bland, incoherent, or gets stuck in repetitive loops") | arxiv.org/abs/1904.09751 |
| **WU2016** | Wu et al. (2016), "Google's Neural Machine Translation System", arXiv:1609.08144, Sec. 7: "Without some form of length-normalization regular beam search will favor shorter results over longer ones" | arxiv.org/abs/1609.08144 |
| **HIN2015** | Hinton, Vinyals, Dean (2015), "Distilling the Knowledge in a Neural Network", arXiv:1503.02531, Eq. (1) q_i = exp(z_i/T) / sum_j exp(z_j/T); "Using a higher value for T produces a softer probability distribution" | arxiv.org/abs/1503.02531 |
| **WANG2023** | Xuezhi Wang et al., "Self-Consistency Improves Chain of Thought Reasoning in Language Models", arXiv:2203.11171 (Mar 2022), ICLR 2023. Abstract ("samples a diverse set of reasoning paths ... selects the most consistent answer"), Sec. 2 ("a majority vote"), Sec. 5 ("it incurs more computation cost ... try a small number of paths (e.g., 5 or 10)") | arxiv.org/abs/2203.11171 |
| **OAI2024** | OpenAI, "Learning to Reason with LLMs", 12 Sep 2024: performance "consistently improves with more reinforcement learning (train-time compute) and with more time spent thinking (test-time compute)" (no numbers used) | openai.com/index/learning-to-reason-with-llms (Wayback 2024-09-13) |
| **OAPI** | OpenAI API reference, Responses "Create a model response" and Chat Completions "Create chat completion" (developers.openai.com, read 2026-10-08) and the OpenAPI spec (openai-openapi, defaults): temperature "between 0 and 2", default 1; "Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend altering this or `top_p` but not both."; top_p 0-1, default 1, "nucleus sampling ... So 0.1 means only the tokens comprising the top 10% probability mass are considered"; max_output_tokens "An upper bound for the number of tokens that can be generated for a response, including visible output tokens and reasoning tokens"; presence_penalty / frequency_penalty (Chat Completions) -2.0 to 2.0, default 0, "penalize new tokens based on whether they appear in the text so far" / "based on their existing frequency in the text so far"; seed (Chat Completions, Beta, now marked deprecated): "best effort ... Determinism is not guaranteed" | developers.openai.com/api/reference; github.com/openai/openai-openapi |
| **TML2025** | Horace He and Thinking Machines Lab, "Defeating Nondeterminism in LLM Inference", 10 Sep 2025: "even when we adjust the temperature down to 0 ... LLM APIs are still not deterministic in practice"; main cause: the server's load, and so its batch size, varies; experiment: 1000 completions at temperature 0 of one prompt gave "80 unique completions"; with batch-invariant kernels "all of our 1000 completions are identical" | thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference |
| **NIPS2025** | Yuan et al., "Understanding and Mitigating Numerical Sources of Nondeterminism in LLM Inference", NeurIPS 2025 (oral); arXiv:2506.09501 | neurips.cc/virtual/2025/oral/118170 (probably the paper she mentions; not proven) |
| **HFT** | Hugging Face transformers, `TemperatureLogitsWarper` docstring: "with `0` being equivalent to shifting all probability mass to the most likely token" | github.com/huggingface/transformers, generation/logits_process.py |
| **TIK** | tiktoken 0.14.0 (`~/picasso-work/venv`): `gpt2` n_vocab 50,257; `o200k_base` n_vocab 200,019 | research_B.md, "computed" |
| **RUN** | our computations, below | this file |

## Computed (RUN)
- `~/picasso-work/venv/bin/python -c "import tiktoken; ..."` (research_B.md, "computed"):
  `gpt2` "I have a dream" -> [40, 423, 257, 4320] (matches slide 27); `o200k_base` "The weather today is" ->
  [976, 11122, 4044, 382] (4 tokens: The / weather / today / is); "The cat sat on the" -> 5 tokens; `o200k_base`
  n_vocab 200,019 (199,998 regular + 2 special; the highest id + 1): say "about 200,000 entries".
- Tree products (HF2020 figure labels): greedy The-nice-woman 0.5 x 0.4 = 0.20; beam The-dog-has 0.4 x 0.9 = 0.36.
- The dog chart, "My dog loves ...", made-up odds at T = 1: walks 45%, treats 30%, naps 12%, sticks 8%, baths 4%,
  homework 1% (logits = their natural logs: -0.7985, -1.204, -2.1203, -2.5257, -3.2189, -4.6052).
  `~/miniforge3/bin/python3 ~/picasso-work/daily/L01-04/scripts/odds.py` (softmax of logits / T; percent rounded half
  up; "<1%" below 0.5%; top-p keeps the smallest set of the likeliest words whose odds reach p):

  | T | walks | treats | naps | sticks | baths | homework | top-p 0.9 keeps |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | 0.2 | 88% | 12% | <1% | <1% | <1% | <1% | walks, treats (0.999) |
  | 0.5 | 64% | 29% | 5% | 2% | 1% | <1% | walks, treats (0.929) |
  | 0.7 | 55% | 31% | 8% | 5% | 2% | <1% | walks, treats, naps (0.934) |
  | 1 | 45% | 30% | 12% | 8% | 4% | 1% | four words, up to sticks (0.950) |
  | 1.5 | 36% | 28% | 15% | 11% | 7% | 3% | five words, homework cut (0.971) |
  | 2 | 31% | 26% | 16% | 13% | 9% | 5% | five words, homework cut (0.953) |

  So at T = 2 "homework" goes from 1 in 100 to about 1 in 20 (5%); top-p 0.9 cuts it at T = 1.5 and 2.
- Our prompt, tokenized (2026-10-08, round 2): `~/picasso-work/venv/bin/python -c "import tiktoken; e =
  tiktoken.get_encoding('o200k_base'); print(e.encode('My dog loves'))"` -> [5444, 6446, 19620] (My / dog / loves:
  3 tokens); `gpt2` gives [3666, 3290, 10408]. o200k_base has 200019 ids (n_vocab), so one step = 200019 scores
  ("about 200,000").

## Facts
| # | Claim (as the slide or lecture puts it) | Verified (source key, page/section) | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | The API has many parameters: temperature, top P, max output tokens, presence penalty, frequency penalty, seed (slide 26; her 51:47-52:01) | OAPI (temperature, top_p, max_output_tokens on Responses; the penalties and seed on Chat Completions) | "A request to a model's API has knobs: temperature, top_p, max output tokens, two penalties, a seed." | ok |
| F2 | (not on the slide) default temperature, range | OAPI + spec: 0 to 2, default 1; top_p 0 to 1, default 1 | "Leave it alone and the temperature is 1: every reply is a fresh draw." "Temperature goes from 0 to 2." | ok |
| F3 | "temperature: Controls randomness by scaling logits (lower = more deterministic)" (slide 26) | OAPI: "Higher values like 0.8 ... more random ... lower values like 0.2 ... more focused and deterministic" | "Higher is more random; lower is more focused." | ok |
| F4 | Temperature + top-p "most common nowadays" (slide 32); the table sets both (slide 34) | OAPI: "We generally recommend altering this or `top_p` but not both." | "The API's own reference says: change temperature or top_p, generally not both." (the honest limit) | soften |
| F5 | max output tokens: if the output is longer, the rest is cut off (her 52:19-52:34) | OAPI: an upper bound on generated tokens, "including visible output tokens and reasoning tokens"; the response comes back incomplete | "Max output tokens is a hard stop: the reply is cut off there, thinking included." | ok |
| F6 | presence / frequency penalty: "we investigate", then not "we investigate" again but "we study" (her 53:15-53:53; clip C1) | OAPI (Chat Completions): penalize tokens "based on whether they appear in the text so far" / "based on their existing frequency"; -2.0 to 2.0, default 0 | "The penalties push the model away from words it has already used." | ok |
| F7 | seed: "Fixes randomness for reproducible outputs" (slide 26) | OAPI: "best effort ... Determinism is not guaranteed"; marked deprecated on Chat Completions | "A seed asks for a repeatable draw: best effort, not a guarantee." | soften |
| F8 | Even with every setting the same, outputs still carry some randomness (her 54:02-54:16) | TML2025: at temperature 0, 1000 runs of one prompt gave 80 different completions; cause: the server's load changes its batch size, and the arithmetic with it; with batch-invariant kernels, 1000 identical | "Even at temperature 0, one 2025 test got 80 different answers in 1,000 runs: the server's load changes how the math is batched." Also: "A busy server batches many requests together, and the batch size changes the arithmetic." | ok |
| F9 | Text -> tokenizer -> token ids -> LLM -> logits; "for different kind of words in our vocabulary we'll have different kind of logits" (slide 27; her 54:30-55:02) | HF2020; TIK (slide 27's ids are gpt2's for "I have a dream", our example: "The weather today is", 4 tokens) | "The model reads token ids and gives back one score, a logit, for every entry in its dictionary." | ok |
| F10 | about 200,000 entries in a large dictionary (callback to L01-03) | TIK: o200k_base 200,019 ids | "about 200,000 scores, every single step" (for a large dictionary such as o200k_base; "in a large dictionary, about 200,000") | ok |
| F11 | Softmax turns logits into probabilities (her 62:22-62:34) | HIN2015 Eq. (1) with T = 1; slide 32 | "A function called softmax turns the scores into odds that add up to 100%." | ok |
| F12 | Greedy: "this one we'll choose nice, and then we'll choose woman" (slide 28; clip C2) | HF2020: The -> nice (0.5) -> woman (0.4), 0.5 x 0.4 = 0.2 | "Greedy takes the top word every time: nice, at 0.5, then woman, at 0.4. Together: 0.2." | ok |
| F13 | Greedy may miss a better sentence: "Maybe the first sentence should not be nice" (her 55:32-55:42; clip C3) | HF2020: "has" (0.9) is "hidden behind" dog (0.4) | "The best word can hide behind a weaker one." | ok |
| F14 | Beam search, beam size 2: keep the two best paths each step (slide 28) | HF2020: num_beams = 2 finds The dog has, 0.36, higher than 0.2 | "Beam search keeps the best two paths. It finds 'the dog has': 0.4 times 0.9 is 0.36, beating 0.2." | ok |
| F15 | Beam search finds a better sequence | HF2020: "not guaranteed to find the most likely output" | "Better, but still no guarantee." | soften |
| F16 | Beam search prefers short sentences, because multiplying probabilities only gets lower (her 56:51-57:12; clip C4) | WU2016 Sec. 7 ("will favor shorter results over longer ones"); FAN2018 ("short and generic") | "Every extra word multiplies in another number below one, so longer sentences score lower; left alone, beam search drifts short." | ok |
| F17 | (the deeper problem) always taking the likeliest words | HOL2020 abstract: "bland, incoherent, or gets stuck in repetitive loops"; "Natural language rarely remains in a high probability zone" | "Always the likeliest word sounds safe, but the text comes out bland and loops. People don't write that way." | ok |
| F18 | Sampling: pick each word by its probability; nice 50%, dog 40% (slide 29; her 57:22-58:07) | HF2020 Sampling | "Sampling rolls a weighted die: nice comes up half the time, dog 4 times in 10, car once in 10." | ok |
| F19 | Pure sampling can pick meaningless tokens (her 58:56-59:03) | HOL2020: pure sampling "results in text that is incoherent" | "Sample from everything and, now and then, a silly word gets through." | ok |
| F20 | Top-k: sample only among the k likeliest (slide 30, k = 6, credited "Fan et al. 2018") | HF2020 (the k = 6 figure); FAN2018 used k = 10 for stories | "Top-k keeps only the k likeliest words. The slide's picture uses k = 6." Credit: figure from the Hugging Face blog, 2020; top-k as used by Fan et al., 2018 (k = 10) | ok (credit corrected) |
| F21 | With top 6, "only adding up to 0.68" in one step, "99%" in the next (her 59:39-60:04; clips C6, C7) | HF2020 figure: 0.68 and 0.99 (text: "ca. two-thirds" / "almost all") | "Six words cover 0.68 of the odds in one step, 0.99 in the next." | ok |
| F22 | So a fixed k is not stable: the right k depends on the context (her 60:08-60:24) | HOL2020 Sec. 3.2 (flat vs peaked); HF2020: drops "people", "big", "house", "cat"; lets in "down", "a" | "A fixed k is too small when many words are fine, too big when only a few are." | ok |
| F23 | Top-p (nucleus): "the smallest possible set of words whose cumulative probability exceeds the probability p" (slide 31; Holtzman et al. ICLR 2020) | HOL2020 Sec. 3.1 (">= p"); slide wording is HF2020's | "Top-p: line the words up, add their odds until you reach p, keep that group, draw from it." | ok |
| F24 | p = 0.92 for this example (slide 31): 9 words (0.94) in the flat step, 3 words (0.97) in the sharp step | HF2020 figure and text | "With p = 0.92 the group is 9 words in the flat step, only 3 in the sharp one." The flat step is the word after "The", the sharp step the word after "The car" (the axis labels P(w|"The") and P(w|"The", "car") on slides 30 and 31, the same two steps in both) | ok |
| F25 | "It works, and it's very simple" (clip C8); "you should always try 0.9 at the beginning" (clip C10) | HOL2020: main setting p = 0.95; "values of p are usually in [0.9, 1)"; OAPI default top_p 1 | "0.9 is her starting point; the paper used 0.95." | ok (her rule of thumb) |
| F26 | Temperature formula p_i = e^(x_i/T) / sum_j e^(x_j/T) (slide 32) | HIN2015 Eq. (1); HOL2020 Eq. (4) | "Divide every score by T, then softmax." | ok |
| F27 | T < 1 sharper, T > 1 flatter (slide 32; her 63:10-63:52; clip C9) | HIN2015 ("softer"), HOL2020 ("skews the distribution towards high probability events") | "Below 1 the favourite pulls ahead; above 1 the odds even out." | ok |
| F28 | Very low temperature comes back to greedy (her 63:56-64:06) | HF2020 ("temperature -> 0 ... becomes equal to greedy decoding"); HFT | "Turn it toward 0 and you are back to greedy." (0 is a limit; the formula needs T above 0) | ok |
| F29 | The dog chart numbers | RUN (made-up odds) | always labelled "made-up odds"; the numbers in the RUN table only. At T = 1 top-p 0.9 keeps walks + treats + naps + sticks = 95 percent (0.950); at T = 2 it keeps five words (0.953) and cuts homework. "walks comes up 45 times in 100" (sampling at T = 1) | ok |
| F30 | Rules of thumb (slide 34, "Current SOTA Usage Recommendations", no source): chat 0.7-0.8, top-p ~0.9; code 0.0-0.2; factual / QA 0.0-0.3; creative writing 0.8-1.2 (top-p 0.85-0.95); brainstorming 0.8-1.4; avoid > 1.5 | no source (not verified) | "Her rule of thumb: code 0 to 0.2, chat about 0.7, stories 0.8 to 1.2." Never "the recommended settings" or "state of the art" | ok as her rule of thumb |
| F31 | Low temperature for code: "we don't want to have bugs" (her 67:00-67:06) | her reasoning (no source) | "Low for code: you want the same, careful answer." | ok as her reasoning |
| F32 | Sample many paths, keep the most common final answer: self-consistency; 1 + 1, some paths say 2, some say 3, 2 appears more (slide 33; her 64:33-65:18; clip C11) | WANG2023 (majority vote over sampled reasoning paths; Mar 2022, ICLR 2023) | "Self-consistency (Wang and colleagues, 2022): sample several reasoning paths, then go with the answer most of them reach." Her 1 + 1 is a toy example | ok |
| F33 | Test-time scaling: accuracy rises with more test-time compute (slide 33, a vendor's plots) | OAI2024 (the plotted curve is "more time spent thinking"; no numbers used) | "A 2024 industry report: answers get better the longer the model thinks at answer time." Never the plot's numbers | soften |
| F34 | (cost) | WANG2023 Sec. 5: "it incurs more computation cost"; start with "5 or 10" paths | "The catch: 5 paths cost about 5 answers' worth of tokens." (our arithmetic: each path is a full answer) | ok |
| F35 | (ours) the prompt "My dog loves" as token ids | RUN (tiktoken o200k_base: 5444, 6446, 19620; n_vocab 200019) | "'My dog loves' is 3 tokens: 5444, 6446, 19620. Out come about 200,000 scores, one per entry." | ok |

## Slide errata and lecture slips
1. Slide 30 credits the k = 6 figure to "Fan et al., arXiv:1805.04833 (2018)": the figure is the Hugging Face blog's
   (HF2020); Fan et al. used k = 10. On screen: the red pen adds "figure: Hugging Face blog, 2020".
2. Slide 31 credits "Holtzman et al. ICLR 2020": right for the method; the p = 0.92 figure and the definition's wording
   are HF2020's (the paper's main setting is p = 0.95). On screen: the red pen adds "figure: Hugging Face blog, 2020".
3. Slide 29 "this methods samples the whole path": sampling also picks one token at a time; run it several times and
   you get several complete paths. Not shown.
4. Slide 33 "(Bag of N, self-consistency)": probably "Best-of-N" (a guess). The title over the vendor's plots goes
   beyond the source (the curve is about thinking longer). Slide 33 is not shown.
5. Slide 26 mixes two API endpoints (presence_penalty, frequency_penalty, seed, response_format are Chat Completions
   fields, not Responses). "seed: Fixes randomness" overstates it (F7). Slide 26 is not shown; its knobs are lettered.
6. Slides 32 / 34 set temperature and top-p together, against the API reference's advice (F4): said once, as the limit.
7. Slide 34's table has no source: shown as "her rule of thumb" with "the table cites no source"; its title line ("Current SOTA Usage Recommendations") is cropped off.
8. Her slips (not quoted): "the parameters and the top P" (she means temperature), "gradient method" (greedy),
   "positive search" (exhaustive search), "dark" (dog). None is in a clip.

## Third-party images on the slides
| Slide | Image | Handling |
| --- | --- | --- |
| 26 | screenshot of an API request (vendor code) | not shown; the knobs are lettered on our own control-panel drawing |
| 27 | a pipeline diagram from a Hugging Face blog post | not shown; redrawn as lettering + arrows |
| 28 | the greedy and beam search trees (HF2020 figures) | taped in two crops: the greedy tree, then the beam tree with the slide's credit line (huggingface.co/blog/how-to-generate) visible |
| 30 | top-k bar figures (HF2020) | taped (crop with its credit line, struck through by the red pen); the fix lettered: "figure: Hugging Face blog, 2020 · Fan et al. used k = 10" |
| 31 | top-p bar figures (HF2020) | taped (crop with its credit line); lettered: "figure: Hugging Face blog, 2020 · method: Holtzman et al." |
| 32 | formula + a plot from machinelearningmastery.com | taped in two crops, the bullets and the formula; the plot is cropped off (our dog chart replaces it) |
| 33 | a vendor's two benchmark plots; a hidden table in another language below the page | not shown; our own pen line and tally sheets |
| 34 | a text table (no image) | taped, first three columns only (the "Key Insights" column cropped off) |

## Real people
- Prof. Yufei Ding: her voice (clips) and her slides, credit "Prof. Ding · lecture 1"; never drawn.
- Patrick von Platen, Angela Fan et al., Ari Holtzman et al., Xuezhi Wang et al., Horace He (Thinking Machines Lab):
  text credits only (post credits, end-card small print), never drawn.
- The drawn characters (the student, two hikers, the programmer, the storyteller, hands) are invented.

## Traps
- Never "temperature 0 is fully deterministic" (F8). Never "a seed guarantees the same answer" (F7).
- Never "beam search finds the best sentence" (F15). Never "Fan et al. used k = 6" (F20).
- Never "0.9 is the default top-p": the API default is 1; 0.9 is her starting point, 0.95 the paper's (F25).
- Never "the recommended settings" or "state of the art" for slide 34 (F30); never "set both" as advice (F4).
- The dog chart is made up: always "made-up odds"; its numbers are not a model's measurements (F29).
- The bars of slides 30/31 carry no per-word numbers: never read numbers off them; the tree's 0.5 / 0.4 do not apply
  to the bars.
- No benchmark numbers from slide 33 (F33). Do not name the vendor's model.
- Her "1 plus 1 ... the result 3" is her toy example of disagreeing paths, not a real model's answer.

## Open items
- The clip texts of C2, C5 and C11 were normalised to what both recognizers heard ("we will" for "we'll"; "okay"
  dropped; digits for number words): listen to these first.
- Slide 34's rows are not verified anywhere (F30); kept only as her rule of thumb.
- NIPS2025 as the paper she mentions is a likely match, not proven; not used on screen.
