# Fact brief: L01-02 "How Text Becomes Numbers" (CSE 291P Lecture 1, slides 12-19, tokenization)

The rule for this episode: every number, title, name and quote on screen, in the voice-over or in the post comes from
this brief, worded the way it is worded here. A line that needs a fact not listed here is not cleared.
Checked on 2026-10-06. For L01 the PDF page equals the slide number. Recording span 24:19-41:05.
Revised 2026-10-07: the hook and its payoff use our own neutral example, the word "eucalyptus" (T20, T22, T26, T27),
per the user's rule in `daily/PROMPT.md` (first of the "Rules for the night"); slide 19's own second example is not shown, said or captioned.

## Source key
| Key | Source | Where read |
| --- | --- | --- |
| **L01** | CSE 291P "LLM System Optimization", Lecture 1, Yufei Ding, UC San Diego, slides 12-19 and the lecture recording 24:19-41:05 | `course/L01.pdf`, `course/L01.txt`, `course/L01.words.json` (git-ignored) |
| **TIK** | tiktoken 0.14.0 (pip, run 2026-10-06 and 2026-10-07 in `~/picasso-work/venv`), encodings `cl100k_base`, `o200k_base`; README and `tiktoken/model.py` | github.com/openai/tiktoken (README top line, "Performance"; model.py lines 16-18, 37-39) |
| **RUN** | the trace computed by a script (below) | `~/picasso-work/venv/bin/python`, this file |
| **SEN** | R. Sennrich, B. Haddow, A. Birch, "Neural Machine Translation of Rare Words with Subword Units", arXiv:1508.07909 (31 Aug 2015), ACL 2016, pp. 1715-1725 (P16-1162) | arxiv.org/abs/1508.07909, Sec. 1, 3.2, Algorithm 1 |
| **GAGE** | P. Gage, "A New Algorithm for Data Compression", C Users Journal 12(2):23-38, Feb 1994 (as cited by SEN Sec. 3.2 and KUDO Sec. 3.4) | SEN reference list |
| **KUDO** | T. Kudo, "Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates", arXiv:1804.10959, ACL 2018, Sec. 3.2 | arxiv.org/abs/1804.10959 |
| **SP** | T. Kudo, J. Richardson, "SentencePiece", arXiv:1808.06226, EMNLP 2018 demos, pp. 66-71 | arxiv.org/abs/1808.06226 |
| **GEM** | Gemini 1.0 report arXiv:2312.11805 Sec. 4 ("We use the SentencePiece tokenizer"); Gemma 1 arXiv:2403.08295 ("a subset of the SentencePiece tokenizer ... of Gemini"); released Gemma `tokenizer.model` (github.com/google/gemma_pytorch), trainer_spec model_type = BPE | the reports; the file's trainer spec |
| **HF** | huggingface/tokenizers README (tag v0.21.0, "Main features"): BPE, WordPiece, Unigram; Rust implementation | github.com/huggingface/tokenizers |
| **PET** | A. Petrov, E. La Malfa, P. Torr, A. Bibi, "Language Model Tokenizers Introduce Unfairness Between Languages", arXiv:2305.15425, NeurIPS 2023, abstract | arxiv.org/abs/2305.15425 |
| **MUS** | "Investigations" by Kevin MacLeod (incompetech.com), CC BY 4.0 (the music bed, credited in the post) | incompetech.com |
| **OAI** | OpenAI API pricing page: "Prices per 1M tokens." | developers.openai.com/api/docs/pricing (fetched 2026-10-06) |

