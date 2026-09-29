# ChipMATE: "Twin Check" (3D comic, 30 s seamless loop, 720 f @ 24 fps)

Logline: two tiny agents get the same order. Each builds it their own way, behind a screen. A dice machine
fires the same random inputs into both, and a street of check-lamps compares their outputs tick by tick.
One lamp goes red, a note flies back, the bug gets whacked. Round 2: every lamp lights, and so does the city.
Then the little pair takes on a giant at the fairground high-striker: 71.2% for the giant, 80.1% for them.

## 1. Angles considered

| # | angle | what it shows | verdict |
|---|---|---|---|
| A | **Twin Check** (buddy duo + the harness) | Verilog builder and Python twin build the same spec independently; random stimuli into both; cycle-by-cycle compare; mismatch -> diagnostic -> fix -> round 2 -> match 1.0 | **picked** (with C as the payoff coda). Every step of ChipMATE's loop is a physical action, and the bug hunt is a built-in conflict. |
| B | **Clock Tower City** (a tour of a chip city: signals as traffic, inspectors stamp each intersection per clock tick) | cycle-by-cycle checking as city life | Rejected: pretty, but the *two independent models* idea disappears; inspectors read as a golden testbench (the one thing ChipMATE does not have). |
| C | **David vs Goliath** (the whole film is a contest: tiny 9B duo vs a 1.6T giant) | the headline number | Rejected as the whole story (it says nothing about *how*), kept as the payoff: a fairground high-striker is a prop characters *do* something to, not a bar chart. |
| D | **Training gym** (RL: the reward is a handshake when the twins agree) | cross-agreement reward | Rejected: mixes training and inference in 30 s and needs text to explain "reward". The handshake survives as the high-five after match 1.0. |

## 2. Accuracy map (every beat -> a fact from the site)

| beat | ChipMATE fact |
|---|---|
| one order ticket pops into two identical copies | both agents get the same natural-language spec + port skeleton (the ticket shows scribbled lines + a box with in/out ports) |
| a screen pops up between them; the snake's peek gets bonked | the two agents work **independently** |
| the builder hammers gate-blocks into a chip; the snake writes a scroll that rolls into a model | Verilog agent -> synthesizable `top_module`; Python agent -> reference-model function |
| both drop their work into the harness; dice tumble; one die hops station to station and re-rolls each tick | cross-verify harness drives **random input stimuli** into both, the **same** input to both each cycle |
| two square-wave ribbons (amber = Verilog, teal = Python) grow one cycle per clock tick; a check-lamp between them per cycle | **cycle-by-cycle** comparison; the lamps are the match rate (lit / total) |
| lamp 5 goes red, BZZT; gauge on the harness stops at 7/8 | a disagreement; match rate < 1 |
| printer slip with the two traces and cycle 5 circled, folded into two paper planes, one to each agent; they blame each other first | structured diagnostic fed back in natural language; "any mismatch is a candidate bug in **either** agent" |
| a bug peeks out of the chip; wrench, the bug flees; round tally 2 of 5 | refine loop, at most 5 rounds |
| round 2 (new dice): all 8 lamps amber, gauge to 1.0, the city lights up | loop ends at match_rate = 1.0 |
| no teacher, no answer key, no third checker anywhere | **zero golden testbenches** |
| giant "1.6T" hits 71.2%; the duo ("9B" on the hard hat) hit together: 80.1% | VerilogEval V2 pass@1: ChipMATE-Agents-9B 80.1% vs DeepSeek V4 (1.6T MoE) 71.2%; the scale is proportional (0 at the pad, 100 at the bell) and neither rings the bell |

Numbers used: 80.1%, 71.2%, 9B, 1.6T. Not used: the 4B model, the old card's "DeepSeek V3 / 20-180x" (see the final report).
The competitor is not named or caricatured: the giant is an original robot with a "1.6T" chest plate.

## 3. Cast (original designs; three distinct silhouettes)
- **Chip** (Verilog agent): an amber IC package that walks: a rounded box body with silver pins along its lower edge, stubby
  ink legs, capsule arms, a cream hard hat stamped "9B", the chip notch as a belly mark. Face baked on the front.
  Silhouette: box + hat. Props: mallet, wrench.
- **Py** (Python reference-model agent): a teal snake coiled on a cushion, big round head with round ink glasses,
  cream belly, quill held in the tail tip. Silhouette: S-coil + ball head.
- **The bug**: a tiny ink beetle with white eyes that lives in the round-1 chip.
- **The giant "1.6T"**: a slate-violet box robot, ~7x Chip's height, single visor eye, a chest plate "1.6T", a sledgehammer.
- Props with a job: the **harness** (cream-and-amber cabinet: dice dome, two hoppers, match gauge, printer slot, lever,
  round tally of 5), the **check-lamps** (dome lamps in the street median, one per cycle), the **clock tower** (the city
  clock, its hand jumps once per cycle), the **high-striker**.

