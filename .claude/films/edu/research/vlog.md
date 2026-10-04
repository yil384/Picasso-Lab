# Side line (支线): iPhone vlogs, from shooting to a mostly-code post pipeline

Report for @PicassoLabUCSD, 2026-10-04. Covers: an iPhone shooting guide, legal and safety rules (checked against
primary sources where possible), a post pipeline built on ffmpeg + whisper-cli + the lab's own q5.js/three.js frame
renderer, a comparison with CapCut/剪映 and a recommended hybrid, and shot lists for three pilots.

How to read the markers:
- **(verified)**: checked against a primary source (statute, official page, Apple spec sheet) or tested on this Mac.
- **(secondary)**: from news or a third-party guide only.
- **(unverified)**: not confirmed. Check it before it goes into a video or a graphic.
- **(tested)**: the command or script was run on this Mac (M2, ffmpeg-full 8.1.1) with synthetic input (test pattern
  plus tone), not with real iPhone footage. Run it once on real footage before relying on it.

Sources are listed at the end, by section.

---

## 0. Conclusions first

1. **Shoot SDR, 4K, 30 fps, vertical.** Turn HDR Video off for the side line. X has no documented HDR video support.
   Douyin has played Dolby Vision on iPhone since 2026-01-05, but only through its own app and editor path. Our
   overlays are sRGB, and Apple's own in-camera SDR rendition looks better than any generic tone-map. If HDR clips
   turn up anyway, the zscale + tonemap chain in section 2.3 converts them (tested). Use 4K60 for action and 4K120 for
   slow motion. 4K into a 1080x1920 master leaves 2x of punch-in room.
2. **Audio matters more than picture.** Use a DJI Mic 3 (two transmitters, USB-C receiver, 32-bit float backup inside
   each transmitter) for every spoken line. Use iPhone Audio Mix (Studio) only as a fallback. Record 10 s of room tone
   at each location. Sync the backup audio in code by cross-correlation.
3. **Before the scooter pilot, note that San Diego has no city-wide rental scooters.** Bird, the last operator, left in
   November 2023. The usable fleet is Spin on the UC San Diego campus ($1 unlock + $0.30/min). UCSD policy 270-11
   (revised 2026-09-10) bans using a handheld phone while riding, so every riding shot needs a body or handlebar mount.
   Under California law (CVC 21235) a rider needs a license or permit, may not use sidewalks and may not carry a
   passenger. A helmet is required only under 18, but wear one on camera anyway. The speed limit is 15 mph (CVC 22411).
   These rules are the joke engine of the pilot, not an obstacle.
4. **Fix music licensing before anything else.** CapCut's "Commercial Sounds" may only be used in CapCut, TikTok and
   TikTok for Business. X is not on that list, and the launch films currently get their music in CapCut. Douyin's
   in-app music is reported to be licensed for use inside Douyin only (secondary). Plan: add music inside the Douyin
   app when publishing, and give the X cut music from a library whose written license names X, or original music.
5. **Honor of Kings footage is the riskiest material.** Chinese courts have held that 王者荣耀 gameplay is a
   cinematographic-like work owned by Tencent, and have ruled against platforms hosting user clips. I found no public
   global fan-content policy for Honor of Kings (unverified). Keep gameplay a minority of the runtime, use it to
   illustrate commentary, blur player IDs, and never ruin strangers' ranked games: film in a custom room with lab
   members.
6. **Douyin requires AI-content labels** (national rule in force since 2025-09-01). Any Codex-painted art in a side-line
   video means ticking Douyin's AI-content declaration. Otherwise the platform may add its own "suspected AI" notice.
7. **Pipeline: automate everything except taste.** Code handles ingest, tone-map, transcription (whisper-cli plus a
   VAD model, word timestamps), a transcript-based "paper edit" that writes an EDL, assembly with jump cuts and
   punch-ins, overlays rendered with alpha, bilingual ASS subtitles, ducking and loudness, and two deliverables. The
   user does the jokes, the take choice (ticking lines in the paper edit), comedic timing, music choice and the final
   watch-down on a phone. CapCut/剪映 stays an optional last-mile tool, never the source of truth.
8. **Tooling gaps on this Mac:** the default `/opt/homebrew/bin/ffmpeg` has no zscale, libass or drawtext. Use
   `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`, which has zscale, libass, whisper, vidstab and rubberband. Its
   libplacebo cannot start here (no Vulkan device). whisper-cli 1.8.4 is installed but has **no real model**; download
   `ggml-large-v3-turbo.bin` (1.62 GB) and `ggml-silero-v5.1.2.bin` (VAD, 885 KB). The video-kit renderer **drops
   alpha** in its default mode, so overlay renders need `--fmt png --store png` and a transparent canvas.

---

## 1. What the side line is, and how it stays "ours"

The main line rebuilds lectures as code-rendered films. The side line is iPhone footage of absurd "tutorials". The two
are tied together by **one device: every side-line video is a mock lecture.** It has the same slide system,
typography (Inter, JetBrains Mono, Fraunces; Permanent Marker and Caveat for hand lettering, all already in
`video-kit/pipeline/fonts`), paper textures and code-rendered overlays as the main line. The difference is that the
"lecture" is about scooters or a mage in the jungle.

How the style models translate into editing decisions. These describe the creators' broadly known styles; no specific
video is cited:

| Model | What we borrow | Where it shows up |
| --- | --- | --- |
| 毕导THU | Deadpan academic rigor applied to an absurd question: formulas, "experiments", honest measurement | Zhen Ji clear-time model, the $5 knapsack, scooter "legal review" |
| 老师好我叫何同学 | Precise, clean, quiet product-reveal shots and one sincere beat | Helmet reveal, the $5 bill under a desk lamp, the sunset beat |
| 影视飓风 Tim | Production value on mundane subjects: slow motion, telephoto, sound design | Scooter cold open, B-roll quality bar |
| 喜人奇妙夜 (sketch) | Premise, escalation in threes, a twist ending, a straight man who never breaks | The presenter never admits the premise is wrong |
| 脱口秀大会 (stand-up) | Callbacks, act-outs, the tag after the punchline | Callbacks to the launch film ("*Compute not included." becomes "*Membership not included."), on-screen footnotes as tags |

Comedy rule for every pilot: **the presenter plays it totally straight, and the graphics are the second comic voice**
(stamps, footnotes, "Reviewer 2" cards). This suits a code-first pipeline because the second voice is exactly what we
render.

Format defaults (consistent with the sibling `platforms.md`):
- 1080x1920, 9:16, 30 fps CFR, SDR BT.709, H.264 High, AAC LC 48 kHz. Loudness -14 LUFS integrated, true peak -1.5 dBTP.
- X cut at most 2:20 (the X Help Center cap for non-Premium accounts). Whether @PicassoLabUCSD is Premium is unknown.
  The sibling report notes X's statement that only subscribed users get 1080p playback (check).
- Douyin cut may run longer (target 1:30 to 2:30).
- Safe zones: use the shared template in `platforms.md` section 3. Keep 0-260 at the top and 1480-1920 at the bottom
  clear, and keep the right rail (x 880-1080, y 700-1480) clear. Subtitles go in x 120-880, y 1200-1440.

---

## 2. Shooting guide (iPhone 15 Pro through 18 Pro)

### 2.1 What the current Pro phones can do (verified, Apple spec pages)

| | iPhone 17 Pro (2025) | iPhone 18 Pro (on sale 2026-09-18) |
| --- | --- | --- |
| 4K Dolby Vision | 24/25/30/60/100 (Main)/120 fps | 24/25/30/60/100 (Main)/120 fps |
| ProRes / Log | ProRes (4K120 with external recording), ProRes RAW, Apple Log 2, ACES | same |
| Action mode | up to 2.8K Dolby Vision 60 fps | up to 2.8K Dolby Vision 60 fps |
| Cinematic mode | up to 4K Dolby Vision 30 fps | up to **4K60**; Cinematic effects can be applied **after capture** to video shot at up to 60 fps (newsroom) |
| Slo-mo | 1080p up to 240 fps; 4K DV up to 120 fps | same |
| Dual Capture (front + back) | up to 4K DV 30 fps | up to 4K DV 30 fps |
| Rear lenses | 13 mm f/2.2 UW; 24 mm f/1.78 Main; 48 mm (2x crop); 100 mm f/2.8 (4x); 200 mm (8x, optical quality) | Main 48 MP 24 mm with **variable aperture f/1.48, f/1.8, f/2.8, f/4.0**; UW 13 mm f/2.2; Tele 100 mm f/2.8 (4x) |
| Front | 18 MP Center Stage, 4K DV 24/25/30/60 | same |
| Audio | four mics, wind noise reduction, Audio Mix, Spatial Audio and stereo | same, plus "higher-quality voices" and music isolation (newsroom) |
| New controls | | **Pro controls** in the Camera app: aperture, shutter speed, white balance, histogram |
| USB-C | | USB 3 (up to 10 Gb/s) |

On the 18 Pro, use f/2.8 to f/4 for walk-and-talk shots so the face stays sharp when the distance changes, and
f/1.48 for product reveals. Use Pro controls to fix shutter and white balance for each scene.

### 2.2 Settings card (set once, then lock)

Settings > Camera > Record Video (Apple support page, verified for the items marked):
- **HDR Video: OFF** (verified setting). The reason is in 2.3.
- **Auto FPS: Off** (verified setting). Otherwise low light silently drops 30 fps to 24 fps, which breaks the 30 fps
  timeline and lip sync with the lav.
- **Lock Camera: On** (verified setting). This stops the phone from switching lenses mid-shot, which shows up as a
  color or sharpness jump.
- **Enhanced Stabilization** (verified setting): on for handheld shots. Turn it off on a tripod to get the full field
  of view.
