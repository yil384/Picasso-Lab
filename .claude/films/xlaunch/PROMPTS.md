# Art prompts for the v8 launch film (ChatGPT image generation)

Each image: a new message in the SAME ChatGPT conversation, with the reference image attached, the STYLE paragraph
once at the top of the conversation, then one line per image. Portrait 1024x1536 unless noted.
Save with the exact file names and upload them to `.claude/films/xlaunch/` on `main` (GitHub web: Add file -> Upload files).

References (download from GitHub, attach to the first message):
- Yufei: `.claude/films/yufei/anime/art/y_ref3d.png`
- members: their Team-page photos, `people/static/<name>.webp`

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

## Batch 2b - the real lab members (a NEW conversation; attach each member's Team-page photo with their line)

Round 1 came back photorealistic (and five were cropped above the knees), which clashes with the Pixar-style
Yufei. Round 2: attach TWO images with every message - `art/y_toast.png` as the style reference first, then the
member's photo - and use the STYLE below, which names the reference and forbids photorealism and cropping.

> I am making an animated short about our research lab. With every message I attach two images: image 1 is our
> heroine, already drawn in the film's art style; image 2 is a photo of a real lab member. Draw the person from
> image 2 as a character in exactly the art style of image 1: a stylized 3D animated feature film character (Pixar
> style), big expressive eyes, smooth stylized skin, simplified shapes, a slightly larger head, soft cartoon
> proportions, the same soft lighting and rendering as image 1. Not photorealistic, not a photo. Keep them
> clearly recognisable (face shape, hairstyle, glasses if they wear them, skin tone, build, the style of their
> clothes), kind and flattering, never a caricature. Always the FULL body from the top of the head to both shoes,
> nothing cropped, centred with a margin, the figure about 85% of the image height. One perfectly flat pure green
> #00FF00 background: no floor, no shadow, no gradient. No text, letters, numbers, logos or watermark. Portrait
> 1024x1536.

Then one message per image. Attach `art/y_toast.png` FIRST and the member's photo SECOND, and paste the
whole block (the first sentence about the two images is the same every time; it stops ChatGPT drawing Yufei's
face or blazer onto the member). Save the result under the file name given.

1. `m_chang.png` - photos: y_toast.png, then chang.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A small cup of coffee in the other hand. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

2. `m_haotian.png` - photos: y_toast.png, then haotian.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A baseball cap in the other hand. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

3. `m_jixuan.png` - photos: y_toast.png, then jixuan.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A Chinese calligraphy brush in the other hand. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

4. `m_keyi.png` - photos: y_toast.png, then keyi.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A game controller in the other hand. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

5. `m_parikshit.png` - photos: y_toast.png, then parikshit.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A hiking headlamp on the forehead. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

6. `m_rishabh.png` - photos: y_toast.png, then rishabh.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A small silver stopwatch in the other hand. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

7. `m_xiang.png` - photos: y_toast.png, then xiang.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A handheld microphone in the other hand. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

8. `m_xinwei.png` - photos: y_toast.png, then xinwei.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A small steel frying pan in the other hand. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

9. `m_yichen.png` - photos: y_toast.png, then yichen.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A fanned hand of playing cards in the other hand. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

10. `m_yue.png` - photos: y_toast.png, then yue.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A wooden baseball bat resting on the shoulder, held by the other hand. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

11. `m_zaifeng.png` - photos: y_toast.png, then zaifeng.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A thick stack of papers under the other arm. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

12. `m_zhengding.png` - photos: y_toast.png, then zhengding.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. Aviator sunglasses. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

13. `m_zhongkai.png` - photos: y_toast.png, then zhongkai.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A gold award medal on a ribbon around the neck. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

14. `m_zhuo.png` - photos: y_toast.png, then zhuo.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A gold medal on a red ribbon around the neck. Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca pearls, a wide straw) in a toast with one hand.
   ```

15. `xiang_land.png` - photos: y_toast.png, then xiang.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. A superhero landing: one knee and one fist on the ground, the other arm out behind, looking up with a determined grin.
   ```

16. `xiang_chip.png` - photos: y_toast.png, then xiang.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. Standing, proudly holding up in both hands at chest height a small square quantum chip that glows soft blue.
   ```

17. `zaifeng_flop.png` - photos: y_toast.png, then zaifeng.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. Mid-air in a comic belly-flop dive, arms and legs spread wide like a starfish, cheeks puffed, eyes squeezed shut; seen from the front, slightly from below.
   ```

18. `zaifeng_gpu.png` - photos: y_toast.png, then zaifeng.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. Standing, hugging a large graphics card (a GPU board with fans) against the chest like a beloved pet, a soft green glow on it, content smile.
   ```

19. `zhongkai_tray.png` - photos: y_toast.png, then zhongkai.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. Walking carefully, three-quarter view, carrying a small round tray with six cups of bubble milk tea, concentrating, tongue slightly out.
   ```

