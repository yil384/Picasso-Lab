# Compute Not Included: final script (v10)

## 1. Title, logline, length, twist

**Title:** Compute Not Included

**Logline:** AI's biggest names are predicting the future, and somebody has to pay the compute bill. The bill prints out of the prediction stage and doesn't stop. The lab's red-beret cat drags it downhill into Picasso Lab's engine room. The lab insists it makes no predictions down there, only 136 publications since 2013 that make AI faster, cheaper and possible. Then it breaks its own rule exactly once, and that one forecast wins Best Paper.

**Length:** 110 s = 3,300 frames = 55 bars of 60 frames. 30 fps, 1080x1350 (4:5), silent. Every cut lands on a 60-frame bar (120 bpm; 1 beat = 15 frames).
- About 331 words are on screen, roughly 3.0 words/s. The count for each shot is in the Time column.
- The count includes attributions, and the disclaimer once. It leaves out the running header, the chapter labels and receipt rows the viewer has already read.

**The twist in one sentence:** The engine room says it makes no predictions ("No predictions down here. Just the bill."), then breaks that rule exactly once. Its ISCA 2026 Best Paper literally forecasts data movement, and data movement is the one line on AI's bill that nobody had stamped.

### Rules for every frame
- **Type sizes on the 1080 width:**
  - speaker name: 56 px Inter Bold
  - source and date: 40 px JetBrains Mono
  - quote, dominant line: 80-96 px Inter SemiBold
  - quote, lead-in: 44 px
  - disclaimer: 32 px mono
  - captions: 56-72 px
  - slam words: 112-140 px
  - receipt rows: 44 px mono, fixed 30 characters, price flush right, at most 5 rows legible
  - leader labels: 36 px mono
  - names: 48 px
  - chapter label: 28 px mono, top right
- **Line width:** every line has been checked against the 936 px safe width. Lines marked "/" in the table set on two lines.
- **Safe area:** 72 px side margins. Nothing within 140 px of the bottom edge, where X puts its mute and timer badges.
- **Hold time:** every text element stays on screen for at least 2 s. The cue frames in the table are set so this holds.
- **Quote clippings:**
  - The whole quote and attribution are printed from the clipping's first frame. Only the slam, the dust and the underline animate.
  - The attribution sits above the clipping as a header: speaker on one line, source and date on the next. A single 48 px mono line would be about 1,040 px wide, which does not fit.
  - Red-ink opening and closing glyphs frame the quote. Everything between them is the source text, punctuation included.
  - No tags, no masthead, no company names, no likeness, nothing that looks like X's interface.
- **Header off at the start:** the PICASSO LAB header is off for S01-S07 (frames 0-959). During S01-S04 the header row holds only the disclaimer, top left. Chapter labels start at S05.
- **Named clippings stay apart from the lab:** they appear only in S01-S04 (frames 0-539). No named clipping is ever legible in a frame with the lab's people, cat, papers, logo or Best Paper.
- **Pages:** "real first pages where available". 60 of the 136 pages are real scans, ProfMig and the Best Paper among them. The other pages are typeset with placeholder body text, so they stay out of close-ups and out of focus. Run `social/x/fetch_pages_more.py` before rendering to raise the real count.
- **Table notation:** `<br>` is a line break, [brackets] are staging notes, and four-digit numbers in brackets are cue frames.

## 2. Shot table

