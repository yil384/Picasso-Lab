# Fact brief: L02-01 "Why Chatbots Kept Only Half the Transformer" (CSE 291P Lecture 2, slides 7-12)

The rule for this episode: every number, title, name and quote on screen, in the voice-over or in the post comes from
this brief, worded the way it is worded here. A line that needs a fact not listed here is not cleared.
Checked on 2026-10-09 (02:00-02:15). L02 is a 16:9 deck; the PDF page equals the slide number. Recording span:
L02 11:41-28:09 (slides 7-12). Full research notes with quotes, sections and arithmetic:
`~/picasso-work/daily/L02-01/research_A.md` (the 2017 paper, parallelism, our parameter count) and `research_B.md`
(decoder-only, T5, BART, GPT-1/3, Llama 3, data, the 2022 study); summarized here.

## Source key
| Key | Source | Where read |
| --- | --- | --- |
| **L02** | CSE 291P "LLM System Optimization", Lecture 2 "Transformer Model Architecture Variants (1)", Yufei Ding, UC San Diego: slides 7-12, recording 11:41-28:09 | `course/L02.pdf`, `L02.txt`, `L02.words.json` (git-ignored) |
| **VAS** | Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin, "Attention Is All You Need", NIPS 2017 (Advances in NeurIPS 30); arXiv:1706.03762 (v1 12 Jun 2017, v7 2 Aug 2023). Abstract; sec 1 (recurrence "precludes parallelization within training examples"); sec 2; sec 3 (decoder "one element at a time"); 3.1 (N = 6 + 6 layers; the decoder's third sub-layer attends over the encoder output; decoder self-attention masked "to prevent positions from attending to subsequent positions"); 3.2.3; 3.5 (positional encodings); Table 1 (sequential operations: self-attention O(1), recurrent O(n)); 5.1 ("about 4.5 million sentence pairs"; "36M sentences"); 5.2 (one machine, 8 P100 GPUs; base 12 hours, big 3.5 days); Table 3 (base 65 x 10^6 parameters) | arxiv.org/abs/1706.03762, all 7 versions + the NeurIPS PDF (research_A.md) |
| **BAH** | Bahdanau, Cho, Bengio, "Neural Machine Translation by Jointly Learning to Align and Translate", arXiv:1409.0473 (2014), ICLR 2015, sec 3.1 ("a mechanism of attention in the decoder") | arxiv.org/abs/1409.0473 |
| **ALA** | Jay Alammar, "The Illustrated Transformer", blog post, written 27 Jun 2018, CC BY-NC-SA 4.0; its decoding animations (the source of slides 8-10's left-hand figures) | jalammar.github.io/illustrated-transformer |
| **GPT1** | Radford, Narasimhan, Salimans, Sutskever, "Improving Language Understanding by Generative Pre-Training", 2018, sec 4.1: "a 12-layer decoder-only transformer with masked self-attention heads" | cdn.openai.com (research_B.md) |
| **GPT3** | Brown et al., "Language Models are Few-Shot Learners", arXiv:2005.14165 (2020): 175 billion parameters; Table 2.1 caption "All models were trained for a total of 300 billion tokens"; sec 2.1 "the same model and architecture as GPT-2"; sec 5 (bidirectionality limitation, "potentially worse") | arxiv.org/abs/2005.14165 |
| **L3** | Llama Team, AI @ Meta, "The Llama 3 Herd of Models", arXiv:2407.21783 (2024), sec 1: "about 15T multilingual tokens"; "405B trainable parameters on 15.6T text tokens"; sec 3.2 "a standard, dense Transformer architecture"; Fig. 1 "trained to predict the next token" | arxiv.org/abs/2407.21783 |
| **T5** | Raffel et al., "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer", arXiv:1910.10683 (2019), JMLR 2020: 3.1.1 ("a standard encoder-decoder Transformer"; "about 220 million parameters ... roughly twice ... since our baseline model contains two layer stacks instead of one"); 3.2.2 (L + L encoder-decoder: parameters of a 2L-layer language model, compute of an L-layer one); 3.2.4 ("For all tasks, the encoder-decoder architecture with the denoising objective performed best"); 2.2 (C4, unlabeled web text) | arxiv.org/abs/1910.10683 |
| **BART** | Lewis et al., "BART: Denoising Sequence-to-Sequence Pre-training ...", arXiv:1910.13461 (29 Oct 2019): encoder-decoder, trained by repairing corrupted plain text | arxiv.org/abs/1910.13461 |
| **WANG22** | Wang, Roberts, Hesslow, Le Scao, Chung, Beltagy, Launay, Raffel, "What Language Model Architecture and Pretraining Objective Work Best for Zero-Shot Generalization?", ICML 2022, arXiv:2204.05832: Finding 1 (causal decoder-only best "immediately after unsupervised pretraining"); Finding 2 (encoder-decoder with masked language modeling best "after multitask finetuning"); compute-matched (11B vs 4.8B parameters) | arxiv.org/abs/2204.05832 |
| **NLLB** | NLLB Team, "No Language Left Behind", arXiv:2207.04672 (2022), sec 6.1: "based on the Transformer encoder-decoder architecture"; about 200 languages | arxiv.org/abs/2207.04672 |
| **SURV** | Zhao et al., "A Survey of Large Language Models", arXiv:2303.18223 (v19, 2026), sec 4.2.5: "most LLMs are developed based on the causal decoder architecture, and there still lacks a theoretical analysis on its advantage over the other alternatives" | arxiv.org/abs/2303.18223 |
| **RUN** | our computations, below | this file |

## Computed (RUN)
- Parameter split of the 2017 base model from its hyperparameters (VAS 3.1-3.4, 5.1: d = 512, d_ff = 2048, 6 + 6
  layers, one shared embedding of about 37,000 x 512; biases and norms ignored), `~/miniforge3/bin/python3`
  arithmetic in research_A.md section 8:
  - encoder layer = 4d^2 + 2 d d_ff = 3,145,728; decoder layer (two attentions) = 4,194,304;
  - encoder stack 18.9M; decoder stack 25.2M (cross-attention 6.3M of it); embedding 18.9M; total **about 63M**
    (the paper's Table 3: 65M; the gap is the "about 37000" vocabulary and unstated counting);
  - delete the encoder and every cross-attention, keep 6 masked layers: **about 38M** (37.8M); removed 25.2M =
    **40 %** of our total; ratio 63.0 / 37.8 = **1.67**, inside the slide's "~1.5-2x".
  - This "same-depth decoder-only" is a hypothetical cut for comparison, not a model from the paper. Always say
    "by our count" / "our estimate".
- Paired data vs plain text: 4.5 million sentence pairs (VAS 5.1) against 300 billion tokens read by GPT-3 (GPT3).
  No multiplier is computed or shown (a ratio would need an assumed sentence length; research_B row 4b).
- The made-up sentence of the film: "mib tavoo krenn" (three invented words, checked to be no word we know of in a
  major language), translated as "I am a student." (the output sentence of ALA's example, plain English). The
  ambiguity example "The bank was full of fish." is ours (English words only).

## Facts
| # | Claim (as the slide or lecture puts it) | Verified (source key, page/section) | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | "2017, arXiv:1706.03762 'Attention is all you need'" (slide 8) | VAS abs page; v1 12 Jun 2017; NIPS 2017 | "Attention Is All You Need", 2017 (arXiv:1706.03762); "a 2017 paper"; credit "Vaswani et al., 2017" | ok |
| F2 | The model was "mostly for translation" (her, 13:53) | VAS abstract ("Experiments on two machine translation tasks"), 6.1 | "It was built to translate: a sentence in, its translation out." / "tested on translating news sentences" | ok |
| F3 | Encoder = left part, decoder = right part (her, 14:20) | VAS 3.1 | "The encoder reads the sentence; the decoder writes the translation." | ok |
| F4 | 6 + 6 layers | VAS 3.1 (N = 6) | "six encoder layers and six decoder layers" | ok |
| F5 | Encoder self-attention is all-to-all, "bidirectional" (her, 19:25-19:40) | VAS 3.2.3 (encoder: each position attends to all positions); L02 slide 11 "bidirectional self-attention" | "In the encoder, every word can look at every other word, before and after it." | ok |
| F6 | Decoder self-attention is causal, only previous tokens (her, 19:46) | VAS 3.1, 3.2.3 ("up to and including that position"; masking to -inf) | "In the decoder, each word may look at itself and the words before it, never ahead." Never "only the words before it" alone in a definition. "masked" / "causal" both ok | ok |
| F7 | Cross-attention: the decoder takes the encoder's output (her, 17:43-17:56) | VAS 3.1 (third sub-layer), 3.2.3 (queries from the decoder, keys and values from the encoder output) | "The decoder also looks back at the encoder's reading of the whole input: cross-attention." | ok |
| F8 | The decoder generates one token at a time, autoregressively (her, 21:35-21:46; slide 9-10 "decoding time step") | VAS sec 3 ("one element at a time"; "auto-regressive") | "It writes one word at a time, and each new word joins the input for the next." | ok |
| F9 | "Attention -> Parallelism" (slides 9-10; her, 14:55-15:12): recurrent models have dependencies, not fully parallel | VAS sec 1 ("This inherently sequential nature precludes parallelization within training examples"); Table 1 (sequential operations O(1) vs O(n)) | "A recurrent network reads one word after another: one step per word. An attention layer handles all the words in one step, so a GPU can work on them at the same time." | ok |
| F10 | (caveat to F9) | VAS Table 1 (convolution also O(1)); sec 3; sec 4 (cost O(n^2 d)) | Say "unlike recurrent networks", never "the first parallel model"; the speed-up is in reading and training, the writing is still word by word | ok |
| F11 | Attention = find how similar the other tokens are to me, gather, update (her, 15:47-15:55, dot product) | VAS 3.2.1 (scaled dot-product attention) | "Each word asks: which of the others are like me? It gathers from them, weighted by that, and updates itself." | ok |
| F12 | Attention existed before 2017; the paper kept only attention | BAH 3.1; VAS abstract ("based solely on attention mechanisms, dispensing with recurrence and convolutions entirely") | Never say the paper "invented attention"; say "it dropped recurrence and kept only attention. Hence the title." | ok (trap) |
| F13 | Before: LSTMs or CNNs for translation (her, 13:55) | VAS sec 1-2 (recurrent and convolutional encoder-decoders) | "Before 2017, the best translators were mostly recurrent networks." | ok |
| F14 | Positional encoding enables the parallelism (her, 16:30) | VAS 3.5 | "Attention alone ignores word order, so each word gets a position stamp." (optional; not needed) | ok |
| F15 | Nowadays "mostly abandoning" encoder-decoder; decoder-only (her, 23:44; slide 11 "Dominated by decoder only") | SURV 4.2.5 ("most LLMs ... causal decoder"); GPT1 4.1; GPT3 2.1; L3 3.2 | "Most of today's large chat models that publish their design keep only the decoder." Never "all" or "every"; the hook's "every big chatbot" is NOT cleared: say "the big chatbots" / "today's big chat models" | soften |
| F16 | Decoder-only removes the encoder and the cross-attention; "all the other things are the same" (her, 23:59-24:10; slide 11 red "Removed from Decoder-only LLMs") | slide 11; VAS 3.1; GPT1 4.1 ("decoder-only transformer with masked self-attention heads") | "Delete the encoder. The cross-attention has nothing left to look at, so it goes too. What stays: the masked decoder." | ok |
| F17 | GPT-1 (2018): decoder-only | GPT1 4.1 | "GPT-1, in 2018: a 12-layer decoder-only transformer" | ok |
| F18 | GPT-3 (2020): 175 billion parameters, 300 billion tokens of training | GPT3 abstract, Table 2.1 | "GPT-3 (2020) read about 300 billion tokens of plain text." (tokens read, not dataset size) | ok |
| F19 | Llama 3 (2024): about 15 trillion tokens; standard dense Transformer predicting the next token | L3 sec 1, 3.2, Fig. 1 | "Llama 3 (2024): about 15 trillion tokens." (name "Llama 3", not "LLaMA-3") | ok |
| F20 | Encoder-decoders: T5 (2019), BART (2019) (slide 11) | T5 3.1.1; BART abstract | "T5 and BART, both 2019, kept both halves." | ok |
| F21 | Encoder-decoder survives in niches, e.g. translation (slide 11) | NLLB 6.1 (2022, about 200 languages) | "Two-stack models still show up in translation: a large 2022 translation model kept both halves." Summarization / structured generation: her slide's view only (not shown as fact) | soften |
| F22 | Decoder-only is unidirectional, "poorer on NLU/translation without huge scale"; "losing some of the abstraction power" (slide 12; her, 24:56) | GPT3 sec 5 (authors' own conjecture: "potentially worse performance on tasks which empirically benefit from bidirectionality") | "Looking only backward can hurt on some understanding tasks." Never "always worse" | soften |
| F23 | Parameters: decoder-only ~1x, encoder-decoder ~1.5-2x (slide 12) | T5 3.1.1, 3.2.2 (two stacks: about twice the parameters at the same compute); RUN (2017 base: about 63M vs about 38M, 1.67x, our estimate) | "Two stacks carry more weights: about 1.5 to 2 times, the slide estimates. By our count, the 2017 base model loses about 40% of its weights when you cut the encoder." | ok (label "the slide's estimate" / "our count") |
| F24 | Data: decoder-only "300B-1T+ tokens (unpaired, cheap/abundant)" (slide 12) | GPT3 (300B); L3 (about 15T) | "GPT-3 read about 300 billion tokens; Llama 3, about 15 trillion." Do not show "1T+" as a fact (15x too low for 2024) | soften |
| F25 | Data: encoder-decoder "10-100x less (needs paired/parallel data)" (slide 12) | no source for the multiplier; T5 2.2, BART: two-stack models can pre-train on plain text too | Never show or say "10-100x" as a fact; if the slide shows it, the pen marks it "the slide's rough guess". Safe: "To learn translation directly you need pairs: a sentence and its translation. A next-word model can learn from any text." | soften / multiplier dropped |
| F26 | Paired data in 2017 | VAS 5.1 | "The 2017 model learned from about 4.5 million sentence pairs." (one of its two tasks) | ok |
| F27 | Any text works for next-word prediction (her, 26:13-26:23) | GPT1, GPT3, L3 ("trained to predict the next token") | "Any text is a lesson: hide the next word, guess it, check." | ok |
| F28 | Decoder-only can still translate by prompting (her, 26:57-27:12: "please translate ...") | GPT3 3.3 (few-shot translation from "a small amount of paired examples") | "Ask it to translate, and it simply continues the text." | ok |
| F29 | "Accurate modeling vs. Simple modeling?" (slide 12; her, 25:21-25:33) | L02 slide 12 | her phrase, quoted; "the simple design that scales won, for now" | ok |
| F30 | Honest limit: the encoder-decoder is not worse at everything | T5 3.2.4 (encoder-decoder with denoising "performed best", at base scale, twice the parameters, same compute); WANG22 Findings 1-2 (compute-matched) | "A 2022 study found the next-word model best straight out of pre-training, but the two-stack model ahead after extra training on many tasks." | ok |
| F31 | Why decoder-only won: "wins on scaling + simplicity" (slide 11) | SURV 4.2.5 ("there still lacks a theoretical analysis on its advantage") | "It scales smoothly and keeps the recipe simple. Nobody has proven it is the best design." | soften |
| F32 | "No clean winner"; it alternates (her, 27:51-27:55) | L02 recording | her words, quoted (clip C6) | ok |
| F33 | Ask yourself whether you can predict the trend after a paper (her, 12:33-12:40) | L02 recording | her words, quoted (clip C1) | ok |
| F34 | Training cost 2017 (optional) | VAS 5.2 | "The small version trained in about 12 hours on one machine with eight GPUs." | ok |
| F35 | L01-01 callback: scale wins / "more is different" | episodes/l01-1-scale/FACTS.md (L01-01) | "Remember episode one: scale changes what models can do." No numbers from L01 | ok |

## Slide errata and lecture slips
- Slide 11, "GPT-1/2/3/4 series" as decoder-only: GPT-1 to GPT-3 confirmed by their papers; GPT-4's report gives
  "no further details about the architecture". The film does not show the model column (cropped off).
- Slide 11, "LLaMA-3": the report's name is "Llama 3".
- Slide 11, UL2 as an encoder-decoder: UL2 is an objective used with both designs (only its released 20B model has
  two stacks). Not shown.
- Slide 12, "300B-1T+ tokens": "1T+" is about 15x low for Llama 3 (15.6T). The pen adds "Llama 3: ~15T".
- Slide 12, "10-100x less": no source; the slide's own rough guess. Pen: "rough guess".
- Slide 12, "needs paired/parallel data": true for learning translation directly; not a property of the design
  (T5 and BART pre-train on plain text). Narration says "to learn translation directly you need pairs".
- Slide 12, "Unidirectional -> poorer on NLU/translation": a conjecture in the GPT-3 paper ("potentially worse");
  narrated as "can hurt on some understanding tasks".
- Recording: she says "casual" for "causal" (19:46, 24:44); not used in a clip. "kvcache" asides (20:54) not used.

## Third-party images on the slides
| Slide | What | Handling |
| --- | --- | --- |
| 8 | Left: J. Alammar's figure (CC BY-NC-SA 4.0) with a non-English example sentence; right: the 2017 paper's Figure 1 | not taped; the encoder/decoder idea is redrawn as our own drawing (`line_reader_writer`) with our own sentence |
| 9, 10 | J. Alammar's decoding animation frames (time steps 1-6, "Kencdec/Vencdec") | not taped; the decoding steps are re-lettered by code on our drawing; credit on the end card "decoding steps after Jay Alammar, The Illustrated Transformer (2018)" |
| 11 | Left: her table (the model column names companies' models); right: the 2017 paper's Figure 1 with her red shading "Removed from Decoder-only LLMs" | taped as a crop of the right half only (the figure and her red label), credit lettered "figure: Vaswani et al., 2017"; the table is cropped off |
| 12 | her own table, text only | taped whole |
| 7 | her own outline, text only | not used |

## Real people
- Prof. Yufei Ding: her voice (6 clips, checked), her slides 11 (crop) and 12; never drawn.
- Named in text only: Vaswani et al. (the 2017 paper), Jay Alammar (credit for the decoding-step layout), the T5 /
  BART / GPT-1 / GPT-3 / Llama 3 / 2022 study authors by short citation. No one is drawn; all characters in the
  drawings are invented.

## Traps
1. "The 2017 paper invented attention" (BAH, 2014). Say "kept only attention".
2. "Every chatbot" / "all LLMs" are decoder-only: SURV says "most"; many reports do not publish their design.
3. "Decoder-only is simply better": T5 3.2.4 and WANG22 found encoder-decoders ahead in some setups.
4. "Encoder-decoders need paired data": only for learning translation directly (F25).
5. "10-100x less data" or "1T+ tokens" as facts (F24, F25).
6. "Twice the parameters" without "at the same compute" or "estimate" (F23).
7. "Each word sees only the words before it" as a definition: it also sees itself (F6).
8. "Attention made writing parallel": the decoder still writes one word at a time (F8, F10).
9. Our 63M / 38M / 40% are our count, not the paper's (the paper says 65M).
10. GPT-3's 300 billion tokens are tokens read, not the size of its dataset.
11. The made-up sentence must never be called a real language; no real language other than English is named.

## Open items
- None blocking. Not checked from a primary source: the 2025 status of encoder-decoders beyond translation (her
  slide's "long-document summarization, structured generation"): not shown as a fact.