## 4. World
One real three.js set rendered through the NPR comic look (cel ramp, halftone in the shade, inked hull + Sobel lines,
off-register plates, paper grain). A **chip city at dusk** on a silicon die: cream die top with amber copper traces as
roads and vias as manholes, streets of logic-gate buildings (AND / OR / NOT / flip-flop shapes, cream windows), the clock
tower behind the check street, gold pins along the die edge, and beyond it the dark-teal PCB with a skyline of giant
components (capacitors, a resistor, another chip) fading into a painted dusk sky. Left to right, like a comic strip:
**workshop (Chip | screen | Py | harness) -> check street (8 stations) -> fairground (high-striker, the giant off the die)**.

Palette: cream paper `#f4ebd6`, **amber `#d97706`** dominant (Chip, traces, lamps, windows, sunset), teal pop `#1f9bc4`
(Py, its ribbon), ink `#1a1530`; red only for the mismatch lamp and the bug's alarm. Lighting arc (real lights):
dusk key -> lights-down for the blame -> the city's windows switch on after match 1.0 -> warm fairground -> dusk.

## 5. Shots (frames @ 24 fps)
| # | frames | read | action (event -> reaction) | camera | out |
|---|---|---|---|---|---|
| S1 | 0-72 | **same order to both** | Crane down over the dusk chip city to the workshop under its "ChipMATE" sign. The tube THUNKs, an order ticket pops out, flips and poofs into two identical tickets; Chip catches its copy with both hands, Py with its tail; both read (eyes scan), determined. | high crane + push | continuous |
| S2 | 72-168 | **independently** | A folding screen springs up between them. Py stretches to peek; the screen jumps taller and bonks its nose (swirl eyes). Chip hammers three gate-blocks into an amber chip (sparkle); Py scribbles a scroll with its tail-quill and rolls it into a teal model can. Both show off their work (offset timing). | slow truck left -> right across both, punch-in on the bonk | pan follows the toss |
| S3 | 168-300 | **random stimuli, cycle by cycle** | Both toss their work into the harness hoppers (Chip's toss sails over Py, who ducks). Chip yanks the lever; dice tumble in the dome; a die hops down the median to station 1, 2, 3... re-rolling each hop while the clock tower ticks. Each tick the two ribbons grow one cycle and the station lamp lights amber when they agree. Cycle 5: amber goes high, teal stays low: the lamp goes RED, BZZT!, shake. Cycles 6-8 agree. | whip right, then a fast lateral truck with the wavefront (lanes stacked on screen), shake on the hit | swing back |
| S4 | 300-378 | **a mismatch is a candidate bug in either** | The gauge stops at 7/8; the printer spits a slip (both traces, cycle 5 circled) that folds into two paper planes. Meanwhile Chip and Py point at each other (anger marks). The planes land on their heads; both read. Py's eyes pop: a bug peeks out of the chip in the hopper. Chip sweats. | two-shot, push, pan to the bug | continuous |
| S5 | 378-414 | **refine** | Wrench wind-up, WHACK (impact star): the bug pops out and scuttles off the edge. The tally gets its 2nd of 5 dots; lever again. | close, shake | whip right |
| S6 | 414-516 | **match rate 1.0** | New dice, faster ticks: all 8 lamps light amber, the ribbons identical. Gauge slams to 1.0, DING; a wave of light rolls through the city (windows, clock face, lamps). Chip and Py high-five (hand to tail). | low fast truck, then crane up over the lit city | whip right |
| S7 | 516-594 | **the giant** | The fairground at the city edge. THOOM: a giant foot lands (dust); tilt up the giant ("1.6T"). It swings its sledgehammer: WHAM, the puck climbs to the 71.2% pennant and stops. The giant flexes. The duo hop in at the pad, tiny, with a tiny mallet ("9B" on the hat). | whip in, tilt up, tilt down | continuous |
| S8 | 594-672 | **80.1%, ~200x smaller** | Wind-up together (Py's tail wraps the handle), WHAM (impact frame), the puck rockets past 71.2% to 80.1%; extruded "80.1%" slams down in front of the tower. Hold 2 s: the giant's jaw drops, sweat; the duo cheer, out of phase. | low hero angle, slow orbit | whip left |
| S9 | 672-720 | **home** | Whip back across the city; under the smear the lights settle back to dusk; crane up to the frame-0 pose; the tube rumbles with the next order. | whip + crane | seamless into S1 |

Text: "ChipMATE" once (the shop sign), "9B" and "1.6T" as object labels, "71.2%" (pennant) and "80.1%" (extruded 3D, the
payoff), SFX "BZZT!" only (plus pictorial hits). No borders, panels, charts or titles.

## 6. Card plan (400x195, centre 1.82:1 crop)
Key action inside master y 120-960. Payoff "80.1%" centred at master y ~420-620, >= 200 px tall, held 2 s; poster = that
hold. The card loop is rotated to start on the poster frame so the first frame of the video matches the poster.
Lanes are stacked on screen (camera elevation ~33 deg) so the two waveforms and the lamps between them read as a trace
viewer at card size.

## 7. Loop
Camera, poses and lights are closed-form in the frame index; the S9 whip returns to the S1 crane pose, and all state
(tickets, ribbons, lamps, city lights, dice, bug) resets under the whip. Frame 720 == frame 0 by construction.