| # | Frames | Time · words | Chapter | What the camera sees (paper studio) | Characters (pose file) | On-screen text, exactly | Joke / turn |
|---|---|---|---|---|---|---|---|
| S01 | 0000-0179 | 0-6 s · 32 w | none (disclaimer in the header row) | Cold open, already lit, no fade. **Frame 0 is the impact frame:** a cream newsprint clipping (CC0 scan, torn deckle edges, halftone grain) has just slammed flat on the glossy black floor, and every word is already printed and sharp. The camera is locked 65° above the floor plane, so type is foreshortened by 10% at most. The clipping fills about 80% of the frame. Frames 0-4: a ring of bokeh dust blows outward from the clipping's edges, never over type; the reflection ripples and the camera jolts. Frames 15-45: a red-ink underline draws under the 80 px line. A slow push-in follows. The thumbnail (F0) is frame 0. | none (text only) | [header row, 32 px mono, frames 0-539] Quotes as published. No affiliation.<br>[56 px] ELON MUSK<br>[40 px mono] WEF Davos · Jan 22, 2026<br>[clipping, 44 px] ...probably by 2030 or 2031, call it five years from now,<br>[clipping, 80 px, 4 lines] AI will be smarter than all of humanity collectively. | The hook: the biggest claim in AI, readable whole in the autoplay still. Played straight. |
| S02 | 0180-0299 | 6-10 s · 20 w | none | On the bar, a motion-blurred whip-pan along the floor. Clipping 2 slams flat on frame 180, with the same layout and camera angle. Clipping 1 slides out of focus behind it. A hairline underline draws under the 80 px phrase. | none | [56 px] DARIO AMODEI<br>[40 px mono] “Machines of Loving Grace” · Oct 2024<br>[clipping, 44 px] We could summarize this as a<br>[clipping, 80 px] “country of geniuses in a datacenter”. | Second card: same layout, same respect. |
| S03 | 0300-0419 | 10-14 s · 21 w | none | Whip-pan. Clipping 3 slams on frame 300, and the three now lie in a staggered row as the bokeh brightens. A thick gold underline draws under "a few thousand days" (frames 315-345). It is the heaviest type in the opening. | none | [56 px] SAM ALTMAN<br>[40 px mono] “The Intelligence Age” · Sep 23, 2024<br>[clipping, 44 px] It is possible that we will have superintelligence in<br>[clipping, 96 px, gold underline] a few thousand days (!)… | Plants "a few thousand days" for the last act. |
| S04 | 0420-0539 | 14-18 s · 7 w | none | The three clippings lift, turn upright and hang as a triptych, each in its own spotlight cone with bloom halos. The camera cranes back and up like a keynote product reveal, and a thermal print head glints in the rig above. Bar 2 (0480): one line of small print types along the bottom of the frame, above the badge zone, like the fine print on a toy box. | none | [0420, centred, 56 px] The future, as predicted.*<br>[0480, bottom, 40 px mono] *Compute not included. | Joke 1: batteries-not-included small print, hung off our own caption. It is about cost and corrects nobody. |
| S05 | 0540-0719 | 18-24 s · 19 w | 01 THE BILL | The camera sits just behind the thermal print head in the keynote rig, looking out and down along the paper. A translucent receipt (real thermal-paper scan, toothed tear edge) unspools away from us and falls toward the floor. The header leads at the top of the frame and each new row prints nearest the lens, so it reads top to bottom like a real till receipt. The header prints at 0540, then one row every 30 frames (0570, 0600, 0630, 0660, 0690). Older rows recede, and no more than 5 are legible at once. At 0705 a red ballpoint (real ink scan) circles DATA MOVEMENT. The triptych leaves the top of the frame as the camera follows the paper down. | none | [receipt, 44 px mono]<br>THE BILL<br>GPU TIME ............... a lot<br>MEMORY + CHIPS ......... a lot<br>THE NEXT COMPUTER ........ TBD<br>DATA MOVEMENT ...... even more<br>TOTAL ........................ | Joke 2 setup: a deadpan itemised bill where the prices escalate from "a lot" to "even more". It plants everything later: three lines for the rings, the circled line for the Best Paper, TBD for the blue ring. |
| S06 | 0720-0839 | 24-28 s · 7 w | 01 THE BILL | The printer won't stop. The receipt pours over the edge and falls in loops onto the floor like a party streamer. Low camera along the floor: a river of receipt snakes through the bokeh. The triptych is above the frame and shows only as soft bokeh. At 0720 a slit of white light opens in the floor. At 0750 the lab cat pops up out of the slit and swats a loop. The dots after TOTAL keep ticking on the stretch nearest the lens. | cat (NEW: cat_bat; fallback cat_jump) | [0720, 64 px] Imagining it: free.<br>[0780, 64 px] Running it: see receipt. | The bill has no total. The lab first appears, at 25 s, as a cat that treats the bill as a toy. |
| S07 | 0840-0959 | 28-32 s · 8 w | 01 THE BILL | Bar 1: words slam in on the beats over the paper river (0855 / 0870 / 0885). Bar 2 (0900): the cat grabs the receipt's free end in its teeth and dives back into the slit, yanking the whole river downhill after it. The camera follows the paper in: the glossy floor flashes past the lens (match cut) and we drop into darkness. | cat (NEW: cat_tug; fallback cat_jump) | [0840, 56 px] Someone has to make it<br>[140 px, one per beat] FAST.<br>CHEAP.<br>POSSIBLE. | Logic bridge: who handles the bill? Follow the cat. The bill rolls downhill. |
| S08 | 0960-1079 | 32-36 s · 14 w | 02 ENGINE ROOM | The header returns. The bottom of a deep, dark well: one pool of warm brass lamplight on the lab desk with an empty chair. At 0960 the cat drops in from a far slit of plain light above (nothing printed is visible up there). The receipt pours down after it and coils on the desk. By 1005 the cat is curled asleep on the pile. Bar 2: slow push-in. | desk_empty; cat (cat_jump → NEW: cat_receipt; fallback cat_sleep on the 3D receipt) | [0960, 72 px] The engine room.<br>[1005, leader to the cat, 36 px mono] staff: 1 cat (asleep)<br>[1020, 56 px] No predictions down here. / Just the bill. | The scale gag: the future's bill lands on a desk guarded by a sleeping cat. Plants the twist in the lab's own voice, aimed at itself. |
| S09 | 1080-1199 | 36-40 s · 9 w | 02 ENGINE ROOM | Hard cut on the bar to black. A large year odometer in the centre rolls back from 2026 to 2013, digits blurring (1080-1109). At 1110 a brass lamp clicks on: a smaller desk from a lower angle, with Yufei writing. The desk is different on purpose, because 2013 was before UCSD. The odometer shrinks to the corner. At 1140 a leader line draws from the lamp. | Yufei (y_write) | [odometer] 2026 → 2013<br>[1110, 64 px] One PhD student.<br>[1140, leader, 36 px mono] compute budget: 1 lamp | Joke 3: the first budget calls back to the bill. |
| S10 | 1200-1319 | 40-44 s · 12 w | 02 ENGINE ROOM | (v8 Origin) Hard cut on the bar to a low angle against the dark, with the desk out of frame. Yufei lifts the page overhead. At 1215 the real first page of ProfMig leaves her hands, flips once in the lamplight and flies up, with a leader line tracking it. Bar 2: a small yellowed clipping (aged-newsprint scan, no masthead) drifts across the lens and is sharp from 1260. | Yufei (y_hold_up) | [1215, leader, 44 px] Paper #1: ProfMig, CGO 2013<br>[1260, clipping, 56 px caps] PHD STUDENT FINISHES / FIRST PAPER.<br>MARKETS UNMOVED. | Joke 4: the reverse of the opening clippings. The lab's first paper makes no headlines. |
| S11 | 1320-1439 | 44-48 s · 8 w | 03 GROWTH | (v8 Growth) Pages pour down from the dark like snow, and as they pile up the walls of the well fall away into the full paper studio. Foreground pages are real scans only; typeset pages stay far back and out of focus. Arrivals on the beats: at 1335 Xiang superhero-lands and cracks the floor reflection; at 1365 Zaifeng belly-flops into the pile in a splash of pages; at 1380 Zhongkai walks in with six milk teas, perfectly level. The odometer reaches 124 at 1380 and 136 at 1410. | Yufei (y_proud); Xiang (xiang_land); Zaifeng (zaifeng_flop); Zhongkai (zhongkai_tray) | [odometer, 64 px mono] PUBLICATIONS 001 → 136<br>[1380, 32 px mono] 124 papers + 12 preprints & patents | Physical comedy of the arrivals, with an honest count. |
| S12 | 1440-1559 | 48-52 s · 12 w | 03 GROWTH | (v8 Year by year, merged with the summit) The 124 papers snap into the isotype chart, one page per paper, with columns 2013-2026 receding into depth. Bar 1: a low dolly along the base finds the empty 2016 slot, with the cat asleep in a tiny spotlight. Bar 2 (1500): the camera cranes up the 2020-2025 columns to the tallest, where Xiang stands on the summit. The 12 preprints and patents stay out of shot, since S11 counted them. | cat (cat_sleep); Xiang (xiang_land) | [1440, 56 px] 2016: 0 papers. 1 cat nap.<br>[1500, 56 px] 2025: 19 papers. / Record (so far). | Joke 5: the empty year, then the record. |
| S13 | 1560-1679 | 52-56 s · 12 w | 03 GROWTH | (v8 Venues) Pages rain into towers. ASPLOS and ISCA grow side by side and stop at exactly the same height at 1590; smaller, unlabelled towers stand behind. Yufei stands between the twins. | Yufei (y_think) | [1590, 72 px, on the tower tops] ASPLOS 15 · ISCA 15<br>[1620, 56 px] She refuses to pick.<br>[1620, 32 px mono] two top computer-architecture conferences | Joke 6: the tie, with a gloss so the AI audience gets it. Paid off in the line-up. |
| S14 | 1680-1739 | 56-58 s · 5 w | 04 DIRECTIONS | (v8 Directions, shortened) Yufei leaps and paints three gold ribbons in the air while the cat drags the receipt in from the left of the frame. At 1710 the ribbons hook the receipt and hoist it up behind them like a theatre backdrop. At 1725 the ribbons cool into three glass rings: blue, green, red. | Yufei (y_paint_air); cat (cat_tug) | [1680, 56 px] Three answers to the bill. | Logic: the three directions answer the bill's line items. |
| S15 | 1740-1859 | 58-62 s · 14 w | 04 DIRECTIONS | The green ring fills the frame, wreathed by its 61 pages: real scans turned toward the camera, typeset pages on the far side and out of focus. Zaifeng is inside, hugging a graphics card. At 1770 the ring sweeps over GPU TIME on the backdrop receipt, and a green rubber stamp (real ink scan) slams down, filling the frame before shrinking onto the row. On the same frame Rishabh pops in at the ring's edge. | Zaifeng (zaifeng_gpu); Rishabh (m_rishabh) | [1740, 48 px] Machine learning systems<br>[1740, 36 px mono] LLM serving & training, GPU kernels<br>[odometer, 44 px] 61 publications<br>[1770, stamp] FASTER<br>[1770, leader to Rishabh, 36 px mono] timed by Rishabh | Payoff 1: the bill is answered line by line, and Rishabh times it. |
| S16 | 1860-1979 | 62-66 s · 9 w | 04 DIRECTIONS | The red ring with its 48 pages. Zhongkai raises a rainbow silicon wafer that throws coloured light across the glossy floor. At 1890 the red stamp lands on MEMORY + CHIPS. | Zhongkai (zhongkai_wafer) | [1860, 48 px] Architecture & compilers<br>[1860, 36 px mono] accelerators, memory, chip design<br>[odometer] 48 publications<br>[1890, stamp] CHEAPER | Payoff 2. |
| S17 | 1980-2099 | 66-70 s · 12 w | 04 DIRECTIONS | Bar 1: the blue ring with its 27 pages. Xiang holds up a glowing quantum chip that pulses on the beat. At 1995 the red pen strikes through TBD, and at 2010 the blue stamp lands. Bar 2 (2040): the camera pulls back to the whole backdrop receipt. It carries three stamps, and only DATA MOVEMENT is still circled in red, unstamped and glowing. | Xiang (xiang_chip) | [1980, 48 px] Quantum computing<br>[odometer] 27 publications<br>[2010, stamp] IN PROGRESS<br>[2040, leader to the circled row, 36 px mono] often costs more than the math | TBD becomes IN PROGRESS. Then the one line nobody has stamped gets explained for a general viewer. |
| S18 | 2100-2159 | 70-72 s · 4 w | 05 PLOT TWIST | Hard cut. The rings dim to embers, and all 136 pages blast into a storm around the camera (existing cloud layout, whip blur). Type only, huge; both lines slam on frame 2100. | none | [2100, 64 px] Plot twist:<br>[2100, 112 px] one prediction. | The lab breaks its own rule from S08. The twist starts in chaos. |
| S19 | 2160-2279 | 72-76 s · 8 w | 05 PLOT TWIST | At 2160 the storm freezes in mid-air. At 2175 every page snaps into the final arc (existing end-arc layout), so the chaos becomes a pattern. At 2190 a fourth spotlight snaps on, and the Best Paper's real first page (300 dpi render) rises out of the arc's centre with gold rim light, in a slow three-quarter turn. At 2220 a gold underline runs under "Forecasting" in the title, and the word lifts off the page as a slam. | Yufei (y_award), at the edge of the frame | [2190, paper tab, 36 px mono] OUR FORECAST · ISCA 2026<br>[2205, 72 px] Best Paper Award<br>[2220, 112 px] FORECASTING | The twist lands: the one prediction is a Best Paper, and "patterns behind chaos" is acted out by the lab's own pages. |
| S20 | 2280-2399 | 76-80 s · 12 w | 05 PLOT TWIST | Close on the title, from the 300 dpi page, with the title about 70% of the frame width. The backdrop receipt hangs dimly behind the arc. At 2310 the red ballpoint circle peels off its DATA MOVEMENT row and flies in on a curve. At 2340 it rings "Data Movement" in the title. | none | [2280, 56 px] Big predictions: / where AI goes next.<br>[2340, 56 px, "Ours:" in gold] Ours: / where its data moves next. | The bill's biggest line meets its answer. Big visions run on small, precise forecasts: the difference in scale is played as respect. |
| S21 | 2400-2519 | 80-84 s · 9 w | 05 PLOT TWIST | At 2400 Yufei pulls the end of the receipt down from the backdrop. At 2415 DATA MOVEMENT takes a gold stamp. From 2430 to 2459 she writes the TOTAL by hand in red ballpoint, with a flourish. Bar 2: five gold-foil seals stamp down the receipt below it, one every 10 frames from 2460. The venues on them (ISCA '22, DAC '22, ASPLOS '24 ×2, OOPSLA '20) are small embossed texture. | Yufei (NEW: y_receipt; fallback y_write) | [2415, gold stamp on DATA MOVEMENT] SEE BEST PAPER<br>[2430, red handwriting after TOTAL] working on it.<br>[2460, 36 px mono] + 5 more honours | Joke 7: the endless bill finally has a total, and it is humble. This is the film's only TOTAL punchline. |
| S22 | 2520-2579 | 84-86 s · 6 w | 05 PLOT TWIST | Toast: Yufei raises a milk tea, Zhongkai offers one toward the lens, the cat cheers. Confetti falls through the lamplight. No receipt. | Yufei (y_toast); Zhongkai (zhongkai_offer); cat (cat_cheer) | [2520, 64 px] Best Paper: / still one milk tea. | Joke 8: lab rules beat awards. |
| S23 | 2580-2819 | 86-94 s · 27 w | 06 PEOPLE | Line-up product shot: one long row of the 14 members on the glossy floor, rim-lit, in alphabetical order (Zhongkai and Zhuo side by side at the end). Bars 1-3: the camera trucks left to right with about 5 figures in frame, each about 200 px wide (about 72 px on a phone). Each member steps forward and raises a milk tea on reaching the centre, one every 10 frames from 2580: 13 steps, with Zhongkai and Zhuo stepping together on 2700, their medals flashing in sync. Each name pops in under its member on the step, in two staggered tiers so every name has about 400 px. Bar 4 (2760): the camera cranes back to the whole row, and Yufei steps into the centre front holding the cat. | m_chang, m_haotian, m_jixuan, m_keyi, m_parikshit, m_rishabh, m_xiang, m_xinwei, m_yichen, m_yue, m_zaifeng, m_zhengding, m_zhongkai, m_zhuo; Yufei (y_hold_cat) | [2580, 48 px] Staff: 15 humans, 1 cat (awake).<br>[names, 48 px, each on its step] Chang · Haotian · Jixuan · Keyi · Parikshit · Rishabh · Xiang · Xinwei · Yichen · Yue · Zaifeng · Zhengding · Zhongkai · Zhuo<br>[2700, bracket spanning Zhongkai and Zhuo, 36 px mono] tied for gold<br>[2760, centre, 48 px + 36 px mono] Yufei · PI, cat handler | Warm turn: the engine room is people. Callbacks: "1 cat (asleep)" becomes "1 cat (awake)", and the venue tie returns as a shared gold medal. |
| S24 | 2820-2879 | 94-96 s · 6 w | 06 PEOPLE | A two-frame white flash, then the real team photo as a glossy print lying on the floor under the key light, slightly curled. | real team photo | [2820, 56 px] Pictured: Picasso Lab.<br>Not pictured: you. | The bridge into recruiting. |
| S25 | 2880-2999 | 96-100 s · 10 w | 07 THE NEXT ONE | (v8 The next one) At 2880 the print flips on its vertical axis. Its back is a fresh first page with a blank title and a blinking cursor. It floats up and hangs over the lab desk from 0:32, lamp on. | none | [2895, on the page, 56 px] Paper #137<br>You et al.▌ [blinking cursor]<br>[2940, lab type, 56 px] Your next few thousand days? | The opening's heaviest phrase returns as a question about the viewer's next chapter. No name or clipping in frame. |
| S26 | 3000-3119 | 100-104 s · 10 w | 07 THE NEXT ONE | The lab desk and empty chair, lamp on, framed as in desk_empty. From 3000 to 3014 the cat leaps in; at 3015 it lands in the chair, turns and sits, smug. At 3060 Yufei steps into the light with her arm out toward a second chair, which slides in beside the cat's (3060-3075). The cat stays put. | desk_empty; cat (cat_jump → cat_sit); Yufei (y_invite); NEW: chair_spare | [3000, 56 px] Seat open.<br>[3015, 40 px mono, leader to the cat] (not you, cat)<br>[3060, 72 px] You. Pull up a chair. | Joke 9: the cat claims the seat, and the line is aimed at the cat. Every "you" now means the viewer, and the viewer is invited in. |
| S27 | 3120-3299 | 104-110 s · 18 w | END | (v8 End) The page arc glows behind as the three glass rings rise and interlock into the lab logo above the glossy floor. The cat springs up and bats the red ring as it clicks in (3150). From 3285 to 3299 the frame fades to black, so X's loop has a pause before the opening clipping. | cat (cat_jump) | [3120, 96 px] Picasso Lab<br>[3120, 40 px] UC San Diego · Prof. Yufei Ding<br>[3150, 64 px] We are recruiting / PhD students.<br>[3165, 40 px mono] @PicassoLabUCSD · yufeiding.ucsd.edu<br>[3180, bottom, 40 px mono] *Milk tea included. | Bookend: "*Compute not included." becomes "*Milk tea included." |

