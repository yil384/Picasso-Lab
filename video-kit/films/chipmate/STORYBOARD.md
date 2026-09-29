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
| check-lamps grin on a match, X-eyes on the mismatch; both candidates come back after the diagnostic, Py's model is clean, the bug is in the chip | the harness does not know who is wrong; the agents find out |
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

## 5. Shots (frames @ 24 fps) - as built
| # | frames | read | action (event -> reaction) | camera | out |
|---|---|---|---|---|---|
| S1 | 0-72 | **same order to both** | Crane down over the dusk chip city (signal pulses run along the copper-trace roads, the clock tower stands over the check street) past the "ChipMATE" shop sign to the workshop. The delivery pipe in the shop wall THUNKs (f28), an order ticket pops out, flips and poofs into two identical tickets (f46); Chip catches its copy with both hands (f52), Py with its tail (f55); both read (determined); Chip tucks its copy under the hard hat, Py pins its copy on the lectern. | one continuous crane through the loop seam: city -> sign -> workshop | continuous |
| S2 | 72-168 | **independently** | A folding screen springs up between them (both jump, "!"). Py stretches up to peek over it; the screen's top panel pops up and bonks its snout (f97, swirl eyes). Chip hammers three gate-blocks (AND / OR / flip-flop) on the anvil: hits f100/110/120, they fuse into an amber chip (f127, puff + sparkles). Py scribbles its reference model on the lectern with the quill in its tail tip (f112-134) and rolls the scroll into a teal model can. Both show off their work (offset timing); the screen folds away. | truck from Chip's anvil to Py's lectern, punch-in on the bonk | pan follows the toss |
| S3 | 168-296 | **random stimuli, cycle by cycle** | Chip tosses the chip into the harness's amber hopper, over Py, who ducks (f168-186); Py tail-tosses its can into the teal hopper (f177-191) and pulls the lever (f194). Dice tumble in the dome. One die hops down the street median station to station, landing each clock tick (f210 + 10k) showing a new random face; the clock tower's hand jumps one mark per cycle. Each tick both ribbons (amber = Verilog, teal = Python model) grow one cycle and the station's check-lamp lights with a grin when they agree. Cycle 5: amber high, teal low: the lamp goes red with X-eyes, BZZT!, impact frame, shake (f257). Cycles 6-8 agree. | whip right (smear), then a fast lateral truck with the wavefront over the dark asphalt (lanes stacked on screen like a trace viewer) | whip back |
| S4 | 296-378 | **a mismatch is a candidate bug in either** | The gauge stops at 7/8; the printer spits a slip (both traces, cycle 5 circled) that folds into two paper planes (f314). Chip and Py blame each other (anger veins, stomping, tail pointing). The planes land on both heads (f338/341); both read. Both candidates pop back out of the harness (f350-364): the chip to Chip's anvil, the model can to Py's lectern. Py checks its model: clean (chalk tick, f372). A bug peeks out of the chip; Py's "!" and pointing tail; Chip sweats (sheepish). | two-shot, push, inspection two-shot | push to the anvil |
| S5 | 378-432 | **refine (round 2 of at most 5)** | Wrench wind-up, WHACK (f392): the bug flies out and scuttles off. Chip picks the chip up and tosses it back (f404-418); Py tail-tosses its model back (f407-420); the harness tally fills its 2nd of 5 dots (f404); Py pulls the lever (f420); the round-1 ribbons rewind into the harness. | anvil close-up, swing to the harness | whip right |
| S6 | 432-522 | **match rate 1.0** | New dice, faster ticks (f432 + 8k): all 8 lamps grin, the ribbons identical. The gauge slams to 1.0 and the harness bell DINGs (f492). High five, hand to tail tip (f503). The city's windows switch on in a wave outward from the check street, the clock face lights (f504-522). | low truck, whip back, duo two-shot, crane up over the lit city | whip right |
| S7 | 522-606 | **the giant** | The fairground stage at the city's edge. THOOM: a giant steps in off the die (f540, dust); "1.6T" on its chest. It winds its sledgehammer overhead and WHAMs the high-striker (f568, impact frame): the puck climbs to 71.2% and stops; a "71.2%" pennant flips out; it flexes smugly. The duo hop onto the stage (f594-604) with Chip's mallet ("9B" on Chip's hat). | whip in, tilt up the giant, down to the stage | continuous |
| S8 | 606-694 | **80.1%** | Wind-up together (Py's tail wraps the mallet handle), WHAM (f618, impact frames): the puck rockets past the 71.2% pennant and stops at 80.1%. Extruded "80.1%" numerals drop onto the teal podium one by one and slam (f634); the duo cheer out of phase. Reaction shot: tilt up to the giant, whose visor flips to a huge round eye, "!", jaw drops, sweat (f658-678); tilt back to the numerals. | payoff frame (poster f648), tilt up to the giant, back | whip left |
| S9 | 694-720 | **home** | Whip back across the city; under the smear the lights, ribbons, lamps and props reset; the crane continues through the seam into S1. | whip + crane | seamless into S1 |

Text: "ChipMATE" once (the shop sign), "9B" and "1.6T" as object labels, "71.2%" (pennant) and "80.1%" (extruded 3D, the
payoff), SFX "BZZT!" only (plus pictorial hits). No borders, panels, charts or titles.

## 6. Card plan (400x195, centre 1.82:1 crop)
Key action inside master y 120-960. Payoff "80.1%" in the central band (master y ~330-560), ~210 px tall, held ~1 s
before and ~0.5 s after the giant reaction; poster = f648. The card loop is rotated to start on the poster frame so the first frame of the video matches the poster.
Lanes are stacked on screen (camera elevation ~33 deg) so the two waveforms and the lamps between them read as a trace
viewer at card size.

## 7. Loop
Camera, poses and lights are closed-form in the frame index; the S9 whip returns to the S1 crane pose, and all state
(tickets, ribbons, lamps, city lights, dice, bug) resets under the whip. Frame 720 == frame 0 by construction.