- **Action Mode Lower Light** (verified setting): on for dusk scooter shots, at the cost of some stabilization.
- Lock White Balance: present on recent iOS versions (exact name and location unverified on iOS 27). On the 18 Pro, Pro
  controls cover white balance.
- Formats: High Efficiency (HEVC). Keep it; it is needed for 4K60 and higher.
- Frame rate: **30 fps everywhere** except action (60) and slow motion (120 or 240). Avoid 24/25 indoors in the US: a
  frame rate that does not divide the 60 Hz mains frequency risks LED flicker (general practice, not
  platform-specific).
- Exposure and focus: long-press to set AE/AF lock on every static shot. Do not let auto-exposure "breathe" during a
  monologue.
- Turn on Do Not Disturb or a Focus mode before every take, and before any screen recording.

Per shot type:

| Shot | Mode | Res / fps | Lens | Rig | Notes |
| --- | --- | --- | --- | --- | --- |
| Lecture A-roll (presenter to camera) | Video | 4K30 | 1x at 1-1.5 m, or 2x at about 2 m (flatters faces) | tripod, 1 window light or soft LED | Head at about y 600-900 of the final 1920 so subtitles never cover the mouth |
| Second angle for jump-cut variety | Video | 4K30 | 4x (100 mm) from about 4 m | second phone or reshoot | Gives a real angle change; punch-ins alone get monotonous |
| Walk-and-talk selfie | Video, front camera | 4K30 | front 18 MP | selfie grip | Lav on collar, not the phone mic |
| Scooter POV | Action mode | 2.8K60 | (mode picks it) | chest or handlebar mount, **never handheld** | 2.8K vertical is about 1620 px wide (assumed 2880x1620 raster, unverified), so there is only about 1.5x of punch-in room |
| Scooter pass-by | Video | 4K60 | 4x pan from the curb | tripod with a smooth head | Telephoto compresses speed: looks fast at 8 mph |
| Wheel or detail slow motion | Slo-mo | 4K120 (17/18 Pro) or 1080p240 | 1x or 0.5x | ground mini tripod | Bright daylight only |
| Product reveal (helmet, $5 bill, receipts) | Video (macro) | 4K30 | 0.5x macro | tripod or slider, black card background | The 何同学 shot: slow push, one hard light, silence then a sound effect |
| Comedic "surveillance" cutaway | Video | 4K30 | 8x (17 Pro) or 4x | tripod | Fake documentary look |
| Rack-focus gag | Cinematic | 4K30 (17 Pro) / 4K60 (18 Pro) | 1x/2x | tripod | Edges around hair look synthetic ("AI-ish"). Use at most once per video |
| Time passing | Time-lapse (18 Pro: 4K Dolby Vision) | | 0.5x/1x | tripod | Shot as HDR on the 18 Pro, so tone-map it (2.3) |

### 2.3 HDR vs SDR, and how HDR breaks

What iPhone HDR is: HEVC 10-bit, BT.2020 primaries, HLG transfer, with Dolby Vision metadata on top (on the 18 Pro,
"4K Dolby Vision" in every video row of the spec sheet). ffmpeg decodes the HLG base layer and ignores the Dolby
Vision layer.

How it breaks:
- **X:** there is no documented HDR video support. X's media spec lists only H.264 High and yuv420p, and says nothing
  about HDR (verified, X API "Best practices"). X added HDR photo display on iOS around December 2025 (secondary). An
  HDR upload is therefore converted by X with unknown quality. Typical failures across platforms are a flat, washed-out
  picture (HLG read as BT.709) or crushed and oversaturated highlights (secondary: MacRumors forum and editor guides).
- **Douyin:** since 2026-01-05 iPhone users can watch, edit and publish Dolby Vision in the Douyin app, and 剪映/CapCut
  is named as an editing path (verified, IT之家 report of the Dolby/Douyin deal). Android support was "coming soon".
  Older reports describe iPhone HDR uploads looking much brighter than neighboring videos, or grey (发灰) (secondary).
  Our pipeline outputs SDR files from ffmpeg, so HDR on Douyin does not help us.
- **Our own compositing:** overlays are sRGB PNGs. Putting them on HLG footage means mapping graphics white to HDR
  reference white (about 203 nits). That is doable, but it doubles the color work for no audience benefit.

**Decision: shoot SDR.** Apple's in-camera SDR tone curve beats a generic operator. Keep HDR only for scenes with
extreme contrast (sunset into the sun). Even then, prefer SDR with exposure locked on the highlights.

**Fallback tone-map, if HDR clips turn up (tested):**

```sh
FF=/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg     # the default ffmpeg has no zscale
# detect: color_transfer=arib-std-b67 (HLG) or smpte2084 (PQ)
ffprobe -v error -select_streams v:0 -show_entries stream=color_transfer,color_primaries,pix_fmt -of csv=p=0 in.mov
# HLG -> SDR BT.709 (tin/pin/min are given explicitly so mis-tagged files still convert)
$FF -i in.mov -vf "zscale=tin=arib-std-b67:pin=bt2020:min=bt2020nc:t=linear:npl=100,format=gbrpf32le,\
zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p" \
  -c:v libx264 -crf 16 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a copy out_sdr.mp4
```

- Measured speed: a 2 s 1080x1920 clip took about 1.0 s on this M2, so roughly 2x real time at 1080p. A 4K clip should
  take about 4x as long (estimate).
- On the first test, zscale failed with "no path between colorspaces" because the file's transfer tag was missing.
  Always pass `tin=/pin=/min=`.
- `npl` (nominal peak luminance) sets overall brightness. Try 100, then 203, and judge on a phone. `hable` keeps
  highlights soft; `mobius` keeps more saturation. Choose by eye, once per show, not per clip.
- libplacebo, the better tone-mapper, is compiled in but fails here with "Device creation failed" because there is no
  Vulkan/MoltenVK. Do not build the pipeline around it.

### 2.4 Apple Log 2: almost never, for vlogs

Apple Log 2 (17/18 Pro) gives the most grading latitude but requires a conversion LUT on every clip. Free Apple Log 2
to Rec.709 LUTs exist from third parties (gamut.io and others; I did not confirm whether Apple publishes an official
Log 2 LUT). For run-and-gun vlogs the cost is high: flat monitoring on set, exposure discipline, a grade per scene. Use
it only for one or two hero B-roll shots per video (the scooter cold-open slow motion, the sunset). Apply one
conversion LUT with `lut3d=file=AppleLog2_to_709.cube` and nudge exposure per clip in the EDL (section 4.6).

### 2.5 Action mode

- 2.8K at 60 fps maximum on the 17 and 18 Pro (verified), and it works best in bright light (Apple's "Lower Light"
  switch trades stabilization for exposure).
- It is the right mode for the scooter POV. It is the wrong mode for anything we will punch into: 2.8K leaves only
  about 1.5x of headroom at a 1080 output width.
- Do not stack software stabilization on top. ffmpeg-full has `vidstabdetect/vidstabtransform`, but use it only to
  rescue a shot recorded in plain Video mode.

### 2.6 Lenses and framing for vertical

- Frame for the safe-zone template, not the full sensor. The eyes go at about y 650-850 of the 1920 frame, and nothing
  important goes below y 1180 (subtitles live at 1200-1440).
- Shoot "loose": 4K vertical is 2160x3840, and the master is 1080x1920. A shot framed wider than needed lets the edit
  choose 1.0x, 1.12x, 1.25x or up to 2.0x punch-ins without losing sharpness.
- Lens grammar for the series: 1x for the lecture, 4x for "the camera is judging you" cutaways, 0.5x for the absurd
  wide that reveals the context (for example, it is a $1 rental scooter).

### 2.7 Audio

Primary: **DJI Mic 3** (released 2025-08-28). Verified on DJI's spec page and review coverage:
- Up to 4 transmitters and a USB-C receiver that plugs straight into an iPhone 15 or later (USB-C), or Bluetooth.
- 32-bit float internal recording on each transmitter (32 GB, about 43 h at 32-bit float).
- Timecode in and out.
- Battery about 10 h per transmitter, 8 h for the receiver, 28 h for the case.

How to use it:
- Receiver into the phone, so the camera file carries usable lav audio. Turn on internal recording on the transmitters
  as a safety copy. The iPhone Camera app does not read timecode, so sync the backup WAV to the camera audio by
  cross-correlation in code (numpy FFT; about 20 lines).
- Fur windscreens outdoors are mandatory. Scooter wind at 15 mph will overwhelm any lav. Plan scooter narration as
  voice-over recorded afterwards, and keep the riding audio as ambience.

Fallback: built-in mics.
- iPhone 16 and later record Spatial Audio by default. **Audio Mix** (Standard, In-Frame, Studio, Cinematic) is applied
  after capture in Photos. "Studio" reduces background noise and reverb (verified, Apple/MacRumors).
- Wind noise reduction is on by default for Spatial Audio and stereo recordings and can be switched off under
  Settings > Camera > Record Sound (secondary, MacRumors).
- Whether an external USB-C mic disables Spatial Audio and Audio Mix is not confirmed (unverified; assume it does).

Set routine: a hand clap in shot at the start of each take (a sync anchor for code and humans), 10 s of room tone per
location, and 1 s of silence before and after every line. Silence makes text-based cutting clean.

### 2.8 Screen recording for Honor of Kings with a face-cam

The stock iPhone cannot record a full-screen game and its own front camera at once. Dual Capture is camera plus
camera, and third-party "screen + face" apps compete with the game for performance. Use two devices:

