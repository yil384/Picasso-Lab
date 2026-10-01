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

## Veo prompts (paste into Vids "AI Video" together with the shot's first frame)

1. `Animate this scene. Leo, the tall student with round glasses, raises his chopsticks and says calmly: "Okay team. Mild. Everyone agrees: just mild." The other three nod in unison. Gentle steam rises from the hotpot. Slow push-in. Warm cozy lab at night, 3D animated film style.`
2. `Animate this scene. Kai, the curly-haired student in an orange jacket, glances left and right, then sneaks one spoon of red chili oil into the pot and whispers with a guilty grin: "One more scoop should be fine." Close-up, comedic timing.`
3. `Animate this scene. Three hands take turns: each one quickly drops a spoon of chili into the hotpot while the others look away. With every spoon the broth turns redder. Quick comedic rhythm, overhead camera.`
4. `Animate this scene. The deep red hotpot boils violently, big bubbles of chili oil burst, a column of steam blasts upward, and on the monitor behind the curve shoots straight up. Dramatic slow camera rise, heat shimmer.`
5. `Animate this scene. All four take a bite at the same time. Their faces turn bright red, steam puffs from their ears, Mia breathes out a tiny flame, Zoe gulps her bubble tea, Leo's glasses fog up completely. Exaggerated cartoon reaction, comedic.`
6. `Animate this scene. A professor leans in through the lab door and asks: "So... did the model converge?" The four students turn around, tears streaming from the spice, give a thumbs up together and answer: "To fire." Comedic beat, hold on their faces.`
