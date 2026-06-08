/* ============================================================
   🏆 Guandan Peak-Showdown Records — shared data + renderer
   Loaded by events/events.html and events/guandan.html.
   To update the board, EDIT THE DATA BELOW (PLAYERS / MATCHES).
   Exposes: window.GuandanRecords.buildHTML() -> board HTML string

   SCORING (掼蛋升级制): a team climbs levels 2→3→…→10→J→Q→K→A.
   To win the match you must reach A and "pass A" (打过A, 双下通关).
   The score is the LEVEL each team ended on, e.g. "A:2" (opponent
   shut out at 2), "A:K", etc. Special rule: if a team reaches A but
   fails to pass 3 times in a row it drops back to 2 — recorded as a
   shutout, e.g. "K:2". Set `shutout:true` and a `note` for that.
   ============================================================ */
(function (global) {
    "use strict";

    // Avatars in /people/static/ — relative to /events/*.html (works
    // locally and on GitHub Pages …/Picasso-Lab/events/).
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
    // levelA / levelB: the Guandan level each team finished on
    //   ("2".."10","J","Q","K","A"). winner: "A" or "B" (who won the
    //   match). shutout: true for a 零封. note: optional special tag.
    var MATCHES = [
        { date: "2026-05-24", round: "第 6 周末", teamA: ["zhuo", "zhongkai"], teamB: ["yichen", "zaifeng"], levelA: "A", levelB: "2", winner: "A", shutout: true, mvp: "zhongkai" },
        { date: "2026-05-17", round: "第 5 周末", teamA: ["yichen", "haotian"], teamB: ["zhuo", "chang"],    levelA: "Q", levelB: "A", winner: "B", mvp: "zhuo" },
        { date: "2026-05-10", round: "第 4 周末", teamA: ["zaifeng", "chang"],  teamB: ["zhongkai", "haotian"], levelA: "A", levelB: "K", winner: "A", mvp: "zaifeng" },
        { date: "2026-05-03", round: "第 3 周末", teamA: ["zhuo", "yichen"],    teamB: ["zhongkai", "zaifeng"], levelA: "J", levelB: "A", winner: "B", mvp: "zaifeng" },
        { date: "2026-04-26", round: "第 2 周末", teamA: ["haotian", "zhongkai"], teamB: ["zhuo", "zaifeng"], levelA: "K", levelB: "2", winner: "A", shutout: true, note: "对手三冲 A 未过 · 掉回 2", mvp: "haotian" }
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
    function names(keys) { return keys.map(function (k) { return esc(P(k).name); }).join(" · "); }
    function firstName(key) { return esc(P(key).name.split(" ")[0]); }

    // ------------------------- renderer ------------------------
    function buildHTML() {
        var matches = MATCHES.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
        if (!matches.length) {
            return '<div class="gdr-board"><div class="gdr-head"><h2 class="gdr-title">巅峰对决</h2><p class="gdr-sub">No matches yet</p></div></div>';
        }

        // ----- leaderboard stats (W/L from winner, MVP counts) -----
        var stats = {};
        function ensure(k) { return stats[k] || (stats[k] = { key: k, w: 0, l: 0, mvp: 0 }); }
        matches.forEach(function (m) {
            var aWin = m.winner === "A";
            m.teamA.forEach(function (k) { var s = ensure(k); aWin ? s.w++ : s.l++; });
            m.teamB.forEach(function (k) { var s = ensure(k); aWin ? s.l++ : s.w++; });
            if (m.mvp) ensure(m.mvp).mvp++;
        });
        var board = Object.keys(stats).map(function (k) { return stats[k]; }).sort(function (a, b) {
            return (b.w - a.w) || ((b.w - b.l) - (a.w - a.l)) || (b.mvp - a.mvp) || P(a.key).name.localeCompare(P(b.key).name);
        });

        // ----- giant VS poster (latest) -----
        var L = matches[0];
        var aWin = L.winner === "A";
        var aRk = aWin ? "win" : "a";
        var bRk = !aWin ? "win" : "b";
        var poster =
            '<div class="gdr-poster">' +
                '<div class="gdr-poster-meta"><span class="gdr-latest">最新一战 Latest</span><span>' + esc(L.date) + ' · ' + esc(L.round || "") + '</span></div>' +
                '<div class="gdr-vs">' +
                    '<div class="gdr-team side-a' + (aWin ? " is-win" : "") + '">' +
                        '<div class="gdr-crown">👑</div>' +
                        '<div class="gdr-avatars">' + avatars(L.teamA) + '</div>' +
                        '<div class="gdr-team-names">' + names(L.teamA) + '</div>' +
                        '<span class="gdr-win-tag">WIN</span>' +
                    '</div>' +
                    '<div class="gdr-center">' +
                        '<div class="gdr-vs-badge">VS</div>' +
                        '<div class="gdr-score"><span class="gdr-rk ' + aRk + '">' + esc(L.levelA) + '</span><span class="sep">:</span><span class="gdr-rk ' + bRk + '">' + esc(L.levelB) + '</span></div>' +
                        (L.shutout ? '<div class="gdr-shutout">零封 Shutout</div>' : "") +
                    '</div>' +
                    '<div class="gdr-team side-b' + (!aWin ? " is-win" : "") + '">' +
                        '<div class="gdr-crown">👑</div>' +
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
            var aw = m.winner === "A";
            var maCls = aw ? "rw" : "ra";
            var mbCls = !aw ? "rw" : "rb";
            var winnerLabel = firstName((aw ? m.teamA : m.teamB)[0]) + " 队胜";
            var foot = esc(m.date) + " · " + esc(m.round || "") + (m.note ? ' · <span style="opacity:.8">' + esc(m.note) + "</span>" : "");
            return '<div class="gdr-match">' +
                '<div class="gdr-match-top">' +
                    '<div class="gdr-mteam a' + (aw ? " win" : "") + '"><span class="gdr-mav">' + avatars(m.teamA) + '</span><span class="gdr-mnames">' + names(m.teamA) + '</span></div>' +
                    '<div class="gdr-mscore"><b><span class="' + maCls + '">' + esc(m.levelA) + '</span><span class="sep">:</span><span class="' + mbCls + '">' + esc(m.levelB) + '</span></b><span>' + winnerLabel + '</span></div>' +
                    '<div class="gdr-mteam b' + (!aw ? " win" : "") + '"><span class="gdr-mav">' + avatars(m.teamB) + '</span><span class="gdr-mnames">' + names(m.teamB) + '</span></div>' +
                '</div>' +
                '<div class="gdr-match-foot">' +
                    '<span class="gdr-foot-left">' + foot + (m.shutout ? ' <span class="gdr-so-badge">零封</span>' : "") + '</span>' +
                    (m.mvp ? '<span class="gdr-match-mvp"><img src="' + P(m.mvp).avatar + '" alt="">MVP · ' + esc(P(m.mvp).name) + "</span>" : "") +
                '</div>' +
            '</div>';
        }).join("");
        var history = '<div class="gdr-section-title">历史对阵 <span>Match History</span></div><div class="gdr-matches">' + cards + '</div>';

        return '<div class="gdr-board">' +
            '<div class="gdr-head">' +
                '<div class="gdr-kicker">Picasso Lab · 掼蛋</div>' +
                '<h2 class="gdr-title">巅峰对决 PEAK SHOWDOWN</h2>' +
                '<p class="gdr-sub">Hall of Records</p>' +
            '</div>' +
            poster + leaderboard + history +
            '<div class="gdr-foot-note">⚠️ 占位示例数据 placeholder records — 待替换为真实战绩</div>' +
        '</div>';
    }

    global.GuandanRecords = { buildHTML: buildHTML, PLAYERS: PLAYERS, MATCHES: MATCHES };
})(window);
