// In-page staging helpers for the harness (injected by gdh.py as an init script). They build
// deterministic room states with the real engine and push them through the Firebase stub, exactly like
// a remote tick would. Nothing here is part of the game.
//   const g = await __gd.make({ seed, level, me, host, names, ai: [1, 3], round, dealAgo, turn })
//   __gd.give(g, seat, ["0S9", "1S9"]); await __gd.play(g, seat, ids); __gd.pass(g, seat); __gd.put(g)
(() => {
    const ENGINE = "https://yil384.github.io/Picasso-Lab/events/static/guandan-engine.js";
    const BOT = ["南家 AI", "西家 AI", "北家 AI", "东家 AI"];
    let E = null;
    const eng = async () => E || (E = await import(ENGINE));
    const path = () => Object.keys(window.__fbStore || {}).find(p => p.startsWith("guandanRooms/"));
    const rng = seed => () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    let tick = 0;
    const at = () => Date.now() + (tick++);

    async function make(o = {}) {
        const E = await eng();
        const level = o.level ?? "7";
        const deck = [];
        for (let c = 0; c < 2; c++) {
            for (const s of E.suits) for (const r of E.ranks) deck.push({ id: `${c}${s}${r}`, suit: s, rank: r });
            deck.push({ id: `${c}BJ`, joker: "BJ" });
            deck.push({ id: `${c}RJ`, joker: "RJ" });
        }
        const R = rng(o.seed ?? 7);
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(R() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        const hands = { 0: [], 1: [], 2: [], 3: [] };
        deck.forEach((c, i) => hands[i % 4].push(c));
        const names = o.names ?? ["Yichen", "Zhongkai", "Zhengding", "Zaifeng"];
        const me = o.me ?? 0;
        const host = o.host ?? me;
        const seats = names.map((n, i) => {
            if (n == null) return null;
            if ((o.ai || []).includes(i)) return { clientId: `ai_${i}_stage`, name: BOT[i], botIndex: i, type: "ai", team: i % 2, ready: true, host: i === host };
            return { clientId: i === me ? "c_shooter" : `c_lab${i}`, name: n, type: "human", team: i % 2, ready: true, host: i === host };
        });
        const now = Date.now();
        const dealAgo = o.dealAgo ?? 20000;
        const g = {
            roomCode: o.code ?? "PX7K2", createdAt: now - 600000, updatedAt: now, revision: 1,
            phase: o.phase ?? "playing", seats, levels: o.levels ?? [level, "5"], aceFailures: o.aceFailures ?? [0, 0],
            currentLevelRank: level, roundNo: o.round ?? 3, leaderTeam: o.leaderTeam ?? 0, hands,
            currentTurn: o.turn ?? me, turnStartedAt: now, roundStartedAt: now - dealAgo, dealStartedAt: now - dealAgo,
            lastPlay: null, passCount: 0, finished: [], history: [], trickPlays: [null, null, null, null],
            selectedTributes: [], publicJokerSeats: [], startingCard: null, message: o.message ?? ""
        };
        sortAll(g);
        return g;
    }
    function sortAll(g) {
        for (let i = 0; i < 4; i++) g.hands[i] = E.sortCards(g.hands[i], g.currentLevelRank);
    }
    // Move the cards with these ids into `seat`'s hand (from wherever they are); other hands give back
    // the same number of their own cards so every hand keeps its size.
    function give(g, seat, ids) {
        for (const id of ids) {
            const from = [0, 1, 2, 3].find(s => g.hands[s].some(c => c.id === id));
            if (from == null || from === seat) continue;
            const card = g.hands[from].find(c => c.id === id);
            g.hands[from] = g.hands[from].filter(c => c.id !== id);
            const back = g.hands[seat].find(c => !ids.includes(c.id));
            if (back) {
                g.hands[seat] = g.hands[seat].filter(c => c.id !== back.id);
                g.hands[from].push(back);
            }
            g.hands[seat].push(card);
        }
        sortAll(g);
        return g;
    }
    function trim(g, seat, n) {
        g.hands[seat] = g.hands[seat].slice(0, n);
        return g;
    }
    function cards(g, seat, ids) {
        return ids.map(id => g.hands[seat].find(c => c.id === id)).filter(Boolean);
    }
    // The lowest `n` cards of one rank in a seat's hand (a pair / triple from what it holds).
    function sameRank(g, seat, n, skip = []) {
        const by = {};
        for (const c of g.hands[seat]) if (!c.joker && !skip.includes(c.rank) && !E.isWild(c, g.currentLevelRank)) (by[c.rank] = by[c.rank] || []).push(c);
        const rank = Object.keys(by).filter(r => by[r].length >= n).sort((a, b) => E.rankPower(a, g.currentLevelRank) - E.rankPower(b, g.currentLevelRank))[0];
        return rank ? by[rank].slice(0, n).map(c => c.id) : [];
    }
    function play(g, seat, ids) {
        const list = cards(g, seat, ids);
        // as playCards does: the combo that beats what is on the table (a lead when the seat owns it)
        const table = g.lastPlay && g.lastPlay.player !== seat ? g.lastPlay.combo : null;
        const combo = E.choosePlayable(list, table, g.currentLevelRank) || E.choosePlayable(list, null, g.currentLevelRank)
            || E.evaluateCombos(list, g.currentLevelRank)[0];
        if (!combo) throw new Error(`no combo for ${ids}`);
        const idSet = new Set(ids);
        g.hands[seat] = g.hands[seat].filter(c => !idSet.has(c.id));
        const entry = { player: seat, action: E.comboName(combo, "zh"), actionType: "combo", combo, cards: list, at: at() };
        g.lastPlay = { player: seat, cards: list, combo };
        g.trickPlays[seat] = entry;
        g.passCount = 0;
        g.history = [...g.history, entry].slice(-16);
        g.message = `${g.seats[seat].name} 出了 ${entry.action}。`;
        return g;
    }
    function pass(g, seat) {
        const entry = { player: seat, action: "不要", actionType: "pass", cards: [], at: at() };
        g.trickPlays[seat] = entry;
        g.passCount = (g.passCount || 0) + 1;
        g.history = [...g.history, entry].slice(-16);
        g.message = `${g.seats[seat].name} 不要。`;
        return g;
    }
    function turn(g, seat) {
        g.currentTurn = seat;
        g.turnStartedAt = Date.now();
        return g;
    }
    // the highest non-wild card of a hand: what a tribute payer gives
    function high(g, seat) {
        const lv = g.currentLevelRank;
        return E.sortCards(g.hands[seat].filter(c => !E.isWild(c, lv)), lv)[0];
    }
    function put(g, p = path() || `guandanRooms/${g.roomCode}`) {
        // like a real transaction: the revision always moves forward (the 提示 cache and AI turns key on it)
        g.revision = Math.max(Number(g.revision) || 0, Number(window.__fbGet(p)?.revision) || 0, Number(window.__gdRev) || 0) + 1;
        window.__gdRev = g.revision;
        g.updatedAt = Date.now();
        window.__fbSet(p, g);
        return g;
    }
    function get() {
        const p = path();
        return p ? window.__fbGet(p) : null;
    }
    window.__gd = { eng, make, high, give, trim, cards, sameRank, play, pass, turn, put, get, path, sortAll };
})();
