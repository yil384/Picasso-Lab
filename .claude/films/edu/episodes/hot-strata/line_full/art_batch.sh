#!/bin/bash
# line_full art (SCRIPT.md, ART.md): 11 Codex line drawings with art/gen.sh, run in groups of 4 in parallel, then the
# bake-off's conversion: the two pose sheets are cut into single figures (sheet_cut.py: derive.split_sheet's cut with
# measured edges) and every new drawing is packed by bakeoff/line/ink.py into an ink / paper / pen-time sprite (art/cut/).
#
# usage: ./art_batch.sh            all three groups, then pack
#        ./art_batch.sh gen 1      one group only (1, 2 or 3); look at every src/<name>.png at full size before the next
#        ./art_batch.sh pack       cut + pack whatever has been generated so far
# Groups: 1 building, chef poses, manager, order spike | 2 slip boxes, number heap, press, Geisel |
#         3 renovated building, PC kitchen, paper (3 needs src/line_building_q.png from group 1).
# Codex is rate-limited (10-40k tokens a job); a failed job leaves art/logs/<name>.log and no src/<name>.png: re-run
# that group. Nothing here touches git.
set -u
export SKIP_EXISTING=1   # drawings already in art/src (e.g. made in ChatGPT by the user) are kept
HERE="$(cd "$(dirname "$0")" && pwd)"
EDU="$(cd "$HERE/../../.." && pwd)"
ART="$EDU/art"
LINE="$EDU/episodes/hot-strata/bakeoff/line"

STY="Style: a hand-drawn line illustration for a friendly science-explainer, black ink only on a pure white (#FFFFFF) background. Confident, clean, continuous pen lines of even medium-bold weight (like a 1.0 mm fineliner), slightly hand-made but tidy, every shape drawn with closed outlines; NO shading, NO hatching, NO grey tones, NO colour, NO fills, NO solid black areas, NO gradients, NO paper texture, NO text, NO letters, NO numbers, NO logos, NO border, NO frame, NO drop shadow. The background must be flat pure white everywhere. Everything in frame with a margin on every side, nothing cropped."
STYLE=(src/line_gpu.png src/line_forum.png)       # Codex line drawings from the bake-off (style only)
CAST=src/line_d_chefs.png                          # the six chefs: top row waiting, bottom row cooking
NOTE_STYLE="The attached images are style references only (line drawings made earlier for this film, black ink on white): match their line weight, pen feel and level of detail exactly, but do not copy their content."
NOTE_CAST="The first attached image is the cast sheet of this film (the six chefs, black ink line art on white): keep exactly the same six characters, faces, proportions, outfits and line style; only change the poses as described. Any other attached images are style references only."
NOTE_NEWCHAR="The attached images are style references only (the chef cast of this film and other line drawings, black ink on white): match their line weight, simple round faces with dot eyes and level of detail. Do not draw chefs; draw the new character described."
NOTE_BUILDING="The first attached image is the building drawn earlier for this film (black ink line art on white): keep its style, outline, size, position and furniture; only change what is described. Any other attached images are style references only."
NOTE_MINI="The attached images are (1) the two-storey kitchen building and (2) the chef cast of this film, both black ink line art on white: draw the tiny kitchen inside the PC as a miniature of (1) with tiny chefs like (2), in the same line style."

