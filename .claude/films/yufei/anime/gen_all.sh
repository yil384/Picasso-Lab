#!/bin/bash
# Generates every image for Yufei's short (skips the ones already in art/). Run from anywhere on the Mac:
#   bash .claude/films/yufei/anime/gen_all.sh
# then commit art/ and push (git add .claude/films/yufei/anime/art && git commit -m "art: Yufei anime frames" && git push).
# To redo one image: delete art/NAME.png and run again.
cd "$(dirname "$0")"
PHOTO=../../../../people/static/yufei.webp
[ -f art/photo.png ] || { mkdir -p art; sips -s format png "$PHOTO" --out art/photo.png >/dev/null 2>&1 || cp "$PHOTO" art/photo.webp; }
REF=art/photo.png; [ -f "$REF" ] || REF=art/photo.webp
GREEN="Draw ONLY the character(s) on a perfectly flat, pure green #00FF00 background (no floor, no shadow, no gradient, no other objects), the whole figure visible with a margin on every side, so it can be cut out."
g() { local n=$1; shift; [ -f "art/$n.png" ] && { echo "skip art/$n.png"; return; }; ./gen.sh "$n" "$@"; }

# 1. the character sheet first: every later image uses it (and the photo) as the reference
g y_ref "A character design sheet of the heroine on a plain white background: full body front view, three-quarter view and back view (showing the low ponytail) side by side, plus three small face close-ups (warm smile, surprised, confident wink)." "$REF"
R=(art/y_ref.png "$REF")

# 2. her poses, as cut-out sprites on green
g y_pop      "The heroine leaping joyfully toward the viewer, arms flung wide, hair and ponytail flying, big delighted smile. $GREEN" "${R[@]}"
g y_land     "The heroine landing on her feet in a slight crouch, knees bent, arms out for balance, looking up with a bright smile. $GREEN" "${R[@]}"
g y_surprise "The heroine startled, leaning back, both hands raised near her face, eyes wide and round behind her glasses, mouth a small 'o', a sweat drop. $GREEN" "${R[@]}"
g y_glasses  "Bust shot of the heroine pushing up her glasses with one finger, a confident determined smile, a bright white anime glint flashing on the lenses. $GREEN" "${R[@]}"
g y_brush    "The heroine holding a huge artist's paintbrush (wooden handle as tall as she is, gold ferrule, bristles dripping golden paint) raised high over her shoulder with both hands, ready to swing, determined expression. $GREEN" "${R[@]}"
g y_swing    "The heroine in a dynamic mid-swing, sweeping the huge paintbrush in a wide arc, body twisting, ponytail whipping, golden paint flying off the bristles in an arc of drops, fierce happy face. $GREEN" "${R[@]}"
g y_proud    "The heroine standing proudly with hands on her hips, chest out, winking with a big confident grin, the huge paintbrush leaning on her shoulder. $GREEN" "${R[@]}"
g y_wave     "The heroine waving goodbye cheerfully with one hand, head tilted, eyes closed in a happy smile. $GREEN" "${R[@]}"

# 3. the cat and the noise gremlins (same style)
g cat_jump   "Only her sidekick: a fluffy round white cat with blue eyes, pink inner ears and a jaunty red beret, leaping up with its paws stretched out, excited. $GREEN" art/y_ref.png
g cat_cheer  "Only her sidekick: the fluffy round white cat with blue eyes and the red beret, sitting up and cheering with both front paws raised, eyes closed happily. $GREEN" art/y_ref.png art/cat_jump.png
g gremlins   "Only three small mischievous 'noise gremlins' (no heroine): round red spiky imps with angry eyes, little sharp teeth and stubby arms, in different poses, one sticking its tongue out, crackling with tiny red sparks. $GREEN" art/y_ref.png

# 4. the two backgrounds (no characters)
g bg_lab     "Background only, no characters: a cosy lab bench at dusk seen from a low three-quarter angle; in the centre a square gold quantum chip on a navy circuit board with a 3 by 3 grid of glowing cyan qubit pearls joined by bronze couplers; a paint pot and a mug on the bench; a big window behind showing a San Diego sunset over the Pacific with palm trees. Leave the space above the chip clear for characters." "${R[@]}"
g bg_sunset  "Background only, no characters: a warm San Diego sunset over the Pacific seen from a hilltop campus, palm trees silhouetted on the left, orange, pink and violet sky, the sun on the horizon, gentle anime clouds. Leave the centre clear for a character." "${R[@]}"
echo "done: $(ls art/*.png | wc -l) images in $(pwd)/art"