| Layer | Device | How | Settings |
| --- | --- | --- | --- |
| Gameplay | iPhone A (or iPad) | Control Center > Screen Recording, microphone **off**. Alternative: USB to a Mac, QuickTime Player > File > New Movie Recording > pick the iPhone as the camera source (verified, OSXDaily/How-To Geek) | Do Not Disturb on; in-game graphics at the highest frame rate the device holds |
| Face + hands | iPhone B on a tripod, rear camera 1x or 2x, framed on the face **and** the hands holding iPhone A | Video 4K30 | DJI Mic transmitter on the player |
| Voice | the DJI receiver in iPhone B | | |

Post:
- Screen recordings are often variable frame rate (unverified for iOS 27). Normalize with `fps=30` (or keep 60 for a 60
  fps master) before editing.
- Sync phone A to phone B by cross-correlating game audio: phone B's lav hears the game speaker faintly. If that fails,
  fall back to the hand clap visible on screen.

Vertical layout: MOBA cameras follow your own hero, so the hero sits near the center of the landscape frame (general
MOBA behavior; confirm in HoK). That makes three vertical layouts cheap:
1. **Center crop** of the gameplay (9:16 out of 16:9 around the hero), plus a separate crop of the minimap as a
   picture-in-picture in the title zone.
2. **Stack:** gameplay fitted to width (1080x~500) in the hero zone, face-cam below, subtitles under that.
3. **Freeze-and-annotate:** full-screen freeze of one gameplay frame, then a telestrator overlay (section 4.7).

Use 1 and 3 for jokes and 2 for "real teaching" moments.

### 2.9 Minimal kit (prices are indicative only, unverified)

- iPhone 17 or 18 Pro (plus any second iPhone as camera B)
- DJI Mic 3 with 2 transmitters
- Two tripods with phone clamps (one tall, one mini)
- A chest mount and a handlebar mount for scooter shots
- One soft LED panel
- Clip-on variable ND filter (optional, for 1/60 s shutter outdoors on the 18 Pro with Pro controls)
- A black card and a white card
- A small notebook for the shot log (the "lab notebook" prop doubles as a gag)

---

## 3. Legal and safety, verified

This is not legal advice. Each item lists its source and status. For anything lab-branded, a short check with UCSD
University Communications is cheap insurance.

### 3.1 E-scooters: California state law (verified, leginfo.legislature.ca.gov)

CVC 21235 (motorized scooter operation). A rider may not:
- ride on a highway with a speed limit over 25 mph unless in a Class II or Class IV bikeway (local authorities may
  raise this to 35 mph);
- ride under 18 without a properly fitted and fastened bicycle helmet;
- ride without a valid driver's license or instruction permit;
- carry a passenger;
- carry anything that prevents keeping at least one hand on the handlebars;
- ride on a sidewalk, except to enter or leave adjacent property;
- ride with handlebars raised so the hands are above the shoulders;
- park on a sidewalk in a way that blocks pedestrians;
- ride without a brake able to skid a wheel on dry, level pavement.

Other sections:
- **CVC 22411:** "No person shall operate a motorized scooter at a speed in excess of 15 miles per hour."
- **CVC 21221:** scooter operators have the rights and duties of drivers under the rules of the road (Division 11).
  This includes DUI rules, "except those provisions which, by their very nature, can have no application".
- Whether the handheld-phone ban for drivers (CVC 23123.5) reaches scooter riders through 21221 is unverified. It does
  not matter for us: UCSD bans it outright (3.3), and we never hold a phone while riding.
- California law changes for 2026 were about e-bikes (for example SB 1271 battery and product safety standards from
  2026-01-01; the AB 1778 Marin pilot). I found no 2026 change to the scooter rules above (secondary).

### 3.2 E-scooters: City of San Diego

- The City's micromobility page sets 16+ as the minimum age for e-scooters, helmets for riders under 18 and 15 mph,
  requires lights and reflectors, and bans electric and motorized devices from sidewalks (verified, sandiego.gov).
- **Boardwalk ban:** shared mobility devices are banned on the boardwalks at Mission Beach, Pacific Beach, Mission Bay
  Bayside Walk and La Jolla Shores. Operators had to geofence them to 3 mph. This was adopted December 2019 and
  enforced from March 2020 (verified, GovTech/10News). Reports describe it as covering shared devices. Whether private
  scooters are also covered is unclear (unverified). Do not ride any scooter on a boardwalk on camera.
- **There is no city-wide rental fleet.** Lime, Spin and Link withdrew under the City's rules (3 mph zones, in-street
  corral parking). Bird, the last operator, suspended service in early November 2023 (verified, GovTech 2023-11-17;
  NBC San Diego). The City then discussed softening the rules. I found no confirmed return of a city-wide operator
  as of 2026 (unverified). The only fleets left serve the SDSU and UCSD campuses.

### 3.3 E-scooters: UC San Diego campus

- **Shared fleet:** Spin, about 800 scooters and 24 bikes. You must end a ride in one of about 700 designated parking
  spots. Scooters are meant for on-campus use, and one taken off campus must come back the same day. UCSD rate: $1
  unlock + $0.30/min, with a $3/month unlock pass and a need-based Spin Access rate. Discounted MIPS helmets cost $10
  (verified, transportation.ucsd.edu).
- **Spin's own terms:** riders 18+ with a valid driver's license (secondary). Check the in-app terms before shooting.
- **PPM 270-11, Micromobility Device Policy** (revised 2026-09-10; verified, UCSD policy site):
  - "Operators must not use handheld electronic devices (e.g., cellular phones) while operating Micromobility
    Devices."
  - No riding inside buildings, on the Geisel Library Forum level or on the Mandeville Center decks.
  - No passengers.
  - Devices that can exceed 20 mph are not allowed on campus pathways and bike lanes.
  - Helmets are strongly encouraged.
  - Impound fee $25 plus $2/day.
- **UCSD Police guidelines:** at most 8 mph (or double walking speed) on shared-use paths; ride on the road or on
  micromobility paths, not sidewalks; one hand on the handlebars; license or permit (verified, police.ucsd.edu). Biking
  is not allowed on Library Walk on weekdays 8:30 a.m. to 5 p.m. How exactly this applies to scooters is unverified;
  treat Library Walk as walk-only in daytime.
- **Personal e-scooters:** every UCSD affiliate who rides one on campus must complete e-scooter registration (rider
  education plus a sticker from Campus Bike & Skate) (verified, transportation.ucsd.edu "Register Your Ride").

Consequences for the shoot:
1. The camera is never in a rider's hand. Use mounts only.
2. Every "illegal technique" gag is **staged stationary**: scooter off, rider standing, freeze-frame, stamp. It is
   never actually ridden.
3. The rider is over 18, licensed and wearing a helmet in every riding shot.
4. Shoot on campus roads and micromobility paths at low-traffic hours. No boardwalk.

### 3.4 Filming people and places

- **Audio of conversations (Penal Code 632, verified).** Recording a "confidential communication" without the consent
  of all parties is a crime. The statute excludes communications "made in a public gathering ... or in any other
  circumstance in which the parties ... may reasonably expect that the communication may be overheard or recorded".
  Rule: never record a private conversation; get on-camera consent from anyone we talk to (a store clerk, a passer-by).
- **Likeness (Civil Code 3344, verified).** Liability for knowingly using someone's name, voice, photograph or likeness
  "for purposes of advertising or selling" without consent. News and public-affairs uses are exempt. A person who
  merely appears in a crowd, not singled out, is treated as part of a group, not as individually identifiable. Rule:
  signed talent releases for everyone featured, including lab members. Bystanders may stay as incidental background;
  blur anyone singled out.
- **China (Douyin audience):** the PRC Civil Code protects portrait rights (肖像权, Art. 1019; generally requires
  consent to publish someone's portrait). Douyin acts on complaints. The same release and blur rule covers it.
- **UCSD property (verified, University Communications):** commercial filming (commercials, movies, ads) goes through
  University Communications, with daily rates from $3,500 (photo) and $4,500 (video). Commercial filming is prohibited
  inside labs, classrooms and dorms and at the School of Medicine. Drone shots need a request 72 hours ahead. Filming a
  specific location such as a lab or lecture hall needs that unit's communications office to approve it. The page does
  not say how a lab's own social account is classified (unverified). Ask CSE or University Communications once, in
  writing, and keep the answer.
- **City of San Diego property (verified, sandiego.gov):** commercial film and photo productions on City property must
  register through the Filming Authorization Application System. Registration is free, needs 3 business days (one week
  for drones or traffic control; two weeks for water work or vehicles on the beach). A third-party guide says casual
  shooters with no equipment and no exclusive use are exempt (secondary). With one phone and one presenter we are
  probably below the threshold. A tripod on a busy sidewalk may not be.
- **California State Parks (verified, parks.ca.gov):** "recording video for YouTube and other social media outlets that
  result in financial gain ... is deemed commercial photography" and needs a California Film Commission permit.
  Torrey Pines State Natural Reserve adds its own rules. Keep the $5 pilot on City beaches (La Jolla Shores, Pacific
  Beach) and off State Parks, unless the lab confirms the account is non-commercial.
- **Private property** (stores, cafes, MTS vehicles and stations): ask staff before filming inside. Film receipts and
  products outside on a table. MTS filming rules are unverified; keep transit shots short, exterior or of the
  presenter only, with no rider faces.

### 3.5 Honor of Kings footage

- Tencent owns the copyright in the game's audiovisual output under Chinese case law:
  - **Guangzhou Internet Court, 2020-02-18:** Tencent v. a video platform. Over 300,000 user 王者荣耀 clips. The game's
    continuous images are a "cinematographic-like work" (类电作品). Fair use was rejected because gameplay made up
    70-80% of most clips, which "超出了适当引用的合理限度" (verified, Jiemian).
  - Later rulings went against Douyin-family services over 王者荣耀 short videos and live streams (secondary,
    21jingji/Nanfang).
- **Global version:** I could not find a public Level Infinite or Honor of Kings fan-content or video policy, or the
  current Terms of Service text on videos (unverified; two candidate ToS URLs returned 404). Level Infinite runs a
  creator program, "HOK Studio", with an incentive policy for 2026. Coverage describes it for India-based creators
  (secondary), which suggests the publisher welcomes creators. It is not a license.
- Practical rules:
  1. Gameplay at most about 40% of runtime, always under commentary or annotation (the lecture frame helps).
  2. No long uninterrupted match footage.
  3. Blur every player ID except our own.
  4. Show no toxic chat text.
  5. Never play Zhen Ji in the jungle in **ranked** games with strangers: use custom rooms with lab members (it is
     funnier too).
  6. Name the hero correctly for each audience. In the global version she is **Lady Zhen**, a Mid Mage (verified,
     HoKStats), and her skill names differ from 王者荣耀's (check every on-screen name against the version shown).
  7. Before going public, email HOK Studio or Level Infinite creator support with the episode concept (low cost, high
     value).

### 3.6 Music on X vs Douyin

- **X:** handles copyright through DMCA notices and a repeat-infringer policy (secondary: X Transparency figures and
  legal-guide summaries). I found no in-app licensed music library for X posts (unverified). Anything on the X cut
  needs our own written license.
- **CapCut (what the launch films use for music today):** the Materials License Agreement (updated 2026-01-22) allows
  "Commercial Sounds" only "within CapCut, TikTok and TikTok for Business". Other uses need a license from the rights
  holders. Exported materials may not be modified further (verified, capcut.com). **Music added in CapCut is therefore
  not cleared for X.** The same likely applies to 剪映's music for anything that leaves Douyin (unverified; 剪映 has
  its own "商用音乐库" with license certificates, secondary).
