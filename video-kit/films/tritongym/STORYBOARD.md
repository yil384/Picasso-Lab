# TritonGym — "The Loop" (3D comic, 27.5 s seamless loop, 660 f @ 24 fps)

*Shot table updated after review round 1 (r2 staging); the angles and mapping below are unchanged.*

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
| **Dash**, a grey paper dart from another entrant, CLANGs on the same gate and stays stuck all film | the One-shot workflow: single pass, no feedback, a failure scores 0; the tools are the same for every workflow |
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
- **Dash** (a one-shot kernel): a grey paper dart. One throw, stuck quivering in the gate for the rest of the film.
- **The gate**: two posts and a lintel with a grumpy painted face, one portcullis per lane, a lamp (coral / emerald).
- **The weigh-in** + **Torchy**: a brass balance with a round dial (hairline emerald notch); Torchy is a stout torch
  (handle, cup, teardrop flame, dot eyes on the cup) standing beside it — a pun, not the PyTorch logo.
- **The finish gantry**: one striped pylon on the infield kerb set back before the line, a diagonal arm carrying a board
  hand-lettered **TRITONGYM** (the only appearance of the name) over the line. The timing stopwatch stands on its own
  tower mid-straight, its face turned towards the finish.

## 4. Shots (two laps of the ring: the camera turns 720° per loop, so frame 660 == frame 0)

