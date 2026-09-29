# TritonGym — "The Loop" (3D comic, 27.5 s seamless loop, 660 f @ 24 fps)

Logline: in a gym built on a graphics card, a speech-balloon LLM *speaks* a little Triton kernel into being, token by
token, and takes it round the gym's standard circuit: the compile gate CLANGs on a crooked token, the weigh-in checks the
kernel's output against the PyTorch reference, and the hand-tuned oracle racer leaves it standing because it has square
wheels. One refinement (round wheels) and one more lap later it wins the rematch by a nose: **Perf@1 > 1**. Then the LLM
hops back to its bench, where the other 163 operators are stacked up waiting, and starts the next one: the loop.

## 1. Angles considered (story panel: 4 independent proposals, scored by 4 lens judges)

| angle | idea | director | tech-art | domain | web | verdict |
|---|---|---|---|---|---|---|
| **The Loop Circuit** | one LLM builds a token racer; compile → verify → profile → refine is a literal lap round a GPU arena; square wheels = correct but slow | 8.3 | 8.1 | 7.2 | 7.6 | **chosen** |
| Circuit Training | same loop with a paper-scroll runner; ends on a stack of 164 sheets | 7.8 | 6.8 | 7.5 | 6.8 | grafts: gate feedback slip, stack of 164, the oracle winding itself up |
| One Throw vs. The Loop | a one-shot athlete gets one paper-plane throw, the iterating athlete refines to beat a golden oracle | 7.2 | 5.8 | 7.8 | 6.0 | grafts: one-shot baseline gag, dial → stopwatch match cut |
| The Arena of 164 | tour of three split zones under a ring of 164 bulbs, leaderboard drum | 5.5 | 4.8 | 6.4 | 5.0 | rejected: exposition first, reads as a chart/UI; graft: a one-shot dart stuck in the gate |

Why the Loop Circuit: its failure, fix and win are big silhouette changes that read on a 400 px card (paper tokens
flooding emerald, square wheels becoming round ones, a blowout loss then a nose win); every gag is set up and paid off
(the crooked token is planted before anyone notices it); the circuit literally loops; and it has a single headline
payoff. The grafts fix what the judges found: the domain expert's "reads as an agent demo, not a benchmark" (a one-shot
kernel hits the same gate and stays stuck; the stack of 164 operators frames the win as one event) and "verify compares
outputs, not code" (the kernel drops its *output block* on the scale against the torch's reference block).

## 2. Mapping (every shot is a TritonGym concept)

| on screen | TritonGym |
|---|---|
| the gym is a ring track on an emerald circuit board around a graphics card | the benchmark runs every kernel on a GPU |
| **Tok**, a cream speech balloon with an emerald sweatband, pogo-hopping on its tail | the LLM under test (inside an agent workflow) |
| Tok *speaks* chunky code-punctuation tokens `{ } ( ) = * + ;` that snap into a little racer | the LLM writes a Triton kernel |
| **Kern**, the racer: cream token shell while it is source code, emerald after the compile gate | the generated kernel (compiled = runnable) |
| the operator card on top of the stack (a matmul pictogram: grid × grid) | one Standard operator (oracles exist for Standard ops) |
| the **compile gate** (a grumpy portcullis) CLANGs on the crooked token and flicks back an error slip | the standardised compile tool and its feedback |
| **Dash**, a violet paper dart from another entrant, CLANGs on the same gate and stays stuck all film | the One-shot workflow: single pass, no feedback, a failure scores 0; the tools are the same for every workflow |
| Tok presses the crooked token flat (a targeted edit) | iterative refinement from tool feedback |
| **the weigh-in**: Kern drops its output block on one pan, **Torchy** (a torch) has the reference block on the other; the needle settles in a hairline green notch | verify: max absolute error ≤ 0.01 against the PyTorch reference (Pass@1 for the final kernel) |
| **Oro**, a long coral racer with brass tuning knobs, a laurel and a key it winds itself | the hand-tuned oracle Triton kernel |
| the stopwatch on the finish arch, two hands (coral = oracle, emerald = ours) | profile: latency against the oracle |
| square wheels THUNK round the course and lose by a mile | correct but slower: Perf@1 < 1 |
| round wheels (fresh cream tokens) re-flash emerald at the gate and re-pass the weigh-in on lap 2 | every refinement is recompiled and re-verified |
| nose win, emerald hand stops before the coral one, **PERF@1 > 1** | Perf@1 = oracle latency / generated latency > 1: beats the hand-tuned oracle |
| the stack of **164** operator cards by the bench (a thick cream band, a thin coral band, a thin violet band) | 164 operators: Standard 139, OOD 13, DSL 12; the win was one of them |