## 3. Quote cards (all on the verified list, all verbatim)

| Shot | Speaker | Exact text on screen | Source line on screen | URL (for our records) |
|---|---|---|---|---|
| S01 | Elon Musk | ...probably by 2030 or 2031, call it five years from now, AI will be smarter than all of humanity collectively. | ELON MUSK / WEF Davos · Jan 22, 2026 | https://www.rev.com/transcripts/musk-speaks-at-wef (27:24) |
| S02 | Dario Amodei | We could summarize this as a “country of geniuses in a datacenter”. | DARIO AMODEI / “Machines of Loving Grace” · Oct 2024 | https://www.darioamodei.com/essay/machines-of-loving-grace |
| S03 | Sam Altman | It is possible that we will have superintelligence in a few thousand days (!)… | SAM ALTMAN / “The Intelligence Age” · Sep 23, 2024 | https://ia.samaltman.com/ |

Notes on the cards:
- **S01 (Musk):**
  - The leading ellipsis replaces "And then"; the meaning is unchanged. The split into a 44 px lead-in and an 80 px line is type size only: it is still one continuous sentence.
  - Before render, check the wording against the WEF session video, because the WEF pages return 403. Fortune and Euronews date the session Jan 22, 2026.
  - His "smarter than any human by the end of this year" line is deliberately not used.