| # | frames | event → reaction | camera | out |
|---|---|---|---|---|
| B1 WRITE | 0–95 | Tok pogo-hops in out of the seam whip and skids beside the tall stack of operator cards ("164" painted on its side; the cream Standard band on top). It looks up the stack, gulps (sweat drop), takes the top card and holds it up beside its face: a matmul pictogram (grid × grid) — *this* operator. It lays the card on the bench, inhales (balloon swells), then *speaks*: 8 fat Triton/Python tokens (`@ ( ) [ ] * + =`) pop out of its mouth on the beat and arc onto the bench, clicking together into Kern's shell; 4 cream square wheels plonk on; the last token (`:`) lands crooked; the card flips up and slaps onto Kern's side as its racing number plate. Kern's eyes blink open; Tok winds its key; Kern hops off the bench's end onto the board with a squash | 3/4 on stack · Tok · bench, lands out of the whip, slow push-in drifting right, dutch settling level | whip pan right following Kern |
| B2 COMPILE | 96–191 | Kern trundles on square wheels (body bobs on every flat face) to the gate; Dash, a grey one-shot dart, zips in on the inner lane with speed lines. The gate scowls, lamp coral, both portcullises SLAM: **CLANG!** (2 impact frames posterised by object: the subject stays a light plate, the set goes ink; never a white frame). Dash sticks in the bars, quivering, and stays stuck. Kern bounces back in two hops and lands dizzy in front of Tok; the error slip (the crooked `:` circled, a caret under it) slaps onto Tok's face; Tok peels it off and reads it. Insert: the crooked token, a mitt comes down and presses it flat (squash). The gate nods, the lamp goes emerald, only our portcullis lifts; Kern rolls through the arch towards us and its cream tokens flood emerald (compiled) | 3/4 on the gate, punch-in on the CLANG, pan to Tok; cut to the insert; cut back with a tilt up to the lamp; whip ahead to a low front view looking back through the arch | whip to the weigh-in |
| B3 VERIFY | 192–263 | Kern parks at the weigh-in (Tok on the open side). With only Torchy's reference block on the right pan the beam hangs right-down and the needle is pegged in the coral. Kern drops its output block (a 3×3 tile block) on the left pan: the beam swings, the needle swings through, overshoots, settles in the wide emerald notch; an emerald fan floods the dial (PASS), a big green flag springs up above the beam; Torchy's flame flares, Tok pumps a mitt | wide enough for flag and faces, slow push, then a push onto the dial | **match cut**: the round dial becomes the stopwatch face at the same size and place |
| B4 RACE 1 | 264–359 | Pull back from the stopwatch to the start line: Oro turns its face to us and gives Kern a slow smug side-eye; Kern gulps; both crouch. GO. Oro rockets off (stretch, speed lines): it always runs the same 36 frames; Kern lurches THUNK-THUNK on square wheels and takes 56 (Perf@1 ≈ 0.64). At the finish Oro is parked, buffing its laurel; the stopwatch (turned to the finish, 1 turn / 60 f so no hand laps) shows the coral hand at ~7 o'clock and the emerald hand far past it, near 11; Kern clunks across, steam puffing | 3/4-front two-shot well ahead of the line (the lanes side by side, both faces to the lens), a leading tracking dolly that loses Oro and settles on the lumbering Kern, then the finish | crash zoom (zoom lines) into the square wheel |
| B5 REFINE | 360–419 | Close on a square wheel. Tok (hopped over along the infield) stares, then its balloon stretches up: idea (!). It speaks 5 fresh cream tokens out of its mouth, down onto Kern: the square wheels pop off (one flops away end over end, because it can't roll), round wheels snap on, a pointed nose token clicks on under Kern's eyes. Kern revs, its new wheels spin in place | close, then a slow orbit so the 3D parts read | whip up as Kern launches |
| B6 AGAIN | 420–487 | Lap 2 alone: only Kern runs the loop (Oro backs up the home straight to the start line and waits there, smug). Three quick panels that rhyme with B2/B3: Kern bursts through the arch at us and its new cream parts flash emerald (the gate nods, Dash still stuck); at the weigh-in the block drops, the needle swings into the notch, the flag pops; it skids onto the start line beside Oro | the low front view through the arch, a whip to the weigh-in medium, a whip to the start | settles into B4's start-line framing |
| B7 RACE 2 | 488–559 | Oro starts the same side-eye, then does a double-take at the round wheels and the nose (dolly-zoom, "!"). GO. Oro takes its same 36 frames; Kern, slower off the line, fastest at the end, takes 33 (Perf@1 ≈ 1.09): Oro leads, level near the line, Kern stretches its nose. Photo finish (timed nose-on-the-line): 2 impact frames by object, then a hold — time frozen — on a high side-on panel of both noses at the chequered line: Kern's nose on the line, Oro's about a third of its length short (the honest gap for 33 f against 36 f; do not shrink it) | the B4 start framing with a true dolly-zoom on Oro, then leading 3/4-front tracking with a growing dutch; cut under the impact frame to a high, side-on photo-finish panel (both noses on the chequer), slow push | whip to the stopwatch |
| B7b THE WATCH | 560–579 | Insert, square on the stopwatch: a slowed replay of the last race frames — the emerald hand stops first (click burst), the coral hand arrives and stops just past it (click); an emerald wedge marks the time saved | square on the face, slow push | whip to the finish |
| B8 PAYOFF | 580–631 | **PERF@1 > 1** (extruded 3D block letters on the graphics card, one line, emerald faces — ours; coral is the oracle's — with ink-dark extrusion, "> 1" largest) drops and slams: squash, a comic title burst behind it, inked dust puffs, focus lines, shake. Kern rolled on and parked ahead of Oro, front and centre, its matmul plate on its side. Staggered reactions ≥ 8 frames apart: a green check pops on Kern's face block, it bounces and turns its face to us (the matmul plate stays in view); Oro's jaw drops and its laurel slips, then a sporting nod; Tok, right of the letters and never inside them, leaps with star eyes after the slam settles. The TRITONGYM board on the finish gantry names the gym. Held ≈ 2 s | low hero lens past the line, a ~12% push with an orbit (the gantry stays left of the letters) | whip pan to the bench |
| B9 NEXT | 632–659 | Tok waits a beat, then pogo-hops back to the bench beside the stack — the next operator is waiting (the new top card sits on the stack) | whip pan with smear, continuous through the seam | seamless into B1 (f660 == f0) |

## 5. Text (4 items)
**TRITONGYM** (finish banner, seen in both races and the payoff), **CLANG!** (hand-lettered SFX), **PERF@1 > 1** (the
payoff, extruded 3D letters), **164** (painted object label on the operator stack). No other words; the dial's notch,
the flags, the check mark and the stopwatch hands are unlettered.

## 6. Look and palette
Series 3D comic (as `reference/style-comic`): cel ramp, halftone, burin hatching in the cores, bold boiling ink,
off-register plates, paper grain; hand-built lettering (stroke skeletons, broad-nib ink, halftone shade), never a web font.
Emerald `#059669` dominates (the circuit board, compiled Kern, Tok's sweatband); coral `#ef4b5f` is the one pop and means
the oracle / an error (Oro, the coral stopwatch hand, the lamp, CLANG!, the slip; the payoff letters are emerald: ours); Kern's wheels are cream
source, then dark emerald once compiled. Warm cream paper and a wooden gym around the board; ink `#1a1530`. No bloom, no
glow haze, no UI, no screen-locked ruling.

## 7. Card and poster
Key action and faces in master rows 180–835; nothing in the LIVE-pill corner (x > 1590, y 130–300). Poster f628 (the
payoff hold after the slam and the leap): board, letters, Kern ahead with its check, Oro, Tok star-eyed; the card loop is
rotated to start on it.
