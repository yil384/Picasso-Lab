/* ============================================================
   Guandan 巅峰对决 records: shared data + board component.
   EDIT THE DATA BELOW (PLAYERS / MATCHES). Players also carry a
   `style` (擅长打法), a `quote` (座右铭) and a signature `card`.
   Exposes window.GuandanRecords:
     mount(host, { lang, splash, onClose }) -> { go(page, instant), next(), prev(), lang, destroy() }
         renders the paged board (最新战报 / 赛季 MVP / 排行榜 / 历史对阵) into `host` (a full-viewport
         layer); used by guandan.html's #gdr-cardmodal and events.html's "mvp" overlay (splash: true).
         The header's back arrow (.gdr-back) calls onClose. `page` is an index or one of PAGE_KEYS.
         Like the game table, the board is laid out in design px on a stage scaled to the viewport
         (landscape: s = min(W/844, H/390)); portrait phones get their own layout at s = 1.
     styleText(key, lang) -> the player's style tag in that language ("" when it has none there).
     stats() -> { matches, board, mvp }, PLAYERS, MATCHES, PAGE_KEYS

   SCORING (掼蛋升级制): teams climb 2→3→…→10→J→Q→K→A. Win by
   reaching A and passing it. Score = the level each team ended on
   (e.g. "A:K", "A:3"). Special: a team reaches A but fails to pass
   it 3× and drops back to 2 — that is NOT a clean shutout; mark it
   with a `note` (e.g. "8:2" / "J:2").
   teamA is 红方 (left), teamB is 蓝方 (right); the notes use that naming.
   Leaderboard rank = 评分 (赛量修正胜率, see buildStats).
   ============================================================ */
