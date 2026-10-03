# Art prompts for the v8 launch film (ChatGPT image generation)

Each image: a new message in the SAME ChatGPT conversation, with the reference image attached, the STYLE paragraph
once at the top of the conversation, then one line per image. Portrait 1024x1536 unless noted.
Save as `.claude/films/xlaunch/art/<name>.png` (exact names) and push to `main` (GitHub web upload is fine).

References (download from GitHub, attach to the first message):
- Yufei: `.claude/films/yufei/anime/art/y_ref3d.png`
- students: `.claude/films/hotpot/cast.png` (LEO, MIA, KAI, ZOE, left to right)

## STYLE (paste once, first message)

> I am making an animated short. Please generate images one at a time, all in exactly this style: a polished 3D
> animated feature film character render (Pixar quality), soft global illumination, a soft warm key light from the
> upper right and a subtle cool rim light from the left, expressive but natural faces, slightly stylized proportions,
> rich but tasteful colours. Always the full body, the whole figure visible including both shoes, centred with a
> small margin, the figure filling about 85% of the image height. The background is one perfectly flat pure green
> colour #00FF00: no floor, no shadow on the background, no gradient, no other objects than the ones I describe. No
> text, no letters, no numbers, no logos, no watermark. Portrait 1024x1536.
> The heroine is Prof. Yufei Ding exactly as in the attached character sheet: straight black hair parted in the
> centre, gathered in a low ponytail, thin red half-rim rectangular glasses, warm dark-brown eyes, a gentle warm
> smile, a navy-blue tailored blazer over a black-and-white zigzag (chevron) top, a small silver teardrop pendant,
> dark trousers, dark flat shoes. Keep her face, hair, glasses and clothes identical in every image. Keep her face
> pretty and true to the sheet, never goofy.

## Batch 1 - Yufei (4 images)

1. `y_write` - Yufei sits on a simple wooden chair at a small wooden desk, seen in three-quarter view from the front
   left, writing with a pen on a single sheet of white paper, focused, a small hopeful smile; a slim brass desk lamp
   on the desk. Desk, chair, lamp and paper fully visible. Square 1024x1024.
2. `y_hold_up` - Yufei stands and lifts one sheet of white paper above her head with both hands, looking up at it
   with delight, as if letting it fly; three-quarter view.
3. `y_award` - Yufei stands proudly holding a small clear glass award plaque (completely blank, no engraving) in
   front of her chest with both hands, beaming at the viewer.
4. `y_invite` - Yufei stands facing the viewer with a warm welcoming smile and stretches her right arm out to her side
   (towards the right edge of the image), open palm, inviting someone to come and sit down.

## Batch 2a - two more in the Yufei conversation (same chat as batch 1)

5. `desk_empty` - The same small wooden desk, wooden chair and slim brass desk lamp as in the y_write image, same
   three-quarter view and scale, but nobody is there: the chair is pulled out a little, turned slightly towards the
   viewer as if waiting for someone, the lamp is on, and one fresh blank sheet of paper and a pen lie on the desk.
   Square 1024x1024.
6. `y_toast` - Yufei laughs and raises a clear plastic cup of bubble milk tea (black tapioca pearls, a wide straw)
   high in a toast with her right hand, her left hand on her hip, three-quarter view.

## Batch 2b - the students (a NEW conversation, attach `cast.png`)

STYLE for this conversation (paste once, first message, with cast.png attached):

> I am making an animated short. Please generate images one at a time, all in exactly this style: a polished 3D
> animated feature film character render (Pixar quality), soft global illumination, a soft warm key light from the
> upper right and a subtle cool rim light from the left, expressive faces with big readable expressions, slightly
> exaggerated proportions, rich but tasteful colours. Always ONE character, the full body, the whole figure visible
> including both shoes, centred with a small margin, the figure filling about 85% of the image height. The
> background is one perfectly flat pure green colour #00FF00: no floor, no shadow on the background, no gradient, no
> other objects than the ones I describe. No text, no letters, no numbers, no logos, no watermark. Portrait 1024x1536.
> The characters are the four PhD students in the attached cast sheet (left to right): LEO - tall, lanky, thin round
> glasses, messy black hair, grey hoodie, dark trousers, grey sneakers, calm; MIA - short, black bob haircut,
> oversized cream turtleneck sweater under an open white lab coat, dark trousers, white sneakers, tiny and fierce;
> KAI - stocky, curly dark hair, orange bomber jacket over a dark t-shirt, olive cargo trousers, sneakers,
> mischievous grin; ZOE - long high ponytail, round face, pastel blue cardigan over a white top, long dark grey
> skirt, white sneakers, cautious and sweet. Keep each character's face, hair, clothes and proportions exactly as in
> the cast sheet in every image.

7. `leo_catch` - LEO, three-quarter view, calmly catching a single sheet of white paper out of the air with one hand
   raised above his head, the other hand in his hoodie pocket, a relaxed half-smile.
8. `mia_land` - MIA in a superhero landing: one knee and one fist on the ground, the other arm out behind her, her
   lab coat flaring out, looking up at the viewer with a fierce determined grin.
9. `kai_flop` - KAI mid-air in a comic belly-flop dive, arms and legs spread wide like a starfish, cheeks puffed,
   eyes squeezed shut, jacket flapping; seen from the front, slightly from below.
10. `zoe_sip` - ZOE, three-quarter view, sipping her bubble milk tea through the wide straw with both hands around the
    cup, peeking sideways with big curious eyes.
11. `mia_qubit` - MIA proudly holding up, in both hands at chest height, a small square quantum chip that glows soft
    blue, looking at it with fierce pride.
12. `leo_gpu` - LEO holding a large graphics card (a GPU board with fans) against his chest with both arms like a
    beloved pet, a soft glow of green light on it, content smile.
13. `kai_chip` - KAI holding up a round silicon wafer that shines with a rainbow sheen, presenting it to the viewer
    with a big proud grin, three-quarter view.
14. `zoe_tray` - ZOE walking carefully, three-quarter view, carrying a small round tray with five cups of bubble milk
    tea, concentrating hard, tongue slightly out.
15. `leo_toast` - LEO raising a cup of bubble milk tea in a toast, smiling warmly, three-quarter view.
16. `mia_toast` - MIA raising a cup of bubble milk tea in a toast, a rare big smile, standing on tiptoe.
17. `kai_toast` - KAI raising a cup of bubble milk tea in a toast with one hand and giving a thumbs-up with the other,
    laughing.
18. `zoe_toast` - ZOE raising her bubble milk tea in a toast with both hands, eyes closed in a happy smile.

## Batch 2c - the cat (the Yufei conversation; attach `.claude/films/yufei/anime/art3d/cat_cheer.png` as the reference)

19. `cat_sleep` - The same fluffy white cat with the red beret as in the attached image, curled up asleep in a round
    loaf, tail around its paws, a peaceful smile, beret slightly askew. Square 1024x1024.
20. `cat_sit` - The same cat sitting upright and smug, chest puffed, eyes half-closed, as if it owns the place, seen
    from the front. Square 1024x1024.