- **Douyin:** guides and copyright blogs report that the in-app music library is licensed for publishing inside Douyin,
  and that tracks marked as personal-use-only are risky in commercial content (secondary). Lowest-risk route: upload
  the Douyin cut **without** music and add the track in Douyin's publish flow. For a mix with ducking, burn in only
  music whose license names Douyin.
- **Stock libraries:** the personal or creator plans I found (Epidemic Sound Creator, Artlist Personal/Social) list
  YouTube, Facebook, Instagram, TikTok, Twitch and podcasts. **Neither X nor Douyin was named** (secondary). A business
  plan may differ (unverified). Get written confirmation that names X before paying.
- **Recommendation:**
  - The X cut uses either (a) a library track whose license text names X, or (b) original music: a short house motif
    commissioned once, plus stingers.
  - The Douyin cut uses Douyin's in-app music at publish time, or the same original music.
  - Keep music on a separate stem so both versions come from one edit.

### 3.7 AI-content labels

- China's 《人工智能生成合成内容标识办法》 has been in force since 2025-09-01. It requires explicit and implicit
  labels on AI-generated or synthesized content (verified, CAC).
- Douyin added a creator-side AI label and metadata reading. If a creator does not label, the platform adds "疑似使用了
  AI生成技术，请谨慎甄别", and shows "作品含AI生成内容" when metadata says so (verified, Xinhua).
- Any side-line video containing Codex-painted stickers, cards or maps: tick the AI declaration on Douyin. Keep the
  generation prompts in the episode folder.

### 3.8 The $5 / 24 h challenge: safety and ethics

- **Sleeping:** San Diego's Unsafe Camping Ordinance (in force 2023-07-29, enforced from 2023-07-31) bans tents on
  public property when shelter beds are available. It also bans them at all times in parks and canyons and near
  schools, transit stations and shelters (verified, Times of San Diego/ABC7). The presenter sleeps **at home**. The
  "survival" is about money, not shelter.
- **Do not use resources meant for people in need.** The Triton Food Pantry is open to every registered UCSD student
  (verified, basicneeds.ucsd.edu). That makes it technically "allowed", and that is exactly why it must be off-limits
  and never filmed. Say so on camera; it is also the sincere beat. Same for free meals at shelters and churches.
- **Tone:** budget ingenuity, not poverty tourism. No jokes at the expense of unhoused people. No begging, no
  dumpster-diving, no "free sample" farming.
- **Physical:** water (tap water and fountains are allowed by the rules), sun, heat, being home before dark, and a phone
  battery plan.

---

## 4. Post pipeline (mostly code)

### 4.0 Overview

```
iPhone originals (.mov, HEVC)            screen recordings          DJI TX backups (32-bit WAV)
        |                                         |                              |
   [1 ingest] probe, HDR->SDR if needed, CFR, proxies 540x960, 16 kHz mono WAV ----+
        |                                                                          |
   [2 transcribe] whisper-cli + Silero VAD -> words.json (word timestamps)    [sync] xcorr offset
        |
   [3 paper edit] transcript page: tick lines, pick takes -> edl.json (src, in, out, zoom, cx, cy, push, grade)
        |
   [4 assemble] ffmpeg: cut + jump-cut zooms + de-click fades -> rough.mov (+ review contact sheet)
        |
   [5 overlays] cues.json (from EDL + words) -> q5.js/three.js scene -> RGBA PNG frames -> ProRes 4444
        |
   [6 subtitles] words -> EN lines; EN -> ZH lines (LLM + human) -> subs.en.ass, subs.zh.ass (house style)
        |
   [7 mix] voice chain + music ducked by speech intervals + SFX -> two-pass loudnorm -14 LUFS / -1.5 dBTP
        |
   [8 deliver] X: EN subs, licensed music, <= 2:20 | Douyin: ZH(+EN) subs, no-music stem or Douyin music, AI label
```

Proposed layout, one folder per episode, for example `social/vlog/<ep>/`:
- `shotlog.md`, `edl.json`, `words.*.json`
- `ledger.csv` and `route.geojson` (for the $5 pilot)
- `cues.json`, `subs.en.ass`, `subs.zh.ass`
- `overlays/` (scene HTML)
- `out/` (git-ignored)

Every Python helper returns `(value, None)` or `(None, "error")`, as `video-kit/pipeline/encode.py` already does.

### 4.1 What is on this Mac (verified 2026-10-04)

| Tool | Path | Has | Missing |
| --- | --- | --- | --- |
| ffmpeg 8.1.1 (default) | `/opt/homebrew/bin/ffmpeg` | x264, x265, VideoToolbox, prores, loudnorm, sidechaincompress, zoompan, lut3d | **zscale, libass (`ass`/`subtitles`), drawtext, libplacebo, whisper** |
| ffmpeg-full 8.1.1 | `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` | all of the above plus zscale (zimg), libass + fontconfig + harfbuzz, drawtext, whisper filter, vidstab, rubberband, arnndn, frei0r | libplacebo is built in but **no Vulkan device** ("Device creation failed") |
| whisper-cli 1.8.4 | `/opt/homebrew/bin/whisper-cli` | Metal GPU, `--vad`, `-ojf` (full JSON with tokens), `-ml/-sow`, `-dtw`, `--prompt` | **no model**: only the 575 KB `for-tests-ggml-tiny.bin`, which outputs nothing. Input must be WAV/MP3/FLAC/OGG |
| video-kit renderer | branch `origin/video-kit`, `video-kit/pipeline/render.py` | Playwright frame capture, `--fmt png/rgba`, `--store segments/png`, `--range` | Alpha is dropped by `--fmt rgba` (PIL `.convert("RGB")`) and by `--store segments` (x264rgb). Only `--fmt png --store png` keeps it |

Model downloads (URLs checked with HTTP 200 and size):
```sh
mkdir -p ~/models/whisper && cd ~/models/whisper
curl -LO https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin      # 1,624,555,275 B
curl -LO https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v5.1.2.bin          # 885,098 B
# lighter alternative: ggml-large-v3-turbo-q5_0.bin (574,041,195 B)
```

### 4.2 Ingest

1. Copy originals off the phone unmodified (AirDrop with "All Photos Data", or Image Capture). Never use exports from
   Photos, which may re-encode.
2. Probe everything (`ffprobe -show_streams -of json`), then:
   - `color_transfer` = `arib-std-b67` or `smpte2084`: run the 2.3 tone-map.
   - Rotation side data: iPhone vertical files are often a landscape raster plus a rotation flag. ffmpeg auto-rotates
     on decode by default, so do not pass `-noautorotate`. Check that the output is 2160x3840, not 3840x2160.
   - `r_frame_rate` != `avg_frame_rate`: the file is VFR (common in screen recordings). Add `fps=30`.
   - Audio channels and sample rate: resample to 48 kHz.
   - Location tag `com.apple.quicktime.location.ISO6709` (present when Camera has location access; confirm on our
     files): free GPS points for the $5 route map.
3. Make proxies (540x960 H.264, fast) for the paper-edit page.
4. Extract `clip.16k.wav` with `ffmpeg -i clip.mov -vn -ac 1 -ar 16000 -c:a pcm_s16le clip.16k.wav`.
5. Sync DJI backups to camera audio by cross-correlation. Store the offset in `shotlog`.
6. Decode speed: with real HEVC, add `-hwaccel videotoolbox` before `-i` (not measured here).

### 4.3 Transcription

```sh
whisper-cli -m ~/models/whisper/ggml-large-v3-turbo.bin \
  --vad -vm ~/models/whisper/ggml-silero-v5.1.2.bin \
  -l en -ojf -ml 1 -sow \
  --prompt "Picasso Lab, UC San Diego, Lady Zhen, Zhen Ji, Honor of Kings, jungler, smite, MTS, PRONTO, Spin" \
  -f clip.16k.wav -of words/clip
```

- `-ml 1` gives word-level segments (a whisper.cpp technique). `-ojf` keeps per-token times and probabilities. Low
  probabilities flag words to check by hand.
- `--prompt` with the glossary fixes names. Use `-l zh` for Chinese takes. Steering whisper toward Simplified Chinese
  with a Chinese prompt is common practice (unverified).