- **S02 (Amodei):** the full sentence, with the source's inner quotation marks and the period after them kept exactly. There is no context label.
- **S03 (Altman):**
  - The verified quote exactly, through "(!)". The trailing ellipsis stands for the rest of the sentence: "; it may take longer, but I’m confident we’ll get there."
  - His own hedge, "It is possible", stays on screen. The rest is cut for reading time; it adds both a hedge and an expression of confidence, so leaving it out does not tilt the meaning.
  - The pinned reply links the full essay.
- **Every card:** no company names or job titles, and the same layout, lighting and camera angle for all three speakers.
- **Post text:** the quotes in the X post (section 6) are exact word-for-word fragments of these same three sources.

Reserves, not in the cut (verified verbatim):
- **If the Musk wording fails the video check:**
  - Open on the Altman card; its 96 px "a few thousand days (!)…" works as a frame-0 hook. Amodei stays second.
  - For the third card, use Sam Altman, "Three Observations", Feb 9, 2025: "The cost to use a given level of AI falls about 10x every 12 months, and lower prices lead to much more use." https://blog.samaltman.com/three-observations
- **Alternate third card:** Jensen Huang, GTC 2025 keynote, Mar 18, 2025: "The amount of computation we need at this point as a result of agentic AI as a result of reasoning, is easily 100 times more than we thought we needed this time last year". https://www.rev.com/transcripts/gtc-keynote-with-nvidia-ceo-jensen-huang
- **Do not use:**
  - "Moore's Law has run out of steam." (status "close")
  - the Musk compiler/binary line (status "close")
  - Huang's "one gigawatt factory" line (machine transcript only)
  - Huang's quantum "why he was wrong" line and his "15/20/30 years" line, because both make the joke about a person