group1() {
  cd "$ART" || return 1
  REFNOTE="$NOTE_STYLE" ./gen.sh line_building_q "A cutaway view of a small two-storey restaurant building seen straight from the front, like a dollhouse with its front wall removed, with simple straight walls. Upper floor, about one third of the building's height: a compact professional kitchen with a row of stoves and ovens along the back wall, a hood above them, a few pans hanging on a rail, a serving hatch with a little shelf in the left wall, and an open, empty floor in front of the stoves. Lower floor, about two thirds of the height: a big cosy staff room with two long sofas and an armchair along the back wall, a row of tall lockers, a counter with a coffee machine and mugs, a coat rack with chef hats, a round table with two chairs, and in the back-left corner a small old two-burner stove on a little counter with one small pot on it (clearly much smaller and humbler than the stoves upstairs); a wide open empty floor in front. A straight staircase with a simple handrail runs diagonally along the right side, from the lower floor up to the kitchen floor. A door in the left wall of the lower floor. A plain pitched roof on top, a ground line at the bottom. No people anywhere. Portrait image 1024x1536, the building fills about 92% of the width and 90% of the height, centred. Keep the walls and floors light and sparse so small figures can stand in front of them. $STY" "${STYLE[@]}" &
  REFNOTE="$NOTE_CAST" ./gen.sh line_chefs_more "A character sheet of the six chefs in the attached cast sheet, in the same order from left to right (1 the young man with curly hair, 2 the young woman with a low bun, 3 the big round man with a handlebar mustache, 4 the slim curly-haired chef with round glasses, 5 the young woman with a bob haircut, 6 the old man with a white beard and mustache), two rows, full body, every figure separate with wide clear white space around it (no prop, stroke or drop crosses into a neighbour's space). Top row, on their break: 1 flopping backwards with arms spread wide and feet lifting off the ground, as if dropping happily onto a sofa (draw no furniture), eyes closed, big relaxed smile; 2 standing, stretching both arms up with a big yawn; 3 standing, reading an open folded newspaper with blank pages; 4 standing, looking down at a phone held in both hands; 5 standing, eating a sandwich; 6 standing, holding a coffee mug with a curl of steam close to his lips, about to sip, eyes closed contentedly. Bottom row, the same six running up a staircase towards the right: leaning forward, one knee raised high, arms pumping, cheeks puffed, a few sweat drops flying off, small motion strokes behind them (no stairs drawn). Landscape image 1536x1024, the twelve figures evenly spaced on a 6 by 2 grid, all the same height as each other. $STY" $CAST "${STYLE[@]}" &
  REFNOTE="$NOTE_NEWCHAR" ./gen.sh line_manager "A character sheet of one new character, a friendly restaurant manager: a woman in her forties with her hair in a neat bun, a pencil tucked behind one ear, a waistcoat over a shirt with rolled-up sleeves, a small bow tie, trousers and simple shoes, in the same simple round-faced cartoon style with dot eyes. Three full-body poses side by side, every figure separate with wide clear white space around it: 1 blindfolded with a cloth tied around her eyes, holding an upturned tall chef's hat in one hand and reaching into it with the other to pull out a folded paper slip, more folded slips peeking out of the hat, tongue out in concentration; 2 standing next to a small empty board on an easel (the board is completely blank), pointing at the board with a pencil, a clipboard under her other arm, a confident smile; 3 bending forward and peering through a big magnifying glass at a small paper slip held up in her other hand, eyebrows raised in discovery, one eye looking huge behind the lens. Landscape image 1536x1024, the three poses evenly spaced in one row, all the same height. This is an invented character, not a likeness of anyone. $STY" $CAST "${STYLE[@]}" &
  REFNOTE="$NOTE_STYLE" ./gen.sh line_spike "A restaurant order spike (a tall thin metal spindle standing on a heavy round base) with a tall stack of paper order slips impaled on it, the slips slightly crooked and overlapping, a few loose slips fluttering down next to it. Every slip is blank. Portrait image 1024x1536, the spike fills about 80% of the height, centred. $STY" "${STYLE[@]}" &
  wait
}

group2() {
  cd "$ART" || return 1
  REFNOTE="$NOTE_STYLE" ./gen.sh line_slip_boxes "Four cardboard archive boxes (banker's boxes with hand-hole cut-outs) standing side by side in a row, their lids leaning against them or tipped back, each box overflowing with blank paper order slips, a few slips spilling over the edges; on the front of each box an empty rectangular label (leave it blank). Landscape image 1536x1024, the four boxes fill about 92% of the width, same size, evenly spaced. $STY" "${STYLE[@]}" &
  REFNOTE="$NOTE_STYLE" ./gen.sh line_heap "A huge heap of small square tiles piled up into a tall mountain shape, like a giant pile of blank game tiles: hundreds of small squares with rounded corners, tilted every which way and overlapping, a few tiles tumbling down the slopes, a flat ground line at the bottom. Every tile face is blank (no marks on the tiles). Square image 1024x1024, the heap fills about 85% of the width and 80% of the height, centred. $STY" "${STYLE[@]}" &
  REFNOTE="$NOTE_STYLE" ./gen.sh line_press "A big old-fashioned screw press seen straight from the front: two sturdy upright posts with small feet, a heavy crossbeam on top whose front face is a wide plain blank band, a large vertical threaded screw through the middle of the beam turned by a long horizontal T-handle with round knobs at its ends, and at the bottom of the screw a wide, flat, heavy pressing plate. Below the plate the space is completely empty (no table and no base plate between the posts). Portrait image 1024x1536, the press fills about 80% of the width and 85% of the height, centred. $STY" "${STYLE[@]}" &
  REFNOTE="$NOTE_STYLE" ./gen.sh line_geisel "Geisel Library at UC San Diego, the famous brutalist library building, seen from the front at a slight low angle: a narrow concrete base, thick angled concrete columns flaring outward like the branches of a tree, holding up stacked floors that get wider towards the top, each floor a band of tall windows between horizontal concrete slabs, a flat roof; a few tall eucalyptus trees on both sides and a small plaza with a path in front; on the plaza at the front left, a small freestanding notice board (an empty blank board on two short posts). Draw every window as a simple closed rectangle. Landscape image 1536x1024, the building fills about 60% of the width, centred, the trees at the sides. $STY" "${STYLE[@]}" &
  wait
}