- ffmpeg-full also has a `whisper` audio filter (`format=srt|json`, VAD options). That is handy for a one-liner, but
  whisper-cli exposes more options.
- Retake detection: neighbouring segments whose text is 80%+ similar (difflib ratio) are grouped as takes of one line.
  The default keeps the **last** take (presenters usually nail it last), and the user can override.

### 4.4 Text-based rough cut ("paper edit")

- A local page (Python `http.server`, in the same pattern as video-kit's frame server) shows the transcript line by
  line next to the proxy.
- Clicking a word plays from that time. Every line has a keep/drop checkbox, and each take group has radio buttons.
- Saving writes `edl.json`. A plain-text fallback is `paper.md`, with `[x]` or `[ ]` per line, parsed into the same
  EDL.

EDL schema (one segment per kept span; times in source seconds):

```json
{"fps": 30, "out": {"w": 1080, "h": 1920},
 "segments": [
  {"src": "A001.mov", "in": 12.48, "out": 15.92, "zoom": 1.00, "cx": 0.5, "cy": 0.40},
  {"src": "A001.mov", "in": 19.10, "out": 21.30, "zoom": 1.18, "cx": 0.5, "cy": 0.38},
  {"src": "B004.mov", "in": 3.20,  "out": 6.00,  "zoom": 1.00, "push": 0.10, "grade": {"exposure": 0.15, "temp": 6200}}
 ]}
```

Cut-point rules applied automatically:
- Snap `in` and `out` to word boundaries.
- Pad 80 ms before the first word and 120 ms after the last; tune by ear.
- Never cut inside a word.
- Add a 12 ms audio fade at every cut to remove clicks.

### 4.5 Assembly, jump cuts and punch-ins (tested)

The script below was run on this Mac. It turns the EDL into one filtergraph: input-side `-ss/-t` per segment, a static
punch-in (`zoom`) or a smooth push-in (`push`), a crop centered on `cx/cy`, a 12 ms fade per cut and concat. Three
segments from a 4K vertical test source produced a correct 4.8 s 1080x1920 file in 17 s. That is about 3.5x slower
than real time, dominated by lanczos rescaling of 4K and the x264 encode. Add VideoToolbox decode and a preview mode
(540x960, `-preset veryfast`) for review loops.

```python
FADE = 0.012  # s, de-click at every cut

def video_chain(seg, k, w, h):
    z, cx, cy = seg.get("zoom", 1.0), seg.get("cx", 0.5), seg.get("cy", 0.5)
    dur = seg["out"] - seg["in"]
    head = f"[{k}:v]setpts=PTS-STARTPTS"            # input-side -ss/-t already cut the segment
    if seg.get("push"):                              # smooth push-in: per-frame scale, fixed crop
        p = seg["push"]
        fit = f"scale=w='trunc({w}*{z}*(1+{p}*t/{dur:.3f})/2)*2':h=-2:eval=frame:flags=lanczos"
    else:                                            # cut-to-zoom: one static scale
        fit = f"scale=w={int(w * z) // 2 * 2}:h=-2:flags=lanczos"
    crop = f"crop={w}:{h}:'(iw-{w})*{cx}':'(ih-{h})*{cy}'"
    return f"{head},{fit},{crop},setsar=1,fps=30,format=yuv420p[v{k}]", None

def audio_chain(seg, k):
    dur = seg["out"] - seg["in"]
    return (f"[{k}:a]asetpts=PTS-STARTPTS,"
            f"afade=t=in:d={FADE},afade=t=out:st={dur - FADE:.3f}:d={FADE}[a{k}]"), None
# build(): for each segment add ["-ss", in, "-t", out-in, "-i", src] and both chains, then
# "[v0][a0][v1][a1]...concat=n=N:v=1:a=1[v][a]". Full script: scratchpad/vlogtest/assemble.py
```

Notes:
- **Jump-cut grammar.** Alternate 1.00 and 1.12-1.25 on consecutive A-roll cuts, and go to 1.4-1.6 for a punchline
  (4K gives a lossless 2.0x maximum). `cx/cy` come from a face box: set by hand per clip in the paper-edit page, or
  from Apple Vision face detection in a small helper (not built).
- **Push-ins** use per-frame `scale ... eval=frame` followed by a fixed `crop`. `zoompan` also works (tested), but it
  rounds the crop window to whole pixels, and that is the usual source of jitter in ffmpeg zooms.
- **Freeze frames:** `tpad=stop_mode=clone:stop_duration=1.5` on a segment holds its last frame (for the
  character-intro cards in 4.7).
- **Long graphs:** in ffmpeg 8, pass them with `-/filter_complex graph.txt`. The old `-filter_complex_script` is
  deprecated (verified in `ffmpeg -h full`).
- **Review artifacts after every assemble:** a contact sheet (one frame per segment) and a 540x960 preview. The user
  judges cuts from these, as with the films.
- **Hand-finishing handoff (optional):** emit an FCPXML or CMX3600 EDL from `edl.json`, so a cut can be opened in
  DaVinci Resolve or Final Cut for frame-level trims. 剪映's draft format is undocumented (unverified third-party
  libraries exist), so do not round-trip through it.

### 4.6 Color normalization

1. On set: HDR off, Auto FPS off, Lock Camera on, white balance locked per scene, AE locked. This removes most of the
   need for grading.
2. One **show LUT** (`lut3d=file=show.cube`) for the series look: a gentle filmic contrast, slightly warm. Make it once
   by hand in Resolve from three reference stills, then apply it to every clip.
3. Per-clip nudges in the EDL `grade` field, rendered with `exposure=exposure=0.15`, `colortemperature=temperature=6200`,
   `vibrance` (all present in ffmpeg-full, verified).
4. Automatic outlier report: `signalstats` (mean Y, U, V per clip) flags clips more than about 8% off the median, for a
   human to look at. Do not auto-correct; automatic color matching is the kind of thing that looks "AI-ish" when wrong.
5. Encode tags: always `-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv`, like `encode.py`.

### 4.7 Code-rendered overlays with alpha

Render path (works with the existing video-kit, no new renderer):
1. Each episode gets `overlays/fx.html`, a pv scene in the house style, reading `cues.json`. `cues.json` is generated
   from the EDL plus word timestamps, so an SFX lands on the exact word ("smite" at 41.27 s).
2. The scene clears to transparent: three.js `alpha: true` and `setClearColor(0x000000, 0)`, and no full-frame
   grade or grain pass that writes alpha = 1. q5.js uses `clear()` instead of `background()`.
3. Render only the frame ranges where overlays are active:
   `python3 render.py ../films/<ep>/fx.html --out ../out/<ep>_fx --fmt png --store png --range A:B --width 1080 --height 1920`.
   `--fmt png` keeps the browser's PNG, alpha included. `--store segments` and `--fmt rgba` would flatten it (verified
   in `pvlib.py`).
4. Encode for compositing (tested): `ffmpeg -framerate 30 -i f_%05d.png -c:v prores_ks -profile:v 4444 -pix_fmt
   yuva444p10le -vendor apl0 fx.mov`. For sparse overlays the PNG sequence itself is smaller (60 frames: 720 KB of PNG
   versus 3.5 MB of ProRes 4444) and ffmpeg can overlay it directly.
5. Composite in RGB with explicit BT.709 conversions (tested):
   ```
   [0:v]scale=in_color_matrix=bt709:in_range=tv,format=gbrp[b];[1:v]format=gbrap[o];
   [b][o]overlay=0:0:format=gbrp,ass=subs.ass,
   scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p[v]
   ```
   The default `overlay=format=auto` was off by about 2/255 in red on a test patch. The RGB path matched the
   expected straight-alpha blend to within chroma subsampling. Small, but it costs nothing to be exact.

Overlay vocabulary for the side line. Each item is data-driven and rendered once per language (EN for X, ZH for
Douyin; the text comes from `cues.json`, the same layout code):

| Overlay | Data | Look and craft notes |
| --- | --- | --- |
| **Comic SFX lettering** ("SPLASH!", "FREEZE", "BONK", 啪) | cue word and time | p5.brush hand lettering plus a **painted burst texture** (Codex, green screen, keyed with `tools/key.py`). Never flat vector bursts; 2-3 frames of smear-in, 1 frame of overshoot |
| **Stamps** ("ILLEGAL: CVC 21235", "ROLE: MID", "REJECTED: Reviewer 2") | text, angle, time | real rubber-stamp ink scan as a mask (the launch film already uses real ink and stamp assets) |
| **Animated route map** | `route.geojson` from clip GPS tags or a GPX logger | real geometry: an OpenStreetMap extract (Geofabrik, rendered locally; credit "© OpenStreetMap contributors"; do not scrape the public tile servers, which forbid bulk downloads (unverified)), drawn on paper texture in three.js, route as an ink line that draws on, pins with times |
| **Running budget counter** ("$5.00 left") | `ledger.csv` (time, item, amount). Times can come from receipt-photo EXIF `DateTimeOriginal` | reuse the rolling odometer in `scene/type.js`; red flash and a reversed "ka-ching" on each spend; never shows a value that is not on a real receipt |
| **Stat cards** (clear time, speed, fare) | measured numbers only | Inter + JetBrains Mono, leader line to the thing measured (`type.js` already has 3D-anchored leader lines) |
| **Freeze-frame character intro** | freeze time, name, title, gag line | freeze via `tpad`; person cut out from the still (Apple Vision foreground mask or rembg; the matte cleaned by hand if needed); three.js paper card with halftone, the painted background behind the cut-out, a name plate ("LADY ZHEN / Mid Mage / Jungle experience: 0") |
| **Lecture slides** | slide JSON | the main-line slide system, so the side line visibly belongs to the same "course" |
| **Telestrator** on gameplay freezes | arrows, circles | ink stroke with pressure (p5.brush), not vector arrows |