## 4. New art (5 images, Pixar-style 3D, flat #00FF00 background)

Generate these with Codex's image tool as in `.claude/films/yufei/anime/gen.sh`, passing the listed references so the designs match. Key them with `tools/key.py`, build relief maps with `tools/depth.py`, and never draw them with code primitives.

1. `cat_bat.png`: the fluffy white cat in its red beret, up on its hind legs, delightedly swatting a loose curl of thermal receipt paper like a party streamer; full body, three-quarter view. Reference: cat_sleep. Used in S06; fallback cat_jump.
2. `cat_tug.png`: the cat walking backward with the end of a long receipt in its teeth, tugging hard, beret askew; full body, side view. Reference: cat_sleep. Used in S07 and S14; fallback cat_jump.
3. `cat_receipt.png`: the cat asleep, curled on a heap of long, curling receipt paper that spills over an edge; paper and cat only, lit and angled to sit on the desk_empty desk. References: desk_empty, cat_sleep. Used in S08; fallback cat_sleep.
4. `y_receipt.png`: Yufei, same design and outfit as y_write, holding the end of a very long receipt that coils to the floor, one eyebrow raised, red pen poised to write. Reference: y_write. Used in S21; fallback y_write.
5. `chair_spare.png`: the same chair as in desk_empty, alone and empty, at desk_empty's camera angle, lit warm from the lamp side. Reference: desk_empty. Used in S26.

