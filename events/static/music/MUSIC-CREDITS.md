# Music credits: the games page (events/guandan.html)

Background music for Guandan and Texas Hold'em. The page plays one track at a time and downloads a file only
when its track plays (`events/static/games-music.js`). "Auto", the default, plays `bossa-antigua` on the Guandan
screens and `etirwer` (solo guitar) on the Hold'em ones (the lobby's Hold'em tab, the Hold'em room and table).

Every file here was trimmed to its own ending, loudness-normalised to -20 LUFS (true peak -2.9 dBTP or lower; a
limiter touches only a few isolated peaks in Bossa Antigua, Cool Vibes and the Aria) and re-encoded to AAC-LC .m4a,
44.1 kHz stereo, faststart.

| File | Track | By | Licence | Source |
| --- | --- | --- | --- | --- |
| `bossa-antigua.m4a` | Bossa Antigua | Kevin MacLeod | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | [incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700069) |
| `backbay-lounge.m4a` | Backbay Lounge | Kevin MacLeod | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | [incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700068) |
| `cool-vibes.m4a` | Cool Vibes | Kevin MacLeod | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | [incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100863) |
| `clear-air.m4a` | Clear Air | Kevin MacLeod | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | [incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100626) |
| `etirwer.m4a` | Etirwer | Kistol | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [OpenGameArt](https://opengameart.org/content/etirwer) |
| `bach-prelude-c.m4a` | Prelude No. 1 in C major, BWV 846 (Well-Tempered Clavier, Book 1) | J.S. Bach, performed by Kimiko Ishizaka | recording [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); composition public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach-_Well-Tempered_Clavier,_Book_1_-_01_Prelude_No._1_in_C_major,_BWV_846.flac) (licence reviewed 2020-10-26), from [welltemperedclavier.org](https://www.welltemperedclavier.org/) |
| `bach-goldberg-aria.m4a` | Goldberg Variations, BWV 988: Aria | J.S. Bach, performed by Kimiko Ishizaka | recording [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); composition public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Goldberg_Variations_BWV_988_01_Aria.flac), from [opengoldbergvariations.org](https://www.opengoldbergvariations.org/) |

## Attribution shown in the game

The music picker (Settings, and the Music popup from the lobby rail and the tables' menu) shows these blocks under
the track list (`CREDITS` in `games-music.js`), word for word. The first is the text of incompetech's credit
generator for several pieces (incompetech.com/music/royalty-free/licenses/):

- "Bossa Antigua", "Backbay Lounge", "Cool Vibes", "Clear Air" Kevin MacLeod (incompetech.com) · Licensed under
  Creative Commons: By Attribution 4.0 · http://creativecommons.org/licenses/by/4.0/
- "Etirwer" by Kistol (opengameart.org) · CC0 1.0
- J.S. Bach, Prelude No. 1 in C major, BWV 846. Performed by Kimiko Ishizaka, Open Well-Tempered Clavier
  (welltemperedclavier.org) · Licensed under CC BY 3.0 · https://creativecommons.org/licenses/by/3.0/
- J.S. Bach, Goldberg Variations BWV 988: Aria. Kimiko Ishizaka, The Open Goldberg Variations
  (opengoldbergvariations.org) · CC0 1.0
- Changes: each file trimmed, loudness-normalised and re-encoded to AAC.

The CC0 tracks need no credit; it is given anyway.

## Removed: the page's earlier track

The games page used to play `events/static/guandan_music.mp3` (converted from `guandan_music.MOV`, commit
6fa198d). Its composer, source and licence are not recorded anywhere, and the file carries the export tags of a
ByteDance phone video editor (`com.apple.quicktime.software` {"TEEditor":"2","te_is_reencode":"1",...}), so the
audio most likely came from that editor's music library or another short video; those terms do not allow hosting
the file in a public repository. It was removed from the page and the repository (it stays in git history:
`git show e83406c:events/static/guandan_music.mp3`). Bring it back only with a known source and a licence that
allows public hosting, and then credit it under its real title and artist.

## Adding a track

Only public domain, CC0 or CC BY music: no NC or ND licences, no "personal use only" terms, nothing ripped from
a video site, and nothing whose licence forbids redistributing the file (it is published in a public repository).
Level it to -20 LUFS, keep it under about 4 MB, add it to `TRACKS` in `games-music.js` with its exact credit lines,
and add it to this file.
