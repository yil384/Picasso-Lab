# AstroTheWizard - "The Long Way Out" (60 s storybook photon explainer)

- X post: https://x.com/AstroTheWizard/status/2103629247751618782 (2026-09-25). Text: "Insane!!! I literally oneshot this with one prompt using Opus 5.5 for 0$! Just gave it a topic, Claude did everything in 45 min while I was washing the dishes. Full prompt: ..." (syndication API: 17 likes, 4 replies - small reach).
- No repo found (no GitHub user of that name; the prompt asks for source code but none is published). The full prompt is archived in yihui-dev/awesome-opus5-5-videos `prompts/astrothewizard-618782.md`.
- VIEWED: downloaded the 720p X file (60.0 s, 16:9, 60 fps); 60 frames at 1 fps + 4 fps transition samples + full frames: frames2/astrothewizard-photon/. Transcribed the VO with Whisper small (156 words in 60 s).

## Prompt essentials (quoted)
"60-second, fully animated explainer ... completely on your own ... Topic: the journey of photons. Style: whimsical, charming, storybook. Give the photon a personality. It should feel like a professional motion-design studio made it, not 'AI video' ... pure JavaScript animation, rendered from code frame by frame ... one strong formal idea per scene ... the random walk should be an actual random walk, not a drawing of one. Include real numbers ... be honest about uncertainty ... onomatopoeia, little characters, callbacks. Put what was happening on Earth during those 100,000 years alongside the photon's timeline ... voiceover ... highest-quality text-to-speech ... burned-in captions ... original music score ... sound design synced exactly ... music ducks under the voice ... Build verification loops: render stills of every scene and review them critically".

## What I see
- A glowing yellow photon with kawaii eyes (blinks, smiles), a handwritten-script label "a photon (actual size: much, much smaller)" with a hand-drawn arrow; serif title "The Long Way Out / a very small epic"; it briefly carries a tiny suitcase (commute gag).
- Sun core: a packed field of soft red-orange plasma balls, each with a tiny face; thermometer "14,715,556 C" ticking to "15,000,000 C (toasty)"; a wooden signpost "SURFACE 696,000 km ->"; a BOUNCES counter top-left climbing 0,1,2,5,23,469 while a real random-walk trail of thin gold lines accumulates; comic burst "boing!"; speech bubbles from neighbours "bye!", "wait, one more thing!", "did you meet Dave?" (the "leaving a party" gag).
- Cut to a cross-section of the Sun (core, radiative zone, convection zone, hand-labelled) with "YEARS INSIDE THE SUN 1,344 ... 99,701 (estimated range from ~10,000 to 170,000)" and "BOUNCES 10^22 (a lot)"; a "meanwhile, on Earth" strip below fills with tiny pictograms: mammoths (gone, mostly), first cities, pyramids.
- Convection zone: big circular arrows, the photon rides up inside a bubble ("A great, boiling elevator"), "And then... Pop!".
- Space: photon streaks with a light trail past Mercury and an asteroid; DISTANCE/TIME readout "150,000,000 km, 8 min 20 s"; "BUMPS 0" with a green tick.
- Ends: an eye drawn with lashes, the photon lands in the pupil ("right here."); silhouette of a person facing a sunrise, the photon says "hi!"; title card returns.

## Narration / pacing
- TTS voiceover (warm, narrator), burned-in pill captions centred at the bottom, one sentence per caption; ~156 wpm; jokes land in the VO ("like trying to leave a party where everybody wants to say goodbye"). ~7 scenes in 60 s, mostly continuous camera inside each scene, crossfades between; only ~1-2 hard cuts by scene detection.

## Good / slide-like
- Good: a character with a face carries the concept; real simulation (random walk) as the visual; numbers ticking with honest ranges; "meanwhile on Earth" callback; classic Kurzgesagt-lite storybook palette; it lands on the viewer ("in your eye ... say hi").
- Weak: the look is clean vector flat (soft gradients, emoji-like faces) - polished but close to stock "explainer" style; no texture; the cross-section scene with stat readouts drifts towards an infographic; 16:9 only.

## Borrow
- The prompt itself is a good brief template (formal idea per scene, real simulation not a drawing of one, honesty about uncertainty, gags, verification loop, mix spec).
- Personify the unit being explained (a token, a qubit, a KV entry) with minimal eyes; let neighbours talk in tiny speech bubbles; a counter that runs away ("10^22 (a lot)"); a "meanwhile" side strip to give scale; end on the viewer.

## Cross-reference
- A sibling note (AstroTheWizard__photon-journey.md) saw only a Skillry poster; this note watched the full video via the X syndication mp4 URL (video.twimg.com/amplify_video/2103628961095839744/...). That note reports 3,584 views and that the prompt was posted in self-reply 2103629715219034144.
- Fetch trick that worked for both X videos in this cluster: `https://cdn.syndication.twimg.com/tweet-result?id=<id>&token=<((id/1e15)*PI).toString(36) without 0s and dots>` returns the mp4 variants.