Not claimed: no model is named or ranked, no leaderboard is shown, no speed-up number, no attempt count lettered.

## 3. Cast (original designs, simple primitives, 2D ink faces painted on the 3D heads)

- **Tok** (LLM): an extruded, bevelled speech balloon (tail at bottom-left) in cream, emerald sweatband, mitt hands,
  emerald sneakers. Moves by pogo hops on its tail. Minimal faces: dot eyes, mouth only on takes (O while speaking, grin,
  star eyes at the payoff, gulp + sweat at the stack). Stays off the race lanes.
- **Kern** (kernel): a low soapbox racer, hip-high to Tok: a shell of 8 fat code-punctuation tokens on a chassis, a
  face on the nose block, a wind-up key, visible axles, outboard coral wheels (cubes → discs). A crooked cowlick token.
- **Oro** (oracle kernel): the same species, longer and sleeker: coral dart body, cone nose, fin, spoked wheels, brass
  tuning knobs down the flank, a laurel round its key. Smug lids; tunes a knob with a tiny wrench; double-take; laurel
  slips over one eye; sporting nod.
- **Dash** (a one-shot kernel): a violet paper dart. One throw, stuck quivering in the gate for the rest of the film.
- **The gate**: two posts and a lintel with a grumpy painted face, one portcullis per lane, a lamp (coral / emerald).
- **The weigh-in** + **Torchy**: a brass balance with a round dial (hairline emerald notch); Torchy is a stout torch
  (handle, cup, teardrop flame, dot eyes on the cup) standing beside it — a pun, not the PyTorch logo.
- **The finish arch**: two striped pylons, a cloth banner hand-lettered **TRITONGYM** (the only appearance of the name),
  the timing stopwatch on top.

## 4. Shots (two laps of the ring: the camera turns 720° per loop, so frame 660 == frame 0)

