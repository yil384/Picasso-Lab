# Episode 1 - Neural Hotpot Temperature Scaling: Why "Mild" Converges to Fire

Lab-comedy short (~40 s, 6 shots, 16:9), from the hidden "true blogs" easter egg on the Blogs page.
Pipeline: Codex key frames (`./gen.sh`, cast sheet `art/cast.png` as the reference) -> the user animates each first
frame with Veo in Google Vids ("AI Video", image + prompt, 8 s max) -> edit, captions, music with ffmpeg.
Cast: four original PhD students (LEO, MIA, KAI, ZOE, see `characters.txt`) - no real faces until members agree.

| # | len | first frame (Codex) | what happens (Veo) |
|---|-----|---------------------|--------------------|
| 1 | 7 s | Night, a cozy CS lab: the four around a bubbling split hotpot on a lab bench, laptops pushed aside, a loss-curve plot on a monitor behind. | LEO raises his chopsticks: "Okay team. Mild. Everyone agrees: just mild." The others nod in unison. |
| 2 | 6 s | Close-up: KAI behind the pot, a small jar of chili oil hidden under the table, a guilty grin. | KAI sneaks one spoon of chili oil in and whispers "One more scoop should be fine." |
| 3 | 7 s | Over-the-pot shot: three hands (LEO's grey sleeve, ZOE's blue cardigan, MIA's lab coat) each holding a spoon of chili, hovering. | Quick succession: each adds "just a little" when the others look away; the broth turns redder with every drop. |
| 4 | 6 s | The pot from above, now deep red and violently boiling, a monitor behind showing a curve shooting straight up. | Red oil erupts in bubbles, steam blasts up, the curve on the monitor goes vertical. |
| 5 | 7 s | Medium shot: all four take a bite at the same moment. | Faces turn bright red, steam from their ears, MIA breathes a tiny flame, ZOE gulps her milk tea, LEO's glasses fog up. |
| 6 | 7 s | The lab door: a professor silhouette leaning in, the four turned toward the door, teary, thumbs up. | Professor: "So... did the model converge?" All four, crying, thumbs up: "To fire." |

End card (added in the edit): NEURAL HOTPOT TEMPERATURE SCALING - accepted, with sesame sauce.

## Key frames
The user generated the cast sheet and the six first frames in ChatGPT (`cast.png`, `s1.png` ... `s6.png`, 1536x1024).
`vids/sN_16x9.jpg` are the 16:9 crops (kept slightly high so no hair is cut) to upload to Google Vids, whose clips are
16:9. Finished clips go to `vids/clips/sN.mp4`.

## Veo prompts (Google Vids -> "AI Video": upload the shot's `vids/sN_16x9.jpg`, paste the prompt, 8 s)

1. `Animate this image. Leo, the tall student with round glasses in the grey hoodie, lifts his chopsticks and says calmly, like a team lead: "Okay team. Mild. Everyone agrees: just mild." The other three nod in unison. Steam drifts from the hotpot. Slow gentle push-in. Keep the characters exactly as in the image.`
2. `Animate this image. Kai, the curly-haired student in the orange jacket, glances left and right, then quietly tips the small jar of red chili oil from his hand into the pot and whispers with a guilty grin: "One more scoop should be fine." Comedic timing, subtle camera push-in. Keep the characters exactly as in the image.`
3. `Animate this image. The three hands take turns: each one quickly drops its spoon of red chili into the hotpot, one after another, sneaky and fast. With every spoon the broth bubbles redder. Overhead camera, quick comedic rhythm. Keep everything exactly as in the image.`
4. `Animate this image. The red hotpot boils violently, bubbles of chili oil burst and a column of steam blasts up; the four students recoil in shock and amazement; on the monitor behind them the red curve shoots straight up. Dramatic slow camera rise. Keep the characters exactly as in the image.`
5. `Animate this image. All four take their first bite of the hotpot. Their cheeks turn rosy pink, they fan their mouths with their hands, little cartoon puffs of steam float up above their heads, Zoe quickly sips her bubble tea, and Leo's glasses fog up. Funny, exaggerated cartoon reaction, cozy and lighthearted. Keep the characters exactly as in the image.`
6. `Animate this image. The smiling professor at the open door raises her mug and asks cheerfully: "So... did the model converge?" The four students, cheeks pink, give a big thumbs up together and answer proudly: "To fire!" Warm, lighthearted comedy. Keep the characters exactly as in the image.` (first frame `s6_new.png`)

## Safety-filter notes (Vids refused these)
- s5: "breathes out a tiny flame", "faces flush bright red" -> refused; "cheeks turn rosy pink, fan their mouths, cartoon
  puffs of steam" passed.
- s6: the first frame itself was refused (a faceless dark silhouette leaning in at the door reads as a lurker), with any
  prompt. A clearly visible, smiling professor in warm light (`s6_new.png`) fixed it. Avoid tears, choking, fire on
  people, and shadowy figures in first frames.
