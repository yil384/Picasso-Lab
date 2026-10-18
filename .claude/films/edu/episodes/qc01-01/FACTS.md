# QC01-01 From Two Qubits to a Thousand - fact brief

CSE 291P Quantum Computing Systems, Prof. Yufei Ding, 2025 Lecture 1 (Q25-01), recording 11:32-19:10, her slide p8
("Why Now? Faster than Expected Hardware Development"); the 2024 version of the same chart is 2024 Lecture 1 p7.
Checked 2026-10-18 at primary sources (research sweeps in `~/picasso-work/daily/QC01-01/research/r_counts.md`,
`r_tech.md`). Nothing goes on screen, into the voice or into the post unless a row below clears it, in its safe wording.
Hardware numbers move fast: every "today" number here is **as of October 2026**. Roadmaps are **plans**.

## Source key
| Key | Source | Where read |
| --- | --- | --- |
| DING25 | Prof. Yufei Ding, CSE 291P Quantum Computing Systems, UC San Diego, 2025 Lecture 1, slide p8 + recording 11:32-19:10 | course-qc/Q25-01.pdf p8; Q25-01.mp4 (machine transcript, clips re-checked) |
| DING24 | Same course, 2024 Lecture 1, slide p7 (the same chart a year earlier) | course-qc/Q24-01.pdf p7 |
| IBM16 | IBM Newsroom, "IBM Makes Quantum Computing Available on IBM Cloud to Accelerate Innovation", 4 May 2016 | uk.newsroom.ibm.com/2016-May-04-... |
| IBM22 | IBM Newsroom, "IBM Unveils 400 Qubit-Plus Quantum Processor ...", 9 Nov 2022 (Osprey 433; Eagle 127 in 2021) | newsroom.ibm.com/2022-11-09-... |
| IBM23 | IBM Quantum blog, "IBM Quantum System Two: the era of quantum utility is here", 4 Dec 2023 (Condor 1,121 qubits; Heron "significantly improved error rates") + IBM Newsroom same day | ibm.com/quantum/blog/quantum-roadmap-2033 |
| IBM25 | IBM Newsroom, 10 Jun 2025 (Starling: 200 logical qubits, delivered by 2029) | newsroom.ibm.com/2025-06-10-... |
| IBMDOC | IBM Quantum docs, "Processor types" (Heron r2/r3 156 qubits; Nighthawk 120); Condor not listed | quantum.cloud.ibm.com/docs/en/guides/processor-types |
| IBMTECH | IBM Quantum "Technology" page: processors kept "about a hundredth of a degree above absolute zero" | ibm.com/quantum/technology |
| AWS26 | AWS What's New, 7 Apr 2026: Rigetti Cepheus-1-108Q (108 qubits) on Amazon Braket | aws.amazon.com/about-aws/whats-new/2026/04/... |
| QTUM25 | Quantinuum press release, 5 Nov 2025: Helios, 98 qubits, via its cloud service | quantinuum.com/press-releases/... |
| IONQ | IonQ roadmap page (accessed 2026-10-18): 2030 = 2,000,000 physical qubits (plan) | ionq.com/roadmap |
| PSIQ | PsiQuantum news, 30 Sep 2025: will "ultimately deploy" a "million-qubit scale" machine, no year | psiquantum.com/news-import/... |
| GQAI | Google Quantum AI roadmap, milestone 6: "make, connect, and control 1 million qubits" (10^6 physical), no date | quantumai.google/roadmap |
| WILLOW | Google blog, "Meet Willow, our state-of-the-art quantum chip", 9 Dec 2024: "just producing larger numbers of qubits doesn't help if they're not high enough quality" | blog.google/... |
| JM98 | J. A. Jones, M. Mosca, J. Chem. Phys. 109, 1648 (1998): Deutsch's problem on a 2-qubit NMR computer | arXiv quant-ph/9801027 |
| CGK98 | I. L. Chuang, N. Gershenfeld, M. Kubinec, Phys. Rev. Lett. 80, 3408 (1998): Grover search over 4 items, 2 qubits | doi 10.1103/PhysRevLett.80.3408 |
| KN00 | E. Knill et al., Nature 404, 368 (2000): 7-qubit NMR | doi 10.1038/35006012 |
| NG06 | C. Negrevergne et al., Phys. Rev. Lett. 96, 170501 (2006): 12-qubit NMR | doi 10.1103/PhysRevLett.96.170501 |
| INTEL23 | Intel newsroom, 15 Jun 2023: Tunnel Falls, 12-qubit silicon spin research chip, 300 mm wafers, "leverages Intel's most advanced transistor industrial fabrication capabilities" | intel.com/content/www/us/en/newsroom/news/quantum-computing-chip-to-advance-research.html |
| TECH | Company technology pages: Google, IBM, Rigetti superconducting; IonQ, Quantinuum trapped ions; QuEra, Pasqal neutral atoms; PsiQuantum, Xanadu photonic | r_tech.md rows 1a-1m |
| KRANTZ | P. Krantz et al., "A quantum engineer's guide to superconducting qubits", Appl. Phys. Rev. 6, 021318 (2019): ~20 mK | arXiv 1904.06560 |
| QUERA | QuEra FAQ "Do quantum computers need cryogenic cooling?": atoms laser-cooled to microkelvin, room-temperature apparatus | quera.com/questions/... |
| PHOT | Alexander et al., Nature (2025) (PsiQuantum detectors ~2 K); Aghaee Rad et al., Nature 638 (2025) (Xanadu detectors in dilution refrigerators at 12 mK) | arXiv 2404.17570; doi 10.1038/s41586-024-08406-9 |
| PINO | J. M. Pino et al., Nature 592, 209 (2021): ion trap cooled to 12.6 K | arXiv 2003.01293 |
| CMB | D. J. Fixsen, ApJ 707, 916 (2009): cosmic background 2.72548 K | arXiv 0911.1955 |