(function (global) {
    "use strict";

    var AV = "https://yil384.github.io/Picasso-Lab/people/static/"; // absolute → works embedded anywhere

    // -------- PLAYER ROSTER (style placeholders; quote = 座右铭/motto) --------
    var PLAYERS = {
        // --- full lab roster (16 members, A♠→J♣ order) ---
        yufei:    { name: "Yufei Ding",   avatar: AV + "yufei.webp",    card: "A♠", style: "", quote: "" },
        yue:      { name: "Yue Guan",     avatar: AV + "yue.webp",      card: "A♥", style: "", quote: "" },
        zhengding:{ name: "Zhengding Hu", avatar: AV + "zhengding.webp",card: "A♦", style: "记牌反击 · 后发制人", quote: "神了。" },
        chang:    { name: "Chang Chen",   avatar: AV + "chang.webp",    card: "A♣", style: "", quote: "" },
        hezi:     { name: "Hezi Zhang",   avatar: AV + "hezi.webp",     card: "K♠", style: "", quote: "" },
        keyi:     { name: "Keyi Yin",     avatar: AV + "keyi.webp",     card: "K♥", style: "", quote: "" },
        xiang:    { name: "Xiang Fang",   avatar: AV + "xiang.webp",    card: "K♦", style: "", quote: "" },
        jixuan:   { name: "Jixuan Ruan",  avatar: AV + "jixuan.webp",   card: "K♣", style: "", quote: "" },
        zaifeng:  { name: "Zaifeng Pan",  avatar: AV + "zaifeng.webp",  card: "Q♠", style: "灵活接风 · 见缝插针", quote: "17 张牌你能秒我？" },
        zhongkai: { name: "Zhongkai Yu",  avatar: AV + "zhongkai.webp", card: "Q♥", style: "稳健控场 · 逢人配大师", quote: "Let's see. / 思考是好事。" },
        zhuo:     { name: "Zhuo Chen",    avatar: AV + "zhuo.webp",     card: "Q♦", style: "炸弹强攻 · 火力全开", quote: "我将全职在家研究这副牌。" },
        yichen:   { name: "Yichen Lin",   avatar: AV + "yichen.webp",   card: "Q♣", style: "冲 A 猛将 · 大牌敢出", quote: "别急，还有反转。" },
        xinwei:   { name: "Xinwei Qiang", avatar: AV + "xinwei.webp",   card: "J♠", style: "", quote: "" },
        alon:     { name: "Alon Lahav",   avatar: AV + "alon.webp",     card: "J♥", style: "", quote: "" },
        chenyang: { name: "Chenyang Zhou",avatar: AV + "chenyang.webp", card: "J♦", style: "", quote: "" },
        haotian:  { name: "Haotian Ye",   avatar: AV + "haotian.webp",  card: "J♣", style: "雷霆万钧 · 大牌压制", quote: "" },
        // --- external opponents (match records only, no face cards) ---
        zihan:    { name: "Zihan Hao",    avatar: AV + "zihan.webp",    card: "", style: "新锐黑马 · 后劲十足", quote: "" },
        yilin:    { name: "Yilin Wang",   avatar: AV + "yilin.webp",    card: "", style: "团队核心 · 配合默契", quote: "" }
    };

    // -------- MATCH HISTORY (real records; teamA = 红方/left, score levelA:levelB) --------
    var MATCHES = [
        { date: "2026-06-06", teamA: ["zhongkai", "zhuo"], teamB: ["zaifeng", "yilin"],     levelA: "A", levelB: "K", winner: "A" },
        { date: "2026-06-05", teamA: ["zhongkai", "zhuo"], teamB: ["zaifeng", "zihan"],     levelA: "Q", levelB: "A", winner: "B" },
        { date: "2026-06-01", teamA: ["zhongkai", "zhuo"], teamB: ["zhengding", "yichen"],  levelA: "2", levelB: "8", winner: "B", note: "红方三冲 A 未过 · 掉回 2（非零封）" },
        { date: "2026-05-29", teamA: ["zhongkai", "zhuo"], teamB: ["zaifeng", "yichen"],    levelA: "A", levelB: "3", winner: "A" },
        { date: "2026-05-25", teamA: ["zhongkai", "zhuo"], teamB: ["zhengding", "zaifeng"], levelA: "J", levelB: "2", winner: "A", note: "蓝方三冲 A 未过 · 掉回 2（非零封）" },
        { date: "2026-05-22", teamA: ["zhongkai", "zaifeng"], teamB: ["zhengding", "yichen"], levelA: "A", levelB: "Q", winner: "A" },
        { date: "2026-05-01", teamA: ["zhongkai", "zhuo"],    teamB: ["zaifeng", "yichen"],   levelA: "2", levelB: "A", winner: "B" },
        { date: "2026-04-29", teamA: ["zhongkai", "zhuo"],    teamB: ["zaifeng", "yichen"],   levelA: "3", levelB: "A", winner: "A", note: "以下克上 · 阻击蓝方冲 A" },
        { date: "2026-04-25", teamA: ["zhongkai", "zaifeng"], teamB: ["zhengding", "yichen"], levelA: "10", levelB: "A", winner: "B" },
        { date: "2026-03-20", teamA: ["haotian", "yichen"],   teamB: ["zhongkai", "zaifeng"],  levelA: "3", levelB: "A", winner: "B" },
        { date: "2026-02-06", teamA: ["zhongkai", "zaifeng"], teamB: ["zhengding", "yichen"], levelA: "A", levelB: "A", winner: "B", note: "双 A 决战 · 蓝方先终结" }
    ];

    var LAB = ["yufei", "yue", "zhengding", "chang", "hezi", "keyi", "xiang", "jixuan", "zaifeng", "zhongkai", "zhuo", "yichen", "xinwei", "alon", "chenyang", "haotian"];
    var PAGE_KEYS = ["latest", "mvp", "board", "history"];
    var DESIGN_W = 844, DESIGN_H = 390; // landscape design stage (a phone on its side = 1:1)

    // English for the style tags and match notes above (quotes stay in the player's own words).
    // Tags are kept to one short phrase so they fit a plate or a row on one line.
    var EN = {
        "记牌反击 · 后发制人": "Card counter",
        "灵活接风 · 见缝插针": "Gap finder",
        "稳健控场 · 逢人配大师": "Steady control",
        "炸弹强攻 · 火力全开": "Bomb assault",
        "冲 A 猛将 · 大牌敢出": "Ace charger",
        "雷霆万钧 · 大牌压制": "Thunder strike",
        "新锐黑马 · 后劲十足": "Dark horse",
        "团队核心 · 配合默契": "Team anchor",
        "红方三冲 A 未过 · 掉回 2（非零封）": "Red missed A 3× · back to 2 (not a shutout)",
        "蓝方三冲 A 未过 · 掉回 2（非零封）": "Blue missed A 3× · back to 2 (not a shutout)",
        "以下克上 · 阻击蓝方冲 A": "Upset · stopped Blue at A",
        "双 A 决战 · 蓝方先终结": "A vs A decider · Blue finished first"
    };

    // Fonts the board is drawn in; guandan.html already links them, events.html gets them on first open.
    var FONT_CSS = {
        "Noto+Sans+SC": "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500;700;900&family=Barlow+Condensed:wght@600;700;800&display=swap",
        "Noto+Serif+Display": "https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wdth,wght@62.5,800;62.5,900&text=0123456789JQKA&display=swap",
        "SmileySans": "https://cdn.jsdelivr.net/npm/@chinese-fonts/dyh@3.0.0/dist/SmileySans-Oblique/result.css"
    };

    // ------------------------- SVG art (no emoji) --------------------------
    var SUIT = {
        "♠": '<path d="M50 5C45 14 35 24 24 34 14 43 7 51 7 62c0 12 9 20 20.5 20 8.5 0 14.5-4 18.5-10-.5 9-4 16-11 23h30c-7-7-10.5-14-11-23 4 6 10 10 18.5 10C84 82 93 74 93 62c0-11-7-19-17-28C65 24 55 14 50 5Z"/>',
        "♥": '<path d="M50 89C47 85 38 77 29 69 17 58 7 48 7 33 7 19 17 9 29.5 9 38 9 45 13.5 50 21c5-7.5 12-12 20.5-12C83 9 93 19 93 33c0 15-10 25-22 36-9 8-18 16-21 20Z"/>',
        "♦": '<path d="M50 3c8 14 22 32 37 47C72 65 58 83 50 97 42 83 28 65 13 50 28 35 42 17 50 3Z"/>',
        "♣": '<circle cx="50" cy="28" r="20"/><circle cx="27" cy="58" r="20"/><circle cx="73" cy="58" r="20"/><circle cx="50" cy="52" r="13"/><path d="M46 58c-.5 15-4 26-12 37h32c-8-11-11.5-22-12-37Z"/>'
    };
    var ICONS = {
        // full-screen sub-page back arrow: head to the left, tail sweeping up to the right
        back: '<svg class="gdr-back-ic" viewBox="0 0 38 30" aria-hidden="true"><path d="M2.5 16.5 15 5.5v6c8.3.2 15.4-1.9 20.5-8.3.9 11.8-6.9 19.4-20.5 19.3v6Z"/></svg>',
        crown: '<svg class="gdr-crown" viewBox="0 0 40 28" aria-hidden="true"><path d="M5 25 2.5 7l10 7.5L20 2.5l7.5 12 10-7.5L35 25Z"/></svg>',
        quote: '<svg class="gdr-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6C6.5 6 4 8.5 4 11.5c0 2.7 2 4.9 4.6 5.4-.2 1-.9 2-2.1 2.6-.3.2-.2.6.1.7 2.8-.3 5.3-2.6 5.3-6.2V11.5C11.9 8.5 11 6 9.5 6zm9 0C15.5 6 13 8.5 13 11.5c0 2.7 2 4.9 4.6 5.4-.2 1-.9 2-2.1 2.6-.3.2-.2.6.1.7 2.8-.3 5.3-2.6 5.3-6.2V11.5C20.9 8.5 20 6 18.5 6z"/></svg>',
        warn: '<svg class="gdr-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 23 21.5H1L12 2.5Z"/><path d="M11 9h2l-.3 6.5h-1.4L11 9Zm1 8.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" fill="#fff"/></svg>',
        help: '<svg class="gdr-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.3-2.8 4.1M12 17.4v.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>'
    };

    // Static sunburst for the MVP reveal panel (16 wedges; clipped by the panel, never animated).
    var RAYS = (function () {
        var d = "", n = 16, r = 150;
        for (var i = 0; i < n; i++) {
            var a0 = 2 * Math.PI * i / n, a1 = a0 + Math.PI / n;
            d += "M0 0L" + (r * Math.cos(a0)).toFixed(1) + " " + (r * Math.sin(a0)).toFixed(1) +
                "L" + (r * Math.cos(a1)).toFixed(1) + " " + (r * Math.sin(a1)).toFixed(1) + "Z";
        }
        return '<svg class="gdr-rays" viewBox="-100 -100 200 200" aria-hidden="true"><path d="' + d + '"/></svg>';
    })();

    // ------------------------- helpers -------------------------
    var lang = "zh";
    function T(zh, en) { return lang === "en" ? en : zh; }
    function tx(s) { return (lang === "en" && EN[s]) || s; }
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }
    function P(key) { return PLAYERS[key] || { name: key, avatar: "", card: "", style: "", quote: "" }; }
    function initials(name) {
        var parts = String(name).trim().split(/\s+/);
        var s = ((parts[0] || "")[0] || "") + ((parts[1] || "")[0] || "");
        return (s || "?").toUpperCase();
    }
    function avatarSrc(key) {
        var p = P(key);
        if (p.avatar) return p.avatar;
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#34447c"/>' +
            '<text x="60" y="64" font-family="sans-serif" font-size="46" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">' + esc(initials(p.name)) + '</text></svg>';
        return "data:image/svg+xml," + encodeURIComponent(svg);
    }
    function avatarImg(key, cls) { return '<img class="' + cls + '" src="' + avatarSrc(key) + '" alt="' + esc(P(key).name) + '" loading="lazy" decoding="async">'; }
    function firstName(key) { return P(key).name.split(" ")[0]; }
    function parseCard(str) {
        str = String(str || "");
        if (!str) return null;
        var suit = str.slice(-1);
        return { rank: str.slice(0, -1), suit: suit, red: suit === "♥" || suit === "♦" };
    }
    function suitSVG(s, cls) { return '<svg class="' + cls + '" viewBox="0 0 100 100" aria-hidden="true">' + (SUIT[s] || "") + '</svg>'; }
    function shortDate(d) { return d.slice(5); }
    function dotDate(d) { return d.replace(/-/g, "."); }
    function teamWord(side) { return side === "A" ? T("红方", "Red") : T("蓝方", "Blue"); }

    // Signature card in the in-game card language: index, labmate portrait, small pip.
    // Players without a signature card (external opponents) get the blue "P" card back.
    function sigCard(key, cls) {
        var c = parseCard(P(key).card);
        if (!c) return '<span class="gdr-card is-back ' + (cls || "") + '" aria-hidden="true"><i>P</i></span>';
        return '<span class="gdr-card' + (c.red ? " red" : "") + " " + (cls || "") + '" role="img" aria-label="' + esc(T("招牌牌 ", "Signature card ") + P(key).card) + '">' +
            '<span class="gdr-card-ix"><b>' + esc(c.rank) + '</b>' + suitSVG(c.suit, "gdr-card-suit") + '</span>' +
            '<span class="gdr-card-face"><img src="' + avatarSrc(key) + '" alt="" loading="lazy" decoding="async"></span>' +
            suitSVG(c.suit, "gdr-card-pip") +
        '</span>';
    }
    function cardChip(key) {
        var c = parseCard(P(key).card);
        if (!c) return "";
        return '<span class="gdr-chip-card' + (c.red ? " red" : "") + '" title="' + esc(T("招牌牌", "Signature card")) + '"><b>' + esc(c.rank) + '</b>' + suitSVG(c.suit, "gdr-chip-suit") + '</span>';
    }
    // Ladder badge: winged gold / silver / bronze shield for the top three, plain numeral below.
    function rankBadge(i) {
        if (i > 2) return '<span class="gdr-rank n">' + (i + 1) + '</span>';
        return '<span class="gdr-rank m' + (i + 1) + '" aria-label="' + (i + 1) + '"><svg viewBox="0 0 48 40" aria-hidden="true">' +
            '<path class="gdr-rank-w" d="M11 9.5 1 7.5l3.2 5.2L.5 14l4.4 4.3-3 1.7 5.4 4 3.7-.6ZM37 9.5l10-2-3.2 5.2L47.5 14l-4.4 4.3 3 1.7-5.4 4-3.7-.6Z"/>' +
            '<path class="gdr-rank-b" d="M24 1.5 39 9v13.5c0 8.3-6.4 13.6-15 16-8.6-2.4-15-7.7-15-16V9z"/>' +
            '<path class="gdr-rank-h" d="M24 4.8 36 10.8v5.9c-7.6 2.4-16.4 2.4-24 0v-5.9z"/></svg><b>' + (i + 1) + '</b></span>';
    }
    // Heavy gold title: dark extrusion, brown outline, light-to-amber gradient face.
    function goldText(text, cls) {
        return '<span class="gdr-gold ' + (cls || "") + '"><i aria-hidden="true">' + text + '</i><i aria-hidden="true">' + text + '</i><i>' + text + '</i></span>';
    }
    function winLossText(s) { return s ? T(s.w + " 胜 " + s.l + " 负", s.w + "W " + s.l + "L") : ""; }
    // One quiet line of a leaderboard row: record · win rate · A cleared.
    function recordHTML(s) {
        return '<span class="gdr-rec"><span>' + T("<b>" + s.w + "</b> 胜 <b>" + s.l + "</b> 负", "<b>" + s.w + "</b>W <b>" + s.l + "</b>L") + "</span>" +
            " <i>·</i> <span>" + T("胜率 ", "") + "<b>" + s.wr + "%</b></span> <i>·</i> <span>" + T("过 A ", "Cleared A ") + "<b>" + s.aw + "</b></span></span>";
    }

    function ensureFonts() {
        if (!global.document) return;
        var links = [].slice.call(document.querySelectorAll('link[rel="stylesheet"]'));
        Object.keys(FONT_CSS).forEach(function (fam) {
            if (links.some(function (l) { return l.href.indexOf(fam) >= 0; })) return;
            var l = document.createElement("link");
            l.rel = "stylesheet";
            l.href = FONT_CSS[fam];
            document.head.appendChild(l);
        });
    }

    // ------------------------- stats -------------------------
    function buildStats() {
        var matches = MATCHES.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
        var stats = {};
        function ensure(k) { return stats[k] || (stats[k] = { key: k, w: 0, l: 0, p: 0, aw: 0 }); }
        matches.forEach(function (m) {
            var aWin = m.winner === "A";
            var winLvl = aWin ? m.levelA : m.levelB;
            m.teamA.forEach(function (k) { var s = ensure(k); s.p++; aWin ? s.w++ : s.l++; if (aWin && winLvl === "A") s.aw++; });
            m.teamB.forEach(function (k) { var s = ensure(k); s.p++; aWin ? s.l++ : s.w++; if (!aWin && winLvl === "A") s.aw++; });
        });
        // 评分 = 赛量修正胜率 (Bayesian shrinkage): regress each win rate toward 50% with C
        // phantom .500 games. High win-rate is rewarded, but a 1-game 100% can't top a proven
        // record, and a high-volume .500 player sits at 50 instead of farming raw win counts.
        var C = 4, PRIOR = 0.5;
        Object.keys(stats).forEach(function (k) {
            var s = stats[k];
            s.wr = s.p ? Math.round(100 * s.w / s.p) : 0;
            s.pts = Math.round(100 * (s.w + C * PRIOR) / (s.p + C));
        });
        var board = Object.keys(stats).map(function (k) { return stats[k]; }).sort(function (a, b) {
            return (b.pts - a.pts) || (b.w - a.w) || (b.wr - a.wr) || (b.p - a.p) || P(a.key).name.localeCompare(P(b.key).name);
        });
        return { matches: matches, board: board, mvp: board[0], byKey: stats };
    }

    // ------------------------- page builders -------------------------
    function memberHTML(key, st) {
        var p = P(key);
        return '<div class="gdr-mem">' + avatarImg(key, "gdr-av") +
            '<span class="gdr-mem-t"><b>' + esc(p.name) + '</b>' + (p.style ? '<span>' + esc(tx(p.style)) + '</span>' : "") +
            '<span class="gdr-mem-rec">' + esc(winLossText(st[key])) + '</span></span></div>';
    }

    function noteHTML(m, cls) {
        return m.note ? '<div class="' + cls + '">' + ICONS.warn + '<span>' + esc(tx(m.note)) + '</span></div>' : "";
    }

    // Season record of one fixed pair (same two players on the same side).
    function pairRecord(d, keys) {
        var r = { w: 0, l: 0 };
        function same(t) { return t.length === keys.length && keys.every(function (k) { return t.indexOf(k) >= 0; }); }
        d.matches.forEach(function (m) {
            var onA = same(m.teamA);
            if (!onA && !same(m.teamB)) return;
            if ((m.winner === "A") === onA) r.w++; else r.l++;
        });
        return r;
    }
    function pairHTML(r, cls) {
        return '<span class="gdr-pair ' + cls + '"><b>' + r.w + '</b>' + T("胜", "W") + '<b>' + r.l + '</b>' + T("负", "L") + '</span>';
    }

    // 最新一战, laid out like Tencent's 红蓝对抗 popup: a red → violet → blue field lit behind the title
    // and the VS, a slanted match tab, 红方/蓝方 in their own margins, two mirrored team plates, and a
    // light bottom band with each pair's season record.
    function posterHTML(d, m, no) {
        var aWin = m.winner === "A";
        function side(cls, keys, win) {
            return '<div class="gdr-side ' + cls + (win ? " is-win" : "") + '">' +
                keys.map(function (k) { return memberHTML(k, d.byKey); }).join("") +
                '<span class="gdr-plate ' + (win ? "win" : "lose") + '">' + (win ? T("胜", "WIN") : T("负", "LOSS")) + '</span>' +
            '</div>';
        }
        return '<div class="gdr-poster" aria-label="' + esc(T("最新一战", "Latest match")) + '">' +
            '<span class="gdr-poster-tab">' + T("第 " + no + " 场", "Match " + no) + '</span>' +
            '<div class="gdr-poster-head"><b>' + T("最新一战", "Latest match") + '</b><span>' + dotDate(m.date) + '</span></div>' +
            '<div class="gdr-poster-main">' +
                '<span class="gdr-poster-word red" aria-hidden="true">' + teamWord("A") + '</span>' +
                side("red", m.teamA, aWin) +
                '<div class="gdr-bigscore" aria-label="' + esc(m.levelA + ":" + m.levelB) + '">' +
                    '<span class="gdr-lv' + (aWin ? "" : " lose") + '">' + esc(m.levelA) + '</span>' +
                    '<span class="gdr-vs" aria-hidden="true">' + ICONS.crown + goldText("VS") + '</span>' +
                    '<span class="gdr-lv' + (aWin ? " lose" : "") + '">' + esc(m.levelB) + '</span>' +
                '</div>' +
                side("blue", m.teamB, !aWin) +
                '<span class="gdr-poster-word blue" aria-hidden="true">' + teamWord("B") + '</span>' +
            '</div>' +
            '<div class="gdr-poster-foot">' +
                pairHTML(pairRecord(d, m.teamA), "red") +
                (m.note ? noteHTML(m, "gdr-poster-note") : '<i>' + T("组合战绩", "Pair record") + '</i>') +
                pairHTML(pairRecord(d, m.teamB), "blue") +
            '</div>' +
        '</div>';
    }

    function matchRowHTML(m, i) {
        var aWin = m.winner === "A";
        function team(cls, keys, win) {
            return '<div class="gdr-mteam ' + cls + (win ? " is-win" : "") + '">' +
                '<span class="gdr-mav">' + keys.map(function (k) { return avatarImg(k, ""); }).join("") + '</span>' +
                '<span class="gdr-mnames">' + keys.map(function (k) { return '<b>' + esc(P(k).name) + '</b>'; }).join("") + '</span>' +
            '</div>';
        }
        return '<div class="gdr-mrow' + (m.note ? " has-note" : "") + '" style="--i:' + Math.min(i, 10) + '">' +
            '<div class="gdr-mdate"><b>' + shortDate(m.date) + '</b><i>' + m.date.slice(0, 4) + '</i></div>' +
            team("red", m.teamA, aWin) +
            '<div class="gdr-mscore"><b class="' + (aWin ? "red" : "lose") + '">' + esc(m.levelA) + '</b><i>:</i><b class="' + (aWin ? "lose" : "blue") + '">' + esc(m.levelB) + '</b></div>' +
            team("blue", m.teamB, !aWin) +
            '<div class="gdr-mres ' + (aWin ? "red" : "blue") + '">' + teamWord(m.winner) + T("胜", " wins") + '</div>' +
            noteHTML(m, "gdr-mnote") +
        '</div>';
    }

    function sectionHead(title, action) {
        return '<div class="gdr-sec"><b>' + title + '</b>' + (action || "") + '</div>';
    }

    function latestPage(d) {
        var n = d.matches.length;
        var recent = d.matches.slice(1, 4).map(matchRowHTML).join("");
        return posterHTML(d, d.matches[0], n) +
            (recent ? sectionHead(T("近期对阵", "Recent matches"), '<button class="gdr-link" type="button" data-gdr-go="history">' + T("全部对阵", "All matches") + ' ›</button>') +
                '<div class="gdr-mlist">' + recent + '</div>' : "");
    }

    // Portrait in a gold frame; the signature card peeks from behind it when the player has one.
    function mvpArt(key) {
        var card = !!P(key).card;
        return '<div class="gdr-mvp-art' + (card ? "" : " no-card") + '">' + (card ? sigCard(key, "gdr-mvp-card") : "") + avatarImg(key, "gdr-mvp-av") + '</div>';
    }

    // The MVP's most recent match, told from their side, as the last cell of the stat ribbon.
    function mvpLastHTML(d, key) {
        var m = d.matches.filter(function (x) { return x.teamA.indexOf(key) >= 0 || x.teamB.indexOf(key) >= 0; })[0];
        if (!m) return "";
        var onA = m.teamA.indexOf(key) >= 0;
        var mine = onA ? m.teamA : m.teamB, theirs = onA ? m.teamB : m.teamA;
        var won = (m.winner === "A") === onA;
        var partner = mine.filter(function (k) { return k !== key; }).map(firstName).join(" · ");
        return '<span class="gdr-mvp-last"><i>' + T("最近一战", "Last match") + '</i>' +
            '<b>' + esc(onA ? m.levelA : m.levelB) + ':' + esc(onA ? m.levelB : m.levelA) + '</b>' +
            '<em class="' + (won ? "win" : "lose") + '">' + (won ? T("胜", "WIN") : T("负", "LOSS")) + '</em>' +
            '<small>' + shortDate(m.date) + (partner ? T(" · 搭档 ", " · with ") + esc(partner) : "") + T(" · 对阵 ", " · vs ") + esc(theirs.map(firstName).join(" · ")) + '</small></span>';
    }

    function chaseCard(r, i) {
        var q = P(r.key);
        return '<div class="gdr-row" style="--i:' + (i + 1) + '">' + rankBadge(i + 1) + avatarImg(r.key, "gdr-av") +
            '<div class="gdr-row-main"><div class="gdr-row-name"><b>' + esc(q.name) + '</b>' + cardChip(r.key) + '</div>' +
            (q.style ? '<div class="gdr-row-sub">' + esc(tx(q.style)) + '</div>' : "") + '</div>' +
            '<div class="gdr-row-pts"><b>' + r.pts + '</b><i>' + T("评分", "Score") + '</i></div></div>';
    }

    // Season MVP, composed like a result screen: framed portrait, name, gold score plate, one stat ribbon.
    // Ranks 2-5 follow; a 16:9 phone stage shows the first two, taller stages and portrait all four.
    function mvpPage(d) {
        var s = d.mvp, p = P(s.key);
        var chase = d.board.slice(1, 5).map(chaseCard).join("");
        return '<div class="gdr-mvp">' +
                mvpArt(s.key) +
                '<div class="gdr-mvp-id">' +
                    '<span class="gdr-ribbon">' + T("赛季 MVP", "Season MVP") + '</span>' +
                    '<b class="gdr-mvp-name">' + esc(p.name) + '</b>' +
                    (p.style ? '<span class="gdr-tag light">' + esc(tx(p.style)) + '</span>' : "") +
                    (p.quote ? '<div class="gdr-quote light">' + ICONS.quote + '<span>' + esc(p.quote) + '</span></div>' : "") +
                '</div>' +
                '<div class="gdr-mvp-plate"><b>' + s.pts + '</b><i>' + T("综合评分", "Score") + '</i></div>' +
                '<div class="gdr-mvp-rib">' +
                    '<span><b>' + s.w + '-' + s.l + '</b><i>' + T("胜负", "W-L") + '</i></span>' +
                    '<span><b>' + s.wr + '%</b><i>' + T("胜率", "Win rate") + '</i></span>' +
                    '<span><b>' + s.aw + '</b><i>' + T("过 A", "Cleared A") + '</i></span>' +
                    '<span><b>' + s.p + '</b><i>' + T("场次", "Played") + '</i></span>' +
                    mvpLastHTML(d, s.key) +
                '</div>' +
            '</div>' +
            (chase ? sectionHead(T("紧随其后", "Chasing")) + '<div class="gdr-chase">' + chase + '</div>' : "");
    }

    function boardPage(d) {
        var rows = d.board.map(function (s, i) {
            var p = P(s.key);
            return '<div class="gdr-row' + (i < 3 ? " top" : "") + '" style="--i:' + Math.min(i, 10) + '">' +
                rankBadge(i) + avatarImg(s.key, "gdr-av") +
                '<div class="gdr-row-main">' +
                    '<div class="gdr-row-name"><b>' + esc(p.name) + '</b>' + cardChip(s.key) + (p.style ? '<span class="gdr-tag">' + esc(tx(p.style)) + '</span>' : "") + '</div>' +
                    '<div class="gdr-row-sub">' + recordHTML(s) +
                        (p.quote ? '<span class="gdr-row-q">' + ICONS.quote + '<span>' + esc(p.quote) + '</span></span>' : "") + '</div>' +
                '</div>' +
                '<div class="gdr-row-pts"><b>' + s.pts + '</b><i>' + T("评分", "Score") + '</i></div>' +
            '</div>';
        }).join("");
        var deck = LAB.filter(function (k) { return PLAYERS[k]; }).map(function (k) {
            return '<div class="gdr-deck-item">' + sigCard(k, "") + '<b>' + esc(firstName(k)) + '</b></div>';
        }).join("");
        // the score formula waits behind the ? button (a tap note, closed by any other tap)
        var help = '<button class="gdr-help" type="button" aria-expanded="false" aria-controls="gdr-score-note" aria-label="' + esc(T("评分怎么算", "How the score works")) + '">' + ICONS.help + '</button>' +
            '<span class="gdr-note" id="gdr-score-note" hidden>' + T("评分 = 赛量修正胜率：(胜 + 2) ÷ (场次 + 4)，场次少的胜率向 50% 靠拢", "Score = volume-adjusted win rate: (W + 2) / (games + 4), so a short record leans toward 50%") + '</span>';
        return sectionHead(T("选手排行榜", "Leaderboard"), help) +
            '<div class="gdr-rows">' + rows + '</div>' +
            sectionHead(T("实验室牌谱", "Lab deck"), '<span class="gdr-fine">' + T("每位成员的招牌牌，也是对局里的人像牌", "Each member's signature card, as it appears in game") + '</span>') +
            '<div class="gdr-deck">' + deck + '</div>';
    }

    function historyPage(d) {
        return sectionHead(T("历史对阵", "Match history"), '<span class="gdr-fine">' + T("共 " + d.matches.length + " 场 · 红方在左", d.matches.length + " matches · Red on the left") + '</span>') +
            '<div class="gdr-mlist">' + d.matches.map(matchRowHTML).join("") + '</div>';
    }

    // events.html intro: the season MVP reveal, then the board slides in from under it.
    function splashHTML(d) {
        var s = d.mvp, p = P(s.key);
        return '<div class="gdr-splash" role="button" tabindex="-1" aria-label="' + esc(T("跳过", "Skip")) + '">' +
            '<div class="gdr-splash-in">' + RAYS +
                '<span class="gdr-splash-plate">' + goldText(T("赛季MVP", "SEASON MVP"), "gdr-splash-title") + '</span>' +
                mvpArt(s.key) +
                '<b class="gdr-splash-name">' + esc(p.name) + '</b>' +
                '<div class="gdr-splash-line">' +
                    '<span><b>' + s.pts + '</b>' + T("评分", "score") + '</span>' +
                    '<span><b>' + s.w + '-' + s.l + '</b>' + T("战绩", "record") + '</span>' +
                    '<span><b>' + s.wr + '%</b>' + T("胜率", "win rate") + '</span>' +
                '</div>' +
                (p.quote ? '<div class="gdr-quote light">' + ICONS.quote + '<span>' + esc(p.quote) + '</span></div>' : "") +
            '</div>' +
        '</div>';
    }

    function appHTML(d, splash) {
        var titles = [T("最新战报", "Latest"), T("赛季 MVP", "MVP"), T("排行榜", "Ranking"), T("历史对阵", "History")];
        var bodies = [latestPage(d), mvpPage(d), boardPage(d), historyPage(d)];
        return '<div class="gdr-app" lang="' + (lang === "en" ? "en" : "zh-CN") + '" data-page="latest">' +
            '<header class="gdr-head">' +
                '<button class="gdr-back gdr-close" type="button" aria-label="' + esc(T("返回", "Back")) + '">' + ICONS.back + '</button>' +
                '<h2 class="gdr-head-title">' + T("巅峰对决", "Peak Showdown") + '</h2>' +
                '<span class="gdr-head-sub">' + T("Picasso Lab 掼蛋 · 输了叫收集数据，赢了叫重大突破", "Picasso Lab Guandan · a loss is data, a win is a breakthrough") + '</span>' +
                '<span class="gdr-head-chip">' + T(d.matches.length + " 场实战", d.matches.length + " matches") + '</span>' +
            '</header>' +
            '<div class="gdr-tabs" role="tablist" aria-label="' + esc(T("巅峰对决", "Peak Showdown")) + '">' +
                titles.map(function (t, i) {
                    return '<button class="gdr-tab" type="button" role="tab" id="gdr-tab-' + PAGE_KEYS[i] + '" aria-controls="gdr-page-' + PAGE_KEYS[i] + '" data-gdr-go="' + PAGE_KEYS[i] + '" aria-selected="' + (i === 0) + '"' + (i ? ' tabindex="-1"' : "") + '>' + t + '</button>';
                }).join("") +
            '</div>' +
            '<div class="gdr-view">' +
                '<div class="gdr-track">' +
                    bodies.map(function (b, i) {
                        return '<section class="gdr-page gdr-page-' + PAGE_KEYS[i] + '" id="gdr-page-' + PAGE_KEYS[i] + '" role="tabpanel" aria-labelledby="gdr-tab-' + PAGE_KEYS[i] + '"><div class="gdr-page-in">' + b + '</div></section>';
                    }).join("") +
                '</div>' +
            '</div>' +
            (splash ? splashHTML(d) : "") +
        '</div>';
    }

    // ------------------------- board component -------------------------
    function mount(host, opts) {
        opts = opts || {};
        lang = opts.lang === "en" ? "en" : "zh";
        ensureFonts();
        var d = buildStats();
        host.innerHTML = appHTML(d, !!opts.splash);
        var app = host.querySelector(".gdr-app");
        var view = app.querySelector(".gdr-view");
        var track = app.querySelector(".gdr-track");
        var pages = [].slice.call(app.querySelectorAll(".gdr-page"));
        var tabs = [].slice.call(app.querySelectorAll(".gdr-tab"));
        var splash = app.querySelector(".gdr-splash");
        var reduce = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
        var help = app.querySelector(".gdr-help"), note = help && help.nextElementSibling;
        var idx = 0, drag = null, swallowClick = false, timers = [], scale = 1, ro = null;

        // Design stage: landscape screens show the 844x390 layout scaled by s (so a 1440x900 desktop
        // keeps a phone's proportions); portrait phones use their own layout at s = 1.
        function fit() {
            var W = host.clientWidth, H = host.clientHeight;
            if (!W || !H) return;
            var port = W < 700 && W < H;
            scale = port ? 1 : Math.min(W / DESIGN_W, H / DESIGN_H);
            var w = W / scale, h = H / scale;
            app.classList.toggle("is-port", port);
            app.classList.toggle("is-tall", !port && h >= 460); // 16:10-ish screens: spare height, same width
            app.style.width = w + "px";
            app.style.height = h + "px";
            app.style.setProperty("--gdr-sw", w + "px");
            app.style.setProperty("--gdr-sh", h + "px");
            app.style.setProperty("--gdr-hit", Math.max(40, 40 / scale) + "px"); // a 40 px touch target after scaling
            app.style.transform = scale === 1 ? "" : "scale(" + scale + ")";
            fitNames();
        }
        // A long roster name shrinks to fit its team plate instead of being cut off.
        function fitNames() {
            [].forEach.call(app.querySelectorAll(".gdr-mem-t > b"), function (b) {
                b.style.fontSize = "";
                if (b.clientWidth && b.scrollWidth > b.clientWidth) {
                    b.style.fontSize = Math.max(11, parseFloat(getComputedStyle(b).fontSize) * b.clientWidth / b.scrollWidth).toFixed(2) + "px";
                }
            });
        }

        function pageIndex(p) {
            if (typeof p === "number") return p;
            var k = PAGE_KEYS.indexOf(String(p));
            return k >= 0 ? k : (parseInt(p, 10) || 0);
        }
        function place(dx) {
            track.style.transform = "translate3d(calc(" + (-100 * idx) + "% + " + (dx || 0) + "px),0,0)";
        }
        // A page's entry animation starts the first time it is shown or dragged into view. The
        // guandan modal hides with display:none, so each re-open plays the shown page's entry again.
        function reveal(page) { if (page && !splash) page.classList.add("is-shown"); }
        function showNote(on) {
            if (!help) return;
            help.setAttribute("aria-expanded", String(on));
            note.hidden = !on;
        }
        function go(p, instant) {
            showNote(false);
            idx = Math.max(0, Math.min(pages.length - 1, pageIndex(p)));
            track.classList.toggle("no-anim", !!instant || reduce);
            place(0);
            app.setAttribute("data-page", PAGE_KEYS[idx]);
            tabs.forEach(function (t, i) { t.setAttribute("aria-selected", String(i === idx)); t.tabIndex = i === idx ? 0 : -1; });
            pages.forEach(function (pg, i) { pg.inert = i !== idx; });
            reveal(pages[idx]);
        }

        function onClick(e) {
            if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); return; }
            var t = e.target.closest && e.target.closest("[data-gdr-go], .gdr-back, .gdr-help");
            if (t !== help) showNote(false); // any other tap closes the score note
            if (!t || !app.contains(t)) return;
            if (t === help) showNote(note.hidden);
            else if (t.classList.contains("gdr-back")) { if (opts.onClose) opts.onClose(); }
            else go(t.getAttribute("data-gdr-go"));
        }
        // Touch/pen drag follows the finger; vertical pans stay native (touch-action: pan-y).
        // Pointer deltas are screen px; the track moves in stage px, hence the division by scale.
        function onDown(e) {
            if (e.pointerType === "mouse" || !e.isPrimary) return;
            drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, lt: e.timeStamp, v: 0, dx: 0, on: false };
        }
        function onMove(e) {
            if (!drag || e.pointerId !== drag.id) return;
            var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (!drag.on) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                if (Math.abs(dx) <= Math.abs(dy) * 1.2) { drag = null; return; }
                drag.on = true;
                try { view.setPointerCapture(e.pointerId); } catch (_) {}
                track.classList.add("no-anim");
            }
            var dt = e.timeStamp - drag.lt;
            if (dt > 0) drag.v = (e.clientX - drag.lx) / dt;
            drag.lx = e.clientX; drag.lt = e.timeStamp;
            var atEdge = (idx === 0 && dx > 0) || (idx === pages.length - 1 && dx < 0);
            if (!atEdge) reveal(pages[idx + (dx < 0 ? 1 : -1)]); // the neighbour animates in as it is pulled into view
            drag.dx = (atEdge ? dx / 3 : dx) / scale;
            place(drag.dx);
        }
        function onUp(e) {
            if (!drag || e.pointerId !== drag.id) return;
            var g = drag;
            drag = null;
            if (!g.on) return;
            swallowClick = e.type === "pointerup";
            timers.push(setTimeout(function () { swallowClick = false; }, 0));
            var far = Math.abs(g.dx) > view.clientWidth * 0.18 || Math.abs(g.v) > 0.45;
            var step = e.type === "pointerup" && far ? (g.dx < 0 ? 1 : -1) : 0;
            go(idx + step);
        }
        app.addEventListener("click", onClick, true);
        view.addEventListener("pointerdown", onDown);
        view.addEventListener("pointermove", onMove);
        view.addEventListener("pointerup", onUp);
        view.addEventListener("pointercancel", onUp);
        // The observer runs after layout and before paint, so a newly shown host never paints unscaled.
        if (global.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(host); }
        else global.addEventListener("resize", fit);
        var fonts = global.document && document.fonts;
        if (fonts && fonts.addEventListener) fonts.addEventListener("loadingdone", fitNames); // names were measured in a fallback face
        fit();

        go(0, true);
        if (splash) {
            // The splash slides up on an ease-out curve; page 1's entry starts once it has mostly cleared.
            var leave = function () {
                if (!splash) return;
                var s = splash;
                splash = null;
                pages[idx].style.setProperty("--gdr-d0", "140ms");
                reveal(pages[idx]);
                s.classList.add("is-leaving");
                timers.push(setTimeout(function () { s.remove(); }, 420));
            };
            if (reduce) leave();
            else {
                splash.addEventListener("click", leave);
                timers.push(setTimeout(leave, 1900));
            }
        }

        return {
            go: go,
            next: function () { go(idx + 1); },
            prev: function () { go(idx - 1); },
            lang: lang,
            destroy: function () {
                timers.forEach(clearTimeout);
                if (ro) ro.disconnect(); else global.removeEventListener("resize", fit);
                if (fonts && fonts.removeEventListener) fonts.removeEventListener("loadingdone", fitNames);
                app.removeEventListener("click", onClick, true);
                host.innerHTML = "";
            }
        };
    }

    // Read-only: a player's style tag as the board shows it in `lng` ("" when there is none there).
    function styleText(key, lng) {
        var style = P(key).style;
        return lng === "en" ? (style && EN[style]) || "" : style;
    }

    global.GuandanRecords = {
        mount: mount,
        styleText: styleText,
        stats: function () { var d = buildStats(); return { matches: d.matches, board: d.board, mvp: d.mvp }; },
        PAGE_KEYS: PAGE_KEYS,
        PLAYERS: PLAYERS,
        MATCHES: MATCHES
    };
})(window);
