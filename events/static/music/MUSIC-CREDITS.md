# Music credits: the games page (events/guandan.html)

Background music for Guandan and Texas Hold'em. The page plays one track at a time and downloads a file only
when its track plays (`events/static/games-music.js`). "Auto", the default, plays `guandan-theme` on the Guandan
screens and `bossa-antigua` on the Hold'em ones (the lobby's Hold'em tab, the Hold'em room and table).

Every file here was trimmed to its own ending, loudness-normalised to -20 LUFS (true peak -2.9 dBTP or lower; a
limiter touches only a few isolated peaks in Bossa Antigua, Cool Vibes and the Aria) and re-encoded to AAC-LC .m4a,
44.1 kHz stereo, faststart. `guandan-theme` was also cut into a 28 s loop with a 0.6 s crossfade on a bar line.

| File | Track | By | Licence | Source |
| --- | --- | --- | --- | --- |
| `guandan-theme.m4a` | Guandan Theme | unknown | **unknown** (see below) | the site's earlier `events/static/guandan_music.mp3` |
| `bossa-antigua.m4a` | Bossa Antigua | Kevin MacLeod | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | [incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700069) |
| `backbay-lounge.m4a` | Backbay Lounge | Kevin MacLeod | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | [incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700068) |
| `cool-vibes.m4a` | Cool Vibes | Kevin MacLeod | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | [incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100863) |
| `clear-air.m4a` | Clear Air | Kevin MacLeod | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | [incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100626) |
| `etirwer.m4a` | Etirwer | Kistol | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [OpenGameArt](https://opengameart.org/content/etirwer) |
| `bach-prelude-c.m4a` | Prelude No. 1 in C major, BWV 846 (Well-Tempered Clavier, Book 1) | J.S. Bach, performed by Kimiko Ishizaka | recording [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); composition public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach-_Well-Tempered_Clavier,_Book_1_-_01_Prelude_No._1_in_C_major,_BWV_846.flac) (licence reviewed 2020-10-26), from [welltemperedclavier.org](https://www.welltemperedclavier.org/) |
| `bach-goldberg-aria.m4a` | Goldberg Variations, BWV 988: Aria | J.S. Bach, performed by Kimiko Ishizaka | recording [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); composition public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Goldberg_Variations_BWV_988_01_Aria.flac), from [opengoldbergvariations.org](https://www.opengoldbergvariations.org/) |

## Attribution shown in the game

The music picker (Settings, and the Music popup from the lobby rail and the tables' menu) shows these lines under
the track list, word for word:

- "Bossa Antigua" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0 License ·
  http://creativecommons.org/licenses/by/4.0/ · Changes: trimmed, loudness-normalised and re-encoded to AAC.
- "Backbay Lounge" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0 License ·
  http://creativecommons.org/licenses/by/4.0/ · Changes: trimmed, loudness-normalised and re-encoded to AAC.
- "Cool Vibes" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0 License ·
  http://creativecommons.org/licenses/by/4.0/ · Changes: trimmed, loudness-normalised and re-encoded to AAC.
- "Clear Air" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0 License ·
  http://creativecommons.org/licenses/by/4.0/ · Changes: trimmed, loudness-normalised and re-encoded to AAC.
- "Etirwer" by Kistol (opengameart.org) · CC0 1.0
- J.S. Bach, Prelude No. 1 in C major, BWV 846. Performed by Kimiko Ishizaka, Open Well-Tempered Clavier
  (welltemperedclavier.org) · Licensed under CC BY 3.0 · https://creativecommons.org/licenses/by/3.0/ · Changes:
  trimmed, loudness-normalised and re-encoded to AAC.
- J.S. Bach, Goldberg Variations BWV 988: Aria. Kimiko Ishizaka, The Open Goldberg Variations
  (opengoldbergvariations.org) · CC0 1.0

The CC0 tracks need no credit; it is given anyway.

## Guandan Theme: licence not known

`guandan-theme.m4a` is the page's earlier background music (`events/static/guandan_music.mp3`, converted from
`guandan_music.MOV` in commit 6fa198d; the file carries a phone video editor's export tags). Its composer, source
and licence are not recorded anywhere in this repository, and a stem separation suggests it may hold a voice or a
voice-like lead. It is kept because it was already the site's Guandan music. Confirm where it came from and that it
may be published; if that cannot be shown, remove the file and point `DEFAULTS.guandan` in `games-music.js` at
another track.

## Adding a track

Only public domain, CC0 or CC BY music: no NC or ND licences, no "personal use only" terms, nothing ripped from
a video site, and nothing whose licence forbids redistributing the file (it is published in a public repository).
Level it to -20 LUFS, keep it under about 4 MB, add it to `TRACKS` in `games-music.js` with its exact credit lines,
and add it to this file.
