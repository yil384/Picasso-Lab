/* ============================================================
   🏆 Guandan Peak-Showdown Records — shared data + renderer
   KPL-style esports board for the lab "AI for Guandan" project.
   EDIT THE DATA BELOW (PLAYERS / MATCHES). Players also carry a
   `style` (擅长打法) and `quote` (口头禅) — ✏️ tweak to taste.
   Exposes:
     window.GuandanRecords.buildHTML()  -> full board (one scroll)
     window.GuandanRecords.buildPages() -> { splash, pages:[...] }
                                            for the paged MVP overlay

   SCORING (掼蛋升级制): teams climb 2→3→…→10→J→Q→K→A. Win by
   reaching A and passing it. Score = the level each team ended on
   (e.g. "A:K", "A:3"). Special: a team reaches A but fails to pass
   it 3× and drops back to 2 — that is NOT a clean shutout; mark it
   with a `note` (e.g. "8:2" / "J:2").
   Leaderboard rank = 综合积分 (积分 = 胜×3 − 负×1, tiebreak 胜率).
   ============================================================ */
(function (global) {
    "use strict";

    var AV = "https://yil384.github.io/Picasso-Lab/people/static/"; // absolute → works embedded anywhere

    // -------- PLAYER ROSTER (✏️ style placeholders; quote = 座右铭/motto) --------
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

    // -------- MATCH HISTORY (real records; teamA = left, score levelA:levelB) --------
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

    // ------------------------- SVG icon set (no emoji) --------------------------
    var ICONS = {
        trophy: '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6v1H2v3.2C2 8.8 3.9 11 6.3 11.3A6 6 0 0 0 11 15.8V18H8.6c-.9 0-1.6.7-1.6 1.6V20h10v-.4c0-.9-.7-1.6-1.6-1.6H13v-2.2a6 6 0 0 0 4.7-4.5C20.1 11 22 8.8 22 6.2V3h-4V2zM6 9.2C4.9 8.9 4 7.6 4 6.2V5h2v4.2zM20 6.2c0 1.4-.9 2.7-2 3V5h2v1.2zM6 21h12v1H6z"/></svg>',
        crown:  '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7.5l4.3 3.2L12 3l5.7 7.7L22 7.5 19.7 19H4.3L2 7.5zM5 20.2h14V22H5z"/></svg>',
        star:   '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.3l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.4 6.1 20.6l1.3-6.5L2.5 9.1l6.6-.8L12 2.3z"/></svg>',
        shield: '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.4 8.8-8 11-4.6-2.2-8-6-8-11V5l8-3zm0 4.5L8.5 12h2.2v4.2L15.5 10h-2.2V6.5z"/></svg>',
        target: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>',
        bolt:   '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
        swords: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l9 9M3 5l9 9"/><path d="M16 13l5 5-2 2-5-5"/><path d="M19 3l-9 9M21 5l-9 9"/><path d="M8 13l-5 5 2 2 5-5"/></svg>',
        quote:  '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 6C6.5 6 4 8.5 4 11.5c0 2.7 2 4.9 4.6 5.4-.2 1-.9 2-2.1 2.6-.3.2-.2.6.1.7 2.8-.3 5.3-2.6 5.3-6.2V11.5C11.9 8.5 11 6 9.5 6zm9 0C15.5 6 13 8.5 13 11.5c0 2.7 2 4.9 4.6 5.4-.2 1-.9 2-2.1 2.6-.3.2-.2.6.1.7 2.8-.3 5.3-2.6 5.3-6.2V11.5C20.9 8.5 20 6 18.5 6z"/></svg>',
        chart:  '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h2v18H3V3zm16 8h2v10h-2V11zm-5-6h2v16h-2V5zM8 13h2v8H8v-8z"/></svg>',
        medal:  '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h3l2 5-3 1.5L6 3.5 7 2zm10 0l-1 1.5L13 8.5 10 7l2-5h5z" opacity=".75"/><circle cx="12" cy="15.5" r="6.2"/></svg>'
    };

    // winged-shield crest (KPL-style)
    var CREST =
        '<svg class="gdr-crest-svg" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs>' +
            '<linearGradient id="gdrGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d4"/><stop offset=".42" stop-color="#ffd96a"/><stop offset=".62" stop-color="#b9831f"/><stop offset=".82" stop-color="#ffe9a8"/><stop offset="1" stop-color="#8a6612"/></linearGradient>' +
            '<linearGradient id="gdrShield" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#222a4a"/><stop offset="1" stop-color="#0a0b16"/></linearGradient>' +
        '</defs>' +
        '<g fill="url(#gdrGold)">' +
            '<path d="M84 50 L26 39 L74 55 Z"/><path d="M84 60 L14 60 L74 63 Z"/><path d="M84 70 L26 81 L74 66 Z"/>' +
            '<path d="M116 50 L174 39 L126 55 Z"/><path d="M116 60 L186 60 L126 63 Z"/><path d="M116 70 L174 81 L126 66 Z"/>' +
        '</g>' +
        '<path d="M100 24 L130 37 V63 C130 84 116 98 100 105 C84 98 70 84 70 63 V37 Z" fill="url(#gdrShield)" stroke="url(#gdrGold)" stroke-width="3"/>' +
        '<path d="M100 34 l2.6 5.4 5.9.8 -4.3 4 1 5.8 -5.2-2.8 -5.2 2.8 1-5.8 -4.3-4 5.9-.8 Z" fill="url(#gdrGold)" opacity=".95"/>' +
        '<text x="100" y="74" text-anchor="middle" font-size="17" font-weight="900" font-style="italic" fill="url(#gdrGold)" font-family="-apple-system,Segoe UI,sans-serif" letter-spacing="1">VS</text>' +
        '</svg>';

    // ------------------------- helpers -------------------------
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }
    function P(key) { return PLAYERS[key] || { name: key, avatar: "", card: "A♥", style: "", quote: "" }; }
    function initials(name) {
        var parts = String(name).trim().split(/\s+/);
        var s = ((parts[0] || "")[0] || "") + ((parts[1] || "")[0] || "");
        return (s || "?").toUpperCase();
    }
    function avatarSrc(key) {
        var p = P(key);
        if (p.avatar) return p.avatar;
        var t = initials(p.name);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">' +
            '<rect width="120" height="120" fill="#222a48"/>' +
            '<text x="60" y="64" font-family="-apple-system,Segoe UI,sans-serif" font-size="46" font-weight="700" fill="#ffd35e" text-anchor="middle" dominant-baseline="central">' + t + '</text></svg>';
        return "data:image/svg+xml," + encodeURIComponent(svg);
    }
    function avatars(keys) {
        return keys.map(function (k) { return '<img src="' + avatarSrc(k) + '" alt="' + esc(P(k).name) + '" loading="lazy">'; }).join("");
    }
    function names(keys) { return keys.map(function (k) { return esc(P(k).name); }).join(" · "); }
    function firstName(key) { return esc(P(key).name.split(" ")[0]); }
    function parseCard(str) { str = String(str || "A♥"); var suit = str.slice(-1); return { rank: str.slice(0, -1) || "A", suit: suit, red: (suit === "♥" || suit === "♦") }; }
    function bigCard(str) {
        var c = parseCard(str);
        return '<div class="gdr-bigcard' + (c.red ? " red" : "") + '" aria-hidden="true">' +
            '<span class="r tl">' + esc(c.rank) + '<i>' + esc(c.suit) + '</i></span>' +
            '<span class="s">' + esc(c.suit) + '</span>' +
            '<span class="r br">' + esc(c.rank) + '<i>' + esc(c.suit) + '</i></span>' +
        '</div>';
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
        return { matches: matches, board: board, mvp: board[0] };
    }

    // ------------------------- section builders -------------------------
    function heroHTML() {
        return '<div class="gdr-hero">' +
            '<div class="gdr-hero-rays"></div>' +
            '<div class="gdr-hero-trophy">' + ICONS.trophy + '</div>' +
            '<h2 class="gdr-hero-title">巅峰对决</h2>' +
            '<div class="gdr-hero-sub">Peak Showdown · Picasso Lab 掼蛋</div>' +
            '<div class="gdr-hero-tag">AI for Guandan 🤖 · 输了叫收集数据，赢了叫重大突破 · <em>Lost = data collection &nbsp;·&nbsp; Won = major breakthrough</em></div>' +
        '</div>';
    }

    function posterHTML(L) {
        var aWin = L.winner === "A";
        return '<div class="gdr-poster">' +
            '<div class="gdr-tech"></div>' +
            '<i class="gdr-corner tl"></i><i class="gdr-corner tr"></i><i class="gdr-corner bl"></i><i class="gdr-corner br"></i>' +
            '<div class="gdr-poster-meta"><span class="gdr-latest">最新一战 Latest</span><span>' + esc(L.date) + '</span></div>' +
            '<div class="gdr-vs">' +
                '<div class="gdr-team side-a' + (aWin ? " is-win" : "") + '">' +
                    '<div class="gdr-crown">' + ICONS.crown + '</div>' +
                    '<div class="gdr-avatars">' + avatars(L.teamA) + '</div>' +
                    '<div class="gdr-team-names">' + names(L.teamA) + '</div>' +
                    '<span class="gdr-win-tag ' + (aWin ? "win" : "lose") + '">' + (aWin ? "WIN" : "LOSE") + '</span>' +
                '</div>' +
                '<div class="gdr-center">' +
                    '<div class="gdr-crest">' + CREST + '</div>' +
                    '<div class="gdr-score"><span class="gdr-rk ' + (aWin ? "win" : "a") + '">' + esc(L.levelA) + '</span><span class="sep">:</span><span class="gdr-rk ' + (!aWin ? "win" : "b") + '">' + esc(L.levelB) + '</span></div>' +
                    (L.note ? '<div class="gdr-pnote">' + ICONS.warn + " " + esc(L.note) + '</div>' : "") +
                '</div>' +
                '<div class="gdr-team side-b' + (!aWin ? " is-win" : "") + '">' +
                    '<div class="gdr-crown">' + ICONS.crown + '</div>' +
                    '<div class="gdr-avatars">' + avatars(L.teamB) + '</div>' +
                    '<div class="gdr-team-names">' + names(L.teamB) + '</div>' +
                    '<span class="gdr-win-tag ' + (!aWin ? "win" : "lose") + '">' + (!aWin ? "WIN" : "LOSE") + '</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    function mvpCardHTML(mvp) {
        var pm = P(mvp.key);
        return '<div class="gdr-section-title">' + ICONS.star + ' 赛季 MVP <span>Most Valuable Player</span></div>' +
            '<div class="gdr-mvpcard">' +
                '<div class="gdr-tech"></div>' +
                '<i class="gdr-corner tl"></i><i class="gdr-corner tr"></i><i class="gdr-corner bl"></i><i class="gdr-corner br"></i>' +
                '<div class="gdr-mvpcard-stats">' +
                    '<div class="gdr-mvp-word">MVP</div>' +
                    '<div class="gdr-statgrid">' +
                        '<div class="gdr-statline"><span class="ic">' + ICONS.trophy + '</span><b>' + mvp.pts + '</b><span class="lbl">综合评分</span></div>' +
                        '<div class="gdr-statline"><span class="ic">' + ICONS.crown + '</span><b>' + mvp.w + '<i>-</i>' + mvp.l + '</b><span class="lbl">战绩 W-L</span></div>' +
                        '<div class="gdr-statline"><span class="ic">' + ICONS.target + '</span><b>' + mvp.wr + '<i>%</i></b><span class="lbl">胜率 Win Rate</span></div>' +
                        '<div class="gdr-statline"><span class="ic">' + ICONS.bolt + '</span><b>' + mvp.aw + '</b><span class="lbl">过 A Cleared A</span></div>' +
                    '</div>' +
                    (pm.quote ? '<div class="gdr-mvpcard-motto">' + ICONS.quote + ' 座右铭 · “' + esc(pm.quote) + '”</div>' : "") +
                '</div>' +
                '<div class="gdr-mvpcard-hero">' +
                    bigCard(pm.card) +
                    '<img class="gdr-mvpcard-avatar" src="' + avatarSrc(mvp.key) + '" alt="' + esc(pm.name) + '">' +
                    '<div class="gdr-mvpcard-name"><b>' + esc(pm.name) + '</b><span>' + esc(pm.style || "Picasso Lab · 掼蛋") + '</span></div>' +
                '</div>' +
            '</div>';
    }

    function leaderboardHTML(board) {
        function medal(i) {
            if (i < 3) return '<span class="gdr-medal e m' + (i + 1) + '">' + ["🥇", "🥈", "🥉"][i] + '</span>';
            return '<span class="gdr-rnum">' + (i + 1) + '</span>';
        }
        var rows = board.map(function (s, i) {
            var p = P(s.key);
            return '<div class="gdr-prow' + (i === 0 ? " top1" : "") + '">' +
                '<div class="gdr-prank">' + medal(i) + '</div>' +
                '<img class="gdr-pava" src="' + avatarSrc(s.key) + '" alt="">' +
                '<div class="gdr-pinfo">' +
                    '<div class="gdr-pname">' + esc(p.name) + (p.style ? '<span class="gdr-pstyle">' + ICONS.swords + ' ' + esc(p.style) + '</span>' : "") + '</div>' +
                    (p.quote ? '<div class="gdr-pquote">' + ICONS.quote + ' “' + esc(p.quote) + '”</div>' : "") +
                '</div>' +
                '<div class="gdr-pstats">' +
                    '<div class="gdr-ppts"><b>' + s.pts + '</b><span>评分</span></div>' +
                    '<div class="gdr-pstat"><b>' + s.w + '-' + s.l + '</b><span>胜负</span></div>' +
                    '<div class="gdr-pstat"><b>' + s.wr + '%</b><span>胜率</span></div>' +
                    '<div class="gdr-pstat"><b>' + s.aw + '</b><span>过A</span></div>' +
                '</div>' +
            '</div>';
        }).join("");
        return '<div class="gdr-section-title">' + ICONS.crown + ' 选手排行榜 <span>Leaderboard · 评分 = 赛量修正胜率 (Bayesian)</span></div>' +
            '<div class="gdr-ptable">' + rows + '</div>';
    }

    function historyHTML(matches) {
        var cards = matches.map(function (m) {
            var aw = m.winner === "A";
            var winnerLabel = firstName((aw ? m.teamA : m.teamB)[0]) + " 队胜";
            var foot = esc(m.date) + (m.note ? ' · <span class="gdr-note">' + esc(m.note) + "</span>" : "");
            return '<div class="gdr-match">' +
                '<div class="gdr-match-top">' +
                    '<div class="gdr-mteam a' + (aw ? " win" : "") + '"><span class="gdr-mav">' + avatars(m.teamA) + '</span><span class="gdr-mnames">' + names(m.teamA) + '</span></div>' +
                    '<div class="gdr-mscore"><b><span class="' + (aw ? "rw" : "ra") + '">' + esc(m.levelA) + '</span><span class="sep">:</span><span class="' + (!aw ? "rw" : "rb") + '">' + esc(m.levelB) + '</span></b><span>' + winnerLabel + '</span></div>' +
                    '<div class="gdr-mteam b' + (!aw ? " win" : "") + '"><span class="gdr-mav">' + avatars(m.teamB) + '</span><span class="gdr-mnames">' + names(m.teamB) + '</span></div>' +
                '</div>' +
                '<div class="gdr-match-foot"><span class="gdr-foot-left">' + foot + '</span></div>' +
            '</div>';
        }).join("");
        return '<div class="gdr-section-title">' + ICONS.swords + ' 历史对阵 <span>Match History</span></div><div class="gdr-matches">' + cards + '</div>';
    }

    // full-screen MVP splash (events intro)
    function splashHTML(mvp) {
        var pm = P(mvp.key);
        return '<div class="gdr-splash">' +
            '<div class="gdr-splash-inner">' +
                '<div class="gdr-splash-kicker">' + ICONS.star + ' Season MVP · 赛季最佳</div>' +
                '<div class="gdr-splash-hero">' + bigCard(pm.card) + '<img src="' + avatarSrc(mvp.key) + '" alt=""></div>' +
                '<div class="gdr-splash-name">' + esc(pm.name) + '</div>' +
                '<div class="gdr-splash-line"><span>' + ICONS.trophy + ' ' + mvp.pts + ' 评分</span><span>' + mvp.w + '-' + mvp.l + '</span><span>胜率 ' + mvp.wr + '%</span></div>' +
                (pm.quote ? '<div class="gdr-splash-motto">' + ICONS.quote + ' “' + esc(pm.quote) + '”</div>' : "") +
            '</div>' +
        '</div>';
    }

    // ------------------------- public builders -------------------------
    function buildHTML() {
        var d = buildStats();
        if (!d.matches.length) return '<div class="gdr-board"><div class="gdr-hero"><h2 class="gdr-hero-title">巅峰对决</h2></div></div>';
        return '<div class="gdr-board">' + heroHTML() + posterHTML(d.matches[0]) + mvpCardHTML(d.mvp) + leaderboardHTML(d.board) + historyHTML(d.matches) + '</div>';
    }

    function buildPages() {
        var d = buildStats();
        return {
            splash: splashHTML(d.mvp),
            pages: [
                '<div class="gdr-page">' + heroHTML() + posterHTML(d.matches[0]) + '</div>',
                '<div class="gdr-page">' + mvpCardHTML(d.mvp) + '</div>',
                '<div class="gdr-page">' + leaderboardHTML(d.board) + '</div>',
                '<div class="gdr-page">' + historyHTML(d.matches) + '</div>'
            ],
            titles: ["最新一战", "赛季 MVP", "排行榜", "历史对阵"]
        };
    }

    // condensed banner (latest result + top of leaderboard) for guandan.html
    function buildBanner() {
        var d = buildStats();
        var L = d.matches[0];
        var winT = L.winner === "A" ? L.teamA : L.teamB;
        var loseT = L.winner === "A" ? L.teamB : L.teamA;
        var winLvl = L.winner === "A" ? L.levelA : L.levelB;
        var loseLvl = L.winner === "A" ? L.levelB : L.levelA;
        var avs = winT.map(function (k) { return '<img class="gdr-bn-av" src="' + avatarSrc(k) + '" alt="">'; }).join("");
        var latest =
            '<span class="gdr-bn-seg">' +
                '<span class="gdr-bn-tag">' + ICONS.swords + ' Latest</span>' +
                '<span class="gdr-bn-avs">' + avs + '</span>' +
                '<b>' + names(winT) + '</b>' +
                '<span class="gdr-bn-score"><span class="w">' + esc(winLvl) + '</span><i>:</i><span class="l">' + esc(loseLvl) + '</span></span>' +
                '<span class="gdr-bn-mut">def. ' + names(loseT) + '</span>' +
            '</span>';
        var medals = ["🥇", "🥈", "🥉"];
        var chips = d.board.slice(0, 3).map(function (s, i) {
            return '<span class="gdr-bn-chip rank' + (i + 1) + '"><span class="gdr-bn-medal">' + medals[i] + '</span>' +
                '<img class="gdr-bn-av sm" src="' + avatarSrc(s.key) + '" alt="">' +
                '<span class="gdr-bn-nm">' + esc(P(s.key).name.split(" ")[0]) + '</span><b>' + s.pts + '</b></span>';
        }).join("");
        var ranks = '<span class="gdr-bn-seg"><span class="gdr-bn-tag">' + ICONS.crown + ' Rank</span>' + chips + '</span>';
        var set = latest + '<span class="gdr-bn-div"></span>' + ranks;
        // 4 identical sets → seamless looping marquee (CSS translateX(-50%) scrolls 2 sets,
        // and one half of the track always stays wider than the lobby, so no gap at the loop).
        var one = '<div class="gdr-bn-set">' + set + '</div>';
        var copy = '<div class="gdr-bn-set" aria-hidden="true">' + set + '</div>';
        return '<div class="gdr-bn-track">' + one + copy + copy + copy + '</div>';
    }

    global.GuandanRecords = { buildHTML: buildHTML, buildPages: buildPages, buildBanner: buildBanner, PLAYERS: PLAYERS, MATCHES: MATCHES };
})(window);