20. `zhongkai_wafer.png` - photos: y_toast.png, then zhongkai.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. Standing, holding up a round silicon wafer that shines with a rainbow sheen, presenting it with a big proud grin.
   ```

21. `zhongkai_offer.png` - photos: y_toast.png, then zhongkai.webp

   ```
   Image 1 is ONLY the style reference: match its art style, rendering, lighting and cartoon proportions exactly, but do not copy her face, hair, glasses or clothes. Image 2 is the person to draw: keep their face, hairstyle, glasses, skin tone, build and the clothes from the photo. Full body from the top of the head to both shoes, flat pure green #00FF00 background. Holding one cup of bubble milk tea straight out towards the viewer with both hands, a warm smile, front view.
   ```

Round 1 (kept for the record):

The students are the real Picasso Lab members (all agreed). Photos: `people/static/<name>.webp` in this repo
(open on GitHub, download). If ChatGPT will not take a .webp, take a screenshot of it.

STYLE for this conversation (paste once, first message, no photo needed):

> I am making an animated short about our research lab. Please generate images one at a time, all in exactly this
> style: a polished 3D animated feature film character render (Pixar quality), soft global illumination, a soft warm
> key light from the upper right and a subtle cool rim light from the left, expressive but natural faces, slightly
> stylized proportions, rich but tasteful colours. Each image is ONE person: the person in the photo I attach with
> that message, turned into this 3D animated character while keeping them clearly recognisable (face shape, hairstyle,
> glasses if they wear them, skin tone, build, and the style of clothes in the photo). Keep it kind and flattering,
> never a caricature. Always the full body, the whole figure visible including both shoes, centred with a small
> margin, the figure filling about 85% of the image height. The background is one perfectly flat pure green colour
> #00FF00: no floor, no shadow on the background, no gradient. No text, no letters, no numbers, no logos, no
> watermark. Portrait 1024x1536.

Then one message per member, attach their photo, and send:
`[member line below] Standing, three-quarter view, smiling, raising a clear cup of bubble milk tea (black tapioca
pearls, a wide straw) in a toast with one hand.`

| # | file | photo | member line (extra detail) |
| --- | --- | --- | --- |
| 7 | `m_chang.png` | chang.webp | A small cup of coffee in the other hand. |
| 8 | `m_haotian.png` | haotian.webp | A baseball cap in the other hand. |
| 9 | `m_jixuan.png` | jixuan.webp | A Chinese calligraphy brush in the other hand. |
| 10 | `m_keyi.png` | keyi.webp | A game controller in the other hand. |
| 11 | `m_ohm.png` | ohm.webp | A small square computer chip in the other hand. |
| 12 | `m_parikshit.png` | parikshit.webp | A hiking headlamp on the forehead. |
| 13 | `m_xiang.png` | xiang.webp | A handheld microphone in the other hand. |
| 14 | `m_xinwei.png` | xinwei.webp | A small steel frying pan in the other hand. |
| 15 | `m_yanju.png` | yanju.webp | (no extra detail) |
| 16 | `m_yichen.png` | yichen.webp | A fanned hand of playing cards in the other hand. |
| 17 | `m_yilin.png` | yilin.webp | (no extra detail) |
| 18 | `m_yue.png` | yue.webp | A wooden baseball bat resting on the shoulder, held by the other hand. |
| 19 | `m_zaifeng.png` | zaifeng.webp | A thick stack of papers under the other arm. |
| 20 | `m_zhengding.png` | zhengding.webp | Aviator sunglasses. |
| 21 | `m_zhongkai.png` | zhongkai.webp | A gold award medal on a ribbon around the neck. |
| 22 | `m_zhuo.png` | zhuo.webp | A gold medal on a red ribbon around the neck. |
| 23 | `m_zihan.png` | zihan.webp | (no extra detail) |
| 34 | `m_rishabh.png` | rishabh.webp | A small silver stopwatch in the other hand. |


Three members have two more poses each (same conversation, attach the same photo again):

| # | file | photo | pose |
| --- | --- | --- | --- |
| 24 | `xiang_land.png` | xiang.webp | A superhero landing: one knee and one fist on the ground, the other arm out behind, looking up with a determined grin. |
| 25 | `xiang_chip.png` | xiang.webp | Standing, proudly holding up in both hands at chest height a small square quantum chip that glows soft blue. |
| 26 | `zaifeng_flop.png` | zaifeng.webp | Mid-air in a comic belly-flop dive, arms and legs spread wide like a starfish, cheeks puffed, eyes squeezed shut; seen from the front, slightly from below. |
| 27 | `zaifeng_gpu.png` | zaifeng.webp | Standing, hugging a large graphics card (a GPU board with fans) against the chest like a beloved pet, a soft green glow on it, content smile. |
| 28 | `zhongkai_tray.png` | zhongkai.webp | Walking carefully, three-quarter view, carrying a small round tray with six cups of bubble milk tea, concentrating, tongue slightly out. |
| 29 | `zhongkai_wafer.png` | zhongkai.webp | Standing, holding up a round silicon wafer that shines with a rainbow sheen, presenting it with a big proud grin. |

## Batch 2c - the cat (the Yufei conversation; attach `.claude/films/yufei/anime/art3d/cat_cheer.png` as the reference)

30. `cat_sleep` - The same fluffy white cat with the red beret as in the attached image, curled up asleep in a round
    loaf, tail around its paws, a peaceful smile, beret slightly askew. Square 1024x1024.
31. `cat_sit` - The same cat sitting upright and smug, chest puffed, eyes half-closed, as if it owns the place, seen
    from the front. Square 1024x1024.

## Batch 3 - optional extras

32. `y_hold_cat` (Yufei conversation) - Yufei holds the white cat with the red beret out at arm's length under its
    front legs, the cat dangling happily, Yufei with one eyebrow raised and a patient half-smile, three-quarter view.
33. `zhongkai_offer` (members conversation, attach zhongkai.webp) - Holding one cup of bubble milk tea straight out
    towards the viewer with both hands, a warm smile, front view.
