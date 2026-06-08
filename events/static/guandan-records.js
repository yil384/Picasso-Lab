/* ============================================================
   🏆 Guandan Peak-Showdown Records — shared data + renderer
   Loaded by events/events.html and events/guandan.html.
   To update the board, EDIT THE DATA BELOW (PLAYERS / MATCHES).
   Exposes: window.GuandanRecords.buildHTML() -> board HTML string
   ============================================================ */
(function (global) {
    "use strict";

    // Avatars live in /people/static/ — relative to /events/*.html so it
    // works both locally and on GitHub Pages (…/Picasso-Lab/events/).
    var AV = "../people/static/";

    // -------- PLAYER ROSTER (add players here as needed) --------
    var PLAYERS = {
        zhuo:     { name: "Zhuo Chen",    avatar: AV + "zhuo.png" },
        zhongkai: { name: "Zhongkai Yu",  avatar: AV + "zhongkai.png" },
        yichen:   { name: "Yichen Lin",   avatar: AV + "yichen.png" },
        zaifeng:  { name: "Zaifeng Pan",  avatar: AV + "zaifeng.png" },
        haotian:  { name: "Haotian Shen", avatar: AV + "haotian.png" },
        chang:    { name: "Chang Chen",   avatar: AV + "chang.png" }
    };

    // -------- MATCH HISTORY --------
    // ⚠️ PLACEHOLDER sample data — replace with real records.
    // Each match: date (YYYY-MM-DD), round label, two teams (player keys),
    // scores, and the MVP player key. Winner = higher score.
    var MATCHES = [
        { date: "2026-05-24", round: "第 6 周末", teamA: ["zhuo", "zhongkai"], teamB: ["yichen", "zaifeng"], scoreA: 3, scoreB: 1, mvp: "zhongkai" },
        { date: "2026-05-17", round: "第 5 周末", teamA: ["yichen", "haotian"], teamB: ["zhuo", "chang"],    scoreA: 2, scoreB: 3, mvp: "zhuo" },
        { date: "2026-05-10", round: "第 4 周末", teamA: ["zaifeng", "chang"],  teamB: ["zhongkai", "haotian"], scoreA: 3, scoreB: 0, mvp: "zaifeng" },
        { date: "2026-05-03", round: "第 3 周末", teamA: ["zhuo", "yichen"],    teamB: ["zhongkai", "zaifeng"], scoreA: 1, scoreB: 3, mvp: "zaifeng" },
        { date: "2026-04-26", round: "第 2 周末", teamA: ["haotian", "zhongkai"], teamB: ["zhuo", "zaifeng"], scoreA: 3, scoreB: 2, mvp: "haotian" }
    ];

    // ------------------------- helpers -------------------------
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }
    function P(key) { return PLAYERS[key] || { name: key, avatar: "" }; }
    function avatars(keys) {
        return keys.map(function (k) {
            return '<img src="' + P(k).avatar + '" alt="' + esc(P(k).name) + '" loading="lazy">';
        }).join("");
    }
    function names(keys) {
        return keys.map(function (k) { return esc(P(k).name); }).join(" · ");
    }
    function firstName(key) { return esc(P(key).name.split(" ")[0]); }

    // ------------------------- renderer ------------------------
    function buildHTML() {
        var matches = MATCHES.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
        if (!matches.length) {
            return '<div class="gdr-board"><div class="gdr-head"><h2 class="gdr-title">🏆 巅峰对决</h2><p class="gdr-sub">No matches yet</p></div></div>';
        }

        // ----- leaderboard stats -----
        var stats = {};
        function ensure(k) { return stats[k] || (stats[k] = { key: k, w: 0, l: 0, mvp: 0 }); }
        matches.forEach(function (m) {
            var aWin = m.scoreA > m.scoreB;
            m.teamA.forEach(function (k) { var s = ensure(k); aWin ? s.w++ : s.l++; });
            m.teamB.forEach(function (k) { var s = ensure(k); aWin ? s.l++ : s.w++; });
            if (m.mvp) ensure(m.mvp).mvp++;
        });
        var board = Object.keys(stats).map(function (k) { return stats[k]; }).sort(function (a, b) {
            return (b.w - a.w) || ((b.w - b.l) - (a.w - a.l)) || (b.mvp - a.mvp) || P(a.key).name.localeCompare(P(b.key).name);
        });

        // ----- giant VS poster (latest) -----
        var L = matches[0];
        var aWin = L.scoreA > L.scoreB;
        var poster =
            '<div class="gdr-poster">' +
                '<div class="gdr-poster-meta"><span class="gdr-latest">最新一战 Latest</span><span>' + esc(L.date) + ' · ' + esc(L.round || "") + '</span></div>' +
                '<div class="gdr-vs">' +
                    '<div class="gdr-team' + (aWin ? " is-win" : "") + '">' +
                        '<div class="gdr-avatars">' + avatars(L.teamA) + '</div>' +
                        '<div class="gdr-team-names">' + names(L.teamA) + '</div>' +
                        '<span class="gdr-win-tag">WIN</span>' +
                    '</div>' +
                    '<div class="gdr-score">' +
                        '<div class="gdr-score-num">' + L.scoreA + '<i>:</i>' + L.scoreB + '</div>' +
                        '<div class="gdr-vs-badge">VS</div>' +
                    '</div>' +
                    '<div class="gdr-team' + (!aWin ? " is-win" : "") + '">' +
                        '<div class="gdr-avatars">' + avatars(L.teamB) + '</div>' +
                        '<div class="gdr-team-names">' + names(L.teamB) + '</div>' +
                        '<span class="gdr-win-tag">WIN</span>' +
                    '</div>' +
                '</div>' +
                (L.mvp ? '<div class="gdr-mvp"><span class="gdr-mvp-label">★ 本场 MVP</span><img src="' + P(L.mvp).avatar + '" alt=""><b>' + esc(P(L.mvp).name) + '</b></div>' : "") +
            '</div>';

        // ----- leaderboard -----
        function medal(i) { return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1); }
        var rows = board.map(function (s, i) {
            return '<div class="gdr-row ' + (i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "") + '">' +
                '<div class="gdr-rank">' + medal(i) + '</div>' +
                '<div class="gdr-player"><img src="' + P(s.key).avatar + '" alt=""><b>' + esc(P(s.key).name) + '</b></div>' +
                '<div class="gdr-wl"><span class="w">' + s.w + '</span><span class="l"> - ' + s.l + '</span></div>' +
                '<div class="gdr-mvpc">🏆 ' + s.mvp + '</div>' +
            '</div>';
        }).join("");
        var leaderboard =
            '<div class="gdr-section-title">选手排行榜 <span>Leaderboard</span></div>' +
            '<div class="gdr-table">' +
                '<div class="gdr-row gdr-row-head"><div>#</div><div>选手 Player</div><div>胜-负</div><div>MVP</div></div>' +
                rows +
            '</div>';

        // ----- match history cards -----
        var cards = matches.map(function (m) {
            var aw = m.scoreA > m.scoreB;
            var winnerLabel = (aw ? firstName(m.teamA[0]) : firstName(m.teamB[0])) + " 队胜";
            return '<div class="gdr-match">' +
                '<div class="gdr-match-top">' +
                    '<div class="gdr-mteam a' + (aw ? " win" : "") + '"><span class="gdr-mav">' + avatars(m.teamA) + '</span><span class="gdr-mnames">' + names(m.teamA) + '</span></div>' +
                    '<div class="gdr-mscore"><b>' + m.scoreA + '<i>:</i>' + m.scoreB + '</b><span>' + winnerLabel + '</span></div>' +
                    '<div class="gdr-mteam b' + (!aw ? " win" : "") + '"><span class="gdr-mav">' + avatars(m.teamB) + '</span><span class="gdr-mnames">' + names(m.teamB) + '</span></div>' +
                '</div>' +
                '<div class="gdr-match-foot">' +
                    '<span>' + esc(m.date) + ' · ' + esc(m.round || "") + '</span>' +
                    (m.mvp ? '<span class="gdr-match-mvp"><img src="' + P(m.mvp).avatar + '" alt="">MVP · ' + esc(P(m.mvp).name) + '</span>' : "") +
                '</div>' +
            '</div>';
        }).join("");
        var history = '<div class="gdr-section-title">历史对阵 <span>Match History</span></div><div class="gdr-matches">' + cards + '</div>';

        return '<div class="gdr-board">' +
            '<div class="gdr-head">' +
                '<div class="gdr-kicker">Picasso Lab · 掼蛋</div>' +
                '<h2 class="gdr-title">🏆 巅峰对决 · 历史战绩</h2>' +
                '<p class="gdr-sub">Peak Showdown — Hall of Records</p>' +
            '</div>' +
            poster + leaderboard + history +
            '<div class="gdr-foot-note">⚠️ 占位示例数据 placeholder records — 待替换为真实战绩</div>' +
        '</div>';
    }

    global.GuandanRecords = { buildHTML: buildHTML, PLAYERS: PLAYERS, MATCHES: MATCHES };
})(window);
