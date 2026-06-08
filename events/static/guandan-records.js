/* ============================================================
   🏆 Guandan Peak-Showdown Records — shared data + renderer
   KPL-style esports board: winged-shield crest, MVP card,
   custom SVG icons, entrance animations, quantum/tech texture.
   To update the board, EDIT THE DATA BELOW (PLAYERS / MATCHES).
   Exposes: window.GuandanRecords.buildHTML() -> board HTML string

   SCORING (掼蛋升级制): teams climb 2→3→…→10→J→Q→K→A. Win by
   reaching A and passing it. Score = the level each team ended
   on (e.g. "A:2", "A:K"). Special: reach A but fail to pass 3×
   → drop back to 2 (a shutout, e.g. "K:2").
   ============================================================ */
(function (global) {
    "use strict";

    var AV = "../people/static/"; // avatars relative to /events/*.html

    // -------- PLAYER ROSTER (card = signature playing card) --------
    var PLAYERS = {
        zhuo:     { name: "Zhuo Chen",    avatar: AV + "zhuo.webp",     card: "A♠" },
        zhongkai: { name: "Zhongkai Yu",  avatar: AV + "zhongkai.webp", card: "A♥" },
        yichen:   { name: "Yichen Lin",   avatar: AV + "yichen.webp",   card: "K♦" },
        zaifeng:  { name: "Zaifeng Pan",  avatar: AV + "zaifeng.webp",  card: "A♣" },
        haotian:  { name: "Haotian Shen", avatar: AV + "haotian.webp",  card: "K♥" },
        chang:    { name: "Chang Chen",   avatar: AV + "chang.webp",    card: "Q♥" }
    };

    // -------- MATCH HISTORY (⚠️ placeholder — replace with real) --------
    var MATCHES = [
        { date: "2026-05-24", round: "第 6 周末", teamA: ["zhuo", "zhongkai"], teamB: ["yichen", "zaifeng"], levelA: "A", levelB: "2", winner: "A", shutout: true, mvp: "zhongkai" },
        { date: "2026-05-17", round: "第 5 周末", teamA: ["yichen", "haotian"], teamB: ["zhuo", "chang"],    levelA: "Q", levelB: "A", winner: "B", mvp: "zhuo" },
        { date: "2026-05-10", round: "第 4 周末", teamA: ["zaifeng", "chang"],  teamB: ["zhongkai", "haotian"], levelA: "A", levelB: "K", winner: "A", mvp: "zaifeng" },
        { date: "2026-05-03", round: "第 3 周末", teamA: ["zhuo", "yichen"],    teamB: ["zhongkai", "zaifeng"], levelA: "J", levelB: "A", winner: "B", mvp: "zaifeng" },
        { date: "2026-04-26", round: "第 2 周末", teamA: ["haotian", "zhongkai"], teamB: ["zhuo", "zaifeng"], levelA: "K", levelB: "2", winner: "A", shutout: true, note: "对手三冲 A 未过 · 掉回 2", mvp: "haotian" }
    ];

    // ------------------------- SVG icon set --------------------------
    // Consistent 24x24, currentColor. (No emoji — these inherit color.)
    var ICONS = {
        trophy: '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6v1H2v3.2C2 8.8 3.9 11 6.3 11.3A6 6 0 0 0 11 15.8V18H8.6c-.9 0-1.6.7-1.6 1.6V20h10v-.4c0-.9-.7-1.6-1.6-1.6H13v-2.2a6 6 0 0 0 4.7-4.5C20.1 11 22 8.8 22 6.2V3h-4V2zM6 9.2C4.9 8.9 4 7.6 4 6.2V5h2v4.2zM20 6.2c0 1.4-.9 2.7-2 3V5h2v1.2zM6 21h12v1H6z"/></svg>',
        crown:  '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7.5l4.3 3.2L12 3l5.7 7.7L22 7.5 19.7 19H4.3L2 7.5zM5 20.2h14V22H5z"/></svg>',
        star:   '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.3l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.4 6.1 20.6l1.3-6.5L2.5 9.1l6.6-.8L12 2.3z"/></svg>',
        shield: '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.4 8.8-8 11-4.6-2.2-8-6-8-11V5l8-3zm0 4.5L8.5 12h2.2v4.2L15.5 10h-2.2V6.5z"/></svg>',
        target: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>',
        bolt:   '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
        swords: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l9 9M3 5l9 9"/><path d="M16 13l5 5-2 2-5-5"/><path d="M19 3l-9 9M21 5l-9 9"/><path d="M8 13l-5 5 2 2 5-5"/></svg>',
        warn:   '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 3.2l9.5 16.5h-19L12 3.2z"/><path d="M12 9.5v4.8"/><path d="M12 17.4v.2"/></svg>',
        medal:  '<svg class="gi" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h3l2 5-3 1.5L6 3.5 7 2zm10 0l-1 1.5L13 8.5 10 7l2-5h5z" opacity=".75"/><circle cx="12" cy="15.5" r="6.2"/></svg>'
    };

    // winged-shield crest (KPL-style) — single self-contained SVG
    var CREST =
        '<svg class="gdr-crest-svg" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs>' +
            '<linearGradient id="gdrGold" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0" stop-color="#fff7d4"/><stop offset=".42" stop-color="#ffd96a"/><stop offset=".62" stop-color="#b9831f"/><stop offset=".82" stop-color="#ffe9a8"/><stop offset="1" stop-color="#8a6612"/>' +
            '</linearGradient>' +
            '<linearGradient id="gdrShield" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#222a4a"/><stop offset="1" stop-color="#0a0b16"/></linearGradient>' +
        '</defs>' +
        '<g fill="url(#gdrGold)">' +
            '<path d="M84 50 L26 39 L74 55 Z"/><path d="M84 60 L14 60 L74 63 Z"/><path d="M84 70 L26 81 L74 66 Z"/>' +     // left wing
            '<path d="M116 50 L174 39 L126 55 Z"/><path d="M116 60 L186 60 L126 63 Z"/><path d="M116 70 L174 81 L126 66 Z"/>' + // right wing
        '</g>' +
        '<path d="M100 24 L130 37 V63 C130 84 116 98 100 105 C84 98 70 84 70 63 V37 Z" fill="url(#gdrShield)" stroke="url(#gdrGold)" stroke-width="3"/>' +
        '<path d="M100 44 l3 6.2 6.8.9 -4.9 4.6 1.2 6.7 -6.1-3.2 -6.1 3.2 1.2-6.7 -4.9-4.6 6.8-.9 Z" fill="url(#gdrGold)" opacity=".95"/>' +
        '<text x="100" y="99" text-anchor="middle" font-size="14" font-weight="900" font-style="italic" fill="url(#gdrGold)" font-family="-apple-system,Segoe UI,sans-serif" letter-spacing="1">VS</text>' +
        '</svg>';

    // ------------------------- helpers -------------------------
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }
    function P(key) { return PLAYERS[key] || { name: key, avatar: "", card: "A♥" }; }
    function avatars(keys) {
        return keys.map(function (k) { return '<img src="' + P(k).avatar + '" alt="' + esc(P(k).name) + '" loading="lazy">'; }).join("");
    }
    function names(keys) { return keys.map(function (k) { return esc(P(k).name); }).join(" · "); }
    function firstName(key) { return esc(P(key).name.split(" ")[0]); }
    function parseCard(str) {
        str = String(str || "A♥");
        var suit = str.slice(-1), rank = str.slice(0, -1) || "A";
        return { rank: rank, suit: suit, red: (suit === "♥" || suit === "♦") };
    }
    function bigCard(str) {
        var c = parseCard(str);
        return '<div class="gdr-bigcard' + (c.red ? " red" : "") + '" aria-hidden="true">' +
            '<span class="r tl">' + esc(c.rank) + '<i>' + esc(c.suit) + '</i></span>' +
            '<span class="s">' + esc(c.suit) + '</span>' +
            '<span class="r br">' + esc(c.rank) + '<i>' + esc(c.suit) + '</i></span>' +
        '</div>';
    }

    // ------------------------- renderer ------------------------
    function buildHTML() {
        var matches = MATCHES.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
        if (!matches.length) {
            return '<div class="gdr-board"><div class="gdr-hero"><h2 class="gdr-hero-title">巅峰对决</h2><p class="gdr-hero-sub">No matches yet</p></div></div>';
        }

        // ----- stats -----
        var stats = {};
        function ensure(k) { return stats[k] || (stats[k] = { key: k, w: 0, l: 0, mvp: 0, so: 0 }); }
        matches.forEach(function (m) {
            var aWin = m.winner === "A";
            m.teamA.forEach(function (k) { var s = ensure(k); aWin ? s.w++ : s.l++; if (aWin && m.shutout) s.so++; });
            m.teamB.forEach(function (k) { var s = ensure(k); aWin ? s.l++ : s.w++; if (!aWin && m.shutout) s.so++; });
            if (m.mvp) ensure(m.mvp).mvp++;
        });
        var board = Object.keys(stats).map(function (k) { return stats[k]; }).sort(function (a, b) {
            return (b.w - a.w) || ((b.w - b.l) - (a.w - a.l)) || (b.mvp - a.mvp) || P(a.key).name.localeCompare(P(b.key).name);
        });
        var mvpStar = Object.keys(stats).map(function (k) { return stats[k]; }).sort(function (a, b) {
            return (b.mvp - a.mvp) || (b.w - a.w) || ((b.w - b.l) - (a.w - a.l));
        })[0];

        // ----- hero band -----
        var hero =
            '<div class="gdr-hero">' +
                '<div class="gdr-hero-rays"></div>' +
                '<div class="gdr-hero-trophy">' + ICONS.trophy + '</div>' +
                '<h2 class="gdr-hero-title">巅峰对决</h2>' +
                '<div class="gdr-hero-sub">Peak Showdown · Picasso Lab 掼蛋</div>' +
            '</div>';

        // ----- giant VS poster (latest) with winged crest -----
        var L = matches[0];
        var aWin = L.winner === "A";
        var poster =
            '<div class="gdr-poster">' +
                '<div class="gdr-tech"></div>' +
                '<i class="gdr-corner tl"></i><i class="gdr-corner tr"></i><i class="gdr-corner bl"></i><i class="gdr-corner br"></i>' +
                '<div class="gdr-poster-meta"><span class="gdr-latest">最新一战 Latest</span><span>' + esc(L.date) + ' · ' + esc(L.round || "") + '</span></div>' +
                '<div class="gdr-vs">' +
                    '<div class="gdr-team side-a' + (aWin ? " is-win" : "") + '">' +
                        '<div class="gdr-crown">' + ICONS.crown + '</div>' +
                        '<div class="gdr-avatars">' + avatars(L.teamA) + '</div>' +
                        '<div class="gdr-team-names">' + names(L.teamA) + '</div>' +
                        '<span class="gdr-win-tag">WIN</span>' +
                    '</div>' +
                    '<div class="gdr-center">' +
                        '<div class="gdr-crest">' + CREST + '</div>' +
                        '<div class="gdr-score"><span class="gdr-rk ' + (aWin ? "win" : "a") + '">' + esc(L.levelA) + '</span><span class="sep">:</span><span class="gdr-rk ' + (!aWin ? "win" : "b") + '">' + esc(L.levelB) + '</span></div>' +
                        (L.shutout ? '<div class="gdr-shutout">' + ICONS.shield + ' 零封 Shutout</div>' : "") +
                    '</div>' +
                    '<div class="gdr-team side-b' + (!aWin ? " is-win" : "") + '">' +
                        '<div class="gdr-crown">' + ICONS.crown + '</div>' +
                        '<div class="gdr-avatars">' + avatars(L.teamB) + '</div>' +
                        '<div class="gdr-team-names">' + names(L.teamB) + '</div>' +
                        '<span class="gdr-win-tag">WIN</span>' +
                    '</div>' +
                '</div>' +
                (L.mvp ? '<div class="gdr-mvp"><span class="gdr-mvp-label">' + ICONS.star + ' 本场 MVP</span><img src="' + P(L.mvp).avatar + '" alt=""><b>' + esc(P(L.mvp).name) + '</b></div>' : "") +
            '</div>';

        // ----- season MVP card (KPL style) -----
        var wr = (mvpStar.w + mvpStar.l) > 0 ? Math.round(100 * mvpStar.w / (mvpStar.w + mvpStar.l)) : 0;
        var pm = P(mvpStar.key);
        var mvpcard =
            '<div class="gdr-section-title">' + ICONS.star + ' 赛季 MVP <span>Most Valuable Player</span></div>' +
            '<div class="gdr-mvpcard">' +
                '<div class="gdr-tech"></div>' +
                '<i class="gdr-corner tl"></i><i class="gdr-corner tr"></i><i class="gdr-corner bl"></i><i class="gdr-corner br"></i>' +
                '<div class="gdr-mvpcard-stats">' +
                    '<div class="gdr-mvp-word">MVP</div>' +
                    '<div class="gdr-statgrid">' +
                        '<div class="gdr-statline"><span class="ic">' + ICONS.trophy + '</span><b>' + mvpStar.mvp + '</b><span class="lbl">MVP 次数</span></div>' +
                        '<div class="gdr-statline"><span class="ic">' + ICONS.crown + '</span><b>' + mvpStar.w + '<i>-</i>' + mvpStar.l + '</b><span class="lbl">战绩 W-L</span></div>' +
                        '<div class="gdr-statline"><span class="ic">' + ICONS.target + '</span><b>' + wr + '<i>%</i></b><span class="lbl">胜率 Win Rate</span></div>' +
                        '<div class="gdr-statline"><span class="ic">' + ICONS.shield + '</span><b>' + mvpStar.so + '</b><span class="lbl">零封 Shutouts</span></div>' +
                    '</div>' +
                '</div>' +
                '<div class="gdr-mvpcard-hero">' +
                    bigCard(pm.card) +
                    '<img class="gdr-mvpcard-avatar" src="' + pm.avatar + '" alt="' + esc(pm.name) + '">' +
                    '<div class="gdr-mvpcard-name"><b>' + esc(pm.name) + '</b><span>Picasso Lab · 掼蛋</span></div>' +
                '</div>' +
            '</div>';

        // ----- leaderboard -----
        function medal(i) {
            if (i < 3) return '<span class="gdr-medal m' + (i + 1) + '">' + ICONS.medal + '<i>' + (i + 1) + '</i></span>';
            return '<span class="gdr-rnum">' + (i + 1) + '</span>';
        }
        var rows = board.map(function (s, i) {
            return '<div class="gdr-row ' + (i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "") + '">' +
                '<div class="gdr-rank">' + medal(i) + '</div>' +
                '<div class="gdr-player"><img src="' + P(s.key).avatar + '" alt=""><b>' + esc(P(s.key).name) + '</b></div>' +
                '<div class="gdr-wl"><span class="w">' + s.w + '</span><span class="l"> - ' + s.l + '</span></div>' +
                '<div class="gdr-mvpc">' + ICONS.trophy + ' ' + s.mvp + '</div>' +
            '</div>';
        }).join("");
        var leaderboard =
            '<div class="gdr-section-title">' + ICONS.crown + ' 选手排行榜 <span>Leaderboard</span></div>' +
            '<div class="gdr-table">' +
                '<div class="gdr-row gdr-row-head"><div>#</div><div>选手 Player</div><div>胜-负</div><div>MVP</div></div>' +
                rows +
            '</div>';

        // ----- match history -----
        var cards = matches.map(function (m) {
            var aw = m.winner === "A";
            var winnerLabel = firstName((aw ? m.teamA : m.teamB)[0]) + " 队胜";
            var foot = esc(m.date) + " · " + esc(m.round || "") + (m.note ? ' · <span class="gdr-note">' + esc(m.note) + "</span>" : "");
            return '<div class="gdr-match">' +
                '<div class="gdr-match-top">' +
                    '<div class="gdr-mteam a' + (aw ? " win" : "") + '"><span class="gdr-mav">' + avatars(m.teamA) + '</span><span class="gdr-mnames">' + names(m.teamA) + '</span></div>' +
                    '<div class="gdr-mscore"><b><span class="' + (aw ? "rw" : "ra") + '">' + esc(m.levelA) + '</span><span class="sep">:</span><span class="' + (!aw ? "rw" : "rb") + '">' + esc(m.levelB) + '</span></b><span>' + winnerLabel + '</span></div>' +
                    '<div class="gdr-mteam b' + (!aw ? " win" : "") + '"><span class="gdr-mav">' + avatars(m.teamB) + '</span><span class="gdr-mnames">' + names(m.teamB) + '</span></div>' +
                '</div>' +
                '<div class="gdr-match-foot">' +
                    '<span class="gdr-foot-left">' + foot + (m.shutout ? ' <span class="gdr-so-badge">' + ICONS.shield + ' 零封</span>' : "") + '</span>' +
                    (m.mvp ? '<span class="gdr-match-mvp">' + ICONS.star + ' MVP · ' + esc(P(m.mvp).name) + "</span>" : "") +
                '</div>' +
            '</div>';
        }).join("");
        var history = '<div class="gdr-section-title">' + ICONS.swords + ' 历史对阵 <span>Match History</span></div><div class="gdr-matches">' + cards + '</div>';

        return '<div class="gdr-board">' + hero + poster + mvpcard + leaderboard + history +
            '<div class="gdr-foot-note">' + ICONS.warn + ' 占位示例数据 placeholder records — 待替换为真实战绩</div>' +
        '</div>';
    }

    global.GuandanRecords = { buildHTML: buildHTML, PLAYERS: PLAYERS, MATCHES: MATCHES };
})(window);