The desk continuity needs no new image. The 2013 desk (y_write) and the lab desk (desk_empty) are meant to be different desks, and S09 opens on a hard cut through black with the year odometer, so the change reads as a new place and time.

Real materials (not generated):
- CC0 scans:
  - cream newsprint with halftone grain and torn deckle edges
  - aged yellow newsprint
  - translucent thermal-receipt paper with a toothed tear edge
  - rubber-stamp ink impressions in green, red, blue and gold, used for FASTER, CHEAPER, IN PROGRESS and SEE BEST PAPER
  - a red ballpoint circle, strike-through and handwriting
  - gold-foil seal texture
- **The Best Paper's first page:**
  - Render page 1 of the PDF at 300 dpi (about 2,550 px wide) to `HERO/004.jpg`.
  - Raise the 1,600 px hero cap in `.claude/films/xlaunch/tools/export_pages.py` to 2,400 for page 004.
  - The current `social/x/pages/004.jpg` is only 765x990 and would go soft in S19-S20.

Typeset in code on those textures: the clippings, the receipt (30-character fixed rows), the OUR FORECAST tab and the Paper #137 page.

**Style frames to approve before animating** (the v7 lesson):
- F0, the thumbnail: S01, frame 0
- the receipt river with the cat: S06, frame 780 (0:26)
- the engine room: S08, frame 1020 (0:34)
- the Best Paper with the red circle: S20, frame 2340 (1:18)

## 5. Reused v8 shots

| v8 shot (v8 frames) | Verdict | Where in v10 / what changes |
|---|---|---|
| 01 Origin (0-180) | Kept, changed | S09-S10. Opens on a hard cut through black with the 2026→2013 odometer; the lamp clicks on at the 2013 desk. S10 is a hard cut to a low angle with the desk out of frame. Cat removed from 2013. New type: "One PhD student.", the lamp leader, the Paper #1 label and the MARKETS UNMOVED clipping. "It started with one paper." and the y_think tail are cut. |
| 02 Growth (180-420) | Kept, changed | S11, cut to 4 s. Pages fall from the dark and the well opens into the studio. The odometer is labelled PUBLICATIONS, with the 124 + 12 line. Real scans only in the foreground. The name tags, the 2014-2019 orbit, y_surprise and "Then a few more. / Then a team." are cut. |
| 136 gallery (420-540) | Cut | The count lives in the odometer. Its cloud and arc layouts are reused for the twist (S18-S19). |
| Year by year (540-720) | Kept, changed | S12, 4 s, merged with the 2025 summit. The domino topple and the preprint stack are cut. |
| Venues (720-900) | Kept, changed | S13. Counts sit on the tower tops, with a gloss line; the small line of other venues is cut. |
| 03 Directions (900-1140) | Kept, changed | S14-S17. Paint beat shortened to 2 s; the cat drags the receipt in and the ribbons hoist it as a backdrop. Stamps FASTER / CHEAPER / IN PROGRESS. Counts read "publications". Rishabh pops in. Order is green, red, blue. The data-movement explainer is added. The red-ring push-through is cut. |
| 04 Recognition (1140-1320) | Changed | The Best Paper rises out of the storm-to-arc snap with the OUR FORECAST tab and the FORECASTING slam (S18-S20). The honours row becomes five gold seals and one line (S21). The toast moves to S22 (2 s, no receipt). |
| 05 People (1320-1440) | Changed | S23-S24: an 8 s single-row truck with names only, then the real team photo with "Pictured / Not pictured". "Say hot pot!" is cut. |
| The next one (1440-1620) | Kept, changed | S25-S26. New lines: "Your next few thousand days?", "Seat open.", "(not you, cat)", "You. Pull up a chair." The page now hangs over the lab desk, and the second chair is added. |
| End (1620-1770) | Kept, changed | S27, 6 s. "*Milk tea included." added, with a 15-frame fade to black for the loop. |
| New builds | New | S01-S08 (clippings, triptych, print head, receipt and river, floor slit, well), the S18 storm (from the cloud layout), the S21 receipt finale. |

The client's 2-seconds-per-member roll call (about 28 s) does not fit under 112 s. Offer it as a follow-up series instead: "Staff on duty", one 6 s clip per member, each with a kind subtitle that the member has approved.

## 6. The X post

All quoted fragments are exact words. Names are written as plain text, never as @-mentions. Lengths are as X counts them; every caption is under 270 characters and every post under 280 with the hashtags.

**Caption A** (post on the morning of Sunday Nov 1, 2026, US Pacific; 250 characters, 267 with hashtags):

> Elon Musk: "smarter than all of humanity collectively"
> Sam Altman: "a few thousand days"
> Dario Amodei: "a country of geniuses in a datacenter"
>
> Somebody has to pay the compute bill. Day 5,000 of working on it.
>
> PhD students wanted. Milk tea included.