## Computed (RUN, TIK)
```
venv/bin/python: tiktoken.get_encoding(n).encode(...)
cl100k_base n_vocab 100277  "Hello students! Tokenization is the foundation of LLMs." -> 13 tokens
   [9906, 4236, 0, 9857, 2065, 374, 279, 16665, 315, 445, 11237, 82, 13]  (= slide 19)  55 characters
   pieces: Hello | students | ! | Token | ization | is | the | foundation | of | L | LM | s | .
o200k_base  n_vocab 200019  same sentence -> 13 tokens (same pieces), 55 characters

The replacement example (2026-10-07, ~/picasso-work/daily/L01-02/fix/facts_run.py; search.py and english.py picked it:
of every o200k_base entry that is an English dictionary word, " eucalyptus" splits most in cl100k_base):
cl100k_base
  ' eucalyptus'             ->  5 tokens [384, 1791, 5893, 418, 355]      pieces [' e', 'uc', 'aly', 'pt', 'us']
  'eucalyptus'              ->  5 tokens [68, 1791, 5893, 418, 355]       pieces ['e', 'uc', 'aly', 'pt', 'us']
  'Koalas eat eucalyptus.'  -> 11 tokens [42, 78, 278, 300, 8343, 384, 1791, 5893, 418, 355, 13]
                               pieces ['K', 'o', 'al', 'as', ' eat', ' e', 'uc', 'aly', 'pt', 'us', '.']
o200k_base
  ' eucalyptus'             ->  1 token  [163525]                         pieces [' eucalyptus']
  'eucalyptus'              ->  2 tokens [68, 111188]                     pieces ['e', 'ucalyptus']
  'Koalas eat eucalyptus.'  ->  5 tokens [33185, 55662, 11237, 163525, 13] pieces ['Ko', 'alas', ' eat', ' eucalyptus', '.']
tiktoken/model.py: MODEL_TO_ENCODING['gpt-4'] = 'cl100k_base', ['gpt-4o'] = 'o200k_base'
BPE trace on {low:5, lower:2, newest:6, widest:3}:
   initial symbols 10: d e i l n o r s t w
   round 1: (e,s) 9, (s,t) 9, (w,e) 8, (l,o) 7   -> tie at 9; slide takes (e,s)
   round 2: (es,t) 9, (l,o) 7, (o,w) 7            -> est
   round 3: (l,o) 7, (o,w) 7, (n,e) 6             -> tie at 7; slide takes (l,o)
   final vocabulary 13; words: lo w | lo w e r | n e w est | w i d est
   (taking (s,t) first instead gives st, then e+st = est: the same est after two rounds)
```