### 4.8 Bilingual subtitles (ASS, house style)

- EN: from whisper words, re-segmented into sentence-level lines. At most about 38 characters per line, 2 lines,
  1.0-6.0 s per line.
- ZH: translated from the EN lines by an LLM with the episode glossary, then corrected by the user, who is a native
  speaker.
- Chinese rules, consistent with the sibling report:
  - at most 16 characters per line;
  - no commas or full stops at line ends (use a space);
  - full-width ？！;
  - about 9 characters per second or slower.
- Re-segment Chinese by meaning. Do not inherit English line breaks.
- Burn in on both platforms: autoplay is muted, and burned-in text is the house style.
  - X also takes a sidecar `.srt`, but only through the **web** uploader (verified, X Help Center "upload caption
    (.srt) file"). Upload one too, for accessibility.
- **Avoid the word-by-word bouncing caption** (the CapCut default trend). It reads as generic and "AI-ish". Use quiet
  sentence subtitles, and save visual energy for designed punchline lettering rendered as overlays.
- Fonts:
  - EN: Inter (OFL, already in the house kit).
  - ZH: **Source Han Sans SC / Noto Sans CJK SC** (OFL, free to ship). PingFang SC rendered correctly in the test via
    fontconfig, but whether Apple's system-font license allows distribution in published video is unverified.
  - The house fonts in `video-kit/pipeline/fonts` are woff2 for the browser. libass needs TTF/OTF copies of Inter.
  - 方正 and 汉仪 fonts need paid licenses. Never use them.
- Pass the font directory explicitly: `ass=subs.zh.ass:fontsdir=fonts/` with TTF/OTF files.

Style block (1080x1920; positions follow the caption zone y 1200-1440, x 120-880). It was tested with `PingFang SC`
and `Inter` through the `ass` filter. Neither Inter nor Source Han Sans is installed on this Mac, so the English line
silently fell back to a system sans. Ship TTF/OTF files in a `fonts/` folder, pass `fontsdir=`, and check that the
fallback warning disappears:

```
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ZH,Source Han Sans SC,64,&H00FFFFFF,&H00FFFFFF,&H00141414,&H64000000,1,0,0,0,100,100,0,0,1,5,0,2,120,200,540,1
Style: EN,Inter,40,&H00E6E6E6,&H00FFFFFF,&H00141414,&H64000000,0,0,0,0,100,100,0,0,1,4,0,2,120,200,490,1
Style: ENX,Inter,52,&H00FFFFFF,&H00FFFFFF,&H00141414,&H64000000,1,0,0,0,100,100,0,0,1,5,0,2,120,200,500,1
```

- The Douyin version uses ZH (big) over EN (small). The X version uses ENX alone.
- One accent color (the films' accent) marks emphasis words with an `{\c&H..&}` override. Use it at most once per
  line.

### 4.9 Audio: voice chain, ducking, loudness (tested syntax)

Voice:
```
highpass=f=80, afftdn=nf=-25 (or arnndn with an RNNoise model), deesser,
acompressor=threshold=-18dB:ratio=3:attack=5:release=120
```

Ducking, two options (both tested):
- **Preferred: transcript-driven.** Speech intervals are already known from the EDL and word times. Build a music gain
  envelope, about -12 dB under speech with 150 ms ramps. Example:
  `volume='if(between(t,0,2)+between(t,4,6),0.25,1)':eval=frame`. Generate the ramps as a smooth envelope (or with
  `afade` per interval) so they are not hard switches. It is predictable and editable, and never "pumps".
- **Alternative: sidechain.** `[music][voice]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350`, quick
  but less controllable.

Loudness, two-pass `loudnorm` to I=-14, TP=-1.5, LRA=11. Pass 1 measures; pass 2 uses `measured_*` and `linear=true`.
The test mix came out at -14.1 LUFS as measured by `ebur128`. These targets are the industry habit for social video,
and the sibling `platforms.md` uses the same ones. Neither X nor Douyin publishes a loudness spec (unverified).

Stems: keep `voice.wav`, `music.wav`, `sfx.wav` and `mix.wav` per version. The Douyin no-music version is just
voice + SFX.

### 4.10 Deliverables

| | X (EN) | Douyin (ZH) |
| --- | --- | --- |
| Raster | 1080x1920, 30 fps CFR | 1080x1920, 30 fps CFR |
| Codec | H.264 High, yuv420p, no open GOP, BT.709 tags, `+faststart`; AAC LC 48 kHz, 192 kbps | H.264 (HEVC accepted per secondary guides), same audio |
| Bitrate | at least 5 Mbps (X minimum); target 8-12 Mbps | about 10-16 Mbps upload (it is recompressed anyway; secondary) |
| Length | at most 2:20 unless Premium is confirmed | 1:30-2:30 |
| Subtitles | ENX burned in + `.srt` via the web uploader | ZH + EN burned in |
| Music | licensed-for-X track or original | in-app at publish, or the original track |
| Labels | | AI-content declaration if any painted art |
| Cover | 1080x1920 cover and frame 0 designed as a usable thumbnail | 1080x1920 plus a 1080x1440 (3:4) cover |

---

## 5. CapCut/剪映 vs code vs hybrid

| Concern | CapCut / 剪映 by hand | Our code pipeline |
| --- | --- | --- |
| Speed for a first cut | Fast: auto captions, and 剪映 has transcript-based cutting for talking-head material (feature names unverified) | Slower to set up, then fast: re-cutting means editing a JSON |
| Look | Templates, stickers and caption trends are shared by millions of accounts: "generic and AI-ish", the thing the user rejects | Our own type, painted assets and three.js; consistent with the main line and the films |
| Two languages | Duplicate the project and retype or retime | One EDL, two subtitle files, overlays rendered per language |
| Precision (cue an SFX on a word, counters, maps) | Manual keyframes | Data-driven from word times, ledger and GPS |
| Music rights | Commercial Sounds only for CapCut, TikTok and TikTok for Business (verified); not X | Music is whatever we license; separate stems |
| Reproducibility and versions | Project files are opaque; versioning is hard | Plain files in git; every cut can be rebuilt |
| Comedic timing feel | Excellent: scrub, nudge by frames, feel it | Weaker: numbers in a file, preview renders |
| Availability | CapCut is available in the US; it is covered by the TikTok USDS joint venture since 2026-01-22 (secondary). 剪映专业版 runs on Mac | ffmpeg-full and whisper-cli are already installed |

**Recommended hybrid.**

Automated (code):
- ingest, tone-map and CFR;
- transcription and the paper-edit page;
- assembly with jump cuts and punch-ins;
- grade (show LUT plus per-clip nudges);
- every overlay;
- EN and ZH subtitles;
- voice cleanup, ducking, loudness;
- both deliverables;
- contact sheets and previews for review;
- a safe-zone check frame (the template drawn over the frame at five timestamps).

By hand (user):
- premise and jokes;
- shooting;
- ticking keep/drop and choosing takes in the paper edit;
- comedic timing passes on the preview (nudging numbers in the paper-edit page, or trimming in Resolve via the FCPXML
  handoff);
- music choice;
- correcting the Chinese subtitles;
- the final watch-down at phone size;
- Douyin publishing steps (music, AI label, cover, 合集).

CapCut/剪映 is allowed only as an optional, disposable finishing pass for the Douyin version. For example, adding
Douyin music in 剪映 just before publishing, since that path is licensed for Douyin. No edit decision lives only in a
CapCut project.

---

## 6. Pilot shot lists

All three pilots share:
- **cold open in 3 s** (a picture gag before any title);
- **lecture framing**;
- **a straight-faced presenter**;
- graphics as the second comic voice;
- **one sincere beat**;
- a callback to the launch film's footnote joke.

Durations below are the Douyin cut; the X cut drops the beats marked (X-cut).

### 6.1 Pilot A: "甄姬打野教学：从入门到被举报" / "Lady Zhen Jungle Masterclass (Lecture 1 of 1)"

**Premise.** Zhen Ji (global: Lady Zhen) is a mid-lane mage (HoKStats lists her as a Mid Mage; verified). The
presenter delivers a rigorous university lecture on jungling with her, with learning objectives, a theory section,
measured data, a demo, results and limitations, and never once concedes that she is not a jungler. The slides
gradually lose patience: role stamps, footnotes, Reviewer 2.

**Who and where.**
- Presenter: a lab member, in a lecture-hall setting. The hall can be the code-rendered main-line lecture hall
  composited behind a real presenter shot on a plain wall, which avoids the classroom-filming question.
- Gameplay: custom-room matches with lab members on both teams.
- Clear times: measured in the training or custom mode.

| # | Beat | Time | Dur | Picture | Graphics / sound |
| --- | --- | --- | --- | --- | --- |
| 1 | Cold open | 0:00-0:07 | 7 s | 2x close-up, dead serious: "今天我们讲甄姬打野。" | "ROLE: MID" stamp slams onto the hero card; the presenter peels it off and sticks a hand-written "JUNGLE" sticky note over it (real prop, insert shot) |
| 2 | Title + syllabus | 0:07-0:17 | 10 s | wide lecture shot | Slide: learning objectives 1) take Smite 2) clear a camp 3) "do not get reported". Footnote: "*Reporting not included." (callback) |
| 3 | MOBA 101 (X-cut keeps it, shorter) | 0:17-0:32 | 15 s | slide + gameplay inserts | what a jungler does, what a mage does, why mages go mid: real teaching, 15 s, for the X audience that does not know HoK |
| 4 | Theory: clear-time model | 0:32-0:50 | 18 s | presenter at a whiteboard; 4x reaction cutaway | q5.js formula T_clear = HP_camp / DPS on a chalk texture; **measured** bar chart: Zhen Ji vs a real jungler on the same camp (mean of 3+ runs each, real numbers only) |
| 5 | Demo: first camp | 0:50-1:10 | 20 s | layout 2 (stack) then layout 3 (freeze) | Telestrator arrows; SFX lettering on skill hits; freeze-frame intro card "LADY ZHEN / Mid Mage / Jungle experience: 0"; any passive "freeze" gag only if the passive is confirmed to work on monsters in game (unverified) |
| 6 | Escalation | 1:10-1:25 | 15 s | gameplay; face-cam reaction | Enemy (a lab member) steals the buff: "Reviewer 2: Reject" card; teammates' pings with real chat, IDs blurred |
| 7 | Results + limitations | 1:25-1:40 | 15 s | real post-match screen redrawn as a paper results table (numbers copied exactly) | "Limitations: 1. 甄姬不是打野。" The presenter reads it without reacting |
| 8 | Outro | 1:40-1:50 | 10 s | lecture wide | "Homework: don't." "Next: Lecture 2 of 0: Lady Zhen as a tank." The sticky note falls off and reveals MID; end card |