**Caption B** (evergreen; 259 characters, 276 with hashtags):

> Elon Musk: "smarter than all of humanity collectively"
> Sam Altman: "a few thousand days"
> Dario Amodei: "a country of geniuses in a datacenter"
>
> Somebody has to pay the compute bill. We've been working on it since 2013.
>
> PhD students wanted. Milk tea included.

**Caption C** (lower risk, if university comms prefer no Musk in the text; 204 characters, 221 with hashtags): the same as B without the Musk line.

**Hashtags:** #MLSystems #PhD, on their own line after a blank line. Optional extras go in a reply, not the post: #QuantumComputing #ComputerArchitecture #ISCA2026.

**Day count:**
- Day 5,000 counts Feb 23, 2013 (the opening day of CGO 2013, where ProfMig appeared) as Day 1.
- Checked: Nov 1, 2026 is Day 5,000; today, Oct 3, 2026, is Day 4,971.
- "Day 5,000" echoes "a few thousand days".
- Use caption A only on Nov 1, and caption B on any other day. Early November is PhD-application season either way.

**Pinned first reply** (240 counted characters; each link counts as 23):

> Quotes in the film, exact words, no affiliation:
> Musk, WEF Davos, Jan 22, 2026 https://www.rev.com/transcripts/musk-speaks-at-wef
> Amodei, "Machines of Loving Grace," Oct 2024 https://www.darioamodei.com/essay/machines-of-loving-grace
> Altman, "The Intelligence Age," Sep 23, 2024 https://ia.samaltman.com/

**Mentions:**
- **Could mention** (check each handle first):
  - @UCSanDiego, @UCSDJacobs, the UCSD CSE department account.
  - The ISCA / ACM SIGARCH accounts, but only in a reply about the Best Paper.
  - Members' and co-authors' own accounts, with their consent.
  - Risk is low. Give university comms a heads-up first, because the post names well-known CEOs and they may want to vet it. Tagging a conference account on a recruiting post can read as promotion.
- **Do not mention or quote-post:** @elonmusk, @sama, @DarioAmodei, @lexfridman, or any company account.
  - Tagging implies endorsement or looks like bait.
  - It invites pile-ons and political replies, especially under Musk.
  - It raises the risk of a Community Note.
  - Out of context, the cost jokes can be read as mockery.
  - Plain-text names with exact quotes give search reach without any of this.

## 7. Risks and how the script avoids them

**Real people**
- They appear only as printed text: exact verified words with name, source and date. The speaker name is 56 px (about 20 px on a phone) and the source is 40 px (about 14 px). There is no likeness, drawing, photo, look-alike, X-style interface, masthead or company name.
- All three cards share one layout, one camera and one tone. "Quotes as published. No affiliation." stays on screen for frames 0-539, and the pinned reply links every source.
- **No implied link:**
  - The PICASSO LAB header is off for frames 0-959.
  - Named clippings exist only in frames 0-539.
  - When the cat first appears (S06), the triptych is above the frame and shows only as bokeh.
  - The engine-room slit shows only light.
  - The Best Paper tab reads "OUR FORECAST · ISCA 2026" in the lab's own type, with no "peer-reviewed" and no numbering.
  - The recruiting payoff ("Your next few thousand days?") shows no name and no clipping.
- **The jokes aim at the lab itself:**
  - "No predictions down here. Just the bill." and "Plot twist: one prediction." poke fun at the lab.
  - "Imagining it: free. / Running it: see receipt." is about the cost of running AI.
  - "Big predictions: where AI goes next. / Ours: where its data moves next." frames the lab as serving the big picture, not correcting it.
- **Fair quoting:**
  - Musk's 2030/2031 line cannot lapse after posting.
  - Altman's own hedge, "It is possible", stays on screen; the ellipsis marks the rest of his sentence, and the source is linked.
  - Amodei's sentence is shown whole.

**Accuracy** (checked against social/x/pubs.json)
- 136 publications = 124 peer-reviewed papers + 6 arXiv + 1 preprint + 5 US patents. The film always says "publications" for 136. The year chart shows the 124 papers. The ring counts 61/48/27 add up to 136.
- Year counts: 2016: 0; 2025: 19, labelled "Record (so far)" because 2026 is still open.
- Venues: "two top computer-architecture conferences", not "the two top", because MICRO and HPCA are top venues too.
- The data-movement label keeps "often".
- Quantum: TBD becomes IN PROGRESS, and the rings are "Three answers to the bill", not "ways to shrink" it.
- Honours: five seals = Best Paper Nominee at ISCA 2022 and DAC 2022, Distinguished Artifact at ASPLOS 2024 (×2), Distinguished Paper at OOPSLA 2020.
- No model or product names anywhere. The Best Paper title appears only on the page itself.
- **Pages:** only 60 of the 136 first pages are real scans, so close-ups and in-focus foregrounds use only those 60. The script never claims every page is real. The S19-S20 close-up uses a 300 dpi render.
- **The 2013 origin** names no place, and its desk differs from the lab desk on purpose, because she was a PhD student before UCSD.
- **Dramatisation:** "compute budget: 1 lamp", the MARKETS UNMOVED clipping and the cat are dramatisation and read as such.

**Tone**
- Every joke lands on bills, receipts, naps or milk tea.
- Members get names only, so nobody is the afterthought of a joke. Zhongkai and Zhuo share one "tied for gold" bracket.
- Get each member's OK to appear before render.
- "(not you, cat)" has a leader line to the cat, so the film never turns the viewer away.