## Facts
| # | Claim (as the slide or lecture puts it) | Verified (source key, page/section) | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| T1 | Context length, compute cost and pricing are all measured in tokens, not characters or words (slide 13) | OAI ("Prices per 1M tokens"); L01 s13 | "Prices are per token. The context window, how much text the model can take in at once, is counted in tokens. And the model does work for every token." | ok |
| T2 | Tokenizers convert between strings and sequences of integers; a token sequence is a list of integers pointing into a fixed vocabulary (slide 14) | L01 s14; TIK (encode/decode) | "A tokenizer turns text into a list of whole numbers, and back. Each number points to one entry in a fixed vocabulary." | ok |
| T3 | Word-level: intuitive, huge vocabularies, OOV (out-of-vocabulary) problems (slide 15) | L01 s15; SEN Sec. 1 (rare and unknown words in NMT) | "Whole words: easy to read, but the list is huge and a new word or a typo isn't in it." | ok |
| T4 | Character-level: no OOV but long sequences (slide 15) | L01 s15; RUN (55 characters vs 13 tokens) | "Single characters: nothing is ever missing, but the sequences get long. Our sample sentence is 55 characters and 13 tokens." | ok |
| T5 | Subword is the modern standard; BPE bottom-up [Sennrich+ 2015] | SEN (arXiv 2015, ACL 2016) | "Subwords sit in between. Byte-pair encoding builds them bottom-up (Sennrich et al., 2015)." | ok |
| T6 | BPE began as compression | GAGE via SEN 3.2 | "BPE started in 1994 as a data-compression trick." | ok (optional) |
| T7 | Unigram (SentencePiece): top-down, EM-trained, starts large and prunes [Kudo 2018] | KUDO Sec. 3.2; SP | "Unigram goes top-down: start with a huge list and prune what helps least (Kudo, 2018)." | ok |
| T8 | Unigram "used by Google Gemini series" (slide 15; also said in lecture) | GEM: reports say SentencePiece only; the released Gemma tokenizer is SentencePiece in BPE mode | Pen note on the slide: "SentencePiece, yes; Unigram: not stated". Never say Gemini uses Unigram. | soften |
| T9 | BPE's four steps: split into characters, count adjacent pairs, merge the most frequent, repeat until the target size (slide 16) | L01 s16; SEN Algorithm 1 | "Split into letters. Count every neighbouring pair. Glue the most frequent pair into a new piece. Repeat until the list is big enough." | ok |
| T10 | Target sizes "e.g. 200,000 for GPT-4o" (slide 16) | TIK o200k_base n_vocab 200019; model.py "gpt-4o": "o200k_base" | "about 200,000 entries (o200k_base, GPT-4o's tokenizer)" | ok |
| T11 | Trace corpus {low:5, lower:2, newest:6, widest:3}, target 13 (slide 17) | L01 s17; RUN | as written | ok |
| T12 | Round 1: (e,s) 6+3 = 9 | RUN | "e-s appears 6 + 3 = 9 times. So does s-t: a tie. The slide takes e-s; a fixed tie-break rule decides." | ok, with the tie |
| T13 | Round 2: (es,t) 9 -> est | RUN | "es-t, 9 times: est." | ok |
| T14 | Round 3: (l,o) 5+2 = 7 -> lo | RUN | "l-o, 5 + 2 = 7 (o-w ties at 7)." | ok, with the tie |
| T15 | 10 characters + 3 merges = 13 | RUN | "10 letters plus 3 merges: 13 entries." | ok |
| T16 | Tie-break | SEN Algorithm 1 (max over a dict: the first counted); subword-nmt learn_bpe.py (max with (freq, pair) key: the last in sort order) | "When two pairs tie, the code needs a rule; the slide's trace takes e-s first." Do not say e-s was the only maximum. | ok |
| T17 | tiktoken (OpenAI): fast; "3-6x faster than legacy" (slide 19) | TIK README: "between 3-6x faster than a comparable open source tokeniser" (GPT2TokenizerFast, 1 GB, tiktoken 0.2.0) | "tiktoken, OpenAI's tokenizer library" (no speed figure on screen; the taped slide shows it, the pen adds "README: vs one older library") | soften |
| T18 | tokenizers (Hugging Face): BPE, WordPiece, Unigram; Rust core (slide 19) | HF | "Hugging Face's tokenizers library, written in Rust" | ok |
| T19 | Sample sentence: 13 tokens in cl100k_base (slide 19); 13 tokens / 55 characters in the web tool (slide 18) | TIK/RUN | "13 tokens, 55 characters" | ok |
| T20 | Our own example (not on the slides): the word "eucalyptus" inside a sentence (" eucalyptus", the space before it included, as a tokenizer sees every word after the first) is 5 tokens in cl100k_base (GPT-4) and 1 in o200k_base (GPT-4o); the test sentence "Koalas eat eucalyptus." is 11 tokens vs 5 | TIK/RUN (block above); model.py mapping | "One word: eucalyptus. Five tokens in GPT-4's tokenizer, one in GPT-4o's." / "our test: Koalas eat eucalyptus." / "The whole sentence goes from 11 tokens to 5." | ok |
| T21 | cl100k_base about 100k entries; o200k_base about 200k | TIK (100,277; 200,019) | "about 100,000 ... about 200,000" | ok |
| T22 | "N times cheaper" (the shape of the work order's hook) | prices differ per model; the count 5 -> 1 for the word is exact | "a fifth of the tokens" (the word) — never "five times cheaper" as a price claim | soften |
| T23 | Fewer tokens is cheaper and faster, but not always better: generalization (lecture 32:00-33:00) | L01 recording (her clip C3) | "Fewer tokens is cheaper. But if every sentence were one token, the model would learn nothing." | ok |
| T24 | Honest limit: tokenizers favour some languages | PET abstract: "differences up to 15 times in some cases" | "The same text translated can need up to 15 times more tokens in some languages (Petrov et al., NeurIPS 2023)." | ok |
| T26 | In cl100k_base " eucalyptus" is five pieces, none of them a word; in o200k_base the whole word is one entry | RUN: decode_single_token_bytes -> [' e', 'uc', 'aly', 'pt', 'us'] vs [' eucalyptus'] | "5 tokens, all scraps" (tiles e / uc / aly / pt / us, the leading space not drawn, as for the sample sentence's pieces); "1 token" | ok |
| T27 | Why 5 -> 1: o200k_base's larger vocabulary contains the whole word as one entry (learned from more merges in its training) | TIK (the entry exists); that it came from merges follows from BPE (SEN Algorithm 1); her clips C9 (larger vocabulary for many languages) and C11 (the trend) | "The bigger vocabulary has room for the whole word as one entry." Do not claim why OpenAI chose it. | ok |
| T28 | cl100k_base and o200k_base are BPE tokenizers | TIK README: "tiktoken is a fast BPE tokeniser for use with OpenAI's models" | "Both are byte-pair encoding tokenizers." | ok |
| T29 | Callback: the previous episode was about models getting bigger and more expensive | L01-01 (`../l01-1-scale/FACTS.md`, its whole brief) | "Last time, models got big and expensive." | ok |
| T25 | Next lecture part: decoding strategies (temperature, top-p) (slide 12) | L01 s12 | "Next: how the model picks the next token." | ok |

## Slide errata and lecture slips
- s15: "used by Google Gemini series" for Unigram is not stated by any Google source (T8): red-pen correction on the taped slide.
- s19: "3-6x faster than legacy": the README compares with one library, GPT2TokenizerFast, on an old benchmark (T17).
- s17: "(e, s) appears 9 times" is right, but it ties with (s, t); likewise (l, o) ties with (o, w) (T12, T14).
- Lecture: she says the target vocabulary is "11" (slide: 13) and "24 alphabets" (English has 26). Neither is captioned
  or used; no clip contains them.
- s14's token ids (93447, 9201, ...) match o200k_base, not cl100k_base (RUN); s14 is not shown.
- s19: its last two lines (the slide's own second example and its two counts) are painted out of the taped copy in the
  slide's white (`slides/p19.png`, made by `~/picasso-work/daily/L01-02/fix/clean19.py` from the 150-dpi page) and are
  never shown, said or captioned (the user's rule); the red pen writes our own test sentence in that space (T20).

## Third-party images on the slides
- s13: the OpenAI logo and a screenshot of the OpenAI pricing table: not shown (s13 is not taped).
- s14: the encode/decode figure (from Stanford CS336 lecture 1): not shown.
- s18: a screenshot of OpenAI's web tokenizer: not taped; its numbers (13 tokens, 55 characters) are redrawn as lettering.
- s15, s17, s19: text and tables only (s19's library table is text): s15 and s17 taped whole, s19 with its last two
  lines painted out (errata above).

## Real people
Prof. Yufei Ding: voice clips and slides only, credited by text and the mic tag; never drawn. Authors (Sennrich,
Haddow, Birch; Kudo; Petrov et al.) by text credit only. The drawn characters are invented.

## Traps
- Not "five times cheaper" (T22); not "Gemini uses Unigram" (T8); not "e-s was the most frequent pair" without the tie.
- Not "eucalyptus is 1 token" for the bare word at the very start of a text: there it is 2 tokens in o200k_base ('e' +
  'ucalyptus'; still 5 in cl100k_base). The film's 5 vs 1 is the word inside a sentence, and the test sentence shown
  ("Koalas eat eucalyptus.", 11 vs 5) reproduces as typed. The post says so.
- Not "a token is a word" (pieces like "ization", "L", "LM", "s").
- The vocabulary sizes are "about": 100,277 and 200,019 exactly, special tokens included.
- Don't read model names off the vendor screenshots; only cl100k_base/GPT-4 and o200k_base/GPT-4o as mapped in TIK.

## Open items
- Clips are checked by two recognizers, not by ear (see report.md).