| # | frames | event → reaction | camera | out |
|---|---|---|---|---|
| B1 WRITE | 0–95 | Tok skids in to the bench out of the seam whip, looks up the tall stack of operator cards ("164" painted on its side), gulps (sweat drop), cracks its knuckles, takes the top card (matmul pictogram). Inhales (balloon swells), then *speaks*: 8 fat tokens pop out on the beat and click together into Kern's shell; 4 square coral wheels plonk on; the last token lands crooked. Kern's eyes blink open; Tok winds its key (3 cranks, Kern squashes on each); Kern hops onto the track | low 3/4 on the bench, lands out of the whip, slow push-in, 4° dutch settling level | whip pan right following Kern |
| B2 COMPILE | 96–191 | Kern trundles on square wheels (body bobs on every flat face) to the gate; Dash zips in on the outer lane. The gate's eyes narrow, lamp coral, both portcullises SLAM: **CLANG!** (2-frame posterised impact frame, shake). Dash sticks in the bars, quivering. A bar swings like a bat and flicks Kern back to Tok (spiral eyes) with an error slip that slaps onto Tok's balloon; Tok peels it off, spots the cowlick, presses it flat. Only our portcullis lifts (lamp emerald); Kern rolls through and its cream tokens flood emerald in a ripple (compiled). Dash stays stuck | knee-height tracking, 6 % punch-in on the CLANG, then a dolly after Kern under the arch | continuous move to the weigh-in |
| B3 VERIFY | 192–263 | Kern drives up to the weigh-in and drops its output block (a little 3×3 tile block) on the left pan; Torchy's reference block sits on the right. The beam dips, one short overshoot, and the needle settles in the hairline green notch; a green flag springs up from the scale's top; Torchy's flame flares, Tok (behind) pumps a mitt | medium, eye level, slow push onto the dial | **match cut**: the round dial becomes the stopwatch face at the same size and place |
| B4 RACE 1 | 264–359 | Pull back from the stopwatch to the start line: Oro tunes a knob with a tiny wrench, then gives Kern a slow smug side-eye; Kern gulps. The stopwatch crown clicks: GO. Oro rockets off (stretch, speed lines) and is gone; Kern lurches off THUNK-THUNK on its square wheels. At the finish Oro is already parked, buffing its laurel; the coral hand stopped long ago; Kern clunks across, steam puffing from its key, and the emerald hand stops way past the coral one | low two-shot at the start, a fast low tracking dolly that loses Oro and settles on the lumbering Kern, then pans ahead to the finish | crash zoom into the square wheel |
| B5 REFINE | 360–419 | Close on a square wheel. Tok (who hopped over along the infield) stares, then its balloon stretches up: idea. It speaks 5 fresh cream tokens: the square wheels pop off (one flops away end over end, because it can't roll), round wheels snap on, a pointed nose token clicks on the front. Kern revs, its new wheels spin in place | close, then a slow 60° orbit so the 3D parts read | whip pan as Kern launches |
| B6 AGAIN | 420–487 | Lap 2 as a slot-car view: Kern zips round the whole ring; at the gate its new cream parts flash emerald (Dash still stuck, quivering), at the weigh-in the block drops and the flag pops at once, and it skids onto the start line beside Oro | a high three-quarter crane over the ring (never top-down), following Kern round | settles into B4's exact start-line framing |
| B7 RACE 2 | 488–563 | Oro starts the same side-eye, then does a double-take at the round wheels (dolly-zoom, sweat drop). CLICK. Neck and neck down the straight; Oro strains, its key spins frantically; at the line Kern stretches its pointed nose forward | same start framing, then a low side tracking dolly with a growing dutch | 2-frame posterised freeze on the photo finish (no white frame) |
| B8 PAYOFF | 564–635 | The freeze shows Kern's nose a hair ahead. On the stopwatch the emerald hand has stopped just short of the coral one. **PERF@1 > 1** (extruded 3D block letters, one line, coral faces, "> 1" largest) drops and slams on the finish line behind the racers: squash, overshoot, dust ring, shake. Staggered reactions ≥ 8 frames apart: a small green check pops on Kern's flank, Kern bounces; Oro's jaw drops and its laurel slips over one eye, then a sporting nod; Tok leaps with star eyes at left, never crossing the letters. Held ≥ 1.8 s | low hero angle at the finish, slow push with a 15° orbit so the letters parallax against the arch | whip pan left as Tok zips back to the bench |
| B9 NEXT | 636–659 | Tok pogo-hops away to the bench — the next operator is waiting | whip pan with smear, continuous through the seam | seamless into B1 (f660 == f0) |

## 5. Text (4 items)
**TRITONGYM** (finish banner, seen in both races and the payoff), **CLANG!** (hand-lettered SFX), **PERF@1 > 1** (the
payoff, extruded 3D letters), **164** (painted object label on the operator stack). No other words; the dial's notch,
the flags, the check mark and the stopwatch hands are unlettered.

## 6. Look and palette
Series 3D comic (as `reference/style-comic`): cel ramp, halftone, burin hatching in the cores, bold boiling ink,
off-register plates, paper grain; hand-built lettering (stroke skeletons, broad-nib ink, halftone shade), never a web font.
Emerald `#059669` dominates (the circuit board, compiled Kern, Tok's sweatband); coral `#ef4b5f` is the one pop (Oro,
wheels, CLANG!, the payoff letters); warm cream paper and a wooden gym around the board; ink `#1a1530`. The sprint lane
is a darker violet-ink ring so emerald Kern never sits emerald-on-emerald. No bloom, no glow haze, no UI.

## 7. Card and poster
Key action and faces in master rows 180–835; nothing in the LIVE-pill corner (x > 1590, y 130–300). Poster ≈ f600 (the
payoff hold after the shake settles): banner, letters, Kern and Oro, Tok; the card loop is rotated to start on it.