group3() {
  cd "$ART" || return 1
  if [ ! -f src/line_building_q.png ]; then echo "group 3 needs src/line_building_q.png: run group 1 first"; return 1; fi
  REFNOTE="$NOTE_BUILDING" ./gen.sh line_building_h "The same building as the first attached image, same style, same outline, the same staircase position and the same furniture, but rebuilt so that the upper kitchen and the lower staff room are exactly the same height (each half of the building): the kitchen now has twice as many stoves along its back wall and a bigger open floor; the staff room is lower but keeps its sofas, lockers, coffee counter, coat rack and the small old two-burner stove in its corner; the staircase on the right is shorter to match. No people anywhere. Portrait image 1024x1536, the building fills about 92% of the width and 90% of the height, centred, at exactly the same size and position as in the first attached image. $STY" src/line_building_q.png "${STYLE[@]}" &
  REFNOTE="$NOTE_MINI" ./gen.sh line_pc_kitchen "A cosy home desk seen from the front: on the desk a monitor with a blank screen, a keyboard, a mug, a small potted plant and a desk lamp; a young person in a hoodie sitting on a chair at the desk, seen from behind and slightly to the side, typing; next to the desk, standing on the floor and drawn large, a gaming PC tower with a big glass side panel facing the viewer. Inside the glass panel, instead of computer parts, a tiny two-storey kitchen like the attached building: a few tiny chefs cooking upstairs, a crowd of tiny chefs resting downstairs, a tiny small stove in the downstairs corner, and a tiny staircase between the floors. Portrait image 1024x1536, the PC tower with its glass panel takes about half of the image, the person and the desk the other half. $STY" src/line_building_q.png $CAST &
  REFNOTE="$NOTE_STYLE" ./gen.sh line_paper "The first page of a printed research paper, one single sheet seen straight from the front, upright, its corners slightly curled: a big empty space at the top for the title (leave it empty), under it two short empty lines for the authors, then two columns of body text drawn only as plain thin horizontal lines (no letters), and a small empty rectangular figure box with a thin frame in one column; a large award rosette ribbon (a pleated round rosette with two tails) pinned to the top-right corner, its round centre left blank. Portrait image 1024x1536, the page fills about 85% of the height, centred. $STY" "${STYLE[@]}" &
  wait
}

pack() {
  cd "$EDU" || return 1
  # single drawings: name:sweep (y = top first, x = left first, c = centre out), as in the bake-off
  for n in line_building_q:y line_building_h:y line_spike:y line_slip_boxes:x line_heap:y line_press:y \
           line_geisel:y line_pc_kitchen:y line_paper:y line_servers:y line_kitchen:y:0 line_burst:c; do
    if [ -f "art/src/${n%%:*}.png" ]; then python3 "$LINE/ink.py" "$n"; else echo "skip ${n%%:*}: no art/src/${n%%:*}.png"; fi
  done
  # pose sheets -> line_chef_b1-6 (break), line_chef_r1-6 (running), line_manager_1-3; each packed as it is cut
  if [ -f art/src/line_chefs_more.png ]; then
    python3 "$HERE/sheet_cut.py" line_chefs_more line_chef_ 6 b,r c
  else echo "skip line_chefs_more: no art/src/line_chefs_more.png"; fi
  if [ -f art/src/line_manager.png ]; then
    python3 "$HERE/sheet_cut.py" line_manager line_manager_ 3 '' y
  else echo "skip line_manager: no art/src/line_manager.png"; fi
}

case "${1:-all}" in
  gen)  case "${2:-}" in 1) group1 ;; 2) group2 ;; 3) group3 ;; *) echo "usage: $0 gen 1|2|3"; exit 2 ;; esac ;;
  pack) pack ;;
  all)  group1; group2; group3; pack ;;
  *)    echo "usage: $0 [all | gen 1|2|3 | pack]"; exit 2 ;;
esac