Total 1:50. X cut: shorten beat 3 to 8 s and beat 6 to 10 s, giving about 1:38.

**Must-get shots:**
- Lecture A-roll, every line as 2-3 takes at 1x; a second angle at 4x for reactions.
- Inserts: the sticky note (macro), hands on the phone (2x), the laser pointer, the whiteboard formula being written
  (real marker, real board).
- Face + hands while playing (iPhone B), synced with the gameplay recording (iPhone A).
- Training-mode clear runs: Zhen Ji x3 and a real jungler x3, screen-recorded with the in-game timer visible.
- 3-5 custom matches, to have real outcomes to choose from. Do not fake outcomes.
- "Students" reaction shots from 2-3 lab members, with releases signed.

**Graphics:** slide system, stamps, chalk formula, measured bar chart, freeze-frame intro card, telestrator, minimap
picture-in-picture, Reviewer 2 card, redrawn results table, end card.

**Risks and mitigations:**
- Tencent copyright (3.5): gameplay at most about 40%, always annotated; ask HOK Studio first.
- Global vs CN names: decide which client is shown and match every on-screen name.
- Griefing strangers: custom rooms only.
- The joke depends on HoK literacy: beat 3 explains it in 15 s.
- Douyin is the core audience: a Chinese-speaking presenter may be funnier here. The English version then uses EN
  subtitles (open question).

### 6.2 Pilot B: "滑板车骑行教学（博士版）" / "How to Ride a Scooter: Flight School Edition"

**Premise.** A 15 mph rental scooter treated with the gravity of flight school: pre-flight checklist, "takeoff",
"advanced maneuvers", flight instruments. Every "advanced maneuver" is illegal or banned, and a LEGAL REVIEW stamp
cites the real rule. The knowledge payload is real and verified (3.1-3.3). The production value (影视飓风) is the joke.
The ending: the most advanced technique is walking.

**Who and where.** One rider (18+, licensed, helmeted) on UCSD campus roads and micromobility paths at low-traffic
hours. A Spin rental ($1 + $0.30/min), or a registered personal e-scooter. A second person operates the tripod.

| # | Beat | Time | Dur | Picture | Graphics / sound |
| --- | --- | --- | --- | --- | --- |
| 1 | Cold open | 0:00-0:06 | 6 s | 4K120 slow-motion wheel at ground level, low sun | Jet-engine spool-up sound design, then a tiny scooter beep |
| 2 | Reveal | 0:06-0:12 | 6 s | 0.5x wide: it is a $1-unlock rental | Cost ticker starts: "$1.00 + $0.30/min" (UCSD rate, verified) |
| 3 | Pre-flight checklist | 0:12-0:30 | 18 s | macro inserts: license (number blurred), helmet buckle, brake squeeze | Checklist card ticks. Product-reveal of the $10 UCSD MIPS helmet (何同学 style). Footnote: "Helmet legally required under 18. Worn here anyway." |
| 4 | Takeoff | 0:30-0:42 | 12 s | tripod 4x pass-by; chest-mount POV (Action mode) | Real tips: kick-start, stance, look ahead. Flight-HUD overlay (speed from a GPS log) |
| 5 | Maneuver 1: "sidewalk shortcut" | 0:42-0:52 | 10 s | rider rolls toward the curb, **stops**; freeze | Stamp: "ILLEGAL: CVC 21235. No sidewalks." |
| 6 | Maneuver 2: "tandem" | 0:52-1:00 | 8 s | a second person steps onto the parked, switched-off scooter; freeze | Stamp: "ILLEGAL: no passengers" |
| 7 | Maneuver 3: "filming while riding" | 1:00-1:12 | 12 s | the rider raises a phone while parked; freeze; cut to reveal the chest mount | Stamp: "BANNED on campus: handheld devices (UCSD PPM 270-11)". "This is how this shot was filmed." |
| 8 | Speed | 1:12-1:24 | 12 s | POV plus pass-by | HUD caps at 15 ("CVC 22411"); shared paths: "8 mph (UCSD Police)". Speeds shown are the real logged speeds |
| 9 | Landing | 1:24-1:36 | 12 s | park in a designated Spin spot; top-down 0.5x | Animated map of the route ending on the parking pin; final cost ticker (real) |
| 10 | Outro | 1:36-1:45 | 9 s | rider arrives at Library Walk, dismounts, walks with dignity; slow motion | "Advanced technique #5: walking." End card |

Total 1:45, so the X cut equals the Douyin cut.

**Must-get shots:**
- Wheel slow motion (4K120).
- 4x pass-bys, at least 3 locations and 2 directions.
- POV (Action mode, chest), 3 runs.
- Macro inserts: helmet, brake, license (blurred in post).
- Spin app unlock (screen recording, personal data blurred).
- Parking spot top-down.
- Library Walk dismount.
- Room tone and wind tone.
- VO recorded afterwards in a quiet room (the riding audio is unusable).

**Graphics:** flight HUD (speed, battery, heading), legal stamps with real section numbers (text checked against
statute), checklist card, cost ticker, route map, end card.

**Risks and mitigations:**
- Injury: a rider with experience, daylight, low traffic, a helmet; no tricks.
- Showing violations: every one is staged stationary and captioned "staged, not ridden".
- UCSD rules: e-scooter registration for a personal scooter; no handheld phone; Library Walk.
- Spin terms: 18+ and a license (secondary).
- Bystanders: incidental only, blur anyone singled out.
- Wind noise: VO.
- The joke reads as a safety PSA: lean into it. It is the 科普 payload.

### 6.3 Pilot C: "5美元在圣地亚哥活24小时（实验报告）" / "Field Study: 24 Hours in San Diego on $5"

**Premise.** A mock scientific study, with hypothesis, methods, results and limitations, of whether a PhD student
can get through a full day in San Diego on $5. The comedy comes from rigor (a ledger, a knapsack solver, peer review)
meeting a city where the bus alone eats most of the budget.

Facts the story is built on (verified as of 2026-10-04):
- MTS fares rose on 2026-10-01. Adult one-way is **$3.00**, with unlimited transfers for 2 hours on PRONTO (cash fares
  do not include transfers). The adult day pass is **$7.00**, and the PRONTO fare cap stops at the day-pass value.
  Riders 18 and under ride free.
- The $5 therefore buys exactly one 2-hour window. **Optimization gag:** make the whole round trip inside one 2-hour
  window, a scheduling problem, which is the lab's research language.
- UCSD students ride free with the Triton U-Pass (Fall 2026 valid 2026-09-15 to 12-31). The "loophole" is rejected by
  "peer review" on camera. Rule: no U-Pass.
- The Costco hot dog + soda combo is still **$1.50**. Reports in 2025-26 say it is now **members-only**, and Gold Star
  membership is **$65/yr** (secondary; confirm at the warehouse). Gag: "*Membership not included." (callback to the
  launch film's "*Compute not included.").
- Balboa Park Resident Free Tuesdays: rotating museums are free for San Diego city or county residents with photo ID
  showing their address (first Tuesday Fleet Science Center and Natural History Museum; second Tuesday Air & Space,
  Veterans Museum, Comic-Con Museum; third Tuesday Museum of Art and Japanese Friendship Garden; verified,
  balboapark.org). Use only if the shoot day is the matching Tuesday and the presenter qualifies.

**Rules card** (shown as a paper "Methods" section):
1. $5 cash (or $5 loaded on PRONTO), nothing else.
2. No U-Pass, no friends paying, no food pantry or charity food (3.8).
3. Tap water allowed; things already owned allowed (a water bottle, clothes).
4. Sleep at home.
5. Every spend has a receipt, on camera.

| # | Beat | Time | Dur | Picture | Graphics / sound |
| --- | --- | --- | --- | --- | --- |
| 1 | Cold open | 0:00-0:08 | 8 s | a $5 bill on a lab bench under a desk lamp, slow push (何同学); echoes the launch film's "a desk lamp" shot | "Hypothesis: H1. A PhD student can survive 24 h in San Diego on $5." Counter appears: $5.00 |
| 2 | Methods | 0:08-0:22 | 14 s | presenter reads the rules, deadpan | Paper "Methods" page with the 5 rules |
| 3 | 07:00 Transit | 0:22-0:45 | 23 s | PRONTO tap (exterior and platform; no rider faces); a 4x cutaway of the fare chart sign | Counter: $5.00 to $2.00 with a reversed ka-ching. U-Pass "loophole": "Reviewer 2: Reject." 2-hour transfer clock appears |
| 4 | Knapsack (X-cut: shorten to 10 s) | 0:45-1:05 | 20 s | presenter at the whiteboard | q5.js DP table: items with **real prices photographed that morning**; the solution path lights up. 科普 payload: the 0/1 knapsack in 20 s |
| 5 | Food hunt | 1:05-1:30 | 25 s | exterior store shots, receipts on a table (macro); Costco exterior | Each purchase hits the counter. Costco: "$1.50" then "*Membership not included ($65)" |
| 6 | Free San Diego (X-cut: drop to 12 s) | 1:30-1:52 | 22 s | City beach, campus outdoor art, Balboa if Tuesday; 0.5x wides and 4x details | Animated route map on paper, drawn from clip GPS tags; time-of-day dial |
| 7 | Temptation | 1:52-2:02 | 10 s | boba shop window, 4x through the glass, presenter's reflection | "*Milk tea not included." (callback to the launch film's last line) |
| 8 | Sincere beat | 2:02-2:15 | 13 s | sunset, presenter silent, then one honest line about the people for whom $5 a day is not a game | No graphics. Music drops out |
| 9 | Results | 2:15-2:30 | 15 s | receipts laid out top-down; final counter | Results table, final balance (real), "Limitations: n = 1; the author was hungry." End card |