**Readability**
- About 331 words in 110 s, roughly 3.0 words/s overall.
- The three quote cards run hotter, about 5 words/s raw, because they are verbatim and carry their attribution. Each has one dominant line of at most 9 words.
- Frame 0 shows the whole Musk quote and its attribution.
- Every text element holds at least 2 s. The smallest type is the 32 px disclaimer.
- The line-up truck keeps faces about 200 px wide.
- The lab is on screen by 25 s (the cat) and named at 32 s.
- Judge by screenshots at phone and desktop sizes.

**Craft**
- Approve the four style frames before animating.
- Clippings, receipts, stamps, pen marks and seals are textured from real scans.
- New characters come from the image tool on #00FF00, never from code primitives, and each has a named fallback.
- The 15-frame fade to black at the end gives X's loop a pause.

**Platform**
- The CapCut track must be cleared for use on X; an uncleared pop track can get the video muted or taken down.
- Moderate replies under the post, and keep the pinned reply factual.

---

## Changes

- **Numbering:** old S05 is cut and old S27 and S28 are merged. New S05-S25 are old S06-S26, new S26 is old S27+S28, and new S27 is old S29.
- **Blocker, S01:**
  - The whole quote is printed from frame 0, and the slam happens on frame 0, the first downbeat. F0 is now frame 0.
  - "AI will be smarter than all of humanity collectively." is the dominant 80 px line, under a 44 px lead-in from the same sentence.
  - The attribution replaces the kicker as a header: name at 56 px, source and date at 40 px mono on a second line, because one 48 px line would not fit.
  - The disclaimer is now a persistent 32 px line for frames 0-539.
  - S01 is 3 bars long, and the camera is locked at 65° above the floor (foreshortening of 10% at most).
- **Text density:** cut from about 530 to about 331 words (3.0 words/s), with a word count for each shot.
  - S05 and its card are cut; the S06 header is just "THE BILL".
  - Only one TOTAL punchline remains, and the toast is one line.
  - The honours line became five seals and "+ 5 more honours".
  - FORECASTING is now the slam word and the title stays on the page.
  - Cut: "3:07 a.m.", the duplicate lab name, the MoE chip, the name tags in the growth shot, the preprint stack label, "GPUs: 0", the small venue line, the blue ring's detail line and the line-up subtitles.
- **Timing:** the map follows the review, except that the venue beat keeps 2 bars so its gloss can be read. The extra bar comes from the toast (now 1 bar). The total is still 3,300 frames, and S08 still starts at frame 960.
- **Desk continuity:** S09 opens on a hard cut through black with the odometer to a deliberately different 2013 desk (2013 was before UCSD). S10 is a hard cut with the desk out of frame. The Paper #137 page now hangs over the lab desk (desk_empty). cat_receipt and chair_spare use desk_empty as their reference.
- **Best Paper resolution:** a 300 dpi render to HERO/004.jpg, with the hero cap raised to 2,400 px for that page. Typeset pages stay out of close-ups. The script now says "real first pages where available" (60 of 136).
- **Twist plant:** S08 now says "No predictions down here. Just the bill." S18 reverses it: "Plot twist: one prediction." S17 bar 2 explains the circled line with a leader: "often costs more than the math".
- **Jab risk:** the tab now reads "OUR FORECAST · ISCA 2026" with no "peer-reviewed", and S06 reads "Imagining it: free. / Running it: see receipt."
- **"(not you)":** now "(not you, cat)" with a leader line to the cat. S27 and S28 merged into one 4 s shot: "(not you, cat)" holds 3.5 s and "You. Pull up a chair." holds 2 s.
- **Line-up:**
  - Names only, at 48 px, in two staggered tiers.
  - A single-row camera truck keeps faces about 200 px wide.
  - One shared "tied for gold" bracket for Zhongkai and Zhuo; Xinwei's "hot pot desk" tag is gone.
  - Members step every 10 frames, so every step lands on a whole frame.
- **X post:** captions now name Musk, Altman and Amodei with exact quote fragments in plain text, with no @-mentions.
  - Captions A and B are 250 and 259 characters; each post stays under 280 with the hashtags.
  - Caption C (without Musk) is the fallback if comms prefer.
  - The pinned reply now carries the three source links itself (240 characters).
- **Receipt origin:** the bill now prints from the keynote rig above and falls down. The cat drags it downhill through the floor slit, comes down with it into the engine room, and drags it back in at S14. In S21 Yufei writes the total by hand, so no printer runs out and no second receipt comes out of the floor. Every named clipping is out of frame before the cat appears.
- **Receipt typesetting:** fixed 30-character rows (792 px at 44 px) with the price flush right. "DATA MOVEMENT ...... even more" escalates the joke. The milk-tea row is gone.
- **Recruiting callback:** "a few thousand days" is now the heaviest phrase in S03 (96 px, gold underline), and the callback in S25 is the question "Your next few thousand days?".
- **Venues:** a gloss line now reads "two top computer-architecture conferences".
- **Directions:** the S14 caption is now "Three answers to the bill."
- **Rishabh:** pops in on the stamp frame with the leader "timed by Rishabh".
- **Loop seam:** a 15-frame fade to black at the end.
- **Altman card:** now ends at "(!)…", exactly the verified quote, with his "It is possible" hedge on screen; this saves 11 words.
- **New art:** still 5 images; no sixth image was needed for the desks.