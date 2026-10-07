# Fact brief: L01-03 "The Size of the Dictionary" (CSE 291P Lecture 1, slides 20-24; the worksheet, L01 slide 37 / L02 slides 4-6)

The rule for this episode: every number, title, name and quote on screen, in the voice-over or in the post comes from
this brief, worded the way it is worded here. A line that needs a fact not listed here is not cleared.
Checked on 2026-10-07 (02:00-03:00); spoken forms of three rows added at 10:30 (F5, F27, F29). Revised at 11:05 after
the user's rule (no example in any language other than English): F14, F16 and F23 now use measured
neutral examples (the word "vocabulary", English novels and Python code, a run of digits); slide 24 is cropped above its
third table row. For L01 the PDF page equals the slide number (letter pages); L02 is a 16:9 deck,
page = slide. Recording spans: L01 40:55-50:51 (slides 20-24), L02 4:15-11:51 (the worksheet answer).
Full research notes with every command and output: `~/picasso-work/daily/L01-03/research_A.md` (vocabulary, tables,
numbers) and `research_B.md` (ratios, prices, caching); summarized here.

## Source key
| Key | Source | Where read |
| --- | --- | --- |
| **L01** | CSE 291P "LLM System Optimization", Lecture 1, Yufei Ding, UC San Diego: slides 20-24 and 37, recording 40:55-50:51 | `course/L01.pdf`, `L01.txt`, `L01.words.json` (git-ignored) |
| **L02** | CSE 291P Lecture 2, slides 4-6 (the worksheet and its answer), recording 4:15-11:51 | `course/L02.pdf`, `L02.txt`, `L02.words.json` (git-ignored) |
| **LL1** | Touvron et al., "LLaMA: Open and Efficient Foundation Language Models", arXiv:2302.13971 (Feb 2023), Sec. 2.1 "Tokenizer" (BPE, SentencePiece, "we split all numbers into individual digits") | arxiv.org/abs/2302.13971, PDF p.2 |
| **LL2** | Touvron et al., "Llama 2: Open Foundation and Fine-Tuned Chat Models", arXiv:2307.09288 (Jul 2023), Sec. 2.2: "We use the same tokenizer as Llama 1 ... The total vocabulary size is 32k tokens." Config (NousResearch/Llama-2-7b-hf, byte copy of Meta's release): `vocab_size 32000`, `hidden_size 4096`, `tie_word_embeddings false`; total 6,738,415,616 parameters (HF API, official repo) | arxiv.org/abs/2307.09288 PDF p.6; huggingface.co |
| **LL3** | Meta, "Introducing Meta Llama 3", 18 Apr 2024: "a tokenizer with a vocabulary of 128K tokens"; "yielding up to 15% fewer tokens compared to Llama 2". Llama Team, "The Llama 3 Herd of Models", arXiv:2407.21783, Sec. 3.2, Table 3 (vocabulary 128,000; "100K tokens from the tiktoken tokenizer with 28K additional tokens to better support non-English languages"). Config (NousResearch/Meta-Llama-3-8B): `vocab_size 128256` (128,000 + 256 special), `hidden_size 4096`, `tie_word_embeddings false`; total 8,030,261,248 | ai.meta.com/blog/meta-llama-3 (Wayback 2024-04-20); arXiv PDF p.7; huggingface.co |
| **TIK** | tiktoken 0.14.0 (`~/picasso-work/venv`): `o200k_base` n_vocab 200,019 (GPT-4o's tokenizer; model.py maps gpt-4o to it), `cl100k_base` 100,277 (GPT-4's); pre-tokenizer splits digit runs into pieces of at most 3 (`\p{N}{1,3}`, openai_public.py) | github.com/openai/tiktoken |
| **4O** | OpenAI, "Hello GPT-4o", 13 May 2024: the model ships with a new tokenizer (o200k_base in TIK) | openai.com/index/hello-gpt-4o (Wayback 2024-05-20) |
| **RUN** | computations below (tiktoken, tokenizers 0.23.2 in the venv; Project Gutenberg English novels, Python 3.14 standard-library files; `research_scripts/measure_neutral.py` and `measure_neutral2.py` with their `.out`) | this file; research_A.md, research_B.md |
| **TAO** | Tao, Liu, Dou, Muennighoff, Wan, Luo, Lin, Wong, "Scaling Laws with Vocabulary: Larger Models Deserve Larger Vocabularies", NeurIPS 2024, arXiv:2407.13623: "the optimal vocabulary size of Llama2-70B should have been at least 216K, 7 times larger than its vocabulary of 32K"; "the risk of under-fitting for rare tokens increases with larger vocabulary sizes"; footnote 1: the output layer carries the FLOPs, not the embedding | arXiv PDF p.1, p.2, p.4 |
| **MAG** | Land & Bartolo, "Fishing for Magikarp: Automatically Detecting Under-trained Tokens in Large Language Models", EMNLP 2024, pp. 11631-11646: under-trained tokens "across all tested models, with typically around 0.1-1% of the vocabulary" | aclanthology.org/2024.emnlp-main.649, Sec. 5 p.9 |
| **JEAN** | Jean, Cho, Memisevic, Bengio, "On Using Very Large Target Vocabulary for Neural Machine Translation", ACL 2015, abstract: decoding complexity increases "proportionally to the number of target words" | arxiv.org/abs/1412.2007 |
| **HELP** | OpenAI Help Center, "What are tokens and how to count them" (art. 4936856): "1 token is approximately 4 characters"; "These are estimates" | help.openai.com (read 2026-10-07) |
| **COOK** | OpenAI Cookbook, "How to count tokens with tiktoken": a count tells you whether the text is too long and "how much an OpenAI API call costs (as usage is priced by token)" | cookbook.openai.com |
| **API** | OpenAI API reference: Chat Completions `messages` and Responses `input` take text (and images, audio, files), not token ids; the legacy Completions endpoint took token arrays (its models shut down 2026-09-28) | developers.openai.com/api/reference (2026-10-07) |
| **RET** | OpenAI docs, "Retrieval", Vector stores > Chunking: files split into 800-token chunks with 400-token overlap by default | developers.openai.com/api/docs/guides/retrieval |
| **PRICE** | OpenAI pricing page, Standard tier, "Prices per 1M tokens": the model priced on the course worksheet at $1.75 input, $0.175 cached input, $14.00 output (same as the worksheet); text-embedding-3-small $0.02 | developers.openai.com/api/docs/pricing (read 2026-10-07) |
| **CACHE** | OpenAI docs, "Prompt caching": "enabled by default"; reuse of the longest matching prefix; for the worksheet's model, entries last minutes (`in_memory`, "around 5 to 10 minutes of inactivity, up to one hour") or up to 24 hours (`24h`, the default for most organizations) | developers.openai.com/api/docs/guides/prompt-caching |
| **MUS** | "Investigations" by Kevin MacLeod (incompetech.com), CC BY 4.0 (the music bed, credited in the post) | incompetech.com |

## Computed (RUN)
```
vocab x hidden 4,096 (the input table, one row of 4,096 numbers per entry):
  32,000 x 4,096 = 131,072,000 (about 131 million)          [Llama 1/2]
  128,256 x 4,096 = 525,336,576 (about 525 million)          [Llama 3]
  200,000 x 4,096 = 819,200,000 (about 819 million)          [a 200,000-entry table at the same width]
  difference (200,000 - 32,000) x 4,096 = 688,128,000 (688 million, "almost 700 million")
  ratio 819,200,000 / 131,072,000 = 6.25
Llama 3 8B, input table + output layer (untied): 2 x 525,336,576 = 1,050,673,152 (about 1.05 billion) of 8,030,261,248 (13.1 %)
Llama 2 7B, both tables: 262,144,000 of 6,738,415,616 (3.9 %)
output layer, multiply-adds per generated token = 4,096 x vocab: 131,072,000 at 32,000; 819,200,000 at 200,000
number pieces:  "1000"  Llama 2: 1 | 0 | 0 | 0 (after a space marker)   Llama 3, cl100k_base, o200k_base: 100 | 0
                "2024"  Llama 2: 2 | 0 | 2 | 4                          others: 202 | 4
same text, Llama 2 vs Llama 3 tokenizer, whole books (Gutenberg text between the START and END markers):
  Pride and Prejudice 191,709 -> 171,479 (10.6 % fewer); Moby-Dick 351,715 -> 307,437 (12.6 %);
  The Adventures of Sherlock Holmes 156,063 -> 137,350 (12.0 %)        -> "about 12 percent fewer on English novels"
  Python 3.14 standard library, 9 files (json/decoder, json/encoder, textwrap, argparse, collections, functools,
  dataclasses, shutil, csv; 404,563 characters): 113,377 -> 89,104 (21.4 % fewer; per file 18.2 to 24.0 %)
                                                                      -> "about 21 percent fewer on Python code"
the word " vocabulary" inside a sentence ("Take the word vocabulary itself."):
  Llama 2: voc | ab | ul | ary (4 pieces);  Llama 3 and o200k_base: vocabulary (1 token)
  (at the very start of a text, with no space before it, Llama 3 and o200k_base give v | ocabulary: hence "in a sentence")
1,000 digits (a run of 1,000 digit characters, any digits): o200k_base, cl100k_base, Llama 3: 334 tokens
  (333 pieces of 3 digits + 1); Llama 2: 1,001 (one per digit, plus its leading space marker)  -> "about 1,000"
tokens per 1,000 characters (o200k_base / cl100k_base):
  English novels 216-226 / 219-227;  Python 226-244 / 224-242;  C 276 / 276;  minified JS 340 / 328
  (old GPT-3 tokenizer r50k_base: Python 433-446, C 514)
worksheet (prices per 1M tokens: input 1.75, cached input 0.175, output 14.00):
  one question: 10,000 x 1.75 / 1e6 = 0.0175  +  300 x 14 / 1e6 = 0.0042  ->  $0.0217
  naive, 5 questions: 5 x 0.0217 = $0.1085
  cached: 0.0175 + 4 x 0.00175 (= 0.007) + 5 x 0.0042 (= 0.0210) = $0.0455
  retrieval: 10,000 / 500 = 20 chunks; top 3 = 1,500 tokens: 0.002625 + 0.0042 = $0.006825 per question; x 5 = $0.034125
  embedding the paper once (text-embedding-3-small, $0.02/1M): $0.0002  (left out by the worksheet)
  retrieval of k chunks, 5 questions: k=3 0.034125, k=5 0.042875, k=6 0.04725 > cached 0.0455 (caching wins from 6 chunks)
  10 questions: naive $0.217, cached $0.07525, retrieval (3 chunks) $0.06825
  price ratios: output / input = 14 / 1.75 = 8; cached / input = 0.175 / 1.75 = 0.1 (a tenth)
```

## Facts
| # | Claim (as the slide or lecture puts it) | Verified (source key, page/section) | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | Llama 1/2: vocab 32,000, 2023 (slide 20) | LL2 Sec. 2.2 ("32k tokens", same tokenizer as Llama 1); config 32000 | "Llama 1 and 2, 2023: 32,000 entries." | ok |
| F2 | Llama 3: 128,000, 2024 (slide 20) | LL3 (blog "128K"; paper Table 3: 128,000; config 128,256 incl. 256 special) | "Llama 3, 2024: about 128,000." (128,000 regular tokens; 128,256 with special ones) | ok |
| F3 | GPT-4o: ~200,000, 2024+ (slide 20) | TIK o200k_base n_vocab 200,019; 4O (May 2024) | "GPT-4o's tokenizer, o200k_base, 2024: about 200,000." | ok |
| F4 | Bigger vocabularies are the trend; more languages need more entries (lecture 41:20) | LL3 ("28K additional tokens to better support non-English languages"); her clip C1 (the same meaning in fewer tokens) | "Vocabularies keep growing: 32,000, then about 128,000, then about 200,000." (different model families: never "one model grew six-fold") | ok |
| F5 | The embedding matrix is vocab size x hidden dimension (slide 23) | LL2/LL3 configs; arithmetic | "Every entry gets its own row of numbers. The row's length is the model's width, its hidden size. At a width of 4,096, that is 4,096 numbers per entry. Together the rows make the embedding matrix, the table at the model's input." | ok |
| F6 | 32k vocab ~ 131M parameters at 4096 (slide 23) | RUN 131,072,000 | "32,000 entries x 4,096 = about 131 million numbers." | ok |
| F7 | 200k vocab ~ 819M parameters at 4096 (slide 23) | RUN 819,200,000; GPT-4o's own width is not public | "200,000 entries at the same width: about 819 million." Never "GPT-4o's table is 819 million". | ok, as a same-width example |
| F8 | (the hook) 32,000 -> 200,000 adds almost 700 million | RUN 688,128,000 | "At a width of 4,096, going from 32,000 entries to 200,000 adds 688 million parameters to the input table alone: almost 700 million, before any of them learns anything." (they start untrained) | ok |
| F9 | Her "about 1G parameters" for the vocabulary (lecture 48:55) | LL3 config, untied: 2 x 525,336,576 = 1,050,673,152 of 8,030,261,248 (13 %) | "In Llama 3 8B the vocabulary appears twice, at the input and at the output: about 1.05 billion of its 8 billion parameters." | ok (only with "input and output") |
| F10 | The output layer must calculate a probability for every token in the vocab; the final softmax takes more memory and time (slide 23) | JEAN abstract; TAO fn. 1; RUN (4,096 x vocab multiply-adds per token) | "For every token it writes, the model scores every entry in its vocabulary. At a width of 4,096: about 131 million multiply-adds per token at 32,000 entries, about 819 million at 200,000." Spoken: "Same two numbers, now as work: about 131 million multiply-adds per token at 32,000 entries, about 819 million at 200,000." | ok |
| F11 | Rare tokens need a vastly larger dataset to be learned (slide 23) | TAO Sec. 1 (under-fitting risk for rare tokens grows with vocabulary size); MAG Sec. 5 | "A bigger vocabulary has more rare entries, and a rare entry is seen less often in training." | ok |
| F12 | (her aside, 50:08) the data problem is no longer a big issue today | her clip C9 (her view); MAG: under-trained tokens still found "across all tested models, with typically around 0.1-1% of the vocabulary" (blamed on the gap between tokenizer data and training data) | "A 2024 study still found under-trained entries in every model it tested: typically 0.1 to 1 percent of the vocabulary." (Land & Bartolo, EMNLP 2024) | ok (the honest limit; never "she is wrong") |
| F13 | (context) bigger models deserve bigger vocabularies | TAO abstract: Llama2-70B "should have been at least 216K, 7 times larger than its vocabulary of 32K" | "A 2024 study estimates Llama 2 70B would have been best with at least 216,000 entries." | ok (optional) |
| F14 | Higher semantic density: one token can stand for a whole concept, more "thinking" per step (slide 22) | RUN: " vocabulary" in a sentence is 4 pieces on Llama 2 (voc, ab, ul, ary) and 1 token on Llama 3 and o200k_base | "A bigger catalogue has room for bigger pieces: more meaning per token. Take the word vocabulary. Llama 2 cuts it into 4 pieces. Llama 3 keeps it as 1 token." (on screen: "inside a sentence"; "thinking per step" is the slide's metaphor: say "more meaning per step") | soften |
| F15 | Shorter sequences fit more meaning into the context window (slide 22) | context windows are counted in tokens (L01-02 T1); LL3 paper: "read more text for the same amount of training compute" | "The context window is counted in tokens. Fewer tokens per page: more pages fit." Spoken: "Fewer tokens per page: more pages fit in the context window, the text a model can take in at once." (the gloss is L01-02 T1) | ok |
| F16 | "A 128k-vocab model can remember a book that would take 3x the space in a 32k-vocab model" (slide 22) | RUN: Llama 2 -> Llama 3 on the same text: English novels 10.6 to 12.6 % fewer tokens (three whole books), Python code 21.4 % fewer (9 standard-library files); LL3: "up to 15% fewer tokens" (Meta's own text) | "Not three times. Same texts, both tokenizers: we measured about 12 percent fewer tokens on English novels, and about 21 percent fewer on Python code." (Meta's "up to 15 %" is not quoted: our code sample beats it, which would confuse) | soften (slide erratum) |
| F17 | Large vocabularies include multi-digit numbers as single tokens, e.g. 1000 as one token instead of 1, 0, 0, 0 (slide 22) | RUN; LL1 Sec. 2.1; TIK pat_str | "Not quite. Llama 2 splits 1000 into four digits: 1, 0, 0, 0. Llama 3 and GPT-4o's tokenizer cut numbers into pieces of up to three digits: 100, then 0. The rule is set on purpose, not by size alone." Spoken (after the review): "Her slide also says a big vocabulary makes 1000 one token. Not quite: Llama 2 splits it into four digits. Llama 3 and GPT-4o's tokenizer cut it into 100, then 0. That cut is a design choice, not a matter of size." (on screen: "a design choice, not size") (LL1: "we split all numbers into individual digits"; TIK: the digit rule is in the pre-tokenizer pattern) | soften (slide erratum) |
| F18 | APIs take raw text, not token sequences (slide 24) | API (chat endpoints: text in); PRICE (billed per token, input and output separately) | "Chat APIs take text, not token IDs. But the bill is counted in tokens." Spoken: "Now the bill. As she said, fewer tokens is cheaper: chat APIs take text, not token IDs, but the bill is counted in tokens." ("as she said" = her clip C1) | ok (avoid "never accepted token IDs") |
| F19 | Estimate the token count before the call: avoid context overflow and surprise cost (slide 24) | COOK; HELP "Count tokens before sending a request" | "Count the tokens on your own machine first: will it fit, and what will it cost?" | ok |
| F20 | Split documents by tokens, not characters, for retrieval (slide 24) | RET (800-token chunks by default); LangChain "Split by tokens" | "Retrieval systems cut documents by tokens." ("better retrieval quality" is the slide's judgement: do not claim it as measured) | ok |
| F21 | 1,000 characters of English ~ 250 tokens (slide 24) | HELP ("1 token is approximately 4 characters"); RUN 216-227 | "English: about 4 characters per token, so 1,000 characters is about 250 tokens. We measured 216 to 227." | ok |
| F22 | 1,000 characters of source code ~ 500-750 tokens (slide 24) | RUN: o200k/cl100k 224-340 (Python, C, minified JS); only the 2020 GPT-3 tokenizer gives 433-514 | "On today's tokenizers, code costs about the same per character as English: we measured 224 to 340 tokens per 1,000 characters, not 500 to 750." | soften (slide erratum) |
| F23 | (our example, not on the slide; it replaces the slide's third table row, which is not used) a run of 1,000 digits | RUN: o200k_base 334 tokens (pieces of up to 3 digits, TIK pat_str); Llama 2 1,001 (one per digit + the space marker, LL1 Sec. 2.1) | "And 1,000 digits: 334 tokens on GPT-4o's tokenizer, about 1,000 on Llama 2's." | ok |
| F24 | The table is a rule of thumb | RUN; HELP "These are estimates" | "Rules of thumb vary by tokenizer: count with the real one." | ok |
| F25 | Worksheet: one paper of about 10,000 tokens (about 8,000 words), 5 questions (their tokens not counted), 300 output tokens per answer (L01 slide 37, L02 slide 4) | L01 s37; L02 s4 | as stated, "on the course worksheet" | ok |
| F26 | Prices on the worksheet: $1.75 per million input tokens, $0.175 cached input, $14.00 output | L01 s37 (vendor screenshot, not shown); PRICE (the same three numbers on the pricing page on 2026-10-07) | "The prices on the course worksheet: $1.75 per million input tokens, 17.5 cents cached, $14 per million output tokens." Never name the model; never "today's prices". | ok |
| F27 | One question: $0.0175 + $0.0042 = $0.0217 (L02 s5) | RUN | "Input $0.0175, output $0.0042: $0.0217 a question" (spoken: "about 2 cents a question"; 2.17 cents). | ok |
| F28 | Naive, 5 questions: $0.1085 (L02 s5, s6) | RUN | "Five questions, the paper sent every time: $0.1085, about 11 cents." | ok |
| F29 | Cached: $0.0175 + $0.00175 x 4 + $0.0210 = $0.0455 (L02 s5 prints "$ $0.00175 * 4": a typo) | RUN; CACHE | "Cache the paper: the first question pays full price, the next four pay a tenth for it. Total $0.0455" (spoken: "about 4.6 cents"; 4.55 cents rounded). | ok (typo fixed in pen) |
| F30 | Cached input is one tenth of the uncached price (her clip C13, L02 8:25) | PRICE 0.175 / 1.75 = 0.1 (true for this model; other models 0.25x or 0.5x) | "On this price list, cached input costs a tenth." | ok |
| F31 | Caches are kept only a short time (lecture L02 7:30-7:59) | CACHE: minutes (in-memory, 5-10 min of inactivity, up to an hour) or up to 24 hours | "A cache lasts minutes to hours, depending on the model and settings." (never "only minutes") | soften |
| F32 | Retrieval: 20 chunks of 500 tokens; top 3 = 1,500 tokens a question; $0.006825 a question, $0.034125 for 5 (L02 s5) | RUN | "Cut the paper into 20 chunks of 500 tokens, send only the best 3: 1,500 tokens. $0.034125 for all five, about 3.4 cents." Spoken: "send only the 3 most relevant to the question: 1,500 tokens a question" (L02 s4: "retrieve the top 3 most relevant chunks"). | ok |
| F33 | (left out by the worksheet) embedding the chunks once | PRICE text-embedding-3-small $0.02/1M; RUN $0.0002 | "Embedding the paper once adds about $0.0002." | ok (optional) |
| F34 | Which is better is not fixed (her L02 9:26-10:07, slide 6 takeaway) | RUN: from 6 chunks a question, retrieval costs more than caching ($0.04725 vs $0.0455); her clip C14c | "Fetch 6 chunks instead of 3, and caching wins." Spoken: "Retrieval, at 3.4 cents, beats the cache. Always? Fetch 6 chunks instead of 3, and caching wins." (3 chunks $0.034125 < cached $0.0455 < 6 chunks $0.04725) | ok |
| F35 | Output tokens cost more than input (her L02 6:46, "about 10 times") | PRICE 14 / 1.75 = 8 | "Output costs 8 times as much as input on this list." Never "10 times". | soften (lecture slip) |
| F36 | System optimization matters because it is costly (her clip C15) | L02 10:38 | her clip only | ok |
| F37 | Next in the course: decoding (temperature, top-p) | L01 slides 25-34 (L01-04 in the syllabus) | "Next: every entry has a score. How does the model pick one?" Also: "How the model picks a token comes next time." (L01-02 ended on that promise; it is L01-04 in the syllabus) | ok |
| F38 | The course: CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego; this is lecture 1 (slides 20-24) and the worksheet answered in lecture 2 | L01, L02 | "Lecture 1 of Prof. Yufei Ding's CSE 291P at UC San Diego" End card and post: "Lectures 1 and 2" (the worksheet answer, C13, C14c and the (b2) box are from lecture 2). | ok |
| F39 | (definition, from L01-02) a token is one entry of the vocabulary: a whole word or a piece of one (L01 s14-15) | L01-02 FACTS T2 ("each number points to one entry in a fixed vocabulary") and T5 (subwords); RUN (" vocabulary" is 1 token, "voc" + "ab" are pieces) | "That dictionary is the vocabulary: every token the model knows, a word or a piece of a word." | ok |

## Slide errata and lecture slips
- s20: Llama 3 "128,000" is right for regular tokens (128,256 with 256 special tokens): no correction needed.
- s22: "1000 as one token instead of 1, 0, 0, 0": false for Llama 2/3, cl100k_base and o200k_base (F17). Only the
  older, smaller GPT-2/3 encodings (about 50,000 entries) had "1000" as one token: the opposite of the slide's point.
- s22: "remember a book that would take 3x the space": about 12 % (English novels) to 21 % (Python code) fewer tokens (F16);
  "remember" is loose (the tokenizer changes how many tokens a text costs, not what the model memorizes).
- s22: "($L$)" is a LaTeX artefact on the slide.
- s24: the source-code row (500-750) is 2-3 times too high for today's tokenizers (F22); the third row is not used
  (cropped off, the user's rule); "OpenAI APIs do not accept token sequences" was not true of the legacy Completions endpoint (F18).
- L02 s5: "$0.0175 + $ $0.00175 * 4 + $0.0210 = $0.0455": a doubled "$" (the total is right).
- L02 s4: "we do not count its tokens" (slide 37 says "their").
- Lecture slips (not used): "at the beginning ... around the 50K size ... about 100K" (41:07; the slide says 32,000 and
  128,000); the hidden size spoken as "2024"/"494" (recognizer noise for 4,096); "the output is ... about 10 times"
  (8 times on this list, F35).

## Third-party images on the slides
- L01 s37 and L02 s4: a screenshot of a vendor's pricing table (with the model name): never shown. The three prices
  are re-lettered by hand as "the prices on the course worksheet"; the model name stays off screen, out of the voice
  and out of the post.
- L01 s21: a smiley glyph next to "Discussion Time": slide 21 is not taped (its question is re-lettered).
- s20, s22, s23, s24 and L02 s5: text and tables only (the deck footer "UC San Diego - PICASSO Lab" is the lab's own).
- s24: shown cropped from the title to the line under the "Source Code" row; its third table row (a language example) is
  never on screen (the user's rule, 2026-10-07: no example in any language other than English).

## Real people
- Prof. Yufei Ding: her voice clips (approved 2026-10-06), mic tag "Prof. Ding · lecture 1" / "lecture 2", red-bordered
  captions; never drawn.
- Paper authors appear as text credits only (Land & Bartolo; Tao et al.; Touvron et al.). No one real is drawn; the
  clerk and the student are invented characters.

## Traps
- No example in any language other than English, anywhere (the user's rule, 2026-10-07): the
  examples are the word "vocabulary", English novels, Python code and digits, each measured (RUN).
- Never "GPT-4o's embedding table is 819 million": its width is not public (F7). Say "at the same width".
- Never "a bigger vocabulary makes numbers one token" (F17).
- Never "3x" for the book (F16); never "500-750" for code without the correction (F22).
- Never "today's prices", never the worksheet model's name; never "output costs 10x" (F35); never "caches only last
  minutes" (F31).
- "Parameters" for the hook: they are numbers the model will learn; "before it has learned a thing" means they start
  untrained (F8), not that they are useless.
- Do not say she is wrong about data: present the 2024 study as "still found" (F12).

## Open items
- Her clips are checked by two recognizers, not by ear (C4, C7, C9: text changed to what both heard; listen first).
