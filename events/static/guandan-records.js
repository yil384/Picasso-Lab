/* ============================================================
   Guandan 巅峰对决 records: shared data + board component.
   EDIT THE DATA BELOW (PLAYERS / MATCHES). Players also carry a
   `style` (擅长打法), a `quote` (座右铭) and a signature `card`.
   Exposes window.GuandanRecords:
     mount(host, { lang, splash }) -> { go(page, instant), next(), prev(), index(), destroy() }
         renders the paged board (最新战报 / 赛季 MVP / 排行榜 / 历史对阵) into `host`;
         used by guandan.html's #gdr-cardmodal and events.html's "mvp" overlay (splash: true).
         `page` is an index or one of PAGE_KEYS.
     buildBanner({ lang }) -> slim 战报 strip; clicking it opens the board ([data-open-records]).
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
        trophy: '<svg class="gdr-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2H6v1H2v3.2C2 8.8 3.9 11 6.3 11.3A6 6 0 0 0 11 15.8V18H8.6c-.9 0-1.6.7-1.6 1.6V20h10v-.4c0-.9-.7-1.6-1.6-1.6H13v-2.2a6 6 0 0 0 4.7-4.5C20.1 11 22 8.8 22 6.2V3h-4V2zM6 9.2C4.9 8.9 4 7.6 4 6.2V5h2v4.2zM20 6.2c0 1.4-.9 2.7-2 3V5h2v1.2zM6 21h12v1H6z"/></svg>',
        quote: '<svg class="gdr-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6C6.5 6 4 8.5 4 11.5c0 2.7 2 4.9 4.6 5.4-.2 1-.9 2-2.1 2.6-.3.2-.2.6.1.7 2.8-.3 5.3-2.6 5.3-6.2V11.5C11.9 8.5 11 6 9.5 6zm9 0C15.5 6 13 8.5 13 11.5c0 2.7 2 4.9 4.6 5.4-.2 1-.9 2-2.1 2.6-.3.2-.2.6.1.7 2.8-.3 5.3-2.6 5.3-6.2V11.5C20.9 8.5 20 6 18.5 6z"/></svg>',
        warn: '<svg class="gdr-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 23 21.5H1L12 2.5Z"/><path d="M11 9h2l-.3 6.5h-1.4L11 9Zm1 8.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" fill="#fff"/></svg>',
        help: '<svg class="gdr-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.3-2.8 4.1M12 17.4v.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>'
    };

    // ------------------------- helpers -------------------------
    var lang = "zh";
    function T(zh, en) { return lang === "en" ? en : zh; }
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
    // Ladder badge: gold / silver / bronze shield for the top three, plain numeral below.
    function rankBadge(i) {
        if (i > 2) return '<span class="gdr-rank n">' + (i + 1) + '</span>';
        return '<span class="gdr-rank m' + (i + 1) + '" aria-label="' + (i + 1) + '"><svg viewBox="0 0 36 40" aria-hidden="true">' +
            '<path class="gdr-rank-b" d="M18 1.5 33 9v13.5c0 8.3-6.4 13.6-15 16-8.6-2.4-15-7.7-15-16V9z"/>' +
            '<path class="gdr-rank-h" d="M18 4.8 30 10.8v5.9c-7.6 2.4-16.4 2.4-24 0v-5.9z"/></svg><b>' + (i + 1) + '</b></span>';
    }
    function winLossText(s) { return s ? T(s.w + " 胜 " + s.l + " 负", s.w + "W " + s.l + "L") : ""; }

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
            '<span class="gdr-mem-t"><b>' + esc(p.name) + '</b>' + (p.style ? '<span>' + esc(p.style) + '</span>' : "") +
            '<span class="gdr-mem-rec">' + esc(winLossText(st[key])) + '</span></span></div>';
    }

    function noteHTML(m, cls) {
        return m.note ? '<div class="' + cls + '">' + ICONS.warn + '<span>' + esc(m.note) + '</span></div>' : "";
    }

    // 最新一战: red-vs-blue diagonal split, gold VS, the levels as the largest type.
    function posterHTML(m, no, st) {
        var aWin = m.winner === "A";
        function side(cls, keys, win) {
            return '<div class="gdr-side ' + cls + (win ? " is-win" : "") + '">' +
                keys.map(function (k) { return memberHTML(k, st); }).join("") +
                '<span class="gdr-plate ' + (win ? "win" : "lose") + '">' + (win ? T("胜", "WIN") : T("负", "LOSS")) + '</span>' +
            '</div>';
        }
        return '<div class="gdr-poster" aria-label="' + esc(T("最新一战", "Latest match")) + '">' +
            '<span class="gdr-poster-word red" aria-hidden="true">' + teamWord("A") + '</span>' +
            '<span class="gdr-poster-word blue" aria-hidden="true">' + teamWord("B") + '</span>' +
            '<div class="gdr-poster-head"><b>' + T("最新一战", "Latest match") + '</b><span>' + dotDate(m.date) + ' · ' + T("第 " + no + " 场", "Match " + no) + '</span></div>' +
            side("red", m.teamA, aWin) +
            '<div class="gdr-bigscore" aria-label="' + esc(m.levelA + ":" + m.levelB) + '">' +
                '<span class="gdr-lv' + (aWin ? "" : " lose") + '">' + esc(m.levelA) + '</span>' +
                '<span class="gdr-vs" aria-hidden="true">VS</span>' +
                '<span class="gdr-lv' + (aWin ? " lose" : "") + '">' + esc(m.levelB) + '</span>' +
            '</div>' +
            side("blue", m.teamB, !aWin) +
            noteHTML(m, "gdr-poster-note") +
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
        return posterHTML(d.matches[0], n, d.byKey) +
            (recent ? sectionHead(T("近期对阵", "Recent matches"), '<button class="gdr-link" type="button" data-gdr-go="history">' + T("全部对阵", "All matches") + ' ›</button>') +
                '<div class="gdr-mlist">' + recent + '</div>' : "");
    }

    // The MVP's most recent match, told from their side.
    function mvpLastHTML(d, key) {
        var m = d.matches.filter(function (x) { return x.teamA.indexOf(key) >= 0 || x.teamB.indexOf(key) >= 0; })[0];
        if (!m) return "";
        var onA = m.teamA.indexOf(key) >= 0;
        var mine = onA ? m.teamA : m.teamB, theirs = onA ? m.teamB : m.teamA;
        var won = (m.winner === "A") === onA;
        var partner = mine.filter(function (k) { return k !== key; }).map(function (k) { return P(k).name; }).join(" · ");
        return '<div class="gdr-mvp-last"><i>' + T("最近一战", "Last match") + '</i>' +
            '<b>' + esc(onA ? m.levelA : m.levelB) + ' : ' + esc(onA ? m.levelB : m.levelA) + '</b>' +
            '<span>' + shortDate(m.date) + (partner ? T(" · 搭档 ", " · with ") + esc(partner) : "") + T(" · 对阵 ", " · vs ") + esc(theirs.map(function (k) { return P(k).name; }).join(" · ")) + '</span>' +
            '<em class="' + (won ? "win" : "lose") + '">' + (won ? T("胜", "WIN") : T("负", "LOSS")) + '</em></div>';
    }

    function mvpPage(d) {
        var s = d.mvp, p = P(s.key);
        var chase = d.board.slice(1, 3).map(function (r, i) {
            var q = P(r.key);
            return '<div class="gdr-row compact" style="--i:' + (i + 1) + '">' + rankBadge(i + 1) + avatarImg(r.key, "gdr-av") +
                '<div class="gdr-row-main"><div class="gdr-row-name"><b>' + esc(q.name) + '</b>' + cardChip(r.key) + '</div>' +
                (q.style ? '<div class="gdr-row-sub">' + esc(q.style) + '</div>' : "") + '</div>' +
                '<div class="gdr-row-pts"><b>' + r.pts + '</b><i>' + T("评分", "Score") + '</i></div></div>';
        }).join("");
        return '<div class="gdr-mvp">' +
            '<div class="gdr-mvp-hero">' +
                '<span class="gdr-ribbon">' + T("赛季 MVP", "Season MVP") + '</span>' +
                '<div class="gdr-mvp-art">' + sigCard(s.key, "gdr-mvp-card") + avatarImg(s.key, "gdr-mvp-av") + '</div>' +
                '<b class="gdr-mvp-name">' + esc(p.name) + '</b>' +
                (p.style ? '<span class="gdr-tag light">' + esc(p.style) + '</span>' : "") +
            '</div>' +
            '<div class="gdr-mvp-body">' +
                '<div class="gdr-mvp-score"><i>' + T("综合评分", "Score") + '</i><b>' + s.pts + '</b></div>' +
                '<div class="gdr-cells">' +
                    '<span><b>' + s.w + '-' + s.l + '</b><i>' + T("胜负", "W-L") + '</i></span>' +
                    '<span><b>' + s.wr + '%</b><i>' + T("胜率", "Win rate") + '</i></span>' +
                    '<span><b>' + s.aw + '</b><i>' + T("过 A", "Cleared A") + '</i></span>' +
                    '<span><b>' + s.p + '</b><i>' + T("场次", "Played") + '</i></span>' +
                '</div>' +
                (p.quote ? '<div class="gdr-quote">' + ICONS.quote + '<span>' + esc(p.quote) + '</span></div>' : "") +
                mvpLastHTML(d, s.key) +
            '</div>' +
        '</div>' +
        (chase ? sectionHead(T("紧随其后", "Chasing")) + '<div class="gdr-rows">' + chase + '</div>' : "");
    }

    function boardPage(d) {
        var rows = d.board.map(function (s, i) {
            var p = P(s.key);
            return '<div class="gdr-row' + (i < 3 ? " top" : "") + '" style="--i:' + Math.min(i, 10) + '">' +
                rankBadge(i) + avatarImg(s.key, "gdr-av") +
                '<div class="gdr-row-main">' +
                    '<div class="gdr-row-name"><b>' + esc(p.name) + '</b>' + cardChip(s.key) + (p.style ? '<span class="gdr-tag">' + esc(p.style) + '</span>' : "") + '</div>' +
                    (p.quote ? '<div class="gdr-row-sub">' + ICONS.quote + '<span>' + esc(p.quote) + '</span></div>' : "") +
                '</div>' +
                '<div class="gdr-cells">' +
                    '<span><b>' + s.w + '-' + s.l + '</b><i>' + T("胜负", "W-L") + '</i></span>' +
                    '<span><b>' + s.wr + '%</b><i>' + T("胜率", "Win rate") + '</i></span>' +
                    '<span><b>' + s.aw + '</b><i>' + T("过 A", "Cleared A") + '</i></span>' +
                '</div>' +
                '<div class="gdr-row-pts"><b>' + s.pts + '</b><i>' + T("评分", "Score") + '</i></div>' +
            '</div>';
        }).join("");
        var deck = LAB.filter(function (k) { return PLAYERS[k]; }).map(function (k) {
            return '<div class="gdr-deck-item">' + sigCard(k, "") + '<b>' + esc(firstName(k)) + '</b></div>';
        }).join("");
        return sectionHead(T("选手排行榜", "Leaderboard"), '<span class="gdr-fine">' + ICONS.help + T("评分 = 赛量修正胜率：(胜 + 2) ÷ (场次 + 4)", "Score = volume-adjusted win rate: (W + 2) / (games + 4)") + '</span>') +
            '<div class="gdr-rows">' + rows + '</div>' +
            sectionHead(T("实验室牌谱", "Lab deck"), '<span class="gdr-fine">' + T("每位成员的招牌牌，也是对局里的人像牌", "Each member's signature card, as it appears in game") + '</span>') +
            '<div class="gdr-deck">' + deck + '</div>';
    }

    function historyPage(d) {
        return sectionHead(T("历史对阵", "Match history"), '<span class="gdr-fine">' + T("共 " + d.matches.length + " 场 · 红方在左", d.matches.length + " matches · Red on the left") + '</span>') +
            '<div class="gdr-mlist">' + d.matches.map(matchRowHTML).join("") + '</div>';
    }

    // events.html intro: the season MVP, then the board slides in from under it.
    function splashHTML(d) {
        var s = d.mvp, p = P(s.key);
        return '<div class="gdr-splash" role="button" tabindex="-1" aria-label="' + esc(T("跳过", "Skip")) + '">' +
            '<div class="gdr-splash-in">' +
                '<span class="gdr-ribbon">' + T("赛季 MVP", "Season MVP") + '</span>' +
                '<div class="gdr-mvp-art">' + sigCard(s.key, "gdr-mvp-card") + avatarImg(s.key, "gdr-mvp-av") + '</div>' +
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
        var titles = [T("最新战报", "Latest"), T("赛季 MVP", "Season MVP"), T("排行榜", "Leaderboard"), T("历史对阵", "History")];
        var bodies = [latestPage(d), mvpPage(d), boardPage(d), historyPage(d)];
        return '<div class="gdr-app" lang="' + (lang === "en" ? "en" : "zh-CN") + '" data-page="latest">' +
            '<header class="gdr-head">' +
                '<span class="gdr-head-mark">' + ICONS.trophy + '</span>' +
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
        var idx = 0, drag = null, swallowClick = false, timers = [];

        function pageIndex(p) {
            if (typeof p === "number") return p;
            var k = PAGE_KEYS.indexOf(String(p));
            return k >= 0 ? k : (parseInt(p, 10) || 0);
        }
        function place(dx) {
            track.style.transform = "translate3d(calc(" + (-100 * idx) + "% + " + (dx || 0) + "px),0,0)";
        }
        // Entry animations run once per page, the first time it is shown (never on revisits).
        function reveal(page) { if (!splash) page.classList.add("is-shown"); }
        function go(p, instant) {
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
            var t = e.target.closest && e.target.closest("[data-gdr-go]");
            if (t && app.contains(t)) go(t.getAttribute("data-gdr-go"));
        }
        // Touch/pen drag follows the finger; vertical pans stay native (touch-action: pan-y).
        function onDown(e) {
            if (e.pointerType === "mouse" || !e.isPrimary) return;
            drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, lx: e.clientX, lt: e.timeStamp, v: 0, dx: 0, on: false };
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
            drag.dx = atEdge ? dx / 3 : dx;
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

        go(0, true);
        if (splash) {
            var leave = function () {
                if (!splash) return;
                var s = splash;
                splash = null;
                reveal(pages[idx]);
                s.classList.add("is-leaving");
                timers.push(setTimeout(function () { s.remove(); }, 380));
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
            index: function () { return idx; },
            lang: lang,
            destroy: function () {
                timers.forEach(clearTimeout);
                app.removeEventListener("click", onClick, true);
                host.innerHTML = "";
            }
        };
    }

    // Slim 战报 strip for the lobby: latest result + top three. Opens the board.
    function buildBanner(opts) {
        lang = opts && opts.lang === "en" ? "en" : "zh";
        var d = buildStats();
        var L = d.matches[0];
        var aWin = L.winner === "A";
        var winT = aWin ? L.teamA : L.teamB, loseT = aWin ? L.teamB : L.teamA;
        var top = d.board.slice(0, 3).map(function (s, i) {
            return '<span class="gdr-bn-chip">' + rankBadge(i) + '<span>' + esc(firstName(s.key)) + '</span><b>' + s.pts + '</b></span>';
        }).join("");
        return '<div class="gdr-banner gdr-scope" role="button" tabindex="0" data-open-records="latest" data-lang="' + lang + '" aria-label="' + esc(T("打开巅峰对决战绩", "Open the Peak Showdown records")) + '">' +
            '<span class="gdr-bn-tag">' + T("战报", "News") + '</span>' +
            '<span class="gdr-bn-body">' +
                '<span class="gdr-bn-avs">' + winT.map(function (k) { return avatarImg(k, ""); }).join("") + '</span>' +
                '<b>' + winT.map(function (k) { return esc(firstName(k)); }).join(" · ") + '</b>' +
                '<span class="gdr-bn-score"><span class="' + (aWin ? "red" : "blue") + '">' + esc(aWin ? L.levelA : L.levelB) + '</span><i>:</i><span>' + esc(aWin ? L.levelB : L.levelA) + '</span></span>' +
                '<span class="gdr-bn-mut">' + T("胜 ", "def. ") + loseT.map(function (k) { return esc(firstName(k)); }).join(" · ") + '</span>' +
                '<span class="gdr-bn-div" aria-hidden="true"></span>' +
                top +
            '</span>' +
            '<span class="gdr-bn-go">' + T("巅峰对决", "Records") + ' ›</span>' +
        '</div>';
    }

    global.GuandanRecords = {
        mount: mount,
        buildBanner: buildBanner,
        stats: function () { var d = buildStats(); return { matches: d.matches, board: d.board, mvp: d.mvp }; },
        PAGE_KEYS: PAGE_KEYS,
        PLAYERS: PLAYERS,
        MATCHES: MATCHES
    };
})(window);