## Facts
| # | Claim (as the slide or lecture puts it) | Verified (source key, page/section) | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | "Past 17 years" (1998-2015): a few qubits, lab access only | DING25 p8; JM98, CGK98 (1998, 2 qubits); KN00 (2000, 7); NG06 (2006, 12) | "From 1998 to 2015, seventeen years, quantum computers had only a few qubits: 2 in 1998, 7 in 2000, 12 in 2006." | ok |
| F2 | Many physics labs only had two-qubit devices | DING25 12:22; JM98, CGK98 | "In 1998 the first ones had just 2 qubits" | ok |
| F3 | The 1998 two-qubit machines | JM98, CGK98 | "molecules in a liquid, read by magnets" (NMR); "ran tiny demos: find one item out of 4 in a single look" | ok |
| F4 | Two qubits: you can only test (verify) gates, not useful | DING25 12:41 (her clip C4); CGK98 | her words; narration "enough for a demo, not for real work" | ok |
| F5 | Lab access only: unless your lab builds it, no access | DING25 12:50 (clip C5); DING25 p8 "Lab Access" | her words; "only the lab that built it could use it" | ok |
| F6 | "Recent 9 years" (2015 on her 2025 slide; "Recent 7 years" on the 2024 slide) | DING25 p8; DING24 p7 | "In the nine years after that" / "about nine years" | ok |
| F7 | Slide: "1,127 qubits" | IBM23: Condor = **1,121** qubits, 4 Dec 2023 | "1,121 qubits on one chip (IBM's Condor, December 2023)". Slide erratum: 1,127 -> 1,121 (the red pen corrects it on screen) | ok (erratum) |
| F8 | 2024 slide: "433 qubits" | DING24 p7; IBM22: Osprey 433, Nov 2022 | "Her 2024 slide said 433; a year later it said over a thousand" / "2022: 433 qubits" | ok |
| F9 | Eagle | IBM22: 127 qubits, 2021 | "2021: 127 qubits" | ok |
| F10 | Not first over 1,000 | a neutral-atom company announced 1,180 qubits on 24 Oct 2023 (r_counts traps) | never say "first chip over a thousand"; say "IBM's 1,121-qubit chip" | trap |
| F11 | "Cloud access" from about 2016 | IBM16: 4 May 2016, 5 superconducting qubits, free to the public over the internet | "In May 2016 IBM put a 5-qubit quantum computer online for anyone to try." Never "the first" (a 2-qubit chip was online in 2013) | ok |
| F12 | She: up to ~1,000 qubits, all reachable through the cloud | IBMDOC: largest public gate-based cloud processors 156 qubits (Heron), 120 (Nighthawk); AWS26 108; QTUM25 98; Condor not on the cloud list | "Real machines are online: the ones people run code on today have about 100 to 160 qubits (as of October 2026). The 1,121-qubit chip was a research test." | soften |
| F13 | More qubits is not the whole story | WILLOW quote; IBM23: Heron "significantly improved error rates", put on the cloud, Condor not | "More qubits only help if they make few mistakes. After the big chip, IBM put a smaller chip with fewer errors online." | ok (honest limit) |
| F14 | "Future 6 years: to 1M qubits" | IONQ: 2,000,000 physical qubits by 2030 (plan); PSIQ: million-qubit scale, no year (plan); GQAI: 1 million physical qubits, no date (plan); IBM25: 200 error-corrected (logical) qubits by 2029, no million-qubit plan | "Company roadmaps aim at about a million qubits. Plans, not machines: one plans 2 million by 2030; others give no date." Never "IBM plans a million". | ok (plans) |
| F15 | Who builds with what | TECH | Superconducting circuits: Google, IBM, Rigetti. Silicon spins (quantum dots): Intel. Trapped ions: IonQ, Quantinuum. Neutral atoms: QuEra, Pasqal. Photons: PsiQuantum, Xanadu. "Five kinds, no winner yet" | ok |
| F16 | Intel uses quantum dots because of its fabrication experience | DING25 15:30 (clip C13: "Intel is using quantum dots,"); INTEL23: each qubit is "essentially a single electron transistor", 12-qubit research chip, 2023, 300 mm wafers | "Each qubit is almost a transistor, so it can be made in chip factories." | ok |
| F17 | Ion trap is a very mature technology | DING25 16:28 (clip C11); TECH | her words | ok |
| F18 | Photonic: easy to scale (company claim) | DING25 16:52 "they are claiming" | "they say light is easier to scale" (a claim) | soften |
| F19 | Superconducting qubits need very low temperature | IBMTECH: "about a hundredth of a degree above absolute zero"; KRANTZ ~20 mK | "about a hundredth of a degree above absolute zero" | ok |
| F20 | Colder than space | CMB 2.7 K; 2.7 / 0.02 = 135 | "over 100 times colder than deep space" | ok |
| F21 | Why: superconductivity only exists at low temperature | DING25 17:28; aluminium Tc 1.196 K (Cochran & Mapother 1958); Google Quantum AI lab blog, 9 Dec 2024 (superconducting metals enter a zero-resistance state when cold) | "the metal only superconducts when it is cold"; "superconducting circuits: metal loops on a chip that carry current with no resistance" | ok |
| F22 | Her answer: in principle only superconducting requires low temperature; others sometimes still cool to get better results | DING25 18:47-18:59 (clips C9, C10) | her words | ok |
| F23 | The others: ions in a vacuum, laser-cooled; neutral atoms laser-cooled to microkelvin in a room-temperature box | IonQ technology page; PINO (some ion traps cooled to 12.6 K); QUERA | "Ions and atoms float in a vacuum and are chilled by lasers; the box can stay at room temperature, but some machines cool it anyway for a cleaner vacuum." | ok |
| F24 | Honest limit to her "in principle" | PHOT: PsiQuantum detectors ~2 K; Xanadu detectors 12 mK | "Light doesn't mind the heat, but the detectors that count single photons are kept very cold." | ok (limit) |
| F25 | Why computer scientists now | DING25 11:37-11:50 ("interesting not only for physics students but also for computer science students"); her course | "Real machines, many kinds, all online: now they need people who write and compile programs for them." (the series' framing; not a quote) | ok |
| F27 | What a gate is (her C4 says you can only verify gates on a two-qubit machine) | M. A. Nielsen, I. L. Chuang, Quantum Computation and Quantum Information (Cambridge, 2000), ch. 4: quantum gates as the elementary operations of the circuit model | "A gate is one basic step of a quantum program." | ok |
| F26 | Faster than expected | DING25 p8 title; clip C1 | her words | ok |

## Slide errata
- p8 "1,127 Qubits" -> 1,121 (IBM Condor). The red pen corrects it on the taped slide; never captioned as 1,127.
- p8 "Future 6 Years to 1M Qubits": these are company plans (F14), lettered "plans".
- p8 "7~12 Qubits" for 1998-2015: the 1998 machines had 2 (F1); the slide's range is the biggest ones (7 in 2000, 12 in 2006). We say "2 to 12".
- Her transcript says "2017 ... supremacy experiment ... 53 qubits": the year is wrong (2019) and the passage is not used.

## Third-party images on the slides
- p8 (2025) and p7 (2024): a legend of company logos at the right (x 1390-1610 of the 2000 px page). Covered by a
  blank taped sheet (the L01-01 cover pattern) on the 2025 slide; the 2024 slide is shown only as a small cut-out of
  its header ("433 Qubits"), no logos. Chart labels on the 2024 slide (institutions, product names) are not shown.

## Real people named
- None on screen. The recording names a professor (not used). Company names appear only as text in captions and
  labels, by the technology they build. No country, lab or machine is placed anywhere.

## Traps
- "1,127 qubits" (slide) - wrong.
- "You can run code on 1,000 qubits in the cloud" - wrong (F12).
- "IBM plans a million qubits" - wrong (F14). "Google will have a million by 2029" - no date on its roadmap.
- "Only superconducting qubits need cooling" as our own words - too strong (F24). Her clip says "in principle", and the narration adds the limit.
- "Photonic machines run at room temperature" - detectors are cold (F24).
- "The first cloud quantum computer" - never say first (F11).
- "Condor was the first chip over 1,000 qubits" - unsafe (F10).
- Never "absolute zero" without "above"; never a country, race, government or funding framing.

## Open items
- IonQ Tempo cloud count unverified: not used.
- The free cloud-access offer she mentions (13:31-13:45) is never used.

## Commands
- Numbers computed: 2.72548 K / 0.020 K = 136 ("over 100 times colder"); 1,121 / 2 ≈ 560 ("about 560 times more qubits than 1998" - not used).