Total 2:30. X cut: shorten beat 4 by 10 s, beat 6 by 10 s and beat 5 by 5 s, giving about 2:05.

**Must-get shots:**
- $5 bill macro.
- Rules A-roll.
- Every purchase: before, receipt, after.
- A fare sign or app screen showing $3.00.
- Transit: exterior or platform only.
- The whiteboard DP.
- 3+ free-place B-roll locations.
- The boba window.
- Sunset (SDR, exposure locked on the sky).
- Receipts top-down at the end.
- A time-lapse of the evening at home (18 Pro: 4K DV time-lapse, tone-mapped).
- GPS: Camera location access on, so clips carry location tags, plus a GPX logger app as backup.

**Graphics:** budget counter (odometer), Methods page, knapsack DP, route map, receipt scans (real), time-of-day
dial, results table, footnote callbacks.

**Risks and mitigations:**
- Poverty-tourism tone: rules 2 and 4, beat 8 and no jokes about unhoused people.
- Heat and dehydration: the water rule, shade, home before dark.
- Private property: ask before filming inside; film receipts outside.
- MTS filming rules unverified: keep it exterior and brief.
- State Parks permit: stay on City beaches.
- Faces of strangers: incidental only.
- Prices change: every number comes from that day's receipts and signs.
- Douyin context: show "$5 ≈ ¥__", using the exchange rate on the publish date (not stated here).

### 6.4 Suggested order

Produce **A first** (indoor, repeatable, no weather). It exercises the whole pipeline: screen-plus-face sync,
overlays, bilingual subtitles. Then **B** (it needs good light and campus timing), then **C** (the most logistics and
the most ethics care). The publishing order can differ. B carries the least IP risk and the most 科普 value.

### 6.5 Open questions for the user

1. Is @PicassoLabUCSD on X Premium? This decides 2:20 vs longer, and 1080p vs 720p playback.
2. Which iPhone models are available (two needed for Pilot A)?
3. Who presents, and in which language on camera, per pilot?
4. Which HoK client: 王者荣耀 (CN) or Honor of Kings (global)?
5. Music: buy a library license that names X in writing, or commission a house motif?
6. Should UCSD University Communications be asked once about how the lab account's filming is classified?

---

## Sources

iPhone:
- iPhone 18 Pro specs: https://www.apple.com/iphone-18-pro/specs/
- iPhone 18 Pro newsroom (2026-09): https://www.apple.com/newsroom/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/
- iPhone 17 Pro tech specs: https://support.apple.com/en-us/125090
- Video recording settings: https://support.apple.com/guide/iphone/change-video-recording-settings-iphc1827d32f/ios
- Audio Mix, Spatial Audio, wind noise: https://www.macrumors.com/how-to/iphone-16-edit-spatial-audio-in-video-audio-mix/
- Action mode lower light: https://www.macrumors.com/how-to/optimize-action-mode-iphone-14/
- Apple Log 2 LUTs (third-party): https://gamut.io/product/free-apple-conversion-luts-iphone/
- QuickTime iPhone screen capture: https://osxdaily.com/2016/02/15/howto-record-iphone-screen-mac-quicktime/

Audio:
- DJI Mic 3: https://www.dji.com/mic-3/specs and https://www.newsshooter.com/2025/08/28/dji-mic-3/

HDR on platforms:
- Douyin x Dolby Vision (2026-01-05): https://www.ithome.com/0/910/502.htm
- HDR washed out (forum): https://forums.macrumors.com/threads/uploading-hdr-videos-to-facebook-instagram-washes-the-picture-out.2263312/
- X 4K uploads for Premium (2025-05): https://www.socialmediatoday.com/news/x-formerly-twitter-enables-4k-video-uploads/748314/

X:
- Media best practices: https://docs.x.com/x-api/media/quickstart/best-practices
- SRT captions: https://help.x.com/en/using-x/upload-caption-srt-file
- Premium longer videos: https://help.x.com/en/using-x/premium-longer-videos (403 to fetch; content from search summary)
- Report that free users can upload longer videos (2025-04): https://routenote.com/blog/x-increases-video-length/

Scooter law and rules:
- CVC 21235: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=VEH&sectionNum=21235
- CVC 22411: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=VEH&sectionNum=22411
- CVC 21221: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=VEH&sectionNum=21221
- San Diego micromobility: https://www.sandiego.gov/transportation/programs/micromobility
- Boardwalk ban (2020-03-02): https://www.govtech.com/transportation/san-diego-boardwalks-new-scooter-ban-goes-into-effect.html
- Bird leaves (2023-11-17): https://www.govtech.com/fs/was-san-diego-right-to-clamp-down-on-e-scooters
- Bird leaves (NBC San Diego): https://www.nbcsandiego.com/news/local/bird-last-operator-of-e-scooter-fleet-in-san-diego-flies-the-coop-but-return-flight-is-possible/3350166/
- UCSD shared scooters: https://transportation.ucsd.edu/campus/shared.html
- UCSD PPM 270-11: https://secure4.compliancebridge.com/ucsd/public/getdoc.php?file=270-11
- UCSD Police guidelines: https://police.ucsd.edu/resources/bike-skate.html
- UCSD e-scooter registration: https://transportation.ucsd.edu/micromobility/register.html
- 2026 e-bike laws (secondary): https://catsip.berkeley.edu/news/new-california-active-transportation-laws-2025
- Spin terms (secondary): https://www.shouselaw.com/ca/blog/laws/8-important-e-scooter-laws-you-should-in-california/

Filming and privacy:
- Penal Code 632: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=632
- Civil Code 3344: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=3344
- UCSD commercial filming: https://univcomms.ucsd.edu/photo-video/filming/index.html
- City of San Diego filming registration: https://www.sandiego.gov/specialevents-filming/filming/registration
- Casual-filming exemption (secondary): https://giggster.com/guide/filming/san-diego
- California State Parks filming: https://www.parks.ca.gov/?page_id=30305

Honor of Kings:
- Lady Zhen role and skills: https://hokstats.gg/heroes/lady-zhen/
- Guangzhou Internet Court case: https://www.jiemian.com/article/4021141.html
- Douyin livestream damages (secondary): https://m.21jingji.com/article/20210514/herald/ded1cc95362b5e9b1b72b982ce9eced0_zaker.html
- HOK Studio (secondary): https://respawn.outlookindia.com/gaming/gaming-news/honor-of-kings-india-push-adds-creators-and-esports

Music:
- CapCut Materials License Agreement (2026-01-22): https://www.capcut.com/clause/material-license-agreement
- Douyin music scope (secondary): https://www.chtmusic.com/h-nd-47.html and https://blog.csdn.net/jianjixia/article/details/151999412
- Epidemic Sound (secondary): https://support.epidemicsound.com/s/article/what-is-the-personal-plan
- Artlist (secondary): https://artlist.io/blog/artlist-personal-plan/
- CapCut US status (secondary): https://en.wikipedia.org/wiki/TikTok_USDS

AI labeling:
- CAC rules: https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm
- Douyin's measures (Xinhua 2025-09-09): http://www.news.cn/tech/20250909/fb164c6d092146aa8e13ddc283fe416a/c.html

$5 pilot facts:
- Unsafe Camping Ordinance: https://timesofsandiego.com/politics/2023/07/28/controversial-unsafe-camping-ordinance-banning-homeless-in-tents-to-take-effect-sunday/ and https://abc7.com/post/san-diego-homeless-unsafe-camping-ordinance-tent-encampments/13444964/
- MTS fare chart: https://www.sdmts.com/fares/fare-chart
- MTS fare rise (2026-09-30): https://timesofsandiego.com/transportation/2026/09/30/mts-nctd-fares-rise-oct-1/
- Triton U-Pass: https://u-pass.ucsd.edu/
- Costco hot dog price: https://en.wikipedia.org/wiki/Costco_hot_dog
- Costco members-only report (secondary): https://finance.yahoo.com/news/costco-1-50-hot-dog-130538853.html
- Costco membership price (secondary): https://www.sfgate.com/shopping/article/costco-gold-star-membership-deal-21290463.php
- Balboa Park free days: https://balboapark.org/resident-free-days/
- Triton Food Pantry: https://basicneeds.ucsd.edu/triton-food-pantry/index.html

Tools:
- whisper.cpp models: https://huggingface.co/ggerganov/whisper.cpp and https://huggingface.co/ggml-org/whisper-vad (sizes
  checked by HTTP HEAD).
- Local: `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -buildconf`, `whisper-cli --help`, `origin/video-kit:video-kit/pipeline/{render.py,pvlib.py,encode.py}`.
- Test files: `scratchpad/vlogtest/`, including `assemble.py`, `subs.ass`, the tone-map and overlay outputs.

Sibling report used for consistency (safe zones, loudness, X tiers): `scratchpad/research/platforms.md`.
