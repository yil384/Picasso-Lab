// Background music for the games page (events/guandan.html): the track list and window.GuandanMusic.
//
//   isOn() / setOn(bool)   on or off, stored in localStorage "picasso.guandan.music" ('on' | 'off')
//   tracks                 the tracks below (licences and sources: static/music/MUSIC-CREDITS.md)
//   choice() / choose(id)  "auto" or a track id, stored in "picasso.guandan.musicTrack"
//   current()              the track that plays (or would play while off): the chosen one, or with "auto" the
//                          track of the game on screen (Guandan: Bossa Antigua; Hold'em: Etirwer, solo guitar)
//   scene(name)            the page says which game is on screen: "guandan" | "holdem"
//   playing()              true while a track actually plays (false while off, while autoplay is blocked, while
//                          the tab is hidden, or when its file failed to load)
//   credits                the attribution blocks shown under the track list ({ source, lines })
// Every change fires "guandan:music" on document, detail { on, choice, track, scene, playing }.
//
// Only the playing track is fetched: the <audio> elements are preload="none" and get a src when their track
// starts; a track that has faded out is paused and loses its src (its position is kept for its return). A change
// crossfades over two elements once the new track can play; where scripts cannot set the volume (iOS) one element
// switches at once. While on, playback starts after the page's first render (so "auto" knows the game); if the
// browser blocks autoplay it starts on the first click, tap or key press. A hidden tab goes quiet (it picks up
// where it stopped when shown again), and a change made in another tab (on / off, the track) is followed here.
(function () {
    "use strict";
    var BASE = "https://yil384.github.io/Picasso-Lab/events/static/music/";
    var CC_BY_4 = "http://creativecommons.org/licenses/by/4.0/";
    var CHANGED = "Changes: each file trimmed, loudness-normalised and re-encoded to AAC.";
    // Kevin MacLeod's tracks share one credit block (CREDITS below)
    function macleod(isrc) {
        return {
            artist: { en: "Kevin MacLeod", zh: "Kevin MacLeod" },
            licence: "CC BY 4.0", group: "incompetech",
            source: "https://incompetech.com/music/royalty-free/index.html?isrc=" + isrc
        };
    }
    function track(id, fields, extra) {
        var t = { id: id, src: BASE + id + ".m4a", game: null, licence: "", source: "", group: "", credit: [] };
        [fields, extra || {}].forEach(function (o) { Object.keys(o).forEach(function (k) { t[k] = o[k]; }); });
        t.short = t.short || t.title;   // the tables' menu: "Music: <short>"
        return Object.freeze(t);
    }
    // `color` is the label of the track's record (the picker, the lobby rail); `game` marks Auto's track there.
    // Every file is the lab's own (the Guandan theme), public domain, CC0 or CC BY (static/music/MUSIC-CREDITS.md).
    var TRACKS = Object.freeze([
        track("guandan-theme", {
            title: { en: "Guandan Theme", zh: "掼蛋主题曲" },
            artist: { en: "Picasso Lab", zh: "Picasso Lab" },
            style: { en: "Upbeat and steady, the table's own music", zh: "轻快明亮，牌桌原声" },
            game: "guandan", color: "#e0546e"
        }),
        track("bossa-antigua", {
            title: { en: "Bossa Antigua", zh: "Bossa Antigua" },
            style: { en: "Bossa nova: guitar and light drums", zh: "波萨诺瓦：吉他与轻鼓" },
            color: "#d0603c"
        }, macleod("USUAN1700069")),
        track("etirwer", {
            title: { en: "Etirwer", zh: "Etirwer" },
            artist: { en: "Kistol", zh: "Kistol" },
            style: { en: "Solo nylon-string guitar", zh: "尼龙弦吉他独奏" },
            game: "holdem", color: "#e8963a", licence: "CC0",
            source: "https://opengameart.org/content/etirwer",
            credit: ["\"Etirwer\" by Kistol (opengameart.org)", "CC0 1.0"]
        }),
        track("backbay-lounge", {
            title: { en: "Backbay Lounge", zh: "Backbay Lounge" },
            style: { en: "Lounge jazz led by piano", zh: "酒廊爵士，钢琴领奏" },
            color: "#5b74d8"
        }, macleod("USUAN1700068")),
        track("cool-vibes", {
            title: { en: "Cool Vibes", zh: "Cool Vibes" },
            style: { en: "Slow jazz trio with vibraphone", zh: "慢爵士，颤音琴三重奏" },
            color: "#2aa39b"
        }, macleod("USUAN1100863")),
        track("clear-air", {
            title: { en: "Clear Air", zh: "Clear Air" },
            style: { en: "Acoustic guitar duet, soft piano", zh: "木吉他二重奏，轻钢琴" },
            color: "#6db368"
        }, macleod("USUAN1100626")),
        track("bach-prelude-c", {
            title: { en: "Prelude in C major, BWV 846", zh: "C 大调前奏曲 BWV 846" },
            short: { en: "Prelude in C", zh: "C 大调前奏曲" },
            artist: { en: "J.S. Bach, played by Kimiko Ishizaka", zh: "巴赫，Kimiko Ishizaka 演奏" },
            style: { en: "Solo piano, flowing chords", zh: "钢琴独奏，流动的和弦" },
            color: "#d9b44a", licence: "CC BY 3.0",
            source: "https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach-_Well-Tempered_Clavier,_Book_1_-_01_Prelude_No._1_in_C_major,_BWV_846.flac",
            credit: ["J.S. Bach, Prelude No. 1 in C major, BWV 846. Performed by Kimiko Ishizaka, Open Well-Tempered Clavier (welltemperedclavier.org)",
                "Licensed under CC BY 3.0", "https://creativecommons.org/licenses/by/3.0/"]
        }),
        track("bach-goldberg-aria", {
            title: { en: "Goldberg Variations: Aria", zh: "哥德堡变奏曲：咏叹调" },
            short: { en: "Goldberg Aria", zh: "哥德堡咏叹调" },
            artist: { en: "J.S. Bach, played by Kimiko Ishizaka", zh: "巴赫，Kimiko Ishizaka 演奏" },
            style: { en: "Solo piano, slow and soft", zh: "钢琴独奏，缓慢轻柔" },
            color: "#9a6cc8", licence: "CC0",
            source: "https://commons.wikimedia.org/wiki/File:Goldberg_Variations_BWV_988_01_Aria.flac",
            credit: ["J.S. Bach, Goldberg Variations BWV 988: Aria. Kimiko Ishizaka, The Open Goldberg Variations (opengoldbergvariations.org)", "CC0 1.0"]
        })
    ]);
    // The credits under the track list, as each licence asks: Kevin MacLeod's tracks in one block in the words of
    // incompetech's credit generator, then each other track's line, then what was changed in the files.
    var CREDITS = Object.freeze((function () {
        var km = TRACKS.filter(function (t) { return t.group === "incompetech"; });
        var blocks = [];
        if (km.length) blocks.push({
            source: "https://incompetech.com/",
            lines: [km.map(function (t) { return "\"" + t.title.en + "\""; }).join(", ") + " Kevin MacLeod (incompetech.com)",
                "Licensed under Creative Commons: By Attribution 4.0", CC_BY_4]
        });
        TRACKS.forEach(function (t) { if (t.credit.length) blocks.push({ source: t.source, lines: t.credit }); });
        blocks.push({ source: "", lines: [CHANGED] });
        return blocks;
    })());
    var BY_ID = {};
    TRACKS.forEach(function (t) { BY_ID[t.id] = t; });
    var DEFAULTS = Object.freeze({ guandan: "guandan-theme", holdem: "etirwer" });
    var KEY_ON = "picasso.guandan.music", KEY_TRACK = "picasso.guandan.musicTrack", KEY_GAME = "picasso.games.game";
    // The files are levelled to -20 LUFS (MUSIC-CREDITS.md); at 0.8 they play near -22 LUFS, under the table's
    // sound effects. The page's earlier track was a -7 LUFS master played at 0.45 (about -14 LUFS).
    var VOLUME = 0.8, FADE_MS = 1200, QUICK_MS = 450, READY_WAIT_MS = 4000, CHOOSE_WAIT_MS = 180;

    function load(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
    function save(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }

    var on = load(KEY_ON) !== "off";
    var choice = BY_ID[load(KEY_TRACK)] ? load(KEY_TRACK) : "auto";
    // until the page says, the game is guessed the way the page picks it: a Hold'em invite link or the
    // remembered lobby game; any other room link is Guandan
    var query = location.search;
    var sceneName = /[?&]game=holdem/.test(query) ? "holdem" : /[?&]room=/.test(query) ? "guandan" : load(KEY_GAME) === "holdem" ? "holdem" : "guandan";
    var started = false;   // the page's first render is done: playback may begin
    var blocked = false;   // a play() was refused (autoplay policy): retried on the next gesture
    var lastDetail = "";

    // Scripts cannot set the volume on iOS (it always reads 1): no fades there, one element switches tracks.
    var canFade = (function () {
        try { var a = document.createElement("audio"); a.volume = 0.5; return Math.abs(a.volume - 0.5) < 0.01; } catch (_) { return false; }
    })();

    // voices: { el, id, level 0..1, target 0|1, ms (fade length), since }; at most two at a time
    var voices = [];
    var spare = [];
    var positions = {};
    var first = document.getElementById("guandan-bgm");
    function adopt(el) {
        el.preload = "none";
        el.loop = true;
        el.addEventListener("playing", changed);
        el.addEventListener("pause", changed);
        el.addEventListener("canplay", changed);
        el.addEventListener("error", changed);
        spare.push(el);
    }
    if (first) adopt(first);
    function element() {
        if (!spare.length) {
            var el = document.createElement("audio");
            el.style.display = "none";
            (first && first.parentNode || document.body).appendChild(el);
            adopt(el);
        }
        return spare.pop();
    }
    function gain(level) { return VOLUME * Math.sin(level * Math.PI / 2); }
    function setVolume(v) { if (canFade) try { v.el.volume = gain(v.level); } catch (_) {} }
    function ready(v) { return !v.el.paused && v.el.readyState >= 3; }
    function waiting(v) { return !v.el.paused && !v.el.error; }   // playing, or still loading to play

    function resolveId() { return choice === "auto" ? DEFAULTS[sceneName] : choice; }
    // a file that failed to load leaves its element unpaused: it does not count as playing
    function isPlaying() { return voices.some(function (v) { return v.target === 1 && !v.el.paused && !v.el.error; }); }

    function play(v) {
        var p;
        try { p = v.el.play(); } catch (err) { p = Promise.reject(err); }
        if (!p || !p.then) return;
        p.then(function () {
            blocked = false;
            changed();
        }, function (err) {
            if (!err || err.name !== "NotAllowedError" || voices.indexOf(v) < 0 || v.target !== 1) return;
            // a second element can be refused where the first one plays (browsers that unlock element by
            // element): the track moves onto the playing element at once
            var host = voices.filter(function (o) { return o !== v && !o.el.paused; })[0];
            if (host) {
                var old = v.el;
                stopVoice(host, true);
                if (old !== host.el) drop(old);
                v.level = 1;
                startOn(host.el, v);
                return;
            }
            blocked = true;
            notify();
        });
    }
    // give voice v the element el, its file and its last position, and play
    function startOn(el, v) {
        spare = spare.filter(function (s) { return s !== el; });
        v.el = el;
        v.since = performance.now();
        el.src = BY_ID[v.id].src;
        if (positions[v.id]) try { el.currentTime = positions[v.id]; } catch (_) {}
        setVolume(v);
        if (voices.indexOf(v) < 0) voices.push(v);
        play(v);
    }
    // pause and let go of the file, so nothing more of it downloads
    function drop(el) {
        try { el.pause(); } catch (_) {}
        if (el.getAttribute("src")) {
            el.removeAttribute("src");
            try { el.load(); } catch (_) {}
        }
        if (spare.indexOf(el) < 0) spare.push(el);
    }
    // a voice ends: its position is kept; keepElement leaves the element to the caller (paused, no src)
    function stopVoice(v, keepElement) {
        try { if (v.el.currentTime > 0) positions[v.id] = v.el.currentTime; } catch (_) {}
        voices = voices.filter(function (o) { return o !== v; });
        if (keepElement) {
            try { v.el.pause(); } catch (_) {}
            v.el.removeAttribute("src");
        } else {
            drop(v.el);
        }
    }

    // Steer every voice to where it should be: the resolved track up, every other one down.
    function apply(ms) {
        if (!started) return notify();
        var want = on && !document.hidden ? resolveId() : null;
        var have = null;
        voices.forEach(function (v) {
            v.target = v.id === want ? 1 : 0;
            v.ms = ms;
            if (v.target) have = v;
        });
        if (!canFade) {
            // one element, no fades: switch at once
            var cur = voices[0];
            if (!want) {
                if (cur) stopVoice(cur, false);
            } else if (have) {
                have.level = 1;
                if (have.el.paused) play(have);
            } else {
                var el = cur ? cur.el : element();
                if (cur) stopVoice(cur, true);
                startOn(el, { id: want, level: 1, target: 1, ms: 0 });
            }
            return notify();
        }
        if (want && !have) {
            // only two voices: a third change cuts the quietest one leaving
            while (voices.length >= 2) {
                stopVoice(voices.slice().sort(function (a, b) { return a.level - b.level; })[0], false);
            }
            startOn(element(), { id: want, level: 0, target: 1, ms: ms });
        } else if (have && have.el.paused) {
            play(have);
        }
        tick();
        notify();
    }

    // Fades: a track coming in rises once it can play; the one leaving holds until then (up to
    // READY_WAIT_MS), so a slow download is not a gap of silence. A paused voice leaving goes at once.
    var timer = 0, lastTick = 0;
    function tick() {
        var now = performance.now();
        var dt = lastTick ? now - lastTick : 0;
        lastTick = now;
        var incoming = voices.filter(function (v) { return v.target === 1; })[0];
        var hold = !!incoming && waiting(incoming) && !ready(incoming) && now - incoming.since < READY_WAIT_MS;
        var moving = false;
        voices.slice().forEach(function (v) {
            var step = v.ms ? dt / v.ms : 1;
            if (v.target === 1) {
                if (v.level < 1 && ready(v)) {
                    v.level = Math.min(1, v.level + step);
                    setVolume(v);
                }
                if (v.level < 1 && waiting(v)) moving = true;
            } else if (v.el.paused) {
                stopVoice(v, false);
            } else {
                if (!hold) {
                    v.level = Math.max(0, v.level - step);
                    setVolume(v);
                }
                if (v.level <= 0) stopVoice(v, false);
                else moving = true;
            }
        });
        if (moving && !timer) timer = setInterval(tick, 40);
        if (!moving) {
            if (timer) clearInterval(timer);
            timer = 0;
            lastTick = 0;
        }
    }

    function notify() {
        var d = { on: on, choice: choice, track: resolveId(), scene: sceneName, playing: isPlaying() };
        var key = JSON.stringify(d);
        if (key === lastDetail) return;
        lastDetail = key;
        document.dispatchEvent(new CustomEvent("guandan:music", { detail: d }));
    }
    function changed() {
        tick();
        notify();
    }

    // A pick waits a moment before its file loads: arrowing down the list starts only the track it stops on.
    var chooseTimer = 0;
    function applyNow(ms) {
        clearTimeout(chooseTimer);
        chooseTimer = 0;
        apply(ms);
    }
    function setOn(value) {
        on = !!value;
        save(KEY_ON, on ? "on" : "off");
        applyNow(QUICK_MS);
    }
    function choose(id) {
        choice = id === "auto" || BY_ID[id] ? id : "auto";
        save(KEY_TRACK, choice);
        clearTimeout(chooseTimer);
        chooseTimer = setTimeout(function () { applyNow(FADE_MS); }, CHOOSE_WAIT_MS);
        notify();
        return BY_ID[resolveId()];
    }
    function scene(name) {
        if ((name === "guandan" || name === "holdem") && name !== sceneName) {
            sceneName = name;
            applyNow(FADE_MS);
        }
        return sceneName;
    }

    window.GuandanMusic = {
        isOn: function () { return on; },
        setOn: setOn,
        tracks: TRACKS,
        defaults: DEFAULTS,
        track: function (id) { return BY_ID[id] || null; },
        choice: function () { return choice; },
        choose: choose,
        current: function () { return BY_ID[resolveId()]; },
        scene: scene,
        playing: isPlaying,
        credits: CREDITS
    };

    function start() {
        if (started) return;
        started = true;
        applyNow(QUICK_MS);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else setTimeout(start, 0);

    // Autoplay refused: the next click, tap or key starts it. It waits until the page has handled that gesture
    // (a timer of 0 still counts as inside it), so a click that changes the game or picks a track starts only the
    // track it leads to, and a click on Off starts nothing. The controls that open the music popup ([data-lobby]
    // music and settings, the tables' menu item) never start it: a visitor may be opening it to turn music off.
    var MUSIC_OPENERS = "[data-music-off], [data-lobby=\"music\"], [data-lobby=\"settings\"], [data-m=\"music\"], [data-act=\"m-music\"]";
    function onGesture(event) {
        if (!blocked || !on) return;
        var t = event.target;
        if (t && t.closest && t.closest(MUSIC_OPENERS)) return;
        setTimeout(function () {
            if (!blocked || !on || document.hidden) return;
            if (chooseTimer) applyNow(FADE_MS);   // a pick made by this gesture goes first
            voices.forEach(function (v) { if (v.target === 1 && v.el.paused) play(v); });
        }, 0);
    }
    ["click", "keydown", "touchend"].forEach(function (type) { document.addEventListener(type, onGesture, true); });

    // Another tab of the page changed on / off or the track: follow it, so two tabs never play two choices.
    window.addEventListener("storage", function (event) {
        if (event.key === KEY_ON && event.newValue) {
            on = event.newValue !== "off";
            applyNow(QUICK_MS);
        } else if (event.key === KEY_TRACK && event.newValue) {
            choice = BY_ID[event.newValue] ? event.newValue : "auto";
            applyNow(FADE_MS);
        }
    });
    // A hidden tab goes quiet; shown again, its track comes back where it stopped.
    document.addEventListener("visibilitychange", function () { applyNow(QUICK_MS); });
})();
